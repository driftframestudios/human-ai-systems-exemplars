import { createWorkDraftAdapter } from './draft.mjs';
import { createPersonDraftAdapter } from './person-draft.mjs';

export const EDITING_LIMITS = Object.freeze({ drafts: 8 });
const TYPES = Object.freeze({
  work: Object.freeze({ id: 'workId', collection: 'work', fields: Object.freeze(['hoursPerSession', 'minutesPerSession', 'occurrences']),
    create: studio => createWorkDraftAdapter(studio, null, { durationFormat: 'hours-minutes' }) }),
  person: Object.freeze({ id: 'personId', collection: 'people', fields: Object.freeze(['ratePerHour', 'fundedHours', 'fundedMinutes']),
    create: createPersonDraftAdapter }),
});
const EMPTY_ERRORS = Object.freeze([]);
const INSTANCES = new WeakMap();
const diagnostic = (code, message) => Object.freeze({ code, path: 'draft', message });
const sameAcceptance = (a, b) => a.instance === b.instance && a.token === b.token;
const keyFor = (kind, targetId) => `${kind}:${targetId}`;

// One instance owns the active typed adapter. Saved edits contain bounded text
// and a tiny acceptance marker; they retain neither projections nor resources.
export function createDraftCoordinator(studio, { limit = EDITING_LIMITS.drafts } = {}) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.readAcceptance !== 'function'
    || typeof studio.updateWork !== 'function' || typeof studio.previewWork !== 'function'
    || typeof studio.updatePerson !== 'function' || typeof studio.previewPerson !== 'function') {
    throw new TypeError('Supply one Studio with accepted chronology and person/work editing.');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > EDITING_LIMITS.drafts) {
    throw new TypeError(`Choose a draft limit from 1 through ${EDITING_LIMITS.drafts}.`);
  }
  const existing = INSTANCES.get(studio);
  if (existing) {
    if (existing.read().limit !== limit) throw new TypeError('Keep the existing Studio draft limit.');
    return existing;
  }
  const parked = new Map();
  const selected = { work: null, person: null };
  const errors = { work: null, person: null };
  let active = null;
  let disposed = false;
  let settling = false;
  let intent = Symbol('draft-intent');
  let indexedProjection = null;
  let indexes = null;

  function rows(projection) {
    if (projection !== indexedProjection) {
      indexes = Object.fromEntries(Object.entries(TYPES).map(([kind, type]) => [kind,
        new Map(projection.state[type.collection].map(row => [row.id, row]))]));
      indexedProjection = projection;
    }
    return indexes;
  }

  function acceptance() {
    const { instance, token, sequence } = studio.readAcceptance();
    return Object.freeze({ instance, token, sequence });
  }

  function saved(kind) {
    return selected[kind] === null ? null : parked.get(keyFor(kind, selected[kind])) ?? null;
  }

  function snapshotRecord(record, projection, current) {
    return Object.freeze({ ...record,
      status: sameAcceptance(record.baseAcceptance, current) ? 'parked' : 'stale',
      targetExists: rows(projection)[record.kind].has(record.targetId),
    });
  }

  function readPort(kind) {
    const projection = studio.read();
    if (disposed) return Object.freeze({ status: 'disposed', projection, draft: null, pending: false, error: null });
    if (active?.kind === kind) {
      const view = active.adapter.read();
      return Object.freeze({ ...view,
        draft: view.draft ? Object.freeze({ ...view.draft, token: active.token }) : null,
        error: errors[kind] ?? view.error,
      });
    }
    const record = saved(kind);
    if (!record) return Object.freeze({ status: 'idle', projection, draft: null, pending: false, error: errors[kind] });
    const summary = snapshotRecord(record, projection, studio.readAcceptance());
    return Object.freeze({ status: summary.status, projection, pending: false,
      draft: Object.freeze({ token: record.token, [TYPES[kind].id]: record.targetId, raw: record.raw,
        baseAcceptance: record.baseAcceptance, changed: true, errors: EMPTY_ERRORS }),
      error: errors[kind] ?? (summary.status === 'stale'
        ? diagnostic('review-required', 'The plan changed. Review the saved edit or use the current values.') : null),
    });
  }

  function read() {
    const projection = studio.read(), current = studio.readAcceptance();
    return Object.freeze({ disposed, limit, slots: parked.size + (active ? 1 : 0), intent,
      active: active ? Object.freeze({ kind: active.kind, targetId: active.targetId, token: active.token }) : null,
      selected: Object.freeze({ ...selected }),
      parked: Object.freeze([...parked.values()].map(record => snapshotRecord(record, projection, current))),
    });
  }

  function fail(kind, error, retain = true) {
    if (retain && !['draft-token', 'disposed', 'settling'].includes(error.code)) errors[kind] = error;
    return Object.freeze({ ok: false, error, view: readPort(kind) });
  }
  function succeed(kind) { errors[kind] = null; return Object.freeze({ ok: true, view: readPort(kind) }); }
  function unavailable() {
    return disposed ? diagnostic('disposed', 'Open another Studio to edit.')
      : settling ? diagnostic('settling', 'Finish the current editing action, then try again.') : null;
  }
  function guard(kind, token) {
    return unavailable() ?? (active?.kind !== kind || active.token !== token
      ? diagnostic('draft-token', 'Use the currently open edit.') : null);
  }
  function currentPlan(expected) {
    return expected !== studio.read() ? diagnostic('stale-edit', 'The plan changed. Review the current values.') : null;
  }
  function ownsRaw(session, view) {
    return view.draft && TYPES[session.kind].fields.some(field => view.draft.raw[field] !== session.initialRaw[field]);
  }

  function saveActive() {
    if (!active) return null;
    const session = active;
    const view = session.adapter.read();
    const retain = ownsRaw(session, view);
    const record = retain ? Object.freeze({ kind: session.kind, targetId: session.targetId,
      token: Symbol('saved-edit'), raw: Object.freeze({ ...view.draft.raw }), baseAcceptance: session.baseAcceptance }) : null;
    // Revoke the lease before releasing the adapter. Its former token can never
    // address a replacement session, including during cleanup callbacks.
    active = null;
    if (record) parked.set(keyFor(session.kind, session.targetId), record);
    const released = session.adapter.dispose();
    return released?.ok === false ? released.error : null;
  }

  function park() {
    const error = unavailable();
    if (error) return Object.freeze({ ok: false, error, view: read() });
    settling = true;
    try {
      const cleanup = saveActive();
      return Object.freeze({ ok: !cleanup, ...(cleanup ? { error: cleanup } : {}), view: read() });
    } finally { settling = false; }
  }

  function open(kind, targetId, expected, mode = 'resume', token = null) {
    const unavailableError = unavailable() ?? currentPlan(expected);
    if (unavailableError) return fail(kind, unavailableError);
    if (typeof targetId !== 'string' || !rows(expected)[kind].has(targetId)) {
      return fail(kind, diagnostic('reference', 'Choose a record in the current plan.'));
    }
    const key = keyFor(kind, targetId);
    const existing = parked.get(key);
    const same = active?.kind === kind && active.targetId === targetId;
    if (mode !== 'resume' && (same ? active.token !== token : existing?.token !== token)) {
      return fail(kind, diagnostic('draft-token', 'Choose the saved edit currently shown.'));
    }
    if (same && mode === 'resume') return succeed(kind);
    const activeView = active?.adapter.read();
    const retainedActive = active && ownsRaw(active, activeView) ? 1 : 0;
    // The active editor reserves a parking place. Opening another target is the
    // only capacity decision; changing chapter can always release its resources.
    if (!same && !existing && parked.size + retainedActive >= limit) {
      return fail(kind, diagnostic('draft-limit', `${limit} edits are held. Review or discard one before opening another.`));
    }
    settling = true;
    try {
      const previousRaw = mode === 'review' ? (same ? activeView.draft.raw : existing.raw) : null;
      const cleanup = saveActive();
      if (cleanup) return fail(kind, cleanup);
      if (disposed) return fail(kind, diagnostic('disposed', 'Open another Studio to edit.'));
      const freshness = currentPlan(expected);
      if (freshness) return fail(kind, freshness);
      selected[kind] = targetId;
      const record = parked.get(key);
      const marker = acceptance();
      if (mode === 'resume' && record && !sameAcceptance(record.baseAcceptance, marker)) {
        return fail(kind, diagnostic('review-required', 'The plan changed. Review the saved edit or use the current values.'));
      }
      const adapter = TYPES[kind].create(studio);
      let opened;
      try {
        opened = adapter.begin(targetId, expected);
        if (!opened.ok) { adapter.dispose(); return fail(kind, opened.error); }
        const initialRaw = opened.view.draft.raw;
        const raw = mode === 'current' ? null : previousRaw ?? record?.raw;
        if (raw) for (const field of TYPES[kind].fields) {
          const result = adapter.setText(opened.view.draft.token, field, raw[field]);
          if (!result.ok) { adapter.dispose(); return fail(kind, result.error); }
        }
        if (disposed || currentPlan(expected)) {
          adapter.dispose();
          return fail(kind, diagnostic(disposed ? 'disposed' : 'stale-edit', 'Read the current plan before reopening this edit.'));
        }
        active = { kind, targetId, token: Symbol('active-edit'), adapter,
          typedToken: opened.view.draft.token, baseAcceptance: marker, initialRaw };
        parked.delete(key);
        if (mode !== 'resume') intent = Symbol('draft-intent');
        return succeed(kind);
      } catch (error) { adapter.dispose(); throw error; }
    } finally { settling = false; }
  }

  function operate(kind, token, operation, args = []) {
    const error = guard(kind, token);
    if (error) return fail(kind, error);
    const session = active;
    const before = session.adapter.read().draft?.raw;
    settling = true;
    try {
      const result = session.adapter[operation](session.typedToken, ...args);
      if (disposed || active !== session) return fail(kind, diagnostic('draft-token', 'This edit has closed.'), false);
      if (!result.ok) return fail(kind, result.error, operation !== 'preview');
      if (operation === 'apply') {
        active = null;
        session.adapter.dispose();
        intent = Symbol('draft-intent');
      } else if (['setText', 'step'].includes(operation)) {
        const after = session.adapter.read().draft.raw;
        if (TYPES[kind].fields.some(field => before[field] !== after[field])) intent = Symbol('draft-intent');
      }
      const view = succeed(kind).view;
      return Object.freeze({ ...result, view });
    } finally { settling = false; }
  }

  function recover(kind, token, expected, mode) {
    const error = unavailable() ?? currentPlan(expected);
    if (error) return fail(kind, error);
    const record = saved(kind);
    const target = active?.kind === kind && active.token === token ? active.targetId
      : record?.token === token ? record.targetId : null;
    if (target === null) return fail(kind, diagnostic('draft-token', 'Choose the saved edit currently shown.'));
    return open(kind, target, expected, mode, token);
  }

  function cancel(kind, token) {
    const error = unavailable();
    if (error) return fail(kind, error);
    const session = active?.kind === kind && active.token === token ? active : null;
    const record = saved(kind);
    if (!session && record?.token !== token) return fail(kind, diagnostic('draft-token', 'Choose the edit currently shown.'));
    settling = true;
    try {
      if (session) { active = null; session.adapter.dispose(); }
      else parked.delete(keyFor(kind, record.targetId));
      intent = Symbol('draft-intent');
      return succeed(kind);
    } finally { settling = false; }
  }

  function discard(token) {
    const error = unavailable();
    if (error) return Object.freeze({ ok: false, error, view: read() });
    // At most eight entries makes a token lookup bounded while one Map retains
    // both storage and deletion authority. Removed targets retain this route.
    for (const [key, record] of parked) {
      if (record.token !== token) continue;
      parked.delete(key);
      intent = Symbol('draft-intent');
      return Object.freeze({ ok: true, view: read() });
    }
    return Object.freeze({ ok: false,
      error: diagnostic('draft-token', 'Choose a saved edit currently held by this Studio.'), view: read() });
  }

  function dispose() {
    if (disposed) return read();
    disposed = true;
    const previous = active;
    active = null;
    parked.clear();
    selected.work = null;
    selected.person = null;
    indexedProjection = null;
    indexes = null;
    intent = Symbol('draft-intent');
    INSTANCES.delete(studio);
    previous?.adapter.dispose();
    return read();
  }

  function port(kind) {
    return Object.freeze({
      read: () => readPort(kind),
      begin: (targetId, expected) => open(kind, targetId, expected),
      setText: (token, field, raw) => operate(kind, token, 'setText', [field, raw]),
      step: (token, field, direction) => operate(kind, token, 'step', [field, direction]),
      validate: token => operate(kind, token, 'validate'),
      preview: token => operate(kind, token, 'preview'),
      apply: token => operate(kind, token, 'apply'),
      cancel: token => cancel(kind, token),
      review: (token, expected) => recover(kind, token, expected, 'review'),
      useCurrent: (token, expected) => recover(kind, token, expected, 'current'),
    });
  }
  const coordinator = Object.freeze({ work: port('work'), person: port('person'), park, discard, read, dispose });
  INSTANCES.set(studio, coordinator);
  return coordinator;
}
