"""One-time cleanup: wipes ALL users from the real dev database and reseeds
one clean admin account plus 10 realistic client users, for a tidy
demo/submission state.

DESTRUCTIVE AND NOT IDEMPOTENT - deletes every user in the database this
connects to. Already run once (2026-08-19) and moved here to
scripts/one-off/ afterward, specifically so it's out of the way and won't
run again by accident. Kept only as a record of exactly what was seeded -
do not re-run against a database you care about.

Reuses scripts/create_first_admin.py's own bootstrap function for the admin
account rather than duplicating that logic.
"""

import asyncio
import sys
from pathlib import Path

# Project root (to import the `app` package) and the scripts/ directory
# (to import the sibling create_first_admin.py as a plain module) - paths
# account for this file living in scripts/one-off/, one level deeper than
# create_first_admin.py itself.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from create_first_admin import create_first_admin  # noqa: E402

from app.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.database import close_mongo_connection, connect_to_mongo, get_database  # noqa: E402
from app.models.user import UserModel, UserType  # noqa: E402

USERS_COLLECTION = "users"

# Deliberately never "test" in the name - this must only ever touch the
# real dev database, never the database the pytest suite owns
# (tests/conftest.py points at "fastapi_auth_test_db" instead).
EXPECTED_DATABASE_NAME = "fastapi_auth_db"

ADMIN_FIELDS = {
    "first_name": "Kassem",
    "last_name": "Amin",
    "email": "admin@vaultkeep.com",
    "phone": "+9611223344",
    "city": "Beirut",
    "age": 28,
    "password": "Admin1234",
}

# 10 realistic client users spread across 6 cities and a 22-61 age range,
# so /stats/top-cities and /stats/average-age look meaningful for a demo.
CLIENTS = [
    {
        "first_name": "Layla",
        "last_name": "Haddad",
        "email": "layla.haddad@gmail.com",
        "phone": "+9613456789",
        "city": "Beirut",
        "age": 27,
        "password": "ClientPass123",
    },
    {
        "first_name": "Omar",
        "last_name": "Khalil",
        "email": "omar.khalil@outlook.com",
        "phone": "+9617234567",
        "city": "Tripoli",
        "age": 34,
        "password": "ClientPass123",
    },
    {
        "first_name": "Nour",
        "last_name": "Saad",
        "email": "nour.saad@gmail.com",
        "phone": "+9613987654",
        "city": "Beirut",
        "age": 22,
        "password": "ClientPass123",
    },
    {
        "first_name": "Karim",
        "last_name": "Fares",
        "email": "karim.fares@yahoo.com",
        "phone": "+9611345678",
        "city": "Byblos",
        "age": 45,
        "password": "ClientPass123",
    },
    {
        "first_name": "Maya",
        "last_name": "Abou Chacra",
        "email": "maya.abouchacra@gmail.com",
        "phone": "+9617654321",
        "city": "Sidon",
        "age": 38,
        "password": "ClientPass123",
    },
    {
        "first_name": "Rami",
        "last_name": "Nassar",
        "email": "rami.nassar@hotmail.com",
        "phone": "+9613112233",
        "city": "Tripoli",
        "age": 52,
        "password": "ClientPass123",
    },
    {
        "first_name": "Dina",
        "last_name": "Chami",
        "email": "dina.chami@gmail.com",
        "phone": "+9611998877",
        "city": "Beirut",
        "age": 29,
        "password": "ClientPass123",
    },
    {
        "first_name": "Fadi",
        "last_name": "Rahal",
        "email": "fadi.rahal@outlook.com",
        "phone": "+9618223344",
        "city": "Zahle",
        "age": 61,
        "password": "ClientPass123",
    },
    {
        "first_name": "Sara",
        "last_name": "Younes",
        "email": "sara.younes@gmail.com",
        "phone": "+9613556677",
        "city": "Byblos",
        "age": 41,
        "password": "ClientPass123",
    },
    {
        "first_name": "Tony",
        "last_name": "Aziz",
        "email": "tony.aziz@gmail.com",
        "phone": "+9619887766",
        "city": "Jounieh",
        "age": 58,
        "password": "ClientPass123",
    },
]


async def wipe_all_users() -> None:
    await connect_to_mongo()
    try:
        collection = get_database()[USERS_COLLECTION]
        before = await collection.count_documents({})
        print(f"Users before cleanup: {before}")
        result = await collection.delete_many({})
        print(f"Deleted {result.deleted_count} users.\n")
    finally:
        await close_mongo_connection()


async def seed_clients() -> None:
    await connect_to_mongo()
    try:
        collection = get_database()[USERS_COLLECTION]
        for client in CLIENTS:
            user = UserModel(
                first_name=client["first_name"],
                last_name=client["last_name"],
                email=client["email"],
                phone=client["phone"],
                city=client["city"],
                age=client["age"],
                type=UserType.CLIENT,
                hashed_password=hash_password(client["password"]),
                is_deleted=False,
            )
            await collection.insert_one(user.model_dump(by_alias=True))
            print(f"  Created client: {client['first_name']} {client['last_name']} ({client['city']}, age {client['age']})")

        total = await collection.count_documents({})
        print(f"\nFinal user count: {total}")
    finally:
        await close_mongo_connection()


async def main() -> None:
    if settings.DATABASE_NAME != EXPECTED_DATABASE_NAME:
        print(
            f"Refusing to run: DATABASE_NAME is {settings.DATABASE_NAME!r}, "
            f"expected the real dev database {EXPECTED_DATABASE_NAME!r}."
        )
        sys.exit(1)

    print(f"Target database: {settings.DATABASE_NAME}\n")

    await wipe_all_users()

    print("Creating admin account...")
    await create_first_admin(ADMIN_FIELDS)
    print()

    print("Seeding client users...")
    await seed_clients()


if __name__ == "__main__":
    asyncio.run(main())
