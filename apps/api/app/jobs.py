"""LinkedIn-style job board for recruiters."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_optional_user
from app.db import get_db
from app.models import JobPost, User, utcnow

router = APIRouter(prefix="/v1/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    company_name: str = Field(min_length=2, max_length=160)
    location: str = Field(default="", max_length=160)
    employment_type: str = Field(default="full-time", pattern="^(full-time|part-time|contract|internship)$")
    workplace: str = Field(default="remote", pattern="^(remote|hybrid|onsite)$")
    description: str = Field(min_length=20, max_length=8000)
    requirements: str = Field(default="", max_length=4000)
    salary_range: str | None = Field(default=None, max_length=120)
    apply_url: str | None = Field(default=None, max_length=500)


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    company_name: str | None = Field(default=None, min_length=2, max_length=160)
    location: str | None = Field(default=None, max_length=160)
    employment_type: str | None = Field(default=None, pattern="^(full-time|part-time|contract|internship)$")
    workplace: str | None = Field(default=None, pattern="^(remote|hybrid|onsite)$")
    description: str | None = Field(default=None, min_length=20, max_length=8000)
    requirements: str | None = Field(default=None, max_length=4000)
    salary_range: str | None = Field(default=None, max_length=120)
    apply_url: str | None = Field(default=None, max_length=500)
    status: str | None = Field(default=None, pattern="^(open|closed)$")


class JobOut(BaseModel):
    id: int
    title: str
    company_name: str
    location: str
    employment_type: str
    workplace: str
    description: str
    requirements: str
    salary_range: str | None
    apply_url: str | None
    status: str
    posted_by_user_id: int
    poster_name: str | None = None
    created_at: str
    updated_at: str
    is_owner: bool = False


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def job_to_out(job: JobPost, viewer: User | None = None, poster_name: str | None = None) -> JobOut:
    return JobOut(
        id=job.id,
        title=job.title,
        company_name=job.company_name,
        location=job.location or "",
        employment_type=job.employment_type,
        workplace=job.workplace,
        description=job.description,
        requirements=job.requirements or "",
        salary_range=job.salary_range,
        apply_url=job.apply_url,
        status=job.status,
        posted_by_user_id=job.posted_by_user_id,
        poster_name=poster_name,
        created_at=_aware(job.created_at).isoformat(),
        updated_at=_aware(job.updated_at).isoformat(),
        is_owner=bool(viewer and viewer.id == job.posted_by_user_id),
    )


def _assert_can_post(user: User) -> None:
    persona = getattr(user, "persona", "learner") or "learner"
    if persona != "recruiter" and not getattr(user, "is_admin", False):
        raise HTTPException(
            status_code=403,
            detail="Switch to Recruiter / hiring role to post jobs.",
        )


@router.get("", response_model=list[JobOut])
def list_jobs(
    q: str | None = None,
    workplace: str | None = None,
    mine: bool = False,
    status: str = Query(default="open", pattern="^(open|closed|all)$"),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> list[JobOut]:
    query = db.query(JobPost)
    if mine:
        if not user:
            raise HTTPException(status_code=401, detail="Sign in required")
        query = query.filter(JobPost.posted_by_user_id == user.id)
    if status != "all":
        query = query.filter(JobPost.status == status)
    if workplace in {"remote", "hybrid", "onsite"}:
        query = query.filter(JobPost.workplace == workplace)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            (JobPost.title.ilike(like))
            | (JobPost.company_name.ilike(like))
            | (JobPost.location.ilike(like))
            | (JobPost.description.ilike(like))
        )
    rows = query.order_by(JobPost.created_at.desc()).limit(100).all()
    poster_ids = {r.posted_by_user_id for r in rows}
    posters = {
        u.id: u.name
        for u in db.query(User).filter(User.id.in_(poster_ids)).all()
    } if poster_ids else {}
    return [job_to_out(r, user, posters.get(r.posted_by_user_id)) for r in rows]


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: int,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> JobOut:
    job = db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    poster = db.get(User, job.posted_by_user_id)
    return job_to_out(job, user, poster.name if poster else None)


@router.post("", response_model=JobOut)
def create_job(
    body: JobCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobOut:
    _assert_can_post(user)
    now = utcnow()
    job = JobPost(
        posted_by_user_id=user.id,
        title=body.title.strip(),
        company_name=body.company_name.strip(),
        location=(body.location or "").strip(),
        employment_type=body.employment_type,
        workplace=body.workplace,
        description=body.description.strip(),
        requirements=(body.requirements or "").strip(),
        salary_range=(body.salary_range or None),
        apply_url=(body.apply_url or None),
        status="open",
        created_at=now,
        updated_at=now,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_to_out(job, user, user.name)


@router.patch("/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    body: JobUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobOut:
    job = db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.posted_by_user_id != user.id and not getattr(user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not your job post")
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(job, key, value)
    job.updated_at = utcnow()
    db.commit()
    db.refresh(job)
    return job_to_out(job, user, user.name)


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    job = db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.posted_by_user_id != user.id and not getattr(user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not your job post")
    db.delete(job)
    db.commit()
    return {"ok": True}
