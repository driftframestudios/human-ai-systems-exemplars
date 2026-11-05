import { CHANGE_FIELDS, changeSettingsFromRaw } from './change-draft.mjs';
import { listChangeFrameworks, listInterpretiveLenses, listAttentionChannels, getChangeSuggestion,
  CHANGE_STATUSES, CHANGE_SOURCE_FILTERS, FOUR_ACTIONS_METHOD, createChangeSettings, projectChange } from './change-models.mjs';
import { getCapabilityDefinition } from './capabilities.mjs';
import { money } from './display.mjs';

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
    const element = root.querySelector(`[data-change-${name}]`);
    if (!element) throw new TypeError(`Supply the Change ${name} element.`);
    return element;
  };
  const elements = Object.fromEntries(['frameworks', 'lenses', 'filters', 'matrix', 'mixer', 'work', 'manual', 'interpretation',
    'four-actions', 'preview', 'error', 'status', 'form', 'fields', 'recovery', 'current'].map(name => [name, find(name)]));
  const actions = new Map([...root.querySelectorAll('[data-change-action]')].map(element => [element.dataset.changeAction, element]));
  const editor = editing.change, componentNodes = [], ranges = new Map();
  for (const name of ['frameworks', 'lenses', 'filters', 'matrix', 'mixer', 'work']) elements[name].replaceChildren();
  root.querySelector('[data-change-attention-note]')?.remove();
  let disposed = false, generation = 0, composing = false, sequence = 0, lastProjection = null;
  const owns = epoch => !disposed && generation === epoch;
  function listen(element, event, handler) { element.addEventListener(event, handler); cleanup.push(() => element.removeEventListener(event, handler)); }
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function button(text, action) { const element = node('button', text); element.type = 'button'; element.dataset.changeAction = action; return element; }
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
    const { input, metadata, key } = control;
    const selected = metadata.kind === 'ids' ? raw : [raw];
    const rows = metadata.source ? sourceOptions(metadata.source, selected) : choices[key] ?? choices.status;
    input.replaceChildren();
    if (metadata.kind === 'ids') {
      for (const [id, text] of rows) {
        const item = node('li'), label = node('label'), checkbox = node('input');
        checkbox.type = 'checkbox'; checkbox.name = key; checkbox.value = id; checkbox.dataset.changeField = key;
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
    const metadata = CHANGE_FIELDS[key], group = node(metadata.kind === 'ids' ? 'fieldset' : 'div', undefined, 'native-change__field');
    const label = node(metadata.kind === 'ids' ? 'legend' : 'label', metadata.label);
    const input = document.createElement(metadata.kind === 'ids' ? 'ul' : metadata.source || metadata.choices && !metadata.checkbox ? 'select' : 'input');
    input.id = `${instance}-${++sequence}`; input.name = key; input.dataset.changeField = key; label.htmlFor = input.id;
    if (key.startsWith('attention.')) { label.textContent = 'Parts'; input.setAttribute('aria-label', `${metadata.label} attention parts`); }
    if (metadata.kind === 'ids') input.className = 'native-change__choices';
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
      create.type = 'button'; Object.assign(create.dataset, { nativeCreate: kind, nativeReturn: 'change', nativeReturnField: key }); group.append(create);
    }
    group.append(error); parent.append(group);
    const control = { input, metadata, error, key, group }; controls.set(key, control); return control;
  }
  field(elements.frameworks, 'framework'); field(elements.lenses, 'lens'); field(elements.filters, 'sourceFilter');
  for (const framework of listChangeFrameworks()) for (const component of framework.components) {
    const prefix = `map.${framework.id}.${component.id}.`, details = node('details', undefined, 'native-change__component');
    Object.assign(details.dataset, { changeFramework: framework.id, changeComponent: component.id });
    const summary = node('summary', component.label), body = node('div', undefined, 'native-change__component-body');
    body.append(node('p', component.explanation), node('p', `People to involve: ${component.receiverRole}.`));
    for (const key of ['mapped', 'status', 'workIds', 'capabilityRefs']) field(body, prefix + key);
    const linkedWork = node('div', undefined, 'native-coordination__actions'); body.append(linkedWork);
    const suggestions = node('ul');
    for (const source of ['core', 'enterprise']) for (const suggestion of component[source + 'Suggestions']) {
      const li = node('li'); li.dataset.changeSource = source;
      li.append(node('p', suggestion.label));
      const propose = button('Plan supporting work', 'suggest');
      propose.setAttribute('aria-label', `Plan supporting work for ${suggestion.label}`);
      Object.assign(propose.dataset, { changeFramework: ref(framework), changeComponent: component.id, changeSource: source, changeSuggestion: suggestion.id });
      li.append(propose); suggestions.append(li);
    }
    body.append(suggestions); details.append(summary, body); elements.matrix.append(details);
    componentNodes.push({ framework, component, prefix, details, summary, linkedWork, suggestions });
  }
  const attentionNote = node('p'); attentionNote.dataset.changeAttentionNote = ''; elements.mixer.before(attentionNote);
  for (const channel of listAttentionChannels()) {
    const group = node('section', undefined, 'native-change__channel'), key = `attention.${channel.id}`;
    group.append(node('h5', channel.label), node('p', channel.description));
    const range = node('input', undefined, 'native-change__fader'); range.type = 'range'; range.min = '0'; range.max = '25'; range.step = '1';
    range.dataset.changeField = key; range.setAttribute('aria-label', `${channel.label} attention parts`); range.setAttribute('aria-orientation', 'vertical');
    group.append(range); ranges.set(key, range); field(group, key); elements.mixer.append(group);
  }
  const workHeading = node('h4', 'Plan a supporting session'), workNote = node('p'), workFields = node('div', undefined, 'native-change__work-fields');
  const newWorkFields = node('div', undefined, 'native-change__work-fields');
  field(workFields, 'proposal.mode'); const existingWork = field(workFields, 'proposal.existingWorkId');
  for (const key of ['label', 'teamId', 'personIds', 'hoursPerSession', 'minutesPerSession', 'occurrences', 'funding']) field(newWorkFields, `proposal.${key}`);
  workFields.append(newWorkFields, button('Set this work proposal aside', 'clear-work')); elements.work.append(workHeading, workNote, workFields);
  const manual = node('div');
  manual.append(node('p', 'Choose a framework to examine its components. Keep the work already linked to each component as you compare frameworks. Apply accepts your selected framework, mappings, viewpoint, suggestions filter and attention together.'),
    node('p', 'A mapped component records planning intent. Linked work names who will carry it. Review the resulting work and evidence before judging readiness.'),
    node('p', 'Attention parts express relative emphasis from 0 through 25. They help focus discussion. Staffing and session choices supply the investment calculation.'),
    node('p', 'The original 48 aggregate person-hours illustrate how a gap might receive support. Set participants, duration, occurrences and funding for your own proposed session.'));
  for (const framework of listChangeFrameworks()) {
    const details = node('details'); details.append(node('summary', framework.name), node('p', framework.note));
    for (const component of framework.components) details.append(node('h5', component.label), node('p', component.explanation));
    details.append(node('p', `${framework.id} · version ${framework.version}`)); manual.append(details);
  }
  const attribution = node('p', `${FOUR_ACTIONS_METHOD.name} by ${FOUR_ACTIONS_METHOD.authors.join(' and ')}. ${FOUR_ACTIONS_METHOD.purpose} ${FOUR_ACTIONS_METHOD.adaptation} `);
  const link = node('a', 'Read the original method'); link.href = FOUR_ACTIONS_METHOD.url; attribution.append(link); manual.append(attribution); elements.manual.replaceChildren(manual);

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
      if (control.metadata.kind === 'ids') for (const checkbox of control.input.querySelectorAll('input')) checkbox.checked = value.includes(checkbox.value);
      else if (control.metadata.checkbox) control.input.checked = value === 'yes';
      else if (control.input.value !== value) control.input.value = value;
      const error = view.draft?.errors.find(error => error.path === `draft.${key}`);
      control.error.textContent = error?.message ?? ''; control.input.setAttribute('aria-invalid', String(Boolean(error)));
      if (ranges.has(key)) {
        const range = ranges.get(key); range.value = /^\d+$/.test(value) && Number(value) <= 25 ? value : '0';
        range.setAttribute('aria-valuetext', error ? 'Enter whole parts from 0 through 25 in the precise field' : `${value} attention parts`);
      }
    }
    lastProjection = view.projection;
    for (const entry of componentNodes) {
      entry.details.hidden = entry.framework.id !== reading.framework.id;
      const state = settings.frameworkMaps.find(row => row.frameworkId === entry.framework.id).components.find(row => row.componentId === entry.component.id);
      const status = CHANGE_STATUSES.find(row => row.id === state.status)?.label ?? state.status;
      const workNames = state.workIds.map(id => view.projection.state.work.find(row => row.id === id)?.label ?? id);
      entry.summary.textContent = `${entry.component.label} · ${status}${workNames.length ? ` · ${workNames.slice(0, 2).join(', ')}${workNames.length > 2 ? ' and further linked work' : ''}` : ''}`;
      for (const li of entry.suggestions.children) li.hidden = settings.sourceFilter !== 'all' && li.dataset.changeSource !== settings.sourceFilter;
      entry.linkedWork.replaceChildren(...state.workIds.map(id => { const inspect = button(`Inspect ${view.projection.state.work.find(row => row.id === id)?.label ?? id}`, 'work'); inspect.dataset.changeWork = id; return inspect; }));
    }
    const lens = reading.lens, interpretation = node('dl');
    for (const [label, value] of [['In view', lens.surface], ['Attention', lens.load], ['Held aside', lens.aside], ['Revisit when', lens.reentry], ['Next question', lens.trigger]]) {
      const row = node('div'); row.append(node('dt', label), node('dd', value)); interpretation.append(row);
    }
    elements.interpretation.replaceChildren(node('h4', lens.name), interpretation);
    elements['four-actions'].replaceChildren(...reading.fourActions.map(action => {
      const article = node('article', undefined, 'native-change__discussion');
      article.append(node('h5', `${action.label} · ${action.time}`), node('p', action.component.label), node('p', action.component.explanation)); return article;
    }));
    const attentionError = view.draft?.errors.some(error => error.path.startsWith('draft.attention.'));
    const greatestParts = Math.max(...reading.attention.channels.map(channel => channel.parts));
    const greatestChannels = reading.attention.channels.filter(channel => channel.parts === greatestParts);
    attentionNote.textContent = attentionError ? 'Enter whole attention parts from 0 through 25 to compare the emphasis.'
      : reading.attention.totalParts === 0 ? 'All attention parts are zero. Choose an emphasis to guide the next discussion.'
        : `Give ${greatestChannels.map(channel => channel.label).join(', ')} the most attention (${greatestParts} parts). Consider whether the planned work reflects that choice.`;
    const hasWork = raw && raw['proposal.mode'] !== 'none'; workFields.hidden = !hasWork;
    existingWork.group.hidden = raw?.['proposal.mode'] !== 'existing'; newWorkFields.hidden = raw?.['proposal.mode'] !== 'new';
    if (hasWork) {
      const [frameworkId, version] = raw['proposal.framework'].split('@');
      const suggestion = getChangeSuggestion(frameworkId, version, raw['proposal.component'], raw['proposal.source'], raw['proposal.suggestion']);
      workNote.textContent = suggestion?.label ?? 'Review the selected suggestion against its framework.';
    } else workNote.textContent = 'Choose an authored suggestion in a component to plan one supporting session with your settings.';
    const preview = editable && !composing ? editor.preview(view.draft.token) : null;
    if (disposed) return view;
    elements.error.textContent = view.error?.message ?? (preview && !preview.ok ? preview.error.message : '');
    if (preview?.ok) {
      const result = preview.projection.result, accepted = view.projection.result;
      elements.preview.textContent = `${result.plannedCommitmentCents === null ? 'Known proposed investment' : 'Proposed investment'}: ${money(result.knownCommitmentCents)}. ${accepted.plannedCommitmentCents === null ? 'Known accepted investment' : 'Accepted investment'}: ${money(accepted.knownCommitmentCents)}.${result.plannedCommitmentCents === null || accepted.plannedCommitmentCents === null ? ' Add missing hourly rates in People to complete the amounts.' : ''} Apply accepts these settings and the proposed work together.`;
    } else elements.preview.textContent = composing ? 'Finish entering the value.' : !view.draft ? 'Open Change to compare a framework or adjust the emphasis.' : 'Review the entries before applying this proposal.';
    return view;
  }
  function focusFirst() { const view = editor.read(); (view.status === 'stale' ? actions.get('review') : controls.get('framework').input).focus(); }
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
  function changed(result, epoch) { if (!owns(epoch)) return; render(); if (!owns(epoch)) return; announce(result.ok ? '' : result.error.message); onEditing(); }
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
    if (owns(epoch)) { announce('Change settings and supporting work applied.'); actions.get('apply').focus(); }
  }
  function editFields(entries) {
    const view = editor.read(); if (!view.draft || view.status !== 'editing') return;
    const epoch = ++generation;
    let result;
    for (const [key, value] of entries) { result = editor.setText(view.draft.token, key, value); if (!result.ok || !owns(epoch)) break; }
    if (result) changed(result, epoch);
  }
  listen(root, 'click', event => {
    const control = event.target.closest('[data-change-action]');
    if (!control || !root.contains(control) || disposed || !isActive()) return;
    const action = control.dataset.changeAction;
    if (action === 'apply') return;
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
    if (action === 'clear-work') { editFields([['proposal.mode', 'none']]); return; }
    if (action === 'work') { onSourceWork(control.dataset.changeWork, { targetId: 'change' }); return; }
    if (action === 'suggest') {
      if (view.draft.raw['proposal.mode'] !== 'none') { announce('Apply or set aside the current work proposal before choosing another suggestion.'); elements.work.scrollIntoView({ block: 'nearest' }); return; }
      const [frameworkId, version] = control.dataset.changeFramework.split('@');
      const suggestion = getChangeSuggestion(frameworkId, version, control.dataset.changeComponent, control.dataset.changeSource, control.dataset.changeSuggestion);
      editFields([['proposal.framework', control.dataset.changeFramework], ['proposal.component', control.dataset.changeComponent],
        ['proposal.source', control.dataset.changeSource], ['proposal.suggestion', control.dataset.changeSuggestion],
        ['proposal.label', suggestion.label], ['proposal.mode', 'new']]);
      controls.get('proposal.label').input.focus();
    }
  });
  function input(event) {
    const key = event.target.dataset.changeField, control = controls.get(key), view = editor.read();
    if (disposed || !isActive() || !control || !view.draft || view.status !== 'editing') return;
    const fromRange = ranges.get(key) === event.target;
    if (!fromRange && control.input !== event.target && !(control.metadata.kind === 'ids' && control.input.contains(event.target))) return;
    if (event.type === 'input' && (control.input.tagName === 'SELECT' || control.metadata.checkbox || control.metadata.kind === 'ids') && !fromRange
      || event.type === 'change' && control.input.tagName !== 'SELECT' && !control.metadata.checkbox && control.metadata.kind !== 'ids') return;
    const epoch = ++generation;
    if (control.metadata.kind === 'ids') {
      const chosen = new Set([...control.input.querySelectorAll('input:checked')].map(checkbox => checkbox.value));
      const ordered = [...view.draft.raw[key].filter(id => chosen.has(id)), ...chosen].filter((id, index, ids) => ids.indexOf(id) === index);
      changed(editor.setIds(view.draft.token, key, ordered), epoch);
    } else changed(editor.setText(view.draft.token, key, control.metadata.checkbox ? control.input.checked ? 'yes' : 'no' : event.target.value), epoch);
  }
  listen(elements.form, 'input', input); listen(elements.form, 'change', input);
  listen(elements.form, 'keydown', event => {
    const key = event.target.dataset.changeField, view = editor.read();
    if (disposed || !isActive() || ranges.get(key) !== event.target || !['Home', 'End'].includes(event.key)
      || view.status !== 'editing' || !view.draft) return;
    event.preventDefault();
    const epoch = ++generation;
    changed(editor.setText(view.draft.token, key, event.key === 'Home' ? '0' : '25'), epoch);
  });
  listen(elements.form, 'submit', event => { event.preventDefault(); if (!disposed && isActive()) settle('apply'); });
  listen(elements.form, 'compositionstart', () => { composing = true; });
  listen(elements.form, 'compositionend', event => { composing = false; input(event); });
  function close({ park = true } = {}) { if (disposed) return; ++generation; composing = false; if (park && editing.read().active?.kind === 'change') editing.park(); }
  function dispose() {
    if (disposed) return; close(); disposed = true; ++generation; cleanup.splice(0).forEach(release => release());
    elements.fields.disabled = true; for (const button of actions.values()) button.disabled = true;
    controls.clear(); ranges.clear(); INSTANCES.delete(root);
  }
  render();
  const controller = Object.freeze({ open, refresh: render, close, resume: () => open('change', false), dispose });
  INSTANCES.set(root, controller); return controller;
}
