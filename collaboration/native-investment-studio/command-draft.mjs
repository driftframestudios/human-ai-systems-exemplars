import { CONTRACT, LIMITS } from './config.mjs';
import { preparePersonDraftValues, stepPersonDraftValues, PERSON_DRAFT_TEXT_LIMIT } from './person-draft.mjs';
import { prepareWorkDraftValues, stepWorkDraftValues, WORK_DRAFT_TEXT_LIMIT } from './draft.mjs';
import { ROLE_CATALOGUES, CHANGE_FRAMEWORKS, CONTRIBUTION_CATEGORIES } from './roles.mjs';
import { nextCreatedLabel } from './creation-label.mjs';
import { copyWorkSession, resolveWorkSession, WORK_SESSION_FIELDS } from './work-sessions.mjs';

const IDENTIFIER = /^[a-z][a-z0-9-]*$/;
const textField = (label, maxLength = LIMITS.label) => Object.freeze({ kind: 'text', label, maxLength });
const membership = Object.freeze({ kind: 'ids', label: 'People in this team', maxItems: LIMITS.people });
const personFields = Object.freeze({ label: textField('Name'), ratePerHour: textField('Hourly rate', PERSON_DRAFT_TEXT_LIMIT),
  fundedHours: textField('Funded hours', PERSON_DRAFT_TEXT_LIMIT), fundedMinutes: textField('Funded minutes', PERSON_DRAFT_TEXT_LIMIT) });
const teamFields = Object.freeze({ label: textField('Team name'), personIds: membership });
const emptyFields = Object.freeze({});
const TARGET_FIELDS = Object.freeze({ people: 'personId', teams: 'teamId', work: 'workId', contributions: 'contributionId', connections: 'connectionId' });
export const ASSEMBLY_FORMS = Object.freeze({
  'person.create': Object.freeze({ label: 'Add person', collection: 'people', mode: 'create', fields: personFields }),
  'team.create': Object.freeze({ label: 'Add team', collection: 'teams', mode: 'create', fields: teamFields }),
  'team.update': Object.freeze({ label: 'Team settings', collection: 'teams', mode: 'update', fields: teamFields }),
  'person.remove': Object.freeze({ label: 'Remove person', collection: 'people', mode: 'remove', fields: emptyFields }),
  'team.remove': Object.freeze({ label: 'Remove team', collection: 'teams', mode: 'remove', fields: emptyFields }),
});

const sessionFields = Object.freeze({ label: textField('Session name'), teamId: textField('Team', LIMITS.identifier),
  cadencePlacements: textField('Periods for these sessions', LIMITS.cadencePlacementTextBytes),
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
  'work.session.update': Object.freeze({ label: 'Session settings', collection: 'work', mode: 'update', occurrence: true, fields: sessionFields }),
  'work.session.remove': Object.freeze({ label: 'Remove session', collection: 'work', mode: 'remove', occurrence: true, fields: emptyFields }),
});

