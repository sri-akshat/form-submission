# Product Requirements Document (PRD) – MVP

## Chrome Extension Form Assistant (Hero Use Case: ITR Filing)

**Version:** v0.2 (Draft)  
**Owner:** *[Akshat]*  
**Last Updated:** *[YYYY-MM-DD]*  

---

## 1. Background / Context
The Indian Income Tax Return (ITR) filing workflow is complex, time-consuming, and error-prone for individuals. Even users who have all required documents (Form 16, AIS/26AS, investment proofs) struggle to correctly map information into the Income Tax Portal fields. The complexity increases further due to frequent portal UI changes and lack of clarity around tax sections.

This creates a strong opportunity for an assistive system that can reduce friction, prevent mistakes, and improve user confidence while filing.

---

## 2. Problem Statement
Users want a guided assistant that can help them complete the ITR filing workflow by automatically filling portal fields accurately from their tax documents, explaining what is being filled and why, and ensuring the user retains final control before submission.

---

## 3. Target Users

### 3.1 Primary Users (MVP)
- Salaried individuals filing **ITR-1** (Form 16 based)
- Individuals filing **ITR-2** (salary + other income + capital gains + foreign assets disclosure, excluding business income)

### 3.2 Secondary Users (Later)
- Freelancers / gig workers (ITR-3)
- Chartered Accountants (bulk filing workflows)

### 3.3 Out of Scope for MVP
- Audit cases
- Business income (ITR-3)

---

## 4. Goals (MVP)
- Reduce ITR filing time from **2–3 hours** to **< 25 minutes**.
- Reduce manual data entry effort significantly.
- Improve user confidence by providing explainability and validation checks.
- Enable a working end-to-end **draft filing workflow** for both **ITR-1 and ITR-2**.

---

## 5. Non-Goals (MVP)
- Auto-submit the ITR on behalf of the user.
- Provide tax planning or optimization recommendations.
- Support all ITR forms.
- Handle business audit / ITR-3 / GST workflows.
- Full automation of payment/refund workflows.

---

## 6. MVP Scope (Must Have Features)
MVP must include the following:

### A) Chrome Extension Basics
- Installable Chrome extension
- Detect when user is on Income Tax Portal
- Provide a simple UI to start filing assistant
- Detect whether the user is in ITR-1 or ITR-2 flow (based on portal selection)

### B) Document Upload + Extraction
MVP should support document ingestion for both ITR-1 and ITR-2.

**Required documents (minimum)**
- Upload **Form 16 PDF**
- Upload **AIS / 26AS report** (PDF or downloaded format)

**Optional documents (Nice-to-have but recommended)**
- Capital Gains statement (broker report / CAMS / Zerodha tax P&L)
- Bank interest statement / FD interest report
- Investment proof documents (80C, 80D)

**Extraction requirements**
- Extract key values needed for ITR-1
- Extract key values needed for ITR-2 (including capital gains + other income)

### C) Autofill Workflow
- Fill key fields for both **ITR-1 and ITR-2** workflows:
  - Salary income
  - TDS credits
  - Deductions
  - Other income (interest, dividend where applicable)
  - Capital gains schedules (basic LTCG/STCG support)
- Navigate through portal pages where possible
- Pause at checkpoints for user review

### D) Explainability Panel
- Show what value is being filled
- Show source (Form 16 / AIS / Capital Gains report reference)
- Show reasoning in simple language

### E) Validation Checks
- Basic mismatch checks (e.g., salary vs taxable income)
- TDS mismatch check (Form 16 vs AIS)
- Capital gains mismatch check (broker report vs AIS where possible)
- Missing field warnings
- Confidence thresholding (do not fill if low confidence)

### F) Safety Guardrail
- Extension must stop before final submission
- User must click submit manually
- All auto-fill actions must be reversible (user can clear or edit)

---

