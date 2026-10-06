#!/usr/bin/env python3
# SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
"""Compile a per-user NSIS setup around the tested unified Windows EXE."""
import argparse, hashlib, json, pathlib, struct, subprocess
ROOT = pathlib.Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--makensis', type=pathlib.Path, required=True)
p.add_argument('--unified', type=pathlib.Path, required=True)
p.add_argument('--output', type=pathlib.Path, required=True)
a = p.parse_args()
version = json.loads((ROOT/'apps/windows/version.json').read_text())['version']
compiler = subprocess.check_output([str(a.makensis.resolve()), '/VERSION'], text=True).strip()
if compiler != 'v3.13': raise SystemExit('Use pinned official NSIS v3.13.')
a.output.mkdir(parents=True, exist_ok=True)
setup = a.output.resolve()/f'ChemoDose-{version}-windows-setup.exe'
license_file=a.output.resolve()/'installer-license-utf8.txt'
license_file.write_text((ROOT/'LICENSE').read_text(),encoding='utf-8-sig')
subprocess.run([str(a.makensis.resolve()), '/V3', f'/DVERSION={version}',
               f'/DPAYLOAD={a.unified.resolve()}', f'/DLICENCE={license_file}',
               f'/DDOCUMENTATION={ROOT/"docs/windows-installation.md"}', f'/DOUTPUT={setup}',
               str(ROOT/'apps/windows-installer/ChemoDose.nsi')], check=True)
license_file.unlink()
data = setup.read_bytes()
offset = struct.unpack_from('<I',data,0x3c)[0]
if data[:2]!=b'MZ' or data[offset:offset+4]!=b'PE\0\0' or struct.unpack_from('<H',data,offset+4)[0]!=0x14c:
    raise SystemExit('Expected native x86 installer.')
subsystem = struct.unpack_from('<HH',data,offset+24+48)
if subsystem > (5,1): raise SystemExit('Installer PE baseline exceeds XP.')
record = {'version':version,'compiler':compiler,'architecture':'native x86 Unicode',
          'subsystemVersion':'.'.join(map(str,subsystem)), 'installMode':'current user',
          'payloadSha256':hashlib.sha256(a.unified.read_bytes()).hexdigest(),
          'setupSha256':hashlib.sha256(data).hexdigest(), 'nativeInstallUpgradeUninstall':'pending',
          'xpWindows7DeviceTest':'pending'}
(a.output/'windows-installer-build.json').write_text(json.dumps(record,indent=2)+'\n')
print(setup)
