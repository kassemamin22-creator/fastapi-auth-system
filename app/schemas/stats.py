"""Pydantic response schemas for the public stats endpoints."""

from typing import Optional

from pydantic import BaseModel


class UserCountResponse(BaseModel):
    """Response for GET /stats/count."""

    total_active_users: int


class AverageAgeResponse(BaseModel):
    """Response for GET /stats/average-age.

    average_age is None when there are zero active users, rather than a
    misleading 0.0.
    """

    average_age: Optional[float]
    active_user_count: int


class CityCount(BaseModel):
    city: str
    count: int


class TopCitiesResponse(BaseModel):
    """Response for GET /stats/top-cities."""

    top_cities: list[CityCount]
