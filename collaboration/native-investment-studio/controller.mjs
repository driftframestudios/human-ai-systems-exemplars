import { createStudio } from './state.mjs';
import { createWorkDraftAdapter } from './draft.mjs';
import { LIMITS } from './config.mjs';

const FIELDS = Object.freeze(['minutesPerOccurrence', 'occurrences']);
const INTEGER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const INSTANCES = new WeakMap();

// Format admitted integer cents directly so the displayed cents stay exact.
function money(cents) {
  if (cents === null) return 'Rate needed';
  const value = BigInt(cents);
  const magnitude = value < 0n ? -value : value;
  return `${value < 0n ? '−' : ''}$${INTEGER.format(magnitude / 100n)}.${String(magnitude % 100n).padStart(2, '0')}`;
}

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
    ['allocated', '[data-native-allocated]'], ['revision', '[data-native-revision]'],
    ['agreement', '[data-native-agreement]'], ['effort', '[data-native-effort]'],
    ['team', '[data-native-team]'], ['participants', '[data-native-participants]'],
    ['scope', '[data-native-scope]'], ['traceList', '[data-native-trace-list]'],
    ['traceSummary', '[data-native-trace-summary]'], ['status', '[data-native-status]'],
    ['draftState', '[data-native-draft-state]'], ['configure', '[data-native-configure]'],
    ['form', 'form'], ['fieldset', 'fieldset'], ['edit', '[data-action="edit"]'],
    ['fallback', '[data-native-fallback]'],
  ].map(([name, selector]) => [name, requireElement(selector)]));
  const inputs = Object.fromEntries(FIELDS.map(field => [field, requireElement(`[name="${field}"]`)]));
  const errors = Object.fromEntries(FIELDS.map(field => [field, requireElement(`[data-native-error="${field}"]`)]));
  const ranges = Object.fromEntries(FIELDS.map(field => [field, requireElement(`[data-native-range="${field}"]`)]));
  const editor = createWorkDraftAdapter(studio);
  const cleanup = [];
  let renderedProjection = null;
  let work = null;
  let disposed = false;
  let composing = false;

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
    text('standing', result.standing === 'priced' ? 'Priced plan · USD' : 'Known subtotal · review open conditions');
    text('funded', money(result.fundedKnownCents));
    text('additional', money(result.additionalKnownCents));
    text('allocated', money(result.allocatedKnownCents));
    text('revision', `Accepted revision ${state.revision}`);
    text('agreement', work?.label ?? 'Agreement unavailable in this plan');
    text('team', state.teams.find(team => team.id === work?.teamId)?.label ?? 'Agreement unavailable');
    text('participants', work ? `${work.personIds.length} participants` : 'Open a plan containing this agreement');
    text('effort', work
      ? `${work.personIds.length} people × ${work.minutesPerOccurrence} minutes × ${work.occurrences} occurrences = ${INTEGER.format(work.personIds.length * work.minutesPerOccurrence * work.occurrences)} participant-minutes`
      : 'Select a plan containing this agreement to edit it.');
    text('scope', work
      ? `${work.funding === 'additional' ? 'Additional purchase' : 'Inside funded staffing'} · ${work.status === 'planned' ? 'planned work' : 'paused obligation'} · ${state.horizonWeeks}-week context. Occurrences carry effort; calendar timing remains unspecified.`
      : 'The accepted plan remains available in the investment trace.');
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
        ['Funded staffing', capacity.fundedMinutes, staffing.get(person.id)],
        ['Additional purchase', capacity.additionalMinutes, capacity.additionalCents],
        ['Allocated inside staffing', capacity.allocatedMinutes, capacity.allocatedCents],
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
    text('traceSummary', `Funded staffing ${money(result.fundedKnownCents)} + additional purchases ${money(result.additionalKnownCents)} = ${money(result.knownCommitmentCents)} known investment. Allocated attribution of ${money(result.allocatedKnownCents)} sits inside staffing. Each person’s minutes settle once per funding pool, rounded to the nearest cent. ${result.standing === 'priced' ? 'All declared effort is priced.' : 'Rates, paused work, or funded-capacity obligations require review.'}`);
    renderedProjection = projection;
  }

  function render() {
    const view = editor.read();
    if (disposed) return view;
    renderAccepted(view.projection);
    root.dataset.nativeState = view.status;
    elements.edit.disabled = work === null;
    elements.fieldset.disabled = view.draft === null;
    text('draftState', view.status === 'stale'
      ? 'This draft belongs to an earlier plan. Cancel it, then edit the accepted agreement.'
      : view.draft ? 'Draft · apply to update the accepted investment.' : 'Accepted plan · edit the agreement to explore a change.');
    for (const field of FIELDS) {
      const input = inputs[field];
      const value = view.draft?.raw[field] ?? String(work?.[field] ?? '');
      if (input.value !== value) input.value = value;
      const error = view.draft?.errors.find(item => item.path === `draft.${field}`);
      input.setAttribute('aria-invalid', error ? 'true' : 'false');
      errors[field].textContent = error?.message ?? '';
    }
    return view;
  }

  function begin(focus = true) {
    let view = editor.read();
    if (view.draft === null) {
      const result = editor.begin(workId, view.projection);
      if (!result.ok) { render(); announce(result.error.message); return; }
      view = result.view;
    }
    elements.configure.open = true;
    render();
    announce('');
    if (focus) inputs.minutesPerOccurrence.focus();
  }

  function settle(action) {
    if (composing && action === 'apply') { announce('Finish entering this quantity, then apply the draft.'); return; }
    const view = editor.read();
    if (view.draft === null) return;
    const result = editor[action](view.draft.token);
    render();
    if (!result.ok) {
      announce(result.error.message);
      const field = FIELDS.find(name => result.error.path === `draft.${name}`);
      if (field) inputs[field].focus();
      return;
    }
    elements.configure.open = false;
    composing = false;
    elements.edit.focus();
    announce(action === 'apply' ? `Changes applied. Accepted investment ${money(result.view.projection.result.knownCommitmentCents)}.` : 'Draft cancelled. The accepted investment is unchanged.');
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

  const actions = Object.freeze({ edit: () => begin(), cancel: () => settle('cancel') });
  function click(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button) || button.disabled) return;
    const action = button.dataset.action;
    if (Object.hasOwn(actions, action)) { actions[action](); return; }
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
    for (const release of cleanup) release();
    cleanup.length = 0;
    const view = editor.dispose().view;
    elements.fieldset.disabled = true;
    elements.edit.disabled = true;
    elements.edit.hidden = true;
    elements.fallback.hidden = false;
    elements.fallback.textContent = 'Read the accepted plan and its trace here, or continue into the complete Studio. This editor is closed.';
    delete root.dataset.nativeReady;
    root.dataset.nativeState = 'disposed';
    announce('This editor is closed. The accepted plan remains available.');
    INSTANCES.delete(root);
    return view;
  }

  const receiver = Object.freeze({ read: () => editor.read(), refresh: render, dispose });
  try {
    render();
    for (const field of FIELDS) {
      inputs[field].maxLength = 32;
      ranges[field].textContent = `Whole ${field === 'occurrences' ? 'occurrences' : 'minutes'} · 0–${INTEGER.format(LIMITS[field])}`;
    }
    listen(root, 'click', click);
    listen(elements.form, 'submit', event => { event.preventDefault(); settle('apply'); });
    listen(elements.form, 'input', editText);
    listen(elements.form, 'compositionstart', () => { composing = true; });
    listen(elements.form, 'compositionend', event => { composing = false; editText(event); });
    listen(elements.configure, 'toggle', () => {
      if (elements.configure.open && editor.read().draft === null) begin(false);
    });
    listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
    listen(window, 'pageshow', () => render());
    elements.edit.hidden = false;
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
      if (fallback) fallback.textContent = 'Read the example below, or continue into the complete Studio. This editor is currently unavailable.';
    }
  }
}
