// Source-derived quality and learning readings; accepted work retains its native accounting owner.
import { estimateQualityReference, estimateRecoveryReference, calculateStaffingReference } from '../investment-analysis/staffing-adapter.mjs';
import { listAttentionChannels } from './change-models.mjs';

export const ASSURANCE_VERSION = '1.0.0';
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const ASSURANCE_SOURCE = freeze({ path: 'collaboration/initiative-costing-calculator/index.html',
  relation: 'Authored quality concepts, reference scenarios and learning questions adapted into the native Studio' });

const concepts = freeze([
  {
    "id": "acceptance-criteria",
    "label": "Acceptance criteria / specification by example"
  },
  {
    "id": "risk-based-testing",
    "label": "Risk-based test design"
  },
  {
    "id": "independent-review",
    "label": "Independent review"
  },
  {
    "id": "data-model-quality",
    "label": "Data and model quality"
  },
  {
    "id": "accessibility",
    "label": "Accessibility"
  },
  {
    "id": "security-privacy",
    "label": "Security and privacy"
  },
  {
    "id": "observability",
    "label": "Observability"
  },
  {
    "id": "reconciliation-replay",
    "label": "Reconciliation and replay"
  },
  {
    "id": "release-readiness",
    "label": "Release readiness"
  },
  {
    "id": "post-release-learning",
    "label": "Post-release learning"
  }
]);

const attentionAreas = freeze([
  {
    "id": "test-design",
    "label": "Test design",
    "description": "Turn risks and acceptance criteria into executable examples.",
    "baseWeight": 18,
    "sigmaWeight": 1
  },
  {
    "id": "sample-data-volume",
    "label": "Sample / data volume",
    "description": "Gather enough representative material for the stated decision.",
    "baseWeight": 10,
    "sigmaWeight": 2
  },
  {
    "id": "independent-qa",
    "label": "Independent QA",
    "description": "Create a review path outside the producing role.",
    "baseWeight": 14,
    "sigmaWeight": 1
  },
  {
    "id": "observability",
    "label": "Observability",
    "description": "Preserve signals that make abnormal states inspectable.",
    "baseWeight": 12,
    "sigmaWeight": 0
  },
  {
    "id": "validation",
    "label": "Validation",
    "description": "Connect evidence to the intended use and release boundary.",
    "baseWeight": 14,
    "sigmaWeight": 2
  },
  {
    "id": "recovery",
    "label": "Recovery",
    "description": "Exercise reconciliation, replay, rollback, and learning routes.",
    "baseWeight": 12,
    "sigmaWeight": 0
  },
  {
    "id": "specialist-review",
    "label": "Specialist review",
    "description": "Bring domain, accessibility, safety, privacy, or security expertise to the decision.",
    "baseWeight": 15,
    "sigmaWeight": 1
  }
]);

