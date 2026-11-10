import { createExamplePlan } from './contract.mjs';
import { createCadence } from './cadence.mjs';
import { emptyRole } from './roles.mjs';

// These authored examples become ordinary editable records. Preset admission,
// replacement and Undo remain with the same owners as the other Studio examples.
const PEOPLE = [
  ['lead', 'Product lead', 'product-program', 12000, 'decision-owner', 'approves'],
  ['researcher', 'Researcher', 'design-research', 10000, 'individual-contributor', 'recommends'],
  ['engineering-lead', 'Engineering lead', 'engineering', 14000, 'player-coach', 'recommends'],
  ['engineer', 'Engineer', 'engineering', 12000, 'individual-contributor', 'operates'],
  ['quality', 'Quality reviewer', 'quality-regulatory', 11000, 'domain-reviewer', 'recommends'],
  ['operations', 'Operations specialist', 'ops-support', 9000, 'domain-reviewer', 'operates'],
];
const TEAMS = [
  ['research', 'Product and Research', ['lead', 'researcher', 'quality', 'operations']],
  ['engineering', 'AI Engineering', ['researcher', 'engineering-lead', 'engineer', 'quality']],
  ['operations', 'Enablement and Operations', ['lead', 'researcher', 'engineer', 'quality', 'operations']],
];

const EXAMPLES = [
  {
    id: 'ai-enablement', label: 'AI Enablement',
    description: 'Help teams adopt bounded AI work with approved context, shared practice and a correction route.',
    purpose: {
      changedAbility: 'Teams can use AI with approved sources, bounded actions and a clear way to check and correct the result.',
      affectedPopulation: 'Teams adopting AI in their existing work and the people receiving their outputs.',
      observationSignal: 'Watch representative users complete a task, identify an unsupported claim and recover interrupted work.',
      accountableOwner: 'The product lead decides the adoption scope after engineering, quality and operations review.',
      reviewBoundary: 'Engineering checks access and action limits; researchers observe task success; operations rehearses correction and escalation.',
      openConditions: 'Start with one bounded task. Review keyboard access, language choices and the effort needed to recover before widening adoption.',
    },
    work: [
      ['current-work', 'Understand current work', 'research', ['lead', 'researcher', 'operations'], 60, 'allocated', [[1, 1], [1, 2]]],
      ['context-gateway', 'Source and context gateway', 'engineering', ['researcher', 'engineering-lead', 'engineer'], 60, 'allocated', [[2, 1], [2, 2]]],
      ['task-orchestration', 'Bounded task orchestration', 'engineering', ['engineering-lead', 'engineer', 'quality'], 60, 'allocated', [[3, 1], [3, 2]]],
      ['team-practice', 'Team practice and correction', 'operations', ['researcher', 'quality', 'operations'], 45, 'additional', [[3, 2], [4, 1]]],
      ['outcome-review', 'Task success and recovery review', 'research', ['lead', 'researcher', 'quality', 'operations'], 45, 'additional', [[4, 2]]],
    ],
    handoffs: [
      ['task-context', 'current-work', 'context-gateway', 'engineering-lead', 'Observed tasks and approved source needs', 'Provide traceable context and scoped access for the selected task.'],
      ['operating-practice', 'task-orchestration', 'team-practice', 'operations', 'Bounded orchestration and authorized task memory', 'Rehearse tool limits, human escalation and correction with the receiving team.'],
      ['adoption-evidence', 'team-practice', 'outcome-review', 'lead', 'Task-success observations and recovery findings', 'Choose the next adoption scope from observed use and remaining conditions.'],
    ],
    stages: [['understand', 'Understand', ['current-work']], ['prepare', 'Prepare', ['context-gateway', 'task-orchestration']], ['adopt', 'Adopt', ['team-practice', 'outcome-review']]],
    decision: ['Adoption scope', 'Can the receiving team complete, check and recover the selected task?', 'Review observed task success, access limits, correction effort and the receiving team’s readiness.'],
    contribution: ['source-retrieval', 'Approved sources stay traceable to their access conditions; the researcher checks their use in the task.'],
  },
  {
    id: 'ai-experience', label: 'AI Experience',
    description: 'Prototype an assisted user task, test it with representative users and rehearse human review and recovery.',
    purpose: {
      changedAbility: 'People can complete an assisted task, inspect the supporting sources and correct or escalate the result.',
      affectedPopulation: 'People using an AI-assisted product, its human reviewers and the team operating it.',
      observationSignal: 'Observe representative users finish the task, challenge a weak answer and resume after an interruption.',
      accountableOwner: 'The product lead decides release scope from observed user outcomes and the operating team’s review.',
      reviewBoundary: 'Researchers check task comprehension and user control; engineering checks tool boundaries; quality and operations rehearse recovery.',
      openConditions: 'Test keyboard access, language choices, source visibility and human escalation with the people who will use the experience.',
    },
    work: [
      ['user-task', 'Frame the user task', 'research', ['lead', 'researcher', 'operations'], 60, 'allocated', [[1, 1], [1, 2]]],
      ['action-boundaries', 'Context and action boundaries', 'engineering', ['researcher', 'engineering-lead', 'engineer'], 60, 'allocated', [[2, 1], [2, 2]]],
      ['assisted-prototype', 'Prototype the assisted task', 'engineering', ['researcher', 'engineering-lead', 'engineer'], 60, 'allocated', [[3, 1], [3, 2]]],
      ['user-testing', 'Representative-user testing', 'research', ['researcher', 'quality', 'operations'], 45, 'additional', [[3, 2], [4, 1]]],
      ['release-recovery', 'Release and recovery rehearsal', 'operations', ['lead', 'engineer', 'quality', 'operations'], 45, 'additional', [[4, 2]]],
    ],
    handoffs: [
      ['task-evidence', 'user-task', 'action-boundaries', 'engineering-lead', 'User task, context needs and success examples', 'Make source access, tool permissions and human confirmation visible in the prototype.'],
      ['testable-prototype', 'assisted-prototype', 'user-testing', 'researcher', 'Assisted task with sources, correction and escalation', 'Observe task success and recovery, including keyboard and language choices.'],
      ['release-evidence', 'user-testing', 'release-recovery', 'operations', 'Observed task outcomes and unresolved friction', 'Rehearse support, rollback and the route for learning from use.'],
    ],
    stages: [['frame', 'Frame', ['user-task']], ['prototype', 'Prototype', ['action-boundaries', 'assisted-prototype']], ['validate', 'Validate', ['user-testing', 'release-recovery']]],
    decision: ['Release scope', 'Can people use, check and recover this assisted task?', 'Review representative-user observations, human escalation and operating recovery before choosing release scope.'],
    contribution: ['draft-artifacts', 'The researcher compares the prototype with observed tasks; engineering checks source and action boundaries.'],
  },
];

