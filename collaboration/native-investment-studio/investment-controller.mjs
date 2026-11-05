import { createPlanExchange } from './exchange.mjs';
import { listPresets } from './presets.mjs';
import { money } from './display.mjs';
import { PURPOSE_LABELS } from './purpose-controller.mjs';
import { CONTRIBUTION_CATEGORIES } from './roles.mjs';
import { getCapabilityDefinition } from './capabilities.mjs';
import { getQualityConcept, getSourcePreset, getRehearsalDefinition } from './assurance-models.mjs';
import { getChangeFramework, getInterpretiveLens, listAttentionChannels } from './change-models.mjs';
import { describeScoreChanges } from './score-reference.mjs';
import { describeArrangementChanges } from './coordination-arrangements.mjs';
import { projectInvestmentTrace } from './investment-trace.mjs';
import { mountInvestmentTrace } from './investment-trace-view.mjs';

const CHANGE_LABELS = Object.freeze({
  planId: 'plan name', revision: 'saved revision', schemaVersion: 'file format',
  horizonWeeks: 'plan length', label: 'names', fundedMinutes: 'funded time',
  rateCentsPerHour: 'hourly rates', personIds: 'participants', teamId: 'team',
  minutesPerOccurrence: 'session duration', occurrences: 'session count',
  funding: 'funding', status: 'work status', timing: 'timing', practiceId: 'practice', workIds: 'supporting work',
  role: 'roles', lifecycle: 'record state', availability: 'authored availability', categoryId: 'contribution kind', receiverPersonId: 'receiving person',
  decisionOwnerPersonId: 'decision owner', reviewBoundary: 'human review', decisionBoundary: 'human decision',
  senderTeamId: 'sending team', receiverTeamId: 'receiving team', sharedObject: 'what is shared', responseExpectation: 'expected response',
  definitionId: 'chosen action', definitionVersion: 'definition version', context: 'use context', responsiblePersonIds: 'responsible people',
  prerequisites: 'prerequisites', supportBindings: 'supporting work', subject: 'observed ability or practice', stage: 'observation type',
  observation: 'observation', recorderPersonId: 'recorded by', observedPlanRevision: 'observed plan revision',
});
const COLLECTION_LABELS = Object.freeze({ people: 'People', teams: 'Teams', work: 'Work' });
const CONTRIBUTION_LABELS = new Map(CONTRIBUTION_CATEGORIES.map(row => [row.id, row.label]));
const MAPPING_LABELS = Object.freeze({ planned: 'Planned', partial: 'Partly planned', look: 'Needs review', outside: 'Outside the scope' });

function changeDescriptions(before, after) {
  const prior = before.changeSettings, next = after.changeSettings, descriptions = [];
  const frameworkName = row => getChangeFramework(row.frameworkId, row.version).name;
  const lensName = row => getInterpretiveLens(row.lensId, row.version).name;
  if (JSON.stringify(prior.activeFramework) !== JSON.stringify(next.activeFramework))
    descriptions.push(`Framework: ${frameworkName(prior.activeFramework)} → ${frameworkName(next.activeFramework)}`);
  if (JSON.stringify(prior.lens) !== JSON.stringify(next.lens)) descriptions.push(`Viewpoint: ${lensName(prior.lens)} → ${lensName(next.lens)}`);
  if (prior.sourceFilter !== next.sourceFilter) descriptions.push(`Suggestions: ${prior.sourceFilter} → ${next.sourceFilter}`);
  const priorMaps = new Map(prior.frameworkMaps.map(row => [row.frameworkId + ':' + row.version, row]));
  const work = new Map(after.work.map(row => [row.id, row.label]));
  for (const map of next.frameworkMaps) {
    const old = new Map(priorMaps.get(map.frameworkId + ':' + map.version)?.components.map(row => [row.componentId, row]) ?? []);
    const definition = getChangeFramework(map.frameworkId, map.version);
    for (const row of map.components) {
      if (JSON.stringify(old.get(row.componentId)) === JSON.stringify(row)) continue;
      const name = definition.components.find(component => component.id === row.componentId).label;
      const supports = [...row.workIds.map(id => work.get(id)), ...row.capabilityRefs.map(ref => {
        const instance = after[ref.kind === 'ability' ? 'abilities' : 'practices'].find(item => item.id === ref.instanceId);
        return getCapabilityDefinition(ref.kind, instance.definitionId, instance.definitionVersion).action;
      })];
      descriptions.push(`${definition.name} · ${name}: ${row.mapped ? 'Mapped' : 'Mapping to plan'}; ${MAPPING_LABELS[row.status]}${supports.length ? `; linked to ${supports.join(', ')}` : '; support to choose'}`);
    }
  }
  const priorParts = new Map(prior.attention.channels.map(row => [row.channelId, row.parts]));
  const labels = new Map(listAttentionChannels().map(row => [row.id, row.label]));
  for (const row of next.attention.channels) if (priorParts.get(row.channelId) !== row.parts)
    descriptions.push(`${labels.get(row.channelId)} attention: ${priorParts.get(row.channelId)} → ${row.parts} parts`);
  return descriptions;
}

