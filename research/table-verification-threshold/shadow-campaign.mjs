import '../../tools/node-runtime-admission.mjs';

// Trusted local research adapter. Application execution and acceptance stay with their owners.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { open, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { betaPosterior, betaAnyEvent } from './model.mjs';

export const contract = 'campaign-yield-shadow/1';
export const target = 'At least one new consequential application finding in the complete declared campaign';
const root = new URL('./', import.meta.url);
const defaultLedger = fileURLToPath(new URL('epochs/table-repair-01-events.jsonl', root));
const hash = value => createHash('sha256').update(value).digest('hex');
const token = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/u.test(value);
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const time = value => typeof value === 'string' && /Z$/u.test(value) && Number.isFinite(Date.parse(value));
function shape(value, keys) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Expected a named record');
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Use the declared fields');
}
function ids(value, maximum = 512) {
  assert(Array.isArray(value) && value.length <= maximum, 'Expected a bounded ID array');
  for (const item of value) assert(token(item), 'Use public semantic IDs, not locators or free-form logs');
  assert.equal(new Set(value).size, value.length, 'IDs are unique');
}
function identity(value) {
  shape(value, ['revision', 'sourceSha256', 'definitionSha256', 'runtimeSha256']);
  assert(value.revision === null || /^[a-f0-9]{40}$/u.test(value.revision), 'Use a full revision or null');
  for (const key of ['sourceSha256', 'definitionSha256', 'runtimeSha256']) assert(value[key] === null || sha(value[key]), key);
}
function admitCampaign(c) {
  shape(c, ['id', 'cohort', 'repairCluster', 'families', 'expectedCases', 'caseIds', 'identity', 'sourceFrozen',
    'sourceChanges', 'knownFindings', 'existingEvidence', 'requiredClosure', 'focusedQuestion', 'sourceReviewGates', 'deterministicChecks']);
  for (const key of ['id', 'cohort', 'repairCluster']) assert(token(c[key]), key);
  assert(c.id.length <= 142, 'Campaign IDs reserve 18 characters for the prediction event identity');
  for (const key of ['families', 'sourceChanges', 'knownFindings']) ids(c[key]);
  assert(c.families.length > 0);
  assert(Number.isSafeInteger(c.expectedCases) && c.expectedCases > 0 && c.expectedCases <= 512);
  if (c.caseIds !== null) { ids(c.caseIds); assert.equal(c.caseIds.length, c.expectedCases); }
  identity(c.identity);
  for (const key of ['sourceFrozen', 'requiredClosure']) assert.equal(typeof c[key], 'boolean');
  assert(['missing', 'stale', 'matching'].includes(c.existingEvidence));
  assert(c.focusedQuestion === null || token(c.focusedQuestion));
  for (const [key, statuses] of [['sourceReviewGates', ['clear', 'open']], ['deterministicChecks', ['pass', 'pending', 'fail']]]) {
    assert(Array.isArray(c[key]) && c[key].length > 0 && c[key].length <= 64);
    ids(c[key].map(g => g.id), 64);
    for (const g of c[key]) { shape(g, ['id', 'status']); assert(statuses.includes(g.status)); }
  }
}
function admitPacket(packet) {
  shape(packet, ['contract', 'approval', 'campaigns']); assert.equal(packet.contract, contract);
  shape(packet.approval, ['reviewer', 'reviewedAt', 'bundleSha256']);
  const a = packet.approval;
  assert(a.reviewer === null || token(a.reviewer));
  assert(a.reviewedAt === null || time(a.reviewedAt));
  assert(a.bundleSha256 === null || sha(a.bundleSha256));
  assert(Array.isArray(packet.campaigns) && packet.campaigns.length > 0 && packet.campaigns.length <= 2);
  packet.campaigns.forEach(admitCampaign); ids(packet.campaigns.map(c => c.id), 2);
}
export function assessReadiness(c, approved) {
  admitCampaign(c);
  const reasons = c.sourceChanges.map(id => 'source-change:' + id);
  reasons.push('evidence:' + c.existingEvidence);
  const hold = [];
  if (!approved) hold.push('protocol-review-required');
  if (!c.sourceFrozen || Object.values(c.identity).some(v => v === null) || c.caseIds === null) hold.push('frozen-evidence-identity-required');
  for (const g of c.sourceReviewGates) if (g.status !== 'clear') hold.push('open-gate:' + g.id);
  const checks = c.deterministicChecks.filter(g => g.status !== 'pass').map(g => g.status + '-check:' + g.id);
  if (hold.length) return { action: 'hold-coherent-batch', reasons: [...reasons, ...hold, ...checks] };
  if (checks.length) return { action: 'run-focused', reasons: [...reasons, ...checks, 'complete-deterministic-prerequisites-before-closure'] };
  if (c.requiredClosure) return { action: 'run-required-closure', reasons: [...reasons, 'required-final-evidence-after-last-relevant-change'] };
  if (c.focusedQuestion) return { action: 'run-focused', reasons: [...reasons, 'named-question:' + c.focusedQuestion] };
  return { action: 'hold-coherent-batch', reasons: [...reasons, 'name-the-next-required-observation'] };
}
function admitObservation(o) {
  shape(o, ['predictionEvent', 'status', 'startedAt', 'endedAt', 'identity', 'completedCaseIds', 'manifestSha256', 'adjudication', 'findings', 'metrics']);
  assert(token(o.predictionEvent));
  assert(['complete', 'partial', 'cancelled', 'not-started'].includes(o.status));
  for (const key of ['startedAt', 'endedAt']) assert(o[key] === null || time(o[key]), key);
  identity(o.identity); ids(o.completedCaseIds);
  assert(o.manifestSha256 === null || sha(o.manifestSha256));
  shape(o.adjudication, ['status', 'reviewer']);
  assert(['complete', 'pending'].includes(o.adjudication.status));
  assert(o.adjudication.reviewer === null || token(o.adjudication.reviewer));
  assert(Array.isArray(o.findings) && o.findings.length <= 512); ids(o.findings.map(f => f.id));
  for (const f of o.findings) {
    shape(f, ['id', 'kind', 'new']);
    assert(['application-consequential', 'application-minor', 'harness'].includes(f.kind));
    assert.equal(typeof f.new, 'boolean');
  }
  shape(o.metrics, ['browserLaunches', 'caseAttempts', 'durationSeconds']);
  for (const [key, value] of Object.entries(o.metrics)) {
    assert(value === null || (Number.isFinite(value) && value >= 0 && value <= 1e9 && (key === 'durationSeconds' || Number.isSafeInteger(value))), key);
  }
}
export function classifyOutcome(prediction, o, recordedAt) {
  admitObservation(o); assert(time(recordedAt)); assert.equal(o.predictionEvent, prediction.event);
  const c = prediction.campaign, reasons = [];
  const start = Date.parse(o.startedAt), end = Date.parse(o.endedAt), now = Date.parse(recordedAt);
  if (!Number.isFinite(start) || start <= Date.parse(prediction.recordedAt) || start > now || !Number.isFinite(end) || end < start || end > now) reasons.push('prospective-start-and-terminal-times-required');
  if (o.status !== 'complete') reasons.push('censored-' + o.status);
  const completed = new Set(o.completedCaseIds);
  if (completed.size !== c.caseIds.length || !c.caseIds.every(id => completed.has(id))) reasons.push('declared-population-incomplete-or-substituted');
  if (Object.keys(c.identity).some(key => c.identity[key] !== o.identity[key])) reasons.push('evidence-identity-changed');
  if (o.manifestSha256 === null) reasons.push('source-bound-manifest-required');
  if (o.adjudication.status !== 'complete' || o.adjudication.reviewer === null) reasons.push('independent-adjudication-required');
  const qualifying = o.findings.filter(f => f.kind === 'application-consequential' && f.new && !c.knownFindings.includes(f.id)).map(f => f.id);
  return { value: reasons.length ? null : Number(qualifying.length > 0),
    standing: reasons.length ? 'indeterminate-or-censored' : 'complete-adjudicated-campaign',
    qualifyingFindingIds: qualifying, harnessFindingIds: o.findings.filter(f => f.kind === 'harness').map(f => f.id), reasons };
}
export function forecast(records, cohort) {
  const predictions = new Map(), clusters = new Set(), included = [], observed = new Set();
  let events = 0;
  for (const r of records) {
    if (r.contract !== contract) continue;
    if (r.shadowKind === 'prediction') {
      assert(r.campaign && token(r.campaign.cohort) && token(r.campaign.repairCluster));
      if (r.campaign.cohort !== cohort) continue;
      const first = !clusters.has(r.campaign.repairCluster);
      clusters.add(r.campaign.repairCluster); predictions.set(r.event, { record: r, first });
    } else if (r.shadowKind === 'outcome') {
      const p = predictions.get(r.observation?.predictionEvent);
      if (!p || !p.first || observed.has(p.record.event)) continue;
      observed.add(p.record.event);
      const outcome = classifyOutcome(p.record, r.observation, r.recordedAt);
      if (outcome.value !== null) { events += outcome.value; included.push(r.event); }
    }
  }
  const n = included.length, posterior = betaPosterior(1, 1, events, n);
  return { target, unit: 'one-declared-campaign-per-repair-cluster-within-cohort', cohort,
    likelihood: 'Bernoulli under explicitly assumed within-cohort exchangeability',
    prior: { distribution: 'Beta', a: 1, b: 1, standing: 'elicited-uncalibrated-assumption' },
    eligibleCampaigns: n, events, includedOutcomeEvents: included,
    posterior: { distribution: 'Beta', ...posterior },
    probabilityAtLeastOneNewConsequentialFinding: betaAnyEvent(posterior.a, posterior.b, 1),
    sensitivity: [[1, 3], [3, 1]].map(([a, b]) => { const p = betaPosterior(a, b, events, n); return { prior: { a, b }, posterior: p, probability: betaAnyEvent(p.a, p.b, 1) }; }),
    empiricalEstimate: n ? { standing: 'assumption-conditional-local-update', point: posterior.mean } : { standing: 'abstain-insufficient-eligible-outcomes', point: null },
    calibration: 'absent', horizon: 'through completion and independent adjudication of the frozen declared campaign',
    elapsedTimeForecast: null, lateDefectProbability: null, savingsEstimate: null };
}
function selected(packet, id) {
  admitPacket(packet); const c = packet.campaigns.find(c => c.id === id); assert(c, 'Declared campaign ID required'); return c;
}
function approved(packet, bundle, now) {
  return packet.approval.bundleSha256 === bundle.sha256 && token(packet.approval.reviewer) && time(packet.approval.reviewedAt) && Date.parse(packet.approval.reviewedAt) <= Date.parse(now);
}
export function preview(packet, id, records, bundle, now) {
  assert(time(now)); const c = selected(packet, id);
  return { contract, standing: 'draft-not-counted', campaign: c, readiness: assessReadiness(c, approved(packet, bundle, now)),
    forecast: forecast(records, c.cohort), bundleSha256: bundle.sha256, authority: 'shadow-observer; mandatory checks and human acceptance remain authoritative' };
}
export function createPrediction(packet, id, records, bundle, now) {
  const draft = preview(packet, id, records, bundle, now);
  assert.equal(draft.readiness.action, 'run-required-closure', 'Record the campaign forecast after protocol/source/review/prerequisite clearance; plan retains hold/focused decisions');
  const event = 'shadow-' + id + '-prediction'; assert(!records.some(r => r.event === event), 'Prediction already recorded; preserve it');
  const firstInCluster = !records.some(r => r.contract === contract && r.shadowKind === 'prediction' && r.campaign.cohort === draft.campaign.cohort && r.campaign.repairCluster === draft.campaign.repairCluster);
  return { ...draft, event, recordType: 'plan', category: 'application-campaign', shadowKind: 'prediction', standing: 'prospective-shadow',
    recordedOn: now.slice(0, 10), recordedAt: now, approval: packet.approval, populationSha256: hash(JSON.stringify(draft.campaign.caseIds)),
    firstInCluster, likelihoodEligibility: firstInCluster ? 'await-complete-adjudicated-outcome' : 'supplemental-same-cluster; excluded-from-likelihood',
    countsAsBrowserExecution: false };
}
export function createOutcome(o, records, now, currentBundle) {
  admitObservation(o); assert(time(now));
  const p = records.find(r => r.contract === contract && r.shadowKind === 'prediction' && r.event === o.predictionEvent);
  assert(p, 'Matching prospective prediction required');
  assert(sha(currentBundle?.sha256), 'Current reviewed bundle identity required');
  assert.equal(currentBundle.sha256, p.approval?.bundleSha256, 'Current reviewed bundle must match the prediction approved bundle');
  assert.equal(p.bundleSha256, p.approval?.bundleSha256, 'Prediction bundle must match its recorded approval');
  const event = p.event.replace(/-prediction$/u, '-outcome'); assert(!records.some(r => r.event === event), 'Terminal outcome already recorded; retain its original disposition');
  return { contract, event, recordType: 'review', category: 'application-campaign', shadowKind: 'outcome', recordedOn: now.slice(0, 10), recordedAt: now,
    triggeredBy: [p.event], bundleSha256: currentBundle.sha256, standing: 'parent-supplied-observation', observation: o,
    outcome: classifyOutcome(p, o, now), countsAsBrowserExecution: false, eligibleLateDefectWindow: null, eligibleTimeExposureMinutes: null };
}
async function boundedText(file, limit) {
  assert((await stat(file)).size <= limit, 'Trusted local input exceeds the bounded adapter envelope');
  const bytes = await readFile(file); assert(bytes.length <= limit); return bytes.toString('utf8');
}
export async function bundleIdentity() {
  const names = ['model.mjs', 'shadow-campaign.mjs', 'shadow-campaign.test.mjs', 'shadow-campaign-protocol.md', 'shadow-campaign-inputs.json'];
  const files = [];
  for (const name of names) files.push({ path: name, sha256: hash(await boundedText(new URL(name, root), 512 * 1024)) });
  return { sha256: hash(JSON.stringify(files)), files };
}
export async function runCli(argv) {
  const args = [...argv]; let ledger = defaultLedger;
  const option = args.indexOf('--ledger');
  if (option >= 0) { assert.equal(option, args.length - 2); ledger = args[option + 1]; assert(ledger); args.splice(option); }
  const [command, file, id] = args;
  if (command === 'contract') { assert.equal(args.length, 1); return { contract, target, ...(await bundleIdentity()) }; }
  assert(['plan', 'predict', 'observe'].includes(command), 'Use contract, plan INPUT CAMPAIGN, predict INPUT CAMPAIGN, or observe OUTCOME');
  assert.equal(args.length, command === 'observe' ? 2 : 3);
  const input = JSON.parse(await boundedText(file, 256 * 1024));
  const previous = await boundedText(ledger, 4 * 1024 * 1024);
  const records = previous.trim() ? previous.trim().split('\n').map(JSON.parse) : [];
  const now = new Date().toISOString();
  let result;
  if (command === 'observe') result = createOutcome(input, records, now, await bundleIdentity());
  else {
    const bundle = await bundleIdentity();
    result = command === 'plan' ? preview(input, id, records, bundle, now) : createPrediction(input, id, records, bundle, now);
  }
  if (command !== 'plan') {
    // One parent serializes writes. A failed/uncertain write returns to ledger inspection, not blind retry.
    const line = (previous.length && !previous.endsWith('\n') ? '\n' : '') + JSON.stringify(result) + '\n';
    assert(Buffer.byteLength(previous) + Buffer.byteLength(line) <= 4 * 1024 * 1024, 'Ledger envelope reached; return to review');
    const handle = await open(ledger, 'a');
    try { await handle.writeFile(line, 'utf8'); await handle.sync(); } finally { await handle.close(); }
  }
  return command === 'observe' ? { record: result, updatedModel: forecast([...records, result], records.find(r => r.event === input.predictionEvent).campaign.cohort) } : result;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runCli(process.argv.slice(2)).then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n')).catch(error => {
    process.stderr.write('Shadow adapter: ' + error.message + '\n'); process.exitCode = 1;
  });
}
