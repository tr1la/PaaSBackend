from functools import wraps
from flask import request, g, jsonify
import os
import time
import json
import requests
import jwt

# Simple cached JWKS loader. Cached for JWKS_CACHE_TTL seconds (default 3600).
_JWKS_CACHE = {"keys": None, "fetched_at": 0}
JWKS_CACHE_TTL = int(os.environ.get("JWKS_CACHE_TTL", "3600"))


def _get_jwks_url():
    # Priority: explicit URL, else construct from pool id + region
    jwks_url = os.environ.get("COGNITO_JWKS_URL") or os.environ.get("JWKS_URL")
    if jwks_url:
        return jwks_url
    pool = os.environ.get("COGNITO_USER_POOL_ID") or os.environ.get("COGNITO_POOL_ID")
    region = os.environ.get("AWS_REGION") or os.environ.get("COGNITO_REGION")
    if pool and region:
        return f"https://cognito-idp.{region}.amazonaws.com/{pool}/.well-known/jwks.json"
    return None


def _fetch_jwks():
    url = _get_jwks_url()
    if not url:
        return None
    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        return data.get("keys", [])
    except Exception:
        return None


def _get_jwks_keys():
    now = int(time.time())
    if _JWKS_CACHE["keys"] and (now - _JWKS_CACHE["fetched_at"] < JWKS_CACHE_TTL):
        return _JWKS_CACHE["keys"]
    keys = _fetch_jwks()
    if keys is not None:
        _JWKS_CACHE["keys"] = keys
        _JWKS_CACHE["fetched_at"] = now
    return keys


def _get_public_key_for_kid(kid):
    keys = _get_jwks_keys()
    if not keys:
        return None
    for jwk in keys:
        if jwk.get("kid") == kid:
            # PyJWT can convert JWK -> public key
            try:
                jwk_json = json.dumps(jwk)
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk_json)
                return public_key
            except Exception:
                return None
    return None


def authenticate_jwt(f):
    """Decorator that verifies RS256 JWTs using Cognito JWKS.

    Environment variables supported:
      - COGNITO_JWKS_URL or JWKS_URL : explicit JWKS URL
      - COGNITO_USER_POOL_ID (and AWS_REGION) to derive JWKS URL
      - JWT_AUDIENCE or COGNITO_CLIENT_ID : expected audience (optional)
      - JWT_ISSUER or COGNITO_ISSUER : expected issuer (optional)

    If JWKS URL / pool are not configured, the decorator falls back to the
    original behavior of decoding without signature verification to allow
    local/dev testing.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"message": "Unauthorized"}), 401
        token = auth.split(" ", 1)[1]

        jwks_url = _get_jwks_url()
        # Require explicit opt-in to allow insecure/no-verify decoding in local/dev
        allow_insecure = str(os.environ.get("ALLOW_INSECURE_JWT", "")).lower() in ("1", "true", "yes")
        if not jwks_url:
            if not allow_insecure:
                return jsonify({
                    "message": "JWKS not configured. Set COGNITO_JWKS_URL or COGNITO_USER_POOL_ID+AWS_REGION; to allow insecure (dev) fallback set ALLOW_INSECURE_JWT=true"
                }), 401
            # Insecure fallback explicitly allowed for local development
            try:
                payload = jwt.decode(token, options={"verify_signature": False})
                g.user = payload
            except Exception:
                return jsonify({"message": "Invalid token"}), 401
            return f(*args, **kwargs)

        # We have a JWKS URL; perform proper verification
        try:
            unverified_header = jwt.get_unverified_header(token)
        except Exception:
            return jsonify({"message": "Invalid token header"}), 401

        kid = unverified_header.get("kid")
        if not kid:
            return jsonify({"message": "Invalid token (no kid)"}), 401

        public_key = _get_public_key_for_kid(kid)
        if not public_key:
            # Try refetching JWKS once and retry
            _JWKS_CACHE["keys"] = None
            public_key = _get_public_key_for_kid(kid)
            if not public_key:
                return jsonify({"message": "Unable to find key for token"}), 401

        # Validate audience/issuer if provided
        audience = os.environ.get("JWT_AUDIENCE") or os.environ.get("COGNITO_CLIENT_ID")
        issuer = os.environ.get("JWT_ISSUER") or os.environ.get("COGNITO_ISSUER")
        # If issuer not set but pool+region present, derive it
        if not issuer:
            pool = os.environ.get("COGNITO_USER_POOL_ID") or os.environ.get("COGNITO_POOL_ID")
            region = os.environ.get("AWS_REGION") or os.environ.get("COGNITO_REGION")
            if pool and region:
                issuer = f"https://cognito-idp.{region}.amazonaws.com/{pool}"

        try:
            decode_kwargs = {"algorithms": ["RS256"]}
            if audience:
                decode_kwargs["audience"] = audience
            if issuer:
                decode_kwargs["issuer"] = issuer

            payload = jwt.decode(token, key=public_key, **decode_kwargs)
            g.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired"}), 401
        except jwt.InvalidAudienceError:
            return jsonify({"message": "Invalid token audience"}), 401
        except jwt.InvalidIssuerError:
            return jsonify({"message": "Invalid token issuer"}), 401
        except Exception:
            return jsonify({"message": "Invalid token"}), 401

        return f(*args, **kwargs)

    return decorated
