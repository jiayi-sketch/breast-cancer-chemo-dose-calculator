# Windows 2.0.1 安装版

推荐下载 `ChemoDose-2.0.1-windows-setup.exe`，按安装向导选择简体中文、繁体中文或 English。安装只针对当前 Windows 用户，默认目录为 `%LOCALAPPDATA%\Programs\ChemoDose`，无需管理员权限。向导可选择安装目录及是否创建桌面快捷方式；安装后也可从开始菜单打开。

安装版内含统一 EXE，自动选择现代 x64 或 x86 兼容界面。仍保留 `ChemoDose-2.0.1-windows-unified.exe` 便携版供无需安装时使用。程序内容、方案与算术规则相同。

本次是 Windows 专项界面与安装修订：Windows 应用版本为 2.0.1，共享计算核心、方案数据及其他平台现有安装包仍为 2.0.0。界面参考作者原 v3.0.2 程序的方案选择和药物表格，缩小标题及留白，集中展示方案、参数、标准剂量、计算量、给药日、疗程及指南出处。方案说明与完整核对单仍可查看，人工确认要求不变。

## 前提与范围

- 旧系统需 .NET Framework 4 完整版；安装器检查运行时，缺少时提示从微软官方安装后重试，不自动下载组件。
- Win10 / Win11 通常自带兼容的 .NET Framework 4.x。现代完整界面需要 WebView2 Runtime；未检测到时自动进入兼容界面。
- 兼容界面支持病理文字导入和药物目录弹窗，不含截图 OCR。现代界面支持离线图片 OCR。
- 目标分流仍为 XP SP3 x86、Win7 SP1 x86/x64、Win8/8.1，以及 Intel/AMD Win10/11；Windows ARM、Vista、XP x64 不在目标范围。目标范围不等于全部设备已测试。
- 作者已反馈 **2.0.0 统一 EXE** 在 Win7 x86、Win10 x64 真机验证通过；该记录不自动算作 **2.0.1 安装包** 真机验收。

## 更新与卸载

安装前退出正在运行的程序。在同一目录安装新版本会更新程序并保留语言偏好。仅升级程序，不导入或保存患者资料。

可从 Windows 的程序卸载列表或开始菜单中的 ChemoDose 卸载入口移除。卸载只删除本次安装的程序、许可、说明、卸载器及相应入口，不递归删除用户选择的目录；其他文件、语言偏好和便携版组件缓存保留。

Windows EXE 与安装包暂未 Authenticode 签名。请从本项目 Releases 下载，并核对随附 SHA256 校验文件。

## English

Run `ChemoDose-2.0.1-windows-setup.exe` and choose Simplified Chinese, Traditional Chinese or English. Setup installs for the current user, normally under `%LOCALAPPDATA%\Programs\ChemoDose`, with a Start menu entry, optional desktop shortcut and uninstaller. It bundles the same automatic architecture selection as the portable unified EXE. Legacy systems require the full .NET Framework 4; WebView2 is needed for the modern interface and image OCR.

This Windows-only presentation and installer revision is version 2.0.1. The shared calculation core, catalogue and existing Mac/Android packages remain at 2.0.0. The author-reported Windows 7 x86 / Windows 10 x64 device verification applies to the previous 2.0.0 unified EXE; it is not a device acceptance record for this new setup. Uninstall removes only the installed application files and its entries, retaining unrelated files, language preferences and portable caches.

仅限于学术交流，严禁商业用途  
版权所有 GitHub @jiayi-sketch
