import { stats } from '../native-studio-edit-cost/core.mjs';

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
const FACTS = ['people', 'teams', 'work', 'practices', 'contributions', 'connections', 'references', 'inputUtf8Bytes'];
const SOURCE_CALLS = ['preview', 'apply', 'replace', 'undo', 'transitions'];
const BROWSER_CALLS = ['previewCommand', 'applyCommand', 'replace', 'undo'];
const BROWSER_COUNTS = ['transitions', 'graphListRebuilds', 'selectedElementWrites', 'domMutationRecords', 'producedUtf8Bytes'];
const POPULATIONS = { small: [4, 2, 4, 2, 2, 4, 60], representative: [32, 8, 64, 32, 32, 64, 1280],
  caps: [128, 32, 256, 128, 128, 256, 8192], 'byte-pressure': [128, 32, 256, 128, 128, 256, 8192] };
const BUDGETS = { processingMedianMs: 16, processingP95Ms: 50, renderOpportunityP95Ms: 100 };
const check = (condition, message) => { if (!condition) throw new TypeError(message); };
const metric = value => { check(Number.isFinite(value) && value >= 0, 'Use finite nonnegative metrics.'); return value; };
const count = value => { check(Number.isSafeInteger(value) && value >= 0, 'Use nonnegative safe integer counts.'); return value; };
const same = (actual, expected, message) => check(JSON.stringify(actual) === JSON.stringify(expected), message);
const list = (value, length, message) => { check(Array.isArray(value) && value.length === length, message); return value; };
const pickCounts = (row, keys) => Object.fromEntries(keys.map(key => [key, count(row?.[key])]));
const range = values => ({ min: Math.min(...values), max: Math.max(...values) });
function summarizeMetrics(values) {
  const result = stats(values);
  for (const key of ['min', 'max', 'median', 'p95']) metric(result[key]);
  return result;
}
const fixtureId = (base, trace) => trace === 'template' ? `${base}-template` : base;

function validateProtocol(protocol, sourceCommit, freezeDigest) {
  check(typeof sourceCommit === 'string' && /^[a-f0-9]{40}$/u.test(sourceCommit), 'Use the complete source commit.');
  check(typeof freezeDigest === 'string' && /^[a-f0-9]{64}$/u.test(freezeDigest), 'Use the complete freeze digest.');
  check(protocol?.id === 'native-studio-relationship-cost-01' && protocol.issue === 673, 'Use the declared study identity.');
  check(protocol.sourceCommit === sourceCommit, 'Bind the report to its declared source commit.');
  same(protocol.fixtures, FIXTURES, 'Use the four declared source populations.');
  for (const [key, value] of Object.entries({ runs: 5, warmup: 50, samples: 200 }))
    check(protocol.node?.[key] === value, 'Use the declared source run counts.');
  for (const [key, value] of Object.entries({ runs: 5, warmupPairs: 20, measuredPairs: 50 }))
    check(protocol.browser?.[key] === value, 'Use the declared browser run counts.');
  same(protocol.browser.engines, ENGINES, 'Use the three declared engines.');
  same(protocol.browser.traces, Object.keys(BROWSER_PHASES), 'Use the three declared browser traces.');
  same(protocol.browser.viewport, { width: 1440, height: 1000 }, 'Use the declared desktop viewport.');
  for (const [key, value] of Object.entries(BUDGETS)) check(protocol.budgets?.[key] === value, 'Use the prospective thresholds.');
  check(protocol.publication === 'held', 'Retain the declared publication standing.');
}

function calibration(raw, source) {
  check(raw?.clock === 'performance.now', 'Supply the observed clock calibration.');
  const pairs = source ? raw.clockPairs : raw.advancementPairs;
  check(pairs === 10000, 'Supply all clock-advancement pairs.');
  const smallest = source ? raw.smallestObservedAdvancingDeltaMs : raw.smallestAdvancingDeltaMs;
  check(smallest === null || (Number.isFinite(smallest) && smallest > 0), 'Clock advancement is positive or explicitly unobserved.');
  const empty = source ? raw.noOpSamplesMs : raw.emptyPairsMs;
  list(empty, 1000, 'Supply all empty timer pairs.').forEach(metric);
  const result = { clock: 'performance.now', pairs, smallestAdvancingDeltaMs: smallest, emptyPairMs: summarizeMetrics(empty) };
  if (source) {
    result.advancingPairs = count(raw.advancingPairs); result.zeroPairs = count(raw.zeroPairs);
    check(result.advancingPairs + result.zeroPairs === pairs, 'Clock pair counts cover the declared population.');
    check((result.advancingPairs === 0) === (smallest === null), 'Clock advancement and its minimum agree.');
  }
  return result;
}

