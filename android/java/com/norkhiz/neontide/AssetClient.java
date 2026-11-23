package com.norkhiz.neontide;

import android.annotation.TargetApi;
import android.app.Activity;
import android.content.res.AssetManager;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Serves the packaged game (assets/www) over the same-origin virtual host
 * {@code https://appassets.androidplatform.net/}.
 *
 * Using a real HTTPS origin instead of {@code file://} is what makes the WebGL
 * build work unchanged: ES module workers, fetch(), wasm streaming
 * instantiation, WebAudio decoders and localStorage all require a secure,
 * same-origin context.
 */
public class AssetClient extends WebViewClient {

    private static final String TAG = "NeonTide";
    public static final String HOST = "appassets.androidplatform.net";
    public static final String ORIGIN = "https://" + HOST;
    private static final String BASE = "www";

    private static final Map<String, String> MIME = new HashMap<String, String>();

    static {
        MIME.put("html", "text/html");
        MIME.put("htm", "text/html");
        MIME.put("js", "text/javascript");
        MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json");
        MIME.put("webmanifest", "application/manifest+json");
        MIME.put("wasm", "application/wasm");
        MIME.put("glb", "model/gltf-binary");
        MIME.put("gltf", "model/gltf+json");
        MIME.put("bin", "application/octet-stream");
        MIME.put("ktx2", "image/ktx2");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg");
        MIME.put("webp", "image/webp");
        MIME.put("avif", "image/avif");
        MIME.put("gif", "image/gif");
        MIME.put("svg", "image/svg+xml");
        MIME.put("ico", "image/x-icon");
        MIME.put("ogg", "audio/ogg");
        MIME.put("oga", "audio/ogg");
        MIME.put("mp3", "audio/mpeg");
        MIME.put("wav", "audio/wav");
        MIME.put("m4a", "audio/mp4");
        MIME.put("mp4", "video/mp4");
        MIME.put("webm", "video/webm");
        MIME.put("woff", "font/woff");
        MIME.put("woff2", "font/woff2");
        MIME.put("ttf", "font/ttf");
        MIME.put("otf", "font/otf");
        MIME.put("txt", "text/plain");
        MIME.put("xml", "application/xml");
    }

    private final AssetManager assets;

    public AssetClient(Activity activity) {
        this.assets = activity.getAssets();
    }

    /** Blocks traversal/URL tricks before a path ever reaches the asset manager. */
    public static boolean isSafeAssetPath(String path) {
        if (path == null || path.length() == 0) return false;
        if (path.charAt(0) != '/') return false;
        if (path.indexOf(':') >= 0 || path.indexOf('\\') >= 0 || path.indexOf('\0') >= 0) return false;
        String[] segments = path.split("/");
        for (String segment : segments) {
            if (segment.equals("..")) return false;
        }
        return true;
    }

    public static String mimeFor(String path) {
        String clean = path;
        int q = clean.indexOf('?');
        if (q >= 0) clean = clean.substring(0, q);
        int h = clean.indexOf('#');
        if (h >= 0) clean = clean.substring(0, h);
        int dot = clean.lastIndexOf('.');
        if (dot < 0) return "application/octet-stream";
        String ext = clean.substring(dot + 1).toLowerCase(Locale.US);
        String mime = MIME.get(ext);
        return mime != null ? mime : "application/octet-stream";
    }

    private static boolean isTextual(String mime) {
        return mime.startsWith("text/")
                || mime.equals("application/json")
                || mime.equals("application/manifest+json")
                || mime.equals("application/xml")
                || mime.equals("model/gltf+json")
                || mime.equals("image/svg+xml")
                || mime.equals("text/javascript");
    }

    private static Map<String, String> headersFor(String path, String mime) {
        Map<String, String> headers = new HashMap<String, String>();
        headers.put("Access-Control-Allow-Origin", ORIGIN);
        headers.put("Cross-Origin-Resource-Policy", "same-origin");
        headers.put("X-Content-Type-Options", "nosniff");
        if (path.equals("/") || path.endsWith("/index.html") || path.endsWith("/manifest.webmanifest")
                || path.contains("/assets/mobile.") || path.contains("/assets/manifest.json")) {
            headers.put("Cache-Control", "no-cache");
        } else if (path.startsWith("/assets/") && path.matches(".*-[A-Za-z0-9_-]{8}\\.(js|css|wasm)$")) {
            headers.put("Cache-Control", "public, max-age=31536000, immutable");
        } else {
            headers.put("Cache-Control", "public, max-age=604800");
        }
        return headers;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        return !(url != null && url.startsWith(ORIGIN + "/"));
    }

    @TargetApi(21)
    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        String url = request.getUrl() != null ? request.getUrl().toString() : "";
        return !url.startsWith(ORIGIN + "/");
    }

    @TargetApi(21)
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (request == null || request.getUrl() == null) return null;
        String url = request.getUrl().toString();
        if (!url.startsWith(ORIGIN + "/")) return null;
        String path = request.getUrl().getPath();
        if (path == null || path.length() == 0 || path.equals("/")) path = "/index.html";
        return serve(path);
    }

    @SuppressWarnings("deprecation")
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
        if (url == null || !url.startsWith(ORIGIN + "/")) return null;
        String path = url.substring(ORIGIN.length());
        int cut = path.length();
        int q = path.indexOf('?');
        if (q >= 0) cut = q;
        int h = path.indexOf('#');
        if (h >= 0 && h < cut) cut = h;
        path = path.substring(0, cut);
        if (path.length() == 0 || path.equals("/")) path = "/index.html";
        return serve(path);
    }

    private WebResourceResponse serve(String path) {
        String mime = mimeFor(path);
        if (!isSafeAssetPath(path)) {
            Log.w(TAG, "blocked asset path: " + path);
            return new WebResourceResponse("text/plain", "utf-8", stream("bad path"));
        }
        String assetPath = BASE + path;
        try {
            InputStream in = assets.open(assetPath, AssetManager.ACCESS_STREAMING);
            String charset = isTextual(mime) ? "utf-8" : null;
            WebResourceResponse response = new WebResourceResponse(mime, charset, in);
            response.setStatusCodeAndReasonPhrase(200, "OK");
            response.setResponseHeaders(headersFor(path, mime));
            return response;
        } catch (IOException e) {
            Log.e(TAG, "missing asset: " + assetPath + " (" + e.getMessage() + ")");
            WebResourceResponse missing = new WebResourceResponse("text/plain", "utf-8",
                    stream("404 not found: " + path));
            missing.setStatusCodeAndReasonPhrase(404, "Not Found");
            return missing;
        }
    }

    private static InputStream stream(String text) {
        try {
            return new ByteArrayInputStream(text.getBytes("UTF-8"));
        } catch (IOException e) {
            return new ByteArrayInputStream(new byte[0]);
        }
    }
}
