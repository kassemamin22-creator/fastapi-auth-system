"""Endpoints for a user's own profile, plus admin user management."""

import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import get_current_user, require_admin
from app.models.user import UserModel, UserType
from app.schemas.user import (
    UserListResponse,
    UserResponse,
    UserUpdateByAdmin,
    UserUpdateSelf,
    user_to_response,
)
from app.services.user_service import (
    EmailAlreadyExistsError,
    UserNotFoundError,
    get_users,
    soft_delete_user,
    update_own_profile,
    update_user_by_admin,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: UserModel = Depends(get_current_user)) -> UserResponse:
    """Return the caller's own profile.

    get_current_user already fetched and validated (exists, not
    soft-deleted) this user for the request, so no extra DB call is needed
    here — just convert what's already in hand.
    """
    return user_to_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    update_data: UserUpdateSelf,
    current_user: UserModel = Depends(get_current_user),
) -> UserResponse:
    """Partially update the caller's own profile.

    UserUpdateSelf has no `type` field, so a client can never change their
    own role through this endpoint — enforced at the schema level (FastAPI/
    Pydantic will reject an unknown "type" key in the body), not just left
    to convention here.
    """
    try:
        updated_user = await update_own_profile(str(current_user.id), update_data)
    except EmailAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return user_to_response(updated_user)


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    city: Optional[str] = Query(None),
    type: Optional[UserType] = Query(None),
    first_name: Optional[str] = Query(None),
    last_name: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    _admin: UserModel = Depends(require_admin),
) -> UserListResponse:
    """List/search non-deleted users, paginated. Admin-only.

    Filters are combinable (e.g. city + type together). The string filters
    (city, first_name, last_name, email) are case-insensitive partial
    matches — a search-style default rather than requiring an exact value.
    `_admin` is unused beyond gating access; it's the require_admin
    dependency that actually enforces "caller must be an admin".
    """
    filters = {
        "city": city,
        "type": type,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
    }
    users, total = await get_users(page=page, limit=limit, filters=filters)

    return UserListResponse(
        page=page,
        limit=limit,
        total=total,
        total_pages=math.ceil(total / limit) if total else 0,
        users=[user_to_response(u) for u in users],
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user_by_admin_route(
    user_id: str,
    update_data: UserUpdateByAdmin,
    _admin: UserModel = Depends(require_admin),
) -> UserResponse:
    """Update any user's profile — including their role — by id. Admin-only.

    UserUpdateByAdmin has a `type` field (unlike UserUpdateSelf), so this is
    the endpoint that can promote/demote a user. Soft-deleted users and
    nonexistent ids both come back as 404 — from the caller's perspective a
    deleted user simply doesn't exist to update. Declared after "/me" and ""
    so those static routes keep matching first; "/{user_id}" only catches
    everything else.
    """
    try:
        updated_user = await update_user_by_admin(user_id, update_data)
    except EmailAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return user_to_response(updated_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_by_admin(
    user_id: str,
    _admin: UserModel = Depends(require_admin),
) -> None:
    """Soft-delete a user by id. Admin-only.

    Sets is_deleted=True rather than removing the document — consistent
    with is_deleted/deleted_at already being part of UserModel and already
    being honored by GET /users, login, and get_current_user. A nonexistent
    id and an already-deleted id both 404, so calling this twice on the same
    user is not silently idempotent — the second call genuinely fails.

    204 No Content, no body: the caller already knows which id they just
    deleted, and there's nothing else useful to hand back (the row is now
    invisible to every other endpoint anyway).
    """
    try:
        await soft_delete_user(user_id)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
