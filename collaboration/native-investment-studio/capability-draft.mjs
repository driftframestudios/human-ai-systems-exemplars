import { LIMITS } from './config.mjs';
import { listCapabilityVersions } from './capabilities.mjs';
import { prepareCapabilityProposal, applyCapabilityProposal } from './capability-proposals.mjs';
import { prepareWorkDraftValues, stepWorkDraftValues, WORK_DRAFT_TEXT_LIMIT } from './draft.mjs';
import { showcaseCapabilityDefaults } from './presets.mjs';

const identifier = /^[a-z][a-z0-9-]*$/;
const validId = value => typeof value === 'string' && value.length <= LIMITS.identifier && identifier.test(value);
const text = (label, maxLength = LIMITS.relationshipText, extra = {}) => Object.freeze({ kind: 'text', label, maxLength, ...extra });
const ids = (label, source, maxItems) => Object.freeze({ kind: 'ids', label, source, maxItems });
const choice = (label, choices) => text(label, 32, { choices: Object.freeze(choices) });
const diagnostic = (code, path, message) => Object.freeze({ code, path, message });
const stale = () => diagnostic('stale-edit', 'draft', 'Review the saved entries against the current plan.');
const equalIds = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);
const nullable = value => value.trim() || null;
export const CAPABILITY_EVIDENCE_STAGES = Object.freeze(['proposed', 'supported', 'rehearsed', 'observed-in-context']);

