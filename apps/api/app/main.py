"""AI Tutor Studio — FastAPI backend."""

from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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

app = FastAPI(
    title="AI Tutor Studio API",
    version="0.1.0",
    description="AI-assisted tutoring for Staff/EM interview prep and Java→AI upskilling",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
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
