# Windows 2.1.0 安装版

推荐下载 `ChemoDose-2.1.0-windows-setup.exe`，按安装向导选择简体中文、繁体中文或 English。安装只针对当前 Windows 用户，默认目录为 `%LOCALAPPDATA%\Programs\ChemoDose`，无需管理员权限。向导可选择安装目录及是否创建桌面快捷方式；安装后也可从开始菜单打开。

安装版内含统一 EXE，自动选择现代 x64 或 x86 兼容界面。仍保留 `ChemoDose-2.1.0-windows-unified.exe` 便携版供无需安装时使用。程序内容、方案与算术规则相同。

本次 Windows、Mac、Android 和共享计算核心统一更新为 2.1.0，加入本机历史、可选年龄及住院号，移除核对人填写栏。指南目录版本保持 2026.10.02。Windows 保留深蓝标题栏、阶段侧栏、方案列表与药物表格，以及此前的无系统标题栏和厚边框设计。可拖动顶栏空白区、双击最大化/还原，或拖动边缘缩放；最大化避开任务栏。Alt+F4 关闭，Alt+空格打开窗口菜单。计算前的人工确认仍需完成。

## 前提与范围

- 旧系统需 .NET Framework 4 完整版；安装器检查运行时，缺少时提示从微软官方安装后重试，不自动下载组件。
- Win10 / Win11 通常自带兼容的 .NET Framework 4.x。现代完整界面需要 WebView2 Runtime；未检测到时自动进入兼容界面。
- 兼容界面支持病理文字导入和药物目录弹窗，不含截图 OCR。现代界面支持离线图片 OCR。
- 目标分流仍为 XP SP3 x86、Win7 SP1 x86/x64、Win8/8.1，以及 Intel/AMD Win10/11；Windows ARM、Vista、XP x64 不在目标范围。目标范围不等于全部设备已测试。
- 作者已反馈 **2.0.0 统一 EXE** 在 Win7 x86、Win10 x64 真机验证通过；该记录不自动算作 **2.1.0 安装包** 真机验收。

## 更新与卸载

安装前退出正在运行的程序。在同一目录安装新版本会更新程序并保留语言偏好及已有本机历史。安装器不上传或迁移患者资料。

可从 Windows 的程序卸载列表或开始菜单中的 ChemoDose 卸载入口移除。卸载只删除本次安装的程序、许可、说明、卸载器及相应入口，不递归删除用户选择的目录；其他文件、语言偏好、本机历史和便携版组件缓存保留。若需删除历史，请先在程序中清空记录。

Windows EXE 与安装包暂未 Authenticode 签名。请从本项目 Releases 下载，并核对随附 SHA256 校验文件。

## English

Run `ChemoDose-2.1.0-windows-setup.exe` and choose Simplified Chinese, Traditional Chinese or English. Setup installs for the current user, normally under `%LOCALAPPDATA%\Programs\ChemoDose`, with a Start menu entry, optional desktop shortcut and uninstaller. It bundles the same automatic architecture selection as the portable unified EXE. Legacy systems require the full .NET Framework 4; WebView2 is needed for the modern interface and image OCR.

Windows 2.1.0 removes the main window’s native title bar and thick border. The blue strip provides minimize, maximize/restore and close controls, drag movement and double-click maximize/restore; edge resizing remains available. Maximization uses the monitor’s working area. Alt+F4 closes the window; Alt+Space opens its system menu.

Windows, Mac, Android and the shared calculation core are version 2.1.0. This release adds encrypted local calculation history, optional patient age and hospitalization number, and removes reviewer-name fields. The catalogue remains at version 2026.10.02. Manual confirmation before calculation is still required. The author-reported Windows 7 x86 / Windows 10 x64 device verification applies to the previous 2.0.0 unified EXE; it is not a device acceptance record for this new setup. Upgrade and uninstall preserve local history and language preferences. Clear history in the application before uninstalling if you want those records removed.

仅限于学术交流，严禁商业用途  
版权所有 GitHub @jiayi-sketch

## 本机历史

2.1.0 移除核对人输入，加入可选年龄、住院号与本机加密历史。安装、升级和卸载保留用户历史；若需删除，请先在程序中清空记录。见 [历史说明](history-2.1.0.md) 与 [本版验证](verification-2.1.0.md)。
