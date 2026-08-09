# AI Tutor Studio

Built by **Kallepalli Labs** (Satish Kallepalli).

## Live production

**https://ai-tutor-studio.onrender.com**

| | |
|--|--|
| Stack | Render Free (Docker) · **Neon Free Postgres** · **OpenAI** `gpt-4o-mini` |
| Status | Auth, Staff/EM practice, AI coaching (`provider: openai`), admin `/admin` |
| Payments | Demo Pro upgrade on (Stripe not live yet) |
| Ops docs | [PRODUCTION.md](docs/product/PRODUCTION.md) · [DATABASE.md](docs/product/DATABASE.md) · [DEPLOY-FREE.md](docs/product/DEPLOY-FREE.md) · [GO-LIVE.md](docs/product/GO-LIVE.md) |

```bash
./scripts/backup-db.sh --neon   # dump Neon
./scripts/deploy-free.sh        # Render Blueprint helper
./scripts/publish-pages.sh      # GitHub Pages docs mirror
```

## Customer magnet (what we sell)

**Practice Staff & EM interviews out loud.**  
Free to start — study the path, speak answers, get AI coaching on content and delivery.

Hire / jobs / network exist as **phase 2** (don’t lead with them).

## Product

| Plan | What you get |
|------|----------------|
| **Free** | Learn docs · starter practice · 5 feedbacks/day |
| **Pro ($19/mo or $149/yr)** | Staff, EM, advanced tracks · unlimited coaching · Stripe (demo upgrade until Stripe is wired) |

Also: Agentic AI & Snowflake video paths · jobs board · profiles · messaging (secondary).

## Docs & sales

- Production app: https://ai-tutor-studio.onrender.com
- Pages / sales docs: https://satishkallepalli-kso.github.io/ai-tutor-studio/
- Sales playbook: https://satishkallepalli-kso.github.io/ai-tutor-studio/product/sales-playbook.html
- Production status: [docs/product/PRODUCTION.md](docs/product/PRODUCTION.md)
- Go-live: [docs/product/GO-LIVE.md](docs/product/GO-LIVE.md)

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

© 2026 Kallepalli Labs. All rights reserved.
