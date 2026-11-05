// Native illustration adapter; core.js retains the staffing formula authority.
import * as importedCore from './core.js';

const core = importedCore.default ?? globalThis.InvestmentCore;
if (typeof core?.staffing !== 'function') throw new Error('The staffing calculation owner is unavailable.');
export const STAFFING_REFERENCE = Object.freeze({
  coreVersion: core.VERSION, formulaVersion: core.FORMULA_VERSION, currency: 'USD',
  source: 'collaboration/investment-analysis/core.js',
});

const emptySnapshot = () => ({ horizon: 0, unit: 'hours', roles: [], activities: [], disruptions: [],
  qualityEnabled: false, qualityAllocation: 0, qualityRate: 0, sigma: 3, unknowns: 0,
  complexity: 'bounded', overlap: { activities: 0, recovery: 0, quality: 0 } });
export function calculateStaffingReference(snapshot) { return core.staffing(snapshot); }

export function estimateQualityReference(settings, referenceHorizon) {
  const snapshot = emptySnapshot();
  snapshot.sigma = settings.sigmaHalfSteps / 2;
  snapshot.qualityEnabled = settings.included;
  snapshot.qualityAllocation = settings.allocationPercent;
  snapshot.qualityRate = (settings.independentRateCentsPerHour ?? 0) / 100;
  snapshot.overlap.quality = settings.additionalShareBasisPoints / 10000;
  if (referenceHorizon) { snapshot.horizon = referenceHorizon.quantity; snapshot.unit = referenceHorizon.unit; }
  const calculated = core.staffing(snapshot);
  const problems = [];
  if (settings.included && !referenceHorizon) problems.push('Choose a reference horizon to estimate quality time.');
  if (settings.included && settings.independentRateCentsPerHour === null) problems.push('Add the independent review rate to price quality time.');
  if (calculated.status !== 'known') problems.push(...calculated.problems);
  return {
    ...STAFFING_REFERENCE, status: problems.length ? 'unavailable' : 'known', problems,
    hours: !settings.included ? 0 : referenceHorizon ? calculated.qualityHours ?? null : null,
    amountCents: problems.length ? null : Math.round(calculated.qualityCost * 100),
    multiplier: calculated.qualityMultiplier ?? null,
    additionalShareBasisPoints: settings.additionalShareBasisPoints,
    basis: 'Illustrative quality time from the reference horizon and sigma attention setting.',
  };
}

export function estimateRecoveryReference(events, people, ratePersonIds, additionalShareBasisPoints) {
  const snapshot = emptySnapshot();
  snapshot.overlap.recovery = additionalShareBasisPoints / 10000;
  snapshot.disruptions = events.filter(row => row.included && row.lifecycle === 'active')
    .map(row => ({ enabled: true, a: row.eventCount, b: row.aggregateMinutesPerEvent / 60 }));
  const hasEffort = snapshot.disruptions.some(row => row.a > 0 && row.b > 0);
  const byId = new Map(people.map(row => [row.id, row]));
  const selected = ratePersonIds.map(id => byId.get(id));
  const problems = [];
  if (hasEffort && !selected.length) problems.push('Choose the people whose rates supply the recovery estimate.');
  if (hasEffort && selected.some(row => !row || row.rateCentsPerHour === null)) problems.push('Add every selected person’s hourly rate to price recovery time.');
  // The zero-rate calculation preserves known effort while an input remains open.
  snapshot.roles = hasEffort ? selected.map(row => ({ enabled: true, a: 1, b: (row?.rateCentsPerHour ?? 0) / 100, c: 0 })) : [];
  if (hasEffort && !selected.length) snapshot.roles = [{ enabled: true, a: 1, b: 0, c: 0 }];
  const calculated = core.staffing(snapshot);
  if (calculated.status !== 'known') problems.push(...calculated.problems);
  return {
    ...STAFFING_REFERENCE, status: problems.length ? 'unavailable' : 'known', problems,
    hours: calculated.disruptionHours ?? null,
    amountCents: problems.length ? null : Math.round(calculated.disruptionCost * 100),
    ratePersonIds: [...ratePersonIds], additionalShareBasisPoints,
    basis: 'Aggregate recovery effort priced at the equally weighted rates of the selected people.',
  };
}
