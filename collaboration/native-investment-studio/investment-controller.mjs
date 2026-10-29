import { createPlanExchange } from './exchange.mjs';
import { listPresets } from './presets.mjs';
import { money } from './display.mjs';
import { PURPOSE_LABELS } from './purpose-controller.mjs';

const CHANGE_LABELS = Object.freeze({
  planId: 'plan name', revision: 'saved revision', schemaVersion: 'file format',
  horizonWeeks: 'plan length', label: 'names', fundedMinutes: 'funded time',
  rateCentsPerHour: 'hourly rates', personIds: 'participants', teamId: 'team',
  minutesPerOccurrence: 'session duration', occurrences: 'session count',
  funding: 'funding', status: 'work status', timing: 'timing', practiceId: 'practice', workIds: 'supporting work',
});
const COLLECTION_LABELS = Object.freeze({ people: 'People', teams: 'Teams', work: 'Work', practices: 'Practices' });

export function mountInvestmentPanel(root, { studio, editing, onChange }) {
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
    for (const [kind, label] of Object.entries(COLLECTION_LABELS)) {
      const change = preview.changes[kind];
      if (!change.added.length && !change.removed.length && !change.changed.length && !change.orderChanged) continue;
      const fields = new Set(change.changed.flatMap(row => row.fields));
      add(`${label}: ${change.added.length} added, ${change.removed.length} removed, ${change.changed.length} changed${fields.size ? ` (${[...fields].map(name => CHANGE_LABELS[name] ?? name).join(', ')})` : ''}${change.orderChanged ? '; updated order' : ''}.`);
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
      const rows = [
        [projection.result.standing === 'priced' ? 'Current total' : 'Current known total', money(projection.result.knownCommitmentCents)],
        [baseline?.projection.result.standing === 'priced' ? 'Baseline total' : 'Baseline known total', baseline ? money(baseline.projection.result.knownCommitmentCents) : 'Save a baseline to compare'],
      ];
      if (baseline) rows.push([
        projection.result.standing === 'priced' && baseline.projection.result.standing === 'priced' ? 'Change' : 'Change in known amount',
        money(projection.result.knownCommitmentCents - baseline.projection.result.knownCommitmentCents),
      ]);
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
        get('preview-total').textContent = `${result.standing === 'priced' ? 'Total' : 'Known total'}: ${money(result.knownCommitmentCents)}`;
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
  return Object.freeze({ refresh, dispose() {
    if (disposed) return;
    disposed = true; fileSelection += 1;
    for (const release of cleanup) release();
    cleanup.length = 0;
    exchange.dispose(); releaseDownload();
    select.replaceChildren();
    for (const button of Object.values(buttons)) button.disabled = true;
    file.disabled = true;
  } });
}
