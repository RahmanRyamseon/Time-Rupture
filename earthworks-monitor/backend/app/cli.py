"""Admin commands.  Usage: python -m app.cli create-user --email a@b.c --role analyst

The password is read from the EM_PASSWORD environment variable or prompted for, so it
never appears in shell history or the process list.
"""
import argparse
import getpass
import os
import sys

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import new_session
from app.models import ROLES, User
from app.security import MIN_PASSWORD_LENGTH, hash_password


def upsert_user(db: Session, email: str, role: str, password: str, full_name: str = "") -> User:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    email = email.lower()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None:
        user = User(email=email)
        db.add(user)
    user.role = role
    user.full_name = full_name or user.full_name or ""
    user.password_hash = hash_password(password)
    user.is_active = True
    db.commit()
    return user


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("create-user", help="Create a user or reset an existing one")
    create.add_argument("--email", required=True)
    create.add_argument("--role", required=True, choices=ROLES)
    create.add_argument("--name", default="")
    args = parser.parse_args()

    password = os.environ.get("EM_PASSWORD") or getpass.getpass("Password: ")
    with new_session() as db:
        try:
            user = upsert_user(db, args.email, args.role, password, args.name)
        except ValueError as exc:
            sys.exit(str(exc))
    print(f"User {user.email} ({user.role}) is ready")


if __name__ == "__main__":
    main()
