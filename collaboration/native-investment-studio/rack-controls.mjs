import { revealStudioDestination } from './motion.mjs';

const submitOrigins = new WeakMap();
export function focusSubmitControl(source) {
  const origin = submitOrigins.get(source);
  (origin?.isConnected ? origin : source).focus({ preventScroll: Boolean(origin) });
}

// A nearby Apply control delegates to the canonical submitter. The form keeps
// validation, draft ownership, acceptance and the bottom action in one place.
export function mountSubmitMirror(container, { before = null, attribute = 'data-editor-apply' } = {}) {
  const document = container.ownerDocument, button = document.createElement('button');
  button.type = 'button'; button.className = 'studio-apply-control'; button.setAttribute(attribute, '');
  container.insertBefore(button, before);
  let source = null, disposed = false;
  function refresh() {
    if (disposed) return;
    button.hidden = !source || source.hidden || source.classList.contains('native-control--remove');
    button.textContent = source?.textContent ?? 'Apply changes';
    button.disabled = !source || source.matches(':disabled');
    button.setAttribute('aria-disabled', String(button.disabled || source.getAttribute('aria-disabled') === 'true'));
    const label = source?.getAttribute('aria-label');
    if (label) button.setAttribute('aria-label', label); else button.removeAttribute('aria-label');
  }
  const observer = new document.defaultView.MutationObserver(refresh);
  function setSource(next) {
    if (disposed) return;
    if (source !== next) {
      observer.disconnect(); source = next;
      if (source) {
        observer.observe(source, { attributes: true, childList: true, subtree: true });
        for (let ancestor = source.parentElement; ancestor; ancestor = ancestor.parentElement) {
          if (ancestor.tagName === 'FIELDSET') observer.observe(ancestor, { attributes: true, attributeFilter: ['disabled'] });
          if (ancestor.tagName === 'FORM') break;
        }
      }
    }
    refresh();
  }
  const apply = () => {
    refresh();
    if (button.disabled || button.hidden || button.getAttribute('aria-disabled') === 'true') return;
    const submitter = source; submitOrigins.set(submitter, button);
    try { submitter.click(); } finally { submitOrigins.delete(submitter); refresh(); }
  };
  button.addEventListener('click', apply); refresh();
  return Object.freeze({ element: button, setSource, refresh, dispose() {
    if (disposed) return;
    disposed = true; observer.disconnect(); button.removeEventListener('click', apply); button.remove(); source = null;
  } });
}

// Every local receiver identifies its owner before the selected record. Draft
// receivers mirror their canonical Apply; direct receivers expose saved state.
export function mountRackHeader(container, { title = '', owner = '', onClose, onReturn = onClose, id, closeAttribute = 'data-rack-editor-close', applyAttribute = 'data-rack-editor-apply' } = {}) {
  const document = container.ownerDocument;
  const header = document.createElement('header'); header.className = 'studio-rack-editor__heading studio-rack-header';
  const identity = document.createElement('div'); identity.className = 'studio-rack-header__identity';
  const parent = document.createElement('button'); parent.type = 'button'; parent.className = 'studio-rack-header__owner';
  const current = document.createElement('h4'); current.textContent = title;
  if (id) current.id = id;
  const tools = document.createElement('div'); tools.className = 'studio-rack-editor__tools';
  const saved = document.createElement('span'); saved.className = 'studio-rack-header__saved'; saved.setAttribute('role', 'status'); saved.hidden = true;
  const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close'; close.setAttribute(closeAttribute, '');
  tools.append(saved, close); identity.append(parent, current); header.append(identity, tools); container.prepend(header);
  const apply = mountSubmitMirror(tools, { before: close, attribute: applyAttribute });
  parent.addEventListener('click', onReturn); close.addEventListener('click', onClose);
  function update({ title: nextTitle = current.textContent, owner: nextOwner = parent.textContent,
    source = null, saved: savedText = '' } = {}) {
    current.textContent = nextTitle; parent.textContent = nextOwner; parent.hidden = !nextOwner;
    parent.setAttribute('aria-label', `Back to ${nextOwner}`);
    close.setAttribute('aria-label', `Close ${nextTitle}`);
    saved.textContent = savedText; saved.hidden = !savedText; apply.setSource(source);
  }
  update({ title, owner });
  return Object.freeze({ element: header, title: current, parent, close, tools, apply, update,
    dispose() { apply.dispose(); parent.removeEventListener('click', onReturn); close.removeEventListener('click', onClose); header.remove(); } });
}

