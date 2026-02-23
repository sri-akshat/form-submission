function mapWarning(warning, source) {
  return {
    source,
    type: warning.type || 'UNKNOWN',
    message: warning.message || ''
  };
}

export function buildExplainabilityModel(sessionState) {
  const fillPlan = sessionState?.fillPlan || { actions: [], warnings: [] };
  const planValidation = sessionState?.planValidation || {
    warnings: [],
    blockingIssues: [],
    canExecute: false
  };

  const warnings = [
    ...(fillPlan.warnings || []).map((warning) => mapWarning(warning, 'PLAN')),
    ...(planValidation.warnings || []).map((warning) => mapWarning(warning, 'VALIDATION')),
    ...(planValidation.blockingIssues || []).map((warning) => mapWarning(warning, 'BLOCKING'))
  ];

  const actions = (fillPlan.actions || []).map((action) => ({
    actionId: action.actionId,
    fieldLabel: action.fieldLabel,
    value: action.value,
    sourceRef: action.source?.sourceRef || '',
    confidence: action.confidence,
    policy: action.policy,
    explanation: action.explanation
  }));

  return {
    hasPlan: actions.length > 0,
    canExecute: Boolean(planValidation.canExecute),
    warnings,
    actions
  };
}
