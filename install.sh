#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  گلیستا — نصب خودکار فروشگاه گل مصنوعی روی سرور لینوکسی (صفر تا صد)
#
#  پشتیبانی: Ubuntu / Debian (apt) · RHEL / Rocky / Alma / CentOS (dnf/yum)
#
#  استفاده:
#    sudo bash install.sh                                  # دامنه پیش‌فرض golistahome.shop + HTTPS خودکار
#    sudo bash install.sh --ssl you@mail.com               # HTTPS با ایمیل مشخص Let's Encrypt
#    sudo bash install.sh --domain example.com             # دامنه دلخواه
#    sudo bash install.sh --port 9273                      # پورت API (داخلی)
#    sudo bash install.sh --no-ssl                         # فقط HTTP (بدون گواهی)
#    sudo bash install.sh --email you@mail.com --no-ssl    # ترکیبی
#
#  اجرای مجدد امن است: دیتابیس (server/data) و server/.env حفظ می‌شوند.
#
#  چه چیزی نصب می‌شود؟
#    ۱) Node.js ≥ 18 (در صورت نبود)     ۲) فروشگاه → /var/www/golistahome
#    ۳) سرویس API فروشگاه (systemd)      ۴) Nginx + دامنه
#    ۵) فایروال (80/443)                 ۶) HTTPS رایگان Let's Encrypt
#    ۷) دیتابیس اولیه با ۲ دسته و ۱۲ محصول نمونه
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_NAME="golistahome"
WEB_ROOT="/var/www/${APP_NAME}"
DOMAIN="golistahome.shop"
SSL_EMAIL=""          # خالی = تلاش خودکار با ثبت ناامن بدون ایمیل
SSL_MODE="auto"       # auto | off
API_PORT="9273"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── خروجی رنگی ──────────────────────────────────────────────────────────
c_reset=$'\033[0m'; c_gold=$'\033[38;5;179m'; c_cyan=$'\033[38;5;81m'
c_red=$'\033[38;5;203m'; c_dim=$'\033[2m'; c_green=$'\033[38;5;71m'
log()  { printf "%s▸%s %s\n" "$c_cyan" "$c_reset" "$*"; }
ok()   { printf "%s✓%s %s\n" "$c_green" "$c_reset" "$*"; }
warn() { printf "%s!%s %s\n" "$c_gold" "$c_reset" "$*"; }
die()  { printf "%s✗ %s%s\n" "$c_red" "$*" "$c_reset" >&2; exit 1; }
step() { printf "\n%s══ %s ══%s\n" "$c_gold" "$*" "$c_reset"; }

usage() {
  cat <<EOF
گلیستا — نصب خودکار فروشگاه گل مصنوعی
  sudo bash install.sh [گزینه‌ها]
گزینه‌ها:
  --domain NAME    دامنه سایت (پیش‌فرض: golistahome.shop)
  --ssl EMAIL      ایمیل Let's Encrypt برای گواهی HTTPS
  --no-ssl         نصب فقط با HTTP (بدون گواهی)
  --port N         پورت داخلی API فروشگاه (پیش‌فرض: 9273)
  -h, --help       راهنما
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:?--domain needs a value}"; shift 2 ;;
    --ssl)    SSL_EMAIL="${2:?--ssl needs an email}"; SSL_MODE="on"; shift 2 ;;
    --no-ssl) SSL_MODE="off"; shift ;;
    --email)  SSL_EMAIL="${2:?--email needs a value}"; shift 2 ;;
    --port)   API_PORT="${2:?--port needs a value}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "گزینه ناشناخته: $1  (با --help راهنما را ببینید)" ;;
  esac
done

# ── دسترسی root ─────────────────────────────────────────────────────────
SUDO=""
if [[ "${EUID}" -ne 0 ]]; then
  command -v sudo >/dev/null 2>&1 || die "با root اجرا کنید یا sudo نصب باشد."
  SUDO="sudo"
fi

# ── تشخیص سیستم‌عامل / پکیج‌منیجر ──────────────────────────────────────
PKG=""
if command -v apt-get >/dev/null 2>&1; then PKG="apt";
elif command -v dnf >/dev/null 2>&1; then PKG="dnf";
elif command -v yum >/dev/null 2>&1; then PKG="yum";
fi

pkg_install() {
  case "$PKG" in
    apt) $SUDO apt-get update -qq && $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" ;;
    dnf) $SUDO dnf install -y -q "$@" ;;
    yum) $SUDO yum install -y -q "$@" ;;
    *) die "توزیع پشتیبانی نمی‌شود (apt/dnf/yum). این اسکریپت فقط لینوکس است." ;;
  esac
}

