import { LIMITS, PURPOSE_FIELDS } from './config.mjs';
import { prepareImport, PlanError } from './contract.mjs';
import { preparePreset } from './presets.mjs';

const INSTANCES = new WeakMap();
const encoder = new TextEncoder();
const ROOT_FIELDS = Object.freeze(['kind', 'schemaVersion', 'modelVersion', 'planId', 'revision', 'currency', 'horizonWeeks']);
// These fields own preview comparisons, while contract.mjs owns admission.
const ROW_FIELDS = Object.freeze({
  people: Object.freeze(['label', 'fundedMinutes', 'rateCentsPerHour', 'role', 'lifecycle']),
  teams: Object.freeze(['label', 'personIds', 'lifecycle']),
  work: Object.freeze(['label', 'teamId', 'personIds', 'minutesPerOccurrence', 'occurrences', 'funding', 'status', 'timing', 'lifecycle']),
  practices: Object.freeze(['practiceId', 'teamId', 'workIds']),
  contributions: Object.freeze(['categoryId', 'receiverPersonId', 'decisionOwnerPersonId', 'workIds', 'reviewBoundary', 'decisionBoundary']),
  connections: Object.freeze(['senderTeamId', 'receiverTeamId', 'receiverPersonId', 'sharedObject', 'responseExpectation', 'workIds', 'status']),
});
const diagnostic = (code, message, path = 'exchange') => Object.freeze({ code, path, message });
const staleDiagnostic = () => diagnostic('stale-preview', 'The plan or edits changed. Preview this plan again.');
const sameAcceptance = (a, b) => a.instance === b.instance && a.token === b.token;

function fileSize(file) {
  let size;
  try { size = file?.size; } catch { throw new PlanError('file', 'file', 'Choose a readable plan file.'); }
  if (!Number.isSafeInteger(size) || size < 0 || size > LIMITS.bytes) {
    throw new PlanError('bytes', 'file', `Choose a plan file of at most ${LIMITS.bytes} bytes.`);
  }
  return size;
}
function fileError(error) {
  return error instanceof PlanError ? diagnostic(error.code, error.message, error.path)
    : diagnostic('file-read', 'Choose the file again to read it.', 'file');
}
function boundedText(text) {
  if (typeof text !== 'string') return null;
  // Bound encoding work even when a caller supplies a very large string. A
  // streaming decode keeps only complete UTF-8 characters at the byte edge.
  const bytes = encoder.encode(text.slice(0, LIMITS.bytes));
  return new TextDecoder().decode(bytes.subarray(0, LIMITS.bytes), { stream: true });
}
function decodeBytes(value) {
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
  if (!(bytes instanceof Uint8Array)) {
    throw new PlanError('file-read', 'file', 'Read the plan as UTF-8 file bytes.');
  }
  if (bytes.byteLength > LIMITS.bytes) throw new PlanError('bytes', 'file', 'Choose a plan within the file-size limit.');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new PlanError('utf8', 'file', 'Save the plan as UTF-8 text, then choose it again.'); }
}

// The browser adapter releases handlers on every exit. Aborting retires the
// promise before asking FileReader to release its work, including sync events.
export function readFileBytes(file, { signal, createReader = () => new FileReader() } = {}) {
  return new Promise((resolve, reject) => {
    let reader = null, settled = false, readerAborted = false;
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      reader?.removeEventListener('load', onLoad);
      reader?.removeEventListener('error', onError);
      reader?.removeEventListener('abort', onReaderAbort);
    };
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onLoad = () => settle(resolve, reader.result);
    const onError = () => settle(reject, new PlanError('file-read', 'file', 'Choose the file again to read it.'));
    const onReaderAbort = () => settle(reject, new PlanError('aborted', 'file', 'Choose a file to begin another preview.'));
    const onAbort = () => {
      onReaderAbort();
      if (reader && !readerAborted) {
        readerAborted = true;
        try { reader.abort(); } catch { /* The request is already retired. */ }
      }
    };
    const stopAcquiring = () => {
      if (signal?.aborted) onAbort();
      if (!settled) return false;
      // Registration can synchronously settle before installing its listener.
      // Release that just-returned acquisition as well as earlier handlers.
      cleanup();
      return true;
    };
    try {
      fileSize(file);
      if (signal?.aborted) { onAbort(); return; }
      reader = createReader();
      if (stopAcquiring()) return;
      signal?.addEventListener('abort', onAbort, { once: true });
      if (stopAcquiring()) return;
      for (const [type, handler] of [['load', onLoad], ['error', onError], ['abort', onReaderAbort]]) {
        reader.addEventListener(type, handler);
        if (stopAcquiring()) return;
      }
      reader.readAsArrayBuffer(file);
    } catch (error) {
      settle(reject, error instanceof PlanError ? error : new PlanError('file-read', 'file', 'Choose a readable plan file.'));
    }
  });
}

