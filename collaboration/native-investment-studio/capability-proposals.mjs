import { LIMITS } from './config.mjs';
import { PlanError, preparePlan, prepareWork, prepareCapability, prepareCapabilityEvidence } from './contract.mjs';
import { prepareAssembly } from './commands.mjs';

const PROPOSALS = new WeakMap();
const FIELDS = Object.freeze({
  create: Object.freeze(['mode', 'kind', 'instance', 'newWork', 'evidence']),
  update: Object.freeze(['mode', 'kind', 'instance', 'newWork', 'evidence']),
  remove: Object.freeze(['mode', 'kind', 'instanceId']),
});
const FIELD_SETS = new Map(Object.entries(FIELDS).map(([mode, fields]) => [mode, new Set(fields)]));
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const sameRow = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const fail = (code, path, message) => { throw new PlanError(code, path, message); };

function request(candidate) {
  const prototype = candidate && typeof candidate === 'object' ? Object.getPrototypeOf(candidate) : undefined;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)
      || (prototype !== Object.prototype && prototype !== null)) fail('record', 'capability', 'Supply a plain capability proposal.');
  const descriptor = Object.getOwnPropertyDescriptor(candidate, 'mode');
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('data-property', 'capability.mode', 'Supply an enumerable proposal mode.');
  const mode = descriptor.value;
  if (typeof mode !== 'string' || !FIELD_SETS.has(mode)) fail('capability-mode', 'capability.mode', 'Choose create, update or remove.');
  const fields = FIELDS[mode], allowed = FIELD_SETS.get(mode), keys = Reflect.ownKeys(candidate);
  if (keys.length !== fields.length || keys.some(key => !allowed.has(key))) fail('fields', 'capability', 'Supply exactly the fields for this proposal.');
  const owned = {};
  for (const field of fields) {
    const value = Object.getOwnPropertyDescriptor(candidate, field);
    if (!value?.enumerable || !Object.hasOwn(value, 'value')) fail('data-property', `capability.${field}`, 'Supply an enumerable data value.');
    owned[field] = value.value;
  }
  if (owned.mode !== mode) fail('capability-mode', 'capability.mode', 'Keep the proposal mode consistent while preparing it.');
  if (owned.kind !== 'ability' && owned.kind !== 'practice') fail('capability-kind', 'capability.kind', 'Choose a customer ability or team practice.');
  return owned;
}

