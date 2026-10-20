import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  LabStateError,
  MAX_PAGE_RECORDS,
  cacheKeyFor,
  commandFingerprint,
  createInitialState,
  createServiceBoundarySuccessorState,
  inspectableState,
  paginateStable,
  readVersionedRecord,
  semanticRows,
  serializeCheckpoint,
  transition,
} from '../../visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-model.js';

const root = new URL('../../visual-fidelity-contracts/labs/service-boundary-lab/', import.meta.url);
const controllerSource = await readFile(new URL('service-boundary-lab.js', root), 'utf8');
const fixture = JSON.parse(await readFile(new URL('fixtures/accepted-command.json', root), 'utf8'));
const staleFixture = JSON.parse(await readFile(new URL('fixtures/rejected-command.json', root), 'utf8'));
const secretShapedTexts = Object.freeze([
  ['Token', 'examplevalue'].join(': '),
  ['GHP', '1234567890'].join('_'),
]);
const accepted = Object.freeze({
  id: 'synthetic-case-0142',
  revision: 7,
  status: 'assembled',
  owner: 'Example review team',
  nextAction: 'Prepare the review-ready candidate',
  sourceId: 'synthetic-case-0142',
});
const authorize = (state, command = fixture) => transition(state, { type: 'AUTHORIZE', outcome: 'allowed', command });
const begin = state => transition(state, { type: 'BEGIN', command: fixture });
const checkpoint = state => transition(state, { type: 'CHECKPOINT', id: 'checkpoint-review-0142' });
const commit = state => transition(state, { type: 'COMMIT', receiptId: 'receipt-review-0142' });
const startAiEvent = Object.freeze({
  type: 'START_AI_CALL',
  budget: 3,
  task: 'Summarize the accepted receipt for a reviewer',
  sourceAuthority: 'Accepted synthetic service receipt',
  tools: ['read accepted receipt', 'summarize bounded projection'],
  inputProjection: 'Accepted receipt fields and current revision',
  stoppingEvent: 'Budget reached or review claim assembled',
  receiver: 'Named review lead',
  publicationAuthority: 'Named publication steward',
  checkpointId: 'ai-checkpoint-review-0142',
});
const startAi = state => transition(state, startAiEvent);
const alternateCommand = Object.freeze({
  ...fixture,
  id: 'command-review-0143',
  actor: 'release-coordinator',
  role: 'release-reviewer',
  policyRevision: 'policy-2026-11',
  idempotencyKey: 'review-0143-r7',
});

