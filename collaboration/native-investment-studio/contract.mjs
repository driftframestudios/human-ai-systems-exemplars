import { CONTRACT, LIMITS, PRACTICES, PURPOSE_FIELDS, SCHEMA_BYTE_LIMITS } from './config.mjs';
import { ROLE_CATALOGUES, ROLE_FIELDS, CHANGE_FRAMEWORKS, CONTRIBUTION_CATEGORIES, emptyRole } from './roles.mjs';
import { CAPABILITY_KINDS, EVIDENCE_STAGES, getCapabilityDefinition, capabilityWorkIds, createLegacyPractice } from './capabilities.mjs';
import { CHANGE_CATALOGUE_VERSION, listChangeFrameworks, getChangeFramework, getInterpretiveLens, listAttentionChannels, createChangeSettings, projectChange } from './change-models.mjs';
import { createAssuranceSettings, listQualityConcepts, getSourcePreset, getRehearsalDefinition, getLearningPromptDefinition, projectAssurance } from './assurance-models.mjs';
import { createScoreSettings, projectScore } from './score-models.mjs';
import { CADENCE_VERSION, CADENCE_SUBDIVISIONS } from './cadence.mjs';
import { getCoordinationTemplate } from './coordination-arrangements.mjs';

const IDENTIFIER = /^[a-z][a-z0-9-]*$/;
const INTEGER_TOKEN = /^-?(0|[1-9][0-9]*)$/;
const NUMBER_CHARACTER = /[0-9.eE+-]/;
const PRACTICE_IDS = new Set(PRACTICES.map(record => record.id));
const encoder = new TextEncoder();
const FUNDING = Object.freeze(['allocated', 'additional']);
const WORK_STATUS = Object.freeze(['planned', 'paused']);
const LIFECYCLE = Object.freeze(['active', 'retired']);
const CONNECTION_STATUS = Object.freeze(['active', 'paused']);
const ROLE_IDS = new Map(Object.entries(ROLE_CATALOGUES).map(([field, rows]) => [field, new Set(rows.map(row => row.id))]));
const FRAMEWORK_COMPONENTS = new Map(CHANGE_FRAMEWORKS.map(row => [row.id, new Set(row.components.map(component => component.id))]));
const CATEGORY_IDS = new Set(CONTRIBUTION_CATEGORIES.map(row => row.id));
const PLAN_FIELDS = Object.freeze(['kind', 'schemaVersion', 'modelVersion', 'planId', 'revision', 'currency', 'horizonWeeks', 'people', 'teams', 'work', 'practices']);
const FIELDS = Object.freeze({
  plan: [...PLAN_FIELDS, 'purpose', 'contributions', 'connections', 'abilities', 'capabilityEvidence', 'changeSettings', 'assuranceSettings', 'scoreSettings', 'arrangements'],
  scorePlan: [...PLAN_FIELDS, 'purpose', 'contributions', 'connections', 'abilities', 'capabilityEvidence', 'changeSettings', 'assuranceSettings', 'scoreSettings'],
  assurancePlan: [...PLAN_FIELDS, 'purpose', 'contributions', 'connections', 'abilities', 'capabilityEvidence', 'changeSettings', 'assuranceSettings'],
  changePlan: [...PLAN_FIELDS, 'purpose', 'contributions', 'connections', 'abilities', 'capabilityEvidence', 'changeSettings'],
  capabilityPlan: [...PLAN_FIELDS, 'purpose', 'contributions', 'connections', 'abilities', 'capabilityEvidence'],
  relationshipPlan: [...PLAN_FIELDS, 'purpose', 'contributions', 'connections'],
  purposePlan: [...PLAN_FIELDS, 'purpose'],
  legacyPlan: PLAN_FIELDS,
  purpose: PURPOSE_FIELDS,
  person: ['id', 'label', 'fundedMinutes', 'rateCentsPerHour', 'role', 'lifecycle'],
  scorePerson: ['id', 'label', 'fundedMinutes', 'rateCentsPerHour', 'role', 'lifecycle', 'availability'],
  legacyPerson: ['id', 'label', 'fundedMinutes', 'rateCentsPerHour'],
  role: ROLE_FIELDS,
  change: ['frameworkId', 'componentId'],
  team: ['id', 'label', 'personIds', 'lifecycle'],
  legacyTeam: ['id', 'label', 'personIds'],
  work: ['id', 'label', 'teamId', 'personIds', 'minutesPerOccurrence', 'occurrences', 'funding', 'status', 'timing', 'lifecycle'],
  legacyWork: ['id', 'label', 'teamId', 'personIds', 'minutesPerOccurrence', 'occurrences', 'funding', 'status', 'timing'],
  untimedWork: ['id', 'label', 'teamId', 'personIds', 'minutesPerOccurrence', 'occurrences', 'funding', 'status', 'lifecycle'],
  workTiming: ['startMinute', 'repeatEveryMinutes'], interval: ['startMinute', 'endMinute'],
  scoreSettings: ['version', 'window', 'dependencies', 'stages', 'waits', 'gates', 'proposals'],
  cadenceScoreSettings: ['version', 'window', 'dependencies', 'stages', 'waits', 'gates', 'proposals', 'cadence'],
  cadence: ['version', 'basis', 'periods', 'placements', 'availability', 'handoffs', 'decisionAnchors', 'delays'],
  cadencePeriod: ['id', 'label'], cadencePlacement: ['workId', 'occurrenceIndex', 'periodId', 'subdivision'],
  workPlacement: ['occurrenceIndex', 'periodId', 'subdivision'],
  cadenceAvailability: ['personId', 'periodId', 'availableMinutes'],
  cadenceEndpoint: ['kind', 'id'], cadenceHandoff: ['id', 'from', 'to', 'connectionId'],
  cadenceDecisionAnchor: ['gateId', 'kind', 'id'],
  cadenceDelay: ['id', 'label', 'anchor', 'fromPeriodId', 'toPeriodId', 'reason', 'receiverPersonId'],
  scoreWindow: ['label', 'startMinute', 'endMinute'],
  scoreDependency: ['id', 'fromWorkId', 'toWorkId', 'lagMinutes', 'connectionId'],
  scoreStage: ['id', 'label', 'workIds'],
  scoreWait: ['id', 'label', 'startMinute', 'endMinute', 'reason', 'receiverPersonId'],
  scoreGate: ['id', 'label', 'afterStageId', 'reviewerPersonId', 'question', 'evidence', 'modeledDecision'],
  scoreProposal: ['id', 'bank', 'gateId', 'work'],
  workTimingPatch: ['workId', 'timing'], availabilityPatch: ['personId', 'intervals'],
  contribution: ['id', 'categoryId', 'receiverPersonId', 'decisionOwnerPersonId', 'workIds', 'reviewBoundary', 'decisionBoundary'],
  connection: ['id', 'senderTeamId', 'receiverTeamId', 'receiverPersonId', 'sharedObject', 'responseExpectation', 'workIds', 'status'],
  arrangement: ['id', 'templateId', 'templateVersion', 'teamBindings', 'connectionBindings'],
  arrangementTeam: ['slotId', 'teamId'],
  arrangementConnection: ['slotId', 'connectionId'],
  practice: ['id', 'practiceId', 'teamId', 'workIds'],
  capability: ['id', 'definitionId', 'definitionVersion', 'context', 'teamId', 'responsiblePersonIds', 'decisionOwnerPersonId', 'lifecycle', 'prerequisites', 'supportBindings'],
  capabilityReference: ['kind', 'instanceId'],
  supportBinding: ['requirementId', 'workIds'],
  capabilityEvidence: ['id', 'subject', 'stage', 'context', 'observation', 'recorderPersonId', 'reviewBoundary', 'observedPlanRevision'],
  changeSettings: ['activeFramework', 'lens', 'sourceFilter', 'frameworkMaps', 'attention'],
  changeFramework: ['frameworkId', 'version'],
  changeLens: ['lensId', 'version'],
  changeFrameworkMap: ['frameworkId', 'version', 'components'],
  changeComponent: ['componentId', 'mapped', 'status', 'workIds', 'capabilityRefs'],
  changeAttention: ['version', 'channels'],
  changeChannel: ['channelId', 'parts'],
  assuranceSettings: ['version', 'context', 'quality', 'recoveryAdditionalShareBasisPoints', 'recoveryEvents', 'learningActions', 'rehearsals'],
  assuranceContext: ['sourcePresetId', 'referenceHorizon', 'namedUnknowns', 'recoveryRatePersonIds'],
  referenceHorizon: ['quantity', 'unit'],
  quality: ['included', 'allocationPercent', 'independentRateCentsPerHour', 'sigmaHalfSteps', 'additionalShareBasisPoints', 'concepts'],
  qualityConcept: ['conceptId', 'included', 'workIds'],
  recoveryEvent: ['id', 'label', 'included', 'lifecycle', 'eventCount', 'aggregateMinutesPerEvent', 'receiverPersonId', 'reviewBoundary', 'workIds'],
  learningAction: ['id', 'promptId', 'context', 'decisionOwnerPersonId', 'reviewBoundary', 'workIds'],
  rehearsal: ['id', 'definitionId', 'definitionVersion', 'context', 'assumptions', 'response', 'reviewerPersonId', 'observedPlanRevision', 'observation', 'workIds', 'connectionIds', 'personIds'],
});
const FIELD_SETS = new Map(Object.entries(FIELDS).map(([kind, keys]) => [kind, new Set(keys)]));
const PROFILES = new Map([
  ['0.1.0', { fields: 'legacyPlan', purpose: false, relationships: false, capabilities: false, references: 4096 }],
  ['0.2.0', { fields: 'purposePlan', purpose: true, relationships: false, capabilities: false, references: 4096 }],
  ['0.3.0', { fields: 'relationshipPlan', purpose: true, relationships: true, capabilities: false, references: 8192 }],
  ['0.4.0', { fields: 'capabilityPlan', purpose: true, relationships: true, capabilities: true, references: 16384 }],
  ['0.5.0', { fields: 'changePlan', purpose: true, relationships: true, capabilities: true, change: true, references: 16384 }],
  ['0.6.0', { fields: 'assurancePlan', purpose: true, relationships: true, capabilities: true, change: true, assurance: true, references: 16384 }],
  ['0.7.0', { fields: 'scorePlan', purpose: true, relationships: true, capabilities: true, change: true, assurance: true, score: true, references: 16384 }],
  ['0.8.0', { fields: 'plan', purpose: true, relationships: true, capabilities: true, change: true, assurance: true, score: true, arrangements: true, references: LIMITS.references }],
  ['0.9.0', { fields: 'plan', purpose: true, relationships: true, capabilities: true, change: true, assurance: true, score: true, cadence: true, arrangements: true, references: LIMITS.references }],
]);
const COMMAND_FIELDS = Object.freeze({
  'person.create': ['type', 'person'],
  'team.create': ['type', 'team'],
  'work.create': ['type', 'work'],
  'work.update': ['type', 'work'],
  'team.update': ['type', 'teamId', 'team'],
  'team.members.replace': ['type', 'teamId', 'personIds'],
  'work.participants.replace': ['type', 'workId', 'personIds'],
  'work.funding.set': ['type', 'workId', 'funding'],
  'work.status.set': ['type', 'workId', 'status'],
  'collection.reorder': ['type', 'collection', 'ids'],
  'person.role.replace': ['type', 'personId', 'role'],
  'person.lifecycle.set': ['type', 'personId', 'lifecycle'],
  'team.lifecycle.set': ['type', 'teamId', 'lifecycle'],
  'work.lifecycle.set': ['type', 'workId', 'lifecycle'],
  'contribution.create': ['type', 'contribution'],
  'contribution.update': ['type', 'contributionId', 'contribution'],
  'contribution.remove': ['type', 'contributionId'],
  'connection.create': ['type', 'connection'],
  'connection.update': ['type', 'connectionId', 'connection'],
  'connection.remove': ['type', 'connectionId'],
  'connection.status.set': ['type', 'connectionId', 'status'],
  'arrangement.remove': ['type', 'arrangementId'],
  'person.remove': ['type', 'personId'],
  'team.remove': ['type', 'teamId'],
  'work.remove': ['type', 'workId'],
  'capability.update': ['type', 'kind', 'instanceId', 'instance'],
  'capability.lifecycle.set': ['type', 'kind', 'instanceId', 'lifecycle'],
  'capability.remove': ['type', 'kind', 'instanceId'],
  'capability.evidence.record': ['type', 'evidence'],
  'capability.evidence.remove': ['type', 'evidenceId'],
  'change.settings.replace': ['type', 'changeSettings'],
  'assurance.settings.replace': ['type', 'assuranceSettings'],
  'score.arrangement.replace': ['type', 'scoreSettings', 'workTiming', 'availability', 'fundProposalIds'],
});
const COMMAND_FIELD_SETS = new Map(Object.entries(COMMAND_FIELDS).map(([kind, keys]) => [kind, new Set(keys)]));
const ORDERED_COLLECTIONS = Object.freeze(['people', 'teams', 'work', 'practices', 'contributions', 'connections', 'abilities', 'capabilityEvidence', 'arrangements']);

