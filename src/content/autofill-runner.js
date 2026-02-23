import { resolveFieldElement } from './field-resolver.js';

export function getSalaryActions(fillPlan) {
  return (fillPlan?.actions || []).filter((action) => action.pageId === 'SALARY');
}

function coerceValue(valueType, value) {
  if (valueType === 'NUMBER') {
    return String(value);
  }
  if (valueType === 'CHECKBOX') {
    return Boolean(value);
  }
  return String(value);
}

function dispatchValueEvents(element) {
  if (!element || typeof element.dispatchEvent !== 'function') {
    return;
  }

  try {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  } catch {
    // Ignore non-browser event constructor errors in non-DOM test environments.
  }
}

function writeValue(element, valueType, value) {
  if (valueType === 'CHECKBOX') {
    element.checked = Boolean(value);
  } else {
    element.value = coerceValue(valueType, value);
  }
  dispatchValueEvents(element);
}

function readValue(element, valueType) {
  if (valueType === 'CHECKBOX') {
    return Boolean(element.checked);
  }
  return element.value;
}

function valuesMatch(expected, actual, valueType) {
  if (valueType === 'CHECKBOX') {
    return Boolean(expected) === Boolean(actual);
  }
  return String(expected) === String(actual);
}

export function runSalaryAutofill({ documentRef, fillPlan, maxRetries = 2 } = {}) {
  if (!documentRef) {
    return {
      ok: false,
      reason: 'MISSING_DOCUMENT',
      totalActions: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: []
    };
  }

  const salaryActions = getSalaryActions(fillPlan);
  const results = [];

  for (const action of salaryActions) {
    if (action.policy === 'BLOCK') {
      results.push({ actionId: action.actionId, status: 'SKIPPED_BLOCK' });
      continue;
    }

    if (action.policy === 'REVIEW_REQUIRED') {
      results.push({ actionId: action.actionId, status: 'SKIPPED_REVIEW_REQUIRED' });
      continue;
    }

    let attempts = 0;
    let successful = false;
    let lastError = 'RESOLUTION_FAILED';

    while (attempts <= maxRetries && !successful) {
      attempts += 1;

      const resolved = resolveFieldElement({
        documentRef,
        fieldKey: action.fieldKey,
        fieldLabel: action.fieldLabel
      });

      if (!resolved?.element) {
        lastError = 'FIELD_NOT_FOUND';
        continue;
      }

      writeValue(resolved.element, action.valueType, action.value);
      const readBack = readValue(resolved.element, action.valueType);

      if (valuesMatch(action.value, readBack, action.valueType)) {
        successful = true;
        results.push({
          actionId: action.actionId,
          status: 'SUCCESS',
          strategy: resolved.strategy,
          attempts
        });
      } else {
        lastError = 'VERIFY_FAILED';
      }
    }

    if (!successful) {
      results.push({
        actionId: action.actionId,
        status: 'FAILED',
        attempts,
        error: lastError
      });
    }
  }

  const successCount = results.filter((result) => result.status === 'SUCCESS').length;
  const failedCount = results.filter((result) => result.status === 'FAILED').length;
  const skippedCount = results.length - successCount - failedCount;

  return {
    ok: failedCount === 0,
    reason: failedCount === 0 ? 'COMPLETED' : 'PARTIAL_FAILURE',
    totalActions: salaryActions.length,
    successCount,
    failedCount,
    skippedCount,
    results
  };
}
