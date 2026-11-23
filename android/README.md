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
| حجم تقریبی APK | ~۵۸ مگابایت |
| مجوزها | `INTERNET` (رزرو)، `VIBRATE` (بازخورد لمسی بازی) |

بازی همان بیلد وب است و بدون تغییر اجرا می‌شود؛ فقط داخل یک `WebView` تمام‌صفحه بسته‌بندی شده است:

- فایل‌های بازی در `assets/www/` قرار می‌گیرند (همان `game/` داخل زیپ).
- یک `WebViewClient` سفارشی (`AssetClient.java`) درخواست‌های مبدا مجازی `https://appassets.androidplatform.net/` را از روی assets سرو می‌کند.
  چون یک مبدا واقعی HTTPS است، `fetch`، ماژول‌ورکرها (`new Worker(..., {type:"module"})`)، `WebAssembly`، `localStorage` و WebAudio بدون تغییر کار می‌کنند (`file://` این‌ها را می‌شکست).
- هر درخواست بیرون از این مبدا مسدود می‌شود؛ بازی کاملاً آفلاین است.
- صفحه روشن می‌ماند، نوارهای سیستم مخفی می‌شوند (immersive)، notch پشتیبانی می‌شود و دکمهٔ برگشت با یک تأیید از بازی خارج می‌شود.

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
