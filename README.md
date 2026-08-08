# AI Tutor Studio

Local-first **AI-assisted tutoring / upskilling** product with **Free + Pro** monetization
(HackerRank-style freemium).

## Product

| Plan | What you get |
|------|----------------|
| **Free** | All Learn docs · practice on HTML, CSS, JavaScript, Python · 5 feedbacks/day |
| **Pro ($19/mo or $149/yr)** | All tracks (Staff, EM, Java→AI, Java, TS, React, Node) · unlimited AI feedback · Stripe billing portal |

Flow: **Register → Learn docs → Practice → AI feedback** (gated by plan).

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

Optional:

```bash
export OPENAI_API_KEY=sk-...
# Stripe (live subscriptions)
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_PRICE_MONTHLY=price_...
export STRIPE_PRICE_YEARLY=price_...
export STRIPE_WEBHOOK_SECRET=whsec_...
export APP_URL=http://localhost:5173
```

Without Stripe keys, **Demo upgrade** on `/pricing` unlocks Pro for local testing.

### 2) Web

```bash
cd apps/web
npm install
npm run dev
```

Open **http://localhost:5173** — Vite proxies `/v1` to the API.

## Auth & billing APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/auth/register` | Create account |
| `POST /v1/auth/login` | Sign in (JWT) |
| `GET /v1/auth/me` | Current user + quota |
| `GET /v1/billing/plans` | Free/Pro catalog |
| `POST /v1/billing/checkout` | Stripe Checkout session |
| `POST /v1/billing/portal` | Stripe Customer Portal |
| `POST /v1/billing/webhook` | Stripe subscription events |
| `POST /v1/billing/demo-upgrade` | Local Pro unlock (no Stripe) |
| `POST /v1/tutor/feedback` | **Requires auth** + plan entitlement |

## Stripe setup (production)

1. Create a Product **AI Tutor Studio Pro** in Stripe.
2. Add monthly + yearly recurring prices; copy Price IDs into env.
3. Webhook endpoint: `https://YOUR_API/v1/billing/webhook`  
   Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Set `APP_URL` to your public frontend URL (success/cancel redirects).
5. Set a strong `JWT_SECRET`.

## Deploy

### Render (recommended for monetization)

Auth + Stripe need a real API. Use the Docker Blueprint (`render.yaml`):

1. Render → New → Blueprint → this repo  
2. Set env vars: `JWT_SECRET`, `APP_URL`, Stripe keys, optional `OPENAI_API_KEY`  
3. Optional: attach a Postgres DB and set `DATABASE_URL` (otherwise SQLite on disk)

### GitHub Pages (static UI only)

Live UI: **https://satishkallepalli-kso.github.io/ai-tutor-studio/**

For signed-in billing against a hosted API, rebuild with:

```bash
VITE_BASE=/ai-tutor-studio/ VITE_API_BASE=https://YOUR-RENDER-URL npm run build
# copy apps/web/dist → docs/
```

## Monorepo layout

```
apps/api   FastAPI — auth, plans, Stripe, tutoring
apps/web   React — Learn / Practice / Pricing / Sign in
docs/      GitHub Pages build output
```
