import { expandWorkSessions } from './work-sessions.mjs';
import { createCadenceOccurrenceIndex } from './cadence-occurrences.mjs';
export const CADENCE_VERSION = '1.0.0';
export const CADENCE_PERIOD_LIMIT = 24;
export const CADENCE_SUBDIVISIONS = Object.freeze({ sprint: 2, quarter: 3 });
const periodLabel = (basis, index) => `${basis === 'sprint' ? 'Sprint' : 'Quarter'} ${index + 1}`;
const clone = value => structuredClone(value);
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
function configuration(basis, count) {
  if (!Object.hasOwn(CADENCE_SUBDIVISIONS, basis) || !Number.isSafeInteger(count) || count < 1 || count > CADENCE_PERIOD_LIMIT)
    throw new RangeError('Choose sprints or quarters and a whole number of periods from 1 through 24.');
}

export function createCadence(basis = 'sprint', count = 4) {
  configuration(basis, count);
  return { version: CADENCE_VERSION, basis,
    periods: Array.from({ length: count }, (_, index) => ({ id: `period-${index + 1}`, label: periodLabel(basis, index) })),
    placements: [], availability: [], handoffs: [], decisionAnchors: [], delays: [] };
}

// Periods are planning groups. Resizing keeps each session occurrence while
// explicitly returning assignments outside the retained horizon for placement.
export function resizeCadence(cadence, count) {
  configuration(cadence.basis, count);
  const next = clone(cadence), used = new Set(next.periods.map(row => row.id));
  next.periods = next.periods.slice(0, count);
  for (let index = next.periods.length; index < count; index++) {
    let serial = index + 1; while (used.has(`period-${serial}`)) serial++;
    const id = `period-${serial}`; used.add(id);
    next.periods.push({ id, label: periodLabel(next.basis, index) });
  }
  const retained = new Set(next.periods.map(row => row.id));
  next.placements = next.placements.map(row => retained.has(row.periodId) ? row : { ...row, periodId: null, subdivision: null });
  next.availability = next.availability.filter(row => retained.has(row.periodId));
  next.delays = next.delays.map(row => ({ ...row,
    fromPeriodId: retained.has(row.fromPeriodId) ? row.fromPeriodId : null,
    toPeriodId: retained.has(row.toPeriodId) ? row.toPeriodId : null }));
  return next;
}

// A proposed regrouping retains ordered work and effort; it makes no calendar
// conversion between sprints and quarters. The caller previews before Apply.
export function regroupCadence(cadence, basis, count = cadence.periods.length) {
  configuration(basis, count);
  const next = clone(cadence), periods = createCadence(basis, count).periods;
  const index = new Map(cadence.periods.map((row, position) => [row.id, position]));
  const target = id => id === null ? null : periods[Math.min(count - 1, Math.floor(index.get(id) * count / cadence.periods.length))].id;
  next.basis = basis; next.periods = periods;
  next.placements = next.placements.map(row => ({ ...row, periodId: target(row.periodId),
    subdivision: row.periodId === null ? null : Math.min(CADENCE_SUBDIVISIONS[basis],
      Math.floor((row.subdivision - 1) * CADENCE_SUBDIVISIONS[basis] / CADENCE_SUBDIVISIONS[cadence.basis]) + 1) }));
  // A different planning scale supplies no new evidence of people's availability.
  next.availability = [];
  next.delays = next.delays.map(row => ({ ...row, fromPeriodId: target(row.fromPeriodId), toPeriodId: target(row.toPeriodId) }));
  return next;
}

export function replaceWorkPlacements(cadence, work, placements) {
  if (cadence === null) {
    if (placements?.length) throw new RangeError('Choose a planning horizon before placing sessions.');
    return null;
  }
  if (placements === undefined) return { ...cadence,
    placements: cadence.placements.filter(row => row.workId !== work.id || row.occurrenceIndex < work.occurrences) };
  const selected = new Map(placements.map(row => [row.occurrenceIndex, { ...row, workId: work.id }]));
  const next = []; let insertion = -1;
  for (const row of cadence.placements) {
    if (row.workId !== work.id) next.push(row);
    else {
      const replacement = selected.get(row.occurrenceIndex);
      if (replacement) { next.push(replacement); selected.delete(row.occurrenceIndex); }
      insertion = next.length;
    }
  }
  next.splice(insertion < 0 ? next.length : insertion, 0, ...selected.values());
  return { ...cadence, placements: next };
}

