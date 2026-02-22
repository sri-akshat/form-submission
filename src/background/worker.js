import { MessageRouter } from './message-router.js';
import { SessionOrchestrator } from './session-orchestrator.js';
import { MESSAGE_TYPES } from '../shared/messages.js';

export function createWorkerBindings(orchestrator = new SessionOrchestrator()) {
  const router = new MessageRouter();

  router.register(MESSAGE_TYPES.START_SESSION, () => orchestrator.startSession());
  router.register(MESSAGE_TYPES.PORTAL_CONTEXT_DETECTED, (payload) =>
    orchestrator.handlePortalContext(payload)
  );
  router.register(MESSAGE_TYPES.UPLOAD_FORM16_TEXT, (payload) =>
    orchestrator.parseForm16(payload.form16Text || '')
  );
  router.register(MESSAGE_TYPES.UPLOAD_AIS_TEXT, (payload) =>
    orchestrator.parseAis(payload.aisText || '')
  );
  router.register(MESSAGE_TYPES.GENERATE_FILL_PLAN, (payload) =>
    orchestrator.generateFillPlan({ itrType: payload.itrType || 'ITR1' })
  );

  return { router, orchestrator };
}

export function attachChromeRuntimeListener(runtime = globalThis.chrome?.runtime) {
  if (!runtime?.onMessage?.addListener) {
    return null;
  }

  const { router } = createWorkerBindings();

  runtime.onMessage.addListener((message, sender, sendResponse) => {
    router
      .dispatch(message, { sender })
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true;
  });

  return router;
}

attachChromeRuntimeListener();