function callCounts(raw, keys, missingIsZero = false) {
  check(raw && typeof raw === 'object' && !Array.isArray(raw), 'Supply the named boundary-call counters.');
  return Object.fromEntries(keys.map(key => [key, count(missingIsZero ? raw[key] ?? 0 : raw[key])]));
}

function phaseSummary(samples, phase, browser) {
  // The two selection observations share one meaning; other phases retain
  // separate arrays. This is within one run, never a pool across rounds.
  const rows = samples.flatMap(sample => sample.phases.filter(row => row.phase === phase));
  const result = { phase, observations: rows.length, processingMs: summarizeMetrics(rows.map(row => row.processingMs)) };
  if (browser) {
    result.modelMs = summarizeMetrics(rows.map(row => row.modelMs));
    result.renderOpportunityMs = summarizeMetrics(rows.map(row => row.renderOpportunityMs));
    result.counters = Object.fromEntries(BROWSER_COUNTS.map(key => [key, range(rows.map(row => row[key]))]));
    result.calls = Object.fromEntries(BROWSER_CALLS.map(key => [key, range(rows.map(row => row.calls[key] ?? 0))]));
    result.acceptedChanges = rows.filter(row => row.acceptedChanged).length;
  }
  return result;
}

function validateSamples(run, browser) {
  const phases = (browser ? BROWSER_PHASES : SOURCE_PHASES)[run.trace];
  const samples = list(run.samples, browser ? 50 : 200, 'Complete every declared sample population.');
  samples.forEach((sample, index) => {
    if (!browser) {
      check(sample.index === index && sample.fixture === run.fixture, 'Source samples retain their index and population.');
      callCounts(sample.calls, SOURCE_CALLS); count(sample.producedUtf8Bytes);
    } else {
      count(sample.listeners); count(sample.nodes);
      check(sample.pendingFrames === 0, 'Each browser sample releases its deferred resources.');
    }
    list(sample.phases, phases.length, 'Complete every declared phase.');
    same(sample.phases.map(row => row.phase), phases, 'Keep the declared phase identity and order.');
    for (const row of sample.phases) {
      metric(row.processingMs);
      if (browser) {
        metric(row.modelMs); metric(row.renderOpportunityMs);
        check(row.modelMs <= row.processingMs + 1e-6, 'Intercepted model time belongs inside complete processing.');
        check(row.renderOpportunityMs + 1e-6 >= row.processingMs, 'Rendering opportunity follows synchronous processing.');
        pickCounts(row, BROWSER_COUNTS); callCounts(row.calls, BROWSER_CALLS, true);
        check(typeof row.acceptedChanged === 'boolean', 'Report whether the accepted projection changed.');
        check(Array.isArray(row.changedSelectedIds) && row.changedSelectedIds.length <= 256, 'Bound selected-record observations.');
        if (run.trace === 'selection') {
          check(row.transitions === 0 && row.graphListRebuilds === 0 && !row.acceptedChanged,
            'Selection retains the accepted projection and list population.');
        }
      }
    }
  });
  return samples;
}

function summarizeRun(run, browser) {
  const samples = validateSamples(run, browser);
  const result = { round: run.round, sequence: run.sequence,
    measuredSamples: samples.length,
    phases: [...new Set((browser ? BROWSER_PHASES : SOURCE_PHASES)[run.trace])].map(phase => phaseSummary(samples, phase, browser)) };
  if (browser) {
    result.calibration = calibration(run.calibration, false);
    result.resources = pickCounts(run.resources, ['afterMountListeners', 'afterMountNodes', 'afterDisposeListeners', 'pendingFrames']);
    check(result.resources.afterDisposeListeners === 0 && result.resources.pendingFrames === 0, 'Disposal releases observed browser resources.');
    check(samples.every(sample => sample.listeners === result.resources.afterMountListeners), 'Browser samples retain their mounted listener count.');
    result.nodes = range(samples.map(sample => sample.nodes));
  } else {
    result.calls = Object.fromEntries(SOURCE_CALLS.map(key => [key, range(samples.map(sample => sample.calls[key]))]));
    result.producedUtf8Bytes = range(samples.map(sample => sample.producedUtf8Bytes));
  }
  return result;
}

