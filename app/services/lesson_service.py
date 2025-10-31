"""Lesson service that uses MongoDB when available, otherwise in-memory fallback.
This ports the Node.js lesson.service.js behavior (uploading files, publishing SNS notifications,
and updating the series' lesson list).
"""
from uuid import uuid4
from app.utils.mongodb import connect_to_database
from app.utils.s3 import upload_via_cloudfront, delete_via_cloudfront
from app.utils.sns import publish_to_topic

_LESSONS = {}


def _db():
    return connect_to_database()


def create_lesson(data, user_id=None, id_token=None, files=None):
    db = _db()
    video_url = ""
    document_urls = []
    # normalize files for two styles: werkzeug FileStorage or dict-like
    if files:
        # files might be a dict with keys 'lesson_video' and 'lesson_documents'
        video = files.get("lesson_video") if hasattr(files, 'get') else None
        docs = files.get("lesson_documents") if hasattr(files, 'get') else None
        if video:
            vf = video[0] if isinstance(video, (list, tuple)) else video
            buffer = vf.read()
            video_url = upload_via_cloudfront(id_token, buffer, f"{uuid4()}_{getattr(vf,'filename','video')}", getattr(vf, 'mimetype', None), f"files/user-{user_id}/videos")
        if docs:
            doc_files = docs if isinstance(docs, (list, tuple)) else [docs]
            for doc in doc_files:
                buf = doc.read()
                document_urls.append(upload_via_cloudfront(id_token, buf, f"{uuid4()}_{getattr(doc,'filename','doc')}", getattr(doc, 'mimetype', None), f"files/user-{user_id}/docs"))

    if db:
        lesson_col = db.collection("lessons")
        series_col = db.collection("series")
        new_lesson = {**data, "lesson_video": video_url, "lesson_documents": document_urls, "createdAt": None, "updatedAt": None}
        result = lesson_col.insert_one(new_lesson)
        lesson_id = result.inserted_id
        # push lesson id to series
        series_col.update_one({"_id": data.get("lesson_serie")}, {"$push": {"serie_lessons": lesson_id}})
        serie = series_col.find_one({"_id": data.get("lesson_serie")})
        custom_message = f"Bài học mới \"{new_lesson.get('lesson_title')}\" đã được thêm vào series \"{serie.get('serie_title') if serie else ''}\". Truy cập ngay để xem nội dung!"
        if serie and serie.get("serie_sns"):
            publish_to_topic(serie.get("serie_sns"), f"New Lesson in \"{serie.get('serie_title')}\"", custom_message)
        return {"_id": str(lesson_id), **new_lesson}

    # fallback in-memory
    series_id = data.get("lesson_serie")
    if not series_id:
        raise ValueError("lesson_serie is required")
    lid = str(uuid4())
    lesson = {"_id": lid, **data, "created_by": user_id, "lesson_video": video_url, "lesson_documents": document_urls}
    series_lessons = _LESSONS.setdefault(series_id, {})
    series_lessons[lid] = lesson
    return lesson


def get_all_lessons_by_serie(series_id):
    db = _db()
    if db:
        lesson_col = db.collection("lessons")
        return list(lesson_col.find({"lesson_serie": series_id}))
    return list(_LESSONS.get(series_id, {}).values())


def get_lesson_by_id(series_id, lesson_id):
    db = _db()
    if db:
        lesson_col = db.collection("lessons")
        try:
            from bson import ObjectId
            return lesson_col.find_one({"_id": ObjectId(lesson_id), "lesson_serie": series_id})
        except Exception:
            return None
    return _LESSONS.get(series_id, {}).get(lesson_id)


