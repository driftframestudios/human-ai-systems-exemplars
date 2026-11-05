import { LIMITS } from './config.mjs';
import { PlanError, preparePlan, prepareWork, prepareChangeSettings } from './contract.mjs';
import { getChangeSuggestion } from './change-models.mjs';

const PROPOSALS = new WeakMap();
const FIELDS = Object.freeze({
  request: ['changeSettings', 'workProposal'],
  workProposal: ['frameworkId', 'frameworkVersion', 'componentId', 'source', 'suggestionId', 'work'],
  existing: ['kind', 'workId'],
  new: ['kind', 'work'],
});
const FIELD_SETS = new Map(Object.entries(FIELDS).map(([kind, fields]) => [kind, new Set(fields)]));
const fail = (code, path, message) => { throw new PlanError(code, path, message); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}

function record(candidate, kind, path) {
  const prototype = candidate && typeof candidate === 'object' ? Object.getPrototypeOf(candidate) : undefined;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)
      || (prototype !== Object.prototype && prototype !== null)) fail('record', path, 'Supply a plain Change proposal.');
  const fields = FIELDS[kind], allowed = FIELD_SETS.get(kind), keys = Reflect.ownKeys(candidate);
  if (keys.length !== fields.length || keys.some(key => !allowed.has(key))) fail('fields', path, 'Supply exactly the fields for this proposal.');
  const owned = {};
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, field);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('data-property', `${path}.${field}`, 'Supply an enumerable data value.');
    owned[field] = descriptor.value;
  }
  return owned;
}

function proposedWork(candidate) {
  const descriptor = candidate && typeof candidate === 'object' ? Object.getOwnPropertyDescriptor(candidate, 'kind') : null;
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('data-property', 'change.workProposal.work.kind', 'Choose an existing or new working session.');
  const kind = descriptor.value;
  if (kind !== 'existing' && kind !== 'new') fail('change-work', 'change.workProposal.work.kind', 'Choose an existing or new working session.');
  const raw = record(candidate, kind, 'change.workProposal.work');
  if (raw.kind !== kind) fail('change-work', 'change.workProposal.work.kind', 'Keep the chosen work mode consistent.');
  if (kind === 'existing') {
    if (typeof raw.workId !== 'string' || raw.workId.length > LIMITS.identifier || !/^[a-z][a-z0-9-]*$/.test(raw.workId)) {
      fail('text', 'change.workProposal.work.workId', 'Choose the identifier of an existing working session.');
    }
    return { kind, workId: raw.workId };
  }
  const work = prepareWork(raw.work, 'change.workProposal.work.work');
  return { kind, work: { ...work, lifecycle: work.lifecycle ?? 'active' } };
}

function money(before, after) {
  return { beforeKnownCents: before.knownCommitmentCents, afterKnownCents: after.knownCommitmentCents,
    knownDeltaCents: after.knownCommitmentCents - before.knownCommitmentCents,
    beforeTotalCents: before.plannedCommitmentCents, afterTotalCents: after.plannedCommitmentCents,
    totalDeltaCents: before.plannedCommitmentCents === null || after.plannedCommitmentCents === null
      ? null : after.plannedCommitmentCents - before.plannedCommitmentCents };
}

// The complete Change draft and its explicit session proposal share one candidate
// and one acceptance. Interpretation and references never introduce hidden effort.
export function prepareChangeProposal(base, candidate) {
  const raw = record(candidate, 'request', 'change');
  const changeSettings = prepareChangeSettings(raw.changeSettings, 'change.changeSettings');
  const state = base.state, work = state.work.slice(), newWorkIds = [], reusedWorkIds = [];
  let component = null;
  if (raw.workProposal !== null) {
    const supplied = record(raw.workProposal, 'workProposal', 'change.workProposal');
    const suggestion = getChangeSuggestion(supplied.frameworkId, supplied.frameworkVersion,
      supplied.componentId, supplied.source, supplied.suggestionId);
    if (!suggestion) fail('change-suggestion', 'change.workProposal.suggestionId', 'Choose a listed suggestion within its framework, component and source.');
    const mapping = changeSettings.frameworkMaps.find(row => row.frameworkId === supplied.frameworkId && row.version === supplied.frameworkVersion);
    const target = mapping?.components.find(row => row.componentId === supplied.componentId);
    if (!target) fail('change-component', 'change.workProposal.componentId', 'Retain this component in the complete Change draft.');
    const choice = proposedWork(supplied.work);
    const workId = choice.kind === 'existing' ? choice.workId : choice.work.id;
    const existing = work.find(row => row.id === workId);
    if (choice.kind === 'existing') {
      if (!existing) fail('reference', 'change.workProposal.work.workId', 'Choose an existing working session.');
      reusedWorkIds.push(workId);
    } else if (existing) {
      if (!same(existing, choice.work)) fail('identity-collision', 'change.workProposal.work.work.id', 'Choose a new identifier or keep the existing session unchanged.');
      reusedWorkIds.push(workId);
    } else {
      if (work.length === LIMITS.work) fail('collection', 'plan.work', `Keep this collection within ${LIMITS.work} records.`);
      work.push(choice.work); newWorkIds.push(workId);
    }
    if (!target.workIds.includes(workId)) target.workIds.push(workId);
    target.mapped = true; target.status = 'planned';
    component = { frameworkId: mapping.frameworkId, frameworkVersion: mapping.version, componentId: target.componentId };
  }
  const changed = newWorkIds.length > 0 || !same(changeSettings, state.changeSettings);
  const projection = changed ? preparePlan({ ...state, revision: state.revision + 1, changeSettings, work }) : base;
  const proposal = freeze({ projection, summary: { newWorkIds, reusedWorkIds, component, money: money(base.result, projection.result) } });
  PROPOSALS.set(proposal, base);
  return proposal;
}

export function applyChangeProposal(studio, proposal) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.replace !== 'function') throw new TypeError('Supply the accepted Studio owner.');
  const base = PROPOSALS.get(proposal);
  if (!base) return freeze({ ok: false, error: { code: 'change-proposal', path: 'change', message: 'Preview the Change draft before applying it.' }, projection: studio.read() });
  if (studio.read() !== base) return freeze({ ok: false, error: { code: 'stale-edit', path: 'change', message: 'Preview this change against the current plan.' }, projection: studio.read() });
  return proposal.projection === base ? Object.freeze({ ok: true, projection: base }) : studio.replace(proposal.projection.state, base);
}
