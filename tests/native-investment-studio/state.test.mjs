import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { HISTORY, LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

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

test('work previews prepare exact prospective amounts while accepted identity and exchange stay intact', () => {
  const studio = createStudio();
  const before = studio.read();
  const candidate = changedReview(before, { minutesPerOccurrence: 90 });
  const preview = studio.previewWork('review', candidate, before);
  assert.equal(preview.ok, true);
  assert.equal(preview.projection.result.knownCommitmentCents, 360000);
  assert.equal(preview.projection.state.revision, 1);
  assert.ok(Object.isFrozen(preview.projection));
  assert.strictEqual(studio.read(), before);
  assert.strictEqual(studio.capture(), before);
  assert.equal(studio.exportText(), before.serialized);
  expectHeld(studio.updateWork('review', candidate, preview.projection), before, 'stale-edit');
  const accepted = studio.updateWork('review', candidate, before);
  assert.equal(accepted.ok, true);
  assert.deepEqual(accepted.projection, preview.projection);
  assert.notStrictEqual(accepted.projection, preview.projection);
  expectHeld(studio.previewWork('review', candidate, before), accepted.projection, 'stale-edit');
});

test('work preview admission retains target, bounds, foreign-owner, and reentrant replacement checks', () => {
  const studio = createStudio();
  const before = studio.read();
  expectHeld(studio.previewWork('missing', changedReview(before), before), before, 'reference');
  expectHeld(studio.previewWork('review', changedReview(before, { id: 'other' }), before), before, 'target');
  expectHeld(studio.previewWork('review', changedReview(before, { minutesPerOccurrence: -1 }), before), before, 'integer');
  expectHeld(studio.previewWork('review', changedReview(before), createStudio().read()), before, 'stale-edit');
  let nested;
  const candidate = new Proxy(changedReview(before, { minutesPerOccurrence: 90 }), {
    getOwnPropertyDescriptor(target, key) {
      if (!nested) nested = studio.updateWork('review', changedReview(before, { occurrences: 12 }), before);
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const preview = studio.previewWork('review', candidate, before);
  assert.equal(nested.ok, true);
  expectHeld(preview, nested.projection, 'stale-edit');
  assert.strictEqual(studio.read(), nested.projection);
  assert.equal(studio.exportText(), nested.projection.serialized);
});

test('preview recomputes exact person funding pools rather than adding a rounded line delta', () => {
  const plan = createExamplePlan();
  plan.people = [{ id: 'one', label: 'One', fundedMinutes: 60, rateCentsPerHour: 1 }];
  plan.teams[0].personIds = ['one'];
  const row = { ...plan.work[0], personIds: ['one'], occurrences: 1 };
  plan.work = [
    { ...row, id: 'allocated', funding: 'allocated', minutesPerOccurrence: 58 },
    { ...row, id: 'first', funding: 'additional', minutesPerOccurrence: 29 },
    { ...row, id: 'second', funding: 'additional', minutesPerOccurrence: 29 },
  ];
  plan.practices = [];
  const studio = createStudio(plan);
  const before = studio.read();
  assert.equal(before.result.knownCommitmentCents, 2);
  assert.equal(before.result.fundedKnownCents, 1);
  assert.equal(before.result.allocatedKnownCents, 1);
  assert.equal(before.result.ledger[1].lines[0].cents, 0);
  assert.equal(before.result.lineRoundingAdjustments.additionalCents, 1);
  const preview = studio.previewWork('first', { ...before.state.work[1], minutesPerOccurrence: 30 }, before);
  assert.equal(preview.ok, true);
  assert.equal(preview.projection.result.knownCommitmentCents, 2);
  assert.equal(preview.projection.result.fundedKnownCents, 1);
  assert.equal(preview.projection.result.allocatedKnownCents, 1);
  assert.equal(preview.projection.result.ledger[1].lines[0].cents, 1);
  assert.equal(preview.projection.result.lineRoundingAdjustments.additionalCents, 0);
  assert.strictEqual(studio.read(), before);
  assert.equal(studio.exportText(), before.serialized);
});


function changedPerson(projection, overrides = {}, id = 'product-one') {
  return { ...projection.state.people.find(row => row.id === id), ...overrides };
}

function assertAcceptance(studio, previous, sequence) {
  const current = studio.readAcceptance();
  assert.equal(current.sequence, sequence);
  assert.strictEqual(current.instance, previous.instance);
  assert.notStrictEqual(current.token, previous.token);
  assert.ok(Object.isFrozen(current));
  return current;
}

test('history restores the literal $1200, $1203 and $1304 amounts with fresh accepted identities', () => {
  const studio = createStudio();
  const initial = studio.read();
  const firstAcceptance = studio.readAcceptance();
  assert.equal(firstAcceptance.sequence, 0);
  assert.equal(initial.result.plannedCommitmentCents, 120000);
  const rate = studio.updatePerson('product-one', changedPerson(initial, { rateCentsPerHour: 10100 }), initial);
  assert.equal(rate.ok, true);
  assert.equal(rate.projection.result.plannedCommitmentCents, 120300);
  const secondAcceptance = assertAcceptance(studio, firstAcceptance, 1);
  const funded = studio.updatePerson('product-one', changedPerson(rate.projection, { fundedMinutes: 60 }), rate.projection);
  assert.equal(funded.ok, true);
  assert.equal(funded.projection.result.plannedCommitmentCents, 130400);
  assertAcceptance(studio, secondAcceptance, 2);
  assert.deepEqual(studio.readHistory(), { undoCount: 2, redoCount: 0, limit: 20 });
  const undoOne = studio.undo(funded.projection);
  assert.equal(undoOne.ok, true);
  assert.equal(undoOne.projection.result.plannedCommitmentCents, 120300);
  assert.notStrictEqual(undoOne.projection, rate.projection);
  assert.strictEqual(undoOne.projection.state, rate.projection.state, 'immutable retained payloads may share data');
  assert.equal(studio.readAcceptance().sequence, 3);
  const undoTwo = studio.undo(undoOne.projection);
  assert.equal(undoTwo.projection.result.plannedCommitmentCents, 120000);
  assert.notStrictEqual(undoTwo.projection, initial);
  assert.equal(studio.readAcceptance().sequence, 4);
  expectHeld(studio.updateWork('review', changedReview(initial, { occurrences: 8 }), initial), undoTwo.projection, 'stale-edit');
  expectHeld(studio.undo(initial), undoTwo.projection, 'stale-edit');
  expectHeld(studio.redo(initial), undoTwo.projection, 'stale-edit');
  for (const [amount, revision, sequence] of [[120300, 1, 5], [130400, 2, 6]]) {
    const restored = studio.redo(studio.read());
    assert.equal(restored.ok, true);
    assert.equal(restored.projection.result.plannedCommitmentCents, amount);
    assert.equal(restored.projection.state.revision, revision);
    assert.equal(studio.readAcceptance().sequence, sequence);
    assert.deepEqual(JSON.parse(studio.exportText()), restored.projection.state);
  }
  assert.equal(funded.projection.result.plannedCommitmentCents, 130400, 'earlier captures retain their exact values');
});

test('the configured history bound retains the most recent two predecessor plans', () => {
  const studio = createStudio(undefined, { historyLimit: 2 });
  for (const rateCentsPerHour of [10100, 10200, 10300]) {
    const base = studio.read();
    assert.equal(studio.updatePerson('product-one', changedPerson(base, { rateCentsPerHour }), base).ok, true);
  }
  assert.deepEqual(studio.readHistory(), { undoCount: 2, redoCount: 0, limit: 2 });
  for (const amount of [120600, 120300]) {
    const restored = studio.undo(studio.read());
    assert.equal(restored.ok, true);
    assert.equal(restored.projection.result.plannedCommitmentCents, amount);
  }
  const current = studio.read(); const acceptance = studio.readAcceptance();
  expectHeld(studio.undo(current), current, 'history-empty');
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), { undoCount: 0, redoCount: 2, limit: 2 });
  assert.ok(Object.isFrozen(studio.readHistory()));
});

test('validated work/person no-ops and previews preserve Redo while a material edit starts a new branch', () => {
  const studio = createStudio();
  const initial = studio.read();
  studio.updateWork('review', changedReview(initial, { occurrences: 7 }), initial);
  studio.undo(studio.read());
  const base = studio.read(); const acceptance = studio.readAcceptance(); const history = studio.readHistory();
  for (const command of ['updateWork', 'previewWork']) {
    const result = studio[command]('review', changedReview(base), base);
    assert.equal(result.ok, true); assert.strictEqual(result.projection, base);
  }
  for (const command of ['updatePerson', 'previewPerson']) {
    const result = studio[command]('product-one', changedPerson(base), base);
    assert.equal(result.ok, true); assert.strictEqual(result.projection, base);
  }
  assert.equal(studio.previewWork('review', changedReview(base, { occurrences: 12 }), base).projection.result.plannedCommitmentCents, 240000);
  assert.equal(studio.previewPerson('product-one', changedPerson(base, { rateCentsPerHour: 10100 }), base).projection.result.plannedCommitmentCents, 120300);
  expectHeld(studio.updateWork('review', changedReview(base, { occurrences: -1 }), base), base, 'integer');
  expectHeld(studio.importText('{', base), base, 'json');
  assert.strictEqual(studio.read(), base);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), history);
  const changed = studio.updateWork('review', changedReview(base, { occurrences: 8 }), base);
  assert.equal(changed.ok, true);
  assert.equal(changed.projection.result.plannedCommitmentCents, 160000);
  assert.equal(studio.readAcceptance().sequence, acceptance.sequence + 1);
  assert.deepEqual(studio.readHistory(), { undoCount: 1, redoCount: 0, limit: 20 });
  expectHeld(studio.redo(studio.read()), studio.read(), 'history-empty');
});

