# 离线截图与剪贴板识别 · 2.0.0

先选择穿刺、术后大病理、免疫组化或 HER2 FISH/ISH 来源，再导入截图或剪贴板文字。导入替换当前来源框；其他来源保留，合计不超过 40000 字。所有来源必须属于同一患者、病灶和取材时点；换病例先清空全部。图片最多 12 MiB、2000 万像素，推荐清晰 PNG/JPEG，识别后逐字核对原图，尤其是百分数、小数点、0/1+/2+/3+ 与阳性/阴性。OCR 置信度不能替代病理复核。

识别成功后自动弹出字段、适用条件提醒和药物目录。尚未确定治疗阶段时，术前和直接术后条目分别展示，不能将两组候选视为同一治疗方案。新辅助后进入既往治疗/pCR/残留病灶相关摘要。待出、冲突、HER2 2+ 无最终 ISH 等情况不会展示药物候选。候选不是处方；核对报告与阶段后，医生自行选择方案，再填写参数并确认剂量依据。

可勾选“本次窗口返回前台时自动导入新的病理剪贴板内容”。默认关闭，仅当前会话有效。不会后台监听；普通无标志物文字、重复内容和应用自己复制的核对单不会自动再次导入。剪贴板图片需由用户主动选择来源并启用此功能。取消或切换来源、改原文、换语言、清空病例后，迟到的 OCR 回执被丢弃。新截图识别开始时清除旧匹配和剂量。系统剪贴板由操作系统管理，清空程序病例不会删除系统剪贴板。

| 平台 | 图片 OCR | 剪贴板/文件 |
| --- | --- | --- |
| Apple Silicon Mac，macOS 13+ | 本机 Apple Vision | PNG/JPEG 文件、剪贴板图片和文字；系统截图快捷键 Shift+Command+Control+4 |
| Windows x64，Windows 10 22H2/11 + WebView2 | 内置 Tesseract.js WASM | PNG/JPEG 文件、剪贴板图片和文字；系统截图快捷键 Win+Shift+S |
| Android 9+，需支持 WASM/Worker 的系统 WebView | 内置 Tesseract.js WASM | 系统图片选择器、获授权的剪贴板图片 URI、文字；可先系统截图再导入 |
| Windows x86 兼容版，目标 Win7/XP | 本版未提供图片 OCR | 文字导入和药物目录弹窗 |

不捕获整个桌面，不索取屏幕录制、相机或全部照片库权限，不直接 OCR 病理切片或解析 PDF。不上传图文、不建立患者数据库、不记录患者日志。仅语言偏好写入本地；识别图文暂存于本次窗口/内存中的识别任务。Tesseract 禁用语言模型缓存；读取包内资源时不访问 CDN，外部导航和请求被阻止。模型文件是公共识别参数，不含患者数据。

版本与许可：Tesseract.js 7.0.0、tesseract.js-core 7.0.0；三种 LSTM core 根据本机 WASM 能力选择。模型 eng、chi_sim、chi_tra 使用 tessdata_fast 提交 `87416418657359cb625c412a48b6e1d6d41c29bd`，确定性 gzip；版本、文件大小与 SHA256 见 `apps/shared-web/ocr/manifest.json`。项目的非商业许可不改变第三方的 Apache/MIT/BSD 等许可，原文随包保留。Mac 原生 OCR 使用系统框架，其输出也必须人工核对。

参考：[Tesseract 本机安装说明](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md)、[tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast)、[Apple Vision](https://developer.apple.com/documentation/vision/vnrecognizetextrequest)。技术测试只覆盖虚构报告与部分模板，不代表临床验证或所有设备、医院模板和图片质量的识别保证。
