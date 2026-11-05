// Native definitions preserve the original Studio's authored framework, lens and attention meanings.
// Stable framework and component IDs preserve the existing native role assignments.
export const CHANGE_CATALOGUE_VERSION = '1.0.0';
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
export const CHANGE_SOURCE = freeze({
  owner: 'initiative-costing-calculator',
  path: 'collaboration/initiative-costing-calculator/index.html',
  relation: 'Authored definitions adapted into the native Studio catalogue',
});
export const CHANGE_STATUSES = freeze([
  { id: 'planned', label: 'Planned' }, { id: 'partial', label: 'Partial' },
  { id: 'look', label: 'Look here' }, { id: 'outside', label: 'Intentionally outside scope' },
]);
export const CHANGE_SOURCE_FILTERS = freeze([
  { id: 'all', label: 'All sources' }, { id: 'core', label: 'Core Architectures' },
  { id: 'enterprise', label: 'Enterprise' },
]);
export const FOUR_ACTIONS_METHOD = freeze({
  name: 'Four Actions Framework', authors: ['W. Chan Kim', 'Renée Mauborgne'],
  url: 'https://www.blueoceanstrategy.com/tools/four-actions-framework/',
  purpose: 'Ask what to eliminate, reduce, raise and create when shaping a new value curve.',
  adaptation: 'The Studio uses these categories to form planning questions about the active change model. Market-strategy conclusions retain their own evidence and review.',
});
export const FOUR_ACTIONS = freeze([
  { id: 'raise', label: 'Raise', time: 'Now', statuses: ['look', 'partial', 'planned', 'outside'] },
  { id: 'reduce', label: 'Reduce', time: 'Next', statuses: ['partial', 'look', 'planned', 'outside'] },
  { id: 'eliminate', label: 'Eliminate', time: 'Now', statuses: ['outside', 'look', 'partial', 'planned'] },
  { id: 'create', label: 'Create', time: 'Later', statuses: ['planned', 'partial', 'look', 'outside'] },
]);

function suggestions(rows) { return rows.map(([id, label]) => ({ id, label })); }

