import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePlan, prepareImport, parsePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { createPlanExchange } from '../../collaboration/native-investment-studio/exchange.mjs';
import { prepareCoordinationTemplate, applyCoordinationTemplate } from '../../collaboration/native-investment-studio/connection-templates.mjs';
import { getCoordinationTemplate, projectCoordinationArrangements, describeArrangementReference, describeArrangementChanges } from '../../collaboration/native-investment-studio/coordination-arrangements.mjs';
import { projectDeliveryBoard } from '../../collaboration/native-investment-studio/delivery-board.mjs';
import { LIMITS, SCHEMA_BYTE_LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

function podRequest(proposalId = 'working-pod') {
  return { templateId: 'pod', version: '1.0.0', proposalId,
    teams: [{ slotId: 'partner', kind: 'new', label: 'Receiving reviewers', personIds: ['product-one'] },
      { slotId: 'pod', kind: 'existing', teamId: 'delivery', addPersonIds: [] }],
    connections: ['feedback', 'handoff'].map(slotId => ({ slotId, receiverPersonId: 'product-one',
      sharedObject: 'Pilot instructions', responseExpectation: 'Return the review before pilot approval.',
      workIds: ['review'], status: 'active', recoveryWork: null })) };
}
function pod() {
  const studio = createStudio(), proposal = prepareCoordinationTemplate(studio.read(), podRequest());
  assert.equal(applyCoordinationTemplate(studio, proposal).ok, true);
  return studio;
}
const expectedPod = Object.freeze({ id: 'working-pod', templateId: 'pod', templateVersion: '1.0.0',
  teamBindings: [{ slotId: 'pod', teamId: 'delivery' }, { slotId: 'partner', teamId: 'working-pod-team-partner' }],
  connectionBindings: [{ slotId: 'handoff', connectionId: 'working-pod-connection-handoff' },
    { slotId: 'feedback', connectionId: 'working-pod-connection-feedback' }] });

test('0.7 migration retains an authored horizon and actual topology while leaving template identity unspecified', () => {
  const old = createShowcasePlan(); old.schemaVersion = '0.7.0'; delete old.arrangements;
  old.scoreSettings.version = '1.0.0'; delete old.scoreSettings.cadence;
  old.teams[0].label = 'Pod';
  const original = JSON.stringify(old), receipt = prepareImport(original), current = receipt.projection;
  assert.equal(receipt.sourceSchemaVersion, '0.7.0'); assert.equal(current.state.schemaVersion, '0.9.0');
  assert.deepEqual(current.state.scoreSettings, { ...old.scoreSettings, version: '1.1.0', cadence: null });
  assert.ok(old.scoreSettings.gates.length && old.scoreSettings.proposals.length && old.scoreSettings.waits.length);
  assert.deepEqual(current.state.people, old.people); assert.deepEqual(current.state.work, old.work);
  assert.deepEqual(current.state.connections, old.connections); assert.deepEqual(current.state.teams, old.teams);
  assert.deepEqual(current.state.arrangements, []);
  assert.deepEqual(projectCoordinationArrangements(current.state), { arrangements: [], customConnectionIds: ['scope', 'readiness', 'decision'] });
  assert.equal(current.result.plannedCommitmentCents, 398000);
  assert.equal(JSON.stringify(old), original); assert.equal(parsePlan(current.serialized).serialized, current.serialized);
  assert.ok(SCHEMA_BYTE_LIMITS['0.8.0'] > SCHEMA_BYTE_LIMITS['0.7.0']);
  const spoofed = JSON.parse(original); spoofed.arrangements = [];
  assert.throws(() => preparePlan(spoofed), { code: 'fields' });
});

test('mixed team binding acquires one canonical arrangement atomically and preserves it through exchange and history', () => {
  const studio = createStudio(), before = studio.read(), request = podRequest();
  const proposal = prepareCoordinationTemplate(before, request);
  assert.deepEqual(proposal.projection.state.arrangements, [expectedPod]);
  assert.deepEqual(proposal.summary.newArrangementIds, ['working-pod']);
  assert.strictEqual(studio.read(), before); assert.deepEqual(proposal.projection.result, before.result);
  assert.equal(applyCoordinationTemplate(studio, proposal).ok, true);
  const accepted = studio.read();
  assert.equal(parsePlan(studio.exportText()).serialized, accepted.serialized);
  const repeated = prepareCoordinationTemplate(accepted, request);
  assert.strictEqual(repeated.projection, accepted); assert.deepEqual(repeated.summary.newArrangementIds, []);
  assert.equal(applyCoordinationTemplate(studio, repeated).ok, true); assert.equal(studio.readHistory().undoCount, 1);
  assert.equal(studio.undo(accepted).ok, true); assert.deepEqual(studio.read().state, before.state);
  assert.equal(studio.redo(studio.read()).ok, true); assert.deepEqual(studio.read().state.arrangements, [expectedPod]);
  const restored = studio.read();
  const collision = podRequest(); collision.templateId = 'guild';
  collision.teams[0].slotId = 'delivery'; collision.teams[1].slotId = 'practice';
  collision.connections[0].slotId = 'learning'; collision.connections[1].slotId = 'guidance';
  assert.throws(() => prepareCoordinationTemplate(studio.read(), collision), { code: 'identity-collision' });
  assert.strictEqual(studio.read(), restored);
});

test('actual edges, renamed teams and current membership govern the adapted view without modifying its source', () => {
  const plan = structuredClone(pod().read().state);
  plan.teams[0].label = 'Changed delivery name'; plan.teams[0].personIds.reverse();
  plan.teams.push({ id: 'external-reviewers', label: 'External reviewers', personIds: ['product-one'], lifecycle: 'active' });
  plan.connections.find(row => row.id === 'working-pod-connection-feedback').receiverTeamId = 'external-reviewers';
  plan.connections.push({ ...plan.connections[0], id: 'custom-review', status: 'paused' });
  const accepted = preparePlan(plan), view = projectCoordinationArrangements(accepted.state), row = view.arrangements[0];
  assert.equal(row.label, 'Pod'); assert.equal(row.purpose, 'Connect a delivery group and a partner around a shared object and feedback.');
  assert.equal(row.adapted, true); assert.deepEqual(row.connections.map(edge => edge.adapted), [false, true]);
  assert.equal(row.teams[0].team.label, 'Changed delivery name');
  assert.deepEqual(row.teams[0].team.personIds, ['engineering-two', 'engineering-one', 'product-two', 'product-one']);
  assert.equal(row.connections[1].expectedReceiverTeamId, 'delivery');
  assert.equal(row.connections[1].connection.receiverTeamId, 'external-reviewers');
  assert.deepEqual(view.customConnectionIds, ['custom-review']);
  assert.deepEqual(describeArrangementChanges(pod().read().state, accepted.state), [
    'Pod arrangement changed: Delivery group: Changed delivery name; Partner group: Receiving reviewers. Share the work: Changed delivery name → Receiving reviewers; Return feedback: Receiving reviewers → External reviewers. Connections are adapted from this template.',
  ]);
  assert.deepEqual(accepted.state.arrangements, [expectedPod]);
  assert.equal(accepted.result.plannedCommitmentCents, 120000);
  assert.notStrictEqual(row.teams[0].team, accepted.state.teams[0]);
  assert.notStrictEqual(row.connections[0].connection, accepted.state.connections[0]);
  assert.ok(Object.isFrozen(row.connections[0].connection.workIds));
  assert.throws(() => { row.teams[0].team.personIds.pop(); }, TypeError);
});

test('detaching a template preserves teams, connections, work and money and offers a route before bound removal', () => {
  const studio = pod(), before = studio.read();
  const blocked = studio.applyCommand({ type: 'connection.remove', connectionId: 'working-pod-connection-handoff' }, before);
  assert.equal(blocked.ok, false); assert.equal(blocked.error.code, 'dependencies');
  assert.deepEqual(blocked.error.references, [{ collection: 'arrangements', id: 'working-pod', field: 'connectionBindings[0].connectionId' }]);
  assert.deepEqual(describeArrangementReference(before.state, blocked.error.references[0]), { id: 'working-pod', label: 'Pod arrangement' });
  const command = { type: 'arrangement.remove', arrangementId: 'working-pod' }, preview = studio.previewCommand(command, before);
  assert.equal(preview.ok, true); assert.strictEqual(studio.read(), before);
  for (const field of ['people', 'teams', 'connections', 'work', 'scoreSettings']) assert.deepEqual(preview.projection.state[field], before.state[field]);
  assert.deepEqual(preview.projection.result, before.result); assert.deepEqual(preview.projection.state.arrangements, []);
  assert.deepEqual(describeArrangementChanges(before.state, preview.projection.state), [
    'Pod template grouping removed: Delivery group: Product and Engineering; Partner group: Receiving reviewers.',
  ]);
  assert.equal(studio.applyCommand(command, before).ok, true);
  const detached = studio.read();
  assert.deepEqual(projectCoordinationArrangements(detached.state).customConnectionIds, ['working-pod-connection-handoff', 'working-pod-connection-feedback']);
  assert.equal(studio.previewCommand({ type: 'connection.remove', connectionId: 'working-pod-connection-handoff' }, detached).ok, true);
  assert.equal(studio.undo(detached).ok, true); assert.deepEqual(studio.read().state.arrangements, [expectedPod]);
  const teamBlocked = studio.applyCommand({ type: 'team.remove', teamId: 'working-pod-team-partner' }, studio.read());
  assert.ok(teamBlocked.error.references.some(row => row.collection === 'arrangements' && row.field === 'teamBindings[1].teamId'));
});

test('closed arrangement slots, versions and references reject ambiguous grouping before publication', () => {
  const original = pod().read().state;
  const cases = [
    [row => { row.templateVersion = undefined; }, 'arrangement-template'],
    [row => { row.templateId = 'unknown'; }, 'arrangement-template'],
    [row => { row.teamBindings.pop(); }, 'arrangement-slots'],
    [row => { row.teamBindings[0].slotId = 'other'; }, 'arrangement-slot'],
    [row => { row.connectionBindings[1].slotId = 'handoff'; }, 'duplicate-slot'],
    [row => { row.teamBindings[1].teamId = 'delivery'; }, 'duplicate-binding'],
    [row => { row.connectionBindings[0].connectionId = 'removed'; }, 'reference'],
    [row => { row.extra = 'unknown'; }, 'fields'],
  ];
  for (const [mutate, code] of cases) {
    const plan = structuredClone(original); mutate(plan.arrangements[0]);
    assert.throws(() => preparePlan(plan), { code });
  }
  const reversed = structuredClone(original); reversed.arrangements[0].teamBindings.reverse(); reversed.arrangements[0].connectionBindings.reverse();
  assert.deepEqual(preparePlan(reversed).state.arrangements, [expectedPod]);
  const maximum = structuredClone(original);
  maximum.arrangements = Array.from({ length: LIMITS.arrangements }, (_, index) => ({ ...structuredClone(expectedPod), id: `group-${index}` }));
  const accepted = preparePlan(maximum); assert.equal(parsePlan(accepted.serialized).serialized, accepted.serialized);
  maximum.arrangements.push({ ...structuredClone(expectedPod), id: 'one-more' });
  assert.throws(() => preparePlan(maximum), { code: 'collection' });
  assert.equal(getCoordinationTemplate('pod', '2.0.0'), null);
});

test('exchange previews identity and binding changes even when accepted amounts remain equal', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio), exchange = createPlanExchange(studio, editing);
  const arranged = pod().read();
  let result = exchange.previewText(arranged.serialized);
  assert.equal(result.ok, true); assert.deepEqual(result.view.preview.changes.arrangements.added, ['working-pod']);
  assert.deepEqual(describeArrangementChanges(studio.read().state, result.view.preview.projection.state), [
    'Pod arrangement added: Delivery group: Product and Engineering; Partner group: Receiving reviewers. Share the work: Product and Engineering → Receiving reviewers; Return feedback: Receiving reviewers → Product and Engineering.',
  ]);
  assert.equal(exchange.apply(result.view.preview.token).ok, true);
  const changed = structuredClone(studio.read().state);
  changed.arrangements[0].connectionBindings.reverse();
  [changed.arrangements[0].connectionBindings[0].connectionId, changed.arrangements[0].connectionBindings[1].connectionId]
    = [changed.arrangements[0].connectionBindings[1].connectionId, changed.arrangements[0].connectionBindings[0].connectionId];
  result = exchange.previewText(JSON.stringify(changed));
  assert.equal(result.ok, true); assert.deepEqual(result.view.preview.changes.arrangements.changed,
    [{ id: 'working-pod', fields: ['connectionBindings'] }]);
  assert.equal(result.view.preview.projection.result.plannedCommitmentCents, 120000);
  changed.arrangements = []; result = exchange.previewText(JSON.stringify(changed));
  assert.deepEqual(result.view.preview.changes.arrangements.removed, ['working-pod']);
  exchange.dispose(); editing.dispose();
});


