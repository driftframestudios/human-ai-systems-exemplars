import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { createChangeDraftAdapter } from '../../collaboration/native-investment-studio/change-draft.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

function fixture() {
  const plan = createExamplePlan();
  plan.people = plan.people.slice(0, 2).map(person => ({ ...person, fundedMinutes: 4800 }));
  plan.teams[0].personIds = plan.people.map(person => person.id);
  plan.work = [{ ...plan.work[0], personIds: [...plan.teams[0].personIds], minutesPerOccurrence: 120, occurrences: 1, funding: 'allocated' }];
  return createStudio(plan);
}
function set(editor, token, key, value) { const result = editor.setText(token, key, value); assert.equal(result.ok, true, result.error?.message); }
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); }
function work(editor, token) {
  for (const [key, value] of Object.entries({ framework: 'kotter@1.0.0', component: 'urgency', source: 'core',
    suggestion: 'practitioner-judgment-probes', mode: 'new', label: 'Pilot discussion', teamId: 'delivery',
    hoursPerSession: '1', minutesPerSession: '30', occurrences: '1', funding: 'additional' })) set(editor, token, `proposal.${key}`, value);
  assert.equal(editor.setIds(token, 'proposal.personIds', ['product-one']).ok, true);
}

test('framework switching keeps each mapping while interpretation and attention leave the accepted investment intact', () => {
  const studio = fixture(), editing = createDraftCoordinator(studio), before = studio.read(), editor = editing.change;
  const token = editor.begin('change', before).view.draft.token;
  set(editor, token, 'map.kotter.urgency.status', 'look');
  assert.equal(editor.setIds(token, 'map.kotter.urgency.workIds', ['review']).ok, true);
  set(editor, token, 'framework', 'adkar@1.0.0'); set(editor, token, 'map.adkar.awareness.status', 'partial');
  set(editor, token, 'lens', 'people@1.0.0'); set(editor, token, 'sourceFilter', 'enterprise');
  set(editor, token, 'attention.urgency', '25'); set(editor, token, 'framework', 'kotter@1.0.0');
  assert.equal(editor.read().draft.raw['map.kotter.urgency.status'], 'look');
  const proposal = editor.preview(token); assert.equal(proposal.ok, true, proposal.error?.message);
  assert.equal(proposal.projection.result.knownCommitmentCents, 1600000); assert.strictEqual(studio.read(), before);
  assert.strictEqual(editor.preview(token).projection, proposal.projection);
  assert.equal(editor.apply(token).ok, true);
  const maps = studio.read().state.changeSettings.frameworkMaps;
  assert.equal(maps.find(row => row.frameworkId === 'adkar').components[0].status, 'partial');
  assert.deepEqual(maps.find(row => row.frameworkId === 'kotter').components[0].workIds, ['review']);
  assert.equal(studio.undo(studio.read()).ok, true); assert.equal(studio.read().serialized, before.serialized);
});

test('a proposed session and all Change settings share one acceptance and one Undo', () => {
  const studio = fixture(), editor = createDraftCoordinator(studio).change, before = studio.read();
  const token = editor.begin('change', before).view.draft.token;
  set(editor, token, 'attention.urgency', '20'); work(editor, token);
  const proposal = editor.preview(token); assert.equal(proposal.ok, true, proposal.error?.message);
  assert.equal(proposal.projection.result.knownCommitmentCents, 1615000);
  assert.deepEqual(proposal.summary.newWorkIds, ['change-work-1']); assert.strictEqual(studio.read(), before);
  assert.equal(editor.apply(token).ok, true);
  assert.equal(studio.read().state.changeSettings.attention.channels[0].parts, 20);
  assert.deepEqual(studio.read().state.changeSettings.frameworkMaps[0].components[0].workIds, ['change-work-1']);
  assert.equal(studio.undo(studio.read()).ok, true); assert.equal(studio.read().serialized, before.serialized);
});

