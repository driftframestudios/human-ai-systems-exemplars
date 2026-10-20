/**
 * Deterministic state and evidence model for the service-boundary lab.
 *
 * The model owns accepted state plus authorization, durability, and eligibility
 * decisions. Renderers receive detached projections of those decisions.
 */

export const MODEL_VERSION = '1.2.0';

export const DIMENSION_VALUES = Object.freeze({
  request: Object.freeze(['idle', 'pending', 'succeeded', 'failed', 'timed_out', 'cancelled']),
  authorization: Object.freeze(['unknown', 'allowed', 'held', 'denied']),
  transaction: Object.freeze(['unstarted', 'active', 'committed', 'rolled_back']),
  receipt: Object.freeze(['absent', 'provisional', 'accepted', 'rejected']),
  cache: Object.freeze(['absent', 'current', 'stale', 'invalidated']),
  aiCall: Object.freeze(['unstarted', 'bounded_running', 'partial', 'complete', 'held_for_review', 'failed', 'timed_out', 'cancelled']),
  disclosure: Object.freeze(['compact', 'expanded']),
  decision: Object.freeze(['open', 'human_held', 'accepted', 'revised']),
});

const COMMAND_FIELDS = Object.freeze([
  'id',
  'task',
  'actor',
  'role',
  'tenant',
  'policyScope',
  'policyRevision',
  'representation',
  'sourceId',
  'baseRevision',
  'idempotencyKey',
  'proposedStatus',
]);

const MAX_TEXT = 160;
const OUTBOX_EVENT_PREFIX = 'event-';
const MAX_OUTBOX_EVENT_ID = MAX_TEXT + OUTBOX_EVENT_PREFIX.length;
// A replay summary can carry two independently admitted identities plus its
// explanatory text. Derive this boundary from the public contract instead of
// introducing a smaller, accidental limit in the evidence log.
const MAX_EVENT_SUMMARY = (MAX_TEXT * 2) + 96;
const MAX_CACHE_KEY = (MAX_TEXT + String(MAX_TEXT).length + 1) * 8 + 24;
const MAX_EVENTS = 80;
const MAX_RECEIPTS = 24;
const SAFE_TEXT = /^[\p{L}\p{N} .,:;_@/+\-()]+$/u;
const SECRET_SHAPED_TEXT = Object.freeze([
  /\b(?:api[ _-]?key|password|secret|token)\s*:\s*\S+/iu,
  /\b(?:github_pat|ghp|gho|ghu|ghs|ghr|sk)_[\p{L}\p{N}_-]{8,}\b/iu,
]);
const DIMENSION_FIELDS = Object.freeze(Object.keys(DIMENSION_VALUES));
const RECEIPT_OUTCOMES = Object.freeze(['committed', 'rolled_back', 'held']);
const OUTBOX_STATES = Object.freeze(['absent', 'pending', 'published', 'failed']);
const EVIDENCE_STANDINGS = Object.freeze(['observed', 'inferred', 'undetermined']);
const PUBLICATION_STANDINGS = Object.freeze(['human_held', 'approved']);
const ISSUE_CHANNELS = Object.freeze(['outbox', 'request', 'ai', 'eligibility']);
const EVENT_FIELDS = Object.freeze({
  AUTHORIZE: Object.freeze(['type', 'outcome', 'command']),
  BEGIN: Object.freeze(['type', 'command']),
  CHECKPOINT: Object.freeze(['type', 'id']),
  COMMIT: Object.freeze(['type', 'receiptId']),
  PUBLISH_OUTBOX: Object.freeze(['type']),
  FAIL_OUTBOX: Object.freeze(['type', 'issueId', 'code', 'message', 'recovery']),
  RETRY_OUTBOX: Object.freeze(['type']),
  FAIL: Object.freeze(['type', 'issueId', 'code', 'message', 'recovery']),
  TIMEOUT: Object.freeze(['type', 'issueId', 'code', 'message', 'recovery']),
  INTERRUPT: Object.freeze(['type']),
  RESUME: Object.freeze(['type']),
  START_AI_CALL: Object.freeze([
    'type', 'budget', 'task', 'sourceAuthority', 'tools', 'inputProjection', 'stoppingEvent',
    'receiver', 'publicationAuthority', 'checkpointId',
  ]),
  AI_RESULT: Object.freeze(['type', 'used', 'complete', 'claim', 'evidence', 'evidenceStanding']),
  AI_FAIL: Object.freeze(['type', 'issueId', 'message', 'recovery']),
  AI_TIMEOUT: Object.freeze(['type', 'issueId', 'message', 'recovery']),
  AI_CANCEL: Object.freeze(['type']),
  AI_RETRY: Object.freeze(['type']),
  ACCEPT_AI_DECISION: Object.freeze(['type', 'receiver']),
  PUBLISH_AI_DECISION: Object.freeze(['type', 'authority']),
  SET_DISCLOSURE: Object.freeze(['type', 'value']),
  APPLY_LATE_RESULT: Object.freeze(['type', 'sourceId', 'baseRevision']),
  RECORD_SUPERSESSION: Object.freeze(['type', 'summary']),
});

// JSON Schema maxLength counts Unicode code points. Use the same unit at the
// runtime boundary so every public string receives the published limit.
const codePointLength = value => Array.from(value).length;

export class LabStateError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'LabStateError';
    this.code = code;
    this.stage = options.stage ?? 'transition';
    this.acceptedRevision = options.acceptedRevision ?? null;
  }
}
function ownRecord(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new LabStateError('INVALID_RECORD', `${label} must be an object.`, { stage: 'admission' });
  }
}

function rejectUnknownFields(value, fields, label) {
  const unknown = Reflect.ownKeys(value).filter(field => !fields.includes(field));
  if (unknown.length > 0) {
    throw new LabStateError('INVALID_RECORD_SHAPE', `${label} contains unsupported fields: ${unknown.join(', ')}.`, { stage: 'admission' });
  }
}

function boundedText(value, label) {
  if (typeof value !== 'string' || codePointLength(value) < 1 || codePointLength(value) > MAX_TEXT || !SAFE_TEXT.test(value)) {
    throw new LabStateError('INVALID_TEXT', `${label} must be bounded plain text.`, { stage: 'admission' });
  }
  if (SECRET_SHAPED_TEXT.some(pattern => pattern.test(value))) {
    throw new LabStateError('SECRET_SHAPED_TEXT', `${label} must use a public-safe reference in this lab.`, { stage: 'admission' });
  }
  return value;
}

function boundedOutboxEventId(value) {
  if (typeof value !== 'string' || codePointLength(value) < 1 || codePointLength(value) > MAX_OUTBOX_EVENT_ID
      || !SAFE_TEXT.test(value)) {
    throw new LabStateError('INVALID_TEXT', 'Outbox event id must be bounded plain text.', { stage: 'admission' });
  }
  if (SECRET_SHAPED_TEXT.some(pattern => pattern.test(value))) {
    throw new LabStateError('SECRET_SHAPED_TEXT', 'Outbox event id must use a public-safe reference in this lab.', { stage: 'admission' });
  }
  return value;
}

function boundedCacheKey(value) {
  if (typeof value !== 'string' || codePointLength(value) < 1 || codePointLength(value) > MAX_CACHE_KEY
      || !/^[\p{L}\p{N} .,:;_@/+\-()]+$/u.test(value)) {
    throw new LabStateError('INVALID_CACHE_KEY', 'Authorization cache key must be a bounded canonical identity.', { stage: 'admission' });
  }
  return value;
}

function safeInteger(value, label, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new LabStateError('INVALID_INTEGER', `${label} must be an integer from ${minimum} through ${maximum}.`, { stage: 'admission' });
  }
  return value;
}

function copyAccepted(value) {
  ownRecord(value, 'Accepted record');
  const record = {
    id: boundedText(value.id, 'Accepted record id'),
    revision: safeInteger(value.revision, 'Accepted revision', 1),
    status: boundedText(value.status, 'Accepted status'),
    owner: boundedText(value.owner, 'Accepted owner'),
    nextAction: boundedText(value.nextAction, 'Accepted next action'),
    sourceId: boundedText(value.sourceId, 'Accepted source id'),
  };
  return Object.freeze(record);
}

