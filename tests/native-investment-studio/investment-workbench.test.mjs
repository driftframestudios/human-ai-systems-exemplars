import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { parsePlan, preparePlan, createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createShowcasePlan } from '../../collaboration/native-investment-studio/presets.mjs';
import { encodeInvestment, decodeInvestment } from '../../collaboration/native-investment-studio/investment-state.mjs';
import { financialSettings } from '../../collaboration/native-investment-studio/investment-catalog.mjs';
import { projectInvestment } from '../../collaboration/native-investment-studio/investment-projection.mjs';
import { analyseInvestment } from '../../collaboration/native-investment-studio/investment-financials.mjs';

function edit(studio, mutate, gesture = null) {
  const decks = decodeInvestment(studio.read().state.investmentSettings); mutate(decks);
  return studio.applyCommand({ type: 'investment.settings.replace', investmentSettings: encodeInvestment(decks) }, studio.read(), gesture);
}
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
