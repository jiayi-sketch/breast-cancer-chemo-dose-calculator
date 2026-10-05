# 原程序恢复记录

更新日期：2026-10-03。全过程静态读取原 EXE，没有运行原 Windows 文件。

## 原始文件

- 文件名：乳腺癌化疗剂量计算工具_v3.0.2_.exe
- 大小：8,847,707 字节
- SHA-256：435ec17b7f1e24e70644b6ff8ece0a2527b7800ca018f1357c36775a5d50ffa8
- PE32 / x86，PyInstaller，内嵌 Python 3.8 / Tkinter。
- 归档 1,075 个条目，PYZ 93 个模块，未发现原始 .py。

## 已完成

提取 6 个应用模块字节码，使用 decompyle3 3.9.3 / xdis 6.1.8 尝试反编译。

| 模块 | 状态 |
| --- | --- |
| app_win7 | 候选文本通过语法检查，未验证完整运行行为 |
| catalogue | 已按字节码纠正末尾循环嵌套；用 AST 白名单读取出原目录 |
| clinical_data | 声明数据通过 AST 读取；对应目录已对照用户提供的指南相关扫描页录入 |
| app | 整体不完整，单独核对了算术函数与原字节码 |
| report_logic | 不完整、语法检查失败，未接入 |
| report_panel | 不完整、语法检查失败，未接入 |

legacy/decompiled-candidates 中的 .txt 是研究文本，不能作为可运行源码或临床依据。

legacy/calculation_reference.py 仅保留人工核对的 calc_bsa、standard_text、calculate_item 算术参考，对应原字节码见 calculation-disassembly.txt。新核心独立重写这些分支，增加运行时校验与核对记录。

## 未完成

原 Windows 界面、报告解析和病理匹配未完整恢复。0.2.0 已取得用户提供的指南 PDF，恢复 46 个历史方案并补全为 52 个方案、7 个单药参考、18 张摘要卡，详见 guideline-review.md。扫描页录入核对不代表独立临床验证。

未进行原 EXE 的运行对比。回归使用隔离的算术参考及指南剂量表的合成数值测试。0.2.0 的 Android、Mac 外壳与共享界面是新源码，不是旧 v3.0.2 的完整对应源码。

## 1.1.0-preview 报告模块

2026-10-05 静态核对 report_logic 字节码，确认反编译候选文本的条件/循环错位，按旧报告文字工作流重新实现共享 JS 模块和三端界面。原 Python 项目仍未完整恢复，也未运行旧 EXE。范围、实现及边界见 report-matching.md。
