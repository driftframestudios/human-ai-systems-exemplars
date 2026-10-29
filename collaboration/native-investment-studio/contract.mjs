import { CONTRACT, LIMITS, PRACTICES, PURPOSE_FIELDS, SCHEMA_BYTE_LIMITS } from './config.mjs';
import { ROLE_CATALOGUES, ROLE_FIELDS, CHANGE_FRAMEWORKS, CONTRIBUTION_CATEGORIES, emptyRole } from './roles.mjs';

const IDENTIFIER = /^[a-z][a-z0-9-]*$/;
const INTEGER_TOKEN = /^-?(0|[1-9][0-9]*)$/;
const NUMBER_CHARACTER = /[0-9.eE+-]/;
const PRACTICE_IDS = new Set(PRACTICES.map(record => record.id));
const encoder = new TextEncoder();
const FUNDING = Object.freeze(['allocated', 'additional']);
const WORK_STATUS = Object.freeze(['planned', 'paused']);
const LEGACY_SCHEMA = '0.1.0';
const PURPOSE_SCHEMA = '0.2.0';
const LIFECYCLE = Object.freeze(['active', 'retired']);
const CONNECTION_STATUS = Object.freeze(['active', 'paused']);
const ROLE_IDS = new Map(Object.entries(ROLE_CATALOGUES).map(([field, rows]) => [field, new Set(rows.map(row => row.id))]));
const FRAMEWORK_COMPONENTS = new Map(CHANGE_FRAMEWORKS.map(row => [row.id, new Set(row.components.map(component => component.id))]));
const CATEGORY_IDS = new Set(CONTRIBUTION_CATEGORIES.map(row => row.id));
const PLAN_FIELDS = Object.freeze(['kind', 'schemaVersion', 'modelVersion', 'planId', 'revision', 'currency', 'horizonWeeks', 'people', 'teams', 'work', 'practices']);
const FIELDS = Object.freeze({
  plan: [...PLAN_FIELDS, 'purpose', 'contributions', 'connections'],
  purposePlan: [...PLAN_FIELDS, 'purpose'],
  legacyPlan: PLAN_FIELDS,
  purpose: PURPOSE_FIELDS,
  person: ['id', 'label', 'fundedMinutes', 'rateCentsPerHour', 'role', 'lifecycle'],
  legacyPerson: ['id', 'label', 'fundedMinutes', 'rateCentsPerHour'],
  role: ROLE_FIELDS,
  change: ['frameworkId', 'componentId'],
  team: ['id', 'label', 'personIds', 'lifecycle'],
  legacyTeam: ['id', 'label', 'personIds'],
  work: ['id', 'label', 'teamId', 'personIds', 'minutesPerOccurrence', 'occurrences', 'funding', 'status', 'timing', 'lifecycle'],
  legacyWork: ['id', 'label', 'teamId', 'personIds', 'minutesPerOccurrence', 'occurrences', 'funding', 'status', 'timing'],
  contribution: ['id', 'categoryId', 'receiverPersonId', 'decisionOwnerPersonId', 'workIds', 'reviewBoundary', 'decisionBoundary'],
  connection: ['id', 'senderTeamId', 'receiverTeamId', 'receiverPersonId', 'sharedObject', 'responseExpectation', 'workIds', 'status'],
  practice: ['id', 'practiceId', 'teamId', 'workIds'],
});
const FIELD_SETS = new Map(Object.entries(FIELDS).map(([kind, keys]) => [kind, new Set(keys)]));
const VERSION_FIELDS = new Map([[LEGACY_SCHEMA, 'legacyPlan'], [PURPOSE_SCHEMA, 'purposePlan'], [CONTRACT.schemaVersion, 'plan']]);
const COMMAND_FIELDS = Object.freeze({
  'person.create': ['type', 'person'],
  'team.create': ['type', 'team'],
  'work.create': ['type', 'work'],
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
  'person.remove': ['type', 'personId'],
  'team.remove': ['type', 'teamId'],
  'work.remove': ['type', 'workId'],
});
const COMMAND_FIELD_SETS = new Map(Object.entries(COMMAND_FIELDS).map(([kind, keys]) => [kind, new Set(keys)]));
const ORDERED_COLLECTIONS = Object.freeze(['people', 'teams', 'work', 'practices', 'contributions', 'connections']);

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
  if (typeof descriptor.value !== 'string' || !VERSION_FIELDS.has(descriptor.value)) {
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
    timing: 'unscheduled',
  };
}

