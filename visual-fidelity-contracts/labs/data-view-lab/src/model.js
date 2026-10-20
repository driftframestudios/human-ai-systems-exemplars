/** Accepted-state owner and deterministic view selection for the data-view lab. */

export const DECISION_NEEDS = Object.freeze(['single-status', 'exact-values', 'compare', 'change-over-time', 'relationships', 'spatial']);
export const VALUE_STANDINGS = Object.freeze(['known', 'unknown', 'absent', 'stale', 'estimated', 'redacted']);
export const DATA_STANDINGS = Object.freeze(['absent', 'partial', 'current', 'stale']);
export const RENDERERS = Object.freeze(['summary', 'table', 'chart', 'timeline', 'graph', 'svg', 'spatial']);

const FIXTURE_KEYS = Object.freeze([
  'schemaVersion', 'dataViewLabId', 'revision', 'lineage', 'decisionNeed', 'dataStanding',
  'scope', 'unit', 'denominator', 'records', 'relationships',
]);
const LINEAGE_KEYS = Object.freeze(['source', 'parentRevision']);
const RECORD_KEYS = Object.freeze(['id', 'label', 'order', 'value', 'standing', 'group', 'observedAt', 'position']);
const POSITION_KEYS = Object.freeze(['x', 'y']);
const RELATIONSHIP_KEYS = Object.freeze(['id', 'sourceId', 'targetId', 'label']);

// JSON Schema maxLength counts Unicode code points. Use the same unit at the
// runtime boundary so astral-script characters and emoji keep one contract.
const codePointLength = value => Array.from(value).length;

function plainRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be a record.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${label} must use a plain record.`);
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(plainRecord(value, label)).sort();
  const required = [...expected].sort();
  if (actual.length !== required.length || actual.some((key, index) => key !== required[index])) {
    throw new TypeError(`${label} must contain exactly: ${required.join(', ')}.`);
  }
}

function ownString(value, key, label, { nullable = false, maximum = null, pattern = null } = {}) {
  if (!Object.hasOwn(value, key)) throw new TypeError(`${label}.${key} must be owned by the record.`);
  if (nullable && value[key] === null) return null;
  if (typeof value[key] !== 'string' || value[key].trim() === '') throw new TypeError(`${label}.${key} must be a non-empty string.`);
  if (maximum !== null && codePointLength(value[key]) > maximum) throw new TypeError(`${label}.${key} must contain at most ${maximum} characters.`);
  if (pattern !== null && !pattern.test(value[key])) throw new TypeError(`${label}.${key} has an unsupported format.`);
  return value[key];
}

function enumValue(value, allowed, label) {
  if (!allowed.includes(value)) throw new TypeError(`${label} must be one of: ${allowed.join(', ')}.`);
  return value;
}

function freezeTree(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}

function copyLineage(lineage) {
  exactKeys(lineage, LINEAGE_KEYS, 'lineage');
  return {
    source: ownString(lineage, 'source', 'lineage', { maximum: 160 }),
    parentRevision: ownString(lineage, 'parentRevision', 'lineage', { nullable: true, maximum: 64, pattern: /^[a-z0-9][a-z0-9._-]*$/u }),
  };
}

function boundedCoordinate(value, key, label) {
  if (!Object.hasOwn(value, key) || !Number.isFinite(value[key]) || value[key] < 0 || value[key] > 100) {
    throw new TypeError(`${label}.${key} must be a finite number from 0 through 100.`);
  }
  return value[key];
}

function copyPosition(position, label) {
  exactKeys(position, POSITION_KEYS, label);
  return {
    x: boundedCoordinate(position, 'x', label),
    y: boundedCoordinate(position, 'y', label),
  };
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function copyRecords(records) {
  if (!Array.isArray(records) || records.length > 500) throw new TypeError('records must be an array with at most 500 entries.');
  const identifiers = new Set();
  const orders = new Set();
  return records.map((record, index) => {
    const label = `records[${index}]`;
    exactKeys(record, RECORD_KEYS, label);
    const id = ownString(record, 'id', label);
    if (!/^[a-z0-9][a-z0-9-]{1,47}$/u.test(id) || identifiers.has(id)) throw new TypeError(`${label}.id must be unique lowercase kebab case.`);
    identifiers.add(id);
    if (!Number.isInteger(record.order) || record.order < 0 || orders.has(record.order)) throw new TypeError(`${label}.order must be a unique non-negative integer.`);
    orders.add(record.order);
    const standing = enumValue(record.standing, VALUE_STANDINGS, `${label}.standing`);
    const requiresValue = ['known', 'stale', 'estimated'].includes(standing);
    if ((requiresValue && !Number.isFinite(record.value)) || (!requiresValue && record.value !== null)) {
      throw new TypeError(`${label}.value must agree with its standing.`);
    }
    const observedAt = ownString(record, 'observedAt', label, { nullable: true });
    if (observedAt !== null && !isCalendarDate(observedAt)) {
      throw new TypeError(`${label}.observedAt must be a real calendar date in YYYY-MM-DD form.`);
    }
    if (requiresValue && observedAt === null) {
      throw new TypeError(`${label}.observedAt must accompany an observed, stale, or estimated value.`);
    }
    if (!requiresValue && observedAt !== null) {
      throw new TypeError(`${label}.observedAt remains null when the standing represents a qualitative state.`);
    }
    return {
      id,
      label: ownString(record, 'label', label, { maximum: 120 }),
      order: record.order,
      value: record.value,
      standing,
      group: ownString(record, 'group', label, { maximum: 80 }),
      observedAt,
      position: copyPosition(record.position, `${label}.position`),
    };
  }).sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function copyRelationships(relationships, records) {
  if (!Array.isArray(relationships) || relationships.length > 1000) throw new TypeError('relationships must be an array with at most 1000 entries.');
  const recordIds = new Set(records.map(record => record.id));
  const relationshipIds = new Set();
  return relationships.map((relationship, index) => {
    const label = `relationships[${index}]`;
    exactKeys(relationship, RELATIONSHIP_KEYS, label);
    const id = ownString(relationship, 'id', label);
    if (!/^[a-z][a-z0-9-]{1,63}$/u.test(id) || relationshipIds.has(id)) throw new TypeError(`${label}.id must be unique lowercase kebab case.`);
    relationshipIds.add(id);
    const sourceId = ownString(relationship, 'sourceId', label);
    const targetId = ownString(relationship, 'targetId', label);
    if (!recordIds.has(sourceId) || !recordIds.has(targetId)) throw new TypeError(`${label} must connect two admitted record identifiers.`);
    if (sourceId === targetId) throw new TypeError(`${label} must connect two distinct records.`);
    return { id, sourceId, targetId, label: ownString(relationship, 'label', label, { maximum: 200 }) };
  });
}

/** Admit, project, order, and freeze the closed fixture contract. */
export function admitDataViewFixture(supplied) {
  exactKeys(supplied, FIXTURE_KEYS, 'data-view fixture');
  if (supplied.schemaVersion !== 1) throw new TypeError('data-view fixture.schemaVersion must equal 1.');
  const records = copyRecords(supplied.records);
  const fixture = {
    schemaVersion: 1,
    dataViewLabId: ownString(supplied, 'dataViewLabId', 'data-view fixture'),
    revision: ownString(supplied, 'revision', 'data-view fixture', { maximum: 64, pattern: /^[a-z0-9][a-z0-9._-]*$/u }),
    lineage: copyLineage(supplied.lineage),
    decisionNeed: enumValue(supplied.decisionNeed, DECISION_NEEDS, 'decisionNeed'),
    dataStanding: enumValue(supplied.dataStanding, DATA_STANDINGS, 'dataStanding'),
    scope: ownString(supplied, 'scope', 'data-view fixture', { maximum: 160 }),
    unit: ownString(supplied, 'unit', 'data-view fixture', { maximum: 64 }),
    denominator: ownString(supplied, 'denominator', 'data-view fixture', { maximum: 160 }),
    records,
    relationships: copyRelationships(supplied.relationships, records),
  };
  if (!/^[a-z][a-z0-9-]{1,63}$/u.test(fixture.dataViewLabId)) throw new TypeError('data-view fixture.dataViewLabId must use lowercase kebab case.');
  if (fixture.dataStanding === 'absent' && (fixture.records.length !== 0 || fixture.relationships.length !== 0)) {
    throw new TypeError('Absent data carries zero records and zero relationships.');
  }
  if (fixture.records.length === 0 && fixture.dataStanding !== 'absent') throw new TypeError('An empty accepted revision carries absent data standing.');
  if (fixture.dataStanding === 'current' && fixture.records.some((record) => record.standing === 'stale')) {
    throw new TypeError('A record marked stale requires partial or stale data standing.');
  }
  return freezeTree(fixture);
}

/** Choose an inspectable renderer from decision need and admitted scale. */
export function chooseRenderer(decisionNeed, recordCount) {
  enumValue(decisionNeed, DECISION_NEEDS, 'decisionNeed');
  if (!Number.isInteger(recordCount) || recordCount < 0 || recordCount > 500) throw new TypeError('recordCount must be an integer from 0 through 500.');
  if (decisionNeed === 'single-status') return 'summary';
  if (decisionNeed === 'exact-values') return 'table';
  if (decisionNeed === 'change-over-time') return recordCount <= 80 ? 'timeline' : 'table';
  if (decisionNeed === 'relationships') return recordCount <= 48 ? 'graph' : 'table';
  if (decisionNeed === 'spatial') return recordCount <= 120 ? 'spatial' : 'table';
  if (recordCount <= 12) return 'chart';
  if (recordCount <= 80) return 'svg';
  return 'table';
}

function createView(fixture, decisionNeed = fixture.decisionNeed) {
  return {
    decisionNeed,
    renderer: chooseRenderer(decisionNeed, fixture.records.length),
    page: 1,
    pageSize: 12,
  };
}

function recordsForView(fixture, view) {
  const start = (view.page - 1) * view.pageSize;
  return fixture.records.slice(start, start + view.pageSize);
}

// Selection belongs to the visible page so the summary, SVG, table, and
// machine twin always describe the same bounded record set.
function selectionForView(fixture, view, preferredRecordId = null) {
  const records = recordsForView(fixture, view);
  return records.some(record => record.id === preferredRecordId)
    ? preferredRecordId
    : records[0]?.id ?? null;
}

export function createDataViewState(suppliedFixture, ownerId = 'data-view-lab-controller') {
  if (typeof ownerId !== 'string' || ownerId.trim() === '') throw new TypeError('ownerId must be a non-empty string.');
  const fixture = admitDataViewFixture(suppliedFixture);
  return freezeTree({
    fixture,
    request: { standing: 'idle', requestId: null, ownerGeneration: null, message: 'Ready.' },
    data: { standing: fixture.dataStanding },
    authorization: { standing: 'unknown' },
    disclosure: { standing: 'compact' },
    ownership: { standing: 'active', ownerId, generation: 1 },
    selection: { recordId: fixture.records[0]?.id ?? null },
    view: createView(fixture),
  });
}

function accepted(state, patch) { return freezeTree({ ...state, ...patch }); }
function outcome(state, applied, reason) { return freezeTree({ state, applied, reason }); }
function eventId(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string.`);
  return value;
}

