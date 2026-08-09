"""Public, privacy-safe aggregate stats (no emails, no admin flags)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import FeatureEvent, User
from app.tutor import TRACKS

router = APIRouter(prefix="/v1/stats", tags=["stats"])


class PublicStats(BaseModel):
    total_users: int
    feedback_events_last_7d: int
    tracks_count: int
    generated_at: str


@router.get("/public", response_model=PublicStats)
def public_stats(db: Session = Depends(get_db)) -> PublicStats:
    """Safe aggregates for marketing surfaces. No PII."""
    now = datetime.now(timezone.utc)
    since_7 = now - timedelta(days=7)

    total_users = db.query(func.count(User.id)).scalar() or 0
    feedback_7 = (
        db.query(func.count(FeatureEvent.id))
        .filter(
            FeatureEvent.created_at >= since_7,
            FeatureEvent.event_name == "feedback_submit",
        )
        .scalar()
        or 0
    )

    return PublicStats(
        total_users=int(total_users),
        feedback_events_last_7d=int(feedback_7),
        tracks_count=len(TRACKS),
        generated_at=now.isoformat(),
    )
