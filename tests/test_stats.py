"""Tests for the public /stats/* endpoints, focused on soft-delete exclusion
(the one non-obvious behavior a public, unauthenticated endpoint needs to
get right) plus basic correctness of each aggregate.
"""

import pytest

pytestmark = pytest.mark.asyncio


async def test_stats_endpoints_are_public(client):
    # No Authorization header on any of these — must not 401/403.
    for path in ("/stats/count", "/stats/average-age", "/stats/top-cities"):
        resp = await client.get(path)
        assert resp.status_code == 200, f"{path} -> {resp.status_code}: {resp.text}"


async def test_stats_count_excludes_soft_deleted(client, admin_user, register_client_user):
    _, headers = admin_user
    before = (await client.get("/stats/count")).json()["total_active_users"]

    user, _ = await register_client_user()
    after_register = (await client.get("/stats/count")).json()["total_active_users"]
    assert after_register == before + 1

    await client.delete(f"/users/{user['id']}", headers=headers)
    after_delete = (await client.get("/stats/count")).json()["total_active_users"]

    assert after_delete == before


async def test_stats_average_age_excludes_soft_deleted(
    client, admin_user, register_client_user
):
    """Compare against a baseline rather than assuming an empty population —
    the admin_user fixture itself is an active user (age 40) and must be
    accounted for, not just the two client users this test adds.
    """
    _, headers = admin_user
    baseline = (await client.get("/stats/average-age")).json()
    baseline_total_age = baseline["average_age"] * baseline["active_user_count"]

    young, _ = await register_client_user(age=20)
    old, _ = await register_client_user(age=100)

    resp = await client.get("/stats/average-age")
    body = resp.json()
    expected_avg = (baseline_total_age + 20 + 100) / (baseline["active_user_count"] + 2)
    # get_average_age() rounds to 2 decimals before returning, so compare
    # against the same rounding rather than a tight-tolerance float match.
    assert body["average_age"] == round(expected_avg, 2)

    await client.delete(f"/users/{old['id']}", headers=headers)

    resp_after = await client.get("/stats/average-age")
    body_after = resp_after.json()
    # Only the age=20 user (plus the admin at age=40) remain active.
    assert body_after["active_user_count"] == body["active_user_count"] - 1


async def test_stats_average_age_null_when_no_active_users(client):
    resp = await client.get("/stats/average-age")
    body = resp.json()

    if body["active_user_count"] == 0:
        assert body["average_age"] is None


async def test_stats_top_cities_excludes_soft_deleted(client, admin_user, register_client_user):
    _, headers = admin_user
    solo_city_user, _ = await register_client_user(city="OnlySoftDeletedCity")

    before = await client.get("/stats/top-cities?limit=50")
    cities_before = {c["city"] for c in before.json()["top_cities"]}
    assert "OnlySoftDeletedCity" in cities_before

    await client.delete(f"/users/{solo_city_user['id']}", headers=headers)

    after = await client.get("/stats/top-cities?limit=50")
    cities_after = {c["city"] for c in after.json()["top_cities"]}
    assert "OnlySoftDeletedCity" not in cities_after


async def test_stats_top_cities_respects_limit_and_ordering(
    client, admin_user, register_client_user
):
    for _ in range(3):
        await register_client_user(city="PopularCity")
    for _ in range(2):
        await register_client_user(city="MediumCity")
    await register_client_user(city="RareCity")

    resp = await client.get("/stats/top-cities?limit=2")
    top_cities = resp.json()["top_cities"]

    assert len(top_cities) == 2
    assert top_cities[0] == {"city": "PopularCity", "count": 3}
    assert top_cities[1] == {"city": "MediumCity", "count": 2}


async def test_stats_top_cities_invalid_limit_422(client):
    resp = await client.get("/stats/top-cities?limit=0")
    assert resp.status_code == 422
