function normalize(text = '') {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

const DEFAULT_SALARY_SELECTOR_REGISTRY = {
  'salary.gross': ['#salary_gross', 'input[name="salaryGross"]', 'input[name*="gross"]'],
  'salary.standard_deduction': [
    '#standard_deduction',
    'input[name="standardDeduction"]',
    'input[name*="standard"]'
  ],
  'salary.professional_tax': ['#professional_tax', 'input[name="professionalTax"]'],
  'salary.taxable_income': ['#taxable_income', 'input[name="taxableIncome"]']
};

function safeQuery(doc, selector) {
  try {
    return doc?.querySelector ? doc.querySelector(selector) : null;
  } catch {
    return null;
  }
}

function safeQueryAll(doc, selector) {
  try {
    return doc?.querySelectorAll ? Array.from(doc.querySelectorAll(selector)) : [];
  } catch {
    return [];
  }
}

function resolveByLabel(doc, fieldLabel) {
  const labels = safeQueryAll(doc, 'label');
  const target = normalize(fieldLabel);

  for (const label of labels) {
    if (!normalize(label.textContent || '').includes(target)) {
      continue;
    }

    const forId = label.getAttribute ? label.getAttribute('for') : null;
    if (forId) {
      const byId = safeQuery(doc, `#${forId}`);
      if (byId) {
        return { element: byId, strategy: 'LABEL_FOR' };
      }
    }

    const embedded = label.querySelector ? label.querySelector('input, select, textarea') : null;
    if (embedded) {
      return { element: embedded, strategy: 'LABEL_EMBEDDED' };
    }
  }

  return null;
}

export function resolveFieldElement({
  documentRef,
  fieldKey,
  fieldLabel,
  selectorRegistry = DEFAULT_SALARY_SELECTOR_REGISTRY
}) {
  const selectors = selectorRegistry[fieldKey] || [];

  for (const selector of selectors) {
    const element = safeQuery(documentRef, selector);
    if (element) {
      return { element, strategy: 'SELECTOR_REGISTRY', selector };
    }
  }

  const byLabel = resolveByLabel(documentRef, fieldLabel);
  if (byLabel) {
    return byLabel;
  }

  return null;
}

export { DEFAULT_SALARY_SELECTOR_REGISTRY };
