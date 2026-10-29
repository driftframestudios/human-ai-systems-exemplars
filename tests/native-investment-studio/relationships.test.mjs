import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan, preparePlan, parsePlan, prepareImport, prepareRole } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS, SCHEMA_BYTE_LIMITS } from '../../collaboration/native-investment-studio/config.mjs';
import { ROLE_CATALOGUES, ROLE_FIELDS, CHANGE_FRAMEWORKS, CONTRIBUTION_CATEGORIES, emptyRole } from '../../collaboration/native-investment-studio/roles.mjs';
import { createPlanExchange } from '../../collaboration/native-investment-studio/exchange.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';

const contribution = (id = 'source-review', overrides = {}) => ({ id, categoryId: 'source-retrieval',
  receiverPersonId: 'product-one', decisionOwnerPersonId: 'engineering-one', workIds: ['review'],
  reviewBoundary: 'Review the source selection.', decisionBoundary: 'Decide which sources support the plan.', ...overrides });
const connection = (id = 'handoff', overrides = {}) => ({ id, senderTeamId: 'delivery', receiverTeamId: 'reviewers',
  receiverPersonId: 'product-one', sharedObject: 'Reviewed source set', responseExpectation: 'Reply after review.',
  workIds: ['review'], status: 'active', ...overrides });
function connectedPlan() {
  const plan = createExamplePlan();
  plan.teams.push({ id: 'reviewers', label: 'Reviewers', personIds: ['product-one'], lifecycle: 'active' });
  plan.contributions.push(contribution()); plan.connections.push(connection());
  return plan;
}
function apply(studio, command) {
  const outcome = studio.applyCommand(command, studio.read());
  assert.equal(outcome.ok, true, outcome.error?.message);
  return outcome.projection;
}
function held(studio, command, code) {
  const before = studio.read(), history = studio.readHistory(), acceptance = studio.readAcceptance();
  const outcome = studio.applyCommand(command, before);
  assert.equal(outcome.ok, false); assert.equal(outcome.error.code, code);
  assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), history); assert.equal(studio.exportText(), before.serialized);
  return outcome.error;
}
function oldPlan(version = '0.2.0') {
  const plan = createExamplePlan(); plan.schemaVersion = version;
  delete plan.contributions; delete plan.connections;
  if (version === '0.1.0') delete plan.purpose;
  for (const person of plan.people) { delete person.role; delete person.lifecycle; }
  for (const row of [...plan.teams, ...plan.work]) delete row.lifecycle;
  return plan;
}

test('the selector catalogue owns all eight legacy fields, six categories and framework component namespaces', () => {
  assert.deepEqual(ROLE_FIELDS, ['functionId', 'seniorityId', 'postureId', 'enablerId', 'qualityId', 'aiId', 'decisionId', 'change']);
  assert.deepEqual(Object.values(ROLE_CATALOGUES).map(rows => rows.length), [10, 5, 5, 5, 4, 4, 4]);
  assert.deepEqual(CONTRIBUTION_CATEGORIES.map(row => row.id), ['scenario-generation', 'source-retrieval', 'dependency-mapping', 'draft-artifacts', 'cross-source-synthesis', 'transparent-calculation']);
  assert.deepEqual(CHANGE_FRAMEWORKS.map(row => [row.id, row.components.length]), [['kotter', 8], ['npt', 5], ['rogers', 5], ['weick', 3], ['adkar', 5], ['dual', 2]]);
  for (const [field, rows] of Object.entries(ROLE_CATALOGUES)) for (const row of rows) {
    assert.equal(prepareRole({ ...emptyRole(), [field]: row.id })[field], row.id);
    assert.ok(Object.isFrozen(row));
  }
  for (const framework of CHANGE_FRAMEWORKS) for (const component of framework.components) {
    const change = { frameworkId: framework.id, componentId: component.id };
    assert.deepEqual(prepareRole({ ...emptyRole(), change }).change, change);
  }
  assert.throws(() => prepareRole({ ...emptyRole(), change: { frameworkId: 'kotter', componentId: 'coherence' } }), { code: 'role-choice' });
});

