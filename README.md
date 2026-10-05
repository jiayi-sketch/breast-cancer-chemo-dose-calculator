# 乳腺癌剂量计算工具

Breast Cancer Chemotherapy Dose Calculator · **1.1.0-preview 报告匹配与 Windows x86 兼容预览版** · 源码公开 · 非商业学术授权

本软件是一款面向医生和药师的乳腺癌治疗方案查阅与剂量算术核对工具。1.1.0-preview 增加旧程序的离线报告文字识别及病理目录匹配流程；识别结果需人工核对，方案由医生选定。内置数据依据《2026版中国临床肿瘤学会（CSCO）乳腺癌诊疗指南》整理，旨在帮助临床一线工作者更便捷地查阅方案，在录入并核对患者身高、体重及含卡铂方案所需的肾功能指标后，完成相应的剂量算术核对，减少手工查阅和计算所需的时间。

本程序不提供诊断，不自动选择治疗方案，也不判断患者适用性；内置内容尚未经独立临床验证。目前提供 Android、Apple 芯片 Mac 和 Windows x64 版本：Android 9 及以上、macOS 13 及以上，以及 Windows 10 22H2 / Windows 11（需 Microsoft WebView2 Runtime）。已新增面向 Windows 7 SP1 / Windows XP SP3 32 位的兼容预览版（需 .NET Framework 4，尚待旧系统真机验收）；详见 [兼容版说明](docs/windows-legacy.md)。公开发布的旧版本仍不支持这些系统。iOS 版本尚未提供，后续更新进展以项目公告为准；近期暂无 Intel 芯片 Mac 版本支持计划。

本程序采用非商业学术交流授权，随附本版对应源码、许可、安装说明、校验记录和 SHA256SUMS.txt。仅限学术交流，禁止商业用途。反馈请使用虚构数据，不上传患者信息。后续版本将持续完善，感谢关注与耐心等待。

## English introduction

**Breast Cancer Chemotherapy Dose Calculator** is a regimen reference and dose arithmetic verification tool for physicians and pharmacists. Version **1.1.0-preview** restores offline report text extraction and pathology-based catalogue retrieval. Extracted fields require manual review, and a clinician chooses the regimen. Its built-in catalogue is compiled from the **2026 Chinese Society of Clinical Oncology (CSCO) Breast Cancer Guidelines**. It helps clinical staff look up regimens and check dose arithmetic after entering and verifying height, weight and, for carboplatin-containing regimens, the required renal function parameter, reducing the time spent on manual reference lookup and calculation.

The program does not provide diagnoses, automatically select treatments or assess patient suitability. The built-in content has **not undergone independent clinical validation**. Available platforms are **Android 9 or later**, **Apple Silicon Macs running macOS 13 or later**, and **Windows 10 22H2 / Windows 11 x64** with Microsoft WebView2 Runtime. An x86 compatibility preview targeting Windows 7 SP1 and Windows XP SP3 is now available; it requires .NET Framework 4 and has not yet been verified on either legacy operating system. See [compatibility notes](docs/windows-legacy.md). Previously published builds do not support these legacy systems. An iOS version is not currently available; future plans will be announced in this repository. Intel Mac support is not planned in the near term.

The program is distributed under a **noncommercial academic licence** with the corresponding source code, licence, installation instructions, verification records and `SHA256SUMS.txt`. **For academic exchange only. Commercial use is prohibited.** This is a source-available project, not an OSI-approved open-source licence. Please use fictional data when reporting issues and do not upload patient information. Updates will continue to improve the program.

Version **1.0.3** offers **简体中文 / 繁體中文 / English** in the header on all three platforms. The setting covers interface labels, regimen names, guideline summaries, messages and copied verification sheets. Only the language preference is saved; patient inputs remain in window memory. Changing language retains entered parameters but clears results and requires renewed confirmation. Drug doses, schedules, source page references and calculation rules are shared across languages. Full audit JSON retains the original catalogue wording for traceability. Translations are for reference and have not undergone independent clinical validation.

1.0.3 已移除肾功能“测定 / 估算方法与来源”填写栏，不再要求填写来源文字。保留肾功能值、mL/min 单位及适用性确认，Calvert 公式与方案剂量不变。

Version 1.0.3 removes the renal function method/source text field and its required validation. The renal value, absolute mL/min unit and suitability confirmation remain; dose calculations are unchanged.

## 1.1.0-preview 预发布

