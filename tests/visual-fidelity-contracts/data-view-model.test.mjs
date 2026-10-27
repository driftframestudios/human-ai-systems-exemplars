import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  admitDataViewFixture,
  chooseRenderer,
  createDataSemanticTwin,
  createDataViewState,
  exportDataViewState,
  pageRecords,
  reduceDataViewState,
} from '../../visual-fidelity-contracts/labs/data-view-lab/src/model.js';
import { valueText } from '../../visual-fidelity-contracts/labs/data-view-lab/src/semantics.js';

const ROOT = new URL('../../visual-fidelity-contracts/labs/data-view-lab/', import.meta.url);
const current = JSON.parse(await readFile(new URL('fixtures/valid/current.json', ROOT), 'utf8'));
const partial = JSON.parse(await readFile(new URL('fixtures/valid/partial.json', ROOT), 'utf8'));
const absent = JSON.parse(await readFile(new URL('fixtures/valid/absent.json', ROOT), 'utf8'));
const invalid = JSON.parse(await readFile(new URL('fixtures/invalid/value-standing-mismatch.json', ROOT), 'utf8'));
const schema = JSON.parse(await readFile(new URL('schemas/data-view-lab.schema.json', ROOT), 'utf8'));

test('data-view schema accepts meaningful fixtures and rejects value-standing mismatch', () => {
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(current), true);
  assert.equal(validate(partial), true);
  assert.equal(validate(absent), true);
  assert.equal(validate(invalid), false);
});

test('schema and runtime reject the same identity, standing, and empty-state contradictions', () => {
  const validate = new Ajv2020({ strict: true }).compile(schema);
  const maximumCodePointLabel = structuredClone(current);
  maximumCodePointLabel.records[0].label = '😀'.repeat(120);
  assert.equal(validate(maximumCodePointLabel), true);
  assert.equal(admitDataViewFixture(maximumCodePointLabel).records[0].label, maximumCodePointLabel.records[0].label);
  const oversizedCodePointLabel = structuredClone(maximumCodePointLabel);
  oversizedCodePointLabel.records[0].label += '😀';
  assert.equal(validate(oversizedCodePointLabel), false);
  assert.throws(() => admitDataViewFixture(oversizedCodePointLabel), /at most 120 characters/u);

  const candidates = [];
  const unsafeIdentity = structuredClone(current);
  unsafeIdentity.dataViewLabId = 'Unsafe Identity';
  candidates.push(unsafeIdentity);
  const currentWithStale = structuredClone(current);
  currentWithStale.records[0].standing = 'stale';
  candidates.push(currentWithStale);
  const currentEmpty = structuredClone(current);
  currentEmpty.records = [];
  currentEmpty.relationships = [];
  candidates.push(currentEmpty);
  const whitespaceLabel = structuredClone(current);
  whitespaceLabel.records[0].label = '   ';
  candidates.push(whitespaceLabel);
  const oversizedScope = structuredClone(current);
  oversizedScope.scope = 'x'.repeat(161);
  candidates.push(oversizedScope);
  const exactDuplicateRecord = structuredClone(current);
  exactDuplicateRecord.records.push(structuredClone(exactDuplicateRecord.records[0]));
  candidates.push(exactDuplicateRecord);
  for (const candidate of candidates) {
    assert.equal(validate(candidate), false);
    assert.throws(() => admitDataViewFixture(candidate));
  }
});

test('admission orders records deterministically and detaches nested ownership', () => {
  const supplied = structuredClone(current);
  supplied.records.reverse();
  const admitted = admitDataViewFixture(supplied);
  assert.deepEqual(admitted.records.map((record) => record.order), [...Array(12).keys()]);
  supplied.records[0].label = 'Caller mutation';
  supplied.lineage.source = 'Caller mutation';
  assert.equal(admitted.records.at(-1).label, 'Follow-up');
  assert.equal(admitted.lineage.source, 'bundled-fixture');
  assert.ok(Object.isFrozen(admitted.records[0]));
  assert.ok(Object.isFrozen(admitted.records[0].position));
  assert.equal(admitted.relationships.length, 11);
});

test('standing controls whether a numeric value is present', () => {
  assert.throws(() => admitDataViewFixture(invalid), /agree with its standing/u);
  const staleCurrent = structuredClone(current);
  staleCurrent.records[0].standing = 'stale';
  assert.throws(() => admitDataViewFixture(staleCurrent), /requires partial or stale data standing/u);
  const absentWithRecord = structuredClone(current);
  absentWithRecord.dataStanding = 'absent';
  assert.throws(() => admitDataViewFixture(absentWithRecord), /zero records/u);
});

