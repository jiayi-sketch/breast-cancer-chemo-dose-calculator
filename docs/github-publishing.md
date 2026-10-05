# 建立 GitHub 项目

项目仓库：[jiayi-sketch/breast-cancer-chemo-dose-calculator](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator)。

测试版：[v1.0.3](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/tag/v1.0.3)，包含 Android APK、Apple 芯片 Mac DMG、Windows 1.0.3 共享界面 EXE、源码包、许可、说明和校验文件。附件中的中文说明文件使用英文文件名，以避免 GitHub 文件名转换冲突。

以下步骤供后续版本或建立自己的仓库参考：

1. 登录 GitHub，右上角 + → New repository。
2. 名称可用 breast-cancer-chemo-dose-calculator。说明可写“面向医生和药师的离线剂量算术核对工具，支持 Windows、Android 与 Apple 芯片 Mac”。
3. 源码公开选 Public。使用本项目的自定义非商业学术 LICENSE，不在 GitHub 许可模板中选择 GPL。禁止商用意味着此项目不采用允许商用的开放源代码许可。
4. 解压 ChemoDose-1.0.3-source.zip，上传项目文件夹内部源码。不要将 ZIP 当作唯一源码，不上传原 EXE、指南 PDF、患者资料、SDK 或签名私钥。
5. Releases 创建 v1.0.3 并勾选 Pre-release（未经独立临床验证），附 EXE、APK、DMG、源码 ZIP、安装说明和 SHA256SUMS.txt。
6. 发布说明注明：内置方案测试版，源码仅供非商业学术交流，未经独立临床验证；安卓未真机测试，Mac 未公证。Windows 1.0.3 使用与 Mac、安卓相同方案库；原生运行检查见测试记录。

也可用 Git（jiayi-sketch 须替换成自己的账户）：

```sh
git init -b main
git add .
git commit -m "Add Windows, Android and Apple Silicon preview with shared calculation core"
git remote add origin https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator.git
git push -u origin main
```

作者署名：GitHub @jiayi-sketch。后续版本发布前请核对账号、仓库地址及 SHA256SUMS.txt。
