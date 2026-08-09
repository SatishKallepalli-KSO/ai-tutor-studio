"""AI Tutor Studio — FastAPI backend (+ optional static web UI)."""

from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.admin import router as admin_router, sync_admin_emails
from app.auth import (
    assert_can_get_feedback,
    get_current_user,
    get_optional_user,
    record_feedback_usage,
    router as auth_router,
)
from app.billing import router as billing_router
from app.db import SessionLocal, get_db, init_db
from app.events import record_event, router as events_router
from app.jobs import router as jobs_router
from app.models import User
from app.plans import can_practice_track
from app.profiles import router as profiles_router
from app.stats import router as stats_router
from app.tutor import (
    TRACKS,
    FeedbackRequest,
    FeedbackResponse,
    TutorQuestion,
    Track,
    generate_feedback,
    get_track,
    questions_for_track,
)

load_dotenv()

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(
    title="AI Tutor Studio API",
    version="0.5.0",
    description="Talent studio: learn, practice, hire — profiles, jobs, auth, Stripe, analytics",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(billing_router)
app.include_router(events_router)
app.include_router(admin_router)
app.include_router(stats_router)
app.include_router(jobs_router)
app.include_router(profiles_router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    db = SessionLocal()
    try:
        sync_admin_emails(db)
    finally:
        db.close()


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-tutor-studio-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/v1/tutor/tracks", response_model=list[Track])
def list_tracks() -> list[Track]:
    return TRACKS


@app.get("/v1/tutor/tracks/{track_id}", response_model=Track)
def read_track(track_id: str) -> Track:
    track = get_track(track_id)  # type: ignore[arg-type]
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return track


@app.get("/v1/tutor/tracks/{track_id}/questions", response_model=list[TutorQuestion])
def list_questions(track_id: str) -> list[TutorQuestion]:
    if not get_track(track_id):  # type: ignore[arg-type]
        raise HTTPException(status_code=404, detail="Track not found")
    return questions_for_track(track_id)


@app.get("/v1/tutor/tracks/{track_id}/access")
def track_access(
    track_id: str,
    user: User | None = Depends(get_optional_user),
) -> dict:
    if not get_track(track_id):  # type: ignore[arg-type]
        raise HTTPException(status_code=404, detail="Track not found")
    if user is None:
        return {
            "track_id": track_id,
            "can_learn": True,
            "can_practice": False,
            "requires_auth": True,
            "requires_pro": not can_practice_track(track_id, "free"),
        }
    allowed = can_practice_track(track_id, user.plan, user.subscription_status) or user.plan == "pro"
    return {
        "track_id": track_id,
        "can_learn": True,
        "can_practice": allowed,
        "requires_auth": False,
        "requires_pro": not allowed,
    }


@app.post("/v1/tutor/feedback", response_model=FeedbackResponse)
def tutor_feedback(
    body: FeedbackRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    assert_can_get_feedback(db, user, body.track_id)
    try:
        result = generate_feedback(body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    record_feedback_usage(db, user)
    record_event(
        db,
        event_name="feedback_submit",
        user_id=user.id,
        path="/practice",
        properties={
            "track_id": body.track_id,
            "question_id": body.question_id,
            "input_mode": getattr(body, "input_mode", "text") or "text",
            "score": result.score,
            "provider": result.provider,
        },
    )
    if getattr(body, "input_mode", None) == "voice":
        record_event(
            db,
            event_name="voice_practice",
            user_id=user.id,
            path="/practice",
            properties={"track_id": body.track_id},
        )
    db.commit()
    return result


if STATIC_DIR.exists():
    assets = STATIC_DIR / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/")
    def spa_index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str) -> FileResponse:
        # Don't swallow API routes (mounted above); only unmatched paths hit here
        if full_path.startswith("v1/") or full_path == "healthz":
            raise HTTPException(status_code=404, detail="Not found")
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
