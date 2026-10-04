// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
package org.chemodose.preview;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
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
    private static final String ROOT = "file:///android_asset/web/";

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
        settings.setAllowFileAccess(true);
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
                if (request.getUrl().toString().startsWith(ROOT)) return null;
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }
        });
        web.addJavascriptInterface(new ClipboardBridge(), "AndroidBridge");
        setContentView(web);
        web.loadUrl(ROOT + "index.html");
    }

    private final class ClipboardBridge {
        @JavascriptInterface public void copySummary(final String value) {
            if (value == null || value.length() > 30000) return;
            runOnUiThread(new Runnable() { @Override public void run() {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                ClipData data = ClipData.newPlainText("剂量核对摘要", value);
                if (android.os.Build.VERSION.SDK_INT >= 33) {
                    android.os.PersistableBundle extras = new android.os.PersistableBundle();
                    extras.putBoolean("android.content.extra.IS_SENSITIVE", true);
                    data.getDescription().setExtras(extras);
                }
                clipboard.setPrimaryClip(data);
            }});
        }
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
