# Database cost, expiry & backup

## What happens when Render Free Postgres expires?

Your DB (`ai-tutor-studio-db`) was created **2026-08-09** and **expires 2026-09-08**.

| Stage | What happens |
|-------|----------------|
| **Day 30** | Free DB expires — app **cannot connect** until you upgrade or migrate |
| **+14 days grace** | You can still **upgrade to paid** and keep the data |
| **After grace** | Render **deletes the database and all data permanently** |

Free Render Postgres also has **no managed backups**, 1 GB storage max, and only **one free DB** per workspace.

Email reminders come before expiry and before delete.

---

## Paid Render Postgres (cheapest on Render)

| Plan | Price | Notes |
|------|-------|--------|
| **Basic-256mb** | **~$6/month** + storage (~$0.30/GB-mo) | Cheapest paid Render option; keeps data; enables backups |
| Basic-1gb | ~$19/month | More RAM |
| Free | $0 for 30 days | Expires; no backups |

Upgrade in dashboard: https://dashboard.render.com/d/dpg-d9s1aeijnfac738kde70-a → change instance type.

---

## Cheapest durable option (recommended)

| Option | Cost | Expires? | Backup / restore | Verdict |
|--------|------|----------|------------------|---------|
| **Neon Free** | **$0** | No (permanent free tier) | 6h restore history + 1 manual snapshot | **Best cheap path** |
| Supabase Free | $0 | Pauses after ~7 days idle | Built-in | OK; project pause risk |
| Render Basic-256mb | ~$6/mo | No | Managed backups | Simplest if you stay on Render |
| Neon Launch | pay-as-you-go | No | Longer history | When you outgrow Free |

**Recommendation:** before **2026-09-08**, migrate to **Neon Free** ($0, no expiry) *or* upgrade Render to **Basic-256mb (~$6/mo)** if you want zero migration work.

Neon Free limits (enough for early users): ~0.5 GB storage, 100 CU-hours/mo, scales to zero when idle.

---

## Backup (already set up)

A dump was taken locally:

```bash
./scripts/backup-db.sh
# writes backups/ai-tutor-studio-*.sql.gz and backups/latest.sql.gz
```

- Folder `backups/` is **gitignored** (contains user data).
- External access was opened on the Render DB IP allow list so `pg_dump` works from your machine.
- Restore example:

```bash
gunzip -c backups/latest.sql.gz | psql "$DATABASE_URL"
```

### Move to Neon (when ready)

```bash
neonctl auth
neonctl projects create --name ai-tutor-studio --region aws-us-west-2
neonctl connection-string --project-id <id> --pooled
# set that URL as DATABASE_URL on Render, then:
gunzip -c backups/latest.sql.gz | psql "$NEON_DATABASE_URL"
# redeploy / restart the web service
```
