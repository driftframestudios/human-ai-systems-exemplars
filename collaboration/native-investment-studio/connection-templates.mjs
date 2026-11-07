import { LIMITS } from './config.mjs';
import { PlanError, preparePlan, prepareTeam, prepareWork, prepareConnection } from './contract.mjs';
import { getCoordinationTemplate } from './coordination-arrangements.mjs';
import { recordReferences } from './commands.mjs';
export { listCoordinationTemplates } from './coordination-arrangements.mjs';
const IDENTIFIER = /^[a-z][a-z0-9-]*$/;
const PROPOSALS = new WeakMap();
const FIELDS = Object.freeze({
  request: ['templateId', 'version', 'proposalId', 'teams', 'connections'],
  existing: ['slotId', 'kind', 'teamId', 'addPersonIds'],
  new: ['slotId', 'kind', 'label', 'personIds'],
  connection: ['slotId', 'receiverPersonId', 'sharedObject', 'responseExpectation', 'workIds', 'status', 'recoveryWork'],
  recovery: ['label', 'teamId', 'personIds', 'minutesPerOccurrence', 'occurrences', 'funding', 'status', 'timing', 'lifecycle'],
});
const FIELD_SETS = new Map(Object.entries(FIELDS).map(([kind, fields]) => [kind, new Set(fields)]));
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
function fail(code, path, message) { throw new PlanError(code, path, message); }
function record(value, kind, path) {
  const prototype = value && typeof value === 'object' ? Object.getPrototypeOf(value) : undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || (prototype !== Object.prototype && prototype !== null)) fail('record', path, 'Supply a plain record.');
  const fields = FIELDS[kind], allowed = FIELD_SETS.get(kind), keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(key => !allowed.has(key))) fail('fields', path, 'Supply exactly the fields for this template entry.');
  const owned = {};
  for (const key of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('data-property', `${path}.${key}`, 'Supply an enumerable data value.');
    owned[key] = descriptor.value;
  }
  return owned;
}
function list(value, limit, path) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail('collection', path, `Supply a dense array with at most ${limit} entries.`);
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value;
  if (!Number.isSafeInteger(length) || length < 0 || length > limit || Reflect.ownKeys(value).length !== length + 1) fail('collection', path, `Supply a dense array with at most ${limit} entries.`);
  const owned = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('data-property', `${path}[${index}]`, 'Supply an enumerable array value.');
    owned.push(descriptor.value);
  }
  return owned;
}
function identifier(value, path) {
  if (typeof value !== 'string' || value.length > LIMITS.identifier || !IDENTIFIER.test(value)) fail('text', path, 'Use a lowercase identifier of at most 64 letters, digits or hyphens.');
  return value;
}
function ids(value, limit, index, path) {
  const owned = list(value, limit, path), seen = new Set();
  for (const id of owned) {
    identifier(id, path);
    if (seen.has(id)) fail('duplicate-reference', path, 'Choose each record once.');
    if (!index.has(id)) fail('reference', path, 'Choose an existing record.');
    seen.add(id);
  }
  return owned;
}
function teamBinding(candidate, path) {
  const descriptor = candidate && typeof candidate === 'object' ? Object.getOwnPropertyDescriptor(candidate, 'kind') : null;
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) fail('data-property', `${path}.kind`, 'Choose an existing or new group.');
  const kind = descriptor.value;
  if (kind !== 'existing' && kind !== 'new') fail('template-binding', `${path}.kind`, 'Choose an existing or new group.');
  const owned = record(candidate, kind, path);
  if (owned.kind !== kind) fail('template-binding', `${path}.kind`, 'Keep the group binding consistent while preparing it.');
  return owned;
}
function slots(candidate, definitions, admit, path) {
  const entries = list(candidate, definitions.length, path), allowed = new Set(definitions.map(row => row.id)), result = new Map();
  if (entries.length !== definitions.length) fail('template-slots', path, 'Supply one entry for each template slot.');
  entries.forEach((entry, index) => {
    const row = admit(entry, `${path}[${index}]`);
    if (typeof row.slotId !== 'string' || !allowed.has(row.slotId)) fail('template-slot', `${path}[${index}].slotId`, 'Choose a listed template slot.');
    if (result.has(row.slotId)) fail('duplicate-slot', path, 'Supply each template slot once.');
    result.set(row.slotId, row);
  });
  return result;
}
const sameRow = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const indexRows = rows => new Map(rows.map(row => [row.id, row]));
function include(rows, index, row, added, path, limit) {
  const existing = index.get(row.id);
  if (existing) {
    if (!sameRow(existing, row)) fail('identity-collision', path, 'Choose a new proposal identifier or keep the matching record unchanged.');
    return existing;
  }
  if (rows.length === limit) fail('collection', path, `Keep this collection within ${limit} records.`);
  rows.push(row); index.set(row.id, row); added.push(row.id); return row;
}
function money(before, after) {
  return { beforeKnownCents: before.knownCommitmentCents, afterKnownCents: after.knownCommitmentCents,
    knownDeltaCents: after.knownCommitmentCents - before.knownCommitmentCents,
    beforeTotalCents: before.plannedCommitmentCents, afterTotalCents: after.plannedCommitmentCents,
    totalDeltaCents: before.plannedCommitmentCents === null || after.plannedCommitmentCents === null
      ? null : after.plannedCommitmentCents - before.plannedCommitmentCents };
}

