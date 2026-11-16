#!/usr/bin/env bash
# VORTEXNET standalone installer for a dedicated Ubuntu 22.04 VPS.
set -Eeuo pipefail
export DEBIAN_FRONTEND=noninteractive
umask 077
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP=/opt/vortexnet
DOMAIN=www.vortexnett.shop
SSL_EMAIL=${SSL_EMAIL:-none}
err() { echo "ERROR: $*" >&2; exit 1; }
trap 'echo "Installation failed at line $LINENO. See the output above; fix the issue and rerun." >&2' ERR
[[ $EUID -eq 0 ]] || err 'Run as root: sudo bash vortexnet/install-ubuntu22.sh'
source /etc/os-release
[[ ${ID:-} == ubuntu && ${VERSION_ID:-} == 22.04 ]] || err 'This installer requires Ubuntu 22.04.'
[[ "$SRC" != "$APP" ]] || err 'Run the installer from the downloaded source directory, not /opt/vortexnet.'
[[ "$SSL_EMAIL" == none || "$SSL_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || err 'Invalid SSL_EMAIL.'

# Ask only for a new admin; existing password and shop data are never replaced.
need_admin=1
if [[ -f "$APP/server/data/config.json" ]]; then
  # Ubuntu provides python3 by default; invalid JSON is an error, not a fresh install.
  if python3 -c 'import json,sys; sys.exit(0 if json.load(open(sys.argv[1])).get("adminPassHash") else 1)' "$APP/server/data/config.json"; then need_admin=0
  else python3 -m json.tool "$APP/server/data/config.json" >/dev/null || err 'Existing config.json is invalid. Restore it from backup.'; fi
fi
password=''
if (( need_admin )); then
  if [[ -n ${ADMIN_PASSWORD_FILE:-} ]]; then
    [[ -f $ADMIN_PASSWORD_FILE ]] || err 'ADMIN_PASSWORD_FILE not found.'
    password=$(cat "$ADMIN_PASSWORD_FILE")
  else
    [[ -t 0 ]] || err 'Use an interactive terminal or set ADMIN_PASSWORD_FILE to a protected file.'
    read -r -s -p 'Choose admin password (at least 10 characters): ' password; echo
    read -r -s -p 'Repeat admin password: ' password2; echo
    [[ "$password" == "$password2" ]] || err 'Passwords do not match.'
    unset password2
  fi
  [[ ${#password} -ge 10 ]] || err 'Admin password must be at least 10 characters.'
fi

echo 'Installing required packages...'
apt-get update
apt-get install -y ca-certificates curl gnupg nginx certbot rsync python3
if ! command -v node >/dev/null || [[ $(node -p 'Number(process.versions.node.split(".")[0])') -lt 18 ]] || ! command -v npm >/dev/null; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --batch --yes --dearmor -o /etc/apt/keyrings/vortexnet-nodesource.gpg
  chmod 644 /etc/apt/keyrings/vortexnet-nodesource.gpg
  echo 'deb [signed-by=/etc/apt/keyrings/vortexnet-nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main' > /etc/apt/sources.list.d/vortexnet-nodesource.list
  apt-get update
  apt-get install -y nodejs
fi
[[ -x /usr/bin/node ]] || err 'Expected Node.js at /usr/bin/node.'
id vortexnet >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin vortexnet
install -d -m 755 "$APP" "$APP/server" /var/www/vortexnet /var/www/vortexnet-acme
install -d -o vortexnet -g vortexnet -m 700 "$APP/server/data"
# Never copy or delete runtime data; the source tree contains no secrets.
rsync -a --delete --exclude '/server/data/' --exclude '/server/.env' --exclude '/node_modules/' --exclude '/dist/' "$SRC/" "$APP/"
# Archive extraction and rsync preserve restrictive source permissions. The
# unprivileged service must be able to traverse the app and read its code,
# but its private data directory must remain inaccessible to other users.
chmod 755 "$APP" "$APP/server"
chmod 644 "$APP/package.json" "$APP/server/server.mjs" "$APP/server/admin.html"
cd "$APP"
if (( need_admin )); then printf '%s' "$password" | node deploy/init-admin.mjs "$APP/server/data/config.json"; unset password; fi
chown -R vortexnet:vortexnet "$APP/server/data"
chmod 700 "$APP/server/data"
find "$APP/server/data" -type f -exec chmod 600 {} +
env -u VITE_BASE -u BASE_PATH npm ci --no-audit --no-fund
env -u VITE_BASE -u BASE_PATH npm run build
rsync -a --delete dist/ /var/www/vortexnet/
chmod -R a+rX /var/www/vortexnet
install -m 644 deploy/vortexnet.service /etc/systemd/system/vortexnet.service
systemctl daemon-reload
systemctl enable vortexnet
if [[ ${VORTEXNET_APPLY_PAYMENT_CARD:-0} == 1 ]]; then
  # Stop the running API first, so its in-memory configuration cannot race
  # this targeted update. Preserve all other settings and customer data.
  systemctl stop vortexnet
  if ! node deploy/set-payment-card.mjs "$APP/server/data/config.json"; then
    systemctl start vortexnet || true
    err 'Could not update the card; the previous service was restarted.'
  fi
  chown vortexnet:vortexnet "$APP/server/data/config.json"
  chmod 600 "$APP/server/data/config.json"
fi
systemctl restart vortexnet
# systemd's Type=simple reports started before Node is listening. Wait for it.
backend_ready=0
for attempt in {1..30}; do
  if systemctl is-active --quiet vortexnet && curl --fail --silent --max-time 2 http://127.0.0.1:9273/healthz >/dev/null; then
    backend_ready=1
    break
  fi
  sleep 1
done
if (( ! backend_ready )); then
  systemctl status vortexnet --no-pager -l || true
  journalctl -u vortexnet -n 50 --no-pager || true
  err 'Backend did not become ready. Check the service logs above and retry.'
fi

# Do not replace an existing HTTPS configuration during renewal/retry.
SITE=/etc/nginx/sites-available/vortexnet
if [[ ! -e "$SITE" ]]; then install -m 644 deploy/nginx-http.conf "$SITE"; fi
ln -sfn "$SITE" /etc/nginx/sites-enabled/vortexnet
nginx -t
systemctl enable --now nginx
systemctl reload nginx
if command -v ufw >/dev/null && ufw status | grep -q '^Status: active'; then ufw allow 80/tcp; ufw allow 443/tcp; fi
if [[ "$SSL_EMAIL" == none ]]; then email_args=(--register-unsafely-without-email); else email_args=(-m "$SSL_EMAIL"); fi
echo "Requesting certificate for $DOMAIN; DNS must point to 176.97.218.219 and port 80 must be reachable."
certbot certonly --webroot -w /var/www/vortexnet-acme -d "$DOMAIN" --cert-name "$DOMAIN" --non-interactive --agree-tos --keep-until-expiring "${email_args[@]}"
# Restore the previous configuration if validation fails.
backup=$(mktemp)
cp "$SITE" "$backup"
install -m 644 deploy/nginx-https.conf "$SITE"
# Preserve the separately installed GAVIDCHAT route during shop updates.
if [[ -f /etc/nginx/snippets/gavidchat.conf ]]; then
  sed -i '/    location = \/admin {/i\    include /etc/nginx/snippets/gavidchat.conf;' "$SITE"
fi
if ! nginx -t; then cp "$backup" "$SITE"; rm -f "$backup"; err 'Nginx configuration invalid; previous configuration restored.'; fi
rm -f "$backup"
systemctl reload nginx
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/vortexnet-nginx
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/vortexnet-nginx
systemctl enable --now certbot.timer
printf '\nSite: https://%s/\nAdmin: https://%s/admin\n' "$DOMAIN" "$DOMAIN"
echo 'Verify the payment card and configure Pasarguard in the admin panel before accepting orders.'
