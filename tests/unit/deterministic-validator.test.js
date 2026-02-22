import test from 'node:test';
import assert from 'node:assert/strict';

import { validateDeterministicPlan } from '../../src/validation/deterministic-validator.js';

test('validateDeterministicPlan marks low-confidence actions as REVIEW_REQUIRED', () => {
  const plan = {
    actions: [
      { pageId: 'SALARY', fieldKey: 'salary.gross', confidence: 0.95, policy: 'ALLOW' },
      { pageId: 'OTHER_INCOME', fieldKey: 'other_income.bank_interest', confidence: 0.7, policy: 'ALLOW' }
    ],
    warnings: []
  };

  const result = validateDeterministicPlan(plan, {
    salary: { grossSalary: 1000000, taxableSalary: 900000 },
    deductions: {},
    tdsCredits: { form16: [], ais: [] }
  });

  assert.equal(result.reviewedPlan.actions[0].policy, 'ALLOW');
  assert.equal(result.reviewedPlan.actions[1].policy, 'REVIEW_REQUIRED');
  assert.equal(result.canExecute, true);
});

test('validateDeterministicPlan blocks salary actions on salary inconsistency', () => {
  const plan = {
    actions: [
      { pageId: 'SALARY', fieldKey: 'salary.gross', confidence: 0.95, policy: 'ALLOW' },
      { pageId: 'TDS', fieldKey: 'tds.total', confidence: 0.95, policy: 'ALLOW' }
    ],
    warnings: []
  };

  const result = validateDeterministicPlan(plan, {
    salary: { grossSalary: 1000000, taxableSalary: 1100000 },
    deductions: {},
    tdsCredits: { form16: [], ais: [] }
  });

  assert.equal(result.canExecute, false);
  assert.equal(result.blockingIssues.length, 1);
  assert.equal(result.reviewedPlan.actions[0].policy, 'BLOCK');
  assert.equal(result.reviewedPlan.actions[1].policy, 'ALLOW');
});
