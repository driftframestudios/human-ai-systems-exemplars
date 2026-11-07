import { LIMITS } from './config.mjs';
import { PlanError } from './contract.mjs';
import { listCoordinationTemplates, prepareCoordinationReplacement, applyCoordinationTemplate, isGeneratedArrangementRecord } from './connection-templates.mjs';
import { prepareWorkDraftValues, stepWorkDraftValues, WORK_DRAFT_TEXT_LIMIT } from './draft.mjs';
import { money } from './display.mjs';
import { createArrangementReading } from './connection-view.mjs';
import { getCoordinationTemplate, projectCoordinationArrangements } from './coordination-arrangements.mjs';
import { createReel, revealReelResult } from './reel-control.mjs';
import { createSessionTracks } from './arrangement-surfaces.mjs';
import { createDeliveryBoard } from './delivery-board.mjs';
import { revealStudioDestination } from './motion.mjs';

const INSTANCES = new WeakMap();
const TEMPLATES = listCoordinationTemplates();
const BY_ID = new Map(TEMPLATES.map(row => [row.id, row]));
const sameAcceptance = (a, b) => a.instance === b.instance && a.token === b.token;
const named = row => `${row.label}${row.lifecycle === 'retired' ? ' · retired' : ''}`;
let nextInstance = 0;

