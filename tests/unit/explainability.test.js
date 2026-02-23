import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExplainabilityModel } from '../../src/popup/explainability.js';

test('buildExplainabilityModel merges plan and validation warnings with actions', () => {
  const model = buildExplainabilityModel({
    fillPlan: {
      actions: [
        {
          actionId: 'a1',
          fieldLabel: 'Gross Salary',
          value: 1000000,
          source: { sourceRef: 'FORM16:GROSS_SALARY' },
          confidence: 0.95,
          policy: 'ALLOW',
          explanation: 'Extracted from Form 16.'
        }
      ],
      warnings: [{ type: 'MISSING_DATA', message: 'Something missing' }]
    },
    planValidation: {
      warnings: [{ type: 'TDS_MISMATCH', message: 'Mismatch detected' }],
      blockingIssues: [{ type: 'SALARY_INCONSISTENCY', message: 'Salary issue' }],
      canExecute: false
    }
  });

  assert.equal(model.hasPlan, true);
  assert.equal(model.canExecute, false);
  assert.equal(model.actions.length, 1);
  assert.equal(model.warnings.length, 3);
  assert.equal(model.actions[0].sourceRef, 'FORM16:GROSS_SALARY');
});
