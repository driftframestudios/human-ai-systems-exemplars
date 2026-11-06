import { duration, money } from './display.mjs';
import { CADENCE_SUBDIVISIONS, projectCadence } from './cadence.mjs';

const DECISIONS = Object.freeze({ open: 'Open for review', proceed: 'Proceed in this model', revise: 'Revise the plan', hold: 'Hold this commitment' });
const noop = () => {};

// This view groups admitted occurrences. Clip width expresses a place in the
// plan; session duration and investment retain their existing model owners.
export function createCadenceView(root, {
  onSelect = noop, onNavigate = noop, onPeriod = noop, onAddSession = noop,
  onAddDecision = noop, onAddDelay = noop, onAddStage = noop, onCreateHorizon = noop, onTryReview = noop,
} = {}) {
  const document = root.ownerDocument;
  let disposed = false, previewReading = null, previousPeriodId;
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
    control.setAttribute('aria-pressed', String(selected?.kind === kind && selected.id === id
      && (extra.occurrenceIndex === undefined || selected.occurrenceIndex === undefined || selected.occurrenceIndex === extra.occurrenceIndex)));
    return control;
  }
  function create(label, action, target, key) {
    return button(label, action, target, key, 'native-control--create native-cadence__create');
  }
  function disclosure(label, key, expanded) {
    const details = node('details', undefined, 'native-cadence__details');
    details.dataset.cadenceDisclosure = key; details.open = expanded.has(key);
    details.append(node('summary', label)); return details;
  }
  function click(event) {
    const control = event.target.closest('[data-cadence-action]');
    if (disposed || !control || !root.contains(control)) return;
    const item = actions.get(control.dataset.cadenceKey); if (!item) return;
    const receivers = { select: onSelect, navigate: onNavigate, period: onPeriod,
      'add-session': onAddSession, 'add-decision': onAddDecision, 'add-delay': onAddDelay,
      'add-stage': onAddStage, 'create-horizon': onCreateHorizon, 'try-review': onTryReview };
    receivers[item.action]?.(item.target);
  }
  function showPreview(event) {
    const control = event.target.closest('[data-cadence-preview]');
    if (!disposed && previewReading && control && root.contains(control)) previewReading.textContent = control.dataset.cadencePreview;
  }
  root.addEventListener('click', click);
  root.addEventListener('pointerover', showPreview);
  root.addEventListener('focusin', showPreview);

  function refresh(projection, { periodId = null, selected = null, preview = false } = {}) {
    if (disposed) return;
    const expanded = new Set([...root.querySelectorAll('[data-cadence-disclosure][open]')].map(element => element.dataset.cadenceDisclosure));
    const focusKey = root.contains(document.activeElement) ? document.activeElement.dataset.cadenceKey : null;
    actions.clear();
    const { state, result } = projection, cadence = state.scoreSettings.cadence;
    const fragment = document.createDocumentFragment();
    root.classList.add('native-cadence'); root.dataset.cadenceReading = preview ? 'proposed' : 'accepted';
    if (!cadence) {
      const invitation = node('div', undefined, 'native-cadence__invitation');
      invitation.append(node('h4', 'Give this work a place in the plan'),
        node('p', 'Preview a sprint arrangement for these sessions. Their people, duration and investment stay together.'),
        create('Arrange this plan in sprints', 'create-horizon', null, 'create-horizon'));
      root.replaceChildren(invitation); return;
    }
    const model = projectCadence(state);
    const people = new Map(state.people.map(row => [row.id, row]));
    const work = new Map(state.work.map(row => [row.id, row]));
    const teams = new Map(state.teams.map(row => [row.id, row]));
    const periods = cadence.periods, periodById = new Map(periods.map(row => [row.id, row]));
    const activePeriod = periodById.get(periodId) ?? null;
    const currentPeriodId = activePeriod?.id ?? null;
    const periodChanged = previousPeriodId !== undefined && previousPeriodId !== currentPeriodId;
    const arrivalFocus = periodChanged ? currentPeriodId === null ? `period:${previousPeriodId}` : 'whole-plan' : focusKey;
    previousPeriodId = currentPeriodId;
    const subdivisionName = cadence.basis === 'quarter' ? 'Month' : 'Week';
    const subdivisionCount = CADENCE_SUBDIVISIONS[cadence.basis];
    const subdivisionLabel = value => value == null ? 'Choose a part of the period' : `${subdivisionName} ${value}`;
    const periodLabel = id => periodById.get(id)?.label ?? 'Choose a period';
    const occurrences = model.occurrences.map(row => ({ ...row, work: work.get(row.workId) })).filter(row => row.work);
    const visible = activePeriod ? occurrences.filter(row => row.periodId === activePeriod.id) : occurrences;
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
    const inPeriod = row => !activePeriod || row.periodIds?.includes(activePeriod.id)
      || row.fromPeriodId === activePeriod.id || row.toPeriodId === activePeriod.id;

    const breadcrumb = node('nav', undefined, 'native-cadence__breadcrumb'); breadcrumb.setAttribute('aria-label', 'Plan detail');
    const whole = button('Whole plan', 'period', null, 'whole-plan', 'native-cadence__return');
    whole.setAttribute('aria-current', activePeriod ? 'false' : 'page'); breadcrumb.append(whole);
    if (activePeriod) {
      const separator = node('span', '›'); separator.setAttribute('aria-hidden', 'true');
      const current = node('span', activePeriod.label); current.setAttribute('aria-current', 'page');
      breadcrumb.append(separator, current);
    }
    if (activePeriod) fragment.append(breadcrumb);

    const screen = node('section', undefined, 'native-cadence__screen'); screen.setAttribute('aria-label', activePeriod ? `${activePeriod.label} sessions and decisions` : 'Sprint and quarter plan overview');
    const reading = node('header', undefined, 'native-cadence__reading');
    const context = node('div'); context.append(node('h4', activePeriod?.label ?? 'Plan overview'));
    const cost = node('dl', undefined, 'native-cadence__amount');
    const amountLabel = result.plannedCommitmentCents === null ? 'Known included work' : 'Included work';
    cost.append(node('dt', preview ? `Proposed · ${amountLabel.toLowerCase()}` : amountLabel), node('dd', money(result.knownCommitmentCents)));
    reading.append(context, cost); screen.append(reading);

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
    function delayMarker(delay) {
      const control = selection(delay.label, 'delay', delay.id, `delay:${delay.id}`, selected, {}, 'native-cadence__delay native-control--navigate');
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
      if (matchingStages.length && subdivision === null) {
        const labels = node('p', matchingStages.map(stage => stage.label).join(' · '), 'native-cadence__stage-labels'); column.append(labels);
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
      column.append(clips, create('Add session', 'add-session', { periodId: period.id, subdivision: subdivision ?? 1 }, `add-session:${period.id}:${subdivision ?? 'overview'}`));
      return column;
    }
    const board = node('div', undefined, 'native-cadence__board');
    board.dataset.cadenceLevel = activePeriod ? 'period' : 'plan';
    board.tabIndex = 0; board.setAttribute('role', 'region'); board.setAttribute('aria-label', activePeriod ? 'Week or month overview' : 'Plan period overview; scroll across periods');
    if (periodChanged) board.dataset.cadenceArrival = activePeriod ? 'period' : 'plan';
    board.style.setProperty('--cadence-columns', String(activePeriod ? subdivisionCount : periods.length));
    if (activePeriod) for (let part = 1; part <= subdivisionCount; part++) board.append(periodColumn(activePeriod, part));
    else for (const period of periods) board.append(periodColumn(period));
    screen.append(board);
    if (activePeriod) {
      const delays = model.delays.filter(row => row.fromPeriodId === activePeriod.id || row.toPeriodId === activePeriod.id);
      if (delays.length) {
        const rail = node('section', undefined, 'native-cadence__period-delays');
        rail.append(node('h5', 'Delays affecting this period'));
        for (const delay of delays) rail.append(delayMarker(delay));
        screen.append(rail);
      }
    }
    const trackColumns = activePeriod
      ? Array.from({ length: subdivisionCount }, (_, index) => ({ period: activePeriod, subdivision: index + 1, label: subdivisionLabel(index + 1) }))
      : periods.map(period => ({ period, subdivision: null, label: period.label }));
    const tracks = node('div', undefined, 'native-cadence__tracks'); tracks.tabIndex = 0;
    tracks.setAttribute('role', 'region'); tracks.setAttribute('aria-label', 'Session tracks; scroll across the planning periods');
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
    for (const item of state.work.filter(item => !activePeriod || visible.some(row => row.workId === item.id))) {
      const tr = node('tr'), label = node('th'); label.scope = 'row';
      const name = selection(item.label, 'work', item.id, `track-work:${item.id}`, selected, {}, 'native-cadence__track-name native-control--navigate');
      name.setAttribute('aria-label', `${item.label}, ${duration(item.minutesPerOccurrence)} per person. Open session settings.`); label.append(name); tr.append(label);
      for (const column of trackColumns) {
        const cell = node('td'), pads = node('div', undefined, 'native-cadence__pads');
        pads.style.setProperty('--cadence-pad-columns', String(activePeriod ? slotsPerPart : subdivisionCount * slotsPerPart));
        const members = occurrences.filter(row => row.workId === item.id && row.periodId === column.period.id
          && (column.subdivision === null || row.subdivision === column.subdivision));
        const partCounts = new Map();
        for (const row of members) {
          const pad = selection(activePeriod ? `Session ${row.occurrenceIndex + 1}` : `${cadence.basis === 'quarter' ? 'M' : 'W'}${row.subdivision}`,
            'work', item.id, `pad:${item.id}:${row.occurrenceIndex}`, selected,
            { occurrenceIndex: row.occurrenceIndex, periodId: row.periodId }, 'native-cadence__pad native-control--navigate');
          pad.dataset.funding = item.funding; pad.dataset.active = String(row.active);
          const partIndex = partCounts.get(row.subdivision) ?? 0;
          partCounts.set(row.subdivision, partIndex + 1);
          if (!activePeriod) pad.style.gridColumn = String((row.subdivision - 1) * slotsPerPart + partIndex % slotsPerPart + 1);
          pad.dataset.cadencePreview = workPreview(row);
          pad.setAttribute('aria-label', `${item.label}, session ${row.occurrenceIndex + 1}, ${column.period.label}, ${subdivisionLabel(row.subdivision)}. ${duration(item.minutesPerOccurrence)} per person. Open session settings.`);
          pads.append(pad);
        }
        if (!members.length) { const empty = node('span', '—', 'native-cadence__rest'); empty.setAttribute('aria-label', 'No sessions in this period'); pads.append(empty); }
        cell.append(pads); tr.append(cell);
      }
      trackBody.append(tr);
    }
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
    trackTable.append(trackHead, trackBody); tracks.append(trackTable); screen.append(tracks);
    previewReading = node('p', 'Hover over or focus a pad to see the work it needs.', 'native-cadence__preview');
    previewReading.dataset.cadencePreviewReading = ''; screen.append(previewReading); fragment.append(screen);
    if (state.planId === 'service-request-pilot' && cadence.basis === 'sprint' && periods.length === 4
      && work.get('review')?.status === 'planned' && work.get('review')?.lifecycle !== 'retired') {
      const demonstration = node('div', undefined, 'native-cadence__demonstration');
      demonstration.append(button('Try a later review', 'try-review', null, 'try-review', 'native-cadence__quiet'));
      fragment.append(demonstration);
    }

    const flow = disclosure('Stages & handoffs · inspect relationships', 'flow', expanded);
    flow.classList.add('native-cadence__flow');
    const flowHeading = node('header', undefined, 'native-cadence__section-heading');
    flowHeading.append(node('h4', 'Stages & handoffs'), create('Add stage', 'add-stage', { periodId: activePeriod?.id ?? null }, 'add-stage'));
    flow.append(flowHeading);
    const stageRows = node('div', undefined, 'native-cadence__stages');
    for (const stage of stages.filter(inPeriod)) {
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
    for (const decision of decisions.filter(row => row.periodId === null)) flow.append(decisionMarker(decision, 'unplaced'));
    for (const delay of model.delays.filter(row => row.toPeriodId === null)) flow.append(delayMarker(delay));
    fragment.append(flow);

    const unplaced = occurrences.filter(row => row.periodId === null || !periodById.has(row.periodId));
    if (unplaced.length) {
      const tray = node('section', undefined, 'native-cadence__unplaced');
      tray.append(node('h4', 'Choose a period'), node('p', 'These sessions stay in the plan. Open one to give it a place.'));
      const clips = node('div', undefined, 'native-cadence__unplaced-clips');
      for (const row of unplaced) clips.append(sessionClip([row], `unplaced:${row.workId}:${row.occurrenceIndex}`));
      tray.append(clips); fragment.append(tray);
    }

    const availability = disclosure(activePeriod ? `People in ${activePeriod.label}` : 'People and available time', 'people', expanded);
    const personRows = node('div', undefined, 'native-cadence__people');
    const participants = activePeriod ? new Set(visible.flatMap(row => row.work.personIds)) : new Set(state.people.map(row => row.id));
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
      const settings = button('Person settings', 'navigate', { kind: 'person', id }, `person-settings:${id}`, 'native-cadence__quiet native-control--navigate');
      const controls = node('div', undefined, 'native-cadence__local-actions'); controls.append(action, settings); card.append(controls); personRows.append(card);
    }
    availability.append(personRows); fragment.append(availability);
    root.replaceChildren(fragment);
    if (arrivalFocus) [...root.querySelectorAll('[data-cadence-key]')].find(element => element.dataset.cadenceKey === arrivalFocus)?.focus({ preventScroll: !periodChanged });
  }
  return Object.freeze({ refresh, dispose() {
    if (disposed) return; disposed = true; actions.clear(); previewReading = null;
    root.removeEventListener('click', click); root.removeEventListener('pointerover', showPreview); root.removeEventListener('focusin', showPreview);
    root.classList.remove('native-cadence'); delete root.dataset.cadenceReading;
  } });
}
