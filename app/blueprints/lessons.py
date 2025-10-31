from flask import Blueprint, request, jsonify, g
from app.middleware.auth import authenticate_jwt
from app.services.lesson_service import (
    create_lesson,
    get_all_lessons_by_serie,
    get_lesson_by_id,
    update_lesson,
    delete_lesson,
    delete_document_by_url,
)


bp = Blueprint("lessons", __name__, url_prefix="/api/series/<series_id>/lessons")


@bp.route("/", methods=["POST"])
@authenticate_jwt
def post_lesson(series_id):
    """Create a lesson in a series

    ---
    tags:
      - Lessons
    requestBody:
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              title:
                type: string
              content:
                type: string
              files:
                type: array
                items:
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
                  $ref: '#/definitions/Lesson'
                message:
                  type: string
    security:
      - BearerAuth: []
    """
    data = dict(request.form) if request.form else (request.get_json() or {})
    data = {**data, "lesson_serie": series_id}
    files = request.files
    lesson = create_lesson(data, g.user.get("userId"), g.user.get("idToken"), files)
    return jsonify(lesson), 201


@bp.route("/", methods=["GET"])
@authenticate_jwt
def get_lessons(series_id):
    """List lessons for a series

    ---
    tags:
      - Lessons
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
                    $ref: '#/definitions/Lesson'
                message:
                  type: string
    security:
      - BearerAuth: []
    """
    lessons = get_all_lessons_by_serie(series_id)
    return jsonify(lessons), 200


@bp.route("/<lesson_id>", methods=["GET"])
@authenticate_jwt
def get_lesson(series_id, lesson_id):
    """Get a lesson by id

    ---
    tags:
      - Lessons
    parameters:
      - in: path
        name: lesson_id
        required: true
        schema:
          type: string
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
                  $ref: '#/definitions/Lesson'
                message:
                  type: string
      404:
        description: Not found
    security:
      - BearerAuth: []
    """
    lesson = get_lesson_by_id(series_id, lesson_id)
    if not lesson:
        return jsonify({"message": "Lesson not found"}), 404
    return jsonify(lesson), 200


@bp.route("/<lesson_id>", methods=["PATCH"])
@authenticate_jwt
def patch_lesson(series_id, lesson_id):
        """Update a lesson

        ---
        tags:
          - Lessons
        parameters:
          - in: path
            name: lesson_id
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
            content:
              application/json:
                schema:
                  type: object
                  properties:
                    success:
                      type: boolean
                    data:
                      $ref: '#/definitions/Lesson'
                    message:
                      type: string
          404:
            description: Not found
        security:
          - BearerAuth: []
        """
        data = dict(request.form) if request.form else (request.get_json() or {})
        updated = update_lesson(series_id, lesson_id, data, g.user.get("userId"), g.user.get("idToken"), request.files)
        if not updated:
                return jsonify({"message": "Lesson not found"}), 404
        return jsonify(updated), 200


@bp.route("/<lesson_id>", methods=["DELETE"])
@authenticate_jwt
def del_lesson(series_id, lesson_id):
        """Delete a lesson

        ---
        tags:
          - Lessons
        parameters:
          - in: path
            name: lesson_id
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
        deleted = delete_lesson(series_id, lesson_id)
        if not deleted:
                return jsonify({"message": "Lesson not found"}), 404
        return jsonify({"message": "Lesson deleted successfully"}), 200


@bp.route("/<lesson_id>/documents", methods=["DELETE"])
@authenticate_jwt
def del_doc(series_id, lesson_id):
        """Delete a document from a lesson

        ---
        tags:
          - Lessons
        parameters:
          - in: path
            name: lesson_id
            required: true
            schema:
              type: string
        requestBody:
          required: true
          content:
            application/json:
              schema:
                type: object
                properties:
                  docUrl:
                    type: string
        responses:
          200:
            description: Deleted
          400:
            description: Bad request / document not found
          404:
            description: Lesson not found
        security:
          - BearerAuth: []
        """
        data = request.get_json() or {}
        doc_url = data.get("docUrl")
        if not doc_url:
                return jsonify({"message": "docUrl is required"}), 400
        try:
                delete_document_by_url(series_id, lesson_id, doc_url)
                return jsonify({"message": "Document deleted successfully"}), 200
        except ValueError as e:
                msg = str(e)
                if "Lesson không tồn tại" in msg:
                        return jsonify({"message": "Lesson not found"}), 404
                if "Document URL không tồn tại" in msg:
                        return jsonify({"message": "Document not found in lesson"}), 400
                return jsonify({"message": "Internal Server Error"}), 500