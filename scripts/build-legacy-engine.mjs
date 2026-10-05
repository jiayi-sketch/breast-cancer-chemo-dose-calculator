// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const ts=await import(pathToFileURL(process.env.TYPESCRIPT_MODULE || 'node_modules/typescript/lib/typescript.js'));
const root=new URL('../',import.meta.url);
let source=readFileSync(new URL('apps/windows-legacy/polyfills.js',root),'utf8');
for(const name of ['core.browser.js','catalogue.browser.js','catalogue-engine.browser.js','reports-engine.browser.js','translations.browser.js']) {
  // ES5 interpreter uses ordinary capture groups; matchAll supplies their names.
  source+='\n'+readFileSync(new URL('apps/shared-web/'+name,root),'utf8').replace(/\(\?<\w+>/g,'(');
}
source+='\nvar extraTranslations='+readFileSync(new URL('apps/windows-legacy/i18n-extra.json',root),'utf8')+'; Object.keys(extraTranslations).forEach(function(lang){Object.assign(window.ChemoTranslations.languages[lang],extraTranslations[lang]);});';
const result=ts.default.transpileModule(source,{compilerOptions:{target:ts.default.ScriptTarget.ES5,downlevelIteration:false},reportDiagnostics:true});
const errors=(result.diagnostics||[]).filter(d=>d.category===ts.default.DiagnosticCategory.Error);
if(errors.length)throw new Error(ts.default.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>'',getNewLine:()=> '\n'}));
writeFileSync(new URL('apps/windows-legacy/engine.es5.js',root),'/* Generated from shared engines; do not edit. */\n'+result.outputText);
console.log('Built Windows legacy ES5 engine');
