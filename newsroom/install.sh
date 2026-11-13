#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

fail() { printf '\nخطا: %s\n' "$*" >&2; exit 1; }
[[ "${EUID:-$(id -u)}" -eq 0 ]] || fail "برای نصب، اجرا را با sudo انجام دهید: sudo bash install.sh"
command -v docker >/dev/null 2>&1 || fail "Docker نصب نیست. ابتدا Docker Engine و Docker Compose plugin را نصب کنید."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin در دسترس نیست."
command -v openssl >/dev/null 2>&1 || fail "openssl نصب نیست."

printf '\nایران‌نگر — راه‌اندازی امن روی لینوکس\n'
printf 'پیش‌نیاز: رکورد DNS دامنه باید به IP همین سرور اشاره کند و پورت‌های 80 و 443 باز باشند.\n\n'
read -r -p 'دامنه‌ی سایت (مثلاً news.example.com): ' SITE_DOMAIN
[[ "$SITE_DOMAIN" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$ ]] || fail "نام دامنه معتبر نیست."
read -r -p 'ایمیل دریافت‌کننده‌ی اعلان گواهی TLS: ' ACME_EMAIL
[[ "$ACME_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || fail "ایمیل معتبر نیست."
read -r -p 'نام کاربری مدیر: ' ADMIN_USER
[[ "$ADMIN_USER" =~ ^[A-Za-z0-9_.-]{3,40}$ ]] || fail "نام کاربری باید ۳ تا ۴۰ نویسه و شامل حروف لاتین، عدد، نقطه، خط یا زیرخط باشد."
read -r -s -p 'گذرواژه‌ی مدیر (حداقل ۱۲ نویسه): ' ADMIN_PASSWORD; printf '\n'
[[ ${#ADMIN_PASSWORD} -ge 12 && ${#ADMIN_PASSWORD} -le 200 ]] || fail "گذرواژه باید ۱۲ تا ۲۰۰ نویسه باشد."
read -r -s -p 'تکرار گذرواژه: ' ADMIN_PASSWORD_CONFIRM; printf '\n'
[[ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD_CONFIRM" ]] || fail "گذرواژه‌ها یکسان نیستند."
read -r -p 'ایمیل تماس تحریریه (اختیاری، برای نمایش عمومی): ' CONTACT_EMAIL
if [[ -n "$CONTACT_EMAIL" && ! "$CONTACT_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then fail "ایمیل تماس معتبر نیست."; fi

mkdir -p "$ROOT/data" && chmod 750 "$ROOT/data"
SESSION_SECRET="$(openssl rand -hex 48)"
cat > "$ROOT/.env" <<EOF
NODE_ENV=production
PORT=3000
SITE_NAME=ایران‌نگر
SITE_DOMAIN=$SITE_DOMAIN
PUBLIC_ORIGIN=https://$SITE_DOMAIN
ADMIN_USER=$ADMIN_USER
ADMIN_PASSWORD_HASH=temporary
SESSION_SECRET=$SESSION_SECRET
DATA_DIR=/app/data
ACME_EMAIL=$ACME_EMAIL
CONTACT_EMAIL=$CONTACT_EMAIL
EOF
chmod 600 "$ROOT/.env"

printf '\nساخت تصویر برنامه…\n'
docker compose build web
printf 'ساخت هش امن گذرواژه…\n'
ADMIN_PASSWORD_HASH="$(docker compose run --rm --no-deps -e ADMIN_PASSWORD="$ADMIN_PASSWORD" web node scripts/hash-password.mjs | tr -d '\r\n')"
[[ "$ADMIN_PASSWORD_HASH" == scrypt:* ]] || fail "ساخت هش گذرواژه ناموفق بود."
sed -i "s|^ADMIN_PASSWORD_HASH=.*|ADMIN_PASSWORD_HASH=$ADMIN_PASSWORD_HASH|" "$ROOT/.env"
unset ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM ADMIN_PASSWORD_HASH SESSION_SECRET

chown -R 1000:1000 "$ROOT/data"
printf 'راه‌اندازی وب‌سایت و دریافت گواهی HTTPS…\n'
docker compose up -d
sleep 3
docker compose ps

cat <<EOF

نصب اولیه انجام شد.
سایت: https://$SITE_DOMAIN
پنل تحریریه: https://$SITE_DOMAIN/admin

نکته: اگر دامنه هنوز به GitHub Pages اشاره می‌کند، رکوردهای DNS را در پنل دامنه به IP این سرور تغییر دهید. پورت‌های 80/443 باید از اینترنت قابل‌دسترسی باشند؛ پورت 3000 را عمومی نکنید.
برای نسخه‌های بعدی: sudo bash update.sh
برای پشتیبان پایگاه داده: sudo bash backup.sh
EOF
