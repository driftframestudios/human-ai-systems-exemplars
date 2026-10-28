import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePlan, parsePlan, createExamplePlan, PlanError } from '../../collaboration/native-investment-studio/contract.mjs';
import { CONTRACT, LIMITS, PRACTICES } from '../../collaboration/native-investment-studio/config.mjs';

function rejects(candidate, code) {
  assert.throws(() => preparePlan(candidate), error => error instanceof PlanError && error.code === code);
}

test('coordination has an independent person-minute and cent oracle', () => {
  const { state, result } = preparePlan(createExamplePlan());
  assert.equal(result.plannedCommitmentCents, 120000); // 4 × 6 × 0.5 h × $100
  assert.equal(result.ledger.length, 1);
  assert.equal(result.ledger[0].lines.length, 4);
  assert.deepEqual(result.ledger[0].lines.map(row => row.minutes), [180, 180, 180, 180]);
  assert.equal(result.timing, 'unscheduled');
  assert.equal(state.work[0].timing, null);
  const changed = createExamplePlan();
  changed.work[0].occurrences = 12;
  assert.equal(preparePlan(changed).result.plannedCommitmentCents, 240000);
});

test('allocated practice work stays inside staffing; shared work enters once', () => {
  const plan = createExamplePlan();
  plan.people = [
    { id: 'one', label: 'One', fundedMinutes: 4800, rateCentsPerHour: 10000 },
    { id: 'two', label: 'Two', fundedMinutes: 4800, rateCentsPerHour: 10000 },
    { id: 'reviewer', label: 'Reviewer', fundedMinutes: 0, rateCentsPerHour: 15000 },
  ];
  plan.teams = [{ id: 'delivery', label: 'Delivery', personIds: ['one', 'two', 'reviewer'] }];
  const work = (id, personIds, minutesPerOccurrence, occurrences, funding = 'allocated') => ({
    id, label: id, teamId: 'delivery', personIds, minutesPerOccurrence, occurrences, funding, status: 'planned', timing: null,
  });
  plan.work = [work('agreement', ['one', 'two'], 45, 1), work('preparation', ['one'], 30, 1), work('check', ['one', 'two'], 10, 6), work('review', ['reviewer'], 60, 1, 'additional')];
  plan.practices = ['expectation', 'assurance'].map(practiceId => ({ id: practiceId, practiceId, teamId: 'delivery', workIds: ['agreement', 'preparation', 'check', 'review'] }));
  const result = preparePlan(plan).result;
  assert.equal(result.fundedKnownCents, 1600000);
  assert.equal(result.allocatedKnownCents, 40000);
  assert.equal(result.additionalKnownCents, 15000);
  assert.equal(result.plannedCommitmentCents, 1615000);
  assert.equal(result.capacity.reduce((total, row) => total + row.remainingMinutes, 0), 9360);
  assert.equal(result.ledger.length, 4);
  assert.equal(result.standing, 'priced');
});

test('zero and unknown rates retain different meanings; zero effort is priced zero', () => {
  const plan = createExamplePlan();
  plan.people[0].rateCentsPerHour = null;
  const missing = preparePlan(plan).result;
  assert.equal(missing.plannedCommitmentCents, null);
  assert.equal(missing.knownCommitmentCents, 90000);
  assert.equal(missing.standing, 'incomplete');
  plan.people[0].rateCentsPerHour = 0;
  assert.equal(preparePlan(plan).result.plannedCommitmentCents, 90000);
  plan.people[0].rateCentsPerHour = null;
  plan.work[0].occurrences = 0;
  assert.equal(preparePlan(plan).result.plannedCommitmentCents, 0);
});

test('paused work retains its price and capacity pressure; over-allocation is explicit', () => {
  const plan = createExamplePlan();
  plan.work[0].status = 'paused';
  const paused = preparePlan(plan).result;
  assert.equal(paused.plannedCommitmentCents, 120000);
  assert.equal(paused.standing, 'incomplete');
  assert.deepEqual(paused.obligations, [{ code: 'paused-work', workId: 'review' }]);
  plan.work[0].funding = 'allocated';
  const allocated = preparePlan(plan).result;
  assert.equal(allocated.plannedCommitmentCents, 0);
  assert.equal(allocated.allocatedKnownCents, 120000);
  assert.deepEqual(allocated.capacity.map(row => row.remainingMinutes), [-180, -180, -180, -180]);
  assert.equal(allocated.obligations.filter(row => row.code === 'allocated-capacity-exceeded').length, 4);
});

