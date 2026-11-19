#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  NORKHIZ STUDIO — Server Doctor & Smart Setup  |  پزشک و نصاب هوشمند سرور
# ═══════════════════════════════════════════════════════════════════════════
#  دست‌ساز برای نورخیز استودیو — هوشمند، امن و idempotent (اجرا‌ی دوباره بی‌خطر)
#
#  پشتیبانی: Ubuntu 22.04 / Debian / RHEL / Rocky / Alma / Arch
#  کارها:
#    ۱) گزارش سلامت کامل سرور (دیباگ)
#    ۲) آپدیت هوشمند سیستم (فقط اگر لازم باشد + بکاپ لیست پکیج‌ها)
#    ۳) نصب پیش‌نیازها فقط اگر نصب نباشند (curl, git, docker, node, nginx…)
#    ۴) دیباگ ویژه SSH و پورت ۲۲ (سرویس، کانفیگ، دسترسی، فایروال، حملات)
#    ۵) دیباگ شبکه، پورت‌های باز، منابع، سرویس‌های خراب و لاگ‌های خطا
#    ۶) تعمیر خودکار (با --fix) + گزارش نهایی
#
#  استفاده:
#    sudo bash norkhiz-server-doctor.sh              # فقط دیباگ و گزارش (امن)
#    sudo bash norkhiz-server-doctor.sh --update     # + آپدیت هوشمند سیستم
#    sudo bash norkhiz-server-doctor.sh --install    # + نصب پیش‌نیازها
#    sudo bash norkhiz-server-doctor.sh --ssh        # فقط دیباگ SSH / پورت ۲۲
#    sudo bash norkhiz-server-doctor.sh --all --yes  # همه‌چیز، بدون سوال
#    sudo bash norkhiz-server-doctor.sh --fix        # دیباگ + تعمیر خودکار
#
#  ساخته شده از نورخیز استودیو
# ═══════════════════════════════════════════════════════════════════════════
set -uo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_VERSION="1.1.0"
APP="NORKHIZ STUDIO — Server Doctor"
LOG_FILE="${LOG_FILE:-/tmp/norkhiz-server-doctor.log}"
REPORT_FILE="${REPORT_FILE:-/tmp/norkhiz-report.txt}"
START_TS="$(date +%s)"

# ── حالت‌ها (Modes) ──────────────────────────────────────────────────────
MODE_CHECK=1; MODE_UPDATE=0; MODE_INSTALL=0; MODE_FIX=0; MODE_SSH_ONLY=0
ASSUME_YES=0

usage() {
  cat <<EOF
$APP  v$APP_VERSION
ساخته شده از نورخیز استودیو

Usage:
  sudo bash norkhiz-server-doctor.sh [options]

Options:
  --check     فقط دیباگ و گزارش سلامت (پیش‌فرض، بدون تغییر سیستم)
  --update    آپدیت هوشمند سیستم‌عامل + پاک‌سازی کش
  --install   نصب پیش‌نیازها و ران‌تایم‌ها (فقط اگر نباشند)
  --fix       بعد از دیباگ، تعمیر خودکار مشکلات رایج
  --ssh       فقط دیباگ SSH و پورت 22
  --all       همه‌ی موارد بالا با هم
  --yes       بدون پرسیدن سوال (برای اتوماسیون)
  --log FILE  مسیر فایل لاگ (پیش‌فرض: $LOG_FILE)
  -h, --help  این راهنما

مثال:
  sudo bash norkhiz-server-doctor.sh --all --yes
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)  MODE_CHECK=1; shift ;;
    --update) MODE_UPDATE=1; shift ;;
    --install) MODE_INSTALL=1; shift ;;
    --fix)    MODE_FIX=1; shift ;;
    --ssh)    MODE_SSH_ONLY=1; shift ;;
    --all)    MODE_UPDATE=1; MODE_INSTALL=1; MODE_FIX=1; shift ;;
    --yes)    ASSUME_YES=1; shift ;;
    --log)    LOG_FILE="${2:?--log needs a path}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "گزینه ناشناخته: $1 (برای راهنما: --help)" >&2; exit 2 ;;
  esac
