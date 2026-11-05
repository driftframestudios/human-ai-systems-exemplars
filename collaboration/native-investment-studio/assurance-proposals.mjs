import { LIMITS } from './config.mjs';
import { PlanError, preparePlan, prepareWork, prepareConnection, prepareAssuranceSettings } from './contract.mjs';

const PROPOSALS = new WeakMap();
const FIELDS = Object.freeze(['assuranceSettings', 'newWork', 'workUpdates', 'connectionUpdates']);
const FIELD_SET = new Set(FIELDS);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const fail = (code, path, message) => { throw new PlanError(code, path, message); };
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}

function request(candidate) {
  const prototype = candidate && typeof candidate === 'object' ? Object.getPrototypeOf(candidate) : undefined;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)
      || (prototype !== Object.prototype && prototype !== null)) fail('record', 'assurance', 'Supply a plain assurance proposal.');
  const keys = Reflect.ownKeys(candidate);
  if (keys.length !== FIELDS.length || keys.some(key => !FIELD_SET.has(key))) fail('fields', 'assurance', 'Supply exactly the fields for this proposal.');
  const owned = {};
  for (const field of FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, field);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('data-property', `assurance.${field}`, 'Supply an enumerable data value.');
    owned[field] = descriptor.value;
  }
  return owned;
}

function rows(candidate, limit, admit, path) {
  if (!Array.isArray(candidate) || Object.getPrototypeOf(candidate) !== Array.prototype) fail('collection', path, 'Supply a bounded ordered list.');
  const length = Object.getOwnPropertyDescriptor(candidate, 'length')?.value;
  if (!Number.isSafeInteger(length) || length < 0 || length > limit || Reflect.ownKeys(candidate).length !== length + 1) {
    fail('collection', path, `Supply at most ${limit} records in a dense array.`);
  }
  const owned = [], seen = new Set();
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('data-property', `${path}[${index}]`, 'Supply an enumerable array value.');
    const row = admit(descriptor.value, `${path}[${index}]`);
    if (seen.has(row.id)) fail('duplicate-id', `${path}[${index}].id`, 'Supply each proposed record once.');
    seen.add(row.id); owned.push(row);
  }
  return owned;
}

function canonicalWork(candidate, path) {
  const row = prepareWork(candidate, path);
  if (row.lifecycle === undefined) fail('fields', path, 'Supply the complete working-session record, including its lifecycle.');
  return row;
}

function updates(original, supplied, path) {
  const result = original.slice(), positions = new Map(original.map((row, index) => [row.id, index])), changed = [];
  for (const row of supplied) {
    const index = positions.get(row.id);
    if (index === undefined) fail('reference', `${path}.${row.id}`, 'Choose an existing record to update.');
    if (same(original[index], row)) continue;
    result[index] = row; changed.push(row.id);
  }
  return { rows: result, changed };
}

function quantities(row) {
  return row === null ? null : { minutesPerOccurrence: row.minutesPerOccurrence, occurrences: row.occurrences,
    participantCount: row.personIds.length, personMinutes: row.minutesPerOccurrence * row.occurrences * row.personIds.length,
    funding: row.funding, status: row.status, lifecycle: row.lifecycle };
}

function money(before, after) {
  return { beforeKnownCents: before.knownCommitmentCents, afterKnownCents: after.knownCommitmentCents,
    knownDeltaCents: after.knownCommitmentCents - before.knownCommitmentCents,
    beforeTotalCents: before.plannedCommitmentCents, afterTotalCents: after.plannedCommitmentCents,
    totalDeltaCents: before.plannedCommitmentCents === null || after.plannedCommitmentCents === null
      ? null : after.plannedCommitmentCents - before.plannedCommitmentCents };
}

// Each proposal carries explicit canonical work quantities. Reference estimates
// supply context; only accepted work and person funding enter native commitment.
export function prepareAssuranceProposal(base, candidate) {
  const raw = request(candidate), state = base.state;
  const assuranceSettings = prepareAssuranceSettings(raw.assuranceSettings, 'assurance.assuranceSettings');
  const previousRehearsals = new Map(state.assuranceSettings.rehearsals.map(row => [row.id, row]));
  for (const row of assuranceSettings.rehearsals) {
    const existing = previousRehearsals.get(row.id);
    if (existing && (existing.definitionId !== row.definitionId || existing.definitionVersion !== row.definitionVersion)) {
      fail('rehearsal-definition-change', 'assurance.assuranceSettings.rehearsals', 'Use a new rehearsal identifier for another scenario so observations retain their original subject.');
    }
  }
  const suppliedWork = rows(raw.newWork, LIMITS.work, canonicalWork, 'assurance.newWork');
  const workUpdates = rows(raw.workUpdates, LIMITS.work, canonicalWork, 'assurance.workUpdates');
  const connectionUpdates = rows(raw.connectionUpdates, LIMITS.connections, prepareConnection, 'assurance.connectionUpdates');
  const proposedIds = new Set(suppliedWork.map(row => row.id));
  for (const row of workUpdates) if (proposedIds.has(row.id)) fail('proposal-work-overlap', 'assurance.workUpdates', 'Supply each working session as either new work or an update.');
  const work = updates(state.work, workUpdates, 'assurance.workUpdates');
  const connections = updates(state.connections, connectionUpdates, 'assurance.connectionUpdates');
  const existingById = new Map(state.work.map(row => [row.id, row])), newWorkIds = [], reusedWorkIds = [];
  for (const row of suppliedWork) {
    const existing = existingById.get(row.id);
    if (existing) {
      if (!same(existing, row)) fail('identity-collision', `assurance.newWork.${row.id}`, 'Choose a new identifier or keep the existing session unchanged.');
      reusedWorkIds.push(row.id); continue;
    }
    if (work.rows.length === LIMITS.work) fail('collection', 'plan.work', `Keep this collection within ${LIMITS.work} records.`);
    work.rows.push(row); newWorkIds.push(row.id);
  }
  const changed = newWorkIds.length || work.changed.length || connections.changed.length || !same(assuranceSettings, state.assuranceSettings);
  const projection = changed ? preparePlan({ ...state, revision: state.revision + 1,
    assuranceSettings, work: work.rows, connections: connections.rows }) : base;
  const nextById = new Map(projection.state.work.map(row => [row.id, row]));
  const inspectedIds = [...suppliedWork.map(row => row.id), ...workUpdates.map(row => row.id)];
  const proposal = freeze({ projection, summary: { newWorkIds, reusedWorkIds,
    updatedWorkIds: work.changed, updatedConnectionIds: connections.changed,
    money: money(base.result, projection.result),
    work: inspectedIds.map(workId => ({ workId, before: quantities(existingById.get(workId) ?? null), after: quantities(nextById.get(workId)) })) } });
  PROPOSALS.set(proposal, base);
  return proposal;
}

export function applyAssuranceProposal(studio, proposal) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.replace !== 'function') throw new TypeError('Supply the accepted Studio owner.');
  const base = PROPOSALS.get(proposal);
  if (!base) return freeze({ ok: false, error: { code: 'assurance-proposal', path: 'assurance', message: 'Preview the quality, recovery or rehearsal draft before applying it.' }, projection: studio.read() });
  if (studio.read() !== base) return freeze({ ok: false, error: { code: 'stale-edit', path: 'assurance', message: 'Preview this change against the current plan.' }, projection: studio.read() });
  return proposal.projection === base ? Object.freeze({ ok: true, projection: base }) : studio.replace(proposal.projection.state, base);
}
