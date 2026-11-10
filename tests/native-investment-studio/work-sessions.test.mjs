import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan, prepareImport, preparePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createCadence } from '../../collaboration/native-investment-studio/cadence.mjs';
import { copyWorkSession, createWorkSessionResolver, expandWorkSessions, resolveWorkSession, summarizeWorkSessions } from '../../collaboration/native-investment-studio/work-sessions.mjs';

function fixture() {
  const plan = createExamplePlan();
  Object.assign(plan.work[0], { occurrences: 3, personIds: ['product-one', 'engineering-one'],
    timing: { startMinute: 0, repeatEveryMinutes: 60 } });
  plan.teams.push({ id: 'reviewers', label: 'Reviewers', personIds: ['product-two'], lifecycle: 'active' });
  plan.scoreSettings.cadence = createCadence('sprint', 2);
  plan.scoreSettings.cadence.placements = [
    { workId: 'review', occurrenceIndex: 0, periodId: 'period-1', subdivision: 1 },
    { workId: 'review', occurrenceIndex: 1, periodId: 'period-1', subdivision: 2 },
    { workId: 'review', occurrenceIndex: 2, periodId: 'period-2', subdivision: 1 },
  ];
  return plan;
}
function apply(studio, command) {
  const result = studio.applyCommand(command, studio.read());
  assert.equal(result.ok, true, result.error?.message); return result.projection;
}
function update(studio, index, fields = {}, placement) {
  return apply(studio, { type: 'work.session.update', workId: 'review', occurrenceIndex: index,
    session: { ...copyWorkSession(resolveWorkSession(studio.read().state.work[0], index)), ...fields },
    ...(placement === undefined ? {} : { placement }) });
}

test('repeated session reads index overrides once and return detached settings for each valid ordinal', () => {
  const work = fixture().work[0];
  let visits = 0;
  work.sessionOverrides = [{ ...copyWorkSession(work), get occurrenceIndex() { visits++; return 1; },
    label: 'Private review', personIds: ['product-two'], funding: 'allocated', status: 'paused' }];
  const resolve = createWorkSessionResolver(work);
  const reading = resolve(1);
  assert.deepEqual(reading, { label: 'Private review', teamId: 'delivery', personIds: ['product-two'],
    minutesPerOccurrence: 30, funding: 'allocated', status: 'paused', occurrenceIndex: 1,
    workId: 'review', lifecycle: 'active', active: false });
  reading.personIds.push('engineering-one'); reading.label = 'Changed reading';
  assert.equal(resolve(1).label, 'Private review');
  assert.deepEqual(resolve(1).personIds, ['product-two']);
  assert.deepEqual(resolve(2).personIds, ['product-one', 'engineering-one']);
  for (const invalid of [-1, 3, 1.5, '1']) assert.equal(resolve(invalid), null);
  assert.equal(visits, 1, 'repeated reads reuse this invocation’s override lookup');
});

test('a session edit changes its settings and placement while sibling sessions and tape defaults remain exact', () => {
  const studio = createStudio(fixture()), before = studio.read(), initial = expandWorkSessions(before.state.work[0]);
  const next = update(studio, 1, { label: 'Focused review', teamId: 'reviewers', personIds: ['product-two'],
    minutesPerOccurrence: 90, funding: 'allocated', status: 'paused' }, { periodId: 'period-2', subdivision: 2 });
  const sessions = expandWorkSessions(next.state.work[0]);
  assert.deepEqual([sessions[0], sessions[2]], [initial[0], initial[2]]);
  const { sessionOverrides, ...defaults } = next.state.work[0];
  assert.deepEqual(defaults, before.state.work[0]);
  assert.equal(sessionOverrides.length, 1);
  assert.deepEqual(sessions[1], { label: 'Focused review', teamId: 'reviewers', personIds: ['product-two'],
    minutesPerOccurrence: 90, funding: 'allocated', status: 'paused', occurrenceIndex: 1,
    workId: 'review', lifecycle: 'active', active: false });
  assert.deepEqual(next.score.cadence.occurrences.map(row => [row.occurrenceIndex, row.periodId, row.subdivision]),
    [[0, 'period-1', 1], [1, 'period-2', 2], [2, 'period-2', 1]]);
  assert.equal(next.score.occurrences[1].label, 'Focused review');
  assert.equal(next.score.occurrences[1].endMinute, 150);
  assert.equal(next.score.capacity.find(row => row.personId === 'product-two').scheduledEffortMinutes, 0);
  assert.equal(next.result.ledger.length, 1);
  assert.deepEqual(next.result.ledger[0].lines.map(row => [row.personId, row.minutes, row.allocatedMinutes, row.additionalMinutes]),
    [['product-one', 60, 0, 60], ['engineering-one', 60, 0, 60], ['product-two', 90, 90, 0]]);
  assert.equal(next.result.knownCommitmentCents, 20000);
  assert.equal(next.result.allocatedKnownCents, 15000);
  assert.equal(summarizeWorkSessions(next.state.work[0]).participantMinutes, 210);
  assert.equal(prepareImport(next.serialized).projection.serialized, next.serialized);
  assert.equal(studio.undo(next).ok, true); assert.equal(studio.exportText(), before.serialized);
});

