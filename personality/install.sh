#!/usr/bin/env bash
# =============================================================================
#  نصب «کاوش شخصیت» روی سرور لینوکسی
#
#  اجرا:            sudo bash install.sh
#  نمونه با تنظیمات: sudo PORT=8080 bash install.sh
#
#  متغیرهای اختیاری:
#    PORT=8080            پورت وب‌سایت (پیش‌فرض 8080)
#    MODE=python|nginx    python : سرویس systemd با python3 (پیش‌فرض، بدون پکیج اضافه)
#                         nginx  : وب‌سرور nginx (برای ترافیک بیشتر و HTTPS)
#    DOMAIN=example.com   نام دامنه (فقط برای نمایش آدرس و تنظیم nginx)
#    INSTALL_DIR=/opt/... مسیر نصب فایل‌ها
#    DRY_RUN=1            فقط نمایش مراحل، بدون تغییر در سیستم
#
#  پس از نصب، آدرس دقیق باز کردن سایت در همین ترمینال نمایش داده می‌شود
#  و در فایل /etc/kavosh-shakhsiat/address.txt هم ذخیره می‌شود.
# =============================================================================
set -Eeuo pipefail

APP="kavosh-shakhsiat"
PORT="${PORT:-8080}"
MODE="${MODE:-python}"
DOMAIN="${DOMAIN:-}"
INSTALL_DIR="${INSTALL_DIR:-/opt/$APP}"
DRY_RUN="${DRY_RUN:-0}"
UNIT_DIR="${UNIT_DIR:-/etc/systemd/system}"
STATE_DIR="/etc/$APP"
SERVICE_USER="kavosh"
NGINX_CONF="/etc/nginx/conf.d/$APP.conf"

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------- پیام‌ها ----------
info() { printf '\033[1;34m[اطلاع]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[انجام]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[هشدار]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[خطا]\033[0m %s\n' "$*" >&2; exit 1; }

# اجرای دستور؛ در حالت DRY_RUN فقط نمایش داده می‌شود
run() {
  if [ "$DRY_RUN" = "1" ]; then
    printf '    [dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

# نوشتن فایل از ورودی استاندارد
put_file() {
  local path="$1"
  if [ "$DRY_RUN" = "1" ]; then
    printf '    [dry-run] نوشتن فایل %s\n' "$path"
    cat > /dev/null
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  cat > "$path"
  chmod 644 "$path"
}

# ---------- بررسی‌های اولیه ----------
if [ "$DRY_RUN" != "1" ] && [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    info "برای نصب به دسترسی مدیر نیاز است؛ با sudo ادامه می‌دهم..."
    exec sudo -E bash "$SRC_DIR/install.sh" "$@"
  fi
  die "این اسکریپت باید با دسترسی root اجرا شود: sudo bash install.sh"
fi

[[ "$PORT" =~ ^[0-9]+$ ]] && [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] \
  || die "مقدار PORT نامعتبر است: $PORT"
case "$MODE" in
  python|nginx) ;;
  *) die "MODE باید python یا nginx باشد (مقدار فعلی: $MODE)" ;;
