/* SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial */
(function () {
  'use strict';
  const cat = window.ChemoCatalogue, engine = window.RegimenEngine;
  const el = id => document.getElementById(id);
  const sections = ['术前新辅助治疗', '术后辅助治疗', '后续内分泌治疗', '保乳术后治疗'];
  let section = sections[0], selected = null, current = null;
  function node(tag, text, cls) {
    const n = document.createElement(tag); n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function empty(n) { n.replaceChildren(); }
  function number(id) { return el(id).value.trim() === '' ? undefined : Number(el(id).value); }
  function message(text, state = '') { el('message').textContent = text; el('message').className = state; }
  function invalidate(text = '参数或方案已变化，请重新核对后计算。') {
    current = null; el('confirmed').checked = false; el('copy').disabled = true;
    el('audit').hidden = true; el('raw-result').textContent = ''; el('summary-text').textContent = '';
    message(text); renderRows();
  }
  function renderRows() {
    empty(el('dose-table'));
    if (!selected?.drugs) return;
    let group, lastPhase;
    selected.drugs.forEach(d => {
      if (lastPhase !== d.phase) {
        group = node('section', '', 'phase'); group.append(node('h4', d.phaseLabel, 'phase-heading'));
        el('dose-table').append(group); lastPhase = d.phase;
      }
      const row = node('div', '', 'drug-row'); row.dataset.drugId = d.id;
      const title = node('div', ''); title.append(node('div', d.name, 'drug-title'), node('p', engine.standardDose(d), 'drug-standard'));
      const result = current?.rows.find(r => r.drugId === d.id)?.result;
      row.append(title, node('div', result ? engine.quantityLabel(result) : '待计算', 'drug-value' + (result ? '' : ' pending')),
        node('div', d.schedule + ' · ' + d.duration, 'drug-schedule'));
      if (d.note) row.append(node('div', d.note, 'drug-note'));
      row.append(node('div', engine.sourceLabel(d), 'drug-source')); group.append(row);
    });
  }
  function showEntry(entry) {
    selected = entry; invalidate('填写参数并核对后计算。');
    empty(el('alternatives'));
    const isReference = !entry?.drugs;
    el('dose-workspace').hidden = isReference;
    el('reference-body').hidden = !isReference;
    el('renal-fields').hidden = !entry?.drugs?.some(d => d.kind === 'auc');
    el('entry-type').textContent = entry ? ({reference: '指南推荐摘要', regimen: '内置治疗方案', 'single-drug-reference': '单药剂量参考'}[entry.entryType]) : '无匹配结果';
    el('entry-title').textContent = entry?.name || '请调整搜索或分型条件';
    el('entry-meta').textContent = entry ? entry.subtype + (entry.level ? ' · ' + entry.level : '') : '';
    el('entry-source').textContent = entry ? cat.source.title + ' · ' + engine.sourceLabel(entry) : '';
    el('entry-eligibility').textContent = entry?.eligibility || '';
    el('entry-notes').textContent = entry?.notes || '';
    el('reference-body').textContent = entry?.body || '';
    entry?.drugs?.filter(d => d.kind === 'fixed_alt').forEach(d => {
      const label = node('label', d.name + ' · 请明确选择剂量与频次');
      const select = document.createElement('select'); select.id = 'alt-' + d.id;
      const placeholder = node('option', '请选择，两个选项不能同时使用'); placeholder.value = ''; select.append(placeholder);
      d.schedules.forEach((s, i) => { const o = node('option', s); o.value = i; select.append(o); });
      select.addEventListener('change', () => invalidate()); label.append(select); el('alternatives').append(label);
    });
    document.querySelectorAll('.entry-button').forEach(b => {
      const active = b.dataset.entryId === entry?.id;
      b.setAttribute('aria-pressed', String(active));
      // Use an explicit visual class as well: WKWebView may retain a stale
      // attribute-selector paint when only an ARIA state is changed.
      b.classList.toggle('is-selected', active);
    });
  }
  function renderList() {
    const entries = engine.filterEntries(cat, {section, subtype: el('subtype').value, query: el('search').value});
    empty(el('entry-list'));
    el('match-count').textContent = entries.length + ' 项 · 方案 / 单药参考 / 摘要';
    entries.forEach(r => {
      const b = node('button', '', 'entry-button'); b.type = 'button'; b.dataset.entryId = r.id;
      b.append(node('strong', r.name), node('small', r.subtype + ' · ' + (r.drugs ? (r.entryType === 'regimen' ? r.drugs.length + ' 项用药' : '单药剂量参考') : '指南摘要')));
      b.addEventListener('click', () => { showEntry(r); if (window.innerWidth < 761) el('detail').scrollIntoView({block: 'start', behavior: 'smooth'}); });
      el('entry-list').append(b);
    });
    if (!entries.length) el('entry-list').append(node('p', '没有匹配条目。可清空搜索或选择“全部”。', 'empty-list'));
    showEntry(entries.find(r => r.id === selected?.id) || entries[0] || null);
    // Keep the selected row visible after a category/filter rebuild without
    // scrolling the surrounding page away from the search controls.
    const list = el('entry-list'), active = list.querySelector('.is-selected');
    if (active) {
      const rowBounds = active.getBoundingClientRect(), listBounds = list.getBoundingClientRect();
      if (rowBounds.top < listBounds.top) list.scrollTop += rowBounds.top - listBounds.top - 4;
      else if (rowBounds.bottom > listBounds.bottom) list.scrollTop += rowBounds.bottom - listBounds.bottom + 4;
    }
  }
  function setSection(value) {
    section = value; selected = null; el('section-title').textContent = value;
    el('search').value = ''; empty(el('subtype'));
    const option = node('option', '全部'); option.value = ''; el('subtype').append(option);
    [...new Set(engine.filterEntries(cat, {section}).map(r => r.subtype))].forEach(s => {
      const o = node('option', s); o.value = s; el('subtype').append(o);
    });
    document.querySelectorAll('#sections button').forEach(b => {
      const active = b.dataset.section === section;
      b.setAttribute('aria-current', String(active));
      b.classList.toggle('is-current', active);
    });
    renderList();
  }
  sections.forEach((s, i) => {
    const b = node('button', s); b.type = 'button'; b.dataset.section = s; b.id = 'section-' + i;
    b.addEventListener('click', () => setSection(s)); el('sections').append(b);
  });
  function updateBsa() {
    const bsa = window.DoseCore.calculateBsa({heightCm: number('height'), weightKg: number('weight')});
    el('bsa-value').textContent = bsa.status === 'ok' ? bsa.valueM2.toFixed(3) : '—';
  }
  ['height', 'weight', 'renal-value', 'renal-method', 'reviewer'].forEach(id => {
    el(id).addEventListener('input', () => {
      if (id === 'renal-value' || id === 'renal-method' || id === 'height' || id === 'weight') el('renal-confirmed').checked = false;
      invalidate(); updateBsa();
    });
  });
  el('renal-confirmed').addEventListener('change', () => invalidate());
  el('confirmed').addEventListener('change', () => {
    if (!el('confirmed').checked) invalidate('请核对后再计算。');
  });
  el('clear-patient').addEventListener('click', () => {
    ['height', 'weight', 'renal-value', 'renal-method', 'reviewer'].forEach(id => { el(id).value = ''; });
    el('renal-confirmed').checked = false;
    el('alternatives').querySelectorAll('select').forEach(s => { s.value = ''; });
    invalidate('本次参数和结果已清空。'); updateBsa();
  });
  el('search').addEventListener('input', renderList);
  el('subtype').addEventListener('change', renderList);
  el('calculate').addEventListener('click', () => {
    const acknowledgement = {confirmed: el('confirmed').checked, reviewer: el('reviewer').value};
    const inputs = {heightCm: number('height'), weightKg: number('weight'), alternatives: {}};
    if (selected?.drugs?.some(d => d.kind === 'auc')) inputs.renalFunction = {
      value: number('renal-value'), unit: 'mL/min', method: el('renal-method').value.trim(), confirmed: el('renal-confirmed').checked};
    el('alternatives').querySelectorAll('select').forEach(s => { if (s.value !== '') inputs.alternatives[s.id.slice(4)] = Number(s.value); });
    current = null; el('copy').disabled = true; el('audit').hidden = true;
    el('raw-result').textContent = ''; el('summary-text').textContent = ''; renderRows();
    const result = engine.calculateRegimen(cat, selected?.id, inputs, acknowledgement);
    if (result.status !== 'ok') { message(result.issues.map(i => i.message).join(' '), 'error'); return; }
    current = result; renderRows(); el('copy').disabled = false; el('audit').hidden = false;
    el('raw-result').textContent = JSON.stringify(result, null, 2);
    el('summary-text').textContent = engine.summaryText(cat, result);
    message('已按当前参数计算 · 请复核各阶段、频次及每次给药量。', 'success');
  });
  el('copy').addEventListener('click', () => {
    if (!current) return;
    const value = engine.summaryText(cat, current);
    if (window.webkit?.messageHandlers?.copySummary) { window.webkit.messageHandlers.copySummary.postMessage(value); message('核对单已复制。', 'success'); }
    else if (window.AndroidBridge?.copySummary) { window.AndroidBridge.copySummary(value); message('核对单已复制。', 'success'); }
    else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(() => message('核对单已复制。', 'success'), () => message('复制失败，可展开完整记录手动复制。', 'error'));
    else message('请展开完整记录，选中文本复制。');
  });
  el('about-open').addEventListener('click', () => el('about-dialog').showModal());
  el('about-close').addEventListener('click', () => el('about-dialog').close());
  el('catalogue-count').textContent = '52 个方案 · 7 个单药参考';
  setSection(section); window.ChemoAppReady = true;
}());
