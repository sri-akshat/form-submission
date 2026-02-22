# Tech Design (HLD + LLD)

## Chrome Extension Form Assistant (MVP: ITR-1 + ITR-2)

Version: v0.1 (Draft)  
Input references: `prd_mvp_chrome_extension_form_assistant_for_itr_filing.md`, `tech_strategy_roadmap_mvp_itr_form_assistant_chrome_extension.md`

---

## 1. Scope and Design Goals

### 1.1 MVP In Scope
- Chrome extension-based assistant for Income Tax portal draft filing.
- Flows: ITR-1 and ITR-2 (with basic capital gains support).
- Document ingestion: Form 16 + AIS/26AS required, capital gains statement optional.
- Generate auditable Fill Plan before autofill.
- Explainability per field (source, confidence, rationale).
- Deterministic validation checks before and during execution.
- Stop before final submission.

### 1.2 Out of Scope
- Auto submission.
- ITR-3/business income workflows.
- Tax planning/optimization.
- Payment/refund workflow automation.

### 1.3 Non-Functional Targets
- Form 16 extraction latency: < 15s.
- AIS extraction latency: < 20s.
- Autofill latency per page: < 5s.
- 95%+ field correctness on test dataset.
- Safe failure on portal DOM drift.

---

## 2. Architecture Decisions

### 2.1 Core Decisions
1. Manifest V3 extension with TypeScript.
2. Local-first processing (default): PDFs parsed client-side; extracted JSON held in memory + optional encrypted local persistence.
3. Fill execution is always plan-driven (no direct ad-hoc fill).
4. LLM is constrained to structured planning/explanation only; DOM interaction remains deterministic.
5. Every user-visible or portal-facing action is logged in an append-only session audit log.

### 2.2 Deployment Units
- `popup-ui`: User interaction and progress UX.
- `background-service-worker`: Session orchestration, state, policy gates, optional LLM API calls.
- `content-script`: Portal detection, field discovery, fill execution.
- `shared-core`: Schema types, validators, rules, planner contracts.

---

## 3. HLD

### 3.1 High-Level Components

1. **Popup UI Layer**
- Start session, upload docs, show extraction summary.
- Show validation warnings, explainability, and action log.
- Checkpoint controls: `Continue`, `Pause`, `Skip low confidence`, `Abort`.

2. **Session Orchestrator (Background)**
- Owns state machine for filing session.
- Coordinates extraction, planning, validation, and execution.
- Enforces safety policies (confidence threshold, final submit block).

3. **Extraction Engine**
- Parse PDFs/documents into normalized `TaxProfile` schema.
- Deterministic-first parsers (regex/section maps); optional LLM-assisted extraction only for unsupported layouts.

4. **Planning Engine (Rules + LLM Adapter)**
- Converts normalized tax data + portal context into `FillPlan`.
- Adds source references and confidence.
- Produces explicit `warnings`, `missing_fields`, `unsupported_sections`.

5. **Validation Engine**
- Deterministic checks: salary consistency, TDS mismatch, deductions limits, capital gains sanity.
- Marks each action: `ALLOW`, `REVIEW_REQUIRED`, `BLOCK`.

6. **Portal Interaction Engine (Content Script)**
- Detect page + form context (ITR type, schedule/page id).
- Resolve selectors via label semantics + mapping registry.
- Execute fill actions with retries and post-fill verification.

7. **Audit & Telemetry**
- Append-only event stream per session.
- Export JSON/CSV for debugging and user trust.

### 3.2 Trust Boundaries
- Boundary A: User docs enter extension runtime (sensitive PII).
- Boundary B: Optional LLM API call only with explicit user consent and redaction controls.
- Boundary C: Portal interaction via content script (untrusted changing DOM).

### 3.3 End-to-End Flow

