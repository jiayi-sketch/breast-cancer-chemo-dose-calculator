#!/usr/bin/env python3
# SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
"""Build offline preview installers, without Gradle or third-party UI runtimes."""
import argparse
import hashlib
import os
from pathlib import Path
import plistlib
import secrets
import shutil
import struct
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = '0.2.2'

def run(*args):
    print('+', ' '.join(str(a) for a in args), flush=True)
    subprocess.run([str(a) for a in args], check=True, cwd=ROOT)

def copy_web(target):
    target.mkdir(parents=True, exist_ok=True)
    for name in ('index.html', 'catalogue.css', 'catalogue-ui.js', 'catalogue.browser.js',
                 'catalogue-engine.browser.js', 'manual.html', 'styles.css', 'app.js', 'core.browser.js'):
        shutil.copyfile(ROOT / 'apps/shared-web' / name, target / name)

def macos(args):
    # Keep the signed bundle outside cloud-synced folders, where File Provider
    # can restore Finder metadata between attribute cleanup and codesign.
    with tempfile.TemporaryDirectory(prefix='chemodose-dmg-') as staging:
        return macos_in_stage(args, Path(staging))

def macos_in_stage(args, stage):
    build = args.work / 'macos'
    build.mkdir(parents=True, exist_ok=True)
    app = stage / '乳腺癌剂量计算.app'
    contents = app / 'Contents'
    binary = contents / 'MacOS/ChemoDose'
    binary.parent.mkdir(parents=True, exist_ok=True)
    resources = contents / 'Resources'
    copy_web(resources / 'web')
    (resources / 'LICENSE.txt').write_bytes((ROOT / 'LICENSE').read_bytes())
    info = {
        'CFBundleDevelopmentRegion': 'zh_CN',
        'CFBundleDisplayName': '乳腺癌剂量计算',
        'CFBundleName': '乳腺癌剂量计算',
        'CFBundleExecutable': 'ChemoDose',
        'CFBundleIdentifier': 'org.chemodose.preview',
        'CFBundlePackageType': 'APPL',
        'CFBundleShortVersionString': VERSION,
        'CFBundleVersion': '4',
        'CFBundleIconFile': 'AppIcon',
        'LSMinimumSystemVersion': '13.0',
        'NSHighResolutionCapable': True,
        'NSHumanReadableCopyright': '版权所有 GitHub @jiayi-sketch；仅限于学术交流，严禁商业用途。',
    }
    with (contents / 'Info.plist').open('wb') as f:
        plistlib.dump(info, f)
    cache = build / 'module-cache'
    cache.mkdir(exist_ok=True)
    run('xcrun', 'swiftc', '-O', '-target', 'arm64-apple-macos13.0',
        '-module-cache-path', cache, '-framework', 'Cocoa', '-framework', 'WebKit',
        ROOT / 'apps/macos/main.swift', '-o', binary)
    icon_tool = build / 'draw-icon'
    run('xcrun', 'swiftc', '-module-cache-path', cache,
        ROOT / 'scripts/draw-icon.swift', '-o', icon_tool)
    iconset = build / 'AppIcon.iconset'
    iconset.mkdir(exist_ok=True)
    run(icon_tool, iconset)
    # ICNS supports PNG payloads; writing these chunks avoids an iconutil dependency.
    chunks = []
    for code, name in [('icp4', 'icon_16x16.png'), ('icp5', 'icon_32x32.png'),
                       ('icp6', 'icon_32x32@2x.png'), ('ic07', 'icon_128x128.png'),
                       ('ic08', 'icon_256x256.png'), ('ic09', 'icon_512x512.png'),
                       ('ic10', 'icon_512x512@2x.png')]:
        data = (iconset / name).read_bytes()
        chunks.append(code.encode('ascii') + struct.pack('>I', len(data) + 8) + data)
    body = b''.join(chunks)
    (resources / 'AppIcon.icns').write_bytes(b'icns' + struct.pack('>I', len(body) + 8) + body)
    # Finder/File Provider metadata on this generated bundle can prevent signing.
    # Remove only resource/Finder metadata, leaving security attributes intact.
    for path in [app, *app.rglob('*')]:
        attributes = subprocess.check_output(['xattr', str(path)], text=True).splitlines()
        for attribute in ('com.apple.FinderInfo', 'com.apple.ResourceFork'):
            if attribute in attributes:
                run('xattr', '-d', attribute, path)
    run('codesign', '--force', '--deep', '--sign', '-', '--options', 'runtime', '--timestamp=none', app)
    run('codesign', '--verify', '--deep', '--strict', '--verbose=2', app)
    applications = stage / 'Applications'
    if not applications.is_symlink():
        applications.symlink_to('/Applications', target_is_directory=True)
    (stage / '安装说明.txt').write_text(
        '乳腺癌剂量计算 0.2.2 内置方案测试版\n\n'
        '适用于 Apple 芯片 Mac，macOS 13 或更新版本。\n'
        '将应用拖入 Applications。此包只有本地 ad-hoc 签名，未获得 Apple Developer ID 签名和公证。\n'
        '如系统阻止打开，请在系统设置 → 隐私与安全性中查看此应用的打开选项。请勿关闭系统安全功能。\n\n'
        '已恢复内置方案选择：52个方案、7个单药剂量参考及18张指南摘要卡。\n'
        '依据用户提供的2026 CSCO扫描指南录入，每项附PDF页码及书页。\n'
        '先选择方案，再输入参数，由医生或药师核对后计算整套方案。\n'
        '尚未经独立临床验证；报告匹配未接入，不自动推荐方案或调整剂量。\n'
        '仅限于学术交流，严禁商业用途\n版权所有 GitHub @jiayi-sketch\n对应源码与非商业学术授权见随包 LICENSE.txt。\n', encoding='utf-8')
    dmg = args.output / f'ChemoDose-{VERSION}-macos-arm64.dmg'
    # Build HFS+ entirely in userspace, then compress to a normal UDZO disk image.
    # This avoids requiring a mounted virtual disk during packaging.
    hybrid = build / 'preview-hfs.dmg'
    run('hdiutil', 'makehybrid', '-hfs', '-hfs-volume-name', 'ChemoDose Preview',
        '-o', hybrid, stage, '-ov')
    run('hdiutil', 'convert', hybrid, '-format', 'UDZO', '-o', dmg, '-ov')
    run('hdiutil', 'verify', dmg)
    return dmg

