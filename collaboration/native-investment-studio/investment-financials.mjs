import * as coreModule from '../investment-analysis/core.js';
const core = coreModule.default || globalThis.InvestmentCore;
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
      const sessions = pricing.sessions;
      const visibleSessions = sessions.filter(item => value.domain === 'all' || item.funding === value.domain);
      const reserve = value.budget * value.reserve / 100, opportunity = value.budget * value.opportunity / 100;
      return { sessions, visibleSessions, amount: value.domain === 'all' ? pricing.total : value.domain === 'funded' ? pricing.funded : pricing.additional, reserve, opportunity, remaining: value.budget - pricing.total - reserve - opportunity };
    }
  }
}
