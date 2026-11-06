import { createTimeControls, mountDurationDials, renderTimeReadout } from './time-controls.mjs';
import { ASSURANCE_FIELDS, assuranceField, assuranceSettingsFromRaw, startingAssuranceRaw } from './assurance-draft.mjs';
import { listQualityConcepts, listSourcePresets, getSourcePreset, listRehearsalDefinitions, getLearningPromptDefinition, projectAssurance, sourcePresetEstimate } from './assurance-models.mjs';
import { money } from './display.mjs';
import { mountRateControls } from './rate-controls.mjs';
import { projectAssuranceConsequences, summarizeAssuranceWork } from './assurance-consequences.mjs';

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
  let renderedSigma = null, selectedPrompt = null;
  for (const name of ['quality', 'concepts', 'statistics', 'events', 'learning', 'rehearsal', 'work', 'manual']) elements[name].replaceChildren();
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
      choice.dataset.assurancePad = row.id;
      radio.type = 'radio'; radio.name = `${instance}-${kind}`; radio.value = row.id; radio.dataset.assuranceSelection = kind;
      text.append(node('strong', row.label ?? row.name), status); choice.append(radio, text); choices.append(choice); items.set(row.id, { radio, status });
    }
    return items;
  }
  const qualityGrid = node('div', undefined, 'native-assurance__assumptions');
  const qualityAssumptions = node('details'); qualityAssumptions.dataset.assuranceAssumptions = '';
  qualityAssumptions.append(node('summary', 'Adjust the quality illustration'), qualityGrid);
  elements.quality.append(qualityAssumptions);
  field(qualityGrid, 'sourcePresetId');
  const horizon = node('div', undefined, 'native-assurance__horizon'); qualityGrid.append(horizon);
  field(horizon, 'horizonUnit'); field(horizon, 'horizonQuantity');
  const quantities = node('div', undefined, 'native-assurance__quantities'); qualityGrid.append(quantities);
  for (const key of ['namedUnknowns', 'allocationPercent', 'independentRate', 'qualityAdditionalPercent', 'recoveryAdditionalPercent']) field(quantities, key);
  field(qualityGrid, 'qualityIncluded'); field(qualityGrid, 'recoveryRatePersonIds');
  const sourceReading = node('details'); sourceReading.append(node('summary', 'Read the illustrative source scenario')); const sourceBody = node('div'); sourceReading.append(sourceBody); qualityAssumptions.append(sourceReading);
  const estimates = node('div', undefined, 'native-assurance__estimates'); estimates.dataset.assuranceEstimates = ''; elements.quality.append(estimates);
  elements.concepts.append(node('h4', 'Connect quality intentions to work'));
  const conceptChoices = selectionRail(elements.concepts, 'Inspect a quality concept', concepts, 'concept');
  const conceptInspector = node('div'); conceptInspector.dataset.assuranceConceptInspector = ''; elements.concepts.append(conceptInspector);
  const consequence = node('section', undefined, 'native-assurance__consequence'); consequence.dataset.assuranceConsequence = ''; elements.concepts.append(consequence);
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
  const sigmaPlot = node('div', undefined, 'native-assurance__chart'), sigmaReading = node('p'), sigmaBasis = node('p');
  sigmaValues.append(sigmaBasis);
  const scope = node('section', undefined, 'native-assurance__scope'), scopeHead = node('div', undefined, 'native-assurance__scope-head');
  scopeHead.append(node('span', 'NORMAL REFERENCE / TWO-SIDED TAILS'));
  const scopeValue = node('strong'); scopeHead.append(scopeValue);
  const scopeControls = node('div', undefined, 'native-assurance__scope-controls'); scopeControls.append(sigmaControl, sigmaSelect.group);
  scope.append(scopeHead, sigmaPlot); elements.statistics.append(scope, scopeControls, sigmaReading, sigmaValues);
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
  const rateControls = mountRateControls({ host: controls.get('independentRate').group, precision: controls.get('independentRate').input, label: 'Independent quality hourly rate',
    read() {
      const view = editor.read(), active = editing.read().active, raw = view.draft?.raw.independentRate;
      const valid = raw?.trim() && !view.draft?.errors.some(error => error.path === 'draft.independentRate');
      return { token: view.draft?.token, raw, cents: valid ? Math.round(Number(raw) * 100) : null,
        enabled: !disposed && !composing && isActive() && view.status === 'editing'
          && active?.kind === 'assurance' && active.token === view.draft?.token };
    }, write(token, value) { const epoch = ++generation; changed(editor.setText(token, 'independentRate', value), epoch); } });
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
    const comparison = node('section', undefined, 'native-assurance__consequence'); comparison.dataset.assuranceScenarioComparison = id;
    if (kind === 'rehearsal') body.append(comparison);
    if (kind === 'rehearsal') {
      body.append(actionRow(button('Pause selected connections in this proposal', 'pause-connections', { assuranceRecord: id }), button('Keep selected connections as accepted', 'keep-connections', { assuranceRecord: id })));
      const evidence = node('details'); evidence.append(node('summary', 'Record an observed rehearsal result'));
      field(evidence, prefix + 'observedPlanRevision'); field(evidence, prefix + 'observation'); body.append(evidence);
    }
    details.append(summary, body);
    (kind === 'event' ? eventList : kind === 'learning' ? learningList : rehearsalGroups.get(raw[prefix + 'definitionId'])).append(details);
    cards.set(key, { details, summary, links, comparison });
  }
  function supportReading(reading, workIds, title, plan) {
    const summary = summarizeAssuranceWork(reading, workIds), section = node('section', undefined, 'native-assurance__effect');
    section.append(node('h6', title));
    if (!summary.rows.length) { section.append(node('p', 'Choose a supporting session to make the people, effort and investment explicit.')); return section; }
    section.append(metrics([['Participant effort', `${summary.personMinutes} person-minutes`], ['Attributed session cost', attributedAmount(summary)],
      ['Within funded time', attributedAmount(summary.allocated)], ['Extra work', attributedAmount(summary.additional)]]));
    const timing = summary.timing;
    section.append(node('p', timing.placement === 'placed' ? `Elapsed span: ${timing.elapsedMinutes} minutes, from minute ${timing.startMinute} to ${timing.endMinute}. This includes gaps between sessions.`
      : timing.placement === 'empty' ? 'These sessions have no occurrences to place.' : 'Elapsed span awaits session timing in the Coordination horizon. Participant effort remains explicit.'));
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
      shape('path', { d: reading.curvePath, fill: 'none', class: 'native-assurance__sigma-curve' });
      shape('line', { x1: 45, y1: 275, x2: 655, y2: 275, class: 'native-assurance__sigma-axis' });
      for (const [side, point] of Object.entries(reading.thresholds)) {
        shape('line', { x1: point.x, y1: point.y, x2: point.x, y2: 275, class: 'native-assurance__sigma-threshold' });
        shape('text', { x: point.x, y: 298, 'text-anchor': 'middle' }).textContent = `${side === 'left' ? '−' : '+'}${reading.sigma}σ`;
      }
      sigmaPlot.replaceChildren(svg);
      renderedSigma = reading.sigma;
    }
    sigmaReading.textContent = 'Explore a mathematical quality reference. Supporting sessions determine the planned investment.';
    sigmaBasis.textContent = reading.basis;
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
      if (error && qualityGrid.contains(control.input)) qualityAssumptions.open = true;
    }
    renderTimeReadout(time, raw, { errors, composing, fieldPrefix: 'proposal.', horizonWeeks: view.projection.state.horizonWeeks });
    durationDials.refresh();
    rateControls.refresh();
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
      const included = raw[`concept.${id}.included`] === 'yes', linked = raw[`concept.${id}.workIds`].length > 0;
      choice.radio.parentElement.dataset.included = String(included); choice.radio.parentElement.dataset.support = linked ? 'linked' : 'open';
      choice.status.textContent = `${included ? 'Included' : 'Available'} · ${linked ? 'Supporting work linked' : 'Choose supporting work'}`;
    }
    for (const [id, choice] of scenarioChoices) {
      choice.radio.checked = id === selectedScenario; scenarioCards.get(id).hidden = id !== selectedScenario;
      choice.status.textContent = raw.rehearsalIds.some(recordId => raw[`rehearsal.${recordId}.definitionId`] === id) ? 'Continue this rehearsal' : 'Explore this situation';
    }
    const nextPromptSignature = JSON.stringify(reading.learning);
    if (promptSignature !== nextPromptSignature) {
      promptChoice.replaceChildren(...reading.learning.map(prompt => { const option = node('option', prompt.label); option.value = prompt.promptId; return option; }));
      promptSignature = nextPromptSignature;
    }
    const prompt = reading.learning.find(row => row.promptId === selectedPrompt) ?? reading.learning[0];
    selectedPrompt = prompt?.promptId ?? null; prompts.hidden = !prompt;
    if (prompt) { promptChoice.value = prompt.promptId; promptReading.textContent = prompt.prompt; planLearning.dataset.assurancePrompt = prompt.promptId; }
    const estimateText = (name, estimate) => `${name}: ${estimate.status === 'known' ? `${hourText(estimate.hours)} · ${money(estimate.amountCents)}` : estimate.problems.join(' ')}`;
    estimates.replaceChildren(node('p', estimateText('Quality illustration', reading.quality.estimate)), node('p', estimateText('Recovery illustration', reading.recovery.estimate)));
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
    renderConsequences(view, preview);
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
    if (target.kind === 'concept') selectedConcept = target.id;
    else {
      const definitionId = raw?.[`rehearsal.${target.id}.definitionId`] ?? view.projection.state.assuranceSettings.rehearsals.find(row => row.id === target.id)?.definitionId;
      if (!scenarioCards.has(definitionId)) return false; selectedScenario = definitionId;
    }
    render(); if (!retains()) return false;
    if (view.status !== 'editing') { actions.get('review').focus(); return true; }
    const card = cards.get(`${target.kind}/${target.id}`); if (!card || card.details.hidden) return false;
    if (target.kind === 'rehearsal') card.details.open = true;
    const field = target.kind === 'concept' ? `concept.${target.id}.included`
      : `rehearsal.${target.id}.${target.standing === 'observation' && raw?.[`rehearsal.${target.id}.observation`]?.trim() ? 'observation' : 'context'}`;
    const control = controls.get(field);
    for (let parent = control.input.parentElement; parent && card.details.contains(parent); parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    control.input.focus(); if (retains() && card.details.contains(document.activeElement)) card.details.scrollIntoView({ block: 'nearest' });
    return true;
  }
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
    rateControls.release();
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
    if (action === 'preparation') { selectSupport({ kind: 'concept', id: 'reconciliation-replay' }); return; }
    if (action === 'scenario') {
      selectedScenario = control.dataset.assuranceDefinition; render(); const card = scenarioCards.get(selectedScenario);
      if (card && !disposed) { const heading = card.querySelector('h5'); heading.tabIndex = -1; heading.focus(); } return;
    }
    if (action === 'proposal-settings') { controls.get('proposal.label').input.focus(); return; }
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
  listen(elements.form, 'compositionstart', () => { rateControls.release(); composing = true; render(); }); listen(elements.form, 'compositionend', event => { composing = false; input(event); });
  function close({ park = true } = {}) { if (disposed) return; durationDials.release(); rateControls.release(); ++generation; composing = false; if (park && editing.read().active?.kind === 'assurance') editing.park(); }
  function dispose() { if (disposed) return; close(); disposed = true; ++generation; cleanup.splice(0).forEach(release => release()); elements.fields.disabled = true; for (const button of actions.values()) button.disabled = true; durationDials.dispose(); rateControls.dispose(); controls.clear(); cards.clear(); INSTANCES.delete(root); }
  render(); const controller = Object.freeze({ open, selectSupport, refresh: render, close, resume: () => open('assurance', false), dispose }); INSTANCES.set(root, controller); return controller;
}
