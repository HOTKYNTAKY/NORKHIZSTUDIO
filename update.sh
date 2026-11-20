#!/usr/bin/env bash
# گلیستا — به‌روزرسانی نصب موجود:
#   git pull (در صورت وجود) → اجرای مجدد install.sh (امن؛ دیتابیس و .env حفظ می‌شود)
# Usage:  sudo bash update.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SUDO=""; [[ "${EUID}" -ne 0 ]] && SUDO="sudo"

# حفظ دامنه/پورت از server/.env برای اجرای بعدی install.sh
ARGS=()
if [[ -f server/.env ]]; then
  D="$(grep -E '^SITE_DOMAIN=' server/.env | tail -1 | cut -d= -f2- | tr -d ' \"'\''\r' || true)"
  P="$(grep -E '^API_PORT=' server/.env | tail -1 | cut -d= -f2- | tr -d ' \"'\''\r' || true)"
  [[ -n "${D:-}" ]] && ARGS+=(--domain "$D")
  [[ -n "${P:-}" ]] && ARGS+=(--port "$P")
fi

if [[ -d .git ]]; then
  echo "▸ دریافت آخرین کد…"
  git pull --ff-only || echo "! git pull انجام نشد؛ با همان کد محلی ادامه می‌دهیم."
fi

echo "▸ اجرای نصب/به‌روزرسانی…"
exec $SUDO bash install.sh ${ARGS[@]+"${ARGS[@]}"}
