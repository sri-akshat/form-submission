import { MESSAGE_TYPES } from '../shared/messages.js';

export function setStatus(text, doc = document) {
  const status = doc.getElementById('status');
  if (status) {
    status.textContent = text;
  }
}

export function bindPopupActions(runtime = globalThis.chrome?.runtime, doc = document) {
  const startButton = doc.getElementById('start-session');
  if (!startButton) return;

  startButton.addEventListener('click', () => {
    if (!runtime?.sendMessage) {
      setStatus('Runtime unavailable', doc);
      return;
    }

    runtime.sendMessage({ type: MESSAGE_TYPES.START_SESSION }, (response) => {
      if (!response?.ok) {
        setStatus(`Start failed: ${response?.error || 'unknown error'}`, doc);
        return;
      }
      setStatus(`Session started: ${response.result.sessionId}`, doc);
    });
  });
}

bindPopupActions();