test('complete admitted replacement and import advance acceptance even for equal payloads and revisions', () => {
  const studio = createStudio();
  for (const command of ['replace', 'importText']) {
    const before = studio.read(); const acceptance = studio.readAcceptance();
    const result = studio[command](command === 'replace' ? before.state : before.serialized, before);
    assert.equal(result.ok, true);
    assert.deepEqual(result.projection, before);
    assert.notStrictEqual(result.projection, before);
    assertAcceptance(studio, acceptance, acceptance.sequence + 1);
    expectHeld(studio.updatePerson('product-one', changedPerson(before), before), result.projection, 'stale-edit');
  }
  studio.undo(studio.read());
  assert.equal(studio.readHistory().redoCount, 1);
  const current = studio.read();
  studio.importText(current.serialized, current);
  assert.equal(studio.readHistory().redoCount, 0, 'accepting a whole imported plan starts a new history branch');
});

test('baseline capture keeps chronology and Redo while restoration preserves partial pricing with a fresh acceptance', () => {
  const studio = createStudio(); const initial = studio.read();
  assert.equal(studio.readBaseline(), null);
  expectHeld(studio.restoreBaseline(initial), initial, 'baseline-empty');
  const partial = studio.updatePerson('product-one', changedPerson(initial, { rateCentsPerHour: null }), initial).projection;
  assert.equal(partial.result.plannedCommitmentCents, null);
  assert.equal(partial.result.knownCommitmentCents, 90000);
  const zero = studio.updatePerson('product-one', changedPerson(partial, { rateCentsPerHour: 0 }), partial).projection;
  assert.equal(zero.result.plannedCommitmentCents, 90000);
  const undone = studio.undo(zero).projection;
  const acceptance = studio.readAcceptance(); const history = studio.readHistory();
  assert.equal(studio.setBaseline(undone).ok, true);
  const baseline = studio.readBaseline();
  assert.ok(Object.isFrozen(baseline));
  assert.strictEqual(baseline.projection, undone);
  assert.strictEqual(baseline.acceptance, acceptance);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), history);
  studio.setBaseline(undone);
  assert.notStrictEqual(studio.readBaseline().token, baseline.token, 'capture metadata has its own identity');
  studio.redo(undone);
  const beforeRestore = studio.readAcceptance();
  const restored = studio.restoreBaseline(studio.read());
  assert.equal(restored.ok, true);
  assert.notStrictEqual(restored.projection, undone);
  assert.equal(restored.projection.state.people[0].rateCentsPerHour, null);
  assert.equal(restored.projection.result.plannedCommitmentCents, null);
  assert.equal(restored.projection.result.knownCommitmentCents, 90000);
  assertAcceptance(studio, beforeRestore, beforeRestore.sequence + 1);
  expectHeld(studio.updatePerson('product-one', changedPerson(undone), undone), restored.projection, 'stale-edit');
  const samePayloadAcceptance = studio.readAcceptance();
  assert.equal(studio.restoreBaseline(studio.read()).ok, true);
  assertAcceptance(studio, samePayloadAcceptance, samePayloadAcceptance.sequence + 1);
});

