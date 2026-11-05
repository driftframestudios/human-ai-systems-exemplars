import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExamplePlan, preparePlan, parsePlan, prepareImport, prepareCapability, prepareCapabilityEvidence } from '../../collaboration/native-investment-studio/contract.mjs';
import { listCapabilities, listCapabilityVersions, getCapabilityDefinition, capabilityWorkIds, createLegacyPractice } from '../../collaboration/native-investment-studio/capabilities.mjs';
import { SCHEMA_BYTE_LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

function instance(kind, definitionId, id = definitionId, prerequisites = []) {
  const definition = getCapabilityDefinition(kind, definitionId, '1.0.0');
  return { id, definitionId, definitionVersion: '1.0.0', context: 'A synthetic service-request handoff.', teamId: 'delivery',
    responsiblePersonIds: ['product-one'], decisionOwnerPersonId: 'product-one', lifecycle: 'active', prerequisites,
    supportBindings: definition.supportRequirements.map(row => ({ requirementId: row.id, workIds: ['allocated', 'review'] })) };
}
function plan() {
  const plan = createExamplePlan(); plan.people = [plan.people[0]]; plan.people[0].fundedMinutes = 9600;
  plan.teams[0].personIds = ['product-one']; plan.practices = [];
  const session = plan.work[0];
  plan.work = [{ ...session, id: 'allocated', personIds: ['product-one'], minutesPerOccurrence: 60, occurrences: 4, funding: 'allocated' },
    { ...session, personIds: ['product-one'], minutesPerOccurrence: 90, occurrences: 1 }];
  return plan;
}
const edge = (kind, instanceId) => ({ kind, instanceId });
const evidence = (subject = edge('ability', 'handoff')) => ({ id: 'walkthrough', subject, stage: 'rehearsed',
  context: 'A synthetic missed-handoff walkthrough.', observation: 'The receiving person recovered the saved request and explained the next action.',
  recorderPersonId: 'product-one', reviewBoundary: 'A reviewer still needs an observation in the operating context.', observedPlanRevision: 0 });

test('the versioned catalogue carries the seven abilities, six practices and exact legacy support meaning', () => {
  assert.deepEqual(listCapabilities('ability').map(row => row.id), ['compare-alternatives', 'recover-interrupted-work', 'approve-change', 'trace-evidence', 'edit-records-in-bulk', 'coordinate-handoff', 'inspect-history']);
  assert.deepEqual(listCapabilities('practice').map(row => row.id), ['expectation', 'focalization', 'experimentation', 'opportunity', 'continuity', 'assurance']);
  for (const kind of ['ability', 'practice']) for (const row of listCapabilityVersions(kind)) {
    assert.equal(getCapabilityDefinition(kind, row.id, row.version), row);
    assert.ok(Object.isFrozen(row)); assert.ok(Object.isFrozen(row.supportRequirements));
    for (const field of ['action', 'actor', 'explanation', 'acceptanceJob', 'estimateUnits']) assert.ok(row[field].length);
    assert.ok(row.assumptions.length); assert.equal(row.source.owner, 'native-investment-studio');
    for (const required of row.prerequisiteDefinitions) assert.ok(getCapabilityDefinition(required.kind, required.definitionId, required.definitionVersion));
  }
  const legacy = getCapabilityDefinition('practice', 'assurance', '0.0.0');
  assert.equal(legacy.retired, true); assert.deepEqual(legacy.supportRequirements.map(row => row.id), ['general-support']);
  assert.equal(legacy.replacement.definitionVersion, '1.0.0');
  assert.equal(getCapabilityDefinition('ability', 'constructor', '1.0.0'), null);
});

test('a shared prerequisite diamond retains one funding account and one supporting-work union per instance', () => {
  const candidate = plan();
  candidate.practices = [instance('practice', 'expectation', 'agreement'),
    instance('practice', 'continuity', 'continuity', [edge('practice', 'agreement')]),
    instance('practice', 'opportunity', 'opportunity', [edge('practice', 'agreement')])];
  candidate.abilities = [instance('ability', 'coordinate-handoff', 'handoff', [edge('practice', 'continuity'), edge('practice', 'opportunity')])];
  const projection = preparePlan(candidate);
  assert.equal(projection.result.fundedKnownCents, 1600000, '160 funded hours × $100/hour');
  assert.equal(projection.result.allocatedKnownCents, 40000, 'four participant-hours remain inside funding');
  assert.equal(projection.result.additionalKnownCents, 15000, 'the separately purchased review adds $150');
  assert.equal(projection.result.knownCommitmentCents, 1615000);
  assert.equal(projection.result.capacity[0].remainingMinutes, 9360);
  const support = projection.capabilities.abilities[0];
  assert.equal(support.support, 'supported'); assert.deepEqual(support.gaps, []);
  assert.deepEqual(support.workIds, ['allocated', 'review']); assert.deepEqual(support.sharedWorkIds, ['allocated', 'review']);
  assert.deepEqual(support.amounts, { allocatedKnownCents: 40000, additionalKnownCents: 15000, knownCents: 55000, standing: 'priced' });
  assert.deepEqual(capabilityWorkIds(candidate.abilities[0]), ['allocated', 'review']);
  assert.equal(parsePlan(projection.serialized).serialized, projection.serialized);
});

test('card scopes round independently while the plan settles the complete person funding pool', () => {
  const candidate = plan();
  candidate.people[0].fundedMinutes = 0; candidate.people[0].rateCentsPerHour = 100;
  candidate.work = ['first', 'second'].map(id => ({ ...candidate.work[1], id, minutesPerOccurrence: 1, occurrences: 1 }));
  candidate.abilities = candidate.work.map(work => ({ ...instance('ability', 'inspect-history', work.id),
    supportBindings: ['preparation', 'review'].map(requirementId => ({ requirementId, workIds: [work.id] })) }));
  const projection = preparePlan(candidate);
  assert.deepEqual(projection.capabilities.abilities.map(row => row.amounts.additionalKnownCents), [2, 2]);
  assert.equal(projection.result.additionalKnownCents, 3, 'two person-minutes at one dollar per hour settle together');
  assert.equal(projection.result.lineRoundingAdjustments.additionalCents, -1);
  candidate.people[0].rateCentsPerHour = null;
  const incomplete = preparePlan(candidate);
  assert.equal(incomplete.result.plannedCommitmentCents, null);
  assert.ok(incomplete.capabilities.abilities.every(row => row.amounts.standing === 'incomplete'));
});

test('recorded evidence retains context and revision while current support gaps change', () => {
  const candidate = plan(); candidate.abilities = [instance('ability', 'inspect-history', 'handoff')];
  candidate.capabilityEvidence = [evidence()];
  const before = preparePlan(candidate);
  assert.equal(before.capabilities.abilities[0].support, 'supported');
  assert.equal(before.capabilities.abilities[0].recordedStage, 'rehearsed');
  candidate.work[1].status = 'paused'; candidate.revision = 1;
  const after = preparePlan(candidate);
  assert.deepEqual(after.state.capabilityEvidence, before.state.capabilityEvidence);
  assert.equal(after.capabilities.abilities[0].recordedStage, 'rehearsed');
  assert.equal(after.capabilities.abilities[0].support, 'proposed');
  assert.ok(after.capabilities.abilities[0].gaps.some(row => row.code === 'support-unavailable' && row.workId === 'review'));
  assert.equal(after.result.knownCommitmentCents, 1615000);
  candidate.capabilityEvidence[0].observedPlanRevision = 2;
  assert.throws(() => preparePlan(candidate), { code: 'evidence-revision' });
});

test('absent planning values are gaps while malformed, surplus, dangling and cyclic values reject', () => {
  const candidate = plan(), proposed = instance('ability', 'inspect-history', 'history');
  Object.assign(proposed, { context: null, teamId: null, responsiblePersonIds: [], decisionOwnerPersonId: null, supportBindings: [] });
  candidate.abilities = [proposed];
  assert.deepEqual(preparePlan(candidate).capabilities.abilities[0].gaps.map(row => row.code), ['context-needed', 'team-needed', 'responsible-person-needed', 'decision-owner-needed', 'support-needed', 'support-needed']);
  for (const [mutate, code] of [
    [row => { row.definitionVersion = 'future'; }, 'capability-definition'],
    [row => { row.context = ''; }, 'relationship-text'],
    [row => { row.extra = true; }, 'fields'],
    [row => { row.supportBindings = [{ requirementId: 'made-up', workIds: [] }]; }, 'support-requirement'],
    [row => { row.prerequisites = [edge('ability', 'missing')]; }, 'reference'],
    [row => { row.prerequisites = [edge('ability', 'history')]; }, 'capability-cycle'],
    [row => { row.prerequisites = [edge('ability', 'history'), edge('ability', 'history')]; }, 'duplicate-reference'],
  ]) {
    const value = structuredClone(candidate); mutate(value.abilities[0]); assert.throws(() => preparePlan(value), { code });
  }
  let reads = 0; const guarded = structuredClone(proposed);
  Object.defineProperty(guarded, 'context', { enumerable: true, get() { reads++; return 'context'; } });
  assert.throws(() => prepareCapability(guarded, 'ability'), { code: 'data-property' }); assert.equal(reads, 0);
  const invalidEvidence = evidence(); invalidEvidence.recorderPersonId = null;
  assert.throws(() => prepareCapabilityEvidence(invalidEvidence), { code: 'text' });
});

test('the capability, evidence and edge bounds distinguish the exact accepted limit from one more', () => {
  for (const [collection, kind, definitionId] of [['abilities', 'ability', 'inspect-history'], ['practices', 'practice', 'expectation']]) {
    const candidate = plan(); candidate[collection] = Array.from({ length: 128 }, (_, i) => ({ ...instance(kind, definitionId, `item-${i}`), supportBindings: [] }));
    assert.equal(preparePlan(candidate).state[collection].length, 128);
    candidate[collection].push({ ...candidate[collection][0], id: 'one-more' });
    assert.throws(() => preparePlan(candidate), { code: 'collection' });
  }
  const candidate = plan(); candidate.abilities = [instance('ability', 'inspect-history', 'handoff')];
  candidate.capabilityEvidence = Array.from({ length: 256 }, (_, i) => ({ ...evidence(), id: `record-${i}` }));
  assert.equal(preparePlan(candidate).state.capabilityEvidence.length, 256);
  candidate.capabilityEvidence.push({ ...evidence(), id: 'one-more' }); assert.throws(() => preparePlan(candidate), { code: 'collection' });
  candidate.capabilityEvidence = [];
  candidate.abilities = Array.from({ length: 128 }, (_, i) => ({ ...instance('ability', 'inspect-history', `item-${i}`), supportBindings: [], prerequisites: [] }));
  for (let i = 64; i < 128; i++) candidate.abilities[i].prerequisites = Array.from({ length: 8 }, (_, j) => edge('ability', `item-${j}`));
  assert.equal(preparePlan(candidate).state.abilities.length, 128);
  candidate.abilities[127].prerequisites.push(edge('ability', 'item-8'));
  assert.throws(() => preparePlan(candidate), { code: 'prerequisite-budget' });
});

test('genuine old envelopes preserve exact profile meaning before migrating ordered support', () => {
  const base = createExamplePlan(); delete base.abilities; delete base.capabilityEvidence; delete base.changeSettings; delete base.assuranceSettings; delete base.scoreSettings; base.people = base.people.map(({ availability, ...row }) => row); base.work = base.work.map(row => ({ ...row, timing: null }));
  base.practices = [{ id: 'legacy', practiceId: 'continuity', teamId: 'delivery', workIds: ['review'] }];
  base.people[0].role.decisionId = 'approves'; base.people[0].lifecycle = 'retired';
  base.people[1].rateCentsPerHour = null; base.people[2].rateCentsPerHour = 0;
  base.contributions = [{ id: 'draft', categoryId: 'draft-artifacts', receiverPersonId: 'product-one', decisionOwnerPersonId: 'engineering-one', workIds: ['review'], reviewBoundary: null, decisionBoundary: 'The person decides.' }];
  for (const version of ['0.1.0', '0.2.0', '0.3.0']) {
    const old = structuredClone(base); old.schemaVersion = version;
    if (version !== '0.3.0') {
      delete old.contributions; delete old.connections;
      for (const person of old.people) { delete person.role; delete person.lifecycle; }
      for (const row of [...old.teams, ...old.work]) delete row.lifecycle;
    }
    if (version === '0.1.0') delete old.purpose;
    const bytes = JSON.stringify(old), receipt = prepareImport(bytes), migrated = receipt.projection;
    assert.equal(receipt.sourceSchemaVersion, version); assert.equal(migrated.state.schemaVersion, '0.7.0');
    assert.deepEqual(migrated.state.practices[0], createLegacyPractice('legacy', 'continuity', 'delivery', ['review']));
    assert.deepEqual(migrated.state.people.map(row => row.rateCentsPerHour), [10000, null, 0, 10000]);
    if (version === '0.3.0') { assert.equal(migrated.state.people[0].lifecycle, 'retired'); assert.equal(migrated.state.people[0].role.decisionId, 'approves'); assert.deepEqual(migrated.state.contributions, old.contributions); }
    assert.equal(parsePlan(migrated.serialized).serialized, migrated.serialized);
    old.abilities = []; assert.throws(() => preparePlan(old), { code: 'fields' });
    assert.equal(bytes, JSON.stringify(JSON.parse(bytes)));
  }
  assert.equal(SCHEMA_BYTE_LIMITS['0.1.0'], 524288);
  assert.equal(SCHEMA_BYTE_LIMITS['0.2.0'], 546029);
});

test('new plan references share one aggregate budget with existing memberships and sessions', () => {
  const candidate = createExamplePlan(); candidate.practices = [];
  candidate.people = Array.from({ length: 128 }, (_, i) => ({ ...candidate.people[0], id: `person-${i}`, rateCentsPerHour: 0 }));
  const ids = candidate.people.map(row => row.id);
  candidate.teams = Array.from({ length: 32 }, (_, i) => ({ id: `team-${i}`, label: 'Team', personIds: ids, lifecycle: 'active' }));
  candidate.work = Array.from({ length: 96 }, (_, i) => ({ ...candidate.work[0], id: `session-${i}`, teamId: 'team-0', personIds: i === 95 ? ids.slice(0, 32) : ids }));
  candidate.abilities = [{ ...instance('ability', 'inspect-history'), context: null, teamId: null, responsiblePersonIds: [], decisionOwnerPersonId: null, supportBindings: [] }];
  // 32×128 memberships +95×128 participants +32 participants +96 work owners =16,384.
  const accepted = preparePlan(candidate); assert.equal(accepted.result.knownCommitmentCents, 0);
  candidate.abilities[0].teamId = 'team-0';
  assert.throws(() => preparePlan(candidate), { code: 'reference-budget' });
  assert.equal(parsePlan(accepted.serialized).serialized, accepted.serialized);
});

test('maximum new escaped context and evidence fields remain self-importable within the new envelope', () => {
  const candidate = plan(), label = prefix => `${prefix}`.padEnd(64, 'x'), full = '\u0000'.repeat(600);
  candidate.revision = Number.MAX_SAFE_INTEGER - 1;
  for (const [kind, collection, definitionId] of [['ability', 'abilities', 'inspect-history'], ['practice', 'practices', 'expectation']]) {
    candidate[collection] = Array.from({ length: 128 }, (_, i) => ({ ...instance(kind, definitionId, label(`${kind}-${i}`)), context: full }));
  }
  candidate.capabilityEvidence = Array.from({ length: 256 }, (_, i) => ({ ...evidence(edge('ability', candidate.abilities[i % 128].id)), id: label(`evidence-${i}`), context: full, observation: full, reviewBoundary: full, observedPlanRevision: candidate.revision }));
  const current = preparePlan(candidate);
  assert.equal(current.state.abilities[127].context, full);
  assert.equal(current.state.capabilityEvidence[255].observation, full);
  assert.ok(Buffer.byteLength(current.serialized) <= SCHEMA_BYTE_LIMITS['0.7.0']);
  assert.equal(parsePlan(current.serialized).serialized, current.serialized);
});
