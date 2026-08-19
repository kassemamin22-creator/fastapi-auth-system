"""Pydantic request/response schemas for user registration, admin management,
profile updates, and API responses.

Registration vs. admin-creation is deliberately split into two schemas:
`UserRegister` has no `type` field at all, so a public caller has no way to
grant themselves the admin role even if they add an extra field to the
request body (Pydantic ignores/rejects unknown fields rather than trusting
client input). Only `UserCreateByAdmin`, which a route can gate behind an
"is admin" dependency, accepts a `type`.
"""

import re
from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

from app.models.user import UserModel, UserType

# Shared field constraints, defined once and reused across schemas below.
NameStr = Annotated[str, StringConstraints(min_length=1, strip_whitespace=True)]
# Optional leading "+", then 7-15 digits — covers most international numbers
# without pulling in a dedicated phone-parsing dependency.
PhoneStr = Annotated[
    str, StringConstraints(pattern=r"^\+?[0-9]{7,15}$", strip_whitespace=True)
]
AgeInt = Annotated[int, Field(ge=1, le=120)]


def _check_password_complexity(value: str) -> str:
    """Shared rule: at least one letter and one number (length is enforced
    separately via each field's min_length).
    """
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("Password must contain at least one letter and one number")
    return value


class _PasswordMixin(BaseModel):
    """Shared required password field for schemas that must accept one
    (registration, admin-creation).
    """

    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def password_must_have_letter_and_number(cls, value: str) -> str:
        return _check_password_complexity(value)


class UserBase(BaseModel):
    """Common profile fields shared by registration and admin-creation."""

    first_name: NameStr
    last_name: NameStr
    email: EmailStr
    phone: PhoneStr
    city: NameStr
    age: AgeInt


class UserRegister(UserBase, _PasswordMixin):
    """Public self-registration payload.

    No `type` field — every self-registered account is a client. Role
    escalation must go through an authenticated admin using
    `UserCreateByAdmin` instead.
    """


class UserCreateByAdmin(UserBase, _PasswordMixin):
    """Payload for an admin creating a user with an explicit role.

    Only reachable from a route protected by an "current user is admin"
    dependency — never expose this schema on a public endpoint.
    """

    type: UserType = UserType.CLIENT


class UserResponse(UserBase):
    """Safe, public representation of a user returned by the API.

    Deliberately omits `password`/`hashed_password`. `id` is a plain string
    (converted from Mongo's ObjectId) so responses serialize cleanly to JSON.
    """

    id: str
    type: UserType
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdateSelf(BaseModel):
    """Fields a logged-in client may update on their own profile.

    All fields are optional so callers can send a partial update — only
    fields actually present in the request body should be applied (the
    service layer uses `model_dump(exclude_unset=True)` for this). No `type`
    field — clients can never change their own role through this schema.
    """

    first_name: Optional[NameStr] = None
    last_name: Optional[NameStr] = None
    email: Optional[EmailStr] = None
    phone: Optional[PhoneStr] = None
    city: Optional[NameStr] = None
    age: Optional[AgeInt] = None
    # Optional self-service password change; hashed by the service layer
    # before it ever reaches storage.
    password: Optional[str] = Field(default=None, min_length=8)

    @field_validator("password")
    @classmethod
    def password_must_have_letter_and_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _check_password_complexity(value)


class UserUpdateByAdmin(BaseModel):
    """Fields an admin may update on any user, including their role.

    All fields optional for partial updates. Soft-delete state is handled by
    a dedicated delete endpoint/service call, not through this schema.
    """

    first_name: Optional[NameStr] = None
    last_name: Optional[NameStr] = None
    email: Optional[EmailStr] = None
    phone: Optional[PhoneStr] = None
    city: Optional[NameStr] = None
    age: Optional[AgeInt] = None
    type: Optional[UserType] = None


def user_to_response(user: UserModel) -> UserResponse:
    """Convert a stored UserModel into the safe UserResponse shape.

    Centralizes the id-stringification + hashed_password exclusion so every
    router builds responses identically instead of repeating this inline.
    """
    return UserResponse(id=str(user.id), **user.model_dump(exclude={"id", "hashed_password"}))
