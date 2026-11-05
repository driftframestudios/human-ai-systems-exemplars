import { LIMITS } from './config.mjs';
import { PlanError, preparePlan, prepareTeam, prepareWork, prepareConnection } from './contract.mjs';

const VERSION = '1.0.0';
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
const catalogue = (id, label, description, teams, connections) => freeze({ id, version: VERSION, label, description,
  teams: teams.map(([id, label]) => ({ id, label })),
  connections: connections.map(([id, label, senderSlotId, receiverSlotId]) => ({ id, label, senderSlotId, receiverSlotId })),
});
const CATALOGUE = new Map([
  catalogue('pod', 'Pod', 'Connect a delivery group and a partner around a shared object and feedback.',
    [['pod', 'Delivery group'], ['partner', 'Partner group']],
    [['handoff', 'Share the work', 'pod', 'partner'], ['feedback', 'Return feedback', 'partner', 'pod']]),
  catalogue('guild', 'Guild', 'Connect a practice group and a delivery group around guidance and learning.',
    [['practice', 'Practice group'], ['delivery', 'Delivery group']],
    [['guidance', 'Share guidance', 'practice', 'delivery'], ['learning', 'Return learning', 'delivery', 'practice']]),
  catalogue('project-team', 'Project team', 'Connect direction, delivery and the group receiving the work.',
    [['sponsor', 'Sponsoring group'], ['project', 'Project group'], ['operations', 'Receiving group']],
    [['direction', 'Agree direction', 'sponsor', 'project'], ['handover', 'Hand over the work', 'project', 'operations'], ['feedback', 'Return feedback', 'operations', 'project']]),
  catalogue('shared-service', 'Shared service', 'Connect a requesting group and a service through requests and responses.',
    [['requester', 'Requesting group'], ['service', 'Service group']],
    [['request', 'Send a request', 'requester', 'service'], ['response', 'Return a response', 'service', 'requester']]),
].map(row => [row.id, row]));
const LIST = Object.freeze([...CATALOGUE.values()]);

export function listCoordinationTemplates() { return LIST; }
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
export function prepareCoordinationTemplate(base, candidate) {
  const raw = record(candidate, 'request', 'template');
  const template = typeof raw.templateId === 'string' ? CATALOGUE.get(raw.templateId) : undefined;
  if (!template) fail('template', 'template.templateId', 'Choose a listed coordination template.');
  if (raw.version !== template.version) fail('template-version', 'template.version', 'Use the listed template version.');
  const proposalId = identifier(raw.proposalId, 'template.proposalId');
  const teamInputs = slots(raw.teams, template.teams, teamBinding, 'template.teams');
  const edgeInputs = slots(raw.connections, template.connections, (row, path) => record(row, 'connection', path), 'template.connections');
  const state = base.state, people = indexRows(state.people);
  const teams = state.teams.slice(), teamIndex = indexRows(teams), teamPositions = new Map(teams.map((row, index) => [row.id, index]));
  const work = state.work.slice(), workIndex = indexRows(work), originalWork = indexRows(state.work);
  const connections = state.connections.slice(), connectionIndex = indexRows(connections);
  const bindings = new Map(), boundTeams = new Set();
  const summary = { newTeamIds: [], memberships: [], newConnectionIds: [], newRecoveryWorkIds: [] };
  const generated = (kind, slot) => identifier(`${proposalId}-${kind}-${slot}`, 'template.proposalId');
  for (const slot of template.teams) {
    const input = teamInputs.get(slot.id), path = `template.teams.${slot.id}`;
    let team;
    if (input.kind === 'new') {
      team = prepareTeam({ id: generated('team', slot.id), label: input.label,
        personIds: ids(input.personIds, LIMITS.people, people, `${path}.personIds`), lifecycle: 'active' }, path);
      team = include(teams, teamIndex, team, summary.newTeamIds, path, LIMITS.teams);
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
      const row = prepareWork({ id: generated('recovery', slot.id), ...recovery }, `${path}.recoveryWork`);
      include(work, workIndex, row, summary.newRecoveryWorkIds, `${path}.recoveryWork`, LIMITS.work);
      workIds.push(row.id);
    }
    const row = prepareConnection({ id: generated('connection', slot.id), senderTeamId: bindings.get(slot.senderSlotId),
      receiverTeamId: bindings.get(slot.receiverSlotId), receiverPersonId: input.receiverPersonId,
      sharedObject: input.sharedObject, responseExpectation: input.responseExpectation, workIds, status: input.status }, path);
    include(connections, connectionIndex, row, summary.newConnectionIds, path, LIMITS.connections);
  }
  const changed = summary.newTeamIds.length || summary.memberships.length || summary.newConnectionIds.length || summary.newRecoveryWorkIds.length;
  // Even an identical proposal admits all supplied fields before retaining the
  // accepted projection. This also preserves no-op behavior at the revision cap.
  const projection = changed ? preparePlan({ ...state, revision: state.revision + 1, teams, work, connections }) : base;
  const proposal = freeze({ template, proposalId, projection, summary: { ...summary, money: money(base.result, projection.result) } });
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