export class PlanError extends Error {
  constructor(code, path, message) {
    super(message);
    this.name = 'PlanError';
    this.code = code;
    this.path = path;
  }
}

function reject(code, path, message) { throw new PlanError(code, path, message); }

// Read only declared data descriptors. Surplus or accessor values are never traversed.
function dataRecord(value, fields, allowed, path) {
  const prototype = value && typeof value === 'object' ? Object.getPrototypeOf(value) : undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || (prototype !== Object.prototype && prototype !== null)) {
    reject('record', path, 'Supply a plain record with the declared fields.');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(key => !allowed.has(key))) {
    reject('fields', path, 'Supply exactly the fields declared by this contract.');
  }
  const owned = {};
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      reject('data-property', `${path}.${key}`, 'Supply an enumerable data value.');
    }
    owned[key] = descriptor.value;
  }
  return owned;
}

function record(value, kind, path) { return dataRecord(value, FIELDS[kind], FIELD_SETS.get(kind), path); }

function schemaVersion(candidate) {
  const prototype = candidate && typeof candidate === 'object' ? Object.getPrototypeOf(candidate) : undefined;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)
    || (prototype !== Object.prototype && prototype !== null)) {
    reject('record', 'plan', 'Supply a plain record with the declared fields.');
  }
  const descriptor = Object.getOwnPropertyDescriptor(candidate, 'schemaVersion');
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
    reject('data-property', 'plan.schemaVersion', 'Supply an enumerable schema-version data value.');
  }
  if (typeof descriptor.value !== 'string' || !PROFILES.has(descriptor.value)) {
    reject('unsupported-contract', 'plan.schemaVersion', 'Use a supported native plan schema.');
  }
  return descriptor.value;
}

function list(value, max, path) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    reject('collection', path, `Supply a dense array with at most ${max} entries.`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, 'length');
  const length = descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
  if (!Number.isSafeInteger(length) || length < 0 || length > max) {
    reject('collection', path, `Supply a dense array with at most ${max} entries.`);
  }
  if (Reflect.ownKeys(value).length !== length + 1) {
    reject('collection', path, 'Supply consecutive array entries.');
  }
  const owned = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      reject('data-property', `${path}[${index}]`, 'Supply an enumerable array value.');
    }
    owned.push(descriptor.value);
  }
  return owned;
}

function text(value, path, identifier = false) {
  const max = identifier ? LIMITS.identifier : LIMITS.label;
  if (typeof value !== 'string' || value.length === 0 || value.length > max
      || value.trim() !== value || (identifier && !IDENTIFIER.test(value))) {
    reject('text', path, identifier ? 'Use a short lowercase identifier with letters, digits, or hyphens.' : 'Supply a bounded, nonblank label.');
  }
  return value;
}

function integer(value, max, path, min = 0) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    reject('integer', path, `Supply a whole number from ${min} through ${max}.`);
  }
  return value === 0 ? 0 : value;
}

function choice(value, choices, path) {
  if (!choices.includes(value)) reject('choice', path, 'Choose a supported value.');
  return value;
}

function indexRecords(values, path) {
  const index = new Map();
  for (const value of values) {
    if (index.has(value.id)) reject('duplicate-id', path, 'Give every record in this collection a distinct identifier.');
    index.set(value.id, value);
  }
  return index;
}

function references(value, index, path, budget, min = 0) {
  const ids = list(value, index.size, path);
  if (ids.length < min) reject('reference-count', path, `Supply at least ${min} reference.`);
  budget.remaining -= ids.length;
  if (budget.remaining < 0) reject('reference-budget', path, 'Use at most the declared total reference budget.');
  const seen = new Set();
  for (const id of ids) {
    text(id, path, true);
    if (!index.has(id)) reject('reference', path, 'Reference an existing record.');
    if (seen.has(id)) reject('duplicate-reference', path, 'Reference each record once within this list.');
    seen.add(id);
  }
  return ids;
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function sum(left, right) {
  const value = left + right;
  if (!Number.isSafeInteger(value)) reject('money-overflow', 'result', 'Reduce the modeled amount to the safe integer-cent range.');
  return value;
}

function price(minutes, rate) {
  if (minutes === 0) return 0;
  if (rate === null) return null;
  // Round an exact person-minute amount to cents, with half cents rounded up.
  const cents = (BigInt(minutes) * BigInt(rate) + 30n) / BigInt(CONTRACT.minutesPerHour);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) reject('money-overflow', 'result', 'Reduce the modeled amount to the safe integer-cent range.');
  return Number(cents);
}

function reconcile(settledCents, displayCents) {
  const adjustment = Number(BigInt(settledCents) - displayCents);
  if (!Number.isSafeInteger(adjustment)) reject('money-overflow', 'result', 'Keep the display reconciliation within the safe integer-cent range.');
  return adjustment;
}

function calculate(state, peopleById) {
  const capacity = new Map(state.people.map(person => [person.id, { personId: person.id, fundedMinutes: person.fundedMinutes, allocatedMinutes: 0, additionalMinutes: 0 }]));
  let fundedKnownCents = 0;
  let additionalKnownCents = 0;
  let allocatedKnownCents = 0;
  let additionalLineCents = 0n;
  let allocatedLineCents = 0n;
  let incomplete = false;
  const staffing = state.people.map(person => {
    const cents = price(person.fundedMinutes, person.rateCentsPerHour);
    if (cents === null) incomplete = true;
    else fundedKnownCents = sum(fundedKnownCents, cents);
    return { personId: person.id, cents };
  });
  const obligations = [];
  const ledger = state.work.map(work => {
    if (work.status === 'paused') obligations.push({ code: 'paused-work', workId: work.id });
    const minutes = work.minutesPerOccurrence * work.occurrences;
    const lines = work.personIds.map(personId => {
      const person = peopleById.get(personId);
      const cents = price(minutes, person.rateCentsPerHour);
      const usage = capacity.get(personId);
      if (work.funding === 'allocated') {
        usage.allocatedMinutes += minutes;
        if (cents !== null) allocatedLineCents += BigInt(cents);
      } else {
        usage.additionalMinutes += minutes;
        if (cents !== null) additionalLineCents += BigInt(cents);
      }
      if (cents === null) incomplete = true;
      return { personId, minutes, cents };
    });
    return { workId: work.id, funding: work.funding, status: work.status, lines };
  });
  const capacityRows = [...capacity.values()].map(usage => {
    const remainingMinutes = usage.fundedMinutes - usage.allocatedMinutes;
    if (remainingMinutes < 0) obligations.push({ code: 'allocated-capacity-exceeded', personId: usage.personId });
    const rate = peopleById.get(usage.personId).rateCentsPerHour;
    // Settle once per person/funding pool so splitting work preserves its cost.
    const allocatedCents = price(usage.allocatedMinutes, rate);
    const additionalCents = price(usage.additionalMinutes, rate);
    if (allocatedCents !== null) allocatedKnownCents = sum(allocatedKnownCents, allocatedCents);
    if (additionalCents !== null) additionalKnownCents = sum(additionalKnownCents, additionalCents);
    return { ...usage, remainingMinutes, allocatedCents, additionalCents };
  });
  const knownCommitmentCents = sum(fundedKnownCents, additionalKnownCents);
  return {
    standing: incomplete || obligations.length ? 'incomplete' : 'priced',
    currency: CONTRACT.currency,
    plannedCommitmentCents: incomplete ? null : knownCommitmentCents,
    knownCommitmentCents, fundedKnownCents, additionalKnownCents, allocatedKnownCents,
    lineRoundingAdjustments: { allocatedCents: reconcile(allocatedKnownCents, allocatedLineCents), additionalCents: reconcile(additionalKnownCents, additionalLineCents) },
    staffing, ledger, capacity: capacityRows, obligations,
    timing: state.work.some(row => row.timing !== null) ? 'authored' : 'unscheduled',
  };
}

// Compatibility belongs to the finite command/row API. Versioned plans select
// one exact row shape; current envelopes always carry all current fields.
function editableRecord(candidate, kind, path) {
  const legacy = `legacy${kind[0].toUpperCase()}${kind.slice(1)}`;
  const keys = candidate && typeof candidate === 'object' ? Reflect.ownKeys(candidate) : [];
  return record(candidate, kind === 'person' && keys.length === FIELDS.scorePerson.length ? 'scorePerson' : keys.length === FIELDS[legacy].length ? legacy : kind, path);
}

export function prepareRole(candidate, path = 'role') {
  const raw = record(candidate, 'role', path);
  const role = {};
  for (const field of ROLE_FIELDS) {
    const value = raw[field];
    if (value === null) { role[field] = null; continue; }
    if (field === 'change') {
      const change = record(value, 'change', `${path}.change`);
      if (!FRAMEWORK_COMPONENTS.get(change.frameworkId)?.has(change.componentId)) {
        reject('role-choice', `${path}.change`, 'Choose a component within its named framework.');
      }
      role.change = { frameworkId: change.frameworkId, componentId: change.componentId };
    } else {
      if (!ROLE_IDS.get(field).has(value)) reject('role-choice', `${path}.${field}`, 'Choose a listed role value or leave it unassigned.');
      role[field] = value;
    }
  }
  return role;
}

function lifecycleFields(raw, path) {
  return Object.hasOwn(raw, 'lifecycle') ? { lifecycle: choice(raw.lifecycle, LIFECYCLE, `${path}.lifecycle`) } : {};
}
function personFields(person, path) {
  return { id: text(person.id, `${path}.id`, true), label: text(person.label, `${path}.label`),
    fundedMinutes: integer(person.fundedMinutes, LIMITS.fundedMinutes, `${path}.fundedMinutes`),
    rateCentsPerHour: person.rateCentsPerHour === null ? null : integer(person.rateCentsPerHour, LIMITS.rateCentsPerHour, `${path}.rateCentsPerHour`),
    ...(Object.hasOwn(person, 'role') ? { role: prepareRole(person.role, `${path}.role`) } : {}),
    ...(Object.hasOwn(person, 'availability') ? { availability: prepareAvailability(person.availability, `${path}.availability`) } : {}), ...lifecycleFields(person, path) };
}
export function preparePerson(candidate, path = 'person') { return personFields(editableRecord(candidate, 'person', path), path); }

function identifiers(candidate, max, path, min = 0) {
  const ids = list(candidate, max, path);
  if (ids.length < min) reject('reference-count', path, `Supply at least ${min} reference.`);
  const seen = new Set();
  for (const id of ids) {
    text(id, path, true);
    if (seen.has(id)) reject('duplicate-reference', path, 'Reference each record once within this list.');
    seen.add(id);
  }
  return ids;
}

export function prepareTeam(candidate, path = 'team') {
  const team = editableRecord(candidate, 'team', path);
  return teamFields(team, identifiers(team.personIds, LIMITS.people, `${path}.personIds`), path);
}

function teamFields(team, personIds, path) {
  return { id: text(team.id, `${path}.id`, true), label: text(team.label, `${path}.label`), personIds, ...lifecycleFields(team, path) };
}