test('schemas admit the closed command, checkpoint, receipt, projection, issue, response, and continuation family', async () => {
  const [commandSchema, checkpointSchema, receiptSchema, projectionSchema, issueSchema, responseSchema, aiCallSchema, continuationSchema] = await Promise.all([
    readFile(new URL('schemas/command.schema.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('schemas/checkpoint.schema.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('schemas/receipt.schema.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('schemas/projection.schema.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('schemas/issue.schema.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('schemas/response.schema.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('schemas/ai-call.schema.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('schemas/continuation.schema.json', root), 'utf8').then(JSON.parse),
  ]);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addSchema(commandSchema).addSchema(receiptSchema).addSchema(projectionSchema).addSchema(issueSchema);
  const validateCommand = ajv.getSchema(commandSchema.$id);
  const validateCheckpoint = ajv.compile(checkpointSchema);
  const validateReceipt = ajv.getSchema(receiptSchema.$id);
  const validateResponse = ajv.compile(responseSchema);
  const validateAiCall = ajv.compile(aiCallSchema);
  const validateContinuation = ajv.compile(continuationSchema);
  assert.equal(validateCommand(fixture), true, JSON.stringify(validateCommand.errors));

  let state = checkpoint(begin(authorize(createInitialState(accepted))));
  const serialized = JSON.parse(serializeCheckpoint(state));
  assert.equal(validateCheckpoint(serialized), true, JSON.stringify(validateCheckpoint.errors));
  state = commit(state);
  assert.equal(validateReceipt(state.receipts[fixture.idempotencyKey]), true, JSON.stringify(validateReceipt.errors));
  const [acceptedResponse, heldResponse, rejectedResponse] = await Promise.all([
    readFile(new URL('fixtures/accepted-response.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('fixtures/held-response.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('fixtures/rejected-response.json', root), 'utf8').then(JSON.parse),
  ]);
  assert.equal(validateResponse(acceptedResponse), true, JSON.stringify(validateResponse.errors));
  assert.equal(validateResponse(heldResponse), true, JSON.stringify(validateResponse.errors));
  assert.equal(validateResponse(rejectedResponse), true, JSON.stringify(validateResponse.errors));
  assert.deepEqual(acceptedResponse, {
    schema: 'visual-fidelity.service-boundary-response.v1',
    standing: 'accepted',
    projection: {
      id: state.accepted.id,
      revision: state.accepted.revision,
      status: state.accepted.status,
      owner: state.accepted.owner,
      nextAction: state.accepted.nextAction,
    },
    receipt: state.receipts[fixture.idempotencyKey],
    issue: null,
  });
  assert.equal(acceptedResponse.receipt.requestFingerprint, commandFingerprint(acceptedResponse.receipt.requestMeaning));
  assert.equal(validateResponse({ ...acceptedResponse, receipt: null }), false);
  assert.equal(validateResponse({ ...rejectedResponse, receipt: acceptedResponse.receipt }), false);
  const validAiCall = {
    task: 'Summarize the accepted receipt for a reviewer',
    sourceAuthority: 'Accepted synthetic service receipt',
    budget: 3,
    tools: ['read accepted receipt'],
    inputProjection: 'Accepted receipt fields and current revision',
    stoppingEvent: 'Budget reached or review claim assembled',
    receiver: 'Named review lead',
    publicationAuthority: 'Named publication steward',
    checkpointId: 'ai-checkpoint-review-0142',
  };
  assert.equal(validateAiCall(validAiCall), true, JSON.stringify(validateAiCall.errors));
  for (const secretShapedText of secretShapedTexts) {
    assert.equal(validateAiCall({ ...validAiCall, task: secretShapedText }), false);
    assert.equal(validateCommand({ ...fixture, task: secretShapedText }), false);
  }
  const maximumCodePointText = '𐐀'.repeat(160);
  const maximumCodePointCommand = { ...fixture, task: maximumCodePointText };
  const maximumCodePointAiCall = { ...validAiCall, task: maximumCodePointText };
  assert.equal(validateCommand(maximumCodePointCommand), true, JSON.stringify(validateCommand.errors));
  assert.doesNotThrow(() => transition(
    authorize(createInitialState(accepted), maximumCodePointCommand),
    { type: 'BEGIN', command: maximumCodePointCommand },
  ));
  assert.equal(validateAiCall(maximumCodePointAiCall), true, JSON.stringify(validateAiCall.errors));
  assert.doesNotThrow(() => transition(
    authorize(createInitialState(accepted)),
    { type: 'START_AI_CALL', ...maximumCodePointAiCall },
  ));
  const oversizedCodePointText = `${maximumCodePointText}𐐀`;
  assert.equal(validateCommand({ ...fixture, task: oversizedCodePointText }), false);
  assert.throws(() => authorize(createInitialState(accepted), { ...fixture, task: oversizedCodePointText }), /bounded plain text/u);
  assert.equal(validateAiCall({ ...validAiCall, task: oversizedCodePointText }), false);
  assert.throws(() => transition(
    authorize(createInitialState(accepted)),
    { type: 'START_AI_CALL', ...validAiCall, task: oversizedCodePointText },
  ), /bounded plain text/u);
  const continuation = paginateStable([
    { id: 'a', sortKey: '01', createdRevision: 7, label: 'Alpha' },
    { id: 'b', sortKey: '02', createdRevision: 7, label: 'Beta' },
  ], { snapshotRevision: 7, limit: 1 }).nextCursor;
  assert.equal(validateContinuation(continuation), true, JSON.stringify(validateContinuation.errors));

  const surplus = { ...fixture, hidden: 'outside the closed contract' };
  assert.equal(validateCommand(surplus), false);
});

test('record admission reports symbol and unbounded keys through typed public diagnostics', () => {
  const symbolField = Symbol('private source description');
  const initial = createInitialState(accepted);
  for (const candidate of [
    { ...initial, dimensions: { ...initial.dimensions, [symbolField]: 'outside the closed contract' } },
    { ...initial, connection: { ...initial.connection, ['field-name-that-is-far-beyond-the-public-diagnostic-boundary-and-carries-source-detail']: 'outside' } },
  ]) {
    assert.throws(
      () => inspectableState(candidate),
      error => error instanceof LabStateError
        && ['INVALID_DIMENSION_SHAPE', 'INVALID_RECORD_SHAPE'].includes(error.code)
        && error.stage === 'admission'
        && !error.message.includes('private source description')
        && !error.message.includes('carries-source-detail'),
    );
  }
});

test('commit, outbox publication, and replay create one durable effect', () => {
  let state = createInitialState(accepted);
  state = authorize(state);
  state = begin(state);
  assert.doesNotMatch(state.events.at(-1).summary, /review-coordinator|example-research-team|review-0142-r7/u);
  state = checkpoint(state);
  state = commit(state);
  assert.equal(state.accepted.revision, 8);
  assert.equal(state.accepted.status, 'review-ready');
  assert.equal(state.dimensions.transaction, 'committed');
  assert.equal(state.connection.released, true);
  assert.equal(state.outbox.status, 'pending');
  assert.equal(Object.keys(state.receipts).length, 1);

  state = transition(state, { type: 'PUBLISH_OUTBOX' });
  const afterPublish = state;
  state = transition(state, { type: 'BEGIN', command: fixture });
  assert.strictEqual(state.accepted.id, afterPublish.accepted.id);
  assert.equal(state.accepted.revision, 8);
  assert.equal(Object.keys(state.receipts).length, 1);
  assert.equal(state.events.at(-1).type, 'REPLAY');
  assert.equal(
    cacheKeyFor(fixture),
    'cache:v1:18:review-coordinator;19:authorized-reviewer;21:example-research-team;11:case-review;14:policy-2026-10;19:operational-summary;19:synthetic-case-0142;1:7',
  );
});

test('same-root successor retains exact durable meaning and releases transient ownership', () => {
  let committed = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  committed = transition(committed, { type: 'PUBLISH_OUTBOX' });
  const durable = createServiceBoundarySuccessorState(accepted, fixture, committed);
  assert.equal(durable.accepted.revision, 8);
  assert.deepEqual(durable.receipts, committed.receipts);
  assert.deepEqual(durable.outbox, committed.outbox);
  assert.deepEqual(durable.events, committed.events);
  assert.equal(durable.eventSequence, committed.eventSequence);
  assert.equal(durable.connection.released, true);

  const active = checkpoint(begin(authorize(createInitialState(accepted))));
  const released = createServiceBoundarySuccessorState(accepted, fixture, active);
  assert.equal(released.dimensions.transaction, 'rolled_back');
  assert.equal(released.connection.released, true);
  assert.equal(released.checkpoint.id, 'checkpoint-review-0142');
  assert.equal(released.events.at(-1).type, 'INTERRUPT');

  assert.throws(
    () => createServiceBoundarySuccessorState({ ...accepted, id: 'unrelated-case-0142' }, fixture, committed),
    error => error.code === 'SUCCESSOR_SERVICE_IDENTITY' && error.stage === 'admission',
  );
  assert.throws(
    () => createServiceBoundarySuccessorState(
      accepted,
      alternateCommand,
      authorize(createInitialState(accepted)),
    ),
    error => error.code === 'SUCCESSOR_AUTHORIZATION_CONTEXT' && error.stage === 'admission',
  );
});

test('service controller admits durable successor state before live projection', () => {
  assert.match(controllerSource, /createServiceBoundarySuccessorState\(/u);
  assert.ok(controllerSource.indexOf('createServiceBoundarySuccessorState(')
    < controllerSource.indexOf('const presentationBeforeAdmission'));
  assert.match(controllerSource, /Ready\. Accepted revision \$\{state\.accepted\.revision\} is available\./u);
});

test('interrupt releases the candidate and resume reopens the eligible checkpoint', () => {
  let state = checkpoint(begin(authorize(createInitialState(accepted))));
  const serialized = serializeCheckpoint(state);
  state = transition(state, { type: 'INTERRUPT' });
  assert.equal(state.accepted.revision, 7);
  assert.equal(state.dimensions.request, 'cancelled');
  assert.equal(state.dimensions.transaction, 'rolled_back');
  assert.equal(state.connection.released, true);
  assert.ok(serialized.includes('checkpoint-review-0142'));

  state = transition(state, { type: 'RESUME' });
  assert.equal(state.dimensions.transaction, 'active');
  assert.equal(state.connection.owner, fixture.id);
  state = commit(state);
  assert.equal(state.accepted.revision, 8);
});

test('a second authorization context preserves the first transaction checkpoint and issue', () => {
  let state = checkpoint(begin(authorize(createInitialState(accepted))));
  state = transition(state, { type: 'INTERRUPT' });
  const retainedCheckpoint = state.checkpoint;
  const retainedIssue = state.issues.request;

  state = authorize(state, alternateCommand);
  assert.throws(() => transition(state, { type: 'BEGIN', command: alternateCommand }), error => {
    assert.equal(error.code, 'TRANSACTION_RECOVERY_OWNERSHIP_CONFLICT');
    assert.equal(error.stage, 'begin');
    return true;
  });
  assert.deepEqual(state.checkpoint, retainedCheckpoint);
  assert.deepEqual(state.issues.request, retainedIssue);
  assert.equal(inspectableState(state).checkpoint, null);

  state = authorize(state, fixture);
  const visible = inspectableState(state);
  assert.equal(visible.checkpoint.id, 'checkpoint-review-0142');
  assert.equal(visible.issues.request.code, 'INTERRUPTED');
  state = transition(state, { type: 'RESUME' });
  assert.equal(state.dimensions.transaction, 'active');
  assert.equal(state.candidate.id, fixture.id);
});

test('the owning authorization context may supersede its retained transaction recovery', () => {
  let state = checkpoint(begin(authorize(createInitialState(accepted))));
  state = transition(state, { type: 'INTERRUPT' });
  state = begin(state);
  assert.equal(state.dimensions.transaction, 'active');
  assert.equal(state.checkpoint, null);
  assert.equal(state.issues.request, null);
});

test('an owned pre-checkpoint interruption keeps its rollback visible', () => {
  let state = begin(authorize(createInitialState(accepted)));
  state = transition(state, { type: 'INTERRUPT' });
  const visible = inspectableState(state);

  assert.equal(visible.dimensions.request, 'cancelled');
  assert.equal(visible.dimensions.transaction, 'rolled_back');
  assert.equal(visible.dimensions.receipt, 'rejected');
  assert.equal(visible.connection.released, true);
  assert.equal(visible.checkpoint, null);
  assert.equal(visible.issues.request.code, 'INTERRUPTED_BEFORE_CHECKPOINT');
});

test('failure preserves accepted state and returns the connection', () => {
  let state = checkpoint(begin(authorize(createInitialState(accepted))));
  state = transition(state, {
    type: 'FAIL',
    issueId: 'ISSUE-TX-01',
    code: 'WRITE_CONFLICT',
    message: 'The durable write encountered a controlled conflict.',
    recovery: 'Refresh the accepted revision and begin a new candidate.',
  });
  assert.equal(state.accepted.revision, 7);
  assert.equal(state.dimensions.request, 'failed');
  assert.equal(state.dimensions.transaction, 'rolled_back');
  assert.equal(state.dimensions.receipt, 'rejected');
  assert.equal(state.connection.released, true);
  assert.equal(state.issue.code, 'WRITE_CONFLICT');
  assert.equal(state.candidate, null);
});

test('stale command and stale checkpoint remain outside accepted state', () => {
  const initial = authorize(createInitialState(accepted), staleFixture);
  assert.throws(() => transition(initial, { type: 'BEGIN', command: staleFixture }), error => {
    assert.ok(error instanceof LabStateError);
    assert.equal(error.code, 'STALE_COMMAND');
    assert.equal(error.acceptedRevision, 7);
    return true;
  });
  assert.equal(initial.accepted.revision, 7);

  let state = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  state = transition(state, { type: 'APPLY_LATE_RESULT', sourceId: fixture.sourceId, baseRevision: 7 });
  assert.equal(state.accepted.revision, 8);
  assert.equal(state.issue.code, 'STALE_RESULT');
});

test('idempotency key collision is typed and preserves the receipt', () => {
  let state = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  const collision = { ...fixture, id: 'another-command' };
  state = authorize(state, collision);
  assert.throws(() => transition(state, { type: 'BEGIN', command: collision }), error => {
    assert.equal(error.code, 'IDEMPOTENCY_CONFLICT');
    return true;
  });
  assert.equal(state.accepted.revision, 8);
  assert.equal(Object.keys(state.receipts).length, 1);
});

test('bounded caller keeps partial output, evidence, budget, and human authority together', () => {
  let state = authorize(createInitialState(accepted));
  state = startAi(state);
  state = transition(state, {
    type: 'AI_RESULT',
    used: 2,
    complete: false,
    claim: 'Revision 7 is assembled and ready for the named review step',
    evidence: 'Synthetic accepted-state fixture at revision 7',
    evidenceStanding: 'observed',
  });
  assert.equal(state.dimensions.aiCall, 'partial');
  assert.equal(state.dimensions.decision, 'human_held');
  assert.equal(state.ai.used, 2);
  assert.equal(state.ai.budget, 3);
  assert.match(state.ai.evidence, /revision 7/u);
  assert.equal(state.issue.code, 'PARTIAL_RESULT');

  state = transition(state, { type: 'ACCEPT_AI_DECISION', receiver: 'Named review lead' });
  assert.equal(state.dimensions.aiCall, 'partial');
  assert.equal(state.dimensions.decision, 'accepted');
  assert.equal(state.issue.code, 'PARTIAL_RESULT');
  state = transition(state, { type: 'PUBLISH_AI_DECISION', authority: 'Named publication steward' });
  assert.equal(state.ai.publicationStanding, 'approved');
});

test('role hold narrows projection and invalidates the cache', () => {
  let state = authorize(createInitialState(accepted));
  assert.equal(state.visibleProjection.owner, 'Example review team');
  state = transition(state, { type: 'AUTHORIZE', outcome: 'held', command: fixture });
  assert.equal(state.dimensions.authorization, 'held');
  assert.equal(state.dimensions.cache, 'invalidated');
  assert.equal(Object.hasOwn(state.visibleProjection, 'owner'), false);
  assert.match(state.visibleProjection.nextAction, /authorized projection/u);
});

test('authorization hold cancels bounded work, masks inspectable fields, and gates publication', () => {
  let state = startAi(authorize(createInitialState(accepted)));
  state = transition(state, { type: 'AI_CANCEL' });
  state = transition(state, { type: 'AI_RETRY' });
  assert.equal(state.dimensions.aiCall, 'bounded_running');
  state = transition(state, { type: 'AUTHORIZE', outcome: 'held', command: fixture });
  assert.equal(state.dimensions.aiCall, 'cancelled');
  assert.equal(state.dimensions.disclosure, 'compact');
  const visible = inspectableState(state);
  assert.equal(visible.ai.budget, 0);
  assert.equal(Object.hasOwn(visible.ai, 'sourceAuthority'), false);
  assert.equal(visible.events.every(event => event.summary === 'A transition receipt remains available to its authorized owner.'), true);

  let acceptedDecision = startAi(authorize(createInitialState(accepted)));
  acceptedDecision = transition(acceptedDecision, {
    type: 'AI_RESULT', used: 2, complete: true,
    claim: 'Revision 7 is assembled and ready for the named review step',
    evidence: 'Synthetic accepted-state fixture at revision 7',
    evidenceStanding: 'observed',
  });
  acceptedDecision = transition(acceptedDecision, { type: 'ACCEPT_AI_DECISION', receiver: 'Named review lead' });
  acceptedDecision = transition(acceptedDecision, { type: 'AUTHORIZE', outcome: 'held', command: fixture });
  assert.throws(() => transition(acceptedDecision, {
    type: 'PUBLISH_AI_DECISION', authority: 'Named publication steward',
  }), error => {
    assert.equal(error.code, 'AUTHORIZATION_REQUIRED');
    return true;
  });
});

test('a later allowed context sees only the receipts, outbox, generated work, and events it owns', () => {
  let state = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  state = transition(state, { type: 'PUBLISH_OUTBOX' });
  state = startAi(state);
  state = transition(state, {
    type: 'AI_RESULT', used: 2, complete: false,
    claim: 'Revision 8 is ready for review by the named receiver',
    evidence: 'Synthetic committed receipt at revision 8',
    evidenceStanding: 'observed',
  });
  const laterContext = {
    ...fixture,
    id: 'command-review-0143',
    actor: 'another-review-coordinator',
    role: 'another-authorized-reviewer',
    tenant: 'another-example-team',
    policyRevision: 'policy-2026-11',
    representation: 'another-operational-summary',
    baseRevision: 8,
    idempotencyKey: 'review-0143-r8',
  };
  state = authorize(state, laterContext);
  const visible = inspectableState(state);
  assert.deepEqual(visible.receipts, {});
  assert.deepEqual(visible.outbox, { status: 'absent', eventId: null });
  assert.equal(visible.ai.budget, 0);
  assert.equal(Object.hasOwn(visible.ai, 'claim'), false);
  assert.equal(visible.issue, null);
  assert.equal(visible.events.length, 1);
  assert.equal(visible.events[0].type, 'AUTHORIZE');
  assert.equal(visible.dimensions.receipt, 'absent');
  assert.equal(visible.dimensions.aiCall, 'unstarted');
  assert.throws(() => transition(state, {
    type: 'ACCEPT_AI_DECISION', receiver: 'Named review lead',
  }), error => {
    assert.equal(error.code, 'AUTHORIZATION_CONTEXT_MISMATCH');
    return true;
  });
});

test('outbox recovery context survives a held projection and returns to its owning grant', () => {
  let state = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  state = transition(state, {
    type: 'FAIL_OUTBOX',
    issueId: 'ISSUE-OUTBOX-03',
    code: 'DOWNSTREAM_UNAVAILABLE',
    message: 'The downstream receiver deferred this delivery attempt.',
    recovery: 'Retry the same outbox event after the receiver becomes available.',
  });
  state = transition(state, { type: 'AUTHORIZE', outcome: 'held', command: fixture });
  assert.equal(inspectableState(state).issue.code, 'PROJECTION_HELD');
  state = authorize(state, fixture);
  assert.equal(inspectableState(state).issue.code, 'DOWNSTREAM_UNAVAILABLE');
  state = transition(state, { type: 'RETRY_OUTBOX' });
  assert.equal(state.outbox.status, 'pending');
});

test('independent issue channels preserve concurrent outbox, AI, and eligibility recovery', () => {
  let state = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  state = transition(state, {
    type: 'FAIL_OUTBOX',
    issueId: 'ISSUE-OUTBOX-04',
    code: 'DOWNSTREAM_UNAVAILABLE',
    message: 'The downstream receiver deferred this delivery attempt.',
    recovery: 'Retry the same outbox event after the receiver becomes available.',
  });
  state = startAi(state);
  assert.equal(state.issues.outbox.code, 'DOWNSTREAM_UNAVAILABLE');
  assert.equal(state.issues.ai, null);
  state = transition(state, {
    type: 'AI_TIMEOUT',
    issueId: 'ISSUE-AI-TIME-02',
    message: 'The bounded call reached its declared time boundary.',
    recovery: 'Resume from the named AI checkpoint with the same input projection.',
  });
  state = transition(state, {
    type: 'APPLY_LATE_RESULT', sourceId: fixture.sourceId, baseRevision: 7,
  });
  let visible = inspectableState(state);
  assert.equal(visible.issues.outbox.code, 'DOWNSTREAM_UNAVAILABLE');
  assert.equal(visible.issues.ai.code, 'AI_TIMEOUT');
  assert.equal(visible.issues.eligibility.code, 'STALE_RESULT');
  state = transition(state, { type: 'AI_RETRY' });
  assert.equal(state.issues.ai, null);
  assert.equal(state.issues.outbox.code, 'DOWNSTREAM_UNAVAILABLE');
  assert.equal(state.issues.eligibility.code, 'STALE_RESULT');
  state = transition(state, { type: 'RETRY_OUTBOX' });
  visible = inspectableState(state);
  assert.equal(visible.issues.outbox, null);
  assert.equal(visible.issues.ai, null);
  assert.equal(visible.issues.eligibility.code, 'STALE_RESULT');
});

test('an allowed grant receives detailed accepted fields only for its owned source and revision', () => {
  const unrelated = {
    ...fixture,
    id: 'command-unrelated-0143',
    sourceId: 'synthetic-case-unrelated',
    tenant: 'another-example-team',
    idempotencyKey: 'unrelated-0143-r7',
  };
  const state = authorize(createInitialState(accepted), unrelated);
  assert.equal(Object.hasOwn(state.visibleProjection, 'owner'), false);
  assert.equal(Object.hasOwn(state.visibleProjection, 'nextAction'), true);
  assert.equal(state.visibleProjection.nextAction, 'Request an authorized projection');
});

test('semantic rows derive every visible dimension from the accepted model', () => {
  const state = authorize(createInitialState(accepted));
  const rows = semanticRows(state);
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.map(row => row.dimension), [
    'Request', 'Authorization', 'Transaction', 'Receipt', 'Cache', 'AI call', 'Disclosure', 'Decision',
  ]);
  assert.equal(rows.find(row => row.dimension === 'Authorization').state, 'allowed');
});

test('owned fields detach from callers and surplus getters remain unread', () => {
  const supplied = { ...accepted };
  Object.defineProperty(supplied, 'surplus', {
    enumerable: true,
    get() { throw new Error('Surplus accepted metadata must stay outside the projection.'); },
  });
  const state = createInitialState(supplied);
  supplied.status = 'changed-by-caller';
  assert.equal(state.accepted.status, 'assembled');
  assert.equal(Object.hasOwn(state.accepted, 'surplus'), false);
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.accepted));
});

test('accepted record admission requires a plain record with own authority and state fields', () => {
  const inheritedAuthority = Object.assign(Object.create({
    status: accepted.status,
    owner: accepted.owner,
  }), {
    id: accepted.id,
    revision: accepted.revision,
    nextAction: accepted.nextAction,
    sourceId: accepted.sourceId,
  });
  assert.throws(() => createInitialState(inheritedAuthority), error => {
    assert.equal(error.code, 'INVALID_RECORD');
    assert.equal(error.stage, 'admission');
    return true;
  });

  const missingAuthority = { ...accepted };
  delete missingAuthority.owner;
  assert.throws(() => createInitialState(missingAuthority), error => {
    assert.equal(error.code, 'INVALID_RECORD_SHAPE');
    assert.equal(error.stage, 'admission');
    return true;
  });

  const projected = createInitialState({ ...accepted, sourceNote: 'Retained by the source owner' });
  assert.deepEqual(projected.accepted, accepted);
  assert.equal(Object.hasOwn(projected.accepted, 'sourceNote'), false);
});

test('persisted connection admission preserves booleans and defaults only an omitted release field', () => {
  const released = createInitialState(accepted);
  const explicit = transition({ ...released, connection: { owner: null, released: true } }, {
    type: 'SET_DISCLOSURE', value: 'expanded',
  });
  assert.equal(explicit.connection.released, true);

  const omitted = transition({ ...released, connection: { owner: null } }, {
    type: 'SET_DISCLOSURE', value: 'expanded',
  });
  assert.equal(omitted.connection.released, true);

  const active = begin(authorize(createInitialState(accepted)));
  const owned = transition({ ...active, connection: { owner: fixture.id, released: false } }, {
    type: 'SET_DISCLOSURE', value: 'expanded',
  });
  assert.equal(owned.connection.released, false);

  for (const supplied of ['false', 0, null, undefined]) {
    assert.throws(() => transition({
      ...released,
      connection: { owner: null, released: supplied },
    }, { type: 'SET_DISCLOSURE', value: 'expanded' }), error => {
      assert.equal(error.code, 'INVALID_CONNECTION_RELEASED');
      assert.equal(error.stage, 'admission');
      return true;
    });
  }
});

test('authorization changes release active ownership and a second begin stays outside it', () => {
  let active = checkpoint(begin(authorize(createInitialState(accepted))));
  assert.throws(() => transition(active, { type: 'BEGIN', command: fixture }), error => {
    assert.equal(error.code, 'ACTIVE_OWNERSHIP_CONFLICT');
    return true;
  });
  active = transition(active, { type: 'AUTHORIZE', outcome: 'held', command: fixture });
  assert.equal(active.dimensions.transaction, 'rolled_back');
  assert.equal(active.connection.released, true);
  assert.equal(active.candidate, null);
  assert.equal(active.checkpoint.id, 'checkpoint-review-0142');
});

test('idempotency binds the key to immutable request meaning', () => {
  let committed = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  assert.match(commandFingerprint(fixture), /^fnv1a32:[0-9a-f]{8}$/u);
  const changedMeaning = { ...fixture, proposedStatus: 'released' };
  committed = authorize(committed, changedMeaning);
  assert.throws(() => transition(committed, { type: 'BEGIN', command: changedMeaning }), error => {
    assert.equal(error.code, 'IDEMPOTENCY_CONFLICT');
    return true;
  });
});

test('cache identity separates role and policy revision', () => {
  assert.notEqual(cacheKeyFor(fixture), cacheKeyFor({ ...fixture, role: 'release-reviewer' }));
  assert.notEqual(cacheKeyFor(fixture), cacheKeyFor({ ...fixture, policyRevision: 'policy-2026-11' }));
  assert.notEqual(cacheKeyFor(fixture), cacheKeyFor({ ...fixture, sourceId: 'synthetic-case-0143' }));
  assert.notEqual(cacheKeyFor(fixture), cacheKeyFor({ ...fixture, baseRevision: 8 }));
  assert.notEqual(
    cacheKeyFor({ ...fixture, actor: 'a::b', role: 'c' }),
    cacheKeyFor({ ...fixture, actor: 'a', role: 'b::c' }),
  );
});

test('outbox delivery failure retains the receipt and supports bounded retry', () => {
  let state = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  state = transition(state, {
    type: 'FAIL_OUTBOX',
    issueId: 'ISSUE-OUTBOX-01',
    code: 'DOWNSTREAM_UNAVAILABLE',
    message: 'The downstream receiver deferred this delivery attempt.',
    recovery: 'Retry the same outbox event after the receiver becomes available.',
  });
  assert.equal(state.outbox.status, 'failed');
  assert.equal(state.accepted.revision, 8);
  assert.equal(state.dimensions.receipt, 'accepted');
  state = transition(state, { type: 'RETRY_OUTBOX' });
  state = transition(state, { type: 'PUBLISH_OUTBOX' });
  assert.equal(state.outbox.status, 'published');
});

test('pending or failed outbox work keeps a later durable effect outside the transaction', () => {
  let state = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  const nextCommand = {
    ...fixture,
    id: 'command-review-0143',
    baseRevision: 8,
    idempotencyKey: 'review-0143-r8',
  };
  state = authorize(state, nextCommand);
  assert.throws(() => transition(state, { type: 'BEGIN', command: nextCommand }), error => {
    assert.equal(error.code, 'OUTBOX_HANDOFF_REQUIRED');
    return true;
  });
  assert.throws(() => transition(state, {
    type: 'FAIL_OUTBOX',
    issueId: 'ISSUE-OUTBOX-02',
    code: 'DOWNSTREAM_UNAVAILABLE',
    message: 'The downstream receiver deferred this delivery attempt.',
    recovery: 'Retry the same outbox event after the receiver becomes available.',
  }), error => {
    assert.equal(error.code, 'AUTHORIZATION_CONTEXT_MISMATCH');
    return true;
  });
  state = authorize(state, fixture);
  state = transition(state, {
    type: 'FAIL_OUTBOX',
    issueId: 'ISSUE-OUTBOX-02',
    code: 'DOWNSTREAM_UNAVAILABLE',
    message: 'The downstream receiver deferred this delivery attempt.',
    recovery: 'Retry the same outbox event after the receiver becomes available.',
  });
  state = authorize(state, nextCommand);
  assert.throws(() => transition(state, { type: 'BEGIN', command: nextCommand }), error => {
    assert.equal(error.code, 'OUTBOX_HANDOFF_REQUIRED');
    return true;
  });
  state = authorize(state, fixture);
  const replay = transition(state, { type: 'BEGIN', command: fixture });
  assert.equal(replay.events.at(-1).type, 'REPLAY');
  assert.equal(replay.issue.code, 'DOWNSTREAM_UNAVAILABLE');
});

test('bounded caller retains checkpoints through failure, timeout, and retry', () => {
  let state = startAi(authorize(createInitialState(accepted)));
  state = transition(state, {
    type: 'AI_TIMEOUT',
    issueId: 'ISSUE-AI-TIME-01',
    message: 'The bounded call reached its declared time boundary.',
    recovery: 'Resume from the named AI checkpoint with the same input projection.',
  });
  assert.equal(state.dimensions.aiCall, 'timed_out');
  assert.equal(state.ai.checkpointId, 'ai-checkpoint-review-0142');
  state = transition(state, { type: 'AI_RETRY' });
  assert.equal(state.dimensions.aiCall, 'bounded_running');
  assert.equal(state.ai.used, 0);
});

test('a second authorization context preserves failed, partial, and accepted unpublished AI work', () => {
  const cases = [
    {
      name: 'failed',
      arrange(state) {
        return transition(state, {
          type: 'AI_FAIL',
          issueId: 'ISSUE-AI-FAIL-02',
          message: 'The bounded call reached a controlled failure boundary.',
          recovery: 'Resume from the named AI checkpoint with the same input projection.',
        });
      },
      standing: 'failed',
      issueCode: 'AI_FAILURE',
      settle(state) { return transition(state, { type: 'AI_RETRY' }); },
      settledStanding: 'bounded_running',
    },
    {
      name: 'partial',
      arrange(state) {
        return transition(state, {
          type: 'AI_RESULT', used: 2, complete: false,
          claim: 'Revision 7 is assembled and ready for continued review',
          evidence: 'Synthetic accepted-state fixture at revision 7',
          evidenceStanding: 'observed',
        });
      },
      standing: 'partial',
      issueCode: 'PARTIAL_RESULT',
      settle(state) {
        state = transition(state, { type: 'ACCEPT_AI_DECISION', receiver: 'Named review lead' });
        return transition(state, { type: 'PUBLISH_AI_DECISION', authority: 'Named publication steward' });
      },
      settledStanding: 'partial',
    },
    {
      name: 'accepted unpublished',
      arrange(state) {
        state = transition(state, {
          type: 'AI_RESULT', used: 2, complete: true,
          claim: 'Revision 7 is assembled and ready for the named review step',
          evidence: 'Synthetic accepted-state fixture at revision 7',
          evidenceStanding: 'observed',
        });
        return transition(state, { type: 'ACCEPT_AI_DECISION', receiver: 'Named review lead' });
      },
      standing: 'held_for_review',
      issueCode: null,
      settle(state) {
        return transition(state, { type: 'PUBLISH_AI_DECISION', authority: 'Named publication steward' });
      },
      settledStanding: 'held_for_review',
    },
  ];

  for (const scenario of cases) {
    let state = scenario.arrange(startAi(authorize(createInitialState(accepted))));
    const retainedAi = state.ai;
    const retainedIssue = state.issues.ai;
    state = authorize(state, alternateCommand);
    assert.throws(() => transition(state, {
      ...startAiEvent,
      checkpointId: 'ai-checkpoint-review-0143',
    }), error => {
      assert.equal(error.code, 'AI_RECOVERY_OWNERSHIP_CONFLICT', scenario.name);
      assert.equal(error.stage, 'ai_call', scenario.name);
      return true;
    });
    assert.deepEqual(state.ai, retainedAi, scenario.name);
    assert.deepEqual(state.issues.ai, retainedIssue, scenario.name);
    assert.equal(inspectableState(state).dimensions.aiCall, 'unstarted', scenario.name);

    state = authorize(state, fixture);
    const visible = inspectableState(state);
    assert.equal(visible.dimensions.aiCall, scenario.standing, scenario.name);
    assert.equal(visible.ai.checkpointId, 'ai-checkpoint-review-0142', scenario.name);
    assert.equal(visible.ai.claim, retainedAi.claim, scenario.name);
    assert.equal(visible.issues.ai?.code ?? null, scenario.issueCode, scenario.name);
    state = scenario.settle(state);
    assert.equal(state.dimensions.aiCall, scenario.settledStanding, scenario.name);
    if (scenario.name !== 'failed') assert.equal(state.ai.publicationStanding, 'approved', scenario.name);
  }
});

test('the owning context may supersede retained AI recovery and publication releases the slot', () => {
  let state = startAi(authorize(createInitialState(accepted)));
  state = transition(state, {
    type: 'AI_FAIL',
    issueId: 'ISSUE-AI-FAIL-03',
    message: 'The bounded call reached a controlled failure boundary.',
    recovery: 'Resume from the named AI checkpoint with the same input projection.',
  });
  state = startAi(state);
  assert.equal(state.dimensions.aiCall, 'bounded_running');
  assert.equal(state.issues.ai, null);

  state = transition(state, {
    type: 'AI_RESULT', used: 2, complete: true,
    claim: 'Revision 7 is assembled and ready for the named review step',
    evidence: 'Synthetic accepted-state fixture at revision 7',
    evidenceStanding: 'observed',
  });
  state = transition(state, { type: 'ACCEPT_AI_DECISION', receiver: 'Named review lead' });
  state = transition(state, { type: 'PUBLISH_AI_DECISION', authority: 'Named publication steward' });
  state = authorize(state, alternateCommand);
  state = transition(state, {
    ...startAiEvent,
    checkpointId: 'ai-checkpoint-review-0143',
  });
  assert.equal(state.dimensions.aiCall, 'bounded_running');
  assert.equal(state.ai.authorizationMeaning.id, alternateCommand.id);
  assert.equal(state.ai.checkpointId, 'ai-checkpoint-review-0143');
});

test('bounded caller cancellation releases run ownership and retains its checkpoint', () => {
  let state = startAi(authorize(createInitialState(accepted)));
  state = transition(state, { type: 'AI_CANCEL' });
  assert.equal(state.dimensions.aiCall, 'cancelled');
  assert.equal(state.ai.checkpointId, 'ai-checkpoint-review-0142');
  assert.equal(state.issue.code, 'AI_CALL_CANCELLED');
});

test('receiver and publication authority remain separate decision boundaries', () => {
  let state = startAi(authorize(createInitialState(accepted)));
  state = transition(state, {
    type: 'AI_RESULT', used: 2, complete: true,
    claim: 'Revision 7 is assembled and ready for the named review step',
    evidence: 'Synthetic accepted-state fixture at revision 7',
    evidenceStanding: 'observed',
  });
  assert.throws(() => transition(state, { type: 'ACCEPT_AI_DECISION', receiver: 'Another reviewer' }), /named receiver/u);
  state = transition(state, { type: 'ACCEPT_AI_DECISION', receiver: 'Named review lead' });
  assert.equal(state.dimensions.aiCall, 'held_for_review');
  assert.throws(() => transition(state, { type: 'PUBLISH_AI_DECISION', authority: 'Another steward' }), /publication authority/u);
  state = transition(state, { type: 'PUBLISH_AI_DECISION', authority: 'Named publication steward' });
  assert.equal(state.ai.publicationStanding, 'approved');
});

test('closed state and event shapes preserve admission boundaries', () => {
  const state = authorize(createInitialState(accepted));
  assert.throws(() => transition(state, { type: 'SET_DISCLOSURE', value: 'expanded', surplus: true }), error => {
    assert.equal(error.code, 'INVALID_EVENT_SHAPE');
    return true;
  });
  assert.throws(() => transition({ ...state, dimensions: { ...state.dimensions, surprise: 'field' } }, {
    type: 'SET_DISCLOSURE', value: 'expanded',
  }), /unsupported fields/u);
});

test('secret-shaped values stay outside state, issues, and event logs', () => {
  const passwordShapedMessage = ['password', 'examplevalue'].join(': ');
  for (const secretShapedText of secretShapedTexts) {
    assert.throws(() => transition(authorize(createInitialState(accepted)), {
      type: 'BEGIN',
      command: { ...fixture, task: secretShapedText },
    }), error => {
      assert.equal(error.code, 'SECRET_SHAPED_TEXT');
      return true;
    });
    assert.throws(() => transition(authorize(createInitialState(accepted)), {
      ...startAiEvent,
      task: secretShapedText,
    }), error => {
      assert.equal(error.code, 'SECRET_SHAPED_TEXT');
      return true;
    });
  }
  const active = begin(authorize(createInitialState(accepted)));
  assert.throws(() => transition(active, {
    type: 'FAIL',
    issueId: 'ISSUE-SAFE-01',
    code: 'CONTROLLED_FAILURE',
    message: passwordShapedMessage,
    recovery: 'Begin from the accepted revision.',
  }), error => {
    assert.equal(error.code, 'SECRET_SHAPED_TEXT');
    return true;
  });
});

test('retained events keep a monotonic sequence after the eighty-record window', () => {
  let state = createInitialState(accepted);
  for (let index = 0; index < 92; index += 1) {
    state = transition(state, { type: 'SET_DISCLOSURE', value: index % 2 === 0 ? 'expanded' : 'compact' });
  }
  assert.equal(state.events.length, 80);
  assert.equal(state.eventSequence, 92);
  assert.equal(state.events[0].step, 13);
  assert.equal(state.events.at(-1).step, 92);
});

test('snapshot pagination stays stable under concurrent inserts', () => {
  const records = [
    { id: 'a', sortKey: '01', createdRevision: 7, label: 'Alpha' },
    { id: 'b', sortKey: '02', createdRevision: 7, label: 'Beta' },
    { id: 'c', sortKey: '03', createdRevision: 7, label: 'Gamma' },
  ];
  const first = paginateStable(records, { snapshotRevision: 7, limit: 2 });
  const second = paginateStable([
    ...records,
    { id: 'aa', sortKey: '015', createdRevision: 8, label: 'Later insert' },
  ], { cursor: first.nextCursor, limit: 2 });
  assert.deepEqual(first.items.map(item => item.id), ['a', 'b']);
  assert.deepEqual(second.items.map(item => item.id), ['c']);
  assert.equal(first.nextCursor.snapshotRevision, 7);
  assert.throws(() => paginateStable(records, {
    snapshotRevision: 8,
    cursor: first.nextCursor,
    limit: 2,
  }), error => {
    assert.equal(error.code, 'CURSOR_SNAPSHOT_MISMATCH');
    return true;
  });
});

test('snapshot pagination admits the declared ceiling and rejects the first record beyond it before record work', () => {
  const atCeiling = Array.from({ length: MAX_PAGE_RECORDS }, (_, index) => ({
    id: `record-${index}`,
    sortKey: `sort-${String(index).padStart(4, '0')}`,
    createdRevision: 7,
    label: `Record ${index}`,
  }));
  const page = paginateStable(atCeiling, { snapshotRevision: 7, limit: 50 });
  assert.equal(page.items.length, 50);
  assert.equal(page.nextCursor.snapshotRevision, 7);

  const unreadRecord = {
    get id() { throw new Error('Record projection began before the collection ceiling check.'); },
    sortKey: 'unread',
    createdRevision: 7,
    label: 'Unread record',
  };
  const firstOverCeiling = Array.from({ length: MAX_PAGE_RECORDS + 1 }, () => unreadRecord);
  assert.throws(() => paginateStable(firstOverCeiling, {
    snapshotRevision: 7,
    limit: 50,
  }), error => {
    assert.equal(error.code, 'PAGE_RECORD_LIMIT');
    assert.equal(error.stage, 'admission');
    return true;
  });
});

test('snapshot pagination rejects sparse and inherited array entries as typed admission failures', () => {
  const sparse = [];
  sparse.length = 1;
  assert.throws(() => paginateStable(sparse, {
    snapshotRevision: 7,
    limit: 1,
  }), error => {
    assert.equal(error.code, 'INVALID_PAGE_RECORD');
    assert.equal(error.stage, 'admission');
    return true;
  });

  let inheritedEntryRead = false;
  const inherited = [];
  inherited.length = 1;
  const inheritedPrototype = Object.create(Array.prototype);
  Object.defineProperty(inheritedPrototype, '0', {
    configurable: true,
    get() {
      inheritedEntryRead = true;
      return { id: 'inherited', sortKey: '01', createdRevision: 7, label: 'Inherited' };
    },
  });
  Object.setPrototypeOf(inherited, inheritedPrototype);

  assert.throws(() => paginateStable(inherited, {
    snapshotRevision: 7,
    limit: 1,
  }), error => {
    assert.equal(error.code, 'INVALID_PAGE_RECORD');
    assert.equal(error.stage, 'admission');
    return true;
  });
  assert.equal(inheritedEntryRead, false, 'admission rejects inherited entries before property access');
});

test('authorization binds the allowed outcome to one exact command context', () => {
  const state = authorize(createInitialState(accepted));
  const changedPolicy = { ...fixture, policyRevision: 'policy-2026-11' };
  assert.throws(() => transition(state, { type: 'BEGIN', command: changedPolicy }), error => {
    assert.equal(error.code, 'AUTHORIZATION_CONTEXT_MISMATCH');
    return true;
  });
  assert.equal(state.accepted.revision, 7);
  assert.equal(state.dimensions.transaction, 'unstarted');
});

test('transaction and bounded-call ownership remain mutually exclusive', () => {
  const activeTransaction = begin(authorize(createInitialState(accepted)));
  assert.throws(() => startAi(activeTransaction), error => {
    assert.equal(error.code, 'ACTIVE_OWNERSHIP_CONFLICT');
    return true;
  });

  const activeCall = startAi(authorize(createInitialState(accepted)));
  assert.throws(() => begin(activeCall), error => {
    assert.equal(error.code, 'AI_CALL_ACTIVE');
    return true;
  });
});

test('authorization compares admitted meaning when compact fingerprints collide', () => {
  const authorizedCommand = { ...fixture, proposedStatus: 'status-31819' };
  const collisionCommand = { ...fixture, proposedStatus: 'status-174576' };
  assert.equal(commandFingerprint(authorizedCommand), 'fnv1a32:0710d1c8');
  assert.equal(commandFingerprint(collisionCommand), commandFingerprint(authorizedCommand));

  const state = authorize(createInitialState(accepted), authorizedCommand);
  assert.throws(() => transition(state, { type: 'BEGIN', command: collisionCommand }), error => {
    assert.equal(error.code, 'AUTHORIZATION_CONTEXT_MISMATCH');
    assert.equal(error.stage, 'begin');
    return true;
  });
  assert.equal(state.accepted.revision, 7);
  assert.equal(state.authorizationGrant.requestMeaning.proposedStatus, authorizedCommand.proposedStatus);
});

test('commit revalidates the exact grant when authorization changes during an active transaction', () => {
  let state = begin(authorize(createInitialState(accepted)));
  const changedCommand = {
    ...fixture,
    id: 'command-review-0143',
    idempotencyKey: 'review-0143-r7',
    policyRevision: 'policy-2026-11',
  };
  const changedGrant = authorize(createInitialState(accepted), changedCommand).authorizationGrant;
  state = { ...state, authorizationGrant: changedGrant };

  assert.throws(() => commit(state), error => {
    assert.equal(error.code, 'AUTHORIZATION_CONTEXT_MISMATCH');
    assert.equal(error.stage, 'commit');
    return true;
  });
  assert.equal(state.accepted.revision, 7);
  assert.equal(state.candidate.id, fixture.id);
  assert.equal(state.authorizationGrant.commandId, changedCommand.id);
  assert.equal(state.connection.owner, fixture.id);
});

test('an allowed context change releases active ownership before another command can proceed', () => {
  let state = checkpoint(begin(authorize(createInitialState(accepted))));
  const changedCommand = {
    ...fixture,
    id: 'command-review-0143',
    idempotencyKey: 'review-0143-r7',
    policyRevision: 'policy-2026-11',
  };
  state = authorize(state, changedCommand);
  assert.equal(state.dimensions.transaction, 'rolled_back');
  assert.equal(state.candidate, null);
  assert.equal(state.connection.released, true);
  assert.equal(state.checkpoint.command.id, fixture.id);
  const visible = inspectableState(state);
  assert.equal(visible.dimensions.transaction, 'unstarted');
  assert.equal(visible.checkpoint, null);
});

test('prototype-shaped idempotency keys remain ordinary missing receipt keys', () => {
  const prototypeKey = { ...fixture, idempotencyKey: 'toString' };
  let state = authorize(createInitialState(accepted), prototypeKey);
  assert.doesNotThrow(() => { state = transition(state, { type: 'BEGIN', command: prototypeKey }); });
  assert.equal(state.candidate.idempotencyKey, 'toString');
});

test('mixed-case pagination uses one comparator before and after the cursor', () => {
  const records = [
    { id: 'a', sortKey: 'a', createdRevision: 7, label: 'Lowercase a' },
    { id: 'b', sortKey: 'B', createdRevision: 7, label: 'Uppercase B' },
    { id: 'c', sortKey: 'c', createdRevision: 7, label: 'Lowercase c' },
  ];
  const first = paginateStable(records, { snapshotRevision: 7, limit: 1 });
  const second = paginateStable(records, { cursor: first.nextCursor, limit: 1 });
  const third = paginateStable(records, { cursor: second.nextCursor, limit: 1 });
  assert.deepEqual([...first.items, ...second.items, ...third.items].map(item => item.id), ['b', 'a', 'c']);
});

test('pagination rejects duplicate ids and cursor identities before a stable walk begins', () => {
  assert.throws(() => paginateStable([
    { id: 'duplicate', sortKey: 'a', createdRevision: 7, label: 'First' },
    { id: 'duplicate', sortKey: 'a', createdRevision: 7, label: 'Second' },
  ], { snapshotRevision: 7, limit: 1 }), error => {
    assert.equal(error.code, 'DUPLICATE_PAGE_IDENTITY');
    return true;
  });
  assert.throws(() => paginateStable([
    { id: 'duplicate', sortKey: 'a', createdRevision: 7, label: 'First' },
    { id: 'duplicate', sortKey: 'b', createdRevision: 7, label: 'Second' },
  ], { snapshotRevision: 7, limit: 1 }), error => {
    assert.equal(error.code, 'DUPLICATE_PAGE_IDENTITY');
    return true;
  });
});

test('maximum-length receipt and idempotency identities complete outbox delivery and replay', () => {
  const maximumCommand = { ...fixture, idempotencyKey: 'i'.repeat(160) };
  const maximumReceiptId = 'r'.repeat(160);
  let state = authorize(createInitialState(accepted), maximumCommand);
  state = transition(state, { type: 'BEGIN', command: maximumCommand });
  state = transition(state, { type: 'COMMIT', receiptId: maximumReceiptId });
  assert.equal(state.outbox.eventId.length, 166);
  state = transition(state, { type: 'PUBLISH_OUTBOX' });
  state = transition(state, { type: 'BEGIN', command: maximumCommand });
  assert.equal(state.events.at(-1).type, 'REPLAY');
  assert.equal(state.receipts[maximumCommand.idempotencyKey].id, maximumReceiptId);
});

test('an active bounded call requires at least one declared tool', () => {
  const state = authorize(createInitialState(accepted));
  assert.throws(() => transition(state, {
    ...startAiEvent,
    tools: [],
  }), error => {
    assert.equal(error.code, 'INVALID_AI_TOOLS');
    return true;
  });
});

test('duplicate receipt identities stay outside the durable receipt family', () => {
  let state = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
  state = transition(state, { type: 'PUBLISH_OUTBOX' });
  const nextCommand = { ...fixture, id: 'command-review-0143', baseRevision: 8, idempotencyKey: 'review-0143-r8' };
  state = transition(authorize(state, nextCommand), { type: 'BEGIN', command: nextCommand });
  assert.throws(() => transition(state, { type: 'COMMIT', receiptId: 'receipt-review-0142' }), error => {
    assert.equal(error.code, 'DUPLICATE_RECEIPT_ID');
    return true;
  });
  assert.equal(state.accepted.revision, 8);
  assert.equal(Object.keys(state.receipts).length, 1);
});

test('replay preserves rolled-back and held receipt outcomes', () => {
  for (const [outcome, request, transaction] of [
    ['rolled_back', 'failed', 'rolled_back'],
    ['held', 'cancelled', 'rolled_back'],
  ]) {
    let state = commit(checkpoint(begin(authorize(createInitialState(accepted)))));
    const receipt = state.receipts[fixture.idempotencyKey];
    state = {
      ...state,
      dimensions: { ...state.dimensions, request: 'idle', transaction: 'unstarted', receipt: 'absent' },
      receipts: {
        ...state.receipts,
        [fixture.idempotencyKey]: { ...receipt, outcome },
      },
      outbox: { status: 'absent', eventId: null },
    };
    state = authorize(state);
    const replay = transition(state, { type: 'BEGIN', command: fixture });
    assert.equal(replay.dimensions.request, request);
    assert.equal(replay.dimensions.transaction, transaction);
    assert.equal(replay.dimensions.receipt, 'rejected');
    assert.equal(replay.events.at(-1).type, 'REPLAY');
  }
});

test('declared reader adapters normalize supported mixed record versions', () => {
  assert.deepEqual(readVersionedRecord({ schemaVersion: 1, id: 'a', label: 'Alpha', status: 'ready' }), {
    id: 'a', title: 'Alpha', standing: 'ready', sourceVersion: 1,
  });
  assert.deepEqual(readVersionedRecord({ schemaVersion: 2, id: 'b', title: 'Beta', standing: 'held' }), {
    id: 'b', title: 'Beta', standing: 'held', sourceVersion: 2,
  });
  assert.throws(() => readVersionedRecord({ schemaVersion: 3 }), error => {
    assert.equal(error.code, 'UNSUPPORTED_RECORD_VERSION');
    return true;
  });
});