function phaseRanges(runs, browser) {
  return runs[0].phases.map(({ phase }) => {
    const rows = runs.map(run => run.phases.find(row => row.phase === phase));
    const result = { phase, observationsPerRun: rows[0].observations };
    for (const key of browser ? ['processingMs', 'modelMs', 'renderOpportunityMs'] : ['processingMs']) {
      result[key] = { median: range(rows.map(row => row[key].median)), p95: range(rows.map(row => row[key].p95)),
        min: Math.min(...rows.map(row => row[key].min)), max: Math.max(...rows.map(row => row[key].max)) };
    }
    return result;
  });
}

function summarizePopulation(rawRuns, browser, sourceCommit, factsByFixture) {
  const fixtures = browser ? FIXTURES.slice(0, 3) : FIXTURES;
  const traces = Object.keys(browser ? BROWSER_PHASES : SOURCE_PHASES);
  const engines = browser ? ENGINES : [null];
  const expectedRuns = fixtures.length * traces.length * engines.length * 5;
  list(rawRuns, expectedRuns, 'Complete the declared run matrix.');
  const groups = new Map(), seenSequences = new Set();
  for (const run of rawRuns) {
    check(run?.status === 'complete', 'Every included run has a complete standing.');
    check(traces.includes(run.trace) && (!browser || ENGINES.includes(run.engine)), 'Use declared trace and engine identities.');
    const base = fixtures.find(fixture => fixtureId(fixture, run.trace) === run.fixture);
    check(base !== undefined, 'Use the declared population for this trace.');
    check(Number.isSafeInteger(run.round) && run.round >= 1 && run.round <= 5, 'Use the five declared rounds.');
    check(Number.isSafeInteger(run.sequence) && run.sequence >= 1 && run.sequence <= expectedRuns && !seenSequences.has(run.sequence), 'Run sequences are complete and unique.');
    seenSequences.add(run.sequence);
    if (browser) check(run.declaredPairs === 50, 'Declare all browser pairs.');
    else check(run.sourceCommit === sourceCommit && run.warmupSamples === 50 && run.declaredSamples === 200, 'Bind each source run and its sample counts.');
    const facts = pickCounts(run.facts, FACTS);
    const expectedPopulation = [...POPULATIONS[base]];
    if (run.trace === 'template' && (base === 'caps' || base === 'byte-pressure')) {
      expectedPopulation[2] = 254; expectedPopulation[5] = 254; expectedPopulation[6] = 8168;
    }
    same(FACTS.slice(0, 7).map(key => facts[key]), expectedPopulation, 'Retain the declared substantive population.');
    check(facts.inputUtf8Bytes > 0, 'Record the nonempty input byte population.');
    const previous = factsByFixture.get(run.fixture);
    if (previous) same(facts, previous, 'A named population retains the same facts across its runs.');
    else factsByFixture.set(run.fixture, facts);
    const key = [run.engine ?? '', run.fixture, run.trace].join('|');
    if (!groups.has(key)) groups.set(key, { fixture: run.fixture, trace: run.trace, ...(browser ? { engine: run.engine } : {}), facts, runs: [] });
    const group = groups.get(key);
    check(!group.runs.some(prior => prior.round === run.round), 'Each cell has one run per round.');
    group.runs.push(summarizeRun(run, browser));
  }
  const cells = [];
  for (const engine of engines) for (const base of fixtures) for (const trace of traces) {
    const group = groups.get([engine ?? '', fixtureId(base, trace), trace].join('|'));
    check(group?.runs.length === 5, 'Each declared cell contains five complete runs.');
    group.runs.sort((a, b) => a.round - b.round);
    group.phases = phaseRanges(group.runs, browser); cells.push(group);
  }
  return cells;
}

