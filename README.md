# NORKHIZ STUDIO — Premium Adult Video Platform

وب‌سایت حرفه‌ای و مدرن تماشای فیلم‌های پورن با طراحی شیشه‌ای (Glassmorphism)، افکت‌های سه‌بعدی، تم تاریک لوکس و پشتیبانی کامل از فارسی/RTL.

## ساختار مخزن

```
/public            # frontend (HTML/CSS/JS استاتیک — قابل مشاهده در هر مرورگر)
/api               # backend PHP (مدرن، PDO، Session) — برای سرور PHP
/server            # سرور پیش‌نمایش Node.js (موقت، برای تست لوکال)
DESIGN.md          # مستندات کامل UI/UX و طراحی
INSTALL.md         # راهنمای نصب روی Ubuntu/Debian
```

## راه‌اندازی سریع (لوکال)

辞 — PHP نصب نیست، پس برای پیش‌نمایش فوری از سرور Node.js استفاده کنید:

```bash
cd /home/user/NORKHIZSTUDIO/server
npm install
npm start
# سپس http://localhost:3000 را باز کنید
```

## نصب روی سرور PHP (Laravel / PHP خالص)

بخش `INSTALL.md` را بخوانید. مورد نیاز‌ها: PHP 8.2+, Composer, MySQL 8, Nginx/Apache, FFmpeg (برای HLS), Redis (اختیاری).

## امکانات کلیدی

- اسلایر بزرگ فیلم‌های جدید و ترند
- دسته‌بندی‌ها (Amateur, Lesbian, Anal, MILF, Asian, Iranian/Persian و...)
- پلیر ویدیو حرفه‌ای با HLS و کیفیت‌های مختلف
- سیستم جستجوی پیشرفته و فیلترها
- عضویت رایگان و VIP
- پنل کاربری (علاقه‌مندی‌ها، تاریخچه تماشا، دانلود)
- صفحه آپلود کاربر
- نظرات با شکلک‌های اختصاصی (SVG)
- ریسپانسیو کامل، RTL فارسی، لوکس و 3D

## آגזام فنی

HTML5, CSS3, Vanilla JS, hls.js, PHP 8.2 (PDO), MySQL, Nginx, Ubuntu/Debian.