const roleChoices = new Map(Object.entries(ROLE_CATALOGUES).map(([field, choices]) => [field, new Set(choices.map(choice => choice.id))]));
const changeChoices = new Set(CHANGE_FRAMEWORKS.flatMap(framework => framework.components.map(component => `${framework.id}:${component.id}`)));
const contributionChoices = new Set(CONTRIBUTION_CATEGORIES.map(category => category.id));
const roleFields = Object.freeze({
  functionId: textField('Function', LIMITS.identifier), seniorityId: textField('Seniority', LIMITS.identifier),
  postureId: textField('Working posture', LIMITS.identifier), enablerId: textField('Ability enabler', LIMITS.identifier),
  change: textField('Change component', 2 * LIMITS.identifier + 1),
  qualityId: textField('Quality role', LIMITS.identifier), aiId: textField('AI contribution role', LIMITS.identifier),
  decisionId: textField('Decision role', LIMITS.identifier),
});
const contributionFields = Object.freeze({
  categoryId: textField('Contribution', LIMITS.identifier),
  receiverPersonId: textField('Human receiver', LIMITS.identifier),
  decisionOwnerPersonId: textField('Who decides', LIMITS.identifier),
  workIds: Object.freeze({ kind: 'ids', label: 'Supporting sessions', maxItems: LIMITS.work }),
  reviewBoundary: textField('Review before use', LIMITS.relationshipText),
  decisionBoundary: textField('Decision boundary', LIMITS.relationshipText),
});
const connectionFields = Object.freeze({
  senderTeamId: textField('Sending team', LIMITS.identifier),
  receiverTeamId: textField('Receiving team', LIMITS.identifier),
  receiverPersonId: textField('Receiving person', LIMITS.identifier),
  sharedObject: textField('Shared object or decision', LIMITS.relationshipText),
  responseExpectation: textField('Expected response', LIMITS.relationshipText),
  workIds: Object.freeze({ kind: 'ids', label: 'Supporting sessions', maxItems: LIMITS.work }),
  status: Object.freeze({ ...textField('Status', 16), choices: Object.freeze(['active', 'paused']) }),
});
export const CONNECTION_FORMS = Object.freeze({
  'connection.create': Object.freeze({ label: 'Add connection', collection: 'connections', mode: 'create', fields: connectionFields }),
  'connection.update': Object.freeze({ label: 'Connection settings', collection: 'connections', mode: 'update', fields: connectionFields }),
  'connection.remove': Object.freeze({ label: 'Remove connection', collection: 'connections', mode: 'remove', fields: emptyFields }),
});

