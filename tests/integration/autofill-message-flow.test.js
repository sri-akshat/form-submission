import test from 'node:test';
import assert from 'node:assert/strict';

import { SessionOrchestrator } from '../../src/background/session-orchestrator.js';
import { createWorkerBindings } from '../../src/background/worker.js';
import { MESSAGE_TYPES } from '../../src/shared/messages.js';

test('integration: RUN_AUTOFILL_SALARY_PAGE uses orchestrator executor and writes audit events', async () => {
  const orchestrator = new SessionOrchestrator({
    autofillExecutor: ({ fillPlan }) => ({
      ok: true,
      reason: 'COMPLETED',
      totalActions: fillPlan.actions.filter((action) => action.pageId === 'SALARY').length,
      successCount: 2,
      failedCount: 0,
      skippedCount: 0,
      results: []
    })
  });

  const { router } = createWorkerBindings(orchestrator);

  await router.dispatch({ type: MESSAGE_TYPES.START_SESSION });
  await router.dispatch({
    type: MESSAGE_TYPES.UPLOAD_FORM16_TEXT,
    payload: {
      form16Text:
        'Name: Test User\nPAN: ABCDE1234F\nAssessment Year: 2025-26\nGross Salary: 1000000\nTaxable Income: 900000\nDeductor: Employer - TDS: 100000'
    }
  });
  await router.dispatch({
    type: MESSAGE_TYPES.UPLOAD_AIS_TEXT,
    payload: {
      aisText: 'PAN: ABCDE1234F\nAssessment Year: 2025-26\nTotal TDS: 100000'
    }
  });
  await router.dispatch({ type: MESSAGE_TYPES.GENERATE_FILL_PLAN, payload: { itrType: 'ITR1' } });

  const runResult = await router.dispatch({
    type: MESSAGE_TYPES.RUN_AUTOFILL_SALARY_PAGE,
    payload: { maxRetries: 2 }
  });

  assert.equal(runResult.ok, true);
  assert.equal(runResult.successCount, 2);

  const state = await router.dispatch({ type: MESSAGE_TYPES.GET_SESSION_STATE });
  assert.equal(state.lastAutofillResult.ok, true);

  const eventTypes = orchestrator.getAuditEvents().map((event) => event.eventType);
  assert.equal(eventTypes.includes('AUTOFILL_SALARY_STARTED'), true);
  assert.equal(eventTypes.includes('AUTOFILL_SALARY_COMPLETED'), true);
});
