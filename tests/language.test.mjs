// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {Window}=await import(process.env.HAPPY_DOM_MODULE || 'happy-dom');
const root=new URL('../apps/shared-web/',import.meta.url);
function setup(t,page='index',lang='zh-Hans') {
  const w=new Window({url:'https://chemodose.invalid/'+page+'.html?lang='+lang,settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true,navigation:{disableMainFrameNavigation:true,disableChildFrameNavigation:true,disableChildPageNavigation:true}}});
  w.document.write(readFileSync(new URL(page+'.html',root),'utf8'));
  const files=['core.browser.js',...(page==='index'?['catalogue.browser.js','catalogue-engine.browser.js']:[]),'translations.browser.js','i18n.js',page==='index'?'catalogue-ui.js':'app.js'];
  for(const f of files)w.eval(readFileSync(new URL(f,root),'utf8'));
  const el=id=>w.document.getElementById(id);
  const input=(id,value,event='input')=>{el(id).value=value;el(id).dispatchEvent(new w.Event(event,{bubbles:true}));};
  const language=code=>input('language',code,'change');
  const calculate=()=>{el('confirmed').checked=true;if(page==='index')el('calculate').click();else el('dose-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
  t.after(()=>w.happyDOM.abort());return {w,el,input,language,calculate};
}
for(const lang of ['zh-Hans','zh-Hant','en']) {
 test(lang+': complete regimen arithmetic, copy and source numbers remain consistent',t=>{
  const {w,el,input,calculate}=setup(t,'index',lang);let copied;w.AndroidBridge={copySummary:v=>copied=v};
  for(const [id,v]of [['height','180'],['weight','80'],['renal-value','50'],['renal-method','原文方法：首剂'],['reviewer','核对人：医师']])input(id,v);
  el('renal-confirmed').checked=true;calculate();el('copy').click();
  const r=JSON.parse(el('raw-result').textContent);
  assert.deepEqual(r.rows.map(row=>row.result.quantities.map(q=>q.valueMg)),[[150],[450],[640,480],[840,420]]);
  assert.ok(copied.includes('原文方法：首剂'));assert.ok(copied.includes('核对人：医师'));
  assert.ok(copied.includes('48'));assert.ok(copied.includes('51'));assert.ok(copied.includes('150.00 mg'));
  assert.equal(w.document.documentElement.lang,lang);
  if(lang==='en'){assert.match(el('entry-title').textContent,/Docetaxel/);assert.match(copied,/Arithmetic verification sheet/);assert.match(el('entry-source').textContent,/PDF pages 48, 51 \/ printed pages 31, 34/);}
  if(lang==='zh-Hant')assert.match(el('dose-table').textContent,/卡鉑|曲妥珠單抗/);
 });
 test(lang+': all manual calculation methods preserve quantities and user text',t=>{
  const {w,el,input,calculate}=setup(t,'manual',lang);let copied;w.AndroidBridge={copySummary:v=>copied=v};
  for(const [kind,a,b,expected]of [['bsa',7.5,null,[15]],['bsa_range',7.5,10,[15,20]],['weight',2,null,[160]],['weight_seq',2,1,[160,80]],['fixed',15,null,[15]],['fixed_seq',15,10,[15,10]],['fixed_alt',15,10,[10]],['auc',2,null,[150]]]) {
   input('kind',kind,'change');
   for(const[id,v]of [['item-name','自填首剂'],['reference','自填来源：目录'],['reviewer','自填核对人'],['dose1',String(a)],['dose2',b===null?'':String(b)],['height','180'],['weight','80'],['renal-value','50'],['renal-method','原文方法']])input(id,v);
   if(kind==='fixed_alt'){input('schedule1','原文频次一');input('schedule2','原文频次二');input('alternative','1');}
   el('renal-confirmed').checked=true;calculate();assert.equal(el('form-error').hidden,true,el('form-error').textContent);
   assert.deepEqual(JSON.parse(el('raw-result').textContent).quantities.map(q=>q.valueMg),expected);el('copy').click();
   assert.ok(copied.includes('自填首剂'));assert.ok(copied.includes('自填来源：目录'));assert.ok(copied.includes('自填核对人'));
   if(kind==='fixed_alt')assert.ok(copied.includes('原文频次二'));
  }
 });
}
test('all displayed catalogue fields have English translations and the catalogue remains unmodified',t=>{
 const{w}=setup(t,'index','en');
 function check(value,path=''){
  if(Array.isArray(value))return value.forEach((v,i)=>check(v,path+'.'+i));
  if(value&&typeof value==='object')return Object.entries(value).forEach(([k,v])=>check(v,path+'.'+k));
  if(typeof value!=='string'||!/[\u3400-\u9fff]/u.test(value)||/fileName|filename|filePath|legacy|scope|verification/.test(path))return;
  const result=w.ChemoI18n.text(value);
  assert.doesNotMatch(result,/[\u3400-\u9fff]/u,path+' '+result);
  // Translating "twice daily" removes the Chinese digit 2; compare remaining medication numeric data using explicit source catalogue invariance separately.
 }
 check(w.ChemoCatalogue.regimens); check(w.ChemoCatalogue.referenceCards); check(w.ChemoCatalogue.source.title);
 assert.deepEqual(JSON.parse(JSON.stringify(w.ChemoCatalogue)),JSON.parse(readFileSync(new URL('../data/catalogue.json',import.meta.url),'utf8')));
});
test('English / Traditional search works across languages and invalidates prior results',t=>{
 const{el,input,language}=setup(t);language('en');input('search','Nab-paclitaxel');assert.ok(el('entry-list').querySelectorAll('button').length>0);assert.match(el('entry-list').textContent,/Nab-paclitaxel/);
 input('search','白蛋白紫杉醇');assert.ok(el('entry-list').querySelectorAll('button').length>0);
 language('zh-Hant');input('search','卡鉑');assert.ok(el('entry-list').querySelectorAll('button').length>0);
});
test('changing language preserves inputs and selected alternative but clears results and confirmations',t=>{
 const{w,el,input,calculate,language}=setup(t);el('section-2').click();w.document.querySelector('[data-entry-id="r056"]').click();input('reviewer','原文');input('alt-r056-d01','1','change');calculate();
 assert.notEqual(el('raw-result').textContent,'');language('en');
 assert.equal(el('alt-r056-d01').value,'1');assert.equal(el('reviewer').value,'原文');assert.equal(el('confirmed').checked,false);assert.equal(el('renal-confirmed').checked,false);
 assert.equal(el('raw-result').textContent,'');assert.equal(el('summary-text').textContent,'');assert.equal(el('copy').disabled,true);assert.match(el('message').textContent,/Language changed/);
 assert.match(w.document.querySelector('a').getAttribute('href'),/lang=en/);
 calculate();assert.equal(JSON.parse(el('raw-result').textContent).rows[0].result.quantities[0].valueMg,20);
});
test('language switch preserves the live BSA preview while invalidating dose results',t=>{
 const{el,input,language,calculate}=setup(t);
 for(const[id,v]of [['height','180'],['weight','80'],['renal-value','50'],['renal-method','合成'],['reviewer','合成']])input(id,v);
 el('renal-confirmed').checked=true;calculate();assert.equal(el('bsa-value').textContent,'2.000');
 language('en');assert.equal(el('bsa-value').textContent,'2.000');assert.equal(el('raw-result').textContent,'');
 language('zh-Hant');assert.equal(el('bsa-value').textContent,'2.000');assert.equal(el('height').value,'180');
});
test('manual language change retains coefficients, free text and frequency selection',t=>{
 const{el,input,language,calculate}=setup(t,'manual');el('example').click();input('kind','fixed_alt','change');input('dose1','15');input('dose2','10');input('schedule1','频次一');input('schedule2','频次二');input('alternative','1');calculate();language('zh-Hant');
 for(const[id,value]of [['dose1','15'],['dose2','10'],['schedule1','频次一'],['schedule2','频次二'],['alternative','1']])assert.equal(el(id).value,value);
 assert.equal(el('result-content').hidden,true);assert.equal(el('raw-result').textContent,'');assert.equal(el('confirmed').checked,false);
 calculate();assert.equal(JSON.parse(el('raw-result').textContent).quantities[0].valueMg,10);
});
test('English missing and bounded input errors are understandable and keep bounds',t=>{
 const{el,input,calculate}=setup(t,'manual','en');el('example').click();input('height','79');calculate();assert.match(el('form-error').textContent,/80–250/);assert.doesNotMatch(el('form-error').textContent,/[\u3400-\u9fff]/u);
 input('height','');calculate();assert.match(el('form-error').textContent,/Please enter Height/);
});
test('unsupported language is ignored and only allowed language preference is sent',t=>{
 const{w,el,language}=setup(t,'index','unsupported');assert.equal(w.document.documentElement.lang,'zh-Hans');const sent=[];w.AndroidBridge={saveLanguage:v=>sent.push(v)};
 w.ChemoI18n.setLanguage('file:///private');assert.equal(sent.length,0);language('en');assert.deepEqual(sent,['en']);assert.equal(el('height').placeholder,'Enter height');
});
test('late native clipboard acknowledgement cannot overwrite the language-change status',t=>{
 const{w,el,input,language,calculate}=setup(t);const sent=[],listeners=new Set();w.chrome={webview:{postMessage:v=>sent.push(v),addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f)}};
 for(const[id,v]of [['height','180'],['weight','80'],['renal-value','50'],['renal-method','合成'],['reviewer','合成']])input(id,v);el('renal-confirmed').checked=true;calculate();el('copy').click();language('en');
 for(const fn of [...listeners])fn({data:{type:'copySummaryResult',requestId:sent[0].requestId,ok:true}});
 assert.match(el('message').textContent,/Language changed/);assert.equal(listeners.size,0);assert.equal(el('copy').disabled,true);
});
