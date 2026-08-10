#!/usr/bin/env bash
# Publish the web app to docs/ for GitHub Pages while preserving docs/product/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${VITE_BASE:-/practice-out-loud/}"
API_BASE="${VITE_API_BASE:-}"

echo "Building web (VITE_BASE=$BASE VITE_API_BASE=${API_BASE:-empty})…"
cd apps/web
VITE_BASE="$BASE" VITE_API_BASE="$API_BASE" npm run build
cd "$ROOT"

TMP="$(mktemp -d)"
if [[ -d docs/product ]]; then
  cp -R docs/product "$TMP/product"
fi

rm -rf docs
mkdir -p docs
cp -R apps/web/dist/. docs/
cp docs/index.html docs/404.html

touch docs/.nojekyll

if [[ -d "$TMP/product" ]]; then
  cp -R "$TMP/product" docs/product
fi
rm -rf "$TMP"

echo "Published to docs/ (product docs preserved)."
ls docs
ls docs/product | head
