import test from 'node:test';
import assert from 'node:assert/strict';

import { AuditLog, AUDIT_EVENT_TYPES } from '../../src/audit/audit-log.js';

test('AuditLog appends ordered events with deterministic ids', () => {
  const timestamps = ['2026-02-22T10:00:00.000Z', '2026-02-22T10:00:01.000Z'];
  let idx = 0;
  const log = new AuditLog({
    sessionId: 'session_123',
    now: () => timestamps[idx++]
  });

  const first = log.append(AUDIT_EVENT_TYPES.SESSION_STARTED, { status: 'IDLE' });
  const second = log.append(AUDIT_EVENT_TYPES.PORTAL_CONTEXT_DETECTED, { itrType: 'ITR1' });

  assert.equal(first.eventId, 'session_123-1');
  assert.equal(second.eventId, 'session_123-2');
  assert.equal(log.list().length, 2);
  assert.equal(log.list()[1].timestamp, '2026-02-22T10:00:01.000Z');
});

test('AuditLog exportJson returns valid JSON array', () => {
  const log = new AuditLog({ sessionId: 'session_123', now: () => '2026-02-22T10:00:00.000Z' });
  log.append(AUDIT_EVENT_TYPES.SESSION_STARTED, { status: 'IDLE' });

  const json = log.exportJson(false);
  const parsed = JSON.parse(json);

  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed[0].eventType, AUDIT_EVENT_TYPES.SESSION_STARTED);
});
