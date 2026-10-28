import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { normalizeStudy, renderReportMarkdown, writeStudyReport, parseNodeRunLog } from './report.mjs';

const fixtures = ['example', 'medium', 'caps', 'near-byte'];
const tasks = ['direct', 'explicit', 'deferred', 'preview', 'import', 'rate-replacement'];
const engines = ['chromium', 'firefox', 'webkit'];
const profiles = [{ id: 'desktop', width: 1440, height: 1000 }, { id: 'narrow', width: 390, height: 844 }];
const source = '3f714dcb43770a1c2f4a85594e92e44139b1fbd5';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const factKeys = ['people', 'teams', 'work', 'practices', 'teamReferences', 'participantReferences', 'practiceReferences', 'references', 'serializedBytes'];
const factValues = [[4, 1, 1, 1, 4, 4, 1, 9, 1035], [32, 8, 64, 64, 32, 256, 128, 416, 25017], [128, 32, 256, 128, 512, 3072, 512, 4096, 120992], [128, 32, 256, 128, 512, 3072, 512, 4096, 523000]];
const cents = [120000, 7680000, 92160000, 92160000];
const at45 = [180000, 7740000, 92340000, 92340000];
const facts = Object.fromEntries(fixtures.map((name, i) => [name, Object.fromEntries(factKeys.map((key, j) => [key, factValues[i][j]]))]));
const counterKeys = ['rawEdits', 'steps', 'begins', 'queueRequests', 'scheduledRequests', 'cancelledRequests', 'pendingRequests', 'maxPendingRequests', 'previewRequests', 'previewPreparations', 'cacheHits', 'workUpdates', 'imports', 'replacements', 'acceptedCommits'];
const operations = {
  direct: { rawEdits: 3, workUpdates: 3, acceptedCommits: 3 },
  explicit: { rawEdits: 3, begins: 1, workUpdates: 1, acceptedCommits: 1 },
  deferred: { rawEdits: 3, begins: 1, queueRequests: 3, scheduledRequests: 1, maxPendingRequests: 1, workUpdates: 1, acceptedCommits: 1 },
  preview: { rawEdits: 3, begins: 2, previewRequests: 5, previewPreparations: 5, workUpdates: 1, acceptedCommits: 1 },
  import: { imports: 1, acceptedCommits: 1 },
  'rate-replacement': { replacements: 1, acceptedCommits: 1 },
};
function action(kind, iteration, fixtureIndex) {
  const apply = kind === 'apply';
  const bytes = (factValues[fixtureIndex][8] + 1) * (apply ? 2 : 1);
  const expected = iteration % 2 ? cents[fixtureIndex] : at45[fixtureIndex];
  const previous = iteration % 2 ? at45[fixtureIndex] : cents[fixtureIndex];
  const metrics = { handlerMs: apply ? 4 : 2, modelMs: apply ? 2 : 1, rawReceiverRemainderMs: apply ? 2 : 1,
    receiverRemainderMs: apply ? 2 : 1, nextFrameOpportunityMs: apply ? 6 : 4, residualClamped: false,
    previewPreparations: 1, acceptedPreparations: apply ? 1 : 0, acceptedCommits: apply ? 1 : 0, producedUtf8Bytes: bytes, domMutationRecords: 3 };
  const type = apply ? 'submit' : 'input';
  return { kind, iteration, trusted: true, ...metrics, events: [{ type, trusted: true, ...metrics }], eventCounts: { [type]: 1 },
    acceptedIdentityRetained: !apply, acceptedCents: apply ? expected : previous, previewCents: expected };
}
function matrix() {
  const protocol = { id: 'native-studio-edit-cost-01', sourceCommit: source, fixtures,
    node: { runs: 5, warmup: 50, samples: 200 }, browser: { engines, profiles, runs: 5, warmupPairs: 20, measuredPairs: 50, noOpSamples: 100 },
    budgets: { processingMedianMs: 16, processingP95Ms: 50, renderOpportunityP95Ms: 100, standing: 'prospective local engineering decision thresholds' }, publication: 'held' };
  const protocolText = JSON.stringify(protocol);
  const analysisFiles = { 'report.mjs': 'b'.repeat(64), 'report.test.mjs': 'c'.repeat(64) };
  const frozenInputs = { sourceCommit: source, runtime: { node: 'v22.23.4', playwright: '1.55.0' },
    study: { 'protocol.json': createHash('sha256').update(protocolText).digest('hex') }, fixtures: Object.fromEntries(fixtures.map(name => [name, { ...facts[name], sha256: 'a'.repeat(64) }])) };
  const freeze = { protocolId: protocol.id, epoch: 'epoch-01', inputs: frozenInputs, digest: hash(frozenInputs) };
  const review = { freezeDigest: freeze.digest, reviewer: 'Independent reviewer', decision: 'accepted' };
  const starts = Object.fromEntries(['node', 'browser'].map(kind => [kind, { sourceCommit: source, freezeDigest: freeze.digest, environment: { node: 'v22.23.4', platform: 'darwin', arch: 'arm64', logicalCpus: 12, memoryGiB: 32 } }]));
  const completes = { node: { freezeDigest: freeze.digest, runCount: 120 }, browser: { freezeDigest: freeze.digest, runCount: 120, versions: { chromium: '140.0', firefox: '142.0', webkit: '26.0' } } };
  const nodeRuns = [];
  let sequence = 0;
  for (const fixture of fixtures) for (const task of tasks) for (let round = 1; round <= 5; round += 1) {
    const counters = { ...Object.fromEntries(counterKeys.map(key => [key, 0])), ...operations[task] };
    const preparations = task === 'direct' ? 3 : task === 'preview' ? 6 : 1;
    nodeRuns.push({ sourceCommit: source, fixture, task, round, sequence: ++sequence, status: 'complete', facts: facts[fixture], warmupSamples: 50, declaredSamples: 200,
      samples: Array.from({ length: 200 }, (_, index) => ({ sample: index + 1, traceMs: index % 4, modelMs: (index % 4) / 2, ...counters, producedUtf8Bytes: facts[fixture].serializedBytes * preparations })),
      summary: { traceMs: { count: 200, min: 0, max: 3, median: 1.5, p95: 3 }, modelMs: { count: 200, min: 0, max: 1.5, median: .75, p95: 1.5 } } });
  }
  const nodeAttempts = nodeRuns.map(row => ({ ...row, status: 'running', samples: [] }));
  const browserRuns = [];
  for (const engine of engines) for (const profile of profiles) for (const [i, fixture] of fixtures.entries()) for (let run = 1; run <= 5; run += 1) {
    const afterWarmup = { cents: cents[i], revision: 20, domElements: 100, listeners: 8, pendingFrames: 0 };
    browserRuns.push({ id: `${engine}-${profile.id}-${fixture}-${run}`, sourceRevision: source, engine, profile, fixture, run, standing: 'complete', browserVersion: completes.browser.versions[engine],
      inputPolicy: 'trusted-fill-and-enter', eventAggregation: 'sum-of-owned-event-spans', renderOpportunityAggregation: 'maximum-event-delay-within-action', reducedMotion: 'reduce', locale: 'en-US', timezone: 'UTC', deviceScaleFactor: 1,
      warmupPairs: 20, measuredPairs: 50, calibration: { noOpMs: Array(100).fill(0), clockStepsMs: [.1, .2], listenersAfterMount: 8, initialDomElements: 100,
        cacheProbe: { unchangedRefreshes: 10, previewPreparations: 0, acceptedIdentityRetained: true } },
      afterWarmup, afterMeasurement: { ...afterWarmup, revision: 70 }, cleanup: { listeners: 0, pendingFrames: 0, acceptedCents: cents[i] },
      samples: Array.from({ length: 50 }, (_, iteration) => [action('input', iteration, i), action('apply', iteration, i)]).flat() });
  }
  const browserAttempts = browserRuns.map(row => ({ id: row.id, engine: row.engine, profile: row.profile.id, fixture: row.fixture, run: row.run, standing: 'started', sourceRevision: source }));
  const browserSmokes = engines.flatMap(engine => profiles.map(profile => ({ engine, profile: profile.id, standing: 'complete', trustedInput: true, trustedSubmit: true, pointerApply: true, cancelFocus: true, documentScroll: true, expectedCents: 180000 })));
  return { protocol, protocolText, analysis: { files: analysisFiles, digest: hash(analysisFiles) }, freeze, review, starts, completes, nodeRuns, browserRuns, nodeAttempts, browserAttempts, browserSmokes,
    nodeCalibration: { clock: 'performance.now', clockPairs: 10000, smallestObservedAdvancingDeltaMs: .0001, noOpSamplesMs: Array(1000).fill(0), noOpSummaryMs: { count: 1000, min: 0, max: 0, median: 0, p95: 0 } } };
}
const input = matrix();
function change(target, key, value, assertion) {
  const previous = target[key]; target[key] = value;
  try { assertion(); } finally { target[key] = previous; }
}
function rejects(target, key, value) { change(target, key, value, () => assert.throws(() => normalizeStudy(input))); }