export const ROLE_FORMS = Object.freeze({
  'role.update': Object.freeze({ label: 'Role details', collection: 'people', mode: 'update', fields: roleFields }),
});
export const CONTRIBUTION_FORMS = Object.freeze({
  'contribution.create': Object.freeze({ label: 'Add contribution', collection: 'contributions', mode: 'create', fields: contributionFields }),
  'contribution.update': Object.freeze({ label: 'Contribution settings', collection: 'contributions', mode: 'update', fields: contributionFields }),
  'contribution.remove': Object.freeze({ label: 'Remove contribution', collection: 'contributions', mode: 'remove', fields: emptyFields }),
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
export function makeSessionTarget(form, id, occurrenceIndex) {
  const target = makeTarget(SESSION_FORMS, form, id);
  if (!SESSION_FORMS[form].occurrence) return target;
  if (!Number.isSafeInteger(occurrenceIndex) || occurrenceIndex < 0 || occurrenceIndex >= LIMITS.occurrences) {
    throw new TypeError('Choose an existing session index.');
  }
  return `${target}:${occurrenceIndex}`;
}
export function describeSessionTarget(key) {
  if (typeof key !== 'string' || key.length > 96) return null;
  const [form, id, index, ...extra] = key.split(':');
  if (!SESSION_FORMS[form]?.occurrence) return describeTarget(SESSION_FORMS, key);
  if (extra.length || !/^(0|[1-9][0-9]*)$/.test(index ?? '')) return null;
  const descriptor = describeTarget(SESSION_FORMS, `${form}:${id}`), occurrenceIndex = Number(index);
  return descriptor && occurrenceIndex < LIMITS.occurrences ? Object.freeze({ ...descriptor, occurrenceIndex }) : null;
}
export const copySessionRaw = (target, raw) => copyRaw(describeSessionTarget, target, raw);
export const sameSessionRaw = (target, left, right) => sameRaw(describeSessionTarget, target, left, right);
export const makeRoleTarget = (form, id) => makeTarget(ROLE_FORMS, form, id);
export const describeRoleTarget = key => describeTarget(ROLE_FORMS, key);
export const copyRoleRaw = (target, raw) => copyRaw(describeRoleTarget, target, raw);
export const sameRoleRaw = (target, left, right) => sameRaw(describeRoleTarget, target, left, right);
export const makeContributionTarget = (form, id) => makeTarget(CONTRIBUTION_FORMS, form, id);
export const describeContributionTarget = key => describeTarget(CONTRIBUTION_FORMS, key);
export const copyContributionRaw = (target, raw) => copyRaw(describeContributionTarget, target, raw);
export const sameContributionRaw = (target, left, right) => sameRaw(describeContributionTarget, target, left, right);

export const makeConnectionTarget = (form, id) => makeTarget(CONNECTION_FORMS, form, id);
export const describeConnectionTarget = key => describeTarget(CONNECTION_FORMS, key);
export const copyConnectionRaw = (target, raw) => copyRaw(describeConnectionTarget, target, raw);
export const sameConnectionRaw = (target, left, right) => sameRaw(describeConnectionTarget, target, left, right);

function admittedIds(candidate, maximum, field) {
  const path = `draft.${field}`;
  if (!Array.isArray(candidate) || Object.getPrototypeOf(candidate) !== Array.prototype) {
    return { error: diagnostic('collection', path, 'Choose a bounded ordered list.') };
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(candidate, 'length');
  const length = lengthDescriptor && Object.hasOwn(lengthDescriptor, 'value') ? lengthDescriptor.value : null;
  if (!Number.isSafeInteger(length) || length < 0 || length > maximum || Reflect.ownKeys(candidate).length !== length + 1) {
    return { error: diagnostic('collection', path, `Choose at most ${maximum} records in a dense list.`) };
  }
  const ids = [], seen = new Set();
  for (let index = 0; index < length; index += 1) {
    const property = Object.getOwnPropertyDescriptor(candidate, String(index));
    if (!property?.enumerable || !Object.hasOwn(property, 'value')) return { error: diagnostic('data-property', path, 'Use ordinary record ID values.') };
    const id = property.value;
    if (!validId(id)) return { error: diagnostic('text', path, 'Choose a bounded record ID.') };
    if (seen.has(id)) return { error: diagnostic('duplicate-reference', path, 'Choose each record once.') };
    seen.add(id); ids.push(id);
  }
  return { ids };
}

function initialRaw(descriptor, row, plan) {
  if (descriptor.form === 'person.create') return { label: nextCreatedLabel(plan.people, 'person'), ratePerHour: '', fundedHours: '0', fundedMinutes: '0' };
  if (descriptor.mode === 'remove') return {};
  if (descriptor.form === 'role.update') return Object.fromEntries(Object.keys(roleFields).map(field => [field,
    field === 'change' ? (row.role.change ? `${row.role.change.frameworkId}:${row.role.change.componentId}` : '') : row.role[field] ?? '']));
  if (descriptor.collection === 'contributions') return {
    categoryId: row?.categoryId ?? '', receiverPersonId: row?.receiverPersonId ?? '',
    decisionOwnerPersonId: row?.decisionOwnerPersonId ?? '', workIds: row ? [...row.workIds] : [],
    reviewBoundary: row?.reviewBoundary ?? '', decisionBoundary: row?.decisionBoundary ?? '',
  };
  if (descriptor.collection === 'connections') return {
    senderTeamId: row?.senderTeamId ?? '', receiverTeamId: row?.receiverTeamId ?? '',
    receiverPersonId: row?.receiverPersonId ?? '', sharedObject: row?.sharedObject ?? nextCreatedLabel(plan.connections, 'handoff', 'sharedObject'),
    responseExpectation: row?.responseExpectation ?? '', workIds: row ? [...row.workIds] : [], status: row?.status ?? 'active',
  };
  if (descriptor.collection === 'work') {
    const session = descriptor.occurrenceIndex === undefined ? row : resolveWorkSession(row, descriptor.occurrenceIndex);
    return { label: session?.label ?? nextCreatedLabel(plan.work, 'session'), teamId: session?.teamId ?? '',
      cadencePlacements: JSON.stringify((plan?.scoreSettings.cadence?.placements ?? []).filter(item => item.workId === descriptor.id).map(({ workId, ...item }) => item)),
      personIds: session ? [...session.personIds] : [],
      hoursPerSession: String(Math.floor((session?.minutesPerOccurrence ?? 30) / CONTRACT.minutesPerHour)),
      minutesPerSession: String((session?.minutesPerOccurrence ?? 30) % CONTRACT.minutesPerHour),
      occurrences: String(row?.occurrences ?? 1), funding: session?.funding ?? 'additional', status: session?.status ?? 'planned' };
  }
  return { label: row?.label ?? nextCreatedLabel(plan.teams, 'team'), personIds: row ? [...row.personIds] : [] };
}

function roleValues(raw, errors) {
  const role = Object.fromEntries([...roleChoices].map(([field, choices]) => {
    const value = raw[field] === '' ? null : raw[field];
    if (value !== null && !choices.has(value)) errors.push(diagnostic('choice', `draft.${field}`, `Choose a listed ${roleFields[field].label.toLowerCase()}.`));
    return [field, value];
  }));
  role.change = null;
  if (raw.change !== '') {
    if (!changeChoices.has(raw.change)) errors.push(diagnostic('choice', 'draft.change', 'Choose a listed change component.'));
    else {
      const [frameworkId, componentId] = raw.change.split(':');
      role.change = { frameworkId, componentId };
    }
  }
  return role;
}

function contributionValues(id, raw, errors) {
  if (!contributionChoices.has(raw.categoryId)) errors.push(diagnostic('choice', 'draft.categoryId', 'Choose a contribution category.'));
  const contribution = { id, categoryId: raw.categoryId, workIds: [...raw.workIds] };
  for (const field of ['receiverPersonId', 'decisionOwnerPersonId']) {
    const value = raw[field] === '' ? null : raw[field];
    if (value !== null && !validId(value)) errors.push(diagnostic('reference', `draft.${field}`, 'Choose a person or leave this unassigned.'));
    contribution[field] = value;
  }
  for (const field of ['reviewBoundary', 'decisionBoundary']) contribution[field] = raw[field].trim() || null;
  return contribution;
}

function connectionValues(id, raw, errors) {
  for (const field of ['senderTeamId', 'receiverTeamId']) {
    if (!validId(raw[field])) errors.push(diagnostic('reference', `draft.${field}`, `Choose a ${field === 'senderTeamId' ? 'sending' : 'receiving'} team.`));
  }
  const receiverPersonId = raw.receiverPersonId === '' ? null : raw.receiverPersonId;
  if (receiverPersonId !== null && !validId(receiverPersonId)) errors.push(diagnostic('reference', 'draft.receiverPersonId', 'Choose a receiving person or leave this unassigned.'));
  const sharedObject = raw.sharedObject.trim();
  if (!sharedObject) errors.push(diagnostic('relationship-text', 'draft.sharedObject', 'Name the shared object or decision.'));
  if (!connectionFields.status.choices.includes(raw.status)) errors.push(diagnostic('choice', 'draft.status', 'Choose active or paused.'));
  return { id, senderTeamId: raw.senderTeamId, receiverTeamId: raw.receiverTeamId, receiverPersonId,
    sharedObject, responseExpectation: raw.responseExpectation.trim() || null, workIds: [...raw.workIds], status: raw.status };
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
    command = { type: descriptor.form, [TARGET_FIELDS[descriptor.collection]]: descriptor.id,
      ...(descriptor.occurrenceIndex === undefined ? {} : { occurrenceIndex: descriptor.occurrenceIndex }) };
  } else if (descriptor.form === 'role.update') {
    command = { type: 'person.role.replace', personId: descriptor.id, role: roleValues(raw, errors) };
  } else if (descriptor.collection === 'contributions') {
    const contribution = contributionValues(descriptor.id, raw, errors);
    command = descriptor.mode === 'create' ? { type: descriptor.form, contribution }
      : { type: descriptor.form, contributionId: descriptor.id, contribution };
  } else if (descriptor.collection === 'connections') {
    const connection = connectionValues(descriptor.id, raw, errors);
    command = descriptor.mode === 'create' ? { type: descriptor.form, connection }
      : { type: descriptor.form, connectionId: descriptor.id, connection };
  } else if (descriptor.collection === 'work') {
    const isOccurrence = descriptor.occurrenceIndex !== undefined;
    const parsed = prepareWorkDraftValues(isOccurrence ? { ...raw, occurrences: String(session.row.occurrences) } : raw);
    errors.push(...parsed.errors);
    if (!validId(raw.teamId)) errors.push(diagnostic('reference', 'draft.teamId', 'Choose a team.'));
    if (raw.personIds.length === 0) errors.push(diagnostic('collection', 'draft.personIds', 'Choose at least one person.'));
    for (const field of ['funding', 'status']) if (!sessionFields[field].choices.includes(raw[field])) {
      errors.push(diagnostic('choice', `draft.${field}`, `Choose a listed ${field}.`));
    }
    const work = { id: descriptor.id, label, teamId: raw.teamId, personIds: [...raw.personIds], ...parsed.admitted,
      funding: raw.funding, status: raw.status, timing: session.row?.timing ?? null };
    command = isOccurrence ? { type: descriptor.form, workId: descriptor.id, occurrenceIndex: descriptor.occurrenceIndex,
      session: copyWorkSession(work) } : { type: descriptor.form, work };
    if (session.baseProjection.state.scoreSettings.cadence) {
      try {
        const placements = JSON.parse(raw.cadencePlacements || '[]');
        if (isOccurrence) {
          const selected = Array.isArray(placements) ? placements.filter(item => item?.occurrenceIndex === descriptor.occurrenceIndex) : null;
          if (!selected || selected.length > 1) errors.push(diagnostic('cadence', 'draft.cadencePlacements', 'Choose one period for this session.'));
          else command.placement = selected.length ? { periodId: selected[0].periodId, subdivision: selected[0].subdivision } : null;
        } else command.placements = Array.isArray(placements) ? placements.filter(item =>
          !Number.isSafeInteger(item?.occurrenceIndex) || item.occurrenceIndex < work.occurrences) : placements;
      }
      catch { errors.push(diagnostic('cadence', 'draft.cadencePlacements', 'Choose periods for these sessions.')); }
    }
  } else {
    const team = { id: descriptor.id, label, personIds: [...raw.personIds] };
    command = descriptor.mode === 'create' ? { type: descriptor.form, team }
      : { type: descriptor.form, teamId: descriptor.id, team };
  }
  return { command, errors };
}

function changedRow(session, command) {
  const row = session.row;
  if (session.descriptor.form === 'role.update') {
    const role = command.role;
    return [...roleChoices.keys()].some(field => role[field] !== row.role[field])
      || role.change?.frameworkId !== row.role.change?.frameworkId || role.change?.componentId !== row.role.change?.componentId;
  }
  if (session.descriptor.collection === 'contributions') return Object.keys(contributionFields).some(field => field === 'workIds'
    ? !sameIds(command.contribution.workIds, row.workIds) : command.contribution[field] !== row[field]);
  if (session.descriptor.collection === 'connections') return Object.keys(connectionFields).some(field => field === 'workIds'
    ? !sameIds(command.connection.workIds, row.workIds) : command.connection[field] !== row[field]);
  if (session.descriptor.collection !== 'work') return command.team.label !== row.label || !sameIds(command.team.personIds, row.personIds);
  if (session.descriptor.occurrenceIndex !== undefined) {
    const occurrence = resolveWorkSession(row, session.descriptor.occurrenceIndex);
    const placement = session.baseProjection.state.scoreSettings.cadence?.placements.find(item =>
      item.workId === row.id && item.occurrenceIndex === session.descriptor.occurrenceIndex);
    return WORK_SESSION_FIELDS.some(field => field === 'personIds'
      ? !sameIds(command.session.personIds, occurrence.personIds) : command.session[field] !== occurrence[field])
      || (command.placement !== undefined && ((command.placement?.periodId ?? null) !== (placement?.periodId ?? null)
        || (command.placement?.subdivision ?? null) !== (placement?.subdivision ?? null)));
  }
  const work = command.work;
  const placements = (session.baseProjection.state.scoreSettings.cadence?.placements ?? []).filter(item => item.workId === row.id).map(({ workId, ...item }) => item);
  return work.label !== row.label || work.teamId !== row.teamId || !sameIds(work.personIds, row.personIds)
    || work.minutesPerOccurrence !== row.minutesPerOccurrence || work.occurrences !== row.occurrences
    || work.funding !== row.funding || work.status !== row.status
    || (command.placements !== undefined && JSON.stringify(command.placements) !== JSON.stringify(placements));
}

// A finite form owns one explicit draft. The Studio owns command admission,
// accounting, dependency diagnostics and accepted publication.
const FAMILIES = Object.freeze({
  assembly: Object.freeze({ id: 'assemblyId', describe: describeAssemblyTarget, copy: copyAssemblyRaw }),
  session: Object.freeze({ id: 'sessionId', describe: describeSessionTarget, copy: copySessionRaw }),
  role: Object.freeze({ id: 'roleId', describe: describeRoleTarget, copy: copyRoleRaw }),
  contribution: Object.freeze({ id: 'contributionId', describe: describeContributionTarget, copy: copyContributionRaw }),
  connection: Object.freeze({ id: 'connectionId', describe: describeConnectionTarget, copy: copyConnectionRaw }),
});
export const createAssemblyDraftAdapter = studio => createFormDraftAdapter(studio, FAMILIES.assembly);
export const createSessionDraftAdapter = studio => createFormDraftAdapter(studio, FAMILIES.session);
export const createRoleDraftAdapter = studio => createFormDraftAdapter(studio, FAMILIES.role);
export const createContributionDraftAdapter = studio => createFormDraftAdapter(studio, FAMILIES.contribution);
export const createConnectionDraftAdapter = studio => createFormDraftAdapter(studio, FAMILIES.connection);

function createFormDraftAdapter(studio, family) {
  if (!studio || typeof studio.read !== 'function' || typeof studio.previewCommand !== 'function'
    || typeof studio.applyCommand !== 'function') throw new TypeError('Supply a Studio with assembly commands.');
  if (family === FAMILIES.session && (typeof studio.previewWork !== 'function' || typeof studio.updateWork !== 'function')) {
    throw new TypeError('Supply a Studio with session editing.');
  }
  let active = null, disposed = false, lastError = null;

  function publish(session, command, preview) {
    if (session.descriptor.form === 'work.update' && command.placements === undefined) {
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
      ...(active.descriptor.occurrenceIndex === undefined ? {} : { occurrenceIndex: active.descriptor.occurrenceIndex }),
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
    if (descriptor.occurrenceIndex !== undefined && !resolveWorkSession(row, descriptor.occurrenceIndex)) {
      return fail(diagnostic('reference', 'draft', 'Choose an existing session in this plan.'));
    }
    active = { target, descriptor, row, baseProjection: projection, token: Object.freeze({}),
      raw: initialRaw(descriptor, row, projection.state), rawRevision: 0, preview: null };
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
    if (metadata?.kind !== 'ids') return fail(diagnostic('field', 'draft', 'Choose an ordered-selection field in this form.'));
    const parsed = admittedIds(candidate, metadata.maxItems, field);
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
