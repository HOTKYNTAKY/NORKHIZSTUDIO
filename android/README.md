# NEON TIDE — بستهٔ اندروید (APK)

این پوشه، بیلد وبِ بازی **NEON TIDE** (فایل `neon-tide-mobile.zip` در پوشهٔ «فایل های بازی جی تی ای» گوگل‌درایو) را به یک اپلیکیشن اندروید قابل نصب تبدیل می‌کند.

## چه چیزی ساخته می‌شود

| | |
|---|---|
| نام بسته | `com.norkhiz.neontide` |
| نام نمایشی | NEON TIDE |
| حداقل اندروید | 7.0 (API 24) |
| هدف | API 34 |
| جهت صفحه | افقی (sensorLandscape)، تمام‌صفحه |
| حجم APK | ۵۳.۸ مگابایت |
| اثر انگشت امضا (SHA-256) | `B4:58:AE:94:7F:4D:D2:CC:1E:C6:A2:15:0F:8B:81:97:0E:9B:25:FB:BA:90:7B:E2:52:A8:48:09:C6:3C:7E:8D` |
| مسیر فایل‌های بازی در APK | `assets/www/` (سرو از `https://appassets.androidplatform.net/`) |
| مجوزها | `INTERNET` (رزرو)، `VIBRATE` (بازخورد لمسی بازی) |

بازی همان بیلد وب است و بدون تغییر اجرا می‌شود؛ فقط داخل یک `WebView` تمام‌صفحه بسته‌بندی شده است:

- فایل‌های بازی در `assets/www/` قرار می‌گیرند (همان `game/` داخل زیپ).
- یک `WebViewClient` سفارشی (`AssetClient.java`) درخواست‌های مبدا مجازی `https://appassets.androidplatform.net/` را از روی assets سرو می‌کند.
  چون یک مبدا واقعی HTTPS است، `fetch`، ماژول‌ورکرها (`new Worker(..., {type:"module"})`)، `WebAssembly`، `localStorage` و WebAudio بدون تغییر کار می‌کنند (`file://` این‌ها را می‌شکست).
- هر درخواست بیرون از این مبدا مسدود می‌شود؛ بازی کاملاً آفلاین است.
- اگر ساختار assets غلط باشد، برنامه به‌جای صفحهٔ خالی یک پیام فارسی با تشخیص مسیر نشان می‌دهد (و خودش `www/`، `assets/www/` و ریشه را امتحان می‌کند).
- صفحه روشن می‌ماند، نوارهای سیستم مخفی می‌شوند (immersive)، notch پشتیبانی می‌شود و دکمهٔ برگشت با یک تأیید از بازی خارج می‌شود.

## فایل آماده

`android/apk/neon-tide-android-1.0.1.apk` — همین فایل در گوگل‌درایو هم هست:
`NEON-TIDE-v1.0.1-android-FIXED.apk` در پوشهٔ «فایل های بازی جی تی ای».

SHA-256 فایل APK: `0034cca3c884ed45076f35bfb6706ee4c457c04fd68794213d42a71e2c4b2d27`

> **نسخهٔ ۱.۰.۰ خراب بود** (صفحهٔ `404 not found: /index.html`): اسکریپت بیلد فایل‌های
> بازی را با نام `www/...` در ریشهٔ ZIP می‌گذاشت، نه زیر `assets/www/...`؛ در نتیجه
> `AssetManager` هیچ‌چیز پیدا نمی‌کرد. از ۱.۰.۱ فایل‌ها با نام کامل `assets/www/...`
> نوشته می‌شوند و `android/tools/check-apk.mjs` قبل از امضا بیلد را چک می‌کند.

## ساخت APK

### ۱) از طریق GitHub Actions (پیشنهادی)

ورک‌فلو `.github/workflows/android-apk.yml`:

1. زیپ بیلد را از گوگل‌درایو (با `drive_file_id`) یا هر لینک مستقیم HTTPS می‌گیرد.
2. با Android SDK واقعی (`aapt2`، `javac`، `d8`، `zipalign`، `apksigner`) APK امضاشده می‌سازد.
3. APK را در همین پوشه (`apk/`) کامیت می‌کند و به‌عنوان artifact هم نگه می‌دارد.

اجرا از تب Actions → «Build NEON TIDE APK» → Run workflow (پیش‌فرض‌ها همان بیلد فعلی‌اند).

### ۲) روی سیستم خودت

```bash
export ANDROID_HOME=$HOME/Android/Sdk      # build-tools 34 + platforms/android-34
unzip neon-tide-mobile.zip -d /tmp/nt      # پوشهٔ game/ داخلش
./android/build-apk.sh /tmp/nt/game ./android/apk/neon-tide-android-1.0.0.apk 1.0.0 1
```

### کلید امضا

`android/release.keystore` (رمز و alias: `neontide`) داخل مخزن است تا بیلدهای بعدی بتوانند روی نسخهٔ نصب‌شده آپدیت شوند.
اگر کلید عوض شود، اندروید نصب نسخهٔ جدید روی نسخهٔ قبلی را رد می‌کند و کاربر باید اول حذف کند.
برای بیلد با کلید دیگر: `NEON_TIDE_KEYSTORE`, `NEON_TIDE_KEYSTORE_PASS`, `NEON_TIDE_KEY_ALIAS`.

## نصب روی گوشی

1. فایل `neon-tide-android-1.0.0.apk` را روی گوشی کپی کن (دانلود از درایو یا کابل).
2. اگر پرسید، برای فایل‌منیجر/مرورگر «نصب برنامه‌های ناشناس» را روشن کن.
3. روی فایل بزن → Install → Open. گوشی را افقی بگیر.

> این APK با کد بیلد وب و امضای خودمان ساخته شده؛ در گوگل‌پلی منتشر نشده و برای نصب دستی (sideload) است.

## منابع

- کد پوستهٔ اندروید: `android/java/`, `android/res/`, `android/AndroidManifest.xml`
- آیکون: `android/artwork/` (خروجی‌های mipmap در `android/res/mipmap-*`)
- اسکریپت بیلد: `android/build-apk.sh`
