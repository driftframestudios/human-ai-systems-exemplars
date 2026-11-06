import { getCapabilityDefinition } from './capabilities.mjs';
import { createCadence } from './cadence.mjs';

// These placements describe the named examples' work, independently of legacy
// minute offsets. Array order keeps sessions in sequence within each part.
export function createShowcaseCadence(plan, periodCount, basis = 'sprint') {
  const cadence = createCadence(basis, periodCount);
  const last = periodCount - 1;
  const slots = basis === 'quarter' ? {
    research: [[0, 1]], pairing: [[0, 2]], rehearsal: [[0, 3]], review: [[0, 3]],
    'rollout-planning': [[1, 1]], 'receiving-walkthrough': [[1, 2]],
    'adoption-review': [[1, 3]], 'operating-handoff': [[1, 3]],
  } : {
    research: periodCount >= 3 ? [[0, 1], [0, 2]] : [[0, 1]],
    pairing: periodCount >= 4 ? [[1, 1], [1, 2], [2, 1], [2, 2]]
      : periodCount === 3 ? [[1, 1], [1, 2]] : [[0, periodCount === 2 ? 2 : 1]],
    rehearsal: periodCount >= 4 ? [[last - 1, 2], [last, 1]] : [[last, periodCount === 1 ? 2 : 1]],
    review: periodCount >= 4 ? [[last, 1], [last, 2]] : [[last, 2]],
  };
  const workById = new Map(plan.work.map(work => [work.id, work]));
  for (const [workId, positions] of Object.entries(slots)) {
    const work = workById.get(workId);
    if (!work) continue;
    for (let occurrenceIndex = 0; occurrenceIndex < work.occurrences; occurrenceIndex++) {
      const [periodIndex, subdivision] = positions[Math.floor(occurrenceIndex * positions.length / work.occurrences)];
      cadence.placements.push({ workId, occurrenceIndex, periodId: cadence.periods[periodIndex].id, subdivision });
    }
  }
  cadence.handoffs = plan.scoreSettings.dependencies.map(edge => ({ id: edge.id,
    from: { kind: 'work', id: edge.fromWorkId }, to: { kind: 'work', id: edge.toWorkId }, connectionId: edge.connectionId }));
  cadence.decisionAnchors = plan.scoreSettings.gates.map(gate => ({ gateId: gate.id, kind: 'stage', id: gate.afterStageId }));
  return cadence;
}