test('removing a session remaps only its following siblings and placements, and Undo restores their identities', () => {
  const studio = createStudio(fixture());
  update(studio, 1, { label: 'Middle session', status: 'paused' });
  update(studio, 2, { label: 'Last session', minutesPerOccurrence: 75 });
  const before = studio.read();
  const next = apply(studio, { type: 'work.session.remove', workId: 'review', occurrenceIndex: 0 });
  assert.deepEqual(expandWorkSessions(next.state.work[0]).map(row => [row.occurrenceIndex, row.label, row.minutesPerOccurrence, row.status]),
    [[0, 'Middle session', 30, 'paused'], [1, 'Last session', 75, 'planned']]);
  assert.deepEqual(next.state.scoreSettings.cadence.placements.map(row => [row.occurrenceIndex, row.periodId, row.subdivision]),
    [[0, 'period-1', 2], [1, 'period-2', 1]]);
  assert.deepEqual(next.state.practices, before.state.practices);
  assert.equal(studio.undo(next).ok, true); assert.equal(studio.exportText(), before.serialized);
  for (let index = 2; index >= 0; index--) apply(studio, { type: 'work.session.remove', workId: 'review', occurrenceIndex: index });
  assert.equal(studio.read().state.work[0].occurrences, 0);
  assert.equal(studio.read().state.work[0].sessionOverrides, undefined);
  assert.deepEqual(studio.read().state.scoreSettings.cadence.placements, []);
  assert.deepEqual(studio.read().state.practices, before.state.practices);
});

test('tape defaults and appended sessions preserve overrides; explicit whole-tape controls update their named field only', () => {
  const studio = createStudio(fixture());
  update(studio, 1, { minutesPerOccurrence: 75, status: 'paused', personIds: ['product-two'], funding: 'allocated' });
  const authored = structuredClone(studio.read().state.work[0].sessionOverrides);
  const { sessionOverrides, ...work } = studio.read().state.work[0];
  apply(studio, { type: 'work.update', work: { ...work, occurrences: 4, label: 'New tape label' } });
  assert.deepEqual(studio.read().state.work[0].sessionOverrides, authored);
  assert.equal(resolveWorkSession(studio.read().state.work[0], 3).minutesPerOccurrence, 30);
  const current = studio.read().state.work[0], { sessionOverrides: omitted, ...replacement } = current;
  assert.equal(studio.updateWork('review', { ...replacement, label: 'Renamed again' }, studio.read()).ok, true);
  assert.deepEqual(studio.read().state.work[0].sessionOverrides, authored);
  apply(studio, { type: 'work.status.set', workId: 'review', status: 'planned' });
  apply(studio, { type: 'work.funding.set', workId: 'review', funding: 'additional' });
  apply(studio, { type: 'work.participants.replace', workId: 'review', personIds: ['product-one'] });
  const sessions = expandWorkSessions(studio.read().state.work[0]);
  assert.ok(sessions.every(row => row.status === 'planned' && row.funding === 'additional' && row.personIds.join() === 'product-one'));
  assert.equal(sessions[1].minutesPerOccurrence, 75);
  assert.equal(sessions[1].label, authored[0].label);
});

