"""AI Tutor Studio — FastAPI backend (+ optional static web UI)."""

from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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
    version="0.1.0",
    description="AI-assisted tutoring for Staff/EM interview prep and Java→AI upskilling",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/v1/tutor/feedback", response_model=FeedbackResponse)
def tutor_feedback(body: FeedbackRequest) -> FeedbackResponse:
    try:
        return generate_feedback(body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


if STATIC_DIR.exists():
    assets = STATIC_DIR / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/")
    def spa_index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str) -> FileResponse:
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
