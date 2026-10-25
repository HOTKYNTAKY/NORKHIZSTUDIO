#!/bin/bash
# =============================================================================
# NORKHIZ STUDIO — Automated Installer for Ubuntu/Debian (2GB RAM optimized)
# Target domain: https://iran.vortexnett.shop
# One-liner: curl -sL <GOOGLE_DRIVE_URL> | bash
# =============================================================================
set -e

DOMAIN="iran.vortexnett.shop"
WEBROOT="/var/www/norkhiz"
DB_NAME="norkhiz"
DB_USER="norkhiz"
# Random secure DB password
DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)

echo "=============================================="
echo "  NORKHIZ STUDIO — Automated Installer"
echo "  Domain: $DOMAIN"
echo "=============================================="

# ---- 1. Detect OS ----
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS. Exiting."
    exit 1
fi

echo "[1/10] Updating system..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# ---- 2. Add PHP repository (needed for php8.2 packages) ----
echo "[2/10] Adding PHP repository..."
apt-get update -y
apt-get install -y software-properties-common
add-apt-repository ppa:ondrej/php -y || true
apt-get update -y

# ---- 3. Install dependencies ----
echo "[3/10] Installing dependencies (nginx, php8.2, mysql, ffmpeg, composer, certbot)..."
apt-get install -y \
    nginx \
    php8.2-fpm \
    php8.2-mysql \
    php8.2-xml \
    php8.2-mbstring \
    php8.2-curl \
    php8.2-zip \
    php8.2-gd \
    php8.2-intl \
    php8.2-bcmath \
    mysql-server \
    ffmpeg \
    composer \
    git \
    unzip \
    curl \
    certbot \
    python3-certbot-nginx \
    openssl

# ---- 3. Timezone Tehran ----
echo "[3/10] Setting timezone to Asia/Tehran..."
timedatectl set-timezone Asia/Tehran || true

# ---- 4. Download project from Google Drive ----
echo "[4/10] Downloading project from Google Drive..."
GDRIVE_FILE_ID="1dhrMEkLehppXN_4VDy5tcLyjwxXFFpeM"
DOWNLOAD_URL="https://drive.google.com/uc?id=${GDRIVE_FILE_ID}&export=download"

mkdir -p /tmp/norkhiz_dl
curl -sL -o /tmp/norkhiz_dl/project.zip "$DOWNLOAD_URL"

# Handle Google Drive virus scan warning (confirm token)
if grep -q "confirm=" /tmp/norkhiz_dl/project.zip 2>/dev/null; then
    CONFIRM_TOKEN=$(grep -o 'confirm=[a-zA-Z0-9_-]*' /tmp/norkhiz_dl/project.zip | head -1 | cut -d'=' -f2)
    curl -sL -o /tmp/norkhiz_dl/project.zip "${DOWNLOAD_URL}&confirm=${CONFIRM_TOKEN}"
fi

if ! file /tmp/norkhiz_dl/project.zip | grep -qi zip; then
    echo "ERROR: Downloaded file is not a valid ZIP. Check Google Drive link."
    exit 1
fi

# ---- 5. Extract to webroot ----
echo "[5/10] Extracting project to $WEBROOT..."
rm -rf "$WEBROOT"
mkdir -p "$WEBROOT"
unzip -o /tmp/norkhiz_dl/project.zip -d /tmp/norkhiz_dl/extracted
# Find the actual project folder inside zip
PROJECT_DIR=$(find /tmp/norkhiz_dl/extracted -maxdepth 2 -type d -name "NORKHIZSTUDIO" | head -1)
if [ -z "$PROJECT_DIR" ]; then
    # fallback: use extracted root
    PROJECT_DIR="/tmp/norkhiz_dl/extracted"
