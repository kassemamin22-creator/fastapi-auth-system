"""Tests for /users/me (self profile), admin user management (GET /users,
PUT /users/{id}), and soft delete (DELETE /users/{id}).
"""

import pytest

pytestmark = pytest.mark.asyncio


# --- GET/PUT /users/me -----------------------------------------------------


async def test_get_my_profile(client, client_user):
    user, headers = client_user

    resp = await client.get("/users/me", headers=headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == user["id"]
    assert body["email"] == user["email"]
    assert "password" not in body
    assert "hashed_password" not in body


async def test_update_my_profile_partial_update(client, client_user):
    user, headers = client_user

    resp = await client.put("/users/me", headers=headers, json={"city": "New City"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["city"] == "New City"
    # Untouched fields keep their original values, not wiped to null.
    assert body["first_name"] == user["first_name"]
    assert body["last_name"] == user["last_name"]
    assert body["updated_at"] != user["updated_at"]


async def test_update_my_profile_cannot_change_role(client, client_user):
    user, headers = client_user
    assert user["type"] == "client"

    # UserUpdateSelf has no `type` field, so this extra key is silently
    # dropped by Pydantic's default extra="ignore" rather than applied.
    resp = await client.put("/users/me", headers=headers, json={"type": "admin", "city": "X"})
    assert resp.status_code == 200
    assert resp.json()["type"] == "client"

    # Confirm it actually stuck in the DB / on the token's authority level,
    # not just in this one response body.
    admin_only_resp = await client.get("/users", headers=headers)
    assert admin_only_resp.status_code == 403


async def test_update_my_profile_email_conflict(client, register_client_user, client_user):
    other_user, _ = await register_client_user()
    _, headers = client_user

    resp = await client.put("/users/me", headers=headers, json={"email": other_user["email"]})

    assert resp.status_code == 409


# --- GET /users (admin listing, pagination, filters) -----------------------


async def test_list_users_requires_pagination_defaults(client, admin_user):
    _, headers = admin_user

    resp = await client.get("/users", headers=headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["page"] == 1
    assert body["limit"] == 10
    # The admin caller itself is a non-deleted user, so total >= 1.
    assert body["total"] >= 1


async def test_list_users_pagination_math(client, admin_user, register_client_user):
    _, headers = admin_user
    for _ in range(5):
        await register_client_user()

    resp = await client.get("/users?page=1&limit=2", headers=headers)
    body = resp.json()

    assert resp.status_code == 200
    assert body["limit"] == 2
    assert len(body["users"]) == 2
    assert body["total"] >= 6  # 5 clients + the admin
    assert body["total_pages"] == -(-body["total"] // 2)  # ceil division


async def test_list_users_filter_city(client, admin_user, register_client_user):
    _, headers = admin_user
    await register_client_user(city="Beirut")
    await register_client_user(city="Beirut")
    await register_client_user(city="Tripoli")

    resp = await client.get("/users?city=beirut", headers=headers)  # case-insensitive
    body = resp.json()

    assert resp.status_code == 200
    assert body["total"] == 2
    assert all(u["city"] == "Beirut" for u in body["users"])


async def test_list_users_filter_partial_match(client, admin_user, register_client_user):
    _, headers = admin_user
    await register_client_user(city="San Francisco")

    resp = await client.get("/users?city=francisco", headers=headers)
    body = resp.json()

    assert body["total"] == 1
    assert body["users"][0]["city"] == "San Francisco"


async def test_list_users_filter_type(client, admin_user, register_client_user):
    admin, headers = admin_user
    await register_client_user()

    resp = await client.get("/users?type=admin", headers=headers)
    body = resp.json()

    assert resp.status_code == 200
    assert body["total"] == 1
    assert body["users"][0]["email"] == admin["email"]


async def test_list_users_filter_first_and_last_name(client, admin_user, register_client_user):
    _, headers = admin_user
    await register_client_user(first_name="Zebra", last_name="Stripeman")

    resp = await client.get("/users?first_name=zeb&last_name=stripe", headers=headers)
    body = resp.json()

    assert body["total"] == 1
    assert body["users"][0]["first_name"] == "Zebra"


async def test_list_users_filter_email(client, admin_user, register_client_user):
    _, headers = admin_user
    user, _ = await register_client_user()

    resp = await client.get(f"/users?email={user['email']}", headers=headers)
    body = resp.json()

    assert body["total"] == 1
    assert body["users"][0]["email"] == user["email"]


async def test_list_users_combined_filters(client, admin_user, register_client_user):
    _, headers = admin_user
    await register_client_user(city="Beirut", first_name="Combo")
    await register_client_user(city="Beirut", first_name="Other")
    await register_client_user(city="Tripoli", first_name="Combo")

    resp = await client.get("/users?city=beirut&first_name=combo", headers=headers)
    body = resp.json()

    assert body["total"] == 1
    assert body["users"][0]["first_name"] == "Combo"
    assert body["users"][0]["city"] == "Beirut"


# --- PUT /users/{id} (admin update-by-id) -----------------------------------


async def test_admin_update_user_success(client, admin_user, register_client_user):
    _, headers = admin_user
    user, _ = await register_client_user()

    resp = await client.put(f"/users/{user['id']}", headers=headers, json={"city": "Updated"})

    assert resp.status_code == 200
    assert resp.json()["city"] == "Updated"


async def test_admin_update_user_role_change(client, admin_user, register_client_user):
    _, headers = admin_user
    user, password = await register_client_user()
    assert user["type"] == "client"

    resp = await client.put(f"/users/{user['id']}", headers=headers, json={"type": "admin"})
    assert resp.status_code == 200
    assert resp.json()["type"] == "admin"

    # The promotion is real, not just the response body — a fresh login
    # for that user now carries admin authority.
    login_resp = await client.post("/login", json={"email": user["email"], "password": password})
    new_headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}
    admin_only_resp = await client.get("/users", headers=new_headers)
    assert admin_only_resp.status_code == 200


async def test_admin_update_user_not_found_well_formed_id(client, admin_user):
    _, headers = admin_user

    resp = await client.put(
        "/users/000000000000000000000000", headers=headers, json={"city": "X"}
    )

    assert resp.status_code == 404


async def test_admin_update_user_not_found_malformed_id(client, admin_user):
    _, headers = admin_user

    resp = await client.put("/users/not-an-object-id", headers=headers, json={"city": "X"})

    assert resp.status_code == 404


async def test_admin_update_user_duplicate_email(client, admin_user, register_client_user):
    _, headers = admin_user
    user_a, _ = await register_client_user()
    user_b, _ = await register_client_user()

    resp = await client.put(
        f"/users/{user_b['id']}", headers=headers, json={"email": user_a["email"]}
    )

    assert resp.status_code == 409


async def test_admin_update_user_requires_admin(client, client_user, register_client_user):
    _, headers = client_user
    target, _ = await register_client_user()

    resp = await client.put(f"/users/{target['id']}", headers=headers, json={"city": "X"})

    assert resp.status_code == 403


# --- DELETE /users/{id} (soft delete) ---------------------------------------


async def test_soft_delete_success(client, admin_user, register_client_user):
    _, headers = admin_user
    user, _ = await register_client_user()

    resp = await client.delete(f"/users/{user['id']}", headers=headers)

    assert resp.status_code == 204
    assert resp.content == b""


async def test_soft_delete_excludes_from_listing(client, admin_user, register_client_user):
    _, headers = admin_user
    user, _ = await register_client_user()

    await client.delete(f"/users/{user['id']}", headers=headers)

    resp = await client.get(f"/users?email={user['email']}", headers=headers)
    assert resp.json()["total"] == 0


async def test_soft_delete_excludes_from_login(client, admin_user, register_client_user):
    _, headers = admin_user
    user, password = await register_client_user()

    await client.delete(f"/users/{user['id']}", headers=headers)

    resp = await client.post("/login", json={"email": user["email"], "password": password})
    assert resp.status_code == 401


async def test_soft_delete_excludes_from_get_current_user(
    client, admin_user, register_client_user, auth_headers
):
    _, admin_headers = admin_user
    user, password = await register_client_user()
    stale_headers = await auth_headers(user["email"], password)

    await client.delete(f"/users/{user['id']}", headers=admin_headers)

    resp = await client.get("/users/me", headers=stale_headers)
    assert resp.status_code == 401


async def test_soft_delete_twice_returns_404_second_time(
    client, admin_user, register_client_user
):
    _, headers = admin_user
    user, _ = await register_client_user()

    first = await client.delete(f"/users/{user['id']}", headers=headers)
    second = await client.delete(f"/users/{user['id']}", headers=headers)

    assert first.status_code == 204
    assert second.status_code == 404


async def test_soft_delete_malformed_id_returns_404(client, admin_user):
    _, headers = admin_user

    resp = await client.delete("/users/not-an-object-id", headers=headers)

    assert resp.status_code == 404


async def test_soft_delete_requires_admin(client, client_user, register_client_user):
    _, headers = client_user
    target, _ = await register_client_user()

    resp = await client.delete(f"/users/{target['id']}", headers=headers)

    assert resp.status_code == 403
