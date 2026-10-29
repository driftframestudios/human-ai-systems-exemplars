import { CONTRACT, LIMITS } from './config.mjs';

const MINUTES_PER_HOUR = CONTRACT.minutesPerHour;

const FIELD_LIMITS = Object.freeze({
  minutesPerOccurrence: LIMITS.minutesPerOccurrence,
  occurrences: LIMITS.occurrences,
});
const DURATION_PART_LIMITS = Object.freeze({
  hoursPerSession: LIMITS.minutesPerOccurrence / MINUTES_PER_HOUR,
  minutesPerSession: MINUTES_PER_HOUR - 1,
  occurrences: LIMITS.occurrences,
});
const FORMATS = Object.freeze({
  minutes: Object.freeze({ limits: FIELD_LIMITS, fields: Object.freeze(Object.keys(FIELD_LIMITS)) }),
  'hours-minutes': Object.freeze({ limits: DURATION_PART_LIMITS, fields: Object.freeze(Object.keys(DURATION_PART_LIMITS)) }),
});
export const WORK_DRAFT_TEXT_LIMIT = 32;
const TEXT_LIMIT = WORK_DRAFT_TEXT_LIMIT;
const DIGITS = /^[0-9]+$/;
const NEGATIVE = /^-[0-9]+$/;
const UNFINISHED = /^(?:-|[0-9]+[eE][+-]?)$/;

function diagnostic(code, path, message) { return Object.freeze({ code, path, message }); }
function stale() { return diagnostic('stale-edit', 'draft', 'Keep this draft for inspection; cancel and begin from the current accepted plan to revise it.'); }

function parseField(field, raw, max) {
  const path = `draft.${field}`;
  if (raw === '') return { error: diagnostic('empty', path, 'Enter a whole-number quantity; zero is a complete value.') };
  if (UNFINISHED.test(raw)) return { error: diagnostic('incomplete', path, 'Finish the quantity using decimal digits.') };
  if (NEGATIVE.test(raw)) return { error: diagnostic('range', path, `Enter a whole number from 0 through ${max}.`) };
  if (!DIGITS.test(raw)) return { error: diagnostic('integer-text', path, 'Enter the quantity using decimal digits.') };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > max) return { error: diagnostic('range', path, `Enter a whole number from 0 through ${max}.`) };
  return { value };
}

// Callers admit bounded raw strings before using this pure duration codec.
export function prepareWorkDraftValues(raw, durationFormat = 'hours-minutes') {
  const { limits, fields } = FORMATS[durationFormat];
  const usesDurationParts = durationFormat === 'hours-minutes';
  const parsedValues = {};
  const errors = [];
  for (const field of fields) {
    const parsed = parseField(field, raw[field], limits[field]);
    if (parsed.error) errors.push(parsed.error);
    else parsedValues[field] = parsed.value;
  }
  if (!usesDurationParts) return { admitted: parsedValues, errors };
  const admitted = { occurrences: parsedValues.occurrences };
  if (Object.hasOwn(parsedValues, 'hoursPerSession') && Object.hasOwn(parsedValues, 'minutesPerSession')) {
    const duration = parsedValues.hoursPerSession * MINUTES_PER_HOUR + parsedValues.minutesPerSession;
    if (duration > LIMITS.minutesPerOccurrence) errors.push(diagnostic('range', 'draft.minutesPerSession',
      `Keep the combined session duration within ${DURATION_PART_LIMITS.hoursPerSession} hours.`));
    else admitted.minutesPerOccurrence = duration;
  }
  return { admitted, errors };
}


