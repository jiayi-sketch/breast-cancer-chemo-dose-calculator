// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
// Shared by .NET 4 x86 and modern Windows. No DWM dependency (XP compatibility).
using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace ChemoDose.Windowing {
 public class FramelessWindow : Form {
  const int WM_NCCALCSIZE=0x83, WM_NCHITTEST=0x84, WM_GETMINMAXINFO=0x24;
  const int WS_CAPTION=0xC00000, WS_THICKFRAME=0x40000;
  Panel chrome;
  WindowButton minimize,maximize,close;
  string chromeLanguage="zh-Hans";
  Rectangle normalBounds;FormWindowState previousState;bool restoringBounds,suppressNormalCapture;
  [DllImport("user32.dll")] static extern bool ReleaseCapture();
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr hwnd,int msg,IntPtr wParam,IntPtr lParam);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hwnd,int index);
  [StructLayout(LayoutKind.Sequential)] struct MinMaxInfo {public Point reserved,maxSize,maxPosition,minTrackSize,maxTrackSize;}

  protected FramelessWindow() {
   FormBorderStyle=FormBorderStyle.None;
   // This application-coloured grip replaces the native non-client border.
   Padding=new Padding(6);BackColor=Color.FromArgb(7,59,97);
  }
  protected override void OnShown(EventArgs e) {
   Rectangle area=Screen.FromHandle(Handle).WorkingArea;
   Size=new Size(Math.Min(Width,area.Width),Math.Min(Height,area.Height));
   Location=new Point(Math.Max(area.Left,Math.Min(Left,area.Right-Width)),Math.Max(area.Top,Math.Min(Top,area.Bottom-Height)));
   base.OnShown(e);
  }
  protected override CreateParams CreateParams {
   get {var cp=base.CreateParams;cp.Style=(cp.Style&~WS_CAPTION)|WS_THICKFRAME|0x80000|0x20000|0x10000;return cp;}
  }
  protected void InitializeChrome(Control help) {
   chrome=new Panel {Dock=DockStyle.Top,Height=30,BackColor=Color.FromArgb(7,59,97),AccessibleName="Window controls"};
   chrome.MouseDown+=(s,e)=>{if(e.Button!=MouseButtons.Left)return;if(e.Clicks==2){ToggleMaximize();return;}
    Point point=chrome.PointToScreen(e.Location);ReleaseCapture();SendMessage(Handle,0xA1,new IntPtr(2),new IntPtr(unchecked((int)(((point.Y&0xffff)<<16)|(point.X&0xffff)))));};
   close=new WindowButton(2);maximize=new WindowButton(1);minimize=new WindowButton(0);
   close.Click+=(s,e)=>Close();maximize.Click+=(s,e)=>ToggleMaximize();minimize.Click+=(s,e)=>SetWindowState(FormWindowState.Minimized);
   // Dock right in reverse visual order: minimize, maximize, close.
   chrome.Controls.Add(minimize);chrome.Controls.Add(maximize);chrome.Controls.Add(close);
   if(help!=null){help.Dock=DockStyle.Left;chrome.Controls.Add(help);}
   Controls.Add(chrome);BackColor=chrome.BackColor;RefreshChromeLanguage(chromeLanguage);
  }
  protected void RefreshChromeLanguage(string language) {
   chromeLanguage=language;if(chrome==null)return;
   bool en=language=="en",traditional=language=="zh-Hant";
   minimize.AccessibleName=en?"Minimize":traditional?"最小化":"最小化";
   maximize.AccessibleName=WindowState==FormWindowState.Maximized?(en?"Restore":traditional?"還原":"还原"):(en?"Maximize":traditional?"最大化":"最大化");
   close.AccessibleName=en?"Close":traditional?"關閉":"关闭";
   foreach(var b in new[]{minimize,maximize,close})b.AccessibleDescription=b.AccessibleName;
   maximize.Restore=WindowState==FormWindowState.Maximized;maximize.Invalidate();
  }
  void SetWindowState(FormWindowState state){RememberNormalBounds();suppressNormalCapture=true;try{WindowState=state;}finally{suppressNormalCapture=false;}}
  void ToggleMaximize(){SetWindowState(WindowState==FormWindowState.Maximized?FormWindowState.Normal:FormWindowState.Maximized);}
  protected override void OnLocationChanged(EventArgs e){base.OnLocationChanged(e);RememberNormalBounds();}
  void RememberNormalBounds(){if(!restoringBounds&&!suppressNormalCapture&&WindowState==FormWindowState.Normal&&previousState==FormWindowState.Normal)normalBounds=Bounds;}
  protected override void OnResize(EventArgs e){
   base.OnResize(e);
   // .NET 4 otherwise adds its old non-client metrics back when restoring a
   // captionless window. Preserve the actual rectangle instead of that cache.
   if(!restoringBounds&&WindowState==FormWindowState.Normal&&previousState!=FormWindowState.Normal&&normalBounds.Width>0){
    restoringBounds=true;Bounds=normalBounds;restoringBounds=false;
   }
   previousState=WindowState;RememberNormalBounds();RefreshChromeLanguage(chromeLanguage);
  }
  protected override bool ProcessCmdKey(ref Message msg,Keys keyData) {
   if(keyData==(Keys.Alt|Keys.Space)){ReleaseCapture();SendMessage(Handle,0x112,new IntPtr(0xF100),new IntPtr(0x20));return true;}
   return base.ProcessCmdKey(ref msg,keyData);
  }
  internal static int ResizeHit(Point p,Size size,int grip,bool enabled) {
   if(!enabled||p.X<0||p.Y<0||p.X>=size.Width||p.Y>=size.Height)return 1;
   bool left=p.X<grip,right=p.X>=size.Width-grip,top=p.Y<grip,bottom=p.Y>=size.Height-grip;
   if(top)return left?13:right?14:12;if(bottom)return left?16:right?17:15;
   return left?10:right?11:1;
  }
  protected override void WndProc(ref Message m) {
   // Keep Windows resize/snap/system-menu styles while allocating the entire
   // rectangle to the client area: no native caption or thick border is drawn.
   if(m.Msg==WM_NCCALCSIZE){m.Result=IntPtr.Zero;return;}
   if(m.Msg==WM_NCHITTEST){
    long position=m.LParam.ToInt64();var p=PointToClient(new Point((short)(position&0xffff),(short)((position>>16)&0xffff)));
    int hit=ResizeHit(p,ClientSize,Padding.Left,WindowState==FormWindowState.Normal);
    if(hit!=1){m.Result=new IntPtr(hit);return;}
   }
   bool systemTransition=m.Msg==0x112&&((m.WParam.ToInt64()&0xfff0)==0xf030||(m.WParam.ToInt64()&0xfff0)==0xf020||(m.WParam.ToInt64()&0xfff0)==0xf120);
   if(systemTransition){RememberNormalBounds();suppressNormalCapture=true;}
   try{base.WndProc(ref m);}finally{if(systemTransition)suppressNormalCapture=false;}
   if(m.Msg==WM_GETMINMAXINFO){
    var screen=Screen.FromHandle(Handle);Rectangle area=screen.WorkingArea,bounds=screen.Bounds;
    var info=(MinMaxInfo)Marshal.PtrToStructure(m.LParam,typeof(MinMaxInfo));
    info.maxPosition=new Point(area.Left-bounds.Left,area.Top-bounds.Top);info.maxSize=new Point(area.Width,area.Height);
    Marshal.StructureToPtr(info,m.LParam,false);
   }
  }
  protected void VerifyChrome() {
   if(chrome==null||FormBorderStyle!=FormBorderStyle.None||(GetWindowLong(Handle,-16)&WS_CAPTION)!=0)throw new Exception("Native window caption was not removed");
   int[] expected={13,12,14,10,1,11,16,15,17};int index=0;
   foreach(int y in new[]{0,ClientSize.Height/2,ClientSize.Height-1})foreach(int x in new[]{0,ClientSize.Width/2,ClientSize.Width-1}){
    Point screen=PointToScreen(new Point(x,y));IntPtr packed=new IntPtr(unchecked((int)(((screen.Y&0xffff)<<16)|(screen.X&0xffff))));
    if(SendMessage(Handle,WM_NCHITTEST,IntPtr.Zero,packed).ToInt32()!=expected[index++])throw new Exception("Native resize hit testing failed");
   }
   Rectangle saved=Bounds;
   minimize.PerformClick();if(WindowState!=FormWindowState.Minimized)throw new Exception("Minimize control");
   WindowState=FormWindowState.Normal;maximize.PerformClick();
   if(WindowState!=FormWindowState.Maximized||Bounds!=Screen.FromHandle(Handle).WorkingArea)throw new Exception("Maximize overlaps the taskbar");
   if(maximize.AccessibleName!=(chromeLanguage=="en"?"Restore":chromeLanguage=="zh-Hant"?"還原":"还原"))throw new Exception("Restore accessibility name");
   maximize.PerformClick();if(WindowState!=FormWindowState.Normal||Bounds!=saved)throw new Exception("Restore bounds: expected "+saved+", actual "+Bounds);
   foreach(var b in new[]{minimize,maximize,close})if(b.Parent!=chrome||!b.Visible||b.Left<0||b.Right>chrome.ClientSize.Width||String.IsNullOrEmpty(b.AccessibleName))throw new Exception("Window control layout");
   // Exercise the real Close button on a separate empty window.
   using(var probe=new FramelessWindow()){probe.InitializeChrome(null);probe.ShowInTaskbar=false;probe.Show();bool closed=false;probe.FormClosed+=(s,e)=>closed=true;probe.close.PerformClick();if(!closed)throw new Exception("Close control");}
  }
  sealed class WindowButton : Button {
   readonly int kind;bool hovered;public bool Restore;
   public WindowButton(int kind){this.kind=kind;Dock=DockStyle.Right;Width=42;FlatStyle=FlatStyle.Flat;FlatAppearance.BorderSize=0;BackColor=Color.FromArgb(7,59,97);ForeColor=Color.White;AccessibleRole=AccessibleRole.PushButton;}
   protected override void OnMouseEnter(EventArgs e){hovered=true;Invalidate();base.OnMouseEnter(e);}
   protected override void OnMouseLeave(EventArgs e){hovered=false;Invalidate();base.OnMouseLeave(e);}
   protected override void OnPaint(PaintEventArgs e){
    e.Graphics.Clear(hovered?(kind==2?Color.FromArgb(186,42,52):Color.FromArgb(13,100,156)):BackColor);
    int x=Width/2-5,y=Height/2-5;using(var pen=new Pen(ForeColor,1.5f)){
     if(kind==0)e.Graphics.DrawLine(pen,x,y+9,x+10,y+9);
     else if(kind==2){e.Graphics.DrawLine(pen,x,y,x+10,y+10);e.Graphics.DrawLine(pen,x+10,y,x,y+10);}
     else if(Restore){e.Graphics.DrawRectangle(pen,x+3,y,8,8);using(var brush=new SolidBrush(hovered?Color.FromArgb(13,100,156):BackColor))e.Graphics.FillRectangle(brush,x,y+3,8,8);e.Graphics.DrawRectangle(pen,x,y+3,8,8);}
     else e.Graphics.DrawRectangle(pen,x,y,10,10);
    }
    if(Focused)ControlPaint.DrawFocusRectangle(e.Graphics,new Rectangle(3,3,Width-6,Height-6),ForeColor,BackColor);
   }
  }
 }
}
