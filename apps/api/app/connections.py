"""LinkedIn-style connection requests."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Connection, LearnerProfile, User

router = APIRouter(prefix="/v1/connections", tags=["connections"])


class ConnectionCreate(BaseModel):
    addressee_id: int
    note: str = Field(default="", max_length=300)


class ConnectionUpdate(BaseModel):
    status: str = Field(pattern="^(accepted|declined|withdrawn)$")


class ConnectionOut(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: str
    note: str = ""
    created_at: str
    updated_at: str
    direction: str  # incoming | outgoing
    other_user_id: int
    other_name: str
    other_headline: str = ""
    other_persona: str = "learner"


def _headline_for(db: Session, user_id: int) -> str:
    profile = db.get(LearnerProfile, user_id)
    if profile and profile.headline:
        return profile.headline
    if profile and profile.current_role:
        role = profile.current_role
        if profile.current_company:
            return f"{role} at {profile.current_company}"
        return role
    return ""


def _to_out(db: Session, row: Connection, me_id: int) -> ConnectionOut:
    other_id = row.addressee_id if row.requester_id == me_id else row.requester_id
    other = db.get(User, other_id)
    direction = "outgoing" if row.requester_id == me_id else "incoming"
    return ConnectionOut(
        id=row.id,
        requester_id=row.requester_id,
        addressee_id=row.addressee_id,
        status=row.status,
        note=row.note or "",
        created_at=row.created_at.isoformat() if row.created_at else "",
        updated_at=row.updated_at.isoformat() if row.updated_at else "",
        direction=direction,
        other_user_id=other_id,
        other_name=(other.name if other else f"User {other_id}") or f"User {other_id}",
        other_headline=_headline_for(db, other_id),
        other_persona=(getattr(other, "persona", None) or "learner") if other else "learner",
    )


def _pair_filter(a: int, b: int):
    return or_(
        and_(Connection.requester_id == a, Connection.addressee_id == b),
        and_(Connection.requester_id == b, Connection.addressee_id == a),
    )


def are_connected(db: Session, a: int, b: int) -> bool:
    row = (
        db.query(Connection)
        .filter(_pair_filter(a, b), Connection.status == "accepted")
        .first()
    )
    return row is not None


@router.get("/", response_model=list[ConnectionOut])
def list_connections(
    status: str = Query(default="accepted", pattern="^(pending|accepted|declined|all)$"),
    direction: str = Query(default="all", pattern="^(incoming|outgoing|all)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConnectionOut]:
    q = db.query(Connection).filter(
        or_(Connection.requester_id == user.id, Connection.addressee_id == user.id)
    )
    if status != "all":
        q = q.filter(Connection.status == status)
    rows = q.order_by(Connection.updated_at.desc()).all()
    out = [_to_out(db, r, user.id) for r in rows]
    if direction != "all":
        out = [c for c in out if c.direction == direction]
    return out


@router.get("/with/{other_user_id}", response_model=ConnectionOut | None)
def connection_with(
    other_user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConnectionOut | None:
    if other_user_id == user.id:
        return None
    row = db.query(Connection).filter(_pair_filter(user.id, other_user_id)).first()
    if not row:
        return None
    return _to_out(db, row, user.id)


@router.post("/", response_model=ConnectionOut)
def send_request(
    body: ConnectionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConnectionOut:
    if body.addressee_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")
    other = db.get(User, body.addressee_id)
    if not other:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Connection).filter(_pair_filter(user.id, body.addressee_id)).first()
    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=400, detail="Already connected")
        if existing.status == "pending":
            raise HTTPException(status_code=400, detail="Request already pending")
        # Re-open declined/withdrawn as a new pending request from me
        existing.requester_id = user.id
        existing.addressee_id = body.addressee_id
        existing.status = "pending"
        existing.note = (body.note or "").strip()
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return _to_out(db, existing, user.id)

    row = Connection(
        requester_id=user.id,
        addressee_id=body.addressee_id,
        status="pending",
        note=(body.note or "").strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(db, row, user.id)


@router.patch("/{connection_id}", response_model=ConnectionOut)
def update_connection(
    connection_id: int,
    body: ConnectionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConnectionOut:
    row = db.get(Connection, connection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")

    if body.status == "accepted":
        if row.addressee_id != user.id:
            raise HTTPException(status_code=403, detail="Only the recipient can accept")
        if row.status != "pending":
            raise HTTPException(status_code=400, detail="Request is not pending")
        row.status = "accepted"
    elif body.status == "declined":
        if row.addressee_id != user.id:
            raise HTTPException(status_code=403, detail="Only the recipient can decline")
        if row.status != "pending":
            raise HTTPException(status_code=400, detail="Request is not pending")
        row.status = "declined"
    elif body.status == "withdrawn":
        if row.requester_id != user.id:
            raise HTTPException(status_code=403, detail="Only the sender can withdraw")
        if row.status != "pending":
            raise HTTPException(status_code=400, detail="Request is not pending")
        row.status = "withdrawn"
    else:
        raise HTTPException(status_code=400, detail="Invalid status")

    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return _to_out(db, row, user.id)


@router.delete("/{connection_id}")
def remove_connection(
    connection_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    row = db.get(Connection, connection_id)
    if not row:
        raise HTTPException(status_code=404, detail="Connection not found")
    if user.id not in {row.requester_id, row.addressee_id}:
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(row)
    db.commit()
    return {"ok": True}
