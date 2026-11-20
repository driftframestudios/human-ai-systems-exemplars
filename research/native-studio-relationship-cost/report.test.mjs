import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeStudy, renderMarkdown } from './report.mjs';

const SOURCE = 'c'.repeat(40), DIGEST = 'd'.repeat(64);
const FIXTURES = ['small', 'representative', 'caps', 'byte-pressure'];
const ENGINES = ['chromium', 'firefox', 'webkit'];
const SOURCE_PHASES = {
  prepare: ['prepare'], connection: ['open', 'raw', 'preview', 'cached-preview', 'apply', 'undo'],
  template: ['template-prepare', 'template-apply', 'undo'],
};
const BROWSER_PHASES = {
  selection: ['selection', 'selection'], connection: ['open', 'preview-input', 'apply-render', 'undo-render'],
  template: ['template-preview', 'template-apply-render', 'undo-render'],
};
function population(base, trace) {
  const shape = { small: [4, 2, 4, 2, 2, 4, 60, 4288], representative: [32, 8, 64, 32, 32, 64, 1280, 56471],
    caps: [128, 32, 256, 128, 128, 256, 8192, 265067], 'byte-pressure': [128, 32, 256, 128, 128, 256, 8192, 3679669] }[base];
  const facts = Object.fromEntries(['people', 'teams', 'work', 'practices', 'contributions', 'connections', 'references', 'inputUtf8Bytes'].map((key, index) => [key, shape[index]]));
  if (trace === 'template' && ['caps', 'byte-pressure'].includes(base)) {
    facts.work = 254; facts.connections = 254; facts.references = 8168; facts.inputUtf8Bytes -= 1000;
  }
  return facts;
}
function fixture() {
  const protocol = { id: 'native-studio-relationship-cost-01', issue: 673, sourceCommit: SOURCE, fixtures: FIXTURES,
    node: { runs: 5, warmup: 50, samples: 200 },
    browser: { engines: ENGINES, viewport: { width: 1440, height: 1000 }, traces: Object.keys(BROWSER_PHASES), runs: 5, warmupPairs: 20, measuredPairs: 50 },
    budgets: { processingMedianMs: 16, processingP95Ms: 50, renderOpportunityP95Ms: 100 }, publication: 'held' };
  const node = { runs: [], clock: { clock: 'performance.now', clockPairs: 10000, advancingPairs: 4000, zeroPairs: 6000,
    smallestObservedAdvancingDeltaMs: .001, noOpSamplesMs: Array(1000).fill(0), noOpSummaryMs: { untrusted: 'ignored' } } };
  for (let round = 1; round <= 5; round++) for (const base of FIXTURES) for (const [trace, phases] of Object.entries(SOURCE_PHASES)) {
    const id = trace === 'template' ? `${base}-template` : base;
    node.runs.push({ sourceCommit: SOURCE, sequence: node.runs.length + 1, round, fixture: id, trace, facts: population(base, trace), status: 'complete', warmupSamples: 50, declaredSamples: 200,
      samples: Array.from({ length: 200 }, (_, index) => ({ index, fixture: id,
        phases: phases.map(phase => ({ phase, processingMs: 1 })),
        calls: { preview: 0, apply: 0, replace: 0, undo: 0, transitions: 0 }, producedUtf8Bytes: 42 })) });
  }
  const browser = { versions: { chromium: '140.0.1.0', firefox: '143.0', webkit: '26.0' }, runs: [] };
  for (const engine of ENGINES) for (let round = 1; round <= 5; round++) for (const base of FIXTURES.slice(0, 3)) for (const [trace, phases] of Object.entries(BROWSER_PHASES)) {
    browser.runs.push({ sequence: browser.runs.length + 1, round, engine, fixture: trace === 'template' ? `${base}-template` : base,
      trace, facts: population(base, trace), status: 'complete', declaredPairs: 50,
      samples: Array.from({ length: 50 }, () => ({ phases: phases.map(phase => ({ phase, processingMs: 2, modelMs: 1, renderOpportunityMs: 17,
        calls: {}, transitions: 0, graphListRebuilds: 0, selectedElementWrites: 2, changedSelectedIds: ['first', 'second'], domMutationRecords: 2, acceptedChanged: false, producedUtf8Bytes: 42 })),
        listeners: 8, nodes: 400, pendingFrames: 0 })),
      resources: { afterMountListeners: 8, afterMountNodes: 400, afterDisposeListeners: 0, pendingFrames: 0 },
      calibration: { clock: 'performance.now', advancementPairs: 10000, smallestAdvancingDeltaMs: .1, emptyPairsMs: Array(1000).fill(0) } });
  }
  return { sourceCommit: SOURCE, freezeDigest: DIGEST, node, browser, protocol };
}
const cell = (summary, domain, fixtureName, trace, engine) => summary[domain].cells.find(row => row.fixture === fixtureName && row.trace === trace && (!engine || row.engine === engine));

