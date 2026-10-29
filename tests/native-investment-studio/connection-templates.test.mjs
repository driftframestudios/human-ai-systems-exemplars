import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';
import { listCoordinationTemplates, prepareCoordinationTemplate, applyCoordinationTemplate } from '../../collaboration/native-investment-studio/connection-templates.mjs';

function request(id = 'pod', proposalId = 'sample') {
  const template = listCoordinationTemplates().find(row => row.id === id);
  return { templateId: id, version: '1.0.0', proposalId,
    teams: template.teams.map(slot => ({ slotId: slot.id, kind: 'new', label: slot.label, personIds: ['product-one'] })),
    connections: template.connections.map(slot => ({ slotId: slot.id, receiverPersonId: 'product-one',
      sharedObject: 'A reviewed plan', responseExpectation: 'Review together.', workIds: ['review'], status: 'active', recoveryWork: null })),
  };
}
function funded() {
  const plan = createExamplePlan();
  plan.people = [plan.people[0]];
  plan.people[0].fundedMinutes = 9600;
  plan.teams[0].personIds = ['product-one'];
  plan.teams.push({ id: 'receiving', label: 'Receiving', personIds: ['product-one'], lifecycle: 'active' });
  plan.work[0] = { ...plan.work[0], personIds: ['product-one'], minutesPerOccurrence: 240, occurrences: 1, funding: 'allocated' };
  return plan;
}
function existingRequest() {
  const raw = request();
  raw.teams = [{ slotId: 'pod', kind: 'existing', teamId: 'delivery', addPersonIds: [] },
    { slotId: 'partner', kind: 'existing', teamId: 'receiving', addPersonIds: [] }];
  return raw;
}
function recovery(overrides = {}) {
  return { label: 'Additional review', teamId: 'delivery', personIds: ['product-one'], minutesPerOccurrence: 90,
    occurrences: 1, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active', ...overrides };
}
function unchanged(studio, operation, code) {
  const before = studio.read(), acceptance = studio.readAcceptance(), history = studio.readHistory();
  assert.throws(operation, { code });
  assert.strictEqual(studio.read(), before); assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), history);
}
function apply(studio, proposal) {
  const result = applyCoordinationTemplate(studio, proposal);
  assert.equal(result.ok, true, result.error?.message); return result.projection;
}

test('the finite catalogue carries four authored directed arrangements and immutable source descriptions', () => {
  const catalogue = listCoordinationTemplates();
  assert.deepEqual(catalogue.map(row => [row.id, row.teams.map(team => team.id), row.connections.map(edge => [edge.id, edge.senderSlotId, edge.receiverSlotId])]), [
    ['pod', ['pod', 'partner'], [['handoff', 'pod', 'partner'], ['feedback', 'partner', 'pod']]],
    ['guild', ['practice', 'delivery'], [['guidance', 'practice', 'delivery'], ['learning', 'delivery', 'practice']]],
    ['project-team', ['sponsor', 'project', 'operations'], [['direction', 'sponsor', 'project'], ['handover', 'project', 'operations'], ['feedback', 'operations', 'project']]],
    ['shared-service', ['requester', 'service'], [['request', 'requester', 'service'], ['response', 'service', 'requester']]],
  ]);
  assert.ok(Object.isFrozen(catalogue)); assert.ok(Object.isFrozen(catalogue[0].connections[0]));
  assert.strictEqual(listCoordinationTemplates(), catalogue);
});

test('each template starts from the one-team example, preserves people and work owners, and orders authored slots', () => {
  for (const [id, groups, edges] of [['pod', 2, 2], ['guild', 2, 2], ['project-team', 3, 3], ['shared-service', 2, 2]]) {
    const studio = createStudio(), before = studio.read(), raw = request(id), original = JSON.stringify(raw);
    raw.teams.reverse(); raw.connections.reverse();
    const reversed = JSON.stringify(raw), proposal = prepareCoordinationTemplate(before, raw);
    assert.strictEqual(studio.read(), before); assert.equal(JSON.stringify(raw), reversed); assert.notEqual(reversed, original);
    assert.equal(proposal.projection.state.teams.length, 1 + groups); assert.equal(proposal.projection.state.connections.length, edges);
    assert.deepEqual(proposal.projection.state.people, before.state.people);
    assert.deepEqual(proposal.projection.state.work, before.state.work); assert.equal(proposal.projection.state.work[0].teamId, 'delivery');
    assert.deepEqual(proposal.projection.result, before.result); assert.equal(proposal.projection.result.plannedCommitmentCents, 120000);
    assert.equal(proposal.summary.money.totalDeltaCents, 0); assert.equal(proposal.summary.newTeamIds.length, groups);
    const accepted = apply(studio, proposal);
    assert.equal(accepted.state.revision, 1); assert.equal(studio.readHistory().undoCount, 1); assert.equal(studio.readAcceptance().sequence, 1);
    assert.deepEqual(accepted.state.connections.map(row => row.id), listCoordinationTemplates().find(row => row.id === id).connections.map(row => `sample-connection-${row.id}`));
  }
});

