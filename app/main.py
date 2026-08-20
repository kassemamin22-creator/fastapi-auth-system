"""FastAPI application entrypoint: DB lifecycle hooks and router wiring."""

import logging
import re

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import close_mongo_connection, connect_to_mongo
from app.routers import auth, stats, users

logger = logging.getLogger(__name__)

app = FastAPI(title="FastAPI Auth System")

# The React frontend runs on a different origin than the API (Vite dev
# server locally, Vercel in production), so the browser needs an explicit
# CORS allowance — without this, every fetch() from the frontend fails at
# the browser level before the request even reaches a route. Restricted to
# known origins/patterns rather than "*" since credentials (the bearer
# token) are involved.
#
# The exact production URL is listed alongside the *.vercel.app regex as a
# belt-and-suspenders safety net (in case Vercel ever serves the app from
# something the regex wouldn't match, e.g. a custom domain added later —
# that would need its own entry here too, since it won't end in
# .vercel.app). ALLOWED_ORIGINS/ALLOWED_ORIGIN_REGEX are also reused below
# by unhandled_exception_handler — see its docstring for why.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://fastapi-auth-system-six.vercel.app",
]
ALLOWED_ORIGIN_REGEX = re.compile(r"https://.*\.vercel\.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX.pattern,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    CORS headers are added by hand here because CORSMiddleware never gets
    the chance to add its own: Starlette wraps the *entire* app (including
    all user-added middleware, CORSMiddleware among them) in
    ServerErrorMiddleware, which is what actually invokes this handler for
    a truly unhandled exception. The response this function returns goes
    straight out from that outermost layer, bypassing CORSMiddleware
    entirely — so without this, any unhandled exception comes back with no
    Access-Control-Allow-Origin header at all, and the browser reports it
    as a CORS failure, hiding the real 500 behind a misleading error.
    (This is exactly what happened in production: a bcrypt/passlib
    incompatibility — see requirements.txt — made /login 500 on Render,
    and the missing CORS header on *that* response was what actually
    surfaced in the browser as "blocked by CORS policy".)
    """
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    response = JSONResponse(status_code=500, content={"detail": "Internal server error"})
    origin = request.headers.get("origin")
    if origin and (origin in ALLOWED_ORIGINS or ALLOWED_ORIGIN_REGEX.fullmatch(origin)):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response

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
