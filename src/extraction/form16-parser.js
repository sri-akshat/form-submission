function parseAmount(raw) {
  if (!raw) return null;
  const normalized = raw.replace(/[,\s]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function extract(pattern, text) {
  const match = text.match(pattern);
  if (!match) return null;

  for (let i = 1; i < match.length; i += 1) {
    if (typeof match[i] === 'string' && match[i].trim()) {
      return match[i].trim();
    }
  }

  return null;
}

function extractAmount(labelPattern, text) {
  const regex = new RegExp(`(?:${labelPattern})[^\\d]*([\\d,]+(?:\\.\\d{1,2})?)`, 'i');
  return parseAmount(extract(regex, text));
}

function parseTdsRows(text) {
  const rowRegex = /Deductor\s*:\s*([^\n;|]+?)\s*(?:\(|TAN\s*:?\s*([A-Z0-9]{8,12})\)?)?\s*[-:|]\s*TDS\s*[:=]\s*([\d,]+(?:\.\d{1,2})?)/gi;
  const rows = [];
  let match = rowRegex.exec(text);

  while (match) {
    rows.push({
      deductorName: match[1].trim(),
      deductorTan: match[2] ? match[2].trim() : undefined,
      tdsAmount: parseAmount(match[3]),
      sourceRef: `FORM16:TDS_ROW:${rows.length + 1}`
    });
    match = rowRegex.exec(text);
  }

  return rows;
}

function createFingerprint(text) {
  const head = text.slice(0, 80);
  const tail = text.slice(-80);
  const hashSeed = `${text.length}:${head}:${tail}`;

  let hash = 0;
  for (let i = 0; i < hashSeed.length; i += 1) {
    hash = (hash << 5) - hash + hashSeed.charCodeAt(i);
    hash |= 0;
  }

  return `f16_${Math.abs(hash)}`;
}

export function parseForm16Text(rawText) {
  const text = (rawText || '').replace(/\\n/g, '\n');
  const warnings = [];

  const name = extract(/Name\s*:?\s*([^\n]+)/i, text);
  const pan = extract(/PAN\s*:?\s*([A-Z]{5}[0-9]{4}[A-Z])/i, text);
  const assessmentYear = extract(/Assessment\s*Year\s*:?\s*([0-9]{4}\s*-\s*[0-9]{2,4})/i, text);

  const grossSalary = extractAmount('Gross\\s+Salary', text);
  const standardDeduction = extractAmount('Standard\\s+Deduction', text);
  const professionalTax = extractAmount('Professional\\s+Tax', text);
  const taxableSalary = extractAmount('Taxable\\s+Income|Taxable\\s+Salary', text);

  const deduction80C = extractAmount('Section\\s*80C', text);
  const deduction80D = extractAmount('Section\\s*80D', text);

  const tdsCredits = parseTdsRows(text);

  if (!name) warnings.push('Missing taxpayer name from Form 16.');
  if (!pan) warnings.push('Missing PAN from Form 16.');
  if (!assessmentYear) warnings.push('Missing assessment year from Form 16.');
  if (grossSalary === null) warnings.push('Missing gross salary from Form 16.');
  if (taxableSalary === null) warnings.push('Missing taxable salary from Form 16.');

  return {
    taxProfile: {
      name: name || '',
      pan: pan || '',
      assessmentYear: assessmentYear || ''
    },
    salary: {
      grossSalary: grossSalary ?? undefined,
      standardDeduction: standardDeduction ?? undefined,
      professionalTax: professionalTax ?? undefined,
      taxableSalary: taxableSalary ?? undefined
    },
    tdsCredits,
    deductions: {
      section80C: deduction80C ?? undefined,
      section80D: deduction80D ?? undefined
    },
    sourceDocuments: [
      {
        docType: 'FORM16',
        fingerprint: createFingerprint(text)
      }
    ],
    parsingWarnings: warnings
  };
}
