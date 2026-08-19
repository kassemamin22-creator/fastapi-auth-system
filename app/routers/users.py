"""Endpoints for a logged-in user to view and update their own profile."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.auth import get_current_user
from app.models.user import UserModel
from app.schemas.user import UserResponse, UserUpdateSelf, user_to_response
from app.services.user_service import (
    EmailAlreadyExistsError,
    UserNotFoundError,
    update_own_profile,
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
