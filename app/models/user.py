"""MongoDB document model for users, plus the shared PyObjectId helper."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field, GetCoreSchemaHandler
from pydantic_core import core_schema


class UserType(str, Enum):
    """User roles used for role-based authorization (admin vs. client)."""

    ADMIN = "admin"
    CLIENT = "client"


class PyObjectId(ObjectId):
    """Lets Pydantic v2 validate/serialize Mongo's bson.ObjectId as a plain string.

    Accepts either an ObjectId instance or a valid ObjectId string on input,
    and always serializes to a string so responses/JSON stay portable.
    """

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema(
                [
                    core_schema.is_instance_schema(ObjectId),
                    core_schema.chain_schema(
                        [
                            core_schema.str_schema(),
                            core_schema.no_info_plain_validator_function(cls.validate),
                        ]
                    ),
                ]
            ),
            serialization=core_schema.plain_serializer_function_ser_schema(str),
        )

    @classmethod
    def validate(cls, value: str) -> ObjectId:
        if not ObjectId.is_valid(value):
            raise ValueError(f"Invalid ObjectId: {value!r}")
        return ObjectId(value)


class UserModel(BaseModel):
    """The document shape stored in the `users` MongoDB collection.

    This is the internal/storage representation — it includes the hashed
    password and soft-delete bookkeeping, so it must never be returned
    directly from an API endpoint (see schemas.user.UserResponse for that).
    """

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    city: str
    age: int
    type: UserType
    hashed_password: str

    # Soft delete: rows are flagged rather than removed, so records stay
    # available for audits/history instead of being physically deleted.
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
    )
