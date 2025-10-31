"""Serie service that uses MongoDB when available, otherwise falls back to in-memory storage.
This ports the logic from the original Node.js implementation (uploading thumbnails, SNS topic management,
and updating MongoDB collections).
"""
from uuid import uuid4
from app.utils.mongodb import connect_to_database
from app.utils.s3 import upload_via_cloudfront, delete_via_cloudfront
from app.utils.sns import create_topic, delete_topic, subscribe_to_serie, unsubscribe_from_topic

_SERIES = {}
_SUBSCRIPTIONS = {}


def _db():
    return connect_to_database()


def create_serie(data, user_id=None, id_token=None, file=None):
    db = _db()
    # if we have a real DB, run Mongo logic similar to Node
    if db:
        series_col = db.collection("series")
        image_url = ""
        if file:
            unique_name = f"{uuid4()}_{getattr(file, 'filename', 'file')}"
            buffer = getattr(file, 'read', lambda: None)()
            mimetype = getattr(file, 'mimetype', None) or getattr(file, 'content_type', None)
            image_url = upload_via_cloudfront(id_token, buffer, unique_name, mimetype, f"files/user-{user_id}/thumbnail")

        new_serie = {
            **data,
            "serie_thumbnail": image_url,
            "isPublish": data.get("isPublish", False),
            "serie_user": user_id,
            "serie_lessons": data.get("serie_lessons", []),
            "createdAt": None,
            "updatedAt": None,
            "serie_subcribe_num": 0,
        }
        result = series_col.insert_one(new_serie)
        inserted_id = str(result.inserted_id)
        topic_arn = create_topic(f"serie_{inserted_id}")
        series_col.update_one({"_id": result.inserted_id}, {"$set": {"serie_sns": topic_arn}})
        return {"_id": inserted_id, **new_serie, "serie_sns": topic_arn}

    # fallback: in-memory
    serie_id = str(uuid4())
    serie = {"_id": serie_id, **data, "created_by": user_id}
    _SERIES[serie_id] = serie
    return serie


def get_all_series(query=None):
    db = _db()
    if db:
        serie_col = db.collection("series")
        q = dict(query) if query else {}
        return list(serie_col.find(q))
    return list(_SERIES.values())


def get_serie_by_id(serie_id):
    db = _db()
    if db:
        try:
            from bson import ObjectId

            if not ObjectId.is_valid(serie_id):
                return None
            serie_col = db.collection("series")
            return serie_col.find_one({"_id": ObjectId(serie_id)})
        except Exception:
            return None
    return _SERIES.get(serie_id)


def get_all_series_by_user(user_id):
    db = _db()
    if db:
        serie_col = db.collection("series")
        return list(serie_col.find({"serie_user": user_id}))
    return [s for s in _SERIES.values() if s.get("created_by") == user_id]


def search_series_by_title(keyword):
    db = _db()
    if db:
        serie_col = db.collection("series")
        # Use text search if index exists, otherwise simple regex
        try:
            return list(serie_col.find({"$text": {"$search": keyword}, "isPublish": True}))
        except Exception:
            return list(serie_col.find({"serie_title": {"$regex": keyword, "$options": "i"}, "isPublish": True}))
    keyword_lower = keyword.lower()
    return [s for s in _SERIES.values() if keyword_lower in str(s.get("serie_title", "")).lower()]


def get_series_subscribed_by_user(user_id):
    db = _db()
    if db:
        user_col = db.collection("users")
        serie_col = db.collection("series")
        user = user_col.find_one({"_id": user_id}, {"serie_subcribe": 1})
        if not user or not user.get("serie_subcribe"):
            return []
        serie_ids = user.get("serie_subcribe")
        # Attempt to convert to ObjectId when necessary
        from bson import ObjectId

        obj_ids = []
        for sid in serie_ids:
            try:
                obj_ids.append(ObjectId(sid))
            except Exception:
                pass
        return list(serie_col.find({"_id": {"$in": obj_ids}}))
    # in-memory fallback
    result = []
    for sid, subs in _SUBSCRIPTIONS.items():
        if user_id in subs:
            serie = _SERIES.get(sid)
            if serie:
                result.append(serie)
    return result


