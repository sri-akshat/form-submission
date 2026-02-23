import { detectPortalContext } from './portal-detector.js';
import { runSalaryAutofill } from './autofill-runner.js';
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

export function attachContentMessageHandler(runtime = globalThis.chrome?.runtime, doc = document) {
  if (!runtime?.onMessage?.addListener) {
    return null;
  }

  runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== MESSAGE_TYPES.RUN_AUTOFILL_SALARY_PAGE) {
      return false;
    }

    const result = runSalaryAutofill({
      documentRef: doc,
      fillPlan: message?.payload?.fillPlan,
      maxRetries: message?.payload?.maxRetries ?? 2
    });

    sendResponse({ ok: true, result });
    return true;
  });

  return true;
}

sendPortalContext();
attachContentMessageHandler();
