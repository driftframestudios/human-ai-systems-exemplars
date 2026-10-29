import { createPersonDraftAdapter } from './person-draft.mjs';
import { money, duration } from './display.mjs';

const FIELDS = Object.freeze(['ratePerHour', 'fundedHours', 'fundedMinutes']);
const LABELS = Object.freeze({ ratePerHour: 'Hourly rate', fundedHours: 'Funded hours', fundedMinutes: 'Funded minutes' });
const INSTANCES = new WeakMap();

// The host owns accepted state. This receiver owns one person's editing controls.
export function mountTeamPanel(root, { studio, onAccepted = () => {} }) {
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
    ['form', 'form'], ['fieldset', 'fieldset'], ['apply', '[data-person-action="apply"]'],
    ['total', '[data-person-total]'], ['capacity', '[data-person-capacity]'],
    ['status', '[data-person-status]'], ['empty', '[data-team-empty]'],
  ].map(([key, selector]) => [key, find(selector)]));
  const inputs = Object.fromEntries(FIELDS.map(field => [field, find(`[name="${field}"]`)]));
  const errors = Object.fromEntries(FIELDS.map(field => [field, find(`[data-person-error="${field}"]`)]));
  const editor = createPersonDraftAdapter(studio);
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
      const team = document.createElement('p');
      team.textContent = memberships.get(person.id).join(' · ') || 'No team assigned';
      const detail = document.createElement('p');
      detail.textContent = `${person.rateCentsPerHour === null ? 'Hourly rate needed' : `${money(person.rateCentsPerHour)}/hour`} · ${duration(person.fundedMinutes)} funded`;
      const remaining = capacity.get(person.id).remainingMinutes;
      const space = document.createElement('p');
      space.textContent = remaining < 0 ? `${duration(-remaining)} above funded time` : `${duration(remaining)} of funded time available`;
      item.append(button, team, detail, space);
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
    elements.configure.hidden = selectedId === null;
    elements.name.textContent = people.get(selectedId)?.label ?? 'Person unavailable';
    elements.fieldset.disabled = view.draft === null;
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
      ? 'Cancel this edit to use the current plan.' : 'Check the rate and funded time.';
    if (view.status === 'stale') announce('The plan changed. Cancel this edit to use the current plan.');
    return view;
  }

  function select(personId) {
    const view = editor.read();
    if (view.draft) {
      if (view.draft.personId === personId) {
        elements.configure.open = true;
        inputs.ratePerHour.focus();
        return;
      }
      if (view.draft.changed) {
        announce(view.status === 'stale' ? 'Cancel this edit to use the current plan.'
          : 'Apply or cancel these changes before choosing another person.');
        return;
      }
      editor.cancel(view.draft.token);
    }
    const result = editor.begin(personId, studio.read());
    if (!result.ok) { announce(result.error.message); return; }
    selectedId = personId;
    render();
    elements.configure.open = true;
    inputs.ratePerHour.focus();
    announce('');
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
    editor.dispose();
    elements.fieldset.disabled = true;
    elements.configure.open = false;
    delete root.dataset.teamReady;
    INSTANCES.delete(root);
  }

  const receiver = Object.freeze({ read: () => editor.read(), refresh: render, dispose });
  try {
    for (const input of Object.values(inputs)) input.maxLength = 32;
    listen(root, 'click', click);
    listen(elements.form, 'input', edit);
    listen(elements.form, 'submit', event => { event.preventDefault(); settle('apply'); });
    listen(elements.form, 'compositionstart', () => { composing = true; render(); });
    listen(elements.form, 'compositionend', event => { composing = false; edit(event); });
    listen(elements.configure, 'toggle', () => {
      if (elements.configure.open && editor.read().draft === null && selectedId !== null) select(selectedId);
    });
    render();
    root.dataset.teamReady = 'true';
    INSTANCES.set(root, receiver);
    return receiver;
  } catch (error) { dispose(); throw error; }
}
