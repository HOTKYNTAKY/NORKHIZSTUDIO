#!/usr/bin/env bash
# حذف کامل «کاوش شخصیت» از سرور
#   sudo bash uninstall.sh          (با تأیید)
#   sudo FORCE=1 bash uninstall.sh  (بدون تأیید)
set -Eeuo pipefail

APP="kavosh-shakhsiat"
INSTALL_DIR="${INSTALL_DIR:-/opt/$APP}"
UNIT_DIR="${UNIT_DIR:-/etc/systemd/system}"
NGINX_CONF="/etc/nginx/conf.d/$APP.conf"
STATE_DIR="/etc/$APP"
FORCE="${FORCE:-0}"

if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || { echo "با دسترسی root اجرا کن."; exit 1; }
  exec sudo -E bash "$0" "$@"
fi

if [ "$FORCE" != "1" ]; then
  read -r -p "سایت «کاوش شخصیت» و فایل‌هایش حذف شوند؟ (y/N) " ans
  [[ "$ans" =~ ^[yY]$ ]] || { echo "لغو شد."; exit 0; }
fi

systemctl disable --now "$APP" 2>/dev/null || true
rm -f "$UNIT_DIR/$APP.service"
systemctl daemon-reload 2>/dev/null || true

if [ -f "$NGINX_CONF" ]; then
  rm -f "$NGINX_CONF"
  if systemctl is-active --quiet nginx 2>/dev/null; then
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
  fi
fi

if [ -n "$INSTALL_DIR" ] && [ "$INSTALL_DIR" != "/" ]; then
  rm -rf "$INSTALL_DIR"
fi
rm -rf "$STATE_DIR"

echo "«کاوش شخصیت» حذف شد. (nginx و کاربر سیستمی kavosh دست‌نخورده ماندند.)"