test('complete matrix retains five rounds, independent phases and literal nearest-rank quantiles', () => {
  const input = fixture();
  const run = input.node.runs.find(row => row.fixture === 'small' && row.trace === 'prepare' && row.round === 1);
  run.samples.forEach((sample, index) => { sample.phases[0].processingMs = index + 1; });
  const connection = input.node.runs.find(row => row.fixture === 'small' && row.trace === 'connection' && row.round === 1);
  connection.samples.forEach(sample => { sample.phases[0].processingMs = 3; sample.phases[1].processingMs = 9; });
  const result = summarizeStudy(input), prepare = cell(result, 'source', 'small', 'prepare');
  assert.equal(result.source.cells.length, 12); assert.equal(result.browser.cells.length, 27);
  assert.equal(prepare.runs.length, 5);
  assert.deepEqual(prepare.runs[0].phases[0].processingMs, { count: 200, min: 1, max: 200, median: 100.5, p95: 190 });
  assert.deepEqual(prepare.phases[0].processingMs.median, { min: 1, max: 100.5 });
  const separate = cell(result, 'source', 'small', 'connection').runs[0].phases;
  assert.equal(separate[0].processingMs.median, 3); assert.equal(separate[1].processingMs.median, 9);
  assert.equal(prepare.runs[4].phases[0].processingMs.median, 1);
  assert.equal(input.node.runs[0].samples[0].phases[0].processingMs, 1, 'Caller observations stay intact.');
});

test('selection keeps 50 pairs and 100 same-labelled observations per run', () => {
  const input = fixture(), first = input.browser.runs[0];
  first.samples.forEach((sample, index) => {
    sample.phases[0].processingMs = index * 2 + 1; sample.phases[1].processingMs = index * 2 + 2;
    sample.phases.forEach(phase => { phase.renderOpportunityMs = phase.processingMs + 17; });
  });
  const result = summarizeStudy(input), selection = cell(result, 'browser', 'small', 'selection', 'chromium');
  assert.equal(selection.runs[0].measuredSamples, 50); assert.equal(selection.runs[0].phases.length, 1);
  assert.equal(selection.phases[0].observationsPerRun, 100);
  assert.deepEqual(selection.runs[0].phases[0].processingMs, { count: 100, min: 1, max: 100, median: 50.5, p95: 95 });
  assert.equal(result.counts.browserPhaseObservations, 20250);
  assert.match(renderMarkdown(result), /50 pairs and 100 same-labelled phase observations per run/u);
});

test('worst fifth run exceeds its own threshold while 16/50/100 boundary values pass', () => {
  const input = fixture();
  for (const run of input.node.runs) for (const sample of run.samples) for (const phase of sample.phases)
    phase.processingMs = sample.index < 180 ? 16 : 50;
  for (const run of input.browser.runs) for (const sample of run.samples) for (const phase of sample.phases) phase.renderOpportunityMs = 100;
  assert.equal(summarizeStudy(input).decision.passed, true);
  const fifth = input.node.runs.find(row => row.fixture === 'small' && row.trace === 'prepare' && row.round === 5);
  fifth.samples.forEach(sample => { sample.phases[0].processingMs = 51; });
  const result = summarizeStudy(input);
  assert.equal(result.decision.passed, false); assert.equal(result.decision.exceeded.length, 2);
  assert.deepEqual(result.decision.exceeded.map(row => [row.metric, row.worstRunMs]), [['processing-median', 51], ['processing-p95', 51]]);
  const rendering = input.browser.runs.find(row => row.round === 5 && row.trace === 'selection');
  rendering.samples.forEach(sample => sample.phases.forEach(phase => { phase.renderOpportunityMs = 101; }));
  assert.equal(summarizeStudy(input).decision.exceeded.filter(row => row.metric === 'render-opportunity-p95').length, 1);
});

test('missing, duplicated, incomplete and foreign run identities reject the aggregate', () => {
  for (const alter of [
    input => input.node.runs.pop(),
    input => { input.node.runs[1].sequence = 1; },
    input => { input.node.runs[12].round = 1; },
    input => { input.browser.runs[0].status = 'incomplete'; },
    input => { input.browser.runs[0].engine = 'other'; },
    input => { input.browser.runs[0].fixture = 'byte-pressure'; },
    input => { input.node.runs[0].trace = 'selection'; },
    input => { input.node.runs[0].sourceCommit = 'a'.repeat(40); },
    input => { input.sourceCommit = 'short'; },
    input => { input.freezeDigest = 'short'; },
    input => { const disguised = { toString: () => SOURCE, privatePath: 'private' }; input.sourceCommit = disguised; input.protocol.sourceCommit = disguised; },
  ]) { const input = fixture(); alter(input); assert.throws(() => summarizeStudy(input), TypeError); }
});

