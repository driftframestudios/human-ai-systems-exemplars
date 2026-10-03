import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const record = JSON.parse(readFileSync(new URL('./table-repair-01.json', import.meta.url), 'utf8'));
const ledgerText = readFileSync(new URL('./table-repair-01-events.jsonl', import.meta.url), 'utf8');
const ledger = ledgerText.trimEnd().split('\n').map(line => JSON.parse(line));
const history = ledger.filter(row => row.recordType === undefined);
const annotations = ledger.filter(row => row.recordType === 'retrospective-annotation');
const sha256 = value => createHash('sha256').update(value).digest('hex');

function validateLedger(epoch, rows) {
  const ids = new Map();
  for (const [index, row] of rows.entries()) {
    assert.equal(typeof row.event, 'string', 'event ID is a string');
    assert.ok(row.event.length > 0, 'event ID is populated');
    assert.ok(!ids.has(row.event), 'unique event ID: ' + row.event);
    ids.set(row.event, index);
  }
  const definitions = new Map(epoch.observationDefinitions.map(def => [def.version, def]));
  assert.equal(definitions.size, epoch.observationDefinitions.length, 'unique definition IDs');
  const categories = new Set(epoch.eventLedger.categories);
  const annotated = new Set();
  for (const [index, row] of rows.entries()) {
    if (row.recordType === undefined) continue;
    assert.ok(['retrospective-annotation', 'plan', 'review', 'execution'].includes(row.recordType), 'recognized record type');
    assert.ok(categories.has(row.category), 'recognized category');
    assert.ok(definitions.has(row.observationDefinition), 'recognized definition');
    assert.match(row.recordedOn, /^\d{4}-\d{2}-\d{2}$/, 'recording date');
    assert.equal(row.occurredAt, null, 'exact occurrence time remains unspecified');
    if (row.recordType !== 'execution') {
      for (const count of ['browserLaunches', 'prototypeCases', 'prototypePageCases', 'materialJourneys']) {
        assert.equal(Object.hasOwn(row, count), false, 'metadata supplies no execution count');
      }
    }
    assert.ok(Array.isArray(row.triggeredBy), 'trigger list');
    const targetIndex = row.recordType === 'retrospective-annotation' ? ids.get(row.annotatesEvent) : index;
    if (row.recordType === 'retrospective-annotation') {
      assert.ok(targetIndex !== undefined && targetIndex < index, 'annotation target precedes annotation');
      assert.equal(rows[targetIndex].recordType, undefined, 'annotation target is historical execution');
      assert.ok(!annotated.has(row.annotatesEvent), 'one refinement annotation per historical event');
      annotated.add(row.annotatesEvent);
      assert.equal(row.standing, 'retrospective-annotation-of-recorded-observation');
      assert.equal(row.predictionBeforeExecution, null, 'historical prediction remains unspecified');
      assert.equal(row.sourceRevision, null, 'historical source identity remains unspecified');
      assert.equal(row.runtimeIdentity, null, 'historical runtime identity remains unspecified');
      assert.equal(row.linkStanding, row.triggeredBy.length ? 'retrospective-dependency-interpretation' : 'trigger-unspecified');
      assert.equal(definitions.get(row.observationDefinition).standing, 'historical-retrospective-label', 'historical execution retains historical definition');
    } else if (row.recordType === 'plan') {
      assert.equal(row.standing, 'planned-not-executed');
      assert.equal(row.result, null, 'original plan retains its pre-execution meaning');
    } else {
      assert.equal(row.standing, 'parent-reported-observation');
      assert.equal(row.occurredOn, '2026-10-03');
      assert.ok(['wave-1-2', 'scope-addition'].includes(row.wave), 'recognized execution group');
      assert.equal(row.linkStanding, 'parent-reported-sequence');
      for (const key of ['sourceRevision', 'runtimeIdentity', 'evidenceManifest', 'predictionBeforeExecution']) {
        assert.equal(row[key], null, 'unsupplied execution identity or prediction stays unspecified');
      }
      if (row.recordType === 'execution') assert.ok(Number.isSafeInteger(row.browserLaunches) && row.browserLaunches >= 0);
    }
    for (const dependency of row.triggeredBy) {
      assert.ok(ids.has(dependency), 'recognized causal reference: ' + dependency);
      assert.ok(ids.get(dependency) < targetIndex, 'causal reference precedes its subject');
    }
  }
  for (const def of definitions.values()) {
    if (def.extends) assert.ok(definitions.has(def.extends), 'recognized parent definition');
    if (def.triggeredBy) assert.ok(ids.has(def.triggeredBy), 'recognized definition trigger');
    for (const id of def.executionEvents ?? []) assert.ok(ids.has(id), 'recognized definition execution');
  }
  assert.equal(annotated.size, rows.filter(row => row.recordType === undefined).length, 'all historical events annotated');
}

