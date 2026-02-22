import test from 'node:test';
import assert from 'node:assert/strict';

import { parseForm16Text } from '../../src/extraction/form16-parser.js';

const SAMPLE_FORM16_TEXT = `
Name: Akshat Sharma
PAN: ABCDE1234F
Assessment Year: 2025-26
Gross Salary: 1,200,000
Standard Deduction: 50,000
Professional Tax: 2,400
Taxable Income: 1,147,600
Section 80C: 150,000
Section 80D: 25,000
Deductor: Example Technologies Pvt Ltd (TAN AAAA99999A) - TDS: 120,000
`;

test('parseForm16Text extracts primary profile, salary, deductions, and tds values', () => {
  const parsed = parseForm16Text(SAMPLE_FORM16_TEXT);

  assert.equal(parsed.taxProfile.name, 'Akshat Sharma');
  assert.equal(parsed.taxProfile.pan, 'ABCDE1234F');
  assert.equal(parsed.taxProfile.assessmentYear, '2025-26');
  assert.equal(parsed.salary.grossSalary, 1200000);
  assert.equal(parsed.salary.standardDeduction, 50000);
  assert.equal(parsed.salary.professionalTax, 2400);
  assert.equal(parsed.salary.taxableSalary, 1147600);
  assert.equal(parsed.deductions.section80C, 150000);
  assert.equal(parsed.deductions.section80D, 25000);
  assert.equal(parsed.tdsCredits.length, 1);
  assert.equal(parsed.tdsCredits[0].tdsAmount, 120000);
  assert.equal(parsed.parsingWarnings.length, 0);
  assert.equal(parsed.sourceDocuments[0].docType, 'FORM16');
  assert.ok(parsed.sourceDocuments[0].fingerprint.startsWith('f16_'));
});

test('parseForm16Text returns warnings for missing required fields', () => {
  const parsed = parseForm16Text('Name: Akshat Sharma');

  assert.equal(parsed.taxProfile.name, 'Akshat Sharma');
  assert.equal(parsed.taxProfile.pan, '');
  assert.equal(parsed.parsingWarnings.length > 0, true);
  assert.ok(parsed.parsingWarnings.some((warning) => warning.includes('Missing PAN')));
  assert.ok(
    parsed.parsingWarnings.some((warning) => warning.includes('Missing assessment year'))
  );
});
