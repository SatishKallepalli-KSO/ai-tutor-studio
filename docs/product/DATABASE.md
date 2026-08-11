# Database — Neon Free (active)

Live app **https://practiceoutloud.com** (fallback https://ai-tutor-studio.onrender.com) uses **Neon Free Postgres**.

| | |
|--|--|
| Neon project | `ai-tutor-studio` (`steep-sunset-42393062`) |
| Region | `aws-us-west-2` |
| Database / role | `aitutor` |
| Plan | Free ($0, no 30-day expiry) |
| App `DATABASE_URL` | Neon **pooled** connection (set on Render) |
| Snapshot | `post-migration-20260809` |

Neon Free includes ~0.5 GB storage, 100 CU-hours/mo, scale-to-zero when idle, 6h restore history, and **1 manual snapshot**.

## Schema notes (custom questions)

On API startup, SQLAlchemy `create_all` ensures these tables exist (no separate migration runner):

| Table | Purpose |
|--|--|
| `custom_questions` | Per-user prompts (`client_id` for local↔cloud sync), track/topic scope, saved flag, attempt counters |
| `custom_question_attempts` | Attempt history for custom prompts (separate from bank/curriculum mastery) |

Env: same as the rest of the app — set Neon pooled `DATABASE_URL` on Render (see `.env.example`). Local default remains SQLite under `apps/api/data/tutor.db`.

See also: [PRODUCTION.md](./PRODUCTION.md) · [DEPLOY-FREE.md](./DEPLOY-FREE.md)

---

## Old Render Free Postgres

**Deleted** (2026-08-09). App runs only on Neon Free now.

---

## Backups

```bash
# Dump from Neon (recommended now)
./scripts/backup-db.sh --neon

# Or dump whatever DATABASE_URL points at
DATABASE_URL="$(neonctl connection-string --project-id steep-sunset-42393062 --database-name aitutor --role-name aitutor)" \
  ./scripts/backup-db.sh --url
```

Local dumps land in `backups/` (gitignored).

Restore:

```bash
gunzip -c backups/latest.sql.gz | psql "$(neonctl connection-string --project-id steep-sunset-42393062 --database-name aitutor --role-name aitutor)"
```

Create another Neon snapshot:

```bash
neonctl snapshots create --project-id steep-sunset-42393062 --name "manual-$(date -u +%Y%m%d)"
```
