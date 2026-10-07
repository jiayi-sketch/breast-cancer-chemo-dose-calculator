# Windows 2.0.2 验证记录

本次参考原 v3.0.2 Windows 界面（随 v0.2.2-preview 发布），恢复标题栏、阶段侧栏、顶部参数区、左侧方案列表和右侧说明及药物表格。只修订 Windows 界面与安装版本，详见 [界面说明](windows-interface-2.0.2.md)。共享计算核心、52 个方案、7 个单药参考及 18 张摘要保持 2.0.0；Mac / Android 的现有 2.0.0 文件不变。技术测试不代表独立临床验证。

## 构建与文件对应

- 测试源码提交：`d991ba24f7f12b6d43cb78f46f1e2ce13277072b`。
- [完整 Windows 构建与验收](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/actions/runs/37471374972)：全部步骤通过。
- 实际原生测试宿主：`Microsoft Windows NT 10.0.26100.0`，兼容程序作为 32 位进程运行。该宿主不是 Win7 或 XP。
- Actions 附件：`windows-2.0.2-tested`，ID `11416982639`。下载 ZIP 的 SHA256：`85cbe1a81b9e33648a1f81db4c964d1def264a532112150706f15dd07dbe584c`。
- 发布的安装器与统一 EXE 直接取自同一轮通过测试的构建，未本地重编译。随后仅补充文档，不改变这些程序。

| 发布文件 | SHA256 |
| --- | --- |
| ChemoDose-2.0.2-windows-setup.exe | `c187f65243be24a877828c8efe82c900423cb9ba7173abb8aafe0fd5f7048e6c` |
| ChemoDose-2.0.2-windows-unified.exe | `f60455f554a6eef9ba93986f4564bd53f5f82e338ee830a50ff7e3be61fcb83a` |

## 已通过的技术检查

- 190 项共享与页面测试；821 组旧引擎对照；47 项统一入口分流、解包及 PE 检查。
- 现代和兼容界面的三语方案选择、算术核对、剪贴板、输入变更清除旧结果、报告页衔接、长方案及 1024×700 布局检查。
- 兼容界面额外检查从报告页打开另一阶段方案后，再点击可见方案列表切换时，显示名称与实际计算条目保持一致。
- 现代 Windows 离线图片 OCR；测试文字、图片及截图均为虚构数据。
- NSIS 3.13 安装器的原生 x86 Unicode 架构与 PE 子系统基线检查。
- 当前用户安装、含空格目录、开始菜单与桌面快捷方式、卸载登记、安装后的自动界面分流、文件哈希及语言偏好保留。
- 在同一目录再次安装本版，确认覆盖安装保留语言偏好。记录中 operation=upgrade 指这次同版本覆盖，不是旧安装器升级测试。
- 原生卸载删除已安装程序、许可、说明、卸载器及对应入口，保留无关的测试文件和两种界面的语言偏好。
- 已检查原生虚构病例截图，三语文字、可见方案列表、参数区和结果表可见；小窗口的标题区与结果列边界通过检查。现代界面长页面可纵向滚动，兼容界面的药物表支持滚动。

JSON 记录及原生截图包随发布附件提供。`windows-unified-build.json` / `windows-legacy-build.json` 是构建时生成的记录，其原生验收字段在当时仍为 pending；后续原生结果见 `windows-modern-self-test.json`、`windows-compat-self-test.json`、`windows-installer-native.json`。XP / Win7 的 pending 状态仍然有效。

## 边界

作者此前反馈 **2.0.0 统一 EXE** 在 Win7 x86 和 Win10 x64 两台设备验证通过。该反馈不自动转移到新的 2.0.2 文件。新版 Win7 / XP 真机验收待完成，其他目标系统也不代表逐台设备验收。

Windows 文件尚未 Authenticode 签名。安装器会检查 .NET Framework 4 完整版，不自动下载依赖。现代界面需要 WebView2；兼容界面不含图片 OCR。安装与卸载说明见 [Windows 安装说明](windows-installation.md)。

## English

Windows 2.0.2 changes presentation and distribution only. The shared catalogue and calculation core, and the existing Mac/Android packages, remain at 2.0.0. The exact installer and portable EXE from commit `d991ba24f7f12b6d43cb78f46f1e2ce13277072b` passed the linked Windows workflow.

Validation includes 190 shared/DOM tests, 821 legacy-engine comparison vectors, 47 launcher checks, both native interfaces in three languages, clipboard/report transitions, long-regimen layouts, modern offline image OCR and native per-user install/reinstall/uninstall. The host reports Windows NT 10.0.26100.0. Reinstall means overwriting this same version in the same directory. Uninstall retains unrelated files and language preferences. Synthetic data only.

The author's earlier Win7 x86 / Win10 x64 device feedback concerns the 2.0.0 EXE. New 2.0.2 legacy-device acceptance remains pending. Both Windows downloads are unsigned. Technical checks do not establish clinical validation.

仅限于学术交流，严禁商业用途  
版权所有 GitHub @jiayi-sketch
