// Immutable vocabulary shared by independent Studio instances.
export const CONTRACT = Object.freeze({
  kind: 'native-investment-plan', schemaVersion: '0.2.0', modelVersion: '0.1.0',
  currency: 'USD', minutesPerHour: 60,
});

export const PURPOSE_FIELDS = Object.freeze([
  'changedAbility', 'affectedPopulation', 'observationSignal',
  'accountableOwner', 'reviewBoundary', 'openConditions',
]);

const PURPOSE_TEXT_LIMIT = 600;
// One inserted root member, six empty quoted values, and at most six JSON bytes
// per UTF-16 unit (for example, an escaped control character or lone surrogate).
const PURPOSE_JSON_BYTES = JSON.stringify({ purpose: Object.fromEntries(PURPOSE_FIELDS.map(field => [field, ''])) }).length - 1
  + PURPOSE_FIELDS.length * PURPOSE_TEXT_LIMIT * 6;
export const SCHEMA_BYTE_LIMITS = Object.freeze({
  '0.1.0': 524288,
  '0.2.0': 524288 + PURPOSE_JSON_BYTES,
});

export const LIMITS = Object.freeze({
  bytes: SCHEMA_BYTE_LIMITS[CONTRACT.schemaVersion], people: 128, teams: 32, work: 256, practices: 128,
  references: 4096, identifier: 64, label: 120, horizonWeeks: 260,
  fundedMinutes: 10000000, minutesPerOccurrence: 1440, occurrences: 10000,
  rateCentsPerHour: 100000000, revision: Number.MAX_SAFE_INTEGER - 1, purposeText: PURPOSE_TEXT_LIMIT,
});

export const HISTORY = Object.freeze({ defaultEntries: 20, maxEntries: 100 });

export const PRACTICES = Object.freeze([
  ['expectation', 'Actively negotiate expectations'],
  ['focalization', 'Bring the decision into focus'],
  ['experimentation', 'Reduce the cost of experimentation'],
  ['opportunity', 'Price opportunity and speculation'],
  ['continuity', 'Carry work through a handoff'],
  ['assurance', 'Establish a fitting acceptance observation'],
].map(([id, action]) => Object.freeze({ id, action, standing: 'proposed-support' })));