function createAIStarterPlan(example) {
  const plan = createExamplePlan();
  plan.planId = example.id; plan.horizonWeeks = 8; plan.purpose = { ...example.purpose };
  plan.people = PEOPLE.map(([id, label, functionId, rateCentsPerHour, postureId, decisionId]) => ({
    id, label, rateCentsPerHour, fundedMinutes: 360, availability: null, lifecycle: 'active',
    role: { ...emptyRole(), functionId, postureId, decisionId },
  }));
  plan.teams = TEAMS.map(([id, label, personIds]) => ({ id, label, personIds: [...personIds], lifecycle: 'active' }));
  plan.work = example.work.map(([id, label, teamId, personIds, minutesPerOccurrence, funding, slots]) => ({
    id, label, teamId, personIds: [...personIds], minutesPerOccurrence, funding, occurrences: slots.length,
    status: 'planned', timing: null, lifecycle: 'active',
  }));
  const first = plan.work[0], last = plan.work.at(-1), workById = new Map(plan.work.map(work => [work.id, work]));
  plan.connections = example.handoffs.map(([id, from, to, receiverPersonId, sharedObject, responseExpectation]) => ({
    id, senderTeamId: workById.get(from).teamId, receiverTeamId: workById.get(to).teamId, receiverPersonId,
    sharedObject, responseExpectation, workIds: [from, to], status: 'active',
  }));
  plan.practices = [{ id: 'review-outcomes', definitionId: 'assurance', definitionVersion: '1.0.0',
    context: example.purpose.observationSignal, teamId: last.teamId, responsiblePersonIds: [...last.personIds],
    decisionOwnerPersonId: 'lead', lifecycle: 'active', prerequisites: [], supportBindings: [
      { requirementId: 'preparation', workIds: [plan.work[3].id] }, { requirementId: 'review', workIds: [last.id] },
    ] }];
  plan.contributions = [{ id: 'task-evidence', categoryId: example.contribution[0], receiverPersonId: 'researcher',
    decisionOwnerPersonId: 'lead', workIds: [first.id, plan.work[2].id, last.id], reviewBoundary: example.contribution[1],
    decisionBoundary: example.purpose.accountableOwner }];
  const cadence = createCadence();
  for (const [workId, , , , , , slots] of example.work) slots.forEach(([period, subdivision], occurrenceIndex) => {
    cadence.placements.push({ workId, occurrenceIndex, periodId: cadence.periods[period - 1].id, subdivision });
  });
  cadence.handoffs = example.handoffs.map(([id, from, to]) => ({ id, from: { kind: 'work', id: from }, to: { kind: 'work', id: to }, connectionId: id }));
  const stages = example.stages.map(([id, label, workIds]) => ({ id, label, workIds: [...workIds] }));
  const gateId = 'scope-decision';
  cadence.decisionAnchors = [{ gateId, kind: 'stage', id: stages.at(-1).id }];
  plan.scoreSettings = { ...plan.scoreSettings, cadence, stages,
    gates: [{ id: gateId, label: example.decision[0], afterStageId: stages.at(-1).id, reviewerPersonId: 'lead',
      question: example.decision[1], evidence: example.decision[2], modeledDecision: 'open' }] };
  plan.assuranceSettings.quality.sigmaHalfSteps = 8;
  return plan;
}

export const AI_STARTER_PRESETS = Object.freeze(EXAMPLES.map(example => Object.freeze({
  id: example.id, label: example.label, description: example.description, create: () => createAIStarterPlan(example),
})));
