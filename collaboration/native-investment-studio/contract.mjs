import { CONTRACT, LIMITS, PRACTICES } from './config.mjs';

const IDENTIFIER = /^[a-z][a-z0-9-]*$/;
const INTEGER_TOKEN = /^-?(0|[1-9][0-9]*)$/;
const NUMBER_CHARACTER = /[0-9.eE+-]/;
const PRACTICE_IDS = new Set(PRACTICES.map(record => record.id));
const encoder = new TextEncoder();
const FUNDING = Object.freeze(['allocated', 'additional']);
const WORK_STATUS = Object.freeze(['planned', 'paused']);
const FIELDS = Object.freeze({
  plan: ['kind', 'schemaVersion', 'modelVersion', 'planId', 'revision', 'currency', 'horizonWeeks', 'people', 'teams', 'work', 'practices'],
  person: ['id', 'label', 'fundedMinutes', 'rateCentsPerHour'],
  team: ['id', 'label', 'personIds'],
  work: ['id', 'label', 'teamId', 'personIds', 'minutesPerOccurrence', 'occurrences', 'funding', 'status', 'timing'],
  practice: ['id', 'practiceId', 'teamId', 'workIds'],
});
const FIELD_SETS = new Map(Object.entries(FIELDS).map(([kind, keys]) => [kind, new Set(keys)]));

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
function record(value, kind, path) {
  const prototype = value && typeof value === 'object' ? Object.getPrototypeOf(value) : undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || (prototype !== Object.prototype && prototype !== null)) {
    reject('record', path, 'Supply a plain record with the declared fields.');
  }
  const fields = FIELDS[kind];
  const allowed = FIELD_SETS.get(kind);
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

export function preparePerson(candidate, path = 'person') {
  const person = record(candidate, 'person', path);
  return { id: text(person.id, `${path}.id`, true), label: text(person.label, `${path}.label`),
    fundedMinutes: integer(person.fundedMinutes, LIMITS.fundedMinutes, `${path}.fundedMinutes`),
    rateCentsPerHour: person.rateCentsPerHour === null ? null : integer(person.rateCentsPerHour, LIMITS.rateCentsPerHour, `${path}.rateCentsPerHour`) };
}

function workFields(work, personIds, path) {
  if (work.timing !== null) reject('timing-version', `${path}.timing`, 'Keep timing explicitly unavailable until a scheduling contract is selected.');
  return { id: text(work.id, `${path}.id`, true), label: text(work.label, `${path}.label`),
    teamId: text(work.teamId, `${path}.teamId`, true), personIds,
    minutesPerOccurrence: integer(work.minutesPerOccurrence, LIMITS.minutesPerOccurrence, `${path}.minutesPerOccurrence`),
    occurrences: integer(work.occurrences, LIMITS.occurrences, `${path}.occurrences`),
    funding: choice(work.funding, FUNDING, `${path}.funding`),
    status: choice(work.status, WORK_STATUS, `${path}.status`), timing: null };
}

// Admit one closed row before comparing it with an already accepted work row.
// A changed row receives whole-plan reference, membership and budget checks.
export function prepareWork(candidate, path = 'work') {
  const work = record(candidate, 'work', path);
  const personIds = list(work.personIds, LIMITS.people, `${path}.personIds`);
  if (!personIds.length) reject('reference-count', `${path}.personIds`, 'Supply at least one reference.');
  const seen = new Set();
  for (const id of personIds) {
    text(id, `${path}.personIds`, true);
    if (seen.has(id)) reject('duplicate-reference', `${path}.personIds`, 'Reference each record once within this list.');
    seen.add(id);
  }
  return workFields(work, personIds, path);
}

export function preparePlan(candidate) {
  const raw = record(candidate, 'plan', 'plan');
  for (const key of ['kind', 'schemaVersion', 'modelVersion', 'currency']) {
    if (raw[key] !== CONTRACT[key]) reject('unsupported-contract', `plan.${key}`, 'Use this native plan contract; retain other Studio records in their original instrument.');
  }
  const state = {
    kind: CONTRACT.kind, schemaVersion: CONTRACT.schemaVersion, modelVersion: CONTRACT.modelVersion,
    planId: text(raw.planId, 'plan.planId', true), revision: integer(raw.revision, LIMITS.revision, 'plan.revision'),
    currency: CONTRACT.currency, horizonWeeks: integer(raw.horizonWeeks, LIMITS.horizonWeeks, 'plan.horizonWeeks', 1),
    people: [], teams: [], work: [], practices: [],
  };
  const budget = { remaining: LIMITS.references };
  state.people = list(raw.people, LIMITS.people, 'plan.people')
    .map((value, i) => preparePerson(value, `plan.people[${i}]`));
  const peopleById = indexRecords(state.people, 'plan.people');
  state.teams = list(raw.teams, LIMITS.teams, 'plan.teams').map((value, i) => {
    const path = `plan.teams[${i}]`;
    const team = record(value, 'team', path);
    return { id: text(team.id, `${path}.id`, true), label: text(team.label, `${path}.label`), personIds: references(team.personIds, peopleById, `${path}.personIds`, budget) };
  });
  const teamsById = indexRecords(state.teams, 'plan.teams');
  const teamMembers = new Map(state.teams.map(team => [team.id, new Set(team.personIds)]));
  state.work = list(raw.work, LIMITS.work, 'plan.work').map((value, i) => {
    const path = `plan.work[${i}]`;
    const work = record(value, 'work', path);
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
  const serialized = JSON.stringify(state);
  if (serialized.length > LIMITS.bytes || encoder.encode(serialized).byteLength > LIMITS.bytes) reject('bytes', 'plan', 'Use a plan within the declared UTF-8 budget.');
  return freeze({ state, result: calculate(state, peopleById), serialized });
}

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

export function parsePlan(text) {
  if (typeof text !== 'string' || text.length > LIMITS.bytes || encoder.encode(text).byteLength > LIMITS.bytes) {
    reject('bytes', 'import', 'Supply JSON text within the declared UTF-8 budget.');
  }
  let raw;
  try { raw = JSON.parse(text); } catch { reject('json', 'import', 'Supply a complete JSON plan.'); }
  admitIntegerTokens(text);
  return preparePlan(raw);
}

export function createExamplePlan() {
  return {
    kind: CONTRACT.kind, schemaVersion: CONTRACT.schemaVersion, modelVersion: CONTRACT.modelVersion,
    currency: CONTRACT.currency, planId: 'coordination-example', revision: 0, horizonWeeks: 6,
    people: ['product-one', 'product-two', 'engineering-one', 'engineering-two'].map(id => ({ id, label: id, fundedMinutes: 0, rateCentsPerHour: 10000 })),
    teams: [{ id: 'delivery', label: 'Product and Engineering', personIds: ['product-one', 'product-two', 'engineering-one', 'engineering-two'] }],
    work: [{ id: 'review', label: 'Weekly working session', teamId: 'delivery', personIds: ['product-one', 'product-two', 'engineering-one', 'engineering-two'], minutesPerOccurrence: 30, occurrences: 6, funding: 'additional', status: 'planned', timing: null }],
    practices: [{ id: 'shared-expectations', practiceId: 'expectation', teamId: 'delivery', workIds: ['review'] }],
  };
}
