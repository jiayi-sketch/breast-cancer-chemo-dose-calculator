#!/usr/bin/env python3
# SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
"""Reproducible transcription overlay; see docs/guideline-review.md for evidence.

The historical input is parsed by the AST allowlist, never executed/imported.
The output has transcription provenance, NOT a clinical approval assertion.
"""
import copy
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as work:
    recovered = Path(work) / 'historical.json'
    subprocess.run([sys.executable, str(ROOT / 'scripts/recover-catalogue.py'), str(recovered)], check=True)
    original = json.loads(recovered.read_text())
regimens = copy.deepcopy(original['REGIMENS'])

def item(n):
    return regimens[n - 1]

# PDF 51 / book 34 and recommendation table PDF 48 / book 31.
for n in (1, 2, 3, 4):
    for d in item(n)['drugs']:
        d['duration'] = '共6周期' if n <= 2 else '共6周期（推荐表 THP×6）'
# PDF 52 / book 35: H and P start with the taxane, after AC.
for n in (7, 8):
    for d in item(n)['drugs'][3:]:
        d.update(schedule='序贯阶段d1，每21天', duration='共4周期')
# PDF 71–72: both antibodies continue for one year.
for n in (23, 24, 25):
    item(n)['drugs'][-1]['duration'] = '完成1年'

item(17)['name'] = 'AC → TP（紫杉醇+卡铂）'
item(18)['pages'] = '56、59、60'
# PDF 59–60 has two PD-1 rows across the phase break. They are not additive.
for n in (18, 19):
    r = item(n)
    r['drugs'][2]['duration'] = '随第一阶段；术后衔接见 PDF62'
    second = copy.deepcopy(r['drugs'][2])
    second.update(schedule='序贯阶段d1，每21天' if n == 18 else '序贯阶段d1，每14天',
                  duration='随第二阶段；术后衔接见 PDF62',
                  note='本行是序贯第二阶段的继续用药，不与第一阶段重复叠加。')
    r['drugs'].append(second)
    r['notes'] += ' 两个阶段均含同一免疫药物；给药间隔按各行，不将各阶段剂量相加。'

# Complete alternatives explicitly printed in the reviewed dose tables.
extra = copy.deepcopy(item(17))
extra['name'] = 'AC → TP（白蛋白紫杉醇+卡铂）'
extra['drugs'][2].update(name='白蛋白紫杉醇', dose=125, schedule='序贯d1、d8，每21天', duration='共4周期')
regimens.append(extra)  # r047, PDF59
extra = copy.deepcopy(item(46))
extra.update(subtype='三阴性', pages='75、82', level='III级推荐 [2B]（相应风险分层）',
             eligibility='三阴性术后辅助治疗；推荐分层见 PDF75。')
regimens.append(extra)  # r048
for subtype, pages in [('三阴性', '75、82'), ('激素受体阳性', '82、83')]:
    regimens.append(dict(section='术后辅助治疗', subtype=subtype, name='FEC → T',
        level='III级推荐 [2B]（相应风险分层）', pages=pages,
        eligibility='是否采用化疗及所选方案须结合对应风险分层。', notes='FEC与多西他赛为前后序贯阶段。',
        drugs=[dict(name=name, kind=kind, dose=dose, schedule=schedule, duration='共3周期', note='')
               for name, kind, dose, schedule in [
                   ('氟尿嘧啶', 'bsa', 500, 'd1，每21天'),
                   ('表柔比星', 'bsa', 100, 'd1，每21天'),
                   ('环磷酰胺', 'bsa', 500, 'd1，每21天'),
                   ('多西他赛', 'bsa_range', [80, 100], '序贯d1，每21天')]]))
for subtype, pages in [('三阴性', '75、80、81'), ('激素受体阳性', '80、81、83')]:
    extra = copy.deepcopy(item(31))
    extra.update(subtype=subtype, name='密集AC → T（紫杉醇周疗）', pages=pages,
                 level='剂量表列示；推荐须结合风险分层')
    for d in extra['drugs'][:2]:
        d['schedule'] = 'd1，每14天'
    regimens.append(extra)

