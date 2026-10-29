import { ROLE_CATALOGUES, CHANGE_FRAMEWORKS, CONTRIBUTION_CATEGORIES } from './roles.mjs';
import { ROLE_FORMS, CONTRIBUTION_FORMS, makeRoleTarget, describeRoleTarget,
  makeContributionTarget, describeContributionTarget } from './command-draft.mjs';

const INSTANCES = new WeakMap();
export const RESPONSIBILITY_LABELS = Object.freeze({
  functionId: 'Function', seniorityId: 'Seniority', postureId: 'Working posture', enablerId: 'Ability enabler',
  change: 'Change model and component', qualityId: 'Quality role', aiId: 'AI role', decisionId: 'Decision boundary',
  categoryId: 'Contribution', receiverPersonId: 'Human receiver', decisionOwnerPersonId: 'Who decides',
  workIds: 'Supporting sessions', reviewBoundary: 'Review before use', decisionBoundary: 'Decision boundary',
});
const ROLE_FIELDS = Object.freeze(['functionId', 'seniorityId', 'postureId', 'enablerId', 'change', 'qualityId', 'aiId', 'decisionId']);
const CONTRIBUTION_FIELDS = Object.freeze(['categoryId', 'receiverPersonId', 'decisionOwnerPersonId', 'reviewBoundary', 'decisionBoundary']);
const CATEGORY_LABELS = new Map(CONTRIBUTION_CATEGORIES.map(row => [row.id, row.label]));
const CATALOGUE_LABELS = new Map(Object.entries(ROLE_CATALOGUES).map(([field, rows]) => [field, new Map(rows.map(row => [row.id, row.label]))]));
const CHANGE_LABELS = new Map(CHANGE_FRAMEWORKS.flatMap(framework => framework.components.map(component =>
  [`${framework.id}:${component.id}`, `${framework.label} · ${component.label}`])));
export function responsibilityValue(field, value) {
  if (value === null || value === '') return 'Unassigned';
  if (field === 'change') return CHANGE_LABELS.get(value) ?? value;
  if (field === 'categoryId') return CATEGORY_LABELS.get(value) ?? value;
  return CATALOGUE_LABELS.get(field)?.get(value) ?? value;
}
const describe = target => describeRoleTarget(target) ?? describeContributionTarget(target);
const keyFor = (kind, draft) => draft?.[kind === 'role' ? 'roleId' : 'contributionId'];
const named = row => row ? `${row.label}${row.lifecycle === 'retired' ? ' · retired' : ''}` : 'Unassigned';