// Session and team membership share ordering semantics while retaining their
// own draft actions and receiving skins.
export function syncReorderButtons(up, down, { label, index, count }) {
  for (const [control, direction, boundary] of [[up, 'up', 0], [down, 'down', count - 1]]) {
    control.textContent = `Move ${direction}`;
    control.setAttribute('aria-label', `Move ${direction}: ${label}`);
    control.disabled = index === undefined || index < 0 || index === boundary;
  }
}

// Rack readings borrow the session editor's identity and visibility. Updating
// attributes in place preserves each reading's focus and horizontal position.
export function syncSessionControls(root, { selectedId, occurrenceIndex, expanded, controlsId }) {
  for (const control of root.querySelectorAll('[data-studio-session-id]')) {
    const occurrence = control.dataset.studioSessionOccurrence;
    const selected = control.dataset.studioSessionId === selectedId
      && (occurrence === undefined || occurrenceIndex !== undefined && Number(occurrence) === occurrenceIndex);
    control.setAttribute('aria-pressed', String(selected));
    control.setAttribute('aria-expanded', String(selected && expanded));
    control.setAttribute('aria-controls', controlsId);
  }
}

let editorSequence = 0;

// A nested task can borrow the canonical editor without copying its form or
// changing who owns the draft. Markers retain the original sibling order.
export function mountEditorPlacement(nodes) {
  const homes = nodes.map(node => {
    const marker = node.ownerDocument.createComment('home: local editor');
    node.before(marker);
    return { node, marker };
  });
  let container = null, disposed = false;
  function restore() {
    for (const { node, marker } of homes)
      if (marker.parentNode && marker.nextSibling !== node) marker.after(node);
    container = null;
  }
  return Object.freeze({
    place(next) {
      if (disposed) return;
      if (!next) { restore(); return; }
      for (const { node } of homes) if (node.parentNode !== next) next.append(node);
      container = next;
    },
    isPlaced: () => !disposed && Boolean(container),
    restore,
    dispose() {
      if (disposed) return;
      restore(); disposed = true;
      for (const { marker } of homes) marker.remove();
    },
  });
}

const entryKey = control => control?.dataset.studioEntryKey ?? control?.dataset.cadenceKey ?? control?.dataset.deliverySession
  ?? (control?.dataset.studioSessionPerson ? `participant:${control.dataset.studioSessionPerson}` : null)
  ?? (control?.classList.contains('studio-track-key') ? 'session-row' : control?.getAttribute('aria-label'));

// Projection refreshes replace entry controls. Keep the semantic origin so
// publication and recovery can return to its current DOM instance.
export function captureRackEntry(source, scope) {
  const key = entryKey(source), phase = source?.closest('[data-delivery-phase]')?.dataset.deliveryPhase;
  const sessionId = source?.dataset.studioSessionId, recordId = source?.dataset.studioRecordId,
    recordKind = source?.dataset.studioRecordKind;
  return () => source?.isConnected ? source : key && [...scope?.querySelectorAll('button') ?? []]
    .find(control => entryKey(control) === key && control.dataset.studioSessionId === sessionId
      && control.dataset.studioRecordId === recordId && control.dataset.studioRecordKind === recordKind
      && control.closest('[data-delivery-phase]')?.dataset.deliveryPhase === phase);
}