test('cent rounding is exact per person/funding pool, including half cents', () => {
  const plan = createExamplePlan();
  plan.people.forEach(person => { person.rateCentsPerHour = 1; });
  plan.work[0].occurrences = 1;
  plan.work[0].minutesPerOccurrence = 30;
  assert.equal(preparePlan(plan).result.plannedCommitmentCents, 4);
  plan.work[0].minutesPerOccurrence = 29;
  assert.equal(preparePlan(plan).result.plannedCommitmentCents, 0);
});

test('splitting work preserves spending and attribution with an explicit display reconciliation', () => {
  for (const funding of ['allocated', 'additional']) {
    const plan = createExamplePlan();
    plan.people = [{ id: 'one', label: 'One', fundedMinutes: funding === 'allocated' ? 60 : 0, rateCentsPerHour: 10000 }];
    plan.teams[0].personIds = ['one'];
    plan.work[0] = { ...plan.work[0], personIds: ['one'], minutesPerOccurrence: 60, occurrences: 1, funding };
    const combined = preparePlan(plan).result;
    plan.work = Array.from({ length: 60 }, (_, i) => ({ ...plan.work[0], id: `minute-${i}`, minutesPerOccurrence: 1 }));
    plan.practices = [];
    const split = preparePlan(plan).result;
    assert.equal(split.plannedCommitmentCents, 10000);
    assert.equal(split.plannedCommitmentCents, combined.plannedCommitmentCents);
    const key = funding === 'allocated' ? 'allocatedCents' : 'additionalCents';
    const subtotal = funding === 'allocated' ? split.allocatedKnownCents : split.additionalKnownCents;
    assert.equal(subtotal, 10000);
    assert.equal(split.lineRoundingAdjustments[key], -20);
    assert.equal(split.ledger.reduce((total, work) => total + work.lines[0].cents, 0) + split.lineRoundingAdjustments[key], subtotal);
    assert.equal(split.capacity[0][key], 10000);
    plan.work.reverse();
    assert.equal(preparePlan(plan).result.plannedCommitmentCents, combined.plannedCommitmentCents);
    plan.people[0].rateCentsPerHour = null;
    const unknown = preparePlan(plan).result;
    assert.equal(unknown.plannedCommitmentCents, null);
    assert.equal(unknown.lineRoundingAdjustments[key], 0);
    assert.equal(unknown.capacity[0][key], null);
  }
});

test('invalid numeric forms and boundary neighbors receive structured rejection', () => {
  for (const value of [-1, 0.5, NaN, Infinity, -Infinity, '30', true, null, LIMITS.minutesPerOccurrence + 1]) {
    const plan = createExamplePlan();
    plan.work[0].minutesPerOccurrence = value;
    rejects(plan, 'integer');
  }
  for (const value of [0, LIMITS.minutesPerOccurrence]) {
    const plan = createExamplePlan();
    plan.work[0].minutesPerOccurrence = value;
    assert.doesNotThrow(() => preparePlan(plan));
  }
  for (const value of [-1, 1.1, Number.MAX_SAFE_INTEGER]) {
    const plan = createExamplePlan();
    plan.revision = value;
    rejects(plan, 'integer');
  }
});

test('identity references survive reorder and renaming; Map keys remain ordinary identities', () => {
  const plan = createExamplePlan();
  const original = preparePlan(plan).result.plannedCommitmentCents;
  const oldId = plan.people[0].id;
  plan.people[0].id = 'constructor';
  plan.people[0].label = 'Renamed participant';
  plan.teams[0].personIds = plan.teams[0].personIds.map(id => id === oldId ? 'constructor' : id);
  plan.work[0].personIds = plan.work[0].personIds.map(id => id === oldId ? 'constructor' : id);
  plan.people.reverse();
  assert.equal(preparePlan(plan).result.plannedCommitmentCents, original);
  assert.equal(preparePlan(plan).result.ledger[0].lines[0].personId, 'constructor');
});

