# Free live deploy — AI Tutor Studio

Deploy a **real running app** (API + UI in one Docker service) on **Render Free**, with a free product URL.

## One-click deploy (recommended)

1. Open this link (sign in / create a free Render account — no credit card required for free web):

   **https://render.com/deploy?repo=https://github.com/SatishKallepalli-KSO/ai-tutor-studio**

2. Confirm Blueprint → service name **`ai-tutor-studio`**.
3. Optional env (can skip for first launch):
   - `ADMIN_EMAILS` = your email
   - `OPENAI_API_KEY` = if you want richer AI coaching
4. Click **Apply**. Wait 5–10 minutes for the first Docker build.

### Your free live URL

```
https://ai-tutor-studio.onrender.com
```

Smoke checks:

```bash
curl -s https://ai-tutor-studio.onrender.com/healthz
open https://ai-tutor-studio.onrender.com
```

Register → practice → Pro via **Demo upgrade** on `/pricing` (Stripe optional later).

> Free Render web services **spin down** after ~15 minutes idle. First request after sleep can take 30–60s.

---

## Free domain options (relevant names)

| Option | Example | Cost | Notes |
|--------|---------|------|--------|
| **Render subdomain (included)** | `ai-tutor-studio.onrender.com` | Free | Best for launch today |
| **NxtDev** | `aitutor.nxtdev.xyz` | Free | Claim at [nxtdev.xyz](https://www.nxtdev.xyz/) → CNAME to Render |
| **vexr.dev** | `aitutor.vexr.dev` | Free | GitHub login; CNAME to Render |
| **is-a.dev** | `aitutor.is-a.dev` | Free | PR-based; personal/non-commercial |
| **Buy cheap brand domain** | `aitutor.studio` / `practiceloop.app` | ~$10–15/yr | Best long-term; Cloudflare DNS free |

### Point a free custom subdomain at Render

1. Deploy on Render first (get `ai-tutor-studio.onrender.com`).
2. Claim e.g. `aitutor.nxtdev.xyz`.
3. Add **CNAME** → `ai-tutor-studio.onrender.com`
4. In Render → your service → **Custom Domains** → add `aitutor.nxtdev.xyz`
5. Set `APP_URL=https://aitutor.nxtdev.xyz` and redeploy

Suggested names: `aitutor`, `staffpractice`, `emloop`, `practiceloop`.

---

## Proper free infra shape

```
Browser
   │
   ▼
https://ai-tutor-studio.onrender.com   ← free TLS
   │
   ▼
Docker (this repo Dockerfile)
   ├── React SPA  (/static)
   └── FastAPI    (/v1, /healthz)
         │
         ├── Render Free Postgres (DATABASE_URL) — SQLite only as local fallback
         ├── OpenAI (optional)
         └── Stripe (optional; demo upgrade enabled on free Blueprint)
```

| Piece | Free choice |
|-------|-------------|
| Compute | Render Free Docker web |
| DB | Render Free Postgres (30-day free DB) or [Neon](https://neon.tech) free Postgres; SQLite only as local fallback |
| AI | Skip, or OpenAI prepaid |
| Pay | Demo upgrade now; Stripe when ready |
| Domain | `*.onrender.com` then free CNAME |

---

## CLI deploy (after `render login`)

```bash
# one-time
render login

# from repo root — or use Dashboard Blueprint if CLI blueprints differ by plan
open "https://render.com/deploy?repo=https://github.com/SatishKallepalli-KSO/ai-tutor-studio"
```

Generate secrets locally if needed:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## After go-live checklist

- [ ] `/healthz` returns ok
- [ ] Register + login works
- [ ] Staff path → Speak & coach returns feedback
- [ ] `/pricing` → Demo upgrade unlocks Pro (until Stripe)
- [ ] Set `ADMIN_EMAILS` and open `/admin`
- [ ] Confirm `DATABASE_URL` points at Render/Neon Postgres (not SQLite)
- [ ] (Optional) Custom free subdomain CNAME
- [ ] (Optional) Point GitHub Pages at API later with `VITE_API_BASE`

---

## Why not “any” free cloud?

| Host | Fit |
|------|-----|
| **Render Free** | Best match — Blueprint + Docker already in repo |
| Fly.io free | Good; needs `fly launch` + card sometimes |
| Railway trial | Credits, not forever-free |
| Vercel/Netlify | Frontend only — still need an API host |
| GitHub Pages | Static demo only (no durable auth/jobs) |

**Recommendation:** ship on Render Free today → add Neon Postgres → claim `aitutor.nxtdev.xyz` (or buy `aitutor.studio` when revenue starts).