const frameworks = freeze([
  { id: "kotter", version: CHANGE_CATALOGUE_VERSION, name: "Kotter / Accelerators",
    short: "Transition conditions",
    note: "Eight familiar accelerators can operate concurrently; the initiative determines their useful sequence.",
    components: [
      { id: "urgency", label: "Urgency",
        explanation: "Keeps the reason for movement available to the affected population",
        coreSuggestions: suggestions([["practitioner-judgment-probes","Practitioner Judgment Probes"],["field-watch","Field Watch"]]),
        enterpriseSuggestions: suggestions([["stakeholder-inquiry","stakeholder inquiry"],["measurement","measurement"]]),
        receiverRole: "Product or research lead", defaultMapping: { mapped: true, status: "partial" } },
      { id: "coalition", label: "Coalition",
        explanation: "Connects standing, expertise, and authority across the initiative",
        coreSuggestions: suggestions([["participatory-design-kit","Participatory Design Kit"],["shared-surface-priority-map","Shared Surface Priority Map"],["ai-systems-service-blueprint","AI Systems Service Blueprint"]]),
        enterpriseSuggestions: suggestions([["executive-alignment","executive alignment"],["operating-model-design","operating-model design"]]),
        receiverRole: "Executive sponsor", defaultMapping: { mapped: true, status: "look" } },
      { id: "vision", label: "Vision",
        explanation: "Turns aspiration into a shared changed-work proposition",
        coreSuggestions: suggestions([["expectation-architecture","Expectation Architecture"],["poda","PODA"],["impact-map","Impact Map"],["strategy-canvas","Strategy Canvas"],["alignment-worksheet","Alignment Worksheet"],["frv-matrix","FRV Matrix"]]),
        enterpriseSuggestions: suggestions([["operating-model-design","operating-model design"],["communications","communications"]]),
        receiverRole: "Product lead", defaultMapping: { mapped: true, status: "look" } },
      { id: "broad-participation", label: "Broad participation",
        explanation: "Creates routes for contribution beyond the core team",
        coreSuggestions: suggestions([["collaborative-prototypes","Collaborative prototypes"]]),
        enterpriseSuggestions: suggestions([["stakeholder-inquiry","stakeholder inquiry"],["training-enablement","training / enablement"]]),
        receiverRole: "Change steward", defaultMapping: { mapped: true, status: "partial" } },
      { id: "remove-barriers", label: "Remove barriers",
        explanation: "Makes friction, access, dependency, and recovery routes inspectable",
        coreSuggestions: suggestions([["recovery-routing-atlas","Recovery Routing Atlas"],["upstream-revision-loop","Upstream Revision Loop"],["pattern-problem-surface-matrix","Pattern–Problem Surface Matrix"],["context-tree","Context Tree"]]),
        enterpriseSuggestions: suggestions([["process-mapping","process mapping"],["data-integration-work","data / integration work"]]),
        receiverRole: "Operations lead", defaultMapping: { mapped: true, status: "partial" } },
      { id: "short-term-wins", label: "Short-term wins",
        explanation: "Produces bounded evidence that informs the next move",
        coreSuggestions: suggestions([["heart","HEART"],["plus-delta","Plus–Delta"],["specification-by-example","Specification by Example"],["unit-test-first","Unit-test-first"],["jtbd-treemap","JTBD Treemap"]]),
        enterpriseSuggestions: suggestions([["qa-validation","QA / validation"],["measurement","measurement"]]),
        receiverRole: "Quality partner", defaultMapping: { mapped: true, status: "partial" } },
      { id: "sustain-acceleration", label: "Sustain acceleration",
        explanation: "Helps work survive handoffs and attention shifts",
        coreSuggestions: suggestions([["narrative-capsules","Narrative Capsules"],["coordination-horizons","Coordination Horizons"],["threadkeeping","threadkeeping"],["interstitial-compression","Interstitial Compression"],["campaign-shapes","Campaign Shapes"],["recovery-routing","Recovery Routing"]]),
        enterpriseSuggestions: suggestions([["runbooks-support","runbooks / support"],["post-release-learning","post-release learning"]]),
        receiverRole: "Operations lead", defaultMapping: { mapped: true, status: "look" } },
      { id: "anchor-in-culture", label: "Anchor in culture",
        explanation: "Carries provenance, vocabulary, and revision into ordinary practice",
        coreSuggestions: suggestions([["provenance-register","Provenance Register"],["value-origin-vocabulary","value-origin vocabulary"],["claim-labels","claim labels"],["version-history","version history"]]),
        enterpriseSuggestions: suggestions([["training-enablement","training / enablement"],["communications","communications"]]),
        receiverRole: "Change steward", defaultMapping: { mapped: true, status: "look" } },
    ] },
  { id: "npt", version: CHANGE_CATALOGUE_VERSION, name: "Normalization Process Theory",
    short: "Practice becoming ordinary",
    note: "The closest artifact-level diagnostic in the working source: inspect the work people do to make a practice coherent, join it, enact it, and appraise it. Elasticity and plasticity remain optional extensions.",
    components: [
      { id: "coherence", label: "Coherence",
        explanation: "How participants understand and distinguish the practice",
        coreSuggestions: suggestions([["context-tree","Context Tree"]]),
        enterpriseSuggestions: suggestions([["stakeholder-inquiry","stakeholder inquiry"],["communications","communications"]]),
        receiverRole: "Research lead", defaultMapping: { mapped: true, status: "partial" } },
      { id: "cognitive-participation", label: "Cognitive participation",
        explanation: "How people enroll and sustain participation",
        coreSuggestions: suggestions([["participatory-design-kit","Participatory Design Kit"]]),
        enterpriseSuggestions: suggestions([["executive-alignment","executive alignment"],["training-enablement","training / enablement"]]),
        receiverRole: "Change steward", defaultMapping: { mapped: true, status: "look" } },
      { id: "collective-action", label: "Collective action",
        explanation: "How the practice fits roles, resources, and operational work",
        coreSuggestions: suggestions([["ai-systems-service-blueprint","AI Systems Service Blueprint"]]),
        enterpriseSuggestions: suggestions([["operating-model-design","operating-model design"],["process-mapping","process mapping"]]),
        receiverRole: "Operations lead", defaultMapping: { mapped: true, status: "look" } },
      { id: "reflexive-monitoring", label: "Reflexive monitoring",
        explanation: "How people appraise effects and revise practice",
        coreSuggestions: suggestions([["plus-delta","Plus–Delta"],["heart","HEART"]]),
        enterpriseSuggestions: suggestions([["measurement","measurement"],["post-release-learning","post-release learning"]]),
        receiverRole: "Quality partner", defaultMapping: { mapped: true, status: "partial" } },
      { id: "elasticity-plasticity", label: "Elasticity / plasticity",
        explanation: "How the practice adapts while retaining its useful shape",
        coreSuggestions: suggestions([["narrative-capsules","Narrative Capsules"],["version-history","version history"]]),
        enterpriseSuggestions: suggestions([["runbooks-support","runbooks / support"]]),
        receiverRole: "Architecture steward", defaultMapping: { mapped: true, status: "partial" } },
    ] },
  { id: "rogers", version: CHANGE_CATALOGUE_VERSION, name: "Rogers diffusion",
    short: "Adoption attributes",
    note: "Inspect how people perceive an innovation: advantage, fit, difficulty, ability to try, and visibility of effects.",
    components: [
      { id: "relative-advantage", label: "Relative advantage",
        explanation: "Why this practice may improve on the present one",
        coreSuggestions: suggestions([["impact-map","Impact Map"]]),
        enterpriseSuggestions: suggestions([["stakeholder-inquiry","stakeholder inquiry"]]),
        receiverRole: "Product lead", defaultMapping: { mapped: true, status: "partial" } },
      { id: "compatibility", label: "Compatibility",
        explanation: "How it fits values, workflow, and infrastructure",
        coreSuggestions: suggestions([["context-tree","Context Tree"]]),
        enterpriseSuggestions: suggestions([["process-mapping","process mapping"]]),
        receiverRole: "Domain lead", defaultMapping: { mapped: true, status: "look" } },
      { id: "complexity", label: "Complexity",
        explanation: "What makes understanding or use demanding",
        coreSuggestions: suggestions([["poda","PODA"]]),
        enterpriseSuggestions: suggestions([["training-enablement","training / enablement"]]),
        receiverRole: "Service designer", defaultMapping: { mapped: true, status: "look" } },
      { id: "trialability", label: "Trialability",
        explanation: "How teams can test a bounded version",
        coreSuggestions: suggestions([["collaborative-prototypes","Collaborative prototypes"]]),
        enterpriseSuggestions: suggestions([["qa-validation","QA / validation"]]),
        receiverRole: "Engineering lead", defaultMapping: { mapped: true, status: "partial" } },
      { id: "observability", label: "Observability",
        explanation: "How consequences become visible",
        coreSuggestions: suggestions([["heart","HEART"]]),
        enterpriseSuggestions: suggestions([["measurement","measurement"],["post-release-learning","post-release learning"]]),
        receiverRole: "Research lead", defaultMapping: { mapped: true, status: "partial" } },
    ] },
  { id: "weick", version: CHANGE_CATALOGUE_VERSION, name: "Weick sensemaking",
    short: "Meaning under ambiguity",
    note: "Enactment, selection, and retention remain connected. Indeterminacy stays visible until an actor with standing can resolve it.",
    components: [
      { id: "enactment", label: "Enactment",
        explanation: "What actions and signals bring a situation into view",
        coreSuggestions: suggestions([["field-watch","Field Watch"]]),
        enterpriseSuggestions: suggestions([["stakeholder-inquiry","stakeholder inquiry"]]),
        receiverRole: "Research lead", defaultMapping: { mapped: true, status: "partial" } },
      { id: "selection", label: "Selection",
        explanation: "Which plausible interpretation guides action",
        coreSuggestions: suggestions([["strategy-canvas","Strategy Canvas"],["frv-matrix","FRV Matrix"]]),
        enterpriseSuggestions: suggestions([["executive-alignment","executive alignment"],["risk-review","risk review"]]),
        receiverRole: "Decision owner", defaultMapping: { mapped: true, status: "look" } },
      { id: "retention", label: "Retention",
        explanation: "What the organization keeps, revises, or releases",
        coreSuggestions: suggestions([["narrative-capsules","Narrative Capsules"],["provenance-register","Provenance Register"]]),
        enterpriseSuggestions: suggestions([["communications","communications"],["post-release-learning","post-release learning"]]),
        receiverRole: "Knowledge steward", defaultMapping: { mapped: true, status: "look" } },
    ] },
  { id: "adkar", version: CHANGE_CATALOGUE_VERSION, name: "ADKAR",
    short: "Person-layer conditions",
    note: "A person-layer lens for awareness, desire, knowledge, ability, and reinforcement; structural and collective conditions remain visible elsewhere in the studio.",
    components: [
      { id: "awareness", label: "Awareness",
        explanation: "Understanding why change is relevant",
        coreSuggestions: suggestions([["field-watch","Field Watch"]]),
        enterpriseSuggestions: suggestions([["communications","communications"]]),
        receiverRole: "Change steward", defaultMapping: { mapped: true, status: "partial" } },
      { id: "desire", label: "Desire",
        explanation: "A meaningful route to participation",
        coreSuggestions: suggestions([["participatory-design-kit","Participatory Design Kit"]]),
        enterpriseSuggestions: suggestions([["stakeholder-inquiry","stakeholder inquiry"]]),
        receiverRole: "People leader", defaultMapping: { mapped: true, status: "look" } },
      { id: "knowledge", label: "Knowledge",
        explanation: "Information and learning needed to act",
        coreSuggestions: suggestions([["poda","PODA"]]),
        enterpriseSuggestions: suggestions([["training-enablement","training / enablement"]]),
        receiverRole: "Enablement lead", defaultMapping: { mapped: true, status: "look" } },
      { id: "ability", label: "Ability",
        explanation: "Conditions and practice needed to perform",
        coreSuggestions: suggestions([["collaborative-prototypes","Collaborative prototypes"]]),
        enterpriseSuggestions: suggestions([["process-mapping","process mapping"],["qa-validation","QA / validation"]]),
        receiverRole: "Operations lead", defaultMapping: { mapped: true, status: "partial" } },
      { id: "reinforcement", label: "Reinforcement",
        explanation: "Signals and supports that help practice persist",
        coreSuggestions: suggestions([["plus-delta","Plus–Delta"]]),
        enterpriseSuggestions: suggestions([["measurement","measurement"],["runbooks-support","runbooks / support"]]),
        receiverRole: "People leader", defaultMapping: { mapped: true, status: "partial" } },
    ] },
  { id: "dual", version: CHANGE_CATALOGUE_VERSION, name: "Dual operating system",
    short: "Hierarchy + network",
    note: "Hierarchy and network operate concurrently. The coordination horizon shows all eight Kotter accelerators as a concurrent map.",
    components: [
      { id: "hierarchy", label: "Hierarchy",
        explanation: "Carries formal authority, resources, controls, and durable operations",
        coreSuggestions: suggestions([["shared-surface-priority-map","Shared Surface Priority Map"],["provenance-register","Provenance Register"]]),
        enterpriseSuggestions: suggestions([["executive-alignment","executive alignment"],["operating-model-design","operating-model design"]]),
        receiverRole: "Executive sponsor", defaultMapping: { mapped: true, status: "partial" } },
      { id: "network", label: "Network",
        explanation: "Carries sensing, voluntary participation, learning, and cross-boundary movement",
        coreSuggestions: suggestions([["participatory-design-kit","Participatory Design Kit"],["field-watch","Field Watch"],["collaborative-prototypes","Collaborative prototypes"]]),
        enterpriseSuggestions: suggestions([["stakeholder-inquiry","stakeholder inquiry"],["communications","communications"],["post-release-learning","post-release learning"]]),
        receiverRole: "Network steward", defaultMapping: { mapped: true, status: "look" } },
    ] },
]);

