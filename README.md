# Practice Out Loud

**Learn, practice, get AI feedback**

Built by **Kallepalli Labs** (Satish Kallepalli).

Slim launchpad homes (Learn + Hire), oral practice with AI coaching, and a curated catalog. Flagship: **Practice your own question** — speak or type any panel prompt and get Content / Clarity / Delivery feedback.

| | |
|--|--|
| **Live** | https://practiceoutloud.com (`www` → apex) |
| **Fallback** | https://ai-tutor-studio.onrender.com (prefer the brand domain) |
| **Privacy** | https://practiceoutloud.com/privacy |
| **GitHub** | https://github.com/SatishKallepalli-KSO/practice-out-loud |
| **Stack** | `apps/web` (Vite/React) · `apps/api` (FastAPI) · Neon Postgres · OpenAI · Render · Cloudflare DNS |
| **Catalog** | ~120 practice questions across 12 tracks · role packs · custom questions |

Ops docs: [PRODUCTION.md](docs/product/PRODUCTION.md) · [DATABASE.md](docs/product/DATABASE.md) · [DEPLOY-FREE.md](docs/product/DEPLOY-FREE.md) · [GO-LIVE.md](docs/product/GO-LIVE.md)

```bash
./scripts/backup-db.sh --neon   # dump Neon
./scripts/deploy-free.sh        # Render Blueprint helper
./scripts/publish-pages.sh      # GitHub Pages docs mirror
```

> Local clone folders may still be named `ai-tutor-studio`. Product and repo names are **Practice Out Loud** / `practice-out-loud`.

## Product

**Nav (learner):** Home · Practice (hub / continue) · Your question · Agentic AI · More (jobs, network, etc.)

**Homes:** Slim launchpads — hero → doors → collapsed catalog (Learn home and Hire / For companies).

| Plan | What you get |
|------|----------------|
| **Free** | Learn docs · starter practice · 5 bank AI feedbacks/day · **2 custom AI feedbacks per topic** · 15-min timed mock · jobs board |
| **Pro ($19/mo or $149/yr)** | All 12 tracks · unlimited bank + custom coaching · full role packs & timed mocks · Stripe (demo upgrade until Stripe is wired) |

### High-leverage coaching (shipped)

1. **Role packs** — Staff / EM / AI engineer screen queues with rubric signals  
2. **Timed mock loop** + end scorecard (free 15-min mock; Pro full packs)  
3. **Weak-spot coach** — auto-queued drills from past gaps  
4. **Before/after replay** — compare prior vs latest answer in feedback  
5. **Shareable scorecard** — `/scorecard/:id`

Also: **Practice your own question** (cloud sync when signed in; curated bank is separate) · Agentic AI path (YouTube watch resume + per-lesson progress; Practice with AI feedback after phases; **Reviewed** for learn docs) · Snowflake video path · profiles / messaging (secondary).

Learn progress uses **Reviewed** / **Mark as reviewed** (manual — not auto on click).

## Docs & links

- App: https://practiceoutloud.com
- Product docs index: [docs/product/README.md](docs/product/README.md)
- GitHub Pages (static / sales docs): https://satishkallepalli-kso.github.io/practice-out-loud/
- Sales playbook: https://satishkallepalli-kso.github.io/practice-out-loud/product/sales-playbook.html
- For companies: https://practiceoutloud.com/for-companies

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
