"""Register / sign-in with JWT."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import UsageCounter, User
from app.plans import FREE_FEEDBACK_PER_DAY, FREE_PRACTICE_TRACKS, can_practice_track, is_pro

router = APIRouter(prefix="/v1/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-change-me-ai-tutor-studio")
JWT_ALG = "HS256"
JWT_HOURS = int(os.getenv("JWT_HOURS", "168"))  # 7 days


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="", max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    plan: str
    subscription_status: str
    is_pro: bool
    feedback_used_today: int
    feedback_limit_today: int | str
    free_practice_tracks: list[str]


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def create_access_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def feedback_usage(db: Session, user_id: int) -> int:
    today = datetime.now(timezone.utc).date()
    row = (
        db.query(UsageCounter)
        .filter(UsageCounter.user_id == user_id, UsageCounter.day == today)
        .first()
    )
    return row.feedback_count if row else 0


def user_to_out(db: Session, user: User) -> UserOut:
    pro = is_pro(user.plan, user.subscription_status)
    used = feedback_usage(db, user.id)
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        plan="pro" if pro else user.plan if user.plan == "free" else "free",
        subscription_status=user.subscription_status,
        is_pro=pro,
        feedback_used_today=used,
        feedback_limit_today="unlimited" if pro else FREE_FEEDBACK_PER_DAY,
        free_practice_tracks=sorted(FREE_PRACTICE_TRACKS),
    )


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = int(payload["sub"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        ) from exc
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    if not creds or not creds.credentials:
        return None
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        return db.get(User, int(payload["sub"]))
    except Exception:
        return None


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = body.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        name=body.name.strip() or email.split("@")[0],
        plan="free",
        subscription_status="inactive",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=user_to_out(db, user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = body.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=user_to_out(db, user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserOut:
    return user_to_out(db, user)


def assert_can_get_feedback(db: Session, user: User, track_id: str) -> None:
    if not can_practice_track(track_id, user.plan, user.subscription_status):
        raise HTTPException(
            status_code=402,
            detail={
                "code": "track_locked",
                "message": "This track is Pro-only. Upgrade to unlock Staff, EM, and advanced tracks.",
            },
        )
    if is_pro(user.plan, user.subscription_status):
        return
    used = feedback_usage(db, user.id)
    if used >= FREE_FEEDBACK_PER_DAY:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "quota_exceeded",
                "message": f"Free plan includes {FREE_FEEDBACK_PER_DAY} feedback reviews per day. Upgrade to Pro for unlimited coaching.",
            },
        )


def record_feedback_usage(db: Session, user: User) -> None:
    if is_pro(user.plan, user.subscription_status):
        return
    today = datetime.now(timezone.utc).date()
    row = (
        db.query(UsageCounter)
        .filter(UsageCounter.user_id == user.id, UsageCounter.day == today)
        .first()
    )
    if row:
        row.feedback_count += 1
    else:
        db.add(UsageCounter(user_id=user.id, day=today, feedback_count=1))
    db.commit()