# ── Node.js ≥ 18 (در صورت نیاز نصب می‌شود) ─────────────────────────────
ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local major; major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    if [[ "$major" -ge 18 ]]; then ok "Node.js $(node -v) پیدا شد"; return; fi
    warn "Node.js $(node -v) قدیمی است — ارتقا به ۲۲ LTS…"
  else
    log "نصب Node.js 22 LTS…"
  fi
  case "$PKG" in
    apt)
      pkg_install ca-certificates curl gnupg
      $SUDO install -d -m 0755 /etc/apt/keyrings
      curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | $SUDO gpg --batch --yes --dearmor -o /etc/apt/keyrings/nodesource.gpg
      echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
        | $SUDO tee /etc/apt/sources.list.d/nodesource.list >/dev/null
      pkg_install nodejs
      ;;
    dnf|yum)
      curl -fsSL https://rpm.nodesource.com/setup_22.x | $SUDO bash -
      pkg_install nodejs
      ;;
    *) die "نصب خودکار Node.js ممکن نشد؛ دستی Node ≥ 18 نصب کنید." ;;
  esac
  command -v node >/dev/null 2>&1 || die "Node.js نصب نشد."
  ok "Node.js $(node -v) نصب شد"
}

# ═══════════════════════════════════════════════════════════════════════
step "۱/۷ — بررسی پیش‌نیازها"
[[ -n "$PKG" ]] || die "پکیج‌منیجر پشتیبانی نمی‌شود."
log "توزیع تشخیص داده شد: $PKG · دامنه: $DOMAIN · پورت API: $API_PORT"
[[ -d "$SCRIPT_DIR/shop" ]] || die "پوشه shop/ پیدا نشد؛ اسکریپت باید در ریشه مخزن اجرا شود."
[[ -f "$SCRIPT_DIR/server/server.mjs" ]] || die "server/server.mjs پیدا نشد."
ensure_node
command -v rsync >/dev/null 2>&1 || pkg_install rsync
command -v curl  >/dev/null 2>&1 || pkg_install curl

# ═══════════════════════════════════════════════════════════════════════
step "۲/۷ — استقرار فروشگاه در ${WEB_ROOT}"
$SUDO mkdir -p "$WEB_ROOT"
if command -v rsync >/dev/null 2>&1; then
  $SUDO rsync -a --delete "$SCRIPT_DIR/shop/" "$WEB_ROOT/"
else
  $SUDO rm -rf "${WEB_ROOT:?}"/*
  $SUDO cp -a "$SCRIPT_DIR/shop/." "$WEB_ROOT/"
fi
$SUDO find "$WEB_ROOT" -type d -exec chmod 755 {} + 2>/dev/null || true
$SUDO find "$WEB_ROOT" -type f -exec chmod 644 {} + 2>/dev/null || true
ok "فایل‌های فرانت‌اند منتقل شد ($(du -sh "$WEB_ROOT" | cut -f1))"

# ═══════════════════════════════════════════════════════════════════════
step "۳/۷ — پیکربندی سرور فروشگاه (server/.env + دیتابیس)"
$SUDO mkdir -p "$SCRIPT_DIR/server/data"
$SUDO chmod 700 "$SCRIPT_DIR/server/data" 2>/dev/null || true
if [[ ! -f "$SCRIPT_DIR/server/.env" && -f "$SCRIPT_DIR/server/.env.example" ]]; then
  $SUDO cp "$SCRIPT_DIR/server/.env.example" "$SCRIPT_DIR/server/.env"
  $SUDO sed -i "s/^API_PORT=.*/API_PORT=${API_PORT}/" "$SCRIPT_DIR/server/.env"
  $SUDO chmod 600 "$SCRIPT_DIR/server/.env" 2>/dev/null || true
  ok "server/.env ساخته شد (API_PORT=${API_PORT})"
else
  # اگر .env هست ولی پورت فرق دارد، همان را نگه می‌داریم
  if [[ -f "$SCRIPT_DIR/server/.env" ]]; then
    SAVED_PORT="$(grep -E '^API_PORT=' "$SCRIPT_DIR/server/.env" | tail -1 | cut -d= -f2 | tr -d ' \"'\''\r' || true)"
    if [[ -n "${SAVED_PORT:-}" && "$SAVED_PORT" != "$API_PORT" ]]; then
      warn "پورت ذخیره‌شده در server/.env برابر ${SAVED_PORT} است — همان حفظ می‌شود."
      API_PORT="$SAVED_PORT"
    else
      ok "server/.env از قبل موجود است (حفظ شد)"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
