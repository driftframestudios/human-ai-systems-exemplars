import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { deriveRolePreset } from '../../collaboration/native-investment-studio/person-role-mixer.mjs';
import { CHANGE_FRAMEWORKS, ROLE_CATALOGUES } from '../../collaboration/native-investment-studio/roles.mjs';

const ok = result => { assert.equal(result.ok, true, result.error?.message); return result; };

test('connected role presets preserve the person’s function, seniority and chosen component within the same model', () => {
  const raw = Object.freeze({ functionId: 'engineering', seniorityId: 'principal-plus', change: 'kotter:vision',
    enablerId: 'data-tool-access', decisionId: 'advises', postureId: 'people-leader', qualityId: '', aiId: '' });
  const next = deriveRolePreset(raw, 'framework', 'kotter');
  assert.deepEqual(next, { functionId: 'engineering', seniorityId: 'principal-plus', change: 'kotter:vision',
    enablerId: 'cross-team-authority', decisionId: 'recommends', postureId: 'player-coach',
    qualityId: 'contributes-evidence', aiId: 'receives-reviews' });
  assert.equal(raw.enablerId, 'data-tool-access');
  assert.equal(deriveRolePreset(raw, 'framework', 'npt').change, 'npt:collective-action');
  assert.equal(deriveRolePreset(raw, 'framework', 'unknown'), null);
  assert.equal(deriveRolePreset(raw, 'unrecognized', 'kotter'), null);
});

test('every reel choice creates an admitted role, retains the chosen reel value and uses one accepted Undo', () => {
  const choices = [
    ...CHANGE_FRAMEWORKS.map(row => ['framework', row.id]),
    ...ROLE_CATALOGUES.enablerId.map(row => ['enablerId', row.id]),
    ...ROLE_CATALOGUES.decisionId.map(row => ['decisionId', row.id]),
  ];
  for (const [dimension, value] of choices) {
    const studio = createStudio(), editing = createDraftCoordinator(studio), original = studio.read();
    const draft = ok(editing.role.begin('role.update:product-one', original)).view.draft;
    const next = deriveRolePreset(draft.raw, dimension, value);
    for (const [field, text] of Object.entries(next)) ok(editing.role.setText(draft.token, field, text));
    ok(editing.role.apply(draft.token));
    const role = studio.read().state.people.find(row => row.id === 'product-one').role;
    assert.equal(dimension === 'framework' ? role.change.frameworkId : role[dimension], value);
    assert.equal(studio.readHistory().undoCount, 1);
    ok(studio.undo(studio.read())); assert.deepEqual(studio.read().state, original.state);
    editing.dispose();
  }
});

test('an exact role choice can refine a connected preset and retain an unassigned facet', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio);
  let draft = ok(editing.role.begin('role.update:product-one', studio.read())).view.draft;
  const next = deriveRolePreset(draft.raw, 'framework', 'dual');
  for (const [field, text] of Object.entries(next)) ok(editing.role.setText(draft.token, field, text));
  ok(editing.role.apply(draft.token));
  draft = ok(editing.role.begin('role.update:product-one', studio.read())).view.draft;
  ok(editing.role.setText(draft.token, 'qualityId', '')); ok(editing.role.apply(draft.token));
  const role = studio.read().state.people.find(row => row.id === 'product-one').role;
  assert.equal(role.qualityId, null); assert.equal(role.decisionId, 'approves');
  assert.deepEqual(role.change, { frameworkId: 'dual', componentId: 'network' });
  editing.dispose();
});
