# 乳腺癌剂量计算工具

Breast Cancer Chemotherapy Dose Calculator · 2.1.0

把方案查阅和剂量计算放在同一个界面里，方便医生和药师少一些来回翻找和重复计算。

内置方案按《2026版中国临床肿瘤学会（CSCO）乳腺癌诊疗指南》整理，共有 52 个方案、7 个单药剂量参考和 18 张指南摘要。选择方案后，可以查看药物、标准剂量、给药日、疗程和指南页码，再根据核对后的患者参数计算剂量。

软件也支持导入病理文字和截图，识别后列出相关的药物目录。原文和识别结果需要人工核对，治疗方案由医生选择。软件不提供诊断，也不判断某个方案是否适合某位患者。内置内容尚未经过独立临床验证。

目前提供 Windows、Apple 芯片 Mac 和 Android 版本，界面可切换简体中文、繁體中文和 English。iOS 版本暂未提供，近期也没有 Intel Mac 版本。

## 2.1.0 更新

这次加入了历史记录。算完后可以保存在本机，下次按住院号等信息查找，查看当时的参数和结果，也可以删除记录。需要再次计算时，可以载入旧参数，但仍要重新核对和确认。

患者信息中增加了可选的年龄和住院号，不再要求填写审核人姓名。住院号会保留开头的零；年龄和住院号只用于记录，不参与剂量计算。

历史默认自动保存，可以在历史窗口关闭。记录在本机加密存储，不上传、不跨设备同步，也不保存病理原文、截图或识别结果。最多保存 500 条，文件上限为 8 MiB；达到上限会提示，不会悄悄删掉旧记录。具体用法见 [历史记录说明](docs/history-2.1.0.md)。

## 下载与安装

[2.1.0 发布页](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/tag/v2.1.0) 提供安装包、完整源码、许可、使用说明和 SHA256 校验文件。目前为预发布版。

| 平台 | 下载 | 安装说明 |
| --- | --- | --- |
| Windows | [安装包](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v2.1.0/ChemoDose-2.1.0-windows-setup.exe) / [便携 EXE](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v2.1.0/ChemoDose-2.1.0-windows-unified.exe) | 自动选择现代 x64 或 x86 兼容界面，无需自己判断位数。安装包提供快捷方式和卸载入口。 |
| Mac | [DMG](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v2.1.0/ChemoDose-2.1.0-macos-arm64.dmg) | Apple 芯片，macOS 13 及以上。打开后将应用拖入 Applications。尚未进行 Developer ID 签名或公证。 |
| Android | [APK](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v2.1.0/ChemoDose-2.1.0-android.apk) | Android 9 及以上。沿用原签名密钥，可覆盖安装；本版历史功能仍需手机实测。 |

Windows 现代界面需要 WebView2。旧系统需要 .NET Framework 4，兼容界面支持病理文字导入，不含图片 OCR。详见 [Windows 安装说明](docs/windows-installation.md) 和 [兼容版说明](docs/windows-legacy.md)。

更新前请先退出旧程序。Windows 安装、升级和卸载都会保留本机历史；想删除这些记录，请先在软件中清空历史。关闭自动保存只影响之后的计算，不会删除已有记录。

## 使用方法

1. 选择治疗阶段，按分型、方案名或药物名查找方案。
2. 查看方案说明、药物剂量、给药时间和指南出处。
3. 按方案要求填写身高、体重；含卡铂的方案还需填写肾功能值，并核对单位和适用性。年龄和住院号可按需填写。
4. 核对方案和参数，完成确认后计算。结果可以复制，也可以在历史中查看。

首剂与后续剂量、剂量区间和序贯阶段分别显示。修改输入、切换方案或撤销确认后，旧结果会清除。载入历史参数时也会清除旧病理状态、结果和确认，不会直接沿用上次的判断。自定义单药计算保留在单独页面。

病理导入的用法见 [报告匹配说明](docs/report-matching.md)。三端支持简体中文、繁體中文和 English，药物数值、给药时间和计算公式不随语言变化。

## 测试情况