test('baseline and history reject stale or foreign projections without changing their current records', () => {
  const studio = createStudio(); const initial = studio.read();
  studio.setBaseline(initial); const baseline = studio.readBaseline();
  studio.updateWork('review', changedReview(initial, { occurrences: 7 }), initial);
  const current = studio.read(); const acceptance = studio.readAcceptance(); const history = studio.readHistory();
  const foreign = createStudio().read();
  for (const command of ['undo', 'redo', 'setBaseline', 'restoreBaseline']) {
    for (const expected of [initial, foreign, undefined]) expectHeld(studio[command](expected), current, 'stale-edit');
  }
  assert.strictEqual(studio.readBaseline(), baseline);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), history);
  assert.notStrictEqual(createStudio().readAcceptance().instance, acceptance.instance);
});

test('zero retention still supports one explicit baseline and complete accepted chronology', () => {
  const studio = createStudio(undefined, { historyLimit: 0 }); const initial = studio.read();
  studio.setBaseline(initial);
  const changed = studio.updateWork('review', changedReview(initial, { occurrences: 7 }), initial).projection;
  assert.deepEqual(studio.readHistory(), { undoCount: 0, redoCount: 0, limit: 0 });
  expectHeld(studio.undo(changed), changed, 'history-empty');
  assert.equal(studio.restoreBaseline(changed).projection.result.plannedCommitmentCents, 120000);
  assert.equal(studio.readAcceptance().sequence, 2);
  assert.deepEqual(studio.readHistory(), { undoCount: 0, redoCount: 0, limit: 0 });
});