// This receiver owns two finite form presentations. Both borrow the host's
// single draft lease and publish through the existing accepted plan owner.
export function mountResponsibilityPanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {},
  onAccepted = () => {}, isActive = () => true, canOpen = isActive }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument;
  const find = selector => {
    const element = root.querySelector(selector);
    if (!element) throw new TypeError('Supply the complete role and responsibility panel.');
    return element;
  };
  const toolbar = find('[data-responsibility-toolbar]'), list = find('[data-responsibility-list]');
  const empty = find('[data-responsibility-empty]'), status = find('[data-responsibility-status]');
  const add = find('[data-responsibility-action="create"]');
  const groups = Object.fromEntries(['role', 'contribution'].map(kind => {
    const configure = find(`[data-responsibility-configure="${kind}"]`);
    const query = selector => configure.querySelector(selector);
    const fields = kind === 'role' ? ROLE_FIELDS : CONTRIBUTION_FIELDS;
    const form = query('form');
    return [kind, { kind, configure, form, fields, summary: query('summary'), fieldset: query('fieldset'),
      recovery: query('[data-responsibility-recovery]'), current: query('[data-responsibility-current]'),
      apply: query('[data-responsibility-apply]'), cancel: query('[data-responsibility-action="cancel"]'),
      general: query('[data-responsibility-general-error]'), accepted: query('[data-responsibility-accepted]'),
      inputs: Object.fromEntries(fields.map(field => [field, form.elements.namedItem(field)])),
      errors: Object.fromEntries([...fields, ...(kind === 'contribution' ? ['workIds'] : [])].map(field =>
        [field, query(`[data-responsibility-error="${field}"]`)])),
      acknowledged: false, target: null, composing: false }];
  }));
  const contribution = groups.contribution;
  Object.assign(contribution, { settings: find('[data-responsibility-fields]'), members: find('[data-responsibility-work]'),
    confirm: find('[data-responsibility-confirm]'), fresh: find('[data-responsibility-action="freshId"]'),
    dependencies: find('[data-responsibility-dependencies]') });
  const cleanup = [];
  let projection = null, people = new Map(), works = new Map(), contributions = new Map(), referenceLabels = new Map();
  let selectedPerson = null, mode = 'role', generation = 0, disposed = false, retired = null;
  let membershipProjection = null, membershipIds = null, memberControls = new Map();
  let contributionButtons = new Map();

  function listen(element, type, handler) { element.addEventListener(type, handler); cleanup.push(() => element.removeEventListener(type, handler)); }
  function owns(epoch) { return !disposed && epoch === generation; }
  function announce(message) { if (!disposed) status.textContent = message; }
  function releaseRetired() {
    if (!retired) return;
    const active = editing.read().active;
    if (active?.kind !== retired.kind || active.token !== retired.token) { retired = null; return; }
    const result = editing.park();
    if (result.ok || result.error.code !== 'settling') retired = null;
  }
  function operate(kind, method, ...args) {
    try { return editing[kind][method](...args); }
    finally { releaseRetired(); }
  }
  function option(value, label, disabled = false) {
    const element = document.createElement('option'); element.value = value; element.textContent = label; element.disabled = disabled; return element;
  }
  function button(label, action, id) {
    const element = document.createElement('button'); element.type = 'button'; element.textContent = label;
    element.dataset.responsibilityAction = action;
    if (id !== undefined) element.dataset.responsibilityId = id;
    return element;
  }
  function roleRaw(person) {
    return Object.fromEntries(ROLE_FIELDS.map(field => [field, field === 'change'
      ? person?.role.change ? `${person.role.change.frameworkId}:${person.role.change.componentId}` : ''
      : person?.role[field] ?? '']));
  }
  function contributionRaw(row) {
    return { ...Object.fromEntries(CONTRIBUTION_FIELDS.map(field => [field, row?.[field] ?? ''])), workIds: row?.workIds ?? [] };
  }
  function summaryWords(raw) {
    return ROLE_FIELDS.filter(field => raw[field]).map(field => responsibilityValue(field, raw[field])).join(' · ') || 'Role details are unassigned.';
  }
  function summaryText(kind, row, descriptor, draft) {
    if (kind === 'role') return `Role details for ${named(row)}`;
    if (descriptor?.mode === 'remove' && draft) return `Remove ${CATEGORY_LABELS.get(row?.categoryId) ?? 'contribution'}`;
    if (descriptor?.mode === 'create' && draft) return 'New contribution';
    return 'Contribution settings';
  }
  function currentText(kind, row, descriptor, creationConflict) {
    if (creationConflict) return 'This contribution already exists. Use these entries to prepare a new contribution.';
    if (row) {
      if (kind === 'role') return `Current values: ${summaryWords(roleRaw(row))}`;
      return `Current values: ${CATEGORY_LABELS.get(row.categoryId)}. Receiver: ${named(people.get(row.receiverPersonId))}. Who decides: ${named(people.get(row.decisionOwnerPersonId))}.`;
    }
    if (descriptor?.mode === 'create') return 'The plan changed. Review these entries before adding the contribution.';
    return 'This record was removed. Your saved entries remain below.';
  }
  function index(next) {
    if (projection === next) return;
    projection = next;
    people = new Map(next.state.people.map(row => [row.id, row]));
    works = new Map(next.state.work.map(row => [row.id, row]));
    contributions = new Map(next.state.contributions.map(row => [row.id, row]));
    referenceLabels = new Map(['people', 'teams', 'work', 'practices', 'contributions', 'connections'].map(collection =>
      [collection, new Map(next.state[collection].map(row => [row.id, row.label ?? CATEGORY_LABELS.get(row.categoryId) ?? row.id]))]));
    for (const field of ['receiverPersonId', 'decisionOwnerPersonId']) {
      contribution.inputs[field].replaceChildren(option('', 'Unassigned'), ...next.state.people.map(person => option(person.id, named(person))));
    }
    contributionButtons = new Map();
    const fragment = document.createDocumentFragment();
    for (const row of next.state.contributions) {
      const item = document.createElement('li'), open = button(CATEGORY_LABELS.get(row.categoryId), 'open', row.id);
      open.dataset.contributionId = row.id;
      const detail = document.createElement('p');
      detail.textContent = `Receiver: ${named(people.get(row.receiverPersonId))}. Who decides: ${named(people.get(row.decisionOwnerPersonId))}.`;
      const sessions = document.createElement('p');
      sessions.textContent = row.workIds.length ? row.workIds.map(id => named(works.get(id))).join(' · ') : 'Supporting sessions are unassigned.';
      const remove = button('Remove contribution', 'remove', row.id);
      remove.setAttribute('aria-label', `Remove ${CATEGORY_LABELS.get(row.categoryId)}`);
      item.append(open, detail, sessions, remove); fragment.append(item); contributionButtons.set(row.id, open);
    }
    list.replaceChildren(fragment); empty.hidden = contributions.size > 0;
  }
  function renderMembers(ids) {
    if (membershipProjection === projection && membershipIds?.length === ids.length && ids.every((id, position) => id === membershipIds[position])) return;
    membershipProjection = projection; membershipIds = [...ids];
    const positions = new Map(ids.map((id, position) => [id, position]));
    const ordered = [...ids, ...projection.state.work.filter(row => !positions.has(row.id)).map(row => row.id)];
    memberControls = new Map();
    const fragment = document.createDocumentFragment();
    for (const id of ordered) {
      const row = works.get(id), item = document.createElement('li'), label = document.createElement('label');
      const input = document.createElement('input'), text = document.createElement('span');
      input.type = 'checkbox'; input.dataset.responsibilityWork = id; input.checked = positions.has(id);
      text.textContent = row ? named(row) : `${id} · removed session`;
      label.append(input, text); item.append(label);
      if (positions.has(id)) {
        const actions = document.createElement('div'); actions.className = 'native-coordination__actions';
        const position = positions.get(id), up = button('Move up', 'work-up', id), down = button('Move down', 'work-down', id);
        up.disabled = position === 0; down.disabled = position === ids.length - 1;
        up.setAttribute('aria-label', `Move ${row?.label ?? id} up`); down.setAttribute('aria-label', `Move ${row?.label ?? id} down`);
        actions.append(up, down); item.append(actions);
      }
      fragment.append(item); memberControls.set(id, input);
    }
    contribution.members.replaceChildren(fragment);
  }
  function renderGroup(group) {
    const epoch = generation, view = editing[group.kind].read();
    const draft = keyFor(group.kind, view.draft) === group.target ? view.draft : null;
    const descriptor = describe(group.target);
    const removing = descriptor?.mode === 'remove' && Boolean(draft);
    const row = group.kind === 'role' ? people.get(descriptor?.id ?? selectedPerson) : contributions.get(descriptor?.id);
    const raw = draft?.raw ?? (group.kind === 'role' ? roleRaw(row) : contributionRaw(row));
    group.fieldset.disabled = !draft || view.status !== 'editing';
    group.recovery.hidden = !draft || view.status !== 'stale';
    group.configure.hidden = group.kind === 'role' ? selectedPerson === null && !draft : !group.target && !draft;
    group.summary.textContent = summaryText(group.kind, row, descriptor, draft);
    group.current.textContent = currentText(group.kind, row, descriptor, view.creationConflict);
    group.accepted.textContent = group.kind === 'role' ? summaryWords(roleRaw(row)) : '';
    for (const field of group.fields) {
      const value = raw[field] ?? '';
      if ((field === 'receiverPersonId' || field === 'decisionOwnerPersonId') && value && !people.has(value)
        && !Array.from(group.inputs[field].options).some(item => item.value === value)) {
        group.inputs[field].append(option(value, `${value} · removed person`, true));
      }
      if (group.inputs[field].value !== value) group.inputs[field].value = value;
      const error = draft?.errors.find(item => item.path === `draft.${field}`);
      group.inputs[field].setAttribute('aria-invalid', String(Boolean(error)));
      group.errors[field].textContent = error?.message ?? '';
    }
    if (group.kind === 'contribution') {
      contribution.settings.hidden = removing; contribution.confirm.hidden = !removing;
      contribution.confirm.textContent = removing ? `Remove ${CATEGORY_LABELS.get(row?.categoryId) ?? 'this contribution'}?` : '';
      contribution.fresh.hidden = !view.creationConflict;
      if (!removing) renderMembers(raw.workIds ?? []);
      const workError = draft?.errors.find(error => error.path === 'draft.workIds');
      contribution.errors.workIds.textContent = workError?.message ?? '';
      contribution.members.setAttribute('aria-invalid', String(Boolean(workError)));
    }
    const preview = draft && view.status === 'editing' && !group.composing ? operate(group.kind, 'preview', draft.token) : null;
    if (!owns(epoch)) return view;
    if (preview) {
      const current = editing[group.kind].read();
      if (current.status !== 'editing' && (current.projection !== view.projection || current.status !== view.status || current.draft?.token !== draft.token)) return render();
    }
    const error = preview && !preview.ok ? preview.error : null;
    const errorField = error && Object.keys(group.errors).find(field => error.path.endsWith(`.${field}`));
    if (errorField && !draft?.errors.length) {
      group.errors[errorField].textContent = error.message;
      (group.inputs[errorField] ?? contribution.members).setAttribute('aria-invalid', 'true');
    }
    group.general.textContent = error && !errorField && !draft?.errors.length ? error.message : '';
    if (group.kind === 'contribution') {
      const references = error?.references ?? [];
      contribution.dependencies.hidden = references.length === 0;
      contribution.dependencies.replaceChildren(...references.map(reference => {
        const item = document.createElement('li');
        item.textContent = `${referenceLabels.get(reference.collection)?.get(reference.id) ?? reference.id}: ${reference.field}`;
        return item;
      }));
    }
    group.apply.disabled = Boolean(error?.references?.length);
    group.apply.setAttribute('aria-disabled', String(!draft?.changed));
    group.apply.textContent = removing ? 'Remove contribution' : descriptor?.mode === 'create' && draft ? 'Add contribution' : 'Apply changes';
    return view;
  }
  function render() {
    if (disposed) return editing[mode].read();
    const epoch = generation;
    index(studio.read());
    if (!groups.role.configure.open) {
      const person = editing.read().selected.person;
      selectedPerson = people.has(person) ? person : people.has(selectedPerson) ? selectedPerson : projection.state.people[0]?.id ?? null;
      groups.role.target = selectedPerson ? makeRoleTarget('role.update', selectedPerson) : null;
    }
    renderGroup(groups.role);
    if (!owns(epoch)) return editing[mode].read();
    renderGroup(contribution);
    return editing[mode].read();
  }
  function focusForm(kind) {
    const view = editing[kind].read(), group = groups[kind], descriptor = describe(keyFor(kind, view.draft));
    if (view.status === 'stale') (view.creationConflict ? contribution.fresh : group.recovery.querySelector('button')).focus();
    else if (view.status === 'editing') (descriptor?.mode === 'remove' ? group.cancel : group.inputs[group.fields[0]]).focus();
  }
  function reveal(kind) {
    for (const group of Object.values(groups)) { group.acknowledged = group.kind === kind; group.configure.open = group.kind === kind; }
  }
  function opened(kind, result, epoch, focus) {
    if (!owns(epoch)) return result;
    const group = groups[kind]; group.composing = false;
    if (result.view.draft) group.target = keyFor(kind, result.view.draft);
    if (kind === 'role' && result.view.draft) selectedPerson = result.view.draft.targetId;
    reveal(kind); render();
    if (!owns(epoch)) return result;
    announce(result.ok ? '' : result.error.message);
    const token = editing[kind].read().draft?.token;
    onEditing();
    if (owns(epoch) && editing[kind].read().draft?.token === token && focus) focusForm(kind);
    return result;
  }
  function open(target, focus = true) {
    if (disposed) return;
    const descriptor = describe(target);
    if (!descriptor) return;
    const kind = describeRoleTarget(target) ? 'role' : 'contribution', epoch = ++generation;
    onBegin();
    if (!owns(epoch)) return;
    mode = kind;
    return opened(kind, operate(kind, 'begin', target, projection), epoch, focus);
  }
  function selectPerson(id, focus = true) { if (!disposed && people.has(id)) return open(makeRoleTarget('role.update', id), focus); }
  function create() {
    if (disposed) return;
    const epoch = ++generation; onBegin();
    if (!owns(epoch)) return;
    mode = 'contribution';
    return opened(mode, operate(mode, 'create', 'contribution.create', projection), epoch, true);
  }
  function close({ park = true } = {}) {
    if (disposed) return;
    const epoch = ++generation;
    if (park && ['role', 'contribution'].includes(editing.read().active?.kind)) editing.park();
    if (!owns(epoch)) return;
    for (const group of Object.values(groups)) { group.acknowledged = false; group.configure.open = false; }
  }
  function changed(kind, result, epoch, focus = null) {
    if (!owns(epoch)) return;
    if (result.view.draft) groups[kind].target = keyFor(kind, result.view.draft);
    render();
    if (!owns(epoch)) return;
    announce(result.ok ? '' : result.error.message);
    const token = editing[kind].read().draft?.token;
    onEditing();
    if (owns(epoch) && editing[kind].read().draft?.token === token && focus) focus();
  }
  function finishClosed(message, focusTarget) {
    close({ park: false });
    const epoch = generation;
    render();
    if (!owns(epoch)) return;
    announce(message);
    const accepted = studio.read(), intent = editing.read().intent;
    focusTarget().focus();
    if (owns(epoch) && studio.read() === accepted && editing.read().intent === intent && editing.read().active === null) onEditing();
  }
  function settle(kind, action) {
    if (disposed) return;
    const group = groups[kind], view = editing[kind].read();
    if (!view.draft) return;
    if (group.composing && action === 'apply') { announce('Finish entering the text, then apply.'); return; }
    if (action === 'apply' && view.status === 'editing' && !view.draft.changed) { announce('The plan already uses these values.'); return; }
    const descriptor = describe(keyFor(kind, view.draft)), epoch = ++generation;
    const result = operate(kind, action, view.draft.token);
    if (!owns(epoch)) return;
    if (!result.ok) { changed(kind, result, epoch, () => {
      const field = group.fields.find(name => result.error.path === `draft.${name}`);
      if (field) group.inputs[field].focus();
    }); return; }
    if (action === 'cancel') {
      group.target = descriptor.mode === 'create' ? null : group.target;
      finishClosed('Changes cancelled.', () => group.configure.hidden ? add : group.summary);
      return;
    }
    const accepted = result.projection ?? studio.read();
    onAccepted(accepted);
    if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return;
    if (descriptor.mode === 'remove') {
      group.target = null;
      finishClosed('Contribution removed.', () => add);
      return;
    }
    const target = kind === 'role' ? makeRoleTarget('role.update', descriptor.id) : makeContributionTarget('contribution.update', descriptor.id);
    const next = operate(kind, 'begin', target, studio.read());
    if (!owns(epoch)) return;
    group.target = keyFor(kind, next.view.draft) ?? target;
    const token = next.view.draft?.token;
    reveal(kind); render();
    if (!owns(epoch)) return;
    announce(next.ok ? kind === 'role' ? 'Role details updated.' : 'Contribution updated.' : next.error.message);
    onEditing();
    if (owns(epoch) && editing[kind].read().draft?.token === token) group.apply.focus();
  }
  function membership(id, delta = null, checked = false) {
    const view = editing.contribution.read();
    if (disposed || view.status !== 'editing' || !Array.isArray(view.draft?.raw.workIds)) return;
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
    changed('contribution', operate('contribution', 'setIds', view.draft.token, 'workIds', ids), epoch, () => memberControls.get(id)?.focus());
  }
  function edit(kind, event) {
    const group = groups[kind], field = event.target.name;
    if (disposed || group.inputs[field] !== event.target) return;
    const draft = editing[kind].read().draft;
    if (!draft) return;
    const epoch = ++generation;
    changed(kind, operate(kind, 'setText', draft.token, field, event.target.value), epoch);
  }
  function click(event) {
    const control = event.target.closest('[data-responsibility-action]');
    if (!control || !root.contains(control) || control.disabled || disposed) return;
    const action = control.dataset.responsibilityAction, id = control.dataset.responsibilityId;
    if (action === 'create') { create(); return; }
    if (action === 'open' || action === 'remove') { open(makeContributionTarget(action === 'open' ? 'contribution.update' : 'contribution.remove', id)); return; }
    if (action === 'work-up' || action === 'work-down') { membership(id, action === 'work-up' ? -1 : 1); return; }
    const kind = control.closest('[data-responsibility-configure]')?.dataset.responsibilityConfigure;
    if (!kind) return;
    if (action === 'cancel') { settle(kind, 'cancel'); return; }
    if (['review', 'useCurrent', 'freshId'].includes(action)) {
      const draft = editing[kind].read().draft;
      if (!draft) return;
      const epoch = ++generation;
      changed(kind, operate(kind, action, draft.token, projection), epoch, () => focusForm(kind));
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation += 1;
    for (const release of cleanup) release(); cleanup.length = 0;
    const active = editing.read().active;
    if (active && ['role', 'contribution'].includes(active.kind)) retired = { kind: active.kind, token: active.token };
    releaseRetired();
    for (const group of Object.values(groups)) { group.fieldset.disabled = true; group.configure.open = false; group.configure.hidden = true; }
    toolbar.hidden = true; list.hidden = true; empty.hidden = true; add.disabled = true;
    delete root.dataset.responsibilityReady; INSTANCES.delete(root);
  }
  const receiver = Object.freeze({ read: () => editing[mode].read(), render, refresh: render, selectPerson, open, create, close,
    isOpen: () => !disposed && Object.values(groups).some(group => group.configure.open),
    resume() {
      if (disposed) return;
      const group = groups[mode]; group.composing = false;
      if (group.configure.open && group.target) open(group.target, false); else render();
    }, dispose });
  try {
    for (const [field, rows] of Object.entries(ROLE_CATALOGUES)) groups.role.inputs[field].replaceChildren(option('', 'Unassigned'), ...rows.map(row => option(row.id, row.label)));
    groups.role.inputs.change.replaceChildren(option('', 'Unassigned'), ...CHANGE_FRAMEWORKS.map(framework => {
      const group = document.createElement('optgroup'); group.label = framework.label;
      group.append(...framework.components.map(component => option(`${framework.id}:${component.id}`, component.label)));
      return group;
    }));
    contribution.inputs.categoryId.replaceChildren(option('', 'Choose a contribution'), ...CONTRIBUTION_CATEGORIES.map(row => option(row.id, row.label)));
    for (const [kind, form] of [['role', ROLE_FORMS['role.update']], ['contribution', CONTRIBUTION_FORMS['contribution.create']]]) {
      const group = groups[kind];
      for (const field of group.fields) if (group.inputs[field].tagName === 'TEXTAREA') group.inputs[field].maxLength = form.fields[field].maxLength;
      listen(group.form, 'input', event => edit(kind, event));
      listen(group.form, 'submit', event => { event.preventDefault(); settle(kind, 'apply'); });
      listen(group.form, 'compositionstart', () => { group.composing = true; });
      listen(group.form, 'compositionend', event => { group.composing = false; edit(kind, event); });
      listen(group.summary, 'click', event => {
        if (!disposed && !group.configure.open && group.target && canOpen()) { event.preventDefault(); open(group.target, false); }
      });
      listen(group.configure, 'toggle', () => {
        if (disposed) return;
        if (group.configure.open) {
          if (!group.acknowledged && isActive() && group.target) open(group.target, false);
        } else if (group.acknowledged) { close(); onEditing(); }
      });
    }
    listen(root, 'click', click);
    listen(contribution.members, 'change', event => {
      const id = event.target.dataset.responsibilityWork;
      if (memberControls.get(id) === event.target) membership(id, null, event.target.checked);
    });
    render();
    if (disposed) return receiver;
    toolbar.hidden = false; list.hidden = false; add.disabled = false;
    root.dataset.responsibilityReady = 'true'; INSTANCES.set(root, receiver); return receiver;
  } catch (error) { dispose(); throw error; }
}
