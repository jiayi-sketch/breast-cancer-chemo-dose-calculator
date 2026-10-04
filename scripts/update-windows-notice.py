#!/usr/bin/env python3
# SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
"""Update only the author's existing notice in a copy of the original EXE.

This statically edits one Python 3.8 marshal string; it never runs the EXE.
The original bootloader, other modules and third-party runtimes are preserved.
"""
import argparse
import hashlib
import json
import marshal
from pathlib import Path
import struct
import zlib

MAGIC = b'MEI\014\013\012\013\016'
COOKIE = struct.Struct('!8sIIII64s')
OLD = '软件仅限学术交流内部使用。\n软件签名：赵家一'
NEW = '仅限于学术交流，严禁商业用途\n版权所有 GitHub @jiayi-sketch'

def read_archive(data):
    end = data.rfind(MAGIC)
    cookie = COOKIE.unpack(data[end:end + COOKIE.size])
    assert end + COOKIE.size == len(data), 'Unexpected trailing data'
    start = len(data) - cookie[1]
    toc = data[start + cookie[2]:start + cookie[2] + cookie[3]]
    entries, pos = [], 0
    while pos < len(toc):
        size, offset, packed, unpacked, compressed, kind = struct.unpack('!IIIIBc', toc[pos:pos + 18])
        name_bytes = toc[pos + 18:pos + size]
        name = name_bytes.split(b'\0')[0].decode('utf-8')
        blob = data[start + offset:start + offset + packed]
        entries.append((name, size, offset, packed, unpacked, compressed, kind, name_bytes, blob))
        pos += size
    assert pos == len(toc)
    return start, cookie, entries

def patch_pyz(pyz):
    assert pyz[:4] == b'PYZ\0'
    toc_offset = struct.unpack('!I', pyz[8:12])[0]
    table = marshal.loads(pyz[toc_offset:])
    assert isinstance(table, list)
    modules = dict(table)
    kind, offset, length = modules['app']
    original = zlib.decompress(pyz[offset:offset + length])
    old = OLD.encode('utf-8'); new = NEW.encode('utf-8')
    assert original.count(old) == 1
    at = original.index(old)
    assert original[at - 5] & 0x7f == ord('u')
    assert struct.unpack('<I', original[at - 4:at])[0] == len(old)
    patched = original[:at - 4] + struct.pack('<I', len(new)) + new + original[at + len(old):]
    # Reverse substitution proves every other byte in this code object is intact.
    assert patched[:at - 4] + struct.pack('<I', len(old)) + old + patched[at + len(new):] == original
    payload = bytearray(pyz[:12]); previous = 12; updated = {}
    for name, (entry_kind, entry_offset, entry_size) in sorted(table, key=lambda item: item[1][1]):
        assert entry_offset >= previous
        payload.extend(pyz[previous:entry_offset])
        content = pyz[entry_offset:entry_offset + entry_size]
        if name == 'app': content = zlib.compress(patched, 9)
        updated[name] = (entry_kind, len(payload), len(content))
        payload.extend(content); previous = entry_offset + entry_size
    payload.extend(pyz[previous:toc_offset])
    new_toc_offset = len(payload)
    payload.extend(marshal.dumps([(name, updated[name]) for name, _ in table], 2))
    struct.pack_into('!I', payload, 8, new_toc_offset)
    # Independently decompress every module after rewriting the offsets.
    for name, (entry_kind, entry_offset, entry_size) in table:
        new_kind, new_offset, new_size = updated[name]
        assert new_kind == entry_kind
        before = zlib.decompress(pyz[entry_offset:entry_offset + entry_size])
        after = zlib.decompress(payload[new_offset:new_offset + new_size])
        assert after == (patched if name == 'app' else before), name
    return bytes(payload), original, patched, len(table)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('original', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--verification-dir', type=Path, required=True)
    args = parser.parse_args()
    assert args.original.resolve() != args.output.resolve()
    data = args.original.read_bytes()
    # Reject Authenticode-signed files rather than silently invalidating a signature.
    pe = struct.unpack_from('<I', data, 60)[0]
    assert data[pe:pe + 4] == b'PE\0\0'
    assert struct.unpack_from('<H', data, pe + 24)[0] == 0x10b
    assert struct.unpack_from('<II', data, pe + 24 + 96 + 8 * 4) == (0, 0)
    start, cookie, entries = read_archive(data)
    payload = bytearray(); records = []; previous = 0; changed = 0
    for name, size, offset, packed, unpacked, compressed, kind, name_bytes, blob in entries:
        assert offset >= previous
        payload.extend(data[start + previous:start + offset])
        if name == 'PYZ-00.pyz':
            pyz = zlib.decompress(blob) if compressed else blob
            updated, raw_before, raw_after, module_count = patch_pyz(pyz)
            unpacked = len(updated)
            blob = zlib.compress(updated, 9) if compressed else updated
            changed += 1
        records.append(struct.pack('!IIIIBc', size, len(payload), len(blob), unpacked, compressed, kind) + name_bytes)
        payload.extend(blob); previous = offset + packed
    assert changed == 1
    payload.extend(data[start + previous:start + cookie[2]])
    toc_offset = len(payload); toc = b''.join(records); payload.extend(toc)
    payload.extend(COOKIE.pack(MAGIC, len(payload) + COOKIE.size, toc_offset, len(toc), cookie[4], cookie[5]))
    result = data[:start] + payload
    new_start, _, after_entries = read_archive(result)
    assert result[:new_start] == data[:start], 'Bootloader changed'
    for before, after in zip(entries, after_entries):
        assert before[0] == after[0]
        if before[0] != 'PYZ-00.pyz': assert before[8] == after[8], before[0]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(result)
    args.verification_dir.mkdir(parents=True, exist_ok=True)
    # These bytecode files are for static cross-version parsing, not execution.
    header = pyz[4:8] + b'\0' * 12
    (args.verification_dir / 'notice-before.pyc').write_bytes(header + raw_before)
    (args.verification_dir / 'notice-after.pyc').write_bytes(header + raw_after)
    report = {'originalSha256': hashlib.sha256(data).hexdigest(),
              'outputSha256': hashlib.sha256(result).hexdigest(),
              'archiveEntriesChecked': len(entries), 'pyzModulesChecked': module_count,
              'onlyChangedModule': 'app', 'onlyChangedConstant': NEW,
              'bootloaderUnchanged': True, 'windowsRuntimeTested': False}
    (args.verification_dir / 'windows-notice-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
