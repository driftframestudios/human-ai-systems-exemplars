import { LIMITS } from './config.mjs';
import { listChangeFrameworks, listInterpretiveLenses, listAttentionChannels, CHANGE_STATUSES, CHANGE_SOURCE_FILTERS,
  getChangeFramework, createChangeSettings } from './change-models.mjs';
import { prepareChangeProposal, applyChangeProposal } from './change-proposals.mjs';
import { prepareWorkDraftValues, stepWorkDraftValues, WORK_DRAFT_TEXT_LIMIT } from './draft.mjs';

const text = (label, extra = {}) => Object.freeze({ kind: 'text', label, maxLength: LIMITS.relationshipText, ...extra });
const ids = (label, source, maxItems) => Object.freeze({ kind: 'ids', label, source, maxItems });
const reference = row => `${row.id}@${row.version}`;
const frameworks = listChangeFrameworks(), channels = listAttentionChannels();
const fields = {
  framework: text('Change framework', { choices: frameworks.map(reference) }),
  lens: text('Interpretive lens', { choices: listInterpretiveLenses().map(reference) }),
  sourceFilter: text('Activity suggestions', { choices: CHANGE_SOURCE_FILTERS.map(row => row.id) }),
};
for (const framework of frameworks) for (const component of framework.components) {
  const prefix = `map.${framework.id}.${component.id}.`;
  fields[prefix + 'mapped'] = text('Included in the plan', { choices: ['yes', 'no'], checkbox: true });
  fields[prefix + 'status'] = text('Planning status', { choices: CHANGE_STATUSES.map(row => row.id) });
  fields[prefix + 'workIds'] = ids('Supporting sessions', 'work', LIMITS.work);
  fields[prefix + 'capabilityRefs'] = ids('Supporting abilities and practices', 'capabilities', 256);
}
for (const channel of channels) fields[`attention.${channel.id}`] = text(channel.label, { numeric: true, maxLength: WORK_DRAFT_TEXT_LIMIT });
Object.assign(fields, {
  'proposal.mode': text('Work proposal', { choices: ['none', 'existing', 'new'] }),
  'proposal.framework': text('Framework', { choices: frameworks.map(reference) }),
  'proposal.component': text('Change component', { maxLength: LIMITS.identifier }),
  'proposal.source': text('Suggestion source', { choices: ['core', 'enterprise'] }),
  'proposal.suggestion': text('Authored suggestion', { maxLength: LIMITS.identifier }),
  'proposal.existingWorkId': text('Working session', { source: 'work', maxLength: LIMITS.identifier }),
  'proposal.label': text('Session name', { maxLength: LIMITS.label }),
  'proposal.teamId': text('Session team', { source: 'teams', maxLength: LIMITS.identifier }),
  'proposal.personIds': ids('People in this session', 'people', LIMITS.people),
  'proposal.hoursPerSession': text('Hours', { numeric: true, maxLength: WORK_DRAFT_TEXT_LIMIT }),
  'proposal.minutesPerSession': text('Minutes', { numeric: true, maxLength: WORK_DRAFT_TEXT_LIMIT }),
  'proposal.occurrences': text('Working sessions', { numeric: true, maxLength: WORK_DRAFT_TEXT_LIMIT }),
  'proposal.funding': text('Funding', { choices: ['allocated', 'additional'] }),
});
export const CHANGE_FIELDS = Object.freeze(fields);
const equalIds = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);
const diagnostic = (code, path, message) => Object.freeze({ code, path, message });
const stale = () => diagnostic('stale-edit', 'draft', 'Review the saved Change settings against the current plan.');
const validId = value => typeof value === 'string' && value.length <= LIMITS.identifier && /^[a-z][a-z0-9-]*$/.test(value);

