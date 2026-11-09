import { revealStudioDestination } from './motion.mjs';
import { mountDurationDials, renderTimeReadout } from './time-controls.mjs';
import { renderRemovalReferences } from './removal-references.mjs';
import { getQualityConcept, getLearningPromptDefinition, getRehearsalDefinition } from './assurance-models.mjs';
import { SESSION_FORMS, makeSessionTarget, describeSessionTarget } from './command-draft.mjs';
import { CONTRACT, LIMITS } from './config.mjs';
import { INTEGER, money, duration } from './display.mjs';
import { CONTRIBUTION_CATEGORIES, ROLE_CATALOGUES } from './roles.mjs';
import { capabilityWorkIds, getCapabilityDefinition } from './capabilities.mjs';
import { getChangeFramework, getChangeComponent } from './change-models.mjs';
import { CADENCE_SUBDIVISIONS } from './cadence.mjs';
import { mountSessionOccurrenceControls } from './session-occurrence-controls.mjs';
import { animateRackChange } from './reel-control.mjs';
import { syncReorderButtons, focusSubmitControl } from './rack-controls.mjs';
import { nextCreatedLabel } from './creation-label.mjs';
import { prepareSessionCreation } from './session-creation.mjs';

const INSTANCES = new WeakMap();
let receiverSequence = 0;
const NUMBER_FIELDS = Object.freeze(['hoursPerSession', 'minutesPerSession', 'occurrences']);
const FIELDS = Object.freeze(['label', 'teamId', ...NUMBER_FIELDS, 'funding', 'status']);
const ERROR_FIELDS = Object.freeze([...FIELDS, 'personIds']);
const LABELS = Object.freeze({ label: 'Session name', teamId: 'Team', hoursPerSession: 'Hours', minutesPerSession: 'Minutes',
  occurrences: 'Working sessions', personIds: 'Participants', funding: 'Funding', status: 'Status' });
const FUNDING = Object.freeze({ additional: 'Extra investment', allocated: 'Included in funded time' });
const PLACEMENT_PAGE_SIZE = 12;
const FUNCTION_LABELS = new Map(ROLE_CATALOGUES.functionId.map(role => [role.id, role.label]));

