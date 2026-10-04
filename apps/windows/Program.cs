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
    private static readonly string Version = AppAssembly.GetName().Version!.ToString(3);
    private readonly WebView2 web = new() { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.White };
    private readonly string profilePath = Path.Combine(Path.GetTempPath(), "ChemoDose", Guid.NewGuid().ToString("N"));
    private readonly Dictionary<string, byte[]> assets = new(StringComparer.Ordinal);
    private readonly bool testing;
    private readonly string? testReport;
    private readonly System.Windows.Forms.Timer testTimeout = new() { Interval = 60000 };
    private CoreWebView2Environment? environment;
    private bool finishedTest;
    private readonly TaskCompletionSource<bool> clipboardChecked = new();

    internal DoseWindow(string[] args)
    {
        testing = args.Contains("--self-test");
        int reportIndex = Array.IndexOf(args, "--test-report");
        testReport = reportIndex >= 0 && reportIndex + 1 < args.Length ? args[reportIndex + 1] : null;
        Text = $"乳腺癌剂量计算 · 内置方案版 {Version}";
        ClientSize = new Size(1180, 840);
        MinimumSize = new Size(820, 650);
        StartPosition = FormStartPosition.CenterScreen;
        AutoScaleMode = AutoScaleMode.Dpi;
        var menu = new MenuStrip();
        var help = new ToolStripMenuItem("帮助");
        help.DropDownItems.Add("关于乳腺癌剂量计算", null, (_, _) =>
            MessageBox.Show(this, $"乳腺癌剂量计算 {Version}\n\n{Notice}\n\n52 个内置方案、7 个单药参考、18 张指南摘要卡。\n与 Mac、安卓使用相同界面、方案库和计算核心。\n未经独立临床验证，结果须专业复核。", "关于", MessageBoxButtons.OK, MessageBoxIcon.Information));
        help.DropDownItems.Add("查看授权", null, (_, _) =>
            MessageBox.Show(this, ReadResource("LICENSE.txt"), "非商业学术授权", MessageBoxButtons.OK, MessageBoxIcon.Information));
        help.DropDownItems.Add("第三方许可", null, (_, _) => ShowThirdPartyLicenses());
        help.DropDownItems.Add("退出", null, (_, _) => Close());
        menu.Items.Add(help);
        MainMenuStrip = menu;
        Controls.Add(web);
        Controls.Add(menu);
        foreach (string name in AppAssembly.GetManifestResourceNames().Where(n => n.StartsWith("web/", StringComparison.Ordinal)))
        {
            using Stream stream = AppAssembly.GetManifestResourceStream(name)!;
            using var buffer = new MemoryStream();
            stream.CopyTo(buffer);
            assets.Add("/" + name[4..], buffer.ToArray());
        }
        if (testing)
        {
            ShowInTaskbar = false;
            testTimeout.Tick += (_, _) => FinishTest(false, "Windows self-test timed out.");
            testTimeout.Start();
        }
        Shown += async (_, _) => await InitializeWeb();
        FormClosed += (_, _) => { testTimeout.Dispose(); web.Dispose(); };
    }

    private static string ReadResource(string name)
    {
        using var reader = new StreamReader(AppAssembly.GetManifestResourceStream(name)!, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private void ShowThirdPartyLicenses()
    {
        using var dialog = new Form { Text = "第三方运行时与库许可", Size = new Size(780, 600), StartPosition = FormStartPosition.CenterParent };
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
            core.Navigate(Origin + "/index.html");
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
        string mime = uri?.AbsolutePath.EndsWith(".html") == true ? "text/html"
            : uri?.AbsolutePath.EndsWith(".css") == true ? "text/css" : "text/javascript";
        const string policy = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
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
            if (root.GetProperty("type").GetString() != "copySummary") return;
            requestId = root.GetProperty("requestId").GetString();
            if (requestId is null || requestId.Length > 100) return;
            string? value = root.GetProperty("value").GetString();
            if (value is null || value.Length > 30000) return;
            Clipboard.SetText(value);
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

    private async Task RunSelfTest()
    {
        // Only synthetic values. Exercises the embedded page in the actual Windows renderer.
        string result = await web.CoreWebView2.ExecuteScriptAsync("""
            (() => {
              for (const [id,value] of [['height','180'],['weight','80'],['renal-value','50'],['renal-method','合成测试'],['reviewer','合成测试']]) {
                document.getElementById(id).value=value;
                document.getElementById(id).dispatchEvent(new Event('input',{bubbles:true}));
              }
              document.getElementById('renal-confirmed').checked=true;
              document.getElementById('confirmed').checked=true;
              document.getElementById('calculate').click();
              const result=JSON.parse(document.getElementById('raw-result').textContent);
              const first=document.querySelector('.drug-value').textContent;
              document.getElementById('copy').click();
              const long=[...document.querySelectorAll('.entry-button')].find(b=>b.textContent.includes('AC→TP（白蛋白紫杉醇+卡铂）'));
              if (long) long.click();
              const active=document.querySelector('.is-selected'), bounds=active?.getBoundingClientRect();
              const fits=!!active && [...active.children].every(c=>{const r=c.getBoundingClientRect();return r.top>=bounds.top && r.bottom<=bounds.bottom+1;});
              const cleared=document.getElementById('raw-result').textContent==='';
              return {ready:window.ChemoAppReady,version:window.ChemoCatalogue.appVersion,engine:window.DoseCore.ENGINE_VERSION,
                count:window.ChemoCatalogue.regimens.filter(r=>r.entryType==='regimen').length,rows:result.rows.length,first,longName:!!long,fits,cleared,
                notice:document.body.textContent.includes('仅限于学术交流，严禁商业用途') && document.body.textContent.includes('版权所有 GitHub @jiayi-sketch')};
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
            && r.GetProperty("engine").GetString() == Version && r.GetProperty("count").GetInt32() == 52
            && r.GetProperty("rows").GetInt32() == 4 && r.GetProperty("first").GetString()!.StartsWith("150.00 mg / 次", StringComparison.Ordinal)
            && r.GetProperty("longName").GetBoolean() && r.GetProperty("fits").GetBoolean()
            && r.GetProperty("cleared").GetBoolean() && r.GetProperty("notice").GetBoolean() && clipboardPassed;
        FinishTest(passed, result);
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
