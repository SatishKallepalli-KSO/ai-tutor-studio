# AI Tutor Studio

Built by **Kallepalli Labs** (Satish Kallepalli).

**Learn. Practice. Hire.** — a freemium talent studio for candidates and hiring teams.

## Product

| Audience | What they get |
|----------|----------------|
| **Learners** | Tracks + docs, voice practice, AI coaching, profile, network, chat, job browse |
| **Recruiters** | Job posts, talent browse, connections, messaging, hiring studio |

| Plan | What you get |
|------|----------------|
| **Free** | All Learn docs + video paths · practice HTML/CSS/JS/Python · Java→Python · 5 feedbacks/day · profile/network/jobs |
| **Pro ($19/mo or $149/yr)** | Staff, EM, Java→AI, languages · unlimited AI feedback · Stripe portal |

Also:
- **[/agentic-path](https://satishkallepalli-kso.github.io/ai-tutor-studio/agentic-path)** — Backend → Agentic AI YouTube curriculum
- **[/snowflake-path](https://satishkallepalli-kso.github.io/ai-tutor-studio/snowflake-path)** — Data Engineer → Snowflake + Cortex
- **[/jobs](https://satishkallepalli-kso.github.io/ai-tutor-studio/jobs)** · **[/profile](https://satishkallepalli-kso.github.io/ai-tutor-studio/profile)** · **[/network](https://satishkallepalli-kso.github.io/ai-tutor-studio/network)** · **[/messages](https://satishkallepalli-kso.github.io/ai-tutor-studio/messages)**

## Product documentation

**https://satishkallepalli-kso.github.io/ai-tutor-studio/product/**

Architecture, flows, monetization, API, go-live, sales playbook — updated for the latest Learn · Practice · Hire design.

```bash
./scripts/publish-pages.sh   # republish app; preserves docs/product/
```

## Quick start

### 1) API

```bash
cd apps/api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../../.env.example .env   # set JWT_SECRET at minimum
uvicorn app.main:app --reload --port 8000
```

### 2) Web

```bash
cd apps/web
npm install
npm run dev
```

Open **http://localhost:5173** — Vite proxies `/v1` to the API.

## Key APIs

| Area | Endpoints |
|------|-----------|
| Auth | `/v1/auth/register` · `login` · `me` · `me/persona` |
| Tutor | `/v1/tutor/tracks` · `feedback` |
| Profiles | `/v1/profiles/me` · `/v1/profiles/` · `/v1/profiles/{id}` |
| Jobs | `/v1/jobs` |
| Network | `/v1/connections/` · `/v1/messages/` |
| Billing | `/v1/billing/plans` · `checkout` · `portal` · `webhook` |
| Admin | `/v1/admin/overview` · `/v1/stats/public` |

Full reference: [docs/product/api.html](https://satishkallepalli-kso.github.io/ai-tutor-studio/product/api.html)

## Deploy

- **GitHub Pages:** https://satishkallepalli-kso.github.io/ai-tutor-studio/ (demo fallbacks without API)
- **Render/Docker:** auth, Stripe, OpenAI, Postgres — see [GO-LIVE.md](docs/product/GO-LIVE.md)

## Monorepo

```
apps/api   FastAPI — auth, tutor, jobs, profiles, connections, chat, Stripe
apps/web   React — Learn / Jobs / Network / Chat / Profile / Pricing
docs/      GitHub Pages build + docs/product/ microsite
```

© 2026 Kallepalli Labs. All rights reserved.
