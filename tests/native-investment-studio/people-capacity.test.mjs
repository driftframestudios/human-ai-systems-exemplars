import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { summarizeWorkCapacity, readPersonSessionSpread, planPersonSessionSpread } from '../../collaboration/native-investment-studio/people-capacity.mjs';

function setup() {
  const plan = createExamplePlan(), baseWork = plan.work[0];
  plan.people[0].fundedMinutes = 120;
  plan.people[0].rateCentsPerHour = 6000;
  plan.people[1].rateCentsPerHour = null;
  plan.work = [
    { ...baseWork, personIds: ['product-one', 'product-two'], minutesPerOccurrence: 60, occurrences: 2, funding: 'allocated' },
    { ...baseWork, id: 'paused', label: 'Paused review', personIds: ['product-one'], minutesPerOccurrence: 30, occurrences: 1, status: 'paused' },
    { ...baseWork, id: 'zero', label: 'Unestimated review', personIds: ['engineering-one'], minutesPerOccurrence: 0, occurrences: 1 },
  ];
  return createStudio(plan);
}

test('capacity readings count shared person-time once per linked work record and retain paused planned work', () => {
  const projection = setup().read();
  assert.deepEqual(summarizeWorkCapacity(projection), { personMinutes: 270, knownCents: 15000, completeMoney: false, workCount: 3, sessionCount: 4 });
  assert.deepEqual(summarizeWorkCapacity(projection, ['review', 'review']), { personMinutes: 240, knownCents: 12000, completeMoney: false, workCount: 1, sessionCount: 2 });
  assert.deepEqual(summarizeWorkCapacity(projection, ['paused']), { personMinutes: 30, knownCents: 3000, completeMoney: true, workCount: 1, sessionCount: 1 });
  assert.deepEqual(summarizeWorkCapacity(projection, ['zero']), { personMinutes: 0, knownCents: 0, completeMoney: true, workCount: 1, sessionCount: 1 });
  assert.deepEqual(summarizeWorkCapacity(projection, []), { personMinutes: 0, knownCents: 0, completeMoney: true, workCount: 0, sessionCount: 0 });
});

test('session spread selects complete plans in visible order while retaining the sole participant', () => {
  const projection = setup().read();
  assert.deepEqual(readPersonSessionSpread(projection, 'product-one'), { personId: 'product-one', selectedPlans: 2, totalPlans: 3,
    pinnedPlans: 1, sessionCount: 3, personMinutes: 150, fundedMinutes: 120 });
  assert.deepEqual(planPersonSessionSpread(projection, 'product-one', 0).command.workIds, ['paused']);
  assert.deepEqual(planPersonSessionSpread(projection, 'product-one', 2).command.workIds, ['review', 'paused']);
  assert.deepEqual(planPersonSessionSpread(projection, 'product-one', 3).command.workIds, ['review', 'paused', 'zero']);
  assert.equal(planPersonSessionSpread(projection, 'missing', 1), null);
  assert.equal(planPersonSessionSpread(projection, 'product-one', 1.5), null);
});

test('a spread gesture changes multiple memberships as one accepted Undo while retaining other participants and session settings', () => {
  const studio = setup(), original = studio.read(), gesture = Symbol('spread');
  for (const count of [1, 3]) {
    const proposal = planPersonSessionSpread(studio.read(), 'product-one', count);
    const result = studio.applyCommand(proposal.command, studio.read(), gesture);
    assert.equal(result.ok, true, result.error?.message);
  }
  assert.deepEqual(studio.read().state.work.map(row => row.personIds), [['product-two', 'product-one'], ['product-one'], ['engineering-one', 'product-one']]);
  assert.deepEqual(studio.read().state.work.map(({ personIds, ...row }) => row), original.state.work.map(({ personIds, ...row }) => row));
  assert.equal(studio.readHistory().undoCount, 1);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.deepEqual(studio.read().state, original.state);
  const stale = studio.applyCommand({ type: 'person.participation.replace', personId: 'product-one', workIds: ['paused'] }, original);
  assert.equal(stale.error.code, 'stale-edit');
});

test('participation replacement preserves accepted state for missing sessions and removing a sole participant', () => {
  const studio = setup(), original = studio.read();
  for (const [workIds, code] of [[['missing'], 'reference'], [[], 'minimum-participants']]) {
    const result = studio.applyCommand({ type: 'person.participation.replace', personId: 'product-one', workIds }, original);
    assert.equal(result.ok, false); assert.equal(result.error.code, code);
    assert.strictEqual(studio.read(), original); assert.equal(studio.readHistory().undoCount, 0);
  }
  const ids = ['review', 'paused'];
  assert.equal(studio.applyCommand({ type: 'person.participation.replace', personId: 'product-one', workIds: ids }, original).ok, true);
  assert.strictEqual(studio.read(), original); assert.equal(studio.readHistory().undoCount, 0);
});
