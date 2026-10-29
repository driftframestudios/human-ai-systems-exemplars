import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

function apply(studio, command) {
  const result = studio.applyCommand(command, studio.read());
  assert.equal(result.ok, true, result.error?.message);
  return result.projection;
}

function held(studio, command, code) {
  const before = studio.read();
  const history = studio.readHistory();
  const acceptance = studio.readAcceptance();
  const result = studio.applyCommand(command, before);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
  assert.strictEqual(result.projection, before);
  assert.strictEqual(studio.read(), before);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), history);
  assert.equal(studio.exportText(), before.serialized);
  assert.ok(Object.isFrozen(result.error));
  return result.error;
}

const person = (id = 'designer', overrides = {}) => ({ id, label: 'Designer', fundedMinutes: 0, rateCentsPerHour: 12000, ...overrides });
const work = (overrides = {}) => ({ id: 'design-review', label: 'Design review', teamId: 'design', personIds: ['designer'],
  minutesPerOccurrence: 45, occurrences: 2, funding: 'additional', status: 'planned', timing: null, ...overrides });

test('create person, team and work own their data and publish one priced change each', () => {
  const studio = createStudio();
  const original = studio.read();
  const suppliedPerson = person();
  apply(studio, { type: 'person.create', person: suppliedPerson });
  const suppliedTeam = { id: 'design', label: 'Design', personIds: ['designer'] };
  apply(studio, { type: 'team.create', team: suppliedTeam });
  const suppliedWork = work();
  const next = apply(studio, { type: 'work.create', work: suppliedWork });
  // Four original people cost $1,200; one new person works 1.5 hours at $120.
  assert.equal(next.result.knownCommitmentCents, 138000);
  assert.equal(next.state.revision, 3);
  assert.equal(next.state.schemaVersion, '0.2.0');
  assert.equal(next.state.modelVersion, '0.1.0');
  assert.deepEqual(studio.readHistory(), { undoCount: 3, redoCount: 0, limit: 20 });
  suppliedPerson.rateCentsPerHour = 1;
  suppliedTeam.personIds.length = 0;
  suppliedWork.personIds.length = 0;
  assert.equal(next.state.people.at(-1).rateCentsPerHour, 12000);
  assert.deepEqual(next.state.teams.at(-1).personIds, ['designer']);
  assert.deepEqual(next.state.work.at(-1).personIds, ['designer']);
  assert.equal(original.state.people.length, 4);
  assert.equal(original.result.knownCommitmentCents, 120000);
});

test('command preview prepares exact amounts while accepted state, chronology and history stay intact', () => {
  const studio = createStudio();
  const before = studio.read();
  const acceptance = studio.readAcceptance();
  const preview = studio.previewCommand({ type: 'work.participants.replace', workId: 'review', personIds: ['product-one'] }, before);
  assert.equal(preview.ok, true);
  assert.equal(preview.projection.result.knownCommitmentCents, 30000);
  assert.strictEqual(studio.read(), before);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.deepEqual(studio.readHistory(), { undoCount: 0, redoCount: 0, limit: 20 });
  const accepted = apply(studio, { type: 'work.participants.replace', workId: 'review', personIds: ['product-one'] });
  assert.deepEqual(accepted, preview.projection);
  assert.notStrictEqual(accepted, preview.projection);
});

test('unknown and zero rates retain distinct meanings when new people join work', () => {
  const studio = createStudio();
  apply(studio, { type: 'person.create', person: person('unknown', { rateCentsPerHour: null }) });
  apply(studio, { type: 'person.create', person: person('volunteer', { rateCentsPerHour: 0 }) });
  apply(studio, { type: 'team.create', team: { id: 'design', label: 'Design', personIds: ['unknown', 'volunteer'] } });
  let next = apply(studio, { type: 'work.create', work: work({ personIds: ['unknown', 'volunteer'] }) });
  assert.equal(next.result.knownCommitmentCents, 120000);
  assert.equal(next.result.plannedCommitmentCents, null);
  assert.deepEqual(next.result.ledger.at(-1).lines.map(line => line.cents), [null, 0]);
  next = apply(studio, { type: 'work.participants.replace', workId: 'design-review', personIds: ['volunteer'] });
  assert.equal(next.result.plannedCommitmentCents, 120000);
});

