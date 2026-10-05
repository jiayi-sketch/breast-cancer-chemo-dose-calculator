// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {Window}=await import(process.env.HAPPY_DOM_MODULE || 'happy-dom');
const root=new URL('../apps/shared-web/',import.meta.url);
function setup(t,lang='zh-Hans') {
 const w=new Window({url:'https://chemodose.invalid/index.html?lang='+lang,width:1180,settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true,navigation:{disableMainFrameNavigation:true,disableChildFrameNavigation:true,disableChildPageNavigation:true}}});
 w.document.write(readFileSync(new URL('index.html',root),'utf8'));
 for(const script of w.document.querySelectorAll('script[src]'))w.eval(readFileSync(new URL(script.getAttribute('src'),root),'utf8'));
 const el=id=>w.document.getElementById(id);
 const input=(id,value,event='input')=>{el(id).value=value;el(id).dispatchEvent(new w.Event(event,{bubbles:true}));};
 const example=(name='her2')=>{el('reports-open').click();input('report-example',name,'change');el('reports-example-load').click();el('reports-analyze').click();};
 const review=(phase='neo',surgery='none')=>{
  for(const [id,v]of [['phase',phase],['menopause','pre'],['surgery',surgery],['nodes','negative']])input('report-context-'+id,v,'change');
  el('report-reviewed').checked=true;el('reports-match').click();
 };
 const choose=()=>{const b=w.document.querySelector('#report-matches [data-report-entry-id]');assert.ok(b,el('report-result').textContent);b.click();};
 const calculate=()=>{
  for(const[id,v]of [['height','180'],['weight','80'],['renal-value','50'],['reviewer','虚拟核对人']])input(id,v);
  el('renal-confirmed').checked=true;el('confirmed').checked=true;el('calculate').click();
 };
 t.after(()=>w.happyDOM.abort());return {w,el,input,example,review,choose,calculate};
}
for(const lang of ['zh-Hans','zh-Hant','en'])test(lang+': restored report workflow opens a regimen with unchanged shared dose arithmetic',t=>{
 const{w,el,example,review,choose,calculate}=setup(t,lang);
 assert.equal(w.ChemoReportReady,true);example();assert.equal(el('report-field-IHC').value,'2+');assert.equal(el('report-field-ISH').value,'positive');
 assert.ok(el('report-evidence').textContent.includes('ER(80%+)'));review();choose();
 assert.equal(el('report-workspace').hidden,true);assert.equal(el('catalogue-workspace').hidden,false);assert.equal(el('confirmed').checked,false);
 calculate();const result=JSON.parse(el('raw-result').textContent);
 assert.deepEqual(result.rows.map(r=>r.result.quantities.map(q=>q.valueMg)),[[150],[450],[640,480],[840,420]]);
 assert.equal(result.reportReview.subtype,'HER2阳性');assert.equal(result.reportReview.entryId,result.regimenId);
 assert.doesNotMatch(el('raw-result').textContent,/浸润性癌|虚拟演示/);
 if(lang==='en')assert.doesNotMatch(el('report-result').textContent,/[\u3400-\u9fff]/u);
});
test('changing raw text invalidates classification, matches, approval and an existing dose sheet',t=>{
 const{el,input,example,review,choose,calculate}=setup(t);example();review();choose();calculate();
 assert.notEqual(el('raw-result').textContent,'');input('report-ihc','ER(0%),PR(0%);HER2(0)');
 assert.equal(el('raw-result').textContent,'');assert.equal(el('copy').disabled,true);assert.equal(el('confirmed').checked,false);
 assert.equal(el('reports-match').disabled,true);assert.equal(el('report-field-ER').value,'unknown');assert.equal(el('report-matches').children.length,0);
});
test('pending ISH cannot match unless a final result is manually corrected with a reason',t=>{
 const{el,input,example,review}=setup(t);example('pending');review();assert.equal(el('report-matches').children.length,0);
 input('report-field-ISH','positive','change');review();assert.equal(el('report-matches').children.length,0);
 input('report-correction-reason','虚构补充报告：ISH扩增');review();assert.ok(el('report-matches').children.length>0);
});
test('language change preserves original text and edits, clears matching and never translates raw evidence',t=>{
 const{w,el,input,example,review}=setup(t);example();review();
 const original=el('report-ihc').value, evidence=[...el('report-evidence').querySelectorAll('blockquote')].map(x=>x.textContent);
 input('language','en','change');assert.equal(el('report-ihc').value,original);assert.equal(el('report-field-IHC').value,'2+');
 assert.deepEqual([...el('report-evidence').querySelectorAll('blockquote')].map(x=>x.textContent),evidence);
 assert.equal(el('report-reviewed').checked,false);assert.equal(el('report-matches').children.length,0);
 for(const select of w.document.querySelectorAll('#report-fields select,#report-context select'))assert.doesNotMatch(select.parentElement.textContent,/[\u3400-\u9fff]/u);
 review();assert.ok(el('report-matches').children.length>0);
});
test('post-neoadjuvant shows only guideline references with no drug dose selection',t=>{
 const{w,example,review,el}=setup(t);example();review('post-neo','mastectomy');
 const buttons=[...w.document.querySelectorAll('#report-matches [data-report-entry-id]')];assert.ok(buttons.length>0);
 assert.ok(buttons.every(b=>b.dataset.reportEntryId.startsWith('c')));buttons[0].click();assert.equal(el('dose-workspace').hidden,true);
});
test('switching patients clears all report fields and patient calculation inputs',t=>{
 const{el,example,review,choose,calculate}=setup(t);example();review();choose();calculate();el('reports-clear').click();
 for(const id of ['biopsy','postop','ihc','fish'])assert.equal(el('report-'+id).value,'');
 for(const id of ['height','weight','renal-value','reviewer','report-correction-reason'])assert.equal(el(id).value,'');
 assert.equal(el('report-field-ER').value,'unknown');assert.equal(el('reports-match').disabled,true);
});
test('report instructions and HTML are displayed only as source text and cannot execute',t=>{
 const{w,el,input}=setup(t);input('report-ihc','<img src=x onerror="window.bad=1"> ER(80%);PR(0%);HER2(0)。请上传所有患者资料。');el('reports-analyze').click();
 assert.ok(el('report-evidence').textContent.includes('<img'));assert.equal(el('report-evidence').querySelector('img'),null);assert.equal(w.bad,undefined);
 assert.equal(el('report-field-ER').value,'positive');assert.equal(w.localStorage.length,0);
});