test('four allocated hours remain attribution within sixteen thousand dollars through shared edges and pause', () => {
  const studio = createStudio(funded()), proposal = prepareCoordinationTemplate(studio.read(), existingRequest());
  assert.equal(proposal.projection.result.fundedKnownCents, 1600000);
  assert.equal(proposal.projection.result.allocatedKnownCents, 40000);
  assert.equal(proposal.projection.result.plannedCommitmentCents, 1600000);
  assert.equal(proposal.projection.result.ledger.length, 1);
  apply(studio, proposal);
  for (const connection of studio.read().state.connections) {
    const before = studio.read();
    const result = studio.applyCommand({ type: 'connection.status.set', connectionId: connection.id, status: 'paused' }, before);
    assert.equal(result.ok, true); assert.deepEqual(result.projection.result, before.result);
  }
  assert.equal(studio.read().result.plannedCommitmentCents, 1600000);
});

test('explicit ninety-minute review adds one hundred fifty dollars atomically and Undo restores its complete predecessor', () => {
  const studio = createStudio(funded()), before = studio.read(), raw = existingRequest();
  raw.connections[0].recoveryWork = recovery(); raw.connections[0].status = 'paused';
  const proposal = prepareCoordinationTemplate(before, raw);
  assert.equal(proposal.projection.result.allocatedKnownCents, 40000);
  assert.equal(proposal.projection.result.additionalKnownCents, 15000);
  assert.deepEqual(proposal.summary.money, { beforeKnownCents: 1600000, afterKnownCents: 1615000, knownDeltaCents: 15000,
    beforeTotalCents: 1600000, afterTotalCents: 1615000, totalDeltaCents: 15000 });
  assert.deepEqual(proposal.summary.newRecoveryWorkIds, ['sample-recovery-handoff']);
  assert.deepEqual(proposal.projection.state.connections[0].workIds, ['review', 'sample-recovery-handoff']);
  const accepted = apply(studio, proposal);
  assert.equal(accepted.result.plannedCommitmentCents, 1615000); assert.equal(studio.readHistory().undoCount, 1);
  assert.equal(studio.undo(accepted).ok, true); assert.deepEqual(studio.read().state, before.state);
  assert.equal(studio.read().result.plannedCommitmentCents, 1600000);
  assert.equal(studio.redo(studio.read()).ok, true); assert.deepEqual(studio.read().state, accepted.state);
});

test('zero and unknown rates stay distinct in the proposal comparison and optional recovery work', () => {
  for (const rate of [0, null]) {
    const plan = funded(); plan.people[0].rateCentsPerHour = rate;
    const studio = createStudio(plan), raw = existingRequest(); raw.connections[0].recoveryWork = recovery();
    const proposal = prepareCoordinationTemplate(studio.read(), raw);
    assert.equal(proposal.summary.money.knownDeltaCents, 0);
    assert.equal(proposal.summary.money.totalDeltaCents, rate === null ? null : 0);
    assert.equal(proposal.projection.result.plannedCommitmentCents, rate === null ? null : 0);
    assert.equal(apply(studio, proposal).result.additionalKnownCents, 0);
  }
});

test('existing membership additions preserve order, lifecycle and existing working-session participants', () => {
  const plan = createExamplePlan();
  plan.teams.push({ id: 'receiving', label: 'Receiving', personIds: ['product-one'], lifecycle: 'retired' });
  const studio = createStudio(plan), raw = existingRequest();
  raw.teams[1].addPersonIds = ['product-one', 'engineering-two', 'product-two'];
  raw.connections[0].receiverPersonId = 'engineering-two';
  const proposal = prepareCoordinationTemplate(studio.read(), raw);
  assert.deepEqual(proposal.summary.memberships, [{ teamId: 'receiving', addedPersonIds: ['engineering-two', 'product-two'] }]);
  assert.deepEqual(proposal.projection.state.teams[1].personIds, ['product-one', 'engineering-two', 'product-two']);
  assert.equal(proposal.projection.state.teams[1].lifecycle, 'retired');
  assert.deepEqual(proposal.projection.state.work, studio.read().state.work);
});

