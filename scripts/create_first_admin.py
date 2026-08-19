"""One-time bootstrap tool: creates the first admin account.

Run manually once via `python scripts/create_first_admin.py` (or with the
CLI flags below). Not an API endpoint and not wired into the FastAPI app —
registration (POST /register) always forces type=client, and creating an
admin through the app itself would normally require an existing admin, so
this script exists specifically to break that chicken-and-egg problem by
writing the first admin document straight to MongoDB.
"""

import argparse
import asyncio
import getpass
import sys
from pathlib import Path

# Allow `python scripts/create_first_admin.py` to find the `app` package —
# the script's own directory is on sys.path by default, not the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pydantic import ValidationError

from app.core.security import hash_password
from app.database import close_mongo_connection, connect_to_mongo, get_database
from app.models.user import UserModel, UserType
from app.schemas.user import UserCreateByAdmin

USERS_COLLECTION = "users"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create the first admin account.")
    parser.add_argument("--first-name")
    parser.add_argument("--last-name")
    parser.add_argument("--email")
    parser.add_argument("--phone")
    parser.add_argument("--city")
    parser.add_argument("--age", type=int)
    parser.add_argument("--password")
    return parser.parse_args()


def prompt_missing_fields(args: argparse.Namespace) -> dict:
    """Fill in anything not passed as a CLI flag via interactive prompts."""
    fields = {
        "first_name": args.first_name,
        "last_name": args.last_name,
        "email": args.email,
        "phone": args.phone,
        "city": args.city,
        "age": args.age,
    }
    for key in fields:
        while not fields[key]:
            raw = input(f"{key.replace('_', ' ').title()}: ").strip()
            if key == "age":
                if raw.isdigit():
                    fields[key] = int(raw)
                else:
                    print("  Age must be a whole number.")
            elif raw:
                fields[key] = raw

    password = args.password
    while not password:
        password = getpass.getpass("Password: ")
        if password and password != getpass.getpass("Confirm password: "):
            print("  Passwords did not match, try again.")
            password = None

    fields["password"] = password
    return fields


async def create_first_admin(fields: dict) -> None:
    # Validate using the same schema an admin-creation API endpoint would
    # use (name/email/phone/age/password rules), forcing type=ADMIN.
    try:
        admin_data = UserCreateByAdmin(**fields, type=UserType.ADMIN)
    except ValidationError as exc:
        print("Invalid input:")
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            print(f"  - {field}: {error['msg']}")
        sys.exit(1)

    await connect_to_mongo()
    try:
        collection = get_database()[USERS_COLLECTION]

        if await collection.find_one({"email": admin_data.email}):
            print(f"Error: a user with email '{admin_data.email}' already exists.")
            sys.exit(1)

        user = UserModel(
            first_name=admin_data.first_name,
            last_name=admin_data.last_name,
            email=admin_data.email,
            phone=admin_data.phone,
            city=admin_data.city,
            age=admin_data.age,
            type=UserType.ADMIN,
            hashed_password=hash_password(admin_data.password),
            is_deleted=False,
        )
        await collection.insert_one(user.model_dump(by_alias=True))

        print(f"Admin account created successfully: {user.email}")
    finally:
        await close_mongo_connection()


def main() -> None:
    args = parse_args()
    fields = prompt_missing_fields(args)
    asyncio.run(create_first_admin(fields))


if __name__ == "__main__":
    main()
