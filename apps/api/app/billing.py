"""Stripe Checkout + Customer Portal + webhooks (with local demo upgrade)."""

from __future__ import annotations

import os
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user, user_to_out
from app.db import get_db
from app.models import User
from app.plans import plans_public

router = APIRouter(prefix="/v1/billing", tags=["billing"])

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_MONTHLY = os.getenv("STRIPE_PRICE_MONTHLY", "")
STRIPE_PRICE_YEARLY = os.getenv("STRIPE_PRICE_YEARLY", "")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


class CheckoutRequest(BaseModel):
    interval: str = Field(default="month", pattern="^(month|year)$")


class CheckoutResponse(BaseModel):
    url: str
    mode: str


class PortalResponse(BaseModel):
    url: str


def stripe_configured() -> bool:
    return bool(STRIPE_SECRET_KEY and STRIPE_PRICE_MONTHLY)


@router.get("/plans")
def list_plans() -> dict[str, Any]:
    return {
        "plans": plans_public(),
        "stripe_enabled": stripe_configured(),
        "demo_upgrade_available": not stripe_configured(),
    }


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutResponse:
    if not stripe_configured():
        raise HTTPException(
            status_code=400,
            detail="Stripe is not configured. Use demo upgrade for local testing, or set STRIPE_SECRET_KEY + STRIPE_PRICE_MONTHLY.",
        )

    price_id = STRIPE_PRICE_YEARLY if body.interval == "year" and STRIPE_PRICE_YEARLY else STRIPE_PRICE_MONTHLY
    if not price_id:
        raise HTTPException(status_code=400, detail="Stripe price id missing")

    if not user.stripe_customer_id:
        customer = stripe.Customer.create(email=user.email, name=user.name or user.email)
        user.stripe_customer_id = customer["id"]
        db.commit()

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=user.stripe_customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{APP_URL.rstrip('/')}/?billing=success",
        cancel_url=f"{APP_URL.rstrip('/')}/pricing?billing=cancel",
        client_reference_id=str(user.id),
        metadata={"user_id": str(user.id)},
        allow_promotion_codes=True,
    )
    return CheckoutResponse(url=session["url"], mode="stripe")


@router.post("/portal", response_model=PortalResponse)
def customer_portal(user: User = Depends(get_current_user)) -> PortalResponse:
    if not stripe_configured():
        raise HTTPException(status_code=400, detail="Stripe is not configured")
    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer on this account")
    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{APP_URL.rstrip('/')}/pricing",
    )
    return PortalResponse(url=session["url"])


@router.post("/demo-upgrade")
def demo_upgrade(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Local/dev unlock when Stripe keys are not set — never enable in production with real payments."""
    if stripe_configured() and os.getenv("ALLOW_DEMO_UPGRADE", "").lower() not in {"1", "true", "yes"}:
        raise HTTPException(
            status_code=400,
            detail="Demo upgrade disabled while Stripe is configured",
        )
    user.plan = "pro"
    user.subscription_status = "demo"
    db.commit()
    db.refresh(user)
    return {"ok": True, "user": user_to_out(db, user).model_dump()}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripe not configured")

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        else:
            event = stripe.Event.construct_from(
                __import__("json").loads(payload), stripe.api_key
            )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook error: {exc}") from exc

    etype = event["type"]
    data = event["data"]["object"]

    if etype == "checkout.session.completed":
        user_id = data.get("metadata", {}).get("user_id") or data.get("client_reference_id")
        if user_id:
            user = db.get(User, int(user_id))
            if user:
                user.plan = "pro"
                user.subscription_status = "active"
                if data.get("customer"):
                    user.stripe_customer_id = data["customer"]
                if data.get("subscription"):
                    user.stripe_subscription_id = data["subscription"]
                db.commit()

    elif etype in {"customer.subscription.updated", "customer.subscription.deleted"}:
        sub_id = data.get("id")
        status = data.get("status", "canceled")
        user = db.query(User).filter(User.stripe_subscription_id == sub_id).first()
        if not user and data.get("customer"):
            user = db.query(User).filter(User.stripe_customer_id == data["customer"]).first()
        if user:
            user.stripe_subscription_id = sub_id
            user.subscription_status = status
            user.plan = "pro" if status in {"active", "trialing"} else "free"
            db.commit()

    return {"status": "ok"}