1. User starts session and accepts disclaimer.
2. Documents uploaded and parsed into normalized schema.
3. Planner generates draft Fill Plan.
4. Validation engine annotates actions/warnings.
5. User reviews summary + warnings.
6. Executor runs actions page-by-page with checkpoints.
7. Extension halts before final submit; user manually submits.
8. Session audit log remains exportable.

### 3.4 Runtime Sequence (Condensed)

1. `popup -> background`: `START_SESSION`.
2. `popup -> background`: `UPLOAD_DOC` (Form16/AIS/CG).
3. `background -> extraction`: `PARSE_DOCS` => `NormalizedTaxData`.
4. `background -> planner`: `GENERATE_FILL_PLAN`.
5. `background -> validator`: `VALIDATE_PLAN`.
6. `popup`: show summary, warnings, confidence gates.
7. `background -> content-script`: `EXECUTE_PAGE_ACTIONS`.
8. `content-script -> background`: action result events.
9. `background -> popup`: progress, explanations, errors.
10. `background`: enforce `STOP_AT_FINAL_SUBMIT`.

---

## 4. LLD

### 4.1 Proposed Repository Structure

```text
src/
  manifest/
  popup/
    app.tsx
    pages/
    components/
    state/
  background/
    worker.ts
    session-orchestrator.ts
    message-router.ts
  content/
    content-entry.ts
    portal-detector.ts
    field-resolver.ts
    autofill-runner.ts
    dom-actions.ts
  extraction/
    parsers/
      form16-parser.ts
      ais-parser.ts
      capital-gains-parser.ts
    normalization/
      normalize-tax-data.ts
  planning/
    planner.ts
    llm-adapter.ts
    fill-plan-builder.ts
  validation/
    rules/
      salary-consistency.rule.ts
      tds-mismatch.rule.ts
      deduction-limits.rule.ts
      capital-gains-sanity.rule.ts
    validator.ts
  audit/
    audit-log.ts
    telemetry.ts
  shared/
    schemas/
      tax-profile.ts
      fill-plan.ts
      portal-map.ts
      session.ts
    constants/
    utils/
```

### 4.2 Session State Machine

States:
- `IDLE`
- `PORTAL_DETECTED`
- `DOCS_UPLOADED`
- `EXTRACTION_COMPLETE`
- `PLAN_READY`
- `VALIDATION_REVIEW`
- `EXECUTING`
- `PAUSED`
- `AWAITING_FINAL_USER_SUBMISSION`
- `COMPLETED`
- `FAILED_SAFE`

Transition rules:
- No execution unless `PLAN_READY` and validation has no `BLOCK` items.
- Any critical DOM failure transitions to `FAILED_SAFE`.
- Any attempt near final submit triggers forced transition to `AWAITING_FINAL_USER_SUBMISSION`.

### 4.3 Core Data Contracts

#### 4.3.1 NormalizedTaxData

```ts
export interface NormalizedTaxData {
  taxProfile: {
    name: string;
    pan: string;
    assessmentYear: string;
  };
  salary: {
    grossSalary?: number;
    standardDeduction?: number;
    professionalTax?: number;
    taxableSalary?: number;
  };
  tdsCredits: Array<{
    deductorName: string;
    deductorTan?: string;
    tdsAmount: number;
    sourceRef: string;
  }>;
  otherIncome?: {
    bankInterest?: number;
    dividendIncome?: number;
  };
  capitalGains?: {
    stcgEquity?: number;
    ltcgEquity?: number;
    stcgOther?: number;
    ltcgOther?: number;
  };
  deductions?: {
    section80C?: number;
    section80D?: number;
  };
  sourceDocuments: Array<{
    docType: 'FORM16' | 'AIS_26AS' | 'CAPITAL_GAINS';
    fingerprint: string;
  }>;
}
```

#### 4.3.2 FillPlan

