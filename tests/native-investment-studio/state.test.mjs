import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';

function changedReview(projection, overrides = {}) {
  return { ...projection.state.work.find(row => row.id === 'review'), ...overrides };
}

function expectHeld(result, projection, code) {
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
  assert.strictEqual(result.projection, projection);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.error));
}

test('read and capture expose one deeply immutable accepted projection', () => {
  const studio = createStudio();
  const accepted = studio.read();
  assert.strictEqual(studio.read(), accepted);
  assert.strictEqual(studio.capture(), accepted);
  assert.equal(accepted.result.plannedCommitmentCents, 120000);
  assert.equal(studio.exportText(), accepted.serialized);
  for (const value of [accepted, accepted.state, accepted.state.work,
    accepted.state.work[0], accepted.state.work[0].personIds, accepted.result,
    accepted.result.ledger[0].lines, accepted.result.ledger[0].lines[0]]) {
    assert.ok(Object.isFrozen(value));
  }
  assert.throws(() => { accepted.state.work[0].minutesPerOccurrence = 60; }, TypeError);
  assert.throws(() => { accepted.result.ledger[0].lines[0].cents = 1; }, TypeError);
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
});

test('accepted work replacement advances the revision and retains the earlier capture', () => {
  const studio = createStudio();
  const before = studio.capture();
  const replacement = changedReview(before, { minutesPerOccurrence: 45 });
  const result = studio.updateWork('review', replacement, before);
  assert.equal(result.ok, true);
  assert.ok(Object.isFrozen(result));
  assert.strictEqual(result.projection, studio.read());
  assert.notStrictEqual(result.projection, before);
  assert.equal(result.projection.state.revision, before.state.revision + 1);
  assert.equal(result.projection.state.work[0].id, 'review');
  // Four people, six sessions, three quarters of an hour, at $100/hour.
  assert.equal(result.projection.result.plannedCommitmentCents, 180000);
  assert.equal(before.state.work[0].minutesPerOccurrence, 30);
  assert.equal(before.result.plannedCommitmentCents, 120000);
  assert.equal(JSON.parse(before.serialized).revision, 0);
  replacement.minutesPerOccurrence = 1;
  assert.equal(studio.read().state.work[0].minutesPerOccurrence, 45);
});

test('every mutation rejects a stale accepted projection and retains the current owner', () => {
  const studio = createStudio();
  const stale = studio.read();
  const next = studio.updateWork('review', changedReview(stale, { occurrences: 12 }), stale);
  assert.equal(next.ok, true);
  const current = studio.read();
  assert.equal(current.result.plannedCommitmentCents, 240000);
  expectHeld(studio.updateWork('review', changedReview(stale), stale), current, 'stale-edit');
  expectHeld(studio.replace(createExamplePlan(), stale), current, 'stale-edit');
  expectHeld(studio.importText(stale.serialized, stale), current, 'stale-edit');
  assert.strictEqual(studio.read(), current);
});

test('equal-valued projections from another model instance cannot authorize edits', () => {
  const first = createStudio();
  const second = createStudio();
  const current = first.read();
  const foreign = second.read();
  assert.deepEqual(foreign, current);
  assert.notStrictEqual(foreign, current);
  expectHeld(first.replace(createExamplePlan(), foreign), current, 'stale-edit');
  expectHeld(first.importText(foreign.serialized, foreign), current, 'stale-edit');
  expectHeld(first.updateWork('review', changedReview(current), foreign), current, 'stale-edit');
  expectHeld(first.replace(createExamplePlan()), current, 'stale-edit');
});

test('negative duration and invalid imports preserve the exact accepted plan and export', () => {
  const studio = createStudio();
  const accepted = studio.read();
  const originalExport = studio.exportText();
  const negative = studio.updateWork('review', changedReview(accepted, { minutesPerOccurrence: -1 }), accepted);
  expectHeld(negative, accepted, 'integer');
  assert.equal(negative.error.path, 'plan.work[0].minutesPerOccurrence');
  expectHeld(studio.importText('{', accepted), accepted, 'json');
  const unsupported = { ...createExamplePlan(), schemaVersion: '99.0.0' };
  const rejected = studio.importText(JSON.stringify(unsupported), accepted);
  expectHeld(rejected, accepted, 'unsupported-contract');
  assert.equal(rejected.error.path, 'plan.schemaVersion');
  assert.strictEqual(studio.read(), accepted);
  assert.strictEqual(studio.capture(), accepted);
  assert.equal(studio.exportText(), originalExport);
});