test('duplicates, unresolved references, and ownership mismatches are rejected', () => {
  const cases = [
    ['duplicate-id', plan => { plan.people[1].id = plan.people[0].id; }],
    ['duplicate-reference', plan => { plan.work[0].personIds[1] = plan.work[0].personIds[0]; }],
    ['reference', plan => { plan.work[0].teamId = 'missing'; }],
    ['reference', plan => { plan.practices[0].workIds = ['missing']; }],
    ['team-membership', plan => { plan.teams[0].personIds.shift(); }],
    ['timing-version', plan => { plan.work[0].timing = { week: 1 }; }],
    ['practice', plan => { plan.practices[0].practiceId = 'invented'; }],
  ];
  for (const [code, alter] of cases) {
    const plan = createExamplePlan(); alter(plan); rejects(plan, code);
  }
});

test('declared fields exclude accessors, surplus graphs, sparse arrays and custom objects', () => {
  let calls = 0;
  const accessor = createExamplePlan();
  Object.defineProperty(accessor.work[0], 'minutesPerOccurrence', { enumerable: true, get() { calls += 1; return 30; } });
  rejects(accessor, 'data-property');
  assert.equal(calls, 0);
  const surplus = createExamplePlan();
  Object.defineProperty(surplus, 'extra', { enumerable: true, get() { calls += 1; throw new Error('unvisited'); } });
  rejects(surplus, 'fields');
  assert.equal(calls, 0);
  const sparse = createExamplePlan(); delete sparse.people[0]; rejects(sparse, 'collection');
  const custom = createExamplePlan(); Object.setPrototypeOf(custom.people[0], new Date()); rejects(custom, 'record');
  const symbol = createExamplePlan(); symbol[Symbol('extra')] = true; rejects(symbol, 'fields');
});

test('empty plans retain a usable zero state and current contracts round-trip deterministically', () => {
  const plan = createExamplePlan();
  plan.people = []; plan.teams = []; plan.work = []; plan.practices = [];
  const empty = preparePlan(plan);
  assert.equal(empty.result.plannedCommitmentCents, 0);
  assert.equal(empty.result.standing, 'priced');
  const original = preparePlan(createExamplePlan());
  assert.deepEqual(parsePlan(original.serialized), original);
  const reorderedProperties = Object.fromEntries(Object.entries(createExamplePlan()).reverse());
  assert.equal(preparePlan(reorderedProperties).serialized, original.serialized);
  for (const field of ['kind', 'schemaVersion', 'modelVersion', 'currency']) {
    const bad = createExamplePlan(); bad[field] = 'future'; rejects(bad, 'unsupported-contract');
  }
});

test('import and collection budgets reject before downstream work', () => {
  assert.throws(() => parsePlan(' '.repeat(LIMITS.bytes + 1)), { code: 'bytes' });
  assert.throws(() => parsePlan('"' + 'é'.repeat(LIMITS.bytes / 2) + '"'), { code: 'bytes' });
  assert.throws(() => parsePlan('{'), { code: 'json' });
  const large = createExamplePlan(); large.people = new Array(LIMITS.people + 1); rejects(large, 'collection');
  const edges = createExamplePlan();
  edges.people = Array.from({ length: 128 }, (_, i) => ({ id: `person-${i}`, label: 'Person', fundedMinutes: 0, rateCentsPerHour: 0 }));
  edges.teams = Array.from({ length: 32 }, (_, i) => ({ id: `team-${i}`, label: 'Team', personIds: edges.people.map(person => person.id) }));
  edges.work = [{ ...edges.work[0], teamId: 'team-0', personIds: ['person-0'] }];
  edges.practices = [];
  rejects(edges, 'reference-budget');
});