def update_lesson(series_id, lesson_id, data, user_id=None, id_token=None, files=None):
    db = _db()
    data = dict(data or {})
    if db:
        lesson_col = db.collection("lessons")
        data["updatedAt"] = None
        current = lesson_col.find_one({"_id": lesson_id}) if isinstance(lesson_id, str) else lesson_col.find_one({"_id": lesson_id})
        # note: this simple translation assumes caller provides proper ids; implement full ObjectId handling when wiring DB
        if not current:
            return None
        # handle file uploads similar to create_lesson
        if files and files.get("lesson_video"):
            # delete old video
            if current.get("lesson_video"):
                delete_via_cloudfront(current.get("lesson_video"))
            vf = files.get("lesson_video")[0]
            buf = vf.read()
            data["lesson_video"] = upload_via_cloudfront(id_token, buf, f"{uuid4()}_{getattr(vf,'filename','video')}", getattr(vf, 'mimetype', None), f"files/user-{user_id}/videos")
        if files and files.get("lesson_documents"):
            # delete old docs
            if current.get("lesson_documents"):
                docs = current.get("lesson_documents")
                for doc_url in docs:
                    delete_via_cloudfront(doc_url)
            doc_urls = []
            for df in files.get("lesson_documents"):
                buf = df.read()
                doc_urls.append(upload_via_cloudfront(id_token, buf, f"{uuid4()}_{getattr(df,'filename','doc')}", getattr(df, 'mimetype', None), f"files/user-{user_id}/docs"))
            data["lesson_documents"] = doc_urls
        update_result = lesson_col.update_one({"_id": lesson_id}, {"$set": data})
        if update_result.matched_count == 0:
            return None
        return lesson_col.find_one({"_id": lesson_id})

    series_lessons = _LESSONS.get(series_id, {})
    if lesson_id not in series_lessons:
        return None
    series_lessons[lesson_id].update(data)
    return series_lessons[lesson_id]


def delete_lesson(series_id, lesson_id):
    db = _db()
    if db:
        lesson_col = db.collection("lessons")
        # find and delete
        try:
            from bson import ObjectId
            lesson = lesson_col.find_one({"_id": ObjectId(lesson_id), "lesson_serie": series_id})
            if not lesson:
                raise ValueError("Lesson không tồn tại.")
            result = lesson_col.delete_one({"_id": ObjectId(lesson_id), "lesson_serie": series_id})
            if result.deleted_count > 0:
                series_col = db.collection("series")
                series_col.update_one({"_id": ObjectId(series_id)}, {"$pull": {"serie_lessons": ObjectId(lesson_id)}})
                if lesson.get("lesson_video"):
                    delete_via_cloudfront(lesson.get("lesson_video"))
                if isinstance(lesson.get("lesson_documents"), list):
                    for doc in lesson.get("lesson_documents"):
                        delete_via_cloudfront(doc)
                elif lesson.get("lesson_documents"):
                    delete_via_cloudfront(lesson.get("lesson_documents"))
            return result.deleted_count > 0
        except Exception as e:
            raise e
    series_lessons = _LESSONS.get(series_id, {})
    return series_lessons.pop(lesson_id, None)


def delete_document_by_url(series_id, lesson_id, doc_url):
    db = _db()
    if db:
        lesson_col = db.collection("lessons")
        try:
            from bson import ObjectId
            lesson = lesson_col.find_one({"_id": ObjectId(lesson_id), "lesson_serie": series_id})
            if not lesson:
                raise ValueError("Lesson không tồn tại.")
            docs = lesson.get("lesson_documents", [])
            if doc_url not in docs:
                raise ValueError("Document URL không tồn tại trong lesson.")
            # delete file
            delete_via_cloudfront(doc_url)
            updated = [d for d in docs if d != doc_url]
            lesson_col.update_one({"_id": ObjectId(lesson_id), "lesson_serie": series_id}, {"$set": {"lesson_documents": updated, "updatedAt": None}})
            return True
        except Exception as e:
            raise e
    lesson = get_lesson_by_id(series_id, lesson_id)
    if not lesson:
        raise ValueError("Lesson không tồn tại.")
    docs = lesson.get("lesson_documents", [])
    if doc_url not in docs:
        raise ValueError("Document URL không tồn tại trong lesson.")
    lesson["lesson_documents"] = [d for d in docs if d != doc_url]
    return True