test('the full synthetic matrix produces five run vectors, independent ranges, and preserved zeros', () => {
  const report = normalizeStudy(input);
  assert.equal(report.node.cells, 120); assert.equal(report.browser.cells, 120);
  assert.equal(report.node.groups.length, 24); assert.equal(report.browser.groups.length, 24);
  const group = report.node.groups[0];
  assert.equal(group.runs.length, 5);
  assert.deepEqual(group.runs[0].metrics.traceMs, { count: 200, min: 0, max: 3, median: 1.5, p95: 3, zeros: 50 });
  assert.deepEqual(group.rangesAcrossRuns.traceMs.p95, { min: 3, max: 3, median: 3 });
  assert.equal(report.browser.groups[0].actions.input.runs[0].metrics.handlerMs.count, 50);
  assert.equal(report.browser.groups[0].calibration[0].noOpDispatchMs.zeros, 100);
  assert.equal(report.node.calibration.noOpTimerPairMs.zeros, 1000);
  assert.equal(report.environment.operatingSystem, 'macOS');
  assert.equal(report.environment.logicalCpus, 12);
  assert.equal(report.decisionThresholds.processingP95Ms, 50);
  assert.match(report.analysis.digest, /^[a-f0-9]{64}$/u);
  assert.equal(report.browser.groups[0].resources.listenersAfterDispose, 0);
  const markdown = renderReportMarkdown(report);
  assert.ok(markdown.includes('source') && markdown.includes('Publication remains held.'));
  assert.equal(markdown.split('\n').filter(line => line.startsWith('| example |')).length, 6);
});