function thresholdResults(source, browser) {
  const results = [];
  for (const [domain, cells] of [['source', source], ['browser', browser]]) for (const cell of cells) for (const phase of cell.phases) {
    const identity = { domain, ...(cell.engine ? { engine: cell.engine } : {}), fixture: cell.fixture, trace: cell.trace, phase: phase.phase };
    for (const [metricName, observed, thresholdMs] of [
      ['processing-median', phase.processingMs.median.max, BUDGETS.processingMedianMs],
      ['processing-p95', phase.processingMs.p95.max, BUDGETS.processingP95Ms],
      ...(domain === 'browser' ? [['render-opportunity-p95', phase.renderOpportunityMs.p95.max, BUDGETS.renderOpportunityP95Ms]] : []),
    ]) results.push({ ...identity, metric: metricName, worstRunMs: observed, thresholdMs, passed: observed <= thresholdMs });
  }
  return results;
}

/** Produce a detached public aggregate from complete private collector records. */
export function summarizeStudy({ freezeDigest, sourceCommit, node, browser, protocol }) {
  validateProtocol(protocol, sourceCommit, freezeDigest);
  const facts = new Map();
  const sourceCells = summarizePopulation(node?.runs, false, sourceCommit, facts);
  const browserCells = summarizePopulation(browser?.runs, true, sourceCommit, facts);
  const versions = Object.fromEntries(ENGINES.map(engine => {
    const value = browser.versions?.[engine];
    check(typeof value === 'string' && /^\d+(?:\.\d+){0,4}$/u.test(value) && value.length <= 40, 'Use bounded numeric browser versions.');
    return [engine, value];
  }));
  const thresholds = thresholdResults(sourceCells, browserCells);
  return {
    protocolId: 'native-studio-relationship-cost-01', issue: 673, sourceCommit, freezeDigest, publication: 'held',
    counts: { sourceRuns: 60, sourceSamples: 12000, sourcePhaseObservations: 40000,
      browserRuns: 135, browserPairs: 6750, browserPhaseObservations: 20250 },
    budgets: { ...BUDGETS },
    source: { calibration: calibration(node.clock, true), cells: sourceCells },
    browser: { versions, viewport: { width: 1440, height: 1000 }, cells: browserCells },
    decision: { passed: thresholds.every(row => row.passed), thresholds, exceeded: thresholds.filter(row => !row.passed) },
  };
}

const format = value => { metric(value); return value.toFixed(3); };
const summaryText = value => `${format(value.median)} / ${format(value.p95)} / ${format(value.min)}–${format(value.max)}`;
function cellTitle(cell, browser) {
  const traces = browser ? BROWSER_PHASES : SOURCE_PHASES;
  check(Object.hasOwn(traces, cell.trace) && FIXTURES.some(base => fixtureId(base, cell.trace) === cell.fixture), 'Use declared report identities.');
  if (browser) check(ENGINES.includes(cell.engine), 'Use a declared report engine.');
  return [browser ? cell.engine : 'source', cell.fixture, cell.trace].filter(Boolean).join(' · ');
}

