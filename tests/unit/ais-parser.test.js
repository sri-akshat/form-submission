import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAisText } from '../../src/extraction/ais-parser.js';

const SAMPLE_AIS_TEXT = `
PAN: ABCDE1234F
Assessment Year: 2025-26
Bank Interest: 12000
Dividend Income: 3500
AIS Deductor: Example Employer (TAN AAAA99999A) - TDS: 100000
`;

test('parseAisText extracts pan, ay, other income and tds rows', () => {
  const parsed = parseAisText(SAMPLE_AIS_TEXT);

  assert.equal(parsed.taxProfile.pan, 'ABCDE1234F');
  assert.equal(parsed.taxProfile.assessmentYear, '2025-26');
  assert.equal(parsed.otherIncome.bankInterest, 12000);
  assert.equal(parsed.otherIncome.dividendIncome, 3500);
  assert.equal(parsed.tdsCredits.length, 1);
  assert.equal(parsed.tdsCredits[0].tdsAmount, 100000);
  assert.equal(parsed.parsingWarnings.length, 0);
});

test('parseAisText falls back to total tds when rows are not present', () => {
  const parsed = parseAisText('PAN: ABCDE1234F\\nAssessment Year: 2025-26\\nTotal TDS: 45000');

  assert.equal(parsed.tdsCredits.length, 1);
  assert.equal(parsed.tdsCredits[0].deductorName, 'AIS_TOTAL');
  assert.equal(parsed.tdsCredits[0].tdsAmount, 45000);
});
