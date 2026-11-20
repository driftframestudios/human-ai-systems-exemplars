import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExamplePlan, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { prepareAssuranceProposal } from '../../collaboration/native-investment-studio/assurance-proposals.mjs';
import { projectAssuranceConsequences, summarizeAssuranceWork } from '../../collaboration/native-investment-studio/assurance-consequences.mjs';

function session(id, overrides = {}) {
  return { id, label: 'Check the recovery instructions', teamId: 'operations', personIds: ['noor', 'sam'],
    minutesPerOccurrence: 30, occurrences: 1, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active', ...overrides };
}
function event(workIds = []) {
  return { id: 'interrupted-task', label: 'Recovery after an interrupted task', included: true, lifecycle: 'active',
    eventCount: 1, aggregateMinutesPerEvent: 60, receiverPersonId: 'noor', reviewBoundary: 'Repeat recovery with an unfamiliar request.', workIds };
}
function rehearsal(workIds = []) {
  return { id: 'recovery-response', definitionId: 'recovery-failure', definitionVersion: '1.0.0',
    context: 'The service-request pilot recovery instructions', assumptions: 'This authored situation uses illustrative rates.',
    response: 'Revise the instructions and repeat the interruption.', reviewerPersonId: 'noor', observedPlanRevision: 0,
    observation: null, workIds, connectionIds: ['readiness'], personIds: ['noor', 'sam'] };
}
function concept(plan, id = 'reconciliation-replay') { return plan.assuranceSettings.quality.concepts.find(row => row.conceptId === id); }
const read = plan => projectAssuranceConsequences(preparePlan(plan)).accepted;
const badgeRows = (reading, kind, id) => reading.badges[kind].find(row => row[kind === 'people' ? 'personId' : 'teamId'] === id)?.badges ?? [];

test('one explicit response session supplies exact effort and a $100 proposal while shared support retains one work row', () => {
  const accepted = preparePlan(createShowcasePlan());
  const settings = structuredClone(accepted.state.assuranceSettings);
  settings.quality.concepts.find(row => row.conceptId === 'reconciliation-replay').workIds = ['recovery-check'];
  settings.context.recoveryRatePersonIds = ['noor', 'sam'];
  settings.recoveryEvents = [event(['recovery-check'])]; settings.rehearsals = [rehearsal(['recovery-check'])];
  const proposal = prepareAssuranceProposal(accepted, { assuranceSettings: settings, newWork: [session('recovery-check')], workUpdates: [],
    connectionUpdates: [{ ...accepted.state.connections.find(row => row.id === 'readiness'), status: 'paused' }] });
  const reading = projectAssuranceConsequences(accepted, proposal);
  assert.deepEqual(reading.accepted.work, []); assert.deepEqual(reading.accepted.badges, { people: [], teams: [] });
  assert.deepEqual(reading.accepted.investment, { knownCents: 398000, totalCents: 398000, lineRoundingAdjustments: { allocatedCents: 0, additionalCents: 0 } });
  assert.deepEqual(reading.change.money, { beforeKnownCents: 398000, afterKnownCents: 408000, knownDeltaCents: 10000,
    beforeTotalCents: 398000, afterTotalCents: 408000, totalDeltaCents: 10000 });
  assert.deepEqual(reading.change.newWorkIds, ['recovery-check']); assert.deepEqual(reading.change.updatedConnectionIds, ['readiness']);
  assert.deepEqual(reading.proposed.work, [{ workId: 'recovery-check', label: 'Check the recovery instructions', teamId: 'operations',
    personIds: ['noor', 'sam'], minutesPerOccurrence: 30, occurrences: 1, personMinutes: 60, funding: 'additional', status: 'planned', lifecycle: 'active',
    ledgerLines: [{ personId: 'noor', minutes: 30, cents: 5500 }, { personId: 'sam', minutes: 30, cents: 4500 }],
    knownLineCents: 10000, totalLineCents: 10000, lineAmountStatus: 'priced',
    timing: { placement: 'unspecified', startMinute: null, endMinute: null, elapsedMinutes: null } }]);
  const combined = summarizeAssuranceWork(reading.proposed, ['recovery-check', 'recovery-check', 'recovery-check']);
  assert.deepEqual(combined.workIds, ['recovery-check']); assert.equal(combined.personMinutes, 60); assert.equal(combined.totalLineCents, 10000);
  assert.deepEqual(combined.additional, { knownLineCents: 10000, totalLineCents: 10000, lineAmountStatus: 'priced' });
  assert.deepEqual(combined.allocated, { knownLineCents: 0, totalLineCents: 0, lineAmountStatus: 'priced' });
  assert.equal(reading.proposed.recovery.events[0].aggregatePersonMinutes, 60);
  assert.equal(reading.proposed.recovery.estimate.hours, 1); assert.equal(reading.proposed.recovery.estimate.amountCents, 10000);
  assert.equal(reading.proposed.rehearsals[0].label, 'A recovery rehearsal reveals a gap');
  assert.equal(reading.proposed.rehearsals[0].observation, null);
  assert.equal(accepted.result.plannedCommitmentCents, 398000); assert.equal(accepted.state.work.length, 4);
});

test('line attribution retains pooled rounding, and inactive support keeps accepted commitment', () => {
  const plan = createExamplePlan();
  plan.people = [{ ...plan.people[0], fundedMinutes: 0, rateCentsPerHour: 1 }];
  plan.teams = [{ ...plan.teams[0], personIds: ['product-one'] }];
  const work = id => session(id, { teamId: 'delivery', personIds: ['product-one'] });
  plan.work = [work('first'), work('second')]; plan.practices = []; concept(plan).workIds = ['first', 'second'];
  plan.assuranceSettings.recoveryEvents = [{ ...event(['first']), receiverPersonId: 'product-one' }];
  const before = read(plan), total = summarizeAssuranceWork(before, ['first', 'second', 'first']);
  assert.equal(total.personMinutes, 60); assert.equal(total.knownLineCents, 2); assert.equal(total.totalLineCents, 2);
  assert.deepEqual(before.investment, { knownCents: 1, totalCents: 1, lineRoundingAdjustments: { allocatedCents: 0, additionalCents: -1 } });
  assert.equal(badgeRows(before, 'people', 'product-one')[0].label, 'Quality work planned');
  concept(plan).included = false; plan.assuranceSettings.quality.included = false;
  const available = read(plan);
  assert.equal(available.concepts.find(row => row.conceptId === 'reconciliation-replay').included, false);
  assert.deepEqual(available.investment, before.investment);
  assert.deepEqual(badgeRows(available, 'people', 'product-one'), badgeRows(before, 'people', 'product-one'), 'explicit active work remains planned when the illustrative concept is available');
  plan.work[0].status = 'paused'; plan.work[1].lifecycle = 'retired';
  const changed = read(plan), support = changed.concepts.find(row => row.conceptId === 'reconciliation-replay');
  assert.deepEqual([support.workIds, support.activeWorkIds, support.pausedWorkIds, support.retiredWorkIds], [['first', 'second'], [], ['first'], ['second']]);
  assert.deepEqual(changed.investment, before.investment); assert.equal(summarizeAssuranceWork(changed, support.workIds).totalLineCents, 2);
  assert.deepEqual(changed.badges, { people: [], teams: [] });
});

test('work within funded time exposes an attributed amount and zero incremental investment', () => {
  const plan = createExamplePlan();
  plan.people = [{ ...plan.people[0], fundedMinutes: 60, rateCentsPerHour: 10000 }];
  plan.teams = [{ ...plan.teams[0], personIds: ['product-one'] }]; plan.work = []; plan.practices = [];
  const accepted = preparePlan(plan), settings = structuredClone(accepted.state.assuranceSettings);
  settings.quality.concepts[0].workIds = ['allocated-review'];
  const proposal = prepareAssuranceProposal(accepted, { assuranceSettings: settings,
    newWork: [session('allocated-review', { teamId: 'delivery', personIds: ['product-one'], funding: 'allocated' })], workUpdates: [], connectionUpdates: [] });
  const reading = projectAssuranceConsequences(accepted, proposal), work = summarizeAssuranceWork(reading.proposed, ['allocated-review']);
  assert.equal(work.totalLineCents, 5000); assert.equal(work.allocated.totalLineCents, 5000); assert.equal(work.additional.totalLineCents, 0);
  assert.deepEqual(reading.change.money, { beforeKnownCents: 10000, afterKnownCents: 10000, knownDeltaCents: 0,
    beforeTotalCents: 10000, afterTotalCents: 10000, totalDeltaCents: 0 });
});

test('an unknown rate, zero effort and zero authored recovery events retain different meanings', () => {
  const plan = createShowcasePlan(); plan.people.find(row => row.id === 'noor').rateCentsPerHour = null;
  plan.work.push(session('response'), session('zero-work', { minutesPerOccurrence: 0 }));
  concept(plan).workIds = ['response', 'zero-work'];
  plan.assuranceSettings.context.recoveryRatePersonIds = ['noor', 'sam'];
  plan.assuranceSettings.recoveryEvents = [{ ...event(['response']), eventCount: 0 }];
  const reading = read(plan), response = summarizeAssuranceWork(reading, ['response']), zero = summarizeAssuranceWork(reading, ['zero-work']);
  assert.equal(response.personMinutes, 60); assert.equal(response.knownLineCents, 4500); assert.equal(response.totalLineCents, null); assert.equal(response.lineAmountStatus, 'incomplete');
  assert.equal(zero.personMinutes, 0); assert.equal(zero.knownLineCents, 0); assert.equal(zero.totalLineCents, 0); assert.equal(zero.lineAmountStatus, 'priced');
  assert.equal(reading.investment.totalCents, null);
  assert.equal(reading.recovery.events[0].aggregatePersonMinutes, 0); assert.equal(reading.recovery.estimate.hours, 0); assert.equal(reading.recovery.estimate.amountCents, 0);
  assert.deepEqual(reading.concepts.find(row => row.conceptId === 'reconciliation-replay').activeWorkIds, ['response']);
  assert.deepEqual(badgeRows(reading, 'people', 'noor')[0].workIds, ['response']);
});

test('badges name actual work and the recorded reviewer, without propagating through membership or illustrative rates', () => {
  const plan = createShowcasePlan(); plan.work.push(session('response'));
  concept(plan, 'independent-review').workIds = ['response'];
  plan.assuranceSettings.context.recoveryRatePersonIds = ['maya'];
  plan.assuranceSettings.rehearsals = [{ ...rehearsal(['response']), reviewerPersonId: 'leo', personIds: ['maya', 'leo', 'noor', 'sam'] }];
  plan.teams.push({ id: 'other-membership', label: 'Another team with the same people', personIds: ['noor', 'sam'], lifecycle: 'active' });
  const planned = read(plan);
  assert.deepEqual(badgeRows(planned, 'people', 'noor').map(row => [row.label, row.source, row.sourceLabel]), [
    ['Review planned', { kind: 'concept', id: 'independent-review' }, 'Independent review'],
    ['Rehearsal planned', { kind: 'rehearsal', id: 'recovery-response' }, 'A recovery rehearsal reveals a gap'],
  ]);
  assert.deepEqual(badgeRows(planned, 'people', 'maya'), []); assert.deepEqual(badgeRows(planned, 'people', 'leo'), []);
  assert.deepEqual(planned.badges.teams.map(row => row.teamId), ['operations']);
  plan.assuranceSettings.rehearsals[0].observation = 'The second recovery attempt still needed an instruction clarified.';
  const observed = read(plan), reviewer = badgeRows(observed, 'people', 'leo');
  assert.deepEqual(reviewer, [{ kind: 'observation', label: 'Observation recorded', sourceLabel: 'A recovery rehearsal reveals a gap',
    source: { kind: 'rehearsal', id: 'recovery-response' }, workIds: ['response'], observedPlanRevision: 0 }]);
  assert.equal(badgeRows(observed, 'people', 'noor').some(row => row.kind === 'observation'), false);
  assert.deepEqual(observed.badges.teams.map(row => row.teamId), ['operations']);
  assert.equal(badgeRows(observed, 'teams', 'operations').at(-1).label, 'Observation recorded');
  assert.equal(Object.hasOwn(observed.rehearsals[0], 'approved'), false); assert.equal(Object.hasOwn(observed.rehearsals[0], 'ready'), false);
  plan.work.find(row => row.id === 'response').status = 'paused';
  plan.work.find(row => row.id === 'response').lifecycle = 'retired';
  const historical = read(plan);
  assert.deepEqual(badgeRows(historical, 'people', 'noor'), []);
  assert.deepEqual(badgeRows(historical, 'people', 'leo'), reviewer);
  assert.equal(historical.rehearsals[0].observation, 'The second recovery attempt still needed an instruction clarified.');
});

test('authored timing retains overlap, recurrence gaps and unknown placement independently of effort', () => {
  const plan = createShowcasePlan();
  plan.work.push(session('preparation', { occurrences: 3, timing: { startMinute: 0, repeatEveryMinutes: 60 } }),
    session('response', { minutesPerOccurrence: 60, timing: { startMinute: 20, repeatEveryMinutes: null } }),
    session('unplaced'), session('empty', { occurrences: 0 }));
  concept(plan).workIds = ['preparation', 'response', 'unplaced', 'empty'];
  const reading = read(plan), combined = summarizeAssuranceWork(reading, ['preparation', 'response', 'preparation', 'empty']);
  assert.equal(combined.personMinutes, 300);
  assert.deepEqual(combined.timing, { placement: 'placed', startMinute: 0, endMinute: 150, elapsedMinutes: 150, unplacedWorkIds: [] });
  assert.deepEqual(reading.work.find(row => row.workId === 'response').timing, { placement: 'placed', startMinute: 20, endMinute: 80, elapsedMinutes: 60 });
  assert.deepEqual(summarizeAssuranceWork(reading, ['preparation', 'unplaced']).timing,
    { placement: 'partial', startMinute: null, endMinute: null, elapsedMinutes: null, unplacedWorkIds: ['unplaced'] });
  assert.deepEqual(summarizeAssuranceWork(reading, ['unplaced']).timing,
    { placement: 'unspecified', startMinute: null, endMinute: null, elapsedMinutes: null, unplacedWorkIds: ['unplaced'] });
  assert.deepEqual(summarizeAssuranceWork(reading, ['empty']).timing,
    { placement: 'empty', startMinute: null, endMinute: null, elapsedMinutes: null, unplacedWorkIds: [] });
  assert.equal(summarizeAssuranceWork(reading, []).totalLineCents, 0);
});

test('consequence snapshots detach preview metadata, retain learning support and freeze every receiving record', () => {
  const plan = createShowcasePlan();
  plan.assuranceSettings.learningActions = [{ id: 'learning-next', promptId: 'source-framing', context: 'Read the source scenario.',
    decisionOwnerPersonId: 'maya', reviewBoundary: null, workIds: ['research'] }];
  const accepted = preparePlan(plan), summary = { money: { knownDeltaCents: 0, totalDeltaCents: 0 },
    newWorkIds: [], reusedWorkIds: ['research'], updatedWorkIds: [], updatedConnectionIds: [] };
  const reading = projectAssuranceConsequences(accepted, { projection: accepted, summary });
  assert.deepEqual(reading.accepted.work.map(row => row.workId), ['research']);
  assert.deepEqual(reading.accepted.badges, { people: [], teams: [] });
  summary.money.knownDeltaCents = 99; summary.reusedWorkIds.push('review');
  assert.equal(reading.change.money.knownDeltaCents, 0); assert.deepEqual(reading.change.reusedWorkIds, ['research']);
  assert.notStrictEqual(reading.accepted.work[0].ledgerLines, accepted.result.ledger[0].lines);
  assert.throws(() => { reading.accepted.work[0].ledgerLines[0].cents = 0; }, TypeError);
  assert.throws(() => { reading.change.reusedWorkIds.push('review'); }, TypeError);
  assert.throws(() => { summarizeAssuranceWork(reading.accepted, ['research']).rows.pop(); }, TypeError);
  assert.equal(projectAssuranceConsequences(accepted).proposed, null); assert.equal(projectAssuranceConsequences(accepted).change, null);
  assert.equal(accepted.serialized, preparePlan(plan).serialized);
});
