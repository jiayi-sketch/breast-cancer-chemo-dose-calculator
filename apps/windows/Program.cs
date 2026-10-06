// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ChemoDose;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new DoseWindow(args));
    }
}

internal sealed class DoseWindow : Form
{
    private const string Origin = "https://chemodose.invalid";
    private const string Notice = "仅限于学术交流，严禁商业用途\n版权所有 GitHub @jiayi-sketch";
    private static readonly Assembly AppAssembly = Assembly.GetExecutingAssembly();
    private static readonly string Version = AppAssembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion.Split('+')[0];
    private readonly WebView2 web = new() { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.White };
    private readonly string profilePath = Path.Combine(Path.GetTempPath(), "ChemoDose", Guid.NewGuid().ToString("N"));
    private readonly Dictionary<string, byte[]> assets = new(StringComparer.Ordinal);
    private readonly bool testing;
    private readonly string? testReport;
    private readonly System.Windows.Forms.Timer testTimeout = new() { Interval = 60000 };
    private CoreWebView2Environment? environment;
    private string language = "zh-Hans";
    private readonly string preferencePath;
    private bool finishedTest;
    private string lastClipboard = "";
    private static bool SupportedLanguage(string? value) => value is "zh-Hans" or "zh-Hant" or "en";
    private string Localized(string source) {
        var translations = new Dictionary<string, (string Traditional, string English)> {
            ["Windows 应用版本"]=("Windows 應用程式版本","Windows application version"),
            ["帮助"]=("幫助","Help"), ["关于乳腺癌剂量计算"]=("關於乳腺癌劑量計算","About Breast Cancer Dose Calculator"),
            ["查看授权"]=("查看授權","View licence"), ["第三方许可"]=("第三方許可","Third-party licences"), ["退出"]=("退出","Exit"),
            ["关于"]=("關於","About"), ["非商业学术授权"]=("非商業學術授權","Noncommercial academic licence"),
            ["第三方运行时与库许可"]=("第三方執行階段與程式庫許可","Third-party runtime and library licences"),
            ["乳腺癌剂量计算"]=("乳腺癌劑量計算","Breast Cancer Dose Calculator"), ["内置方案版"]=("內置方案版","Built-in catalogue version")
        };
        return translations.TryGetValue(source,out var pair) ? language == "en" ? pair.English : language == "zh-Hant" ? pair.Traditional : source : source;
    }
    private void RefreshLanguage() {
        Text = $"{Localized("乳腺癌剂量计算")} · {Localized("内置方案版")} {Version}";
        if (MainMenuStrip?.Items[0] is ToolStripMenuItem help) {
            help.Text = Localized("帮助");
            foreach (ToolStripItem item in help.DropDownItems) item.Text = Localized((string)item.Tag!);
        }
    }
    private void ShowAbout() {
        string detail = language == "en"
            ? $"Breast Cancer Dose Calculator {Version}\n\nFor academic exchange only. Commercial use is prohibited.\nCopyright GitHub @jiayi-sketch\n\n52 regimens, 7 single-drug references and 18 guideline summary cards.\nShared catalogue and calculation core on Mac, Android and Windows.\nNot independently clinically validated; professional verification required."
            : $"{Localized("乳腺癌剂量计算")} {Version}\n\n{(language == "zh-Hant" ? "僅限於學術交流，嚴禁商業用途\n版權所有 GitHub @jiayi-sketch\n\n52 個內置方案、7 個單藥參考、18 張指南摘要卡。\n與 Mac、安卓使用相同方案庫和計算核心。\n未經獨立臨床驗證，結果須專業覆核。" : Notice + "\n\n52 个内置方案、7 个单药参考、18 张指南摘要卡。\n与 Mac、安卓使用相同方案库和计算核心。\n未经独立临床验证，结果须专业复核。")}";
        MessageBox.Show(this,detail,Localized("关于"),MessageBoxButtons.OK,MessageBoxIcon.Information);
    }
    private readonly TaskCompletionSource<bool> clipboardChecked = new();

