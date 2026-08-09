# AI Tutor Studio — Go-live runbook

**Audience:** you (founder / operator) launching the product on any cloud with live AI coaching and Stripe payments.

**Outcome:** a public URL where users can register, practice, get AI feedback, upgrade to Pro, and where you can open `/admin` for product metrics.

> **Already live:** https://ai-tutor-studio.onrender.com — Render Free + Neon Free + OpenAI.  
> See **[PRODUCTION.md](PRODUCTION.md)** for current status. Use this runbook for Stripe / domains / rebuilding elsewhere.

---

## 1. What you are deploying

| Piece | Role | Required for go-live? |
|-------|------|------------------------|
| **API** (`apps/api`) | Auth + personas, Free/Pro, Stripe, AI feedback, jobs, profiles, connections, chat, admin metrics | **Yes** |
| **Web** (`apps/web`) | Learn/Practice, Jobs, Profile, Network, Chat, paths, pricing, admin | **Yes** (bundled into API Docker image, or hosted separately) |
| **Postgres** | Persistent users + social + jobs + events (**Neon Free** in production; SQLite OK for local demos only) | **Yes for production** |
| **OpenAI** | Richer coaching feedback (`provider: openai`) | **Yes in production** (rubric fallback if unset) |
| **Stripe** | Real subscriptions | **Yes for monetization** |
| **GitHub Pages** | Optional static marketing/UI mirror | Optional |

**Product positioning:** Learn. Practice. Hire. — learners study/practice; recruiters post jobs and network with talent.

**Recommended production shape:** one Docker web service (API serves built UI from `/static`) + managed Postgres + Stripe + OpenAI.

The repo already ships:

- `Dockerfile` — builds web → copies into API image → `uvicorn` on port 8000
- `render.yaml` — Render Blueprint
- `.env.example` — all secrets

---

## 2. Pre-flight checklist (do this first)

Copy and tick:

- [ ] Domain or public HTTPS URL decided (e.g. `https://app.yourdomain.com`)
- [ ] OpenAI account + API key with billing enabled
- [ ] Stripe account (test mode first, then live)
- [ ] Email list for admins (`ADMIN_EMAILS`)
- [ ] Strong random `JWT_SECRET` (32+ chars)
- [ ] Postgres ready (or accept ephemeral SQLite risk)
- [ ] `ALLOW_DEMO_UPGRADE=false` in production

Generate a secret:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## 3. Environment variables (source of truth)

Set these on the **API / Docker** service:

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `JWT_SECRET` | **Yes** | Long random string |
| `JWT_HOURS` | No | Default `168` (7 days) |
| `APP_URL` | **Yes** | Public app URL, no trailing slash issues OK: `https://app.yourdomain.com` |
| `DATABASE_URL` | Recommended | `postgresql://user:pass@host:5432/dbname` |
| `OPENAI_API_KEY` | Recommended | `sk-...` |
| `OPENAI_TUTOR_MODEL` | No | Default `gpt-4o-mini` (cheap + good) |
| `STRIPE_SECRET_KEY` | For pay | `sk_live_...` (or `sk_test_...` in staging) |
| `STRIPE_PRICE_MONTHLY` | For pay | `price_...` |
| `STRIPE_PRICE_YEARLY` | Recommended | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | For pay | `whsec_...` from Stripe webhook |
| `ALLOW_DEMO_UPGRADE` | **Must be false** live | `false` |
| `ADMIN_EMAILS` | Recommended | `you@company.com,cofounder@company.com` |

### Frontend build vars (only if you split UI from API)

| Variable | When | Notes |
|----------|------|-------|
| `VITE_BASE` | Subpath host (e.g. GitHub Pages) | `/` for root domain; `/ai-tutor-studio/` for Pages |
| `VITE_API_BASE` | UI on different origin than API | Full API origin, e.g. `https://api.yourdomain.com` |

**Docker default:** `VITE_BASE=/` and UI is served by the same API host — set `VITE_API_BASE` empty / omit so browser calls same origin `/v1/...`.

---

## 4. Integrate AI coaching (OpenAI)

### 4.1 Create the key

