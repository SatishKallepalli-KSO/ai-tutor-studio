"""CRUD + sync for user-authored practice questions."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import CustomQuestion, CustomQuestionAttempt, User, utcnow
from app.tutor import get_track

router = APIRouter(prefix="/v1/tutor/custom-questions", tags=["custom-questions"])

MAX_PER_USER = 200


class CustomQuestionIn(BaseModel):
    client_id: str = Field(min_length=8, max_length=64)
    track_id: str = Field(min_length=1, max_length=64)
    topic_id: str = Field(default="", max_length=120)
    prompt: str = Field(min_length=8, max_length=2000)
    title: str = Field(default="", max_length=200)
    saved: bool = False


class CustomQuestionPatch(BaseModel):
    prompt: Optional[str] = Field(default=None, min_length=8, max_length=2000)
    title: Optional[str] = Field(default=None, max_length=200)
    saved: Optional[bool] = None
    topic_id: Optional[str] = Field(default=None, max_length=120)
    last_used_at: Optional[datetime] = None


class CustomQuestionOut(BaseModel):
    id: int
    client_id: str
    track_id: str
    topic_id: str
    prompt: str
    title: str
    saved: bool
    attempt_count: int
    last_score: int | None
    last_used_at: datetime
    created_at: datetime
    updated_at: datetime


class CustomAttemptIn(BaseModel):
    client_id: str = Field(min_length=8, max_length=64)
    track_id: str = Field(min_length=1, max_length=64)
    topic_id: str = Field(default="", max_length=120)
    prompt: str = Field(min_length=8, max_length=2000)
    title: str = Field(default="", max_length=200)
    score: int = Field(ge=1, le=5)
    provider: str = Field(default="", max_length=40)
    input_mode: str = Field(default="text", pattern="^(text|voice)$")


def _to_out(row: CustomQuestion) -> CustomQuestionOut:
    return CustomQuestionOut(
        id=row.id,
        client_id=row.client_id,
        track_id=row.track_id,
        topic_id=row.topic_id or "",
        prompt=row.prompt,
        title=row.title or "",
        saved=bool(row.saved),
        attempt_count=int(row.attempt_count or 0),
        last_score=row.last_score,
        last_used_at=row.last_used_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _require_track(track_id: str) -> None:
    if not get_track(track_id):
        raise HTTPException(status_code=404, detail="Track not found")


@router.get("", response_model=list[CustomQuestionOut])
def list_custom_questions(
    track_id: str | None = Query(default=None),
    topic_id: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CustomQuestionOut]:
    q = db.query(CustomQuestion).filter(CustomQuestion.user_id == user.id)
    if track_id:
        q = q.filter(CustomQuestion.track_id == track_id)
    if topic_id is not None and topic_id != "":
        q = q.filter(CustomQuestion.topic_id == topic_id)
    rows = q.order_by(CustomQuestion.last_used_at.desc()).limit(MAX_PER_USER).all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=CustomQuestionOut)
def upsert_custom_question(
    body: CustomQuestionIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CustomQuestionOut:
    _require_track(body.track_id)
    prompt = body.prompt.strip()
    if len(prompt) < 8:
        raise HTTPException(status_code=400, detail="Prompt is too short")

    row = (
        db.query(CustomQuestion)
        .filter(
            CustomQuestion.user_id == user.id,
            CustomQuestion.client_id == body.client_id,
        )
        .first()
    )
    now = utcnow()
    if row:
        row.track_id = body.track_id
        row.topic_id = body.topic_id or ""
        row.prompt = prompt
        row.title = (body.title or "").strip()[:200]
        row.saved = body.saved
        row.last_used_at = now
        row.updated_at = now
    else:
        count = (
            db.query(CustomQuestion)
            .filter(CustomQuestion.user_id == user.id)
            .count()
        )
        if count >= MAX_PER_USER:
            # Drop oldest unsaved recent to make room
            oldest = (
                db.query(CustomQuestion)
                .filter(
                    CustomQuestion.user_id == user.id,
                    CustomQuestion.saved.is_(False),
                )
                .order_by(CustomQuestion.last_used_at.asc())
                .first()
            )
            if oldest:
                db.delete(oldest)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Custom question limit reached. Delete or unsaved some first.",
                )
        row = CustomQuestion(
            user_id=user.id,
            client_id=body.client_id,
            track_id=body.track_id,
            topic_id=body.topic_id or "",
            prompt=prompt,
            title=(body.title or "").strip()[:200],
            saved=body.saved,
            last_used_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.patch("/{client_id}", response_model=CustomQuestionOut)
def patch_custom_question(
    client_id: str,
    body: CustomQuestionPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CustomQuestionOut:
    row = (
        db.query(CustomQuestion)
        .filter(
            CustomQuestion.user_id == user.id,
            CustomQuestion.client_id == client_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Custom question not found")
    if body.prompt is not None:
        row.prompt = body.prompt.strip()
    if body.title is not None:
        row.title = body.title.strip()[:200]
    if body.saved is not None:
        row.saved = body.saved
    if body.topic_id is not None:
        row.topic_id = body.topic_id
    if body.last_used_at is not None:
        row.last_used_at = body.last_used_at
    row.updated_at = utcnow()
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{client_id}")
def delete_custom_question(
    client_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    row = (
        db.query(CustomQuestion)
        .filter(
            CustomQuestion.user_id == user.id,
            CustomQuestion.client_id == client_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Custom question not found")
    db.query(CustomQuestionAttempt).filter(
        CustomQuestionAttempt.custom_question_id == row.id
    ).delete(synchronize_session=False)
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/attempt", response_model=CustomQuestionOut)
def record_custom_attempt(
    body: CustomAttemptIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CustomQuestionOut:
    """Upsert the custom question and record an attempt (does not touch bank mastery)."""
    _require_track(body.track_id)
    now = utcnow()
    row = (
        db.query(CustomQuestion)
        .filter(
            CustomQuestion.user_id == user.id,
            CustomQuestion.client_id == body.client_id,
        )
        .first()
    )
    if not row:
        row = CustomQuestion(
            user_id=user.id,
            client_id=body.client_id,
            track_id=body.track_id,
            topic_id=body.topic_id or "",
            prompt=body.prompt.strip(),
            title=(body.title or "").strip()[:200],
            saved=False,
            attempt_count=0,
            last_used_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
        db.flush()
    else:
        row.prompt = body.prompt.strip()
        if body.title:
            row.title = body.title.strip()[:200]
        if body.topic_id:
            row.topic_id = body.topic_id
        row.updated_at = now

    row.attempt_count = int(row.attempt_count or 0) + 1
    row.last_score = body.score
    row.last_used_at = now
    db.add(
        CustomQuestionAttempt(
            user_id=user.id,
            custom_question_id=row.id,
            score=body.score,
            provider=(body.provider or "")[:40],
            input_mode=body.input_mode,
            created_at=now,
        )
    )
    db.commit()
    db.refresh(row)
    return _to_out(row)
