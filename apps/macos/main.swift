// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import Cocoa
import WebKit
import Vision
import ImageIO

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    var webRoot: URL!
    let appVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "未知"
    let testing = CommandLine.arguments.contains("--self-test")
    lazy var history = SecureHistory(testing: testing)
    var lastClipboardCount = -1

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
        config.userContentController.add(self, name: "reportImport")
        config.userContentController.add(self, name: "history")
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
        window.makeKeyAndOrderFront(nil)
        if !testing { NSApp.activate(ignoringOtherApps: true) }
        if testing { DispatchQueue.main.asyncAfter(deadline:.now()+90) { print("SELF_TEST_ERROR: native test timed out");fflush(stdout);self.history.removeTestData();exit(1) } }
    }

    @objc func showAbout() {
        let alert = NSAlert()
        alert.messageText = localized("乳腺癌剂量计算") + " " + appVersion
        alert.informativeText = "仅限于学术交流，严禁商业用途\n版权所有 GitHub @jiayi-sketch\nApple 芯片测试版\n52个内置方案、7个单药剂量参考、18张指南摘要卡。\n依据所提供的2026 CSCO指南录入，未经独立临床验证。\n支持本机加密历史记录查询与删除；不保存病理原文或截图。"
        if language == "en" {
            alert.informativeText = "For academic exchange only. Commercial use is prohibited.\nCopyright GitHub @jiayi-sketch\nApple Silicon preview\n52 regimens, 7 single-drug dose references and 18 guideline summary cards.\nTranscribed from the supplied 2026 CSCO guideline; not independently clinically validated.\nSupports encrypted local history, search and deletion. Pathology text and screenshots are not saved."
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
        if message.name == "history", let request=message.body as? [String:Any], let id=request["requestId"] as? String, id.count<=100 {
            var response:[String:Any] = ["requestId":id,"ok":false,"error":"storage"]
            do {
                if request["op"] as? String == "read" {
                    let (content,revision)=try history.read();response=["requestId":id,"ok":true,"content":content,"revision":revision]
                } else if request["op"] as? String == "write", let content=request["content"] as? String, let revision=request["revision"] as? String,
                          content.utf8.count<=SecureHistory.limit, let payload=try JSONSerialization.jsonObject(with:Data(content.utf8)) as? [String:Any], payload["schemaVersion"] as? Int == 1, let records=payload["records"] as? [Any], records.count<=500 {
                    let ok=try history.write(content,revision:revision);response=["requestId":id,"ok":ok,"error":ok ? "" : "conflict"]
                }
            } catch { }
            if let data=try? JSONSerialization.data(withJSONObject:response), let text=String(data:data,encoding:.utf8) { webView.evaluateJavaScript("window.ChemoHistory?.receive("+text+")",completionHandler:nil) }
            return
        }
        if message.name == "reportImport", let request = message.body as? [String: Any] {
            importReport(request)
            return
        }
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
        lastClipboardCount = NSPasteboard.general.changeCount
    }

    func sendImport(_ result: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: result), let text = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.ChemoImport?.receive(\(text))", completionHandler: nil)
    }
    func importReport(_ request: [String: Any]) {
        guard let id = request["requestId"] as? String, id.count <= 100,
              let kind = request["kind"] as? String,
              let source = request["source"] as? String, ["biopsy", "postop", "ihc", "fish"].contains(source) else { return }
        if kind == "image" {
            let panel = NSOpenPanel(); panel.allowedContentTypes = [.png, .jpeg]; panel.allowsMultipleSelection = false
            panel.beginSheetModal(for: window) { response in
                guard response == .OK, let url = panel.url else { self.sendImport(["requestId":id,"cancelled":true]); return }
                guard let attrs = try? FileManager.default.attributesOfItem(atPath:url.path), let size = attrs[.size] as? NSNumber,
                      size.intValue <= 12*1024*1024, let data = try? Data(contentsOf:url) else { self.sendImport(["requestId":id,"error":true]); return }
                self.recognize(data,id:id)
            }
        } else if kind == "clipboard" {
            let clipboard = NSPasteboard.general
            if request["automatic"] as? Bool == true && clipboard.changeCount == lastClipboardCount { sendImport(["requestId":id,"cancelled":true]); return }
            lastClipboardCount = clipboard.changeCount
            if let data = clipboard.data(forType:.png) ?? clipboard.data(forType:.tiff) {
                recognize(data,id:id)
            } else if let text = clipboard.string(forType:.string), text.count <= 40000 {
                if request["automatic"] as? Bool == true && text.range(of:"\\b(?:ER|PR|HER[ -]?2|Ki[ -]?67)\\b|乳腺|病理|免疫组化|免疫組化", options:[.regularExpression,.caseInsensitive]) == nil { sendImport(["requestId":id,"cancelled":true]); return }
                sendImport(["requestId":id,"text":text])
            } else { sendImport(["requestId":id,"error":true]) }
        }
    }
    func recognize(_ data: Data, id: String) {
        sendImport(["requestId":id,"started":true])
        guard data.count <= 12*1024*1024, let source = CGImageSourceCreateWithData(data as CFData,nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source,0,nil) as? [CFString:Any],
              let width = properties[kCGImagePropertyPixelWidth] as? NSNumber, let height = properties[kCGImagePropertyPixelHeight] as? NSNumber,
              width.doubleValue * height.doubleValue <= 20000000, let image = CGImageSourceCreateImageAtIndex(source,0,nil) else { sendImport(["requestId":id,"error":true]); return }
        DispatchQueue.global(qos:.userInitiated).async {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en-US"]
            request.usesLanguageCorrection = false
            request.automaticallyDetectsLanguage = true
            do {
                try VNImageRequestHandler(cgImage:image).perform([request])
                let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator:"\n")
                DispatchQueue.main.async { self.sendImport(["requestId":id,"text":text,"ocr":true]) }
            } catch { DispatchQueue.main.async { self.sendImport(["requestId":id,"error":true]) } }
        }
    }
    func applicationDidBecomeActive(_ notification: Notification) {
        webView?.evaluateJavaScript("window.ChemoImport?.foreground()", completionHandler:nil)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if testing {
            let script = """
            await window.ChemoHistory.ready;
            for (const [id,value] of [['height','180'],['weight','80'],['renal-value','50'],['hospital-number','合成测试']]) {
              document.getElementById(id).value = value;
              document.getElementById(id).dispatchEvent(new Event('input',{bubbles:true}));
            }
            document.getElementById('renal-confirmed').checked = true;
            document.getElementById('confirmed').checked = true;
            document.getElementById('calculate').click();
            const reportChecks=[];
              for (const code of ['zh-Hans','zh-Hant','en']) {
                window.ChemoI18n.setLanguage(code);
                document.getElementById('reports-example-load').click();document.getElementById('reports-analyze').click();
                for (const [key,value] of [['phase','neo'],['menopause','pre'],['surgery','none'],['nodes','negative']]) {
                  const element=document.getElementById('report-context-'+key);element.value=value;element.dispatchEvent(new Event('change',{bubbles:true}));
                }
                document.getElementById('report-reviewed').checked=true;document.getElementById('reports-match').click();
                const match=document.querySelector('#report-matches [data-report-entry-id]');if(!match)throw new Error('No report match');match.click();
                for (const [id,value] of [['height','180'],['weight','80'],['renal-value','50'],['hospital-number','合成测试']]) {
                  const element=document.getElementById(id);element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));
                }
                document.getElementById('renal-confirmed').checked=true;document.getElementById('confirmed').checked=true;document.getElementById('calculate').click();
                const calculation=JSON.parse(document.getElementById('raw-result').textContent);
                const matched=calculation.reportReview?.subtype==='HER2阳性' && calculation.rows.length===4;
                const text=document.getElementById('report-ihc');text.value='ER(0%),PR(0%);HER2(0)';text.dispatchEvent(new Event('input',{bubbles:true}));
                const cleared=document.getElementById('raw-result').textContent==='' && document.getElementById('reports-match').disabled;
                reportChecks.push({language:code,matched,cleared,passed:matched&&cleared});
              }
              const historyChecks=await window.runHistorySelfTest();
              return JSON.stringify({historyChecks,reportReady:window.ChemoReportReady,reportChecks,passed:reportChecks.every(r=>r.passed)&&historyChecks.passed,ready:window.ChemoAppReady, bsa:window.DoseCore.calculateBsa({heightCm:180,weightKg:80}),
            regimen:document.getElementById('entry-title').textContent,
            rows:reportChecks.length,
            rendered:document.querySelector('.drug-value').textContent});
            """
            webView.callAsyncJavaScript(script, arguments:[:], in:nil, in:.page) { outcome in
                let value:Any?;let error:Error?
                switch outcome {case .success(let result):value=result;error=nil;case .failure(let failure):value=nil;error=failure}
                self.history.removeTestData()
                if let error = error { print("SELF_TEST_ERROR: \(error)"); exit(1) }
                else {
                    print("SELF_TEST_RESULT: \(value ?? "nil")")
                    guard let text = value as? String, let data = text.data(using: .utf8),
                          let result = try? JSONSerialization.jsonObject(with: data) as? [String: Any], result["passed"] as? Bool == true else { exit(1) }
                }
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
