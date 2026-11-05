import { createStudio } from './state.mjs';
import { createShowcasePlan } from './presets.mjs';
import { createDraftCoordinator } from './editing.mjs';
import { INTEGER, money } from './display.mjs';
import { mountTeamPanel } from './team-controller.mjs';
import { mountChapterShell } from './shell.mjs';
import { createStudioIcon } from './icons.mjs';
import { mountPurposePanel, PURPOSE_LABELS } from './purpose-controller.mjs';
import { mountInvestmentPanel } from './investment-controller.mjs';
import { mountAssemblyPanel } from './assembly-controller.mjs';
import { describeAssemblyTarget, makeAssemblyTarget, describeSessionTarget, describeRoleTarget, describeContributionTarget, describeConnectionTarget } from './command-draft.mjs';
import { mountWorkPanel } from './work-controller.mjs';
import { mountResponsibilityPanel, RESPONSIBILITY_LABELS, responsibilityValue } from './responsibility-controller.mjs';
import { mountConnectionPanel, CONNECTION_LABELS } from './connection-controller.mjs';
import { mountConnectionView } from './connection-view.mjs';
import { mountConnectionTemplatePanel } from './connection-template-controller.mjs';
import { mountCapabilityPanel } from './capability-controller.mjs';
import { describeCapabilityTarget } from './capability-draft.mjs';
import { getCapabilityDefinition } from './capabilities.mjs';
import { mountChangePanel } from './change-controller.mjs';
import { summarizeChangeDraft } from './change-draft.mjs';

const INSTANCES = new WeakMap();
const TARGET_READERS = Object.freeze({ assembly: describeAssemblyTarget, session: describeSessionTarget,
  role: describeRoleTarget, contribution: describeContributionTarget, connection: describeConnectionTarget, capability: describeCapabilityTarget });

