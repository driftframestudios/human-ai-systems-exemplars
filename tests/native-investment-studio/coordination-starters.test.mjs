import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { COORDINATION_STARTERS, prepareStarterPlan } from '../../collaboration/native-investment-studio/coordination-starters.mjs';
import { createShowcasePlan, createQuarterShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { removeWorkAndReferences } from '../../collaboration/native-investment-studio/work-removal.mjs';
import { projectCadence } from '../../collaboration/native-investment-studio/cadence.mjs';

const emptyLibrary = plan => plan.work.reduce((state, work) => removeWorkAndReferences(state, work.id), plan);

test('every starter loads an editable set into the retained horizon as one undoable edit', () => {
  for (const createPlan of [createShowcasePlan, createQuarterShowcasePlan]) for (const recipe of COORDINATION_STARTERS) {
    const studio = createStudio(emptyLibrary(createPlan())), before = studio.read();
    const result = prepareStarterPlan(before.state, recipe.id);
    assert.equal(result.ok, true);
    assert.equal(studio.replace(result.plan, before).ok, true, recipe.id);
    const state = studio.read().state, cadence = projectCadence(state);
    assert.deepEqual(state.work.map(work => work.label), recipe.sessions.map(item => item.label));
    assert.equal(cadence.unplaced.length, 0, 'the new tapes appear in the period board');
    assert.equal(cadence.occurrences.length, recipe.sessions.reduce((count, item) => count + item.occurrences, 0));
    assert.deepEqual(state.scoreSettings.cadence.periods, before.state.scoreSettings.cadence.periods);
    assert.equal(state.scoreSettings.cadence.basis, before.state.scoreSettings.cadence.basis);
    for (const work of state.work) {
      assert.ok(state.teams.some(team => team.id === work.teamId));
      assert.ok(work.personIds.length && work.personIds.every(id => state.people.some(person => person.id === id)));
    }
    for (const key of ['people', 'teams', 'purpose', 'connections', 'contributions', 'arrangements', 'abilities', 'practices', 'changeSettings', 'assuranceSettings', 'investmentSettings'])
      assert.deepEqual(state[key], before.state[key], `${key} retains its existing records`);
    assert.equal(studio.readHistory().undoCount, 1);
    assert.equal(studio.undo(studio.read()).ok, true);
    assert.equal(studio.read().serialized, before.serialized);
  }
});

test('starter preparation owns its candidate and uses available participants without changing team membership', () => {
  const state = emptyLibrary(createShowcasePlan());
  state.teams[0].lifecycle = 'retired'; state.people[0].lifecycle = 'retired';
  const before = structuredClone(state), result = prepareStarterPlan(state, 'build');
  assert.equal(result.ok, true);
  assert.ok(result.plan.work.every(work => work.teamId === 'engineering'));
  assert.deepEqual(result.plan.work[0].personIds, ['ari', 'jules', 'noor']);
  result.plan.people[0].label = 'A later candidate edit';
  result.plan.work[0].personIds.pop();
  assert.deepEqual(state, before);
  assert.equal(result.plan.work[1].personIds.length, 3, 'each tape owns its membership list');
});

test('starter loading preserves existing tapes and keeps prerequisite creation available', () => {
  const occupied = createShowcasePlan(), before = structuredClone(occupied);
  assert.equal(prepareStarterPlan(occupied, 'plan').error.code, 'occupied');
  assert.deepEqual(occupied, before);
  const empty = emptyLibrary(createExamplePlan());
  assert.equal(prepareStarterPlan(empty, 'missing').error.code, 'reference');
  for (const absent of ['people', 'teams']) {
    const candidate = { ...empty, [absent]: [] }, snapshot = structuredClone(candidate);
    const result = prepareStarterPlan(candidate, 'plan');
    assert.equal(result.ok, false); assert.equal(result.fallback, true);
    assert.deepEqual(candidate, snapshot);
  }
  const result = prepareStarterPlan(empty, 'plan');
  assert.equal(result.ok, true);
  assert.equal(createStudio(result.plan).read().state.scoreSettings.cadence.basis, 'sprint');
});
