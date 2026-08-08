"""Plan entitlements — Free vs Pro (HackerRank-style)."""

from __future__ import annotations

from dataclasses import dataclass

# Free can learn everything (docs = funnel). Practice + feedback gated.
FREE_PRACTICE_TRACKS = frozenset(
    {"html", "css", "javascript", "python", "java-to-python"}
)

FREE_FEEDBACK_PER_DAY = 5

PRO_MONTHLY_PRICE_DISPLAY = "$19"
PRO_YEARLY_PRICE_DISPLAY = "$149"


@dataclass(frozen=True)
class PlanInfo:
    id: str
    name: str
    price_monthly: str
    price_yearly: str
    features: list[str]
    limits: dict[str, str | int]


PLANS: dict[str, PlanInfo] = {
    "free": PlanInfo(
        id="free",
        name="Free",
        price_monthly="$0",
        price_yearly="$0",
        features=[
            "All topic documentation (Learn)",
            "Practice on HTML, CSS, JavaScript, Python",
            "Java → Python transition track",
            f"{FREE_FEEDBACK_PER_DAY} feedback reviews per day",
            "Local rubric coaching",
        ],
        limits={
            "feedback_per_day": FREE_FEEDBACK_PER_DAY,
            "practice_tracks": len(FREE_PRACTICE_TRACKS),
        },
    ),
    "pro": PlanInfo(
        id="pro",
        name="Pro",
        price_monthly=PRO_MONTHLY_PRICE_DISPLAY,
        price_yearly=PRO_YEARLY_PRICE_DISPLAY,
        features=[
            "Everything in Free",
            "All tracks: Staff, EM, Java→AI, Java, TS, React, Node",
            "Unlimited practice + AI feedback",
            "Priority coaching when OpenAI is configured",
            "Billing portal to manage subscription",
        ],
        limits={"feedback_per_day": "unlimited", "practice_tracks": "all"},
    ),
}


def is_pro(plan: str, subscription_status: str | None = None) -> bool:
    """Pro access: plan flag set (Stripe active/trialing/demo)."""
    if plan != "pro":
        return False
    if subscription_status in {"canceled", "unpaid", "incomplete_expired"}:
        return False
    return True


def can_practice_track(track_id: str, plan: str, subscription_status: str | None = None) -> bool:
    if is_pro(plan, subscription_status):
        return True
    return track_id in FREE_PRACTICE_TRACKS


def plans_public() -> list[dict]:
    return [
        {
            "id": p.id,
            "name": p.name,
            "price_monthly": p.price_monthly,
            "price_yearly": p.price_yearly,
            "features": p.features,
            "limits": p.limits,
        }
        for p in PLANS.values()
    ]
