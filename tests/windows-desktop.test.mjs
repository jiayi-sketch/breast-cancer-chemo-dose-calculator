// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
const root=new URL('../apps/shared-web/',import.meta.url);
function setup(t){
 const w=new Window({settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write(readFileSync(new URL('index.html',root),'utf8'));
 for(const file of ['core.browser.js','catalogue.browser.js','catalogue-engine.browser.js','translations.browser.js','i18n.js','catalogue-ui.js'])w.eval(readFileSync(new URL(file,root),'utf8'));
 w.eval(readFileSync(new URL('../windows/web/desktop.js',root),'utf8'));
 const el=id=>w.document.getElementById(id);
 const input=(id,value,event='input')=>{el(id).value=value;el(id).dispatchEvent(new w.Event(event,{bubbles:true}));w.ChemoWindowsDesktop.synchronize();};
 const fill=()=>{for(const [id,value]of [['height','180'],['weight','80'],['renal-value','50'],['reviewer','Synthetic QA']])input(id,value);el('renal-confirmed').checked=true;el('confirmed').checked=true;el('calculate').click();};
 t.after(()=>w.happyDOM.abort());return{w,el,input,fill};
}
test('compact regimen picker follows the real selection path, retaining inputs and removing stale doses',t=>{
 const{w,el,input,fill}=setup(t);fill();assert.match(el('dose-table').textContent,/450.00/);
 input('windows-regimen','r018','change');assert.equal(el('entry-title').textContent,el('windows-regimen').selectedOptions[0].textContent);
 assert.equal(el('height').value,'180');assert.equal(el('raw-result').textContent,'');assert.equal(el('confirmed').checked,false);assert.equal(w.document.querySelectorAll('.drug-row').length,6);
 fill();input('weight','90');assert.equal(el('raw-result').textContent,'');assert.equal(el('copy').disabled,true);
});
test('setting, filters, empty results and reference cards keep the compact picker synchronized',t=>{
 const{el,input}=setup(t);input('subtype','三阴性','change');assert.match(el('entry-meta').textContent,/三阴性/);
 input('search','nonexistent synthetic scheme');assert.equal(el('windows-regimen').disabled,true);assert.equal(el('dose-workspace').hidden,true);assert.equal(el('detail').querySelector('.patient-panel').hidden,true);
 input('search','');input('subtype','','change');input('windows-regimen','c001','change');assert.equal(el('reference-body').hidden,false);assert.equal(el('detail').querySelector('.patient-panel').hidden,true);
 input('windows-setting','section-2','change');assert.equal(el('section-2').classList.contains('is-current'),true);assert.ok(el('windows-regimen').options.length>0);
});
test('three languages retain the same catalogue ID, translate labels and reset confirmations',t=>{
 const{w,el,fill}=setup(t);
 for(const code of ['zh-Hant','en','zh-Hans']){fill();w.ChemoI18n.setLanguage(code);w.ChemoWindowsDesktop.synchronize();assert.equal(el('windows-regimen').value,'r001');assert.equal(el('windows-regimen').selectedOptions[0].textContent,el('entry-title').textContent);assert.equal(el('height').value,'180');assert.equal(el('raw-result').textContent,'');assert.equal(el('confirmed').checked,false);assert.equal(el('windows-notes').open,false);if(code==='en')assert.equal(el('windows-setting').getAttribute('aria-label'),'Treatment setting');}
});
