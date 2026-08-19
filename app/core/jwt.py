"""JWT creation/decoding used by the login flow and by auth dependencies.

Flow: login verifies credentials with security.verify_password, then calls
create_access_token to issue a token. On later requests, an auth dependency
(app/dependencies/auth.py) calls decode_access_token to recover the caller's
identity/role from the token's claims and load the current user.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.config import settings


class TokenError(Exception):
    """Raised for any invalid/expired token so callers have one exception
    type to catch, instead of depending on jose's exception hierarchy.
    """


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token.

    `data` supplies the claims to embed (e.g. {"sub": user_id, "role": role}).
    An "exp" claim is added on top, defaulting to JWT_EXPIRATION_MINUTES from
    settings if `expires_delta` isn't given.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT, returning its claims.

    Signature and expiry are checked by jose's `jwt.decode`. Any failure
    (bad signature, malformed token, expired "exp") is normalized to
    TokenError so a FastAPI dependency can catch it and raise a 401.
    """
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise TokenError("Invalid or expired token") from exc
