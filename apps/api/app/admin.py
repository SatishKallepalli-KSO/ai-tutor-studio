"""Product admin metrics dashboard API."""

from __future__ import annotations

import json
import os
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import FeatureEvent, UsageCounter, User
from app.plans import is_pro

router = APIRouter(prefix="/v1/admin", tags=["admin"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not getattr(user, "is_admin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


class CountItem(BaseModel):
    key: str
    count: int
    label: str | None = None


class DayCount(BaseModel):
    day: str
    count: int


class RecentUser(BaseModel):
    id: int
    email: str
    name: str
    plan: str
    is_pro: bool
    is_admin: bool
    created_at: str


class AdminOverview(BaseModel):
    total_users: int
    free_users: int
    pro_users: int
    admin_users: int
    signups_last_7d: int
    signups_last_30d: int
    events_last_7d: int
    feedback_events_last_7d: int
    free_feedback_today: int
    signups_by_day: list[DayCount]
    top_features: list[CountItem]
    top_paths: list[CountItem]
    top_tracks: list[CountItem]
    recent_users: list[RecentUser]


FEATURE_LABELS = {
    "page_view": "Page views",
    "track_open": "Track opens",
    "learn_open": "Learn docs",
    "topic_open": "Topic opens",
    "practice_start": "Practice starts",
    "feedback_submit": "AI feedback submits",
    "voice_practice": "Voice practice",
    "agentic_path_open": "Agentic path opens",
    "agentic_video_complete": "Agentic videos completed",
    "snowflake_path_open": "Snowflake path opens",
    "snowflake_video_complete": "Snowflake videos completed",
    "pricing_view": "Pricing views",
    "checkout_start": "Checkout starts",
    "demo_upgrade": "Demo upgrades",
    "register": "Registrations",
    "login": "Logins",
}


@router.get("/overview", response_model=AdminOverview)
def admin_overview(
    days: int = 14,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminOverview:
    days = max(1, min(days, 90))
    now = datetime.now(timezone.utc)
    since_7 = now - timedelta(days=7)
    since_30 = now - timedelta(days=30)
    since_n = now - timedelta(days=days)
    today = now.date()

    users = db.query(User).all()
    total = len(users)
    free = sum(1 for u in users if not is_pro(u.plan, u.subscription_status))
    pro = total - free
    admins = sum(1 for u in users if getattr(u, "is_admin", False))

    signups_7 = sum(1 for u in users if _aware(u.created_at) >= since_7)
    signups_30 = sum(1 for u in users if _aware(u.created_at) >= since_30)

    events_7 = (
        db.query(func.count(FeatureEvent.id))
        .filter(FeatureEvent.created_at >= since_7)
        .scalar()
        or 0
    )
    feedback_7 = (
        db.query(func.count(FeatureEvent.id))
        .filter(
            FeatureEvent.created_at >= since_7,
            FeatureEvent.event_name == "feedback_submit",
        )
        .scalar()
        or 0
    )
    free_fb_today = (
        db.query(func.coalesce(func.sum(UsageCounter.feedback_count), 0))
        .filter(UsageCounter.day == today)
        .scalar()
        or 0
    )

    # Signups by day
    signup_counter: Counter[str] = Counter()
    for u in users:
        created = _aware(u.created_at)
        if created >= since_n:
            signup_counter[created.date().isoformat()] += 1
    signups_by_day = [
        DayCount(day=(since_n + timedelta(days=i)).date().isoformat(), count=0)
        for i in range(days + 1)
    ]
    for row in signups_by_day:
        row.count = signup_counter.get(row.day, 0)

    # Feature / path / track aggregates
    recent_events = (
        db.query(FeatureEvent).filter(FeatureEvent.created_at >= since_n).all()
    )
    feature_counts: Counter[str] = Counter()
    path_counts: Counter[str] = Counter()
    track_counts: Counter[str] = Counter()
    for ev in recent_events:
        feature_counts[ev.event_name] += 1
        if ev.path:
            path_counts[ev.path] += 1
        if ev.properties:
            try:
                props = json.loads(ev.properties)
                tid = props.get("track_id")
                if tid:
                    track_counts[str(tid)] += 1
            except json.JSONDecodeError:
                pass

    top_features = [
        CountItem(key=k, count=c, label=FEATURE_LABELS.get(k, k))
        for k, c in feature_counts.most_common(15)
    ]
    top_paths = [CountItem(key=k, count=c) for k, c in path_counts.most_common(10)]
    top_tracks = [CountItem(key=k, count=c) for k, c in track_counts.most_common(12)]

    recent = sorted(users, key=lambda u: _aware(u.created_at), reverse=True)[:25]
    recent_users = [
        RecentUser(
            id=u.id,
            email=u.email,
            name=u.name,
            plan="pro" if is_pro(u.plan, u.subscription_status) else "free",
            is_pro=is_pro(u.plan, u.subscription_status),
            is_admin=bool(getattr(u, "is_admin", False)),
            created_at=_aware(u.created_at).isoformat(),
        )
        for u in recent
    ]

    return AdminOverview(
        total_users=total,
        free_users=free,
        pro_users=pro,
        admin_users=admins,
        signups_last_7d=signups_7,
        signups_last_30d=signups_30,
        events_last_7d=int(events_7),
        feedback_events_last_7d=int(feedback_7),
        free_feedback_today=int(free_fb_today),
        signups_by_day=signups_by_day,
        top_features=top_features,
        top_paths=top_paths,
        top_tracks=top_tracks,
        recent_users=recent_users,
    )


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def sync_admin_emails(db: Session) -> int:
    """Promote users listed in ADMIN_EMAILS env (comma-separated)."""
    raw = os.getenv("ADMIN_EMAILS", "").strip()
    if not raw:
        return 0
    emails = {e.strip().lower() for e in raw.split(",") if e.strip()}
    if not emails:
        return 0
    updated = 0
    for user in db.query(User).filter(User.email.in_(emails)).all():
        if not user.is_admin:
            user.is_admin = True
            updated += 1
    if updated:
        db.commit()
    return updated
