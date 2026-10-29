// Synthetic relationship populations; the accepted factory supplies schema fields.
export const FIXTURE_NAMES = Object.freeze(['small', 'representative', 'caps', 'byte-pressure']);
export const SHAPES = Object.freeze({
  small: Object.freeze([4, 2, 4, 2, 2, 4]),
  representative: Object.freeze([32, 8, 64, 32, 32, 64]),
  caps: Object.freeze([128, 32, 256, 128, 128, 256]),
});
const encoder = new TextEncoder();
const id = (kind, index, pressure) => `${kind}-${String(index).padStart(3, '0')}`.padEnd(pressure ? 64 : 0, 'x');
export function population(plan) {
  const sum = (rows, read) => rows.reduce((total, row) => total + read(row), 0);
  const references = sum(plan.teams, row => row.personIds.length)
    + sum(plan.work, row => 1 + row.personIds.length)
    + sum(plan.practices, row => 1 + row.workIds.length)
    + sum(plan.contributions, row => Number(row.receiverPersonId !== null) + Number(row.decisionOwnerPersonId !== null) + row.workIds.length)
    + sum(plan.connections, row => 2 + Number(row.receiverPersonId !== null) + row.workIds.length);
  return Object.freeze({ people: plan.people.length, teams: plan.teams.length, work: plan.work.length,
    practices: plan.practices.length, contributions: plan.contributions.length, connections: plan.connections.length,
    references, inputUtf8Bytes: encoder.encode(JSON.stringify(plan)).byteLength });
}
export function createFixture(name, createExamplePlan) {
  if (!FIXTURE_NAMES.includes(name)) throw new TypeError('Choose a declared relationship population.');
  const pressure = name === 'byte-pressure', shape = SHAPES[pressure ? 'caps' : name];
  const [people, teams, work, practices, contributions, connections] = shape;
  const plan = createExamplePlan(), person = plan.people[0], session = plan.work[0];
  if (plan.schemaVersion !== '0.3.0') throw new TypeError('Supply the pinned schema 0.3.0 factory.');
  plan.planId = `relationship-${name}`; plan.revision = 0;
  const label = (kind, index) => pressure ? '界'.repeat(120) : `${kind} ${index + 1}`;
  plan.people = Array.from({ length: people }, (_, index) => ({ ...person,
    id: id('person', index, pressure), label: label('Person', index), role: { ...person.role,
      functionId: index % 2 ? 'engineering' : 'product-program', seniorityId: 'senior', decisionId: index % 3 ? 'advises' : 'approves' },
    fundedMinutes: 9600, rateCentsPerHour: 10000 }));
  plan.teams = Array.from({ length: teams }, (_, index) => ({
    id: id('team', index, pressure), label: label('Team', index), personIds: plan.people.map(row => row.id), lifecycle: 'active' }));
  plan.work = Array.from({ length: work }, (_, index) => ({ ...session,
    id: id('work', index, pressure), label: label('Session', index), teamId: plan.teams[index % teams].id,
    personIds: [plan.people[index % people].id], minutesPerOccurrence: 30,
    occurrences: 4, funding: index % 2 ? 'additional' : 'allocated', status: index % 3 ? 'planned' : 'paused', timing: null, lifecycle: 'active' }));
  plan.practices = Array.from({ length: practices }, (_, index) => ({ id: id('practice', index, pressure),
    practiceId: index % 2 ? 'expectation' : 'assurance', teamId: plan.teams[index % teams].id,
    workIds: [plan.work[index % work].id] }));
  const text = value => pressure ? '\u0000'.repeat(600) : value;
  plan.contributions = Array.from({ length: contributions }, (_, index) => ({ id: id('contribution', index, pressure),
    categoryId: 'dependency-mapping', receiverPersonId: plan.people[0].id, decisionOwnerPersonId: plan.people[1].id,
    workIds: plan.work.slice(0, 4).map(row => row.id), reviewBoundary: text('Review the shared work'), decisionBoundary: text('Agree the next step') }));
  plan.connections = Array.from({ length: connections }, (_, index) => ({ id: id('connection', index, pressure),
    senderTeamId: plan.teams[index % teams].id, receiverTeamId: plan.teams[(index + 1) % teams].id,
    receiverPersonId: plan.people[(index + 1) % people].id, sharedObject: text(`Shared decision ${index + 1}`),
    responseExpectation: text('Return the next step'), workIds: plan.work.slice(0, 7).map(row => row.id), status: index % 3 ? 'active' : 'paused' }));
  if (pressure) for (const field of Object.keys(plan.purpose)) plan.purpose[field] = '\u0000'.repeat(600);
  return { id: name, plan, targetId: plan.connections[0].id, facts: population(plan),
    expected: Object.freeze({ commitmentCents: people * 1600000 + work * 10000, allocatedCents: work * 10000, recoveryCents: people * 1600000 + work * 10000 + 15000 }) };
}
// This derived population reserves precisely the rows/references the two-edge
// proposal needs. The exact cap remains a separate preparation/edit population.
export function templateFixture(fixture) {
  const plan = structuredClone(fixture.plan);
  if (plan.connections.length > 254) plan.connections.splice(254);
  if (plan.work.length > 254) plan.work.splice(254);
  const removed = fixture.plan.work.length - plan.work.length;
  return { ...fixture, id: `${fixture.id}-template`, plan, facts: population(plan), expected: Object.freeze({
    commitmentCents: fixture.expected.commitmentCents - removed * 10000,
    allocatedCents: fixture.expected.allocatedCents - removed * 10000,
    recoveryCents: fixture.expected.recoveryCents - removed * 10000 }) };
}
export function templateRequest(fixture, recovery = false) {
  const plan = fixture.plan, personId = plan.people[0].id, teamId = plan.teams[0].id;
  return { templateId: 'pod', version: '1.0.0', proposalId: 'measured-arrangement', teams: [
    { slotId: 'pod', kind: 'existing', teamId, addPersonIds: [] },
    { slotId: 'partner', kind: 'existing', teamId: plan.teams[1].id, addPersonIds: [] },
  ], connections: ['handoff', 'feedback'].map((slotId, index) => ({ slotId, receiverPersonId: personId,
    sharedObject: 'Review the shared decision', responseExpectation: null, workIds: [plan.work[0].id], status: 'active',
    recoveryWork: recovery && index === 0 ? { label: 'Explicit recovery review', teamId, personIds: [personId],
      minutesPerOccurrence: 90, occurrences: 1, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active' } : null,
  })) };
}

export function literalFixture(createExamplePlan) {
  const fixture = createFixture('small', createExamplePlan);
  fixture.id = 'literal'; fixture.plan.planId = 'literal-accounting';
  fixture.plan.people.forEach((row, index) => { row.fundedMinutes = index === 0 ? 9600 : 0; });
  fixture.plan.work.forEach((row, index) => { row.minutesPerOccurrence = index === 0 ? 240 : 0; row.occurrences = 1; row.funding = 'allocated'; });
  fixture.facts = population(fixture.plan);
  fixture.expected = Object.freeze({ commitmentCents: 1600000, allocatedCents: 40000, recoveryCents: 1615000 });
  return fixture;
}
