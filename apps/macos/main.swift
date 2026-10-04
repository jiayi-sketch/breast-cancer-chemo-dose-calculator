// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var webRoot: URL!
    let appVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "未知"
    let testing = CommandLine.arguments.contains("--self-test")

    var language = "zh-Hans"
    let supportedLanguages = ["zh-Hans", "zh-Hant", "en"]
    func localized(_ source: String) -> String {
        if language == "zh-Hant" { return source.applyingTransform(StringTransform("Simplified-Traditional"), reverse: false) ?? source }
        if language != "en" { return source }
        return ["关于乳腺癌剂量计算":"About Breast Cancer Dose Calculator", "退出乳腺癌剂量计算":"Quit Breast Cancer Dose Calculator", "编辑":"Edit", "撤销":"Undo", "剪切":"Cut", "复制":"Copy", "粘贴":"Paste", "全选":"Select All", "乳腺癌剂量计算":"Breast Cancer Dose Calculator", "内置方案版":"Built-in catalogue version"][source] ?? source
    }
    func refreshLanguage() {
        window.title = localized("乳腺癌剂量计算") + " · " + localized("内置方案版") + " " + appVersion
        if let menu = NSApp.mainMenu {
            menu.items[0].submenu?.items[0].title = localized("关于乳腺癌剂量计算")
            menu.items[0].submenu?.items[2].title = localized("退出乳腺癌剂量计算")
            menu.items[1].title = localized("编辑")
            for (index,title) in ["撤销","剪切","复制","粘贴","全选"].enumerated() { menu.items[1].submenu?.items[index].title = localized(title) }
        }
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        if let saved = UserDefaults.standard.string(forKey: "interfaceLanguage"), supportedLanguages.contains(saved) { language = saved }
        let mainMenu = NSMenu()
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "关于乳腺癌剂量计算", action: #selector(showAbout), keyEquivalent: "").target = self
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "退出乳腺癌剂量计算", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appMenuItem.submenu = appMenu
        let editItem = NSMenuItem(title: "编辑", action: nil, keyEquivalent: "")
        let edit = NSMenu(title: "编辑")
        for (title, selector, key) in [("撤销", "undo:", "z"), ("剪切", "cut:", "x"), ("复制", "copy:", "c"), ("粘贴", "paste:", "v"), ("全选", "selectAll:", "a")] {
            edit.addItem(withTitle: title, action: Selector(selector), keyEquivalent: key)
        }
        editItem.submenu = edit; mainMenu.addItem(editItem); NSApp.mainMenu = mainMenu

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        config.userContentController.add(self, name: "copySummary")
        config.userContentController.add(self, name: "languagePreference")
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1180, height: 840),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "乳腺癌剂量计算 · 内置方案版 \(appVersion)"
        window.minSize = NSSize(width: 820, height: 650)
        window.contentView = webView
        window.center()
        guard let resources = Bundle.main.resourceURL else { fatalError("Missing bundled resources") }
        webRoot = resources.appendingPathComponent("web", isDirectory: true)
        refreshLanguage()
        var page = URLComponents(url: webRoot.appendingPathComponent("index.html"), resolvingAgainstBaseURL: false)!
        page.queryItems = [URLQueryItem(name: "lang", value: language)]
        webView.loadFileURL(page.url!, allowingReadAccessTo: webRoot)
        if !testing { window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true) }
    }

    @objc func showAbout() {
        let alert = NSAlert()
        alert.messageText = localized("乳腺癌剂量计算") + " " + appVersion
        alert.informativeText = "仅限于学术交流，严禁商业用途\n版权所有 GitHub @jiayi-sketch\nApple 芯片测试版\n52个内置方案、7个单药剂量参考、18张指南摘要卡。\n依据所提供的2026 CSCO指南录入，未经独立临床验证。\n输入仅保存在本次窗口内存中；未接入报告自动匹配。"
        if language == "en" {
            alert.informativeText = "For academic exchange only. Commercial use is prohibited.\nCopyright GitHub @jiayi-sketch\nApple Silicon preview\n52 regimens, 7 single-drug dose references and 18 guideline summary cards.\nTranscribed from the supplied 2026 CSCO guideline; not independently clinically validated.\nInputs remain in window memory only. Automatic report matching is not implemented."
        } else if language == "zh-Hant" {
            alert.informativeText = localized(alert.informativeText)
        }
        alert.addButton(withTitle: language == "en" ? "OK" : "好")
        alert.runModal()
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        let allowed = url.isFileURL && url.standardizedFileURL.path.hasPrefix(webRoot.standardizedFileURL.path + "/")
        decisionHandler(allowed ? .allow : .cancel)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame else { return }
        if message.name == "languagePreference", let value = message.body as? String, supportedLanguages.contains(value) {
            language = value
            UserDefaults.standard.set(value, forKey: "interfaceLanguage")
            refreshLanguage()
            return
        }
        guard message.name == "copySummary",
              let value = message.body as? String, value.count < 30000 else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(value, forType: .string)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if testing {
            let script = """
            for (const [id,value] of [['height','180'],['weight','80'],['renal-value','50'],['renal-method','合成测试'],['reviewer','合成测试']]) {
              document.getElementById(id).value = value;
              document.getElementById(id).dispatchEvent(new Event('input',{bubbles:true}));
            }
            document.getElementById('renal-confirmed').checked = true;
            document.getElementById('confirmed').checked = true;
            document.getElementById('calculate').click();
            JSON.stringify({ready:window.ChemoAppReady, bsa:window.DoseCore.calculateBsa({heightCm:180,weightKg:80}),
            regimen:document.getElementById('entry-title').textContent,
            rows:JSON.parse(document.getElementById('raw-result').textContent).rows.length,
            rendered:document.querySelector('.drug-value').textContent});
            """
            webView.evaluateJavaScript(script) { value, error in
                if let error = error { print("SELF_TEST_ERROR: \(error)") }
                else { print("SELF_TEST_RESULT: \(value ?? "nil")") }
                fflush(stdout)
                NSApp.terminate(nil)
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