const presets = freeze([
  { id: "discovery-alignment", version: ASSURANCE_VERSION, name: "Discovery & alignment",
    horizon: {"quantity":3,"unit":"quarters"}, complexity: "connected", namedUnknowns: 3,
    roles: [
      {"label":"Product lead","people":1,"rateCentsPerHour":17500,"allocationPercent":55},
      {"label":"Research lead","people":1,"rateCentsPerHour":16500,"allocationPercent":60},
      {"label":"Domain specialist","people":2,"rateCentsPerHour":19000,"allocationPercent":25},
    ],
    activities: [
      {"label":"Stakeholder inquiry","count":14,"aggregateMinutesPerItem":600},
      {"label":"Opportunity framing","count":10,"aggregateMinutesPerItem":480},
      {"label":"Decision brief","count":6,"aggregateMinutesPerItem":420},
    ],
    disruptions: [
      {"label":"Scheduling and access","eventCount":3,"aggregateMinutesPerEvent":480},
    ],
  },
  { id: "data-platform-migration", version: ASSURANCE_VERSION, name: "Data / platform migration",
    horizon: {"quantity":2,"unit":"quarters"}, complexity: "frontier", namedUnknowns: 7,
    roles: [
      {"label":"Technical lead","people":1,"rateCentsPerHour":21000,"allocationPercent":80},
      {"label":"Data engineer","people":3,"rateCentsPerHour":18500,"allocationPercent":85},
      {"label":"Platform engineer","people":2,"rateCentsPerHour":19500,"allocationPercent":70},
      {"label":"Product lead","people":1,"rateCentsPerHour":17500,"allocationPercent":35},
    ],
    activities: [
      {"label":"Inventory and lineage","count":28,"aggregateMinutesPerItem":720},
      {"label":"Migration waves","count":46,"aggregateMinutesPerItem":1080},
      {"label":"Reconciliation","count":30,"aggregateMinutesPerItem":900},
    ],
    disruptions: [
      {"label":"Legacy incident","eventCount":5,"aggregateMinutesPerEvent":840},
      {"label":"Cutover recovery","eventCount":2,"aggregateMinutesPerEvent":1680},
    ],
  },
  { id: "regulated-workflow", version: ASSURANCE_VERSION, name: "Regulated workflow",
    horizon: {"quantity":3,"unit":"quarters"}, complexity: "frontier", namedUnknowns: 6,
    roles: [
      {"label":"Product lead","people":1,"rateCentsPerHour":18000,"allocationPercent":55},
      {"label":"Quality lead","people":1,"rateCentsPerHour":19500,"allocationPercent":70},
      {"label":"Software engineer","people":3,"rateCentsPerHour":18500,"allocationPercent":75},
      {"label":"Domain scientist","people":2,"rateCentsPerHour":20000,"allocationPercent":35},
    ],
    activities: [
      {"label":"Requirements and risk","count":32,"aggregateMinutesPerItem":840},
      {"label":"Verification evidence","count":40,"aggregateMinutesPerItem":960},
      {"label":"Training and release","count":24,"aggregateMinutesPerItem":600},
    ],
    disruptions: [
      {"label":"Audit response","eventCount":3,"aggregateMinutesPerEvent":1080},
      {"label":"Validation rework","eventCount":4,"aggregateMinutesPerEvent":960},
    ],
  },
  { id: "ai-assisted-product", version: ASSURANCE_VERSION, name: "AI-assisted product",
    horizon: {"quantity":8,"unit":"sprints"}, complexity: "frontier", namedUnknowns: 8,
    roles: [
      {"label":"Product lead","people":1,"rateCentsPerHour":18000,"allocationPercent":60},
      {"label":"ML engineer","people":2,"rateCentsPerHour":21000,"allocationPercent":80},
      {"label":"Research lead","people":1,"rateCentsPerHour":17000,"allocationPercent":45},
      {"label":"Domain reviewer","people":2,"rateCentsPerHour":19500,"allocationPercent":30},
    ],
    activities: [
      {"label":"Evaluation set","count":24,"aggregateMinutesPerItem":720},
      {"label":"Model and product loop","count":38,"aggregateMinutesPerItem":1080},
      {"label":"Human review design","count":18,"aggregateMinutesPerItem":720},
    ],
    disruptions: [
      {"label":"Model regression","eventCount":4,"aggregateMinutesPerEvent":960},
      {"label":"Data access delay","eventCount":3,"aggregateMinutesPerEvent":1200},
    ],
  },
  { id: "enterprise-integration", version: ASSURANCE_VERSION, name: "Enterprise integration",
    horizon: {"quantity":4,"unit":"quarters"}, complexity: "frontier", namedUnknowns: 9,
    roles: [
      {"label":"Program lead","people":1,"rateCentsPerHour":19500,"allocationPercent":70},
      {"label":"Integration engineer","people":4,"rateCentsPerHour":19000,"allocationPercent":80},
      {"label":"Security lead","people":1,"rateCentsPerHour":21000,"allocationPercent":30},
      {"label":"Operations lead","people":2,"rateCentsPerHour":17000,"allocationPercent":35},
    ],
    activities: [
      {"label":"Interface contracts","count":42,"aggregateMinutesPerItem":720},
      {"label":"Partner validation","count":36,"aggregateMinutesPerItem":840},
      {"label":"Operational transition","count":30,"aggregateMinutesPerItem":720},
    ],
    disruptions: [
      {"label":"Dependency change","eventCount":6,"aggregateMinutesPerEvent":1080},
      {"label":"Environment drift","eventCount":4,"aggregateMinutesPerEvent":840},
    ],
  },
  { id: "operational-modernization", version: ASSURANCE_VERSION, name: "Operational modernization / recovery",
    horizon: {"quantity":3,"unit":"quarters"}, complexity: "connected", namedUnknowns: 5,
    roles: [
      {"label":"Operations lead","people":1,"rateCentsPerHour":17500,"allocationPercent":70},
      {"label":"Software engineer","people":3,"rateCentsPerHour":18500,"allocationPercent":75},
      {"label":"Service designer","people":1,"rateCentsPerHour":16000,"allocationPercent":40},
      {"label":"Quality partner","people":1,"rateCentsPerHour":19000,"allocationPercent":25},
    ],
    activities: [
      {"label":"Work recovery mapping","count":22,"aggregateMinutesPerItem":600},
      {"label":"Incremental replacement","count":38,"aggregateMinutesPerItem":840},
      {"label":"Runbook and handoff","count":20,"aggregateMinutesPerItem":540},
    ],
    disruptions: [
      {"label":"Production interruption","eventCount":6,"aggregateMinutesPerEvent":960},
      {"label":"Parallel-system load","eventCount":5,"aggregateMinutesPerEvent":720},
    ],
  },
]);

