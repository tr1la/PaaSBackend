from flask import Blueprint, request, jsonify, g
from app.services.user_service import (
    create_user,
    get_user_by_id,
    get_user_by_cognito_id,
    update_user,
)
from app.middleware.auth import authenticate_jwt

bp = Blueprint("users", __name__, url_prefix="/api/users")


@bp.route("/profile", methods=["POST"])
def create_profile():
    """Create user profile

    ---
    tags:
      - Users
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/definitions/User'
    responses:
      201:
        description: Created
        content:
          application/json:
            schema:
              $ref: '#/definitions/User'
      409:
        description: Already exists
    security:
      - BearerAuth: []
    """
    try:
        user_data = request.get_json() or {}
        cognito_id = user_data.get("userId")
        # merge as Node code did: request body takes precedence
        payload = {**user_data}

        existing = get_user_by_cognito_id(cognito_id)
        if existing:
            return (
                jsonify({"success": False, "message": "User profile already exists", "data": existing}),
                409,
            )

        result = create_user(payload)
        return jsonify({"success": True, "data": result, "message": "User profile created successfully"}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route("/profile", methods=["GET"])
@authenticate_jwt
def get_current_profile():
    """Get current user's profile

    ---
    tags:
      - Users
    responses:
      200:
        description: OK
        content:
          application/json:
            schema:
              $ref: '#/definitions/User'
      201:
        description: Created automatically
        content:
          application/json:
            schema:
              $ref: '#/definitions/User'
    security:
      - BearerAuth: []
    """
    try:
        cognito_user_id = g.user.get("userId")
        user = get_user_by_cognito_id(cognito_user_id)
        if not user:
            # create automatically like Node
            user_data = {
                "cognitoUserId": cognito_user_id,
                "name": g.user.get("name"),
                "email": g.user.get("email"),
                "username": g.user.get("username"),
            }
            user = create_user(user_data)
            return jsonify({"success": True, "data": user, "message": "User profile created automatically"}), 201
        return jsonify({"success": True, "data": user}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route("/<user_id>", methods=["GET"])
@authenticate_jwt
def get_user(user_id):
    """Get a user by id

    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        required: true
        schema:
          type: string
    responses:
      200:
        description: OK
        content:
          application/json:
            schema:
              $ref: '#/definitions/User'
      404:
        description: Not found
    security:
      - BearerAuth: []
    """
    try:
        user = get_user_by_id(user_id)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        return jsonify({"success": True, "data": user}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@bp.route("/<user_id>", methods=["PUT"])
@authenticate_jwt
def put_user(user_id):
    """Update a user by id

    ---
    tags:
      - Users
    parameters:
      - in: path
        name: user_id
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/definitions/User'
    responses:
      200:
        description: Updated
        content:
          application/json:
            schema:
              $ref: '#/definitions/User'
      404:
        description: Not found
    security:
      - BearerAuth: []
    """
    try:
        data = request.get_json() or {}
        existing = get_user_by_id(user_id)
        if not existing:
            return jsonify({"success": False, "message": "User not found"}), 404
        updated = update_user(user_id, data)
        return jsonify({"success": True, "data": updated, "message": "User updated successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