// The caller supplies an immutable projection from the accepted state owner.
// Admission owns the request; one final plan preparation owns every new row,
// reference, calculation and serialized byte before a proposal can be applied.
function admitTemplate(candidate) {
  const raw = record(candidate, 'request', 'template');
  const template = typeof raw.templateId === 'string' ? getCoordinationTemplate(raw.templateId) : null;
  if (!template) fail('template', 'template.templateId', 'Choose a listed coordination template.');
  if (raw.version !== template.version) fail('template-version', 'template.version', 'Use the listed template version.');
  const proposalId = identifier(raw.proposalId, 'template.proposalId');
  const teamInputs = slots(raw.teams, template.teams, teamBinding, 'template.teams');
  const edgeInputs = slots(raw.connections, template.connections, (row, path) => record(row, 'connection', path), 'template.connections');
  return { template, proposalId, teamInputs, edgeInputs };
}

function prepareTemplate(base, admitted, replacement = null) {
  const { template, proposalId, teamInputs, edgeInputs } = admitted;
  const state = base.state, people = indexRows(state.people);
  const teams = state.teams.slice(), teamIndex = indexRows(teams), teamPositions = new Map(teams.map((row, index) => [row.id, index]));
  const work = state.work.slice(), workIndex = indexRows(work), originalWork = indexRows(state.work);
  const connections = state.connections.slice(), connectionIndex = indexRows(connections);
  const arrangements = state.arrangements.slice(), arrangementIndex = indexRows(arrangements);
  const bindings = new Map(), boundTeams = new Set();
  const summary = { newTeamIds: [], memberships: [], newConnectionIds: [], newRecoveryWorkIds: [], newArrangementIds: [] };
  const generated = (kind, slot) => replacement?.identities.get(`${kind}:${slot}`)
    ?? identifier(`${proposalId}-${kind}-${slot}`, 'template.proposalId');
  const aliases = new Map();
  function includeGenerated(rows, index, row, added, path, limit) {
    const existing = index.get(row.id);
    if (replacement && existing && !sameRow(existing, row)) {
      if (!replacement.preserveShared) fail('retained-record-choice', path,
        'This record also supports other work. Keep it and use a separate record for this arrangement.');
      const stem = replacement.stems.get(row.id) ?? row.id.replace(/-copy-[1-9]\d*$/, '');
      let suffix = 1;
      while (index.has(`${stem}-copy-${suffix}`)) suffix += 1;
      row = { ...row, id: identifier(`${stem}-copy-${suffix}`, 'template.proposalId') };
    }
    return include(rows, index, row, added, path, limit);
  }
  for (const slot of template.teams) {
    const input = teamInputs.get(slot.id), path = `template.teams.${slot.id}`;
    let team;
    if (input.kind === 'new') {
      team = prepareTeam({ id: generated('team', slot.id), label: input.label,
        personIds: ids(input.personIds, LIMITS.people, people, `${path}.personIds`),
        lifecycle: replacement?.teamLifecycle.get(generated('team', slot.id)) ?? 'active' }, path);
      const requestedId = team.id;
      team = includeGenerated(teams, teamIndex, team, summary.newTeamIds, path, LIMITS.teams);
      aliases.set(requestedId, team.id);
      aliases.set(`${proposalId}-team-${slot.id}`, team.id);
    } else {
      const teamId = identifier(input.teamId, `${path}.teamId`);
      team = teamIndex.get(teamId);
      // An existing binding always refers to the starting plan.
      if (!teamPositions.has(teamId)) fail('reference', `${path}.teamId`, 'Choose a group already in the plan.');
      const additions = ids(input.addPersonIds, LIMITS.people, people, `${path}.addPersonIds`), members = new Set(team.personIds);
      const added = additions.filter(id => !members.has(id));
      if (added.length) {
        team = prepareTeam({ ...team, personIds: [...team.personIds, ...added] }, path);
        teams[teamPositions.get(teamId)] = team; teamIndex.set(teamId, team);
        summary.memberships.push({ teamId, addedPersonIds: added });
      }
    }
    if (boundTeams.has(team.id)) fail('duplicate-binding', path, 'Choose a distinct group for each template slot.');
    boundTeams.add(team.id); bindings.set(slot.id, team.id);
  }
  for (const slot of template.connections) {
    const input = edgeInputs.get(slot.id), path = `template.connections.${slot.id}`;
    const workIds = ids(input.workIds, LIMITS.work, originalWork, `${path}.workIds`);
    if (input.recoveryWork !== null) {
      const recovery = record(input.recoveryWork, 'recovery', `${path}.recoveryWork`);
      const row = prepareWork({ id: generated('recovery', slot.id), ...recovery,
        teamId: aliases.get(recovery.teamId) ?? recovery.teamId }, `${path}.recoveryWork`);
      const accepted = includeGenerated(work, workIndex, row, summary.newRecoveryWorkIds, `${path}.recoveryWork`, LIMITS.work);
      workIds.push(accepted.id);
    }
    const row = prepareConnection({ id: generated('connection', slot.id), senderTeamId: bindings.get(slot.senderSlotId),
      receiverTeamId: bindings.get(slot.receiverSlotId), receiverPersonId: input.receiverPersonId,
      sharedObject: input.sharedObject, responseExpectation: input.responseExpectation, workIds, status: input.status }, path);
    const accepted = includeGenerated(connections, connectionIndex, row, summary.newConnectionIds, path, LIMITS.connections);
    aliases.set(row.id, accepted.id);
  }
  include(arrangements, arrangementIndex, { id: proposalId, templateId: template.id, templateVersion: template.version,
    teamBindings: template.teams.map(slot => ({ slotId: slot.id, teamId: bindings.get(slot.id) })),
    connectionBindings: template.connections.map(slot => ({ slotId: slot.id, connectionId: aliases.get(generated('connection', slot.id)) ?? generated('connection', slot.id) })) },
    summary.newArrangementIds, 'template.proposalId', LIMITS.arrangements);
  const changed = summary.newArrangementIds.length || summary.newTeamIds.length || summary.memberships.length || summary.newConnectionIds.length || summary.newRecoveryWorkIds.length;
  // Even an identical proposal admits all supplied fields before retaining the
  // accepted projection. This also preserves no-op behavior at the revision cap.
  const projection = changed ? preparePlan({ ...state, revision: state.revision + (replacement ? 0 : 1), teams, work, connections, arrangements }) : base;
  const proposal = freeze({ template, proposalId, projection, summary: { ...summary, money: money(base.result, projection.result) } });
  PROPOSALS.set(proposal, base);
  return proposal;
}


