import { INVESTMENT_TYPES, financialSettings, freezeInvestmentDefinition } from './investment-catalog.mjs';

// Saved numeric assumptions use hundredths; calculator/display values use units.
// This retains the plan contract's integer-token transport and exact money edits.
export const INVESTMENT_SCALE = 100;
export const INVESTMENT_DECK_LIMIT = 32;
const VERSION = '1.0.0';
const TYPES = new Set(INVESTMENT_TYPES.map(type => type.id));
const choices = (...values) => ({ choices: values });
const range = (min, max, step = .01) => ({ min, max, step });
const currency = range(0, 1000000);
export const INVESTMENT_FIELDS = freezeInvestmentDefinition({
  plan: { baseline: { ...range(0, 1000000000000), nullable: true }, domain: choices('all', 'funded', 'extra'), budget: currency,
    approach: choices('deliver', 'protect', 'explore', 'custom'), reserve: range(0, 60, 5), opportunity: range(0, 60, 5) },
  rollout: { lifecycle: choices('pilot', 'launch', 'scale', 'custom'), domain: choices('pricing', 'implementation'),
    teams: range(1, 30, 1), setup: range(0, 100000), training: range(0, 40, 1), listPrice: range(0, 100000), discount: range(0, 50, 1), variableCost: range(0, 100000), serviceCost: range(0, 100000) },
  commercial: { lifecycle: choices('acquire', 'deepen', 'recover', 'custom'), domain: choices('retention', 'acquisition'), metric: choices('grr', 'nrr', 'cac', 'payback'),
    openingRevenue: currency, contributionMargin: range(0, 100, 1), retained: range(0, 100, 1), expansion: range(0, 100000), newRevenue: range(0, 500000),
    newCustomers: range(0, 100, 1), acquisitionSpend: currency, reactivation: range(0, 100000) },
  service: { lifecycle: choices('discover', 'pilot', 'operate', 'custom'), domain: choices('time', 'budget', 'capacity'), baselineCost: range(0, 10000),
    people: range(20, 200, 10), adoption: range(0, 100, 1), minutes: range(0, 30, 1), candidateCost: range(0, 10000), capacity: range(0, 200, 10) },
  capital: { alternative: choices('current', 'pilot', 'rollout'), lifecycle: choices('ramp', 'steady', 'expand'), metric: choices('npv', 'irr', 'payback'),
    quarters: range(2, 12, 1), upfront: currency, benefit: currency, discount: range(0, 10, .5), sensitivity: { values: [80, 100, 120] } },
});

export function encodeInvestment(decks) {
  return { version: VERSION, decks: decks.map(deck => ({ id: deck.id, type: deck.type, sequence: deck.sequence,
    settings: Object.fromEntries(Object.entries(deck.settings).map(([key, value]) => [key, typeof value === 'number' ? Math.round(value * INVESTMENT_SCALE) : value])) })) };
}
export function decodeInvestment(state) {
  return state.decks.map(deck => ({ ...deck, settings: Object.fromEntries(Object.entries(deck.settings)
    .map(([key, value]) => [key, typeof value === 'number' ? value / INVESTMENT_SCALE : value])) }));
}
export function createInvestmentSettings() {
  return encodeInvestment(INVESTMENT_TYPES.map(type => ({ id: `investment-${type.id}-1`, type: type.id, sequence: 1, settings: financialSettings(type.id) })));
}

// Admission uses the parent contract's descriptor reader and finite collection
// boundary. External records never dispatch code or carry executable accessors.
export function admitInvestment(value, path, { dataRecord, list, text, integer, reject }) {
  const read = (value, keys, path) => dataRecord(value, keys, new Set(keys), path);
  const state = read(value, ['version', 'decks'], path);
  if (state.version !== VERSION) reject('investment-version', `${path}.version`, 'Use the supported investment settings version.');
  const ids = new Set();
  const decks = list(state.decks, INVESTMENT_DECK_LIMIT, `${path}.decks`).map((value, index) => {
    const at = `${path}.decks[${index}]`, row = read(value, ['id', 'type', 'sequence', 'settings'], at);
    const id = text(row.id, `${at}.id`, true);
    if (ids.has(id)) reject('duplicate-id', `${at}.id`, 'Give each investment deck its own identity.');
    ids.add(id);
    if (!TYPES.has(row.type)) reject('investment-type', `${at}.type`, 'Choose an available investment deck type.');
    const fields = INVESTMENT_FIELDS[row.type], raw = read(row.settings, Object.keys(fields), `${at}.settings`), settings = {};
    for (const [key, rule] of Object.entries(fields)) {
      const item = raw[key], here = `${at}.settings.${key}`;
      if (rule.choices) {
        if (!rule.choices.includes(item)) reject('investment-choice', here, 'Choose an available comparison setting.');
      } else if (!(rule.nullable && item === null)) {
        if (!Number.isSafeInteger(item) || rule.values && !rule.values.includes(item / INVESTMENT_SCALE)
          || !rule.values && (item < rule.min * INVESTMENT_SCALE || item > rule.max * INVESTMENT_SCALE || item % Math.round(rule.step * INVESTMENT_SCALE) !== 0))
          reject('investment-number', here, 'Use a value within this comparison control’s range.');
      }
      settings[key] = item;
    }
    return { id, type: row.type, sequence: integer(row.sequence, 1000000, `${at}.sequence`, 1), settings };
  });
  return { version: VERSION, decks };
}
