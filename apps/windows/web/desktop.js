/* SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial */
(function () {
  'use strict';
  const el = id => document.getElementById(id);
  if (!el('catalogue-workspace')) return;
  document.body.classList.add('windows-desktop');
  const words = {
    '选择方案': ['選擇方案', 'Select regimen'],
    '治疗阶段': ['治療階段', 'Treatment setting'],
    '方案说明与指南出处': ['方案說明與指南出處', 'Regimen notes and guideline sources'],
    '无匹配结果': ['無匹配結果', 'No matching entries']
  };
  const t = s => {
    const pair = words[s], code = window.ChemoI18n.language;
    return pair ? code === 'en' ? pair[1] : code === 'zh-Hant' ? pair[0] : s : window.ChemoI18n.text(s);
  };
  const panel = document.querySelector('.catalogue-panel');
  const settingLabel = document.createElement('label'), settings = document.createElement('select');
  settings.id = 'windows-setting'; settings.setAttribute('aria-label', t('治疗阶段'));
  settingLabel.append(document.createTextNode(t('治疗阶段')), settings);
  panel.prepend(settingLabel);
  const pickerLabel = document.createElement('label'), picker = document.createElement('select');
  picker.id = 'windows-regimen'; picker.setAttribute('aria-label', t('选择方案'));
  pickerLabel.append(document.createTextNode(t('选择方案')), picker);
  panel.append(pickerLabel);
  const detail = el('detail'), patient = document.querySelector('.patient-panel');
  detail.insertBefore(patient, el('dose-workspace'));
  const renalInput = patient.querySelector('.renal-grid > label');
  patient.querySelector('.patient-grid').insertBefore(renalInput, patient.querySelector('.bsa'));
  patient.querySelector('.renal-grid').remove();
  const notes = document.createElement('details'), heading = document.createElement('summary');
  notes.id = 'windows-notes'; heading.textContent = t('方案说明与指南出处'); notes.append(heading);
  for (const id of ['entry-source', 'entry-eligibility', 'entry-notes']) notes.append(el(id));
  detail.insertBefore(notes, patient);
  // Existing buttons remain the authoritative selection path. The compact
  // select mirrors their filtered catalogue without duplicating dose rules.
  function synchronize() {
    settings.replaceChildren(...[...el('sections').querySelectorAll('button')].map(b => {
      const option = document.createElement('option'); option.value = b.id; option.textContent = b.textContent;
      option.selected = b.classList.contains('is-current'); return option;
    }));
    settings.value = el('sections').querySelector('.is-current')?.id || '';
    const entries = [...el('entry-list').querySelectorAll('.entry-button')];
    picker.replaceChildren(...entries.map(b => {
      const option = document.createElement('option'); option.value = b.dataset.entryId;
      option.textContent = b.querySelector('strong').textContent;
      option.selected = b.classList.contains('is-selected'); return option;
    }));
    if (entries.length) picker.value = entries.find(b => b.classList.contains('is-selected'))?.dataset.entryId || '';
    if (!entries.length) { const option = document.createElement('option'); option.textContent = t('无匹配结果'); picker.append(option); }
    picker.disabled = !entries.length;
    picker.title = el('entry-title').textContent;
    patient.hidden = el('dose-workspace').hidden;
    renalInput.hidden = el('renal-fields').hidden;
    settingLabel.firstChild.nodeValue = t('治疗阶段'); pickerLabel.firstChild.nodeValue = t('选择方案');
    heading.textContent = t('方案说明与指南出处');
    settings.setAttribute('aria-label', t('治疗阶段')); picker.setAttribute('aria-label', t('选择方案'));
  }
  settings.addEventListener('change', () => el(settings.value)?.click());
  picker.addEventListener('change', () => {
    const button = [...el('entry-list').querySelectorAll('.entry-button')].find(b => b.dataset.entryId === picker.value);
    if (button) { button.click(); synchronize(); }
  });
  const observer = new MutationObserver(synchronize);
  observer.observe(el('entry-list'), {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
  observer.observe(el('sections'), {subtree: true, attributes: true, attributeFilter: ['class']});
  document.addEventListener('chemo-language-change', synchronize);
  synchronize();
  window.ChemoWindowsDesktop = {synchronize, version: '2.0.1'};
}());
