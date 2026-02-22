import { AuditLog, AUDIT_EVENT_TYPES } from '../audit/audit-log.js';
import { parseAisText } from '../extraction/ais-parser.js';
import { parseForm16Text } from '../extraction/form16-parser.js';
import {
  buildNormalizedTaxData,
  generateDeterministicFillPlan
} from '../planning/deterministic-planner.js';
import { SESSION_STATUS, createSession, withStatus } from '../shared/session-state.js';
import { validateDeterministicPlan } from '../validation/deterministic-validator.js';

function makeSessionId(now = Date.now) {
  return `session_${now()}`;
}

export class SessionOrchestrator {
  constructor({ nowIso = () => new Date().toISOString(), nowMs = () => Date.now() } = {}) {
    this.nowIso = nowIso;
    this.nowMs = nowMs;
    this.session = null;
    this.auditLog = null;
  }

  startSession() {
    const sessionId = makeSessionId(this.nowMs);
    this.session = createSession(sessionId, this.nowIso());
    this.auditLog = new AuditLog({ sessionId, now: this.nowIso });

    this.auditLog.append(AUDIT_EVENT_TYPES.SESSION_STARTED, {
      status: this.session.status
    });

    return { ...this.session };
  }

  handlePortalContext(portalContext) {
    this.#ensureSession();

    this.session = withStatus(
      this.session,
      SESSION_STATUS.PORTAL_DETECTED,
      { portalContext },
      this.nowIso()
    );

    this.auditLog.append(AUDIT_EVENT_TYPES.PORTAL_CONTEXT_DETECTED, {
      portalContext
    });

    return { ...this.session };
  }

  parseForm16(rawText) {
    this.#ensureSession();

    const parsed = parseForm16Text(rawText);
    this.session = withStatus(
      this.session,
      this.session.status,
      { form16Data: parsed },
      this.nowIso()
    );

    this.auditLog.append(AUDIT_EVENT_TYPES.FORM16_PARSED, {
      warningCount: parsed.parsingWarnings.length,
      fingerprint: parsed.sourceDocuments[0]?.fingerprint
    });

    return parsed;
  }

  parseAis(rawText) {
    this.#ensureSession();

    const parsed = parseAisText(rawText);
    this.session = withStatus(this.session, this.session.status, { aisData: parsed }, this.nowIso());

    this.auditLog.append(AUDIT_EVENT_TYPES.AIS_PARSED, {
      warningCount: parsed.parsingWarnings.length,
      fingerprint: parsed.sourceDocuments[0]?.fingerprint
    });

    return parsed;
  }

  generateFillPlan({ itrType = 'ITR1' } = {}) {
    this.#ensureSession();

    const normalizedData = buildNormalizedTaxData(this.session.form16Data, this.session.aisData);

    const fillPlan = generateDeterministicFillPlan({
      itrType,
      normalizedData
    });

    const validation = validateDeterministicPlan(fillPlan, normalizedData);

    this.session = withStatus(
      this.session,
      this.session.status,
      {
        normalizedData,
        fillPlan: validation.reviewedPlan,
        planValidation: {
          warnings: validation.warnings,
          blockingIssues: validation.blockingIssues,
          canExecute: validation.canExecute
        }
      },
      this.nowIso()
    );

    this.auditLog.append(AUDIT_EVENT_TYPES.FILL_PLAN_GENERATED, {
      itrType,
      actionCount: fillPlan.actions.length,
      warningCount: fillPlan.warnings.length
    });

    this.auditLog.append(AUDIT_EVENT_TYPES.FILL_PLAN_VALIDATED, {
      validationWarningCount: validation.warnings.length,
      blockingIssueCount: validation.blockingIssues.length,
      canExecute: validation.canExecute
    });

    return {
      normalizedData,
      fillPlan: validation.reviewedPlan,
      validation: {
        warnings: validation.warnings,
        blockingIssues: validation.blockingIssues,
        canExecute: validation.canExecute
      }
    };
  }

  failSafe(errorMessage) {
    this.#ensureSession();

    this.session = withStatus(
      this.session,
      SESSION_STATUS.FAILED_SAFE,
      { lastError: errorMessage },
      this.nowIso()
    );

    this.auditLog.append(AUDIT_EVENT_TYPES.ERROR, { errorMessage });

    return { ...this.session };
  }

  getState() {
    return this.session ? { ...this.session } : null;
  }

  getAuditEvents() {
    return this.auditLog ? this.auditLog.list() : [];
  }

  #ensureSession() {
    if (!this.session) {
      throw new Error('Session not initialized. Call startSession first.');
    }
  }
}
