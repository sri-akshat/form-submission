function sumTds(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row.tdsAmount) || 0), 0);
}

function addAction(actions, action) {
  if (action.value === undefined || action.value === null) {
    return;
  }

  actions.push({
    actionId: `action_${actions.length + 1}`,
    policy: 'ALLOW',
    ...action
  });
}

export function buildNormalizedTaxData(form16Data, aisData) {
  const form16TdsTotal = sumTds(form16Data?.tdsCredits || []);
  const aisTdsTotal = sumTds(aisData?.tdsCredits || []);

  return {
    taxProfile: {
      name: form16Data?.taxProfile?.name || '',
      pan: form16Data?.taxProfile?.pan || aisData?.taxProfile?.pan || '',
      assessmentYear:
        form16Data?.taxProfile?.assessmentYear || aisData?.taxProfile?.assessmentYear || ''
    },
    salary: {
      grossSalary: form16Data?.salary?.grossSalary,
      standardDeduction: form16Data?.salary?.standardDeduction,
      professionalTax: form16Data?.salary?.professionalTax,
      taxableSalary: form16Data?.salary?.taxableSalary
    },
    deductions: {
      section80C: form16Data?.deductions?.section80C,
      section80D: form16Data?.deductions?.section80D
    },
    otherIncome: {
      bankInterest: aisData?.otherIncome?.bankInterest,
      dividendIncome: aisData?.otherIncome?.dividendIncome
    },
    tdsCredits: {
      form16: form16Data?.tdsCredits || [],
      ais: aisData?.tdsCredits || []
    },
    sourceDocuments: [
      ...(form16Data?.sourceDocuments || []),
      ...(aisData?.sourceDocuments || [])
    ],
    meta: {
      form16TdsTotal,
      aisTdsTotal
    }
  };
}

export function generateDeterministicFillPlan({ itrType = 'ITR1', normalizedData }) {
  const actions = [];
  const warnings = [];

  if (!normalizedData?.salary?.grossSalary) {
    warnings.push({
      type: 'MISSING_DATA',
      message: 'Gross salary missing. Salary page autofill will be partial.'
    });
  }

  addAction(actions, {
    pageId: 'SALARY',
    fieldKey: 'salary.gross',
    fieldLabel: 'Gross Salary',
    valueType: 'NUMBER',
    value: normalizedData?.salary?.grossSalary,
    confidence: 0.95,
    source: { documentType: 'FORM16', sourceRef: 'FORM16:GROSS_SALARY' },
    explanation: 'Gross salary extracted from Form 16.'
  });

  addAction(actions, {
    pageId: 'SALARY',
    fieldKey: 'salary.standard_deduction',
    fieldLabel: 'Standard Deduction',
    valueType: 'NUMBER',
    value: normalizedData?.salary?.standardDeduction,
    confidence: 0.95,
    source: { documentType: 'FORM16', sourceRef: 'FORM16:STANDARD_DEDUCTION' },
    explanation: 'Standard deduction extracted from Form 16.'
  });

  addAction(actions, {
    pageId: 'SALARY',
    fieldKey: 'salary.professional_tax',
    fieldLabel: 'Professional Tax',
    valueType: 'NUMBER',
    value: normalizedData?.salary?.professionalTax,
    confidence: 0.95,
    source: { documentType: 'FORM16', sourceRef: 'FORM16:PROFESSIONAL_TAX' },
    explanation: 'Professional tax extracted from Form 16.'
  });

  addAction(actions, {
    pageId: 'SALARY',
    fieldKey: 'salary.taxable_income',
    fieldLabel: 'Taxable Income',
    valueType: 'NUMBER',
    value: normalizedData?.salary?.taxableSalary,
    confidence: 0.95,
    source: { documentType: 'FORM16', sourceRef: 'FORM16:TAXABLE_SALARY' },
    explanation: 'Taxable salary extracted from Form 16.'
  });

  addAction(actions, {
    pageId: 'DEDUCTIONS',
    fieldKey: 'deduction.80c',
    fieldLabel: 'Section 80C',
    valueType: 'NUMBER',
    value: normalizedData?.deductions?.section80C,
    confidence: 0.95,
    source: { documentType: 'FORM16', sourceRef: 'FORM16:SECTION_80C' },
    explanation: '80C deduction extracted from Form 16.'
  });

  addAction(actions, {
    pageId: 'DEDUCTIONS',
    fieldKey: 'deduction.80d',
    fieldLabel: 'Section 80D',
    valueType: 'NUMBER',
    value: normalizedData?.deductions?.section80D,
    confidence: 0.95,
    source: { documentType: 'FORM16', sourceRef: 'FORM16:SECTION_80D' },
    explanation: '80D deduction extracted from Form 16.'
  });

  addAction(actions, {
    pageId: 'TDS',
    fieldKey: 'tds.total',
    fieldLabel: 'Total TDS',
    valueType: 'NUMBER',
    value: normalizedData?.meta?.form16TdsTotal || normalizedData?.meta?.aisTdsTotal,
    confidence: normalizedData?.meta?.form16TdsTotal ? 0.95 : 0.9,
    source: normalizedData?.meta?.form16TdsTotal
      ? { documentType: 'FORM16', sourceRef: 'FORM16:TDS_TOTAL' }
      : { documentType: 'AIS_26AS', sourceRef: 'AIS:TDS_TOTAL' },
    explanation: 'TDS total mapped from available tax statement.'
  });

  addAction(actions, {
    pageId: 'OTHER_INCOME',
    fieldKey: 'other_income.bank_interest',
    fieldLabel: 'Bank Interest',
    valueType: 'NUMBER',
    value: normalizedData?.otherIncome?.bankInterest,
    confidence: 0.9,
    source: { documentType: 'AIS_26AS', sourceRef: 'AIS:BANK_INTEREST' },
    explanation: 'Bank interest extracted from AIS/26AS.'
  });

  addAction(actions, {
    pageId: 'OTHER_INCOME',
    fieldKey: 'other_income.dividend',
    fieldLabel: 'Dividend Income',
    valueType: 'NUMBER',
    value: normalizedData?.otherIncome?.dividendIncome,
    confidence: 0.9,
    source: { documentType: 'AIS_26AS', sourceRef: 'AIS:DIVIDEND' },
    explanation: 'Dividend income extracted from AIS/26AS.'
  });

  return {
    itrType,
    generatedAt: new Date().toISOString(),
    actions,
    warnings
  };
}
