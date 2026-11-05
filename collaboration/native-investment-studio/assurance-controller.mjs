import { createTimeControls, mountDurationDials, renderTimeReadout } from './time-controls.mjs';
import { ASSURANCE_FIELDS, assuranceField, assuranceSettingsFromRaw, startingAssuranceRaw } from './assurance-draft.mjs';
import { listQualityConcepts, listSourcePresets, getSourcePreset, listRehearsalDefinitions, getLearningPromptDefinition, projectAssurance, sourcePresetEstimate } from './assurance-models.mjs';
import { money } from './display.mjs';

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
  const find = name => { const element = root.querySelector(`[data-assurance-${name}]`); if (!element) throw new TypeError(`Supply the assurance ${name} element.`); return element; };
  const elements = Object.fromEntries(['quality', 'concepts', 'statistics', 'events', 'learning', 'rehearsal', 'work', 'preview', 'error', 'status', 'manual', 'form', 'fields', 'recovery', 'current'].map(name => [name, find(name)]));
  const actions = new Map([...root.querySelectorAll('[data-assurance-action]')].map(element => [element.dataset.assuranceAction, element]));
  const editor = editing.assurance;
  const concepts = listQualityConcepts(), definitions = listRehearsalDefinitions();
  let selectedConcept = concepts[0].id, selectedScenario = definitions[0].id;
  for (const name of ['quality', 'concepts', 'statistics', 'events', 'learning', 'rehearsal', 'work', 'manual']) elements[name].replaceChildren();
  let disposed = false, generation = 0, sequence = 0, composing = false, lastProjection = null, promptSignature = '';
  const owns = epoch => !disposed && generation === epoch;
  const listen = (element, event, handler) => { element.addEventListener(event, handler); cleanup.push(() => element.removeEventListener(event, handler)); };
  const button = (text, action, data = {}) => { const element = node('button', text); element.type = 'button'; Object.assign(element.dataset, { assuranceAction: action, ...data }); return element; };
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
    const metadata = assuranceField(key), radio = key === 'horizonUnit', grouped = metadata.kind === 'ids' || radio;
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
      create.type = 'button'; Object.assign(create.dataset, { nativeCreate: kind, nativeReturn: 'assurance', nativeReturnField: key }); group.append(actionRow(create));
    }
    group.append(error); parent.append(group); const control = { input, metadata, key, group, error, radio }; controls.set(key, control); return control;
  }
  function selectionRail(parent, label, rows, kind) {
    const rail = node('fieldset', undefined, 'native-assurance__selection'), legend = node('legend', label), choices = node('div', undefined, 'native-assurance__rail');
    const items = new Map(); rail.append(legend, choices); parent.append(rail);
    for (const row of rows) {
      const choice = node('label'), radio = node('input'), text = node('span'), status = node('small');
      radio.type = 'radio'; radio.name = `${instance}-${kind}`; radio.value = row.id; radio.dataset.assuranceSelection = kind;
      text.append(node('strong', row.label ?? row.name), status); choice.append(radio, text); choices.append(choice); items.set(row.id, { radio, status });
    }
    return items;
  }
  const qualityGrid = node('div', undefined, 'native-assurance__assumptions');
  elements.quality.append(node('h4', 'Plan quality work and examine its assumptions'),
    node('p', 'The illustration estimates effort from a reference horizon. Linked working sessions supply the accepted investment. Choose people, duration and funding when planning those sessions.'), qualityGrid);
  field(qualityGrid, 'sourcePresetId');
  const horizon = node('div', undefined, 'native-assurance__horizon'); qualityGrid.append(horizon);
  field(horizon, 'horizonUnit'); field(horizon, 'horizonQuantity');
  const quantities = node('div', undefined, 'native-assurance__quantities'); qualityGrid.append(quantities);
  for (const key of ['namedUnknowns', 'allocationPercent', 'independentRate', 'qualityAdditionalPercent', 'recoveryAdditionalPercent']) field(quantities, key);
  field(qualityGrid, 'qualityIncluded'); field(qualityGrid, 'recoveryRatePersonIds');
  const sourceReading = node('details'); sourceReading.append(node('summary', 'Read the illustrative source scenario')); const sourceBody = node('div'); sourceReading.append(sourceBody); elements.quality.append(sourceReading);
  const estimates = node('div', undefined, 'native-assurance__estimates'); estimates.dataset.assuranceEstimates = ''; elements.quality.append(estimates);
  elements.concepts.append(node('h4', 'Connect quality intentions to work'));
  const conceptChoices = selectionRail(elements.concepts, 'Inspect a quality concept', concepts, 'concept');
  const conceptInspector = node('div'); conceptInspector.dataset.assuranceConceptInspector = ''; elements.concepts.append(conceptInspector);
  for (const concept of concepts) {
    const details = node('section', undefined, 'native-assurance__card'); details.dataset.assuranceConcept = concept.id;
    const summary = node('h5', concept.label), body = node('div');
    field(body, `concept.${concept.id}.included`); field(body, `concept.${concept.id}.workIds`);
    const links = actionRow(); body.append(links, actionRow(button('Plan supporting work', 'propose', { assuranceTarget: `concept/${concept.id}`, assuranceLabel: concept.label })));
    details.append(summary, body); conceptInspector.append(details); cards.set(`concept/${concept.id}`, { details, summary, links, label: concept.label });
  }
  elements.statistics.append(node('h4', 'Explore quality attention'));
  const sigmaControl = node('div', undefined, 'native-assurance__sigma-control'), sigmaLabel = node('label', 'Sigma attention');
  const sigmaInput = node('input'); sigmaInput.type = 'range'; sigmaInput.min = '1'; sigmaInput.max = '6'; sigmaInput.step = '0.5'; sigmaInput.id = `${instance}-sigma`; sigmaInput.dataset.assuranceField = 'sigmaHalfSteps'; sigmaLabel.htmlFor = sigmaInput.id;
  const sigmaValue = node('output'); sigmaValue.setAttribute('for', sigmaInput.id);
  const sigmaScale = node('div', undefined, 'native-assurance__sigma-scale'); sigmaScale.setAttribute('aria-hidden', 'true');
  for (let value = 1; value <= 6; value += 1) sigmaScale.append(node('span', `${value}σ`));
  sigmaControl.append(sigmaLabel, sigmaValue, sigmaInput, sigmaScale); elements.statistics.append(sigmaControl);
  const sigmaSelect = field(elements.statistics, 'sigmaHalfSteps', 'Choose sigma attention');
  sigmaSelect.input.setAttribute('aria-label', 'Choose sigma attention');
  const sigmaValues = node('details'); sigmaValues.append(node('summary', 'Read the reference values')); const sigmaValuesBody = node('dl'); sigmaValues.append(sigmaValuesBody);
  const sigmaPlot = node('div', undefined, 'native-assurance__chart'), sigmaReading = node('p'), attentionList = node('dl', undefined, 'native-assurance__attention');
  elements.statistics.append(sigmaPlot, sigmaReading, sigmaValues, attentionList);
  elements.events.append(node('h4', 'Prepare for recovery'), node('p', 'Describe an event, name who receives the recovery, and link the sessions that carry it. Aggregate person-minutes express everyone’s effort together.'), actionRow(button('Add a recovery event', 'add-event')));
  const eventList = node('div'); elements.events.append(eventList);
  elements.learning.append(node('h4', 'Turn a learning question into planned work'));
  const prompts = node('div', undefined, 'native-assurance__grid'), learningList = node('div'); elements.learning.append(prompts, learningList);
  elements.rehearsal.append(node('h4', 'Rehearse a professional complication'), node('p', 'Use a scenario to examine a response before accepting changes. Record an observation after a person has performed and reviewed the rehearsal.'));
  const scenarioChoices = selectionRail(elements.rehearsal, 'Choose a complication', definitions, 'scenario');
  const rehearsalGroups = new Map(), scenarioCards = new Map();
  for (const definition of definitions) {
    const card = node('section', undefined, 'native-assurance__card'); card.dataset.assuranceComplication = definition.id;
    card.append(node('h5', definition.name), node('p', definition.setup), node('p', definition.prompt));
    const assumptions = node('ul'); for (const assumption of definition.assumptions) assumptions.append(node('li', assumption));
    card.append(assumptions, actionRow(button('Prepare this rehearsal', 'rehearse', { assuranceDefinition: definition.id })));
    const records = node('div'); card.append(records); rehearsalGroups.set(definition.id, records); scenarioCards.set(definition.id, card); elements.rehearsal.append(card);
  }
  elements.work.append(node('h4', 'Propose the work people will do'));
  const workNote = node('p'), workFields = node('div', undefined, 'native-support-proposal'); elements.work.append(workNote, workFields);
  const modeFields = node('div', undefined, 'native-support-proposal__metadata');
  field(modeFields, 'proposal.mode'); const existingWork = field(modeFields, 'proposal.existingWorkId');
  const identityFields = node('div', undefined, 'native-support-proposal__metadata');
  for (const key of ['label', 'teamId']) field(identityFields, `proposal.${key}`);
  workFields.append(modeFields, identityFields); field(workFields, 'proposal.personIds');
  const time = createTimeControls(document, { idPrefix: `${instance}-proposal`, fieldPrefix: 'proposal.',
    decorateField(input, key) { input.dataset.assuranceField = key; },
    decorateStep(button, key, direction) { Object.assign(button.dataset, { assuranceAction: 'step', assuranceField: key, assuranceStep: String(direction) }); } });
  for (const [key, control] of time.controls) controls.set(key, { ...control, metadata: assuranceField(key) });
  workFields.append(time.element); field(workFields, 'proposal.funding');
  const workPreview = node('p'); workPreview.dataset.assuranceWorkPreview = ''; workFields.append(workPreview, actionRow(button('Set this session proposal aside', 'clear-work')));
  const durationDials = mountDurationDials({ ...time, read() {
    const view = editor.read(), active = editing.read().active;
    return { token: view.draft?.token, hours: view.draft?.raw['proposal.hoursPerSession'], minutes: view.draft?.raw['proposal.minutesPerSession'], composing,
      errors: { hours: view.draft?.errors.some(error => error.path === 'draft.proposal.hoursPerSession'), minutes: view.draft?.errors.some(error => error.path === 'draft.proposal.minutesPerSession') },
      enabled: !disposed && !composing && isActive() && view.status === 'editing' && view.draft?.raw['proposal.mode'] !== 'none'
        && active?.kind === 'assurance' && active.token === view.draft.token };
  }, write(token, field, value) { const epoch = ++generation; changed(editor.setText(token, 'proposal.' + field, value), epoch); } });
  const manual = node('div'); manual.append(
    node('p', 'Plan quality, recovery and learning against the current purpose. Link existing sessions when they already carry the work. A new session asks for its participants, duration, occurrences and funding before Apply accepts it.'),
    node('p', 'The quality illustration uses reference hours × allocation × (0.65 + 0.15 × sigma attention), then applies the independent hourly rate and additional share. The recovery illustration uses aggregate person-time and the selected people’s mean rate. These illustrations remain separate from the native session ledger.'),
    node('p', 'The normal curve is a centered mathematical reference with two-sided tails and zero process shift. Its threshold helps discuss attention; recorded operational evidence establishes performance and readiness.'),
    node('p', 'Recovery events identify the receiver and review boundary. Learning actions identify the decision owner. Rehearsal observations identify the person who reviewed the response and the plan revision observed.'),
    node('p', 'Apply accepts the complete proposal together. Cancel restores the accepted chapter values. Switching chapters parks unfinished values; review saved edits after another change updates the plan. Undo restores the preceding accepted plan.'),
    node('p', 'Quality and rehearsal catalogue · version 1.0.0. Illustrative methods are adapted from the full Investment and Change Studio.'));
  elements.manual.append(manual);

  function addRecordCard(kind, id, raw) {
    const key = `${kind}/${id}`;
    if (cards.has(key)) {
      if (kind === 'rehearsal') { const parent = rehearsalGroups.get(raw[`rehearsal.${id}.definitionId`]); const card = cards.get(key); if (parent && card.details.parentElement !== parent) parent.append(card.details); }
      return;
    }
    const details = node('details', undefined, 'native-assurance__card'); details.dataset[`assurance${kind[0].toUpperCase() + kind.slice(1)}`] = id;
    const summary = node('summary'), body = node('div'), prefix = `${kind}.${id}.`;
    const keys = kind === 'event' ? ['label', 'included', 'lifecycle', 'eventCount', 'aggregateMinutesPerEvent', 'receiverPersonId', 'reviewBoundary', 'workIds']
      : kind === 'learning' ? ['context', 'decisionOwnerPersonId', 'reviewBoundary', 'workIds']
        : ['context', 'assumptions', 'response', 'reviewerPersonId', 'workIds', 'connectionIds', 'personIds'];
    for (const name of keys) field(body, prefix + name);
    const links = actionRow(); body.append(links, actionRow(button(kind === 'rehearsal' ? 'Plan response work' : 'Plan supporting work', 'propose', { assuranceTarget: key })));
    if (kind === 'rehearsal') {
      body.append(actionRow(button('Pause selected connections in this proposal', 'pause-connections', { assuranceRecord: id }), button('Keep selected connections as accepted', 'keep-connections', { assuranceRecord: id })));
      const evidence = node('details'); evidence.append(node('summary', 'Record an observed rehearsal result'));
      field(evidence, prefix + 'observedPlanRevision'); field(evidence, prefix + 'observation'); body.append(evidence);
    }
    details.append(summary, body);
    (kind === 'event' ? eventList : kind === 'learning' ? learningList : rehearsalGroups.get(raw[prefix + 'definitionId'])).append(details);
    cards.set(key, { details, summary, links });
  }
  function renderSigma(reading) {
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 700 310'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Centered normal reference with thresholds at minus and plus ${reading.sigma} sigma`);
    const shape = (tag, attributes) => { const child = document.createElementNS(ns, tag); for (const [name, value] of Object.entries(attributes)) child.setAttribute(name, value); svg.append(child); return child; };
    const defs = document.createElementNS(ns, 'defs'), pattern = document.createElementNS(ns, 'pattern'), hatch = document.createElementNS(ns, 'path');
    pattern.id = `${instance}-sigma-tail`; pattern.setAttribute('patternUnits', 'userSpaceOnUse'); pattern.setAttribute('width', '8'); pattern.setAttribute('height', '8');
    hatch.setAttribute('d', 'M-2 2L2 -2M0 8L8 0M6 10L10 6'); hatch.setAttribute('stroke', 'currentColor'); hatch.setAttribute('stroke-width', '1.5'); pattern.append(hatch); defs.append(pattern); svg.append(defs);
    for (const region of reading.regions) shape('rect', { x: region.x, y: 20, width: region.width, height: 255, class: 'native-assurance__sigma-region' });
    shape('path', { d: reading.leftTailPath, fill: `url(#${instance}-sigma-tail)`, class: 'native-assurance__sigma-tail' }); shape('path', { d: reading.rightTailPath, fill: `url(#${instance}-sigma-tail)`, class: 'native-assurance__sigma-tail' });
    shape('path', { d: reading.curvePath, fill: 'none', class: 'native-assurance__sigma-curve' });
    shape('line', { x1: 45, y1: 275, x2: 655, y2: 275, class: 'native-assurance__sigma-axis' });
    for (const [side, point] of Object.entries(reading.thresholds)) {
      shape('line', { x1: point.x, y1: point.y, x2: point.x, y2: 275, class: 'native-assurance__sigma-threshold' });
      shape('text', { x: point.x, y: 298, 'text-anchor': 'middle' }).textContent = `${side === 'left' ? '−' : '+'}${reading.sigma}σ`;
    }
    sigmaPlot.replaceChildren(svg);
    sigmaReading.textContent = `${reading.basis} About ${Number(reading.tailPerMillion.toFixed(2)).toLocaleString('en-US')} reference values per million lie beyond the selected thresholds. Quality effort multiplier: ${reading.multiplier === null ? 'set the reference horizon' : Number(reading.multiplier.toFixed(3))}.`;
    attentionList.replaceChildren(...reading.attention.map(row => { const group = node('div'); group.append(node('dt', row.label), node('dd', `${row.description} ${row.hours === null ? 'Set a reference horizon to illustrate effort.' : `${hourText(row.hours)} of the quality illustration.`}`)); return group; }));
  }
  function render() {
    const view = editor.read(); if (disposed) return view;
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
    lastProjection = view.projection;
    sigmaInput.value = String(reading.sigma.sigma); sigmaInput.setAttribute('aria-valuetext', `${reading.sigma.sigma} sigma attention`); sigmaValue.textContent = `${reading.sigma.sigma}σ`;
    renderSigma(reading.sigma);
    sigmaValuesBody.replaceChildren(...[['Sigma threshold', reading.sigma.sigma], ['Two-sided tail probability', reading.sigma.tailProbability], ['Reference values per million beyond the thresholds', reading.sigma.tailPerMillion], ['Quality illustration hours', reading.quality.estimate.hours ?? 'Choose a reference horizon'], ['Recovery illustration hours', reading.recovery.estimate.hours ?? 'Choose the recovery assumptions']].map(([label, value]) => { const group = node('div'); group.append(node('dt', label), node('dd', String(value))); return group; }));
    for (const [key, card] of cards) {
      const [kind, id] = key.split('/'), present = kind === 'concept' || raw[collectionKeys[kind]].includes(id);
      card.details.hidden = !present || kind === 'concept' && id !== selectedConcept; if (!present) continue;
      const prefix = `${kind}.${id}.`, workIds = raw[prefix + 'workIds'] ?? [], labels = workIds.map(id => view.projection.state.work.find(row => row.id === id)?.label ?? id);
      const label = kind === 'concept' ? card.label : kind === 'event' ? raw[prefix + 'label'] || 'Name the recovery event' : kind === 'learning' ? getLearningPromptDefinition(raw[prefix + 'promptId'])?.label ?? 'Learning action' : 'Rehearsal response';
      card.summary.textContent = `${label}${kind === 'event' && raw[prefix + 'lifecycle'] === 'retired' ? ' · retired' : ''}${labels.length ? ` · ${labels.join(', ')}` : ' · choose supporting work'}`;
      card.links.replaceChildren(...workIds.map(id => button(`Inspect ${view.projection.state.work.find(row => row.id === id)?.label ?? id}`, 'work', { assuranceWork: id })));
    }
    for (const [id, choice] of conceptChoices) {
      choice.radio.checked = id === selectedConcept;
      choice.status.textContent = raw[`concept.${id}.included`] === 'yes' ? 'Included' : 'Not included';
    }
    for (const [id, choice] of scenarioChoices) {
      choice.radio.checked = id === selectedScenario; scenarioCards.get(id).hidden = id !== selectedScenario;
      choice.status.textContent = raw.rehearsalIds.some(recordId => raw[`rehearsal.${recordId}.definitionId`] === id) ? 'Continue this rehearsal' : 'Explore this situation';
    }
    const nextPromptSignature = JSON.stringify(reading.learning);
    if (promptSignature !== nextPromptSignature) {
      prompts.replaceChildren(...reading.learning.map(prompt => { const card = node('details', undefined, 'native-assurance__card'); card.append(node('summary', prompt.label), node('p', prompt.prompt), actionRow(button('Plan this learning', 'learning', { assurancePrompt: prompt.promptId }))); return card; })); promptSignature = nextPromptSignature;
    }
    const estimateText = (name, estimate) => `${name}: ${estimate.status === 'known' ? `${hourText(estimate.hours)} · ${money(estimate.amountCents)}` : estimate.problems.join(' ')}. ${estimate.basis}`;
    estimates.replaceChildren(node('p', estimateText('Quality illustration', reading.quality.estimate)), node('p', estimateText('Recovery illustration', reading.recovery.estimate)));
    const preset = reading.sourcePreset; sourceReading.hidden = !preset;
    if (preset) {
      const total = sourcePresetEstimate(preset.id); sourceBody.replaceChildren(node('p', `${preset.name}. ${preset.horizon.quantity} ${preset.horizon.unit}; ${preset.complexity} complexity. Source scenario investment: ${total.status === 'known' ? money(Math.round(total.central * 100)) : total.problems.join(' ')}.`));
      for (const [title, rows] of [['People and rates', preset.roles.map(row => `${row.label}: ${row.people} people at ${money(row.rateCentsPerHour)} per hour, ${row.allocationPercent}% allocation.`)],
        ['Activities', preset.activities.map(row => `${row.label}: ${row.count} items, ${row.aggregateMinutesPerItem} aggregate person-minutes each.`)],
        ['Recovery', preset.disruptions.map(row => `${row.label}: ${row.eventCount} events, ${row.aggregateMinutesPerEvent} aggregate person-minutes each.`)]]) {
        const list = node('ul'); for (const row of rows) list.append(node('li', row)); sourceBody.append(node('h5', title), list);
      }
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
    return view;
  }
  function opened(result, epoch, focus) { if (!owns(epoch)) return result; composing = false; render(); if (!owns(epoch)) return result; announce(result.ok ? '' : result.error.message); onEditing(); if (owns(epoch) && focus) (editor.read().status === 'stale' ? actions.get('review') : controls.get('sourcePresetId').input).focus(); return result; }
  function open(target = 'assurance', focus = true) { if (disposed || !canOpen()) return; const epoch = ++generation; onBegin(); if (!owns(epoch)) return; return opened(editor.begin(target, studio.read()), epoch, focus); }
  function changed(result, epoch) { if (!owns(epoch)) return; render(); if (!owns(epoch)) return; announce(result.ok ? '' : result.error.message); onEditing(); }
  function edit(entries) {
    const view = editor.read(); if (!view.draft || view.status !== 'editing') return; const epoch = ++generation; let result;
    for (const [key, value] of entries) { result = editor[assuranceField(key)?.kind === 'ids' ? 'setIds' : 'setText'](view.draft.token, key, value); if (!result.ok || !owns(epoch)) break; }
    if (result) changed(result, epoch);
  }
  function addRecord(kind, values) {
    const raw = editor.read().draft.raw, list = collectionKeys[kind]; let sequence = 1; while (raw[list].includes(`${kind}-${sequence}`)) sequence += 1; const id = `${kind}-${sequence}`;
    edit([[list, [...raw[list], id]], ...Object.entries(values).map(([key, value]) => [`${kind}.${id}.${key}`, value])]);
    const card = cards.get(`${kind}/${id}`); if (!card) return null; card.details.open = true; card.details.querySelector('input,textarea,select')?.focus(); return id;
  }
  function settle(method) {
    const view = editor.read(); if (disposed || !view.draft) return; if (composing && method === 'apply') { announce('Finish entering the text, then apply.'); return; }
    const epoch = ++generation, result = editor[method](view.draft.token); if (!owns(epoch)) return; if (!result.ok) { changed(result, epoch); return; }
    if (method === 'cancel') { opened(editor.begin('assurance', studio.read()), epoch, false); announce('Changes cancelled.'); return; }
    const accepted = result.projection ?? studio.read(); onAccepted(accepted); if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return;
    opened(editor.begin('assurance', accepted), epoch, false); if (owns(epoch)) { announce('Quality, recovery and proposed work applied.'); actions.get('apply').focus(); }
  }
  function loadWork(id) {
    const work = studio.read().state.work.find(row => row.id === id); if (!work) return;
    edit([['proposal.existingWorkId', id], ['proposal.label', work.label], ['proposal.teamId', work.teamId ?? ''], ['proposal.personIds', [...work.personIds]],
      ['proposal.hoursPerSession', String(Math.floor(work.minutesPerOccurrence / 60))], ['proposal.minutesPerSession', String(work.minutesPerOccurrence % 60)], ['proposal.occurrences', String(work.occurrences)], ['proposal.funding', work.funding]]);
  }
  listen(root, 'click', event => {
    const control = event.target.closest('[data-assurance-action]'); if (!control || !root.contains(control) || disposed || !isActive()) return;
    const action = control.dataset.assuranceAction; if (action === 'apply') return;
    if (action === 'cancel' || action === 'discard') { settle('cancel'); return; }
    const view = editor.read(); if (!view.draft) return;
    if (action === 'review' || action === 'current') { const epoch = ++generation; opened(editor[action === 'review' ? 'review' : 'useCurrent'](view.draft.token, studio.read()), epoch, true); return; }
    if (view.status !== 'editing') return;
    if (action === 'step') { const epoch = ++generation; changed(editor.step(view.draft.token, control.dataset.assuranceField, Number(control.dataset.assuranceStep)), epoch); return; }
    if (action === 'work') { onSourceWork(control.dataset.assuranceWork, { targetId: 'assurance' }); return; }
    if (action === 'add-event') { addRecord('event', { label: 'Recovery after an interrupted task', included: 'yes', lifecycle: 'active', eventCount: '1', aggregateMinutesPerEvent: '60', receiverPersonId: '', reviewBoundary: '', workIds: [] }); return; }
    if (action === 'learning') { addRecord('learning', { promptId: control.dataset.assurancePrompt, context: '', decisionOwnerPersonId: '', reviewBoundary: '', workIds: [] }); return; }
    if (action === 'rehearse') {
      const definition = listRehearsalDefinitions().find(row => row.id === control.dataset.assuranceDefinition);
      addRecord('rehearsal', { definitionId: definition.id, definitionVersion: definition.version, context: '', assumptions: definition.assumptions.join(' '), response: '', reviewerPersonId: '', observedPlanRevision: String(studio.read().state.revision), observation: '', workIds: [], connectionIds: [], personIds: [] }); return;
    }
    if (action === 'keep-connections') {
      const ids = view.draft.raw[`rehearsal.${control.dataset.assuranceRecord}.connectionIds`]; edit([['connectionUpdateIds', view.draft.raw.connectionUpdateIds.filter(id => !ids.includes(id))]]); return;
    }
    if (action === 'pause-connections') {
      const ids = view.draft.raw[`rehearsal.${control.dataset.assuranceRecord}.connectionIds`];
      edit([['connectionUpdateIds', [...new Set([...view.draft.raw.connectionUpdateIds, ...ids])]], ...ids.map(id => [`connection.${id}.status`, 'paused'])]);
      announce(ids.length ? 'Selected connections will pause when you apply this proposal. Their supporting work remains in the plan.' : 'Choose the connections involved before proposing a pause.'); return;
    }
    if (action === 'clear-work') { edit([['proposal.mode', 'none']]); return; }
    if (action === 'propose') {
      if (view.draft.raw['proposal.mode'] !== 'none') { announce('Apply or set aside the current session proposal before choosing another purpose.'); return; }
      const target = control.dataset.assuranceTarget, [kind, id] = target.split('/');
      const label = control.dataset.assuranceLabel ?? (kind === 'event' ? view.draft.raw[`event.${id}.label`] : kind === 'learning' ? getLearningPromptDefinition(view.draft.raw[`learning.${id}.promptId`])?.label : 'Rehearsal response');
      edit([['proposal.target', target], ['proposal.label', label], ['proposal.mode', 'new']]); controls.get('proposal.label').input.focus();
    }
  });
  function input(event) {
    const selection = event.target.dataset.assuranceSelection;
    if (selection) {
      if (event.type !== 'change' || disposed || !isActive() || editor.read().status !== 'editing' || !event.target.checked) return;
      if (selection === 'concept' && conceptChoices.has(event.target.value)) selectedConcept = event.target.value;
      if (selection === 'scenario' && scenarioChoices.has(event.target.value)) selectedScenario = event.target.value;
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
      else edit([[key, value]]);
    }
  }
  listen(elements.form, 'input', input); listen(elements.form, 'change', input);
  listen(elements.form, 'submit', event => { event.preventDefault(); if (!disposed && isActive()) settle('apply'); });
  listen(elements.form, 'compositionstart', () => { composing = true; render(); }); listen(elements.form, 'compositionend', event => { composing = false; input(event); });
  function close({ park = true } = {}) { if (disposed) return; durationDials.release(); ++generation; composing = false; if (park && editing.read().active?.kind === 'assurance') editing.park(); }
  function dispose() { if (disposed) return; close(); disposed = true; ++generation; cleanup.splice(0).forEach(release => release()); elements.fields.disabled = true; for (const button of actions.values()) button.disabled = true; durationDials.dispose(); controls.clear(); cards.clear(); INSTANCES.delete(root); }
  render(); const controller = Object.freeze({ open, refresh: render, close, resume: () => open('assurance', false), dispose }); INSTANCES.set(root, controller); return controller;
}
