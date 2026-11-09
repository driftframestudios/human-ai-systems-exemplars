import { listCapabilities, getCapabilityDefinition } from './capabilities.mjs';
import { capabilityForm, makeCapabilityTarget, describeCapabilityTarget } from './capability-draft.mjs';
import { money } from './display.mjs';
import { LIMITS } from './config.mjs';
import { createRackRecord } from './rack-record-creation.mjs';
import { createRackAddControl } from './rack-creation-controls.mjs';
import { revealStudioDestination } from './motion.mjs';
import { mountRackHeader, focusSubmitControl } from './rack-controls.mjs';

const INSTANCES = new WeakMap();
const COLLECTION = Object.freeze({ ability: 'abilities', practice: 'practices' });
const STAGES = Object.freeze({ proposed: 'Proposed', supported: 'Supported', rehearsed: 'Rehearsed', 'observed-in-context': 'Observed in context' });
const CHOICES = Object.freeze({ '': 'Keep the current observations', yes: 'Add a session', no: 'Use existing work only',
  allocated: 'Within funded time', additional: 'Extra investment', active: 'Active', retired: 'Retired', ...STAGES });
const SUPPORT_COLUMNS = Object.freeze([['responsibility', 'Responsibility'], ['preparation', 'Preparation'], ['review', 'Review'], ['observation', 'Observation']]);
let nextInstance = 0;

