# Free live deploy — Practice Out Loud

**Production today:** https://practiceoutloud.com  
**Render fallback:** https://ai-tutor-studio.onrender.com  
Full status: [PRODUCTION.md](./PRODUCTION.md) · Database: [DATABASE.md](./DATABASE.md)

Current free stack:

- **Compute:** Render Free Docker web (service name may still be `ai-tutor-studio`)
- **Database:** Neon Free Postgres (not Render Postgres — that expires in 30 days)
- **AI:** OpenAI `gpt-4o-mini` (prepaid credits) — Content / Clarity / Delivery coaching
- **Domain:** Cloudflare → `practiceoutloud.com` / `www`
- **Pay:** Demo Pro upgrade (`ALLOW_DEMO_UPGRADE=true`) until Stripe
- **Product:** Learn + Hire launchpads · Practice your own question (2 custom AI feedbacks/topic free) · role packs / mocks / scorecards

---

## One-click / Blueprint deploy

1. Render account (card on file may be required even for free web).
2. Open:

   **https://render.com/deploy?repo=https://github.com/SatishKallepalli-KSO/practice-out-loud**

3. After the web service is up, create a **Neon Free** project and set `DATABASE_URL` to the **pooled** connection string (see [DATABASE.md](./DATABASE.md)).
4. Set env on the web service:

   | Key | Value |
   |-----|--------|
   | `APP_URL` | `https://practiceoutloud.com` |
   | `JWT_SECRET` | long random |
   | `DATABASE_URL` | Neon pooled URL |
   | `OPENAI_API_KEY` | from platform.openai.com (add ~$5 credits) |
   | `OPENAI_TUTOR_MODEL` | `gpt-4o-mini` |
   | `ALLOW_DEMO_UPGRADE` | `true` (until Stripe) |
   | `ADMIN_EMAILS` | your login email |

5. Deploy / restart. Smoke:

```bash
curl -s https://practiceoutloud.com/healthz
curl -s https://practiceoutloud.com/v1/stats/public
# fallback if domain is down:
curl -s https://ai-tutor-studio.onrender.com/healthz
```

Practice → coaching should store `provider: "openai"` in `feature_events` (not `local-rubric`).

> Free Render web **spins down** after ~15 minutes idle. First request can take 30–60s.

---

## Domain options

| Option | Example | Cost |
|--------|---------|------|
| Brand domain (live) | `practiceoutloud.com` | Cloudflare DNS → Render |
| Render subdomain | `ai-tutor-studio.onrender.com` | Free fallback |
| Free CNAME | e.g. `*.nxtdev.xyz` | Optional alternate |

Point DNS → `ai-tutor-studio.onrender.com`, add custom domain in Render, keep `APP_URL=https://practiceoutloud.com`.

---

## Infra shape

```
Browser
   │
   ▼
https://practiceoutloud.com   ← Cloudflare → Render TLS
   │
   ▼
Docker (Dockerfile)
   ├── React SPA  (/static)
   └── FastAPI    (/v1, /healthz)
         ├── Neon Free Postgres (DATABASE_URL)
         ├── OpenAI gpt-4o-mini
         └── Demo upgrade / Stripe later
```

| Piece | Free choice |
|-------|-------------|
| Compute | Render Free Docker web |
| DB | **[Neon](https://neon.tech) Free** (recommended) |
| AI | OpenAI prepaid (`gpt-4o-mini`) |
| Pay | Demo upgrade now; Stripe when ready |
| Domain | `practiceoutloud.com` (+ `*.onrender.com` fallback) |

Local laptop only: omit `DATABASE_URL` → SQLite under `apps/api/data/`.

---

## CLI helpers

```bash
render login
./scripts/deploy-free.sh
./scripts/backup-db.sh --neon
```

---

## After go-live checklist

- [x] `/healthz` OK on production
- [x] Neon `DATABASE_URL` (Render free Postgres deleted)
- [x] OpenAI key + credits → `provider: openai`
- [x] `ADMIN_EMAILS` + `/admin`
- [x] Demo Pro upgrade for full-track testing
- [x] Brand domain `practiceoutloud.com` (Cloudflare)
- [x] Privacy policy `/privacy`
- [ ] Stripe live + `ALLOW_DEMO_UPGRADE=false`

---

## Why this shape?

| Host | Fit |
|------|-----|
| **Render Free + Neon Free** | Current production — durable DB, $0 compute/DB |
| Render Free Postgres alone | Expires in 30 days — **avoid for production** |
| GitHub Pages | Docs/static only — no durable auth |

**Recommendation:** keep Render web + Neon Free; brand domain is already live.
