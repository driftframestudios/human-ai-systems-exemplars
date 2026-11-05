import { LIMITS } from './config.mjs';
import { listQualityConcepts, createAssuranceSettings } from './assurance-models.mjs';
import { prepareAssuranceProposal, applyAssuranceProposal } from './assurance-proposals.mjs';
import { prepareWorkDraftValues, stepWorkDraftValues, WORK_DRAFT_TEXT_LIMIT } from './draft.mjs';

const text = (label, extra = {}) => Object.freeze({ kind: 'text', label, maxLength: LIMITS.relationshipText, ...extra });
const ids = (label, source, maxItems) => Object.freeze({ kind: 'ids', label, source, maxItems });
const numeric = (label, min, max, extra = {}) => text(label, { numeric: true, min, max, maxLength: WORK_DRAFT_TEXT_LIMIT, ...extra });
const yesno = label => text(label, { checkbox: true, choices: ['yes', 'no'] });
const fields = {
  sourcePresetId: text('Illustrative source scenario'), horizonQuantity: numeric('Reference horizon quantity', 1, 1000, { optional: true }),
  horizonUnit: text('Reference horizon unit', { choices: ['hours', 'sprints', 'quarters'] }),
  namedUnknowns: numeric('Named unknowns', 0, 20), recoveryRatePersonIds: ids('People whose rates inform the recovery illustration', 'people', LIMITS.people),
  qualityIncluded: yesno('Include the quality illustration'), allocationPercent: numeric('Quality allocation percent', 0, 100),
  independentRate: text('Independent quality rate per hour', { decimal: true, maxLength: WORK_DRAFT_TEXT_LIMIT }),
  sigmaHalfSteps: numeric('Sigma attention in half steps', 2, 12), qualityAdditionalPercent: text('Additional quality share percent', { decimal: true, maxLength: WORK_DRAFT_TEXT_LIMIT }),
  recoveryAdditionalPercent: text('Additional recovery share percent', { decimal: true, maxLength: WORK_DRAFT_TEXT_LIMIT }),
  eventIds: ids('Recovery event order', null, LIMITS.recoveryEvents), learningIds: ids('Learning action order', null, LIMITS.learningActions),
  rehearsalIds: ids('Rehearsal order', null, LIMITS.rehearsals), connectionUpdateIds: ids('Connections to change', 'connections', LIMITS.connections),
  'proposal.mode': text('Session proposal', { choices: ['none', 'new', 'update'] }),
  'proposal.target': text('Supporting purpose', { maxLength: 150 }),
  'proposal.existingWorkId': text('Session to adjust', { source: 'work', maxLength: LIMITS.identifier }),
  'proposal.label': text('Session name', { maxLength: LIMITS.label }),
  'proposal.teamId': text('Session team', { source: 'teams', maxLength: LIMITS.identifier }),
  'proposal.personIds': ids('People in this session', 'people', LIMITS.people),
  'proposal.hoursPerSession': numeric('Hours', 0, 24),
  'proposal.minutesPerSession': numeric('Minutes', 0, 59),
  'proposal.occurrences': numeric('Working sessions', 0, LIMITS.occurrences),
  'proposal.funding': text('Funding', { choices: ['allocated', 'additional'] }),
};
for (const concept of listQualityConcepts()) {
  fields[`concept.${concept.id}.included`] = yesno('Include this quality concept');
  fields[`concept.${concept.id}.workIds`] = ids('Supporting sessions', 'work', LIMITS.work);
}
export const ASSURANCE_FIELDS = Object.freeze(fields);
const common = {
  context: text('Context and expected result'), reviewBoundary: text('What the reviewer will check'),
  workIds: ids('Supporting sessions', 'work', LIMITS.work),
};
const records = {
  event: { label: text('Recovery event', { maxLength: LIMITS.label }), included: yesno('Include this event in the illustration'),
    lifecycle: text('Event state', { choices: ['active', 'retired'] }), eventCount: numeric('Expected events', 0, 1000),
    aggregateMinutesPerEvent: numeric('Aggregate person-minutes per event', 0, 60000),
    receiverPersonId: text('Person receiving the recovery', { source: 'people', maxLength: LIMITS.identifier }), reviewBoundary: common.reviewBoundary, workIds: common.workIds },
  learning: { promptId: text('Learning prompt', { maxLength: LIMITS.identifier }), ...common,
    decisionOwnerPersonId: text('Person deciding the next action', { source: 'people', maxLength: LIMITS.identifier }) },
  rehearsal: { definitionId: text('Complication', { maxLength: LIMITS.identifier }), definitionVersion: text('Definition version', { maxLength: LIMITS.identifier }),
    context: common.context, assumptions: text('Assumptions to try'), response: text('Proposed response'),
    reviewerPersonId: text('Person reviewing the rehearsal', { source: 'people', maxLength: LIMITS.identifier }),
    observedPlanRevision: numeric('Plan revision observed', 0, LIMITS.revision), observation: text('Observed result'), workIds: common.workIds,
    connectionIds: ids('Connections involved', 'connections', LIMITS.connections), personIds: ids('People involved', 'people', LIMITS.people) },
  connection: { status: text('Proposed connection status', { choices: ['active', 'paused'] }) },
};
const validId = value => typeof value === 'string' && value.length <= LIMITS.identifier && /^[a-z][a-z0-9-]*$/.test(value);
export function assuranceField(key) {
  if (typeof key !== 'string') return null;
  if (Object.hasOwn(ASSURANCE_FIELDS, key)) return ASSURANCE_FIELDS[key];
  const [kind, id, name, extra] = key.split('.');
  return !extra && validId(id) && Object.hasOwn(records, kind) && Object.hasOwn(records[kind], name) ? records[kind][name] : null;
}
const equalIds = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);
const diagnostic = (code, path, message) => Object.freeze({ code, path, message });
const stale = () => diagnostic('stale-edit', 'draft', 'Review the saved quality and recovery settings against the current plan.');
export function copyAssuranceRaw(_target, raw) { return Object.freeze(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? Object.freeze([...value]) : value]))); }
export function sameAssuranceRaw(_target, a, b) {
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key)
    && (Array.isArray(a[key]) ? equalIds(a[key], b[key]) : a[key] === b[key]));
}
export function startingAssuranceRaw(settings) {
  const raw = Object.fromEntries(Object.entries(ASSURANCE_FIELDS).map(([key, field]) => [key, field.kind === 'ids' ? [] : '']));
  Object.assign(raw, { sourcePresetId: settings.context.sourcePresetId ?? '', horizonQuantity: settings.context.referenceHorizon ? String(settings.context.referenceHorizon.quantity) : '',
    horizonUnit: settings.context.referenceHorizon?.unit ?? 'hours', namedUnknowns: String(settings.context.namedUnknowns), recoveryRatePersonIds: [...settings.context.recoveryRatePersonIds],
    qualityIncluded: settings.quality.included ? 'yes' : 'no', allocationPercent: String(settings.quality.allocationPercent),
    independentRate: settings.quality.independentRateCentsPerHour === null ? '' : String(settings.quality.independentRateCentsPerHour / 100),
    sigmaHalfSteps: String(settings.quality.sigmaHalfSteps), qualityAdditionalPercent: String(settings.quality.additionalShareBasisPoints / 100),
    recoveryAdditionalPercent: String(settings.recoveryAdditionalShareBasisPoints / 100),
    eventIds: settings.recoveryEvents.map(row => row.id), learningIds: settings.learningActions.map(row => row.id), rehearsalIds: settings.rehearsals.map(row => row.id),
    'proposal.mode': 'none', 'proposal.hoursPerSession': '0', 'proposal.minutesPerSession': '30', 'proposal.occurrences': '1', 'proposal.funding': 'additional' });
  for (const concept of settings.quality.concepts) { raw[`concept.${concept.conceptId}.included`] = concept.included ? 'yes' : 'no'; raw[`concept.${concept.conceptId}.workIds`] = [...concept.workIds]; }
  for (const [kind, collection] of [['event', settings.recoveryEvents], ['learning', settings.learningActions], ['rehearsal', settings.rehearsals]])
    for (const row of collection) for (const key of Object.keys(records[kind])) {
      const value = row[key]; raw[`${kind}.${row.id}.${key}`] = Array.isArray(value) ? [...value] : typeof value === 'boolean' ? value ? 'yes' : 'no' : value === null ? '' : String(value);
    }
  return raw;
}
const nullable = value => value?.trim() || null;
export function assuranceSettingsFromRaw(raw, template = createAssuranceSettings()) {
  const record = (kind, id) => Object.fromEntries(Object.entries(records[kind]).map(([key, metadata]) => {
    const value = raw[`${kind}.${id}.${key}`] ?? (metadata.kind === 'ids' ? [] : '');
    return [key, metadata.kind === 'ids' ? [...value] : metadata.checkbox ? value === 'yes' : metadata.numeric ? Number(value) : nullable(value)];
  }));
  return { ...template, context: { sourcePresetId: nullable(raw.sourcePresetId), referenceHorizon: raw.horizonQuantity.trim() ? { quantity: Number(raw.horizonQuantity), unit: raw.horizonUnit } : null,
    namedUnknowns: Number(raw.namedUnknowns), recoveryRatePersonIds: [...raw.recoveryRatePersonIds] },
    quality: { ...template.quality, included: raw.qualityIncluded === 'yes', allocationPercent: Number(raw.allocationPercent),
      independentRateCentsPerHour: raw.independentRate.trim() === '' ? null : Math.round(Number(raw.independentRate) * 100), sigmaHalfSteps: Number(raw.sigmaHalfSteps),
      additionalShareBasisPoints: Math.round(Number(raw.qualityAdditionalPercent) * 100),
      concepts: template.quality.concepts.map(concept => ({ ...concept, included: raw[`concept.${concept.conceptId}.included`] === 'yes', workIds: [...raw[`concept.${concept.conceptId}.workIds`]] })) },
    recoveryAdditionalShareBasisPoints: Math.round(Number(raw.recoveryAdditionalPercent) * 100),
    recoveryEvents: raw.eventIds.map(id => ({ id, ...record('event', id) })), learningActions: raw.learningIds.map(id => ({ id, ...record('learning', id) })),
    rehearsals: raw.rehearsalIds.map(id => ({ id, ...record('rehearsal', id) })) };
}
export function summarizeAssuranceDraft(raw) {
  return raw['proposal.mode'] === 'none' ? 'Review quality assumptions, recovery responsibilities, learning and rehearsal choices.'
    : `Proposed session: ${raw['proposal.label'] || 'name the work'}. Review its people, duration and funding.`;
}
function values(session) {
  const { raw, baseProjection } = session, errors = [], settings = assuranceSettingsFromRaw(raw, baseProjection.state.assuranceSettings);
  for (const [key, value] of Object.entries(raw)) {
    const metadata = assuranceField(key); if (!metadata || metadata.kind === 'ids') continue;
    if (key.startsWith('proposal.') && raw['proposal.mode'] === 'none') continue;
    if (metadata.choices && !metadata.choices.includes(value)) errors.push(diagnostic('choice', `draft.${key}`, 'Choose one of the listed values.'));
    if (metadata.numeric && !(metadata.optional && value.trim() === '') && (!/^\d+$/.test(value.trim()) || Number(value) < metadata.min || Number(value) > metadata.max))
      errors.push(diagnostic('integer-text', `draft.${key}`, `Enter a whole number from ${metadata.min} through ${metadata.max}.`));
    if (metadata.decimal && !(key === 'independentRate' && value.trim() === '') && (!/^\d+(?:\.\d{1,2})?$/.test(value.trim()) || Number(value) > (key === 'independentRate' ? LIMITS.rateCentsPerHour / 100 : 100)))
      errors.push(diagnostic('decimal-text', `draft.${key}`, key === 'independentRate' ? 'Enter an hourly amount with up to two decimal places, or leave it open.' : 'Enter a percentage from 0 through 100 with up to two decimal places.'));
  }
  const request = { assuranceSettings: settings, newWork: [], workUpdates: [], connectionUpdates: [] };
  if (raw['proposal.mode'] !== 'none') {
    const duration = prepareWorkDraftValues(Object.fromEntries(['hoursPerSession', 'minutesPerSession', 'occurrences'].map(key => [key, raw[`proposal.${key}`]])));
    errors.push(...duration.errors.map(error => diagnostic(error.code, `draft.proposal.${error.path.slice(6)}`, error.message)));
    const existing = baseProjection.state.work.find(row => row.id === raw['proposal.existingWorkId']);
    let sequence = 1; const used = new Set(baseProjection.state.work.map(row => row.id)); while (used.has(`assurance-work-${sequence}`)) sequence += 1;
    const work = { ...(raw['proposal.mode'] === 'update' ? existing : { id: `assurance-work-${sequence}`, status: 'planned', timing: null, lifecycle: 'active' }),
      label: raw['proposal.label'].trim(), teamId: nullable(raw['proposal.teamId']), personIds: [...raw['proposal.personIds']], ...duration.admitted, funding: raw['proposal.funding'] };
    request[raw['proposal.mode'] === 'update' ? 'workUpdates' : 'newWork'].push(work);
    const [kind, id] = raw['proposal.target'].split('/');
    const target = kind === 'concept' ? settings.quality.concepts.find(row => row.conceptId === id)
      : (settings[kind === 'event' ? 'recoveryEvents' : kind === 'learning' ? 'learningActions' : kind === 'rehearsal' ? 'rehearsals' : ''] ?? []).find(row => row.id === id);
    if (target) { if (!target.workIds.includes(work.id)) target.workIds.push(work.id); }
    else errors.push(diagnostic('reference', 'draft.proposal.target', 'Choose the quality, recovery, learning or rehearsal action this session supports.'));
  }
  for (const id of raw.connectionUpdateIds) {
    const connection = baseProjection.state.connections.find(row => row.id === id);
    if (connection) request.connectionUpdates.push({ ...connection, status: raw[`connection.${id}.status`] });
    else errors.push(diagnostic('reference', `draft.connection.${id}.status`, 'Choose a current connection.'));
  }
  return { request, errors };
}