def android(args):
    if not args.sdk:
        raise SystemExit('Android build needs --sdk or ANDROID_HOME')
    sdk = args.sdk
    tools = sdk / 'build-tools/35.0.0'
    platform = sdk / 'platforms/android-35/android.jar'
    java_home = args.java_home
    java = java_home / 'bin/java' if java_home else Path(shutil.which('java') or 'java')
    javac = java_home / 'bin/javac' if java_home else Path(shutil.which('javac') or 'javac')
    keytool = java_home / 'bin/keytool' if java_home else Path(shutil.which('keytool') or 'keytool')
    build = args.work / 'android'
    build.mkdir(parents=True, exist_ok=True)
    assets = build / 'assets'
    copy_web(assets / 'web')
    (assets / 'LICENSE.txt').write_bytes((ROOT / 'LICENSE').read_bytes())
    compiled = build / 'resources.zip'
    run(tools / 'aapt2', 'compile', '--dir', ROOT / 'apps/android/res', '-o', compiled)
    unsigned = build / 'unsigned.apk'
    run(tools / 'aapt2', 'link', '-o', unsigned, '--manifest', ROOT / 'apps/android/AndroidManifest.xml',
        '-I', platform, '-A', assets, compiled)
    classes = build / 'classes'
    dex = build / 'dex'
    classes.mkdir(exist_ok=True)
    dex.mkdir(exist_ok=True)
    for stale in [*classes.rglob('*.class'), *dex.glob('*.dex')]:
        stale.unlink()
    sources = sorted((ROOT / 'apps/android/src').rglob('*.java'))
    run(javac, '-encoding', 'UTF-8', '-source', '8', '-target', '8',
        '-bootclasspath', platform, '-d', classes, *sources)
    run(java, '-cp', tools / 'lib/d8.jar', 'com.android.tools.r8.D8', '--lib', platform,
        '--min-api', '28', '--output', dex, *sorted(classes.rglob('*.class')))
    with zipfile.ZipFile(unsigned, 'a', compression=zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(dex.glob('*.dex')):
            archive.write(file, file.name)
    aligned = build / 'aligned.apk'
    run(tools / 'zipalign', '-f', '-p', '4', unsigned, aligned)
    signing = args.work / 'signing'
    signing.mkdir(exist_ok=True, mode=0o700)
    key = signing / 'preview.jks'
    password = signing / 'password.txt'
    if not key.exists():
        if not password.exists():
            fd = os.open(password, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'w') as f:
                f.write(secrets.token_urlsafe(32))
        run(keytool, '-genkeypair', '-keystore', key, '-storepass:file', password,
            '-keypass:file', password, '-alias', 'preview', '-keyalg', 'RSA', '-keysize', '3072',
            '-validity', '3650', '-dname', 'CN=ChemoDose Preview, OU=Development, O=ChemoDose')
        key.chmod(0o600)
    if not password.exists():
        raise SystemExit('Existing preview key has no password file; restore it before signing.')
    apk = args.output / f'ChemoDose-{VERSION}-android.apk'
    run(java, '-jar', tools / 'lib/apksigner.jar', 'sign', '--ks', key,
        '--ks-pass', 'file:' + str(password), '--ks-key-alias', 'preview',
        '--v4-signing-enabled', 'false', '--out', apk, aligned)
    run(tools / 'zipalign', '-c', '-p', '4', apk)
    run(java, '-jar', tools / 'lib/apksigner.jar', 'verify', '--verbose', '--print-certs', apk)
    run(tools / 'aapt', 'dump', 'badging', apk)
    return apk

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--platform', choices=['all', 'android', 'macos'], default='all')
    parser.add_argument('--node', default=shutil.which('node') or 'node')
    parser.add_argument('--sdk', type=Path, default=os.environ.get('ANDROID_HOME'))
    parser.add_argument('--java-home', type=Path, default=os.environ.get('JAVA_HOME'))
    parser.add_argument('--work', type=Path, default=ROOT / 'build')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    args.work = args.work.resolve()
    args.output = args.output.resolve()
    args.work.mkdir(parents=True, exist_ok=True)
    args.output.mkdir(parents=True, exist_ok=True)
    run(args.node, ROOT / 'scripts/build-web.mjs')
    artifacts = []
    if args.platform in ('all', 'android'):
        artifacts.append(android(args))
    if args.platform in ('all', 'macos'):
        artifacts.append(macos(args))
    for artifact in artifacts:
        print(hashlib.sha256(artifact.read_bytes()).hexdigest(), artifact.name)

if __name__ == '__main__':
    main()
