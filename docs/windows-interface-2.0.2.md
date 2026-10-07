# Windows 2.0.2 界面修订

参考对象为 [v0.2.2-preview 中的原 Windows EXE](https://github.com/jiayi-sketch/breast-cancer-chemo-dose-calculator/releases/tag/v0.2.2-preview)。该附件沿用作者原 v3.0.2 的 Tkinter 界面，并非后来移植的共享网页界面。

本版恢复其深蓝标题栏与治疗阶段侧栏、顶部参数区、左侧可见方案列表及右侧说明与药物表格。长方案名称按内容换行；所选条目与右侧显示、计算条目同步。现代界面的药物表分为药物、指南剂量、计算量、给药时间和疗程五列，来源及注释继续显示。兼容界面保留原生表格中的阶段与来源列。

报告识别入口放在侧栏，保留三语、剪贴板导入、人工原文核对及医生自行选择方案。标题栏的“新患者 / 清空本次”同时清除本次报告、参数、确认与计算结果。患者资料不持久化。

只修改 Windows 的呈现与版本号：Windows 为 2.0.2，共享计算核心、方案目录及 Mac / Android 安装包保持 2.0.0。没有添加临床规则、自动处方、取整或剂量调整。

## English

Windows 2.0.2 follows the original v3.0.2 Windows interface distributed in v0.2.2-preview: a blue header and stage navigation, patient parameters above the workspace, a visible regimen list on the left, and notes and medication results on the right. Long names wrap, and the selected list entry stays aligned with the displayed and calculated regimen. The modern medication table separates drug, guideline dose, calculated amount, administration and duration; source references and notes remain visible. The native compatibility table retains phase and source columns.

Three languages, report import, manual review and clinician-led regimen selection remain available. “New patient / Clear case” clears this session’s reports, inputs, confirmations and results. This is a Windows presentation revision only; the shared clinical catalogue and calculation core, and existing Mac/Android packages, remain at 2.0.0.
