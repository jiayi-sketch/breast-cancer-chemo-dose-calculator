# SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
$ErrorActionPreference = 'Stop'
$setup = "$PWD/build/release/ChemoDose-2.0.3-windows-setup.exe"
$payload = "$PWD/build/release/ChemoDose-2.0.3-windows-unified.exe"
$destination = Join-Path $env:LOCALAPPDATA 'ChemoDose Installer QA with spaces'
$registry = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\ChemoDose'
$settings = 'HKCU:\Software\jiayi-sketch\ChemoDose'
$desktop = Join-Path ([Environment]::GetFolderPath('Desktop')) 'ChemoDose.lnk'
$startMenu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\ChemoDose'
New-Item -ItemType Directory -Force $destination | Out-Null
Set-Content (Join-Path $destination 'keep.txt') 'Fictional QA sentinel; not owned by installer.'
$hash = (Get-FileHash $payload -Algorithm SHA256).Hash
$preferences=Join-Path $env:LOCALAPPDATA 'ChemoDose'
New-Item -ItemType Directory -Force $preferences | Out-Null
Set-Content (Join-Path $preferences 'language.json') '{"language":"zh-Hant"}'
Set-Content (Join-Path $preferences 'legacy-language.txt') 'zh-Hant'
$checks = @()
foreach ($pass in @('install','upgrade')) {
  # NSIS /D must be the final, unquoted argument, including a path with spaces.
  $process = Start-Process $setup -ArgumentList "/S /D=$destination" -PassThru -Wait
  if ($process.ExitCode -ne 0) { throw "$pass exited with $($process.ExitCode)" }
  foreach ($name in @('ChemoDose.exe','Uninstall.exe','LICENSE.txt','WINDOWS-INSTALLATION.txt')) {
    if (-not (Test-Path (Join-Path $destination $name))) { throw "$pass missing $name" }
  }
  if ((Get-FileHash (Join-Path $destination 'ChemoDose.exe') -Algorithm SHA256).Hash -ne $hash) { throw 'Installed payload differs from tested portable EXE' }
  if ((Get-ItemProperty $registry).DisplayVersion -ne '2.0.3') { throw 'Uninstall version incorrect' }
  if ((Get-ItemProperty $settings).InstallLocation -ne $destination) { throw 'Installation location incorrect' }
  $shell = New-Object -ComObject WScript.Shell
  foreach ($shortcut in @($desktop,(Join-Path $startMenu 'ChemoDose.lnk'))) {
    if (-not (Test-Path $shortcut) -or $shell.CreateShortcut($shortcut).TargetPath -ne (Join-Path $destination 'ChemoDose.exe')) { throw 'Shortcut target incorrect' }
  }
  if (-not (Test-Path (Join-Path $destination 'keep.txt'))) { throw 'Installer removed unrelated file' }
  if ((Get-Content (Join-Path $preferences 'language.json') | ConvertFrom-Json).language -ne 'zh-Hant' -or (Get-Content (Join-Path $preferences 'legacy-language.txt')).Trim() -ne 'zh-Hant') { throw 'Language preference changed during installation' }
  $checks += @{operation=$pass;passed=$true;payloadSha256=$hash.ToLowerInvariant();languagePreferencesRetained=$true}
}
$probe = "$PWD/build/verification/installed-selection.json"
$app = Start-Process (Join-Path $destination 'ChemoDose.exe') -ArgumentList "--describe --report `"$probe`"" -PassThru -Wait
if ($app.ExitCode -ne 0 -or (Get-Content $probe | ConvertFrom-Json).edition -ne 'modern') { throw 'Installed launcher selection failed' }
$uninstaller = Join-Path $destination 'Uninstall.exe'
$process = Start-Process $uninstaller -ArgumentList "/S" -PassThru -Wait
if ($process.ExitCode -ne 0) { throw 'Uninstall failed' }
$deadline=(Get-Date).AddSeconds(20)
while ((Test-Path $uninstaller) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
foreach ($name in @('ChemoDose.exe','LICENSE.txt','WINDOWS-INSTALLATION.txt','Uninstall.exe')) {
  if (Test-Path (Join-Path $destination $name)) { throw "Owned file remained: $name" }
}
if (-not (Test-Path (Join-Path $destination 'keep.txt'))) { throw 'Uninstaller removed unrelated file' }
if ((Test-Path $registry) -or (Test-Path $desktop) -or (Test-Path (Join-Path $startMenu 'ChemoDose.lnk'))) { throw 'Uninstall entry or shortcut remained' }
if ((Get-Content (Join-Path $preferences 'language.json') | ConvertFrom-Json).language -ne 'zh-Hant' -or (Get-Content (Join-Path $preferences 'legacy-language.txt')).Trim() -ne 'zh-Hant') { throw 'Uninstaller removed language preferences' }
$checks += @{operation='uninstall';passed=$true;unrelatedFileRetained=$true;languagePreferencesRetained=$true}
@{passed=$true;version='2.0.3';host=[Environment]::OSVersion.VersionString;checks=$checks;xpWindows7DeviceTest='pending';note='Native hosted Windows tests; not old-system device or clinical validation.'} | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 build/verification/windows-installer-native.json
$record=Get-Content build/release/windows-installer-build.json | ConvertFrom-Json
$record.nativeInstallUpgradeUninstall='passed on GitHub-hosted Windows'
$record | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 build/release/windows-installer-build.json