const learningFamilies = freeze([
  { presetIds: ['discovery-alignment'], prompts: [
    ['source-framing', 'Source framing and facilitation'], ['evaluation-design', 'Evaluation design and decision criteria']] },
  { presetIds: ['data-platform-migration', 'enterprise-integration'], prompts: [
    ['workflow-contracts', 'Workflow mapping and data contracts'], ['recovery-replay', 'Recovery, reconciliation, and replay']] },
  { presetIds: ['regulated-workflow'], prompts: [
    ['validation-change-control', 'Validation evidence and change control'], ['traceable-exceptions', 'Traceable requirements and exception handling']] },
  { presetIds: ['ai-assisted-product'], prompts: [
    ['evaluation-model-boundaries', 'Evaluation-set design and model boundaries'], ['human-review-escalation', 'Human review, accessibility, and escalation']] },
  { presetIds: ['operational-modernization'], prompts: [
    ['service-recovery', 'Service recovery and incremental replacement'], ['runbook-handoff', 'Runbook stewardship and handoff design']] },
]);
const learningDefinitions = freeze([
  ...learningFamilies.flatMap(family => family.prompts.map(([id, label]) => ({ id, label }))),
  ...listAttentionChannels().map(row => ({ id: `attention-${row.id}`, label: `Explore ${row.label.toLowerCase()} before commitments harden` })),
  { id: 'uncertainty-owners', label: 'Name uncertainty owners and learning checkpoints' },
  { id: 'deferred-quality', label: 'Decide who receives the deferred quality work' },
  { id: 'quality-followthrough', label: 'Connect quality evidence to release and post-release learning' },
]);
const rehearsals = freeze([
  { id: 'review-change', version: ASSURANCE_VERSION, name: 'A reviewer changes the acceptance conditions',
    setup: 'A reviewer asks for clearer recovery instructions before the pilot can proceed.',
    prompt: 'Which acceptance condition changed, who should respond, and what work or review will make the next decision possible?',
    assumptions: ['The pilot still has a named decision owner.', 'Existing planned work remains available for explicit revision.'] },
  { id: 'recovery-failure', version: ASSURANCE_VERSION, name: 'A recovery rehearsal reveals a gap',
    setup: 'A deliberately interrupted task cannot resume from its saved state using the current instructions.',
    prompt: 'What did the rehearsal establish, who receives the finding, and which repair and repeat observation should enter the plan?',
    assumptions: ['This is an authored scenario for discussion.', 'The response names the observed boundary before a readiness decision.'] },
  { id: 'specialist-unavailable', version: ASSURANCE_VERSION, name: 'A specialist is unavailable for the planned review',
    setup: 'The specialist assigned to an upcoming review becomes unavailable during its planned window.',
    prompt: 'Who can authorize a revised review route, what work needs to wait or change, and what assumptions should remain visible?',
    assumptions: ['Specialist availability is a scenario condition.', 'A named person retains authority for scope and acceptance.'] },
]);
const byConcept = new Map(concepts.map(row => [row.id, row]));
const byPreset = new Map(presets.map(row => [`${row.id}:${row.version}`, row]));
const byLearning = new Map(learningDefinitions.map(row => [row.id, row]));
const byRehearsal = new Map(rehearsals.map(row => [`${row.id}:${row.version}`, row]));
export function listQualityConcepts() { return concepts; }
export function getQualityConcept(id) { return byConcept.get(id) ?? null; }
export function listQualityAttentionAreas() { return attentionAreas; }
export function listSourcePresets() { return presets; }
export function getSourcePreset(id, version = ASSURANCE_VERSION) {
  return typeof id === 'string' && typeof version === 'string' ? byPreset.get(`${id}:${version}`) ?? null : null;
}
export function listLearningPromptDefinitions() { return learningDefinitions; }
export function getLearningPromptDefinition(id) { return byLearning.get(id) ?? null; }
export function listRehearsalDefinitions() { return rehearsals; }
export function getRehearsalDefinition(id, version) {
  return typeof id === 'string' && typeof version === 'string' ? byRehearsal.get(`${id}:${version}`) ?? null : null;
}