function copyDimensions(value = {}) {
  const defaults = {
    request: 'idle', authorization: 'unknown', transaction: 'unstarted', receipt: 'absent',
    cache: 'absent', aiCall: 'unstarted', disclosure: 'compact', decision: 'open',
  };
  ownRecord(value, 'Dimensions');
  const unknown = Reflect.ownKeys(value).filter(name => !DIMENSION_FIELDS.includes(name));
  if (unknown.length > 0) {
    throw new LabStateError('INVALID_DIMENSION_SHAPE', `Dimensions contain unsupported fields: ${unknown.join(', ')}.`, { stage: 'admission' });
  }
  const dimensions = Object.fromEntries(DIMENSION_FIELDS.map(name => [name, value[name] ?? defaults[name]]));
  for (const [name, accepted] of Object.entries(DIMENSION_VALUES)) {
    if (!accepted.includes(dimensions[name])) {
      throw new LabStateError('INVALID_DIMENSION', `${name} has an unsupported state.`, { stage: 'admission' });
    }
  }
  return Object.freeze(dimensions);
}

function copyCommand(value) {
  ownRecord(value, 'Command');
  if (Reflect.ownKeys(value).length !== COMMAND_FIELDS.length
      || COMMAND_FIELDS.some(field => !Object.hasOwn(value, field))) {
    throw new LabStateError('INVALID_COMMAND_SHAPE', `Command requires exactly ${COMMAND_FIELDS.join(', ')}.`, { stage: 'admission' });
  }
  const command = Object.fromEntries(COMMAND_FIELDS.map(field => [field, value[field]]));
  for (const field of COMMAND_FIELDS.filter(field => field !== 'baseRevision')) {
    boundedText(command[field], `Command ${field}`);
  }
  safeInteger(command.baseRevision, 'Command base revision', 1);
  return Object.freeze(command);
}

/** Admit and detach one exact command before a controller acquires ownership. */
export function admitServiceBoundaryCommand(value) {
  return copyCommand(value);
}

function commandMeaningsMatch(left, right) {
  return left !== null && left !== undefined && right !== null && right !== undefined
    && COMMAND_FIELDS.every(field => left[field] === right[field]);
}

function authorizationGrantFor(command) {
  const admitted = copyCommand(command);
  return Object.freeze({
    commandId: admitted.id,
    idempotencyKey: admitted.idempotencyKey,
    requestFingerprint: commandFingerprint(admitted),
    cacheKey: cacheKeyFor(admitted),
    sourceId: admitted.sourceId,
    baseRevision: admitted.baseRevision,
    requestMeaning: admitted,
  });
}

function copyAuthorizationGrant(value) {
  if (value === null || value === undefined) return null;
  ownRecord(value, 'Authorization grant');
  rejectUnknownFields(value, [
    'commandId', 'idempotencyKey', 'requestFingerprint', 'cacheKey', 'sourceId', 'baseRevision',
    'requestMeaning',
  ], 'Authorization grant');
  const requestMeaning = copyCommand(value.requestMeaning);
  const grant = Object.freeze({
    commandId: boundedText(value.commandId, 'Authorization command id'),
    idempotencyKey: boundedText(value.idempotencyKey, 'Authorization idempotency key'),
    requestFingerprint: boundedText(value.requestFingerprint, 'Authorization request fingerprint'),
    cacheKey: boundedCacheKey(value.cacheKey),
    sourceId: boundedText(value.sourceId, 'Authorization source id'),
    baseRevision: safeInteger(value.baseRevision, 'Authorization base revision', 1),
    requestMeaning,
  });
  const expected = authorizationGrantFor(requestMeaning);
  const derivedFields = Object.keys(expected).filter(field => field !== 'requestMeaning');
  if (derivedFields.some(field => grant[field] !== expected[field])) {
    throw new LabStateError(
      'AUTHORIZATION_GRANT_MEANING_MISMATCH',
      'Authorization grant fields must derive from its admitted request meaning.',
      { stage: 'admission' },
    );
  }
  return grant;
}

function copyCheckpoint(value) {
  if (value === null) return null;
  ownRecord(value, 'Checkpoint');
  rejectUnknownFields(value, ['id', 'acceptedRevision', 'command', 'createdAtStep'], 'Checkpoint');
  return Object.freeze({
    id: boundedText(value.id, 'Checkpoint id'),
    acceptedRevision: safeInteger(value.acceptedRevision, 'Checkpoint accepted revision', 1),
    command: copyCommand(value.command),
    createdAtStep: safeInteger(value.createdAtStep, 'Checkpoint step', 1),
  });
}

function copyAi(value = {}) {
  ownRecord(value, 'AI call');
  rejectUnknownFields(value, [
    'task', 'sourceAuthority', 'budget', 'used', 'tools', 'inputProjection', 'stoppingEvent',
    'receiver', 'publicationAuthority', 'checkpointId', 'claim', 'evidence', 'evidenceStanding',
    'publicationStanding', 'authorizationMeaning',
  ], 'AI call');
  const tools = value.tools ?? [];
  const budget = value.budget ?? 0;
  if (!Array.isArray(tools) || tools.length > 6 || (budget > 0 && tools.length < 1)) {
    throw new LabStateError('INVALID_AI_TOOLS', 'An active AI call requires one through six distinct tools.', { stage: 'admission' });
  }
  if (new Set(tools).size !== tools.length) {
    throw new LabStateError('INVALID_AI_TOOLS', 'AI tools must use distinct entries.', { stage: 'admission' });
  }
  const ai = {
    task: value.task === null || value.task === undefined ? null : boundedText(value.task, 'AI task'),
    sourceAuthority: value.sourceAuthority === null || value.sourceAuthority === undefined
      ? null : boundedText(value.sourceAuthority, 'AI source authority'),
    budget: safeInteger(budget, 'AI budget', 0, 12),
    used: safeInteger(value.used ?? 0, 'AI used budget', 0, 12),
    tools: Object.freeze(tools.map((tool, index) => boundedText(tool, `AI tool ${index + 1}`))),
    inputProjection: value.inputProjection === null || value.inputProjection === undefined
      ? null : boundedText(value.inputProjection, 'AI input projection'),
    stoppingEvent: value.stoppingEvent === null || value.stoppingEvent === undefined
      ? null : boundedText(value.stoppingEvent, 'AI stopping event'),
    receiver: value.receiver === null || value.receiver === undefined
      ? null : boundedText(value.receiver, 'AI receiver'),
    publicationAuthority: value.publicationAuthority === null || value.publicationAuthority === undefined
      ? null : boundedText(value.publicationAuthority, 'AI publication authority'),
    checkpointId: value.checkpointId === null || value.checkpointId === undefined
      ? null : boundedText(value.checkpointId, 'AI checkpoint id'),
    claim: value.claim === null || value.claim === undefined ? null : boundedText(value.claim, 'AI claim'),
    evidence: value.evidence === null || value.evidence === undefined ? null : boundedText(value.evidence, 'AI evidence'),
    evidenceStanding: value.evidenceStanding ?? 'undetermined',
    publicationStanding: value.publicationStanding ?? 'human_held',
    authorizationMeaning: value.authorizationMeaning === null || value.authorizationMeaning === undefined
      ? null : copyCommand(value.authorizationMeaning),
  };
  if (ai.used > ai.budget) {
    throw new LabStateError('BUDGET_EXCEEDED', 'Used budget must stay within the declared budget.', { stage: 'admission' });
  }
  if (!EVIDENCE_STANDINGS.includes(ai.evidenceStanding)) {
    throw new LabStateError('INVALID_EVIDENCE_STANDING', 'AI evidence standing must be observed, inferred, or undetermined.', { stage: 'admission' });
  }
  if (!PUBLICATION_STANDINGS.includes(ai.publicationStanding)) {
    throw new LabStateError('INVALID_PUBLICATION_STANDING', 'AI publication standing must be human held or approved.', { stage: 'admission' });
  }
  return Object.freeze(ai);
}

function copyConnection(value = {}) {
  ownRecord(value, 'Connection');
  rejectUnknownFields(value, ['owner', 'released'], 'Connection');
  const owner = value.owner === null || value.owner === undefined ? null : boundedText(value.owner, 'Connection owner');
  return Object.freeze({ owner, released: Boolean(value.released ?? true) });
}

