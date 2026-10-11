// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const {Window}=await import(process.env.HAPPY_DOM_MODULE||'happy-dom');
const root=new URL('../apps/shared-web/',import.meta.url);
function backend(){let content='{"schemaVersion":1,"autoSave":true,"records":[]}',revision=0;return {fail:false,conflict:false,get data(){return JSON.parse(content)},async call(m){if(this.fail)return {ok:false,error:'storage'};if(m.op==='read')return{ok:true,content,revision:String(revision)};if(this.conflict){this.conflict=false;revision++;return{ok:false,error:'conflict'}};if(m.revision!==String(revision))return{ok:false,error:'conflict'};content=m.content;revision++;return{ok:true};}};}
async function setup(t,store=backend(),page='index'){
 const w=new Window({url:'https://chemodose.invalid/'+page+'.html',settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});w.ChemoHistoryBackend=m=>store.call(m);w.document.write(readFileSync(new URL(page+'.html',root),'utf8'));
 for(const f of ['core.browser.js','history-engine.browser.js',...(page==='index'?['catalogue.browser.js','catalogue-engine.browser.js']:[]),'translations.browser.js','i18n.js','history-ui.js',page==='index'?'catalogue-ui.js':'app.js'])w.eval(readFileSync(new URL(f,root),'utf8'));
 const el=id=>w.document.getElementById(id),input=(id,v)=>{el(id).value=v;el(id).dispatchEvent(new w.Event('input',{bubbles:true}))};
 const calculate=async()=>{if(page==='index'){for(const[id,v]of [['height','180'],['weight','80'],['renal-value','50'],['patient-age','45'],['hospital-number','0000123']])input(id,v);el('renal-confirmed').checked=true;el('confirmed').checked=true;el('calculate').click();}else{el('example').click();input('hospital-number','0000123');input('patient-age','45');el('confirmed').checked=true;el('dose-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}await new Promise(r=>setImmediate(r));await w.ChemoHistory.drain();};
 t.after(()=>w.happyDOM.abort());await w.ChemoHistory.ready;return{w,el,input,calculate,store};
}
test('successful calculation persists and reopened UI starts without patient loading',async t=>{
 const a=await setup(t);await a.calculate();assert.equal(a.store.data.records.length,1);assert.equal(a.store.data.records[0].patient.hospitalNumber,'0000123');assert.equal(a.el('reviewer'),null);assert.match(a.el('history-save-status').textContent,/已保存/);
 const b=await setup(t,a.store);assert.equal(b.el('hospital-number').value,'');assert.equal(b.el('raw-result').textContent,'');b.input('history-query','0000123');assert.equal(b.el('history-list').querySelectorAll('button').length,1);b.el('history-list').querySelector('button').click();assert.match(b.el('history-preview').textContent,/0000123/);
 b.el('history-restore').click();assert.equal(b.el('hospital-number').value,'0000123');assert.equal(b.el('patient-age').value,'45');assert.equal(b.el('confirmed').checked,false);assert.equal(b.el('renal-confirmed').checked,false);assert.equal(b.el('raw-result').textContent,'');assert.equal(b.w.ChemoReportReview,null);
});
test('deleting requires confirmation and disabling autosave persists',async t=>{
 const a=await setup(t);await a.calculate();a.el('history-list').querySelector('button').click();a.el('history-delete').click();assert.equal(a.store.data.records.length,1);a.el('history-cancel-delete').click();assert.equal(a.store.data.records.length,1);a.el('history-delete').click();a.el('history-confirm-delete').click();await a.w.ChemoHistory.drain();assert.equal(a.store.data.records.length,0);
 a.el('history-auto-save').checked=false;a.el('history-auto-save').dispatchEvent(new a.w.Event('change'));await a.w.ChemoHistory.drain();await a.calculate();assert.equal(a.store.data.autoSave,false);assert.equal(a.store.data.records.length,0);const b=await setup(t,a.store);assert.equal(b.el('history-auto-save').checked,false);
});
test('CAS conflicts retry; storage errors remain visible without losing current results',async t=>{
 const a=await setup(t);a.store.conflict=true;await a.calculate();assert.equal(a.store.data.records.length,1);a.store.fail=true;await a.calculate();assert.match(a.el('history-save-status').textContent,/失败/);assert.ok(a.el('raw-result').textContent);assert.equal(a.store.data.records.length,1);
});
test('dynamic history controls translate without removing query input',async t=>{
 const a=await setup(t);await a.calculate();for(const [code,label] of [['en','History'],['zh-Hant','歷史記錄'],['zh-Hans','历史记录']]){a.w.ChemoI18n.setLanguage(code);assert.equal(a.el('history-open').textContent,label);assert.ok(a.el('history-query'));assert.ok(a.el('history-auto-save'));}a.input('history-query','<script>');assert.equal(a.el('history-list').querySelector('script'),null);
});
test('manual calculations retain numeric evidence and restore without approval',async t=>{
 const a=await setup(t,backend(),'manual');await a.calculate();assert.equal(a.store.data.records.length,1);assert.equal(a.store.data.records[0].results[0].quantities[0].valueMg,15);a.el('history-list').querySelector('button').click();a.el('history-restore').click();assert.equal(a.el('hospital-number').value,'0000123');assert.equal(a.el('confirmed').checked,false);assert.equal(a.el('result-content').hidden,true);
});
test('packaged pages load history engine before consumers and no reviewer field remains',()=>{
 for(const page of ['index','manual']){const html=readFileSync(new URL(page+'.html',root),'utf8');const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);assert.ok(scripts.indexOf('history-engine.browser.js')>=0);assert.ok(scripts.indexOf('history-engine.browser.js')<scripts.indexOf('history-ui.js'));assert.ok(scripts.indexOf('history-engine.browser.js')<scripts.indexOf(page==='index'?'catalogue-engine.browser.js':'app.js'));assert.doesNotMatch(html,/id="reviewer"/);if(page==='index')assert.ok(scripts.includes('history-selftest.js'));for(const script of scripts)assert.ok(readFileSync(new URL(script,root)).length,script);}
});
test('native history self-test restores the language preference',async t=>{
 const a=await setup(t);a.w.eval(readFileSync(new URL('history-selftest.js',root),'utf8'));a.w.ChemoI18n.setLanguage('en');const result=await a.w.runHistorySelfTest();assert.equal(result.passed,true);assert.equal(a.w.ChemoI18n.language,'en');
});
