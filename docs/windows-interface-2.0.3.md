# Windows 2.0.3：简洁窗口边框

沿用 2.0.2 参考原版的深蓝标题栏、治疗阶段侧栏、顶部参数区、左侧方案列表和右侧药物表。本次去掉现代界面与 x86 兼容界面主窗口的 Windows 系统标题栏及厚边框，采用与软件一致的蓝色窗口控制区。

- 右上角：最小化、最大化/还原、关闭，按钮提供简体中文、繁體中文及 English 辅助功能名称。
- 拖动蓝色顶栏空白区移动窗口；双击该区域最大化或还原。
- 拖动边缘或四角调整大小；最大化使用当前显示器的工作区，避开任务栏。
- Alt+F4 关闭；Alt+空格打开系统窗口菜单。帮助入口保留在顶栏左侧。

外缘保留 6 像素的应用色缩放触达区，它不是原有的系统非客户区边框。帮助、授权及药物目录等弹窗继续使用常规窗口；此次改动针对主窗口。

Windows 应用与安装包版本为 2.0.3；方案库、计算核心及现有 Mac / Android 文件仍为 2.0.0。没有修改方案、剂量、病理匹配或人工核对流程。

## English

Windows 2.0.3 retains the original-style blue layout introduced in 2.0.2 and removes the main window’s native Windows title bar and thick frame in both the modern and x86 compatibility interfaces. Minimize, maximize/restore and close controls appear in a matching blue strip with accessible names in all three languages. Drag a blank area of the strip to move the window, double-click it to maximize/restore, or drag an edge/corner to resize. Maximization respects the current monitor’s working area. Alt+F4 closes the window; Alt+Space opens the system menu. Help remains on the left.

A six-pixel application-coloured resize grip remains around the main window; it is not the previous native frame. Secondary dialogs retain their regular window frames. This is a Windows presentation update only. Clinical data, calculations, pathology matching, review requirements and existing Mac/Android packages remain unchanged.

Implementation references: Microsoft [WM_NCCALCSIZE](https://learn.microsoft.com/en-us/windows/win32/winmsg/wm-nccalcsize), [WM_NCHITTEST](https://learn.microsoft.com/en-us/windows/win32/inputdev/wm-nchittest) and [WM_SYSCOMMAND](https://learn.microsoft.com/en-us/windows/win32/menurc/wm-syscommand).

仅限于学术交流，严禁商业用途  
版权所有 GitHub @jiayi-sketch