test('team updates and ordered memberships retain all participating work relationships', () => {
  const studio = createStudio();
  const ids = ['engineering-two', 'engineering-one', 'product-two', 'product-one'];
  apply(studio, { type: 'team.update', teamId: 'delivery', team: { id: 'delivery', label: 'Delivery group', personIds: ids } });
  assert.equal(studio.read().state.teams[0].label, 'Delivery group');
  assert.deepEqual(studio.read().state.teams[0].personIds, ids);
  held(studio, { type: 'team.members.replace', teamId: 'delivery', personIds: ['product-one'] }, 'team-membership');
  held(studio, { type: 'team.members.replace', teamId: 'delivery', personIds: ['missing'] }, 'reference');
  held(studio, { type: 'team.update', teamId: 'delivery', team: { id: 'other', label: 'Other', personIds: ids } }, 'target');
  apply(studio, { type: 'work.participants.replace', workId: 'review', personIds: ['product-one'] });
  apply(studio, { type: 'team.members.replace', teamId: 'delivery', personIds: ['product-one'] });
  assert.equal(studio.read().result.knownCommitmentCents, 30000);
  assert.equal(studio.read().state.people.length, 4);
});

test('work status retains modeled effort while funding changes select the accepted accounting pool', () => {
  const studio = createStudio();
  let next = apply(studio, { type: 'work.status.set', workId: 'review', status: 'paused' });
  assert.equal(next.result.knownCommitmentCents, 120000);
  assert.deepEqual(next.result.obligations, [{ code: 'paused-work', workId: 'review' }]);
  next = apply(studio, { type: 'work.funding.set', workId: 'review', funding: 'allocated' });
  assert.equal(next.result.knownCommitmentCents, 0);
  assert.equal(next.result.allocatedKnownCents, 120000);
  assert.deepEqual(next.result.capacity.map(row => row.remainingMinutes), [-180, -180, -180, -180]);
  next = apply(studio, { type: 'work.status.set', workId: 'review', status: 'planned' });
  assert.equal(next.result.obligations.length, 4);
  assert.ok(next.result.obligations.every(row => row.code === 'allocated-capacity-exceeded'));
  next = apply(studio, { type: 'work.funding.set', workId: 'review', funding: 'additional' });
  assert.equal(next.result.knownCommitmentCents, 120000);
  assert.deepEqual(next.result.obligations, []);
});

test('ordered collections retain exact membership and refresh later targeted update indexes', () => {
  const plan = createExamplePlan();
  plan.teams.push({ id: 'second', label: 'Second', personIds: ['product-one'] });
  plan.work.push(work({ id: 'second-work', teamId: 'second', personIds: ['product-one'], minutesPerOccurrence: 10, occurrences: 1 }));
  plan.practices.push({ id: 'second-practice', practiceId: 'assurance', teamId: 'second', workIds: ['review'] });
  const studio = createStudio(plan);
  for (const collection of ['people', 'teams', 'work', 'practices']) {
    const ids = studio.read().state[collection].map(row => row.id).reverse();
    apply(studio, { type: 'collection.reorder', collection, ids });
    assert.deepEqual(studio.read().state[collection].map(row => row.id), ids);
    assert.equal(studio.read().result.knownCommitmentCents, 121667);
  }
  assert.equal(studio.updateWork('review', { ...plan.work[0], minutesPerOccurrence: 60 }, studio.read()).ok, true);
  assert.equal(studio.read().state.work[1].minutesPerOccurrence, 60);
  assert.equal(studio.read().state.work[0].minutesPerOccurrence, 10);
  assert.equal(studio.updatePerson('product-one', { ...plan.people[0], label: 'Product lead' }, studio.read()).ok, true);
  assert.equal(studio.read().state.people[3].label, 'Product lead');
  assert.equal(studio.read().result.knownCommitmentCents, 241667);
});

test('valid no-ops preserve identity, Redo and acceptance even at the revision ceiling', () => {
  const plan = createExamplePlan();
  plan.revision = LIMITS.revision;
  const studio = createStudio(plan);
  assert.equal(studio.replace({ ...plan, revision: 0 }, studio.read()).ok, true);
  assert.equal(studio.undo(studio.read()).ok, true);
  const before = studio.read();
  const acceptance = studio.readAcceptance();
  const commands = [
    { type: 'team.update', teamId: 'delivery', team: structuredClone(before.state.teams[0]) },
    { type: 'team.members.replace', teamId: 'delivery', personIds: [...before.state.teams[0].personIds] },
    { type: 'work.participants.replace', workId: 'review', personIds: [...before.state.work[0].personIds] },
    { type: 'work.funding.set', workId: 'review', funding: 'additional' },
    { type: 'work.status.set', workId: 'review', status: 'planned' },
    { type: 'collection.reorder', collection: 'people', ids: before.state.people.map(row => row.id) },
  ];
  for (const command of commands) {
    assert.strictEqual(apply(studio, command), before);
    assert.strictEqual(studio.readAcceptance(), acceptance);
    assert.deepEqual(studio.readHistory(), { undoCount: 0, redoCount: 1, limit: 20 });
  }
  held(studio, { type: 'work.status.set', workId: 'review', status: 'paused' }, 'integer');
});

