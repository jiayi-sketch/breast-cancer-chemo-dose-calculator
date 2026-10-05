import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateBsa, calculateDose } from '../src/index.ts';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/legacy-arithmetic.json', import.meta.url)));
const metadata = {
  id: 'synthetic-test-rule', version: 'fixture-v1',
  source: { title: 'Synthetic arithmetic fixture; no clinical use', version: '1', locator: 'test-only' },
  review: { status: 'approved', reviewer: 'AUTOMATED_TEST_FIXTURE', reviewedOn: '2026-09-26' },
};
function request(kind = 'bsa', dose = 7.5, inputs = { heightCm: 180, weightKg: 80 }) {
  return { rule: { ...structuredClone(metadata), kind, dose }, inputs, clinicianConfirmed: true };
}
function expectFailure(result, status, code) {
  assert.equal(result.status, status);
  assert.equal(result.issues[0].code, code);
  assert.equal('quantities' in result, false, 'A rejected request must not include an old dose.');
}
function near(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} vs ${expected}`);
}

test('independent arithmetic check: 180 cm / 80 kg gives 2 m²; 7.5 × 2 gives 15', () => {
  assert.deepEqual(calculateBsa({ heightCm: 180, weightKg: 80 }), { status: 'ok', valueM2: 2 });
  const result = calculateDose(request());
  assert.equal(result.status, 'ok');
  assert.equal(result.quantities[0].valueMg, 15);
  assert.equal(result.basis.bsaM2, 2);
});

for (const [i, item] of fixtures.cases.entries()) {
  test(`legacy arithmetic vector ${i + 1}: ${item.kind}, ${item.heightCm}/${item.weightKg}`, () => {
    const inputs = {
      heightCm: item.heightCm, weightKg: item.weightKg,
      renalFunction: { value: item.renalMlMin, unit: 'mL/min', confirmed: true },
    };
    near(calculateBsa(inputs).valueM2, item.expectedBsaM2);
    const result = calculateDose(request(item.kind, item.dose, inputs));
    assert.equal(result.status, 'ok');
    assert.equal(result.quantities.length, item.expectedRoundedMg.length);
    for (let j = 0; j < result.quantities.length; j++) {
      // Legacy strings were rounded to 2 decimals. The new core preserves the raw number.
      near(result.quantities[j].valueMg, item.expectedRoundedMg[j], 0.0050000001);
    }
  });
}

test('unreviewed rules and missing professional confirmation block calculation', () => {
  const pending = request(); pending.rule.review = { status: 'pending' };
  expectFailure(calculateDose(pending), 'blocked', 'RULE_NOT_REVIEWED');
  const emptyReviewer = request(); emptyReviewer.rule.review.reviewer = ' ';
  expectFailure(calculateDose(emptyReviewer), 'blocked', 'RULE_NOT_REVIEWED');
  const noConfirmation = request(); noConfirmation.clinicianConfirmed = false;
  expectFailure(calculateDose(noConfirmation), 'blocked', 'CONFIRMATION_REQUIRED');
});

test('missing provenance, unknown types and malformed requests fail explicitly', () => {
  expectFailure(calculateDose(null), 'invalid', 'INVALID_RULE');
  const missingSource = request(); missingSource.rule.source.locator = '';
  expectFailure(calculateDose(missingSource), 'invalid', 'MISSING_PROVENANCE');
  expectFailure(calculateDose(request('mystery', 2)), 'invalid', 'UNKNOWN_KIND');
  expectFailure(calculateDose(request('fixed', 2, [])), 'invalid', 'INVALID_INPUTS');
});

test('numeric strings, booleans, NaN, infinity and blank values are never coerced', () => {
  for (const value of ['80', false, true, NaN, Infinity, -Infinity, {}, []]) {
    expectFailure(calculateDose(request('weight', 2, { weightKg: value })), 'invalid', 'INVALID_NUMBER');
  }
  for (const value of ['', null, undefined]) {
    expectFailure(calculateDose(request('weight', 2, { weightKg: value })), 'needs-input', 'MISSING_INPUT');
  }
});

test('legacy height and weight boundaries are inclusive, and outside values are rejected', () => {
  for (const inputs of [{ heightCm: 80, weightKg: 20 }, { heightCm: 250, weightKg: 350 }]) {
    assert.equal(calculateBsa(inputs).status, 'ok');
  }
  for (const inputs of [
    { heightCm: 79.99, weightKg: 80 }, { heightCm: 250.01, weightKg: 80 },
    { heightCm: 180, weightKg: 19.99 }, { heightCm: 180, weightKg: 350.01 },
  ]) expectFailure(calculateBsa(inputs), 'invalid', 'OUT_OF_LEGACY_RANGE');
});

test('fixed doses do not need height/weight; weight doses do not need height', () => {
  assert.equal(calculateDose(request('fixed', 12.5, {})).quantities[0].valueMg, 12.5);
  assert.equal(calculateDose(request('weight', 1.25, { weightKg: 80 })).quantities[0].valueMg, 100);
});

test('ranges remain ranges and loading/maintenance doses keep distinct roles', () => {
  const range = calculateDose(request('bsa_range', [1.5, 2.5]));
  assert.deepEqual(range.quantities, [{ role: 'lower', valueMg: 3 }, { role: 'upper', valueMg: 5 }]);
  const equal = calculateDose(request('bsa_range', [2, 2]));
  assert.deepEqual(equal.quantities, [{ role: 'single', valueMg: 4 }]);
  const sequence = calculateDose(request('weight_seq', [2, 1]));
  assert.deepEqual(sequence.quantities, [{ role: 'loading', valueMg: 160 }, { role: 'maintenance', valueMg: 80 }]);
});

test('bad coefficients, reversed ranges and floating-point overflow never produce a dose', () => {
  for (const dose of [0, -1, '2', NaN, Infinity, [1, 2]]) {
    expectFailure(calculateDose(request('bsa', dose)), 'invalid', 'INVALID_COEFFICIENT');
  }
  for (const dose of [[1], [1, 2, 3], [1, '2'], [1, -2], null]) {
    expectFailure(calculateDose(request('bsa_range', dose)), 'invalid', 'INVALID_COEFFICIENT');
  }
  expectFailure(calculateDose(request('bsa_range', [3, 2])), 'invalid', 'REVERSED_RANGE');
  expectFailure(calculateDose(request('weight', Number.MAX_VALUE)), 'invalid', 'NON_FINITE_RESULT');
});

test('AUC requires explicit confirmation and absolute mL/min, without method or source', () => {
  expectFailure(calculateDose(request('auc', 2, {})), 'needs-input', 'RENAL_INPUT_REQUIRED');
  const renal = { value: 90, unit: 'mL/min/1.73m²', confirmed: true };
  expectFailure(calculateDose(request('auc', 2, { renalFunction: renal })), 'invalid', 'RENAL_UNIT_MISMATCH');
  renal.unit = 'mL/min'; renal.confirmed = false;
  expectFailure(calculateDose(request('auc', 2, { renalFunction: renal })), 'blocked', 'RENAL_CONFIRMATION_REQUIRED');
  renal.confirmed = true;
  const result = calculateDose(request('auc', 2, { renalFunction: renal }));
  assert.equal(result.quantities[0].valueMg, 230);
  assert.equal('renalMethod' in result.basis, false);
  for (const value of [-1, 200.01]) {
    expectFailure(calculateDose(request('auc', 2, { renalFunction: { ...renal, value } })), 'invalid', 'OUT_OF_LEGACY_RANGE');
  }
});

test('alternative fixed doses require a matching schedule and explicit selection', () => {
  const req = request('fixed_alt', [10, 20], {});
  expectFailure(calculateDose(req), 'invalid', 'MISSING_SCHEDULES');
  req.rule.schedules = ['synthetic schedule A', 'synthetic schedule B'];
  expectFailure(calculateDose(req), 'needs-selection', 'CHOICE_REQUIRED');
  req.inputs.alternativeIndex = 1;
  assert.deepEqual(calculateDose(req).quantities,
    [{ role: 'single', valueMg: 20, schedule: 'synthetic schedule B' }]);
  req.inputs.alternativeIndex = '1';
  expectFailure(calculateDose(req), 'invalid', 'INVALID_CHOICE');
});

test('results retain source/version/input evidence and never mutate caller state', () => {
  const req = request(); const before = structuredClone(req);
  const result = calculateDose(req);
  assert.deepEqual(req, before);
  assert.equal(result.ruleId, req.rule.id);
  assert.equal(result.ruleVersion, req.rule.version);
  assert.deepEqual(result.source, req.rule.source);
  result.source.title = 'changed'; result.basis.coefficients[0] = 123;
  assert.deepEqual(req, before);
});
