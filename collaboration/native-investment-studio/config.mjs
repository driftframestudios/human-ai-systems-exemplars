import { ROLE_FIELDS } from './roles.mjs';
import { createChangeSettings } from './change-models.mjs';
import { createAssuranceSettings } from './assurance-models.mjs';
import { createScoreSettings } from './score-models.mjs';
export { PRACTICES } from './capabilities.mjs';
// Immutable vocabulary shared by independent Studio instances.
export const CONTRACT = Object.freeze({
  kind: 'native-investment-plan', schemaVersion: '0.7.0', modelVersion: '0.1.0',
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
// The new schema reserves a conservative, finite encoded envelope for every
// new row/field and reference. Six bytes bound one JSON-escaped UTF-16 unit.
const RELATIONSHIP_TEXT_LIMIT = 600;
const RELATIONSHIP_REFERENCE_LIMIT = 8192;
const ROLE_JSON_BYTES = JSON.stringify({ role: Object.fromEntries(ROLE_FIELDS.map(field => [field, field === 'change' ? { frameworkId: '', componentId: '' } : ''])), lifecycle: 'retired' }).length - 1
  + (ROLE_FIELDS.length + 1) * 64;
const LIFECYCLE_JSON_BYTES = JSON.stringify({ lifecycle: 'retired' }).length - 1;
const CONTRIBUTION_JSON_BYTES = JSON.stringify({ id: '', categoryId: '', receiverPersonId: '', decisionOwnerPersonId: '', workIds: [], reviewBoundary: '', decisionBoundary: '' }).length
  + 4 * 64 + 2 * RELATIONSHIP_TEXT_LIMIT * 6;
const CONNECTION_JSON_BYTES = JSON.stringify({ id: '', senderTeamId: '', receiverTeamId: '', receiverPersonId: '', sharedObject: '', responseExpectation: '', workIds: [], status: 'paused' }).length
  + 4 * 64 + 2 * RELATIONSHIP_TEXT_LIMIT * 6;
const RELATIONSHIP_JSON_BYTES = JSON.stringify({ contributions: [], connections: [] }).length - 1
  + 128 * ROLE_JSON_BYTES + (32 + 256) * LIFECYCLE_JSON_BYTES
  + 128 * (CONTRIBUTION_JSON_BYTES + 1) + 256 * (CONNECTION_JSON_BYTES + 1)
  + RELATIONSHIP_REFERENCE_LIMIT * (64 + 3);
const CAPABILITY_REFERENCE_LIMIT = 16384;
const CAPABILITY_JSON_BYTES = JSON.stringify({ abilities: [], capabilityEvidence: [] }).length - 1
  + 256 * (512 + 6 * 64 + RELATIONSHIP_TEXT_LIMIT * 6 + 8 * (96 + 64))
  + 512 * 48
  + 256 * (384 + 4 * 64 + 3 * RELATIONSHIP_TEXT_LIMIT * 6)
  + (CAPABILITY_REFERENCE_LIMIT - RELATIONSHIP_REFERENCE_LIMIT) * (64 + 3);
// Catalogue identities bound the fixed settings metadata. A typed capability
// reference is the largest added edge; all edges share the existing plan budget.
const CHANGE_JSON_BYTES = JSON.stringify({ changeSettings: createChangeSettings() }).length - 1
  + CAPABILITY_REFERENCE_LIMIT * (JSON.stringify({ kind: 'practice', instanceId: '' }).length + 64 + 1);
const ASSURANCE_JSON_BYTES = JSON.stringify({ assuranceSettings: createAssuranceSettings() }).length - 1
  + 32 * (512 + 120 * 6 + RELATIONSHIP_TEXT_LIMIT * 6 + 2 * 64)
  + 32 * (512 + 2 * RELATIONSHIP_TEXT_LIMIT * 6 + 3 * 64)
  + 64 * (768 + 4 * RELATIONSHIP_TEXT_LIMIT * 6 + 4 * 64)
  + CAPABILITY_REFERENCE_LIMIT * (64 + 3);
// Relative minutes need at most nine decimal digits. Row envelopes include
// punctuation; labels/text retain their worst-case six-byte JSON encoding.
const SCORE_JSON_BYTES = JSON.stringify({ scoreSettings: createScoreSettings() }).length - 1
  + 128 * (32 + 16 * (48 + 2 * 9)) + 256 * (64 + 2 * 9)
  + 512 * (128 + 4 * 64 + 9)
  + 32 * (128 + 64 + 120 * 6)
  + 32 * (128 + 2 * 64 + 120 * 6 + RELATIONSHIP_TEXT_LIMIT * 6 + 2 * 9)
  + 32 * (192 + 3 * 64 + 120 * 6 + 2 * RELATIONSHIP_TEXT_LIMIT * 6)
  + 32 * (512 + 4 * 64 + 120 * 6 + 5 * 9)
  + 128 + 120 * 6 + 2 * 9 + CAPABILITY_REFERENCE_LIMIT * (64 + 3);
export const SCHEMA_BYTE_LIMITS = Object.freeze({
  '0.1.0': 524288,
  '0.2.0': 524288 + PURPOSE_JSON_BYTES,
  '0.3.0': 524288 + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES,
  '0.4.0': 524288 + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES + CAPABILITY_JSON_BYTES,
  '0.5.0': 524288 + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES + CAPABILITY_JSON_BYTES + CHANGE_JSON_BYTES,
  '0.6.0': 524288 + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES + CAPABILITY_JSON_BYTES + CHANGE_JSON_BYTES + ASSURANCE_JSON_BYTES,
  '0.7.0': 524288 + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES + CAPABILITY_JSON_BYTES + CHANGE_JSON_BYTES + ASSURANCE_JSON_BYTES + SCORE_JSON_BYTES,
});

export const LIMITS = Object.freeze({
  bytes: SCHEMA_BYTE_LIMITS[CONTRACT.schemaVersion], people: 128, teams: 32, work: 256, practices: 128,
  references: CAPABILITY_REFERENCE_LIMIT, abilities: 128, supportRequirements: 8, prerequisiteEdges: 512, capabilityEvidence: 256,
  recoveryEvents: 32, learningActions: 32, rehearsals: 64,
  availabilityIntervals: 16, scoreOccurrences: 4096, scoreAssignments: 16384, scoreDependencies: 512,
  scoreStages: 32, scoreWaits: 32, scoreGates: 32, scoreProposals: 32, scoreMinute: 100000000,
  contributions: 128, connections: 256, relationshipText: RELATIONSHIP_TEXT_LIMIT, identifier: 64, label: 120, horizonWeeks: 260,
  fundedMinutes: 10000000, minutesPerOccurrence: 1440, occurrences: 10000,
  rateCentsPerHour: 100000000, revision: Number.MAX_SAFE_INTEGER - 1, purposeText: PURPOSE_TEXT_LIMIT,
});

export const HISTORY = Object.freeze({ defaultEntries: 20, maxEntries: 100 });
