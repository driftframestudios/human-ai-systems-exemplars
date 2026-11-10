import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExamplePlan, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { projectInvestment } from '../../collaboration/native-investment-studio/investment-projection.mjs';
import { analyseInvestment } from '../../collaboration/native-investment-studio/investment-financials.mjs';
import { readPersonSessionSpread, readWorkParticipation, planPersonSessionSpread } from '../../collaboration/native-investment-studio/people-capacity.mjs';
import { projectAssuranceConsequences, summarizeAssuranceWork } from '../../collaboration/native-investment-studio/assurance-consequences.mjs';
import { captureStudioReport } from '../../collaboration/native-investment-studio/reports.mjs';

function variedPlan() {
  const plan = createExamplePlan(), work = plan.work[0];
  Object.assign(work, { occurrences: 2, personIds: ['product-one', 'product-two'], funding: 'allocated' });
  work.sessionOverrides = [{ occurrenceIndex: 1, label: 'Specialist response', teamId: work.teamId,
    personIds: ['engineering-one'], minutesPerOccurrence: 60, funding: 'additional', status: 'paused' }];
  plan.assuranceSettings.quality.concepts[0].workIds = [work.id];
  return plan;
}

test('investment decks retain distinct people and funding portions from a varied tape', () => {
  const model = projectInvestment(preparePlan(variedPlan())), session = model.pricing.sessions[0];
  assert.equal(session.hours, 1.5);
  assert.equal(session.effort, 2, 'Two people join for 30 minutes; one person joins the 60-minute session.');
  assert.equal(session.funding, 'mixed');
  assert.deepEqual(session.people.map(row => [row.personId, row.hours, row.cost]), [
    ['product-one', 0.5, 50], ['product-two', 0.5, 50], ['engineering-one', 1, 100],
  ]);
  assert.deepEqual(session.fundingParts, { funded: { cost: 100, effort: 1, complete: true }, extra: { cost: 100, effort: 1, complete: true } });
  const planDeck = model.investment.decks.find(deck => deck.type === 'plan');
  for (const domain of ['funded', 'extra']) {
    assert.equal(analyseInvestment({ ...planDeck, settings: { ...planDeck.settings, domain } }, model.pricing).visibleSessions.length, 1);
  }
});

test('participation readers retain partial assignment and protect an effective sole participant', () => {
  const studio = createStudio(variedPlan()), projection = studio.read(), work = projection.state.work[0];
  assert.deepEqual(readWorkParticipation(work, 'product-one'), {
    included: true, complete: false, partial: true, sessionCount: 1, personMinutes: 30, pinned: false,
  });
  assert.equal(readPersonSessionSpread(projection, 'product-one').personMinutes, 30);
  assert.equal(readPersonSessionSpread(projection, 'engineering-one').pinnedPlans, 1);
  assert.deepEqual(planPersonSessionSpread(projection, 'engineering-one', 0).command.workIds, ['review']);
  const accepted = studio.applyCommand({ type: 'work.participant.set', workId: 'review', personId: 'product-one', included: true }, projection);
  assert.equal(accepted.ok, true, accepted.error?.message);
  assert.equal(readWorkParticipation(accepted.projection.state.work[0], 'product-one').complete, true);
  assert.deepEqual(accepted.projection.state.work[0].sessionOverrides[0].personIds, ['engineering-one', 'product-one']);
  assert.equal(accepted.projection.state.work[0].sessionOverrides[0].status, 'paused');
});

test('quality support excludes a paused-only participant while retaining planned cost in both funding pools', () => {
  const reading = projectAssuranceConsequences(preparePlan(variedPlan())).accepted;
  assert.deepEqual(reading.badges.people.map(row => row.personId), ['product-one', 'product-two']);
  assert.deepEqual(reading.concepts[0].activeWorkIds, ['review']);
  assert.deepEqual(reading.concepts[0].pausedWorkIds, ['review']);
  const summary = summarizeAssuranceWork(reading, ['review']);
  assert.equal(summary.personMinutes, 120);
  assert.equal(summary.allocated.totalLineCents, 10000);
  assert.equal(summary.additional.totalLineCents, 10000);
});

test('Shared-session ordering reorders existing memberships while each session keeps its own participants and settings', () => {
  const plan = variedPlan();
  plan.work[0].sessionOverrides[0].personIds = ['engineering-one', 'product-two'];
  const studio = createStudio(plan), before = studio.read();
  const incomplete = studio.applyCommand({ type: 'work.participants.reorder', workId: 'review',
    personIds: ['product-two', 'product-one'] }, before);
  assert.equal(incomplete.error.code, 'order'); assert.strictEqual(studio.read(), before);
  const accepted = studio.applyCommand({ type: 'work.participants.reorder', workId: 'review',
    personIds: ['product-two', 'product-one', 'engineering-one'] }, before);
  assert.equal(accepted.ok, true, accepted.error?.message);
  const work = accepted.projection.state.work[0];
  assert.deepEqual(work.personIds, ['product-two', 'product-one']);
  assert.deepEqual(work.sessionOverrides[0], { ...before.state.work[0].sessionOverrides[0],
    personIds: ['product-two', 'engineering-one'] });
  assert.equal(work.occurrences, 2);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.deepEqual(studio.read().state, before.state);
});

test('readable report states varied duration and separates the actual funding attribution', () => {
  const report = captureStudioReport(preparePlan(variedPlan()));
  assert.match(report.capsule, /1 h 30 min across 2 sessions · Funded time and extra investment · mixed/);
  const ledger = report.html.match(/<caption>Work line attribution · USD<\/caption>[\s\S]*?<\/table>/)[0];
  assert.match(ledger, /engineering-one<\/td><td>Extra investment<\/td><td>1 h<\/td><td>\$100\.00/);
  assert.match(ledger, /product-one<\/td><td>Within funded time<\/td><td>30 min<\/td><td>\$50\.00/);
});
