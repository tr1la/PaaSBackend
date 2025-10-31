from flask import Blueprint, request, jsonify, g
from app.middleware.auth import authenticate_jwt
from app.services.serie_service import (
    create_serie,
    get_all_series,
    get_serie_by_id,
    update_serie,
    delete_serie,
    subscribe_serie,
    unsubscribe_serie,
    search_series_by_title,
    get_series_subscribed_by_user,
    get_all_series_by_user,
)

bp = Blueprint("series", __name__, url_prefix="/api/series")


@bp.route("/", methods=["POST"])
@authenticate_jwt
def post_serie():
    """Create a series

    ---
    tags:
      - Series
    requestBody:
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              title:
                type: string
              description:
                type: string
              serie_thumbnail:
                type: string
                format: binary
    responses:
      201:
        description: Created
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  $ref: '#/definitions/Serie'
                message:
                  type: string
    security:
      - BearerAuth: []
    """
    # multer handled files in Node; here we accept multipart but keep simple
    data = request.form.to_dict() if request.form else request.get_json() or {}
    file = request.files.get("serie_thumbnail") if request.files else None
    user_id = g.user.get("userId")
    result = create_serie(data, user_id, g.user.get("idToken"), file)
    return jsonify(result), 201


@bp.route("/", methods=["GET"])
def get_series():
    """List series

    ---
    tags:
      - Series
    parameters:
      - in: query
        name: page
        schema:
          type: integer
        required: false
    responses:
      200:
        description: OK
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    $ref: '#/definitions/Serie'
                message:
                  type: string
    """
    res = get_all_series(request.args)
    return jsonify(res), 200


@bp.route("/subscribed", methods=["GET"])
@authenticate_jwt
def get_subscribed():
    """Get series subscribed by user

    ---
    tags:
      - Series
    responses:
      200:
        description: OK
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    $ref: '#/definitions/Serie'
                message:
                  type: string
    security:
      - BearerAuth: []
    """
    res = get_series_subscribed_by_user(g.user.get("userId"))
    return jsonify(res), 200


@bp.route("/created", methods=["GET"])
@authenticate_jwt
def get_created():
    """Get series created by current user

    ---
    tags:
      - Series
    responses:
      200:
        description: OK
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    $ref: '#/definitions/Serie'
                message:
                  type: string
    security:
      - BearerAuth: []
    """
    res = get_all_series_by_user(g.user.get("userId"))
    return jsonify(res), 200


@bp.route("/search", methods=["GET"])
def search():
    """Search series by keyword

    ---
    tags:
      - Series
    parameters:
      - in: query
        name: keyword
        required: true
        schema:
          type: string
    responses:
      200:
        description: OK
      400:
        description: Missing keyword
    """
    keyword = request.args.get("keyword")
    if not keyword:
        return jsonify({"message": "Thiếu từ khóa tìm kiếm"}), 400
    res = search_series_by_title(keyword)
    return jsonify(res), 200


@bp.route("/<serie_id>", methods=["GET"])
def get_serie(serie_id):
    """Get a series by id

    ---
    tags:
      - Series
    parameters:
      - in: path
        name: serie_id
        required: true
        schema:
          type: string
    responses:
      200:
        description: OK
        content:
          application/json:
            schema:
              $ref: '#/definitions/Serie'
      404:
        description: Not found
    """
    s = get_serie_by_id(serie_id)
    if not s:
        return jsonify({"message": "Serie not found"}), 404
    return jsonify(s), 200


@bp.route("/<serie_id>", methods=["PATCH"])
@authenticate_jwt
def patch_serie(serie_id):
    """Update a series

    ---
    tags:
      - Series
    parameters:
      - in: path
        name: serie_id
        required: true
        schema:
          type: string
    requestBody:
      content:
        multipart/form-data:
          schema:
            type: object
    responses:
      200:
        description: Updated
      404:
        description: Not found
    security:
      - BearerAuth: []
    """
    data = request.form.to_dict() if request.form else request.get_json() or {}
    file = request.files.get("serie_thumbnail") if request.files else None
    updated = update_serie(serie_id, data, g.user.get("userId"), g.user.get("idToken"), file)
    if not updated:
        return jsonify({"message": "Serie not found"}), 404
    return jsonify(updated), 200


@bp.route("/<serie_id>/subscribe", methods=["POST"])
@authenticate_jwt
def subscribe(serie_id):
    """Subscribe current user to a series

    ---
    tags:
      - Series
    parameters:
      - in: path
        name: serie_id
        required: true
        schema:
          type: string
    responses:
      200:
        description: OK
    security:
      - BearerAuth: []
    """
    user_id = g.user.get("userId")
    user_email = g.user.get("email")
    if not user_id or not user_email:
        return jsonify({"message": "Thiếu thông tin người dùng"}), 400
    result = subscribe_serie(serie_id, user_id, user_email)
    return jsonify(result), 200


@bp.route("/<serie_id>/unsubscribe", methods=["POST"])
@authenticate_jwt
def unsubscribe(serie_id):
    """Unsubscribe current user from a series

    ---
    tags:
      - Series
    parameters:
      - in: path
        name: serie_id
        required: true
        schema:
          type: string
    responses:
      200:
        description: OK
    security:
      - BearerAuth: []
    """
    user_id = g.user.get("userId")
    user_email = g.user.get("email")
    if not user_id or not user_email:
        return jsonify({"message": "Thiếu thông tin người dùng"}), 400
    result = unsubscribe_serie(serie_id, user_id, user_email)
    return jsonify(result), 200


@bp.route("/<serie_id>", methods=["DELETE"])
@authenticate_jwt
def delete(serie_id):
    """Delete a series

    ---
    tags:
      - Series
    parameters:
      - in: path
        name: serie_id
        required: true
        schema:
          type: string
    responses:
      200:
        description: Deleted
      404:
        description: Not found
    security:
      - BearerAuth: []
    """
    deleted = delete_serie(serie_id)
    if not deleted:
        return jsonify({"message": "Serie not found"}), 404
    return jsonify({"message": "Serie deleted successfully"}), 200


@bp.route("/<serie_id>/lessons", methods=["GET", "POST"])
def series_lessons_proxy(serie_id):
    # The lessons blueprint will be registered with merge_params; single-file proxy kept for simplicity
    return jsonify({"message": "Use /api/series/<id>/lessons/* endpoints"}), 200
