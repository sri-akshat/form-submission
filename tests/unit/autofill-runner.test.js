import test from 'node:test';
import assert from 'node:assert/strict';

import { getSalaryActions, runSalaryAutofill } from '../../src/content/autofill-runner.js';

function createRetryingElement() {
  let writes = 0;
  const element = {
    _value: '',
    dispatchEvent() {},
    get value() {
      return this._value;
    },
    set value(next) {
      writes += 1;
      this._value = writes === 1 ? 'wrong' : next;
    }
  };

  return element;
}

function createFakeDocument(selectorMap) {
  return {
    querySelector(selector) {
      return selectorMap[selector] || null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

test('getSalaryActions filters fill plan to salary page actions', () => {
  const actions = getSalaryActions({
    actions: [
      { actionId: '1', pageId: 'SALARY' },
      { actionId: '2', pageId: 'TDS' }
    ]
  });

  assert.equal(actions.length, 1);
  assert.equal(actions[0].actionId, '1');
});

test('runSalaryAutofill executes allow actions, retries verify failures, and skips gated actions', () => {
  const grossElement = createRetryingElement();
  const taxableElement = { value: '', dispatchEvent() {} };

  const doc = createFakeDocument({
    '#salary_gross': grossElement,
    '#taxable_income': taxableElement
  });

  const result = runSalaryAutofill({
    documentRef: doc,
    fillPlan: {
      actions: [
        {
          actionId: 'a1',
          pageId: 'SALARY',
          fieldKey: 'salary.gross',
          fieldLabel: 'Gross Salary',
          valueType: 'NUMBER',
          value: 1000000,
          policy: 'ALLOW'
        },
        {
          actionId: 'a2',
          pageId: 'SALARY',
          fieldKey: 'salary.taxable_income',
          fieldLabel: 'Taxable Income',
          valueType: 'NUMBER',
          value: 900000,
          policy: 'REVIEW_REQUIRED'
        },
        {
          actionId: 'a3',
          pageId: 'SALARY',
          fieldKey: 'salary.standard_deduction',
          fieldLabel: 'Standard Deduction',
          valueType: 'NUMBER',
          value: 50000,
          policy: 'BLOCK'
        }
      ]
    },
    maxRetries: 2
  });

  assert.equal(result.totalActions, 3);
  assert.equal(result.successCount, 1);
  assert.equal(result.skippedCount, 2);
  assert.equal(result.failedCount, 0);
  assert.equal(grossElement.value, '1000000');

  const success = result.results.find((entry) => entry.actionId === 'a1');
  assert.equal(success.status, 'SUCCESS');
  assert.equal(success.attempts, 2);
});

test('runSalaryAutofill reports missing document safely', () => {
  const result = runSalaryAutofill({
    fillPlan: { actions: [] }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'MISSING_DOCUMENT');
});
