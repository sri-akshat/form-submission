const INCOME_TAX_HOST_PATTERN = /incometax\.gov\.in/i;

function normalize(text = '') {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function detectItrType(combinedText) {
  if (/itr[-\s]?2/.test(combinedText)) {
    return 'ITR2';
  }

  if (/itr[-\s]?1/.test(combinedText)) {
    return 'ITR1';
  }

  return null;
}

function detectPageId(combinedText) {
  if (combinedText.includes('salary')) return 'SALARY';
  if (combinedText.includes('tds')) return 'TDS';
  if (combinedText.includes('deduction')) return 'DEDUCTIONS';
  if (combinedText.includes('capital gain')) return 'CAPITAL_GAINS';
  return 'UNKNOWN';
}

export function detectPortalContext({
  url = '',
  headerText = '',
  bodyText = '',
  itrSelectionText = ''
}) {
  const signals = [];
  let score = 0;

  if (INCOME_TAX_HOST_PATTERN.test(url)) {
    score += 0.5;
    signals.push('URL_MATCH');
  }

  const combinedText = normalize(`${headerText} ${bodyText} ${itrSelectionText}`);

  if (combinedText.includes('income tax')) {
    score += 0.2;
    signals.push('TEXT_INCOME_TAX');
  }

  if (combinedText.includes('return') || combinedText.includes('filing')) {
    score += 0.2;
    signals.push('TEXT_RETURN_OR_FILING');
  }

  const itrType = detectItrType(combinedText);
  if (itrType) {
    score += 0.1;
    signals.push('ITR_TYPE_HINT');
  }

  const confidence = Number(Math.min(score, 1).toFixed(2));
  const isIncomeTaxPortal = confidence >= 0.6;

  return {
    isIncomeTaxPortal,
    itrType,
    pageId: detectPageId(combinedText),
    confidence,
    signals
  };
}
