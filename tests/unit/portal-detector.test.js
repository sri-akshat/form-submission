import test from 'node:test';
import assert from 'node:assert/strict';

import { detectPortalContext } from '../../src/content/portal-detector.js';

test('detectPortalContext marks incometax portal with itr and page hints', () => {
  const context = detectPortalContext({
    url: 'https://eportal.incometax.gov.in/iec/foservices/#/login',
    headerText: 'Income Tax Return Filing',
    bodyText: 'Please continue for ITR-2 salary schedule',
    itrSelectionText: 'ITR-2'
  });

  assert.equal(context.isIncomeTaxPortal, true);
  assert.equal(context.itrType, 'ITR2');
  assert.equal(context.pageId, 'SALARY');
  assert.ok(context.confidence >= 0.6);
  assert.ok(context.signals.includes('URL_MATCH'));
});

test('detectPortalContext rejects non-tax domain', () => {
  const context = detectPortalContext({
    url: 'https://example.com/forms',
    headerText: 'Generic Form',
    bodyText: 'Please complete your profile details'
  });

  assert.equal(context.isIncomeTaxPortal, false);
  assert.equal(context.itrType, null);
  assert.equal(context.pageId, 'UNKNOWN');
  assert.ok(context.confidence < 0.6);
});
