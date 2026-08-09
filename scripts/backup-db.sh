#!/usr/bin/env bash
# Backup AI Tutor Studio Postgres (Render free/paid).
# Requires: render CLI logged in OR RENDER_API_KEY, and pg_dump (brew install libpq).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/backups"
DB_ID="${RENDER_POSTGRES_ID:-dpg-d9s1aeijnfac738kde70-a}"
mkdir -p "${OUT_DIR}"

export PATH="/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:${PATH}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install with: brew install libpq" >&2
  exit 1
fi

python3 - <<'PY'
import gzip, json, os, pathlib, re, subprocess, urllib.request
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

db_id = os.environ.get("RENDER_POSTGRES_ID", "dpg-d9s1aeijnfac738kde70-a")
out_dir = pathlib.Path(os.environ["OUT_DIR"])

api_key = os.environ.get("RENDER_API_KEY")
if not api_key:
    cfg = pathlib.Path.home() / ".render" / "cli.yaml"
    api_key = re.search(r"key:\s*(\S+)", cfg.read_text()).group(1)

headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}
info = json.load(
    urllib.request.urlopen(
        urllib.request.Request(
            f"https://api.render.com/v1/postgres/{db_id}/connection-info",
            headers=headers,
        )
    )
)
url = info["externalConnectionString"]
if url.startswith("postgres://"):
    url = "postgresql://" + url[len("postgres://") :]
parts = urlparse(url)
q = dict(parse_qsl(parts.query))
q["sslmode"] = "require"
url = urlunparse((parts.scheme, parts.netloc, parts.path, parts.params, urlencode(q), parts.fragment))

stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
out = out_dir / f"ai-tutor-studio-{stamp}.sql.gz"
proc = subprocess.run(
    ["pg_dump", "--no-owner", "--no-acl", "--clean", "--if-exists", url],
    capture_output=True,
)
if proc.returncode != 0:
    raise SystemExit(proc.stderr.decode()[:800] or "pg_dump failed")

data = gzip.compress(proc.stdout)
out.write_bytes(data)
(out_dir / "latest.sql.gz").write_bytes(data)
print(f"Wrote {out} ({len(data)} bytes gzipped)")
PY