done

# ── رنگ و لاگ ─────────────────────────────────────────────────────────────
c_reset=$'\033[0m'; c_gold=$'\033[38;5;179m'; c_cyan=$'\033[38;5;81m'
c_red=$'\033[38;5;203m'; c_green=$'\033[38;5;42m'; c_dim=$'\033[2m'
PASS=0; WARN=0; FAIL=0; FIXED=0

log()  { printf "%s▸%s %s\n" "$c_cyan" "$c_reset" "$*" | tee -a "$LOG_FILE"; }
ok()   { PASS=$((PASS+1)); printf "%s✓%s %s\n" "$c_green" "$c_reset" "$*" | tee -a "$LOG_FILE"; }
warn() { WARN=$((WARN+1)); printf "%s!%s %s\n" "$c_gold" "$c_reset" "$*" | tee -a "$LOG_FILE"; }
err()  { FAIL=$((FAIL+1)); printf "%s✗%s %s\n" "$c_red" "$c_reset" "$*" | tee -a "$LOG_FILE"; }
step() { printf "\n%s══ %s ══%s\n" "$c_gold" "$*" "$c_reset" | tee -a "$LOG_FILE"; }
dim()  { printf "%s%s%s\n" "$c_dim" "$*" "$c_reset" | tee -a "$LOG_FILE"; }

# لاگ را از اول تمیز کن
: > "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/norkhiz-server-doctor.log"

# ── ابزارهای کمکی ─────────────────────────────────────────────────────────
has_cmd() { command -v "$1" >/dev/null 2>&1; }
SUDO=""
if [[ "${EUID}" -ne 0 ]]; then
  if has_cmd sudo; then SUDO="sudo"; else
    err "دسترسی root لازم است. با sudo اجرا کن:  sudo bash $0"; exit 1
  fi
fi
run() { if [[ $ASSUME_YES -eq 1 || "${DRY:-0}" == "1" ]]; then "$@"; else
  printf "  ادامه بدهم؟ [y/N] "; read -r ans </dev/tty 2>/dev/null || ans="n"; [[ "$ans" =~ ^[Yy]$ ]] && "$@" || log "رد شد."; fi; }

confirm() { [[ $ASSUME_YES -eq 1 ]] && return 0; printf "  %s [y/N] " "$1"; read -r a </dev/tty 2>/dev/null || a="n"; [[ "$a" =~ ^[Yy]$ ]]; }

# ── تشخیص سیستم‌عامل ─────────────────────────────────────────────────────
DISTRO="unknown"; DISTRO_VER=""; PKG=""
if [[ -r /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  DISTRO="${ID:-unknown}"; DISTRO_VER="${VERSION_ID:-}"
fi
if has_cmd apt-get; then PKG="apt";
elif has_cmd dnf; then PKG="dnf";
elif has_cmd yum; then PKG="yum";
elif has_cmd pacman; then PKG="pacman";
fi

pkg_update() {
  case "$PKG" in
    apt)    $SUDO apt-get update -qq ;;
    dnf)    $SUDO dnf check-update -q || true ;;
    yum)    $SUDO yum check-update -q || true ;;
    pacman) $SUDO pacman -Sy --noconfirm ;;
    *) return 1 ;;
  esac
}
pkg_install() {
  case "$PKG" in
    apt)    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" ;;
    dnf)    $SUDO dnf install -y -q "$@" ;;
    yum)    $SUDO yum install -y -q "$@" ;;
    pacman) $SUDO pacman -S --noconfirm --needed "$@" ;;
    *) return 1 ;;
  esac
}
install_if_missing() {
  local cmd="$1"; shift
  if has_cmd "$cmd"; then ok "$cmd نصب است ($("$cmd" --version 2>/dev/null | head -1 || echo ok))"
  else log "نصب $cmd …"; pkg_install "$@" && ok "$cmd نصب شد" || err "نصب $cmd ناموفق بود"; fi
}