function sumExplicit(rows, field) {
  return rows.reduce((sum, row) => {
    if (!Object.hasOwn(row, field)) return sum;
    assert.ok(Number.isSafeInteger(row[field]) && row[field] >= 0, 'exact nonnegative count: ' + field);
    return sum + row[field];
  }, 0);
}

function assertMetric(metric, value, standing) {
  assert.equal(metric.value, value);
  assert.equal(metric.standing, standing);
}

function validateCounts(epoch, rows) {
  const historical = rows.filter(row => row.recordType === undefined);
  const fresh = rows.filter(row => row.recordType === 'execution');
  const counted = [...historical, ...fresh];
  const grouped = rows.filter(row => row.recordType === 'retrospective-annotation');
  const idsFor = group => new Set([
    ...grouped.filter(row => row.costGroup === group).map(row => row.annotatesEvent),
    ...fresh.filter(row => row.costGroup === group).map(row => row.event)
  ]);
  const tables = idsFor('table-observer');
  const ancillary = idsFor('ancillary');
  const summary = epoch.currentSummary;
  assert.equal(summary.historicalExecutionEvents, historical.length);
  assert.equal(summary.throughEvent, fresh.at(-1).event);
  for (const [key, value] of [
    ['browserLaunches', sumExplicit(counted, 'browserLaunches')],
    ['tableObserverBrowserLaunches', sumExplicit(counted.filter(row => tables.has(row.event)), 'browserLaunches')],
    ['ancillaryBrowserLaunches', sumExplicit(counted.filter(row => ancillary.has(row.event)), 'browserLaunches')],
    ['tablePrototypeCaseAttempts', sumExplicit(counted, 'prototypeCases')],
    ['explicitlyRecordedCompleteTableAttempts', sumExplicit(counted, 'completePrototypeCases')],
    ['knownAncillaryPageVisits', sumExplicit(counted.filter(row => Number.isInteger(row.prototypePageCases)), 'prototypePageCases')],
    ['sharedMaterialJourneys', sumExplicit(counted, 'materialJourneys')]
  ]) assertMetric(summary[key], value, 'exact-recorded-count');
  const wave = fresh.filter(row => row.wave === 'wave-1-2');
  for (const [key, value] of [
    ['browserLaunches', sumExplicit(wave, 'browserLaunches')],
    ['tablePrototypeCaseAttempts', sumExplicit(wave, 'prototypeCases')],
    ['fixtureAttempts', sumExplicit(wave, 'fixtureCases')],
    ['knownAncillaryPageVisits', sumExplicit(wave.filter(row => Number.isInteger(row.prototypePageCases)), 'prototypePageCases')],
    ['sharedMaterialJourneys', sumExplicit(wave, 'materialJourneys')],
    ['tableDocumentNavigations', sumExplicit(wave.filter(row => tables.has(row.event)), 'actualDocumentNavigations')],
    ['unchangedResumeReusedCases', sumExplicit(wave, 'reusedCases')],
    ['stubbedLaunchCalls', sumExplicit(wave, 'stubbedLaunchCalls')]
  ]) assertMetric(summary.wave12[key], value, 'exact-recorded-count');
  assert.deepEqual(summary.wave12.eventIds, rows.filter(row => row.wave === 'wave-1-2').map(row => row.event));
  for (const key of ['totalCompletedTableAttempts', 'uniqueTableCasesAcrossDefinitions', 'sharedMaterialPageVisits', 'totalPageVisits', 'completedRepairBatches']) {
    assertMetric(summary[key], null, 'unmeasured');
  }
  assertMetric(summary.wave12.sharedMaterialPageVisits, null, 'unmeasured');
  assert.equal(historical.find(row => row.event === 'shared-material-behavior').prototypePageCases, null);
  for (const key of ['fullBrowserCampaignsAvoided', 'netSavings', 'executionCost', 'humanEffort', 'decisionLatency', 'counterfactualComparison']) {
    assertMetric(epoch.costAccounting[key], null, 'unestimated');
    assert.ok(epoch.costAccounting[key].measurementRequirements.length > 0);
  }
}

