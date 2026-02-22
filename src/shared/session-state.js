export const SESSION_STATUS = {
  IDLE: 'IDLE',
  PORTAL_DETECTED: 'PORTAL_DETECTED',
  FAILED_SAFE: 'FAILED_SAFE'
};

export function createSession(sessionId, nowIso = new Date().toISOString()) {
  return {
    sessionId,
    status: SESSION_STATUS.IDLE,
    createdAt: nowIso,
    updatedAt: nowIso,
    portalContext: null,
    form16Data: null,
    aisData: null,
    normalizedData: null,
    fillPlan: null,
    planValidation: null
  };
}

export function withStatus(session, status, patch = {}, nowIso = new Date().toISOString()) {
  return {
    ...session,
    ...patch,
    status,
    updatedAt: nowIso
  };
}
