# Practice Out Loud

**Learn → Practice → Get AI feedback → Get hired**

Built by **Kallepalli Labs** (Satish Kallepalli).

Multi-track oral practice with curriculum (Learn mode), AI coaching, and a jobs board. Staff and EM interview tracks are paths in the catalog — not the whole product.

| | |
|--|--|
| **Live** | https://practiceoutloud.com (`www` → apex) |
| **Fallback** | https://ai-tutor-studio.onrender.com (prefer the brand domain) |
| **Privacy** | https://practiceoutloud.com/privacy |
| **GitHub** | https://github.com/SatishKallepalli-KSO/practice-out-loud |
| **Stack** | `apps/web` (Vite/React) · `apps/api` (FastAPI) · Neon Postgres · OpenAI · Render · Cloudflare DNS |
| **Catalog** | ~120 practice questions across 12 tracks |

Ops docs: [PRODUCTION.md](docs/product/PRODUCTION.md) · [DATABASE.md](docs/product/DATABASE.md) · [DEPLOY-FREE.md](docs/product/DEPLOY-FREE.md) · [GO-LIVE.md](docs/product/GO-LIVE.md)

```bash
./scripts/backup-db.sh --neon   # dump Neon
./scripts/deploy-free.sh        # Render Blueprint helper
./scripts/publish-pages.sh      # GitHub Pages docs mirror
```

> Local clone folders may still be named `ai-tutor-studio`. Product and repo names are **Practice Out Loud** / `practice-out-loud`.

## Product

| Plan | What you get |
|------|----------------|
| **Free** | Learn docs · starter practice tracks · 5 AI feedbacks/day · 2 custom-question AI feedbacks/topic · jobs board |
| **Pro ($19/mo or $149/yr)** | All 12 tracks (incl. Staff/EM & advanced) · unlimited coaching · Stripe (demo upgrade until Stripe is wired) |

Also: Agentic AI & Snowflake video paths · profiles · messaging (secondary).

## Docs & links

- App: https://practiceoutloud.com
- Product docs index: [docs/product/README.md](docs/product/README.md)
- GitHub Pages (static / sales docs): https://satishkallepalli-kso.github.io/practice-out-loud/
- Sales playbook: https://satishkallepalli-kso.github.io/practice-out-loud/product/sales-playbook.html

## Quick start (local)

### API

```bash
cd apps/api && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp ../../.env.example .env
# Optional: OPENAI_API_KEY, DATABASE_URL (Neon). Default DB is local SQLite.
uvicorn app.main:app --reload --port 8000
```

### Web

```bash
cd apps/web && npm install && npm run dev
```

Optional: `VITE_API_BASE=https://practiceoutloud.com` to hit production API from local UI.

## Deploy notes

- Production is a single Docker image (`Dockerfile`): Vite build → FastAPI serves `/static` + `/v1`.
- Blueprint: [`render.yaml`](render.yaml) (Render service may still be named `ai-tutor-studio`).
- Set `APP_URL=https://practiceoutloud.com`, Neon pooled `DATABASE_URL`, `OPENAI_API_KEY`, and `ADMIN_EMAILS` in the Render dashboard.
- Domain: Cloudflare DNS for `practiceoutloud.com` / `www` → Render.

© 2026 Kallepalli Labs. All rights reserved.