banner() {
  cat <<EOF | tee -a "$LOG_FILE"
╔══════════════════════════════════════════════════════════════╗
║   NORKHIZ STUDIO — Server Doctor & Smart Setup  v$APP_VERSION
║   پزشک و نصاب هوشمند سرور لینوکس (Ubuntu 22.04 و…)
╚══════════════════════════════════════════════════════════════╝
EOF
}

footer() {
  local secs=$(( $(date +%s) - START_TS ))
  cat <<EOF | tee -a "$LOG_FILE"

╔══════════════════════════════════════════════════════════════╗
║  ✅ پایان — سالم: $PASS  |  هشدار: $WARN  |  خطا: $FAIL  |  تعمیر شد: $FIXED
║  ⏱ زمان اجرا: ${secs} ثانیه   📄 لاگ: $LOG_FILE
║  📋 گزارش: $REPORT_FILE
║
║  ساخته شده از نورخیز استودیو  ❤️  NORKHIZ STUDIO
╚══════════════════════════════════════════════════════════════╝
EOF
}

# ═══════════════════════════════════════════════════════════════════════════
#  بخش ۱ — اطلاعات سیستم
# ═══════════════════════════════════════════════════════════════════════════
sys_info() {
  step "۱) اطلاعات سیستم"
  log "سیستم‌عامل: $DISTRO $DISTRO_VER  |  کرنل: $(uname -r)  |  معماری: $(uname -m)"
  log "هاست: $(hostname)  |  آپ‌تایم: $(uptime -p 2>/dev/null || uptime)"
  log "کاربر: $(whoami)  |  مدیر پکیج: ${PKG:-نامشخص}"
  if [[ "$DISTRO" == "ubuntu" && "$DISTRO_VER" == 22.04* ]]; then
    ok "Ubuntu 22.04 LTS شناسایی شد — پشتیبانی کامل فعال است"
  fi
  # منابع
  log "CPU: $(nproc) هسته  |  RAM: $(free -h 2>/dev/null | awk '/Mem:/{print $2}')  |  Swap: $(free -h 2>/dev/null | awk '/Swap:/{print $2}')"
  df -h / 2>/dev/null | tail -1 | awk '{printf "  دیسک ریشه: %s از %s استفاده شده (%s)\n", $3, $2, $5}' | tee -a "$LOG_FILE"
  local use; use=$(df / 2>/dev/null | awk 'NR==2{gsub(/%/,"",$5); print $5}')
  [[ "${use:-0}" -ge 90 ]] && err "دیسک ریشه ${use}% پر است!" || ok "فضای دیسک کافی است (${use:-?}%)"
  local inode; inode=$(df -i / 2>/dev/null | awk 'NR==2{gsub(/%/,"",$5); print $5}')
  [[ "${inode:-0}" -ge 90 ]] && warn "اینود ${inode}% پر است" || dim "اینود: ${inode:-?}%"
}

