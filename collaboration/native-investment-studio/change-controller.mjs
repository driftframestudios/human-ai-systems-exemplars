import { summarizeWorkSessions } from './work-sessions.mjs';
import { createTimeControls, mountDurationDials, renderTimeReadout } from './time-controls.mjs';
import { CHANGE_FIELDS, changeSettingsFromRaw } from './change-draft.mjs';
import { listChangeFrameworks, listInterpretiveLenses, listAttentionChannels, getChangeSuggestion,
  CHANGE_STATUSES, CHANGE_SOURCE_FILTERS, FOUR_ACTIONS, FOUR_ACTIONS_METHOD, createChangeSettings, projectChange } from './change-models.mjs';
import { getCapabilityDefinition } from './capabilities.mjs';
import { money } from './display.mjs';
import { getChangeMethod } from './change-methods.mjs';
import { createReel, animateRackChange } from './reel-control.mjs';
import { mountRackHeader, focusSubmitControl } from './rack-controls.mjs';
import { revealStudioDestination } from './motion.mjs';
import { changeShowcaseEntries, projectChangeEmphasis, frameworkEmphasisEntries } from './change-showcase.mjs';

const INSTANCES = new WeakMap();
let instanceSequence = 0;
const ref = row => `${row.id}@${row.version}`;
const choices = { framework: listChangeFrameworks().map(row => [ref(row), row.name]),
  lens: listInterpretiveLenses().map(row => [ref(row), row.name]),
  sourceFilter: CHANGE_SOURCE_FILTERS.map(row => [row.id, row.label]),
  status: CHANGE_STATUSES.map(row => [row.id, row.label]),
  'proposal.mode': [['existing', 'Use an existing session'], ['new', 'Propose a new session']],
  'proposal.funding': [['allocated', 'Within funded time'], ['additional', 'Extra investment']] };
const targetName = { people: 'person', teams: 'team', work: 'session' };

