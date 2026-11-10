import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExamplePlan, preparePlan, prepareChangeSettings, prepareImport, parsePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createChangeSettings, listChangeFrameworks, listInterpretiveLenses } from '../../collaboration/native-investment-studio/change-models.mjs';
import { SCHEMA_BYTE_LIMITS, LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

const component = (settings, framework = 'kotter', id = 'urgency') => settings.frameworkMaps.find(row => row.frameworkId === framework).components.find(row => row.componentId === id);
function ability(id = 'history') {
  return { id, definitionId: 'inspect-history', definitionVersion: '1.0.0', context: null, teamId: null,
    responsiblePersonIds: [], decisionOwnerPersonId: null, lifecycle: 'active', prerequisites: [], supportBindings: [] };
}

test('interpretation changes retain component identity, roles, relative units and every monetary result', () => {
  const plan = createExamplePlan();
  plan.people[0].role.change = { frameworkId: 'kotter', componentId: 'anchor-in-culture' };
  component(plan.changeSettings).workIds = ['review'];
  component(plan.changeSettings).capabilityRefs = [{ kind: 'practice', instanceId: 'shared-expectations' }];
  component(plan.changeSettings, 'npt', 'collective-action').status = 'outside';
  const original = preparePlan(plan), frameworks = listChangeFrameworks();
  for (const [index, lens] of listInterpretiveLenses().entries()) {
    const candidate = structuredClone(original.state), framework = frameworks[index % frameworks.length];
    candidate.changeSettings.activeFramework = { frameworkId: framework.id, version: framework.version };
    candidate.changeSettings.lens = { lensId: lens.id, version: lens.version };
    candidate.changeSettings.attention.channels.forEach((row, position) => { row.parts = index === 0 ? 0 : position === 0 ? 25 : 1; });
    candidate.changeSettings.frameworkMaps.reverse();
    candidate.changeSettings.frameworkMaps.forEach(row => row.components.reverse());
    candidate.changeSettings.attention.channels.reverse();
    const next = preparePlan(candidate);
    assert.deepEqual(next.result, original.result);
    assert.deepEqual(next.state.people, original.state.people);
    assert.deepEqual(component(next.state.changeSettings).workIds, ['review']);
    assert.equal(component(next.state.changeSettings, 'npt', 'collective-action').status, 'outside');
    assert.deepEqual(next.change.components.map(row => row.componentId), framework.components.map(row => row.id));
    assert.equal(next.change.attention.totalParts, index === 0 ? 0 : 32);
    assert.equal(parsePlan(next.serialized).serialized, next.serialized);
  }
  const owned = prepareChangeSettings(plan.changeSettings);
  owned.frameworkMaps[0].components[0].workIds.length = 0;
  assert.deepEqual(component(plan.changeSettings).workIds, ['review']);
  assert.equal(Object.isFrozen(plan.changeSettings), false);
});

test('finite settings admit exact versions and complete maps while rejecting malformed entries before getters run', () => {
  const cases = [
    [row => { row.activeFramework.version = '2.0.0'; }, 'change-framework'],
    [row => { row.lens.lensId = 'unlisted'; }, 'change-lens'],
    [row => { row.sourceFilter = 'everything'; }, 'choice'],
    [row => { row.frameworkMaps.pop(); }, 'change-frameworks'],
    [row => { row.frameworkMaps[1] = row.frameworkMaps[0]; }, 'duplicate-reference'],
    [row => { row.frameworkMaps[0].components.pop(); }, 'change-components'],
    [row => { row.frameworkMaps[0].components[1] = row.frameworkMaps[0].components[0]; }, 'duplicate-reference'],
    [row => { component(row).componentId = 'coherence'; }, 'change-component'],
    [row => { component(row).mapped = 1; }, 'boolean'],
    [row => { component(row).status = 'complete'; }, 'choice'],
    [row => { component(row).workIds = ['review', 'review']; }, 'duplicate-reference'],
    [row => { component(row).capabilityRefs = Array(2).fill({ kind: 'ability', instanceId: 'history' }); }, 'duplicate-reference'],
    [row => { row.attention.version = '2.0.0'; }, 'change-attention'],
    [row => { row.attention.channels.pop(); }, 'change-channels'],
    [row => { row.attention.channels[1] = row.attention.channels[0]; }, 'duplicate-reference'],
    [row => { row.attention.channels[0].channelId = 'coherence'; }, 'change-channel'],
    ...[-1, 26, 1.5, '12'].map(parts => [row => { row.attention.channels[0].parts = parts; }, 'integer']),
    [row => { row.extra = true; }, 'fields'],
  ];
  for (const [mutate, code] of cases) {
    const value = createChangeSettings(); mutate(value);
    assert.throws(() => prepareChangeSettings(value), { code });
  }
  let reads = 0;
  const accessor = createChangeSettings();
  Object.defineProperty(component(accessor), 'mapped', { enumerable: true, get() { reads += 1; return true; } });
  assert.throws(() => prepareChangeSettings(accessor), { code: 'data-property' });
  const oversized = createChangeSettings(); oversized.attention.channels.length = 9;
  Object.defineProperty(oversized.attention.channels, '0', { enumerable: true, get() { reads += 1; return null; } });
  assert.throws(() => prepareChangeSettings(oversized), { code: 'collection' });
  assert.equal(reads, 0);
});

test('typed component links resolve against their own collections without becoming evidence of completed support', () => {
  const plan = createExamplePlan(); plan.abilities = [ability()];
  const row = component(plan.changeSettings); row.status = 'look';
  row.workIds = ['review']; row.capabilityRefs = [{ kind: 'ability', instanceId: 'history' }];
  const projection = preparePlan(plan);
  assert.ok(projection.change.mappingGaps.some(row => row.componentId === 'urgency'));
  assert.equal(projection.capabilities.abilities[0].support, 'proposed');
  assert.equal(projection.capabilities.abilities[0].recordedStage, null);
  row.status = 'outside'; row.mapped = true;
  assert.equal(preparePlan(plan).change.mappingGaps.some(row => row.componentId === 'urgency'), false);
  row.mapped = false;
  assert.equal(preparePlan(plan).change.mappingGaps.some(row => row.componentId === 'urgency'), true);
  row.workIds = ['missing']; assert.throws(() => preparePlan(plan), { code: 'reference' });
  row.workIds = []; row.capabilityRefs[0].kind = 'practice';
  assert.throws(() => preparePlan(plan), { code: 'reference' });
});

test('exact 0.4 admission preserves capabilities, observations and relationship meaning before adding settings', () => {
  const old = createExamplePlan(); old.schemaVersion = '0.4.0'; delete old.changeSettings; delete old.assuranceSettings; delete old.scoreSettings; delete old.arrangements; delete old.investmentSettings; old.people = old.people.map(({ availability, ...row }) => row); old.work = old.work.map(row => ({ ...row, timing: null }));
  old.revision = 7; old.abilities = [ability()]; old.people[0].lifecycle = 'retired';
  old.people[0].role.change = { frameworkId: 'weick', componentId: 'retention' };
  old.capabilityEvidence = [{ id: 'observed', subject: { kind: 'ability', instanceId: 'history' }, stage: 'rehearsed',
    context: 'A synthetic request review', observation: 'The reviewer located the earlier decision.', recorderPersonId: 'product-one',
    reviewBoundary: 'Repeat with an unfamiliar request.', observedPlanRevision: 6 }];
  const bytes = JSON.stringify(old), receipt = prepareImport(bytes), next = receipt.projection;
  assert.equal(receipt.sourceSchemaVersion, '0.4.0');
  assert.equal(next.state.schemaVersion, '0.11.0');
  assert.equal(next.state.modelVersion, '0.1.0');
  const { changeSettings, assuranceSettings, scoreSettings, arrangements, investmentSettings, ...restored } = next.state;
  assert.deepEqual({ ...restored, people: restored.people.map(({ availability, ...row }) => row), schemaVersion: '0.4.0' }, old);
  assert.equal(scoreSettings.window, null); assert.ok(restored.people.every(row => row.availability === null));
  assert.deepEqual(changeSettings, createChangeSettings());
  assert.equal(next.capabilities.abilities[0].recordedStage, 'rehearsed');
  assert.equal(next.result.knownCommitmentCents, 120000);
  assert.equal(JSON.stringify(old), bytes);
  assert.equal(parsePlan(next.serialized).serialized, next.serialized);
  old.changeSettings = createChangeSettings();
  assert.throws(() => preparePlan(old), { code: 'fields' });
  assert.deepEqual(Object.fromEntries(Object.entries(SCHEMA_BYTE_LIMITS).slice(0, 4)), {
    '0.1.0': 524288, '0.2.0': 546029, '0.3.0': 4114641, '0.4.0': 9095416,
  });
  const exactTransport = bytes + ' '.repeat(SCHEMA_BYTE_LIMITS['0.4.0'] - Buffer.byteLength(bytes));
  assert.equal(prepareImport(exactTransport).projection.serialized, next.serialized);
  assert.throws(() => prepareImport(`${exactTransport} `), { code: 'bytes' });
});

test('current component links share the exact 16384-reference budget while the archived 0.4 profile remains exact', () => {
  const plan = createExamplePlan(); plan.practices = []; plan.abilities = [ability()];
  plan.people = Array.from({ length: 128 }, (_, i) => ({ ...plan.people[0], id: `person-${i}`, rateCentsPerHour: 0 }));
  const ids = plan.people.map(row => row.id);
  plan.teams = Array.from({ length: 32 }, (_, i) => ({ id: `team-${i}`, label: 'Team', personIds: ids, lifecycle: 'active' }));
  plan.work = Array.from({ length: 96 }, (_, i) => ({ ...plan.work[0], id: `session-${i}`, teamId: 'team-0', personIds: i === 95 ? ids.slice(0, 32) : ids }));
  // 4096 memberships +12192 participants +96 owners =16384 references.
  const old = { ...plan, schemaVersion: '0.4.0' }; delete old.changeSettings; delete old.assuranceSettings; delete old.scoreSettings; delete old.arrangements; delete old.investmentSettings; old.people = old.people.map(({ availability, ...row }) => row); old.work = old.work.map(row => ({ ...row, timing: null }));
  assert.equal(preparePlan(old).state.schemaVersion, '0.11.0');
  old.abilities[0].teamId = 'team-0'; assert.throws(() => preparePlan(old), { code: 'reference-budget' });
  old.abilities[0].teamId = null;
  const row = component(plan.changeSettings); row.workIds = ['session-0'];
  assert.throws(() => preparePlan(plan), { code: 'reference-budget' });
  plan.work.at(-1).personIds.pop();
  const exact = preparePlan(plan); assert.equal(exact.result.knownCommitmentCents, 0);
  row.capabilityRefs = [{ kind: 'ability', instanceId: 'history' }];
  assert.throws(() => preparePlan(plan), { code: 'reference-budget' });
  row.workIds = [];
  assert.equal(preparePlan(plan).result.knownCommitmentCents, 0);
  assert.equal(parsePlan(exact.serialized).serialized, exact.serialized);
  assert.equal(LIMITS.references, 16384);
});

test('full typed component lists with maximum identifiers remain self-importable within the bounded envelope', () => {
  const plan = createExamplePlan(), id = prefix => prefix.padEnd(64, 'x');
  plan.people = [{ ...plan.people[0], id: id('person'), rateCentsPerHour: 0 }];
  plan.teams = [{ ...plan.teams[0], id: id('team'), personIds: [plan.people[0].id] }];
  plan.work = Array.from({ length: 256 }, (_, index) => ({ ...plan.work[0], id: id(`work-${index}`), teamId: plan.teams[0].id, personIds: [plan.people[0].id] }));
  plan.abilities = Array.from({ length: 128 }, (_, index) => ability(id(`ability-${index}`)));
  plan.practices = Array.from({ length: 128 }, (_, index) => ({ ...ability(id(`practice-${index}`)), definitionId: 'expectation' }));
  const workIds = plan.work.map(row => row.id), capabilityRefs = [...plan.abilities.map(row => ({ kind: 'ability', instanceId: row.id })), ...plan.practices.map(row => ({ kind: 'practice', instanceId: row.id }))];
  plan.changeSettings.frameworkMaps.forEach(mapping => mapping.components.forEach(row => {
    row.workIds = workIds; row.capabilityRefs = capabilityRefs; row.mapped = false; row.status = 'outside';
  }));
  const current = preparePlan(plan);
  assert.ok(Buffer.byteLength(current.serialized) <= SCHEMA_BYTE_LIMITS['0.11.0']);
  assert.equal(parsePlan(current.serialized).serialized, current.serialized);
  assert.equal(component(current.state.changeSettings).capabilityRefs.at(-1).instanceId, id('practice-127'));
});
