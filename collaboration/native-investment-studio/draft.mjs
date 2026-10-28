import { LIMITS } from './config.mjs';

const FIELD_LIMITS = Object.freeze({
  minutesPerOccurrence: LIMITS.minutesPerOccurrence,
  occurrences: LIMITS.occurrences,
});
const FIELDS = Object.freeze(Object.keys(FIELD_LIMITS));
const TEXT_LIMIT = 32;
const DIGITS = /^[0-9]+$/;
const NEGATIVE = /^-[0-9]+$/;
const UNFINISHED = /^(?:-|[0-9]+[eE][+-]?)$/;

function diagnostic(code, path, message) { return Object.freeze({ code, path, message }); }
function stale() { return diagnostic('stale-edit', 'draft', 'Keep this draft for inspection; cancel and begin from the current accepted plan to revise it.'); }

function parseField(field, raw) {
  const path = `draft.${field}`;
  if (raw === '') return { error: diagnostic('empty', path, 'Enter a whole-number quantity; zero is a complete value.') };
  if (UNFINISHED.test(raw)) return { error: diagnostic('incomplete', path, 'Finish the quantity using decimal digits.') };
  const max = FIELD_LIMITS[field];
  if (NEGATIVE.test(raw)) return { error: diagnostic('range', path, `Enter a whole number from 0 through ${max}.`) };
  if (!DIGITS.test(raw)) return { error: diagnostic('integer-text', path, 'Enter the quantity using decimal digits.') };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > max) return { error: diagnostic('range', path, `Enter a whole number from 0 through ${max}.`) };
  return { value };
}

