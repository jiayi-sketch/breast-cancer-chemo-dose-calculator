// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
// Only the shared, embedded engine runs here. Patient text is never executed.
var window = {};
Number.isFinite = function(n) { return typeof n === 'number' && isFinite(n); };
Object.assign = function(target) { for(var i=1;i<arguments.length;i++) { var s=arguments[i]; if(s) Object.keys(s).forEach(function(k){target[k]=s[k];}); } return target; };
Object.fromEntries = function(entries) { var o={}; entries.forEach(function(e){o[e[0]]=e[1];}); return o; };
Array.prototype.includes = function(value) { return this.indexOf(value)!==-1; };
Array.prototype.find = function(fn) { for(var i=0;i<this.length;i++) if(fn(this[i],i,this)) return this[i]; };
String.prototype.includes = function(value) { return this.indexOf(value)!==-1; };
String.prototype.endsWith = function(value) { return this.slice(-value.length)===value; };
String.prototype.normalize = function() { return normalizeNfkc(String(this)); };
// The shared engines use sets of strings only. An array retains ES5 iteration.
function Set(values) { var a=[]; a.has=function(v){return a.indexOf(v)!==-1;}; a.add=function(v){if(!a.has(v))a.push(v);a.size=a.length;return a;}; (values||[]).forEach(function(v){a.add(v);});a.size=a.length;return a; }
String.prototype.matchAll = function(re) {
  var rx=new RegExp(re.source,'g'+(re.ignoreCase?'i':'')+(re.multiline?'m':'')), hits=[], m;
  while((m=rx.exec(String(this)))!==null) {
    // The generated report marker expression has five ordinary capture groups.
    if(re.source.indexOf('雌激素受')!==-1) { m.groups={}; ['ER','PR','IHC','ISH','KI67'].forEach(function(k,i){m.groups[k]=m[i+1];}); }
    hits.push(m); if(m[0]==='')rx.lastIndex++;
  }
  return hits;
};
var translationPatterns={};
function translateText(text,lang) {
  if(lang==='zh-Hans'||!text)return text;
  var dictionary=window.ChemoTranslations.languages[lang]||{};
  if(Object.prototype.hasOwnProperty.call(dictionary,text))return dictionary[text];
  // Same controlled-label replacements as the shared UI. No report evidence.
  if(!translationPatterns[lang]) {
    var keys=Object.keys(dictionary).filter(function(k){return k.trim();}).sort(function(a,b){return b.length-a.length;});
    translationPatterns[lang]=new RegExp(keys.map(function(k){return k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('|'),'g');
  }
  if(lang==='en')text=text.replace(/请填写([^。]+)。/g,function(_,label){return 'Please enter '+translateText(label,lang)+'.';})
    .replace(/([^。]+)须为有限数值。/g,function(_,label){return translateText(label,lang)+' must be finite.';})
    .replace(/([^。]+)超出原程序的输入范围 ([\d.]+)–([\d.]+)，请核对。/g,function(_,label,lo,hi){return translateText(label,lang)+' is outside the original input range '+lo+'–'+hi+'. Verify the input.';})
    .replace(/PDF (.+?) 页 \/ 书页 (.+)/g,function(_,a,b){return 'PDF pages '+a.split('、').join(', ')+' / printed pages '+b.split('、').join(', ');})
    .replace(/共(\d+)周期/g,'$1 cycles').replace(/共(\d+)次/g,'$1 administrations').replace(/每(\d+)天/g,'every $1 days').replace(/(\d+)年/g,'$1 years').replace(/序贯阶段/g,'Sequential phase: ').replace(/序贯/g,'Sequential: ');
  text=text.replace(translationPatterns[lang],function(k){return dictionary[k];});
  if(lang==='zh-Hant')return text.replace(/[\u3400-\u9fff]/g,function(c){return window.ChemoTranslations.traditionalCharacters[c]||c;});
  return text.replace(/（/g,' (').replace(/）/g,')').replace(/；/g,'; ').replace(/：/g,': ').replace(/、/g,', ').replace(/，/g,', ').replace(/。/g,'. ');
}
function legacyCall(request) {
  switch(request.op) {
    case 'catalogue': return window.ChemoCatalogue;
    case 'translate': return translateText(request.text,request.language);
    case 'parse': return window.ReportEngine.parseReports(request.sources);
    case 'classify': return window.ReportEngine.classifyReport(request.values);
    case 'checks': return window.ReportEngine.guidelineChecks(request.subtype,request.phase);
    case 'match': return window.ReportEngine.matchReportCatalogue(request.parsed,request.values,request.context,window.ChemoCatalogue);
    case 'dose': return window.RegimenEngine.calculateRegimen(window.ChemoCatalogue,request.id,request.inputs,request.acknowledgement);
    case 'quantity': return window.RegimenEngine.quantityLabel(request.result);
    case 'standard': return window.RegimenEngine.standardDose(request.drug);
    case 'source': return window.RegimenEngine.sourceLabel(request.entry);
    default: throw new Error('Unknown operation');
  }
}
