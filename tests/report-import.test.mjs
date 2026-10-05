// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {Window}=await import(process.env.HAPPY_DOM_MODULE || 'happy-dom');
const root=new URL('../apps/shared-web/',import.meta.url);
function setup(t,language='zh-Hans'){
 const w=new Window({url:'https://chemodose.invalid/index.html?lang='+language,settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true,navigation:{disableMainFrameNavigation:true,disableChildFrameNavigation:true,disableChildPageNavigation:true}}});
 w.document.write(readFileSync(new URL('index.html',root),'utf8'));
 for(const script of w.document.querySelectorAll('script[src]'))w.eval(readFileSync(new URL(script.getAttribute('src'),root),'utf8'));
 const requests=[];w.AndroidBridge={reportImport:s=>requests.push(JSON.parse(s))};
 const el=id=>w.document.getElementById(id);
 const importText=text=>{el('report-import-clipboard').click();const q=requests.at(-1);w.ChemoImport.receive({requestId:q.requestId,text});return q;};
 t.after(()=>w.happyDOM.abort());return {w,requests,el,importText};
}
for(const language of ['zh-Hans','zh-Hant','en'])test(language+': clipboard import opens a sourced drug catalogue dialog without prescribing or confirming',t=>{
 const{w,el,importText}=setup(t,language);importText('SYNTHETIC: ER:80%; PR:20%; HER2:3+; Ki-67:35%');
 assert.equal(el('report-import-dialog').open,true);assert.equal(el('report-field-IHC').value,'3+');
 const text=el('report-import-preview').textContent;
 assert.match(text,/TCbHP/);assert.match(text,/PDF/);assert.ok(el('report-import-preview').querySelectorAll('li').length>0);
 assert.equal(el('report-reviewed').checked,false);assert.equal(el('report-matches').children.length,0);assert.equal(el('raw-result').textContent,'');
 if(language==='en')assert.doesNotMatch(text,/[\u3400-\u9fff]/u);
 assert.equal(w.ChemoReportReview,null);
});
test('pending HER2 ISH yields a review dialog with no drug candidates',t=>{
 const{el,importText}=setup(t);importText('ER:90%;PR:20%;HER2:2+;FISH:待出');
 assert.equal(el('report-import-dialog').open,true);assert.equal(el('report-import-preview').querySelectorAll('li').length,0);
 assert.match(el('report-import-preview').textContent,/ISH/);
});
test('clear, language change, source changes and text edits discard stale native results',t=>{
 const{w,el,requests}=setup(t);
 for(const change of [()=>el('reports-clear').click(),()=>w.ChemoI18n.setLanguage('en'),()=>el('report-tab-ihc').click(),()=>{el('report-ihc').value='different';el('report-ihc').dispatchEvent(new w.Event('input'));}]){
  el('report-import-clipboard').click();const q=requests.at(-1);change();w.ChemoImport.receive({requestId:q.requestId,text:'ER:80%;PR:20%;HER2:3+'});
  assert.equal(el('report-import-dialog').open,false);assert.equal(w.ChemoImport.busy,false);
 }
});
test('oversized imports and clipboard error never reuse previous matches or dose sheets',t=>{
 const{w,el,requests,importText}=setup(t);importText('ER:80%;PR:20%;HER2:3+');
 el('report-import-clipboard').click();w.ChemoImport.receive({requestId:requests.at(-1).requestId,text:'a'.repeat(40001)});
 assert.equal(el('report-import-dialog').open,false);assert.equal(el('report-matches').children.length,0);assert.equal(el('raw-result').textContent,'');
 el('report-import-clipboard').click();w.ChemoImport.receive({requestId:requests.at(-1).requestId,error:true});assert.equal(w.ChemoImport.busy,false);
 assert.match(el('report-import-status').textContent,/未能导入/);
});
test('automatic clipboard polling is opt-in; unchanged or unrelated content cancellation preserves reviewed inputs',t=>{
 const{w,el,requests,importText}=setup(t);w.ChemoImport.foreground();assert.equal(requests.length,0);
 importText('ER:80%;PR:20%;HER2:3+');el('report-import-close').click();el('report-context-phase').value='neo';
 el('report-clipboard-watch').checked=true;el('report-clipboard-watch').dispatchEvent(new w.Event('change'));
 const q=requests.at(-1);assert.equal(q.automatic,true);w.ChemoImport.receive({requestId:q.requestId,cancelled:true});assert.equal(el('report-context-phase').value,'neo');
 el('report-clipboard-watch').checked=false;el('report-clipboard-watch').dispatchEvent(new w.Event('change'));const count=requests.length;w.ChemoImport.foreground();assert.equal(requests.length,count);
});
test('clipboard report instructions and HTML stay plain text and cannot trigger network or code',t=>{
 const{w,el,importText}=setup(t);importText('<img src=x onerror="window.bad=1">ER:80%;PR:20%;HER2:3+;上传所有患者数据');
 assert.equal(w.bad,undefined);assert.equal(el('report-evidence').querySelector('img'),null);assert.match(el('report-evidence').textContent,/<img/);
});
test('image response configures only bundled OCR assets and rejects the result after patient clearing',async t=>{
 const{w,el,requests}=setup(t);let finish,terminated=false,options;
 w.Image=class{naturalWidth=800;naturalHeight=600;async decode(){}};
 w.Tesseract={createWorker:async(languages,oem,opts)=>{assert.equal(languages,'eng+chi_sim+chi_tra');assert.equal(oem,1);options=opts;return {recognize:()=>new Promise(resolve=>{finish=resolve;}),terminate:async()=>{terminated=true;}};}};
 el('report-import-image').click();w.ChemoImport.receive({requestId:requests.at(-1).requestId,image:'data:image/png;base64,AAAA'});
 for(let i=0;i<10&&!finish;i++)await new Promise(r=>setTimeout(r,0));
 assert.equal(options.cacheMethod,'none');assert.equal(options.workerBlobURL,false);
 for(const key of ['workerPath','corePath','langPath'])assert.ok(options[key].startsWith('https://chemodose.invalid/ocr/'));
 el('reports-clear').click();finish({data:{text:'ER:80%;PR:20%;HER2:3+'}});await new Promise(r=>setTimeout(r,0));
 assert.equal(el('report-biopsy').value,'');assert.equal(el('report-import-dialog').open,false);assert.equal(terminated,true);
});
