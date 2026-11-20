import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createContributionViewModel } from '../../collaboration/native-investment-studio/contribution-view-model.mjs';

function fixture() {
  const plan = createExamplePlan();
  plan.teams.push({ id: 'receiving', label: 'Receiving team', personIds: ['product-one', 'product-two'], lifecycle: 'active' });
  plan.work.push({ ...plan.work[0], id: 'drafting', label: 'Prepare draft' }, { ...plan.work[0], id: 'separate', label: 'Separate work' });
  const connection = (id, workIds) => ({ id, senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: 'product-one',
    sharedObject: 'Draft for review', responseExpectation: null, workIds, status: 'active' });
  plan.connections = [connection('both', ['review', 'drafting']), connection('review-only', ['review']), connection('same-human-only', ['separate'])];
  plan.contributions = [
    { id: 'draft', categoryId: 'draft-artifacts', receiverPersonId: 'product-one', decisionOwnerPersonId: 'product-two',
      workIds: ['drafting', 'review'], reviewBoundary: 'Check each claim against its source.', decisionBoundary: 'Decide which claims may be used.' },
    { id: 'calculation', categoryId: 'transparent-calculation', receiverPersonId: 'product-two', decisionOwnerPersonId: 'product-two',
      workIds: ['review'], reviewBoundary: 'Recalculate the total.', decisionBoundary: 'Accept or revise the estimate.' },
    { id: 'unassigned', categoryId: 'source-retrieval', receiverPersonId: null, decisionOwnerPersonId: null,
      workIds: [], reviewBoundary: null, decisionBoundary: null },
  ];
  return plan;
}

test('functional contribution, human review and human decision retain their separate exact meanings', () => {
  const accepted = createStudio(fixture()).read(), model = createContributionViewModel(accepted), draft = model.contribution('draft');
  assert.equal(draft.label, 'Draft artifacts');
  assert.deepEqual([draft.receiver.id, draft.decisionOwner.id], ['product-one', 'product-two']);
  assert.equal(draft.reviewBoundary, 'Check each claim against its source.');
  assert.equal(draft.decisionBoundary, 'Decide which claims may be used.');
  assert.deepEqual(draft.work.map(row => row.id), ['drafting', 'review']);
  assert.deepEqual(draft.gaps, []);
  assert.strictEqual(model.contribution('calculation').receiver, model.contribution('calculation').decisionOwner,
    'one person can hold two named responsibilities without inventing another participant');
  assert.equal(Object.hasOwn(draft, 'approved'), false); assert.equal(Object.hasOwn(draft, 'reviewComplete'), false);
});

test('only exact shared work links contributions and connections, once per pair and in contribution order', () => {
  const model = createContributionViewModel(createStudio(fixture()).read());
  assert.deepEqual(model.forConnection('both'), [
    { contributionId: 'draft', connectionId: 'both', sharedWorkIds: ['drafting', 'review'] },
    { contributionId: 'calculation', connectionId: 'both', sharedWorkIds: ['review'] },
  ]);
  assert.deepEqual(model.forConnection('review-only'), [
    { contributionId: 'draft', connectionId: 'review-only', sharedWorkIds: ['review'] },
    { contributionId: 'calculation', connectionId: 'review-only', sharedWorkIds: ['review'] },
  ]);
  assert.deepEqual(model.forConnection('same-human-only'), [], 'shared receiver and teams do not imply shared contribution work');
  assert.deepEqual(model.unattached.map(row => row.id), ['unassigned']);
  assert.deepEqual(model.forConnection('__proto__'), []); assert.equal(model.contribution('__proto__'), null);
});

test('unassigned responsibilities and unspecified boundaries remain explicit without inferred work', () => {
  const row = createContributionViewModel(createStudio(fixture()).read()).contribution('unassigned');
  assert.equal(row.receiver, null); assert.equal(row.decisionOwner, null);
  assert.equal(row.reviewBoundary, null); assert.equal(row.decisionBoundary, null); assert.deepEqual(row.work, []);
  assert.deepEqual(row.gaps.map(gap => [gap.code, gap.field]), [
    ['unassigned-human', 'receiverPersonId'], ['unassigned-human', 'decisionOwnerPersonId'],
    ['review-boundary-unspecified', 'reviewBoundary'], ['decision-boundary-unspecified', 'decisionBoundary'], ['supporting-work-unspecified', 'workIds'],
  ]);
});

test('paused and retired source records stay linked and visibly distinct from an active assignment', () => {
  const plan = fixture(); plan.people[0].lifecycle = 'retired'; plan.work[0].lifecycle = 'retired'; plan.work[0].status = 'paused'; plan.connections[0].status = 'paused';
  const model = createContributionViewModel(createStudio(plan).read()), row = model.contribution('draft');
  assert.equal(row.receiver.name, `${plan.people[0].label} · retired`);
  assert.deepEqual(row.work.map(item => [item.id, item.status, item.lifecycle]), [['drafting', 'planned', 'active'], ['review', 'paused', 'retired']]);
  assert.deepEqual(row.gaps.map(gap => gap.code), ['retired-human', 'retired-supporting-work', 'paused-supporting-work']);
  assert.deepEqual(model.forConnection('both')[0].sharedWorkIds, ['drafting', 'review']);
});

test('immutable derivation caches by exact projection, retains same-revision replacement and never reads accounting', () => {
  const accepted = createStudio(fixture()).read(), model = createContributionViewModel(accepted);
  assert.strictEqual(createContributionViewModel(accepted), model);
  const renamed = fixture(); renamed.people[0].label = 'Current reviewer'; renamed.contributions[0].workIds = ['separate'];
  const next = createStudio(renamed).read(); assert.equal(next.state.revision, accepted.state.revision);
  const changed = createContributionViewModel(next); assert.notStrictEqual(changed, model);
  assert.equal(changed.contribution('draft').receiver.name, 'Current reviewer');
  assert.deepEqual(changed.forConnection('both').map(row => row.contributionId), ['calculation']);
  assert.deepEqual(changed.forConnection('same-human-only')[0].sharedWorkIds, ['separate']);
  assert.throws(() => { model.contribution('draft').receiver.label = 'Changed'; }, TypeError);
  assert.throws(() => model.forConnection('both')[0].sharedWorkIds.push('separate'), TypeError);
  assert.throws(() => model.unattached.pop(), TypeError);
  assert.ok(Object.isFrozen(model.contribution('unassigned').gaps[0]));
  const guarded = { state: accepted.state, get result() { throw Error('Accounting belongs to the accepted owner.'); } };
  assert.deepEqual(createContributionViewModel(guarded).forConnection('both'), model.forConnection('both'));
});

test('a plan without contributions produces an explicit empty companion', () => {
  const model = createContributionViewModel(createStudio(createExamplePlan()).read());
  assert.deepEqual(model.contributions, []); assert.deepEqual(model.unattached, []); assert.deepEqual(model.forConnection('missing'), []);
});
