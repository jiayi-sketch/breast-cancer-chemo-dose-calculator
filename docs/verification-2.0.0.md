# 2.0.0 技术验证记录

本版为技术测试版本，尚未经独立临床验证。

| 项目 | 结果与范围 |
| --- | --- |
| 共享算术、目录、三语界面、报告及导入 | 186 项 Node/Happy DOM 测试通过；包含晚到回执丢弃、清空病例、人工核对与冲突阻断 |
| 离线 OCR | 英文、简体、繁体三张虚构 PNG 的 ER/PR/HER2/Ki-67 正确；Node 引擎及固定模型验证，不代表各平台真实渲染器或全部医院模板 |
| OCR 资源 | 17 个引擎/模型/许可文件 SHA256 与 manifest 一致；OEM=1 三种 LSTM WASM 变体随包保留 |
| Android APK | API 28+，versionCode 9；编译、zipalign、apksigner 通过，沿用项目测试证书；32 个内置网页/识别资源与源码逐字节一致；无 INTERNET 权限；未真机验收 |
| Mac DMG | arm64、macOS 13+，构建号 9；Swift 编译、ad-hoc 严格签名及 hdiutil 校验通过；32 个资源与源码一致；未 Developer ID 签名或 Apple 公证 |
| Mac 原生运行 | 本次 CUA 原生窗口读取超时，未计为启动/界面通过；Apple Vision 在实际应用中的 OCR 尚未验收。指南处理辅助工具曾返回 Vision nilError，也未计为 OCR 通过 |
| Windows x64 EXE | .NET 10 自包含 + WebView2，交叉编译通过；最终单文件包解析、嵌入资源逐字节匹配、程序集版本 2.0.0.0；本版未实际运行 Windows |
| Windows 原生 OCR 自检 | 已加入虚构截图 → 原生剪贴板 → 实际 WebView2/WASM → 字段/弹窗/未确认检查；代码已提供，尚未执行，因此不计为通过 |
| Windows x86 兼容版 | C# 5、.NET Framework 4.0、PE32 x86、GUI subsystem 5.01、CLR v4.0.30319；结构与四个内嵌资源验证通过 |
| 兼容版共享引擎 | 实际 net40 Jint DLL 在 macOS .NET 10 测试宿主执行 821 组对照，59 项剂量目录覆盖；不等于 Win7/XP 窗口或临床兼容验证 |
| 旧 Windows 图片功能 | XP/Win7 x86 兼容版只有文字导入与药物弹窗，本版无截图 OCR；Win10/11 x86 运行环境兼容性亦未实机验收 |

指南仍包含 52 个治疗方案、7 个单药参考和 18 张摘要。新增分型/阶段提醒见 `guidelineChecks` 和指南核对记录；不添加未校验的新剂量，不从病理字段自动生成个体化处方或减量。源 PDF 及扫描页未随包分发。

验证脚本：`npm test`、`npm run test:ui`、`npm run test:ocr`、`npm run typecheck`，以及 `scripts/verify-windows-legacy-engine.mjs`。Windows `--self-test --test-report` 使用虚构数据。原文与截图不写患者日志；反馈只使用虚构资料。