test('allowlisting excludes unknown raw, host, error, text, and reviewer fields', () => {
  const marker = 'PRIVATE-CANARY';
  const additions = [input, input.freeze, input.review, input.starts.node, input.completes.node, input.nodeRuns[0], input.browserRuns[0], input.browserRuns[0].samples[0], input.browserRuns[0].afterMeasurement, input.starts.node.environment, input.starts.browser.environment];
  for (const value of additions) value.extra = marker;
  for (const kind of ['node', 'browser']) Object.assign(input.starts[kind].environment, { cpuModel: marker, background: marker });
  try {
    const text = JSON.stringify(normalizeStudy(input));
    assert.ok(!text.includes(marker)); assert.ok(!text.includes('Independent reviewer'));
    assert.ok(!text.includes('noOpSamplesMs') && !text.includes('samples"'));
  } finally {
    for (const value of additions) delete value.extra;
    for (const kind of ['node', 'browser']) { delete input.starts[kind].environment.cpuModel; delete input.starts[kind].environment.background; }
  }
});

test('all missing or duplicate matrix coordinates fail admission', () => {
  for (const key of ['nodeRuns', 'browserRuns', 'nodeAttempts', 'browserAttempts', 'browserSmokes']) {
    rejects(input, key, input[key].slice(1));
    rejects(input, key, [...input[key].slice(1), input[key][1]]);
  }
});

test('incomplete cells and outer completion receipts fail admission', () => {
  rejects(input.nodeRuns[0], 'status', 'incomplete');
  rejects(input.browserRuns[0], 'standing', 'incomplete');
  rejects(input.browserSmokes[0], 'standing', 'incomplete');
  rejects(input.completes.node, 'runCount', 119);
  rejects(input.completes.browser, 'freezeDigest', 'b'.repeat(64));
  rejects(input.review, 'decision', 'pending');
  rejects(input.review, 'freezeDigest', 'b'.repeat(64));
});

