"""Pydantic schemas for the login flow and JWT payloads."""

from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.user import UserType


class UserLogin(BaseModel):
    """Credentials submitted to the login endpoint."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """Response body returned after a successful login."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded/validated JWT payload, used internally by auth dependencies
    to identify the current user and enforce role-based authorization.
    """

    user_id: Optional[str] = None
    role: Optional[UserType] = None
