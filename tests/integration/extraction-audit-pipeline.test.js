import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorkerBindings } from '../../src/background/worker.js';
import { MESSAGE_TYPES } from '../../src/shared/messages.js';

test('integration: UPLOAD_FORM16_TEXT parses payload and writes FORM16_PARSED event', async () => {
  const { router, orchestrator } = createWorkerBindings();

  await router.dispatch({ type: MESSAGE_TYPES.START_SESSION });

  const response = await router.dispatch({
    type: MESSAGE_TYPES.UPLOAD_FORM16_TEXT,
    payload: {
      form16Text:
        'Name: Test User\\nPAN: ABCDE1234F\\nAssessment Year: 2025-26\\nGross Salary: 1000000\\nTaxable Income: 900000\\nDeductor: ABC Pvt Ltd (TAN AAAA99999A) - TDS: 100000'
    }
  });

  assert.equal(response.taxProfile.name, 'Test User');
  assert.equal(response.tdsCredits.length, 1);
  assert.equal(orchestrator.getState().form16Data.salary.grossSalary, 1000000);

  const latestEvent = orchestrator.getAuditEvents().at(-1);
  assert.equal(latestEvent.eventType, 'FORM16_PARSED');
  assert.equal(typeof latestEvent.payload.warningCount, 'number');
});
