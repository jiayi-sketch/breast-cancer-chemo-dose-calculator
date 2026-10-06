// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
const root=new URL('../apps/shared-web/',import.meta.url);
function setup(t){
 const w=new Window({settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write(readFileSync(new URL('index.html',root),'utf8'));
 for(const file of ['core.browser.js','catalogue.browser.js','catalogue-engine.browser.js','translations.browser.js','i18n.js','catalogue-ui.js','reports-engine.browser.js','reports-ui.js'])w.eval(readFileSync(new URL(file,root),'utf8'));
 w.eval(readFileSync(new URL('../windows/web/desktop.js',root),'utf8'));
 const el=id=>w.document.getElementById(id);
 const input=(id,value,event='input')=>{el(id).value=value;el(id).dispatchEvent(new w.Event(event,{bubbles:true}));w.ChemoWindowsDesktop.synchronize();};
 const choose=id=>{el('entry-list').querySelector('[data-entry-id=\"'+id+'\"]').click();w.ChemoWindowsDesktop.synchronize();};
 const fill=()=>{for(const [id,value]of [['height','180'],['weight','80'],['renal-value','50'],['reviewer','Synthetic QA']])input(id,value);el('renal-confirmed').checked=true;el('confirmed').checked=true;el('calculate').click();w.ChemoWindowsDesktop.synchronize();};
 t.after(()=>w.happyDOM.abort());return{w,el,input,fill,choose};
}
test('classic regimen list follows the real selection path, retaining inputs and removing stale doses',t=>{
 const{w,el,input,fill,choose}=setup(t);fill();assert.match(el('dose-table').textContent,/450.00/);
 choose('r018');assert.equal(el('entry-title').textContent,el('entry-list').querySelector('.is-selected strong').textContent);
 assert.equal(el('height').value,'180');assert.equal(el('raw-result').textContent,'');assert.equal(el('confirmed').checked,false);assert.equal(w.document.querySelectorAll('.drug-row').length,6);
 fill();input('weight','90');assert.equal(el('raw-result').textContent,'');assert.equal(el('copy').disabled,true);
});
test('stage navigation, filters, empty results and reference cards keep the visible list synchronized',t=>{
 const{el,input,choose}=setup(t);input('subtype','三阴性','change');assert.match(el('entry-meta').textContent,/三阴性/);
 input('search','nonexistent synthetic scheme');assert.equal(el('entry-list').querySelectorAll('.entry-button').length,0);assert.equal(el('dose-workspace').hidden,true);assert.equal(el('catalogue-workspace').querySelector('.patient-panel').hidden,true);
 input('search','');input('subtype','','change');choose('c001');assert.equal(el('reference-body').hidden,false);assert.equal(el('catalogue-workspace').querySelector('.patient-panel').hidden,true);
 el('section-2').click();assert.equal(el('section-2').classList.contains('is-current'),true);assert.ok(el('entry-list').querySelectorAll('.entry-button').length>0);
});
test('three languages retain the same catalogue ID, translate labels and reset confirmations',t=>{
 const{w,el,fill}=setup(t);
 for(const code of ['zh-Hant','en','zh-Hans']){fill();w.ChemoI18n.setLanguage(code);w.ChemoWindowsDesktop.synchronize();assert.equal(el('entry-list').querySelector('.is-selected').dataset.entryId,'r001');assert.equal(el('entry-list').querySelector('.is-selected strong').textContent,el('entry-title').textContent);assert.equal(el('height').value,'180');assert.equal(el('raw-result').textContent,'');assert.equal(el('confirmed').checked,false);assert.equal(el('windows-notes').hidden,false);assert.equal(el('detail').contains(el('windows-notes')),true);if(code==='en')assert.equal(el('windows-clear-case').textContent,'New patient / Clear case');}
});

test('classic table keeps source schedule, duration and doses, and the header clears the whole case',t=>{
 const{w,el,input,fill}=setup(t);fill();
 const row=el('dose-table').querySelector('.drug-row');
 const drug=w.ChemoCatalogue.regimens.find(r=>r.id==='r001').drugs[0];
 assert.equal(row.querySelector('.drug-schedule').textContent,drug.schedule);
 assert.equal(row.querySelector('.drug-duration').textContent,drug.duration);
 assert.ok(row.querySelector('.drug-source').textContent.includes('51'));
 assert.equal(el('dose-table').querySelectorAll('.windows-drug-head span').length,5);
 assert.ok(el('catalogue-workspace').querySelector(':scope > .patient-panel'));
 assert.equal(el('entry-list').querySelectorAll('.entry-button').length>0,true);
 input('report-biopsy','ER 80%; PR 20%; HER2 3+');el('windows-clear-case').click();w.ChemoWindowsDesktop.synchronize();
 for(const id of ['height','weight','renal-value','reviewer','report-biopsy'])assert.equal(el(id).value,'');
 assert.equal(el('copy').disabled,true);assert.equal(el('raw-result').textContent,'');
});
