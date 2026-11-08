import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareSessionCreation } from '../../collaboration/native-investment-studio/session-creation.mjs';
import { createShowcasePlan, createQuarterShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { describeSessionTarget } from '../../collaboration/native-investment-studio/command-draft.mjs';

test('a rack session starts with usable people, one short occurrence and the selected sprint or quarter', () => {
  for (const [plan, subdivision, personIds] of [
    [createShowcasePlan(), 2, ['maya', 'leo']],
    [createQuarterShowcasePlan(), 3, ['maya', 'leo', 'sam']],
  ]) {
    const before = structuredClone(plan);
    const result = prepareSessionCreation(plan, { periodId: 'period-2', subdivision });
    assert.equal(result.ok, true);
    assert.deepEqual(result.raw, { label: 'New session 1', hoursPerSession: '0', minutesPerSession: '30',
      occurrences: '1', funding: 'additional', status: 'planned', teamId: 'product', personIds,
      cadencePlacements: JSON.stringify([{ occurrenceIndex: 0, periodId: 'period-2', subdivision }]) });
    assert.deepEqual(plan, before);
    assert.ok(Object.isFrozen(result.raw.personIds));
  }
});

test('team and person context stays explicit while an unscoped session remains unplaced', () => {
  const plan = createShowcasePlan();
  const crossTeam = prepareSessionCreation(plan, { teamId: 'engineering', personId: 'leo' });
  assert.equal(crossTeam.raw.teamId, 'engineering');
  assert.deepEqual(crossTeam.raw.personIds, ['leo']);
  assert.equal(crossTeam.raw.cadencePlacements, '[]');
  const person = prepareSessionCreation(plan, { personId: 'sam' });
  assert.equal(person.raw.teamId, 'operations');
  assert.deepEqual(person.raw.personIds, ['sam']);
  plan.teams[0].personIds = [];
  const emptyTeam = prepareSessionCreation(plan, { teamId: 'product' });
  assert.equal(emptyTeam.ok, true);
  assert.deepEqual(emptyTeam.raw.personIds, ['maya']);
  assert.deepEqual(plan.teams[0].personIds, []);
});

test('missing prerequisites retain the ordinary creation route; outdated rack context is diagnosed', () => {
  const plan = createShowcasePlan();
  assert.deepEqual(prepareSessionCreation({ ...plan, people: [] }), { ok: false, fallback: true });
  assert.deepEqual(prepareSessionCreation({ ...plan, teams: [] }), { ok: false, fallback: true });
  for (const [context, path] of [
    [{ periodId: 'removed-period' }, 'context.periodId'],
    [{ periodId: 'period-1', subdivision: 3 }, 'context.subdivision'],
    [{ teamId: 'removed-team' }, 'context.teamId'],
    [{ personId: 'removed-person' }, 'context.personId'],
  ]) {
    const result = prepareSessionCreation(plan, context);
    assert.equal(result.ok, false); assert.equal(result.error.path, path);
  }
});

test('default participants use available people while explicit cross-team context remains usable', () => {
  const plan = createShowcasePlan();
  plan.people[0].lifecycle = 'retired'; plan.teams[0].lifecycle = 'retired';
  const result = prepareSessionCreation(plan);
  assert.equal(result.raw.teamId, 'engineering');
  assert.deepEqual(result.raw.personIds, ['ari', 'jules', 'noor']);
});

test('prepared values publish one ordinary creation; cancelling its update retains the session and Undo removes it', () => {
  const studio = createStudio(createShowcasePlan()), editing = createDraftCoordinator(studio);
  const before = studio.read(), prepared = prepareSessionCreation(before.state, { periodId: 'period-2' });
  const opened = editing.session.create('work.create', before);
  assert.equal(opened.ok, true);
  const { token, sessionId } = opened.view.draft, id = describeSessionTarget(sessionId).id;
  for (const [field, value] of Object.entries(prepared.raw)) {
    const result = Array.isArray(value) ? editing.session.setIds(token, field, value) : editing.session.setText(token, field, value);
    assert.equal(result.ok, true, result.error?.message);
  }
  const created = editing.session.apply(token);
  assert.equal(created.ok, true, created.error?.message);
  assert.equal(studio.read().state.work.length, before.state.work.length + 1);
  assert.equal(studio.readHistory().undoCount, 1);
  assert.deepEqual(studio.read().state.scoreSettings.cadence.placements.find(row => row.workId === id),
    { workId: id, occurrenceIndex: 0, periodId: 'period-2', subdivision: 1 });
  const update = editing.session.begin(`work.update:${id}`, studio.read());
  assert.equal(update.view.draft.changed, false);
  editing.session.setText(update.view.draft.token, 'label', 'A later edit');
  assert.equal(editing.session.cancel(update.view.draft.token).ok, true);
  assert.equal(studio.read().state.work.find(row => row.id === id).label, 'New session 1');
  assert.equal(studio.readHistory().undoCount, 1);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.deepEqual(studio.read().state.work, before.state.work);
  assert.equal(studio.readHistory().undoCount, 0);
});


test('creation labels distinguish new records from imported and renamed records', () => {
  const plan = createShowcasePlan();
  plan.work[0].label = 'New session 1'; plan.work[1].label = 'New session 3';
  assert.equal(prepareSessionCreation(plan).raw.label, 'New session 2');
  plan.work[0].label = 'Pilot decision review';
  assert.equal(prepareSessionCreation(plan).raw.label, 'New session 1');
});
