#!/usr/bin/env bash
# ==============================================================================
# VELVETVAULT PRO — AUTOMATED UBUNTU SERVER INSTALLER (v3.4.0)
# اسکریپت نصب خودکار پلتفرم استریم ویدیو بزرگسالان (دارای مجوز) روی سرور اوبونتو
# ==============================================================================
# Supported OS : Ubuntu 20.04 LTS, 22.04 LTS, 24.04 LTS (x86_64 / ARM64)
# Stack        : Node.js 22 LTS + Nginx (MP4/HLS Streaming) + FFmpeg + Systemd + UFW
# Usage        : sudo bash install.sh [options]
#                Options:
#                  --domain <domain.com>     Set domain name (default: server IP)
#                  --port <port>             Backend port (default: 3000)
#                  --admin-key <secret>      Custom Secret Admin Key
#                  --admin-path </path>      Custom Secret Admin Route
#                  --ssl                     Auto-install Let's Encrypt SSL
#                  --non-interactive         Run with defaults without prompts
# ==============================================================================

set -euo pipefail

# --- Terminal Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# --- Default Configuration ---
APP_NAME="velvetvault"
INSTALL_DIR="/var/www/velvetvault"
LOG_DIR="/var/log/velvetvault"
BACKUP_DIR="/var/backups/velvetvault"
APP_PORT=3000
DOMAIN_NAME=""
ADMIN_SECRET_KEY="VAULT-ADMIN-$(openssl rand -hex 3 2>/dev/null | tr '[:lower:]' '[:upper:]' || echo '2026PRO')"
ADMIN_MASTER_PIN="8899"
ADMIN_STEALTH_PATH="/vault-x9-control"
LICENSE_NUMBER="IR-AVOD-2026-99481-OFFICIAL"
ENABLE_SSL="false"
NON_INTERACTIVE="false"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Parse Command Line Arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN_NAME="$2"
      shift 2
      ;;
    --port)
      APP_PORT="$2"
      shift 2
      ;;
    --admin-key)
      ADMIN_SECRET_KEY="$2"
      shift 2
      ;;
    --admin-path)
      ADMIN_STEALTH_PATH="$2"
      shift 2
      ;;
    --ssl)
      ENABLE_SSL="true"
      shift
      ;;
    --non-interactive|-y)
      NON_INTERACTIVE="true"
      shift
      ;;
    *)
      echo -e "${YELLOW}[WARN] Unknown argument: $1${NC}"
      shift
      ;;
  esac
done

# --- Banner ---
clear || true
echo -e "${MAGENTA}${BOLD}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║   ██╗   ██╗███████╗██╗    ██╗   ██╗███████╗████████╗██╗   ██╗ █████╗ ██╗   ██╗║
║   ██║   ██║██╔════╝██║    ██║   ██║██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║   ██║║
║   ██║   ██║█████╗  ██║    ██║   ██║█████╗     ██║   ██║   ██║███████║██║   ██║║
║   ╚██╗ ██╔╝██╔══╝  ██║    ╚██╗ ██╔╝██╔══╝     ██║   ╚██╗ ██╔╝██╔══██║██║   ██║║
║    ╚████╔╝ ███████╗███████╗╚████╔╝ ███████╗   ██║    ╚████╔╝ ██║  ██║╚██████╔╝║
║     ╚═══╝  ╚══════╝╚══════╝ ╚═══╝  ╚══════╝   ╚═╝     ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ║
║                                                                              ║
║     ENTERPRISE 18+ ADULT VOD STREAMING PLATFORM — UBUNTU SERVER INSTALLER    ║
║        نصب‌کننده خودکار سایت فیلم بزرگسالان (دارای مجوز و پنل مخفی ادمین)     ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# --- 1. Root Check ---
if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}[ERROR] این اسکریپت باید با دسترسی root اجرا شود.${NC}"
  echo -e "${YELLOW}لطفاً دستور زیر را وارد کنید:${NC}"
  echo -e "  ${GREEN}sudo bash install.sh${NC}"
  exit 1
fi

# --- 2. Check Ubuntu OS ---
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  echo -e "${CYAN}[INFO] Detected Operating System: ${BOLD}${PRETTY_NAME}${NC}"
else
  echo -e "${YELLOW}[WARN] Could not verify /etc/os-release. Proceeding with Debian/Ubuntu defaults...${NC}"
fi

SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
if [[ -z "$DOMAIN_NAME" ]]; then
  DOMAIN_NAME="$SERVER_IP"
fi

