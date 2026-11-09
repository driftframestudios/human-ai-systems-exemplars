import { createTimeControls, mountDurationDials, renderTimeReadout } from './time-controls.mjs';
import { ASSURANCE_FIELDS, assuranceField, assuranceSettingsFromRaw, startingAssuranceRaw } from './assurance-draft.mjs';
import { listQualityConcepts, listSourcePresets, getSourcePreset, listRehearsalDefinitions, getLearningPromptDefinition, projectAssurance, sourcePresetEstimate } from './assurance-models.mjs';
import { money } from './display.mjs';
import { nextCreatedLabel } from './creation-label.mjs';
import { mountRateControls } from './rate-controls.mjs';
import { mountRackHeader, focusSubmitControl, captureRackEntry } from './rack-controls.mjs';
import { projectAssuranceConsequences, summarizeAssuranceWork } from './assurance-consequences.mjs';
import { createReel, revealReelResult, animateRackChange } from './reel-control.mjs';
import { QUALITY_REELS, QUALITY_FADERS, QUALITY_PHASES, createQualityExploration, qualityArrangement, qualityRehearsalExample, qualityConstraints } from './assurance-showcase.mjs';

const INSTANCES = new WeakMap();
let instanceSequence = 0;
const choices = {
  sourcePresetId: [['', 'Use the current plan context'], ...listSourcePresets().map(row => [row.id, row.name])],
  sigmaHalfSteps: Array.from({ length: 11 }, (_, index) => [String(index + 2), `${(index + 2) / 2}σ`]),
  horizonUnit: [['hours', 'Hours'], ['sprints', 'Sprints (80 hours)'], ['quarters', 'Quarters (520 hours)']],
  'proposal.mode': [['new', 'Propose a new session'], ['update', 'Adjust an existing session']],
  'proposal.funding': [['allocated', 'Within funded time'], ['additional', 'Extra investment']],
  lifecycle: [['active', 'Active'], ['retired', 'Retired']],
};
const targets = { people: 'person', teams: 'team', work: 'session' };
const collectionKeys = { event: 'eventIds', learning: 'learningIds', rehearsal: 'rehearsalIds' };
const hourText = hours => `${Number(hours.toFixed(2))} hours`;
export function mountAssurancePanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {}, onAccepted = () => {},
  onSourceWork = () => {}, canOpen = () => true, isActive = canOpen }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, instance = `assurance-${++instanceSequence}`, cleanup = [], controls = new Map(), cards = new Map();
  const node = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
  const find = name => { const element = root.querySelector(`[data-assurance-${name}=""]`); if (!element) throw new TypeError(`Supply the assurance ${name} element.`); return element; };
  const elements = Object.fromEntries(['quality', 'concepts', 'statistics', 'events', 'learning', 'rehearsal', 'work', 'preview', 'error', 'status', 'form', 'fields', 'recovery', 'current'].map(name => [name, find(name)]));
  const actions = new Map([...root.querySelectorAll('[data-assurance-action]')].map(element => [element.dataset.assuranceAction, element]));
  const editor = editing.assurance;
  const concepts = listQualityConcepts(), definitions = listRehearsalDefinitions();
  let selectedConcept = concepts[0].id, selectedScenario = definitions[0].id;
  let renderedSigma = null, selectedPrompt = null, activePane = null, layoutSignature = '';
  let proposalVisible = false, receiverEntry = null;
  const localInstruments = [];
  let constraints = qualityConstraints(createQualityExploration());
  let exploration = createQualityExploration();
  const explorationBySettings = new Map();
  const explorationKey = projection => JSON.stringify(projection.state.assuranceSettings);
  const restoreExploration = projection => ({ ...(explorationBySettings.get(explorationKey(projection)) ?? createQualityExploration()) });
  for (const name of ['quality', 'concepts', 'statistics', 'events', 'learning', 'rehearsal', 'work']) elements[name].replaceChildren();
  let disposed = false, generation = 0, sequence = 0, composing = false, lastProjection = null, promptSignature = '';
  const owns = epoch => !disposed && generation === epoch;
  const listen = (element, event, handler) => { element.addEventListener(event, handler); cleanup.push(() => element.removeEventListener(event, handler)); };
  const button = (text, action, data = {}) => {
    const element = node('button', text); element.type = 'button'; Object.assign(element.dataset, { assuranceAction: action, ...data });
    if (action === 'add-event') element.classList.add('native-control--create');
    if (['work', 'propose', 'learning', 'rehearse', 'add-event', 'scenario', 'preparation', 'proposal-settings'].includes(action)) element.classList.add('native-control--navigate');
    return element;
  };
  const actionRow = (...children) => { const group = node('div', undefined, 'native-coordination__actions'); group.append(...children); return group; };
  const announce = text => { if (!disposed) elements.status.textContent = text; };
  function options(source, selected) {
    const rows = studio.read().state[source].map(row => [row.id, `${row.label ?? row.sharedObject}${row.lifecycle === 'retired' ? ' · retired' : ''}`]);
    const known = new Set(rows.map(([id]) => id));
    for (const id of selected) if (id && !known.has(id)) rows.push([id, `${id} · removed; choose a current record`]);
    return rows;
  }
  function populate(control, value) {
    const { input, metadata, key, radio } = control, selected = metadata.kind === 'ids' ? value : [value];
    const rows = metadata.source ? options(metadata.source, selected) : choices[key] ?? choices[key.split('.').at(-1)] ?? metadata.choices.map(id => [id, id]);
    input.replaceChildren();
    if (metadata.kind === 'ids' || radio) {
      for (const [id, label] of rows) {
        const li = node('li'), wrapper = node('label'), checkbox = node('input'); checkbox.type = radio ? 'radio' : 'checkbox'; checkbox.name = key; checkbox.value = id;
        checkbox.dataset.assuranceField = key; checkbox.setAttribute('aria-describedby', control.error.id); wrapper.append(checkbox, node('span', label)); li.append(wrapper); input.append(li);
      }
      if (!rows.length) input.append(node('li', 'Add a record below to make it available here.'));
    } else {
      if (metadata.source) { const option = node('option', 'Choose when known'); option.value = ''; input.append(option); }
      for (const [id, label] of rows) { const option = node('option', label); option.value = id; input.append(option); }
    }
  }
  function field(parent, key, labelOverride) {
    const metadata = assuranceField(key), fixedChoices = choices[key] ?? choices[key.split('.').at(-1)] ?? metadata.choices;
    const radio = !metadata.source && !metadata.checkbox && fixedChoices?.length >= 2 && fixedChoices.length <= 4, grouped = metadata.kind === 'ids' || radio;
    const group = node(grouped ? 'fieldset' : 'div', undefined, `native-assurance__field${metadata.numeric || metadata.decimal ? ' native-assurance__quantity' : ''}${metadata.checkbox ? ' native-assurance__check-field' : ''}`);
    group.dataset.assuranceControl = key;
    const label = node(grouped ? 'legend' : 'label', labelOverride ?? metadata.label);
    const longText = ['context', 'reviewBoundary', 'assumptions', 'response', 'observation'].includes(key.split('.').at(-1));
    const input = node(grouped ? 'ul' : choices[key] || metadata.source || metadata.choices && !metadata.checkbox ? 'select' : longText ? 'textarea' : 'input');
    input.id = `${instance}-${++sequence}`; input.name = key; input.dataset.assuranceField = key; label.htmlFor = input.id;
    if (grouped) input.className = radio ? 'native-assurance__exclusive' : 'native-assurance__choices';
    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
      if (input.tagName === 'INPUT') input.type = metadata.checkbox ? 'checkbox' : 'text';
      input.maxLength = metadata.maxLength; if (metadata.numeric || metadata.decimal) { input.inputMode = metadata.decimal ? 'decimal' : 'numeric'; input.spellcheck = false; }
    }
    const error = node('p', '', 'native-coordination__error'); error.id = input.id + '-error'; input.setAttribute('aria-describedby', error.id);
    group.append(label);
    if ((metadata.numeric || metadata.decimal) && key !== 'sigmaHalfSteps') {
      const stepper = node('div', undefined, 'native-coordination__stepper');
      stepper.append(input, ...[-1, 1].map(direction => {
      const step = button(direction < 0 ? '−' : '+', 'step', { assuranceField: key, assuranceStep: String(direction) });
      step.setAttribute('aria-label', `${direction < 0 ? 'Decrease' : 'Increase'} ${(labelOverride ?? metadata.label).toLowerCase()}`); return step;
      })); group.append(stepper);
    } else group.append(input);
    if (metadata.source && targets[metadata.source]) {
      const kind = targets[metadata.source], create = node('button', `Add ${kind === 'person' ? 'a person' : kind === 'team' ? 'a team' : 'a working session'}`, 'native-control--create');
      create.type = 'button'; create.classList.add('native-control--navigate'); Object.assign(create.dataset, { nativeCreate: kind, nativeReturn: 'assurance', nativeReturnField: key }); group.append(actionRow(create));
    }
    group.append(error); parent.append(group); const control = { input, metadata, key, group, error, radio }; controls.set(key, control); return control;
  }
  function selectionRail(parent, label, rows, kind) {
    const rail = node('fieldset', undefined, 'native-assurance__selection'), legend = node('legend', label), choices = node('div', undefined, 'native-assurance__rail');
    const items = new Map(); rail.append(legend, choices); parent.append(rail);
    for (const row of rows) {
      const choice = node('label'), radio = node('input'), text = node('span'), status = node('small');
      choice.dataset.assurancePad = row.id; choice.dataset.studioPad = `${kind}:${row.id}`;
      radio.type = 'radio'; radio.name = `${instance}-${kind}`; radio.value = row.id; radio.dataset.assuranceSelection = kind;
      text.append(node('strong', row.label ?? row.name), status); choice.append(radio, text); choices.append(choice); items.set(row.id, { radio, status, choice });
    }
    return items;
  }
  function module(title, className = '') {
    const region = node('section', undefined, `native-quality-module ${className}`.trim());
    region.append(node('h5', title)); return region;
  }
  const qualityGrid = node('div', undefined, 'native-assurance__assumptions');
  const qualityAssumptions = node('section'); qualityAssumptions.dataset.assuranceAssumptions = '';
  qualityAssumptions.append(qualityGrid); elements.quality.append(qualityAssumptions);
  const referenceModule = module('Reference horizon'); qualityGrid.append(referenceModule);
  field(referenceModule, 'sourcePresetId');
  const horizon = node('div', undefined, 'native-assurance__horizon'); referenceModule.append(horizon);
  field(horizon, 'horizonUnit'); field(horizon, 'horizonQuantity'); field(referenceModule, 'qualityIncluded');
  const effortModule = module('Effort and rates'); qualityGrid.append(effortModule);
  const quantities = node('div', undefined, 'native-assurance__quantities'); effortModule.append(quantities);
  for (const key of ['namedUnknowns', 'allocationPercent', 'independentRate', 'qualityAdditionalPercent', 'recoveryAdditionalPercent']) field(quantities, key);
  const recoveryModule = module('Recovery participants'); qualityGrid.append(recoveryModule);
  field(recoveryModule, 'recoveryRatePersonIds');
  const sourceReading = node('details'); sourceReading.append(node('summary', 'Read the source scenario')); const sourceBody = node('div'); sourceReading.append(sourceBody); referenceModule.append(sourceReading);
  const estimates = module('Estimated effort', 'native-quality-module--reading'); estimates.dataset.assuranceEstimates = ''; qualityGrid.append(estimates);
  const instrument = node('section', undefined, 'native-quality-rack'); instrument.setAttribute('aria-label', 'Arrange quality and recovery');
  const reels = node('div', undefined, 'native-quality-rack__reels');
  const beforeReel = createReel(document, { label: 'Before release', choices: QUALITY_REELS.before, value: exploration.before,
    variant: 'teal', onSelect: id => configure({ before: id }) });
  const afterReel = createReel(document, { label: 'After release', choices: QUALITY_REELS.after, value: exploration.after,
    variant: 'cobalt', secondary: true, onSelect: id => configure({ after: id }) });
  reels.append(beforeReel.element, afterReel.element); instrument.append(reels);
  const faders = node('div', undefined, 'native-quality-rack__faders'), faderControls = new Map();
  instrument.append(faders); elements.fields.prepend(instrument);
  const board = node('div', undefined, 'native-quality-board'), lanes = new Map();
  for (const phase of QUALITY_PHASES) {
    const lane = node('section', undefined, 'native-quality-board__lane'); lane.dataset.qualityPhase = phase.id;
    lane.append(node('h4', phase.label), node('p', phase.description)); lanes.set(phase.id, lane); board.append(lane);
  }
  elements.concepts.append(board);
  const rehearsalCheckRail = node('div', undefined, 'native-assurance__rail'); lanes.get('rehearse').append(rehearsalCheckRail);
  const conceptChoices = new Map([
    ...selectionRail(lanes.get('prepare'), 'Preparation checks', concepts.filter(row => QUALITY_REELS.before.some(choice => choice.id === row.id)), 'concept'),
    ...selectionRail(lanes.get('operate'), 'Operating checks', concepts.filter(row => QUALITY_REELS.after.some(choice => choice.id === row.id)), 'concept'),
  ]);
  const phaseRails = { prepare: lanes.get('prepare').querySelector('.native-assurance__rail'), rehearse: rehearsalCheckRail, operate: lanes.get('operate').querySelector('.native-assurance__rail') };
  const conceptDisclosure = node('details', undefined, 'native-quality-drilldown');
  conceptDisclosure.append(node('summary', 'Quality check settings'));
  const conceptInspector = node('div'); conceptInspector.dataset.assuranceConceptInspector = ''; conceptDisclosure.append(conceptInspector); elements.concepts.append(conceptDisclosure);
  const consequence = node('section', undefined, 'native-assurance__consequence'); consequence.dataset.assuranceConsequence = ''; elements.concepts.append(consequence);
  const consequenceDetails = node('details', undefined, 'native-quality-comparison');
  consequenceDetails.append(node('summary', 'Compare support and investment'), consequence); conceptDisclosure.append(consequenceDetails);
  for (const concept of concepts) {
    const details = node('section', undefined, 'native-assurance__card'); details.dataset.assuranceConcept = concept.id;
    const summary = node('h5', concept.label), body = node('div', undefined, 'native-quality-check');
    field(body, `concept.${concept.id}.included`); field(body, `concept.${concept.id}.workIds`);
    const links = actionRow(); body.append(links, actionRow(button('Plan supporting work', 'propose', { assuranceTarget: `concept/${concept.id}`, assuranceLabel: concept.label })));
    details.append(summary, body); conceptInspector.append(details); cards.set(`concept/${concept.id}`, { details, summary, links, label: concept.label });
  }
  const sigmaControl = node('div', undefined, 'native-quality-rack__channel native-quality-rack__channel--sigma'), sigmaLabel = node('label', 'Sigma attention');
  const sigmaInput = node('input'); sigmaInput.type = 'range'; sigmaInput.min = '1'; sigmaInput.max = '6'; sigmaInput.step = '0.5'; sigmaInput.id = `${instance}-sigma`; sigmaInput.dataset.assuranceField = 'sigmaHalfSteps'; sigmaLabel.htmlFor = sigmaInput.id;
  const sigmaValue = node('output'); sigmaValue.setAttribute('for', sigmaInput.id);
  const sigmaScale = node('div', undefined, 'native-assurance__sigma-scale'); sigmaScale.setAttribute('aria-hidden', 'true');
  for (let value = 1; value <= 6; value += 1) sigmaScale.append(node('span', `${value}σ`));
  sigmaControl.append(sigmaLabel, sigmaValue, sigmaInput, sigmaScale); faders.append(sigmaControl);
  const sigmaSelect = field(referenceModule, 'sigmaHalfSteps', 'Choose sigma attention');
  sigmaSelect.input.setAttribute('aria-label', 'Choose sigma attention');
  const sigmaPlot = node('div', undefined, 'native-assurance__chart'), sigmaReading = node('p');
  const scope = node('section', undefined, 'native-assurance__scope'), scopeHead = node('div', undefined, 'native-assurance__scope-head');
  scopeHead.append(node('span', 'NORMAL REFERENCE / TWO-SIDED TAILS'));
  const scopeValue = node('strong'); scopeHead.append(scopeValue);
  scope.append(scopeHead, sigmaPlot); elements.statistics.append(scope, sigmaReading); instrument.append(elements.statistics);
  for (const definition of QUALITY_FADERS) {
    const channel = node('div', undefined, 'native-quality-rack__channel'), label = node('label', definition.label), value = node('output');
    const slider = node('input'); slider.type = 'range'; slider.min = '0'; slider.max = '4'; slider.step = '1'; slider.value = String(definition.value);
    slider.id = `${instance}-quality-${definition.id}`; slider.dataset.qualityFader = definition.id; label.htmlFor = slider.id; value.setAttribute('for', slider.id);
    const ends = node('div', undefined, 'native-quality-rack__ends'); ends.append(node('span', definition.low), node('span', definition.high));
    channel.append(label, value, slider, ends); faders.append(channel); faderControls.set(definition.id, { slider, value, channel, definition });
    listen(slider, 'input', () => configure({ [definition.id]: Number(slider.value) }, definition.id));
  }
  elements.events.append(node('h4', 'Prepare for recovery'), actionRow(button('Add a recovery event', 'add-event')));
  const eventList = node('div'); elements.events.append(eventList);
  elements.learning.append(node('h4', 'Turn a learning question into planned work'));
  const prompts = node('div'), promptLabel = node('label', 'Question to explore'), promptChoice = node('select'), promptReading = node('p');
  promptChoice.id = `${instance}-learning-question`; promptLabel.htmlFor = promptChoice.id;
  const planLearning = button('Plan this learning', 'learning');
  prompts.append(promptLabel, promptChoice, promptReading, actionRow(planLearning));
  const learningList = node('div'); elements.learning.append(prompts, learningList);
  listen(promptChoice, 'change', () => { if (!disposed && isActive()) { selectedPrompt = promptChoice.value; render(); } });
  elements.rehearsal.append(node('h4', 'Rehearse a professional complication'), node('p', 'Try a complication, then plan the response.'));
  const scenarioChoices = selectionRail(lanes.get('rehearse'), 'Try a complication', definitions, 'scenario');
  const rehearsalDisclosure = node('details', undefined, 'native-quality-drilldown'); rehearsalDisclosure.append(node('summary', 'Rehearsal settings'));
  elements.rehearsal.before(rehearsalDisclosure); rehearsalDisclosure.append(elements.rehearsal);
  const followThrough = node('details', undefined, 'native-quality-drilldown'); followThrough.append(node('summary', 'Recovery events and learning work'));
  elements.events.before(followThrough); followThrough.append(elements.events, elements.learning);
  const tracks = node('div', undefined, 'native-quality-tracks'); tracks.setAttribute('role', 'region'); tracks.setAttribute('aria-label', 'Quality work tracks'); tracks.tabIndex = 0;
  elements.concepts.insertBefore(tracks, conceptDisclosure);
  const workbench = node('section', undefined, 'native-quality-workbench');
  const settingsRail = node('div', undefined, 'native-quality-workbench__rail'); settingsRail.setAttribute('role', 'group'); settingsRail.setAttribute('aria-label', 'Quality settings');
  const panes = new Map([['checks', conceptDisclosure], ['rehearsal', rehearsalDisclosure], ['recovery', followThrough], ['illustration', elements.quality]]);
  const paneButtons = new Map();
  for (const [id, label] of [['checks', 'Quality check settings'], ['rehearsal', 'Rehearsal settings'], ['recovery', 'Recovery events and learning work'], ['illustration', 'Quality illustration']]) {
    const control = button(label, 'pane', { qualityPane: id }); control.setAttribute('aria-expanded', 'false');
    const pane = panes.get(id); pane.id = `${instance}-pane-${id}`; control.setAttribute('aria-controls', pane.id);
    settingsRail.append(control); paneButtons.set(id, control);
    if (pane.tagName === 'DETAILS') { pane.open = true; pane.querySelector(':scope > summary').hidden = true; }
  }
  const receiver = node('div', undefined, 'native-quality-workbench__receiver'); receiver.id = `${instance}-receiver`;
  const receiverHeader = mountRackHeader(receiver, { title: 'Quality settings', owner: 'Quality work tracks',
    closeAttribute: 'data-quality-close', applyAttribute: 'data-quality-apply',
    onClose: event => {
      event.stopPropagation(); const previous = activePane; proposalVisible = false; showPane(null); render();
      const entry = receiverEntry?.();
      const source = entry?.getClientRects().length ? entry : paneButtons.get(previous) ?? paneButtons.get('checks');
      source.focus({ preventScroll: true });
    } });
  receiver.append(...panes.values(), elements.work); workbench.append(settingsRail, receiver); tracks.after(workbench);
  function syncWorkbench() {
    const view = editor.read(), hasWork = view.draft?.raw['proposal.mode'] && view.draft.raw['proposal.mode'] !== 'none';
    elements.work.hidden = !hasWork || !proposalVisible;
    receiver.hidden = !activePane && elements.work.hidden;
    const title = activePane === 'checks' ? concepts.find(row => row.id === selectedConcept).label
      : activePane ? paneButtons.get(activePane).textContent : 'Supporting session';
    receiverHeader.update({ title, source: actions.get('apply') });
  }
  function showPane(id) {
    for (const control of localInstruments) control.release();
    activePane = id; if (id) proposalVisible = false;
    for (const [key, pane] of panes) { pane.hidden = key !== id; paneButtons.get(key).setAttribute('aria-expanded', String(key === id)); }
    syncWorkbench();
    for (const control of localInstruments) control.refresh();
  }
  showPane(null);
  const rehearsalGroups = new Map(), scenarioCards = new Map();
  for (const definition of definitions) {
    const card = node('section', undefined, 'native-assurance__card'); card.dataset.assuranceComplication = definition.id;
    card.append(node('h5', definition.name), node('p', definition.setup), node('p', definition.prompt));
    const assumptions = node('ul'); for (const assumption of definition.assumptions) assumptions.append(node('li', assumption));
    card.append(assumptions, actionRow(button('Prepare this rehearsal', 'rehearse', { assuranceDefinition: definition.id })));
    const records = node('div'); card.append(records); rehearsalGroups.set(definition.id, records); scenarioCards.set(definition.id, card); elements.rehearsal.append(card);
  }
  elements.work.append(node('h4', 'Propose the work people will do'));
  const workNote = node('p'), workFields = node('div', undefined, 'native-support-proposal native-quality-proposal'); elements.work.append(workNote, workFields);
  const sessionModule = module('Session and team', 'native-quality-proposal__identity');
  const modeFields = node('div', undefined, 'native-support-proposal__metadata');
  field(modeFields, 'proposal.mode'); const existingWork = field(modeFields, 'proposal.existingWorkId');
  const identityFields = node('div', undefined, 'native-support-proposal__metadata');
  for (const key of ['label', 'teamId']) field(identityFields, `proposal.${key}`);
  sessionModule.append(modeFields, identityFields); workFields.append(sessionModule);
  const participantModule = module('Participants'); field(participantModule, 'proposal.personIds');
  const time = createTimeControls(document, { idPrefix: `${instance}-proposal`, fieldPrefix: 'proposal.',
    decorateField(input, key) { input.dataset.assuranceField = key; },
    decorateStep(button, key, direction) { Object.assign(button.dataset, { assuranceAction: 'step', assuranceField: key, assuranceStep: String(direction) }); } });
  for (const [key, control] of time.controls) controls.set(key, { ...control, metadata: assuranceField(key) });
  const peopleAndFunding = node('div', undefined, 'native-quality-proposal__people');
  const fundingModule = module('Funding'); field(fundingModule, 'proposal.funding'); peopleAndFunding.append(participantModule, fundingModule);
  workFields.append(time.element, peopleAndFunding);
  const workPreview = node('p', undefined, 'native-quality-proposal__reading'); workPreview.dataset.assuranceWorkPreview = ''; workFields.append(workPreview, actionRow(button('Set this session proposal aside', 'clear-work')));
  const durationDials = mountDurationDials({ ...time, read() {
    const view = editor.read(), active = editing.read().active;
    return { token: view.draft?.token, hours: view.draft?.raw['proposal.hoursPerSession'], minutes: view.draft?.raw['proposal.minutesPerSession'], composing,
      errors: { hours: view.draft?.errors.some(error => error.path === 'draft.proposal.hoursPerSession'), minutes: view.draft?.errors.some(error => error.path === 'draft.proposal.minutesPerSession') },
      enabled: !disposed && !composing && isActive() && proposalVisible && activePane === null && view.status === 'editing' && view.draft?.raw['proposal.mode'] !== 'none'
        && active?.kind === 'assurance' && active.token === view.draft.token };
  }, write(token, field, value) { const epoch = ++generation; changed(editor.setText(token, 'proposal.' + field, value), epoch); } });
  const rateControls = mountRateControls({ host: controls.get('independentRate').group, precision: controls.get('independentRate').input, label: 'Independent quality hourly rate',
    read() {
      const view = editor.read(), active = editing.read().active, raw = view.draft?.raw.independentRate;
      const valid = raw?.trim() && !view.draft?.errors.some(error => error.path === 'draft.independentRate');
      return { token: view.draft?.token, raw, cents: valid ? Math.round(Number(raw) * 100) : null,
        enabled: !disposed && !composing && isActive() && activePane === 'illustration' && view.status === 'editing'
          && active?.kind === 'assurance' && active.token === view.draft?.token };
    }, write(token, value) { const epoch = ++generation; changed(editor.setText(token, 'independentRate', value), epoch); } });
  localInstruments.push(durationDials, rateControls);

  function configure(patch, channel = null, sigma = null) {
    const view = editor.read(); if (disposed || !isActive() || view.status !== 'editing' || !view.draft) return;
    exploration = { ...exploration, ...patch };
    if (channel === 'compliance') exploration.before = exploration.compliance >= 3 ? 'security-privacy' : 'independent-review';
    if (channel === 'fidelity') exploration.before = exploration.fidelity >= 3 ? 'data-model-quality' : 'acceptance-criteria';
    if (channel === 'training') exploration.after = exploration.training >= 3 ? 'post-release-learning' : 'reconciliation-replay';
    if (channel === 'urgency') exploration.before = exploration.urgency >= 3 ? 'risk-based-testing' : 'release-readiness';
    if (channel === 'quality') exploration.before = exploration.quality >= 3 ? 'independent-review' : 'acceptance-criteria';
    const halfSteps = sigma ?? Number(view.draft.raw.sigmaHalfSteps);
    if (sigma !== null) {
      exploration.before = halfSteps >= 9 ? 'independent-review' : halfSteps >= 6 ? 'risk-based-testing' : 'acceptance-criteria';
      exploration.after = halfSteps >= 8 ? 'reconciliation-replay' : 'observability';
    }
    const arrangement = qualityArrangement(exploration, halfSteps), included = new Set(arrangement.included), raw = view.draft.raw;
    selectedConcept = patch.after ? arrangement.after : arrangement.before; selectedScenario = arrangement.definitionId;
    const definition = definitions.find(row => row.id === arrangement.definitionId);
    const prefix = 'explore-' + definition.id;
    let recordId = prefix, suffix = 1;
    while (raw.rehearsalIds.includes(recordId) && raw[`rehearsal.${recordId}.observation`]?.trim()) recordId = `${prefix}-${suffix++}`;
    const example = qualityRehearsalExample(definition, arrangement, view.projection.state);
    const entries = concepts.map(row => [`concept.${row.id}.included`, included.has(row.id) ? 'yes' : 'no']);
    entries.push(['allocationPercent', String(arrangement.allocationPercent)],
      ['rehearsalIds', raw.rehearsalIds.includes(recordId) ? raw.rehearsalIds : [...raw.rehearsalIds, recordId]],
      ...Object.entries(example).map(([key, value]) => [`rehearsal.${recordId}.${key}`, value]));
    if (sigma !== null) entries.push(['sigmaHalfSteps', String(sigma)]);
    instrument.dataset.qualityArrival = channel ?? (patch.before ? 'before' : 'after');
    edit(entries);
    if (channel === null) revealReelResult(board);
  }
  function renderTracks(raw, state) {
    const focused = tracks.contains(document.activeElement) ? { ...document.activeElement.dataset } : null;
    const work = state.work.filter(row => row.lifecycle !== 'retired');
    const table = node('table'), caption = node('caption', 'Connect checks to working sessions');
    const head = node('thead'), headings = node('tr');
    for (const label of ['Quality check', 'In this plan', ...work.map(row => row.label), 'New work']) {
      const th = node('th', label); th.scope = 'col'; headings.append(th);
    }
    head.append(headings); const body = node('tbody');
    for (const concept of concepts) {
      const row = node('tr'), title = node('th'); title.scope = 'row';
      const inspect = button(concept.label, 'inspect-concept', { assuranceConceptId: concept.id });
      inspect.classList.add('native-control--navigate', 'studio-track-key');
      inspect.dataset.studioEntryKey = `quality:${concept.id}`; inspect.setAttribute('aria-controls', receiver.id); inspect.setAttribute('aria-expanded', String(activePane === 'checks' && concept.id === selectedConcept));
      inspect.setAttribute('aria-pressed', String(activePane === 'checks' && concept.id === selectedConcept)); title.append(inspect);
      const included = raw[`concept.${concept.id}.included`] === 'yes', stateCell = node('td');
      const locked = included && Boolean(constraints.required[concept.id]);
      const pad = button(locked ? '◆ Included' : included ? 'Included' : 'Available', 'toggle-concept', { assuranceConceptId: concept.id });
      pad.className = 'native-quality-tracks__pad'; pad.setAttribute('aria-pressed', String(included));
      pad.setAttribute('aria-label', `${concept.label}: ${included ? 'included' : 'available'}`); pad.disabled = locked;
      stateCell.append(pad);
      if (locked) { const cue = node('small', constraints.required[concept.id], 'native-quality-lock'); stateCell.append(cue); }
      row.append(title, stateCell);
      const workIds = raw[`concept.${concept.id}.workIds`] ?? [];
      for (const session of work) {
        const cell = node('td'), linked = workIds.includes(session.id);
        const pad = button(linked ? 'Linked' : 'Link', 'link-work', { assuranceConceptId: concept.id, assuranceWork: session.id });
        pad.className = 'native-quality-tracks__pad'; pad.setAttribute('aria-pressed', String(linked));
        pad.setAttribute('aria-label', `${concept.label}: ${linked ? 'unlink' : 'link'} ${session.label}`); cell.append(pad); row.append(cell);
      }
      const create = node('td'), add = button('Plan session', 'propose', { assuranceTarget: `concept/${concept.id}`, assuranceLabel: concept.label });
      add.classList.add('native-control--create'); create.append(add); row.append(create); body.append(row);
    }
    table.append(caption, head, body); tracks.replaceChildren(table);
    if (focused) [...tracks.querySelectorAll('button')].find(control => control.dataset.assuranceAction === focused.assuranceAction
      && control.dataset.assuranceConceptId === focused.assuranceConceptId && control.dataset.assuranceTarget === focused.assuranceTarget
      && control.dataset.assuranceWork === focused.assuranceWork)?.focus({ preventScroll: true });
  }
  function addRecordCard(kind, id, raw) {
    const key = `${kind}/${id}`;
    if (cards.has(key)) {
      if (kind === 'rehearsal') { const parent = rehearsalGroups.get(raw[`rehearsal.${id}.definitionId`]); const card = cards.get(key); if (parent && card.details.parentElement !== parent) parent.append(card.details); }
      return;
    }
    const details = node('details', undefined, 'native-assurance__card'); details.dataset[`assurance${kind[0].toUpperCase() + kind.slice(1)}`] = id;
    const summary = node('summary'), body = node('div', undefined, 'native-quality-record'), prefix = `${kind}.${id}.`;
    const keys = kind === 'event' ? ['label', 'included', 'lifecycle', 'eventCount', 'aggregateMinutesPerEvent', 'receiverPersonId', 'reviewBoundary', 'workIds']
      : kind === 'learning' ? ['context', 'decisionOwnerPersonId', 'reviewBoundary', 'workIds']
        : ['context', 'assumptions', 'response', 'reviewerPersonId', 'workIds', 'connectionIds', 'personIds'];
    const recordFields = node('div', undefined, 'native-quality-record__fields');
    const narrative = node('div', undefined, 'native-quality-story');
    const edits = node('details', undefined, 'native-quality-story__edit'); edits.append(node('summary', 'Edit this example'));
    if (kind === 'rehearsal') body.append(narrative, edits);
    body.append(recordFields);
    for (const name of keys) field(kind === 'rehearsal' && ['context', 'assumptions', 'response'].includes(name) ? edits : recordFields, prefix + name);
    const links = actionRow(); body.append(links, actionRow(button(kind === 'rehearsal' ? 'Plan response work' : 'Plan supporting work', 'propose', { assuranceTarget: key })));
    const comparison = node('section', undefined, 'native-assurance__consequence'); comparison.dataset.assuranceScenarioComparison = id;
    if (kind === 'rehearsal') body.append(comparison);
    if (kind === 'rehearsal') {
      body.append(actionRow(button('Pause selected connections in this proposal', 'pause-connections', { assuranceRecord: id }), button('Keep selected connections as accepted', 'keep-connections', { assuranceRecord: id })));
      // Imported observations remain readable; the showcase focuses on trying the response.
      const evidence = node('p', '', 'native-quality-observation'); evidence.dataset.assuranceObservation = id; evidence.tabIndex = -1; body.append(evidence);
    }
    details.append(summary, body);
    (kind === 'event' ? eventList : kind === 'learning' ? learningList : rehearsalGroups.get(raw[prefix + 'definitionId'])).append(details);
    cards.set(key, { details, summary, links, comparison, narrative });
  }
  function supportReading(reading, workIds, title, plan) {
    const summary = summarizeAssuranceWork(reading, workIds), section = node('section', undefined, 'native-assurance__effect');
    section.append(node('h6', title));
    if (!summary.rows.length) { section.append(node('p', 'Choose a supporting session to make the people, effort and investment explicit.')); return section; }
    section.append(metrics([['Participant effort', `${summary.personMinutes} person-minutes`], ['Attributed session cost', attributedAmount(summary)],
      ['Within funded time', attributedAmount(summary.allocated)], ['Extra work', attributedAmount(summary.additional)]]));

    const list = node('ul', undefined, 'native-assurance__work-reading');
    for (const row of summary.rows) {
      const item = node('li'); item.dataset.assuranceConsequenceWork = row.workId;
      const names = row.personIds.map(id => plan.people.find(person => person.id === id)?.label ?? id);
      const accepted = studio.read().state.work.some(work => work.id === row.workId);
      item.append(button(accepted ? `Inspect ${row.label}` : `Edit proposal: ${row.label}`, accepted ? 'work' : 'proposal-settings', { assuranceWork: row.workId }),
        node('p', `${names.join(', ') || 'Choose participants'}. ${row.minutesPerOccurrence} minutes per person × ${row.occurrences} sessions = ${row.personMinutes} person-minutes. ${row.funding === 'additional' ? 'Extra investment' : 'Within funded time'} · ${row.status}${row.lifecycle === 'retired' ? ' · retired' : ''}.`));
      list.append(item);
    }
    section.append(list); return section;
  }
  function attributedAmount(summary) {
    return summary.lineAmountStatus === 'outside-display-range' ? 'Inspect individual session amounts'
      : `${money(summary.knownLineCents)}${summary.totalLineCents === null ? ' known; choose missing hourly rates to complete it' : ''}`;
  }
  function metrics(values) {
    const list = node('dl', undefined, 'native-assurance__metrics');
    for (const [label, value] of values) { const item = node('div'); item.append(node('dt', label), node('dd', value)); list.append(item); }
    return list;
  }
  function investmentReading(projected) {
    const section = node('section', undefined, 'native-assurance__investment'); section.dataset.assuranceConsequenceInvestment = '';
    const accepted = projected.accepted.investment, proposed = projected.proposed?.investment;
    const values = [[accepted.totalCents === null ? 'Known accepted investment' : 'Accepted investment', money(accepted.knownCents)]];
    if (proposed) values.push([proposed.totalCents === null ? 'Known proposed investment' : 'Proposed investment', money(proposed.knownCents)],
      [projected.change.money.totalDeltaCents === null ? 'Change in known investment' : 'Investment change', money(projected.change.money.knownDeltaCents)]);
    section.append(metrics(values));
    const adjustments = (proposed ?? accepted).lineRoundingAdjustments;
    if (adjustments.allocatedCents || adjustments.additionalCents) section.append(node('p', `The complete ${proposed ? 'proposed' : 'accepted'} plan settles its funding pools after summing unrounded work. Compared with individually rounded session lines, its rounding adjustment is ${money(adjustments.allocatedCents)} within funded time and ${money(adjustments.additionalCents)} for extra investment. This explains a difference between line attribution and settled investment.`));
    return section;
  }
  function preparationStanding(concept) {
    const selection = concept.included ? 'Selected for preparation.' : 'Available to select for preparation.';
    return `${selection} ${concept.activeWorkIds.length ? 'Planned supporting sessions are linked.' : concept.workIds.length ? 'Linked sessions currently supply no active planned effort.' : 'Link the work people will do.'}`;
  }
  function renderConsequences(view, preview) {
    const projected = projectAssuranceConsequences(view.projection, preview?.ok && view.draft?.changed ? preview : null);
    const current = projected.proposed ?? projected.accepted, plan = projected.proposed ? preview.projection.state : view.projection.state;
    const concept = current.concepts.find(row => row.conceptId === selectedConcept), acceptedConcept = projected.accepted.concepts.find(row => row.conceptId === selectedConcept);
    consequence.dataset.assuranceEffect = projected.proposed ? 'proposed' : 'accepted';
    consequence.replaceChildren(node('h5', `${concept.label}: planned consequences`),
      node('p', projected.proposed ? 'Proposed support before Apply.' : `Accepted support.${view.draft?.changed ? ' Correct the unfinished entries to compare the complete proposal.' : ''}`),
      node('p', `${preparationStanding(concept)} Linked sessions retain their own effort and funding when this choice changes.`));
    const grid = node('div', undefined, 'native-assurance__effect-grid');
    grid.append(supportReading(projected.accepted, acceptedConcept.workIds, 'Accepted preparation', view.projection.state));
    if (projected.proposed) grid.append(supportReading(current, concept.workIds, 'Proposed preparation', plan));
    consequence.append(grid, investmentReading(projected));
    if (selectedConcept === 'reconciliation-replay') consequence.append(node('p', concept.included
      ? 'Reconciliation and replay is selected for preparation. Rehearse an interruption to examine the remaining recovery assumptions.'
      : 'Reconciliation and replay is deferred. Explore the authored condition that the current instructions cannot resume an interrupted task.'),
      actionRow(button('Explore the recovery scenario', 'scenario', { assuranceDefinition: 'recovery-failure' })));
    consequence.append(node('p', `The quality reference illustration is ${plan.assuranceSettings.quality.included ? 'enabled' : 'switched off'}; selected concepts and their working sessions retain their own state.`),
      node('p', 'Session costs attribute the existing ledger to this work. The overall investment and proposal change retain the complete plan’s accounting. Quality reference estimates remain separate.'));
    for (const [key, card] of cards) {
      if (!key.startsWith('rehearsal/')) continue;
      const id = key.slice('rehearsal/'.length), rehearsal = current.rehearsals.find(row => row.id === id);
      card.comparison.hidden = !rehearsal || rehearsal.definitionId !== 'recovery-failure' || rehearsal.definitionVersion !== '1.0.0';
      if (card.comparison.hidden) continue;
      const preparation = current.concepts.find(row => row.conceptId === 'reconciliation-replay');
      card.comparison.dataset.assuranceEffect = projected.proposed ? 'proposed' : 'accepted';
      const comparison = node('div', undefined, 'native-assurance__effect-grid');
      comparison.append(supportReading(current, preparation.workIds, 'Preparation: reconciliation and replay', plan), supportReading(current, rehearsal.workIds, 'Response to the authored interruption', plan));
      const union = summarizeAssuranceWork(current, [...preparation.workIds, ...rehearsal.workIds]);
      const shared = preparation.workIds.filter(id => rehearsal.workIds.includes(id));
      card.comparison.replaceChildren(node('h5', `${projected.proposed ? 'Proposed' : 'Accepted'} preparation and response`),
        node('p', `${preparationStanding(preparation)} The authored interruption assumes the current instructions cannot resume the task.`),
        node('p', `Assumptions to try: ${rehearsal.assumptions || 'Describe the conditions for this rehearsal above.'}`, 'native-assurance__assumptions-reading'), comparison,
        node('p', `Combined linked work: ${union.personMinutes} person-minutes; ${attributedAmount(union)} attributed session cost. Shared sessions enter this combined reading once.${shared.length ? ` Shared work: ${shared.map(id => current.work.find(row => row.workId === id).label).join(', ')}.` : ''}`),
        investmentReading(projected),
        node('p', 'The response session’s participants, minutes, occurrences and funding are the numeric assumptions for this scenario. Edit them in Plan response work before Apply. An observed rehearsal result records what a named person established; the normal reference curve supplies a separate mathematical illustration.'),
        node('p', 'Recovery rehearsal scenario · recovery-failure · version 1.0.0.'),
        actionRow(button('Inspect preparation', 'preparation')));
    }
  }
  function renderSigma(reading) {
    scopeValue.textContent = `Threshold ±${reading.sigma}σ`;
    if (renderedSigma !== reading.sigma) {
      const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 700 310'); svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `Centered normal reference with thresholds at minus and plus ${reading.sigma} sigma`);
      const shape = (tag, attributes) => { const child = document.createElementNS(ns, tag); for (const [name, value] of Object.entries(attributes)) child.setAttribute(name, value); svg.append(child); return child; };
      const defs = document.createElementNS(ns, 'defs'), pattern = document.createElementNS(ns, 'pattern'), hatch = document.createElementNS(ns, 'path');
      pattern.id = `${instance}-sigma-tail`; pattern.setAttribute('patternUnits', 'userSpaceOnUse'); pattern.setAttribute('width', '8'); pattern.setAttribute('height', '8');
      hatch.setAttribute('d', 'M-2 2L2 -2M0 8L8 0M6 10L10 6'); hatch.setAttribute('stroke', 'currentColor'); hatch.setAttribute('stroke-width', '1.5'); pattern.append(hatch); defs.append(pattern); svg.append(defs);
      for (const region of reading.regions) shape('rect', { x: region.x, y: 20, width: region.width, height: 255, class: 'native-assurance__sigma-region' });
      shape('path', { d: reading.leftTailPath, fill: `url(#${instance}-sigma-tail)`, class: 'native-assurance__sigma-tail' }); shape('path', { d: reading.rightTailPath, fill: `url(#${instance}-sigma-tail)`, class: 'native-assurance__sigma-tail' });
      for (let index = 0; index < 24; index += 1) {
        const ion = shape('circle', { cx: 65 + index * 25, cy: 245 - (index % 5) * 37, r: 1.5 + index % 3, class: 'native-quality-ion', 'aria-hidden': 'true' });
        ion.style.setProperty('--ion-delay', `${-(index % 7) * .41}s`); ion.style.setProperty('--ion-drift', `${(index % 2 ? 1 : -1) * (10 + index % 4 * 7)}px`);
      }
      shape('path', { d: reading.curvePath, fill: 'none', class: 'native-assurance__sigma-curve' });
      shape('line', { x1: 45, y1: 275, x2: 655, y2: 275, class: 'native-assurance__sigma-axis' });
      for (const [side, point] of Object.entries(reading.thresholds)) {
        shape('line', { x1: point.x, y1: point.y, x2: point.x, y2: 275, class: 'native-assurance__sigma-threshold' });
        shape('text', { x: point.x, y: 298, 'text-anchor': 'middle' }).textContent = `${side === 'left' ? '−' : '+'}${reading.sigma}σ`;
      }
      sigmaPlot.replaceChildren(svg);
      renderedSigma = reading.sigma;
    }
    sigmaReading.textContent = `Authored illustration · ${{ calm: 'narrow reference tails', caution: 'wider reference tails', high: 'broad reference tails' }[constraints.pressure]}.`;
    scope.title = reading.basis;
  }
  function render() {
    const view = editor.read(); if (disposed) return view;
    if (lastProjection !== view.projection && !view.draft?.changed) exploration = restoreExploration(view.projection);
    const raw = view.draft?.raw ?? startingAssuranceRaw(view.projection.state.assuranceSettings), editable = view.status === 'editing';
    elements.fields.disabled = !editable; actions.get('apply').disabled = !editable || composing; actions.get('cancel').disabled = !view.draft;
    elements.recovery.hidden = !view.draft || !['stale', 'parked'].includes(view.status);
    elements.current.textContent = 'Review your saved quality, recovery, learning and rehearsal choices against the current plan.';
    for (const name of ['review', 'current', 'discard']) actions.get(name).disabled = !view.draft;
    root.dataset.assuranceState = view.status;
    const errors = view.draft?.errors ?? [], settings = assuranceSettingsFromRaw(raw, view.projection.state.assuranceSettings);
    const sigmaHalfSteps = Number(raw.sigmaHalfSteps), validSigma = Number.isInteger(sigmaHalfSteps) && sigmaHalfSteps >= 2 && sigmaHalfSteps <= 12;
    const fallback = validSigma ? { ...view.projection.state.assuranceSettings, quality: { ...view.projection.state.assuranceSettings.quality, sigmaHalfSteps } } : view.projection.state.assuranceSettings;
    let reading; try { reading = projectAssurance(errors.length ? fallback : settings, view.projection.state); }
    catch { reading = projectAssurance(view.projection.state.assuranceSettings, view.projection.state); }
    for (const [kind, list] of Object.entries(collectionKeys)) for (const id of raw[list]) addRecordCard(kind, id, raw);
    for (const [key, control] of controls) {
      const value = raw[key] ?? (control.metadata.kind === 'ids' ? [] : '');
      if (['SELECT', 'UL'].includes(control.input.tagName) && (lastProjection !== view.projection || !control.input.children.length)) populate(control, value);
      if (control.metadata.kind === 'ids' || control.radio) for (const checkbox of control.input.querySelectorAll('input')) checkbox.checked = control.radio ? checkbox.value === value : value.includes(checkbox.value);
      else if (control.metadata.checkbox) control.input.checked = value === 'yes'; else if (control.input.value !== value) control.input.value = value;
      const error = errors.find(error => error.path === `draft.${key}`); control.error.textContent = error?.message ?? ''; control.input.setAttribute('aria-invalid', String(Boolean(error)));
    }
    renderTimeReadout(time, raw, { errors, composing, fieldPrefix: 'proposal.', horizonWeeks: view.projection.state.horizonWeeks });
    durationDials.refresh();
    rateControls.refresh();
    lastProjection = view.projection;
    sigmaInput.value = String(reading.sigma.sigma); sigmaInput.setAttribute('aria-valuetext', `${reading.sigma.sigma} sigma attention`); sigmaValue.textContent = `${reading.sigma.sigma}σ`;
    sigmaControl.style.setProperty('--quality-level', `${(reading.sigma.sigma - 1) / 5 * 100}%`);
    beforeReel.select(exploration.before); afterReel.select(exploration.after);
    for (const [id, { slider, value, channel, definition }] of faderControls) {
      slider.value = String(exploration[id]); value.textContent = ['Low', 'Light', 'Balanced', 'High', 'Full'][exploration[id]];
      slider.setAttribute('aria-valuetext', `${value.textContent}: ${definition.low} to ${definition.high}`);
      channel.style.setProperty('--quality-level', `${exploration[id] / 4 * 100}%`);
    }
    constraints = qualityConstraints(exploration, reading.sigma.sigma * 2);
    instrument.dataset.qualityPressure = constraints.pressure; instrument.dataset.qualityExtreme = String(constraints.extreme);
    renderSigma(reading.sigma);
    for (const [key, card] of cards) {
      const [kind, id] = key.split('/'), present = kind === 'concept' || raw[collectionKeys[kind]].includes(id);
      card.details.hidden = !present || kind === 'concept' && id !== selectedConcept; if (!present) continue;
      const prefix = `${kind}.${id}.`, workIds = raw[prefix + 'workIds'] ?? [], labels = workIds.map(id => view.projection.state.work.find(row => row.id === id)?.label ?? id);
      const label = kind === 'concept' ? card.label : kind === 'event' ? raw[prefix + 'label'] || 'Name the recovery event' : kind === 'learning' ? getLearningPromptDefinition(raw[prefix + 'promptId'])?.label ?? 'Learning action' : 'Rehearsal response';
      card.summary.textContent = `${label}${kind === 'event' && raw[prefix + 'lifecycle'] === 'retired' ? ' · retired' : ''}${labels.length ? ` · ${labels.join(', ')}` : ' · choose supporting work'}`;
      if (kind === 'rehearsal') {
        card.narrative.replaceChildren(...['context', 'assumptions', 'response'].map(name => { const part = node('div'); part.append(node('h6', { context: 'Situation', assumptions: 'Assume', response: 'Try this response' }[name]), node('p', raw[prefix + name])); return part; }));
        const observation = card.details.querySelector('[data-assurance-observation]'); observation.textContent = raw[prefix + 'observation'] ?? ''; observation.hidden = !observation.textContent.trim();
      }
      card.links.replaceChildren(...workIds.map(id => button(`Inspect ${view.projection.state.work.find(row => row.id === id)?.label ?? id}`, 'work', { assuranceWork: id })));
    }
    for (const [id, choice] of conceptChoices) {
      choice.radio.checked = id === selectedConcept;
      const included = raw[`concept.${id}.included`] === 'yes', linked = raw[`concept.${id}.workIds`].length > 0;
      choice.radio.parentElement.dataset.included = String(included); choice.radio.parentElement.dataset.support = linked ? 'linked' : 'open';
      choice.status.textContent = included ? linked ? 'Work linked' : 'Included' : 'Available';
      const cue = constraints.required[id], locked = included && Boolean(cue);
      choice.choice.dataset.locked = String(locked);
      let note = choice.choice.querySelector('.native-quality-lock');
      if (!note) { note = node('small', '', 'native-quality-lock'); choice.status.after(note); }
      note.textContent = locked ? `◆ Kept in this illustration. ${cue}` : ''; note.hidden = !locked;
      const control = controls.get(`concept.${id}.included`); control.input.disabled = locked;
      control.input.title = locked ? cue : '';
    }
    const signature = JSON.stringify(constraints.phases);
    if (signature !== layoutSignature) {
      const placePads = () => { for (const [id, choice] of conceptChoices) phaseRails[constraints.phases[id]].append(choice.choice); };
      if (layoutSignature) animateRackChange(board, placePads); else placePads();
      layoutSignature = signature;
    }
    for (const [id, choice] of scenarioChoices) {
      choice.radio.checked = id === selectedScenario; scenarioCards.get(id).hidden = id !== selectedScenario;
      choice.status.textContent = raw.rehearsalIds.some(recordId => raw[`rehearsal.${recordId}.definitionId`] === id) ? 'Continue this rehearsal' : 'Explore this situation';
    }
    renderTracks(raw, view.projection.state);
    const nextPromptSignature = JSON.stringify(reading.learning);
    if (promptSignature !== nextPromptSignature) {
      promptChoice.replaceChildren(...reading.learning.map(prompt => { const option = node('option', prompt.label); option.value = prompt.promptId; return option; }));
      promptSignature = nextPromptSignature;
    }
    const prompt = reading.learning.find(row => row.promptId === selectedPrompt) ?? reading.learning[0];
    selectedPrompt = prompt?.promptId ?? null; prompts.hidden = !prompt;
    if (prompt) { promptChoice.value = prompt.promptId; promptReading.textContent = prompt.prompt; planLearning.dataset.assurancePrompt = prompt.promptId; }
    const estimateText = (name, estimate) => `${name}: ${estimate.status === 'known' ? `${hourText(estimate.hours)} · ${money(estimate.amountCents)}` : estimate.problems.join(' ')}`;
    estimates.replaceChildren(node('h5', 'Estimated effort'), node('p', estimateText('Quality illustration', reading.quality.estimate)), node('p', estimateText('Recovery illustration', reading.recovery.estimate)));
    const preset = reading.sourcePreset; sourceReading.hidden = !preset;
    if (preset) {
      const total = sourcePresetEstimate(preset.id); sourceBody.replaceChildren(node('p', `${preset.name}. ${preset.horizon.quantity} ${preset.horizon.unit}; ${preset.complexity} complexity. Source scenario investment: ${total.status === 'known' ? money(Math.round(total.central * 100)) : total.problems.join(' ')}.`));
      sourceBody.append(node('p', 'This source comparison retains its own staffing assumptions. The current plan keeps its people and working sessions.'));
    }
    const hasWork = raw['proposal.mode'] !== 'none'; workFields.hidden = !hasWork; existingWork.group.hidden = raw['proposal.mode'] !== 'update';
    workNote.textContent = hasWork ? `Supporting ${cards.get(raw['proposal.target'])?.summary.textContent ?? 'the selected purpose'}.` : 'Choose Plan supporting work beside a quality concept, recovery event, learning action or rehearsal.';
    const preview = editable && !composing ? editor.preview(view.draft.token) : null;
    if (disposed) return view;
    elements.error.textContent = view.error?.message ?? (preview && !preview.ok ? preview.error.message : '');
    if (preview?.ok) {
      const result = preview.projection.result, accepted = view.projection.result;
      elements.preview.textContent = `${result.plannedCommitmentCents === null ? 'Known proposed investment' : 'Proposed investment'}: ${money(result.knownCommitmentCents)}. ${accepted.plannedCommitmentCents === null ? 'Known accepted investment' : 'Accepted investment'}: ${money(accepted.knownCommitmentCents)}. Change: ${money(preview.summary.money.knownDeltaCents)}.${result.plannedCommitmentCents === null || accepted.plannedCommitmentCents === null ? ' Add missing hourly rates in People to complete these amounts.' : ''} Apply accepts the settings and proposed plan changes together.${preview.summary.updatedConnectionIds.length ? ` Proposed connection changes: ${preview.summary.updatedConnectionIds.map(id => { const row = preview.projection.state.connections.find(row => row.id === id); return `${row.sharedObject}: ${row.status}`; }).join('; ')}.` : ''}`;
      const row = preview.summary.work[0]; workPreview.textContent = row ? `${row.after.minutesPerOccurrence} minutes per person × ${row.after.participantCount} people × ${row.after.occurrences} occurrences = ${row.after.personMinutes} aggregate person-minutes. ${row.after.funding === 'additional' ? 'Extra investment' : 'Within funded time'}.` : '';
    } else { elements.preview.textContent = composing ? 'Finish entering the value.' : 'Review the entries before applying this proposal.'; workPreview.textContent = ''; }
    renderConsequences(view, preview); syncWorkbench();
    return view;
  }
  function opened(result, epoch, focus) { if (!owns(epoch)) return result; composing = false; render(); if (!owns(epoch)) return result; announce(result.ok ? '' : result.error.message); onEditing(); if (owns(epoch) && focus) (editor.read().status === 'stale' ? actions.get('review') : sigmaInput).focus(); return result; }
  function open(target = 'assurance', focus = true) { if (disposed || !canOpen()) return; const epoch = ++generation; onBegin(); if (!owns(epoch)) return; return opened(editor.begin(target, studio.read()), epoch, focus); }
  function selectSupport(target) {
    if (disposed || !target || !['concept', 'rehearsal'].includes(target.kind)) return false;
    const before = editor.read(), known = target.kind === 'concept' ? conceptChoices.has(target.id)
      : before.draft?.raw.rehearsalIds.includes(target.id) || before.projection.state.assuranceSettings.rehearsals.some(row => row.id === target.id);
    if (!known) return false;
    const epoch = generation + 1, result = open('assurance', false); if (!result || !owns(epoch)) return false;
    const view = editor.read(), raw = view.draft?.raw, ownership = editing.read(), active = ownership.active;
    if (active?.kind !== 'assurance' && (active || view.status === 'editing')) return false;
    const retains = () => {
      const current = editing.read(); return owns(epoch) && current.intent === ownership.intent
        && (active ? current.active?.kind === active.kind && current.active?.token === active.token && current.active?.targetId === active.targetId : current.active === null);
    };
    if (target.kind === 'concept') { selectedConcept = target.id; showPane('checks'); }
    else {
      const definitionId = raw?.[`rehearsal.${target.id}.definitionId`] ?? view.projection.state.assuranceSettings.rehearsals.find(row => row.id === target.id)?.definitionId;
      if (!scenarioCards.has(definitionId)) return false; selectedScenario = definitionId; showPane('rehearsal');
    }
    render(); if (!retains()) return false;
    if (view.status !== 'editing') { actions.get('review').focus(); return true; }
    const card = cards.get(`${target.kind}/${target.id}`); if (!card || card.details.hidden) return false;
    if (target.kind === 'rehearsal') card.details.open = true;
    const observation = target.kind === 'rehearsal' && target.standing === 'observation' ? card.details.querySelector('[data-assurance-observation]:not([hidden])') : null;
    const control = controls.get(target.kind === 'concept' ? `concept.${target.id}.included` : `rehearsal.${target.id}.context`);
    const focus = observation ?? (control.input.disabled ? card.summary : control.input);
    if (!observation) for (let parent = focus.parentElement; parent && card.details.contains(parent); parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    if (focus === card.summary) focus.tabIndex = -1;
    focus.focus(); if (retains() && card.details.contains(document.activeElement)) card.details.scrollIntoView({ block: 'nearest' });
    return true;
  }
  function changed(result, epoch) { if (!owns(epoch)) return; render(); if (!owns(epoch)) return; announce(result.ok ? '' : result.error.message); onEditing(); }
  function edit(entries) {
    const view = editor.read(); if (!view.draft || view.status !== 'editing') return; const epoch = ++generation; let result;
    for (const [key, value] of entries) { result = editor[assuranceField(key)?.kind === 'ids' ? 'setIds' : 'setText'](view.draft.token, key, value); if (!result.ok || !owns(epoch)) break; }
    if (result) changed(result, epoch);
  }
  function addRecord(kind, values) {
    showPane(kind === 'rehearsal' ? 'rehearsal' : 'recovery');
    const raw = editor.read().draft.raw, list = collectionKeys[kind]; let sequence = 1; while (raw[list].includes(`${kind}-${sequence}`)) sequence += 1; const id = `${kind}-${sequence}`;
    edit([[list, [...raw[list], id]], ...Object.entries(values).map(([key, value]) => [`${kind}.${id}.${key}`, value])]);
    const card = cards.get(`${kind}/${id}`); if (!card) return null; card.details.open = kind !== 'event'; card.summary.focus(); return id;
  }
  function settle(method) {
    rateControls.release();
    const view = editor.read(); if (disposed || !view.draft) return; if (composing && method === 'apply') { announce('Finish entering the text, then apply.'); return; }
    const epoch = ++generation, result = editor[method](view.draft.token); if (!owns(epoch)) return;
    if (!result.ok) {
      if (method === 'apply' && editor.read().draft?.errors.some(error => qualityGrid.contains(controls.get(error.path.replace(/^draft\./, ''))?.input))) showPane('illustration');
      changed(result, epoch); return;
    }
    if (method === 'cancel') { proposalVisible = false; exploration = restoreExploration(studio.read()); opened(editor.begin('assurance', studio.read()), epoch, false); announce('Changes cancelled.'); return; }
    const accepted = result.projection ?? studio.read(); explorationBySettings.set(explorationKey(accepted), { ...exploration }); onAccepted(accepted); if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return;
    opened(editor.begin('assurance', accepted), epoch, false); if (owns(epoch)) {
      const targetKind = view.draft.raw['proposal.target'].split('/')[0];
      if (proposalVisible) showPane(targetKind === 'concept' ? 'checks' : targetKind === 'rehearsal' ? 'rehearsal' : 'recovery');
      announce('Quality, recovery and proposed work applied.'); focusSubmitControl(actions.get('apply')); }
  }
  function loadWork(id) {
    const work = studio.read().state.work.find(row => row.id === id); if (!work) return;
    edit([['proposal.existingWorkId', id], ['proposal.label', work.label], ['proposal.teamId', work.teamId ?? ''], ['proposal.personIds', [...work.personIds]],
      ['proposal.hoursPerSession', String(Math.floor(work.minutesPerOccurrence / 60))], ['proposal.minutesPerSession', String(work.minutesPerOccurrence % 60)], ['proposal.occurrences', String(work.occurrences)], ['proposal.funding', work.funding]]);
  }
  listen(root, 'click', event => {
    if (event.target.dataset.assuranceSelection) input({ type: 'change', target: event.target });
    const control = event.target.closest('[data-assurance-action]'); if (!control || !root.contains(control) || disposed || !isActive()) return;
    const action = control.dataset.assuranceAction; if (action === 'apply') return;
    if (action === 'cancel' || action === 'discard') { settle('cancel'); return; }
    const view = editor.read(); if (!view.draft) return;
    if (action === 'review' || action === 'current') { const epoch = ++generation; opened(editor[action === 'review' ? 'review' : 'useCurrent'](view.draft.token, studio.read()), epoch, true); return; }
    if (view.status !== 'editing') return;
    if (action === 'pane') { receiverEntry = captureRackEntry(control, root); showPane(activePane === control.dataset.qualityPane ? null : control.dataset.qualityPane); render(); return; }
    if (action === 'inspect-concept') { receiverEntry = captureRackEntry(control, root); selectSupport({ kind: 'concept', id: control.dataset.assuranceConceptId }); return; }
    if (action === 'toggle-concept') { const id = control.dataset.assuranceConceptId, key = `concept.${id}.included`; if (view.draft.raw[key] === 'yes' && constraints.required[id]) return; edit([[key, view.draft.raw[key] === 'yes' ? 'no' : 'yes']]); return; }
    if (action === 'link-work') { const key = `concept.${control.dataset.assuranceConceptId}.workIds`, id = control.dataset.assuranceWork, ids = view.draft.raw[key]; edit([[key, ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]]]); return; }
    if (action === 'preparation') { selectSupport({ kind: 'concept', id: 'reconciliation-replay' }); return; }
    if (action === 'scenario') {
      selectedScenario = control.dataset.assuranceDefinition; showPane('rehearsal'); render(); const card = scenarioCards.get(selectedScenario);
      if (card && !disposed) { const heading = card.querySelector('h5'); heading.tabIndex = -1; heading.focus(); } return;
    }
    if (action === 'proposal-settings') { proposalVisible = true; showPane(null); controls.get('proposal.label').input.focus(); return; }
    if (action === 'step') { const epoch = ++generation; changed(editor.step(view.draft.token, control.dataset.assuranceField, Number(control.dataset.assuranceStep)), epoch); return; }
    if (action === 'work') { onSourceWork(control.dataset.assuranceWork, { targetId: 'assurance' }); return; }
    if (action === 'add-event') { addRecord('event', { label: nextCreatedLabel(view.draft.raw.eventIds.map(id => ({ label: view.draft.raw[`event.${id}.label`] })), 'recovery event'), included: 'yes', lifecycle: 'active', eventCount: '1', aggregateMinutesPerEvent: '60', receiverPersonId: view.projection.state.people.find(row => /operations/i.test(row.label))?.id ?? '', reviewBoundary: 'Resume the saved request and confirm the next handoff.', workIds: [] }); return; }
    if (action === 'learning') { addRecord('learning', { promptId: control.dataset.assurancePrompt, context: 'Use the pilot walkthrough to find the next improvement.', decisionOwnerPersonId: view.projection.state.people[0]?.id ?? '', reviewBoundary: 'Review the finding before the next working session.', workIds: [] }); return; }
    if (action === 'rehearse') {
      const definition = listRehearsalDefinitions().find(row => row.id === control.dataset.assuranceDefinition);
      addRecord('rehearsal', qualityRehearsalExample(definition, qualityArrangement(exploration), studio.read().state)); return;
    }
    if (action === 'keep-connections') {
      const ids = view.draft.raw[`rehearsal.${control.dataset.assuranceRecord}.connectionIds`]; edit([['connectionUpdateIds', view.draft.raw.connectionUpdateIds.filter(id => !ids.includes(id))]]); return;
    }
    if (action === 'pause-connections') {
      const ids = view.draft.raw[`rehearsal.${control.dataset.assuranceRecord}.connectionIds`];
      edit([['connectionUpdateIds', [...new Set([...view.draft.raw.connectionUpdateIds, ...ids])]], ...ids.map(id => [`connection.${id}.status`, 'paused'])]);
      announce(ids.length ? 'Selected connections will pause when you apply this proposal. Their supporting work remains in the plan.' : 'Choose the connections involved before proposing a pause.'); return;
    }
    if (action === 'clear-work') { proposalVisible = false; edit([['proposal.mode', 'none']]); return; }
    if (action === 'propose') {
      receiverEntry = captureRackEntry(control, root); proposalVisible = true; showPane(null);
      if (view.draft.raw['proposal.mode'] !== 'none') { syncWorkbench(); controls.get('proposal.label').input.focus(); announce('Continue the current session proposal, or set it aside to choose another purpose.'); return; }
      const target = control.dataset.assuranceTarget, [kind, id] = target.split('/');
      const label = control.dataset.assuranceLabel ?? (kind === 'event' ? view.draft.raw[`event.${id}.label`] : kind === 'learning' ? getLearningPromptDefinition(view.draft.raw[`learning.${id}.promptId`])?.label : 'Rehearsal response');
      edit([['proposal.target', target], ['proposal.label', label], ['proposal.mode', 'new']]); controls.get('proposal.label').input.focus();
    }
  });
  function input(event) {
    const selection = event.target.dataset.assuranceSelection;
    if (selection) {
      if (event.type !== 'change' || disposed || !isActive() || editor.read().status !== 'editing' || !event.target.checked) return;
      if (selection === 'concept' && conceptChoices.has(event.target.value)) { receiverEntry = captureRackEntry(event.target, root); selectedConcept = event.target.value; showPane('checks'); }
      if (selection === 'scenario' && scenarioChoices.has(event.target.value)) { receiverEntry = captureRackEntry(event.target, root); selectedScenario = event.target.value; showPane('rehearsal'); }
      render(); return;
    }
    const key = event.target.dataset.assuranceField, control = controls.get(key), view = editor.read();
    if (disposed || !isActive() || !control || !view.draft || view.status !== 'editing') return;
    const range = event.target === sigmaInput;
    if (!range && control.input !== event.target && !((control.metadata.kind === 'ids' || control.radio) && control.input.contains(event.target))) return;
    if (event.type === 'input' && (control.input.tagName === 'SELECT' || control.metadata.checkbox || control.metadata.kind === 'ids' || control.radio) && !range
      || event.type === 'change' && control.input.tagName !== 'SELECT' && !control.metadata.checkbox && control.metadata.kind !== 'ids' && !control.radio) return;
    if (control.metadata.kind === 'ids') {
      const chosen = new Set([...control.input.querySelectorAll('input:checked')].map(row => row.value));
      edit([[key, [...view.draft.raw[key].filter(id => chosen.has(id)), ...chosen].filter((id, index, ids) => ids.indexOf(id) === index)]]);
    } else {
      const value = range ? String(Number(event.target.value) * 2) : control.metadata.checkbox ? control.input.checked ? 'yes' : 'no' : event.target.value;
      if (key === 'sourcePresetId') { const preset = getSourcePreset(value); edit([[key, value], ...(preset ? [['horizonQuantity', String(preset.horizon.quantity)], ['horizonUnit', preset.horizon.unit], ['namedUnknowns', String(preset.namedUnknowns)]] : [])]); }
      else if (key === 'proposal.existingWorkId') loadWork(value);
      else if (key === 'sigmaHalfSteps') configure({}, 'sigma', Number(value));
      else edit([[key, value]]);
    }
  }
  listen(elements.form, 'input', input); listen(elements.form, 'change', input);
  listen(elements.form, 'submit', event => { event.preventDefault(); if (!disposed && isActive()) settle('apply'); });
  listen(elements.form, 'compositionstart', () => { rateControls.release(); composing = true; render(); }); listen(elements.form, 'compositionend', event => { composing = false; input(event); });
  function close({ park = true } = {}) { if (disposed) return; durationDials.release(); rateControls.release(); ++generation; composing = false; if (park && editing.read().active?.kind === 'assurance') editing.park(); }
  function dispose() { if (disposed) return; close(); disposed = true; ++generation; cleanup.splice(0).forEach(release => release()); elements.fields.disabled = true; for (const button of actions.values()) button.disabled = true; durationDials.dispose(); rateControls.dispose(); beforeReel.dispose(); afterReel.dispose(); instrument.before(elements.statistics); instrument.remove(); rehearsalDisclosure.before(elements.rehearsal); rehearsalDisclosure.remove(); followThrough.before(elements.events, elements.learning); followThrough.remove(); elements.concepts.before(elements.quality); elements.concepts.after(elements.events, elements.learning, elements.rehearsal); for (const element of [elements.quality, elements.events, elements.learning, elements.rehearsal]) element.hidden = false; elements.rehearsal.after(elements.work); elements.work.hidden = false; receiverHeader.dispose(); workbench.remove(); controls.clear(); cards.clear(); INSTANCES.delete(root); }
  render(); const controller = Object.freeze({ open, selectSupport, refresh: render, close, resume: () => open('assurance', false), dispose }); INSTANCES.set(root, controller); return controller;
}