// Native rehearsal slices have explicit people and sessions. The broader source
// scenarios retain their own role pools, economic assumptions and full Studio.
export const SHOWCASE_SCENARIOS = Object.freeze([
  { id: 'discovery-alignment', label: 'Discovery and alignment', weeks: 2,
    description: 'Compare two service opportunities and fund the next useful inquiry.',
    outcome: 'The team can choose an opportunity from observed customer needs and a bounded next experiment.',
    people: 'A product team and the people who will use the proposed service.',
    observation: 'Compare interview evidence and try the proposed service with a prospective user.',
    work: ['Opportunity decision', 'Customer inquiry synthesis', 'Service concept sketch', 'Assumption walkthrough'],
    duration: [30, 60, 45, 45], occurrences: [2, 2, 2, 1],
    ability: 'compare-alternatives', quality: 'risk-based-testing',
    question: 'Which opportunity earns the next funded experiment?', next: 'Test the strongest remaining assumption' },
  { id: 'data-platform-migration', label: 'Data and platform migration', weeks: 6,
    description: 'Rehearse a migration wave, reconcile records and prepare recovery.',
    outcome: 'Operators can move a bounded set of records and reconcile or restore it after a failed migration.',
    people: 'Data owners, platform engineers and the operators receiving migrated records.',
    observation: 'Compare source and target records, then restore one intentionally interrupted migration.',
    work: ['Migration readiness review', 'Source and target mapping', 'Migration rehearsal', 'Reconciliation and restore'],
    duration: [45, 60, 90, 60], occurrences: [3, 3, 4, 2],
    ability: 'recover-interrupted-work', quality: 'reconciliation-replay',
    question: 'Do reconciliation and restore observations support the next migration wave?', next: 'Repeat the failed migration case' },
  { id: 'regulated-workflow', label: 'Regulated workflow', weeks: 8,
    description: 'Trace a laboratory workflow requirement to a reviewed operating example.',
    outcome: 'Laboratory staff can trace a sample decision to its requirement, observed result and responsible reviewer.',
    people: 'Laboratory operators, quality reviewers and engineers preparing a bounded workflow.',
    observation: 'Walk through a sample exception and trace its recorded evidence to the acceptance condition.',
    work: ['Workflow acceptance review', 'Requirement and risk review', 'Sample workflow prototype', 'Exception evidence walkthrough'],
    duration: [60, 60, 60, 90], occurrences: [3, 2, 4, 2],
    ability: 'trace-evidence', quality: 'independent-review',
    question: 'Does the recorded evidence support the stated intended use?', next: 'Resolve the remaining acceptance condition' },
  { id: 'ai-assisted-product', label: 'AI-assisted product', weeks: 4,
    description: 'Compare an AI-assisted draft with its sources and a human review route.',
    outcome: 'A reviewer can inspect an AI-assisted answer, verify its sources and correct an unsupported claim.',
    people: 'Product users, domain reviewers and engineers building an assisted workflow.',
    observation: 'Evaluate a useful answer and an unsupported claim with the people authorized to accept the result.',
    work: ['Human review decision', 'Evaluation examples', 'Assisted workflow prototype', 'Correction and escalation rehearsal'],
    duration: [45, 60, 90, 60], occurrences: [2, 3, 3, 2],
    ability: 'approve-change', quality: 'data-model-quality',
    question: 'Can the named reviewer verify and correct the result before it is used?', next: 'Add a difficult evaluation example' },
  { id: 'enterprise-integration', label: 'Enterprise integration', weeks: 6,
    description: 'Connect sending and receiving teams through a tested interface and handoff.',
    outcome: 'Receiving teams can accept an interface change and recover a missed or duplicated delivery.',
    people: 'Partner teams, integration engineers and service operators.',
    observation: 'Exchange an ordinary record, reject an incompatible one, and replay a missed delivery.',
    work: ['Partner acceptance review', 'Interface contract review', 'Integration prototype', 'Replay and handoff rehearsal'],
    duration: [45, 60, 90, 60], occurrences: [4, 2, 4, 3],
    ability: 'coordinate-handoff', quality: 'reconciliation-replay',
    question: 'Can the receiving team operate and recover the agreed interface?', next: 'Resolve the partner exception' },
  { id: 'operational-modernization', label: 'Operational modernization and recovery', weeks: 4,
    description: 'Improve an operating routine and rehearse a recoverable interruption.',
    outcome: 'Operators can resume interrupted work with clear ownership and usable recovery instructions.',
    people: 'Service operators, support staff and engineers improving the operating routine.',
    observation: 'Interrupt a representative task and observe its resumption with the receiving operator.',
    work: ['Operational readiness review', 'Operating needs review', 'Recovery workflow prototype', 'Interrupted-work rehearsal'],
    duration: [30, 60, 60, 90], occurrences: [3, 2, 3, 3],
    ability: 'recover-interrupted-work', quality: 'observability',
    question: 'Can the receiving operator carry out the recovery instructions?', next: 'Clarify the slowest recovery step' },
].map(row => Object.freeze({ ...row, work: Object.freeze(row.work), duration: Object.freeze(row.duration), occurrences: Object.freeze(row.occurrences) })));

