# راهنمای نصب روی سرور لینوکس (Ubuntu / Debian) — بهینه برای سرور ۲ گیگ رم

پلتفرم NORKHIZ STUDIO با PHP 8.2+ و MySQL 8 ساخته شده است. این مستندات برای سرور با **حدود ۲ گیگابای رم** و **لوکیشن ایران (تایم‌زون تهران)** تنظیم شده‌اند.

> ⚠️注意: روی سرور ۲ گیگی، همزمان اجرای MySQL + PHP-FPM + Nginx + Redis سخت است. اگر امکان دارد، Redis را غیرفعال کنید یا از یک سرور کش جداگانه استفاده کنید.

## ۱. پیش‌نیازهای سرور

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring \
  php8.2-curl php8.2-zip php8.2-gd php8.2-intl php8.2-bcmath \
  mysql-server ffmpeg ffprobe composer git unzip
```

> Redis به صورت اخلایی است؛ روی ۲ گیگ رم می‌تواند الرم را很快 پر کند. اگر symbolic link به Redis نیاز ندارید، این مرحله را رد کنید.

### تایم‌زون و Locale ایران

```bash
sudo timedatectl set-timezone Asia/Tehran
sudo localedef -i fa_IR -f UTF-8 fa_IR.UTF-8  # اگر locales نصب است
```

## ۲. دیتابیس MySQL 8

```sql
CREATE DATABASE norkhiz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'norkhiz'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON norkhiz.* TO 'norkhiz'@'localhost';
FLUSH PRIVILEGES;
```

جدول‌ها را import کنید:

```bash
mysql -u norkhiz -p norkhiz < api/database/schema.sql
```

## ۳. بهینه‌سازی MySQL برای ۲ گیگ رم (`/etc/mysql/mysql.conf.d/mysqld.cnf`)

```ini
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+03:30'   # تهران

innodb_buffer_pool_size = 512M   # حدود ۲۵٪ رم برای InnoDB
innodb_log_file_size = 128M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

max_connections = 50
query_cache_type = 1
query_cache_size = 32M

tmp_table_size = 64M
max_heap_table_size = 64M

# غیرفعال‌سازی perforance_schema برای حفظ رم (اختیاری)
performance_schema = OFF
```

```bash
sudo systemctl restart mysql
```

## ۴. بهینه‌سازی PHP-FPM برای ۲ گیگ رم

### `/etc/php/8.2/fpm/php.ini`

```ini
memory_limit = 256M
upload_max_filesize = 512M
post_max_size = 512M
max_execution_time = 120
max_input_time = 120
date.timezone = Asia/Tehran
mbstring.internal_encoding = UTF-8
mbstring.http_output = UTF-8
default_charset = "UTF-8"
expose_php = Off
```

### `opcache` (`/etc/php/8.2/fpm/conf.d/10-opcache.ini`)

```ini
zend_extension=opcache
opcache.enable=1
opcache.enable_cli=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=32
opcache.max_accelerated_files=4000
opcache.revalidate_freq=60
opcache.fast_shutdown=1
opcache.validate_timestamps=1
```

### PHP-FPM pool (`/etc/php/8.2/fpm/pool.d/www.conf`)

```ini
pm = dynamic
pm.max_children = 15
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests = 500
listen = /run/php/php8.2-fpm.sock
listen.owner = www-data
listen.group = www-data
```

```bash
sudo systemctl restart php8.2-fpm
```

## ۵. Nginx (`/etc/nginx/sites-available/norkhiz`)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    root /var/www/norkhiz/public;
    index index.php;

    client_max_body_size 512M;

    location / {
        try_files $uri $uri/ /api/index.php?$query_string;
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

    # کش استاتیک (تصاویر، CSS، JS)
    location ~* \.(css|js|svg|jpg|jpeg|png|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/norkhiz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

## ۶. Redis (اختیاری و خطرناک روی ۲ گیگ)

اگر حتماً نیاز به Redis دارید:

```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
```

در `.env`:

```
CACHE_DRIVER=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

> اگر الرم تمام شد، Redis را پاک کنید: `sudo apt remove --purge redis-server`

## ۷. متغیرهای محیطی (`api/.env`)

```ini
APP_ENV=production
APP_URL=https://your-domain.com
APP_KEY=change-this-to-32-random-chars

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=norkhiz
DB_USERNAME=norkhiz
DB_PASSWORD=STRONG_PASSWORD

SESSION_LIFETIME=120
TIMEZONE=Asia/Tehran
LOCALE=fa

MAX_UPLOAD_MB=512
STORAGE_PATH=/var/www/norkhiz/storage
```

## ۸. symbolic link و مجوزها

```bash
sudo mkdir -p /var/www/norkhiz/storage/uploads /var/www/norkhiz/storage/hls /var/www/norkhiz/storage/videos
sudo chown -R www-data:www-data /var/www/norkhiz
sudo chmod -R 755 /var/www/norkhiz
sudo chmod -R 777 /var/www/norkhiz/storage/uploads
sudo chmod -R 777 /var/www/norkhiz/storage/hls
```

## ۹. FFmpeg — تبدیل ویدیو به HLS

```bash
ffmpeg -i input.mp4 -profile:v baseline -level 3.0 -s 640x360 \
  -c:a aac -b:a 96k -start_number 0 -hls_time 10 -hls_list_size 0 -f hls output_360.m3u8

ffmpeg -i input.mp4 -vf scale=854:480 -c:a aac -b:a 96k \
  -start_number 0 -hls_time 10 -hls_list_size 0 -f hls output_480.m3u8
```

> روی ۲ گیگ رم، FFmpeg می‌تواند symbolically seluruh الرم را مصرف کند. تبدیل ویدیوها را به صورت یک‌تای (وQueue) اجرا کنید، همزمان چندFFmpeg اجرا نکنید.

## ۱۰. امنیت

- Rate-limiting برای ورود/ثبت‌نام/جستجو (Fail2Ban یا Nginx `limit_req`)
- CSRF توکن در تمام فرم‌های POST
- prepared statements (PDO) — از قبل در کد PHP است
- Validation نوع فایل آپلودی (MIME + extension)
- فایل‌های ویدیو خارج از web root (`storage/`) و streams از طریق `/api/stream`
- SSL/TLS با Let's Encrypt (`certbot`)

## ۱۱. تنظیمات برای اینترنت ایران

- تصاویر را به فرمت WebP تبدیل کنید و در فرانت‌اند از `loading="lazy"` استفاده کنید.
- ویدیوها را با HLS broken到 段 chunk شده بفرستید تا روی اینترنت‌های fluctuating ایران پخش روان داشته باشند.
- تایم‌zon `Asia/Tehran` در همه لایه‌ها (PHP، MySQL، JavaScript) فعال است.

## ۱۲. بررسی سلامت سرور

```bash
php -v
nginx -t
mysql -e "SELECT 1;"
free -h
```

سایت در `https://your-domain.com/index.html` در دسترس خواهد بود.