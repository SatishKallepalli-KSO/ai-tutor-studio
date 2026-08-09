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
