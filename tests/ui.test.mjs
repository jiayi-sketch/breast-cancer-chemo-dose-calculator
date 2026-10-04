// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
// DOM event tests; these do not assert browser layout or native WebView behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { Window } = await import(process.env.HAPPY_DOM_MODULE || 'happy-dom');
const root = new URL('../apps/shared-web/', import.meta.url);
function setup(t) {
  const window = new Window({ settings: {
    enableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true,
    disableCSSFileLoading: true, suppressInsecureJavaScriptEnvironmentWarning: true,
    navigation: { disableMainFrameNavigation: true, disableChildFrameNavigation: true,
      disableChildPageNavigation: true },
  }});
  // Only our reviewed application files are evaluated; no remote resources are loaded.
  window.document.write(readFileSync(new URL('manual.html', root), 'utf8'));
  window.eval(readFileSync(new URL('core.browser.js', root), 'utf8'));
  for (const f of ['translations.browser.js','i18n.js','app.js']) window.eval(readFileSync(new URL(f, root), 'utf8'));
  const el = id => window.document.getElementById(id);
  const input = (id, value) => {
    el(id).value = value;
    el(id).dispatchEvent(new window.Event('input', { bubbles: true }));
    if (id === 'kind') el(id).dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const submit = (confirm = true) => {
    el('confirmed').checked = confirm;
    el('dose-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  };
  const result = () => JSON.parse(el('raw-result').textContent);
  t.after(() => window.happyDOM.abort());
  return { window, el, input, submit, result };
}

test('example requires confirmation; BSA=2 and synthetic coefficient 7.5 yields 15 mg', t => {
  const {el, submit, result} = setup(t);
  assert.equal(el('result-content').hidden, true);
  el('example').click(); submit(false);
  assert.equal(el('form-error').hidden, false);
  assert.equal(el('result-content').hidden, true);
  submit();
  assert.equal(result().basis.bsaM2, 2);
  assert.equal(result().quantities[0].valueMg, 15);
  assert.equal(el('quantities').textContent.includes('15.00'), true);
});

const cases = [
  ['bsa', '7.5', '', [15]], ['bsa_range', '7.5', '10', [15, 20]],
  ['weight', '2', '', [160]], ['weight_seq', '2', '1', [160, 80]],
  ['fixed', '15', '', [15]], ['fixed_seq', '15', '10', [15, 10]],
  ['fixed_alt', '15', '10', [10]], ['auc', '2', '', [150]],
];
for (const [mode, first, second, expected] of cases) {
  test(`UI maps ${mode} inputs to the shared engine correctly`, t => {
    const {el, input, submit, result} = setup(t);
    el('example').click(); input('kind', mode); input('dose1', first);
    if (second) input('dose2', second);
    if (mode.startsWith('fixed')) { input('height', ''); input('weight', ''); }
    if (mode === 'fixed_alt') {
      input('schedule1', '测试频次一'); input('schedule2', '测试频次二');
      submit(); assert.equal(el('result-content').hidden, true);
      input('alternative', '1');
    }
    if (mode === 'auc') {
      input('renal-value', '50'); input('renal-method', '虚构算术测试');
      submit(); assert.equal(el('result-content').hidden, true);
      el('renal-confirmed').checked = true;
    }
    submit(); assert.equal(el('form-error').hidden, true, el('form-error').textContent);
    assert.deepEqual(result().quantities.map(q => q.valueMg), expected);
  });
}

test('editing each relevant input immediately removes previous quantities and confirmation', t => {
  const {el, input, submit} = setup(t);
  for (const [id, value] of [['item-name','新的项目'], ['dose1','8'], ['height','181'],
    ['weight','81'], ['reference','新的依据'], ['reviewer','新的核对人']]) {
    el('example').click(); submit();
    assert.equal(el('result-content').hidden, false);
    input(id, value);
    assert.equal(el('result-content').hidden, true, id);
    assert.equal(el('confirmed').checked, false, id);
    assert.equal(el('raw-result').textContent, '', id);
    assert.equal(el('quantities').textContent, '', id);
  }
});

test('renal edits invalidate both confirmations and mode changes remove old coefficients', t => {
  const {el, input, submit} = setup(t);
  el('example').click(); input('kind', 'auc'); input('dose1','2');
  input('renal-value','50'); input('renal-method','测试');
  el('renal-confirmed').checked = true; submit();
  input('renal-value','60');
  assert.equal(el('renal-confirmed').checked, false);
  assert.equal(el('confirmed').checked, false);
  input('kind','bsa');
  assert.equal(el('dose1').value, '');
  assert.equal(el('dose2').value, '');
  assert.equal(el('result-content').hidden, true);
});

test('missing evidence, out-of-range values and reversed ranges block output', t => {
  const {el, input, submit} = setup(t);
  for (const [id, value] of [['reference',''], ['reviewer',''], ['item-name',''],
    ['height','79'], ['weight','351'], ['dose1','0'], ['dose1','']]) {
    el('example').click(); input(id,value); submit();
    assert.equal(el('result-content').hidden, true, id);
    assert.equal(el('form-error').hidden, false, id);
  }
  el('example').click(); input('kind','bsa_range'); input('dose1','10'); input('dose2','7'); submit();
  assert.equal(el('result-content').hidden, true);
});

test('names and sources render as text, never executable markup; copy uses current result only', t => {
  const {window,el,input,submit} = setup(t);
  const malicious = '<img src=x onerror="window.bad=true">';
  let copied = [];
  window.AndroidBridge = {copySummary: value => copied.push(value)};
  el('example').click(); input('item-name', malicious); input('reference', malicious); submit();
  assert.equal(el('result-item').textContent, malicious);
  assert.equal(el('result-content').querySelector('img'), null);
  el('copy').click(); assert.equal(copied.length, 1);
  assert.match(copied[0], /15\.00 mg/);
  input('weight','90'); el('copy').click();
  assert.equal(copied.length, 1);
  assert.equal(window.bad, undefined);
});

test('new patient clears all fields and results; help opens and closes', t => {
  const {el, submit} = setup(t);
  el('example').click(); submit(); el('clear').click();
  for (const id of ['item-name','dose1','dose2','height','weight','reviewer','reference']) {
    assert.equal(el(id).value, '', id);
  }
  assert.equal(el('confirmed').checked, false);
  assert.equal(el('result-content').hidden, true);
  assert.equal(el('example-notice').hidden, true);
  el('about-toggle').click(); assert.equal(el('about-dialog').open, true);
  el('about-close').click(); assert.equal(el('about-dialog').open, false);
});

test('manual Windows copy waits for acknowledgement and reports clipboard failure', t => {
  const {window, el, submit, input} = setup(t);
  const sent = [], listeners = new Set();
  window.chrome = {webview: {
    postMessage: value => sent.push(value),
    addEventListener: (_, handler) => listeners.add(handler),
    removeEventListener: (_, handler) => listeners.delete(handler)
  }};
  el('example').click(); submit(); el('copy').click();
  assert.equal(sent.length, 1);
  assert.match(sent[0].value, /15\.00 mg/);
  assert.match(el('toast').textContent, /正在复制/);
  for (const fn of [...listeners]) fn({data:{type:'copySummaryResult',requestId:sent[0].requestId,ok:true}});
  assert.match(el('toast').textContent, /已复制/);
  el('copy').click();
  for (const fn of [...listeners]) fn({data:{type:'copySummaryResult',requestId:sent[1].requestId,ok:false}});
  assert.match(el('toast').textContent, /复制失败/);
  input('weight', '90'); el('copy').click(); assert.equal(sent.length, 2);
});
