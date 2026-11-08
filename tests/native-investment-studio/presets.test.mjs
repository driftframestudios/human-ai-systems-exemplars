import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createShowcasePlan, listPresets, preparePreset } from '../../collaboration/native-investment-studio/presets.mjs';
import { parsePlan, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';

const VERSION = '1.0.0';
test('the live People example adds two distinct contributions without changing investment', () => {
  const baseline = createStudio(createShowcasePlan()).read();
  const populated = createStudio(createShowcasePlan({ peopleExamples: true })).read();
  assert.deepEqual(populated.state.contributions.slice(1).map(row => [row.categoryId, row.receiverPersonId, row.decisionOwnerPersonId, row.workIds]), [
    ['source-retrieval', 'leo', 'maya', ['research']],
    ['draft-artifacts', 'ari', 'maya', ['pairing', 'review']],
  ]);
  assert.deepEqual(populated.result, baseline.result);
  assert.equal(parsePlan(populated.serialized).serialized, populated.serialized);
});

test('the finite native catalogue names its exact version and creates independently owned projections', () => {
  const list = listPresets();
  assert.deepEqual(list.map(row => row.id), ['service-request-pilot', 'service-request-rollout', 'discovery-alignment', 'data-platform-migration', 'regulated-workflow', 'ai-assisted-product', 'enterprise-integration', 'operational-modernization', 'shared-working-sessions', 'funded-working-sessions']);
  assert.equal(Object.isFrozen(list), true);
  assert.ok(list.every(row => Object.isFrozen(row) && row.version === VERSION && row.schemaVersion === '0.9.0'));
  const first = preparePreset(list[0].id, VERSION);
  const second = preparePreset(list[0].id, VERSION);
  assert.notStrictEqual(first.projection, second.projection);
  assert.notStrictEqual(first.projection.state.people, second.projection.state.people);
  assert.equal(first.projection.serialized, second.projection.serialized);
  assert.equal(Object.isFrozen(first), true);
  assert.throws(() => { first.projection.state.people[0].fundedMinutes = 60; }, TypeError);
});

test('the synthetic pilot joins named people, shared work and human review with a literal investment trace', () => {
  const { projection } = preparePreset('service-request-pilot', VERSION);
  const { state, result } = projection;
  assert.deepEqual(state.teams.map(row => row.label), ['Product and Research', 'Engineering', 'Quality and Operations']);
  assert.deepEqual(state.people.map(row => [row.id, row.role.functionId, row.role.decisionId]), [
    ['maya', 'product-program', 'approves'], ['leo', 'design-research', 'recommends'],
    ['ari', 'engineering', 'recommends'], ['jules', 'engineering', 'operates'],
    ['noor', 'quality-regulatory', 'recommends'], ['sam', 'ops-support', 'operates'],
  ]);
  assert.equal(state.purpose.accountableOwner, 'The product lead decides pilot scope and readiness after the human reviews.');
  assert.deepEqual(state.contributions.map(row => [row.receiverPersonId, row.decisionOwnerPersonId, row.workIds]), [['leo', 'maya', ['research', 'review']]]);
  assert.deepEqual(state.connections.map(row => [row.id, row.senderTeamId, row.receiverTeamId, row.receiverPersonId]), [
    ['scope', 'product', 'engineering', 'ari'], ['readiness', 'engineering', 'operations', 'noor'], ['decision', 'operations', 'product', 'maya'],
  ]);
  // Funded: 4×120 + 4×100 + 6×140 + 6×120 + 2×110 + 2×90 = 2,840.
  // Additional: 2×(120+140+110) + 2×(110+90) = 1,140.
  assert.equal(result.fundedKnownCents, 284000);
  assert.equal(result.additionalKnownCents, 114000);
  assert.equal(result.allocatedKnownCents, 148000);
  assert.equal(result.plannedCommitmentCents, 398000);
  assert.deepEqual(result.capacity.map(row => [row.personId, row.remainingMinutes]), [
    ['maya', 120], ['leo', 120], ['ari', 120], ['jules', 120], ['noor', 120], ['sam', 120],
  ]);
  assert.equal(parsePlan(projection.serialized).serialized, projection.serialized);
  const independent = createShowcasePlan(); independent.people[0].label = 'Changed in this copy';
  assert.equal(createShowcasePlan().people[0].label, 'Product lead');
  assert.equal(createStudio().read().result.plannedCommitmentCents, 120000, 'the explicit showcase entrance preserves the smaller teaching default');
});

test('four longer reviews cost one extra hour per reviewer, and funding the time exposes a resolvable capacity tradeoff', () => {
  const plan = createShowcasePlan();
  plan.work[0].minutesPerOccurrence = 45;
  let projection = preparePlan(plan);
  // 15 more minutes × 4 reviews × ($120+$140+$110)/hour = $370.
  assert.equal(projection.result.plannedCommitmentCents, 435000);
  assert.equal(projection.result.additionalKnownCents, 151000);
  plan.work[0].funding = 'allocated';
  projection = preparePlan(plan);
  assert.equal(projection.result.knownCommitmentCents, 324000);
  assert.equal(projection.result.standing, 'incomplete');
  assert.deepEqual(projection.result.obligations.filter(row => row.code === 'allocated-capacity-exceeded').map(row => row.personId), ['maya', 'ari', 'noor']);
  assert.deepEqual(projection.result.capacity.filter(row => ['maya', 'ari', 'noor'].includes(row.personId)).map(row => row.remainingMinutes), [-60, -60, -60]);
  for (const person of plan.people) if (['maya', 'ari', 'noor'].includes(person.id)) person.fundedMinutes += 60;
  projection = preparePlan(plan);
  assert.equal(projection.result.plannedCommitmentCents, 361000);
  assert.equal(projection.result.allocatedKnownCents, 259000);
  plan.connections.find(row => row.id === 'readiness').status = 'paused';
  const paused = preparePlan(plan);
  assert.equal(paused.result.plannedCommitmentCents, 361000, 'review status retains the planned supporting work');
  assert.deepEqual(paused.observations.filter(row => row.code === 'paused-connection'), [{ code: 'paused-connection', collection: 'connections', id: 'readiness' }]);
});

test('shared sessions price four people for six half-hours at $100 per hour', () => {
  const { projection, preset } = preparePreset('shared-working-sessions', VERSION);
  assert.equal(projection.result.fundedKnownCents, 0);
  assert.equal(projection.result.additionalKnownCents, 120000);
  assert.equal(projection.result.allocatedKnownCents, 0);
  assert.equal(projection.result.plannedCommitmentCents, 120000);
  assert.deepEqual(projection.result.ledger[0].lines.map(row => row.minutes), [180, 180, 180, 180]);
  assert.equal(preset.modelVersion, '0.1.0');
  assert.equal(parsePlan(projection.serialized).serialized, projection.serialized);
});

test('funded sessions count the same $1,200 once and exhaust each participant’s three funded hours', () => {
  const { projection } = preparePreset('funded-working-sessions', VERSION);
  assert.equal(projection.result.fundedKnownCents, 120000);
  assert.equal(projection.result.additionalKnownCents, 0);
  assert.equal(projection.result.allocatedKnownCents, 120000);
  assert.equal(projection.result.plannedCommitmentCents, 120000);
  assert.deepEqual(projection.result.capacity.map(row => row.remainingMinutes), [0, 0, 0, 0]);
  assert.equal(projection.result.obligations.some(row => row.code === 'allocated-capacity-exceeded'), false);
});

test('preset admission requires a listed identity and explicit version', () => {
  for (const id of ['constructor', '__proto__', '', null, { toString() { throw new Error('coercion'); } }]) {
    assert.throws(() => preparePreset(id, VERSION), error => error.code === 'preset');
  }
  for (const version of [undefined, '0.0.0', 1]) {
    assert.throws(() => preparePreset('shared-working-sessions', version), error => error.code === 'preset-version');
  }
});


test('the live showcase can include a paused follow-up without changing the primary workflow or amount', () => {
  const base = preparePlan(createShowcasePlan()), example = preparePlan(createShowcasePlan({ pausedExample:true }));
  const paused = example.state.work.filter(row => row.status === 'paused');
  assert.equal(paused.length, 1); assert.equal(paused[0].label, 'Explore a second service route');
  assert.deepEqual(example.state.work.filter(row => row.id !== paused[0].id), base.state.work);
  assert.ok(example.state.scoreSettings.cadence.placements.some(row => row.workId === paused[0].id));
  assert.equal(example.result.knownCommitmentCents, base.result.knownCommitmentCents);
});