test('source identity, freeze integrity, attempt identity and fixture counts remain bound', () => {
  rejects(input.nodeRuns[0], 'sourceCommit', 'a'.repeat(40));
  rejects(input.browserRuns[0], 'sourceRevision', 'a'.repeat(40));
  rejects(input.nodeAttempts[0], 'sequence', 120);
  rejects(input.browserAttempts[0], 'sourceRevision', 'a'.repeat(40));
  rejects(input.freeze, 'digest', 'b'.repeat(64));
  rejects(input.nodeRuns[0], 'facts', { ...facts.example, references: 8 });
});

test('sample omissions, order changes, and altered declared populations fail admission', () => {
  rejects(input.nodeRuns[0], 'samples', input.nodeRuns[0].samples.slice(1));
  rejects(input.browserRuns[0], 'samples', input.browserRuns[0].samples.slice(2));
  rejects(input.nodeRuns[0].samples[0], 'sample', 2);
  rejects(input.browserRuns[0].samples[0], 'iteration', 1);
  rejects(input.nodeRuns[0], 'warmupSamples', 49);
  rejects(input.browserRuns[0], 'measuredPairs', 49);
});

test('negative and nonfinite measurements are rejected while zeros survive', () => {
  for (const value of [-1, NaN, Infinity]) {
    rejects(input.nodeRuns[0].samples[1], 'traceMs', value);
    rejects(input.browserRuns[0].samples[0].events[0], 'modelMs', value);
  }
  rejects(input.nodeRuns[0].samples[1], 'modelMs', 2);
  rejects(input.nodeRuns[0].summary.traceMs, 'p95', 2);
});

test('operation, byte, accounting and accepted-state inconsistencies fail admission', () => {
  rejects(input.nodeRuns[0].samples[0], 'acceptedCommits', 2);
  rejects(input.nodeRuns[0].samples[0], 'pendingRequests', 1);
  rejects(input.nodeRuns[0].samples[0], 'producedUtf8Bytes', 1);
  rejects(input.browserRuns[0].samples[0], 'acceptedIdentityRetained', false);
  rejects(input.browserRuns[0].samples[0], 'previewCents', 1);
  rejects(input.browserRuns[0].samples[1], 'acceptedCents', 1);
  rejects(input.browserRuns[0].afterMeasurement, 'revision', 69);
});

test('event-level evidence distinguishes inconsistent action sums and residuals', () => {
  rejects(input.browserRuns[0].samples[0], 'handlerMs', 3);
  rejects(input.browserRuns[0].samples[0], 'eventCounts', { input: 2 });
  rejects(input.browserRuns[0].samples[0].events[0], 'trusted', false);
  rejects(input.browserRuns[0].samples[0].events[0], 'rawReceiverRemainderMs', 2);
  rejects(input.browserRuns[0].samples[0].events[0], 'nextFrameOpportunityMs', 1);
  rejects(input.browserRuns[0].samples[0].events[0], 'residualClamped', true);
});

test('quantized negative raw residuals remain explicit with correctly clamped summaries', () => {
  const sample = input.browserRuns[0].samples[0];
  const replacement = structuredClone(sample);
  replacement.modelMs = 2.1; replacement.rawReceiverRemainderMs = -.1; replacement.receiverRemainderMs = 0; replacement.residualClamped = true;
  Object.assign(replacement.events[0], { modelMs: 2.1, rawReceiverRemainderMs: -.1, receiverRemainderMs: 0, residualClamped: true });
  change(input.browserRuns[0].samples, 0, replacement, () => {
    const result = normalizeStudy(input);
    assert.equal(result.browser.groups[0].actions.input.runs[0].residualClampedActions, 1);
  });
});

