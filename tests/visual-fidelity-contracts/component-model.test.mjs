import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  admitComponentFixture,
  createComponentState,
  createComponentSuccessorState,
  exportComponentState,
  reduceComponentState,
  validateDraft,
} from '../../visual-fidelity-contracts/labs/component-lab/src/model.js';
import { componentSemanticTwin, componentStatusMessage } from '../../visual-fidelity-contracts/labs/component-lab/src/semantics.js';

const ROOT = new URL('../../visual-fidelity-contracts/labs/component-lab/', import.meta.url);
const fixture = JSON.parse(await readFile(new URL('fixtures/valid/catalog.json', ROOT), 'utf8'));
const invalid = JSON.parse(await readFile(new URL('fixtures/invalid/missing-lineage.json', ROOT), 'utf8'));
const schema = JSON.parse(await readFile(new URL('schemas/component-lab.schema.json', ROOT), 'utf8'));

test('component fixture schema accepts the canonical fixture and rejects missing lineage', () => {
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(fixture), true);
  assert.equal(validate(invalid), false);
  const unsafeIdentity = structuredClone(fixture);
  unsafeIdentity.componentLabId = 'Unsafe identity';
  assert.equal(validate(unsafeIdentity), false);
  assert.throws(() => admitComponentFixture(unsafeIdentity), /public string contract/u);
  const duplicateSku = structuredClone(fixture);
  duplicateSku.catalog[1].sku = duplicateSku.catalog[0].sku;
  assert.throws(() => admitComponentFixture(duplicateSku), /unique lowercase kebab case/u);

  const maximumCodePointLabel = structuredClone(fixture);
  maximumCodePointLabel.catalog[0].label = '😀'.repeat(120);
  assert.equal(validate(maximumCodePointLabel), true);
  assert.equal(admitComponentFixture(maximumCodePointLabel).catalog[0].label, maximumCodePointLabel.catalog[0].label);
  const oversizedCodePointLabel = structuredClone(maximumCodePointLabel);
  oversizedCodePointLabel.catalog[0].label += '😀';
  assert.equal(validate(oversizedCodePointLabel), false);
  assert.throws(() => admitComponentFixture(oversizedCodePointLabel), /public string contract/u);

  for (const mutate of [
    (candidate) => { candidate.lineage.source = '   '; },
    (candidate) => { candidate.catalog[0].label = '   '; },
  ]) {
    const whitespaceOnly = structuredClone(fixture);
    mutate(whitespaceOnly);
    assert.equal(validate(whitespaceOnly), false);
    assert.throws(() => admitComponentFixture(whitespaceOnly), /non-empty string/u);
  }
});

test('fixture admission projects closed fields into detached frozen ownership', () => {
  const supplied = structuredClone(fixture);
  const admitted = admitComponentFixture(supplied);
  supplied.catalog[0].label = 'Caller mutation';
  supplied.lineage.source = 'Caller mutation';
  assert.equal(admitted.catalog[0].label, 'Field notebook');
  assert.equal(admitted.lineage.source, 'bundled-fixture');
  assert.ok(Object.isFrozen(admitted));
  assert.ok(Object.isFrozen(admitted.catalog[0]));
  assert.throws(() => admitComponentFixture({ ...fixture, extra: true }), /exactly/u);
  assert.throws(() => admitComponentFixture(invalid), /exactly/u);
});

test('stable validation issues retain control identity and distinguish stock', () => {
  const item = fixture.catalog[0];
  assert.deepEqual(validateDraft({ email: '', quantity: '1' }, item).map((issue) => issue.id), ['email.required']);
  assert.deepEqual(validateDraft({ email: 'person.example', quantity: '0' }, item).map((issue) => [issue.id, issue.controlId]), [
    ['email.format', 'component-email'], ['quantity.range', 'component-quantity'],
  ]);
  assert.deepEqual(validateDraft({ email: 'person@example.org', quantity: '13' }, item).map((issue) => issue.id), ['quantity.stock']);
  assert.deepEqual(validateDraft({ email: 'person@example.org', quantity: '2' }, item), []);
});