export function createScenarioPlan(base, scenario) {
  const plan = base;
  plan.planId = scenario.id;
  plan.horizonWeeks = scenario.weeks;
  plan.purpose = { changedAbility: scenario.outcome, affectedPopulation: scenario.people,
    observationSignal: scenario.observation, accountableOwner: 'The product lead decides the next commitment after the named reviews.',
    reviewBoundary: 'The researcher checks source evidence, engineering checks the behavior, and Quality and Operations review the receiving conditions.',
    openConditions: 'This is an illustrative native rehearsal slice. Rates and session quantities are editable assumptions. The full Studio carries the broader scenario economics.' };
  let cursor = 0;
  for (const work of plan.work) {
    const index = ['review', 'research', 'pairing', 'rehearsal'].indexOf(work.id);
    work.label = scenario.work[index]; work.minutesPerOccurrence = scenario.duration[index]; work.occurrences = scenario.occurrences[index];
  }
  for (const id of ['research', 'pairing', 'rehearsal', 'review']) {
    const work = plan.work.find(row => row.id === id);
    work.timing = { startMinute: cursor, repeatEveryMinutes: work.minutesPerOccurrence + 30 };
    cursor += (work.occurrences - 1) * work.timing.repeatEveryMinutes + work.minutesPerOccurrence + 30;
  }
  for (const person of plan.people) {
    person.fundedMinutes = plan.work.filter(work => work.funding === 'allocated' && work.personIds.includes(person.id))
      .reduce((total, work) => total + work.minutesPerOccurrence * work.occurrences, 0) + 60;
    person.availability = null;
  }
  const review = plan.work.find(row => row.id === 'review');
  plan.scoreSettings.window = { label: `${scenario.label} · rehearsal sequence`, startMinute: 0, endMinute: cursor };
  plan.scoreSettings.waits[0] = { ...plan.scoreSettings.waits[0], startMinute: review.timing.startMinute - 30, endMinute: review.timing.startMinute,
    label: 'Receiving review', reason: 'Authored time for the receiving team to prepare its response.' };
  plan.scoreSettings.gates[0] = { ...plan.scoreSettings.gates[0], label: 'Next commitment', question: scenario.question, evidence: scenario.observation };
  plan.scoreSettings.proposals[0].work.label = scenario.next;
  plan.scoreSettings.proposals[0].work.timing = { startMinute: cursor, repeatEveryMinutes: null };
  plan.scoreSettings.proposals[1].work.label = 'Compare an alternative approach';
  plan.connections[0].sharedObject = scenario.work[1];
  plan.connections[1].sharedObject = scenario.work[2];
  plan.connections[2].sharedObject = scenario.observation;
  plan.connections[0].responseExpectation = 'Confirm the next implementation and its acceptance conditions.';
  plan.connections[1].responseExpectation = 'Return the observed receiving and recovery conditions.';
  plan.connections[2].responseExpectation = 'Decide the next commitment from the reviewed evidence.';
  plan.practices[0].context = scenario.question;
  plan.practices[1].context = scenario.observation;
  plan.contributions[0].reviewBoundary = 'The researcher checks generated draft claims against the source examples; the quality reviewer examines the proposed acceptance conditions.';
  plan.contributions[0].decisionBoundary = 'The product lead decides the next commitment after the human reviews.';
  const definition = getCapabilityDefinition('ability', scenario.ability, '1.0.0');
  plan.abilities = [{ id: 'scenario-ability', definitionId: definition.id, definitionVersion: definition.version,
    context: scenario.outcome, teamId: 'engineering', responsiblePersonIds: ['ari', 'jules'], decisionOwnerPersonId: 'maya',
    lifecycle: 'active', prerequisites: [], supportBindings: definition.supportRequirements.map(requirement => ({ requirementId: requirement.id,
      workIds: [requirement.phase === 'preparation' ? 'pairing' : 'review'] })) }];
  function bindPrerequisites(kind, row) {
    const current = getCapabilityDefinition(kind, row.definitionId, row.definitionVersion);
    for (const required of current.prerequisiteDefinitions) {
      const rows = required.kind === 'ability' ? plan.abilities : plan.practices;
      let receiver = rows.find(candidate => candidate.definitionId === required.definitionId);
      if (!receiver) {
        const source = getCapabilityDefinition(required.kind, required.definitionId, required.definitionVersion);
        receiver = { id: `support-${source.id}`, definitionId: source.id, definitionVersion: source.version,
          context: `${source.action}: ${scenario.observation}`, teamId: 'engineering', responsiblePersonIds: ['ari', 'jules'],
          decisionOwnerPersonId: 'maya', lifecycle: 'active', prerequisites: [],
          supportBindings: source.supportRequirements.map(requirement => ({ requirementId: requirement.id,
            workIds: [requirement.phase === 'preparation' ? 'research' : 'review'] })) };
        rows.push(receiver); bindPrerequisites(required.kind, receiver);
      }
      row.prerequisites.push({ kind: required.kind, instanceId: receiver.id });
    }
  }
  bindPrerequisites('ability', plan.abilities[0]);
  const change = plan.changeSettings.frameworkMaps.find(mapping => mapping.frameworkId === 'kotter');
  for (const component of change.components) {
    if (component.componentId === 'urgency') component.workIds = ['research'];
    if (component.componentId === 'vision') { component.workIds = ['pairing']; component.status = 'partial'; }
    if (component.componentId === 'remove-barriers') component.workIds = ['rehearsal'];
    if (component.componentId === 'broad-participation') component.workIds = ['review'];
  }
  plan.assuranceSettings.context = { sourcePresetId: scenario.id, referenceHorizon: { quantity: plan.horizonWeeks * 40, unit: 'hours' },
    namedUnknowns: 2, recoveryRatePersonIds: ['noor', 'sam'] };
  for (const concept of plan.assuranceSettings.quality.concepts) {
    concept.workIds = concept.conceptId === scenario.quality ? ['rehearsal', 'review'] : [];
  }
  plan.scoreSettings.cadence = createShowcaseCadence(plan, Math.ceil(scenario.weeks / 2));
  return plan;
}
