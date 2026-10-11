/* SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial */
(function () {
  'use strict';
  const E=window.HistoryEngine, L=window.ChemoI18n, t=s=>L.text(s);
  const el=id=>document.getElementById(id), pending=new Map();
  let state=E.emptyHistory(), selected=null, available=false, queue=Promise.resolve(), sequence=0;
  const labels=[];let statusSource='',registerLabels=true;
  function node(tag,text,id){const n=document.createElement(tag);if(text){n.textContent=t(text);if(registerLabels)labels.push({node:n,source:text});}if(id)n.id=id;return n;}
  function receive(message){const p=pending.get(message?.requestId);if(!p)return;pending.delete(message.requestId);clearTimeout(p.timer);message.ok?p.resolve(message):p.reject(new Error(message.error==='conflict'?'conflict':'本机历史记录读写失败，已有记录未修改。'));}
  function native(message){
    if(window.ChemoHistoryBackend)return Promise.resolve(window.ChemoHistoryBackend(message)).then(result=>{if(!result.ok)throw new Error(result.error==='conflict'?'conflict':'本机历史记录读写失败，已有记录未修改。');return result;});
    return new Promise((resolve,reject)=>{
      message={...message,type:'history',requestId:'history-'+Date.now()+'-'+(++sequence)};
      const timer=setTimeout(()=>{pending.delete(message.requestId);reject(new Error('本机历史记录读写失败，已有记录未修改。'));},10000);
      pending.set(message.requestId,{resolve,reject,timer});
      try {
        if(window.webkit?.messageHandlers?.history)window.webkit.messageHandlers.history.postMessage(message);
        else if(window.AndroidBridge?.history)window.AndroidBridge.history(JSON.stringify(message));
        else if(window.chrome?.webview)window.chrome.webview.postMessage(message);
        else throw new Error('当前环境不支持本机历史记录。');
      } catch(error){clearTimeout(timer);pending.delete(message.requestId);reject(error);}
    });
  }
  window.chrome?.webview?.addEventListener('message',event=>{if(event.data?.type==='historyResult')receive(event.data);});
  const open=node('button','历史记录','history-open');open.type='button';
  const host=document.querySelector('.header-actions')||document.querySelector('.intro');host?.append(open);
  const inlineStatus=node('span',null,'history-save-status');inlineStatus.setAttribute('role','status');(document.querySelector('.patient-panel')||document.getElementById('dose-form')||host)?.append(inlineStatus);
  const dialog=node('dialog',null,'history-dialog');
  dialog.setAttribute('aria-labelledby','history-title');
  const heading=node('div');heading.className='history-heading';heading.append(node('h2','本机历史记录','history-title'));
  const close=node('button','关闭','history-close');close.type='button';close.addEventListener('click',()=>dialog.close());heading.append(close);dialog.append(heading);
  const policy=node('label');policy.className='history-policy';const auto=node('input',null,'history-auto-save');auto.type='checkbox';auto.checked=true;auto.disabled=true;policy.append(auto,node('span','计算成功后自动保存本机历史'));dialog.append(policy);
  dialog.append(node('p','仅在本机保存年龄、住院号、计算参数、方案和剂量结果；不保存病理原文或截图。不上传，不在打开软件时自动载入患者。'));
  const queryLabel=node('label');queryLabel.append(node('span','查询')); const query=node('input',null,'history-query');query.type='search';query.autocomplete='off';queryLabel.append(query);dialog.append(queryLabel);
  const status=node('p',null,'history-status');status.setAttribute('role','status');dialog.append(status);
  const body=node('div');body.className='history-layout';const list=node('div',null,'history-list');list.setAttribute('aria-label',t('历史记录列表'));const preview=node('pre',null,'history-preview');preview.setAttribute('data-no-translate','');body.append(list,preview);dialog.append(body);
  const actions=node('div');actions.className='history-actions';
  const reload=node('button','刷新','history-refresh'),restore=node('button','载入参数重新核对','history-restore'),remove=node('button','删除所选记录','history-delete'),clear=node('button','清空历史记录','history-clear');
  for(const b of [reload,restore,remove,clear]){b.type='button';actions.append(b);}dialog.append(actions);
  const confirmation=node('div',null,'history-confirmation');confirmation.hidden=true;
  confirmation.append(node('p','删除后无法恢复，请确认。'));const yes=node('button','确认删除','history-confirm-delete'),no=node('button','取消','history-cancel-delete');yes.type=no.type='button';confirmation.append(yes,no);dialog.append(confirmation);
  document.body.append(dialog);registerLabels=false;let deletion=null;
  function message(source){statusSource=source;status.textContent=t(source);inlineStatus.textContent=t(source);}
  function render(){
    list.replaceChildren();const matches=E.searchHistory(state.records,query.value);
    for(const record of matches){const b=node('button');b.type='button';b.setAttribute('aria-pressed',String(record.id===selected?.id));
      b.textContent=[record.patient.hospitalNumber||t('未填写住院号'),record.patient.ageYears===null?t('未填写年龄'):record.patient.ageYears+' '+t('岁'),t(record.title),new Date(record.savedAt).toLocaleString()].join(' · ');
      b.addEventListener('click',()=>{selected=record;confirmation.hidden=true;render();});list.append(b);}
    if(!matches.length)list.append(node('p','没有匹配的历史记录。'));
    if(selected&&!state.records.some(r=>r.id===selected.id))selected=null;
    preview.textContent=selected?selected.summary:'';
    restore.disabled=!selected||(selected.kind==='regimen'&&!window.ChemoCatalogueUI)||(selected.kind==='manual'&&!window.ChemoManualUI);
    remove.disabled=!selected;clear.disabled=!state.records.length;auto.checked=state.autoSave;
  }
  async function load(){const response=await native({op:'read'});state=E.readHistory(response.content);available=true;auto.disabled=false;render();return response;}
  const ready=load().catch(error=>{available=false;message(error.message);});
  function mutate(operation){
    const job=queue.then(async()=>{await ready;if(!available)throw new Error('本机历史记录读写失败，已有记录未修改。');
      for(let attempt=0;attempt<3;attempt++){
        const response=await load();const next=E.changeHistory(state,operation);
        try{await native({op:'write',content:JSON.stringify(next),revision:response.revision});state=next;render();return;}catch(error){if(error.message!=='conflict')throw error;}
      }throw new Error('历史记录被另一窗口修改，请刷新后重试。');
    });queue=job.catch(()=>{});return job;
  }
  open.addEventListener('click',async()=>{confirmation.hidden=true;dialog.showModal();try{await load();message('历史记录仅供查阅；载入参数后须重新确认。');}catch(error){message(error.message);}});
  reload.addEventListener('click',()=>load().then(()=>message('历史记录已刷新。'),error=>message(error.message)));
  query.addEventListener('input',render);
  auto.addEventListener('change',()=>mutate({op:'preference',autoSave:auto.checked}).then(()=>message('历史保存设置已更新。'),error=>{render();message(error.message);}));
  for(const [b,op] of [[remove,'delete'],[clear,'clear']])b.addEventListener('click',()=>{deletion={op,id:selected?.id};confirmation.hidden=false;});
  no.addEventListener('click',()=>{confirmation.hidden=true;deletion=null;});
  yes.addEventListener('click',async()=>{if(!deletion)return;const operation=deletion;deletion=null;confirmation.hidden=true;try{await mutate(operation);message('历史记录已删除。');}catch(error){message(error.message);}});
  restore.addEventListener('click',()=>{if(!selected)return;try{if(selected.kind==='regimen')window.ChemoCatalogueUI.restoreHistory(selected);else window.ChemoManualUI.restoreHistory(selected);dialog.close();}catch(error){message(error.message);}});
  document.addEventListener('chemo-language-change',()=>{for(const label of labels)label.node.textContent=t(label.source);list.setAttribute('aria-label',t('历史记录列表'));if(statusSource)message(statusSource);render();});
  window.ChemoHistory={receive,ready,drain:()=>queue,
    async save(value){try{await ready;if(!available)throw new Error('本机历史记录读写失败，已有记录未修改。');if(!state.autoSave){message('本机历史自动保存已关闭。');return;}
      const record=E.normalizeRecord({...value,id:'record-'+Date.now()+'-'+(++sequence)+'-'+Math.random().toString(36).slice(2),savedAt:new Date().toISOString(),language:L.language,appVersion:window.ChemoCatalogue?.appVersion||window.DoseCore.ENGINE_VERSION,catalogueVersion:window.ChemoCatalogue?.version||''});
      await mutate({op:'add',record});message('已保存至本机历史。');
    }catch(error){message(error.message);}},
    get available(){return available;}
  };
}());
