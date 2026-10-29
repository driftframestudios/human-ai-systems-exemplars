// Synthetic research populations. The caller supplies the pinned source factory;
// these builders describe workload shape and independent arithmetic expectations.
export const FIXTURE_NAMES = Object.freeze(['example', 'medium', 'caps', 'near-byte']);
const MINUTE_SAMPLES = Object.freeze([0, 30, 31, 32, 45, 59, 60, 90]);
const NEAR_BYTE_TARGET = 523000;
const encoder = new TextEncoder();

function identifier(kind, index, long) {
  const value = `${kind}-${String(index).padStart(3, '0')}`;
  return long ? value.padEnd(64, 'x') : value;
}

function labelRows(plan) { return [...plan.people, ...plan.teams, ...plan.work]; }
function bytes(plan) { return encoder.encode(JSON.stringify(plan)).byteLength; }

function expandLabels(plan) {
  // Long identifiers stress repeated reference bytes. Labels add UTF-8 pressure
  // within their 120-code-unit bound; each replacement adds exactly two bytes.
  const rows = labelRows(plan);
  for (const row of rows) row.label = 'x'.repeat(120);
  let remaining = NEAR_BYTE_TARGET - bytes(plan);
  if (remaining < 0) throw new RangeError('The near-byte baseline exceeds its target.');
  for (const row of rows) {
    const count = Math.min(120, Math.floor(remaining / 2));
    row.label = '界'.repeat(count) + 'x'.repeat(120 - count);
    remaining -= count * 2;
  }
  if (remaining > 1) throw new RangeError('The label population cannot reach its byte target.');
}

function population(plan) {
  const teamReferences = plan.teams.reduce((sum, row) => sum + row.personIds.length, 0);
  const participantReferences = plan.work.reduce((sum, row) => sum + row.personIds.length, 0);
  const practiceReferences = plan.practices.reduce((sum, row) => sum + row.workIds.length, 0);
  return Object.freeze({
    people: plan.people.length, teams: plan.teams.length, work: plan.work.length,
    practices: plan.practices.length, teamReferences, participantReferences,
    practiceReferences, references: teamReferences + participantReferences + practiceReferences,
    serializedBytes: bytes(plan),
  });
}

function expectations(participantReferences, targetParticipants) {
  // Every work row has six sessions at $100/hour. At 30 minutes, each participant
  // reference contributes 180 minutes and 30,000 cents. Only one row changes.
  return Object.freeze(Object.fromEntries(MINUTE_SAMPLES.map(minutes => [minutes, Object.freeze({
    cents: participantReferences * 30000 + (minutes - 30) * targetParticipants * 1000,
    participantMinutes: participantReferences * 180 + (minutes - 30) * targetParticipants * 6,
  })])));
}

export function createFixture(name, createExamplePlan) {
  if (!FIXTURE_NAMES.includes(name)) throw new TypeError('Choose a declared research fixture.');
  if (typeof createExamplePlan !== 'function') throw new TypeError('Supply the pinned example factory.');
  const plan = createExamplePlan();
  if (name === 'example') {
    return { id: name, plan, workId: 'review', expectedByMinutes: expectations(4, 4), facts: population(plan) };
  }
  const capped = name !== 'medium';
  const long = name === 'near-byte';
  const peopleCount = capped ? 128 : 32;
  const teamCount = capped ? 32 : 8;
  const workCount = capped ? 256 : 64;
  const practiceCount = capped ? 128 : 64;
  const members = capped ? 16 : 4;
  const participants = capped ? 12 : 4;
  const workPerTeam = 8;
  const workPerPractice = capped ? 4 : 2;
  plan.planId = `study-${name}`;
  plan.people = Array.from({ length: peopleCount }, (_, index) => ({
    id: identifier('person', index, long), label: `Person ${index + 1}`,
    fundedMinutes: 0, rateCentsPerHour: 10000,
  }));
  plan.teams = Array.from({ length: teamCount }, (_, index) => ({
    id: identifier('team', index, long), label: `Team ${index + 1}`,
    personIds: Array.from({ length: members }, (_, member) => plan.people[(index * 4 + member) % peopleCount].id),
  }));
  plan.work = Array.from({ length: workCount }, (_, index) => {
    const team = plan.teams[Math.floor(index / workPerTeam)];
    const offset = capped ? index % 5 : 0;
    return {
      id: identifier('work', index, long), label: `Working session ${index + 1}`,
      teamId: team.id, personIds: team.personIds.slice(offset, offset + participants),
      minutesPerOccurrence: 30, occurrences: 6, funding: 'additional', status: 'planned', timing: null,
    };
  });
  plan.practices = Array.from({ length: practiceCount }, (_, index) => {
    const teamIndex = index % teamCount;
    const offset = Math.floor(index / teamCount) % (workPerTeam - workPerPractice + 1);
    return {
      id: identifier('practice', index, long), practiceId: 'expectation', teamId: plan.teams[teamIndex].id,
      workIds: plan.work.slice(teamIndex * workPerTeam + offset, teamIndex * workPerTeam + offset + workPerPractice).map(row => row.id),
    };
  });
  if (long) expandLabels(plan);
  const participantReferences = capped ? 3072 : 256;
  return { id: name, plan, workId: plan.work[0].id,
    expectedByMinutes: expectations(participantReferences, participants), facts: population(plan) };
}

export function createRoundingFixture(createExamplePlan) {
  if (typeof createExamplePlan !== 'function') throw new TypeError('Supply the pinned example factory.');
  const plan = createExamplePlan();
  plan.planId = 'funding-pool-rounding';
  plan.people = [{ id: 'person', label: 'Person', fundedMinutes: 60, rateCentsPerHour: 1 }];
  plan.teams = [{ id: 'team', label: 'Team', personIds: ['person'] }];
  plan.work = [
    ['allocated', 58, 'allocated'], ['additional-one', 29, 'additional'], ['additional-two', 29, 'additional'],
  ].map(([id, minutesPerOccurrence, funding]) => ({
    id, label: id, teamId: 'team', personIds: ['person'], minutesPerOccurrence,
    occurrences: 1, funding, status: 'planned', timing: null,
  }));
  plan.practices = [];
  return { id: 'rounding', plan, workId: 'additional-one', expected: Object.freeze({
    initialCents: 2, edited30Cents: 2, allocatedCents: 1,
    initialAdditionalAdjustment: 1, editedAdditionalAdjustment: 0,
  }) };
}
