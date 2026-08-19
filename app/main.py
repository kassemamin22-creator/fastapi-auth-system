"""FastAPI application entrypoint: DB lifecycle hooks and router wiring."""

from fastapi import FastAPI

from app.database import close_mongo_connection, connect_to_mongo
from app.routers import auth

app = FastAPI(title="FastAPI Auth System")

# Mounted with no prefix, so the routes are exactly "/register" and "/login"
# — the latter matches oauth2_scheme's tokenUrl="/login" in
# app/dependencies/auth.py. If a prefix is added later, update that too.
app.include_router(auth.router)


@app.on_event("startup")
async def on_startup() -> None:
    """Open the MongoDB connection once when the app process starts."""
    await connect_to_mongo()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Cleanly close the MongoDB connection when the app process stops."""
    await close_mongo_connection()