test('array admission snapshots its own length and bounds traversal despite a changing view', () => {
  const plan = createExamplePlan();
  let lengthReads = 0;
  let lengthDescriptors = 0;
  let personDescriptors = 0;
  plan.people = new Proxy([], {
    get(target, key, receiver) {
      // A live view changes after two observations. Its own array length stays zero.
      if (key === 'length') return ++lengthReads <= 2 ? 0 : LIMITS.people + 1;
      return Reflect.get(target, key, receiver);
    },
    getOwnPropertyDescriptor(target, key) {
      if (key === 'length') lengthDescriptors += 1;
      if (/^\d+$/.test(key)) {
        personDescriptors += 1;
        return { enumerable: true, configurable: true, writable: true,
          value: { id: `person-${key}`, label: 'Person', fundedMinutes: 0, rateCentsPerHour: 0 } };
      }
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  plan.teams = []; plan.work = []; plan.practices = [];
  const result = preparePlan(plan);
  assert.equal(result.state.people.length, 0);
  assert.equal(result.result.plannedCommitmentCents, 0);
  assert.equal(lengthDescriptors, 1);
  assert.equal(lengthReads, 0);
  assert.equal(personDescriptors, 0);
});

test('large individually valid line amounts cannot overflow the aggregate', () => {
  const plan = createExamplePlan();
  plan.people = Array.from({ length: 16 }, (_, i) => ({ id: `person-${i}`, label: 'Person', fundedMinutes: 0, rateCentsPerHour: LIMITS.rateCentsPerHour }));
  const personIds = plan.people.map(person => person.id);
  plan.teams = [{ id: 'delivery', label: 'Delivery', personIds }];
  plan.work = Array.from({ length: 200 }, (_, i) => ({ ...plan.work[0], id: `work-${i}`, personIds, minutesPerOccurrence: LIMITS.minutesPerOccurrence, occurrences: LIMITS.occurrences }));
  plan.practices = [];
  rejects(plan, 'money-overflow');
});

test('safe settled ceiling survives larger display-line totals and reordered work', () => {
  const plan = createExamplePlan();
  plan.people = [
    { id: 'one', label: 'One', fundedMinutes: 0, rateCentsPerHour: 100000000 },
    { id: 'two', label: 'Two', fundedMinutes: 0, rateCentsPerHour: 56514959 },
    { id: 'filler', label: 'Filler', fundedMinutes: 0, rateCentsPerHour: 60 },
  ];
  plan.teams = [{ id: 'delivery', label: 'Delivery', personIds: ['one', 'two', 'filler'] }];
  const work = (id, personIds, minutesPerOccurrence, occurrences) => ({
    id, label: id, teamId: 'delivery', personIds, minutesPerOccurrence, occurrences,
    funding: 'additional', status: 'planned', timing: null,
  });
  // The two settled pools total 9,007,199,239,831,992 cents. The filler buys
  // 14,908,999 minutes at one cent/minute, reaching the exact safe ceiling.
  plan.work = Array.from({ length: 240 }, (_, i) => work(`work-${i}`, ['one', 'two'], 1439, 9998));
  plan.work.push(work('filler-one', ['filler'], 1440, 10000));
  plan.work.push(work('filler-two', ['filler'], 1440, 353));
  plan.work.push(work('filler-three', ['filler'], 679, 1));
  plan.practices = [];

  for (const reverse of [false, true]) {
    if (reverse) plan.work.reverse();
    const result = preparePlan(plan).result;
    assert.equal(result.plannedCommitmentCents, Number.MAX_SAFE_INTEGER);
    assert.equal(result.knownCommitmentCents, 9007199254740991);
    const displayCents = result.ledger.reduce((total, row) => total + row.lines.reduce((subtotal, line) => subtotal + BigInt(line.cents), 0n), 0n);
    assert.equal(displayCents, 9007199254741159n);
    assert.equal(result.lineRoundingAdjustments.additionalCents, -168);
    assert.equal(displayCents + BigInt(result.lineRoundingAdjustments.additionalCents), 9007199254740991n);
    assert.equal(result.standing, 'priced');
  }
});

test('public projections and vocabulary are frozen; input records retain their own ownership', () => {
  const input = createExamplePlan();
  const prepared = preparePlan(input);
  input.people[0].label = 'Changed outside';
  assert.notEqual(prepared.state.people[0].label, input.people[0].label);
  assert.throws(() => { prepared.result.ledger[0].lines[0].cents = 0; }, TypeError);
  assert.throws(() => { prepared.state.teams[0].personIds.push('other'); }, TypeError);
  assert.ok(Object.isFrozen(CONTRACT) && Object.isFrozen(LIMITS) && Object.isFrozen(PRACTICES[0]));
});