test('removal returns complete deterministic references while every accepted owner stays intact', () => {
  const studio = createStudio();
  assert.equal(studio.setBaseline(studio.read()).ok, true);
  const baseline = studio.readBaseline();
  const cases = [
    [{ type: 'person.remove', personId: 'product-one' }, [
      { collection: 'teams', id: 'delivery', field: 'personIds' },
      { collection: 'work', id: 'review', field: 'personIds' },
    ]],
    [{ type: 'team.remove', teamId: 'delivery' }, [
      { collection: 'work', id: 'review', field: 'teamId' },
      { collection: 'practices', id: 'shared-expectations', field: 'teamId' },
    ]],
    [{ type: 'work.remove', workId: 'review' }, [
      { collection: 'practices', id: 'shared-expectations', field: 'workIds' },
    ]],
  ];
  for (const [command, references] of cases) {
    const error = held(studio, command, 'dependencies');
    assert.deepEqual(error.references, references);
    assert.ok(Object.isFrozen(error.references));
    assert.ok(error.references.every(Object.isFrozen));
    const preview = studio.previewCommand(command, studio.read());
    assert.equal(preview.ok, false);
    assert.deepEqual(preview.error, error);
    assert.strictEqual(studio.readBaseline(), baseline);
  }
});

test('explicit whole-plan reassignment releases removal guards and supports history recovery', () => {
  const studio = createStudio();
  const original = studio.read();
  const proposal = structuredClone(original.state);
  proposal.practices = [];
  assert.equal(studio.replace(proposal, original).ok, true);
  apply(studio, { type: 'work.remove', workId: 'review' });
  apply(studio, { type: 'team.remove', teamId: 'delivery' });
  apply(studio, { type: 'person.remove', personId: 'product-one' });
  assert.equal(studio.read().state.people.length, 3);
  assert.equal(studio.read().state.teams.length, 0);
  assert.equal(studio.read().state.work.length, 0);
  assert.equal(studio.read().result.knownCommitmentCents, 0);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.equal(studio.read().state.people.length, 4);
  assert.equal(studio.redo(studio.read()).ok, true);
  assert.equal(studio.read().state.people.length, 3);
  assert.equal(original.result.knownCommitmentCents, 120000);
});

test('cross-team practices remain visible removal dependencies and released identities stay reusable', () => {
  const plan = createExamplePlan();
  plan.teams.push({ id: 'assurance', label: 'Assurance', personIds: [] });
  plan.practices.push({ id: 'peer-assurance', practiceId: 'assurance', teamId: 'assurance', workIds: ['review'] });
  const studio = createStudio(plan);
  assert.deepEqual(held(studio, { type: 'work.remove', workId: 'review' }, 'dependencies').references, [
    { collection: 'practices', id: 'shared-expectations', field: 'workIds' },
    { collection: 'practices', id: 'peer-assurance', field: 'workIds' },
  ]);
  apply(studio, { type: 'person.create', person: person('temporary') });
  apply(studio, { type: 'person.remove', personId: 'temporary' });
  assert.equal(studio.updatePerson('temporary', person('temporary'), studio.read()).error.code, 'reference');
  apply(studio, { type: 'person.create', person: person('temporary', { rateCentsPerHour: 15000 }) });
  assert.equal(studio.updatePerson('temporary', person('temporary', { fundedMinutes: 60, rateCentsPerHour: 15000 }), studio.read()).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 135000);
  assert.equal(studio.undo(studio.read()).ok, true);
  assert.equal(studio.read().result.knownCommitmentCents, 120000);
});