// One arrangement identity belongs to this receiver. Explicit choices settle
// through the accepted owner; raw text remains local until its edit is complete.
export function mountConnectionTemplatePanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {},
  onViewChanged = () => {}, onAccepted = () => {}, onNavigate = () => {}, isActive = () => true, canOpen = isActive }) {
  const panel = root.matches('[data-connection-templates]') ? root : root.querySelector('[data-connection-templates]');
  if (!panel) throw new TypeError('Supply the coordination template panel.');
  if (INSTANCES.has(panel)) return INSTANCES.get(panel);
  if (!studio || !['read', 'readAcceptance', 'replace'].every(key => typeof studio[key] === 'function')
      || !editing || !['read', 'park'].every(key => typeof editing[key] === 'function')
      || ![onBegin, onEditing, onAccepted, isActive, canOpen].every(callback => typeof callback === 'function')) {
    throw new TypeError('Supply the Studio, its draft coordinator and receiver callbacks.');
  }
  const document = panel.ownerDocument, body = panel.querySelector('[data-connection-template-body]');
  const disclosure = panel.tagName === 'DETAILS';
  const exposed = !disclosure || panel.hasAttribute('data-template-exposed');
  const status = panel.querySelector('[data-connection-template-status]'), summary = panel.querySelector('summary');
  if (!body || !status || disclosure && !summary) throw new TypeError('Supply the complete coordination template panel.');
  const instance = `connection-template-${++nextInstance}`, cleanup = [];
  let disposed = false, acknowledged = false, generation = 0, rawRevision = 0, configuration, proposal = null;
  let arrangementId = null, dirty = false, committing = false, undoProjection = null;
  let pointerDown = false, pendingText = false, settleTimer = null;
  let projection = studio.read(), bindings = new WeakMap(), controls = new Map(), optionSources = [], dynamic = [];
  const deliveryView = { phaseId: null, overviewScroll: 0, returnPhase: null };
  const configurations = new Map();
  const invalid = new Set();
  let fieldSequence = 0;
  const form = document.createElement('form'); form.noValidate = true; form.className = 'native-connection-template__form';
  const choice = document.createElement('select'); choice.dataset.templateChoice = '';
  for (const template of TEMPLATES) choice.append(option(template.id, template.label));
  const choiceLabel = document.createElement('label'); choiceLabel.textContent = 'Arrangement'; choiceLabel.append(choice);
  const description = document.createElement('p'); description.className = 'native-coordination__hint';
  const structure = document.createElement('div'); structure.dataset.templateStructure = '';
  const delivery = document.createElement('section'); delivery.className = 'studio-team-rack'; delivery.dataset.templateRack = '';
  const rackHeading = element('header', undefined, 'studio-team-rack__heading');
  const rackTitle = element('h4', 'Teams and shared work'); rackTitle.id = `${instance}-rack-title`;
  delivery.setAttribute('aria-labelledby', rackTitle.id);
  const readout = element('dl', undefined, 'studio-rack-amount');
  const amountLabel = element('dt', 'Included work');
  const amount = element('output'); amount.dataset.templateTotal = '';
  const amountValue = element('dd'); amountValue.append(amount); readout.append(amountLabel, amountValue);
  rackHeading.append(rackTitle, readout);
  const rackBody = element('div', undefined, 'studio-team-rack__body');
  delivery.append(rackHeading, rackBody);
  const reel = createReel(document, { label: 'Team arrangement', choices: TEMPLATES, value: TEMPLATES[0].id,
    onSelect(id) {
      if (!active(canOpen) || (!active() && !open())) return;
      selectArrangement(id);
      revealReelResult(structure); revealReelResult(delivery);
    } });
  const arrangementDeck = document.createElement('div'); arrangementDeck.className = 'studio-arrangement-deck';
  arrangementDeck.append(reel.element, structure);
  choiceLabel.className = 'studio-arrangement-native-choice';
  const groups = document.createElement('div'); groups.className = 'native-connection-template__groups';
  const customization = document.createElement('details'); customization.className = 'studio-arrangement-settings';
  const customizationTitle = document.createElement('summary'); customizationTitle.textContent = 'Customize teams and handoffs';
  customization.append(customizationTitle, groups);
  const previewRegion = document.createElement('section'); previewRegion.className = 'native-coordination__preview native-connection-template__preview';
  previewRegion.dataset.templatePreview = ''; previewRegion.hidden = true; previewRegion.setAttribute('aria-label', 'Arrangement preview');
  const actions = document.createElement('div'); actions.className = 'native-coordination__actions';
  const applyButton = button('Apply arrangement', 'apply'); applyButton.className = 'native-control--confirm';
  const cancelButton = button('Keep current arrangement', 'cancel'); cancelButton.className = 'native-control--cancel';
  const undoButton = button('Undo arrangement', 'undo'); undoButton.className = 'native-control--cancel'; undoButton.hidden = true;
  const preserveButton = button('Keep shared records and use this arrangement', 'preserve'); preserveButton.className = 'native-control--confirm'; preserveButton.hidden = true;
  actions.append(undoButton, applyButton, preserveButton, cancelButton);
  form.append(choiceLabel, arrangementDeck, description, delivery, actions, previewRegion, customization); body.replaceChildren(form);
  function option(value, label) { const node = document.createElement('option'); node.value = value; node.textContent = label; return node; }
  function element(tag, text, className) {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
    if (className) node.className = className; return node;
  }
  function button(text, action) { const node = element('button', text); node.type = 'button'; node.dataset.templateAction = action; return node; }
  function listen(target, type, handler) { target.addEventListener(type, handler); cleanup.push(() => target.removeEventListener(type, handler)); }
  function owns(epoch) { return !disposed && epoch === generation; }
  function active(gate = isActive) { return !disposed && gate() && !disposed; }
  function announce(text) { if (!disposed) status.textContent = text; }
  function currentArrangement() {
    return projectCoordinationArrangements(projection.state).arrangements.find(row => row.id === arrangementId);
  }
  function acceptedReadout() {
    const arrangement = currentArrangement();
    const linked = new Set(arrangement ? arrangement.connections.flatMap(row => row.connection.workIds)
      : configuration.connections.flatMap(row => row.workIds));
    const lines = projection.result.ledger.filter(row => linked.has(row.workId)).flatMap(row => row.lines);
    amountLabel.textContent = lines.some(row => row.cents === null) ? 'Known included work' : 'Included work';
    amount.textContent = money(lines.reduce((total, row) => total + (row.cents ?? 0), 0));
    undoButton.hidden = undoProjection !== projection || !studio.readHistory?.().undoCount;
  }
  function retirePreview() {
    proposal = null; previewRegion.hidden = true; previewRegion.replaceChildren();
    applyButton.hidden = true; preserveButton.hidden = true; cancelButton.hidden = true;
    for (const element of [choiceLabel, description, arrangementDeck, customization]) element.hidden = false;
    acceptedReadout();
  }
  function touch() { rawRevision += 1; generation += 1; dirty = true; retirePreview(); announce(''); }
  function fresh(preview) {
    if (disposed || !preview || preview.revision !== rawRevision) return false;
    const current = studio.read(), acceptance = studio.readAcceptance(), drafts = editing.read();
    return !disposed && preview.revision === rawRevision && preview.base === current
      && sameAcceptance(preview.acceptance, acceptance) && preview.intent === drafts.intent
      && !drafts.disposed && drafts.active === null;
  }
  function nextPrefix(template, state) {
    const teams = new Set(state.teams.map(row => row.id)), connections = new Set(state.connections.map(row => row.id)), work = new Set(state.work.map(row => row.id));
    const arrangements = new Set(state.arrangements.map(row => row.id));
    // Each occupied prefix consumes at least one of these finitely many IDs.
    for (let number = 1; number <= teams.size + connections.size + work.size + arrangements.size + 1; number += 1) {
      const prefix = `arrangement-${number}`;
      if (!arrangements.has(prefix) && !template.teams.some(slot => teams.has(`${prefix}-team-${slot.id}`))
          && !template.connections.some(slot => connections.has(`${prefix}-connection-${slot.id}`) || work.has(`${prefix}-recovery-${slot.id}`))) return prefix;
    }
    throw new TypeError('The finite arrangement identity range was exhausted.');
  }
  function startingConfiguration(template) {
    const people = projection.state.people;
    const teams = template.teams.map((slot, index) => {
      const assigned = people.filter((row, position) => position % template.teams.length === index).map(row => row.id);
      return { slotId: slot.id, selection: 'new', label: slot.label, personIds: assigned.length ? assigned : people.slice(0, 1).map(row => row.id) };
    });
    return { templateId: template.id, proposalId: arrangementId ?? nextPrefix(template, projection.state),
      teams,
      connections: template.connections.map(slot => ({ slotId: slot.id, receiverPersonId: teams.find(team => team.slotId === slot.receiverSlotId).personIds[0] ?? '',
        sharedObject: slot.sharedObject ?? 'Working plan', responseExpectation: slot.responseExpectation ?? '',
        workIds: projection.state.work.length ? [projection.state.work[0].id] : [], status: 'active', recoveryEnabled: Boolean(slot.sessionLabel && people.length),
        recovery: { label: slot.sessionLabel ?? 'Review the handoff', team: `slot:${slot.receiverSlotId}`,
          personIds: teams.find(team => team.slotId === slot.receiverSlotId).personIds.slice(), hoursPerSession: '0', minutesPerSession: '30',
          occurrences: '1', funding: 'additional', status: 'planned', timing: null, lifecycle: 'active' } })),
    };
  }
  function acceptedConfiguration(row) {
    const template = BY_ID.get(row.templateId), config = startingConfiguration(template);
    config.proposalId = row.id;
    const teams = new Map(projection.state.teams.map(team => [team.id, team]));
    const connections = new Map(projection.state.connections.map(edge => [edge.id, edge]));
    const work = new Map(projection.state.work.map(session => [session.id, session]));
    config.teams = row.teamBindings.map(binding => {
      const team = teams.get(binding.teamId);
      return { slotId: binding.slotId, selection: isGeneratedArrangementRecord(row.id, 'team', binding.slotId, team.id) ? 'new' : `team:${team.id}`,
        acceptedId: team.id, label: team.label, personIds: [...team.personIds] };
    });
    config.connections = row.connectionBindings.map(binding => {
      const edge = connections.get(binding.connectionId), defaults = config.connections.find(item => item.slotId === binding.slotId);
      const recovery = edge.workIds.map(id => work.get(id)).find(session => isGeneratedArrangementRecord(row.id, 'recovery', binding.slotId, session.id));
      const teamSlot = recovery && row.teamBindings.find(item => item.teamId === recovery.teamId);
      return { ...defaults, receiverPersonId: edge.receiverPersonId ?? '', sharedObject: edge.sharedObject,
        responseExpectation: edge.responseExpectation ?? '', workIds: edge.workIds.filter(id => id !== recovery?.id), status: edge.status,
        recoveryEnabled: Boolean(recovery), recovery: recovery ? { label: recovery.label,
          team: teamSlot ? `slot:${teamSlot.slotId}` : `team:${recovery.teamId}`, personIds: [...recovery.personIds],
          hoursPerSession: String(Math.floor(recovery.minutesPerOccurrence / 60)), minutesPerSession: String(recovery.minutesPerOccurrence % 60),
          occurrences: String(recovery.occurrences), funding: recovery.funding, status: recovery.status, timing: recovery.timing, lifecycle: recovery.lifecycle } : defaults.recovery };
    });
    return config;
  }
  function receiveAccepted() {
    let row = projection.state.arrangements.find(item => item.id === arrangementId);
    if (!row && !dirty) row = projection.state.arrangements[0];
    if (row) {
      arrangementId = row.id; configuration = acceptedConfiguration(row);
      configurations.set(configuration.templateId, configuration);
    } else {
      arrangementId = null;
      configuration = startingConfiguration(BY_ID.get(configuration?.templateId) ?? TEMPLATES[0]);
    }
    dirty = false;
  }
  function teamId(row) { return row.selection === 'new' ? row.acceptedId ?? `${configuration.proposalId}-team-${row.slotId}` : row.selection.slice(5); }
  function teamLabel(row) {
    return row.selection === 'new' ? row.label : projection.state.teams.find(team => team.id === row.selection.slice(5))?.label ?? `${row.selection.slice(5)} · removed team`;
  }
  function selectedOptions(control, values, options, optional = false) {
    const list = optional ? [['', 'Unassigned'], ...options] : options;
    const current = new Set(list.map(([id]) => id)), selected = Array.isArray(values) ? values : [values];
    for (const id of selected) if (id && !current.has(id)) list.push([id, `${id} · removed record`]);
    control.replaceChildren(...list.map(([id, label]) => { const node = option(id, label); node.selected = selected.includes(id); return node; }));
  }
  function field(container, path, label, record, key, { max = LIMITS.relationshipText, options, multiple = false, optional = false, numeric = false, dependsOnGroups = false } = {}) {
    const wrapper = element('div', undefined, 'native-coordination__control'), caption = element('label', label);
    const input = document.createElement(options ? 'select' : 'input'); input.dataset.templateField = path;
    input.id = `${instance}-${++fieldSequence}`; caption.htmlFor = input.id;
    if (options) {
      input.multiple = multiple; if (multiple) input.size = 4;
      const update = () => selectedOptions(input, record[key], options(), optional);
      optionSources.push({ update, dependsOnGroups }); update();
    } else {
      input.type = 'text'; input.maxLength = max; input.value = record[key]; input.autocomplete = 'off';
      if (numeric) { input.inputMode = 'numeric'; input.spellcheck = false; }
    }
    const error = element('p', '', 'native-coordination__error'); error.id = `${input.id}-error`;
    input.setAttribute('aria-describedby', error.id); input.setAttribute('aria-invalid', 'false');
    controls.set(path, { input, error, record, key });
    bindings.set(input, { event: options ? 'change' : 'input', update: () => {
      if (multiple) {
        const values = [...input.selectedOptions].map(node => node.value);
        const maximum = key === 'workIds' ? LIMITS.work : LIMITS.people;
        if (values.length > maximum) { invalid.add(path); error.textContent = `Choose at most ${maximum} records.`; input.setAttribute('aria-invalid', 'true'); return; }
        const chosen = new Set(values), prior = new Set(record[key]);
        record[key] = [...record[key].filter(id => chosen.has(id)), ...values.filter(id => !prior.has(id))];
      } else if (input.value.length <= max) record[key] = input.value;
      else { invalid.add(path); error.textContent = `Use at most ${max} characters.`; input.setAttribute('aria-invalid', 'true'); return; }
      invalid.delete(path); error.textContent = ''; input.setAttribute('aria-invalid', 'false');
    } });
    wrapper.append(caption);
    if (numeric) {
      const stepper = element('div', undefined, 'native-coordination__stepper');
      const minus = button('−', 'step'), plus = button('+', 'step');
      minus.dataset.templateStep = '-1'; plus.dataset.templateStep = '1';
      for (const node of [minus, plus]) {
        node.dataset.templatePath = path;
        node.setAttribute('aria-label', `${node === minus ? 'Decrease' : 'Increase'} ${label.toLowerCase()}`);
      }
      stepper.append(minus, input, plus); wrapper.append(stepper);
    } else wrapper.append(input);
    wrapper.append(error); container.append(wrapper); return input;
  }
  function card(label, hook) {
    const node = element('details', undefined, 'native-connection-template__card'); node.dataset.templateCard = hook;
    node.append(element('summary', label)); const content = element('fieldset'); node.append(content); groups.append(node); return content;
  }
  function peopleOptions() { return projection.state.people.map(row => [row.id, named(row)]); }
  function workOptions() { return projection.state.work.map(row => [row.id, named(row)]); }
  function renderStructure() {
    const focused = document.activeElement;
    const focusKey = ['deliveryOpen', 'deliveryOverview', 'deliverySession', 'deliveryConnection', 'deliveryPerson']
      .find(key => focused && Object.hasOwn(focused.dataset ?? {}, key));
    const focusValue = focusKey ? focused.dataset[focusKey] : null;
    const focusPhase = focused?.closest('[data-delivery-phase]')?.dataset.deliveryPhase;
    const template = BY_ID.get(configuration.templateId);
    const teams = configuration.teams.map(row => ({ slotId: row.slotId, slotLabel: template.teams.find(slot => slot.id === row.slotId).label,
      team: { id: `proposal-slot-${row.slotId}`, label: teamLabel(row).trim() || 'Team name to choose', personIds: row.personIds } }));
    const connections = template.connections.map(slot => {
      const row = configuration.connections.find(row => row.slotId === slot.id);
      return { slotId: slot.id, slotLabel: slot.label, adapted: false,
        connection: { id: `proposal-edge-${slot.id}`, senderTeamId: `proposal-slot-${slot.senderSlotId}`, receiverTeamId: `proposal-slot-${slot.receiverSlotId}`,
          sharedObject: row.sharedObject, status: row.status, workIds: row.workIds } };
    });
    const exampleArrangement = { id: configuration.proposalId, templateId: template.id, templateVersion: template.version, label: template.label, purpose: template.description, adapted: false, teams, connections };
    const proposedWork = configuration.connections.filter(row => row.recoveryEnabled).flatMap(row => {
      const parsed = prepareWorkDraftValues(row.recovery); if (parsed.errors.length) return [];
      return [{ id: `proposal-session-${row.slotId}`, label: row.recovery.label,
        teamId: row.recovery.team.startsWith('slot:') ? `proposal-slot-${row.recovery.team.slice(5)}` : row.recovery.team.slice(5),
        personIds: row.recovery.personIds, ...parsed.admitted, funding: row.recovery.funding, status: row.recovery.status }];
    });
    const proposedIds = new Set(proposedWork.map(row => row.id));
    for (const row of connections) {
      const workId = `proposal-session-${row.slotId}`;
      if (proposedIds.has(workId)) row.connection.workIds = [...row.connection.workIds, workId];
    }
    const examplePlan = { ...projection.state, teams: [...projection.state.teams, ...teams.map(row => row.team)], work: [...projection.state.work, ...proposedWork] };
    const accepted = currentArrangement();
    const arrangement = accepted ?? exampleArrangement, previewPlan = accepted ? projection.state : examplePlan;
    function inspectTemplate(target, source) {
      if (!active(canOpen)) return;
      if (target.kind === 'person') { navigate(target, source); return; }
      if (accepted && ['template-team', 'team'].includes(target.kind)) {
        const team = target.kind === 'team' ? target.id : arrangement.teams.find(row => row.slotId === target.id)?.team.id;
        if (team) navigate({ kind: 'team', id: team }, source);
        return;
      }
      if (!active() && !open()) return;
      const kind = ['template-team', 'team'].includes(target.kind) ? 'team' : 'connection';
      const slotId = target.kind === 'team' ? arrangement.teams.find(row => row.team.id === target.id)?.slotId
        : target.kind === 'connection' ? arrangement.connections.find(row => row.connection.id === target.id)?.slotId : target.id;
      const section = [...groups.querySelectorAll('[data-template-card]')].find(section => section.dataset.templateCard === `${kind}:${slotId}`);
      if (!section) return; customization.open = true; section.open = true;
      section.querySelector('input,select,button')?.focus({ preventScroll: true }); revealStudioDestination(section);
    }
    const inspectSession = (id, source) => {
      const proposed = configuration.connections.find(row => `proposal-session-${row.slotId}` === id);
      if (proposed) inspectTemplate({ kind: 'template-connection', id: proposed.slotId });
      else navigate({ kind: 'work', id }, source);
    };
    const acceptedSessionIds = new Set(projection.state.work.map(work => work.id));
    structure.replaceChildren(createArrangementReading(document, { arrangement, plan: previewPlan, reading: accepted ? 'accepted' : 'example', onNavigate: inspectTemplate, includeTeamLanes: false, includeConnections: false }));
    rackBody.replaceChildren(createDeliveryBoard(document, { arrangement, plan: previewPlan, acceptedSessionIds,
      acceptedTeamIds: new Set(projection.state.teams.map(team => team.id)),
      onNavigate: inspectTemplate, onSession: inspectSession, viewState: deliveryView }),
      createSessionTracks(document, { plan: previewPlan, onSession: inspectSession,
        sessionIds: acceptedSessionIds,
        onAdd: () => navigate({ kind: 'create-session' }), label: 'Shared sessions · people who take part' }));
    const board = rackBody.querySelector('.studio-delivery__board');
    if (deliveryView.phaseId === null) board.scrollLeft = deliveryView.overviewScroll;
    if (focusKey) {
      const target = [...rackBody.querySelectorAll('button')].find(node => node.dataset[focusKey] === focusValue
        && (!focusPhase || node.closest('[data-delivery-phase]')?.dataset.deliveryPhase === focusPhase));
      if (target) {
        const bounds = board.getBoundingClientRect(), key = target.getBoundingClientRect();
        if (key.left < bounds.left) board.scrollLeft += key.left - bounds.left;
        else if (key.right > bounds.right) board.scrollLeft += key.right - bounds.right;
        if (deliveryView.phaseId === null) deliveryView.overviewScroll = board.scrollLeft;
        target.focus({ preventScroll: true });
      }
    }
    onViewChanged();
  }
  function refresh(rebuild = false) {
    if (disposed) return;
    const next = studio.read(), changed = next !== projection;
    projection = next;
    if (changed && !dirty && !committing) { receiveAccepted(); build(); return; }
    acceptedReadout();
    if (changed) for (const source of optionSources) source.update();
    for (const update of dynamic) update();
    if (changed || rebuild) renderStructure();
    if (proposal && !fresh(proposal)) {
      retirePreview(); announce('The plan changed. Choose the arrangement again.');
    }
  }
  function build() {
    const openCards = new Set([...groups.querySelectorAll('details[open]')].map(node => node.dataset.templateCard));
    const focused = document.activeElement;
    const focusPath = focused?.dataset.templateField, focusRecovery = focused?.dataset.templateRecovery;
    const stepPath = focused?.dataset.templatePath, step = focused?.dataset.templateStep;
    bindings = new WeakMap(); controls = new Map(); optionSources = []; dynamic = []; invalid.clear(); groups.replaceChildren();
    const template = BY_ID.get(configuration.templateId); choice.value = template.id; reel.select(template.id); description.textContent = template.description;
    for (const row of configuration.teams) {
      const definition = template.teams.find(slot => slot.id === row.slotId), group = card(definition.label, `team:${row.slotId}`);
      field(group, `teams.${row.slotId}.selection`, 'Team', row, 'selection', { max: LIMITS.identifier + 5,
        options: () => [['new', 'Create a team'], ...projection.state.teams.map(team => [`team:${team.id}`, named(team)])] });
      const labelInput = field(group, `teams.${row.slotId}.label`, 'Team name', row, 'label', { max: LIMITS.label });
      const members = field(group, `teams.${row.slotId}.personIds`, 'People', row, 'personIds', { options: peopleOptions, multiple: true });
      const creationHelp = element('p', 'Selections update this arrangement. Undo restores the previous choice.', 'native-coordination__hint');
      group.prepend(creationHelp);
      const addPerson = element('button', 'Add a person'); addPerson.type = 'button';
      addPerson.className = 'native-control--create native-control--navigate'; addPerson.dataset.nativeCreate = 'person'; addPerson.dataset.nativeReturn = 'template';
      group.append(addPerson);
      dynamic.push(() => {
        creationHelp.hidden = row.selection !== 'new';
        const selectedNames = row.personIds.map(id => projection.state.people.find(person => person.id === id)?.label ?? id);
        group.parentElement.querySelector('summary').textContent = `${definition.label} · ${teamLabel(row)} · ${selectedNames.slice(0, 2).join(', ') || 'Choose people'}${selectedNames.length > 2 ? ` + ${selectedNames.length - 2} more` : ''}`;
        labelInput.closest('.native-coordination__control').hidden = row.selection !== 'new';
        members.labels[0].textContent = row.selection === 'new' ? 'People' : 'Add people';
      });
    }
    for (const row of configuration.connections) {
      const definition = template.connections.find(slot => slot.id === row.slotId), group = card(definition.label, `connection:${row.slotId}`);
      const direction = element('p', '', 'native-coordination__hint'); group.append(direction);
      dynamic.push(() => { direction.textContent = `${teamLabel(configuration.teams.find(team => team.slotId === definition.senderSlotId))} → ${teamLabel(configuration.teams.find(team => team.slotId === definition.receiverSlotId))}`; });
      field(group, `connections.${row.slotId}.sharedObject`, 'Shared object or decision', row, 'sharedObject');
      field(group, `connections.${row.slotId}.receiverPersonId`, 'Receiving person', row, 'receiverPersonId', { options: peopleOptions, optional: true, max: LIMITS.identifier });
      field(group, `connections.${row.slotId}.responseExpectation`, 'Expected response', row, 'responseExpectation');
      field(group, `connections.${row.slotId}.workIds`, 'Supporting sessions', row, 'workIds', { options: workOptions, multiple: true });
      field(group, `connections.${row.slotId}.status`, 'Connection', row, 'status', { max: 16, options: () => [['active', 'Active'], ['paused', 'Paused']] });
      const enabledLabel = element('label', 'Add a review session'), enabled = document.createElement('input');
      enabled.type = 'checkbox'; enabled.checked = row.recoveryEnabled; enabled.dataset.templateRecovery = row.slotId; enabledLabel.prepend(enabled); group.append(enabledLabel);
      bindings.set(enabled, { event: 'change', update: () => { row.recoveryEnabled = enabled.checked; } });
      const recovery = element('div', undefined, 'native-connection-template__recovery'); group.append(recovery);
      dynamic.push(() => { recovery.hidden = !row.recoveryEnabled; });
      field(recovery, `recovery.${row.slotId}.label`, 'Session name', row.recovery, 'label', { max: LIMITS.label });
      field(recovery, `recovery.${row.slotId}.team`, 'Session team', row.recovery, 'team', { max: LIMITS.identifier + 5, dependsOnGroups: true,
        options: () => [...configuration.teams.map(team => [`slot:${team.slotId}`, `${teamLabel(team)} · this arrangement`]), ...projection.state.teams.map(team => [`team:${team.id}`, named(team)])] });
      field(recovery, `recovery.${row.slotId}.personIds`, 'People in the session', row.recovery, 'personIds', { options: peopleOptions, multiple: true });
      recovery.append(element('p', 'Time per person, per session', 'native-coordination__control-title'));
      const numeric = element('div', undefined, 'native-coordination__controls native-connection-template__duration'); recovery.append(numeric);
      for (const [key, label] of [['hoursPerSession', 'Hours'], ['minutesPerSession', 'Minutes'], ['occurrences', 'Working sessions']]) {
        field(numeric, `recovery.${row.slotId}.${key}`, label, row.recovery, key, { max: WORK_DRAFT_TEXT_LIMIT, numeric: true });
      }
      field(recovery, `recovery.${row.slotId}.funding`, 'Funding', row.recovery, 'funding', { max: 16,
        options: () => [['additional', 'Extra investment'], ['allocated', 'Within funded time']] });
      field(recovery, `recovery.${row.slotId}.status`, 'Session', row.recovery, 'status', { max: 16,
        options: () => [['planned', 'Planned'], ['paused', 'Paused']] });
    }
    refresh(true);
    for (const card of groups.querySelectorAll('details')) card.open = openCards.has(card.dataset.templateCard);
    const focusTarget = stepPath ? [...groups.querySelectorAll('[data-template-step]')].find(node => node.dataset.templatePath === stepPath && node.dataset.templateStep === step)
      : focusPath ? controls.get(focusPath)?.input
        : focusRecovery ? [...groups.querySelectorAll('[data-template-recovery]')].find(node => node.dataset.templateRecovery === focusRecovery) : null;
    focusTarget?.focus({ preventScroll: true });
  }
  function request() {
    const relevant = path => {
      const [kind, slotId, field] = path.split('.');
      if (kind === 'recovery') return configuration.connections.find(row => row.slotId === slotId).recoveryEnabled;
      if (kind === 'teams' && field === 'label') return configuration.teams.find(row => row.slotId === slotId).selection === 'new';
      return true;
    };
    if ([...invalid].some(relevant)) throw new PlanError('text', 'template', 'Complete the marked fields to update this arrangement.');
    const template = BY_ID.get(configuration.templateId);
    const teams = configuration.teams.map(row => row.selection === 'new'
      ? { slotId: row.slotId, kind: 'new', label: row.label, personIds: [...row.personIds] }
      : { slotId: row.slotId, kind: 'existing', teamId: row.selection.slice(5), addPersonIds: [...row.personIds] });
    const connections = configuration.connections.map(row => {
      let recoveryWork = null;
      if (row.recoveryEnabled) {
        const parsed = prepareWorkDraftValues(row.recovery);
        if (parsed.errors.length) {
          for (const error of parsed.errors) mark(`recovery.${row.slotId}.${error.path.slice('draft.'.length)}`, error.message);
          throw new PlanError('fields', 'template', 'Correct the session duration or count.');
        }
        const selectedTeam = row.recovery.team.startsWith('slot:')
          ? teamId(configuration.teams.find(team => team.slotId === row.recovery.team.slice(5))) : row.recovery.team.slice(5);
        recoveryWork = { label: row.recovery.label, teamId: selectedTeam, personIds: [...row.recovery.personIds], ...parsed.admitted,
          funding: row.recovery.funding, status: row.recovery.status, timing: row.recovery.timing, lifecycle: row.recovery.lifecycle };
      }
      return { slotId: row.slotId, receiverPersonId: row.receiverPersonId || null, sharedObject: row.sharedObject,
        responseExpectation: row.responseExpectation.trim() || null, workIds: [...row.workIds], status: row.status, recoveryWork };
    });
    return { templateId: template.id, version: template.version, proposalId: configuration.proposalId, teams, connections };
  }
  function mark(path, message) {
    const control = controls.get(path); if (!control) return;
    control.error.textContent = message; control.input.setAttribute('aria-invalid', 'true');
  }
  function parkAndNotify(epoch) {
    const result = editing.park(); if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    onBegin(); if (!owns(epoch)) return false;
    onEditing(); return owns(epoch);
  }
  function settleText() { return pendingText && dirty ? commit() : true; }
  function navigate(target, source) {
    settleText();
    if (!disposed) onNavigate(target, source);
  }
  function selectArrangement(id) {
    if (!BY_ID.has(id)) return;
    if (id === configuration.templateId && currentArrangement() && !dirty) return;
    if (!active(canOpen) || (!active() && !open())) return;
    configurations.set(configuration.templateId, configuration);
    touch(); projection = studio.read();
    configuration = configurations.get(id) ?? startingConfiguration(BY_ID.get(id));
    configuration.proposalId = arrangementId ?? configuration.proposalId;
    build(); commit();
  }
  function commit({ preserveShared = false } = {}) {
    if (committing || !active()) return false;
    pendingText = false;
    const epoch = ++generation; retirePreview(); committing = true;
    try {
      if (!parkAndNotify(epoch)) return false;
      refresh();
      const base = studio.read(), acceptance = studio.readAcceptance(), draft = editing.read(), revision = rawRevision;
      const prepared = prepareCoordinationReplacement(base, request(), { preserveShared });
      const candidate = { prepared, base, acceptance, intent: draft.intent, revision };
      if (!owns(epoch) || !fresh(candidate)) return false;
      const result = applyCoordinationTemplate(studio, prepared);
      if (!owns(epoch)) return false;
      if (!result.ok) { announce(result.error.message); return false; }
      const changed = result.projection !== base;
      arrangementId = configuration.proposalId;
      projection = result.projection;
      if (changed) undoProjection = result.projection;
      receiveAccepted(); build();
      const intent = editing.read().intent;
      if (changed) onAccepted(result.projection);
      if (!owns(epoch) || studio.read() !== result.projection || editing.read().intent !== intent) return true;
      announce(changed ? `${BY_ID.get(configuration.templateId).label} arrangement updated. Undo is available.` : 'Arrangement is current.');
      return true;
    } catch (error) {
      if (!owns(epoch)) return false;
      if (!(error instanceof PlanError)) throw error;
      if (error.code === 'retained-record-choice') {
        proposal = { base: studio.read(), acceptance: studio.readAcceptance(), intent: editing.read().intent, revision: rawRevision };
        previewRegion.replaceChildren(element('p', 'Some arrangement records support other work. Keep those records and use separate records for this choice?'));
        previewRegion.hidden = false; preserveButton.hidden = false; cancelButton.hidden = false;
      }
      announce(error.message); return false;
    } finally { committing = false; }
  }
  function apply() {
    if (!active() || !proposal?.command) return false;
    const epoch = ++generation, held = proposal;
    if (!fresh(held)) { announce('The plan changed. Open this grouping again.'); return false; }
    const result = studio.applyCommand(held.command, held.base);
    if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    dirty = false; retirePreview(); refresh(); onAccepted(result.projection);
    if (owns(epoch)) announce('Grouping removed. Teams, connections and sessions remain.');
    return true;
  }
  function undo() {
    if (!active() || undoProjection !== studio.read()) return false;
    const epoch = ++generation;
    if (!parkAndNotify(epoch)) return false;
    const result = studio.undo(undoProjection);
    if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    undoProjection = null; dirty = false; retirePreview(); refresh(); onAccepted(result.projection);
    if (owns(epoch)) announce('Previous arrangement restored.');
    return true;
  }
  function detach(id) {
    if (!open()) return false;
    const epoch = ++generation; retirePreview();
    const base = studio.read(), row = base.state.arrangements.find(row => row.id === id);
    if (!row) { announce('Choose an arrangement still present in this plan.'); return false; }
    const command = { type: 'arrangement.remove', arrangementId: id }, result = studio.previewCommand(command, base);
    if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    const candidate = { command, base, acceptance: studio.readAcceptance(), intent: editing.read().intent, revision: rawRevision };
    if (!fresh(candidate)) return false;
    proposal = candidate;
    for (const element of [choiceLabel, description, arrangementDeck, customization]) element.hidden = true;
    applyButton.hidden = false; cancelButton.hidden = false;
    applyButton.textContent = 'Use connections without template';
    const template = getCoordinationTemplate(row.templateId, row.templateVersion);
    previewRegion.replaceChildren(element('h4', `Use ${template.label} connections without the template?`),
      element('p', 'Apply removes this arrangement’s grouping identity. Its teams, current connections and working sessions remain available, with the same accepted investment.'),
      element('p', `Accepted investment stays ${money(base.result.knownCommitmentCents)}${base.result.plannedCommitmentCents === null ? ' known; complete total unavailable' : ''}.`));
    previewRegion.hidden = false; applyButton.setAttribute('aria-disabled', 'false'); applyButton.focus(); return true;
  }
  function open() {
    if (!active(canOpen)) return false;
    const epoch = ++generation;
    if (!parkAndNotify(epoch)) return false;
    acknowledged = true; if (disclosure) panel.open = true; refresh(); return true;
  }
  function close() {
    if (disposed) return;
    generation += 1; acknowledged = false; if (disclosure && !exposed) panel.open = false;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation += 1; proposal = null; configuration = null;
    document.defaultView.clearTimeout(settleTimer); pendingText = false;
    cleanup.forEach(remove => remove()); reel.dispose(); bindings = new WeakMap(); controls.clear(); optionSources = []; dynamic = [];
    body.replaceChildren(); status.textContent = ''; if (disclosure) panel.open = false; panel.hidden = true; INSTANCES.delete(panel);
  }
  if (disclosure) listen(panel, 'toggle', () => {
    if (disposed || exposed) return;
    if (panel.open && !acknowledged) { if (!open() && !disposed) panel.open = false; }
    else if (!panel.open) acknowledged = false;
  });
  listen(form, 'focusin', event => {
    // Browsing the rack (including WebKit's scroll-region focus) keeps the
    // current record owner until an explicit rack action selects another one.
    if (event.target.closest('[data-template-rack], [data-studio-record-kind], [data-studio-session-id]')) return;
    if (exposed && !active() && active(canOpen)) open();
  });
  // Let a pointer's destination receive its click before a completed text edit
  // refreshes the rack. Keyboard blur and Enter can settle immediately.
  listen(document, 'pointerdown', event => { pointerDown = form.contains(event.target); });
  const finishPointer = () => {
    pointerDown = false;
    document.defaultView.clearTimeout(settleTimer);
    settleTimer = document.defaultView.setTimeout(() => {
      settleTimer = null;
      if (pendingText && dirty && !disposed) { pendingText = false; commit(); }
    }, 0);
  };
  listen(document, 'pointerup', finishPointer);
  listen(document, 'pointercancel', finishPointer);

  for (const type of ['input', 'change']) listen(form, type, event => {
    if (committing || !active()) return;
    if (event.target === choice && type === 'change') { selectArrangement(choice.value); return; }
    const binding = bindings.get(event.target);
    if (!binding) return;
    if (binding.event === type) {
      touch(); binding.update(); for (const update of dynamic) update();
      if (event.target.dataset.templateField?.startsWith('teams.')) for (const source of optionSources) if (source.dependsOnGroups) source.update();
    }
    if (type === 'change' && dirty) {
      if (binding.event === 'input' && pointerDown) pendingText = true;
      else commit();
    }
  });
  listen(form, 'keydown', event => {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT' || event.target.type === 'checkbox') return;
    event.preventDefault(); event.stopPropagation(); if (dirty) commit();
  });
  listen(form, 'submit', event => { event.preventDefault(); event.stopPropagation(); if (dirty) commit(); });
  listen(form, 'click', event => {
    const target = event.target.closest('[data-template-action]');
    if (!target || !form.contains(target) || !active()) return;
    event.preventDefault(); event.stopPropagation();
    const focusedAt = generation;
    target.focus();
    if (!owns(focusedAt) || !active()) return;
    switch (target.dataset.templateAction) {
      case 'apply': apply(); break;
      case 'undo': undo(); break;
      case 'preserve': if (fresh(proposal)) commit({ preserveShared: true }); break;
      case 'cancel':
        dirty = false; receiveAccepted(); retirePreview(); build(); announce('Current arrangement retained.'); break;
      case 'step': {
        const path = target.dataset.templatePath, control = controls.get(path);
        const stepped = stepWorkDraftValues(control.record, control.key, Number(target.dataset.templateStep));
        touch();
        if (stepped.error) { mark(path, stepped.error.message); announce(stepped.error.message); break; }
        Object.assign(control.record, stepped.raw);
        for (const [key, sibling] of controls) if (sibling.record === control.record && ['hoursPerSession', 'minutesPerSession', 'occurrences'].includes(sibling.key)) {
          sibling.input.value = control.record[sibling.key]; invalid.delete(key); sibling.error.textContent = ''; sibling.input.setAttribute('aria-invalid', 'false');
        }
        commit(); break;
      }
    }
  });
  configuration = startingConfiguration(TEMPLATES[0]); receiveAccepted(); build(); retirePreview(); panel.hidden = false;
  if (disclosure && exposed) panel.open = true;
  const controller = Object.freeze({ open, resume: open, close, detach, settleText,
    focus() { if (!disposed) reel.element.querySelector('[data-reel-choice][aria-pressed="true"]')?.focus(); },
    isOpen: () => !disposed && (disclosure ? panel.open : acknowledged), render: refresh, dispose });
  INSTANCES.set(panel, controller);
  return controller;
}