function equalField(left, right) {
  if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left)) return JSON.stringify(left) === JSON.stringify(right);
  return Array.isArray(left) ? Array.isArray(right) && left.length === right.length
    && left.every((value, index) => value === right[index]) : left === right;
}
function changesBetween(before, after) {
  const changes = {
    plan: Object.freeze(ROOT_FIELDS.filter(field => before[field] !== after[field])),
    purpose: Object.freeze(PURPOSE_FIELDS.filter(field => before.purpose[field] !== after.purpose[field])),
  };
  for (const [kind, fields] of Object.entries(ROW_FIELDS)) {
    const prior = new Map(before[kind].map(row => [row.id, row]));
    const next = new Set();
    const added = [], changed = [];
    for (const row of after[kind]) {
      next.add(row.id);
      const previous = prior.get(row.id);
      if (!previous) { added.push(row.id); continue; }
      const names = fields.filter(field => !equalField(previous[field], row[field]));
      if (names.length) changed.push(Object.freeze({ id: row.id, fields: Object.freeze(names) }));
    }
    changes[kind] = Object.freeze({ added: Object.freeze(added),
      removed: Object.freeze(before[kind].filter(row => !next.has(row.id)).map(row => row.id)),
      changed: Object.freeze(changed),
      orderChanged: before[kind].length !== after[kind].length
        || before[kind].some((row, index) => row.id !== after[kind][index].id),
    });
  }
  return Object.freeze(changes);
}

