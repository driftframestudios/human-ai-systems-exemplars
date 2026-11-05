import { LIMITS } from './config.mjs';
import { createScoreSettings } from './score-models.mjs';
import { parseScoreTime, formatScoreTime } from './score-time.mjs';

const text = (label, extra = {}) => Object.freeze({ kind: 'text', label, maxLength: LIMITS.relationshipText, ...extra });
const id = (label, source, optional = false) => text(label, { source, optional, maxLength: LIMITS.identifier });
const ids = (label, source, maxItems) => Object.freeze({ kind: 'ids', label, source, maxItems });
const number = (label, max = LIMITS.scoreMinute, extra = {}) => text(label, { numeric: true, min: 0, max, maxLength: 32, ...extra });
const time = (label, max = LIMITS.scoreMinute, extra = {}) => number(label, max, { time: true, ...extra });
const numberFromRaw = (value, metadata) => metadata.time ? parseScoreTime(value) : Number(value);
const yesno = label => text(label, { checkbox: true, choices: ['yes', 'no'] });
const label = name => text(name, { maxLength: LIMITS.label });
export const SCORE_FIELDS = Object.freeze({
  windowEnabled: yesno('Describe a coordination window'), windowLabel: label('Window label'),
  windowStartMinute: time('Window starts after'), windowEndMinute: time('Window ends after'),
  timedWorkIds: ids('Work timing records', 'work', LIMITS.work), availabilityPersonIds: ids('Availability records', 'people', LIMITS.people),
  dependencyIds: ids('Dependencies', null, LIMITS.scoreDependencies), stageIds: ids('Stages', null, LIMITS.scoreStages),
  waitIds: ids('Waits', null, LIMITS.scoreWaits), gateIds: ids('Decision gates', null, LIMITS.scoreGates),
  proposalIds: ids('Proposed sessions', null, LIMITS.scoreProposals), fundProposalIds: ids('Proposals to add to planned work', 'proposals', LIMITS.scoreProposals),
});
const timingFields = Object.freeze({ timed: yesno('Place this work in time'), startMinute: time('Session starts after'),
  repeatEveryMinutes: time('Time between session starts', LIMITS.scoreMinute, { optional: true, min: 1 }) });
