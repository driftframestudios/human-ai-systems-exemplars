import { CONTRACT, LIMITS } from './config.mjs';

const MINUTES_PER_HOUR = CONTRACT.minutesPerHour;
const CENTS_PER_DOLLAR = 100;
const MAX_HOURS = Math.floor(LIMITS.fundedMinutes / MINUTES_PER_HOUR);
const MAX_RATE = LIMITS.rateCentsPerHour / CENTS_PER_DOLLAR;
export const PERSON_DRAFT_TEXT_LIMIT = 32;
const TEXT_LIMIT = PERSON_DRAFT_TEXT_LIMIT;
const FIELDS = Object.freeze(['ratePerHour', 'fundedHours', 'fundedMinutes']);
const DIGITS = /^[0-9]+$/;
const MONEY = /^([0-9]+)(?:\.([0-9]{1,2}))?$/;
const UNFINISHED = /^(?:-|[0-9]+[eE][+-]?)$/;
const NEGATIVE = /^-[0-9]+(?:\.[0-9]+)?$/;

function diagnostic(code, path, message) { return Object.freeze({ code, path, message }); }
function stale() { return diagnostic('stale-edit', 'draft', 'Cancel this draft and open settings from the current plan.'); }
function rateText(cents) {
  return cents === null ? '' : `${Math.floor(cents / CENTS_PER_DOLLAR)}.${String(cents % CENTS_PER_DOLLAR).padStart(2, '0')}`;
}

function parseRate(raw) {
  const path = 'draft.ratePerHour';
  if (raw === '') return { value: null };
  if (UNFINISHED.test(raw) || /^[0-9]+\.$/.test(raw)) return { error: diagnostic('incomplete', path, 'Finish the hourly rate.') };
  if (NEGATIVE.test(raw)) return { error: diagnostic('range', path, `Enter a rate from $0 through $${MAX_RATE}.`) };
  const match = MONEY.exec(raw);
  if (!match) return { error: diagnostic('money-text', path, 'Use dollars and up to two decimal places, or leave blank if unknown.') };
  const dollars = Number(match[1]);
  const cents = dollars * CENTS_PER_DOLLAR + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > LIMITS.rateCentsPerHour) {
    return { error: diagnostic('range', path, `Enter a rate from $0 through $${MAX_RATE}.`) };
  }
  return { value: cents };
}

function parseQuantity(field, raw, max) {
  const path = `draft.${field}`;
  if (raw === '') return { error: diagnostic('empty', path, 'Enter a whole number, including zero.') };
  if (UNFINISHED.test(raw)) return { error: diagnostic('incomplete', path, 'Finish the quantity using decimal digits.') };
  if (NEGATIVE.test(raw)) return { error: diagnostic('range', path, `Enter a whole number from 0 through ${max}.`) };
  if (!DIGITS.test(raw)) return { error: diagnostic('integer-text', path, 'Use whole-number decimal digits.') };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > max) {
    return { error: diagnostic('range', path, `Enter a whole number from 0 through ${max}.`) };
  }
  return { value };
}

export function preparePersonDraftValues(raw) {
  const rate = parseRate(raw.ratePerHour);
  const hours = parseQuantity('fundedHours', raw.fundedHours, MAX_HOURS);
  const minutes = parseQuantity('fundedMinutes', raw.fundedMinutes, MINUTES_PER_HOUR - 1);
  const errors = [rate.error, hours.error, minutes.error].filter(Boolean);
  const admitted = {};
  if (!rate.error) admitted.rateCentsPerHour = rate.value;
  if (!hours.error && !minutes.error) {
    const total = hours.value * MINUTES_PER_HOUR + minutes.value;
    if (total > LIMITS.fundedMinutes) {
      errors.push(diagnostic('range', 'draft.fundedMinutes', `Keep funded time within ${MAX_HOURS} hours and ${LIMITS.fundedMinutes % MINUTES_PER_HOUR} minutes.`));
    } else admitted.fundedMinutes = total;
  }
  return { admitted, errors };
}


const values = preparePersonDraftValues;

// The caller admits bounded raw text; creation and existing-person edits share this codec.
export function stepPersonDraftValues(raw, field, direction) {
  const stepFailure = error => ({ error });
  if (!FIELDS.includes(field)) return stepFailure(diagnostic('field', 'draft', 'Choose the hourly rate or funded-time field.'));
  const nextRaw = { ...raw };
    if (direction !== -1 && direction !== 1) return stepFailure(diagnostic('step', `draft.${field}`, 'Choose one increment or one decrement.'));
    if (field === 'ratePerHour') {
      const parsed = parseRate(nextRaw.ratePerHour);
      if (parsed.error) return stepFailure(parsed.error);
      if (parsed.value === null) return stepFailure(diagnostic('unknown-rate', 'draft.ratePerHour', 'Enter an hourly rate before adjusting it.'));
      const next = parsed.value + direction * CENTS_PER_DOLLAR;
      if (next < 0 || next > LIMITS.rateCentsPerHour) return stepFailure(diagnostic('range', 'draft.ratePerHour', `Keep the rate from $0 through $${MAX_RATE}.`));
      nextRaw.ratePerHour = rateText(next);
    } else {
      const parsed = values(nextRaw);
      const durationError = parsed.errors.find(error => error.path !== 'draft.ratePerHour');
      if (durationError) return stepFailure(durationError);
      const next = parsed.admitted.fundedMinutes + direction * (field === 'fundedHours' ? MINUTES_PER_HOUR : 1);
      if (next < 0 || next > LIMITS.fundedMinutes) return stepFailure(diagnostic('range', `draft.${field}`, `Keep funded time from zero through ${LIMITS.fundedMinutes} minutes.`));
      nextRaw.fundedHours = String(Math.floor(next / MINUTES_PER_HOUR));
      nextRaw.fundedMinutes = String(next % MINUTES_PER_HOUR);
    }
  return { raw: nextRaw };
}