const lenses = freeze([
  { id: "executive", version: CHANGE_CATALOGUE_VERSION, name: "Executive value",
    surface: "Investment, changed ability, decision timing, and accountable owner",
    load: "Consequences, tradeoffs, decision boundary, and durable operating value",
    aside: "Implementation detail within the agreed decision boundary",
    reentry: "A dependency, risk, or cost changes the executive decision",
    trigger: "A decision owner asks what makes the outcome operable",
    kind: "change" },
  { id: "people", version: CHANGE_CATALOGUE_VERSION, name: "Affected people",
    surface: "Population, changed work, participation, accessibility, and recovery load",
    load: "Who gains ability, who absorbs disruption, and who has meaningful voice",
    aside: "Aggregate averages that conceal a materially affected group",
    reentry: "Population evidence changes the proposed work or boundary",
    trigger: "A lived consequence or access condition needs closer review",
    kind: "look" },
  { id: "operating", version: CHANGE_CATALOGUE_VERSION, name: "Operating model / change",
    surface: "Roles, routines, decision rights, accelerators, and ordinary practice",
    load: "Participation, barrier removal, handoff survival, and anchoring",
    aside: "Novelty with an unclear operating benefit",
    reentry: "The team needs a named owner for ongoing practice",
    trigger: "A handoff exposes a missing role or routine",
    kind: "change" },
  { id: "technical", version: CHANGE_CATALOGUE_VERSION, name: "Technical system / architecture",
    surface: "Interfaces, dependencies, data contracts, replay, and observability",
    load: "System judgment across multi-team, multi-quarter ambiguous work",
    aside: "Implementation variation that stays within the accepted contract",
    reentry: "Architecture changes cost, risk, or cross-team coordination",
    trigger: "A dependency or failure mode crosses a system boundary",
    kind: "milestone" },
  { id: "quality", version: CHANGE_CATALOGUE_VERSION, name: "Quality / safety",
    surface: "Acceptance criteria, independent review, validation, and post-release learning",
    load: "Intended use, evidence, exception handling, and recovery",
    aside: "Process-capability shorthand detached from product or population consequences",
    reentry: "A safety, validity, accessibility, privacy, or user-harm concern emerges",
    trigger: "Release evidence needs further review",
    kind: "quality" },
  { id: "risk", version: CHANGE_CATALOGUE_VERSION, name: "Risk / dependencies",
    surface: "Known unknowns, disruption windows, constraints, and recovery routes",
    load: "What could change the plan and who receives the signal",
    aside: "Speculation awaiting a decision or learning route",
    reentry: "A named uncertainty becomes material to scope, timing, or population",
    trigger: "Attention drift reveals a stronger dependency question",
    kind: "look" },
  { id: "staffing", version: CHANGE_CATALOGUE_VERSION, name: "Hiring / staffing",
    surface: "Functions, quantities, ability enablers, decision rights, and handoff coverage",
    load: "The capabilities and conditions required to carry the work",
    aside: "Candidate ranking or inferred personal suitability",
    reentry: "A staffed change component lacks a receiver or authority",
    trigger: "Coordination load exceeds the team’s available posture",
    kind: "span" },
  { id: "learning", version: CHANGE_CATALOGUE_VERSION, name: "Learning / evidence",
    surface: "Signals, methods, source routes, open conditions, and next-learning actions",
    load: "What the team can observe, revise, and carry into the next decision",
    aside: "Metrics awaiting a decision relationship",
    reentry: "New evidence changes the frame or warrants a return",
    trigger: "A short-term result creates a better question",
    kind: "milestone" },
]);

