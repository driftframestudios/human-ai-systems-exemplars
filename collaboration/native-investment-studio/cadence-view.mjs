import { duration, money } from './display.mjs';
import { CADENCE_PERIOD_LIMIT, CADENCE_SUBDIVISIONS, projectCadence } from './cadence.mjs';
import { LIMITS } from './config.mjs';
import { createRackAddControl } from './rack-creation-controls.mjs';
import { createTapePicker } from './tape-picker.mjs';
import { revealStudioDestination } from './motion.mjs';

const DECISIONS = Object.freeze({ open: 'Open for review', proceed: 'Proceed in this model', revise: 'Revise the plan', hold: 'Hold this commitment' });
const noop = () => {};
let viewSequence = 0;

// This view groups admitted occurrences. Clip width expresses a place in the
// plan; session duration and investment retain their existing model owners.
export function createCadenceView(root, {
  onSelect = noop, onLoadPlan = noop, onNavigate = noop, onPeriod = noop, onAddPeriod = noop, onRenamePeriod = noop, onAddSession = noop, onAddOccurrence = noop,
  onAddDecision = noop, onAddDelay = noop, onAddStage = noop, onAddHandoff = noop, onCreateHorizon = noop, flowRoot = null, flowPanel = null,
} = {}) {
  const document = root.ownerDocument;
  const captionPrefix = `cadence-caption-${++viewSequence}`;
  let disposed = false, previousPeriodId, overviewReturn, periodOriginKey, captionEdit = null, lastReading, rendered;
  const actions = new Map();
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function button(label, action, target, key, className = '') {
    const control = node('button', undefined, className); control.type = 'button';
    control.dataset.cadenceAction = action; control.dataset.cadenceKey = key;
    control.append(node('span', label)); actions.set(key, { action, target });
    return control;
  }
  function selection(label, kind, id, key, selected, extra = {}, className = '') {
    const control = button(label, 'select', { kind, id, ...extra }, key, className);
    if (kind === 'work') control.dataset.studioSessionId = id;
    control.setAttribute('aria-pressed', String(selected?.kind === kind && selected.id === id
      && (extra.occurrenceIndex === undefined || selected.occurrenceIndex === undefined || selected.occurrenceIndex === extra.occurrenceIndex)));
    return control;
  }
  function create(label, action, target, key) {
    return button(label, action, target, key, `native-control--create native-cadence__create${action === 'add-session' ? ' studio-rack-add' : ''}`);
  }
  function createSlot(label, action, target, key, className = '') {
    actions.set(key, { action, target });
    return createRackAddControl(document, { label, className, dataset: { cadenceAction: action, cadenceKey: key } });
  }
  function disclosure(label, key) {
    const details = node('details', undefined, 'native-cadence__details studio-rack-companion');
    details.dataset.cadenceDisclosure = key;
    const summary = node('summary'); summary.append(node('span', label));
    details.append(summary); return details;
  }
  function scopeCaption(details, label) {
    const summary = details.querySelector(':scope > summary');
    let caption = summary.querySelector('.studio-rack-companion__scope');
    if (!caption) { caption = node('span', undefined, 'studio-rack-companion__scope'); summary.append(caption); }
    caption.textContent = label;
  }
  // The session owner lends its live controls to this slot. Refresh only the
  // surrounding projections so a dial turn or text edit keeps its DOM owner.
  const screen = node('section', undefined, 'native-cadence__screen');
  const workspace = node('div', undefined, 'studio-plan-workspace');
  const library = node('div', undefined, 'studio-plan-library');
  const reading = node('header', undefined, 'native-cadence__reading');
  const board = node('div', undefined, 'native-cadence__board'); board.tabIndex = 0; board.setAttribute('role', 'region');
  const delayRail = node('section', undefined, 'native-cadence__period-delays'); delayRail.hidden = true;
  const sessionSlot = node('div', undefined, 'native-cadence__session-slot'); sessionSlot.dataset.studioSessionSlot = '';
  const tracks = node('div', undefined, 'native-cadence__tracks'); tracks.tabIndex = 0;
  tracks.setAttribute('role', 'region'); tracks.setAttribute('aria-label', 'Session tracks; scroll across the planning periods');
  const previewReading = node('p', undefined, 'native-cadence__preview'); previewReading.dataset.cadencePreviewReading = '';
  const recordRail = node('nav', undefined, 'studio-rack-records'); recordRail.setAttribute('aria-label', 'People and relationships');
  screen.append(reading, board, delayRail, sessionSlot, tracks, previewReading, recordRail); screen.hidden = true;
  workspace.append(library, screen);
  const attachments = node('div', undefined, 'studio-rack-companions');
  const availability = disclosure('People and available time', 'people');
  const personRows = node('div', undefined, 'native-cadence__people'); availability.append(personRows);
  const relationshipPanel = flowPanel ?? disclosure('Stages & handoffs', 'flow');
  relationshipPanel.classList.add('studio-rack-companion');
  attachments.append(availability, relationshipPanel);
  const extras = node('div', undefined, 'native-cadence__extras');
  root.classList.add('studio-rack-composition'); root.replaceChildren(workspace, attachments, extras);
  const externalFlowEvents = flowRoot && !root.contains(flowRoot) ? flowRoot : null;
  function click(event) {
    const control = event.target.closest('[data-cadence-action]');
    if (disposed || !control || !(root.contains(control) || flowRoot?.contains(control))) return;
    const item = actions.get(control.dataset.cadenceKey); if (!item) return;
    if (item.action === 'period' && item.target !== null) periodOriginKey = control.dataset.cadenceKey;
    const receivers = { select: onSelect, 'load-plan': onLoadPlan, navigate: onNavigate, period: onPeriod, 'add-period': onAddPeriod,
      'add-session': onAddSession, 'add-occurrence': onAddOccurrence, 'add-decision': onAddDecision, 'add-delay': onAddDelay,
      'add-stage': onAddStage, 'add-handoff': onAddHandoff, 'create-horizon': onCreateHorizon };
    receivers[item.action]?.(item.target, control);
  }
  function showPreview(event) {
    const control = event.target.closest('[data-cadence-preview]');
    if (!disposed && control && root.contains(control)) previewReading.textContent = control.dataset.cadencePreview;
  }
  root.addEventListener('click', click);
  root.addEventListener('pointerover', showPreview);
  root.addEventListener('focusin', showPreview);
  externalFlowEvents?.addEventListener('click', click);

  function refresh(projection, { periodId = null, loadedPlanId = null, selected = null, preview = false } = {}) {
    if (disposed) return;
    lastReading = { projection, options: { periodId, loadedPlanId, selected, preview } };
    // Accepted and proposed projections carry their own identity. Selection
    // values remain comparable when the controller reconstructs its options.
    const renderKey = [projection, periodId, loadedPlanId, preview, selected?.kind, selected?.id, selected?.occurrenceIndex];
    if (rendered?.every((value, index) => value === renderKey[index])) return;
    rendered = null;
    const focusKey = root.contains(document.activeElement) ? document.activeElement.dataset.cadenceKey : null;
    const scrollPosition = { board: board.scrollLeft, tracks: tracks.scrollLeft };
    const oldShelf = library.querySelector('.studio-tape-shelf');
    const shelfScroll = { left: oldShelf?.scrollLeft ?? 0, top: oldShelf?.scrollTop ?? 0 };
    const recordScroll = new Map([...recordRail.querySelectorAll('[data-record-rail]')]
      .map(element => [element.dataset.recordRail, element.scrollLeft]));
    actions.clear();
    const { state, result } = projection, cadence = state.scoreSettings.cadence;
    const fragment = document.createDocumentFragment();
    root.classList.add('native-cadence'); root.dataset.cadenceReading = preview ? 'proposed' : 'accepted';
    if (!cadence) {
      captionEdit = null;
      workspace.hidden = true;
      previousPeriodId = undefined; overviewReturn = undefined;
      flowRoot?.replaceChildren();
      const invitation = node('div', undefined, 'native-cadence__invitation');
      invitation.append(node('h4', 'Give this work a place in the plan'),
        node('p', 'Preview a sprint arrangement for these sessions. Their people, duration and investment stay together.'),
        create('Arrange this plan in sprints', 'create-horizon', null, 'create-horizon'));
      screen.hidden = true;
      reading.replaceChildren(); board.replaceChildren(); delayRail.replaceChildren(); tracks.replaceChildren();
      // Retained relationship recovery remains usable before a plan gains
      // sprint/quarter placement. Only the period reading needs a cadence.
      availability.hidden = true; attachments.hidden = !flowPanel;
      scopeCaption(relationshipPanel, 'Saved arrangement');
      fragment.append(invitation); extras.replaceChildren(fragment); rendered = renderKey; return;
    }
    const model = projectCadence(state);
    const people = new Map(state.people.map(row => [row.id, row]));
    const work = new Map(state.work.map(row => [row.id, row]));
    const teams = new Map(state.teams.map(row => [row.id, row]));
    const periods = cadence.periods, periodById = new Map(periods.map(row => [row.id, row]));
    if (captionEdit && (captionEdit.basis !== cadence.basis || !periodById.has(captionEdit.id))) captionEdit = null;
    const activePeriod = periodById.get(periodId) ?? null;
    const loadedPlan = work.get(loadedPlanId) ?? null;
    screen.dataset.loadedPlan = loadedPlan?.id ?? '';
    const currentPeriodId = activePeriod?.id ?? null;
    const periodChanged = previousPeriodId !== undefined && previousPeriodId !== currentPeriodId;
    if (periodChanged && previousPeriodId === null) {
      overviewReturn = { focusKey: periodOriginKey ?? `period:${currentPeriodId}`, scrollPosition };
    }
    periodOriginKey = undefined;
    const arrivalFocus = periodChanged ? currentPeriodId === null
      ? overviewReturn?.focusKey ?? `period:${previousPeriodId}` : 'plan-overview' : focusKey;
    const restoredScroll = periodChanged ? activePeriod ? { board: 0, tracks: 0 } : overviewReturn?.scrollPosition : scrollPosition;
    previousPeriodId = currentPeriodId;
    const subdivisionName = cadence.basis === 'quarter' ? 'Month' : 'Week';
    const subdivisionCount = CADENCE_SUBDIVISIONS[cadence.basis];
    const subdivisionLabel = value => value == null ? 'Choose a part of the period' : `${subdivisionName} ${value}`;
    const periodLabel = id => periodById.get(id)?.label ?? 'Choose a period';
    const occurrences = model.occurrences.map(row => ({ ...row, work: work.get(row.workId) }))
      .filter(row => row.work && (!loadedPlan || row.workId === loadedPlan.id));
    const visible = activePeriod ? occurrences.filter(row => row.periodId === activePeriod.id) : occurrences;
    const shelf = createTapePicker(document, {
      variant: 'plan', label: 'Plans', selectedId: loadedPlan?.id ?? null,
      entries: state.work.map(item => ({
        id: item.id, title: item.label, eyebrow: teams.get(item.teamId)?.label ?? 'Choose a team',
        detail: `${duration(item.minutesPerOccurrence)} · ${item.occurrences} ${item.occurrences === 1 ? 'session' : 'sessions'}`,
        attributes: { 'data-cadence-key': `cassette:${item.id}`, 'data-studio-plan-id': item.id },
      })),
      onSelect: (id, source) => {
        if (disposed) return;
        onLoadPlan(id, source);
      },
    });
    shelf.append(create('New plan', 'add-session', { periodId: activePeriod?.id ?? periods[0]?.id, subdivision: 1 }, 'cassette-add'));
    library.replaceChildren(shelf);
    const nextShelf = library.querySelector('.studio-tape-shelf');
    nextShelf.scrollLeft = shelfScroll.left; nextShelf.scrollTop = shelfScroll.top;
    workspace.hidden = false;
    const stages = model.stages;
    const handoffs = model.handoffs;
    const decisions = model.decisions;
    const incoming = new Map();
    for (const handoff of handoffs) for (const id of handoff.toWorkIds) {
      if (!incoming.has(id)) incoming.set(id, []);
      for (const fromId of handoff.fromWorkIds) if (!incoming.get(id).includes(fromId)) incoming.get(id).push(fromId);
    }
    const workPreview = row => `${row.work.label} · ${duration(row.work.minutesPerOccurrence)} per person.`
      + (incoming.get(row.workId)?.length ? ` Needs ${incoming.get(row.workId).map(id => work.get(id)?.label).filter(Boolean).join(', ')}.` : ' Opens this part of the work.');
    const endpointName = endpoint => endpoint.kind === 'stage' ? stages.find(row => row.id === endpoint.id)?.label ?? 'Stage'
      : work.get(endpoint.id)?.label ?? 'Session';
    const inPeriod = row => !activePeriod || row.periodId === activePeriod.id || row.periodIds?.includes(activePeriod.id)
      || row.fromPeriodId === activePeriod.id || row.toPeriodId === activePeriod.id;
    attachments.hidden = false; availability.hidden = false;
    for (const details of [availability, relationshipPanel]) scopeCaption(details, activePeriod?.label ?? 'Plan overview');

    screen.hidden = false; screen.setAttribute('aria-label', activePeriod ? `${activePeriod.label} sessions and decisions` : 'Sprint and quarter plan overview');
    const context = node('div');
    const heading = node('h4', activePeriod?.label ?? 'Plan overview');
    if (activePeriod) {
      const breadcrumb = node('nav', undefined, 'native-cadence__breadcrumb'); breadcrumb.setAttribute('aria-label', 'Plan scope');
      const overview = button('Plan overview', 'period', null, 'plan-overview', 'native-cadence__return');
      const arrow = node('span', '←'); arrow.setAttribute('aria-hidden', 'true'); overview.prepend(arrow);
      const separator = node('span', '›'); separator.setAttribute('aria-hidden', 'true');
      heading.setAttribute('aria-current', 'page');
      breadcrumb.append(overview, separator, heading); context.append(breadcrumb);
    } else context.append(heading);
    if (loadedPlan) {
      const loaded = node('div', undefined, 'native-cadence__loaded-plan');
      loaded.append(button('All plans', 'load-plan', null, 'all-plans', 'native-cadence__return'),
        node('span', loadedPlan.label));
      context.append(loaded);
    }
    const cost = node('dl', undefined, 'native-cadence__amount');
    const amountLabel = result.plannedCommitmentCents === null ? 'Known included work' : 'Included work';
    cost.append(node('dt', preview ? `Proposed · ${amountLabel.toLowerCase()}` : amountLabel), node('dd', money(result.knownCommitmentCents)));
    reading.replaceChildren(context, cost);

    function sessionClip(rows, key) {
      const row = rows[0], item = row.work;
      const control = selection(item.label, 'work', item.id, key, selected,
        { ...(rows.length === 1 ? { occurrenceIndex: row.occurrenceIndex } : {}), periodId: row.periodId },
        'native-cadence__clip native-control--navigate');
      control.dataset.funding = item.funding; control.dataset.active = String(item.status === 'planned' && item.lifecycle !== 'retired');
      const effort = `${rows.length > 1 ? `${rows.length} × ` : ''}${duration(item.minutesPerOccurrence)} per person`;
      control.append(node('small', effort));
      if (activePeriod) control.append(node('small', teams.get(item.teamId)?.label ?? 'Team to choose', 'native-cadence__team'),
        node('small', item.personIds.map(id => people.get(id)?.label).filter(Boolean).join(', ') || 'Choose the people taking part', 'native-cadence__participants'));
      control.dataset.cadencePreview = workPreview(row);
      control.setAttribute('aria-label', `${item.label}${activePeriod ? `, session ${row.occurrenceIndex + 1}` : ''}, ${periodLabel(row.periodId)}. ${effort}. Open session settings.`);
      if (item.status !== 'planned' || item.lifecycle === 'retired') control.append(node('small', item.lifecycle === 'retired' ? 'Retired' : 'Paused', 'native-cadence__state'));
      return control;
    }
    function decisionMarker(decision, suffix) {
      const control = selection(decision.label, 'gate', decision.id, `decision:${decision.id}:${suffix}`, selected, {}, 'native-cadence__decision native-control--navigate');
      control.dataset.decision = decision.modeledDecision;
      control.append(node('small', DECISIONS[decision.modeledDecision] ?? 'Modeled decision'));
      control.dataset.cadencePreview = decision.question || `Review ${decision.label.toLowerCase()} with the responsible people.`;
      return control;
    }
    function delayMarker(delay, suffix = '') {
      const control = selection(delay.label, 'delay', delay.id, `delay:${delay.id}${suffix ? ':' + suffix : ''}`, selected, {}, 'native-cadence__delay native-control--navigate');
      control.append(node('small', `${periodLabel(delay.fromPeriodId)} → ${periodLabel(delay.toPeriodId)}`));
      control.dataset.cadencePreview = delay.reason || 'Inspect the work affected by this delay.';
      return control;
    }
    function periodColumn(period, subdivision = null) {
      const column = node('section', undefined, 'native-cadence__period');
      column.dataset.cadencePeriod = period.id;
      if (subdivision !== null) column.dataset.cadenceSubdivision = String(subdivision);
      const heading = node('h5');
      if (subdivision === null) {
        const open = button(period.label, 'period', period.id, `period:${period.id}`, 'native-cadence__period-key native-control--navigate');
        open.append(node('small', `Open ${cadence.basis} detail`)); heading.append(open);
      } else heading.textContent = `${subdivisionName} ${subdivision}`;
      column.append(heading);
      const matchingStages = stages.filter(stage => stage.periodIds.includes(period.id));
      if (subdivision === null) {
        const rename = node('div', undefined, 'native-cadence__period-label');
        const caption = period.caption ?? matchingStages.map(stage => stage.label).join(' · ');
        const reading = node('div', undefined, 'native-cadence__caption');
        const text = node('p', caption, 'native-cadence__stage-labels'); text.hidden = !caption;
        const trigger = node('button', 'Edit', 'native-cadence__caption-edit'); trigger.type = 'button';
        trigger.dataset.periodRename = period.id; trigger.dataset.cadenceKey = `caption-edit:${period.id}`;
        trigger.setAttribute('aria-label', `Edit ${period.label} caption`);
        trigger.setAttribute('aria-expanded', String(captionEdit?.id === period.id));
        reading.append(text, trigger);
        const form = node('form'), label = node('label', 'Period caption'), input = node('input');
        form.id = `${captionPrefix}-${period.id}`; trigger.setAttribute('aria-controls', form.id);
        form.hidden = captionEdit?.id !== period.id;
        input.type = 'text'; input.value = captionEdit?.id === period.id ? captionEdit.value : caption;
        input.maxLength = LIMITS.label; input.dataset.cadenceKey = `caption-input:${period.id}`;
        label.append(input);
        const tools = node('div', undefined, 'native-cadence__caption-tools');
        const save = node('button', 'Save label'); save.type = 'submit';
        const cancel = node('button', 'Cancel', 'native-control--cancel'); cancel.type = 'button'; tools.append(save, cancel);
        const error = node('p', captionEdit?.id === period.id ? captionEdit.error : '', 'native-cadence__caption-error'); error.setAttribute('role', 'alert');
        const redraw = key => {
          // Caption editing is local view state, independent of the projection.
          rendered = null;
          refresh(lastReading.projection, lastReading.options);
          [...board.querySelectorAll('[data-cadence-key]')].find(item => item.dataset.cadenceKey === key)?.focus({ preventScroll: true });
        };
        trigger.addEventListener('click', () => {
          if (captionEdit?.id === period.id) { captionEdit = null; redraw(trigger.dataset.cadenceKey); }
          else { captionEdit = { id: period.id, basis: cadence.basis, value: caption, error: '' }; redraw(input.dataset.cadenceKey); }
        });
        cancel.addEventListener('click', () => { captionEdit = null; redraw(trigger.dataset.cadenceKey); });
        input.addEventListener('input', () => {
          if (captionEdit?.id === period.id) { captionEdit.value = input.value; captionEdit.error = ''; error.textContent = ''; }
        });
        form.append(label, tools, error);
        form.addEventListener('submit', event => {
          event.preventDefault();
          if (captionEdit?.id !== period.id) return;
          const submitted = captionEdit;
          const value = input.value.trim();
          // Saving the unchanged stage summary keeps it derived from stages.
          const result = onRenamePeriod({ id: period.id, label: period.caption === undefined && value === caption ? '' : value });
          if (disposed || captionEdit !== submitted) return;
          if (result?.ok) { captionEdit = null; redraw(trigger.dataset.cadenceKey); }
          else {
            captionEdit.error = result?.error?.message ?? 'Your caption is kept here. Try saving again.';
            redraw(input.dataset.cadenceKey);
          }
        });
        rename.append(reading, form); column.append(rename);
      }
      const clips = node('div', undefined, 'native-cadence__clips');
      const rows = occurrences.filter(row => row.periodId === period.id && (subdivision === null || row.subdivision === subdivision))
        .sort((a, b) => a.subdivision - b.subdivision);
      if (subdivision === null) {
        const groups = new Map();
        for (const row of rows) { if (!groups.has(row.workId)) groups.set(row.workId, []); groups.get(row.workId).push(row); }
        for (const [id, members] of groups) clips.append(sessionClip(members, `work:${period.id}:${id}`));
      } else for (const row of rows) clips.append(sessionClip([row], `occurrence:${row.workId}:${row.occurrenceIndex}`));
      if (!rows.length) clips.append(node('p', 'Space for working sessions', 'native-cadence__space'));
      for (const decision of decisions.filter(row => row.periodId === period.id && (subdivision === null || row.subdivision === subdivision))) {
        clips.append(decisionMarker(decision, `${period.id}:${subdivision ?? 'overview'}`));
      }
      for (const delay of model.delays.filter(row => row.toPeriodId === period.id && subdivision === null)) {
        clips.append(delayMarker(delay));
      }
      const addSession = createSlot(`Add a session in ${period.label}${subdivision === null ? '' : `, ${subdivisionLabel(subdivision)}`}`,
        'add-session', { periodId: period.id, subdivision: subdivision ?? 1 }, `add-session:${period.id}:${subdivision ?? 'overview'}`, 'studio-rack-create-area');
      column.append(clips, addSession);
      return column;
    }
    board.replaceChildren();
    board.dataset.cadenceLevel = activePeriod ? 'period' : 'plan';
    board.setAttribute('aria-label', activePeriod ? 'Week or month overview' : 'Plan period overview; scroll across periods');
    if (periodChanged) board.dataset.cadenceArrival = activePeriod ? 'period' : 'plan';
    else delete board.dataset.cadenceArrival;
    board.style.setProperty('--cadence-columns', String(activePeriod ? subdivisionCount : periods.length));
    if (activePeriod) for (let part = 1; part <= subdivisionCount; part++) board.append(periodColumn(activePeriod, part));
    else {
      for (const period of periods) board.append(periodColumn(period));
      const add = create(cadence.basis === 'quarter' ? 'Add quarter' : 'Add sprint', 'add-period', null, 'add-period');
      add.classList.add('native-cadence__period-add');
      add.disabled = periods.length >= CADENCE_PERIOD_LIMIT;
      board.append(add);
    }
    delayRail.replaceChildren(); delayRail.hidden = true;
    if (activePeriod) {
      const delays = model.delays.filter(row => row.fromPeriodId === activePeriod.id || row.toPeriodId === activePeriod.id);
      if (delays.length) {
        delayRail.hidden = false; delayRail.append(node('h5', 'Delays affecting this period'));
        for (const delay of delays) delayRail.append(delayMarker(delay));
      }
    }
    const trackColumns = activePeriod
      ? Array.from({ length: subdivisionCount }, (_, index) => ({ period: activePeriod, subdivision: index + 1, label: subdivisionLabel(index + 1) }))
      : periods.map(period => ({ period, subdivision: null, label: period.label }));
    const trackTable = node('table', undefined, 'native-cadence__track-table');
    const cellCounts = new Map();
    for (const row of visible.filter(row => row.periodId !== null)) {
      const key = `${row.workId}:${row.periodId}:${row.subdivision}`;
      cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }
    const slotsPerPart = Math.min(2, Math.max(1, ...cellCounts.values()));
    trackTable.style.setProperty('--cadence-track-columns', String(trackColumns.length));
    trackTable.style.setProperty('--cadence-track-column-width', `${Math.max(9.5, (activePeriod ? slotsPerPart : subdivisionCount * slotsPerPart) * 3.1)}rem`);
    trackTable.append(node('caption', 'Session tracks'));
    const trackHead = node('thead'), headings = node('tr'), workHeading = node('th', 'Working session'); workHeading.scope = 'col'; headings.append(workHeading);
    for (const column of trackColumns) {
      const th = node('th'); th.scope = 'col';
      if (activePeriod) th.textContent = column.label;
      else {
        const zoom = button(column.label, 'period', column.period.id, `track-period:${column.period.id}`, 'native-cadence__track-period native-control--navigate');
        zoom.setAttribute('aria-label', `Open ${column.label}`); th.append(zoom);
      }
      headings.append(th);
    }
    trackHead.append(headings); const trackBody = node('tbody');
    for (const item of state.work.filter(item => !loadedPlan || item.id === loadedPlan.id)) {
      const tr = node('tr'), label = node('th'); label.scope = 'row';
      const name = selection(item.label, 'work', item.id, `track-work:${item.id}`, selected, {}, 'studio-track-key native-cadence__track-name native-control--navigate');
      name.setAttribute('aria-label', `${item.label}, ${duration(item.minutesPerOccurrence)} per person. Open session settings.`); label.append(name); tr.append(label);
      for (const column of trackColumns) {
        const cell = node('td'), pads = node('div', undefined, 'native-cadence__pads');
        const subdivisions = column.subdivision === null
          ? Array.from({ length: subdivisionCount }, (_, index) => index + 1) : [column.subdivision];
        pads.style.setProperty('--cadence-pad-columns', String(subdivisions.length));
        for (const subdivision of subdivisions) {
          const part = node('div', undefined, 'native-cadence__part');
          part.dataset.cadenceSubdivision = String(subdivision);
          const members = occurrences.filter(row => row.workId === item.id && row.periodId === column.period.id && row.subdivision === subdivision);
          for (const row of members) {
            const pad = selection(activePeriod ? `Session ${row.occurrenceIndex + 1}` : `${cadence.basis === 'quarter' ? 'M' : 'W'}${subdivision}`,
              'work', item.id, `pad:${item.id}:${row.occurrenceIndex}`, selected,
              { occurrenceIndex: row.occurrenceIndex, periodId: row.periodId }, 'native-cadence__pad native-control--navigate');
            pad.dataset.funding = item.funding; pad.dataset.active = String(row.active);
            pad.dataset.cadencePreview = workPreview(row);
            pad.setAttribute('aria-label', `${item.label}, session ${row.occurrenceIndex + 1}, ${column.period.label}, ${subdivisionLabel(subdivision)}. ${duration(item.minutesPerOccurrence)} per person. Open session settings.`);
            part.append(pad);
          }
          const destination = `${column.period.label}, ${subdivisionLabel(subdivision)}`;
          const add = createSlot(`Add ${item.label} session in ${destination}`, 'add-occurrence', { workId: item.id, periodId: column.period.id, subdivision },
            `add-occurrence:${item.id}:${column.period.id}:${subdivision}`);
          add.disabled = item.occurrences >= LIMITS.occurrences;
          add.dataset.cadencePreview = `Add another ${item.label} session in ${destination}. ${duration(item.minutesPerOccurrence)} per person.`;
          part.append(add); pads.append(part);
        }
        cell.append(pads); tr.append(cell);
      }
      trackBody.append(tr);
    }
    const newSession = node('tr', undefined, 'studio-rack-create-row');
    const newSessionHeading = node('th', 'New plan'); newSessionHeading.scope = 'row'; newSession.append(newSessionHeading);
    for (const column of trackColumns) {
      const cell = node('td'), pads = node('div', undefined, 'native-cadence__pads');
      const subdivisions = column.subdivision === null
        ? Array.from({ length: subdivisionCount }, (_, index) => index + 1) : [column.subdivision];
      pads.style.setProperty('--cadence-pad-columns', String(subdivisions.length));
      for (const subdivision of subdivisions) {
        const destination = `${column.period.label}, ${subdivisionLabel(subdivision)}`;
        const add = createSlot(`Add a new plan in ${destination}`, 'add-session', { periodId: column.period.id, subdivision },
          `new-session:${column.period.id}:${subdivision}`);
        add.dataset.cadencePreview = `Add a new plan in ${destination}, then select it to adjust its people and duration.`;
        pads.append(add);
      }
      cell.append(pads); newSession.append(cell);
    }
    trackBody.append(newSession);
    const markers = node('tr', undefined, 'native-cadence__track-markers'), markerHeading = node('th', 'Handoffs & decisions'); markerHeading.scope = 'row'; markers.append(markerHeading);
    let hasMarkers = false;
    for (const column of trackColumns) {
      const cell = node('td'), events = node('div', undefined, 'native-cadence__track-events');
      for (const row of decisions.filter(row => row.periodId === column.period.id && (column.subdivision === null || row.subdivision === column.subdivision))) {
        events.append(decisionMarker(row, `track:${column.period.id}:${column.subdivision ?? 'overview'}`)); hasMarkers = true;
      }
      for (const handoff of handoffs.filter(row => row.toPeriodId === column.period.id && (column.subdivision === null || row.subdivision === column.subdivision))) {
        const mark = selection('Handoff', 'handoff', handoff.id, `track-handoff:${handoff.id}`, selected, {}, 'native-cadence__handoff-mark native-control--navigate');
        mark.setAttribute('aria-label', `Handoff from ${endpointName(handoff.from)} to ${endpointName(handoff.to)}. Open handoff settings.`);
        mark.dataset.cadencePreview = `Pass ${endpointName(handoff.from)} to ${endpointName(handoff.to)}.`;
        events.append(mark); hasMarkers = true;
      }
      cell.append(events); markers.append(cell);
    }
    if (hasMarkers) trackBody.append(markers);
    trackTable.append(trackHead, trackBody); tracks.replaceChildren(trackTable);
    previewReading.textContent = 'Hover over or focus a pad to see the work it needs.';

    const flow = node('div');
    flow.classList.add('native-cadence__flow');
    const flowHeading = node('header', undefined, 'native-cadence__section-heading');
    flowHeading.append(create('Add stage', 'add-stage', { periodId: activePeriod?.id ?? null }, 'add-stage'),
      create('Connect work', 'add-handoff', null, 'add-handoff'));
    flow.append(flowHeading);
    const stageRows = node('div', undefined, 'native-cadence__stages');
    for (const stage of stages.filter(stage => inPeriod(stage) || stage.workIds.length === 0)) {
      const card = node('article', undefined, 'native-cadence__stage');
      const open = selection(stage.label, 'stage', stage.id, `stage:${stage.id}`, selected, {}, 'native-cadence__stage-key native-control--navigate');
      const labels = stage.periodIds.map(periodLabel);
      open.append(node('small', labels.length ? labels.length > 1 ? `${labels[0]} – ${labels.at(-1)}` : labels[0] : 'Choose supporting sessions'));
      const controls = node('div', undefined, 'native-cadence__local-actions');
      const addDecision = create('Add decision', 'add-decision', { kind: 'stage', id: stage.id }, `add-decision:stage:${stage.id}`);
      addDecision.setAttribute('aria-label', `Add a decision for ${stage.label}`);
      const addDelay = button('Add delay', 'add-delay', { kind: 'stage', id: stage.id }, `add-delay:stage:${stage.id}`, 'native-cadence__quiet');
      addDelay.setAttribute('aria-label', `Add a delay to ${stage.label}`); controls.append(addDecision, addDelay);
      card.append(open, controls); stageRows.append(card);
    }
    if (stageRows.childElementCount) flow.append(stageRows);
    const handoffRows = node('div', undefined, 'native-cadence__handoffs');
    for (const handoff of handoffs.filter(inPeriod)) {
      const card = node('article', undefined, 'native-cadence__handoff');
      const from = endpointName(handoff.from), to = endpointName(handoff.to);
      const open = selection(`${from} → ${to}`, 'handoff', handoff.id, `handoff:${handoff.id}`, selected, {}, 'native-cadence__handoff-key native-control--navigate');
      open.setAttribute('aria-label', `Inspect the handoff from ${from} to ${to}`);
      const connection = state.connections.find(row => row.id === handoff.connectionId);
      const object = connection?.sharedObject || 'Agree what the receiving team needs.';
      open.append(node('small', object));
      if (handoff.status !== 'in-order') {
        const state = handoff.status === 'paused' ? 'Connection paused' : handoff.status === 'review-order' ? 'Review the order of this work' : 'Choose the periods for this work';
        open.append(node('small', state, 'native-cadence__state'));
      }
      const controls = node('div', undefined, 'native-cadence__local-actions');
      const addDecision = create('Add decision', 'add-decision', { kind: 'handoff', id: handoff.id }, `add-decision:handoff:${handoff.id}`);
      addDecision.setAttribute('aria-label', `Add a decision for the handoff from ${from} to ${to}`);
      const addDelay = button('Add delay', 'add-delay', { kind: 'handoff', id: handoff.id }, `add-delay:handoff:${handoff.id}`, 'native-cadence__quiet');
      addDelay.setAttribute('aria-label', `Add a delay to the handoff from ${from} to ${to}`);
      controls.append(addDecision, addDelay); card.append(open, controls); handoffRows.append(card);
    }
    if (handoffRows.childElementCount) flow.append(handoffRows);
    for (const decision of decisions.filter(inPeriod)) flow.append(decisionMarker(decision, 'editorial'));
    for (const delay of model.delays.filter(inPeriod)) flow.append(delayMarker(delay, 'editorial'));
    if (flowRoot) flowRoot.replaceChildren(flow);
    else { relationshipPanel.querySelector(':scope > .native-cadence__flow')?.remove(); relationshipPanel.append(flow); }

    const unplaced = occurrences.filter(row => row.periodId === null || !periodById.has(row.periodId));
    if (unplaced.length) {
      const tray = node('div', undefined, 'native-cadence__unplaced');
      tray.append(node('span', 'Sessions to place', 'studio-rack-records__label'));
      const clips = node('div', undefined, 'native-cadence__unplaced-clips');
      const grouped = new Map();
      for (const row of unplaced) {
        if (!grouped.has(row.workId)) grouped.set(row.workId, []);
        grouped.get(row.workId).push(row);
      }
      for (const [id, rows] of grouped) clips.append(sessionClip(rows, `unplaced:${id}`));
      tray.append(clips); tracks.append(tray);
    }

    personRows.replaceChildren(); recordRail.replaceChildren();
    function recordRow(label) {
      const row = node('div', undefined, 'studio-rack-records__row');
      row.append(node('span', label, 'studio-rack-records__label'));
      const controls = node('div', undefined, 'studio-rack-records__keys');
      controls.dataset.recordRail = label;
      controls.tabIndex = 0; controls.setAttribute('role', 'region'); controls.setAttribute('aria-label', label + '; scroll to inspect');
      row.append(controls); recordRail.append(row); return controls;
    }
    const peopleKeys = recordRow('People');
    const participants = activePeriod || loadedPlan ? new Set(visible.flatMap(row => row.work.personIds)) : new Set(state.people.map(row => row.id));
    for (const id of participants) {
      const person = people.get(id); if (!person) continue;
      const card = node('article', undefined, 'native-cadence__person'); card.append(node('h5', person.label));
      const rows = visible.filter(row => row.work.personIds.includes(id) && row.work.status === 'planned' && row.work.lifecycle !== 'retired');
      const effort = rows.reduce((sum, row) => sum + row.work.minutesPerOccurrence, 0);
      card.append(node('p', `${duration(effort)} of planned participation`));
      if (activePeriod) {
        const entry = cadence.availability.find(row => row.personId === id && row.periodId === activePeriod.id);
        card.append(node('p', entry?.availableMinutes == null ? 'Availability to choose' : `${duration(entry.availableMinutes)} available in this period`, 'native-cadence__availability'));
      }
      const action = selection('Review availability', 'person', id, `availability:${id}`, selected,
        { periodId: activePeriod?.id ?? null }, 'native-cadence__quiet native-control--navigate');
      action.setAttribute('aria-label', `Review availability for ${person.label}`);
      const rackEntry = button(person.label, 'navigate', { kind: 'person', id }, `rack-person:${id}`,
        'studio-rack-record-key native-control--navigate');
      rackEntry.setAttribute('aria-label', `Open ${person.label} in Team planning`);
      rackEntry.dataset.cadencePreview = `${person.label} · ${duration(effort)} of planned participation.`;
      peopleKeys.append(rackEntry);
      const settings = button('Person settings', 'navigate', { kind: 'person', id }, `person-settings:${id}`, 'native-cadence__quiet native-control--navigate');
      const controls = node('div', undefined, 'native-cadence__local-actions'); controls.append(action, settings); card.append(controls); personRows.append(card);
    }
    if (!participants.size) peopleKeys.append(node('span', 'Add people to a session to plan their time.'));
    const stageKeys = recordRow('Stages');
    for (const stage of stages.filter(stage => inPeriod(stage) || stage.workIds.length === 0)) stageKeys.append(selection(stage.label, 'stage', stage.id, `rack-stage:${stage.id}`, selected,
      {}, 'studio-rack-record-key native-control--navigate'));
    stageKeys.append(create('Add stage', 'add-stage', { periodId: activePeriod?.id ?? null }, 'rack-add-stage'),
      create('Connect work', 'add-handoff', null, 'rack-add-handoff'));
    const railHandoffs = handoffs.filter(row => activePeriod ? inPeriod(row) && row.toPeriodId !== activePeriod.id : row.toPeriodId === null);
    const railDecisions = activePeriod ? [] : decisions.filter(row => row.periodId === null);
    const railDelays = activePeriod ? [] : model.delays.filter(row => row.toPeriodId === null);
    if (railHandoffs.length || railDecisions.length || railDelays.length) {
      const unplacedKeys = recordRow(activePeriod ? 'Handoffs' : 'To place');
      for (const handoff of railHandoffs) unplacedKeys.append(selection(`${endpointName(handoff.from)} → ${endpointName(handoff.to)}`,
        'handoff', handoff.id, `rack-handoff:${handoff.id}`, selected, {}, 'studio-rack-record-key native-control--navigate'));
      for (const decision of railDecisions) unplacedKeys.append(decisionMarker(decision, 'rack-unplaced'));
      for (const delay of railDelays) unplacedKeys.append(delayMarker(delay, 'rack-unplaced'));
    }
    extras.replaceChildren(fragment);
    if (restoredScroll) { board.scrollLeft = restoredScroll.board; tracks.scrollLeft = restoredScroll.tracks; }
    if (!periodChanged) for (const element of recordRail.querySelectorAll('[data-record-rail]'))
      element.scrollLeft = recordScroll.get(element.dataset.recordRail) ?? 0;
    if (arrivalFocus) {
      const arrival = [...root.querySelectorAll('[data-cadence-key]')].find(element => element.dataset.cadenceKey === arrivalFocus);
      arrival?.focus({ preventScroll: true });
      if (periodChanged) revealStudioDestination(activePeriod ? reading : arrival);
    }
    rendered = renderKey;
  }
  return Object.freeze({ refresh, getSessionSlot: () => disposed ? null : sessionSlot, dispose() {
    if (disposed) return; disposed = true; captionEdit = null; lastReading = null; rendered = null; actions.clear();
    root.removeEventListener('click', click); root.removeEventListener('pointerover', showPreview); root.removeEventListener('focusin', showPreview);
    externalFlowEvents?.removeEventListener('click', click);
    root.classList.remove('native-cadence', 'studio-rack-composition'); delete root.dataset.cadenceReading;
  } });
}
