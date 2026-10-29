import { ASSEMBLY_FORMS, describeAssemblyTarget, makeAssemblyTarget } from './command-draft.mjs';
import { money, duration } from './display.mjs';

const INSTANCES = new WeakMap();
const TEXT_FIELDS = Object.freeze(['label', 'ratePerHour', 'fundedHours', 'fundedMinutes']);
const NUMBER_FIELDS = new Set(['ratePerHour', 'fundedHours', 'fundedMinutes']);
const REFERENCE_LABELS = Object.freeze({ people: 'Person', teams: 'Team', work: 'Work', practices: 'Practice' });

// The host lends its accepted owner and assembly draft port. This receiver owns
// only the People chapter's creation, membership, ordering and removal controls.
export function mountAssemblyPanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {},
  onAccepted = () => {}, onPersonCreated = () => {}, isActive = () => true, canOpen = isActive }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument;
  const find = name => {
    const element = root.querySelector(`[data-assembly-${name}]`);
    if (!element) throw new TypeError('Supply the complete People and Teams panel.');
    return element;
  };
  const elements = Object.fromEntries(['person', 'people-tools', 'teams', 'empty', 'configure', 'summary', 'form',
    'fieldset', 'name-group', 'name-label', 'person-fields', 'members-group', 'members', 'confirm',
    'dependencies', 'feedback', 'general-error', 'preview', 'total', 'preview-note', 'apply', 'cancel',
    'recovery', 'current', 'fresh-id', 'status'].map(name => [name, find(name)]));
  const inputs = Object.fromEntries(TEXT_FIELDS.map(field => [field, elements.form.elements.namedItem(field)]));
  const errors = Object.fromEntries([...TEXT_FIELDS, 'personIds'].map(field => [field, find(`error="${field}"`)]));
  const editor = editing.assembly;
  const cleanup = [];
  let projection = null, people = new Map(), personPositions = new Map(), teams = new Map(), references = new Map();
  let selectedPerson = null, selectedTarget = null, memberProjection = null, memberIds = null;
  let memberControls = new Map(), teamControls = new Map();
  let disposed = false, composing = false, acknowledgedOpen = false, generation = 0;

  function listen(target, name, callback) {
    target.addEventListener(name, callback);
    cleanup.push(() => target.removeEventListener(name, callback));
  }
  function currentOperation(epoch) { return !disposed && epoch === generation; }
  function announce(message) { if (!disposed) elements.status.textContent = message; }
  function button(label, action, id = null) {
    const control = document.createElement('button');
    control.type = 'button'; control.textContent = label; control.dataset.assemblyAction = action;
    if (id !== null) control.dataset.assemblyId = id;
    return control;
  }
  function selectPersonControls() {
    const index = personPositions.get(selectedPerson) ?? -1;
    elements.person.disabled = index < 0;
    for (const control of elements['people-tools'].querySelectorAll('[data-assembly-action]')) {
      const action = control.dataset.assemblyAction;
      control.disabled = index < 0 || action === 'person-up' && index === 0
        || action === 'person-down' && index === projection.state.people.length - 1;
    }
  }
  function renderLists(next) {
    if (next === projection) return;
    projection = next;
    people = new Map(next.state.people.map(person => [person.id, person]));
    personPositions = new Map(next.state.people.map((person, index) => [person.id, index]));
    teams = new Map(next.state.teams.map(team => [team.id, team]));
    references = new Map(['people', 'teams', 'work', 'practices'].map(collection =>
      [collection, new Map(next.state[collection].map(row => [row.id, row.label ?? row.id]))]));
    if (!people.has(selectedPerson)) selectedPerson = next.state.people[0]?.id ?? null;
    const options = next.state.people.map(person => {
      const option = document.createElement('option'); option.value = person.id; option.textContent = person.label;
      return option;
    });
    elements.person.replaceChildren(...options);
    elements.person.value = selectedPerson ?? '';
    selectPersonControls();
    teamControls = new Map();
    const fragment = document.createDocumentFragment();
    next.state.teams.forEach((team, index) => {
      const item = document.createElement('li');
      const choose = button(team.label, 'team-open', team.id);
      choose.dataset.assemblyTeam = team.id;
      const members = document.createElement('p');
      members.textContent = team.personIds.map(id => people.get(id).label).join(' · ') || 'Choose people for this team.';
      const actions = document.createElement('div'); actions.className = 'native-coordination__actions';
      const up = button('Move up', 'team-up', team.id), down = button('Move down', 'team-down', team.id);
      up.disabled = index === 0; down.disabled = index === next.state.teams.length - 1;
      up.setAttribute('aria-label', `Move ${team.label} up`); down.setAttribute('aria-label', `Move ${team.label} down`);
      const remove = button('Remove team', 'team-remove', team.id);
      remove.setAttribute('aria-label', `Remove ${team.label}`);
      actions.append(up, down, remove); item.append(choose, members, actions); fragment.append(item);
      teamControls.set(team.id, choose);
    });
    elements.teams.replaceChildren(fragment);
    elements.empty.hidden = next.state.teams.length > 0;
  }
  function renderMembers(ids) {
    if (memberProjection === projection && memberIds?.length === ids.length
        && ids.every((id, index) => id === memberIds[index])) return;
    memberProjection = projection; memberIds = ids.slice();
    const positions = new Map(ids.map((id, index) => [id, index]));
    const selected = new Set(ids), ordered = [...ids, ...projection.state.people.filter(person => !selected.has(person.id)).map(person => person.id)];
    memberControls = new Map();
    const fragment = document.createDocumentFragment();
    ordered.forEach(id => {
      const item = document.createElement('li'), label = document.createElement('label');
      const checkbox = document.createElement('input'), name = document.createElement('span');
      checkbox.type = 'checkbox'; checkbox.dataset.assemblyMember = id; checkbox.checked = selected.has(id);
      name.textContent = people.get(id)?.label ?? `${id} (removed)`;
      label.append(checkbox, name); item.append(label);
      const controls = { checkbox };
      if (selected.has(id)) {
        const index = positions.get(id), actions = document.createElement('div');
        actions.className = 'native-coordination__actions';
        controls.up = button('Move up', 'member-up', id); controls.down = button('Move down', 'member-down', id);
        controls.up.disabled = index === 0; controls.down.disabled = index === ids.length - 1;
        controls.up.setAttribute('aria-label', `Move ${name.textContent} up in the team`);
        controls.down.setAttribute('aria-label', `Move ${name.textContent} down in the team`);
        actions.append(controls.up, controls.down); item.append(actions);
      }
      memberControls.set(id, controls); fragment.append(item);
    });
    elements.members.replaceChildren(fragment);
  }
  function renderReferences(error) {
    const dependencies = error?.references ?? [];
    elements.dependencies.hidden = dependencies.length === 0;
    elements.dependencies.replaceChildren(...dependencies.map(reference => {
      const item = document.createElement('li');
      const name = references.get(reference.collection)?.get(reference.id) ?? reference.id;
      item.textContent = `${REFERENCE_LABELS[reference.collection]}: ${name}`;
      return item;
    }));
  }
  function render() {
    const view = editor.read();
    if (disposed) return view;
    renderLists(view.projection);
    if (elements.person.value !== (selectedPerson ?? '')) elements.person.value = selectedPerson ?? '';
    selectPersonControls();
    selectedTarget = view.draft?.assemblyId ?? selectedTarget;
    const descriptor = describeAssemblyTarget(view.draft?.assemblyId ?? selectedTarget);
    const draft = view.draft;
    root.dataset.assemblyState = view.status;
    for (const [id, control] of teamControls) {
      control.setAttribute('aria-pressed', String(descriptor?.collection === 'teams' && descriptor.id === id));
    }
    elements.configure.hidden = draft === null;
    elements.fieldset.disabled = view.status !== 'editing';
    elements.recovery.hidden = view.status !== 'stale';
    const personForm = descriptor?.form === 'person.create', removing = descriptor?.mode === 'remove';
    const target = descriptor?.collection === 'people' ? people.get(descriptor.id) : teams.get(descriptor?.id);
    elements.summary.textContent = !descriptor ? 'Settings' : descriptor.mode === 'create'
      ? descriptor.collection === 'people' ? 'Add a person' : 'Add a team'
      : `${removing ? 'Remove' : 'Settings for'} ${target?.label ?? descriptor.id}`;
    elements['name-group'].hidden = !descriptor || removing;
    elements['name-label'].textContent = personForm ? 'Name' : 'Team name';
    elements['person-fields'].hidden = !personForm;
    elements['members-group'].hidden = !descriptor || descriptor.collection !== 'teams' || removing;
    elements.confirm.hidden = !removing;
    elements.confirm.textContent = removing ? `Remove ${target?.label ?? descriptor.id} from this plan?` : '';
    const recordName = descriptor?.collection === 'people' ? 'person' : 'team';
    elements.current.textContent = view.creationConflict
      ? `The plan already contains this ${recordName}. Use these entries to prepare a new ${recordName}.`
      : target ? descriptor.collection === 'teams'
        ? `Current team: ${target.label}. ${target.personIds.map(id => people.get(id).label).join(', ') || 'No people selected'}.`
        : `Current person: ${target.label} · ${target.rateCentsPerHour === null ? 'hourly rate unknown' : `${money(target.rateCentsPerHour)}/hour`} · ${duration(target.fundedMinutes)} funded.`
        : descriptor?.mode === 'create' ? 'The plan changed. Review your entries before adding them.'
          : 'This record was removed. Your saved entries remain below.';
    elements['fresh-id'].hidden = !view.creationConflict;
    elements['fresh-id'].textContent = `Use these entries for a new ${recordName}`;
    for (const field of TEXT_FIELDS) {
      const raw = draft?.raw[field] ?? '';
      if (inputs[field].value !== raw) inputs[field].value = raw;
      const metadata = descriptor?.fields[field];
      inputs[field].maxLength = metadata?.maxLength ?? (field === 'label' ? 120 : 32);
      const error = draft?.errors.find(item => item.path === `draft.${field}`);
      inputs[field].setAttribute('aria-invalid', String(Boolean(error)));
      errors[field].textContent = error?.message ?? '';
    }
    const membersError = draft?.errors.find(item => item.path === 'draft.personIds');
    errors.personIds.textContent = membersError?.message ?? '';
    elements.members.setAttribute('aria-invalid', String(Boolean(membersError)));
    if (descriptor?.collection === 'teams' && !removing) renderMembers(draft?.raw.personIds ?? []);
    const preview = draft && !composing && view.status === 'editing' ? editor.preview(draft.token) : null;
    const error = preview && !preview.ok ? preview.error : null;
    const localError = draft?.errors.length > 0;
    elements['general-error'].textContent = error && !localError ? error.message : '';
    renderReferences(error);
    elements.preview.hidden = !descriptor || removing;
    elements.total.textContent = preview?.ok ? money(preview.projection.result.knownCommitmentCents) : '—';
    elements['preview-note'].textContent = preview?.ok ? 'Apply to update the plan.' : 'Complete the settings to preview the total.';
    elements.apply.textContent = removing ? descriptor.collection === 'people' ? 'Remove person' : 'Remove team'
      : descriptor?.mode === 'create' ? personForm ? 'Add person' : 'Add team' : 'Apply team';
    elements.apply.disabled = Boolean(error?.references?.length);
    elements.apply.setAttribute('aria-disabled', String(!draft?.changed));
    return view;
  }
  function focusEditor() {
    const view = editor.read();
    if (view.status === 'stale') (elements['fresh-id'].hidden ? elements.recovery.querySelector('button') : elements['fresh-id']).focus();
    else if (view.status === 'editing') {
      const descriptor = describeAssemblyTarget(view.draft.assemblyId);
      (descriptor.mode === 'remove' ? elements.cancel : inputs.label).focus();
    }
  }
  function opened(result, epoch, focus) {
    if (!currentOperation(epoch)) return result;
    composing = false;
    selectedTarget = result.view?.draft?.assemblyId ?? selectedTarget;
    render();
    if (editor.read().draft) { acknowledgedOpen = true; elements.configure.open = true; }
    announce(result.ok ? '' : result.error.message);
    onEditing();
    if (currentOperation(epoch) && focus) focusEditor();
    return result;
  }
  function open(target, focus = true) {
    if (disposed) return;
    const epoch = ++generation;
    onBegin();
    if (!currentOperation(epoch)) return;
    return opened(editor.begin(target, projection), epoch, focus);
  }
  function create(form) {
    if (disposed || !['person.create', 'team.create'].includes(form) || !ASSEMBLY_FORMS[form]) return;
    const epoch = ++generation;
    onBegin();
    if (!currentOperation(epoch)) return;
    return opened(editor.create(form, projection), epoch, true);
  }
  function close({ park = true } = {}) {
    if (disposed) return;
    const epoch = ++generation;
    acknowledgedOpen = false;
    if (park && editing.read().active?.kind === 'assembly') editing.park();
    if (!currentOperation(epoch)) return;
    elements.configure.open = false;
  }
  function changed(result, epoch, focus = null) {
    if (!currentOperation(epoch)) return;
    render();
    announce(result.ok ? '' : result.error.message);
    onEditing();
    if (currentOperation(epoch) && focus) focus();
  }
  function settle(action) {
    if (disposed) return;
    const view = editor.read();
    if (!view.draft) return;
    if (composing && action === 'apply') { announce('Finish entering the value, then apply.'); return; }
    const descriptor = describeAssemblyTarget(view.draft.assemblyId), epoch = ++generation;
    const result = editor[action](view.draft.token);
    if (!currentOperation(epoch)) return;
    if (!result.ok) {
      changed(result, epoch, () => {
        const field = TEXT_FIELDS.find(name => result.error.path === `draft.${name}`);
        if (field) inputs[field].focus();
      });
      return;
    }
    if (action === 'cancel') {
      close({ park: false }); render(); announce('Changes cancelled.');
      const closedAt = generation;
      onEditing();
      if (currentOperation(closedAt)) {
        const target = descriptor.collection === 'teams' ? teamControls.get(descriptor.id)
          : descriptor.mode === 'remove' ? elements.person : null;
        (target ?? root.querySelector(`[data-assembly-action="${descriptor.collection === 'teams' ? 'team' : 'person'}-create"]`)).focus();
      }
      return;
    }
    onAccepted(result.projection ?? studio.read());
    if (!currentOperation(epoch)) return;
    if (descriptor.form === 'person.create') {
      selectedPerson = descriptor.id; close({ park: false }); render(); announce('Person added.');
      onPersonCreated(descriptor.id);
      return;
    }
    if (descriptor.collection === 'teams' && descriptor.mode !== 'remove') {
      editor.begin(makeAssemblyTarget('team.update', descriptor.id), studio.read());
      render(); acknowledgedOpen = true; elements.configure.open = true;
      announce(descriptor.mode === 'create' ? 'Team added.' : 'Team updated.');
      onEditing();
      if (currentOperation(epoch)) elements.apply.focus();
    } else {
      close({ park: false }); render(); announce(descriptor.collection === 'people' ? 'Person removed.' : 'Team removed.');
      const closedAt = generation;
      onEditing();
      if (currentOperation(closedAt)) root.querySelector(`[data-assembly-action="${descriptor.collection === 'people' ? 'person' : 'team'}-create"]`).focus();
    }
  }
  function move(collection, id, delta) {
    if (disposed) return;
    const epoch = ++generation, expected = projection;
    const ids = expected.state[collection].map(row => row.id), index = ids.indexOf(id), destination = index + delta;
    if (index < 0 || destination < 0 || destination >= ids.length) return;
    if (studio.read() !== expected) { render(); announce('The plan changed. Review the order, then try again.'); return; }
    onBegin();
    if (!currentOperation(epoch)) return;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    [ids[index], ids[destination]] = [ids[destination], ids[index]];
    const result = studio.applyCommand({ type: 'collection.reorder', collection, ids }, expected);
    if (!currentOperation(epoch)) return;
    if (result.ok) onAccepted(result.projection);
    else onEditing();
    if (!currentOperation(epoch)) return;
    render(); announce(result.ok ? 'Order updated.' : result.error.message);
    if (result.ok) (collection === 'people' ? elements.person : teamControls.get(id))?.focus();
  }
  function membership(id, direction = null, checked = false) {
    const view = editor.read();
    if (disposed || view.status !== 'editing' || !Array.isArray(view.draft?.raw.personIds)) return;
    const epoch = ++generation, ids = [...view.draft.raw.personIds], index = ids.indexOf(id);
    if (direction === null) {
      if (checked && index < 0) ids.push(id);
      else if (!checked && index >= 0) ids.splice(index, 1);
      else return;
    } else {
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= ids.length) return;
      [ids[index], ids[destination]] = [ids[destination], ids[index]];
    }
    const result = editor.setIds(view.draft.token, 'personIds', ids);
    changed(result, epoch, () => memberControls.get(id)?.checkbox.focus());
  }
  function recover(action) {
    const view = editor.read();
    if (!view.draft || disposed) return;
    const epoch = ++generation;
    const result = editor[action](view.draft.token, projection);
    changed(result, epoch, focusEditor);
  }
  function click(event) {
    const control = event.target.closest('button[data-assembly-action]');
    if (!control || !root.contains(control) || control.disabled || disposed) return;
    const action = control.dataset.assemblyAction, id = control.dataset.assemblyId;
    if (action === 'person-create' || action === 'team-create') { create(action === 'person-create' ? 'person.create' : 'team.create'); return; }
    if (action === 'team-open') { open(makeAssemblyTarget('team.update', id)); return; }
    if (action === 'team-remove' || action === 'person-remove') { open(makeAssemblyTarget(action === 'team-remove' ? 'team.remove' : 'person.remove', action === 'team-remove' ? id : selectedPerson)); return; }
    if (action === 'person-up' || action === 'person-down') { move('people', selectedPerson, action === 'person-up' ? -1 : 1); return; }
    if (action === 'team-up' || action === 'team-down') { move('teams', id, action === 'team-up' ? -1 : 1); return; }
    if (action === 'member-up' || action === 'member-down') { membership(id, action === 'member-up' ? -1 : 1); return; }
    if (action === 'cancel') { settle('cancel'); return; }
    if (['review', 'useCurrent', 'freshId'].includes(action)) { recover(action); return; }
    if (action === 'step' && !composing) {
      const view = editor.read(), field = control.dataset.assemblyField;
      if (!view.draft || !NUMBER_FIELDS.has(field)) return;
      changed(editor.step(view.draft.token, field, Number(control.dataset.step)), ++generation);
    }
  }
  function input(event) {
    const field = event.target.name;
    if (disposed || inputs[field] !== event.target) return;
    const view = editor.read();
    if (!view.draft) return;
    changed(editor.setText(view.draft.token, field, event.target.value), ++generation);
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation += 1;
    for (const release of cleanup) release();
    cleanup.length = 0;
    if (editing.read().active?.kind === 'assembly') editing.park();
    elements.fieldset.disabled = true; elements.configure.open = false;
    for (const control of root.querySelectorAll('[data-assembly-action]')) control.disabled = true;
    elements.person.disabled = true;
    delete root.dataset.assemblyReady;
    INSTANCES.delete(root);
  }
  const receiver = Object.freeze({ read: () => editor.read(), render, refresh: render, open, create, close,
    isOpen: () => !disposed && elements.configure.open,
    resume() {
      if (disposed) return;
      composing = false;
      if (selectedTarget !== null && elements.configure.open) open(selectedTarget, false);
      else render();
    }, dispose });
  try {
    for (const control of root.querySelectorAll('[data-assembly-action]')) control.disabled = false;
    listen(root, 'click', click);
    listen(elements.form, 'input', input);
    listen(elements.form, 'submit', event => { event.preventDefault(); settle('apply'); });
    listen(elements.form, 'compositionstart', () => { composing = true; });
    listen(elements.form, 'compositionend', event => { composing = false; input(event); });
    listen(elements.members, 'change', event => {
      const id = event.target.dataset.assemblyMember;
      if (memberControls.get(id)?.checkbox === event.target) membership(id, null, event.target.checked);
    });
    listen(elements.person, 'change', () => {
      if (people.has(elements.person.value)) { selectedPerson = elements.person.value; selectPersonControls(); }
    });
    listen(elements.configure.querySelector('summary'), 'click', event => {
      if (!disposed && !elements.configure.open && selectedTarget && canOpen()) {
        event.preventDefault(); open(selectedTarget, false);
      }
    });
    listen(elements.configure, 'toggle', () => {
      if (disposed) return;
      if (elements.configure.open) {
        if (isActive() && !acknowledgedOpen && selectedTarget) open(selectedTarget, false);
      } else if (acknowledgedOpen) { close(); onEditing(); }
    });
    render(); root.dataset.assemblyReady = 'true'; INSTANCES.set(root, receiver); return receiver;
  } catch (error) { dispose(); throw error; }
}
