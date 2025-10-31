import os
from pymongo import MongoClient
from functools import lru_cache


@lru_cache()
def connect_to_database():
    """Return a pymongo database object or None if no MONGODB_URI configured."""
    uri = os.environ.get("MONGODB_URI")
    db_name = os.environ.get("MONGODB_NAME")
    if not uri:
        return None
    client = MongoClient(uri)
    if db_name:
        return client[db_name]
    # If db name not provided, return client database from URI
    return client.get_default_database()
