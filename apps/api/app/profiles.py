"""LinkedIn-style learner profiles."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_optional_user
from app.db import get_db
from app.models import LearnerProfile, User

router = APIRouter(prefix="/v1/profiles", tags=["profiles"])


class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    start: str = ""
    end: str = ""
    description: str = ""


class EducationItem(BaseModel):
    school: str = ""
    degree: str = ""
    field: str = ""
    start: str = ""
    end: str = ""


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    headline: Optional[str] = Field(default=None, max_length=220)
    location: Optional[str] = Field(default=None, max_length=160)
    about: Optional[str] = Field(default=None, max_length=8000)
    open_to_work: Optional[bool] = None
    current_role: Optional[str] = Field(default=None, max_length=160)
    current_company: Optional[str] = Field(default=None, max_length=160)
    skills: Optional[list[str]] = None
    experience: Optional[list[ExperienceItem]] = None
    education: Optional[list[EducationItem]] = None
    target_roles: Optional[list[str]] = None
    website_url: Optional[str] = Field(default=None, max_length=500)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    visibility: Optional[str] = Field(default=None, pattern="^(public|private)$")


class ProfileOut(BaseModel):
    user_id: int
    name: str
    email: Optional[str] = None
    persona: str = "learner"
    plan: str = "free"
    is_pro: bool = False
    headline: str = ""
    location: str = ""
    about: str = ""
    open_to_work: bool = True
    current_role: str = ""
    current_company: str = ""
    skills: list[str] = []
    experience: list[dict[str, Any]] = []
    education: list[dict[str, Any]] = []
    target_roles: list[str] = []
    website_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    visibility: str = "public"
    is_owner: bool = False
    updated_at: Optional[str] = None


def _parse_json_list(raw: str | None, fallback: list[Any] | None = None) -> list[Any]:
    if not raw:
        return list(fallback or [])
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else list(fallback or [])
    except json.JSONDecodeError:
        return list(fallback or [])


def _dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _get_or_create_profile(db: Session, user: User) -> LearnerProfile:
    row = db.get(LearnerProfile, user.id)
    if row:
        return row
    row = LearnerProfile(user_id=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _to_out(
    user: User,
    profile: LearnerProfile,
    *,
    is_owner: bool,
    include_email: bool,
) -> ProfileOut:
    from app.plans import is_pro

    pro = is_pro(user.plan, user.subscription_status)
    return ProfileOut(
        user_id=user.id,
        name=user.name or user.email.split("@")[0],
        email=user.email if include_email else None,
        persona=getattr(user, "persona", None) or "learner",
        plan="pro" if pro else (user.plan if user.plan == "free" else "free"),
        is_pro=pro,
        headline=profile.headline or "",
        location=profile.location or "",
        about=profile.about or "",
        open_to_work=bool(profile.open_to_work),
        current_role=profile.current_role or "",
        current_company=profile.current_company or "",
        skills=[str(s) for s in _parse_json_list(profile.skills)],
        experience=[dict(x) for x in _parse_json_list(profile.experience) if isinstance(x, dict)],
        education=[dict(x) for x in _parse_json_list(profile.education) if isinstance(x, dict)],
        target_roles=[str(s) for s in _parse_json_list(profile.target_roles)],
        website_url=profile.website_url,
        linkedin_url=profile.linkedin_url,
        visibility=profile.visibility or "public",
        is_owner=is_owner,
        updated_at=profile.updated_at.isoformat() if profile.updated_at else None,
    )


@router.get("/me", response_model=ProfileOut)
def my_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileOut:
    profile = _get_or_create_profile(db, user)
    return _to_out(user, profile, is_owner=True, include_email=True)


@router.patch("/me", response_model=ProfileOut)
def update_my_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileOut:
    profile = _get_or_create_profile(db, user)
    data = body.model_dump(exclude_unset=True)

    if "name" in data and data["name"] is not None:
        user.name = data["name"].strip() or user.name

    for field in (
        "headline",
        "location",
        "about",
        "open_to_work",
        "current_role",
        "current_company",
        "website_url",
        "linkedin_url",
        "visibility",
    ):
        if field in data and data[field] is not None:
            setattr(profile, field, data[field])

    if "skills" in data and data["skills"] is not None:
        profile.skills = _dumps([s.strip() for s in data["skills"] if str(s).strip()][:40])
    if "target_roles" in data and data["target_roles"] is not None:
        profile.target_roles = _dumps(
            [s.strip() for s in data["target_roles"] if str(s).strip()][:20]
        )
    if "experience" in data and data["experience"] is not None:
        profile.experience = _dumps([e.model_dump() for e in body.experience or []][:20])
    if "education" in data and data["education"] is not None:
        profile.education = _dumps([e.model_dump() for e in body.education or []][:12])

    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    db.refresh(profile)
    return _to_out(user, profile, is_owner=True, include_email=True)


@router.get("/{user_id}", response_model=ProfileOut)
def get_profile(
    user_id: int,
    viewer: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> ProfileOut:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = _get_or_create_profile(db, user)
    is_owner = bool(viewer and viewer.id == user.id)
    if profile.visibility == "private" and not is_owner and not getattr(viewer, "is_admin", False):
        raise HTTPException(status_code=404, detail="Profile not found")
    return _to_out(user, profile, is_owner=is_owner, include_email=is_owner)


@router.get("/", response_model=list[ProfileOut])
def list_talent(
    q: str = Query(default=""),
    open_to_work: bool | None = Query(default=None),
    limit: int = Query(default=24, ge=1, le=100),
    viewer: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> list[ProfileOut]:
    """Browse public learner profiles (recruiter-friendly talent list)."""
    rows = (
        db.query(LearnerProfile, User)
        .join(User, User.id == LearnerProfile.user_id)
        .filter(LearnerProfile.visibility == "public")
        .order_by(LearnerProfile.updated_at.desc())
        .limit(limit * 3)
        .all()
    )
    out: list[ProfileOut] = []
    needle = q.strip().lower()
    for profile, user in rows:
        if open_to_work is not None and bool(profile.open_to_work) != open_to_work:
            continue
        if needle:
            blob = " ".join(
                [
                    user.name or "",
                    profile.headline or "",
                    profile.location or "",
                    profile.current_role or "",
                    profile.current_company or "",
                    profile.skills or "",
                    profile.target_roles or "",
                ]
            ).lower()
            if needle not in blob:
                continue
        is_owner = bool(viewer and viewer.id == user.id)
        out.append(_to_out(user, profile, is_owner=is_owner, include_email=False))
        if len(out) >= limit:
            break
    return out
