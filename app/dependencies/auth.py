"""Auth/authorization dependencies shared by protected router endpoints.

get_current_user identifies who's calling (valid token -> live, non-deleted
user). require_admin builds on top of it to additionally enforce the
admin-only rule, so a route just declares `Depends(require_admin)` and gets
both authentication and authorization for free.
"""

from typing import Optional

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.jwt import TokenError, decode_access_token
from app.database import get_database
from app.models.user import UserModel, UserType

# tokenUrl only affects the OpenAPI docs' "Authorize" flow (where FastAPI
# sends the login request) — update this if the login route's actual path
# ends up different once app/routers/auth.py is implemented.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# Collection name is centralized here since it's the one place that needs it;
# routers/services should go through get_current_user rather than querying
# users directly wherever possible.
USERS_COLLECTION = "users"


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserModel:
    """Resolve the authenticated user from a bearer JWT.

    Use `Depends(get_current_user)` on any route that requires a logged-in
    caller. Steps: decode/verify the JWT, look up the user id ("sub" claim)
    in MongoDB, and reject the request (401) if the token is invalid/expired,
    the user no longer exists, or the account has been soft-deleted.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
    except TokenError:
        raise credentials_error

    user_id: Optional[str] = payload.get("sub")
    if user_id is None or not ObjectId.is_valid(user_id):
        raise credentials_error

    db = get_database()
    user_doc = await db[USERS_COLLECTION].find_one({"_id": ObjectId(user_id)})
    if user_doc is None:
        raise credentials_error

    user = UserModel(**user_doc)
    if user.is_deleted:
        # Token itself is still cryptographically valid, but the account it
        # points to has been soft-deleted, so treat it like a dead login.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account has been deleted",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def require_admin(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """Enforce that the authenticated caller is an admin.

    Layers on top of `get_current_user`: first confirms the caller is a
    valid, logged-in user, then checks their role. Use
    `Depends(require_admin)` on admin-only routes (e.g. listing/updating
    other users, viewing stats).
    """
    if current_user.type != UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