# ═══════════════════════════════════════════════════════════════════════════
#  بخش ۲ — آپدیت هوشمند
# ═══════════════════════════════════════════════════════════════════════════
smart_update() {
  step "۲) آپدیت هوشمند سیستم"
  # قفل apt؟
  if [[ "$PKG" == "apt" ]] && $SUDO fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; then
    warn "apt در حال اجراست (قفل فعال) — آپدیت رد شد تا تداخل پیش نیاید"; return
  fi
  # فضای کافی؟
  local avail; avail=$(df / 2>/dev/null | awk 'NR==2{print $4}')
  if [[ "${avail:-999999999}" -lt 500000 ]]; then warn "فضای آزاد کم است (${avail}KB) — اول دیسک را آزاد کن"; fi
  log "بررسی آپدیت‌های موجود…"
  pkg_update || { err "به‌روزرسانی لیست پکیج‌ها ناموفق بود"; return; }
  case "$PKG" in
    apt)
      local n; n=$(apt list --upgradable 2>/dev/null | grep -vc "Listing" || true)
      log "پکیج قابل آپدیت: $n"
      if [[ "$n" -eq 0 ]]; then ok "سیستم به‌روز است — آپدیتی لازم نیست"; return; fi
      # بکاپ لیست پکیج‌ها قبل از آپدیت
      dpkg -l > "/tmp/norkhiz-pkgs-before-$(date +%F-%H%M).txt" 2>/dev/null || true
      log "بکاپ لیست پکیج‌ها گرفته شد"
      confirm "آپدیت $n پکیج انجام شود؟" || { log "آپدیت رد شد"; return; }
      $SUDO env DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq && ok "آپدیت کامل شد" || err "آپدیت ناموفق بود"
      $SUDO apt-get autoremove -y -qq; $SUDO apt-get clean; ok "کش و پکیج‌های اضافی پاک‌سازی شد"
      [[ -f /var/run/reboot-required ]] && warn "ری‌استارت لازم است: $(cat /var/run/reboot-required.pkgs 2>/dev/null | tr '\n' ' ')"
      ;;
    dnf|yum)
      log "در حال آپدیت…"; $SUDO $PKG upgrade -y -q && ok "آپدیت کامل شد" || err "آپدیت ناموفق بود"
      $SUDO $PKG clean all 2>/dev/null || true ;;
    pacman) $SUDO pacman -Syu --noconfirm && ok "آپدیت کامل شد" || err "آپدیت ناموفق بود" ;;
    *) warn "مدیر پکیج پشتیبانی نمی‌شود — آپدیت رد شد" ;;
  esac
}

