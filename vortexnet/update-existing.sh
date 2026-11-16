#!/usr/bin/env bash
# Update an existing VortexNet installation with a local, private backup first.
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
[[ -f /opt/vortexnet/server/data/config.json ]] || { echo 'Existing VortexNet installation not found; update stopped.' >&2; exit 1; }
shop=0
chat=0
systemctl is-active --quiet vortexnet && shop=1
systemctl is-active --quiet gavidchat && chat=1
restart_services() {
  local result=0
  if (( shop )); then systemctl start vortexnet || result=1; fi
  if (( chat )); then systemctl start gavidchat || result=1; fi
  return "$result"
}
trap 'restart_services || echo "Could not restart a service; check systemctl status." >&2' EXIT
if (( shop )); then systemctl stop vortexnet; fi
if (( chat )); then systemctl stop gavidchat; fi
paths=()
for p in opt/vortexnet opt/gavidchat etc/nginx etc/letsencrypt; do
  [[ ! -e /$p ]] || paths+=("$p")
done
backup="/root/vortex-backup-$(date +%Y%m%d-%H%M%S)-$$.tar.gz"
echo "Creating private backup: $backup"
tar -C / -czf "$backup" "${paths[@]}"
restart_services
trap - EXIT
printf 'Backup complete: %s\n' "$backup"
bash "$SRC/install-ubuntu22.sh"
