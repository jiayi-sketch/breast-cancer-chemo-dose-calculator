// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("ChemoDose Windows Unified")]
[assembly: AssemblyVersion("2.0.2.0")]
[assembly: AssemblyFileVersion("2.0.2.0")]
[assembly: AssemblyCopyright("仅限于学术交流，严禁商业用途\n版权所有 GitHub @jiayi-sketch")]
namespace ChemoDose.Unified {
 static class Program {
  [STAThread] static int Main(string[] args) {
   bool testing = Array.IndexOf(args,"--self-test") >= 0;
   try {
    bool compatibility=Array.IndexOf(args,"--compat")>=0;
    var system=NativeSystem.Read();
    bool eligible=LaunchPolicy.CanRunModern(system.Major,system.Build,system.Architecture);
    bool webView=eligible && NativeSystem.HasWebView();
    var edition=LaunchPolicy.Select(system.Major,system.Minor,system.Build,system.ServicePack,system.Architecture,webView,compatibility);
    if(edition==Edition.Unsupported) throw new NotSupportedException("本包面向 XP SP3 x86、Win7 SP1 及更新的 Intel/AMD Windows。此系统不在目标范围内。\nThis package targets XP SP3 x86, Windows 7 SP1 and newer Intel/AMD Windows.");
    if(Array.IndexOf(args,"--describe")>=0) {
     int index=Array.IndexOf(args,"--report");
     if(index<0 || index+1>=args.Length) throw new ArgumentException("--describe requires --report <path>.");
     File.WriteAllText(args[index+1],"{\"edition\":\""+edition.ToString().ToLowerInvariant()+"\",\"major\":"+system.Major+",\"minor\":"+system.Minor+",\"build\":"+system.Build+",\"architecture\":"+system.Architecture+",\"webView\":"+(webView?"true":"false")+"}",new UTF8Encoding(false));
     return 0;
    }
    if(eligible && !webView && !compatibility && !testing) MessageBox.Show(
     "未检测到 Microsoft WebView2 Runtime，本次将打开兼容界面（支持文字导入，不含截图 OCR）。安装微软 WebView2 Runtime 后，重新打开即可自动使用完整界面。\n\nWebView2 Runtime was not detected. The compatibility interface will open with text import, without screenshot OCR. Install Microsoft's WebView2 Runtime to enable the full interface.","ChemoDose",MessageBoxButtons.OK,MessageBoxIcon.Information);
    string directory=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ChemoDose","Bundles",Bundle.Version+"-"+Bundle.Id);
    Directory.CreateDirectory(directory);
    string executable;
    using(var mutex=new Mutex(false,"Local\\ChemoDose-Bundle-"+Bundle.Id)) {
     bool entered=false;
     try {
      try { entered=mutex.WaitOne(60000); } catch(AbandonedMutexException) { entered=true; }
      if(!entered) throw new IOException("Another ChemoDose launch is still preparing the application. Please try again.");
      executable=Bundle.Prepare(edition,directory);
     } finally { if(entered) mutex.ReleaseMutex(); }
    }
    var forwarded=new List<string>();
    foreach(string arg in args) if(arg!="--compat") forwarded.Add(LaunchPolicy.Quote(arg));
    using(var process=Process.Start(new ProcessStartInfo {
     FileName=executable,Arguments=String.Join(" ",forwarded.ToArray()),WorkingDirectory=Environment.CurrentDirectory,UseShellExecute=false
    })) {
     if(process==null) throw new IOException("The application could not be started.");
     process.WaitForExit(); return process.ExitCode;
    }
   } catch(Exception error) {
    if(!testing) MessageBox.Show("启动失败 / Startup failed:\n"+error.Message+"\n\n仅限于学术交流，严禁商业用途\n版权所有 GitHub @jiayi-sketch","ChemoDose",MessageBoxButtons.OK,MessageBoxIcon.Error);
    return 1;
   }
  }
 }
}