function rows(candidate, limit, admit, path) {
  if (!Array.isArray(candidate) || Object.getPrototypeOf(candidate) !== Array.prototype) fail('collection', path, 'Supply a bounded ordered list.');
  const length = Object.getOwnPropertyDescriptor(candidate, 'length')?.value;
  if (!Number.isSafeInteger(length) || length < 0 || length > limit || Reflect.ownKeys(candidate).length !== length + 1) fail('collection', path, `Supply at most ${limit} entries in a dense array.`);
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

function include(original, supplied, limit, path) {
  const result = original.slice(), index = new Map(original.map(row => [row.id, row])), added = [];
  for (const row of supplied) {
    const existing = index.get(row.id);
    if (existing) {
      if (!sameRow(existing, row)) fail('identity-collision', `${path}.${row.id}`, 'Choose a new identifier or keep the existing record unchanged.');
      continue;
    }
    if (result.length === limit) fail('collection', path, `Keep this collection within ${limit} records.`);
    result.push(row); index.set(row.id, row); added.push(row.id);
  }
  return { rows: result, added };
}

function money(before, after) {
  return { beforeKnownCents: before.knownCommitmentCents, afterKnownCents: after.knownCommitmentCents,
    knownDeltaCents: after.knownCommitmentCents - before.knownCommitmentCents,
    beforeTotalCents: before.plannedCommitmentCents, afterTotalCents: after.plannedCommitmentCents,
    totalDeltaCents: before.plannedCommitmentCents === null || after.plannedCommitmentCents === null
      ? null : after.plannedCommitmentCents - before.plannedCommitmentCents };
}

// A proposal owns the complete candidate while the Studio retains acceptance,
// history and final freshness. Referenced work keeps its independent cost owner.
export function prepareCapabilityProposal(base, candidate) {
  const raw = request(candidate), state = base.state;
  let projection, instanceId, newWorkIds = [], newEvidenceIds = [];
  if (raw.mode === 'remove') {
    const result = prepareAssembly(base, { type: 'capability.remove', kind: raw.kind, instanceId: raw.instanceId });
    if (result.error) {
      const { code, path, message, references } = result.error;
      const error = new PlanError(code, path, message);
      error.references = references;
      throw error;
    }
    projection = result.projection; instanceId = raw.instanceId;
  } else {
    const instance = prepareCapability(raw.instance, raw.kind, 'capability.instance');
    instanceId = instance.id;
    const suppliedWork = rows(raw.newWork, LIMITS.work, (value, path) => {
      const prepared = prepareWork(value, path);
      return { ...prepared, lifecycle: prepared.lifecycle ?? 'active' };
    }, 'capability.newWork');
    const suppliedEvidence = rows(raw.evidence, LIMITS.capabilityEvidence, prepareCapabilityEvidence, 'capability.evidence');
    const collection = raw.kind === 'ability' ? 'abilities' : 'practices';
    const instances = state[collection].slice(), position = instances.findIndex(row => row.id === instance.id);
    let instanceChanged = true;
    if (position >= 0) {
      if (raw.mode === 'update' && (instance.definitionId !== instances[position].definitionId || instance.definitionVersion !== instances[position].definitionVersion)) {
        fail('capability-definition-change', 'capability.instance.definitionId', 'Install the other definition as a new instance so recorded observations keep their original subject.');
      }
      instanceChanged = !sameRow(instances[position], instance);
      if (raw.mode === 'create' && instanceChanged) fail('identity-collision', 'capability.instance.id', 'Choose a new identifier or edit the existing ability or practice.');
      instances[position] = instance;
    } else {
      if (raw.mode === 'update') fail('reference', 'capability.instance.id', 'Choose an existing ability or practice to edit.');
      if (instances.length === LIMITS[collection]) fail('collection', `plan.${collection}`, `Keep this collection within ${LIMITS[collection]} records.`);
      instances.push(instance);
    }
    const work = include(state.work, suppliedWork, LIMITS.work, 'capability.newWork');
    const evidence = include(state.capabilityEvidence, suppliedEvidence, LIMITS.capabilityEvidence, 'capability.evidence');
    newWorkIds = work.added; newEvidenceIds = evidence.added;
    const changed = instanceChanged || newWorkIds.length || newEvidenceIds.length;
    projection = changed ? preparePlan({ ...state, revision: state.revision + 1,
      [collection]: instances, work: work.rows, capabilityEvidence: evidence.rows }) : base;
  }
  const proposal = freeze({ mode: raw.mode, kind: raw.kind, instanceId, projection,
    summary: { newWorkIds, newEvidenceIds, money: money(base.result, projection.result) } });
  PROPOSALS.set(proposal, base);
  return proposal;
}

export function applyCapabilityProposal(studio, proposal) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.replace !== 'function') throw new TypeError('Supply the accepted Studio owner.');
  const base = PROPOSALS.get(proposal);
  if (!base) return freeze({ ok: false, error: { code: 'capability-proposal', path: 'capability', message: 'Preview an ability or practice before applying it.' }, projection: studio.read() });
  if (studio.read() !== base) return freeze({ ok: false, error: { code: 'stale-edit', path: 'capability', message: 'Preview this change against the current plan.' }, projection: studio.read() });
  return proposal.projection === base ? Object.freeze({ ok: true, projection: base }) : studio.replace(proposal.projection.state, base);
}
