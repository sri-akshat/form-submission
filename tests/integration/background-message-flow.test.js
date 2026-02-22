import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorkerBindings } from '../../src/background/worker.js';
import { MESSAGE_TYPES } from '../../src/shared/messages.js';

test('integration: START_SESSION then PORTAL_CONTEXT_DETECTED updates orchestrator state', async () => {
  const { router, orchestrator } = createWorkerBindings();

  const started = await router.dispatch({ type: MESSAGE_TYPES.START_SESSION });
  assert.equal(started.status, 'IDLE');

  await router.dispatch({
    type: MESSAGE_TYPES.PORTAL_CONTEXT_DETECTED,
    payload: {
      isIncomeTaxPortal: true,
      itrType: 'ITR2',
      pageId: 'SALARY',
      confidence: 0.9,
      signals: ['URL_MATCH', 'ITR_TYPE_HINT']
    }
  });

  const state = orchestrator.getState();
  assert.equal(state.status, 'PORTAL_DETECTED');
  assert.equal(state.portalContext.itrType, 'ITR2');
  assert.equal(orchestrator.getAuditEvents().length, 2);
});