test('delivery phases retain every team, handoff and working session while preserving authored stage context', () => {
  const plan = structuredClone(pod().read().state);
  plan.work.push({ ...plan.work[0], id: 'support', label: 'Prepare the receiving group' });
  plan.scoreSettings.stages = [
    { id: 'first-look', label: 'First look together', workIds: ['review'] },
    { id: 'readiness', label: 'Readiness review', workIds: ['review'] },
  ];
  const arrangement = projectCoordinationArrangements(plan).arrangements[0];
  const before = JSON.stringify({ arrangement, plan });
  const phases = projectDeliveryBoard({ arrangement, plan });
  assert.deepEqual(phases.map(phase => phase.label), ['Planning', 'Design', 'Implementation', 'Testing', 'Deployment', 'Maintenance']);
  assert.deepEqual([...new Set(phases.flatMap(phase => phase.teams.map(team => team.slotId)))].sort(), ['partner', 'pod']);
  assert.deepEqual(phases.flatMap(phase => phase.connections.map(connection => connection.slotId)).sort(), ['feedback', 'handoff']);
  const sessions = phases.flatMap(phase => phase.sessions);
  assert.deepEqual(sessions.map(session => session.work.id).sort(), ['review', 'support']);
  assert.deepEqual(sessions.find(session => session.work.id === 'review').stageLabels, ['First look together', 'Readiness review']);
  assert.deepEqual(sessions.find(session => session.work.id === 'support').stageLabels, []);
  assert.equal(JSON.stringify({ arrangement, plan }), before, 'the board reads existing work without accepting or moving it');
});