test('duplicate creation and row, membership, ordering and lifecycle faults preserve accepted data', () => {
  const studio = createStudio();
  const cases = [
    [{ type: 'person.create', person: person('product-one') }, 'duplicate-id'],
    [{ type: 'team.create', team: { id: 'delivery', label: 'Duplicate', personIds: [] } }, 'duplicate-id'],
    [{ type: 'work.create', work: { ...studio.read().state.work[0] } }, 'duplicate-id'],
    [{ type: 'person.create', person: person('negative', { fundedMinutes: -1 }) }, 'integer'],
    [{ type: 'team.create', team: { id: 'new-team', label: 'New', personIds: ['missing'] } }, 'reference'],
    [{ type: 'work.create', work: work() }, 'reference'],
    [{ type: 'work.participants.replace', workId: 'review', personIds: [] }, 'reference-count'],
    [{ type: 'work.participants.replace', workId: 'review', personIds: ['product-one', 'product-one'] }, 'duplicate-reference'],
    [{ type: 'work.funding.set', workId: 'review', funding: 'free' }, 'choice'],
    [{ type: 'work.status.set', workId: 'review', status: 'retired' }, 'choice'],
    [{ type: 'person.remove', personId: 'missing' }, 'reference'],
    [{ type: 'collection.reorder', collection: 'people', ids: ['product-one'] }, 'order'],
    [{ type: 'collection.reorder', collection: 'people', ids: ['product-one', 'product-one', 'engineering-one', 'engineering-two'] }, 'duplicate-reference'],
    [{ type: 'collection.reorder', collection: 'people', ids: ['product-one', 'product-two', 'engineering-one', 'unknown'] }, 'reference'],
    [{ type: 'collection.reorder', collection: 'purpose', ids: [] }, 'choice'],
  ];
  for (const [command, code] of cases) held(studio, command, code);
});

test('malformed command and nested no-op values are rejected before accessor evaluation', () => {
  const studio = createStudio();
  let reads = 0;
  const accessor = () => { reads += 1; return 'planned'; };
  const commandAccessor = { type: 'work.status.set', workId: 'review', get status() { return accessor(); } };
  const typeAccessor = { get type() { return accessor(); }, workId: 'review', status: 'planned' };
  const team = { ...studio.read().state.teams[0], get label() { return accessor(); } };
  const ids = [...studio.read().state.teams[0].personIds];
  Object.defineProperty(ids, '0', { enumerable: true, get: accessor });
  const cases = [
    [null, 'data-property'],
    [{ type: 'constructor' }, 'command'],
    [{ type: 'work.status.set', workId: 'review', status: 'planned', extra: 1 }, 'fields'],
    [{ type: 'work.status.set', workId: 'review' }, 'fields'],
    [Object.create({ type: 'work.status.set', workId: 'review', status: 'planned' }), 'data-property'],
    [commandAccessor, 'data-property'], [typeAccessor, 'data-property'],
    [{ type: 'team.update', teamId: 'delivery', team }, 'data-property'],
    [{ type: 'team.members.replace', teamId: 'delivery', personIds: ids }, 'data-property'],
    [{ type: 'team.members.replace', teamId: 'delivery', personIds: new Array(4) }, 'collection'],
  ];
  for (const [command, code] of cases) held(studio, command, code);
  assert.equal(reads, 0);
});

test('commands require this exact accepted projection and defer reflection for stale calls', () => {
  const studio = createStudio();
  const before = studio.read();
  const command = { type: 'work.status.set', workId: 'review', status: 'paused' };
  for (const expected of [undefined, createStudio().read()]) {
    const result = studio.applyCommand(command, expected);
    assert.equal(result.error.code, 'stale-edit');
    assert.strictEqual(studio.read(), before);
  }
  apply(studio, command);
  let reads = 0;
  const guarded = new Proxy(command, { getOwnPropertyDescriptor(target, key) { reads += 1; return Reflect.getOwnPropertyDescriptor(target, key); } });
  assert.equal(studio.applyCommand(guarded, before).error.code, 'stale-edit');
  assert.equal(studio.previewCommand(guarded, before).error.code, 'stale-edit');
  assert.equal(reads, 0);
});

test('descriptor-triggered nested acceptance wins over command and dependency publication', () => {
  for (const type of ['work.status.set', 'person.remove']) {
    const studio = createStudio();
    const before = studio.read();
    const command = type === 'person.remove' ? { type, personId: 'product-one' } : { type, workId: 'review', status: 'paused' };
    let nested;
    const proxy = new Proxy(command, {
      ownKeys(target) {
        nested = studio.updatePerson('product-one', { ...before.state.people[0], label: 'New owner' }, before);
        return Reflect.ownKeys(target);
      },
    });
    const result = studio.applyCommand(proxy, before);
    assert.equal(nested.ok, true);
    assert.equal(result.error.code, 'stale-edit');
    assert.strictEqual(result.projection, nested.projection);
    assert.equal(studio.read().state.work[0].status, 'planned');
    assert.equal(studio.read().state.people[0].label, 'New owner');
    assert.deepEqual(studio.readHistory(), { undoCount: 1, redoCount: 0, limit: 20 });
  }
});