// Placement borrows mounted controls. Drafts, validation and acceptance stay
// with the existing editor, including when its controls return to their home.
export function mountRackEditor(root, { editors, onClose, readLabel = record => record.label, readReturn = () => null }) {
  const document = root.ownerDocument;
  const host = document.createElement('section');
  host.className = 'studio-rack-editor'; host.hidden = true;
  host.id = `studio-rack-editor-${++editorSequence}`;
  const body = document.createElement('div'); body.className = 'studio-rack-editor__body'; host.append(body);
  const header = mountRackHeader(host, { id: `${host.id}-title`, onClose: () => onClose(),
    onReturn: () => { const route = readReturn(selected); if (route) route.action(); else onClose(); } });
  const { title, close, apply } = header;
  host.setAttribute('aria-labelledby', title.id); root.append(host);
  const homes = new Map(Object.entries(editors).map(([kind, nodes]) => [kind, nodes.map(node => {
    const marker = document.createComment(`home: ${kind} editor`); node.before(marker);
    return { node, marker };
  })]));
  let selected = null, origin = null, originScope = null, originPhase = null, originKey = null;
  const recordOf = control => control.dataset.studioSessionId
    ? { kind: 'session', id: control.dataset.studioSessionId }
    : { kind: control.dataset.studioRecordKind, id: control.dataset.studioRecordId };
  const keyOf = entryKey;
  const controls = () => [...root.querySelectorAll('[data-studio-record-kind]')];
  function sync() {
    apply.setSource(body.querySelector('button[type="submit"]'));
    if (selected) {
      const label = readLabel(selected) ?? selected.label;
      header.update({ title: `${{ person: 'Person', team: 'Team', session: 'Session', connection: 'Handoff' }[selected.kind]} settings · ${label}`,
        owner: readReturn(selected)?.label ?? selected.ownerLabel ?? selected.originLabel ?? 'Delivery overview', source: body.querySelector('button[type="submit"]') });
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
  function survivingLocalTarget() {
    // Removing the selected record also removes its initiating control. Return
    // to the nearest surviving rack control so keyboard navigation can continue.
    for (let scope = originScope?.isConnected ? originScope : host.parentElement;
      scope && root.contains(scope); scope = scope.parentElement) {
      const control = [...scope.querySelectorAll('button')].find(item =>
        !host.contains(item) && !item.matches(':disabled') && item.getClientRects().length);
      if (control) return control;
    }
    return null;
  }
  function returnFocus(preferred) {
    const candidates = [...controls(), ...root.querySelectorAll('[data-studio-session-id]')].filter(control => {
      const record = recordOf(control);
      return selected?.kind === record.kind && selected.id === record.id && control.getClientRects().length;
    });
    const currentOrigin = captureRackEntry(origin, originScope)();
    const target = preferred?.isConnected && preferred.getClientRects().length ? preferred
      : origin?.isConnected && origin.getClientRects().length ? origin
      : currentOrigin?.getClientRects().length ? currentOrigin
      : candidates.find(control => originScope?.contains(control) && originKey
        && keyOf(control) === originKey
        && control.closest('[data-delivery-phase]')?.dataset.deliveryPhase === originPhase)
      ?? candidates.find(control => originScope?.contains(control)
        && control.closest('[data-delivery-phase]')?.dataset.deliveryPhase === originPhase)
      ?? candidates[0] ?? survivingLocalTarget();
    target?.focus({ preventScroll: true });
    if (host.dataset.rackPlacement !== 'inset') revealStudioDestination(target);
  }
  return Object.freeze({
    element: host,
    read: () => selected && { ...selected, open: !host.hidden },
    captureOrigin: () => selected && !host.hidden
      ? { record: { ...selected }, source: captureRackEntry(origin, originScope) } : null,
    isOpen: kind => !host.hidden && selected?.kind === kind,
    isOrigin: source => Boolean(source && originScope?.contains(source) && originKey === keyOf(source)
      && originPhase === source.closest('[data-delivery-phase]')?.dataset.deliveryPhase),
    show(record, source, anchor, { container = null, arrival = null, originRoot = null } = {}) {
      host.dataset.rackArrival = arrival ?? (host.hidden ? 'open' : 'change');
      host.dataset.rackArrivalVariant = host.dataset.rackArrivalVariant === 'a' ? 'b' : 'a';
      if (selected?.kind !== record.kind) restore();
      selected = { ...record }; origin = source;
      host.dataset.rackEditorKind = record.kind;
      host.dataset.rackPlacement = container ? 'inset' : 'adjacent';
      originScope = originRoot ?? anchor; originPhase = source?.closest('[data-delivery-phase]')?.dataset.deliveryPhase;
      originKey = keyOf(source);
      if (container) { if (host.parentElement !== container) container.append(host); }
      else if (anchor.nextSibling !== host) anchor.after(host);
      const nodes = homes.get(record.kind).map(({ node }) => node);
      if (nodes.some((node, index) => body.children[index] !== node)) body.replaceChildren(...nodes);
      host.hidden = false; sync();
    },
    hide({ home = false, focus = false, source = null } = {}) {
      host.hidden = true;
      if (home) restore();
      sync(); if (focus) returnFocus(source);
    },
    sync,
    dispose() {
      header.dispose(); restore(); host.remove();
      for (const records of homes.values()) for (const { marker } of records) marker.remove();
    },
  });
}