function validateWave(epoch, rows) {
  const one = suffix => {
    const row = rows.find(item => item.event === 'wave12-' + suffix + '-2026-10-03');
    assert.ok(row, 'recorded wave event: ' + suffix);
    return row;
  };
  assert.deepEqual(one('review-repairs').findings, { python: 5, javascript: 3, total: 8 });
  assert.equal(one('screenshot-refinement').result, 'refined-before-browser-execution');
  const clearance = one('source-review-clearance');
  assert.equal(clearance.result, 'cleared');
  assert.equal(clearance.independentSourceReviews, 2);
  assert.deepEqual(clearance.checks.latest, [{ suite: 'focused-python', passed: 56 }, { suite: 'focused-node', passed: 14 }]);
  assert.deepEqual(clearance.checks.prior, [{ suite: 'packaging-and-source', passed: 47 }, { suite: 'research-epoch-record', passed: 45 }]);
  assert.equal(clearance.sourcePreservation.prototypeFiles, 4);
  assert.deepEqual(clearance.sourcePreservation.owners.map(owner => owner.tables ?? owner.staticTables), [4, 0, 0, 2]);
  const stub = one('writer-interruption-review');
  assert.equal(stub.executionMode, 'stubbed-writer-interruption-review');
  assert.deepEqual([stub.stubbedLaunchCalls, stub.browserLaunches, stub.actualPageVisits, stub.actualDocumentNavigations], [1, 0, 0, 0]);
  assert.equal(stub.phasesCoverage, 'all phases');
  assertMetric(stub.diagnostics, null, 'unmeasured');
  const closure = one('table-v3-closure');
  const resume = one('table-v3-unchanged-resume');
  const definitionHash = '8121c0244dd024b89b5f7ba1fd7beae3350f7781d924760d8d39bbebba18209b';
  for (const row of [closure, resume]) {
    assert.equal(row.result, 'pass');
    assert.equal(row.definitionHash, definitionHash);
    assert.deepEqual([row.expectedCases, row.expectedPrototypeCases, row.expectedFixtureCases, row.completeCases, row.passedCases], [39, 38, 1, 39, 39]);
    assert.equal(row.newCases + row.reusedCases, row.expectedCases);
    assert.equal(row.prototypeCases + row.fixtureCases, row.newCases);
  }
  assert.deepEqual([closure.newCases, closure.reusedCases, closure.prototypeCases, closure.completePrototypeCases, closure.fixtureCases, closure.browserLaunches, closure.actualDocumentNavigations], [39, 0, 38, 38, 1, 1, 47]);
  assert.deepEqual([resume.newCases, resume.reusedCases, resume.prototypeCases, resume.completePrototypeCases, resume.fixtureCases, resume.browserLaunches, resume.actualDocumentNavigations], [0, 39, 0, 0, 0, 0, 0]);
  assert.deepEqual([resume.reusedPrototypeCases, resume.reusedFixtureCases], [38, 1]);
  assert.deepEqual(closure.diagnostics, {
    standing: 'descriptive-diagnostic-measurements', stageExecutionMs: 19785.5865,
    stagePublicationMs: 252.423833, elapsedSeconds: 20.057,
    uniqueReads: 39, bytesHashed: 1453737, freshReads: 1393, hashMs: 1.122124
  });
  assert.deepEqual(resume.diagnostics, {
    standing: 'descriptive-diagnostic-measurements', stageExecutionMs: 194.206375,
    stagePublicationMs: 232.540209, elapsedSeconds: 0.435,
    uniqueReads: 48, bytesHashed: 17206857, freshReads: 729, hashMs: 6.551329
  });
  const conditioning = one('conditioning-material');
  assert.deepEqual([conditioning.result, conditioning.browserLaunches, conditioning.prototypePageCases], ['pass', 1, 1]);
  assert.deepEqual(conditioning.assertions, ['exact Rung 05 static record', 'authored/static and runtime prompt agreement', 'state inspector visibility', 'lastAction state transition']);
  const shared = one('shared-material');
  assert.deepEqual([shared.result, shared.browserLaunches, shared.materialJourneys, shared.completeMaterialJourneys], ['pass', 1, 2, 2]);
  assert.equal(shared.prototypePageCases, null);
  assert.equal(shared.pageCountStanding, 'unmeasured');
  const v3 = epoch.observationDefinitions.find(def => def.version === 'v3');
  assert.equal(v3.standing, 'executed-parent-reported');
  assert.equal(v3.tableDefinitionHash, definitionHash);
  assert.deepEqual(v3.executionEvents.filter(id => id.startsWith('wave12-')), [closure.event, resume.event, conditioning.event, shared.event]);
  assert.equal(epoch.prospectiveNextCampaign.standing, 'executed-parent-reported');
  assert.equal(epoch.prospectiveNextCampaign.result, 'pass');
  assert.equal(epoch.prospectiveNextCampaign.executionEvent, closure.event);
  assert.equal(epoch.prospectiveNextCampaign.unchangedResumeEvent, resume.event);
  assert.equal(epoch.prospectiveNextCampaign.expectedCaseCount, 39);
  assert.equal(epoch.prospectiveNextCampaign.passedCaseCount, 39);
  assert.equal(epoch.prospectiveNextCampaign.tableDefinitionHash, definitionHash);
  assert.equal(epoch.costAccounting.diagnosticMeasurements.standing, 'descriptive-diagnostic-measurements');
  assert.deepEqual(epoch.costAccounting.diagnosticMeasurements.events.filter(id => id.startsWith('wave12-')), [closure.event, resume.event]);
  assert.equal(epoch.currentSummary.completedHandoffs.value, 0);
  assert.equal(epoch.estimation.observedExposure, 0);
  assert.equal(epoch.estimation.standing, 'awaiting-exposure');
  assert.deepEqual(epoch.estimation.posterior, { alpha: 1, beta: 1, mean: 0.5 });
  assert.deepEqual(epoch.laterWork.map(item => [item.issue, item.standing]), [[330, 'later-separate-study'], [331, 'later-shadow-candidate']]);
}