// Presentation owns one selected card and one mounted editor. All raw edits,
// accepted support, observations and investment retain their existing owners.
export function mountCapabilityPanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {},
  onAccepted = () => {}, onSourceWork = () => {}, isActive = () => true, canOpen = isActive }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, instance = `capability-${++nextInstance}`, cleanup = [];
  const find = name => {
    const node = root.querySelector(`[data-capability-${name}]`);
    if (!node) throw new TypeError(`Supply the capability ${name} element.`);
    return node;
  };
  const elements = Object.fromEntries(['selected', 'title', 'front', 'configure', 'summary', 'form', 'fields',
    'preview', 'dependencies', 'error', 'recovery', 'current', 'status'].map(name => [name, find(name)]));
  const actions = new Map([...root.querySelectorAll('[data-capability-action]')].map(node => [node.dataset.capabilityAction, node]));
  const catalogues = new Map(['ability', 'practice'].map(kind => [kind, root.querySelector(`[data-capability-catalogue="${kind}"]`)]));
  const rack = document.createElement('section'); rack.className = 'native-capability-rack'; rack.id = `${instance}-rack`; rack.setAttribute('aria-label', 'Selected ability or practice');
  elements.selected.before(rack); rack.append(elements.selected, elements.configure);
  const localHeader = mountRackHeader(rack, { title: 'Abilities', owner: 'Abilities',
    closeAttribute: 'data-ability-rack-close', applyAttribute: 'data-editor-apply',
    onClose: event => { event.stopPropagation(); closeLocal(); } });
  localHeader.close.dataset.capabilityAction = 'close';
  const editor = editing.capability;
  let disposed = false, generation = 0, composing = false, acknowledged = false, projection = null;
  let selection = null, target = null, builtTarget = null, builtProjection = null;
  let controls = new Map(), workGroups = new Map(), sequence = 0, observationGroup = null, peopleGroup = null, prerequisiteGroup = null;
  let sections = new Map(), sectionKeys = new Map(), selectedSection = 'context';
  let rename = null;
  const owns = epoch => !disposed && generation === epoch;
  function listen(node, event, handler) { node.addEventListener(event, handler); cleanup.push(() => node.removeEventListener(event, handler)); }
  function node(tag, content, className) {
    const item = document.createElement(tag); if (content !== undefined) item.textContent = content;
    if (className) item.className = className; return item;
  }
  function button(label, action) {
    const item = node('button', label); item.type = 'button'; item.dataset.capabilityAction = action;
    if (['select', 'support-cell', 'prerequisite', 'work'].includes(action)) item.classList.add('native-control--navigate');
    return item;
  }
  function announce(message) { if (!disposed) elements.status.textContent = message; }
  function investmentAmount(label, result) {
    const title = result.standing === 'priced' ? label : `Known ${label.toLowerCase()}`;
    return `${title}: ${money(result.knownCommitmentCents)}.`;
  }
  function definition() { return selection ? getCapabilityDefinition(selection.kind, selection.definitionId, selection.version) : null; }
  function record() { return selection?.id ? projection.state[COLLECTION[selection.kind]].find(row => row.id === selection.id) : null; }
  function summaryFor(kind, id, from = projection) { return from.capabilities?.[COLLECTION[kind]].find(row => row.instanceId === id) ?? null; }
  function selectDescriptor(descriptor) {
    selection = { kind: descriptor.kind, definitionId: descriptor.definition.id, version: descriptor.definition.version, id: descriptor.id };
    target = makeCapabilityTarget(descriptor.form, descriptor.id);
  }
  function supportCell(definition, row, summary, phase) {
    if (phase === 'responsibility') {
      const gaps = summary?.gaps.filter(gap => ['teamId', 'responsiblePersonIds', 'decisionOwnerPersonId'].includes(gap.field)) ?? [];
      const missing = gaps.some(gap => gap.code.endsWith('-needed'));
      const owner = projection.state.people.find(person => person.id === row?.decisionOwnerPersonId);
      const team = projection.state.teams.find(team => team.id === row?.teamId);
      return { state: !row ? 'available' : missing ? 'gap' : gaps.length ? 'attention' : 'linked',
        label: !row || missing ? 'Choose people' : gaps.length ? 'Review responsibility' : 'People assigned',
        detail: gaps[0]?.message ?? (row ? `${team?.label ?? 'Team to choose'} · ${owner?.label ?? 'Decision owner to choose'} decides` : 'Name the team, people and decision owner.') };
    }
    if (phase === 'observation') {
      const latest = projection.state.capabilityEvidence.find(item => item.id === summary?.evidenceIds.at(-1));
      return latest ? { state: 'recorded', label: `${STAGES[latest.stage]} recorded`, detail: latest.observation }
        : { state: row ? 'gap' : 'available', label: 'Explore an example', detail: 'Preview a walkthrough, recovery or decision result.' };
    }
    const requirements = definition.supportRequirements.filter(requirement => requirement.phase === phase);
    if (!requirements.length) return { state: 'unspecified', label: 'Not specified', detail: `This definition describes its other supporting work in the card.`, requirement: null };
    const readings = requirements.map(requirement => ({ requirement, reading: summary?.requirements.find(item => item.requirementId === requirement.id) }));
    const receiver = readings.find(({ reading }) => !reading?.complete) ?? readings[0];
    const workIds = [...new Set(readings.flatMap(({ reading }) => reading?.workIds ?? []))];
    const gaps = summary?.gaps.filter(gap => requirements.some(requirement => requirement.id === gap.requirementId)) ?? [];
    return { state: !row ? 'available' : !workIds.length ? 'gap' : gaps.length ? 'attention' : 'linked',
      label: !workIds.length ? 'Choose work' : gaps.length ? 'Review support' : 'Work linked',
      detail: gaps[0]?.message ?? (workIds.length ? workIds.map(id => projection.state.work.find(work => work.id === id)?.label ?? id).join(' · ') : receiver.requirement.description),
      requirement: receiver.requirement.id };
  }
  function renderCatalogues(next) {
    if (projection === next) return;
    projection = next;
    if (!selection) {
      const kind = next.state.abilities.length ? 'ability' : 'practice', first = next.state[COLLECTION[kind]][0];
      if (first) selection = { kind, id: first.id, definitionId: first.definitionId, version: first.definitionVersion };
    }
    for (const [kind, list] of catalogues) {
      const rows = next.state[COLLECTION[kind]], choices = [];
      for (const definition of listCapabilities(kind)) {
        const matching = rows.filter(row => row.definitionId === definition.id && row.definitionVersion === definition.version);
        choices.push(...(matching.length ? matching.map(row => ({ definition, row })) : [{ definition, row: null }]));
      }
      for (const row of rows) if (!choices.some(choice => choice.row?.id === row.id)) {
        choices.push({ definition: getCapabilityDefinition(kind, row.definitionId, row.definitionVersion), row });
      }
      const table = node('table'), head = node('thead'), heading = node('tr'), body = node('tbody');
      table.append(node('caption', `${kind === 'ability' ? 'Customer abilities' : 'Team practices'} · support in the accepted plan`));
      for (const label of [kind === 'ability' ? 'What people can do' : 'How the team works', ...SUPPORT_COLUMNS.map(([, label]) => label)]) {
        const cell = node('th', label); cell.scope = 'col'; heading.append(cell);
      }
      head.append(heading); table.append(head, body);
      for (const { definition, row } of choices) {
        const tr = node('tr'), title = node('th'), control = button('', 'select');
        title.scope = 'row'; control.classList.add('native-capabilities__choice');
        const identity = { capabilityKind: kind, capabilityDefinition: definition.id,
          capabilityVersion: definition.version, capabilityId: row?.id ?? '' };
        Object.assign(control.dataset, identity); Object.assign(tr.dataset, identity); tr.dataset.capabilityRow = '';
        control.append(node('strong', definition.action), node('span', row ? row.lifecycle === 'retired' ? 'Retired from the plan' : 'Included in this plan' : 'Available to plan'));
        title.append(control); tr.append(title);
        for (const [phase, label] of SUPPORT_COLUMNS) {
          const reading = supportCell(definition, row, row ? summaryFor(kind, row.id) : null, phase), cell = node('td');
          const item = reading.state === 'unspecified' ? node('span') : button('', 'support-cell');
          item.classList.add('native-capability__cell'); item.dataset.supportState = reading.state;
          Object.assign(item.dataset, identity, { capabilityPhase: phase });
          if (reading.requirement) item.dataset.capabilityRequirementTarget = reading.requirement;
          if (item.tagName === 'BUTTON') item.setAttribute('aria-label', `${definition.action} · ${label}: ${reading.label}. ${reading.detail}`);
          item.append(node('strong', reading.label, 'native-capability__cell-status'), node('span', reading.detail, 'native-capability__cell-detail'));
          cell.append(item); tr.append(cell);
        }
        body.append(tr);
      }
      list.replaceChildren(table);
    }
  }
  function section(title, content) {
    const region = node('section', undefined, 'native-capability__section');
    region.dataset.capabilitySection = title; region.append(node('h5', title));
    if (typeof content === 'string') region.append(node('p', content));
    else if (content) region.append(content);
    return region;
  }
  function renderCard() {
    const def = definition(), row = record();
    elements.selected.hidden = !def;
    actions.get('configure').disabled = !def;
    actions.get('remove').disabled = !row;
    if (!def) return;
    if (catalogues.get(selection.kind).nextElementSibling !== rack) catalogues.get(selection.kind).after(rack);
    elements.title.textContent = def.action;
    actions.get('configure').textContent = row ? 'Edit support' : `Plan this ${selection.kind}`;
    actions.get('configure').classList.toggle('native-control--create', !row);
    for (const control of root.querySelectorAll('[data-capability-action="select"]')) {
      const active = control.dataset.capabilityKind === selection.kind && control.dataset.capabilityDefinition === def.id
        && control.dataset.capabilityVersion === def.version && control.dataset.capabilityId === (row?.id ?? '');
      control.setAttribute('aria-pressed', String(active)); control.setAttribute('aria-expanded', String(active)); control.setAttribute('aria-controls', rack.id);
    }
    for (const item of root.querySelectorAll('[data-capability-row]')) item.dataset.selected = String(
      item.dataset.capabilityKind === selection.kind && item.dataset.capabilityDefinition === def.id
      && item.dataset.capabilityVersion === def.version && item.dataset.capabilityId === (row?.id ?? ''));
    elements.front.replaceChildren(node('p', def.explanation));
  }
  function options(source, selected = []) {
    const rows = source === 'capabilities' ? ['ability', 'practice'].flatMap(kind => projection.state[COLLECTION[kind]].map(row =>
      [`${kind}/${row.id}`, `${getCapabilityDefinition(kind, row.definitionId, row.definitionVersion).action} · ${row.id}${row.lifecycle === 'retired' ? ' · retired' : ''}`]))
      : projection.state[source].map(row => [row.id, `${row.label}${row.lifecycle === 'retired' ? ' · retired' : ''}`]);
    const known = new Set(rows.map(([id]) => id));
    for (const id of selected) if (id && !known.has(id)) rows.push([id, `${id} · removed; clear or replace this choice`]);
    return rows;
  }
  function field(parent, key, metadata, raw) {
    const checkboxes = metadata.kind === 'ids';
    const radios = ['teamId', 'decisionOwnerPersonId', 'lifecycle'].includes(key);
    const choices = checkboxes || radios;
    const group = node(choices ? 'fieldset' : 'div', undefined, `native-capability__field${metadata.numeric ? ' native-capability__field--numeric' : ''}`), label = node(choices ? 'legend' : 'label', metadata.label);
    const tag = choices ? 'ul' : metadata.source || metadata.choices ? 'select' : metadata.maxLength > 120 ? 'textarea' : 'input';
    const input = document.createElement(tag);
    input.id = `${instance}-field-${++sequence}`; input.name = key; label.htmlFor = input.id; input.dataset.capabilityField = key;
    if (choices) {
      input.className = 'native-capability__choices';
      input.tabIndex = -1;
      const values = metadata.choices ? metadata.choices.map(value => [value, CHOICES[value] ?? value])
        : [...(radios ? [['', 'Unassigned']] : []), ...options(metadata.source, checkboxes ? raw : [raw])];
      for (const [value, text] of values) {
        const item = node('li'), choice = node('label'), check = document.createElement('input');
        check.type = radios ? 'radio' : 'checkbox'; check.name = `${instance}-${key}`; check.value = value; check.dataset.capabilityField = key;
        check.dataset.capabilityChoice = value; check.setAttribute('aria-describedby', input.id + '-error');
        choice.append(check, node('span', text)); item.append(choice); input.append(item);
        if (['teamId', 'responsiblePersonIds', 'decisionOwnerPersonId'].includes(key)
          && projection.state[metadata.source].some(record => record.id === value)) {
          const edit = button('Rename', 'rename'); edit.className = 'native-capability__rename-key';
          Object.assign(edit.dataset, { capabilityRenameField: key, capabilityRenameId: value });
          edit.setAttribute('aria-label', `Rename ${text}`); edit.setAttribute('aria-expanded', 'false');
          item.classList.add('native-capability__identity'); item.append(edit);
        }
      }
      if (!input.children.length) input.append(node('li', 'Add a working session to choose support.'));
    } else if (input.tagName === 'SELECT') {
      const choices = metadata.choices ? metadata.choices.map(value => [value, CHOICES[value] ?? value])
        : [...(metadata.kind === 'ids' ? [] : [['', 'Choose when known']]), ...options(metadata.source, metadata.kind === 'ids' ? raw : [raw])];
      for (const [value, text] of choices) { const option = node('option', text); option.value = value; input.append(option); }
    } else {
      input.maxLength = metadata.maxLength; input.autocomplete = 'off';
      if (input.tagName === 'TEXTAREA') input.rows = 3;
      if (input.tagName === 'INPUT') input.type = 'text';
      if (metadata.numeric) { input.inputMode = 'numeric'; input.spellcheck = false; }
    }
    const error = node('p', '', 'native-coordination__error'); error.id = input.id + '-error';
    input.setAttribute('aria-describedby', error.id); group.append(label, input);
    if (metadata.numeric) {
      const steps = node('div', undefined, 'native-coordination__actions native-capability__steps');
      for (const [direction, label] of [[-1, 'Decrease'], [1, 'Increase']]) {
        const control = button(direction < 0 ? '−' : '+', 'step'); control.dataset.capabilityField = key; control.dataset.capabilityStep = String(direction);
        control.setAttribute('aria-label', `${label} ${metadata.label.toLowerCase()}`); steps.append(control);
      }
      group.append(steps);
    }
    if (['people', 'teams', 'work'].includes(metadata.source)) {
      const type = { people: 'person', teams: 'team', work: 'session' }[metadata.source];
      const label = `Add ${type === 'person' ? 'a person' : type === 'team' ? 'a team' : 'a working session'}`;
      group.append(createRackAddControl(document, { label, text: label, className: 'studio-rack-create-zone--persistent',
        dataset: { capabilityAction: 'add-record', capabilityRecordKind: type, capabilityReceiverField: key } }));
    }
    group.append(error); parent.append(group); controls.set(key, { input, error, metadata, checkboxes, radios });
  }
  function buildFields(descriptor, raw) {
    controls = new Map(); workGroups = new Map(); sections = new Map(); sectionKeys = new Map(); observationGroup = null; peopleGroup = null; prerequisiteGroup = null; elements.fields.replaceChildren();
    if (!descriptor || descriptor.mode === 'remove') {
      if (descriptor) elements.fields.append(node('p', 'Remove this instance? Its separately owned working sessions and funding remain in the plan.'));
      return;
    }
    const rail = node('div', undefined, 'native-capability-pad-rail'); rail.setAttribute('role', 'group'); rail.setAttribute('aria-label', 'Inspect support'); elements.fields.append(rail);
    function register(key, label, region) {
      const pad = button(label, 'inspect-section'); pad.dataset.capabilitySectionKey = key; pad.setAttribute('aria-controls', `${instance}-section-${key}`);
      region.id = `${instance}-section-${key}`; sections.set(key, region); sectionKeys.set(key, pad); rail.append(pad);
    }
    const basics = section('Use in this plan'); basics.classList.add('native-capability__outcome'); elements.fields.append(basics); register('context', 'Outcome', basics);
    field(basics, 'context', descriptor.fields.context, raw.context);
    basics.append(section('What to look for', descriptor.definition.acceptanceJob));
    peopleGroup = node('section', undefined, 'native-capability__section'); peopleGroup.dataset.capabilityPeople = '';
    peopleGroup.append(node('h5')); elements.fields.append(peopleGroup);
    register('responsibility', 'People', peopleGroup);
    for (const keys of [['teamId', 'responsiblePersonIds'], ['decisionOwnerPersonId', 'lifecycle']]) {
      const half = node('div', undefined, 'native-capability__half-rack');
      for (const key of keys) field(half, key, descriptor.fields[key], raw[key]);
      peopleGroup.append(half);
    }
    const prerequisites = section('Supporting abilities and practices');
    field(prerequisites, 'prerequisites', descriptor.fields.prerequisites, raw.prerequisites); elements.fields.append(prerequisites); prerequisiteGroup = prerequisites; register('prerequisites', 'Before this', prerequisites);
    for (const requirement of descriptor.definition.supportRequirements) {
      const group = section(requirement.label, requirement.description); group.dataset.capabilityRequirement = requirement.id;
      const supportKey = `support.${requirement.id}`, prefix = `new.${requirement.id}.`;
      const linked = node('div', undefined, 'native-capability__linked-work');
      group.append(linked);
      const work = node('div', undefined, 'native-capability__half-rack');
      field(work, supportKey, descriptor.fields[supportKey], raw[supportKey]);
      field(work, prefix + 'enabled', descriptor.fields[prefix + 'enabled'], raw[prefix + 'enabled']);
      const newWork = node('div', undefined, 'native-capability__new-work');
      for (const [key, metadata] of Object.entries(descriptor.fields)) if (key.startsWith(prefix) && !key.endsWith('.enabled')) field(newWork, key, metadata, raw[key]);
      group.append(work, newWork); elements.fields.append(group); workGroups.set(requirement.id, { group, newWork, linked });
      const phaseLabel = { preparation: 'Prepare', coordination: 'Handoff', review: 'Review', maintenance: 'Maintain' }[requirement.phase] ?? requirement.label;
      register(requirement.id, phaseLabel, group);
    }
    const examples = section('Example results'); examples.dataset.capabilityExamples = '';
    examples.append(node('p', 'Illustrative walkthroughs · choose a result to explore.'));
    const pads = node('div', undefined, 'native-capability-example-pads');
    for (const [key, label] of [['walkthrough', 'Routine walkthrough'], ['recovery', 'Recover a handoff'], ['decision', 'Ready for review']]) {
      const pad = button(label, 'example'); pad.dataset.capabilityExample = key; pad.setAttribute('aria-pressed', 'false'); pads.append(pad);
    }
    observationGroup = node('div', undefined, 'native-capability-example-reading'); observationGroup.setAttribute('aria-live', 'polite');
    examples.append(pads, observationGroup); elements.fields.append(examples); register('observation', 'Example result', examples);
    showExample('walkthrough'); showSection(sections.has(selectedSection) ? selectedSection : 'context');
  }
  function showExample(key) {
    const def = definition(); if (!def || !observationGroup) return;
    const readings = {
      walkthrough: ['Routine walkthrough', `The team explores how to ${def.action.toLowerCase()} using the service-request pilot.`, def.acceptanceJob],
      recovery: ['Recover a handoff', 'A receiving team finds a missing detail. The team rehearses a correction and makes the next action clear.', 'Compare the recovered route with the original handoff.'],
      decision: ['Ready for review', 'The decision owner reviews the prepared work and names the next useful step.', def.acceptanceJob],
    };
    observationGroup.replaceChildren(node('strong', readings[key][0]), node('p', readings[key][1]), node('p', readings[key][2]));
    elements.fields.querySelectorAll('[data-capability-example]').forEach(pad => pad.setAttribute('aria-pressed', String(pad.dataset.capabilityExample === key)));
  }
  function showSection(key) {
    if (!sections.has(key)) return;
    selectedSection = key;
    for (const [id, region] of sections) { region.hidden = id !== key; }
    for (const [id, pad] of sectionKeys) { pad.setAttribute('aria-pressed', String(id === key)); pad.setAttribute('aria-expanded', String(id === key)); }
  }
  function revealField(key) {
    const input = controls.get(key)?.input;
    if (!input) return;
    const section = [...sections].find(([, region]) => region.contains(input));
    if (section) showSection(section[0]);
  }

  function render() {
    const view = editor.read(); if (disposed) return view;
    renderCatalogues(view.projection);
    if (view.draft && view.draft.capabilityId === target) selectDescriptor(describeCapabilityTarget(target));
    renderCard();
    const draft = view.draft?.capabilityId === target ? view.draft : null, descriptor = draft ? describeCapabilityTarget(target) : null;
    if (builtTarget !== (draft?.capabilityId ?? null) || builtProjection !== projection) {
      closeRename();
      builtTarget = draft?.capabilityId ?? null; builtProjection = projection; buildFields(descriptor, draft?.raw);
    }
    root.dataset.capabilityState = draft ? view.status : 'idle';
    rack.dataset.editing = String(Boolean(draft));
    localHeader.element.hidden = !draft;
    localHeader.update({ title: definition()?.action ?? 'Abilities',
      owner: selection?.kind === 'practice' ? 'How the team works' : 'What people can do',
      source: draft ? actions.get('apply') : null });
    elements.configure.hidden = !draft; actions.get('configure').hidden = Boolean(draft && elements.configure.open); elements.fields.disabled = !draft || view.status !== 'editing';
    elements.recovery.hidden = !draft || !['stale', 'parked'].includes(view.status);
    elements.current.textContent = view.creationConflict ? 'This identifier is already in the plan. Keep your entries and choose a new identifier.'
      : 'Review these saved entries against the current plan, or use its current values.';
    actions.get('fresh-id').hidden = !view.creationConflict;
    for (const action of ['review', 'current', 'discard', 'fresh-id']) actions.get(action).disabled = !draft;
    actions.get('apply').disabled = !draft || view.status !== 'editing'; actions.get('cancel').disabled = !draft;

    if (draft) {
      elements.summary.textContent = `${descriptor.mode === 'remove' ? 'Remove' : 'Settings'} · ${descriptor.definition.action}`;
      for (const [key, control] of controls) {
        const raw = draft.raw[key];
        if (control.checkboxes || control.radios) for (const check of control.input.querySelectorAll('input')) check.checked = control.radios ? raw === check.value : raw.includes(check.value);
        else if (control.metadata.kind === 'ids') for (const option of control.input.options) option.selected = raw.includes(option.value);
        else if (control.input.value !== raw) control.input.value = raw;
        const error = draft.errors.find(item => item.path === `draft.${key}`);
        control.input.setAttribute('aria-invalid', String(Boolean(error))); control.error.textContent = error?.message ?? '';
      }
      if (peopleGroup) {
        const team = projection.state.teams.find(row => row.id === draft.raw.teamId)?.label;
        const owner = projection.state.people.find(row => row.id === draft.raw.decisionOwnerPersonId)?.label;
        peopleGroup.querySelector('h5').textContent = `People and responsibility · ${[team, owner ? `${owner} decides` : 'Choose who decides'].filter(Boolean).join(' · ')}`;
      }
      if (prerequisiteGroup) {
        const selected = new Map(options('capabilities', draft.raw.prerequisites));
        prerequisiteGroup.querySelector('h5').textContent = `Prerequisites · ${draft.raw.prerequisites.map(id => selected.get(id)).join(', ') || (descriptor.definition.prerequisiteDefinitions.length ? 'Choose the supporting abilities and practices' : 'Ready to plan directly')}`;
      }
      for (const [id, { group, newWork, linked }] of workGroups) {
        newWork.hidden = draft.raw[`new.${id}.enabled`] !== 'yes';
        const selectedIds = draft.raw[`support.${id}`];
        linked.replaceChildren(...selectedIds.map(workId => {
          const work = projection.state.work.find(work => work.id === workId);
          const control = button(`Open ${work?.label ?? workId}`, 'work'); control.dataset.capabilityWork = workId; return control;
        }));
        const selectedNames = selectedIds.slice(0, 2).map(workId => projection.state.work.find(work => work.id === workId)?.label ?? workId);
        if (selectedIds.length > 2) selectedNames.push(`${selectedIds.length - 2} more selected`);
        if (!newWork.hidden) selectedNames.push(`Add ${draft.raw[`new.${id}.label`].trim() || 'a named session'}`);
        group.querySelector('h5').textContent = `${descriptor.definition.supportRequirements.find(item => item.id === id).label} · ${selectedNames.join(', ') || 'Choose supporting work'}`;
      }

    }
    const preview = draft && view.status === 'editing' && !composing ? editor.preview(draft.token) : null;
    if (disposed) return view;
    const error = view.error ?? (preview && !preview.ok ? preview.error : null);
    elements.error.textContent = error?.message ?? '';
    elements.dependencies.hidden = !error?.references?.length;
    elements.dependencies.replaceChildren(...(error?.references ?? []).map(ref => {
      if (ref.collection !== 'changeSettings') return node('li', `${ref.collection ?? ref.kind}: ${ref.id ?? ref.instanceId}`);
      const item = node('li'), link = node('a', 'Review this card’s links in Change');
      link.href = '#native-studio-change'; link.classList.add('native-control--navigate'); link.dataset.nativeOpenChange = ''; item.append(link); return item;
    }));
    if (preview?.ok) {
      const needsRates = preview.projection.result.plannedCommitmentCents === null || projection.result.plannedCommitmentCents === null;
      elements.preview.textContent = `${investmentAmount('Proposed investment', preview.projection.result)} ${investmentAmount('Accepted investment', projection.result)}${needsRates ? ' Add missing hourly rates in People to complete the amounts.' : ''} Apply accepts this proposal together.`;
    } else {
      elements.preview.textContent = draft ? 'Correct the entries to inspect this proposal. The accepted plan stays available.' : 'Choose a card to inspect a proposal.';
    }
    return view;
  }
  function focusEditor() {
    const view = editor.read(), region = sections.get(selectedSection);
    const first = [...controls.values()].find(control => region?.contains(control.input))?.input;
    (view.status === 'stale' ? actions.get('review') : first ?? sectionKeys.get(selectedSection) ?? actions.get('cancel')).focus({ preventScroll: true });
    revealStudioDestination(elements.configure);
  }
  function opened(result, epoch, focus) {
    if (!owns(epoch)) return result;
    if (result.view.draft) selectDescriptor(describeCapabilityTarget(result.view.draft.capabilityId));
    composing = false; render();
    if (!owns(epoch)) return result;
    acknowledged = Boolean(result.view.draft); elements.configure.open = acknowledged; actions.get('configure').hidden = acknowledged;
    announce(result.ok ? '' : result.error.message); const token = editor.read().draft?.token;
    onEditing(); if (owns(epoch) && editor.read().draft?.token === token && focus) focusEditor();
    return result;
  }
  function open(next, focus = true) {
    if (disposed || !canOpen()) return;
    const epoch = ++generation; onBegin(); if (!owns(epoch)) return;
    return opened(editor.begin(next, studio.read()), epoch, focus);
  }
  function create(kind, definitionId, version = '1.0.0', focus = true) {
    if (disposed || !canOpen()) return;
    const epoch = ++generation; onBegin(); if (!owns(epoch)) return;
    return opened(editor.create(capabilityForm(kind, 'create', definitionId, version), studio.read()), epoch, focus);
  }
  function close({ park = true } = {}) {
    if (disposed) return; ++generation; acknowledged = false; composing = false;
    closeRename();
    if (park && editing.read().active?.kind === 'capability') editing.park();
    elements.configure.open = false;
  }
  function changed(result, epoch) {
    if (!owns(epoch)) return; render(); if (!owns(epoch)) return;
    announce(result.ok ? '' : result.error.message); onEditing();
  }
  function settle(method) {
    const view = editor.read(); if (disposed || !view.draft) return;
    if (composing && method === 'apply') { announce('Finish entering the text, then apply.'); return; }
    const descriptor = describeCapabilityTarget(view.draft.capabilityId), epoch = ++generation;
    const result = editor[method](view.draft.token);
    if (!owns(epoch)) return;
    if (!result.ok) { changed(result, epoch); return; }
    if (method === 'cancel') {
      close({ park: false }); target = null; render(); announce('Changes cancelled.'); onEditing(); actions.get('configure').focus(); return;
    }
    const accepted = result.projection ?? studio.read(); onAccepted(accepted);
    if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return;
    if (descriptor.mode === 'remove') {
      selection.id = null; target = null; close({ park: false }); render(); onEditing(); announce('Instance removed. Its working sessions remain in the plan.'); actions.get('configure').focus(); return;
    }
    const next = editor.begin(makeCapabilityTarget(capabilityForm(descriptor.kind, 'update', descriptor.definition.id, descriptor.definition.version), descriptor.id), accepted);
    opened(next, epoch, false); if (!owns(epoch)) return;
    announce(`Proposal applied. ${investmentAmount('Accepted investment', accepted.result)}${accepted.result.plannedCommitmentCents === null ? ' Add missing hourly rates in People to complete the amount.' : ''}`); focusSubmitControl(actions.get('apply'));
  }
  function addRecord(control) {
    const view = editor.read(), key = control.dataset.capabilityReceiverField;
    if (!view.draft || view.status !== 'editing' || !controls.has(key)) return;
    const beforeTarget = target, section = selectedSection, epoch = ++generation;
    const result = createRackRecord(studio, editing, control.dataset.capabilityRecordKind);
    if (!owns(epoch)) return;
    if (!result.ok) { render(); announce(result.error.message); return; }
    const held = editor.read();
    if (held.draft?.capabilityId !== beforeTarget) return;
    const resumed = editor.review(held.draft.token, result.projection);
    if (!resumed.ok) { render(); announce(resumed.error.message); onAccepted(result.projection); return; }
    const token = resumed.view.draft.token, metadata = describeCapabilityTarget(beforeTarget).fields[key];
    const changed = metadata.kind === 'ids'
      ? editor.setIds(token, key, [...resumed.view.draft.raw[key], result.id])
      : editor.setText(token, key, result.id);
    onAccepted(result.projection); if (!owns(epoch)) return;
    opened(changed, epoch, false); showSection(section);
    const added = controls.get(key)?.input;
    (added?.querySelector(`input[value="${result.id}"]`) ?? added)?.focus({ preventScroll: true });
    announce(`${control.dataset.capabilityRecordKind === 'person' ? 'Person' : control.dataset.capabilityRecordKind === 'team' ? 'Team' : 'Session'} added. Apply to keep this support selection.`);
  }
  function closeRename(focus = false) {
    if (!rename) return;
    const { element, trigger } = rename; rename = null;
    element.remove(); trigger.setAttribute('aria-expanded', 'false'); trigger.removeAttribute('aria-controls');
    if (focus && trigger.isConnected) trigger.focus({ preventScroll: true });
  }
  function beginRename(trigger) {
    const view = editor.read(), key = trigger.dataset.capabilityRenameField, id = trigger.dataset.capabilityRenameId;
    if (!view.draft || view.status !== 'editing') return;
    if (rename?.trigger === trigger) { closeRename(true); return; }
    closeRename();
    const control = controls.get(key), source = control?.metadata.source;
    const record = view.projection.state[source]?.find(row => row.id === id); if (!record) return;
    const element = node('div', undefined, 'native-capability__rename'), input = node('input');
    element.id = `${instance}-rename`; input.id = `${instance}-rename-name`; input.type = 'text';
    input.maxLength = LIMITS.label; input.value = record.label; input.autocomplete = 'off'; input.dataset.capabilityRenameName = '';
    const label = node('label', source === 'teams' ? 'Team name' : 'Person name'); label.htmlFor = input.id;
    const error = node('p', '', 'native-coordination__error'); error.id = `${instance}-rename-error`; error.setAttribute('role', 'status');
    const note = node('p', 'Updates this name throughout the plan.'); note.id = `${instance}-rename-note`;
    input.setAttribute('aria-describedby', `${note.id} ${error.id}`);
    const actions = node('div', undefined, 'native-coordination__actions');
    const save = button('Save name', 'save-name'), cancel = button('Cancel', 'cancel-name'); cancel.className = 'native-control--cancel';
    actions.append(save, cancel); element.append(label, input, note, error, actions); control.input.after(element);
    trigger.setAttribute('aria-expanded', 'true'); trigger.setAttribute('aria-controls', element.id);
    rename = { element, input, error, trigger, key, id, source, token: view.draft.token, base: view.projection };
    input.focus({ preventScroll: true }); input.select();
  }
  function saveName() {
    if (!rename || disposed || !isActive() || composing) return;
    const held = rename, view = editor.read();
    if (view.status !== 'editing' || view.draft?.token !== held.token || studio.read() !== held.base) {
      held.error.textContent = 'Review the current plan before renaming.'; return;
    }
    const label = held.input.value.trim();
    if (!label) { held.error.textContent = 'Enter a name.'; held.input.setAttribute('aria-invalid', 'true'); held.input.focus(); return; }
    const record = held.base.state[held.source].find(row => row.id === held.id), epoch = ++generation;
    const result = held.source === 'people'
      ? studio.updatePerson(held.id, { ...record, label }, held.base)
      : studio.applyCommand({ type: 'team.update', teamId: held.id, team: { ...record, label } }, held.base);
    if (!owns(epoch)) return;
    if (!result.ok) { held.error.textContent = result.error.message; held.input.setAttribute('aria-invalid', 'true'); return; }
    closeRename();
    // A rename accepts one canonical record. Rebase the held support proposal's
    // raw fields onto that projection without accepting its assignments.
    const resumed = editor.review(held.token, result.projection);
    onAccepted(result.projection); if (!owns(epoch)) return;
    opened(resumed, epoch, false); showSection('responsibility');
    const trigger = [...controls.get(held.key).input.querySelectorAll('[data-capability-action="rename"]')]
      .find(control => control.dataset.capabilityRenameId === held.id);
    trigger?.focus({ preventScroll: true });
    announce(resumed.ok ? `${label} saved. Support selections remain in this proposal.` : resumed.error.message);
  }
  function showSupport(kind, id) {
    const row = studio.read().state[COLLECTION[kind]]?.find(row => row.id === id); if (!row) return;
    const result = open(makeCapabilityTarget(capabilityForm(kind, 'update', row.definitionId, row.definitionVersion), id), false);
    showSection('responsibility'); sectionKeys.get('responsibility')?.focus(); return result;
  }
  function selectCard(control) {
    const { capabilityKind: kind, capabilityDefinition: id, capabilityVersion: version, capabilityId: instanceId } = control.dataset;
    if (instanceId) return open(makeCapabilityTarget(capabilityForm(kind, 'update', id, version), instanceId), false);
    const held = editing.read(), targets = [held.active?.kind === 'capability' ? held.active.targetId : null,
      ...held.parked.filter(row => row.kind === 'capability').map(row => row.targetId)].filter(Boolean);
    const saved = targets.find(target => {
      const descriptor = describeCapabilityTarget(target);
      return descriptor?.mode === 'create' && descriptor.kind === kind && descriptor.definition.id === id && descriptor.definition.version === version;
    });
    if (saved) return open(saved, false);
    return create(kind, id, version, false);
  }
  function inspectSupport(control) {
    const result = selectCard(control), current = editor.read();
    if (disposed || !result?.view.draft || result.view.draft.token !== current.draft?.token
      || editing.read().active && editing.read().active.kind !== 'capability') return;
    if (current.status !== 'editing') { focusEditor(); return; }
    const phase = control.dataset.capabilityPhase;
    const key = phase === 'responsibility' ? 'responsibility' : phase === 'observation' ? 'observation' : control.dataset.capabilityRequirementTarget;
    showSection(key);
    const focus = phase === 'observation' ? elements.fields.querySelector('[data-capability-example]') : controls.get(phase === 'responsibility' ? 'teamId' : `support.${key}`)?.input;
    focus?.focus({ preventScroll: true }); revealStudioDestination(elements.configure);
  }
  function closeLocal() {
    if (disposed || !isActive()) return;
      close(); const epoch = generation; render(); onEditing();
      if (!owns(epoch) || !selection) return;
      catalogues.get(selection.kind).querySelector(`[data-capability-action="select"][data-capability-definition="${selection.definitionId}"]`)?.focus({ preventScroll: true });
  }
  listen(root, 'click', event => {
    const control = event.target.closest('[data-capability-action]'); if (!control || !root.contains(control) || disposed || !isActive()) return;
    const action = control.dataset.capabilityAction;
    if (action === 'apply') return;
    if (action === 'add-record') { addRecord(control); return; }
    if (action === 'rename') { beginRename(control); return; }
    if (action === 'save-name') { saveName(); return; }
    if (action === 'cancel-name') { closeRename(true); return; }
    if (action === 'close') { closeLocal(); return; }
    if (action === 'select') { selectedSection = 'context'; selectCard(control); showSection('context'); elements.title.tabIndex = -1; elements.title.focus({ preventScroll: true }); revealStudioDestination(rack); return; }
    if (action === 'inspect-section') { showSection(control.dataset.capabilitySectionKey); return; }
    if (action === 'example') { showExample(control.dataset.capabilityExample); return; }
    if (action === 'support-cell') { inspectSupport(control); return; }
    if (action === 'configure' && selection) {
      const result = selectCard({ dataset: { capabilityKind: selection.kind, capabilityDefinition: selection.definitionId,
        capabilityVersion: selection.version, capabilityId: record()?.id ?? '' } });
      if (result?.view.draft?.token === editor.read().draft?.token && editing.read().active?.kind === 'capability') focusEditor();
      return;
    }
    if (action === 'remove' && record()) { open(makeCapabilityTarget(capabilityForm(selection.kind, 'remove', selection.definitionId, selection.version), selection.id)); return; }
    if (action === 'work') {
      const row = record(), origin = target ?? (row ? makeCapabilityTarget(capabilityForm(selection.kind, 'update', row.definitionId, row.definitionVersion), row.id) : null);
      onSourceWork(control.dataset.capabilityWork, { targetId: origin }); return;
    }
    if (action === 'prerequisite') { selectCard(control); return; }
    if (action === 'cancel' || action === 'discard') { settle('cancel'); return; }
    const view = editor.read(); if (!view.draft) return;
    const epoch = ++generation;
    if (action === 'step') changed(editor.step(view.draft.token, control.dataset.capabilityField, Number(control.dataset.capabilityStep)), epoch);
    if (['review', 'current', 'fresh-id'].includes(action)) {
      const method = { review: 'review', current: 'useCurrent', 'fresh-id': 'freshId' }[action];
      opened(editor[method](view.draft.token, studio.read()), epoch, true);
    }
  });
  function input(event) {
    const key = event.target.dataset.capabilityField, control = controls.get(key), view = editor.read();
    if (disposed || !isActive() || !control || (control.checkboxes || control.radios ? !control.input.contains(event.target) : control.input !== event.target) || !view.draft || view.status !== 'editing') return;
    if (control.checkboxes || control.radios ? event.type !== 'change' : event.type === 'input' && event.target.tagName === 'SELECT' || event.type === 'change' && event.target.tagName !== 'SELECT') return;
    const epoch = ++generation;
    if (control.metadata.kind === 'ids') {
      const chosen = new Set([...(control.checkboxes ? control.input.querySelectorAll('input:checked') : control.input.selectedOptions)].map(option => option.value));
      const ordered = [...view.draft.raw[key].filter(id => chosen.has(id)), ...chosen].filter((id, index, ids) => ids.indexOf(id) === index);
      changed(editor.setIds(view.draft.token, key, ordered), epoch);
    } else changed(editor.setText(view.draft.token, key, control.radios ? event.target.value : control.input.value), epoch);
  }
  listen(elements.form, 'input', input); listen(elements.form, 'change', input);
  listen(elements.form, 'keydown', event => {
    if (!rename?.element.contains(event.target) || event.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRename(true); }
    if (event.key === 'Enter' && event.target === rename?.input) { event.preventDefault(); event.stopPropagation(); saveName(); }
  });
  listen(elements.form, 'submit', event => { event.preventDefault(); if (!disposed && isActive()) settle('apply'); });
  listen(elements.form, 'compositionstart', () => { composing = true; });
  // Some engines finish composition before delivering the final input event.
  // Capture the completed value before rendering its owned draft back to DOM.
  listen(elements.form, 'compositionend', event => { composing = false; input(event); });
  listen(elements.configure, 'toggle', () => {
    if (disposed || elements.configure.open === acknowledged) return;
    acknowledged = elements.configure.open;
    if (!acknowledged) { if (editing.read().active?.kind === 'capability') editing.park(); onEditing(); render(); }
    else if (canOpen() && target) open(target, false);
  });
  function dispose() {
    if (disposed) return;
    close(); disposed = true; ++generation; cleanup.splice(0).forEach(release => release());
    elements.fields.disabled = true; for (const control of actions.values()) control.disabled = true;
    localHeader.dispose(); root.append(elements.selected, elements.configure); rack.remove();
    INSTANCES.delete(root); projection = null; controls.clear(); workGroups.clear();
  }
  render();
  const controller = Object.freeze({ refresh: render, open, create, showSupport, revealField, selectedTarget: () => target,
    close, resume: () => target ? open(target, false) : render(), dispose });
  INSTANCES.set(root, controller); return controller;
}
