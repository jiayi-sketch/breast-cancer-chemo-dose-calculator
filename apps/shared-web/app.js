/* SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial */
(function () {
  'use strict';
  var L = window.ChemoI18n, t = function(source){return L.text(source);};
  var el = function (id) { return document.getElementById(id); };
  var current = null;
  function empty(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  var toastTimer;
  var modes = {
    bsa: ['剂量系数', '', 'mg/m²'], bsa_range: ['剂量下限', '剂量上限', 'mg/m²'],
    weight: ['剂量系数', '', 'mg/kg'], weight_seq: ['首剂系数', '后续系数', 'mg/kg'],
    fixed: ['固定剂量', '', 'mg'], fixed_seq: ['首剂剂量', '后续剂量', 'mg'],
    fixed_alt: ['选项一剂量', '选项二剂量', 'mg'], auc: ['目标 AUC', '', 'AUC']
  };
  function number(id) { var v = el(id).value.trim(); return v === '' ? undefined : Number(v); }
  function notify(message) { clearTimeout(toastTimer); el('toast').textContent = t(message); el('toast').hidden = false; toastTimer = setTimeout(function () { el('toast').hidden = true; }, 3500); }
  function resetResult(message) {
    current = null; el('result-content').hidden = true; el('empty-result').hidden = false;
    el('result-status').textContent = t(message || '待计算');
    empty(el('quantities')); el('raw-result').textContent = '';
    empty(el('result-metadata')); el('result-item').textContent = '';
    el('calculation-basis').textContent = ''; el('form-error').hidden = true;
  }
  function invalidate() { el('confirmed').checked = false; resetResult('待重新核对'); }
  function setMode(preserve) {
    var kind = el('kind').value, mode = modes[kind];
    el('dose1-label').textContent = t(mode[0]); el('dose2-label').textContent = t(mode[1]);
    el('dose1-unit').textContent = mode[2]; el('dose2-unit').textContent = mode[2];
    el('dose2-field').hidden = !mode[1]; el('alternative-fields').hidden = kind !== 'fixed_alt';
    el('height-field').hidden = kind !== 'bsa' && kind !== 'bsa_range';
    el('weight-field').hidden = ['bsa', 'bsa_range', 'weight', 'weight_seq'].indexOf(kind) < 0;
    el('renal-fields').hidden = kind !== 'auc'; el('fixed-hint').hidden = kind.indexOf('fixed') !== 0;
    el('renal-confirmed').checked = false; if (!preserve) el('alternative').value = '';
  }
  function error(message, field) {
    resetResult('待核对'); el('form-error').textContent = t(message); el('form-error').hidden = false;
    var map = { heightCm: 'height', weightKg: 'weight', alternativeIndex: 'alternative',
      clinicianConfirmed: 'confirmed', 'renalFunction.value': 'renal-value', renalFunction: 'renal-value',
      'rule.dose': 'dose1', 'rule.schedules': 'schedule1' };
    var id = map[field] || field; if (id && el(id)) el(id).focus();
  }
  function addText(tag, value, className) { var node = document.createElement(tag); node.textContent = value; if (className) node.className = className; return node; }
  function metadata(label, value) { el('result-metadata').append(addText('dt', t(label)), addText('dd', value)); }
  function formula(result) {
    var b = result.basis, coeff = b.coefficients.join(' / ');
    if (b.bsaM2 !== undefined) return 'BSA = √(' + b.heightCm + ' × ' + b.weightKg + ' / 3600)\n= ' + b.bsaM2.toFixed(6) + ' m²\n'+t('剂量 = ') + coeff + ' × BSA';
    if (b.weightKg !== undefined) return t('剂量 = ') + coeff + ' × ' + b.weightKg + ' kg';
    if (b.renalMlMin !== undefined) return t('剂量 = ') + coeff + ' × (' + b.renalMlMin + ' + 25)';
    return t(b.alternativeIndex !== undefined ? '采用已明确选择的固定剂量及频次' : '采用人工录入并核对的固定剂量');
  }
  function render(result, name, reference, reviewer) {
    el('result-content').hidden = false; el('empty-result').hidden = true; el('result-status').textContent = t('已计算 · 待复核');
    el('result-item').textContent = name;
    var labels = { single: '本次计算值', lower: '区间下限', upper: '区间上限', loading: '首剂', maintenance: '后续剂量' };
    result.quantities.forEach(function (q) {
      var card = addText('div', '', 'quantity'); card.appendChild(addText('span', t(labels[q.role]), 'quantity-label'));
      card.appendChild(addText('span', q.valueMg.toFixed(2), 'quantity-value')); card.appendChild(addText('span', 'mg', 'quantity-unit'));
      if (q.schedule) card.appendChild(addText('p', q.schedule, 'quantity-schedule')); el('quantities').appendChild(card);
    });
    el('calculation-basis').textContent = formula(result); el('calculation-basis').style.whiteSpace = 'pre-line';
    metadata('依据', reference); metadata('核对人', reviewer); metadata('时间', new Date().toLocaleString(L.language === 'en' ? 'en-US' : L.language === 'zh-Hant' ? 'zh-TW' : 'zh-CN'));
    metadata('核心', result.engineVersion + ' / '+t('人工输入规则'));
    el('raw-result').textContent = JSON.stringify(result, null, 2);
    current = { result: result, name: name, reference: reference, reviewer: reviewer,
      summary: [t('乳腺癌剂量计算工具')+' · '+t('测试版')+' '+window.DoseCore.ENGINE_VERSION, t('计算项目：') + name,
        result.quantities.map(function(q){return t(labels[q.role]) + ': ' + q.valueMg.toFixed(2) + ' mg' + (q.schedule ? '；' + q.schedule : '');}).join('\n'),
        formula(result), t('计算依据：') + reference, t('核对人：') + reviewer,
        t('完整数值（mg）：') + result.quantities.map(function(q){return String(q.valueMg);}).join(' / '),
        t('仅作算术核对；未执行临床剂量取整、剂量上限判断或自动减量。')].join('\n') };
    if (window.innerWidth < 721) el('result-content').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  el('dose-form').addEventListener('input', function(e) {
    if (e.target.id === 'confirmed') { resetResult(); return; }
    if (e.target.id === 'renal-value' || e.target.id === 'renal-method') el('renal-confirmed').checked = false;
    invalidate();
  });
  el('kind').addEventListener('change', function () {
    el('dose1').value = ''; el('dose2').value = ''; setMode(); invalidate();
  });
  el('dose-form').addEventListener('submit', function(e) {
    e.preventDefault(); resetResult();
    var name = el('item-name').value.trim(), reference = el('reference').value.trim(), reviewer = el('reviewer').value.trim();
    if (!name) return error('请填写计算项目或药物名称。', 'item-name');
    if (!reference) return error('请记录计算依据及其版本、页码或位置。', 'reference');
    if (!reviewer) return error('请填写核对人。', 'reviewer');
    var kind = el('kind').value;
    var inputs = { heightCm: number('height'), weightKg: number('weight') };
    if (kind === 'auc') inputs.renalFunction = { value: number('renal-value'), unit: 'mL/min', method: el('renal-method').value.trim(), confirmed: el('renal-confirmed').checked };
    if (el('alternative').value !== '') inputs.alternativeIndex = Number(el('alternative').value);
    var rule = { id: 'manual-' + kind, version: 'manual-entry-v1', kind: kind,
      dose: modes[kind][1] ? [number('dose1'), number('dose2')] : number('dose1'),
      source: { title: reference, version: '本次人工输入', locator: reference },
      review: { status: 'approved', reviewer: reviewer, reviewedOn: new Date().toISOString().slice(0,10) } };
    if (kind === 'fixed_alt') rule.schedules = [el('schedule1').value.trim(), el('schedule2').value.trim()];
    var result = window.DoseCore.calculateDose({ rule: rule, inputs: inputs, clinicianConfirmed: el('confirmed').checked });
    if (result.status !== 'ok') return error(result.issues[0].message, result.issues[0].field);
    render(result, name, reference, reviewer);
  });
  function clear() { el('dose-form').reset(); setMode(); resetResult(); el('example-notice').hidden = true; }
  el('clear').addEventListener('click', function(){ clear(); notify('本次输入和结果已清空'); el('item-name').focus(); });
  el('example').addEventListener('click', function () {
    clear(); el('item-name').value = t('算术示例（非药物方案）'); el('dose1').value = '7.5'; el('height').value = '180'; el('weight').value = '80';
    el('reference').value = t('虚构算术测试：BSA=2 m²，7.5×2=15；不对应药物方案。'); el('reviewer').value = t('测试');
    el('example-notice').hidden = false; notify('示例已载入，请核对后勾选确认');
  });
  el('copy').addEventListener('click', function () {
    if (!current) return;
    var value = current.summary, copied = current, language = L.language;
    function report(message){if(current === copied && L.language === language)notify(message);}
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.copySummary) {
      window.webkit.messageHandlers.copySummary.postMessage(value); notify('核对摘要已复制'); return;
    }
    if (window.AndroidBridge && window.AndroidBridge.copySummary) { window.AndroidBridge.copySummary(value); notify('核对摘要已复制'); return; }
    if (window.chrome && window.chrome.webview) {
      var bridge = window.chrome.webview, requestId = crypto.randomUUID();
      var reply = function(e) {
        if (!e.data || e.data.type !== 'copySummaryResult' || e.data.requestId !== requestId) return;
        bridge.removeEventListener('message', reply); clearTimeout(timeout);
        report(e.data.ok ? '核对摘要已复制' : '复制失败，请在完整记录中手动复制');
      };
      var timeout = setTimeout(function(){bridge.removeEventListener('message', reply); report('复制未完成，请手动复制');}, 5000);
      bridge.addEventListener('message', reply);
      bridge.postMessage({type:'copySummary', value:value, requestId:requestId});
      notify('正在复制核对摘要…'); return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function(){report('核对摘要已复制');},function(){report('复制失败，请在完整记录中手动复制');});
    } else {
      var box = document.createElement('textarea'); box.value = value; document.body.appendChild(box); box.select();
      var ok = document.execCommand('copy'); box.remove(); notify(ok ? '核对摘要已复制' : '复制失败，请手动复制');
    }
  });
  el('about-toggle').addEventListener('click', function(){el('about-dialog').showModal();});
  el('about-close').addEventListener('click', function(){el('about-dialog').close();});
  document.addEventListener('chemo-language-change',function(){
    setMode(true); invalidate(); clearTimeout(toastTimer); el('toast').hidden=true;
  });
  setMode(); window.ChemoAppReady = true;
}());
