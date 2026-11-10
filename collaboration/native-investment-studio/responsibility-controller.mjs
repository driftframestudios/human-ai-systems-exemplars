import { summarizeWorkSessions } from './work-sessions.mjs';
import { renderRemovalReferences } from './removal-references.mjs';
import { animateRackChange } from './reel-control.mjs';
import { revealStudioDestination } from './motion.mjs';
import { mountRackHeader, focusSubmitControl } from './rack-controls.mjs';
import { createRackRecord } from './rack-record-creation.mjs';
import { createRackAddControl } from './rack-creation-controls.mjs';
import { ROLE_CATALOGUES, CHANGE_FRAMEWORKS, CONTRIBUTION_CATEGORIES } from './roles.mjs';
import { deriveRolePreset, mountPersonRoleMixer } from './person-role-mixer.mjs';
import { summarizeWorkCapacity } from './people-capacity.mjs';
import { duration, wholeMoney } from './display.mjs';
import { ROLE_FORMS, CONTRIBUTION_FORMS, makeRoleTarget, describeRoleTarget,
  makeContributionTarget, describeContributionTarget } from './command-draft.mjs';

const INSTANCES = new WeakMap();
let nextInstance = 0;
export const RESPONSIBILITY_LABELS = Object.freeze({
  functionId: 'Function', seniorityId: 'Seniority', postureId: 'Working posture', enablerId: 'Ability enabler',
  change: 'Change model and component', qualityId: 'Quality role', aiId: 'AI role', decisionId: 'Decision boundary',
  categoryId: 'Contribution', receiverPersonId: 'Human receiver', decisionOwnerPersonId: 'Who decides',
  workIds: 'Supporting sessions', reviewBoundary: 'Review before use', decisionBoundary: 'Decision boundary',
});
const ROLE_FIELDS = Object.freeze(['functionId', 'seniorityId', 'postureId', 'enablerId', 'change', 'qualityId', 'aiId', 'decisionId']);
const CONTRIBUTION_FIELDS = Object.freeze(['categoryId', 'receiverPersonId', 'decisionOwnerPersonId']);
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
  onAccepted = () => {}, onDismiss = () => {}, isActive = () => true, canOpen = isActive }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, instance = `responsibility-${++nextInstance}`;
  const find = selector => {
    const element = root.querySelector(selector);
    if (!element) throw new TypeError('Supply the complete role and responsibility panel.');
    return element;
  };
  const toolbar = find('[data-responsibility-toolbar]'), list = find('[data-responsibility-list]');
  list.setAttribute('role', 'region'); list.setAttribute('aria-label', 'Contributions and supporting sessions'); list.tabIndex = 0;
  const empty = find('[data-responsibility-empty]'), status = find('[data-responsibility-status]');
  const previousAdd = find('[data-responsibility-action="create"]');
  const add = createRackAddControl(document, { label: 'Add contribution', dataset: { responsibilityAction: 'create' } });
  previousAdd.replaceWith(add);
  const groups = Object.fromEntries(['role', 'contribution'].map(kind => {
    const configure = find(`[data-responsibility-configure="${kind}"]`);
    if (!configure.id) configure.id = `${instance}-${kind}-settings`;
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
      acknowledged: false, target: null, composing: false, inputAcceptance: null, entryIntent: null }];
  }));
  const contribution = groups.contribution;
  Object.assign(contribution, { settings: find('[data-responsibility-fields]'), members: find('[data-responsibility-work]'),
    confirm: find('[data-responsibility-confirm]'), fresh: find('[data-responsibility-action="freshId"]'),
    dependencies: find('[data-responsibility-dependencies]') });
  const cleanup = [];
  const ratesRack = root.querySelector('.studio-people-rates');
  if (ratesRack) (ratesRack.querySelector('.studio-person-receiver') ?? ratesRack).append(groups.role.configure);
  for (const group of Object.values(groups)) {
    group.configure.dataset.directAcceptance = 'true';
    const closeGroup = (returnToOwner = false) => {
      const target = group.kind === 'role'
        ? returnToOwner ? root.querySelector(`[data-person-id="${selectedPerson}"]`) ?? group.summary : group.summary
        : contributionButtons.get(describe(group.target)?.id) ?? add;
      close({ kind: group.kind }); const epoch = generation, intent = editing.read().intent;
      onEditing(); if (owns(epoch) && editing.read().intent === intent && target?.isConnected) target.focus({ preventScroll: true });
    };
    group.header = mountRackHeader(group.configure, { title: group.kind === 'role' ? 'Role mix' : 'Contribution settings',
      owner: group.kind === 'role' ? 'People in working sessions' : 'Contributions and sessions',
      onClose: () => closeGroup(), onReturn: () => closeGroup(true) });
    group.header.element.classList.add('studio-people-editor__heading');
    group.summary.after(group.header.element);
  }
  let projection = null, people = new Map(), works = new Map(), contributions = new Map();
  let selectedPerson = null, mode = 'role', generation = 0, disposed = false, retired = null;
  let membershipProjection = null, membershipIds = null, memberControls = new Map();
  let contributionButtons = new Map(), contributionLinks = new Map(), membersTarget = null, memberOrder = [];
  let selectedRoleField = 'functionId', acceptedRole = null, roleMixer = null;

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
    if (action === 'open') element.classList.add('native-control--navigate');
    if (id !== undefined) element.dataset.responsibilityId = id;
    return element;
  }
  function roleRaw(person) {
    return Object.fromEntries(ROLE_FIELDS.map(field => [field, field === 'change'
      ? person?.role.change ? `${person.role.change.frameworkId}:${person.role.change.componentId}` : ''
      : person?.role[field] ?? '']));
  }
  function shownRoleRaw() {
    const group = groups.role, draft = editing.role.read().draft;
    return keyFor('role', draft) === group.target ? draft.raw : roleRaw(people.get(describe(group.target)?.id ?? selectedPerson));
  }
  function contributionRaw(row) {
    return { ...Object.fromEntries(CONTRIBUTION_FIELDS.map(field => [field, row?.[field] ?? ''])), workIds: row?.workIds ?? [] };
  }
  function summaryWords(raw) {
    return ROLE_FIELDS.filter(field => raw[field]).map(field => responsibilityValue(field, raw[field])).join(' · ') || 'Role details are unassigned.';
  }
  function summaryText(kind, row, descriptor, draft) {
    if (kind === 'role') {
      const raw = roleRaw(row);
      const facts = ROLE_FIELDS.filter(field => raw[field]).slice(0, 2).map(field => responsibilityValue(field, raw[field]));
      return `Role mix · ${named(row)} · ${facts.join(' · ') || 'Add role details'}${draft?.changed ? ' · Unsaved edits' : ''}`;
    }
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
    for (const field of ['receiverPersonId', 'decisionOwnerPersonId']) {
      contribution.inputs[field].replaceChildren(option('', 'Unassigned'), ...next.state.people.map(person => option(person.id, named(person))));
    }
    contributionButtons = new Map(); contributionLinks = new Map();
    const supported = summarizeWorkCapacity(next, next.state.contributions.flatMap(row => row.workIds));
    const reading = document.createElement('dl'); reading.className = 'studio-capacity-readings studio-contribution-reading';
    for (const [key, label, value, context] of [
      ['time', 'Supporting time', duration(supported.personMinutes), 'Across participating people'],
      ['value', 'Known work value', wholeMoney(supported.knownCents), supported.completeMoney ? 'Shared sessions counted once' : 'Some hourly rates are unknown'],
    ]) {
      const group = document.createElement('div'), title = document.createElement('dt'), amount = document.createElement('dd');
      const valueText = document.createElement('span'), detail = document.createElement('small');
      title.textContent = label; valueText.textContent = value; valueText.dataset.contributionTotal = key; detail.textContent = context;
      amount.append(valueText, detail); group.append(title, amount); reading.append(group);
    }
    const table = document.createElement('table'); table.className = 'studio-contribution-tracks';
    const caption = document.createElement('caption'); caption.textContent = 'Supporting sessions'; table.append(caption);
    const head = document.createElement('thead'), headings = document.createElement('tr');
    const contributionHeading = document.createElement('th'); contributionHeading.scope = 'col'; contributionHeading.textContent = 'Contribution';
    headings.append(contributionHeading);
    const sessionCell = (tag, work) => {
      const cell = document.createElement(tag);
      cell.dataset.workId = work.id; cell.dataset.workStatus = summarizeWorkSessions(work).status;
      return cell;
    };
    for (const work of next.state.work) {
      const cell = sessionCell('th', work); cell.scope = 'col'; cell.textContent = work.label; headings.append(cell);
    }
    const actionHeading = document.createElement('th'); actionHeading.scope = 'col'; actionHeading.textContent = 'Edit'; headings.append(actionHeading);
    head.append(headings); table.append(head);
    const body = document.createElement('tbody');
    for (const row of next.state.contributions) {
      const item = document.createElement('tr'), title = document.createElement('th'); title.scope = 'row';
      const open = button(CATEGORY_LABELS.get(row.categoryId), 'open', row.id);
      open.dataset.contributionId = row.id; open.classList.add('native-responsibility__selector', 'studio-track-key');
      open.setAttribute('aria-controls', contribution.configure.id); open.setAttribute('aria-expanded', 'false');
      const receiver = document.createElement('small'); receiver.textContent = `For ${named(people.get(row.receiverPersonId))}`;
      const decider = document.createElement('small'); decider.textContent = row.decisionOwnerPersonId
        ? `◇ ${named(people.get(row.decisionOwnerPersonId))} decides` : '◇ Decision owner unassigned';
      open.append(receiver, decider); title.append(open); item.append(title); contributionButtons.set(row.id, open);
      const links = new Map(); contributionLinks.set(row.id, links);
      for (const work of next.state.work) {
        const cell = sessionCell('td', work), included = row.workIds.includes(work.id);
        const paused = included && summarizeWorkSessions(work).status === 'paused';
        const pad = document.createElement('label'), input = document.createElement('input'), words = document.createElement('span');
        pad.className = 'studio-contribution-tracks__pad'; input.type = 'checkbox'; input.checked = included;
        input.dataset.responsibilityAction = 'work-link'; input.dataset.responsibilityId = row.id; input.dataset.responsibilityWorkId = work.id;
        input.setAttribute('aria-label', `${CATEGORY_LABELS.get(row.categoryId)} · ${work.label}: ${included ? paused ? 'linked, paused' : 'linked' : 'available'}`);
        words.textContent = included ? 'Linked' : 'Available'; pad.append(input, words); links.set(work.id, input);
        if (paused) {
          const marker = document.createElement('span'); marker.className = 'studio-pause-marker';
          marker.textContent = 'Ⅱ'; marker.setAttribute('aria-hidden', 'true'); pad.append(marker);
        }
        pad.dataset.included = String(included); pad.dataset.paused = String(paused);
        cell.append(pad); item.append(cell);
      }
      const removal = document.createElement('td'), remove = button('Remove', 'remove', row.id);
      remove.className = 'native-control--remove'; remove.setAttribute('aria-label', `Remove contribution: ${CATEGORY_LABELS.get(row.categoryId)}`);
      removal.append(remove); item.append(removal); body.append(item);
    }
    const addition = document.createElement('tr'), slot = document.createElement('td');
    addition.className = 'studio-contribution-add'; slot.colSpan = next.state.work.length + 2; slot.append(add); addition.append(slot); body.append(addition);
    table.append(body);
    const foot = document.createElement('tfoot'), totals = document.createElement('tr'); totals.className = 'studio-contribution-tracks__totals';
    const totalLabel = document.createElement('th'); totalLabel.scope = 'row'; totalLabel.textContent = 'Supporting effort'; totals.append(totalLabel);
    for (const work of next.state.work) {
      const linked = next.state.contributions.filter(row => row.workIds.includes(work.id)).length;
      const scope = summarizeWorkCapacity(next, linked ? [work.id] : []), cell = sessionCell('td', work);
      const count = document.createElement('small'); count.textContent = `${linked} linked`;
      const effort = document.createElement('strong'); effort.textContent = duration(scope.personMinutes);
      const cost = document.createElement('small'); cost.textContent = `${wholeMoney(scope.knownCents)}${scope.completeMoney ? '' : ' known'}`;
      const verb = summarizeWorkSessions(work).status === 'paused' ? 'Resume' : 'Pause';
      const toggle = button(`${verb} session`, 'work-status', work.id);
      toggle.className = 'studio-contribution-tracks__status native-control--cancel';
      toggle.setAttribute('aria-label', `${verb} session: ${work.label} throughout the plan`);
      cell.append(count, effort, cost, toggle); totals.append(cell);
    }
    totals.append(document.createElement('td')); foot.append(totals); table.append(foot);
    const legend = document.createElement('p'); legend.className = 'studio-contribution-legend';
    const pauseKey = document.createElement('span'); pauseKey.className = 'studio-pause-marker'; pauseKey.textContent = 'Ⅱ'; pauseKey.setAttribute('aria-hidden', 'true');
    legend.append('Select pads to link sessions. ', pauseKey, ' Paused · ◇ Decides. Paused work retains planned effort and cost.');
    list.replaceChildren(reading, table, legend); empty.hidden = contributions.size > 0;
  }
  function renderMembers(ids) {
    if (membersTarget !== contribution.target) { membersTarget = contribution.target; memberOrder = []; membershipIds = null; }
    if (membershipProjection === projection && membershipIds?.length === ids.length && ids.every((id, position) => id === membershipIds[position])) return;
    membershipProjection = projection; membershipIds = [...ids];
    const positions = new Map(ids.map((id, position) => [id, position]));
    const available = new Set([...works.keys(), ...ids]);
    memberOrder = memberOrder.filter(id => available.has(id));
    const shown = new Set(memberOrder);
    for (const id of [...ids, ...works.keys()]) if (!shown.has(id)) { memberOrder.push(id); shown.add(id); }
    const ordered = memberOrder;
    const previous = memberControls; memberControls = new Map(); const rows = [];
    for (const id of ordered) {
      const row = works.get(id), input = previous.get(id) ?? document.createElement('input');
      let item = input.closest('li');
      if (!item) {
        item = document.createElement('li'); item.className = 'native-coordination__member';
        const label = document.createElement('label'), words = document.createElement('span');
        const text = document.createElement('span'), state = document.createElement('small');
        text.dataset.memberName = ''; state.className = 'native-coordination__member-status';
        input.type = 'checkbox'; input.dataset.responsibilityWork = id;
        words.append(text, state); label.append(input, words);
        const actions = document.createElement('div'); actions.className = 'native-coordination__actions native-coordination__manipulation';
        actions.append(button('↑', 'work-up', id), button('↓', 'work-down', id)); item.append(label, actions);
      }
      const position = positions.get(id);
      item.dataset.responsibilityMember = id; item.dataset.selected = String(positions.has(id)); input.checked = positions.has(id);
      item.querySelector('[data-member-name]').textContent = row ? named(row) : `${id} · removed session`;
      item.querySelector('.native-coordination__member-status').textContent = positions.has(id) ? `Included · ${position + 1}` : 'Available';
      const [up, down] = item.querySelectorAll('button');
      up.disabled = position === undefined || position === 0; down.disabled = position === undefined || position === ids.length - 1;
      up.setAttribute('aria-label', `Move up: ${row?.label ?? id}`); down.setAttribute('aria-label', `Move down: ${row?.label ?? id}`);
      up.title = up.getAttribute('aria-label'); down.title = down.getAttribute('aria-label');
      rows.push(item); memberControls.set(id, input);
    }
    if (rows.length !== contribution.members.children.length || rows.some((row, index) => row !== contribution.members.children[index]))
      contribution.members.replaceChildren(...rows);
  }

  function selectRoleField(field) {
    if (!ROLE_FIELDS.includes(field)) return;
    selectedRoleField = field;
  }

  function renderGroup(group) {
    const epoch = generation, view = editing[group.kind].read();
    const draft = keyFor(group.kind, view.draft) === group.target ? view.draft : null;
    const descriptor = describe(group.target);
    const removing = descriptor?.mode === 'remove' && Boolean(draft);
    const row = group.kind === 'role' ? people.get(descriptor?.id ?? selectedPerson) : contributions.get(descriptor?.id);
    const raw = draft?.raw ?? (group.kind === 'role' ? roleRaw(row) : contributionRaw(row));
    group.fieldset.disabled = group.kind === 'role'
      ? !canOpen() || Boolean(draft && !['editing', 'parked'].includes(view.status))
      : !draft || view.status !== 'editing';
    group.configure.dataset.editing = String(group.acknowledged);
    group.recovery.hidden = !draft || view.status !== 'stale';
    group.configure.hidden = group.kind === 'role' ? selectedPerson === null && !draft : !group.target && !draft;
    group.summary.textContent = summaryText(group.kind, row, descriptor, draft);
    group.header.update({ title: group.kind === 'role' ? `Role mix · ${named(row)}` : descriptor?.mode === 'remove'
      ? `Remove ${CATEGORY_LABELS.get(row?.categoryId) ?? 'contribution'}` : CATEGORY_LABELS.get(raw.categoryId) ?? 'Contribution settings',
      source: group.apply, saved: draft && !draft.changed && view.status === 'editing'
        || group.kind === 'role' && !draft?.changed && acceptedRole?.projection === projection && acceptedRole.target === group.target ? 'Saved' : '' });
    group.apply.classList.toggle('native-control--remove', removing);
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
    if (group.kind === 'role') roleMixer?.update(raw, { disabled: group.fieldset.disabled });
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
    if (group.kind === 'contribution') renderRemovalReferences(contribution.dependencies, projection.state, error?.references);
    group.apply.disabled = Boolean(error?.references?.length);
    group.apply.setAttribute('aria-disabled', String(!draft?.changed));
    group.apply.classList.toggle('native-control--remove', removing);
    group.apply.textContent = removing ? 'Remove contribution' : descriptor?.mode === 'create' && draft ? 'Add contribution' : 'Apply changes';
    return view;
  }
  function render() {
    if (disposed) return editing[mode].read();
    const epoch = generation;
    index(studio.read());
    if (!groups.role.acknowledged) {
      const person = editing.read().selected.person;
      const nextPerson = people.has(person) ? person : people.has(selectedPerson) ? selectedPerson : projection.state.people[0]?.id ?? null;
      if (nextPerson !== selectedPerson) groups.role.configure.open = true;
      selectedPerson = nextPerson;
      groups.role.target = selectedPerson ? makeRoleTarget('role.update', selectedPerson) : null;
    }
    renderGroup(groups.role);
    if (!owns(epoch)) return editing[mode].read();
    renderGroup(contribution);
    renderDisclosureState();
    return editing[mode].read();
  }
  function renderDisclosureState() {
    const descriptor = describe(contribution.target);
    for (const [id, control] of contributionButtons) control.setAttribute('aria-expanded', String(
      contribution.configure.open && descriptor?.mode === 'update' && descriptor.id === id));
  }
  function focusForm(kind) {
    const view = editing[kind].read(), group = groups[kind], descriptor = describe(keyFor(kind, view.draft));
    const options = { preventScroll: kind === 'contribution' };
    if (view.status === 'stale') (view.creationConflict ? contribution.fresh : group.recovery.querySelector('button')).focus(options);
    else if (view.status === 'editing') {
      if (kind === 'role' && roleMixer) roleMixer.focus(selectedRoleField);
      else (descriptor?.mode === 'remove' ? group.cancel : group.inputs[group.fields[0]]).focus(options);
    }
    if (kind === 'contribution' && ['stale', 'editing'].includes(view.status)) revealStudioDestination(group.configure);
  }
  function reveal(kind) {
    for (const group of Object.values(groups)) {
      group.acknowledged = group.kind === kind;
      if (group.kind !== 'role' || kind === 'role') group.configure.open = group.kind === kind;
    }
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
    group.entryIntent = editing.read().intent;
    onEditing();
    if (owns(epoch) && editing[kind].read().draft?.token === token && focus) focusForm(kind);
    return result;
  }
  function open(target, focus = true) {
    if (disposed) return;
    const descriptor = describe(target);
    if (!descriptor) return;
    const kind = describeRoleTarget(target) ? 'role' : 'contribution', epoch = ++generation;
    onBegin(kind);
    if (!owns(epoch)) return;
    mode = kind;
    return opened(kind, operate(kind, 'begin', target, projection), epoch, focus);
  }
  function selectPerson(id, focus = true) { if (!disposed && people.has(id)) return open(makeRoleTarget('role.update', id), focus); }
  function ensureRoleOwner({ focusRecovery = false } = {}) {
    const group = groups.role, view = editing.role.read();
    if (disposed || !canOpen() || !group.target) return false;
    if (group.acknowledged && view.status === 'editing' && keyFor('role', view.draft) === group.target) return true;
    const target = group.target, epoch = generation + 1;
    const result = open(target, false);
    if (!owns(epoch) || !group.acknowledged || group.target !== target
      || result?.view.draft?.token !== editing.role.read().draft?.token || group.entryIntent !== editing.read().intent) return false;
    if (focusRecovery && editing.role.read().status === 'stale') focusForm('role');
    return editing.role.read().status === 'editing';
  }
  function create() {
    if (disposed) return;
    const epoch = ++generation; onBegin();
    if (!owns(epoch)) return;
    mode = 'contribution';
    return opened(mode, operate(mode, 'create', 'contribution.create', projection), epoch, true);
  }
  function addRecord() {
    if (disposed || !canOpen()) return;
    const epoch = ++generation; onBegin(); if (!owns(epoch)) return;
    const result = createRackRecord(studio, editing, 'contribution');
    if (!owns(epoch)) return;
    if (!result.ok) { render(); announce(result.error.message); return; }
    close({ park: false }); contribution.target = null;
    const closedAt = generation, intent = editing.read().intent; onAccepted(result.projection);
    if (!owns(closedAt) || editing.read().intent !== intent) return;
    render(); announce('Contribution added. Choose it to connect work and people. Undo is available.');
    if (owns(closedAt) && editing.read().intent === intent) add.focus();
  }
  function close({ park = true, kind = null, keepRole = false } = {}) {
    if (disposed) return;
    onDismiss(kind);
    if (disposed) return;
    const epoch = ++generation;
    const activeKind = editing.read().active?.kind;
    if (park && ['role', 'contribution'].includes(activeKind) && (!kind || activeKind === kind)) editing.park();
    if (!owns(epoch)) return;
    for (const group of Object.values(groups)) {
      if (kind && group.kind !== kind) continue;
      group.acknowledged = false;
      if (group.kind !== 'role' || !keepRole) group.configure.open = false;
    }
    renderDisclosureState();
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
  function settle(kind, action, { focus = true } = {}) {
    if (disposed || kind === 'role' && action === 'apply' && !ensureRoleOwner({ focusRecovery: true })) return;
    const group = groups[kind], view = editing[kind].read();
    const origin = document.activeElement;
    group.configure.dataset.directAcceptance = String(!focus);
    if (!view.draft) return;
    if (group.composing && action === 'apply') { announce('Finish entering the text, then apply.'); return; }
    if (action === 'apply' && view.status === 'editing' && !view.draft.changed) { announce('The plan already uses these values.'); return; }
    const descriptor = describe(keyFor(kind, view.draft)), epoch = ++generation, previousProjection = studio.read();
    const result = operate(kind, action, view.draft.token);
    if (!owns(epoch)) return;
    if (!result.ok) { changed(kind, result, epoch, focus ? () => {
      const field = group.fields.find(name => result.error.path === `draft.${name}`);
      if (field) { if (kind === 'role' && roleMixer) roleMixer.focus(field); else group.inputs[field].focus(); }
    } : null); return; }
    if (action === 'cancel') {
      group.target = descriptor.mode === 'create' ? null : group.target;
      finishClosed('Changes cancelled.', () => group.configure.hidden ? add : group.summary);
      return;
    }
    const accepted = result.projection ?? studio.read();
    if (kind === 'role') acceptedRole = { projection: accepted, target: group.target };
    onAccepted(accepted, { kind, previousProjection });
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
    if (owns(epoch) && editing[kind].read().draft?.token === token) {
      if (focus) focusSubmitControl(group.apply);
      else if (origin?.isConnected && group.configure.contains(origin) && !origin.matches(':disabled')) origin.focus({ preventScroll: true });
    }
    return owns(epoch) && editing[kind].read().draft?.token === token;
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
      const selected = new Set(ids); let next = 0;
      memberOrder = memberOrder.map(member => selected.has(member) ? ids[next++] : member);
    }
    const update = () => {
      changed('contribution', operate('contribution', 'setIds', view.draft.token, 'workIds', ids), epoch);
      if (!owns(epoch)) return;
      const completed = describeContributionTarget(editing.contribution.read().draft?.contributionId)?.mode !== 'update'
        || settle('contribution', 'apply', { focus: false });
      if (completed && !disposed) memberControls.get(id)?.focus({ preventScroll: true });
    };
    if (delta !== null) animateRackChange(contribution.members, update, { selector: '[data-responsibility-member]', key: 'responsibilityMember' });
    else update();
  }
  function linkWork(event) {
    const control = event.target, id = control.dataset.responsibilityId, workId = control.dataset.responsibilityWorkId;
    if (disposed || contributionLinks.get(id)?.get(workId) !== control) return;
    const current = studio.read(), row = current.state.contributions.find(item => item.id === id), checked = control.checked;
    control.checked = Boolean(row?.workIds.includes(workId));
    if (!canOpen() || !row || !current.state.work.some(work => work.id === workId) || checked === control.checked) return;
    const epoch = ++generation, parked = editing.park();
    if (!owns(epoch)) return;
    if (!parked.ok) { announce(parked.error.message); return; }
    // The matrix changes only this accepted relationship. Any unfinished editor
    // keeps its own raw entries and follows the existing stale-draft review route.
    const workIds = checked ? [...row.workIds, workId] : row.workIds.filter(item => item !== workId);
    const result = studio.applyCommand({ type: 'contribution.update', contributionId: id, contribution: { ...row, workIds } }, current);
    if (!owns(epoch)) return;
    if (!result.ok) { render(); announce(result.error.message); return; }
    const intent = editing.read().intent; onAccepted(result.projection);
    if (!owns(epoch) || studio.read() !== result.projection || editing.read().intent !== intent) return;
    render(); announce(`Session ${checked ? 'linked' : 'unlinked'}. Undo is available.`);
    contributionLinks.get(id)?.get(workId)?.focus({ preventScroll: true });
  }
  function edit(kind, event) {
    const group = groups[kind], field = event.target.name;
    if (disposed || group.inputs[field] !== event.target) return;
    group.inputAcceptance = null;
    const value = event.target.value;
    if (kind === 'role' && shownRoleRaw()[field] === value) return;
    if (kind === 'role' && !ensureRoleOwner({ focusRecovery: true })) return;
    const draft = editing[kind].read().draft;
    if (!draft || !group.acknowledged) return;
    const epoch = ++generation;
    const result = operate(kind, 'setText', draft.token, field, value), intent = editing.read().intent;
    changed(kind, result, epoch);
    if (owns(epoch) && editing[kind].read().draft?.token === draft.token && editing.read().intent === intent) {
      group.inputAcceptance = { token: draft.token, intent };
    }
  }
  function applyRoleSelection({ field, dimension, value }) {
    if (disposed || !canOpen()) return;
    const derive = raw => dimension ? deriveRolePreset(raw, dimension, value)
      : ROLE_FIELDS.includes(field) ? { ...raw, [field]: value } : null;
    const shown = shownRoleRaw(), proposed = derive(shown);
    // A selected pad or reel keeps the person lease and its live money preview.
    if (!proposed || ROLE_FIELDS.every(name => proposed[name] === shown[name])) return;
    if (!ensureRoleOwner({ focusRecovery: true })) return;
    const draft = editing.role.read().draft;
    if (!draft) return;
    const next = derive(draft.raw);
    if (!next) return;
    const epoch = ++generation;
    let result;
    // Build one role draft, then accept once so connected choices have one Undo.
    for (const name of ROLE_FIELDS) {
      if (next[name] === draft.raw[name]) continue;
      result = operate('role', 'setText', draft.token, name, next[name]);
      if (!owns(epoch) || editing.role.read().draft?.token !== draft.token) return;
      if (!result.ok) { changed('role', result, epoch); return result; }
    }
    if (!result) { render(); return; }
    const intent = editing.read().intent;
    changed('role', result, epoch);
    if (owns(epoch) && editing.role.read().draft?.token === draft.token && editing.read().intent === intent)
      return settle('role', 'apply', { focus: false });
  }
  function click(event) {
    const control = event.target.closest('[data-responsibility-action]');
    if (!control || !root.contains(control) || control.disabled || disposed) return;
    const action = control.dataset.responsibilityAction, id = control.dataset.responsibilityId;
    if (action === 'work-status') {
      if (!canOpen()) return;
      const current = studio.read(), work = current.state.work.find(row => row.id === id);
      if (!work) return;
      const epoch = ++generation, parked = editing.park();
      if (!owns(epoch)) return;
      if (!parked.ok) { announce(parked.error.message); return; }
      const result = studio.applyCommand({ type: 'work.status.set', workId: id, status: summarizeWorkSessions(work).status === 'paused' ? 'planned' : 'paused' }, current);
      if (!owns(epoch)) return;
      if (!result.ok) { render(); announce(result.error.message); return; }
      const intent = editing.read().intent; onAccepted(result.projection);
      if (!owns(epoch) || editing.read().intent !== intent) return;
      render(); announce(`${work.label} ${summarizeWorkSessions(work).status === 'paused' ? 'resumed' : 'paused'}. Undo is available.`);
      list.querySelector(`[data-responsibility-action="work-status"][data-responsibility-id="${id}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (action === 'create') { addRecord(); return; }
    if (action === 'open' || action === 'remove') {
      const target = makeContributionTarget(action === 'open' ? 'contribution.update' : 'contribution.remove', id);
      if (action === 'open' && contribution.configure.open && contribution.target === target) { close(); onEditing(); }
      else open(target);
      return;
    }
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
    for (const group of Object.values(groups)) { group.header.dispose(); group.fieldset.disabled = true; group.configure.open = false; group.configure.hidden = true; }
    toolbar.hidden = true; list.hidden = true; empty.hidden = true; add.disabled = true;
    delete root.dataset.responsibilityReady; INSTANCES.delete(root);
  }
  const receiver = Object.freeze({ read: () => editing[mode].read(), render, refresh: render, selectPerson, open, create, close,
    applyPreset: (dimension, value) => applyRoleSelection({ dimension, value }),
    setSpreadVisual: ratio => roleMixer?.vary(ratio),
    isOpen: () => !disposed && Object.values(groups).some(group => group.acknowledged),
    resume() {
      if (disposed) return;
      const group = groups[mode]; group.composing = false;
      if (group.acknowledged && group.target) open(group.target, false); else render();
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
      if (kind === 'role') listen(group.form, 'focusin', event => {
        if (!disposed && group.inputs[event.target.name] === event.target) selectRoleField(event.target.name);
      });
      listen(group.form, 'change', event => {
        if (disposed || group.inputs[event.target.name] !== event.target || group.composing) return;
        const acceptance = group.inputAcceptance; group.inputAcceptance = null;
        const view = editing[kind].read(), descriptor = describe(keyFor(kind, view.draft));
        if (acceptance?.token === view.draft?.token && acceptance?.intent === editing.read().intent
          && view.status === 'editing' && view.draft?.changed && descriptor?.mode === 'update') settle(kind, 'apply', { focus: false });
      });
      listen(group.form, 'submit', event => { event.preventDefault(); settle(kind, 'apply'); });
      listen(group.form, 'compositionstart', () => { group.composing = true; });
      listen(group.form, 'compositionend', event => { group.composing = false; edit(kind, event); });
      listen(group.summary, 'click', event => {
        if (!disposed && !group.configure.open && group.target && canOpen()) { event.preventDefault(); open(group.target, false); }
      });
      listen(group.configure, 'toggle', () => {
        if (disposed || kind === 'role') return;
        if (group.configure.open) {
          if (!group.acknowledged && isActive() && group.target) open(group.target, false);
        } else if (group.acknowledged) { close(); onEditing(); }
      });
    }
    listen(root, 'click', click);
    listen(list, 'change', linkWork);
    listen(contribution.members, 'change', event => {
      const id = event.target.dataset.responsibilityWork;
      if (memberControls.get(id) === event.target) membership(id, null, event.target.checked);
    });
    roleMixer = mountPersonRoleMixer(document, { inputs: groups.role.inputs, onChange: applyRoleSelection });
    groups.role.configure.open = true;
    groups.role.fieldset.prepend(roleMixer.element);
    cleanup.push(() => roleMixer.dispose());
    selectRoleField(selectedRoleField);
    render();
    if (disposed) return receiver;
    toolbar.hidden = false; list.hidden = false; add.disabled = false;
    root.dataset.responsibilityReady = 'true'; INSTANCES.set(root, receiver); return receiver;
  } catch (error) { dispose(); throw error; }
}
