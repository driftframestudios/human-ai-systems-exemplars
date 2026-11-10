// A tape owns defaults; an authored session keeps its own complete settings.
// These helpers consume admitted records and return detached values. Indexes
// follow the existing cadence identity and are remapped atomically on removal.
export const WORK_SESSION_FIELDS = Object.freeze([
  'label', 'teamId', 'personIds', 'minutesPerOccurrence', 'funding', 'status',
]);

export function copyWorkSession(source) {
  return Object.fromEntries(WORK_SESSION_FIELDS.map(field => [field,
    field === 'personIds' ? [...source.personIds] : source[field]]));
}

function sameSession(left, right) {
  return WORK_SESSION_FIELDS.every(field => field === 'personIds'
    ? left.personIds.length === right.personIds.length && left.personIds.every((id, index) => id === right.personIds[index])
    : left[field] === right[field]);
}

export function resolveWorkSession(work, occurrenceIndex) {
  if (!Number.isSafeInteger(occurrenceIndex) || occurrenceIndex < 0 || occurrenceIndex >= work.occurrences) return null;
  const source = work.sessionOverrides?.find(row => row.occurrenceIndex === occurrenceIndex) ?? work;
  return sessionReading(work, source, occurrenceIndex);
}

function sessionReading(work, source, occurrenceIndex) {
  return { ...copyWorkSession(source), occurrenceIndex, workId: work.id, lifecycle: work.lifecycle,
    active: source.status === 'planned' && work.lifecycle !== 'retired' };
}

// Invocation-local lookup for repeated reads of one admitted work record.
// Each read owns its fields; the private index never becomes mutable plan state.
export function createWorkSessionResolver(work) {
  const overrides = new Map((work.sessionOverrides ?? []).map(row => [row.occurrenceIndex, row]));
  return occurrenceIndex => Number.isSafeInteger(occurrenceIndex) && occurrenceIndex >= 0 && occurrenceIndex < work.occurrences
    ? sessionReading(work, overrides.get(occurrenceIndex) ?? work, occurrenceIndex) : null;
}

export function expandWorkSessions(work) {
  const resolve = createWorkSessionResolver(work);
  return Array.from({ length: work.occurrences }, (_, occurrenceIndex) => resolve(occurrenceIndex));
}

// Repeated defaults form one group, so an untimed plan does not need an expanded
// array to price its sessions or compute its participant totals.
export function workSessionGroups(work) {
  const overrides = work.sessionOverrides ?? [];
  const count = work.occurrences - overrides.length;
  return [...(count > 0 ? [{ ...copyWorkSession(work), count }] : []),
    ...overrides.map(row => ({ ...copyWorkSession(row), count: 1 }))];
}

export function summarizeWorkSessions(work) {
  const people = new Map(), funding = new Set(), statuses = new Set(), teams = new Set();
  if (work.occurrences === 0) for (const personId of work.personIds) people.set(personId,
    { personId, minutes: 0, allocatedMinutes: 0, additionalMinutes: 0, activeMinutes: 0 });
  let durationMinutes = 0, participantMinutes = 0, activeParticipantMinutes = 0, plannedSessionCount = 0;
  for (const session of workSessionGroups(work)) {
    const minutes = session.minutesPerOccurrence * session.count;
    const active = session.status === 'planned' && work.lifecycle !== 'retired';
    durationMinutes += minutes; participantMinutes += minutes * session.personIds.length;
    if (active) { activeParticipantMinutes += minutes * session.personIds.length; plannedSessionCount += session.count; }
    funding.add(session.funding); statuses.add(session.status); teams.add(session.teamId);
    for (const personId of session.personIds) {
      if (!people.has(personId)) people.set(personId, { personId, minutes: 0, allocatedMinutes: 0, additionalMinutes: 0, activeMinutes: 0 });
      const row = people.get(personId);
      row.minutes += minutes; row[`${session.funding}Minutes`] += minutes;
      if (active) row.activeMinutes += minutes;
    }
  }
  return { workId: work.id, occurrenceCount: work.occurrences, durationMinutes, participantMinutes,
    activeParticipantMinutes, plannedSessionCount, active: plannedSessionCount > 0,
    funding: funding.size > 1 ? 'mixed' : funding.values().next().value ?? work.funding,
    status: statuses.size > 1 ? 'mixed' : statuses.values().next().value ?? work.status,
    personIds: [...people.keys()], teamIds: [...teams], people: [...people.values()] };
}

function withOverrides(work, rows) {
  const { sessionOverrides: omitted, ...base } = work;
  const sessionOverrides = rows.filter(row => !sameSession(row, work))
    .map(row => ({ occurrenceIndex: row.occurrenceIndex, ...copyWorkSession(row) }))
    .sort((left, right) => left.occurrenceIndex - right.occurrenceIndex);
  return sessionOverrides.length ? { ...base, sessionOverrides } : base;
}

export function replaceWorkSession(work, occurrenceIndex, session) {
  return withOverrides(work, [...(work.sessionOverrides ?? []).filter(row => row.occurrenceIndex !== occurrenceIndex),
    { occurrenceIndex, ...copyWorkSession(session) }]);
}

export function removeWorkSession(work, occurrenceIndex) {
  return withOverrides({ ...work, occurrences: work.occurrences - 1 }, (work.sessionOverrides ?? [])
    .filter(row => row.occurrenceIndex !== occurrenceIndex)
    .map(row => ({ ...row, occurrenceIndex: row.occurrenceIndex > occurrenceIndex ? row.occurrenceIndex - 1 : row.occurrenceIndex })));
}

export function setWholeWorkField(work, field, value) {
  const next = { ...work, [field]: field === 'personIds' ? [...value] : value };
  return withOverrides(next, (work.sessionOverrides ?? []).map(row => ({ ...row, [field]: value })));
}

// A shared order changes each session's existing participant sequence while
// leaving the membership and every other session setting with that session.
export function reorderWorkParticipants(work, personIds) {
  const positions = new Map(personIds.map((id, index) => [id, index]));
  const ordered = ids => [...ids].sort((left, right) => positions.get(left) - positions.get(right));
  return withOverrides({ ...work, personIds: ordered(work.personIds) }, (work.sessionOverrides ?? [])
    .map(session => ({ ...session, personIds: ordered(session.personIds) })));
}

export function setWorkParticipant(work, personId, included) {
  const membership = ids => included ? ids.includes(personId) ? ids : [...ids, personId] : ids.filter(id => id !== personId);
  return withOverrides({ ...work, personIds: membership(work.personIds) },
    (work.sessionOverrides ?? []).map(row => ({ ...row, personIds: membership(row.personIds) })));
}

export function resizeWorkSessions(work) {
  return withOverrides(work, (work.sessionOverrides ?? []).filter(row => row.occurrenceIndex < work.occurrences));
}
