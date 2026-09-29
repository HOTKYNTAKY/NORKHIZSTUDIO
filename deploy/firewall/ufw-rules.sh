#!/usr/bin/env bash
# ==============================================================================
# VELVETVAULT PRO — UBUNTU UFW & ANTI-DDOS FIREWALL RULES
# ==============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash deploy/firewall/ufw-rules.sh"
  exit 1
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH Access'
ufw allow 80/tcp comment 'HTTP Web & Stream'
ufw allow 443/tcp comment 'HTTPS SSL Stream'
ufw allow 3000/tcp comment 'VelvetVault Direct Node Port'
ufw --force enable
ufw status verbose
