// Financial deck vocabulary and fresh assumption records.
export function freezeInvestmentDefinition(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeInvestmentDefinition);
    Object.freeze(value);
  }
  return value;
}

export const INVESTMENT_TYPES = freezeInvestmentDefinition([
  { id: 'plan', title: 'Plan investment', strip: 'Internal effort', detail: 'People, sessions & funding' },
  { id: 'rollout', title: 'Customer rollout', strip: 'Implementation', detail: 'Price, contribution & rollout' },
  { id: 'commercial', title: 'Commercial cohort', strip: 'Recurring revenue', detail: 'Retention, acquisition & growth' },
  { id: 'service', title: 'Service operations', strip: 'Working experience', detail: 'Time, budget & capacity' },
  { id: 'capital', title: 'Capital choices', strip: 'Investment decision', detail: 'Cash flow, return & sensitivity' },
]);
export const PLAN_APPROACHES = freezeInvestmentDefinition([
  { id: 'deliver', label: 'Deliver now', reserve: 10, opportunity: 5 },
  { id: 'protect', label: 'Protect delivery', reserve: 30, opportunity: 5 },
  { id: 'explore', label: 'Explore options', reserve: 10, opportunity: 30 },
]);
export const FINANCIAL_PRESETS = freezeInvestmentDefinition({
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
});
export function financialSettings(type) {
  switch (type) {
    case 'plan': return { baseline: null, domain: 'all', budget: 10000, approach: 'deliver', reserve: 10, opportunity: 5 };
    case 'rollout': return { lifecycle: 'pilot', domain: 'pricing', ...FINANCIAL_PRESETS.rollout[0].values };
    case 'commercial': return { lifecycle: 'deepen', domain: 'retention', metric: 'nrr', openingRevenue: 100000, contributionMargin: 70, ...FINANCIAL_PRESETS.commercial[1].values };
    case 'service': return { lifecycle: 'pilot', domain: 'time', baselineCost: 500, ...FINANCIAL_PRESETS.service[1].values };
    case 'capital': return { alternative: 'pilot', lifecycle: 'ramp', metric: 'npv', quarters: 4, upfront: 20000, benefit: 8000, discount: 2, sensitivity: 100 };
    default: throw new Error('Choose a supported investment deck.');
  }
}
