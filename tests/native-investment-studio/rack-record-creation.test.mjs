import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRackRecord } from '../../collaboration/native-investment-studio/rack-record-creation.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';

test('rack additions accept editable team and directed handoff records with one Undo each', () => {
  const studio = createStudio(createShowcasePlan()), editing = createDraftCoordinator(studio);
  const before = studio.read();
  const team = createRackRecord(studio, editing, 'team');
  assert.equal(team.accepted, true, team.error?.message);
  assert.deepEqual(studio.read().state.teams.find(row => row.id === team.id),
    { id: team.id, label: 'New team', personIds: [], lifecycle: 'active' });
  assert.equal(studio.readHistory().undoCount, 1);
  const handoff = createRackRecord(studio, editing, 'connection', { senderTeamId: 'engineering', receiverTeamId: team.id });
  assert.equal(handoff.accepted, true, handoff.error?.message);
  assert.deepEqual(studio.read().state.connections.find(row => row.id === handoff.id), {
    id: handoff.id, senderTeamId: 'engineering', receiverTeamId: team.id, receiverPersonId: null,
    sharedObject: 'Share the next step', responseExpectation: null, workIds: [], status: 'active',
  });
  assert.equal(studio.readHistory().undoCount, 2);
  assert.equal(studio.undo(handoff.projection).ok, true);
  assert.deepEqual(studio.read().state, team.projection.state);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.deepEqual(studio.read().state, before.state);
});

test('adding a handoff retains the current raw session edit for review', () => {
  const studio = createStudio(createShowcasePlan()), editing = createDraftCoordinator(studio);
  const opened = editing.session.begin('work.update:review', studio.read());
  editing.session.setText(opened.view.draft.token, 'label', 'A name still being considered');
  const created = createRackRecord(studio, editing, 'connection');
  assert.equal(created.accepted, true, created.error?.message);
  const handoff = studio.read().state.connections.find(row => row.id === created.id);
  assert.equal(handoff.senderTeamId, 'product');
  assert.equal(handoff.receiverTeamId, 'engineering');
  assert.equal(handoff.receiverPersonId, 'ari');
  assert.equal(studio.read().state.work.find(row => row.id === 'review').label, 'Pilot decision review');
  assert.equal(editing.read().parked.find(row => row.kind === 'session').raw.label, 'A name still being considered');
  assert.equal(editing.session.read().status, 'stale');
});

test('invalid handoff context and a single-team plan leave the plan and current edit intact', () => {
  for (const [studio, context] of [
    [createStudio(), {}],
    [createStudio(createShowcasePlan()), { senderTeamId: 'removed-team' }],
    [createStudio(createShowcasePlan()), { senderTeamId: 'product', receiverTeamId: 'product' }],
  ]) {
    const editing = createDraftCoordinator(studio), before = studio.read();
    const opened = editing.purpose.begin('purpose', before);
    editing.purpose.setText(opened.view.draft.token, 'changedAbility', 'Keep this thought');
    const active = editing.read().active;
    const result = createRackRecord(studio, editing, 'connection', context);
    assert.equal(result.accepted, false); assert.equal(result.error.code, 'reference');
    assert.equal(studio.read(), before); assert.equal(studio.readHistory().undoCount, 0);
    assert.equal(editing.read().active.token, active.token);
    assert.equal(editing.purpose.read().draft.raw.changedAbility, 'Keep this thought');
  }
});

test('a successor edit interrupts creation before publication and keeps its ownership', () => {
  const studio = createStudio(createShowcasePlan()), editing = createDraftCoordinator(studio);
  const before = studio.read();
  let successor;
  const receiving = { ...editing, assembly: { ...editing.assembly,
    setText(token, field, value) {
      const result = editing.assembly.setText(token, field, value);
      successor = editing.purpose.begin('purpose', studio.read());
      return result;
    },
  } };
  const result = createRackRecord(studio, receiving, 'team');
  assert.equal(result.accepted, false); assert.equal(result.error.code, 'superseded');
  assert.equal(studio.read(), before); assert.equal(studio.readHistory().undoCount, 0);
  assert.equal(editing.read().active.kind, 'purpose');
  assert.equal(editing.read().active.token, successor.view.draft.token);
  assert.equal(editing.read().parked.find(row => row.kind === 'assembly').raw.label, 'New team');
});