    internal DoseWindow(string[] args)
    {
        testing = args.Contains("--self-test");
        preferencePath = testing ? Path.Combine(profilePath,"language.json") : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ChemoDose","language.json");
        try {
            if (File.Exists(preferencePath) && new FileInfo(preferencePath).Length <= 128) {
                using var preference = JsonDocument.Parse(File.ReadAllText(preferencePath));
                string? saved = preference.RootElement.GetProperty("language").GetString();
                if (SupportedLanguage(saved)) language = saved!;
            }
        } catch (Exception error) when (error is IOException or UnauthorizedAccessException or JsonException or KeyNotFoundException or InvalidOperationException) { }
        int reportIndex = Array.IndexOf(args, "--test-report");
        testReport = reportIndex >= 0 && reportIndex + 1 < args.Length ? args[reportIndex + 1] : null;
        Text = $"乳腺癌剂量计算 · 内置方案版 {Version}";
        ClientSize = new Size(1180, 840);
        MinimumSize = new Size(820, 650);
        StartPosition = FormStartPosition.CenterScreen;
        AutoScaleMode = AutoScaleMode.Dpi;
        var menu = new MenuStrip();
        var help = new ToolStripMenuItem("帮助");
        help.DropDownItems.Add("关于乳腺癌剂量计算", null, (_, _) => ShowAbout());
        help.DropDownItems.Add("查看授权", null, (_, _) =>
            MessageBox.Show(this, ReadResource("LICENSE.txt"), Localized("非商业学术授权"), MessageBoxButtons.OK, MessageBoxIcon.Information));
        help.DropDownItems.Add("第三方许可", null, (_, _) => ShowThirdPartyLicenses());
        help.DropDownItems.Add("退出", null, (_, _) => Close());
        foreach (ToolStripItem item in help.DropDownItems) item.Tag = item.Text;
        menu.Items.Add(help);
        MainMenuStrip = menu;
        RefreshLanguage();
        Controls.Add(web);
        Controls.Add(menu);
        foreach (string name in AppAssembly.GetManifestResourceNames().Where(n => n.StartsWith("web/", StringComparison.Ordinal)))
        {
            using Stream stream = AppAssembly.GetManifestResourceStream(name)!;
            using var buffer = new MemoryStream();
            stream.CopyTo(buffer);
            assets.Add("/" + name[4..].Replace('\\', '/'), buffer.ToArray());
        }
        if (testing)
        {
            ShowInTaskbar = false;
            testTimeout.Tick += (_, _) => FinishTest(false, "Windows self-test timed out.");
            testTimeout.Start();
        }
        Shown += async (_, _) => await InitializeWeb();
        Activated += async (_, _) => { if (web.CoreWebView2 is not null) await web.CoreWebView2.ExecuteScriptAsync("window.ChemoImport?.foreground()"); };
        FormClosed += (_, _) => { testTimeout.Dispose(); web.Dispose(); };
    }

