export const MESSAGE_TYPES = {
  START_SESSION: 'START_SESSION',
  DETECT_PORTAL_CONTEXT: 'DETECT_PORTAL_CONTEXT',
  PORTAL_CONTEXT_DETECTED: 'PORTAL_CONTEXT_DETECTED',
  UPLOAD_FORM16_TEXT: 'UPLOAD_FORM16_TEXT'
};

export function createMessage(type, payload = {}) {
  return {
    type,
    payload
  };
}