// One editor owns bounded draft text; the Studio remains the accepted-state owner.
export function createWorkDraftAdapter(studio, scheduler = null) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.updateWork !== 'function') {
    throw new TypeError('Supply a native Studio owner.');
  }
  if (scheduler !== null && (typeof scheduler?.request !== 'function' || typeof scheduler?.cancel !== 'function')) {
    throw new TypeError('Supply both scheduler request and cancel operations.');
  }
  const request = scheduler === null ? null : scheduler.request.bind(scheduler);
  const cancelRequest = scheduler === null ? null : scheduler.cancel.bind(scheduler);
  let active = null;
  let pending = null;
  let disposed = false;
  let lastError = null;
  let disposalError = null;
  let diagnosticOwner = null;

  function values(draft) {
    const admitted = {};
    const errors = [];
    for (const field of FIELDS) {
      const parsed = parseField(field, draft.raw[field]);
      if (parsed.error) errors.push(parsed.error);
      else admitted[field] = parsed.value;
    }
    return { admitted, errors };
  }

  function read() {
    const projection = studio.read();
    const isStale = active !== null && active.baseProjection !== projection;
    const draft = active === null ? null : Object.freeze({
      token: active.token, workId: active.row.id, baseProjection: active.baseProjection,
      raw: Object.freeze({ ...active.raw }), errors: Object.freeze(values(active).errors),
    });
    return Object.freeze({
      status: disposed ? 'disposed' : isStale ? 'stale' : active ? 'editing' : 'idle',
      projection, draft, pending: pending !== null,
      error: lastError ?? (isStale ? stale() : null),
    });
  }

  function fail(error, retain = true) {
    // A late control receives its error while the current editor keeps its own.
    if (retain && error.code !== 'draft-token' && error.code !== 'disposed') lastError = error;
    return Object.freeze({ ok: false, error, view: read() });
  }

  function succeed(retain = true) {
    if (retain) lastError = null;
    return Object.freeze({ ok: true, view: read() });
  }

  function ownsDiagnostic(token) { return diagnosticOwner === token && !disposed; }

  function guard(token) {
    if (disposed) return diagnostic('disposed', 'draft', 'Create another adapter to begin editing.');
    if (active === null || token !== active.token) return diagnostic('draft-token', 'draft', 'Use the token for this open draft.');
    return null;
  }

  function fieldGuard(field) {
    return typeof field === 'string' && Object.hasOwn(FIELD_LIMITS, field)
      ? null : diagnostic('field', 'draft', 'Choose duration or occurrence count.');
  }

  function release(ticket) {
    if (!ticket.hasHandle || ticket.released) return null;
    ticket.released = true;
    try { cancelRequest(ticket.handle); }
    catch {
      const error = diagnostic('cleanup', 'scheduler', 'The callback is invalidated; the scheduler must finish releasing its resource.');
      if (disposed) disposalError ??= error;
      return error;
    }
    return null;
  }

  function stopPending() {
    const ticket = pending;
    pending = null;
    return ticket === null ? null : release(ticket);
  }

  function begin(workId, expectedProjection) {
    if (disposed) return fail(diagnostic('disposed', 'draft', 'Create another adapter to begin editing.'));
    if (active !== null) return fail(diagnostic('draft-open', 'draft', 'Apply or cancel the open draft before selecting another work record.'));
    const projection = studio.read();
    if (expectedProjection !== projection) return fail(stale());
    const row = projection.state.work.find(work => work.id === workId);
    if (!row) return fail(diagnostic('reference', 'draft.workId', 'Choose an existing work record.'));
    active = { token: Object.freeze({}), row, baseProjection: projection,
      raw: Object.fromEntries(FIELDS.map(field => [field, String(row[field])])) };
    diagnosticOwner = active.token;
    return succeed();
  }

  function setText(token, field, raw) {
    const error = guard(token) ?? fieldGuard(field);
    if (error) return fail(error);
    if (typeof raw !== 'string' || raw.length > TEXT_LIMIT) {
      return fail(diagnostic('text', `draft.${field}`, `Supply editable text of at most ${TEXT_LIMIT} characters.`));
    }
    active.raw[field] = raw;
    return succeed();
  }

  function step(token, field, direction) {
    const error = guard(token) ?? fieldGuard(field);
    if (error) return fail(error);
    if (direction !== -1 && direction !== 1) return fail(diagnostic('step', `draft.${field}`, 'Choose one increment or one decrement.'));
    const parsed = parseField(field, active.raw[field]);
    if (parsed.error) return fail(parsed.error);
    const next = parsed.value + direction;
    if (next < 0 || next > FIELD_LIMITS[field]) return fail(diagnostic('range', `draft.${field}`, `Keep the quantity from 0 through ${FIELD_LIMITS[field]}.`));
    active.raw[field] = String(next);
    return succeed();
  }

  function validate(token) {
    const error = guard(token);
    if (error) return fail(error);
    if (active.baseProjection !== studio.read()) return fail(stale());
    const { errors } = values(active);
    return errors.length ? fail(errors[0]) : succeed();
  }

  function apply(token) {
    const error = guard(token);
    if (error) return fail(error);
    const cleanup = stopPending();
    if (cleanup) return fail(cleanup, ownsDiagnostic(token));
    // Cancellation can call back into the adapter; verify the session again.
    const current = guard(token);
    if (current) return fail(current);
    if (active.baseProjection !== studio.read()) return fail(stale());
    const { admitted, errors } = values(active);
    if (errors.length) return fail(errors[0]);
    const result = studio.updateWork(active.row.id, { ...active.row, ...admitted }, active.baseProjection);
    if (!result.ok) return fail(result.error);
    active = null;
    return succeed();
  }

  function queueApply(token) {
    const error = guard(token);
    if (error) return fail(error);
    if (active.baseProjection !== studio.read()) return fail(stale());
    if (request === null) return fail(diagnostic('scheduler-unavailable', 'scheduler', 'Apply directly or supply a deferred scheduler.'));
    if (pending !== null) return succeed();
    const ticket = { hasHandle: false, handle: undefined, released: false, early: false };
    pending = ticket;
    try {
      ticket.handle = request(() => {
        if (pending !== ticket) return;
        if (!ticket.hasHandle) { ticket.early = true; return; }
        pending = null;
        apply(token);
      });
      ticket.hasHandle = true;
    } catch {
      if (pending === ticket) pending = null;
      return fail(diagnostic('scheduler', 'scheduler', 'Scheduling failed; the draft remains available for an explicit Apply.'), active?.token === token && !disposed);
    }
    if (pending !== ticket) {
      const cleanup = release(ticket);
      return fail(cleanup ?? diagnostic('cancelled', 'scheduler', 'The pending request was superseded during scheduling.'), active?.token === token && !disposed);
    }
    if (ticket.early) {
      pending = null;
      const cleanup = release(ticket);
      return fail(cleanup ?? diagnostic('scheduler', 'scheduler', 'Supply a scheduler that invokes callbacks after returning their handles.'), active?.token === token && ownsDiagnostic(token));
    }
    return succeed();
  }

  function cancel(token) {
    const error = guard(token);
    if (error) return fail(error);
    active = null;
    const cleanup = stopPending();
    return cleanup ? fail(cleanup, ownsDiagnostic(token)) : succeed(ownsDiagnostic(token));
  }

  function dispose() {
    if (disposed) return disposalError ? fail(disposalError) : succeed();
    disposed = true;
    active = null;
    disposalError = stopPending();
    return disposalError ? fail(disposalError) : succeed();
  }

  return Object.freeze({ read, begin, setText, step, validate, apply, queueApply, cancel, dispose });
}