export function stepWorkDraftValues(raw, field, direction, durationFormat = 'hours-minutes') {
  const { limits } = FORMATS[durationFormat];
  if (typeof field !== 'string' || !Object.hasOwn(limits, field)) return { error: diagnostic('field', 'draft', 'Choose a duration field or the session count.') };
  if (direction !== -1 && direction !== 1) return { error: diagnostic('step', `draft.${field}`, 'Choose one increment or one decrement.') };
  if (durationFormat === 'hours-minutes' && field !== 'occurrences') {
    const { admitted, errors } = prepareWorkDraftValues(raw, durationFormat);
    const durationError = errors.find(item => item.path !== 'draft.occurrences');
    if (durationError) return { error: durationError };
    const next = admitted.minutesPerOccurrence + direction * (field === 'hoursPerSession' ? MINUTES_PER_HOUR : 1);
    if (next < 0 || next > LIMITS.minutesPerOccurrence) return { error: diagnostic('range', `draft.${field}`,
      `Keep the combined session duration from zero through ${DURATION_PART_LIMITS.hoursPerSession} hours.`) };
    return { raw: { ...raw, hoursPerSession: String(Math.floor(next / MINUTES_PER_HOUR)), minutesPerSession: String(next % MINUTES_PER_HOUR) } };
  }
  const parsed = parseField(field, raw[field], limits[field]);
  if (parsed.error) return { error: parsed.error };
  const next = parsed.value + direction;
  if (next < 0 || next > limits[field]) return { error: diagnostic('range', `draft.${field}`, `Keep the quantity from 0 through ${limits[field]}.`) };
  return { raw: { ...raw, [field]: String(next) } };
}

