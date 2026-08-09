"""AI-assisted tutoring: tracks, mock questions, and feedback."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

from pydantic import BaseModel, Field

CONTENT_PATH = Path(__file__).with_name("content.json")


class Track(BaseModel):
    id: str
    title: str
    audience: str
    summary: str
    outcomes: list[str]
    study_plan: list[str]


class TutorQuestion(BaseModel):
    id: str
    track_id: str
    topic_id: str = ""
    category: str
    prompt: str
    hints: list[str]
    strong_answer_signals: list[str]


class FeedbackRequest(BaseModel):
    track_id: str
    question_id: str
    answer: str = Field(min_length=1, max_length=8000)
    input_mode: str = Field(default="text", pattern="^(text|voice)$")


class FeedbackResponse(BaseModel):
    score: int = Field(ge=1, le=5)
    summary: str
    strengths: list[str]
    gaps: list[str]
    better_answer: str
    next_drill: str
    provider: str
    delivery_tips: list[str] = Field(default_factory=list)
    input_mode: str = "text"


def _load_content() -> tuple[list[Track], list[TutorQuestion]]:
    raw = json.loads(CONTENT_PATH.read_text())
    tracks = [Track.model_validate(item) for item in raw["tracks"]]
    questions = [TutorQuestion.model_validate(item) for item in raw["questions"]]
    return tracks, questions


TRACKS, QUESTIONS = _load_content()


def get_track(track_id: str) -> Track | None:
    return next((t for t in TRACKS if t.id == track_id), None)


def questions_for_track(track_id: str) -> list[TutorQuestion]:
    return [q for q in QUESTIONS if q.track_id == track_id]


def get_question(question_id: str) -> TutorQuestion | None:
    return next((q for q in QUESTIONS if q.id == question_id), None)


FILLERS = (
    "um",
    "uh",
    "like",
    "you know",
    "sort of",
    "kind of",
    "basically",
    "actually",
    "i mean",
)


def _delivery_tips(answer: str) -> list[str]:
    text = answer.strip()
    lower = text.lower()
    words = re.findall(r"[a-z0-9']+", lower)
    tips: list[str] = []

    filler_hits = [f for f in FILLERS if re.search(rf"\b{re.escape(f)}\b", lower)]
    if filler_hits:
        tips.append(
            f"Reduce filler words in spoken answers ({', '.join(filler_hits[:4])}). Pause instead."
        )
    else:
        tips.append("Clean delivery — few filler words. Keep that in live interviews.")

    if len(words) < 70:
        tips.append(
            "Interview answers usually need ~90–120 seconds. Add context → action → outcome."
        )
    elif len(words) > 280:
        tips.append("Trim for clarity — land the metric and stop. Long rambles lose panels.")

    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    if sentences:
        longish = sum(1 for s in sentences if len(s.split()) > 28)
        if longish >= 2:
            tips.append(
                "Break long sentences. Spoken grammar works best in short, clear clauses."
            )

    if not re.search(r"[.!?]", text):
        tips.append(
            "Add natural sentence endings when you speak — it helps grammar and pacing."
        )

    if re.search(r"\b(i did|we did|then i|and then)\b", lower) and not re.search(
        r"\b(so|therefore|as a result|which led|impact|result)\b", lower
    ):
        tips.append(
            "Close with impact: ‘so the result was…’ — interviewers score outcomes."
        )

    return tips[:4]


def _heuristic_feedback(
    question: TutorQuestion, answer: str, input_mode: str = "text"
) -> FeedbackResponse:
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
        gaps.append("Add one concrete example or metric when possible.")

    delivery = _delivery_tips(answer) if input_mode == "voice" else []
    if input_mode == "voice" and delivery:
        # Light score nudge for heavy fillers
        filler_heavy = sum(
            1 for f in FILLERS if len(re.findall(rf"\b{re.escape(f)}\b", lower)) >= 3
        )
        if filler_heavy >= 2:
            score = max(1, score - 1)
            gaps.append("Spoken delivery had repeated fillers — practice a cleaner take.")

    mode_note = (
        " Voice mode: coaching includes spoken grammar and delivery."
        if input_mode == "voice"
        else ""
    )
    better = (
        "Stronger spoken answer shape:\n"
        "1) Open in one clear sentence (no filler).\n"
        "2) Context: who/what system.\n"
        "3) Ownership + decision/tradeoff.\n"
        "4) Outcome with metric — then stop.\n"
        f"Hint to include: {', '.join(question.hints)}."
        if input_mode == "voice"
        else (
            "Stronger shape for this prompt:\n"
            "1) Context: who/what system.\n"
            "2) Ownership: what you owned.\n"
            "3) Decision/tradeoff.\n"
            "4) Outcome with metric.\n"
            f"Hint to include: {', '.join(question.hints)}."
        )
    )
    next_drill = (
        "Record the same answer once more out loud — cut fillers and end on the metric."
        if input_mode == "voice"
        else (question.hints[0] if question.hints else "Practice out loud once, timed.")
    )

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
            + mode_note
        ),
        strengths=strengths or ["You attempted a full answer — good start."],
        gaps=gaps or ["Tighten structure and end on a measurable outcome."],
        better_answer=better,
        next_drill=next_drill,
        provider="local-rubric",
        delivery_tips=delivery,
        input_mode=input_mode,
    )


def _openai_feedback(
    question: TutorQuestion, track: Track, answer: str, input_mode: str = "text"
) -> FeedbackResponse | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
    except ImportError:
        return None

    client = OpenAI(api_key=api_key)
    voice_extra = ""
    if input_mode == "voice":
        voice_extra = (
            " The answer was spoken (speech-to-text). Coach spoken interview delivery: "
            "grammar that sounds natural when spoken, filler words, pacing, clarity, "
            "and a crisp ending. Put delivery notes in delivery_tips."
        )
    system = (
        "You are a tough but fair interview coach for software engineers. "
        "Return concise coaching. Score 1-5. Focus on clarity, correctness, and examples."
        + voice_extra
    )
    if track.id == "staff-interview":
        system += (
            " This is a Staff Engineer loop. Score harshly on: personal ownership (not vague 'we'), "
            "explicit tradeoffs, measurable outcomes, systems thinking, and cross-team influence. "
            "Demand a spoken structure of ~90–120 seconds. next_drill must name the exact gap to retry."
        )
    elif track.id == "em-interview":
        system += (
            " This is an Engineering Manager loop. Score on: people ownership, hiring bar, "
            "performance management, delivery prioritization, and stakeholder options — not IC heroics. "
            "next_drill must tell them what to practice next out loud."
        )
    user = (
        f"Track: {track.title}\n"
        f"Category: {question.category}\n"
        f"Input mode: {input_mode}\n"
        f"Question: {question.prompt}\n"
        f"Candidate answer:\n{answer}\n\n"
        "Respond in JSON with keys: score (int 1-5), summary, strengths (array), "
        "gaps (array), better_answer (string), next_drill (string), "
        "delivery_tips (array of spoken grammar/delivery tips; empty if text mode)."
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
        tips = list(data.get("delivery_tips") or [])[:4]
        if input_mode == "voice" and not tips:
            tips = _delivery_tips(answer)
        return FeedbackResponse(
            score=int(data.get("score", 3)),
            summary=str(data.get("summary", "LLM coaching complete.")),
            strengths=list(data.get("strengths") or [])[:4],
            gaps=list(data.get("gaps") or [])[:4],
            better_answer=str(data.get("better_answer", "")),
            next_drill=str(data.get("next_drill", "Practice again out loud.")),
            provider="openai",
            delivery_tips=tips,
            input_mode=input_mode,
        )
    except Exception:
        return None


def generate_feedback(body: FeedbackRequest) -> FeedbackResponse:
    track = get_track(body.track_id)
    question = get_question(body.question_id)
    if not track or not question or question.track_id != body.track_id:
        raise ValueError("Unknown track or question")

    mode = body.input_mode if body.input_mode in {"text", "voice"} else "text"
    llm = _openai_feedback(question, track, body.answer, mode)
    if llm:
        return llm
    return _heuristic_feedback(question, body.answer, mode)
