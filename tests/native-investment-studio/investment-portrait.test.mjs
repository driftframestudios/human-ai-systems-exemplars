import assert from 'node:assert/strict';
import { test } from 'node:test';
import { financialSettings } from '../../collaboration/native-investment-studio/investment-catalog.mjs';
import { investmentPortrait, roseSectors } from '../../collaboration/native-investment-studio/investment-portrait.mjs';

const pricing = { total: 4000, complete: true, sessions: [] };
test('financial portraits retain signed amounts and distinguish unavailable returns from zero', () => {
  const plan = investmentPortrait({ type: 'plan', settings: { ...financialSettings('plan'), budget: 3000 } }, pricing);
  assert.equal(plan.unit, 'USD');
  assert.deepEqual(plan.entries.map(item => item.label), ['Planned work', 'Reserve', 'Options', 'Shortfall']);
  assert.ok(plan.entries.at(-1).value < 0);
  const capital = investmentPortrait({ type: 'capital', settings: { ...financialSettings('capital'), metric: 'irr' } }, pricing);
  assert.equal(capital.unit, '% / quarter');
  assert.equal(capital.entries[0].value, null, 'Keep current has no calculable IRR');
  assert.equal(capital.entries[0].text, 'Unavailable');
});
test('rose sectors encode amount by area, preserving zero and negative readings', () => {
  const sectors = roseSectors([{ value: 100 }, { value: 25 }, { value: -25 }, { value: 0 }]);
  assert.equal(sectors[1].radius, sectors[0].radius / 2, 'one quarter of the area has half the radius');
  assert.equal(sectors[2].radius, sectors[1].radius, 'signed magnitudes share the same area');
  assert.equal(sectors[2].value, -25, 'sign remains available for the visual and exact reading');
  assert.equal(sectors[3].path, '');
  assert.ok(sectors.every(item => !item.path.includes('NaN')));
});
test('operational lenses compare one unit at a time using the current assumptions', () => {
  const settings = financialSettings('service');
  const time = investmentPortrait({ type: 'service', settings }, pricing);
  const budget = investmentPortrait({ type: 'service', settings: { ...settings, domain: 'budget' } }, pricing);
  assert.equal(time.unit, 'hours / week'); assert.equal(budget.unit, 'USD / quarter');
  const changed = investmentPortrait({ type: 'service', settings: { ...settings, adoption: 30 } }, pricing);
  assert.notEqual(changed.entries[0].value, time.entries[0].value, 'adoption changes the portrayed population');
});