// One exchange owner per Studio. The coordinator retains raw drafts; this owner
// retains one pending reader or one prepared preview and bounded rejected text.
export function createPlanExchange(studio, editing, { readFile = readFileBytes } = {}) {
  if (!studio || !['read', 'readAcceptance', 'replace'].every(key => typeof studio[key] === 'function')
      || !editing || typeof editing.read !== 'function' || typeof editing.park !== 'function'
      || typeof readFile !== 'function') {
    throw new TypeError('Supply a Studio, its draft coordinator, and a file reader.');
  }
  const existing = INSTANCES.get(studio);
  if (existing) {
    if (existing.editing !== editing || existing.readFile !== readFile) throw new TypeError('Keep the current Studio exchange owner.');
    return existing.owner;
  }
  let disposed = false;
  let epoch = Symbol('exchange');
  let session = null;
  let pending = null;
  let preview = null;
  let status = 'idle';
  let error = null;
  let rejectedText = null;

  function fresh(operation) {
    if (disposed || operation !== session || operation.epoch !== epoch) return false;
    const current = studio.readAcceptance(), draft = editing.read();
    return !disposed && operation === session && operation.epoch === epoch
      && sameAcceptance(operation.acceptance, current)
      && operation.intent === draft.intent && !draft.disposed;
  }
  function read() {
    const stale = session && !disposed && !fresh(session);
    return Object.freeze({ status: disposed ? 'disposed' : stale ? 'stale' : status,
      pending: !stale && pending !== null, preview,
      error: disposed ? null : stale ? staleDiagnostic() : error, rejectedText });
  }
  function failure(problem) { return Object.freeze({ ok: false, error: problem, view: read() }); }
  function success() { return Object.freeze({ ok: true, view: read() }); }
  function retired(operation) {
    if (disposed) return diagnostic('disposed', 'Open another Studio to preview a plan.');
    return operation !== session || operation.epoch !== epoch
      ? diagnostic('superseded', 'Use the latest plan preview.') : staleDiagnostic();
  }
  function reset() {
    const previous = pending;
    const marker = Symbol('exchange');
    epoch = marker;
    session = null;
    pending = null;
    preview = null;
    rejectedText = null;
    error = null;
    status = 'idle';
    previous?.abort();
    return marker;
  }
  function begin(source) {
    if (disposed) return null;
    const marker = reset();
    if (disposed || marker !== epoch) return null;
    const acceptance = studio.readAcceptance();
    const draft = editing.read();
    if (draft.disposed) { error = diagnostic('disposed', 'Open another Studio to preview a plan.'); status = 'error'; return null; }
    session = { epoch: marker, acceptance, intent: draft.intent, source };
    return session;
  }
  function unavailable() {
    return failure(diagnostic(disposed ? 'disposed' : 'superseded', disposed
      ? 'Open another Studio to preview a plan.' : 'Use the latest plan preview.'));
  }
  function reject(operation, caught, text = null) {
    if (!fresh(operation)) return failure(retired(operation));
    pending = null;
    status = 'error';
    error = fileError(caught);
    rejectedText = boundedText(text);
    return failure(error);
  }
  function receive(operation, prepared) {
    if (!fresh(operation)) return failure(retired(operation));
    const projection = studio.read();
    const changes = changesBetween(projection.state, prepared.projection.state);
    if (!fresh(operation)) return failure(retired(operation));
    preview = Object.freeze({ token: Symbol('plan-preview'), projection: prepared.projection,
      sourceSchemaVersion: prepared.sourceSchemaVersion, source: operation.source,
      ...(prepared.preset ? { preset: prepared.preset } : {}), changes });
    pending = null;
    status = 'preview';
    error = null;
    rejectedText = null;
    return success();
  }
  function previewText(text) {
    const operation = begin(Object.freeze({ kind: 'text' }));
    if (!operation) return unavailable();
    try { return receive(operation, prepareImport(text)); }
    catch (caught) { return reject(operation, caught, text); }
  }
  function previewPreset(id, version) {
    const operation = begin(Object.freeze({ kind: 'preset' }));
    if (!operation) return unavailable();
    try { return receive(operation, preparePreset(id, version)); }
    catch (caught) { return reject(operation, caught); }
  }
  async function selectFile(file) {
    // Starting the new selection retires its predecessor before file admission.
    const operation = begin(Object.freeze({ kind: 'file' }));
    if (!operation) return unavailable();
    let text = null;
    try {
      fileSize(file);
      if (!fresh(operation)) return failure(retired(operation));
      const controller = new AbortController();
      pending = controller;
      status = 'reading';
      const bytes = await readFile(file, { signal: controller.signal });
      if (!fresh(operation)) return failure(retired(operation));
      text = decodeBytes(bytes);
      return receive(operation, prepareImport(text));
    } catch (caught) { return reject(operation, caught, text); }
    finally { if (session === operation) pending = null; }
  }
  function apply(token) {
    const operation = session;
    if (!operation || !preview || preview.token !== token) {
      return failure(diagnostic('preview-token', 'Choose the currently shown plan preview.'));
    }
    if (!fresh(operation)) return failure(retired(operation));
    const draft = editing.read();
    if (draft.active) {
      const port = editing[draft.active.kind];
      if (!port || typeof port.read !== 'function') return failure(diagnostic('draft-open', 'Finish the open edit, then preview this plan again.'));
      if (port.read().draft?.changed) return failure(diagnostic('draft-open', 'Apply or discard the open edit, then preview this plan again.'));
      const parked = editing.park();
      if (!parked.ok) return failure(parked.error);
    }
    if (!fresh(operation)) return failure(retired(operation));
    const result = studio.replace(preview.projection.state, studio.read());
    if (!result.ok) return failure(result.error);
    // Publication owns the new acceptance. Retire this preview exactly once.
    if (session === operation && !disposed) reset();
    return Object.freeze({ ok: true, projection: result.projection, view: read() });
  }
  function captureExport() {
    const projection = studio.read();
    return Object.freeze({ text: projection.serialized, acceptance: studio.readAcceptance(),
      planId: projection.state.planId, revision: projection.state.revision,
      schemaVersion: projection.state.schemaVersion, modelVersion: projection.state.modelVersion });
  }
  function clear() {
    if (disposed) return read();
    reset();
    return read();
  }
  function dispose() {
    if (disposed) return read();
    disposed = true;
    INSTANCES.delete(studio);
    reset();
    return read();
  }
  const owner = Object.freeze({ read, previewText, previewPreset, selectFile, apply, clear, captureExport, dispose });
  INSTANCES.set(studio, { owner, editing, readFile });
  return owner;
}
