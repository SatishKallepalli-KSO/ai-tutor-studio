"""AI-assisted tutoring: tracks, mock questions, and feedback."""

from __future__ import annotations

import json
import os
import re
from typing import Literal

from pydantic import BaseModel, Field

TrackId = Literal["staff-interview", "em-interview", "java-to-ai"]


class Track(BaseModel):
    id: TrackId
    title: str
    audience: str
    summary: str
    outcomes: list[str]
    study_plan: list[str]


class TutorQuestion(BaseModel):
    id: str
    track_id: TrackId
    category: str
    prompt: str
    hints: list[str]
    strong_answer_signals: list[str]


class FeedbackRequest(BaseModel):
    track_id: TrackId
    question_id: str
    answer: str = Field(min_length=1, max_length=8000)


class FeedbackResponse(BaseModel):
    score: int = Field(ge=1, le=5)
    summary: str
    strengths: list[str]
    gaps: list[str]
    better_answer: str
    next_drill: str
    provider: str


TRACKS: list[Track] = [
    Track(
        id="staff-interview",
        title="Staff Engineer Interview Prep",
        audience="Senior / Staff IC candidates",
        summary="System design, ownership stories, and production AI depth for Staff loops.",
        outcomes=[
            "Tell Staff-level ownership stories with metrics",
            "Design distributed systems with clear tradeoffs",
            "Explain production AI guardrails (entitlements, audit, evals)",
        ],
        study_plan=[
            "Day 1–2: Rewrite 3 ownership stories (Context → Action → Metric)",
            "Day 3–4: Drill 2 system designs (sync engine, NLQ platform)",
            "Day 5: Mock behavioral + deep dive on one production AI project",
            "Day 6–7: Timed answers + tighten resume bullets to stories",
        ],
    ),
    Track(
        id="em-interview",
        title="Engineering Manager Interview Prep",
        audience="EM / player-coach leaders",
        summary="People leadership, delivery, hiring, and vendor/team-build narratives.",
        outcomes=[
            "Lead with people + delivery ownership, not only IC craft",
            "Run hiring / performance / incident stories cleanly",
            "Show technical credibility without competing for IC tickets",
        ],
        study_plan=[
            "Day 1: Memorize 30–40s EM opener",
            "Day 2–3: Team-from-scratch + vendor-to-in-house STAR cards",
            "Day 4: Hiring loop + performance management scenarios",
            "Day 5–7: Mock HM screen + conflict / prioritization drills",
        ],
    ),
    Track(
        id="java-to-ai",
        title="Java → Production AI Upskilling",
        audience="Java/backend engineers moving into AI",
        summary="Practical path from Spring services to RAG, agents, and safe LLM features.",
        outcomes=[
            "Map Spring concepts to FastAPI / AI service patterns",
            "Explain RAG vs fine-tuning vs prompt-only clearly",
            "Design an entitlement-safe NLQ or document pipeline",
        ],
        study_plan=[
            "Week 1: Python fluency + HTTP/LLM basics",
            "Week 2: RAG building blocks (chunk, embed, retrieve, cite)",
            "Week 3: Agents/tools + guardrails + evals",
            "Week 4: Ship a tiny production-shaped AI feature",
        ],
    ),
]

