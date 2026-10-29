import { createStudio } from './state.mjs';
import { createWorkDraftAdapter } from './draft.mjs';
import { CONTRACT, LIMITS } from './config.mjs';
import { INTEGER, money, duration } from './display.mjs';
import { mountTeamPanel } from './team-controller.mjs';

const MINUTES_PER_HOUR = CONTRACT.minutesPerHour;

const FIELD_RULES = Object.freeze({
  hoursPerSession: Object.freeze({ maximum: Math.floor(LIMITS.minutesPerOccurrence / MINUTES_PER_HOUR), unit: 'hours', label: 'Hours' }),
  minutesPerSession: Object.freeze({ maximum: MINUTES_PER_HOUR - 1, unit: 'minutes', label: 'Minutes' }),
  occurrences: Object.freeze({ maximum: LIMITS.occurrences, unit: 'sessions', label: 'Working sessions' }),
});
const FIELDS = Object.freeze(Object.keys(FIELD_RULES));
const INSTANCES = new WeakMap();

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
    ['agreement', '[data-native-agreement]'], ['effort', '[data-native-effort]'],
    ['team', '[data-native-team]'], ['participants', '[data-native-participants]'],
    ['traceList', '[data-native-trace-list]'],
    ['traceSummary', '[data-native-trace-summary]'], ['status', '[data-native-status]'],
    ['configure', '[data-native-configure]'], ['configureSummary', '[data-native-configure] > summary'],
    ['form', 'form'], ['fieldset', 'fieldset'],
    ['apply', '[data-action="apply"]'], ['previewTotal', '[data-native-preview-total]'],
    ['previewStanding', '[data-native-preview-standing]'], ['previewNote', '[data-native-preview-note]'],
    ['durationHours', '[data-native-duration-hours]'], ['durationMinutes', '[data-native-duration-minutes]'],
    ['sessionContext', '[data-native-session-context]'],
    ['fallback', '[data-native-fallback]'],
  ].map(([name, selector]) => [name, requireElement(selector)]));
  const inputs = Object.fromEntries(FIELDS.map(field => [field, requireElement(`[name="${field}"]`)]));
  const errors = Object.fromEntries(FIELDS.map(field => [field, requireElement(`[data-native-error="${field}"]`)]));
  const ranges = Object.fromEntries(FIELDS.map(field => [field, requireElement(`[data-native-range="${field}"]`)]));
  const editor = createWorkDraftAdapter(studio, null, { durationFormat: 'hours-minutes' });
  const cleanup = [];
  let renderedProjection = null;
  let work = null;
  let disposed = false;
  let composing = false;
  let teamPanel = null;

  function listen(target, type, handler) {
    target.addEventListener(type, handler);
    cleanup.push(() => target.removeEventListener(type, handler));
  }

  function text(name, value) { elements[name].textContent = value; }
  function announce(message) { text('status', message); }

  function renderAccepted(projection) {
    if (projection === renderedProjection) return;
    const { state, result } = projection;
    work = state.work.find(row => row.id === workId) ?? null;
    text('total', money(result.knownCommitmentCents));
    text('standing', result.standing === 'priced' ? 'Total · USD' : 'Known total · USD');
    text('funded', money(result.fundedKnownCents));
    text('additional', money(result.additionalKnownCents));
    text('allocated', money(result.allocatedKnownCents));
    text('agreement', work?.label ?? 'Working session unavailable');
    text('team', state.teams.find(team => team.id === work?.teamId)?.label ?? 'Team unavailable');
    text('participants', work ? `${work.personIds.length} people` : 'Session unavailable');
    text('sessionContext', `Across this ${state.horizonWeeks}-week plan.`);
    text('effort', work
      ? `${work.personIds.length} people × ${duration(work.minutesPerOccurrence)} per session × ${work.occurrences} working sessions = ${duration(work.personIds.length * work.minutesPerOccurrence * work.occurrences)} of participant effort.`
      : 'This plan has no working session.');
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

  function renderPreview(view) {
    if (!view.draft) {
      text('previewTotal', money(view.projection.result.knownCommitmentCents));
      text('previewStanding', 'Total · USD');
      text('previewNote', '');
      return;
    }
    if (composing) {
      text('previewTotal', '—');
      text('previewStanding', 'Draft total');
      text('previewNote', 'Finish entering the number.');
      return;
    }
    const proposed = editor.preview(view.draft.token);
    if (!proposed.ok) {
      text('previewTotal', '—');
      text('previewStanding', 'Draft total');
      text('previewNote', view.draft.errors.length ? 'Check the quantities above.' : proposed.error.message);
      return;
    }
    const result = proposed.projection.result;
    text('previewTotal', money(result.knownCommitmentCents));
    text('previewStanding', result.standing === 'priced' ? 'Draft total · USD' : 'Draft known total · USD');
    text('previewNote', view.draft.changed
      ? 'Apply to update the total.'
      : '');
  }

  function render() {
    const view = editor.read();
    if (disposed) return view;
    renderAccepted(view.projection);
    root.dataset.nativeState = view.status;
    elements.fieldset.disabled = view.draft === null;
    elements.apply.setAttribute('aria-disabled', view.draft?.changed ? 'false' : 'true');
    const acceptedValues = work ? {
      hoursPerSession: String(Math.floor(work.minutesPerOccurrence / MINUTES_PER_HOUR)),
      minutesPerSession: String(work.minutesPerOccurrence % MINUTES_PER_HOUR),
      occurrences: String(work.occurrences),
    } : {};
    for (const field of FIELDS) {
      const input = inputs[field];
      const value = view.draft?.raw[field] ?? acceptedValues[field] ?? '';
      if (input.value !== value) input.value = value;
      const error = view.draft?.errors.find(item => item.path === `draft.${field}`);
      input.setAttribute('aria-invalid', error ? 'true' : 'false');
      errors[field].textContent = error ? `${FIELD_RULES[field].label}: ${error.message}` : '';
    }
    for (const [field, output] of [['hoursPerSession', 'durationHours'], ['minutesPerSession', 'durationMinutes']]) {
      const raw = view.draft?.raw[field] ?? acceptedValues[field];
      const invalid = composing || raw === undefined || view.draft?.errors.some(error => error.path === `draft.${field}`);
      text(output, invalid ? '—' : String(Number(raw)).padStart(2, '0'));
    }
    renderPreview(view);
    teamPanel?.refresh();
    return view;
  }

  function begin() {
    const view = editor.read();
    if (view.draft === null) {
      const result = editor.begin(workId, view.projection);
      if (!result.ok) { render(); announce(result.error.message); return; }
    }
    elements.configure.open = true;
    render();
    announce('');
  }

  function settle(action) {
    if (composing && action === 'apply') { announce('Finish entering the number, then apply.'); return; }
    const view = editor.read();
    if (view.draft === null) return;
    if (action === 'apply' && !view.draft.changed && view.status !== 'stale') {
      announce('The total already uses these values.');
      return;
    }
    const result = editor[action](view.draft.token);
    render();
    if (!result.ok) {
      announce(result.error.message);
      const field = FIELDS.find(name => result.error.path === `draft.${name}`);
      if (field) inputs[field].focus();
      return;
    }
    composing = false;
    if (action === 'apply') {
      begin();
      elements.apply.focus();
    } else {
      elements.configure.open = false;
      elements.configureSummary.focus();
    }
    announce(action === 'apply' ? `Total updated to ${money(result.view.projection.result.knownCommitmentCents)}.` : 'Changes cancelled.');
  }

  function editText(event) {
    const field = event.target.name;
    if (!Object.hasOwn(inputs, field) || inputs[field] !== event.target) return;
    const view = editor.read();
    if (view.draft === null) return;
    const result = editor.setText(view.draft.token, field, event.target.value);
    render();
    if (!result.ok) announce(result.error.message);
    else announce('');
  }

  function click(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button) || button.disabled) return;
    if (button.closest('[data-native-team-editor]')) return;
    const action = button.dataset.action;
    if (action === 'cancel') { settle('cancel'); return; }
    const field = button.dataset.field;
    if (!Object.hasOwn(inputs, field) || composing) return;
    const view = editor.read();
    if (view.draft === null) return;
    const result = editor.step(view.draft.token, field, Number(button.dataset.step));
    render();
    if (!result.ok) announce(result.error.message);
    else announce('');
  }

  function dispose() {
    if (disposed) return editor.read();
    disposed = true;
    teamPanel?.dispose();
    for (const release of cleanup) release();
    cleanup.length = 0;
    const view = editor.dispose().view;
    elements.fieldset.disabled = true;
    elements.configure.open = false;
    elements.fallback.hidden = false;
    elements.fallback.textContent = 'Editing closed.';
    delete root.dataset.nativeReady;
    root.dataset.nativeState = 'disposed';
    announce('Editing closed.');
    INSTANCES.delete(root);
    return view;
  }

  const receiver = Object.freeze({ read: () => editor.read(), refresh: render, dispose });
  try {
    render();
    for (const field of FIELDS) {
      inputs[field].maxLength = 32;
      ranges[field].textContent = `0–${INTEGER.format(FIELD_RULES[field].maximum)} ${FIELD_RULES[field].unit}`;
    }
    listen(root, 'click', click);
    listen(elements.form, 'submit', event => { event.preventDefault(); settle('apply'); });
    listen(elements.form, 'input', editText);
    listen(elements.form, 'compositionstart', () => { composing = true; render(); });
    listen(elements.form, 'compositionend', event => { composing = false; editText(event); });
    listen(elements.configure, 'toggle', () => {
      if (elements.configure.open && editor.read().draft === null) begin();
    });
    listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
    listen(window, 'pageshow', () => render());
    begin();
    const teamRoot = root.querySelector('[data-native-team-editor]');
    if (teamRoot) teamPanel = mountTeamPanel(teamRoot, { studio, onAccepted: () => render() });
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