## 7. MVP User Journey
1. User installs extension.
2. User logs into Income Tax Portal manually.
3. User starts the assistant from extension UI.
4. User selects filing flow (ITR-1 or ITR-2) if not auto-detected.
5. User uploads required documents (Form 16 + AIS/26AS).
6. Extension extracts data and shows a preview summary.
7. Extension begins autofilling portal fields step-by-step.
8. After each major section, extension shows a review screen.
9. Extension runs validation checks and flags missing/mismatched fields.
10. Extension stops at final submission screen.
11. User manually reviews and submits.

---

## 8. Key Screens / UX Requirements

### Extension Popup UI must include:
- Start button
- Filing mode indicator: ITR-1 / ITR-2
- Upload Form 16
- Upload AIS / 26AS
- Upload Capital Gains report (optional)
- Progress indicator (Step 1/6 etc.)
- View extracted summary
- View fill actions log

### Explainability panel must show:
- Field name
- Value being filled
- Source document reference
- Confidence score
- "Why this value?" explanation

---

## 9. Data Requirements (MVP)

### 9.1 Common Fields (ITR-1 + ITR-2)
- PAN
- Name
- Assessment Year
- Employer details
- Gross Salary
- Standard Deduction
- Professional Tax
- Taxable Income
- Total TDS

### 9.2 ITR-1 Specific
- Income from salary
- Income from other sources (basic)
- Section 80C deductions
- Section 80D deductions

### 9.3 ITR-2 Specific
- Income from other sources (interest/dividend)
- Capital gains schedules (basic support)
  - LTCG equity
  - STCG equity
- Foreign assets schedule (MVP: disclosure-only placeholders / warnings)

### Optional (Nice-to-have)
- HRA breakup
- House property interest (self-occupied)

---

## 10. Success Metrics (MVP)

### User Success Metrics
- Time to reach draft completion:
  - ITR-1: **< 20 minutes**
  - ITR-2: **< 30 minutes**
- User confidence score (self-reported): **> 8/10**
- User completes filing without needing external help

### Accuracy Metrics
- 95%+ field correctness on test dataset
- < 1 critical mismatch per filing session

### Technical Metrics
- Form 16 extraction latency: < 15 seconds
- AIS extraction latency: < 20 seconds
- Autofill latency per page: < 5 seconds

---

## 11. Constraints / Guardrails
- Must not auto-submit the ITR.
- Must not store user documents unless user explicitly opts in.
- Must provide clear disclaimers: assistant does not replace CA advice.
- Must support safe failure: if portal DOM changes, stop gracefully.
- Must maintain audit log of every field filled.
- Must display warnings prominently for any section not fully supported (esp. ITR-2 capital gains / foreign assets).

---

## 12. Out of Scope (Explicit)
- ITR-3 / business income workflows
- GST filing
- Audit cases
- Bulk CA workflows
- Payment automation
- Tax optimization suggestions

---

## 13. Open Questions
- Should parsing happen locally in browser or via backend?
- How do we handle portal UI changes robustly?
- How do we handle OTP / Aadhaar verification steps?
- How to structure disclaimers and compliance boundaries?
- What confidence threshold is acceptable before autofilling?
- How to handle capital gains variations across brokers?

---

## 14. Risks
- Portal DOM changes can break selectors.
- Incorrect autofill could lead to financial/legal risk.
- Users may over-trust assistant output.
- Data privacy concerns may block adoption.
- Government may introduce anti-automation measures.
- ITR-2 scope creep (capital gains + foreign assets complexity).

---

## 15. Milestones (Draft)
- **Milestone 1:** Extension skeleton + portal detection + ITR mode detection
- **Milestone 2:** Form 16 + AIS upload + extraction
- **Milestone 3:** Autofill for one ITR-1 page end-to-end
- **Milestone 4:** Full draft completion for ITR-1
- **Milestone 5:** Capital gains schedule support (basic) for ITR-2
- **Milestone 6:** Full draft completion for ITR-2
- **Milestone 7:** Explainability + validation + audit log
- **Milestone 8:** MVP demo-ready version