const records = Object.freeze({
  work: timingFields,
  dependency: { fromWorkId: id('Earlier session', 'work'), toWorkId: id('Later session', 'work'), lagMinutes: time('Wait after earlier work'), connectionId: id('Related connection', 'connections', true) },
  stage: { label: label('Stage name'), workIds: ids('Sessions in this stage', 'work', LIMITS.work) },
  wait: { label: label('Wait name'), startMinute: time('Wait starts after'), endMinute: time('Wait ends after'), reason: text('Reason for the wait'), receiverPersonId: id('Person receiving the result', 'people', true) },
  gate: { label: label('Decision name'), afterStageId: id('Stage before the decision', 'stages'), reviewerPersonId: id('Person reviewing the decision', 'people', true),
    question: text('Question to resolve'), evidence: text('Evidence for review'), modeledDecision: text('Modeled decision', { choices: ['open', 'proceed', 'revise', 'hold'] }) },
  proposal: { bank: text('Proposal bank', { choices: ['next', 'options'] }), gateId: id('Gate before commitment', 'gates', true),
    workId: id('Proposed session identifier'), label: label('Proposed session name'), teamId: id('Hosting team', 'teams'), personIds: ids('Participating people', 'people', LIMITS.people),
    minutesPerOccurrence: time('Time per person', LIMITS.minutesPerOccurrence), occurrences: number('Working sessions', LIMITS.occurrences),
    funding: text('Funding', { choices: ['allocated', 'additional'] }), status: text('Session status', { choices: ['planned', 'paused'] }),
    lifecycle: text('Session state', { choices: ['active', 'retired'] }), ...timingFields },
});
const availabilityFields = Object.freeze({ known: yesno('Describe availability'), intervalIds: ids('Available intervals', null, LIMITS.availabilityIntervals) });
const intervalFields = Object.freeze({ startMinute: time('Available from'), endMinute: time('Available until') });
const collectionKeys = Object.freeze({ work: 'timedWorkIds', dependency: 'dependencyIds', stage: 'stageIds', wait: 'waitIds', gate: 'gateIds', proposal: 'proposalIds' });
const validId = value => typeof value === 'string' && value.length <= LIMITS.identifier && /^[a-z][a-z0-9-]*$/.test(value);
const diagnostic = (code, path, message) => Object.freeze({ code, path, message });
const stale = () => diagnostic('stale-edit', 'draft', 'Review the saved arrangement against the current plan.');
const equalIds = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);
export function scoreField(key) {
  if (typeof key !== 'string') return null;
  if (Object.hasOwn(SCORE_FIELDS, key)) return SCORE_FIELDS[key];
  const [kind, recordId, field, intervalField, extra] = key.split('.');
  if (!validId(recordId) || extra) return null;
  if (kind === 'availability') return intervalField ? validId(field) && Object.hasOwn(intervalFields, intervalField) ? intervalFields[intervalField] : null
    : Object.hasOwn(availabilityFields, field) ? availabilityFields[field] : null;
  return !intervalField && Object.hasOwn(records, kind) && Object.hasOwn(records[kind], field) ? records[kind][field] : null;
}
export function scoreRecordDefaults(kind, recordId) {
  const fields = kind === 'availability' ? availabilityFields : kind === 'interval' ? intervalFields : records[kind];
  if (!fields) return null;
  const result = Object.fromEntries(Object.entries(fields).map(([key, metadata]) => [key,
    metadata.kind === 'ids' ? [] : metadata.checkbox ? 'no' : metadata.optional ? '' : metadata.numeric ? '0' : metadata.choices?.[0] ?? '']));
  if (kind === 'proposal') Object.assign(result, { workId: recordId, label: 'Proposed working session', minutesPerOccurrence: '30', occurrences: '1', funding: 'additional' });
  return result;
}
const timingRaw = timing => ({ timed: timing === null ? 'no' : 'yes', startMinute: formatScoreTime(timing?.startMinute ?? 0), repeatEveryMinutes: timing?.repeatEveryMinutes == null ? '' : formatScoreTime(timing.repeatEveryMinutes) });
const put = (raw, prefix, values) => { for (const [key, value] of Object.entries(values)) raw[prefix + key] = Array.isArray(value) ? [...value] : value == null ? '' : typeof value === 'number' && scoreField(prefix + key)?.time ? formatScoreTime(value) : String(value); };
export function startingScoreRaw(plan) {
  const settings = plan.scoreSettings;
  const raw = { windowEnabled: settings.window === null ? 'no' : 'yes', windowLabel: settings.window?.label ?? '',
    windowStartMinute: formatScoreTime(settings.window?.startMinute ?? 0), windowEndMinute: formatScoreTime(settings.window?.endMinute ?? 0),
    timedWorkIds: plan.work.map(row => row.id), availabilityPersonIds: plan.people.map(row => row.id),
    dependencyIds: settings.dependencies.map(row => row.id), stageIds: settings.stages.map(row => row.id), waitIds: settings.waits.map(row => row.id),
    gateIds: settings.gates.map(row => row.id), proposalIds: settings.proposals.map(row => row.id), fundProposalIds: [] };
  for (const row of plan.work) put(raw, `work.${row.id}.`, timingRaw(row.timing));
  for (const person of plan.people) {
    raw[`availability.${person.id}.known`] = person.availability === null ? 'no' : 'yes';
    raw[`availability.${person.id}.intervalIds`] = (person.availability ?? []).map((_, index) => `interval-${index + 1}`);
    (person.availability ?? []).forEach((interval, index) => put(raw, `availability.${person.id}.interval-${index + 1}.`, interval));
  }
  for (const [kind, collection] of [['dependency', 'dependencies'], ['stage', 'stages'], ['wait', 'waits'], ['gate', 'gates']])
    for (const { id, ...row } of settings[collection]) put(raw, `${kind}.${id}.`, row);
  for (const row of settings.proposals) {
    const { id, timing, ...work } = row.work;
    put(raw, `proposal.${row.id}.`, { bank: row.bank, gateId: row.gateId, workId: id, ...work, ...timingRaw(timing) });
  }
  return raw;
}
export function copyScoreRaw(_target, raw) { return Object.freeze(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? Object.freeze([...value]) : value]))); }
export function sameScoreRaw(_target, a, b) { return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && (Array.isArray(a[key]) ? equalIds(a[key], b[key]) : a[key] === b[key])); }
const nullable = value => value?.trim() || null;
const timingFromRaw = (raw, prefix) => raw[prefix + 'timed'] !== 'yes' ? null : { startMinute: parseScoreTime(raw[prefix + 'startMinute']), repeatEveryMinutes: nullable(raw[prefix + 'repeatEveryMinutes']) === null ? null : parseScoreTime(raw[prefix + 'repeatEveryMinutes']) };
export function scoreArrangementFromRaw(raw, plan) {
  const settings = { ...createScoreSettings(), window: raw.windowEnabled === 'yes' ? { label: raw.windowLabel.trim(), startMinute: parseScoreTime(raw.windowStartMinute), endMinute: parseScoreTime(raw.windowEndMinute) } : null };
  for (const [kind, collection] of [['dependency', 'dependencies'], ['stage', 'stages'], ['wait', 'waits'], ['gate', 'gates']]) {
    settings[collection] = raw[collectionKeys[kind]].map(id => ({ id, ...Object.fromEntries(Object.entries(records[kind]).map(([key, metadata]) => {
      const value = raw[`${kind}.${id}.${key}`];
      return [key, metadata.kind === 'ids' ? [...value] : metadata.numeric ? numberFromRaw(value, metadata) : metadata.optional || ['reason', 'question', 'evidence'].includes(key) ? nullable(value) : value.trim()];
    })) }));
  }
  settings.proposals = raw.proposalIds.map(id => {
    const prefix = `proposal.${id}.`;
    return { id, bank: raw[prefix + 'bank'], gateId: nullable(raw[prefix + 'gateId']), work: {
      id: raw[prefix + 'workId'].trim(), label: raw[prefix + 'label'].trim(), teamId: raw[prefix + 'teamId'].trim(), personIds: [...raw[prefix + 'personIds']],
      minutesPerOccurrence: parseScoreTime(raw[prefix + 'minutesPerOccurrence']), occurrences: Number(raw[prefix + 'occurrences']), funding: raw[prefix + 'funding'],
      status: raw[prefix + 'status'], timing: timingFromRaw(raw, prefix), lifecycle: raw[prefix + 'lifecycle'] } };
  });
  return { type: 'score.arrangement.replace', scoreSettings: settings,
    workTiming: raw.timedWorkIds.map(workId => ({ workId, timing: timingFromRaw(raw, `work.${workId}.`) })),
    availability: raw.availabilityPersonIds.map(personId => ({ personId, intervals: raw[`availability.${personId}.known`] === 'yes'
      ? raw[`availability.${personId}.intervalIds`].map(id => ({ startMinute: parseScoreTime(raw[`availability.${personId}.${id}.startMinute`]), endMinute: parseScoreTime(raw[`availability.${personId}.${id}.endMinute`]) })) : null })),
    fundProposalIds: [...raw.fundProposalIds] };
}
export function summarizeScoreDraft(raw) { return `${raw.windowEnabled === 'yes' && raw.windowLabel.trim() ? raw.windowLabel.trim() : 'Authored arrangement'}. Review session timing, availability and modeled decisions${raw.fundProposalIds.length ? ' before adding the selected proposals to planned work' : ''}.`; }

