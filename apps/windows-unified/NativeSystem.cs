// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace ChemoDose.Unified {
 public sealed class NativeSystem {
  public int Major, Minor, Build, ServicePack;
  public ushort Architecture;
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]
  struct OsVersion {
   public int Size, Major, Minor, Build, Platform;
   [MarshalAs(UnmanagedType.ByValTStr,SizeConst=128)] public string Csd;
   public ushort ServicePackMajor, ServicePackMinor, Suite;
   public byte ProductType, Reserved;
  }
  [StructLayout(LayoutKind.Sequential)]
  struct SystemInfo {
   public ushort Architecture, Reserved; public uint PageSize;
   public IntPtr MinimumAddress, MaximumAddress, ProcessorMask;
   public uint NumberOfProcessors, ProcessorType, AllocationGranularity;
   public ushort ProcessorLevel, ProcessorRevision;
  }
  [DllImport("ntdll.dll",CharSet=CharSet.Unicode)] static extern int RtlGetVersion(ref OsVersion version);
  [DllImport("kernel32.dll")] static extern void GetNativeSystemInfo(out SystemInfo info);
  [DllImport("kernel32.dll",SetLastError=true)] [return:MarshalAs(UnmanagedType.Bool)]
  static extern bool IsWow64Process2(IntPtr process,out ushort processMachine,out ushort nativeMachine);
  [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
  public static NativeSystem Read() {
   var version = new OsVersion { Size = Marshal.SizeOf(typeof(OsVersion)), Csd = "" };
   if(RtlGetVersion(ref version) != 0) throw new InvalidOperationException("Cannot determine the Windows version.");
   SystemInfo info; GetNativeSystemInfo(out info);
   ushort arch = info.Architecture == 0 ? (ushort)0x014c : info.Architecture == 9 ? (ushort)0x8664 : (ushort)0;
   // On recent Windows this also detects ARM emulation without mistaking it for x64.
   if(version.Major >= 10) try {
    ushort processMachine, nativeMachine;
    if(IsWow64Process2(GetCurrentProcess(),out processMachine,out nativeMachine)) arch = nativeMachine;
   } catch(EntryPointNotFoundException) { }
   return new NativeSystem { Major=version.Major, Minor=version.Minor, Build=version.Build,
    ServicePack=version.ServicePackMajor, Architecture=arch };
  }
  public static bool HasWebView() {
   const string path = @"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
   foreach(RegistryHive hive in new[]{RegistryHive.LocalMachine,RegistryHive.CurrentUser})
    foreach(RegistryView view in new[]{RegistryView.Registry32,RegistryView.Registry64}) try {
     using(var root = RegistryKey.OpenBaseKey(hive,view)) using(var key = root.OpenSubKey(path,false)) {
      Version version;
      if(key != null && Version.TryParse(key.GetValue("pv") as string,out version) && version.Major > 0) return true;
     }
    } catch(System.Security.SecurityException) { } catch(UnauthorizedAccessException) { }
   return false;
  }
 }
}