fi
cp -r "$PROJECT_DIR"/* "$WEBROOT"/
rm -rf "$WEBROOT/server/node_modules"  # not needed on server

# ---- 6. MySQL setup ----
echo "[6/10] Configuring MySQL 8..."
# Optimize my.cnf for 2GB RAM
cat > /etc/mysql/mysql.conf.d/mysqld.cnf <<MYSQLCNF
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+03:30'

innodb_buffer_pool_size = 512M
innodb_log_file_size = 128M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

max_connections = 50
query_cache_type = 1
query_cache_size = 32M
tmp_table_size = 64M
max_heap_table_size = 64M
performance_schema = OFF
MYSQLCNF

service mysql restart || systemctl restart mysql

# Wait for mysql
for i in {1..30}; do
    if mysqladmin ping -u root 2>/dev/null | grep -q "alive"; then break; fi
    sleep 1
done

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

# Import schema
if [ -f "$WEBROOT/api/database/schema.sql" ]; then
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$WEBROOT/api/database/schema.sql"
fi

# ---- 7. PHP-FPM optimization for 2GB ----
echo "[7/10] Optimizing PHP-FPM for 2GB RAM..."
cat > /etc/php/8.2/fpm/php.ini <<'PHPI'
engine = On
short_open_tag = Off
precision = 14
output_buffering = 4096
zlib.output_compression = Off
implicit_flush = Off
unserialize_callback_func =
serialize_precision = 17
disable_functions =
disable_classes =
zend.enable_gc = On
expose_php = Off
max_input_time = 120
variables_order = "GPCS"
request_order = "GP"
register_argc_argv = Off
auto_globals_jit = On
post_max_size = 512M
auto_prepend_file =
auto_append_file =
default_mimetype = "text/html"
default_charset = "UTF-8"
doc_root =
user_dir =
enable_dl = Off
file_uploads = On
upload_max_filesize = 512M
max_file_uploads = 20
allow_url_fopen = On
allow_url_include = Off
default_socket_timeout = 60
date.timezone = Asia/Tehran
[CLI Server]
cli_server.color = On
[Date]
filter.default = unsafe_raw
[mbstring]
mbstring.language = neutral
mbstring.internal_encoding = UTF-8
mbstring.http_output = UTF-8
mbstring.encoding_translation = Off
mbstring.detect_order = auto
mbstring.substitute_character = none
[gd]
[exif]
[Tidy]
[soap]
[sysvshm]
[sysvsem]
[bcmath]
bcmath.scale = 0
[Session]
session.save_handler = files
session.use_strict_mode = 0
session.use_cookies = 1
session.use_only_cookies = 1
session.name = PHPSESSID
session.auto_start = 0
session.cookie_lifetime = 0
session.cookie_path = /
session.cookie_domain =
session.cookie_httponly = 1
session.serialize_handler = php
session.gc_probability = 0
session.gc_divisor = 1000
session.gc_maxlifetime = 1440
session.referer_check =
session.cache_limiter = nocache
session.cache_expire = 180
session.use_trans_sid = 0
session.sid_length = 32
session.trans_sid_tags = "a=href,area=href,frame=src,form="
session.sid_bits_per_character = 4
[Assertion]
zend.assertions = -1
[Zend Opcache]
opcache.enable=1
opcache.enable_cli=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=32
opcache.max_accelerated_files=4000
opcache.revalidate_freq=60
opcache.fast_shutdown=1
opcache.validate_timestamps=1
PHPI

cat > /etc/php/8.2/fpm/pool.d/www.conf <<'PHPFPM'
[www]
user = www-data
group = www-data
listen = /run/php/php8.2-fpm.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 15
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests = 500
PHPFPM

systemctl restart php8.2-fpm

# ---- 8. Nginx config ----
echo "[8/10] Configuring Nginx for $DOMAIN..."
cat > /etc/nginx/sites-available/norkhiz <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    root $WEBROOT/public;
    index index.php;

    client_max_body_size 512M;

    location / {
        try_files \$uri \$uri/ /api/index.php?\$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_buffering on;
        fastcgi_buffer_size 8k;
        fastcgi_buffers 4 8k;
        fastcgi_connect_timeout 10s;
        fastcgi_send_timeout 120s;
        fastcgi_read_timeout 120s;
    }

    location ~ /\.ht { deny all; }
    location ~ /(api|storage|vendor) { deny all; }

    location ~* \.(css|js|svg|jpg|jpeg|png|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
NGINX

ln -sf /etc/nginx/sites-available/norkhiz /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# ---- 9. .env file ----
echo "[9/10] Creating environment file..."
APP_KEY=$(openssl rand -hex 16)
cat > "$WEBROOT/api/.env" <<ENV
APP_ENV=production
APP_URL=https://$DOMAIN
APP_KEY=$APP_KEY

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=$DB_NAME
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASS

SESSION_LIFETIME=120
TIMEZONE=Asia/Tehran
LOCALE=fa

MAX_UPLOAD_MB=512
STORAGE_PATH=$WEBROOT/storage
ENV

# ---- 10. Storage permissions ----
echo "[10/10] Setting permissions..."
mkdir -p "$WEBROOT/storage/uploads" "$WEBROOT/storage/hls" "$WEBROOT/storage/videos"
chown -R www-data:www-data "$WEBROOT"
chmod -R 755 "$WEBROOT"
chmod -R 777 "$WEBROOT/storage/uploads" "$WEBROOT/storage/hls" "$WEBROOT/storage/videos"

# ---- SSL with Certbot ----
echo ""
echo "=============================================="
echo "  Requesting SSL certificate via Certbot..."
echo "=============================================="
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || {
    echo "WARNING: Certbot failed. Site will run on HTTP only for now."
}

systemctl restart nginx php8.2-fpm mysql

echo ""
echo "=============================================="
echo "  INSTALLATION COMPLETE!"
echo "=============================================="
echo "  Site URL:      https://$DOMAIN"
echo "  DB Name:       $DB_NAME"
echo "  DB User:       $DB_USER"
echo "  DB Password:   $DB_PASS   (save this!)"
echo "  Webroot:       $WEBROOT"
echo "  Env file:      $WEBROOT/api/.env"
echo "=============================================="
echo ""
echo "  Next steps:"
echo "  1. Open https://$DOMAIN in your browser"
echo "  2. For backend API, point your app to https://$DOMAIN/api"
echo "=============================================="