function assuranceDescriptions(before, after) {
  const prior = before.assuranceSettings, next = after.assuranceSettings, descriptions = [];
  const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const people = new Map([...before.people, ...after.people].map(row => [row.id, row.label]));
  const works = new Map([...before.work, ...after.work].map(row => [row.id, row.label]));
  const support = ids => ids.map(id => works.get(id)).join(', ') || 'Supporting session to choose';
  if (!same(prior.context, next.context)) {
    const horizon = next.context.referenceHorizon;
    descriptions.push(`Quality and recovery context: ${next.context.sourcePresetId ? getSourcePreset(next.context.sourcePresetId).name + "; " : ""}${horizon ? `${horizon.quantity} ${horizon.unit}` : 'reference horizon to choose'}; ${next.context.namedUnknowns} named unknowns; recovery rate from ${next.context.recoveryRatePersonIds.map(id => people.get(id)).join(', ') || 'people to choose'}.`);
  }
  for (const [field, label, format] of [
    ['included', 'Quality planning', value => value ? 'Included' : 'Available'],
    ['allocationPercent', 'Quality allocation', value => `${value}%`],
    ['independentRateCentsPerHour', 'Independent-review rate', value => value === null ? 'Rate to choose' : `${money(value)}/hour`],
    ['sigmaHalfSteps', 'Illustrative sigma', value => String(value / 2)],
    ['additionalShareBasisPoints', 'Additional quality share', value => `${value / 100}%`],
  ]) if (prior.quality[field] !== next.quality[field])
    descriptions.push(`${label}: ${format(prior.quality[field])} → ${format(next.quality[field])}.`);
  const concepts = new Map(prior.quality.concepts.map(row => [row.conceptId, row]));
  for (const row of next.quality.concepts) if (!same(concepts.get(row.conceptId), row))
    descriptions.push(`Quality check ${getQualityConcept(row.conceptId).label}: ${row.included ? 'Included' : 'Available'}; ${support(row.workIds)}.`);
  if (prior.recoveryAdditionalShareBasisPoints !== next.recoveryAdditionalShareBasisPoints)
    descriptions.push(`Additional recovery share: ${prior.recoveryAdditionalShareBasisPoints / 100}% → ${next.recoveryAdditionalShareBasisPoints / 100}%.`);
  for (const [field, label] of [['recoveryEvents', 'Recovery assumption'], ['learningActions', 'Learning action'], ['rehearsals', 'Rehearsal']]) {
    const old = new Map(prior[field].map(row => [row.id, row])), retained = new Set(next[field].map(row => row.id));
    const describe = row => field === 'recoveryEvents'
      ? `${row.label}: ${row.eventCount} events × ${row.aggregateMinutesPerEvent} aggregate minutes; ${row.included ? 'Included' : 'Available'}; ${row.lifecycle}; ${support(row.workIds)}`
      : field === 'learningActions'
        ? `${row.context || row.promptId}; decision owner ${people.get(row.decisionOwnerPersonId) || 'to choose'}; ${support(row.workIds)}`
        : `${row.context || getRehearsalDefinition(row.definitionId, row.definitionVersion).name}; ${row.response || 'response to describe'}; ${row.observation ? `observation: ${row.observation}` : 'observation to record'}; reviewer ${people.get(row.reviewerPersonId) || 'to choose'}; ${support(row.workIds)}`;
    for (const row of next[field]) if (!same(old.get(row.id), row)) descriptions.push(`${label} ${old.has(row.id) ? 'changed' : 'added'}: ${describe(row)}.`);
    for (const row of prior[field]) if (!retained.has(row.id)) descriptions.push(`${label} removed: ${describe(row)}.`);
  }
  return descriptions;
}