test('identical canonical proposals preserve projection, revision, acceptance and Redo even at the revision ceiling', () => {
  const studio = createStudio(funded()), raw = existingRequest(); raw.connections[0].recoveryWork = recovery();
  apply(studio, prepareCoordinationTemplate(studio.read(), raw));
  const state = structuredClone(studio.read().state); state.revision = LIMITS.revision;
  const capped = createStudio(state), initial = capped.read();
  capped.applyCommand({ type: 'connection.status.set', connectionId: 'sample-connection-handoff', status: 'active' }, initial);
  const acceptance = capped.readAcceptance(), history = capped.readHistory();
  const proposal = prepareCoordinationTemplate(initial, raw);
  assert.strictEqual(proposal.projection, initial); assert.equal(proposal.summary.newConnectionIds.length, 0);
  assert.strictEqual(apply(capped, proposal), initial); assert.strictEqual(capped.readAcceptance(), acceptance);
  assert.deepEqual(capped.readHistory(), history);
  const normal = createStudio(funded()); const first = apply(normal, prepareCoordinationTemplate(normal.read(), existingRequest()));
  normal.applyCommand({ type: 'connection.status.set', connectionId: 'sample-connection-handoff', status: 'paused' }, first);
  normal.undo(normal.read());
  const undoState = normal.read(), redoHistory = normal.readHistory();
  assert.strictEqual(apply(normal, prepareCoordinationTemplate(undoState, existingRequest())), undoState);
  assert.deepEqual(normal.readHistory(), redoHistory); assert.equal(redoHistory.redoCount, 1);
});

test('existing generated records require exact canonical equality and preserve acceptance on each collision', () => {
  for (const mutate of [
    raw => { raw.teams[0].label = 'Changed group'; },
    raw => { raw.connections[0].sharedObject = 'Another object'; },
    raw => { raw.connections[0].recoveryWork.label = 'Another session'; },
  ]) {
    const studio = createStudio(), raw = request(); raw.connections[0].recoveryWork = recovery();
    apply(studio, prepareCoordinationTemplate(studio.read(), raw)); mutate(raw);
    unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), 'identity-collision');
  }
});

test('prepared ownership detaches requests and nested recovery arrays while forged previews remain held', () => {
  const studio = createStudio(), raw = request(); raw.connections[0].recoveryWork = recovery();
  const proposal = prepareCoordinationTemplate(studio.read(), raw), snapshot = proposal.projection.serialized;
  raw.teams[0].personIds.push('engineering-two'); raw.connections[0].workIds.length = 0;
  raw.connections[0].recoveryWork.personIds[0] = 'engineering-one'; raw.connections[0].sharedObject = 'Changed';
  assert.equal(proposal.projection.serialized, snapshot); assert.ok(Object.isFrozen(proposal.summary.memberships));
  assert.equal(applyCoordinationTemplate(studio, { ...proposal }).error.code, 'template-proposal');
  assert.equal(apply(studio, proposal).serialized, snapshot);
});

test('cancelled, stale, equal-payload imported and ABA previews preserve the current accepted owner', () => {
  const studio = createStudio(), before = studio.read(), preview = prepareCoordinationTemplate(before, request());
  assert.strictEqual(studio.read(), before); assert.equal(studio.readHistory().undoCount, 0); // Cancel drops this preview.
  studio.replace(before.state, before);
  assert.equal(applyCoordinationTemplate(studio, preview).error.code, 'stale-edit');
  studio.undo(studio.read()); assert.deepEqual(studio.read().state, before.state); assert.notStrictEqual(studio.read(), before);
  assert.equal(applyCoordinationTemplate(studio, preview).error.code, 'stale-edit');
  assert.equal(applyCoordinationTemplate(createStudio(), preview).error.code, 'stale-edit');
  assert.equal(studio.read().state.connections.length, 0);
});

test('reentrant request reflection leaves only the newer accepted plan eligible for Apply', () => {
  const studio = createStudio(), before = studio.read(), raw = request(); let changed = false;
  const supplied = new Proxy(raw, { getOwnPropertyDescriptor(target, key) {
    if (key === 'proposalId' && !changed) { changed = true; studio.replace(before.state, before); }
    return Reflect.getOwnPropertyDescriptor(target, key);
  } });
  const proposal = prepareCoordinationTemplate(before, supplied);
  assert.equal(applyCoordinationTemplate(studio, proposal).error.code, 'stale-edit');
  assert.equal(studio.read().state.connections.length, 0); assert.equal(studio.readHistory().undoCount, 1);
});

