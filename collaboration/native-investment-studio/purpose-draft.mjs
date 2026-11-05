import { LIMITS, PURPOSE_FIELDS } from './config.mjs';

const PURPOSE_ID = 'purpose';
const NO_ERRORS = Object.freeze([]);

function diagnostic(code, path, message) { return Object.freeze({ code, path, message }); }
function stale() { return diagnostic('stale-edit', 'draft', 'Review these notes against the current plan.'); }
function canonical(raw) {
  return Object.fromEntries(PURPOSE_FIELDS.map(field => [field, raw[field].trim() || null]));
}
function samePurpose(left, right) { return PURPOSE_FIELDS.every(field => left[field] === right[field]); }

// One explicit text transaction owns its raw fields and one complete preview.
export function createPurposeDraftAdapter(studio) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.updatePurpose !== 'function'
      || typeof studio.previewPurpose !== 'function') throw new TypeError('Supply a Studio with purpose editing and preview.');
  let active = null;
  let disposed = false;
  let lastError = null;

  function read() {
    const projection = studio.read();
    const isStale = active !== null && active.baseProjection !== projection;
    const draft = active === null ? null : Object.freeze({
      token: active.token, purposeId: PURPOSE_ID, baseProjection: active.baseProjection,
      raw: Object.freeze({ ...active.raw }), errors: NO_ERRORS,
      changed: !samePurpose(canonical(active.raw), active.baseProjection.state.purpose),
    });
    return Object.freeze({ status: disposed ? 'disposed' : isStale ? 'stale' : active ? 'editing' : 'idle',
      projection, draft, pending: false, error: lastError ?? (isStale ? stale() : null) });
  }

  function fail(error, retain = true) {
    if (retain && error.code !== 'draft-token' && error.code !== 'disposed') lastError = error;
    return Object.freeze({ ok: false, error, view: read() });
  }
  function succeed() { lastError = null; return Object.freeze({ ok: true, view: read() }); }
  function guard(token) {
    if (disposed) return diagnostic('disposed', 'draft', 'Create another editor to begin editing.');
    if (!active || active.token !== token) return diagnostic('draft-token', 'draft', 'Use the currently open purpose editor.');
    return null;
  }

  function begin(purposeId, expectedProjection) {
    if (disposed) return fail(diagnostic('disposed', 'draft', 'Create another editor to begin editing.'));
    if (active) return fail(diagnostic('draft-open', 'draft', 'Apply or cancel the open purpose notes first.'));
    const projection = studio.read();
    if (expectedProjection !== projection) return fail(stale());
    if (purposeId !== PURPOSE_ID) return fail(diagnostic('reference', 'draft.purposeId', 'Choose the plan purpose.'));
    active = { token: Object.freeze({}), baseProjection: projection, rawRevision: 0, preview: null,
      raw: Object.fromEntries(PURPOSE_FIELDS.map(field => [field, projection.state.purpose[field] ?? ''])) };
    return succeed();
  }

  function setText(token, field, raw) {
    const error = guard(token);
    if (error) return fail(error);
    if (!PURPOSE_FIELDS.includes(field)) return fail(diagnostic('field', 'draft', 'Choose a purpose field.'));
    if (typeof raw !== 'string' || raw.length > LIMITS.purposeText) {
      return fail(diagnostic('text', `draft.${field}`, `Use at most ${LIMITS.purposeText} text units.`));
    }
    if (active.raw[field] !== raw) { active.raw[field] = raw; active.rawRevision += 1; }
    return succeed();
  }

  function validate(token) {
    const error = guard(token);
    if (error) return fail(error);
    if (active.baseProjection !== studio.read()) return fail(stale());
    return succeed();
  }

  function preview(token) {
    const error = guard(token);
    if (error) return fail(error, false);
    if (active.baseProjection !== studio.read()) return fail(stale(), false);
    const session = active;
    const purpose = canonical(session.raw);
    if (!session.preview || !samePurpose(session.preview.purpose, purpose)) {
      const rawRevision = session.rawRevision;
      const result = studio.previewPurpose(purpose, session.baseProjection);
      const current = guard(token);
      if (current) return fail(current, false);
      if (active !== session || session.baseProjection !== studio.read()) return fail(stale(), false);
      if (session.rawRevision !== rawRevision) return fail(diagnostic('draft-changed', 'draft', 'Review the updated purpose notes.'), false);
      session.preview = { purpose, result };
    }
    if (!session.preview.result.ok) return fail(session.preview.result.error, false);
    return Object.freeze({ ok: true, projection: session.preview.result.projection, view: read() });
  }

  function apply(token) {
    const error = guard(token);
    if (error) return fail(error);
    if (active.baseProjection !== studio.read()) return fail(stale());
    const session = active;
    const rawRevision = session.rawRevision;
    const result = studio.updatePurpose(canonical(session.raw), session.baseProjection);
    if (!result.ok) return fail(result.error, active === session && session.rawRevision === rawRevision);
    // Publication may synchronously hand control to a replacement editor.
    // Its raw text and diagnostics belong to that newer transaction.
    if (active !== session || session.rawRevision !== rawRevision) return Object.freeze({ ok: true, view: read() });
    active = null;
    return succeed();
  }

  function cancel(token) {
    const error = guard(token);
    if (error) return fail(error);
    active = null;
    return succeed();
  }
  function dispose() { disposed = true; active = null; return succeed(); }

  return Object.freeze({ read, begin, setText, validate, preview, apply, cancel, dispose });
}