// Compatibility belongs to the finite command/row API. Versioned plans select
// one exact row shape; current envelopes always carry all current fields.
function editableRecord(candidate, kind, path) {
  const legacy = `legacy${kind[0].toUpperCase()}${kind.slice(1)}`;
  const keys = candidate && typeof candidate === 'object' ? Reflect.ownKeys(candidate) : [];
  return record(candidate, keys.length === FIELDS[legacy].length ? legacy : kind, path);
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
    ...(Object.hasOwn(person, 'role') ? { role: prepareRole(person.role, `${path}.role`) } : {}), ...lifecycleFields(person, path) };
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
  const raw = dataRecord(candidate, COMMAND_FIELDS[type], COMMAND_FIELD_SETS.get(type), path);
  if (raw.type !== type) reject('command', `${path}.type`, 'Keep the admitted command type consistent.');
  switch (type) {
    case 'person.create': return { type, person: preparePerson(raw.person, `${path}.person`) };
    case 'team.create': return { type, team: prepareTeam(raw.team, `${path}.team`) };
    case 'work.create': return { type, work: prepareWork(raw.work, `${path}.work`) };
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
    case 'connection.status.set': return { type, connectionId: text(raw.connectionId, `${path}.connectionId`, true), status: choice(raw.status, CONNECTION_STATUS, `${path}.status`) };
    case 'person.remove': return { type, personId: text(raw.personId, `${path}.personId`, true) };
    case 'team.remove': return { type, teamId: text(raw.teamId, `${path}.teamId`, true) };
    case 'work.remove': return { type, workId: text(raw.workId, `${path}.workId`, true) };
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
  if (work.timing !== null) reject('timing-version', `${path}.timing`, 'Keep timing explicitly unavailable until a scheduling contract is selected.');
  return { id: text(work.id, `${path}.id`, true), label: text(work.label, `${path}.label`),
    teamId: text(work.teamId, `${path}.teamId`, true), personIds,
    minutesPerOccurrence: integer(work.minutesPerOccurrence, LIMITS.minutesPerOccurrence, `${path}.minutesPerOccurrence`),
    occurrences: integer(work.occurrences, LIMITS.occurrences, `${path}.occurrences`),
    funding: choice(work.funding, FUNDING, `${path}.funding`),
    status: choice(work.status, WORK_STATUS, `${path}.status`), timing: null, ...lifecycleFields(work, path) };
}