// A person editor has one explicit transaction and creates no scheduled resource.
export function createPersonDraftAdapter(studio) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.updatePerson !== 'function'
      || typeof studio.previewPerson !== 'function') throw new TypeError('Supply a Studio with person editing and preview.');
  let active = null;
  let disposed = false;
  let lastError = null;

  function read() {
    const projection = studio.read();
    const isStale = active !== null && active.baseProjection !== projection;
    const parsed = active === null ? null : values(active.raw);
    const draft = active === null ? null : Object.freeze({
      token: active.token, personId: active.row.id, baseProjection: active.baseProjection,
      raw: Object.freeze({ ...active.raw }), errors: Object.freeze(parsed.errors),
      changed: parsed.errors.length > 0 || parsed.admitted.rateCentsPerHour !== active.row.rateCentsPerHour
        || parsed.admitted.fundedMinutes !== active.row.fundedMinutes,
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
    if (!active || active.token !== token) return diagnostic('draft-token', 'draft', 'Use the currently open person editor.');
    return null;
  }
  function fieldGuard(field) {
    return FIELDS.includes(field) ? null : diagnostic('field', 'draft', 'Choose the hourly rate or funded-time field.');
  }

  function begin(personId, expectedProjection) {
    if (disposed) return fail(diagnostic('disposed', 'draft', 'Create another editor to begin editing.'));
    if (active) return fail(diagnostic('draft-open', 'draft', 'Apply or cancel the open person settings first.'));
    const projection = studio.read();
    if (expectedProjection !== projection) return fail(stale());
    const row = projection.state.people.find(person => person.id === personId);
    if (!row) return fail(diagnostic('reference', 'draft.personId', 'Choose an existing person.'));
    active = { token: Object.freeze({}), row, baseProjection: projection, rawRevision: 0, preview: null,
      raw: { ratePerHour: rateText(row.rateCentsPerHour),
        fundedHours: String(Math.floor(row.fundedMinutes / MINUTES_PER_HOUR)), fundedMinutes: String(row.fundedMinutes % MINUTES_PER_HOUR) } };
    return succeed();
  }

  function setText(token, field, raw) {
    const error = guard(token) ?? fieldGuard(field);
    if (error) return fail(error);
    if (typeof raw !== 'string' || raw.length > TEXT_LIMIT) {
      return fail(diagnostic('text', `draft.${field}`, `Use at most ${TEXT_LIMIT} characters.`));
    }
    if (active.raw[field] !== raw) { active.raw[field] = raw; active.rawRevision += 1; }
    return succeed();
  }

  function step(token, field, direction) {
    const error = guard(token) ?? fieldGuard(field);
    if (error) return fail(error);
    const result = stepPersonDraftValues(active.raw, field, direction);
    if (result.error) return fail(result.error);
    active.raw = result.raw;
    active.rawRevision += 1;
    return succeed();
  }

  function validate(token) {
    const error = guard(token);
    if (error) return fail(error);
    if (active.baseProjection !== studio.read()) return fail(stale());
    const { errors } = values(active.raw);
    return errors.length ? fail(errors[0]) : succeed();
  }

  function preview(token) {
    const error = guard(token);
    if (error) return fail(error, false);
    if (active.baseProjection !== studio.read()) return fail(stale(), false);
    const { admitted, errors } = values(active.raw);
    if (errors.length) return fail(errors[0], false);
    const session = active;
    const cached = session.preview;
    if (!cached || cached.rateCentsPerHour !== admitted.rateCentsPerHour || cached.fundedMinutes !== admitted.fundedMinutes) {
      const rawRevision = session.rawRevision;
      const result = studio.previewPerson(session.row.id, { ...session.row, ...admitted }, session.baseProjection);
      const current = guard(token);
      if (current) return fail(current, false);
      if (active !== session || session.baseProjection !== studio.read()) return fail(stale(), false);
      if (session.rawRevision !== rawRevision) return fail(diagnostic('draft-changed', 'draft', 'Inspect the updated person settings.'), false);
      session.preview = { ...admitted, result };
    }
    if (!session.preview.result.ok) return fail(session.preview.result.error, false);
    return Object.freeze({ ok: true, projection: session.preview.result.projection, view: read() });
  }

  function apply(token) {
    const error = guard(token);
    if (error) return fail(error);
    if (active.baseProjection !== studio.read()) return fail(stale());
    const { admitted, errors } = values(active.raw);
    if (errors.length) return fail(errors[0]);
    const session = active;
    const rawRevision = session.rawRevision;
    const result = studio.updatePerson(session.row.id, { ...session.row, ...admitted }, session.baseProjection);
    if (!result.ok) return fail(result.error, active === session && session.rawRevision === rawRevision);
    // Preserve edits or diagnostics created synchronously during publication.
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

  return Object.freeze({ read, begin, setText, step, validate, preview, apply, cancel, dispose });
}
