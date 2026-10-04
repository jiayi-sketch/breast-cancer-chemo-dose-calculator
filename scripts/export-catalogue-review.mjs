// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import {readFileSync, writeFileSync} from 'node:fs';
import {standardDose, sourceLabel} from '../packages/calculation-core/src/catalogue.mjs';
const cat = JSON.parse(readFileSync(new URL('../data/catalogue.json',import.meta.url),'utf8'));
const escape = s => String(s).replaceAll('|','\\|').replaceAll('\n','<br>');
const lines = ['# 内置方案逐项核对表', '', '应用 ' + cat.appVersion + '；目录 ' + cat.version + '。', '',
  '52 个治疗方案、7 个单药剂量参考、18 张指南摘要卡。此表供专业复核，不是处方；所有项均未获独立临床验证。', '',
  '来源：用户提供的《2026 CSCO乳腺癌诊疗指南》。PDF 实际页序从 1 起；相关书页 = PDF 页 −17。', ''];
for(const r of cat.regimens){
  lines.push('## ' + r.id + ' · ' + r.name, '', r.section + ' / ' + r.subtype + ' / ' + r.level, '',
    sourceLabel(r), '',r.eligibility, '', r.notes || '', '',
    '| 阶段 | 药物 | 标准剂量 | 给药频次 | 疗程 | 来源 |', '| --- | --- | --- | --- | --- | --- |');
  for(const d of r.drugs) lines.push('| ' + [d.phaseLabel,d.name,standardDose(d),d.schedule,d.duration,sourceLabel(d)].map(escape).join(' | ') + ' |');
  lines.push('');
}
lines.push('## 指南摘要卡', '');
for(const c of cat.referenceCards) lines.push('### '+c.id+' · '+c.name,'',c.section+' / '+c.subtype+' / '+sourceLabel(c),'',c.body,'');
writeFileSync(new URL('../docs/catalogue-review.md',import.meta.url),lines.join('\n'));
