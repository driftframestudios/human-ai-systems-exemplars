import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';
import { createChangeSettings } from '../../collaboration/native-investment-studio/change-models.mjs';
import {
  createAssuranceSettings, listQualityConcepts, listQualityAttentionAreas, listSourcePresets,
  getSourcePreset, sourcePresetSnapshot, sourcePresetEstimate, listLearningPromptDefinitions,
  getLearningPromptDefinition, listRehearsalDefinitions, getRehearsalDefinition,
  projectAssurance, projectLearning, projectSigmaReference,
} from '../../collaboration/native-investment-studio/assurance-models.mjs';
import { estimateQualityReference, estimateRecoveryReference } from '../../collaboration/investment-analysis/staffing-adapter.mjs';

const core = createRequire(import.meta.url)('../../collaboration/investment-analysis/core.js');
const original = await readFile(new URL('../../collaboration/initiative-costing-calculator/index.html', import.meta.url), 'utf8');
function literal(name) {
  const marker = '  var ' + name + '=', start = original.indexOf(marker) + marker.length;
  assert.ok(start >= marker.length);
  return JSON.parse(JSON.stringify(vm.runInNewContext('(' + original.slice(start, original.indexOf(';\n', start)) + ')')));
}
const originalPresets = literal('presets'), originalConcepts = literal('qualityConcepts');
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);
const plan = () => ({ people: [{ id: 'reviewer', rateCentsPerHour: 10000 }, { id: 'specialist', rateCentsPerHour: 20000 }], changeSettings: createChangeSettings() });
const recoveryEvent = () => ({ id: 'replay', label: 'Replay the interrupted task', included: true, lifecycle: 'active',
  eventCount: 2, aggregateMinutesPerEvent: 90, receiverPersonId: 'reviewer', reviewBoundary: null, workIds: [] });

test('native quality and scenario definitions preserve all original labels, effort units, rates and source rows', () => {
  assert.deepEqual(listQualityConcepts().map(row => row.label), originalConcepts);
  assert.deepEqual(listQualityAttentionAreas().map(row => [row.label, row.description]), literal('qualityAttention'));
  assert.deepEqual(listSourcePresets().map(row => ({ name: row.name, h: row.horizon.quantity, u: row.horizon.unit,
    c: row.complexity, k: row.namedUnknowns,
    roles: row.roles.map(item => [item.label, item.people, item.rateCentsPerHour / 100, item.allocationPercent]),
    activities: row.activities.map(item => [item.label, item.count, item.aggregateMinutesPerItem / 60]),
    disruptions: row.disruptions.map(item => [item.label, item.eventCount, item.aggregateMinutesPerEvent / 60]) })), originalPresets);
  assert.deepEqual(listRehearsalDefinitions().map(row => [row.id, row.version]),
    [['review-change', '1.0.0'], ['recovery-failure', '1.0.0'], ['specialist-unavailable', '1.0.0']]);
  const cold = { toString() { throw new Error('A lookup should preserve this object.'); } };
  assert.equal(getSourcePreset(cold), null); assert.equal(getSourcePreset('discovery-alignment', cold), null);
  assert.equal(getRehearsalDefinition(cold, '1.0.0'), null); assert.equal(getRehearsalDefinition('review-change', cold), null);
  assert.equal(getRehearsalDefinition('review-change', '0.0.0'), null);
  assert.throws(() => { listSourcePresets()[0].roles[0].rateCentsPerHour = 1; }, TypeError);
});

test('each complete source scenario still uses the original staffing formula owner', () => {
  listSourcePresets().forEach((preset, index) => {
    const source = originalPresets[index];
    const rows = data => data.map(([name, a, b, c]) => ({ enabled: true, name, a, b, ...(c === undefined ? {} : { c }) }));
    const reference = { horizon: source.h, unit: source.u, roles: rows(source.roles), activities: rows(source.activities),
      disruptions: rows(source.disruptions), qualityEnabled: true, qualityAllocation: 18, qualityRate: 195,
      sigma: 3, unknowns: source.k, complexity: source.c, overlap: { activities: 1, recovery: 1, quality: 1 } };
    assert.deepEqual(sourcePresetSnapshot(preset.id), reference);
    assert.deepEqual(sourcePresetEstimate(preset.id), core.staffing(reference));
  });
});

