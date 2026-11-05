export const SCORE_VERSION = '1.0.0';

// Each plan receives its own empty settings; old plans acquire no implied timing.
export function createScoreSettings() {
  return { version: SCORE_VERSION, window: null, dependencies: [], stages: [], waits: [], gates: [], proposals: [] };
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const navigation = (kind, id) => ({ kind, id, chapter: kind === 'person' ? 'people' : 'coordination' });
function union(rows) {
  const result = [];
  for (const row of [...rows].sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute)) {
    if (row.endMinute === row.startMinute) continue;
    const previous = result.at(-1);
    if (previous && row.startMinute <= previous.endMinute) previous.endMinute = Math.max(previous.endMinute, row.endMinute);
    else result.push({ ...row });
  }
  return result;
}
function outside(occupied, available) {
  const result = [];
  let next = 0;
  for (const span of occupied) {
    let cursor = span.startMinute;
    while (next < available.length && available[next].endMinute <= cursor) next++;
    let index = next;
    while (index < available.length && available[index].startMinute < span.endMinute) {
      const slot = available[index];
      if (slot.startMinute > cursor) result.push({ startMinute: cursor, endMinute: Math.min(slot.startMinute, span.endMinute) });
      cursor = Math.max(cursor, slot.endMinute);
      if (cursor >= span.endMinute) break;
      index++;
    }
    if (cursor < span.endMinute) result.push({ startMinute: cursor, endMinute: span.endMinute });
  }
  return result;
}
const duration = rows => rows.reduce((sum, row) => sum + row.endMinute - row.startMinute, 0);
function capacity(person, assignments, unplaced) {
  const events = [];
  let effortMinutes = 0;
  for (const occurrence of assignments) {
    effortMinutes += occurrence.endMinute - occurrence.startMinute;
    if (occurrence.endMinute === occurrence.startMinute) continue;
    events.push({ minute: occurrence.startMinute, delta: 1 });
    events.push({ minute: occurrence.endMinute, delta: -1 });
  }
  events.sort((a, b) => a.minute - b.minute || a.delta - b.delta);
  const occupied = [], overlap = [];
  let active = 0, previous = null, peakConcurrent = 0;
  for (let index = 0; index < events.length;) {
    const minute = events[index].minute;
    if (previous !== null && minute > previous && active) {
      const interval = { startMinute: previous, endMinute: minute };
      occupied.push(interval);
      if (active > 1) overlap.push({ ...interval, concurrent: active });
    }
    while (index < events.length && events[index].minute === minute) {
      active += events[index++].delta;
    }
    peakConcurrent = Math.max(peakConcurrent, active);
    previous = minute;
  }
  const occupiedIntervals = union(occupied);
  const availability = person.availability == null ? null : union(person.availability);
  const outsideAvailability = availability === null ? null : outside(occupiedIntervals, availability);
  return { personId: person.id, label: person.label, lifecycle: person.lifecycle,
    navigation: navigation('person', person.id), scheduledEffortMinutes: effortMinutes,
    unscheduledEffortMinutes: unplaced.minutes, unscheduledWorkIds: [...unplaced.workIds], occupiedMinutes: duration(occupiedIntervals),
    occupiedIntervals, overlapMinutes: duration(overlap), overlap, peakConcurrent,
    availability, availableMinutes: availability === null ? null : duration(availability),
    outsideAvailability, outsideAvailabilityMinutes: outsideAvailability === null ? null : duration(outsideAvailability) };
}