function errorsFor(raw) {
  const errors = [];
  for (const [key, value] of Object.entries(raw)) {
    const metadata = scoreField(key); if (!metadata || metadata.kind === 'ids') continue;
    if (key.startsWith('window') && key !== 'windowEnabled' && raw.windowEnabled !== 'yes') continue;
    const [kind, id, part] = key.split('.');
    if ((kind === 'work' || kind === 'proposal') && ['startMinute', 'repeatEveryMinutes'].includes(part) && raw[`${kind}.${id}.timed`] !== 'yes') continue;
    if (kind === 'availability' && key.split('.').length === 4 && raw[`availability.${id}.known`] !== 'yes') continue;
    if (metadata.choices && !metadata.choices.includes(value)) errors.push(diagnostic('choice', `draft.${key}`, 'Choose one of the listed values.'));
    if (metadata.numeric && !(metadata.optional && value.trim() === '')) {
      const numeric = numberFromRaw(value, metadata);
      if ((metadata.time ? numeric === null : !/^\d+$/.test(value.trim())) || numeric < metadata.min || numeric > metadata.max)
        errors.push(diagnostic('integer-text', `draft.${key}`, metadata.time ? `Enter elapsed hours and minutes from ${formatScoreTime(metadata.min)} through ${formatScoreTime(metadata.max)}; for example, 11h30m or 690 minutes.` : `Enter a whole number from ${metadata.min} through ${metadata.max}.`));
    }
  }
  return errors;
}
export function createScoreDraftAdapter(studio) {
  let active = null, disposed = false, lastError = null;
  function read() {
    const projection = studio.read(), isStale = active && active.baseProjection !== projection;
    return Object.freeze({ status: disposed ? 'disposed' : isStale ? 'stale' : active ? 'editing' : 'idle', projection, pending: false,
      draft: active ? Object.freeze({ token: active.token, scoreId: 'score', raw: copyScoreRaw('score', active.raw), errors: Object.freeze(errorsFor(active.raw)), changed: !sameScoreRaw('score', active.raw, active.initialRaw) }) : null,
      error: lastError ?? (isStale ? stale() : null) });
  }
  const fail = (error, retain = true) => { if (retain && !['draft-token', 'disposed'].includes(error.code)) lastError = error; return Object.freeze({ ok: false, error, view: read() }); };
  const succeed = (extra = {}) => { lastError = null; return Object.freeze({ ok: true, ...extra, view: read() }); };
  const guard = token => disposed ? diagnostic('disposed', 'draft', 'Open another Studio to edit.') : !active || active.token !== token ? diagnostic('draft-token', 'draft', 'Use the currently open score editor.') : null;
  function begin(target, expected) {
    if (disposed) return fail(diagnostic('disposed', 'draft', 'Open another Studio to edit.'));
    if (active) return fail(diagnostic('draft-open', 'draft', 'Apply or cancel the open arrangement first.'));
    if (target !== 'score') return fail(diagnostic('reference', 'draft', 'Choose the coordination score.'));
    if (expected !== studio.read()) return fail(stale());
    const raw = startingScoreRaw(expected.state);
    active = { token: Object.freeze({}), baseProjection: expected, raw, initialRaw: copyScoreRaw(target, raw), revision: 0, preview: null }; return succeed();
  }
  function activeField(key) {
    const metadata = scoreField(key); if (!metadata) return null;
    if (Object.hasOwn(SCORE_FIELDS, key)) return metadata;
    const [kind, id, part, intervalPart] = key.split('.');
    if (kind === 'availability') return active.raw.availabilityPersonIds.includes(id) && (!intervalPart || active.raw[`availability.${id}.intervalIds`]?.includes(part)) ? metadata : null;
    return active.raw[collectionKeys[kind]]?.includes(id) ? metadata : null;
  }
  function setText(token, key, value) {
    const error = guard(token); if (error) return fail(error);
    const metadata = activeField(key);
    if (metadata?.kind !== 'text') return fail(diagnostic('field', 'draft', 'Choose a score text field.'));
    if (typeof value !== 'string' || value.length > metadata.maxLength) return fail(diagnostic('text', `draft.${key}`, `Use at most ${metadata.maxLength} characters.`));
    if (active.raw[key] !== value) { active.raw[key] = value; active.revision += 1; } return succeed();
  }
  function setIds(token, key, input) {
    const error = guard(token); if (error) return fail(error);
    const session = active, revision = session.revision, metadata = activeField(key);
    if (metadata?.kind !== 'ids') return fail(diagnostic('field', 'draft', 'Choose a score list.'));
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype || input.length > metadata.maxItems || Reflect.ownKeys(input).length !== input.length + 1)
      return fail(diagnostic('collection', `draft.${key}`, 'Choose a bounded dense list.'));
    const owned = [], seen = new Set();
    for (let index = 0; index < input.length; index += 1) {
      const property = Object.getOwnPropertyDescriptor(input, String(index));
      if (!property?.enumerable || !Object.hasOwn(property, 'value')) return fail(diagnostic('data-property', `draft.${key}`, 'Choose ordinary record IDs.'));
      const value = property.value;
      if (!validId(value) || seen.has(value)) return fail(diagnostic('reference', `draft.${key}`, 'Choose each valid record once.'));
      seen.add(value); owned.push(value);
    }
    const current = guard(token); if (current) return fail(current, false);
    if (active !== session || session.revision !== revision) return fail(diagnostic('draft-changed', 'draft', 'Review the newer selection.'), false);
    if (Object.hasOwn(session.raw, key) && equalIds(session.raw[key], owned)) return succeed();
    const kind = Object.keys(collectionKeys).find(kind => collectionKeys[kind] === key) ?? (key === 'availabilityPersonIds' ? 'availability' : null);
    const interval = /^availability\.([a-z][a-z0-9-]*)\.intervalIds$/.exec(key);
    if (kind || interval) {
      const prefix = interval ? `availability.${interval[1]}.` : `${kind}.`;
      for (const existing of Object.keys(session.raw)) {
        if (!existing.startsWith(prefix)) continue;
        const suffix = existing.slice(prefix.length).split('.');
        if (suffix.length > 1 && !seen.has(suffix[0])) delete session.raw[existing];
      }
      for (const id of owned) for (const [field, value] of Object.entries(scoreRecordDefaults(interval ? 'interval' : kind, id))) {
        const fieldKey = `${prefix}${id}.${field}`;
        if (!Object.hasOwn(session.raw, fieldKey)) session.raw[fieldKey] = Array.isArray(value) ? [...value] : value;
      }
    }
    session.raw[key] = owned; session.revision += 1; return succeed();
  }
  function step(token, key, direction) {
    const error = guard(token); if (error) return fail(error);
    const metadata = activeField(key), value = active.raw[key]?.trim();
    if (![1, -1].includes(direction)) return fail(diagnostic('step', `draft.${key}`, 'Choose a single upward or downward step.'));
    const numeric = metadata?.numeric ? numberFromRaw(value, metadata) : null;
    if (!metadata?.numeric || (metadata.time ? numeric === null : !/^\d+$/.test(value)) || numeric < metadata.min || numeric > metadata.max)
      return fail(diagnostic('integer-text', `draft.${key}`, metadata?.time ? 'Enter elapsed hours and minutes within the field range before using the step controls.' : 'Enter a whole number within the field range before using the step controls.'));
    const next = Math.max(metadata.min, Math.min(metadata.max, numeric + direction));
    return setText(token, key, metadata.time && !/^\d+$/.test(value) ? formatScoreTime(next) : String(next));
  }
  function prepare(token) {
    const error = guard(token); if (error) return { error };
    const session = active, revision = session.revision;
    if (session.baseProjection !== studio.read()) return { error: stale() };
    const errors = errorsFor(session.raw); if (errors.length) return { error: errors[0] };
    if (!session.preview || session.preview.revision !== revision) {
      const command = scoreArrangementFromRaw(session.raw, session.baseProjection.state), result = studio.previewCommand(command, session.baseProjection);
      if (!result.ok) return { error: result.error };
      const before = session.baseProjection.result, after = result.projection.result;
      const fundedWorkIds = session.raw.fundProposalIds.map(id => session.raw[`proposal.${id}.workId`].trim());
      session.preview = { revision, command, projection: result.projection, summary: Object.freeze({ fundedWorkIds: Object.freeze(fundedWorkIds), money: Object.freeze({
        beforeKnownCents: before.knownCommitmentCents, afterKnownCents: after.knownCommitmentCents, knownDeltaCents: after.knownCommitmentCents - before.knownCommitmentCents,
        beforeTotalCents: before.plannedCommitmentCents, afterTotalCents: after.plannedCommitmentCents,
        totalDeltaCents: before.plannedCommitmentCents === null || after.plannedCommitmentCents === null ? null : after.plannedCommitmentCents - before.plannedCommitmentCents }) }) };
    }
    if (active !== session || session.revision !== revision || disposed) return { error: diagnostic('draft-changed', 'draft', 'Review the newer score settings.') };
    if (session.baseProjection !== studio.read()) return { error: stale() };
    return { session, ...session.preview };
  }
  function preview(token) { const result = prepare(token); return result.error ? fail(result.error, false) : succeed({ projection: result.projection, summary: result.summary }); }
  function validate(token) { const result = prepare(token); return result.error ? fail(result.error) : succeed(); }
  function apply(token) {
    const result = prepare(token); if (result.error) return fail(result.error);
    const applied = studio.applyCommand(result.command, result.session.baseProjection); if (!applied.ok) return fail(applied.error);
    if (active === result.session) active = null;
    return succeed({ projection: applied.projection, summary: result.summary });
  }
  function cancel(token) { const error = guard(token); if (error) return fail(error); active = null; return succeed(); }
  function dispose() { disposed = true; active = null; return succeed(); }
  return Object.freeze({ read, begin, setText, setIds, step, preview, validate, apply, cancel, dispose });
}