test('quality and recovery estimates have independent input boundaries and explicit zero rates', () => {
  const settings = createAssuranceSettings(), state = plan();
  settings.context.referenceHorizon = { quantity: 80, unit: 'hours' };
  settings.context.recoveryRatePersonIds = ['reviewer', 'specialist'];
  settings.recoveryEvents.push(recoveryEvent());
  const first = projectAssurance(settings, state);
  close(first.quality.estimate.hours, 15.84);
  assert.equal(first.quality.estimate.amountCents, 308880);
  assert.equal(first.recovery.estimate.hours, 3);
  assert.equal(first.recovery.estimate.amountCents, 45000);
  settings.quality.additionalShareBasisPoints = 5000; settings.recoveryAdditionalShareBasisPoints = 5000;
  const shared = projectAssurance(settings, state);
  assert.equal(shared.quality.estimate.amountCents, 154440);
  assert.equal(shared.recovery.estimate.amountCents, 22500);
  settings.context.referenceHorizon = null;
  const noHorizon = projectAssurance(settings, state);
  assert.equal(noHorizon.quality.estimate.status, 'unavailable');
  assert.equal(noHorizon.quality.estimate.hours, null);
  assert.equal(noHorizon.recovery.estimate.amountCents, 22500);
  state.people[1].rateCentsPerHour = null;
  const missingRate = projectAssurance(settings, state);
  assert.equal(missingRate.recovery.estimate.status, 'unavailable');
  assert.equal(missingRate.recovery.estimate.amountCents, null);
  assert.equal(missingRate.recovery.estimate.hours, 3);
  state.people.forEach(row => { row.rateCentsPerHour = 0; });
  assert.equal(projectAssurance(settings, state).recovery.estimate.amountCents, 0);
  settings.recoveryEvents[0].lifecycle = 'paused'; settings.context.recoveryRatePersonIds = [];
  assert.equal(projectAssurance(settings, state).recovery.estimate.amountCents, 0);
  settings.quality.included = false; settings.quality.independentRateCentsPerHour = null;
  assert.equal(projectAssurance(settings, state).quality.estimate.amountCents, 0);
});

test('partial estimates preserve known effort and avoid assigning unprovided rates', () => {
  const quality = createAssuranceSettings().quality;
  quality.independentRateCentsPerHour = null;
  const reading = estimateQualityReference(quality, { quantity: 80, unit: 'hours' });
  assert.equal(reading.status, 'unavailable'); close(reading.hours, 15.84); assert.equal(reading.amountCents, null);
  const recovery = estimateRecoveryReference([recoveryEvent()], plan().people, [], 10000);
  assert.equal(recovery.status, 'unavailable'); assert.equal(recovery.hours, 3); assert.equal(recovery.amountCents, null);
});

test('normal reference and attention weights retain the original centered two-sided illustration', () => {
  const definitions = ['erf', 'sigmaTail', 'curvePoint'].map(name => original.match(new RegExp('  function ' + name + '\\([^\\n]+'))[0]).join('\n');
  const reference = vm.runInNewContext(definitions + '\n({sigmaTail,curvePoint})');
  for (const halfSteps of [2, 5, 6, 9, 12]) {
    const result = projectSigmaReference(halfSteps, 15.84, 1.1);
    close(result.tailProbability, reference.sigmaTail(halfSteps / 2), 1e-14);
    assert.equal(result.processShift, 0);
    close(result.attention.reduce((sum, row) => sum + row.hours, 0), 15.84);
  }
  const sigma = projectSigmaReference(6, 15.84, 1.1);
  assert.deepEqual(sigma.attention.map(row => row.weight), [21, 16, 17, 12, 20, 12, 18]);
  assert.deepEqual(sigma.curve.find(row => row.z === 0), { z: 0, x: 350, y: 30 });
  close(sigma.tailPerMillion, 2699.9345626295, .000001);
  assert.ok(projectSigmaReference(6, null, 1.1).attention.every(row => row.hours === null));
});

