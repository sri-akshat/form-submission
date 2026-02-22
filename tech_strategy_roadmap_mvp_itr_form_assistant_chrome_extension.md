# Tech Strategy & Roadmap – MVP

## Chrome Extension Form Assistant (ITR-1 + ITR-2)

**Version:** v0.1 (Draft)\
**Owner:** *[Akshat]*\
**Last Updated:** *[YYYY-MM-DD]*

---

## 1. Objective

Build a Chrome extension that assists users in filing Income Tax Returns (ITR-1 and ITR-2) on the Income Tax Portal by:

- ingesting user tax documents (Form 16, AIS/26AS, capital gains statements)
- extracting structured financial data
- generating a safe and auditable “Fill Plan”
- autofilling portal fields with explainability and validations
- stopping before final submission

The system must be designed for:

- correctness
- auditability
- privacy
- resilience to portal UI changes

---

## 2. System Principles (Non-Negotiables)

### 2.1 Safety First

- Never auto-submit the return.
- Never perform irreversible actions.
- Every field-fill action must be logged.

### 2.2 Spec-driven Fill Plan

The extension must generate a structured “Fill Plan” before executing any autofill.

### 2.3 Explainability by Design

Every filled value must have:

- a source reference (document/page/line)
- a confidence score
- a plain-English explanation

### 2.4 Validation before Action

Before executing fill actions, the system should run:

- basic sanity checks
- mismatch checks (Form 16 vs AIS)
- schedule completeness checks

### 2.5 Local-first (Preferred)

Default strategy should avoid uploading sensitive tax documents to a backend. Backend should be optional and minimal.

---

## 3. High-Level Architecture

### 3.1 Components

#### A) Chrome Extension UI (Popup)

Responsibilities:

- user onboarding
- upload documents
- show extracted summary
- show fill progress
- show warnings and explainability

#### B) Content Script (Portal Interaction Layer)

Responsibilities:

- detect portal state/page
- find DOM fields
- fill values
- click “Next” / navigate
- capture field labels and validation errors

#### C) Extraction Layer (Document Parsing)

Responsibilities:

- parse Form 16 PDF
- parse AIS/26AS PDF
- parse capital gains statements (basic)
- output normalized JSON

#### D) Mapping + Planning Layer (LLM + Rules)

Responsibilities:

- convert extracted JSON into a structured portal schema
- generate “Fill Plan” actions
- assign confidence scores
- identify missing information

#### E) Rules Engine (Deterministic Validation)

Responsibilities:

- mismatch checks
- threshold checks
- completeness checks
- detect unsafe/unfillable values

#### F) Execution Engine (Autofill Runner)

Responsibilities:

- apply fill plan safely
- execute action-by-action
- pause for user confirmation if needed
- handle retries and failures

#### G) Audit Log + Telemetry

Responsibilities:

- record every action performed
- allow user to export log
- enable debugging for failures

---

## 4. Data Model (Draft)

### 4.1 Normalized Tax JSON (Output of Extraction)

**TaxProfile**

- name
- PAN
- assessment\_year

**SalaryIncome**

- gross\_salary
- standard\_deduction
- professional\_tax
- taxable\_salary

**TDSCredits**

- deductor\_name
- deductor\_TAN
- tds\_amount

**OtherIncome**

- bank\_interest
- dividend\_income

**CapitalGains**

- stcg\_equity
- ltcg\_equity
- stcg\_other
- ltcg\_other

**Deductions**

- section\_80c
- section\_80d

---

### 4.2 Fill Plan Schema (Core Artifact)

Fill Plan must be a JSON structure like:

```json
{
  "itr_type": "ITR2",
  "actions": [
    {
      "page": "Salary",
      "field_label": "Gross Salary",
      "field_selector": "#salary_gross",
      "value": 1200000,
      "source": "Form16-PartB-Row12",
      "confidence": 0.92,
      "explanation": "Taken from Form 16 Part B gross salary line item"
    }
  ],
  "warnings": [
    {
      "type": "MISMATCH",
      "message": "TDS differs between Form 16 and AIS"
    }
  ]
}
```

**Note:** field\_selector can be discovered dynamically, but Fill Plan must remain structured and auditable.

---

## 5. Portal Mapping Strategy

### 5.1 Portal Page Detection

The content script should detect the current portal page using:

- URL patterns
- visible header text
- DOM element IDs/classes

### 5.2 Field Identification

Approach:

- primarily locate input fields by nearby label text
- maintain a mapping table for known ITR pages
- fall back to fuzzy matching if labels differ

