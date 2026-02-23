import { buildExplainabilityModel } from './explainability.js';
import { MESSAGE_TYPES } from '../shared/messages.js';

export function setStatus(text, doc = document) {
  const status = doc.getElementById('status');
  if (status) {
    status.textContent = text;
  }
}

function setPre(id, text, doc = document) {
  const node = doc.getElementById(id);
  if (node) {
    node.textContent = text;
  }
}

function sendMessage(runtime, message) {
  return new Promise((resolve, reject) => {
    if (!runtime?.sendMessage) {
      reject(new Error('Runtime unavailable'));
      return;
    }

    runtime.sendMessage(message, (response) => {
      if (!response?.ok) {
        reject(new Error(response?.error || 'Unknown runtime error'));
        return;
      }
      resolve(response.result);
    });
  });
}

function sendMessageToActiveTab(tabsApi, message) {
  return new Promise((resolve, reject) => {
    if (!tabsApi?.query || !tabsApi?.sendMessage) {
      reject(new Error('Tabs API unavailable'));
      return;
    }

    tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs?.[0]?.id;
      if (!activeTabId) {
        reject(new Error('No active tab found'));
        return;
      }

      tabsApi.sendMessage(activeTabId, message, (response) => {
        if (globalThis.chrome?.runtime?.lastError) {
          reject(new Error(globalThis.chrome.runtime.lastError.message));
          return;
        }

        if (!response?.ok) {
          reject(new Error(response?.error || 'Autofill failed in content script'));
          return;
        }

        resolve(response.result);
      });
    });
  });
}

function formatWarnings(warnings) {
  if (!warnings.length) {
    return 'No warnings';
  }

  return warnings
    .map((warning, index) => `${index + 1}. [${warning.source}] ${warning.type}: ${warning.message}`)
    .join('\n');
}

function formatActions(actions) {
  if (!actions.length) {
    return 'No plan generated';
  }

  return actions
    .map(
      (action, index) =>
        `${index + 1}. ${action.fieldLabel} = ${action.value} | policy=${action.policy} | confidence=${action.confidence} | source=${action.sourceRef}`
    )
    .join('\n');
}

export function renderExplainability(sessionState, doc = document) {
  const model = buildExplainabilityModel(sessionState);
  setPre('warnings', formatWarnings(model.warnings), doc);
  setPre('actions', formatActions(model.actions), doc);
  setStatus(
    model.hasPlan
      ? `Plan ready (${model.actions.length} actions). canExecute=${model.canExecute}`
      : 'Session active. Generate plan to view explainability.',
    doc
  );
}

async function refreshSummary(runtime, doc) {
  const sessionState = await sendMessage(runtime, { type: MESSAGE_TYPES.GET_SESSION_STATE });
  renderExplainability(sessionState, doc);
}

export function bindPopupActions(
  runtime = globalThis.chrome?.runtime,
  doc = document,
  tabsApi = globalThis.chrome?.tabs
) {
  const startButton = doc.getElementById('start-session');
  const generatePlanButton = doc.getElementById('generate-plan');
  const runSalaryAutofillButton = doc.getElementById('run-salary-autofill');
  const refreshSummaryButton = doc.getElementById('refresh-summary');

  if (!startButton || !generatePlanButton || !runSalaryAutofillButton || !refreshSummaryButton) {
    return;
  }

  startButton.addEventListener('click', async () => {
    try {
      const result = await sendMessage(runtime, { type: MESSAGE_TYPES.START_SESSION });
      setStatus(`Session started: ${result.sessionId}`, doc);
      await refreshSummary(runtime, doc);
    } catch (error) {
      setStatus(`Start failed: ${error.message}`, doc);
    }
  });

  generatePlanButton.addEventListener('click', async () => {
    try {
      await sendMessage(runtime, {
        type: MESSAGE_TYPES.GENERATE_FILL_PLAN,
        payload: { itrType: 'ITR1' }
      });
      await refreshSummary(runtime, doc);
    } catch (error) {
      setStatus(`Plan generation failed: ${error.message}`, doc);
    }
  });

  runSalaryAutofillButton.addEventListener('click', async () => {
    try {
      const sessionState = await sendMessage(runtime, { type: MESSAGE_TYPES.GET_SESSION_STATE });
      if (!sessionState?.fillPlan) {
        throw new Error('Generate fill plan before running autofill.');
      }

      const result = await sendMessageToActiveTab(tabsApi, {
        type: MESSAGE_TYPES.RUN_AUTOFILL_SALARY_PAGE,
        payload: { fillPlan: sessionState.fillPlan, maxRetries: 2 }
      });
      setStatus(
        `Autofill: ok=${result.ok}, success=${result.successCount}, failed=${result.failedCount}, skipped=${result.skippedCount}`,
        doc
      );
    } catch (error) {
      setStatus(`Autofill failed: ${error.message}`, doc);
    }
  });

  refreshSummaryButton.addEventListener('click', async () => {
    try {
      await refreshSummary(runtime, doc);
    } catch (error) {
      setStatus(`Refresh failed: ${error.message}`, doc);
    }
  });
}

bindPopupActions();
