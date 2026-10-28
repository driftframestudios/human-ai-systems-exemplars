import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stats, POLICIES, BOUNDARY_TASKS } from './core.mjs';

const FIXTURES = ['example', 'medium', 'caps', 'near-byte'];
const TASKS = [...POLICIES, ...BOUNDARY_TASKS];
const ENGINES = ['chromium', 'firefox', 'webkit'];
const PROFILES = [{ id: 'desktop', width: 1440, height: 1000 }, { id: 'narrow', width: 390, height: 844 }];
const FACT_KEYS = ['people', 'teams', 'work', 'practices', 'teamReferences', 'participantReferences', 'practiceReferences', 'references', 'serializedBytes'];
const FIXTURE_FACTS = [
  [4, 1, 1, 1, 4, 4, 1, 9, 1035],
  [32, 8, 64, 64, 32, 256, 128, 416, 25017],
  [128, 32, 256, 128, 512, 3072, 512, 4096, 120992],
  [128, 32, 256, 128, 512, 3072, 512, 4096, 523000],
];
const BASE_CENTS = [120000, 7680000, 92160000, 92160000];
const TARGET_PEOPLE = [4, 4, 12, 12];
const COUNTERS = ['rawEdits', 'steps', 'begins', 'queueRequests', 'scheduledRequests', 'cancelledRequests', 'pendingRequests', 'maxPendingRequests', 'previewRequests', 'previewPreparations', 'cacheHits', 'workUpdates', 'imports', 'replacements', 'acceptedCommits'];
const ACTION_COUNTERS = ['previewPreparations', 'acceptedPreparations', 'acceptedCommits'];
const BROWSER_METRICS = ['handlerMs', 'modelMs', 'receiverRemainderMs', 'nextFrameOpportunityMs'];
const digestText = value => createHash('sha256').update(value).digest('hex');
const digest = value => digestText(JSON.stringify(value));
const same = (actual, expected, message) => assert.deepEqual(actual, expected, message);
const pick = (value, keys) => Object.fromEntries(keys.map(key => [key, value?.[key]]));
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
function natural(value, message) { assert.ok(Number.isSafeInteger(value) && value >= 0, message); }
function time(value) { assert.ok(Number.isFinite(value) && value >= 0, 'Timing observations are finite and nonnegative.'); }
function near(actual, expected) { assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= Math.max(1e-9, Math.abs(expected) * 1e-12), 'Derived timing matches its event observations.'); }
function summary(values) { return { ...stats(values), zeros: values.filter(value => value === 0).length }; }
function range(values) { return { min: Math.min(...values), max: Math.max(...values) }; }
function expectedFacts(id) { return Object.fromEntries(FACT_KEYS.map((key, index) => [key, FIXTURE_FACTS[FIXTURES.indexOf(id)][index]])); }
function expectedCents(id, minutes) { const i = FIXTURES.indexOf(id); return BASE_CENTS[i] + (minutes - 30) * TARGET_PEOPLE[i] * 1000; }
function uniqueMatrix(rows, keys, expected) {
  assert.ok(Array.isArray(rows));
  const coordinates = rows.map(row => keys.map(key => row[key]).join('|'));
  assert.equal(new Set(coordinates).size, coordinates.length, 'Every declared coordinate occurs once.');
  same([...coordinates].sort(), [...expected].sort(), 'The complete declared matrix is present.');
}
function nodeOperations(task) {
  const result = Object.fromEntries(COUNTERS.map(key => [key, 0]));
  result.acceptedCommits = task === 'direct' ? 3 : 1;
  if (POLICIES.includes(task)) {
    result.rawEdits = 3;
    result.workUpdates = task === 'direct' ? 3 : 1;
    result.begins = task === 'direct' ? 0 : task === 'preview' ? 2 : 1;
  }
  if (task === 'preview') result.previewRequests = result.previewPreparations = 5;
  if (task === 'deferred') {
    result.queueRequests = 3;
    result.scheduledRequests = result.maxPendingRequests = 1;
  }
  if (task === 'import') result.imports = 1;
  if (task === 'rate-replacement') result.replacements = 1;
  return result;
}
function rangesAcrossRuns(runs, metricKeys) {
  return Object.fromEntries(metricKeys.map(key => [key, Object.fromEntries(['median', 'p95', 'min', 'max', 'zeros'].map(statistic => [statistic, { ...range(runs.map(run => run.metrics[key][statistic])), median: stats(runs.map(run => run.metrics[key][statistic])).median }]))]));
}
function validateProvenance(input) {
  const { protocol, freeze, review, starts, completes } = input;
  same(protocol.id, 'native-studio-edit-cost-01');
  assert.match(protocol.sourceCommit, /^[a-f0-9]{40}$/u);
  same(protocol.fixtures, FIXTURES);
  same(protocol.budgets, { processingMedianMs: 16, processingP95Ms: 50, renderOpportunityP95Ms: 100, standing: 'prospective local engineering decision thresholds' });
  same(protocol.publication, 'held');
  same(JSON.parse(input.protocolText), protocol, 'The supplied protocol matches its retained bytes.');
  same(digestText(input.protocolText), freeze.inputs.study['protocol.json'], 'Decision thresholds retain their frozen protocol identity.');
  const analysisFiles = input.analysis.files;
  same(Object.keys(analysisFiles).sort(), ['report.mjs', 'report.test.mjs']);
  for (const value of Object.values(analysisFiles)) assert.match(value, /^[a-f0-9]{64}$/u);
  same(input.analysis.digest, digest(analysisFiles));
  same(protocol.node, { runs: 5, warmup: 50, samples: 200 });
  same(protocol.browser, { engines: ENGINES, profiles: PROFILES, runs: 5, warmupPairs: 20, measuredPairs: 50, noOpSamples: 100 });
  same(freeze.protocolId, protocol.id);
  assert.match(freeze.epoch, /^epoch-\d{2}$/u);
  same(freeze.inputs.sourceCommit, protocol.sourceCommit);
  assert.match(freeze.digest, /^[a-f0-9]{64}$/u);
  same(freeze.digest, digest(freeze.inputs), 'The retained freeze matches its input record.');
  same(review.freezeDigest, freeze.digest);
  same(review.decision, 'accepted');
  assert.ok(typeof review.reviewer === 'string' && review.reviewer.trim().length > 0, 'The freeze has an independent review record.');
  same(Object.keys(freeze.inputs.fixtures).sort(), [...FIXTURES].sort());
  for (const id of FIXTURES) {
    same(pick(freeze.inputs.fixtures[id], FACT_KEYS), expectedFacts(id));
    assert.match(freeze.inputs.fixtures[id].sha256, /^[a-f0-9]{64}$/u);
  }
  assert.match(freeze.inputs.runtime.node, /^v\d+\.\d+\.\d+$/u);
  assert.match(freeze.inputs.runtime.playwright, /^\d+\.\d+\.\d+$/u);
  for (const kind of ['node', 'browser']) {
    same(starts[kind].sourceCommit, protocol.sourceCommit);
    same(starts[kind].freezeDigest, freeze.digest);
    same(completes[kind].freezeDigest, freeze.digest);
    same(completes[kind].runCount, 120);
    const environment = starts[kind].environment;
    same(environment.node, freeze.inputs.runtime.node);
    assert.ok(['darwin', 'linux', 'win32'].includes(environment.platform));
    assert.ok(['arm64', 'x64'].includes(environment.arch));
    natural(environment.logicalCpus); assert.ok(environment.logicalCpus > 0);
    natural(environment.memoryGiB); assert.ok(environment.memoryGiB > 0);
  }
  same(pick(starts.node.environment, ['node', 'platform', 'arch', 'logicalCpus', 'memoryGiB']), pick(starts.browser.environment, ['node', 'platform', 'arch', 'logicalCpus', 'memoryGiB']));
}
function validateNode(rows, attempts, protocol) {
  const matrix = FIXTURES.flatMap(fixture => TASKS.flatMap(task => Array.from({ length: 5 }, (_, index) => `${fixture}|${task}|${index + 1}`)));
  uniqueMatrix(rows, ['fixture', 'task', 'round'], matrix);
  uniqueMatrix(attempts, ['fixture', 'task', 'round'], matrix);
  same(rows.map(row => row.sequence).sort((a, b) => a - b), Array.from({ length: 120 }, (_, i) => i + 1));
  const starts = new Map(attempts.map(row => [`${row.fixture}|${row.task}|${row.round}`, row]));
  for (const row of rows) {
    same(row.status, 'complete');
    same(row.sourceCommit, protocol.sourceCommit);
    same(row.facts, expectedFacts(row.fixture));
    same(row.warmupSamples, 50); same(row.declaredSamples, 200); same(row.samples.length, 200);
    const start = starts.get(`${row.fixture}|${row.task}|${row.round}`);
    same(start.sourceCommit, protocol.sourceCommit); same(start.status, 'running'); same(start.sequence, row.sequence);
    same(start.samples, []);
    same(start.facts, row.facts); same(start.warmupSamples, 50); same(start.declaredSamples, 200);
    const operations = nodeOperations(row.task);
    const preparations = operations.previewPreparations + operations.workUpdates + operations.imports + operations.replacements;
    for (const [index, sample] of row.samples.entries()) {
      same(sample.sample, index + 1);
      time(sample.traceMs); time(sample.modelMs);
      assert.ok(sample.modelMs <= sample.traceMs + 1e-9, 'The model span stays within the complete trace.');
      same(pick(sample, COUNTERS), operations);
      same(sample.producedUtf8Bytes, row.facts.serializedBytes * preparations);
    }
    for (const key of ['traceMs', 'modelMs']) same(row.summary[key], stats(row.samples.map(sample => sample[key])));
  }
}
function validateEvent(event) {
  assert.ok(['input', 'compositionstart', 'compositionend', 'submit'].includes(event.type));
  same(event.trusted, true);
  for (const key of BROWSER_METRICS) time(event[key]);
  for (const key of [...ACTION_COUNTERS, 'producedUtf8Bytes', 'domMutationRecords']) natural(event[key]);
  near(event.rawReceiverRemainderMs, event.handlerMs - event.modelMs);
  same(event.residualClamped, event.rawReceiverRemainderMs < 0);
  near(event.receiverRemainderMs, Math.max(0, event.rawReceiverRemainderMs));
  assert.ok(event.nextFrameOpportunityMs + 1e-9 >= event.handlerMs, 'The frame opportunity follows its event handler.');
}
function validateAction(sample, fixture, index, kind, previousCents) {
  same(sample.kind, kind); same(sample.iteration, index); same(sample.trusted, true);
  same(sample.acceptedIdentityRetained, kind === 'input');
  const expected = expectedCents(fixture, index % 2 ? 30 : 45);
  same(sample.acceptedCents, kind === 'input' ? previousCents : expected);
  same(sample.previewCents, expected);
  same(pick(sample, ACTION_COUNTERS), { previewPreparations: 1, acceptedPreparations: kind === 'apply' ? 1 : 0, acceptedCommits: kind === 'apply' ? 1 : 0 });
  assert.ok(Array.isArray(sample.events) && sample.events.length >= 1 && sample.events.length <= 16);
  const counts = {};
  for (const event of sample.events) {
    validateEvent(event);
    assert.ok(kind === 'apply' ? event.type === 'submit' : event.type !== 'submit');
    counts[event.type] = (counts[event.type] ?? 0) + 1;
  }
  same(sample.eventCounts, counts);
  for (const key of [...BROWSER_METRICS.slice(0, 3), ...ACTION_COUNTERS, 'producedUtf8Bytes', 'domMutationRecords']) near(sample[key], sum(sample.events, key));
  near(sample.rawReceiverRemainderMs, sum(sample.events, 'rawReceiverRemainderMs'));
  same(sample.residualClamped, sample.events.some(event => event.residualClamped));
  near(sample.nextFrameOpportunityMs, Math.max(...sample.events.map(event => event.nextFrameOpportunityMs)));
  for (const key of BROWSER_METRICS) time(sample[key]);
  for (const key of ['producedUtf8Bytes', 'domMutationRecords']) natural(sample[key]);
  const bytes = expectedFacts(fixture).serializedBytes;
  const preparations = kind === 'apply' ? 2 : 1;
  assert.ok(sample.producedUtf8Bytes >= bytes * preparations && sample.producedUtf8Bytes <= (bytes + 2) * preparations, 'Only accepted revision digits change the bounded serialized size.');
}
function validateBrowser(rows, attempts, smokes, protocol) {
  const matrix = ENGINES.flatMap(engine => PROFILES.flatMap(profile => FIXTURES.flatMap(fixture => Array.from({ length: 5 }, (_, index) => `${engine}|${profile.id}|${fixture}|${index + 1}`))));
  uniqueMatrix(rows.map(row => ({ ...row, profile: row.profile.id })), ['engine', 'profile', 'fixture', 'run'], matrix);
  uniqueMatrix(attempts, ['engine', 'profile', 'fixture', 'run'], matrix);
  uniqueMatrix(smokes, ['engine', 'profile'], ENGINES.flatMap(engine => PROFILES.map(profile => `${engine}|${profile.id}`)));
  for (const smoke of smokes) {
    same(smoke.standing, 'complete');
    for (const key of ['trustedInput', 'trustedSubmit', 'pointerApply', 'cancelFocus', 'documentScroll']) same(smoke[key], true);
    same(smoke.expectedCents, 180000);
  }
  const starts = new Map(attempts.map(row => [row.id, row]));
  for (const row of rows) {
    same(row.id, `${row.engine}-${row.profile.id}-${row.fixture}-${row.run}`);
    same(row.profile, PROFILES.find(profile => profile.id === row.profile.id));
    same(row.standing, 'complete'); same(row.sourceRevision, protocol.sourceCommit);
    const start = starts.get(row.id);
    same(pick(start, ['id', 'engine', 'fixture', 'run', 'sourceRevision']), pick(row, ['id', 'engine', 'fixture', 'run', 'sourceRevision']));
    same(start.profile, row.profile.id); same(start.standing, 'started');
    assert.match(row.browserVersion, /^\d+(?:\.\d+){0,4}$/u);
    same(row.inputPolicy, 'trusted-fill-and-enter'); same(row.eventAggregation, 'sum-of-owned-event-spans');
    same(row.renderOpportunityAggregation, 'maximum-event-delay-within-action');
    same(row.reducedMotion, 'reduce'); same(row.locale, 'en-US'); same(row.timezone, 'UTC'); same(row.deviceScaleFactor, 1);
    same(row.warmupPairs, 20); same(row.measuredPairs, 50); same(row.samples.length, 100);
    const calibration = row.calibration;
    same(calibration.noOpMs.length, 100); calibration.noOpMs.forEach(time);
    assert.ok(Array.isArray(calibration.clockStepsMs) && calibration.clockStepsMs.length <= 1000);
    calibration.clockStepsMs.forEach(value => { time(value); assert.ok(value > 0); });
    same(calibration.listenersAfterMount, 8);
    same(calibration.cacheProbe, { unchangedRefreshes: 10, previewPreparations: 0, acceptedIdentityRetained: true });
    natural(calibration.initialDomElements); assert.ok(calibration.initialDomElements > 0);
    for (const state of [row.afterWarmup, row.afterMeasurement]) {
      same(state.cents, expectedCents(row.fixture, 30)); same(state.listeners, 8); same(state.pendingFrames, 0);
      natural(state.domElements); assert.ok(state.domElements > 0);
    }
    same(row.afterWarmup.revision, 20); same(row.afterMeasurement.revision, 70);
    same(row.afterWarmup.domElements, row.afterMeasurement.domElements);
    same(pick(row.cleanup, ['listeners', 'pendingFrames', 'acceptedCents']), { listeners: 0, pendingFrames: 0, acceptedCents: expectedCents(row.fixture, 30) });
    let previousCents = expectedCents(row.fixture, 30);
    for (let index = 0; index < 50; index += 1) {
      validateAction(row.samples[index * 2], row.fixture, index, 'input', previousCents);
      validateAction(row.samples[index * 2 + 1], row.fixture, index, 'apply', previousCents);
      previousCents = expectedCents(row.fixture, index % 2 ? 30 : 45);
    }
  }
  for (const engine of ENGINES) same(new Set(rows.filter(row => row.engine === engine).map(row => row.browserVersion)).size, 1);
}
function nodeGroups(rows) {
  return FIXTURES.flatMap(fixture => TASKS.map(task => {
    const runs = rows.filter(row => row.fixture === fixture && row.task === task).sort((a, b) => a.round - b.round).map(row => ({
      run: row.round,
      metrics: Object.fromEntries(['traceMs', 'modelMs'].map(key => [key, summary(row.samples.map(sample => sample[key]))])),
      producedUtf8Bytes: range(row.samples.map(sample => sample.producedUtf8Bytes)),
    }));
    return { fixture, task, operationsPerSample: nodeOperations(task), runs, rangesAcrossRuns: rangesAcrossRuns(runs, ['traceMs', 'modelMs']) };
  }));
}
function browserGroups(rows) {
  return ENGINES.flatMap(engine => PROFILES.flatMap(profile => FIXTURES.map(fixture => {
    const cells = rows.filter(row => row.engine === engine && row.profile.id === profile.id && row.fixture === fixture).sort((a, b) => a.run - b.run);
    const actions = Object.fromEntries(['input', 'apply'].map(kind => {
      const runs = cells.map(row => {
        const samples = row.samples.filter(sample => sample.kind === kind);
        const eventCounts = {};
        for (const sample of samples) for (const [type, count] of Object.entries(sample.eventCounts)) eventCounts[type] = (eventCounts[type] ?? 0) + count;
        return { run: row.run, metrics: Object.fromEntries(BROWSER_METRICS.map(key => [key, summary(samples.map(sample => sample[key]))])),
          producedUtf8Bytes: range(samples.map(sample => sample.producedUtf8Bytes)), domMutationRecords: range(samples.map(sample => sample.domMutationRecords)),
          residualClampedActions: samples.filter(sample => sample.residualClamped).length, eventCounts };
      });
      return [kind, { operationsPerAction: { previewPreparations: 1, acceptedPreparations: kind === 'apply' ? 1 : 0, acceptedCommits: kind === 'apply' ? 1 : 0 },
        runs, rangesAcrossRuns: rangesAcrossRuns(runs, BROWSER_METRICS) }];
    }));
    return { engine, profile: profile.id, fixture, actions,
      calibration: cells.map(row => ({ run: row.run, noOpDispatchMs: summary(row.calibration.noOpMs),
        smallestObservedAdvancingDeltaMs: row.calibration.clockStepsMs.length ? Math.min(...row.calibration.clockStepsMs) : null })),
      resources: { listenersDuringMeasurement: 8, listenersAfterDispose: 0, pendingFramesAfterDispose: 0,
        unchangedRefreshes: 10, preparationsForUnchangedRefreshes: 0, domElementsAfterWarmup: range(cells.map(row => row.afterWarmup.domElements)), stableDomDuringMeasurement: true } };
  })));
}

