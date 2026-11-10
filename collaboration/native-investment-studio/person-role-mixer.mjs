import { ROLE_CATALOGUES, CHANGE_FRAMEWORKS } from './roles.mjs';
import { createReel } from './reel-control.mjs';

const RECIPES = Object.freeze({
  kotter: ['coalition', 'cross-team-authority', 'recommends', 'player-coach', 'contributes-evidence', 'receives-reviews'],
  npt: ['collective-action', 'protected-focus-time', 'operates', 'individual-contributor', 'contributes-evidence', 'receives-reviews'],
  rogers: ['trialability', 'data-tool-access', 'advises', 'domain-reviewer', 'specialist-review', 'draft-recipient'],
  weick: ['selection', 'decision-source-access', 'recommends', 'domain-reviewer', 'independent-review', 'receives-reviews'],
  adkar: ['ability', 'training-coaching', 'operates', 'player-coach', 'contributes-evidence', 'no-handoff'],
  dual: ['network', 'cross-team-authority', 'approves', 'decision-owner', 'independent-review', 'escalation-owner'],
});
const FRAMEWORK_BY_ENABLER = Object.freeze({ 'decision-source-access': 'weick', 'protected-focus-time': 'npt',
  'data-tool-access': 'rogers', 'training-coaching': 'adkar', 'cross-team-authority': 'kotter' });
const FRAMEWORK_BY_DECISION = Object.freeze({ advises: 'rogers', recommends: 'weick', approves: 'dual', operates: 'npt' });
export const ROLE_MIXER_FACETS = Object.freeze([
  ['functionId', 'Function'], ['seniorityId', 'Seniority'], ['postureId', 'Working posture'],
  ['enablerId', 'Ability enabler'], ['decisionId', 'Decision boundary'], ['qualityId', 'Quality role'], ['aiId', 'AI handoff'],
]);
const SHORT_FRAMEWORK = Object.freeze({ kotter: 'Kotter', npt: 'NPT', rogers: 'Rogers', weick: 'Sensemaking', adkar: 'ADKAR', dual: 'Dual system' });
const SHORT_ENABLER = Object.freeze({ 'decision-source-access': 'Source access', 'protected-focus-time': 'Focus time',
  'data-tool-access': 'Tools & data', 'training-coaching': 'Coaching', 'cross-team-authority': 'Team authority' });
const FRAMEWORK_CONTEXT = Object.freeze({ kotter: 'Build a coalition that can carry the change.', npt: 'Make the new practice workable in everyday routines.',
  rogers: 'Try an improvement and make its benefit visible.', weick: 'Make sense of the evidence before recommending a direction.',
  adkar: 'Build the ability and support to use the new approach.', dual: 'Connect day-to-day delivery with cross-team decisions.' });
const ENABLER_CONTEXT = Object.freeze({ 'decision-source-access': 'Reach the people and evidence needed for a decision.',
  'protected-focus-time': 'Reserve time for sustained work.', 'data-tool-access': 'Provide the tools and material needed to try the work.',
  'training-coaching': 'Help people practise the new approach.', 'cross-team-authority': 'Give shared work a route across team boundaries.' });
const DECISION_CONTEXT = Object.freeze({ advises: 'Offer expertise for another person’s decision.', recommends: 'Bring a proposed direction and its reasons.',
  approves: 'Make the named decision after reviewing the evidence.', operates: 'Carry out the agreed work and report what happens.' });

// Each authored preset changes a bounded role together. Function and seniority
// remain the visitor's choices; exact pads can refine every proposed setting.
export function deriveRolePreset(raw, dimension, value) {
  const framework = dimension === 'framework' ? value : dimension === 'enablerId' ? FRAMEWORK_BY_ENABLER[value]
    : dimension === 'decisionId' ? FRAMEWORK_BY_DECISION[value] : null;
  const recipe = RECIPES[framework];
  if (!recipe) return null;
  const [component, enablerId, decisionId, postureId, qualityId, aiId] = recipe;
  const current = String(raw.change ?? '').split(':');
  const validComponent = CHANGE_FRAMEWORKS.find(row => row.id === framework)?.components.some(row => row.id === current[1]);
  return { ...raw, change: `${framework}:${current[0] === framework && validComponent ? current[1] : component}`,
    enablerId: dimension === 'enablerId' ? value : enablerId,
    decisionId: dimension === 'decisionId' ? value : decisionId, postureId, qualityId, aiId };
}

