#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
docker compose exec -T web npm run backup
printf 'فایل پشتیبان در پوشه‌ی data/backups ذخیره شد. آن را خارج از سرور نیز نگه دارید.\n'
