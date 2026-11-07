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
  host.setAttribute('aria-labelledby', title.id);
  const close = document.createElement('button'); close.type = 'button';
  close.textContent = 'Close'; close.dataset.rackEditorClose = '';
  const body = document.createElement('div'); body.className = 'studio-rack-editor__body';
  heading.append(title, close); host.append(heading, body); root.append(host);
  const homes = new Map(Object.entries(editors).map(([kind, nodes]) => [kind, nodes.map(node => {
    const marker = document.createComment(`home: ${kind} editor`); node.before(marker);
    return { node, marker };
  })]));
  let selected = null, origin = null, originScope = null, originPhase = null;
  const controls = () => [...root.querySelectorAll('[data-studio-record-kind]')];
  function sync() {
    if (selected) {
      const label = readLabel(selected) ?? selected.label;
      title.textContent = `${selected.kind === 'person' ? 'Person' : 'Team'} settings · ${label}`;
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
    for (const records of homes.values()) for (const { node, marker } of records) marker.after(node);
  }
  function returnFocus() {
    const candidates = controls().filter(control => selected?.kind === control.dataset.studioRecordKind
      && selected.id === control.dataset.studioRecordId && control.getClientRects().length);
    const target = origin?.isConnected && origin.getClientRects().length ? origin
      : candidates.find(control => originScope?.contains(control)
        && control.closest('[data-delivery-phase]')?.dataset.deliveryPhase === originPhase)
      ?? candidates[0];
    target?.focus({ preventScroll: true });
  }
  const requestClose = () => onClose();
  close.addEventListener('click', requestClose);
  return Object.freeze({
    element: host,
    read: () => selected && { ...selected, open: !host.hidden },
    isOpen: kind => !host.hidden && selected?.kind === kind,
    show(record, source, anchor) {
      restore(); selected = { ...record }; origin = source;
      originScope = anchor; originPhase = source?.closest('[data-delivery-phase]')?.dataset.deliveryPhase;
      anchor.after(host);
      body.replaceChildren(...homes.get(record.kind).map(({ node }) => node));
      host.hidden = false; sync();
    },
    hide({ home = false, focus = false } = {}) {
      host.hidden = true;
      if (home) restore();
      sync(); if (focus) returnFocus();
    },
    sync,
    dispose() {
      restore(); close.removeEventListener('click', requestClose); host.remove();
      for (const records of homes.values()) for (const { marker } of records) marker.remove();
    },
  });
}