test('invalid whole-plan replacement leaves accepted state available for a corrected candidate', () => {
  const studio = createStudio();
  const accepted = studio.read();
  const candidate = createExamplePlan();
  candidate.horizonWeeks = -1;
  expectHeld(studio.replace(candidate, accepted), accepted, 'integer');
  assert.equal(candidate.horizonWeeks, -1);
  candidate.horizonWeeks = 8;
  const result = studio.replace(candidate, accepted);
  assert.equal(result.ok, true);
  assert.equal(studio.read().state.horizonWeeks, 8);
  // The horizon is context; the explicit six occurrences retain their cost.
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
  candidate.horizonWeeks = 3;
  assert.equal(studio.read().state.horizonWeeks, 8);
});

test('work edits require the existing target identity and a full valid replacement', () => {
  const studio = createStudio();
  const accepted = studio.read();
  expectHeld(studio.updateWork('missing', changedReview(accepted), accepted), accepted, 'reference');
  expectHeld(studio.updateWork('review', changedReview(accepted, { id: 'different' }), accepted), accepted, 'target');
  expectHeld(studio.updateWork('review', { id: 'review', minutesPerOccurrence: 45 }, accepted), accepted, 'fields');
  let accessorReads = 0;
  const candidate = changedReview(accepted);
  Object.defineProperty(candidate, 'id', { enumerable: true, get() { accessorReads += 1; return 'review'; } });
  expectHeld(studio.updateWork('review', candidate, accepted), accepted, 'target');
  assert.equal(accessorReads, 0);
  assert.strictEqual(studio.read(), accepted);
});

test('each preparation owns its edge budget and exact-budget recovery retains the accepted snapshot', () => {
  const candidate = createExamplePlan();
  candidate.people = Array.from({ length: 128 }, (_, index) => ({
    id: `person-${index}`, label: `Person ${index}`, fundedMinutes: 0, rateCentsPerHour: 0,
  }));
  candidate.teams = Array.from({ length: 32 }, (_, index) => ({
    id: `team-${index}`, label: `Team ${index}`, personIds: candidate.people.map(person => person.id),
  }));
  candidate.work = [];
  candidate.practices = [];
  const studio = createStudio(candidate);
  const before = studio.capture();
  // The same 128 people have 32 separately owned memberships each: 4,096 edges.
  assert.equal(before.state.teams.flatMap(team => team.personIds).length, 4096);
  assert.equal(before.state.people.length, 128);

  const overBudget = structuredClone(candidate);
  overBudget.work = [{
    id: 'review', label: 'Review', teamId: 'team-0', personIds: ['person-0'],
    minutesPerOccurrence: 0, occurrences: 0, funding: 'additional', status: 'planned', timing: null,
  }];
  expectHeld(studio.replace(overBudget, before), before, 'reference-budget');
  const duplicate = structuredClone(candidate);
  duplicate.teams[31].personIds[127] = 'person-0';
  expectHeld(studio.replace(duplicate, before), before, 'duplicate-reference');
  assert.strictEqual(studio.read(), before);
  assert.equal(studio.exportText(), before.serialized);

  duplicate.teams[31].personIds[127] = 'person-127';
  duplicate.horizonWeeks = 8;
  const recovered = studio.replace(duplicate, before);
  assert.equal(recovered.ok, true);
  assert.strictEqual(studio.read(), recovered.projection);
  assert.notStrictEqual(recovered.projection, before);
  assert.equal(recovered.projection.state.horizonWeeks, 8);
  assert.equal(recovered.projection.state.teams.flatMap(team => team.personIds).length, 4096);
  assert.equal(recovered.projection.result.knownCommitmentCents, 0);
  assert.equal(before.state.horizonWeeks, 6);
  assert.deepEqual(JSON.parse(before.serialized), before.state);
});

test('whole-plan replacement refreshes the work index before later targeted edits', () => {
  const studio = createStudio();
  const accepted = studio.read();
  const candidate = createExamplePlan();
  const review = candidate.work[0];
  candidate.work = [{ ...review, id: 'preparation', label: 'Preparation', minutesPerOccurrence: 15, occurrences: 1 }, review];
  const replacement = studio.replace(candidate, accepted);
  assert.equal(replacement.ok, true);
  assert.equal(replacement.projection.result.plannedCommitmentCents, 130000);
  const result = studio.updateWork('review', changedReview(replacement.projection, { minutesPerOccurrence: 60 }), replacement.projection);
  assert.equal(result.ok, true);
  assert.deepEqual(result.projection.state.work.map(row => row.id), ['preparation', 'review']);
  assert.equal(result.projection.state.work[0].minutesPerOccurrence, 15);
  assert.equal(result.projection.state.work[1].minutesPerOccurrence, 60);
  assert.equal(result.projection.result.plannedCommitmentCents, 250000);
});

