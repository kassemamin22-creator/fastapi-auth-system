"""Public aggregate-statistics endpoints.

No auth required — these expose only aggregate figures (counts/averages),
never individual user records. Every underlying query still excludes
soft-deleted users, the same as every other listing endpoint in the app
(see the "Public aggregate stats" section of app/services/user_service.py).
"""

from fastapi import APIRouter, Query

from app.schemas.stats import AverageAgeResponse, TopCitiesResponse, UserCountResponse
from app.services.user_service import get_active_user_count, get_average_age, get_top_cities

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/count", response_model=UserCountResponse)
async def get_user_count() -> UserCountResponse:
    """Total number of active (non-deleted) users."""
    return UserCountResponse(total_active_users=await get_active_user_count())


@router.get("/average-age", response_model=AverageAgeResponse)
async def get_users_average_age() -> AverageAgeResponse:
    """Average age of active users.

    Based on UserModel.age — the model captures age directly (no
    date-of-birth field), so this is a straight average of that field
    rather than something derived. average_age is null when there are no
    active users.
    """
    average_age, count = await get_average_age()
    return AverageAgeResponse(average_age=average_age, active_user_count=count)


@router.get("/top-cities", response_model=TopCitiesResponse)
async def get_users_top_cities(
    limit: int = Query(5, ge=1, le=50, description="How many cities to return"),
) -> TopCitiesResponse:
    """Top cities by active-user count, descending. Defaults to top 5."""
    cities = await get_top_cities(limit=limit)
    return TopCitiesResponse(top_cities=cities)