QUESTIONS: list[TutorQuestion] = [
    TutorQuestion(
        id="staff-ownership",
        track_id="staff-interview",
        category="Behavioral",
        prompt=(
            "Tell me about a system you owned end-to-end. What was hard, what did you decide, "
            "and what measurable outcome did you drive?"
        ),
        hints=[
            "Lead with scope and users",
            "Name 1–2 hard tradeoffs",
            "End with a metric (uptime, latency, manual hours saved)",
        ],
        strong_answer_signals=[
            "owned",
            "tradeoff",
            "metric",
            "production",
            "reliability",
            "customer",
        ],
    ),
    TutorQuestion(
        id="staff-design-sync",
        track_id="staff-interview",
        category="System design",
        prompt=(
            "Design a customer data syncing engine that must move large volumes of data to "
            "destinations reliably. How would you approach batch today and streaming later?"
        ),
        hints=[
            "Separate ingest, transform, deliver, observe",
            "Talk retries, idempotency, backpressure",
            "Call out multi-tenant isolation and failure modes",
        ],
        strong_answer_signals=[
            "idempotent",
            "retry",
            "queue",
            "batch",
            "stream",
            "observability",
            "backpressure",
        ],
    ),
    TutorQuestion(
        id="staff-ai-guardrails",
        track_id="staff-interview",
        category="AI / production",
        prompt=(
            "How would you ship an enterprise natural-language-to-SQL feature safely when "
            "different customers must never see each other's data?"
        ),
        hints=[
            "Entitlements before model call",
            "Fail-closed validation on generated SQL",
            "Audit + rate limits + eval set",
        ],
        strong_answer_signals=[
            "entitlement",
            "guardrail",
            "fail-closed",
            "audit",
            "rate limit",
            "eval",
        ],
    ),
    TutorQuestion(
        id="em-opener",
        track_id="em-interview",
        category="Leadership",
        prompt=(
            "Give your 30–40 second introduction as an Engineering Manager. Include scope, "
            "signature wins, and what you're looking for next."
        ),
        hints=[
            "Lead with people ownership",
            "Mention team size / footprint",
            "One transformation win + one AI/product win",
        ],
        strong_answer_signals=[
            "team",
            "hiring",
            "delivery",
            "coaching",
            "uptime",
            "product",
        ],
    ),
    TutorQuestion(
        id="em-vendor",
        track_id="em-interview",
        category="Transformation",
        prompt=(
            "Describe leading a vendor-to-in-house transition. How did you protect delivery "
            "and uptime while building the team?"
        ),
        hints=[
            "Continuity plan first",
            "Hiring + knowledge transfer",
            "Explicit uptime / customer impact metric",
        ],
        strong_answer_signals=[
            "vendor",
            "in-house",
            "hiring",
            "uptime",
            "knowledge transfer",
            "stakeholder",
        ],
    ),
    TutorQuestion(
        id="em-conflict",
        track_id="em-interview",
        category="People",
        prompt=(
            "Product wants more features; your team is drowning in reliability work. How do "
            "you handle the conflict?"
        ),
        hints=[
            "Reframe to shared outcomes",
            "Bring options with risk",
            "Escalate only with a recommendation",
        ],
        strong_answer_signals=[
            "tradeoff",
            "risk",
            "capacity",
            "roadmap",
            "option",
            "reliability",
        ],
    ),
    TutorQuestion(
        id="java-ai-map",
        track_id="java-to-ai",
        category="Concepts",
        prompt=(
            "You're a Java/Spring engineer. Explain how you would structure a production AI "
            "feature service and what maps from Spring Boot patterns."
        ),
        hints=[
            "Controllers → API routes",
            "Services → orchestration + tools",
            "Observability and config still matter",
        ],
        strong_answer_signals=[
            "spring",
            "api",
            "service",
            "observability",
            "config",
            "timeout",
            "retry",
        ],
    ),
    TutorQuestion(
        id="java-rag",
        track_id="java-to-ai",
        category="RAG",
        prompt=(
            "When would you use RAG instead of fine-tuning, and how would you evaluate whether "
            "retrieval quality is good enough?"
        ),
        hints=[
            "Fresh / private knowledge → RAG",
            "Behavior/style → maybe fine-tune",
            "Eval with golden questions + citation checks",
        ],
        strong_answer_signals=[
            "rag",
            "fine-tune",
            "retrieval",
            "citation",
            "eval",
            "chunk",
        ],
    ),
    TutorQuestion(
        id="java-agents",
        track_id="java-to-ai",
        category="Agents",
        prompt=(
            "Design a simple document extraction agent for messy Excel/PDF inputs. What steps, "
            "tools, and failure handling do you need?"
        ),
        hints=[
            "Ingest → extract → validate → retry → store",
            "Deterministic validation gates",
            "Human review on low confidence",
        ],
        strong_answer_signals=[
            "validate",
            "retry",
            "tool",
            "confidence",
            "pipeline",
            "human",
        ],
    ),
]


def get_track(track_id: TrackId) -> Track | None:
    return next((t for t in TRACKS if t.id == track_id), None)