1. Go to [platform.openai.com](https://platform.openai.com) → API keys → Create.
2. Add a small prepaid balance / billing method.
3. Put the key in `OPENAI_API_KEY`.
4. Optionally set `OPENAI_TUTOR_MODEL=gpt-4o-mini` (cost-efficient) or `gpt-4o` for higher quality.

### 4.2 Behavior

- With key: `POST /v1/tutor/feedback` uses the model for coaching.
- Without key: deterministic **rubric** feedback still works (good for demos; weaker for Pro positioning).
- Voice answers send `input_mode=voice` so delivery tips (fillers, pacing) are included.

### 4.3 Cost control tips

- Start with `gpt-4o-mini`.
- Free plan already caps **5 feedbacks/day**; Pro is unlimited — watch OpenAI usage dashboard the first week.
- Later: add rate limits per IP / user if needed.

### 4.4 Smoke test

```bash
curl -s https://YOUR_HOST/healthz
# register + login, then:
curl -s -X POST https://YOUR_HOST/v1/tutor/feedback \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"track_id":"python","question_id":"<id>","answer":"lists are mutable, tuples are not","input_mode":"text"}'
```

Confirm `provider` in the response shows OpenAI (not only local rubric).

---

## 5. Integrate payments (Stripe)

### 5.1 Create the product

1. Stripe Dashboard → **Products** → Add product: **AI Tutor Studio Pro**.
2. Add two recurring prices:
   - Monthly **$19** → copy Price ID → `STRIPE_PRICE_MONTHLY`
   - Yearly **$149** → copy Price ID → `STRIPE_PRICE_YEARLY`
3. Developers → **API keys** → Secret key → `STRIPE_SECRET_KEY`.

Use **test mode** until checkout + webhook + portal all pass, then switch to live keys.

### 5.2 Webhook (critical)

1. Stripe → Developers → **Webhooks** → Add endpoint.
2. URL: `https://YOUR_HOST/v1/billing/webhook`
3. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy Signing secret → `STRIPE_WEBHOOK_SECRET`.

Without a working webhook, users can pay but may **not** flip to Pro in your DB.

### 5.3 Customer portal

In Stripe → Settings → Billing → Customer portal:

- Allow cancel / update payment method (recommended).
- App calls `POST /v1/billing/portal` and redirects the user.

### 5.4 Redirect URLs

Set `APP_URL` to the public UI origin. The API builds:

- Success: `{APP_URL}/?billing=success`
- Cancel: `{APP_URL}/pricing?billing=cancel`
- Portal return: `{APP_URL}/pricing`

### 5.5 Payment smoke test (test mode)

1. Register a user on the live site.
2. Open `/pricing` → Upgrade (should open Stripe Checkout).
3. Pay with test card `4242 4242 4242 4242`.
4. Confirm webhook delivered (Stripe dashboard → webhook attempts).
5. Refresh app — user shows **Pro**; Staff/EM tracks unlock; feedback unlimited.
6. Open billing portal → cancel → confirm plan returns to Free after webhook.

### 5.6 Go live with Stripe

1. Toggle Stripe to **Live mode**.
2. Create live Product/Prices (or activate live prices).
3. Replace env with `sk_live_...`, live price IDs, new live webhook + `whsec_...`.
4. Redeploy. Keep `ALLOW_DEMO_UPGRADE=false`.

---

## 6. Deploy on any cloud (pick one)

**Free live stack (no paid domain):** see **[DEPLOY-FREE.md](DEPLOY-FREE.md)** — one-click Render Free → `https://ai-tutor-studio.onrender.com`, then optional free CNAME (`aitutor.nxtdev.xyz`).

```bash
./scripts/deploy-free.sh
# or open: https://render.com/deploy?repo=https://github.com/SatishKallepalli-KSO/ai-tutor-studio
```

### Option A — Render (fastest; Blueprint included)

1. Push repo to GitHub (Blueprint reads `render.yaml` from `main`).
2. One-click: https://render.com/deploy?repo=https://github.com/SatishKallepalli-KSO/ai-tutor-studio  
   Or Render → **New** → **Blueprint** → select repo.
3. Free launch: set **Neon** `DATABASE_URL` (prefer over Render free Postgres — 30-day expiry). Blueprint / env: `ALLOW_DEMO_UPGRADE=true`.  
   Production: Neon + OpenAI + `ADMIN_EMAILS`; Stripe when charging. Details: [DATABASE.md](DATABASE.md), [PRODUCTION.md](PRODUCTION.md).
4. Deploy. Health check: `/healthz` → live URL `https://ai-tutor-studio.onrender.com`.
5. Optional custom / free subdomain; update `APP_URL` + Stripe webhook URL.

### Option B — Railway / Fly.io / Google Cloud Run / Azure Container Apps / AWS App Runner

Same Docker image:

```bash
# from repo root
docker build -t ai-tutor-studio .
docker run --rm -p 8000:8000 \
  -e JWT_SECRET=... \
  -e APP_URL=https://YOUR_HOST \
  -e DATABASE_URL=postgresql://... \
  -e OPENAI_API_KEY=sk-... \
  -e STRIPE_SECRET_KEY=sk_... \
  -e STRIPE_PRICE_MONTHLY=price_... \
  -e STRIPE_PRICE_YEARLY=price_... \
  -e STRIPE_WEBHOOK_SECRET=whsec_... \
  -e ALLOW_DEMO_UPGRADE=false \
  -e ADMIN_EMAILS=you@example.com \
  ai-tutor-studio
```

Cloud-specific notes:

| Platform | Tip |
|----------|-----|
| **Cloud Run / App Runner** | Set min instances ≥1 if you need always-warm webhooks; map port 8000; attach Cloud SQL / RDS |
| **Fly.io** | `fly launch` with Dockerfile; use Fly Postgres; set secrets via `fly secrets set` |
| **Railway** | New project from Dockerfile; add Postgres plugin; paste env |
| **Azure Container Apps** | Container + Azure Database for PostgreSQL; ingress external HTTPS |
| **Kubernetes** | Deployment + Service + Ingress + Secret; PVC not needed if Postgres is managed |

### Option C — Split: GitHub Pages UI + cloud API

Use when you want Pages for the shell and API elsewhere:

```bash
cd apps/web
VITE_BASE=/ai-tutor-studio/ \
VITE_API_BASE=https://YOUR-API-HOST \
npm run build
# then publish dist → docs/ via ./scripts/publish-pages.sh (preserve docs/product/)
```

Also set API CORS (already `allow_origins=["*"]`) and `APP_URL` to the Pages URL:

`https://satishkallepalli-kso.github.io/ai-tutor-studio`

**Prefer Option A/B for a sellable product** — same-origin cookies aren’t required (JWT in `localStorage`), but one host is simpler for Stripe redirects and ops.

### Option D — Local Docker smoke before cloud

```bash
docker build -t ai-tutor-studio .
docker run --rm -p 8000:8000 --env-file .env ai-tutor-studio
# open http://localhost:8000
```

---

## 7. Database

| Mode | When | Risk |
|------|------|------|
| **SQLite** (default file under `apps/api/data/`) | Laptop / throwaway demo | Lost on container restart / multi-instance |
| **Postgres** via `DATABASE_URL` | **Production** | Durable users, subscriptions, analytics |

On first boot, `init_db()` creates tables (`users`, `usage_counters`, `feature_events`) and adds `is_admin` if missing.

Connection string formats:

```
postgresql://USER:PASSWORD@HOST:5432/DBNAME
# some hosts give postgres:// — the app normalizes to postgresql://
```

---

## 8. Admin dashboard

1. Set `ADMIN_EMAILS=you@example.com` on the API.
2. Register / sign in with that email (or existing account — flag syncs on login/`/me`).
3. Open `/admin` — registrations, Free/Pro mix, feature usage, recent users.

If you don’t see Admin in the nav, sign out and back in after setting the env var.

---

## 9. Security & production hardening

- [ ] `JWT_SECRET` unique and private
- [ ] `ALLOW_DEMO_UPGRADE=false`
- [ ] Stripe **live** keys only on production; never commit `.env`
- [ ] HTTPS only (all major clouds terminate TLS)
- [ ] Restrict who is in `ADMIN_EMAILS`
- [ ] Rotate Stripe webhook secret if leaked
- [ ] Monitor OpenAI spend + Stripe disputes
- [ ] Back up Postgres (provider snapshots)
- [ ] Optional later: tighten CORS to your real origins, add rate limiting, store JWT more carefully

---

## 10. Launch-day verification (30 minutes)

1. `/healthz` → `ok`
2. Register new user → appears in `/admin`
3. Free practice on Python/HTML works; Staff track locked
4. Submit feedback → AI response; Free quota increments
5. Checkout test/live → webhook → Pro badge
6. Pro unlocks Staff/EM; unlimited feedback
7. Billing portal opens
8. Voice practice (Chrome) → delivery tips present
9. `/agentic-path` loads; mark complete still works
10. `/snowflake-path` loads; mark complete still works (separate localStorage key)
11. `/admin` shows feature events (track opens, feedback, pricing)

---

## 11. Ops cheat sheet

| Task | Action |
|------|--------|
| Redeploy code | Push to main / trigger cloud deploy |
| Change prices | New Stripe Price IDs → update env → redeploy |
| Add admin | Append email to `ADMIN_EMAILS` → redeploy → user re-login |
| Disable AI temporarily | Unset `OPENAI_API_KEY` (falls back to rubric) |
| Pause paid signups | Remove/disable Stripe prices or set maintenance page |
| Inspect DB | Provider SQL console: `users`, `feature_events`, `usage_counters` |

---

## 12. Minimal “sell tomorrow” path

If you need live + paid + AI as fast as possible:

1. Deploy Docker to **Render** with Postgres.  
2. Set `JWT_SECRET`, `APP_URL`, `ADMIN_EMAILS`.  
3. Add **OpenAI** key.  
4. Configure **Stripe test** → webhook → prove Pro upgrade.  
5. Switch Stripe to **live**.  
6. Point a custom domain at the service.  
7. Share `/pricing` and run your first real checkout.

You do **not** need GitHub Pages for monetization — the Docker image already serves the full product.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [Architecture](./architecture.html) | System design |
| [Monetization](./monetization.html) | Free/Pro matrix |
| [API](./api.html) | Endpoint reference |
| [Sales playbook](./sales-playbook.html) | Demo script |
| Repo `README.md` | Local dev + short Stripe notes |
| `.env.example` | Env template |

---

*Last updated for AI Tutor Studio API v0.3 (auth, Stripe, OpenAI, admin analytics).*

---

© 2026 Kallepalli Labs. All rights reserved.
