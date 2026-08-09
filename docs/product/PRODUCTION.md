# Production status (live)

**Last updated:** 2026-08-09

## Live URLs

| Surface | URL |
|---------|-----|
| **Production app** | https://ai-tutor-studio.onrender.com |
| Login | https://ai-tutor-studio.onrender.com/login |
| Admin dashboard | https://ai-tutor-studio.onrender.com/admin |
| API docs | https://ai-tutor-studio.onrender.com/docs |
| Health | https://ai-tutor-studio.onrender.com/healthz |
| GitHub Pages (static / docs mirror) | https://satishkallepalli-kso.github.io/ai-tutor-studio/ |

## Stack in production

```
Browser
  → https://ai-tutor-studio.onrender.com  (Render Free Docker web)
      ├── React SPA (/static)
      └── FastAPI (/v1, /healthz)
            ├── Neon Free Postgres (DATABASE_URL, pooled)
            ├── OpenAI gpt-4o-mini (OPENAI_API_KEY) → provider "openai"
            ├── Demo Pro upgrade (ALLOW_DEMO_UPGRADE=true; Stripe not live yet)
            └── ADMIN_EMAILS → /admin
```

| Layer | Choice | Notes |
|-------|--------|--------|
| Compute | Render Free web (`ai-tutor-studio`) | Cold start after ~15 min idle |
| Database | **Neon Free** project `ai-tutor-studio` | Durable; Render free Postgres **deleted** |
| AI coaching | **OpenAI** `gpt-4o-mini` | Falls back to `local-rubric` if key/credits missing |
| Payments | Demo upgrade on | Wire Stripe before charging real money |
| UI motion | Ambient voice/signal field | CSS; respects `prefers-reduced-motion` |

## Verified working

- [x] Register / login / JWT
- [x] Neon persistence (users, profiles, events)
- [x] `POST /v1/tutor/feedback` with `provider: "openai"`
- [x] Staff / EM Pro tracks via demo upgrade
- [x] Admin overview (`ADMIN_EMAILS` + `is_admin`)
- [x] Neon backups: `./scripts/backup-db.sh --neon`

## Operator docs

| Doc | Purpose |
|-----|---------|
| [DEPLOY-FREE.md](./DEPLOY-FREE.md) | Free Render + Neon deploy path |
| [DATABASE.md](./DATABASE.md) | Neon IDs, backup / restore |
| [GO-LIVE.md](./GO-LIVE.md) | Full go-live + Stripe checklist |
| [README.md](./README.md) (product) | Doc index |

## Env vars on Render (do not commit secrets)

Required / set in production today:

- `JWT_SECRET`
- `APP_URL=https://ai-tutor-studio.onrender.com`
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