export function mountCoordinationPanel(root, options = {}) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const { studio = createStudio(), workId = 'review' } = options;
  const document = root.ownerDocument;
  const window = document.defaultView;
  const requireElement = selector => {
    const element = root.querySelector(selector);
    if (!element) throw new TypeError('Supply the complete native coordination panel.');
    return element;
  };
  const elements = Object.fromEntries([
    ['total', '[data-native-total]'], ['standing', '[data-native-standing]'],
    ['funded', '[data-native-funded]'], ['additional', '[data-native-additional]'],
    ['allocated', '[data-native-allocated]'],
    ['traceList', '[data-native-trace-list]'],
    ['traceSummary', '[data-native-trace-summary]'], ['status', '[data-native-status]'],
    ['saved', '[data-native-saved]'], ['savedCount', '[data-native-saved-count]'],
    ['savedList', '[data-native-saved-list]'],
    ['fallback', '[data-native-fallback]'],
  ].map(([name, selector]) => [name, requireElement(selector)]));
  const editing = createDraftCoordinator(studio);
  const editor = editing.session;
  const cleanup = [];
  let renderedProjection = null;
  let disposed = false;
  let renderGeneration = 0;
  let workPanel = null;
  let teamPanel = null;
  let chapterShell = null;
  let purposePanel = null;
  let investmentPanel = null;
  let assemblyPanel = null;
  let responsibilityPanel = null;
  let connectionPanel = null;
  let connectionView = null;
  let templatePanel = null;
  let capabilityPanel = null;
  let changePanel = null;
  let coordinationEditor = 'session';
  let peopleEditor = 'person';
  let activeChapter = 'coordination';
  let renderedSaved = [];
  let savedProjection = null;
  const savedByKey = new Map();
  const returnRoutes = [];
  const returnRegion = root.querySelector('[data-native-return-route]');
  const returnNote = returnRegion?.querySelector('[data-native-return-note]');
  const returnButton = returnRegion?.querySelector('[data-native-return-action]');
  const returnTeamButton = returnRegion?.querySelector('[data-native-return-team]');
  let pendingReturnFocus = null;

  function listen(target, type, handler) {
    target.addEventListener(type, handler);
    cleanup.push(() => target.removeEventListener(type, handler));
  }

  function text(name, value) { elements[name].textContent = value; }
  function announce(message) { text('status', message); }
  function resumePeople() {
    if (peopleEditor === 'assembly') assemblyPanel?.resume();
    else if (peopleEditor === 'responsibility') responsibilityPanel?.resume();
    else teamPanel?.resume();
  }
  function resumeCoordination() {
    if (coordinationEditor === 'connection') connectionPanel?.resume();
    else if (coordinationEditor === 'template') templatePanel?.resume();
    else workPanel?.resume();
  }
  function beginCoordination(kind) {
    if (disposed) return;
    coordinationEditor = kind;
    purposePanel?.close({ resume: false });
    if (kind !== 'session') workPanel?.close({ park: false });
    if (kind !== 'connection') connectionPanel?.close({ park: false });
    if (kind !== 'template') templatePanel?.close();
  }

  function renderReturnRoute() {
    const drafts = editing.read();
    const retained = route => drafts.active?.kind === route.kind && drafts.active.targetId === route.target
      || drafts.parked.some(record => record.kind === route.kind && record.targetId === route.target);
    for (let index = returnRoutes.length - 1; index >= 0; index -= 1) {
      const route = returnRoutes[index], descriptor = TARGET_READERS[route.kind]?.(route.target);
      if (route.held && !retained(route) || !route.held && descriptor?.mode !== 'create' && descriptor
        && !studio.read().state[descriptor.collection].some(row => row.id === descriptor.id)) returnRoutes.splice(index, 1);
    }
    if (pendingReturnFocus && !retained(pendingReturnFocus)) pendingReturnFocus = null;
    if (!returnRegion || !returnNote || !returnButton) return;
    const route = returnRoutes.at(-1);
    returnRegion.hidden = !route;
    if (returnTeamButton) returnTeamButton.hidden = true;
    if (!route) return;
    const state = studio.read().state;
    const collection = { person: 'people', team: 'teams', session: 'work' }[route.createdKind];
    const created = collection ? state[collection].find(row => row.id === route.createdId) : null;
    const createdLabel = created?.label;
    const team = state.teams.find(row => row.id === route.requiredTeamId);
    const needsMembership = route.createdKind === 'person' && created && team && !team.personIds.includes(route.createdId);
    const destination = { session: 'session', connection: 'connection', assembly: 'team', contribution: 'contribution', template: 'arrangement', capability: 'card', change: 'change plan' }[route.kind];
    returnButton.textContent = `Return to ${destination}`;
    returnNote.textContent = createdLabel
      ? `${createdLabel} is ready. Return to review your saved entries and choose ${route.createdKind === 'person' ? 'this person' : route.createdKind === 'session' ? 'this session' : 'this team'}.`
      : `Your ${destination} entries are saved while you ${route.creating === 'team' ? 'create a team' : route.creating === 'session' ? 'add a session' : 'add a person'}.`;
    if (route.inspectedWorkId) returnNote.textContent = `Review the supporting session, then return to your ${destination} and its saved entries.`;
    if (route.createdId && !created) returnNote.textContent = `The added ${route.createdKind} is outside the current plan. Your ${destination} entries remain saved. Return to choose an available ${route.createdKind} or create another.`;
    if (createdLabel && route.field && route.createdKind === 'team') returnNote.textContent = `${createdLabel} is ready. Return to review your saved entries and select it as the ${route.field === 'senderTeamId' ? 'sending team' : route.field === 'receiverTeamId' ? 'receiving team' : 'session team'}.`;
    if (needsMembership && returnTeamButton) {
      returnNote.textContent = `${createdLabel} is ready. Include them in ${team.label}, then return to choose them as the receiving person.`;
      returnTeamButton.hidden = false; returnTeamButton.textContent = `Add ${createdLabel} to ${team.label}`;
    }
  }
  function retainReturnAncestors(kind, target) {
    const repeated = returnRoutes.findIndex(route => route.kind === kind && route.target === target);
    if (repeated >= 0) { returnRoutes.splice(repeated); return; }
    const descriptor = TARGET_READERS[kind]?.(target);
    const parent = returnRoutes.findLastIndex(route => {
      const destinationKind = route.creating === 'session' ? 'session' : 'assembly';
      return destinationKind === kind && (route.creationTarget === target
        || route.createdId && descriptor?.id === route.createdId
          && descriptor.collection === (route.creating === 'person' ? 'people' : route.creating === 'team' ? 'teams' : 'work'))
        || kind === 'assembly' && route.continuationTarget === target;
    });
    // Return routes describe the current detour. Saved drafts keep their own
    // recovery owner when a visitor starts a different task or resumes an ancestor.
    returnRoutes.splice(parent + 1);
  }
  function createPrerequisite(button) {
    const kind = button.dataset.nativeReturn, creating = button.dataset.nativeCreate;
    if (!['session', 'connection', 'assembly', 'contribution', 'template', 'capability', 'change'].includes(kind) || !['person', 'team', 'session'].includes(creating)) return;
    const view = kind === 'template' ? null : editing[kind].read();
    const target = view?.draft?.[{ session: 'sessionId', connection: 'connectionId', assembly: 'assemblyId', contribution: 'contributionId', capability: 'capabilityId', change: 'changeId' }[kind]];
    if (kind !== 'template' && !target) { announce('Open the settings you want to continue, then add what they need.'); return; }
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const held = editing.read().parked.some(record => record.kind === kind && record.targetId === target);
    chapterShell?.select(creating === 'session' ? 'coordination' : 'people');
    const result = creating === 'session' ? workPanel?.create() : assemblyPanel?.create(`${creating}.create`);
    if (!result?.ok) { announce(result?.error?.message ?? 'Open People to add this record.'); render(); return; }
    pendingReturnFocus = null;
    retainReturnAncestors(kind, target);
    returnRoutes.push({ kind, target, creating, held, creationTarget: result.view.draft.assemblyId ?? result.view.draft.sessionId,
      field: button.dataset.nativeReturnField ?? (kind === 'session' && creating === 'team' ? 'teamId' : kind === 'connection' && creating === 'person' ? 'receiverPersonId' : null),
      requiredTeamId: kind === 'connection' && creating === 'person' ? view.draft.raw.receiverTeamId : null });
    renderReturnRoute();
    announce(`Your ${kind === 'assembly' ? 'team' : kind === 'template' ? 'arrangement' : kind} entries are saved.`);
  }
  function returnToDraft() {
    const route = returnRoutes.at(-1);
    if (!route) return;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    chapterShell?.select(route.kind === 'change' ? 'change' : route.kind === 'capability' ? 'work' : ['assembly', 'contribution'].includes(route.kind) ? 'people' : 'coordination');
    if (route.kind === 'template') {
      if (!templatePanel?.open()) return;
      returnRoutes.pop(); render(); renderReturnRoute();
      root.querySelector('[data-template-choice]')?.focus();
      announce('Your arrangement entries are ready. Choose the added person and preview the arrangement.');
      return;
    }
    const panel = { session: workPanel, connection: connectionPanel, assembly: assemblyPanel, contribution: responsibilityPanel, capability: capabilityPanel, change: changePanel }[route.kind];
    const result = panel.open(route.target);
    if (!result?.view?.draft) { announce(result?.error?.message ?? 'Choose an existing record to continue.'); return; }
    pendingReturnFocus = route.field ? { kind: route.kind, target: route.target, field: route.field } : null;
    returnRoutes.pop(); render(); renderReturnRoute();
    focusReturnedField();
    announce(result.view.status === 'stale' ? 'Your entries are here. Review them against the updated plan, then continue.' : 'Your entries are ready to continue.');
  }
  function inspectSupportingWork(kind, id, origin) {
    const target = origin?.targetId;
    if (!target || (kind === 'capability' ? !describeCapabilityTarget(target) : target !== 'change') || !studio.read().state.work.some(row => row.id === id)) return;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const held = editing.read().parked.some(record => record.kind === kind && record.targetId === target);
    chapterShell?.select('coordination');
    const result = workPanel?.select(id, false);
    if (!result?.ok) { announce(result?.error?.message ?? 'Choose a current working session.'); return; }
    retainReturnAncestors(kind, target);
    returnRoutes.push({ kind, target, held, inspectedWorkId: id });
    render(); root.querySelector('[data-native-session-select]')?.focus();
  }
  function prerequisiteCreated(descriptor) {
    const route = returnRoutes.at(-1);
    if (!route || (describeAssemblyTarget(route.creationTarget) ?? describeSessionTarget(route.creationTarget))?.id !== descriptor.id) return;
    route.createdId = descriptor.id;
    route.createdKind = descriptor.collection === 'people' ? 'person' : descriptor.collection === 'work' ? 'session' : 'team';
    renderReturnRoute();
  }

  function addCreatedPersonToTeam() {
    const route = returnRoutes.at(-1), team = studio.read().state.teams.find(row => row.id === route?.requiredTeamId);
    const person = studio.read().state.people.find(row => row.id === route?.createdId);
    if (!route || !team || !person) return;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    chapterShell?.select('people');
    const target = makeAssemblyTarget('team.update', team.id);
    const result = assemblyPanel?.open(target);
    if (!result?.ok || result.view.status !== 'editing') { announce(`Review the saved team entries, then select ${person.label}.`); return; }
    route.continuationTarget = target;
    const ids = result.view.draft.raw.personIds;
    if (!ids.includes(route.createdId)) editing.assembly.setIds(result.view.draft.token, 'personIds', [...ids, route.createdId]);
    render();
    root.querySelector('[data-assembly-apply]')?.focus();
    announce(`Review the selected people, then Apply team to include ${person.label}.`);
  }
  function focusReturnedField() {
    if (!pendingReturnFocus) return;
    const request = pendingReturnFocus;
    const { kind, target, field } = request, view = editing[kind].read();
    const key = { session: 'sessionId', connection: 'connectionId', contribution: 'contributionId', assembly: 'assemblyId', capability: 'capabilityId', change: 'changeId' }[kind];
    if (view.status !== 'editing' || view.draft?.[key] !== target) return;
    const scope = { session: '[data-native-session-editor]', connection: '[data-native-connection-editor]', contribution: '[data-responsibility-configure="contribution"]', assembly: '[data-assembly-form]', capability: '[data-capability-form]', change: '[data-change-form]' }[kind];
    const form = root.querySelector(scope), input = form?.querySelector(`[name="${field}"]`);
    if (!input) return;
    if (kind === 'capability' || kind === 'change') {
      for (let ancestor = input.parentElement; ancestor && ancestor !== form; ancestor = ancestor.parentElement) {
        if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      }
    }
    input.focus();
    if (pendingReturnFocus === request && root.ownerDocument.activeElement === input) pendingReturnFocus = null;
  }

  function renderSaved(projection) {
    const records = editing.read().parked;
    if (projection === savedProjection && records.length === renderedSaved.length
      && records.every((record, index) => record.token === renderedSaved[index])) return;
    renderedSaved = records.map(record => record.token);
    savedProjection = projection;
    savedByKey.clear();
    elements.saved.hidden = records.length === 0;
    text('savedCount', String(records.length));
    const fragment = document.createDocumentFragment();
    const labels = { hoursPerSession: 'Hours per session', minutesPerSession: 'Minutes per session', occurrences: 'Working sessions',
      ratePerHour: 'Hourly rate · USD', fundedHours: 'Funded hours', fundedMinutes: 'Funded minutes',
      label: 'Name', personIds: 'People', teamId: 'Team', funding: 'Funding', status: 'Status', ...PURPOSE_LABELS, ...RESPONSIBILITY_LABELS, ...CONNECTION_LABELS };
    const people = new Map(projection.state.people.map(person => [person.id, person.label]));
    const works = new Map(projection.state.work.map(row => [row.id, row.label]));
    const teams = new Map(projection.state.teams.map(row => [row.id, row.label]));
    const contributions = new Map(projection.state.contributions.map(row => [row.id, responsibilityValue('categoryId', row.categoryId)]));
    const connections = new Map(projection.state.connections.map(row => [row.id, row.sharedObject]));
    const collectionLabels = { people, teams, work: works, contributions, connections };
    function savedTitle(record, target) {
      if (target) {
        if (record.kind === 'capability') return `${target.definition.action} · ${target.id}`;
        const enteredName = record.raw.label?.trim();
        if (enteredName) return enteredName;
        const currentName = collectionLabels[target.collection]?.get(target.id);
        if (currentName) return currentName;
        if (record.kind === 'contribution') return responsibilityValue('categoryId', record.raw.categoryId);
        if (record.kind === 'connection') return record.raw.sharedObject?.trim() || 'New connection';
        return 'New record';
      }
      if (record.kind === 'purpose') return 'Plan purpose';
      if (record.kind === 'change') return 'Change planning';
      const names = record.kind === 'person' ? people : works;
      return names.get(record.targetId) ?? record.targetId;
    }
    function savedValue(field, raw) {
      if (Array.isArray(raw)) {
        if (field === 'prerequisites') return raw.map(value => {
          const [kind, id] = value.split('/'), row = projection.state[kind === 'ability' ? 'abilities' : 'practices'].find(row => row.id === id);
          return row ? getCapabilityDefinition(kind, row.definitionId, row.definitionVersion).action : id;
        }).join(', ') || 'None selected';
        const names = field === 'workIds' || field.startsWith('support.') ? works : people;
        return raw.map(id => names.get(id) ?? id).join(', ') || 'None selected';
      }
      if (['teamId', 'senderTeamId', 'receiverTeamId'].includes(field)) return (teams.get(raw) ?? raw) || 'Choose a team';
      if (field === 'receiverPersonId' || field === 'decisionOwnerPersonId') return (people.get(raw) ?? raw) || 'Unassigned';
      if (Object.hasOwn(RESPONSIBILITY_LABELS, field)) return responsibilityValue(field, raw);
      return raw || 'blank';
    }
    for (const record of records) {
      const key = `${record.kind}:${record.targetId}`;
      savedByKey.set(key, record);
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const target = Object.hasOwn(TARGET_READERS, record.kind) ? TARGET_READERS[record.kind](record.targetId) : null;
      title.textContent = savedTitle(record, target);
      const values = document.createElement('p');
      const entries = Object.entries(record.raw).filter(([field, raw]) => record.kind !== 'capability'
        || (raw !== '' && raw !== 'no' && (!Array.isArray(raw) || raw.length)
          && (!field.startsWith('new.') || record.raw[`new.${field.split('.')[1]}.enabled`] === 'yes')));
      values.textContent = record.kind === 'change' ? summarizeChangeDraft(record.raw)
        : entries.map(([field, raw]) => `${target?.fields?.[field]?.label ?? labels[field] ?? field}: ${savedValue(field, raw)}`).join(' · ');
      item.append(title, values);
      if (!record.targetExists && !target) {
        const removed = document.createElement('p');
        removed.textContent = 'Record removed. The saved values remain here.';
        item.append(removed);
      } else if (['assembly', 'session', 'purpose', 'person', 'role', 'contribution', 'connection', 'capability', 'change'].includes(record.kind)) {
        const open = document.createElement('button');
        open.type = 'button'; open.dataset.savedOpen = key; open.textContent = 'Open edit';
        item.append(open);
      }
      const discard = document.createElement('button');
      discard.type = 'button'; discard.dataset.savedDiscard = key; discard.textContent = 'Discard edit';
      item.append(discard);
      fragment.append(item);
    }
    elements.savedList.replaceChildren(fragment);
  }

  function renderShowcase(state) {
    const showcase = root.querySelector('[data-native-showcase]');
    if (showcase) {
      showcase.hidden = state.planId !== 'service-request-pilot';
      for (const [action, available] of [
        ['review', state.work.some(row => row.id === 'review')],
        ['readiness', state.connections.some(row => row.id === 'readiness')],
      ]) {
        const button = showcase.querySelector(`[data-native-showcase-action="${action}"]`);
        if (button) { button.hidden = !available; button.disabled = !available; }
      }
      const baseline = showcase.querySelector('[data-native-showcase-action="baseline"]');
      if (baseline) { baseline.textContent = studio.readBaseline() ? 'Replace baseline' : 'Save baseline'; baseline.disabled = false; }
    }
  }

  function renderAccepted(projection) {
    if (projection === renderedProjection) return;
    const { state, result } = projection;
    text('total', money(result.knownCommitmentCents));
    text('standing', result.standing === 'priced' ? 'Total · USD' : 'Known total · USD');
    text('funded', money(result.fundedKnownCents));
    text('additional', money(result.additionalKnownCents));
    text('allocated', money(result.allocatedKnownCents));
    const people = new Map(state.people.map(person => [person.id, person]));
    const staffing = new Map(result.staffing.map(line => [line.personId, line.cents]));
    const fragment = document.createDocumentFragment();
    for (const capacity of result.capacity) {
      const person = people.get(capacity.personId);
      const item = document.createElement('li');
      const heading = document.createElement('h4');
      heading.textContent = person.label;
      const rate = document.createElement('p');
      rate.textContent = person.rateCentsPerHour === null ? 'Hourly rate needed' : `${money(person.rateCentsPerHour)} per hour`;
      const ledger = document.createElement('dl');
      for (const [label, minutes, cents] of [
        ['Staffing', capacity.fundedMinutes, staffing.get(person.id)],
        ['Extra work', capacity.additionalMinutes, capacity.additionalCents],
        ['Included in staffing', capacity.allocatedMinutes, capacity.allocatedCents],
      ]) {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        term.textContent = label;
        const value = document.createElement('dd');
        value.textContent = `${INTEGER.format(minutes)} min · ${money(cents)}`;
        row.append(term, value);
        ledger.append(row);
      }
      item.append(heading, rate, ledger);
      fragment.append(item);
    }
    elements.traceList.replaceChildren(fragment);
    text('traceSummary', `Staffing ${money(result.fundedKnownCents)} + extra work ${money(result.additionalKnownCents)} = ${money(result.knownCommitmentCents)} total. Work included in staffing: ${money(result.allocatedKnownCents)}.`);
    renderedProjection = projection;
  }

  function render() {
    if (disposed) return editor.read();
    const epoch = ++renderGeneration;
    const current = () => !disposed && renderGeneration === epoch;
    const view = workPanel?.refresh() ?? editor.read();
    if (!current()) return editor.read();
    renderAccepted(view.projection);
    renderShowcase(view.projection.state);
    renderSaved(view.projection);
    renderReturnRoute();
    root.dataset.nativeState = view.status;
    teamPanel?.refresh();
    if (!current()) return editor.read();
    assemblyPanel?.refresh();
    if (!current()) return editor.read();
    responsibilityPanel?.refresh();
    if (!current()) return editor.read();
    connectionPanel?.refresh();
    if (!current()) return editor.read();
    connectionView?.refresh(studio.read());
    if (!current()) return editor.read();
    const selectedConnection = connectionPanel?.selection();
    if (selectedConnection && selectedConnection !== connectionView?.read().selectedId) connectionView?.select(selectedConnection);
    templatePanel?.render();
    if (!current()) return editor.read();
    purposePanel?.refresh();
    if (!current()) return editor.read();
    investmentPanel?.refresh();
    capabilityPanel?.refresh();
    changePanel?.refresh();
    return view;
  }

  function click(event) {
    const changeLink = event.target.closest('[data-native-open-change]');
    if (changeLink && root.contains(changeLink)) {
      event.preventDefault(); chapterShell?.select('change');
      root.querySelector('[data-change-frameworks] select')?.focus(); return;
    }
    const capabilityLink = event.target.closest('[data-native-open-capabilities]');
    if (capabilityLink && root.contains(capabilityLink)) {
      event.preventDefault(); chapterShell?.select('work');
      root.querySelector('[data-capability-action="select"]')?.focus(); return;
    }
    const button = event.target.closest('button');
    if (!button || !root.contains(button) || button.disabled) return;
    if (button.dataset.nativeShowcaseAction && studio.read().state.planId === 'service-request-pilot') {
      const action = button.dataset.nativeShowcaseAction;
      if (action === 'baseline') {
        const result = studio.setBaseline(studio.read());
        investmentPanel?.refresh();
        button.textContent = studio.readBaseline() ? 'Replace baseline' : 'Save baseline';
        announce(result.ok ? 'Baseline saved. Apply a change, then compare it in Investment.' : result.error.message);
        return;
      }
      const parked = editing.park();
      if (!parked.ok) { announce(parked.error.message); return; }
      chapterShell?.select('coordination');
      const result = action === 'review' ? workPanel?.select('review', false)
        : action === 'readiness' ? connectionPanel?.select('readiness') : null;
      render();
      if (result?.ok && action === 'review') {
        const knob = root.querySelector('[data-native-minutes-knob]');
        (knob && !knob.disabled ? knob : root.querySelector('[data-native-session-editor] [name="minutesPerSession"]'))?.focus();
      }
      if (result?.view?.status === 'stale') announce('Your saved entries are here. Review them against the current plan, then continue.');
      return;
    }
    if (button.hasAttribute('data-native-create')) { createPrerequisite(button); return; }
    if (button.hasAttribute('data-native-return-action')) { returnToDraft(); return; }
    if (button.hasAttribute('data-native-return-team')) { addCreatedPersonToTeam(); return; }
    if (['review', 'use-current', 'useCurrent', 'current'].includes(button.dataset.action ?? button.dataset.sessionAction ?? button.dataset.connectionAction ?? button.dataset.responsibilityAction ?? button.dataset.assemblyAction ?? button.dataset.capabilityAction ?? button.dataset.changeAction)) focusReturnedField();
    if (button.dataset.savedDiscard) {
      const saved = savedByKey.get(button.dataset.savedDiscard);
      if (!saved) return;
      const result = editing.discard(saved.token);
      if (result.ok) {
        for (let index = returnRoutes.length - 1; index >= 0; index -= 1)
          if (returnRoutes[index].kind === saved.kind && returnRoutes[index].target === saved.targetId) returnRoutes.splice(index, 1);
        if (pendingReturnFocus?.kind === saved.kind && pendingReturnFocus.target === saved.targetId) pendingReturnFocus = null;
      }
      render();
      announce(result.ok ? 'Saved edit discarded.' : result.error.message);
      (elements.savedList.querySelector('button')
        ?? root.querySelector('[data-native-chapter][aria-selected="true"]') ?? root.querySelector('[data-native-configure] > summary')).focus();
      return;
    }
    if (button.dataset.savedOpen) {
      const saved = savedByKey.get(button.dataset.savedOpen);
      if (!saved) return;
      let opened;
      if (saved.kind === 'purpose') purposePanel?.open();
      else {
        purposePanel?.close({ resume: false });
        chapterShell?.select(saved.kind === 'change' ? 'change' : saved.kind === 'capability' ? 'work' : ['person', 'assembly', 'role', 'contribution'].includes(saved.kind) ? 'people' : 'coordination');
        if (saved.kind === 'assembly') opened = assemblyPanel?.open(saved.targetId);
        else if (saved.kind === 'person') teamPanel?.select(saved.targetId);
        else if (saved.kind === 'session') opened = workPanel?.open(saved.targetId);
        else if (saved.kind === 'role' || saved.kind === 'contribution') opened = responsibilityPanel?.open(saved.targetId);
        else if (saved.kind === 'connection') opened = connectionPanel?.open(saved.targetId);
        else if (saved.kind === 'capability') opened = capabilityPanel?.open(saved.targetId);
        else if (saved.kind === 'change') opened = changePanel?.open(saved.targetId);
      }
      if (opened?.view?.draft?.[`${saved.kind}Id`] === saved.targetId) {
        const returned = returnRoutes.findIndex(route => route.kind === saved.kind && route.target === saved.targetId);
        if (returned >= 0) returnRoutes.splice(returned);
        pendingReturnFocus = null;
      }
      render();
      return;
    }
  }

  function dispose() {
    if (disposed) return editor.read();
    disposed = true;
    renderGeneration += 1;
    chapterShell?.dispose();
    connectionView?.dispose();
    connectionPanel?.dispose();
    templatePanel?.dispose();
    capabilityPanel?.dispose();
    changePanel?.dispose();
    workPanel?.dispose();
    investmentPanel?.dispose();
    purposePanel?.dispose();
    responsibilityPanel?.dispose();
    assemblyPanel?.dispose();
    teamPanel?.dispose();
    for (const release of cleanup) release();
    cleanup.length = 0;
    returnRoutes.length = 0; pendingReturnFocus = null; renderReturnRoute();
    editing.dispose();
    for (const button of root.querySelectorAll('[data-native-showcase-action]')) button.disabled = true;
    const view = editor.read();
    elements.fallback.hidden = false;
    elements.fallback.textContent = 'Editing closed.';
    delete root.dataset.nativeReady;
    root.dataset.nativeState = 'disposed';
    announce('Editing closed.');
    INSTANCES.delete(root);
    return view;
  }

  const receiver = Object.freeze({ read: () => workPanel?.read() ?? editor.read(), refresh: render, dispose });
  try {
    render();
    listen(root, 'click', click);
    listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
    listen(window, 'pageshow', () => render());
    workPanel = mountWorkPanel(requireElement('[data-native-session-editor]'), { studio, editing, workId,
      onBegin: () => beginCoordination('session'), onRecordCreated: prerequisiteCreated,
      isActive: () => activeChapter === 'coordination' && !purposePanel?.isOpen(),
      onAccepted: () => render(), onEditing: () => render(),
    });
    connectionView = mountConnectionView(requireElement('[data-native-connection-view]'), { projection: studio.read(),
      onSelect: id => { if (!disposed && connectionPanel?.select(id) === false) render(); } });
    connectionPanel = mountConnectionPanel(requireElement('[data-native-connection-editor]'), { studio, editing,
      onBegin: () => beginCoordination('connection'),
      canOpen: () => activeChapter === 'coordination' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'coordination' && coordinationEditor === 'connection' && !purposePanel?.isOpen(),
      onAccepted: () => render(), onEditing: () => render(),
    });
    templatePanel = mountConnectionTemplatePanel(requireElement('[data-connection-templates]'), { studio, editing,
      onBegin: () => beginCoordination('template'),
      canOpen: () => activeChapter === 'coordination' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'coordination' && coordinationEditor === 'template' && !purposePanel?.isOpen(),
      onAccepted: () => render(), onEditing: () => render(),
    });
    const teamRoot = root.querySelector('[data-native-team-editor]');
    if (teamRoot) teamPanel = mountTeamPanel(teamRoot, { studio, editing,
      onBegin: () => {
        peopleEditor = 'person';
        purposePanel?.close({ resume: false });
        assemblyPanel?.close({ park: false });
        responsibilityPanel?.close({ park: false });
      },
      canOpen: () => activeChapter === 'people' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'people' && peopleEditor === 'person' && !purposePanel?.isOpen(), onAccepted: () => render(),
      onEditing: () => render() });
    const assemblyRoot = root.querySelector('[data-native-assembly]');
    if (assemblyRoot) assemblyPanel = mountAssemblyPanel(assemblyRoot, { studio, editing,
      onBegin: () => {
        peopleEditor = 'assembly';
        purposePanel?.close({ resume: false });
        teamPanel?.close();
        responsibilityPanel?.close({ park: false });
      },
      canOpen: () => activeChapter === 'people' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'people' && peopleEditor === 'assembly' && !purposePanel?.isOpen(),
      onAccepted: () => render(), onEditing: () => render(),
      onRecordCreated: prerequisiteCreated,
      onPersonCreated: id => teamPanel?.select(id),
    });
    if (teamRoot) responsibilityPanel = mountResponsibilityPanel(teamRoot, { studio, editing,
      onBegin: () => {
        peopleEditor = 'responsibility';
        purposePanel?.close({ resume: false });
        teamPanel?.close();
        assemblyPanel?.close({ park: false });
      },
      canOpen: () => activeChapter === 'people' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'people' && peopleEditor === 'responsibility' && !purposePanel?.isOpen(),
      onAccepted: () => render(), onEditing: () => render(),
    });
    purposePanel = mountPurposePanel(requireElement('[data-native-purpose]'), { studio, editing,
      onOpen: () => { editing.park(); },
      onClose: () => {
        if (activeChapter === 'coordination') resumeCoordination();
        else if (activeChapter === 'people') resumePeople();
        else if (activeChapter === 'work') capabilityPanel?.resume();
        else if (activeChapter === 'change') changePanel?.resume();
      }, onChange: () => render() });
    const capabilityRoot = root.querySelector('[data-native-capabilities]');
    if (capabilityRoot) capabilityPanel = mountCapabilityPanel(capabilityRoot, { studio, editing,
      onBegin: () => { purposePanel?.close({ resume: false }); },
      canOpen: () => activeChapter === 'work' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'work' && !purposePanel?.isOpen(),
      onSourceWork: (id, origin) => inspectSupportingWork('capability', id, origin), onAccepted: () => render(), onEditing: () => render(),
    });
    const changeRoot = root.querySelector('[data-native-change]');
    if (changeRoot) changePanel = mountChangePanel(changeRoot, { studio, editing,
      onBegin: () => { purposePanel?.close({ resume: false }); },
      canOpen: () => activeChapter === 'change' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'change' && !purposePanel?.isOpen(),
      onSourceWork: (id, origin) => inspectSupportingWork('change', id, origin), onAccepted: () => render(), onEditing: () => render(),
    });
    investmentPanel = mountInvestmentPanel(requireElement('.native-investment'), { studio, editing, onChange: () => render() });
    const chapterList = root.querySelector('[data-native-chapter-list]');
    if (chapterList) {
      for (const button of chapterList.querySelectorAll('[data-native-chapter]')) {
        const icon = createStudioIcon(document, button.dataset.nativeChapter);
        button.prepend(icon);
        cleanup.push(() => icon.remove());
      }
      chapterShell = mountChapterShell(root, { onSelect: chapter => {
        purposePanel?.close({ resume: false });
        if (activeChapter !== chapter) editing.park();
        activeChapter = chapter;
        if (chapter === 'coordination') resumeCoordination();
        else if (chapter === 'people') resumePeople();
        else if (chapter === 'work') capabilityPanel?.resume();
        else if (chapter === 'change') changePanel?.resume();
        render();
      } });
    }
    elements.fallback.hidden = true;
    root.dataset.nativeReady = 'true';
    INSTANCES.set(root, receiver);
    return receiver;
  } catch (error) {
    dispose();
    throw error;
  }
}

if (typeof document !== 'undefined') {
  for (const root of document.querySelectorAll('[data-native-coordination]')) {
    try { mountCoordinationPanel(root, { studio: createStudio(createShowcasePlan()) }); }
    catch {
      const fallback = root.querySelector('[data-native-fallback]');
      if (fallback) { fallback.hidden = false; fallback.textContent = 'Editing is unavailable.'; }
    }
  }
}
