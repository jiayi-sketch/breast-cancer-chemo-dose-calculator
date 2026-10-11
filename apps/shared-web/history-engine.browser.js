/* Generated from history.mjs; do not edit. */
window.HistoryEngine = (function(){
"use strict";
// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
// Explicit allowlists keep report text, screenshots and reviewer identities out of history.
const HISTORY_LIMIT = 500;
const HISTORY_BYTES = 8 * 1024 * 1024;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const object = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const finite = n => typeof n === 'number' && Number.isFinite(n);
function patientInfo(age, hospitalNumber) {
  const issues = [];
  const blank = age === undefined || age === null || typeof age === 'string' && !age.trim();
  const ageYears = blank ? null : (typeof age === 'string' || typeof age === 'number' ? Number(age) : NaN);
  if (ageYears !== null && (!finite(ageYears) || !Number.isInteger(ageYears) || ageYears < 0 || ageYears > 120)) issues.push('患者年龄须为 0–120 的整数，或留空。');
  const id = typeof hospitalNumber === 'string' ? hospitalNumber.trim() : '';
  if (hospitalNumber !== undefined && hospitalNumber !== null && typeof hospitalNumber !== 'string' || id.length > 64 || /[\u0000-\u001f\u007f]/.test(typeof hospitalNumber === 'string' ? hospitalNumber : '')) issues.push('住院号最多 64 个字符，不得含控制字符。');
  return {patient: {ageYears, hospitalNumber: id}, issues};
}
function text(value, limit, name) {
  if (typeof value !== 'string' || value.length > limit) throw new Error('历史记录格式不正确。');
  return value;
}
function normalizeRecord(value) {
  if (!object(value) || !object(value.patient) || !object(value.inputs)) throw new Error('历史记录格式不正确。');
  const p = patientInfo(value.patient.ageYears, value.patient.hospitalNumber);
  if (p.issues.length || typeof value.patient.hospitalNumber !== 'string') throw new Error('历史记录格式不正确。');
  const id = text(value.id, 100), savedAt = text(value.savedAt, 40);
  if (!/^[a-zA-Z0-9_-]+$/.test(id) || !Number.isFinite(Date.parse(savedAt)) || !['regimen','manual'].includes(value.kind)) throw new Error('历史记录格式不正确。');
  const inputs = {};
  for (const k of ['heightCm','weightKg']) if (value.inputs[k] !== undefined && value.inputs[k] !== null) {
    if (!finite(value.inputs[k]) || value.inputs[k] < 0 || value.inputs[k] > 1000) throw new Error('历史记录格式不正确。');
    inputs[k] = value.inputs[k];
  }
  if (value.inputs.renalFunction !== undefined && value.inputs.renalFunction !== null) {
    const r = value.inputs.renalFunction;
    if (!object(r) || !finite(r.value) || r.value < 0 || r.value > 500 || r.unit !== 'mL/min') throw new Error('历史记录格式不正确。');
    inputs.renalFunction = {value: r.value, unit: 'mL/min'};
  }
  if (value.inputs.alternatives) {
    if (!object(value.inputs.alternatives) || Object.keys(value.inputs.alternatives).length > 64) throw new Error('历史记录格式不正确。');
    inputs.alternatives = {};
    for (const k of Object.keys(value.inputs.alternatives)) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(k) || ![0,1].includes(value.inputs.alternatives[k])) throw new Error('历史记录格式不正确。');
      inputs.alternatives[k] = value.inputs.alternatives[k];
    }
  }
  const record = {id, savedAt, kind: value.kind, patient: p.patient,
    title: text(value.title, 300), summary: text(value.summary, 80000),
    language: ['zh-Hans','zh-Hant','en'].includes(value.language) ? value.language : 'zh-Hans',
    appVersion: text(value.appVersion, 50), catalogueVersion: text(value.catalogueVersion || '', 100), inputs};
  if (value.kind === 'regimen') {
    record.entryId = text(value.entryId, 100);
    if (!/^[a-zA-Z0-9_-]+$/.test(record.entryId)) throw new Error('历史记录格式不正确。');
  } else {
    if (!object(value.manual)) throw new Error('历史记录格式不正确。');
    record.manual = {};
    for (const k of ['item-name','kind','dose1','dose2','reference','schedule1','schedule2','alternative']) record.manual[k] = text(value.manual[k] || '', 2000);
  }
  // Store numerical evidence only; never retain an opaque calculation/report object.
  record.results = [];
  if (value.results !== undefined) {
    if (!Array.isArray(value.results) || value.results.length > 64) throw new Error('历史记录格式不正确。');
    record.results = value.results.map(r => {
      if (!object(r) || !Array.isArray(r.quantities) || r.quantities.length > 2) throw new Error('历史记录格式不正确。');
      return {drugId: text(r.drugId || '', 100), engineVersion: text(r.engineVersion, 50), quantities: r.quantities.map(q => {
        if (!object(q) || !finite(q.valueMg) || q.valueMg < 0) throw new Error('历史记录格式不正确。');
        return {role: text(q.role, 30), valueMg: q.valueMg, ...(q.schedule ? {schedule: text(q.schedule, 2000)} : {})};
      })};
    });
  }
  return record;
}
function readHistory(content) {
  if (typeof content !== 'string' || content.length > HISTORY_BYTES) throw new Error('历史记录无法读取，原文件未修改。');
  const data = JSON.parse(content);
  if (!object(data) || data.schemaVersion !== 1 || !Array.isArray(data.records) || data.records.length > HISTORY_LIMIT || typeof data.autoSave !== 'boolean') throw new Error('历史记录无法读取，原文件未修改。');
  const records = data.records.map(normalizeRecord), ids = {};
  for (const r of records) { if (own(ids,r.id)) throw new Error('历史记录无法读取，原文件未修改。'); ids[r.id] = true; }
  return {schemaVersion:1, autoSave:data.autoSave, records};
}
function emptyHistory() { return {schemaVersion:1, autoSave:true, records:[]}; }
function changeHistory(state, operation) {
  const next = readHistory(JSON.stringify(state));
  if (operation.op === 'add') {
    const record = normalizeRecord(operation.record);
    if (next.records.some(r=>r.id===record.id)) return next;
    if (next.records.length >= HISTORY_LIMIT) throw new Error('历史记录已达 500 条，请先删除不需要的记录。');
    next.records.unshift(record);
  } else if (operation.op === 'delete') next.records = next.records.filter(r=>r.id!==operation.id);
  else if (operation.op === 'clear') next.records = [];
  else if (operation.op === 'preference' && typeof operation.autoSave === 'boolean') next.autoSave = operation.autoSave;
  else throw new Error('历史记录操作不正确。');
  if (JSON.stringify(next).length > HISTORY_BYTES) throw new Error('历史记录空间已满，请先删除不需要的记录。');
  return next;
}
function searchHistory(records, query) {
  const needle = String(query || '').trim().toLocaleLowerCase();
  return records.filter(r => !needle || [r.patient.hospitalNumber,r.patient.ageYears===null?'':String(r.patient.ageYears),r.title,r.savedAt,r.catalogueVersion].join(' ').toLocaleLowerCase().includes(needle));
}

return {HISTORY_LIMIT,HISTORY_BYTES,patientInfo,normalizeRecord,readHistory,emptyHistory,changeHistory,searchHistory};
})();