const attention = freeze([
  { id: "urgency", version: CHANGE_CATALOGUE_VERSION, label: "Urgency",
    description: "Why movement matters now", defaultParts: 12, minParts: 0, maxParts: 25 },
  { id: "coalition", version: CHANGE_CATALOGUE_VERSION, label: "Coalition",
    description: "Who can carry the work together", defaultParts: 10, minParts: 0, maxParts: 25 },
  { id: "vision", version: CHANGE_CATALOGUE_VERSION, label: "Vision",
    description: "What changed work should feel like", defaultParts: 12, minParts: 0, maxParts: 25 },
  { id: "broad-participation", version: CHANGE_CATALOGUE_VERSION, label: "Broad participation",
    description: "How more people can contribute", defaultParts: 14, minParts: 0, maxParts: 25 },
  { id: "remove-barriers", version: CHANGE_CATALOGUE_VERSION, label: "Remove barriers",
    description: "What blocks action or access", defaultParts: 14, minParts: 0, maxParts: 25 },
  { id: "short-term-wins", version: CHANGE_CATALOGUE_VERSION, label: "Short-term wins",
    description: "What creates credible early learning", defaultParts: 12, minParts: 0, maxParts: 25 },
  { id: "sustain-acceleration", version: CHANGE_CATALOGUE_VERSION, label: "Sustain acceleration",
    description: "How handoffs survive attention shifts", defaultParts: 13, minParts: 0, maxParts: 25 },
  { id: "anchor-in-culture", version: CHANGE_CATALOGUE_VERSION, label: "Anchor in culture",
    description: "How practice becomes ordinary", defaultParts: 13, minParts: 0, maxParts: 25 },
]);

