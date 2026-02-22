function sumTds(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row.tdsAmount) || 0), 0);
}

function toCurrencyNumber(value) {
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : 0;
}

function applyLowConfidencePolicy(plan, threshold = 0.85) {
  for (const action of plan.actions) {
    if (action.confidence < threshold && action.policy === 'ALLOW') {
      action.policy = 'REVIEW_REQUIRED';
    }
  }
}

export function validateDeterministicPlan(plan, normalizedData, { tdsDeltaThreshold = 100, confidenceThreshold = 0.85 } = {}) {
  const warnings = [];
  const blockingIssues = [];

  const grossSalary = toCurrencyNumber(normalizedData?.salary?.grossSalary);
  const taxableSalary = toCurrencyNumber(normalizedData?.salary?.taxableSalary);

  if (taxableSalary > grossSalary && grossSalary > 0) {
    blockingIssues.push({
      type: 'SALARY_INCONSISTENCY',
      message: 'Taxable salary exceeds gross salary. Review source values before autofill.'
    });
  }

  const deduction80C = toCurrencyNumber(normalizedData?.deductions?.section80C);
  if (deduction80C > 150000) {
    warnings.push({
      type: 'DEDUCTION_LIMIT',
      message: 'Section 80C exceeds the default statutory cap of 150000.'
    });
  }

  const deduction80D = toCurrencyNumber(normalizedData?.deductions?.section80D);
  if (deduction80D > 50000) {
    warnings.push({
      type: 'DEDUCTION_LIMIT',
      message: 'Section 80D appears above common cap (50000). Verify eligibility.'
    });
  }

  const form16Tds = sumTds(normalizedData?.tdsCredits?.form16 || []);
  const aisTds = sumTds(normalizedData?.tdsCredits?.ais || []);

  if (form16Tds > 0 && aisTds > 0) {
    const delta = Math.abs(form16Tds - aisTds);
    if (delta > tdsDeltaThreshold) {
      warnings.push({
        type: 'TDS_MISMATCH',
        message: `TDS mismatch detected between Form 16 (${form16Tds}) and AIS (${aisTds}).`
      });

      for (const action of plan.actions) {
        if (action.fieldKey === 'tds.total' && action.policy === 'ALLOW') {
          action.policy = 'REVIEW_REQUIRED';
        }
      }
    }
  }

  applyLowConfidencePolicy(plan, confidenceThreshold);

  if (blockingIssues.length > 0) {
    for (const action of plan.actions) {
      if (action.pageId === 'SALARY') {
        action.policy = 'BLOCK';
      }
    }
  }

  return {
    warnings,
    blockingIssues,
    canExecute: blockingIssues.length === 0,
    reviewedPlan: plan
  };
}
