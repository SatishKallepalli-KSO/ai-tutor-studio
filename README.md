# AI Tutor Studio

Local-first **AI-assisted tutoring / upskilling** product.

Sell interview prep and upskilling tracks with:
- curated tracks (Staff IC, EM, Java → AI)
- mock interview questions
- AI or local-rubric feedback
- study plans

Built for Satish Kallepalli as a small-business MVP you can run on your laptop.

## Quick start

### 1) API

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional richer feedback:

```bash
export OPENAI_API_KEY=sk-...
```

Without a key, feedback still works via a local scoring rubric.

### 2) Web

```bash
cd apps/web
npm install
npm run dev
```

Open **http://localhost:5173**

API docs: **http://localhost:8000/docs**

## Product shape

| Track | Who it's for |
|-------|----------------|
| Staff Engineer Interview Prep | Senior/Staff IC loops |
| Engineering Manager Interview Prep | EM / player-coach |
| Java → Production AI Upskilling | Backend engineers moving into AI |

## Monorepo layout

```
apps/api   FastAPI tutoring backend
apps/web   React + Vite coaching UI
```

## Scripts (from repo root)

```bash
npm install
npm run dev          # web
npm run dev:api      # api helper (needs venv activated separately for now)
```
