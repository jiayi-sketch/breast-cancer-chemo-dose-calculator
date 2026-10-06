# Windows 统一入口（2.0.2）

下载 `ChemoDose-2.0.2-windows-unified.exe` 后双击即可，不需要自行判断 x86 / x64。
本文件包含两种紧凑界面，自动选择适合当前电脑的引擎，不改变方案、病理匹配或剂量计算规则。

| 系统 | 默认打开的界面 | 图片 OCR |
| --- | --- | --- |
| Win10 22H2 / Win11 Intel/AMD x64，已安装 WebView2 Runtime | 现代完整界面 | 有 |
| 上述系统未检测到 WebView2 Runtime | 兼容界面，并提示如何获得完整界面 | 无 |
| Win10 x86、较早 Win10、Win8 / 8.1 | x86 兼容界面 | 无 |
| Win7 SP1 x86 / x64 | x86 兼容界面 | 无 |
| XP SP3 x86 | x86 兼容界面 | 无 |

这是程序的目标分流范围，不代表全部系统已经验收或仍获微软维护。
2026-10-06，作者反馈：旧版 2.0.0 统一 EXE 已在 Win7 x86 和 Win10 x64 真机验证通过。该记录来自作者反馈，系统补丁版本、测试步骤及逐项功能记录尚未提供；不代表所有配置或功能均已验收。本次 2.0.2 旧版布局修订与安装包需重新验收；XP 真机验收仍待完成；Windows ARM、Vista、XP x64 不在本包目标范围。
旧系统仍须先安装微软 .NET Framework 4；没有捆绑或自动下载安装微软运行时。
统一启动器使用 CLR4（现代 Windows 一般已有兼容的 .NET Framework 4.x），现代引擎仍自带 .NET 10。
WebView2 仅为现代界面所需；未检测到时可直接使用文字导入及药物弹窗。

## 使用

第一次启动会将选中的程序组件解包到当前用户的
`%LOCALAPPDATA%\ChemoDose\Bundles\2.0.2-<bundle-id>`，无需管理员权限。
以后每次启动校验组件长度和 SHA256；缺失或损坏时从本 EXE 重新解包。
此目录保存程序、许可和说明，不保存患者资料。关闭全部程序后可手动删除该缓存目录；下次启动会重新生成。

兼容界面支持简体中文、繁体中文和 English、病理文字导入与药物目录弹窗；不包含图片 OCR 和自定义单药规则页面。
若需要手动使用兼容界面，可建立快捷方式，在目标 EXE 路径后添加 `--compat`。
两个引擎目前分别保存语言偏好；报告、输入数值、复核状态不在它们之间传递。

技术自检（只用虚构数据）：

```bat
ChemoDose-2.0.2-windows-unified.exe --self-test --test-report windows-unified-self-test.json
ChemoDose-2.0.2-windows-unified.exe --compat --self-test --test-report windows-compat-self-test.json
ChemoDose-2.0.2-windows-unified.exe --describe --report windows-selection.json
```

`--describe` 只记录系统版本、架构、WebView2 检测及选择结果，不解包或启动引擎。
技术测试不等同于临床验证。反馈请使用虚构数据，不上传患者信息。

仅限于学术交流，严禁商业用途  
版权所有 GitHub @jiayi-sketch

## 构建

```sh
python3 scripts/build-windows-unified.py \
  --dotnet /path/to/dotnet \
  --references /path/to/net40/build/.NETFramework/v4.0 \
  --modern /path/to/ChemoDose-2.0.2-windows-x64.exe \
  --legacy /path/to/ChemoDose-2.0.2-windows-x86-legacy.exe \
  --legacy-config /path/to/ChemoDose-2.0.2-windows-x86-legacy.exe.config \
  --output /path/to/releases
```

构建需 .NET SDK 10.0.401 编译器和 net40 参考程序集；不下载依赖、不执行输入的 EXE。
现有两版的许可和资源继续保留在内嵌 EXE 内。启动器不请求网络、不安装组件、不修改注册表。
构建记录列出两版原始文件的 SHA256，便于确认是否复用了已测试的程序。

系统探测使用微软 [RtlGetVersion](https://learn.microsoft.com/en-us/windows/win32/devnotes/rtlgetversion)、
[GetNativeSystemInfo](https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/nf-sysinfoapi-getnativesysteminfo)，
新 Windows 另用 IsWow64Process2 区分 ARM 仿真。
WebView2 依照[微软分发文档](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)检查用户和系统注册表中的 `pv`。
注册表检测不能保证组件未损坏；如仍不能启动现代界面，可用 `--compat`。