test('complete old versions migrate owned defaults while explicit current fields stay required', () => {
  for (const version of ['0.1.0', '0.2.0']) {
    const source = oldPlan(version), serialized = JSON.stringify(source);
    source.people[0].rateCentsPerHour = null; source.people[1].rateCentsPerHour = 0;
    const input = JSON.stringify(source), receipt = prepareImport(input), current = receipt.projection;
    assert.equal(receipt.sourceSchemaVersion, version); assert.equal(current.state.schemaVersion, '0.3.0');
    assert.equal(current.state.modelVersion, '0.1.0');
    assert.deepEqual(current.state.people[0].role, emptyRole());
    assert.ok(current.state.people.every(row => row.lifecycle === 'active'));
    assert.deepEqual(current.state.contributions, []); assert.deepEqual(current.state.connections, []);
    assert.deepEqual(current.state.people.map(row => row.rateCentsPerHour), [null, 0, 10000, 10000]);
    assert.equal(current.result.knownCommitmentCents, 60000); assert.equal(current.result.plannedCommitmentCents, null);
    assert.equal(JSON.stringify(source), input); assert.notEqual(input, serialized);
    assert.deepEqual(parsePlan(current.serialized), current);
    const spoofed = oldPlan(version); spoofed.people[0].lifecycle = 'retired';
    assert.throws(() => preparePlan(spoofed), { code: 'fields' });
  }
  for (const mutate of [plan => delete plan.people[0].role, plan => delete plan.people[0].lifecycle,
    plan => delete plan.teams[0].lifecycle, plan => delete plan.work[0].lifecycle,
    plan => delete plan.contributions, plan => delete plan.connections]) {
    const plan = createExamplePlan(); mutate(plan); assert.throws(() => preparePlan(plan), { code: 'fields' });
  }
});

test('metadata, human responsibilities, connection pause and retirement preserve literal money and capacity', () => {
  const studio = createStudio(connectedPlan()), original = studio.read(), money = original.result;
  const role = { ...emptyRole(), functionId: 'engineering', seniorityId: 'principal-plus', postureId: 'decision-owner',
    enablerId: 'protected-focus-time', qualityId: 'independent-review', aiId: 'escalation-owner', decisionId: 'approves',
    change: { frameworkId: 'npt', componentId: 'collective-action' } };
  const commands = [
    { type: 'person.role.replace', personId: 'product-one', role },
    { type: 'contribution.update', contributionId: 'source-review', contribution: contribution('source-review', { receiverPersonId: null, decisionBoundary: null }) },
    { type: 'connection.status.set', connectionId: 'handoff', status: 'paused' },
    ...[['person', 'product-one'], ['team', 'delivery'], ['work', 'review']].map(([kind, id]) => ({ type: `${kind}.lifecycle.set`, [`${kind}Id`]: id, lifecycle: 'retired' })),
  ];
  for (const command of commands) assert.deepEqual(apply(studio, command).result, money);
  assert.equal(studio.read().result.knownCommitmentCents, 120000);
  assert.ok(studio.read().observations.some(row => row.code === 'paused-connection'));
  assert.ok(studio.read().observations.some(row => row.code === 'unassigned-human'));
  assert.ok(studio.read().observations.some(row => row.code === 'retired-record'));
  assert.deepEqual(original.state.people[0].role, emptyRole());
  assert.equal(original.state.work[0].lifecycle, 'active');
});