```ts
export interface FillPlan {
  sessionId: string;
  itrType: 'ITR1' | 'ITR2';
  generatedAt: string;
  actions: FillAction[];
  warnings: PlanWarning[];
  unsupportedSections: string[];
}

export interface FillAction {
  actionId: string;
  pageId: string;
  scheduleId?: string;
  fieldKey: string;
  fieldLabel: string;
  selectorHints: SelectorHint[];
  value: string | number | boolean;
  valueType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX';
  source: {
    documentType: string;
    sourceRef: string;
  };
  confidence: number;
  explanation: string;
  policy: 'ALLOW' | 'REVIEW_REQUIRED' | 'BLOCK';
}

export interface SelectorHint {
  strategy: 'LABEL_NEARBY' | 'ID' | 'NAME' | 'PLACEHOLDER' | 'ARIA_LABEL';
  token: string;
  weight: number;
}

export interface PlanWarning {
  type: 'MISMATCH' | 'MISSING_DATA' | 'UNSUPPORTED' | 'LOW_CONFIDENCE';
  message: string;
  affectedActionIds?: string[];
}
```

#### 4.3.3 Audit Event

```ts
export interface AuditEvent {
  eventId: string;
  sessionId: string;
  timestamp: string;
  actor: 'USER' | 'SYSTEM';
  eventType:
    | 'DOC_UPLOADED'
    | 'EXTRACTION_DONE'
    | 'PLAN_GENERATED'
    | 'VALIDATION_WARNING'
    | 'ACTION_ATTEMPT'
    | 'ACTION_SUCCESS'
    | 'ACTION_FAILED'
    | 'CHECKPOINT_PAUSE'
    | 'FINAL_SUBMIT_BLOCKED';
  actionId?: string;
  pageId?: string;
  payload: Record<string, unknown>;
}
```

### 4.4 Inter-Process Messaging Contracts

Commands (`popup -> background`):
- `START_SESSION`
- `UPLOAD_DOCUMENT`
- `GENERATE_PLAN`
- `RUN_NEXT_PAGE`
- `PAUSE_SESSION`
- `EXPORT_AUDIT_LOG`

Commands (`background -> content-script`):
- `DETECT_PORTAL_CONTEXT`
- `RUN_ACTION_BATCH`
- `VERIFY_PAGE_COMPLETION`
- `DISCOVERY_MODE_SCAN`

Events (`content-script -> background`):
- `PORTAL_CONTEXT_DETECTED`
- `ACTION_RESULT`
- `PAGE_VALIDATION_ERRORS`
- `DOM_RESOLUTION_FAILED`

### 4.5 Portal Mapping and Field Resolution

Resolution algorithm per field:
1. Load page mapping by `itrType + pageId`.
2. Try stable identifiers (`id`, `name`, known attributes).
3. Try semantic label matching in nearest DOM block.
4. Apply fuzzy score against `fieldLabel` variants.
5. Verify candidate with type/value constraints.
6. If score < threshold, mark unresolved and emit warning.

Selector registry design:
- Versioned registry: `portalMap[portalVersion][itrType][pageId][fieldKey]`.
- Hotfix-capable via config update file in extension bundle.
- Discovery mode logs unknown label/selector pairs for mapping updates.

### 4.6 Execution Engine Behavior

Per action:
1. Pre-check policy (`BLOCK` => skip + warn; `REVIEW_REQUIRED` => ask user if checkpoint configured).
2. Resolve selector.
3. Fill value via field-type-specific strategy.
4. Trigger native events (`input`, `change`, blur).
5. Read back DOM value and verify.
6. Retry max 2 times for transient failure.
7. Emit audit event.

Per page:
- Execute deterministic order from Fill Plan.
- Run page-level post-validation.
- Pause at configured checkpoint.
- Continue only via explicit user action.

### 4.7 Validation Rule Details

1. **Salary consistency**
- `taxableSalary <= grossSalary` and within expected deduction bounds.

2. **TDS mismatch**
- Compare summed Form 16 TDS vs AIS TDS.
- If absolute delta > threshold, warning `MISMATCH` and `REVIEW_REQUIRED`.

