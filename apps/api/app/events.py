"""Product analytics event ingest."""

from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_optional_user
from app.db import get_db
from app.models import FeatureEvent, User, utcnow

router = APIRouter(prefix="/v1/events", tags=["events"])

ALLOWED_EVENTS = {
    "page_view",
    "track_open",
    "learn_open",
    "topic_open",
    "practice_start",
    "feedback_submit",
    "voice_practice",
    "agentic_path_open",
    "agentic_video_complete",
    "snowflake_path_open",
    "snowflake_video_complete",
    "pricing_view",
    "checkout_start",
    "demo_upgrade",
    "register",
    "login",
}


class EventIn(BaseModel):
    event_name: str = Field(max_length=64)
    path: Optional[str] = Field(default=None, max_length=200)
    properties: Optional[dict[str, Any]] = None


class EventsBatch(BaseModel):
    events: list[EventIn] = Field(min_length=1, max_length=50)


def record_event(
    db: Session,
    *,
    event_name: str,
    user_id: int | None = None,
    path: str | None = None,
    properties: dict[str, Any] | None = None,
) -> None:
    name = event_name.strip()[:64]
    if name not in ALLOWED_EVENTS:
        return
    props = None
    if properties:
        props = json.dumps(properties)[:2000]
    db.add(
        FeatureEvent(
            user_id=user_id,
            event_name=name,
            path=(path or "")[:200] or None,
            properties=props,
            created_at=utcnow(),
        )
    )


@router.post("")
def ingest_events(
    body: EventsBatch,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    accepted = 0
    for item in body.events:
        name = item.event_name.strip()
        if name not in ALLOWED_EVENTS:
            continue
        record_event(
            db,
            event_name=name,
            user_id=user.id if user else None,
            path=item.path,
            properties=item.properties,
        )
        accepted += 1
    db.commit()
    return {"accepted": accepted}
