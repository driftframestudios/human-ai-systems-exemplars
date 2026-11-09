import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { recordReferences } from '../../collaboration/native-investment-studio/commands.mjs';
import { getCapabilityDefinition } from '../../collaboration/native-investment-studio/capabilities.mjs';
import { describeRemovalReference } from '../../collaboration/native-investment-studio/removal-references.mjs';

function referencePlan() {
  const plan = createShowcasePlan(), definition = getCapabilityDefinition('ability', 'inspect-history', '1.0.0');
  plan.abilities.push({ id: 'audit-history', definitionId: definition.id, definitionVersion: definition.version,
    context: 'Inspect the pilot history.', teamId: 'engineering', responsiblePersonIds: ['maya'],
    decisionOwnerPersonId: 'maya', lifecycle: 'active', prerequisites: [],
    supportBindings: definition.supportRequirements.map(row => ({ requirementId: row.id, workIds: ['review'] })) });
  plan.capabilityEvidence.push({ id: 'history-observation', subject: { kind: 'ability', instanceId: 'audit-history' },
    stage: 'rehearsed', context: 'Pilot walkthrough', observation: 'The reviewer traced the saved request.',
    recorderPersonId: 'maya', reviewBoundary: 'Review with operations.', observedPlanRevision: 0 });
  plan.assuranceSettings.context.recoveryRatePersonIds = ['maya'];
  plan.arrangements.push({ id: 'working-pod', templateId: 'pod', templateVersion: '1.0.0',
    teamBindings: [{ slotId: 'pod', teamId: 'engineering' }, { slotId: 'partner', teamId: 'product' }],
    connectionBindings: [{ slotId: 'handoff', connectionId: 'readiness' }, { slotId: 'feedback', connectionId: 'scope' }] });
  return plan;
}

test('team and person removal notices resolve the actual relationship names while protection retains accepted state', () => {
  const studio = createStudio(referencePlan()), before = studio.read(), history = studio.readHistory();
  const team = studio.applyCommand({ type: 'team.remove', teamId: 'engineering' }, before);
  assert.equal(team.ok, false); assert.equal(team.error.code, 'dependencies');
  assert.deepEqual(team.error.references.map(reference => describeRemovalReference(before.state, reference).label), [
    'Work: Pilot decision review', 'Work: Prototype pairing',
    'Connection: Prototype, acceptance evidence and exception log', 'Connection: Pilot scope and tested user journeys',
    'Pod arrangement', 'Ability: Inspect history', 'Practice: Actively negotiate expectations · Engineering',
  ]);
  const person = studio.applyCommand({ type: 'person.remove', personId: 'maya' }, before);
  assert.equal(person.ok, false); assert.equal(person.error.code, 'dependencies');
  const descriptions = person.error.references.map(reference => describeRemovalReference(before.state, reference));
  for (const label of ['Contribution: Cross-source synthesis', 'Evidence: Inspect history · Pilot walkthrough',
    'Recovery illustration: people whose rates inform the estimate', 'Decision gate: Pilot decision · reviewer'])
    assert.ok(descriptions.some(row => row.label === label), label);
  assert.strictEqual(studio.read(), before); assert.deepEqual(studio.readHistory(), history);
});

test('the emitted reference families retain readable labels and their established review destinations', () => {
  const state = preparePlan(referencePlan()).state;
  const references = ['people', 'teams', 'work', 'abilities', 'practices', 'connections'].flatMap(collection =>
    state[collection].flatMap(row => recordReferences(state, collection, row.id)));
  assert.deepEqual([...new Set(references.map(row => row.collection))].sort(), [
    'abilities', 'arrangements', 'assuranceSettings', 'capabilityEvidence', 'changeSettings',
    'connections', 'contributions', 'practices', 'scoreSettings', 'teams', 'work',
  ]);
  for (const reference of references) {
    const description = describeRemovalReference(state, reference);
    assert.ok(description.label.length > 0);
    assert.doesNotMatch(description.label, /undefined|null/);
  }
  const arrangement = describeRemovalReference(state, references.find(row => row.collection === 'arrangements'));
  assert.deepEqual(arrangement.link, { href: '#native-studio-coordination', text: 'Review the arrangement', dataset: { nativeOpenArrangement: 'working-pod' } });
  const score = describeRemovalReference(state, { collection: 'scoreSettings', id: 'pilot-decision', field: 'gates[0].reviewerPersonId' });
  assert.deepEqual(score.link.dataset, { nativeOpenScore: 'gate', nativeScoreId: 'pilot-decision' });
  const change = describeRemovalReference(state, references.find(row => row.collection === 'changeSettings'));
  assert.equal(change.link.href, '#native-studio-change'); assert.deepEqual(change.link.dataset, { nativeOpenChange: '' });
  const quality = describeRemovalReference(state, references.find(row => row.collection === 'assuranceSettings'));
  assert.equal(quality.link.href, '#native-studio-assurance');
});

test('unsupported or stale references remain contract errors', () => {
  const state = preparePlan(referencePlan()).state;
  assert.throws(() => describeRemovalReference(state, { collection: 'other', id: 'missing', field: 'teamId' }), /Unsupported removal reference/);
  assert.throws(() => describeRemovalReference(state, { collection: 'connections', id: 'missing', field: 'senderTeamId' }), /requires an accepted connections record/);
});
