"""Tests for /register, /login, and the auth/authorization mechanism itself
(token validation, missing/invalid/expired tokens, admin-only gating).

The last group is exercised via GET /users/me and GET /users rather than a
dedicated endpoint, since get_current_user/require_admin are dependencies,
not routes — those two are just the simplest protected/admin-only routes
to drive them through.
"""

from datetime import timedelta

import pytest

from app.core.jwt import create_access_token
from tests.conftest import make_register_payload

pytestmark = pytest.mark.asyncio


# --- Registration ------------------------------------------------------


async def test_register_success(client):
    payload = make_register_payload()
    resp = await client.post("/register", json=payload)

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == payload["email"]
    assert body["first_name"] == payload["first_name"]
    assert body["type"] == "client"
    assert body["is_deleted"] is False
    assert "id" in body
    assert "password" not in body
    assert "hashed_password" not in body


async def test_register_duplicate_email(client, register_client_user):
    user, _ = await register_client_user()

    resp = await client.post("/register", json=make_register_payload(email=user["email"]))

    assert resp.status_code == 409
    assert "already registered" in resp.json()["detail"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"first_name": ""},
        {"first_name": "   "},
        {"email": "not-an-email"},
        {"phone": "abc123"},
        {"phone": "123"},
        {"age": 0},
        {"age": -5},
        {"age": 200},
        {"password": "short1"},
        {"password": "alllettersnoDigits"},
        {"password": "12345678"},
    ],
    ids=[
        "empty-first-name",
        "whitespace-only-first-name",
        "malformed-email",
        "non-numeric-phone",
        "too-short-phone",
        "zero-age",
        "negative-age",
        "age-over-120",
        "password-too-short",
        "password-no-digit",
        "password-no-letter",
    ],
)
async def test_register_invalid_data(client, overrides):
    resp = await client.post("/register", json=make_register_payload(**overrides))
    assert resp.status_code == 422


async def test_register_missing_body(client):
    resp = await client.post("/register")
    assert resp.status_code == 422


async def test_register_ignores_type_field_forces_client(client):
    """UserRegister has no `type` field; extra keys are silently dropped by
    Pydantic's default `extra="ignore"`, so a caller can't grant themselves
    admin by just adding the field to the JSON body.
    """
    payload = make_register_payload()
    payload["type"] = "admin"

    resp = await client.post("/register", json=payload)

    assert resp.status_code == 201, resp.text
    assert resp.json()["type"] == "client"


# --- Login ---------------------------------------------------------------


async def test_login_success(client, register_client_user):
    user, password = await register_client_user()

    resp = await client.post("/login", json={"email": user["email"], "password": password})

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]


async def test_login_wrong_password(client, register_client_user):
    user, _ = await register_client_user()

    resp = await client.post("/login", json={"email": user["email"], "password": "WrongPass123"})

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Incorrect email or password"


async def test_login_unknown_email(client):
    resp = await client.post(
        "/login", json={"email": "nobody_here@example.com", "password": "whatever123"}
    )

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Incorrect email or password"


async def test_login_soft_deleted_account_same_generic_message(
    client, register_client_user, admin_user
):
    user, password = await register_client_user()
    _, admin_headers = admin_user

    del_resp = await client.delete(f"/users/{user['id']}", headers=admin_headers)
    assert del_resp.status_code == 204

    resp = await client.post("/login", json={"email": user["email"], "password": password})

    assert resp.status_code == 401
    # Same exact message as wrong-password/unknown-email — never reveal
    # *why* a login failed.
    assert resp.json()["detail"] == "Incorrect email or password"


# --- Protected-route authentication (get_current_user) -------------------


async def test_protected_endpoint_without_token(client):
    resp = await client.get("/users/me")
    assert resp.status_code == 401


async def test_protected_endpoint_invalid_token(client):
    resp = await client.get(
        "/users/me", headers={"Authorization": "Bearer not-a-real-jwt-token"}
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Could not validate credentials"


async def test_protected_endpoint_expired_token(client, register_client_user):
    user, _ = await register_client_user()
    expired_token = create_access_token(
        data={"sub": user["id"], "role": "client"},
        expires_delta=timedelta(seconds=-1),
    )

    resp = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {expired_token}"}
    )

    assert resp.status_code == 401


async def test_protected_endpoint_valid_token(client, client_user):
    user, headers = client_user

    resp = await client.get("/users/me", headers=headers)

    assert resp.status_code == 200
    assert resp.json()["email"] == user["email"]


# --- Admin-only authorization (require_admin) -----------------------------


async def test_admin_only_endpoint_forbidden_for_client(client, client_user):
    _, headers = client_user

    resp = await client.get("/users", headers=headers)

    assert resp.status_code == 403
    assert resp.json()["detail"] == "Admin privileges required"


async def test_admin_only_endpoint_success_for_admin(client, admin_user):
    _, headers = admin_user

    resp = await client.get("/users", headers=headers)

    assert resp.status_code == 200
