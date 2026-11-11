import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.deps import AnalystUser, DbSession
from app.models import ROLE_ANALYST, User
from app.schemas import UserCreate, UserOut, UserUpdate
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(_: AnalystUser, db: DbSession):
    return db.scalars(select(User).order_by(User.email)).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, _: AnalystUser, db: DbSession):
    email = body.email.lower()
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists")
    user = User(
        email=email,
        full_name=body.full_name,
        role=body.role,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, body: UserUpdate, current: AnalystUser, db: DbSession):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    changes = body.model_dump(exclude_unset=True)
    demoting_self = user.id == current.id and (
        changes.get("is_active") is False or changes.get("role", ROLE_ANALYST) != ROLE_ANALYST
    )
    if demoting_self:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "You cannot deactivate yourself or remove your own analyst role",
        )
    if (password := changes.pop("password", None)) is not None:
        user.password_hash = hash_password(password)
    for field, value in changes.items():
        if value is not None:
            setattr(user, field, value)
    db.commit()
    return user
