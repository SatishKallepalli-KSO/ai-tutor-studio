#!/usr/bin/env bash
# Backup AI Tutor Studio Postgres.
# Default: Neon Free project. Also supports Render or an explicit URL.
#
#   ./scripts/backup-db.sh              # Neon (default)
#   ./scripts/backup-db.sh --neon
#   ./scripts/backup-db.sh --render
#   DATABASE_URL=... ./scripts/backup-db.sh --url
#
# Requires: pg_dump (brew install libpq). Neon mode needs neonctl auth.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/backups"
MODE="${1:---neon}"
NEON_PROJECT_ID="${NEON_PROJECT_ID:-steep-sunset-42393062}"
NEON_ORG_ID="${NEON_ORG_ID:-org-falling-bird-44330402}"
NEON_DB="${NEON_DB:-aitutor}"
NEON_ROLE="${NEON_ROLE:-aitutor}"
RENDER_POSTGRES_ID="${RENDER_POSTGRES_ID:-dpg-d9s1aeijnfac738kde70-a}"

mkdir -p "${OUT_DIR}"
export PATH="/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:${PATH}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install with: brew install libpq" >&2
  exit 1
fi

resolve_url() {
  case "$MODE" in
    --neon|"")
      command -v neonctl >/dev/null 2>&1 || {
        echo "neonctl not found. Install with: brew install neonctl" >&2
        exit 1
      }
      neonctl connection-string \
        --project-id "${NEON_PROJECT_ID}" \
        --org-id "${NEON_ORG_ID}" \
        --database-name "${NEON_DB}" \
        --role-name "${NEON_ROLE}" \
        2>/dev/null | tail -1
      ;;
    --url)
      if [[ -z "${DATABASE_URL:-}" ]]; then
        echo "DATABASE_URL is required with --url" >&2
        exit 1
      fi
      printf '%s\n' "$DATABASE_URL"
      ;;
    --render)
      python3 - <<'PY'
import json, os, pathlib, re, urllib.request
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

db_id = os.environ.get("RENDER_POSTGRES_ID", "dpg-d9s1aeijnfac738kde70-a")
api_key = os.environ.get("RENDER_API_KEY")
if not api_key:
    api_key = re.search(r"key:\s*(\S+)", (pathlib.Path.home() / ".render" / "cli.yaml").read_text()).group(1)
info = json.load(
    urllib.request.urlopen(
        urllib.request.Request(
            f"https://api.render.com/v1/postgres/{db_id}/connection-info",
            headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
        )
    )
)
url = info["externalConnectionString"]
if url.startswith("postgres://"):
    url = "postgresql://" + url[len("postgres://") :]
parts = urlparse(url)
q = dict(parse_qsl(parts.query))
q["sslmode"] = "require"
print(urlunparse((parts.scheme, parts.netloc, parts.path, parts.params, urlencode(q), parts.fragment)))
PY
      ;;
    *)
      echo "Usage: $0 [--neon|--render|--url]" >&2
      exit 1
      ;;
  esac
}

URL="$(resolve_url)"
if [[ -z "$URL" || "$URL" != postgresql* && "$URL" != postgres* ]]; then
  echo "Could not resolve database URL for mode ${MODE}" >&2
  exit 1
fi

# normalize scheme for pg_dump
if [[ "$URL" == postgres://* ]]; then
  URL="postgresql://${URL#postgres://}"
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${OUT_DIR}/ai-tutor-studio-${STAMP}.sql.gz"

pg_dump --no-owner --no-acl --clean --if-exists "$URL" | gzip -c >"$OUT"
cp "$OUT" "${OUT_DIR}/latest.sql.gz"
BYTES="$(wc -c <"$OUT" | tr -d ' ')"
echo "Wrote ${OUT} (${BYTES} bytes gzipped) via ${MODE}"