function copyOutbox(value = {}) {
  ownRecord(value, 'Outbox');
  rejectUnknownFields(value, ['status', 'eventId'], 'Outbox');
  const status = value.status ?? 'absent';
  if (!OUTBOX_STATES.includes(status)) {
    throw new LabStateError('INVALID_OUTBOX', 'Outbox status must be absent, pending, published, or failed.', { stage: 'admission' });
  }
  const eventId = value.eventId === null || value.eventId === undefined
    ? null : boundedOutboxEventId(value.eventId);
  if (eventId !== null && !eventId.startsWith(OUTBOX_EVENT_PREFIX)) {
    throw new LabStateError('OUTBOX_IDENTITY', 'An outbox event id must use the declared event prefix.', { stage: 'admission' });
  }
  return Object.freeze({
    status,
    eventId,
  });
}

function copyReceipt(value) {
  ownRecord(value, 'Receipt');
  rejectUnknownFields(value, ['id', 'commandId', 'idempotencyKey', 'acceptedRevision', 'requestFingerprint', 'requestMeaning', 'outcome'], 'Receipt');
  const requestMeaning = copyCommand(value.requestMeaning);
  const receipt = {
    id: boundedText(value.id, 'Receipt id'),
    commandId: boundedText(value.commandId, 'Receipt command id'),
    idempotencyKey: boundedText(value.idempotencyKey, 'Receipt idempotency key'),
    acceptedRevision: safeInteger(value.acceptedRevision, 'Receipt accepted revision', 1),
    requestFingerprint: boundedText(value.requestFingerprint, 'Receipt request fingerprint'),
    requestMeaning,
    outcome: RECEIPT_OUTCOMES.includes(value.outcome)
      ? value.outcome
      : (() => { throw new LabStateError('INVALID_RECEIPT_OUTCOME', 'Receipt outcome must be committed, rolled back, or held.', { stage: 'admission' }); })(),
  };
  if (receipt.commandId !== requestMeaning.id
      || receipt.idempotencyKey !== requestMeaning.idempotencyKey
      || receipt.requestFingerprint !== commandFingerprint(requestMeaning)) {
    throw new LabStateError('RECEIPT_MEANING_MISMATCH', 'The receipt identity and fingerprint must match its admitted request meaning.', { stage: 'admission' });
  }
  return Object.freeze(receipt);
}

function copyReceipts(value = {}) {
  ownRecord(value, 'Receipts');
  const entries = Object.entries(value);
  if (entries.length > MAX_RECEIPTS) {
    throw new LabStateError('RECEIPT_LIMIT', `Receipts may contain at most ${MAX_RECEIPTS} entries.`, { stage: 'admission' });
  }
  return Object.freeze(Object.fromEntries(entries.map(([key, value]) => {
    const admittedKey = boundedText(key, 'Receipt key');
    const receipt = copyReceipt(value);
    if (admittedKey !== receipt.idempotencyKey) {
      throw new LabStateError('RECEIPT_KEY_MISMATCH', 'Each receipt map key must equal its idempotency key.', { stage: 'admission' });
    }
    return [admittedKey, receipt];
  })));
}

function copyIssue(value) {
  if (value === null) return null;
  ownRecord(value, 'Issue');
  rejectUnknownFields(value, ['id', 'code', 'message', 'recovery', 'authorizationMeaning'], 'Issue');
  return Object.freeze({
    id: boundedText(value.id, 'Issue id'),
    code: boundedText(value.code, 'Issue code'),
    message: boundedText(value.message, 'Issue message'),
    recovery: boundedText(value.recovery, 'Issue recovery'),
    authorizationMeaning: value.authorizationMeaning === null || value.authorizationMeaning === undefined
      ? null : copyCommand(value.authorizationMeaning),
  });
}

function copyIssues(value = {}) {
  ownRecord(value, 'Issue channels');
  rejectUnknownFields(value, ISSUE_CHANNELS, 'Issue channels');
  return Object.freeze(Object.fromEntries(
    ISSUE_CHANNELS.map(channel => [channel, copyIssue(value[channel] ?? null)]),
  ));
}

function eventRecord(step, type, summary) {
  if (typeof summary !== 'string' || codePointLength(summary) < 1 || codePointLength(summary) > MAX_EVENT_SUMMARY || !SAFE_TEXT.test(summary)) {
    throw new LabStateError('INVALID_TEXT', 'Event summary must be bounded plain text.', { stage: 'admission' });
  }
  return Object.freeze({
    step: safeInteger(step, 'Event step', 1),
    type: boundedText(type, 'Event type'),
    summary,
  });
}

function copyEvents(events = []) {
  if (!Array.isArray(events) || events.length > MAX_EVENTS) {
    throw new LabStateError('EVENT_LIMIT', `Events must contain at most ${MAX_EVENTS} records.`, { stage: 'admission' });
  }
  const copied = events.map(event => {
    ownRecord(event, 'Event record');
    rejectUnknownFields(event, ['step', 'type', 'summary'], 'Event record');
    return eventRecord(event.step, event.type, event.summary);
  });
  for (let index = 1; index < copied.length; index += 1) {
    if (copied[index].step <= copied[index - 1].step) {
      throw new LabStateError('EVENT_SEQUENCE', 'Event steps must increase monotonically.', { stage: 'admission' });
    }
  }
  return Object.freeze(copied);
}

function projectRecord(accepted, authorization) {
  const shared = { id: accepted.id, revision: accepted.revision, status: accepted.status };
  if (authorization === 'allowed') {
    return Object.freeze({ ...shared, owner: accepted.owner, nextAction: accepted.nextAction });
  }
  return Object.freeze({ ...shared, nextAction: 'Request an authorized projection' });
}

function buildState(input) {
  const accepted = copyAccepted(input.accepted);
  const dimensions = copyDimensions(input.dimensions);
  const candidate = input.candidate === null ? null : copyCommand(input.candidate);
  const authorizationGrant = copyAuthorizationGrant(input.authorizationGrant);
  const receipts = copyReceipts(input.receipts ?? {});
  const issues = copyIssues(input.issues ?? {});
  const issue = ISSUE_CHANNELS.map(channel => issues[channel]).find(value => value !== null) ?? null;
  const detailedProjection = dimensions.authorization === 'allowed' && authorizationGrant !== null
    && authorizationGrant.sourceId === accepted.sourceId
    && (authorizationGrant.baseRevision === accepted.revision
      || Object.values(receipts).some(receipt => commandMeaningsMatch(
        receipt.requestMeaning,
        authorizationGrant.requestMeaning,
      ) && receipt.acceptedRevision === accepted.revision && receipt.outcome === 'committed'));
  const state = {
    modelVersion: MODEL_VERSION,
    accepted,
    visibleProjection: projectRecord(accepted, detailedProjection ? 'allowed' : 'held'),
    dimensions,
    authorizationGrant,
    candidate,
    checkpoint: copyCheckpoint(input.checkpoint ?? null),
    receipts,
    connection: copyConnection(input.connection),
    outbox: copyOutbox(input.outbox),
    ai: copyAi(input.ai),
    issues,
    issue,
    events: copyEvents(input.events),
    eventSequence: safeInteger(input.eventSequence ?? 0, 'Event sequence', 0),
  };
  if (state.events.length > 0 && state.events.at(-1).step > state.eventSequence) {
    throw new LabStateError('EVENT_SEQUENCE', 'Event sequence must include the latest retained event.', { stage: 'admission' });
  }
  if ((state.dimensions.authorization === 'allowed') !== (state.authorizationGrant !== null)) {
    throw new LabStateError(
      'AUTHORIZATION_GRANT_STATE',
      'Allowed authorization requires one request-bound grant; every other authorization state clears it.',
      { stage: 'admission' },
    );
  }
  const active = state.dimensions.transaction === 'active';
  if (active && (state.candidate === null || state.connection.released || state.connection.owner !== state.candidate.id)) {
    throw new LabStateError('ACTIVE_OWNERSHIP', 'An active transaction requires its candidate and an owned connection.', { stage: 'admission' });
  }
  if (!active && (!state.connection.released || state.connection.owner !== null)) {
    throw new LabStateError('RELEASED_OWNERSHIP', 'A transaction outside active state requires a released connection.', { stage: 'admission' });
  }
  if ((state.outbox.status === 'absent') !== (state.outbox.eventId === null)) {
    throw new LabStateError('OUTBOX_IDENTITY', 'An outbox identity is present exactly when the outbox has work.', { stage: 'admission' });
  }
  if (state.outbox.eventId !== null) {
    const receiptId = state.outbox.eventId.slice(OUTBOX_EVENT_PREFIX.length);
    const ownsEvent = Object.values(state.receipts).some(receipt => receipt.id === receiptId && receipt.outcome === 'committed');
    if (!ownsEvent) {
      throw new LabStateError('OUTBOX_RECEIPT_REQUIRED', 'Every outbox event must belong to a committed receipt.', { stage: 'admission' });
    }
  }
  return Object.freeze(state);
}

