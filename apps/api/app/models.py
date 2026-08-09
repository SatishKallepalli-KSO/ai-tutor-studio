"""ORM models."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120), default="")
    plan: Mapped[str] = mapped_column(String(32), default="free")  # free | pro
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    subscription_status: Mapped[str] = mapped_column(String(40), default="inactive")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    # learner = talent learn/practice · recruiter = hiring teams
    persona: Mapped[str] = mapped_column(String(32), default="learner")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UsageCounter(Base):
    __tablename__ = "usage_counters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    feedback_count: Mapped[int] = mapped_column(Integer, default=0)


class FeatureEvent(Base):
    """Product analytics: page views and feature actions."""

    __tablename__ = "feature_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, index=True, nullable=True)
    event_name: Mapped[str] = mapped_column(String(64), index=True)
    path: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    properties: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class JobPost(Base):
    """Recruiter job listings (LinkedIn-style board)."""

    __tablename__ = "job_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    posted_by_user_id: Mapped[int] = mapped_column(Integer, index=True)
    title: Mapped[str] = mapped_column(String(200))
    company_name: Mapped[str] = mapped_column(String(160))
    location: Mapped[str] = mapped_column(String(160), default="")
    employment_type: Mapped[str] = mapped_column(String(40), default="full-time")
    workplace: Mapped[str] = mapped_column(String(40), default="remote")
    description: Mapped[str] = mapped_column(Text, default="")
    requirements: Mapped[str] = mapped_column(Text, default="")
    salary_range: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    apply_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