### 5.3 DOM Change Resilience

To reduce fragility:

- prefer semantic matching of label text
- avoid absolute XPath
- maintain versioned selectors
- implement “field discovery mode” with logging

---

## 6. LLM Strategy (AI-native Execution)

### 6.1 What the LLM Should Do

- convert extracted tax JSON into portal-specific structured fields
- generate a draft Fill Plan
- generate explainability text
- highlight missing information

### 6.2 What the LLM Must NOT Do

- directly manipulate DOM
- decide submission
- hallucinate missing financial values

### 6.3 Prompting Strategy

Use strict structured output prompts:

- output must be JSON only
- include confidence scoring
- include required source references

### 6.4 Guardrails

- reject fill actions without a valid source
- reject fill actions with confidence below threshold
- apply deterministic validations before execution

---

## 7. Validation Strategy

### 7.1 Required Checks (MVP)

- salary taxable income consistency
- Form 16 vs AIS TDS mismatch
- capital gains sanity checks (if present)
- deductions upper bound checks

### 7.2 Optional Checks (Later)

- AIS category reconciliation
- interest income validation from bank statements
- employer TAN verification

---

## 8. Security & Privacy Strategy

### 8.1 Local-first Default

- parse PDFs locally in browser
- keep extracted JSON in-memory
- allow user to export JSON manually

### 8.2 Optional Backend (Future)

If backend is introduced:

- encrypt uploads
- short retention policy
- audit trail
- explicit user consent

### 8.3 Compliance / Disclaimer

- show disclaimer before starting fill
- show warning that user is responsible for final submission

---

## 9. Deployment & Release Strategy

### 9.1 Distribution

- initial distribution via unpacked extension (developer mode)
- later publish to Chrome Web Store

### 9.2 Rollout Strategy

- internal alpha (self testing)
- friends/family beta
- CA pilot cohort

---

## 10. Tech Roadmap (Aligned to Product Milestones)

### Milestone 1: Extension Skeleton + Portal Detection

Deliverables:

- chrome extension scaffolding
- detect portal pages
- show popup UI

### Milestone 2: Form 16 + AIS Upload + Extraction

Deliverables:

- upload UI
- Form 16 parser (basic)
- AIS/26AS parser (basic)
- normalized JSON output

### Milestone 3: Autofill for One ITR-1 Page End-to-End

Deliverables:

- DOM fill runner
- manual mapping for 1 page
- audit log recording

### Milestone 4: Full Draft Completion for ITR-1

Deliverables:

- mapping for salary + deductions + TDS pages
- validation checks for ITR-1
- review checkpoints

### Milestone 5: Capital Gains Schedule Support (Basic) for ITR-2

Deliverables:

- ingestion of capital gains statement
- basic LTCG/STCG schedule fill
- warnings for unsupported scenarios

### Milestone 6: Full Draft Completion for ITR-2

Deliverables:

- mapping for ITR-2-specific pages
- other income support
- foreign assets warning placeholders

### Milestone 7: Explainability + Validation + Audit Log

Deliverables:

- UI panel for per-field explanation
- confidence thresholding
- mismatch warnings surfaced in UI
- exportable audit log

### Milestone 8: MVP Demo-Ready Version

Deliverables:

- full flow demo
- error handling for portal changes
- stable experience across at least 3 sample ITR cases

---

## 11. Engineering Risks & Mitigations

### Risk 1: Portal UI Changes Frequently

Mitigation:

- semantic label matching
- fallback discovery mode
- keep mapping modular

### Risk 2: PDF Parsing Accuracy

Mitigation:

- start with deterministic extraction (regex + known patterns)
- only later use LLM extraction

### Risk 3: Hallucinations from LLM

Mitigation:

- LLM must cite sources
- reject actions without source reference
- confidence thresholds + deterministic checks

### Risk 4: Scope Creep in ITR-2

Mitigation:

- support only equity LTCG/STCG initially
- unsupported schedules trigger warnings, not fill

---

## 12. Open Questions

- Should Fill Plan be generated per page or full return at once?
- How to handle multi-employer Form 16?
- How to represent portal field IDs robustly?
- Should we allow manual user overrides (recommended)?
- Should we store user mapping preferences for repeat filings?

---

## 13. Next Steps

- Freeze MVP scope for ITR-2 (which schedules are supported)
- Pick 3 sample real test cases for ITR-1 and ITR-2
- Build extension skeleton + portal detection
- Implement Form 16 extraction as first proof point