# --- 3. Interactive Configuration Prompts (if not --non-interactive) ---
if [[ "$NON_INTERACTIVE" == "false" && -t 0 ]]; then
  echo -e "${BLUE}──────────────────────────────────────────────────────────────────────────────${NC}"
  echo -e "${BOLD}تنظیمات اولیه سرور اوبونتو (برای مقدار پیش‌فرض Enter بزنید):${NC}"
  echo -e "${BLUE}──────────────────────────────────────────────────────────────────────────────${NC}"

  read -rp "$(echo -e "${CYAN}1. دامنه یا آی‌پی سرور [${DOMAIN_NAME}]: ${NC}")" input_domain
  DOMAIN_NAME="${input_domain:-$DOMAIN_NAME}"

  read -rp "$(echo -e "${CYAN}2. پورت داخلی برنامه [${APP_PORT}]: ${NC}")" input_port
  APP_PORT="${input_port:-$APP_PORT}"

  read -rp "$(echo -e "${CYAN}3. رمز کلید پنل مخفی ادمین [${ADMIN_SECRET_KEY}]: ${NC}")" input_key
  ADMIN_SECRET_KEY="${input_key:-$ADMIN_SECRET_KEY}"

  read -rp "$(echo -e "${CYAN}4. آدرس مخفی پنل مدیریت [${ADMIN_STEALTH_PATH}]: ${NC}")" input_path
  ADMIN_STEALTH_PATH="${input_path:-$ADMIN_STEALTH_PATH}"

  read -rp "$(echo -e "${CYAN}5. شماره مجوز رسمی کشوری [${LICENSE_NUMBER}]: ${NC}")" input_license
  LICENSE_NUMBER="${input_license:-$LICENSE_NUMBER}"

  read -rp "$(echo -e "${CYAN}6. آیا گواهی SSL رایگان (Let's Encrypt) نصب شود؟ (y/N): ${NC}")" input_ssl
  if [[ "$input_ssl" =~ ^[Yy]$ ]]; then
    ENABLE_SSL="true"
  fi
  echo ""
fi

# --- 4. System Packages & Dependencies Installation ---
echo -e "${GREEN}[1/8] Updating Ubuntu apt repositories & installing core packages...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y \
  curl \
  wget \
  git \
  ufw \
  fail2ban \
  nginx \
  ffmpeg \
  openssl \
  ca-certificates \
  gnupg \
  lsb-release \
  htop \
  unzip

# --- 5. Install Node.js 22 LTS ---
echo -e "${GREEN}[2/8] Checking / Installing Node.js 22 LTS...${NC}"
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo -e "${CYAN}  -> Node.js version: $(node -v) | NPM version: $(npm -v)${NC}"
echo -e "${CYAN}  -> FFmpeg version:  $(ffmpeg -version | head -n 1)${NC}"

# --- 6. Setup Project Directories & Copy Files ---
echo -e "${GREEN}[3/8] Creating project directories & deploying files to ${INSTALL_DIR}...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"

if [[ "$SOURCE_DIR" != "$INSTALL_DIR" ]]; then
  cp -r "$SOURCE_DIR"/* "$INSTALL_DIR"/
fi

mkdir -p "$INSTALL_DIR/public/uploads/videos"
mkdir -p "$INSTALL_DIR/public/uploads/thumbnails"
mkdir -p "$INSTALL_DIR/public/uploads/hls"
mkdir -p "$INSTALL_DIR/data"
mkdir -p "$INSTALL_DIR/logs"

# --- 7. Generate Production .env File ---
echo -e "${GREEN}[4/8] Generating production .env configuration...${NC}"
cat > "$INSTALL_DIR/.env" <<EOF
# Auto-generated by VelvetVault Ubuntu Installer on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
NODE_ENV=production
PORT=${APP_PORT}
HOST=0.0.0.0
DOMAIN=${DOMAIN_NAME}

# Secret Admin Vault Credentials
ADMIN_SECRET_KEY=${ADMIN_SECRET_KEY}
ADMIN_MASTER_PIN=${ADMIN_MASTER_PIN}
ADMIN_STEALTH_PATH=${ADMIN_STEALTH_PATH}
ADMIN_SESSION_TTL_HOURS=24

# Official National License & Compliance
LICENSE_ACTIVE=true
LICENSE_NUMBER=${LICENSE_NUMBER}
LICENSE_AUTHORITY=National Digital Media & Adult Content Regulatory Board
AGE_VERIFICATION_REQUIRED=true
MINIMUM_AGE=18

# Media & Streaming
MAX_UPLOAD_SIZE_MB=10240
UPLOAD_DIR=${INSTALL_DIR}/public/uploads
ENABLE_HLS_TRANSCODING=true
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# Security
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=250
ENABLE_HOTLINK_PROTECTION=false
EOF

chmod 600 "$INSTALL_DIR/.env"
chmod +x "$INSTALL_DIR"/deploy/scripts/*.sh 2>/dev/null || true

# --- 8. Configure Systemd Service ---
echo -e "${GREEN}[5/8] Registering Ubuntu systemd service (${APP_NAME}.service)...${NC}"
cat > "/etc/systemd/system/${APP_NAME}.service" <<EOF
[Unit]
Description=VelvetVault Pro — Enterprise Adult VOD Streaming Server
Documentation=https://github.com/velvetvault/streaming-cms
After=network.target nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=/usr/bin/node ${INSTALL_DIR}/server.js
Restart=always
RestartSec=3
StandardOutput=append:${LOG_DIR}/access.log
StandardError=append:${LOG_DIR}/error.log
LimitNOFILE=65535

# Hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${APP_NAME}.service"
systemctl restart "${APP_NAME}.service"

# --- 9. Configure Nginx Reverse Proxy & High-Speed Video Streaming ---
echo -e "${GREEN}[6/8] Configuring Nginx for 4K MP4/HLS Video Streaming...${NC}"
cat > "/etc/nginx/sites-available/${APP_NAME}.conf" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME};

    # Allow large 4K video uploads up to 10GB
    client_max_body_size 10G;
    client_body_timeout 3600s;
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Adult-Compliance "RTA-5042-1996-1400-1577-RTA" always;

    # Direct High-Speed Serving for Uploaded MP4 & HLS Segments
    location /uploads/ {
        alias ${INSTALL_DIR}/public/uploads/;
        mp4;
        mp4_buffer_size 4m;
        mp4_max_buffer_size 20m;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        add_header Access-Control-Allow-Origin "*";
    }

    # Main Application Reverse Proxy
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

ln -sf "/etc/nginx/sites-available/${APP_NAME}.conf" "/etc/nginx/sites-enabled/${APP_NAME}.conf"
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# --- 10. Configure UFW Firewall ---
echo -e "${GREEN}[7/8] Configuring Ubuntu UFW Firewall rules...${NC}"
ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw allow "${APP_PORT}/tcp" >/dev/null 2>&1 || true

# --- 11. Optional Let's Encrypt SSL ---
if [[ "$ENABLE_SSL" == "true" ]]; then
  echo -e "${GREEN}[8/8] Installing Certbot & requesting Let's Encrypt SSL certificate...${NC}"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "${DOMAIN_NAME}" --non-interactive --agree-tos -m "admin@${DOMAIN_NAME}" --redirect || \
    echo -e "${YELLOW}[WARN] SSL setup skipped or failed (ensure DNS A record points to ${SERVER_IP}).${NC}"
else
  echo -e "${GREEN}[8/8] Skipping SSL (HTTP active; run 'certbot --nginx' anytime later).${NC}"
fi

# --- 12. Create Global Helper CLI 'velvet-cli' ---
cat > /usr/local/bin/velvet-cli <<EOF
#!/usr/bin/env bash
case "\$1" in
  status)  systemctl status ${APP_NAME} ;;
  restart) systemctl restart ${APP_NAME} && echo "VelvetVault restarted." ;;
  logs)    tail -f ${LOG_DIR}/access.log ${LOG_DIR}/error.log ;;
  backup)  bash ${INSTALL_DIR}/deploy/scripts/backup.sh ;;
  key)     grep ADMIN_SECRET_KEY ${INSTALL_DIR}/.env ;;
  *)
    echo "Usage: velvet-cli {status|restart|logs|backup|key}"
    ;;
esac
EOF
chmod +x /usr/local/bin/velvet-cli

# --- Final Output Summary ---
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║            ✅ نصب پلتفرم VELVETVAULT با موفقیت به پایان رسید!                ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}  🌐 آدرس سایت (Public URL)         :${NC} ${BOLD}http://${DOMAIN_NAME}/${NC}"
echo -e "${CYAN}  🔌 آدرس مستقیم پورت (Direct Port)  :${NC} ${BOLD}http://${SERVER_IP}:${APP_PORT}/${NC}"
echo -e "${MAGENTA}  🔐 مسیر پنل مخفی ادمین (Stealth)   :${NC} ${BOLD}http://${DOMAIN_NAME}${ADMIN_STEALTH_PATH}${NC}"
echo -e "${MAGENTA}  ⌨️  میانبر کیبورد پنل مخفی         :${NC} ${BOLD}Ctrl + Shift + A (یا 5 بار کلیک روی نشان مجوز فوتر)${NC}"
echo -e "${YELLOW}  🔑 کلید امنیتی ادمین (Secret Key)  :${NC} ${BOLD}${ADMIN_SECRET_KEY}${NC}"
echo -e "${YELLOW}  🔢 پین کد مستر (Master PIN)       :${NC} ${BOLD}${ADMIN_MASTER_PIN}${NC}"
echo -e "${GREEN}  📜 شماره مجوز رسمی ثبت شده         :${NC} ${BOLD}${LICENSE_NUMBER}${NC}"
echo -e "${BLUE}──────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${BOLD}دستورات مدیریت سرور اوبونتو:${NC}"
echo -e "  • وضعیت سرویس : ${GREEN}velvet-cli status${NC}   (یا ${GREEN}systemctl status velvetvault${NC})"
echo -e "  • ری‌استارت    : ${GREEN}velvet-cli restart${NC}"
echo -e "  • مشاهده لاگ‌ها : ${GREEN}velvet-cli logs${NC}"
echo -e "  • بکاپ خودکار : ${GREEN}velvet-cli backup${NC}"
echo -e "${BLUE}──────────────────────────────────────────────────────────────────────────────${NC}"