    private static string ReadResource(string name)
    {
        using var reader = new StreamReader(AppAssembly.GetManifestResourceStream(name)!, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private void ShowThirdPartyLicenses()
    {
        using var dialog = new Form { Text = Localized("第三方运行时与库许可"), Size = new Size(780, 600), StartPosition = FormStartPosition.CenterParent };
        string content = string.Join("\r\n\r\n", AppAssembly.GetManifestResourceNames()
            .Where(n => n.StartsWith("licenses/", StringComparison.Ordinal)).Order()
            .Select(n => n + "\r\n\r\n" + ReadResource(n).ReplaceLineEndings("\r\n")));
        dialog.Controls.Add(new TextBox { Dock = DockStyle.Fill, Multiline = true, ReadOnly = true,
            ScrollBars = ScrollBars.Vertical, Text = content, Font = new Font("Segoe UI", 10) });
        dialog.ShowDialog(this);
    }

    private static bool IsPage(string value) => Uri.TryCreate(value, UriKind.Absolute, out Uri? uri)
        && uri.GetLeftPart(UriPartial.Authority) == Origin
        && uri.AbsolutePath is "/index.html" or "/manual.html";

    private async Task InitializeWeb()
    {
        try
        {
            environment = await CoreWebView2Environment.CreateAsync(null, profilePath);
            environment.BrowserProcessExited += (_, _) =>
            {
                try { Directory.Delete(profilePath, true); }
                catch (IOException) { /* InPrivate contains no saved application inputs. */ }
                catch (UnauthorizedAccessException) { }
            };
            var options = environment.CreateCoreWebView2ControllerOptions();
            options.IsInPrivateModeEnabled = true;
            await web.EnsureCoreWebView2Async(environment, options);
            CoreWebView2 core = web.CoreWebView2;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.AreDefaultScriptDialogsEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsPasswordAutosaveEnabled = false;
            core.Settings.IsGeneralAutofillEnabled = false;
            core.Settings.IsWebMessageEnabled = true;
            core.NavigationStarting += (_, e) => { e.Cancel = !IsPage(e.Uri); };
            core.FrameNavigationStarting += (_, e) => { e.Cancel = true; };
            core.NewWindowRequested += (_, e) => { e.Handled = true; };
            core.DownloadStarting += (_, e) => { e.Cancel = true; };
            core.PermissionRequested += (_, e) => { e.State = CoreWebView2PermissionState.Deny; };
            core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All,
                CoreWebView2WebResourceRequestSourceKinds.All);
            core.WebResourceRequested += ServeResource;
            core.WebMessageReceived += CopySummary;
            if (testing) core.NavigationCompleted += async (_, e) =>
            {
                if (!e.IsSuccess) { FinishTest(false, e.WebErrorStatus.ToString()); return; }
                try { await RunSelfTest(); }
                catch (Exception error) { FinishTest(false, error.Message); }
            };
            core.Navigate(Origin + "/index.html?lang=" + language);
        }
        catch (Exception error)
        {
            if (testing) { FinishTest(false, error.Message); return; }
            string detail = error is WebView2RuntimeNotFoundException
                ? "此电脑缺少 Microsoft Edge WebView2 Runtime。\n请从微软官网下载并安装 Evergreen Runtime，安装后重新打开本程序：\nhttps://developer.microsoft.com/microsoft-edge/webview2/\n\n本 EXE 已包含 .NET 运行时，无需另装 .NET。"
                : "应用无法启动，请记录以下错误并反馈（请勿附患者资料）：\n" + error.Message;
            MessageBox.Show(this, detail, "启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private void ServeResource(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
    {
        bool local = Uri.TryCreate(e.Request.Uri, UriKind.Absolute, out Uri? uri)
            && uri.GetLeftPart(UriPartial.Authority) == Origin && e.Request.Method == "GET";
        byte[]? bytes = null;
        if (local) assets.TryGetValue(uri!.AbsolutePath, out bytes);
        if (bytes is not null && uri!.AbsolutePath.EndsWith(".html", StringComparison.Ordinal)) {
            // Windows presentation only; catalogue and dose rules stay shared.
            string html = Encoding.UTF8.GetString(bytes).Replace("2.0.0", Version);
            if (uri.AbsolutePath == "/index.html") html = html.Replace("</head>", "<link rel=\"stylesheet\" href=\"windows-desktop/desktop.css\"><script defer src=\"windows-desktop/desktop.js\"></script></head>");
            bytes = Encoding.UTF8.GetBytes(html);
        }
        string mime = uri?.AbsolutePath.EndsWith(".html") == true ? "text/html"
            : uri?.AbsolutePath.EndsWith(".css") == true ? "text/css"
            : uri?.AbsolutePath.EndsWith(".wasm") == true ? "application/wasm"
            : uri?.AbsolutePath.EndsWith(".js") == true ? "text/javascript" : "application/octet-stream";
        const string policy = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
        e.Response = environment!.CreateWebResourceResponse(new MemoryStream(bytes ?? []),
            bytes is null ? 403 : 200, bytes is null ? "Forbidden" : "OK",
            $"Content-Type: {mime}; charset=utf-8\r\nCache-Control: no-store\r\nContent-Security-Policy: {policy}\r\nX-Content-Type-Options: nosniff");
    }

    private void CopySummary(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (!IsPage(e.Source)) return;
        string? requestId = null;
        try
        {
            using JsonDocument message = JsonDocument.Parse(e.WebMessageAsJson);
            JsonElement root = message.RootElement;
            if (root.GetProperty("type").GetString() == "reportImport") { ImportReport(root); return; }
            if (root.GetProperty("type").GetString() == "languagePreference") {
                string? saved = root.GetProperty("language").GetString();
                if (!SupportedLanguage(saved)) return;
                language = saved!;
                try {
                    Directory.CreateDirectory(Path.GetDirectoryName(preferencePath)!);
                    File.WriteAllText(preferencePath,JsonSerializer.Serialize(new {language}),Encoding.UTF8);
                } catch (Exception error) when (error is IOException or UnauthorizedAccessException) { /* UI still changes for this session. */ }
                RefreshLanguage(); return;
            }
            if (root.GetProperty("type").GetString() != "copySummary") return;
            requestId = root.GetProperty("requestId").GetString();
            if (requestId is null || requestId.Length > 100) return;
            string? value = root.GetProperty("value").GetString();
            if (value is null || value.Length > 30000) return;
            value = value.TrimEnd() + "\n\n" + Localized("Windows 应用版本") + ": " + Version;
            Clipboard.SetText(value);
            lastClipboard = value;
            if (testing) clipboardChecked.TrySetResult(Clipboard.GetText() == value && value.Contains("150.00 mg") && value.Contains(Version));
            web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "copySummaryResult", ok = true, requestId }));
        }
        catch (Exception error) when (error is JsonException or InvalidOperationException
            or KeyNotFoundException or System.Runtime.InteropServices.ExternalException)
        {
            if (testing) clipboardChecked.TrySetResult(false);
            web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "copySummaryResult", ok = false, requestId }));
        }
    }

    private void ImportReport(JsonElement request)
    {
        string id = request.GetProperty("requestId").GetString() ?? "";
        string source = request.GetProperty("source").GetString() ?? "";
        if (id.Length > 100 || source is not ("biopsy" or "postop" or "ihc" or "fish")) return;
        void Send(object value) => web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(value));
        try {
            string kind = request.GetProperty("kind").GetString() ?? "";
            bool automatic = request.TryGetProperty("automatic", out var auto) && auto.ValueKind == JsonValueKind.True;
            Image? image = null;
            if (kind == "image") {
                using var picker = new OpenFileDialog { Filter = "PNG / JPEG|*.png;*.jpg;*.jpeg", Multiselect = false };
                if (picker.ShowDialog(this) != DialogResult.OK) { Send(new {type="reportImportResult",requestId=id,cancelled=true}); return; }
                if (new FileInfo(picker.FileName).Length > 12*1024*1024) throw new IOException();
                using var stream = File.OpenRead(picker.FileName);
                using var original = Image.FromStream(stream, false, true);
                if ((long)original.Width*original.Height > 20000000) throw new IOException();
                image = new Bitmap(original);
            } else if (kind == "clipboard") {
                if (Clipboard.ContainsImage()) image = Clipboard.GetImage();
                else {
                    string text = Clipboard.ContainsText() ? Clipboard.GetText() : "";
                    bool marker = System.Text.RegularExpressions.Regex.IsMatch(text,@"\b(?:ER|PR|HER[ -]?2|Ki[ -]?67)\b|乳腺|病理|免疫组化|免疫組化",System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (automatic && (text==lastClipboard || !marker)) { Send(new {type="reportImportResult",requestId=id,cancelled=true}); return; }
                    if (text.Length>40000) throw new IOException();
                    lastClipboard=text;Send(new {type="reportImportResult",requestId=id,text});return;
                }
            }
            using (image) {
                if (image is null || (long)image.Width*image.Height>20000000) throw new IOException();
                using var stream = new MemoryStream();image.Save(stream,System.Drawing.Imaging.ImageFormat.Png);
                if (stream.Length>12*1024*1024) throw new IOException();
                string signature = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(stream.ToArray()));
                if (automatic && signature==lastClipboard) { Send(new {type="reportImportResult",requestId=id,cancelled=true}); return; }
                lastClipboard=signature;
                Send(new {type="reportImportResult",requestId=id,image="data:image/png;base64,"+Convert.ToBase64String(stream.ToArray())});
            }
        } catch (Exception error) when (error is IOException or ArgumentException or UnauthorizedAccessException or System.Runtime.InteropServices.ExternalException) {
            Send(new {type="reportImportResult",requestId=id,error=true});
        }
    }

    private async Task RunSelfTest()
    {
        // Only synthetic values. Exercises the embedded page in the actual Windows renderer.
        string result = await web.CoreWebView2.ExecuteScriptAsync("""
            (() => {
              for (const [id,value] of [['height','180'],['weight','80'],['renal-value','50'],['reviewer','合成测试']]) {
                document.getElementById(id).value=value;
                document.getElementById(id).dispatchEvent(new Event('input',{bubbles:true}));
              }
              document.getElementById('renal-confirmed').checked=true;
              document.getElementById('confirmed').checked=true;
              document.getElementById('calculate').click();
              const result=JSON.parse(document.getElementById('raw-result').textContent);
              const first=document.querySelector('.drug-value').textContent;
              document.getElementById('copy').click();
              const renalMethodRemoved=!document.getElementById('renal-method') && !JSON.stringify(result).includes('renalMethod');
              const languages=[];
              for (const code of ['zh-Hant','en','zh-Hans']) {
                const chooser=document.getElementById('language');chooser.value=code;chooser.dispatchEvent(new Event('change',{bubbles:true}));
                const cleared=document.getElementById('raw-result').textContent==='';
                const retained=document.getElementById('height').value==='180' && document.getElementById('reviewer').value==='合成测试' && document.getElementById('bsa-value').textContent==='2.000';
                const reset=!document.getElementById('confirmed').checked && !document.getElementById('renal-confirmed').checked;
                document.getElementById('renal-confirmed').checked=true;
                document.getElementById('confirmed').checked=true;document.getElementById('calculate').click();
                const rows=JSON.parse(document.getElementById('raw-result').textContent).rows;
                const values=rows.flatMap(r=>r.result.quantities.map(q=>q.valueMg));
                const header=document.querySelector('h1').textContent;
                languages.push({language:code,cleared,retained,reset,values,header,passed:cleared && retained && reset && JSON.stringify(values)==='[150,450,640,480,840,420]' && document.documentElement.lang===code && (code!=='en'||header==='Breast Cancer Dose Calculator')});
              }
              const reportChecks=[];
              for (const code of ['zh-Hans','zh-Hant','en']) {
                window.ChemoI18n.setLanguage(code);
                document.getElementById('reports-example-load').click();document.getElementById('reports-analyze').click();
                for (const [key,value] of [['phase','neo'],['menopause','pre'],['surgery','none'],['nodes','negative']]) {
                  const element=document.getElementById('report-context-'+key);element.value=value;element.dispatchEvent(new Event('change',{bubbles:true}));
                }
                document.getElementById('report-reviewed').checked=true;document.getElementById('reports-match').click();
                const match=document.querySelector('#report-matches [data-report-entry-id]');if(!match)throw new Error('No report match');match.click();
                for (const [id,value] of [['height','180'],['weight','80'],['renal-value','50'],['reviewer','合成测试']]) {
                  const element=document.getElementById(id);element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));
                }
                document.getElementById('renal-confirmed').checked=true;document.getElementById('confirmed').checked=true;document.getElementById('calculate').click();
                const calculation=JSON.parse(document.getElementById('raw-result').textContent);
                const matched=calculation.reportReview?.subtype==='HER2阳性' && calculation.rows.length===4;
                const text=document.getElementById('report-ihc');text.value='ER(0%),PR(0%);HER2(0)';text.dispatchEvent(new Event('input',{bubbles:true}));
                const cleared=document.getElementById('raw-result').textContent==='' && document.getElementById('reports-match').disabled;
                reportChecks.push({language:code,matched,cleared,passed:matched&&cleared});
              }
              const chooser=document.getElementById('language');chooser.value='en';chooser.dispatchEvent(new Event('change',{bubbles:true}));
              document.getElementById('section-0').click();
              const long=[...document.querySelectorAll('.entry-button')].find(b=>b.textContent.replace(/\s/g,'').includes('AC→TP'));
              if (long) { long.click(); long.scrollIntoView({block:'nearest'}); }
              window.ChemoWindowsDesktop?.synchronize();
              const selected=document.querySelector('.entry-button.is-selected');
              const fits=!!selected && selected.querySelector('strong').textContent===document.getElementById('entry-title').textContent && selected.querySelector('strong').scrollHeight<=selected.querySelector('strong').clientHeight+1 && selected.getBoundingClientRect().right<=innerWidth;
              const cleared=document.getElementById('raw-result').textContent==='';
              window.scrollTo(0,0);
              return {ready:window.ChemoAppReady,version:window.ChemoWindowsDesktop?.version,sharedCatalogueVersion:window.ChemoCatalogue.appVersion,engine:window.DoseCore.ENGINE_VERSION,
                renalMethodRemoved,languages,reportChecks,reportReady:window.ChemoReportReady,languageSelectFits:document.getElementById('language').getBoundingClientRect().right<=innerWidth,
                count:window.ChemoCatalogue.regimens.filter(r=>r.entryType==='regimen').length,rows:result.rows.length,first,longName:!!long,fits,cleared,
                notice:document.body.textContent.includes('For academic exchange only. Commercial use is prohibited.') && document.body.textContent.includes('Copyright GitHub @jiayi-sketch')};
            })()
            """);
        using JsonDocument doc = JsonDocument.Parse(result);
        JsonElement r = doc.RootElement;
        bool clipboardPassed = await clipboardChecked.Task.WaitAsync(TimeSpan.FromSeconds(5));
        if (testReport is not null)
        {
            using var screenshot = File.Create(Path.ChangeExtension(testReport, ".png"));
            await web.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, screenshot);
        }
        bool passed = r.GetProperty("ready").GetBoolean() && r.GetProperty("version").GetString() == Version
            && r.GetProperty("engine").GetString() == "2.0.0" && r.GetProperty("sharedCatalogueVersion").GetString() == "2.0.0" && r.GetProperty("count").GetInt32() == 52
            && r.GetProperty("rows").GetInt32() == 4 && r.GetProperty("first").GetString()!.StartsWith("150.00 mg / 次", StringComparison.Ordinal)
            && r.GetProperty("longName").GetBoolean() && r.GetProperty("fits").GetBoolean()
            && r.GetProperty("renalMethodRemoved").GetBoolean()
            && r.GetProperty("reportReady").GetBoolean() && r.GetProperty("reportChecks").EnumerateArray().All(item=>item.GetProperty("passed").GetBoolean())
            && r.GetProperty("languages").EnumerateArray().All(item=>item.GetProperty("passed").GetBoolean())
            && r.GetProperty("languageSelectFits").GetBoolean()
            && r.GetProperty("cleared").GetBoolean() && r.GetProperty("notice").GetBoolean() && clipboardPassed;
        bool desktopPreviewsPassed = await CaptureDesktopPreviews();
        bool languagePreferencePassed = File.Exists(preferencePath) && JsonDocument.Parse(File.ReadAllText(preferencePath)).RootElement.GetProperty("language").GetString() == "en";
        // Real renderer + bundled OCR + native clipboard, starting from an empty fictional case.
        await web.CoreWebView2.ExecuteScriptAsync("document.getElementById('reports-clear').click();document.getElementById('reports-open').click()");
        using (var bitmap = new Bitmap(1600,500)) {
            using var graphics = Graphics.FromImage(bitmap);graphics.Clear(Color.White);
            using var font = new Font("Arial",36);
            graphics.DrawString("SYNTHETIC REPORT - NOT A PATIENT\nER: 80%; PR: 20%; HER2: 3+\nKi-67: 35%",font,Brushes.Black,new PointF(40,40));
            Clipboard.SetImage(bitmap);
        }
        await web.CoreWebView2.ExecuteScriptAsync("window.ChemoImportTest={};window.ChemoImport.request('clipboard')");
        var deadline = DateTime.UtcNow.AddSeconds(40);
        while (DateTime.UtcNow < deadline && await web.CoreWebView2.ExecuteScriptAsync("window.ChemoImport.busy") == "true") await Task.Delay(250);
        string ocrResult = await web.CoreWebView2.ExecuteScriptAsync("({passed:document.getElementById('report-import-dialog').open && document.getElementById('report-field-ER').value==='positive' && document.getElementById('report-field-PR').value==='positive' && document.getElementById('report-field-IHC').value==='3+' && !document.getElementById('report-reviewed').checked && document.getElementById('raw-result').textContent==='',status:document.getElementById('report-import-status').textContent,error:window.ChemoImportTest?.error})");
        using var ocr = JsonDocument.Parse(ocrResult);
        bool ocrPassed = ocr.RootElement.GetProperty("passed").GetBoolean();
        if (testReport is not null) {
            using var screenshot = File.Create(Path.ChangeExtension(testReport,".ocr.png"));
            await web.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,screenshot);
        }
        FinishTest(passed && desktopPreviewsPassed && languagePreferencePassed && ocrPassed, JsonSerializer.Serialize(new { page = r.Clone(), clipboardPassed, desktopPreviewsPassed, languagePreferencePassed, ocr = ocr.RootElement.Clone() }));
    }

    private async Task<bool> CaptureDesktopPreviews()
    {
        bool passed = true;
        foreach (string code in new[] { "zh-Hans", "zh-Hant", "en" }) {
            string language = JsonSerializer.Serialize(code);
            string check = await web.CoreWebView2.ExecuteScriptAsync($$"""
                (() => {
                  window.ChemoI18n.setLanguage({{language}});
                  document.getElementById('section-0').click();
                  document.querySelector('[data-entry-id="r001"]').click();
                  for (const [id,value] of [['height','180'],['weight','80'],['renal-value','50'],['reviewer','Synthetic QA']]) {
                    const field=document.getElementById(id);field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));
                  }
                  document.getElementById('renal-confirmed').checked=true;document.getElementById('confirmed').checked=true;
                  document.getElementById('calculate').click();window.ChemoWindowsDesktop.synchronize();window.scrollTo(0,0);
                  return document.querySelectorAll('.drug-row').length===4 && document.getElementById('dose-table').textContent.includes('450.00') && document.documentElement.scrollWidth<=innerWidth;
                })()
                """);
            passed &= check == "true";
            await Task.Delay(200);
            if (testReport is not null) {
                using var preview = File.Create(Path.ChangeExtension(testReport, "." + code + ".png"));
                await web.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,preview);
            }
        }
        ClientSize = new Size(1024,700);
        await Task.Delay(200);
        string small = await web.CoreWebView2.ExecuteScriptAsync("document.querySelector('[data-entry-id=\"r018\"]').click();window.ChemoWindowsDesktop.synchronize();document.documentElement.scrollWidth<=innerWidth && document.querySelectorAll('.drug-row').length===6 && document.getElementById('entry-list').getBoundingClientRect().width>=180 && document.querySelector('.patient-panel').getBoundingClientRect().top<document.querySelector('.catalogue-layout').getBoundingClientRect().top");
        passed &= small == "true";
        if (testReport is not null) {
            using var preview = File.Create(Path.ChangeExtension(testReport,".small.png"));
            await web.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,preview);
        }
        return passed;
    }

    private void FinishTest(bool passed, string detail)
    {
        if (finishedTest) return;
        finishedTest = true;
        testTimeout.Stop();
        string result = JsonSerializer.Serialize(new { passed, version = Version, detail });
        if (testReport is not null) File.WriteAllText(testReport, result, Encoding.UTF8);
        Environment.ExitCode = passed ? 0 : 1;
        Close();
    }
}
