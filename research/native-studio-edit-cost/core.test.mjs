import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createExamplePlan } from './.local/app/collaboration/native-investment-studio/contract.mjs';
import { createStudio } from './.local/app/collaboration/native-investment-studio/state.mjs';
import { createWorkDraftAdapter } from './.local/app/collaboration/native-investment-studio/draft.mjs';
import { FIXTURE_NAMES, createFixture } from './fixtures.mjs';
import { POLICIES, BOUNDARY_TASKS, createPolicyTask, createBoundaryTask, instrumentStudio, stats } from './core.mjs';
import { runNodeStudy } from './node.mjs';

function clock() { let ticks = 0; return () => ticks++; }
const POLICY_COUNTS = Object.freeze({
  direct: { rawEdits: 3, steps: 0, begins: 0, queueRequests: 0, scheduledRequests: 0, cancelledRequests: 0,
    pendingRequests: 0, maxPendingRequests: 0, previewRequests: 0, previewPreparations: 0, cacheHits: 0,
    workUpdates: 3, imports: 0, replacements: 0, acceptedCommits: 3 },
  explicit: { rawEdits: 3, steps: 0, begins: 1, queueRequests: 0, scheduledRequests: 0, cancelledRequests: 0,
    pendingRequests: 0, maxPendingRequests: 0, previewRequests: 0, previewPreparations: 0, cacheHits: 0,
    workUpdates: 1, imports: 0, replacements: 0, acceptedCommits: 1 },
  deferred: { rawEdits: 3, steps: 0, begins: 1, queueRequests: 3, scheduledRequests: 1, cancelledRequests: 0,
    pendingRequests: 0, maxPendingRequests: 1, previewRequests: 0, previewPreparations: 0, cacheHits: 0,
    workUpdates: 1, imports: 0, replacements: 0, acceptedCommits: 1 },
  preview: { rawEdits: 3, steps: 0, begins: 2, queueRequests: 0, scheduledRequests: 0, cancelledRequests: 0,
    pendingRequests: 0, maxPendingRequests: 0, previewRequests: 5, previewPreparations: 5, cacheHits: 0,
    workUpdates: 1, imports: 0, replacements: 0, acceptedCommits: 1 },
});

for (const name of FIXTURE_NAMES) for (const policy of POLICIES) {
  test(`${name}/${policy}: operation counts and final money retain the declared comparison`, () => {
    const fixture = createFixture(name, createExamplePlan);
    const prepared = createPolicyTask({ fixture, policy, createStudio, createWorkDraftAdapter, now: clock() });
    assert.throws(() => prepared.verify(), /Execute the trace/u);
    prepared.execute();
    const projection = prepared.verify();
    const { producedUtf8Bytes, modelMs, ...counts } = prepared.snapshot();
    assert.deepEqual(counts, POLICY_COUNTS[policy]);
    const preparations = policy === 'preview' ? 6 : policy === 'direct' ? 3 : 1;
    assert.equal(modelMs, preparations, 'the fake clock assigns one unit to each model boundary');
    assert.equal(producedUtf8Bytes, fixture.facts.serializedBytes * preparations,
      'the fixed-width minute trace retains each prepared output byte count');
    assert.equal(projection.result.knownCommitmentCents, fixture.expectedByMinutes[60].cents);
    assert.throws(() => prepared.execute(), /executes once/u);
    prepared.dispose();
    assert.equal(prepared.snapshot().pendingRequests, 0);
  });
}

const RATE_EXPECTED = Object.freeze({ example: 120300, medium: 7682400, caps: 92167500, 'near-byte': 92167500 });
for (const name of FIXTURE_NAMES) for (const task of BOUNDARY_TASKS) {
  test(`${name}/${task}: whole-plan admission retains literal amount and identity consequences`, () => {
    const fixture = createFixture(name, createExamplePlan);
    const prepared = createBoundaryTask({ fixture, task, createStudio, now: clock() });
    prepared.execute();
    const projection = prepared.verify();
    const measured = prepared.snapshot();
    assert.equal(projection.result.knownCommitmentCents, task === 'import' ? fixture.expectedByMinutes[30].cents : RATE_EXPECTED[name]);
    assert.equal(projection.state.revision, 0);
    assert.equal(measured.acceptedCommits, 1);
    assert.equal(measured.imports, task === 'import' ? 1 : 0);
    assert.equal(measured.replacements, task === 'rate-replacement' ? 1 : 0);
    assert.equal(measured.previewRequests, 0);
    assert.equal(measured.modelMs, 1);
    assert.equal(measured.producedUtf8Bytes, fixture.facts.serializedBytes);
    assert.throws(() => prepared.execute(), /executes once/u);
    prepared.dispose();
  });
}

test('statistics retain zeros, ordered quantiles, even medians, and caller ownership', () => {
  const values = [2, 0, 1, .5, 0];
  assert.deepEqual(stats(values), { count: 5, min: 0, max: 2, median: .5, p95: 2 });
  assert.deepEqual(values, [2, 0, 1, .5, 0]);
  assert.deepEqual(stats([0, 0]), { count: 2, min: 0, max: 0, median: 0, p95: 0 });
  assert.equal(stats([1, 3]).median, 2);
  assert.equal(stats(Array.from({ length: 100 }, (_, index) => index)).p95, 94);
});

test('invalid sample populations and unknown tasks produce explicit failures', () => {
  for (const values of [[], [NaN], [Infinity], [-1], ['1'], null]) assert.throws(() => stats(values), TypeError);
  assert.throws(() => createPolicyTask({ policy: 'other' }), TypeError);
  assert.throws(() => createBoundaryTask({ task: 'other' }), TypeError);
});

test('a rejected model command consumes a call while preserving accepted commits and produced bytes', () => {
  const owner = createStudio();
  const observed = instrumentStudio(owner, clock());
  const before = owner.read();
  const result = observed.studio.updateWork('review', { ...before.state.work[0], minutesPerOccurrence: -1 }, before);
  assert.equal(result.ok, false);
  assert.equal(owner.read(), before);
  const measured = observed.snapshot();
  assert.equal(measured.workUpdates, 1);
  assert.equal(measured.acceptedCommits, 0);
  assert.equal(measured.producedUtf8Bytes, 0);
  assert.equal(measured.modelMs, 1);
});

test('the Node runner rejects undersampled or mutable-source protocols before recording measurements', async () => {
  for (const node of [{ runs: 4, warmup: 50, samples: 200 }, { runs: 5, warmup: 0, samples: 200 }, { runs: 5, warmup: 50, samples: 19 }]) {
    await assert.rejects(runNodeStudy({ protocol: { sourceCommit: 'a'.repeat(40), node } }), /frozen source coordinate/u);
  }
  await assert.rejects(runNodeStudy({ protocol: { sourceCommit: 'dev', node: { runs: 5, warmup: 50, samples: 200 } } }), /frozen source coordinate/u);
});
