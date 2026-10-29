import { SESSION_FORMS, makeSessionTarget, describeSessionTarget } from './command-draft.mjs';
import { CONTRACT, LIMITS, PRACTICES } from './config.mjs';
import { INTEGER, money, duration } from './display.mjs';

const INSTANCES = new WeakMap();
const NUMBER_FIELDS = Object.freeze(['hoursPerSession', 'minutesPerSession', 'occurrences']);
const FIELDS = Object.freeze(['label', 'teamId', ...NUMBER_FIELDS, 'funding', 'status']);
const ERROR_FIELDS = Object.freeze([...FIELDS, 'personIds']);
const LABELS = Object.freeze({ label: 'Session name', teamId: 'Team', hoursPerSession: 'Hours', minutesPerSession: 'Minutes',
  occurrences: 'Working sessions', personIds: 'Participants', funding: 'Funding', status: 'Status' });
const FUNDING = Object.freeze({ additional: 'Extra investment', allocated: 'Included in funded time' });
const PRACTICE_LABELS = new Map(PRACTICES.map(practice => [practice.id, practice.action]));

// One complete session form borrows the host's shared draft coordinator. The
// accepted plan, history and all other chapter drafts keep their existing owners.
export function mountWorkPanel(root, { studio, editing, workId = 'review', onBegin = () => {},
  onEditing = () => {}, onAccepted = () => {}, isActive = () => true }) {
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
  const inputs = Object.fromEntries(FIELDS.map(field => [field, elements.form.elements.namedItem(field)]));
  const errors = Object.fromEntries(ERROR_FIELDS.map(field => [field, requireElement(`[data-native-error="${field}"]`)]));
  const cleanup = [];
  let projection = null, works = new Map(), people = new Map(), teams = new Map(), practices = new Map();
  let selectedId = workId, lastAcceptedId = workId, selectedTarget = null;
  let membersProjection = null, membersIds = null, membersTeam = null, memberControls = new Map();
  let renderedSelection = undefined, renderedDraftToken = null, renderedTeam = undefined;
  let composing = false, disposed = false, acknowledgedOpen = false, generation = 0;
  let retiredToken = null;

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
    practices = new Map(next.state.practices.map(row => [row.id, row]));
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
    elements.context.textContent = `Across this ${projection.state.horizonWeeks}-week plan.`;
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
  function renderMembers(ids, teamId) {
    if (membersProjection === projection && membersTeam === teamId && membersIds?.length === ids.length
      && ids.every((id, index) => id === membersIds[index])) return;
    membersProjection = projection; membersTeam = teamId; membersIds = [...ids];
    const positions = new Map(ids.map((id, index) => [id, index]));
    const teamMembers = new Set(teams.get(teamId)?.personIds ?? []);
    const ordered = [...ids, ...projection.state.people.filter(person => !positions.has(person.id)).map(person => person.id)];
    memberControls = new Map();
    const fragment = document.createDocumentFragment();
    for (const id of ordered) {
      const person = people.get(id), item = document.createElement('li'), label = document.createElement('label');
      const checkbox = document.createElement('input'), words = document.createElement('span'), name = document.createElement('strong'), rate = document.createElement('small');
      checkbox.type = 'checkbox'; checkbox.dataset.sessionPerson = id; checkbox.checked = positions.has(id);
      name.textContent = person?.label ?? `${id} · removed person`;
      rate.textContent = !person ? 'Remove this selection.' : `${person.rateCentsPerHour === null ? 'Hourly rate needed' : `${money(person.rateCentsPerHour)}/hour`}${teamId && !teamMembers.has(id) ? ' · outside this team' : ''}`;
      words.append(name, rate); label.append(checkbox, words); item.append(label);
      if (positions.has(id)) {
        const actions = document.createElement('div'); actions.className = 'native-coordination__actions';
        const index = positions.get(id);
        actions.append(memberButton('Move up', 'person-up', id, index === 0), memberButton('Move down', 'person-down', id, index === ids.length - 1));
        item.append(actions);
      }
      fragment.append(item); memberControls.set(id, checkbox);
    }
    elements.members.replaceChildren(fragment);
    elements.emptyPeople.hidden = projection.state.people.length > 0;
  }
  function renderDependencies(error) {
    const references = error?.references ?? [];
    elements.dependencies.hidden = references.length === 0;
    elements.dependencies.replaceChildren(...references.map(reference => {
      const row = document.createElement('li');
      const practice = practices.get(reference.id);
      const name = PRACTICE_LABELS.get(practice?.practiceId) ?? reference.id;
      row.textContent = `Practice: ${name}${practice ? ` · ${teams.get(practice.teamId).label}` : ''}`;
      return row;
    }));
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
    elements.summary.textContent = removing ? `Remove ${works.get(descriptor.id)?.label ?? 'working session'}`
      : descriptor?.mode === 'create' && draft ? 'New session settings' : 'Session settings';
    const row = works.get(selectedId);
    elements.current.textContent = view.creationConflict ? 'The plan already contains this session. Use these entries to prepare a new session.'
      : row ? `Current values: ${row.label} · ${duration(row.minutesPerOccurrence)} per session · ${row.occurrences} working sessions · ${FUNDING[row.funding]} · ${row.status}.`
        : descriptor?.mode === 'create' ? 'The plan changed. Review these entries before adding the session.'
          : 'This session was removed. Your saved entries remain below.';
    elements.fields.hidden = removing;
    elements.confirm.hidden = !removing;
    elements.confirm.textContent = removing ? `Remove ${row?.label ?? descriptor.id} from this plan?` : '';
    const accepted = row ? { label: row.label, teamId: row.teamId, personIds: row.personIds,
      hoursPerSession: String(Math.floor(row.minutesPerOccurrence / CONTRACT.minutesPerHour)),
      minutesPerSession: String(row.minutesPerOccurrence % CONTRACT.minutesPerHour), occurrences: String(row.occurrences),
      funding: row.funding, status: row.status } : {};
    const raw = draft?.raw ?? accepted;
    renderTeam(raw.teamId ?? '');
    for (const field of FIELDS) {
      const value = raw[field] ?? '';
      if (inputs[field].value !== value) inputs[field].value = value;
      const error = draft?.errors.find(item => item.path === `draft.${field}`);
      inputs[field].setAttribute('aria-invalid', String(Boolean(error)));
      errors[field].textContent = error ? `${LABELS[field]}: ${error.message}` : '';
    }
    const membershipError = draft?.errors.find(item => item.path === 'draft.personIds');
    errors.personIds.textContent = membershipError?.message ?? '';
    elements.members.setAttribute('aria-invalid', String(Boolean(membershipError)));
    if (!removing) renderMembers(raw.personIds ?? [], raw.teamId ?? '');
    elements.pauseNote.hidden = raw.status !== 'paused';
    for (const [field, output] of [['hoursPerSession', elements.durationHours], ['minutesPerSession', elements.durationMinutes]]) {
      const value = raw[field];
      output.textContent = composing || !/^[0-9]+$/.test(value ?? '') || draft?.errors.some(error => error.path === `draft.${field}`)
        ? '—' : String(Number(value)).padStart(2, '0');
    }
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
      (errorField === 'personIds' ? elements.members : inputs[errorField]).setAttribute('aria-invalid', 'true');
    }
    elements.generalError.textContent = error && !draft?.errors.length && !errorField ? error.message : '';
    renderDependencies(error);
    elements.preview.hidden = removing;
    const result = preview?.ok ? preview.projection.result : !draft ? projection.result : null;
    elements.previewStanding.textContent = `${draft ? 'Draft ' : ''}${result?.standing === 'priced' ? 'total' : 'known total'} · USD`;
    elements.previewTotal.textContent = result ? money(result.knownCommitmentCents) : '—';
    elements.previewNote.textContent = composing ? 'Finish entering the value.'
      : view.status === 'stale' ? 'Review the saved entries against the current plan.'
        : error ? 'Check the settings above.' : draft?.changed ? 'Apply to update the total.' : '';
    elements.apply.textContent = removing ? 'Remove session' : descriptor?.mode === 'create' && draft ? 'Add session' : 'Apply changes';
    elements.apply.disabled = Boolean(error?.references?.length);
    elements.apply.setAttribute('aria-disabled', String(!draft?.changed));
    return view;
  }
  function focusEditor() {
    const view = editor.read(), descriptor = describeSessionTarget(view.draft?.sessionId);
    if (view.status === 'stale') (view.creationConflict ? elements.fresh : elements.recovery.querySelector('button')).focus();
    else if (view.status === 'editing') (descriptor.mode === 'remove' ? elements.cancel : descriptor.mode === 'create' ? inputs.label : inputs.hoursPerSession).focus();
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
    const epoch = ++generation;
    onBegin();
    if (!owns(epoch)) return;
    return opened(operate('begin', target, projection), epoch, focus);
  }
  function select(id, focus = true) {
    if (disposed || !works.has(id)) return;
    return open(makeSessionTarget('work.update', id), focus);
  }
  function create() {
    if (disposed) return;
    const epoch = ++generation;
    onBegin();
    if (!owns(epoch)) return;
    return opened(operate('create', 'work.create', projection), epoch, true);
  }
  function close({ park = true } = {}) {
    if (disposed) return;
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
        if (field) inputs[field].focus();
      }); return;
    }
    if (action === 'cancel') {
      if (descriptor.mode === 'create') selectedId = fallback();
      selectedTarget = null; close({ park: false }); render(); announce('Changes cancelled.');
      const closedAt = generation; onEditing();
      if (owns(closedAt)) (elements.configure.hidden ? elements.add : elements.summary).focus();
      return;
    }
    const accepted = result.projection ?? studio.read();
    onAccepted(accepted);
    if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return;
    if (descriptor.mode === 'remove') {
      selectedTarget = null; selectedId = fallback(); close({ park: false }); render(); announce('Session removed.');
      const closedAt = generation; onEditing();
      if (owns(closedAt)) (selectedId === null ? elements.add : elements.select).focus();
      return;
    }
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
    if (owns(epoch) && editor.read().draft?.token === reopenedToken) elements.apply.focus();
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
    }
    changed(operate('setIds', view.draft.token, 'personIds', ids), epoch, () => memberControls.get(id)?.focus());
  }
  function edit(event) {
    const field = event.target.name;
    if (disposed || inputs[field] !== event.target) return;
    const view = editor.read();
    if (!view.draft) return;
    const epoch = ++generation;
    changed(operate('setText', view.draft.token, field, event.target.value), epoch);
  }
  function click(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button) || button.disabled || disposed) return;
    const action = button.dataset.action ?? button.dataset.sessionAction;
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
    disposed = true; generation += 1;
    for (const release of cleanup) release();
    cleanup.length = 0;
    const active = editing.read().active;
    if (active?.kind === 'session') retiredToken = active.token;
    releaseRetiredLease();
    elements.fieldset.disabled = true; elements.configure.open = false;
    elements.add.disabled = true; elements.remove.disabled = true; elements.select.disabled = true;
    elements.toolbar.hidden = true;
    delete root.dataset.sessionReady; INSTANCES.delete(root);
  }
  const receiver = Object.freeze({ read: () => editor.read(), render, refresh: render, select, open, create, close,
    isOpen: () => !disposed && elements.configure.open,
    resume() {
      if (disposed) return;
      composing = false;
      if (elements.configure.open && selectedTarget) open(selectedTarget, false);
      else render();
    }, dispose });
  try {
    for (const [field, metadata] of Object.entries(SESSION_FORMS['work.create'].fields)) {
      if (inputs[field]?.tagName === 'INPUT') inputs[field].maxLength = metadata.maxLength;
    }
    for (const [field, maximum, unit] of [
      ['hoursPerSession', Math.floor(LIMITS.minutesPerOccurrence / CONTRACT.minutesPerHour), 'hours'],
      ['minutesPerSession', CONTRACT.minutesPerHour - 1, 'minutes'], ['occurrences', LIMITS.occurrences, 'sessions'],
    ]) requireElement(`[data-native-range="${field}"]`).textContent = `0–${INTEGER.format(maximum)} ${unit}`;
    listen(root, 'click', click);
    listen(elements.select, 'change', () => select(elements.select.value));
    listen(elements.form, 'input', edit);
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
