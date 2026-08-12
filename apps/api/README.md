# Practice Out Loud — API

FastAPI backend for **https://practiceoutloud.com** (auth, plans, tutor feedback, custom questions + quota, scorecards, jobs, admin).

## Surfaces

| Area | Notes |
|------|--------|
| Tutor | `POST /v1/tutor/feedback` — bank or `custom_prompt`; Content/Clarity/Delivery coaching |
| Custom questions | `/v1/tutor/custom-questions` + `/quota` — free = **2 AI feedbacks per topic**, then Pro |
| Scorecards | `/v1/scorecards` — shareable mock/session snapshots (`/scorecard/:id` in UI) |
| Auth / billing | JWT, Free/Pro, Stripe-ready, demo upgrade |
| Hire | Jobs, profiles, connections, messages |
| Admin | `/v1/admin/overview` when `ADMIN_EMAILS` matches |

## Local

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../../.env.example .env
uvicorn app.main:app --reload --port 8000
```

- Default DB: SQLite under `apps/api/data/`
- Production DB: Neon Postgres via `DATABASE_URL`
- OpenAPI: http://localhost:8000/docs
- Health: http://localhost:8000/healthz

## Production

Same image as the web app — Docker build from repo root; API serves the SPA from `/static`.

See [PRODUCTION.md](../../docs/product/PRODUCTION.md) and [GO-LIVE.md](../../docs/product/GO-LIVE.md).