test('history configuration admits bounded data values and preserves getter-free construction', () => {
  assert.equal(createStudio().readHistory().limit, HISTORY.defaultEntries);
  assert.equal(createStudio(undefined, { historyLimit: HISTORY.maxEntries }).readHistory().limit, 100);
  for (const options of [null, [], true, new Date(), { historyLimit: -1 }, { historyLimit: 101 },
    { historyLimit: 1.5 }, { historyLimit: NaN }, { historyLimit: Infinity }, { historyLimit: '2' },
    { historyLimit: undefined }, { historyLimit: 2, extra: true }, { [Symbol('extra')]: 1 }]) {
    assert.throws(() => createStudio(undefined, options), { code: 'options' });
  }
  let reads = 0;
  assert.throws(() => createStudio(undefined, { get historyLimit() { reads += 1; return 2; } }), { code: 'options' });
  assert.equal(reads, 0);
  const studio = createStudio();
  for (let index = 0; index < 21; index += 1) {
    const base = studio.read();
    assert.equal(studio.updateWork('review', changedReview(base, { label: `Review ${index}` }), base).ok, true);
  }
  assert.equal(studio.readHistory().undoCount, 20);
});

test('a work no-op admits the entire closed row before preserving identity at the revision cap', () => {
  const plan = createExamplePlan(); plan.revision = LIMITS.revision; plan.work[0].minutesPerOccurrence = 0;
  const studio = createStudio(plan); const before = studio.read(); const acceptance = studio.readAcceptance();
  for (const command of ['updateWork', 'previewWork']) {
    const result = studio[command]('review', changedReview(before, { minutesPerOccurrence: -0 }), before);
    assert.equal(result.ok, true); assert.strictEqual(result.projection, before);
    expectHeld(studio[command]('review', changedReview(before, { occurrences: 8 }), before), before, 'integer');
  }
  let reads = 0;
  const getter = changedReview(before);
  Object.defineProperty(getter, 'label', { enumerable: true, get() { reads += 1; return before.state.work[0].label; } });
  const entryGetter = changedReview(before, { personIds: [...before.state.work[0].personIds] });
  Object.defineProperty(entryGetter.personIds, '0', { enumerable: true, get() { reads += 1; return 'product-one'; } });
  const sparse = changedReview(before, { personIds: ['product-one', , 'engineering-one'] });
  for (const [row, code] of [[changedReview(before, { extra: true }), 'fields'], [getter, 'data-property'],
    [entryGetter, 'data-property'], [sparse, 'collection'], [changedReview(before, { personIds: [] }), 'reference-count'],
    [changedReview(before, { personIds: ['product-one', 'product-one'] }), 'duplicate-reference'],
    [changedReview(before, { personIds: new Array(LIMITS.people + 1) }), 'collection'],
    [changedReview(before, { funding: 'unknown' }), 'choice'], [changedReview(before, { timing: {} }), 'timing-version']]) {
    expectHeld(studio.updateWork('review', row, before), before, code);
  }
  assert.equal(reads, 0);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.equal(studio.readHistory().undoCount, 0);
});

test('changed work preserves reference, membership and authored participation order', () => {
  const studio = createStudio(); const before = studio.read();
  for (const [row, code] of [[changedReview(before, { teamId: 'missing' }), 'reference'],
    [changedReview(before, { personIds: ['missing'] }), 'reference']]) {
    expectHeld(studio.updateWork('review', row, before), before, code);
  }
  const plan = createExamplePlan();
  plan.teams.push({ id: 'other', label: 'Other', personIds: [] });
  const owned = createStudio(plan); const base = owned.read();
  expectHeld(owned.updateWork('review', changedReview(base, { teamId: 'other' }), base), base, 'team-membership');
  const reordered = studio.updateWork('review', changedReview(before, { personIds: [...before.state.work[0].personIds].reverse() }), before);
  assert.equal(reordered.ok, true);
  assert.notStrictEqual(reordered.projection, before, 'authored participant order is a material presentation change');
  assert.equal(reordered.projection.result.plannedCommitmentCents, 120000);
  assert.deepEqual(reordered.projection.state.work[0].personIds, ['engineering-two', 'engineering-one', 'product-two', 'product-one']);
});

