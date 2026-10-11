/* SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial */
// Explicitly invoked only by native --self-test harnesses, with fictional data.
window.runHistorySelfTest=async function(){
 const el=id=>document.getElementById(id);window.ChemoI18n.setLanguage('zh-Hans');
 await window.ChemoHistory.ready;await window.ChemoHistory.drain();
 if(!window.ChemoHistory.available)throw new Error('History unavailable');
 await window.ChemoHistory.save({kind:'regimen',entryId:'r001',title:'SYNTHETIC history test',patient:{ageYears:45,hospitalNumber:'0000123-SYNTHETIC'},inputs:{heightCm:180,weightKg:80,renalFunction:{value:50,unit:'mL/min'}},summary:'Synthetic patient record only',results:[]});
 if(!el('history-save-status').textContent.includes('已保存'))throw new Error('History save failed');
 el('history-query').value='0000123-SYNTHETIC';el('history-query').dispatchEvent(new Event('input',{bubbles:true}));
 const row=el('history-list').querySelector('button');if(!row)throw new Error('History search failed');row.click();
 if(el('history-preview').textContent!=='Synthetic patient record only')throw new Error('History preview');
 el('history-restore').click();
 if(el('hospital-number').value!=='0000123-SYNTHETIC'||el('patient-age').value!=='45'||el('confirmed').checked||el('renal-confirmed').checked||el('raw-result').textContent)throw new Error('History approval reset');
 for(const [code,label]of [['en','History'],['zh-Hant','歷史記錄'],['zh-Hans','历史记录']]){window.ChemoI18n.setLanguage(code);if(el('history-open').textContent!==label||!el('history-query'))throw new Error('History language');}
 el('history-delete').click();el('history-confirm-delete').click();await window.ChemoHistory.drain();
 if(el('history-list').querySelector('button'))throw new Error('History deletion');
 el('history-query').value='';el('history-query').dispatchEvent(new Event('input',{bubbles:true}));
 return {passed:true,syntheticOnly:true,checks:['native encrypted save','query','preview','restore resets confirmation','three languages','delete']};
};
