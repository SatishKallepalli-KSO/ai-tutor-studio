# Practice Out Loud — API

FastAPI backend for **https://practiceoutloud.com** (auth, plans, tutor feedback, jobs, admin).

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
