# 构建与签名

## 依赖

Node.js 24+、Python 3.9+；Android SDK Platform 35、Build Tools 35.0.0、JDK（本次 Temurin 25）；Mac 使用 Apple Command Line Tools（本次 Swift 6.3.3），目标 arm64。Windows 使用 .NET SDK 10.0.401、Microsoft.Web.WebView2 1.0.4258.31，输出 win-x64 自包含单文件 EXE。

开发依赖通过 npm install 安装：Happy DOM 20.8.4、TypeScript 5.9.3。它们不打入应用。

```sh
python3 scripts/build-native.py \
  --node /absolute/path/to/node \
  --sdk /absolute/path/to/android-sdk \
  --java-home /absolute/path/to/jdk/Contents/Home \
  --work /absolute/path/to/build-work \
  --dotnet /absolute/path/to/dotnet \
  --output /absolute/path/to/releases
```

--node 可从 PATH 获取，--sdk 可用 ANDROID_HOME，--java-home 可用 JAVA_HOME。默认工作目录 build、输出目录 dist。单端用 --platform android、macos 或 windows；默认 all 构建三个平台。Windows 支持从 Mac 交叉编译（EnableWindowsTargeting），运行验收须在 Windows 上进行。

先生成共享网页，再放入原生外壳，无需 Gradle、Electron 或网络页面。类型去除不是类型检查，请另运行 npm run typecheck。

## Android

aapt2 → javac → D8 → zipalign → apksigner。包名 org.chemodose.preview，versionCode 8，versionName 2.0.0，最低 API 28，目标 API 35。无网络、相机、通讯录、位置或文件读取权限；禁用备份和 WebView 持久化存储。

首次构建在工作目录 signing 下生成测试私钥和随机密码。**后续同包名升级须保存并沿用此密钥**，删除工作目录前请安全备份 signing。它不属于源码，不能上传 GitHub。

本次证书 SHA-256：
6b63fa8c342441b5abc8d8654cc204da990b963ff5fdd1cbcecd00904fc82b13

新环境会生成不同证书。正式发布前确定长期包名和签名身份。

## Mac

Cocoa / WKWebView 原生 arm64 外壳，macOS 13+，非持久化 WebView。当前仅 ad-hoc 签名，未 Developer ID 签名或 Apple 公证。

图标由 AppKit 生成 PNG 后封装 ICNS。hdiutil makehybrid -hfs 生成 HFS+ 文件系统，再转为 UDZO DMG，构建时无需挂载虚拟磁盘。

公开面向普通用户发行前，需真机验证安装启动，并使用发布者自己的 Apple 签名、公证流程。不要将证书私钥或凭据提交仓库。

## 源码分发

EXE/APK/DMG 与对应源码、LICENSE、构建说明一起交付。源码 ZIP 不包含 SDK、JDK、Node、node_modules、原 Windows EXE、指南 PDF 或签名私钥。

## Windows 2.0.0

Windows Forms + WebView2 原生外壳，与 Mac、安卓复用全部网页与离线识别资源、同一方案目录和计算核心。发布的 EXE 内置 .NET 10 运行时与 WebView2 SDK/loader；无需用户另装 .NET，但需要微软 Evergreen WebView2 Runtime。推荐 Windows 11 x64，兼容 Windows 10 22H2 x64；此现代 x64 外壳不支持 Windows 7 或 32 位系统。新增的 x86 原生兼容外壳面向 Windows 7 SP1 / XP SP3，详见 [Windows 兼容版](windows-legacy.md)，旧系统启动验收尚未完成。暂无 Windows ARM 原生版本。

页面通过内嵌资源响应加载，不创建本地 HTTP 服务，不访问外部网页。导航仅允许内嵌主页和自定义单药页；外部请求、子框架、弹窗、下载和权限申请被拒绝。WebView 使用 InPrivate 模式与每次启动独立的临时 profile，应用不写入病例参数；框架可能在系统临时目录解包组件。复制消息经过来源和长度检查，界面等待原生剪贴板回执后提示成功。第三方运行时许可原文在 apps/windows/licenses 中，EXE 的“帮助 → 第三方许可”可查看。

```sh
python3 scripts/build-native.py --platform windows --node /path/to/node --dotnet /path/to/dotnet --work /path/to/work --output /path/to/releases
```

在 Windows 上可运行：

```powershell
.\ChemoDose-2.0.0-windows-x64.exe --self-test --test-report windows-self-test.json
```

自检使用合成数据，验证启动、版本、内置 TCbHP 计算、复制回执、长方案名边框和切换时旧结果清除；写入 JSON 与窗口内容截图，不读取真实病例。GitHub Windows workflow 提供相同验证。自检通过不代表临床验证或全部 Windows 设备兼容性。当前无 Authenticode 代码签名。

微软参考：[跨平台 Windows 构建](https://learn.microsoft.com/en-us/dotnet/core/tools/sdk-errors/netsdk1100)、[单文件分发](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview)、[WebView2 Runtime 分发](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)。

## 历史 Windows 原程序声明副本

Windows 文件保留原 v3.0.2 的功能和方案内容，仅替换已有学术交流/作者标签。脚本静态改写一个 Python 3.8 marshal 字符串并重建归档偏移，不执行 EXE，不重新编译原项目。第三方运行时和启动器原样保留。

```sh
python3 scripts/update-windows-notice.py /path/to/original.exe /path/to/ChemoDose-v3.0.2-windows-academic.exe --verification-dir /path/to/verification
```

仅支持本次检查的无 Authenticode 签名原程序；结构不符时中止。产物没有经过 Windows 启动或视觉验收；它不是 Android/Mac 0.2.2 的完整 Windows 移植。

## 方案目录

python3 scripts/build-catalogue.py 从历史候选文本以 AST 白名单读取声明数据，应用已经对照 PDF 记录的修正，生成 data/catalogue.json。常规 native 构建使用已检入的目录；不会联网读指南。

node scripts/build-web.mjs 生成 core.browser.js、catalogue.browser.js 、catalogue-engine.browser.js 和 translations.browser.js。三端使用同一组网页文件，Windows 以程序集资源内嵌。node scripts/export-catalogue-review.mjs 生成供人工复核的 Markdown 核对表。修改数据时要更新对应独立测试，并重新生成浏览器脚本与核对表。

## 语言资源

`data/i18n.json` 为受控界面/目录的英文与繁体词典，`i18n.js` 不翻译用户手动输入。原生外壳只保存语言白名单值，仍不持久化病例参数。三端共用网页文件；OCR 引擎、模型和第三方许可一并内置；变更翻译后须重新运行语言测试、生成脚本和构建三个安装包。

## 2.0.0 图片导入

OCR 文件已固定版本并检入 `apps/shared-web/ocr`；`manifest.json` 记录 SHA256。常规构建不下载模型。Mac 原生外壳使用 Apple Vision；Windows/Android 使用固定 OEM=1 的 Tesseract.js 7.0.0，包内含普通、SIMD、Relaxed SIMD 三种 LSTM core。请保留所有第三方许可。Android 虚拟 https 来源由 `shouldInterceptRequest` 返回资产，无本地 HTTP 服务、无 INTERNET 权限；Windows 同样仅响应内嵌资源。