// One complete session form borrows the host's shared draft coordinator. The
// accepted plan, history and all other chapter drafts keep their existing owners.
export function mountWorkPanel(root, { studio, editing, workId = 'review', onBegin = () => {},
  onEditing = () => {}, onAccepted = () => {}, onRecordCreated = () => {}, onClose = () => false,
  isActive = () => true }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, editor = editing.session;
  const requireElement = selector => {
    const element = root.querySelector(selector);
    if (!element) throw new TypeError('Supply the complete working-session panel.');
    return element;
  };
  const elements = Object.fromEntries([
    ['toolbar', '[data-native-session-toolbar]'],
    ['select', '[data-native-session-select]'], ['add', '[data-session-action="create"]'], ['remove', '[data-session-action="remove"]'],
    ['name', '[data-native-agreement]'], ['team', '[data-native-team]'], ['participants', '[data-native-participants]'],
    ['effort', '[data-native-effort]'], ['acceptedStatus', '[data-native-session-standing]'],
    ['configure', '[data-native-configure]'], ['summary', '[data-native-configure] > summary'],
    ['form', '[data-native-configure] form'], ['fieldset', '[data-native-configure] fieldset'],
    ['fields', '[data-native-session-fields]'], ['apply', '[data-action="apply"]'], ['cancel', '[data-action="cancel"]'],
    ['recovery', '[data-native-recovery]'], ['current', '[data-native-current]'], ['fresh', '[data-session-action="freshId"]'],
    ['members', '[data-native-session-members]'], ['emptyPeople', '[data-native-session-people-empty]'],
    ['confirm', '[data-native-session-confirm]'], ['dependencies', '[data-native-session-dependencies]'],
    ['generalError', '[data-native-session-error]'], ['pauseNote', '[data-native-session-pause-note]'],
    ['preview', '[data-native-session-preview]'], ['previewTotal', '[data-native-preview-total]'],
    ['previewStanding', '[data-native-preview-standing]'], ['previewNote', '[data-native-preview-note]'],
    ['durationHours', '[data-native-duration-hours]'], ['durationMinutes', '[data-native-duration-minutes]'],
    ['context', '[data-native-session-context]'], ['status', '[data-native-session-status]'],
  ].map(([key, selector]) => [key, requireElement(selector)]));
  elements.configure.id ||= `studio-session-settings-${++receiverSequence}`;
  const agreement = elements.name.closest('.native-coordination__agreement');
  const agreementRack = document.createElement('details'); agreementRack.className = 'studio-session-details';
  const agreementCaption = document.createElement('summary'); agreementCaption.textContent = 'People and supported work';
  agreement.before(agreementRack); agreementRack.append(agreementCaption, agreement);
  const fieldControls = Object.fromEntries(FIELDS.map(field => [field, [...elements.form.querySelectorAll(`[name="${field}"]`)]]));
  const inputs = Object.fromEntries(FIELDS.map(field => [field, fieldControls[field][0]]));
  const errors = Object.fromEntries(ERROR_FIELDS.map(field => [field, requireElement(`[data-native-error="${field}"]`)]));
  const placementElements = {};
  for (const [key, tag, className] of [
    ['fieldset', 'fieldset', 'native-session__placements'], ['legend', 'legend', ''],
    ['rows', 'div', 'native-session__placement-rows'],
    ['error', 'p', 'native-coordination__error'], ['pager', 'div', 'native-session__placement-pager'],
    ['previous', 'button', ''], ['page', 'span', ''], ['next', 'button', ''],
  ]) {
    const node = document.createElement(tag); node.className = className; placementElements[key] = node;
  }
  placementElements.legend.textContent = 'Place each working session';
  for (const [key, label, action] of [['previous', 'Previous sessions', 'placement-previous'], ['next', 'Next sessions', 'placement-next']]) {
    placementElements[key].type = 'button'; placementElements[key].textContent = label;
    placementElements[key].dataset.sessionAction = action;
  }
  placementElements.error.dataset.nativeError = 'cadencePlacements';
  placementElements.pager.append(placementElements.previous, placementElements.page, placementElements.next);
  placementElements.fieldset.append(placementElements.legend, placementElements.rows,
    placementElements.error, placementElements.pager);
  elements.fields.querySelector('.native-time-controls').after(placementElements.fieldset);
  const occurrenceControls = mountSessionOccurrenceControls(document, {
    onPlacement: writePlacement,
    onRemove(index) {
      const view = editor.read();
      if (disposed || composing || view.status !== 'editing' || !view.draft
        || !Number.isSafeInteger(index) || index < 0 || index >= Number(view.draft.raw.occurrences)) return;
      const epoch = ++generation, token = view.draft.token;
      const remaining = placementValues(view.draft.raw).filter(item => item.occurrenceIndex !== index)
        .map(item => ({ ...item, occurrenceIndex: item.occurrenceIndex > index ? item.occurrenceIndex - 1 : item.occurrenceIndex }));
      const result = operate('step', token, 'occurrences', -1);
      if (!owns(epoch) || !result.ok) { changed(result, epoch); return; }
      changed(operate('setText', token, 'cadencePlacements', JSON.stringify(remaining)), epoch);
    },
    onAdd() {
      const view = editor.read();
      if (disposed || composing || view.status !== 'editing' || !view.draft) return;
      const epoch = ++generation;
      changed(operate('step', view.draft.token, 'occurrences', 1), epoch);
    },
  });
  occurrenceControls.root.hidden = true;
  placementElements.fieldset.after(occurrenceControls.root);
  const remoteTitle = elements.summary.querySelector('[data-native-remote-title]') ?? elements.summary;
  const dials = Object.fromEntries(['hours', 'minutes'].map(unit => {
    const dial = root.querySelector(`[data-native-${unit}-dial]`);
    return [unit, { dial, knob: dial?.querySelector(`[data-native-${unit}-knob]`),
      note: root.querySelector(unit === 'hours' ? '[data-native-hours-knob-note]' : '[data-native-knob-note]') }];
  }));
  const cleanup = [];
  let projection = null, works = new Map(), people = new Map(), teams = new Map();
  let selectedId = workId, lastAcceptedId = workId, selectedTarget = null;
  let membersProjection = null, membersIds = null, memberControls = new Map();
  let diagramProjection = null, diagramId = null;
  let renderedSelection = undefined, renderedDraftToken = null, renderedTeam = undefined;
  let composing = false, disposed = false, acknowledgedOpen = false, generation = 0;
  let retiredToken = null, membersTarget = null, memberOrder = [];
  let placementPage = 0, placementSignature = null, placementToken = null, placementControls = new Map();
  let durationDials;
  let rackMode = false;

  function listen(element, name, callback) {
    element.addEventListener(name, callback);
    cleanup.push(() => element.removeEventListener(name, callback));
  }
  function owns(epoch) { return !disposed && epoch === generation; }
  function releaseRetiredLease() {
    if (retiredToken === null) return;
    const active = editing.read().active;
    if (active?.kind !== 'session' || active.token !== retiredToken) { retiredToken = null; return; }
    const result = editing.park();
    if (result.ok || result.error.code !== 'settling') retiredToken = null;
  }
  function operate(method, ...args) {
    try { return editor[method](...args); }
    // A facade may retire this receiver inside preview/publication while the
    // coordinator is settling. Release only its captured lease after return.
    finally { releaseRetiredLease(); }
  }
  function announce(message) { if (!disposed) elements.status.textContent = message; }
  function markInvalid(field, invalid) {
    for (const input of fieldControls[field]) input.setAttribute('aria-invalid', String(invalid));
  }
  function focusField(field) {
    (fieldControls[field].find(input => input.checked) ?? inputs[field]).focus();
  }
  function dialState() {
    const view = editor.read(), active = editing.read().active;
    return { token: view.draft?.token, hours: view.draft?.raw.hoursPerSession ?? inputs.hoursPerSession.value, minutes: view.draft?.raw.minutesPerSession ?? inputs.minutesPerSession.value,
      composing, errors: { hours: view.draft?.errors.some(error => error.path === 'draft.hoursPerSession'), minutes: view.draft?.errors.some(error => error.path === 'draft.minutesPerSession') },
      enabled: !disposed && !composing && isActive() && elements.configure.open && view.status === 'editing'
        && active?.kind === 'session' && active.token === view.draft?.token };
  }
  function fallback() { return works.has(lastAcceptedId) ? lastAcceptedId : projection.state.work[0]?.id ?? null; }
  function option(value, label, disabled = false) {
    const element = document.createElement('option'); element.value = value; element.textContent = label; element.disabled = disabled; return element;
  }
  function renderIndexes(next) {
    if (next === projection) return;
    projection = next;
    works = new Map(next.state.work.map(row => [row.id, row]));
    people = new Map(next.state.people.map(row => [row.id, row]));
    teams = new Map(next.state.teams.map(row => [row.id, row]));
    renderedSelection = undefined; renderedTeam = undefined;
  }
  function renderSelection(view) {
    const descriptor = describeSessionTarget(view.draft?.sessionId ?? selectedTarget);
    if (view.draft) { selectedTarget = view.draft.sessionId; selectedId = descriptor.id; }
    else if (!works.has(selectedId)) { selectedId = fallback(); selectedTarget = null; }
    if (renderedSelection !== selectedId || renderedDraftToken !== view.draft?.token) {
      const options = projection.state.work.map(row => option(row.id, row.label));
      if (selectedId !== null && !works.has(selectedId)) {
        options.unshift(option(selectedId, descriptor?.mode === 'create' ? 'New session · draft' : 'Removed session · saved edit', true));
      } else if (options.length === 0) options.push(option('', 'Add a working session', true));
      elements.select.replaceChildren(...options);
      elements.select.value = selectedId ?? '';
      renderedSelection = selectedId; renderedDraftToken = view.draft?.token;
    }
    elements.select.disabled = projection.state.work.length === 0;
    elements.remove.disabled = !works.has(selectedId);
    const row = works.get(selectedId);
    elements.name.textContent = row?.label ?? (descriptor?.mode === 'create' && view.draft ? 'New working session' : 'Working sessions');
    elements.team.textContent = row ? teams.get(row.teamId).label : 'Choose a team';
    elements.participants.textContent = row ? `${row.personIds.length} people` : 'Choose participants';
    elements.effort.textContent = row
      ? `${row.personIds.length} people × ${duration(row.minutesPerOccurrence)} per session × ${row.occurrences} working sessions = ${duration(row.personIds.length * row.minutesPerOccurrence * row.occurrences)} of participant effort.`
      : view.draft ? 'Set the people, time and funding below.' : 'Add a working session to plan its people, time and funding.';
    elements.acceptedStatus.textContent = row ? `${row.status === 'paused' ? 'Paused' : 'Planned'} · ${FUNDING[row.funding]}` : '';
    const cadence = projection.state.scoreSettings.cadence;
    elements.context.textContent = cadence ? `Across ${cadence.periods.length} ${cadence.basis === 'sprint' ? 'sprints' : 'quarters'}.`
      : 'Choose a planning horizon to arrange these sessions.';
    renderSessionMap(row);
  }
  function placementValues(raw) {
    try {
      const values = JSON.parse(raw.cadencePlacements || '[]');
      return Array.isArray(values) ? values.filter(item => item && typeof item === 'object') : [];
    } catch { return []; }
  }
  function renderPlacements(raw, view) {
    const cadence = (view.draft?.baseProjection ?? projection).state.scoreSettings.cadence;
    placementElements.fieldset.hidden = !cadence || rackMode;
    occurrenceControls.root.hidden = !cadence || !rackMode;
    elements.fields.querySelector('.studio-repetition').hidden = Boolean(cadence) && rackMode;
    if (!cadence) return;
    if (placementToken !== view.draft?.token) { placementToken = view.draft?.token; placementPage = 0; placementSignature = null; }
    const entered = Number(raw.occurrences);
    const count = Number.isSafeInteger(entered) && entered >= 0 && entered <= LIMITS.occurrences ? entered : 0;
    if (rackMode) occurrenceControls.render({ identity: selectedTarget ?? selectedId, cadence,
      count, placements: placementValues(raw),
      canRemove: view.status === 'editing' && !composing,
      canAdd: view.status === 'editing' && !composing && count < LIMITS.occurrences
        && !view.draft?.errors.some(error => error.path === 'draft.occurrences'),
      error: view.draft?.errors.find(error => error.path === 'draft.cadencePlacements')?.message });
    const pages = Math.max(1, Math.ceil(count / PLACEMENT_PAGE_SIZE));
    placementPage = Math.min(placementPage, pages - 1);
    const first = placementPage * PLACEMENT_PAGE_SIZE, last = Math.min(count, first + PLACEMENT_PAGE_SIZE);
    const signature = JSON.stringify([cadence.basis, cadence.periods, count, placementPage]);
    if (placementSignature !== signature) {
      placementSignature = signature; placementControls = new Map();
      const rows = [];
      for (let index = first; index < last; index++) {
        const row = document.createElement('div'), title = document.createElement('strong');
        row.className = 'native-session__placement-row'; title.textContent = `Session ${index + 1}`; row.append(title);
        const controls = {};
        for (const [field, label] of [['periodId', cadence.basis === 'sprint' ? 'Sprint' : 'Quarter'],
          ['subdivision', cadence.basis === 'sprint' ? 'Week' : 'Month']]) {
          const wrapper = document.createElement('label'), text = document.createElement('span'), select = document.createElement('select');
          text.textContent = label; select.setAttribute('aria-label', `Session ${index + 1} · ${label}`);
          select.dataset.placementIndex = String(index); select.dataset.placementField = field;
          select.append(option('', field === 'periodId' ? 'Choose a period' : 'Choose a period first'));
          if (field === 'periodId') select.append(...cadence.periods.map(period => option(period.id, period.label)));
          else for (let part = 1; part <= CADENCE_SUBDIVISIONS[cadence.basis]; part++) select.append(option(String(part), `${label} ${part}`));
          wrapper.append(text, select); row.append(wrapper); controls[field] = select;
        }
        rows.push(row); placementControls.set(index, controls);
      }
      placementElements.rows.replaceChildren(...rows);
    }
    const placements = new Map(placementValues(raw).map(item => [item.occurrenceIndex, item]));
    for (const [index, controls] of placementControls) {
      const selected = placements.get(index);
      controls.periodId.value = selected?.periodId ?? '';
      controls.subdivision.value = selected?.subdivision == null ? '' : String(selected.subdivision);
      controls.subdivision.disabled = !selected?.periodId;
    }
    placementElements.error.textContent = view.draft?.errors.find(error => error.path === 'draft.cadencePlacements')?.message ?? '';
    placementElements.pager.hidden = pages === 1;
    placementElements.previous.disabled = placementPage === 0;
    placementElements.next.disabled = placementPage === pages - 1;
    placementElements.page.textContent = `Sessions ${first + 1}–${last} of ${count}`;
  }
  function renderSessionMap(row) {
    const participantList = root.querySelector('[data-native-session-map-people]');
    if (!participantList || (diagramProjection === projection && diagramId === row?.id)) return;
    diagramProjection = projection; diagramId = row?.id;
    const item = (label, note) => {
      const li = document.createElement('li'), name = document.createElement('strong');
      name.textContent = label; li.append(name);
      if (note) { const small = document.createElement('small'); small.textContent = note; li.append(small); }
      return li;
    };
    participantList.replaceChildren(...(row?.personIds.length ? row.personIds.map(id => item(people.get(id).label))
      : [item(row ? 'Participants to be chosen' : 'Choose the people for this session')]));
    root.querySelector('[data-native-session-map-time]').textContent = row
      ? `${duration(row.minutesPerOccurrence)} per person · ${row.occurrences} working sessions` : 'Time to be planned';
    const supported = [];
    if (row) {
      for (const connection of projection.state.connections) if (connection.workIds.includes(row.id))
        supported.push(item(connection.sharedObject, `${teams.get(connection.senderTeamId).label} → ${teams.get(connection.receiverTeamId).label}`));
      for (const contribution of projection.state.contributions) if (contribution.workIds.includes(row.id))
        supported.push(item(CONTRIBUTION_CATEGORIES.find(category => category.id === contribution.categoryId).label, contribution.receiverPersonId ? `Received by ${people.get(contribution.receiverPersonId).label}` : 'Receiver to be chosen'));
      for (const mapping of projection.state.changeSettings.frameworkMaps) {
        for (const component of mapping.components) if (component.workIds.includes(row.id))
          supported.push(item(getChangeComponent(mapping.frameworkId, mapping.version, component.componentId).label,
            getChangeFramework(mapping.frameworkId, mapping.version).name));
      }
      const assurance = projection.state.assuranceSettings;
      for (const concept of assurance.quality.concepts) if (concept.workIds.includes(row.id))
        supported.push(item(getQualityConcept(concept.conceptId).label, concept.included ? 'Quality work · Included' : 'Quality work · Available'));
      for (const event of assurance.recoveryEvents) if (event.workIds.includes(row.id))
        supported.push(item(event.label, 'Recovery work'));
      for (const learning of assurance.learningActions) if (learning.workIds.includes(row.id))
        supported.push(item(getLearningPromptDefinition(learning.promptId).label, 'Learning work'));
      for (const rehearsal of assurance.rehearsals) if (rehearsal.workIds.includes(row.id))
        supported.push(item(getRehearsalDefinition(rehearsal.definitionId, rehearsal.definitionVersion).name, 'Rehearsal response'));
      for (const [collection, kind] of [['abilities', 'ability'], ['practices', 'practice']]) {
        for (const instance of projection.state[collection]) if (capabilityWorkIds(instance).includes(row.id)) {
          const definition = getCapabilityDefinition(kind, instance.definitionId, instance.definitionVersion);
          supported.push(item(definition.action, instance.teamId ? teams.get(instance.teamId).label : 'Team to be chosen'));
        }
      }
    }
    root.querySelector('[data-native-session-map-support]').replaceChildren(...(supported.length ? supported
      : [item('Supporting links can be added', 'Link this session from Coordination, Abilities, Change or Quality & recovery.')]));
  }
  function renderTeam(raw) {
    if (renderedTeam !== raw) {
      const options = [option('', 'Choose a team'), ...projection.state.teams.map(team => option(team.id, team.label))];
      if (raw && !teams.has(raw)) options.push(option(raw, `${raw} · removed team`, true));
      inputs.teamId.replaceChildren(...options); inputs.teamId.value = raw;
      renderedTeam = raw;
    }
  }
  function memberButton(label, action, id, disabled) {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label;
    element.dataset.sessionAction = action; element.dataset.personId = id; element.disabled = disabled;
    element.setAttribute('aria-label', `${label}: ${people.get(id)?.label ?? id}`); return element;
  }
  function renderMembers(ids) {
    if (membersTarget !== selectedTarget) {
      membersTarget = selectedTarget; memberOrder = []; membersIds = null;
    }
    if (membersProjection === projection && membersIds?.length === ids.length
      && ids.every((id, index) => id === membersIds[index])) return;
    membersProjection = projection; membersIds = [...ids];
    const positions = new Map(ids.map((id, index) => [id, index]));
    const available = new Set([...people.keys(), ...ids]);
    memberOrder = memberOrder.filter(id => available.has(id));
    const shown = new Set(memberOrder);
    for (const id of [...ids, ...people.keys()]) if (!shown.has(id)) { memberOrder.push(id); shown.add(id); }
    const ordered = memberOrder;
    const previous = memberControls; memberControls = new Map();
    const rows = [];
    for (const id of ordered) {
      const person = people.get(id), selected = positions.has(id);
      const checkbox = previous.get(id) ?? document.createElement('input');
      let item = checkbox.closest('li');
      if (!item) {
        item = document.createElement('li'); item.className = 'native-coordination__member';
        const label = document.createElement('label'), words = document.createElement('span');
        const name = document.createElement('strong'), rate = document.createElement('small'), state = document.createElement('small');
        const role = document.createElement('small'); role.dataset.sessionMemberRole = '';
        state.className = 'native-coordination__member-status';
        checkbox.type = 'checkbox'; checkbox.dataset.sessionPerson = id;
        words.append(name, rate, role, state); label.append(checkbox, words);
        const actions = document.createElement('div'); actions.className = 'native-coordination__actions native-coordination__manipulation';
        actions.append(memberButton('Move up', 'person-up', id, true), memberButton('Move down', 'person-down', id, true));
        item.append(label, actions);
      }
      item.dataset.selected = String(selected); checkbox.checked = selected;
      item.dataset.sessionMember = id;
      item.querySelector('strong').textContent = person?.label ?? `${id} · removed person`;
      item.querySelector('small').textContent = !person ? 'Remove this selection.' : person.rateCentsPerHour === null ? 'Hourly rate needed' : `${money(person.rateCentsPerHour)}/hour`;
      const role = item.querySelector('[data-session-member-role]');
      role.textContent = FUNCTION_LABELS.get(person?.role?.functionId) ?? '';
      role.hidden = !rackMode || !role.textContent;
      item.querySelector('.native-coordination__member-status').textContent = selected ? `Included · ${positions.get(id) + 1}` : 'Available';
      const [up, down] = item.querySelectorAll('button'), index = positions.get(id);
      syncReorderButtons(up, down, { label: person?.label ?? id, index, count: ids.length });
      rows.push(item); memberControls.set(id, checkbox);
    }
    // Membership changes keep mounted controls. Explicit order changes and
    // newly available people update the row sequence through the same owner.
    if (rows.length !== elements.members.children.length || rows.some((row, index) => row !== elements.members.children[index]))
      elements.members.replaceChildren(...rows);
    elements.emptyPeople.hidden = projection.state.people.length > 0;
  }
  function renderDependencies(error) {
    const references = error?.references ?? [];
    const records = new Map(references.map(reference => [`${reference.collection}:${['assuranceSettings', 'scoreSettings'].includes(reference.collection) ? reference.field.split('[')[0] : ''}:${reference.id}`, reference]));
    renderRemovalReferences(elements.dependencies, projection.state, [...records.values()]);
  }

  function render() {
    const epoch = generation;
    const view = editor.read();
    if (!owns(epoch)) return view;
    renderIndexes(view.projection); renderSelection(view);
    const draft = view.draft, descriptor = describeSessionTarget(draft?.sessionId ?? selectedTarget);
    const removing = descriptor?.mode === 'remove' && Boolean(draft);
    root.dataset.sessionState = view.status;
    elements.configure.hidden = selectedId === null && !draft;
    elements.fieldset.disabled = view.status !== 'editing';
    elements.recovery.hidden = view.status !== 'stale';
    elements.fresh.hidden = !view.creationConflict;
    const row = works.get(selectedId);
    remoteTitle.textContent = removing ? `Remove ${works.get(descriptor.id)?.label ?? 'working session'}`
      : descriptor?.mode === 'create' && draft ? 'New session settings' : `Session settings · ${row?.label ?? 'Working session'}`;
    elements.current.textContent = view.creationConflict ? 'The plan already contains this session. Use these entries to prepare a new session.'
      : row ? `Current values: ${row.label} · ${duration(row.minutesPerOccurrence)} per session · ${row.occurrences} working sessions · ${FUNDING[row.funding]} · ${row.status}.`
        : descriptor?.mode === 'create' ? 'The plan changed. Review these entries before adding the session.'
          : 'This session was removed. Your saved entries remain below.';
    elements.fields.hidden = removing;
    elements.confirm.hidden = !removing;
    elements.confirm.textContent = removing ? `Remove ${row?.label ?? descriptor.id} and its links? Undo restores them.` : '';
    const accepted = row ? { label: row.label, teamId: row.teamId, personIds: row.personIds,
      cadencePlacements: JSON.stringify((projection.state.scoreSettings.cadence?.placements ?? [])
        .filter(item => item.workId === row.id).map(({ workId, ...item }) => item)),
      hoursPerSession: String(Math.floor(row.minutesPerOccurrence / CONTRACT.minutesPerHour)),
      minutesPerSession: String(row.minutesPerOccurrence % CONTRACT.minutesPerHour), occurrences: String(row.occurrences),
      funding: row.funding, status: row.status } : {};
    const raw = draft?.raw ?? accepted;
    renderPlacements(raw, view);
    renderTeam(raw.teamId ?? '');
    for (const field of FIELDS) {
      const value = raw[field] ?? '';
      for (const input of fieldControls[field]) {
        if (input.type === 'radio') input.checked = input.value === value;
        else if (input.value !== value) input.value = value;
      }
      const error = draft?.errors.find(item => item.path === `draft.${field}`);
      markInvalid(field, Boolean(error));
      errors[field].textContent = error ? `${LABELS[field]}: ${error.message}` : '';
    }
    const membershipError = draft?.errors.find(item => item.path === 'draft.personIds');
    errors.personIds.textContent = membershipError?.message ?? '';
    elements.members.setAttribute('aria-invalid', String(Boolean(membershipError)));
    if (!removing) renderMembers(raw.personIds ?? []);
    elements.pauseNote.hidden = raw.status !== 'paused';
    renderTimeReadout({ outputs: { hours: elements.durationHours, minutes: elements.durationMinutes } }, raw, { errors: draft?.errors, composing });
    const preview = draft && !composing && view.status === 'editing' ? operate('preview', draft.token) : null;
    if (!owns(epoch)) return view;
    if (preview) {
      const current = editor.read();
      // A publication during preview retires the captured editing view. Its
      // replacement is stale/idle, so this reconciliation performs no preview.
      if (current.status !== 'editing' && (current.projection !== view.projection
        || current.status !== view.status || current.draft?.token !== draft?.token)) return render();
    }
    const error = preview && !preview.ok ? preview.error : null;
    const errorField = error && ERROR_FIELDS.find(field => error.path.endsWith(`.${field}`));
    if (errorField && !draft?.errors.length) {
      errors[errorField].textContent = `${LABELS[errorField]}: ${error.message}`;
      if (errorField === 'personIds') elements.members.setAttribute('aria-invalid', 'true');
      else markInvalid(errorField, true);
    }
    elements.generalError.textContent = error && !draft?.errors.length && !errorField ? error.message : '';
    durationDials.refresh();
    renderDependencies(error);
    elements.preview.hidden = removing;
    const result = preview?.ok ? preview.projection.result : !draft ? projection.result : null;
    elements.previewStanding.textContent = `${draft ? 'Draft ' : ''}${result?.standing === 'priced' ? 'total' : 'known total'} · USD`;
    elements.previewTotal.textContent = result ? money(result.knownCommitmentCents) : '—';
    elements.previewNote.textContent = composing ? 'Finish entering the value.'
      : view.status === 'stale' ? 'Review the saved entries against the current plan.'
        : error ? 'Check the settings above.' : draft?.changed ? 'Apply to update the total.' : '';
    elements.apply.classList.toggle('native-control--remove', removing);
    elements.apply.textContent = removing ? 'Remove session' : descriptor?.mode === 'create' && draft ? 'Add session' : 'Apply changes';
    elements.apply.disabled = Boolean(error?.references?.length);
    elements.apply.setAttribute('aria-disabled', String(!draft?.changed));
    return view;
  }
  function focusEditor() {
    const view = editor.read(), descriptor = describeSessionTarget(view.draft?.sessionId);
    if (view.status === 'stale') (view.creationConflict ? elements.fresh : elements.recovery.querySelector('button')).focus({ preventScroll: true });
    else if (view.status === 'editing') (descriptor.mode === 'remove' ? elements.cancel : descriptor.mode === 'create' ? inputs.label : inputs.hoursPerSession).focus({ preventScroll: true });
    if (!rackMode) revealStudioDestination(elements.configure);
  }
  function focusOccurrence(index) {
    const view = editor.read(), epoch = generation;
    if (disposed || !isActive() || !elements.configure.open || view.status !== 'editing'
      || !Number.isSafeInteger(index) || index < 0 || index >= Number(view.draft?.raw.occurrences)) return false;
    if (rackMode) return occurrenceControls.select(index, { focus: true });
    placementPage = Math.floor(index / PLACEMENT_PAGE_SIZE);
    render();
    if (!owns(epoch) || editor.read().draft?.token !== view.draft.token) return false;
    const control = placementControls.get(index)?.periodId;
    if (!control || control.matches(':disabled') || !control.getClientRects().length) return false;
    control.focus({ preventScroll: true });
    return true;
  }
  function opened(result, epoch, focus) {
    if (!owns(epoch)) return result;
    composing = false;
    if (result.view.draft) {
      selectedTarget = result.view.draft.sessionId;
      if (works.has(result.view.draft.targetId)) lastAcceptedId = result.view.draft.targetId;
    }
    render();
    if (!owns(epoch)) return result;
    if (editor.read().draft) { acknowledgedOpen = true; elements.configure.open = true; }
    announce(result.ok ? '' : result.error.message);
    const token = editor.read().draft?.token;
    onEditing();
    if (owns(epoch) && editor.read().draft?.token === token && focus) focusEditor();
    return result;
  }
  function open(target, focus = true) {
    if (disposed) return;
    durationDials?.release();
    const epoch = ++generation;
    onBegin();
    if (!owns(epoch)) return;
    return opened(operate('begin', target, projection), epoch, focus);
  }
  function select(id, focus = true) {
    if (disposed || !works.has(id)) return;
    return open(makeSessionTarget('work.update', id), focus);
  }
  function create({ periodId, subdivision = 1 } = {}) {
    if (disposed) return;
    durationDials?.release();
    const epoch = ++generation;
    onBegin();
    if (!owns(epoch)) return;
    let result = operate('create', 'work.create', projection);
    if (!owns(epoch) || !result.ok) return opened(result, epoch, true);
    const cadence = projection.state.scoreSettings.cadence;
    if (!cadence?.periods.some(period => period.id === periodId)) return opened(result, epoch, true);
    const token = result.view.draft.token;
    const team = projection.state.teams.find(row => row.personIds.some(id => people.has(id)));
    const values = [['label', nextCreatedLabel(projection.state.work, 'session')]];
    if (team) values.push(['teamId', team.id]);
    values.push(['cadencePlacements', JSON.stringify([
      { occurrenceIndex: 0, periodId, subdivision },
    ])]);
    for (const [field, value] of values) {
      result = operate('setText', token, field, value);
      if (!owns(epoch) || !result.ok) return opened(result, epoch, true);
    }
    if (team) result = operate('setIds', token, 'personIds', team.personIds.filter(id => people.has(id)));
    return opened(result, epoch, true);
  }
  function createAccepted(context = {}) {
    if (disposed) return { ok: false, error: { code: 'disposed', path: 'session', message: 'Open another session editor.' }, view: editor.read() };
    const base = projection, prepared = prepareSessionCreation(base.state, context);
    if (!prepared.ok) return { ...prepared, view: editor.read() };
    durationDials?.release();
    if (disposed) return;
    const epoch = ++generation;
    const superseded = () => ({ ok: false, error: { code: 'superseded', path: 'session',
      message: 'Continue with the current edit.' }, view: editor.read() });
    let result = operate('create', 'work.create', base);
    if (!result.ok) return result;
    if (!owns(epoch)) return superseded();
    const token = result.view.draft.token, descriptor = describeSessionTarget(result.view.draft.sessionId);
    // Admit the draft before changing the visible owner. A full saved-edit rack
    // leaves its current form and raw values in place.
    onBegin();
    if (!owns(epoch) || editor.read().draft?.token !== token) return superseded();
    for (const [field, value] of Object.entries(prepared.raw)) {
      result = operate(Array.isArray(value) ? 'setIds' : 'setText', token, field, value);
      if (!owns(epoch)) return superseded();
      if (!result.ok) return opened(result, epoch, false);
    }
    result = operate('apply', token);
    if (!result.ok) return opened(result, epoch, false);
    const accepted = result.projection ?? studio.read();
    // Publication has happened even when a callback selects another editor.
    // Report that fact so a caller never repeats creation to recover its view.
    const receipt = opened => ({ ok: true, accepted: true, id: descriptor.id,
      projection: accepted, opened, view: editor.read() });
    if (!owns(epoch)) return receipt(false);
    onAccepted(accepted);
    if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return receipt(false);
    onRecordCreated(descriptor);
    if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return receipt(false);
    selectedId = descriptor.id; lastAcceptedId = descriptor.id;
    selectedTarget = null;
    acknowledgedOpen = false; elements.configure.open = false;
    render();
    return receipt(false);
  }
  function close({ park = true } = {}) {
    if (disposed) return;
    durationDials?.release();
    const epoch = ++generation; acknowledgedOpen = false;
    if (park && editing.read().active?.kind === 'session') editing.park();
    if (owns(epoch)) elements.configure.open = false;
  }
  function changed(result, epoch, focus = null) {
    if (!owns(epoch)) return;
    render();
    if (!owns(epoch)) return;
    announce(result.ok ? '' : result.error.message);
    const token = editor.read().draft?.token;
    onEditing();
    if (owns(epoch) && editor.read().draft?.token === token && focus) focus();
  }
  function settle(action) {
    if (disposed) return;
    durationDials?.release();
    const view = editor.read();
    if (!view.draft) return;
    if (composing && action === 'apply') { announce('Finish entering the value, then apply.'); return; }
    if (action === 'apply' && view.status === 'editing' && !view.draft.changed) { announce('The plan already uses these values.'); return; }
    const descriptor = describeSessionTarget(view.draft.sessionId), epoch = ++generation;
    const result = operate(action, view.draft.token);
    if (!owns(epoch)) return;
    if (!result.ok) {
      changed(result, epoch, () => {
        const field = FIELDS.find(name => result.error.path === `draft.${name}`);
        if (field) focusField(field);
      }); return;
    }
    if (action === 'cancel') {
      if (descriptor.mode === 'create') selectedId = fallback();
      selectedTarget = null; close({ park: false }); render(); announce('Changes cancelled.');
      const closedAt = generation; onEditing();
      if (owns(closedAt)) {
        const handled = onClose();
        if (handled === true || !owns(closedAt)) return;
        (elements.configure.hidden ? elements.add : elements.summary).focus();
      }
      return;
    }
    const accepted = result.projection ?? studio.read();
    onAccepted(accepted);
    if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return;
    if (descriptor.mode === 'remove') {
      selectedTarget = null; selectedId = fallback(); close({ park: false }); render(); announce('Session removed.');
      const closedAt = generation; onEditing();
      if (owns(closedAt)) {
        const handled = onClose();
        if (handled === true || !owns(closedAt)) return;
        (selectedId === null ? elements.add : elements.select).focus();
      }
      return;
    }
    if (descriptor.mode === 'create') onRecordCreated(descriptor);
    if (!owns(epoch)) return;
    selectedId = descriptor.id; lastAcceptedId = descriptor.id;
    const next = operate('begin', makeSessionTarget('work.update', descriptor.id), studio.read());
    if (!owns(epoch)) return;
    selectedTarget = next.view.draft?.sessionId ?? null;
    const reopenedToken = next.view.draft?.token;
    render();
    if (!owns(epoch)) return;
    acknowledgedOpen = true; elements.configure.open = true;
    announce(next.ok ? `Total updated to ${money(studio.read().result.knownCommitmentCents)}.` : next.error.message);
    onEditing();
    if (owns(epoch) && editor.read().draft?.token === reopenedToken) focusSubmitControl(elements.apply);
  }
  function membership(id, delta = null, checked = false) {
    const view = editor.read();
    if (disposed || view.status !== 'editing' || !Array.isArray(view.draft?.raw.personIds)) return;
    const epoch = ++generation, ids = [...view.draft.raw.personIds], index = ids.indexOf(id);
    if (delta === null) {
      if (checked && index < 0) ids.push(id);
      else if (!checked && index >= 0) ids.splice(index, 1);
      else return;
    } else {
      const destination = index + delta;
      if (index < 0 || destination < 0 || destination >= ids.length) return;
      [ids[index], ids[destination]] = [ids[destination], ids[index]];
      const selected = new Set(ids); let next = 0;
      memberOrder = memberOrder.map(member => selected.has(member) ? ids[next++] : member);
    }
    const update = () => changed(operate('setIds', view.draft.token, 'personIds', ids), epoch, () => memberControls.get(id)?.focus());
    if (delta !== null) animateRackChange(elements.members, update,
      { selector: '[data-session-member]', key: 'sessionMember' });
    else update();
  }
  function edit(event) {
    const field = event.target.name;
    if (disposed || !fieldControls[field]?.includes(event.target) || event.target.type === 'radio' && !event.target.checked) return;
    durationDials?.release();
    const view = editor.read();
    if (!view.draft) return;
    const epoch = ++generation;
    changed(operate('setText', view.draft.token, field, event.target.value), epoch);
  }
  function editPlacement(event) {
    const control = event.target, index = Number(control.dataset.placementIndex), field = control.dataset.placementField;
    if (disposed || placementControls.get(index)?.[field] !== control) return;
    writePlacement(index, field, control.value);
  }
  function writePlacement(index, field, value) {
    const view = editor.read();
    if (disposed || view.status !== 'editing' || !view.draft) return;
    const placements = placementValues(view.draft.raw), current = placements.find(item => item.occurrenceIndex === index);
    const remaining = placements.filter(item => item.occurrenceIndex !== index);
    const next = field === 'periodId' ? (value ? { occurrenceIndex: index, periodId: value, subdivision: current?.subdivision ?? 1 } : null)
      : { ...current, subdivision: Number(value) };
    if (next) remaining.push(next);
    remaining.sort((left, right) => left.occurrenceIndex - right.occurrenceIndex);
    const epoch = ++generation;
    changed(operate('setText', view.draft.token, 'cadencePlacements', JSON.stringify(remaining)), epoch);
  }
  function setRackMode(enabled) {
    if (disposed || rackMode === Boolean(enabled)) return;
    rackMode = Boolean(enabled);
    elements.configure.classList.toggle('studio-session-deck', rackMode);
    membersProjection = null;
    render();
  }
  function click(event) {
    const button = event.target.closest('button');
    if (!button || (!root.contains(button) && !elements.configure.contains(button)) || button.disabled || disposed) return;
    const action = button.dataset.action ?? button.dataset.sessionAction;
    if (action === 'placement-previous' || action === 'placement-next') {
      placementPage += action === 'placement-previous' ? -1 : 1;
      render(); placementControls.values().next().value?.periodId.focus(); return;
    }
    if (action === 'create') { create(); return; }
    if (action === 'remove' && works.has(selectedId)) { open(makeSessionTarget('work.remove', selectedId)); return; }
    if (action === 'person-up' || action === 'person-down') { membership(button.dataset.personId, action === 'person-up' ? -1 : 1); return; }
    if (action === 'cancel' || action === 'discard') { settle('cancel'); return; }
    const view = editor.read();
    if (!view.draft) return;
    if (action === 'review' || action === 'use-current' || action === 'freshId') {
      const method = action === 'use-current' ? 'useCurrent' : action;
      const epoch = ++generation;
      changed(operate(method, view.draft.token, projection), epoch, focusEditor); return;
    }
    const field = button.dataset.field;
    if (NUMBER_FIELDS.includes(field) && !composing) {
      const epoch = ++generation;
      changed(operate('step', view.draft.token, field, Number(button.dataset.step)), epoch);
    }
  }
  function dispose() {
    if (disposed) return;
    durationDials?.release();
    disposed = true; generation += 1;
    for (const release of cleanup) release();
    cleanup.length = 0;
    placementElements.fieldset.remove();
    occurrenceControls.dispose();
    elements.configure.classList.remove('studio-session-deck');
    elements.fields.querySelector('.studio-repetition').hidden = false;
    agreementRack.before(agreement); agreementRack.remove();
    const active = editing.read().active;
    if (active?.kind === 'session') retiredToken = active.token;
    releaseRetiredLease();
    elements.fieldset.disabled = true; elements.configure.open = false;
    elements.add.disabled = true; elements.remove.disabled = true; elements.select.disabled = true;
    elements.toolbar.hidden = true;
    durationDials?.dispose();
    delete root.dataset.sessionReady; INSTANCES.delete(root);
  }
  const receiver = Object.freeze({ read: () => editor.read(), render, refresh: render, select, open, create, createAccepted, close, focusOccurrence, setRackMode,
    isOpen: () => !disposed && elements.configure.open,
    readReceiver: () => ({ selectedId: disposed ? null : selectedId,
      expanded: !disposed && isActive() && elements.configure.open
        && !elements.configure.closest('[hidden], details:not([open])'),
      controlsId: elements.configure.id }),
    resume() {
      if (disposed) return;
      composing = false;
      if (elements.configure.open && selectedTarget) open(selectedTarget, false);
      else render();
    }, dispose });
  try {
    durationDials = mountDurationDials({ dials, read: dialState,
      write(token, field, value) { const epoch = ++generation; changed(operate('setText', token, field, value), epoch); } });
    for (const [field, metadata] of Object.entries(SESSION_FORMS['work.create'].fields)) {
      if (inputs[field]?.tagName === 'INPUT') inputs[field].maxLength = metadata.maxLength;
    }
    for (const [field, maximum, unit] of [
      ['hoursPerSession', Math.floor(LIMITS.minutesPerOccurrence / CONTRACT.minutesPerHour), 'hours'],
      ['minutesPerSession', CONTRACT.minutesPerHour - 1, 'minutes'], ['occurrences', LIMITS.occurrences, 'sessions'],
    ]) requireElement(`[data-native-range="${field}"]`).textContent = `0–${INTEGER.format(maximum)} ${unit}`;
    listen(root, 'click', event => { if (!elements.configure.contains(event.target)) click(event); });
    listen(elements.configure, 'click', click);
    listen(elements.select, 'change', () => select(elements.select.value));
    listen(elements.form, 'input', edit);
    listen(placementElements.rows, 'change', editPlacement);
    listen(elements.form, 'submit', event => { event.preventDefault(); settle('apply'); });
    listen(elements.form, 'compositionstart', () => { composing = true; render(); });
    listen(elements.form, 'compositionend', event => { composing = false; edit(event); });
    listen(elements.members, 'change', event => {
      const id = event.target.dataset.sessionPerson;
      if (memberControls.get(id) === event.target) membership(id, null, event.target.checked);
    });
    listen(elements.configure, 'toggle', () => {
      if (disposed) return;
      if (elements.configure.open) {
        if (isActive() && !acknowledgedOpen) {
          if (selectedTarget) open(selectedTarget, false);
          else if (selectedId !== null) select(selectedId, false);
        }
      } else if (acknowledgedOpen) { close(); onEditing(); }
    });
    render();
    if (disposed) return receiver;
    elements.toolbar.hidden = false; elements.add.disabled = false;
    root.dataset.sessionReady = 'true'; INSTANCES.set(root, receiver);
    if (selectedId !== null && isActive()) select(selectedId, false);
    return receiver;
  } catch (error) { dispose(); throw error; }
}
