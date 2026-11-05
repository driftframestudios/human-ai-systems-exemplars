import { createStudio } from './state.mjs';
import { createDraftCoordinator } from './editing.mjs';
import { INTEGER, money } from './display.mjs';
import { mountTeamPanel } from './team-controller.mjs';
import { mountChapterShell } from './shell.mjs';
import { createStudioIcon } from './icons.mjs';
import { mountPurposePanel, PURPOSE_LABELS } from './purpose-controller.mjs';
import { mountInvestmentPanel } from './investment-controller.mjs';
import { mountAssemblyPanel } from './assembly-controller.mjs';
import { describeAssemblyTarget, describeSessionTarget, describeRoleTarget, describeContributionTarget, describeConnectionTarget } from './command-draft.mjs';
import { mountWorkPanel } from './work-controller.mjs';
import { mountResponsibilityPanel, RESPONSIBILITY_LABELS, responsibilityValue } from './responsibility-controller.mjs';
import { mountConnectionPanel, CONNECTION_LABELS } from './connection-controller.mjs';
import { mountConnectionView } from './connection-view.mjs';
import { mountConnectionTemplatePanel } from './connection-template-controller.mjs';

const INSTANCES = new WeakMap();
const TARGET_READERS = Object.freeze({ assembly: describeAssemblyTarget, session: describeSessionTarget,
  role: describeRoleTarget, contribution: describeContributionTarget, connection: describeConnectionTarget });

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
  let coordinationEditor = 'session';
  let peopleEditor = 'person';
  let activeChapter = 'coordination';
  let renderedSaved = [];
  let savedProjection = null;
  const savedByKey = new Map();

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
        const enteredName = record.raw.label?.trim();
        if (enteredName) return enteredName;
        const currentName = collectionLabels[target.collection]?.get(target.id);
        if (currentName) return currentName;
        if (record.kind === 'contribution') return responsibilityValue('categoryId', record.raw.categoryId);
        if (record.kind === 'connection') return record.raw.sharedObject?.trim() || 'New connection';
        return 'New record';
      }
      if (record.kind === 'purpose') return 'Plan purpose';
      const names = record.kind === 'person' ? people : works;
      return names.get(record.targetId) ?? record.targetId;
    }
    function savedValue(field, raw) {
      if (Array.isArray(raw)) {
        const names = field === 'workIds' ? works : people;
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
      values.textContent = Object.entries(record.raw).map(([field, raw]) => `${labels[field]}: ${savedValue(field, raw)}`).join(' · ');
      item.append(title, values);
      if (!record.targetExists && !target) {
        const removed = document.createElement('p');
        removed.textContent = 'Record removed. The saved values remain here.';
        item.append(removed);
      } else if (['assembly', 'session', 'purpose', 'person', 'role', 'contribution', 'connection'].includes(record.kind)) {
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
    renderSaved(view.projection);
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
    return view;
  }

  function click(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button) || button.disabled) return;
    if (button.dataset.savedDiscard) {
      const saved = savedByKey.get(button.dataset.savedDiscard);
      if (!saved) return;
      const result = editing.discard(saved.token);
      render();
      announce(result.ok ? 'Saved edit discarded.' : result.error.message);
      (elements.savedList.querySelector('button')
        ?? root.querySelector('[data-native-chapter][aria-selected="true"]') ?? root.querySelector('[data-native-configure] > summary')).focus();
      return;
    }
    if (button.dataset.savedOpen) {
      const saved = savedByKey.get(button.dataset.savedOpen);
      if (!saved) return;
      if (saved.kind === 'purpose') purposePanel?.open();
      else {
        purposePanel?.close({ resume: false });
        chapterShell?.select(['person', 'assembly', 'role', 'contribution'].includes(saved.kind) ? 'people' : 'coordination');
        if (saved.kind === 'assembly') assemblyPanel?.open(saved.targetId);
        else if (saved.kind === 'person') teamPanel?.select(saved.targetId);
        else if (saved.kind === 'session') workPanel?.open(saved.targetId);
        else if (saved.kind === 'role' || saved.kind === 'contribution') responsibilityPanel?.open(saved.targetId);
        else if (saved.kind === 'connection') connectionPanel?.open(saved.targetId);
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
    workPanel?.dispose();
    investmentPanel?.dispose();
    purposePanel?.dispose();
    responsibilityPanel?.dispose();
    assemblyPanel?.dispose();
    teamPanel?.dispose();
    for (const release of cleanup) release();
    cleanup.length = 0;
    editing.dispose();
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
      onBegin: () => beginCoordination('session'),
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
      }, onChange: () => render() });
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
    try { mountCoordinationPanel(root); }
    catch {
      const fallback = root.querySelector('[data-native-fallback]');
      if (fallback) { fallback.hidden = false; fallback.textContent = 'Editing is unavailable.'; }
    }
  }
}
