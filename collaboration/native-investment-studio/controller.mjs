import { resolveWorkSession } from './work-sessions.mjs';
import { createStudio } from './state.mjs';
import { createShowcasePlan, createQuarterShowcasePlan } from './presets.mjs';
import { createDraftCoordinator } from './editing.mjs';
import { duration, money } from './display.mjs';
import { mountTeamPanel } from './team-controller.mjs';
import { mountChapterShell } from './shell.mjs';
import { mountStudioMotion, revealStudioDestination } from './motion.mjs';
import { createStudioIcon } from './icons.mjs';
import { mountPurposePanel, PURPOSE_LABELS } from './purpose-controller.mjs';
import { mountInvestmentPanel } from './investment-controller.mjs';
import { mountStudioReports } from './reports-controller.mjs';
import { mountAssemblyPanel } from './assembly-controller.mjs';
import { describeAssemblyTarget, makeAssemblyTarget, describeSessionTarget, makeSessionTarget, describeRoleTarget, describeContributionTarget, makeContributionTarget, describeConnectionTarget, makeConnectionTarget } from './command-draft.mjs';
import { mountWorkPanel } from './work-controller.mjs';
import { syncSessionControls, mountRackEditor, mountRackHeader, mountEditorPlacement, captureRackEntry } from './rack-controls.mjs';
import { createRackRecord } from './rack-record-creation.mjs';
import { mountResponsibilityPanel, RESPONSIBILITY_LABELS, responsibilityValue } from './responsibility-controller.mjs';
import { mountConnectionPanel, CONNECTION_LABELS } from './connection-controller.mjs';
import { mountConnectionView } from './connection-view.mjs';
import { mountConnectionTemplatePanel } from './connection-template-controller.mjs';
import { mountCapabilityPanel } from './capability-controller.mjs';
import { describeCapabilityTarget } from './capability-draft.mjs';
import { getCapabilityDefinition } from './capabilities.mjs';
import { mountChangePanel } from './change-controller.mjs';
import { summarizeChangeDraft } from './change-draft.mjs';
import { mountAssurancePanel } from './assurance-controller.mjs';
import { summarizeAssuranceDraft } from './assurance-draft.mjs';
import { mountScorePanel } from './score-controller.mjs';
import { summarizeScoreDraft } from './score-draft.mjs';
import { hasReturnDraft, isReturnRouteRetained, returnRoutePrefixLength, resolveScoreDestination, resolveWorkEditorTarget, workDefaultsTarget, workSessionTarget } from './navigation-policy.mjs';

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
    ['traceTotals', '[data-native-trace-totals]'],
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
  let mounted = false;
  let resumingCoordination = false;
  let renderGeneration = 0;
  let workPanel = null;
  let teamPanel = null;
  let chapterShell = null;
  let motion = null;
  let purposePanel = null;
  let investmentPanel = null;
  let reportsPanel = null;
  let assemblyPanel = null;
  let responsibilityPanel = null;
  let connectionPanel = null;
  let connectionView = null;
  let templatePanel = null;
  let capabilityPanel = null;
  let changePanel = null;
  let assurancePanel = null;
  let scorePanel = null;
  let rackEditor = null;
  let openingRackKind = null;
  let localCreation = null, creationPlacement = null;
  let personDesk = null;
  const ampTools = root.querySelector('[data-native-amp-tools]');
  const ampUndo = document.createElement('button');
  ampUndo.type = 'button'; ampUndo.className = 'native-amp-control';
  ampUndo.dataset.studioUndo = ''; ampUndo.textContent = 'Undo (0)'; ampUndo.disabled = true;
  ampTools?.append(ampUndo);
  let ampHistoryProjection = null;
  const ampPanels = new Map([...root.querySelectorAll('[data-amp-panel]')].map(button =>
    [button.dataset.ampPanel, { button, panel: root.querySelector(`#${button.getAttribute('aria-controls')}`) }]));
  function syncAmpTools() {
    const { undoCount } = studio.readHistory();
    ampHistoryProjection = studio.read();
    ampUndo.textContent = `Undo (${undoCount})`; ampUndo.disabled = undoCount === 0;
    for (const [name, { button, panel }] of ampPanels) {
      button.setAttribute('aria-expanded', String(panel.open && !panel.hidden));
      if (name === 'saved') {
        const count = editing.read().parked.length;
        button.disabled = count === 0;
        button.querySelector('[data-amp-saved-count]').textContent = `(${count})`;
      }
    }
  }
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
  let rackCreation = null, creationUndo = null, removePlan = null;
  const rackCollections = Object.freeze({ person: 'people', team: 'teams', session: 'work', connection: 'connections' });

  function listen(target, type, handler) {
    target.addEventListener(type, handler);
    cleanup.push(() => target.removeEventListener(type, handler));
  }

  function text(name, value) { elements[name].textContent = value; }
  function syncSessionReceiver() {
    const selected = rackEditor?.read();
    if (selected?.open && !studio.read().state[rackCollections[selected.kind]].some(record => record.id === selected.id)
      && !(selected.kind === 'session' && describeSessionTarget(workPanel?.read().draft?.sessionId)?.mode === 'create')) {
      closeRackEditor(rackCreation?.entry());
    }
    if (creationUndo) {
      creationUndo.hidden = !(rackCreation?.projection === studio.read()
        && rackEditor?.isOpen(rackCreation.kind) && rackEditor.read().id === rackCreation.id);
      creationUndo.textContent = `Undo ${rackCreation?.kind === 'connection' ? 'handoff' : rackCreation?.kind ?? 'record'} addition`;
    }
    if (removePlan) removePlan.hidden = !rackEditor?.isOpen('session')
      || describeSessionTarget(workPanel?.read().draft?.sessionId)?.mode === 'remove';
    if (!disposed && workPanel) {
      const receiver = workPanel.readReceiver();
      if (rackEditor?.isOpen('session')) receiver.controlsId = rackEditor.element.id;
      syncSessionControls(root, receiver);
    }
    if (!disposed) {
      rackEditor?.sync();
      templatePanel?.setEditorOpen(Boolean(selected?.open && rackEditor.element.closest('[data-team-rack-editor]')));
    }
  }
  function closeRackEditor(source = null) {
    const selected = rackEditor?.read();
    if (!selected?.open) return false;
    if (selected.kind === 'person') teamPanel?.close();
    else if (selected.kind === 'session') workPanel?.close({ park: false });
    else if (selected.kind === 'connection') connectionPanel?.close({ park: false });
    else assemblyPanel?.close({ park: false });
    templatePanel?.setEditorOpen(false);
    rackEditor.hide({ focus: true, source });
    syncSessionReceiver();
    return true;
  }
  function closePersonDesk() {
    const id = editing.read().selected.person;
    editing.park();
    teamPanel?.close();
    responsibilityPanel?.close({ kind: 'role', park: false });
    render();
    root.querySelector(`[data-team-roster] [data-person-id="${id}"]`)?.focus({ preventScroll: true });
  }
  function syncPersonDesk() {
    if (!personDesk) return;
    const person = root.querySelector('[data-person-configure]');
    const role = root.querySelector('[data-responsibility-configure="role"]');
    const local = person.parentElement === personDesk.host;
    const open = local && !person.hidden && person.open;
    personDesk.host.dataset.deskOpen = String(open);
    personDesk.header.element.hidden = !open;
    // The canonical sibling forms retain their draft owners. The local desk
    // supplies one visible return/Close instead of two disclosure summaries.
    role.open = open;
    role.hidden = !open;
    const id = editing.read().selected.person;
    const row = studio.read().state.people.find(item => item.id === id);
    personDesk.header.update({ title: row?.label ?? 'Person mix',
      source: open ? person.querySelector('[data-person-action="apply"]') : null });
  }
  function borrowCurrentSession() {
    if (!mounted || activeChapter !== 'coordination' || openingRackKind || rackEditor?.isOpen('session')) return;
    const view = workPanel?.read(), target = describeSessionTarget(view?.draft?.sessionId);
    // A stale draft owns a visible recovery view before it can regain an edit
    // lease. Borrow that view too so an explicit return can focus its review.
    if (!target || !rackEditor || coordinationEditor !== 'session' || !workPanel.isOpen()) return;
    const hasCadence = Boolean(studio.read().state.scoreSettings.cadence);
    const anchor = root.querySelector(hasCadence ? '[data-score-projection]' : '[data-connection-templates]');
    const container = hasCadence ? scorePanel?.getSessionSlot() : anchor?.querySelector('[data-team-rack-editor]');
    if (!anchor || !container) return;
    const source = [...anchor.querySelectorAll('[data-studio-session-id]')].find(control => control.dataset.studioSessionId === target.id)
      ?? anchor.querySelector('[data-cadence-key="cassette-add"]');
    const record = studio.read().state.work.find(item => item.id === target.id);
    workPanel.setRackMode(true);
    const destination = target.form === 'work.session.update' || target.form === 'work.session.remove'
      ? workSessionTarget(record, target.occurrenceIndex) : workDefaultsTarget(target.id);
    rackEditor.show({ ...destination, kind: 'session', id: target.id, label: record?.label ?? 'New plan', originLabel: hasCadence ? 'Coordination horizon' : 'Team planning' },
      source, anchor, { container });
  }
  function preparePlanLoad() {
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return false; }
    workPanel?.close({ park: false });
    rackEditor?.hide({ home: true });
    templatePanel?.setEditorOpen(false);
    syncSessionReceiver();
    return true;
  }
  function peopleOwnerAvailable(kind) {
    return (activeChapter === 'people' || activeChapter === 'coordination'
      && (openingRackKind === kind || rackEditor?.isOpen(kind))) && !purposePanel?.isOpen();
  }
  function openRackEditor(target, source, { allowToggle = true, restoredSessionId = null } = {}) {
    const state = studio.read().state;
    const collection = rackCollections[target?.kind];
    if (!collection) return;
    const record = state[collection].find(row => row.id === target.id);
    // New navigation is admitted before closing, borrowing or parking an editor.
    // Returning to a saved draft is a separate recovery route already admitted
    // by the canonical draft owner; its ordinal may intentionally be stale.
    const restoring = target.kind === 'session' && restoredSessionId
      && workPanel.read().draft?.sessionId === restoredSessionId
      && describeSessionTarget(restoredSessionId)?.id === target.id;
    if (restoring) {
      const restored = describeSessionTarget(restoredSessionId);
      const destination = restored.form === 'work.session.update' || restored.form === 'work.session.remove'
        ? workSessionTarget(record, restored.occurrenceIndex) : workDefaultsTarget(restored.id);
      // The mounted owner may have switched numbered sessions since the rack
      // first opened. Its recovered draft supplies the current display/focus.
      const { occurrenceIndex, sourceWork, ...presentation } = target;
      target = { ...presentation, ...destination, kind: 'session' };
    }
    const session = target.kind === 'session' && !restoring
      ? resolveWorkEditorTarget({ ...target, kind: 'work' }, state) : null;
    if (target.kind === 'session' && !session && !restoring) return;
    if (!record || !rackEditor) return;
    if (target.kind === 'team') {
      rackEditor.hide({ home: true });
      templatePanel?.openTeam(target.id, source);
      syncSessionReceiver();
      return;
    }
    const current = rackEditor.read();
    const horizonSource = source?.closest('[data-score-projection]');
    const sharedSource = source?.closest('[data-shared-session-rack]');
    const toggle = target.kind !== 'session' || horizonSource || source?.classList.contains('studio-track-key');
    if (allowToggle && toggle && current?.open && current.kind === target.kind && current.id === target.id
      && (target.kind !== 'session' || workPanel.readReceiver().occurrenceIndex === target.occurrenceIndex)
      && rackEditor.isOrigin(source)) { closeRackEditor(source); return; }
    const anchor = target.kind === 'person' ? requireElement('[data-connection-templates]')
      : horizonSource ?? source?.closest('[data-native-connection-view]') ?? requireElement('[data-connection-templates]');
    const originLabel = target.kind === 'session' ? (source?.closest('[data-score-projection]')
      ? `Coordination horizon${target.periodId ? ` · ${studio.read().state.scoreSettings.cadence?.periods.find(period => period.id === target.periodId)?.label ?? ''}` : ''}`
      : source?.closest('[data-native-connection-view]') ? 'Coordination connections'
        : `Team planning · ${source?.closest('[data-delivery-label]')?.dataset.deliveryLabel ?? 'Shared sessions'}`) : null;
    const before = editing.read().active;
    const ownerFor = kind => ({ person: teamPanel, team: assemblyPanel, session: workPanel, connection: connectionPanel })[kind];
    const open = record => record.kind === 'team'
      ? assemblyPanel.open(makeAssemblyTarget('team.update', record.id), false)
      : record.kind === 'session' ? workPanel.select({ ...record, kind: 'work' }, false)
        : ownerFor(record.kind).select(record.id, false);
    const targetId = target.kind === 'team' ? makeAssemblyTarget('team.update', target.id)
      : target.kind === 'session' ? (restoring ? restoredSessionId : session.targetId) : target.kind === 'connection' ? makeConnectionTarget('connection.update', target.id) : target.id;
    let result;
    try {
      openingRackKind = target.kind;
      result = restoring ? { ok: true } : open(target);
    } finally { openingRackKind = null; }
    const owner = ownerFor(target.kind).read();
    const ownedId = owner.draft?.[{ session: 'sessionId', person: 'personId', team: 'assemblyId', connection: 'connectionId' }[target.kind]];
    if (ownedId !== targetId) {
      // A refused switch retains the previous record and its visible identity.
      if (current?.open && before?.token === editing.read().active?.token) {
        try {
          openingRackKind = current.kind;
          open(current);
        } finally { openingRackKind = null; }
      }
      render(); announce(result?.error?.message ?? 'Finish or cancel the open edits, then choose another record.');
      return;
    }
    const container = sharedSource && target.kind === 'connection' ? sharedSource.querySelector('[data-shared-rack-editor]')
      : target.kind === 'session' && horizonSource ? scorePanel.getSessionSlot()
      : anchor.matches('[data-connection-templates]') ? anchor.querySelector('[data-team-rack-editor]') : null;
    workPanel?.setRackMode?.(target.kind === 'session' && Boolean(container));
    rackEditor.show({ ...target, label: record.label ?? record.sharedObject, originLabel,
      ownerLabel: sharedSource ? 'Shared sessions · Handoffs' : horizonSource ? 'Plan overview' : 'Delivery overview',
      returnLabel: target.kind === 'person' && container ? 'Back to Delivery overview' : null }, source, anchor,
      { container, arrival: current?.open ? 'change' : 'open', originRoot: sharedSource ?? horizonSource ?? anchor });
    render();
    const panel = rackEditor.element.querySelector('details');
    if (!panel.open || panel.hidden) { rackEditor.hide(); return; }
    const fields = [...panel.querySelectorAll('input,select,textarea,button')]
      .filter(control => !control.matches(':disabled') && control.getClientRects().length);
    const occurrenceFocused = target.kind === 'session' && workPanel.focusOccurrence(target.occurrenceIndex);
    if (!occurrenceFocused) {
      (fields.find(control => control.getAttribute('aria-invalid') === 'true')
        ?? fields.find(control => control.matches('input,select,textarea')) ?? fields[0])?.focus({ preventScroll: true });
    }
    motion?.indicate(rackEditor.element, { kind: 'inspection' });
    if (!container || target.kind === 'person' && horizonSource)
      revealStudioDestination(occurrenceFocused ? document.activeElement : rackEditor.element);
  }
  function announce(message) { text('status', message); }
  function resumePeople() {
    if (peopleEditor === 'assembly') assemblyPanel?.resume();
    else if (peopleEditor === 'responsibility') responsibilityPanel?.resume();
    else teamPanel?.resume();
  }
  function resumeCoordination() {
    resumingCoordination = true;
    try {
      if (coordinationEditor === 'score') scorePanel?.resume();
      else if (coordinationEditor === 'connection') connectionPanel?.resume();
      else if (coordinationEditor === 'template') templatePanel?.resume();
      else if (coordinationEditor === 'record') resumePeople();
      else workPanel?.resume();
    } finally { resumingCoordination = false; }
  }
  function beginCoordination(kind, { retainRack = false } = {}) {
    if (disposed) return;
    coordinationEditor = kind;
    if (kind !== 'record' && !openingRackKind && !retainRack) {
      rackEditor?.hide({ home: true });
      workPanel?.setRackMode?.(false);
    }
    if (mounted && !resumingCoordination && !openingRackKind && !retainRack) {
      const workspace = root.querySelector(`[data-native-workspace="${kind === 'template' ? 'connection' : kind}"]`);
      if (workspace?.tagName === 'DETAILS') workspace.open = true;
    }
    purposePanel?.close({ resume: false });
    if (kind !== 'session') workPanel?.close({ park: false });
    if (kind !== 'connection') connectionPanel?.close({ park: false });
    if (kind !== 'template') templatePanel?.close();
    if (kind !== 'score') scorePanel?.close({ park: false });
  }

  function restoreCreationPlacement() {
    creationPlacement?.restore();
    if (localCreation) {
      localCreation.container.hidden = true;
      delete localCreation.owner.dataset.localCreation;
      localCreation = null;
    }
  }
  function closeCreationOrRack() {
    if (localCreation && returnRoutes.at(-1) === localCreation.route) {
      returnToDraft();
      return true;
    }
    return closeRackEditor();
  }
  function creationReturn(target) {
    const route = returnRoutes.at(-1);
    const created = describeAssemblyTarget(target) ?? describeSessionTarget(target);
    const collection = { person: 'people', team: 'teams', session: 'work' }[route?.creating];
    const fromCreation = target && route?.creationTarget === target;
    const fromCreatedRecord = route?.createdId && created?.id === route.createdId && created.collection === collection;
    if (!fromCreation && !fromCreatedRecord) return null;
    const owner = TARGET_READERS[route.kind]?.(route.target);
    const saved = editing.read().parked.find(record => record.kind === route.kind && record.targetId === route.target);
    const record = owner && studio.read().state[owner.collection]?.find(item => item.id === owner.id);
    const name = saved?.raw.label || saved?.raw.sharedObject || record?.label || record?.sharedObject
      || (route.kind === 'contribution' && responsibilityValue('categoryId', saved?.raw.categoryId ?? record?.categoryId));
    const label = name ? route.kind === 'contribution' ? name : `Settings · ${name}` : {
      assembly: 'Team settings', session: 'Session settings', connection: 'Handoff settings',
      contribution: 'Contribution settings', template: 'Team planning', capability: 'Abilities',
      change: 'Change settings', assurance: 'Quality & recovery settings',
    }[route.kind];
    return label ? { label, action: returnToDraft } : null;
  }

  function renderReturnRoute() {
    const drafts = editing.read();
    const state = studio.read().state;
    for (let index = returnRoutes.length - 1; index >= 0; index -= 1) {
      const route = returnRoutes[index], descriptor = TARGET_READERS[route.kind]?.(route.target);
      if (!isReturnRouteRetained(route, drafts, state, descriptor)) returnRoutes.splice(index, 1);
    }
    if (pendingReturnFocus && !hasReturnDraft(pendingReturnFocus, drafts)) pendingReturnFocus = null;
    assemblyPanel?.refresh(); rackEditor?.sync();
    if (!returnRegion || !returnNote || !returnButton) return;
    const route = returnRoutes.at(-1);
    returnRegion.hidden = !route || route === localCreation?.route || Boolean(route.rackSource && templatePanel?.isTeamOpen());
    if (returnTeamButton) returnTeamButton.hidden = true;
    if (!route) return;
    const collection = { person: 'people', team: 'teams', session: 'work' }[route.createdKind];
    const created = collection ? state[collection].find(row => row.id === route.createdId) : null;
    const createdLabel = created?.label;
    const team = state.teams.find(row => row.id === route.requiredTeamId);
    const needsMembership = route.createdKind === 'person' && created && team && !team.personIds.includes(route.createdId);
    const destination = { session: 'session', connection: 'connection', assembly: 'team', contribution: 'contribution', template: 'arrangement', capability: 'card', change: 'change plan', assurance: 'quality and recovery plan', score: 'coordination horizon', connectionsView: 'connections', peopleView: 'people and teams', peopleSupportView: 'people and teams' }[route.kind];
    returnButton.textContent = `Return to ${destination}`;
    returnNote.textContent = createdLabel
      ? `${createdLabel} is ready. Return to review your saved entries and choose ${route.createdKind === 'person' ? 'this person' : route.createdKind === 'session' ? 'this session' : 'this team'}.`
      : `Your ${destination} entries are saved while you ${route.creating === 'team' ? 'create a team' : route.creating === 'session' ? 'add a session' : 'add a person'}.`;
    if (route.inspectedWorkId) returnNote.textContent = `Review the supporting session, then return to your ${destination} and its saved entries.`;
    if (route.kind === 'connectionsView') returnNote.textContent = 'Inspect the related team, person or work, then return to the connections and their arrangement.';
    if (route.kind === 'peopleView') returnNote.textContent = 'Inspect the session, then return to people and teams.';
    if (route.kind === 'peopleSupportView') returnNote.textContent = 'Inspect the supporting work or recorded observation, then return to the person or team. Your unfinished entries stay saved.';
    if (route.kind === 'score') returnNote.textContent = 'Inspect the related work, then return to the coordination horizon and your saved arrangement.';
    if (route.createdId && !created) returnNote.textContent = `The added ${route.createdKind} is outside the current plan. Your ${destination} entries remain saved. Return to choose an available ${route.createdKind} or create another.`;
    if (createdLabel && route.field && route.createdKind === 'team') returnNote.textContent = `${createdLabel} is ready. Return to review your saved entries and select it as the ${route.field === 'senderTeamId' ? 'sending team' : route.field === 'receiverTeamId' ? 'receiving team' : 'session team'}.`;
    if (needsMembership && returnTeamButton) {
      returnNote.textContent = `${createdLabel} is ready. Include them in ${team.label}, then return to choose them as the receiving person.`;
      returnTeamButton.hidden = false; returnTeamButton.textContent = `Add ${createdLabel} to ${team.label}`;
    }
  }
  function retainReturnAncestors(kind, target) {
    const descriptor = TARGET_READERS[kind]?.(target);
    // Return routes describe the current detour. Saved drafts keep their own
    // recovery owner when a visitor starts a different task or resumes an ancestor.
    returnRoutes.splice(returnRoutePrefixLength(returnRoutes, kind, target, descriptor));
  }
  function createPrerequisite(button) {
    const kind = button.dataset.nativeReturn, creating = button.dataset.nativeCreate;
    const originChapter = activeChapter, rackOrigin = rackEditor?.captureOrigin();
    if (kind === 'template') templatePanel?.settleText();
    if (!['session', 'connection', 'assembly', 'contribution', 'template', 'capability', 'change', 'assurance'].includes(kind) || !['person', 'team', 'session'].includes(creating)) return;
    const view = kind === 'template' ? null : editing[kind].read();
    const target = view?.draft?.[{ session: 'sessionId', connection: 'connectionId', assembly: 'assemblyId', contribution: 'contributionId', capability: 'capabilityId', change: 'changeId', assurance: 'assuranceId' }[kind]];
    if (kind !== 'template' && !target) { announce('Open the settings you want to continue, then add what they need.'); return; }
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const held = editing.read().parked.some(record => record.kind === kind && record.targetId === target);
    if (activeChapter === 'coordination' && kind === 'connection' && creating === 'team') {
      const result = createRackRecord(studio, editing, 'team');
      if (!result.ok) { announce(result.error.message); render(); return; }
      // This accepted addition changes only the new team. Recover the saved
      // handoff against that exact projection and keep its current receiver.
      if (studio.read() !== result.projection) { render(); return; }
      let resumed;
      try { openingRackKind = 'connection'; resumed = connectionPanel.open(target, false); }
      finally { openingRackKind = null; }
      if (resumed?.view?.status === 'stale')
        resumed = editing.connection.review(resumed.view.draft.token, result.projection);
      const field = button.dataset.nativeReturnField;
      if (resumed?.ok && resumed.view.status === 'editing' && ['senderTeamId', 'receiverTeamId'].includes(field))
        editing.connection.setText(resumed.view.draft.token, field, result.id);
      render(); syncSessionReceiver();
      rackEditor?.element.querySelector(`[name="${field}"]`)?.focus({ preventScroll: true });
      announce('Team added and selected. Apply the handoff when ready. Undo is available.');
      return;
    }
    const localPerson = kind === 'contribution' && creating === 'person';
    if (localPerson) {
      const owner = root.querySelector('[data-responsibility-configure="contribution"]');
      const container = owner.querySelector('[data-contribution-creation]');
      localCreation = { owner, container, route: null };
      owner.dataset.localCreation = 'person'; container.hidden = false;
      creationPlacement.place(container);
    } else chapterShell?.select(creating === 'session' ? 'coordination' : 'people');
    const result = creating === 'session' ? workPanel?.create() : assemblyPanel?.create(`${creating}.create`, !localPerson);
    if (!result?.ok) { restoreCreationPlacement(); announce(result?.error?.message ?? 'Open People to add this record.'); render(); return; }
    pendingReturnFocus = null;
    retainReturnAncestors(kind, target);
    returnRoutes.push({ kind, target, creating, held, originChapter, rackOrigin, sourceProjection: view?.draft?.baseProjection, creationTarget: result.view.draft.assemblyId ?? result.view.draft.sessionId,
      field: button.dataset.nativeReturnField ?? (kind === 'session' && creating === 'team' ? 'teamId' : kind === 'connection' && creating === 'person' ? 'receiverPersonId' : null),
      requiredTeamId: kind === 'connection' && creating === 'person' ? view.draft.raw.receiverTeamId : null });
    if (localPerson) localCreation.route = returnRoutes.at(-1);
    renderReturnRoute();
    if (localPerson) {
      localCreation.container.querySelector('[name="label"]')?.focus({ preventScroll: true });
      motion?.indicate(localCreation.container, { kind: 'inspection' });
    }
    announce(`Your ${kind === 'assembly' ? 'team' : kind === 'template' ? 'arrangement' : kind} entries are saved.`);
  }
  function returnToDraft(creation = null) {
    const route = returnRoutes.at(-1);
    if (!route) return;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const returningLocally = localCreation?.route === route;
    restoreCreationPlacement();
    if (!returningLocally) chapterShell?.select(route.originChapter ?? (route.kind === 'assurance' ? 'assurance' : route.kind === 'change' ? 'change' : route.kind === 'capability' ? 'work' : ['assembly', 'contribution', 'peopleView', 'peopleSupportView'].includes(route.kind) ? 'people' : 'coordination'));
    if (route.kind === 'peopleSupportView') {
      if (route.origin?.kind === 'person') teamPanel?.select(route.origin.targetId);
      else if (route.origin?.kind === 'assembly') assemblyPanel?.open(route.origin.targetId);
      else if (['role', 'contribution'].includes(route.origin?.kind)) responsibilityPanel?.open(route.origin.targetId);
      returnRoutes.pop(); render(); renderReturnRoute();
      if (route.origin && editing[route.origin.kind].read().status === 'stale') {
        revealStudioDestination(document.activeElement, { block: 'center' }); return;
      }
      const list = [...root.querySelectorAll('[data-support-owner-kind]')].find(element => element.dataset.supportOwnerKind === route.ownerKind && element.dataset.supportOwnerId === route.ownerId);
      const candidates = [...(list?.querySelectorAll('[data-support-kind]') ?? [])].filter(element => element.dataset.supportKind === route.sourceKind && element.dataset.supportId === route.sourceId);
      const badge = candidates.find(element => element.dataset.supportStanding === route.sourceStanding) ?? candidates[0];
      const fallback = [...root.querySelectorAll(route.ownerKind === 'person' ? '[data-team-roster] [data-person-id]' : '[data-assembly-team]')].find(element => (element.dataset.personId ?? element.dataset.assemblyTeam) === route.ownerId);
      const destination = badge ?? fallback;
      revealStudioDestination(destination, { block: 'center' }); destination?.focus({ preventScroll: true });
      return;
    }
    if (route.kind === 'connectionsView' || route.kind === 'peopleView') {
      returnRoutes.pop(); render(); renderReturnRoute();
      const destination = root.querySelector(route.kind === 'peopleView' ? '.studio-people-reading' : '[data-native-connection-view]');
      revealStudioDestination(destination);
      destination?.querySelector('button, select')?.focus({ preventScroll: true });
      return;
    }
    if (route.kind === 'template') {
      if (!templatePanel?.open()) return;
      returnRoutes.pop(); render(); renderReturnRoute();
      templatePanel.focus();
      announce('Your arrangement entries are ready. Choose the added person to update the arrangement.');
      return;
    }
    const panel = { session: workPanel, connection: connectionPanel, assembly: assemblyPanel, contribution: responsibilityPanel, capability: capabilityPanel, change: changePanel, assurance: assurancePanel, score: scorePanel }[route.kind];
    let result = panel.open(route.target, !returningLocally);
    if (!result?.view?.draft) { announce(result?.error?.message ?? 'Choose an existing record to continue.'); return; }
    if (creation && returningLocally && studio.read() === creation.projection
        && route.sourceProjection === creation.previousProjection
        && route.kind === 'contribution' && ['receiverPersonId', 'decisionOwnerPersonId'].includes(route.field)) {
      if (result.view.status === 'stale') result = editing.contribution.review(result.view.draft.token, creation.projection);
      if (result.ok && result.view.status === 'editing')
        editing.contribution.setText(result.view.draft.token, route.field, creation.id);
    }
    if (route.rackOrigin) {
      const { record, source } = route.rackOrigin;
      if (studio.read().state[rackCollections[record.kind]].some(item => item.id === record.id))
        openRackEditor(record, source(), { allowToggle: false, restoredSessionId: route.kind === 'session' ? route.target : null });
    } else if (route.rackSource && route.kind === 'connection') {
      const descriptor = describeConnectionTarget(route.target);
      if (descriptor?.id) openRackEditor({ kind: 'connection', id: descriptor.id }, route.rackSource());
    }
    pendingReturnFocus = route.field ? { kind: route.kind, target: route.target, field: route.field } : null;
    returnRoutes.pop(); render(); renderReturnRoute();
    focusReturnedField();
    announce(result.view.status === 'stale' ? 'Your entries are here. Review them against the updated plan, then continue.' : 'Your entries are ready to continue.');
  }
  function inspectSupportingWork(kind, id, origin) {
    const target = origin?.targetId;
    if (!target || (kind === 'capability' ? !describeCapabilityTarget(target) : !['change', 'assurance'].includes(kind) || target !== kind) || !studio.read().state.work.some(row => row.id === id)) return;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const held = editing.read().parked.some(record => record.kind === kind && record.targetId === target);
    chapterShell?.select('coordination');
    const result = workPanel?.select(workDefaultsTarget(id), false);
    if (!result?.ok) { announce(result?.error?.message ?? 'Choose a current working session.'); return; }
    retainReturnAncestors(kind, target);
    returnRoutes.push({ kind, target, held, inspectedWorkId: id });
    render(); root.querySelector('[data-native-session-select]')?.focus();
  }
  function navigateFromConnections(target, origin = 'connectionsView', source = null) {
    if (disposed) return;
    if (source && activeChapter === 'coordination' && ['create-team', 'create-connection'].includes(target.kind)) {
      createRecordInRack(target.kind === 'create-team' ? 'team' : 'connection', target, source); return;
    }
    if (target.kind === 'create-team' || target.kind === 'create-person') {
      const parked = editing.park();
      if (!parked.ok) { announce(parked.error.message); return; }
      chapterShell?.select('people', { kind: 'context' });
      assemblyPanel?.create(target.kind === 'create-team' ? 'team.create' : 'person.create');
      render(); return;
    }
    if (target.kind === 'create-session') {
      if (source && activeChapter === 'coordination') { createSessionInRack(target, source); return; }
      const parked = editing.park();
      if (!parked.ok) { announce(parked.error.message); return; }
      returnRoutes.push({ kind: 'connectionsView', target: 'connections', held: false });
      chapterShell?.select('coordination', { kind: 'context' }); workPanel?.create(); render();
      revealStudioDestination(root.querySelector('[data-native-session-editor] [data-native-configure]')); return;
    }
    if (target.kind === 'work') {
      const admitted = resolveWorkEditorTarget(target, studio.read().state);
      if (!admitted) return;
      target = admitted;
    }
    const collection = { team: 'teams', work: 'work', person: 'people', contribution: 'contributions', connection: 'connections' }[target.kind];
    if (!collection || !studio.read().state[collection].some(row => row.id === target.id)) return;
    if (activeChapter === 'coordination' && ['person', 'team', 'connection'].includes(target.kind)) { openRackEditor(target, source); return; }
    if (activeChapter === 'coordination' && target.kind === 'work' && source) {
      openRackEditor({ ...target, kind: 'session' }, source); return;
    }
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const returnTarget = origin === 'peopleView' ? 'people' : 'connections';
    retainReturnAncestors(origin, returnTarget);
    returnRoutes.push({ kind: origin, target: returnTarget, held: false });
    chapterShell?.select(target.kind === 'work' ? 'coordination' : 'people', { kind: 'context' });
    if (target.kind === 'team') assemblyPanel?.open(makeAssemblyTarget('team.update', target.id));
    else if (target.kind === 'person') teamPanel?.select(target.id);
    else if (target.kind === 'contribution') responsibilityPanel?.open(makeContributionTarget('contribution.update', target.id));
    else workPanel?.select(target);
    render();
    const destination = root.querySelector(target.kind === 'team' ? '[data-assembly-configure]' : target.kind === 'person' ? '[data-person-configure]'
      : target.kind === 'contribution' ? '[data-responsibility-configure="contribution"]' : '[data-native-session-editor] [data-native-configure]');
    // Each receiving panel selects the right field or stale-edit recovery.
    // Retain a successor's focus when a callback has already opened other work.
    if (destination?.contains(document.activeElement)) revealStudioDestination(destination);
  }
  function inspectAssuranceSupport(button) {
    if (disposed) return;
    const owner = button.closest('[data-support-owner-kind]');
    const ownerKind = owner?.dataset.supportOwnerKind, ownerId = owner?.dataset.supportOwnerId;
    const collection = { person: 'people', team: 'teams' }[ownerKind];
    if (!collection || !studio.read().state[collection].some(row => row.id === ownerId)) return;
    const active = editing.read().active;
    const origin = ['person', 'assembly', 'role', 'contribution'].includes(active?.kind) ? { kind: active.kind, targetId: active.targetId } : null;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const target = `${ownerKind}/${ownerId}`;
    retainReturnAncestors('peopleSupportView', target);
    returnRoutes.push({ kind: 'peopleSupportView', target, held: false, ownerKind, ownerId, origin,
      sourceKind: button.dataset.supportKind, sourceId: button.dataset.supportId, sourceStanding: button.dataset.supportStanding });
    chapterShell?.select('assurance', { kind: 'context' });
    assurancePanel?.selectSupport({ kind: button.dataset.supportKind, id: button.dataset.supportId, standing: button.dataset.supportStanding });
    renderReturnRoute();
  }
  function navigateFromScore(target, origin = {}) {
    if (disposed) return;
    const navigation = resolveScoreDestination(target, studio.read().state);
    if (!navigation) return;
    if (navigation.kind === 'person' && origin.source && activeChapter === 'coordination') {
      openRackEditor({ kind: 'person', id: target.id }, origin.source); return;
    }
    if (navigation.kind === 'work' && origin.source) {
      openRackEditor({ ...navigation, periodId: target.periodId, kind: 'session' }, origin.source); return;
    }
    const held = editing.read().parked.some(row => row.kind === 'score');
    retainReturnAncestors('score', 'score');
    returnRoutes.push({ kind: 'score', target: 'score', held, inspectedWorkId: navigation.kind === 'work' ? navigation.id : null });
    chapterShell?.select(navigation.chapter, navigation.kind === 'chapter' ? { kind: origin.routeKind ?? 'context' } : undefined);
    if (navigation.kind === 'person') teamPanel?.select(navigation.id);
    else if (navigation.kind === 'work') workPanel?.select(navigation, false);
    else if (navigation.kind === 'connection') connectionPanel?.select(navigation.id);
    render();
    const destination = navigation.kind === 'person' ? root.querySelector('[data-native-team-editor]')
      : navigation.kind === 'work' ? root.querySelector('[data-native-session-editor]')
        : navigation.kind === 'connection' ? root.querySelector('[data-native-connection-editor]') : root.querySelector(`[data-native-chapter-panel="${navigation.id}"]`);
    revealStudioDestination(destination);
    destination?.querySelector('select, button, summary, input')?.focus({ preventScroll: true });
  }
  function createSessionInRack(context, source) {
    if (disposed) return;
    const anchor = source?.closest('[data-score-projection]') ?? source?.closest('[data-native-connection-view]')
      ?? requireElement('[data-connection-templates]');
    const entry = captureRackEntry(source, anchor);
    let result;
    try {
      openingRackKind = 'session';
      result = workPanel?.createAccepted(context);
    } finally { openingRackKind = null; }
    if (result?.fallback) {
      // Empty plans need the canonical creation draft. Its local rack already
      // supplies Close; there is no separate score form to return through.
      const draft = workPanel?.create(context);
      if (!draft?.ok) announce(draft?.error?.message ?? 'Open the session editor to continue.');
      return;
    }
    if (!result?.accepted) { announce(result?.error?.message ?? 'Open the session editor to continue.'); return; }
    rackCreation = { kind: 'session', id: result.id, projection: result.projection, entry };
    // Period and track additions stay in the arrangement so earlier clips stay
    // visible. The cassette shelf alone loads the newly created plan as a filter.
    if (anchor.matches('[data-score-projection]'))
      scorePanel?.showPlan(source?.dataset.cadenceKey === 'cassette-add' ? result.id : null);
    rackEditor?.hide({ home: true });
    syncSessionReceiver();
    entry()?.focus({ preventScroll: true });
    announce('Session added. Select it to adjust its settings.');
  }
  function createRecordInRack(kind, context, source) {
    const anchor = requireElement('[data-connection-templates]');
    const entry = captureRackEntry(source, anchor);
    const result = createRackRecord(studio, editing, kind, context);
    if (!result.ok) { announce(result.error.message); return; }
    rackCreation = { kind, id: result.id, projection: result.projection, entry };
    templatePanel?.recordCreated?.(kind, result.id, context);
    render();
    syncSessionReceiver();
    entry()?.focus({ preventScroll: true });
    announce(`${kind === 'team' ? 'Team' : 'Handoff'} added. Adjust its settings or undo the addition.`);
  }
  function undoRackCreation() {
    if (disposed || rackCreation?.projection !== studio.read()) return;
    const creation = rackCreation;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const result = studio.undo(creation.projection);
    if (!result.ok) { announce(result.error.message); return; }
    render(); rackCreation = null;
    announce(`${creation.kind === 'connection' ? 'Handoff' : creation.kind === 'team' ? 'Team' : 'Session'} addition undone.`);
  }
  function useHorizonExample(id) {
    const create = { 'service-request-pilot': createShowcasePlan, 'service-request-rollout': createQuarterShowcasePlan }[id];
    if (!create || disposed) return;
    const result = studio.replace(create({ pausedExample: true, peopleExamples: true }), studio.read());
    render();
    announce(result.ok ? 'Example updated. Undo restores your previous plan.' : result.error.message);
  }
  function prerequisiteCreated(descriptor, accepted, previousProjection) {
    const route = returnRoutes.at(-1);
    if (!route || (describeAssemblyTarget(route.creationTarget) ?? describeSessionTarget(route.creationTarget))?.id !== descriptor.id) return;
    route.createdId = descriptor.id;
    route.createdKind = descriptor.collection === 'people' ? 'person' : descriptor.collection === 'work' ? 'session' : 'team';
    if (localCreation?.route === route && studio.read() === accepted) {
      returnToDraft({ id: descriptor.id, projection: accepted, previousProjection });
      return;
    }
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
    const key = { session: 'sessionId', connection: 'connectionId', contribution: 'contributionId', assembly: 'assemblyId', capability: 'capabilityId', change: 'changeId', assurance: 'assuranceId' }[kind];
    if (view.status !== 'editing' || view.draft?.[key] !== target) return;
    const scope = { session: '[data-native-configure] form', connection: '[data-connection-configure] form', contribution: '[data-responsibility-configure="contribution"]', assembly: '[data-assembly-form]', capability: '[data-capability-form]', change: '[data-change-form]', assurance: '[data-assurance-form]' }[kind];
    const form = root.querySelector(scope), input = form?.querySelector(`[name="${field}"]`)
      ?? form?.querySelector(`[data-${kind}-field="${field}"]`);
    if (!input) return;
    if (kind === 'capability') capabilityPanel?.revealField?.(field);
    if (['capability', 'change', 'assurance'].includes(kind)) {
      for (let ancestor = input.parentElement; ancestor && ancestor !== form; ancestor = ancestor.parentElement) {
        if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      }
    }
    input.focus({ preventScroll: true }); revealStudioDestination(input);
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
    if (!records.length) elements.saved.open = false;
    syncAmpTools();
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
        if (target.occurrenceIndex !== undefined) return `${enteredName || collectionLabels[target.collection]?.get(target.id) || 'Session'} · Session ${target.occurrenceIndex + 1}`;
        if (enteredName) return enteredName;
        const currentName = collectionLabels[target.collection]?.get(target.id);
        if (currentName) return currentName;
        if (record.kind === 'contribution') return responsibilityValue('categoryId', record.raw.categoryId);
        if (record.kind === 'connection') return record.raw.sharedObject?.trim() || 'New connection';
        return 'New record';
      }
      if (record.kind === 'purpose') return 'Plan purpose';
      if (record.kind === 'change') return 'Change planning';
      if (record.kind === 'assurance') return 'Quality, recovery and learning';
      if (record.kind === 'score') return 'Coordination horizon';
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
      values.textContent = record.kind === 'score' ? summarizeScoreDraft(record.raw) : record.kind === 'assurance' ? summarizeAssuranceDraft(record.raw)
        : record.kind === 'change' ? summarizeChangeDraft(record.raw)
        : entries.map(([field, raw]) => `${target?.fields?.[field]?.label ?? labels[field] ?? field}: ${savedValue(field, raw)}`).join(' · ');
      item.append(title, values);
      if (!record.targetExists && !target) {
        const removed = document.createElement('p');
        removed.textContent = 'Record removed. The saved values remain here.';
        item.append(removed);
      } else if (['assembly', 'session', 'purpose', 'person', 'role', 'contribution', 'connection', 'capability', 'change', 'assurance', 'score'].includes(record.kind)) {
        const open = document.createElement('button');
        open.type = 'button'; open.className = 'native-control--navigate'; open.dataset.savedOpen = key; open.textContent = 'Open edit';
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
    text('standing', result.plannedCommitmentCents === null ? 'Known total · USD' : 'Total · USD');
    text('funded', money(result.fundedKnownCents));
    text('additional', money(result.additionalKnownCents));
    text('allocated', money(result.allocatedKnownCents));
    const people = new Map(state.people.map(person => [person.id, person]));
    const staffing = new Map(result.staffing.map(line => [line.personId, line.cents]));
    const fragment = document.createDocumentFragment();
    const effort = { funded: 0, allocated: 0, additional: 0 };
    const amountCell = (cents, minutes) => {
      const cell = document.createElement('td'), amount = document.createElement('strong');
      amount.textContent = money(cents); cell.append(amount);
      if (minutes !== undefined) {
        const time = document.createElement('small'); time.textContent = duration(minutes); cell.append(time);
      }
      return cell;
    };
    for (const capacity of result.capacity) {
      const person = people.get(capacity.personId);
      const item = document.createElement('tr'), heading = document.createElement('th');
      item.dataset.costPerson = person.id; heading.scope = 'row'; heading.textContent = person.label;
      const fundedCents = staffing.get(person.id);
      const totalCents = fundedCents === null || capacity.additionalCents === null ? null : fundedCents + capacity.additionalCents;
      item.append(heading, amountCell(person.rateCentsPerHour),
        amountCell(fundedCents, capacity.fundedMinutes),
        amountCell(capacity.allocatedCents, capacity.allocatedMinutes),
        amountCell(capacity.additionalCents, capacity.additionalMinutes), amountCell(totalCents));
      fragment.append(item);
      effort.funded += capacity.fundedMinutes;
      effort.allocated += capacity.allocatedMinutes;
      effort.additional += capacity.additionalMinutes;
    }
    if (!result.capacity.length) {
      const row = document.createElement('tr'), cell = document.createElement('td');
      cell.colSpan = 6; cell.className = 'native-cost-table__empty'; cell.textContent = 'Add people to see the investment by person.';
      row.append(cell); fragment.append(row);
    }
    const totalsLabel = document.createElement('th'), rateTotal = document.createElement('td');
    const totalLabel = result.plannedCommitmentCents === null ? 'Known total' : 'Plan total';
    totalsLabel.scope = 'row'; totalsLabel.textContent = totalLabel; rateTotal.textContent = '—';
    elements.traceTotals.replaceChildren(totalsLabel, rateTotal,
      amountCell(result.fundedKnownCents, effort.funded), amountCell(result.allocatedKnownCents, effort.allocated),
      amountCell(result.additionalKnownCents, effort.additional), amountCell(result.knownCommitmentCents));
    elements.traceList.replaceChildren(fragment);
    const summary = document.createDocumentFragment();
    for (const [label, cents] of [['Staffing', result.fundedKnownCents], ['Extra work', result.additionalKnownCents], [totalLabel, result.knownCommitmentCents]]) {
      const group = document.createElement('div'), term = document.createElement('dt'), value = document.createElement('dd');
      term.textContent = label; value.textContent = money(cents); group.append(term, value); summary.append(group);
    }
    elements.traceSummary.replaceChildren(summary);
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
    syncPersonDesk();
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
    assurancePanel?.refresh();
    scorePanel?.refresh();
    if (current()) syncSessionReceiver();
    return view;
  }

  function click(event) {
    const supportLink = event.target.closest('[data-support-kind]');
    if (supportLink && root.contains(supportLink)) { event.preventDefault(); inspectAssuranceSupport(supportLink); return; }
    const arrangementLink = event.target.closest('[data-native-open-arrangement]');
    if (arrangementLink && root.contains(arrangementLink)) {
      event.preventDefault(); chapterShell?.select('coordination', { kind: 'context' });
      connectionView?.selectArrangement(arrangementLink.dataset.nativeOpenArrangement);
      const destination = root.querySelector('[data-native-connection-view]');
      revealStudioDestination(destination);
      destination?.querySelector('button, select')?.focus({ preventScroll: true }); return;
    }
    const scoreLink = event.target.closest('[data-native-open-score]');
    if (scoreLink && root.contains(scoreLink)) {
      event.preventDefault(); chapterShell?.select('coordination');
      scorePanel?.select({ kind: scoreLink.dataset.nativeOpenScore, id: scoreLink.dataset.nativeScoreId }, true); return;
    }
    const assuranceLink = event.target.closest('[data-native-open-assurance]');
    if (assuranceLink && root.contains(assuranceLink)) {
      event.preventDefault(); chapterShell?.select('assurance');
      root.querySelector('[data-assurance-quality] input, [data-assurance-quality] select')?.focus(); return;
    }
    const changeLink = event.target.closest('[data-native-open-change]');
    if (changeLink && root.contains(changeLink)) {
      event.preventDefault(); chapterShell?.select('change');
      (root.querySelector('[data-change-lens-wheel] [aria-pressed="true"]') ?? root.querySelector('[data-change-frameworks] select'))?.focus(); return;
    }
    const capabilityLink = event.target.closest('[data-native-open-capabilities]');
    if (capabilityLink && root.contains(capabilityLink)) {
      event.preventDefault(); chapterShell?.select('work');
      root.querySelector('[data-capability-action="select"]')?.focus(); return;
    }
    const button = event.target.closest('button');
    if (!button || !root.contains(button) || button.disabled) return;
    if (button.dataset.ampPanel) {
      const selected = ampPanels.get(button.dataset.ampPanel);
      const next = !selected.panel.open;
      for (const { panel } of ampPanels.values()) {
        if (panel !== selected.panel && panel.open) {
          if (panel.hasAttribute('data-native-purpose')) purposePanel.close();
          else panel.open = false;
        }
      }
      if (!next && selected.panel.hasAttribute('data-native-purpose')) purposePanel.close();
      else selected.panel.open = next;
      syncAmpTools(); return;
    }
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
      const result = action === 'review' ? workPanel?.select(workDefaultsTarget('review'), false)
        : action === 'readiness' ? connectionPanel?.select('readiness') : null;
      render();
      if (result?.ok && action === 'review') {
        const knob = root.querySelector('[data-native-minutes-knob]');
        (knob && !knob.disabled ? knob : root.querySelector('[data-native-session-editor] [name="minutesPerSession"]'))?.focus();
      }
      if (result?.view?.status === 'stale') announce('Your saved entries are here. Review them against the current plan, then continue.');
      return;
    }
    if (button.hasAttribute('data-native-work-open')) { navigateFromConnections(workDefaultsTarget(button.dataset.nativeWorkOpen), 'peopleView', button); return; }
    if (button.hasAttribute('data-native-create')) { createPrerequisite(button); return; }
    if (button.hasAttribute('data-native-return-action')) { returnToDraft(); return; }
    if (button.hasAttribute('data-native-return-team')) { addCreatedPersonToTeam(); return; }
    if (['review', 'use-current', 'useCurrent', 'current'].includes(button.dataset.action ?? button.dataset.sessionAction ?? button.dataset.connectionAction ?? button.dataset.responsibilityAction ?? button.dataset.assemblyAction ?? button.dataset.capabilityAction ?? button.dataset.changeAction ?? button.dataset.assuranceAction)) focusReturnedField();
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
        chapterShell?.select(saved.kind === 'assurance' ? 'assurance' : saved.kind === 'change' ? 'change' : saved.kind === 'capability' ? 'work' : ['person', 'assembly', 'role', 'contribution'].includes(saved.kind) ? 'people' : 'coordination');
        if (saved.kind === 'assembly') opened = assemblyPanel?.open(saved.targetId);
        else if (saved.kind === 'person') teamPanel?.select(saved.targetId);
        else if (saved.kind === 'session') opened = workPanel?.open(saved.targetId);
        else if (saved.kind === 'role') {
          const personId = describeRoleTarget(saved.targetId)?.id;
          if (personId) teamPanel?.select(personId, false);
          opened = responsibilityPanel?.open(saved.targetId);
        }
        else if (saved.kind === 'contribution') opened = responsibilityPanel?.open(saved.targetId);
        else if (saved.kind === 'connection') opened = connectionPanel?.open(saved.targetId);
        else if (saved.kind === 'capability') opened = capabilityPanel?.open(saved.targetId);
        else if (saved.kind === 'change') opened = changePanel?.open(saved.targetId);
        else if (saved.kind === 'assurance') opened = assurancePanel?.open(saved.targetId);
        else if (saved.kind === 'score') opened = scorePanel?.open(saved.targetId);
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
    motion?.dispose();
    creationPlacement?.dispose();
    personDesk?.header.dispose();
    personDesk?.host.classList.remove('studio-person-desk');
    localCreation?.container.remove();
    rackEditor?.dispose();
    connectionView?.dispose();
    connectionPanel?.dispose();
    templatePanel?.dispose();
    capabilityPanel?.dispose();
    changePanel?.dispose();
    assurancePanel?.dispose();
    scorePanel?.dispose();
    workPanel?.dispose();
    investmentPanel?.dispose();
    reportsPanel?.dispose();
    purposePanel?.dispose();
    responsibilityPanel?.dispose();
    assemblyPanel?.dispose();
    teamPanel?.dispose();
    ampUndo.remove();
    for (const release of cleanup) release();
    cleanup.length = 0;
    returnRoutes.length = 0; pendingReturnFocus = null; renderReturnRoute();
    editing.dispose();
    for (const button of root.querySelectorAll('[data-native-showcase-action]')) button.disabled = true;
    const view = editor.read();
    elements.fallback.hidden = false;
    elements.fallback.textContent = 'Editing closed.';
    if (ampTools) ampTools.hidden = true;
    delete root.dataset.nativeReady;
    root.dataset.nativeState = 'disposed';
    announce('Editing closed.');
    INSTANCES.delete(root);
    return view;
  }

  const receiver = Object.freeze({ read: () => workPanel?.read() ?? editor.read(), refresh: render, dispose });
  try {
    listen(ampUndo, 'click', () => {
      if (disposed || ampUndo.disabled) return;
      ampUndo.focus({ preventScroll: true });
      const expected = ampHistoryProjection;
      if (expected !== studio.read()) { render(); return; }
      const parked = editing.park();
      if (!parked.ok) { announce(parked.error.message); return; }
      if (disposed) return;
      const result = studio.undo(expected);
      render();
      if (!disposed) announce(result.ok ? 'Edit undone.' : result.error.message);
    });
    motion = mountStudioMotion(root);
    render();
    listen(root, 'click', click);
    if (ampTools) ampTools.hidden = false;
    for (const { panel } of ampPanels.values()) listen(panel, 'toggle', syncAmpTools);
    syncAmpTools();
    listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
    listen(window, 'pageshow', () => render());
    workPanel = mountWorkPanel(requireElement('[data-native-session-editor]'), { studio, editing, workId,
      onBegin: () => beginCoordination('session', { retainRack: rackEditor?.isOpen('session') }), onRecordCreated: prerequisiteCreated,
      isActive: () => activeChapter === 'coordination' && !purposePanel?.isOpen(),
      onClose: closeRackEditor, onAccepted: () => render(), onEditing: () => { borrowCurrentSession(); render(); },
    });
    const sessionWorkspace = root.querySelector('[data-native-workspace="session"]');
    if (sessionWorkspace) listen(sessionWorkspace, 'toggle', syncSessionReceiver);
    connectionView = mountConnectionView(requireElement('[data-native-connection-view]'), { projection: studio.read(),
      onSelect: id => { if (!disposed && connectionPanel?.select(id) === false) render(); },
      onNavigate: (target, source) => navigateFromConnections(target, 'connectionsView', source), onDetachArrangement: id => templatePanel?.detach(id) });
    connectionPanel = mountConnectionPanel(requireElement('[data-native-connection-editor]'), { studio, editing,
      onBegin: target => beginCoordination('connection', { retainRack: rackEditor?.isOpen('connection')
        && rackEditor.read().id === target?.id }),
      canOpen: () => activeChapter === 'coordination' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'coordination' && coordinationEditor === 'connection' && !purposePanel?.isOpen(),
      onClose: closeRackEditor, onAccepted: () => render(), onEditing: () => render(),
    });
    templatePanel = mountConnectionTemplatePanel(requireElement('[data-connection-templates]'), { studio, editing,
      onNavigate: (target, source) => navigateFromConnections(target, 'connectionsView', source), onViewChanged: syncSessionReceiver,
      onBegin: () => beginCoordination('template'),
      canOpen: () => activeChapter === 'coordination' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'coordination' && coordinationEditor === 'template' && !purposePanel?.isOpen(),
      onAccepted: () => render(), onEditing: () => render(),
    });
    const scoreRoot = root.querySelector('[data-native-score]');
    if (scoreRoot) scorePanel = mountScorePanel(scoreRoot, { studio, editing,
      onBegin: () => beginCoordination('score'), canOpen: () => activeChapter === 'coordination' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'coordination' && !purposePanel?.isOpen(),
      onNavigate: navigateFromScore, onLoadPlan: preparePlanLoad, onInspect: element => motion?.indicate(element, { kind: 'inspection' }),
      onCreateSession: createSessionInRack, onExample: useHorizonExample, onViewChanged: syncSessionReceiver,
      onAccepted: () => render(), onEditing: () => render() });
    const teamRoot = root.querySelector('[data-native-team-editor]');
    if (teamRoot) teamPanel = mountTeamPanel(teamRoot, { studio, editing,
      onBegin: () => {
        if (activeChapter === 'coordination') beginCoordination('record');
        restoreCreationPlacement();
        peopleEditor = 'person';
        purposePanel?.close({ resume: false });
        assemblyPanel?.close({ park: false });
        responsibilityPanel?.close({ park: false, keepRole: true });
      },
      canOpen: () => peopleOwnerAvailable('person'),
      isActive: () => peopleOwnerAvailable('person') && peopleEditor === 'person', onAccepted: () => render(),
      onClose: () => {
        if (closeRackEditor()) return true;
        if (activeChapter === 'people') { closePersonDesk(); return true; }
        return false;
      }, onSpread: ({ selectedPlans, totalPlans }) => responsibilityPanel?.setSpreadVisual(totalPlans ? selectedPlans / totalPlans : 0),
      onEditing: () => render() });
    const assemblyRoot = root.querySelector('[data-native-assembly]');
    if (assemblyRoot) assemblyPanel = mountAssemblyPanel(assemblyRoot, { studio, editing,
      onBegin: () => {
        if (activeChapter === 'coordination') beginCoordination('record');
        peopleEditor = 'assembly';
        purposePanel?.close({ resume: false });
        teamPanel?.close();
        if (!localCreation) responsibilityPanel?.close({ park: false });
      },
      canOpen: () => peopleOwnerAvailable('team'),
      isActive: () => peopleOwnerAvailable('team') && peopleEditor === 'assembly',
      readReturn: creationReturn,
      onClose: closeCreationOrRack,
      onAccepted: () => render(), onEditing: () => render(),
      onRecordCreated: prerequisiteCreated,
    });
    if (teamPanel && assemblyPanel) rackEditor = mountRackEditor(root, {
      editors: {
        person: [requireElement('[data-person-configure]'), requireElement('[data-person-status]')],
        team: [requireElement('[data-assembly-configure]'), requireElement('[data-assembly-status]')],
        session: [requireElement('[data-native-session-editor] [data-native-configure]'), requireElement('[data-native-session-status]')],
        connection: [requireElement('[data-connection-configure]'), requireElement('[data-connection-status]')],
      }, onClose: closeRackEditor,
      readReturn: record => record && creationReturn(record.kind === 'session'
        ? workPanel?.read().draft?.sessionId : record.kind === 'team'
          ? assemblyPanel?.read().draft?.assemblyId : null),
      readLabel: record => {
        const row = studio.read().state[rackCollections[record.kind]].find(row => row.id === record.id);
        if (row && record.kind === 'session') {
          const target = describeSessionTarget(workPanel.read().draft?.sessionId);
          const index = target?.id === row.id ? target.occurrenceIndex : undefined;
          if (index !== undefined) return `${resolveWorkSession(row, index)?.label ?? row.label} · Session ${index + 1}`;
          return `${row.label} · Plan defaults`;
        }
        return row?.label ?? row?.sharedObject;
      },
    });
    if (rackEditor) {
      creationUndo = document.createElement('button'); creationUndo.type = 'button';
      creationUndo.textContent = 'Undo session addition'; creationUndo.dataset.rackCreationUndo = '';
      creationUndo.hidden = true;
      const heading = rackEditor.element.querySelector('.studio-rack-editor__heading');
      const actions = heading.querySelector('.studio-rack-editor__tools');
      removePlan = document.createElement('button'); removePlan.type = 'button';
      removePlan.textContent = 'Remove plan'; removePlan.dataset.rackRemovePlan = '';
      removePlan.className = 'native-control--remove'; removePlan.hidden = true;
      actions.append(removePlan, creationUndo, heading.querySelector('[data-rack-editor-close]')); heading.append(actions);
      listen(creationUndo, 'click', undoRackCreation);
      listen(removePlan, 'click', () => {
        const selected = rackEditor.read();
        if (!selected?.open || selected.kind !== 'session') return;
        // Keep the canonical removal form in the loaded rack, including its
        // dependency review and Cancel path.
        try {
          openingRackKind = 'session';
          workPanel.open(makeSessionTarget('work.remove', selected.id));
        } finally { openingRackKind = null; }
      });
    }
    if (teamRoot) responsibilityPanel = mountResponsibilityPanel(teamRoot, { studio, editing,
      onDismiss: kind => {
        if (kind === 'role' || !localCreation) return;
        const route = localCreation.route;
        assemblyPanel?.close();
        restoreCreationPlacement();
        const index = returnRoutes.indexOf(route);
        if (index >= 0) returnRoutes.splice(index);
      },
      onBegin: kind => {
        restoreCreationPlacement();
        peopleEditor = 'responsibility';
        purposePanel?.close({ resume: false });
        if (kind !== 'role') teamPanel?.close();
        assemblyPanel?.close({ park: false });
      },
      canOpen: () => activeChapter === 'people' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'people' && peopleEditor === 'responsibility' && !purposePanel?.isOpen(),
      onAccepted: (next, context) => {
        if (context?.kind === 'role' && teamPanel?.reconcileRoleChange(context.previousProjection, next))
          peopleEditor = 'person';
        render();
      }, onEditing: () => render(),
    });
    const contributionOwner = root.querySelector('[data-responsibility-configure="contribution"]');
    const personHost = root.querySelector('.studio-person-receiver');
    if (personHost) {
      personHost.classList.add('studio-person-desk');
      const header = mountRackHeader(personHost, { title: 'Person mix', owner: 'People in working sessions',
        closeAttribute: 'data-person-desk-close', applyAttribute: 'data-person-desk-apply', onClose: closePersonDesk });
      personDesk = { host: personHost, header };
    }
    if (contributionOwner) {
      const container = document.createElement('div');
      container.dataset.contributionCreation = ''; container.className = 'studio-contribution-creation'; container.hidden = true;
      contributionOwner.append(container); cleanup.push(() => container.remove());
      creationPlacement = mountEditorPlacement([requireElement('[data-assembly-configure]'), requireElement('[data-assembly-status]')]);
    }
    purposePanel = mountPurposePanel(requireElement('[data-native-purpose]'), { studio, editing,
      trigger: ampPanels.get('purpose')?.button,
      onOpen: () => { editing.park(); },
      onClose: () => {
        if (activeChapter === 'coordination') resumeCoordination();
        else if (activeChapter === 'people') resumePeople();
        else if (activeChapter === 'work') capabilityPanel?.resume();
        else if (activeChapter === 'change') changePanel?.resume();
        else if (activeChapter === 'assurance') assurancePanel?.resume();
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
    const assuranceRoot = root.querySelector('[data-native-assurance]');
    if (assuranceRoot) assurancePanel = mountAssurancePanel(assuranceRoot, { studio, editing,
      onBegin: () => { purposePanel?.close({ resume: false }); },
      canOpen: () => activeChapter === 'assurance' && !purposePanel?.isOpen(),
      isActive: () => activeChapter === 'assurance' && !purposePanel?.isOpen(),
      onSourceWork: (id, origin) => inspectSupportingWork('assurance', id, origin), onAccepted: () => render(), onEditing: () => render(),
    });
    investmentPanel = mountInvestmentPanel(requireElement('.native-investment'), { studio, editing, onChange: () => render(), onOpenSession: id => navigateFromScore(workDefaultsTarget(id)) });
    reportsPanel = mountStudioReports(requireElement('.native-investment'), { studio });
    // Resolve chapter fragments against the completed enhanced amp layout.
    root.dataset.nativeReady = 'true';
    const chapterList = root.querySelector('[data-native-chapter-list]');
    if (chapterList) {
      for (const button of chapterList.querySelectorAll('[data-native-chapter]')) {
        const icon = createStudioIcon(document, button.dataset.nativeChapter);
        button.prepend(icon);
        cleanup.push(() => icon.remove());
      }
      chapterShell = mountChapterShell(root, { motion, onSelect: chapter => {
        purposePanel?.close({ resume: false });
        if (activeChapter !== chapter) {
          editing.park(); restoreCreationPlacement(); rackEditor?.hide({ home: true }); workPanel?.setRackMode?.(false);
          if (coordinationEditor === 'record') coordinationEditor = 'template';
        }
        activeChapter = chapter;
        if (chapter === 'coordination') resumeCoordination();
        else if (chapter === 'people') resumePeople();
        else if (chapter === 'work') capabilityPanel?.resume();
        else if (chapter === 'change') changePanel?.resume();
        else if (chapter === 'assurance') assurancePanel?.resume();
        render();
      } });
    }
    elements.fallback.hidden = true;
    INSTANCES.set(root, receiver);
    mounted = true;
    return receiver;
  } catch (error) {
    dispose();
    throw error;
  }
}

if (typeof document !== 'undefined') {
  for (const root of document.querySelectorAll('[data-native-coordination]')) {
    try { mountCoordinationPanel(root, { studio: createStudio(createShowcasePlan({ pausedExample: true, peopleExamples: true })) }); }
    catch {
      const fallback = root.querySelector('[data-native-fallback]');
      if (fallback) { fallback.hidden = false; fallback.textContent = 'Editing is unavailable.'; }
    }
  }
}
