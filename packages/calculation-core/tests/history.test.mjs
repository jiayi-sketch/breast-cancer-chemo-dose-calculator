// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import test from 'node:test';
import assert from 'node:assert/strict';
import {patientInfo,normalizeRecord,readHistory,emptyHistory,changeHistory,searchHistory} from '../src/history.mjs';
import {calculateRegimen} from '../src/catalogue.mjs';
import {readFileSync} from 'node:fs';
const catalogue=JSON.parse(readFileSync(new URL('../../../data/catalogue.json',import.meta.url)));
const fixture=(id='synthetic-1')=>({id,savedAt:'2026-10-11T01:02:03.000Z',kind:'regimen',entryId:'r001',patient:{ageYears:45,hospitalNumber:'0000123'},inputs:{heightCm:180,weightKg:80,renalFunction:{value:50,unit:'mL/min'}},title:'TCbHP',summary:'Synthetic dose record',appVersion:'2.1.0',catalogueVersion:'2026.10.02',language:'en',results:[{drugId:'synthetic',engineVersion:'2.1.0',quantities:[{role:'dose',valueMg:123.456789}]}]});
test('age is optional integer metadata; hospitalization numbers retain leading zeros',()=>{
 assert.deepEqual(patientInfo('45',' 0000123 ').patient,{ageYears:45,hospitalNumber:'0000123'});
 assert.equal(patientInfo('','').patient.ageYears,null);
 for(const age of ['45.5',-1,121,NaN,'abc'])assert.ok(patientInfo(age,'').issues.length);
 for(const number of ['a\nb','a'.repeat(65)])assert.ok(patientInfo('',number).issues.length);
});
test('current confirmation has no reviewer identity and patient metadata cannot change arithmetic',()=>{
 const inputs={heightCm:180,weightKg:80,renalFunction:{value:50,unit:'mL/min',confirmed:true}};
 const plain=calculateRegimen(catalogue,'r001',inputs,{confirmed:true});
 const identified=calculateRegimen(catalogue,'r001',{...inputs,patient:{ageYears:45,hospitalNumber:'0000123'}},{confirmed:true});
 assert.equal(identified.status,'ok');assert.deepEqual(identified.rows,plain.rows);
 assert.equal('reviewer' in identified,false);assert.equal(identified.patient.hospitalNumber,'0000123');
 assert.equal(calculateRegimen(catalogue,'r001',inputs,{confirmed:false}).status,'blocked');
 assert.equal(calculateRegimen(catalogue,'r001',{...inputs,patient:{ageYears:45.5}},{confirmed:true}).status,'blocked');
 assert.equal(catalogue.regimens[0].clinicalReview,'pending');
});
test('history keeps precision and drops opaque report, reviewer and confirmation payloads',()=>{
 const value=fixture();value.reportReview={originalText:'SECRET'};value.reviewer='SECRET';value.inputs.report='SECRET';value.inputs.confirmed=true;
 const record=normalizeRecord(value);assert.doesNotMatch(JSON.stringify(record),/SECRET|confirmed|reviewer/);assert.equal(record.results[0].quantities[0].valueMg,123.456789);
});
test('history supports search, durable preference, deletion and idempotent saves',()=>{
 let state=changeHistory(emptyHistory(),{op:'add',record:fixture()});
 assert.equal(changeHistory(state,{op:'add',record:fixture()}).records.length,1);
 for(const q of ['0000123','45','tcbhp','2026-10-11'])assert.equal(searchHistory(state.records,q).length,1,q);
 state=changeHistory(state,{op:'preference',autoSave:false});state=readHistory(JSON.stringify(state));assert.equal(state.autoSave,false);
 assert.equal(changeHistory(state,{op:'delete',id:'synthetic-1'}).records.length,0);
 assert.equal(changeHistory(state,{op:'clear'}).autoSave,false);
});
test('capacity never silently discards old records and malformed state is rejected',()=>{
 const state={...emptyHistory(),records:Array.from({length:500},(_,i)=>fixture('r-'+i))};
 assert.throws(()=>changeHistory(state,{op:'add',record:fixture('overflow')}),/500/);assert.equal(state.records.length,500);
 for(const value of ['invalid','{}',JSON.stringify({...emptyHistory(),records:[fixture(),fixture()]})])assert.throws(()=>readHistory(value));
 assert.throws(()=>normalizeRecord({...fixture(),results:[{drugId:'x',engineVersion:'2.1.0',quantities:[{role:'dose',valueMg:Infinity}]}]}));
});
