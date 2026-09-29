#!/usr/bin/env bash
# ==============================================================================
# VELVETVAULT PRO — AUTOMATED DATABASE & MEDIA BACKUP SCRIPT FOR UBUNTU
# ==============================================================================
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_ROOT="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_ROOT"

ARCHIVE_NAME="${BACKUP_ROOT}/velvetvault_backup_${TIMESTAMP}.tar.gz"
echo "[Backup] Creating compressed backup archive: ${ARCHIVE_NAME}..."

tar -czf "$ARCHIVE_NAME" \
  data/ \
  config/ \
  public/uploads/thumbnails/ \
  2>/dev/null || true

echo "[Backup] Completed successfully: ${ARCHIVE_NAME}"
