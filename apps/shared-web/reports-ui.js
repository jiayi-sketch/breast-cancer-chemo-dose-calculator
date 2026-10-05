/* SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial */
(function () {
  'use strict';
  const E=window.ReportEngine, cat=window.ChemoCatalogue, L=window.ChemoI18n;
  const el=id=>document.getElementById(id), t=s=>L.text(s);
  const fields=['ER','PR','IHC','ISH'], titles={ER:'ER',PR:'PR',IHC:'HER2 IHC',ISH:'ISH 最终结论',KI67:'Ki-67'};
  const contextOptions={
    phase:['当前治疗阶段',[['neo','术前新辅助治疗'],['adjuvant','直接手术后辅助治疗（未做新辅助）'],['post-neo','新辅助后术后治疗']]],
    menopause:['绝经状态',[['pre','未绝经'],['post','已绝经'],['uncertain','不确定'],['na','不适用']]],
    surgery:['已完成的乳腺肿瘤术式',[['none','尚未手术'],['mastectomy','乳房全切术'],['radical','改良根治术'],['conserving','保乳术'],['other','其他或未知']]],
    nodes:['淋巴结有无转移',[['positive','有转移'],['negative','无转移'],['uncertain','不确定或微转移']]]
  };
  const examples={
    her2:{biopsy:'【虚拟演示，不是真实病例】\n乳腺穿刺：浸润性癌。',ihc:'ER(80%+)，PR(20%+)；HER2(2+)；Ki-67(35%)。',fish:'HER2 FISH：扩增，最终结论阳性。'},
    tnbc:{biopsy:'【虚拟演示，不是真实病例】\n乳腺浸润性癌，组织学3级。',ihc:'ER：阴性(0%)；PR：阴性(0%)；HER2：0；Ki-67：70%。'},
    pending:{biopsy:'【虚拟演示，不是真实病例】\n浸润性乳腺癌。',ihc:'ER(90%+)；PR(60%+)；HER2(2+)；Ki-67(25%)。',fish:'HER2 FISH：结果待出。'}
  };
  let parsed=null, matched=null, activeSource='biopsy';
  function node(tag,text='',cls='') {const n=document.createElement(tag);n.textContent=t(text);if(cls)n.className=cls;return n;}
  function labelValue(v) {return E.VALUE_LABELS[v] || v;}
  function sources() {return Object.fromEntries(Object.keys(E.REPORT_SOURCES).map(k=>[k,el('report-'+k).value]));}
  function values() {return Object.fromEntries(fields.map(k=>[k,el('report-field-'+k).value]));}
  function context() {return {...Object.fromEntries(Object.keys(contextOptions).map(k=>[k,el('report-context-'+k).value])),reviewed:el('report-reviewed').checked,specialReviewed:el('report-special-reviewed').checked,correctionReason:el('report-correction-reason').value};}
  function status(text) {el('report-status').textContent=t(text);}
  function clearMatches() {
    matched=null;window.ChemoReportReview=null;
    el('report-matches').replaceChildren();el('report-result').replaceChildren();
    el('report-result').append(node('p','资料已变更，请重新核对后匹配。','hint'));
    el('report-reviewed').checked=false;el('report-special-reviewed').checked=false;
    window.ChemoCatalogueUI.invalidate();
  }
  function invalidateReports() {
    parsed=null;clearMatches();el('reports-match').disabled=true;
    fields.forEach(k=>{el('report-field-'+k).value='unknown';});
    Object.keys(contextOptions).forEach(k=>{el('report-context-'+k).value='';});
    el('report-correction-reason').value='';el('report-evidence').replaceChildren();
    el('report-stage-hint').textContent=t(E.suggestReportStage(sources()));
    status('报告已变化，请重新识别。');
    Object.keys(E.REPORT_SOURCES).forEach(k=>{el('report-tab-'+k).textContent=t(E.REPORT_SOURCES[k])+(el('report-'+k).value.trim()?' ●':'');});
  }
  function selectSource(k) {
    activeSource=k;
    Object.keys(E.REPORT_SOURCES).forEach(key=>{el('report-editor-'+key).hidden=key!==k;el('report-tab-'+key).setAttribute('aria-pressed',String(key===k));});
  }
  function makeSelect(parent,id,title,options) {
    const label=node('label',title), select=document.createElement('select');select.id=id;
    options.forEach(([value,text])=>{const o=node('option',text);o.value=value;select.append(o);});
    label.append(select);parent.append(label);select.addEventListener('change',clearMatches);
  }
  for (const [key,title] of Object.entries(E.REPORT_SOURCES)) {
    const button=node('button',title);button.type='button';button.id='report-tab-'+key;
    button.addEventListener('click',()=>selectSource(key));el('report-source-tabs').append(button);
    const label=node('label',title);label.id='report-editor-'+key;
    const textarea=document.createElement('textarea');textarea.id='report-'+key;textarea.rows=10;textarea.maxLength=E.REPORT_LIMIT;
    textarea.autocomplete='off';textarea.spellcheck=false;textarea.setAttribute('data-no-translate','');
    textarea.addEventListener('input',invalidateReports);label.append(textarea);el('report-editors').append(label);
  }
  fields.forEach(k=>makeSelect(el('report-fields'),'report-field-'+k,titles[k],E.REPORT_VALUES[k].map(v=>[v,labelValue(v)])));
  Object.entries(contextOptions).forEach(([k,[title,options]])=>makeSelect(el('report-context'),'report-context-'+k,title,[['','请选择'],...options]));
  el('report-correction-reason').addEventListener('input',clearMatches);
  ['report-reviewed','report-special-reviewed'].forEach(id=>el(id).addEventListener('change',()=>{
    matched=null;window.ChemoReportReview=null;el('report-matches').replaceChildren();el('report-result').replaceChildren();window.ChemoCatalogueUI.invalidate();
  }));
  function renderEvidence() {
    el('report-evidence').replaceChildren();
    if (!parsed) return;
    for (const key of E.REPORT_FIELDS) {
      const field=parsed.fields[key], row=node('div','','report-evidence-row');
      row.append(node('strong',titles[key]+' · '+labelValue(field.value)));
      if (!field.evidence.length) row.append(node('p','未找到明确原文，请人工核实。','hint'));
      for (const evidence of field.evidence) {
        const source=node('p',E.REPORT_SOURCES[evidence.source],'report-evidence-source'), quote=document.createElement('blockquote');
        quote.textContent=evidence.text;quote.setAttribute('data-no-translate','');row.append(source,quote);
      }
      el('report-evidence').append(row);
    }
  }
  el('reports-analyze').addEventListener('click',()=>{
    invalidateReports();
    try {
      parsed=E.parseReports(sources());
      fields.forEach(k=>{el('report-field-'+k).value=parsed.fields[k].value;});
      renderEvidence();el('reports-match').disabled=false;
      status('已识别，请核对原文、修正结果并补充治疗阶段。');
    } catch (error) {status(error.message);}
  });
  el('reports-clear').addEventListener('click',()=>{
    Object.keys(E.REPORT_SOURCES).forEach(k=>{el('report-'+k).value='';});
    invalidateReports();el('clear-patient').click();status('报告、核对信息和计算参数已清空。');selectSource('biopsy');
  });
  el('reports-example-load').addEventListener('click',()=>{
    el('reports-clear').click();
    const example=examples[el('report-example').value];
    Object.keys(E.REPORT_SOURCES).forEach(k=>{el('report-'+k).value=example[k] || '';});
    invalidateReports();selectSource('ihc');status('已载入虚拟示例，请点击识别报告。');
  });
  el('reports-match').addEventListener('click',()=>{
    if (!parsed) return;
    matched=E.matchReportCatalogue(parsed,values(),context(),cat);
    el('report-result').replaceChildren();el('report-matches').replaceChildren();
    const facts=values(), ctx=context(), currentMatch=matched;
    if (matched.subtype) el('report-result').append(node('p','目录分型：'+matched.subtype));
    matched.issues.forEach(s=>el('report-result').append(node('p',s,'report-error')));
    matched.notes.forEach(s=>el('report-result').append(node('p',s,'hint')));
    if (matched.status!=='ok') return;
    el('report-result').append(node('p','请选择并核对方案详情，再进入剂量计算。','hint'));
    for (const entry of [...matched.matches,...matched.references]) {
      const card=node('div','','report-match-card');
      card.append(node('strong',entry.name),node('p',window.RegimenEngine.sourceLabel(entry),'hint'));
      const button=node('button',entry.drugs?'查看方案并核对剂量':'查看指南摘要');button.dataset.reportEntryId=entry.id;
      button.addEventListener('click',()=>{
        if (matched!==currentMatch || !el('report-reviewed').checked) return;
        if (window.ChemoCatalogueUI.openEntry(entry.id)) {
          window.ChemoReportReview={version:E.REPORT_VERSION,catalogueVersion:cat.version,subtype:currentMatch.subtype,
            fields:{...facts},phase:ctx.phase,correctedFields:[...currentMatch.corrected],correctionReason:ctx.correctionReason,
            entryId:entry.id,catalogueOnly:true};
        }
      });
      card.append(button);el('report-matches').append(card);
    }
  });
  el('reports-open').addEventListener('click',()=>{
    el('report-workspace').hidden=false;el('catalogue-workspace').hidden=true;
    el('reports-open').setAttribute('aria-pressed','true');
    document.querySelectorAll('#sections button').forEach(b=>{b.classList.remove('is-current');b.setAttribute('aria-current','false');});
    window.ChemoCatalogueUI.invalidate();
  });
  el('reports-close').addEventListener('click',()=>{
    el('report-workspace').hidden=true;el('catalogue-workspace').hidden=false;el('reports-open').setAttribute('aria-pressed','false');
    window.ChemoCatalogueUI.invalidate();
  });
  document.addEventListener('chemo-language-change',()=>{
    // Preserve source text and corrected values. Rebuild only controlled labels.
    for (const [k,title] of Object.entries(E.REPORT_SOURCES)) {
      el('report-tab-'+k).textContent=t(title)+(el('report-'+k).value.trim()?' ●':'');
      el('report-editor-'+k).firstChild.nodeValue=t(title);
    }
    fields.forEach(k=>{const select=el('report-field-'+k);select.parentElement.firstChild.nodeValue=t(titles[k]);[...select.options].forEach(o=>{o.textContent=t(labelValue(o.value));});});
    Object.entries(contextOptions).forEach(([k,[title,options]])=>{
      const select=el('report-context-'+k);select.parentElement.firstChild.nodeValue=t(title);
      [...select.options].forEach(o=>{o.textContent=t(options.find(([v])=>v===o.value)?.[1] || '请选择');});
    });
    renderEvidence();clearMatches();el('report-stage-hint').textContent=t(E.suggestReportStage(sources()));
    status('语言已切换，请重新核对后匹配。');
  });
  selectSource(activeSource);invalidateReports();status('请分别粘贴报告文字，或载入虚拟示例。');
  window.ChemoReportReady=true;
}());
