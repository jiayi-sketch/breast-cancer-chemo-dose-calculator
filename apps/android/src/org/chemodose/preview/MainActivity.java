// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
package org.chemodose.preview;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.util.Base64;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.util.regex.Pattern;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;

public final class MainActivity extends Activity {
    private WebView web;
    private static final String ROOT = "https://chemodose.invalid/";
    private String imageRequestId;
    private String lastClipboard = "";
    private boolean ownClipboard = false;

    private String language = "zh-Hans";
    private static boolean supportedLanguage(String value) {
        return "zh-Hans".equals(value) || "zh-Hant".equals(value) || "en".equals(value);
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.rgb(241, 245, 246));
        getWindow().getDecorView().setSystemUiVisibility(0x00002000 | 0x00000010);
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(false);
        settings.setDatabaseEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().startsWith(ROOT);
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if ("GET".equals(request.getMethod()) && "https".equals(request.getUrl().getScheme()) && "chemodose.invalid".equals(request.getUrl().getHost())) {
                    String path = request.getUrl().getPath();
                    if (path != null && !path.contains("..")) try {
                        String mime = path.endsWith(".html") ? "text/html" : path.endsWith(".css") ? "text/css" : path.endsWith(".js") ? "text/javascript" : path.endsWith(".wasm") ? "application/wasm" : "application/octet-stream";
                        return new WebResourceResponse(mime, "UTF-8", getAssets().open("web" + path));
                    } catch (java.io.IOException error) { }
                }
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }
        });
        web.addJavascriptInterface(new ClipboardBridge(), "AndroidBridge");
        setContentView(web);
        String saved = getSharedPreferences("interface", MODE_PRIVATE).getString("language", "zh-Hans");
        language = supportedLanguage(saved) ? saved : "zh-Hans";
        web.loadUrl(ROOT + "index.html?lang=" + language);
    }

    private final class ClipboardBridge {
        @JavascriptInterface public void saveLanguage(final String value) {
            if (!supportedLanguage(value)) return;
            runOnUiThread(new Runnable() { @Override public void run() {
                language = value;
                getSharedPreferences("interface", MODE_PRIVATE).edit().putString("language", value).apply();
            }});
        }
        @JavascriptInterface public void copySummary(final String value) {
            if (value == null || value.length() > 30000) return;
            runOnUiThread(new Runnable() { @Override public void run() {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                ClipData data = ClipData.newPlainText("en".equals(language) ? "Dose verification summary" : "zh-Hant".equals(language) ? "劑量核對摘要" : "剂量核对摘要", value);
                if (android.os.Build.VERSION.SDK_INT >= 33) {
                    android.os.PersistableBundle extras = new android.os.PersistableBundle();
                    extras.putBoolean("android.content.extra.IS_SENSITIVE", true);
                    data.getDescription().setExtras(extras);
                }
                clipboard.setPrimaryClip(data);
                lastClipboard = value; ownClipboard = true;
            }});
        }
        @JavascriptInterface public void reportImport(final String request) {
            if (request == null || request.length() > 1000) return;
            runOnUiThread(new Runnable() { @Override public void run() { importReport(request); }});
        }
    }

    private void result(JSONObject value) {
        if (web != null) web.evaluateJavascript("window.ChemoImport?.receive(" + value.toString() + ")", null);
    }
    private void reply(String id, String key, Object value) {
        try { JSONObject obj = new JSONObject(); obj.put("requestId", id); obj.put(key, value); result(obj); } catch (Exception error) { }
    }
    private void importReport(String json) {
        String id = "";
        try {
            JSONObject request = new JSONObject(json); id = request.getString("requestId");
            String kind = request.getString("kind"), source = request.getString("source");
            if (id.length() > 100 || !java.util.Arrays.asList("biopsy", "postop", "ihc", "fish").contains(source)) return;
            if ("image".equals(kind)) {
                if (imageRequestId != null) reply(imageRequestId, "cancelled", true);
                imageRequestId = id;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT); picker.setType("image/*"); picker.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(picker, 200);
            } else if ("clipboard".equals(kind)) {
                ClipboardManager clipboard = (ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
                ClipData clip = clipboard.getPrimaryClip();
                if (clip == null || clip.getItemCount() == 0) { reply(id,"cancelled",true); return; }
                ClipData.Item item = clip.getItemAt(0);
                if (item.getUri() != null) {
                    String signature = item.getUri().toString();
                    if (request.optBoolean("automatic") && signature.equals(lastClipboard)) { reply(id,"cancelled",true); return; }
                    lastClipboard = signature; ownClipboard = false; readImage(item.getUri(), id);
                } else {
                    CharSequence textValue = item.getText(); String text = textValue == null ? "" : textValue.toString();
                    boolean marker = Pattern.compile("\\b(?:ER|PR|HER[ -]?2|Ki[ -]?67)\\b|乳腺|病理|免疫组化|免疫組化",Pattern.CASE_INSENSITIVE).matcher(text).find();
                    if (request.optBoolean("automatic") && (text.equals(lastClipboard) || ownClipboard && text.equals(lastClipboard) || !marker)) { reply(id,"cancelled",true); return; }
                    lastClipboard = text; ownClipboard = false;
                    if (text.length() > 40000) reply(id,"error",true); else reply(id,"text",text);
                }
            }
        } catch (Exception error) { reply(id,"error",true); }
    }
    private void readImage(final Uri uri, final String id) {
        new Thread(new Runnable() { @Override public void run() {
            try {
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                try (InputStream stream = getContentResolver().openInputStream(uri)) {
                    if (stream == null) throw new java.io.IOException();
                    byte[] block = new byte[8192]; int n;
                    while ((n=stream.read(block))!=-1) { if (buffer.size()+n>12*1024*1024) throw new java.io.IOException(); buffer.write(block,0,n); }
                }
                byte[] data = buffer.toByteArray(); BitmapFactory.Options options = new BitmapFactory.Options(); options.inJustDecodeBounds=true;
                BitmapFactory.decodeByteArray(data,0,data.length,options);
                if (options.outWidth<=0 || options.outHeight<=0 || (long)options.outWidth*options.outHeight>20000000) throw new java.io.IOException();
                final String image = "data:"+options.outMimeType+";base64,"+Base64.encodeToString(data,Base64.NO_WRAP);
                runOnUiThread(new Runnable(){@Override public void run(){reply(id,"image",image);}});
            } catch (Exception error) { runOnUiThread(new Runnable(){@Override public void run(){reply(id,"error",true);}}); }
        }}).start();
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if (requestCode==200 && imageRequestId!=null) {
            String id=imageRequestId; imageRequestId=null;
            if (resultCode==RESULT_OK && data!=null && data.getData()!=null) readImage(data.getData(),id); else reply(id,"cancelled",true);
        }
    }
    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus && web!=null) web.evaluateJavascript("window.ChemoImport?.foreground()",null);
    }

    @Override protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("AndroidBridge");
            web.clearCache(true);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
