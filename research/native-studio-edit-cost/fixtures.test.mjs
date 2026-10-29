import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFixture, createRoundingFixture, FIXTURE_NAMES } from './fixtures.mjs';
import { createExamplePlan, preparePlan, parsePlan, PlanError } from './.local/app/collaboration/native-investment-studio/contract.mjs';
import { createStudio } from './.local/app/collaboration/native-investment-studio/state.mjs';

const encoder = new TextEncoder();
const POPULATIONS = Object.freeze({
  example: [4, 1, 1, 1, 4, 4, 1, 9, 1035],
  medium: [32, 8, 64, 64, 32, 256, 128, 416, 25017],
  caps: [128, 32, 256, 128, 512, 3072, 512, 4096, 120992],
  'near-byte': [128, 32, 256, 128, 512, 3072, 512, 4096, 523000],
});
const INITIAL_CENTS = Object.freeze({ example: 120000, medium: 7680000, caps: 92160000, 'near-byte': 92160000 });
const HOUR_CENTS = Object.freeze({ example: 240000, medium: 7800000, caps: 92520000, 'near-byte': 92520000 });

for (const name of FIXTURE_NAMES) {
  test(`${name}: fixture population and UTF-8 bytes match its literal research contract`, () => {
    const fixture = createFixture(name, createExamplePlan);
    const { plan, facts } = fixture;
    const actual = preparePlan(plan);
    const teamReferences = plan.teams.reduce((n, row) => n + row.personIds.length, 0);
    const participantReferences = plan.work.reduce((n, row) => n + row.personIds.length, 0);
    const practiceReferences = plan.practices.reduce((n, row) => n + row.workIds.length, 0);
    assert.deepEqual([
      plan.people.length, plan.teams.length, plan.work.length, plan.practices.length,
      teamReferences, participantReferences, practiceReferences,
      teamReferences + participantReferences + practiceReferences,
      encoder.encode(actual.serialized).byteLength,
    ], POPULATIONS[name]);
    assert.deepEqual(Object.values(facts), POPULATIONS[name]);
    assert.equal(actual.result.knownCommitmentCents, INITIAL_CENTS[name]);
    assert.equal(actual.result.standing, 'priced');
    assert.equal(actual.result.fundedKnownCents, 0);
    assert.equal(actual.result.allocatedKnownCents, 0);
    assert.equal(fixture.expectedByMinutes[30].cents, INITIAL_CENTS[name]);
    assert.equal(fixture.expectedByMinutes[60].cents, HOUR_CENTS[name]);
    assert.equal(plan.work.find(row => row.id === fixture.workId).minutesPerOccurrence, 30);
    assert.equal(plan.work.find(row => row.id === fixture.workId).occurrences, 6);
    assert.deepEqual(parsePlan(actual.serialized), actual);
    assert.equal(preparePlan(createFixture(name, createExamplePlan).plan).serialized, actual.serialized,
      'repeated generation retains exact canonical serialization');
  });

  test(`${name}: all declared duration oracles reconcile independent money and participant minutes`, () => {
    const fixture = createFixture(name, createExamplePlan);
    const initial = preparePlan(fixture.plan);
    for (const [rawMinutes, expected] of Object.entries(fixture.expectedByMinutes)) {
      const studio = createStudio(fixture.plan);
      const row = studio.read().state.work.find(row => row.id === fixture.workId);
      const result = studio.updateWork(fixture.workId, { ...row, minutesPerOccurrence: Number(rawMinutes) }, studio.read());
      assert.equal(result.ok, true, `${rawMinutes} minute edit is admitted`);
      assert.equal(result.projection.result.knownCommitmentCents, expected.cents, `${rawMinutes} minute amount`);
      assert.equal(result.projection.result.capacity.reduce((sum, person) => sum + person.additionalMinutes, 0), expected.participantMinutes,
        `${rawMinutes} minute participant effort`);
      assert.equal(result.projection.state.revision, 1);
    }
    assert.deepEqual(preparePlan(fixture.plan), initial, 'measurement edits leave the reproducible input intact');
  });
}

test('reference-cap fixture rejects exactly one extra admitted participant reference', () => {
  const { plan } = createFixture('caps', createExamplePlan);
  const row = plan.work[0];
  const owner = plan.teams.find(team => team.id === row.teamId);
  const extra = owner.personIds.find(id => !row.personIds.includes(id));
  assert.ok(extra, 'the extra person is a legitimate team member');
  row.personIds.push(extra);
  assert.throws(() => preparePlan(plan), error => error instanceof PlanError && error.code === 'reference-budget');
});

test('collection-cap fixture rejects a 129th person before reference traversal', () => {
  const { plan } = createFixture('caps', createExamplePlan);
  plan.people.push({ id: 'extra-person', label: 'Extra person', fundedMinutes: 0, rateCentsPerHour: 10000 });
  assert.throws(() => preparePlan(plan), error => error instanceof PlanError && error.code === 'collection' && error.path === 'plan.people');
});

test('near-byte fixture retains bounded fields and separates UTF-8 bytes from JavaScript length', () => {
  const { plan } = createFixture('near-byte', createExamplePlan);
  const serialized = preparePlan(plan).serialized;
  const byteLength = encoder.encode(serialized).byteLength;
  assert.equal(byteLength, 523000);
  assert.ok(serialized.length < byteLength);
  for (const row of [...plan.people, ...plan.teams, ...plan.work]) {
    assert.equal(row.label.length, 120);
    assert.equal(row.id.length, 64);
  }
  const boundary = serialized + ' '.repeat(524288 - byteLength);
  assert.equal(encoder.encode(boundary).byteLength, 524288);
  assert.equal(parsePlan(boundary).serialized, serialized);
  const outside = boundary + ' ';
  assert.equal(encoder.encode(outside).byteLength, 524289);
  assert.throws(() => parsePlan(outside), error => error instanceof PlanError && error.code === 'bytes' && error.path === 'import');
});

test('funding pools retain two cents while a displayed work line crosses its rounding boundary', () => {
  const fixture = createRoundingFixture(createExamplePlan);
  const studio = createStudio(fixture.plan);
  const initial = studio.read();
  assert.equal(initial.result.knownCommitmentCents, 2);
  assert.equal(initial.result.allocatedKnownCents, 1);
  assert.equal(initial.result.lineRoundingAdjustments.additionalCents, 1);
  const row = initial.state.work.find(work => work.id === fixture.workId);
  const result = studio.updateWork(fixture.workId, { ...row, minutesPerOccurrence: 30 }, initial);
  assert.equal(result.ok, true);
  assert.equal(result.projection.result.knownCommitmentCents, 2);
  assert.equal(result.projection.result.allocatedKnownCents, 1);
  assert.equal(result.projection.result.lineRoundingAdjustments.additionalCents, 0);
  assert.deepEqual(fixture.expected, { initialCents: 2, edited30Cents: 2, allocatedCents: 1,
    initialAdditionalAdjustment: 1, editedAdditionalAdjustment: 0 });
});

test('each fixture build owns its arrays and unknown names receive a clear error', () => {
  const first = createFixture('medium', createExamplePlan);
  const second = createFixture('medium', createExamplePlan);
  first.plan.work[0].personIds.pop();
  first.plan.people[0].label = 'Changed only here';
  assert.equal(second.plan.work[0].personIds.length, 4);
  assert.equal(second.plan.people[0].label, 'Person 1');
  assert.throws(() => createFixture('unknown', createExamplePlan), TypeError);
  assert.throws(() => createFixture('example', null), TypeError);
});