test('retired funding and multiplied relationship references price each person and work pool once', () => {
  const plan = connectedPlan();
  plan.people[0].fundedMinutes = 60; plan.people[0].lifecycle = 'retired';
  plan.connections.push(connection('parallel')); plan.contributions.push(contribution('parallel'));
  plan.practices.push({ id: 'cross-team-practice', practiceId: 'assurance', teamId: 'reviewers', workIds: ['review'] });
  const projection = preparePlan(plan);
  assert.equal(projection.result.fundedKnownCents, 10000);
  assert.equal(projection.result.additionalKnownCents, 120000);
  assert.equal(projection.result.knownCommitmentCents, 130000);
  assert.equal(projection.result.ledger.length, 1);
  assert.equal(projection.result.capacity.length, 4);
  assert.equal(projection.state.practices[1].teamId, 'reviewers');
});

test('nullable values, closed records, reference direction and text bounds distinguish absence from malformed data', () => {
  const base = connectedPlan();
  for (const [mutate, code] of [
    [p => { p.people[0].role = null; }, 'record'],
    [p => { p.people[0].role.functionId = ''; }, 'role-choice'],
    [p => { p.people[0].role.extra = true; }, 'fields'],
    [p => { p.contributions[0].categoryId = 'other'; }, 'category'],
    [p => { p.contributions[0].receiverPersonId = ''; }, 'text'],
    [p => { p.contributions[0].decisionOwnerPersonId = 'missing'; }, 'reference'],
    [p => { p.contributions[0].workIds = ['review', 'review']; }, 'duplicate-reference'],
    [p => { p.contributions[0].reviewBoundary = ''; }, 'relationship-text'],
    [p => { p.contributions[0].decisionBoundary = 'x'.repeat(601); }, 'relationship-text'],
    [p => { p.connections[0].receiverTeamId = 'delivery'; }, 'connection-endpoints'],
    [p => { p.connections[0].receiverPersonId = 'engineering-one'; }, 'team-membership'],
    [p => { p.connections[0].senderTeamId = 'missing'; }, 'reference'],
    [p => { p.connections[0].workIds = ['missing']; }, 'reference'],
    [p => { p.connections[0].sharedObject = null; }, 'relationship-text'],
    [p => { p.connections[0].status = 'retired'; }, 'choice'],
    [p => { p.work[0].lifecycle = 'paused'; }, 'choice'],
  ]) {
    const plan = structuredClone(base); mutate(plan); assert.throws(() => preparePlan(plan), { code });
  }
  base.contributions[0].reviewBoundary = `  ${'😀'.repeat(298)}  `;
  base.contributions[0].decisionBoundary = null;
  base.connections[0].responseExpectation = null;
  base.connections[0].receiverPersonId = null;
  const current = preparePlan(base);
  assert.equal(current.state.contributions[0].reviewBoundary, '😀'.repeat(298));
  assert.equal(current.state.connections[0].receiverPersonId, null);
  assert.equal(current.state.connections[0].responseExpectation, null);
});

test('all source descriptors and array entries become owned before result construction', () => {
  const plan = connectedPlan(); let reads = 0;
  Object.defineProperty(plan.people[0].role, 'decisionId', { enumerable: true, get() { reads += 1; return 'approves'; } });
  assert.throws(() => preparePlan(plan), { code: 'data-property' }); assert.equal(reads, 0);
  const clean = connectedPlan(); clean.people[0].role.change = { frameworkId: 'kotter', componentId: 'vision' };
  const projection = preparePlan(clean), bytes = projection.serialized;
  clean.people[0].role.change.componentId = 'urgency'; clean.contributions[0].workIds.length = 0;
  clean.connections[0].workIds.reverse(); clean.connections[0].sharedObject = 'Changed caller value';
  assert.equal(projection.serialized, bytes);
  assert.equal(projection.state.people[0].role.change.componentId, 'vision');
  assert.deepEqual(projection.state.contributions[0].workIds, ['review']);
  assert.ok(Object.isFrozen(projection.observations));
  assert.ok(Object.isFrozen(projection.state.people[0].role.change));
  assert.deepEqual(parsePlan(bytes), projection);
});

