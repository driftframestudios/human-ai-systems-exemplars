import { PURPOSE_FIELDS, LIMITS } from './config.mjs';

export const PURPOSE_LABELS = Object.freeze({
  changedAbility: 'What changes?', affectedPopulation: 'Who is affected?',
  observationSignal: 'How will you tell?', accountableOwner: 'Who decides?',
  reviewBoundary: 'When will you review?', openConditions: 'What is still open?',
});

// The root lends one editing port. This receiver owns its disclosure and DOM;
// accepted purpose and parked text retain the shared Studio owners.
export function mountPurposePanel(root, { studio, editing, onOpen, onClose, onChange }) {
  const editor = editing.purpose;
  const summary = root.querySelector('summary');
  const form = root.querySelector('form');
  const fieldset = root.querySelector('fieldset');
  const recovery = root.querySelector('[data-purpose-recovery]');
  const status = root.querySelector('[data-purpose-status]');
  const accepted = root.querySelector('[data-purpose-summary]');
  const current = root.querySelector('[data-purpose-current]');
  const inputs = Object.fromEntries(PURPOSE_FIELDS.map(field => [field, form.elements.namedItem(field)]));
  const errors = Object.fromEntries(PURPOSE_FIELDS.map(field => [field, root.querySelector(`[data-purpose-error="${field}"]`)]));
  const cleanup = [];
  let projection = null;
  let disposed = false;
  let composing = false;
  let acknowledgedOpen = root.open;
  let generation = 0, retiredToken = null;

  function listen(element, name, callback) {
    element.addEventListener(name, callback);
    cleanup.push(() => element.removeEventListener(name, callback));
  }
  function owns(epoch) { return !disposed && epoch === generation; }
  function boundary() { const view = editing.read(); return { projection: studio.read(), intent: view.intent, token: view.active?.token ?? null }; }
  function retains(epoch, mark) {
    const view = editing.read();
    return owns(epoch) && studio.read() === mark.projection && view.intent === mark.intent && (view.active?.token ?? null) === mark.token;
  }
  function releaseRetiredLease() {
    if (retiredToken === null) return;
    const active = editing.read().active;
    if (active?.kind !== 'purpose' || active.token !== retiredToken) { retiredToken = null; return; }
    const result = editing.park();
    if (result.ok || result.error.code !== 'settling') retiredToken = null;
  }
  function operate(method, ...args) {
    try { return editor[method](...args); }
    finally { releaseRetiredLease(); }
  }
  function announce(message) { if (!disposed) status.textContent = message; }
  function refresh() {
    if (disposed) return;
    const epoch = generation;
    let view = editor.read();
    if (root.open && ['idle', 'parked'].includes(view.status) && editing.read().active === null) {
      operate('begin', 'purpose', view.projection);
      if (!owns(epoch)) return;
      view = editor.read();
    }
    projection = view.projection;
    accepted.textContent = projection.state.purpose.changedAbility ?? 'Describe the change you are planning.';
    fieldset.disabled = view.status !== 'editing';
    recovery.hidden = view.status !== 'stale';
    if (view.status === 'stale') {
      current.replaceChildren(...PURPOSE_FIELDS.map(field => {
        const row = root.ownerDocument.createElement('div');
        const label = root.ownerDocument.createElement('dt'), value = root.ownerDocument.createElement('dd');
        label.textContent = PURPOSE_LABELS[field];
        value.textContent = projection.state.purpose[field] ?? 'Unspecified';
        row.append(label, value); return row;
      }));
    }
    for (const field of PURPOSE_FIELDS) {
      const value = view.draft?.raw[field] ?? projection.state.purpose[field] ?? '';
      if (inputs[field].value !== value) inputs[field].value = value;
      const error = view.draft?.errors.find(item => item.path === `draft.${field}`);
      inputs[field].setAttribute('aria-invalid', String(Boolean(error)));
      errors[field].textContent = error?.message ?? '';
    }
  }
  function begin() {
    if (disposed) return;
    const epoch = ++generation, before = boundary();
    acknowledgedOpen = root.open;
    onOpen();
    const active = editing.read().active;
    if (!owns(epoch) || studio.read() !== before.projection || editing.read().intent !== before.intent
      || (active && active.token !== before.token)) return;
    const result = operate('begin', 'purpose', studio.read());
    if (!owns(epoch)) return;
    refresh();
    if (!owns(epoch)) return;
    announce(result.ok ? '' : result.error.message);
    const mark = boundary();
    onChange();
    return retains(epoch, mark) ? { epoch, mark } : null;
  }
  function open() {
    if (disposed) return;
    root.open = true;
    const completion = begin();
    if (!completion || !retains(completion.epoch, completion.mark)) return;
    if (editor.read().status === 'stale') recovery.querySelector('button').focus();
    else if (editor.read().status === 'editing') inputs.changedAbility.focus();
  }
  function close({ resume = true } = {}) {
    if (disposed) return;
    if (!acknowledgedOpen && !root.open && editing.read().active?.kind !== 'purpose')
      return { epoch: generation, mark: boundary(), focusUnchanged: true };
    const epoch = ++generation, wasOpen = acknowledgedOpen || root.open;
    acknowledgedOpen = false;
    if (editing.read().active?.kind === 'purpose') editing.park();
    if (!owns(epoch)) return;
    root.open = false;
    refresh();
    if (!owns(epoch)) return;
    const focused = root.ownerDocument.activeElement;
    if (resume && wasOpen) onClose();
    if (!owns(epoch)) return;
    const mark = boundary();
    onChange();
    return retains(epoch, mark) ? { epoch, mark, focusUnchanged: root.ownerDocument.activeElement === focused } : null;
  }
  function resultMessage(result, epoch, success = '') {
    if (!owns(epoch)) return;
    refresh();
    if (!owns(epoch)) return;
    announce(result.ok ? success : result.error.message);
    const mark = boundary();
    onChange();
    if (!retains(epoch, mark)) return;
    if (!result.ok) {
      const field = PURPOSE_FIELDS.find(name => result.error.path === `draft.${name}`);
      if (field) inputs[field].focus();
    }
    return retains(epoch, mark);
  }
  for (const input of Object.values(inputs)) input.maxLength = LIMITS.purposeText;
  listen(root, 'toggle', () => {
    if (disposed) return;
    if (root.open) {
      if (editing.read().active?.kind !== 'purpose') begin();
    } else if (acknowledgedOpen) close();
  });
  listen(form, 'compositionstart', () => { generation += 1; composing = true; });
  listen(form, 'compositionend', () => { composing = false; });
  listen(form, 'input', event => {
    if (disposed || inputs[event.target.name] !== event.target) return;
    const view = editor.read();
    if (!view.draft) return;
    const epoch = ++generation;
    resultMessage(operate('setText', view.draft.token, event.target.name, event.target.value), epoch);
  });
  listen(form, 'submit', event => {
    event.preventDefault();
    if (disposed) return;
    if (composing) { announce('Finish entering the text, then apply.'); return; }
    const view = editor.read();
    if (!view.draft) return;
    const epoch = ++generation, result = operate('apply', view.draft.token);
    if (!owns(epoch)) return;
    if (result.ok) operate('begin', 'purpose', result.view.projection);
    resultMessage(result, epoch, 'Purpose updated.');
  });
  listen(root, 'click', event => {
    const button = event.target.closest('button[data-purpose-action]');
    if (disposed || !button || !root.contains(button)) return;
    const view = editor.read();
    if (!view.draft) return;
    const action = button.dataset.purposeAction;
    if (!['cancel', 'review', 'useCurrent'].includes(action)) return;
    const epoch = ++generation, result = operate(action, view.draft.token, projection);
    if (!owns(epoch)) return;
    if (result.ok && action === 'cancel') {
      announce('Changes cancelled.');
      const completion = close();
      if (completion?.focusUnchanged && retains(completion.epoch, completion.mark)) summary.focus();
    } else if (resultMessage(result, epoch) && result.ok) inputs.changedAbility.focus();
  });
  refresh();
  return Object.freeze({ refresh, open, close, isOpen: () => root.open,
    dispose() {
      if (disposed) return;
      disposed = true; generation += 1;
      const active = editing.read().active;
      if (active?.kind === 'purpose') retiredToken = active.token;
      releaseRetiredLease();
      for (const release of cleanup) release();
      cleanup.length = 0;
      fieldset.disabled = true;
      root.open = false;
    },
  });
}
