# 1.1.0-preview 预发布校验记录

日期：2026-10-05。以 GitHub 预发布形式分发，未进行独立临床验证。

- 177 项 Node 算术、目录、语言及 DOM 检查通过；TypeScript 检查通过。报告均为虚构文本。
- Android：版本 1.1.0-preview / versionCode 8；沿用既有测试签名，签名与 zipalign 校验通过。没有加入网络或相机权限。
- Mac：arm64 / macOS 13+；构建完成，ad-hoc 签名与 DMG 校验通过。提取包内容检查时仅清除 7-Zip 恢复的 FinderInfo 等元数据，未修改包内程序或网页。未 Developer ID 签名或公证。
- Windows：win-x64 自包含 EXE 构建完成；程序集 1.1.0.0。258 项单文件组件、WebView2 loader 和 19 项内嵌资源（含 13 项网页）检查通过。未 Authenticode 签名。
- 三个包中 13 个网页文件逐字节匹配本版源码，许可文件核对通过。

## 尚未完成

Mac 的终端直接启动在系统应用注册 / NSApplication 初始化处中止，没有得到本次原生 self-test 的成功结果；本机界面控制连续超时，也未能完成图形界面验收。浏览器安全策略禁止打开本地 file: 页面，未绕过该限制。尚不能确认此预览版的 Mac 实际安装启动及视觉表现。

Windows 的报告流程原生自检代码已加入，但本次未在 Windows 上运行；Android 亦未进行真机安装验收。Node DOM 测试不等于三端真机、视觉或临床验收。照片与扫描 PDF OCR 不在本版范围。

## 使用

打开应用后点击“报告识别与病理匹配”，载入虚拟示例，依次识别、核对四项信息并匹配；医生选定方案后再进入原有剂量核对。范围和边界见 README 及 docs/report-matching.md。仅限于学术交流，严禁商业用途。版权所有 GitHub @jiayi-sketch。

## Windows x86 兼容版补充

已新增面向 Windows 7 SP1 / Windows XP SP3 32 位的原生窗口预览 EXE，需 .NET Framework 4，不依赖 WebView2。编译、PE32 / x86 / 子系统 5.01 / CLR4 / 4 项内嵌资源检查通过；821 组实际 net40 Jint 与现代引擎结果对比通过，177 项共享 Node 检查通过。对比在 Mac 的 .NET 10 测试宿主执行，不等于旧 Windows 启动、界面或临床验证。当前未在 Windows 7 / XP 真机或虚拟机上验收，未 Authenticode 签名，以预发布形式分发。说明和自检命令见 docs/windows-legacy.md。
