import { detectPortalContext } from './portal-detector.js';
import { MESSAGE_TYPES } from '../shared/messages.js';

function extractTextSafe(selector) {
  const node = document.querySelector(selector);
  return node ? node.textContent || '' : '';
}

export function collectPortalSignals(doc = document, locationRef = window.location) {
  return {
    url: locationRef.href,
    headerText: extractTextSafe('h1, h2, [role="heading"]'),
    bodyText: (doc.body && doc.body.textContent) || '',
    itrSelectionText: extractTextSafe('[data-itr-type], .itr-type, #itrType')
  };
}

export function sendPortalContext(runtime = globalThis.chrome?.runtime) {
  if (!runtime?.sendMessage) {
    return null;
  }

  const context = detectPortalContext(collectPortalSignals());
  runtime.sendMessage({
    type: MESSAGE_TYPES.PORTAL_CONTEXT_DETECTED,
    payload: context
  });
  return context;
}

sendPortalContext();
