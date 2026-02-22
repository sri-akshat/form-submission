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

function parseAisTdsRows(text) {
  const rowRegex = /(?:AIS\s+)?Deductor\s*:\s*([^\n;|()]+?)\s*(?:\([^)]*TAN\s*:?\s*([A-Z0-9]{8,12})[^)]*\))?\s*[-:|]\s*TDS\s*[:=]\s*([\d,]+(?:\.\d{1,2})?)/gi;
  const rows = [];
  let match = rowRegex.exec(text);

  while (match) {
    rows.push({
      deductorName: match[1].trim(),
      deductorTan: match[2] ? match[2].trim() : undefined,
      tdsAmount: parseAmount(match[3]),
      sourceRef: `AIS:TDS_ROW:${rows.length + 1}`
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

  return `ais_${Math.abs(hash)}`;
}

export function parseAisText(rawText) {
  const text = (rawText || '').replace(/\\n/g, '\n');
  const warnings = [];

  const pan = extract(/PAN\s*:?\s*([A-Z]{5}[0-9]{4}[A-Z])/i, text);
  const assessmentYear = extract(/Assessment\s*Year\s*:?\s*([0-9]{4}\s*-\s*[0-9]{2,4})/i, text);
  const bankInterest = extractAmount('Bank\\s+Interest|Interest\\s+Income', text);
  const dividendIncome = extractAmount('Dividend\\s+Income|Dividend', text);

  const rowTdsCredits = parseAisTdsRows(text);
  const totalTds = extractAmount('Total\\s+TDS', text);

  const tdsCredits = rowTdsCredits.length
    ? rowTdsCredits
    : totalTds !== null
      ? [
          {
            deductorName: 'AIS_TOTAL',
            tdsAmount: totalTds,
            sourceRef: 'AIS:TOTAL_TDS'
          }
        ]
      : [];

  if (!pan) warnings.push('Missing PAN from AIS/26AS.');
  if (!assessmentYear) warnings.push('Missing assessment year from AIS/26AS.');
  if (bankInterest === null && dividendIncome === null) {
    warnings.push('Missing other income values (bank interest/dividend) from AIS/26AS.');
  }

  return {
    taxProfile: {
      pan: pan || '',
      assessmentYear: assessmentYear || ''
    },
    tdsCredits,
    otherIncome: {
      bankInterest: bankInterest ?? undefined,
      dividendIncome: dividendIncome ?? undefined
    },
    sourceDocuments: [
      {
        docType: 'AIS_26AS',
        fingerprint: createFingerprint(text)
      }
    ],
    parsingWarnings: warnings
  };
}