3. **Deduction limits**
- 80C <= statutory limit for assessment year config.
- 80D limits based on provided profile category if available; else warning.

4. **Capital gains sanity**
- If capital gains fields exist in ITR-2, ensure non-negative and schedule presence consistency.

### 4.8 LLM Integration Details

LLM is optional and behind feature flag `enableLLMPlanning`.

Prompt contract:
- Input: normalized data + target `itrType` + supported field dictionary.
- Output: strict JSON `DraftFillPlan`.
- Rejection conditions:
  - missing `sourceRef`
  - confidence not present
  - unknown field keys

Post-LLM deterministic sanitizer:
- schema validation
- field whitelist filtering
- confidence threshold enforcement (default 0.85)
- conversion to final `FillPlan`

### 4.9 Privacy and Security Controls

- In-memory handling by default for extracted content.
- Optional local persistence only with explicit opt-in.
- Redact PAN and account identifiers in telemetry by default.
- No document upload unless user opt-in for cloud parsing.
- Session auto-purge (memory) on completion or after inactivity timeout.

### 4.10 Failure Modes and Safe Fallbacks

1. DOM mapping failure:
- Stop page execution, show unresolved fields, switch to manual assist mode.

2. Extraction uncertainty:
- Surface fields as missing; do not infer values.

3. LLM unavailability/error:
- Fall back to deterministic planner with reduced coverage.

4. Unsupported ITR-2 section:
- Create explicit warning and checklist item; no autofill attempt.

5. Final submission boundary:
- Block any action on final submit control; show "manual submission required" notice.

---

## 5. Milestone-to-Design Traceability

1. Milestone 1 -> `popup`, `portal-detector`, basic state machine.
2. Milestone 2 -> extraction parsers + normalization schema.
3. Milestone 3 -> content autofill runner for one ITR-1 page + audit events.
4. Milestone 4 -> full ITR-1 mappings + validator rules + checkpoints.
5. Milestone 5 -> capital gains parser/mapping + unsupported warnings.
6. Milestone 6 -> ITR-2 schedule mappings + foreign asset placeholder warnings.
7. Milestone 7 -> explainability UI + confidence gating + audit export.
8. Milestone 8 -> hardened error handling + test dataset validation.

---

## 6. Testing and Quality Plan

### 6.1 Test Layers
- Unit tests: parsers, validation rules, planner sanitization, selector scoring.
- Integration tests: popup-background-content messaging; state machine transitions.
- E2E tests: Playwright with mocked portal pages for ITR-1/ITR-2 happy + failure paths.

### 6.2 Golden Datasets
- Minimum 3 realistic ITR-1 cases.
- Minimum 3 realistic ITR-2 cases (including capital gains variation).
- For each dataset: expected normalized JSON + expected Fill Plan snapshot.

### 6.3 Release Gates
- No critical `BLOCK` bug open.
- Field correctness >= 95% on golden datasets.
- All safety assertions pass (`STOP_AT_FINAL_SUBMIT`, audit completeness).

---

## 7. Open Design Decisions (To Freeze Before Build)

1. Full-return Fill Plan vs page-by-page generated plan.
- Recommendation: full-return plan + page-wise execution (better auditability).

2. Local-only extraction vs optional cloud fallback in MVP.
- Recommendation: local-only MVP, cloud parsing deferred.

3. Confidence threshold by field class.
- Recommendation: default 0.85, stricter (0.90) for tax/tds totals.

4. User override handling.
- Recommendation: allow edits on portal; log `USER_OVERRIDE` in audit stream.

---

## 8. Implementation Kickoff Backlog (First 2 Sprints)

### Sprint 1
- MV3 scaffold + message bus.
- Portal detection + session bootstrap.
- Form 16 parser (deterministic v1).
- Base schemas + audit log writer.

### Sprint 2
- AIS parser (deterministic v1).
- Planner + validator (deterministic path).
- ITR-1 salary page autofill runner.
- Explainability panel (field-level cards).