// The command envelope and every payload become owned before target lookup.
// Recheck the discriminant after reflection, just as versioned plan admission does.
export function prepareAssemblyCommand(candidate) {
  const path = 'command';
  const descriptor = candidate && typeof candidate === 'object'
    ? Object.getOwnPropertyDescriptor(candidate, 'type') : null;
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
    reject('data-property', `${path}.type`, 'Supply an enumerable command type.');
  }
  const type = descriptor.value;
  if (typeof type !== 'string' || !COMMAND_FIELD_SETS.has(type)) {
    reject('command', `${path}.type`, 'Choose a supported assembly command.');
  }
  const withPlacements = ['work.create', 'work.update'].includes(type) && Object.hasOwn(candidate, 'placements');
  const fields = withPlacements ? [...COMMAND_FIELDS[type], 'placements'] : COMMAND_FIELDS[type];
  const raw = dataRecord(candidate, fields, withPlacements ? new Set(fields) : COMMAND_FIELD_SETS.get(type), path);
  if (raw.type !== type) reject('command', `${path}.type`, 'Keep the admitted command type consistent.');
  switch (type) {
    case 'person.create': return { type, person: preparePerson(raw.person, `${path}.person`) };
    case 'team.create': return { type, team: prepareTeam(raw.team, `${path}.team`) };
    case 'work.create': case 'work.update': return { type, work: prepareWork(raw.work, `${path}.work`),
      ...(withPlacements ? { placements: prepareWorkPlacements(raw.placements, `${path}.placements`) } : {}) };
    case 'team.update': return { type, teamId: text(raw.teamId, `${path}.teamId`, true), team: prepareTeam(raw.team, `${path}.team`) };
    case 'team.members.replace': return { type, teamId: text(raw.teamId, `${path}.teamId`, true), personIds: identifiers(raw.personIds, LIMITS.people, `${path}.personIds`) };
    case 'work.participants.replace': return { type, workId: text(raw.workId, `${path}.workId`, true), personIds: identifiers(raw.personIds, LIMITS.people, `${path}.personIds`, 1) };
    case 'work.funding.set': return { type, workId: text(raw.workId, `${path}.workId`, true), funding: choice(raw.funding, FUNDING, `${path}.funding`) };
    case 'work.status.set': return { type, workId: text(raw.workId, `${path}.workId`, true), status: choice(raw.status, WORK_STATUS, `${path}.status`) };
    case 'collection.reorder': {
      const collection = choice(raw.collection, ORDERED_COLLECTIONS, `${path}.collection`);
      return { type, collection, ids: identifiers(raw.ids, LIMITS[collection], `${path}.ids`) };
    }
    case 'person.role.replace': return { type, personId: text(raw.personId, `${path}.personId`, true), role: prepareRole(raw.role, `${path}.role`) };
    case 'person.lifecycle.set': return { type, personId: text(raw.personId, `${path}.personId`, true), lifecycle: choice(raw.lifecycle, LIFECYCLE, `${path}.lifecycle`) };
    case 'team.lifecycle.set': return { type, teamId: text(raw.teamId, `${path}.teamId`, true), lifecycle: choice(raw.lifecycle, LIFECYCLE, `${path}.lifecycle`) };
    case 'work.lifecycle.set': return { type, workId: text(raw.workId, `${path}.workId`, true), lifecycle: choice(raw.lifecycle, LIFECYCLE, `${path}.lifecycle`) };
    case 'contribution.create': return { type, contribution: prepareContribution(raw.contribution, `${path}.contribution`) };
    case 'contribution.update': return { type, contributionId: text(raw.contributionId, `${path}.contributionId`, true), contribution: prepareContribution(raw.contribution, `${path}.contribution`) };
    case 'contribution.remove': return { type, contributionId: text(raw.contributionId, `${path}.contributionId`, true) };
    case 'connection.create': return { type, connection: prepareConnection(raw.connection, `${path}.connection`) };
    case 'connection.update': return { type, connectionId: text(raw.connectionId, `${path}.connectionId`, true), connection: prepareConnection(raw.connection, `${path}.connection`) };
    case 'connection.remove': return { type, connectionId: text(raw.connectionId, `${path}.connectionId`, true) };
    case 'arrangement.remove': return { type, arrangementId: text(raw.arrangementId, `${path}.arrangementId`, true) };
    case 'connection.status.set': return { type, connectionId: text(raw.connectionId, `${path}.connectionId`, true), status: choice(raw.status, CONNECTION_STATUS, `${path}.status`) };
    case 'person.remove': return { type, personId: text(raw.personId, `${path}.personId`, true) };
    case 'team.remove': return { type, teamId: text(raw.teamId, `${path}.teamId`, true) };
    case 'work.remove': return { type, workId: text(raw.workId, `${path}.workId`, true) };
    case 'capability.update': {
      const kind = choice(raw.kind, CAPABILITY_KINDS, `${path}.kind`);
      return { type, kind, instanceId: text(raw.instanceId, `${path}.instanceId`, true), instance: prepareCapability(raw.instance, kind, `${path}.instance`) };
    }
    case 'capability.lifecycle.set': return { type, kind: choice(raw.kind, CAPABILITY_KINDS, `${path}.kind`), instanceId: text(raw.instanceId, `${path}.instanceId`, true), lifecycle: choice(raw.lifecycle, LIFECYCLE, `${path}.lifecycle`) };
    case 'capability.remove': return { type, kind: choice(raw.kind, CAPABILITY_KINDS, `${path}.kind`), instanceId: text(raw.instanceId, `${path}.instanceId`, true) };
    case 'capability.evidence.record': return { type, evidence: prepareCapabilityEvidence(raw.evidence, `${path}.evidence`) };
    case 'capability.evidence.remove': return { type, evidenceId: text(raw.evidenceId, `${path}.evidenceId`, true) };
    case 'change.settings.replace': return { type, changeSettings: prepareChangeSettings(raw.changeSettings, `${path}.changeSettings`) };
    case 'assurance.settings.replace': return { type, assuranceSettings: prepareAssuranceSettings(raw.assuranceSettings, `${path}.assuranceSettings`) };
    case 'score.arrangement.replace': {
      const workTiming = list(raw.workTiming, LIMITS.work, `${path}.workTiming`).map((value, index) => {
        const rowPath = `${path}.workTiming[${index}]`, row = record(value, 'workTimingPatch', rowPath);
        return { workId: text(row.workId, `${rowPath}.workId`, true), timing: prepareWorkTiming(row.timing, `${rowPath}.timing`) };
      });
      const availability = list(raw.availability, LIMITS.people, `${path}.availability`).map((value, index) => {
        const rowPath = `${path}.availability[${index}]`, row = record(value, 'availabilityPatch', rowPath);
        return { personId: text(row.personId, `${rowPath}.personId`, true), intervals: prepareAvailability(row.intervals, `${rowPath}.intervals`) };
      });
      identifiers(workTiming.map(row => row.workId), LIMITS.work, `${path}.workTiming`);
      identifiers(availability.map(row => row.personId), LIMITS.people, `${path}.availability`);
      return { type, scoreSettings: prepareScoreSettings(raw.scoreSettings, `${path}.scoreSettings`), workTiming, availability,
        fundProposalIds: identifiers(raw.fundProposalIds, LIMITS.scoreProposals, `${path}.fundProposalIds`) };
    }
  }
}

export function preparePurpose(candidate, path = 'purpose') {
  const raw = record(candidate, 'purpose', path);
  return Object.fromEntries(PURPOSE_FIELDS.map(field => {
    const value = raw[field];
    if (value === null) return [field, null];
    if (typeof value !== 'string' || value.length > LIMITS.purposeText || !value.trim()) {
      reject('purpose-text', `${path}.${field}`, `Supply null or nonblank text of at most ${LIMITS.purposeText} UTF-16 units.`);
    }
    return [field, value.trim()];
  }));
}

function emptyPurpose() { return Object.fromEntries(PURPOSE_FIELDS.map(field => [field, null])); }

function workFields(work, personIds, path) {
  const timing = prepareWorkTiming(work.timing, `${path}.timing`);
  const row = { id: text(work.id, `${path}.id`, true), label: text(work.label, `${path}.label`),
    teamId: text(work.teamId, `${path}.teamId`, true), personIds,
    minutesPerOccurrence: integer(work.minutesPerOccurrence, LIMITS.minutesPerOccurrence, `${path}.minutesPerOccurrence`),
    occurrences: integer(work.occurrences, LIMITS.occurrences, `${path}.occurrences`),
    funding: choice(work.funding, FUNDING, `${path}.funding`),
    status: choice(work.status, WORK_STATUS, `${path}.status`), timing, ...lifecycleFields(work, path) };
  if (timing !== null) {
    if (row.occurrences > 1 && timing.repeatEveryMinutes === null) reject('score-cadence', `${path}.timing.repeatEveryMinutes`, 'Supply the minutes between starts for repeated work, or leave its timing unknown.');
    const lastEnd = timing.startMinute + Math.max(0, row.occurrences - 1) * (timing.repeatEveryMinutes ?? 0) + row.minutesPerOccurrence;
    if (row.occurrences && lastEnd > LIMITS.scoreMinute) reject('score-minute-budget', `${path}.timing`, 'Keep every occurrence within the relative-minute boundary.');
  }
  return row;
}

// Admit one closed row before comparing it with an already accepted work row.
// A changed row receives whole-plan reference and budget checks.
export function prepareWork(candidate, path = 'work') {
  const work = editableRecord(candidate, 'work', path);
  const personIds = identifiers(work.personIds, LIMITS.people, `${path}.personIds`, 1);
  return workFields(work, personIds, path);
}

export function prepareWorkTiming(candidate, path = 'timing') {
  if (candidate === null) return null;
  const row = record(candidate, 'workTiming', path);
  return { startMinute: integer(row.startMinute, LIMITS.scoreMinute, `${path}.startMinute`),
    repeatEveryMinutes: row.repeatEveryMinutes === null ? null : integer(row.repeatEveryMinutes, LIMITS.scoreMinute, `${path}.repeatEveryMinutes`, 1) };
}
function scoreInterval(row, path) {
  const startMinute = integer(row.startMinute, LIMITS.scoreMinute, `${path}.startMinute`);
  return { startMinute, endMinute: integer(row.endMinute, LIMITS.scoreMinute, `${path}.endMinute`, startMinute) };
}
export function prepareAvailability(candidate, path = 'availability') {
  if (candidate === null) return null;
  return list(candidate, LIMITS.availabilityIntervals, path).map((value, index) => {
    const rowPath = `${path}[${index}]`; return scoreInterval(record(value, 'interval', rowPath), rowPath);
  });
}

