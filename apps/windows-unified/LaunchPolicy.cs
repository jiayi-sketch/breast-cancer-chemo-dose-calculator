// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
using System;
using System.Text;

namespace ChemoDose.Unified {
 public enum Edition { Unsupported, Legacy, Modern }
 public static class LaunchPolicy {
  // Conservative application baseline, not a claim of vendor lifecycle support.
  public static bool CanRunModern(int major, int build, ushort architecture) {
   return architecture == 0x8664 && (major > 10 || (major == 10 && build >= 19045));
  }
  public static Edition Select(int major, int minor, int build, int servicePack, ushort architecture, bool webView, bool compatibility) {
   if(architecture != 0x014c && architecture != 0x8664) return Edition.Unsupported;
   bool supported = (major == 5 && minor == 1 && servicePack >= 3 && architecture == 0x014c)
    || (major == 6 && minor == 1 && servicePack >= 1)
    || (major == 6 && minor >= 2) || major >= 10;
   if(!supported) return Edition.Unsupported;
   return !compatibility && webView && CanRunModern(major,build,architecture) ? Edition.Modern : Edition.Legacy;
  }
  // Windows CommandLineToArgvW quoting; arguments never pass through a shell.
  public static string Quote(string value) {
   var result = new StringBuilder("\""); int slashes = 0;
   foreach(char c in value) {
    if(c == '\\') { slashes++; continue; }
    if(c == '"') result.Append('\\', slashes * 2 + 1);
    else result.Append('\\', slashes);
    result.Append(c); slashes = 0;
   }
   result.Append('\\',slashes * 2); return result.Append('"').ToString();
  }
 }
}