test('cache, DOM stability, resource ownership and calibration inconsistencies fail admission', () => {
  rejects(input.browserRuns[0].calibration.cacheProbe, 'previewPreparations', 1);
  rejects(input.browserRuns[0].afterMeasurement, 'domElements', 101);
  rejects(input.browserRuns[0].cleanup, 'listeners', 1);
  rejects(input.browserRuns[0].cleanup, 'pendingFrames', 1);
  rejects(input.browserRuns[0].calibration, 'noOpMs', [0]);
  rejects(input.browserRuns[0].calibration, 'clockStepsMs', [0]);
  rejects(input.nodeCalibration, 'smallestObservedAdvancingDeltaMs', 0);
});

test('the file writer creates no output for an unfinished epoch', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'native-studio-report-'));
  try {
    await mkdir(resolve(directory, 'input', 'node'), { recursive: true });
    await mkdir(resolve(directory, 'input', 'browser'), { recursive: true });
    await writeFile(resolve(directory, 'input', 'freeze.json'), '{}');
    await assert.rejects(writeStudyReport({ inputDirectory: resolve(directory, 'input'), outputDirectory: resolve(directory, 'output'), protocol: input.protocol }));
    assert.ok(!(await readdir(directory)).includes('output'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test('frozen protocol bytes, declared budgets, analysis and environment identity remain bound', () => {
  rejects(input, 'protocolText', input.protocolText + ' ');
  rejects(input.protocol.budgets, 'processingP95Ms', 51);
  rejects(input.analysis, 'digest', 'd'.repeat(64));
  rejects(input.starts.node.environment, 'platform', 'unknown-host');
  rejects(input.starts.node.environment, 'logicalCpus', 0);
  rejects(input.starts.browser.environment, 'memoryGiB', 64);
});

test('the checkpoint reader accepts complete logs and rejects truncated or inconsistent sequences', () => {
  const record = input.nodeRuns[0];
  const { samples, summary, ...start } = record;
  const rows = [{ type: 'start', ...start, status: 'running', samples: [] }, ...samples.map(sample => ({ type: 'sample', ...sample })), { type: 'complete', status: 'complete', summary }];
  const text = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
  assert.deepEqual(parseNodeRunLog(text), record);
  assert.throws(() => parseNodeRunLog(text.slice(0, -1)));
  assert.throws(() => parseNodeRunLog(rows.slice(0, -1).map(row => JSON.stringify(row)).join('\n') + '\n'));
  assert.throws(() => parseNodeRunLog(text.replace('"type":"complete"', '"type":"incomplete"')));
  assert.throws(() => parseNodeRunLog(text.replace('"sample":1,', '"sample":2,')));
  assert.throws(() => parseNodeRunLog('invalid JSON\n'));
});

test('composed input sums all owned event spans and takes their maximum frame opportunity', () => {
  const original = input.browserRuns[0].samples[0];
  const event = (type, handlerMs, modelMs, nextFrameOpportunityMs, preparations, bytes, mutations) => ({
    type, trusted: true, handlerMs, modelMs, nextFrameOpportunityMs,
    rawReceiverRemainderMs: handlerMs - modelMs, receiverRemainderMs: handlerMs - modelMs, residualClamped: false,
    previewPreparations: preparations, acceptedPreparations: 0, acceptedCommits: 0,
    producedUtf8Bytes: bytes, domMutationRecords: mutations,
  });
  const replacement = {
    ...original, handlerMs: 1.75, modelMs: .6, rawReceiverRemainderMs: 1.15, receiverRemainderMs: 1.15,
    nextFrameOpportunityMs: 4, eventCounts: { compositionstart: 1, compositionend: 1, input: 1 },
    events: [event('compositionstart', .5, 0, 1, 0, 0, 0), event('compositionend', 1, .6, 4, 1, 1036, 2), event('input', .25, 0, 2, 0, 0, 1)],
  };
  change(input.browserRuns[0].samples, 0, replacement, () => {
    const action = normalizeStudy(input).browser.groups[0].actions.input;
    assert.equal(action.runs[0].metrics.handlerMs.min, 1.75);
    assert.equal(action.runs[0].metrics.modelMs.min, .6);
    assert.equal(action.runs[0].metrics.nextFrameOpportunityMs.max, 4);
    assert.equal(action.operationsPerAction.previewPreparations, 1);
    assert.deepEqual(action.runs[0].eventCounts, { compositionstart: 1, compositionend: 1, input: 50 });
  });
});
