"""ORM models."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, UniqueConstraint
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


class LearnerProfile(Base):
    """LinkedIn-style public talent profile."""

    __tablename__ = "learner_profiles"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    headline: Mapped[str] = mapped_column(String(220), default="")
    location: Mapped[str] = mapped_column(String(160), default="")
    about: Mapped[str] = mapped_column(Text, default="")
    open_to_work: Mapped[bool] = mapped_column(Boolean, default=True)
    current_role: Mapped[str] = mapped_column(String(160), default="")
    current_company: Mapped[str] = mapped_column(String(160), default="")
    skills: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[str]
    experience: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[dict]
    education: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[dict]
    target_roles: Mapped[str] = mapped_column(Text, default="[]")  # JSON list[str]
    website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    visibility: Mapped[str] = mapped_column(String(20), default="public")  # public | private
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Connection(Base):
    """LinkedIn-style connection / friend request."""

    __tablename__ = "connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requester_id: Mapped[int] = mapped_column(Integer, index=True)
    addressee_id: Mapped[int] = mapped_column(Integer, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    # pending | accepted | declined | withdrawn
    note: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ChatMessage(Base):
    """Direct message between two connected users."""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sender_id: Mapped[int] = mapped_column(Integer, index=True)
    recipient_id: Mapped[int] = mapped_column(Integer, index=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class CustomQuestion(Base):
    """User-authored practice prompts (per track/topic). Synced when signed in."""

    __tablename__ = "custom_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    client_id: Mapped[str] = mapped_column(String(64), index=True)
    track_id: Mapped[str] = mapped_column(String(64), index=True)
    topic_id: Mapped[str] = mapped_column(String(120), default="")
    prompt: Mapped[str] = mapped_column(Text)
    title: Mapped[str] = mapped_column(String(200), default="")
    saved: Mapped[bool] = mapped_column(Boolean, default=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    last_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CustomQuestionAttempt(Base):
    """Attempts on custom prompts — separate from curriculum bank mastery."""

    __tablename__ = "custom_question_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    custom_question_id: Mapped[int] = mapped_column(Integer, index=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    provider: Mapped[str] = mapped_column(String(40), default="")
    input_mode: Mapped[str] = mapped_column(String(16), default="text")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class CustomFeedbackUsage(Base):
    """Per-user, per-topic count of successful custom-prompt AI feedbacks (freemium gate)."""

    __tablename__ = "custom_feedback_usage"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "track_id", "topic_id", name="uq_custom_feedback_user_track_topic"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    track_id: Mapped[str] = mapped_column(String(64), index=True)
    topic_id: Mapped[str] = mapped_column(String(120), default="", index=True)
    feedback_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
