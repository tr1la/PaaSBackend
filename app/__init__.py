from flask import Flask, request
from pathlib import Path
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
try:
    from flasgger import Swagger
except Exception:
    Swagger = None


def create_app(config_object=None):
    """Application factory for the Flask app."""
    app = Flask(__name__, static_folder=None)

    if config_object:
        app.config.from_object(config_object)

    # register blueprints
    from app.routes import bp as main_bp
    app.register_blueprint(main_bp)
    # API blueprints ported from Node
    # Import blueprints first to ensure they exist
    from app.blueprints.users import bp as users_bp
    from app.blueprints.series import bp as series_bp
    from app.blueprints.lessons import bp as lessons_bp
    from app.blueprints.auth import bp as auth_bp
    
    # Then register them
    app.register_blueprint(users_bp)
    app.register_blueprint(series_bp)
    app.register_blueprint(lessons_bp)
    app.register_blueprint(auth_bp)

    # Initialize Flasgger (auto-generated docs from docstrings) if available
    try:
        if Swagger is not None:
            swagger_config = {
                "headers": [],
                "specs": [{
                    # register Flasgger's internal spec at an internal route to avoid
                    # the UI conflict; we'll expose a cleaned public route below.
                    "endpoint": 'internal_apispec_1',
                    "route": '/_internal_apispec_1.json',
                    "rule_filter": lambda rule: True,  # all in
                    "model_filter": lambda tag: True,  # all in
                }],
                "static_url_path": "/flasgger_static",
                "swagger_ui": True,
                "specs_route": "/apidocs/"
            }
            swagger_template = {
                "swagger": "2.0",
                "info": {
                    "title": "PaaSBackend API",
                    "version": "0.1.0",
                    "description": "Auto-generated OpenAPI/Swagger from route docstrings"
                },
                "definitions": {
                    "User": {
                            "type": "object",
                            "properties": {
                                "_id": {"type": "string", "example": "64f1a0..."},
                                "cognitoUserId": {"type": "string", "example": "us-east-1_ABC123"},
                                "name": {"type": "string", "example": "Alex"},
                                "email": {"type": "string", "format": "email", "example": "alex@example.com"},
                                "username": {"type": "string", "example": "alex123"}
                            }
                        },
                        "Serie": {
                            "type": "object",
                            "properties": {
                                "_id": {"type": "string"},
                                "title": {"type": "string", "example": "Intro to Python"},
                                "description": {"type": "string"},
                                "thumbnailUrl": {"type": "string", "format": "uri"},
                                "creatorId": {"type": "string"}
                            }
                        },
                        "Lesson": {
                            "type": "object",
                            "properties": {
                                "_id": {"type": "string"},
                                "title": {"type": "string"},
                                "content": {"type": "string"},
                                "documents": {"type": "array", "items": {"type": "string", "format": "uri"}}
                            }
                        }
                    },
                    "securityDefinitions": {
                        "BearerAuth": {
                            "type": "apiKey",
                            "name": "Authorization",
                            "in": "header",
                            "description": "Send a Bearer token as: 'Authorization: Bearer <token>'"
                        }
                    },
                    "security": [{"BearerAuth": []}]
                }
                # Keep a reference to the Swagger instance so we can fetch the
                # generated spec programmatically and post-process it.
            swagger_obj = Swagger(app, template=swagger_template, config=swagger_config)

            # Expose a cleaned public apispec that strips the legacy `swagger`
            # field when both `swagger` and `openapi` are present. This avoids
            # the Swagger UI complaining about mixed-version documents.
            from flask import jsonify as _jsonify

            def _public_apispec():
                # Fetch the internal Flasgger-generated spec and strip the legacy
                # `swagger` field if both `swagger` and `openapi` are present.
                try:
                    from urllib.request import urlopen
                    import json as _json
                    import os
                    # Get port from environment or use 8000 as default
                    port = os.environ.get('PORT', '8000')
                    resp = urlopen(f'http://127.0.0.1:{port}/_internal_apispec_1.json')
                    spec = _json.loads(resp.read().decode('utf-8'))
                    if isinstance(spec, dict) and 'swagger' in spec and 'openapi' in spec:
                        spec.pop('swagger', None)
                    return _jsonify(spec)
                except Exception:
                    return _jsonify({}), 500

            app.add_url_rule('/apispec_1.json', 'apispec_1', _public_apispec, methods=['GET'])
    except Exception:
        # non-fatal if Flasgger not available
        pass



    return app


# Flasgger currently may include both 'swagger' (v2) and 'openapi' (v3) fields in
# the generated spec which breaks the Swagger UI (it refuses to render when both
# are present). We'll provide a small post-processor function that can be
# registered on the app to strip the legacy 'swagger' field from the apispec
# JSON responses so the UI receives a single OpenAPI 3 document.
def _strip_legacy_swagger_field(response):
    try:
        if request.path.endswith('/apispec_1.json') and response.content_type and response.content_type.startswith('application/json'):
            body = response.get_data(as_text=True)
            import json as _json
            parsed = _json.loads(body)
            if 'swagger' in parsed and 'openapi' in parsed:
                parsed.pop('swagger', None)
                response.set_data(_json.dumps(parsed))
                # adjust content-length header
                response.headers['Content-Length'] = len(response.get_data())
    except Exception:
        # non-fatal; leave response unchanged if anything goes wrong
        pass
    return response


# Expose a module-level app for gunicorn/wrappers that expect `app`.
app = create_app()

# Register the apispec post-processor now that `app` exists
try:
    app.after_request(_strip_legacy_swagger_field)
except Exception:
    # if registration fails, don't crash import
    pass

# WSGI middleware as a last-resort safety net: if any response body for the
# apispec route still contains both `swagger` and `openapi`, strip `swagger`.
class _APISpecCleanerMiddleware:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        path = environ.get('PATH_INFO', '')
        if not path.endswith('/apispec_1.json'):
            return self.wsgi_app(environ, start_response)
        body_chunks = []
        status_headers = {}

        def write(data):
            body_chunks.append(data)

        def _start(status, headers, exc_info=None):
            status_headers['status'] = status
            status_headers['headers'] = headers
            return write

        result = self.wsgi_app(environ, _start)
        try:
            for chunk in result:
                body_chunks.append(chunk)
        finally:
            if hasattr(result, 'close'):
                result.close()

        body = b''.join(body_chunks)
        try:
            # Parse JSON and remove the swagger field if both swagger and openapi exist
            import json as _json
            data = _json.loads(body.decode('utf-8'))
            if isinstance(data, dict) and 'swagger' in data and 'openapi' in data:
                data.pop('swagger', None)
                new_body = _json.dumps(data).encode('utf-8')
                headers = [(k, v) for (k, v) in status_headers.get('headers', []) if k.lower() != 'content-length']
                headers.append(('Content-Length', str(len(new_body))))
                start_response(status_headers.get('status', '200 OK'), headers)
                return [new_body]
        except Exception:
            # If JSON processing fails, fall back to original response
            pass

        # default: return original body
        start_response(status_headers.get('status', '200 OK'), status_headers.get('headers', []))
        return [body]


# Install middleware
app.wsgi_app = _APISpecCleanerMiddleware(app.wsgi_app)
