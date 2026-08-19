from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings


class MongoDB:
    """Holds the Motor client/database so they persist across requests."""

    client: AsyncIOMotorClient | None = None
    database: AsyncIOMotorDatabase | None = None


mongodb = MongoDB()


async def connect_to_mongo() -> None:
    """Open the MongoDB connection. Call this on FastAPI startup."""
    mongodb.client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongodb.database = mongodb.client[settings.DATABASE_NAME]

    # Enforce email uniqueness at the DB level, not just via the app-level
    # find-then-insert check in user_service.py. Without this, two
    # concurrent registrations for the same email could both pass that
    # check and both insert, since the check and the write aren't atomic.
    # create_index is a no-op if the index already exists, so this is safe
    # to run on every startup.
    await mongodb.database["users"].create_index("email", unique=True)


async def close_mongo_connection() -> None:
    """Close the MongoDB connection. Call this on FastAPI shutdown."""
    if mongodb.client is not None:
        mongodb.client.close()


def get_database() -> AsyncIOMotorDatabase:
    """Return the active database instance for use in routers/services."""
    return mongodb.database
