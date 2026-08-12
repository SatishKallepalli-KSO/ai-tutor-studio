# Production status (live)

**Last updated:** 2026-08-12

## Live URLs

| Surface | URL |
|---------|-----|
| **Production app** | https://practiceoutloud.com |
| Render fallback | https://ai-tutor-studio.onrender.com |
| Privacy | https://practiceoutloud.com/privacy |
| Login | https://practiceoutloud.com/login |
| For companies | https://practiceoutloud.com/for-companies |
| Shareable scorecard | https://practiceoutloud.com/scorecard/:id |
| Admin dashboard | https://practiceoutloud.com/admin |
| Jobs board | https://practiceoutloud.com/jobs |
| API docs | https://practiceoutloud.com/docs |
| Health | https://practiceoutloud.com/healthz |
| GitHub | https://github.com/SatishKallepalli-KSO/practice-out-loud |
| GitHub Pages (static / docs mirror) | https://satishkallepalli-kso.github.io/practice-out-loud/ |

## Stack in production

```
Browser
  → https://practiceoutloud.com  (Cloudflare DNS → Render Free Docker web)
      ├── React SPA (/static)  — Vite/React
      └── FastAPI (/v1, /healthz)
            ├── Neon Free Postgres (DATABASE_URL, pooled)
            ├── OpenAI gpt-4o-mini (OPENAI_API_KEY) → provider "openai"
            ├── Custom questions + per-topic feedback quota
            ├── Shareable scorecards
            ├── Demo Pro upgrade (ALLOW_DEMO_UPGRADE=true; Stripe not live yet)
            └── ADMIN_EMAILS → /admin
```

| Layer | Choice | Notes |
|-------|--------|--------|
| Domain | **practiceoutloud.com** (Cloudflare) | `www` → apex; CNAME → `ai-tutor-studio.onrender.com` |
| Compute | Render Free web (`ai-tutor-studio` service name) | Cold start after ~15 min idle |
| Database | **Neon Free** project `ai-tutor-studio` | Durable; Render free Postgres **deleted** |
| AI coaching | **OpenAI** `gpt-4o-mini` | Falls back to `local-rubric` if key/credits missing |
| Payments | Demo upgrade on | Wire Stripe before charging real money |
| Catalog | ~120 questions · 12 tracks · role packs | Custom bank separate from curated questions |
| UI | Slim Learn + Hire launchpads | Nav: Home · Practice · Your question · Agentic AI |

## Product shape (verified)

- [x] Slim Learn home: hero → doors → collapsed catalog
- [x] Hire launchpad (`/jobs`, `/for-companies`) — For companies / Hiring teams (no “phase 2” naming)
- [x] Nav: Home · Practice (hub/continue) · Your question · Agentic AI
- [x] **Practice your own question** — speak/type → AI feedback; cloud sync when signed in
- [x] Free = **2 custom AI feedbacks per topic**, then Pro; curated bank quota separate (5/day free)
- [x] Feedback dimensions: **Content / Clarity / Delivery**
- [x] Role packs (Staff / EM / AI engineer screen)
- [x] Timed mock loop + end scorecard (free 15-min mock; Pro full packs)
- [x] Weak-spot coach
- [x] Before/after replay in feedback
- [x] Shareable scorecard `/scorecard/:id`
- [x] Agentic path: YouTube watch resume + per-lesson progress; Practice with AI feedback after phases
- [x] Learn progress: **Reviewed** / Mark as reviewed (not auto on click)
- [x] Register / login / JWT · Neon persistence · Jobs · Privacy · Admin
- [x] Neon backups: `./scripts/backup-db.sh --neon`

## Operator docs

| Doc | Purpose |
|-----|---------|
| [DEPLOY-FREE.md](./DEPLOY-FREE.md) | Free Render + Neon deploy path |
| [DATABASE.md](./DATABASE.md) | Neon IDs, backup / restore, custom Q + scorecards |
| [GO-LIVE.md](./GO-LIVE.md) | Full go-live + Stripe checklist |
| [README.md](./README.md) (product) | Doc index |

## Env vars on Render (do not commit secrets)

Required / set in production today:

- `JWT_SECRET`
- `APP_URL=https://practiceoutloud.com`
- `DATABASE_URL` → Neon pooled URL
- `OPENAI_API_KEY` + `OPENAI_TUTOR_MODEL=gpt-4o-mini`
- `ALLOW_DEMO_UPGRADE=true`
- `ADMIN_EMAILS` → founder email(s)

Still optional until monetization:

- `STRIPE_*` → set `ALLOW_DEMO_UPGRADE=false` when live

## OpenAI cost note

`$5` prepaid on `gpt-4o-mini` ≈ thousands of coaching calls. Monitor [usage](https://platform.openai.com/usage). Without credits, feedback silently uses `local-rubric`.

## Admin access

Set `ADMIN_EMAILS` to your login email, register/login once, open `/admin`.  
Do **not** store passwords in git (local file `.admin-credentials.local` is gitignored if used).