const EMPTY = Object.freeze([]);
const frameworksByKey = new Map(frameworks.map(row => [row.id + ':' + row.version, row]));
const componentsByKey = new Map(frameworks.flatMap(row => row.components.map(component => [row.id + ':' + row.version + ':' + component.id, component])));
const lensesByKey = new Map(lenses.map(row => [row.id + ':' + row.version, row]));
export function listChangeFrameworks() { return frameworks; }
export function getChangeFramework(id, version) {
  return typeof id === 'string' && typeof version === 'string' ? frameworksByKey.get(id + ':' + version) ?? null : null;
}
export function getChangeComponent(frameworkId, version, componentId) {
  return typeof frameworkId === 'string' && typeof version === 'string' && typeof componentId === 'string'
    ? componentsByKey.get(frameworkId + ':' + version + ':' + componentId) ?? null : null;
}
export function getChangeSuggestion(frameworkId, version, componentId, source, suggestionId) {
  const component = getChangeComponent(frameworkId, version, componentId);
  const suggestions = source === 'core' ? component?.coreSuggestions : source === 'enterprise' ? component?.enterpriseSuggestions : null;
  return suggestions?.find(row => row.id === suggestionId) ?? null;
}
export function listInterpretiveLenses() { return lenses; }
export function getInterpretiveLens(id, version) {
  return typeof id === 'string' && typeof version === 'string' ? lensesByKey.get(id + ':' + version) ?? null : null;
}
export function listAttentionChannels() { return attention; }

