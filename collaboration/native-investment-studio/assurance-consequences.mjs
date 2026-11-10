import { summarizeWorkSessions, workSessionGroups } from './work-sessions.mjs';

// Admitted projections own prices and timing. This reading names the explicit
// support relationships; a linked session or observation does not grant approval.
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}

function lineAmounts(lines) {
  const known = lines.reduce((total, line) => total + BigInt(line.cents ?? 0), 0n);
  const representable = known <= BigInt(Number.MAX_SAFE_INTEGER);
  const knownLineCents = representable ? Number(known) : null;
  return { knownLineCents, totalLineCents: representable && lines.every(line => line.cents !== null) ? knownLineCents : null,
    lineAmountStatus: !representable ? 'outside-display-range' : lines.some(line => line.cents === null) ? 'incomplete' : 'priced' };
}

const plannedEffort = row => Object.hasOwn(row, 'activePersonMinutes') ? row.activePersonMinutes > 0
  : row.status === 'planned' && row.lifecycle === 'active' && row.personMinutes > 0;

function snapshot(projection) {
  const { state, result, assurance, score } = projection, settings = state.assuranceSettings;
  const linkedIds = new Set([
    ...settings.quality.concepts, ...settings.recoveryEvents, ...settings.learningActions, ...settings.rehearsals,
  ].flatMap(row => row.workIds));
  const ledger = new Map(result.ledger.map(row => [row.workId, row]));
  const timing = new Map(score.workRows.map(row => [row.workId, row]));
  const work = state.work.filter(row => linkedIds.has(row.id)).map(row => {
    const timed = timing.get(row.id), ledgerLines = structuredClone(ledger.get(row.id).lines), summary = summarizeWorkSessions(row);
    const activeGroups = workSessionGroups(row).filter(session => session.status === 'planned' && row.lifecycle === 'active' && session.minutesPerOccurrence > 0);
    return { workId: row.id, label: row.label, teamId: row.teamId, personIds: summary.personIds,
      ...(row.sessionOverrides?.length ? { teamIds: summary.teamIds,
        activePersonIds: [...new Set(activeGroups.flatMap(session => session.personIds))], activeTeamIds: [...new Set(activeGroups.map(session => session.teamId))],
        durationMinutes: summary.durationMinutes, variedSessions: true, activePersonMinutes: summary.activeParticipantMinutes } : {}),
      minutesPerOccurrence: row.minutesPerOccurrence, occurrences: row.occurrences,
      personMinutes: summary.participantMinutes, funding: summary.funding, status: summary.status, lifecycle: row.lifecycle,
      ledgerLines, ...lineAmounts(ledgerLines),
      timing: { placement: timed.placement, startMinute: timed.firstStartMinute,
        endMinute: timed.lastEndMinute, elapsedMinutes: timed.spanMinutes } };
  });
  const workById = new Map(work.map(row => [row.workId, row]));
  const concepts = assurance.quality.concepts.map(row => ({
    conceptId: row.conceptId, label: row.label, included: row.included, workIds: [...row.workIds],
    activeWorkIds: row.workIds.filter(id => plannedEffort(workById.get(id))),
    pausedWorkIds: row.workIds.filter(id => ['paused', 'mixed'].includes(workById.get(id).status)),
    retiredWorkIds: row.workIds.filter(id => workById.get(id).lifecycle === 'retired'),
  }));
  const names = new Map(assurance.rehearsals.map(row => [`${row.definition.id}@${row.definition.version}`, row.definition.name]));
  const rehearsals = settings.rehearsals.map(row => ({ ...structuredClone(row),
    label: names.get(`${row.definitionId}@${row.definitionVersion}`) }));
  const people = new Map(state.people.map(row => [row.id, { personId: row.id, badges: [] }]));
  const teams = new Map(state.teams.map(row => [row.id, { teamId: row.id, badges: [] }]));
  const activePeople = new Set(state.people.filter(row => row.lifecycle === 'active').map(row => row.id));
  const activeTeams = new Set(state.teams.filter(row => row.lifecycle === 'active').map(row => row.id));

  function plannedBadges(record, kind, sourceKind, label) {
    const personWork = new Map(), teamWork = new Map();
    for (const workId of record.workIds) {
      const row = workById.get(workId); if (!plannedEffort(row)) continue;
      for (const personId of row.activePersonIds ?? row.personIds) if (activePeople.has(personId)) {
        if (!personWork.has(personId)) personWork.set(personId, []);
        personWork.get(personId).push(workId);
      }
      for (const teamId of row.activeTeamIds ?? [row.teamId]) if (activeTeams.has(teamId)) {
        if (!teamWork.has(teamId)) teamWork.set(teamId, []);
        teamWork.get(teamId).push(workId);
      }
    }
    const badge = workIds => ({ kind, label, sourceLabel: record.label,
      source: { kind: sourceKind, id: record.conceptId ?? record.id }, workIds, observedPlanRevision: null });
    for (const [personId, workIds] of personWork) people.get(personId).badges.push(badge(workIds));
    for (const [teamId, workIds] of teamWork) teams.get(teamId).badges.push(badge(workIds));
  }
  for (const concept of concepts) plannedBadges(concept, 'quality-work', 'concept',
    concept.conceptId === 'independent-review' ? 'Review planned' : 'Quality work planned');
  for (const rehearsal of rehearsals) {
    plannedBadges(rehearsal, 'rehearsal-work', 'rehearsal', 'Rehearsal planned');
    if (rehearsal.observation === null) continue;
    const badge = workIds => ({ kind: 'observation', label: 'Observation recorded', sourceLabel: rehearsal.label,
      source: { kind: 'rehearsal', id: rehearsal.id }, workIds, observedPlanRevision: rehearsal.observedPlanRevision });
    people.get(rehearsal.reviewerPersonId).badges.push(badge([...rehearsal.workIds]));
    const teamWork = new Map();
    for (const workId of rehearsal.workIds) {
      for (const teamId of workById.get(workId).teamIds ?? [workById.get(workId).teamId]) {
        if (teamId === null) continue;
        if (!teamWork.has(teamId)) teamWork.set(teamId, []);
        teamWork.get(teamId).push(workId);
      }
    }
    for (const [teamId, workIds] of teamWork) teams.get(teamId).badges.push(badge(workIds));
  }
  return { revision: state.revision,
    investment: { knownCents: result.knownCommitmentCents, totalCents: result.plannedCommitmentCents,
      lineRoundingAdjustments: { ...result.lineRoundingAdjustments } },
    concepts, work,
    recovery: { estimate: structuredClone(assurance.recovery.estimate), events: settings.recoveryEvents.map(row => ({
      ...structuredClone(row), aggregatePersonMinutes: row.eventCount * row.aggregateMinutesPerEvent,
    })) },
    rehearsals,
    badges: { people: [...people.values()].filter(row => row.badges.length), teams: [...teams.values()].filter(row => row.badges.length) } };
}

