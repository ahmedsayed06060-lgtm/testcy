"""Create the first administrator without a web registration endpoint."""

import argparse
import asyncio
import getpass

from sqlalchemy import select

from app.database import SessionFactory
from app.models.user import Role, User
from app.security.passwords import hash_password, validate_password


async def create(email: str, full_name: str, password: str) -> None:
    validate_password(password, email)
    async with SessionFactory() as db:
        if await db.scalar(select(User).where(User.email == email.casefold())):
            raise SystemExit("A user with this email already exists")
        db.add(User(email=email.casefold(), full_name=full_name, role=Role.ADMIN,
                    password_hash=hash_password(password)))
        await db.commit()
        print("Administrator created. Mandatory MFA setup is required at first login.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("email")
    parser.add_argument("--name", default="System Administrator")
    args = parser.parse_args()
    asyncio.run(create(args.email, args.name, getpass.getpass("New password: ")))