// Synthetic windows exercise record eligibility and the existing Bernoulli rule.
// They supply no measured epoch outcomes or fitted model.
function classifyWindow(window) {
  if (!window.handoffAccepted) return { standing: 'awaiting-handoff', outcome: null };
  const time = value => typeof value === 'string' ? Date.parse(value) : NaN;
  const start = time(window.start);
  const end = time(window.end);
  const declared = time(window.declaredAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(declared) || end <= start || declared > start ||
      !window.revision || !window.family || !window.manifest || !window.humanAcceptance ||
      !window.independentReviewer || window.ascertainmentPlan !== 'declared-cases-and-linked-reports' ||
      window.severityRule !== 'blocking-or-material') return { standing: 'unmeasured', outcome: null };
  if (!Number.isFinite(time(window.observedThrough))) return { standing: 'unmeasured', outcome: null };
  if (!window.closed || time(window.observedThrough) < end) return { standing: 'censored', outcome: null };
  if (!window.ascertainmentComplete || !Array.isArray(window.findings)) return { standing: 'unmeasured', outcome: null };
  const severities = ['blocking', 'material', 'minor'];
  for (const finding of window.findings) {
    if (!finding.adjudicated || !severities.includes(finding.severity) || !Number.isFinite(time(finding.discoveredAt)) ||
        typeof finding.presentAtAcceptedRevision !== 'boolean' || typeof finding.knownAtHandoff !== 'boolean') {
      return { standing: 'unmeasured', outcome: null };
    }
  }
  const positive = window.findings.some(finding => finding.presentAtAcceptedRevision && !finding.knownAtHandoff &&
    ['blocking', 'material'].includes(finding.severity) && time(finding.discoveredAt) > start && time(finding.discoveredAt) <= end);
  return { standing: 'eligible-completed', outcome: Number(positive) };
}

function summarizeWindows(windows, prior) {
  const eligible = windows.map(classifyWindow).filter(row => row.standing === 'eligible-completed');
  const f = eligible.reduce((sum, row) => sum + row.outcome, 0);
  return { n: eligible.length, f, alpha: prior.alpha + f, beta: prior.beta + eligible.length - f,
    standing: eligible.length ? 'updated-from-eligible-outcomes' : 'awaiting-exposure' };
}

