#!/usr/bin/env bash
# ==============================================================================
# VELVETVAULT PRO — UBUNTU SERVER & STREAM HEALTH MONITOR
# ==============================================================================
set -euo pipefail

PORT="${PORT:-3000}"
HEALTH_URL="http://127.0.0.1:${PORT}/api/system/health"

echo "Checking VelvetVault API health at ${HEALTH_URL}..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [[ "$RESPONSE" == "200" ]]; then
  echo "[OK] VelvetVault Streaming Engine is ONLINE (HTTP 200)."
  exit 0
else
  echo "[ALERT] VelvetVault responded with HTTP ${RESPONSE}. Attempting auto-restart..."
  if command -v systemctl &>/dev/null; then
    systemctl restart velvetvault.service || true
  fi
  exit 1
fi
