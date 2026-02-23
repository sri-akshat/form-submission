import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveFieldElement } from '../../src/content/field-resolver.js';

function createFakeDocument({ selectorMap = {}, labels = [] } = {}) {
  return {
    querySelector(selector) {
      return selectorMap[selector] || null;
    },
    querySelectorAll(selector) {
      if (selector === 'label') {
        return labels;
      }
      return [];
    }
  };
}

test('resolveFieldElement resolves via selector registry first', () => {
  const grossElement = { value: '' };
  const doc = createFakeDocument({
    selectorMap: {
      '#salary_gross': grossElement
    }
  });

  const resolved = resolveFieldElement({
    documentRef: doc,
    fieldKey: 'salary.gross',
    fieldLabel: 'Gross Salary'
  });

  assert.equal(resolved.element, grossElement);
  assert.equal(resolved.strategy, 'SELECTOR_REGISTRY');
});

test('resolveFieldElement falls back to label-for lookup', () => {
  const taxableElement = { value: '' };
  const labels = [
    {
      textContent: 'Taxable Income',
      getAttribute(name) {
        return name === 'for' ? 'taxable_income_field' : null;
      },
      querySelector() {
        return null;
      }
    }
  ];

  const doc = createFakeDocument({
    selectorMap: {
      '#taxable_income_field': taxableElement
    },
    labels
  });

  const resolved = resolveFieldElement({
    documentRef: doc,
    fieldKey: 'custom.taxable',
    fieldLabel: 'Taxable Income',
    selectorRegistry: {}
  });

  assert.equal(resolved.element, taxableElement);
  assert.equal(resolved.strategy, 'LABEL_FOR');
});