2.1.0 的共享计算、页面和旧引擎对照测试已通过，Windows 和 Mac 的本机历史也完成了原生检查。Android 历史读写及安装仍需手机实测，Win7/XP 的本版文件也还需要真机验证。作者此前在 Win7 x86 和 Win10 x64 上测试通过的是 2.0.0 统一 EXE。

测试均使用虚构数据。技术测试通过不代表临床验证完成，详细结果和未完成项见 [2.1.0 验证记录](docs/verification-2.1.0.md)。

## English

A breast cancer regimen reference and dose calculator for physicians and pharmacists. It brings regimen lookup and dose calculation into one place to reduce repeated searching and manual arithmetic.

The catalogue was compiled from the author-provided 2026 CSCO Breast Cancer Guidelines. It contains 52 regimens, 7 single-drug references and 18 guideline summaries, with doses, schedules, treatment duration and source pages. Pathology text and image import can bring up related drug entries, but users must check the original report and extracted fields. Clinicians choose the treatment regimen. The application does not diagnose or assess whether a treatment is suitable for an individual patient. Its content has not undergone independent clinical validation.

Version 2.1.0 adds local calculation history and optional patient age and hospitalization number. The reviewer-name field has been removed. You can search, view or delete records, or load their parameters for another calculation. Loading a record clears the previous results, pathology context and confirmation, so a new check is required.

Successful calculations are saved automatically unless you turn saving off. Records are encrypted on the device and are not uploaded or synchronized. They exclude pathology text, images and extracted findings. Storage is limited to 500 records and 8 MiB, with a visible error when a limit is reached. Age and hospitalization number do not affect dose formulas; leading zeros are kept.

Downloads are available for Windows, Apple Silicon Mac (macOS 13+) and Android 9+. Windows chooses the modern x64 or x86 compatibility interface automatically. Image OCR requires the modern Windows interface; the compatibility interface supports text import. All three platforms offer Simplified Chinese, Traditional Chinese and English. iOS and Intel Mac builds are not available.

Windows and Mac native history checks passed. Android history and installation still need device testing, as do the new Windows 7/XP files. These are technical checks, not clinical validation. See the [2.1.0 release](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/tag/v2.1.0), [history instructions](docs/history-2.1.0.md) and [verification record](docs/verification-2.1.0.md).

## 源码与开发

- [完整源码 ZIP](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v2.1.0/ChemoDose-2.1.0-source.zip) 与 [SHA256SUMS.txt](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/download/v2.1.0/SHA256SUMS.txt)
- [指南核对记录](docs/guideline-review.md) 与 [逐项方案核对表](docs/catalogue-review.md)
- [构建说明](docs/building.md) 与 [测试记录](tests/README.md)

| 目录 | 内容 |
| --- | --- |
| packages/calculation-core | 计算核心、方案适配和测试 |
| data | 共用方案目录及翻译 |
| apps/shared-web | 共用界面和历史查询 |
| apps/android、apps/macos、apps/windows | 三端原生程序 |
| apps/windows-legacy、apps/windows-unified | Windows 兼容界面和统一入口 |
| scripts | 数据整理、构建和验证脚本 |
| legacy | 旧程序的算术参考与部分反编译研究文本 |

开发需要 Node.js 24+ 和 Python 3.9+：

```sh
python3 scripts/build-catalogue.py
node scripts/build-web.mjs
node scripts/export-catalogue-review.mjs
node --test packages/calculation-core/tests/*.test.mjs
npm install
npm run test:ui
npm run typecheck
```

不要单独修改生成的浏览器脚本。指南 PDF 原件、患者资料和签名私钥不随源码发布。早期版本的改动可在 [历史发布](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases) 中查看。

## 作者与授权声明

仅限于学术交流，严禁商业用途  
版权所有 GitHub @jiayi-sketch

源码按 [非商业学术交流授权](LICENSE) 提供。这项授权禁止商业用途，不是 GPL，也不属于允许商用的开放源代码许可。旧版本仍按各自随附的许可使用。

反馈问题时，请注明版本、操作步骤、预期和实际结果，只使用虚构数据，不上传患者信息。

For academic exchange only. Commercial use is prohibited. Copyright GitHub @jiayi-sketch. Please use fictional data in bug reports and do not upload patient information.