/** Render the allowlisted aggregate; raw collector metadata has no prose route. */
export function renderMarkdown(summary) {
  check(summary?.protocolId === 'native-studio-relationship-cost-01' && typeof summary.sourceCommit === 'string' && /^[a-f0-9]{40}$/u.test(summary.sourceCommit)
    && typeof summary.freezeDigest === 'string' && /^[a-f0-9]{64}$/u.test(summary.freezeDigest), 'Render an admitted study aggregate.');
  const lines = ['# Native Studio relationship-cost observations', '',
    `Source: \`${summary.sourceCommit}\`. Freeze: \`${summary.freezeDigest}\`.`, '',
    'The complete population contains 60 source runs (12,000 traces) and 135 browser runs (6,750 pairs). Each cell retains five sequential runs. Publication remains held.', '',
    summary.decision.passed
      ? 'Every observed run meets the prospective local thresholds. Retain the complete preparation owner for this population; independent review receives the next implementation decision.'
      : 'One or more observed runs exceed a prospective local threshold. Review the named phase and run variation before selecting a localized change and a new comparison.', '',
    'Thresholds use the worst per-run processing median (16 ms), processing p95 (50 ms), and rendering-opportunity p95 (100 ms). Per-phase run ranges retain variation; these thresholds are local engineering comparison targets.', '',
    'Browser processing covers explicit receiver commands and synthetic DOM events. Model time covers intercepted state APIs; template preparation remains within its full UI span. Rendering opportunity is elapsed time to a subsequent animation frame, including observer bookkeeping, and carries its own population. Trusted input delay, completed paint, and heap allocation require separate observations.', '',
    'All durations below are milliseconds. Each duration cell reads **median / nearest-rank p95 / min–max**. Different phases and rounds remain separate. Selection contains 50 pairs and 100 same-labelled phase observations per run.', '',
    '## Clock observations', '',
    `Source empty timer pair: ${summaryText(summary.source.calibration.emptyPairMs)} (${summary.source.calibration.emptyPairMs.count} observations). Smallest observed advancing delta: ${summary.source.calibration.smallestAdvancingDeltaMs === null ? 'unobserved' : format(summary.source.calibration.smallestAdvancingDeltaMs)}.`, '',
    'Browser clock summaries accompany each run below. Quantized zero values remain in every summary; clock overhead is reported separately.', ''];
  for (const [browser, cells] of [[false, summary.source.cells], [true, summary.browser.cells]]) for (const cell of cells) {
    lines.push(`## ${cellTitle(cell, browser)}`, '',
      `Population: ${FACTS.map(key => `${key}=${count(cell.facts[key])}`).join(', ')}.`, '',
      browser ? '| Run | Phase | Observations | Processing | Intercepted model | Rendering opportunity |'
        : '| Run | Phase | Observations | Processing |',
      browser ? '| --- | --- | ---: | --- | --- | --- |' : '| --- | --- | ---: | --- |');
    for (const run of cell.runs) for (const phase of run.phases) {
      check((browser ? BROWSER_PHASES : SOURCE_PHASES)[cell.trace].includes(phase.phase), 'Use declared report phases.');
      lines.push(`| ${count(run.round)} | ${phase.phase} | ${count(phase.observations)} | ${summaryText(phase.processingMs)} |${browser ? ` ${summaryText(phase.modelMs)} | ${summaryText(phase.renderOpportunityMs)} |` : ''}`);
    }
    lines.push('', 'Per-run ranges:', '');
    for (const phase of cell.phases) lines.push(`- ${phase.phase}: processing median ${format(phase.processingMs.median.min)}–${format(phase.processingMs.median.max)}; p95 ${format(phase.processingMs.p95.min)}–${format(phase.processingMs.p95.max)}.${browser ? ` Rendering-opportunity p95 ${format(phase.renderOpportunityMs.p95.min)}–${format(phase.renderOpportunityMs.p95.max)}.` : ''}`);
    if (browser) {
      lines.push('', '| Run | Empty timer pair | Smallest advancing delta | Listeners mounted / disposed | Nodes min–max |', '| --- | --- | --- | --- | --- |');
      for (const run of cell.runs) lines.push(`| ${count(run.round)} | ${summaryText(run.calibration.emptyPairMs)} | ${run.calibration.smallestAdvancingDeltaMs === null ? 'unobserved' : format(run.calibration.smallestAdvancingDeltaMs)} | ${count(run.resources.afterMountListeners)} / ${count(run.resources.afterDisposeListeners)} | ${count(run.nodes.min)}–${count(run.nodes.max)} |`);
    }
    lines.push('');
  }
  lines.push('## Threshold review', '', '| Domain | Engine | Population | Trace | Phase | Metric | Worst run ms | Target ms | Result |', '| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |');
  for (const row of summary.decision.exceeded) {
    const browser = row.domain === 'browser';
    check(row.domain === 'source' || browser, 'Use a declared report domain.'); cellTitle(row, browser);
    check((browser ? BROWSER_PHASES : SOURCE_PHASES)[row.trace].includes(row.phase)
      && ['processing-median', 'processing-p95', 'render-opportunity-p95'].includes(row.metric), 'Use a declared threshold identity.');
    lines.push(`| ${row.domain} | ${row.engine ?? '—'} | ${row.fixture} | ${row.trace} | ${row.phase} | ${row.metric} | ${format(row.worstRunMs)} | ${format(row.thresholdMs)} | exceeds |`);
  }
  if (summary.decision.exceeded.length === 0) lines.push('| all | — | all declared | all declared | all declared | declared thresholds | — | — | meets |');
  lines.push('', 'The companion JSON retains every run summary, phase range, numeric call/resource observation, browser version and threshold result. Raw samples and machine-specific metadata remain with the local collection owner.', '');
  return lines.join('\n');
}