function relationshipDescriptions(state) {
  const people = new Map(state.people.map(row => [row.id, row.label]));
  const teams = new Map(state.teams.map(row => [row.id, row.label]));
  const human = (id, action, unassigned) => id === null ? unassigned : `${people.get(id)} ${action}`;
  return {
    abilities: new Map(state.abilities.map(row => [row.id, getCapabilityDefinition('ability', row.definitionId, row.definitionVersion).action])),
    practices: new Map(state.practices.map(row => [row.id, getCapabilityDefinition('practice', row.definitionId, row.definitionVersion).action])),
    capabilityEvidence: new Map(state.capabilityEvidence.map(row => [row.id, `${row.stage} · ${row.observation} · ${people.get(row.recorderPersonId)}`])),
    contributions: new Map(state.contributions.map(row => [row.id,
      `${CONTRIBUTION_LABELS.get(row.categoryId)} · ${human(row.receiverPersonId, 'reviews', 'Reviewer to choose')} · ${human(row.decisionOwnerPersonId, 'decides', 'Decision owner to choose')}`])),
    connections: new Map(state.connections.map(row => [row.id,
      `${row.sharedObject ?? 'Shared work to describe'} · ${teams.get(row.senderTeamId)} → ${teams.get(row.receiverTeamId)} · ${human(row.receiverPersonId, 'receives', 'Receiving person to choose')}`])),
  };
}

