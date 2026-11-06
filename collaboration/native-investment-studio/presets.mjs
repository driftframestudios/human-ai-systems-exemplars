import { CONTRACT } from './config.mjs';
import { createExamplePlan, preparePlan, PlanError } from './contract.mjs';
import { emptyRole } from './roles.mjs';
import { SCORE_VERSION } from './score-models.mjs';
import { SHOWCASE_SCENARIOS, createScenarioPlan, createShowcaseCadence } from './showcase-scenarios.mjs';
import { seedShowcaseChangeSupport } from './change-showcase.mjs';

const PRESET_VERSION = '1.0.0';

// These editable proposals belong to the service-request example. They reuse
// its accepted work; the ordinary capability editor still owns Apply and Undo.
const SHOWCASE_CAPABILITY_CONTEXT = Object.freeze({
  'compare-alternatives': 'Compare ways to route a service request against response time, clear ownership, and recovery after a missed handoff.',
  'recover-interrupted-work': 'Resume a service request after an interruption with the saved details and next responsible person visible.',
  'approve-change': 'Review the pilot scope, operating instructions, and recovery evidence before deciding whether to proceed.',
  'trace-evidence': 'Trace a pilot-readiness claim to the research notes or walkthrough observation that supports it.',
  'edit-records-in-bulk': 'Preview a routing change across selected service requests and restore their earlier assignments if needed.',
  'coordinate-handoff': 'Agree who receives each service request, what response they owe, and how to recover a missed handoff.',
  'inspect-history': 'Help pilot reviewers find an earlier service-request decision and recover why it changed.',
  expectation: 'Agree the pilot scope and expected response at each decision review.',
  focalization: 'Identify the question the product lead must resolve before choosing the pilot scope.',
  experimentation: 'Rehearse a routine request and a missed handoff before committing to a wider rollout.',
  opportunity: 'Compare extra pilot review time with the engineering and operations work it would displace.',
  continuity: 'Prepare the operating instructions and receiving responsibilities so a service request can continue after a handoff.',
  assurance: 'Walk through routine requests and recovery instructions before a pilot decision.',
});
export function showcaseCapabilityDefaults(plan, definition) {
  if (plan.planId !== 'service-request-pilot' || definition.version !== '1.0.0') return null;
  const context = SHOWCASE_CAPABILITY_CONTEXT[definition.id];
  if (!context) return null;
  const operational = ['recover-interrupted-work', 'coordinate-handoff', 'continuity', 'assurance'].includes(definition.id);
  const investigative = ['compare-alternatives', 'trace-evidence', 'focalization', 'opportunity'].includes(definition.id);
  const teamId = operational ? 'operations' : investigative ? 'product' : 'engineering';
  const team = plan.teams.find(row => row.id === teamId && row.lifecycle === 'active');
  const activePeople = new Set(plan.people.filter(row => row.lifecycle === 'active').map(row => row.id));
  const activeWork = new Set(plan.work.filter(row => row.lifecycle === 'active' && row.status !== 'paused').map(row => row.id));
  const preparation = operational ? 'rehearsal' : investigative ? 'research' : 'pairing';
  const supportByPhase = { preparation, coordination: 'review', review: 'review' };
  return { context, teamId: team?.id ?? null, responsiblePersonIds: (team?.personIds ?? []).filter(id => activePeople.has(id)),
    decisionOwnerPersonId: activePeople.has('maya') ? 'maya' : null,
    prerequisites: definition.prerequisiteDefinitions.flatMap(required => {
      const row = plan[required.kind === 'ability' ? 'abilities' : 'practices'].find(item => item.lifecycle === 'active'
        && item.definitionId === required.definitionId && item.definitionVersion === required.definitionVersion);
      return row ? [{ kind: required.kind, instanceId: row.id }] : [];
    }),
    supportBindings: definition.supportRequirements.map(requirement => ({ requirementId: requirement.id,
      workIds: activeWork.has(supportByPhase[requirement.phase]) ? [supportByPhase[requirement.phase]] : [] })),
  };
}
function workingSessions() {
  const plan = createExamplePlan();
  plan.planId = 'shared-working-sessions';
  plan.purpose.changedAbility = 'Plan shared working sessions.';
  plan.purpose.affectedPopulation = 'Product and Engineering';
  return plan;
}
function fundedSessions() {
  const plan = workingSessions();
  plan.planId = 'funded-working-sessions';
  for (const person of plan.people) person.fundedMinutes = 180;
  plan.work[0].funding = 'allocated';
  return plan;
}

