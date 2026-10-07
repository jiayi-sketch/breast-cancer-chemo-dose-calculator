#!/usr/bin/env python3
# SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
"""Bundle already built Windows editions into a net40 x86 auto-selecting EXE.

No downloads, SDK installation, executable launch, or clinical data changes.
"""
import argparse
import gzip
import hashlib
import json
import pathlib
import struct
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]


def pe_machine(path):
    with path.open('rb') as stream:
        if stream.read(2) != b'MZ':
            raise ValueError(f'Not a PE file: {path}')
        stream.seek(0x3c)
        offset = struct.unpack('<I', stream.read(4))[0]
        stream.seek(offset)
        if stream.read(4) != b'PE\0\0':
            raise ValueError(f'Not a PE file: {path}')
        return struct.unpack('<H', stream.read(2))[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dotnet', type=pathlib.Path, required=True)
    parser.add_argument('--references', type=pathlib.Path, required=True, help='net40 reference DLL directory')
    parser.add_argument('--modern', type=pathlib.Path, required=True, help='built/tested win-x64 EXE')
    parser.add_argument('--legacy', type=pathlib.Path, required=True, help='built net40 x86 EXE')
    parser.add_argument('--legacy-config', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    version = json.loads((ROOT / 'apps/windows/version.json').read_text())['version']
    if version != '2.0.3':
        raise SystemExit('Update launcher assembly versions before changing the application version.')
    if pe_machine(args.modern) != 0x8664 or pe_machine(args.legacy) != 0x14c:
        raise SystemExit('Expected a native x64 modern EXE and x86 legacy EXE.')
    if b'version="v4.0"' not in args.legacy_config.read_bytes():
        raise SystemExit('Expected a CLR4 legacy configuration.')
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    work = output / 'unified-build'
    work.mkdir(exist_ok=True)
    specs = []
    for name, path, edition in [
        ('modern.exe', args.modern, 'Modern'),
        ('legacy.exe', args.legacy, 'Legacy'),
        ('legacy.exe.config', args.legacy_config, 'Legacy'),
        ('LICENSE.txt', ROOT / 'LICENSE', 'All'),
        ('WINDOWS-UNIFIED.md', ROOT / 'docs/windows-unified.md', 'All'),
    ]:
        data = path.read_bytes()
        resource = 'bundle.' + name + '.gz'
        compressed = work / resource
        compressed.write_bytes(gzip.compress(data, compresslevel=9, mtime=0))
        specs.append({'name': name, 'edition': edition, 'resource': resource,
                      'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    bundle_id = hashlib.sha256(json.dumps(specs, sort_keys=True).encode()).hexdigest()[:24]
    code = ['using System.IO; using System.Reflection; namespace ChemoDose.Unified { static class Bundle {',
            f'public const string Version="{version}"; public const string Id="{bundle_id}";',
            'public static string Prepare(Edition edition,string directory) {',
            'var assembly=Assembly.GetExecutingAssembly();']
    for spec in specs:
        statement = (f'PayloadStore.Extract(assembly,"{spec["resource"]}",Path.Combine(directory,"{spec["name"]}"),'
                     f'{spec["size"]}L,"{spec["sha256"]}");')
        code.append(statement if spec['edition'] == 'All' else f'if(edition==Edition.{spec["edition"]}) {statement}')
    code += ['return Path.Combine(directory,edition==Edition.Modern?"modern.exe":"legacy.exe");', '}}}']
    generated = work / 'Bundle.cs'
    generated.write_text('\n'.join(code) + '\n')
    compiler = args.dotnet.resolve().parent / 'sdk/10.0.401/Roslyn/bincore/csc.dll'
    if not compiler.is_file():
        raise SystemExit('Use the pinned .NET SDK 10.0.401 compiler.')
    exe = output / f'ChemoDose-{version}-windows-unified.exe'
    command = [str(args.dotnet.resolve()), str(compiler), '/nologo', '/noconfig', '/nostdlib+',
               '/target:winexe', '/platform:x86', '/subsystemversion:5.01', '/optimize+', '/langversion:5',
               '/deterministic+', f'/out:{exe}', f'/win32manifest:{ROOT / "apps/windows-legacy/app.manifest"}']
    command += [f'/reference:{args.references.resolve() / (name + ".dll")}'
                for name in ['mscorlib', 'System', 'System.Core', 'System.Windows.Forms']]
    command += [f'/resource:{work / spec["resource"]},{spec["resource"]}' for spec in specs]
    command += [str(path) for path in sorted((ROOT / 'apps/windows-unified').glob('*.cs'))] + [str(generated)]
    subprocess.run(command, cwd=ROOT, check=True)
    record = {'version': version, 'launcher': 'x86 CLR4 Windows GUI 5.01', 'bundleId': bundle_id,
              'payloads': specs, 'exeSha256': hashlib.sha256(exe.read_bytes()).hexdigest(),
              'nativeWindowsRuntimeTest': 'pending', 'xpWindows7RuntimeTest': 'pending'}
    (output / 'windows-unified-build.json').write_text(json.dumps(record, indent=2) + '\n')
    print(exe)


if __name__ == '__main__':
    main()
