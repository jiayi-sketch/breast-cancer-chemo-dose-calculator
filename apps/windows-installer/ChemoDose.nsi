; SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
Unicode true
RequestExecutionLevel user
ManifestSupportedOS all
SetCompressor /SOLID lzma
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"
!include "x64.nsh"
!ifndef VERSION
  !error "Provide VERSION, PAYLOAD, DOCUMENTATION, LICENCE and OUTPUT definitions."
!endif
Name "ChemoDose ${VERSION}"
OutFile "${OUTPUT}"
InstallDir "$LOCALAPPDATA\Programs\ChemoDose"
InstallDirRegKey HKCU "Software\jiayi-sketch\ChemoDose" "InstallLocation"
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "ChemoDose Windows Setup"
VIAddVersionKey "FileDescription" "ChemoDose Windows Setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "GitHub @jiayi-sketch — academic noncommercial use only"
BrandingText "GitHub @jiayi-sketch"
!define MUI_ABORTWARNING
!define MUI_LANGDLL_ALLLANGUAGES
!define MUI_LANGDLL_REGISTRY_ROOT HKCU
!define MUI_LANGDLL_REGISTRY_KEY "Software\jiayi-sketch\ChemoDose"
!define MUI_LANGDLL_REGISTRY_VALUENAME "InstallerLanguage"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${LICENCE}"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "TradChinese"
!insertmacro MUI_LANGUAGE "English"
LangString MainSection ${LANG_SIMPCHINESE} "乳腺癌剂量计算（必选）"
LangString MainSection ${LANG_TRADCHINESE} "乳腺癌劑量計算（必選）"
LangString MainSection ${LANG_ENGLISH} "Breast Cancer Dose Calculator (required)"
LangString DesktopSection ${LANG_SIMPCHINESE} "桌面快捷方式"
LangString DesktopSection ${LANG_TRADCHINESE} "桌面捷徑"
LangString DesktopSection ${LANG_ENGLISH} "Desktop shortcut"
LangString MissingFramework ${LANG_SIMPCHINESE} "此程序需要 .NET Framework 4。请先安装微软 .NET Framework 4 完整版，再运行此安装包。Win10 / Win11 通常已经包含兼容的 4.x。$\r$\nhttps://www.microsoft.com/download/details.aspx?id=17718"
LangString MissingFramework ${LANG_TRADCHINESE} "此程式需要 .NET Framework 4。請先安裝微軟 .NET Framework 4 完整版，再執行此安裝程式。Win10 / Win11 通常已包含相容的 4.x。$\r$\nhttps://www.microsoft.com/download/details.aspx?id=17718"
LangString MissingFramework ${LANG_ENGLISH} "This application requires the full .NET Framework 4. Install it from Microsoft, then run this setup again. Windows 10 / 11 normally includes a compatible 4.x.$\r$\nhttps://www.microsoft.com/download/details.aspx?id=17718"
LangString UnsupportedSystem ${LANG_SIMPCHINESE} "此安装包面向 XP SP3 x86、Win7 SP1 及更新的 Intel/AMD Windows。此系统不在目标范围内。"
LangString UnsupportedSystem ${LANG_TRADCHINESE} "此安裝程式面向 XP SP3 x86、Win7 SP1 及更新的 Intel/AMD Windows。此系統不在目標範圍內。"
LangString UnsupportedSystem ${LANG_ENGLISH} "This package targets XP SP3 x86, Windows 7 SP1 and newer Intel/AMD Windows. This system is outside the target range."
Function .onInit
  SetShellVarContext current
  !insertmacro MUI_LANGDLL_DISPLAY
  ${IfNot} ${IsNativeIA32}
  ${AndIfNot} ${IsNativeAMD64}
    MessageBox MB_OK|MB_ICONSTOP "$(UnsupportedSystem)" /SD IDOK
    Abort
  ${EndIf}
  ${If} ${IsWinXP}
    ${If} ${RunningX64}
    ${OrIfNot} ${AtLeastServicePack} 3
      MessageBox MB_OK|MB_ICONSTOP "$(UnsupportedSystem)" /SD IDOK
      Abort
    ${EndIf}
  ${ElseIf} ${IsWin7}
    ${IfNot} ${AtLeastServicePack} 1
      MessageBox MB_OK|MB_ICONSTOP "$(UnsupportedSystem)" /SD IDOK
      Abort
    ${EndIf}
  ${ElseIfNot} ${AtLeastWin7}
    MessageBox MB_OK|MB_ICONSTOP "$(UnsupportedSystem)" /SD IDOK
    Abort
  ${EndIf}
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" "Install"
  ${If} $0 != 1
    MessageBox MB_OK|MB_ICONINFORMATION "$(MissingFramework)" /SD IDOK
    Abort
  ${EndIf}
FunctionEnd
Section "$(MainSection)" Main
  SectionIn RO
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File /oname=ChemoDose.exe "${PAYLOAD}"
  File /oname=LICENSE.txt "${LICENCE}"
  File /oname=WINDOWS-INSTALLATION.txt "${DOCUMENTATION}"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\ChemoDose"
  CreateShortcut "$SMPROGRAMS\ChemoDose\ChemoDose.lnk" "$INSTDIR\ChemoDose.exe"
  CreateShortcut "$SMPROGRAMS\ChemoDose\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\jiayi-sketch\ChemoDose" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose" "DisplayName" "ChemoDose ${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose" "Publisher" "GitHub @jiayi-sketch"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose" "QuietUninstallString" '$\"$INSTDIR\Uninstall.exe$\" /S'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose" "NoRepair" 1
SectionEnd
Section "$(DesktopSection)" Desktop
  CreateShortcut "$DESKTOP\ChemoDose.lnk" "$INSTDIR\ChemoDose.exe"
SectionEnd
Function un.onInit
  SetShellVarContext current
  !insertmacro MUI_UNGETLANGUAGE
FunctionEnd
Section "Uninstall"
  SetShellVarContext current
  ; Only remove files installed here. Never recursively remove an arbitrary
  ; user-selected directory, shared portable caches or language preferences.
  ReadRegStr $0 HKCU "Software\jiayi-sketch\ChemoDose" "InstallLocation"
  ${If} $0 == $INSTDIR
    Delete "$DESKTOP\ChemoDose.lnk"
    Delete "$SMPROGRAMS\ChemoDose\ChemoDose.lnk"
    Delete "$SMPROGRAMS\ChemoDose\Uninstall.lnk"
    RMDir "$SMPROGRAMS\ChemoDose"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose"
    DeleteRegValue HKCU "Software\jiayi-sketch\ChemoDose" "InstallLocation"
  ${EndIf}
  Delete "$INSTDIR\ChemoDose.exe"
  Delete "$INSTDIR\LICENSE.txt"
  Delete "$INSTDIR\WINDOWS-INSTALLATION.txt"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