// The showcase uses ordinary plan records. Editors, pricing and exchange share
// the same owners as visitor-created plans; each entrance receives a fresh plan.
export function createShowcasePlan() {
  const plan = createExamplePlan();
  plan.planId = 'service-request-pilot';
  plan.horizonWeeks = 8;
  plan.purpose = {
    changedAbility: 'Operations staff can route a service request, see who owns it, and recover a missed handoff.',
    affectedPopulation: 'A synthetic Product, Engineering, and Quality / Operations pilot.',
    observationSignal: 'Walk through a routine request and a missed handoff with the people who will operate the pilot.',
    accountableOwner: 'The product lead decides pilot scope and readiness after the human reviews.',
    reviewBoundary: 'The researcher checks source evidence; the engineering lead checks behavior; the quality reviewer checks exception handling; the operations specialist checks the operating instructions.',
    openConditions: 'Four two-week sprints show representative coordination sessions within broader work. Rates and funded time price the included work. Readiness depends on the observed walkthrough and human review.',
  };
  plan.people = [
    ['maya', 'Product lead', 'product-program', 12000, 240, 'decision-owner', 'approves'],
    ['leo', 'Researcher', 'design-research', 10000, 240, 'individual-contributor', 'recommends'],
    ['ari', 'Engineering lead', 'engineering', 14000, 360, 'player-coach', 'recommends'],
    ['jules', 'Engineer', 'engineering', 12000, 360, 'individual-contributor', 'operates'],
    ['noor', 'Quality reviewer', 'quality-regulatory', 11000, 120, 'domain-reviewer', 'recommends'],
    ['sam', 'Operations specialist', 'ops-support', 9000, 120, 'domain-reviewer', 'operates'],
  ].map(([id, label, functionId, rateCentsPerHour, fundedMinutes, postureId, decisionId]) => ({
    id, label, rateCentsPerHour, fundedMinutes, availability: null,
    role: { ...emptyRole(), functionId, postureId, decisionId }, lifecycle: 'active',
  }));
  plan.teams = [
    ['product', 'Product and Research', ['maya', 'leo']],
    ['engineering', 'Engineering', ['ari', 'jules', 'maya', 'noor']],
    ['operations', 'Quality and Operations', ['noor', 'sam']],
  ].map(([id, label, personIds]) => ({ id, label, personIds, lifecycle: 'active' }));
  plan.work = [
    ['review', 'Pilot decision review', 'engineering', ['maya', 'ari', 'noor'], 30, 4, 'additional'],
    ['research', 'Research synthesis', 'product', ['maya', 'leo'], 60, 2, 'allocated'],
    ['pairing', 'Prototype pairing', 'engineering', ['ari', 'jules'], 60, 4, 'allocated'],
    ['rehearsal', 'Operations rehearsal', 'operations', ['noor', 'sam'], 60, 2, 'additional'],
  ].map(([id, label, teamId, personIds, minutesPerOccurrence, occurrences, funding]) => ({
    id, label, teamId, personIds, minutesPerOccurrence, occurrences, funding,
    status: 'planned', timing: null, lifecycle: 'active',
  }));
  plan.practices = [
    { id: 'shared-expectations', definitionId: 'expectation', definitionVersion: '1.0.0',
      context: 'Agree the pilot scope and expected response at each decision review.', teamId: 'engineering',
      responsiblePersonIds: ['maya', 'ari', 'noor'], decisionOwnerPersonId: 'maya', lifecycle: 'active', prerequisites: [],
      supportBindings: [{ requirementId: 'coordination', workIds: ['review'] }, { requirementId: 'review', workIds: ['review'] }] },
    { id: 'readiness-evidence', definitionId: 'assurance', definitionVersion: '1.0.0',
      context: 'Walk through routine requests and recovery instructions before a pilot decision.', teamId: 'operations',
      responsiblePersonIds: ['noor', 'sam'], decisionOwnerPersonId: 'maya', lifecycle: 'active', prerequisites: [],
      supportBindings: [{ requirementId: 'preparation', workIds: ['rehearsal'] }, { requirementId: 'review', workIds: ['review'] }] },
  ];
  plan.contributions = [{
    id: 'evidence-draft', categoryId: 'cross-source-synthesis', receiverPersonId: 'leo', decisionOwnerPersonId: 'maya',
    workIds: ['research', 'review'],
    reviewBoundary: 'The researcher checks each draft claim against the interview notes. The quality reviewer checks exception-handling claims in the review.',
    decisionBoundary: 'The product lead chooses the pilot scope after the evidence and review conditions are recorded.',
  }];
  plan.connections = [
    ['scope', 'product', 'engineering', 'ari', 'Pilot scope and tested user journeys',
      'Confirm an implementable slice and flag evidence gaps', ['research', 'pairing']],
    ['readiness', 'engineering', 'operations', 'noor', 'Prototype, acceptance evidence and exception log',
      'Return a readiness recommendation with review conditions', ['review', 'rehearsal']],
    ['decision', 'operations', 'product', 'maya', 'Readiness findings and rollout conditions',
      'Record go, adjust, or hold with the necessary funded review time', ['review', 'rehearsal']],
  ].map(([id, senderTeamId, receiverTeamId, receiverPersonId, sharedObject, responseExpectation, workIds]) => ({
    id, senderTeamId, receiverTeamId, receiverPersonId, sharedObject, responseExpectation, workIds, status: 'active',
  }));
  const placement = { research: [0, 90], pairing: [150, 90], rehearsal: [480, 90], review: [660, 45] };
  for (const row of plan.work) row.timing = { startMinute: placement[row.id][0], repeatEveryMinutes: placement[row.id][1] };
  plan.scoreSettings = {
    version: SCORE_VERSION, window: { label: 'Pilot rehearsal · elapsed minutes from the first session', startMinute: 0, endMinute: 900 },
    dependencies: [
      { id: 'research-before-pairing', fromWorkId: 'research', toWorkId: 'pairing', lagMinutes: 0, connectionId: 'scope' },
      { id: 'pairing-before-rehearsal', fromWorkId: 'pairing', toWorkId: 'rehearsal', lagMinutes: 0, connectionId: 'readiness' },
      { id: 'rehearsal-before-review', fromWorkId: 'rehearsal', toWorkId: 'review', lagMinutes: 30, connectionId: 'decision' },
    ],
    stages: [
      { id: 'understand', label: 'Understand the request', workIds: ['research'] },
      { id: 'build', label: 'Build and rehearse', workIds: ['pairing', 'rehearsal'] },
      { id: 'review', label: 'Review the evidence', workIds: ['review'] },
    ],
    waits: [{ id: 'review-preparation', label: 'Receiving response', startMinute: 630, endMinute: 660,
      reason: 'Illustrative wait for the receiving team to make its evidence available.', receiverPersonId: 'noor' }],
    gates: [{ id: 'pilot-decision', label: 'Pilot decision', afterStageId: 'review', reviewerPersonId: 'maya',
      question: 'Does the walkthrough support proceeding with the pilot?', evidence: 'Review the routine request, recovery instructions and remaining conditions.', modeledDecision: 'open' }],
    proposals: [
      { id: 'confirm-recovery', bank: 'next', gateId: 'pilot-decision', work: { id: 'confirm-recovery-session', label: 'Confirm the recovery instructions',
        teamId: 'operations', personIds: ['noor', 'sam'], minutesPerOccurrence: 30, occurrences: 1, funding: 'additional', status: 'planned', lifecycle: 'active', timing: { startMinute: 840, repeatEveryMinutes: null } } },
      { id: 'compare-routing', bank: 'options', gateId: null, work: { id: 'compare-routing-session', label: 'Compare another routing option',
        teamId: 'product', personIds: ['maya', 'leo'], minutesPerOccurrence: 30, occurrences: 1, funding: 'additional', status: 'planned', lifecycle: 'active', timing: null } },
    ],
  };
  plan.scoreSettings.cadence = createShowcaseCadence(plan, 4);
  plan.assuranceSettings.quality.sigmaHalfSteps = 8;
  return seedShowcaseChangeSupport(plan);
}