test('late requests and malformed candidates preserve the exact accepted state', () => {
  const initial = createComponentState(fixture);
  const pending = reduceComponentState(initial, { type: 'request.started', requestId: 'request-b', ownerGeneration: 1 }).state;
  const late = reduceComponentState(pending, { type: 'request.succeeded', requestId: 'request-a', ownerGeneration: 1, fixture });
  assert.equal(late.applied, false);
  assert.equal(late.reason, 'stale-request');
  assert.strictEqual(late.state, pending);
  const rejected = reduceComponentState(pending, { type: 'request.succeeded', requestId: 'request-b', ownerGeneration: 1, fixture: invalid });
  assert.equal(rejected.applied, false);
  assert.match(rejected.reason, /candidate-rejected/u);
  assert.strictEqual(rejected.state, pending);
});

test('atomic revision acceptance retains compatible selection and draft', () => {
  let state = createComponentState(fixture);
  state = reduceComponentState(state, { type: 'selection.changed', sku: 'review-cards' }).state;
  state = reduceComponentState(state, { type: 'draft.changed', field: 'email', value: 'reader@example.org' }).state;
  const pending = reduceComponentState(state, { type: 'request.started', requestId: 'request-r2', ownerGeneration: 1 }).state;
  const candidate = structuredClone(fixture);
  candidate.revision = 'catalog-r2';
  candidate.lineage.parentRevision = 'catalog-r1';
  candidate.catalog[1].stock = 11;
  const accepted = reduceComponentState(pending, { type: 'request.succeeded', requestId: 'request-r2', ownerGeneration: 1, fixture: candidate });
  assert.equal(accepted.applied, true);
  assert.equal(accepted.state.fixture.revision, 'catalog-r2');
  assert.equal(accepted.state.selection.sku, 'review-cards');
  assert.equal(accepted.state.draft.email, 'reader@example.org');
  assert.equal(accepted.state.commerce.stock, 11);
});

test('same-root successor carries compatible local work and resets retiring-controller work', () => {
  let incumbent = createComponentState(fixture);
  incumbent = reduceComponentState(incumbent, { type: 'selection.changed', sku: 'review-cards' }).state;
  incumbent = reduceComponentState(incumbent, { type: 'draft.changed', field: 'email', value: 'handoff@example.org' }).state;
  incumbent = reduceComponentState(incumbent, { type: 'draft.changed', field: 'quantity', value: '2' }).state;
  incumbent = reduceComponentState(incumbent, { type: 'authorization.changed', standing: 'allowed' }).state;
  incumbent = reduceComponentState(incumbent, { type: 'disclosure.changed', standing: 'expanded' }).state;
  incumbent = reduceComponentState(incumbent, {
    type: 'intent.submitted', intentId: 'intent-before-handoff', ownerGeneration: 1,
  }).state;

  const successor = createComponentSuccessorState(fixture, incumbent);
  assert.deepEqual(successor.selection, { sku: 'review-cards' });
  assert.deepEqual(successor.draft, { email: 'handoff@example.org', quantity: '2' });
  assert.deepEqual(successor.authorization, { standing: 'allowed' });
  assert.deepEqual(successor.disclosure, { standing: 'expanded' });
  assert.equal(successor.validation.standing, 'valid');
  assert.equal(successor.request.standing, 'idle');
  assert.equal(successor.receipt.standing, 'absent');
  assert.equal(successor.commerce.intent, null);
  assert.equal(successor.commerce.priceCents, 2400);
  assert.equal(successor.commerce.stock, 8);

  const unrelated = structuredClone(fixture);
  unrelated.componentLabId = 'unrelated-component-lab';
  assert.throws(
    () => createComponentSuccessorState(unrelated, incumbent),
    /retain the incumbent componentLabId/u,
  );

  const rewrittenCurrent = structuredClone(fixture);
  rewrittenCurrent.catalog[0].stock = 11;
  assert.throws(
    () => createComponentSuccessorState(rewrittenCurrent, incumbent),
    /current revision must retain identical fixture content/u,
  );

  const skippedLineage = structuredClone(fixture);
  skippedLineage.revision = 'catalog-r3';
  skippedLineage.lineage.parentRevision = 'catalog-r0';
  assert.throws(
    () => createComponentSuccessorState(skippedLineage, incumbent),
    /name the incumbent revision as parentRevision/u,
  );

  const directSuccessor = structuredClone(fixture);
  directSuccessor.revision = 'catalog-r2';
  directSuccessor.lineage.parentRevision = 'catalog-r1';
  directSuccessor.catalog[1].stock = 9;
  const advanced = createComponentSuccessorState(directSuccessor, incumbent);
  assert.equal(advanced.fixture.revision, 'catalog-r2');
  assert.deepEqual(advanced.draft, incumbent.draft);
  assert.equal(advanced.selection.sku, 'review-cards');
  assert.equal(advanced.commerce.stock, 9);
});

