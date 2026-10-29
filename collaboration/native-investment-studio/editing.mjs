import { createWorkDraftAdapter } from './draft.mjs';
import { createPersonDraftAdapter } from './person-draft.mjs';
import { createPurposeDraftAdapter } from './purpose-draft.mjs';
import { createAssemblyDraftAdapter, ASSEMBLY_FORMS, makeAssemblyTarget, describeAssemblyTarget, copyAssemblyRaw, sameAssemblyRaw,
  createSessionDraftAdapter, SESSION_FORMS, makeSessionTarget, describeSessionTarget, copySessionRaw, sameSessionRaw } from './command-draft.mjs';
import { PURPOSE_FIELDS, LIMITS } from './config.mjs';

export const EDITING_LIMITS = Object.freeze({ drafts: 8 });
const indexRows = rows => new Map(rows.map(row => [row.id, row]));
const TYPES = Object.freeze({
  work: Object.freeze({ id: 'workId', index: state => indexRows(state.work), step: true,
    fields: Object.freeze(['hoursPerSession', 'minutesPerSession', 'occurrences']),
    create: studio => createWorkDraftAdapter(studio, null, { durationFormat: 'hours-minutes' }) }),
  person: Object.freeze({ id: 'personId', index: state => indexRows(state.people), step: true,
    fields: Object.freeze(['ratePerHour', 'fundedHours', 'fundedMinutes']),
    create: createPersonDraftAdapter }),
  purpose: Object.freeze({ id: 'purposeId', index: state => new Map([['purpose', state.purpose]]),
    fields: PURPOSE_FIELDS, create: createPurposeDraftAdapter }),
  assembly: Object.freeze({ id: 'assemblyId', step: true, ids: true,
    index: state => new Map(['people', 'teams'].flatMap(collection => state[collection].map(row => [`${collection}:${row.id}`, row]))),
    create: createAssemblyDraftAdapter, forms: ASSEMBLY_FORMS, make: makeAssemblyTarget,
    describe: describeAssemblyTarget, copy: copyAssemblyRaw, same: sameAssemblyRaw }),
  session: Object.freeze({ id: 'sessionId', step: true, ids: true,
    index: state => new Map(state.work.map(row => [`work:${row.id}`, row])),
    create: createSessionDraftAdapter, forms: SESSION_FORMS, make: makeSessionTarget,
    describe: describeSessionTarget, copy: copySessionRaw, same: sameSessionRaw }),
});
const KINDS = Object.freeze(Object.keys(TYPES));
const EMPTY_ERRORS = Object.freeze([]);
const ID_PREFIXES = Object.freeze({ people: 'person', teams: 'team', work: 'work' });
const INSTANCES = new WeakMap();
const diagnostic = (code, message) => Object.freeze({ code, path: 'draft', message });
const sameAcceptance = (a, b) => a.instance === b.instance && a.token === b.token;
const keyFor = (kind, targetId) => `${kind}:${targetId}`;
const fieldsFor = (kind, targetId) => TYPES[kind].describe ? Object.keys(TYPES[kind].describe(targetId).fields) : TYPES[kind].fields;
const sameRaw = (kind, targetId, left, right) => TYPES[kind].same ? TYPES[kind].same(targetId, left, right)
  : fieldsFor(kind, targetId).every(field => left[field] === right[field]);
const copyRaw = (kind, targetId, raw) => TYPES[kind].copy ? TYPES[kind].copy(targetId, raw) : Object.freeze({ ...raw });