def questions_for_track(track_id: str) -> list[TutorQuestion]:
    return [q for q in QUESTIONS if q.track_id == track_id]


def get_question(question_id: str) -> TutorQuestion | None:
    return next((q for q in QUESTIONS if q.id == question_id), None)


def _heuristic_feedback(question: TutorQuestion, answer: str) -> FeedbackResponse:
    text = answer.strip()
    lower = text.lower()
    words = re.findall(r"[a-z0-9']+", lower)
    hits = [s for s in question.strong_answer_signals if s in lower]
    score = 2
    if len(words) >= 80:
        score += 1
    if len(hits) >= 2:
        score += 1
    if len(hits) >= 4 or ("%" in text or re.search(r"\d", text)):
        score += 1
    score = max(1, min(5, score))

    strengths: list[str] = []
    gaps: list[str] = []
    if len(words) >= 60:
        strengths.append("Enough detail to sound senior — not a one-liner.")
    else:
        gaps.append(
            "Expand with context, decision, and outcome (aim for ~90–120 seconds spoken)."
        )
    if hits:
        strengths.append(f"Hit key signals: {', '.join(hits[:4])}.")
    else:
        gaps.append(
            f"Weave in concepts like: {', '.join(question.strong_answer_signals[:4])}."
        )
    if re.search(r"\d|%|uptime|million|team", lower):
        strengths.append("Includes concrete scale or metrics — interviewers love this.")
    else:
        gaps.append("Add one hard metric (uptime, txn/day, team size, % improvement).")

    better = (
        "Stronger shape for this prompt:\n"
        "1) Context: who/what system.\n"
        "2) Ownership: what you owned.\n"
        "3) Decision/tradeoff.\n"
        "4) Outcome with metric.\n"
        f"Hint to include: {', '.join(question.hints)}."
    )
    next_drill = question.hints[0] if question.hints else "Practice out loud once, timed."

    return FeedbackResponse(
        score=score,
        summary=(
            f"Rubric score {score}/5 for {question.category.lower()}. "
            "Local heuristic feedback"
            + (
                " — set OPENAI_API_KEY for richer LLM coaching."
                if not os.getenv("OPENAI_API_KEY")
                else "."
            )
        ),
        strengths=strengths or ["You attempted a full answer — good start."],
        gaps=gaps or ["Tighten structure and end on a measurable outcome."],
        better_answer=better,
        next_drill=next_drill,
        provider="local-rubric",
    )


def _openai_feedback(
    question: TutorQuestion, track: Track, answer: str
) -> FeedbackResponse | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
    except ImportError:
        return None

    client = OpenAI(api_key=api_key)
    system = (
        "You are a tough but fair interview coach for Staff engineers and Engineering Managers. "
        "Return concise coaching. Score 1-5. Focus on ownership, metrics, tradeoffs, clarity."
    )
    user = (
        f"Track: {track.title}\n"
        f"Category: {question.category}\n"
        f"Question: {question.prompt}\n"
        f"Candidate answer:\n{answer}\n\n"
        "Respond in JSON with keys: score (int 1-5), summary, strengths (array), "
        "gaps (array), better_answer (string), next_drill (string)."
    )
    try:
        completion = client.chat.completions.create(
            model=os.getenv("OPENAI_TUTOR_MODEL", "gpt-4o-mini"),
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        raw = completion.choices[0].message.content or "{}"
        data = json.loads(raw)
        return FeedbackResponse(
            score=int(data.get("score", 3)),
            summary=str(data.get("summary", "LLM coaching complete.")),
            strengths=list(data.get("strengths") or [])[:4],
            gaps=list(data.get("gaps") or [])[:4],
            better_answer=str(data.get("better_answer", "")),
            next_drill=str(data.get("next_drill", "Practice again out loud.")),
            provider="openai",
        )
    except Exception:
        return None


def generate_feedback(body: FeedbackRequest) -> FeedbackResponse:
    track = get_track(body.track_id)
    question = get_question(body.question_id)
    if not track or not question or question.track_id != body.track_id:
        raise ValueError("Unknown track or question")

    llm = _openai_feedback(question, track, body.answer)
    if llm:
        return llm
    return _heuristic_feedback(question, body.answer)
