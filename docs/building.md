# 构建与签名

## 依赖

Node.js 24+、Python 3.9+；Android SDK Platform 35、Build Tools 35.0.0、JDK（本次 Temurin 25）；Mac 使用 Apple Command Line Tools（本次 Swift 6.3.3），目标 arm64。

开发依赖通过 npm install 安装：Happy DOM 20.8.4、TypeScript 5.9.3。它们不打入应用。

```sh
python3 scripts/build-native.py \
  --node /absolute/path/to/node \
  --sdk /absolute/path/to/android-sdk \
  --java-home /absolute/path/to/jdk/Contents/Home \
  --work /absolute/path/to/build-work \
  --output /absolute/path/to/releases
```

--node 可从 PATH 获取，--sdk 可用 ANDROID_HOME，--java-home 可用 JAVA_HOME。默认工作目录 build、输出目录 dist。单端用 --platform android 或 --platform macos。

先生成共享网页，再放入原生外壳，无需 Gradle、Electron 或网络页面。类型去除不是类型检查，请另运行 npm run typecheck。

## Android

aapt2 → javac → D8 → zipalign → apksigner。包名 org.chemodose.preview，versionCode 4，versionName 0.2.2-preview，最低 API 28，目标 API 35。无网络、相机、通讯录、位置或文件读取权限；禁用备份和 WebView 持久化存储。

首次构建在工作目录 signing 下生成测试私钥和随机密码。**后续同包名升级须保存并沿用此密钥**，删除工作目录前请安全备份 signing。它不属于源码，不能上传 GitHub。

本次证书 SHA-256：
6b63fa8c342441b5abc8d8654cc204da990b963ff5fdd1cbcecd00904fc82b13

新环境会生成不同证书。正式发布前确定长期包名和签名身份。

## Mac

Cocoa / WKWebView 原生 arm64 外壳，macOS 13+，非持久化 WebView。当前仅 ad-hoc 签名，未 Developer ID 签名或 Apple 公证。

图标由 AppKit 生成 PNG 后封装 ICNS。hdiutil makehybrid -hfs 生成 HFS+ 文件系统，再转为 UDZO DMG，构建时无需挂载虚拟磁盘。

公开面向普通用户发行前，需真机验证安装启动，并使用发布者自己的 Apple 签名、公证流程。不要将证书私钥或凭据提交仓库。

## 源码分发

APK/DMG 与对应源码、LICENSE、构建说明一起交付。源码 ZIP 不包含 SDK、JDK、Node、node_modules、原 Windows EXE、指南 PDF 或签名私钥。

## Windows 原程序声明副本

Windows 文件保留原 v3.0.2 的功能和方案内容，仅替换已有学术交流/作者标签。脚本静态改写一个 Python 3.8 marshal 字符串并重建归档偏移，不执行 EXE，不重新编译原项目。第三方运行时和启动器原样保留。

```sh
python3 scripts/update-windows-notice.py /path/to/original.exe /path/to/ChemoDose-v3.0.2-windows-academic.exe --verification-dir /path/to/verification
```

仅支持本次检查的无 Authenticode 签名原程序；结构不符时中止。产物没有经过 Windows 启动或视觉验收；它不是 Android/Mac 0.2.2 的完整 Windows 移植。

## 方案目录

python3 scripts/build-catalogue.py 从历史候选文本以 AST 白名单读取声明数据，应用已经对照 PDF 记录的修正，生成 data/catalogue.json。常规 native 构建使用已检入的目录；不会联网读指南。

node scripts/build-web.mjs 生成 core.browser.js、catalogue.browser.js 和 catalogue-engine.browser.js。两端复制同一组网页文件。node scripts/export-catalogue-review.mjs 生成供人工复核的 Markdown 核对表。修改数据时要更新对应独立测试，并重新生成浏览器脚本与核对表。
