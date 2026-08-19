"""FastAPI application entrypoint: DB lifecycle hooks and router wiring."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.database import close_mongo_connection, connect_to_mongo
from app.routers import auth, stats, users

logger = logging.getLogger(__name__)

app = FastAPI(title="FastAPI Auth System")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for anything not already turned into an HTTPException.

    Without this, an unexpected error (e.g. a dropped DB connection) falls
    through to Starlette's default handler, which returns a *plain-text*
    500 body — inconsistent with every other error response in this API,
    which is JSON `{"detail": ...}`. This also keeps the raw exception
    message/type off the wire; the real error is only logged server-side.
    FastAPI's own handlers for HTTPException/RequestValidationError are
    registered for those specific types and take precedence over this one,
    so 401/403/404/409/422 responses are unaffected.
    """
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# auth.router is mounted with no prefix, so its routes are exactly
# "/register" and "/login". users.router and stats.router define their own
# "/users" / "/stats" prefixes internally. Protected routes authenticate via
# HTTPBearer (see app/dependencies/auth.py), independent of auth.router's
# own path; stats.router's routes are public (no auth dependency at all).
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(stats.router)


@app.on_event("startup")
async def on_startup() -> None:
    """Open the MongoDB connection once when the app process starts."""
    await connect_to_mongo()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Cleanly close the MongoDB connection when the app process stops."""
    await close_mongo_connection()