export function prepareCoordinationTemplate(base, candidate) {
  return prepareTemplate(base, admitTemplate(candidate));
}

// Recorded bindings and their bounded generated identity establish ownership.
// Similar-looking imported IDs outside this exact pattern retain their records.
export function isGeneratedArrangementRecord(arrangementId, kind, slotId, recordId) {
  const stem = `${arrangementId}-${kind}-${slotId}`;
  return recordId === stem || (recordId.startsWith(`${stem}-copy-`) && /^[1-9]\d*$/.test(recordId.slice(stem.length + 6)));
}

function replacementScope(state, arrangement, admitted) {
  const owned = { teams: new Set(), connections: new Set(), work: new Set() }, identities = new Map(), stems = new Map(), teamLifecycle = new Map();
  const connections = indexRows(state.connections), teams = indexRows(state.teams);
  const teamBindings = new Map(arrangement.teamBindings.map(row => [row.slotId, row.teamId]));
  const currentTemplate = getCoordinationTemplate(arrangement.templateId, arrangement.templateVersion);
  const connectionSlots = new Map(currentTemplate.connections.map(row => [row.id, row]));
  for (const binding of arrangement.teamBindings) {
    if (isGeneratedArrangementRecord(arrangement.id, 'team', binding.slotId, binding.teamId)) {
      owned.teams.add(binding.teamId);
      if (arrangement.templateId === admitted.template.id) {
        identities.set(`team:${binding.slotId}`, binding.teamId);
        stems.set(binding.teamId, `${arrangement.id}-team-${binding.slotId}`);
        teamLifecycle.set(binding.teamId, teams.get(binding.teamId).lifecycle);
      }
    }
  }
  for (const binding of arrangement.connectionBindings) {
    if (isGeneratedArrangementRecord(arrangement.id, 'connection', binding.slotId, binding.connectionId)) {
      owned.connections.add(binding.connectionId);
    }
    const connection = connections.get(binding.connectionId), slot = connectionSlots.get(binding.slotId);
    if (connection.senderTeamId !== teamBindings.get(slot.senderSlotId)
        || connection.receiverTeamId !== teamBindings.get(slot.receiverSlotId)) owned.connections.delete(binding.connectionId);
    if (arrangement.templateId === admitted.template.id) {
      identities.set(`connection:${binding.slotId}`, binding.connectionId);
      stems.set(binding.connectionId, `${arrangement.id}-connection-${binding.slotId}`);
    }
    for (const id of connections.get(binding.connectionId).workIds) {
      if (isGeneratedArrangementRecord(arrangement.id, 'recovery', binding.slotId, id)) {
        owned.work.add(id);
        if (arrangement.templateId === admitted.template.id) {
          identities.set(`recovery:${binding.slotId}`, id);
          stems.set(id, `${arrangement.id}-recovery-${binding.slotId}`);
        }
      }
    }
  }
  const initial = Object.fromEntries(Object.entries(owned).map(([key, ids]) => [key, new Set(ids)]));
  // Explicit reuse and authored placement keep a row outside replacement ownership.
  for (const input of admitted.teamInputs.values()) if (input.kind === 'existing') owned.teams.delete(input.teamId);
  for (const input of admitted.edgeInputs.values()) {
    for (const id of list(input.workIds, LIMITS.work, `template.connections.${input.slotId}.workIds`)) owned.work.delete(id);
    if (input.recoveryWork !== null) {
      const recovery = record(input.recoveryWork, 'recovery', `template.connections.${input.slotId}.recoveryWork`);
      const generatedTeam = [...identities].some(([key, id]) => key.startsWith('team:') && id === recovery.teamId);
      if (!generatedTeam) owned.teams.delete(recovery.teamId);
    }
  }
  for (const row of state.work) if (row.timing !== null || row.lifecycle === 'retired') owned.work.delete(row.id);
  for (const row of state.scoreSettings.cadence?.placements ?? []) owned.work.delete(row.workId);
  const remaining = { ...state, arrangements: state.arrangements.filter(row => row.id !== arrangement.id) };
  let changed;
  do {
    changed = false;
    for (const [collection, ids] of Object.entries(owned)) for (const id of ids) {
      if (recordReferences(remaining, collection, id).some(reference => !owned[reference.collection]?.has(reference.id))) {
        ids.delete(id); changed = true;
      }
    }
  } while (changed);
  const retainedRecords = Object.entries(initial).flatMap(([collection, ids]) => [...ids]
    .filter(id => !owned[collection].has(id)).map(id => ({ collection, id })));
  return { owned, identities, retainedRecords, stems, teamLifecycle };
}