test('revision admission retains stable identity and direct lineage', () => {
  const begin = candidate => {
    const pending = reduceComponentState(createComponentState(fixture), {
      type: 'request.started', requestId: 'request-r2', ownerGeneration: 1,
    }).state;
    return reduceComponentState(pending, {
      type: 'request.succeeded', requestId: 'request-r2', ownerGeneration: 1, fixture: candidate,
    });
  };
  const unrelated = structuredClone(fixture);
  unrelated.componentLabId = 'other-component-lab';
  unrelated.revision = 'catalog-r2';
  unrelated.lineage.parentRevision = 'catalog-r1';
  assert.match(begin(unrelated).reason, /componentLabId must retain/u);

  const skippedParent = structuredClone(fixture);
  skippedParent.revision = 'catalog-r3';
  skippedParent.lineage.parentRevision = 'catalog-r0';
  assert.match(begin(skippedParent).reason, /parentRevision must equal/u);

  const changedCurrent = structuredClone(fixture);
  changedCurrent.catalog[0].stock = 2;
  assert.match(begin(changedCurrent).reason, /current revision must retain identical content/u);
});

test('local intent, authority acceptance, and stale receipts remain distinct', () => {
  let state = createComponentState(fixture);
  state = reduceComponentState(state, { type: 'draft.changed', field: 'email', value: 'reader@example.org' }).state;
  const held = reduceComponentState(state, { type: 'intent.submitted', intentId: 'intent-1', ownerGeneration: 1 });
  assert.equal(held.applied, false);
  assert.equal(held.reason, 'authorization-required');
  state = reduceComponentState(state, { type: 'authorization.changed', standing: 'allowed' }).state;
  state = reduceComponentState(state, { type: 'intent.submitted', intentId: 'intent-1', ownerGeneration: 1 }).state;
  assert.equal(state.receipt.standing, 'provisional');
  assert.equal(state.commerce.orderStanding, 'pending');
  const stale = reduceComponentState(state, { type: 'intent.reconciled', intentId: 'intent-old', ownerGeneration: 1, outcome: 'accepted', receiptId: 'receipt-old' });
  assert.strictEqual(stale.state, state);
  state = reduceComponentState(state, { type: 'intent.reconciled', intentId: 'intent-1', ownerGeneration: 1, outcome: 'accepted', receiptId: 'receipt-1' }).state;
  assert.equal(state.receipt.standing, 'accepted');
  assert.equal(state.commerce.paymentStanding, 'accepted');
  assert.equal(state.validation.standing, 'server-reconciled');
  assert.deepEqual(state.commerce.intent, {
    intentId: 'intent-1', ownerGeneration: 1, fixtureId: 'visual-fidelity-component-lab', fixtureRevision: 'catalog-r1',
    authorizationStanding: 'allowed', sku: 'field-notebook', email: 'reader@example.org', quantity: 1,
    unitPriceCents: 1800, totalCents: 1800,
  });
});

test('selection, authority, and revision changes retire context-bound commerce intent', () => {
  let state = createComponentState(fixture);
  state = reduceComponentState(state, { type: 'draft.changed', field: 'email', value: 'reader@example.org' }).state;
  state = reduceComponentState(state, { type: 'authorization.changed', standing: 'allowed' }).state;
  state = reduceComponentState(state, { type: 'intent.submitted', intentId: 'intent-a', ownerGeneration: 1 }).state;
  const selected = reduceComponentState(state, { type: 'selection.changed', sku: 'review-cards' }).state;
  assert.equal(selected.commerce.intent, null);
  assert.equal(selected.receipt.standing, 'absent');
  const late = reduceComponentState(selected, { type: 'intent.reconciled', intentId: 'intent-a', ownerGeneration: 1, outcome: 'accepted', receiptId: 'receipt-a' });
  assert.equal(late.applied, false);
  assert.equal(late.reason, 'stale-intent');

  state = reduceComponentState(selected, { type: 'intent.submitted', intentId: 'intent-b', ownerGeneration: 1 }).state;
  state = reduceComponentState(state, { type: 'authorization.changed', standing: 'held' }).state;
  assert.equal(state.commerce.intent, null);
  assert.equal(state.commerce.orderStanding, 'unstarted');

  state = reduceComponentState(state, { type: 'authorization.changed', standing: 'allowed' }).state;
  state = reduceComponentState(state, { type: 'intent.submitted', intentId: 'intent-c', ownerGeneration: 1 }).state;
  state = reduceComponentState(state, { type: 'request.started', requestId: 'request-r2', ownerGeneration: 1 }).state;
  const candidate = structuredClone(fixture);
  candidate.revision = 'catalog-r2';
  candidate.lineage.parentRevision = 'catalog-r1';
  state = reduceComponentState(state, { type: 'request.succeeded', requestId: 'request-r2', ownerGeneration: 1, fixture: candidate }).state;
  assert.equal(state.commerce.intent, null);
  assert.equal(state.receipt.standing, 'absent');
});

