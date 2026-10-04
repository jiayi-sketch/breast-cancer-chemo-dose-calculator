/* SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial */
(function () {
  'use strict';
  const supported = ['zh-Hans', 'zh-Hant', 'en'];
  const requested = new URLSearchParams(location.search).get('lang');
  let language = supported.includes(requested) ? requested : 'zh-Hans';
  const dictionaries = window.ChemoTranslations.languages;
  const patterns = {};
  for (const code of ['en', 'zh-Hant']) {
    const keys = Object.keys(dictionaries[code]).filter(k => k.trim()).sort((a,b) => b.length-a.length);
    patterns[code] = new RegExp(keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');
  }
  function text(source, code = language) {
    source = String(source ?? '');
    if (code === 'zh-Hans' || !supported.includes(code)) return source;
    const dictionary = dictionaries[code];
    if (Object.hasOwn(dictionary, source)) return dictionary[source];
    if (code === 'zh-Hant') return source.replace(patterns[code], k => dictionary[k])
      .replace(/[\u3400-\u9fff]/gu, c => window.ChemoTranslations.traditionalCharacters[c] || c);
    // These formats contain only catalogue data or calculation issues, never user-entered strings.
    source = source.replace(/请填写([^。]+)。/g, (_,label) => 'Please enter ' + text(label, code) + '.')
      .replace(/([^。]+)須为有限数值。/g, (_,label) => text(label, code) + ' must be finite.')
      .replace(/([^。]+)须为有限数值。/g, (_,label) => text(label, code) + ' must be finite.')
      .replace(/([^。]+)超出原程序的输入范围 ([\d.]+)–([\d.]+)，请核对。/g,
        (_,label,low,high) => text(label,code) + ' is outside the original input range ' + low + '–' + high + '. Verify the input.')
      .replace(/PDF (.+?) 页 \/ 书页 (.+)/g, (_,a,b) => 'PDF pages ' + a.replaceAll('、',', ') + ' / printed pages ' + b.replaceAll('、',', '))
      .replace(/共(\d+)周期/g,'$1 cycles').replace(/共(\d+)次/g,'$1 administrations')
      .replace(/每(\d+)天/g,'every $1 days').replace(/(\d+)年/g,'$1 years')
      .replace(/序贯阶段/g,'Sequential phase: ').replace(/序贯/g,'Sequential: ');
    return source.replace(patterns[code], k => dictionary[k])
      .replaceAll('（',' (').replaceAll('）',')').replaceAll('；','; ').replaceAll('：',': ')
      .replaceAll('、',', ').replaceAll('，',', ').replaceAll('。','. ');
  }
  const records = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('script,style,pre,textarea,#language,[data-no-translate]')) continue;
    // Units, version badges and live numeric fields are not translation sources.
    if (/[\u3400-\u9fff]/u.test(node.nodeValue)) records.push({node,source:node.nodeValue});
  }
  const attributes = [];
  document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(element => {
    for (const name of ['placeholder','aria-label','title']) {
      if (element.hasAttribute(name)) attributes.push({element,name,source:element.getAttribute(name)});
    }
  });
  function apply() {
    document.documentElement.lang = language;
    records.forEach(r => { r.node.nodeValue = text(r.source); });
    attributes.forEach(r => { r.element.setAttribute(r.name,text(r.source)); });
    document.getElementById('language').value = language;
    document.querySelectorAll('a[href="manual.html"],a[href="index.html"],a[data-language-link]').forEach(a => {
      a.dataset.languageLink = 'true';
      a.setAttribute('href',a.getAttribute('href').split('?')[0]+'?lang='+language);
    });
  }
  function setLanguage(code) {
    if (!supported.includes(code) || code === language) return;
    language = code; apply();
    if (window.webkit?.messageHandlers?.languagePreference) window.webkit.messageHandlers.languagePreference.postMessage(code);
    else if (window.AndroidBridge?.saveLanguage) window.AndroidBridge.saveLanguage(code);
    else if (window.chrome?.webview) window.chrome.webview.postMessage({type:'languagePreference',language:code});
    document.dispatchEvent(new CustomEvent('chemo-language-change',{detail:{language:code}}));
  }
  window.ChemoI18n = {text, setLanguage, get language(){return language;},
    searchText: source => supported.map(code => text(source,code)).join(' ')};
  document.getElementById('language').addEventListener('change',e => setLanguage(e.target.value));
  apply();
}());
