# Windows 32 位兼容预览版

版本：2.0.0。目标：Windows 7 SP1 32 位、Windows XP SP3 32 位；**尚未在这两种系统上完成启动与界面验证，不能视为已经确认兼容**。文件名包含 `windows-x86-legacy`，与面向 Windows 10/11 的 x64 EXE 分开。

## 安装与运行

1. 先确认操作系统版本。XP 必须为 SP3；Windows 7 建议 SP1。
2. 如未安装 .NET Framework 4，请使用[微软官方完整安装包](https://www.microsoft.com/en-us/download/details.aspx?id=17718)。XP 不可用 .NET Framework 4.5 或 .NET 10 替代。Windows 7 已安装兼容的 .NET Framework 4.x 时通常无需重复安装。
3. 解压兼容版 ZIP，将 EXE 和 `.exe.config` 放在同一目录，双击 EXE。Jint 解释器、方案数据和计算引擎均已内嵌，不需要安装 WebView2，不需要联网运行。该 ZIP 不包含微软运行时安装器。
4. “内置方案”中按栏目、分型或关键词查找条目，核对剂量系数、阶段、频次和出处后填写参数；AUC 行另外核对肾功能值的单位与适用性。核对人和本次确认不可省略。
5. “报告识别与病理匹配”中粘贴文字，识别后核对 ER、PR、HER2 IHC、ISH，选择治疗阶段、绝经状态、术式和淋巴结状态；人工改动需填写依据。Ki-67 及原句在证据区显示，不自动用于决定分型。点击匹配后，明确选择目录条目并打开，再核对剂量。

支持简体中文、繁體中文和 English，只保存语言偏好。不创建病例文件；复制核对单会写入系统剪贴板。清除病例会清空报告、数值、核对人、修正依据和确认状态。用户输入的报告证据和修正依据保留原文，不自动翻译。

本版使用原生 Windows Forms 布局，不同于现代系统的网页界面。内置 52 个方案、7 个单药剂量参考和 18 张摘要卡完整复用。自定义单药规则页面尚未移植到此兼容外壳；报告照片/扫描 PDF OCR 亦未提供。没有增加诊断、治疗选择或患者适用性判断。

## 实现与构建

运行目标为 .NET Framework 4.0，C# 5 编译、x86、PE32、Windows GUI 子系统 5.01、CLR 元数据 v4.0.30319。不存在 .NET 10 或 WebView2 运行时引用。Jint 2.11.58 的 net40 DLL 内嵌，使用 BSD 2-Clause 许可，原文在 `apps/windows-legacy/licenses` 和程序“第三方许可”中。

复用 `core.browser.js`、`catalogue-engine.browser.js` 和 `reports-engine.browser.js`，通过 TypeScript 5.9.3 转换为 ES5；没有重写或另设剂量、病理判断规则。`polyfills.js` 补充受控的 ES5 适配，NFKC 规范化委托给 .NET 的 FormKC。解释器未开放 CLR 访问；报告仅作为 JSON 字符串输入，不执行报告中的代码、命令或指令。

编译所需依赖从官方 NuGet 获取并解压：

- [Microsoft.NETFramework.ReferenceAssemblies.net40 1.0.3](https://www.nuget.org/packages/Microsoft.NETFramework.ReferenceAssemblies.net40/1.0.3)
- [Jint 2.11.58](https://www.nuget.org/packages/Jint/2.11.58)

```sh
python3 scripts/build-windows-legacy.py \
  --dotnet /path/to/dotnet \
  --references /path/to/net40/build/.NETFramework/v4.0 \
  --jint /path/to/jint/lib/net40/Jint.dll \
  --node /path/to/node \
  --typescript /path/to/typescript/lib/typescript.js \
  --output /path/to/releases
```

SDK 和编译参考程序集仅用于构建；用户运行此 EXE 需要旧版 .NET Framework。源码不附带 SDK、NuGet 包或微软运行时。暂未 Authenticode 签名。

## 验证结果与限制

2026-10-05：编译通过；PE 结构、CLR 版本和全部 4 个内嵌资源检查通过；821 组实际 net40 Jint 引擎与现代共享引擎对比通过；原有 177 项 Node 测试通过。对比覆盖 59 个剂量条目、三组输入范围、两种固定备选剂量、参数错误、报告证据、未明确/冲突、人工修正与分阶段检索。数值对比只容忍 IEEE-754 最后数位差异，不构成独立临床验证。

引擎对比在 macOS 的 .NET 10 测试宿主中加载实际 net40 Jint DLL 完成，**不是 Windows XP、Windows 7 或原生窗口启动验证**。本机没有可用的这两种 Windows 测试环境。兼容版构建及原生 UI 自检的 workflow 模板位于 `scripts/ci/windows-with-legacy.workflow.yml`，未启用或运行；即使新 Windows 的 CI 通过，也不能代替旧系统测试。

在 Windows 7 SP1 x86 与 XP SP3 x86 上分别运行下列命令，可用虚构数据自检启动、三种语言、TCbHP 计算、剪贴板、报告匹配、输入变更时清除结果及摘要卡内容，并生成记录和截图：

```bat
ChemoDose-2.0.0-windows-x86-legacy.exe --self-test --test-report windows-legacy-self-test.json
```

同时人工检查低分辨率/DPI、长方案名、范围剂量、固定备选频次、分阶段方案及摘要卡全文。反馈只使用虚构数据，不上传患者资料。所有包随附非商业学术交流授权。

## 2.0.0 功能边界

兼容版新增剪贴板文字导入和自动药物目录对话框，可按会话勾选返回前台时读取新的病理文字。这里不包含截图 OCR，不要求安装 WebView2。截图识别请使用现代 Windows x64、Apple Silicon Mac 或安卓版。药物目录、人工复核、算术规则与三种界面语言继续共用源数据。Win7/XP 和 Win10/11 的实际启动、剪贴板及窗口验收仍待完成，不能据结构检查保证所有设备兼容。