test('legacy-shaped accepted create and complete update APIs retain new metadata', () => {
  const plan = createExamplePlan(); plan.people[0].role.decisionId = 'approves';
  plan.people[0].lifecycle = 'retired'; plan.teams[0].lifecycle = 'retired'; plan.work[0].lifecycle = 'retired';
  const studio = createStudio(plan);
  assert.equal(studio.updatePerson('product-one', { id: 'product-one', label: 'Updated', fundedMinutes: 60, rateCentsPerHour: 10000 }, studio.read()).ok, true);
  const row = { ...studio.read().state.work[0], occurrences: 7 }; delete row.lifecycle;
  assert.equal(studio.updateWork('review', row, studio.read()).ok, true);
  apply(studio, { type: 'team.update', teamId: 'delivery', team: { id: 'delivery', label: 'Updated team', personIds: plan.teams[0].personIds } });
  assert.equal(studio.read().state.people[0].role.decisionId, 'approves');
  assert.equal(studio.read().state.people[0].lifecycle, 'retired');
  assert.equal(studio.read().state.teams[0].lifecycle, 'retired');
  assert.equal(studio.read().state.work[0].lifecycle, 'retired');
  apply(studio, { type: 'person.create', person: { id: 'new-person', label: 'New person', fundedMinutes: 0, rateCentsPerHour: null } });
  assert.deepEqual(studio.read().state.people.at(-1).role, emptyRole());
  assert.equal(studio.read().state.people.at(-1).lifecycle, 'active');
  apply(studio, { type: 'team.create', team: { id: 'new-team', label: 'New team', personIds: ['new-person'] } });
  apply(studio, { type: 'work.create', work: { id: 'new-work', label: 'New work', teamId: 'new-team', personIds: ['new-person'], minutesPerOccurrence: 30, occurrences: 1, funding: 'additional', status: 'planned', timing: null } });
  assert.equal(studio.read().state.teams.at(-1).lifecycle, 'active');
  assert.equal(studio.read().state.work.at(-1).lifecycle, 'active');
});

test('removal reports every human, endpoint and supporting-work dependency in stable order', () => {
  const studio = createStudio(connectedPlan());
  assert.deepEqual(held(studio, { type: 'person.remove', personId: 'product-one' }, 'dependencies').references, [
    { collection: 'teams', id: 'delivery', field: 'personIds' }, { collection: 'teams', id: 'reviewers', field: 'personIds' },
    { collection: 'work', id: 'review', field: 'personIds' },
    { collection: 'contributions', id: 'source-review', field: 'receiverPersonId' },
    { collection: 'connections', id: 'handoff', field: 'receiverPersonId' },
  ]);
  assert.deepEqual(held(studio, { type: 'team.remove', teamId: 'reviewers' }, 'dependencies').references,
    [{ collection: 'connections', id: 'handoff', field: 'receiverTeamId' }]);
  assert.deepEqual(held(studio, { type: 'work.remove', workId: 'review' }, 'dependencies').references, [
    { collection: 'practices', id: 'shared-expectations', field: 'workIds' },
    { collection: 'contributions', id: 'source-review', field: 'workIds' }, { collection: 'connections', id: 'handoff', field: 'workIds' },
  ]);
  apply(studio, { type: 'contribution.remove', contributionId: 'source-review' });
  apply(studio, { type: 'connection.remove', connectionId: 'handoff' });
  apply(studio, { type: 'team.remove', teamId: 'reviewers' });
  assert.equal(studio.read().state.teams.length, 1);
});

test('explicit whole-plan reassignment is atomic and prior captures retain references', () => {
  const studio = createStudio(connectedPlan()), before = studio.read();
  const next = structuredClone(before.state);
  next.contributions[0].receiverPersonId = 'product-two'; next.connections[0].receiverPersonId = null;
  next.teams.forEach(team => { team.personIds = team.personIds.filter(id => id !== 'product-one'); });
  next.work[0].personIds = next.work[0].personIds.filter(id => id !== 'product-one');
  next.people = next.people.filter(row => row.id !== 'product-one'); next.revision += 1;
  assert.equal(studio.replace(next, before).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 90000);
  assert.equal(before.result.knownCommitmentCents, 120000);
  assert.equal(before.state.connections[0].receiverPersonId, 'product-one');
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.deepEqual(studio.read().observations, before.observations);
  assert.equal(studio.redo(studio.read()).ok, true);
  assert.equal(studio.read().state.connections[0].receiverPersonId, null);
});

