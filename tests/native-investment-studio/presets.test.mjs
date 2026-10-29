import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { listPresets, preparePreset } from '../../collaboration/native-investment-studio/presets.mjs';
import { parsePlan } from '../../collaboration/native-investment-studio/contract.mjs';

const VERSION = '1.0.0';
test('the finite native catalogue names its exact version and creates independently owned projections', () => {
  const list = listPresets();
  assert.deepEqual(list.map(row => row.id), ['shared-working-sessions', 'funded-working-sessions']);
  assert.equal(Object.isFrozen(list), true);
  assert.ok(list.every(row => Object.isFrozen(row) && row.version === VERSION && row.schemaVersion === '0.3.0'));
  const first = preparePreset(list[0].id, VERSION);
  const second = preparePreset(list[0].id, VERSION);
  assert.notStrictEqual(first.projection, second.projection);
  assert.notStrictEqual(first.projection.state.people, second.projection.state.people);
  assert.equal(first.projection.serialized, second.projection.serialized);
  assert.equal(Object.isFrozen(first), true);
  assert.throws(() => { first.projection.state.people[0].fundedMinutes = 60; }, TypeError);
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