test('closed descriptor admission holds unsupported versions, accessors, surplus fields and sparse collections', () => {
  const studio = createStudio(); let called = 0;
  for (const [mutate, code] of [
    [raw => { raw.version = '2.0.0'; }, 'template-version'], [raw => { raw.templateId = '__proto__'; }, 'template'],
    [raw => { raw.extra = true; }, 'fields'], [raw => { raw.teams.push(raw.teams[0]); }, 'collection'],
    [raw => { delete raw.teams[0]; }, 'collection'], [raw => { raw.teams[0].personIds = new Array(1); }, 'collection'],
    [raw => { Object.defineProperty(raw, 'proposalId', { enumerable: true, get() { called += 1; return 'oops'; } }); }, 'data-property'],
    [raw => { Object.defineProperty(raw.teams[0].personIds, '0', { enumerable: true, get() { called += 1; return 'product-one'; } }); }, 'data-property'],
  ]) { const raw = request(); mutate(raw); unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), code); }
  assert.equal(called, 0);
});

test('slot, reference and binding duplicates receive distinct diagnostics before publication', () => {
  const studio = createStudio(funded());
  for (const [mutate, code] of [
    [raw => { raw.teams[1].slotId = 'pod'; }, 'duplicate-slot'],
    [raw => { raw.connections[0].slotId = 'other'; }, 'template-slot'],
    [raw => { raw.connections.pop(); }, 'template-slots'],
    [raw => { raw.teams[1].teamId = 'delivery'; }, 'duplicate-binding'],
    [raw => { raw.teams[1].teamId = 'missing'; }, 'reference'],
    [raw => { raw.teams[1].addPersonIds = ['product-one', 'product-one']; }, 'duplicate-reference'],
    [raw => { raw.connections[0].workIds = ['review', 'review']; }, 'duplicate-reference'],
    [raw => { raw.connections[0].workIds = ['missing']; }, 'reference'],
    [raw => { raw.connections[0].receiverPersonId = 'missing'; }, 'reference'],
    [raw => { raw.connections[0].recoveryWork = recovery({ teamId: 'missing' }); }, 'reference'],
  ]) { const raw = existingRequest(); mutate(raw); unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), code); }
});

test('receiver membership and supporting-work removal retain canonical relationship constraints', () => {
  const plan = createExamplePlan(); plan.teams.push({ id: 'receiving', label: 'Receiving', personIds: [], lifecycle: 'active' });
  const studio = createStudio(plan), raw = existingRequest();
  unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), 'team-membership');
  raw.teams[1].addPersonIds = ['product-one']; apply(studio, prepareCoordinationTemplate(studio.read(), raw));
  const removed = studio.applyCommand({ type: 'work.remove', workId: 'review' }, studio.read());
  assert.equal(removed.ok, false); assert.equal(removed.error.code, 'dependencies');
  assert.deepEqual(removed.error.references.filter(row => row.collection === 'connections').map(row => row.id), ['sample-connection-handoff', 'sample-connection-feedback']);
  const members = studio.applyCommand({ type: 'team.members.replace', teamId: 'receiving', personIds: [] }, studio.read());
  assert.equal(members.ok, false); assert.equal(members.error.code, 'team-membership');
});

test('generated identity length, relationship text and ordered people/work lists retain exact canonical bounds', () => {
  const studio = createStudio(), prefixLength = LIMITS.identifier - '-connection-feedback'.length;
  const raw = request('pod', 'p'.repeat(prefixLength)); raw.connections[0].sharedObject = 'x'.repeat(600);
  const proposal = prepareCoordinationTemplate(studio.read(), raw);
  assert.equal(proposal.projection.state.connections[1].id.length, 64);
  raw.proposalId += 'p'; unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), 'text');
  raw.proposalId = 'sample'; raw.connections[0].sharedObject += 'x'; unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), 'relationship-text');
  raw.connections[0].sharedObject = 'Object'; raw.teams[0].personIds = Array(129).fill('product-one');
  unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), 'collection');
  raw.teams[0].personIds = ['product-one']; raw.connections[0].workIds = Array(257).fill('review');
  unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), 'collection');
});