test('candidate rejection records request failure while accepted data keeps its standing', () => {
  let state = createComponentState(fixture);
  state = reduceComponentState(state, { type: 'request.started', requestId: 'request-invalid', ownerGeneration: 1 }).state;
  const rejected = reduceComponentState(state, { type: 'request.succeeded', requestId: 'request-invalid', ownerGeneration: 1, fixture: invalid });
  const failed = reduceComponentState(rejected.state, {
    type: 'request.failed', requestId: 'request-invalid', ownerGeneration: 1, message: rejected.reason,
  }).state;
  assert.equal(failed.request.standing, 'failed');
  assert.equal(failed.data.standing, 'current');
  assert.strictEqual(failed.fixture, state.fixture);
});

test('owner generation gates asynchronous settlement and release closes state transitions', () => {
  let state = createComponentState(fixture, 'owner-a');
  state = reduceComponentState(state, { type: 'request.started', requestId: 'request-a', ownerGeneration: 1 }).state;
  state = reduceComponentState(state, { type: 'owner.replaced', ownerId: 'owner-b' }).state;
  const late = reduceComponentState(state, { type: 'request.succeeded', requestId: 'request-a', ownerGeneration: 1, fixture });
  assert.equal(late.applied, false);
  assert.equal(late.reason, 'stale-owner');
  const released = reduceComponentState(state, { type: 'owner.released' }).state;
  const next = reduceComponentState(released, { type: 'request.started', requestId: 'request-b', ownerGeneration: 2 });
  assert.equal(next.applied, false);
  assert.equal(next.reason, 'owner-released');
});

test('replacement and idempotent release retain accepted model and draft', () => {
  let state = createComponentState(fixture, 'owner-a');
  state = reduceComponentState(state, { type: 'draft.changed', field: 'quantity', value: '3' }).state;
  state = reduceComponentState(state, { type: 'owner.replaced', ownerId: 'owner-b' }).state;
  assert.equal(state.ownership.ownerId, 'owner-b');
  assert.equal(state.ownership.generation, 2);
  assert.equal(state.draft.quantity, '3');
  const released = reduceComponentState(state, { type: 'owner.released' }).state;
  const repeated = reduceComponentState(released, { type: 'owner.released' });
  assert.equal(repeated.applied, false);
  assert.strictEqual(repeated.state, released);
});

test('semantic twin and export detach from accepted ownership', () => {
  const state = createComponentState(fixture);
  const twin = componentSemanticTwin(state);
  const exported = exportComponentState(state);
  exported.fixture.catalog[0].label = 'Changed export';
  assert.equal(twin.selected.label, 'Field notebook');
  assert.equal(state.fixture.catalog[0].label, 'Field notebook');
  assert.equal(twin.revision, state.fixture.revision);
  assert.deepEqual(twin.lineage, state.fixture.lineage);
  assert.equal(twin.ownership.generation, 1);
  assert.equal(twin.status.payment, 'unstarted');
  assert.equal(twin.status.disclosure, 'compact');
  assert.equal(componentStatusMessage(state), 'Choose an authorization outcome before submitting. The editable draft remains ready.');
  assert.match(componentStatusMessage({ ...state, authorization: { standing: 'held' } }), /held for review/u);
  assert.match(componentStatusMessage({ ...state, authorization: { standing: 'denied' } }), /request the authorized route/u);
  assert.match(componentStatusMessage({
    ...state,
    authorization: { standing: 'allowed' },
    data: { standing: 'stale' },
  }), /Refresh accepted data.+editable draft remains available/iu);
});