// One editor owns bounded draft text; the Studio remains the accepted-state owner.
export function createWorkDraftAdapter(studio, scheduler = null, { durationFormat = 'minutes' } = {}) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.updateWork !== 'function') {
    throw new TypeError('Supply a native Studio owner.');
  }
  if (scheduler !== null && (typeof scheduler?.request !== 'function' || typeof scheduler?.cancel !== 'function')) {
    throw new TypeError('Supply both scheduler request and cancel operations.');
  }
  if (typeof durationFormat !== 'string' || !Object.hasOwn(FORMATS, durationFormat)) {
    throw new TypeError('Choose minutes or hours-minutes for the duration format.');
  }
  const { limits, fields } = FORMATS[durationFormat];
  const usesDurationParts = durationFormat === 'hours-minutes';
  const request = scheduler === null ? null : scheduler.request.bind(scheduler);
  const cancelRequest = scheduler === null ? null : scheduler.cancel.bind(scheduler);
  let active = null;
  let pending = null;
  let disposed = false;
  let lastError = null;
  let disposalError = null;
  let diagnosticOwner = null;
  let releasingToken = null;

  function rawValues(row) {
    return usesDurationParts ? {
      hoursPerSession: String(Math.floor(row.minutesPerOccurrence / MINUTES_PER_HOUR)),
      minutesPerSession: String(row.minutesPerOccurrence % MINUTES_PER_HOUR),
      occurrences: String(row.occurrences),
    } : Object.fromEntries(fields.map(field => [field, String(row[field])]));
  }

  function values(draft) { return prepareWorkDraftValues(draft.raw, durationFormat); }

  function read() {
    const projection = studio.read();
    const isStale = active !== null && active.baseProjection !== projection;
    const parsed = active === null ? null : values(active);
    const draft = active === null ? null : Object.freeze({
      token: active.token, workId: active.row.id, baseProjection: active.baseProjection,
      raw: Object.freeze({ ...active.raw }), errors: Object.freeze(parsed.errors),
      changed: parsed.errors.length > 0 || parsed.admitted.minutesPerOccurrence !== active.row.minutesPerOccurrence
        || parsed.admitted.occurrences !== active.row.occurrences,
    });
    return Object.freeze({
      status: disposed ? 'disposed' : isStale ? 'stale' : active ? 'editing' : 'idle',
      projection, draft, pending: pending !== null,
      error: disposalError ?? lastError ?? (isStale ? stale() : null),
    });
  }

  function fail(error, retain = true) {
    // A late control receives its error while the current editor keeps its own.
    if (retain && error.code !== 'draft-token' && error.code !== 'disposed' && error.code !== 'settling') lastError = error;
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
    return typeof field === 'string' && Object.hasOwn(limits, field)
      ? null : diagnostic('field', 'draft', 'Choose a duration field or the session count.');
  }

  function commitGuard(token) {
    return guard(token) ?? (token === releasingToken
      ? diagnostic('settling', 'scheduler', 'Finish releasing this draft’s pending request before applying or scheduling it again.')
      : null);
  }

  function release(ticket) {
    if (!ticket.hasHandle || ticket.released) return null;
    ticket.released = true;
    const previousToken = releasingToken;
    releasingToken = ticket.token;
    try { cancelRequest(ticket.handle); }
    catch {
      const error = diagnostic('cleanup', 'scheduler', 'The callback is invalidated; the scheduler must finish releasing its resource.');
      if (disposed) disposalError ??= error;
      return error;
    }
    finally { releasingToken = previousToken; }
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
      raw: rawValues(row), rawRevision: 0, preview: null };
    diagnosticOwner = active.token;
    return succeed();
  }

  function setText(token, field, raw) {
    const error = guard(token) ?? fieldGuard(field);
    if (error) return fail(error);
    if (typeof raw !== 'string' || raw.length > TEXT_LIMIT) {
      return fail(diagnostic('text', `draft.${field}`, `Supply editable text of at most ${TEXT_LIMIT} characters.`));
    }
    if (active.raw[field] !== raw) {
      active.raw[field] = raw;
      active.rawRevision += 1;
      active.preview = null;
    }
    return succeed();
  }

  function step(token, field, direction) {
    const error = guard(token) ?? fieldGuard(field);
    if (error) return fail(error);
    const result = stepWorkDraftValues(active.raw, field, direction, durationFormat);
    if (result.error) return fail(result.error);
    active.raw = result.raw;
    active.rawRevision += 1;
    active.preview = null;
    return succeed();
  }

  function validate(token) {
    const error = guard(token);
    if (error) return fail(error);
    if (active.baseProjection !== studio.read()) return fail(stale());
    const { errors } = values(active);
    return errors.length ? fail(errors[0]) : succeed();
  }

  function preview(token) {
    const error = guard(token);
    if (error) return fail(error, false);
    if (active.baseProjection !== studio.read()) return fail(stale(), false);
    const { admitted, errors } = values(active);
    if (errors.length) return fail(errors[0], false);
    if (typeof studio.previewWork !== 'function') return fail(diagnostic('preview-unavailable', 'draft',
      'Use a Studio with work-preview support to inspect the draft investment.'), false);
    const session = active;
    if (session.preview === null) {
      const revision = session.rawRevision;
      const result = studio.previewWork(session.row.id, { ...session.row, ...admitted }, session.baseProjection);
      const current = guard(token);
      if (current) return fail(current, false);
      if (active !== session || session.baseProjection !== studio.read()) return fail(stale(), false);
      if (session.rawRevision !== revision) return fail(diagnostic('draft-changed', 'draft',
        'Inspect the current draft quantities to refresh this estimate.'), false);
      session.preview = result;
    }
    if (!session.preview.ok) return fail(session.preview.error, false);
    return Object.freeze({ ok: true, projection: session.preview.projection, view: read() });
  }

  function apply(token) {
    const error = commitGuard(token);
    if (error) return fail(error);
    const cleanup = stopPending();
    if (cleanup) return fail(cleanup, ownsDiagnostic(token));
    // Cancellation can call back into the adapter; verify the session again.
    const current = guard(token);
    if (current) return fail(current);
    if (active.baseProjection !== studio.read()) return fail(stale());
    const { admitted, errors } = values(active);
    if (errors.length) return fail(errors[0]);
    const session = active;
    const rawRevision = session.rawRevision;
    const result = studio.updateWork(session.row.id, { ...session.row, ...admitted }, session.baseProjection);
    if (!result.ok) return fail(result.error, active === session && session.rawRevision === rawRevision);
    // A publication callback can open another editor or continue this draft.
    // Its newer text and diagnostic keep their transaction ownership.
    if (active !== session || session.rawRevision !== rawRevision) return succeed(false);
    active = null;
    return succeed();
  }

  function queueApply(token) {
    const error = commitGuard(token);
    if (error) return fail(error);
    if (active.baseProjection !== studio.read()) return fail(stale());
    if (request === null) return fail(diagnostic('scheduler-unavailable', 'scheduler', 'Apply directly or supply a deferred scheduler.'));
    if (pending !== null) return succeed();
    const ticket = { token, hasHandle: false, handle: undefined, released: false, early: false };
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

  return Object.freeze({ read, begin, setText, step, validate, preview, apply, queueApply, cancel, dispose });
}
