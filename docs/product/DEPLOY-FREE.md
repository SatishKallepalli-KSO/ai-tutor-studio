# Free live deploy — AI Tutor Studio

**Production today:** https://ai-tutor-studio.onrender.com  
Full status: [PRODUCTION.md](./PRODUCTION.md) · Database: [DATABASE.md](./DATABASE.md)

Current free stack:

- **Compute:** Render Free Docker web
- **Database:** Neon Free Postgres (not Render Postgres — that expires in 30 days)
- **AI:** OpenAI `gpt-4o-mini` (prepaid credits)
- **Pay:** Demo Pro upgrade (`ALLOW_DEMO_UPGRADE=true`) until Stripe

---

## One-click / Blueprint deploy

1. Render account (card on file may be required even for free web).
2. Open:

   **https://render.com/deploy?repo=https://github.com/SatishKallepalli-KSO/ai-tutor-studio**

3. After the web service is up, create a **Neon Free** project and set `DATABASE_URL` to the **pooled** connection string (see [DATABASE.md](./DATABASE.md)).
4. Set env on the web service:

   | Key | Value |
   |-----|--------|
   | `APP_URL` | `https://ai-tutor-studio.onrender.com` |
   | `JWT_SECRET` | long random |
   | `DATABASE_URL` | Neon pooled URL |
   | `OPENAI_API_KEY` | from platform.openai.com (add ~$5 credits) |
   | `OPENAI_TUTOR_MODEL` | `gpt-4o-mini` |
   | `ALLOW_DEMO_UPGRADE` | `true` (until Stripe) |
   | `ADMIN_EMAILS` | your login email |

5. Deploy / restart. Smoke:

```bash
curl -s https://ai-tutor-studio.onrender.com/healthz
curl -s https://ai-tutor-studio.onrender.com/v1/stats/public
```

Practice → coaching should store `provider: "openai"` in `feature_events` (not `local-rubric`).

> Free Render web **spins down** after ~15 minutes idle. First request can take 30–60s.

---

## Free domain options

| Option | Example | Cost |
|--------|---------|------|
| Render subdomain | `ai-tutor-studio.onrender.com` | Free (live now) |
| NxtDev / vexr / is-a.dev | `aitutor.nxtdev.xyz` | Free CNAME |
| Brand domain | `aitutor.studio` | ~$10–15/yr |

Point CNAME → `ai-tutor-studio.onrender.com`, add custom domain in Render, update `APP_URL`.

---

## Infra shape

```
Browser
   │
   ▼
https://ai-tutor-studio.onrender.com   ← free TLS (Render)
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
| Domain | `*.onrender.com` then free CNAME |

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
- [x] Demo Pro upgrade for Staff/EM testing
- [ ] Stripe live + `ALLOW_DEMO_UPGRADE=false`
- [ ] Optional vanity domain CNAME

---

## Why this shape?

| Host | Fit |
|------|-----|
| **Render Free + Neon Free** | Current production — durable DB, $0 compute/DB |
| Render Free Postgres alone | Expires in 30 days — **avoid for production** |
| GitHub Pages | Docs/static only — no durable auth |

**Recommendation:** keep Render web + Neon Free; buy a brand domain when revenue starts.