export function capabilityForm(kind, mode, definitionId, version = '1.0.0') {
  return `${kind}.${mode}.${definitionId}@${version}`;
}
function fieldsFor(definition) {
  const fields = {
    context: text('Where people will use this'),
    teamId: text('Responsible team', LIMITS.identifier, { source: 'teams' }),
    responsiblePersonIds: ids('People responsible for the work', 'people', LIMITS.people),
    decisionOwnerPersonId: text('Person who decides', LIMITS.identifier, { source: 'people' }),
    lifecycle: choice('Plan status', ['active', 'retired']),
    prerequisites: ids('Abilities or practices this depends on', 'capabilities', 512),
  };
  for (const requirement of definition.supportRequirements) {
    const prefix = `new.${requirement.id}.`;
    fields[`support.${requirement.id}`] = ids('Use existing working sessions', 'work', LIMITS.work);
    fields[prefix + 'enabled'] = choice('Add a working session with this proposal', ['no', 'yes']);
    fields[prefix + 'label'] = text('Session name', LIMITS.label);
    fields[prefix + 'teamId'] = text('Session team', LIMITS.identifier, { source: 'teams' });
    fields[prefix + 'personIds'] = ids('People in this session', 'people', LIMITS.people);
    fields[prefix + 'hoursPerSession'] = text('Hours', WORK_DRAFT_TEXT_LIMIT, { numeric: true });
    fields[prefix + 'minutesPerSession'] = text('Minutes', WORK_DRAFT_TEXT_LIMIT, { numeric: true });
    fields[prefix + 'occurrences'] = text('Working sessions', WORK_DRAFT_TEXT_LIMIT, { numeric: true });
    fields[prefix + 'funding'] = choice('Funding', ['allocated', 'additional']);
  }
  Object.assign(fields, {
    evidenceStage: choice('Record an observation', ['', ...CAPABILITY_EVIDENCE_STAGES]),
    evidenceContext: text('Observation context'), evidenceObservation: text('What was observed'),
    evidenceRecorder: text('Recorded by', LIMITS.identifier, { source: 'people' }),
    evidenceReviewBoundary: text('Where this observation applies'),
  });
  return Object.freeze(fields);
}
const forms = {};
for (const kind of ['ability', 'practice']) for (const definition of listCapabilityVersions(kind)) {
  const fields = fieldsFor(definition);
  for (const mode of ['create', 'update', 'remove']) {
    if (mode === 'create' && definition.retired) continue;
    forms[capabilityForm(kind, mode, definition.id, definition.version)] = Object.freeze({
      label: definition.action, kind, collection: kind === 'ability' ? 'abilities' : 'practices', mode,
      definition, fields: mode === 'remove' ? Object.freeze({}) : fields,
    });
  }
}
export const CAPABILITY_FORMS = Object.freeze(forms);
export function makeCapabilityTarget(form, id) {
  if (!Object.hasOwn(CAPABILITY_FORMS, form) || !validId(id)) throw new TypeError('Choose an exact capability form and bounded instance ID.');
  return `${form}:${id}`;
}
export function describeCapabilityTarget(target) {
  if (typeof target !== 'string' || target.length > 256) return null;
  const colon = target.indexOf(':'), form = target.slice(0, colon), id = target.slice(colon + 1);
  return colon > 0 && Object.hasOwn(CAPABILITY_FORMS, form) && validId(id)
    ? Object.freeze({ ...CAPABILITY_FORMS[form], form, id }) : null;
}
export function copyCapabilityRaw(target, raw) {
  return Object.freeze(Object.fromEntries(Object.keys(describeCapabilityTarget(target).fields)
    .map(key => [key, Array.isArray(raw[key]) ? Object.freeze([...raw[key]]) : raw[key]])));
}
export function sameCapabilityRaw(target, left, right) {
  return Object.entries(describeCapabilityTarget(target).fields).every(([key, field]) => field.kind === 'ids'
    ? equalIds(left[key], right[key]) : left[key] === right[key]);
}
function startingRaw(descriptor, row) {
  const raw = Object.fromEntries(Object.entries(descriptor.fields).map(([key, field]) => [key, field.kind === 'ids' ? [] : '']));
  if (descriptor.mode === 'remove') return raw;
  Object.assign(raw, { context: row?.context ?? (descriptor.mode === 'create' ? descriptor.definition.explanation : ''), teamId: row?.teamId ?? '',
    responsiblePersonIds: [...(row?.responsiblePersonIds ?? [])], decisionOwnerPersonId: row?.decisionOwnerPersonId ?? '',
    lifecycle: row?.lifecycle ?? 'active', prerequisites: (row?.prerequisites ?? []).map(ref => `${ref.kind}/${ref.instanceId}`) });
  for (const requirement of descriptor.definition.supportRequirements) {
    const prefix = `new.${requirement.id}.`, minutes = requirement.estimate.minutesPerOccurrence;
    raw[`support.${requirement.id}`] = [...(row?.supportBindings.find(binding => binding.requirementId === requirement.id)?.workIds ?? [])];
    Object.assign(raw, { [prefix + 'enabled']: 'no', [prefix + 'label']: requirement.label,
      [prefix + 'hoursPerSession']: String(Math.floor(minutes / 60)), [prefix + 'minutesPerSession']: String(minutes % 60),
      [prefix + 'occurrences']: String(requirement.estimate.occurrences), [prefix + 'funding']: 'allocated' });
  }
  return raw;
}
function values(session) {
  const { descriptor: d, raw, baseProjection: base } = session, errors = [];
  if (d.mode === 'remove') return { request: { mode: 'remove', kind: d.kind, instanceId: d.id }, errors };
  for (const [key, metadata] of Object.entries(d.fields)) {
    if (key.startsWith('new.') && !key.endsWith('.enabled') && raw[key.slice(0, key.lastIndexOf('.') + 1) + 'enabled'] !== 'yes') continue;
    if (metadata.choices && !metadata.choices.includes(raw[key])) errors.push(diagnostic('choice', `draft.${key}`, 'Choose one of the listed values.'));
  }
  const usedWork = new Set(base.state.work.map(row => row.id));
  const newWork = [], supportBindings = d.definition.supportRequirements.map((requirement, index) => {
    const workIds = [...raw[`support.${requirement.id}`]], prefix = `new.${requirement.id}.`;
    if (raw[prefix + 'enabled'] === 'yes') {
      const duration = prepareWorkDraftValues({ hoursPerSession: raw[prefix + 'hoursPerSession'],
        minutesPerSession: raw[prefix + 'minutesPerSession'], occurrences: raw[prefix + 'occurrences'] });
      errors.push(...duration.errors.map(error => diagnostic(error.code, `draft.${prefix}${error.path.slice(6)}`, error.message)));
      const workIdPrefix = `${d.id.slice(0, 44)}-support-${index + 1}`;
      let id = workIdPrefix, suffix = 2;
      while (usedWork.has(id)) id = `${workIdPrefix}-${suffix++}`;
      usedWork.add(id);
      workIds.push(id);
      if (!duration.errors.length) newWork.push({ id, label: raw[prefix + 'label'].trim(), teamId: nullable(raw[prefix + 'teamId']),
        personIds: [...raw[prefix + 'personIds']], ...duration.admitted, funding: raw[prefix + 'funding'],
        status: 'planned', timing: null, lifecycle: 'active' });
    }
    return { requirementId: requirement.id, workIds };
  });
  const instance = { id: d.id, definitionId: d.definition.id, definitionVersion: d.definition.version,
    context: nullable(raw.context), teamId: nullable(raw.teamId), responsiblePersonIds: [...raw.responsiblePersonIds],
    decisionOwnerPersonId: nullable(raw.decisionOwnerPersonId), lifecycle: raw.lifecycle,
    prerequisites: raw.prerequisites.map(ref => { const [kind, instanceId] = ref.split('/'); return { kind, instanceId }; }), supportBindings };
  const evidence = [];
  if (raw.evidenceStage) {
    const used = new Set(base.state.capabilityEvidence.map(row => row.id));
    let number = 1, id;
    do { id = `${d.id.slice(0, 40)}-evidence-${number++}`; } while (used.has(id));
    evidence.push({ id, subject: { kind: d.kind, instanceId: d.id }, stage: raw.evidenceStage,
      context: raw.evidenceContext.trim(), observation: raw.evidenceObservation.trim(), recorderPersonId: raw.evidenceRecorder,
      reviewBoundary: raw.evidenceReviewBoundary.trim(), observedPlanRevision: base.state.revision });
  }
  return { request: { mode: d.mode, kind: d.kind, instance, newWork, evidence }, errors };
}

