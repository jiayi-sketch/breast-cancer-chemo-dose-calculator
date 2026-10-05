/* SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial */
(function () {
  'use strict';
  const $=id=>document.getElementById(id), t=s=>window.ChemoI18n.text(s);
  let generation=0, pending=null, watch=false, lastClipboard='', worker=null, busy=false;
  const MAX_BYTES=12*1024*1024, MAX_PIXELS=20000000;
  function status(s){$('report-import-status').textContent=t(s);}
  function cancel(){generation++;pending=null;busy=false;if(worker){worker.terminate().catch(()=>{});worker=null;}status('');}
  function bridge(message){
    if(window.webkit?.messageHandlers?.reportImport)window.webkit.messageHandlers.reportImport.postMessage(message);
    else if(window.AndroidBridge?.reportImport)window.AndroidBridge.reportImport(JSON.stringify(message));
    else if(window.chrome?.webview)window.chrome.webview.postMessage(message);
    else return false;
    return true;
  }
  function begin(automatic=false){cancel();if(!automatic)window.ChemoReportUI.prepareImport();pending={requestId:String(generation),source:window.ChemoReportUI.source};busy=true;return {...pending};}
  function current(request){return pending && request.requestId===pending.requestId && request.source===pending.source;}
  function done(text,request,ocr=false){
    if(!current(request))return;
    if(typeof text!=='string'||!text.trim()||text.length>40000){fail(request);return;}
    pending=null;busy=false;
    window.ChemoReportUI.importText(text,request.source,ocr);
    status(ocr?'图片文字已识别，请逐字核对标志物、百分比和阳性/阴性。':'剪贴板文字已导入，请核对原文。');
  }
  function fail(request){if(!current(request))return;pending=null;busy=false;window.ChemoReportUI.prepareImport();status('未能导入。请使用清晰的 PNG/JPEG 截图，或直接粘贴报告文字。');}
  async function image(data,request){
    if(!current(request))return;
    let localWorker=null;
    window.ChemoReportUI.prepareImport();pending=request;busy=true;
    try{
      if(typeof data!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(data)||data.length>MAX_BYTES*4/3+100)throw Error('image');
      const img=new Image();img.src=data;await img.decode();
      if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>MAX_PIXELS)throw Error('pixels');
      if(!current(request))return;
      status('正在本机识别截图，请稍候…');
      localWorker=await window.Tesseract.createWorker('eng+chi_sim+chi_tra',1,{
        workerPath:new URL('ocr/worker.min.js',location.href).href,
        corePath:new URL('ocr/',location.href).href,
        langPath:new URL('ocr/',location.href).href,
        workerBlobURL:false,cacheMethod:'none',gzip:true,
        errorHandler:()=>{if(current(request))fail(request);}
      });
      if(!current(request))return;
      worker=localWorker;
      const result=await localWorker.recognize(data);done(result.data.text,request,true);
    }catch(error){fail(request);}finally{if(localWorker){await localWorker.terminate().catch(()=>{});if(worker===localWorker)worker=null;}}
  }
  function receive(message){
    const request=pending;
    if(!request||!message||message.requestId!==request.requestId)return;
    if(message.cancelled){cancel();return;}
    if(message.started){window.ChemoReportUI.prepareImport();pending=request;busy=true;status('正在本机识别截图，请稍候…');return;}
    if(message.error){fail(request);return;}
    if(message.text!==undefined)done(message.text,request,!!message.ocr);
    else if(message.image)void image(message.image,request);
    else fail(request);
  }
  function request(kind,automatic=false){
    if(busy)return;
    const r=begin(automatic);
    if(bridge({type:'reportImport',kind,automatic,...r}))return;
    if(kind==='image'){$('report-image-file').click();return;}
    if(navigator.clipboard?.readText)navigator.clipboard.readText().then(text=>{
      if(automatic && (text===lastClipboard||!/\b(?:ER|PR|HER[ -]?2|Ki[ -]?67)\b|乳腺|病理|免疫组化|免疫組化/i.test(text))){cancel();return;}
      lastClipboard=text;done(text,r);
    }).catch(()=>fail(r));else fail(r);
  }
  $('report-import-clipboard').addEventListener('click',()=>request('clipboard'));
  $('report-import-image').addEventListener('click',()=>request('image'));
  $('report-image-file').addEventListener('cancel',cancel);
  $('report-image-file').addEventListener('change',async()=>{
    const file=$('report-image-file').files?.[0],r=pending;$('report-image-file').value='';
    if(!r)return;if(!file){cancel();return;}
    if(file.size>MAX_BYTES||!['image/png','image/jpeg','image/webp'].includes(file.type)){fail(r);return;}
    const reader=new FileReader();reader.onload=()=>image(reader.result,r);reader.onerror=()=>fail(r);reader.readAsDataURL(file);
  });
  $('report-clipboard-watch').addEventListener('change',()=>{watch=$('report-clipboard-watch').checked;bridge({type:'reportWatch',enabled:watch});if(watch)request('clipboard',true);});
  function foreground(){if(watch && !document.hidden)request('clipboard',true);}
  window.addEventListener('focus',foreground);document.addEventListener('visibilitychange',foreground);
  document.addEventListener('paste',event=>{
    if(!$('report-workspace').hidden){
      const text=event.clipboardData?.getData('text/plain');
      if(text && event.target?.id==='report-'+window.ChemoReportUI.source){event.preventDefault();const r=begin();done(text,r);return;}
      const file=[...(event.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));
      if(file){event.preventDefault();if(window.webkit?.messageHandlers?.reportImport){request('clipboard');return;}const r=begin();if(file.size>MAX_BYTES){fail(r);return;}const reader=new FileReader();reader.onload=()=>image(reader.result,r);reader.readAsDataURL(file);}
    }
  });
  document.addEventListener('chemo-language-change',cancel);
  if(window.chrome?.webview)window.chrome.webview.addEventListener('message',event=>{if(event.data?.type==='reportImportResult')receive(event.data);});
  window.ChemoImport={receive,cancel,foreground,request,get busy(){return busy;}};
}());
