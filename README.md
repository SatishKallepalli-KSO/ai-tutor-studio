# AI Tutor Studio

Built by **Kallepalli Labs** (Satish Kallepalli).

## Customer magnet (what we sell)

**Practice Staff & EM interviews out loud.**  
Free to start — study the path, speak answers, get AI coaching on content and delivery.

Hire / jobs / network exist as **phase 2** (don’t lead with them).

## Product

| Plan | What you get |
|------|----------------|
| **Free** | Learn docs · starter practice · 5 feedbacks/day |
| **Pro ($19/mo or $149/yr)** | Staff, EM, advanced tracks · unlimited coaching · Stripe |

Also: Agentic AI & Snowflake video paths · jobs board · profiles · messaging (secondary).

## Docs & sales

- App: https://satishkallepalli-kso.github.io/ai-tutor-studio/
- Sales playbook: https://satishkallepalli-kso.github.io/ai-tutor-studio/product/sales-playbook.html
- Go-live: [docs/product/GO-LIVE.md](docs/product/GO-LIVE.md)

```bash
./scripts/publish-pages.sh
```

## Quick start

### API

```bash
cd apps/api && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp ../../.env.example .env
uvicorn app.main:app --reload --port 8000
```

### Web

```bash
cd apps/web && npm install && npm run dev
```

© 2026 Kallepalli Labs. All rights reserved.