test('Undo, Redo and baseline restoration rebuild both identity indexes before the next edit', () => {
  const studio = createStudio(); const initial = studio.read(); studio.setBaseline(initial);
  const replacement = createExamplePlan();
  replacement.people.reverse();
  replacement.work = [{ ...replacement.work[0], id: 'preparation', minutesPerOccurrence: 15, occurrences: 1 }];
  replacement.practices = [];
  studio.replace(replacement, initial);
  const restored = studio.undo(studio.read()).projection;
  assert.equal(studio.previewWork('review', changedReview(restored, { minutesPerOccurrence: 60 }), restored).projection.result.plannedCommitmentCents, 240000);
  assert.equal(studio.previewPerson('product-one', changedPerson(restored, { rateCentsPerHour: 10100 }), restored).projection.state.people[0].rateCentsPerHour, 10100);
  const redone = studio.redo(restored).projection;
  const personChange = studio.previewPerson('product-one', changedPerson(redone, { rateCentsPerHour: 10100 }), redone);
  assert.equal(personChange.projection.state.people[3].id, 'product-one');
  assert.equal(personChange.projection.state.people[3].rateCentsPerHour, 10100);
  assert.equal(personChange.projection.result.plannedCommitmentCents, 10025);
  const workChange = studio.updateWork('preparation', { ...redone.state.work[0], minutesPerOccurrence: 30 }, redone);
  assert.equal(workChange.ok, true); assert.equal(workChange.projection.result.plannedCommitmentCents, 20000);
  const baseline = studio.restoreBaseline(studio.read()).projection;
  assert.equal(studio.updatePerson('product-one', changedPerson(baseline, { rateCentsPerHour: 10100 }), baseline).projection.result.plannedCommitmentCents, 120300);
  const last = studio.read();
  assert.equal(studio.updateWork('review', changedReview(last, { occurrences: 12 }), last).projection.result.plannedCommitmentCents, 240600);
});

test('reentrant admission preserves the newer publication, baseline, indexes and history atomically', () => {
  const studio = createStudio(); const before = studio.read();
  const replacement = createExamplePlan();
  replacement.people.reverse();
  replacement.work = [{ ...replacement.work[0], id: 'preparation', occurrences: 1 }];
  replacement.practices = [];
  let inner, baseline, acceptance, history;
  const candidate = new Proxy(changedReview(before, { occurrences: 12 }), {
    getOwnPropertyDescriptor(target, key) {
      if (!inner) {
        inner = studio.replace(replacement, before);
        studio.setBaseline(inner.projection);
        baseline = studio.readBaseline(); acceptance = studio.readAcceptance(); history = studio.readHistory();
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  expectHeld(studio.updateWork('review', candidate, before), inner?.projection ?? studio.read(), 'stale-edit');
  assert.equal(inner.ok, true);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.strictEqual(studio.readBaseline(), baseline);
  assert.deepEqual(studio.readHistory(), history);
  assert.deepEqual(history, { undoCount: 1, redoCount: 0, limit: 20 });
  assert.equal(studio.undo(studio.read()).projection.result.plannedCommitmentCents, 120000);
  const restored = studio.redo(studio.read()).projection;
  assert.equal(studio.updatePerson('product-one', changedPerson(restored, { rateCentsPerHour: 10100 }), restored).projection.result.plannedCommitmentCents, 20050);
});

test('a reentrant A-to-B-to-A traversal retires an outer no-op even though its payload returns', () => {
  const studio = createStudio(); const before = studio.read();
  let entered = false;
  const candidate = new Proxy(changedReview(before), {
    getOwnPropertyDescriptor(target, key) {
      if (!entered) {
        entered = true;
        studio.updatePerson('product-one', changedPerson(before, { rateCentsPerHour: 10100 }), before);
        studio.undo(studio.read());
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const result = studio.updateWork('review', candidate, before);
  expectHeld(result, studio.read(), 'stale-edit');
  assert.deepEqual(studio.read(), before);
  assert.notStrictEqual(studio.read(), before);
  assert.equal(studio.readAcceptance().sequence, 2);
  assert.deepEqual(studio.readHistory(), { undoCount: 0, redoCount: 1, limit: 20 });
});
