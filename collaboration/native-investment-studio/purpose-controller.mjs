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

  function listen(element, name, callback) {
    element.addEventListener(name, callback);
    cleanup.push(() => element.removeEventListener(name, callback));
  }
  function announce(message) { status.textContent = message; }
  function refresh() {
    if (disposed) return;
    let view = editor.read();
    if (root.open && ['idle', 'parked'].includes(view.status) && editing.read().active === null) {
      editor.begin('purpose', view.projection);
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
    acknowledgedOpen = root.open;
    onOpen();
    if (disposed) return;
    const result = editor.begin('purpose', studio.read());
    if (disposed) return;
    refresh();
    announce(result.ok ? '' : result.error.message);
    onChange();
  }
  function open() {
    if (disposed) return;
    root.open = true;
    begin();
    if (disposed) return;
    if (editor.read().status === 'stale') recovery.querySelector('button').focus();
    else if (editor.read().status === 'editing') inputs.changedAbility.focus();
  }
  function close({ resume = true } = {}) {
    if (disposed) return;
    const wasOpen = acknowledgedOpen || root.open;
    acknowledgedOpen = false;
    if (editing.read().active?.kind === 'purpose') editing.park();
    root.open = false;
    if (resume && wasOpen) onClose();
    if (disposed) return;
    onChange();
  }
  function resultMessage(result) {
    refresh();
    onChange();
    if (disposed) return;
    announce(result.ok ? '' : result.error.message);
    if (!result.ok) {
      const field = PURPOSE_FIELDS.find(name => result.error.path === `draft.${name}`);
      if (field) inputs[field].focus();
    }
  }
  for (const input of Object.values(inputs)) input.maxLength = LIMITS.purposeText;
  listen(root, 'toggle', () => {
    if (disposed) return;
    if (root.open) {
      if (editing.read().active?.kind !== 'purpose') begin();
    } else if (acknowledgedOpen) close();
  });
  listen(form, 'compositionstart', () => { composing = true; });
  listen(form, 'compositionend', () => { composing = false; });
  listen(form, 'input', event => {
    if (inputs[event.target.name] !== event.target) return;
    const view = editor.read();
    if (!view.draft) return;
    resultMessage(editor.setText(view.draft.token, event.target.name, event.target.value));
  });
  listen(form, 'submit', event => {
    event.preventDefault();
    if (composing) { announce('Finish entering the text, then apply.'); return; }
    const view = editor.read();
    if (!view.draft) return;
    const result = editor.apply(view.draft.token);
    if (result.ok) editor.begin('purpose', result.view.projection);
    resultMessage(result);
    if (!disposed && result.ok) announce('Purpose updated.');
  });
  listen(root, 'click', event => {
    const button = event.target.closest('button[data-purpose-action]');
    if (!button || !root.contains(button)) return;
    const view = editor.read();
    if (!view.draft) return;
    const action = button.dataset.purposeAction;
    if (!['cancel', 'review', 'useCurrent'].includes(action)) return;
    const result = editor[action](view.draft.token, projection);
    resultMessage(result);
    if (disposed) return;
    if (result.ok && action === 'cancel') {
      close();
      if (disposed) return;
      summary.focus(); announce('Changes cancelled.');
    }
    else if (result.ok) inputs.changedAbility.focus();
  });
  refresh();
  return Object.freeze({ refresh, open, close, isOpen: () => root.open,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (editing.read().active?.kind === 'purpose') editing.park();
      for (const release of cleanup) release();
      cleanup.length = 0;
      fieldset.disabled = true;
      root.open = false;
    },
  });
}