test('command type, target and reference snapshots use their admitted descriptor values', () => {
  const studio = createStudio();
  let typeReads = 0;
  const changingType = new Proxy({ type: 'work.status.set', workId: 'review', status: 'planned' }, {
    getOwnPropertyDescriptor(target, key) {
      if (key === 'type') return { configurable: true, enumerable: true, writable: true, value: ++typeReads === 1 ? 'work.status.set' : 'person.remove' };
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  held(studio, changingType, 'command');
  let targetReads = 0;
  const target = new Proxy({ type: 'work.status.set', workId: 'review', status: 'paused' }, {
    getOwnPropertyDescriptor(record, key) {
      if (key === 'workId') { targetReads += 1; return { configurable: true, enumerable: true, writable: true, value: targetReads === 1 ? 'review' : 'missing' }; }
      return Reflect.getOwnPropertyDescriptor(record, key);
    },
  });
  apply(studio, target);
  assert.equal(targetReads, 1);
  let idReads = 0;
  const ids = new Proxy(['product-one'], {
    getOwnPropertyDescriptor(array, key) {
      if (key === '0') { idReads += 1; return { configurable: true, enumerable: true, writable: true, value: idReads === 1 ? 'product-one' : 'missing' }; }
      return Reflect.getOwnPropertyDescriptor(array, key);
    },
  });
  apply(studio, { type: 'work.participants.replace', workId: 'review', personIds: ids });
  assert.equal(idReads, 1);
  assert.deepEqual(studio.read().state.work[0].personIds, ['product-one']);
  assert.equal(studio.read().result.knownCommitmentCents, 30000);
});

test('team replacement checks canonical identity and nested reference admission preserves newer acceptance', () => {
  const studio = createStudio();
  let idReads = 0;
  const team = new Proxy({ ...studio.read().state.teams[0] }, {
    getOwnPropertyDescriptor(target, key) {
      if (key === 'id') { idReads += 1; return { configurable: true, enumerable: true, writable: true, value: 'other' }; }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  held(studio, { type: 'team.update', teamId: 'delivery', team }, 'target');
  assert.equal(idReads, 1);
  const before = studio.read();
  let nested;
  const ids = new Proxy(['product-one'], {
    ownKeys(target) {
      nested = studio.updateWork('review', { ...before.state.work[0], occurrences: 12 }, before);
      return Reflect.ownKeys(target);
    },
  });
  const result = studio.previewCommand({ type: 'work.participants.replace', workId: 'review', personIds: ids }, before);
  assert.equal(nested.ok, true);
  assert.equal(result.error.code, 'stale-edit');
  assert.strictEqual(result.projection, nested.projection);
  assert.equal(studio.read().result.knownCommitmentCents, 240000);
  assert.equal(studio.read().state.work[0].personIds.length, 4);
});

test('collection and reference budgets remain whole-plan boundaries for command creation', () => {
  const plan = createExamplePlan();
  plan.people = Array.from({ length: 128 }, (_, index) => person(`person-${index}`, { rateCentsPerHour: 0 }));
  plan.teams = Array.from({ length: 32 }, (_, index) => ({ id: `team-${index}`, label: 'Team', personIds: plan.people.map(row => row.id) }));
  plan.work = [];
  plan.practices = [];
  const studio = createStudio(plan);
  held(studio, { type: 'person.create', person: person('overflow') }, 'collection');
  held(studio, { type: 'team.create', team: { id: 'overflow', label: 'Overflow', personIds: [] } }, 'collection');
  held(studio, { type: 'work.create', work: work({ teamId: 'team-0', personIds: ['person-0'] }) }, 'reference-budget');
  const error = held(studio, { type: 'person.remove', personId: 'person-0' }, 'dependencies');
  assert.equal(error.references.length, 32);
  assert.deepEqual(error.references[0], { collection: 'teams', id: 'team-0', field: 'personIds' });
  assert.deepEqual(error.references[31], { collection: 'teams', id: 'team-31', field: 'personIds' });
});