test('valid unchanged relationship commands preserve revision-cap identity, Redo and acceptance', () => {
  const plan = connectedPlan(); plan.revision = LIMITS.revision;
  const studio = createStudio(plan); studio.replace({ ...plan, revision: 0 }, studio.read()); studio.undo(studio.read());
  const before = studio.read(), acceptance = studio.readAcceptance();
  for (const command of [
    { type: 'person.role.replace', personId: 'product-one', role: emptyRole() },
    { type: 'person.lifecycle.set', personId: 'product-one', lifecycle: 'active' },
    { type: 'team.lifecycle.set', teamId: 'delivery', lifecycle: 'active' },
    { type: 'work.lifecycle.set', workId: 'review', lifecycle: 'active' },
    { type: 'contribution.update', contributionId: 'source-review', contribution: contribution() },
    { type: 'connection.update', connectionId: 'handoff', connection: connection() },
    { type: 'connection.status.set', connectionId: 'handoff', status: 'active' },
    { type: 'collection.reorder', collection: 'contributions', ids: ['source-review'] },
  ]) assert.strictEqual(apply(studio, command), before);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), { undoCount: 0, redoCount: 1, limit: 20 });
  held(studio, { type: 'person.lifecycle.set', personId: 'product-one', lifecycle: 'retired' }, 'integer');
  held(studio, { type: 'person.role.replace', personId: 'product-one', role: { ...emptyRole(), extra: true } }, 'fields');
});

test('new commands reject surplus, accessors, stale and reentrant proposals before outer publication', () => {
  const studio = createStudio(connectedPlan()), before = studio.read(); let reads = 0;
  const command = { type: 'connection.status.set', connectionId: 'handoff', status: 'paused' };
  Object.defineProperty(command, 'status', { enumerable: true, get() { reads += 1; return 'paused'; } });
  held(studio, command, 'data-property'); assert.equal(reads, 0);
  held(studio, { type: 'contribution.create', contribution: contribution('extra'), extra: true }, 'fields');
  let once = false;
  const role = new Proxy(emptyRole(), { ownKeys(target) {
    if (!once) { once = true; apply(studio, { type: 'connection.status.set', connectionId: 'handoff', status: 'paused' }); }
    return Reflect.ownKeys(target);
  } });
  const outcome = studio.applyCommand({ type: 'person.role.replace', personId: 'product-one', role }, before);
  assert.equal(outcome.ok, false); assert.equal(outcome.error.code, 'stale-edit');
  assert.equal(studio.read().state.revision, 1); assert.equal(studio.read().state.connections[0].status, 'paused');
  assert.deepEqual(studio.read().state.people[0].role, emptyRole());
  assert.equal(studio.applyCommand({ type: 'contribution.remove', contributionId: 'source-review' }, before).error.code, 'stale-edit');
});

