// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
// Fictional fixtures only. This checks engine/model integration, not native GUIs.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {parseReports} from '../packages/calculation-core/src/reports.mjs';
const Tesseract=(await import(process.env.TESSERACT_MODULE || 'tesseract.js')).default;
const root=new URL('../apps/shared-web/ocr/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root)));
for(const [name,item] of Object.entries(manifest.files)){
 const bytes=readFileSync(new URL(name,root));assert.equal(bytes.length,item.size,name);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,name);
}
const worker=await Tesseract.createWorker('eng+chi_sim+chi_tra',1,{langPath:fileURLToPath(root),gzip:true,cacheMethod:'none'});
const fixtures=[];
try {
 for(const name of ['english','simplified','traditional']){
  const output=await worker.recognize(fileURLToPath(new URL('fixtures/ocr/'+name+'.png',import.meta.url)));
  const fields=parseReports({biopsy:output.data.text}).fields;
  for(const [key,value] of [['ER','positive'],['PR','positive'],['IHC','3+'],['KI67','35%']])assert.equal(fields[key].value,value,name+' '+key);
  fixtures.push({name,passed:true});
 }
 console.log(JSON.stringify({passed:true,fixtures,modelFilesVerified:Object.keys(manifest.files).length,nativeRendererValidation:'pending; see platform verification records'}));
} finally {await worker.terminate();}