/** Validate the whole retained epoch, then construct a public aggregate by allowlist. */
export function normalizeStudy(input) {
  validateProvenance(input);
  const { protocol, freeze, nodeRuns, browserRuns, nodeCalibration } = input;
  validateNode(nodeRuns, input.nodeAttempts, protocol);
  validateBrowser(browserRuns, input.browserAttempts, input.browserSmokes, protocol);
  same(nodeCalibration.clock, 'performance.now'); same(nodeCalibration.clockPairs, 10000);
  same(nodeCalibration.noOpSamplesMs.length, 1000); nodeCalibration.noOpSamplesMs.forEach(time);
  if (nodeCalibration.smallestObservedAdvancingDeltaMs !== null) { time(nodeCalibration.smallestObservedAdvancingDeltaMs); assert.ok(nodeCalibration.smallestObservedAdvancingDeltaMs > 0); }
  same(nodeCalibration.noOpSummaryMs, stats(nodeCalibration.noOpSamplesMs));
  const browserVersions = Object.fromEntries(ENGINES.map(engine => [engine, browserRuns.find(row => row.engine === engine).browserVersion]));
  same(input.completes.browser.versions, browserVersions);
  return {
    schemaVersion: 1, study: protocol.id, issue: 641, epoch: freeze.epoch, sourceCommit: protocol.sourceCommit, freezeDigest: freeze.digest,
    review: 'accepted', publication: 'held', analysis: { files: { ...input.analysis.files }, digest: input.analysis.digest },
    protocolSha256: freeze.inputs.study['protocol.json'],
    decisionThresholds: { ...protocol.budgets },
    environment: { operatingSystem: { darwin: 'macOS', linux: 'Linux', win32: 'Windows' }[input.starts.node.environment.platform],
      architecture: input.starts.node.environment.arch, logicalCpus: input.starts.node.environment.logicalCpus, memoryGiB: input.starts.node.environment.memoryGiB,
      node: freeze.inputs.runtime.node, playwright: freeze.inputs.runtime.playwright, background: 'ordinary desktop services; sequential study jobs',
      cache: 'OS caches warm and uncontrolled; fresh browser contexts', cpuThrottle: 'none', networkThrottle: 'none',
      locale: 'en-US', timezone: 'UTC', reducedMotion: 'reduce', deviceScaleFactor: 1 },
    interpretation: { observation: 'Instrumented local source traces and trusted browser edit/Apply actions.',
      percentiles: 'Each percentile describes one run. Five run summaries and their ranges remain separate.',
      clocks: 'Values retain measured timer overhead and zero observations. Frame opportunity measures callback opportunity rather than painted pixels.',
      residual: 'Receiver remainder is handler time less wrapped model spans, clamped per event; it includes instrumentation and other receiver work.',
      transfer: 'These synthetic fixtures describe the pinned implementation on one local environment.' },
    fixtures: Object.fromEntries(FIXTURES.map(id => [id, { ...expectedFacts(id), sha256: freeze.inputs.fixtures[id].sha256 }])),
    node: { cells: nodeRuns.length, samplesPerCell: 200, warmupPerCell: 50,
      calibration: { clock: 'performance.now', smallestObservedAdvancingDeltaMs: nodeCalibration.smallestObservedAdvancingDeltaMs,
        noOpTimerPairMs: summary(nodeCalibration.noOpSamplesMs) }, groups: nodeGroups(nodeRuns) },
    browser: { cells: browserRuns.length, versions: browserVersions, profiles: PROFILES.map(profile => ({ ...profile })), samplesPerActionPerCell: 50,
      warmupPairsPerCell: 20, smokeCells: 6, groups: browserGroups(browserRuns) },
  };
}

