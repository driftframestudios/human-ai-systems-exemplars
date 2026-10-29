import { createDraftCoordinator } from './editing.mjs';
import { money, duration } from './display.mjs';

const FIELDS = Object.freeze(['ratePerHour', 'fundedHours', 'fundedMinutes']);
const LABELS = Object.freeze({ ratePerHour: 'Hourly rate', fundedHours: 'Funded hours', fundedMinutes: 'Funded minutes' });
const INSTANCES = new WeakMap();

// The host owns accepted state. This receiver owns one person's editing controls.
export function mountTeamPanel(root, { studio, editing: sharedEditing, isActive = () => true, canOpen = isActive,
  onAccepted = () => {}, onEditing = () => {}, onBegin = () => {} }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument;
  const find = selector => {
    const element = root.querySelector(selector);
    if (!element) throw new TypeError('Supply the complete native team panel.');
    return element;
  };
  const elements = Object.fromEntries([
    ['roster', '[data-team-roster]'], ['configure', '[data-person-configure]'],
    ['summary', '[data-person-configure] > summary'], ['name', '[data-person-name]'],
    ['form', '[data-person-configure] form'], ['fieldset', '[data-person-configure] fieldset'], ['apply', '[data-person-action="apply"]'],
    ['total', '[data-person-total]'], ['capacity', '[data-person-capacity]'],
    ['status', '[data-person-status]'], ['empty', '[data-team-empty]'],
    ['recovery', '[data-person-recovery]'], ['current', '[data-person-current]'],
  ].map(([key, selector]) => [key, find(selector)]));
  const inputs = Object.fromEntries(FIELDS.map(field => [field, find(`[data-person-configure] [name="${field}"]`)]));
  const errors = Object.fromEntries(FIELDS.map(field => [field, find(`[data-person-error="${field}"]`)]));
  const editing = sharedEditing ?? createDraftCoordinator(studio);
  const editor = editing.person;
  const cleanup = [];
  let selectedId = null;
  let projection = null;
  let people = new Map();
  let disposed = false;
  let composing = false;

  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    cleanup.push(() => target.removeEventListener(event, handler));
  }

  function announce(message) { elements.status.textContent = message; }

  function renderRoster(next) {
    if (next === projection) return;
    people = new Map(next.state.people.map(person => [person.id, person]));
    const memberships = new Map(next.state.people.map(person => [person.id, []]));
    for (const team of next.state.teams) {
      for (const id of team.personIds) memberships.get(id).push(team.label);
    }
    const capacity = new Map(next.result.capacity.map(row => [row.personId, row]));
    const fragment = document.createDocumentFragment();
    for (const person of next.state.people) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.personId = person.id;
      button.textContent = person.label;
      const saved = document.createElement('span');
      saved.dataset.personSaved = person.id;
      saved.className = 'native-coordination__plate';
      saved.textContent = 'Saved edit';
      saved.hidden = true;
      const team = document.createElement('p');
      team.textContent = memberships.get(person.id).join(' · ') || 'No team assigned';
      const detail = document.createElement('p');
      detail.textContent = `${person.rateCentsPerHour === null ? 'Hourly rate needed' : `${money(person.rateCentsPerHour)}/hour`} · ${duration(person.fundedMinutes)} funded`;
      const remaining = capacity.get(person.id).remainingMinutes;
      const space = document.createElement('p');
      space.textContent = remaining < 0 ? `${duration(-remaining)} above funded time` : `${duration(remaining)} of funded time available`;
      item.append(button, saved, team, detail, space);
      fragment.append(item);
    }
    elements.roster.replaceChildren(fragment);
    elements.empty.hidden = next.state.people.length > 0;
    projection = next;
  }

  function render() {
    const view = editor.read();
    if (disposed) return view;
    renderRoster(view.projection);
    root.dataset.teamState = view.status;
    for (const button of elements.roster.querySelectorAll('[data-person-id]')) {
      button.setAttribute('aria-pressed', String(button.dataset.personId === selectedId));
    }
    const parked = new Set(editing.read().parked.filter(row => row.kind === 'person').map(row => row.targetId));
    for (const marker of elements.roster.querySelectorAll('[data-person-saved]')) marker.hidden = !parked.has(marker.dataset.personSaved);
    elements.configure.hidden = selectedId === null;
    elements.name.textContent = people.get(selectedId)?.label ?? 'Person unavailable';
    elements.fieldset.disabled = view.status !== 'editing';
    elements.recovery.hidden = view.status !== 'stale';
    const currentPerson = people.get(selectedId);
    elements.current.textContent = currentPerson
      ? `Current values: ${currentPerson.rateCentsPerHour === null ? 'hourly rate unknown' : `${money(currentPerson.rateCentsPerHour)}/hour`} · ${duration(currentPerson.fundedMinutes)} funded.`
      : 'This person has been removed. The saved values remain below.';
    elements.apply.setAttribute('aria-disabled', String(!view.draft?.changed));
    for (const field of FIELDS) {
      const raw = view.draft?.raw[field] ?? '';
      if (inputs[field].value !== raw) inputs[field].value = raw;
      const error = view.draft?.errors.find(item => item.path === `draft.${field}`);
      inputs[field].setAttribute('aria-invalid', String(Boolean(error)));
      errors[field].textContent = error ? `${LABELS[field]}: ${error.message}` : '';
    }
    const proposed = view.draft && !composing ? editor.preview(view.draft.token) : null;
    elements.total.textContent = proposed?.ok ? money(proposed.projection.result.knownCommitmentCents) : '—';
    const row = proposed?.ok ? proposed.projection.result.capacity.find(item => item.personId === selectedId) : null;
    elements.capacity.textContent = row ? (row.remainingMinutes < 0
      ? `${duration(-row.remainingMinutes)} above funded time`
      : `${duration(row.remainingMinutes)} of funded time available`) : view.status === 'stale'
      ? 'Review the saved values against the current plan.' : 'Check the rate and funded time.';
    if (view.status === 'stale') announce('The plan changed. Review or discard the saved edit.');
    return view;
  }

  function select(personId, focus = true) {
    if (disposed) return;
    onBegin();
    if (disposed) return;
    const result = editor.begin(personId, studio.read());
    selectedId = editing.read().selected.person;
    render();
    if (selectedId !== null) elements.configure.open = true;
    if (focus) {
      if (editor.read().status === 'editing') inputs.ratePerHour.focus();
      else if (editor.read().status === 'stale') elements.recovery.querySelector('button').focus();
    }
    announce(result.ok ? '' : result.error.message);
    onEditing();
  }

  function settle(action) {
    const view = editor.read();
    if (!view.draft) return;
    if (composing && action === 'apply') { announce('Finish entering the number, then apply.'); return; }
    const result = editor[action](view.draft.token);
    if (!result.ok) {
      render();
      announce(result.error.message);
      const field = FIELDS.find(key => result.error.path === `draft.${key}`);
      if (field) inputs[field].focus();
      return;
    }
    composing = false;
    if (action === 'apply') {
      editor.begin(selectedId, studio.read());
      onAccepted(studio.read());
      render();
      elements.configure.open = true;
      elements.apply.focus();
      announce(`Total updated to ${money(studio.read().result.knownCommitmentCents)}.`);
    } else {
      render();
      elements.configure.open = false;
      elements.summary.focus();
      announce('Changes cancelled.');
      onEditing();
    }
  }

  function edit(event) {
    const field = event.target.name;
    if (!Object.hasOwn(inputs, field) || inputs[field] !== event.target) return;
    const view = editor.read();
    if (!view.draft) return;
    const result = editor.setText(view.draft.token, field, event.target.value);
    announce(result.ok ? '' : result.error.message);
    render();
  }

  function click(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button) || button.disabled) return;
    if (button.dataset.personId) { select(button.dataset.personId); return; }
    const action = button.dataset.personAction;
    if (action === 'review' || action === 'use-current' || action === 'discard') {
      const view = editor.read();
      if (!view.draft) return;
      const method = action === 'use-current' ? 'useCurrent' : action === 'discard' ? 'cancel' : 'review';
      const result = editor[method](view.draft.token, projection);
      render();
      announce(result.ok ? '' : result.error.message);
      onEditing();
      if (result.ok) {
        if (action === 'discard') { elements.configure.open = false; elements.summary.focus(); }
        else inputs.ratePerHour.focus();
      }
      return;
    }
    if (button.dataset.personAction === 'cancel') { settle('cancel'); return; }
    const field = button.dataset.personField;
    const view = editor.read();
    if (!Object.hasOwn(inputs, field) || !view.draft || composing) return;
    const result = editor.step(view.draft.token, field, Number(button.dataset.step));
    announce(result.ok ? '' : result.error.message);
    render();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const release of cleanup) release();
    cleanup.length = 0;
    if (!sharedEditing) editing.dispose();
    elements.fieldset.disabled = true;
    elements.configure.open = false;
    delete root.dataset.teamReady;
    INSTANCES.delete(root);
  }

  const receiver = Object.freeze({ read: () => editor.read(), refresh: render,
    close: () => { if (!disposed) { composing = false; elements.configure.open = false; } },
    select, resume: () => { composing = false; if (selectedId !== null && elements.configure.open) select(selectedId, false); else render(); }, dispose });
  try {
    for (const input of Object.values(inputs)) input.maxLength = 32;
    listen(root, 'click', click);
    listen(elements.form, 'input', edit);
    listen(elements.form, 'submit', event => { event.preventDefault(); settle('apply'); });
    listen(elements.form, 'compositionstart', () => { composing = true; render(); });
    listen(elements.form, 'compositionend', event => { composing = false; edit(event); });
    listen(elements.configure.querySelector('summary'), 'click', event => {
      if (!disposed && !elements.configure.open && selectedId !== null && canOpen()) {
        event.preventDefault(); select(selectedId);
      }
    });
    listen(elements.configure, 'toggle', () => {
      if (isActive() && elements.configure.open && editor.read().draft === null && selectedId !== null) select(selectedId);
    });
    render();
    root.dataset.teamReady = 'true';
    INSTANCES.set(root, receiver);
    return receiver;
  } catch (error) { dispose(); throw error; }
}
