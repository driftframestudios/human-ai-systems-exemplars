import { CONNECTION_FORMS, makeConnectionTarget, describeConnectionTarget } from './command-draft.mjs';
import { money } from './display.mjs';

const INSTANCES = new WeakMap();
const FIELDS = Object.freeze(['senderTeamId', 'receiverTeamId', 'receiverPersonId', 'sharedObject', 'responseExpectation', 'status']);
export const CONNECTION_LABELS = Object.freeze({ senderTeamId: 'Sending team', receiverTeamId: 'Receiving team',
  receiverPersonId: 'Receiving person', sharedObject: 'Shared object or decision', responseExpectation: 'Expected response',
  workIds: 'Supporting sessions', status: 'Status' });
const named = row => row ? `${row.label}${row.lifecycle === 'retired' ? ' · retired' : ''}` : 'Unassigned';

// The host owns the plan and its diagram/list. This receiver lends one complete
// connection form to the shared draft coordinator.
export function mountConnectionPanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {},
  onAccepted = () => {}, isActive = () => true, canOpen = isActive }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, editor = editing.connection;
  const find = selector => {
    const element = root.querySelector(selector);
    if (!element) throw new TypeError('Supply the complete connection editor.');
    return element;
  };
  const elements = Object.fromEntries([
    ['toolbar', '[data-connection-toolbar]'], ['add', '[data-connection-action="create"]'],
    ['configure', '[data-connection-configure]'], ['summary', '[data-connection-configure] > summary'],
    ['form', '[data-connection-configure] form'], ['fieldset', '[data-connection-configure] fieldset'],
    ['fields', '[data-connection-fields]'], ['members', 'ul[data-connection-work]'],
    ['remove', '[data-connection-action="remove"]'], ['apply', '[data-connection-apply]'],
    ['cancel', 'fieldset [data-connection-action="cancel"]'], ['fresh', '[data-connection-action="freshId"]'],
    ['recovery', '[data-connection-recovery]'], ['current', '[data-connection-current]'],
    ['confirm', '[data-connection-confirm]'], ['dependencies', '[data-connection-dependencies]'],
    ['general', '[data-connection-general-error]'], ['cost', '[data-connection-cost]'], ['status', '[data-connection-status]'],
  ].map(([key, selector]) => [key, find(selector)]));
  const inputs = Object.fromEntries(FIELDS.map(field => [field, elements.form.elements.namedItem(field)]));
  const errors = Object.fromEntries([...FIELDS, 'workIds'].map(field => [field, find(`[data-connection-error="${field}"]`)]));
  const cleanup = [];
  let disposed = false, generation = 0, retiredToken = null, composing = false, acknowledgedOpen = false;
  let target = null, projection = null, people = new Map(), teams = new Map(), works = new Map(), connections = new Map();
  let referenceLabels = new Map(), memberControls = new Map(), membersProjection = null, membersIds = null;
  let receiverProjection = null, receiverTeam = null, receiverPerson = null;

  function listen(element, type, handler) { element.addEventListener(type, handler); cleanup.push(() => element.removeEventListener(type, handler)); }
  function owns(epoch) { return !disposed && generation === epoch; }
  function boundary() { const view = editing.read(); return { projection: studio.read(), intent: view.intent, token: view.active?.token ?? null }; }
  function retains(epoch, mark) {
    const view = editing.read();
    return owns(epoch) && studio.read() === mark.projection && view.intent === mark.intent && (view.active?.token ?? null) === mark.token;
  }
  function releaseRetiredLease() {
    if (retiredToken === null) return;
    const active = editing.read().active;
    if (active?.kind !== 'connection' || active.token !== retiredToken) { retiredToken = null; return; }
    const result = editing.park();
    if (result.ok || result.error.code !== 'settling') retiredToken = null;
  }
  function operate(method, ...args) {
    try { return editor[method](...args); }
    finally { releaseRetiredLease(); }
  }
  function announce(message) { if (!disposed) elements.status.textContent = message; }
  function option(value, label, disabled = false) {
    const element = document.createElement('option'); element.value = value; element.textContent = label; element.disabled = disabled; return element;
  }
  function button(label, action, id, disabled) {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label;
    element.dataset.connectionAction = action; element.dataset.connectionId = id; element.disabled = disabled; return element;
  }
  function index(next) {
    if (next === projection) return;
    projection = next;
    people = new Map(next.state.people.map(row => [row.id, row]));
    teams = new Map(next.state.teams.map(row => [row.id, row]));
    works = new Map(next.state.work.map(row => [row.id, row]));
    connections = new Map(next.state.connections.map(row => [row.id, row]));
    referenceLabels = new Map(['people', 'teams', 'work', 'practices', 'contributions', 'connections'].map(collection =>
      [collection, new Map(next.state[collection].map(row => [row.id, row.label ?? row.sharedObject ?? row.id]))]));
    for (const field of ['senderTeamId', 'receiverTeamId'])
      inputs[field].replaceChildren(option('', 'Choose a team'), ...next.state.teams.map(row => option(row.id, named(row))));
  }
  function receivers(teamId, personId) {
    if (receiverProjection === projection && receiverTeam === teamId && receiverPerson === personId) return;
    receiverProjection = projection; receiverTeam = teamId; receiverPerson = personId;
    const ids = teams.get(teamId)?.personIds ?? [], membership = new Set(ids);
    const options = [option('', 'Unassigned'), ...ids.map(id => option(id, named(people.get(id))))];
    if (personId && !membership.has(personId)) {
      const row = people.get(personId);
      options.push(option(personId, row ? `${named(row)} · outside this team` : `${personId} · removed person`));
    }
    inputs.receiverPersonId.replaceChildren(...options);
  }
  function renderMembers(ids) {
    if (membersProjection === projection && membersIds?.length === ids.length && ids.every((id, position) => id === membersIds[position])) return;
    membersProjection = projection; membersIds = [...ids];
    const positions = new Map(ids.map((id, position) => [id, position]));
    const ordered = [...ids, ...projection.state.work.filter(row => !positions.has(row.id)).map(row => row.id)];
    memberControls = new Map(); const fragment = document.createDocumentFragment();
    for (const id of ordered) {
      const row = works.get(id), item = document.createElement('li'), label = document.createElement('label');
      const checkbox = document.createElement('input'), text = document.createElement('span');
      checkbox.type = 'checkbox'; checkbox.dataset.connectionWork = id; checkbox.checked = positions.has(id);
      text.textContent = row ? named(row) : `${id} · removed session`;
      label.append(checkbox, text); item.append(label);
      if (positions.has(id)) {
        const actions = document.createElement('div'), position = positions.get(id); actions.className = 'native-coordination__actions';
        const up = button('Move up', 'work-up', id, position === 0), down = button('Move down', 'work-down', id, position === ids.length - 1);
        up.setAttribute('aria-label', `Move ${row?.label ?? id} up`); down.setAttribute('aria-label', `Move ${row?.label ?? id} down`);
        actions.append(up, down); item.append(actions);
      }
      fragment.append(item); memberControls.set(id, checkbox);
    }
    elements.members.replaceChildren(fragment);
  }
  function currentText(row, descriptor, conflict) {
    if (conflict) return 'This connection already exists. Use these entries to prepare a new connection.';
    if (row) {
      const sessions = row.workIds.map(id => named(works.get(id))).join(', ') || 'None';
      return `Current values: ${named(teams.get(row.senderTeamId))} to ${named(teams.get(row.receiverTeamId))}. Receiving person: ${named(people.get(row.receiverPersonId))}. Shared object: ${row.sharedObject}. Expected response: ${row.responseExpectation ?? 'Unspecified'}. Supporting sessions: ${sessions}. Status: ${row.status === 'paused' ? 'Paused' : 'Active'}.`;
    }
    if (descriptor?.mode === 'create') return 'The plan changed. Review these entries before adding the connection.';
    return 'This connection was removed. Your saved entries remain below.';
  }
  function render() {
    const view = editor.read(), epoch = generation;
    if (disposed) return view;
    index(studio.read());
    const draft = view.draft?.connectionId === target ? view.draft : null, descriptor = describeConnectionTarget(target);
    const row = connections.get(descriptor?.id), removing = descriptor?.mode === 'remove' && Boolean(draft);
    const raw = draft?.raw ?? { ...Object.fromEntries(FIELDS.map(field => [field, row?.[field] ?? ''])), workIds: row?.workIds ?? [] };
    elements.configure.hidden = !target;
    elements.fieldset.disabled = !draft || view.status !== 'editing';
    elements.recovery.hidden = !draft || view.status !== 'stale';
    elements.summary.textContent = removing ? 'Remove connection' : descriptor?.mode === 'create' ? 'New connection' : 'Connection settings';
    elements.current.textContent = currentText(row, descriptor, view.creationConflict);
    elements.fresh.hidden = !view.creationConflict;
    elements.fields.hidden = removing; elements.confirm.hidden = !removing;
    elements.confirm.textContent = removing ? `Remove the connection from ${named(teams.get(row?.senderTeamId))} to ${named(teams.get(row?.receiverTeamId))}?` : '';
    elements.remove.hidden = !row || removing || descriptor?.mode === 'create';
    elements.remove.disabled = !row;
    receivers(raw.receiverTeamId, raw.receiverPersonId);
    for (const field of FIELDS) {
      const value = raw[field] ?? '';
      if (['senderTeamId', 'receiverTeamId'].includes(field) && value && !teams.has(value)
        && !Array.from(inputs[field].options).some(item => item.value === value)) inputs[field].append(option(value, `${value} · removed team`));
      if (inputs[field].value !== value) inputs[field].value = value;
      const error = draft?.errors.find(item => item.path === `draft.${field}`);
      inputs[field].setAttribute('aria-invalid', String(Boolean(error))); errors[field].textContent = error?.message ?? '';
    }
    if (!removing) renderMembers(raw.workIds ?? []);
    const workError = draft?.errors.find(error => error.path === 'draft.workIds');
    errors.workIds.textContent = workError?.message ?? ''; elements.members.setAttribute('aria-invalid', String(Boolean(workError)));
    const preview = draft && view.status === 'editing' && !composing ? operate('preview', draft.token) : null;
    if (!owns(epoch)) return editor.read();
    const current = editor.read();
    if (preview && current.status !== 'editing' && (current.projection !== view.projection || current.draft?.token !== draft.token || current.status !== view.status)) return render();
    const error = preview && !preview.ok ? preview.error : null;
    const errorField = error && [...FIELDS, 'workIds'].find(field => error.path.endsWith(`.${field}`));
    if (errorField && !draft?.errors.length) {
      errors[errorField].textContent = error.message;
      (inputs[errorField] ?? elements.members).setAttribute('aria-invalid', 'true');
    }
    elements.general.textContent = error && !errorField && !draft?.errors.length ? error.message : '';
    const references = error?.references ?? [];
    elements.dependencies.hidden = references.length === 0;
    elements.dependencies.replaceChildren(...references.map(reference => {
      const item = document.createElement('li'); item.textContent = `${referenceLabels.get(reference.collection)?.get(reference.id) ?? reference.id}: ${reference.field}`; return item;
    }));
    elements.apply.disabled = references.length > 0;
    elements.apply.setAttribute('aria-disabled', String(!draft?.changed));
    elements.apply.textContent = removing ? 'Remove connection' : descriptor?.mode === 'create' ? 'Add connection' : 'Apply changes';
    elements.cost.textContent = raw.status === 'paused'
      ? `Paused connections keep their session costs. Known planned investment: ${money(projection.result.knownCommitmentCents)}.`
      : `Known planned investment: ${money(projection.result.knownCommitmentCents)}.`;
    root.dataset.connectionState = view.status;
    return view;
  }
  function focusEditor() {
    const view = editor.read(), descriptor = describeConnectionTarget(view.draft?.connectionId);
    if (view.status === 'stale') (view.creationConflict ? elements.fresh : elements.recovery.querySelector('button')).focus();
    else if (view.status === 'editing') (descriptor?.mode === 'remove' ? elements.cancel : inputs.senderTeamId).focus();
  }
  function changed(result, epoch, focus = null) {
    if (!owns(epoch)) return result;
    if (result.view.draft) target = result.view.draft.connectionId;
    render();
    if (!owns(epoch)) return result;
    announce(result.ok ? '' : result.error.message);
    const mark = boundary(); onEditing();
    if (focus && retains(epoch, mark)) focus();
    return result;
  }
  function begin(method, value, focus) {
    if (disposed) return;
    const epoch = ++generation, before = boundary();
    onBegin();
    const active = editing.read().active;
    if (!owns(epoch) || studio.read() !== before.projection || editing.read().intent !== before.intent
      || (active && active.token !== before.token)) return;
    const result = operate(method, value, projection);
    if (!owns(epoch)) return result;
    if (result.view.draft) target = result.view.draft.connectionId;
    composing = false; acknowledgedOpen = true; elements.configure.open = true;
    return changed(result, epoch, focus ? focusEditor : null);
  }
  function open(key, focus = true) { if (!disposed && describeConnectionTarget(key)) return begin('begin', key, focus); }
  function select(id, focus = true) { if (!disposed && connections.has(id)) return open(makeConnectionTarget('connection.update', id), focus); }
  function create() { return begin('create', 'connection.create', true); }
  function close({ park = true } = {}) {
    if (disposed) return;
    const epoch = ++generation;
    if (park && editing.read().active?.kind === 'connection') editing.park();
    if (!owns(epoch)) return;
    acknowledgedOpen = false; elements.configure.open = false;
  }
  function finishClosed(message) {
    close({ park: false }); const epoch = generation;
    render(); if (!owns(epoch)) return;
    announce(message); const mark = boundary(); onEditing();
    if (retains(epoch, mark)) (elements.configure.hidden ? elements.add : elements.summary).focus();
  }
  function settle(action) {
    if (disposed) return;
    const view = editor.read();
    if (!view.draft || view.draft.connectionId !== target) return;
    if (composing && action === 'apply') { announce('Finish entering the text, then apply.'); return; }
    if (action === 'apply' && view.status === 'editing' && !view.draft.changed) { announce('The plan already uses these values.'); return; }
    const descriptor = describeConnectionTarget(target), epoch = ++generation;
    const result = operate(action, view.draft.token);
    if (!owns(epoch)) return;
    if (!result.ok) { changed(result, epoch, () => {
      const field = FIELDS.find(name => result.error.path === `draft.${name}`);
      if (field) inputs[field].focus();
    }); return; }
    if (action === 'cancel') {
      if (descriptor.mode === 'create') target = null;
      finishClosed('Changes cancelled.'); return;
    }
    const accepted = result.projection ?? studio.read(), mark = boundary();
    onAccepted(accepted);
    if (!retains(epoch, mark) || studio.read() !== accepted || editing.read().active !== null) return;
    if (descriptor.mode === 'remove') { target = null; finishClosed('Connection removed.'); return; }
    target = makeConnectionTarget('connection.update', descriptor.id);
    const next = operate('begin', target, accepted);
    if (!owns(epoch)) return;
    acknowledgedOpen = true; elements.configure.open = true;
    render(); if (!owns(epoch)) return;
    announce(next.ok ? 'Connection updated.' : next.error.message);
    const ready = boundary(); onEditing();
    if (retains(epoch, ready)) elements.apply.focus();
  }
  function membership(id, delta = null, checked = false) {
    const view = editor.read();
    if (disposed || view.status !== 'editing' || view.draft?.connectionId !== target) return;
    const ids = [...view.draft.raw.workIds], position = ids.indexOf(id), epoch = ++generation;
    if (delta === null) {
      if (checked && position < 0) ids.push(id);
      else if (!checked && position >= 0) ids.splice(position, 1);
      else return;
    } else {
      const destination = position + delta;
      if (position < 0 || destination < 0 || destination >= ids.length) return;
      [ids[position], ids[destination]] = [ids[destination], ids[position]];
    }
    changed(operate('setIds', view.draft.token, 'workIds', ids), epoch, () =>
      (memberControls.get(id) ?? elements.members.querySelector('input') ?? elements.apply).focus());
  }
  function edit(event) {
    if (disposed || inputs[event.target.name] !== event.target) return;
    const view = editor.read(); if (!view.draft || view.draft.connectionId !== target) return;
    const epoch = ++generation;
    changed(operate('setText', view.draft.token, event.target.name, event.target.value), epoch);
  }
  function click(event) {
    const control = event.target.closest('[data-connection-action]');
    if (disposed || !control || !root.contains(control) || control.disabled) return;
    const action = control.dataset.connectionAction;
    if (action === 'create') { create(); return; }
    if (action === 'remove') {
      const id = describeConnectionTarget(target)?.id;
      if (connections.has(id)) open(makeConnectionTarget('connection.remove', id));
      return;
    }
    if (action === 'work-up' || action === 'work-down') { membership(control.dataset.connectionId, action === 'work-up' ? -1 : 1); return; }
    if (action === 'cancel') { settle('cancel'); return; }
    if (['review', 'useCurrent', 'freshId'].includes(action)) {
      const draft = editor.read().draft; if (!draft || draft.connectionId !== target) return;
      const epoch = ++generation; changed(operate(action, draft.token, projection), epoch, focusEditor);
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation += 1;
    for (const release of cleanup) release(); cleanup.length = 0;
    const active = editing.read().active;
    if (active?.kind === 'connection') retiredToken = active.token;
    releaseRetiredLease();
    elements.fieldset.disabled = true; elements.configure.open = false; elements.configure.hidden = true;
    elements.toolbar.hidden = true; elements.add.disabled = true; elements.remove.disabled = true;
    delete root.dataset.connectionReady; INSTANCES.delete(root);
  }
  const receiver = Object.freeze({ read: () => editor.read(), render, refresh: render, open, select, create, close,
    selection: () => describeConnectionTarget(target)?.id ?? null, isOpen: () => !disposed && elements.configure.open,
    resume() { if (!disposed) { composing = false; if (elements.configure.open && target) open(target, false); else render(); } }, dispose });
  try {
    inputs.status.replaceChildren(option('active', 'Active'), option('paused', 'Paused'));
    for (const field of FIELDS) if (inputs[field].tagName === 'TEXTAREA') inputs[field].maxLength = CONNECTION_FORMS['connection.create'].fields[field].maxLength;
    listen(root, 'click', click); listen(elements.form, 'input', edit);
    listen(elements.form, 'submit', event => { event.preventDefault(); settle('apply'); });
    listen(elements.form, 'compositionstart', () => { generation += 1; composing = true; });
    listen(elements.form, 'compositionend', event => { composing = false; edit(event); });
    listen(elements.members, 'change', event => {
      const id = event.target.dataset.connectionWork;
      if (memberControls.get(id) === event.target) membership(id, null, event.target.checked);
    });
    listen(elements.summary, 'click', event => {
      if (!disposed && !elements.configure.open && target && canOpen()) { event.preventDefault(); open(target, false); }
    });
    listen(elements.configure, 'toggle', () => {
      if (disposed) return;
      if (elements.configure.open) { if (!acknowledgedOpen && isActive() && target) open(target, false); }
      else if (acknowledgedOpen) { close(); if (!disposed) onEditing(); }
    });
    render();
    if (disposed) return receiver;
    elements.toolbar.hidden = false; elements.add.disabled = false;
    root.dataset.connectionReady = 'true'; INSTANCES.set(root, receiver); return receiver;
  } catch (error) { dispose(); throw error; }
}
