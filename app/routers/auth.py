"""Public authentication endpoints: self-registration and login.

Neither endpoint requires a token — they're how a caller gets one in the
first place (see app/dependencies/auth.py for the dependencies that consume
the resulting JWT on protected routes).
"""

from fastapi import APIRouter, HTTPException, status

from app.core.jwt import create_access_token
from app.schemas.auth import Token, UserLogin
from app.schemas.user import UserRegister, UserResponse
from app.services.user_service import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    authenticate_user,
    register_user,
)

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister) -> UserResponse:
    """Register a new client account.

    Pydantic validates `user_data` automatically (FastAPI returns 422 on
    bad input before this body even runs). The only extra failure mode
    handled here is a duplicate email, mapped to 409 Conflict.
    """
    try:
        user = await register_user(user_data)
    except EmailAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return UserResponse(id=str(user.id), **user.model_dump(exclude={"id", "hashed_password"}))


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin) -> Token:
    """Verify credentials and issue a JWT access token.

    Embeds the user id as "sub" and their role as "role" so
    dependencies.auth.get_current_user / require_admin can identify and
    authorize the caller on later requests. Any failure — unknown email,
    wrong password, or a soft-deleted account — returns the same generic
    401 message, so the response never reveals whether an email is
    registered.
    """
    try:
        user = await authenticate_user(credentials.email, credentials.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    access_token = create_access_token(data={"sub": str(user.id), "role": user.type.value})
    return Token(access_token=access_token, token_type="bearer")
