# 乳腺癌剂量计算工具

Breast Cancer Chemotherapy Dose Calculator · **0.2.2 内置方案测试版** · 源码公开 · 非商业学术授权

面向医生和药师的离线方案查阅与剂量算术核对工具。Android APK 和 Apple 芯片 Mac DMG 使用同一份方案库、界面和计算核心。

本版修正了 0.1.0 仅支持人工录入的偏差：根据作者原 Windows v3.0.2 程序恢复目录，并对照作者提供的《2026 CSCO乳腺癌诊疗指南》扫描页重新录入。包含 **52 个治疗方案、7 个单药剂量参考、18 张指南摘要卡**；不是指南全书数据库，也不是旧 Windows 程序的完整移植。**未经独立临床验证。**

0.2.1 修复方案列表条目被压缩导致文字越出选中框的问题：条目按内容自动增高，长名称完整换行；选中框与右侧方案同步刷新，分型下拉框统一为 44px 高度。方案内容和计算公式与 0.2.0 一致。

## 使用

1. 选择“术前新辅助治疗 / 术后辅助治疗 / 后续内分泌治疗 / 保乳术后治疗”，按分型或方案、药物名称查找。
2. 内置条目直接展示药物、标准剂量、给药日、疗程、推荐摘要和 PDF / 书页依据。
3. 输入身高、体重；含卡铂时填写并核对肾功能值、单位与来源。固定剂量条目不要求身高体重。
4. 填写核对人并确认本次方案和参数，计算各药每次给药量，按需复制核对单。

首剂 / 后续剂量、剂量区间、序贯阶段分别显示。TC 4 周期和 6 周期为不同条目。他莫昔芬的两种频次必须选择其一。修改输入、切换方案、撤销确认会清除旧结果；任何药物缺少必要参数时，不输出部分结果。自定义单药算术核对作为次级页面保留。

内分泌条目是单药剂量参考，联合方案及 OFS 条件须结合指南摘要核对。放疗卡为只读摘要，不生成化疗剂量。未接入报告智能匹配，不自动选择治疗、评估患者适用性、临床取整、减量或判断累计剂量上限。本次核对署名不是身份认证或独立临床审批。

## 安装

| 文件 | 适用设备 | 签名 |
| --- | --- | --- |
| ChemoDose-0.2.2-android.apk | Android 9 / API 28 及以上，更新的 Android System WebView | 沿用 0.1.0 项目测试证书，versionCode 4 |
| ChemoDose-0.2.2-macos-arm64.dmg | Apple 芯片 M 系列 Mac，macOS 13 及以上 | arm64 原生外壳，ad-hoc 签名，未 Developer ID 签名及 Apple 公证 |
| ChemoDose-v3.0.2-windows-academic.exe | Windows，保留原 v3.0.2 方案库 | 原 EXE 的声明修订副本；仅静态核验，未在 Windows 运行测试 |

安卓：打开 APK，按系统提示安装。Mac：打开 DMG，将应用拖入 Applications。替换旧版前退出旧应用，打开后应显示 **0.2.2 内置方案版**，首页能直接看到 TCbHP 等方案。若 macOS 阻止未公证应用，请查看系统设置“隐私与安全性”中针对该应用的打开选项，不要关闭系统安全功能。

安装包、源码包和校验文件见 [GitHub 测试版发布页](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/tag/v0.2.2-preview)。应用不联网、无账户、不持久化患者记录；仅明确点击“复制”时写入系统剪贴板。

## 数据与验证

- [指南核对记录](docs/guideline-review.md)：源文件哈希、页码映射、纠正项、覆盖边界。
- [逐项方案核对表](docs/catalogue-review.md)：全部内置条目的药物、数值、频次、疗程和出处，供专业复核。
- `data/catalogue.json`：两端统一的结构化目录，临床复核状态保留为 pending。
- [测试记录](tests/README.md)：算术、目录、DOM、签名与安装包检查，及尚未完成的真机/视觉检查。

目录录入核对和算术回归不代表临床正确性已经获独立验证。指南 PDF 原件、患者信息及签名私钥均不随源码分发。

## 开发

| 目录 | 内容 |
| --- | --- |
| packages/calculation-core | TypeScript 算术核心、方案适配层、回归测试 |
| data | 有来源页码的共享方案目录 |
| apps/shared-web | 方案库首页及次级人工核对页 |
| apps/android、apps/macos | 离线原生外壳 |
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

原生构建见 [构建说明](docs/building.md)。生成的浏览器脚本不要单独修改，以免两端公式或数据不一致。

本版源码按 [非商业学术授权](LICENSE) 提供，仅限学术交流，禁止商业用途。这是源码公开项目，不是允许商用的开放源代码许可，不声称提供旧 EXE 的完整对应源码。建立仓库和发布步骤见 [GitHub 项目说明](docs/github-publishing.md)。反馈请使用虚构数据，注明版本、步骤、单位、预期和实际结果。

## 作者与授权声明

仅限于学术交流，严禁商业用途  
版权所有 GitHub @jiayi-sketch

0.2.2 在两个首页、使用说明及 Mac 原生“关于”窗口加入上述两行声明，并替换新版本的 GPL 标记。历史 GPL 版本保留原有授权。Windows v3.0.2 声明修订副本通过单独的静态补丁脚本生成，只有作者署名/使用声明变化，未移植 0.2.2 的方案库或修订原有计算。