# ═══════════════════════════════════════════════════════════════════════════
#  بخش ۳ — پیش‌نیازها (فقط اگر نباشند)
# ═══════════════════════════════════════════════════════════════════════════
prereqs() {
  step "۳) پیش‌نیازهای سرور"
  local base=(curl wget git vim nano htop unzip tar ca-certificates gnupg
             software-properties-common net-tools dnsutils jq rsync)
  # نام پکیج‌ها در RHEL فرق دارد
  if [[ "$PKG" == "dnf" || "$PKG" == "yum" ]]; then
    base=(curl wget git vim nano htop unzip tar ca-certificates gnupg net-tools bind-utils jq rsync)
  fi
  pkg_update 2>/dev/null || true
  for p in "${base[@]}"; do
    has_cmd "$p" 2>/dev/null || pkg_install "$p" >/dev/null 2>&1 && true
  done
  # بررسی تکی با گزارش
  for c in curl git; do has_cmd "$c" && ok "$c آماده است" || err "$c نیست"; done
  has_cmd jq && ok "jq آماده است" || warn "jq نیست"
  has_cmd rsync && ok "rsync آماده است" || warn "rsync نیست"
  # فایروال و fail2ban
  if has_cmd ufw; then ok "ufw (فایروال) نصب است"; else log "نصب ufw…"; pkg_install ufw >/dev/null 2>&1 && ok "ufw نصب شد" || warn "ufw نصب نشد"; fi
  if has_cmd fail2ban-client; then ok "fail2ban نصب است"; else log "نصب fail2ban…"; pkg_install fail2ban >/dev/null 2>&1 && ok "fail2ban نصب شد" || warn "fail2ban نصب نشد"; fi
  # unattended-upgrades در دبیان
  if [[ "$PKG" == "apt" ]]; then
    has_cmd unattended-upgrade && ok "آپدیت خودکار (unattended-upgrades) فعال است" \
      || { log "نصب unattended-upgrades…"; pkg_install unattended-upgrades >/dev/null 2>&1 && ok "نصب شد" || warn "نصب نشد"; }
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
#  بخش ۴ — ران‌تایم‌ها: Node / Docker / Nginx (هوشمند)
# ═══════════════════════════════════════════════════════════════════════════
runtimes() {
  step "۴) ران‌تایم‌ها (Node / Docker / Nginx)"
  # Node.js — اولویت: NodeSource 20 → تاربال رسمی nodejs.org → مخزن Ubuntu
  node_tarball_install() {
    local ver="v20.18.1"
    curl -fsSL --connect-timeout 15 "https://nodejs.org/dist/${ver}/node-${ver}-linux-x64.tar.xz" -o /tmp/node.tar.xz \
      && tar -xJf /tmp/node.tar.xz -C /tmp \
      && $SUDO cp -a "/tmp/node-${ver}-linux-x64/." /usr/local/ \
      && rm -rf "/tmp/node-${ver}-linux-x64" /tmp/node.tar.xz
  }
  node_major() { node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/'; }
  if has_cmd node; then
    local v; v=$(node -v 2>/dev/null); log "Node.js: $v (نصب‌شده)"
    local mj; mj=$(node_major)
    if [[ "$mj" =~ ^[0-9]+$ ]] && [[ "$mj" -ge 18 ]]; then ok "نسخه Node.js مناسب است ($v)"
    else
      warn "Node.js قدیمی است ($v) — تلاش برای ارتقا…"
      node_tarball_install && hash -r && ok "Node.js ارتقا یافت: $(node -v)" || warn "ارتقا ناموفق بود — $v قدیمی باقی ماند"
    fi
  else
    log "Node.js نیست — نصب Node 20 LTS…"
    local node_ok=0 install_how=""
    if [[ "$PKG" == "apt" ]]; then
      if curl -fsSL --connect-timeout 15 https://deb.nodesource.com/setup_20.x -o /tmp/nodesource-setup.sh \
         && $SUDO -E bash /tmp/nodesource-setup.sh >/tmp/nodesource-setup.log 2>&1 \
         && pkg_install nodejs; then
        node_ok=1; install_how="NodeSource"
      else
        warn "NodeSource در دسترس نبود (احتمالاً مسدود است) — تلاش با تاربال رسمی nodejs.org…"
        if node_tarball_install; then node_ok=1; install_how="تاربال رسمی"
        else
          warn "nodejs.org هم در دسترس نبود — نصب نسخه‌ی مخزن Ubuntu…"
          pkg_install nodejs npm && node_ok=1 && install_how="مخزن Ubuntu" || true
        fi
      fi
    else
      pkg_install nodejs npm && node_ok=1 && install_how="مخزن سیستم" || true
    fi
    if [[ $node_ok -eq 1 ]] && has_cmd node; then
      hash -r
      local v2; v2=$(node -v); local mj2; mj2=$(node_major)
      if [[ "$mj2" =~ ^[0-9]+$ ]] && [[ "$mj2" -ge 18 ]]; then ok "Node.js نصب شد ($install_how): $v2"
      else warn "Node.js نصب شد ولی قدیمی است ($v2 از $install_how) — برای اکثر پروژه‌های جدید مناسب نیست"; fi
    else err "نصب Node.js ناموفق بود — اینترنت سرور را بررسی کن"; fi
  fi
  has_cmd npm && ok "npm: $(npm -v 2>/dev/null)" || { log "نصب npm…"; pkg_install npm >/dev/null 2>&1 && ok "npm نصب شد: $(npm -v 2>/dev/null)" || warn "npm همچنان نیست"; }
  # Docker — اولویت: اسکریپت رسمی get.docker.com → بسته‌ی docker.io مخزن Ubuntu/Debian
  if has_cmd docker; then ok "Docker: $(docker --version 2>/dev/null)"
  else
    log "Docker نیست — نصب…"
    local docker_ok=0 install_how=""
    if [[ "$PKG" == "apt" ]]; then
      if curl -fsSL --connect-timeout 15 https://get.docker.com -o /tmp/get-docker.sh && $SUDO sh /tmp/get-docker.sh >/tmp/get-docker.log 2>&1; then
        docker_ok=1; install_how="get.docker.com"
      else
        warn "get.docker.com در دسترس نبود (احتمالاً مسدود است) — تلاش با بسته‌ی docker.io مخزن Ubuntu…"
        pkg_install docker.io && docker_ok=1 && install_how="docker.io مخزن Ubuntu" || true
      fi
    else
      pkg_install docker && docker_ok=1 && install_how="مخزن سیستم" || pkg_install docker.io && docker_ok=1 && install_how="docker.io" || true
    fi
    if [[ $docker_ok -eq 1 ]] && has_cmd docker; then
      $SUDO systemctl enable --now docker >/dev/null 2>&1 || true
      ok "Docker نصب شد ($install_how): $(docker --version 2>/dev/null)"
    else warn "نصب Docker ناموفق بود — اگر لازم نداری بی‌خیال شو، برای سایت استاتیک خبری ضروری نیست"; fi
  fi
  # Nginx
  if has_cmd nginx; then
    nginx -t 2>&1 | head -2 | tee -a "$LOG_FILE"
    nginx -t >/dev/null 2>&1 && ok "کانفیگ Nginx سالم است" || err "کانفیگ Nginx خطا دارد!"
  else log "Nginx نیست — نصب…"; pkg_install nginx >/dev/null 2>&1 && ok "Nginx نصب شد" || warn "Nginx نصب نشد"; fi
}

# ═══════════════════════════════════════════════════════════════════════════
#  بخش ۵ — دیباگ ویژه SSH و پورت ۲۲  ⭐
# ═══════════════════════════════════════════════════════════════════════════
ssh_debug() {
  step "۵) دیباگ SSH و پورت ۲۲"
  # سرویس sshd (systemctl یا pgrep — برای محیط‌های بدون systemd هم کار می‌کند)
  if systemctl is-active --quiet ssh 2>/dev/null || systemctl is-active --quiet sshd 2>/dev/null || pgrep -f sshd >/dev/null 2>&1; then
    ok "سرویس SSH در حال اجراست"
  else
    err "سرویس SSH بالا نیست!"
    [[ $MODE_FIX -eq 1 ]] && { $SUDO systemctl start ssh 2>/dev/null || $SUDO systemctl start sshd 2>/dev/null; } && { ok "SSH استارت شد"; FIXED=$((FIXED+1)); }
  fi
  # پورت ۲۲ گوش می‌دهد؟
  if ss -tlnp 2>/dev/null | grep -qE ':22\b'; then ok "پورت ۲۲ در حال گوش دادن است"
  else err "هیچ سرویسی روی پورت ۲۲ گوش نمی‌دهد"; fi
  # تست کانفیگ
  if has_cmd sshd; then
    sshd -t 2>&1 | tee -a "$LOG_FILE" && ok "کانفیگ sshd سالم است" || err "کانفیگ sshd خطا دارد"
    log "پورت تنظیم‌شده: $(sshd -T 2>/dev/null | awk '$1=="port"{print $2}' | head -1)"
    log "ورود با رمز عبور: $(sshd -T 2>/dev/null | awk '$1=="passwordauthentication"{print $2}' | head -1)"
  fi
  # دسترسی‌ها
  local home; home=$(eval echo "~$(whoami)")
  if [[ -d "$home/.ssh" ]]; then
    local perm; perm=$(stat -c %a "$home/.ssh" 2>/dev/null)
    [[ "$perm" == "700" ]] && ok ".ssh مجوز درست دارد (700)" || warn ".ssh مجوزش $perm است (باید 700 باشد)"
    [[ -f "$home/.ssh/authorized_keys" ]] && ok "authorized_keys موجود است" || warn "authorized_keys نیست (ورود کلیدی ممکن نیست)"
  else warn ".ssh وجود ندارد — ورود کلیدی تنظیم نشده"; fi
  # فایروال روی ۲۲
  if has_cmd ufw; then
    ufw status 2>/dev/null | grep -q "22" && ok "فایروال پورت ۲۲ را باز گذاشته" || warn "فایروال: پورت ۲۲ در ufw دیده نشد (اگر ufw فعال است، بررسی کن)"
  fi
  # تلاش‌های ناموفق اخیر
  local fails; fails=$( (lastb 2>/dev/null || true) | wc -l | tr -d ' ')
  log "تلاش‌های ورود ناموفق (lastb): $fails مورد"
  if [[ "$fails" =~ ^[0-9]+$ ]] && [[ "$fails" -gt 20 ]]; then warn "تلاش‌های ناموفق زیاد است — fail2ban را فعال کن"; else dim "تلاش ناموفق در حد طبیعی است"; fi
  # لاگ اخیر SSH
  log "آخرین لاگ‌های SSH:"
  journalctl -u ssh -u sshd --no-pager -n 5 2>/dev/null | tail -5 | tee -a "$LOG_FILE" || dim "(journalctl در دسترس نیست)"
}

# ═══════════════════════════════════════════════════════════════════════════
#  بخش ۶ — شبکه و پورت‌ها
# ═══════════════════════════════════════════════════════════════════════════
network_debug() {
  step "۶) شبکه و پورت‌های باز"
  log "پورت‌های در حال گوش دادن:"; ss -tuln 2>/dev/null | head -20 | tee -a "$LOG_FILE"
  local gw; gw=$(ip route 2>/dev/null | awk '/default/{print $3; exit}')
  [[ -n "$gw" ]] && ok "گیت‌وی: $gw" || warn "گیت‌وی پیدا نشد"
  ping -c1 -W2 1.1.1.1 >/dev/null 2>&1 && ok "اینترنت (پینگ 1.1.1.1) برقرار است" || warn "پینگ 1.1.1.1 ناموفق بود"
  getent hosts github.com >/dev/null 2>&1 && ok "DNS کار می‌کند" || warn "DNS مشکل دارد"
  curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost/ 2>/dev/null | grep -qE '200|301|302|404' \
    && ok "وب‌سرور روی localhost پاسخ می‌دهد" || dim "وب‌سروری روی localhost نیست (طبیعی است اگر نصب نشده)"
}

# ═══════════════════════════════════════════════════════════════════════════
#  بخش ۷ — منابع و سرویس‌ها
# ═══════════════════════════════════════════════════════════════════════════
resources_debug() {
  step "۷) منابع و سلامت سرویس‌ها"
  local load; load=$(awk '{print $1}' /proc/loadavg 2>/dev/null)
  log "لود سیستم (۱ دقیقه): $load  |  هسته‌ها: $(nproc)"
  free -h 2>/dev/null | head -2 | tee -a "$LOG_FILE"
  local memuse; memuse=$(free 2>/dev/null | awk '/Mem:/{printf "%.0f", $3/$2*100}')
  [[ "${memuse:-0}" -ge 90 ]] && err "RAM ${memuse}% پر است!" || ok "RAM در وضعیت خوب است (${memuse:-?}%)"
  log "سرویس‌های خراب (failed):"
  local failed_out; failed_out=$(systemctl --failed --no-pager 2>/dev/null || true)
  echo "$failed_out" | tee -a "$LOG_FILE"
  if [[ -z "$failed_out" ]] || echo "$failed_out" | grep -q "0 loaded"; then ok "هیچ سرویس خرابی نیست"; else warn "سرویس خراب وجود دارد — بالا را ببین"; fi
  for s in nginx apache2 docker ssh sshd mysql postgresql; do
    systemctl is-active --quiet "$s" 2>/dev/null && dim "  $s: فعال" || true
  done
  log "خطاهای اخیر سیستم (journalctl -p err):"
  journalctl -p err --no-pager -n 10 2>/dev/null | tail -10 | tee -a "$LOG_FILE" || dim "(در دسترس نیست)"
  dmesg 2>/dev/null | grep -iE 'error|fail|oom' | tail -5 | tee -a "$LOG_FILE" || true
}

# ═══════════════════════════════════════════════════════════════════════════
#  بخش ۸ — امنیت سریع
# ═══════════════════════════════════════════════════════════════════════════
security_check() {
  step "۸) بررسی سریع امنیت"
  [[ -f /etc/ssh/sshd_config ]] && grep -qE '^\s*PermitRootLogin\s+no' /etc/ssh/sshd_config \
    && ok "ورود root با SSH غیرفعال است" || warn "PermitRootLogin no تنظیم نشده (پیشنهاد امنیتی)"
  has_cmd fail2ban-client && ok "fail2ban فعال است" || warn "fail2ban نصب نیست — برای جلوگیری از بروت‌فورس SSH نصب کن"
  if has_cmd ufw; then ufw status 2>/dev/null | head -5 | tee -a "$LOG_FILE"; fi
  getenforce 2>/dev/null | grep -q Enforcing && ok "SELinux فعال است" || dim "SELinux غیرفعال/در دسترس نیست"
  log "کاربران با دسترسی sudo:"; getent group sudo 2>/dev/null | tee -a "$LOG_FILE" || true
}

# ═══════════════════════════════════════════════════════════════════════════
#  بخش ۹ — تعمیر خودکار
# ═══════════════════════════════════════════════════════════════════════════
auto_fix() {
  step "۹) تعمیر خودکار"
  # پاک‌سازی کش و لاگ‌های قدیمی
  $SUDO journalctl --vacuum-time=7d >/dev/null 2>&1 && { ok "لاگ‌های قدیمی‌تر از ۷ روز پاک شد"; FIXED=$((FIXED+1)); }
  # اصلاح مجوز .ssh
  local home; home=$(eval echo "~$(whoami)")
  if [[ -d "$home/.ssh" ]]; then chmod 700 "$home/.ssh" 2>/dev/null; chmod 600 "$home/.ssh/authorized_keys" 2>/dev/null; ok ".ssh اصلاح شد"; FIXED=$((FIXED+1)); fi
  # ری‌استارت سرویس‌های خراب رایج
  for s in nginx ssh sshd; do
    systemctl is-enabled --quiet "$s" 2>/dev/null && ! systemctl is-active --quiet "$s" 2>/dev/null && {
      $SUDO systemctl start "$s" 2>/dev/null && { ok "$s استارت شد"; FIXED=$((FIXED+1)); } || warn "$s استارت نشد"; }
  done
  # تست نهایی Nginx
  has_cmd nginx && { nginx -t >/dev/null 2>&1 && ok "Nginx نهایی سالم است" || warn "Nginx هنوز خطا دارد — کانفیگ را دستی بررسی کن"; }
}

# ═══════════════════════════════════════════════════════════════════════════
#  گزارش نهایی
# ═══════════════════════════════════════════════════════════════════════════
make_report() {
  {
    echo "NORKHIZ STUDIO — Server Report"
    echo "تاریخ: $(date -Is)  |  هاست: $(hostname)  |  سیستم: $DISTRO $DISTRO_VER"
    echo "سالم: $PASS  هشدار: $WARN  خطا: $FAIL  تعمیرشده: $FIXED"
    echo "---"
    echo "دیسک:"; df -h / 2>/dev/null | tail -1
    echo "RAM:"; free -h 2>/dev/null | grep Mem
    echo "پورت‌های باز:"; ss -tuln 2>/dev/null | head -15
    echo "سرویس‌های خراب:"; systemctl --failed --no-pager 2>/dev/null | head -10
    echo "---"
    echo "ساخته شده از نورخیز استودیو"
  } > "$REPORT_FILE" 2>/dev/null || true
  ok "گزارش ذخیره شد: $REPORT_FILE"
}

# ═══════════════════════════════════════════════════════════════════════════
#  اجرا
# ═══════════════════════════════════════════════════════════════════════════
banner
log "حالت اجرا: check=$MODE_CHECK update=$MODE_UPDATE install=$MODE_INSTALL fix=$MODE_FIX ssh_only=$MODE_SSH_ONLY"

if [[ $MODE_SSH_ONLY -eq 1 ]]; then
  ssh_debug
else
  sys_info
  [[ $MODE_UPDATE -eq 1 ]]  && smart_update
  [[ $MODE_INSTALL -eq 1 ]] && { prereqs; runtimes; }
  ssh_debug
  network_debug
  resources_debug
  security_check
  [[ $MODE_FIX -eq 1 ]] && auto_fix
fi

make_report
footer
exit 0
