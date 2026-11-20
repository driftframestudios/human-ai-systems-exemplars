import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createExamplePlan, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { INVESTMENT_TYPES, PLAN_APPROACHES, FINANCIAL_PRESETS, financialSettings } from '../../collaboration/native-investment-studio/investment-catalog.mjs';
import { INVESTMENT_FIELDS, encodeInvestment } from '../../collaboration/native-investment-studio/investment-state.mjs';
import { investmentChoices, writeInvestmentField, selectPlanApproach, selectLifecycle, selectCommercialMetric } from '../../collaboration/native-investment-studio/investment-deck-config.mjs';

import { investmentDeckView } from '../../collaboration/native-investment-studio/investment-deck-views.mjs';

const deck = type => ({ id: `test-${type}`, type, sequence: 1, settings: financialSettings(type) });

test('each deck presents exactly the admitted choices in contract order with independent valid defaults', () => {
  const plan = createExamplePlan();
  for (const { id: type } of INVESTMENT_TYPES) {
    assert.equal(typeof investmentDeckView(type).create, 'function', `${type} has an explicit renderer`);
    assert.ok(Object.isFrozen(investmentDeckView(type)));
    assert.deepEqual(Object.keys(financialSettings(type)).sort(), Object.keys(INVESTMENT_FIELDS[type]).sort());
    for (const [field, rule] of Object.entries(INVESTMENT_FIELDS[type])) {
      if (!rule.choices) continue;
      const choices = investmentChoices(type, field);
      assert.deepEqual(choices.map(([id]) => id), rule.choices, `${type}.${field} follows admitted IDs and order`);
      assert.ok(Object.isFrozen(choices));
      for (const choice of choices) {
        assert.ok(Object.isFrozen(choice));
        const [id, label] = choice;
        assert.equal(typeof label, 'string'); assert.ok(label.trim());
        const candidate = deck(type); candidate.settings[field] = id;
        plan.investmentSettings = encodeInvestment([candidate]);
        assert.doesNotThrow(() => preparePlan(plan), `${type}.${field}=${id} remains admitted`);
      }
    }
  }
  assert.deepEqual(investmentChoices('plan', 'domain'), [['all', 'Whole plan'], ['funded', 'Funded time'], ['extra', 'Extra investment']]);
  assert.deepEqual(investmentChoices('commercial', 'metric'), [['grr', 'GRR'], ['nrr', 'NRR'], ['cac', 'CAC'], ['payback', 'Payback']]);
  assert.deepEqual(investmentChoices('service', 'domain'), [['time', 'Working time'], ['budget', 'Service budget'], ['capacity', 'Capacity']]);
});

test('shared definitions are deeply immutable while same-type defaults remain owned settings', () => {
  assert.throws(() => { INVESTMENT_TYPES[0].title = 'Changed'; }, TypeError);
  assert.throws(() => { PLAN_APPROACHES[0].reserve = 0; }, TypeError);
  assert.throws(() => { FINANCIAL_PRESETS.rollout[0].values.teams = 30; }, TypeError);
  assert.throws(() => { INVESTMENT_FIELDS.plan.domain.choices.push('other'); }, TypeError);
  assert.throws(() => { INVESTMENT_FIELDS.capital.sensitivity.values[0] = 0; }, TypeError);
  assert.throws(() => { INVESTMENT_FIELDS.plan.budget.max = 1; }, TypeError);
  assert.throws(() => { investmentChoices('plan', 'domain')[0][1] = 'Changed'; }, TypeError);
  const first = deck('rollout'), second = deck('rollout');
  selectLifecycle(first, 'scale');
  writeInvestmentField(first, 'listPrice', 2900);
  assert.equal(first.settings.listPrice, 2900);
  assert.equal(first.settings.lifecycle, 'custom');
  assert.equal(second.settings.listPrice, 1500);
  assert.equal(second.settings.lifecycle, 'pilot');
  assert.equal(financialSettings('rollout').listPrice, 1500);
});

test('named preset effects preserve coupled values and Custom keeps the current amounts', () => {
  const plan = deck('plan');
  selectPlanApproach(plan, 'protect');
  assert.deepEqual(plan.settings, { baseline: null, domain: 'all', budget: 10000, approach: 'protect', reserve: 30, opportunity: 5 });
  writeInvestmentField(plan, 'reserve', 20);
  assert.deepEqual([plan.settings.approach, plan.settings.reserve, plan.settings.opportunity], ['custom', 20, 5]);
  selectPlanApproach(plan, 'custom');
  assert.deepEqual([plan.settings.reserve, plan.settings.opportunity], [20, 5]);
  selectPlanApproach(plan, 'explore');
  writeInvestmentField(plan, 'domain', 'extra');
  assert.equal(plan.settings.approach, 'explore', 'view selection retains the budget approach');
  writeInvestmentField(plan, 'budget', 12000);
  assert.equal(plan.settings.approach, 'custom');

  const rollout = deck('rollout');
  selectLifecycle(rollout, 'scale');
  assert.deepEqual(rollout.settings, { lifecycle: 'scale', domain: 'pricing', teams: 12, setup: 2000, training: 4,
    listPrice: 2400, discount: 15, variableCost: 600, serviceCost: 180 });
  selectLifecycle(rollout, 'custom');
  assert.deepEqual([rollout.settings.teams, rollout.settings.setup, rollout.settings.training], [12, 2000, 4]);
  writeInvestmentField(rollout, 'teams', 8);
  assert.equal(rollout.settings.lifecycle, 'custom');
  assert.equal(rollout.settings.teams, 8);
});

test('commercial readings select their corresponding control group without altering the cohort preset', () => {
  const commercial = deck('commercial');
  selectCommercialMetric(commercial, 'cac');
  assert.deepEqual([commercial.settings.metric, commercial.settings.domain, commercial.settings.lifecycle], ['cac', 'acquisition', 'deepen']);
  selectCommercialMetric(commercial, 'grr');
  assert.deepEqual([commercial.settings.metric, commercial.settings.domain, commercial.settings.lifecycle], ['grr', 'retention', 'deepen']);
  writeInvestmentField(commercial, 'openingRevenue', 120000);
  assert.equal(commercial.settings.lifecycle, 'deepen', 'a value outside the lifecycle preset retains that selection');
  writeInvestmentField(commercial, 'retained', 90);
  assert.equal(commercial.settings.lifecycle, 'custom');
});

test('unsupported dispatch leaves candidates intact and state admission continues to reject invalid final values', () => {
  for (const type of ['unknown', 'toString', '__proto__']) assert.throws(() => investmentDeckView(type), TypeError);
  const plan = deck('plan'), before = structuredClone(plan);
  for (const [type, field] of [['unknown', 'domain'], ['toString', 'domain'], ['plan', '__proto__'], ['plan', 'budget']])
    assert.throws(() => investmentChoices(type, field), TypeError);
  assert.throws(() => writeInvestmentField(plan, '__proto__', {}), TypeError);
  assert.throws(() => writeInvestmentField({ ...plan, type: 'toString' }, 'budget', 1), TypeError);
  assert.throws(() => selectLifecycle(plan, 'pilot'), TypeError);
  assert.throws(() => selectPlanApproach(deck('service'), 'protect'), TypeError);
  assert.throws(() => selectCommercialMetric(deck('capital'), 'npv'), TypeError);
  assert.deepEqual(plan, before);

  const invalid = createExamplePlan();
  writeInvestmentField(plan, 'budget', -1);
  invalid.investmentSettings = encodeInvestment([plan]);
  assert.throws(() => preparePlan(invalid), { code: 'investment-number' });
});