test('serialized import preserves its revision and values while invalidating old draft tokens', () => {
  const studio = createStudio();
  const before = studio.capture();
  const imported = createExamplePlan();
  imported.revision = 37;
  imported.work[0].minutesPerOccurrence = 60;
  const result = studio.importText(JSON.stringify(imported), before);
  assert.equal(result.ok, true);
  assert.equal(result.projection.state.revision, 37);
  assert.equal(result.projection.result.plannedCommitmentCents, 240000);
  const importedProjection = studio.capture();
  const serialized = studio.exportText();
  const roundtrip = studio.importText(serialized, importedProjection);
  assert.equal(roundtrip.ok, true);
  assert.deepEqual(roundtrip.projection, importedProjection);
  assert.notStrictEqual(roundtrip.projection, importedProjection);
  expectHeld(studio.updateWork('review', changedReview(importedProjection), importedProjection), roundtrip.projection, 'stale-edit');
  assert.equal(before.state.revision, 0);
  assert.equal(before.result.plannedCommitmentCents, 120000);
});

test('separate instances and caller-owned initial records keep independent state', () => {
  const candidate = createExamplePlan();
  const first = createStudio(candidate);
  const second = createStudio(candidate);
  const secondProjection = second.read();
  candidate.people[0].rateCentsPerHour = 1;
  candidate.work[0].personIds.splice(0, 1);
  candidate.practices[0].workIds.length = 0;
  assert.equal(first.read().result.plannedCommitmentCents, 120000);
  assert.equal(first.read().state.work[0].personIds.length, 4);
  assert.deepEqual(first.read().state.practices[0].workIds, ['review']);
  const updated = first.updateWork('review', changedReview(first.read(), { occurrences: 12 }), first.read());
  assert.equal(updated.ok, true);
  assert.equal(first.read().result.plannedCommitmentCents, 240000);
  assert.strictEqual(second.read(), secondProjection);
  assert.equal(secondProjection.result.plannedCommitmentCents, 120000);
});

test('replacement admission preserves a newer edit made by a direct-API descriptor callback', () => {
  const studio = createStudio();
  const before = studio.read();
  let nested;
  const candidate = new Proxy(createExamplePlan(), {
    getOwnPropertyDescriptor(target, key) {
      if (!nested) {
        nested = studio.updateWork('review', changedReview(before, { occurrences: 12 }), before);
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const outer = studio.replace(candidate, before);
  assert.equal(nested.ok, true);
  assert.equal(nested.projection.result.plannedCommitmentCents, 240000);
  expectHeld(outer, nested.projection, 'stale-edit');
  assert.strictEqual(studio.read(), nested.projection);
  assert.equal(studio.exportText(), nested.projection.serialized);
});

test('work admission preserves a reentrant replacement and its refreshed identity index', () => {
  const studio = createStudio();
  const before = studio.read();
  const replacement = createExamplePlan();
  replacement.work = [{ ...replacement.work[0], id: 'preparation', minutesPerOccurrence: 15, occurrences: 1 }];
  replacement.practices = [];
  let nested;
  const candidate = new Proxy(changedReview(before, { minutesPerOccurrence: 60 }), {
    getOwnPropertyDescriptor(target, key) {
      if (!nested) nested = studio.importText(JSON.stringify(replacement), before);
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const outer = studio.updateWork('review', candidate, before);
  assert.equal(nested.ok, true);
  assert.equal(nested.projection.result.plannedCommitmentCents, 10000);
  expectHeld(outer, nested.projection, 'stale-edit');
  assert.deepEqual(studio.read().state.work.map(row => row.id), ['preparation']);
  const revised = studio.updateWork('preparation', { ...nested.projection.state.work[0], minutesPerOccurrence: 30 }, nested.projection);
  assert.equal(revised.ok, true);
  assert.equal(revised.projection.result.plannedCommitmentCents, 20000);
});

test('import admits integer spellings while retaining the accepted plan after rounded numeric tokens', () => {
  const studio = createStudio();
  const before = studio.read();
  for (const token of ['-1e-999', '-0.1e-999', '1.0000000000000001', '29.9999999999999999999', '1.0', '3e1']) {
    const source = before.serialized.replace('"minutesPerOccurrence":30', `"minutesPerOccurrence":${token}`);
    expectHeld(studio.importText(source, before), before, 'integer-token');
    assert.equal(studio.exportText(), before.serialized);
  }
  const candidate = createExamplePlan();
  candidate.people[0].label = 'Review "1e999" \\ 1.0000000000000001 and 29.99';
  const result = studio.importText(JSON.stringify(candidate), before);
  assert.equal(result.ok, true);
  assert.equal(result.projection.state.people[0].label, candidate.people[0].label);
  assert.equal(result.projection.result.plannedCommitmentCents, 120000);
  const signedZero = result.projection.serialized.replace('"minutesPerOccurrence":30', '"minutesPerOccurrence":-0');
  const zeroResult = studio.importText(signedZero, result.projection);
  assert.equal(zeroResult.ok, true);
  assert.ok(Object.is(zeroResult.projection.state.work[0].minutesPerOccurrence, 0));
  assert.equal(zeroResult.projection.result.plannedCommitmentCents, 0);
});