export function mountPersonRoleMixer(document, { inputs, onChange }) {
  const node = (tag, text, className) => { const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item; };
  const element = node('section', undefined, 'studio-role-mixer'); element.setAttribute('aria-label', 'Role mixing desk');
  const reels = node('div', undefined, 'studio-role-mixer__reels'), components = node('fieldset', undefined, 'studio-role-mixer__components');
  components.append(node('legend', 'Change component'));
  const componentPads = node('div', undefined, 'studio-role-mixer__choices'); components.append(componentPads);
  const facetRail = node('div', undefined, 'studio-role-mixer__facets');
  const precision = node('div', undefined, 'studio-role-mixer__precision');
  const facetChoices = node('fieldset', undefined, 'studio-role-mixer__facet-options');
  const facetLegend = node('legend', 'Function'), facetPads = node('div', undefined, 'studio-role-mixer__choices');
  facetChoices.append(facetLegend, precision, facetPads);
  const sourceHomes = Object.entries(inputs).map(([field, input]) => {
    const container = input.closest('.native-responsibility__field'), marker = document.createComment('home: role field');
    container.before(marker); return { field, input, container, marker, hidden: container.hidden };
  });
  let raw = {}, disposed = false, currentFramework = null, selectedFacet = 'functionId';
  const controls = new Map(), facets = new Map();
  function button(text, field, value) {
    const control = node('button', text, 'studio-role-mixer__pad'); control.type = 'button';
    control.dataset.roleField = field; control.dataset.roleChoice = value; control.setAttribute('aria-pressed', 'false');
    control.addEventListener('click', () => { if (!disposed) onChange({ field, value }); });
    return control;
  }
  for (const [dimension, label, choices, variant] of [
    ['framework', 'Change model', CHANGE_FRAMEWORKS.map(row => ({ id: row.id, label: SHORT_FRAMEWORK[row.id] })), 'teal'],
    ['enablerId', 'Ability enabler', ROLE_CATALOGUES.enablerId.map(row => ({ ...row, label: SHORT_ENABLER[row.id] })), 'cobalt'],
    ['decisionId', 'Decision boundary', ROLE_CATALOGUES.decisionId, 'rose'],
  ]) {
    const reel = createReel(document, { label, choices, variant, secondary: dimension !== 'framework',
      onSelect: value => { if (!disposed) onChange({ dimension, value }); } });
    reel.element.dataset.roleReel = dimension;
    const description = node('p', '', 'studio-role-mixer__context');
    const clear = button('Clear', dimension === 'framework' ? 'change' : dimension, '');
    clear.classList.add('native-control--cancel'); clear.setAttribute('aria-label', `Clear ${label.toLowerCase()}`);
    reel.element.append(description, clear); reels.append(reel.element); controls.set(dimension, { reel, description });
  }
  for (const [field, label] of ROLE_MIXER_FACETS) {
    const control = node('button', undefined, 'studio-role-mixer__facet'); control.type = 'button'; control.dataset.roleFacet = field;
    const title = node('strong', label), value = node('small', 'Unassigned'); control.append(title, value);
    control.addEventListener('click', () => { selectedFacet = field; showFacet(); });
    facetRail.append(control); facets.set(field, { control, value });
  }
  for (const home of sourceHomes) {
    home.container.hidden = home.field !== 'functionId';
    precision.append(home.container);
  }
  element.append(reels, components, facetRail, facetChoices);
  function showFacet() {
    const label = ROLE_MIXER_FACETS.find(([field]) => field === selectedFacet)?.[1]
      ?? (selectedFacet === 'enablerId' ? 'Ability enabler' : 'Decision boundary'); facetLegend.textContent = label;
    for (const { field, container } of sourceHomes) container.hidden = field !== 'functionId' || selectedFacet !== 'functionId';
    facetPads.replaceChildren(...(selectedFacet === 'functionId' ? [] : [{ id: '', label: 'Unassigned' }, ...ROLE_CATALOGUES[selectedFacet]])
      .map(choice => button(choice.label, selectedFacet, choice.id)));
    for (const [field, { control }] of facets) control.setAttribute('aria-pressed', String(field === selectedFacet));
    syncPads();
  }
  function syncPads() {
    for (const control of element.querySelectorAll('[data-role-choice]')) control.setAttribute('aria-pressed', String((raw[control.dataset.roleField] ?? '') === control.dataset.roleChoice));
  }
  function update(nextRaw, { disabled = false } = {}) {
    if (disposed) return;
    raw = nextRaw;
    const framework = String(raw.change ?? '').split(':')[0];
    for (const [dimension, { reel, description }] of controls) {
      const value = dimension === 'framework' ? framework : raw[dimension];
      if (value) reel.select(value);
      else {
        reel.element.dataset.reelValue = '';
        for (const control of reel.element.querySelectorAll('[data-reel-choice]')) control.setAttribute('aria-pressed', 'false');
        reel.element.querySelector('output').textContent = 'Unassigned';
      }
      const contexts = dimension === 'framework' ? FRAMEWORK_CONTEXT : dimension === 'enablerId' ? ENABLER_CONTEXT : DECISION_CONTEXT;
      description.textContent = contexts[value] ?? 'Choose a setting to explore a role mix.';
    }
    if (currentFramework !== framework) {
      currentFramework = framework;
      const definition = CHANGE_FRAMEWORKS.find(row => row.id === framework);
      componentPads.replaceChildren(...(definition?.components ?? []).map(choice => button(choice.label, 'change', `${framework}:${choice.id}`)));
      components.hidden = !definition;
    }
    for (const [field, { value }] of facets) value.textContent = ROLE_CATALOGUES[field].find(choice => choice.id === raw[field])?.label ?? 'Unassigned';
    syncPads();
    for (const control of element.querySelectorAll('button')) control.disabled = disabled;
  }
  showFacet();
  return Object.freeze({ element, update, vary(ratio) {
    for (const { reel } of controls.values()) reel.vary(ratio);
  }, focus(field) {
    if (Object.hasOwn(ROLE_CATALOGUES, field) && selectedFacet !== field) { selectedFacet = field; showFacet(); }
    const exact = inputs[field];
    if (field === 'functionId') exact.focus({ preventScroll: true });
    else (element.querySelector(`[data-role-field="${field}"][aria-pressed="true"]`)
      ?? controls.get(field === 'change' ? 'framework' : field)?.reel.element.querySelector('[aria-pressed="true"]')
      ?? element.querySelector('button'))?.focus({ preventScroll: true });
  }, dispose() {
    if (disposed) return; disposed = true;
    for (const { reel } of controls.values()) reel.dispose();
    for (const { container, marker, hidden } of sourceHomes) { marker.after(container); container.hidden = hidden; marker.remove(); }
    element.remove();
  } });
}
