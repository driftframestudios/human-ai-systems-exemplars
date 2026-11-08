import { revealStudioDestination } from './motion.mjs';

// Rack readings borrow the session editor's identity and visibility. Updating
// attributes in place preserves each reading's focus and horizontal position.
export function syncSessionControls(root, { selectedId, expanded, controlsId }) {
  for (const control of root.querySelectorAll('[data-studio-session-id]')) {
    const selected = control.dataset.studioSessionId === selectedId;
    control.setAttribute('aria-pressed', String(selected));
    control.setAttribute('aria-expanded', String(selected && expanded));
    control.setAttribute('aria-controls', controlsId);
  }
}

let editorSequence = 0;

// Placement borrows mounted controls. Drafts, validation and acceptance stay
// with the existing editor, including when its controls return to their home.
export function mountAdjacentRackEditor(root, { editors, onClose, readLabel = record => record.label }) {
  const document = root.ownerDocument;
  const host = document.createElement('section');
  host.className = 'studio-rack-editor'; host.hidden = true;
  host.id = `studio-rack-editor-${++editorSequence}`;
  const heading = document.createElement('header'); heading.className = 'studio-rack-editor__heading';
  const title = document.createElement('h4'); title.id = `${host.id}-title`;
  const context = document.createElement('small'); context.className = 'studio-rack-editor__origin'; context.hidden = true;
  host.setAttribute('aria-labelledby', title.id);
  const close = document.createElement('button'); close.type = 'button';
  close.textContent = 'Close'; close.dataset.rackEditorClose = '';
  const body = document.createElement('div'); body.className = 'studio-rack-editor__body';
  const identity = document.createElement('div'); identity.append(title, context);
  heading.append(identity, close); host.append(heading, body); root.append(host);
  const homes = new Map(Object.entries(editors).map(([kind, nodes]) => [kind, nodes.map(node => {
    const marker = document.createComment(`home: ${kind} editor`); node.before(marker);
    return { node, marker };
  })]));
  let selected = null, origin = null, originScope = null, originPhase = null, originKey = null;
  const recordOf = control => control.dataset.studioSessionId
    ? { kind: 'session', id: control.dataset.studioSessionId }
    : { kind: control.dataset.studioRecordKind, id: control.dataset.studioRecordId };
  const keyOf = control => control?.dataset.studioEntryKey ?? control?.dataset.cadenceKey ?? control?.dataset.deliverySession
    ?? (control?.dataset.studioSessionPerson ? `participant:${control.dataset.studioSessionPerson}` : null)
    ?? (control?.classList.contains('studio-track-key') ? 'session-row' : control?.getAttribute('aria-label'));
  const controls = () => [...root.querySelectorAll('[data-studio-record-kind]')];
  function sync() {
    if (selected) {
      const label = readLabel(selected) ?? selected.label;
      title.textContent = `${{ person: 'Person', team: 'Team', session: 'Session' }[selected.kind]} settings · ${label}`;
      context.textContent = selected.originLabel ?? ''; context.hidden = !selected.originLabel;
      close.setAttribute('aria-label', `Close ${label} settings`);
    }
    for (const control of controls()) {
      const matches = selected?.kind === control.dataset.studioRecordKind && selected.id === control.dataset.studioRecordId;
      control.classList.add('studio-record-key'); control.classList.remove('native-control--navigate');
      control.setAttribute('aria-pressed', String(matches));
      control.setAttribute('aria-expanded', String(matches && !host.hidden));
      control.setAttribute('aria-controls', host.id);
    }
  }
  function restore() {
    for (const records of homes.values()) for (const { node, marker } of records)
      if (marker.nextSibling !== node) marker.after(node);
  }
  function returnFocus(preferred) {
    const candidates = [...controls(), ...root.querySelectorAll('[data-studio-session-id]')].filter(control => {
      const record = recordOf(control);
      return selected?.kind === record.kind && selected.id === record.id && control.getClientRects().length;
    });
    const target = preferred?.isConnected && preferred.getClientRects().length ? preferred
      : origin?.isConnected && origin.getClientRects().length ? origin
      : candidates.find(control => originScope?.contains(control) && originKey
        && keyOf(control) === originKey
        && control.closest('[data-delivery-phase]')?.dataset.deliveryPhase === originPhase)
      ?? candidates.find(control => originScope?.contains(control)
        && control.closest('[data-delivery-phase]')?.dataset.deliveryPhase === originPhase)
      ?? candidates[0];
    target?.focus({ preventScroll: true });
    revealStudioDestination(target);
  }
  const requestClose = () => onClose();
  close.addEventListener('click', requestClose);
  return Object.freeze({
    element: host,
    read: () => selected && { ...selected, open: !host.hidden },
    isOpen: kind => !host.hidden && selected?.kind === kind,
    show(record, source, anchor) {
      restore(); selected = { ...record }; origin = source;
      host.dataset.rackEditorKind = record.kind;
      originScope = anchor; originPhase = source?.closest('[data-delivery-phase]')?.dataset.deliveryPhase;
      originKey = keyOf(source);
      anchor.after(host);
      body.replaceChildren(...homes.get(record.kind).map(({ node }) => node));
      host.hidden = false; sync();
    },
    hide({ home = false, focus = false, source = null } = {}) {
      host.hidden = true;
      if (home) restore();
      sync(); if (focus) returnFocus(source);
    },
    sync,
    dispose() {
      restore(); close.removeEventListener('click', requestClose); host.remove();
      for (const records of homes.values()) for (const { marker } of records) marker.remove();
    },
  });
}