function eligibleFixture() {
  return { handoffAccepted: true, revision: 'synthetic-revision', family: 'synthetic-family', manifest: 'synthetic-manifest', humanAcceptance: 'synthetic-acceptance',
    declaredAt: '2030-01-01T00:00:00Z', start: '2030-01-02T00:00:00Z', end: '2030-01-03T00:00:00Z', observedThrough: '2030-01-03T00:00:00Z',
    independentReviewer: 'synthetic-independent-reviewer', ascertainmentPlan: 'declared-cases-and-linked-reports', severityRule: 'blocking-or-material',
    closed: true, ascertainmentComplete: true, findings: [] };
}

function finding(overrides = {}) {
  return { severity: 'material', discoveredAt: '2030-01-02T12:00:00Z', presentAtAcceptedRevision: true, knownAtHandoff: false, adjudicated: true, ...overrides };
}

test('immutable entry snapshot and original event bytes survive migration', () => {
  assert.equal(record.schemaVersion, '2');
  assert.equal(sha256(JSON.stringify(record.historicalEntry)), '4a80f09b842a814b78e41a0b83d3c3c832ae0e30c38dbf1f58696894e1535b5b');
  assert.equal(sha256(ledgerText.split('\n').slice(0, 13).join('\n') + '\n'), '2d53c277a8c3a43ae1ecc62c4789d44d2c62efe8d57ff4bffdb1df3d8c0ee332');
  assert.deepEqual(record.historicalEntry.completedCampaigns, []);
  assert.equal(record.historicalEntry.estimation.posterior, null);
  assert.equal(record.historicalEntry.entryEvidence.applicationBrowserLaunchesThisEpoch, 0);
  assert.equal(history.length, 13);
  assert.equal(annotations.length, 13);
  assert.equal(ledger.length, 36);
});

test('ledger references recognize definitions and preserve ordered dependency links', () => validateLedger(record, ledger));

for (const [name, mutate, pattern] of [
  ['duplicate event ID', rows => { rows[1].event = rows[0].event; }, /unique event ID/],
  ['unknown definition', rows => { rows[13].observationDefinition = 'v99'; }, /recognized definition/],
  ['unknown category', rows => { rows[13].category = 'invented'; }, /recognized category/],
  ['missing annotation target', rows => { rows[13].annotatesEvent = 'missing'; }, /annotation target/],
  ['unknown causal reference', rows => { rows[14].triggeredBy = ['missing']; }, /recognized causal reference/],
  ['forward causal reference', rows => { rows[14].triggeredBy = ['campaign-03']; }, /causal reference precedes/],
  ['self causal reference', rows => { rows[14].triggeredBy = ['campaign-02']; }, /causal reference precedes/],
  ['later definition backfilled into history', rows => { rows[13].observationDefinition = 'v3'; }, /historical execution retains/],
  ['backfilled prediction', rows => { rows[13].predictionBeforeExecution = 0; }, /historical prediction/],
  ['counted annotation', rows => { rows[13].browserLaunches = 0; }, /metadata supplies no execution count/]
]) test('rejects ' + name, () => {
  const rows = structuredClone(ledger);
  mutate(rows);
  assert.throws(() => validateLedger(record, rows), pattern);
});

test('recorded totals retain exact counts and explicit unmeasured quantities', () => {
  validateCounts(record, ledger);
  assert.deepEqual([record.currentSummary.browserLaunches.value, record.currentSummary.tablePrototypeCaseAttempts.value,
    record.currentSummary.knownAncillaryPageVisits.value, record.currentSummary.sharedMaterialJourneys.value], [14, 190, 4, 4]);
});

for (const [name, mutate] of [
  ['unknown Shared pages converted to zero', r => { r.currentSummary.sharedMaterialPageVisits.value = 0; }],
  ['attempts treated as total page visits', r => { r.currentSummary.totalPageVisits = { value: 182, standing: 'exact-recorded-count' }; }],
  ['journeys treated as page visits', r => { r.currentSummary.knownAncillaryPageVisits.value = 5; }],
  ['incorrect attempt total', r => { r.currentSummary.tablePrototypeCaseAttempts.value = 179; }],
  ['inferred savings', r => { r.costAccounting.netSavings.value = 0; }]
]) test('rejects ' + name, () => {
  const changed = structuredClone(record);
  mutate(changed);
  assert.throws(() => validateCounts(changed, ledger), assert.AssertionError);
});