已恢复“报告识别与病理匹配”入口：四类文字报告、ER/PR/HER2/ISH/Ki-67 原文证据、人工修正依据、治疗阶段等核对、方案目录筛选及剂量页衔接。三端使用相同代码，支持简体中文、繁体中文和 English。待出或冲突不会直接生成匹配；新辅助后只进入衔接摘要，不套用初始辅助化疗。详见 [报告匹配说明](docs/report-matching.md)。

This preview restores the original text-report workflow on all three platforms: source-attributed receptor extraction, manual corrections, clinical context review, catalogue matching and a deliberate transition into dose verification. Pending or conflicting findings block matching. Post-neoadjuvant review opens guideline summaries rather than initial adjuvant regimens. Photo/scanned-PDF OCR is not included. This preview has not undergone independent clinical validation.

安装包为 `ChemoDose-1.1.0-preview-android.apk`、`ChemoDose-1.1.0-preview-macos-arm64.dmg` 和 `ChemoDose-1.1.0-preview-windows-x64.exe`。新增 `ChemoDose-1.1.0-preview-windows-x86-legacy.exe` 和对应运行配置文件，另有便于解压安装的兼容版 ZIP。本版作为 GitHub 预发布版提供；下载见下方安装表。旧版 [1.0.3](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/tag/v1.0.3) 不含报告匹配功能。

## 语言设置

1.0.3 在 Windows、Mac 和 Android 页头提供 **简体中文 / 繁體中文 / English**。界面、方案名称、摘要、提示和复制核对单随语言切换。三端只保存语言偏好，不保存病例参数；切换语言会保留输入、清除旧结果并要求重新确认。药物数值、频次、出处及公式不变，完整 JSON 核对记录保留原始目录文字。翻译核对说明见 [语言核对记录](docs/language-review.md)。

Windows EXE、Android APK 和 Apple 芯片 Mac DMG 使用同一份方案库、界面和计算核心。1.0.1 的 Windows 版采用全新原生外壳，包含与 Mac 相同的内置方案、分阶段剂量核对、自定义单药页面、复制功能和两行非商业声明。

本版修正了 0.1.0 仅支持人工录入的偏差：根据作者原 Windows v3.0.2 程序恢复目录，并对照作者提供的《2026 CSCO乳腺癌诊疗指南》扫描页重新录入。包含 **52 个治疗方案、7 个单药剂量参考、18 张指南摘要卡**；

0.2.1 修复方案列表条目被压缩导致文字越出选中框的问题：条目按内容自动增高，长名称完整换行；选中框与右侧方案同步刷新，分型下拉框统一为 44px 高度。方案内容和计算公式与 0.2.0 一致。

## 使用

1. 选择“术前新辅助治疗 / 术后辅助治疗 / 后续内分泌治疗 / 保乳术后治疗”，按分型或方案、药物名称查找。
2. 内置条目直接展示药物、标准剂量、给药日、疗程、推荐摘要和 PDF / 书页依据。
3. 输入身高、体重；含卡铂时填写肾功能值，并核对单位与适用性。固定剂量条目不要求身高体重。
4. 填写核对人并确认本次方案和参数，计算各药每次给药量，按需复制核对单。

首剂 / 后续剂量、剂量区间、序贯阶段分别显示。TC 4 周期和 6 周期为不同条目。他莫昔芬的两种频次必须选择其一。修改输入、切换方案、撤销确认会清除旧结果；任何药物缺少必要参数时，不输出部分结果。自定义单药算术核对作为次级页面保留。

内分泌条目是单药剂量参考，联合方案及 OFS 条件须结合指南摘要核对。放疗卡为只读摘要，不生成化疗剂量。报告匹配仅检索目录，不自动选择治疗、评估患者适用性、临床取整、减量或判断累计剂量上限。本次核对署名不是身份认证或独立临床审批。

## 安装

| 文件 | 适用设备 | 运行与验证状态 |
| --- | --- | --- |
| [Android APK](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v1.1.0-preview/ChemoDose-1.1.0-preview-android.apk) | Android 9 / API 28 及以上 | 沿用项目测试签名，versionCode 8；未完成真机验收 |
| [Apple 芯片 Mac DMG](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v1.1.0-preview/ChemoDose-1.1.0-preview-macos-arm64.dmg) | M 系列 Mac，macOS 13 及以上 | ad-hoc 签名，未 Apple 公证；本版启动及界面验收未完成 |
| [Windows x64 EXE](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v1.1.0-preview/ChemoDose-1.1.0-preview-windows-x64.exe) | Windows 10 22H2 / Windows 11，Intel 或 AMD 64 位电脑 | 自包含 .NET；需 WebView2；本版原生运行验收未完成 |
| [Windows x86 兼容版 ZIP](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v1.1.0-preview/ChemoDose-1.1.0-preview-windows-x86-legacy.zip) | 目标 Win7 SP1 / XP SP3 32 位；按运行环境设计亦可在 Win10 x86/x64、Win11 x64 使用 | 需 .NET Framework 4.x；不需 WebView2；未在这些 Windows 系统实际验收 |