// This is a separately authored rollout example. Choosing it previews a plan
// replacement; regrouping an existing plan keeps its own work and investment.
export function createQuarterShowcasePlan() {
  const plan = createShowcasePlan();
  plan.planId = 'service-request-rollout';
  plan.horizonWeeks = 26;
  plan.purpose = {
    changedAbility: 'Receiving teams can operate the service-request workflow, recover missed handoffs and improve it from observed use.',
    affectedPopulation: 'Product, Engineering, and Quality and Operations teams preparing a pilot and receiving its rollout.',
    observationSignal: 'Rehearse routine requests and recovery before the pilot, then review adoption findings with the receiving teams.',
    accountableOwner: 'The product lead decides rollout scope after the pilot review and confirms the operating owner after adoption review.',
    reviewBoundary: 'The researcher checks source evidence; engineering checks behavior; Quality and Operations review recovery, adoption findings and operating responsibilities.',
    openConditions: 'Two illustrative business quarters group pilot preparation and rollout. The amount prices representative sessions and declared funded effort within broader work. Dates and period availability remain to be chosen.',
  };
  plan.teams.find(row => row.id === 'product').personIds.push('sam');
  plan.teams.find(row => row.id === 'operations').personIds.push('ari');
  const review = plan.work.find(row => row.id === 'review');
  Object.assign(review, { label: 'Pilot readiness review', minutesPerOccurrence: 45, occurrences: 1 });
  plan.work.find(row => row.id === 'pairing').minutesPerOccurrence = 90;
  plan.work.push(...[
    ['rollout-planning', 'Rollout planning', 'engineering', ['maya', 'ari', 'noor'], 60, 2],
    ['receiving-walkthrough', 'Receiving-team walkthrough', 'operations', ['ari', 'noor', 'sam'], 45, 3],
    ['adoption-review', 'Adoption review', 'product', ['maya', 'leo', 'sam'], 45, 2],
    ['operating-handoff', 'Operating handoff', 'operations', ['ari', 'noor', 'sam'], 60, 1],
  ].map(([id, label, teamId, personIds, minutesPerOccurrence, occurrences]) => ({
    id, label, teamId, personIds, minutesPerOccurrence, occurrences,
    funding: 'additional', status: 'planned', timing: null, lifecycle: 'active',
  })));
  for (const work of plan.work) work.timing = null;
  plan.connections = [
    ['scope', 'product', 'engineering', 'ari', 'Service needs, pilot scope and tested journeys',
      'Prepare the pilot workflow and its acceptance examples', ['research', 'pairing']],
    ['readiness', 'engineering', 'operations', 'noor', 'Pilot workflow, recovery instructions and acceptance evidence',
      'Return a readiness recommendation and the remaining conditions', ['pairing', 'rehearsal', 'review']],
    ['decision', 'operations', 'product', 'maya', 'Pilot findings and proposed rollout conditions',
      'Decide the rollout scope after reviewing the evidence', ['rehearsal', 'review', 'rollout-planning']],
    ['rollout-support', 'engineering', 'operations', 'sam', 'Rollout sequence and support responsibilities',
      'Rehearse the receiving work with each participating team', ['rollout-planning', 'receiving-walkthrough']],
    ['adoption-findings', 'operations', 'product', 'maya', 'Adoption findings and outstanding operating questions',
      'Agree the operating owner and next improvement', ['receiving-walkthrough', 'adoption-review', 'operating-handoff']],
  ].map(([id, senderTeamId, receiverTeamId, receiverPersonId, sharedObject, responseExpectation, workIds]) => ({
    id, senderTeamId, receiverTeamId, receiverPersonId, sharedObject, responseExpectation, workIds, status: 'active',
  }));
  plan.scoreSettings.window = null;
  plan.scoreSettings.waits = [];
  plan.scoreSettings.dependencies = [
    ['research-before-pairing', 'research', 'pairing', 'scope'],
    ['pairing-before-rehearsal', 'pairing', 'rehearsal', 'readiness'],
    ['rehearsal-before-review', 'rehearsal', 'review', 'decision'],
    ['review-before-rollout', 'review', 'rollout-planning', 'decision'],
    ['rollout-before-walkthrough', 'rollout-planning', 'receiving-walkthrough', 'rollout-support'],
    ['walkthrough-before-adoption', 'receiving-walkthrough', 'adoption-review', 'adoption-findings'],
    ['adoption-before-handoff', 'adoption-review', 'operating-handoff', 'adoption-findings'],
  ].map(([id, fromWorkId, toWorkId, connectionId]) => ({ id, fromWorkId, toWorkId, lagMinutes: 0, connectionId }));
  plan.scoreSettings.stages = [
    { id: 'understand', label: 'Understand the service', workIds: ['research'] },
    { id: 'build', label: 'Prepare and validate the pilot', workIds: ['pairing', 'rehearsal'] },
    { id: 'review', label: 'Review pilot readiness', workIds: ['review'] },
    { id: 'rollout', label: 'Support the receiving teams', workIds: ['rollout-planning', 'receiving-walkthrough'] },
    { id: 'adoption', label: 'Review adoption and operating ownership', workIds: ['adoption-review', 'operating-handoff'] },
  ];
  plan.scoreSettings.gates = [
    { id: 'pilot-decision', label: 'Proceed with rollout?', afterStageId: 'review', reviewerPersonId: 'maya',
      question: 'Do the pilot observations support the proposed rollout?',
      evidence: 'Review routine requests, recovery evidence and remaining conditions with the receiving teams.', modeledDecision: 'open' },
    { id: 'operating-decision', label: 'Ready for ongoing operation?', afterStageId: 'adoption', reviewerPersonId: 'maya',
      question: 'Can the receiving teams operate and improve this workflow?',
      evidence: 'Review adoption findings, support responsibilities and the named operating owner.', modeledDecision: 'open' },
  ];
  plan.scoreSettings.proposals = [];
  plan.practices[0].context = 'Agree pilot readiness, rollout scope and ongoing ownership with the responsible people.';
  plan.practices[0].supportBindings.forEach(binding => { binding.workIds = ['review', 'rollout-planning', 'adoption-review']; });
  plan.practices[1].context = 'Rehearse requests and recovery, then review how receiving teams use the workflow.';
  plan.practices[1].supportBindings.forEach(binding => { binding.workIds = binding.requirementId === 'preparation' ? ['rehearsal', 'receiving-walkthrough'] : ['review', 'adoption-review']; });
  plan.scoreSettings.cadence = createShowcaseCadence(plan, 2, 'quarter');
  return plan;
}