function preserveRecordOrder(before, after) {
  const remaining = indexRows(after), ordered = [];
  for (const row of before) if (remaining.has(row.id)) { ordered.push(remaining.get(row.id)); remaining.delete(row.id); }
  return [...ordered, ...remaining.values()];
}

// The replacement stays one accepted transaction. Shared rows remain available;
// a changed shared identity receives an explicit choice before a separate copy.
export function prepareCoordinationReplacement(base, candidate, { preserveShared = false } = {}) {
  const admitted = admitTemplate(candidate), state = base.state;
  const arrangement = state.arrangements.find(row => row.id === admitted.proposalId);
  if (!arrangement) return prepareTemplate(base, admitted);
  const { owned, identities, retainedRecords, stems, teamLifecycle } = replacementScope(state, arrangement, admitted);
  const stripped = { ...state, arrangements: state.arrangements.filter(row => row.id !== arrangement.id) };
  for (const [collection, ids] of Object.entries(owned)) stripped[collection] = state[collection].filter(row => !ids.has(row.id));
  const prepared = prepareTemplate({ ...base, state: stripped }, admitted, { identities, preserveShared, stems, teamLifecycle });
  const nextState = { ...prepared.projection.state };
  for (const collection of ['teams', 'work', 'connections', 'arrangements']) {
    nextState[collection] = preserveRecordOrder(state[collection], nextState[collection]);
  }
  nextState.revision = state.revision;
  const projection = sameRow(state, nextState) ? base : preparePlan({ ...nextState, revision: state.revision + 1 });
  const proposal = freeze({ ...prepared, projection, summary: { ...prepared.summary, retainedRecords,
    money: money(base.result, projection.result) } });
  PROPOSALS.set(proposal, base);
  return proposal;
}

// Accepted chronology and Undo remain owned by the existing Studio facade.
// Dropping a preview is cancellation; preparation itself changes no state.
export function applyCoordinationTemplate(studio, proposal) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.replace !== 'function') throw new TypeError('Supply the accepted Studio owner.');
  const base = PROPOSALS.get(proposal);
  if (!base) return freeze({ ok: false, error: { code: 'template-proposal', path: 'template', message: 'Prepare a coordination template before applying it.' }, projection: studio.read() });
  if (studio.read() !== base) return freeze({ ok: false, error: { code: 'stale-edit', path: 'template', message: 'Preview this template against the current plan.' }, projection: studio.read() });
  return proposal.projection === base ? Object.freeze({ ok: true, projection: base }) : studio.replace(proposal.projection.state, base);
}