export function copyChangeRaw(_target, raw) {
  return Object.freeze(Object.fromEntries(Object.keys(CHANGE_FIELDS).map(key => [key,
    Array.isArray(raw[key]) ? Object.freeze([...raw[key]]) : raw[key]])));
}
export function sameChangeRaw(_target, a, b) {
  return Object.entries(CHANGE_FIELDS).every(([key, field]) => field.kind === 'ids' ? equalIds(a[key], b[key]) : a[key] === b[key]);
}
function startingRaw(settings) {
  const raw = Object.fromEntries(Object.entries(CHANGE_FIELDS).map(([key, field]) => [key, field.kind === 'ids' ? [] : '']));
  Object.assign(raw, { framework: `${settings.activeFramework.frameworkId}@${settings.activeFramework.version}`,
    lens: `${settings.lens.lensId}@${settings.lens.version}`, sourceFilter: settings.sourceFilter,
    'proposal.mode': 'none', 'proposal.source': 'core', 'proposal.hoursPerSession': '0',
    'proposal.minutesPerSession': '30', 'proposal.occurrences': '1', 'proposal.funding': 'allocated' });
  for (const map of settings.frameworkMaps) for (const component of map.components) {
    const prefix = `map.${map.frameworkId}.${component.componentId}.`;
    raw[prefix + 'mapped'] = component.mapped ? 'yes' : 'no'; raw[prefix + 'status'] = component.status;
    raw[prefix + 'workIds'] = [...component.workIds];
    raw[prefix + 'capabilityRefs'] = component.capabilityRefs.map(row => `${row.kind}/${row.instanceId}`);
  }
  for (const channel of settings.attention.channels) raw[`attention.${channel.channelId}`] = String(channel.parts);
  return raw;
}
export function changeSettingsFromRaw(raw, template = createChangeSettings()) {
  const settings = { ...template,
    frameworkMaps: template.frameworkMaps.map(mapping => ({ ...mapping,
      components: mapping.components.map(component => ({ ...component })) })),
    attention: { ...template.attention, channels: template.attention.channels.map(channel => ({ ...channel })) } };
  const [frameworkId, version] = raw.framework.split('@'), [lensId, lensVersion] = raw.lens.split('@');
  settings.activeFramework = { frameworkId, version }; settings.lens = { lensId, version: lensVersion };
  settings.sourceFilter = raw.sourceFilter;
  for (const map of settings.frameworkMaps) for (const component of map.components) {
    const prefix = `map.${map.frameworkId}.${component.componentId}.`;
    Object.assign(component, { mapped: raw[prefix + 'mapped'] === 'yes', status: raw[prefix + 'status'],
      workIds: [...raw[prefix + 'workIds']], capabilityRefs: raw[prefix + 'capabilityRefs'].map(value => {
        const [kind, instanceId] = value.split('/'); return { kind, instanceId };
      }) });
  }
  for (const channel of settings.attention.channels) channel.parts = Number(raw[`attention.${channel.channelId}`]);
  return settings;
}
export function summarizeChangeDraft(raw) {
  const [id, version] = raw.framework.split('@'), framework = getChangeFramework(id, version);
  const lens = listInterpretiveLenses().find(row => reference(row) === raw.lens);
  const work = raw['proposal.mode'] === 'none' ? 'Review the proposed mappings and attention.'
    : raw['proposal.mode'] === 'new' ? `Proposed session: ${raw['proposal.label'] || 'name the work'}.`
      : 'Link an existing session to the selected component.';
  return `${framework?.name ?? id} · ${lens?.name ?? raw.lens}. ${work}`;
}
function values(session) {
  const { raw, baseProjection } = session, errors = [];
  for (const [key, field] of Object.entries(CHANGE_FIELDS)) {
    if (key.startsWith('proposal.') && key !== 'proposal.mode' && raw['proposal.mode'] === 'none') continue;
    if (field.choices && !field.choices.includes(raw[key])) errors.push(diagnostic('choice', `draft.${key}`, 'Choose one of the listed values.'));
  }
  for (const channel of channels) {
    const key = `attention.${channel.id}`, value = raw[key].trim();
    if (!/^\d+$/.test(value) || Number(value) > channel.maxParts) errors.push(diagnostic('attention-parts', `draft.${key}`, 'Enter whole attention parts from 0 through 25.'));
  }
  let workProposal = null;
  if (raw['proposal.mode'] !== 'none') {
    const [frameworkId, frameworkVersion] = raw['proposal.framework'].split('@');
    let work = { kind: 'existing', workId: raw['proposal.existingWorkId'] };
    if (raw['proposal.mode'] === 'new') {
      const duration = prepareWorkDraftValues(Object.fromEntries(['hoursPerSession', 'minutesPerSession', 'occurrences'].map(key => [key, raw[`proposal.${key}`]])));
      errors.push(...duration.errors.map(error => diagnostic(error.code, `draft.proposal.${error.path.slice(6)}`, error.message)));
      let sequence = 1; const used = new Set(baseProjection.state.work.map(row => row.id));
      while (used.has(`change-work-${sequence}`)) sequence += 1;
      work = { kind: 'new', work: { id: `change-work-${sequence}`, label: raw['proposal.label'].trim(),
        teamId: raw['proposal.teamId'] || null, personIds: [...raw['proposal.personIds']], ...duration.admitted,
        funding: raw['proposal.funding'], status: 'planned', timing: null, lifecycle: 'active' } };
    }
    workProposal = { frameworkId, frameworkVersion, componentId: raw['proposal.component'],
      source: raw['proposal.source'], suggestionId: raw['proposal.suggestion'], work };
  }
  return { request: { changeSettings: changeSettingsFromRaw(raw, baseProjection.state.changeSettings), workProposal }, errors };
}

