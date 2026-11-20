import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FIXTURE_NAMES, createFixture, templateFixture, templateRequest, population, literalFixture } from './fixtures.mjs';
const source = resolve(process.env.NATIVE_STUDIO_SOURCE_ROOT ?? new URL('./.local/app', import.meta.url).pathname);
const module = name => import(pathToFileURL(resolve(source, `collaboration/native-investment-studio/${name}.mjs`)));
const { createExamplePlan, preparePlan } = await module('contract');
const { createStudio } = await module('state');
const { createDraftCoordinator } = await module('editing');
const { makeConnectionTarget } = await module('command-draft');
const { prepareCoordinationTemplate, applyCoordinationTemplate } = await module('connection-templates');
const expectedReferences = { small: 60, representative: 1280, caps: 8192, 'byte-pressure': 8192 };
for (const name of FIXTURE_NAMES) test(`${name}: literal accounting and independently declared references survive canonical admission`, () => {
  const fixture = createFixture(name, createExamplePlan), projection = preparePlan(fixture.plan);
  assert.equal(fixture.facts.references, expectedReferences[name]);
  assert.equal(projection.result.knownCommitmentCents, fixture.expected.commitmentCents);
  assert.equal(projection.result.plannedCommitmentCents, fixture.expected.commitmentCents);
  assert.equal(projection.result.allocatedKnownCents, fixture.expected.allocatedCents);
  assert.equal(population(projection.state).references, expectedReferences[name]);
  assert.deepEqual(projection.state.connections[0].workIds, fixture.plan.work.slice(0, 7).map(row => row.id));
  assert.equal(fixture.plan.connections[0].status, 'paused');
});
test('exact reference limit rejects one extra supporting reference; source bytes stay owned', () => {
  const fixture = createFixture('caps', createExamplePlan), original = JSON.stringify(fixture.plan);
  const extra = structuredClone(fixture.plan); extra.connections[0].workIds.push(extra.work[7].id);
  assert.throws(() => preparePlan(extra), error => error.code === 'reference-budget');
  assert.equal(JSON.stringify(fixture.plan), original);
});
test('all proposal populations add literal recovery once and one Undo restores business fields', () => {
  for (const name of FIXTURE_NAMES) {
    const fixture = templateFixture(createFixture(name, createExamplePlan));
    const studio = createStudio(fixture.plan), base = studio.read();
    const proposal = prepareCoordinationTemplate(base, templateRequest(fixture, true));
    assert.equal(proposal.projection.result.knownCommitmentCents, fixture.expected.recoveryCents);
    assert.equal(studio.read(), base);
    const accepted = applyCoordinationTemplate(studio, proposal); assert.equal(accepted.ok, true);
    assert.equal(studio.readHistory().undoCount, 1);
    assert.equal(studio.undo(studio.read()).ok, true);
    assert.deepEqual({ ...studio.read().state, revision: 0 }, base.state);
  }
});
test('zero and unknown rates retain separate pricing meanings', () => {
  const fixture = literalFixture(createExamplePlan);
  const zero = structuredClone(fixture.plan), unknown = structuredClone(fixture.plan);
  zero.people[0].rateCentsPerHour = 0; unknown.people[0].rateCentsPerHour = null;
  assert.equal(preparePlan(zero).result.plannedCommitmentCents, 0);
  assert.equal(preparePlan(unknown).result.plannedCommitmentCents, null);
});

test('literal shared-edge attribution stays400 inside16000; explicit recovery adds150 once', () => {
  const fixture = literalFixture(createExamplePlan), studio = createStudio(fixture.plan), base = studio.read();
  assert.equal(base.result.knownCommitmentCents, 1600000); assert.equal(base.result.allocatedKnownCents, 40000);
  const paused = studio.applyCommand({ type: 'connection.status.set', connectionId: fixture.targetId, status: 'active' }, base);
  assert.equal(paused.ok, true); assert.equal(studio.read().result.knownCommitmentCents, 1600000);
  const proposal = prepareCoordinationTemplate(studio.read(), templateRequest(fixture, true));
  assert.equal(proposal.projection.result.knownCommitmentCents, 1615000);
  assert.equal(applyCoordinationTemplate(studio, proposal).ok, true);
  assert.equal(studio.undo(studio.read()).ok, true); assert.equal(studio.read().result.knownCommitmentCents, 1600000);
});

test('each workload retains raw edits through equal-payload import and explicit current-state review', () => {
  for (const name of FIXTURE_NAMES) {
    const fixture = createFixture(name, createExamplePlan), studio = createStudio(fixture.plan), editing = createDraftCoordinator(studio);
    try {
      const before = studio.read(), target = makeConnectionTarget('connection.update', fixture.targetId);
      const opened = editing.connection.begin(target, before); assert.equal(opened.ok, true);
      const token = opened.view.draft.token;
      assert.equal(editing.connection.setText(token, 'responseExpectation', 'Retained review request').ok, true);
      assert.equal(studio.importText(before.serialized, before).ok, true);
      assert.equal(editing.connection.apply(token).error.code, 'stale-edit');
      assert.equal(editing.connection.read().draft.raw.responseExpectation, 'Retained review request');
      assert.equal(editing.connection.review(token, before).error.code, 'stale-edit');
      const reviewed = editing.connection.review(token, studio.read()); assert.equal(reviewed.ok, true);
      assert.equal(editing.connection.apply(reviewed.view.draft.token).ok, true);
      assert.equal(studio.read().state.connections[0].responseExpectation, 'Retained review request');
      assert.equal(studio.read().result.knownCommitmentCents, fixture.expected.commitmentCents);
    } finally { editing.dispose(); }
  }
});
