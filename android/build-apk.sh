#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# NEON TIDE — build a signed, installable APK from the packaged web build.
#
#   ./android/build-apk.sh <game-dir> <output.apk> [versionName] [versionCode]
#
# <game-dir> is the folder containing index.html + assets/ (the "game"
# directory inside neon-tide-mobile.zip).
#
# Needs: JDK 11+ and Android SDK build-tools (aapt2, zipalign, apksigner) plus
# a platform (android.jar). They are read from $ANDROID_HOME / $ANDROID_SDK_ROOT.
# ---------------------------------------------------------------------------
set -euo pipefail

GAME_DIR="${1:?usage: build-apk.sh <game-dir> <output.apk> [versionName] [versionCode]}"
OUT_APK="${2:?missing output apk path}"
VERSION_NAME="${3:-1.0.0}"
VERSION_CODE="${4:-1}"
MIN_SDK=24
TARGET_SDK=34

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG="com.norkhiz.neontide"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -n "$SDK" ] || { echo "ANDROID_HOME / ANDROID_SDK_ROOT is not set" >&2; exit 1; }
BT="${BUILD_TOOLS:-$(ls -d "$SDK"/build-tools/* 2>/dev/null | sort -V | tail -1)}"
PLATFORM="${PLATFORM:-$(ls -d "$SDK"/platforms/android-* 2>/dev/null | sort -V | tail -1)}"
[ -n "$BT" ] && [ -d "$BT" ] || { echo "no build-tools under $SDK" >&2; exit 1; }
[ -n "$PLATFORM" ] && [ -d "$PLATFORM" ] || { echo "no platform under $SDK" >&2; exit 1; }
ANDROID_JAR="$PLATFORM/android.jar"
AAPT2="$BT/aapt2"; ZIPALIGN="$BT/zipalign"; APKSIGNER="$BT/apksigner"
for t in "$AAPT2" "$ZIPALIGN" "$APKSIGNER"; do
  [ -x "$t" ] || { echo "missing build-tool: $t" >&2; exit 1; }
