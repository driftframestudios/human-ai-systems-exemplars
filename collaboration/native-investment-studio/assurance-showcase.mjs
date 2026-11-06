// Authored exploration choices. Their output becomes an ordinary assurance draft.
export const QUALITY_REELS = Object.freeze({
  before: Object.freeze([
    { id: 'acceptance-criteria', label: 'Acceptance' }, { id: 'risk-based-testing', label: 'Risk checks' },
    { id: 'independent-review', label: 'Review' }, { id: 'data-model-quality', label: 'Data quality' },
    { id: 'accessibility', label: 'Accessibility' }, { id: 'security-privacy', label: 'Security' },
    { id: 'release-readiness', label: 'Readiness' },
  ]),
  after: Object.freeze([
    { id: 'observability', label: 'Observe' }, { id: 'reconciliation-replay', label: 'Recover' },
    { id: 'post-release-learning', label: 'Learn' },
  ]),
});
export const QUALITY_FADERS = Object.freeze([
  { id: 'quality', label: 'Quality', low: 'Focused', high: 'Thorough', value: 2 },
  { id: 'urgency', label: 'Urgency', low: 'Steady', high: 'Immediate', value: 1 },
  { id: 'compliance', label: 'Compliance', low: 'Routine', high: 'Formal', value: 1 },
  { id: 'training', label: 'Training', low: 'Little practice', high: 'Rehearsed', value: 2 },
  { id: 'fidelity', label: 'Fidelity', low: 'Sketch', high: 'Working detail', value: 2 },
]);
export const QUALITY_PHASES = Object.freeze([
  { id: 'prepare', label: 'Prepare', description: 'Make the result reviewable.' },
  { id: 'rehearse', label: 'Rehearse', description: 'Try the difficult moment.' },
  { id: 'operate', label: 'Operate & learn', description: 'Carry the result into use.' },
]);
const RESPONSES = Object.freeze({
  'review-change': 'Clarify the acceptance examples with the decision owner, update the review notes, and repeat the pilot walkthrough.',
  'recovery-failure': 'Restore the saved request, rehearse the missed handoff with Operations, and review the revised recovery instructions.',
  'specialist-unavailable': 'Agree an alternate reviewer with the decision owner, retain the evidence, and move the review to the next available session.',
});
const beforeIds = new Set(QUALITY_REELS.before.map(row => row.id));
const afterIds = new Set(QUALITY_REELS.after.map(row => row.id));
export function createQualityExploration() {
  return { before: 'acceptance-criteria', after: 'reconciliation-replay',
    ...Object.fromEntries(QUALITY_FADERS.map(row => [row.id, row.value])) };
}
// Authored scenario rules make the control combinations legible; they are not forecasts.
export function qualityConstraints(exploration, sigmaHalfSteps = 6) {
  const required = new Map();
  const requireConcept = (ids, cue) => { for (const id of ids) required.set(id, [...(required.get(id) ?? []), cue]); };
  if (sigmaHalfSteps < 5) requireConcept(['risk-based-testing', 'reconciliation-replay'], 'Raise Sigma to 2.5σ.');
  if (exploration.quality === 0) requireConcept(['acceptance-criteria', 'risk-based-testing'], 'Raise Quality.');
  if (exploration.urgency >= 3) requireConcept(['independent-review', 'release-readiness', 'observability'], 'Lower Urgency to Balanced.');
  if (exploration.training <= 1) requireConcept(['accessibility', 'post-release-learning'], 'Raise Training to Balanced.');
  if (exploration.compliance >= 3) requireConcept(['security-privacy', 'independent-review'], 'Lower Compliance to Balanced.');
  const pressure = sigmaHalfSteps >= 8 ? 'calm' : sigmaHalfSteps >= 5 ? 'caution' : 'high';
  const phases = Object.fromEntries([...beforeIds].map(id => [id, 'prepare']));
  for (const id of afterIds) phases[id] = 'operate';
  if (sigmaHalfSteps < 5 || exploration.urgency >= 3) phases['risk-based-testing'] = 'rehearse';
  if (exploration.quality >= 3 || exploration.compliance >= 3) phases['independent-review'] = 'rehearse';
  if (exploration.training <= 1) phases.accessibility = 'rehearse';
  return { pressure, extreme: sigmaHalfSteps <= 3 && exploration.quality === 0,
    required: Object.fromEntries([...required].map(([id, cues]) => [id, cues.join(' ')])), phases };
}
export function qualityArrangement(exploration, sigmaHalfSteps = 6) {
  const before = beforeIds.has(exploration.before) ? exploration.before : 'acceptance-criteria';
  const after = afterIds.has(exploration.after) ? exploration.after : 'reconciliation-replay';
  const included = new Set([before, after, 'acceptance-criteria', 'release-readiness']);
  if (exploration.quality >= 2 || sigmaHalfSteps >= 8) included.add('risk-based-testing');
  if (exploration.quality >= 3 || exploration.compliance >= 2) included.add('independent-review');
  if (exploration.compliance >= 3) included.add('security-privacy');
  if (exploration.fidelity >= 3) included.add('data-model-quality');
  if (exploration.training >= 2) included.add('accessibility');
  if (exploration.training >= 3) included.add('post-release-learning');
  if (exploration.urgency >= 3) included.add('observability');
  for (const id of Object.keys(qualityConstraints(exploration, sigmaHalfSteps).required)) included.add(id);
  const definitionId = exploration.urgency >= 3 ? 'specialist-unavailable'
    : after === 'reconciliation-replay' ? 'recovery-failure' : 'review-change';
  return { before, after, included: [...included], definitionId,
    allocationPercent: 10 + exploration.quality * 5,
    response: RESPONSES[definitionId] };
}
export function qualityRehearsalExample(definition, arrangement, plan) {
  const work = plan.work.filter(row => row.status === 'planned' && row.lifecycle !== 'retired');
  const preferred = definition.id === 'recovery-failure' ? /rehears|recover|operat/i : /review|decision|validat/i;
  const session = work.find(row => preferred.test(row.label)) ?? work.at(-1);
  const personIds = session?.personIds ?? [];
  const reviewer = plan.people.find(row => /quality|review/i.test(row.label))?.id ?? personIds[0] ?? '';
  return {
    definitionId: definition.id, definitionVersion: definition.version,
    context: `${definition.setup} The team will use the next review to agree a clear response.`,
    assumptions: definition.assumptions.join(' '), response: RESPONSES[definition.id],
    reviewerPersonId: reviewer, observedPlanRevision: String(plan.revision), observation: '',
    workIds: session ? [session.id] : [], connectionIds: [], personIds: [...personIds],
  };
}