export function createAssuranceSettings() {
  return { version: ASSURANCE_VERSION,
    context: { sourcePresetId: null, referenceHorizon: null, namedUnknowns: 0, recoveryRatePersonIds: [] },
    quality: { included: true, allocationPercent: 18, independentRateCentsPerHour: 19500, sigmaHalfSteps: 6,
      additionalShareBasisPoints: 10000, concepts: concepts.map(row => ({ conceptId: row.id, included: true, workIds: [] })) },
    recoveryAdditionalShareBasisPoints: 10000, recoveryEvents: [], learningActions: [], rehearsals: [] };
}

export function sourcePresetSnapshot(id, version = ASSURANCE_VERSION) {
  const preset = getSourcePreset(id, version);
  if (!preset) return null;
  return { horizon: preset.horizon.quantity, unit: preset.horizon.unit,
    roles: preset.roles.map(row => ({ enabled: true, name: row.label, a: row.people, b: row.rateCentsPerHour / 100, c: row.allocationPercent })),
    activities: preset.activities.map(row => ({ enabled: true, name: row.label, a: row.count, b: row.aggregateMinutesPerItem / 60 })),
    disruptions: preset.disruptions.map(row => ({ enabled: true, name: row.label, a: row.eventCount, b: row.aggregateMinutesPerEvent / 60 })),
    qualityEnabled: true, qualityAllocation: 18, qualityRate: 195, sigma: 3,
    unknowns: preset.namedUnknowns, complexity: preset.complexity, overlap: { activities: 1, recovery: 1, quality: 1 } };
}
export function sourcePresetEstimate(id, version = ASSURANCE_VERSION) {
  const snapshot = sourcePresetSnapshot(id, version);
  return snapshot ? freeze(calculateStaffingReference(snapshot)) : null;
}

function erf(value) {
  const sign = value < 0 ? -1 : 1, x = Math.abs(value), t = 1 / (1 + .3275911 * x);
  return sign * (1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - .284496736) * t + .254829592) * t) * Math.exp(-x * x));
}
const curvePoint = z => ({ z, x: 350 + z * (305 / 6), y: 275 - 245 * Math.exp(-.5 * z * z) });
const curve = freeze(Array.from({ length: 151 }, (_, index) => curvePoint(-6 + index * .08)));
const curvePath = curve.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
const regions = freeze(Array.from({ length: 12 }, (_, index) => ({ from: index - 6, to: index - 5,
  x: curvePoint(index - 6).x, width: 305 / 6 })));
export function projectSigmaReference(sigmaHalfSteps, qualityHours, multiplier) {
  const sigma = sigmaHalfSteps / 2, left = curvePoint(-sigma), right = curvePoint(sigma);
  const leftPath = [`M 45 275`, `L ${left.x} 275`], rightPath = [`M ${right.x} 275`];
  for (let value = -sigma; value >= -6; value -= .08) { const point = curvePoint(value); leftPath.push(`L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`); }
  for (let value = sigma; value <= 6; value += .08) { const point = curvePoint(value); rightPath.push(`L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`); }
  leftPath.push('L 45 275 Z'); rightPath.push('L 655 275 Z');
  const totalWeight = attentionAreas.reduce((sum, row) => sum + row.baseWeight + row.sigmaWeight * sigma, 0);
  const tailProbability = 2 * (1 - (.5 * (1 + erf(sigma / Math.sqrt(2)))));
  return freeze({ sigma, multiplier, processShift: 0, tailProbability, tailPerMillion: tailProbability * 1000000,
    curve, curvePath, regions, thresholds: { left, right }, leftTailPath: leftPath.join(' '), rightTailPath: rightPath.join(' '),
    attention: attentionAreas.map(row => { const weight = row.baseWeight + row.sigmaWeight * sigma;
      return { id: row.id, label: row.label, description: row.description, weight,
        hours: qualityHours === null ? null : qualityHours * weight / totalWeight }; }),
    basis: 'Centered normal approximation with two-sided tails and a 0σ process shift. Observed capability and effects on people require their own evidence and review.' });
}

