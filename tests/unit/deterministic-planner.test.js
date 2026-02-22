import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNormalizedTaxData,
  generateDeterministicFillPlan
} from '../../src/planning/deterministic-planner.js';

test('buildNormalizedTaxData merges form16 and ais data into single normalized object', () => {
  const normalized = buildNormalizedTaxData(
    {
      taxProfile: { name: 'Test User', pan: 'ABCDE1234F', assessmentYear: '2025-26' },
      salary: { grossSalary: 1000000, taxableSalary: 900000 },
      deductions: { section80C: 120000 },
      tdsCredits: [{ deductorName: 'Employer', tdsAmount: 100000 }],
      sourceDocuments: [{ docType: 'FORM16', fingerprint: 'f16_1' }]
    },
    {
      taxProfile: { pan: 'ABCDE1234F', assessmentYear: '2025-26' },
      otherIncome: { bankInterest: 5000, dividendIncome: 1000 },
      tdsCredits: [{ deductorName: 'AIS', tdsAmount: 99000 }],
      sourceDocuments: [{ docType: 'AIS_26AS', fingerprint: 'ais_1' }]
    }
  );

  assert.equal(normalized.taxProfile.name, 'Test User');
  assert.equal(normalized.taxProfile.pan, 'ABCDE1234F');
  assert.equal(normalized.otherIncome.bankInterest, 5000);
  assert.equal(normalized.meta.form16TdsTotal, 100000);
  assert.equal(normalized.meta.aisTdsTotal, 99000);
  assert.equal(normalized.sourceDocuments.length, 2);
});

test('generateDeterministicFillPlan creates salary, deductions, tds and other-income actions', () => {
  const normalizedData = {
    salary: {
      grossSalary: 1000000,
      standardDeduction: 50000,
      professionalTax: 2400,
      taxableSalary: 900000
    },
    deductions: {
      section80C: 120000,
      section80D: 25000
    },
    otherIncome: {
      bankInterest: 5000,
      dividendIncome: 1000
    },
    meta: {
      form16TdsTotal: 100000,
      aisTdsTotal: 98000
    }
  };

  const fillPlan = generateDeterministicFillPlan({ itrType: 'ITR1', normalizedData });

  assert.equal(fillPlan.itrType, 'ITR1');
  assert.ok(fillPlan.actions.length >= 8);
  assert.equal(fillPlan.actions.some((action) => action.fieldKey === 'salary.gross'), true);
  assert.equal(fillPlan.actions.some((action) => action.fieldKey === 'tds.total'), true);
});
