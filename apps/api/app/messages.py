"""Direct messaging between connected users."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.connections import are_connected
from app.db import get_db
from app.models import ChatMessage, LearnerProfile, User

router = APIRouter(prefix="/v1/messages", tags=["messages"])


class MessageCreate(BaseModel):
    recipient_id: int
    body: str = Field(min_length=1, max_length=4000)


class MessageOut(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    body: str
    created_at: str
    read_at: str | None = None
    mine: bool = False


class ThreadOut(BaseModel):
    peer_user_id: int
    peer_name: str
    peer_headline: str = ""
    last_message: str
    last_at: str
    unread_count: int = 0


def _headline_for(db: Session, user_id: int) -> str:
    profile = db.get(LearnerProfile, user_id)
    if profile and profile.headline:
        return profile.headline
    if profile and profile.current_role:
        return profile.current_role
    return ""


def _to_msg(row: ChatMessage, me_id: int) -> MessageOut:
    return MessageOut(
        id=row.id,
        sender_id=row.sender_id,
        recipient_id=row.recipient_id,
        body=row.body,
        created_at=row.created_at.isoformat() if row.created_at else "",
        read_at=row.read_at.isoformat() if row.read_at else None,
        mine=row.sender_id == me_id,
    )


@router.get("/threads", response_model=list[ThreadOut])
def list_threads(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ThreadOut]:
    rows = (
        db.query(ChatMessage)
        .filter(or_(ChatMessage.sender_id == user.id, ChatMessage.recipient_id == user.id))
        .order_by(ChatMessage.created_at.desc())
        .limit(500)
        .all()
    )
    threads: dict[int, ThreadOut] = {}
    for msg in rows:
        peer_id = msg.recipient_id if msg.sender_id == user.id else msg.sender_id
        if peer_id in threads:
            if msg.recipient_id == user.id and msg.read_at is None:
                threads[peer_id].unread_count += 1
            continue
        peer = db.get(User, peer_id)
        unread = 1 if msg.recipient_id == user.id and msg.read_at is None else 0
        threads[peer_id] = ThreadOut(
            peer_user_id=peer_id,
            peer_name=(peer.name if peer else f"User {peer_id}") or f"User {peer_id}",
            peer_headline=_headline_for(db, peer_id),
            last_message=msg.body[:160],
            last_at=msg.created_at.isoformat() if msg.created_at else "",
            unread_count=unread,
        )
    # Fill unread counts properly for threads (recount from DB would be better for scale)
    for peer_id, thread in threads.items():
        if thread.unread_count:
            count = (
                db.query(ChatMessage)
                .filter(
                    ChatMessage.sender_id == peer_id,
                    ChatMessage.recipient_id == user.id,
                    ChatMessage.read_at.is_(None),
                )
                .count()
            )
            thread.unread_count = count
    return sorted(threads.values(), key=lambda t: t.last_at, reverse=True)


@router.get("/with/{peer_user_id}", response_model=list[MessageOut])
def conversation(
    peer_user_id: int,
    limit: int = Query(default=100, ge=1, le=300),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MessageOut]:
    if peer_user_id == user.id:
        raise HTTPException(status_code=400, detail="Invalid peer")
    if not are_connected(db, user.id, peer_user_id):
        raise HTTPException(status_code=403, detail="Connect first to message")

    rows = (
        db.query(ChatMessage)
        .filter(
            or_(
                and_(ChatMessage.sender_id == user.id, ChatMessage.recipient_id == peer_user_id),
                and_(ChatMessage.sender_id == peer_user_id, ChatMessage.recipient_id == user.id),
            )
        )
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    now = datetime.now(timezone.utc)
    changed = False
    for msg in rows:
        if msg.recipient_id == user.id and msg.read_at is None:
            msg.read_at = now
            changed = True
    if changed:
        db.commit()
    return [_to_msg(m, user.id) for m in rows]


@router.post("/", response_model=MessageOut)
def send_message(
    body: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    if body.recipient_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    peer = db.get(User, body.recipient_id)
    if not peer:
        raise HTTPException(status_code=404, detail="User not found")
    if not are_connected(db, user.id, body.recipient_id):
        raise HTTPException(status_code=403, detail="Connect first to message")

    text = body.body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    row = ChatMessage(sender_id=user.id, recipient_id=body.recipient_id, body=text)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_msg(row, user.id)
