import { nextCreatedLabel } from './creation-label.mjs';
import { createCadenceView } from './cadence-view.mjs';
import { createCadence, resizeCadence, regroupCadence, CADENCE_PERIOD_LIMIT } from './cadence.mjs';
import { createShowcaseCadence } from './showcase-scenarios.mjs';
import { scoreField, startingScoreRaw } from './score-draft.mjs';
import { money } from './display.mjs';
import { resolveScoreDestination } from './navigation-policy.mjs';
import { mountSubmitMirror } from './rack-controls.mjs';

const INSTANCES = new WeakMap();
const LABELS = Object.freeze({ stage: 'stage', handoff: 'handoff', gate: 'decision', delay: 'delay', person: 'person',
  dependency: 'retained handoff', wait: 'retained wait', proposal: 'retained proposal', 'legacy-availability': 'retained availability' });
const RETAINED_LISTS = Object.freeze({ dependency: 'dependencyIds', wait: 'waitIds', proposal: 'proposalIds' });
const CHOICES = Object.freeze({ open: 'Open for review', proceed: 'Proceed in this model', revise: 'Revise the plan', hold: 'Hold this commitment' });
let sequence = 0;
const freshId = (kind, rows) => { const used = new Set(rows.map(row => typeof row === 'string' ? row : row.id)); let n = 1; while (used.has(kind + '-' + n)) n++; return kind + '-' + n; };
const cadenceFrom = raw => { try { return JSON.parse(raw.cadence ?? 'null'); } catch { return null; } };

