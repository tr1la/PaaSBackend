"""User service that uses MongoDB when available; otherwise uses in-memory store.
This mirrors behaviour from the Node.js user.service.js file where cognitoUserId is used as _id.
"""
from uuid import uuid4
from app.utils.mongodb import connect_to_database

_USERS = {}


def _db():
    return connect_to_database()


def create_user(data: dict) -> dict:
    db = _db()
    cognito_id = data.get("cognitoUserId") or data.get("cognitoUserId")
    if db:
        users = db.collection("users")
        if not cognito_id:
            raise ValueError("cognitoUserId is required")
        data["createdAt"] = None
        data["updatedAt"] = None
        existing = users.find_one({"_id": cognito_id})
        if existing:
            # update existing
            return update_user_by_cognito_id(cognito_id, data)
        # insert new
        payload = {"_id": cognito_id, **{k: v for k, v in data.items() if k != "cognitoUserId"}, "serie_subcribe": []}
        users.insert_one(payload)
        return {"_id": cognito_id, **payload}

    # fallback in-memory
    user_id = cognito_id or str(uuid4())
    user = {"_id": user_id, **data, "serie_subcribe": []}
    _USERS[user_id] = user
    return user


def get_user_by_id(user_id: str) -> dict:
    db = _db()
    if db:
        users = db.collection("users")
        return users.find_one({"_id": user_id})
    return _USERS.get(user_id)


def get_user_by_cognito_id(cognito_id: str) -> dict:
    return get_user_by_id(cognito_id)


def update_user(user_id: str, data: dict) -> dict:
    db = _db()
    if db:
        users = db.collection("users")
        for k in ("_id", "cognitoUserId", "createdAt"):
            data.pop(k, None)
        data["updatedAt"] = None
        result = users.find_one_and_update({"_id": user_id}, {"$set": data}, return_document=True)
        return result
    existing = _USERS.get(user_id)
    if not existing:
        return None
    existing.update(data)
    _USERS[user_id] = existing
    return existing


def update_user_by_cognito_id(cognito_id: str, data: dict):
    db = _db()
    if db:
        users = db.collection("users")
        for k in ("_id", "createdAt"):
            data.pop(k, None)
        data["updatedAt"] = None
        result = users.find_one_and_update({"_id": cognito_id}, {"$set": data}, return_document=True, upsert=True)
        return result
    # fallback
    existing = _USERS.get(cognito_id, {})
    existing.update(data)
    _USERS[cognito_id] = existing
    return existing