test('sample counts, phase order, declarations and fixture facts carry complete populations', () => {
  for (const alter of [
    input => input.node.runs[0].samples.pop(),
    input => input.browser.runs[0].samples.pop(),
    input => input.browser.runs[0].samples[0].phases.pop(),
    input => { input.node.runs[0].samples[0].index = 2; },
    input => { input.node.runs[0].samples[0].fixture = 'caps'; },
    input => { input.node.runs[1].samples[0].phases.reverse(); },
    input => { input.node.runs[0].warmupSamples = 0; },
    input => { input.browser.runs[0].declaredPairs = 100; },
    input => { input.browser.runs[0].facts.people = 0; },
    input => { input.protocol.budgets.processingMedianMs = 17; },
    input => { input.protocol.node.runs = 4; },
    input => { for (const run of [...input.node.runs, ...input.browser.runs]) run.facts.people = 0; },
  ]) { const input = fixture(); alter(input); assert.throws(() => summarizeStudy(input), TypeError); }
});

test('nonfinite, negative, incoherent metric and lifecycle observations reject before publication', () => {
  for (const alter of [
    input => { input.node.runs[0].samples[0].phases[0].processingMs = NaN; },
    input => { input.node.runs[0].samples[0].phases[0].processingMs = -1; },
    input => { input.node.runs[0].samples.forEach(sample => { sample.phases[0].processingMs = Number.MAX_VALUE; }); },
    input => { input.browser.runs[0].samples[0].phases[0].modelMs = Infinity; },
    input => { input.browser.runs[0].samples[0].phases[0].modelMs = 3; },
    input => { input.browser.runs[0].samples[0].phases[0].renderOpportunityMs = 1; },
    input => { input.browser.runs[0].samples[0].phases[0].selectedElementWrites = .5; },
    input => { input.browser.runs[0].samples[0].phases[0].graphListRebuilds = 1; },
    input => { input.browser.runs[0].resources.afterDisposeListeners = 1; },
    input => { input.browser.runs[0].samples[0].pendingFrames = 1; },
    input => { input.browser.runs[0].samples[0].listeners = 9; },
  ]) { const input = fixture(); alter(input); assert.throws(() => summarizeStudy(input), TypeError); }
});

test('allowlisted public summaries omit raw paths, errors, IDs and injected metadata at every level', () => {
  const input = fixture(), marker = 'private-marker-to-omit';
  input.privatePath = marker; input.protocol.notes = marker; input.protocol.node.host = marker;
  input.node.clock.noOpSummaryMs = marker;
  input.node.runs[0].error = marker; input.node.runs[0].facts.location = marker;
  input.node.runs[0].samples[0].privatePath = marker;
  input.node.runs[0].samples[0].phases[0].error = marker;
  input.browser.host = marker; input.browser.runs[0].calibration.hostname = marker;
  input.browser.runs[0].resources.path = marker;
  input.browser.runs[0].samples[0].phases[0].changedSelectedIds = [marker];
  input.browser.runs[0].samples[0].phases[0].calls.privatePath = marker;
  const result = summarizeStudy(input);
  assert.equal(JSON.stringify(result).includes(marker), false);
  assert.equal(renderMarkdown(result).includes(marker), false);
  assert.equal(result.decision.passed, true);
  assert.equal(Object.hasOwn(result.browser.cells[0].runs[0].phases[0], 'changedSelectedIds'), false);
  assert.equal(result.source.calibration.emptyPairMs.count, 1000);
  result.source.cells[0].facts.people = 999;
  assert.equal(input.node.runs[0].facts.people, 4, 'The public projection owns its containers.');
});

test('clock calibration retains zeros and explicitly unobserved advancement separately', () => {
  const input = fixture();
  input.node.clock.advancingPairs = 0; input.node.clock.zeroPairs = 10000; input.node.clock.smallestObservedAdvancingDeltaMs = null;
  input.browser.runs[0].calibration.smallestAdvancingDeltaMs = null;
  let result = summarizeStudy(input);
  assert.equal(result.source.calibration.smallestAdvancingDeltaMs, null);
  assert.deepEqual(result.source.calibration.emptyPairMs, { count: 1000, min: 0, max: 0, median: 0, p95: 0 });
  assert.match(renderMarkdown(result), /unobserved/u);
  input.node.clock.smallestObservedAdvancingDeltaMs = 0;
  assert.throws(() => summarizeStudy(input), /advancement/u);
  input.node.clock.smallestObservedAdvancingDeltaMs = null;
  input.browser.runs[0].calibration = null;
  assert.throws(() => summarizeStudy(input), /calibration/u);
});

test('safe browser version text and source identities stay inside the public projection', () => {
  const input = fixture(); input.browser.versions.webkit = '26.0 private-location';
  assert.throws(() => summarizeStudy(input), /versions/u);
  input.browser.versions.webkit = '26.0';
  const result = summarizeStudy(input), output = renderMarkdown(result);
  assert.match(output, /All durations below are milliseconds/u);
  assert.match(output, /template preparation remains within its full UI span/u);
  assert.equal((output.match(/^\| 5 \| selection \| 100 \|/gmu) ?? []).length, 9);
  assert.equal((output.match(/^## source ·/gmu) ?? []).length, 12);
  assert.equal((output.match(/^## (chromium|firefox|webkit) ·/gmu) ?? []).length, 27);
});
