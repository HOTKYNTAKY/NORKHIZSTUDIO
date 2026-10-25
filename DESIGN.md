# UI/UX Design System — NORKHIZ STUDIO (Premium Adult Video Platform)

> ظاهر کلی: لوکس، سکسی، مدرن، حرفه‌ای — حس پلتفرم پریمیوم، نه یک سایت معمولی.

## ۱. رنگ‌پلت (Color Palette) — تم تاریک لوکس

| متغیر | مقدار | کاربرد |
|--------|-------|--------|
| `--bg-deep` | `#030305` | Background اصلی (مشکی عمیق) |
| `--bg-body` | `#07070a` | سطح بدنه صفحات |
| `--surface` | `#0f0f16` | کارت‌ها، پینل‌ها، منوها |
| `--surface-2` | `#141420` | لایه ثانویه شیشه‌ای |
| `--purple-dark` | `#1a0a2e` | بنفش تیره — لایه‌هایbackground |
| `--neon-pink` | `#ff0055` | صورتی نئونی — 액شن، هاور، دکمه‌های اصلی |
| `--neon-pink-soft` | `#ff4d88` | variantes شafaاف |
| `--gold` | `#d4af37` | طلایی ملایم — VIP، نشان‌های ویژه |
| `--gold-soft` | `#e8c06a` | نسخه روشنی طلایی |
| `--text` | `#ffffff` | متن اصلی |
| `--text-muted` | `#9a9aae` | متن ثانویه، متادیتا |
| `--text-dim` | `#6b6b80` | متن غیرفعال / placeholders |
| `--glass` | `rgba(255,255,255,0.04)` | پس‌زمینه شیشه‌ای |
| `--glass-border` | `rgba(255,255,255,0.10)` | حاشیه شیشه‌ای |
| `--glass-border-hover` | `rgba(255,77,136,0.35)` | حاشیه در حالت هاور (صورتی) |
| `--shadow-soft` | `0 8px 32px rgba(0,0,0,0.55)` | سایه نرم |
| `--shadow-glow` | `0 0 30px rgba(255,0,85,0.25)` | هلو_images colors |

گرادیانت Principals:
- `linear-gradient(135deg, #030305 0%, #1a0a2e 50%, #030305 100%)` —background hlavní
- `linear-gradient(180deg, rgba(26,10,46,0.6) 0%, rgba(3,3,5,0) 60%)` —มASK hero

## ۲. FONT (فونت‌ها)

- **فونت اصلی:** Vazirmatn (웹 فونت گوگل، وزن‌های 300–800) — فارسی، RTL
- **فونت英語ی / لاتین:** Inter (وزن‌های 300–800) — عنوان‌های کوتاه، اعداد
- Fallback: Tahoma, Segoe UI, sans-serif
- تمام پوسته `direction: rtl` و `text-align: right` دارد.

## ۳. افکتهای بصری (Visual Effects)

### شیشه‌ای (Glassmorphism)
- `backdrop-filter: blur(20px) saturate(1.2)`
- `-webkit-backdrop-filter: blur(20px) saturate(1.2)`
- Background semi-transparent،.border 1px با opacity کم، border-radius 16–24px
- سایه چهار لایه (عمق سه‌بعدی)

### 3D و ترنزیشن
- کارت‌های فیلم در حالت هاور: `translateY(-8px)` + `rotateX(8deg)` +border neon-pink
- ترنزیشن‌های نرم: `all 0.45s cubic-bezier(0.23, 1, 0.32, 1)`
- منو بازشونده با affected: scale Y از 0 به 1،opacity

### انیمیشن hero slider
-fade-in-up،asyon،Ken Burns (scale ke sabet عکس背景)

## ۴. شکلک‌های اختصاصی (Custom SVG Emojis / Stickers)

به جای ایموجی سیستم، از مجموعه SVG اختصاصی استفاده می‌شود:
- لب (lips) — رنگ طلایی/صورتی
- قلب (heart) —эрاهه برای لایک/علاقه‌مندی
- آتش (fire) — برای محتوای "ساخن/트ренد"
- ستاره (star) — VIP /預備
- چشم (eye) — تماشا/نما
- چسب (lip bite) — سکسی و بازیگوش

نام فایل‌ها: `lips.svg`, `heart.svg`, `fire.svg`, `star.svg`, `eye.svg`, `kiss.svg`
انداز: 24×24 تا 48×48،-vector، رنگ-through `fill="currentColor"` قابلِ سفارشی‌سازی.

## ۵. ساختار صفحات

| صفحه | توضیح کلی |
|-------|------------|
| `/` | صفحه اصلی: اسلایر بزرگ فیلم‌های جدید و ترند، دسته‌بندی‌ها، فیلم‌های پیشنهادی |
| `/categories` | صفحه دسته‌بندی‌ها با منوی شیشه‌ای و فیلتر سریع |
| `/video/[slug]` | جزئیات فیلم: پلیر HLS، کیفیت‌های مختلف، زیرنویس، پیشنهادهای مرتبط، نظرات |
| `/search` | جستجوی پیشرفته + فیلترها (دسته‌بندی، کیفیت، Durity، تاریخ، زبان) |
| `/login` | ورود |
| `/register` | ثبت‌نام (رایگان / VIP) |
| `/dashboard` | پنل کاربری: علاقه‌مندی‌ها، تاریخچه تماشا، دانلودها، تنظیمات |
| `/upload` | آپلود ویدیو توسط کاربر (در صورت Membership مناسب) |

## ۶. envisionered Technical Stack

- **Frontend:** HTML5، CSS3 (glassmorphism، grid، flexbox، RTL)، Vanilla JS، hls.js برای پخش HLS، IntersectionObserver برای lazy-loading.
- **Backend:** PHP 8.2+ (Laravel 11 یا PHP خالص مدرن با PDO، Composer، PSR-4)
- **Database:** MySQL 8 / MariaDB (储存 users، videos، categories، comments، memberships، watch_history)
- **Video:** HLS (.m3u8) باFFmpeg،FFprobe، ذخیره فایل‌ها خارج از web root، stream با範�‌های رنج (Range requests)
- **Cache:** Redis + OpCache،ガزipped Brotli، lazy-load تصاویر و ویدیوها
- **Security:** CSRF token، prepared statements، Rate-limiting، XSS escaping، فایل‌های آپلودی باoluogo-چک MIME، حمایت دایرکتوری‌های حساس (.htaccess)
- **Server:** Ubuntu/Debian، Nginx + PHP-FPM، TZ Asia/Tehran، UTF-8، RTL فارسی

## ۷. نکات لوکال‌سازی ایران
- زبان فارسی، RTL، فونت Vazirmatn
- تایم‌زون `Asia/Tehran`
- تاریخ با.format جلالی (اختیاری) و number localization
- بهینه برای اینترنت ایران: تصاویر فشرده (WebP)،預-buffer برای ویدیو، CDN اختیاری