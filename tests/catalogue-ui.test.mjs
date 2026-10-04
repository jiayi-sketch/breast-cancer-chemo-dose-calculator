// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
// Offline DOM behavior tests; no claims about native WebView or visual layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {Window} = await import(process.env.HAPPY_DOM_MODULE || 'happy-dom');
const root = new URL('../apps/shared-web/', import.meta.url);
function setup(t) {
  const w = new Window({width:1180, settings:{enableJavaScriptEvaluation:true,
    disableJavaScriptFileLoading:true, disableCSSFileLoading:true,
    suppressInsecureJavaScriptEnvironmentWarning:true,
    navigation:{disableMainFrameNavigation:true,disableChildFrameNavigation:true,disableChildPageNavigation:true}}});
  w.document.write(readFileSync(new URL('index.html',root),'utf8'));
  for (const f of ['core.browser.js','catalogue.browser.js','catalogue-engine.browser.js','catalogue-ui.js']) w.eval(readFileSync(new URL(f,root),'utf8'));
  const el = id => w.document.getElementById(id);
  const input = (id,value,event='input') => { el(id).value=value; el(id).dispatchEvent(new w.Event(event,{bubbles:true})); };
  const select = id => { const b = w.document.querySelector('[data-entry-id="'+id+'"]'); assert.ok(b,id); b.click(); };
  const fill = () => {input('height','180');input('weight','80');input('reviewer','合成测试');input('renal-value','50');input('renal-method','虚构参数');el('renal-confirmed').checked=true;};
  const calculate = () => {el('confirmed').checked=true;el('calculate').click();};
  const result = () => JSON.parse(el('raw-result').textContent);
  t.after(()=>w.happyDOM.abort());
  return {w,el,input,select,fill,calculate,result};
}
test('Windows copy reports native acknowledgement and cannot copy an invalidated result', t => {
  const {w, el, fill, calculate, input} = setup(t);
  const sent = [], listeners = new Set();
  w.chrome = {webview: {
    postMessage: value => sent.push(value),
    addEventListener: (_, handler) => listeners.add(handler),
    removeEventListener: (_, handler) => listeners.delete(handler)
  }};
  fill(); calculate(); el('copy').click();
  assert.equal(sent.length, 1);
  assert.match(sent[0].value, /150\.00 mg/);
  assert.match(el('message').textContent, /正在复制/);
  for (const fn of listeners) fn({data:{type:'copySummaryResult',requestId:'unrelated',ok:true}});
  assert.match(el('message').textContent, /正在复制/);
  for (const fn of [...listeners]) fn({data:{type:'copySummaryResult',requestId:sent[0].requestId,ok:true}});
  assert.match(el('message').textContent, /已复制/);
  el('copy').click();
  for (const fn of [...listeners]) fn({data:{type:'copySummaryResult',requestId:sent[1].requestId,ok:false}});
  assert.match(el('message').textContent, /复制失败/);
  input('weight', '90'); el('copy').click();
  assert.equal(sent.length, 2);
});
test('launch opens a populated built-in regimen with source, dose, schedule and courses', t=>{
  const {w,el}=setup(t);
  assert.equal(w.ChemoAppReady,true);
  assert.equal(el('entry-title').textContent,'TCbHP（多西他赛）');
  assert.match(el('entry-source').textContent,/PDF 48、51 页 \/ 书页 31、34/);
  assert.equal(w.document.querySelectorAll('.drug-row').length,4);
  assert.match(el('dose-table').textContent,/75 mg\/m²/);
  assert.match(el('dose-table').textContent,/共6周期/);
  assert.equal(el('copy').disabled,true);
});
test('complete regimen calculation and copy bridge use the selected built-in rules',t=>{
  const {w,el,fill,calculate,result}=setup(t); let text='';w.AndroidBridge={copySummary:s=>{text=s;}};
  fill(); calculate(); assert.equal(result().rows.length,4);
  assert.match(el('dose-table').textContent,/450.00 mg/);
  assert.equal(el('bsa-value').textContent,'2.000');
  el('copy').click(); assert.match(text,/TCbHP（多西他赛）/); assert.match(text,/首剂 640.00 mg/);
});
test('missing inputs or kidney confirmation never leave partial or stale results',t=>{
  const {el,input,fill,calculate}=setup(t);
  calculate();assert.equal(el('raw-result').textContent,'');
  fill();calculate();input('renal-value','');calculate();
  assert.equal(el('raw-result').textContent,'');assert.equal(el('copy').disabled,true);
  assert.equal(el('audit').hidden,true);assert.doesNotMatch(el('dose-table').textContent,/450.00/);
  assert.match(el('message').textContent,/卡铂/);
});
test('every patient or reviewer edit invalidates results and confirmation',t=>{
  const {el,input,fill,calculate}=setup(t);
  for(const [id,value] of [['height','181'],['weight','81'],['renal-value','60'],['renal-method','新来源'],['reviewer','新核对人']]){
    fill();calculate();input(id,value);
    assert.equal(el('confirmed').checked,false,id);assert.equal(el('copy').disabled,true,id);
    assert.equal(el('raw-result').textContent,'',id);
  }
});
test('switching scheme preserves patient inputs, resets approval, and displays sequence phases',t=>{
  const {w,el,fill,calculate,select}=setup(t);fill();calculate();select('r018');
  assert.equal(el('height').value,'180');assert.equal(el('confirmed').checked,false);
  assert.equal(el('raw-result').textContent,'');assert.equal(w.document.querySelectorAll('.phase').length,2);
  assert.equal(w.document.querySelectorAll('.drug-row').length,6);
  assert.equal((el('dose-table').textContent.match(/帕博利珠单抗/g)||[]).length,2);
});
test('subtype filter, search with no results, and reference cards clear calculator state',t=>{
  const {el,input,fill,calculate,select}=setup(t);fill();calculate();input('subtype','三阴性','change');
  assert.equal(el('raw-result').textContent,'');assert.match(el('entry-meta').textContent,/三阴性/);
  input('search','不存在的方案');assert.equal(el('dose-workspace').hidden,true);
  assert.equal(el('dose-table').textContent,'');assert.equal(el('copy').disabled,true);
  input('search','');input('subtype','','change');select('c001');
  assert.equal(el('dose-workspace').hidden,true);assert.equal(el('reference-body').hidden,false);
  assert.match(el('reference-body').textContent,/TCbHP/);
});
test('oral dose is a single-drug reference and tamoxifen requires choosing one frequency',t=>{
  const {el,input,calculate,select,result}=setup(t);el('section-2').click();select('r056');input('reviewer','测试');calculate();
  assert.equal(el('raw-result').textContent,'');assert.match(el('message').textContent,/选择/);
  input('alt-r056-d01','0','change');calculate();assert.equal(result().rows[0].result.quantities[0].valueMg,10);
  assert.match(el('dose-table').textContent,/10.00 mg \/ 次；10 mg，每日2次/);
  input('alt-r056-d01','1','change');assert.equal(el('raw-result').textContent,'');calculate();
  assert.equal(result().rows[0].result.quantities[0].valueMg,20);
  assert.equal(el('renal-fields').hidden,true);
});
test('four sections are populated; radiation is read-only; clearing removes patient data',t=>{
  const {el,fill,calculate}=setup(t);fill();calculate();el('clear-patient').click();
  for(const id of ['height','weight','renal-value','renal-method','reviewer'])assert.equal(el(id).value,'');
  assert.equal(el('bsa-value').textContent,'—');assert.equal(el('confirmed').checked,false);
  for(let i=0;i<4;i++){el('section-'+i).click();assert.ok(el('entry-list').querySelectorAll('button').length>0);}
  assert.equal(el('dose-workspace').hidden,true);assert.match(el('entry-source').textContent,/PDF 95/);
  el('about-open').click();assert.equal(el('about-dialog').open,true);el('about-close').click();assert.equal(el('about-dialog').open,false);
});
test('unchecking either confirmation discards the existing dose sheet',t=>{
  const {w,el,fill,calculate}=setup(t);
  for(const id of ['confirmed','renal-confirmed']){
    fill();calculate();el(id).checked=false;el(id).dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(el('copy').disabled,true);assert.equal(el('raw-result').textContent,'');
  }
});
test('guide text and reviewer input are rendered as text, without executable HTML',t=>{
  const {w,el,input,fill,calculate,select}=setup(t);
  w.ChemoCatalogue.regimens[0].name='<img src=x onerror="window.bad=1">';select('r001');
  assert.equal(el('entry-title').querySelector('img'),null);
  fill();input('reviewer','<script>window.bad=1</script>');calculate();
  assert.equal(el('raw-result').querySelector('script'),null);assert.equal(w.bad,undefined);
});