export function createInitialState(acceptedRecord) {
  return buildState({
    accepted: acceptedRecord,
    dimensions: {},
    authorizationGrant: null,
    candidate: null,
    checkpoint: null,
    receipts: {},
    connection: { owner: null, released: true },
    outbox: { status: 'absent', eventId: null },
    ai: {},
    issues: {},
    events: [],
    eventSequence: 0,
  });
}

/**
 * Admit a same-root controller successor without discarding durable work.
 *
 * This lab fixture describes one stable service identity and authorization
 * meaning. A successor may retain its accepted revision, receipts, outbox,
 * checkpoints, issues, generated work, and event ledger only while that
 * meaning remains exact. Active transaction and AI run ownership reach their
 * typed cancellation transitions before the new controller acquires the root.
 */
export function createServiceBoundarySuccessorState(acceptedRecord, commandValue, incumbentState) {
  const baseline = createInitialState(acceptedRecord).accepted;
  const command = copyCommand(commandValue);
  let state = buildState(incumbentState);

  if (command.sourceId !== baseline.sourceId || command.baseRevision !== baseline.revision) {
    throw new LabStateError(
      'SUCCESSOR_COMMAND_CONTEXT',
      'A same-root successor command must target the admitted service source and baseline revision.',
      { stage: 'admission' },
    );
  }
  if (state.accepted.id !== baseline.id
      || state.accepted.sourceId !== baseline.sourceId
      || state.accepted.owner !== baseline.owner) {
    throw new LabStateError(
      'SUCCESSOR_SERVICE_IDENTITY',
      'A same-root successor must retain the admitted service identity, source, and owner.',
      { stage: 'admission' },
    );
  }

  if (state.accepted.revision === baseline.revision) {
    if (JSON.stringify(state.accepted) !== JSON.stringify(baseline)) {
      throw new LabStateError(
        'SUCCESSOR_BASELINE_CONTENT',
        'A same-root successor at the baseline revision must retain identical accepted content.',
        { stage: 'admission' },
      );
    }
  } else {
    const durableReceipt = Object.values(state.receipts).find(receipt => (
      receipt.outcome === 'committed'
      && receipt.acceptedRevision === state.accepted.revision
      && commandMeaningsMatch(receipt.requestMeaning, command)
    ));
    if (state.accepted.revision !== baseline.revision + 1
        || state.accepted.status !== command.proposedStatus
        || state.accepted.nextAction !== 'Review the durable service receipt'
        || durableReceipt === undefined) {
      throw new LabStateError(
        'SUCCESSOR_DURABLE_LINEAGE',
        'An advanced same-root successor requires the committed receipt that derives its accepted revision.',
        { stage: 'admission' },
      );
    }
  }

  const inheritedMeanings = [
    state.authorizationGrant?.requestMeaning,
    state.candidate,
    state.checkpoint?.command,
    state.ai.authorizationMeaning,
    ...Object.values(state.receipts).map(receipt => receipt.requestMeaning),
    ...Object.values(state.issues).map(activeIssue => activeIssue?.authorizationMeaning),
  ].filter(value => value !== null && value !== undefined);
  if (inheritedMeanings.some(meaning => !commandMeaningsMatch(meaning, command))) {
    throw new LabStateError(
      'SUCCESSOR_AUTHORIZATION_CONTEXT',
      'A same-root successor must retain the authorization meaning that owns its durable work.',
      { stage: 'admission' },
    );
  }

  if (state.dimensions.transaction === 'active') state = transition(state, { type: 'INTERRUPT' });
  if (state.dimensions.aiCall === 'bounded_running') state = transition(state, { type: 'AI_CANCEL' });
  return state;
}

export function cacheKeyFor(command) {
  const admitted = copyCommand(command);
  const identity = [
    admitted.actor,
    admitted.role,
    admitted.tenant,
    admitted.policyScope,
    admitted.policyRevision,
    admitted.representation,
    admitted.sourceId,
    String(admitted.baseRevision),
  ];
  return `cache:v1:${identity.map(value => `${value.length}:${value}`).join(';')}`;
}