// Supply the accepted projection and, optionally, a successful Assurance preview.
// Invalid or composing raw entries remain with their editor and are not projected.
export function projectAssuranceConsequences(acceptedProjection, preview = null) {
  return freeze({ accepted: snapshot(acceptedProjection), proposed: preview === null ? null : snapshot(preview.projection),
    change: preview === null ? null : structuredClone({ money: preview.summary.money,
      newWorkIds: preview.summary.newWorkIds, reusedWorkIds: preview.summary.reusedWorkIds,
      updatedWorkIds: preview.summary.updatedWorkIds, updatedConnectionIds: preview.summary.updatedConnectionIds }) });
}

// Read exact distinct work references from a consequence reading. The ledger
// attribution can span funding pools; the proposal's money delta owns investment.
export function summarizeAssuranceWork(reading, workIds) {
  const byId = new Map(reading.work.map(row => [row.workId, row]));
  const ids = [...new Set(workIds)], rows = ids.map(id => byId.get(id));
  const lines = rows.flatMap(row => row.ledgerLines), placed = rows.filter(row => row.timing.placement === 'placed');
  const unplacedWorkIds = rows.filter(row => row.timing.placement === 'unspecified').map(row => row.workId);
  const placement = unplacedWorkIds.length ? placed.length ? 'partial' : 'unspecified' : placed.length ? 'placed' : 'empty';
  const startMinute = placement === 'placed' ? Math.min(...placed.map(row => row.timing.startMinute)) : null;
  const endMinute = placement === 'placed' ? Math.max(...placed.map(row => row.timing.endMinute)) : null;
  const poolLines = type => rows.flatMap(row => row.ledgerLines.flatMap(line => Object.hasOwn(line, `${type}Minutes`)
    ? line[`${type}Minutes`] > 0 ? [{ cents: line[`${type}Cents`] }] : []
    : row.funding === type ? [line] : []));
  return freeze({ workIds: ids, rows, personMinutes: rows.reduce((minutes, row) => minutes + row.personMinutes, 0),
    ...lineAmounts(lines),
    allocated: lineAmounts(poolLines('allocated')),
    additional: lineAmounts(poolLines('additional')),
    timing: { placement, startMinute, endMinute, elapsedMinutes: endMinute === null ? null : endMinute - startMinute, unplacedWorkIds } });
}
