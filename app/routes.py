from flask import Blueprint, jsonify, request

from flask import Blueprint, jsonify, request

bp = Blueprint('main', __name__)


@bp.route('/health', methods=['GET'])
def health_check():
    """Health check

    ---
    tags:
      - Health
    get:
      description: Return service health
      responses:
        200:
          description: OK
          content:
            application/json:
              example:
                status: ok
    """
    return jsonify({"status": "ok"}), 200


@bp.route('/api/example', methods=['GET'])
def example():
    """Example endpoint

    Echo query parameters for demonstration

    ---
    tags:
      - Examples
    get:
      parameters:
        - in: query
          name: q
          schema:
            type: string
          required: false
          description: Example query
      responses:
        200:
          description: Example response
    """
    # echo query params for demonstration
    data = {
        "message": "This is an example endpoint",
        "args": request.args
    }
    return jsonify(data), 200