test('every scenario learning family preserves its original complete prompt and retained historical IDs', () => {
  const functionSource = original.match(/  function learningRender\([^\n]+/u)[0];
  const changeComponents = literal('changeComponents');
  for (const [index, preset] of listSourcePresets().entries()) {
    const settings = createAssuranceSettings(), change = createChangeSettings(), receiver = { innerHTML: '' };
    settings.context.sourcePresetId = preset.id; settings.context.namedUnknowns = preset.namedUnknowns;
    settings.quality.concepts[0].included = false;
    const context = { learningDisclosureSnapshot: () => new Set(), presets: originalPresets, changeComponents,
      qualityConcepts: originalConcepts, escapeHtml: value => value,
      state: { preset: index, allocations: change.attention.channels.map(row => row.parts), quality: settings.quality.concepts.map(row => row.included) },
      $: id => id === 'learning-list' ? receiver : id === 'unknowns' ? { value: settings.context.namedUnknowns } : { checked: settings.quality.included } };
    vm.runInNewContext(functionSource + '\nlearningRender();', context);
    const labels = [...receiver.innerHTML.matchAll(/<summary>(.*?)<\/summary>/gu)].map(match => match[1]);
    const prompts = [...receiver.innerHTML.matchAll(/<br>(.*?)<\/p>/gu)].map(match => match[1]);
    const current = projectLearning(settings, change);
    assert.deepEqual(current.map(row => row.label), labels);
    assert.deepEqual(current.map(row => row.prompt), prompts);
    assert.ok(current.every(row => getLearningPromptDefinition(row.promptId)));
  }
  const stored = getLearningPromptDefinition('source-framing');
  const settings = createAssuranceSettings(); settings.context.sourcePresetId = 'regulated-workflow';
  assert.ok(projectLearning(settings, createChangeSettings()).every(row => row.promptId !== stored.id));
  assert.equal(getLearningPromptDefinition(stored.id), stored);
  assert.equal(new Set(listLearningPromptDefinitions().map(row => row.id)).size, listLearningPromptDefinitions().length);
});

test('projected records preserve caller ownership and earlier rehearsal observations', () => {
  const settings = createAssuranceSettings(), state = plan();
  settings.quality.concepts[0].workIds.push('acceptance-review');
  settings.recoveryEvents.push(recoveryEvent());
  settings.learningActions.push({ id: 'learn', promptId: 'source-framing', context: 'Pilot', decisionOwnerPersonId: 'reviewer', reviewBoundary: null, workIds: ['acceptance-review'] });
  settings.rehearsals.push({ id: 'rehearsal', definitionId: 'review-change', definitionVersion: '1.0.0',
    context: 'Pilot', assumptions: 'The reviewer is available.', response: 'Clarify the instructions.', reviewerPersonId: 'reviewer',
    observedPlanRevision: 2, observation: 'The reviewer could identify the next recovery step.', workIds: [], connectionIds: [], personIds: ['reviewer'] });
  const before = JSON.stringify(settings), reading = projectAssurance(settings, state);
  assert.equal(JSON.stringify(settings), before);
  settings.quality.concepts[0].workIds.push('second-review');
  settings.rehearsals[0].personIds.push('specialist');
  assert.deepEqual(reading.quality.concepts[0].workIds, ['acceptance-review']);
  assert.deepEqual(reading.rehearsals[0].records[0].personIds, ['reviewer']);
  assert.equal(reading.rehearsals[0].records[0].observation, 'The reviewer could identify the next recovery step.');
  assert.throws(() => { reading.rehearsals[0].records[0].personIds.push('other'); }, TypeError);
});

test('the ESM adapter receives an already-cached CommonJS core without depending on a Node global', () => {
  const adapter = new URL('../../collaboration/investment-analysis/staffing-adapter.mjs', import.meta.url).href;
  const coreUrl = new URL('../../collaboration/investment-analysis/core.js', import.meta.url).href;
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
    const core = createRequire(${JSON.stringify(import.meta.url)})(${JSON.stringify(new URL(coreUrl).pathname)});
    globalThis.InvestmentCore = { staffing() { throw new Error('Use the imported module owner.'); } };
    const adapter = await import(${JSON.stringify(adapter)});
    const settings = { included: true, allocationPercent: 18, independentRateCentsPerHour: 19500, sigmaHalfSteps: 6, additionalShareBasisPoints: 10000 };
    assert.equal(adapter.estimateQualityReference(settings, { quantity: 80, unit: 'hours' }).amountCents, 308880);
    assert.equal(adapter.STAFFING_REFERENCE.coreVersion, core.VERSION);
  `], { stdio: 'pipe' });
});
