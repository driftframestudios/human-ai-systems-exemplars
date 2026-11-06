import { listCapabilities, getCapabilityDefinition } from './capabilities.mjs';
import { capabilityForm, makeCapabilityTarget, describeCapabilityTarget } from './capability-draft.mjs';
import { money, duration } from './display.mjs';

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
  const elements = Object.fromEntries(['selected', 'title', 'front', 'reverse', 'configure', 'summary', 'form', 'fields',
    'preview', 'dependencies', 'error', 'recovery', 'current', 'status', 'manual-body'].map(name => [name, find(name)]));
  const actions = new Map([...root.querySelectorAll('[data-capability-action]')].map(node => [node.dataset.capabilityAction, node]));
  const catalogues = new Map(['ability', 'practice'].map(kind => [kind, root.querySelector(`[data-capability-catalogue="${kind}"]`)]));
  const editor = editing.capability;
  let disposed = false, generation = 0, composing = false, acknowledged = false, projection = null;
  let selection = null, target = null, reversed = false, beside = false, builtTarget = null, builtProjection = null;
  let controls = new Map(), workGroups = new Map(), sequence = 0, observationGroup = null, peopleGroup = null, prerequisiteGroup = null;
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
        : { state: row ? 'gap' : 'available', label: 'Add when available', detail: 'Record what people observed and where it applies.' };
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
      const pads = node('div', undefined, 'native-capabilities__pads');
      for (const { definition, row } of choices) {
        const control = button('', 'select'); control.classList.add('native-capabilities__choice');
        Object.assign(control.dataset, { capabilityKind: kind, capabilityDefinition: definition.id,
          capabilityVersion: definition.version, capabilityId: row?.id ?? '' });
        control.append(node('strong', definition.action), node('span', row ? row.lifecycle === 'retired' ? 'Retired from the plan' : 'Included in this plan' : 'Available to plan'));
        pads.append(control);
      }
      list.classList.remove('native-capabilities__sequence');
      list.removeAttribute('tabindex'); list.removeAttribute('role'); list.removeAttribute('aria-label');
      list.replaceChildren(pads);
    }
  }
  function section(title, content, preview = null) {
    const region = node(preview === null ? 'section' : 'details', undefined, 'native-capability__section');
    region.dataset.capabilitySection = title;
    region.append(node(preview === null ? 'h5' : 'summary', preview === null ? title : `${title} · ${preview}`));
    if (typeof content === 'string') region.append(node('p', content));
    else if (content) region.append(content);
    return region;
  }
  function renderCard() {
    const expanded = new Set([...elements.reverse.querySelectorAll('details[open]')].map(item => item.dataset.capabilitySection));
    const def = definition(), row = record(), summary = row ? summaryFor(selection.kind, row.id) : null;
    const openDraft = editor.read().draft;
    const proposal = !row && openDraft?.capabilityId === target ? openDraft : null;
    elements.selected.hidden = !def;
    for (const key of ['reverse', 'beside', 'configure']) actions.get(key).disabled = !def;
    actions.get('remove').disabled = !row;
    if (!def) return;
    elements.title.textContent = def.action;
    elements.selected.dataset.capabilityLayout = beside ? 'beside' : 'single';
    elements.front.hidden = reversed && !beside; elements.reverse.hidden = !reversed && !beside;
    actions.get('reverse').textContent = reversed || beside ? 'Return to overview' : 'Inspect reverse';
    actions.get('reverse').setAttribute('aria-expanded', String(reversed || beside));
    actions.get('beside').setAttribute('aria-pressed', String(beside));
    actions.get('beside').textContent = beside ? 'Use one reading' : 'Open beside';
    actions.get('configure').textContent = row ? 'Edit support' : `Plan this ${selection.kind}`;
    actions.get('configure').classList.toggle('native-control--create', !row);
    for (const control of root.querySelectorAll('[data-capability-action="select"]')) control.setAttribute('aria-pressed', String(
      control.dataset.capabilityKind === selection.kind && control.dataset.capabilityDefinition === def.id
      && control.dataset.capabilityVersion === def.version && control.dataset.capabilityId === (row?.id ?? '')));
    const overview = [node('p', def.explanation)];
    const context = row?.context ?? proposal?.raw.context.trim();
    if (context) overview.push(node('p', context));
    const support = node('div', undefined, 'native-capability__support-pads');
    support.setAttribute('role', 'group'); support.setAttribute('aria-label', 'Support for this action');
    for (const [phase, label] of SUPPORT_COLUMNS) {
      const reading = supportCell(def, row, summary, phase);
      const item = reading.state === 'unspecified' ? node('span') : button('', 'support-cell');
      item.classList.add('native-capability__cell'); item.dataset.supportState = reading.state;
      Object.assign(item.dataset, { capabilityKind: selection.kind, capabilityDefinition: def.id,
        capabilityVersion: def.version, capabilityId: row?.id ?? '', capabilityPhase: phase });
      if (reading.requirement) item.dataset.capabilityRequirementTarget = reading.requirement;
      item.setAttribute('aria-label', `${def.action} · ${label}: ${reading.label}. ${reading.detail}`);
      item.append(node('strong', label, 'native-capability__cell-status'), node('span', reading.label, 'native-capability__cell-detail'));
      support.append(item);
    }
    overview.push(support); elements.front.replaceChildren(...overview);
    const acceptance = section('How to check the result', def.acceptanceJob);
    const detail = [acceptance,
      section('People and responsibility', row ? `${row.teamId ? projection.state.teams.find(team => team.id === row.teamId)?.label : 'Choose a team'}. ${row.responsiblePersonIds.map(id => projection.state.people.find(person => person.id === id)?.label ?? id).join(', ') || 'Choose the people carrying the work'}. Decision: ${projection.state.people.find(person => person.id === row.decisionOwnerPersonId)?.label ?? 'Choose who decides'}.` : 'Plan the team, the people carrying the work, and the person who decides.')];
    const workList = node('ul', undefined, 'native-capability__support');
    for (const requirement of def.supportRequirements) {
      const li = node('li'); li.append(node('strong', requirement.label), node('p', requirement.description));
      const ids = row?.supportBindings.find(binding => binding.requirementId === requirement.id)?.workIds ?? [];
      if (!ids.length) li.append(node('p', 'Choose supporting work in the settings.'));
      for (const id of ids) {
        const work = projection.state.work.find(work => work.id === id), inspect = button(`Inspect ${work?.label ?? id}`, 'work');
        inspect.dataset.capabilityWork = id;
        li.append(inspect, node('p', `${id} · ${work?.funding === 'allocated' ? 'Within funded time' : 'Extra investment'}${summary?.sharedWorkIds.includes(id) ? ' · Shared with another card; priced once' : ''}`));
      }
      workList.append(li);
    }
    detail.push(section('Supporting work', workList));
    if (summary) {
      const amounts = summary.amounts;
      detail.push(section('Selected supporting work', `${amounts.standing === 'incomplete' ? 'Known amounts: ' : ''}${money(amounts.allocatedKnownCents)} attributed within funded time; ${money(amounts.additionalKnownCents)} attributed to extra investment. Each card rounds its selected work separately. Shared sessions can appear on several cards; the plan total prices all work together.`));
      const gaps = node('ul'); for (const gap of summary.gaps) gaps.append(node('li', gap.message));
      detail.push(section('Current support', summary.gaps.length ? gaps : 'The current plan supplies the named support.'));
    }
    const prerequisites = node('ul');
    for (const required of def.prerequisiteDefinitions) {
      const name = getCapabilityDefinition(required.kind, required.definitionId, required.definitionVersion)?.action ?? required.definitionId;
      const li = node('li', `${name} · ${row?.prerequisites.some(ref => {
        const instance = projection.state[COLLECTION[ref.kind]].find(item => item.id === ref.instanceId);
        return ref.kind === required.kind && instance?.definitionId === required.definitionId && instance.definitionVersion === required.definitionVersion;
      }) ? 'Selected' : 'Choose or plan this prerequisite'}`);
      const plan = button(`Plan ${name.toLowerCase()}`, 'prerequisite');
      Object.assign(plan.dataset, { capabilityKind: required.kind, capabilityDefinition: required.definitionId, capabilityVersion: required.definitionVersion });
      const existing = projection.state[COLLECTION[required.kind]].find(item => item.definitionId === required.definitionId && item.definitionVersion === required.definitionVersion && item.lifecycle === 'active');
      if (existing) { plan.dataset.capabilityId = existing.id; plan.textContent = `Inspect ${name.toLowerCase()}`; }
      else plan.classList.add('native-control--create');
      li.append(plan); prerequisites.append(li);
    }
    detail.push(section('Prerequisites', prerequisites.children.length ? prerequisites : 'This definition has no required prerequisite definition.',
      def.prerequisiteDefinitions.length ? def.prerequisiteDefinitions.map(item => getCapabilityDefinition(item.kind, item.definitionId, item.definitionVersion).action).join(', ') : 'Ready to plan directly'));
    const observations = projection.state.capabilityEvidence.filter(item => item.subject.kind === selection.kind && item.subject.instanceId === row?.id);
    const history = node('ul');
    for (const item of observations) history.append(node('li', `${STAGES[item.stage]} · ${item.observation} Context: ${item.context}. Recorded by ${projection.state.people.find(person => person.id === item.recorderPersonId)?.label ?? item.recorderPersonId} at plan revision ${item.observedPlanRevision}. Applies to: ${item.reviewBoundary}.`));
    detail.push(section('Recorded observations', history.children.length ? history : 'Add an observation in settings when people have evidence to record. Current support checks remain separate from these records.',
      observations.at(-1)?.observation ?? 'Add evidence when available'));
    elements.reverse.replaceChildren(...detail);
    for (const details of elements.reverse.querySelectorAll('details')) details.open = expanded.has(details.dataset.capabilitySection);
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
    const checkboxes = key.startsWith('support.');
    const group = node(checkboxes ? 'fieldset' : 'div', undefined, `native-capability__field${metadata.numeric ? ' native-capability__field--numeric' : ''}`), label = node(checkboxes ? 'legend' : 'label', metadata.label);
    const input = document.createElement(checkboxes ? 'ul' : metadata.source && metadata.kind !== 'ids' || metadata.choices ? 'select'
      : metadata.kind === 'ids' ? 'select' : metadata.maxLength > 120 ? 'textarea' : 'input');
    input.id = `${instance}-field-${++sequence}`; input.name = key; label.htmlFor = input.id; input.dataset.capabilityField = key;
    if (metadata.kind === 'ids') { input.className = 'native-capability__choices'; if (!checkboxes) { input.multiple = true; input.size = Math.min(4, Math.max(2, options(metadata.source, raw).length)); } }
    if (checkboxes) {
      input.tabIndex = -1;
      for (const [value, text] of options(metadata.source, raw)) {
        const item = node('li'), choice = node('label'), check = document.createElement('input');
        check.type = 'checkbox'; check.value = value; check.dataset.capabilityField = key;
        check.dataset.capabilityChoice = value; check.setAttribute('aria-describedby', input.id + '-error');
        choice.append(check, node('span', text)); item.append(choice); input.append(item);
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
      const create = node('button', `Add ${type === 'person' ? 'a person' : type === 'team' ? 'a team' : 'a working session'}`, 'native-control--create');
      create.type = 'button'; create.classList.add('native-control--navigate'); create.dataset.nativeCreate = type; create.dataset.nativeReturn = 'capability'; create.dataset.nativeReturnField = key; group.append(create);
    }
    group.append(error); parent.append(group); controls.set(key, { input, error, metadata, checkboxes });
  }
  function buildFields(descriptor, raw) {
    controls = new Map(); workGroups = new Map(); observationGroup = null; peopleGroup = null; prerequisiteGroup = null; elements.fields.replaceChildren();
    if (!descriptor || descriptor.mode === 'remove') {
      if (descriptor) elements.fields.append(node('p', 'Remove this instance? Its separately owned working sessions and funding remain in the plan.'));
      return;
    }
    const basics = section('Use in this plan'); elements.fields.append(basics);
    field(basics, 'context', descriptor.fields.context, raw.context);
    if (descriptor.mode === 'create' && projection.state.planId === 'service-request-pilot') basics.append(node('p', 'This example starts with an editable pilot proposal. Apply adds it to your plan.'));
    peopleGroup = node('details', undefined, 'native-capability__section'); peopleGroup.dataset.capabilityPeople = '';
    peopleGroup.append(node('summary')); elements.fields.append(peopleGroup);
    for (const key of ['teamId', 'responsiblePersonIds', 'decisionOwnerPersonId', 'lifecycle']) field(peopleGroup, key, descriptor.fields[key], raw[key]);
    const prerequisites = node('details'); prerequisites.append(node('summary', 'Prerequisites · choose the supporting abilities and practices'));
    field(prerequisites, 'prerequisites', descriptor.fields.prerequisites, raw.prerequisites); elements.fields.append(prerequisites); prerequisiteGroup = prerequisites;
    for (const requirement of descriptor.definition.supportRequirements) {
      const group = node('details', undefined, 'native-capability__section'); group.dataset.capabilityRequirement = requirement.id;
      group.append(node('summary', requirement.label), node('p', requirement.description));
      const supportKey = `support.${requirement.id}`, prefix = `new.${requirement.id}.`;
      field(group, supportKey, descriptor.fields[supportKey], raw[supportKey]);
      field(group, prefix + 'enabled', descriptor.fields[prefix + 'enabled'], raw[prefix + 'enabled']);
      const newWork = node('div', undefined, 'native-capability__new-work');
      for (const [key, metadata] of Object.entries(descriptor.fields)) if (key.startsWith(prefix) && !key.endsWith('.enabled')) field(newWork, key, metadata, raw[key]);
      group.append(newWork); elements.fields.append(group); workGroups.set(requirement.id, { group, newWork });
    }
    const evidence = node('details', undefined, 'native-capability__section'); evidence.append(node('summary', 'Record an observation · add evidence when available'));
    const latest = projection.state.capabilityEvidence.filter(item => item.subject.kind === descriptor.kind && item.subject.instanceId === descriptor.id).at(-1);
    if (latest) evidence.append(node('p', `${STAGES[latest.stage]} recorded: ${latest.observation} Context: ${latest.context}. Applies to: ${latest.reviewBoundary}.`));
    field(evidence, 'evidenceStage', descriptor.fields.evidenceStage, raw.evidenceStage);
    observationGroup = node('div');
    for (const key of ['evidenceContext', 'evidenceObservation', 'evidenceRecorder', 'evidenceReviewBoundary']) field(observationGroup, key, descriptor.fields[key], raw[key]);
    evidence.append(observationGroup); elements.fields.append(evidence);
  }
  function render() {
    const view = editor.read(); if (disposed) return view;
    renderCatalogues(view.projection);
    if (view.draft && view.draft.capabilityId === target) selectDescriptor(describeCapabilityTarget(target));
    renderCard();
    const draft = view.draft?.capabilityId === target ? view.draft : null, descriptor = draft ? describeCapabilityTarget(target) : null;
    if (builtTarget !== (draft?.capabilityId ?? null) || builtProjection !== projection) {
      builtTarget = draft?.capabilityId ?? null; builtProjection = projection; buildFields(descriptor, draft?.raw);
    }
    root.dataset.capabilityState = draft ? view.status : 'idle';
    elements.configure.hidden = !draft; elements.fields.disabled = !draft || view.status !== 'editing';
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
        if (control.checkboxes) for (const check of control.input.querySelectorAll('input')) check.checked = raw.includes(check.value);
        else if (control.metadata.kind === 'ids') for (const option of control.input.options) option.selected = raw.includes(option.value);
        else if (control.input.value !== raw) control.input.value = raw;
        const error = draft.errors.find(item => item.path === `draft.${key}`);
        control.input.setAttribute('aria-invalid', String(Boolean(error))); control.error.textContent = error?.message ?? '';
      }
      if (peopleGroup) {
        const team = projection.state.teams.find(row => row.id === draft.raw.teamId)?.label;
        const owner = projection.state.people.find(row => row.id === draft.raw.decisionOwnerPersonId)?.label;
        peopleGroup.querySelector('summary').textContent = `People and responsibility · ${[team, owner ? `${owner} decides` : 'Choose who decides'].filter(Boolean).join(' · ')}`;
      }
      if (prerequisiteGroup) {
        const selected = new Map(options('capabilities', draft.raw.prerequisites));
        prerequisiteGroup.querySelector('summary').textContent = `Prerequisites · ${draft.raw.prerequisites.map(id => selected.get(id)).join(', ') || (descriptor.definition.prerequisiteDefinitions.length ? 'Choose the supporting abilities and practices' : 'Ready to plan directly')}`;
      }
      for (const [id, { group, newWork }] of workGroups) {
        newWork.hidden = draft.raw[`new.${id}.enabled`] !== 'yes';
        const selectedIds = draft.raw[`support.${id}`];
        const selectedNames = selectedIds.slice(0, 2).map(workId => projection.state.work.find(work => work.id === workId)?.label ?? workId);
        if (selectedIds.length > 2) selectedNames.push(`${selectedIds.length - 2} more selected`);
        if (!newWork.hidden) selectedNames.push(`Add ${draft.raw[`new.${id}.label`].trim() || 'a named session'}`);
        group.querySelector('summary').textContent = `${descriptor.definition.supportRequirements.find(item => item.id === id).label} · ${selectedNames.join(', ') || 'Choose supporting work'}`;
      }
      if (observationGroup) observationGroup.hidden = !draft.raw.evidenceStage;
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
  function focusEditor() { const view = editor.read(); (view.status === 'stale' ? actions.get('review') : controls.values().next().value?.input ?? actions.get('cancel')).focus(); }
  function opened(result, epoch, focus) {
    if (!owns(epoch)) return result;
    if (result.view.draft) selectDescriptor(describeCapabilityTarget(result.view.draft.capabilityId));
    composing = false; render();
    if (!owns(epoch)) return result;
    acknowledged = Boolean(result.view.draft); elements.configure.open = acknowledged;
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
    announce(`Proposal applied. ${investmentAmount('Accepted investment', accepted.result)}${accepted.result.plannedCommitmentCents === null ? ' Add missing hourly rates in People to complete the amount.' : ''}`); actions.get('apply').focus();
  }
  function showSupport(kind, id) {
    const row = studio.read().state[COLLECTION[kind]]?.find(row => row.id === id); if (!row) return;
    const result = open(makeCapabilityTarget(capabilityForm(kind, 'update', row.definitionId, row.definitionVersion), id), false);
    reversed = true; beside = false; render(); actions.get('reverse').focus(); return result;
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
    const region = phase === 'responsibility' ? peopleGroup : phase === 'observation' ? observationGroup?.closest('details')
      : workGroups.get(control.dataset.capabilityRequirementTarget)?.group;
    if (!region) return;
    region.open = true;
    const key = phase === 'responsibility' ? 'teamId' : phase === 'observation' ? 'evidenceStage' : `support.${control.dataset.capabilityRequirementTarget}`;
    controls.get(key)?.input.focus();
  }
  function renderManual() {
    const groups = [];
    for (const kind of ['ability', 'practice']) {
      const group = section(kind === 'ability' ? 'Customer abilities' : 'Team practices');
      for (const definition of listCapabilities(kind)) {
        const details = node('details'); details.append(node('summary', definition.action), node('p', definition.explanation),
          node('p', `How to check the result. ${definition.acceptanceJob}`), node('p', definition.estimateUnits));
        const requirements = node('ul');
        for (const requirement of definition.supportRequirements) requirements.append(node('li', `${requirement.label}: ${requirement.description} Starting estimate: ${duration(requirement.estimate.minutesPerOccurrence)} × ${requirement.estimate.occurrences}.`));
        details.append(requirements, node('p', definition.assumptions.join(' ')), node('p', `${definition.id} · version ${definition.version}`)); group.append(details);
      }
      groups.push(group);
    }
    elements['manual-body'].replaceChildren(...groups);
  }
  listen(root, 'click', event => {
    const control = event.target.closest('[data-capability-action]'); if (!control || !root.contains(control) || disposed || !isActive()) return;
    const action = control.dataset.capabilityAction;
    if (action === 'apply') return;
    if (action === 'select') { selectCard(control); return; }
    if (action === 'support-cell') { inspectSupport(control); return; }
    if (action === 'reverse') { reversed = !reversed && !beside; beside = false; renderCard(); return; }
    if (action === 'beside') { beside = !beside; reversed = false; renderCard(); return; }
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
    if (disposed || !isActive() || !control || (control.checkboxes ? !control.input.contains(event.target) : control.input !== event.target) || !view.draft || view.status !== 'editing') return;
    if (control.checkboxes ? event.type !== 'change' : event.type === 'input' && event.target.tagName === 'SELECT' || event.type === 'change' && event.target.tagName !== 'SELECT') return;
    const epoch = ++generation;
    if (control.metadata.kind === 'ids') {
      const chosen = new Set([...(control.checkboxes ? control.input.querySelectorAll('input:checked') : control.input.selectedOptions)].map(option => option.value));
      const ordered = [...view.draft.raw[key].filter(id => chosen.has(id)), ...chosen].filter((id, index, ids) => ids.indexOf(id) === index);
      changed(editor.setIds(view.draft.token, key, ordered), epoch);
    } else changed(editor.setText(view.draft.token, key, control.input.value), epoch);
  }
  listen(elements.form, 'input', input); listen(elements.form, 'change', input);
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
    INSTANCES.delete(root); projection = null; controls.clear(); workGroups.clear();
  }
  renderManual(); render();
  const controller = Object.freeze({ refresh: render, open, create, showSupport, selectedTarget: () => target,
    close, resume: () => target ? open(target, false) : render(), dispose });
  INSTANCES.set(root, controller); return controller;
}
