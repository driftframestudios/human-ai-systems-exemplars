import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { parsePlan, preparePlan, createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { encodeInvestment, decodeInvestment } from '../../collaboration/native-investment-studio/investment-state.mjs';
import { financialSettings } from '../../collaboration/native-investment-studio/investment-catalog.mjs';
import { projectInvestment, createInvestmentReader, investmentCommandModel } from '../../collaboration/native-investment-studio/investment-projection.mjs';
import { analyseInvestment } from '../../collaboration/native-investment-studio/investment-financials.mjs';
import { createCadence } from '../../collaboration/native-investment-studio/cadence.mjs';

function edit(studio, mutate, gesture = null) {
  const decks = decodeInvestment(studio.read().state.investmentSettings); mutate(decks);
  return studio.applyCommand({ type: 'investment.settings.replace', investmentSettings: encodeInvestment(decks) }, studio.read(), gesture);
}

function placedInvestmentPlan() {
  const plan = createExamplePlan();
  plan.people[1].rateCentsPerHour = null;
  plan.people[2].rateCentsPerHour = 20000;
  plan.people[3].rateCentsPerHour = 5000;
  const work = plan.work[0];
  Object.assign(work, { label: 'Review', personIds: ['product-one'], occurrences: 4 });
  work.sessionOverrides = [
    { occurrenceIndex: 0, label: 'Funded review', teamId: 'delivery', personIds: ['product-one', 'product-two'],
      minutesPerOccurrence: 60, funding: 'allocated', status: 'planned' },
    { occurrenceIndex: 2, label: 'Paused review', teamId: 'delivery', personIds: ['engineering-one'],
      minutesPerOccurrence: 90, funding: 'additional', status: 'paused' },
  ];
  plan.work.push(
    { id: 'followup', label: 'Follow up', teamId: 'delivery', personIds: ['engineering-two'],
      minutesPerOccurrence: 60, occurrences: 2, funding: 'allocated', status: 'planned', timing: null, lifecycle: 'active' },
    { id: 'unplaced', label: 'Unplaced work', teamId: 'delivery', personIds: ['engineering-one'],
      minutesPerOccurrence: 15, occurrences: 1, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active' },
  );
  plan.scoreSettings.cadence = createCadence('sprint', 3);
  plan.scoreSettings.cadence.placements = [
    { workId: 'review', occurrenceIndex: 2, periodId: 'period-2', subdivision: 1 },
    { workId: 'followup', occurrenceIndex: 0, periodId: 'period-1', subdivision: 1 },
    { workId: 'review', occurrenceIndex: 0, periodId: 'period-1', subdivision: 1 },
    { workId: 'review', occurrenceIndex: 3, periodId: null, subdivision: null },
    { workId: 'followup', occurrenceIndex: 1, periodId: 'period-3', subdivision: 2 },
    { workId: 'review', occurrenceIndex: 1, periodId: 'period-2', subdivision: 1 },
  ];
  return plan;
}

test('Investment keeps authored placement order and each session setting across overlapping, disjoint and unplaced work', () => {
  const model = projectInvestment(preparePlan(placedInvestmentPlan()));
  assert.deepEqual(model.pricing.sessions, [
    {
      tape: { id: 'review', name: 'Review', people: ['product-one', 'product-two', 'engineering-one'],
        occurrences: [{ period: 'period-2' }, { period: 'period-1' }, { period: null }, { period: 'period-2' }] },
      hours: 3.5, effort: 4.5,
      fundingParts: { funded: { effort: 2, cost: 100, complete: false }, extra: { effort: 2.5, cost: 400, complete: true } },
      people: [{ personId: 'product-one', hours: 2, cost: 200 }, { personId: 'product-two', hours: 1, cost: null },
        { personId: 'engineering-one', hours: 1.5, cost: 300 }],
      placements: [{ period: 'period-2', funding: 'extra', cost: 300 }, { period: 'period-1', funding: 'funded', cost: 100 },
        { period: null, funding: 'extra', cost: 50 }, { period: 'period-2', funding: 'extra', cost: 50 }],
      cost: 500, complete: false, funding: 'mixed',
    },
    {
      tape: { id: 'followup', name: 'Follow up', people: ['engineering-two'],
        occurrences: [{ period: 'period-1' }, { period: 'period-3' }] },
      hours: 2, effort: 2,
      fundingParts: { funded: { effort: 2, cost: 100, complete: true }, extra: { effort: 0, cost: 0, complete: true } },
      people: [{ personId: 'engineering-two', hours: 2, cost: 100 }],
      placements: [{ period: 'period-1', funding: 'funded', cost: 50 }, { period: 'period-3', funding: 'funded', cost: 50 }],
      cost: 100, complete: true, funding: 'funded',
    },
    {
      tape: { id: 'unplaced', name: 'Unplaced work', people: ['engineering-one'], occurrences: [] },
      hours: 0.25, effort: 0.25,
      fundingParts: { funded: { effort: 0, cost: 0, complete: true }, extra: { effort: 0.25, cost: 50, complete: true } },
      people: [{ personId: 'engineering-one', hours: 0.25, cost: 50 }], placements: [],
      cost: 50, complete: true, funding: 'extra',
    },
  ]);
});

test('Investment placement preparation belongs to one accepted plan and leaves earlier readings intact', () => {
  const plan = placedInvestmentPlan(), first = projectInvestment(preparePlan(plan));
  plan.scoreSettings.cadence.placements = [
    { workId: 'review', occurrenceIndex: 2, periodId: 'period-3', subdivision: 2 },
  ];
  plan.work[0].sessionOverrides[1].funding = 'allocated';
  const next = projectInvestment(preparePlan(plan));
  assert.deepEqual(next.pricing.sessions[0].placements, [{ period: 'period-3', funding: 'funded', cost: 300 }]);
  assert.deepEqual(next.pricing.sessions[1].placements, []);
  assert.deepEqual(first.pricing.sessions[0].placements[0], { period: 'period-2', funding: 'extra', cost: 300 });
  plan.scoreSettings.cadence = null;
  const untimed = projectInvestment(preparePlan(plan));
  assert.deepEqual(untimed.periods, []);
  assert.deepEqual(untimed.pricing.sessions.map(row => [row.tape.occurrences, row.placements]), [[[], []], [[], []], [[], []]]);
});
test('financial copies own their assumptions; remove, global Undo and saved files retain identity and price isolation', () => {
  const studio = createStudio(createShowcasePlan()), price = studio.read().result, original = studio.read();
  assert.equal(edit(studio, decks => decks.push({ id: 'capital-copy', type: 'capital', sequence: 2, settings: financialSettings('capital') })).ok, true);
  assert.equal(edit(studio, decks => { decks.find(deck => deck.id === 'capital-copy').settings.upfront = 12345.67; }).ok, true);
  const saved = parsePlan(studio.exportText()), decks = decodeInvestment(saved.state.investmentSettings);
  assert.equal(decks.find(deck => deck.id === 'capital-copy').settings.upfront, 12345.67);
  assert.equal(decks.find(deck => deck.id === 'investment-capital-1').settings.upfront, 20000);
  assert.deepEqual(saved.result, price);
  assert.equal(edit(studio, decks => decks.splice(decks.findIndex(deck => deck.id === 'capital-copy'), 1)).ok, true);
  studio.undo(studio.read()); assert.deepEqual(studio.read().state.investmentSettings, saved.state.investmentSettings);
  assert.equal(original.state.investmentSettings.decks.length, 5);
  assert.equal(edit(studio, decks => decks.push(structuredClone(decks[0]))).error.code, 'duplicate-id');
  assert.equal(edit(studio, decks => { decks.find(deck => deck.type === 'rollout').settings.setup = 200000; }).error.code, 'investment-number',
    'saved values share the displayed control bounds');
});
test('one dial gesture is one undo; new turns, intervening edits and traversal separate history', () => {
  const studio = createStudio(), first = Symbol('budget turn'), second = Symbol('next turn');
  edit(studio, decks => { decks[0].settings.budget = 11000; }, first);
  edit(studio, decks => { decks[0].settings.budget = 12000; }, first);
  assert.equal(studio.readHistory().undoCount, 1);
  edit(studio, decks => { decks[0].settings.budget = 13000; }, second);
  assert.equal(studio.readHistory().undoCount, 2);
  studio.applyCommand({ type: 'work.funding.set', workId: 'review', funding: 'allocated' }, studio.read());
  edit(studio, decks => { decks[0].settings.budget = 14000; }, second);
  assert.equal(studio.readHistory().undoCount, 4);
  studio.undo(studio.read()); assert.equal(decodeInvestment(studio.read().state.investmentSettings)[0].settings.budget, 13000);
  studio.undo(studio.read()); studio.undo(studio.read()); studio.undo(studio.read());
  assert.equal(decodeInvestment(studio.read().state.investmentSettings)[0].settings.budget, 10000);
  edit(studio, decks => { decks[0].settings.budget = 15000; }, first);
  assert.equal(studio.readHistory().undoCount, 1);
});
test('legacy plans gain independent comparison defaults; canonical ledger and authored periods feed the plan deck', () => {
  const legacy = createShowcasePlan(); legacy.schemaVersion = '0.9.0'; delete legacy.investmentSettings;
  const projection = preparePlan(legacy), model = projectInvestment(projection), plan = model.investment.decks[0];
  assert.equal(projection.state.schemaVersion, '0.11.0');
  assert.equal(model.investment.decks.length, 5);
  assert.equal(model.pricing.total, projection.result.knownCommitmentCents / 100);
  assert.equal(analyseInvestment(plan, model.pricing).amount, model.pricing.total);
  assert.deepEqual(model.periods, projection.state.scoreSettings.cadence.periods);
  const service = model.investment.decks.find(deck => deck.type === 'service');
  const before = analyseInvestment(service, model.pricing).releasedHours;
  service.settings.adoption = 100;
  assert.ok(analyseInvestment(service, model.pricing).releasedHours > before);
  assert.equal(projectInvestment(projection).investment.decks.find(deck => deck.type === 'service').settings.adoption, 60);
  assert.doesNotThrow(() => projectInvestment(preparePlan(createExamplePlan())));
});

test('accepted Investment readings and analyses are reused with nested immutable values', () => {
  const studio = createStudio(createShowcasePlan()), projection = studio.read();
  const read = createInvestmentReader(), context = read(projection);
  assert.equal(read(projection), context);
  assert.equal(context.projection, projection);
  const capital = context.record('investment-capital-1'), analysis = context.analysis(capital.id);
  assert.equal(capital, context.model.investment.decks.find(deck => deck.id === capital.id));
  assert.equal(context.analysis(capital.id), analysis);
  assert.equal(context.analysis('missing'), undefined);
  assert.equal(context.record('missing'), undefined);
  assert.throws(() => { capital.settings.upfront = 1; }, TypeError);
  assert.throws(() => { context.model.pricing.sessions[0].tape.people.push('extra-person'); }, TypeError);
  assert.throws(() => { analysis.selected.flows[0] = 1; }, TypeError);
  assert.throws(() => { context.model.investment.decks.pop(); }, TypeError);
  assert.ok(Object.isFrozen(context));
});

test('command settings are detached while shared readings and captured exports remain unchanged', () => {
  const studio = createStudio(createShowcasePlan()), read = createInvestmentReader();
  const context = read(studio.read()), captured = studio.exportText();
  const first = investmentCommandModel(context), second = investmentCommandModel(context);
  assert.equal(first.pricing, context.model.pricing);
  assert.equal(first.people, context.model.people);
  assert.equal(first.periods, context.model.periods);
  const originalBudget = context.record('investment-plan-1').settings.budget;
  first.investment.decks.find(deck => deck.id === 'investment-plan-1').settings.budget = 12345;
  first.investment.decks.push({ id: 'independent-copy', type: 'plan', sequence: 2, settings: financialSettings('plan') });
  assert.equal(second.investment.decks.find(deck => deck.id === 'investment-plan-1').settings.budget, originalBudget);
  assert.equal(second.investment.decks.length, context.model.investment.decks.length);
  assert.equal(studio.exportText(), captured, 'preparing a command leaves accepted state intact');
  assert.equal(studio.applyCommand({ type: 'investment.settings.replace', investmentSettings: encodeInvestment(first.investment.decks) }, context.projection).ok, true);
  assert.equal(read(studio.read()).record('investment-plan-1').settings.budget, 12345);
  assert.equal(context.record('investment-plan-1').settings.budget, originalBudget);
  assert.equal(context.projection.serialized, captured);
  assert.equal(parsePlan(captured).state.investmentSettings.decks.length, context.model.investment.decks.length);
});

test('same-revision replacement and Undo receive fresh contexts with their own readings', () => {
  const studio = createStudio(createShowcasePlan()), read = createInvestmentReader();
  const original = read(studio.read()), originalBudget = original.record('investment-plan-1').settings.budget;
  const replacement = JSON.parse(studio.exportText());
  replacement.investmentSettings.decks.find(deck => deck.id === 'investment-plan-1').settings.budget = 1234500;
  assert.equal(studio.replace(replacement, studio.read()).ok, true);
  const replaced = read(studio.read());
  assert.equal(replaced.projection.state.revision, original.projection.state.revision);
  assert.notEqual(replaced, original);
  assert.equal(replaced.record('investment-plan-1').settings.budget, 12345);
  assert.equal(original.record('investment-plan-1').settings.budget, originalBudget);
  assert.equal(studio.undo(studio.read()).ok, true);
  const restored = read(studio.read());
  assert.notEqual(restored, original, 'Undo admits a fresh projection envelope even when restoring the original state');
  assert.notEqual(restored, replaced);
  assert.equal(restored.projection.state, original.projection.state);
  assert.equal(restored.record('investment-plan-1').settings.budget, originalBudget);
  assert.equal(read(studio.read()), restored);
  assert.equal(replaced.record('investment-plan-1').settings.budget, 12345);
});