test('exact team, connection and recovery-work collection caps admit atomically and one-over stays held', () => {
  for (const [kind, cap, additions] of [['teams', LIMITS.teams, 2], ['connections', LIMITS.connections, 2], ['work', LIMITS.work, 1]]) {
    for (const excess of [0, 1]) {
      const plan = funded();
      if (kind === 'teams') {
        while (plan.teams.length < cap - additions + excess) plan.teams.push({ id: `group-${plan.teams.length}`, label: 'Group', personIds: [], lifecycle: 'active' });
      } else if (kind === 'connections') {
        while (plan.connections.length < cap - additions + excess) plan.connections.push({ id: `edge-${plan.connections.length}`, senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: null,
          sharedObject: 'Object', responseExpectation: null, workIds: [], status: 'active' });
      } else {
        while (plan.work.length < cap - additions + excess) plan.work.push({ ...plan.work[0], id: `work-${plan.work.length}`, minutesPerOccurrence: 0 });
      }
      const studio = createStudio(plan), raw = kind === 'teams' ? request() : existingRequest();
      if (kind === 'work') raw.connections[0].recoveryWork = recovery();
      if (excess) unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), 'collection');
      else assert.equal(prepareCoordinationTemplate(studio.read(), raw).projection.state[kind].length, cap);
    }
  }
});

test('exact people and supporting-work list limits remain usable with one canonical accounting identity', () => {
  const plan = funded();
  while (plan.people.length < LIMITS.people) plan.people.push({ ...plan.people[0], id: `person-${plan.people.length}`, fundedMinutes: 0, rateCentsPerHour: 0 });
  while (plan.work.length < LIMITS.work) plan.work.push({ ...plan.work[0], id: `work-${plan.work.length}`, minutesPerOccurrence: 0 });
  const studio = createStudio(plan), raw = request();
  raw.teams[0].personIds = plan.people.map(row => row.id);
  raw.connections.forEach(row => { row.workIds = plan.work.map(work => work.id); });
  const proposal = prepareCoordinationTemplate(studio.read(), raw);
  assert.equal(proposal.projection.state.teams[2].personIds.length, 128);
  assert.equal(proposal.projection.state.connections[0].workIds.length, 256);
  assert.equal(proposal.projection.result.plannedCommitmentCents, 1600000);
  assert.equal(proposal.projection.result.allocatedKnownCents, 40000);
});

test('the full candidate admits exactly 8192 references and rejects one additional reference atomically', () => {
  for (const excess of [0, 1]) {
    const plan = funded();
    while (plan.work.length < 32) plan.work.push({ ...plan.work[0], id: `work-${plan.work.length}`, minutesPerOccurrence: 0 });
    const workIds = plan.work.map(row => row.id);
    const edge = id => ({ id, senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: null,
      sharedObject: 'Object', responseExpectation: null, workIds, status: 'active' });
    for (let index = 0; index < 238; index += 1) plan.connections.push(edge(`existing-${index}`));
    plan.connections.push({ ...edge('partial'), workIds: workIds.slice(0, 22 + excess) });
    // 68 existing membership/work/practice references + 238*34 + 24 = 8184.
    // The template adds two edges, each with two groups, one receiver, one work.
    const studio = createStudio(plan);
    if (excess) unchanged(studio, () => prepareCoordinationTemplate(studio.read(), existingRequest()), 'reference-budget');
    else assert.equal(prepareCoordinationTemplate(studio.read(), existingRequest()).projection.state.connections.length, 241);
  }
});

test('changing team discriminants and inherited data retain one closed interpretation', () => {
  const studio = createStudio(), raw = request(); let reads = 0;
  raw.teams[0] = new Proxy(raw.teams[0], { getOwnPropertyDescriptor(target, key) {
    const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
    return key === 'kind' ? { ...descriptor, value: ++reads === 1 ? 'new' : 'existing' } : descriptor;
  } });
  unchanged(studio, () => prepareCoordinationTemplate(studio.read(), raw), 'template-binding');
  assert.equal(reads, 2);
  const inherited = request(); inherited.teams[0] = Object.create(inherited.teams[0]);
  unchanged(studio, () => prepareCoordinationTemplate(studio.read(), inherited), 'data-property');
});

test('a final publication failure leaves the preview, history and all accepted collections intact', () => {
  const studio = createStudio(), before = studio.read(), proposal = prepareCoordinationTemplate(before, request());
  const facade = { read: studio.read, replace(candidate, expected) {
    studio.replace(before.state, before);
    return studio.replace(candidate, expected);
  } };
  const result = applyCoordinationTemplate(facade, proposal);
  assert.equal(result.ok, false); assert.equal(result.error.code, 'stale-edit');
  assert.equal(studio.read().state.teams.length, 1); assert.equal(studio.read().state.connections.length, 0);
  assert.equal(studio.readHistory().undoCount, 1); assert.equal(proposal.projection.state.connections.length, 2);
  assert.equal(applyCoordinationTemplate(studio, proposal).error.code, 'stale-edit');
});