[完整源码 ZIP](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v1.1.0-preview/ChemoDose-1.1.0-preview-source.zip) · [SHA256 校验文件](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v1.1.0-preview/SHA256SUMS.txt) · [本版验证记录](docs/preview-verification-1.1.0.md)

Windows x86 兼容版请解压 ZIP 并保留 EXE 与 `.exe.config` 在同一目录。Win10/Win11 通常使用系统已有的较新 .NET Framework 4.x，无需安装旧 4.0；XP 使用 4.0。兼容版采用原生窗口，暂不含自定义单药规则页面。详见 [兼容版说明](docs/windows-legacy.md)。

安卓：打开 APK，按系统提示安装。Mac：打开 DMG，将应用拖入 Applications。替换旧版前退出旧应用，打开后应显示 **1.1.0-preview 内置方案版**，首页能直接看到 TCbHP 等方案。若 macOS 阻止未公证应用，请查看系统设置“隐私与安全性”中针对该应用的打开选项，不要关闭系统安全功能。

安装包、源码包和校验文件见 [GitHub 预发布页](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/tag/v1.1.0-preview)。应用不联网、无账户、不持久化患者记录；

Windows：双击 EXE 打开，无需另装 .NET。若提示缺少 WebView2，请从[微软官方页面](https://developer.microsoft.com/microsoft-edge/webview2/)安装 Evergreen Runtime 后重试。1.1.0-preview 已恢复报告文字识别与病理目录匹配工作流；照片/扫描件 OCR 尚未提供。

## 数据与验证

- [指南核对记录](docs/guideline-review.md)：源文件哈希、页码映射、纠正项、覆盖边界。
- [逐项方案核对表](docs/catalogue-review.md)：全部内置条目的药物、数值、频次、疗程和出处，供专业复核。
- `data/catalogue.json`：三端统一的结构化目录，临床复核状态保留为 pending。
- [测试记录](tests/README.md)：算术、目录、DOM、签名与安装包检查，及尚未完成的真机/视觉检查。

目录录入核对和算术回归不代表临床正确性已经获独立验证。指南 PDF 原件、患者信息及签名私钥均不随源码分发。

## 开发

| 目录 | 内容 |
| --- | --- |
| packages/calculation-core | TypeScript 算术核心、方案适配层、回归测试 |
| data | 有来源页码的共享方案目录 |
| apps/shared-web | 方案库首页及次级人工核对页 |
| apps/android、apps/macos、apps/windows | 三端离线原生外壳 |
| apps/windows-legacy | Windows x86 / .NET Framework 4 兼容外壳 |
| scripts | 静态数据恢复、指南录入覆盖、网页及原生包构建 |
| legacy | 算术参考与不完整的历史反编译研究文本 |

Node.js 24+、Python 3.9+：

```sh
python3 scripts/build-catalogue.py
node scripts/build-web.mjs
node scripts/export-catalogue-review.mjs
node --test packages/calculation-core/tests/*.test.mjs
npm install
npm run test:ui
npm run typecheck
```

原生构建见 [构建说明](docs/building.md)。生成的浏览器脚本不要单独修改，以免三端公式或数据不一致。

本版源码按 [非商业学术授权](LICENSE) 提供，仅限学术交流，禁止商业用途。这是源码公开项目，不是允许商用的开放源代码许可，不声称提供旧 EXE 的完整对应源码。发布步骤见 [GitHub 项目说明](docs/github-publishing.md)。反馈请使用虚构数据，注明版本、步骤、单位、预期和实际结果。

## 作者与授权声明

仅限于学术交流，严禁商业用途  
版权所有 GitHub @jiayi-sketch

0.2.2 在两个首页、使用说明及 Mac 原生“关于”窗口加入上述两行声明，并替换新版本的 GPL 标记。历史 GPL 版本保留原有授权。Windows v3.0.2 声明修订副本通过单独的静态补丁脚本生成，只有作者署名/使用声明变化，未移植 0.2.2 的方案库或修订原有计算。

1.0.1 使用新 Windows 源码加载共享界面，取代旧声明修订副本；三个平台及算术核心版本统一为 1.0.1，指南目录版本保留 2026.10.02，临床复核状态仍为 pending。Windows 运行验证记录见 tests/README.md。