// This adapter owns bounded raw fields and one cached proposal. The shared
// coordinator owns leases/saved slots; the proposal and Studio own acceptance.
export function createCapabilityDraftAdapter(studio) {
  let active = null, disposed = false, lastError = null;
  function read() {
    const projection = studio.read(), isStale = active && active.baseProjection !== projection;
    const parsed = active ? values(active) : null;
    return Object.freeze({ status: disposed ? 'disposed' : isStale ? 'stale' : active ? 'editing' : 'idle',
      projection, pending: false, creationConflict: Boolean(active?.descriptor.mode === 'create'
        && projection.state[active.descriptor.collection].some(row => row.id === active.descriptor.id)),
      draft: active ? Object.freeze({ token: active.token, capabilityId: active.target, form: active.descriptor.form,
        targetId: active.descriptor.id, raw: copyCapabilityRaw(active.target, active.raw), errors: Object.freeze(parsed.errors),
        changed: active.descriptor.mode !== 'update' || !sameCapabilityRaw(active.target, active.raw, active.initialRaw) }) : null,
      error: lastError ?? (isStale ? stale() : null) });
  }
  function fail(error, retain = true) {
    if (retain && !['draft-token', 'disposed'].includes(error.code)) lastError = error;
    return Object.freeze({ ok: false, error, view: read() });
  }
  function succeed(extra = {}) { lastError = null; return Object.freeze({ ok: true, ...extra, view: read() }); }
  function guard(token) { return disposed ? diagnostic('disposed', 'draft', 'Open another Studio to edit.')
    : !active || active.token !== token ? diagnostic('draft-token', 'draft', 'Use the currently open capability editor.') : null; }
  function begin(target, expected) {
    if (disposed) return fail(diagnostic('disposed', 'draft', 'Open another Studio to edit.'));
    if (active) return fail(diagnostic('draft-open', 'draft', 'Apply or cancel the open edit first.'));
    if (expected !== studio.read()) return fail(stale());
    const descriptor = describeCapabilityTarget(target);
    if (!descriptor) return fail(diagnostic('target', 'draft', 'Choose an exact capability definition.'));
    const row = expected.state[descriptor.collection].find(item => item.id === descriptor.id);
    if (descriptor.mode === 'create' && row) return fail(diagnostic('creation-conflict', 'draft', 'Use these entries for a new instance.'));
    if (descriptor.mode !== 'create' && (!row || row.definitionId !== descriptor.definition.id || row.definitionVersion !== descriptor.definition.version))
      return fail(diagnostic('reference', 'draft', 'Choose this definition in the current plan.'));
    const defaults = descriptor.mode === 'create' ? showcaseCapabilityDefaults(expected.state, descriptor.definition) : null;
    const raw = startingRaw(descriptor, row ?? defaults);
    active = { target, descriptor, baseProjection: expected, token: Object.freeze({}), raw,
      initialRaw: copyCapabilityRaw(target, raw), rawRevision: 0, preview: null };
    return succeed();
  }
  function setText(token, field, raw) {
    const error = guard(token); if (error) return fail(error);
    const metadata = Object.hasOwn(active.descriptor.fields, field) ? active.descriptor.fields[field] : null;
    if (metadata?.kind !== 'text') return fail(diagnostic('field', 'draft', 'Choose a text field in this form.'));
    if (typeof raw !== 'string' || raw.length > metadata.maxLength) return fail(diagnostic('text', `draft.${field}`, `Use at most ${metadata.maxLength} characters.`));
    if (active.raw[field] !== raw) { active.raw[field] = raw; active.rawRevision += 1; }
    return succeed();
  }
  function setIds(token, field, input) {
    const error = guard(token); if (error) return fail(error);
    const session = active, revision = session.rawRevision;
    const metadata = Object.hasOwn(session.descriptor.fields, field) ? session.descriptor.fields[field] : null;
    if (metadata?.kind !== 'ids') return fail(diagnostic('field', 'draft', 'Choose a list in this form.'));
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype || input.length > metadata.maxItems
        || Reflect.ownKeys(input).length !== input.length + 1) return fail(diagnostic('collection', `draft.${field}`, 'Choose a bounded dense list.'));
    const owned = [], seen = new Set();
    for (let index = 0; index < input.length; index += 1) {
      const property = Object.getOwnPropertyDescriptor(input, String(index));
      if (!property?.enumerable || !Object.hasOwn(property, 'value')) return fail(diagnostic('data-property', `draft.${field}`, 'Choose ordinary record IDs.'));
      const id = property.value, valid = metadata.source === 'capabilities'
        ? typeof id === 'string' && /^(ability|practice)\//.test(id) && validId(id.slice(id.indexOf('/') + 1)) : validId(id);
      if (!valid || seen.has(id)) return fail(diagnostic('reference', `draft.${field}`, 'Choose each valid record once.'));
      seen.add(id); owned.push(id);
    }
    const current = guard(token); if (current) return fail(current, false);
    if (active !== session || session.rawRevision !== revision) return fail(diagnostic('draft-changed', 'draft', 'Review the newer selection.'), false);
    if (!equalIds(session.raw[field], owned)) { session.raw[field] = owned; session.rawRevision += 1; }
    return succeed();
  }
  function step(token, field, direction) {
    const error = guard(token); if (error) return fail(error);
    const metadata = active.descriptor.fields[field];
    if (!metadata?.numeric) return fail(diagnostic('field', 'draft', 'Choose a duration or session count.'));
    const split = field.lastIndexOf('.'), prefix = field.slice(0, split + 1), key = field.slice(split + 1);
    const raw = Object.fromEntries(['hoursPerSession', 'minutesPerSession', 'occurrences'].map(name => [name, active.raw[prefix + name]]));
    const next = stepWorkDraftValues(raw, key, direction);
    if (next.error) return fail(diagnostic(next.error.code, `draft.${field}`, next.error.message));
    for (const name of Object.keys(raw)) active.raw[prefix + name] = next.raw[name];
    active.rawRevision += 1; return succeed();
  }
  function prepare(token) {
    const error = guard(token); if (error) return { error };
    const session = active, revision = session.rawRevision;
    if (session.baseProjection !== studio.read()) return { error: stale() };
    const parsed = values(session);
    if (parsed.errors.length) return { error: parsed.errors[0] };
    if (!session.preview || session.preview.revision !== revision) {
      try { session.preview = { revision, proposal: prepareCapabilityProposal(session.baseProjection, parsed.request) }; }
      catch (cause) {
        if (!cause?.code || typeof cause.message !== 'string') throw cause;
        return { error: Object.freeze({ code: cause.code, path: cause.path, message: cause.message,
          ...(cause.references ? { references: cause.references } : {}) }) };
      }
    }
    if (active !== session || session.rawRevision !== revision || disposed) return { error: diagnostic('draft-changed', 'draft', 'Review the newer edit.') };
    if (session.baseProjection !== studio.read()) return { error: stale() };
    return { session, proposal: session.preview.proposal };
  }
  function preview(token) { const result = prepare(token); return result.error ? fail(result.error, false)
    : succeed({ projection: result.proposal.projection, summary: result.proposal.summary }); }
  function validate(token) { const result = prepare(token); return result.error ? fail(result.error) : succeed(); }
  function apply(token) {
    const result = prepare(token); if (result.error) return fail(result.error);
    const applied = applyCapabilityProposal(studio, result.proposal);
    if (!applied.ok) return fail(applied.error);
    if (active === result.session) active = null;
    return succeed({ projection: applied.projection, summary: result.proposal.summary });
  }
  function cancel(token) { const error = guard(token); if (error) return fail(error); active = null; return succeed(); }
  function dispose() { disposed = true; active = null; return succeed(); }
  return Object.freeze({ read, begin, setText, setIds, step, preview, validate, apply, cancel, dispose });
}
