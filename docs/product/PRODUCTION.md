# Production status (live)

**Last updated:** 2026-08-10

## Live URLs

| Surface | URL |
|---------|-----|
| **Production app** | https://practiceoutloud.com |
| Render fallback | https://ai-tutor-studio.onrender.com |
| Privacy | https://practiceoutloud.com/privacy |
| Login | https://practiceoutloud.com/login |
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
      ├── React SPA (/static)
      └── FastAPI (/v1, /healthz)
            ├── Neon Free Postgres (DATABASE_URL, pooled)
            ├── OpenAI gpt-4o-mini (OPENAI_API_KEY) → provider "openai"
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
| Catalog | ~120 questions · 12 tracks | Staff/EM are tracks in the catalog |
| UI motion | Ambient voice/signal field | CSS; respects `prefers-reduced-motion` |

## Verified working

- [x] Register / login / JWT
- [x] Neon persistence (users, profiles, events)
- [x] `POST /v1/tutor/feedback` with `provider: "openai"`
- [x] Multi-track oral practice + Pro unlock (incl. Staff / EM) via demo upgrade
- [x] Learn mode / curriculum paths + local path progress
- [x] Jobs board
- [x] Privacy policy at `/privacy`
- [x] Admin overview (`ADMIN_EMAILS` + `is_admin`)
- [x] Neon backups: `./scripts/backup-db.sh --neon`
- [x] Expanded practice catalog (~120 questions across 12 tracks)

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
