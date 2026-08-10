#!/usr/bin/env bash
# Open the one-click Render free deploy for Practice Out Loud.
set -euo pipefail

REPO_URL="https://github.com/SatishKallepalli-KSO/practice-out-loud"
DEPLOY_URL="https://render.com/deploy?repo=${REPO_URL}"
LIVE_URL="https://practiceoutloud.com"
FALLBACK_URL="https://ai-tutor-studio.onrender.com"

echo ""
echo "Practice Out Loud — free live deploy (Render)"
echo "============================================="
echo ""
echo "1) One-click Blueprint (browser):"
echo "   ${DEPLOY_URL}"
echo ""
echo "2) After deploy, prefer the brand domain:"
echo "   ${LIVE_URL}"
echo "   Render fallback: ${FALLBACK_URL}"
echo ""
echo "3) Domain:"
echo "   Cloudflare practiceoutloud.com / www → CNAME to ai-tutor-studio.onrender.com"
echo "   Docs: docs/product/DEPLOY-FREE.md"
echo ""

if command -v open >/dev/null 2>&1; then
  open "${DEPLOY_URL}"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${DEPLOY_URL}"
else
  echo "Open the Blueprint URL above in your browser."
fi

if command -v render >/dev/null 2>&1; then
  if render whoami >/dev/null 2>&1; then
    echo "Render CLI: logged in as $(render whoami 2>/dev/null | head -1)"
  else
    echo "Render CLI installed but not logged in. Run: render login"
  fi
fi
