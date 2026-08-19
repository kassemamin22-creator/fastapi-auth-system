"""Shared pytest fixtures for the whole test suite.

Isolation from real data: DATABASE_NAME is overridden to a dedicated test
database *before* any `app.*` module is imported (pydantic-settings
prioritizes real env vars over .env, and Settings() is only ever built once,
at import time) — so the suite never touches the real fastapi_auth_db data,
even though it runs against the same MongoDB Atlas cluster/connection
string as production. A safety assertion below refuses to run at all if
DATABASE_NAME doesn't look like a test database, in case that override is
ever removed or shadowed by mistake.

Cleanup: the test database is dropped once before the session starts and
once after it ends; the `users` collection is also cleared before every
single test, so tests never see leftovers from a previous test.
"""

import os

os.environ["DATABASE_NAME"] = "fastapi_auth_test_db"

from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config import settings

assert "test" in settings.DATABASE_NAME.lower(), (
    f"Refusing to run tests against DATABASE_NAME={settings.DATABASE_NAME!r} "
    "— it doesn't look like a test database. Check the os.environ override "
    "at the top of tests/conftest.py."
)

from app.core.security import hash_password  # noqa: E402
from app.database import close_mongo_connection, connect_to_mongo, get_database  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import UserModel, UserType  # noqa: E402

DEFAULT_PASSWORD = "TestPass123"
USERS_COLLECTION = "users"


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _db_lifecycle():
    """Connect once for the whole session; drop the test DB before and
    after the run so it never accumulates state across separate runs.
    """
    await connect_to_mongo()
    db = get_database()
    await db.client.drop_database(settings.DATABASE_NAME)
    yield
    await db.client.drop_database(settings.DATABASE_NAME)
    await close_mongo_connection()


@pytest_asyncio.fixture(autouse=True)
async def _clean_users_collection():
    """Clear the users collection before every test for full isolation —
    especially important now that email has a unique index."""
    await get_database()[USERS_COLLECTION].delete_many({})
    yield


@pytest_asyncio.fixture
async def client():
    """Async HTTP client wired directly to the app via ASGI transport — no
    real network/socket involved, but exercises the full FastAPI stack
    (routing, dependencies, Pydantic validation) exactly like a real request.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


def make_register_payload(**overrides) -> dict:
    """A valid /register payload with sensible defaults; pass overrides to
    deliberately break one field for validation tests, or to set a distinct
    email/city/etc. for a specific scenario.
    """
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "email": f"user_{uuid4().hex[:12]}@example.com",
        "phone": "+12345678901",
        "city": "Testville",
        "age": 30,
        "password": DEFAULT_PASSWORD,
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def register_client_user(client):
    """Factory: await register_client_user(**overrides) -> (user_json, password)."""

    async def _register(**overrides):
        payload = make_register_payload(**overrides)
        resp = await client.post("/register", json=payload)
        assert resp.status_code == 201, resp.text
        return resp.json(), payload["password"]

    return _register


@pytest.fixture
def login_as(client):
    """Factory: await login_as(email, password) -> httpx.Response (not
    asserted, so callers can test failure cases too)."""

    async def _login(email: str, password: str):
        return await client.post("/login", json={"email": email, "password": password})

    return _login


@pytest.fixture
def auth_headers(login_as):
    """Factory: await auth_headers(email, password) -> {"Authorization": ...},
    asserting login succeeded (for tests that need a *working* token)."""

    async def _headers(email: str, password: str) -> dict:
        resp = await login_as(email, password)
        assert resp.status_code == 200, resp.text
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _headers


@pytest_asyncio.fixture
async def client_user(register_client_user, auth_headers):
    """A ready-to-use, freshly registered + logged-in client: (user_json, headers)."""
    user, password = await register_client_user()
    headers = await auth_headers(user["email"], password)
    return user, headers


@pytest.fixture
def create_admin_user():
    """Factory: await create_admin_user(**overrides) -> (user_dict, password).

    Inserts directly into the DB — mirrors scripts/create_first_admin.py.
    Normal registration always forces type=client, so this is the only way
    to get an admin account, in tests just like in production.
    """

    async def _create(**overrides) -> tuple:
        password = overrides.pop("password", DEFAULT_PASSWORD)
        fields = {
            "first_name": "Admin",
            "last_name": "User",
            "email": f"admin_{uuid4().hex[:12]}@example.com",
            "phone": "+19999999999",
            "city": "Adminville",
            "age": 40,
        }
        fields.update(overrides)

        admin = UserModel(
            **fields,
            type=UserType.ADMIN,
            hashed_password=hash_password(password),
        )
        await get_database()[USERS_COLLECTION].insert_one(admin.model_dump(by_alias=True))

        return {"id": str(admin.id), **fields}, password

    return _create


@pytest_asyncio.fixture
async def admin_user(create_admin_user, auth_headers):
    """A ready-to-use admin: (user_dict, headers)."""
    admin, password = await create_admin_user()
    headers = await auth_headers(admin["email"], password)
    return admin, headers