test('runtime admission closes calendar, relationship, and collection invariants after schema validation', () => {
  const validDigitIdentity = structuredClone(current);
  validDigitIdentity.records[0].id = '1-intake';
  validDigitIdentity.relationships[0].sourceId = '1-intake';
  assert.equal(admitDataViewFixture(validDigitIdentity).records[0].id, '1-intake');

  const impossibleDate = structuredClone(current);
  impossibleDate.records[0].observedAt = '2026-02-30';
  assert.throws(() => admitDataViewFixture(impossibleDate), /real calendar date/u);

  const duplicateOrder = structuredClone(current);
  duplicateOrder.records[1].order = duplicateOrder.records[0].order;
  assert.throws(() => admitDataViewFixture(duplicateOrder), /unique non-negative integer/u);

  const danglingRelationship = structuredClone(current);
  danglingRelationship.relationships[0].targetId = 'missing-record';
  assert.throws(() => admitDataViewFixture(danglingRelationship), /two admitted record identifiers/u);
});

test('exact-value text preserves the admitted numeric representation', () => {
  assert.equal(valueText({ value: 1.23456789, standing: 'known' }, 'cases'), '1.23456789 cases');
  assert.equal(valueText({ value: 0, standing: 'known' }, 'cases'), '0 cases');
  assert.equal(valueText({ value: null, standing: 'redacted' }, 'cases'), 'Redacted');
});

test('renderer selection changes only at declared decision and scale boundaries', () => {
  assert.equal(chooseRenderer('single-status', 500), 'summary');
  assert.equal(chooseRenderer('exact-values', 500), 'table');
  assert.equal(chooseRenderer('change-over-time', 80), 'timeline');
  assert.equal(chooseRenderer('change-over-time', 81), 'table');
  assert.equal(chooseRenderer('relationships', 48), 'graph');
  assert.equal(chooseRenderer('relationships', 49), 'table');
  assert.equal(chooseRenderer('spatial', 120), 'spatial');
  assert.equal(chooseRenderer('spatial', 121), 'table');
  assert.equal(chooseRenderer('compare', 12), 'chart');
  assert.equal(chooseRenderer('compare', 13), 'svg');
  assert.equal(chooseRenderer('compare', 81), 'table');
});

test('late and rejected data revisions preserve the exact accepted state', () => {
  const initial = createDataViewState(current);
  const pending = reduceDataViewState(initial, { type: 'request.started', requestId: 'request-b', ownerGeneration: 1 }).state;
  const late = reduceDataViewState(pending, { type: 'request.succeeded', requestId: 'request-a', ownerGeneration: 1, fixture: partial });
  assert.strictEqual(late.state, pending);
  assert.equal(late.reason, 'stale-request');
  const rejected = reduceDataViewState(pending, { type: 'request.succeeded', requestId: 'request-b', ownerGeneration: 1, fixture: invalid });
  assert.strictEqual(rejected.state, pending);
  assert.match(rejected.reason, /candidate-rejected/u);
  const recorded = reduceDataViewState(pending, {
    type: 'request.failed', requestId: 'request-b', ownerGeneration: 1, message: 'Candidate revision rejected.',
  }).state;
  assert.strictEqual(recorded.fixture, pending.fixture);
  assert.strictEqual(recorded.data, pending.data);
  assert.equal(recorded.data.standing, 'current');
});

test('revision admission retains stable identity, idempotent content, and direct lineage', () => {
  const begin = fixture => {
    const pending = reduceDataViewState(createDataViewState(current), {
      type: 'request.started', requestId: 'revision-request', ownerGeneration: 1,
    }).state;
    return {
      pending,
      outcome: reduceDataViewState(pending, {
        type: 'request.succeeded', requestId: 'revision-request', ownerGeneration: 1, fixture,
      }),
    };
  };

  const currentAttempt = begin(current);
  const alreadyCurrent = currentAttempt.outcome;
  assert.equal(alreadyCurrent.applied, true);
  assert.equal(alreadyCurrent.reason, 'candidate-already-current');
  assert.strictEqual(alreadyCurrent.state.fixture, currentAttempt.pending.fixture);

  const changedCurrent = structuredClone(current);
  changedCurrent.records[0].value = 27;
  assert.match(begin(changedCurrent).outcome.reason, /current revision must retain identical content/u);

  const changedIdentity = structuredClone(partial);
  changedIdentity.dataViewLabId = 'other-data-view-lab';
  assert.match(begin(changedIdentity).outcome.reason, /must retain the accepted identity/u);

  const skippedParent = structuredClone(partial);
  skippedParent.lineage.parentRevision = 'cohort-r0';
  assert.match(begin(skippedParent).outcome.reason, /parentRevision must equal the accepted revision/u);
});

test('atomic revision acceptance retains compatible selection and recalculates renderer', () => {
  let state = createDataViewState(current);
  state = reduceDataViewState(state, { type: 'selection.changed', recordId: 'consent' }).state;
  state = reduceDataViewState(state, { type: 'view.changed', decisionNeed: 'exact-values' }).state;
  state = reduceDataViewState(state, { type: 'request.started', requestId: 'request-r2', ownerGeneration: 1 }).state;
  state = reduceDataViewState(state, { type: 'request.succeeded', requestId: 'request-r2', ownerGeneration: 1, fixture: partial }).state;
  assert.equal(state.fixture.revision, 'cohort-r2-partial');
  assert.equal(state.selection.recordId, 'consent');
  assert.equal(state.view.renderer, 'table');
  assert.equal(state.data.standing, 'partial');
});

