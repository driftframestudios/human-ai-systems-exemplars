// Immutable vocabulary shared by independent Studio instances.
export const CONTRACT = Object.freeze({
  kind: 'native-investment-plan', schemaVersion: '0.1.0', modelVersion: '0.1.0',
  currency: 'USD', minutesPerHour: 60,
});

export const LIMITS = Object.freeze({
  bytes: 524288, people: 128, teams: 32, work: 256, practices: 128,
  references: 4096, identifier: 64, label: 120, horizonWeeks: 260,
  fundedMinutes: 10000000, minutesPerOccurrence: 1440, occurrences: 10000,
  rateCentsPerHour: 100000000, revision: Number.MAX_SAFE_INTEGER - 1,
});

export const PRACTICES = Object.freeze([
  ['expectation', 'Actively negotiate expectations'],
  ['focalization', 'Bring the decision into focus'],
  ['experimentation', 'Reduce the cost of experimentation'],
  ['opportunity', 'Price opportunity and speculation'],
  ['continuity', 'Carry work through a handoff'],
  ['assurance', 'Establish a fitting acceptance observation'],
].map(([id, action]) => Object.freeze({ id, action, standing: 'proposed-support' })));