step "۴/۷ — سرویس API فروشگاه (systemd)"
NODE_BIN="$(command -v node)"
if command -v systemctl >/dev/null 2>&1 && [[ -f "$SCRIPT_DIR/deploy/golistahome-api.service" ]]; then
  TMPUNIT="$(mktemp)"
  sed -e "s#__APPDIR__#${SCRIPT_DIR}#g" -e "s#__NODE__#${NODE_BIN}#g" \
    "$SCRIPT_DIR/deploy/golistahome-api.service" > "$TMPUNIT"
  $SUDO install -m 644 "$TMPUNIT" /etc/systemd/system/golistahome-api.service
  rm -f "$TMPUNIT"
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable golistahome-api >/dev/null 2>&1 || true
  $SUDO systemctl restart golistahome-api
  sleep 1
  if systemctl is-active --quiet golistahome-api; then
    ok "سرویس golistahome-api فعال شد (پورت ${API_PORT})"
  else
    warn "سرویس بالا نیامد؛ لاگ:"
    $SUDO journalctl -u golistahome-api -n 30 --no-pager || true
    die "سرویس API اجرا نشد — لاگ بالا را بررسی کنید."
  fi
else
  warn "systemd در دسترس نیست — سرور را دستی اجرا کنید: cd server && node server.mjs"
fi

# ═══════════════════════════════════════════════════════════════════════
step "۵/۷ — نصب و پیکربندی Nginx"
if ! command -v nginx >/dev/null 2>&1; then
  log "نصب Nginx…"
  pkg_install nginx
fi
log "نوشتن vhost برای دامنه: ${DOMAIN}"
TMPCONF="$(mktemp)"
sed -e "s#__DOMAIN__#${DOMAIN}#g" -e "s#__ROOT__#${WEB_ROOT}#g" -e "s#__APIPORT__#${API_PORT}#g" \
  "$SCRIPT_DIR/deploy/nginx-site.conf" > "$TMPCONF"

if [[ -d /etc/nginx/sites-available ]]; then
  $SUDO install -m 644 "$TMPCONF" "/etc/nginx/sites-available/${APP_NAME}"
  $SUDO ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
  # فقط وقتی catch-all هستیم سایت پیش‌فرض را برداریم
  if [[ "$DOMAIN" == "_" && -e /etc/nginx/sites-enabled/default ]]; then
    $SUDO rm -f /etc/nginx/sites-enabled/default
  fi
else
  $SUDO install -m 644 "$TMPCONF" "/etc/nginx/conf.d/${APP_NAME}.conf"
fi
rm -f "$TMPCONF"

$SUDO nginx -t
if command -v systemctl >/dev/null 2>&1; then
  $SUDO systemctl enable nginx >/dev/null 2>&1 || true
  $SUDO systemctl reload nginx 2>/dev/null || $SUDO systemctl restart nginx
else
  $SUDO nginx -s reload 2>/dev/null || $SUDO nginx
fi
ok "Nginx پیکربندی و بارگذاری شد"

# ── فایروال (فقط 80/443 — پورت API از بیرون بسته است؛ ادمین از مسیر /admin) ──
if command -v ufw >/dev/null 2>&1 && $SUDO ufw status 2>/dev/null | grep -q "Status: active"; then
  $SUDO ufw allow 'Nginx Full' >/dev/null 2>&1 || $SUDO ufw allow 80,443/tcp >/dev/null 2>&1 || true
  log "UFW: HTTP/HTTPS باز شد (پورت API عمداً بسته ماند)"
fi
if command -v firewall-cmd >/dev/null 2>&1 && $SUDO firewall-cmd --state >/dev/null 2>&1; then
  $SUDO firewall-cmd --permanent --add-service=http --add-service=https >/dev/null 2>&1 || true
  $SUDO firewall-cmd --reload >/dev/null 2>&1 || true
  log "firewalld: HTTP/HTTPS باز شد"
fi

# ═══════════════════════════════════════════════════════════════════════
step "۶/۷ — HTTPS (Let's Encrypt)"
SCHEME="http"
if [[ "$SSL_MODE" == "off" ]]; then
  warn "HTTPS رد شد (--no-ssl). برای فعال‌سازی بعداً: sudo bash install.sh --ssl you@mail.com"
elif [[ "$DOMAIN" == "_" ]]; then
  warn "دامنه‌ای تعیین نشده — فقط HTTP."