export function createChangeDraftAdapter(studio) {
  let active = null, disposed = false, lastError = null;
  function read() {
    const projection = studio.read(), isStale = active && active.baseProjection !== projection;
    return Object.freeze({ status: disposed ? 'disposed' : isStale ? 'stale' : active ? 'editing' : 'idle',
      projection, pending: false, draft: active ? Object.freeze({ token: active.token, changeId: 'change',
        raw: copyChangeRaw('change', active.raw), errors: Object.freeze(values(active).errors),
        changed: !sameChangeRaw('change', active.raw, active.initialRaw) }) : null,
      error: lastError ?? (isStale ? stale() : null) });
  }
  function fail(error, retain = true) {
    if (retain && !['draft-token', 'disposed'].includes(error.code)) lastError = error;
    return Object.freeze({ ok: false, error, view: read() });
  }
  function succeed(extra = {}) { lastError = null; return Object.freeze({ ok: true, ...extra, view: read() }); }
  function guard(token) { return disposed ? diagnostic('disposed', 'draft', 'Open another Studio to edit.')
    : !active || active.token !== token ? diagnostic('draft-token', 'draft', 'Use the currently open Change editor.') : null; }
  function begin(target, expected) {
    if (disposed) return fail(diagnostic('disposed', 'draft', 'Open another Studio to edit.'));
    if (active) return fail(diagnostic('draft-open', 'draft', 'Apply or cancel the open edit first.'));
    if (target !== 'change') return fail(diagnostic('reference', 'draft', 'Choose the Change settings.'));
    if (expected !== studio.read()) return fail(stale());
    const raw = startingRaw(expected.state.changeSettings);
    active = { token: Object.freeze({}), baseProjection: expected, raw, initialRaw: copyChangeRaw(target, raw), revision: 0, preview: null };
    return succeed();
  }
  function setText(token, key, raw) {
    const error = guard(token); if (error) return fail(error);
    const field = Object.hasOwn(CHANGE_FIELDS, key) ? CHANGE_FIELDS[key] : null;
    if (field?.kind !== 'text') return fail(diagnostic('field', 'draft', 'Choose a Change text field.'));
    if (typeof raw !== 'string' || raw.length > field.maxLength) return fail(diagnostic('text', `draft.${key}`, `Use at most ${field.maxLength} characters.`));
    if (active.raw[key] !== raw) { active.raw[key] = raw; active.revision += 1; }
    return succeed();
  }
  function setIds(token, key, input) {
    const error = guard(token); if (error) return fail(error);
    const session = active, revision = session.revision, field = Object.hasOwn(CHANGE_FIELDS, key) ? CHANGE_FIELDS[key] : null;
    if (field?.kind !== 'ids') return fail(diagnostic('field', 'draft', 'Choose a Change support list.'));
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype || input.length > field.maxItems
      || Reflect.ownKeys(input).length !== input.length + 1) return fail(diagnostic('collection', `draft.${key}`, 'Choose a bounded dense list.'));
    const owned = [], seen = new Set();
    for (let index = 0; index < input.length; index += 1) {
      const property = Object.getOwnPropertyDescriptor(input, String(index));
      if (!property?.enumerable || !Object.hasOwn(property, 'value')) return fail(diagnostic('data-property', `draft.${key}`, 'Choose ordinary record IDs.'));
      const value = property.value, valid = field.source === 'capabilities'
        ? typeof value === 'string' && /^(ability|practice)\//.test(value) && validId(value.slice(value.indexOf('/') + 1)) : validId(value);
      if (!valid || seen.has(value)) return fail(diagnostic('reference', `draft.${key}`, 'Choose each valid record once.'));
      seen.add(value); owned.push(value);
    }
    const current = guard(token); if (current) return fail(current, false);
    if (active !== session || session.revision !== revision) return fail(diagnostic('draft-changed', 'draft', 'Review the newer selection.'), false);
    if (!equalIds(session.raw[key], owned)) { session.raw[key] = owned; session.revision += 1; }
    return succeed();
  }
  function step(token, key, direction) {
    const error = guard(token); if (error) return fail(error);
    if (![1, -1].includes(direction)) return fail(diagnostic('step', `draft.${key}`, 'Choose a single upward or downward step.'));
    if (key.startsWith('attention.') && CHANGE_FIELDS[key]?.numeric) {
      const raw = active.raw[key].trim(), value = Number(raw);
      if (!/^\d+$/.test(raw) || value > 25) return fail(diagnostic('attention-parts', `draft.${key}`, 'Enter whole attention parts from 0 through 25.'));
      return setText(token, key, String(Math.max(0, Math.min(25, value + direction))));
    }
    const name = key.slice('proposal.'.length);
    if (!key.startsWith('proposal.') || !['hoursPerSession', 'minutesPerSession', 'occurrences'].includes(name)) return fail(diagnostic('field', 'draft', 'Choose an attention or duration field.'));
    const raw = Object.fromEntries(['hoursPerSession', 'minutesPerSession', 'occurrences'].map(field => [field, active.raw[`proposal.${field}`]]));
    const next = stepWorkDraftValues(raw, name, direction);
    if (next.error) return fail(diagnostic(next.error.code, `draft.${key}`, next.error.message));
    for (const field of Object.keys(raw)) active.raw[`proposal.${field}`] = next.raw[field];
    active.revision += 1; return succeed();
  }
  function prepare(token) {
    const error = guard(token); if (error) return { error };
    const session = active, revision = session.revision;
    if (session.baseProjection !== studio.read()) return { error: stale() };
    const parsed = values(session); if (parsed.errors.length) return { error: parsed.errors[0] };
    if (!session.preview || session.preview.revision !== revision) {
      try { session.preview = { revision, proposal: prepareChangeProposal(session.baseProjection, parsed.request) }; }
      catch (cause) { if (!cause?.code) throw cause; return { error: diagnostic(cause.code, cause.path, cause.message) }; }
    }
    if (active !== session || session.revision !== revision || disposed) return { error: diagnostic('draft-changed', 'draft', 'Review the newer Change settings.') };
    if (session.baseProjection !== studio.read()) return { error: stale() };
    return { session, proposal: session.preview.proposal };
  }
  function preview(token) { const result = prepare(token); return result.error ? fail(result.error, false) : succeed({ projection: result.proposal.projection, summary: result.proposal.summary }); }
  function validate(token) { const result = prepare(token); return result.error ? fail(result.error) : succeed(); }
  function apply(token) {
    const result = prepare(token); if (result.error) return fail(result.error);
    const applied = applyChangeProposal(studio, result.proposal); if (!applied.ok) return fail(applied.error);
    if (active === result.session) active = null;
    return succeed({ projection: applied.projection, summary: result.proposal.summary });
  }
  function cancel(token) { const error = guard(token); if (error) return fail(error); active = null; return succeed(); }
  function dispose() { disposed = true; active = null; return succeed(); }
  return Object.freeze({ read, begin, setText, setIds, step, preview, validate, apply, cancel, dispose });
}
