import { LIMITS } from './config.mjs';
import { PlanError } from './contract.mjs';
import { listCoordinationTemplates, prepareCoordinationTemplate, applyCoordinationTemplate } from './connection-templates.mjs';
import { prepareWorkDraftValues, stepWorkDraftValues, WORK_DRAFT_TEXT_LIMIT } from './draft.mjs';
import { money } from './display.mjs';
import { createArrangementReading, createArrangementTeamLanes } from './connection-view.mjs';
import { getCoordinationTemplate } from './coordination-arrangements.mjs';
import { createReel, revealReelResult } from './reel-control.mjs';
import { createLifecycleLanes, createSessionTracks } from './arrangement-surfaces.mjs';
import { revealStudioDestination } from './motion.mjs';

const INSTANCES = new WeakMap();
const TEMPLATES = listCoordinationTemplates();
const BY_ID = new Map(TEMPLATES.map(row => [row.id, row]));
const sameAcceptance = (a, b) => a.instance === b.instance && a.token === b.token;
const named = row => `${row.label}${row.lifecycle === 'retired' ? ' · retired' : ''}`;
let nextInstance = 0;

// One bounded configuration and one prepared proposal belong to this receiver.
// Row drafts continue to use the shared coordinator and accepted state owner.
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
  let projection = studio.read(), bindings = new WeakMap(), controls = new Map(), optionSources = [], dynamic = [];
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
  const amountLabel = element('dt', 'Accepted investment');
  const amount = element('output'); amount.dataset.templateTotal = '';
  const amountValue = element('dd'); amountValue.append(amount); readout.append(amountLabel, amountValue);
  rackHeading.append(rackTitle, readout);
  const rackBody = element('div', undefined, 'studio-team-rack__body');
  delivery.append(rackHeading, rackBody);
  const reel = createReel(document, { label: 'Team arrangement', choices: TEMPLATES, value: TEMPLATES[0].id,
    onSelect(id) {
      if (!active(canOpen) || (!active() && !open())) return;
      choice.value = id; choice.dispatchEvent(new document.defaultView.Event('change', { bubbles: true })); preview(); revealReelResult(structure);
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
  const cancelButton = button('Cancel preview', 'cancel'), anotherButton = button('Start another arrangement', 'another');
  actions.append(applyButton, cancelButton, anotherButton);
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
  function acceptedReadout() {
    const result = projection.result;
    amountLabel.textContent = result.plannedCommitmentCents === null ? 'Known accepted investment' : 'Accepted investment';
    amount.textContent = money(result.knownCommitmentCents);
  }
  function retirePreview() {
    proposal = null; previewRegion.hidden = true; previewRegion.replaceChildren(); applyButton.setAttribute('aria-disabled', 'false');
    acceptedReadout();
    applyButton.textContent = 'Apply arrangement';
    for (const element of [choiceLabel, description, arrangementDeck, customization]) element.hidden = false;
    anotherButton.hidden = false;
  }
  function touch() { rawRevision += 1; generation += 1; retirePreview(); announce(''); }
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
    return { templateId: template.id, proposalId: nextPrefix(template, projection.state),
      teams,
      connections: template.connections.map(slot => ({ slotId: slot.id, receiverPersonId: teams.find(team => team.slotId === slot.receiverSlotId).personIds[0] ?? '',
        sharedObject: slot.sharedObject ?? 'Working plan', responseExpectation: slot.responseExpectation ?? '',
        workIds: projection.state.work.length ? [projection.state.work[0].id] : [], status: 'active', recoveryEnabled: Boolean(slot.sessionLabel && people.length),
        recovery: { label: slot.sessionLabel ?? 'Review the handoff', team: `slot:${slot.receiverSlotId}`,
          personIds: teams.find(team => team.slotId === slot.receiverSlotId).personIds.slice(), hoursPerSession: '0', minutesPerSession: '30',
          occurrences: '1', funding: 'additional', status: 'planned' } })),
    };
  }
  function teamId(row) { return row.selection === 'new' ? `${configuration.proposalId}-team-${row.slotId}` : row.selection.slice(5); }
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
    const template = BY_ID.get(configuration.templateId);
    const teams = configuration.teams.map(row => ({ slotId: row.slotId, slotLabel: template.teams.find(slot => slot.id === row.slotId).label,
      team: { id: `proposal-slot-${row.slotId}`, label: teamLabel(row).trim() || 'Team name to choose', personIds: row.personIds } }));
    const connections = template.connections.map(slot => {
      const row = configuration.connections.find(row => row.slotId === slot.id);
      return { slotId: slot.id, slotLabel: slot.label, adapted: false,
        connection: { id: `proposal-edge-${slot.id}`, senderTeamId: `proposal-slot-${slot.senderSlotId}`, receiverTeamId: `proposal-slot-${slot.receiverSlotId}`,
          sharedObject: row.sharedObject, status: row.status, workIds: row.workIds } };
    });
    const arrangement = { id: configuration.proposalId, templateId: template.id, templateVersion: template.version, label: template.label, purpose: template.description, adapted: false, teams, connections };
    const proposedWork = configuration.connections.filter(row => row.recoveryEnabled).flatMap(row => {
      const parsed = prepareWorkDraftValues(row.recovery); if (parsed.errors.length) return [];
      return [{ id: `proposal-session-${row.slotId}`, label: row.recovery.label,
        teamId: row.recovery.team.startsWith('slot:') ? `proposal-slot-${row.recovery.team.slice(5)}` : row.recovery.team.slice(5),
        personIds: row.recovery.personIds, ...parsed.admitted, funding: row.recovery.funding, status: row.recovery.status }];
    });
    const previewPlan = { ...projection.state, teams: [...projection.state.teams, ...teams.map(row => row.team)], work: [...projection.state.work, ...proposedWork] };
    function inspectTemplate(target) {
      if (!active()) return;
      const kind = target.kind === 'template-team' ? 'team' : 'connection';
      const section = [...groups.querySelectorAll('[data-template-card]')].find(section => section.dataset.templateCard === `${kind}:${target.id}`);
      if (!section) return; customization.open = true; section.open = true;
      section.querySelector('input,select,button')?.focus({ preventScroll: true }); revealStudioDestination(section);
    }
    const inspectSession = id => {
      const proposed = configuration.connections.find(row => `proposal-session-${row.slotId}` === id);
      if (proposed) inspectTemplate({ kind: 'template-connection', id: proposed.slotId });
      else onNavigate({ kind: 'work', id });
    };
    structure.replaceChildren(createArrangementReading(document, { arrangement, plan: previewPlan, reading: 'proposed', onNavigate: inspectTemplate, includeTeamLanes: false }));
    const teamsHeading = element('h5', 'Proposed teams', 'studio-team-rack__section-title');
    const teamScroll = element('div', undefined, 'studio-team-rack__teams');
    teamScroll.setAttribute('role', 'region'); teamScroll.setAttribute('aria-label', 'Proposed teams and people'); teamScroll.tabIndex = 0;
    teamScroll.append(createArrangementTeamLanes(document, { arrangement, plan: previewPlan, reading: 'proposed', onNavigate: inspectTemplate }));
    const lifecycle = element('details', undefined, 'studio-team-rack__lifecycle');
    lifecycle.append(element('summary', 'Delivery lifecycle'), createLifecycleLanes(document, { plan: previewPlan, onSession: inspectSession }));
    rackBody.replaceChildren(teamsHeading, teamScroll,
      createSessionTracks(document, { plan: previewPlan, onSession: inspectSession,
        sessionIds: new Set(projection.state.work.map(work => work.id)),
        onAdd: () => onNavigate({ kind: 'create-session' }), label: 'Shared sessions · people who take part' }), lifecycle);
    onViewChanged();
  }
  function refresh(rebuild = false) {
    if (disposed) return;
    const next = studio.read(), changed = next !== projection;
    projection = next;
    if (!proposal) acceptedReadout();
    if (changed) for (const source of optionSources) source.update();
    for (const update of dynamic) update();
    if (changed || rebuild) renderStructure();
    if (proposal && !fresh(proposal)) { applyButton.setAttribute('aria-disabled', 'true'); announce('The plan or edits changed. Choose the arrangement again to refresh its proposal.'); }
  }
  function build() {
    bindings = new WeakMap(); controls = new Map(); optionSources = []; dynamic = []; invalid.clear(); groups.replaceChildren();
    const template = BY_ID.get(configuration.templateId); choice.value = template.id; reel.select(template.id); description.textContent = template.description;
    for (const row of configuration.teams) {
      const definition = template.teams.find(slot => slot.id === row.slotId), group = card(definition.label, `team:${row.slotId}`);
      field(group, `teams.${row.slotId}.selection`, 'Team', row, 'selection', { max: LIMITS.identifier + 5,
        options: () => [['new', 'Create a team'], ...projection.state.teams.map(team => [`team:${team.id}`, named(team)])] });
      const labelInput = field(group, `teams.${row.slotId}.label`, 'Team name', row, 'label', { max: LIMITS.label });
      const members = field(group, `teams.${row.slotId}.personIds`, 'People', row, 'personIds', { options: peopleOptions, multiple: true });
      const creationHelp = element('p', 'Choose the people, then Apply arrangement to add these teams and handoffs together.', 'native-coordination__hint');
      group.prepend(creationHelp);
      const addPerson = element('button', 'Add a person'); addPerson.type = 'button';
      addPerson.className = 'native-control--create native-control--navigate'; addPerson.dataset.nativeCreate = 'person'; addPerson.dataset.nativeReturn = 'template';
      group.append(addPerson);
      dynamic.push(() => {
        creationHelp.hidden = row.selection !== 'new';
        const selectedNames = row.personIds.map(id => projection.state.people.find(person => person.id === id)?.label ?? id);
        group.parentElement.querySelector('summary').textContent = `${definition.label} · ${row.selection === 'new' ? 'New team: ' : ''}${teamLabel(row)} · ${selectedNames.slice(0, 2).join(', ') || 'Choose people'}${selectedNames.length > 2 ? ` + ${selectedNames.length - 2} more` : ''}`;
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
  }
  function request() {
    const relevant = path => {
      const [kind, slotId, field] = path.split('.');
      if (kind === 'recovery') return configuration.connections.find(row => row.slotId === slotId).recoveryEnabled;
      if (kind === 'teams' && field === 'label') return configuration.teams.find(row => row.slotId === slotId).selection === 'new';
      return true;
    };
    if ([...invalid].some(relevant)) throw new PlanError('text', 'template', 'Correct the marked fields before previewing.');
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
          funding: row.recovery.funding, status: row.recovery.status, timing: null, lifecycle: 'active' };
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
  function renderPreview(prepared) {
    const summary = prepared.summary;
    amountLabel.textContent = summary.money.afterTotalCents === null ? 'Known whole-plan proposed investment' : 'Whole-plan proposed investment';
    amount.textContent = money(summary.money.afterTotalCents ?? summary.money.afterKnownCents);
    const change = summary.money.totalDeltaCents === null ? `Known investment ${money(summary.money.afterKnownCents)} · choose missing rates.`
      : `Current ${money(summary.money.beforeTotalCents)} · Change ${money(summary.money.totalDeltaCents)}`;
    previewRegion.replaceChildren(element('p', change));
    previewRegion.hidden = false; applyButton.setAttribute('aria-disabled', 'false');
  }
  function parkAndNotify(epoch) {
    const result = editing.park(); if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    onBegin(); if (!owns(epoch)) return false;
    onEditing(); return owns(epoch);
  }
  function preview() {
    if (!active()) return false;
    const epoch = ++generation; retirePreview();
    if (!parkAndNotify(epoch)) return false;
    refresh();
    const base = studio.read(), acceptance = studio.readAcceptance(), draft = editing.read(), revision = rawRevision;
    try {
      const prepared = prepareCoordinationTemplate(base, request());
      if (!owns(epoch)) return false;
      const candidate = { prepared, base, acceptance, intent: draft.intent, revision };
      if (!fresh(candidate)) { announce('The plan or edits changed. Choose the arrangement again to refresh its proposal.'); return false; }
      proposal = candidate; renderPreview(prepared); announce('Preview ready. Apply to update the plan.'); return true;
    } catch (error) {
      if (!owns(epoch)) return false;
      if (!(error instanceof PlanError)) throw error;
      announce(error.code === 'identity-collision' ? 'This arrangement has different entries in the plan. Start another arrangement.' : error.message); return false;
    }
  }
  function apply() {
    if (!active()) return false;
    if (!proposal && !preview()) return false;
    const epoch = ++generation, held = proposal;
    if (!fresh(held)) { announce('The plan changed. Choose the arrangement again to refresh its proposal.'); return false; }
    const result = held.command ? studio.applyCommand(held.command, held.base) : applyCoordinationTemplate(studio, held.prepared);
    if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    const intent = editing.read().intent;
    onAccepted(result.projection); if (!owns(epoch)) return false;
    if (studio.read() !== result.projection || editing.read().intent !== intent) return true;
    retirePreview(); refresh(); announce(held.command ? 'Template grouping removed. The teams, connections and sessions remain in the plan.' : 'Arrangement applied.'); return true;
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
    anotherButton.hidden = true;
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
    cleanup.forEach(remove => remove()); reel.dispose(); bindings = new WeakMap(); controls.clear(); optionSources = []; dynamic = [];
    body.replaceChildren(); status.textContent = ''; if (disclosure) panel.open = false; panel.hidden = true; INSTANCES.delete(panel);
  }
  if (disclosure) listen(panel, 'toggle', () => {
    if (disposed || exposed) return;
    if (panel.open && !acknowledged) { if (!open() && !disposed) panel.open = false; }
    else if (!panel.open) acknowledged = false;
  });
  listen(form, 'focusin', () => { if (exposed && !active() && active(canOpen)) open(); });
  for (const type of ['input', 'change']) listen(form, type, event => {
    if (!active()) return;
    if (event.target === choice && type === 'change') {
      const selected = BY_ID.get(choice.value);
      if (!selected) { choice.value = configuration.templateId; return; }
      touch(); projection = studio.read(); configurations.set(configuration.templateId, configuration);
      configuration = configurations.get(selected.id) ?? startingConfiguration(selected); configurations.set(selected.id, configuration); build(); return;
    }
    const binding = bindings.get(event.target);
    if (!binding || binding.event !== type) return;
    touch(); binding.update(); for (const update of dynamic) update();
    if (event.target.dataset.templateField?.startsWith('teams.')) for (const source of optionSources) if (source.dependsOnGroups) source.update();
    renderStructure();
  });
  listen(form, 'submit', event => { event.preventDefault(); event.stopPropagation(); preview(); });
  listen(form, 'click', event => {
    const target = event.target.closest('[data-template-action]');
    if (!target || !form.contains(target) || !active()) return;
    event.preventDefault(); event.stopPropagation();
    const focusedAt = generation;
    target.focus();
    if (!owns(focusedAt) || !active()) return;
    switch (target.dataset.templateAction) {
      case 'preview': preview(); break;
      case 'apply': apply(); break;
      case 'cancel': {
        const epoch = ++generation; retirePreview(); onEditing();
        if (owns(epoch)) announce('Preview cancelled.'); break;
      }
      case 'another':
        touch(); projection = studio.read(); configuration.proposalId = nextPrefix(BY_ID.get(configuration.templateId), projection.state);
        refresh(true); announce('Ready to preview another arrangement.'); break;
      case 'step': {
        const path = target.dataset.templatePath, control = controls.get(path);
        const stepped = stepWorkDraftValues(control.record, control.key, Number(target.dataset.templateStep));
        touch();
        if (stepped.error) { mark(path, stepped.error.message); announce(stepped.error.message); break; }
        Object.assign(control.record, stepped.raw);
        for (const [key, sibling] of controls) if (sibling.record === control.record && ['hoursPerSession', 'minutesPerSession', 'occurrences'].includes(sibling.key)) {
          sibling.input.value = control.record[sibling.key]; invalid.delete(key); sibling.error.textContent = ''; sibling.input.setAttribute('aria-invalid', 'false');
        }
        renderStructure();
        break;
      }
    }
  });
  configuration = startingConfiguration(TEMPLATES[0]); configurations.set(configuration.templateId, configuration); build(); retirePreview(); panel.hidden = false;
  if (disclosure && exposed) panel.open = true;
  const controller = Object.freeze({ open, resume: open, close, detach,
    focus() { if (!disposed) reel.element.querySelector('[data-reel-choice][aria-pressed="true"]')?.focus(); },
    isOpen: () => !disposed && (disclosure ? panel.open : acknowledged), render: refresh, dispose });
  INSTANCES.set(panel, controller);
  return controller;
}