// A selected interval earns its participating-work inspection; compact conflict rows keep the full projection linear in output size.
export function selectScoreIntervalWork(score, personId, interval) {
  if (interval.endMinute <= interval.startMinute) return Object.freeze([]);
  return Object.freeze(score.occurrences.filter(row => row.active && row.endMinute > row.startMinute
    && row.personIds.includes(personId) && row.startMinute < interval.endMinute && row.endMinute > interval.startMinute));
}
// Admission owns references, integer bounds, recurrence expansion budgets and
// dependency cycles. This projection owns detached relative-minute readings.
export function projectScore(plan) {
  const settings = plan.scoreSettings;
  const connectionById = new Map(plan.connections.map(connection => [connection.id, connection]));
  const window = settings.window === null ? null : { ...settings.window };
  const workRows = [], occurrences = [], diagnostics = [];
  const assignmentsByPerson = new Map(plan.people.map(person => [person.id, []]));
  const unplacedByPerson = new Map(plan.people.map(person => [person.id, { minutes: 0, workIds: [] }]));
  for (const work of plan.work) {
    const active = work.status === 'planned' && work.lifecycle !== 'retired';
    const row = { workId: work.id, label: work.label, teamId: work.teamId, personIds: [...work.personIds], funding: work.funding,
      status: work.status, lifecycle: work.lifecycle, active, durationMinutes: work.minutesPerOccurrence,
      occurrenceCount: work.occurrences, effortMinutesPerPerson: work.minutesPerOccurrence * work.occurrences,
      participantMinutes: work.minutesPerOccurrence * work.occurrences * work.personIds.length,
      placement: work.occurrences === 0 ? 'empty' : work.timing === null ? 'unspecified' : 'placed',
      repeatEveryMinutes: work.timing?.repeatEveryMinutes ?? null,
      firstStartMinute: null, lastEndMinute: null, spanMinutes: null,
      occurrences: [], navigation: navigation('work', work.id) };
    workRows.push(row);
    if (row.placement === 'unspecified') diagnostics.push({ code: 'needs-timing', kind: 'work', id: work.id, workId: work.id });
    if (active && work.timing === null && work.occurrences > 0) for (const personId of work.personIds) {
      const unplaced = unplacedByPerson.get(personId);
      unplaced.minutes += row.effortMinutesPerPerson; unplaced.workIds.push(work.id);
    }
    if (work.timing === null || work.occurrences === 0) continue;
    const first = work.timing.startMinute, repeat = work.timing.repeatEveryMinutes ?? 0;
    const lastEnd = first + (work.occurrences - 1) * repeat + work.minutesPerOccurrence;
    row.firstStartMinute = first; row.lastEndMinute = lastEnd; row.spanMinutes = lastEnd - first;
    if (window && (first < window.startMinute || lastEnd > window.endMinute)) diagnostics.push({ code: 'outside-planning-window', kind: 'work', id: work.id, workId: work.id });
    for (let index = 0; index < work.occurrences; index++) {
      const occurrence = { kind: work.minutesPerOccurrence === 0 ? 'milestone' : 'work', workId: work.id, occurrenceIndex: index,
        label: work.label, teamId: work.teamId, personIds: [...work.personIds], funding: work.funding,
        status: work.status, lifecycle: work.lifecycle, active,
        startMinute: first + index * repeat, endMinute: first + index * repeat + work.minutesPerOccurrence,
        navigation: navigation('work', work.id) };
      occurrences.push(occurrence); row.occurrences.push(occurrence);
      if (active) for (const personId of work.personIds) {
        assignmentsByPerson.get(personId).push(occurrence);
      }
    }
  }
  const derivedWorkById = new Map(workRows.map(row => [row.workId, row]));
  const dependencies = settings.dependencies.map(row => {
    const from = derivedWorkById.get(row.fromWorkId), to = derivedWorkById.get(row.toWorkId);
    const suspended = row.connectionId !== null && connectionById.get(row.connectionId).status === 'paused';
    const positioned = from.lastEndMinute !== null && to.firstStartMinute !== null;
    const earliestStartMinute = from.lastEndMinute === null ? null : from.lastEndMinute + row.lagMinutes;
    const slackMinutes = positioned ? to.firstStartMinute - earliestStartMinute : null;
    const status = suspended ? 'connection-paused' : !from.active || !to.active ? 'work-inactive' : !positioned ? 'needs-timing' : slackMinutes < 0 ? 'starts-before-ready' : 'satisfied';
    return { id: row.id, fromWorkId: row.fromWorkId, toWorkId: row.toWorkId, lagMinutes: row.lagMinutes,
      connectionId: row.connectionId, earliestStartMinute, slackMinutes, status,
      navigation: navigation('dependency', row.id) };
  });
  const capacityRows = plan.people.map(person => capacity(person, assignmentsByPerson.get(person.id), unplacedByPerson.get(person.id)));
  const stageById = new Map();
  const stages = settings.stages.map(stage => {
    const rows = stage.workIds.map(id => derivedWorkById.get(id));
    const positioned = rows.filter(row => row.firstStartMinute !== null);
    const unspecified = rows.filter(row => row.placement === 'unspecified');
    const result = { id: stage.id, label: stage.label, workIds: [...stage.workIds],
      unspecifiedWorkIds: unspecified.map(row => row.workId), navigation: navigation('stage', stage.id),
      status: unspecified.length ? positioned.length ? 'partial' : 'needs-timing' : positioned.length ? 'placed' : 'empty',
      startMinute: positioned.length ? Math.min(...positioned.map(row => row.firstStartMinute)) : null,
      endMinute: positioned.length ? Math.max(...positioned.map(row => row.lastEndMinute)) : null };
    stageById.set(stage.id, result); return result;
  });
  const gates = settings.gates.map(gate => {
    const stage = stageById.get(gate.afterStageId);
    return { id: gate.id, label: gate.label, afterStageId: gate.afterStageId, reviewerPersonId: gate.reviewerPersonId,
      question: gate.question, evidence: gate.evidence, modeledDecision: gate.modeledDecision,
      minute: stage.status === 'placed' ? stage.endMinute : null,
      standing: 'modeled-decision', navigation: navigation('gate', gate.id) };
  });
  const waits = settings.waits.map(wait => ({ kind: 'wait', ...wait,
    navigation: navigation('wait', wait.id) }));
  for (const wait of waits) if (window && (wait.startMinute < window.startMinute || wait.endMinute > window.endMinute)) {
    diagnostics.push({ code: 'outside-planning-window', kind: 'wait', id: wait.id });
  }
  const agenda = [...occurrences, ...waits,
    ...gates.filter(gate => gate.minute !== null).map(gate => ({ kind: 'gate', id: gate.id, label: gate.label,
      startMinute: gate.minute, endMinute: gate.minute, modeledDecision: gate.modeledDecision,
      afterStageId: gate.afterStageId, reviewerPersonId: gate.reviewerPersonId, question: gate.question,
      evidence: gate.evidence, standing: gate.standing, navigation: { ...gate.navigation } }))]
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  const positionedStart = agenda.length ? Math.min(...agenda.map(row => row.startMinute)) : null;
  const positionedEnd = agenda.length ? Math.max(...agenda.map(row => row.endMinute)) : null;
  const proposals = settings.proposals.map(proposal => ({ ...structuredClone(proposal),
    navigation: navigation('proposal', proposal.id) }));
  return freeze({ window, workRows, occurrences, capacity: capacityRows, dependencies, stages, gates, waits, agenda, diagnostics,
    span: { startMinute: positionedStart, endMinute: positionedEnd, elapsedMinutes: positionedEnd === null ? null : positionedEnd - positionedStart },
    banks: { committedWorkIds: workRows.map(row => row.workId),
      next: proposals.filter(proposal => proposal.bank === 'next'),
      options: proposals.filter(proposal => proposal.bank === 'options') },
    navigation: { people: plan.people.map(person => ({ personId: person.id, label: person.label, ...navigation('person', person.id) })),
      connections: plan.connections.map(connection => ({ ...navigation('connection', connection.id), status: connection.status, workIds: [...connection.workIds] })) } });
}