function placementFields(row, path) {
  const periodId = nullableId(row.periodId, `${path}.periodId`);
  if ((periodId === null) !== (row.subdivision === null)) reject('placement', path, 'Choose a period and its subdivision together, or leave both to choose.');
  return { occurrenceIndex: integer(row.occurrenceIndex, LIMITS.occurrences - 1, `${path}.occurrenceIndex`), periodId,
    subdivision: row.subdivision === null ? null : integer(row.subdivision, 3, `${path}.subdivision`, 1) };
}
export function prepareWorkPlacements(candidate, path = 'placements') {
  const seen = new Set();
  return list(candidate, LIMITS.scoreOccurrences, path).map((value, index) => {
    const rowPath = `${path}[${index}]`, row = placementFields(record(value, 'workPlacement', rowPath), rowPath);
    if (seen.has(row.occurrenceIndex)) reject('duplicate-reference', rowPath, 'Place each session occurrence once.');
    seen.add(row.occurrenceIndex); return row;
  });
}
export function prepareCadence(candidate, path = 'plan.scoreSettings.cadence') {
  if (candidate === null) return null;
  const raw = record(candidate, 'cadence', path);
  if (raw.version !== CADENCE_VERSION) reject('cadence-version', `${path}.version`, 'Use the supported planning-period version.');
  const basis = choice(raw.basis, ['sprint', 'quarter'], `${path}.basis`);
  const rows = (field, kind, limit, prepare) => list(raw[field], limit, `${path}.${field}`).map((value, index) => {
    const rowPath = `${path}.${field}[${index}]`; return prepare(record(value, kind, rowPath), rowPath);
  });
  const periods = rows('periods', 'cadencePeriod', LIMITS.cadencePeriods, (row, p) => ({ id: text(row.id, `${p}.id`, true), label: text(row.label, `${p}.label`) }));
  if (!periods.length) reject('reference-count', `${path}.periods`, 'Retain at least one planning period.');
  indexRecords(periods, `${path}.periods`);
  const keys = new Set();
  const placements = rows('placements', 'cadencePlacement', LIMITS.scoreOccurrences, (row, p) => {
    const result = { workId: text(row.workId, `${p}.workId`, true), ...placementFields(row, p) };
    const key = `${result.workId}:${result.occurrenceIndex}`;
    if (keys.has(key)) reject('duplicate-reference', p, 'Place each session occurrence once.');
    if (result.subdivision > CADENCE_SUBDIVISIONS[basis]) reject('placement', p, 'Choose a subdivision within this planning period.');
    keys.add(key); return result;
  });
  const availabilityKeys = new Set();
  const availability = rows('availability', 'cadenceAvailability', LIMITS.cadenceAvailability, (row, p) => {
    const personId = text(row.personId, `${p}.personId`, true), periodId = text(row.periodId, `${p}.periodId`, true), key = `${personId}:${periodId}`;
    if (availabilityKeys.has(key)) reject('duplicate-reference', p, 'Describe each person’s availability once per period.');
    availabilityKeys.add(key);
    return { personId, periodId, availableMinutes: row.availableMinutes === null ? null : integer(row.availableMinutes, LIMITS.fundedMinutes, `${p}.availableMinutes`) };
  });
  const endpoint = (value, p, kinds = ['work', 'stage']) => { const row = record(value, 'cadenceEndpoint', p); return { kind: choice(row.kind, kinds, `${p}.kind`), id: text(row.id, `${p}.id`, true) }; };
  const handoffs = rows('handoffs', 'cadenceHandoff', LIMITS.scoreDependencies, (row, p) => ({ id: text(row.id, `${p}.id`, true),
    from: endpoint(row.from, `${p}.from`), to: endpoint(row.to, `${p}.to`), connectionId: nullableId(row.connectionId, `${p}.connectionId`) }));
  indexRecords(handoffs, `${path}.handoffs`);
  const anchorIds = new Set();
  const decisionAnchors = rows('decisionAnchors', 'cadenceDecisionAnchor', LIMITS.scoreGates, (row, p) => {
    const gateId = text(row.gateId, `${p}.gateId`, true);
    if (anchorIds.has(gateId)) reject('duplicate-reference', p, 'Give each decision one planning anchor.');
    anchorIds.add(gateId);
    return { gateId, kind: choice(row.kind, ['stage', 'handoff'], `${p}.kind`), id: text(row.id, `${p}.id`, true) };
  });
  const delays = rows('delays', 'cadenceDelay', LIMITS.scoreWaits, (row, p) => ({ id: text(row.id, `${p}.id`, true), label: text(row.label, `${p}.label`),
    anchor: endpoint(row.anchor, `${p}.anchor`, ['work', 'stage', 'handoff']), fromPeriodId: nullableId(row.fromPeriodId, `${p}.fromPeriodId`),
    toPeriodId: nullableId(row.toPeriodId, `${p}.toPeriodId`), reason: relationshipText(row.reason, `${p}.reason`), receiverPersonId: nullableId(row.receiverPersonId, `${p}.receiverPersonId`) }));
  indexRecords(delays, `${path}.delays`);
  return { version: CADENCE_VERSION, basis, periods, placements, availability, handoffs, decisionAnchors, delays };
}

function prepareCadenceReferences(state, people, work, stages, gates, connections, budget) {
  const cadence = state.scoreSettings.cadence, path = 'plan.scoreSettings.cadence';
  const periods = new Map(cadence.periods.map(row => [row.id, row])), periodIndex = new Map(cadence.periods.map((row, index) => [row.id, index]));
  const handoffs = new Map(cadence.handoffs.map(row => [row.id, row]));
  const endpoint = (row, p) => reference(row.id, row.kind === 'work' ? work : row.kind === 'stage' ? stages : handoffs, `${p}.id`, budget);
  const workIds = row => row.kind === 'work' ? [row.id] : stages.get(row.id).workIds;
  let occurrences = 0, assignments = 0;
  for (const row of work.values()) { occurrences += row.occurrences; assignments += row.occurrences * row.personIds.length; }
  if (occurrences > LIMITS.scoreOccurrences) reject('score-occurrence-budget', 'plan.work', 'Keep this planning horizon within the declared session-occurrence budget.');
  if (assignments > LIMITS.scoreAssignments) reject('score-assignment-budget', 'plan.work', 'Keep this planning horizon within the declared participant-assignment budget.');
  cadence.placements.forEach((row, index) => {
    const p = `${path}.placements[${index}]`; reference(row.workId, work, `${p}.workId`, budget); reference(row.periodId, periods, `${p}.periodId`, budget);
    if (row.occurrenceIndex >= work.get(row.workId).occurrences) reject('placement', p, 'Choose an existing occurrence of this session.');
  });
  cadence.availability.forEach((row, index) => { const p = `${path}.availability[${index}]`; reference(row.personId, people, `${p}.personId`, budget); reference(row.periodId, periods, `${p}.periodId`, budget); });
  const adjacency = new Map([...work.keys()].map(id => [id, new Set()]));
  let expandedEdges = 0;
  cadence.handoffs.forEach((row, index) => {
    const p = `${path}.handoffs[${index}]`; endpoint(row.from, `${p}.from`); endpoint(row.to, `${p}.to`); reference(row.connectionId, connections, `${p}.connectionId`, budget);
    // Stage endpoints resolve through their existing work membership. Equal
    // or overlapping membership is an ambiguous self-handoff.
    for (const from of workIds(row.from)) for (const to of workIds(row.to)) {
      if (++expandedEdges > LIMITS.references) reject('reference-budget', `${path}.handoffs`, 'Keep handoff relationships within the declared reference budget.');
      if (from === to) reject('cadence-cycle', p, 'Connect distinct producing and receiving work.');
      adjacency.get(from).add(to);
    }
  });
  const visiting = new Set(), visited = new Set();
  const visit = id => {
    if (visiting.has(id)) reject('cadence-cycle', `${path}.handoffs`, 'Arrange handoffs toward later work.');
    if (visited.has(id)) return;
    visiting.add(id); for (const next of adjacency.get(id)) visit(next); visiting.delete(id); visited.add(id);
  };
  for (const id of adjacency.keys()) visit(id);
  cadence.decisionAnchors.forEach((row, index) => {
    const p = `${path}.decisionAnchors[${index}]`; reference(row.gateId, gates, `${p}.gateId`, budget); endpoint(row, p);
  });
  cadence.delays.forEach((row, index) => {
    const p = `${path}.delays[${index}]`; endpoint(row.anchor, `${p}.anchor`); reference(row.fromPeriodId, periods, `${p}.fromPeriodId`, budget);
    reference(row.toPeriodId, periods, `${p}.toPeriodId`, budget); reference(row.receiverPersonId, people, `${p}.receiverPersonId`, budget);
    if (row.fromPeriodId !== null && row.toPeriodId !== null && periodIndex.get(row.toPeriodId) < periodIndex.get(row.fromPeriodId)) reject('delay-order', p, 'Choose the same or a later receiving period.');
  });
}

export function prepareScoreSettings(candidate, path = 'plan.scoreSettings', legacy = false) {
  const descriptor = candidate && typeof candidate === 'object' ? Object.getOwnPropertyDescriptor(candidate, 'version') : null;
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) reject('data-property', `${path}.version`, 'Supply an enumerable score version.');
  const version = descriptor.value;
  if (!(version === '1.0.0' || !legacy && version === '1.1.0')) reject('score-version', `${path}.version`, 'Use the supported score-settings version.');
  const raw = record(candidate, version === '1.1.0' ? 'cadenceScoreSettings' : 'scoreSettings', path);
  if (raw.version !== version) reject('score-version', `${path}.version`, 'Keep the admitted version consistent.');
  let window = null;
  if (raw.window !== null) { const row = record(raw.window, 'scoreWindow', `${path}.window`); window = { label: text(row.label, `${path}.window.label`), ...scoreInterval(row, `${path}.window`) }; }
  const rows = (name, kind, maximum, prepare) => {
    const prepared = list(raw[name], maximum, `${path}.${name}`).map((value, index) => {
      const rowPath = `${path}.${name}[${index}]`, row = record(value, kind, rowPath);
      return { id: text(row.id, `${rowPath}.id`, true), ...prepare(row, rowPath) };
    });
    indexRecords(prepared, `${path}.${name}`); return prepared;
  };
  const dependencies = rows('dependencies', 'scoreDependency', LIMITS.scoreDependencies, (row, rowPath) => ({
    fromWorkId: text(row.fromWorkId, `${rowPath}.fromWorkId`, true), toWorkId: text(row.toWorkId, `${rowPath}.toWorkId`, true),
    lagMinutes: integer(row.lagMinutes, LIMITS.scoreMinute, `${rowPath}.lagMinutes`), connectionId: nullableId(row.connectionId, `${rowPath}.connectionId`) }));
  const stages = rows('stages', 'scoreStage', LIMITS.scoreStages, (row, rowPath) => ({ label: text(row.label, `${rowPath}.label`), workIds: identifiers(row.workIds, LIMITS.work, `${rowPath}.workIds`) }));
  const waits = rows('waits', 'scoreWait', LIMITS.scoreWaits, (row, rowPath) => ({ label: text(row.label, `${rowPath}.label`), ...scoreInterval(row, rowPath),
    reason: relationshipText(row.reason, `${rowPath}.reason`), receiverPersonId: nullableId(row.receiverPersonId, `${rowPath}.receiverPersonId`) }));
  const gates = rows('gates', 'scoreGate', LIMITS.scoreGates, (row, rowPath) => ({ label: text(row.label, `${rowPath}.label`), afterStageId: version === '1.1.0' ? nullableId(row.afterStageId, `${rowPath}.afterStageId`) : text(row.afterStageId, `${rowPath}.afterStageId`, true),
    reviewerPersonId: nullableId(row.reviewerPersonId, `${rowPath}.reviewerPersonId`), question: relationshipText(row.question, `${rowPath}.question`),
    evidence: relationshipText(row.evidence, `${rowPath}.evidence`), modeledDecision: choice(row.modeledDecision, ['open', 'proceed', 'revise', 'hold'], `${rowPath}.modeledDecision`) }));
  const proposals = rows('proposals', 'scoreProposal', LIMITS.scoreProposals, (row, rowPath) => {
    const proposed = record(row.work, 'work', `${rowPath}.work`);
    return { bank: choice(row.bank, ['next', 'options'], `${rowPath}.bank`), gateId: nullableId(row.gateId, `${rowPath}.gateId`),
      work: workFields(proposed, identifiers(proposed.personIds, LIMITS.people, `${rowPath}.work.personIds`, 1), `${rowPath}.work`) };
  });
  indexRecords(proposals.map(row => row.work), `${path}.proposals.work`);
  return { version: legacy ? '1.0.0' : '1.1.0', window, dependencies, stages, waits, gates, proposals,
    ...(legacy ? {} : { cadence: version === '1.1.0' ? prepareCadence(raw.cadence, `${path}.cadence`) : null }) };
}