test('v3 execution preserves unspecified pre-launch fields and cumulative invalidation', () => {
  const v3 = record.observationDefinitions.find(def => def.version === 'v3');
  assert.equal(v3.standing, 'executed-parent-reported');
  assert.equal(record.prospectiveNextCampaign.standing, 'executed-parent-reported');
  for (const key of ['recordedBeforeLaunchAt', 'sourceRevision', 'runtimeIdentity', 'expectedCaseIds', 'observedCaseIds', 'evidenceManifest']) {
    assert.equal(record.prospectiveNextCampaign[key], null);
  }
  assert.equal(record.invalidationPolicy.combination, 'ordered-cumulative-union');
  assert.deepEqual(record.invalidationPolicy.rows.map(row => row.order), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(new Set(record.invalidationPolicy.rows.map(row => row.reason)).size, 7);
  assert.equal(record.currentSummary.completedHandoffs.value, 0);
});

test('zero eligible outcomes preserve Beta(1,1) with awaiting-exposure standing', () => {
  assert.deepEqual(record.estimation.windows, []);
  const update = summarizeWindows(record.estimation.windows, record.estimation.prior);
  assert.deepEqual(update, { n: 0, f: 0, alpha: 1, beta: 1, standing: 'awaiting-exposure' });
  assert.equal(record.estimation.observedExposure, update.n);
  assert.equal(record.estimation.qualifyingOutcomes, update.f);
  assert.equal(record.estimation.observedZeroOutcomes, update.n - update.f);
  assert.deepEqual(record.estimation.posterior, { alpha: update.alpha, beta: update.beta, mean: 0.5 });
  assert.equal(record.estimation.standing, update.standing);
});

for (const [name, override, expected] of [
  ['observed eligible zero', {}, { standing: 'eligible-completed', outcome: 0 }],
  ['awaiting handoff', { handoffAccepted: false }, { standing: 'awaiting-handoff', outcome: null }],
  ['unmeasured end', { end: null }, { standing: 'unmeasured', outcome: null }],
  ['unmeasured follow-up', { observedThrough: null }, { standing: 'unmeasured', outcome: null }],
  ['retrospectively declared window', { declaredAt: '2030-01-02T01:00:00Z' }, { standing: 'unmeasured', outcome: null }],
  ['missing severity', { severityRule: null }, { standing: 'unmeasured', outcome: null }],
  ['missing ascertainment', { ascertainmentComplete: false }, { standing: 'unmeasured', outcome: null }],
  ['missing independent reviewer', { independentReviewer: null }, { standing: 'unmeasured', outcome: null }],
  ['missing manifest', { manifest: null }, { standing: 'unmeasured', outcome: null }],
  ['censored in-progress window', { closed: false }, { standing: 'censored', outcome: null }],
  ['censored early stop', { observedThrough: '2030-01-02T12:00:00Z' }, { standing: 'censored', outcome: null }],
  ['positive finding in an open window', { closed: false, findings: [finding()] }, { standing: 'censored', outcome: null }],
  ['unadjudicated finding', { findings: [finding({ adjudicated: false })] }, { standing: 'unmeasured', outcome: null }],
  ['missing findings', { findings: null }, { standing: 'unmeasured', outcome: null }],
  ['late defect', { findings: [finding()] }, { standing: 'eligible-completed', outcome: 1 }],
  ['several late defects', { findings: [finding(), finding({ severity: 'blocking' })] }, { standing: 'eligible-completed', outcome: 1 }],
  ['minor finding', { findings: [finding({ severity: 'minor' })] }, { standing: 'eligible-completed', outcome: 0 }],
  ['pre-handoff finding', { findings: [finding({ knownAtHandoff: true })] }, { standing: 'eligible-completed', outcome: 0 }],
  ['later introduced defect', { findings: [finding({ presentAtAcceptedRevision: false })] }, { standing: 'eligible-completed', outcome: 0 }],
  ['finding after window', { findings: [finding({ discoveredAt: '2030-01-04T00:00:00Z' })] }, { standing: 'eligible-completed', outcome: 0 }],
  ['finding at end boundary', { findings: [finding({ discoveredAt: '2030-01-03T00:00:00Z' })] }, { standing: 'eligible-completed', outcome: 1 }],
  ['finding at handoff boundary', { findings: [finding({ discoveredAt: '2030-01-02T00:00:00Z' })] }, { standing: 'eligible-completed', outcome: 0 }]
]) test('window fixture: ' + name, () => assert.deepEqual(classifyWindow({ ...eligibleFixture(), ...override }), expected));

test('one completed negative window updates the existing prior once', () => {
  assert.deepEqual(summarizeWindows([eligibleFixture()], record.estimation.prior),
    { n: 1, f: 0, alpha: 1, beta: 2, standing: 'updated-from-eligible-outcomes' });
});

test('multiple qualifying defects in one completed window update the prior once', () => {
  assert.deepEqual(summarizeWindows([{ ...eligibleFixture(), findings: [finding(), finding()] }], record.estimation.prior),
    { n: 1, f: 1, alpha: 2, beta: 1, standing: 'updated-from-eligible-outcomes' });
});

test('unmeasured and censored windows supply no Bernoulli zero', () => {
  assert.deepEqual(summarizeWindows([{ ...eligibleFixture(), end: null }, { ...eligibleFixture(), closed: false }], record.estimation.prior),
    { n: 0, f: 0, alpha: 1, beta: 1, standing: 'awaiting-exposure' });
});

test('original annotations and plan remain byte-identical after execution append', () => {
  assert.equal(sha256(ledgerText.split('\n').slice(0, 27).join('\n') + '\n'), '38103b538d083407f305d86775ead560e34b41d7d22beeccd9b0ec4f3c3e45ca');
  const plan = ledger.find(row => row.event === 'planned-wave-1-2-2026-10-03');
  assert.equal(plan.standing, 'planned-not-executed');
  assert.equal(plan.result, null);
});

test('wave return preserves supplied outcomes, diagnostics and exposure boundary', () => validateWave(record, ledger));

for (const [name, suffix, field, value] of [
  ['stub counted as actual browser', 'writer-interruption-review', 'browserLaunches', 1],
  ['fixture counted as prototype attempt', 'table-v3-closure', 'prototypeCases', 39],
  ['resume counted as fresh attempts', 'table-v3-unchanged-resume', 'prototypeCases', 38],
  ['Shared unknown pages coerced to zero', 'shared-material', 'prototypePageCases', 0],
  ['changed closure definition', 'table-v3-closure', 'definitionHash', 'invented'],
  ['lost final fixture pass', 'table-v3-closure', 'passedCases', 38]
]) test('wave rejects ' + name, () => {
  const changed = structuredClone(ledger);
  changed.find(row => row.event === 'wave12-' + suffix + '-2026-10-03')[field] = value;
  assert.throws(() => validateWave(record, changed), assert.AssertionError);
});

test('diagnostic counters retain supplied precision and scope', () => {
  const changed = structuredClone(ledger);
  changed.find(row => row.event === 'wave12-table-v3-unchanged-resume-2026-10-03').diagnostics.bytesHashed = 1453737;
  assert.throws(() => validateWave(record, changed), assert.AssertionError);
});

test('browser completion supplies no eligible handoff outcome', () => {
  const changed = structuredClone(record);
  changed.estimation.observedExposure = 1;
  assert.throws(() => validateWave(changed, ledger), assert.AssertionError);
});

test('new execution links also require a known preceding event', () => {
  const changed = structuredClone(ledger);
  changed.find(row => row.event === 'wave12-table-v3-closure-2026-10-03').triggeredBy = ['missing'];
  assert.throws(() => validateLedger(record, changed), /recognized causal reference/);
});

function validateScopeAddition(epoch, rows) {
  const events = rows.filter(row => row.wave === 'scope-addition');
  assert.equal(events.length, 1, 'one user-scope event');
  const row = events[0];
  assert.equal(row.event, 'scope-plain-labels-v3-resume-2026-10-03');
  assert.equal(row.requestClassification, 'user-requested-scope-addition-after-completed-batch');
  assert.equal(row.outcomeClassification, 'additional-requested-work; outside-eligible-late-defect-outcomes');
  assert.deepEqual([row.scopeChange.owner, row.scopeChange.authoredDataLabelAttributes, row.scopeChange.editedSurface,
    row.scopeChange.visibleAuthoredText], ['Investment Studio', 18, 'authored data-label attributes only', 'preserved']);
  assert.equal(row.executionMode, 'affected-source-resume');
  const v3 = epoch.observationDefinitions.find(def => def.version === 'v3');
  assert.equal(row.definitionHash, v3.tableDefinitionHash);
  assert.equal(v3.executionEvents.at(-1), row.event);
  assert.equal(row.result, 'pass');
  assert.deepEqual([row.expectedCases, row.expectedPrototypeCases, row.expectedFixtureCases,
    row.completeCases, row.passedCases], [39, 38, 1, 39, 39]);
  assert.deepEqual([row.newCases, row.prototypeCases, row.completePrototypeCases, row.fixtureCases,
    row.reusedCases, row.reusedPrototypeCases, row.reusedFixtureCases], [12, 12, 12, 0, 27, 26, 1]);
  assert.equal(row.newCases + row.reusedCases, row.expectedCases);
  assert.equal(row.reusedPrototypeCases + row.reusedFixtureCases, row.reusedCases);
  assert.deepEqual([row.browserLaunches, row.actualDocumentNavigations], [1, 15]);
  assert.deepEqual(row.publication, { standing: 'whole-requested-population-complete',
    assembly: 'fresh-affected-and-retained-unchanged', records: 39, broadCampaignRepeated: false });
  assert.deepEqual(row.diagnostics, {
    standing: 'descriptive-diagnostic-measurements', stageExecutionMs: 11005.993084,
    stagePublicationMs: 257.714584, elapsedSeconds: 11.287, uniqueReads: 45,
    bytesHashed: 12530468, freshReads: 927, hashMs: 5.236169
  });
  assert.deepEqual(epoch.costAccounting.diagnosticMeasurements.events, [
    'wave12-table-v3-closure-2026-10-03', 'wave12-table-v3-unchanged-resume-2026-10-03', row.event
  ]);
  assert.equal(row.eligibleHandoffExposure, 0);
  assert.equal(row.handoffOutcome, null);
  assert.equal(epoch.estimation.observedExposure, 0);
  assert.equal(epoch.estimation.standing, 'awaiting-exposure');
  assert.deepEqual(epoch.currentSummary.scopeAddition, {
    event: row.event, standing: 'parent-reported-user-scope-addition; receiving-handoff-pending',
    owner: 'Investment Studio', authoredDataLabelAttributes: 18, newPrototypeCases: 12,
    reusedPrototypeCases: 26, reusedFixtureCases: 1, publishedPassingRecords: 39,
    browserLaunches: 1, actualDocumentNavigations: 15
  });
  assert.deepEqual(epoch.currentSummary.wave12, epoch.asOfWave12Summary.wave12);
}

test('one user-scope addition retains exact selection, publication and diagnostics', () => validateScopeAddition(record, ledger));

for (const [name, mutate] of [
  ['scope mislabeled as a discovered defect', row => { row.requestClassification = 'late-defect'; }],
  ['scope counted as an eligible zero', row => { row.handoffOutcome = 0; }],
  ['new fixture attempt invented', row => { row.fixtureCases = 1; }],
  ['retained fixture omitted', row => { row.reusedFixtureCases = 0; }],
  ['retained evidence counted as fresh', row => { row.prototypeCases = 39; }],
  ['navigation count inferred from cases', row => { row.actualDocumentNavigations = 12; }],
  ['broad campaign invented', row => { row.publication.broadCampaignRepeated = true; }],
  ['changed scope-resume definition', row => { row.definitionHash = 'invented'; }],
  ['diagnostic precision lost', row => { row.diagnostics.stageExecutionMs = 11006; }]
]) test('scope addition rejects ' + name, () => {
  const changed = structuredClone(ledger);
  mutate(changed.find(row => row.wave === 'scope-addition'));
  assert.throws(() => validateScopeAddition(record, changed), assert.AssertionError);
});

test('the complete earlier ledger and Wave 1/2 summary retain their as-of bytes and values', () => {
  assert.equal(sha256(ledgerText.split('\n').slice(0, 35).join('\n') + '\n'), 'd723f1525062af65234068939adc12c099bdd4eabcf0483bf0baf6a80755dac1');
  assert.equal(sha256(JSON.stringify(record.asOfWave12Summary)), 'e61841f86b4303ca673d5388f7a80d3f2a7d0a0c1a6cd0d335fab3bfc569ef4c');
  assert.equal(record.asOfWave12Summary.throughEvent, 'wave12-shared-material-2026-10-03');
  assert.deepEqual([record.asOfWave12Summary.browserLaunches.value,
    record.asOfWave12Summary.tablePrototypeCaseAttempts.value], [13, 178]);
});
