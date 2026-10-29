import { LIMITS } from './config.mjs';
import { PlanError } from './contract.mjs';
import { listCoordinationTemplates, prepareCoordinationTemplate, applyCoordinationTemplate } from './connection-templates.mjs';
import { prepareWorkDraftValues, stepWorkDraftValues, WORK_DRAFT_TEXT_LIMIT } from './draft.mjs';
import { money } from './display.mjs';

const INSTANCES = new WeakMap();
const TEMPLATES = listCoordinationTemplates();
const BY_ID = new Map(TEMPLATES.map(row => [row.id, row]));
const sameAcceptance = (a, b) => a.instance === b.instance && a.token === b.token;
const named = row => `${row.label}${row.lifecycle === 'retired' ? ' · retired' : ''}`;
let nextInstance = 0;

// One bounded configuration and one prepared proposal belong to this receiver.
// Row drafts continue to use the shared coordinator and accepted state owner.
export function mountConnectionTemplatePanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {},
  onAccepted = () => {}, isActive = () => true, canOpen = isActive }) {
  const details = root.matches('[data-connection-templates]') ? root : root.querySelector('[data-connection-templates]');
  if (!details) throw new TypeError('Supply the coordination template disclosure.');
  if (INSTANCES.has(details)) return INSTANCES.get(details);
  if (!studio || !['read', 'readAcceptance', 'replace'].every(key => typeof studio[key] === 'function')
      || !editing || !['read', 'park'].every(key => typeof editing[key] === 'function')
      || ![onBegin, onEditing, onAccepted, isActive, canOpen].every(callback => typeof callback === 'function')) {
    throw new TypeError('Supply the Studio, its draft coordinator and receiver callbacks.');
  }
  const document = details.ownerDocument, body = details.querySelector('[data-connection-template-body]');
  const status = details.querySelector('[data-connection-template-status]'), summary = details.querySelector('summary');
  if (!body || !status || !summary) throw new TypeError('Supply the complete coordination template disclosure.');
  const instance = `connection-template-${++nextInstance}`, cleanup = [];
  let disposed = false, acknowledged = false, generation = 0, rawRevision = 0, configuration, proposal = null;
  let projection = studio.read(), bindings = new WeakMap(), controls = new Map(), optionSources = [], dynamic = [];
  const invalid = new Set();
  const optionPopulations = new WeakMap();
  let fieldSequence = 0;
  const form = document.createElement('form'); form.noValidate = true; form.className = 'native-connection-template__form';
  const choice = document.createElement('select'); choice.dataset.templateChoice = '';
  for (const template of TEMPLATES) choice.append(option(template.id, template.label));
  const choiceLabel = document.createElement('label'); choiceLabel.textContent = 'Arrangement'; choiceLabel.append(choice);
  const description = document.createElement('p'); description.className = 'native-coordination__hint';
  const groups = document.createElement('div'); groups.className = 'native-connection-template__groups';
  const previewRegion = document.createElement('section'); previewRegion.className = 'native-coordination__preview native-connection-template__preview';
  previewRegion.dataset.templatePreview = ''; previewRegion.hidden = true; previewRegion.setAttribute('aria-label', 'Arrangement preview');
  const actions = document.createElement('div'); actions.className = 'native-coordination__actions';
  const previewButton = button('Preview arrangement', 'preview'), applyButton = button('Apply arrangement', 'apply');
  const cancelButton = button('Cancel preview', 'cancel'), anotherButton = button('Start another arrangement', 'another');
  actions.append(previewButton, applyButton, cancelButton, anotherButton);
  form.append(choiceLabel, description, groups, previewRegion, actions); body.replaceChildren(form);
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
  function retirePreview() { proposal = null; previewRegion.hidden = true; previewRegion.replaceChildren(); applyButton.setAttribute('aria-disabled', 'true'); }
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
    // Each occupied prefix consumes at least one of these finitely many IDs.
    for (let number = 1; number <= teams.size + connections.size + work.size + 1; number += 1) {
      const prefix = `arrangement-${number}`;
      if (!template.teams.some(slot => teams.has(`${prefix}-team-${slot.id}`))
          && !template.connections.some(slot => connections.has(`${prefix}-connection-${slot.id}`) || work.has(`${prefix}-recovery-${slot.id}`))) return prefix;
    }
    throw new TypeError('The finite arrangement identity range was exhausted.');
  }
  function startingConfiguration(template) {
    const people = projection.state.people;
    return { templateId: template.id, proposalId: nextPrefix(template, projection.state),
      teams: template.teams.map((slot, index) => ({ slotId: slot.id, selection: 'new', label: slot.label,
        personIds: people.filter((row, position) => position % template.teams.length === index).map(row => row.id) })),
      connections: template.connections.map(slot => ({ slotId: slot.id, receiverPersonId: '', sharedObject: 'Working plan', responseExpectation: '',
        workIds: projection.state.work.length ? [projection.state.work[0].id] : [], status: 'active', recoveryEnabled: false,
        recovery: { label: 'Review the handoff', team: `slot:${slot.receiverSlotId}`, personIds: [], hoursPerSession: '1', minutesPerSession: '0',
          occurrences: '1', funding: 'additional', status: 'planned' } })),
    };
  }
  function teamId(row) { return row.selection === 'new' ? `${configuration.proposalId}-team-${row.slotId}` : row.selection.slice(5); }
  function teamLabel(row) {
    return row.selection === 'new' ? row.label : projection.state.teams.find(team => team.id === row.selection.slice(5))?.label ?? `${row.selection.slice(5)} · removed team`;
  }
  function selectedOptions(control, values, options, optional = false) {
    const list = optional ? [['', 'Unassigned'], ...options] : [...options];
    const current = new Set(list.map(([id]) => id)), selected = new Set(Array.isArray(values) ? values : [values]);
    for (const id of selected) if (id && !current.has(id)) list.push([id, `${id} · removed record`]);
    const previous = optionPopulations.get(control);
    const sameChoices = previous?.rows.length === list.length
      && list.every(([id, label], index) => previous.rows[index][0] === id && previous.rows[index][1] === label);
    let nodes = previous?.nodes;
    if (!sameChoices) {
      // Choices own their order and labels; raw selection has a separate lifetime.
      const rows = list.map(([id, label]) => [id, label]);
      nodes = rows.map(([id, label]) => { const node = option(id, label); node.selected = selected.has(id); return node; });
      control.replaceChildren(...nodes);
      optionPopulations.set(control, { rows, nodes });
    } else {
      for (const node of nodes) {
        const chosen = selected.has(node.value);
        if (node.selected !== chosen) node.selected = chosen;
      }
    }
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
  function refresh() {
    if (disposed) return;
    const next = studio.read(), changed = next !== projection;
    projection = next;
    if (changed) for (const source of optionSources) source.update();
    for (const update of dynamic) update();
    if (proposal && !fresh(proposal)) { applyButton.setAttribute('aria-disabled', 'true'); announce('The plan or edits changed. Preview this arrangement again.'); }
  }
  function build() {
    bindings = new WeakMap(); controls = new Map(); optionSources = []; dynamic = []; invalid.clear(); groups.replaceChildren();
    const template = BY_ID.get(configuration.templateId); choice.value = template.id; description.textContent = template.description;
    for (const row of configuration.teams) {
      const definition = template.teams.find(slot => slot.id === row.slotId), group = card(definition.label, `team:${row.slotId}`);
      field(group, `teams.${row.slotId}.selection`, 'Team', row, 'selection', { max: LIMITS.identifier + 5,
        options: () => [['new', 'Create a team'], ...projection.state.teams.map(team => [`team:${team.id}`, named(team)])] });
      const labelInput = field(group, `teams.${row.slotId}.label`, 'Team name', row, 'label', { max: LIMITS.label });
      const members = field(group, `teams.${row.slotId}.personIds`, 'People', row, 'personIds', { options: peopleOptions, multiple: true });
      dynamic.push(() => {
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
    refresh();
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
    const state = prepared.projection.state, summary = prepared.summary;
    const teamNames = new Map(state.teams.map(row => [row.id, row.label])), workNames = new Map(state.work.map(row => [row.id, row.label]));
    const people = new Map(state.people.map(row => [row.id, row.label])), list = element('ul');
    for (const id of summary.newTeamIds) {
      const row = state.teams.find(team => team.id === id);
      list.append(element('li', `New team: ${row.label}. People: ${row.personIds.map(personId => people.get(personId)).join(', ') || 'Unassigned'}.`));
    }
    for (const row of summary.memberships) list.append(element('li', `Add to ${teamNames.get(row.teamId)}: ${row.addedPersonIds.map(id => people.get(id)).join(', ')}.`));
    const newConnections = new Set(summary.newConnectionIds);
    for (const row of state.connections) if (newConnections.has(row.id)) list.append(element('li', `${teamNames.get(row.senderTeamId)} → ${teamNames.get(row.receiverTeamId)}: ${row.sharedObject}. ${row.status === 'paused' ? 'Paused' : 'Active'}.`));
    for (const id of summary.newRecoveryWorkIds) list.append(element('li', `New review session: ${workNames.get(id)}.`));
    if (!list.children.length) list.append(element('li', 'This arrangement already matches the plan.'));
    const total = element('output', money(summary.money.afterTotalCents)); total.dataset.templateTotal = '';
    const change = summary.money.totalDeltaCents === null ? `Known amount: ${money(summary.money.afterKnownCents)}. Add the missing rates to complete the total.`
      : `Current ${money(summary.money.beforeTotalCents)} · Change ${money(summary.money.totalDeltaCents)}`;
    previewRegion.replaceChildren(element('h4', 'Arrangement preview'), list, element('p', 'Total investment'), total, element('p', change));
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
      if (!fresh(candidate)) { announce('The plan or edits changed. Preview this arrangement again.'); return false; }
      proposal = candidate; renderPreview(prepared); announce('Preview ready. Apply to update the plan.'); return true;
    } catch (error) {
      if (!owns(epoch)) return false;
      if (!(error instanceof PlanError)) throw error;
      announce(error.code === 'identity-collision' ? 'This arrangement has different entries in the plan. Start another arrangement.' : error.message); return false;
    }
  }
  function apply() {
    if (!active()) return false;
    const epoch = ++generation, held = proposal;
    if (!fresh(held)) { applyButton.setAttribute('aria-disabled', 'true'); announce('Preview this arrangement against the current plan.'); return false; }
    const result = applyCoordinationTemplate(studio, held.prepared);
    if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    const intent = editing.read().intent;
    onAccepted(result.projection); if (!owns(epoch)) return false;
    if (studio.read() !== result.projection || editing.read().intent !== intent) return true;
    retirePreview(); refresh(); announce('Arrangement applied.'); return true;
  }
  function open() {
    if (!active(canOpen)) return false;
    const epoch = ++generation;
    if (!parkAndNotify(epoch)) return false;
    acknowledged = true; details.open = true; refresh(); return true;
  }
  function close() {
    if (disposed) return;
    generation += 1; acknowledged = false; details.open = false;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation += 1; proposal = null; configuration = null;
    cleanup.forEach(remove => remove()); bindings = new WeakMap(); controls.clear(); optionSources = []; dynamic = [];
    body.replaceChildren(); status.textContent = ''; details.open = false; details.hidden = true; INSTANCES.delete(details);
  }
  listen(details, 'toggle', () => {
    if (disposed) return;
    if (details.open && !acknowledged) { if (!open() && !disposed) details.open = false; }
    else if (!details.open) acknowledged = false;
  });
  for (const type of ['input', 'change']) listen(form, type, event => {
    if (!active()) return;
    if (event.target === choice && type === 'change') {
      const selected = BY_ID.get(choice.value);
      if (!selected) { choice.value = configuration.templateId; return; }
      touch(); projection = studio.read(); configuration = startingConfiguration(selected); build(); return;
    }
    const binding = bindings.get(event.target);
    if (!binding || binding.event !== type) return;
    touch(); binding.update(); for (const update of dynamic) update();
    if (event.target.dataset.templateField?.startsWith('teams.')) for (const source of optionSources) if (source.dependsOnGroups) source.update();
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
        refresh(); announce('Ready to preview another arrangement.'); break;
      case 'step': {
        const path = target.dataset.templatePath, control = controls.get(path);
        const stepped = stepWorkDraftValues(control.record, control.key, Number(target.dataset.templateStep));
        touch();
        if (stepped.error) { mark(path, stepped.error.message); announce(stepped.error.message); break; }
        Object.assign(control.record, stepped.raw);
        for (const [key, sibling] of controls) if (sibling.record === control.record && ['hoursPerSession', 'minutesPerSession', 'occurrences'].includes(sibling.key)) {
          sibling.input.value = control.record[sibling.key]; invalid.delete(key); sibling.error.textContent = ''; sibling.input.setAttribute('aria-invalid', 'false');
        }
        break;
      }
    }
  });
  configuration = startingConfiguration(TEMPLATES[0]); build(); retirePreview(); details.hidden = false;
  const controller = Object.freeze({ open, resume: open, close, isOpen: () => !disposed && details.open, render: refresh, dispose });
  INSTANCES.set(details, controller);
  return controller;
}
