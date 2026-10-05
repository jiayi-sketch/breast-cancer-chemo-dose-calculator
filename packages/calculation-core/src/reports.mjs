// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
// Offline text extraction and catalogue retrieval, not diagnosis or treatment selection.
export const REPORT_VERSION = '2.0.0';
export const REPORT_LIMIT = 40000;
export const REPORT_SOURCES = {biopsy:'穿刺/术前病理', postop:'术后大病理', ihc:'免疫组化', fish:'HER2 FISH/ISH'};
export const REPORT_FIELDS = ['ER','PR','IHC','ISH','KI67'];
export const REPORT_VALUES = {
  ER:['unknown','negative','positive','low','conflict'], PR:['unknown','negative','positive','conflict'],
  IHC:['unknown','0','1+','2+','3+','conflict'], ISH:['unknown','negative','positive','conflict']
};
export const VALUE_LABELS = {unknown:'未明确',negative:'阴性',positive:'阳性',low:'低表达阳性',conflict:'结果冲突'};
const uncertain = /待查|待定|待出|待补|等待|未检测|未檢測|未行|未做|不确定|不確定|可疑|临界|臨界|界值|无法|無法|失败|失敗|建议|建議|如果|参考范围|參考範圍|判读标准|判讀標準|对照|對照|阈值|閾值|不支持[阳陽]性|未[见見][阳陽]性|不能|不除外|约|約|左右|control|pending|equivocal|indeterminate|not\s+(?:done|performed|positive|negative)|unable|borderline|approximately|approx\.?|around/i;
const negative = /阴性|陰性|未见(?:明显)?(?:基因)?扩增|未見(?:明顯)?(?:基因)?擴增|未检出(?:基因)?扩增|未檢出(?:基因)?擴增|未发现(?:基因)?扩增|未發現(?:基因)?擴增|未[扩擴]增|无(?:基因)?扩增|無(?:基因)?擴增|非[扩擴]增|不[扩擴]增|不支持[扩擴]增|非[阳陽]性|not\s+amplified|non[- ]?amplified|no\s+amplification|amplification\s+not\s+detected|negative/gi;
const positive = /阳性|陽性|[扩擴]增|amplified|positive/i;
const markers = /(?<ER>\bER(?![A-Za-z0-9])|雌激素受[体體])|(?<PR>\b(?:PgR|PR)(?![A-Za-z0-9])|孕激素受[体體])|(?<IHC>\bHER[ -]?2(?:\/neu)?|C[ -]?erbB[ -]?2|CerbB2)|(?<ISH>\b(?:FISH|DISH|CISH|ISH)(?![A-Za-z])|原位[杂雜]交)|(?<KI67>Ki[ -]?67)/gi;
const ishMarker = /FISH|DISH|CISH|\bISH\b|原位[杂雜]交/i;
const otherGene = /\b(?:ALK|MDM2|ROS1|EWSR1|CCND1|MYC|TOP2A)\b/i;
function normalize(text) { return text.normalize('NFKC').replace(/[−–—]/g,'-'); }
function polarity(body) {
  const remainder = body.replace(negative,'');
  const neg = remainder !== body, pos = positive.test(remainder);
  if (neg && pos) return 'conflict';
  if (neg) return 'negative';
  if (pos) return 'positive';
  const symbols = body.replace(/[\s:：()\[\],，.]/g,'');
  if (symbols === '-') return 'negative';
  if (/^\+{1,3}$/.test(symbols)) return 'positive';
  return 'unknown';
}
function receptor(body, isEr) {
  if (uncertain.test(body) || /\d\s*(?:-|~|至|或|\/)\s*\d|(?:^|[^\w])-\s*\d/.test(body)) return 'unknown';
  const values = [...body.matchAll(/([<>≤≥]=?)?\s*(\d+(?:\.\d+)?)\s*%/g)];
  if (!values.length) return polarity(body);
  const parsed = values.map(m => {
    const n=Number(m[2]), cmp=m[1] || '';
    if (!Number.isFinite(n) || n<0 || n>100) return 'unknown';
    if (cmp==='>' && n===100 || cmp==='<' && n===0) return 'unknown';
    if (cmp === '<' && n<=1 || ['<=','≤'].includes(cmp) && n<1) return 'negative';
    if (['>','>=','≥'].includes(cmp)) {
      if (isEr ? (n>10 || cmp==='>' && n===10) : n>=1) return 'positive';
      return 'unknown';
    }
    if (cmp) return 'unknown';
    return n<1 ? 'negative' : isEr && n<=10 ? 'low' : 'positive';
  });
  const status=mergeValues(parsed), explicit=polarity(body);
  if (explicit==='conflict') return 'conflict';
  if (status==='unknown' || status==='conflict') return status;
  if (explicit==='negative' && status!=='negative' || explicit==='positive' && status==='negative') return 'conflict';
  return status;
}
function ihc(body) {
  if (uncertain.test(body)) return 'unknown';
  let scores=[...body.matchAll(/(?:^|[^\d.])([0123])\s*\+(?!\+)/g)].map(m=>m[1]);
  if (!scores.length) {
    const m=body.match(/^\s*[:(\[]*\s*(\+{1,3})\s*[)\],，\s]*$/);
    if (m) scores=[String(m[1].length)];
    else if (/^\s*[:(\[]*\s*0(?:\s*[)\],，]|\s*$)/.test(body)) scores=['0'];
  }
  const unique=[...new Set(scores)];
  if (unique.length>1) return 'conflict';
  if (!unique.length) return 'unknown';
  const value=unique[0]==='0' ? '0' : unique[0]+'+', p=polarity(body);
  if (p==='conflict' || value==='3+' && p==='negative' || ['0','1+'].includes(value) && p==='positive') return 'conflict';
  return value;
}
function ki67(body) {
  if (uncertain.test(body) || /[<>≤≥~]|\d\s*-\s*\d|(?:^|[^\w])-\s*\d/.test(body)) return 'unknown';
  const nums=[...body.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(m=>Number(m[1]));
  if (!nums.length || nums.some(n=>n<0 || n>100)) return 'unknown';
  return mergeValues(nums.map(n=>n+'%'));
}
function mergeValues(values) {
  const known=new Set(values.filter(v=>v!=='unknown'));
  if (known.has('conflict') || known.size>1) return 'conflict';
  if (values.includes('unknown')) return 'unknown';
  return [...known][0] || 'unknown';
}
export function parseReports(sources) {
  if (!sources || typeof sources!=='object' || Array.isArray(sources)) throw new Error('请先粘贴报告文字。');
  const entries=Object.keys(REPORT_SOURCES).map(key=>[key,sources[key] ?? '']);
  if (entries.some(([,text])=>typeof text!=='string')) throw new Error('报告必须是文字。');
  if (entries.reduce((n,[,text])=>n+text.length,0)>REPORT_LIMIT) throw new Error('相关报告合计最多40000字，请缩短后重试。');
  if (!entries.some(([,text])=>text.trim())) throw new Error('请先粘贴报告文字。');
  const fields=Object.fromEntries(REPORT_FIELDS.map(key=>[key,{value:'unknown',evidence:[]}]));
  for (const [source,text] of entries) {
    // Match normalized text, but retain the exact original clause as evidence.
    for (const original of text.split(/[;；。\r\n]/)) {
      if (!original.trim()) continue;
      const clause=normalize(original), hits=[...clause.matchAll(markers)];
      for (let i=0;i<hits.length;i++) {
        const hit=hits[i], key=Object.keys(hit.groups).find(k=>hit.groups[k]!==undefined);
        const following=hits[i+1], before=clause.slice(0,hit.index);
        let body=clause.slice(hit.index+hit[0].length,following?.index ?? clause.length).trim();
        if (key==='IHC' && (ishMarker.test(before) || following?.groups.ISH && /^[\s:基因检测檢測]*$/.test(body) || /基因|CEP17|拷[贝貝]|copy|ratio/i.test(body))) continue;
        if (key==='ISH') {
          // A HER2 label inside an ISH conclusion must not become an IHC score.
          const nextOther=hits.slice(i+1).find(h=>h.groups.ER || h.groups.PR || h.groups.KI67 || h.groups.ISH);
          body=clause.slice(hit.index+hit[0].length,nextOther?.index ?? clause.length).trim();
        }
        let value;
        if (key==='ER' || key==='PR') value=receptor(body,key==='ER');
        else if (key==='IHC') value=ihc(body);
        else if (key==='ISH') value=otherGene.test(clause) || uncertain.test(body) ? 'unknown' : polarity(body.replace(/HER[ -]?2(?:基因)?/gi,''));
        else value=ki67(body);
        fields[key].evidence.push({source,text:original.trim(),value});
      }
    }
  }
  for (const key of REPORT_FIELDS) fields[key].value=mergeValues(fields[key].evidence.map(e=>e.value));
  return {version:REPORT_VERSION,fields};
}
export function suggestReportStage(sources) {
  if (sources.biopsy?.trim() && !sources.postop?.trim()) return '已录入术前报告，未录入术后报告；请人工确认当前治疗阶段。';
  if (sources.postop?.trim()) return '已录入术后报告；请核实此前是否接受过新辅助治疗。';
  return '报告是否录入不能确定治疗阶段，请人工选择。';
}
export function classifyReport(values) {
  const issues=[], notes=[];
  for (const key of ['ER','PR']) if (!REPORT_VALUES[key].includes(values[key]) || ['unknown','conflict'].includes(values[key])) issues.push('ER/PR 缺失、未明确或冲突，请核对原始报告。');
  const ihc=values.IHC, ish=values.ISH;
  let her2='unknown';
  if (!REPORT_VALUES.IHC.includes(ihc) || !REPORT_VALUES.ISH.includes(ish) || ihc==='conflict' || ish==='conflict') issues.push('HER2 IHC/ISH 结果未明确或冲突，请复核。');
  else if (ihc==='3+') {
    if (ish==='negative') issues.push('IHC 3+ 与 ISH 阴性不一致，请病理复核。');
    else her2='positive';
  } else if (['0','1+'].includes(ihc)) {
    if (ish==='positive') issues.push('IHC 0/1+ 与 ISH 阳性不一致，请病理复核。');
    else her2='negative';
  } else if (ihc==='2+' && ['positive','negative'].includes(ish)) her2=ish;
  else if (ihc==='2+') issues.push('HER2 IHC 2+ 需补充 ISH 最终结论；不按比值或拷贝数自动判读。');
  else issues.push('HER2 IHC 评分未明确，请补充最终报告。');
  if (values.ER==='low') notes.push('ER 1%–10% 为低表达阳性，不自动归入三阴性；请完成专项复核。');
  if (values.ER==='negative' && values.PR==='positive') notes.push('ER 阴性 / PR 阳性为不常见组合，请完成专项复核。');
  return {subtype:issues.length ? null : her2==='positive' ? 'HER2阳性' : values.ER==='negative' && values.PR==='negative' ? '三阴性' : '激素受体阳性',her2,issues:[...new Set(issues)],notes};
}
// Source-backed reminders, not eligibility rules or patient-specific treatment advice.
export function guidelineChecks(subtype, phase) {
  const common='方案选择须结合完整分期、治疗目标、既往治疗与器官功能；仅凭免疫组化不能判断适用性。';
  const checks={
    'HER2阳性':{
      neo:'新辅助：核对抗 HER2 治疗条件及推荐层级。TCbHP、THP×6 与其他方案的层级不同，不按识别结果自动排序。PDF 48 / 书页 31。',
      adjuvant:'直接手术后：核对腋窝淋巴结、肿瘤是否 >2 cm、ER 与 Ki-67 风险条件；不同分层的单靶/双靶和化疗方案不可混用。PDF 68 / 书页 51。',
      'post-neo':'新辅助后：核对既往抗 HER2 治疗与 pCR/残留病灶，阅读术后衔接摘要，不重新套用初始辅助化疗。PDF 54 / 书页 37。'
    },
    '三阴性':{
      neo:'新辅助：核对紫杉、蒽环、铂类及免疫治疗的适用条件、序贯阶段和安全性。PD-L1 CPS 不作为本工具自动选择免疫药物的规则。PDF 56–60 / 书页 39–43。',
      adjuvant:'直接手术后：核对分期、复发风险和化疗指征；BRCA1/2 与强化治疗另行核对，不能由三阴性标签直接决定用药。PDF 75、78 / 书页 58、61。',
      'post-neo':'新辅助后：核对是否达到 pCR、是否已用 PD-1 抑制剂、残留病灶和 BRCA1/2 条件；卡培他滨/奥拉帕利不能仅凭受体阴性自动选择。PDF 62 / 书页 45。'
    },
    '激素受体阳性':{
      neo:'新辅助：核对化疗指征；AT/TAC 与 AC-T 的推荐层级不同。剂量和注释应交叉阅读三阴性新辅助章节。PDF 63、57、58 / 书页 46、40、41。',
      adjuvant:'直接手术后：核对阳性淋巴结数量及其他高危因素、肿瘤 >2 cm、年龄与 Ki-67，按源页分层核对化疗；绝经和内分泌治疗另行核对。PDF 83、86 / 书页 66、69。',
      'post-neo':'新辅助后：核对残留风险、绝经状态、既往化疗、内分泌与强化治疗条件；不自动给出初始辅助化疗方案。PDF 78、83、86–91 / 书页 61、66、69–74。'
    }
  };
  const selected=checks[subtype];
  return [common,...(selected ? phase && selected[phase] ? [selected[phase]] : Object.keys(selected).map(k=>selected[k]) : [])];
}
export function matchReportCatalogue(parsed, values, context, catalogue) {
  const result={...classifyReport(values),status:'needs-review',matches:[],references:[],corrected:[],catalogueOnly:true};
  if (!parsed?.fields) result.issues.push('请先识别当前报告。');
  if (parsed?.fields) {
    result.corrected=Object.keys(REPORT_VALUES).filter(k=>values[k]!==parsed.fields[k]?.value);
    if (result.corrected.length && !context.correctionReason?.trim()) result.issues.push('人工修改识别结果后，请填写修正依据。');
    const pendingIsh=parsed.fields.ISH?.value==='unknown' && parsed.fields.ISH.evidence.some(e=>!/(?:未做|未行|未检测|未檢測|not\s+(?:done|performed))/i.test(e.text));
    if (pendingIsh && !(result.corrected.includes('ISH') && context.correctionReason?.trim() && ['positive','negative'].includes(values.ISH))) result.issues.push('ISH 报告待出、未明确或仅有数值，请核对最终结论。');
  }
  if (context.reviewed!==true) result.issues.push('请逐项核对同一患者、同一病灶及同一取材时点的报告。');
  if (!['neo','adjuvant','post-neo'].includes(context.phase)) result.issues.push('请确认当前治疗阶段及既往新辅助情况。');
  if (!['pre','post','uncertain','na'].includes(context.menopause)) result.issues.push('请选择绝经状态；不明确时选择不确定。');
  if (!['positive','negative'].includes(context.nodes)) result.issues.push('请核实淋巴结状态；未知或微转移先人工复核。');
  if (context.phase==='neo' && context.surgery!=='none' || ['adjuvant','post-neo'].includes(context.phase) && !['mastectomy','radical','conserving'].includes(context.surgery)) result.issues.push('已完成术式与治疗阶段不一致，请核实。');
  if (result.notes.length && context.specialReviewed!==true) result.issues.push('低表达或不常见受体组合需要专项复核确认。');
  result.notes.push('仅按已核对的阶段和受体分型检索目录，不判断治疗指征、风险或患者适用性。');
  result.notes.push(...guidelineChecks(result.subtype,context.phase));
  if (result.issues.length) return result;
  if (context.phase==='post-neo') {
    result.notes.push('新辅助后不匹配整套初始辅助化疗，请结合既往用药和残留病灶核对衔接治疗。');
    const ids=result.subtype==='HER2阳性' ? ['c003'] : result.subtype==='三阴性' ? ['c004'] : ['c018','c010','c012'];
    result.references=catalogue.referenceCards.filter(r=>ids.includes(r.id));
  } else {
    const section=context.phase==='neo' ? '术前新辅助治疗' : '术后辅助治疗';
    result.matches=catalogue.regimens.filter(r=>r.entryType==='regimen' && r.section===section && r.subtype===result.subtype);
    result.references=catalogue.referenceCards.filter(r=>r.section===section && r.subtype===result.subtype);
  }
  result.status='ok';
  return result;
}