export function commandFingerprint(command) {
  const admitted = copyCommand(command);
  const meaning = COMMAND_FIELDS.filter(field => field !== 'idempotencyKey').map(field => `${field}=${admitted[field]}`).join('\u001f');
  let hash = 0x811c9dc5;
  for (const character of meaning) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

function nextState(state, patch, type, summary) {
  const eventSequence = state.eventSequence + 1;
  const events = [...state.events, eventRecord(eventSequence, type, summary)].slice(-MAX_EVENTS);
  return buildState({ ...state, ...patch, events, eventSequence });
}

function assertAllowed(state, stage) {
  if (state.dimensions.authorization !== 'allowed') {
    throw new LabStateError('AUTHORIZATION_REQUIRED', 'An allowed projection is required for this transition.', {
      stage,
      acceptedRevision: state.accepted.revision,
    });
  }
}

function assertActive(state, stage) {
  if (state.dimensions.transaction !== 'active' || state.candidate === null) {
    throw new LabStateError('ACTIVE_TRANSACTION_REQUIRED', 'An active candidate transaction is required.', {
      stage,
      acceptedRevision: state.accepted.revision,
    });
  }
}

function issue(id, code, message, recovery, authorizationMeaning = null) {
  return { id, code, message, recovery, authorizationMeaning };
}

function issueProjection(value) {
  if (value === null) return null;
  return Object.freeze({
    id: value.id,
    code: value.code,
    message: value.message,
    recovery: value.recovery,
  });
}

function validateEventShape(event) {
  ownRecord(event, 'Event');
  const type = boundedText(event.type, 'Event type');
  const fields = EVENT_FIELDS[type];
  if (!fields) {
    throw new LabStateError('UNKNOWN_EVENT', `Unsupported event type ${type}.`, { stage: 'transition' });
  }
  const supplied = Reflect.ownKeys(event);
  if (supplied.length !== fields.length || fields.some(field => !Object.hasOwn(event, field))) {
    throw new LabStateError('INVALID_EVENT_SHAPE', `${type} requires exactly ${fields.join(', ')}.`, { stage: 'admission' });
  }
}

function assertReleased(state, stage) {
  if (state.dimensions.transaction === 'active') {
    throw new LabStateError('ACTIVE_OWNERSHIP_CONFLICT', 'Release the active candidate before starting another ownership cycle.', {
      stage,
      acceptedRevision: state.accepted.revision,
    });
  }
}

function assertBoundedCallReleased(state, stage) {
  if (state.dimensions.aiCall === 'bounded_running') {
    throw new LabStateError('AI_CALL_ACTIVE', 'Let the bounded call reach a stopping event before starting transactional work.', {
      stage,
      acceptedRevision: state.accepted.revision,
    });
  }
}

function assertAuthorizationMatches(state, command, stage) {
  const expected = copyCommand(command);
  const actual = state.authorizationGrant?.requestMeaning ?? null;
  // Eligibility compares the admitted request fields themselves. The display
  // fingerprint serves only as a compact receipt aid.
  if (!commandMeaningsMatch(expected, actual)) {
    throw new LabStateError(
      'AUTHORIZATION_CONTEXT_MISMATCH',
      'Authorize this exact command identity, policy scope, source revision, and representation before continuing.',
      { stage, acceptedRevision: state.accepted.revision },
    );
  }
}

function hasAnotherAuthorizationOwner(owners, requestedMeaning) {
  return owners
    .filter(owner => owner !== null && owner !== undefined)
    .some(owner => !commandMeaningsMatch(owner, requestedMeaning));
}

function assertTransactionalRecoveryOwnership(state, requestedMeaning) {
  const recoveryOwners = [
    state.checkpoint?.command,
    state.issues.request?.authorizationMeaning,
    state.issues.eligibility?.authorizationMeaning,
  ];
  if (hasAnotherAuthorizationOwner(recoveryOwners, requestedMeaning)) {
    throw new LabStateError(
      'TRANSACTION_RECOVERY_OWNERSHIP_CONFLICT',
      'Return to the authorization context that owns the retained transaction recovery, settle it, and then begin this command.',
      { stage: 'begin', acceptedRevision: state.accepted.revision },
    );
  }
}

function assertAiRecoveryOwnership(state, requestedMeaning) {
  const retainsGeneratedWork = state.ai.authorizationMeaning !== null
    && state.ai.publicationStanding === 'human_held'
    && ['failed', 'timed_out', 'cancelled', 'partial', 'complete', 'held_for_review']
      .includes(state.dimensions.aiCall);
  const recoveryOwners = [
    ...(retainsGeneratedWork ? [state.ai.authorizationMeaning] : []),
    state.issues.ai?.authorizationMeaning,
  ];
  if (hasAnotherAuthorizationOwner(recoveryOwners, requestedMeaning)) {
    throw new LabStateError(
      'AI_RECOVERY_OWNERSHIP_CONFLICT',
      'Return to the authorization context that owns the retained AI work, finish or publish it, and then start this call.',
      { stage: 'ai_call', acceptedRevision: state.accepted.revision },
    );
  }
}

function receiptForOutbox(state) {
  if (state.outbox.eventId === null) return null;
  const receiptId = state.outbox.eventId.slice(OUTBOX_EVENT_PREFIX.length);
  return Object.values(state.receipts)
    .find(receipt => receipt.id === receiptId && receipt.outcome === 'committed') ?? null;
}

function assertOutboxAuthorizationMatches(state) {
  assertAllowed(state, 'outbox');
  const receipt = receiptForOutbox(state);
  if (receipt === null) {
    throw new LabStateError('OUTBOX_RECEIPT_REQUIRED', 'The outbox event requires its committed receipt.', {
      stage: 'outbox', acceptedRevision: state.accepted.revision,
    });
  }
  assertAuthorizationMatches(state, receipt.requestMeaning, 'outbox');
}

function assertAiAuthorizationMatches(state, stage) {
  if (state.ai.authorizationMeaning === null) {
    throw new LabStateError('AI_AUTHORIZATION_REQUIRED', 'The bounded call requires its admitted authorization context.', {
      stage, acceptedRevision: state.accepted.revision,
    });
  }
  assertAuthorizationMatches(state, state.ai.authorizationMeaning, stage);
}

function failActive(state, event, requestState) {
  assertActive(state, event.type.toLowerCase());
  return nextState(state, {
    dimensions: { ...state.dimensions, request: requestState, transaction: 'rolled_back', receipt: 'rejected' },
    candidate: null,
    connection: { owner: null, released: true },
    issues: {
      ...state.issues,
      request: issue(event.issueId, event.code, event.message, event.recovery,
        state.authorizationGrant?.requestMeaning ?? state.candidate),
    },
  }, event.type, `${event.message} Accepted revision ${state.accepted.revision} remains available.`);
}

/**
 * Apply one explicit event. Every successful transition returns a new deeply
 * detached state; a rejected transition leaves the caller-owned state intact.
 */
export function transition(state, event) {
  const current = buildState(state);
  validateEventShape(event);

  switch (event.type) {
    case 'AUTHORIZE': {
      if (!['allowed', 'held', 'denied'].includes(event.outcome)) {
        throw new LabStateError('INVALID_AUTHORIZATION', 'Authorization outcome must be allowed, held, or denied.');
      }
      const command = copyCommand(event.command);
      const cache = event.outcome === 'allowed' ? 'current' : 'invalidated';
      const grantChanges = current.authorizationGrant !== null
        && !commandMeaningsMatch(current.authorizationGrant.requestMeaning, command);
      const releasesActiveCandidate = current.dimensions.transaction === 'active'
        && (event.outcome !== 'allowed' || !commandMeaningsMatch(current.candidate, command));
      const releasesBoundedCall = current.dimensions.aiCall === 'bounded_running'
        && (event.outcome !== 'allowed' || !commandMeaningsMatch(current.ai.authorizationMeaning, command));
      return nextState(current, {
        dimensions: {
          ...current.dimensions,
          authorization: event.outcome,
          cache,
          ...(releasesActiveCandidate ? { request: 'cancelled', transaction: 'rolled_back', receipt: 'rejected' } : {}),
          ...(releasesBoundedCall ? { aiCall: 'cancelled', decision: 'open' } : {}),
          ...(event.outcome !== 'allowed' || grantChanges ? { disclosure: 'compact' } : {}),
        },
        authorizationGrant: event.outcome === 'allowed' ? authorizationGrantFor(command) : null,
        candidate: releasesActiveCandidate ? null : current.candidate,
        connection: releasesActiveCandidate ? { owner: null, released: true } : current.connection,
      }, 'AUTHORIZE', releasesActiveCandidate || releasesBoundedCall
        ? `Authorization is ${event.outcome}; active work released its owned resources and retained eligible checkpoints.`
        : `Authorization is ${event.outcome}; projection and cache state now match that decision.`);
    }

    case 'BEGIN': {
      assertAllowed(current, 'begin');
      assertReleased(current, 'begin');
      assertBoundedCallReleased(current, 'begin');
      const command = copyCommand(event.command);
      assertAuthorizationMatches(current, command, 'begin');
      const replay = Object.hasOwn(current.receipts, command.idempotencyKey)
        ? current.receipts[command.idempotencyKey]
        : null;
      if (replay) {
        if (COMMAND_FIELDS.some(field => replay.requestMeaning[field] !== command[field])) {
          throw new LabStateError('IDEMPOTENCY_CONFLICT', 'The idempotency key already belongs to a different request meaning.', {
            stage: 'begin', acceptedRevision: current.accepted.revision,
          });
        }
        const replayDimensions = {
          committed: { request: 'succeeded', transaction: 'committed', receipt: 'accepted' },
          rolled_back: { request: 'failed', transaction: 'rolled_back', receipt: 'rejected' },
          held: { request: 'cancelled', transaction: 'rolled_back', receipt: 'rejected' },
        }[replay.outcome];
        return nextState(current, {
          dimensions: { ...current.dimensions, ...replayDimensions },
          candidate: null,
          connection: { owner: null, released: true },
        }, 'REPLAY', `Idempotency key ${command.idempotencyKey} returned receipt ${replay.id}.`);
      }
      if (['pending', 'failed'].includes(current.outbox.status)) {
        throw new LabStateError('OUTBOX_HANDOFF_REQUIRED', 'Settle the current outbox handoff before committing another durable effect.', {
          stage: 'begin', acceptedRevision: current.accepted.revision,
        });
      }
      if (command.sourceId !== current.accepted.sourceId || command.baseRevision !== current.accepted.revision) {
        throw new LabStateError('STALE_COMMAND', 'The command must target the current accepted source and revision.', {
          stage: 'begin', acceptedRevision: current.accepted.revision,
        });
      }
      // A single recovery slot supports same-owner supersession. Another exact
      // authorization context first returns to and settles the retained work.
      assertTransactionalRecoveryOwnership(current, command);
      return nextState(current, {
        dimensions: { ...current.dimensions, request: 'pending', transaction: 'active', receipt: 'provisional' },
        candidate: command,
        checkpoint: null,
        connection: { owner: command.id, released: false },
        issues: { ...current.issues, request: null, eligibility: null },
      }, 'BEGIN', `Command ${command.id} opened one candidate transaction with a role and policy scoped cache identity.`);
    }

    case 'CHECKPOINT': {
      assertActive(current, 'checkpoint');
      const checkpoint = {
        id: boundedText(event.id, 'Checkpoint id'),
        acceptedRevision: current.accepted.revision,
        command: current.candidate,
        createdAtStep: current.eventSequence + 1,
      };
      return nextState(current, { checkpoint }, 'CHECKPOINT', `Checkpoint ${checkpoint.id} preserves the eligible candidate.`);
    }

    case 'COMMIT': {
      assertAllowed(current, 'commit');
      assertActive(current, 'commit');
      const command = current.candidate;
      // Authorization is a commit-time eligibility boundary. A newer allowed
      // grant can arrive while this candidate still owns the transaction, so
      // revalidate the exact actor, policy, source, revision, and representation
      // before creating a durable effect.
      assertAuthorizationMatches(current, command, 'commit');
      if (command.baseRevision !== current.accepted.revision) {
        throw new LabStateError('REVISION_CHANGED', 'The accepted revision changed before commit.', {
          stage: 'commit', acceptedRevision: current.accepted.revision,
        });
      }
      const accepted = {
        ...current.accepted,
        revision: current.accepted.revision + 1,
        status: command.proposedStatus,
        nextAction: 'Review the durable service receipt',
      };
      const receipt = {
        id: boundedText(event.receiptId, 'Receipt id'),
        commandId: command.id,
        idempotencyKey: command.idempotencyKey,
        acceptedRevision: accepted.revision,
        requestFingerprint: commandFingerprint(command),
        requestMeaning: command,
        outcome: 'committed',
      };
      if (Object.values(current.receipts).some(existing => existing.id === receipt.id)) {
        throw new LabStateError('DUPLICATE_RECEIPT_ID', 'Use a unique receipt identity for this durable effect.', {
          stage: 'commit', acceptedRevision: current.accepted.revision,
        });
      }
      return nextState(current, {
        accepted,
        dimensions: { ...current.dimensions, request: 'succeeded', transaction: 'committed', receipt: 'accepted', cache: 'stale' },
        candidate: null,
        checkpoint: null,
        receipts: { ...current.receipts, [command.idempotencyKey]: receipt },
        connection: { owner: null, released: true },
        outbox: { status: 'pending', eventId: `${OUTBOX_EVENT_PREFIX}${receipt.id}` },
        issues: { ...current.issues, request: null, eligibility: null },
      }, 'COMMIT', `Receipt ${receipt.id} committed revision ${accepted.revision}; the connection returned to its owner.`);
    }

    case 'PUBLISH_OUTBOX': {
      if (current.outbox.status !== 'pending') {
        throw new LabStateError('OUTBOX_PENDING_REQUIRED', 'A pending outbox event is required.', {
          stage: 'outbox', acceptedRevision: current.accepted.revision,
        });
      }
      assertOutboxAuthorizationMatches(current);
      return nextState(current, { outbox: { ...current.outbox, status: 'published' } }, 'PUBLISH_OUTBOX',
        `Outbox event ${current.outbox.eventId} reached its downstream receiver.`);
    }

    case 'FAIL_OUTBOX': {
      if (current.outbox.status !== 'pending') {
        throw new LabStateError('OUTBOX_PENDING_REQUIRED', 'A pending outbox event is required.', {
          stage: 'outbox', acceptedRevision: current.accepted.revision,
        });
      }
      assertOutboxAuthorizationMatches(current);
      return nextState(current, {
        outbox: { ...current.outbox, status: 'failed' },
        issues: {
          ...current.issues,
          outbox: issue(event.issueId, event.code, event.message, event.recovery,
            receiptForOutbox(current)?.requestMeaning ?? null),
        },
      }, 'FAIL_OUTBOX', `${event.message} The committed receipt remains accepted.`);
    }

    case 'RETRY_OUTBOX': {
      if (current.outbox.status !== 'failed') {
        throw new LabStateError('OUTBOX_FAILURE_REQUIRED', 'A failed outbox delivery is required for retry.', {
          stage: 'outbox', acceptedRevision: current.accepted.revision,
        });
      }
      assertOutboxAuthorizationMatches(current);
      return nextState(current, {
        outbox: { ...current.outbox, status: 'pending' },
        issues: { ...current.issues, outbox: null },
      }, 'RETRY_OUTBOX', `Outbox event ${current.outbox.eventId} is ready for another bounded delivery attempt.`);
    }

    case 'FAIL':
      return failActive(current, event, 'failed');

    case 'TIMEOUT':
      return failActive(current, event, 'timed_out');

    case 'INTERRUPT': {
      assertActive(current, 'interrupt');
      const hasCheckpoint = current.checkpoint !== null;
      return nextState(current, {
        dimensions: { ...current.dimensions, request: 'cancelled', transaction: 'rolled_back', receipt: 'rejected' },
        candidate: null,
        connection: { owner: null, released: true },
        issues: {
          ...current.issues,
          request: hasCheckpoint
            ? issue('ISSUE-INTERRUPT-01', 'INTERRUPTED', 'The candidate paused at a durable checkpoint.',
              'Resume from the checkpoint while its source revision remains current.',
              current.checkpoint.command)
            : issue('ISSUE-INTERRUPT-02', 'INTERRUPTED_BEFORE_CHECKPOINT', 'The candidate released its resources before a checkpoint was created.',
              'Begin a new candidate from the current accepted revision.', current.candidate),
        },
      }, 'INTERRUPT', hasCheckpoint
        ? `The active candidate released its connection; checkpoint ${current.checkpoint.id} remains the recovery route.`
        : 'The active candidate released its connection before checkpoint creation; begin from accepted state.');
    }

    case 'RESUME': {
      assertAllowed(current, 'resume');
      assertReleased(current, 'resume');
      assertBoundedCallReleased(current, 'resume');
      if (current.checkpoint === null) {
        throw new LabStateError('CHECKPOINT_REQUIRED', 'A checkpoint is required for resume.', {
          stage: 'resume', acceptedRevision: current.accepted.revision,
        });
      }
      if (current.checkpoint.acceptedRevision !== current.accepted.revision) {
        throw new LabStateError('STALE_CHECKPOINT', 'The checkpoint targets an earlier accepted revision.', {
          stage: 'resume', acceptedRevision: current.accepted.revision,
        });
      }
      assertAuthorizationMatches(current, current.checkpoint.command, 'resume');
      return nextState(current, {
        dimensions: { ...current.dimensions, request: 'pending', transaction: 'active', receipt: 'provisional' },
        candidate: current.checkpoint.command,
        connection: { owner: current.checkpoint.command.id, released: false },
        issues: { ...current.issues, request: null },
      }, 'RESUME', `Checkpoint ${current.checkpoint.id} reopened its candidate transaction.`);
    }

    case 'START_AI_CALL': {
      assertAllowed(current, 'ai_call');
      assertReleased(current, 'ai_call');
      if (current.dimensions.aiCall === 'bounded_running') {
        throw new LabStateError('AI_CALL_ACTIVE', 'The active bounded call must reach a stopping event before another begins.', {
          stage: 'ai_call', acceptedRevision: current.accepted.revision,
        });
      }
      const budget = safeInteger(event.budget, 'AI call budget', 1, 12);
      assertAiRecoveryOwnership(current, current.authorizationGrant.requestMeaning);
      return nextState(current, {
        dimensions: { ...current.dimensions, aiCall: 'bounded_running', decision: 'open' },
        ai: {
          task: boundedText(event.task, 'AI call task'),
          sourceAuthority: boundedText(event.sourceAuthority, 'AI source authority'),
          budget,
          used: 0,
          tools: event.tools,
          inputProjection: boundedText(event.inputProjection, 'AI input projection'),
          stoppingEvent: boundedText(event.stoppingEvent, 'AI stopping event'),
          receiver: boundedText(event.receiver, 'AI receiver'),
          publicationAuthority: boundedText(event.publicationAuthority, 'AI publication authority'),
          checkpointId: boundedText(event.checkpointId, 'AI checkpoint id'),
          claim: null,
          evidence: null,
          evidenceStanding: 'undetermined',
          publicationStanding: 'human_held',
          authorizationMeaning: current.authorizationGrant.requestMeaning,
        },
        issues: { ...current.issues, ai: null },
      }, 'START_AI_CALL', `The bounded caller began with a ${budget}-step budget and a named stopping event.`);
    }

    case 'AI_RESULT': {
      if (current.dimensions.aiCall !== 'bounded_running') {
        throw new LabStateError('AI_CALL_REQUIRED', 'A bounded-running call is required for a result.', {
          stage: 'ai_call', acceptedRevision: current.accepted.revision,
        });
      }
      if (typeof event.complete !== 'boolean') {
        throw new LabStateError('INVALID_AI_COMPLETION', 'AI result completion must be a boolean.', {
          stage: 'ai_call', acceptedRevision: current.accepted.revision,
        });
      }
      const used = safeInteger(event.used, 'AI result used budget', 1, current.ai.budget);
      const stateName = event.complete ? 'held_for_review' : 'partial';
      return nextState(current, {
        dimensions: { ...current.dimensions, aiCall: stateName, decision: 'human_held' },
        ai: {
          ...current.ai,
          used,
          claim: boundedText(event.claim, 'AI result claim'),
          evidence: boundedText(event.evidence, 'AI result evidence'),
          evidenceStanding: event.evidenceStanding,
        },
        issues: {
          ...current.issues,
          ai: event.complete ? null : issue('ISSUE-AI-01', 'PARTIAL_RESULT', 'The bounded caller returned a labeled partial result.',
            'Continue from the accepted checkpoint or send the available result for human review.',
            current.ai.authorizationMeaning),
        },
      }, 'AI_RESULT', `${event.complete ? 'Complete' : 'Partial'} generated output now waits for human review with its evidence label.`);
    }

    case 'AI_FAIL':
    case 'AI_TIMEOUT': {
      if (current.dimensions.aiCall !== 'bounded_running') {
        throw new LabStateError('AI_CALL_REQUIRED', 'A bounded-running call is required for this stopping event.', {
          stage: 'ai_call', acceptedRevision: current.accepted.revision,
        });
      }
      const timedOut = event.type === 'AI_TIMEOUT';
      return nextState(current, {
        dimensions: { ...current.dimensions, aiCall: timedOut ? 'timed_out' : 'failed', decision: 'open' },
        issues: {
          ...current.issues,
          ai: issue(event.issueId, timedOut ? 'AI_TIMEOUT' : 'AI_FAILURE', event.message, event.recovery,
            current.ai.authorizationMeaning),
        },
      }, event.type, `${event.message} Checkpoint ${current.ai.checkpointId} remains available.`);
    }

    case 'AI_CANCEL': {
      if (current.dimensions.aiCall !== 'bounded_running') {
        throw new LabStateError('AI_CALL_REQUIRED', 'A bounded-running call is required for cancellation.', {
          stage: 'ai_call', acceptedRevision: current.accepted.revision,
        });
      }
      return nextState(current, {
        dimensions: { ...current.dimensions, aiCall: 'cancelled', decision: 'open' },
        issues: {
          ...current.issues,
          ai: issue('ISSUE-AI-CANCEL-01', 'AI_CALL_CANCELLED', 'A later scenario released the active bounded call.',
            'Resume from the named AI checkpoint when another bounded attempt is useful.',
            current.ai.authorizationMeaning),
        },
      }, 'AI_CANCEL', `The bounded call released its run ownership; checkpoint ${current.ai.checkpointId} remains available.`);
    }

    case 'AI_RETRY': {
      if (!['failed', 'timed_out', 'cancelled'].includes(current.dimensions.aiCall) || current.ai.checkpointId === null) {
        throw new LabStateError('AI_CHECKPOINT_REQUIRED', 'A failed, timed-out, or cancelled call with a checkpoint is required for retry.', {
          stage: 'ai_call', acceptedRevision: current.accepted.revision,
        });
      }
      assertAllowed(current, 'ai_call');
      assertReleased(current, 'ai_call');
      assertAiAuthorizationMatches(current, 'ai_call');
      return nextState(current, {
        dimensions: { ...current.dimensions, aiCall: 'bounded_running', decision: 'open' },
        ai: { ...current.ai, used: 0, claim: null, evidence: null, evidenceStanding: 'undetermined' },
        issues: { ...current.issues, ai: null },
      }, 'AI_RETRY', `Checkpoint ${current.ai.checkpointId} started another bounded attempt.`);
    }

    case 'ACCEPT_AI_DECISION': {
      if (!['held_for_review', 'partial'].includes(current.dimensions.aiCall)
          || current.dimensions.decision !== 'human_held') {
        throw new LabStateError('HUMAN_REVIEW_REQUIRED', 'A human-held generated result is required.', {
          stage: 'decision', acceptedRevision: current.accepted.revision,
        });
      }
      assertAllowed(current, 'decision');
      assertAiAuthorizationMatches(current, 'decision');
      if (event.receiver !== current.ai.receiver) {
        throw new LabStateError('RECEIVER_MISMATCH', 'The named receiver owns this decision.', {
          stage: 'decision', acceptedRevision: current.accepted.revision,
        });
      }
      return nextState(current, {
        dimensions: { ...current.dimensions, decision: 'accepted' },
      }, 'ACCEPT_AI_DECISION', 'The named human receiver accepted the generated claim with its evidence standing attached.');
    }

    case 'PUBLISH_AI_DECISION': {
      if (current.dimensions.decision !== 'accepted') {
        throw new LabStateError('ACCEPTED_DECISION_REQUIRED', 'An accepted human decision is required for publication.', {
          stage: 'publication', acceptedRevision: current.accepted.revision,
        });
      }
      assertAllowed(current, 'publication');
      assertAiAuthorizationMatches(current, 'publication');
      if (event.authority !== current.ai.publicationAuthority) {
        throw new LabStateError('PUBLICATION_AUTHORITY_MISMATCH', 'The named publication authority owns this release.', {
          stage: 'publication', acceptedRevision: current.accepted.revision,
        });
      }
      return nextState(current, {
        ai: { ...current.ai, publicationStanding: 'approved' },
      }, 'PUBLISH_AI_DECISION', 'The named publication authority approved the accepted claim for its declared receiver.');
    }

    case 'SET_DISCLOSURE': {
      if (!DIMENSION_VALUES.disclosure.includes(event.value)) {
        throw new LabStateError('INVALID_DISCLOSURE', 'Disclosure must be compact or expanded.');
      }
      return nextState(current, {
        dimensions: { ...current.dimensions, disclosure: event.value },
      }, 'SET_DISCLOSURE', `Disclosure is now ${event.value}; accepted meaning remains unchanged.`);
    }

    case 'APPLY_LATE_RESULT': {
      const eligible = event.sourceId === current.accepted.sourceId && event.baseRevision === current.accepted.revision;
      return nextState(current, {
        issues: {
          ...current.issues,
          eligibility: eligible ? null : issue('ISSUE-LATE-01', 'STALE_RESULT', 'A late result targets a superseded source revision.',
            'Keep the accepted revision and begin a new candidate from current state.',
            current.authorizationGrant?.requestMeaning ?? null),
        },
      }, 'APPLY_LATE_RESULT', eligible
        ? 'The late result remains eligible for a new candidate transition.'
        : `The late result stayed outside accepted revision ${current.accepted.revision}.`);
    }

    case 'RECORD_SUPERSESSION':
      return nextState(current, {}, 'RECORD_SUPERSESSION', boundedText(event.summary, 'Supersession summary'));

    default:
      throw new LabStateError('UNKNOWN_EVENT', `Unsupported event type ${event.type}.`, {
        stage: 'transition', acceptedRevision: current.accepted.revision,
      });
  }
}

/**
 * Produce a snapshot-bounded page. Records created after the snapshot enter
 * the next read cycle, preserving active-walk order during concurrent inserts.
 */
export function paginateStable(records, { cursor = null, limit = 2, snapshotRevision = null }) {
  if (!Array.isArray(records)) {
    throw new LabStateError('INVALID_COLLECTION', 'Pagination requires an array of records.', { stage: 'admission' });
  }
  safeInteger(limit, 'Page limit', 1, 50);
  let activeSnapshot = snapshotRevision;
  if (cursor !== null) {
    ownRecord(cursor, 'Cursor');
    if (Reflect.ownKeys(cursor).length !== 3
        || !['snapshotRevision', 'sortKey', 'id'].every(field => Object.hasOwn(cursor, field))) {
      throw new LabStateError('INVALID_CURSOR', 'Cursor requires exactly snapshotRevision, sortKey, and id.', { stage: 'admission' });
    }
    safeInteger(cursor.snapshotRevision, 'Cursor snapshot revision', 1);
    boundedText(cursor.sortKey, 'Cursor sort key');
    boundedText(cursor.id, 'Cursor id');
    if (activeSnapshot !== null && activeSnapshot !== cursor.snapshotRevision) {
      throw new LabStateError('CURSOR_SNAPSHOT_MISMATCH', 'Continue with the snapshot revision carried by the cursor.', { stage: 'admission' });
    }
    activeSnapshot = cursor.snapshotRevision;
  }
  safeInteger(activeSnapshot, 'Snapshot revision', 1);
  const admitted = records.map(record => {
    ownRecord(record, 'Page record');
    if (Reflect.ownKeys(record).length !== 4
        || !['id', 'sortKey', 'createdRevision', 'label'].every(field => Object.hasOwn(record, field))) {
      throw new LabStateError('INVALID_PAGE_RECORD', 'Page records require exactly id, sortKey, createdRevision, and label.', { stage: 'admission' });
    }
    return Object.freeze({
      id: boundedText(record.id, 'Page record id'),
      sortKey: boundedText(record.sortKey, 'Page sort key'),
      createdRevision: safeInteger(record.createdRevision, 'Page created revision', 1),
      label: boundedText(record.label, 'Page record label'),
    });
  });
  const comparePageIdentity = (left, right) => {
    if (left.sortKey !== right.sortKey) return left.sortKey < right.sortKey ? -1 : 1;
    if (left.id !== right.id) return left.id < right.id ? -1 : 1;
    return 0;
  };
  const seenIds = new Set();
  const seenIdentities = new Set();
  for (const record of admitted) {
    const identity = JSON.stringify([record.sortKey, record.id]);
    if (seenIds.has(record.id) || seenIdentities.has(identity)) {
      throw new LabStateError(
        'DUPLICATE_PAGE_IDENTITY',
        'Each admitted page record requires one globally unique id and cursor identity.',
        { stage: 'admission' },
      );
    }
    seenIds.add(record.id);
    seenIdentities.add(identity);
  }
  const ordered = admitted
    .filter(record => record.createdRevision <= activeSnapshot)
    .sort(comparePageIdentity);
  const afterCursor = cursor === null
    ? ordered
    : ordered.filter(record => comparePageIdentity(record, cursor) > 0);
  const items = afterCursor.slice(0, limit);
  const tail = items.at(-1);
  return Object.freeze({
    snapshotRevision: activeSnapshot,
    items: Object.freeze(items),
    nextCursor: afterCursor.length > limit && tail
      ? Object.freeze({ snapshotRevision: activeSnapshot, sortKey: tail.sortKey, id: tail.id })
      : null,
  });
}

/**
 * Return the state that the current authorization may expose to an inspector.
 * Internal candidate, receipt, outbox, and generated-content fields stay with
 * their owners while a projection is held or denied.
 */
export function inspectableState(state) {
  const current = buildState(state);
  const allowed = current.dimensions.authorization === 'allowed';
  const authorizationMeaning = allowed ? current.authorizationGrant.requestMeaning : null;
  const candidateOwned = allowed && commandMeaningsMatch(current.candidate, authorizationMeaning);
  const checkpointOwned = allowed && current.checkpoint !== null
    && commandMeaningsMatch(current.checkpoint.command, authorizationMeaning);
  const visibleReceipts = allowed
    ? Object.freeze(Object.fromEntries(Object.entries(current.receipts)
      .filter(([, receipt]) => commandMeaningsMatch(receipt.requestMeaning, authorizationMeaning))))
    : Object.freeze({});
  const outboxReceipt = receiptForOutbox(current);
  const outboxOwned = allowed && outboxReceipt !== null
    && commandMeaningsMatch(outboxReceipt.requestMeaning, authorizationMeaning);
  const aiOwned = allowed && commandMeaningsMatch(current.ai.authorizationMeaning, authorizationMeaning);
  const lastAuthorizationIndex = current.events.findLastIndex(event => event.type === 'AUTHORIZE');
  const visibleEvents = allowed
    ? Object.freeze(current.events.slice(Math.max(0, lastAuthorizationIndex)))
    : Object.freeze(current.events.map(event => Object.freeze({
      step: event.step,
      type: event.type,
      summary: 'A transition receipt remains available to its authorized owner.',
    })));
  const aiStanding = {
    budget: 0,
    used: 0,
    tools: Object.freeze([]),
    evidenceStanding: 'undetermined',
    publicationStanding: 'human_held',
  };
  const requestIssueOwned = allowed && current.issues.request !== null
    && commandMeaningsMatch(current.issues.request.authorizationMeaning, authorizationMeaning);
  const ownsTransactionalState = candidateOwned || checkpointOwned
    || Object.keys(visibleReceipts).length > 0 || requestIssueOwned;
  const visibleDimensions = Object.freeze({
    ...current.dimensions,
    ...(!ownsTransactionalState ? { request: 'idle', transaction: 'unstarted', receipt: 'absent' } : {}),
    ...(!aiOwned ? { aiCall: 'unstarted', disclosure: 'compact', decision: 'open' } : {}),
  });
  const projectionIssue = !allowed
    ? issueProjection(copyIssue(issue(
      'ISSUE-AUTH-01',
      'PROJECTION_HELD',
      'The current role receives a bounded projection.',
      'Request the required role or continue with the visible fields.',
    )))
    : null;
  const visibleIssues = Object.freeze({
    authorization: projectionIssue,
    ...Object.fromEntries(ISSUE_CHANNELS.map(channel => {
      const activeIssue = current.issues[channel];
      const owned = allowed && activeIssue !== null
        && commandMeaningsMatch(activeIssue.authorizationMeaning, authorizationMeaning);
      return [channel, owned ? issueProjection(activeIssue) : null];
    })),
  });
  const visibleIssue = ['authorization', ...ISSUE_CHANNELS]
    .map(channel => visibleIssues[channel])
    .find(value => value !== null) ?? null;
  return Object.freeze({
    modelVersion: current.modelVersion,
    visibleProjection: current.visibleProjection,
    dimensions: visibleDimensions,
    authorizationGrant: allowed ? current.authorizationGrant : null,
    candidate: candidateOwned ? current.candidate : null,
    checkpoint: checkpointOwned ? current.checkpoint : null,
    receipts: visibleReceipts,
    connection: Object.freeze({ released: current.connection.released }),
    outbox: Object.freeze({
      status: outboxOwned ? current.outbox.status : 'absent',
      eventId: outboxOwned ? current.outbox.eventId : null,
    }),
    ai: Object.freeze(aiOwned ? current.ai : aiStanding),
    issues: visibleIssues,
    issue: visibleIssue,
    events: visibleEvents,
    eventSequence: current.eventSequence,
  });
}

/** Adapt two declared wire versions into one bounded reader projection. */
export function readVersionedRecord(record) {
  ownRecord(record, 'Versioned record');
  if (record.schemaVersion === 1) {
    const fields = ['schemaVersion', 'id', 'label', 'status'];
    if (Reflect.ownKeys(record).length !== fields.length || fields.some(field => !Object.hasOwn(record, field))) {
      throw new LabStateError('INVALID_VERSIONED_RECORD', `Version 1 requires exactly ${fields.join(', ')}.`, { stage: 'admission' });
    }
    return Object.freeze({
      id: boundedText(record.id, 'Versioned record id'),
      title: boundedText(record.label, 'Versioned record label'),
      standing: boundedText(record.status, 'Versioned record status'),
      sourceVersion: 1,
    });
  }
  if (record.schemaVersion === 2) {
    const fields = ['schemaVersion', 'id', 'title', 'standing'];
    if (Reflect.ownKeys(record).length !== fields.length || fields.some(field => !Object.hasOwn(record, field))) {
      throw new LabStateError('INVALID_VERSIONED_RECORD', `Version 2 requires exactly ${fields.join(', ')}.`, { stage: 'admission' });
    }
    return Object.freeze({
      id: boundedText(record.id, 'Versioned record id'),
      title: boundedText(record.title, 'Versioned record title'),
      standing: boundedText(record.standing, 'Versioned record standing'),
      sourceVersion: 2,
    });
  }
  throw new LabStateError('UNSUPPORTED_RECORD_VERSION', 'The reader supports declared record versions 1 and 2.', { stage: 'admission' });
}

export function semanticRows(state) {
  const current = inspectableState(state);
  return Object.freeze([
    Object.freeze({ dimension: 'Request', state: current.dimensions.request, owner: 'Task transport', release: 'Typed completion, timeout, or cancellation' }),
    Object.freeze({ dimension: 'Authorization', state: current.dimensions.authorization, owner: 'Policy decision', release: 'Authorized projection or explicit hold' }),
    Object.freeze({ dimension: 'Transaction', state: current.dimensions.transaction, owner: 'Persistence adapter', release: 'Commit or rollback, then connection return' }),
    Object.freeze({ dimension: 'Receipt', state: current.dimensions.receipt, owner: 'Service boundary', release: 'Accepted or rejected durable receipt' }),
    Object.freeze({ dimension: 'Cache', state: current.dimensions.cache, owner: 'Projection adapter', release: 'Scoped refresh or invalidation' }),
    Object.freeze({ dimension: 'AI call', state: current.dimensions.aiCall, owner: 'Bounded caller', release: 'Budget stop, typed cancellation, and labeled result' }),
    Object.freeze({ dimension: 'Disclosure', state: current.dimensions.disclosure, owner: 'Visitor control', release: 'Compact or expanded view' }),
    Object.freeze({ dimension: 'Decision', state: current.dimensions.decision, owner: 'Named human receiver', release: 'Accepted or revised decision' }),
  ]);
}

export function serializeCheckpoint(state) {
  const current = buildState(state);
  if (current.checkpoint === null) return null;
  return JSON.stringify({
    schema: 'visual-fidelity.service-boundary-checkpoint.v1',
    modelVersion: MODEL_VERSION,
    checkpoint: current.checkpoint,
  }, null, 2);
}