test('delivery phase placement follows record identity while visitor labels and handoff endpoints stay readable', () => {
  const plan = structuredClone(pod().read().state);
  plan.scoreSettings.stages = [{ id: 'review', label: 'Review the result', workIds: ['review'] }];
  const original = projectCoordinationArrangements(plan).arrangements[0];
  const signature = phases => phases.map(phase => ({ id: phase.id,
    teams: phase.teams.map(team => team.slotId),
    connections: phase.connections.map(connection => connection.slotId),
    sessions: phase.sessions.map(session => session.work.id) }));
  const before = signature(projectDeliveryBoard({ arrangement: original, plan }));
  plan.work[0].label = 'Operations conversation';
  plan.teams[0].label = 'New group name';
  plan.scoreSettings.stages[0].label = 'A visitor-written stage';
  plan.connections[0].sharedObject = 'Revised instructions';
  [plan.connections[0].senderTeamId, plan.connections[0].receiverTeamId]
    = [plan.connections[0].receiverTeamId, plan.connections[0].senderTeamId];
  const arrangement = projectCoordinationArrangements(plan).arrangements[0];
  const phases = projectDeliveryBoard({ arrangement, plan });
  assert.deepEqual(signature(phases), before, 'renaming and editing a connection preserve the authored phase grouping');
  const handoff = phases.flatMap(phase => phase.connections).find(connection => connection.slotId === 'handoff');
  assert.equal(handoff.connection.senderTeamId, 'working-pod-team-partner');
  assert.equal(handoff.connection.sharedObject, 'Revised instructions');
  const review = phases.find(phase => phase.id === 'testing').sessions[0];
  assert.equal(review.work.label, 'Operations conversation');
  assert.deepEqual(review.stageLabels, ['A visitor-written stage']);
  assert.equal(phases.flatMap(phase => phase.teams).find(team => team.slotId === 'pod').team.label, 'New group name');
});