function prepareScoreReferences(state, people, teams, work, budget) {
  const settings = state.scoreSettings, path = 'plan.scoreSettings', connections = new Map(state.connections.map(row => [row.id, row]));
  let occurrences = 0, assignments = 0;
  for (const row of state.work) if (row.timing !== null) {
    occurrences += row.occurrences; assignments += row.occurrences * row.personIds.length;
  }
  if (occurrences > LIMITS.scoreOccurrences) reject('score-occurrence-budget', 'plan.work', 'Keep explicitly timed work within 4096 occurrences; leave other timing unknown.');
  if (assignments > LIMITS.scoreAssignments) reject('score-assignment-budget', 'plan.work', 'Keep explicitly timed work within 16384 person assignments.');
  const outgoing = new Map([...work.keys()].map(id => [id, []])), incoming = new Map([...work.keys()].map(id => [id, 0]));
  settings.dependencies.forEach((row, index) => {
    const rowPath = `${path}.dependencies[${index}]`;
    reference(row.fromWorkId, work, `${rowPath}.fromWorkId`, budget); reference(row.toWorkId, work, `${rowPath}.toWorkId`, budget);
    reference(row.connectionId, connections, `${rowPath}.connectionId`, budget);
    outgoing.get(row.fromWorkId).push(row.toWorkId); incoming.set(row.toWorkId, incoming.get(row.toWorkId) + 1);
  });
  // Kahn's finite queue visits each authored vertex and edge once. Paused
  // connections preserve their authored edges for cycle admission.
  const ready = [...incoming.keys()].filter(id => incoming.get(id) === 0); let visited = 0;
  for (let cursor = 0; cursor < ready.length; cursor += 1) {
    visited += 1;
    for (const id of outgoing.get(ready[cursor])) { incoming.set(id, incoming.get(id) - 1); if (incoming.get(id) === 0) ready.push(id); }
  }
  if (visited !== work.size) reject('score-cycle', `${path}.dependencies`, 'Choose dependencies that move toward later work without returning to an earlier session.');
  settings.stages.forEach((row, index) => { row.workIds = references(row.workIds, work, `${path}.stages[${index}].workIds`, budget); });
  const stages = new Map(settings.stages.map(row => [row.id, row])), gates = new Map(settings.gates.map(row => [row.id, row]));
  settings.waits.forEach((row, index) => reference(row.receiverPersonId, people, `${path}.waits[${index}].receiverPersonId`, budget));
  settings.gates.forEach((row, index) => {
    reference(row.afterStageId, stages, `${path}.gates[${index}].afterStageId`, budget);
    if (row.afterStageId === null && !settings.cadence?.decisionAnchors.some(anchor => anchor.gateId === row.id))
      reject('reference', `${path}.gates[${index}]`, 'Attach this decision to a stage or handoff.');
    reference(row.reviewerPersonId, people, `${path}.gates[${index}].reviewerPersonId`, budget);
  });
  if (settings.cadence) prepareCadenceReferences(state, people, work, stages, gates, connections, budget);
  settings.proposals.forEach((row, index) => {
    const rowPath = `${path}.proposals[${index}]`, proposed = row.work;
    if (work.has(proposed.id)) reject('duplicate-id', `${rowPath}.work.id`, 'Give proposed work an identity distinct from accepted sessions.');
    reference(row.gateId, gates, `${rowPath}.gateId`, budget); reference(proposed.teamId, teams, `${rowPath}.work.teamId`, budget);
    proposed.personIds = references(proposed.personIds, people, `${rowPath}.work.personIds`, budget, 1);
  });
}

function nullableId(value, path) { return value === null ? null : text(value, path, true); }
function relationshipText(value, path, nullable = true) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || value.length > LIMITS.relationshipText || !value.trim()) {
    reject('relationship-text', path, `Supply ${nullable ? 'null or ' : ''}nonblank text of at most ${LIMITS.relationshipText} UTF-16 units.`);
  }
  return value.trim();
}
export function prepareContribution(candidate, path = 'contribution') {
  const raw = record(candidate, 'contribution', path);
  if (!CATEGORY_IDS.has(raw.categoryId)) reject('category', `${path}.categoryId`, 'Choose a listed output category.');
  return { id: text(raw.id, `${path}.id`, true), categoryId: raw.categoryId,
    receiverPersonId: nullableId(raw.receiverPersonId, `${path}.receiverPersonId`),
    decisionOwnerPersonId: nullableId(raw.decisionOwnerPersonId, `${path}.decisionOwnerPersonId`),
    workIds: identifiers(raw.workIds, LIMITS.work, `${path}.workIds`),
    reviewBoundary: relationshipText(raw.reviewBoundary, `${path}.reviewBoundary`), decisionBoundary: relationshipText(raw.decisionBoundary, `${path}.decisionBoundary`) };
}

function capabilityReference(candidate, path) {
  const raw = record(candidate, 'capabilityReference', path);
  return { kind: choice(raw.kind, CAPABILITY_KINDS, `${path}.kind`), instanceId: text(raw.instanceId, `${path}.instanceId`, true) };
}
const capabilityKey = (kind, id) => `${kind}:${id}`;

// Settings own planning posture and references. Whole-plan admission resolves
// the references; mapped status itself makes no claim about supporting work.
export function prepareChangeSettings(candidate, path = 'plan.changeSettings') {
  const raw = record(candidate, 'changeSettings', path);
  const active = record(raw.activeFramework, 'changeFramework', `${path}.activeFramework`);
  const activeDefinition = getChangeFramework(active.frameworkId, active.version);
  if (!activeDefinition) reject('change-framework', `${path}.activeFramework`, 'Choose an exact listed framework and version.');
  const lens = record(raw.lens, 'changeLens', `${path}.lens`);
  const lensDefinition = getInterpretiveLens(lens.lensId, lens.version);
  if (!lensDefinition) reject('change-lens', `${path}.lens`, 'Choose an exact listed lens and version.');
  const definitions = listChangeFrameworks(), seenFrameworks = new Set();
  const frameworkMaps = list(raw.frameworkMaps, definitions.length, `${path}.frameworkMaps`).map((value, index) => {
    const mapPath = `${path}.frameworkMaps[${index}]`, mapping = record(value, 'changeFrameworkMap', mapPath);
    const definition = getChangeFramework(mapping.frameworkId, mapping.version);
    if (!definition) reject('change-framework', mapPath, 'Retain a mapping for an exact listed framework and version.');
    const key = `${definition.id}:${definition.version}`;
    if (seenFrameworks.has(key)) reject('duplicate-reference', mapPath, 'Retain each framework version once.');
    seenFrameworks.add(key);
    const allowed = new Set(definition.components.map(row => row.id)), seenComponents = new Set();
    const components = list(mapping.components, allowed.size, `${mapPath}.components`).map((value, position) => {
      const componentPath = `${mapPath}.components[${position}]`, row = record(value, 'changeComponent', componentPath);
      if (!allowed.has(row.componentId)) reject('change-component', `${componentPath}.componentId`, 'Choose a component within this exact framework version.');
      if (seenComponents.has(row.componentId)) reject('duplicate-reference', `${componentPath}.componentId`, 'Retain each component once.');
      seenComponents.add(row.componentId);
      if (typeof row.mapped !== 'boolean') reject('boolean', `${componentPath}.mapped`, 'State whether this component is mapped.');
      const seenReferences = new Set();
      const capabilityRefs = list(row.capabilityRefs, LIMITS.abilities + LIMITS.practices, `${componentPath}.capabilityRefs`).map((value, referenceIndex) => {
        const edgePath = `${componentPath}.capabilityRefs[${referenceIndex}]`, edge = capabilityReference(value, edgePath);
        const edgeKey = capabilityKey(edge.kind, edge.instanceId);
        if (seenReferences.has(edgeKey)) reject('duplicate-reference', edgePath, 'Reference each ability or practice once in this component.');
        seenReferences.add(edgeKey); return edge;
      });
      return { componentId: row.componentId, mapped: row.mapped,
        status: choice(row.status, ['planned', 'partial', 'look', 'outside'], `${componentPath}.status`),
        workIds: identifiers(row.workIds, LIMITS.work, `${componentPath}.workIds`), capabilityRefs };
    });
    if (components.length !== allowed.size) reject('change-components', `${mapPath}.components`, 'Retain every component of this framework version.');
    return { frameworkId: definition.id, version: definition.version, components };
  });
  if (frameworkMaps.length !== definitions.length) reject('change-frameworks', `${path}.frameworkMaps`, 'Retain a map for every available framework.');
  const attention = record(raw.attention, 'changeAttention', `${path}.attention`);
  if (attention.version !== CHANGE_CATALOGUE_VERSION) reject('change-attention', `${path}.attention.version`, 'Use the supported attention-channel version.');
  const channelsById = new Map(listAttentionChannels().map(row => [row.id, row])), seenChannels = new Set();
  const channels = list(attention.channels, channelsById.size, `${path}.attention.channels`).map((value, index) => {
    const channelPath = `${path}.attention.channels[${index}]`, channel = record(value, 'changeChannel', channelPath);
    const definition = channelsById.get(channel.channelId);
    if (!definition) reject('change-channel', `${channelPath}.channelId`, 'Choose a defined attention channel.');
    if (seenChannels.has(definition.id)) reject('duplicate-reference', `${channelPath}.channelId`, 'Retain each attention channel once.');
    seenChannels.add(definition.id);
    return { channelId: definition.id, parts: integer(channel.parts, definition.maxParts, `${channelPath}.parts`, definition.minParts) };
  });
  if (channels.length !== channelsById.size) reject('change-channels', `${path}.attention.channels`, 'Retain all eight attention channels.');
  return { activeFramework: { frameworkId: activeDefinition.id, version: activeDefinition.version },
    lens: { lensId: lensDefinition.id, version: lensDefinition.version },
    sourceFilter: choice(raw.sourceFilter, ['all', 'core', 'enterprise'], `${path}.sourceFilter`),
    frameworkMaps, attention: { version: CHANGE_CATALOGUE_VERSION, channels } };
}

function boolean(value, path) {
  if (typeof value !== 'boolean') reject('boolean', path, 'Supply true or false for this choice.');
  return value;
}

