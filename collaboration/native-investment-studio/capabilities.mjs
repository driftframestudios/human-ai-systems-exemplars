export const CAPABILITY_VERSION = '1.0.0';
export const LEGACY_CAPABILITY_VERSION = '0.0.0';
export const CAPABILITY_KINDS = Object.freeze(['ability', 'practice']);
export const EVIDENCE_STAGES = Object.freeze(['proposed', 'supported', 'rehearsed', 'observed-in-context']);

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}

export const PRACTICES = freeze([
  ['expectation', 'Actively negotiate expectations'],
  ['focalization', 'Bring the decision into focus'],
  ['experimentation', 'Reduce the cost of experimentation'],
  ['opportunity', 'Price opportunity and speculation'],
  ['continuity', 'Carry work through a handoff'],
  ['assurance', 'Establish a fitting acceptance observation'],
].map(([id, action]) => ({ id, action, standing: 'proposed-support' })));

const requirement = (id, label, phase, description, minutes = 30) => ({
  id, label, phase, description, estimate: { minutesPerOccurrence: minutes, occurrences: 1 },
});
const prepare = requirement('preparation', 'Prepare the work', 'preparation', 'Prepare the material and access the people need.');
const review = requirement('review', 'Review with the responsible people', 'review', 'Check the result against the agreed outcome and conditions.');
const maintain = requirement('maintenance', 'Keep the work usable', 'maintenance', 'Assign time to update instructions and revisit changes.');
const coordinate = requirement('coordination', 'Plan the handoff', 'coordination', 'Bring the responsible people together to agree the work and its receiver.');
const reference = (kind, definitionId) => ({ kind, definitionId, definitionVersion: CAPABILITY_VERSION });