const CATALOGUE = new Map([
  ['service-request-pilot', 'Service request pilot', 'Three teams prepare a pilot, review its evidence, and plan the funded time together.', createShowcasePlan],
  ['service-request-rollout', 'Two-quarter service rollout', 'Follow pilot preparation and validation into receiving-team rollout and operating ownership.', createQuarterShowcasePlan],
  ...SHOWCASE_SCENARIOS.map(scenario => [scenario.id, scenario.label, scenario.description, () => createScenarioPlan(createShowcasePlan(), scenario)]),
  ['shared-working-sessions', 'Shared working sessions', 'Four people meet for half an hour, six times.', workingSessions],
  ['funded-working-sessions', 'Sessions within funded time', 'The same sessions use three funded hours per person.', fundedSessions],
].map(([id, label, description, create]) => [id, Object.freeze({
  metadata: Object.freeze({ id, version: PRESET_VERSION, label, description,
    schemaVersion: CONTRACT.schemaVersion, modelVersion: CONTRACT.modelVersion }), create,
})]));
const LIST = Object.freeze([...CATALOGUE.values()].map(entry => entry.metadata));

export function listPresets() { return LIST; }

// Each request creates and admits its own native plan. Catalogue records carry
// identity and labels; accepted state continues to belong to createStudio.
export function preparePreset(id, version) {
  const entry = typeof id === 'string' ? CATALOGUE.get(id) : null;
  if (!entry) throw new PlanError('preset', 'preset.id', 'Choose a listed Studio example.');
  if (version !== entry.metadata.version) {
    throw new PlanError('preset-version', 'preset.version', 'Use the listed version of this example.');
  }
  return Object.freeze({ projection: preparePlan(entry.create()),
    sourceSchemaVersion: CONTRACT.schemaVersion, preset: entry.metadata });
}
