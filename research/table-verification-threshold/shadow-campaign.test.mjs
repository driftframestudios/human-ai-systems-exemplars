import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { contract, assessReadiness, preview, createPrediction, createOutcome as createBoundOutcome, forecast, bundleIdentity } from './shadow-campaign.mjs';
const now = '2026-10-03T12:00:00.000Z', later = '2026-10-03T12:10:00.000Z';
const bundle = { sha256: 'f'.repeat(64) };
const createOutcome = (o, records, at) => createBoundOutcome(o, records, at, bundle);
const copy = value => structuredClone(value);
function packet(count = 3) {
  return { contract, approval: { reviewer: 'independent-reviewer', reviewedAt: '2026-10-03T11:00:00.000Z', bundleSha256: bundle.sha256 }, campaigns: [{
    id: 'fixture-campaign', cohort: 'fixture-cohort', repairCluster: 'fixture-cluster', families: ['fixture-family'], expectedCases: count,
    caseIds: Array.from({ length: count }, (_, i) => 'case-' + i), identity: { revision: 'a'.repeat(40), sourceSha256: 'b'.repeat(64), definitionSha256: 'c'.repeat(64), runtimeSha256: 'd'.repeat(64) },
    sourceFrozen: true, sourceChanges: ['fixture-repair'], knownFindings: ['known-finding'], existingEvidence: 'stale', requiredClosure: true, focusedQuestion: null,
    sourceReviewGates: [{ id: 'source-review', status: 'clear' }], deterministicChecks: [{ id: 'source-units', status: 'pass' }]
  }] };
}
const predict = (p = packet(), records = []) => createPrediction(p, p.campaigns[0].id, records, bundle, now);
function observation(p) {
  return { predictionEvent: p.event, status: 'complete', startedAt: '2026-10-03T12:01:00.000Z', endedAt: '2026-10-03T12:09:00.000Z',
    identity: copy(p.campaign.identity), completedCaseIds: [...p.campaign.caseIds], manifestSha256: 'e'.repeat(64),
    adjudication: { status: 'complete', reviewer: 'independent-adjudicator' }, findings: [], metrics: { browserLaunches: null, caseAttempts: null, durationSeconds: null } };
}
for (const status of ['partial', 'complete']) for (const adjudication of ['pending', 'complete']) {
  test('neutral observation provenance: ' + status + ' campaign, ' + adjudication + ' adjudication', () => {
    const p = predict(), raw = observation(p);
    raw.status = status;
    raw.adjudication = { status: adjudication, reviewer: adjudication === 'complete' ? 'independent-adjudicator' : null };
    raw.findings = [{ id: 'new-application', kind: 'application-consequential', new: true }];
    const o = createOutcome(raw, [p], later), model = forecast([p, o], p.campaign.cohort);
    assert.equal(o.standing, 'parent-supplied-observation');
    assert.deepEqual(o.observation.adjudication, raw.adjudication);
    const expected = status === 'complete' && adjudication === 'complete' ? 1 : null;
    assert.equal(o.outcome.value, expected);
    if (expected === null) assert.deepEqual(model, forecast([p], p.campaign.cohort));
    else {
      assert.equal(model.eligibleCampaigns, 1);
      assert.equal(model.posterior.a, 2); assert.equal(model.posterior.b, 1);
    }
  });
}
for (const count of [3, 93]) test('one campaign, not ' + count + ' independent observations', () => {
  const p = predict(packet(count)), o = createOutcome(observation(p), [p], later), model = forecast([p, o], p.campaign.cohort);
  assert.equal(p.forecast.eligibleCampaigns, 0); assert.equal(p.forecast.probabilityAtLeastOneNewConsequentialFinding, 0.5);
  assert.equal(p.forecast.empiricalEstimate.point, null); assert.equal(p.forecast.sensitivity.length, 2);
  p.forecast.sensitivity.forEach((s, i) => assert(Math.abs(s.probability - [0.25, 0.75][i]) < 1e-12));
  assert.equal(model.eligibleCampaigns, 1); assert.equal(model.posterior.a, 1); assert.equal(model.posterior.b, 2);
});
for (const [name, change, action] of [
  ['open source review', c => { c.sourceReviewGates[0].status = 'open'; }, 'hold-coherent-batch'],
  ['unfrozen source', c => { c.sourceFrozen = false; }, 'hold-coherent-batch'],
  ['unknown runtime', c => { c.identity.runtimeSha256 = null; }, 'hold-coherent-batch'],
  ['unknown case inventory', c => { c.caseIds = null; }, 'hold-coherent-batch'],
  ['pending deterministic check', c => { c.deterministicChecks[0].status = 'pending'; }, 'run-focused'],
  ['failed deterministic check', c => { c.deterministicChecks[0].status = 'fail'; }, 'run-focused'],
  ['named focused question', c => { c.requiredClosure = false; c.focusedQuestion = 'fixture-uncertainty'; }, 'run-focused'],
  ['required closure with matching evidence', c => { c.existingEvidence = 'matching'; c.sourceChanges = []; }, 'run-required-closure']
]) test('deterministic decision: ' + name, () => {
  const input = packet(), c = input.campaigns[0]; change(c);
  assert.equal(assessReadiness(c, true).action, action);
  assert.equal(assessReadiness(c, false).action, 'hold-coherent-batch');
  if (action !== 'run-required-closure') assert.throws(() => predict(input));
});
for (const [name, change] of [
  ['approval absent', p => { p.approval.reviewer = null; }],
  ['changed reviewed bundle', p => { p.approval.bundleSha256 = '0'.repeat(64); }],
  ['future review', p => { p.approval.reviewedAt = later; }]
]) test('review gate: ' + name, () => { const p = packet(); change(p); assert.throws(() => predict(p)); });
for (const length of [142, 143]) test('campaign/event ID boundary: ' + length, () => {
  const input = packet(); input.campaigns[0].id = 'x'.repeat(length);
  if (length === 143) { assert.throws(() => predict(input)); return; }
  const p = predict(input), o = createOutcome(observation(p), [p], later);
  assert.equal(p.event.length, 160); assert.equal(o.outcome.value, 0);
});
for (const mismatch of ['current-bundle', 'prediction-approval']) test('outcome requires reviewed bundle agreement: ' + mismatch, () => {
  const p = predict(), current = copy(bundle);
  if (mismatch === 'current-bundle') current.sha256 = '0'.repeat(64);
  else p.bundleSha256 = '0'.repeat(64);
  const records = [p], before = copy(records);
  assert.throws(() => createBoundOutcome(observation(p), records, later, current));
  assert.deepEqual(records, before);
});
for (const [name, change] of [
  ['partial negative', o => { o.status = 'partial'; o.completedCaseIds.pop(); }],
  ['cancelled', o => { o.status = 'cancelled'; }],
  ['not started', o => { o.status = 'not-started'; o.startedAt = null; o.endedAt = null; o.completedCaseIds = []; }],
  ['missing manifest', o => { o.manifestSha256 = null; }],
  ['pending adjudication', o => { o.adjudication.status = 'pending'; }],
  ['changed source', o => { o.identity.sourceSha256 = '0'.repeat(64); }],
  ['changed definition', o => { o.identity.definitionSha256 = '0'.repeat(64); }],
  ['changed runtime', o => { o.identity.runtimeSha256 = '0'.repeat(64); }],
  ['substituted case', o => { o.completedCaseIds[0] = 'other-case'; }],
  ['retrospective start', o => { o.startedAt = '2026-10-03T11:59:00.000Z'; }],
  ['future completion', o => { o.endedAt = '2026-10-03T12:11:00.000Z'; }],
  ['partial positive', o => { o.status = 'partial'; o.findings = [{ id: 'new-application', kind: 'application-consequential', new: true }]; }]
]) test('censoring/indeterminacy: ' + name, () => {
  const p = predict(), raw = observation(p); change(raw);
  const o = createOutcome(raw, [p], later); assert.equal(o.outcome.value, null);
  assert.equal(forecast([p, o], p.campaign.cohort).eligibleCampaigns, 0);
});
for (const [id, kind, isNew, expected] of [
  ['new-application', 'application-consequential', true, 1],
  ['known-finding', 'application-consequential', true, 0],
  ['previously-known', 'application-consequential', false, 0],
  ['minor-wording', 'application-minor', true, 0],
  ['locator-failure', 'harness', true, 0]
]) test('finding classification: ' + id, () => {
  const p = predict(), raw = observation(p); raw.findings = [{ id, kind, new: isNew }];
  const o = createOutcome(raw, [p], later); assert.equal(o.outcome.value, expected);
  assert.equal(forecast([p, o], p.campaign.cohort).events, expected);
  assert.equal(o.eligibleTimeExposureMinutes, null);
});
test('harness-only interrupted attempt retains unknown campaign yield', () => {
  const p = predict(), raw = observation(p); raw.status = 'partial'; raw.completedCaseIds = [];
  raw.findings = [{ id: 'locator-failure', kind: 'harness', new: true }]; raw.metrics.browserLaunches = 1;
  const o = createOutcome(raw, [p], later); assert.equal(o.outcome.value, null); assert.deepEqual(o.outcome.harnessFindingIds, ['locator-failure']);
});
test('cohorts and repeated repair clusters keep their own denominator', () => {
  const p = predict(), o = createOutcome(observation(p), [p], later), input = packet(); input.campaigns[0].id = 'same-cluster-rerun';
  const p2 = createPrediction(input, input.campaigns[0].id, [p, o], bundle, later);
  const raw = observation(p2); raw.startedAt = '2026-10-03T12:11:00.000Z'; raw.endedAt = '2026-10-03T12:12:00.000Z';
  const o2 = createOutcome(raw, [p, o, p2], '2026-10-03T12:13:00.000Z');
  assert.equal(p2.firstInCluster, false); assert.equal(forecast([p, o, p2, o2], p.campaign.cohort).eligibleCampaigns, 1);
  assert.equal(forecast([p, o], 'another-cohort').eligibleCampaigns, 0);
  assert.equal(forecast([{ event: 'historical', completedCases: 91 }, p, o, o], p.campaign.cohort).eligibleCampaigns, 1);
});
test('completed observations update the existing Beta model exactly once', () => {
  const p = predict(), raw = observation(p); raw.findings = [{ id: 'new-application', kind: 'application-consequential', new: true }];
  const o = createOutcome(raw, [p], later), m = forecast([p, o], p.campaign.cohort);
  assert.equal(m.posterior.a, 2); assert.equal(m.posterior.b, 1);
  assert.throws(() => predict(packet(), [p])); assert.throws(() => createOutcome(raw, [p, o], later));
});
for (const [name, change] of [
  ['wrong boolean type', p => { p.campaigns[0].sourceFrozen = 'true'; }],
  ['duplicate cases', p => { p.campaigns[0].caseIds[1] = 'case-0'; }],
  ['empty population', p => { p.campaigns[0].expectedCases = 0; p.campaigns[0].caseIds = []; }],
  ['unrecognized field', p => { p.campaigns[0].skip = true; }],
  ['private locator', p => { p.campaigns[0].sourceChanges = ['/Users/example/private']; }],
  ['missing deterministic gates', p => { p.campaigns[0].deterministicChecks = []; }]
]) test('trusted-input admission: ' + name, () => { const p = packet(); change(p); assert.throws(() => predict(p)); });
test('preview is detached from frozen source input and ledger', () => {
  const p = packet(), records = [], before = copy(p); preview(p, p.campaigns[0].id, records, bundle, now);
  assert.deepEqual(p, before); assert.deepEqual(records, []);
});
for (const adjudication of ['pending', 'complete']) test('actual CLI preserves provenance and ledger history: ' + adjudication + ' adjudication', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'campaign-shadow-'));
  try {
    const cli = fileURLToPath(new URL('./shadow-campaign.mjs', import.meta.url)), ledger = join(temp, 'events.jsonl'), input = join(temp, 'input.json'), output = join(temp, 'outcome.json');
    const prefix = '{"event":"historical-fixture","prototypeCases":91}\n'; await writeFile(ledger, prefix);
    const p = packet(); p.approval.bundleSha256 = (await bundleIdentity()).sha256; p.approval.reviewedAt = '2020-01-01T00:00:00.000Z'; await writeFile(input, JSON.stringify(p));
    const run = (...args) => spawnSync(process.execPath, [cli, ...args, '--ledger', ledger], { encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
    const plan = run('plan', input, 'fixture-campaign'); assert.equal(plan.status, 0, plan.stderr); assert.equal(await readFile(ledger, 'utf8'), prefix);
    const result = run('predict', input, 'fixture-campaign'); assert.equal(result.status, 0, result.stderr);
    const pred = JSON.parse(result.stdout), saved = await readFile(ledger, 'utf8'); assert(saved.startsWith(prefix)); assert.equal(pred.standing, 'prospective-shadow');
    assert.equal(run('predict', input, 'fixture-campaign').status, 1); assert.equal(await readFile(ledger, 'utf8'), saved);
    const o = observation(pred);
    o.adjudication = { status: adjudication, reviewer: adjudication === 'complete' ? 'independent-adjudicator' : null };
    o.startedAt = new Date().toISOString(); o.endedAt = o.startedAt; await writeFile(output, JSON.stringify(o));
    const changedLedger = join(temp, 'changed-bundle.jsonl'), earlier = copy(pred);
    earlier.bundleSha256 = '0'.repeat(64); earlier.approval.bundleSha256 = earlier.bundleSha256;
    const earlierBytes = prefix + JSON.stringify(earlier) + '\n'; await writeFile(changedLedger, earlierBytes);
    const rejected = spawnSync(process.execPath, [cli, 'observe', output, '--ledger', changedLedger], { encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
    assert.equal(rejected.status, 1); assert.match(rejected.stderr, /reviewed bundle/u);
    assert.equal(await readFile(changedLedger, 'utf8'), earlierBytes, 'A changed bundle leaves the ledger byte-identical');
    const finish = run('observe', output); assert.equal(finish.status, 0, finish.stderr);
    const finished = JSON.parse(finish.stdout), after = await readFile(ledger, 'utf8');
    assert(after.startsWith(saved), 'Existing ledger bytes remain unchanged');
    assert.deepEqual(JSON.parse(after.trimEnd().split('\n').at(-1)), finished.record);
    assert.equal(finished.record.standing, 'parent-supplied-observation');
    assert.deepEqual(finished.record.observation.adjudication, o.adjudication);
    assert.equal(finished.record.outcome.value, adjudication === 'complete' ? 0 : null);
    assert.equal(finished.updatedModel.eligibleCampaigns, adjudication === 'complete' ? 1 : 0);
    assert.equal(run('observe', output).status, 1);
    await writeFile(input, 'x'.repeat(256 * 1024 + 1)); assert.equal(run('plan', input, 'fixture-campaign').status, 1);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
