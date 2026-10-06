// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('packages/calculation-core/src/index.ts', root), 'utf8');
const js = stripTypeScriptTypes(source, { mode: 'strip' })
  .replace(/^export\s+(const|function)\s/gm, '$1 ');
const wrapped = '/* Generated from the shared TypeScript core. LicenseRef-ChemoDose-Academic-NonCommercial. */\n'
  + 'window.DoseCore = (function(){\n"use strict";\n' + js
  + '\nreturn {ENGINE_VERSION, LEGACY_INPUT_LIMITS, calculateBsa, calculateDose};\n})();\n';
const target = new URL('apps/shared-web/core.browser.js', root);
writeFileSync(target, wrapped);
console.log('Built', fileURLToPath(target));
const catalogue = JSON.parse(readFileSync(new URL('data/catalogue.json', root), 'utf8'));
writeFileSync(new URL('apps/shared-web/catalogue.browser.js', root),
  '/* Generated from data/catalogue.json. LicenseRef-ChemoDose-Academic-NonCommercial. */\nwindow.ChemoCatalogue = ' + JSON.stringify(catalogue) + ';\n');
const engine = readFileSync(new URL('packages/calculation-core/src/catalogue.mjs', root), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export function /gm, 'function ');
writeFileSync(new URL('apps/shared-web/catalogue-engine.browser.js', root),
  '/* Generated from catalogue.mjs. LicenseRef-ChemoDose-Academic-NonCommercial. */\nwindow.RegimenEngine = (function(){\n"use strict";\n' +
  'const {calculateDose} = window.DoseCore;\n' + engine +
  '\nreturn {filterEntries, sourceLabel, standardDose, quantityLabel, calculateRegimen, summaryText};\n})();\n');

const translations = JSON.parse(readFileSync(new URL('data/i18n.json', root), 'utf8'));
writeFileSync(new URL('apps/shared-web/translations.browser.js', root),
  '/* Generated from data/i18n.json. LicenseRef-ChemoDose-Academic-NonCommercial. */\nwindow.ChemoTranslations = ' + JSON.stringify(translations) + ';\n');

const reports = readFileSync(new URL('packages/calculation-core/src/reports.mjs', root), 'utf8')
  .replace(/^export\s+(const|function)\s/gm,'$1 ');
writeFileSync(new URL('apps/shared-web/reports-engine.browser.js',root),
  '/* Generated from reports.mjs. LicenseRef-ChemoDose-Academic-NonCommercial. */\nwindow.ReportEngine = (function(){\n"use strict";\n'+reports+
  '\nreturn {REPORT_VERSION,REPORT_LIMIT,REPORT_SOURCES,REPORT_FIELDS,REPORT_VALUES,VALUE_LABELS,parseReports,suggestReportStage,classifyReport,guidelineChecks,matchReportCatalogue};\n})();\n');
