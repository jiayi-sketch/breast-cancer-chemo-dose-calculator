// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
// Arithmetic migration prototype. No network, storage, UI or treatment selection.

export const ENGINE_VERSION = '1.0.3';

export const LEGACY_INPUT_LIMITS = Object.freeze({
  heightCm: Object.freeze([80, 250] as const),
  weightKg: Object.freeze([20, 350] as const),
  renalMlMin: Object.freeze([0, 200] as const),
});

export type DoseKind = 'bsa' | 'bsa_range' | 'weight' | 'weight_seq'
  | 'fixed' | 'fixed_seq' | 'fixed_alt' | 'auc';

export interface SourceReference {
  title: string;
  version: string;
  locator: string;
}

export type Review = { status: 'pending' }
  | { status: 'approved'; reviewer: string; reviewedOn: string };

interface RuleMetadata {
  id: string;
  version: string;
  source: SourceReference;
  review: Review;
}

export type DoseRule = RuleMetadata & (
  | { kind: 'bsa' | 'weight' | 'fixed' | 'auc'; dose: number }
  | { kind: 'bsa_range' | 'weight_seq' | 'fixed_seq'; dose: [number, number] }
  | { kind: 'fixed_alt'; dose: [number, number]; schedules: [string, string] }
);

export interface CalculationInputs {
  heightCm?: number;
  weightKg?: number;
  renalFunction?: {
    value: number;
    unit: 'mL/min';
    confirmed: boolean;
  };
  alternativeIndex?: 0 | 1;
}

export interface CalculationRequest {
  rule: DoseRule;
  inputs: CalculationInputs;
  clinicianConfirmed: boolean;
}

export interface Problem {
  field: string;
  code: string;
  message: string;
}

export interface UnavailableResult {
  status: 'blocked' | 'invalid' | 'needs-input' | 'needs-selection';
  issues: Problem[];
}

export interface DoseQuantity {
  role: 'single' | 'lower' | 'upper' | 'loading' | 'maintenance';
  valueMg: number;
  schedule?: string;
}

export interface CalculatedResult {
  status: 'ok';
  engineVersion: string;
  ruleId: string;
  ruleVersion: string;
  source: SourceReference;
  review: Extract<Review, { status: 'approved' }>;
  quantities: DoseQuantity[];
  basis: {
    expression: string;
    coefficients: number[];
    heightCm?: number;
    weightKg?: number;
    bsaM2?: number;
    renalMlMin?: number;
    alternativeIndex?: number;
  };
}

export type CalculationResult = UnavailableResult | CalculatedResult;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function fail(status: UnavailableResult['status'], field: string, code: string,
  message: string): UnavailableResult {
  return { status, issues: [{ field, code, message }] };
}

function bounded(value: unknown, field: string, label: string,
  range: readonly [number, number]): UnavailableResult | undefined {
  if (value === null || value === undefined || value === '') {
    return fail('needs-input', field, 'MISSING_INPUT', `请填写${label}。`);
  }
  if (!finite(value)) {
    return fail('invalid', field, 'INVALID_NUMBER', `${label}须为有限数值。`);
  }
  if (value < range[0] || value > range[1]) {
    return fail('invalid', field, 'OUT_OF_LEGACY_RANGE',
      `${label}超出原程序的输入范围 ${range[0]}–${range[1]}，请核对。`);
  }
}

/** This is the source application's arithmetic/range policy, not a clinical guideline. */
export function calculateBsa(inputs: unknown): { status: 'ok'; valueM2: number }
  | UnavailableResult {
  if (!record(inputs)) return fail('invalid', 'inputs', 'INVALID_INPUTS', '计算参数格式不正确。');
  const issue = bounded(inputs.heightCm, 'heightCm', '身高（cm）', LEGACY_INPUT_LIMITS.heightCm)
    ?? bounded(inputs.weightKg, 'weightKg', '体重（kg）', LEGACY_INPUT_LIMITS.weightKg);
  if (issue) return issue;
  return { status: 'ok', valueM2: Math.sqrt(
    (inputs.heightCm as number) * (inputs.weightKg as number) / 3600) };
}

