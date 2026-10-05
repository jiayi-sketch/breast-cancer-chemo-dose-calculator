// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import { calculateDose } from './index.ts';

export function filterEntries(catalogue, {section, subtype = '', query = ''}) {
  const needle = query.trim().toLocaleLowerCase();
  return [...catalogue.regimens, ...catalogue.referenceCards].filter(r =>
    (!section || r.section === section) && (!subtype || r.subtype === subtype) &&
    (!needle || [r.name, r.subtype, ...(r.drugs || []).map(d => d.name)]
      .join(' ').toLocaleLowerCase().includes(needle)));
}

export function sourceLabel(entry) {
  return 'PDF ' + entry.sourcePdfPages.join('、') + ' 页 / 书页 ' + entry.sourceBookPages.join('、');
}

export function standardDose(drug) {
  const d = drug.dose;
  if (drug.kind === 'auc') return 'AUC ' + d + '（mg·min/mL）';
  if (drug.kind === 'bsa') return d + ' mg/m²';
  if (drug.kind === 'bsa_range') return d.join('–') + ' mg/m²';
  if (drug.kind === 'weight') return d + ' mg/kg';
  if (drug.kind.endsWith('_seq')) return '首剂 ' + d[0] + ' / 后续 ' + d[1] + (drug.kind === 'weight_seq' ? ' mg/kg' : ' mg');
  if (drug.kind === 'fixed_alt') return drug.schedules.join('；或 ');
  return d + ' mg / 次';
}

export function quantityLabel(result) {
  const q = result.quantities, fmt = n => n.toFixed(2);
  if (q.length === 2 && q[0].role === 'lower') return fmt(q[0].valueMg) + '–' + fmt(q[1].valueMg) + ' mg / 次（区间）';
  if (q.length === 2) return '首剂 ' + fmt(q[0].valueMg) + ' mg；后续 ' + fmt(q[1].valueMg) + ' mg / 次';
  return fmt(q[0].valueMg) + ' mg / 次' + (q[0].schedule ? '；' + q[0].schedule : '');
}

export function calculateRegimen(catalogue, regimenId, inputs, acknowledgement) {
  const r = catalogue.regimens.find(r => r.id === regimenId);
  const fail = message => ({status: 'blocked', issues: [{message}]});
  if (!r) return fail('请选择一个内置剂量方案。指南摘要不生成剂量。');
  if (acknowledgement?.confirmed !== true) return fail('请先核对所选方案、分阶段用药及本次参数，然后勾选确认。');
  if (!acknowledgement?.reviewer?.trim()) return fail('请填写本次核对人。');
  const rows = [], issues = [];
  for (const d of r.drugs) {
    const rule = {id: d.id, version: catalogue.version, kind: d.kind, dose: d.dose,
      schedules: d.schedules,
      source: {title: catalogue.source.title, version: catalogue.source.edition, locator: sourceLabel(d)},
      // This approval is the explicit user's acknowledgement for THIS calculation.
      // The shipped catalogue remains clinicalReview: pending.
      review: {status: 'approved', reviewer: acknowledgement.reviewer.trim(),
        reviewedOn: new Date().toISOString().slice(0, 10)}};
    const result = calculateDose({rule,
      inputs: {...inputs, alternativeIndex: inputs.alternatives?.[d.id]}, clinicianConfirmed: true});
    if (result.status !== 'ok') issues.push(...result.issues.map(i => ({...i, drugId: d.id, message: d.name + '：' + i.message})));
    else rows.push({drugId: d.id, phase: d.phase, result});
  }
  // No partial dose sheet is exposed when any row is unavailable.
  if (issues.length) return {status: 'blocked', issues};
  return {status: 'ok', regimenId: r.id, catalogueVersion: catalogue.version,
    sourceScanSha256: catalogue.source.sha256, clinicalReview: r.clinicalReview,
    reviewer: acknowledgement.reviewer.trim(), calculatedAt: new Date().toISOString(),
    inputs, rows};
}

export function summaryText(catalogue, calculation) {
  if (calculation?.status !== 'ok') return '';
  const r = catalogue.regimens.find(r => r.id === calculation.regimenId);
  const input = calculation.inputs;
  return ['乳腺癌剂量计算 · 1.0.3 · 算术核对单（非处方）', r.section + ' / ' + r.subtype,
    r.name, catalogue.source.title + ' · ' + sourceLabel(r), '目录版本：' + calculation.catalogueVersion,
    '本次核对人：' + calculation.reviewer, '计算时间：' + calculation.calculatedAt,
    '身高：' + (input.heightCm ?? '未填写') + ' cm；体重：' + (input.weightKg ?? '未填写') + ' kg',
    ...(r.drugs.some(d => d.kind === 'auc') ? ['肾功能：' + input.renalFunction.value + ' mL/min'] : []),
    ...calculation.rows.map(row => {
      const d = r.drugs.find(d => d.id === row.drugId);
      return '[' + d.phaseLabel + '] ' + d.name + '\n标准：' + standardDose(d) +
        '\n计算：' + quantityLabel(row.result) + '\n' + d.schedule + '；' + d.duration + '\n' + sourceLabel(d);
    }),
    '数值为每次给药量；不相加各药或各阶段。区间保留，不自动取中值。',
    '显示保留2位小数；计算使用未取整数值。未处理临床取整、减量、累计上限或患者适用性。',
    '目录完成扫描页录入核对；未经独立临床验证。'].join('\n\n');
}
