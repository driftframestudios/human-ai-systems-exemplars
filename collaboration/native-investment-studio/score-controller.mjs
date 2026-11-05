import { createScoreView, scoreMinute } from './score-view.mjs';
import { scoreField, startingScoreRaw } from './score-draft.mjs';
import { selectScoreIntervalWork } from './score-models.mjs';
import { money } from './display.mjs';
import { resolveScoreDestination } from './navigation-policy.mjs';

const INSTANCES = new WeakMap();
let sequence = 0;
const KINDS = Object.freeze({ work: 'Sessions', person: 'Availability', dependency: 'Handoffs', stage: 'Stages', wait: 'Waits', gate: 'Decisions', proposal: 'Next & options', window: 'Time basis' });
const LISTS = Object.freeze({ work: 'timedWorkIds', person: 'availabilityPersonIds', dependency: 'dependencyIds', stage: 'stageIds', wait: 'waitIds', gate: 'gateIds', proposal: 'proposalIds' });
const FIELDS = Object.freeze({
  window: ['windowEnabled', 'windowLabel', 'windowStartMinute', 'windowEndMinute'],
  work: ['timed', 'startMinute', 'repeatEveryMinutes'],
  dependency: ['fromWorkId', 'toWorkId', 'lagMinutes', 'connectionId'], stage: ['label', 'workIds'],
  wait: ['label', 'startMinute', 'endMinute', 'reason', 'receiverPersonId'],
  gate: ['label', 'afterStageId', 'reviewerPersonId', 'question', 'evidence', 'modeledDecision'],
  proposal: ['label', 'bank', 'gateId', 'teamId', 'personIds', 'minutesPerOccurrence', 'occurrences', 'funding', 'status', 'timed', 'startMinute', 'repeatEveryMinutes'],
});
const CHOICE_LABELS = Object.freeze({ next: 'Next', options: 'Option', allocated: 'Within funded time', additional: 'Extra investment', planned: 'Planned', paused: 'Paused',
  open: 'Open for review', proceed: 'Proceed in this model', revise: 'Revise the plan', hold: 'Hold this commitment' });