export function projectCadence(plan) {
  const cadence = plan.scoreSettings.cadence;
  if (!cadence) return null;
  const periodIndex = new Map(cadence.periods.map((row, index) => [row.id, index]));
  const placed = new Map(cadence.placements.map(row => [`${row.workId}:${row.occurrenceIndex}`, row]));
  const placementOrder = new Map(cadence.placements.map((row, index) => [`${row.workId}:${row.occurrenceIndex}`, index]));
  const stageById = new Map(plan.scoreSettings.stages.map(row => [row.id, row]));
  const occurrences = [], unplaced = [];
  for (const work of plan.work) for (const session of expandWorkSessions(work)) {
    const { occurrenceIndex } = session;
    const placement = placed.get(`${work.id}:${occurrenceIndex}`);
    const row = { ...session, durationMinutes: session.minutesPerOccurrence,
      periodId: placement?.periodId ?? null, subdivision: placement?.subdivision ?? null };
    occurrences.push(row); if (row.periodId === null) unplaced.push(row);
  }
  occurrences.sort((a, b) => (placementOrder.get(`${a.workId}:${a.occurrenceIndex}`) ?? cadence.placements.length)
    - (placementOrder.get(`${b.workId}:${b.occurrenceIndex}`) ?? cadence.placements.length));
  const ordered = rows => rows.filter(row => row.periodId !== null).sort((a, b) => periodIndex.get(a.periodId) - periodIndex.get(b.periodId) || a.subdivision - b.subdivision);
  const membership = createCadenceOccurrenceIndex(occurrences);
  const endpoints = { work: new Map(), stage: new Map() };
  const endpointReading = endpoint => {
    const cache = endpoints[endpoint.kind];
    if (!cache.has(endpoint.id)) {
      const workIds = endpoint.kind === 'work' ? [endpoint.id] : [...stageById.get(endpoint.id).workIds];
      const rows = workIds.flatMap(id => membership.forWork(id));
      cache.set(endpoint.id, { workIds, rows: ordered(rows),
        complete: rows.length > 0 && rows.every(row => row.periodId !== null) });
    }
    return cache.get(endpoint.id);
  };
  const stages = plan.scoreSettings.stages.map(stage => {
    const { rows, complete } = endpointReading({ kind: 'stage', id: stage.id });
    return { ...clone(stage), periodIds: [...new Set(rows.map(row => row.periodId))],
      status: complete ? 'placed' : rows.length ? 'partial' : 'unplaced',
      firstPeriodId: rows[0]?.periodId ?? null, lastPeriodId: complete ? rows.at(-1).periodId : null };
  });
  const connections = new Map(plan.connections.map(row => [row.id, row]));
  const handoffs = cadence.handoffs.map(edge => {
    const source = endpointReading(edge.from), destination = endpointReading(edge.to);
    const from = source.rows.at(-1), to = destination.rows[0];
    const paused = edge.connectionId !== null && connections.get(edge.connectionId).status === 'paused';
    const sequence = !source.complete || !destination.complete ? 'choose-period' : periodIndex.get(to.periodId) < periodIndex.get(from.periodId)
      || to.periodId === from.periodId && to.subdivision < from.subdivision ? 'review-order' : 'in-order';
    return { ...clone(edge), fromWorkIds: source.workIds, toWorkIds: destination.workIds,
      fromPeriodId: source.complete ? from.periodId : null, toPeriodId: destination.complete ? to.periodId : null,
      periodIds: [...new Set([from?.periodId, to?.periodId].filter(Boolean))],
      subdivision: to?.subdivision ?? null, status: paused ? 'paused' : sequence };
  });
  const handoffById = new Map(handoffs.map(row => [row.id, row]));
  const anchors = new Map(cadence.decisionAnchors.map(row => [row.gateId, row]));
  const projectedStages = new Map(stages.map(row => [row.id, row]));
  const decisions = plan.scoreSettings.gates.map(gate => {
    const anchor = anchors.get(gate.id) ?? { kind: 'stage', id: gate.afterStageId };
    const stage = anchor.kind === 'stage' ? projectedStages.get(anchor.id) : null;
    const handoff = anchor.kind === 'handoff' ? handoffById.get(anchor.id) : null;
    return { ...clone(gate), anchor: { kind: anchor.kind, id: anchor.id },
      periodId: stage?.lastPeriodId ?? handoff?.toPeriodId ?? null,
      subdivision: stage ? endpointReading({ kind: 'stage', id: stage.id }).rows.at(-1)?.subdivision ?? null : handoff?.subdivision ?? null };
  });
  const effortByPeriod = new Map(), decisionsByPeriod = new Map();
  for (const row of occurrences) {
    if (!row.active || row.periodId === null) continue;
    if (!effortByPeriod.has(row.periodId)) effortByPeriod.set(row.periodId, new Map());
    const people = effortByPeriod.get(row.periodId);
    for (const id of row.personIds) people.set(id, (people.get(id) ?? 0) + row.durationMinutes);
  }
  for (const row of decisions) {
    if (!decisionsByPeriod.has(row.periodId)) decisionsByPeriod.set(row.periodId, []);
    decisionsByPeriod.get(row.periodId).push(row);
  }
  const availability = cadence.availability.map(row => ({ ...row,
    plannedMinutes: effortByPeriod.get(row.periodId)?.get(row.personId) ?? 0 }));
  return freeze({ basis: cadence.basis, periods: cadence.periods.map(period => ({ ...period,
    subdivisions: Array.from({ length: CADENCE_SUBDIVISIONS[cadence.basis] }, (_, index) => ({ index: index + 1, label: `${cadence.basis === 'sprint' ? 'Week' : 'Month'} ${index + 1}` })),
    occurrences: membership.forPeriod(period.id), decisions: decisionsByPeriod.get(period.id) ?? [] })),
    occurrences, unplaced, stages, handoffs, decisions, delays: clone(cadence.delays), availability });
}
