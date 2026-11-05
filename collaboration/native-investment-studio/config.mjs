import { ROLE_FIELDS } from './roles.mjs';
import { createChangeSettings } from './change-models.mjs';
import { createAssuranceSettings } from './assurance-models.mjs';
import { createScoreSettings } from './score-models.mjs';
export { PRACTICES } from './capabilities.mjs';
// Immutable vocabulary shared by independent Studio instances.
export const CONTRACT = Object.freeze({
  kind: 'native-investment-plan', schemaVersion: '0.8.0', modelVersion: '0.1.0',
  currency: 'USD', minutesPerHour: 60,
});

export const PURPOSE_FIELDS = Object.freeze([
  'changedAbility', 'affectedPopulation', 'observationSignal',
  'accountableOwner', 'reviewBoundary', 'openConditions',
]);

// Admission and encoded envelopes share these domain bounds. Structural row
// allowances below remain local to the schema version that introduced them.
const COLLECTION_LIMITS = Object.freeze({
  people: 128, teams: 32, work: 256, practices: 128, contributions: 128,
  connections: 256, arrangements: 32, references: 16384, abilities: 128,
  supportRequirements: 8, prerequisiteEdges: 512, capabilityEvidence: 256,
  recoveryEvents: 32, learningActions: 32, rehearsals: 64,
  availabilityIntervals: 16, scoreOccurrences: 4096, scoreAssignments: 16384,
  scoreDependencies: 512, scoreStages: 32, scoreWaits: 32, scoreGates: 32,
  scoreProposals: 32,
});
const VALUE_LIMITS = Object.freeze({
  purposeText: 600, relationshipText: 600, identifier: 64, label: 120,
  scoreMinute: 100000000, horizonWeeks: 260, fundedMinutes: 10000000,
  minutesPerOccurrence: 1440, occurrences: 10000, rateCentsPerHour: 100000000,
  revision: Number.MAX_SAFE_INTEGER - 1,
});
const JSON_BYTES_PER_UTF16_UNIT = 6;
const LABEL_JSON_BYTES = VALUE_LIMITS.label * JSON_BYTES_PER_UTF16_UNIT;
const RELATIONSHIP_TEXT_JSON_BYTES = VALUE_LIMITS.relationshipText * JSON_BYTES_PER_UTF16_UNIT;
const SCORE_MINUTE_DIGITS = String(VALUE_LIMITS.scoreMinute).length;
// These compatibility allowances belong to the schema versions that introduced
// them. Later reference capacity extends the original relationship envelope.
const BASE_SCHEMA_JSON_BYTES = 524288;
const RELATIONSHIP_REFERENCE_LIMIT = 8192;
// One inserted root member, six empty quoted values, and at most six JSON bytes
// per UTF-16 unit (for example, an escaped control character or lone surrogate).
const PURPOSE_JSON_BYTES = JSON.stringify({ purpose: Object.fromEntries(PURPOSE_FIELDS.map(field => [field, ''])) }).length - 1
  + PURPOSE_FIELDS.length * VALUE_LIMITS.purposeText * JSON_BYTES_PER_UTF16_UNIT;
// The new schema reserves a conservative, finite encoded envelope for every
// new row/field and reference. Six bytes bound one JSON-escaped UTF-16 unit.
const ROLE_JSON_BYTES = JSON.stringify({ role: Object.fromEntries(ROLE_FIELDS.map(field => [field, field === 'change' ? { frameworkId: '', componentId: '' } : ''])), lifecycle: 'retired' }).length - 1
  + (ROLE_FIELDS.length + 1) * VALUE_LIMITS.identifier;
const LIFECYCLE_JSON_BYTES = JSON.stringify({ lifecycle: 'retired' }).length - 1;
const CONTRIBUTION_JSON_BYTES = JSON.stringify({ id: '', categoryId: '', receiverPersonId: '', decisionOwnerPersonId: '', workIds: [], reviewBoundary: '', decisionBoundary: '' }).length
  + 4 * VALUE_LIMITS.identifier + 2 * RELATIONSHIP_TEXT_JSON_BYTES;
const CONNECTION_JSON_BYTES = JSON.stringify({ id: '', senderTeamId: '', receiverTeamId: '', receiverPersonId: '', sharedObject: '', responseExpectation: '', workIds: [], status: 'paused' }).length
  + 4 * VALUE_LIMITS.identifier + 2 * RELATIONSHIP_TEXT_JSON_BYTES;
const RELATIONSHIP_JSON_BYTES = JSON.stringify({ contributions: [], connections: [] }).length - 1
  + COLLECTION_LIMITS.people * ROLE_JSON_BYTES + (COLLECTION_LIMITS.teams + COLLECTION_LIMITS.work) * LIFECYCLE_JSON_BYTES
  + COLLECTION_LIMITS.contributions * (CONTRIBUTION_JSON_BYTES + 1) + COLLECTION_LIMITS.connections * (CONNECTION_JSON_BYTES + 1)
  + RELATIONSHIP_REFERENCE_LIMIT * (VALUE_LIMITS.identifier + 3);
const CAPABILITY_JSON_BYTES = JSON.stringify({ abilities: [], capabilityEvidence: [] }).length - 1
  + (COLLECTION_LIMITS.abilities + COLLECTION_LIMITS.practices) * (512 + 6 * VALUE_LIMITS.identifier + RELATIONSHIP_TEXT_JSON_BYTES + COLLECTION_LIMITS.supportRequirements * (96 + VALUE_LIMITS.identifier))
  + COLLECTION_LIMITS.prerequisiteEdges * 48
  + COLLECTION_LIMITS.capabilityEvidence * (384 + 4 * VALUE_LIMITS.identifier + 3 * RELATIONSHIP_TEXT_JSON_BYTES)
  + (COLLECTION_LIMITS.references - RELATIONSHIP_REFERENCE_LIMIT) * (VALUE_LIMITS.identifier + 3);