export function createChangeSettings() {
  return {
    activeFramework: { frameworkId: 'kotter', version: CHANGE_CATALOGUE_VERSION },
    lens: { lensId: 'executive', version: CHANGE_CATALOGUE_VERSION },
    sourceFilter: 'all',
    frameworkMaps: frameworks.map(row => ({ frameworkId: row.id, version: row.version,
      components: row.components.map(component => ({ componentId: component.id,
        ...component.defaultMapping, workIds: [], capabilityRefs: [] })) })),
    attention: { version: CHANGE_CATALOGUE_VERSION,
      channels: attention.map(row => ({ channelId: row.id, parts: row.defaultParts })) },
  };
}

export function listComponentSuggestions(component, sourceFilter) {
  if (!component) return EMPTY;
  if (sourceFilter === 'core') return component.coreSuggestions;
  if (sourceFilter === 'enterprise') return component.enterpriseSuggestions;
  return sourceFilter === 'all' ? freeze([...component.coreSuggestions, ...component.enterpriseSuggestions]) : EMPTY;
}
export function preferredChangeSuggestion(component, sourceFilter) {
  if (!component || !['all', 'core', 'enterprise'].includes(sourceFilter)) return null;
  return sourceFilter === 'core'
    ? component.coreSuggestions[0] ?? component.enterpriseSuggestions[0] ?? null
    : component.enterpriseSuggestions[0] ?? component.coreSuggestions[0] ?? null;
}

