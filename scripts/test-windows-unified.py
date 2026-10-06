#!/usr/bin/env python3
"""Compile the portable launcher tests using the pinned SDK, without restore."""
import argparse
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--dotnet', type=pathlib.Path, required=True)
p.add_argument('--output', type=pathlib.Path, required=True)
p.add_argument('--exe', type=pathlib.Path, required=True)
p.add_argument('--manifest', type=pathlib.Path, required=True)
a = p.parse_args()
sdk = a.dotnet.resolve().parent
refs = sdk / 'packs/Microsoft.NETCore.App.Ref/10.0.12/ref/net10.0'
out = a.output.resolve()
out.mkdir(parents=True, exist_ok=True)
dll = out / 'UnifiedHarness.dll'
cmd = [str(a.dotnet.resolve()), str(sdk / 'sdk/10.0.401/Roslyn/bincore/csc.dll'),
       '/nologo', '/noconfig', '/nostdlib+', '/target:exe', f'/out:{dll}']
cmd += [f'/reference:{ref}' for ref in sorted(refs.glob('*.dll'))]
cmd += [str(ROOT / f) for f in ['tests/windows-unified/Harness.cs',
        'apps/windows-unified/LaunchPolicy.cs', 'apps/windows-unified/PayloadStore.cs']]
subprocess.run(cmd, check=True)
(out / 'UnifiedHarness.runtimeconfig.json').write_text(json.dumps({
    'runtimeOptions': {'tfm': 'net10.0', 'framework': {'name': 'Microsoft.NETCore.App', 'version': '10.0.12'}}
}))
result = subprocess.run([str(a.dotnet.resolve()), str(dll), str(a.exe.resolve()), str(a.manifest.resolve())],
                        check=True, capture_output=True, text=True)
report = json.loads(result.stdout)
(out / 'windows-unified-portable-tests.json').write_text(json.dumps(report, indent=2) + '\n')
print(result.stdout, end='')
