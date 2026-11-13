#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
[[ -f .env ]] || { echo 'فایل .env پیدا نشد؛ ابتدا install.sh را اجرا کنید.' >&2; exit 1; }
docker compose build web
docker compose up -d --no-deps web
docker compose ps
printf '\nبه‌روزرسانی تمام شد.\n'
