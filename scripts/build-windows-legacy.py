#!/usr/bin/env python3
# SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
"""Build x86 CLR4 WinForms EXE; dependencies must be supplied, never downloaded silently."""
import argparse, hashlib, json, os, pathlib, subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--dotnet',required=True,type=pathlib.Path)
p.add_argument('--references',required=True,type=pathlib.Path,help='net40 package build/.NETFramework/v4.0 directory')
p.add_argument('--jint',required=True,type=pathlib.Path,help='Jint 2.11.58 lib/net40/Jint.dll')
p.add_argument('--node',required=True,type=pathlib.Path)
p.add_argument('--typescript',required=True,type=pathlib.Path)
p.add_argument('--output',required=True,type=pathlib.Path)
a=p.parse_args()
version=json.loads((ROOT/'apps/windows/version.json').read_text())['version']
if version!='2.0.3': raise SystemExit('Update legacy assembly version attributes before building a new version.')
subprocess.run([str(a.node),'scripts/build-web.mjs'],cwd=ROOT,check=True)
env=dict(os.environ,TYPESCRIPT_MODULE=str(a.typescript.resolve()))
subprocess.run([str(a.node),'scripts/build-legacy-engine.mjs'],cwd=ROOT,env=env,check=True)
a.output.mkdir(parents=True,exist_ok=True)
exe=a.output/f'ChemoDose-{version}-windows-x86-legacy.exe'
sdk=a.dotnet.resolve().parent/'sdk'
compilers=sorted(sdk.glob('*/Roslyn/bincore/csc.dll'),key=lambda p:tuple(int(v) for v in p.parents[2].name.split('.') if v.isdigit()))
if not compilers: raise SystemExit('No SDK compiler found.')
refs=['mscorlib','System','System.Core','System.Drawing','System.Windows.Forms','System.Web.Extensions','Microsoft.CSharp']
cmd=[str(a.dotnet.resolve()),str(compilers[-1]),'/nologo','/noconfig','/nostdlib+','/target:winexe','/platform:x86','/subsystemversion:5.01','/optimize+','/langversion:5',f'/out:{exe.resolve()}',f'/win32manifest:{ROOT/"apps/windows-legacy/app.manifest"}']
cmd += [f'/reference:{a.references.resolve()/(r+".dll")}' for r in refs]
cmd += [f'/reference:{a.jint.resolve()}',f'/resource:{a.jint.resolve()},Jint.dll',f'/resource:{ROOT/"apps/windows-legacy/engine.es5.js"},engine.js',f'/resource:{ROOT/"LICENSE"},LICENSE.txt',f'/resource:{ROOT/"apps/windows-legacy/licenses/Jint-LICENSE.txt"},Jint-LICENSE.txt',str(ROOT/'apps/windows-legacy/EngineBridge.cs'),str(ROOT/'apps/windows-legacy/Program.cs'),str(ROOT/'apps/windows-common/FramelessWindow.cs')]
subprocess.run(cmd,cwd=ROOT,check=True)
(exe.with_suffix('.exe.config')).write_text('<?xml version="1.0" encoding="utf-8"?>\n<configuration><startup><supportedRuntime version="v4.0" sku=".NETFramework,Version=v4.0"/></startup></configuration>\n')
record={'version':version,'target':'x86 .NET Framework 4.0','subsystem':'Windows GUI 5.01','guiOnWindows7andXP':'not-tested','inputs':{str(v.name):hashlib.sha256(v.read_bytes()).hexdigest() for v in [a.jint,a.references/'mscorlib.dll']},'exeSha256':hashlib.sha256(exe.read_bytes()).hexdigest()}
(a.output/'windows-legacy-build.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(exe)
