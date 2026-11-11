import logging

import redis
from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import func, select

from app.config import get_settings
from app.deps import SESSION_COOKIE, CurrentUser, DbSession
from app.models import User
from app.schemas import LoginIn, LoginOut, UserOut
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
log = logging.getLogger(__name__)


def _redis() -> redis.Redis:
    return redis.Redis.from_url(get_settings().redis_url, socket_timeout=2)


def _failed_attempts_key(request: Request, email: str) -> str:
    client = request.client.host if request.client else "unknown"
    return f"login-fail:{client}:{email}"


@router.post("/login", response_model=LoginOut)
def login(body: LoginIn, request: Request, response: Response, db: DbSession):
    settings = get_settings()
    email = body.email.lower()
    key = _failed_attempts_key(request, email)

    # Rate limiting fails open: a Redis outage must not lock everyone out.
    try:
        limiter: redis.Redis | None = _redis()
        attempts = int(limiter.get(key) or 0)
    except redis.RedisError:
        log.warning("Redis unavailable; login rate limiting is disabled")
        limiter, attempts = None, 0
    if attempts >= settings.login_max_attempts:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed sign-in attempts. Try again later."
        )

    user = db.scalar(select(User).where(func.lower(User.email) == email))
    valid = verify_password(body.password, user.password_hash if user else None)
    if not valid or user is None or not user.is_active:
        if limiter is not None:
            try:
                limiter.incr(key)
                limiter.expire(key, settings.login_window_seconds)
            except redis.RedisError:
                pass
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    if limiter is not None:
        try:
            limiter.delete(key)
        except redis.RedisError:
            pass
    token = create_access_token(user.id)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.access_token_ttl_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path="/",
    )
    return LoginOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user
