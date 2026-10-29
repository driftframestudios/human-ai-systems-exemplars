import { CONTRACT, LIMITS } from './config.mjs';
import { preparePersonDraftValues, stepPersonDraftValues, PERSON_DRAFT_TEXT_LIMIT } from './person-draft.mjs';
import { prepareWorkDraftValues, stepWorkDraftValues, WORK_DRAFT_TEXT_LIMIT } from './draft.mjs';

const IDENTIFIER = /^[a-z][a-z0-9-]*$/;
const textField = (label, maxLength = LIMITS.label) => Object.freeze({ kind: 'text', label, maxLength });
const membership = Object.freeze({ kind: 'ids', label: 'People in this team', maxItems: LIMITS.people });
const personFields = Object.freeze({ label: textField('Name'), ratePerHour: textField('Hourly rate', PERSON_DRAFT_TEXT_LIMIT),
  fundedHours: textField('Funded hours', PERSON_DRAFT_TEXT_LIMIT), fundedMinutes: textField('Funded minutes', PERSON_DRAFT_TEXT_LIMIT) });
const teamFields = Object.freeze({ label: textField('Team name'), personIds: membership });
const emptyFields = Object.freeze({});
const TARGET_FIELDS = Object.freeze({ people: 'personId', teams: 'teamId', work: 'workId' });
export const ASSEMBLY_FORMS = Object.freeze({
  'person.create': Object.freeze({ label: 'Add person', collection: 'people', mode: 'create', fields: personFields }),
  'team.create': Object.freeze({ label: 'Add team', collection: 'teams', mode: 'create', fields: teamFields }),
  'team.update': Object.freeze({ label: 'Team settings', collection: 'teams', mode: 'update', fields: teamFields }),
  'person.remove': Object.freeze({ label: 'Remove person', collection: 'people', mode: 'remove', fields: emptyFields }),
  'team.remove': Object.freeze({ label: 'Remove team', collection: 'teams', mode: 'remove', fields: emptyFields }),
});

const sessionFields = Object.freeze({ label: textField('Session name'), teamId: textField('Team', LIMITS.identifier),
  personIds: Object.freeze({ ...membership, label: 'People in this session' }),
  hoursPerSession: textField('Hours per session', WORK_DRAFT_TEXT_LIMIT),
  minutesPerSession: textField('Minutes per session', WORK_DRAFT_TEXT_LIMIT),
  occurrences: textField('Working sessions', WORK_DRAFT_TEXT_LIMIT),
  funding: Object.freeze({ ...textField('Funding', 16), choices: Object.freeze(['additional', 'allocated']) }),
  status: Object.freeze({ ...textField('Status', 16), choices: Object.freeze(['planned', 'paused']) }) });
export const SESSION_FORMS = Object.freeze({
  'work.create': Object.freeze({ label: 'Add session', collection: 'work', mode: 'create', fields: sessionFields }),
  'work.update': Object.freeze({ label: 'Session settings', collection: 'work', mode: 'update', fields: sessionFields }),
  'work.remove': Object.freeze({ label: 'Remove session', collection: 'work', mode: 'remove', fields: emptyFields }),
});

const diagnostic = (code, path, message) => Object.freeze({ code, path, message });
const stale = () => diagnostic('stale-edit', 'draft', 'Review the saved edit against the current plan.');
const validId = id => typeof id === 'string' && id.length <= LIMITS.identifier && IDENTIFIER.test(id);
const sameIds = (left, right) => left.length === right.length && left.every((id, index) => id === right[index]);

function makeTarget(forms, form, id) {
  if (typeof form !== 'string' || !Object.hasOwn(forms, form) || !validId(id)) {
    throw new TypeError('Choose a supported form and a bounded record ID.');
  }
  return `${form}:${id}`;
}

function describeTarget(forms, key) {
  if (typeof key !== 'string' || key.length > 96) return null;
  const separator = key.indexOf(':');
  const form = key.slice(0, separator), id = key.slice(separator + 1);
  if (separator < 0 || !Object.hasOwn(forms, form) || !validId(id)) return null;
  const profile = forms[form];
  return Object.freeze({ form, id, collection: profile.collection, mode: profile.mode, fields: profile.fields });
}

// Coordinator snapshots call these helpers only with adapter-owned raw values.
function copyRaw(describe, target, raw) {
  const descriptor = describe(target);
  return Object.freeze(Object.fromEntries(Object.keys(descriptor.fields).map(field => [field,
    Array.isArray(raw[field]) ? Object.freeze([...raw[field]]) : raw[field]])));
}