test('current reference limit counts every scalar and list edge, with exact and one-over fixtures', () => {
  const plan = createExamplePlan(); plan.practices = [];
  plan.people = Array.from({ length: 128 }, (_, i) => ({ ...plan.people[0], id: `person-${i}` }));
  const ids = plan.people.map(row => row.id);
  plan.teams = Array.from({ length: 32 }, (_, i) => ({ id: `team-${i}`, label: 'Team', personIds: ids.slice(), lifecycle: 'active' }));
  plan.work = Array.from({ length: 128 }, (_, i) => ({ ...plan.work[0], id: `work-${i}`, teamId: 'team-0', personIds: ['person-0'], minutesPerOccurrence: 1, occurrences: 1 }));
  const workIds = plan.work.map(row => row.id);
  plan.contributions = Array.from({ length: 30 }, (_, i) => contribution(`contribution-${i}`, { receiverPersonId: null, decisionOwnerPersonId: null, workIds: workIds.slice() }));
  // 32×128 memberships +128 work participants +128 owning teams +30×128 supporting work =8192.
  assert.equal(LIMITS.references, 8192);
  const exact = preparePlan(plan); assert.equal(exact.result.knownCommitmentCents, 21333);
  plan.contributions[0].receiverPersonId = 'person-0';
  assert.throws(() => preparePlan(plan), { code: 'reference-budget' });
  assert.deepEqual(parsePlan(exact.serialized), exact);
  const old = oldPlan(); old.people = plan.people.map(({ role, lifecycle, ...row }) => row);
  old.teams = plan.teams.map(({ lifecycle, ...row }) => row); old.work = []; old.practices = [];
  assert.equal(preparePlan(old).state.teams.length, 32); // exactly4096 legacy list references
  old.work.push({ id: 'one-over', label: 'One over', teamId: 'team-0', personIds: ['person-0'], minutesPerOccurrence: 1, occurrences: 1, funding: 'additional', status: 'planned', timing: null });
  assert.throws(() => preparePlan(old), { code: 'reference-budget' });
});

test('new collection limits, order and bounded markup-as-data survive exchange', () => {
  const plan = connectedPlan();
  plan.contributions = Array.from({ length: 128 }, (_, i) => contribution(`contribution-${i}`, { workIds: [], reviewBoundary: '<svg onload=example>' }));
  plan.connections = Array.from({ length: 256 }, (_, i) => connection(`connection-${i}`, { workIds: [], receiverPersonId: null }));
  const studio = createStudio(plan);
  held(studio, { type: 'contribution.create', contribution: contribution('too-many', { workIds: [] }) }, 'collection');
  held(studio, { type: 'connection.create', connection: connection('too-many', { workIds: [] }) }, 'collection');
  for (const collection of ['contributions', 'connections']) {
    const ids = studio.read().state[collection].map(row => row.id).reverse();
    apply(studio, { type: 'collection.reorder', collection, ids });
    assert.deepEqual(studio.read().state[collection].map(row => row.id), ids);
  }
  assert.equal(studio.read().state.contributions[0].reviewBoundary, '<svg onload=example>');
  assert.deepEqual(parsePlan(studio.exportText()), studio.read());
  assert.equal(studio.read().result.knownCommitmentCents, 120000);
});

test('exchange names role, lifecycle, human-responsibility and connection changes without phantom object differences', () => {
  const studio = createStudio(connectedPlan()), editing = createDraftCoordinator(studio), exchange = createPlanExchange(studio, editing);
  const current = exchange.previewText(studio.exportText());
  assert.equal(current.ok, true);
  assert.deepEqual(current.view.preview.changes.people.changed, []);
  const plan = structuredClone(studio.read().state); plan.people[0].role.decisionId = 'approves';
  plan.people[1].lifecycle = 'retired'; plan.contributions[0].receiverPersonId = null; plan.connections[0].status = 'paused';
  const next = exchange.previewText(JSON.stringify(plan));
  assert.equal(next.ok, true);
  assert.deepEqual(next.view.preview.changes.people.changed, [{ id: 'product-one', fields: ['role'] }, { id: 'product-two', fields: ['lifecycle'] }]);
  assert.deepEqual(next.view.preview.changes.contributions.changed, [{ id: 'source-review', fields: ['receiverPersonId'] }]);
  assert.deepEqual(next.view.preview.changes.connections.changed, [{ id: 'handoff', fields: ['status'] }]);
  exchange.dispose(); editing.dispose();
});