// Catalogue identities bound the fixed settings metadata. A typed capability
// reference is the largest added edge; all edges share the existing plan budget.
const CHANGE_JSON_BYTES = JSON.stringify({ changeSettings: createChangeSettings() }).length - 1
  + COLLECTION_LIMITS.references * (JSON.stringify({ kind: 'practice', instanceId: '' }).length + VALUE_LIMITS.identifier + 1);
const ASSURANCE_JSON_BYTES = JSON.stringify({ assuranceSettings: createAssuranceSettings() }).length - 1
  + COLLECTION_LIMITS.recoveryEvents * (512 + LABEL_JSON_BYTES + RELATIONSHIP_TEXT_JSON_BYTES + 2 * VALUE_LIMITS.identifier)
  + COLLECTION_LIMITS.learningActions * (512 + 2 * RELATIONSHIP_TEXT_JSON_BYTES + 3 * VALUE_LIMITS.identifier)
  + COLLECTION_LIMITS.rehearsals * (768 + 4 * RELATIONSHIP_TEXT_JSON_BYTES + 4 * VALUE_LIMITS.identifier)
  + COLLECTION_LIMITS.references * (VALUE_LIMITS.identifier + 3);
// Minute digits follow the admitted maximum. Row envelopes include punctuation;
// labels and text retain their worst-case JSON encoding.
const SCORE_JSON_BYTES = JSON.stringify({ scoreSettings: createScoreSettings() }).length - 1
  + COLLECTION_LIMITS.people * (32 + COLLECTION_LIMITS.availabilityIntervals * (48 + 2 * SCORE_MINUTE_DIGITS))
  + COLLECTION_LIMITS.work * (64 + 2 * SCORE_MINUTE_DIGITS)
  + COLLECTION_LIMITS.scoreDependencies * (128 + 4 * VALUE_LIMITS.identifier + SCORE_MINUTE_DIGITS)
  + COLLECTION_LIMITS.scoreStages * (128 + VALUE_LIMITS.identifier + LABEL_JSON_BYTES)
  + COLLECTION_LIMITS.scoreWaits * (128 + 2 * VALUE_LIMITS.identifier + LABEL_JSON_BYTES + RELATIONSHIP_TEXT_JSON_BYTES + 2 * SCORE_MINUTE_DIGITS)
  + COLLECTION_LIMITS.scoreGates * (192 + 3 * VALUE_LIMITS.identifier + LABEL_JSON_BYTES + 2 * RELATIONSHIP_TEXT_JSON_BYTES)
  + COLLECTION_LIMITS.scoreProposals * (512 + 4 * VALUE_LIMITS.identifier + LABEL_JSON_BYTES + 5 * SCORE_MINUTE_DIGITS)
  + 128 + LABEL_JSON_BYTES + 2 * SCORE_MINUTE_DIGITS + COLLECTION_LIMITS.references * (VALUE_LIMITS.identifier + 3);
// Each arrangement binds at most three authored team slots and three edges.
// Identifiers use ASCII; the catalogue owns bounded template and slot names.
const ARRANGEMENT_JSON_BYTES = JSON.stringify({ arrangements: [] }).length - 1
  + COLLECTION_LIMITS.arrangements * (JSON.stringify({ id: '', templateId: '', templateVersion: '', teamBindings: [], connectionBindings: [] }).length
    + 3 * VALUE_LIMITS.identifier + 1 + 3 * (JSON.stringify({ slotId: '', teamId: '' }).length + 2 * VALUE_LIMITS.identifier + 1)
    + 3 * (JSON.stringify({ slotId: '', connectionId: '' }).length + 2 * VALUE_LIMITS.identifier + 1));
export const SCHEMA_BYTE_LIMITS = Object.freeze({
  '0.1.0': BASE_SCHEMA_JSON_BYTES,
  '0.2.0': BASE_SCHEMA_JSON_BYTES + PURPOSE_JSON_BYTES,
  '0.3.0': BASE_SCHEMA_JSON_BYTES + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES,
  '0.4.0': BASE_SCHEMA_JSON_BYTES + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES + CAPABILITY_JSON_BYTES,
  '0.5.0': BASE_SCHEMA_JSON_BYTES + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES + CAPABILITY_JSON_BYTES + CHANGE_JSON_BYTES,
  '0.6.0': BASE_SCHEMA_JSON_BYTES + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES + CAPABILITY_JSON_BYTES + CHANGE_JSON_BYTES + ASSURANCE_JSON_BYTES,
  '0.7.0': BASE_SCHEMA_JSON_BYTES + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES + CAPABILITY_JSON_BYTES + CHANGE_JSON_BYTES + ASSURANCE_JSON_BYTES + SCORE_JSON_BYTES,
  '0.8.0': BASE_SCHEMA_JSON_BYTES + PURPOSE_JSON_BYTES + RELATIONSHIP_JSON_BYTES + CAPABILITY_JSON_BYTES + CHANGE_JSON_BYTES + ASSURANCE_JSON_BYTES + SCORE_JSON_BYTES + ARRANGEMENT_JSON_BYTES,
});

export const LIMITS = Object.freeze({
  bytes: SCHEMA_BYTE_LIMITS[CONTRACT.schemaVersion], ...COLLECTION_LIMITS, ...VALUE_LIMITS,
});

export const HISTORY = Object.freeze({ defaultEntries: 20, maxEntries: 100 });