// Estimate assumptions and recorded rehearsal context retain their own units.
// Supporting sessions keep the plan's existing person-minute and funding owners.
export function prepareAssuranceSettings(candidate, path = 'plan.assuranceSettings') {
  const raw = record(candidate, 'assuranceSettings', path);
  if (raw.version !== '1.0.0') reject('assurance-version', `${path}.version`, 'Use the supported assurance-settings version.');
  const context = record(raw.context, 'assuranceContext', `${path}.context`);
  if (context.sourcePresetId !== null && !getSourcePreset(context.sourcePresetId, '1.0.0')) {
    reject('assurance-preset', `${path}.context.sourcePresetId`, 'Choose an authored source preset or leave the reference unset.');
  }
  let referenceHorizon = null;
  if (context.referenceHorizon !== null) {
    const horizonPath = `${path}.context.referenceHorizon`, horizon = record(context.referenceHorizon, 'referenceHorizon', horizonPath);
    referenceHorizon = { quantity: integer(horizon.quantity, 1000, `${horizonPath}.quantity`, 1),
      unit: choice(horizon.unit, ['hours', 'sprints', 'quarters'], `${horizonPath}.unit`) };
  }
  const qualityPath = `${path}.quality`, quality = record(raw.quality, 'quality', qualityPath);
  const conceptIds = new Set(listQualityConcepts().map(row => row.id)), seen = new Set();
  const concepts = list(quality.concepts, conceptIds.size, `${qualityPath}.concepts`).map((value, index) => {
    const rowPath = `${qualityPath}.concepts[${index}]`, row = record(value, 'qualityConcept', rowPath);
    if (!conceptIds.has(row.conceptId)) reject('quality-concept', `${rowPath}.conceptId`, 'Choose an authored quality concept.');
    if (seen.has(row.conceptId)) reject('duplicate-reference', `${rowPath}.conceptId`, 'Retain each quality concept once.');
    seen.add(row.conceptId);
    return { conceptId: row.conceptId, included: boolean(row.included, `${rowPath}.included`),
      workIds: identifiers(row.workIds, LIMITS.work, `${rowPath}.workIds`) };
  });
  if (concepts.length !== conceptIds.size) reject('quality-concepts', `${qualityPath}.concepts`, 'Retain all ten quality concepts.');
  const recoveryEvents = list(raw.recoveryEvents, LIMITS.recoveryEvents, `${path}.recoveryEvents`).map((value, index) => {
    const rowPath = `${path}.recoveryEvents[${index}]`, row = record(value, 'recoveryEvent', rowPath);
    return { id: text(row.id, `${rowPath}.id`, true), label: text(row.label, `${rowPath}.label`),
      included: boolean(row.included, `${rowPath}.included`), lifecycle: choice(row.lifecycle, LIFECYCLE, `${rowPath}.lifecycle`),
      eventCount: integer(row.eventCount, 1000, `${rowPath}.eventCount`),
      aggregateMinutesPerEvent: integer(row.aggregateMinutesPerEvent, 60000, `${rowPath}.aggregateMinutesPerEvent`),
      receiverPersonId: nullableId(row.receiverPersonId, `${rowPath}.receiverPersonId`),
      reviewBoundary: relationshipText(row.reviewBoundary, `${rowPath}.reviewBoundary`),
      workIds: identifiers(row.workIds, LIMITS.work, `${rowPath}.workIds`) };
  });
  const learningActions = list(raw.learningActions, LIMITS.learningActions, `${path}.learningActions`).map((value, index) => {
    const rowPath = `${path}.learningActions[${index}]`, row = record(value, 'learningAction', rowPath);
    if (!getLearningPromptDefinition(row.promptId)) reject('learning-prompt', `${rowPath}.promptId`, 'Choose an authored learning prompt.');
    return { id: text(row.id, `${rowPath}.id`, true), promptId: row.promptId,
      context: relationshipText(row.context, `${rowPath}.context`),
      decisionOwnerPersonId: nullableId(row.decisionOwnerPersonId, `${rowPath}.decisionOwnerPersonId`),
      reviewBoundary: relationshipText(row.reviewBoundary, `${rowPath}.reviewBoundary`),
      workIds: identifiers(row.workIds, LIMITS.work, `${rowPath}.workIds`) };
  });
  const rehearsals = list(raw.rehearsals, LIMITS.rehearsals, `${path}.rehearsals`).map((value, index) => {
    const rowPath = `${path}.rehearsals[${index}]`, row = record(value, 'rehearsal', rowPath);
    const definition = getRehearsalDefinition(row.definitionId, row.definitionVersion);
    if (!definition) reject('rehearsal-definition', `${rowPath}.definitionId`, 'Choose an exact authored rehearsal and version.');
    const observation = relationshipText(row.observation, `${rowPath}.observation`);
    const context = relationshipText(row.context, `${rowPath}.context`);
    const response = relationshipText(row.response, `${rowPath}.response`);
    const reviewerPersonId = nullableId(row.reviewerPersonId, `${rowPath}.reviewerPersonId`);
    if (observation !== null && (context === null || response === null || reviewerPersonId === null)) {
      reject('rehearsal-observation', rowPath, 'Name the context, response and human reviewer for a recorded observation.');
    }
    return { id: text(row.id, `${rowPath}.id`, true), definitionId: definition.id, definitionVersion: definition.version,
      context, assumptions: relationshipText(row.assumptions, `${rowPath}.assumptions`), response, reviewerPersonId,
      observedPlanRevision: integer(row.observedPlanRevision, LIMITS.revision, `${rowPath}.observedPlanRevision`), observation,
      workIds: identifiers(row.workIds, LIMITS.work, `${rowPath}.workIds`),
      connectionIds: identifiers(row.connectionIds, LIMITS.connections, `${rowPath}.connectionIds`),
      personIds: identifiers(row.personIds, LIMITS.people, `${rowPath}.personIds`) };
  });
  for (const [name, rows] of [['recoveryEvents', recoveryEvents], ['learningActions', learningActions], ['rehearsals', rehearsals]]) indexRecords(rows, `${path}.${name}`);
  return { version: '1.0.0', context: { sourcePresetId: context.sourcePresetId, referenceHorizon,
    namedUnknowns: integer(context.namedUnknowns, 20, `${path}.context.namedUnknowns`),
    recoveryRatePersonIds: identifiers(context.recoveryRatePersonIds, LIMITS.people, `${path}.context.recoveryRatePersonIds`) },
  quality: { included: boolean(quality.included, `${qualityPath}.included`),
    allocationPercent: integer(quality.allocationPercent, 100, `${qualityPath}.allocationPercent`),
    independentRateCentsPerHour: quality.independentRateCentsPerHour === null ? null : integer(quality.independentRateCentsPerHour, LIMITS.rateCentsPerHour, `${qualityPath}.independentRateCentsPerHour`),
    sigmaHalfSteps: integer(quality.sigmaHalfSteps, 12, `${qualityPath}.sigmaHalfSteps`, 2),
    additionalShareBasisPoints: integer(quality.additionalShareBasisPoints, 10000, `${qualityPath}.additionalShareBasisPoints`), concepts },
  recoveryAdditionalShareBasisPoints: integer(raw.recoveryAdditionalShareBasisPoints, 10000, `${path}.recoveryAdditionalShareBasisPoints`),
  recoveryEvents, learningActions, rehearsals };
}

function prepareAssuranceReferences(state, people, work, budget) {
  const settings = state.assuranceSettings, path = 'plan.assuranceSettings';
  const connections = new Map(state.connections.map(row => [row.id, row]));
  settings.context.recoveryRatePersonIds = references(settings.context.recoveryRatePersonIds, people, `${path}.context.recoveryRatePersonIds`, budget);
  settings.quality.concepts.forEach((row, index) => {
    row.workIds = references(row.workIds, work, `${path}.quality.concepts[${index}].workIds`, budget);
  });
  for (const [collection, human] of [['recoveryEvents', 'receiverPersonId'], ['learningActions', 'decisionOwnerPersonId'], ['rehearsals', 'reviewerPersonId']]) {
    settings[collection].forEach((row, index) => {
      const rowPath = `${path}.${collection}[${index}]`;
      reference(row[human], people, `${rowPath}.${human}`, budget);
      row.workIds = references(row.workIds, work, `${rowPath}.workIds`, budget);
      if (collection === 'rehearsals') {
        if (row.observedPlanRevision > state.revision) reject('observation-revision', `${rowPath}.observedPlanRevision`, 'Refer to this plan revision or an earlier observed revision.');
        row.personIds = references(row.personIds, people, `${rowPath}.personIds`, budget);
        row.connectionIds = references(row.connectionIds, connections, `${rowPath}.connectionIds`, budget);
      }
    });
  }
}

export function prepareCapability(candidate, kind, path = 'capability') {
  choice(kind, CAPABILITY_KINDS, `${path}.kind`);
  const raw = record(candidate, 'capability', path);
  const definition = getCapabilityDefinition(kind, raw.definitionId, raw.definitionVersion);
  if (!definition) reject('capability-definition', `${path}.definitionId`, 'Choose an exact listed definition and version.');
  const requirements = new Set(definition.supportRequirements.map(row => row.id)), seenBindings = new Set(), seenPrerequisites = new Set();
  return {
    id: text(raw.id, `${path}.id`, true), definitionId: definition.id, definitionVersion: definition.version,
    context: relationshipText(raw.context, `${path}.context`), teamId: nullableId(raw.teamId, `${path}.teamId`),
    responsiblePersonIds: identifiers(raw.responsiblePersonIds, LIMITS.people, `${path}.responsiblePersonIds`),
    decisionOwnerPersonId: nullableId(raw.decisionOwnerPersonId, `${path}.decisionOwnerPersonId`),
    lifecycle: choice(raw.lifecycle, LIFECYCLE, `${path}.lifecycle`),
    prerequisites: list(raw.prerequisites, LIMITS.prerequisiteEdges, `${path}.prerequisites`).map((value, index) => {
      const row = capabilityReference(value, `${path}.prerequisites[${index}]`), key = capabilityKey(row.kind, row.instanceId);
      if (seenPrerequisites.has(key)) reject('duplicate-reference', `${path}.prerequisites`, 'Choose each prerequisite instance once.');
      seenPrerequisites.add(key); return row;
    }),
    supportBindings: list(raw.supportBindings, LIMITS.supportRequirements, `${path}.supportBindings`).map((value, index) => {
      const bindingPath = `${path}.supportBindings[${index}]`, binding = record(value, 'supportBinding', bindingPath);
      if (!requirements.has(binding.requirementId)) reject('support-requirement', `${bindingPath}.requirementId`, 'Choose a requirement from this exact definition.');
      if (seenBindings.has(binding.requirementId)) reject('duplicate-reference', `${path}.supportBindings`, 'Bind each support requirement once.');
      seenBindings.add(binding.requirementId);
      return { requirementId: binding.requirementId, workIds: identifiers(binding.workIds, LIMITS.work, `${bindingPath}.workIds`) };
    }),
  };
}

export function prepareCapabilityEvidence(candidate, path = 'capabilityEvidence') {
  const raw = record(candidate, 'capabilityEvidence', path);
  return { id: text(raw.id, `${path}.id`, true), subject: capabilityReference(raw.subject, `${path}.subject`),
    stage: choice(raw.stage, EVIDENCE_STAGES, `${path}.stage`),
    context: relationshipText(raw.context, `${path}.context`, false),
    observation: relationshipText(raw.observation, `${path}.observation`, false),
    recorderPersonId: text(raw.recorderPersonId, `${path}.recorderPersonId`, true),
    reviewBoundary: relationshipText(raw.reviewBoundary, `${path}.reviewBoundary`, false),
    observedPlanRevision: integer(raw.observedPlanRevision, LIMITS.revision, `${path}.observedPlanRevision`) };
}

function prepareCapabilities(raw, state, people, teams, work, budget) {
  const nodes = new Map(), adjacency = new Map(), indegrees = new Map();
  let edges = 0;
  for (const [kind, collection] of [['ability', 'abilities'], ['practice', 'practices']]) {
    state[collection] = list(raw[collection], LIMITS[collection], `plan.${collection}`).map((value, index) => {
      const path = `plan.${collection}[${index}]`, row = prepareCapability(value, kind, path);
      reference(row.teamId, teams, `${path}.teamId`, budget);
      reference(row.decisionOwnerPersonId, people, `${path}.decisionOwnerPersonId`, budget);
      row.responsiblePersonIds = references(row.responsiblePersonIds, people, `${path}.responsiblePersonIds`, budget);
      for (const [index, binding] of row.supportBindings.entries()) binding.workIds = references(binding.workIds, work, `${path}.supportBindings[${index}].workIds`, budget);
      edges += row.prerequisites.length;
      if (edges > LIMITS.prerequisiteEdges) reject('prerequisite-budget', `${path}.prerequisites`, 'Keep the plan within 512 prerequisite references.');
      const key = capabilityKey(kind, row.id);
      nodes.set(key, { kind, row, path }); adjacency.set(key, []); indegrees.set(key, row.prerequisites.length);
      return row;
    });
    indexRecords(state[collection], `plan.${collection}`);
  }
  for (const [key, node] of nodes) for (const [index, edge] of node.row.prerequisites.entries()) {
    const target = capabilityKey(edge.kind, edge.instanceId);
    reference(target, nodes, `${node.path}.prerequisites[${index}]`, budget);
    adjacency.get(target).push(key);
  }
  // A dependency-first topological pass visits every node and edge once. The
  // same ordering lets current support propagate without repeated graph walks.
  const queue = [...nodes.keys()].filter(key => indegrees.get(key) === 0), ordered = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const key = queue[cursor]; ordered.push(nodes.get(key));
    for (const dependant of adjacency.get(key)) {
      const degree = indegrees.get(dependant) - 1; indegrees.set(dependant, degree);
      if (degree === 0) queue.push(dependant);
    }
  }
  if (ordered.length !== nodes.size) {
    const node = nodes.get([...nodes.keys()].find(key => indegrees.get(key) > 0));
    reject('capability-cycle', `${node.path}.prerequisites`, 'Choose prerequisites that leave a clear starting point; this selection forms a cycle.');
  }
  state.capabilityEvidence = list(raw.capabilityEvidence, LIMITS.capabilityEvidence, 'plan.capabilityEvidence').map((value, index) => {
    const path = `plan.capabilityEvidence[${index}]`, row = prepareCapabilityEvidence(value, path);
    reference(capabilityKey(row.subject.kind, row.subject.instanceId), nodes, `${path}.subject`, budget);
    reference(row.recorderPersonId, people, `${path}.recorderPersonId`, budget);
    if (row.observedPlanRevision > state.revision) reject('evidence-revision', `${path}.observedPlanRevision`, 'Record an observation against this revision or an earlier revision.');
    return row;
  });
  indexRecords(state.capabilityEvidence, 'plan.capabilityEvidence');
  return { nodes, ordered };
}

