# 🔥 VELVETVAULT PRO (v3.4.0) — Enterprise 18+ Adult VOD Streaming Platform & Ubuntu Server Installer

پلتفرم فول‌استک و حرفه‌ای استریم ویدیو بزرگسالان (**دارای نشان مجوز رسمی کشوری و تاییدیه سنی +18**)، مجهز به **اسکریپت نصب خودکار روی سرور اوبونتو (`install.sh`)**، **پنل مخفی مدیریت (Stealth Admin Panel)** و **۵۰+ دسته‌بندی کامل به زبان انگلیسی (English Categories)**.

---

## 🐧 ۱. نصب خودکار روی سرور اوبونتو (Ubuntu 20.04 / 22.04 / 24.04 LTS)

فایل `install.sh` در ریشه پروژه، تمامی پیش‌نیازهای سرور اوبونتو (از جمله **Node.js 22 LTS**، وب‌سرور **Nginx** بهینه‌شده برای استریم ویدیوهای 4K، ابزار **FFmpeg** برای تبدیل ویدیو به HLS، فایروال **UFW**، سرویس دائمی **Systemd** و گواهی رایگان **SSL Let's Encrypt**) را به صورت خودکار نصب و کانفیگ می‌کند.

### اجرای تعاملی (Interactive):
```bash
chmod +x install.sh
sudo bash install.sh
```

### اجرای سریع تک‌خطی با پارامترهای دلخواه (Non-Interactive):
```bash
sudo bash install.sh \
  --domain stream.yourdomain.com \
  --port 3000 \
  --admin-key VAULT-ADMIN-2026 \
  --admin-path /vault-x9-control \
  --ssl \
  --non-interactive
```

### دستورات مدیریتی روی سرور اوبونتو پس از نصب:
```bash
velvet-cli status    # بررسی وضعیت آنلاین بودن سرویس
velvet-cli restart   # ری‌استارت سریع سرور استریم
velvet-cli logs      # مشاهده زنده لاگ‌های دسترسی و خطاها
velvet-cli backup    # تهیه نسخه پشتیبان فشرده از دیتابیس و کاورها
velvet-cli key       # نمایش کلید امنیتی پنل مخفی ادمین
```

---

## 🔐 ۲. نحوه ورود به پنل مخفی ادمین (Stealth Admin Vault)

پنل مدیریت به صورت کاملاً مخفی طراحی شده و به ۴ روش قابل باز شدن است:

1. **میانبر کیبورد (در هر جای سایت):** کلیدهای ترکیبی `Ctrl + Shift + A` (یا `Alt + A`) را فشار دهید.
2. **آدرس مخفی اختصاصی:** وارد کردن آدرس `/vault-x9-control` یا `/?admin=vault` در مرورگر.
3. **تریگر مخفی در فوتر سایت:** ۵ بار کلیک متوالی روی نشان `🛡️ Official Licensed 18+ Portal` در پایین سایت.
4. **دکمه نوار ابزار بالا:** کلیک روی دکمه `🔐 پنل مخفی ادمین`.

### اطلاعات ورود پیش‌فرض ادمین:
- **کلید امنیتی (`ADMIN_SECRET_KEY`):** `VAULT-ADMIN-2026`
- **پین کد مستر (`ADMIN_MASTER_PIN`):** `8899`

### امکانات پنل مخفی ادمین:
- **افزودن ویدیو جدید:** آپلود مستقیم فایل ویدیو (`.mp4` / `.webm`) از سیستم یا قرار دادن لینک استریم/HLS + آپلود کاور دلخواه یا تولید خودکار پوستر نئونی 4K.
- **مدیریت ویدیوها:** مشاهده لیست ویدیوها، آمار بازدید، وضعیت VIP و حذف فوری.
- **مدیریت دسته‌بندی‌های خارجی (English Categories):** دارای ۵۰ دسته‌بندی آماده به زبان انگلیسی (`4K Ultra HD`, `Exclusive VIP`, `VR Porn 360°`, `Amateur`, `MILF`, `Anal`, `Lesbian`, `Threesome`, `Hardcore`, `POV`, `Big Ass`, `Big Tits`, `Latina`, `Asian`, `Japanese (JAV)`, `European`, `Russian`, `Middle Eastern`, `Massage & Oil`, `Casting Couch`, `Cosplay`, `BDSM & Bondage`, `Hentai & 3D Uncensored` و ...) با قابلیت افزودن یا حذف دسته‌بندی جدید.
- **مدیریت بازیگران و مدل‌ها (Pornstars / Models):** افزودن و مدیریت ستارگان تاییدشده به همراه رتبه و کشور.
- **تنظیمات مجوز رسمی کشوری و مانیتورینگ سرور اوبونتو:** ویرایش شماره مجوز رسمی کشوری (`IR-AVOD-2026-99481-OFFICIAL`)، تغییر رمز پنل مخفی، مشاهده زنده مصرف RAM و CPU سرور Ubuntu و لاگ‌های امنیتی.

---

## 📂 ۳. ساختار پوشه‌ها و معماری پروژه (Enterprise Project Structure)

```text
├── install.sh                       # اسکریپت نصب خودکار صفر تا صد روی سرور Ubuntu
├── uninstall.sh                     # اسکریپت حذف سرویس‌ها در اوبونتو
├── Dockerfile                       # فایل ایمیج داکر مجهز به Node 22 و FFmpeg
├── docker-compose.yml               # اجرای ترکیبی App + Nginx با Docker Compose
├── .env.example                     # نمونه تنظیمات محیطی سرور، مجوز و امنیت
├── package.json                     # مشخصات پروژه و اسکریپت‌های اجرایی
├── server.js                        # هسته اصلی سرور HTTP و استریم Range 206
├── config/
│   ├── app.config.js                # تنظیمات برنامه، استریم و مجوز رسمی کشوری
│   ├── categories.seed.js           # بانک ۵۰+ دسته‌بندی انگلیسی، بازیگران و ویدیوهای اولیه
│   ├── database.js                  # موتور دیتابیس JSON با ذخیره‌سازی اتمیک و لاگ امنیتی
│   └── security.config.js           # تنظیمات توکن ادمین، مسیر مخفی و Rate Limit
├── deploy/
│   ├── nginx/
│   │   └── streamvault.conf         # کانفیگ Nginx برای استریم MP4/HLS و آپلود تا 10GB
│   ├── systemd/
│   │   └── streamvault.service      # فایل سرویس Systemd اوبونتو
│   ├── scripts/
│   │   ├── backup.sh                # اسکریپت بکاپ‌گیری خودکار
│   │   ├── transcode-hls.sh         # اسکریپت تبدیل ویدیو به HLS چندکیفیتی با FFmpeg
│   │   └── healthcheck.sh           # اسکریپت بررسی سلامت سرور و ری‌استارت خودکار
│   └── firewall/
│       └── ufw-rules.sh             # قوانین فایروال UFW اوبونتو
├── src/
│   ├── controllers/
│   │   ├── admin.controller.js      # کنترلر پنل مخفی ادمین (CRUD ویدیو، دسته‌بندی، تنظیمات)
│   │   ├── auth.controller.js       # کنترلر احراز هویت پنل مخفی ادمین
│   │   ├── category.controller.js   # کنترلر دسته‌بندی‌های انگلیسی و مدل‌ها
│   │   ├── stream.controller.js     # کنترلر استریم ویدیو، بازدید، لایک و نظرات
│   │   └── system.controller.js     # کنترلر وضعیت سلامت و کانفیگ مجوز
│   ├── middleware/
│   │   ├── adminGuard.js            # محافظ امنیتی مسیرهای پنل مخفی ادمین
│   │   ├── ageGate.js               # هدرهای قانونی RTA و مجوز +18
│   │   └── rateLimiter.js           # محافظت در برابر حملات Brute-force و ربات‌ها
│   ├── models/
│   │   ├── Video.model.js           # مدل ویدیو، جستجو، فیلتر و مرتب‌سازی
│   │   ├── Category.model.js        # مدل دسته‌بندی‌های انگلیسی
│   │   ├── Performer.model.js       # مدل بازیگران و ستارگان
│   │   └── Analytics.model.js       # مدل آمار بازدید و منابع سخت‌افزاری سرور اوبونتو
│   ├── routes/
│   │   ├── api.routes.js            # روتر عمومی API
│   │   ├── admin.routes.js          # روتر محافظت‌شده پنل مخفی ادمین
│   │   └── stream.routes.js         # روتر استریم ویدیو
│   ├── services/
│   │   ├── ffmpeg.service.js        # سرویس ارتباط با FFmpeg در اوبونتو
│   │   ├── storage.service.js       # سرویس ذخیره فایل‌های ویدیو و کاور آپلودشده
│   │   └── security.service.js      # سرویس مدیریت نشست‌های ادمین
│   └── utils/
│       ├── helpers.js               # توابع کمکی، پارسر JSON و تولید اسلاگ
│       ├── logger.js                # سیستم ثبت لاگ در پوشه logs/
│       └── seed-runner.js           # ابزار بازنشانی دیتابیس اولیه
└── public/
    ├── index.html                   # رابط کاربری اصلی با طراحی Luxury Dark
    ├── css/
    │   ├── main.css                 # استایل‌های اصلی، بنر Hero، کارت‌ها و ریسپانسیو
    │   ├── player.css               # استایل پلیر حرفه‌ای 4K HTML5
    │   └── admin.css                # استایل پنل مخفی ادمین
    ├── js/
    │   ├── age-gate.js              # مدیریت تایید سنی +18 و دکمه خروج اضطراری (ESC×2)
    │   ├── player.js                # منطق پلیر 4K، تغییر کیفیت/سرعت، لایک و کامنت
    │   ├── admin-panel.js           # منطق کامل پنل مخفی ادمین و آپلود فایل
    │   └── app.js                   # مدیریت وضعیت سایت، فیلتر دسته‌بندی‌ها و جستجو
    └── uploads/
        ├── videos/                  # محل ذخیره ویدیوهای آپلودشده
        └── thumbnails/              # محل ذخیره کاورهای آپلودشده
```