const abilityRows = [
  ['compare-alternatives', 'Compare alternatives', 'A person choosing an approach',
    'Compare named alternatives against the same criteria and explain the tradeoff.',
    'A person can explain which evidence and criteria changed the choice.', [prepare, coordinate, review], [reference('ability', 'trace-evidence')]],
  ['recover-interrupted-work', 'Recover interrupted work', 'A person returning to a task',
    'Recover saved progress, identify the next action and continue after an interruption.',
    'A person resumes a deliberately interrupted task with the intended entries intact.', [prepare, review, maintain], [reference('ability', 'inspect-history')]],
  ['approve-change', 'Approve a change', 'A person authorized to approve the change',
    'Inspect the proposed change, its consequences and the evidence before recording a decision.',
    'The authorized person can explain what was approved, its conditions and how to recover the prior state.', [prepare, review], [reference('ability', 'compare-alternatives'), reference('ability', 'trace-evidence')]],
  ['trace-evidence', 'Trace evidence', 'A person checking a claim',
    'Follow a claim to its observation and describe the observation context.',
    'A reviewer can recover the source and distinguish observation from an assumption.', [prepare, review], [reference('practice', 'assurance')]],
  ['edit-records-in-bulk', 'Edit records in bulk', 'A person maintaining a set of records',
    'Preview and apply a consistent change to selected records, then recover it when needed.',
    'A person can identify the selected records, explain the preview and restore the prior values.', [prepare, review], [reference('ability', 'inspect-history')]],
  ['coordinate-handoff', 'Coordinate a handoff', 'People sending and receiving work',
    'Agree the shared object, receiving person, expected response and recovery route.',
    'The receiving person can find the work and explain the response they owe.', [coordinate, review, maintain], [reference('practice', 'continuity')]],
  ['inspect-history', 'Inspect history', 'A person reviewing earlier work',
    'Inspect earlier accepted records and distinguish them from the current proposal.',
    'A person can identify an earlier change and recover its relevant context.', [prepare, review], []],
];
const practiceDetails = [
  ['People doing and receiving the work', 'Agree scope, constraints, response and responsibility explicitly.', 'The participants can restate the agreement and resolve a changed expectation.', [coordinate, review], []],
  ['People preparing a decision', 'Name the decision, its owner and the information that could change it.', 'The decision owner can identify the remaining question and next useful observation.', [prepare, coordinate], []],
  ['People testing a possible approach', 'Bound a useful experiment and its observation before committing more work.', 'The team can explain what the experiment established and what remains open.', [prepare, review], [reference('practice', 'focalization')]],
  ['People allocating time and funding', 'Compare a possible investment with the work it would displace.', 'The decision owner can identify the assumption, opportunity and funded tradeoff.', [prepare, review], [reference('practice', 'expectation')]],
  ['People sending and receiving work', 'Agree what continues, who receives it and how interrupted work resumes.', 'The receiver can continue the work from the supplied record.', [coordinate, review], [reference('practice', 'expectation')]],
  ['People producing and reviewing evidence', 'Choose an observation that can distinguish the intended behavior from a consequential fault.', 'The reviewer can explain the behavior observed, the boundary and the remaining uncertainty.', [prepare, review], []],
];
function definition(kind, id, action, actor, explanation, acceptanceJob, supportRequirements, prerequisiteDefinitions) {
  return freeze({ kind, id, version: CAPABILITY_VERSION, action, actor, explanation,
    source: { owner: 'native-investment-studio', basis: 'Authored planning catalogue' },
    assumptions: ['The plan names its own operating context and responsible people.', 'Suggested durations are editable planning estimates; an observation establishes the result.'],
    acceptanceJob, supportRequirements, estimateUnits: 'Minutes per participant × session occurrences; selected people supply their hourly rates.',
    prerequisiteDefinitions, retired: false, replacement: null });
}
const current = freeze([
  ...abilityRows.map(row => definition('ability', ...row)),
  ...PRACTICES.map((row, index) => definition('practice', row.id, row.action, ...practiceDetails[index])),
]);
const legacy = freeze(PRACTICES.map(row => ({
  ...definition('practice', row.id, row.action, 'The assigned team', 'An earlier plan links this practice to its supporting sessions.',
    'Review the named work and agree a richer support plan when useful.',
    [requirement('general-support', 'Supporting work', 'coordination', 'Preserves the earlier assignment and its ordered working-session references.', 0)], []),
  version: LEGACY_CAPABILITY_VERSION,
  assumptions: ['The earlier assignment retains its original support meaning. Richer requirements enter through an explicit edit.'],
  retired: true, replacement: reference('practice', row.id),
})));
const versions = freeze([...current, ...legacy]);
const byKey = new Map(versions.map(row => [`${row.kind}:${row.id}:${row.version}`, row]));
const currentByKind = new Map(CAPABILITY_KINDS.map(kind => [kind, Object.freeze(current.filter(row => row.kind === kind))]));
const versionsByKind = new Map(CAPABILITY_KINDS.map(kind => [kind, Object.freeze(versions.filter(row => row.kind === kind))]));
const EMPTY = Object.freeze([]);

export function listCapabilities(kind) { return currentByKind.get(kind) ?? EMPTY; }
export function listCapabilityVersions(kind) { return versionsByKind.get(kind) ?? EMPTY; }
export function getCapabilityDefinition(kind, id, version) {
  return typeof kind === 'string' && typeof id === 'string' && typeof version === 'string' ? byKey.get(`${kind}:${id}:${version}`) ?? null : null;
}
export function capabilityWorkIds(instance) { return [...new Set(instance.supportBindings.flatMap(binding => binding.workIds))]; }
export function createLegacyPractice(id, practiceId, teamId, workIds) {
  return { id, definitionId: practiceId, definitionVersion: LEGACY_CAPABILITY_VERSION,
    context: null, teamId, responsiblePersonIds: [], decisionOwnerPersonId: null, lifecycle: 'active',
    prerequisites: [], supportBindings: [{ requirementId: 'general-support', workIds: [...workIds] }] };
}