# Source pages for actual numeric rows, not just recommendation summary pages.
dose_pages = {
    **{n: [51] for n in range(1, 6)}, **{n: [52] for n in (6, 7, 8)},
    **{n: [57] for n in (9, 10, 11, 20, 21)},
    **{n: [58] for n in (12, 13, 14, 15, 16, 22)}, 17: [59], 18: [59, 60], 19: [60],
    23: [71], 24: [72], 25: [72], 26: [72, 73], 27: [73], 28: [73],
    29: [79], 30: [79], 31: [80], 32: [80], 33: [81], 34: [81],
    35: [74], 36: [74], 37: [74], 38: [81], 39: [81], 40: [79], 41: [80],
    42: [80], 43: [81], 44: [81], 45: [81], 46: [82], 47: [59], 48: [82],
    49: [82], 50: [82], 51: [80, 81], 52: [80, 81],
}
for n, r in enumerate(regimens, 1):
    r.update(id=f'r{n:03}', entryType='regimen', legacyIndex=n if n <= 46 else None)
    r['sourcePdfPages'] = sorted(set(map(int, re.findall(r'\d+', r.pop('pages')))))
    r['dosePdfPages'] = dose_pages[n]
    for j, d in enumerate(r['drugs']):
        phase = 1
        if '→' in r['name']:
            cut = 3 if n in (5, 18, 19, 49, 50) else (1 if n == 6 else 2)
            phase = 1 if j < cut else 2
        d['phase'] = phase
        d['phaseLabel'] = ('术前 TH + 吡咯替尼' if phase == 1 else '手术后 FEC') if n == 5 else (
            '第一阶段' if phase == 1 else '第二阶段（序贯）')
        if '→' not in r['name']:
            d['phaseLabel'] = '同一治疗阶段（疗程分别见各药）'
        d['sourcePdfPages'] = dose_pages[n]
        if n in (18, 26, 51, 52):
            d['sourcePdfPages'] = [dose_pages[n][0 if phase == 1 else -1]]
        d['id'] = f'{r["id"]}-d{j + 1:02}'
        if d['kind'] == 'bsa_range' and d['dose'][0] == d['dose'][1]:
            d['kind'], d['dose'] = 'bsa', d['dose'][0]
        # The two non-cytotoxic phases have explicit combination labels above.
        d['note'] = d.get('note', '')

for j, d in enumerate(copy.deepcopy(original['FIXED_ORAL_DOSES']), 53):
    if d['name'] in ('瑞波西利', '达尔西利'):
        d['schedule'] = '每日一次，d1–d21；每28天（停药7天）'
    if d['kind'] == 'fixed_alt':
        d['schedules'] = ['10 mg，每日2次', '20 mg，每日1次']
    d.update(id=f'r{j:03}-d01', phase=1, phaseLabel='单药剂量参考', sourcePdfPages=[86])
    regimens.append(dict(id=f'r{j:03}', entryType='single-drug-reference', legacyIndex=None,
        section='后续内分泌治疗', subtype='常用剂量', name=d['name'] + '（单药剂量参考）',
        level='剂量注释；须结合绝经状态及联合治疗路径', sourcePdfPages=[86, 87, 90, 91], dosePdfPages=[86],
        eligibility='单药剂量条目不代表单药治疗推荐。联合药物、OFS及用药条件请核对本栏目推荐摘要。',
        notes='数值为每次给药剂量；每日2次的剂量不合并。AI/TAM疗程及后续强化按所选内分泌路径。', drugs=[d]))

cards = copy.deepcopy(original['REFERENCE_CARDS'])
for n, c in enumerate(cards, 1):
    c.update(id=f'c{n:03}', entryType='reference', name=c.pop('title'))
    c['sourcePdfPages'] = sorted(set(map(int, re.findall(r'\d+', c.pop('pages')))))
    if '新辅助后术后衔接' == c['name']:
        c['body'] += '\n上述适应证表述反映指南出版时的状态，不能据此判断当前获批情况。'
    if c['name'] == '绝经前初始辅助内分泌':
        c['body'] = c['body'].replace('低复发风险：I级 TAM。', '低复发风险：I级 TAM；II级 OFS+TAM。')
    if c['name'] == '新辅助全身治疗后的放疗':
        c['body'] = c['body'].replace('cN0、ypN0保乳：I级全乳放疗；II级全乳+瘤床加量。',
            'cN0、ypN0保乳：I级全乳放疗 [1A] 或全乳+瘤床加量 [2A]。')
    if c['name'] == '口服内分泌/靶向常用剂量':
        c['body'] = c['body'].replace('400mg，d1-21/28天', '400mg每日一次，d1-21/28天').replace('125mg，d1-21/28天', '125mg每日一次，d1-21/28天')
    c['body'] += '\n本卡为指南摘要；需连同原页分层条件和注释阅读。'

for r in regimens + cards:
    r['sourceBookPages'] = [p - 17 for p in r['sourcePdfPages']]
    r['transcriptionStatus'] = 'checked-against-supplied-scan'
    r['clinicalReview'] = 'pending'
    for d in r.get('drugs', []):
        d['sourceBookPages'] = [p - 17 for p in d['sourcePdfPages']]

catalogue = dict(schemaVersion=1, version='2026.10.02', appVersion=json.loads((ROOT / 'package.json').read_text())['version'],
    title='2026 CSCO乳腺癌诊疗指南 · 内置方案',
    source=dict(title='2026 CSCO乳腺癌诊疗指南', edition='2026', pages=258,
        sha256='ac4446983fa63e8b9ca40f798abdd6202cd7e37e07ae63c49313d3a23421a02a',
        pageNumbering='PDF实际页序（从1起）；相关章节书页 = PDF页 − 17'),
    scope='原程序四个栏目：新辅助、辅助、后续内分泌、术后放疗参考。不是指南全书方案数据库。',
    verification='已对照用户提供的扫描页录入；未经独立临床验证。计算前由医生或药师核对本次方案、参数及患者适用性。',
    regimens=regimens, referenceCards=cards)
target = ROOT / 'data/catalogue.json'
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {len(regimens)} calculable entries and {len(cards)} reference cards to {target}')