export function renderReportMarkdown(report) {
  const ms = value => Number(value).toFixed(3);
  const interval = value => `${ms(value.median)} (${ms(value.min)}–${ms(value.max)})`;
  const lines = ['# Native Studio edit-cost measurements', '', `Accepted source: \`${report.sourceCommit}\`. Epoch: \`${report.epoch}\`.`, '',
    'Each entry gives the median of five separate run statistics, followed by their full range. Values are milliseconds; all per-run summaries remain in results.json.', '',
    '| Fixture | Source task | Median trace | p95 trace |', '| --- | --- | ---: | ---: |'];
  for (const group of report.node.groups) lines.push(`| ${group.fixture} | ${group.task} | ${interval(group.rangesAcrossRuns.traceMs.median)} | ${interval(group.rangesAcrossRuns.traceMs.p95)} |`);
  lines.push('', '| Engine | Viewport | Fixture | Action | Median handler | p95 handler | p95 frame opportunity |', '| --- | --- | --- | --- | ---: | ---: | ---: |');
  for (const group of report.browser.groups) for (const [kind, action] of Object.entries(group.actions)) lines.push(`| ${group.engine} | ${group.profile} | ${group.fixture} | ${kind} | ${interval(action.rangesAcrossRuns.handlerMs.median)} | ${interval(action.rangesAcrossRuns.handlerMs.p95)} | ${interval(action.rangesAcrossRuns.nextFrameOpportunityMs.p95)} |`);
  lines.push('', report.interpretation.clocks, '', report.interpretation.transfer, '', 'Publication remains held.', '');
  return lines.join('\n');
}

