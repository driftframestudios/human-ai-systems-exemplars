const families = Object.freeze({ dependencies: ['dependency', 'Dependency'], stages: ['stage', 'Stage'],
  waits: ['wait', 'Wait'], gates: ['gate', 'Decision gate'], proposals: ['proposal', 'Proposed session'] });
const roles = Object.freeze({ fromWorkId: 'earlier session', toWorkId: 'later session', connectionId: 'connection',
  workIds: 'supporting sessions', receiverPersonId: 'receiver', reviewerPersonId: 'reviewer', personIds: 'participants', teamId: 'hosting team' });

// Removal receivers share one truthful label and one route identity. Field
// families distinguish equal record IDs in separate score collections.
export function describeScoreReference(settings, reference) {
  if (reference?.collection !== 'scoreSettings' || typeof reference.field !== 'string') return null;
  const match = /^(dependencies|stages|waits|gates|proposals)\[\d+\]\.(.+)$/.exec(reference.field);
  if (!match) return null;
  const [kind, category] = families[match[1]], row = settings[match[1]].find(row => row.id === reference.id);
  if (!row) return null;
  const field = match[2], name = kind === 'dependency' ? `${row.fromWorkId} → ${row.toWorkId}` : kind === 'proposal' ? row.work.label : row.label;
  return Object.freeze({ kind, id: row.id, field, key: `${kind}/${row.id}/${field}`,
    label: `${category}: ${name} · ${roles[field.split('.').at(-1)] ?? 'planned relationship'}` });
}

// Investment uses the same named records as the Score inspector, including
// authored timing that changes the arrangement while its amount stays equal.
export function describeScoreChanges(before, after) {
  const prior = before.scoreSettings, next = after.scoreSettings, descriptions = [];
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const people = new Map([...before.people, ...after.people].map(row => [row.id, row.label]));
  const teams = new Map([...before.teams, ...after.teams].map(row => [row.id, row.label]));
  const works = new Map([...before.work, ...after.work].map(row => [row.id, row.label]));
  const stages = new Map([...prior.stages, ...next.stages].map(row => [row.id, row.label]));
  const gates = new Map([...prior.gates, ...next.gates].map(row => [row.id, row.label]));
  const connections = new Map([...before.connections, ...after.connections].map(row => [row.id, row.sharedObject || 'Shared work to describe']));
  const span = row => `minutes ${row.startMinute}–${row.endMinute}`;
  const timing = row => row === null ? 'Timing to choose' : `starts at minute ${row.startMinute}${row.repeatEveryMinutes === null ? '' : `; repeats every ${row.repeatEveryMinutes} minutes`}`;
  const availability = rows => rows === null ? 'Availability to choose' : rows.length ? rows.map(span).join(', ') : 'No available intervals';
  const oldWork = new Map(before.work.map(row => [row.id, row]));
  const oldPeople = new Map(before.people.map(row => [row.id, row]));
  for (const row of after.work) {
    const old = oldWork.get(row.id);
    if (old && !same(old.timing, row.timing)) descriptions.push(`Session timing — ${row.label}: ${timing(old.timing)} → ${timing(row.timing)}.`);
    else if (!old && row.timing !== null) descriptions.push(`Session timing — ${row.label}: ${timing(row.timing)}.`);
  }
  for (const row of after.people) {
    const old = oldPeople.get(row.id);
    if (old && !same(old.availability, row.availability)) descriptions.push(`Availability — ${row.label}: ${availability(old.availability)} → ${availability(row.availability)}.`);
    else if (!old && row.availability !== null) descriptions.push(`Availability — ${row.label}: ${availability(row.availability)}.`);
  }
  const window = row => row === null ? 'Window to choose' : `${row.label}; ${span(row)}`;
  if (!same(prior.window, next.window)) descriptions.push(`Score window: ${window(prior.window)} → ${window(next.window)}.`);
  const describe = {
    dependencies: row => `${works.get(row.fromWorkId)} → ${works.get(row.toWorkId)}; ${row.lagMinutes} minutes between sessions${row.connectionId ? `; connection: ${connections.get(row.connectionId)}` : ''}`,
    stages: row => `${row.label}; ${row.workIds.map(id => works.get(id)).join(', ') || 'Supporting sessions to choose'}`,
    waits: row => `${row.label}; ${span(row)}; ${row.reason || 'Reason to describe'}; receiver ${people.get(row.receiverPersonId) || 'to choose'}`,
    gates: row => `${row.label}; after ${stages.get(row.afterStageId)}; modeled decision: ${row.modeledDecision}; reviewer ${people.get(row.reviewerPersonId) || 'to choose'}; question: ${row.question || 'to describe'}; evidence: ${row.evidence || 'to describe'}`,
    proposals: row => `${row.work.label}; ${row.bank === 'next' ? 'Next' : 'Options'}; ${row.work.minutesPerOccurrence} minutes × ${row.work.occurrences} sessions; ${row.work.personIds.map(id => people.get(id)).join(', ')}; ${row.work.teamId ? `hosted by ${teams.get(row.work.teamId)}; ` : ''}${row.work.funding} funding; ${row.work.status}; ${row.work.lifecycle}; ${timing(row.work.timing)}${row.gateId ? `; gate: ${gates.get(row.gateId)}` : ''}`,
  };
  for (const [field, [, label]] of Object.entries(families)) {
    const old = new Map(prior[field].map(row => [row.id, row])), retained = new Set(next[field].map(row => row.id));
    for (const row of next[field]) if (!same(old.get(row.id), row)) descriptions.push(`${label} ${old.has(row.id) ? 'changed' : 'added'}: ${describe[field](row)}.`);
    for (const row of prior[field]) if (!retained.has(row.id)) {
      const funded = field === 'proposals' && !oldWork.has(row.work.id) && works.has(row.work.id);
      descriptions.push(funded ? `Added to planned work: ${row.work.label}.` : `${label} removed: ${describe[field](row)}.`);
    }
    if (prior[field].length === next[field].length && prior[field].every(row => retained.has(row.id))
      && !same(prior[field].map(row => row.id), next[field].map(row => row.id))) descriptions.push(`${label} order changed: ${next[field].map(row => field === 'dependencies' ? describe[field](row) : field === 'proposals' ? row.work.label : row.label).join(' → ')}.`);
  }
  return descriptions;
}