function ownerGeneration(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${label} must be a positive integer.`);
  return value;
}

function requestMatches(state, event) {
  return state.request.standing === 'pending'
    && state.request.requestId === event.requestId
    && state.request.ownerGeneration === event.ownerGeneration
    && state.ownership.generation === event.ownerGeneration;
}

export function pageRecords(state) {
  return recordsForView(state.fixture, state.view).map((record) => ({ ...record }));
}

export function reduceDataViewState(state, event) {
  plainRecord(state, 'data-view state');
  plainRecord(event, 'data-view event');
  const type = ownString(event, 'type', 'data-view event');

  if (state.ownership?.standing === 'released' && type !== 'owner.released') return outcome(state, false, 'owner-released');

  if (type === 'request.started') {
    const requestId = eventId(event.requestId, 'requestId');
    const generation = ownerGeneration(event.ownerGeneration, 'ownerGeneration');
    if (generation !== state.ownership.generation) return outcome(state, false, 'stale-owner');
    return outcome(accepted(state, { request: { standing: 'pending', requestId, ownerGeneration: generation, message: 'Loading a candidate data revision.' } }), true, 'request-started');
  }

  if (type === 'request.failed') {
    const requestId = eventId(event.requestId, 'requestId');
    ownerGeneration(event.ownerGeneration, 'ownerGeneration');
    if (!requestMatches(state, event)) return outcome(state, false, state.request.requestId === requestId ? 'stale-owner' : 'stale-request');
    const message = typeof event.message === 'string' && event.message.trim() ? event.message : 'Loading the candidate data revision failed. Retry when the source is ready.';
    return outcome(accepted(state, {
      request: { standing: 'failed', requestId, ownerGeneration: event.ownerGeneration, message },
    }), true, 'request-failure-recorded');
  }

  if (type === 'request.succeeded') {
    const requestId = eventId(event.requestId, 'requestId');
    ownerGeneration(event.ownerGeneration, 'ownerGeneration');
    if (!requestMatches(state, event)) return outcome(state, false, state.request.requestId === requestId ? 'stale-owner' : 'stale-request');
    let fixture;
    try { fixture = admitDataViewFixture(event.fixture); }
    catch (error) { return outcome(state, false, `candidate-rejected: ${error.message}`); }
    if (fixture.dataViewLabId !== state.fixture.dataViewLabId) {
      return outcome(state, false, 'candidate-rejected: dataViewLabId must retain the accepted identity.');
    }
    if (fixture.revision === state.fixture.revision) {
      if (JSON.stringify(fixture) !== JSON.stringify(state.fixture)) {
        return outcome(state, false, 'candidate-rejected: a current revision must retain identical content.');
      }
      return outcome(accepted(state, {
        request: { standing: 'succeeded', requestId, ownerGeneration: event.ownerGeneration, message: `Revision ${fixture.revision} is already current.` },
      }), true, 'candidate-already-current');
    }
    if (fixture.lineage.parentRevision !== state.fixture.revision) {
      return outcome(state, false, 'candidate-rejected: parentRevision must equal the accepted revision.');
    }
    const view = createView(fixture, state.view.decisionNeed);
    const recordId = selectionForView(fixture, view, state.selection.recordId);
    return outcome(accepted(state, {
      fixture,
      request: { standing: 'succeeded', requestId, ownerGeneration: event.ownerGeneration, message: `Accepted revision ${fixture.revision}.` },
      data: { standing: fixture.dataStanding },
      selection: { recordId },
      view,
    }), true, 'candidate-accepted');
  }

  if (type === 'view.changed') {
    const decisionNeed = enumValue(event.decisionNeed, DECISION_NEEDS, 'decisionNeed');
    const view = createView(state.fixture, decisionNeed);
    const recordId = selectionForView(state.fixture, view, state.selection.recordId);
    return outcome(accepted(state, { view, selection: { recordId } }), true, 'view-accepted');
  }

  if (type === 'page.changed') {
    const maxPage = Math.max(1, Math.ceil(state.fixture.records.length / state.view.pageSize));
    if (!Number.isInteger(event.page) || event.page < 1 || event.page > maxPage) return outcome(state, false, 'page-out-of-range');
    const view = { ...state.view, page: event.page };
    const recordId = selectionForView(state.fixture, view, state.selection.recordId);
    return outcome(accepted(state, { view, selection: { recordId } }), true, 'page-accepted');
  }

  if (type === 'selection.changed') {
    const recordId = eventId(event.recordId, 'recordId');
    if (!state.fixture.records.some((record) => record.id === recordId)) return outcome(state, false, 'unknown-record');
    if (!recordsForView(state.fixture, state.view).some((record) => record.id === recordId)) {
      return outcome(state, false, 'record-outside-page');
    }
    return outcome(accepted(state, { selection: { recordId } }), true, 'selection-accepted');
  }

  if (type === 'authorization.changed') {
    const standing = enumValue(event.standing, ['unknown', 'allowed', 'held', 'denied'], 'authorization standing');
    return outcome(accepted(state, { authorization: { standing } }), true, 'authorization-accepted');
  }

  if (type === 'disclosure.changed') {
    const standing = enumValue(event.standing, ['compact', 'expanded'], 'disclosure standing');
    return outcome(accepted(state, { disclosure: { standing } }), true, 'disclosure-accepted');
  }

  if (type === 'owner.replaced') {
    const ownerId = eventId(event.ownerId, 'ownerId');
    if (ownerId === state.ownership.ownerId) return outcome(state, false, 'owner-unchanged');
    return outcome(accepted(state, {
      ownership: { standing: 'active', ownerId, generation: state.ownership.generation + 1 },
      request: { standing: 'idle', requestId: null, ownerGeneration: null, message: 'The replacement owner is ready.' },
    }), true, 'owner-replaced');
  }

  if (type === 'owner.released') {
    if (state.ownership.standing === 'released') return outcome(state, false, 'owner-already-released');
    return outcome(accepted(state, {
      ownership: { ...state.ownership, standing: 'released' },
      request: { standing: 'idle', requestId: null, ownerGeneration: null, message: 'Controller resources released.' },
    }), true, 'owner-released');
  }

  throw new TypeError(`Unsupported data-view event: ${type}.`);
}

export function createDataSemanticTwin(state) {
  const records = pageRecords(state);
  const selectedRecord = records.find(record => record.id === state.selection.recordId) ?? null;
  const numericValues = state.fixture.records.filter(record => Number.isFinite(record.value)).map(record => record.value);
  const observedDates = state.fixture.records.flatMap(record => record.observedAt === null ? [] : [record.observedAt]);
  const totalPages = Math.max(1, Math.ceil(state.fixture.records.length / state.view.pageSize));
  const pageStart = (state.view.page - 1) * state.view.pageSize;
  return freezeTree({
    identity: state.fixture.dataViewLabId,
    revision: state.fixture.revision,
    lineage: { ...state.fixture.lineage },
    scope: state.fixture.scope,
    unit: state.fixture.unit,
    denominator: state.fixture.denominator,
    dataStanding: state.data.standing,
    decisionNeed: state.view.decisionNeed,
    renderer: state.view.renderer,
    page: state.view.page,
    pageSize: state.view.pageSize,
    totalPages,
    totalRecords: state.fixture.records.length,
    selectedRecordId: selectedRecord?.id ?? null,
    selectedRecord,
    continuation: {
      previousRecordId: pageStart > 0 ? state.fixture.records[pageStart - 1]?.id ?? null : null,
      nextRecordId: pageStart + records.length < state.fixture.records.length ? state.fixture.records[pageStart + records.length]?.id ?? null : null,
    },
    domains: {
      numeric: {
        minimum: numericValues.length ? Math.min(0, ...numericValues) : 0,
        maximum: numericValues.length ? Math.max(0, ...numericValues) : 0,
      },
      observedAt: {
        first: observedDates.length ? [...observedDates].sort()[0] : null,
        last: observedDates.length ? [...observedDates].sort().at(-1) : null,
      },
      position: { x: [0, 100], y: [0, 100] },
    },
    relationships: state.fixture.relationships.map(relationship => ({ ...relationship })),
    state: {
      request: { ...state.request },
      data: { ...state.data },
      authorization: { ...state.authorization },
      disclosure: { ...state.disclosure },
      ownership: { ...state.ownership },
    },
    records,
  });
}

export function exportDataViewState(state) { return JSON.parse(JSON.stringify(state)); }
