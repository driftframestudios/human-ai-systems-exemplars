import { createPlanExchange } from './exchange.mjs';
import { listPresets } from './presets.mjs';
import { money } from './display.mjs';
import { createDownloadOwner } from './browser-download.mjs';
import { createInvestmentWorkbench } from './investment-workbench.mjs';
import { projectInvestment } from './investment-projection.mjs';
import { encodeInvestment } from './investment-state.mjs';

const DECKS = Object.freeze([
  { id: 'plan', title: 'Plan investment', eyebrow: 'Accepted plan', detail: 'Staffing and shared work' },
  { id: 'compare', title: 'Compare a change', eyebrow: 'Baseline comparison', detail: 'Save, change and recover' },
  { id: 'exchange', title: 'Keep a plan', eyebrow: 'Plans and reports', detail: 'Open, replace or download' },
]);

export function mountInvestmentPanel(root, { studio, editing, onChange, onOpenSession }) {
  const document = root.ownerDocument;
  const exchange = createPlanExchange(studio, editing);
  const get = name => root.querySelector(`[data-investment-${name}]`);
  const status = get('status'), previewElement = get('preview'), changes = get('changes');
  const select = get('preset'), file = get('file'), comparison = get('comparison');
  const buttons = Object.fromEntries([...root.querySelectorAll('[data-investment-action]')]
    .map(button => [button.dataset.investmentAction, button]));
  const presets = new Map(listPresets().map(preset => [preset.id, preset]));
  const cleanup = [];
  let projection = null, baseline = null, renderedPreview = null;
  let disposed = false, fileSelection = 0;
  const downloads = createDownloadOwner(root);
  const shelf = get('deck-shelf');
  const panels = new Map([...root.querySelectorAll('[data-investment-deck-panel]')]
    .map(panel => [panel.dataset.investmentDeckPanel, panel]));
  let selectedDeck = 'plan';

  function selectDeck(id) {
    if (disposed || !panels.has(id)) return;
    selectedDeck = id;
    if (id !== 'plan') workbench.release();
    for (const [key, panel] of panels) panel.hidden = key !== id;
    for (const button of shelf.querySelectorAll('[data-investment-deck]'))
      button.setAttribute('aria-pressed', String(button.dataset.investmentDeck === id));
    get('loaded').dataset.investmentLoadedDeck = id;
  }
  function renderReadings(host, rows) {
    host.replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = value; row.append(dt, dd); return row;
    }));
  }
  function refreshDecks() {
    if (!shelf.children.length) {
      const rail = document.createElement('nav'); rail.className = 'investment-utility-rail'; rail.setAttribute('aria-label', 'Investment views');
      for (const deck of DECKS) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = deck.title;
        button.dataset.investmentDeck = deck.id; button.setAttribute('aria-controls', `native-investment-deck-${deck.id}`);
        button.addEventListener('click', () => selectDeck(deck.id)); rail.append(button);
      }
      shelf.append(rail);
    }
    workbench.render(get('financials'));
    selectDeck(selectedDeck);
  }

  function listen(element, name, callback) {
    element.addEventListener(name, callback);
    cleanup.push(() => element.removeEventListener(name, callback));
  }
  function announce(message) { status.textContent = message; }
  function previewPreset(id) {
    if (disposed) return;
    const preset = presets.get(id);
    if (!preset) return;
    fileSelection += 1;
    select.value = id;
    const result = exchange.previewPreset(preset.id, preset.version);
    refresh();
    announce(result.ok ? 'Review the replacement example, then use this plan.' : result.error.message);
    if (result.ok) {
      selectDeck('exchange');
      const destination = root.querySelector('#native-plan-preview-title');
      destination.scrollIntoView({ block: 'start' }); destination.focus({ preventScroll: true });
    }
    return result;
  }
  function summary(preview) {
    const state = preview.projection.state;
    const cadence = state.scoreSettings.cadence;
    const lines = [preview.preset?.label ?? state.planId, preview.preset?.description ?? 'Open this saved arrangement.'];
    if (cadence) lines.push(`${cadence.periods.length} ${cadence.basis === 'sprint' ? 'sprints' : 'business quarters'}.`);
    lines.push('This replaces the current plan. Undo restores it.');
    if (preview.sourceSchemaVersion !== state.schemaVersion)
      lines.push(`Updated this file from format ${preview.sourceSchemaVersion} to ${state.schemaVersion}.`);
    changes.replaceChildren(...lines.map(text => {
      const paragraph = document.createElement('p'); paragraph.textContent = text; return paragraph;
    }));
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
      refreshDecks();
      const rows = [
        [projection.result.plannedCommitmentCents === null ? 'Current known total' : 'Current total', money(projection.result.knownCommitmentCents)],
        [baseline?.projection.result.plannedCommitmentCents === null ? 'Baseline known total' : 'Baseline total', baseline ? money(baseline.projection.result.knownCommitmentCents) : 'Save a baseline to compare'],
      ];
      if (baseline) rows.push([
        projection.result.plannedCommitmentCents !== null && baseline.projection.result.plannedCommitmentCents !== null ? 'Change' : 'Change in known amount',
        money(projection.result.knownCommitmentCents - baseline.projection.result.knownCommitmentCents),
      ]);
      renderReadings(comparison, rows);
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
    if (downloads.request({ text: captured.text, type: 'application/json', filename: 'investment-plan.json' }) && !disposed)
      announce('Current plan prepared for download.');
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
    if (action === 'download') { try { download(); } catch { if (!disposed) announce('Try downloading the plan again.'); } return; }
    fileSelection += 1;
    if (action === 'preset') {
      previewPreset(select.value);
    } else if (action === 'clear') {
      exchange.clear(); refresh(); announce('Current plan kept.'); buttons.preset.focus({ preventScroll: true });
    } else if (action === 'apply' && renderedPreview) {
      const result = exchange.apply(renderedPreview.token);
      refreshAll();
      if (disposed) return;
      announce(result.ok ? 'Plan updated. Undo restores the previous plan.' : result.error.message);
      if (result.ok) { selectDeck('compare'); buttons.undo.focus({ preventScroll: true }); }
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
    if (result.ok) { selectDeck('exchange'); root.querySelector('#native-plan-preview-title').focus({ preventScroll: true }); }
  });
  const workbench = createInvestmentWorkbench({
    getModel: () => projectInvestment(studio.read()),
    change(mutator, message, gesture = null) {
      if (disposed) return;
      const parked = editing.park();
      if (!parked.ok) { announce(parked.error.message); return; }
      const expected = studio.read(), model = projectInvestment(expected);
      mutator(model);
      const result = studio.applyCommand({ type: 'investment.settings.replace', investmentSettings: encodeInvestment(model.investment.decks) }, expected, gesture);
      refreshAll();
      if (!disposed && (!result.ok || message)) announce(result.ok ? message : result.error.message);
    },
    setFunding(id, funding) {
      if (disposed) return;
      const parked = editing.park();
      if (!parked.ok) { announce(parked.error.message); return; }
      const result = studio.applyCommand({ type: 'work.funding.set', workId: id, funding: funding === 'funded' ? 'allocated' : 'additional' }, studio.read());
      refreshAll(); if (!disposed) announce(result.ok ? 'Session funding updated. Undo restores it.' : result.error.message);
    },
    openSession: onOpenSession,
  });
  refresh();
  return Object.freeze({ refresh, previewPreset, selectDeck, dispose() {
    if (disposed) return;
    disposed = true; fileSelection += 1;
    for (const release of cleanup) release();
    cleanup.length = 0;
    exchange.dispose(); downloads.dispose(); workbench.dispose();
    select.replaceChildren();
    for (const button of Object.values(buttons)) button.disabled = true;
    file.disabled = true;
    shelf.replaceChildren();
    for (const panel of panels.values()) panel.hidden = false;
    delete get('loaded').dataset.investmentLoadedDeck;
  } });
}
