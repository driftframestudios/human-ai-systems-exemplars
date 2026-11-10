import { PLAN_APPROACHES, FINANCIAL_PRESETS, freezeInvestmentDefinition } from './investment-catalog.mjs';
import { INVESTMENT_FIELDS } from './investment-state.mjs';

const presetLabels = presets => ({ ...Object.fromEntries(presets.map(({ id, label }) => [id, label])), custom: 'Custom' });
const CHOICE_LABELS = freezeInvestmentDefinition({
  plan: { domain: { all: 'Whole plan', funded: 'Funded time', extra: 'Extra investment' },
    approach: presetLabels(PLAN_APPROACHES) },
  rollout: { lifecycle: presetLabels(FINANCIAL_PRESETS.rollout),
    domain: { pricing: 'Price & margin', implementation: 'Implementation' } },
  commercial: { lifecycle: presetLabels(FINANCIAL_PRESETS.commercial),
    domain: { retention: 'Retention', acquisition: 'Acquisition' },
    metric: { grr: 'GRR', nrr: 'NRR', cac: 'CAC', payback: 'Payback' } },
  service: { lifecycle: presetLabels(FINANCIAL_PRESETS.service),
    domain: { time: 'Working time', budget: 'Service budget', capacity: 'Capacity' } },
  capital: { alternative: { current: 'Keep current', pilot: 'Pilot', rollout: 'Rollout' },
    lifecycle: { ramp: 'Ramp up', steady: 'Steady', expand: 'Expand' },
    metric: { npv: 'NPV', irr: 'IRR', payback: 'Payback' } },
});

// Admission supplies the IDs and their order; presentation supplies labels.
const CHOICES = freezeInvestmentDefinition(Object.fromEntries(Object.entries(INVESTMENT_FIELDS).map(([type, fields]) => [type,
  Object.fromEntries(Object.entries(fields).filter(([, rule]) => rule.choices).map(([field, rule]) => {
    const labels = CHOICE_LABELS[type]?.[field];
    if (!labels || Object.keys(labels).length !== rule.choices.length
      || rule.choices.some(id => !Object.hasOwn(labels, id)))
      throw new TypeError(`Provide labels for the admitted ${type}.${field} choices.`);
    return [field, rule.choices.map(id => [id, labels[id]])];
  })),
])));

function requireField(type, field) {
  if (!Object.hasOwn(INVESTMENT_FIELDS, type)) throw new TypeError('Choose a supported investment deck.');
  if (!Object.hasOwn(INVESTMENT_FIELDS[type], field)) throw new TypeError('Choose a field supported by this investment deck.');
  return INVESTMENT_FIELDS[type][field];
}

export function investmentChoices(type, field) {
  if (!requireField(type, field).choices) throw new TypeError('Choose a choice field supported by this investment deck.');
  return CHOICES[type][field];
}

// These effects receive an owned command candidate. The state contract admits
// its final values before publication; mounted controls retain their own guards.
export function writeInvestmentField(record, field, value) {
  requireField(record.type, field);
  record.settings[field] = value;
  if (record.type === 'plan' && ['budget', 'reserve', 'opportunity'].includes(field)) record.settings.approach = 'custom';
  if (Object.hasOwn(FINANCIAL_PRESETS, record.type)
    && FINANCIAL_PRESETS[record.type].some(preset => Object.hasOwn(preset.values, field))) record.settings.lifecycle = 'custom';
}

export function selectPlanApproach(record, value) {
  requireField(record.type, 'approach');
  const preset = PLAN_APPROACHES.find(item => item.id === value);
  if (preset) Object.assign(record.settings, { reserve: preset.reserve, opportunity: preset.opportunity });
  record.settings.approach = value;
}

export function selectLifecycle(record, value) {
  requireField(record.type, 'lifecycle');
  if (!Object.hasOwn(FINANCIAL_PRESETS, record.type)) throw new TypeError('Choose a deck with lifecycle presets.');
  Object.assign(record.settings, FINANCIAL_PRESETS[record.type].find(item => item.id === value)?.values, { lifecycle: value });
}

export function selectCommercialMetric(record, value) {
  requireField(record.type, 'metric');
  if (record.type !== 'commercial') throw new TypeError('Choose the commercial deck for this reading.');
  record.settings.metric = value;
  record.settings.domain = ['grr', 'nrr'].includes(value) ? 'retention' : 'acquisition';
}