esac
if [ -n "$DOMAIN" ] && ! [[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
  die "مقدار DOMAIN نامعتبر است: $DOMAIN"
fi
[ -f "$SRC_DIR/index.html" ] && [ -d "$SRC_DIR/css" ] && [ -d "$SRC_DIR/js" ] \
  || die "فایل‌های برنامه کنار install.sh پیدا نشد (index.html و پوشه‌های css/ و js/ لازم‌اند)."
[ "$SRC_DIR" != "$INSTALL_DIR" ] || die "مسیر نصب نباید همان پوشه‌ی منبع باشد."
[ -n "$INSTALL_DIR" ] && [ "$INSTALL_DIR" != "/" ] || die "INSTALL_DIR نامعتبر است."

if [ "$MODE" = "python" ]; then
  PY="$(command -v python3 || true)"
  [ -n "$PY" ] || die "python3 پیدا نشد. آن را نصب کن یا MODE=nginx را استفاده کن."
  if [ "$DRY_RUN" != "1" ] && [ ! -d /run/systemd/system ]; then
    die "این سیستم systemd فعال ندارد. برای این حالت systemd لازم است؛ یا MODE=nginx را امتحان کن."
  fi
fi

port_busy() { [ -n "$(ss -H -ltn "sport = :$PORT" 2>/dev/null)" ]; }

is_active() { systemctl is-active --quiet "$1" 2>/dev/null; }

# ---------- بررسی تداخل پورت ----------
if port_busy; then
  if [ "$MODE" = "python" ] && is_active "$APP"; then
    info "پورت $PORT توسط خود همین سرویس استفاده می‌شود؛ به‌روزرسانی انجام می‌شود."
  elif [ "$MODE" = "nginx" ] && is_active nginx; then
    info "پورت $PORT توسط nginx استفاده می‌شود؛ تنظیمات به‌روز می‌شود."
  else
    die "پورت $PORT از قبل اشغال است. با PORT=پورت_دیگر دوباره اجرا کن (مثلاً PORT=8081)."
  fi
fi

info "شروع نصب «کاوش شخصیت» (حالت: $MODE، پورت: $PORT)"

# ---------- ۱) کپی فایل‌های برنامه ----------
info "۱/۴ کپی فایل‌های سایت به $INSTALL_DIR"
run mkdir -p "$INSTALL_DIR"
run rm -rf "${INSTALL_DIR:?}/css" "${INSTALL_DIR:?}/js"
run cp -r "$SRC_DIR/index.html" "$SRC_DIR/css" "$SRC_DIR/js" "$INSTALL_DIR/"
run chmod -R a+rX "$INSTALL_DIR"
run chown -R root:root "$INSTALL_DIR"

# ---------- ۲) نصب و راه‌اندازی وب‌سرور ----------
install_nginx() {
  if command -v nginx >/dev/null 2>&1; then
    ok "nginx از قبل نصب است."
    return
  fi
  if command -v apt-get >/dev/null 2>&1; then
    run env DEBIAN_FRONTEND=noninteractive apt-get update -y
    run env DEBIAN_FRONTEND=noninteractive apt-get install -y nginx
  elif command -v dnf >/dev/null 2>&1; then
    run dnf install -y nginx
  elif command -v yum >/dev/null 2>&1; then
    run yum install -y nginx
  else
    die "مدیر پکیج شناخته نشد؛ nginx را دستی نصب کن یا MODE=python را استفاده کن."
  fi
}

write_unit() {
  cat <<EOF
[Unit]
Description=Kavosh Shakhsiat personality test website
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
ExecStart=$PY -m http.server $PORT --bind 0.0.0.0 --directory $INSTALL_DIR
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
}

write_nginx_conf() {
  cat <<EOF
server {
    listen $PORT default_server;
    server_name ${DOMAIN:-_};

    root $INSTALL_DIR;
    index index.html;
    charset utf-8;

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; base-uri 'self'; form-action 'self'" always;

    location /css/ { expires 7d; add_header Cache-Control "public"; }
    location /js/  { expires 7d; add_header Cache-Control "public"; }

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF
}

if [ "$MODE" = "python" ]; then
  info "۲/۴ ساخت کاربر سرویس و سرویس systemd"
  if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
    run useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
  fi
  # اگر قبلاً حالت nginx بوده، کانفیگ nginx را برای آزاد شدن پورت برمی‌داریم
  if [ -f "$NGINX_CONF" ]; then
    run rm -f "$NGINX_CONF"
    if is_active nginx; then run systemctl reload nginx; fi
  fi
  write_unit | put_file "$UNIT_DIR/$APP.service"
  run systemctl daemon-reload
  run systemctl enable "$APP"
  run systemctl restart "$APP"
else
  info "۲/۴ نصب nginx و تنظیم سایت"
  install_nginx
  # اگر قبلاً سرویس python اجرا می‌شد، آن را متوقف می‌کنیم
  if [ -f "$UNIT_DIR/$APP.service" ]; then
    run systemctl disable --now "$APP" || true
  fi
  if [ "$PORT" = "80" ] && [ -e /etc/nginx/sites-enabled/default ]; then
    info "سایت پیش‌فرض nginx روی پورت ۸۰ حذف از فعال‌ها شد (فایل اصلی حذف نشده)."
    run rm -f /etc/nginx/sites-enabled/default
  fi
  run mkdir -p /etc/nginx/conf.d
  write_nginx_conf | put_file "$NGINX_CONF"
  run nginx -t
  run systemctl enable nginx
  run systemctl restart nginx
fi

# ---------- ۳) باز کردن فایروال محلی ----------
info "۳/۴ بررسی فایروال محلی"
open_firewall() {
  local ufw_out fw_state
  ufw_out="$(ufw status 2>/dev/null || true)"
  if [[ "$ufw_out" == *"Status: active"* ]]; then
    run ufw allow "$PORT/tcp"
    ok "پورت $PORT در UFW باز شد."
    return
  fi
  fw_state="$(firewall-cmd --state 2>/dev/null || true)"
  if [ "$fw_state" = "running" ]; then
    run firewall-cmd --permanent --add-port="$PORT/tcp"
    run firewall-cmd --reload
    ok "پورت $PORT در firewalld باز شد."
    return
  fi
  info "فایروال محلی فعال نیست؛ مورد خاصی لازم نیست."
}
open_firewall

# ---------- ۴) بررسی سلامت و نمایش آدرس ----------
info "۴/۴ بررسی سلامت سرویس"
if [ "$DRY_RUN" != "1" ]; then
  healthy=0
  for _ in $(seq 1 15); do
    if curl -fsS -m 3 -o /dev/null "http://127.0.0.1:$PORT/"; then healthy=1; break; fi
    sleep 1
  done
  if [ "$healthy" = "1" ]; then
    ok "سایت روی پورت $PORT بالا آمد و پاسخ می‌دهد."
  else
    warn "سایت هنوز پاسخ نمی‌دهد. لاگ را ببین: journalctl -u $APP -n 50  (برای nginx: journalctl -u nginx -n 50)"
  fi
else
  echo "    [dry-run] بررسی سلامت روی http://127.0.0.1:$PORT/"
fi

detect_lan_ip() {
  local ip
  ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')" || true
  if [ -z "$ip" ]; then ip="$(hostname -I 2>/dev/null | awk '{print $1}')" || true; fi
  echo "$ip"
}

detect_public_ip() {
  local ip
  ip="$(curl -fsS -m 5 https://api.ipify.org 2>/dev/null || true)"
  if [[ "$ip" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then echo "$ip"; fi
}

PORT_SUFFIX=""
[ "$PORT" = "80" ] || PORT_SUFFIX=":$PORT"
LAN_IP="$(detect_lan_ip)"
PUBLIC_IP="$(detect_public_ip)"

ADDRESSES=()
ADDRESSES+=("روی خود سرور        : http://127.0.0.1$PORT_SUFFIX")
[ -n "$LAN_IP" ]    && ADDRESSES+=("از شبکه‌ی داخلی    : http://$LAN_IP$PORT_SUFFIX")
[ -n "$PUBLIC_IP" ] && ADDRESSES+=("از اینترنت (IP عمومی): http://$PUBLIC_IP$PORT_SUFFIX")
[ -n "$DOMAIN" ]    && ADDRESSES+=("با دامنه           : http://$DOMAIN$PORT_SUFFIX")

echo
echo "============================================================"
echo "  «کاوش شخصیت» نصب شد. آدرس باز کردن سایت:"
echo
for line in "${ADDRESSES[@]}"; do echo "    $line"; done
echo
echo "  اگر از بیرون باز نمی‌شود:"
echo "    - پورت $PORT را در فایروال ابری (Security Group / Firewall هاست) باز کن."
echo "    - اگر سرور پشت NAT است، پورت $PORT را روی روتر به این سرور فوروارد کن."
[ "$MODE" = "python" ] && echo "    - مدیریت سرویس:  sudo systemctl {status|restart|stop} $APP"
[ "$MODE" = "nginx" ]  && echo "    - مدیریت وب‌سرور: sudo systemctl {status|restart|stop} nginx"
echo "  مسیر فایل‌ها : $INSTALL_DIR"
echo "============================================================"

if [ "$DRY_RUN" = "1" ]; then
  info "حالت dry-run: هیچ تغییری در سیستم اعمال نشد."
else
  mkdir -p "$STATE_DIR"
  {
    echo "کاوش شخصیت — آدرس‌های دسترسی (نوشته‌شده در $(date '+%Y-%m-%d %H:%M'))"
    for line in "${ADDRESSES[@]}"; do echo "$line"; done
    echo "حالت: $MODE | پورت: $PORT | مسیر: $INSTALL_DIR"
  } > "$STATE_DIR/address.txt"
  ok "آدرس‌ها در $STATE_DIR/address.txt ذخیره شد."
fi
