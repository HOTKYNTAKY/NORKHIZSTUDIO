package com.norkhiz.neontide;

/** Build-time switches baked into the APK by the CI build script. */
public final class BuildConfig {
    /** True only for locally produced debug builds: enables WebView remote debugging + console logs. */
    public static final boolean DEBUG_WEBVIEW = false;

    private BuildConfig() {
    }
}
