#!/usr/bin/env bash
# One-command bootstrap installer for Debian/Ubuntu.
# Usage: curl -fsSL https://raw.githubusercontent.com/HOTKYNTAKY/NORKHIZSTUDIO/main/newsroom/install-online.sh | sudo bash
set -Eeuo pipefail

REPO_ARCHIVE="https://codeload.github.com/HOTKYNTAKY/NORKHIZSTUDIO/tar.gz/refs/heads/main"
INSTALL_DIR="${INSTALL_DIR:-/opt/iran-negar}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

fail() { printf '\nخطا: %s\n' "$*" >&2; exit 1; }
log() { printf '\n▶ %s\n' "$*"; }

[[ "${EUID:-$(id -u)}" -eq 0 ]] || fail "این دستور باید با sudo اجرا شود."
command -v apt-get >/dev/null 2>&1 || fail "نصاب خودکار فعلاً Ubuntu/Debian را پشتیبانی می‌کند؛ برای توزیع دیگر، نصب Docker را جداگانه انجام دهید و از بسته‌ی install.sh استفاده کنید."
[[ -r /etc/os-release ]] || fail "نسخه‌ی سیستم‌عامل شناسایی نشد."
. /etc/os-release
case "${ID:-}" in ubuntu|debian) DISTRO="$ID" ;; *) fail "توزیع ${ID:-ناشناخته} پشتیبانی نمی‌شود؛ Ubuntu یا Debian لازم است." ;; esac

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  log "نصب پیش‌نیازها و Docker Engine + Compose plugin"
  apt-get update
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$DISTRO/gpg" | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/%s %s stable\n' \
    "$(dpkg --print-architecture)" "$DISTRO" "${VERSION_CODENAME:?نسخه‌ی سیستم‌عامل کدنام ندارد}" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin نصب نشد."
command -v tar >/dev/null 2>&1 || apt-get install -y tar

log "دریافت سورس عمومی از GitHub و آماده‌سازی در $INSTALL_DIR"
curl -fL --retry 3 --retry-delay 2 "$REPO_ARCHIVE" -o "$TMP_DIR/source.tar.gz"
tar -xzf "$TMP_DIR/source.tar.gz" -C "$TMP_DIR"
SOURCE_DIR="$(find "$TMP_DIR" -mindepth 2 -maxdepth 3 -type d -name newsroom -print -quit)"
[[ -n "$SOURCE_DIR" && -f "$SOURCE_DIR/docker-compose.yml" ]] || fail "پوشه‌ی newsroom در بسته پیدا نشد."
mkdir -p "$INSTALL_DIR"
cp -a "$SOURCE_DIR/." "$INSTALL_DIR/"
cd "$INSTALL_DIR"

if [[ -f .env ]]; then
  log "نصب قبلی پیدا شد؛ تنظیمات و داده‌ها حفظ می‌شوند و فقط برنامه به‌روزرسانی می‌شود."
  bash update.sh
  SITE_DOMAIN="$(sed -n 's/^SITE_DOMAIN=//p' .env | head -n1)"
  printf '\nبه‌روزرسانی تمام شد.\nسایت: https://%s\nورود تحریریه: https://%s/admin\n' "$SITE_DOMAIN" "$SITE_DOMAIN"
  exit 0
fi

log "شروع نصب و پیکربندی اولیه"
bash install.sh
