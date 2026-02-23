export const AUDIT_EVENT_TYPES = {
  SESSION_STARTED: 'SESSION_STARTED',
  PORTAL_CONTEXT_DETECTED: 'PORTAL_CONTEXT_DETECTED',
  FORM16_PARSED: 'FORM16_PARSED',
  AIS_PARSED: 'AIS_PARSED',
  FILL_PLAN_GENERATED: 'FILL_PLAN_GENERATED',
  FILL_PLAN_VALIDATED: 'FILL_PLAN_VALIDATED',
  AUTOFILL_SALARY_STARTED: 'AUTOFILL_SALARY_STARTED',
  AUTOFILL_SALARY_COMPLETED: 'AUTOFILL_SALARY_COMPLETED',
  ERROR: 'ERROR'
};

export class AuditLog {
  constructor({ sessionId, now = () => new Date().toISOString() }) {
    this.sessionId = sessionId;
    this.now = now;
    this.events = [];
    this.sequence = 0;
  }

  append(eventType, payload = {}, actor = 'SYSTEM') {
    this.sequence += 1;
    const event = {
      eventId: `${this.sessionId}-${this.sequence}`,
      sessionId: this.sessionId,
      timestamp: this.now(),
      actor,
      eventType,
      payload
    };
    this.events.push(event);
    return event;
  }

  list() {
    return this.events.map((event) => ({ ...event }));
  }

  exportJson(pretty = true) {
    return JSON.stringify(this.events, null, pretty ? 2 : 0);
  }
}
