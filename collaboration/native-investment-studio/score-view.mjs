import { money, INTEGER } from './display.mjs';
import { formatScoreTime } from './score-time.mjs';

const STATUS = Object.freeze({ satisfied: 'Ready in this arrangement', 'starts-before-ready': 'Starts before the preceding work is ready',
  'connection-paused': 'Connection paused', 'work-inactive': 'Supporting work paused or retired', 'needs-timing': 'Timing to choose' });
export const scoreMinute = value => value === null ? 'Timing to choose' : formatScoreTime(value);
const interval = row => `${scoreMinute(row.startMinute)}–${scoreMinute(row.endMinute)}`;

// The view projects admitted records. Position means elapsed minutes; the
// pricing owner retains money and the score owner retains interval arithmetic.
export function createScoreView(root, { onSelect, onNavigate, onAddDecision }) {
  const document = root.ownerDocument;
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function control(label, kind, id, action = 'select') {
    const button = node('button', label); button.type = 'button';
    Object.assign(button.dataset, { scoreViewAction: action, scoreKind: kind, scoreId: id });
    if (action === 'navigate') button.className = 'native-score__navigate native-control--navigate';
    return button;
  }
  function metric(label, value, hint) {
    const item = node('div'), term = node('dt', label), amount = node('dd', value);
    if (hint) amount.append(node('small', hint)); item.append(term, amount); return item;
  }
  const readout = node('dl', undefined, 'native-score__readout'); readout.dataset.scoreReadout = '';
  const stages = node('div', undefined, 'native-score__stages'); stages.setAttribute('aria-label', 'Stages and modeled decisions');
  const scroll = node('div', undefined, 'native-score__scroll'); scroll.tabIndex = 0; scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Coordination horizon. Scroll horizontally for a closer view.');
  const timeline = node('div', undefined, 'native-score__timeline'); scroll.append(timeline);
  const clipPreview = node('p', 'Focus a clip to see the effort and preceding activity.', 'native-score__clip-preview');
  clipPreview.dataset.scoreClipPreview = '';
  const origin = node('p', undefined, 'native-score__origin'); origin.dataset.scoreOrigin = '';
  const legend = node('ul', undefined, 'native-score__legend'); legend.setAttribute('aria-label', 'Horizon marks');
  for (const [kind, label] of [['allocated', 'Within funded time'], ['additional', 'Extra investment'], ['wait', 'Waiting'], ['gate', 'Modeled decision']]) {
    const item = node('li', label); item.dataset.kind = kind; legend.append(item);
  }
  const agenda = node('details', undefined, 'native-score__agenda'); agenda.append(node('summary', 'Read the chronological agenda'));
  const agendaRegion = node('div', undefined, 'native-score__table-scroll'); agendaRegion.tabIndex = 0;
  agendaRegion.setAttribute('role', 'region'); agendaRegion.setAttribute('aria-label', 'Chronological agenda');
  const agendaTable = node('table'); agendaTable.append(node('caption', 'Working sessions, waits and decisions in time order'));
  const agendaHead = node('thead'), agendaHeading = node('tr');
  for (const label of ['Time after plan start', 'Session or event', 'People and context']) { const cell = node('th', label); cell.scope = 'col'; agendaHeading.append(cell); }
  agendaHead.append(agendaHeading); const agendaRows = node('tbody'); agendaTable.append(agendaHead, agendaRows); agendaRegion.append(agendaTable); agenda.append(agendaRegion);
  const exact = node('details', undefined, 'native-score__exact'); exact.append(node('summary', 'Read exact timing and effort'));
  const tableRegion = node('div', undefined, 'native-score__table-scroll'); tableRegion.tabIndex = 0;
  const table = node('table'); tableRegion.append(table); exact.append(tableRegion);
  const capacity = node('details', undefined, 'native-score__capacity'); capacity.append(node('summary', 'People and available time'));
  const capacityRows = node('div', undefined, 'native-score__capacity-grid'); capacity.append(capacityRows);
  const dependencies = node('details', undefined, 'native-score__dependencies'); dependencies.append(node('summary', 'What must be ready first'));
  const edges = node('ul'); dependencies.append(edges);
  const banks = node('div', undefined, 'native-score__banks'); banks.dataset.scoreBanks = '';
  root.replaceChildren(readout, stages, origin, scroll, clipPreview, legend, agenda, exact, capacity, dependencies, banks);
  let disposed = false;
  function click(event) {
    const button = event.target.closest('[data-score-view-action]');
    if (!button || !root.contains(button) || disposed) return;
    const target = { kind: button.dataset.scoreKind, id: button.dataset.scoreId };
    if (button.dataset.scoreViewAction === 'add-decision') { onAddDecision(target.id); return; }
    (button.dataset.scoreViewAction === 'navigate' ? onNavigate : onSelect)(target);
  }
  root.addEventListener('click', click);
  function showPreview(event) {
    const clip = event.target.closest('[data-score-preview-text]');
    if (!disposed && clip && root.contains(clip)) clipPreview.textContent = clip.dataset.scorePreviewText;
  }
  root.addEventListener('pointerover', showPreview);
  root.addEventListener('focusin', showPreview);

  function refresh(projection, { selected = null, scale = 1, focusWorkId = null, preview = false } = {}) {
    if (disposed) return;
    const { state, result, score } = projection;
    clipPreview.textContent = 'Focus a clip to see the effort and preceding activity.';
    const people = new Map(state.people.map(row => [row.id, row.label]));
    const work = new Map(score.workRows.map(row => [row.workId, row]));
    const incoming = new Map(), preceding = new Map(), outgoing = new Map();
    for (const edge of score.dependencies) {
      if (!incoming.has(edge.toWorkId)) incoming.set(edge.toWorkId, []);
      if (!preceding.has(edge.toWorkId)) preceding.set(edge.toWorkId, []);
      if (!outgoing.has(edge.fromWorkId)) outgoing.set(edge.fromWorkId, []);
      incoming.get(edge.toWorkId).push(`${work.get(edge.fromWorkId).label}: ${STATUS[edge.status].toLowerCase()}`);
      preceding.get(edge.toWorkId).push(work.get(edge.fromWorkId).label);
      outgoing.get(edge.fromWorkId).push(work.get(edge.toWorkId).label);
    }
    const start = Math.min(score.window?.startMinute ?? Infinity, score.span.startMinute ?? Infinity);
    const end = Math.max(score.window?.endMinute ?? -Infinity, score.span.endMinute ?? -Infinity);
    const positioned = Number.isFinite(start) && Number.isFinite(end);
    const from = positioned ? start : 0, length = positioned ? Math.max(1, end - start) : 60;
    const percent = minute => `${(minute - from) / length * 100}%`;
    const selectedIs = (kind, id) => selected?.kind === kind && selected.id === id;
    const effort = score.capacity.reduce((sum, row) => sum + row.scheduledEffortMinutes + row.unscheduledEffortMinutes, 0);
    readout.replaceChildren(metric(preview ? 'Proposed elapsed span' : 'Elapsed span', scoreMinute(score.span.elapsedMinutes), 'Positioned work, waits and gates'),
      metric('Participant effort', scoreMinute(effort), 'Active planned work across people'),
      metric(preview ? 'Proposed investment' : 'Accepted investment', money(result.knownCommitmentCents), result.plannedCommitmentCents === null ? 'Known amount · some rates to choose' : 'Staffing and extra work'));
    root.dataset.scoreReading = preview ? 'proposed' : 'accepted';
    stages.replaceChildren();
    for (const stage of score.stages) {
      const item = node('div', undefined, 'native-score__stage');
      const button = control(stage.label, 'stage', stage.id);
      button.setAttribute('aria-pressed', String(selectedIs('stage', stage.id)));
      button.append(node('small', stage.status === 'placed' ? interval(stage) : stage.status === 'partial' ? 'Partly positioned' : 'Timing to choose'));
      item.append(button);
      for (const gate of score.gates.filter(row => row.afterStageId === stage.id)) {
        const socket = control(gate.label, 'gate', gate.id); socket.className = 'native-score__gate';
        socket.dataset.decision = gate.modeledDecision;
        socket.append(node('small', `Modeled decision · ${gate.modeledDecision}`)); item.append(socket);
      }
      const add = control('Add a decision', 'stage', stage.id, 'add-decision'); add.className = 'native-control--create'; add.setAttribute('aria-label', `Add a decision after ${stage.label}`); item.append(add);
      stages.append(item);
    }
    stages.hidden = !score.stages.length;
    timeline.replaceChildren(); timeline.style.setProperty('--score-scale', String(scale));
    const axis = node('div', undefined, 'native-score__row native-score__axis');
    axis.append(node('strong', 'Time after plan start'));
    const ticks = node('div', undefined, 'native-score__track');
    for (let step = 0; step <= 4; step++) { const tick = node('span', scoreMinute(Math.round(from + length * step / 4))); tick.style.left = `${step * 25}%`; ticks.append(tick); }
    axis.append(ticks); timeline.append(axis);
    function lane(label, kind, id, spans, className = '', explanation = '', previewText = explanation) {
      const row = node('div', undefined, `native-score__row ${className}`), labelButton = control(label, kind, id);
      labelButton.className = 'native-score__track-label'; labelButton.setAttribute('aria-pressed', String(selectedIs(kind, id)));
      const track = node('div', undefined, 'native-score__track');
      if (!spans.length) track.append(node('span', 'Timing to choose', 'native-score__unplaced'));
      for (const span of spans) {
        const bar = control(`${span.label ?? label} · ${interval(span)}`, kind, id);
        bar.className = 'native-score__clip'; bar.setAttribute('aria-pressed', String(selectedIs(kind, id)));
        bar.style.left = percent(span.startMinute); bar.style.width = `${(span.endMinute - span.startMinute) / length * 100}%`;
        bar.dataset.milestone = String(span.endMinute === span.startMinute);
        bar.dataset.active = String(span.active !== false); bar.dataset.funding = span.funding ?? kind;
        bar.setAttribute('aria-label', `${span.label ?? label}: ${interval(span)}${span.occurrenceIndex === undefined ? '' : `, occurrence ${span.occurrenceIndex + 1}`}${span.active === false ? ', paused or retired' : ''}`);
        bar.dataset.scorePreviewText = `${label} · ${previewText}`;
        bar.setAttribute('aria-description', explanation); track.append(bar);
      }
      row.append(labelButton, track); timeline.append(row);
    }
    for (const row of score.workRows) if (!focusWorkId || row.workId === focusWorkId) {
      const participants = row.personIds.map(id => people.get(id)).join(', ') || 'Participants to choose';
      const explanation = `${participants}. ${scoreMinute(row.durationMinutes)} per person, each session. ${row.funding === 'allocated' ? 'Within funded time' : 'Extra investment'}.` +
        (incoming.has(row.workId) ? ` Needs ${incoming.get(row.workId).join('; ')}.` : '') +
        (outgoing.has(row.workId) ? ` Supports ${outgoing.get(row.workId).join(', ')}.` : '');
      const previewText = `${INTEGER.format(row.durationMinutes)} minutes per person.` +
        (preceding.has(row.workId) ? ` Needs ${preceding.get(row.workId).join(', ')}.` : ' Preceding activity: unspecified.');
      lane(row.label, 'work', row.workId, row.occurrences, '', explanation, previewText);
    }
    for (const wait of score.waits) lane(wait.label, 'wait', wait.id, [wait], 'native-score__wait-row',
      `Waiting carries no participant effort. ${wait.reason ?? 'Describe the response being awaited.'}${wait.receiverPersonId ? ` Received by ${people.get(wait.receiverPersonId)}.` : ''}`);
    for (const gate of score.gates) lane(gate.label, 'gate', gate.id, gate.minute === null ? [] : [{ startMinute: gate.minute, endMinute: gate.minute, label: `${gate.label} · ${gate.modeledDecision}` }], 'native-score__gate-row',
      `${gate.question ?? 'Describe the decision to resolve.'} ${gate.reviewerPersonId ? `Reviewer: ${people.get(gate.reviewerPersonId)}. ` : ''}Funding remains an explicit choice after a modeled Proceed decision.`);
    origin.textContent = score.window?.label ?? 'Elapsed from the beginning of this plan';
    agendaRows.replaceChildren();
    for (const row of score.agenda) {
      if (focusWorkId && row.workId && row.workId !== focusWorkId) continue;
      const item = node('tr'), title = node('th'), button = control(row.label, row.navigation.kind, row.navigation.id); title.scope = 'row'; title.append(button);
      item.append(node('td', interval(row), 'native-score__agenda-time'), title,
        node('td', row.kind === 'wait' ? 'Waiting · no participant effort' : row.kind === 'gate' ? `Modeled decision · ${row.modeledDecision}` : `${row.personIds.map(id => people.get(id)).join(', ')}${row.active ? '' : ' · paused or retired'}`));
      agendaRows.append(item);
    }
    if (!agendaRows.children.length) { const row = node('tr'), cell = node('td', 'Choose timing for a working session to build the agenda.'); cell.colSpan = 3; row.append(cell); agendaRows.append(row); }
    table.replaceChildren(node('caption', 'Working-session timing, effort and funding'));
    const head = node('thead'), heading = node('tr');
    for (const label of ['Working session', 'Activity', 'First start after plan start', 'Last finish after plan start', 'Each session', 'Session starts every', 'Participant effort', 'Funding']) { const cell = node('th', label); cell.scope = 'col'; heading.append(cell); }
    head.append(heading); table.append(head); const body = node('tbody');
    for (const row of score.workRows) {
      const tr = node('tr'), title = node('th'); title.scope = 'row'; title.append(control(row.label, 'work', row.workId)); tr.append(title);
      const activity = row.active ? 'Active' : row.lifecycle === 'retired' ? 'Retired · outside active effort' : 'Paused · outside active effort';
      for (const value of [activity, scoreMinute(row.firstStartMinute), scoreMinute(row.lastEndMinute), `${row.occurrenceCount} × ${scoreMinute(row.durationMinutes)}`,
        row.repeatEveryMinutes === null ? 'One occurrence or timing to choose' : scoreMinute(row.repeatEveryMinutes), scoreMinute(row.participantMinutes), row.funding === 'allocated' ? 'Within funded time' : 'Extra investment']) tr.append(node('td', value));
      body.append(tr);
    }
    table.append(body);
    capacityRows.replaceChildren();
    for (const person of score.capacity) {
      const card = node('article', undefined, 'native-score__person'); card.dataset.attention = String(person.overlapMinutes > 0 || person.outsideAvailabilityMinutes > 0);
      card.dataset.scorePerson = person.personId; card.append(node('h5', person.label));
      const values = node('dl');
      values.append(metric('Scheduled effort', scoreMinute(person.scheduledEffortMinutes)), metric('Occupied time', scoreMinute(person.occupiedMinutes)),
        metric('Available time', person.availableMinutes === null ? 'To choose' : scoreMinute(person.availableMinutes)));
      card.append(values);
      if (person.unscheduledEffortMinutes) card.append(node('p', `${scoreMinute(person.unscheduledEffortMinutes)} of effort still needs timing.`));
      if (person.overlapMinutes) card.append(node('p', `${scoreMinute(person.overlapMinutes)} of overlapping work · up to ${person.peakConcurrent} simultaneous sessions. Inspect availability to trace the selected interval.`, 'native-score__attention'));
      if (person.outsideAvailabilityMinutes) card.append(node('p', `${scoreMinute(person.outsideAvailabilityMinutes)} falls outside the entered availability.`, 'native-score__attention'));
      const actions = node('div', undefined, 'native-score__record-actions'), inspect = control('Inspect availability', 'person', person.personId), settings = control('Person settings', 'person', person.personId, 'navigate');
      inspect.classList.add('native-control--navigate');
      inspect.setAttribute('aria-label', `Inspect availability for ${person.label}`); settings.setAttribute('aria-label', `Go to person settings for ${person.label}`);
      actions.append(inspect, settings); card.append(actions);
      capacityRows.append(card);
    }
    edges.replaceChildren(); dependencies.hidden = !score.dependencies.length;
    for (const edge of score.dependencies) {
      const from = work.get(edge.fromWorkId).label, to = work.get(edge.toWorkId).label;
      const item = node('li'), actions = node('div', undefined, 'native-score__record-actions'), inspect = control('Inspect handoff', 'dependency', edge.id);
      inspect.classList.add('native-control--navigate');
      inspect.setAttribute('aria-label', `Inspect handoff from ${from} to ${to}`); actions.append(inspect);
      item.append(node('h5', `${from} → ${to}`), node('p', `${STATUS[edge.status]} · ${scoreMinute(edge.lagMinutes)} between sessions${edge.slackMinutes === null ? '' : ` · ${scoreMinute(Math.abs(edge.slackMinutes))} ${edge.slackMinutes < 0 ? 'too early' : 'spare'}`}`, 'native-score__dependency-reading'));
      if (edge.connectionId) {
        const settings = control('Connection settings', 'connection', edge.connectionId, 'navigate'); settings.setAttribute('aria-label', `Go to connection settings for ${from} to ${to}`); actions.append(settings);
      }
      item.append(actions);
      edges.append(item);
    }
    banks.replaceChildren();
    for (const [bank, title] of [['next', 'Next work'], ['options', 'Options']]) {
      const panel = node('section', undefined, 'native-score__bank'); panel.append(node('h4', title));
      if (!score.banks[bank].length) panel.append(node('p', `Choose a possible session in ${title.toLowerCase()} to compare it before funding.`));
      for (const proposal of score.banks[bank]) {
        const button = control(proposal.work.label, 'proposal', proposal.id);
        button.append(node('small', `${proposal.work.occurrences} × ${scoreMinute(proposal.work.minutesPerOccurrence)} · proposed work`)); panel.append(button);
      }
      banks.append(panel);
    }
  }
  return Object.freeze({ refresh, dispose() { if (disposed) return; disposed = true; root.removeEventListener('click', click); root.removeEventListener('pointerover', showPreview); root.removeEventListener('focusin', showPreview); } });
}