test('version-owned byte ceilings stay exact while the current bounded transport accepts its own export', () => {
  assert.equal(SCHEMA_BYTE_LIMITS['0.1.0'], 524288); assert.equal(SCHEMA_BYTE_LIMITS['0.2.0'], 546029);
  assert.equal(LIMITS.bytes, SCHEMA_BYTE_LIMITS['0.3.0']); assert.ok(LIMITS.bytes > 546029);
  const current = preparePlan(connectedPlan());
  const exactTransport = current.serialized + ' '.repeat(LIMITS.bytes - Buffer.byteLength(current.serialized));
  assert.equal(prepareImport(exactTransport).projection.serialized, current.serialized);
  assert.throws(() => prepareImport(`${exactTransport} `), { code: 'bytes' });
});


test('maximum-shaped current records and escaped metadata round-trip within the derived finite envelope', () => {
  const plan = createExamplePlan(), id = (kind, i) => `${kind}-${i}`.padEnd(64, 'x');
  const maxText = '\u0000'.repeat(600), maxLabel = '\u0000'.repeat(120);
  const role = Object.fromEntries(Object.entries(ROLE_CATALOGUES).map(([field, rows]) => [field, rows.reduce((a, b) => a.id.length > b.id.length ? a : b).id]));
  role.change = { frameworkId: 'npt', componentId: 'cognitive-participation' };
  plan.people = Array.from({ length: 128 }, (_, i) => ({ id: id('p', i), label: maxLabel, fundedMinutes: 0, rateCentsPerHour: 0, role, lifecycle: 'retired' }));
  plan.teams = Array.from({ length: 32 }, (_, i) => ({ id: id('t', i), label: maxLabel, personIds: [plan.people[0].id], lifecycle: 'retired' }));
  plan.work = Array.from({ length: 256 }, (_, i) => ({ ...plan.work[0], id: id('w', i), label: maxLabel, teamId: plan.teams[0].id, personIds: [plan.people[0].id], lifecycle: 'retired' }));
  plan.practices = Array.from({ length: 128 }, (_, i) => ({ id: id('pact', i), practiceId: 'experimentation', teamId: plan.teams[0].id, workIds: [plan.work[i].id] }));
  plan.purpose = Object.fromEntries(Object.keys(plan.purpose).map(field => [field, maxText]));
  plan.contributions = Array.from({ length: 128 }, (_, i) => contribution(id('output', i), {
    categoryId: 'transparent-calculation', receiverPersonId: plan.people[0].id, decisionOwnerPersonId: plan.people[1].id,
    reviewBoundary: maxText, decisionBoundary: maxText, workIds: [],
  }));
  plan.connections = Array.from({ length: 256 }, (_, i) => connection(id('edge', i), {
    senderTeamId: plan.teams[0].id, receiverTeamId: plan.teams[1].id, receiverPersonId: plan.people[0].id,
    sharedObject: maxText, responseExpectation: maxText, status: 'paused', workIds: [],
  }));
  // 32 memberships +512 work edges +256 practice edges +256 output people +768 connection endpoints =1824.
  let remaining = 8192 - 1824;
  for (const row of [...plan.contributions, ...plan.connections]) {
    const count = Math.min(256, remaining); row.workIds = plan.work.slice(0, count).map(work => work.id); remaining -= count;
  }
  assert.equal(remaining, 0);
  const current = preparePlan(plan);
  assert.ok(Buffer.byteLength(current.serialized) <= LIMITS.bytes);
  assert.equal(current.result.knownCommitmentCents, 0);
  assert.deepEqual(parsePlan(current.serialized), current);
  assert.equal(current.state.people[0].role.decisionId, role.decisionId);
  const person = current.observations.find(row => row.code === 'retired-record' && row.collection === 'people');
  assert.equal(person.commitments.fundedMinutes, 0);
  assert.equal(person.commitments.additionalMinutes, 46080);
  const team = current.observations.find(row => row.code === 'retired-record' && row.collection === 'teams');
  assert.equal(team.commitments.workIds.length, 256);
});
