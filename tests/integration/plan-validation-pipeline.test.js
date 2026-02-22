import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorkerBindings } from '../../src/background/worker.js';
import { MESSAGE_TYPES } from '../../src/shared/messages.js';

test('integration: GENERATE_FILL_PLAN merges parsed docs and returns validated plan', async () => {
  const { router, orchestrator } = createWorkerBindings();

  await router.dispatch({ type: MESSAGE_TYPES.START_SESSION });

  await router.dispatch({
    type: MESSAGE_TYPES.UPLOAD_FORM16_TEXT,
    payload: {
      form16Text:
        'Name: Test User\nPAN: ABCDE1234F\nAssessment Year: 2025-26\nGross Salary: 1000000\nStandard Deduction: 50000\nTaxable Income: 900000\nSection 80C: 120000\nDeductor: Employer (TAN AAAA99999A) - TDS: 100000'
    }
  });

  await router.dispatch({
    type: MESSAGE_TYPES.UPLOAD_AIS_TEXT,
    payload: {
      aisText:
        'PAN: ABCDE1234F\nAssessment Year: 2025-26\nBank Interest: 6000\nDividend Income: 2000\nTotal TDS: 100000'
    }
  });

  const response = await router.dispatch({
    type: MESSAGE_TYPES.GENERATE_FILL_PLAN,
    payload: { itrType: 'ITR1' }
  });

  assert.equal(response.normalizedData.taxProfile.pan, 'ABCDE1234F');
  assert.equal(response.normalizedData.otherIncome.bankInterest, 6000);
  assert.equal(response.fillPlan.itrType, 'ITR1');
  assert.equal(response.fillPlan.actions.some((action) => action.fieldKey === 'salary.gross'), true);
  assert.equal(response.validation.canExecute, true);

  const eventTypes = orchestrator.getAuditEvents().map((event) => event.eventType);
  assert.equal(eventTypes.includes('FILL_PLAN_GENERATED'), true);
  assert.equal(eventTypes.includes('FILL_PLAN_VALIDATED'), true);
});
