#!/usr/bin/env bash
# ==============================================================================
# VELVETVAULT PRO — UBUNTU UNINSTALLER & CLEANUP SCRIPT
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}[ERROR] Please run with sudo: sudo bash uninstall.sh${NC}"
  exit 1
fi

echo -e "${YELLOW}[INFO] Stopping and removing VelvetVault service...${NC}"
systemctl stop velvetvault.service 2>/dev/null || true
systemctl disable velvetvault.service 2>/dev/null || true
rm -f /etc/systemd/system/velvetvault.service
systemctl daemon-reload

echo -e "${YELLOW}[INFO] Removing Nginx virtual host...${NC}"
rm -f /etc/nginx/sites-enabled/velvetvault.conf
rm -f /etc/nginx/sites-available/velvetvault.conf
nginx -t && systemctl reload nginx || true

rm -f /usr/local/bin/velvet-cli
echo -e "${GREEN}[OK] VelvetVault services removed. Media & database preserved in /var/www/velvetvault.${NC}"