/** Read the exact checkpoint grammar; a terminal complete row closes 200 samples. */
export function parseNodeRunLog(text) {
  assert.ok(typeof text === 'string' && text.endsWith('\n'), 'The retained log ends with a complete record boundary.');
  const lines = text.slice(0, -1).split('\n').map(line => JSON.parse(line));
  same(lines.length, 202);
  const [first, ...remaining] = lines;
  const last = remaining.pop();
  same(first.type, 'start'); same(first.status, 'running'); same(first.samples, []);
  same(last.type, 'complete'); same(last.status, 'complete');
  const { type: startType, ...start } = first;
  const samples = remaining.map((row, index) => {
    same(row.type, 'sample'); same(row.sample, index + 1);
    const { type, ...sample } = row;
    return sample;
  });
  return { ...start, status: 'complete', samples, summary: last.summary };
}

/** Explicit paths; only a fully validated epoch can create aggregate output. */
export async function writeStudyReport({ inputDirectory, outputDirectory, protocol, protocolText, markdown = true }) {
  const read = async (...parts) => JSON.parse(await readFile(resolve(inputDirectory, ...parts), 'utf8'));
  const nodeNames = await readdir(resolve(inputDirectory, 'node'));
  const browserNames = await readdir(resolve(inputDirectory, 'browser'));
  const readMany = (directory, names) => Promise.all(names.map(name => read(directory, name)));
  const isFinal = name => name.endsWith('.json') && !name.endsWith('.start.json');
  const protocolBytes = protocolText ?? await readFile(new URL('./protocol.json', import.meta.url), 'utf8');
  const analysisFiles = Object.fromEntries(await Promise.all(['report.mjs', 'report.test.mjs'].map(async name => [name, digestText(await readFile(new URL(name, import.meta.url)))])));
  const input = {
    protocol, protocolText: protocolBytes, analysis: { files: analysisFiles, digest: digest(analysisFiles) }, freeze: await read('freeze.json'), review: await read('review.json'),
    starts: { node: await read('node-start.json'), browser: await read('browser-start.json') },
    completes: { node: await read('node-complete.json'), browser: await read('browser-complete.json') },
    nodeCalibration: await read('node', 'calibration.json'),
    nodeRuns: await readMany('node', nodeNames.filter(name => isFinal(name) && name !== 'calibration.json')),
    nodeAttempts: await readMany('node', nodeNames.filter(name => name.endsWith('.start.json'))),
    browserRuns: await readMany('browser', browserNames.filter(name => isFinal(name) && !name.startsWith('smoke-'))),
    browserAttempts: await readMany('browser', browserNames.filter(name => name.endsWith('.start.json'))),
    browserSmokes: await readMany('browser', browserNames.filter(name => name.startsWith('smoke-') && name.endsWith('.json'))),
  };
  const finalNames = nodeNames.filter(name => isFinal(name) && name !== 'calibration.json');
  same(nodeNames.filter(name => name.endsWith('.jsonl')).sort(), finalNames.map(name => name.replace(/\.json$/u, '.jsonl')).sort());
  for (const [index, name] of finalNames.entries()) {
    const parsed = parseNodeRunLog(await readFile(resolve(inputDirectory, 'node', name.replace(/\.json$/u, '.jsonl')), 'utf8'));
    same(parsed, input.nodeRuns[index], 'Incremental and final records describe the same completed source run.');
  }
  same(digestText(await readFile(new URL('./core.mjs', import.meta.url))), input.freeze.inputs.study['core.mjs'], 'The analysis statistics helper retains its frozen identity.');
  const result = normalizeStudy(input);
  const jsonText = `${JSON.stringify(result, null, 2)}\n`;
  const markdownText = markdown ? renderReportMarkdown(result) : null;
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, 'results.json'), jsonText, { flag: 'wx' });
  if (markdownText !== null) await writeFile(resolve(outputDirectory, 'results.md'), markdownText, { flag: 'wx' });
  return result;
}
