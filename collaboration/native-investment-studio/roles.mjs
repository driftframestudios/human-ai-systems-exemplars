// Stable meanings from the complete Studio staffing selectors. Labels remain presentation.
function catalogue(rows) { return Object.freeze(rows.map(([id, label]) => Object.freeze({ id, label }))); }
export const ROLE_CATALOGUES = Object.freeze({
  functionId: catalogue([
    ['design-research', 'Design / Research'], ['engineering', 'Engineering'], ['data-ml', 'Data / ML'],
    ['product-program', 'Product / Program'], ['quality-regulatory', 'Quality / Regulatory'],
    ['security-privacy', 'Security / Privacy'], ['ops-support', 'Ops / Support'],
    ['change-enablement', 'Change / Enablement'], ['leadership-decision-owner', 'Leadership / Decision Owner'],
    ['domain-field-expert', 'Domain / Field Expert'],
  ]),
  seniorityId: catalogue([['mid-level', 'Mid-level'], ['senior', 'Senior'], ['principal-plus', 'Principal+'], ['lead-manager', 'Lead / Manager'], ['director-plus', 'Director+']]),
  postureId: catalogue([['individual-contributor', 'Individual contributor'], ['player-coach', 'Player-coach'], ['people-leader', 'People leader'], ['decision-owner', 'Decision owner'], ['domain-reviewer', 'Domain reviewer']]),
  enablerId: catalogue([['decision-source-access', 'Decision and source access'], ['protected-focus-time', 'Protected focus time'], ['data-tool-access', 'Data and tool access'], ['training-coaching', 'Training and coaching'], ['cross-team-authority', 'Cross-team authority']]),
  qualityId: catalogue([['contributes-evidence', 'Contributes evidence'], ['independent-review', 'Independent review'], ['specialist-review', 'Specialist review'], ['outside-scope', 'Intentionally outside scope']]),
  aiId: catalogue([['receives-reviews', 'Receives / reviews'], ['escalation-owner', 'Escalation owner'], ['draft-recipient', 'Draft recipient'], ['no-handoff', 'No AI handoff']]),
  decisionId: catalogue([['advises', 'Advises'], ['recommends', 'Recommends'], ['approves', 'Approves'], ['operates', 'Operates']]),
});
export const CHANGE_FRAMEWORKS = Object.freeze([
  ['kotter', 'Kotter / Accelerators', [['urgency', 'Urgency'], ['coalition', 'Coalition'], ['vision', 'Vision'], ['broad-participation', 'Broad participation'], ['remove-barriers', 'Remove barriers'], ['short-term-wins', 'Short-term wins'], ['sustain-acceleration', 'Sustain acceleration'], ['anchor-in-culture', 'Anchor in culture']]],
  ['npt', 'Normalization Process Theory', [['coherence', 'Coherence'], ['cognitive-participation', 'Cognitive participation'], ['collective-action', 'Collective action'], ['reflexive-monitoring', 'Reflexive monitoring'], ['elasticity-plasticity', 'Elasticity / plasticity']]],
  ['rogers', 'Rogers diffusion', [['relative-advantage', 'Relative advantage'], ['compatibility', 'Compatibility'], ['complexity', 'Complexity'], ['trialability', 'Trialability'], ['observability', 'Observability']]],
  ['weick', 'Weick sensemaking', [['enactment', 'Enactment'], ['selection', 'Selection'], ['retention', 'Retention']]],
  ['adkar', 'ADKAR', [['awareness', 'Awareness'], ['desire', 'Desire'], ['knowledge', 'Knowledge'], ['ability', 'Ability'], ['reinforcement', 'Reinforcement']]],
  ['dual', 'Dual operating system', [['hierarchy', 'Hierarchy'], ['network', 'Network']]],
].map(([id, label, rows]) => Object.freeze({ id, label, components: catalogue(rows) })));
export const CONTRIBUTION_CATEGORIES = catalogue([
  ['scenario-generation', 'Scenario generation'], ['source-retrieval', 'Source retrieval'],
  ['dependency-mapping', 'Dependency mapping'], ['draft-artifacts', 'Draft artifacts'],
  ['cross-source-synthesis', 'Cross-source synthesis'], ['transparent-calculation', 'Transparent calculation'],
]);
export const ROLE_FIELDS = Object.freeze([...Object.keys(ROLE_CATALOGUES), 'change']);
export function emptyRole() { return Object.fromEntries(ROLE_FIELDS.map(field => [field, null])); }