function sameRaw(describe, target, left, right) {
  const descriptor = describe(target);
  return Object.keys(descriptor.fields).every(field => descriptor.fields[field].kind === 'ids'
    ? sameIds(left[field], right[field]) : left[field] === right[field]);
}

export const makeAssemblyTarget = (form, id) => makeTarget(ASSEMBLY_FORMS, form, id);
export const describeAssemblyTarget = key => describeTarget(ASSEMBLY_FORMS, key);
export const copyAssemblyRaw = (target, raw) => copyRaw(describeAssemblyTarget, target, raw);
export const sameAssemblyRaw = (target, left, right) => sameRaw(describeAssemblyTarget, target, left, right);
export const makeSessionTarget = (form, id) => makeTarget(SESSION_FORMS, form, id);
export const describeSessionTarget = key => describeTarget(SESSION_FORMS, key);
export const copySessionRaw = (target, raw) => copyRaw(describeSessionTarget, target, raw);
export const sameSessionRaw = (target, left, right) => sameRaw(describeSessionTarget, target, left, right);

function admittedIds(candidate, maximum) {
  const path = 'draft.personIds';
  if (!Array.isArray(candidate) || Object.getPrototypeOf(candidate) !== Array.prototype) {
    return { error: diagnostic('collection', path, 'Choose a bounded ordered list of people.') };
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(candidate, 'length');
  const length = lengthDescriptor && Object.hasOwn(lengthDescriptor, 'value') ? lengthDescriptor.value : null;
  if (!Number.isSafeInteger(length) || length < 0 || length > maximum || Reflect.ownKeys(candidate).length !== length + 1) {
    return { error: diagnostic('collection', path, `Choose at most ${maximum} people in a dense list.`) };
  }
  const ids = [], seen = new Set();
  for (let index = 0; index < length; index += 1) {
    const property = Object.getOwnPropertyDescriptor(candidate, String(index));
    if (!property?.enumerable || !Object.hasOwn(property, 'value')) return { error: diagnostic('data-property', path, 'Use ordinary person ID values.') };
    const id = property.value;
    if (!validId(id)) return { error: diagnostic('text', path, 'Choose a bounded person ID.') };
    if (seen.has(id)) return { error: diagnostic('duplicate-reference', path, 'Choose each person once.') };
    seen.add(id); ids.push(id);
  }
  return { ids };
}

function initialRaw(descriptor, row) {
  if (descriptor.form === 'person.create') return { label: '', ratePerHour: '', fundedHours: '0', fundedMinutes: '0' };
  if (descriptor.mode === 'remove') return {};
  if (descriptor.collection === 'work') return { label: row?.label ?? '', teamId: row?.teamId ?? '',
    personIds: row ? [...row.personIds] : [],
    hoursPerSession: String(Math.floor((row?.minutesPerOccurrence ?? 30) / CONTRACT.minutesPerHour)),
    minutesPerSession: String((row?.minutesPerOccurrence ?? 30) % CONTRACT.minutesPerHour),
    occurrences: String(row?.occurrences ?? 1), funding: row?.funding ?? 'additional', status: row?.status ?? 'planned' };
  return { label: row?.label ?? '', personIds: row ? [...row.personIds] : [] };
}

function values(session) {
  const { descriptor, raw } = session;
  const errors = [];
  const label = Object.hasOwn(raw, 'label') ? raw.label.trim() : null;
  if (label === '') errors.push(diagnostic('label', 'draft.label', 'Enter a name.'));
  let command;
  if (descriptor.form === 'person.create') {
    const parsed = preparePersonDraftValues(raw);
    errors.push(...parsed.errors);
    command = { type: descriptor.form, person: { id: descriptor.id, label, ...parsed.admitted } };
  } else if (descriptor.mode === 'remove') {
    command = { type: descriptor.form, [TARGET_FIELDS[descriptor.collection]]: descriptor.id };
  } else if (descriptor.collection === 'work') {
    const parsed = prepareWorkDraftValues(raw);
    errors.push(...parsed.errors);
    if (!validId(raw.teamId)) errors.push(diagnostic('reference', 'draft.teamId', 'Choose a team.'));
    if (raw.personIds.length === 0) errors.push(diagnostic('collection', 'draft.personIds', 'Choose at least one person.'));
    for (const field of ['funding', 'status']) if (!sessionFields[field].choices.includes(raw[field])) {
      errors.push(diagnostic('choice', `draft.${field}`, `Choose a listed ${field}.`));
    }
    const work = { id: descriptor.id, label, teamId: raw.teamId, personIds: [...raw.personIds], ...parsed.admitted,
      funding: raw.funding, status: raw.status, timing: session.row?.timing ?? null };
    command = { type: descriptor.form, work };
  } else {
    const team = { id: descriptor.id, label, personIds: [...raw.personIds] };
    command = descriptor.mode === 'create' ? { type: descriptor.form, team }
      : { type: descriptor.form, teamId: descriptor.id, team };
  }
  return { command, errors };
}

function changedRow(session, command) {
  const row = session.row;
  if (session.descriptor.collection !== 'work') return command.team.label !== row.label || !sameIds(command.team.personIds, row.personIds);
  const work = command.work;
  return work.label !== row.label || work.teamId !== row.teamId || !sameIds(work.personIds, row.personIds)
    || work.minutesPerOccurrence !== row.minutesPerOccurrence || work.occurrences !== row.occurrences
    || work.funding !== row.funding || work.status !== row.status;
}

// A finite form owns one explicit draft. The Studio owns command admission,
// accounting, dependency diagnostics and accepted publication.
const FAMILIES = Object.freeze({
  assembly: Object.freeze({ id: 'assemblyId', describe: describeAssemblyTarget, copy: copyAssemblyRaw }),
  session: Object.freeze({ id: 'sessionId', describe: describeSessionTarget, copy: copySessionRaw }),
});
export const createAssemblyDraftAdapter = studio => createFormDraftAdapter(studio, FAMILIES.assembly);
export const createSessionDraftAdapter = studio => createFormDraftAdapter(studio, FAMILIES.session);

function createFormDraftAdapter(studio, family) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.previewCommand !== 'function'
    || typeof studio.applyCommand !== 'function') throw new TypeError('Supply a Studio with assembly commands.');
  if (family === FAMILIES.session && (typeof studio.previewWork !== 'function' || typeof studio.updateWork !== 'function')) {
    throw new TypeError('Supply a Studio with session editing.');
  }
  let active = null, disposed = false, lastError = null;

  function publish(session, command, preview) {
    if (session.descriptor.form === 'work.update') {
      return studio[preview ? 'previewWork' : 'updateWork'](session.descriptor.id, command.work, session.baseProjection);
    }
    return studio[preview ? 'previewCommand' : 'applyCommand'](command, session.baseProjection);
  }
  function read() {
    const projection = studio.read();
    const isStale = active !== null && active.baseProjection !== projection;
    const parsed = active ? values(active) : null;
    const creationConflict = Boolean(active?.descriptor.mode === 'create'
      && projection.state[active.descriptor.collection].some(row => row.id === active.descriptor.id));
    const changed = active && (active.descriptor.mode !== 'update' || parsed.errors.length > 0
      || changedRow(active, parsed.command));
    const draft = active ? Object.freeze({ token: active.token, [family.id]: active.target,
      form: active.descriptor.form, targetId: active.descriptor.id, baseProjection: active.baseProjection,
      raw: family.copy(active.target, active.raw), errors: Object.freeze(parsed.errors), changed: Boolean(changed) }) : null;
    return Object.freeze({ status: disposed ? 'disposed' : isStale ? 'stale' : active ? 'editing' : 'idle',
      projection, draft, pending: false, creationConflict, error: lastError ?? (isStale ? stale() : null) });
  }
  function fail(error, retain = true) {
    if (retain && !['draft-token', 'disposed'].includes(error.code)) lastError = error;
    return Object.freeze({ ok: false, error, view: read() });
  }
  function succeed(extra = {}) { lastError = null; return Object.freeze({ ok: true, ...extra, view: read() }); }
  function guard(token) {
    return disposed ? diagnostic('disposed', 'draft', 'Open another editor to make changes.')
      : !active || active.token !== token ? diagnostic('draft-token', 'draft', 'Use the currently open edit.') : null;
  }
  function owns(session, revision) { return active === session && session.rawRevision === revision; }

  function begin(target, expected) {
    if (disposed) return fail(diagnostic('disposed', 'draft', 'Open another editor to make changes.'));
    if (active) return fail(diagnostic('draft-open', 'draft', 'Apply or cancel the open edit first.'));
    const projection = studio.read();
    if (expected !== projection) return fail(stale());
    const descriptor = family.describe(target);
    if (!descriptor) return fail(diagnostic('target', 'draft', 'Choose a supported form.'));
    const row = projection.state[descriptor.collection].find(item => item.id === descriptor.id);
    if (descriptor.mode === 'create' && row) return fail(diagnostic('creation-conflict', 'draft', 'This record is already in the plan. Use these entries to create another.'));
    if (descriptor.mode !== 'create' && !row) return fail(diagnostic('reference', 'draft', 'Choose a record in the current plan.'));
    active = { target, descriptor, row, baseProjection: projection, token: Object.freeze({}),
      raw: initialRaw(descriptor, row), rawRevision: 0, preview: null };
    return succeed();
  }

  function setText(token, field, raw) {
    const error = guard(token);
    if (error) return fail(error);
    const metadata = typeof field === 'string' && Object.hasOwn(active.descriptor.fields, field) ? active.descriptor.fields[field] : null;
    if (metadata?.kind !== 'text') return fail(diagnostic('field', 'draft', 'Choose a text field in this form.'));
    if (typeof raw !== 'string' || raw.length > metadata.maxLength) return fail(diagnostic('text', `draft.${field}`, `Use at most ${metadata.maxLength} characters.`));
    if (active.raw[field] !== raw) { active.raw[field] = raw; active.rawRevision += 1; }
    return succeed();
  }

  function setIds(token, field, candidate) {
    const error = guard(token);
    if (error) return fail(error);
    const session = active, revision = session.rawRevision;
    const metadata = typeof field === 'string' && Object.hasOwn(session.descriptor.fields, field) ? session.descriptor.fields[field] : null;
    if (metadata?.kind !== 'ids') return fail(diagnostic('field', 'draft', 'Choose a people-selection field in this form.'));
    const parsed = admittedIds(candidate, metadata.maxItems);
    const current = guard(token);
    if (current) return fail(current, false);
    if (!owns(session, revision)) return fail(diagnostic('draft-changed', 'draft', 'Inspect the newer edit before changing this selection.'), false);
    if (parsed.error) return fail(parsed.error);
    if (!sameIds(session.raw[field], parsed.ids)) { session.raw[field] = parsed.ids; session.rawRevision += 1; }
    return succeed();
  }

  function step(token, field, direction) {
    const error = guard(token);
    if (error) return fail(error);
    const numeric = active.descriptor.collection === 'work' && active.descriptor.mode !== 'remove'
      ? stepWorkDraftValues : active.descriptor.form === 'person.create' ? stepPersonDraftValues : null;
    if (!numeric) return fail(diagnostic('field', 'draft', 'Choose a numeric field.'));
    const result = numeric(active.raw, field, direction);
    if (result.error) return fail(result.error);
    active.raw = result.raw; active.rawRevision += 1;
    return succeed();
  }

  function validate(token) {
    const error = guard(token);
    if (error) return fail(error);
    if (active.baseProjection !== studio.read()) return fail(stale());
    const parsed = values(active);
    return parsed.errors.length ? fail(parsed.errors[0]) : succeed();
  }

  function preview(token) {
    const error = guard(token);
    if (error) return fail(error, false);
    const session = active, revision = session.rawRevision;
    if (session.baseProjection !== studio.read()) return fail(stale(), false);
    const parsed = values(session);
    if (parsed.errors.length) return fail(parsed.errors[0], false);
    if (!session.preview || session.preview.revision !== revision) {
      const result = publish(session, parsed.command, true);
      const current = guard(token);
      if (current) return fail(current, false);
      if (!owns(session, revision)) return fail(diagnostic('draft-changed', 'draft', 'Inspect the newer edit.'), false);
      if (session.baseProjection !== studio.read()) return fail(stale(), false);
      session.preview = { revision, result };
    }
    const result = session.preview.result;
    return result.ok ? Object.freeze({ ok: true, projection: result.projection, view: read() }) : fail(result.error, false);
  }

  function apply(token) {
    const error = guard(token);
    if (error) return fail(error);
    const session = active, revision = session.rawRevision;
    if (session.baseProjection !== studio.read()) return fail(stale());
    const parsed = values(session);
    if (parsed.errors.length) return fail(parsed.errors[0]);
    const result = publish(session, parsed.command, false);
    if (!result.ok) return fail(result.error, owns(session, revision));
    if (!owns(session, revision)) return Object.freeze({ ok: true, projection: result.projection, view: read() });
    active = null;
    return succeed({ projection: result.projection });
  }
  function cancel(token) {
    const error = guard(token);
    if (error) return fail(error);
    active = null; return succeed();
  }
  function dispose() { disposed = true; active = null; return succeed(); }
  return Object.freeze({ read, begin, setText, setIds, step, validate, preview, apply, cancel, dispose });
}
