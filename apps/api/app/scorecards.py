"""Shareable mock / session scorecards — short public ids."""

from __future__ import annotations

import json
import secrets
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_optional_user
from app.db import get_db
from app.models import SharedScorecard, User

router = APIRouter(prefix="/v1/scorecards", tags=["scorecards"])


class ScorecardCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: dict[str, Any]


class ScorecardOut(BaseModel):
    id: str
    title: str
    summary: dict[str, Any]
    created_at: str


def _new_id() -> str:
    # ~10 chars url-safe; collisions extremely unlikely
    return secrets.token_urlsafe(8)[:12]


@router.post("", response_model=ScorecardOut)
def create_scorecard(
    body: ScorecardCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
) -> ScorecardOut:
    payload = json.dumps(body.summary, ensure_ascii=False)[:40_000]
    for _ in range(5):
        sid = _new_id()
        if db.get(SharedScorecard, sid):
            continue
        row = SharedScorecard(
            id=sid,
            user_id=user.id if user else None,
            title=body.title.strip()[:200],
            payload=payload,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return ScorecardOut(
            id=row.id,
            title=row.title,
            summary=body.summary,
            created_at=row.created_at.isoformat(),
        )
    raise HTTPException(status_code=500, detail="Could not allocate share id")


@router.get("/{scorecard_id}", response_model=ScorecardOut)
def get_scorecard(scorecard_id: str, db: Session = Depends(get_db)) -> ScorecardOut:
    row = db.get(SharedScorecard, scorecard_id)
    if not row:
        raise HTTPException(status_code=404, detail="Scorecard not found")
    try:
        summary = json.loads(row.payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Corrupt scorecard") from exc
    if not isinstance(summary, dict):
        raise HTTPException(status_code=500, detail="Corrupt scorecard")
    return ScorecardOut(
        id=row.id,
        title=row.title,
        summary=summary,
        created_at=row.created_at.isoformat(),
    )