done
[ -f "$GAME_DIR/index.html" ] || { echo "game dir must contain index.html: $GAME_DIR" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/classes" "$WORK/gen" "$WORK/webroot/www" "$WORK/dex"

echo "==> staging game files ($(du -sh "$GAME_DIR" | cut -f1))"
# Inside the APK the files MUST live under assets/www/... : "assets/" is the
# AssetManager root and "www/" is the root of the virtual https origin.
cp -a "$GAME_DIR/." "$WORK/webroot/www/"
rm -f "$WORK/webroot/www/_headers" "$WORK/webroot/www/vercel.json"

# ---------------------------------------------------------------------------
# Mobile tuning layer (android/patches/). The game ships as a minified web
# build, so behaviour that should differ on a phone (no developer checkpoint,
# beach start in daylight, no debug console) is applied by appending a small
# readable patch to the bundle instead of editing the minified code.
# NEON_TIDE_PATCHES=0 builds the untouched web build.
# ---------------------------------------------------------------------------
if [ "${NEON_TIDE_PATCHES:-1}" != "0" ]; then
  echo "==> applying mobile patches"
  python3 "$HERE/tools/apply-patches.py" "$WORK/webroot/www/assets"
fi

echo "==> stamping version $VERSION_NAME ($VERSION_CODE)"
sed -e "s/android:versionCode=\"[0-9]*\"/android:versionCode=\"$VERSION_CODE\"/" \
    -e "s/android:versionName=\"[^\"]*\"/android:versionName=\"$VERSION_NAME\"/" \
    "$HERE/AndroidManifest.xml" > "$WORK/AndroidManifest.xml"

echo "==> compiling resources"
"$AAPT2" compile --dir "$HERE/res" -o "$WORK/compiled.zip"

echo "==> linking manifest, resources and R.java"
"$AAPT2" link \
  -o "$WORK/base.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$WORK/AndroidManifest.xml" \
  -R "$WORK/compiled.zip" \
  --java "$WORK/gen" \
  --custom-package "$PKG" \
  --auto-add-overlay \
  --min-sdk-version "$MIN_SDK" \
  --target-sdk-version "$TARGET_SDK"

R_JAVA="$WORK/gen/$(echo "$PKG" | tr '.' '/')/R.java"
test -f "$R_JAVA" || { echo "R.java was not generated" >&2; find "$WORK/gen" -name 'R.java'; exit 1; }

echo "==> compiling java"
find "$HERE/java" -path "*/BuildConfig.java" -prune -o -name '*.java' -print > "$WORK/sources.txt"
echo "$HERE/java/$(echo "$PKG" | tr "." "/")/BuildConfig.java" >> "$WORK/sources.txt"
echo "$R_JAVA" >> "$WORK/sources.txt"
javac -source 8 -target 8 -nowarn -encoding UTF-8 \
  -bootclasspath "$ANDROID_JAR" \
  -d "$WORK/classes" @"$WORK/sources.txt"

echo "==> dexing"
DEX_INPUT="$(find "$WORK/classes" -name '*.class' | tr '\n' ' ')"
if [ -x "$BT/d8" ]; then
  "$BT/d8" --release --min-api "$MIN_SDK" --lib "$ANDROID_JAR" --output "$WORK/dex" $DEX_INPUT
elif [ -f "$BT/lib/d8.jar" ]; then
  java -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --release --min-api "$MIN_SDK" \
    --lib "$ANDROID_JAR" --output "$WORK/dex" $DEX_INPUT
else
  echo "d8 not found in $BT (needs build-tools 30+)" >&2; exit 1
fi
[ -f "$WORK/dex/classes.dex" ] || { echo "dexing produced no classes.dex" >&2; exit 1; }

echo "==> packaging apk"
cp "$WORK/base.apk" "$WORK/unsigned.apk"
(cd "$WORK/dex" && zip -q -9 -X "$WORK/unsigned.apk" classes.dex)
# Append assets/ in sorted order with directory entries. aapt2 sorts every
# archive it produces and AssetManager relies on that ordering; plain "zip -r"
# would append filesystem order and silently hide files behind the 404 path.
python3 "$HERE/tools/add-assets.py" --deflate "$WORK/unsigned.apk" "$WORK/webroot"

echo "==> packaging sanity checks"
node "$HERE/tools/check-apk.mjs" "$WORK/unsigned.apk"

echo "==> aligning${ALIGN_NOTE:-}"
"$ZIPALIGN" -p -f 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"

echo "==> signing"
KS="${NEON_TIDE_KEYSTORE:-$HERE/release.keystore}"
KS_PASS="${NEON_TIDE_KEYSTORE_PASS:-neontide}"
KEY_ALIAS="${NEON_TIDE_KEY_ALIAS:-neontide}"
if [ ! -f "$KS" ]; then
  echo "    creating signing key: $KS"
  echo "    (keep this file — Android only accepts updates signed with the same key)"
  keytool -genkeypair -keystore "$KS" -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -alias "$KEY_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=NEON TIDE, O=NORKHIZ Studio, C=IR" >/dev/null 2>&1
fi
mkdir -p "$(dirname "$OUT_APK")"
"$APKSIGNER" sign \
  --ks "$KS" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" --ks-key-alias "$KEY_ALIAS" \
  --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled true \
  --min-sdk-version "$MIN_SDK" \
  --out "$OUT_APK" "$WORK/aligned.apk"

echo "==> verifying"
node "$HERE/tools/check-apk.mjs" "$OUT_APK" ${ALIGN_SKIP:-}
"$APKSIGNER" verify --min-sdk-version "$MIN_SDK" --print-certs "$OUT_APK" | head -4
"$AAPT2" dump badging "$OUT_APK" | head -5
echo "APK: $OUT_APK"
ls -lh "$OUT_APK"