// The caller supplies the already-admitted map for this exact framework version.
// Authored component order resolves ties; small frameworks deliberately reuse a component.
export function selectFourActions(framework, componentStates) {
  if (!framework) return EMPTY;
  const states = new Map(componentStates.map(row => [row.componentId, row]));
  const used = new Set();
  return freeze(FOUR_ACTIONS.map((action, actionIndex) => {
    let component;
    for (const status of action.statuses) {
      component = framework.components.find(row => !used.has(row.id) && states.get(row.id)?.status === status);
      if (component) break;
    }
    component ??= framework.components.find(row => !used.has(row.id));
    component ??= framework.components[actionIndex % framework.components.length];
    used.add(component.id);
    return { actionId: action.id, label: action.label, time: action.time, componentId: component.id };
  }));
}

// Settings have already passed their finite admission contract. This reading owns
// its arrays and records; it leaves caller settings and all monetary owners intact.
export function projectChange(settings) {
  const framework = getChangeFramework(settings.activeFramework.frameworkId, settings.activeFramework.version);
  const lens = getInterpretiveLens(settings.lens.lensId, settings.lens.version);
  const mapping = settings.frameworkMaps.find(row => row.frameworkId === framework.id && row.version === framework.version);
  const byComponent = new Map(mapping.components.map(row => [row.componentId, row]));
  const components = framework.components.map(definition => {
    const row = byComponent.get(definition.id);
    return { componentId: definition.id, label: definition.label, explanation: definition.explanation,
      receiverRole: definition.receiverRole, mapped: row.mapped, status: row.status,
      workIds: [...row.workIds], capabilityRefs: row.capabilityRefs.map(reference => ({ ...reference })),
      coreSuggestions: definition.coreSuggestions, enterpriseSuggestions: definition.enterpriseSuggestions,
      suggestions: listComponentSuggestions(definition, settings.sourceFilter),
      preferredSuggestion: preferredChangeSuggestion(definition, settings.sourceFilter) };
  });
  const projectedById = new Map(components.map(row => [row.componentId, row]));
  const byChannel = new Map(settings.attention.channels.map(row => [row.channelId, row.parts]));
  const channels = attention.map(definition => ({ ...definition, parts: byChannel.get(definition.id) }));
  const ranked = [...channels].sort((a, b) => b.parts - a.parts);
  const lowest = [...channels].sort((a, b) => a.parts - b.parts).slice(0, 2);
  return freeze({ framework, lens, sourceFilter: settings.sourceFilter, components,
    mappingGaps: components.filter(row => !row.mapped || row.status === 'look'),
    fourActions: selectFourActions(framework, mapping.components).map(row => ({ ...row, component: projectedById.get(row.componentId) })),
    attention: { channels, totalParts: channels.reduce((sum, row) => sum + row.parts, 0), ranked,
      top: ranked.slice(0, framework.id === 'dual' ? 8 : 3), lowest },
  });
}
