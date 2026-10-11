# 2.1.0 本机历史记录

Windows（现代和 x86 兼容界面）、Apple 芯片 Mac 和 Android 新增本机计算历史。移除“核对人 / 审核人”填写栏，新增可选的患者年龄、住院号。年龄允许 0–120 岁的整数，住院号为最长 64 字符的文字，保留前导零。两项都是记录信息，不参与体表面积、Calvert 或其他剂量公式。

计算成功后默认自动保存；“历史记录”中的开关可以关闭后续保存，关闭不会删除已有记录。历史保存年龄、住院号、参数、所选方案、计算时间、程序/目录版本、剂量摘要及未取整的计算数值。不会保存病理全文、截图、识别结果或审核人。只在本机存储，无账户、上传、同步或后台病例读取。

可按住院号、年龄、方案名称、日期文字或目录版本查询，查看原记录；可删除单条或清空全部，两种删除均要求确认。最多 500 条、8 MiB；达到容量时明确提示保存失败，不自动淘汰旧记录。软件启动不自动载入患者。

“载入参数重新核对”使用当前目录重新打开原方案，清空病理工作区、旧结果及所有确认状态。必须重新判断参数适用性并勾选确认才能计算。原记录保持只读，不作为自动选方案或个体化处方依据。原方案已从目录移除时，仅能查看历史。兼容 Windows 页面只能重新载入内置方案记录，自定义单药记录可查阅，但需在现代界面重新计算。

## 本机存储与删除

- Windows：`%LOCALAPPDATA%\ChemoDose\history-v1.dat`，采用 Windows DPAPI 当前用户保护；现代和兼容界面共用记录。
- Mac：`~/Library/Application Support/ChemoDose/history-v1.dat`，AES-GCM；密钥保存在本机钥匙串，不设为 iCloud 同步。
- Android：应用私有的 no-backup 目录，AES-GCM；密钥由 Android Keystore 管理，系统应用备份禁用。

记录按密文原子写入，使用版本校验避免两窗口覆盖。文件损坏或密钥不可用时，显示错误且保留原文件；不会静默重置。不能把密文文件单独复制到另一账号或设备作为可靠迁移方式。本版无导出/跨设备同步功能。

Windows 升级、卸载保留本机用户数据；如需清除，请先在应用中清空历史。关闭自动保存不是删除。Android 卸载会移除应用私有记录；Mac 删除应用本身不会自动删除 Application Support 或钥匙串内容。清空历史属于逻辑删除，不承诺抹除系统备份、存储介质或已经复制出的核对单。复制摘要仍会写入系统剪贴板。

技术测试使用虚构数据，不代表临床验证。指南目录仍为 2026.10.02，独立临床复核状态仍为 pending。

## English

Version 2.1.0 adds encrypted, device-local calculation history on Windows, Apple Silicon Mac and Android. The reviewer-name field is removed. Optional age and hospitalization number are record metadata only and do not change dose arithmetic; leading zeros in the hospitalization number are retained.

Successful calculations are saved automatically by default. The History switch can disable future saving without deleting existing records. Search, read-only previews, confirmed deletion and loading parameters for a new check are available. Loaded parameters never retain previous approval or pathology context. No patient is loaded automatically at startup. History excludes pathology text, screenshots, extracted findings and reviewer identities. Records are not uploaded or synchronized. Storage is capped at 500 records and 8 MiB; reaching a limit produces an error without silently discarding older records.

Windows uses current-user DPAPI and shares the same history between modern and compatibility interfaces. Mac uses AES-GCM with a local Keychain key; Android uses AES-GCM with an Android Keystore key in private no-backup storage. Corrupt or unreadable history is preserved, not reset. Windows uninstall retains user data. Clear records within the app before uninstalling if desired. Logical deletion does not erase copies, operating-system backups or copied summaries. This is technical verification, not independent clinical validation.