test('pagination and semantic twin use the same stable record slice', () => {
  let state = createDataViewState(current);
  const twin = createDataSemanticTwin(state);
  assert.deepEqual(twin.records, pageRecords(state));
  assert.equal(twin.records.length, 12);
  assert.equal(twin.records[0].id, 'intake');
  assert.equal(twin.records.at(-1).id, 'follow-up');
  assert.equal(twin.unit, 'cases');
  assert.equal(twin.denominator, 'per weekly review');
  assert.equal(twin.lineage.source, 'bundled-fixture');
  assert.deepEqual(twin.domains.numeric, { minimum: 0, maximum: 28 });
  assert.deepEqual(twin.domains.observedAt, { first: '2026-10-01', last: '2026-10-10' });
  assert.equal(twin.relationships.length, 11);
  assert.equal(twin.state.authorization.standing, 'unknown');
});

test('empty accepted data and a second page retain explicit bounded behavior', () => {
  const emptyState = createDataViewState(absent);
  assert.equal(emptyState.data.standing, 'absent');
  assert.deepEqual(pageRecords(emptyState), []);
  assert.equal(createDataSemanticTwin(emptyState).totalRecords, 0);

  const larger = structuredClone(current);
  larger.revision = 'cohort-r-large';
  larger.lineage.parentRevision = 'cohort-r1';
  larger.records.push({
    id: 'archive', label: 'Archive', order: 12, value: 10, standing: 'known', group: 'release', observedAt: '2026-10-12', position: { x: 4, y: 88 },
  });
  larger.relationships.push({ id: 'follow-up-to-archive', sourceId: 'follow-up', targetId: 'archive', label: 'routes completed follow-up to archive' });
  let state = createDataViewState(larger);
  state = reduceDataViewState(state, { type: 'view.changed', decisionNeed: 'single-status' }).state;
  state = reduceDataViewState(state, { type: 'page.changed', page: 2 }).state;
  assert.deepEqual(pageRecords(state).map((record) => record.id), ['archive']);
  assert.equal(state.selection.recordId, 'archive');
  const continued = createDataSemanticTwin(state);
  assert.equal(continued.renderer, 'summary');
  assert.equal(continued.selectedRecordId, 'archive');
  assert.equal(continued.selectedRecord.id, 'archive');
  assert.ok(continued.records.some(record => record.id === continued.selectedRecordId));
  assert.deepEqual(continued.domains.numeric, { minimum: 0, maximum: 28 });
  assert.deepEqual(continued.continuation, { previousRecordId: 'follow-up', nextRecordId: null });
  const outsidePage = reduceDataViewState(state, { type: 'selection.changed', recordId: 'intake' });
  assert.strictEqual(outsidePage.state, state);
  assert.equal(outsidePage.reason, 'record-outside-page');
});

test('owner replacement, release, and exported snapshots remain detached', () => {
  let state = createDataViewState(current, 'owner-a');
  state = reduceDataViewState(state, { type: 'request.started', requestId: 'owner-a-request', ownerGeneration: 1 }).state;
  state = reduceDataViewState(state, { type: 'owner.replaced', ownerId: 'owner-b' }).state;
  assert.equal(state.ownership.generation, 2);
  assert.deepEqual(state.ownership, { standing: 'active', ownerId: 'owner-b', generation: 2 });
  const unchangedOwner = reduceDataViewState(state, { type: 'owner.replaced', ownerId: 'owner-b' });
  assert.strictEqual(unchangedOwner.state, state);
  assert.equal(unchangedOwner.reason, 'owner-unchanged');
  const priorOwnerSettlement = reduceDataViewState(state, {
    type: 'request.succeeded', requestId: 'owner-a-request', ownerGeneration: 1, fixture: partial,
  });
  assert.equal(priorOwnerSettlement.applied, false);
  assert.equal(priorOwnerSettlement.reason, 'stale-request');
  const exported = exportDataViewState(state);
  exported.fixture.records[0].label = 'Changed export';
  assert.equal(state.fixture.records[0].label, 'Intake');
  const released = reduceDataViewState(state, { type: 'owner.released' }).state;
  assert.deepEqual(released.request, {
    standing: 'idle', requestId: null, ownerGeneration: null, message: 'Controller resources released.',
  });
  const repeated = reduceDataViewState(released, { type: 'owner.released' });
  assert.strictEqual(repeated.state, released);
  assert.equal(repeated.applied, false);
  const postRelease = reduceDataViewState(released, { type: 'request.started', requestId: 'after-release', ownerGeneration: 2 });
  assert.strictEqual(postRelease.state, released);
  assert.equal(postRelease.reason, 'owner-released');
});
