from flask import Blueprint, request, jsonify, g
from app.middleware.auth import authenticate_jwt
import os

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@bp.route("/verify", methods=["POST"])
def verify_token():
    """Verify a JWT token

    ---
    tags:
      - Auth
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              token:
                type: string
                description: JWT token to verify
    responses:
      200:
        description: Token is valid
        content:
          application/json:
            schema:
              type: object
              properties:
                valid:
                  type: boolean
                  example: true
                payload:
                  type: object
                  description: Decoded token payload
      401:
        description: Invalid token
    """
    data = request.get_json() or {}
    token = data.get("token")
    if not token:
        return jsonify({"message": "Token is required"}), 400

    auth_header = request.headers.get("Authorization", "")
    # Temporarily set the token in Authorization header
    request.headers = {
        **request.headers,
        "Authorization": f"Bearer {token}"
    }

    # Use the authenticate_jwt decorator's logic directly
    try:
        # Restore original Authorization header
        request.headers = {
            **request.headers,
            "Authorization": auth_header
        }
        return jsonify({
            "valid": True,
            "payload": g.user
        }), 200
    except Exception:
        return jsonify({
            "valid": False,
            "message": "Invalid token"
        }), 401

@bp.route("/status", methods=["GET"])
@authenticate_jwt
def auth_status():
    """Get current authentication status

    ---
    tags:
      - Auth
    security:
      - BearerAuth: []
    responses:
      200:
        description: Authentication info
        content:
          application/json:
            schema:
              type: object
              properties:
                authenticated:
                  type: boolean
                  example: true
                user:
                  type: object
                  description: User info from JWT
      401:
        description: Not authenticated
    """
    return jsonify({
        "authenticated": True,
        "user": g.user
    }), 200

@bp.route("/config", methods=["GET"])
def auth_config():
    """Get authentication configuration

    ---
    tags:
      - Auth
    responses:
      200:
        description: Auth configuration
        content:
          application/json:
            schema:
              type: object
              properties:
                region:
                  type: string
                  example: us-east-1
                userPoolId:
                  type: string
                  example: us-east-1_xxxxxx
                issuer:
                  type: string
                  format: uri
                  example: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxx
                jwksUrl:
                  type: string
                  format: uri
                  example: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxx/.well-known/jwks.json
    """
    pool = os.environ.get("COGNITO_USER_POOL_ID") or os.environ.get("COGNITO_POOL_ID")
    region = os.environ.get("AWS_REGION") or os.environ.get("COGNITO_REGION")
    jwks_url = os.environ.get("COGNITO_JWKS_URL") or os.environ.get("JWKS_URL")
    
    if not jwks_url and pool and region:
        jwks_url = f"https://cognito-idp.{region}.amazonaws.com/{pool}/.well-known/jwks.json"
        
    issuer = os.environ.get("JWT_ISSUER") or os.environ.get("COGNITO_ISSUER")
    if not issuer and pool and region:
        issuer = f"https://cognito-idp.{region}.amazonaws.com/{pool}"

    return jsonify({
        "region": region,
        "userPoolId": pool,
        "issuer": issuer,
        "jwksUrl": jwks_url,
        "requiresSecureJwt": str(os.environ.get("ALLOW_INSECURE_JWT", "")).lower() not in ("1", "true", "yes")
    }), 200