export function projectLearning(settings, changeSettings) {
  const preset = getSourcePreset(settings.context.sourcePresetId), family = learningFamilies.find(row => row.presetIds.includes(preset?.id));
  const needs = family ? family.prompts.map(([promptId, label]) => ({ promptId, label })) : [];
  const parts = new Map((changeSettings?.attention.channels ?? []).map(row => [row.channelId, row.parts]));
  const lowest = listAttentionChannels().map(row => ({ ...row, parts: parts.get(row.id) ?? row.defaultParts }))
    .sort((a, b) => a.parts - b.parts).slice(0, 2);
  lowest.forEach(row => needs.push({ promptId: `attention-${row.id}`, label: getLearningPromptDefinition(`attention-${row.id}`).label }));
  if (settings.context.namedUnknowns > 5) needs.push({ promptId: 'uncertainty-owners', label: getLearningPromptDefinition('uncertainty-owners').label });
  if (settings.quality.included) {
    const included = new Map(settings.quality.concepts.map(row => [row.conceptId, row.included]));
    const absent = concepts.filter(row => !included.get(row.id));
    needs.push(absent.length ? { promptId: 'deferred-quality', label: `Decide who receives the deferred quality work: ${absent.slice(0, 2).map(row => row.label).join(' and ')}` }
      : { promptId: 'quality-followthrough', label: getLearningPromptDefinition('quality-followthrough').label });
  }
  const used = new Set();
  return freeze(needs.filter(row => { if (used.has(row.label)) return false; used.add(row.label); return true; }).slice(0, 7)
    .map(row => ({ ...row, prompt: `Help the cross-functional team explore “${row.label}” for a ${preset?.name ?? 'current'} initiative. Start by naming the decision this learning should inform, the affected population, the available evidence, the missing or contradictory signals, and three bounded routes to sample next. Separate sourced facts, working inferences, and open questions. Use this prompt to develop learning questions and route approval to the named decision owners.` })));
}

export function projectAssurance(settings, plan) {
  const qualityEstimate = estimateQualityReference(settings.quality, settings.context.referenceHorizon);
  const recoveryEstimate = estimateRecoveryReference(settings.recoveryEvents, plan.people, settings.context.recoveryRatePersonIds, settings.recoveryAdditionalShareBasisPoints);
  return freeze({
    sourcePreset: getSourcePreset(settings.context.sourcePresetId),
    quality: { included: settings.quality.included, concepts: settings.quality.concepts.map(row => ({ ...row, label: getQualityConcept(row.conceptId).label, workIds: [...row.workIds] })), estimate: qualityEstimate },
    recovery: { events: settings.recoveryEvents.map(row => ({ ...row, workIds: [...row.workIds] })), estimate: recoveryEstimate },
    sigma: projectSigmaReference(settings.quality.sigmaHalfSteps, qualityEstimate.hours, qualityEstimate.multiplier),
    learning: projectLearning(settings, plan.changeSettings),
    learningActions: settings.learningActions.map(row => ({ ...row, label: getLearningPromptDefinition(row.promptId).label, workIds: [...row.workIds] })),
    rehearsals: rehearsals.map(definition => ({ definition, records: settings.rehearsals.filter(row => row.definitionId === definition.id && row.definitionVersion === definition.version)
      .map(row => ({ ...row, workIds: [...row.workIds], connectionIds: [...row.connectionIds], personIds: [...row.personIds] })) })),
  });
}

// Removal guards identify their owning record; the catalogue supplies its visitor label.
export function describeAssuranceReference(settings, reference) {
  if (reference.collection !== 'assuranceSettings') return null;
  const field = reference.field;
  if (field === 'context.recoveryRatePersonIds') return 'Recovery illustration: people whose rates inform the estimate';
  if (field.startsWith('quality.concepts[')) return `Quality concept: ${getQualityConcept(reference.id)?.label ?? 'quality work'}`;
  if (field.startsWith('recoveryEvents[')) {
    const row = settings.recoveryEvents.find(row => row.id === reference.id);
    return `Recovery event: ${row?.label ?? 'recovery work'}${field.endsWith('.receiverPersonId') ? ' · receiving person' : ''}`;
  }
  if (field.startsWith('learningActions[')) {
    const row = settings.learningActions.find(row => row.id === reference.id);
    return `Learning action: ${getLearningPromptDefinition(row?.promptId)?.label ?? 'planned learning'}${field.endsWith('.decisionOwnerPersonId') ? ' · decision owner' : ''}`;
  }
  if (field.startsWith('rehearsals[')) {
    const row = settings.rehearsals.find(row => row.id === reference.id), definition = getRehearsalDefinition(row?.definitionId, row?.definitionVersion);
    const role = field.endsWith('.reviewerPersonId') ? ' · reviewer' : field.endsWith('.personIds') ? ' · participant' : field.endsWith('.connectionIds') ? ' · connection' : '';
    return `Rehearsal: ${definition?.name ?? 'planned response'}${row?.context ? ` · ${row.context}` : ''}${role}`;
  }
  return 'Quality and recovery plan';
}