/** Runtime validation is intentional: inputs can arrive from either mobile platform. */
export function calculateDose(request: unknown): CalculationResult {
  if (!record(request) || !record(request.rule)) {
    return fail('invalid', 'rule', 'INVALID_RULE', '请选择有效的计算规则。');
  }
  const rule = request.rule;
  if (!text(rule.id) || !text(rule.version) || !record(rule.source)
    || !text(rule.source.title) || !text(rule.source.version) || !text(rule.source.locator)) {
    return fail('invalid', 'rule.source', 'MISSING_PROVENANCE', '规则缺少版本或依据。');
  }
  if (!record(rule.review) || rule.review.status !== 'approved'
    || !text(rule.review.reviewer) || !text(rule.review.reviewedOn)) {
    return fail('blocked', 'rule.review', 'RULE_NOT_REVIEWED', '此规则尚未完成专业核对。');
  }
  if (request.clinicianConfirmed !== true) {
    return fail('blocked', 'clinicianConfirmed', 'CONFIRMATION_REQUIRED',
      '请先核对所选方案和本次输入。');
  }
  if (!record(request.inputs)) {
    return fail('invalid', 'inputs', 'INVALID_INPUTS', '计算参数格式不正确。');
  }

  const kinds: DoseKind[] = ['bsa', 'bsa_range', 'weight', 'weight_seq',
    'fixed', 'fixed_seq', 'fixed_alt', 'auc'];
  if (!kinds.includes(rule.kind as DoseKind)) {
    return fail('invalid', 'rule.kind', 'UNKNOWN_KIND', '不支持的计算方式。');
  }
  const kind = rule.kind as DoseKind;
  const paired = ['bsa_range', 'weight_seq', 'fixed_seq', 'fixed_alt'].includes(kind);
  const doses = paired ? rule.dose : [rule.dose];
  if (!Array.isArray(doses) || doses.length !== (paired ? 2 : 1)
    || !doses.every(d => finite(d) && d > 0)) {
    return fail('invalid', 'rule.dose', 'INVALID_COEFFICIENT', '剂量系数格式不正确。');
  }
  if (kind === 'bsa_range' && doses[0] > doses[1]) {
    return fail('invalid', 'rule.dose', 'REVERSED_RANGE', '剂量区间下限不能高于上限。');
  }

  const inputs = request.inputs;
  const basis: CalculatedResult['basis'] = { expression: '', coefficients: [...doses] };
  let quantities: DoseQuantity[];
  if (kind === 'bsa' || kind === 'bsa_range') {
    const bsa = calculateBsa(inputs);
    if (bsa.status !== 'ok') return bsa;
    Object.assign(basis, { expression: 'dose × sqrt(heightCm × weightKg / 3600)',
      heightCm: inputs.heightCm, weightKg: inputs.weightKg, bsaM2: bsa.valueM2 });
    quantities = kind === 'bsa' || doses[0] === doses[1]
      ? [{ role: 'single', valueMg: doses[0] * bsa.valueM2 }]
      : [{ role: 'lower', valueMg: doses[0] * bsa.valueM2 },
        { role: 'upper', valueMg: doses[1] * bsa.valueM2 }];
  } else if (kind === 'weight' || kind === 'weight_seq') {
    const issue = bounded(inputs.weightKg, 'weightKg', '体重（kg）', LEGACY_INPUT_LIMITS.weightKg);
    if (issue) return issue;
    const weight = inputs.weightKg as number;
    Object.assign(basis, { expression: 'dose × weightKg', weightKg: weight });
    quantities = kind === 'weight'
      ? [{ role: 'single', valueMg: doses[0] * weight }]
      : [{ role: 'loading', valueMg: doses[0] * weight },
        { role: 'maintenance', valueMg: doses[1] * weight }];
  } else if (kind === 'fixed' || kind === 'fixed_seq') {
    basis.expression = 'fixed dose';
    quantities = kind === 'fixed'
      ? [{ role: 'single', valueMg: doses[0] }]
      : [{ role: 'loading', valueMg: doses[0] }, { role: 'maintenance', valueMg: doses[1] }];
  } else if (kind === 'fixed_alt') {
    if (!Array.isArray(rule.schedules) || rule.schedules.length !== 2 || !rule.schedules.every(text)) {
      return fail('invalid', 'rule.schedules', 'MISSING_SCHEDULES', '备选固定剂量必须分别注明给药频次。');
    }
    if (inputs.alternativeIndex === undefined || inputs.alternativeIndex === null) {
      return fail('needs-selection', 'alternativeIndex', 'CHOICE_REQUIRED', '请明确选择给药频次和对应剂量。');
    }
    if (inputs.alternativeIndex !== 0 && inputs.alternativeIndex !== 1) {
      return fail('invalid', 'alternativeIndex', 'INVALID_CHOICE', '备选项不存在。');
    }
    const selected = inputs.alternativeIndex;
    Object.assign(basis, { expression: 'explicitly selected fixed dose', alternativeIndex: selected });
    quantities = [{ role: 'single', valueMg: doses[selected], schedule: rule.schedules[selected] }];
  } else {
    if (inputs.renalFunction === undefined || inputs.renalFunction === null) {
      return fail('needs-input', 'renalFunction', 'RENAL_INPUT_REQUIRED', '请填写并核对肾功能参数。');
    }
    if (!record(inputs.renalFunction)) {
      return fail('invalid', 'renalFunction', 'INVALID_RENAL_INPUT', '肾功能参数格式不正确。');
    }
    const renal = inputs.renalFunction;
    if (renal.unit !== 'mL/min') {
      return fail('invalid', 'renalFunction.unit', 'RENAL_UNIT_MISMATCH',
        '此计算接口要求 mL/min；不自动把体表面积标准化的 eGFR 当作同一数值。');
    }
    if (renal.confirmed !== true) {
      return fail('blocked', 'renalFunction', 'RENAL_CONFIRMATION_REQUIRED',
        '请确认肾功能参数的单位和适用性。');
    }
    const issue = bounded(renal.value, 'renalFunction.value', '肾功能参数（mL/min）', LEGACY_INPUT_LIMITS.renalMlMin);
    if (issue) return issue;
    const renalMlMin = renal.value as number;
    Object.assign(basis, { expression: 'AUC × (renalMlMin + 25)', renalMlMin });
    quantities = [{ role: 'single', valueMg: doses[0] * (renalMlMin + 25) }];
  }

  if (quantities.some(q => !Number.isFinite(q.valueMg) || q.valueMg <= 0)) {
    return fail('invalid', 'result', 'NON_FINITE_RESULT', '计算结果无效，请核对系数与输入。');
  }
  return {
    status: 'ok', engineVersion: ENGINE_VERSION, ruleId: rule.id,
    ruleVersion: rule.version, source: {
      title: rule.source.title, version: rule.source.version, locator: rule.source.locator,
    },
    review: { status: 'approved', reviewer: rule.review.reviewer, reviewedOn: rule.review.reviewedOn },
    quantities, basis,
  };
}