export function mountChangePanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {},
  onAccepted = () => {}, onSourceWork = () => {}, canOpen = () => true, isActive = canOpen }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, instance = `change-${++instanceSequence}`, cleanup = [], controls = new Map();
  const find = name => {
    const element = root.querySelector(`[data-change-${name}=""]`);
    if (!element) throw new TypeError(`Supply the Change ${name} element.`);
    return element;
  };
  const elements = Object.fromEntries(['frameworks', 'lenses', 'filters', 'matrix', 'mixer', 'work', 'interpretation',
    'lens-wheel', 'four-actions', 'preview', 'error', 'status', 'form', 'fields', 'recovery', 'current'].map(name => [name, find(name)]));
  const actions = new Map([...root.querySelectorAll('[data-change-action]')].map(element => [element.dataset.changeAction, element]));
  const editor = editing.change, componentNodes = [], faders = new Map(), selectedComponents = new Map(), selectedMethods = new Map();
  for (const name of ['frameworks', 'lenses', 'filters', 'matrix', 'mixer', 'work', 'lens-wheel']) elements[name].replaceChildren();
  root.querySelector('[data-change-attention-note]')?.remove();
  let disposed = false, generation = 0, composing = false, sequence = 0, lastProjection = null, selectedDiscussion = null;
  const owns = epoch => !disposed && generation === epoch;
  function listen(element, event, handler) { element.addEventListener(event, handler); cleanup.push(() => element.removeEventListener(event, handler)); }
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function button(text, action) {
    const element = node('button', text); element.type = 'button'; element.dataset.changeAction = action;
    if (['work', 'suggest'].includes(action)) element.classList.add('native-control--navigate');
    return element;
  }
  function methodLink(method) {
    const route = method.readingRoute;
    if (!route) return null;
    const canvasRoot = 'context-canvas-project-surface/context-canvas/';
    const url = route.path.startsWith(canvasRoot)
      ? new URL(route.path.slice(canvasRoot.length), document.baseURI)
      : new URL(`../../${route.path}`, import.meta.url);
    if (route.fragment) url.hash = route.fragment;
    const link = node('a', `${route.label} (new tab)`);
    link.href = url.href; link.target = '_blank'; link.rel = 'noopener'; link.classList.add('native-control--navigate');
    return link;
  }
  function announce(text) { if (!disposed) elements.status.textContent = text; }
  function sourceOptions(source, selected) {
    const rows = source === 'capabilities' ? ['ability', 'practice'].flatMap(kind => studio.read().state[kind === 'ability' ? 'abilities' : 'practices'].map(row =>
      [`${kind}/${row.id}`, `${getCapabilityDefinition(kind, row.definitionId, row.definitionVersion)?.action ?? row.definitionId} · ${row.id}`]))
      : studio.read().state[source].map(row => [row.id, `${row.label}${row.lifecycle === 'retired' ? ' · retired' : ''}`]);
    const known = new Set(rows.map(([id]) => id));
    for (const id of selected) if (id && !known.has(id)) rows.push([id, `${id} · removed; choose a current record`]);
    return rows;
  }
  function populate(control, raw) {
    const { input, metadata, key, radio } = control;
    const selected = metadata.kind === 'ids' ? raw : [raw];
    const rows = metadata.source ? sourceOptions(metadata.source, selected) : choices[key] ?? choices.status;
    input.replaceChildren();
    if (metadata.kind === 'ids' || radio) {
      for (const [id, text] of rows) {
        const item = node('li'), label = node('label'), checkbox = node('input');
        checkbox.type = radio ? 'radio' : 'checkbox'; checkbox.name = key; checkbox.value = id; checkbox.dataset.changeField = key;
        checkbox.setAttribute('aria-describedby', control.error.id);
        label.append(checkbox, node('span', text)); item.append(label); input.append(item);
      }
      if (!rows.length) input.append(node('li', 'Add a record below to make it available here.'));
      return;
    }
    if (metadata.kind !== 'ids' && metadata.source) { const option = node('option', 'Choose when known'); option.value = ''; input.append(option); }
    for (const [id, label] of rows) { const option = node('option', label); option.value = id; input.append(option); }
  }
  function field(parent, key) {
    const metadata = CHANGE_FIELDS[key], radio = key.endsWith('.status') || key === 'proposal.funding', grouped = metadata.kind === 'ids' || radio;
    const group = node(grouped ? 'fieldset' : 'div', undefined, 'native-change__field');
    const label = node(grouped ? 'legend' : 'label', metadata.label);
    const input = document.createElement(grouped ? 'ul' : metadata.source || metadata.choices && !metadata.checkbox ? 'select' : 'input');
    input.id = `${instance}-${++sequence}`; input.name = key; input.dataset.changeField = key; label.htmlFor = input.id;
    if (key.startsWith('attention.')) { label.textContent = 'Level'; input.setAttribute('aria-label', `${metadata.label} attention parts`); }
    if (grouped) input.className = radio ? 'native-change__exclusive' : 'native-change__choices';
    if (input.tagName === 'INPUT') {
      input.type = metadata.checkbox ? 'checkbox' : 'text'; input.maxLength = metadata.maxLength;
      if (metadata.numeric) { input.inputMode = 'numeric'; input.spellcheck = false; input.className = 'native-change__numeric'; }
    }
    const error = node('p', '', 'native-coordination__error'); error.id = input.id + '-error'; input.setAttribute('aria-describedby', error.id);
    group.append(label, input);
    if (metadata.numeric) {
      const steps = node('div', undefined, 'native-change__steps');
      for (const direction of [-1, 1]) {
        const step = button(direction < 0 ? '−' : '+', 'step'); step.dataset.changeField = key; step.dataset.changeStep = String(direction);
        step.setAttribute('aria-label', `${direction < 0 ? 'Decrease' : 'Increase'} ${metadata.label.toLowerCase()}`); steps.append(step);
      }
      group.append(steps);
    }
    if (metadata.source && targetName[metadata.source]) {
      const kind = targetName[metadata.source], create = node('button', `Add ${kind === 'person' ? 'a person' : kind === 'team' ? 'a team' : 'a working session'}`, 'native-control--create');
      create.type = 'button'; create.classList.add('native-control--navigate'); Object.assign(create.dataset, { nativeCreate: kind, nativeReturn: 'change', nativeReturnField: key }); group.append(create);
    }
    group.append(error); parent.append(group);
    const control = { input, metadata, error, key, group, radio }; controls.set(key, control); return control;
  }
  field(elements.frameworks, 'framework'); field(elements.lenses, 'lens'); field(elements.filters, 'sourceFilter');
  const reelDeck = elements['lens-wheel'].parentElement;
  reelDeck.classList.add('native-change__reels');
  elements['lens-wheel'].className = 'native-change__reel-holder';
  const frameworkHolder = root.querySelector('[data-change-framework-wheel]') ?? node('div', undefined, 'native-change__reel-holder');
  frameworkHolder.replaceChildren();
  frameworkHolder.dataset.changeFrameworkWheel = '';
  elements['lens-wheel'].after(frameworkHolder);
  const selectConfiguration = (kind, value) => {
    const view = editor.read();
    if (disposed || !isActive() || view.status !== 'editing') return;
    const lensId = kind === 'lens' ? value.split('@')[0] : view.draft.raw.lens.split('@')[0];
    const frameworkId = kind === 'framework' ? value.split('@')[0] : undefined;
    editFields(changeShowcaseEntries(view.projection.state, view.draft.raw, lensId, frameworkId));
  };
  const lensReel = createReel(document, { label: 'Interpretive lens', choices: choices.lens.map(([id, label]) => ({ id, label })),
    value: choices.lens[0][0], onSelect: value => selectConfiguration('lens', value), variant: 'teal' });
  const frameworkReel = createReel(document, { label: 'Change framework', choices: choices.framework.map(([id, label]) => ({ id, label })),
    value: choices.framework[0][0], onSelect: value => selectConfiguration('framework', value), variant: 'cobalt', secondary: true });
  elements['lens-wheel'].append(lensReel.element); frameworkHolder.append(frameworkReel.element);
  const selectorDetails = root.querySelector('.native-change__setup') ?? node('details', undefined, 'native-change__setup'), selectorSummary = node('summary', 'Choose exact settings');
  const selectors = elements.frameworks.parentElement;
  if (!selectorDetails.contains(selectors)) selectors.before(selectorDetails);
  selectorDetails.replaceChildren(selectorSummary, selectors);
  const preciseChannels = node('div', undefined, 'native-change__precise-channels');
  preciseChannels.append(node('p', 'Stored attention channels · exact values'));
  for (const channel of listAttentionChannels()) field(preciseChannels, `attention.${channel.id}`);
  selectorDetails.append(preciseChannels);
  const attentionPanel = elements.mixer.closest('.native-change__attention');
  for (const paragraph of [...attentionPanel.children].filter(child => child.tagName === 'P')) paragraph.remove();
  elements.fields.prepend(attentionPanel);
  elements.matrix.classList.add('native-change__workspace');
  const componentKeys = node('div', undefined, 'native-change__keys'), inspectors = node('section', undefined, 'studio-rack-editor native-change__inspectors');
  inspectors.hidden = true; inspectors.id = `${instance}-inspector`;
  let inspectorView = 'support', inspectorOrigin = null;
  const originKey = control => control && [control.className, control.dataset.changeFramework, control.dataset.changeComponent,
    control.dataset.changeDiscussion, control.dataset.changeView].join('/');
  function closeInspector() {
    durationDials.release(); inspectors.hidden = true; syncComponentDisclosures();
    const origin = inspectorOrigin?.isConnected && inspectorOrigin.getClientRects().length ? inspectorOrigin : [...elements.matrix.querySelectorAll('[data-change-action="component"]')]
      .find(control => originKey(control) === originKey(inspectorOrigin) && control.getClientRects().length);
    const fallback = componentNodes.find(entry => !entry.key.hidden && entry.component.id === selectedComponents.get(entry.framework.id))?.key;
    (origin ?? fallback)?.focus({ preventScroll: true });
  }
  const inspectorHeader = mountRackHeader(inspectors, { title: 'Change component', owner: 'Change components',
    id: `${instance}-inspector-title`, onClose: closeInspector });
  inspectors.setAttribute('aria-labelledby', inspectorHeader.title.id);
  const inspectorRail = node('div', undefined, 'native-change__inspector-rail');
  inspectorRail.setAttribute('role', 'group'); inspectorRail.setAttribute('aria-label', 'Component settings');
  const inspectorViews = new Map([['support', 'Support'], ['methods', 'Methods'], ['session', 'Session']].map(([id, label]) => {
    const key = button(label, 'inspector-view'); key.dataset.changeView = id; inspectorRail.append(key); return [id, key];
  }));
  inspectors.append(inspectorRail);
  componentKeys.setAttribute('role', 'group'); componentKeys.setAttribute('aria-label', 'Choose a change component');
  const lanes = new Map([['focus', 'Focus now'], ['support', 'Keep in view'], ['available', 'Also consider']].map(([id, label]) => {
    const lane = node('section', undefined, 'native-change__lane'); lane.dataset.changeLane = id;
    lane.append(node('h4', label)); componentKeys.append(lane); return [id, lane];
  }));
  const tracks = node('div', undefined, 'native-change__tracks'); tracks.dataset.changeTracks = '';
  const discussionPads = new Map(FOUR_ACTIONS.map(action => {
    const pad = button('', 'component'), componentLabel = node('span');
    pad.className = 'native-change__discussion'; pad.dataset.changeDiscussion = action.id;
    pad.append(node('strong', action.label), componentLabel);
    return [action.id, { pad, componentLabel }];
  }));
  elements['four-actions'].setAttribute('aria-label', 'Change planning actions');
  elements['four-actions'].replaceChildren(...[...discussionPads.values()].map(entry => entry.pad));
  elements.matrix.append(componentKeys, elements['four-actions'], tracks, inspectors);
  for (const framework of listChangeFrameworks()) for (const component of framework.components) {
    if (!selectedComponents.has(framework.id)) selectedComponents.set(framework.id, component.id);
    const prefix = `map.${framework.id}.${component.id}.`, panel = node('section', undefined, 'native-change__component');
    Object.assign(panel.dataset, { changeFramework: framework.id, changeComponent: component.id });
    panel.id = `${instance}-component-${framework.id}-${component.id}`;
    const key = button('', 'component'), keyStatus = node('small', '', 'native-change__key-status');
    key.className = 'native-change__key'; key.dataset.changeFramework = framework.id; key.dataset.changeComponent = component.id;
    key.dataset.studioPad = `${framework.id}/${component.id}`;
    key.setAttribute('aria-controls', inspectors.id); const meter = node('span', undefined, 'native-change__pad-meter'); meter.setAttribute('aria-hidden', 'true');
    key.append(node('strong', component.label), keyStatus, meter); lanes.get('support').append(key);
    panel.setAttribute('aria-label', component.label);
    const preview = node('p', '', 'native-change__component-preview'), body = node('div', undefined, 'native-change__component-body');
    const introduction = node('div', undefined, 'native-change__component-introduction');
    introduction.append(node('p', component.explanation), node('p', `People to involve: ${component.receiverRole}.`));
    const settings = node('div', undefined, 'native-change__component-settings');
    for (const key of ['mapped', 'status', 'workIds', 'capabilityRefs']) field(settings, prefix + key);
    const supportEditor = node('section', undefined, 'native-change__support-editor');
    supportEditor.id = `${panel.id}-support`; supportEditor.setAttribute('aria-label', 'Status and supporting work');
    const linkedWork = node('div', undefined, 'native-coordination__actions');
    supportEditor.append(introduction, settings, linkedWork); body.append(supportEditor);
    const methods = node('section', undefined, 'native-change__methods'); methods.id = `${panel.id}-methods`;
    methods.setAttribute('aria-label', 'Methods for this change');
    const methodKeys = node('div', undefined, 'native-change__method-keys');
    methodKeys.setAttribute('role', 'group'); methodKeys.setAttribute('aria-label', `Methods for ${component.label}`);
    const suggestions = node('ul', undefined, 'native-change__suggestions');
    for (const source of ['core', 'enterprise']) for (const suggestion of component[source + 'Suggestions']) {
      const method = getChangeMethod(suggestion.id);
      const li = node('li', undefined, 'native-change__suggestion');
      Object.assign(li.dataset, { changeSource: source, changeMethod: suggestion.id });
      li.id = `${panel.id}-method-${suggestion.id}`;
      const methodKey = button(method.displayLabel ?? method.label, 'method');
      Object.assign(methodKey.dataset, { changeFramework: framework.id, changeComponent: component.id, changeSource: source, changeMethodChoice: suggestion.id });
      methodKey.setAttribute('aria-controls', li.id); methodKeys.append(methodKey);
      li.append(node('h5', method.displayLabel ?? method.label), node('p', method.purpose));
      const example = node('details', undefined, 'native-change__method-example');
      const summary = node('summary', 'See an example');
      summary.setAttribute('aria-label', `See an example of ${method.displayLabel ?? method.label}`);
      const reading = node('div');
      reading.append(node('p', method.useWhen), node('strong', method.question), node('p', method.example));
      const inputs = node('ul'); method.bring.forEach(item => inputs.append(node('li', item)));
      reading.append(node('h6', 'Bring to the discussion'), inputs, node('h6', 'Leave with'), node('p', method.leaveWith),
        node('small', method.sourceNote));
      const onward = methodLink(method); if (onward) reading.append(onward);
      example.append(summary, reading); li.append(example);
      const propose = button('Plan supporting work', 'suggest');
      propose.setAttribute('aria-label', `Plan supporting work for ${method.displayLabel ?? method.label}`);
      Object.assign(propose.dataset, { changeFramework: ref(framework), changeComponent: component.id, changeSource: source, changeSuggestion: suggestion.id });
      const actions = node('div', undefined, 'native-change__suggestion-actions'); actions.append(propose);
      li.append(actions); suggestions.append(li);
    }
    methods.append(methodKeys, suggestions); body.append(methods); panel.append(preview, body); inspectors.append(panel);
    componentNodes.push({ framework, component, prefix, panel, key, keyStatus, meter, preview, linkedWork, suggestions, methodKeys, supportEditor, methods });
  }
  inspectors.append(elements.work);
  listen(componentKeys, 'keydown', event => {
    const key = event.target.closest('[data-change-action="component"]');
    if (!key || !componentKeys.contains(key) || !['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const visible = componentNodes.filter(entry => !entry.key.hidden).map(entry => entry.key), index = visible.indexOf(key);
    if (index < 0) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1
      : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + visible.length) % visible.length;
    visible[target].focus();
  });
  const attentionNote = node('div', undefined, 'native-change__live-reading'); attentionNote.dataset.changeAttentionNote = ''; elements.mixer.before(attentionNote);
  for (const framework of listChangeFrameworks()) for (const component of framework.components) {
    const group = node('section', undefined, 'native-change__channel'), key = `${framework.id}/${component.id}`;
    group.dataset.changeChannel = component.id; group.dataset.changeFaderFramework = framework.id;
    const title = node('label', component.label); title.htmlFor = `${instance}-fader-${key.replace('/', '-')}`;
    group.append(title);
    const range = node('input', undefined, 'native-change__fader'); range.type = 'range'; range.min = '0'; range.max = '25'; range.step = '1';
    range.id = title.htmlFor; range.dataset.changeFader = key; range.setAttribute('aria-label', `${component.label} emphasis`);
    const track = node('div', undefined, 'native-change__fader-track'); track.append(range); group.append(track);
    const value = node('output'); value.htmlFor = range.id; group.append(value);
    faders.set(key, { range, value, group }); group.title = component.explanation; elements.mixer.append(group);
  }
  const workNote = node('p'), workFields = node('div', undefined, 'native-support-proposal');
  const modeFields = node('div', undefined, 'native-support-proposal__metadata'), newWorkFields = node('div', undefined, 'native-support-proposal__details');
  field(modeFields, 'proposal.mode'); const existingWork = field(modeFields, 'proposal.existingWorkId');
  const identityFields = node('div', undefined, 'native-support-proposal__metadata');
  for (const key of ['label', 'teamId']) field(identityFields, `proposal.${key}`);
  const peopleFields = node('div', undefined, 'native-change__proposal-people');
  field(peopleFields, 'proposal.personIds');
  const time = createTimeControls(document, { idPrefix: `${instance}-proposal`, fieldPrefix: 'proposal.',
    decorateField(input, key) { input.dataset.changeField = key; },
    decorateStep(button, key, direction) { Object.assign(button.dataset, { changeAction: 'step', changeField: key, changeStep: String(direction) }); } });
  for (const [key, control] of time.controls) controls.set(key, { ...control, metadata: CHANGE_FIELDS[key] });
  const sessionFields = node('div', undefined, 'native-change__proposal-session');
  sessionFields.append(time.element); field(sessionFields, 'proposal.funding');
  newWorkFields.append(identityFields, sessionFields, peopleFields);
  const workActions = node('div', undefined, 'native-coordination__actions'); workActions.append(button('Set proposal aside', 'clear-work'));
  workFields.append(modeFields, newWorkFields, workActions); elements.work.id = `${instance}-session`; elements.work.append(workNote, workFields);
  const durationDials = mountDurationDials({ ...time, read() {
    const view = editor.read(), active = editing.read().active;
    return { token: view.draft?.token, hours: view.draft?.raw['proposal.hoursPerSession'], minutes: view.draft?.raw['proposal.minutesPerSession'], composing,
      errors: { hours: view.draft?.errors.some(error => error.path === 'draft.proposal.hoursPerSession'), minutes: view.draft?.errors.some(error => error.path === 'draft.proposal.minutesPerSession') },
      enabled: !disposed && !composing && isActive() && !inspectors.hidden && inspectorView === 'session' && view.status === 'editing' && view.draft?.raw['proposal.mode'] === 'new'
        && active?.kind === 'change' && active.token === view.draft.token };
  }, write(token, field, value) { const epoch = ++generation; changed(editor.setText(token, 'proposal.' + field, value), epoch); } });
  let trackSignature = '';
  function syncComponentDisclosures() {
    for (const control of [...componentKeys.querySelectorAll('.native-change__key'), ...tracks.querySelectorAll('.native-change__track-label'), ...[...discussionPads.values()].map(entry => entry.pad)]) {
      const { changeFramework, changeComponent } = control.dataset;
      const selected = !control.hidden && selectedComponents.get(changeFramework) === changeComponent
        && (!control.dataset.changeDiscussion || control.dataset.changeDiscussion === selectedDiscussion);
      control.setAttribute('aria-expanded', String(!inspectors.hidden && selected));
      if (control.classList.contains('native-change__key')) control.setAttribute('aria-pressed', String(!inspectors.hidden && selected));
    }
  }
  function renderTracks(reading, view, editable) {
    const works = view.projection.state.work.filter(work => work.lifecycle === 'active');
    const signature = JSON.stringify([reading.framework.id, reading.components,
      works.map(work => [work.id, work.label, summarizeWorkSessions(work).durationMinutes]), editable]);
    if (signature === trackSignature) return;
    trackSignature = signature;
    const focusedPad = tracks.contains(document.activeElement) ? { map: document.activeElement.dataset.changeMap, work: document.activeElement.dataset.changeWork } : null;
    const table = node('table'), caption = node('caption', `${reading.framework.name} · sessions supporting the change`);
    const head = node('thead'), headings = node('tr'); headings.append(node('th', 'Change component'));
    for (const work of works) headings.append(node('th', work.label));
    headings.append(node('th', 'Supporting work'));
    for (const heading of headings.children) heading.scope = 'col'; head.append(headings);
    const body = node('tbody');
    for (const component of reading.components) {
      const row = node('tr'), title = node('th'); title.scope = 'row'; row.append(title);
      const inspect = button(component.label, 'component'); inspect.className = 'native-change__track-label';
      Object.assign(inspect.dataset, { changeFramework: reading.framework.id, changeComponent: component.componentId });
      title.append(inspect);
      for (const work of works) {
        const cell = node('td'), pad = button('', 'support-pad'), linked = component.workIds.includes(work.id);
        pad.className = 'native-change__support-pad'; pad.disabled = !editable;
        pad.dataset.changeWork = work.id; pad.dataset.changeMap = `map.${reading.framework.id}.${component.componentId}.workIds`;
        pad.setAttribute('aria-pressed', String(linked));
        pad.setAttribute('aria-label', `${linked ? 'Unlink' : 'Link'} ${work.label} ${linked ? 'from' : 'to'} ${component.label}`);
        pad.title = `${work.label} · ${work.sessionOverrides?.length ? `${summarizeWorkSessions(work).durationMinutes} min across sessions` : `${work.minutesPerOccurrence} min per person`} · ${linked ? 'Linked' : 'Available'}`;
        pad.append(node('span', linked ? 'Linked' : 'Link')); cell.append(pad); row.append(cell);
      }
      const planCell = node('td'), plan = button('Plan session', 'component');
      plan.className = 'native-change__track-label';
      Object.assign(plan.dataset, { changeFramework: reading.framework.id, changeComponent: component.componentId, changeView: 'methods' });
      for (const control of [inspect, plan]) control.setAttribute('aria-controls', inspectors.id);
      plan.setAttribute('aria-label', `Choose supporting work for ${component.label}`); planCell.append(plan); row.append(planCell);
      body.append(row);
    }
    table.append(caption, head, body); tracks.replaceChildren(table);
    if (!works.length) tracks.replaceChildren(node('p', 'Add a working session to connect it to this change.'));
    syncComponentDisclosures();
    if (focusedPad) [...tracks.querySelectorAll('button')].find(pad => pad.dataset.changeMap === focusedPad.map && pad.dataset.changeWork === focusedPad.work)?.focus({ preventScroll: true });
  }

  function render() {
    const view = editor.read(); if (disposed) return view;
    const raw = view.draft?.raw, editable = view.status === 'editing';
    elements.fields.disabled = !editable;
    actions.get('apply').disabled = !editable || composing; actions.get('cancel').disabled = !view.draft;
    actions.get('reset').disabled = !editable;
    elements.recovery.hidden = !view.draft || !['stale', 'parked'].includes(view.status);
    elements.current.textContent = 'Review your saved framework, support and attention choices against the current plan.';
    for (const key of ['review', 'current', 'discard']) actions.get(key).disabled = !view.draft;
    root.dataset.changeState = view.status;
    const baseSettings = view.projection.state.changeSettings;
    const settings = raw ? changeSettingsFromRaw(raw, baseSettings) : baseSettings;
    const selectorError = view.draft?.errors.some(error => ['draft.framework', 'draft.lens', 'draft.sourceFilter'].includes(error.path));
    const reading = projectChange(selectorError ? baseSettings : settings);
    const hasWork = raw && raw['proposal.mode'] !== 'none';
    if (!hasWork && inspectorView === 'session') inspectorView = 'methods';
    for (const [key, control] of controls) {
      let value = raw?.[key];
      if (!raw) {
        if (key === 'framework') value = `${baseSettings.activeFramework.frameworkId}@${baseSettings.activeFramework.version}`;
        else if (key === 'lens') value = `${baseSettings.lens.lensId}@${baseSettings.lens.version}`;
        else if (key === 'sourceFilter') value = baseSettings.sourceFilter;
        else if (key.startsWith('attention.')) value = String(baseSettings.attention.channels.find(row => row.channelId === key.slice(10)).parts);
        else if (key.startsWith('map.')) {
          const [, frameworkId, componentId, property] = key.split('.');
          const component = baseSettings.frameworkMaps.find(row => row.frameworkId === frameworkId).components.find(row => row.componentId === componentId);
          value = property === 'mapped' ? component.mapped ? 'yes' : 'no' : property === 'capabilityRefs' ? component.capabilityRefs.map(row => `${row.kind}/${row.instanceId}`) : component[property];
        } else value = control.metadata.kind === 'ids' ? [] : '';
      }
      if (['SELECT', 'UL'].includes(control.input.tagName) && (lastProjection !== view.projection || !control.input.children.length)) populate(control, value);
      if (control.metadata.kind === 'ids' || control.radio) for (const checkbox of control.input.querySelectorAll('input')) checkbox.checked = control.radio ? value === checkbox.value : value.includes(checkbox.value);
      else if (control.metadata.checkbox) control.input.checked = value === 'yes';
      else if (control.input.value !== value) control.input.value = value;
      const error = view.draft?.errors.find(error => error.path === `draft.${key}`);
      control.error.textContent = error?.message ?? ''; control.input.setAttribute('aria-invalid', String(Boolean(error)));

    }
    renderTimeReadout(time, raw ?? {}, { errors: view.draft?.errors, composing, fieldPrefix: 'proposal.', horizonWeeks: view.projection.state.horizonWeeks });
    durationDials.refresh();
    lastProjection = view.projection;
    for (const entry of componentNodes) {
      const inFramework = entry.framework.id === reading.framework.id;
      const selected = inFramework && selectedComponents.get(entry.framework.id) === entry.component.id;
      entry.key.hidden = !inFramework; entry.key.setAttribute('aria-pressed', String(selected && !inspectors.hidden)); entry.panel.hidden = !selected || inspectorView === 'session';
      entry.supportEditor.hidden = inspectorView !== 'support'; entry.methods.hidden = inspectorView !== 'methods';
      if (selected) {
        inspectorHeader.update({ title: inspectorView === 'session' ? 'Plan a supporting session' : entry.component.label,
          owner: 'Change components', source: actions.get('apply') });
        for (const [id, key] of inspectorViews) {
          key.hidden = id === 'session' && !hasWork;
          key.setAttribute('aria-pressed', String(inspectorView === id));
          key.setAttribute('aria-controls', id === 'session' ? elements.work.id : id === 'support' ? entry.supportEditor.id : entry.methods.id);
        }
      }
      const state = settings.frameworkMaps.find(row => row.frameworkId === entry.framework.id).components.find(row => row.componentId === entry.component.id);
      const status = CHANGE_STATUSES.find(row => row.id === state.status)?.label ?? state.status;
      const workNames = state.workIds.map(id => view.projection.state.work.find(row => row.id === id)?.label ?? id);
      const capabilityNames = state.capabilityRefs.map(ref => {
        const row = view.projection.state[ref.kind === 'ability' ? 'abilities' : 'practices'].find(row => row.id === ref.instanceId);
        return row ? getCapabilityDefinition(ref.kind, row.definitionId, row.definitionVersion).action : ref.instanceId;
      });
      const supportNames = [...workNames, ...capabilityNames];
      entry.keyStatus.textContent = `${status} · ${supportNames.length ? 'Work linked' : 'Choose support'}`;
      entry.preview.textContent = `${status} · ${supportNames.length ? supportNames.join(', ') : 'Choose supporting work or an ability.'}`;
      const methodKey = `${entry.framework.id}/${entry.component.id}`;
      const availableMethods = [...entry.methodKeys.children].filter(button => settings.sourceFilter === 'all' || button.dataset.changeSource === settings.sourceFilter);
      let selectedMethod = selectedMethods.get(methodKey);
      if (!availableMethods.some(button => button.dataset.changeMethodChoice === selectedMethod)) {
        selectedMethod = availableMethods[0]?.dataset.changeMethodChoice; selectedMethods.set(methodKey, selectedMethod);
      }
      for (const key of entry.methodKeys.children) {
        key.hidden = !availableMethods.includes(key); key.setAttribute('aria-pressed', String(key.dataset.changeMethodChoice === selectedMethod));
      }
      for (const li of entry.suggestions.children) li.hidden = li.dataset.changeMethod !== selectedMethod;
      entry.linkedWork.replaceChildren(...state.workIds.map(id => { const inspect = button(`Inspect ${view.projection.state.work.find(row => row.id === id)?.label ?? id}`, 'work'); inspect.dataset.changeWork = id; return inspect; }));
    }
    lensReel.select(ref(reading.lens)); frameworkReel.select(ref(reading.framework));
    frameworkReel.vary(reading.attention.channels.reduce((sum, channel) => sum + (Number.isFinite(channel.parts) ? channel.parts : 0), 0) / 200);
    lensReel.element.disabled = !editable; frameworkReel.element.disabled = !editable;
    const interpretation = node('dl');
    for (const [label, value] of [['In view', reading.lens.surface], ['Attention', reading.lens.load], ['Revisit when', reading.lens.reentry], ['Next question', reading.lens.trigger]]) {
      const row = node('div'); row.append(node('dt', label), node('dd', value)); interpretation.append(row);
    }
    elements.interpretation.replaceChildren(node('h4', reading.lens.name), interpretation);
    const emphasized = projectChangeEmphasis(reading), emphasisById = new Map(emphasized.map(row => [row.componentId, row]));
    for (const [key, fader] of faders) {
      const [frameworkId, componentId] = key.split('/'), active = frameworkId === reading.framework.id;
      fader.group.hidden = !active;
      if (!active) continue;
      const amount = emphasisById.get(componentId).emphasis;
      fader.range.value = String(amount); fader.value.textContent = String(amount);
      fader.range.setAttribute('aria-valuetext', `${amount} of 25 emphasis`);
      fader.range.parentElement.style.setProperty('--native-fader-fill', `${amount * 4}%`);
    }
    elements.mixer.style.setProperty('--change-faders', String(reading.components.length));
    for (const entry of componentNodes.filter(entry => entry.framework.id === reading.framework.id)) {
      const row = emphasisById.get(entry.component.id), lane = lanes.get(row.lane);
      if (entry.key.parentElement !== lane) lane.append(entry.key);
      entry.meter.style.setProperty('--change-emphasis', `${row.emphasis * 4}%`);
      entry.key.dataset.changeEmphasis = String(row.emphasis);
      entry.key.title = `${entry.component.explanation}. ${entry.preview.textContent}`;
    }
    for (const lane of lanes.values()) lane.hidden = ![...lane.querySelectorAll('button')].some(key => !key.hidden);
    renderTracks(reading, view, editable);
    for (const action of reading.fourActions) {
      const { pad, componentLabel } = discussionPads.get(action.actionId);
      Object.assign(pad.dataset, { changeFramework: reading.framework.id, changeComponent: action.componentId });
      pad.setAttribute('aria-controls', inspectors.id);
      componentLabel.textContent = action.component.label;
    }
    syncComponentDisclosures();
    elements['four-actions'].title = `${FOUR_ACTIONS_METHOD.name} · ${FOUR_ACTIONS_METHOD.authors.join(' and ')}`;
    const attentionError = view.draft?.errors.some(error => error.path.startsWith('draft.attention.'));
    const greatestParts = Math.max(...emphasized.map(component => component.emphasis));
    const greatestChannels = emphasized.filter(component => component.emphasis === greatestParts);
    const emphasis = node('p');
    if (attentionError) emphasis.textContent = 'Enter whole attention parts from 0 through 25 to compare the emphasis.';
    else if (reading.attention.totalParts === 0) emphasis.textContent = 'All attention parts are zero. Choose an emphasis to guide the next discussion.';
    else {
      emphasis.append(node('strong', 'Give the most attention to '));
      greatestChannels.forEach((channel, index) => {
        if (index) emphasis.append(document.createTextNode(', '));
        emphasis.append(node('span', channel.label, 'native-change__emphasis-tag'));
      });

    }
    attentionNote.replaceChildren(emphasis);
    const greatestIds = new Set(greatestChannels.map(channel => channel.componentId));
    for (const channel of elements.mixer.children) channel.dataset.emphasis = !attentionError && greatestParts > 0 && greatestIds.has(channel.dataset.changeChannel) ? 'highest' : 'ordinary';
    workFields.hidden = !hasWork;
    existingWork.group.hidden = raw?.['proposal.mode'] !== 'existing'; newWorkFields.hidden = raw?.['proposal.mode'] !== 'new';
    if (hasWork) {
      const [frameworkId, version] = raw['proposal.framework'].split('@');
      const suggestion = getChangeSuggestion(frameworkId, version, raw['proposal.component'], raw['proposal.source'], raw['proposal.suggestion']);
      const method = suggestion && getChangeMethod(suggestion.id);
      const component = listChangeFrameworks().find(row => row.id === frameworkId)?.components.find(row => row.id === raw['proposal.component']);
      workNote.textContent = method
        ? `${method.displayLabel ?? method.label} supports ${component?.label ?? 'this change'}. Intended result: ${method.leaveWith}`
        : 'Review the selected suggestion against its framework.';
    } else workNote.textContent = '';
    elements.work.hidden = !hasWork || inspectorView !== 'session';
    const preview = editable && !composing ? editor.preview(view.draft.token) : null;
    if (disposed) return view;
    elements.error.textContent = view.error?.message ?? (preview && !preview.ok ? preview.error.message : '');
    if (preview?.ok) {
      const result = preview.projection.result, accepted = view.projection.result;
      elements.preview.textContent = `${result.plannedCommitmentCents === null ? 'Known proposed investment' : 'Proposed investment'}: ${money(result.knownCommitmentCents)}. ${accepted.plannedCommitmentCents === null ? 'Known accepted investment' : 'Accepted investment'}: ${money(accepted.knownCommitmentCents)}.${result.plannedCommitmentCents === null || accepted.plannedCommitmentCents === null ? ' Add missing hourly rates in People to complete the amounts.' : ''} Apply accepts these settings and the proposed work together.`;
    } else elements.preview.textContent = composing ? 'Finish entering the value.' : !view.draft ? 'Open Change to compare a framework or adjust the emphasis.' : 'Review the entries before applying this proposal.';
    return view;
  }
  function focusFirst() { const view = editor.read(); (view.status === 'stale' ? actions.get('review') : lensReel.element.querySelector('[aria-pressed="true"]')).focus(); }
  function opened(result, epoch, focus) {
    if (!owns(epoch)) return result;
    composing = false; render(); if (!owns(epoch)) return result;
    announce(result.ok ? '' : result.error.message); onEditing(); if (owns(epoch) && focus) focusFirst(); return result;
  }
  function open(target = 'change', focus = true) {
    if (disposed || !canOpen()) return;
    const epoch = ++generation; onBegin(); if (!owns(epoch)) return;
    return opened(editor.begin(target, studio.read()), epoch, focus);
  }
  function changed(result, epoch) { if (!owns(epoch)) return; animateRackChange(componentKeys, render); if (!owns(epoch)) return; announce(result.ok ? '' : result.error.message); onEditing(); }
  function settle(method) {
    const view = editor.read(); if (disposed || !view.draft) return;
    if (composing && method === 'apply') { announce('Finish entering the text, then apply.'); return; }
    const epoch = ++generation, result = editor[method](view.draft.token);
    if (!owns(epoch)) return;
    if (!result.ok) { changed(result, epoch); return; }
    if (method === 'cancel') { opened(editor.begin('change', studio.read()), epoch, false); announce('Changes cancelled.'); return; }
    const accepted = result.projection ?? studio.read(); onAccepted(accepted);
    if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return;
    opened(editor.begin('change', accepted), epoch, false);
    if (owns(epoch)) { announce('Change settings and supporting work applied.'); focusSubmitControl(actions.get('apply')); }
  }
  function editFields(entries) {
    const view = editor.read(); if (!view.draft || view.status !== 'editing') return;
    const epoch = ++generation;
    let result;
    for (const [key, value] of entries) { result = CHANGE_FIELDS[key].kind === 'ids' ? editor.setIds(view.draft.token, key, value) : editor.setText(view.draft.token, key, value); if (!result.ok || !owns(epoch)) break; }
    if (result) changed(result, epoch);
    return result;
  }
  listen(root, 'click', event => {
    const control = event.target.closest('[data-change-action]');
    if (!control || !root.contains(control) || disposed || !isActive()) return;
    const action = control.dataset.changeAction;
    if (action === 'apply') return;
    if (action === 'component') {
      const discussion = control.dataset.changeDiscussion ?? null, nextView = control.dataset.changeView ?? (discussion ? 'methods' : 'support');
      const same = selectedComponents.get(control.dataset.changeFramework) === control.dataset.changeComponent
        && selectedDiscussion === discussion;
      if (!inspectors.hidden && same && originKey(inspectorOrigin) === originKey(control)) { closeInspector(); return; }
      durationDials.release(); selectedDiscussion = discussion; inspectorView = nextView; inspectorOrigin = control;
      const origin = control.closest('.native-change__tracks') ?? control.closest('.native-change__four-actions') ?? componentKeys;
      origin.after(inspectors);
      selectedComponents.set(control.dataset.changeFramework, control.dataset.changeComponent); inspectors.hidden = false; render();
      if (!control.isConnected) inspectorHeader.close.focus({ preventScroll: true });
      revealStudioDestination(inspectors, { block: 'center' }); return;
    }
    if (action === 'inspector-view') { durationDials.release(); inspectorView = control.dataset.changeView; render(); return; }
    if (action === 'method') {
      selectedMethods.set(`${control.dataset.changeFramework}/${control.dataset.changeComponent}`, control.dataset.changeMethodChoice); render(); return;
    }
    if (action === 'cancel' || action === 'discard') { settle('cancel'); return; }
    const view = editor.read(); if (!view.draft) return;
    if (action === 'review' || action === 'current') { const epoch = ++generation; opened(editor[action === 'review' ? 'review' : 'useCurrent'](view.draft.token, studio.read()), epoch, true); return; }
    if (view.status !== 'editing') return;
    if (action === 'step') { const epoch = ++generation; changed(editor.step(view.draft.token, control.dataset.changeField, Number(control.dataset.changeStep)), epoch); return; }
    if (action === 'reset') {
      const defaults = createChangeSettings(), entries = [['framework', `${defaults.activeFramework.frameworkId}@${defaults.activeFramework.version}`]];
      for (const map of defaults.frameworkMaps) for (const component of map.components) entries.push(
        [`map.${map.frameworkId}.${component.componentId}.mapped`, component.mapped ? 'yes' : 'no'], [`map.${map.frameworkId}.${component.componentId}.status`, component.status]);
      for (const channel of defaults.attention.channels) entries.push([`attention.${channel.channelId}`, String(channel.parts)]);
      editFields(entries); announce('Starting framework, mapping and attention restored in this proposal. Linked support and the selected viewpoint remain available.'); return;
    }
    if (action === 'support-pad') {
      const key = control.dataset.changeMap, ids = view.draft.raw[key], id = control.dataset.changeWork;
      editFields([[key, ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]]]); return;
    }
    if (action === 'clear-work') { editFields([['proposal.mode', 'none']]); inspectorViews.get('methods').focus({ preventScroll: true }); return; }
    if (action === 'work') { onSourceWork(control.dataset.changeWork, { targetId: 'change' }); return; }
    if (action === 'suggest') {
      if (view.draft.raw['proposal.mode'] !== 'none') { inspectorView = 'session'; render(); announce('Apply or set aside the current work proposal before choosing another suggestion.'); revealStudioDestination(elements.work); return; }
      const [frameworkId, version] = control.dataset.changeFramework.split('@');
      const suggestion = getChangeSuggestion(frameworkId, version, control.dataset.changeComponent, control.dataset.changeSource, control.dataset.changeSuggestion);
      inspectorView = 'session';
      editFields([['proposal.framework', control.dataset.changeFramework], ['proposal.component', control.dataset.changeComponent],
        ['proposal.source', control.dataset.changeSource], ['proposal.suggestion', control.dataset.changeSuggestion],
        ['proposal.label', getChangeMethod(suggestion.id).sessionLabel], ['proposal.mode', 'new']]);
      controls.get('proposal.label').input.focus({ preventScroll: true }); revealStudioDestination(elements.work);
    }
  });
  function input(event) {
    if (event.target.dataset.changeFader) {
      if (event.type !== 'input' || disposed || !isActive() || editor.read().status !== 'editing') return;
      const [frameworkId, componentId] = event.target.dataset.changeFader.split('/');
      editFields(frameworkEmphasisEntries(frameworkId, componentId, event.target.value)); return;
    }
    const key = event.target.dataset.changeField, control = controls.get(key), view = editor.read();
    if (disposed || !isActive() || !control || !view.draft || view.status !== 'editing') return;
    if (control.input !== event.target && !((control.metadata.kind === 'ids' || control.radio) && control.input.contains(event.target))) return;
    if (event.type === 'input' && (control.input.tagName === 'SELECT' || control.metadata.checkbox || control.metadata.kind === 'ids' || control.radio)
      || event.type === 'change' && control.input.tagName !== 'SELECT' && !control.metadata.checkbox && control.metadata.kind !== 'ids' && !control.radio) return;
    if (key === 'framework' || key === 'lens') { selectConfiguration(key, event.target.value); return; }
    const epoch = ++generation;
    if (control.metadata.kind === 'ids') {
      const chosen = new Set([...control.input.querySelectorAll('input:checked')].map(checkbox => checkbox.value));
      const ordered = [...view.draft.raw[key].filter(id => chosen.has(id)), ...chosen].filter((id, index, ids) => ids.indexOf(id) === index);
      changed(editor.setIds(view.draft.token, key, ordered), epoch);
    } else changed(editor.setText(view.draft.token, key, control.metadata.checkbox ? control.input.checked ? 'yes' : 'no' : event.target.value), epoch);
  }
  listen(elements.form, 'input', input); listen(elements.form, 'change', input);
  listen(elements.form, 'keydown', event => {
    const key = event.target.dataset.changeFader, view = editor.read();
    if (disposed || !isActive() || !key || !['Home', 'End'].includes(event.key)
      || view.status !== 'editing' || !view.draft) return;
    event.preventDefault();
    const [frameworkId, componentId] = key.split('/');
    editFields(frameworkEmphasisEntries(frameworkId, componentId, event.key === 'Home' ? '0' : '25'));
  });
  listen(elements.form, 'submit', event => { event.preventDefault(); if (!disposed && isActive()) settle('apply'); });
  listen(elements.form, 'compositionstart', () => { composing = true; render(); });
  listen(elements.form, 'compositionend', event => { composing = false; input(event); });
  function close({ park = true } = {}) { if (disposed) return; durationDials.release(); ++generation; composing = false; if (park && editing.read().active?.kind === 'change') editing.park(); }
  function dispose() {
    if (disposed) return; close(); disposed = true; ++generation; cleanup.splice(0).forEach(release => release());
    elements.fields.disabled = true; for (const button of actions.values()) button.disabled = true;
    inspectorHeader.dispose(); lensReel.dispose(); frameworkReel.dispose(); frameworkHolder.remove();
    durationDials.dispose(); controls.clear(); faders.clear(); INSTANCES.delete(root);
  }
  render();
  const controller = Object.freeze({ open, refresh: render, close, resume: () => open('change', false), dispose });
  INSTANCES.set(root, controller); return controller;
}
