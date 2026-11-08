// The study supplies small, editable examples; the canonical owner supplies financial formulas.
import * as coreModule from '../../collaboration/investment-analysis/core.js';
const core = coreModule.default || globalThis.InvestmentCore;

export const INVESTMENT_TYPES = [
  { id: 'plan', title: 'Plan investment', strip: 'Internal effort', detail: 'People, sessions & funding' },
  { id: 'rollout', title: 'Customer rollout', strip: 'Implementation', detail: 'Price, contribution & rollout' },
  { id: 'commercial', title: 'Commercial cohort', strip: 'Recurring revenue', detail: 'Retention, acquisition & growth' },
  { id: 'service', title: 'Service operations', strip: 'Working experience', detail: 'Time, budget & capacity' },
  { id: 'capital', title: 'Capital choices', strip: 'Investment decision', detail: 'Cash flow, return & sensitivity' },
];
export const PLAN_APPROACHES = [
  { id: 'deliver', label: 'Deliver now', reserve: 10, opportunity: 5 },
  { id: 'protect', label: 'Protect delivery', reserve: 30, opportunity: 5 },
  { id: 'explore', label: 'Explore options', reserve: 10, opportunity: 30 },
];
export const FINANCIAL_PRESETS = {
  rollout: [
    { id: 'pilot', label: 'Pilot', values: { teams: 2, setup: 1500, training: 12, listPrice: 1500, discount: 5, variableCost: 450, serviceCost: 300 } },
    { id: 'launch', label: 'Launch', values: { teams: 6, setup: 2500, training: 8, listPrice: 1800, discount: 10, variableCost: 500, serviceCost: 250 } },
    { id: 'scale', label: 'Scale', values: { teams: 12, setup: 2000, training: 4, listPrice: 2400, discount: 15, variableCost: 600, serviceCost: 180 } },
  ],
  commercial: [
    { id: 'acquire', label: 'Win customers', values: { retained: 85, expansion: 5000, newRevenue: 35000, newCustomers: 35, acquisitionSpend: 18000, reactivation: 0 } },
    { id: 'deepen', label: 'Deepen use', values: { retained: 95, expansion: 20000, newRevenue: 10000, newCustomers: 10, acquisitionSpend: 8000, reactivation: 0 } },
    { id: 'recover', label: 'Recover accounts', values: { retained: 80, expansion: 5000, newRevenue: 15000, newCustomers: 15, acquisitionSpend: 12000, reactivation: 10000 } },
  ],
  service: [
    { id: 'discover', label: 'Discover', values: { people: 80, adoption: 20, minutes: 5, candidateCost: 550, capacity: 20 } },
    { id: 'pilot', label: 'Pilot', values: { people: 80, adoption: 60, minutes: 15, candidateCost: 450, capacity: 60 } },
    { id: 'operate', label: 'Operate', values: { people: 160, adoption: 85, minutes: 20, candidateCost: 380, capacity: 120 } },
  ],
};
export function financialSettings(type) {
  switch (type) {
    case 'plan': return { funding: { synthesis: 'funded', pairing: 'funded', decision: 'extra' }, baseline: null, domain: 'all', budget: 10000, approach: 'deliver', reserve: 10, opportunity: 5 };
    case 'rollout': return { lifecycle: 'pilot', domain: 'pricing', ...FINANCIAL_PRESETS.rollout[0].values };
    case 'commercial': return { lifecycle: 'deepen', domain: 'retention', metric: 'nrr', openingRevenue: 100000, contributionMargin: 70, ...FINANCIAL_PRESETS.commercial[1].values };
    case 'service': return { lifecycle: 'pilot', domain: 'time', baselineCost: 500, ...FINANCIAL_PRESETS.service[1].values };
    case 'capital': return { alternative: 'pilot', lifecycle: 'ramp', metric: 'npv', quarters: 4, upfront: 20000, benefit: 8000, discount: 2, sensitivity: 100 };
    default: throw new Error('Choose a supported investment deck.');
  }
}
function metrics(inputs) {
  const state = core.defaults(); Object.assign(state.inputs, { currency: 'USD', period: 'quarter' }, inputs);
  return core.calculate(state).metrics;
}
const CAPITAL_PROFILES = [
  { id: 'current', label: 'Keep current', investment: 0, benefit: 0, delay: 0 },
  { id: 'pilot', label: 'Pilot', investment: 1, benefit: 1, delay: 0 },
  { id: 'rollout', label: 'Rollout', investment: 2.5, benefit: 1.8, delay: 1 },
];
export function capitalComparison(settings) {
  const flowsFor = (profile, sensitivity = settings.sensitivity) => [
    -settings.upfront * profile.investment,
    ...Array.from({ length: settings.quarters }, (_, index) => {
      const quarter = index + 1 - profile.delay;
      if (quarter <= 0) return 0;
      const ramp = settings.lifecycle === 'ramp' ? Math.min(1, quarter / 3) : settings.lifecycle === 'expand' ? 1 + (quarter - 1) * .05 : 1;
      return settings.benefit * profile.benefit * ramp * sensitivity / 100;
    }),
  ];
  const alternatives = CAPITAL_PROFILES.map(profile => {
    const flows = flowsFor(profile);
    return { ...profile, flows, npv: core.npv(flows, settings.discount / 100), irr: core.irr(flows), payback: core.payback(flows) };
  });
  const selected = alternatives.find(item => item.id === settings.alternative) || alternatives[1];
  const sensitivity = [80, 100, 120].map(percent => ({ percent, npv: core.npv(flowsFor(selected, percent), settings.discount / 100) }));
  return { alternatives, selected, sensitivity };
}
export function analyseInvestment(record, pricing) {
  const value = record.settings;
  switch (record.type) {
    case 'rollout': {
      const result = metrics({ listPrice: value.listPrice, discount: value.discount / 100, rebate: 0, variableCost: value.variableCost, serviceCost: value.serviceCost });
      return { metrics: result, setup: value.teams * value.setup, training: value.teams * value.training * 120, implementation: value.teams * (value.setup + value.training * 120) };
    }
    case 'commercial': return { metrics: metrics({ openingRevenue: value.openingRevenue, churnRevenue: value.openingRevenue * (1 - value.retained / 100), contraction: 0, expansion: value.expansion, newRevenue: value.newRevenue, reactivationRevenue: value.reactivation, newCustomers: value.newCustomers, acquisitionSpend: value.acquisitionSpend, contributionMargin: value.contributionMargin / 100 }) };
    case 'service': return { metrics: metrics({ eligiblePopulation: value.people, adoption: value.adoption / 100, baselineCost: value.baselineCost, candidateCost: value.candidateCost, capacity: value.capacity }), releasedHours: value.people * value.adoption / 100 * value.minutes * 2 / 60 };
    case 'capital': return capitalComparison(value);
    default: {
      const sessions = pricing.sessions.map(item => ({ ...item, funding: value.funding[item.tape.id] || 'extra' }));
      const visibleSessions = sessions.filter(item => value.domain === 'all' || item.funding === value.domain);
      const reserve = value.budget * value.reserve / 100, opportunity = value.budget * value.opportunity / 100;
      return { sessions, visibleSessions, amount: visibleSessions.reduce((sum, item) => sum + item.cost, 0), reserve, opportunity, remaining: value.budget - pricing.total - reserve - opportunity };
    }
  }
}