// One instance owns the active typed adapter. Saved edits contain bounded text
// and a tiny acceptance marker; they retain neither projections nor resources.
export function createDraftCoordinator(studio, { limit = EDITING_LIMITS.drafts } = {}) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.readAcceptance !== 'function'
    || typeof studio.updateWork !== 'function' || typeof studio.previewWork !== 'function'
    || typeof studio.updatePerson !== 'function' || typeof studio.previewPerson !== 'function'
    || typeof studio.updatePurpose !== 'function' || typeof studio.previewPurpose !== 'function'
    || typeof studio.applyCommand !== 'function' || typeof studio.previewCommand !== 'function') {
    throw new TypeError('Supply one Studio with accepted chronology and person, work, and purpose editing.');
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
  const selected = Object.fromEntries(KINDS.map(kind => [kind, null]));
  const errors = Object.fromEntries(KINDS.map(kind => [kind, null]));
  let active = null;
  let disposed = false;
  let settling = false;
  let intent = Symbol('draft-intent');
  let indexedProjection = null;
  let indexes = null;

  function rows(projection) {
    if (projection !== indexedProjection) {
      indexes = Object.fromEntries(KINDS.map(kind => [kind, TYPES[kind].index(projection.state)]));
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

  function targetExists(kind, targetId, projection) {
    if (!TYPES[kind].describe) return rows(projection)[kind].has(targetId);
    const descriptor = TYPES[kind].describe(targetId);
    return Boolean(descriptor && (descriptor.mode === 'create' || rows(projection)[kind].has(`${descriptor.collection}:${descriptor.id}`)));
  }

  function creationConflict(kind, targetId, projection) {
    if (!TYPES[kind].describe) return false;
    const descriptor = TYPES[kind].describe(targetId);
    return Boolean(descriptor?.mode === 'create' && rows(projection)[kind].has(`${descriptor.collection}:${descriptor.id}`));
  }

  function snapshotRecord(record, projection, current) {
    return Object.freeze({ ...record,
      status: sameAcceptance(record.baseAcceptance, current) ? 'parked' : 'stale',
      targetExists: targetExists(record.kind, record.targetId, projection),
      ...(TYPES[record.kind].describe ? { creationConflict: creationConflict(record.kind, record.targetId, projection) } : {}),
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
    const descriptor = TYPES[kind].describe?.(record.targetId) ?? null;
    return Object.freeze({ status: summary.status, projection, pending: false,
      draft: Object.freeze({ token: record.token, [TYPES[kind].id]: record.targetId, raw: record.raw,
        ...(descriptor ? { form: descriptor.form, targetId: descriptor.id } : {}),
        baseAcceptance: record.baseAcceptance, changed: true, errors: EMPTY_ERRORS }),
      ...(descriptor ? { creationConflict: summary.creationConflict } : {}),
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
    return view.draft && !sameRaw(session.kind, session.targetId, view.draft.raw, session.initialRaw);
  }

  function saveActive() {
    if (!active) return null;
    const session = active;
    const view = session.adapter.read();
    const retain = ownsRaw(session, view);
    const record = retain ? Object.freeze({ kind: session.kind, targetId: session.targetId,
      token: Symbol('saved-edit'), raw: copyRaw(session.kind, session.targetId, view.draft.raw), baseAcceptance: session.baseAcceptance }) : null;
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

  function open(kind, targetId, expected, mode = 'resume', token = null, source = null, insideSettlement = false) {
    const unavailableError = (insideSettlement ? (disposed ? diagnostic('disposed', 'Open another Studio to edit.') : null) : unavailable()) ?? currentPlan(expected);
    if (unavailableError) return fail(kind, unavailableError);
    if (typeof targetId !== 'string') return fail(kind, diagnostic('reference', 'Choose a record in the current plan.'));
    const key = keyFor(kind, targetId);
    const existing = parked.get(key);
    // A saved removed form target remains selectable for inspection and
    // discard. Review and Apply still require a current resolvable target.
    const savedForm = TYPES[kind].describe && mode === 'resume' && existing;
    if (!targetExists(kind, targetId, expected) && !savedForm) {
      return fail(kind, diagnostic('reference', 'Choose a record in the current plan.'));
    }
    const same = active?.kind === kind && active.targetId === targetId;
    if (mode !== 'resume' && mode !== 'fresh' && (same ? active.token !== token : existing?.token !== token)) {
      return fail(kind, diagnostic('draft-token', 'Choose the saved edit currently shown.'));
    }
    if (same && mode === 'resume') return succeed(kind);
    const activeView = active?.adapter.read();
    const retainedActive = active && ownsRaw(active, activeView) ? 1 : 0;
    const replacedSlot = source && (parked.has(source.key) || (active?.kind === kind && active.targetId === source.targetId && retainedActive)) ? 1 : 0;
    // The active editor reserves a parking place. Opening another target is the
    // only capacity decision; changing chapter can always release its resources.
    if (!same && !existing && parked.size + retainedActive - replacedSlot >= limit) {
      return fail(kind, diagnostic('draft-limit', `${limit} edits are held. Review or discard one before opening another.`));
    }
    settling = true;
    try {
      const previousRaw = mode === 'fresh' ? source.raw : mode === 'review' ? (same ? activeView.draft.raw : existing.raw) : null;
      const cleanup = saveActive();
      if (cleanup) return fail(kind, cleanup);
      if (disposed) return fail(kind, diagnostic('disposed', 'Open another Studio to edit.'));
      const freshness = currentPlan(expected);
      if (freshness) return fail(kind, freshness);
      if (mode !== 'fresh') selected[kind] = targetId;
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
        const formFields = TYPES[kind].describe?.(targetId).fields;
        if (raw) for (const field of fieldsFor(kind, targetId)) {
          const method = formFields?.[field].kind === 'ids' ? 'setIds' : 'setText';
          const result = adapter[method](opened.view.draft.token, field, raw[field]);
          if (!result.ok) { adapter.dispose(); return fail(kind, result.error); }
        }
        if (disposed || currentPlan(expected)) {
          adapter.dispose();
          return fail(kind, diagnostic(disposed ? 'disposed' : 'stale-edit', 'Read the current plan before reopening this edit.'));
        }
        active = { kind, targetId, token: Symbol('active-edit'), adapter,
          typedToken: opened.view.draft.token, baseAcceptance: marker, initialRaw };
        parked.delete(key);
        if (source) parked.delete(source.key);
        selected[kind] = targetId;
        if (mode !== 'resume') intent = Symbol('draft-intent');
        return succeed(kind);
      } catch (error) { adapter.dispose(); throw error; }
    } finally { if (!insideSettlement) settling = false; }
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
      } else if (['setText', 'setIds', 'step'].includes(operation)) {
        const after = session.adapter.read().draft.raw;
        if (!sameRaw(kind, session.targetId, before, after)) intent = Symbol('draft-intent');
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

  function allocatedTarget(kind, form, expected) {
    const forms = TYPES[kind].forms;
    const profile = typeof form === 'string' && Object.hasOwn(forms, form) ? forms[form] : null;
    if (profile?.mode !== 'create') return { error: diagnostic('target', 'Choose a supported creation form.') };
    if (expected.state[profile.collection].length >= LIMITS[profile.collection]) return { error: diagnostic('collection', 'This collection is full. Remove a record before adding another.') };
    const used = new Set(expected.state[profile.collection].map(row => row.id));
    for (const record of parked.values()) {
      const descriptor = TYPES[record.kind].describe?.(record.targetId) ?? null;
      if (descriptor?.collection === profile.collection && descriptor.mode === 'create') used.add(descriptor.id);
    }
    const current = active ? TYPES[active.kind].describe?.(active.targetId) ?? null : null;
    if (current?.collection === profile.collection && current.mode === 'create') used.add(current.id);
    const prefix = ID_PREFIXES[profile.collection];
    // At most collection cap + eight held drafts occupy this finite namespace.
    for (let index = 1; index <= LIMITS[profile.collection] + limit + 1; index += 1) {
      const id = `${prefix}-${index}`;
      if (!used.has(id)) return { target: TYPES[kind].make(form, id) };
    }
    return { error: diagnostic('target', 'Review the held creation drafts before adding another.') };
  }

  function create(kind, form, expected) {
    const error = unavailable() ?? currentPlan(expected);
    if (error) return fail(kind, error);
    const allocated = allocatedTarget(kind, form, expected);
    return allocated.error ? fail(kind, allocated.error) : open(kind, allocated.target, expected);
  }

  function freshId(kind, token, expected) {
    const error = unavailable();
    if (error) return fail(kind, error);
    settling = true;
    try {
      const freshness = currentPlan(expected);
      if (freshness) return fail(kind, freshness);
      if (disposed) return fail(kind, diagnostic('disposed', 'Open another Studio to edit.'));
      const session = active?.kind === kind && active.token === token ? active : null;
      const record = saved(kind);
      if (!session && record?.token !== token) return fail(kind, diagnostic('draft-token', 'Choose the creation draft currently shown.'));
      const targetId = session?.targetId ?? record.targetId;
      const descriptor = TYPES[kind].describe(targetId);
      if (descriptor.mode !== 'create') return fail(kind, diagnostic('target', 'Choose a supported creation draft.'));
      const view = session?.adapter.read();
      if (disposed || (session && (active !== session || !view.draft))) return fail(kind, diagnostic('draft-token', 'This creation edit has closed.'), false);
      const raw = copyRaw(kind, targetId, session ? view.draft.raw : record.raw);
      const allocated = allocatedTarget(kind, descriptor.form, expected);
      if (allocated.error) return fail(kind, allocated.error);
      return open(kind, allocated.target, expected, 'fresh', token, { targetId, key: keyFor(kind, targetId), raw }, true);
    } finally { settling = false; }
  }

  function dispose() {
    if (disposed) return read();
    disposed = true;
    const previous = active;
    active = null;
    parked.clear();
    for (const kind of KINDS) { selected[kind] = null; errors[kind] = null; }
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
      ...(TYPES[kind].ids ? { setIds: (token, field, ids) => operate(kind, token, 'setIds', [field, ids]) } : {}),
      ...(TYPES[kind].step ? { step: (token, field, direction) => operate(kind, token, 'step', [field, direction]) } : {}),
      validate: token => operate(kind, token, 'validate'),
      preview: token => operate(kind, token, 'preview'),
      apply: token => operate(kind, token, 'apply'),
      cancel: token => cancel(kind, token),
      review: (token, expected) => recover(kind, token, expected, 'review'),
      useCurrent: (token, expected) => recover(kind, token, expected, 'current'),
      ...(TYPES[kind].forms ? { create: (form, expected) => create(kind, form, expected), freshId: (token, expected) => freshId(kind, token, expected) } : {}),
    });
  }
  const coordinator = Object.freeze({ ...Object.fromEntries(KINDS.map(kind => [kind, port(kind)])), park, discard, read, dispose });
  INSTANCES.set(studio, coordinator);
  return coordinator;
}
