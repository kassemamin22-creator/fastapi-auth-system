"""FastAPI application entrypoint: DB lifecycle hooks and router wiring."""

from fastapi import FastAPI

from app.database import close_mongo_connection, connect_to_mongo
from app.routers import auth, users

app = FastAPI(title="FastAPI Auth System")

# auth.router is mounted with no prefix, so its routes are exactly
# "/register" and "/login". users.router defines its own "/users" prefix
# internally. Protected routes authenticate via HTTPBearer (see
# app/dependencies/auth.py), independent of auth.router's own path.
app.include_router(auth.router)
app.include_router(users.router)


@app.on_event("startup")
async def on_startup() -> None:
    """Open the MongoDB connection once when the app process starts."""
    await connect_to_mongo()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Cleanly close the MongoDB connection when the app process stops."""
    await close_mongo_connection()