// Admit one closed row before comparing it with an already accepted work row.
// A changed row receives whole-plan reference, membership and budget checks.
export function prepareWork(candidate, path = 'work') {
  const work = editableRecord(candidate, 'work', path);
  const personIds = identifiers(work.personIds, LIMITS.people, `${path}.personIds`, 1);
  return workFields(work, personIds, path);
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

function prepareVersion(candidate, version) {
  const raw = record(candidate, VERSION_FIELDS.get(version), 'plan');
  const current = version === CONTRACT.schemaVersion;
  for (const key of ['kind', 'schemaVersion', 'modelVersion', 'currency']) {
    const expected = key === 'schemaVersion' ? version : CONTRACT[key];
    if (raw[key] !== expected) reject('unsupported-contract', `plan.${key}`, 'Use this native plan contract; retain other Studio records in their original instrument.');
  }
  const state = {
    kind: CONTRACT.kind, schemaVersion: version, modelVersion: CONTRACT.modelVersion,
    planId: text(raw.planId, 'plan.planId', true), revision: integer(raw.revision, LIMITS.revision, 'plan.revision'),
    currency: CONTRACT.currency, horizonWeeks: integer(raw.horizonWeeks, LIMITS.horizonWeeks, 'plan.horizonWeeks', 1),
    ...(version !== LEGACY_SCHEMA ? { purpose: preparePurpose(raw.purpose, 'plan.purpose') } : {}),
    people: [], teams: [], work: [], practices: [],
  };
  const budget = { remaining: current ? LIMITS.references : 4096 };
  state.people = list(raw.people, LIMITS.people, 'plan.people')
    .map((value, i) => { const path = `plan.people[${i}]`; return personFields(record(value, current ? 'person' : 'legacyPerson', path), path); });
  const peopleById = indexRecords(state.people, 'plan.people');
  state.teams = list(raw.teams, LIMITS.teams, 'plan.teams').map((value, i) => {
    const path = `plan.teams[${i}]`;
    const team = record(value, current ? 'team' : 'legacyTeam', path);
    return teamFields(team, references(team.personIds, peopleById, `${path}.personIds`, budget), path);
  });
  const teamsById = indexRecords(state.teams, 'plan.teams');
  const teamMembers = new Map(state.teams.map(team => [team.id, new Set(team.personIds)]));
  state.work = list(raw.work, LIMITS.work, 'plan.work').map((value, i) => {
    const path = `plan.work[${i}]`;
    const work = record(value, current ? 'work' : 'legacyWork', path);
    const teamId = text(work.teamId, `${path}.teamId`, true);
    if (!teamsById.has(teamId)) reject('reference', `${path}.teamId`, 'Choose an existing team.');
    const personIds = references(work.personIds, peopleById, `${path}.personIds`, budget, 1);
    const members = teamMembers.get(teamId);
    if (personIds.some(id => !members.has(id))) reject('team-membership', `${path}.personIds`, 'Assign participating people to the work-owning team.');
    return workFields(work, personIds, path);
  });
  const workById = indexRecords(state.work, 'plan.work');
  state.practices = list(raw.practices, LIMITS.practices, 'plan.practices').map((value, i) => {
    const path = `plan.practices[${i}]`;
    const practice = record(value, 'practice', path);
    if (!PRACTICE_IDS.has(practice.practiceId)) reject('practice', `${path}.practiceId`, 'Choose a defined practice.');
    const teamId = text(practice.teamId, `${path}.teamId`, true);
    if (!teamsById.has(teamId)) reject('reference', `${path}.teamId`, 'Choose an existing team.');
    return { id: text(practice.id, `${path}.id`, true), practiceId: practice.practiceId, teamId,
      workIds: references(practice.workIds, workById, `${path}.workIds`, budget) };
  });
  indexRecords(state.practices, 'plan.practices');
  if (current) {
    // Scalar references join the same current-version budget as ordered lists.
    budget.remaining -= state.work.length + state.practices.length;
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
  const serialized = JSON.stringify(state);
  const byteLimit = SCHEMA_BYTE_LIMITS[version];
  if (serialized.length > byteLimit || encoder.encode(serialized).byteLength > byteLimit) reject('bytes', 'plan', 'Use a plan within its schema UTF-8 budget.');
  const result = calculate(state, peopleById);
  return freeze({ state, result, serialized,
    ...(current ? { observations: relationshipObservations(state, peopleById, teamsById, workById, result) } : {}) });
}

function prepareSelectedVersion(candidate, version) {
  const admitted = prepareVersion(candidate, version);
  if (version === CONTRACT.schemaVersion) return admitted;
  // The legacy record, every row/reference, its numeric meaning and its owned
  // bytes are fully admitted before migration. Only this owned state is copied.
  return prepareVersion({ ...admitted.state, schemaVersion: CONTRACT.schemaVersion,
    purpose: admitted.state.purpose ?? emptyPurpose(),
    people: admitted.state.people.map(row => ({ ...row, role: emptyRole(), lifecycle: 'active' })),
    teams: admitted.state.teams.map(row => ({ ...row, lifecycle: 'active' })),
    work: admitted.state.work.map(row => ({ ...row, lifecycle: 'active' })),
    contributions: [], connections: [] }, CONTRACT.schemaVersion);
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
    people: ['product-one', 'product-two', 'engineering-one', 'engineering-two'].map(id => ({ id, label: id, fundedMinutes: 0, rateCentsPerHour: 10000, role: emptyRole(), lifecycle: 'active' })),
    teams: [{ id: 'delivery', label: 'Product and Engineering', personIds: ['product-one', 'product-two', 'engineering-one', 'engineering-two'], lifecycle: 'active' }],
    work: [{ id: 'review', label: 'Weekly working session', teamId: 'delivery', personIds: ['product-one', 'product-two', 'engineering-one', 'engineering-two'], minutesPerOccurrence: 30, occurrences: 6, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active' }],
    contributions: [], connections: [],
    practices: [{ id: 'shared-expectations', practiceId: 'expectation', teamId: 'delivery', workIds: ['review'] }],
  };
}