else
  # ذخیره دامنه برای اجراهای بعدی
  mkdir -p "$SCRIPT_DIR/server"
  if [[ -f "$SCRIPT_DIR/server/.env" ]]; then
    grep -v '^SITE_DOMAIN=' "$SCRIPT_DIR/server/.env" > "$SCRIPT_DIR/server/.env.tmp" || true
    mv "$SCRIPT_DIR/server/.env.tmp" "$SCRIPT_DIR/server/.env"
  fi
  echo "SITE_DOMAIN=${DOMAIN}" >> "$SCRIPT_DIR/server/.env"
  chmod 600 "$SCRIPT_DIR/server/.env" 2>/dev/null || true

  CERT_READY=1
  if [[ "$PKG" == "apt" ]]; then
    pkg_install certbot python3-certbot-nginx || CERT_READY=0
  else
    pkg_install certbot python3-certbot-nginx 2>/dev/null || pkg_install certbot || CERT_READY=0
  fi

  CERT_OK=0
  if [[ "$CERT_READY" == "1" ]]; then
    if [[ -n "$SSL_EMAIL" ]]; then
      log "درخواست گواهی برای ${DOMAIN} (ایمیل: ${SSL_EMAIL})…"
      if $SUDO certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect; then
        CERT_OK=1
      fi
    else
      log "تلاش خودکار برای گواهی ${DOMAIN} (ثبت بدون ایمیل)…"
      if $SUDO certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
           --register-unsafely-without-email --redirect; then
        CERT_OK=1
      fi
    fi
  fi

  if [[ "$CERT_OK" == "1" ]]; then
    SCHEME="https"
    ok "HTTPS فعال شد → https://${DOMAIN}"
  elif [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]] && command -v certbot >/dev/null 2>&1; then
    log "گواهی موجود پیدا شد — اعمال مجدد پس از به‌روزرسانی vhost…"
    if $SUDO certbot install --nginx --cert-name "$DOMAIN" --non-interactive --redirect; then
      SCHEME="https"
      ok "HTTPS بازیابی شد → https://${DOMAIN}"
      $SUDO systemctl reload nginx 2>/dev/null || $SUDO nginx -s reload 2>/dev/null || true
    else
      warn "اعمال خودکار گواهی ممکن نشد: sudo certbot install --nginx --cert-name ${DOMAIN} --redirect"
    fi
  else
    warn "هنوز گواهی نداریم — معمولاً یعنی DNS دامنه به IP این سرور اشاره نمی‌کند یا پورت 80 بسته است."
    warn "پس از آماده‌شدن DNS، دوباره اجرا کنید:"
    if [[ -n "$SSL_EMAIL" ]]; then
      warn "  sudo bash install.sh --ssl ${SSL_EMAIL}"
    else
      warn "  sudo bash install.sh"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
step "۷/۷ — سلامت‌سنجی"
sleep 1
HEALTH_OK=0
if curl -fsS --max-time 5 "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1; then
  ok "API فروشگاه سالم است (:/api/health)"
  HEALTH_OK=1
else
  warn "API پاسخ نداد — بررسی کنید: systemctl status golistahome-api"
fi
if curl -fsS --max-time 5 -H "Host: ${DOMAIN}" "http://127.0.0.1/" | grep -qi "گلیستا\|golista\|flower\|html"; then
  ok "Nginx صفحه فروشگاه را سرو می‌کند"
else
  warn "پاسخ Nginx غیرمنتظره بود — /var/log/nginx/${APP_NAME}.error.log را ببینید."
fi
PUBLIC_IP="$(curl -fsS --max-time 4 https://api.ipify.org 2>/dev/null || echo '<IP-SERVER>')"

echo
printf "%s══════════════════════════════════════════════════%s\n" "$c_gold" "$c_reset"
if [[ "$HEALTH_OK" == "1" ]]; then
  ok "نصب فروشگاه گلیستا کامل شد 🌿"
else
  warn "نصب انجام شد ولی یک بررسی سلامت ناموفق بود (بالا را ببینید)."
fi
echo
echo "  فروشگاه     :  ${SCHEME}://${DOMAIN}/"
echo "  پنل مدیریت  :  ${SCHEME}://${DOMAIN}/admin"
echo "  نام کاربری  :  (نیازی نیست — فقط رمز مدیر)"
if [[ "$SCHEME" == "http" ]]; then
  echo "  جایگزین ادمین (اگر /admin باز نشد): http://${PUBLIC_IP}:${API_PORT}/admin"
fi
echo "  فایل‌ها     :  ${WEB_ROOT}"
echo "  دیتابیس     :  ${SCRIPT_DIR}/server/data/db.json"
echo "  لاگ سرویس  :  journalctl -u golistahome-api -f"
echo
printf "%s▸%s اولین ورود به پنل: آدرس /admin را باز کنید و رمز مدیر را بسازید.\n" "$c_cyan" "$c_reset"
printf "%s▸%s به‌روزرسانی بعدی:  sudo bash update.sh\n" "$c_cyan" "$c_reset"
printf "%s══════════════════════════════════════════════════%s\n" "$c_gold" "$c_reset"