function capabilitySummaries(state, graph, people, teams, work, result) {
  const capacity = new Map(result.capacity.map(row => [row.personId, row]));
  const summaries = new Map(), users = new Map(), evidence = new Map();
  for (const { row, kind } of graph.ordered) for (const id of capabilityWorkIds(row)) {
    if (!users.has(id)) users.set(id, new Set()); users.get(id).add(capabilityKey(kind, row.id));
  }
  for (const row of state.capabilityEvidence) {
    const key = capabilityKey(row.subject.kind, row.subject.instanceId);
    if (!evidence.has(key)) evidence.set(key, []); evidence.get(key).push(row);
  }
  for (const { kind, row } of graph.ordered) {
    const definition = getCapabilityDefinition(kind, row.definitionId, row.definitionVersion), gaps = [];
    const gap = (code, field, message, detail = {}) => gaps.push({ code, field, message, ...detail });
    if (row.context === null) gap('context-needed', 'context', 'Describe where people will use this ability or practice.');
    if (row.teamId === null) gap('team-needed', 'teamId', 'Choose the team responsible for this work.');
    else if (teams.get(row.teamId).lifecycle === 'retired') gap('retired-team', 'teamId', 'Choose an active responsible team.', { teamId: row.teamId });
    if (!row.responsiblePersonIds.length) gap('responsible-person-needed', 'responsiblePersonIds', 'Choose the people responsible for the work.');
    if (row.decisionOwnerPersonId === null) gap('decision-owner-needed', 'decisionOwnerPersonId', 'Choose the person who decides whether the result is ready.');
    for (const id of new Set([...row.responsiblePersonIds, row.decisionOwnerPersonId].filter(Boolean))) if (people.get(id).lifecycle === 'retired') gap('retired-person', 'responsiblePersonIds', 'Review the responsibility assigned to a retired person.', { personId: id });
    const bindings = new Map(row.supportBindings.map(binding => [binding.requirementId, binding.workIds]));
    const requirements = definition.supportRequirements.map(requirement => {
      const ids = bindings.get(requirement.id) ?? [];
      let complete = ids.length > 0;
      if (!ids.length) gap('support-needed', 'supportBindings', `Choose work for “${requirement.label}”.`, { requirementId: requirement.id });
      for (const id of ids) {
        const session = work.get(id);
        if (session.lifecycle === 'retired' || session.status === 'paused' || session.minutesPerOccurrence * session.occurrences === 0) {
          complete = false; gap('support-unavailable', 'supportBindings', `Review the time and availability of ${session.label}.`, { requirementId: requirement.id, workId: id });
        }
        if (teams.get(session.teamId).lifecycle === 'retired') {
          complete = false; gap('support-team-retired', 'supportBindings', `Review the team carrying ${session.label}.`, { requirementId: requirement.id, workId: id, teamId: session.teamId });
        }
      }
      return { requirementId: requirement.id, workIds: ids, complete };
    });
    const selected = row.prerequisites.map(edge => graph.nodes.get(capabilityKey(edge.kind, edge.instanceId)));
    for (const required of definition.prerequisiteDefinitions) if (!selected.some(node => node.kind === required.kind && node.row.definitionId === required.definitionId && node.row.definitionVersion === required.definitionVersion)) {
      gap('prerequisite-needed', 'prerequisites', `Choose a prerequisite for “${getCapabilityDefinition(required.kind, required.definitionId, required.definitionVersion).action}”.`, required);
    }
    for (const edge of row.prerequisites) {
      const key = capabilityKey(edge.kind, edge.instanceId), prerequisite = graph.nodes.get(key).row;
      if (prerequisite.lifecycle === 'retired' || summaries.get(key).support !== 'supported') gap('prerequisite-gap', 'prerequisites', 'Review the current support of this prerequisite.', edge);
    }
    const workIds = capabilityWorkIds(row), minutes = new Map();
    for (const id of workIds) {
      const session = work.get(id);
      for (const personId of session.personIds) {
        if (!minutes.has(personId)) minutes.set(personId, { allocated: 0, additional: 0 });
        minutes.get(personId)[session.funding] += session.minutesPerOccurrence * session.occurrences;
      }
    }
    let allocatedKnownCents = 0, additionalKnownCents = 0, completeMoney = true;
    for (const [personId, usage] of minutes) {
      const person = people.get(personId), allocated = price(usage.allocated, person.rateCentsPerHour), additional = price(usage.additional, person.rateCentsPerHour);
      if (person.lifecycle === 'retired' && usage.allocated + usage.additional > 0) gap('support-person-retired', 'supportBindings', `Review the supporting work assigned to ${person.label}.`, { personId });
      if (allocated === null || additional === null) { completeMoney = false; gap('rate-needed', 'supportBindings', `Set a rate for ${person.label} to complete this amount.`, { personId }); }
      if (allocated !== null) allocatedKnownCents = sum(allocatedKnownCents, allocated);
      if (additional !== null) additionalKnownCents = sum(additionalKnownCents, additional);
      if (capacity.get(personId).remainingMinutes < 0) gap('capacity-exceeded', 'supportBindings', `Review the funded time available to ${person.label}.`, { personId });
    }
    const records = evidence.get(capabilityKey(kind, row.id)) ?? [];
    summaries.set(capabilityKey(kind, row.id), { kind, instanceId: row.id, workIds, sharedWorkIds: workIds.filter(id => users.get(id).size > 1),
      support: gaps.length ? 'proposed' : 'supported', gaps, requirements, evidenceIds: records.map(item => item.id), recordedStage: records.at(-1)?.stage ?? null,
      amounts: { allocatedKnownCents, additionalKnownCents, knownCents: sum(allocatedKnownCents, additionalKnownCents), standing: completeMoney ? 'priced' : 'incomplete' } });
  }
  return Object.fromEntries([['ability', 'abilities'], ['practice', 'practices']].map(([kind, collection]) => [collection, state[collection].map(row => summaries.get(capabilityKey(kind, row.id)))]));
}
export function prepareConnection(candidate, path = 'connection') {
  const raw = record(candidate, 'connection', path);
  const senderTeamId = text(raw.senderTeamId, `${path}.senderTeamId`, true);
  const receiverTeamId = text(raw.receiverTeamId, `${path}.receiverTeamId`, true);
  if (senderTeamId === receiverTeamId) reject('connection-endpoints', path, 'Choose two distinct teams for a directed connection.');
  return { id: text(raw.id, `${path}.id`, true), senderTeamId, receiverTeamId,
    receiverPersonId: nullableId(raw.receiverPersonId, `${path}.receiverPersonId`),
    sharedObject: relationshipText(raw.sharedObject, `${path}.sharedObject`, false),
    responseExpectation: relationshipText(raw.responseExpectation, `${path}.responseExpectation`),
    workIds: identifiers(raw.workIds, LIMITS.work, `${path}.workIds`), status: choice(raw.status, CONNECTION_STATUS, `${path}.status`) };
}
function reference(id, index, path, budget) {
  if (id === null) return;
  if (!index.has(id)) reject('reference', path, 'Reference an existing record.');
  budget.remaining -= 1;
  if (budget.remaining < 0) reject('reference-budget', path, 'Use at most the declared total reference budget.');
}
function relationshipObservations(state, peopleById, teamsById, workById, result) {
  const observations = [];
  const capacityById = new Map(result.capacity.map(row => [row.personId, row]));
  const teamWork = new Map(state.teams.map(row => [row.id, []]));
  for (const row of state.work) teamWork.get(row.teamId).push(row.id);
  for (const [collection, rows] of [['people', state.people], ['teams', state.teams], ['work', state.work]]) {
    for (const row of rows) if (row.lifecycle === 'retired') {
      const commitments = collection === 'people'
        ? { fundedMinutes: row.fundedMinutes, allocatedMinutes: capacityById.get(row.id).allocatedMinutes, additionalMinutes: capacityById.get(row.id).additionalMinutes }
        : collection === 'teams' ? { workIds: teamWork.get(row.id) }
          : { minutesPerParticipant: row.minutesPerOccurrence * row.occurrences, funding: row.funding, personIds: row.personIds };
      observations.push({ code: 'retired-record', collection, id: row.id, commitments });
    }
  }
  const human = (row, collection, field) => {
    const id = row[field];
    if (id === null) observations.push({ code: 'unassigned-human', collection, id: row.id, field });
    else if (peopleById.get(id).lifecycle === 'retired') observations.push({ code: 'retired-human', collection, id: row.id, field, personId: id });
  };
  for (const row of state.contributions) { human(row, 'contributions', 'receiverPersonId'); human(row, 'contributions', 'decisionOwnerPersonId'); }
  for (const row of state.connections) {
    human(row, 'connections', 'receiverPersonId');
    if (row.status === 'paused') observations.push({ code: 'paused-connection', collection: 'connections', id: row.id });
    for (const field of ['senderTeamId', 'receiverTeamId']) if (teamsById.get(row[field]).lifecycle === 'retired') observations.push({ code: 'retired-team', collection: 'connections', id: row.id, field, teamId: row[field] });
  }
  for (const [collection, rows] of [['contributions', state.contributions], ['connections', state.connections]]) {
    for (const row of rows) for (const workId of row.workIds) if (workById.get(workId).lifecycle === 'retired') observations.push({ code: 'retired-supporting-work', collection, id: row.id, workId });
  }
  return observations;
}

function prepareArrangements(candidate, teams, connections, budget) {
  const bindings = (candidate, definitions, kind, field, index, path) => {
    const rows = list(candidate, definitions.length, path), allowed = new Set(definitions.map(row => row.id));
    if (rows.length !== definitions.length) reject('arrangement-slots', path, 'Bind each authored template slot once.');
    const slots = new Map(), targets = new Set();
    for (const [ordinal, value] of rows.entries()) {
      const rowPath = `${path}[${ordinal}]`, row = record(value, kind, rowPath);
      const slotId = text(row.slotId, `${rowPath}.slotId`, true), id = text(row[field], `${rowPath}.${field}`, true);
      if (!allowed.has(slotId)) reject('arrangement-slot', `${rowPath}.slotId`, 'Choose a slot from this exact template.');
      if (slots.has(slotId)) reject('duplicate-slot', rowPath, 'Bind each authored template slot once.');
      if (targets.has(id)) reject('duplicate-binding', rowPath, 'Bind a distinct record to each slot within this arrangement.');
      reference(id, index, `${rowPath}.${field}`, budget);
      slots.set(slotId, { slotId, [field]: id }); targets.add(id);
    }
    return definitions.map(slot => slots.get(slot.id));
  };
  const rows = list(candidate, LIMITS.arrangements, 'plan.arrangements').map((value, index) => {
    const path = `plan.arrangements[${index}]`, row = record(value, 'arrangement', path);
    const template = getCoordinationTemplate(row.templateId, row.templateVersion);
    if (typeof row.templateVersion !== 'string' || !template) reject('arrangement-template', path, 'Use an exact supported arrangement template and version.');
    return { id: text(row.id, `${path}.id`, true), templateId: template.id, templateVersion: template.version,
      teamBindings: bindings(row.teamBindings, template.teams, 'arrangementTeam', 'teamId', teams, `${path}.teamBindings`),
      connectionBindings: bindings(row.connectionBindings, template.connections, 'arrangementConnection', 'connectionId', connections, `${path}.connectionBindings`) };
  });
  indexRecords(rows, 'plan.arrangements');
  return rows;
}