export function createAssuranceDraftAdapter(studio) {
  let active = null, disposed = false, lastError = null;
  function read() {
    const projection = studio.read(), isStale = active && active.baseProjection !== projection;
    return Object.freeze({ status: disposed ? 'disposed' : isStale ? 'stale' : active ? 'editing' : 'idle',
      projection, pending: false, draft: active ? Object.freeze({ token: active.token, assuranceId: 'assurance',
        raw: copyAssuranceRaw('assurance', active.raw), errors: Object.freeze(values(active).errors),
        changed: !sameAssuranceRaw('assurance', active.raw, active.initialRaw) }) : null,
      error: lastError ?? (isStale ? stale() : null) });
  }
  function fail(error, retain = true) {
    if (retain && !['draft-token', 'disposed'].includes(error.code)) lastError = error;
    return Object.freeze({ ok: false, error, view: read() });
  }
  function succeed(extra = {}) { lastError = null; return Object.freeze({ ok: true, ...extra, view: read() }); }
  function guard(token) { return disposed ? diagnostic('disposed', 'draft', 'Open another Studio to edit.')
    : !active || active.token !== token ? diagnostic('draft-token', 'draft', 'Use the currently open Assurance editor.') : null; }
  function begin(target, expected) {
    if (disposed) return fail(diagnostic('disposed', 'draft', 'Open another Studio to edit.'));
    if (active) return fail(diagnostic('draft-open', 'draft', 'Apply or cancel the open edit first.'));
    if (target !== 'assurance') return fail(diagnostic('reference', 'draft', 'Choose the Assurance settings.'));
    if (expected !== studio.read()) return fail(stale());
    const raw = startingAssuranceRaw(expected.state.assuranceSettings);
    active = { token: Object.freeze({}), baseProjection: expected, raw, initialRaw: copyAssuranceRaw(target, raw), revision: 0, preview: null };
    return succeed();
  }
  function activeField(key) {
    if (Object.hasOwn(ASSURANCE_FIELDS, key)) return assuranceField(key);
    const [kind, id] = String(key).split('.'), list = { event: 'eventIds', learning: 'learningIds', rehearsal: 'rehearsalIds', connection: 'connectionUpdateIds' }[kind];
    return list && active.raw[list].includes(id) ? assuranceField(key) : null;
  }
  function setText(token, key, raw) {
    const error = guard(token); if (error) return fail(error);
    const field = activeField(key);
    if (field?.kind !== 'text') return fail(diagnostic('field', 'draft', 'Choose an Assurance text field.'));
    if (typeof raw !== 'string' || raw.length > field.maxLength) return fail(diagnostic('text', `draft.${key}`, `Use at most ${field.maxLength} characters.`));
    if (active.raw[key] !== raw) { active.raw[key] = raw; active.revision += 1; }
    return succeed();
  }
  function setIds(token, key, input) {
    const error = guard(token); if (error) return fail(error);
    const session = active, revision = session.revision, field = activeField(key);
    if (field?.kind !== 'ids') return fail(diagnostic('field', 'draft', 'Choose an Assurance support list.'));
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype || input.length > field.maxItems
      || Reflect.ownKeys(input).length !== input.length + 1) return fail(diagnostic('collection', `draft.${key}`, 'Choose a bounded dense list.'));
    const owned = [], seen = new Set();
    for (let index = 0; index < input.length; index += 1) {
      const property = Object.getOwnPropertyDescriptor(input, String(index));
      if (!property?.enumerable || !Object.hasOwn(property, 'value')) return fail(diagnostic('data-property', `draft.${key}`, 'Choose ordinary record IDs.'));
      const value = property.value, valid = validId(value);
      if (!valid || seen.has(value)) return fail(diagnostic('reference', `draft.${key}`, 'Choose each valid record once.'));
      seen.add(value); owned.push(value);
    }
    const current = guard(token); if (current) return fail(current, false);
    if (active !== session || session.revision !== revision) return fail(diagnostic('draft-changed', 'draft', 'Review the newer selection.'), false);
    if (!Object.hasOwn(session.raw, key) || !equalIds(session.raw[key], owned)) {
      const kind = { eventIds: 'event', learningIds: 'learning', rehearsalIds: 'rehearsal', connectionUpdateIds: 'connection' }[key];
      if (kind) for (const existing of Object.keys(session.raw)) { const [prefix, id] = existing.split('.'); if (prefix === kind && !seen.has(id)) delete session.raw[existing]; }
      session.raw[key] = owned; session.revision += 1;
    }
    return succeed();
  }
  function step(token, key, direction) {
    const error = guard(token); if (error) return fail(error);
    if (![1, -1].includes(direction)) return fail(diagnostic('step', `draft.${key}`, 'Choose a single upward or downward step.'));
    if (['proposal.hoursPerSession', 'proposal.minutesPerSession', 'proposal.occurrences'].includes(key)) {
      const raw = Object.fromEntries(['hoursPerSession', 'minutesPerSession', 'occurrences'].map(name => [name, active.raw[`proposal.${name}`]]));
      const result = stepWorkDraftValues(raw, key.slice('proposal.'.length), direction);
      if (result.error) return fail(diagnostic(result.error.code, `draft.${key}`, result.error.message));
      for (const name of Object.keys(raw)) active.raw[`proposal.${name}`] = result.raw[name];
      active.revision += 1; return succeed();
    }
    const metadata = assuranceField(key), value = Number(active.raw[key]?.trim());
    if (!metadata?.numeric || !Number.isInteger(value)) return fail(diagnostic('integer-text', `draft.${key}`, 'Enter a whole number before using the step controls.'));
    return setText(token, key, String(Math.max(metadata.min ?? 0, Math.min(metadata.max ?? LIMITS.occurrences, value + direction))));
  }
  function prepare(token) {
    const error = guard(token); if (error) return { error };
    const session = active, revision = session.revision;
    if (session.baseProjection !== studio.read()) return { error: stale() };
    const parsed = values(session); if (parsed.errors.length) return { error: parsed.errors[0] };
    if (!session.preview || session.preview.revision !== revision) {
      try { session.preview = { revision, proposal: prepareAssuranceProposal(session.baseProjection, parsed.request) }; }
      catch (cause) { if (!cause?.code) throw cause; return { error: diagnostic(cause.code, cause.path, cause.message) }; }
    }
    if (active !== session || session.revision !== revision || disposed) return { error: diagnostic('draft-changed', 'draft', 'Review the newer Assurance settings.') };
    if (session.baseProjection !== studio.read()) return { error: stale() };
    return { session, proposal: session.preview.proposal };
  }
  function preview(token) { const result = prepare(token); return result.error ? fail(result.error, false) : succeed({ projection: result.proposal.projection, summary: result.proposal.summary }); }
  function validate(token) { const result = prepare(token); return result.error ? fail(result.error) : succeed(); }
  function apply(token) {
    const result = prepare(token); if (result.error) return fail(result.error);
    const applied = applyAssuranceProposal(studio, result.proposal); if (!applied.ok) return fail(applied.error);
    if (active === result.session) active = null;
    return succeed({ projection: applied.projection, summary: result.proposal.summary });
  }
  function cancel(token) { const error = guard(token); if (error) return fail(error); active = null; return succeed(); }
  function dispose() { disposed = true; active = null; return succeed(); }
  return Object.freeze({ read, begin, setText, setIds, step, preview, validate, apply, cancel, dispose });
}
