import test from 'node:test';
import assert from 'node:assert/strict';

import { SessionOrchestrator } from '../../src/background/session-orchestrator.js';
import { SESSION_STATUS } from '../../src/shared/session-state.js';

test('SessionOrchestrator starts a session and records initial audit event', () => {
  const orchestrator = new SessionOrchestrator({
    nowMs: () => 1700000000000,
    nowIso: () => '2026-02-22T10:00:00.000Z'
  });

  const session = orchestrator.startSession();

  assert.equal(session.sessionId, 'session_1700000000000');
  assert.equal(session.status, SESSION_STATUS.IDLE);

  const events = orchestrator.getAuditEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, 'SESSION_STARTED');
});

test('SessionOrchestrator transitions to PORTAL_DETECTED and stores context', () => {
  const orchestrator = new SessionOrchestrator({
    nowMs: () => 1700000000001,
    nowIso: () => '2026-02-22T10:00:00.000Z'
  });

  orchestrator.startSession();
  const nextState = orchestrator.handlePortalContext({
    isIncomeTaxPortal: true,
    itrType: 'ITR1',
    pageId: 'SALARY',
    confidence: 0.91,
    signals: ['URL_MATCH']
  });

  assert.equal(nextState.status, SESSION_STATUS.PORTAL_DETECTED);
  assert.equal(nextState.portalContext.itrType, 'ITR1');
  assert.equal(orchestrator.getAuditEvents().length, 2);
});

test('SessionOrchestrator parseForm16 stores parsed data and writes audit event', () => {
  const orchestrator = new SessionOrchestrator({
    nowMs: () => 1700000000002,
    nowIso: () => '2026-02-22T10:00:00.000Z'
  });

  orchestrator.startSession();

  const parsed = orchestrator.parseForm16('Name: User\\nPAN: ABCDE1234F\\nAssessment Year: 2025-26\\nGross Salary: 10,00,000\\nTaxable Income: 9,50,000');

  assert.equal(parsed.taxProfile.pan, 'ABCDE1234F');
  assert.equal(orchestrator.getState().form16Data.taxProfile.assessmentYear, '2025-26');
  assert.equal(orchestrator.getAuditEvents().at(-1).eventType, 'FORM16_PARSED');
});