export function mountInvestmentPanel(root, { studio, editing, onChange, onSource = () => {} }) {
  const document = root.ownerDocument, window = document.defaultView;
  const exchange = createPlanExchange(studio, editing);
  const get = name => root.querySelector(`[data-investment-${name}]`);
  const status = get('status'), previewElement = get('preview'), changes = get('changes');
  const select = get('preset'), file = get('file'), comparison = get('comparison');
  const buttons = Object.fromEntries([...root.querySelectorAll('[data-investment-action]')]
    .map(button => [button.dataset.investmentAction, button]));
  const presets = new Map(listPresets().map(preset => [preset.id, preset]));
  const cleanup = [];
  let projection = null, baseline = null, renderedPreview = null;
  let disposed = false, fileSelection = 0, downloadUrl = null;
  const trace = mountInvestmentTrace(root, { onSource, onHold: () => historyAction('baseline') });

  function listen(element, name, callback) {
    element.addEventListener(name, callback);
    cleanup.push(() => element.removeEventListener(name, callback));
  }
  function announce(message) { status.textContent = message; }
  function releaseDownload() {
    if (downloadUrl) window.URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  function summary(preview) {
    const fragment = document.createDocumentFragment();
    const add = text => { const item = document.createElement('li'); item.textContent = text; fragment.append(item); };
    if (preview.preset) add(`${preview.preset.label}: ${preview.preset.description}`);
    if (preview.sourceSchemaVersion !== preview.projection.state.schemaVersion) {
      add(`Updated this file from format ${preview.sourceSchemaVersion} to ${preview.projection.state.schemaVersion}.`);
    }
    if (preview.changes.plan.length) add(`Plan: ${preview.changes.plan.map(name => CHANGE_LABELS[name] ?? name).join(', ')}.`);
    if (preview.changes.purpose.length) add(`Purpose: ${preview.changes.purpose.map(name => PURPOSE_LABELS[name]).join(' · ')}`);
    if (preview.changes.changeSettings.length) changeDescriptions(projection.state, preview.projection.state).forEach(add);
    if (preview.changes.assuranceSettings.length) assuranceDescriptions(projection.state, preview.projection.state).forEach(add);
    describeScoreChanges(projection.state, preview.projection.state).forEach(add);
    describeArrangementChanges(projection.state, preview.projection.state).forEach(add);
    for (const [kind, label] of Object.entries(COLLECTION_LABELS)) {
      const change = preview.changes[kind];
      if (!change.added.length && !change.removed.length && !change.changed.length && !change.orderChanged) continue;
      const fields = new Set(change.changed.flatMap(row => row.fields));
      add(`${label}: ${change.added.length} added, ${change.removed.length} removed, ${change.changed.length} changed${fields.size ? ` (${[...fields].map(name => CHANGE_LABELS[name] ?? name).join(', ')})` : ''}${change.orderChanged ? '; updated order' : ''}.`);
    }
    const before = relationshipDescriptions(projection.state);
    const after = relationshipDescriptions(preview.projection.state);
    for (const [kind, label] of [['contributions', 'Contribution'], ['connections', 'Connection'], ['abilities', 'Customer ability'], ['practices', 'Team practice'], ['capabilityEvidence', 'Observation']]) {
      const change = preview.changes[kind];
      for (const id of change.added) add(`${label} added: ${after[kind].get(id)}.`);
      for (const id of change.removed) add(`${label} removed: ${before[kind].get(id)}.`);
      for (const row of change.changed) {
        const current = before[kind].get(row.id), proposed = after[kind].get(row.id);
        add(`${label} changed: ${current}${current === proposed ? '' : ` → ${proposed}`} (${row.fields.map(name => kind === 'connections' && name === 'status' ? 'connection status' : CHANGE_LABELS[name] ?? name).join(', ')}).`);
      }
      if (change.orderChanged) add(`${label}: updated order.`);
    }
    if (!fragment.childNodes.length) add('The plan values match the current plan.');
    changes.replaceChildren(fragment);
  }
  function refresh() {
    if (disposed) return;
    const next = studio.read(), nextBaseline = studio.readBaseline();
    const changed = next !== projection || nextBaseline !== baseline;
    projection = next;
    baseline = nextBaseline;
    const history = studio.readHistory();
    get('history').textContent = `${history.undoCount} changes to undo · ${history.redoCount} changes to redo`;
    buttons.undo.disabled = history.undoCount === 0;
    buttons.redo.disabled = history.redoCount === 0;
    buttons.restore.disabled = baseline === null;
    buttons.baseline.textContent = baseline ? 'Replace baseline' : 'Save baseline';
    if (changed) {
      trace.refresh(projectInvestmentTrace(projection, baseline?.projection ?? null));
      const rows = [
        [projection.result.plannedCommitmentCents === null ? 'Current known total' : 'Current total', money(projection.result.knownCommitmentCents)],
        [baseline?.projection.result.plannedCommitmentCents === null ? 'Baseline known total' : 'Baseline total', baseline ? money(baseline.projection.result.knownCommitmentCents) : 'Save a baseline to compare'],
      ];
      if (baseline) rows.push([
        projection.result.plannedCommitmentCents !== null && baseline.projection.result.plannedCommitmentCents !== null ? 'Change' : 'Change in known amount',
        money(projection.result.knownCommitmentCents - baseline.projection.result.knownCommitmentCents),
      ]);
      if (baseline) rows.push(['Change planning', changeDescriptions(baseline.projection.state, projection.state).join(' · ')
        || 'Framework, viewpoint, mapping and attention match the baseline.']);
      if (baseline) rows.push(['Quality and recovery', assuranceDescriptions(baseline.projection.state, projection.state).join(' · ')
        || 'Quality, recovery, learning and rehearsal records match the baseline.']);
      if (baseline) rows.push(['Score and availability', describeScoreChanges(baseline.projection.state, projection.state).join(' · ')
        || 'Timing, availability, dependencies, stages, waits and modeled decisions match the baseline.']);
      if (baseline) rows.push(['Team arrangements', describeArrangementChanges(baseline.projection.state, projection.state).join(' · ')
        || 'Template groupings and their connection directions match the baseline.']);
      comparison.replaceChildren(...rows.map(([label, value]) => {
        const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
        dt.textContent = label; dd.textContent = value; row.append(dt, dd); return row;
      }));
    }
    const view = exchange.read();
    previewElement.hidden = view.preview === null;
    buttons.apply.disabled = view.status !== 'preview';
    if (view.preview !== renderedPreview) {
      renderedPreview = view.preview;
      if (view.preview) {
        const result = view.preview.projection.result;
        get('preview-total').textContent = `${result.plannedCommitmentCents === null ? 'Known total' : 'Total'}: ${money(result.knownCommitmentCents)}`;
        summary(view.preview);
      }
    }
    if (view.error) announce(view.error.message);
    else if (view.pending) announce('Reading the plan…');
  }
  function refreshAll() { onChange(); refresh(); }
  function download() {
    const captured = exchange.captureExport();
    const url = window.URL.createObjectURL(new window.Blob([captured.text], { type: 'application/json' }));
    releaseDownload();
    downloadUrl = url;
    const link = document.createElement('a');
    link.href = url; link.download = 'investment-plan.json'; link.hidden = true;
    root.append(link);
    try { link.click(); if (!disposed) announce('Current plan downloaded.'); }
    finally { link.remove(); }
    // Keep the one owned URL alive after click. A later download or disposal
    // releases it, allowing the browser to capture the complete file first.
  }
  function historyAction(action) {
    if (projection !== studio.read() || action === 'restore' && baseline !== studio.readBaseline()) {
      refreshAll();
      if (!disposed) announce('The plan changed. Review it, then try again.');
      return;
    }
    const parked = editing.park();
    if (!parked.ok) { announce(parked.error.message); return; }
    const method = { undo: 'undo', redo: 'redo', baseline: 'setBaseline', restore: 'restoreBaseline' }[action];
    const result = studio[method](projection);
    refreshAll();
    if (disposed) return;
    announce(result.ok ? ({ undo: 'Change undone.', redo: 'Change restored.', baseline: 'Baseline saved.', restore: 'Baseline restored.' })[action] : result.error.message);
  }
  for (const preset of presets.values()) {
    const option = document.createElement('option'); option.value = preset.id; option.textContent = preset.label; select.append(option);
  }
  for (const button of Object.values(buttons)) button.disabled = false;
  file.disabled = false;
  listen(root, 'click', event => {
    const button = event.target.closest('button[data-investment-action]');
    if (!button || !root.contains(button) || button.disabled || disposed) return;
    const action = button.dataset.investmentAction;
    if (['undo', 'redo', 'baseline', 'restore'].includes(action)) { historyAction(action); return; }
    if (action === 'download') { try { download(); } catch { announce('Try downloading the plan again.'); } return; }
    fileSelection += 1;
    if (action === 'preset') {
      const preset = presets.get(select.value);
      if (!preset) return;
      const result = exchange.previewPreset(preset.id, preset.version);
      refresh();
      announce(result.ok ? 'Review the changes, then use this plan.' : result.error.message);
      if (result.ok) root.querySelector('#native-plan-preview-title').focus({ preventScroll: true });
    } else if (action === 'clear') {
      exchange.clear(); refresh(); announce('Current plan kept.'); buttons.preset.focus({ preventScroll: true });
    } else if (action === 'apply' && renderedPreview) {
      const result = exchange.apply(renderedPreview.token);
      refreshAll();
      if (disposed) return;
      announce(result.ok ? 'Plan updated. Undo restores the previous plan.' : result.error.message);
      if (result.ok) buttons.undo.focus({ preventScroll: true });
    }
  });
  listen(file, 'change', async () => {
    if (disposed) return;
    const selection = ++fileSelection;
    const selected = file.files?.[0];
    file.value = '';
    if (!selected) { exchange.clear(); refresh(); announce('Choose a plan file to preview.'); return; }
    const pending = exchange.selectFile(selected);
    refresh();
    const result = await pending;
    if (disposed || selection !== fileSelection) return;
    refresh();
    announce(result.ok ? 'Review the changes, then use this plan.' : result.error.message);
    if (result.ok) root.querySelector('#native-plan-preview-title').focus({ preventScroll: true });
  });
  refresh();
  return Object.freeze({ refresh, restoreTrace: origin => trace.restore(origin), dispose() {
    if (disposed) return;
    disposed = true; fileSelection += 1;
    for (const release of cleanup) release();
    cleanup.length = 0;
    exchange.dispose(); releaseDownload(); trace.dispose();
    select.replaceChildren();
    for (const button of Object.values(buttons)) button.disabled = true;
    file.disabled = true;
  } });
}