// The score draft retains the transaction. This controller owns the visitor's
// selected period and contextual inspector; zoom never enters accepted state.
export function mountScorePanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {}, onAccepted = () => {},
  onViewChanged = () => {}, onLoadPlan = () => true, onNavigate = () => {}, onCreateSession = () => {}, onExample = () => {}, onInspect = () => {}, canOpen = () => true, isActive = canOpen }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, editor = editing.score, instance = 'score-' + ++sequence, cleanup = [], controls = new Map();
  let disposed = false, generation = 0, composing = false, retiredToken = null, periodId = null, loadedPlanId = null;
  let selected = { kind: 'horizon', id: '' }, fieldSignature = '', lastProjection = null;
  let inspectionEntryKey = null, inspectorOpen = false;
  let arrangementNote = 'Previewing the new horizon. Sessions and their effort are retained.';
  const created = new Map();
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
  const listen = (el, type, fn) => { el.addEventListener(type, fn); cleanup.push(() => el.removeEventListener(type, fn)); };
  function button(text, action, className = '') { const el = node('button', text, className); el.type = 'button'; el.dataset.scoreAction = action; return el; }
  const owns = epoch => !disposed && generation === epoch;
  const boundary = () => ({ projection: studio.read(), intent: editing.read().intent, token: editing.read().active?.token ?? null });
  const retains = (epoch, mark) => owns(epoch) && studio.read() === mark.projection && editing.read().intent === mark.intent && (editing.read().active?.token ?? null) === mark.token;
  function operate(method, ...args) {
    try { return editor[method](...args); }
    finally {
      if (retiredToken !== null) {
        const active = editing.read().active;
        if (active?.kind !== 'score' || active.token !== retiredToken) retiredToken = null;
        else { const result = editing.park(); if (result.ok || result.error.code !== 'settling') retiredToken = null; }
      }
    }
  }
  function announce(text) { if (!disposed) status.textContent = text; }
  function publishAccepted(epoch, accepted) {
    // Settle the local view before notifying the shared owner. Draft-only
    // changes use onEditing; an accepted edit needs one root notification.
    if (!retains(epoch, accepted)) return false;
    render();
    if (!retains(epoch, accepted)) return false;
    onAccepted(accepted.projection);
    return retains(epoch, accepted);
  }
  const toolbar = node('div', undefined, 'native-score__transport');
  const horizon = node('fieldset', undefined, 'native-score__horizon-controls'); horizon.append(node('legend', 'Plan horizon'));
  const basisChoices = node('div', undefined, 'native-score__segments');
  for (const [value, label] of [['sprint', 'Sprints'], ['quarter', 'Business quarters']]) {
    const labelEl = node('label'), input = node('input'); input.type = 'radio'; input.name = instance + '-basis'; input.value = value; input.dataset.cadenceBasis = '';
    labelEl.append(input, node('span', label)); basisChoices.append(labelEl);
  }
  horizon.append(basisChoices);
  const examples = node('div', undefined, 'native-score__example-links'); examples.append(node('span', 'Try a different example'));
  for (const [id, label] of [['service-request-pilot', 'Four-sprint pilot'], ['service-request-rollout', 'Two-quarter rollout']]) {
    const el = button(label, 'example'); el.dataset.presetId = id; examples.append(el);
  }
  toolbar.append(horizon, examples);
  const pending = node('div', undefined, 'native-score__pending'); pending.hidden = true;
  const pendingText = node('p'), pendingActions = node('div', undefined, 'native-coordination__actions');
  pendingActions.append(button('Apply horizon', 'apply'), button('Cancel changes', 'cancel')); pending.append(pendingText, pendingActions);
  const projectionRoot = node('div', undefined, 'native-score__projection'); projectionRoot.dataset.scoreProjection = '';
  const flowPanel = node('details', undefined, 'native-cadence native-cadence__details native-cadence__flow');
  flowPanel.dataset.cadenceDisclosure = 'flow';
  const flowSummary = node('summary', 'Stages & handoffs'), flowRoot = node('div');
  const inspector = node('section', undefined, 'native-score__inspector studio-rack-editor');
  const inspectorHeading = node('header', undefined, 'studio-rack-editor__heading');
  inspector.id = instance + '-inspector';
  const form = node('form'); form.noValidate = true; form.dataset.scoreForm = '';
  const title = node('h4', 'Inspect the arrangement'), detail = node('p', '', 'native-score__record-note');
  title.tabIndex = -1; title.id = instance + '-inspector-title'; inspector.setAttribute('aria-labelledby', title.id);
  const recovery = node('div', undefined, 'native-coordination__recovery'); recovery.hidden = true;
  recovery.append(node('p', 'Your entries are saved. Review them against the current plan.'), button('Review saved edits', 'review'), button('Use current values', 'current'));
  const fields = node('fieldset', undefined, 'native-score__fields'); fields.dataset.scoreFields = ''; fields.setAttribute('aria-label', 'Arrangement settings');
  const contextActions = node('div', undefined, 'native-coordination__actions');
  const preview = node('p', '', 'native-score__preview'); preview.dataset.scorePreview = '';
  const error = node('p', '', 'native-coordination__error'); error.setAttribute('role', 'alert'); error.dataset.scoreError = '';
  const actions = node('div', undefined, 'native-coordination__actions'), apply = button('Apply changes', 'apply'), cancel = button('Cancel changes', 'cancel');
  apply.type = 'submit'; actions.append(apply, cancel);
  const status = node('p', '', 'native-coordination__status'); status.setAttribute('role', 'status'); status.dataset.scoreStatus = '';
  form.append(detail, recovery, fields, contextActions, preview, error, actions);
  form.className = 'studio-rack-editor__body';
  const inspectorTools = node('div', undefined, 'studio-rack-editor__tools');
  const topApply = mountSubmitMirror(inspectorTools); topApply.setSource(apply);
  inspectorTools.append(button('Close', 'close', 'native-control--cancel'));
  inspectorHeading.append(title, inspectorTools);
  inspector.append(inspectorHeading, form); flowPanel.append(flowSummary, flowRoot);
  const fallback = root.querySelector('[data-score-fallback]'); if (fallback) fallback.hidden = true;
  root.append(toolbar, pending, projectionRoot, status);
  const view = createCadenceView(projectionRoot, {
    onSelect: (target, source) => select(target, true, source), onLoadPlan: loadPlan, onAddPeriod: addPeriod, onRenamePeriod: renamePeriod, onNavigate: (target, source) => navigate(target, source),
    onPeriod: id => { periodId = id; render(); }, onAddSession: createSession, onAddOccurrence: addOccurrence,
    onAddDecision: anchor => addDecision(anchor), onAddDelay: anchor => addDelay(anchor),
    onAddStage: () => addStage(), onAddHandoff: () => addHandoff(), onCreateHorizon: () => proposeHorizon(), flowRoot, flowPanel,
  });
  view.getSessionSlot().append(inspector);
  function syncInspectorControls() {
    for (const control of projectionRoot.querySelectorAll('[data-cadence-action="select"]:not([data-studio-session-id])')) {
      control.setAttribute('aria-controls', inspector.id);
      control.setAttribute('aria-expanded', String(control.getAttribute('aria-pressed') === 'true'
        && inspectorOpen && !inspector.hidden));
    }
  }
  listen(flowPanel, 'toggle', syncInspectorControls);

  function loadPlan(id, source) {
    if (disposed || !isActive() || id !== null && !studio.read().state.work.some(item => item.id === id)) return;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    if (onLoadPlan(id, source) === false || disposed || !isActive()) return;
    loadedPlanId = id;
    selected = { kind: 'horizon', id: '' };
    inspectorOpen = false; flowPanel.open = false;
    render();
  }
  function acceptCadence(update, message) {
    const unavailable = () => ({ ok: false, error: { message: 'Return to this plan and try the change again.' } });
    if (disposed || !isActive()) return unavailable();
    const epoch = ++generation;
    const parked = editing.park();
    if (!parked.ok) { render(); announce(parked.error.message); return parked; }
    const prior = boundary();
    if (!owns(epoch) || onLoadPlan(loadedPlanId) === false || !retains(epoch, prior) || !isActive()) return unavailable();
    const base = studio.read(), current = base.state.scoreSettings.cadence;
    const next = update(current, base.state);
    if (!next) return unavailable();
    if (next === current) return { ok: true };
    const result = studio.replace({ ...base.state, revision: base.state.revision + 1,
      scoreSettings: { ...base.state.scoreSettings, cadence: next } }, base);
    if (!result.ok) { render(); announce(result.error.message); return result; }
    selected = { kind: 'horizon', id: '' }; fieldSignature = '';
    inspectorOpen = false; flowPanel.open = false;
    if (publishAccepted(epoch, { ...prior, projection: result.projection })) announce(message);
    return result;
  }
  function renamePeriod({ id, label }) {
    return acceptCadence(current => {
      const period = current?.periods.find(row => row.id === id);
      if (!period || (period.caption ?? '') === label) return current;
      const { caption: _previousCaption, ...identity } = period;
      return { ...current, periods: current.periods.map(row => row.id === id
        ? { ...identity, ...(label ? { caption: label } : {}) } : row) };
    }, 'Period caption updated.');
  }
  function addPeriod() {
    acceptCadence(current => current && current.periods.length < CADENCE_PERIOD_LIMIT
      ? resizeCadence(current, current.periods.length + 1) : current,
    'Period added. Undo restores the previous horizon.');
  }
  function ensure() {
    if (disposed || !canOpen()) return null;
    if (editor.read().draft && editing.read().active?.kind === 'score') return { ok: true, view: editor.read() };
    const epoch = ++generation, before = boundary(); onBegin();
    const active = editing.read().active;
    if (!owns(epoch) || studio.read() !== before.projection || editing.read().intent !== before.intent || (active && active.token !== before.token)) return null;
    const result = operate('begin', 'score', studio.read()); if (!owns(epoch)) return null;
    return result;
  }
  function changeCadence(update) {
    const opened = ensure(); if (!opened?.ok) { announce(opened?.error?.message ?? 'Open the current arrangement.'); return; }
    const current = editor.read(); if (current.status !== 'editing') { inspectorOpen = true; render(); return; }
    const cadence = cadenceFrom(current.draft.raw);
    const result = operate('setText', current.draft.token, 'cadence', JSON.stringify(update(cadence, current)));
    render(); announce(result.ok ? 'Preview the arrangement, then Apply to keep it.' : result.error.message); onEditing();
  }
  function proposeHorizon() {
    acceptCadence((cadence, state) => cadence ?? createShowcaseCadence(state, 4),
      'Sprint plan added. Undo restores the previous arrangement.');
  }
  function open(_target = 'score', focus = true) {
    const result = ensure(); inspectorOpen = Boolean(result); render(); if (!result || disposed) return result;
    const epoch = generation, mark = boundary(); onEditing();
    if (!retains(epoch, mark)) return result;
    if (focus) (fields.querySelector('input, select, textarea') ?? title).focus();
    return result;
  }
  function select(target, reveal = false, source = null) {
    if (disposed || !isActive()) return;
    if (target.kind === 'availability') target = { ...target, kind: studio.read().state.scoreSettings.cadence?.availability.some(row => row.personId === target.id) ? 'person' : 'legacy-availability' };
    if (target.kind === 'work') { navigate(target, source); return; }
    if (target.kind === 'dependency') {
      const old = studio.read().state.scoreSettings.dependencies.find(row => row.id === target.id);
      const match = studio.read().state.scoreSettings.cadence?.handoffs.find(row => row.id === target.id || row.from.kind === 'work' && row.from.id === old?.fromWorkId && row.to.kind === 'work' && row.to.id === old?.toWorkId);
      if (match) target = { kind: 'handoff', id: match.id };
    }
    if (!['stage', 'handoff', 'gate', 'delay', 'person', 'horizon', 'legacy-availability', ...Object.keys(RETAINED_LISTS)].includes(target.kind)) return;
    if (source && inspectorOpen && source.dataset.cadenceKey === inspectionEntryKey && selected.kind === target.kind && selected.id === target.id) { closeInspection(); return; }
    inspectionEntryKey = source?.dataset.cadenceKey ?? null;
    selected = target; fieldSignature = ''; const result = ensure(); inspectorOpen = Boolean(result); render();
    if (!result || disposed) return;
    const epoch = generation, mark = boundary(); onEditing();
    if (!retains(epoch, mark)) return;
    if (reveal) { (fields.querySelector('input, select, textarea') ?? title).focus({ preventScroll: true }); onInspect(inspector); }
  }
  function navigate(target, source = null) {
    if (disposed || !resolveScoreDestination(target, studio.read().state)) return;
    if (target.kind !== 'work' || !source) {
      const parked = editing.park(); if (!parked.ok) { announce(parked.error.message); return; }
    }
    onNavigate(target, { kind: 'score', targetId: 'score', routeKind: 'context', source });
  }
  function createSession(context, source) {
    if (disposed || !isActive()) return;
    const accepted = studio.read().state.scoreSettings.cadence;
    const draft = editor.read().draft, proposed = draft && cadenceFrom(draft.raw);
    if (context?.periodId && (!accepted?.periods.some(period => period.id === context.periodId)
      || proposed && (proposed.basis !== accepted.basis || JSON.stringify(proposed.periods) !== JSON.stringify(accepted.periods)))) {
      announce('Apply this horizon before adding a session to its new periods.'); return;
    }
    const parked = editing.park(); if (!parked.ok) { announce(parked.error.message); return; }
    onCreateSession(context, source);
  }
  function addOccurrence({ workId, periodId: destination, subdivision }) {
    if (disposed || !isActive()) return;
    const epoch = ++generation;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const prior = boundary();
    if (!owns(epoch) || onLoadPlan(loadedPlanId) === false || !retains(epoch, prior) || !isActive()) return;
    const base = studio.read(), cadence = base.state.scoreSettings.cadence;
    const work = base.state.work.find(row => row.id === workId);
    if (!work || !cadence?.periods.some(period => period.id === destination)) return;
    const placements = cadence.placements.filter(row => row.workId === workId)
      .map(({ occurrenceIndex, periodId, subdivision }) => ({ occurrenceIndex, periodId, subdivision }));
    placements.push({ occurrenceIndex: work.occurrences, periodId: destination, subdivision });
    const result = studio.applyCommand({ type: 'work.update', work: { ...work, occurrences: work.occurrences + 1 }, placements }, base);
    if (!result.ok) { render(); announce(result.error.message); return; }
    selected = { kind: 'horizon', id: '' }; inspectorOpen = false; fieldSignature = '';
    if (publishAccepted(epoch, { ...prior, projection: result.projection }))
      announce(`Session added to ${work.label}. Undo restores the previous sessions.`);
  }
  function writeRaw(key, value) {
    const current = editor.read(); if (!current.draft || current.status !== 'editing') return;
    const result = operate(Array.isArray(value) ? 'setIds' : 'setText', current.draft.token, key, value);
    render(); announce(result.ok ? '' : result.error.message); onEditing();
  }
  function field(key, label, value, write, { choices, multiple = false, prose = false, numeric = false, placeholder = '' } = {}) {
    const group = node(multiple ? 'fieldset' : 'div', undefined, 'native-score__field' + (prose ? ' native-score__field--prose' : ''));
    const caption = node(multiple ? 'legend' : 'label', label);
    const input = node(multiple ? 'div' : choices ? 'select' : prose ? 'textarea' : 'input');
    if (multiple) input.className = 'native-score__choices';
    input.id = instance + '-field-' + controls.size; input.dataset.cadenceField = key;
    if (!multiple) caption.htmlFor = input.id;
    if (choices) for (const [id, text] of choices) {
      if (multiple) { const option = node('label'), check = node('input'); check.type = 'checkbox'; check.value = id; check.dataset.cadenceField = key; option.append(check, node('span', text)); input.append(option); }
      else { const option = node('option', text); option.value = id; input.append(option); }
    }
    if (input.tagName === 'INPUT') { input.type = numeric ? 'number' : 'text'; input.placeholder = placeholder; if (numeric) input.min = '0'; else input.maxLength = 200; }
    if (prose) { input.rows = 3; input.maxLength = scoreField('gate.gate-1.question').maxLength; }
    group.append(caption, input); fields.append(group); controls.set(key, { input, value, write, multiple });
  }
  function rawField(key, raw, choices, multiple = false) {
    const metadata = scoreField(key); field(key, metadata.label, () => editor.read().draft?.raw[key] ?? raw[key], value => writeRaw(key, value),
      { choices, multiple, prose: ['question', 'evidence'].includes(key.split('.').at(-1)) });
  }
  function retainedFields(raw, state) {
    const { kind, id } = selected, prefix = kind + '.' + id + '.';
    if (kind === 'legacy-availability' ? !raw.availabilityPersonIds.includes(id) : !raw[RETAINED_LISTS[kind]]?.includes(id)) return;
    const name = (collection, key) => state[collection].find(row => row.id === key)?.label ?? key ?? 'Unspecified';
    const values = kind === 'dependency' ? [
      ['Work preparing the handoff', name('work', raw[prefix + 'fromWorkId'])],
      ['Work receiving the handoff', name('work', raw[prefix + 'toWorkId'])],
    ] : kind === 'wait' ? [
      ['Wait', raw[prefix + 'label']], ['Reason', raw[prefix + 'reason'] || 'Unspecified'],
      ['Person receiving the result', name('people', raw[prefix + 'receiverPersonId'])],
    ] : kind === 'proposal' ? [
      ['Proposed session', raw[prefix + 'label']], ['Team', name('teams', raw[prefix + 'teamId'])],
      ['People', raw[prefix + 'personIds'].map(personId => name('people', personId)).join(', ') || 'Unspecified'],
      ['Time per person', raw[prefix + 'minutesPerOccurrence'] + ' × ' + raw[prefix + 'occurrences'] + ' working sessions'],
    ] : [['Person', name('people', id)], ['Saved availability', raw['availability.' + id + '.known'] === 'yes' ? 'Entered in an earlier arrangement' : 'Unknown']];
    const reading = node('dl', undefined, 'native-score__field native-score__field--prose');
    for (const [label, value] of values) reading.append(node('dt', label), node('dd', value));
    fields.append(reading);
    contextActions.append(button('Remove this ' + LABELS[kind], 'remove', 'native-control--remove'));
  }
  function buildFields(raw, state, cadence) {
    const signature = JSON.stringify([selected, periodId, raw.stageIds, raw.gateIds, cadence?.periods, cadence?.handoffs.map(row => row.id), cadence?.delays.map(row => row.id)]);
    if (signature === fieldSignature && lastProjection === state) return;
    fieldSignature = signature; lastProjection = state; controls.clear(); fields.replaceChildren(); contextActions.replaceChildren();
    actions.querySelector('[data-score-action="remove"]')?.remove();
    inspector.dataset.recordKind = selected.kind;
    const people = [['', 'Choose when known'], ...state.people.map(row => [row.id, row.label])];
    const periods = [['', 'Choose a period'], ...(cadence?.periods ?? []).map(row => [row.id, row.label])];
    const endpoints = [...state.work.map(row => ['work:' + row.id, row.label]), ...raw.stageIds.map(id => ['stage:' + id, raw['stage.' + id + '.label'] || 'New stage'])];
    const patch = (collection, id, property, value) => changeCadence(next => ({ ...next, [collection]: next[collection].map(row => row.id === id ? { ...row, [property]: value } : row) }));
    const ownedField = (collection, property, label, options = {}) => {
      const row = cadence?.[collection].find(row => row.id === selected.id); if (!row) return;
      const read = () => cadenceFrom(editor.read().draft?.raw ?? raw)?.[collection].find(row => row.id === selected.id)?.[property];
      field(collection + '.' + selected.id + '.' + property, label, () => { const value = read(); return value && typeof value === 'object' ? value.kind + ':' + value.id : value ?? ''; },
        value => patch(collection, selected.id, property, options.endpoint ? { kind: value.split(':')[0], id: value.split(':')[1] } : options.nullable ? value || null : value), options);
    };
    if (Object.hasOwn(RETAINED_LISTS, selected.kind) || selected.kind === 'legacy-availability') {
      retainedFields(raw, state);
    } else if (selected.kind === 'stage' && raw.stageIds.includes(selected.id)) {
      rawField('stage.' + selected.id + '.label', raw);
      rawField('stage.' + selected.id + '.workIds', raw, state.work.map(row => [row.id, row.label]), true);
    } else if (selected.kind === 'gate' && raw.gateIds.includes(selected.id)) {
      for (const name of ['label', 'question', 'evidence']) rawField('gate.' + selected.id + '.' + name, raw);
      field('decision-anchor', 'Decision follows', () => {
        const anchor = cadenceFrom(editor.read().draft?.raw ?? raw)?.decisionAnchors.find(row => row.gateId === selected.id);
        return anchor ? anchor.kind + ':' + anchor.id : '';
      }, value => {
        const [kind, id] = value.split(':');
        writeRaw('gate.' + selected.id + '.afterStageId', kind === 'stage' ? id : '');
        changeCadence(next => ({ ...next, decisionAnchors: [...next.decisionAnchors.filter(row => row.gateId !== selected.id), { gateId: selected.id, kind, id }] }));
      }, { choices: [...raw.stageIds.map(id => ['stage:' + id, raw['stage.' + id + '.label'] || 'New stage']),
        ...(cadence?.handoffs ?? []).map(row => ['handoff:' + row.id, 'Handoff · ' + row.id])] });
      rawField('gate.' + selected.id + '.reviewerPersonId', raw, people);
      rawField('gate.' + selected.id + '.modeledDecision', raw, Object.entries(CHOICES));
    } else if (selected.kind === 'handoff') {
      ownedField('handoffs', 'from', 'From work', { choices: endpoints, endpoint: true });
      ownedField('handoffs', 'to', 'To work', { choices: endpoints, endpoint: true });
      ownedField('handoffs', 'connectionId', 'Team connection (optional)', { choices: [['', 'Choose when useful'], ...state.connections.map(row => [row.id, row.sharedObject])], nullable: true });
      fields.lastElementChild?.classList.add('native-score__field--connection');
    } else if (selected.kind === 'delay') {
      ownedField('delays', 'label', 'Delay name');
      ownedField('delays', 'anchor', 'Affected work or handoff', { choices: [...endpoints, ...(cadence?.handoffs ?? []).map(row => ['handoff:' + row.id, 'Handoff · ' + row.id])], endpoint: true });
      ownedField('delays', 'fromPeriodId', 'Originally planned in', { choices: periods, nullable: true });
      ownedField('delays', 'toPeriodId', 'Proposed later period', { choices: periods, nullable: true });
      ownedField('delays', 'reason', 'What needs time', { prose: true, nullable: true });
      ownedField('delays', 'receiverPersonId', 'Person receiving the result', { choices: people, nullable: true });
      contextActions.append(button('Preview affected sessions in the later period', 'move-delayed'));
    } else if (selected.kind === 'person' && cadence) {
      field('availability-period', 'Period', () => periodId ?? cadence.periods[0]?.id ?? '', value => { periodId = value; fieldSignature = ''; render(); }, { choices: periods.slice(1) });
      const selectedPeriod = periodId ?? cadence.periods[0]?.id;
      field('availability-minutes', 'Available minutes in this period', () => cadenceFrom(editor.read().draft?.raw ?? raw)?.availability.find(row => row.personId === selected.id && row.periodId === selectedPeriod)?.availableMinutes ?? '',
        value => {
          if (value !== '' && (!Number.isSafeInteger(Number(value)) || Number(value) < 0)) { announce('Enter whole minutes, or leave the available time blank.'); return; }
          changeCadence(next => ({ ...next, availability: [...next.availability.filter(row => row.personId !== selected.id || row.periodId !== selectedPeriod),
            ...(value === '' ? [] : [{ personId: selected.id, periodId: selectedPeriod, availableMinutes: Number(value) }])] }));
        }, { numeric: true, placeholder: 'Unknown' });
      const personLink = button('Open person settings', 'person-settings', 'native-control--navigate'); contextActions.append(personLink);
    }
    if (['stage', 'handoff'].includes(selected.kind) && selected.id && !created.has(selected.kind + ':' + selected.id)) {
      contextActions.append(button('Add decision here', 'add-decision', 'native-control--create'), button('Add delay here', 'add-delay', 'native-control--create'));
    }
    if (['stage', 'handoff', 'gate', 'delay'].includes(selected.kind) && selected.id && !created.has(selected.kind + ':' + selected.id)) actions.append(button('Remove this ' + LABELS[selected.kind], 'remove', 'native-control--remove'));
  }
  function render() {
    const current = editor.read(); if (disposed) return current;
    const raw = current.draft?.raw ?? startingScoreRaw(current.projection.state), cadence = cadenceFrom(raw), state = current.projection.state;
    const editable = current.status === 'editing';
    const displayedCadence = editable ? cadence : state.scoreSettings.cadence;
    if (periodId && !displayedCadence?.periods.some(row => row.id === periodId)) periodId = null;
    for (const input of basisChoices.querySelectorAll('input')) input.checked = input.value === displayedCadence?.basis;
    if (loadedPlanId && !state.work.some(item => item.id === loadedPlanId)) loadedPlanId = null;
    let proposed = null; if (editable && current.draft && !composing) proposed = operate('preview', current.draft.token);
    if (disposed) return current;
    const reading = proposed?.ok ? proposed.projection : current.projection;
    view.refresh(reading, { periodId, loadedPlanId, selected, preview: Boolean(proposed?.ok && current.draft.changed) });
    onViewChanged();
    const isNew = created.has(selected.kind + ':' + selected.id);
    title.textContent = isNew ? 'New ' + LABELS[selected.kind] : selected.kind === 'horizon' ? 'Arrange the work' : 'Inspect ' + (LABELS[selected.kind] ?? 'the work');
    if (isNew && selected.kind === 'gate') {
      const anchor = cadence?.decisionAnchors.find(row => row.gateId === selected.id);
      const name = endpoint => endpoint.kind === 'stage' ? raw['stage.' + endpoint.id + '.label']
        : state.work.find(row => row.id === endpoint.id)?.label;
      const handoff = anchor?.kind === 'handoff' && cadence.handoffs.find(row => row.id === anchor.id);
      const context = anchor?.kind === 'stage' ? name(anchor) : handoff ? name(handoff.from) + ' → ' + name(handoff.to) : null;
      if (context) title.textContent = 'New decision for ' + context;
    }
    detail.textContent = Object.hasOwn(RETAINED_LISTS, selected.kind) || selected.kind === 'legacy-availability'
      ? 'This reference was saved in an earlier arrangement. Inspect it here, then remove it if it no longer belongs in this plan. Apply keeps the removal; Cancel restores it.'
      : selected.kind === 'stage' ? 'Group the sessions that support this stage. Their people and duration stay with each session.'
      : selected.kind === 'handoff' ? 'Choose the work that passes a result, then the work that receives it.'
        : selected.kind === 'gate' ? 'Name the question and the person who will review the evidence.'
          : selected.kind === 'delay' ? 'Describe what needs more time. Move the affected sessions when you are ready to revise their placement.'
            : selected.kind === 'person' ? 'Available time describes this period. Leave it blank when unknown; funded time has its own meaning.'
              : 'Choose a session in the visual to set its people and duration. Stages and handoffs explain how the work fits together.';
    buildFields(raw, state, cadence);
    for (const { input, value, multiple } of controls.values()) {
      const next = value(); if (multiple) for (const check of input.querySelectorAll('input')) check.checked = (next ?? []).includes(check.value);
      else if (input.value !== String(next ?? '')) input.value = next ?? '';
    }
    fields.disabled = !editable; fields.hidden = !fields.children.length; contextActions.hidden = !current.draft || !contextActions.children.length;
    const inspectorHome = displayedCadence ? view.getSessionSlot() : flowPanel;
    if (inspector.parentElement !== inspectorHome) inspectorHome.append(inspector);
    if (!displayedCadence && inspectorOpen) flowPanel.open = true;
    inspector.hidden = !inspectorOpen || !current.draft || selected.kind === 'horizon';
    recovery.hidden = !current.draft || (!['stale', 'parked'].includes(current.status)
      && current.error?.code !== 'cadence-conflict' && proposed?.error?.code !== 'cadence-conflict');
    const changed = Boolean(current.draft?.changed);
    preview.textContent = proposed?.ok ? 'Accepted investment ' + money(current.projection.result.knownCommitmentCents) + ' · proposed investment ' + money(proposed.projection.result.knownCommitmentCents) + '.'
      : current.draft ? 'Review the entries before applying this arrangement.' : '';
    pendingText.textContent = arrangementNote + ' ' + preview.textContent;
    pending.hidden = selected.kind !== 'horizon' || !changed;
    actions.hidden = !current.draft || selected.kind === 'horizon'; preview.hidden = ['horizon', 'handoff'].includes(selected.kind);
    apply.textContent = isNew ? 'Add ' + LABELS[selected.kind] + ' to plan' : 'Apply changes'; apply.disabled = !editable || composing || !changed;
    cancel.disabled = !current.draft;
    for (const el of pendingActions.children) el.disabled = !editable || composing;
    error.textContent = current.error?.message ?? (proposed && !proposed.ok ? proposed.error.message : '');
    root.dataset.scoreState = current.status;
    syncInspectorControls();
    return current;
  }
  function acceptScoreAddition(update, message) {
    if (disposed || !isActive()) return;
    const epoch = ++generation;
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    if (!owns(epoch) || !isActive() || editing.read().active) return;
    const prior = boundary();
    const base = studio.read(), settings = update(base.state.scoreSettings, base.state);
    if (!settings) return;
    const focusKey = document.activeElement?.dataset.cadenceKey;
    const result = studio.replace({ ...base.state, revision:base.state.revision + 1, scoreSettings:settings }, base);
    if (!result.ok) { announce(result.error.message); return; }
    const accepted = { ...prior, projection: result.projection };
    if (!retains(epoch, accepted)) return;
    inspectorOpen = false; fieldSignature = '';
    if (!publishAccepted(epoch, accepted)) return;
    announce(message);
    [...root.querySelectorAll('[data-cadence-key]')].find(control => control.dataset.cadenceKey === focusKey)?.focus({ preventScroll:true });
  }
  function addStage() {
    acceptScoreAddition(settings => ({ ...settings, stages:[...settings.stages,
      { id:freshId('stage', settings.stages), label:nextCreatedLabel(settings.stages, 'stage'), workIds:[] }] }),
    'Stage added. Select it to choose its supporting sessions.');
  }
  function addHandoff() {
    if (studio.read().state.work.length < 2) { announce('Add two working sessions before connecting them.'); return; }
    acceptScoreAddition((settings, state) => {
      const cadence = settings.cadence; if (!cadence) return null;
      const id = freshId('handoff', cadence.handoffs), [first, second] = state.work;
      const from = cadence.handoffs[0]?.from ?? { kind:'work', id:first.id };
      const to = cadence.handoffs[0]?.to ?? { kind:'work', id:second.id };
      return { ...settings, cadence:{ ...cadence, handoffs:[...cadence.handoffs, { id, from, to, connectionId:null }] } };
    }, 'Handoff added. Select it to choose the connected work.');
  }
  function addDecision(anchor = selected) {
    acceptScoreAddition(settings => {
      if (!settings.cadence) return null;
      const id = freshId('gate', settings.gates);
      return { ...settings, gates:[...settings.gates, { id, label:nextCreatedLabel(settings.gates, 'decision'),
        afterStageId:anchor.kind === 'stage' ? anchor.id : null, reviewerPersonId:null,
        question:'What evidence would let the receiving team proceed?', evidence:null, modeledDecision:'open' }],
      cadence:{ ...settings.cadence, decisionAnchors:[...settings.cadence.decisionAnchors, { gateId:id, kind:anchor.kind, id:anchor.id }] } };
    }, 'Decision added. Select it to adjust its question and reviewer.');
  }
  function addDelay(anchor = selected) {
    acceptScoreAddition((settings, state) => {
      let cadence = settings.cadence;
      if (!cadence) return null;
      const id = freshId('delay', cadence.delays), affected = new Set(affectedWorkIds(anchor, cadence, startingScoreRaw(state)));
      const placed = new Set(cadence.placements.filter(row => affected.has(row.workId)).map(row => row.periodId));
      const from = periodId && placed.has(periodId) ? periodId : cadence.periods.find(row => placed.has(row.id))?.id ?? null;
      const index = cadence.periods.findIndex(row => row.id === from);
      if (index === cadence.periods.length - 1 && cadence.periods.length < CADENCE_PERIOD_LIMIT)
        cadence = resizeCadence(cadence, cadence.periods.length + 1);
      const to = index >= 0 ? cadence.periods[index + 1]?.id ?? null : null;
      return { ...settings, cadence:{ ...cadence, delays:[...cadence.delays,
        { id, label:nextCreatedLabel(cadence.delays, 'delay'), anchor:{ kind:anchor.kind, id:anchor.id },
          fromPeriodId:from, toPeriodId:to, reason:'Clarify the receiving team’s questions before proceeding.', receiverPersonId:null }] } };
    }, 'Delay added. Select it to adjust the affected work.');
  }
  function removeSelected() {
    const current = editor.read(); if (!current.draft || current.status !== 'editing') return;
    const cadence = cadenceFrom(current.draft.raw);
    const retainedList = RETAINED_LISTS[selected.kind];
    if (retainedList || selected.kind === 'legacy-availability') {
      const { token, raw } = current.draft;
      if (selected.kind === 'legacy-availability') {
        operate('setText', token, 'availability.' + selected.id + '.known', 'no');
        operate('setIds', token, 'availability.' + selected.id + '.intervalIds', []);
      } else {
        if (selected.kind === 'proposal') operate('setIds', token, 'fundProposalIds', raw.fundProposalIds.filter(id => id !== selected.id));
        operate('setIds', token, retainedList, raw[retainedList].filter(id => id !== selected.id));
      }
      arrangementNote = 'The retained reference will be removed when you Apply. Cancel keeps the saved arrangement.';
      selected = { kind: 'horizon', id: '' }; fieldSignature = ''; render(); onEditing(); return;
    }
    const referred = cadence && (cadence.handoffs.some(row => [row.from, row.to].some(end => end.kind === selected.kind && end.id === selected.id))
      || cadence.decisionAnchors.some(row => row.kind === selected.kind && row.id === selected.id)
      || cadence.delays.some(row => row.anchor.kind === selected.kind && row.anchor.id === selected.id));
    if (referred) { announce('Move or remove the related handoffs, decisions and delays before removing this ' + LABELS[selected.kind] + '.'); return; }
    if (selected.kind === 'handoff') {
      const handoff = cadence?.handoffs.find(row => row.id === selected.id), raw = current.draft.raw;
      const matches = id => id === selected.id || handoff?.from.kind === 'work' && handoff?.to.kind === 'work'
        && raw['dependency.' + id + '.fromWorkId'] === handoff.from.id && raw['dependency.' + id + '.toWorkId'] === handoff.to.id;
      operate('setIds', current.draft.token, 'dependencyIds', raw.dependencyIds.filter(id => !matches(id)));
    }
    if (['stage', 'gate'].includes(selected.kind)) writeRaw(selected.kind === 'stage' ? 'stageIds' : 'gateIds', current.draft.raw[selected.kind === 'stage' ? 'stageIds' : 'gateIds'].filter(id => id !== selected.id));
    const removed = selected;
    changeCadence(next => next === null ? null : ({ ...next,
      handoffs: removed.kind === 'handoff' ? next.handoffs.filter(row => row.id !== removed.id) : next.handoffs,
      delays: removed.kind === 'delay' ? next.delays.filter(row => row.id !== removed.id) : next.delays,
      decisionAnchors: removed.kind === 'gate' ? next.decisionAnchors.filter(row => row.gateId !== removed.id) : next.decisionAnchors }));
    arrangementNote = 'The ' + LABELS[removed.kind] + ' will be removed when you Apply. Cancel keeps the saved arrangement.';
    selected = { kind: 'horizon', id: '' }; fieldSignature = ''; render();
  }
  function affectedWorkIds(endpoint, cadence, raw) {
    if (endpoint.kind === 'work') return [endpoint.id];
    if (endpoint.kind === 'stage') return raw['stage.' + endpoint.id + '.workIds'] ?? [];
    const handoff = cadence.handoffs.find(row => row.id === endpoint.id);
    return handoff ? affectedWorkIds(handoff.to, cadence, raw) : [];
  }
  function moveDelayedSessions() {
    const current = editor.read(), cadence = current.draft && cadenceFrom(current.draft.raw);
    const delay = cadence?.delays.find(row => row.id === selected.id);
    if (!delay?.toPeriodId) { announce('Choose the later period first.'); return; }
    const affected = new Set(affectedWorkIds(delay.anchor, cadence, current.draft.raw));
    const matches = row => affected.has(row.workId) && (!delay.fromPeriodId || row.periodId === delay.fromPeriodId) && row.periodId !== delay.toPeriodId;
    if (!cadence.placements.some(matches)) { announce('Choose a period containing the affected sessions before previewing their move.'); return; }
    changeCadence(next => ({ ...next, placements: next.placements.map(row => matches(row) ? { ...row, periodId: delay.toPeriodId } : row) }));
    announce('Preview the moved sessions in ' + cadence.periods.find(row => row.id === delay.toPeriodId).label + '. Their people, duration and price are retained.');
  }
  function settle(method) {
    const current = editor.read(); if (disposed || !current.draft || composing && method === 'apply') return;
    const origin = selected;
    const epoch = ++generation, result = operate(method, current.draft.token); if (!owns(epoch)) return;
    if (!result.ok) { render(); announce(result.error.message); return; }
    created.clear();
    arrangementNote = 'Previewing the new horizon. Sessions and their effort are retained.';
    selected = { kind: 'horizon', id: '' }; fieldSignature = ''; inspectorOpen = false;
    const settled = boundary();
    if (method === 'apply') {
      if (!publishAccepted(epoch, settled)) return;
    } else {
      render();
      if (!retains(epoch, settled)) return;
      onEditing();
      if (!retains(epoch, settled)) return;
    }
    announce(method === 'apply' ? 'Arrangement applied. Undo restores the previous plan.' : 'Changes cancelled.');
    if (!owns(epoch) || editing.read().active) return;
    const prefix = (origin.kind === 'gate' ? 'decision' : origin.kind) + ':' + origin.id;
    const entries = [...projectionRoot.querySelectorAll('[data-cadence-key]')];
    const marker = entries.find(el => el.dataset.cadenceKey === inspectionEntryKey)
      ?? entries.find(el => el.dataset.cadenceKey === prefix || el.dataset.cadenceKey.startsWith(prefix + ':'));
    inspectionEntryKey = null;
    if (marker) { const disclosure = marker.closest('details'); if (disclosure) disclosure.open = true; }
    const destination = marker ?? flowSummary; destination.focus({ preventScroll: true });
  }
  function closeInspection() {
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    inspectorOpen = false; render(); onEditing();
    const source = [...projectionRoot.querySelectorAll('[data-cadence-key]')].find(control => control.dataset.cadenceKey === inspectionEntryKey);
    source?.focus({ preventScroll: true });
  }
  function click(event) {
    const control = event.target.closest('[data-score-action]'); if (!control || !root.contains(control) || disposed || !isActive()) return;
    const action = control.dataset.scoreAction;
    if (action === 'apply') { event.preventDefault(); settle('apply'); }
    else if (action === 'cancel') settle('cancel');
    else if (action === 'close') closeInspection();
    else if (action === 'add-period') addPeriod();
    else if (action === 'add-stage') addStage();
    else if (action === 'add-handoff') addHandoff();
    else if (action === 'add-decision') addDecision();
    else if (action === 'add-delay') addDelay();
    else if (action === 'move-delayed') moveDelayedSessions();
    else if (action === 'remove') removeSelected();
    else if (action === 'person-settings') navigate({ kind: 'person', id: selected.id });
    else if (action === 'chapter') navigate({ kind: 'chapter', id: control.dataset.scoreChapter });
    else if (action === 'example') {
      const parked = editing.park(); if (!parked.ok) announce(parked.error.message); else onExample(control.dataset.presetId);
    } else if (action === 'review' || action === 'current') { const current = editor.read(); if (current.draft) { operate(action === 'review' ? 'review' : 'useCurrent', current.draft.token, studio.read()); render(); onEditing(); } }
  }
  listen(root, 'click', click);
  listen(basisChoices, 'change', event => {
    if (!Object.hasOwn(event.target.dataset, 'cadenceBasis') || !isActive()) return;
    const basis = event.target.value;
    periodId = null;
    acceptCadence(current => current ? regroupCadence(current, basis) : createCadence(basis, basis === 'quarter' ? 2 : 4),
      'The plan now uses ' + (basis === 'quarter' ? 'business quarters' : 'sprints') + '. Undo restores the previous horizon.');
  });
  function input(event) {
    const item = controls.get(event.target.dataset.cadenceField); if (!item || !editor.read().draft || editor.read().status !== 'editing') return;
    const discrete = item.multiple || item.input.tagName === 'SELECT';
    if (discrete ? event.type !== 'change' : event.type !== 'input' && event.type !== 'compositionend') return;
    item.write(item.multiple ? [...item.input.querySelectorAll('input:checked')].map(el => el.value) : event.target.value);
  }
  listen(form, 'input', input); listen(form, 'change', input);
  listen(form, 'compositionstart', () => { composing = true; }); listen(form, 'compositionend', event => { composing = false; input(event); });
  listen(form, 'submit', event => { event.preventDefault(); settle('apply'); });
  function close({ park = true } = {}) { if (disposed) return; ++generation; composing = false; inspectorOpen = false; inspector.hidden = true; if (park && editing.read().active?.kind === 'score') editing.park(); }
  function dispose() {
    if (disposed) return; const active = editing.read().active; retiredToken = active?.kind === 'score' ? active.token : null;
    close(); disposed = true; operate('read'); view.dispose(); topApply.dispose(); cleanup.splice(0).forEach(release => release());
    for (const el of [toolbar, pending, projectionRoot, flowPanel, status]) el.remove(); if (fallback) fallback.hidden = false; INSTANCES.delete(root);
  }
  render();
  const controller = Object.freeze({ open, close, refresh: render, resume: () => open('score', false), select,
    getSessionSlot: () => view.getSessionSlot(),
    showPlan: id => { loadedPlanId = id; render(); }, dispose }); INSTANCES.set(root, controller); return controller;
}