test('saved Change drafts retain raw attention and explicit support through stale review', () => {
  const studio = fixture(), editing = createDraftCoordinator(studio), editor = editing.change;
  let token = editor.begin('change', studio.read()).view.draft.token;
  set(editor, token, 'attention.urgency', ' later '); set(editor, token, 'framework', 'npt@1.0.0');
  assert.equal(editor.setIds(token, 'map.npt.coherence.workIds', ['review']).ok, true);
  assert.equal(editing.park().ok, true);
  const plan = JSON.parse(studio.exportText()); plan.purpose.changedAbility = 'Changed receiving task';
  assert.equal(studio.importText(JSON.stringify(plan), studio.read()).ok, true);
  rejected(editor.begin('change', studio.read()), 'review-required');
  const result = editor.review(editor.read().draft.token, studio.read()); assert.equal(result.ok, true);
  token = result.view.draft.token;
  assert.equal(result.view.draft.raw['attention.urgency'], ' later ');
  assert.deepEqual(result.view.draft.raw['map.npt.coherence.workIds'], ['review']);
  rejected(editor.preview(token), 'attention-parts');
  set(editor, token, 'attention.urgency', '25'); assert.equal(editor.step(token, 'attention.urgency', 1).ok, true);
  assert.equal(editor.read().draft.raw['attention.urgency'], '25');
  assert.equal(editor.apply(token).ok, true); assert.equal(studio.read().state.changeSettings.activeFramework.frameworkId, 'npt');
  editing.dispose(); rejected(editor.apply(token), 'disposed');
});

test('malformed support and invalid duration preserve the accepted plan and raw recovery route', () => {
  const studio = fixture(), editor = createChangeDraftAdapter(studio), before = studio.read();
  const token = editor.begin('change', before).view.draft.token;
  let reads = 0; const input = []; Object.defineProperty(input, '0', { enumerable: true, get() { reads += 1; return 'review'; } });
  rejected(editor.setIds(token, 'map.kotter.urgency.workIds', input), 'data-property'); assert.equal(reads, 0);
  rejected(editor.setIds(token, 'map.kotter.urgency.capabilityRefs', ['ability/one', 'ability/one']), 'reference');
  work(editor, token); set(editor, token, 'proposal.minutesPerSession', 'later');
  rejected(editor.preview(token), 'integer-text'); assert.equal(editor.read().draft.raw['proposal.minutesPerSession'], 'later');
  assert.strictEqual(studio.read(), before); assert.equal(editor.cancel(token).ok, true);
  rejected(editor.apply(token), 'draft-token');
});

test('untouched reordered settings preserve exact acceptance and history, including at the revision ceiling', () => {
  for (const revision of [0, LIMITS.revision]) {
    const plan = createExamplePlan(); plan.revision = revision;
    plan.changeSettings.frameworkMaps.reverse();
    for (const mapping of plan.changeSettings.frameworkMaps) mapping.components.reverse();
    plan.changeSettings.attention.channels.reverse();
    const studio = createStudio(plan), editor = createDraftCoordinator(studio).change;
    const before = studio.read(), bytes = studio.exportText(), acceptance = studio.readAcceptance(), history = studio.readHistory();
    const token = editor.begin('change', before).view.draft.token;
    assert.equal(editor.read().draft.changed, false);
    const result = editor.apply(token); assert.equal(result.ok, true, result.error?.message);
    assert.strictEqual(studio.read(), before);
    assert.equal(studio.exportText(), bytes);
    assert.strictEqual(studio.readAcceptance(), acceptance);
    assert.deepEqual(studio.readHistory(), history);
  }
});

test('editing reordered settings changes the selected value while preserving every admitted array order', () => {
  const plan = createExamplePlan();
  plan.changeSettings.frameworkMaps.reverse();
  for (const mapping of plan.changeSettings.frameworkMaps) mapping.components.reverse();
  plan.changeSettings.attention.channels.reverse();
  const expected = structuredClone(plan.changeSettings);
  expected.attention.channels.find(channel => channel.channelId === 'urgency').parts = 25;
  const studio = createStudio(plan), editor = createDraftCoordinator(studio).change, before = studio.read();
  const token = editor.begin('change', before).view.draft.token;
  set(editor, token, 'attention.urgency', '25');
  assert.equal(editor.read().draft.changed, true);
  assert.equal(editor.apply(token).ok, true);
  assert.deepEqual(studio.read().state.changeSettings, expected);
  assert.equal(studio.read().state.revision, before.state.revision + 1);
  assert.equal(studio.readHistory().undoCount, 1);
});
