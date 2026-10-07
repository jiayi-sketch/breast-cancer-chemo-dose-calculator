/* SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial */
(function () {
  'use strict';
  const el = id => document.getElementById(id);
  if (!el('catalogue-workspace')) return;
  document.body.classList.add('windows-desktop');
  const words = {
    '病理报告 → 分型核对 → 方案查阅 → 剂量核对': ['病理報告 → 分型核對 → 方案查閱 → 劑量核對', 'Report → Receptor review → Regimens → Dose verification'],
    '新患者 / 清空本次': ['新患者 / 清空本次', 'New patient / Clear case'],
    '药物': ['藥物', 'Drug'], '指南剂量': ['指南劑量', 'Guideline dose'],
    '按参数计算': ['按參數計算', 'Calculated amount'],
    '给药时间': ['給藥時間', 'Administration'], '疗程': ['療程', 'Cycles / duration']
  };
  const t = s => {
    const pair = words[s], code = window.ChemoI18n.language;
    return pair ? code === 'en' ? pair[1] : code === 'zh-Hant' ? pair[0] : s : window.ChemoI18n.text(s);
  };
  const sidebar = document.querySelector('.sidebar'), patient = document.querySelector('.patient-panel');
  sidebar.insertBefore(el('reports-open'), el('sections'));
  const renalInput = patient.querySelector('.renal-grid > label');
  patient.querySelector('.patient-grid').insertBefore(renalInput, patient.querySelector('.bsa'));
  patient.querySelector('.renal-grid').remove();
  const notes = document.createElement('div'); notes.id = 'windows-notes';
  for (const id of ['entry-source', 'entry-eligibility', 'entry-notes']) notes.append(el(id));
  el('detail').insertBefore(notes, el('dose-workspace'));
  const clear = document.createElement('button'); clear.id = 'windows-clear-case';
  clear.addEventListener('click', () => el('reports-clear').click());
  document.querySelector('.header-actions').append(clear);
  function synchronize() {
    const selected = el('entry-list').querySelector('.is-selected');
    const entry = selected && [...window.ChemoCatalogue.regimens, ...window.ChemoCatalogue.referenceCards].find(e => e.id === selected.dataset.entryId);
    patient.hidden = el('dose-workspace').hidden;
    renalInput.hidden = el('renal-fields').hidden;
    clear.textContent = t('新患者 / 清空本次');
    document.querySelector('.brand p').textContent = t('病理报告 → 分型核对 → 方案查阅 → 剂量核对');
    sidebar.classList.toggle('report-active', !el('report-workspace').hidden);
    for (const phase of el('dose-table').querySelectorAll('.phase')) {
      if (!phase.querySelector('.windows-drug-head')) {
        const header = document.createElement('div'); header.className = 'windows-drug-head';
        for (const text of ['药物','指南剂量','按参数计算','给药时间','疗程']) {
          const label = document.createElement('span'); label.textContent = t(text); header.append(label);
        }
        phase.insertBefore(header, phase.querySelector('.drug-row'));
      }
    }
    // Only arrange the already-selected catalogue metadata. Dose results,
    // confirmation and selection continue to use the unchanged shared UI.
    for (const row of el('dose-table').querySelectorAll('.drug-row')) {
      if (row.dataset.windowsTable) continue;
      const drug = entry?.drugs?.find(d => d.id === row.dataset.drugId);
      if (!drug) continue;
      row.dataset.windowsTable = 'true';
      row.querySelector('.drug-schedule').textContent = t(drug.schedule);
      const duration = document.createElement('div'); duration.className = 'drug-duration'; duration.textContent = t(drug.duration); row.append(duration);
    }
  }
  const observer = new MutationObserver(synchronize);
  observer.observe(el('entry-list'), {childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  observer.observe(el('dose-table'), {childList:true,subtree:true});
  observer.observe(el('report-workspace'), {attributes:true,attributeFilter:['hidden']});
  document.addEventListener('chemo-language-change', synchronize);
  synchronize();
  window.ChemoWindowsDesktop = {synchronize, version:'2.0.3'};
}());