def update_serie(serie_id, data, user_id=None, id_token=None, file=None):
    db = _db()
    if db:
        serie_col = db.collection("series")
        # coerce isPublish string
        if isinstance(data.get("isPublish"), str):
            data["isPublish"] = data["isPublish"].lower() == "true"
        if file:
            # delete old and upload new
            current = serie_col.find_one({"_id": serie_col.ObjectId(serie_id)})
            if current and current.get("serie_thumbnail"):
                delete_via_cloudfront(current.get("serie_thumbnail"))
            unique_name = f"{uuid4()}_{getattr(file,'filename','file')}"
            buffer = getattr(file, 'read', lambda: None)()
            mimetype = getattr(file, 'mimetype', None) or getattr(file, 'content_type', None)
            new_url = upload_via_cloudfront(id_token, buffer, unique_name, mimetype, f"files/user-{user_id}/thumbnail")
            data["serie_thumbnail"] = new_url
        data["updatedAt"] = None
        res = serie_col.update_one({"_id": serie_col.ObjectId(serie_id)}, {"$set": data})
        if res.matched_count == 0:
            return None
        return serie_col.find_one({"_id": serie_col.ObjectId(serie_id)})
    existing = _SERIES.get(serie_id)
    if not existing:
        return None
    if file:
        # no-op for in-memory
        data["serie_thumbnail"] = f"uploaded://{getattr(file,'filename','file')}"
    existing.update(data)
    _SERIES[serie_id] = existing
    return existing


def subscribe_serie(serie_id, user_id, user_email):
    db = _db()
    if db:
        serie_col = db.collection("series")
        user_col = db.collection("users")
        serie = serie_col.find_one({"_id": serie_col.ObjectId(serie_id)})
        if not serie or not serie.get("serie_sns"):
            raise ValueError("Serie not found")
        user = user_col.find_one({"_id": user_id})
        if not user:
            raise ValueError("User not found")
        if user.get("serie_subcribe") and serie_id in user.get("serie_subcribe"):
            return {"message": "Bạn đã đăng ký series này rồi.", "alreadySubscribed": True}
        subscribe_to_serie(serie.get("serie_sns"), user_email)
        user_col.update_one({"_id": user_id}, {"$addToSet": {"serie_subcribe": serie_id}, "$set": {"updatedAt": None}})
        serie_col.update_one({"_id": serie_col.ObjectId(serie_id)}, {"$inc": {"serie_subcribe_num": 1}, "$set": {"updatedAt": None}})
        return {"message": "Subscribed"}
    subs = _SUBSCRIPTIONS.setdefault(serie_id, set())
    if user_id in subs:
        return {"message": "Bạn đã đăng ký series này rồi.", "alreadySubscribed": True}
    subs.add(user_id)
    return {"message": "Đăng ký nhận thông báo thành công.", "result": {"serieId": serie_id, "userId": user_id}}


def unsubscribe_serie(serie_id, user_id, user_email):
    db = _db()
    if db:
        serie_col = db.collection("series")
        user_col = db.collection("users")
        serie = serie_col.find_one({"_id": serie_col.ObjectId(serie_id)})
        if not serie or not serie.get("serie_sns"):
            raise ValueError("Serie not found")
        user = user_col.find_one({"_id": user_id})
        if not user:
            raise ValueError("User not found")
        if not user.get("serie_subcribe") or serie_id not in user.get("serie_subcribe"):
            return {"message": "Bạn chưa đăng ký serie này.", "user": user}
        result = unsubscribe_from_topic(serie.get("serie_sns"), user_email)
        if result.get("pendingConfirmation"):
            return result
        user_col.update_one({"_id": user_id}, {"$pull": {"serie_subcribe": serie_id}, "$set": {"updatedAt": None}})
        serie_col.update_one({"_id": serie_col.ObjectId(serie_id)}, {"$inc": {"serie_subcribe_num": -1}, "$set": {"updatedAt": None}})
        return {"message": "Bạn đã hủy đăng ký thành công.", "user": None}
    subs = _SUBSCRIPTIONS.get(serie_id, set())
    if user_id not in subs:
        return {"message": "Bạn chưa đăng ký serie này.", "user": None}
    subs.remove(user_id)
    return {"result": {"serieId": serie_id, "userId": user_id}}


def delete_serie(serie_id):
    db = _db()
    if db:
        serie_col = db.collection("series")
        user_col = db.collection("users")
        from bson import ObjectId

        serie = serie_col.find_one({"_id": ObjectId(serie_id)})
        if not serie:
            raise ValueError("Serie không tồn tại.")
        if serie.get("serie_lessons") and len(serie.get("serie_lessons")) > 0:
            return {"success": False, "warning": "Không thể xóa serie khi vẫn còn bài học trong serie này."}
        user_col.update_many({"serie_subcribe": serie_id}, {"$pull": {"serie_subcribe": serie_id}, "$set": {"updatedAt": None}})
        if serie.get("serie_sns"):
            delete_topic(serie.get("serie_sns"))
        result = serie_col.delete_one({"_id": ObjectId(serie_id)})
        if result.deleted_count > 0 and serie.get("serie_thumbnail"):
            delete_via_cloudfront(serie.get("serie_thumbnail"))
        return result.deleted_count > 0
    return _SERIES.pop(serie_id, None)
