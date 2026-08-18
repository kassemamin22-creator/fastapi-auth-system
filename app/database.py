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


async def close_mongo_connection() -> None:
    """Close the MongoDB connection. Call this on FastAPI shutdown."""
    if mongodb.client is not None:
        mongodb.client.close()


def get_database() -> AsyncIOMotorDatabase:
    """Return the active database instance for use in routers/services."""
    return mongodb.database