test('unbound delivery teams follow their work stages and handoffs follow the receiving team', () => {
  const plan = structuredClone(pod().read().state);
  const arrangement = structuredClone(projectCoordinationArrangements(plan).arrangements[0]);
  const extraTeams = ['discovery', 'engineering', 'quality', 'support'].map(id => ({
    slotId: `custom-team:${id}`, slotLabel: id, team: { id, label: id, personIds: [] },
  }));
  arrangement.teams.push(...extraTeams);
  plan.work.push(...['discovery', 'engineering', 'quality'].map(id => ({ ...plan.work[0], id: `${id}-session`, teamId: id })));
  plan.scoreSettings.stages = [
    { id: 'understand', label: 'Understand', workIds: ['discovery-session'] },
    { id: 'build', label: 'Build', workIds: ['engineering-session'] },
    { id: 'review', label: 'Review', workIds: ['quality-session'] },
  ];
  arrangement.connections.push({ slotId: 'custom-handoff', connection: {
    id: 'custom-handoff', senderTeamId: 'engineering', receiverTeamId: 'quality', workIds: [],
  } });
  const phases = projectDeliveryBoard({ arrangement, plan });
  const placement = Object.fromEntries(phases.flatMap(phase => phase.teams
    .filter(row => row.slotId.startsWith('custom-team:')).map(row => [row.team.id, phase.id])));
  assert.deepEqual(placement, { discovery: 'planning', engineering: 'implementation', quality: 'testing', support: 'testing' });
  assert.equal(phases.find(phase => phase.connections.some(row => row.slotId === 'custom-handoff')).id, 'testing');
  assert.equal(phases.find(phase => phase.connections.some(row => row.slotId === 'handoff')).id, 'deployment',
    'the template keeps its existing authored handoff phase');
});

test('receiver lane placement keeps newly added teams and handoffs in their creation phase', () => {
  const plan = createShowcasePlan();
  const team = { id:'new-team', label:'New team 1', personIds:[], lifecycle:'active' };
  plan.teams.push(team);
  const connection = { id:'new-handoff', senderTeamId:plan.teams[0].id, receiverTeamId:team.id, workIds:[], sharedObject:'New handoff 1' };
  const arrangement = { teams:[{slotId:'custom-team:new-team', team}], connections:[{slotId:'custom-handoff:new-handoff',connection}] };
  const placements = { team:new Map([[team.id,'maintenance']]), connection:new Map([[connection.id,'design']]) };
  const phases = projectDeliveryBoard({arrangement,plan,placements});
  assert.equal(phases.find(phase => phase.teams.some(row => row.team.id === team.id)).id,'maintenance');
  assert.equal(phases.find(phase => phase.connections.some(row => row.connection.id === connection.id)).id,'design');
  assert.equal(Object.hasOwn(team,'phaseId'),false,'placement stays with this receiver rather than adding an exported team field');
});
