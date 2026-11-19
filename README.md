# ایران آزاد مدیا — خبر، تحلیل، دیدگاه

وب‌سایت خبری فارسی و راست‌چین «ایران آزاد مدیا»، بازطراحی‌شده بر پایه‌ی پوسته‌ی سینمایی نسخه‌ی اصلی VORTEXNET: پس‌زمینه‌ی سه‌بعدی Aether، نوار متحرک، پری‌لودر، افکت‌های اسکرول، کرسر دسکتاپی و پنل‌های شیشه‌ای. کد تحریریه مستقل از فروشگاه و API قدیمی نگه داشته شده است.

## رابط و امکانات فعلی

- هدر چسبان، منوی موبایل، جست‌وجو و فیلتر خبر/تحلیل/دیدگاه
- کارت‌های مقاله، پنجره‌ی مطالعه، کپی پیوند و ذخیره‌ی نشانک در همین مرورگر
- یادداشت رویکرد تحریریه درباره‌ی منبع‌دهی، راستی‌آزمایی و تفکیک خبر از نظر
- پوسته‌ی سه‌بعدی واکنش‌گرا با پس‌زمینه‌ی CSS جایگزین در دستگاه‌های ناسازگار و احترام به `prefers-reduced-motion`
- گزیده‌ی خبری ۲۲ آبان ۱۴۰۵ از گزارش‌های همان روز در ایران‌اینترنشنال؛ خلاصه‌ها به قلم تحریریه‌ی ایران آزاد مدیا بازنویسی شده‌اند و هر کارت به گزارش منبع پیوند دارد
- این داده یک گزیده‌ی دستی و ایستا است، نه خبرخوان زنده یا پوشش جامع همه‌ی خبرهای روز
- تصاویر خبرها تصویرسازی تولیدشده برای این رابط‌اند و نباید به‌عنوان عکس مستند از محل یا رویداد تلقی شوند

## توسعه و انتشار در GitHub Pages

```bash
npm ci
npm run dev
```

ساخت خروجی و کپی آن به ریشه‌ی Pages:

```bash
npm run publish:pages
```

منبع رابط در `app/`، داده‌ی مطالب در `app/public/news.json` و خروجی منتشرشده در ریشه‌ی مخزن است. دامنه‌ی موجود در `CNAME` حفظ شده است.

## افزودن مطلب

رکوردهای `news.json` آرایه‌ای از مطالب هستند. هر مطلب این فیلدها را می‌پذیرد: `id`, `type` (خبر/تحلیل/دیدگاه), `title`, `summary`, `author`, `dateLabel`, `readMinutes`, `topic`, `body` (آرایه‌ی بندها), و `sample`. خبر واقعی را تنها پس از بررسی منبع و صحت، با نام نویسنده و ارجاع‌های قابل‌پیگیری وارد کن؛ مطالب نمونه را `sample: true` نگه دار.

GitHub Pages ایستا است؛ بنابراین انتشار مطلب جدید برای همه با ثبت و انتشار تغییر `news.json` در GitHub انجام می‌شود. API و سرور قبلی فروشگاه در این سایت خبری استفاده نمی‌شوند و تغییر نکرده‌اند.

## اجرای مستقیم روی سرور (بدون آپلود دستی)

`norkhiz-server-doctor.sh` را می‌توان مستقیم از همین مخزن روی سرور لینوکسی (Ubuntu 22.04 و هم‌خانواده‌ها) اجرا کرد — هیچ فایلی لازم نیست دستی آپلود شود:

```bash
# کامل و بدون سوال (آپدیت هوشمند + نصب پیش‌نیازها + دیباگ + تعمیر)
curl -fsSL https://raw.githubusercontent.com/HOTKYNTAKY/NORKHIZSTUDIO/arena/f1c01ed2-norkhizstudio/norkhiz-server-doctor.sh | sudo bash -s -- --all --yes

# فقط دیباگ و گزارش سلامت (بدون تغییر سیستم)
curl -fsSL https://raw.githubusercontent.com/HOTKYNTAKY/NORKHIZSTUDIO/arena/f1c01ed2-norkhizstudio/norkhiz-server-doctor.sh | sudo bash

# فقط دیباگ SSH و پورت ۲۲
curl -fsSL https://raw.githubusercontent.com/HOTKYNTAKY/NORKHIZSTUDIO/arena/f1c01ed2-norkhizstudio/norkhiz-server-doctor.sh | sudo bash -s -- --ssh
```

اگر دسترسی به `raw.githubusercontent.com` ممکن نبود، نسخه‌ی دانلود-بعد-اجرا (همان نتیجه):

```bash
curl -fsSL https://raw.githubusercontent.com/HOTKYNTAKY/NORKHIZSTUDIO/arena/f1c01ed2-norkhizstudio/norkhiz-server-doctor.sh -o /tmp/norkhiz-server-doctor.sh && sudo bash /tmp/norkhiz-server-doctor.sh --all --yes
```

> لینک‌ها به‌صورت موقت از شاخه‌ی `arena/f1c01ed2-norkhizstudio` می‌خوانند؛ پس از ادغام در `main`، مسیر `.../main/norkhiz-server-doctor.sh` همان کار را با آدرس پایدار انجام می‌دهد.

## نکته‌ی منبع

فایل پیوست `vortexnet-setup-v30.sh` برای نصب فروشگاه VORTEXNET بود؛ اسکریپت را اجرا نکردم. فقط فایل‌های متنیِ UI موجود در آن را با بررسی checksum برای بازیابی پوسته‌ی قبلی خواندم؛ کد نصب/سرور را اجرا یا به سایت خبری متصل نکردم.