test('one-person participation controls preserve the other participants in customized sessions', () => {
  const studio = createStudio(fixture());
  update(studio, 1, { personIds: ['product-two'], minutesPerOccurrence: 75 });
  apply(studio, { type: 'work.participant.set', workId: 'review', personId: 'engineering-two', included: true });
  assert.deepEqual(expandWorkSessions(studio.read().state.work[0]).map(row => row.personIds),
    [['product-one', 'engineering-one', 'engineering-two'], ['product-two', 'engineering-two'], ['product-one', 'engineering-one', 'engineering-two']]);
  apply(studio, { type: 'person.participation.replace', personId: 'engineering-two', workIds: [] });
  assert.deepEqual(resolveWorkSession(studio.read().state.work[0], 1).personIds, ['product-two']);
  const before = studio.read();
  const held = studio.applyCommand({ type: 'work.participant.set', workId: 'review', personId: 'product-two', included: false }, before);
  assert.equal(held.ok, false); assert.equal(held.error.code, 'minimum-participants'); assert.strictEqual(studio.read(), before);
});

test('session commands preserve no-op history and reject stale, missing or invalid targets before publication', () => {
  const studio = createStudio(fixture()), before = studio.read();
  const supplied = copyWorkSession(before.state.work[0]);
  const command = { type: 'work.session.update', workId: 'review', occurrenceIndex: 1, session: supplied,
    placement: { periodId: 'period-1', subdivision: 2 } };
  assert.strictEqual(apply(studio, command), before);
  update(studio, 1, { label: 'Only this session' });
  const changed = studio.read();
  assert.equal(studio.applyCommand(command, before).ok, false); assert.strictEqual(studio.read(), changed);
  for (const altered of [{ occurrenceIndex: 3 }, { session: { ...supplied, teamId: 'missing' } },
    { session: { ...supplied, personIds: ['missing'] } }, { placement: { periodId: 'missing', subdivision: 1 } }]) {
    assert.equal(studio.applyCommand({ ...command, ...altered }, changed).ok, false);
    assert.strictEqual(studio.read(), changed);
  }
  assert.equal(studio.undo(changed).ok, true);
  const history = studio.readHistory(); assert.strictEqual(apply(studio, command), studio.read());
  assert.deepEqual(studio.readHistory(), history);
});

test('versioned admission preserves older tapes and bounds authored session data and references', () => {
  const older = fixture(); older.schemaVersion = '0.10.0';
  const migrated = prepareImport(JSON.stringify(older));
  assert.equal(migrated.sourceSchemaVersion, '0.10.0'); assert.equal(migrated.projection.state.schemaVersion, '0.11.0');
  assert.deepEqual(migrated.projection.state.work, older.work);
  const authored = fixture();
  authored.work[0].sessionOverrides = [{ occurrenceIndex: 1, ...copyWorkSession(authored.work[0]), personIds: ['product-two'] }];
  const accepted = preparePlan(authored), studio = createStudio(authored);
  const removal = studio.applyCommand({ type: 'person.remove', personId: 'product-two' }, studio.read());
  assert.equal(removal.ok, false);
  assert.ok(removal.error.references.some(row => row.collection === 'work' && row.field.includes('sessionOverrides')));
  assert.equal(prepareImport(accepted.serialized).projection.serialized, accepted.serialized);
  authored.schemaVersion = '0.10.0'; assert.throws(() => preparePlan(authored), { code: 'fields' });
  authored.schemaVersion = '0.11.0';
  authored.work[0].sessionOverrides.push(structuredClone(authored.work[0].sessionOverrides[0]));
  assert.throws(() => preparePlan(authored), { code: 'duplicate-reference' });
  authored.work[0].sessionOverrides.pop();
  let reads = 0;
  Object.defineProperty(authored.work[0].sessionOverrides[0], 'label', { enumerable: true, get() { reads++; return 'Read'; } });
  assert.throws(() => preparePlan(authored), { code: 'data-property' }); assert.equal(reads, 0);
});