export function mountScorePanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {}, onAccepted = () => {}, onNavigate = () => {}, onInspect = () => {},
  canOpen = () => true, isActive = canOpen }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, instance = `score-${++sequence}`, cleanup = [], controls = new Map(), editor = editing.score;
  let disposed = false, generation = 0, composing = false, selected = { kind: 'work', id: studio.read().state.work[0]?.id ?? '' };
  let scale = 1, focusWorkId = null, fieldSignature = null, fieldSequence = 0, lastProjection = null;
  let overlapIndex = 0;
  let retiredToken = null;
  const decisionOrigins = new Map();
  const owns = epoch => !disposed && generation === epoch;
  const boundary = () => { const current = editing.read(); return { projection: studio.read(), intent: current.intent, token: current.active?.token ?? null }; };
  const retains = (epoch, mark) => {
    const current = editing.read();
    return owns(epoch) && studio.read() === mark.projection && current.intent === mark.intent && (current.active?.token ?? null) === mark.token;
  };
  function releaseRetiredLease() {
    if (retiredToken === null) return;
    const active = editing.read().active;
    if (active?.kind !== 'score' || active.token !== retiredToken) { retiredToken = null; return; }
    const result = editing.park();
    if (result.ok || result.error.code !== 'settling') retiredToken = null;
  }
  function operate(method, ...args) {
    try { return editor[method](...args); }
    finally { releaseRetiredLease(); }
  }
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
  const listen = (el, type, fn) => { el.addEventListener(type, fn); cleanup.push(() => el.removeEventListener(type, fn)); };
  function button(text, action) {
    const el = node('button', text); el.type = 'button'; el.dataset.scoreAction = action;
    if (['chapter', 'source', 'open'].includes(action)) el.classList.add('native-control--navigate');
    return el;
  }
  function announce(text) { if (!disposed) status.textContent = text; }
  const toolbar = node('div', undefined, 'native-score__transport'); toolbar.setAttribute('aria-label', 'Horizon view');
  const viewChoices = node('div', undefined, 'native-score__view-choices'); viewChoices.setAttribute('role', 'group'); viewChoices.setAttribute('aria-label', 'View scale');
  const scaleButtons = new Map();
  for (const [value, label] of [[1, 'Whole plan'], [2, '2×'], [4, '4×']]) {
    const choice = button(label, 'scale'); choice.dataset.scoreScale = String(value); viewChoices.append(choice); scaleButtons.set(value, choice);
  }
  const resetFocus = button('Show all sessions', 'reset-focus'), arrange = button('Arrange timing', 'open'); resetFocus.hidden = true;
  const links = node('div', undefined, 'native-score__chapter-links'); links.setAttribute('role', 'group'); links.setAttribute('aria-label', 'Go to chapter');
  links.append(node('span', 'Go to chapter', 'native-score__group-label'));
  for (const [kind, label] of [['change', 'Change'], ['assurance', 'Quality & recovery'], ['investment', 'Investment']]) {
    const link = button(label, 'chapter');
    link.classList.add('native-score__navigate'); link.setAttribute('aria-label', `Go to ${label}`); link.dataset.scoreChapter = kind; links.append(link);
  }
  toolbar.append(viewChoices, resetFocus, arrange, links);
  const projectionRoot = node('div', undefined, 'native-score__projection'); projectionRoot.dataset.scoreProjection = '';
  const inspector = node('details', undefined, 'native-score__inspector');
  const inspectorSummary = node('summary'), title = node('h4', 'Inspect the arrangement'); title.id = `${instance}-inspect-title`; inspectorSummary.append(title);
  const rail = node('div', undefined, 'native-score__keys'); rail.setAttribute('aria-label', 'Inspect the arrangement');
  for (const [kind, label] of Object.entries(KINDS)) { const key = button(label, 'kind'); key.dataset.scoreKind = kind; rail.append(key); }
  const form = node('form'); form.noValidate = true; form.dataset.scoreForm = '';
  const recovery = node('div', undefined, 'native-coordination__recovery'); recovery.hidden = true;
  recovery.append(node('p', 'Your arrangement entries are saved. Review them against the current plan to continue.'), button('Review saved edits', 'review'), button('Use current values', 'current'), button('Discard saved edits', 'cancel'));
  const pickerLabel = node('label', 'Choose a session'), picker = node('select'); picker.id = `${instance}-record`; pickerLabel.htmlFor = picker.id;
  const pickerRow = node('div', undefined, 'native-score__picker'); pickerRow.append(pickerLabel, picker);
  const editFields = node('fieldset'); editFields.dataset.scoreFields = ''; editFields.setAttribute('aria-label', 'Arrangement settings');
  const fields = node('div', undefined, 'native-score__fields'), recordActions = node('div', undefined, 'native-coordination__actions');
  const add = button('Add record', 'add'), remove = button('Remove record', 'remove'), addInterval = button('Add available interval', 'add-interval');
  remove.className = 'native-control--remove'; add.className = addInterval.className = 'native-control--create'; recordActions.append(add, remove, addInterval);
  const detail = node('p', '', 'native-score__record-note'); detail.dataset.scoreRecordNote = '';
  const navigation = node('div', undefined, 'native-coordination__actions');
  const overlapReading = node('div', undefined, 'native-score__overlap');
  const overlapLabel = node('label', 'Inspect an overlapping interval'), overlapChoice = node('select'), overlapNames = node('p');
  overlapChoice.id = `${instance}-overlap`; overlapLabel.htmlFor = overlapChoice.id; overlapReading.append(overlapLabel, overlapChoice, overlapNames);
  const source = button('Open session settings', 'source'), focus = button('Focus this session', 'focus'); navigation.append(source, focus);
  editFields.append(fields, recordActions);
  const preview = node('p', '', 'native-score__preview'); preview.dataset.scorePreview = '';
  const error = node('p', '', 'native-coordination__error'); error.dataset.scoreError = ''; error.setAttribute('role', 'alert');
  const actions = node('div', undefined, 'native-coordination__actions');
  const apply = button('Apply arrangement', 'apply'); apply.type = 'submit'; const cancel = button('Cancel changes', 'cancel');
  const keepDecision = button('Keep draft and inspect arrangement', 'keep-decision'); keepDecision.className = 'native-control--navigate';
  actions.append(apply, cancel, keepDecision);
  const status = node('p', '', 'native-coordination__status'); status.dataset.scoreStatus = ''; status.setAttribute('role', 'status');
  form.append(recovery, pickerRow, detail, navigation, overlapReading, editFields, preview, error, actions, status);
  inspector.append(inspectorSummary, rail, form);
  const fallback = root.querySelector('[data-score-fallback]'); if (fallback) fallback.hidden = true;
  const manual = node('details', undefined, 'native-score__manual'); manual.append(node('summary', 'How time, effort and decisions relate'),
    node('p', 'Schedule sessions in elapsed hours and minutes from the start of this plan. Choose when the first session starts and, for repeated sessions, the time from one start to the next. The session count sets how many run. Elapsed time includes off-hours; availability describes when a person can join. Funded time describes how much effort is already paid for.'),
    node('p', 'Waiting occupies elapsed time and carries no participant effort. Model response work as a session when people must spend time on it. A dependency connects the last finish of earlier work to the first start of later work.'),
    node('p', 'Next and Options retain proposed work separately. A modeled Proceed decision makes a linked proposal eligible; select Add to planned work and Apply to fund it. Real decisions remain with the named people and their evidence.'),
    node('p', 'The quality reference uses 80 hours per sprint and 520 hours per quarter. Those staffing reference conversions are separate from elapsed minutes in this horizon. Changing the view scale changes only what you see.'));
  root.append(toolbar, projectionRoot, inspector, manual);
  const view = createScoreView(projectionRoot, { onSelect(target) { select(target, true); }, onNavigate(target) { navigate(target); }, onAddDecision: addDecision });

  function labels(kind, raw, state) {
    if (kind === 'window') return [['window', 'Time basis']];
    const rows = raw[LISTS[kind]] ?? [];
    const current = new Map((kind === 'work' ? state.work : kind === 'person' ? state.people : []).map(row => [row.id, row.label]));
    return rows.map(id => [id, kind === 'work' || kind === 'person' ? current.get(id) ?? `${id} · removed; repair this reference`
      : kind === 'dependency' ? `${state.work.find(row => row.id === raw[`dependency.${id}.fromWorkId`])?.label ?? 'Earlier work'} → ${state.work.find(row => row.id === raw[`dependency.${id}.toWorkId`])?.label ?? 'Later work'}`
        : raw[`${kind}.${id}.label`] || `New ${kind}`]);
  }
  function options(metadata, raw, state) {
    if (metadata.choices) return metadata.choices.map(id => [id, CHOICE_LABELS[id] ?? id]);
    if (metadata.source === 'stages') return labels('stage', raw, state);
    if (metadata.source === 'gates') return labels('gate', raw, state);
    if (metadata.source === 'proposals') return labels('proposal', raw, state);
    return (state[metadata.source] ?? []).map(row => [row.id, row.label ?? row.sharedObject ?? row.id]);
  }
  const isNewDecision = (raw, state) => selected.kind === 'gate' && raw.gateIds.includes(selected.id)
    && !state.scoreSettings.gates.some(row => row.id === selected.id);
  function field(parent, key, raw, state) {
    const metadata = scoreField(key); if (!metadata) return;
    const radio = !metadata.checkbox && !metadata.source && metadata.choices?.length >= 2 && metadata.choices.length <= 4;
    const grouped = metadata.kind === 'ids' || radio, prose = ['question', 'evidence', 'reason'].includes(key.split('.').at(-1));
    const group = node(grouped ? 'fieldset' : 'div', undefined, `native-score__field${prose ? ' native-score__field--prose' : ''}`);
    const caption = node(grouped ? 'legend' : 'label', metadata.label), input = node(grouped ? 'div' : metadata.source || metadata.choices && !metadata.checkbox ? 'select' : prose ? 'textarea' : 'input');
    input.id = `${instance}-field-${++fieldSequence}`; input.dataset.scoreField = key; input.name = key;
    if (!grouped) caption.htmlFor = input.id;
    const message = node('p', '', 'native-coordination__error'); message.id = `${input.id}-error`;
    input.setAttribute('aria-describedby', message.id);
    if (grouped) {
      input.className = radio ? 'native-score__segments' : 'native-score__choices';
      const rows = options(metadata, raw, state), present = new Set(rows.map(([id]) => id));
      if (!radio) for (const id of raw[key] ?? []) if (!present.has(id)) rows.push([id, `${id} · removed; choose a current record`]);
      for (const [id, name] of rows) {
        const label = node('label'), check = node('input'); check.type = radio ? 'radio' : 'checkbox'; check.value = id; check.dataset.scoreField = key; check.name = `${instance}-${key}`;
        check.setAttribute('aria-describedby', message.id); label.append(check, node('span', name)); input.append(label);
      }
    } else if (input.tagName === 'SELECT') {
      const rows = options(metadata, raw, state); if (metadata.source) rows.unshift(['', metadata.optional ? 'Choose when useful' : 'Choose a record']);
      if (raw[key] && !rows.some(([id]) => id === raw[key])) rows.push([raw[key], `${raw[key]} · removed; choose a current record`]);
      for (const [id, name] of rows) { const option = node('option', name); option.value = id; input.append(option); }
    } else {
      if (input.tagName === 'INPUT') input.type = metadata.checkbox ? 'checkbox' : 'text';
      input.maxLength = metadata.maxLength;
      if (prose) input.rows = 4;
      if (metadata.numeric) { input.inputMode = metadata.time ? 'text' : 'numeric'; input.className = 'native-score__number'; }
    }
    let reading = null;
    if (prose && isNewDecision(raw, state)) {
      input.rows = 3; group.append(caption, input);
    } else if (prose) {
      reading = node('p', '', 'native-score__prose-reading'); reading.dataset.scoreProse = key;
      const edit = node('details', undefined, 'native-score__prose-editor'); edit.append(node('summary', `Edit ${metadata.label.toLowerCase()}`), caption, input);
      group.append(node('h5', metadata.label), reading, edit);
    } else group.append(caption, input);
    if (metadata.numeric) {
      const steps = node('div', undefined, 'native-coordination__stepper native-score__steps');
      for (const direction of [-1, 1]) { const step = button(direction < 0 ? '−' : '+', 'step'); Object.assign(step.dataset, { scoreField: key, scoreStep: String(direction) }); step.setAttribute('aria-label', `${direction < 0 ? 'Decrease' : 'Increase'} ${metadata.label.toLowerCase()}`); steps.append(step); }
      steps.insertBefore(input, steps.lastElementChild); group.append(steps);
      if (metadata.time) {
        const hint = node('small', '', 'native-score__time-hint'); hint.id = `${input.id}-time-hint`;
        hint.textContent = /^(work|proposal)\.[^.]+\.startMinute$/u.test(key)
          ? 'Time after the start of this plan. 0m starts immediately. Enter 11h30m or 690 minutes.'
          : /^(work|proposal)\.[^.]+\.repeatEveryMinutes$/u.test(key)
            ? 'Measure from one session start to the next. The session count sets how many run. Enter 1h or 60 minutes.'
            : 'Enter 11h30m or 690 minutes.';
        input.setAttribute('aria-describedby', `${hint.id} ${message.id}`); group.append(hint);
      }
    }
    group.append(message); parent.append(group); controls.set(key, { input, message, metadata, radio, reading });
  }
  function buildFields(raw, state, projection) {
    const intervals = selected.kind === 'person' ? raw[`availability.${selected.id}.intervalIds`] ?? [] : [];
    const signature = `${selected.kind}:${selected.id}:${intervals.join(',')}:${raw.stageIds.join(',')}:${raw.gateIds.join(',')}:${raw.proposalIds.join(',')}`;
    if (signature === fieldSignature && lastProjection === projection) return;
    fieldSignature = signature; lastProjection = projection; controls.clear(); fields.replaceChildren();
    if (selected.kind === 'person' && selected.id) {
      field(fields, `availability.${selected.id}.known`, raw, state);
      for (const id of intervals) {
        const group = node('section', undefined, 'native-score__interval'); group.append(node('h5', 'Available interval'));
        field(group, `availability.${selected.id}.${id}.startMinute`, raw, state); field(group, `availability.${selected.id}.${id}.endMinute`, raw, state);
        const remove = button('Remove this interval', 'remove-interval'); remove.dataset.scoreInterval = id; remove.className = 'native-control--remove'; group.append(remove); fields.append(group);
      }
    } else if (selected.kind === 'window' || selected.id) {
      for (const key of FIELDS[selected.kind]) field(fields, selected.kind === 'window' ? key : `${selected.kind}.${selected.id}.${key}`, raw, state);
      if (selected.kind === 'proposal') {
        const label = node('label', undefined, 'native-score__fund'), check = node('input'); check.type = 'checkbox'; check.dataset.scoreFund = selected.id;
        label.append(check, node('span', 'Add this proposal to planned work when I Apply')); fields.append(label);
      }
    }
  }
  function render() {
    const current = editor.read(); if (disposed) return current;
    const raw = current.draft?.raw ?? startingScoreRaw(current.projection.state), state = current.projection.state;
    const editable = current.status === 'editing', rows = labels(selected.kind, raw, state);
    if (focusWorkId && !state.work.some(row => row.id === focusWorkId)) focusWorkId = null;
    for (const [value, choice] of scaleButtons) choice.setAttribute('aria-pressed', String(scale === value));
    resetFocus.hidden = !focusWorkId;
    if (!rows.some(([id]) => id === selected.id)) selected = { kind: selected.kind, id: rows[0]?.[0] ?? '' };
    const selectionOptions = JSON.stringify(rows);
    if (picker.dataset.options !== selectionOptions) { picker.replaceChildren(...rows.map(([id, label]) => { const option = node('option', label); option.value = id; return option; })); picker.dataset.options = selectionOptions; }
    picker.value = selected.id; pickerLabel.textContent = `Choose ${selected.kind === 'work' ? 'a session' : selected.kind === 'person' ? 'a person' : selected.kind === 'dependency' ? 'a handoff' : selected.kind === 'proposal' ? 'proposed work' : selected.kind === 'gate' ? 'a decision' : `a ${selected.kind}`}`;
    const creatingDecision = isNewDecision(raw, state);
    inspector.dataset.creatingDecision = String(creatingDecision);
    title.textContent = creatingDecision ? 'New decision' : 'Inspect the arrangement';
    rail.hidden = creatingDecision; keepDecision.hidden = !creatingDecision;
    if (creatingDecision) { if (detail.nextElementSibling !== preview) form.insertBefore(detail, preview); }
    else if (detail.nextElementSibling !== navigation) form.insertBefore(detail, navigation);
    pickerRow.hidden = selected.kind === 'window' || creatingDecision;
    for (const key of rail.children) key.setAttribute('aria-pressed', String(key.dataset.scoreKind === selected.kind));
    buildFields(raw, state, current.projection);
    for (const [key, { input, message, metadata, radio, reading }] of controls) {
      const value = raw[key];
      if (metadata.kind === 'ids' || radio) for (const check of input.querySelectorAll('input')) check.checked = radio ? value === check.value : (value ?? []).includes(check.value);
      else if (metadata.checkbox) input.checked = value === 'yes'; else if (input.value !== value) input.value = value ?? '';
      if (reading) reading.textContent = value?.trim() ? value : 'Add this context when it is known.';
      const error = current.draft?.errors.find(row => row.path === `draft.${key}`); message.textContent = error?.message ?? ''; input.setAttribute('aria-invalid', String(Boolean(error)));
    }
    const fund = fields.querySelector('[data-score-fund]'); if (fund) fund.checked = raw.fundProposalIds.includes(selected.id);
    editFields.disabled = !editable; editFields.hidden = !current.draft; actions.hidden = !current.draft;
    recovery.hidden = !current.draft || !['stale', 'parked'].includes(current.status);
    apply.disabled = !editable || composing; cancel.disabled = !current.draft;
    apply.textContent = creatingDecision ? 'Add decision to plan' : 'Apply arrangement';
    cancel.textContent = creatingDecision ? 'Discard this decision' : 'Cancel changes';
    cancel.dataset.scoreAction = creatingDecision ? 'discard-decision' : 'cancel';
    arrange.textContent = current.draft ? 'Inspect arrangement' : 'Arrange timing';
    add.hidden = creatingDecision || ['work', 'person', 'window'].includes(selected.kind); add.textContent = `Add ${selected.kind === 'dependency' ? 'a handoff' : selected.kind === 'proposal' ? 'proposed work' : selected.kind === 'gate' ? 'a decision' : `a ${selected.kind}`}`;
    remove.hidden = creatingDecision || ['window'].includes(selected.kind) || !selected.id || ['work', 'person'].includes(selected.kind) && (selected.kind === 'work' ? state.work : state.people).some(row => row.id === selected.id);
    remove.textContent = ['work', 'person'].includes(selected.kind) ? 'Remove this missing reference' : `Remove this ${selected.kind === 'dependency' ? 'handoff' : selected.kind === 'gate' ? 'decision' : selected.kind}`;
    addInterval.hidden = selected.kind !== 'person' || !selected.id;
    recordActions.hidden = add.hidden && remove.hidden && addInterval.hidden;
    source.hidden = !['work', 'person'].includes(selected.kind) || !selected.id; source.textContent = selected.kind === 'person' ? 'Open person settings' : 'Open session settings';
    focus.hidden = selected.kind !== 'work' || !selected.id;
    const selectedWork = state.work.find(row => row.id === selected.id);
    detail.textContent = creatingDecision ? 'Name this new decision and add the context you know. Add decision to plan accepts it together with your other arrangement changes. Discard this decision keeps those other entries.' : selected.kind === 'work' && selectedWork ? `${selectedWork.label}: ${selectedWork.occurrences} × ${scoreMinute(selectedWork.minutesPerOccurrence)} per person. Timing changes the arrangement; session settings own duration, people and funding.`
      : selected.kind === 'person' ? 'Describe when this person is available. Unknown availability and explicitly empty availability retain different meanings.'
        : selected.kind === 'gate' ? 'This is a modeled decision. Name the person and evidence that would support a real review.'
          : selected.kind === 'proposal' ? 'Explore possible work here. Select Add to planned work and Apply to accept its commitment.'
            : selected.kind === 'wait' ? 'Waiting extends elapsed time. Add a working session when people must spend time responding.'
              : selected.kind === 'dependency' ? 'The later session starts after every occurrence of the earlier work and any waiting minutes. A linked paused connection suspends this obligation.'
                : 'Select a record to inspect it, or arrange timing to try a change.';
    if (['work', 'person', 'wait', 'window', 'proposal'].includes(selected.kind) && !creatingDecision) detail.textContent += ' The schedule uses elapsed time from the start of this plan, including off-hours.';
    let proposed = null;
    if (editable && current.draft && !composing) proposed = operate('preview', current.draft.token);
    if (disposed) return current;
    const reading = proposed?.ok ? proposed.projection : current.projection;
    view.refresh(reading, { selected, scale, focusWorkId, preview: proposed?.ok && current.draft.changed });
    const person = selected.kind === 'person' ? reading.score.capacity.find(row => row.personId === selected.id) : null;
    overlapReading.hidden = !person?.overlap.length;
    if (person?.overlap.length) {
      overlapIndex = Math.min(overlapIndex, person.overlap.length - 1);
      const rows = person.overlap.map((row, index) => [String(index), `${scoreMinute(row.startMinute)}–${scoreMinute(row.endMinute)} · ${row.concurrent} simultaneous sessions`]);
      const signature = JSON.stringify(rows);
      if (overlapChoice.dataset.options !== signature) { overlapChoice.replaceChildren(...rows.map(([value, label]) => { const option = node('option', label); option.value = value; return option; })); overlapChoice.dataset.options = signature; }
      overlapChoice.value = String(overlapIndex);
      const names = [...new Set(selectScoreIntervalWork(reading.score, person.personId, person.overlap[overlapIndex]).map(row => row.label))];
      overlapNames.textContent = `Work in this interval: ${names.join(', ')}.`;
    }
    const acceptanceAction = creatingDecision ? 'Add decision to plan' : 'Apply';
    preview.textContent = proposed?.ok ? `Accepted investment ${money(current.projection.result.knownCommitmentCents)} · proposed investment ${money(proposed.projection.result.knownCommitmentCents)}. ${proposed.summary.fundedWorkIds.length ? `${acceptanceAction} adds the selected proposals to planned work.` : `${acceptanceAction} accepts this arrangement.`}`
      : current.draft ? 'The horizon retains the accepted arrangement while these entries need review.' : 'Select a session, person or decision to inspect its timing and relationships.';
    error.textContent = current.error?.message ?? (proposed && !proposed.ok ? proposed.error.message : '');
    root.dataset.scoreState = current.status;
    return current;
  }
  function opened(result, epoch, focusField = false) {
    if (!owns(epoch)) return; composing = false; render(); if (!owns(epoch)) return;
    announce(result?.ok ? '' : result?.error?.message ?? '');
    const mark = boundary(); onEditing();
    if (!retains(epoch, mark)) return;
    inspector.open = true;
    if (focusField) (recovery.hidden ? fields.querySelector('input, select') ?? add : recovery.querySelector('button'))?.focus();
    return { result, epoch, mark };
  }
  function beginOpen(_target = 'score', focusField = true) {
    if (disposed || !canOpen()) return;
    const epoch = ++generation, before = boundary(); onBegin();
    const active = editing.read().active;
    if (!owns(epoch) || studio.read() !== before.projection || editing.read().intent !== before.intent
      || (active && active.token !== before.token)) return;
    return opened(operate('begin', 'score', studio.read()), epoch, focusField);
  }
  function open(target = 'score', focusField = true) { return beginOpen(target, focusField)?.result; }
  function select(target, reveal = false) {
    if (!Object.hasOwn(KINDS, target.kind)) return;
    selected = target; overlapIndex = 0; fieldSignature = null;
    let completion;
    if (!editor.read().draft || editing.read().active?.kind !== 'score') completion = beginOpen('score', false);
    else { const epoch = generation, mark = boundary(); render(); if (retains(epoch, mark)) completion = { epoch, mark }; }
    if (completion && retains(completion.epoch, completion.mark) && reveal) {
      inspector.open = true;
      inspector.scrollIntoView({ block: 'nearest' });
      (fields.querySelector('input, select') ?? picker).focus({ preventScroll: true });
      if (retains(completion.epoch, completion.mark)) onInspect(inspector);
    }
  }
  function changed(result, epoch) { if (!owns(epoch)) return; render(); if (!owns(epoch)) return; announce(result.ok ? '' : result.error.message); onEditing(); }
  function navigate(target, routeKind) {
    if (disposed) return;
    if (!resolveScoreDestination(target, studio.read().state)) return;
    const parked = editing.park(); if (!parked.ok) { announce(parked.error.message); return; }
    onNavigate(target, { kind: 'score', targetId: 'score', ...(routeKind ? { routeKind } : {}) });
  }
  function settle(method) {
    const current = editor.read(); if (disposed || !current.draft) return;
    if (composing && method === 'apply') { announce('Finish entering the text, then apply.'); return; }
    const newDecision = isNewDecision(current.draft.raw, current.projection.state) ? { id: selected.id, stageId: current.draft.raw[`gate.${selected.id}.afterStageId`] } : null;
    const epoch = ++generation, result = operate(method, current.draft.token); if (!owns(epoch)) return;
    if (!result.ok) { changed(result, epoch); return; }
    if (method === 'cancel') { decisionOrigins.clear(); if (opened(operate('begin', 'score', studio.read()), epoch)) announce('Arrangement changes cancelled.'); return; }
    decisionOrigins.clear();
    const accepted = result.projection ?? studio.read(); onAccepted(accepted);
    if (!owns(epoch) || studio.read() !== accepted || editing.read().active !== null) return;
    if (opened(operate('begin', 'score', accepted), epoch)) {
      announce(newDecision ? 'Decision added. Your arrangement changes are applied.' : 'Arrangement applied.');
      if (newDecision && owns(epoch)) returnToStage(newDecision.stageId, newDecision.id);
    }
  }
  function returnToStage(stageId, gateId = null) {
    const target = projectionRoot.querySelector(gateId
      ? `.native-score__stages [data-score-kind="gate"][data-score-id="${gateId}"]`
      : `.native-score__stages [data-score-view-action="add-decision"][data-score-id="${stageId}"]`);
    const destination = target ?? projectionRoot.querySelector('[data-score-view-action="add-decision"]') ?? arrange;
    destination.scrollIntoView({ block: 'center' }); destination.focus({ preventScroll: true });
  }
  function discardDecision() {
    const current = editor.read();
    if (!current.draft || current.status !== 'editing' || !isNewDecision(current.draft.raw, current.projection.state)) return;
    const { raw, token } = current.draft, id = selected.id, stageId = decisionOrigins.get(id) ?? raw[`gate.${id}.afterStageId`], epoch = ++generation;
    const result = operate('setIds', token, 'gateIds', raw.gateIds.filter(value => value !== id));
    if (!owns(epoch)) return;
    if (result.ok) { decisionOrigins.delete(id); selected = { kind: 'stage', id: stageId }; fieldSignature = null; }
    const mark = boundary(); changed(result, epoch);
    if (result.ok && retains(epoch, mark)) { announce('Decision draft discarded. Your other arrangement entries are kept.'); returnToStage(stageId); }
  }
  function freshId(kind, existing) { const taken = new Set(existing); let ordinal = 1; while (taken.has(`${kind}-${ordinal}`)) ordinal++; return `${kind}-${ordinal}`; }
  function addDecision(stageId) {
    if (disposed || !isActive()) return;
    if (!editor.read().draft || editing.read().active?.kind !== 'score') {
      const completion = beginOpen('score', false);
      if (!completion || !retains(completion.epoch, completion.mark)) return;
    }
    const current = editor.read();
    if (current.status !== 'editing') { announce('Review the saved arrangement before adding a decision.'); recovery.querySelector('button')?.focus(); return; }
    const { raw, token } = current.draft;
    if (!raw.stageIds.includes(stageId)) { announce('Choose a stage in the current arrangement before adding a decision.'); return; }
    const epoch = ++generation, id = freshId('gate', raw.gateIds);
    let result = operate('setIds', token, 'gateIds', [...raw.gateIds, id]);
    if (result.ok) result = operate('setText', token, `gate.${id}.afterStageId`, stageId);
    if (result.ok) result = operate('setText', token, `gate.${id}.label`, `Decision after ${raw[`stage.${stageId}.label`]}`.slice(0, scoreField(`gate.${id}.label`).maxLength));
    if (!owns(epoch)) return;
    if (result.ok) { decisionOrigins.set(id, stageId); selected = { kind: 'gate', id }; fieldSignature = null; }
    const mark = boundary(); changed(result, epoch);
    if (result.ok && retains(epoch, mark)) {
      inspector.open = true;
      inspector.scrollIntoView({ block: 'start' });
      const name = controls.get(`gate.${id}.label`)?.input; name?.focus({ preventScroll: true });
      if (retains(epoch, mark)) name?.select();
      if (retains(epoch, mark)) onInspect(inspector);
    }
  }
  function click(event) {
    const control = event.target.closest('[data-score-action]');
    if (!control || !root.contains(control) || disposed || !isActive()) return;
    const action = control.dataset.scoreAction;
    if (action === 'apply') return;
    if (action === 'open') { open(); return; }
    if (action === 'scale') {
      const next = Number(control.dataset.scoreScale); if (!scaleButtons.has(next)) return;
      scale = next; if (scale === 1) focusWorkId = null; render(); return;
    }
    if (action === 'reset-focus') {
      const epoch = generation, mark = boundary(); focusWorkId = null; render();
      if (retains(epoch, mark)) scaleButtons.get(scale).focus();
      return;
    }
    if (action === 'chapter') { navigate({ kind: 'chapter', id: control.dataset.scoreChapter }, 'context'); return; }
    if (action === 'kind') { select({ kind: control.dataset.scoreKind, id: '' }); return; }
    if (action === 'focus') { focusWorkId = selected.id; render(); scrollIntoView(); return; }
    if (action === 'source') { navigate(selected); return; }
    if (action === 'cancel') { settle('cancel'); return; }
    if (action === 'discard-decision') { discardDecision(); return; }
    if (action === 'keep-decision') {
      const raw = editor.read().draft?.raw;
      if (raw) select({ kind: 'stage', id: raw[`gate.${selected.id}.afterStageId`] || raw.stageIds[0] || '' }, true);
      return;
    }
    const current = editor.read(); if (!current.draft) return;
    const token = current.draft.token, raw = current.draft.raw, epoch = ++generation;
    if (action === 'review' || action === 'current') { opened(operate(action === 'review' ? 'review' : 'useCurrent', token, studio.read()), epoch, true); return; }
    if (current.status !== 'editing') return;
    if (action === 'step') { changed(operate('step', token, control.dataset.scoreField, Number(control.dataset.scoreStep)), epoch); return; }
    if (action === 'add' || action === 'remove') {
      const list = LISTS[selected.kind];
      const taken = selected.kind === 'proposal' ? [...raw[list], ...current.projection.state.work.map(row => row.id), ...raw.proposalIds.map(id => raw[`proposal.${id}.workId`].trim())] : raw[list];
      const id = action === 'add' ? freshId(selected.kind, taken) : selected.id;
      const ids = action === 'add' ? [...raw[list], id] : raw[list].filter(value => value !== id);
      const result = operate('setIds', token, list, ids);
      if (result.ok) { selected = { kind: selected.kind, id: action === 'add' ? id : ids[0] ?? '' }; fieldSignature = null; }
      changed(result, epoch); return;
    }
    if (action === 'add-interval' || action === 'remove-interval') {
      const key = `availability.${selected.id}.intervalIds`, id = action === 'add-interval' ? freshId('interval', raw[key]) : control.dataset.scoreInterval;
      changed(operate('setIds', token, key, action === 'add-interval' ? [...raw[key], id] : raw[key].filter(value => value !== id)), epoch);
    }
  }
  function scrollIntoView() { projectionRoot.scrollIntoView({ block: 'nearest' }); }
  function input(event) {
    const key = event.target.dataset.scoreField, current = editor.read(), control = controls.get(key);
    if (disposed || !isActive() || !current.draft || current.status !== 'editing') return;
    if (event.target.dataset.scoreFund && event.type === 'change') {
      const ids = current.draft.raw.fundProposalIds.filter(id => id !== event.target.dataset.scoreFund);
      if (event.target.checked) ids.push(event.target.dataset.scoreFund);
      const epoch = ++generation; changed(operate('setIds', current.draft.token, 'fundProposalIds', ids), epoch); return;
    }
    if (!control || control.input !== event.target && !((control.metadata.kind === 'ids' || control.radio) && control.input.contains(event.target))) return;
    const discrete = control.metadata.checkbox || control.metadata.kind === 'ids' || control.radio || control.input.tagName === 'SELECT';
    if (discrete ? event.type !== 'change' : !['input', 'compositionend'].includes(event.type)) return;
    const epoch = ++generation;
    const result = control.metadata.kind === 'ids' ? operate('setIds', current.draft.token, key, [...control.input.querySelectorAll('input:checked')].map(check => check.value))
      : operate('setText', current.draft.token, key, control.metadata.checkbox ? control.input.checked ? 'yes' : 'no' : event.target.value);
    changed(result, epoch);
  }
  listen(root, 'click', click); listen(form, 'input', input); listen(form, 'change', input);
  listen(inspectorSummary, 'click', event => {
    if (disposed || inspector.open || !isActive()) return;
    if (!editor.read().draft || editing.read().active?.kind !== 'score') {
      event.preventDefault(); beginOpen('score', false);
    }
  });
  listen(form, 'submit', event => { event.preventDefault(); if (!disposed && isActive()) settle('apply'); });
  listen(form, 'compositionstart', () => { composing = true; render(); }); listen(form, 'compositionend', event => { composing = false; input(event); });
  listen(picker, 'change', () => { if (!disposed) select({ kind: selected.kind, id: picker.value }); });
  listen(overlapChoice, 'change', () => { overlapIndex = Number(overlapChoice.value); render(); });
  function close({ park = true } = {}) { if (disposed) return; ++generation; composing = false; if (park && editing.read().active?.kind === 'score') editing.park(); }
  function dispose() { if (disposed) return; const active = editing.read().active; retiredToken = active?.kind === 'score' ? active.token : null;
    close(); disposed = true; ++generation; releaseRetiredLease(); view.dispose(); cleanup.splice(0).forEach(release => release());
    for (const owned of [toolbar, projectionRoot, inspector, manual]) owned.remove(); if (fallback) fallback.hidden = false;
    delete root.dataset.scoreState; controls.clear(); decisionOrigins.clear(); INSTANCES.delete(root); }
  render();
  const controller = Object.freeze({ open, close, refresh: render, resume: () => open('score', false), select, dispose }); INSTANCES.set(root, controller); return controller;
}