function prepareVersion(candidate, version) {
  const profile = PROFILES.get(version), raw = record(candidate, profile.fields, 'plan');
  for (const key of ['kind', 'schemaVersion', 'modelVersion', 'currency']) {
    const expected = key === 'schemaVersion' ? version : CONTRACT[key];
    if (raw[key] !== expected) reject('unsupported-contract', `plan.${key}`, 'Use this native plan contract; retain other Studio records in their original instrument.');
  }
  const state = {
    kind: CONTRACT.kind, schemaVersion: version, modelVersion: CONTRACT.modelVersion,
    planId: text(raw.planId, 'plan.planId', true), revision: integer(raw.revision, LIMITS.revision, 'plan.revision'),
    currency: CONTRACT.currency, horizonWeeks: integer(raw.horizonWeeks, LIMITS.horizonWeeks, 'plan.horizonWeeks', 1),
    ...(profile.purpose ? { purpose: preparePurpose(raw.purpose, 'plan.purpose') } : {}),
    people: [], teams: [], work: [], practices: [],
  };
  const budget = { remaining: profile.references };
  state.people = list(raw.people, LIMITS.people, 'plan.people')
    .map((value, i) => { const path = `plan.people[${i}]`; return personFields(record(value, profile.score ? 'scorePerson' : profile.relationships ? 'person' : 'legacyPerson', path), path); });
  const peopleById = indexRecords(state.people, 'plan.people');
  state.teams = list(raw.teams, LIMITS.teams, 'plan.teams').map((value, i) => {
    const path = `plan.teams[${i}]`;
    const team = record(value, profile.relationships ? 'team' : 'legacyTeam', path);
    return teamFields(team, references(team.personIds, peopleById, `${path}.personIds`, budget), path);
  });
  const teamsById = indexRecords(state.teams, 'plan.teams');
  const teamMembers = new Map(state.teams.map(team => [team.id, new Set(team.personIds)]));
  state.work = list(raw.work, LIMITS.work, 'plan.work').map((value, i) => {
    const path = `plan.work[${i}]`;
    const hasTiming = value && typeof value === 'object' && Object.hasOwn(value, 'timing');
    const work = version === '0.6.0' && !hasTiming ? { ...record(value, 'untimedWork', path), timing: null }
      : record(value, profile.relationships ? 'work' : 'legacyWork', path);
    if (!profile.score && work.timing !== null) reject('timing-version', `${path}.timing`, 'Use the score schema for authored timing; retain null in this earlier contract.');
    const teamId = text(work.teamId, `${path}.teamId`, true);
    if (!teamsById.has(teamId)) reject('reference', `${path}.teamId`, 'Choose an existing team.');
    const personIds = references(work.personIds, peopleById, `${path}.personIds`, budget, 1);
    return workFields(work, personIds, path);
  });
  const workById = indexRecords(state.work, 'plan.work');
  if (!profile.capabilities) state.practices = list(raw.practices, LIMITS.practices, 'plan.practices').map((value, i) => {
    const path = `plan.practices[${i}]`;
    const practice = record(value, 'practice', path);
    if (!PRACTICE_IDS.has(practice.practiceId)) reject('practice', `${path}.practiceId`, 'Choose a defined practice.');
    const teamId = text(practice.teamId, `${path}.teamId`, true);
    if (!teamsById.has(teamId)) reject('reference', `${path}.teamId`, 'Choose an existing team.');
    return { id: text(practice.id, `${path}.id`, true), practiceId: practice.practiceId, teamId,
      workIds: references(practice.workIds, workById, `${path}.workIds`, budget) };
  });
  indexRecords(state.practices, 'plan.practices');
  if (profile.relationships) {
    // Scalar references join the same current-version budget as ordered lists.
    budget.remaining -= state.work.length + (profile.capabilities ? 0 : state.practices.length);
    if (budget.remaining < 0) reject('reference-budget', 'plan', 'Use at most the declared total reference budget.');
    state.contributions = list(raw.contributions, LIMITS.contributions, 'plan.contributions').map((value, i) => {
      const path = `plan.contributions[${i}]`;
      const row = prepareContribution(value, path);
      reference(row.receiverPersonId, peopleById, `${path}.receiverPersonId`, budget);
      reference(row.decisionOwnerPersonId, peopleById, `${path}.decisionOwnerPersonId`, budget);
      row.workIds = references(row.workIds, workById, `${path}.workIds`, budget);
      return row;
    });
    indexRecords(state.contributions, 'plan.contributions');
    state.connections = list(raw.connections, LIMITS.connections, 'plan.connections').map((value, i) => {
      const path = `plan.connections[${i}]`;
      const row = prepareConnection(value, path);
      reference(row.senderTeamId, teamsById, `${path}.senderTeamId`, budget);
      reference(row.receiverTeamId, teamsById, `${path}.receiverTeamId`, budget);
      reference(row.receiverPersonId, peopleById, `${path}.receiverPersonId`, budget);
      if (row.receiverPersonId !== null && !teamMembers.get(row.receiverTeamId).has(row.receiverPersonId)) reject('team-membership', `${path}.receiverPersonId`, 'Choose a receiving person who belongs to the receiving team.');
      row.workIds = references(row.workIds, workById, `${path}.workIds`, budget);
      return row;
    });
    indexRecords(state.connections, 'plan.connections');
  }
  if (profile.arrangements) state.arrangements = prepareArrangements(raw.arrangements, teamsById,
    new Map(state.connections.map(row => [row.id, row])), budget);
  const graph = profile.capabilities ? prepareCapabilities(raw, state, peopleById, teamsById, workById, budget) : null;
  if (profile.change) {
    state.changeSettings = prepareChangeSettings(raw.changeSettings);
    for (const [mapIndex, mapping] of state.changeSettings.frameworkMaps.entries()) {
      for (const [componentIndex, component] of mapping.components.entries()) {
        const path = `plan.changeSettings.frameworkMaps[${mapIndex}].components[${componentIndex}]`;
        component.workIds = references(component.workIds, workById, `${path}.workIds`, budget);
        for (const [index, edge] of component.capabilityRefs.entries()) reference(capabilityKey(edge.kind, edge.instanceId), graph.nodes, `${path}.capabilityRefs[${index}]`, budget);
      }
    }
  }
  if (profile.assurance) {
    state.assuranceSettings = prepareAssuranceSettings(raw.assuranceSettings);
    prepareAssuranceReferences(state, peopleById, workById, budget);
  }
  if (profile.score) {
    state.scoreSettings = prepareScoreSettings(raw.scoreSettings, 'plan.scoreSettings', !profile.cadence);
    prepareScoreReferences(state, peopleById, teamsById, workById, budget);
  }
  const serialized = JSON.stringify(state);
  const byteLimit = SCHEMA_BYTE_LIMITS[version];
  if (serialized.length > byteLimit || encoder.encode(serialized).byteLength > byteLimit) reject('bytes', 'plan', 'Use a plan within its schema UTF-8 budget.');
  const result = calculate(state, peopleById);
  return freeze({ state, result, serialized,
    ...(profile.relationships ? { observations: relationshipObservations(state, peopleById, teamsById, workById, result) } : {}),
    ...(graph ? { capabilities: capabilitySummaries(state, graph, peopleById, teamsById, workById, result) } : {}),
    ...(profile.change ? { change: projectChange(state.changeSettings) } : {}),
    ...(profile.assurance ? { assurance: projectAssurance(state.assuranceSettings, state) } : {}),
    ...(profile.score ? { score: projectScore(state) } : {}) });
}

function prepareSelectedVersion(candidate, version) {
  const admitted = prepareVersion(candidate, version);
  if (version === CONTRACT.schemaVersion) return admitted;
  // The legacy record, every row/reference, its numeric meaning and its owned
  // bytes are fully admitted before migration. Only this owned state is copied.
  return prepareVersion({ ...admitted.state, schemaVersion: CONTRACT.schemaVersion,
    purpose: admitted.state.purpose ?? emptyPurpose(),
    people: admitted.state.people.map(row => ({ role: emptyRole(), lifecycle: 'active', availability: null, ...row })),
    teams: admitted.state.teams.map(row => ({ lifecycle: 'active', ...row })),
    work: admitted.state.work.map(row => ({ lifecycle: 'active', ...row })),
    contributions: admitted.state.contributions ?? [], connections: admitted.state.connections ?? [],
    practices: PROFILES.get(version).capabilities ? admitted.state.practices
      : admitted.state.practices.map(row => createLegacyPractice(row.id, row.practiceId, row.teamId, row.workIds)),
    abilities: admitted.state.abilities ?? [], capabilityEvidence: admitted.state.capabilityEvidence ?? [],
    changeSettings: admitted.state.changeSettings ?? createChangeSettings(),
    assuranceSettings: admitted.state.assuranceSettings ?? createAssuranceSettings(),
    scoreSettings: prepareScoreSettings(admitted.state.scoreSettings ?? createScoreSettings()),
    arrangements: admitted.state.arrangements ?? [] }, CONTRACT.schemaVersion);
}

export function preparePlan(candidate) { return prepareSelectedVersion(candidate, schemaVersion(candidate)); }

// JSON.parse owns syntax. This linear pass retains numeric spelling admission
// across runtimes, including those without JSON reviver source context.
function admitIntegerTokens(source) {
  for (let cursor = 0; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (character === '"') {
      cursor += 1;
      while (cursor < source.length && source[cursor] !== '"') {
        if (source[cursor] === '\\') cursor += 1;
        cursor += 1;
      }
    } else if (character === '-' || (character >= '0' && character <= '9')) {
      let end = cursor + 1;
      while (end < source.length && NUMBER_CHARACTER.test(source[end])) end += 1;
      if (!INTEGER_TOKEN.test(source.slice(cursor, end))) {
        reject('integer-token', 'import', 'Write numeric fields as whole-number JSON tokens; express fractions and exponents in the declared integer units.');
      }
      cursor = end - 1;
    }
  }
}

export function prepareImport(text) {
  if (typeof text !== 'string' || text.length > LIMITS.bytes) {
    reject('bytes', 'import', 'Supply JSON text within the declared UTF-8 budget.');
  }
  const transportBytes = encoder.encode(text).byteLength;
  if (transportBytes > LIMITS.bytes) reject('bytes', 'import', 'Supply JSON text within the declared UTF-8 budget.');
  let raw;
  try { raw = JSON.parse(text); } catch { reject('json', 'import', 'Supply a complete JSON plan.'); }
  admitIntegerTokens(text);
  const sourceSchemaVersion = schemaVersion(raw);
  if (transportBytes > SCHEMA_BYTE_LIMITS[sourceSchemaVersion]) {
    reject('bytes', 'import', 'Supply JSON text within its source schema UTF-8 budget.');
  }
  return Object.freeze({ projection: prepareSelectedVersion(raw, sourceSchemaVersion), sourceSchemaVersion });
}

export function parsePlan(text) { return prepareImport(text).projection; }

export function createExamplePlan() {
  return {
    kind: CONTRACT.kind, schemaVersion: CONTRACT.schemaVersion, modelVersion: CONTRACT.modelVersion,
    currency: CONTRACT.currency, planId: 'coordination-example', revision: 0, horizonWeeks: 6,
    purpose: emptyPurpose(),
    changeSettings: createChangeSettings(),
    assuranceSettings: createAssuranceSettings(),
    scoreSettings: createScoreSettings(),
    arrangements: [],
    people: ['product-one', 'product-two', 'engineering-one', 'engineering-two'].map(id => ({ id, label: id, fundedMinutes: 0, rateCentsPerHour: 10000, role: emptyRole(), lifecycle: 'active', availability: null })),
    teams: [{ id: 'delivery', label: 'Product and Engineering', personIds: ['product-one', 'product-two', 'engineering-one', 'engineering-two'], lifecycle: 'active' }],
    work: [{ id: 'review', label: 'Weekly working session', teamId: 'delivery', personIds: ['product-one', 'product-two', 'engineering-one', 'engineering-two'], minutesPerOccurrence: 30, occurrences: 6, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active' }],
    contributions: [], connections: [], abilities: [], capabilityEvidence: [],
    practices: [createLegacyPractice('shared-expectations', 'expectation', 'delivery', ['review'])],
  };
}
