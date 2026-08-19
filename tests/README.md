# Running the test suite

## Install test dependencies

```
pip install -r requirements-dev.txt
```

(This installs everything in `requirements.txt` plus `pytest`, `pytest-asyncio`, and `httpx`.)

## Run the tests

From the project root:

```
pytest
```

`pytest.ini` at the project root sets `pythonpath = .` (so `import app...` works regardless
of cwd) and `asyncio_mode = auto` (so async test functions don't need an explicit
`@pytest.mark.asyncio` marker on every test, though `pytestmark = pytest.mark.asyncio` is
still set per-module for clarity).

## Database used by the tests

The suite connects to the **same MongoDB Atlas cluster** the app already uses (same
`MONGODB_URL` from `.env`), but talks to a **separate database**: `fastapi_auth_test_db`,
not the real `fastapi_auth_db`. This override happens at the top of `tests/conftest.py`,
before any `app.*` module is imported, and there's a safety assertion right below it that
aborts the whole run if `DATABASE_NAME` doesn't contain `"test"` — so a broken override can
never quietly point the suite at production data.

No separate `MONGODB_URL` is needed — if you want the tests to hit a different cluster
entirely (e.g. a local MongoDB instance), set `MONGODB_URL` in your environment before
running `pytest`; it isn't overridden by the test setup, only `DATABASE_NAME` is.

## Cleanup

- The test database is dropped once before the session starts and once after it ends.
- The `users` collection is also cleared before **every individual test**, so tests never
  see leftover data from a previous test (this matters in particular because of the unique
  index on `email` — see `app/database.py::connect_to_mongo`).

## What's covered

- `test_auth.py` — registration (success/duplicate/invalid data/role can't be
  self-granted), login (success/wrong password/unknown email/soft-deleted account, all with
  the same generic 401), and the auth/authorization mechanism itself (missing/invalid/expired
  token, admin-only gating) — driven through `/users/me` and `/users` since
  `get_current_user`/`require_admin` are dependencies, not routes of their own.
- `test_users.py` — self profile (`GET`/`PUT /users/me`, including that a client can't
  change their own role), admin listing (`GET /users`: pagination math, each filter
  individually and combined), admin update-by-id (`PUT /users/{id}`: success, role change,
  404 for both malformed and well-formed-but-nonexistent ids, 409 on email conflict), and
  soft delete (`DELETE /users/{id}`: 204, exclusion from listing/login/`get_current_user`,
  double-delete 404, malformed id 404).
- `test_stats.py` — all three `/stats/*` endpoints, focused on confirming soft-deleted users
  are excluded from each aggregate.
