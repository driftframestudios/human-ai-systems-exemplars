import { GALLERY_CELL_COUNT, GALLERY_POPULATIONS, getGalleryRows, renderGallerySvg, validateGalleryDocument, validateGalleryState } from './atlas-gallery-model.js';
import { renderGalleryTable } from './atlas-gallery-table.js';

const EXPLANATIONS = Object.freeze({
  rate: 'Rates compare Machine failure labels per 100 records within each product type. Counts and denominators remain visible; product populations share a fixed scale.',
  count: 'Counts compare the number of Machine failure labels. Unequal product-type denominators remain visible, and the rate view answers the complementary frequency question.',
  reconciliation: 'The four exclusive combinations preserve the Machine failure label and the union of mode flags as distinct definitions. Every selected record belongs to one combination.',
  conditions: 'Each cell uses fixed speed and torque bins and a common rate scale. The selected cell retains its numerator, denominator and availability. Empty and observed-zero cells have different meanings.',
});

/** Pure transition; native controls supply bounded values. O(1) time and space. */
export function galleryState({ population, view, cell }) {
  return validateGalleryState({ population, view, cell });
}

function gallerySource(document) {
  if (!Object.hasOwn(document, 'source')) return undefined;
  const { title, doi, sha256, license, sourceType } = document.source;
  return { title, doi, sha256, license, sourceType };
}

/** After raw model validation, copy only declared fields into owned containers.
 * O(4 * 100) time and retained space; surplus metadata is never traversed.
 */
function snapshotGallery(document) {
  const snapshot = {
    id: document.id,
    version: document.version,
    timeBasis: document.timeBasis,
    populations: GALLERY_POPULATIONS.map((type, index) => {
      const p = document.populations[index];
      return {
        type: p.type, records: p.records, machineFailure: p.machineFailure,
        machineFailurePer100: p.machineFailurePer100, availability: p.availability,
        anyModeFlag: p.anyModeFlag, disagreements: p.disagreements,
        agreement: {
          neither: p.agreement.neither, modeOnly: p.agreement.modeOnly,
          labelOnly: p.agreement.labelOnly, both: p.agreement.both,
        },
      };
    }),
    bins: {
      speedEdges: Array.from({ length: 11 }, (_, index) => document.bins.speedEdges[index]),
      torqueEdges: Array.from({ length: 11 }, (_, index) => document.bins.torqueEdges[index]),
    },
    scales: {
      rateMax: document.scales.rateMax, countMax: document.scales.countMax,
      conditionsRateMax: document.scales.conditionsRateMax,
    },
    heatmaps: Object.fromEntries(GALLERY_POPULATIONS.map(type => {
      const heatmap = document.heatmaps[type];
      const outside = heatmap.outOfRange;
      return [type, {
        cells: Array.from({ length: GALLERY_CELL_COUNT }, (_, index) => {
          const cell = heatmap.cells[index];
          return {
            speedIndex: cell.speedIndex, torqueIndex: cell.torqueIndex,
            speedLower: cell.speedLower, speedUpper: cell.speedUpper,
            torqueLower: cell.torqueLower, torqueUpper: cell.torqueUpper,
            records: cell.records, failures: cell.failures,
            ratePer100: cell.ratePer100, availability: cell.availability,
          };
        }),
        outOfRange: {
          records: outside.records, failures: outside.failures,
          ratePer100: outside.ratePer100, availability: outside.availability,
          speedBelow: outside.speedBelow, speedAbove: outside.speedAbove,
          torqueBelow: outside.torqueBelow, torqueAbove: outside.torqueAbove,
        },
      }];
    })),
  };
  if (Object.hasOwn(document, 'source')) snapshot.source = gallerySource(document);
  return snapshot;
}

/** SVG, native values, summary and export are prepared before the DOM commit.
 * O(rendered rows and marks + output bytes); source records remain unchanged.
 */
export function presentGallery(document, input) {
  const state = galleryState(input);
  const values = getGalleryRows(document, state);
  const described = state.view === 'conditions' ? [values.rows[state.cell]] : values.rows;
  const summary = `${values.caption}. ${described.map(row => `${row.label}: ${row.values.map((value, index) => `${values.columns[index + 1]} ${value}`).join('; ')}.`).join(' ')}`;
  return {
    state,
    svg: renderGallerySvg(document, state, 'atlas-selected'),
    table: renderGalleryTable(values),
    summary,
    explanation: EXPLANATIONS[state.view],
    record: { version: 1, source: gallerySource(document), dataset: document.id, selection: state, values },
  };
}

function galleryFailure(stage, cause, acceptedState = null) {
  return Object.assign(new Error(`Atlas gallery ${stage} failed.`, { cause }), {
    stage, code: `ATLAS_GALLERY_${stage.toUpperCase()}_FAILED`,
    acceptedState: acceptedState ? { ...acceptedState } : null,
  });
}

function staticGallery(root) {
  const form = root.querySelector('[data-gallery-controls]');
  const live = root.querySelector('[data-gallery-live]');
  const baseline = root.querySelector('[data-gallery-baseline]');
  if (form) form.hidden = true;
  if (live) live.hidden = true;
  if (baseline) baseline.open = true;
  for (const selector of ['[data-gallery-full]', '[data-gallery-svg-download]', '[data-gallery-json-download]']) {
    root.querySelector(selector)?.removeAttribute('href');
  }
  const selection = root.querySelector('#atlas-gallery-selection');
  if (selection) selection.textContent = 'null';
}

function reportGalleryFailure(root, browser, error, retained = false) {
  let notice = root.querySelector('[data-gallery-error]');
  if (!notice) {
    notice = root.ownerDocument.createElement('p');
    notice.className = 'table-note';
    notice.setAttribute('data-gallery-error', '');
    notice.setAttribute('role', 'status');
    const form = root.querySelector('[data-gallery-controls]');
    if (form) form.before(notice);
    else root.prepend(notice);
  }
  notice.textContent = retained
    ? 'The previous selection is still shown. This change could not be prepared; try again or use the reference views.'
    : 'The reference views remain available. The live gallery could not be opened; reload to try again.';
  notice.hidden = false;
  browser.console?.warn(error);
  return notice;
}

/** One page-owned enhancement. Existing static references remain the recovery route. */
export function enhanceGallery(root, document, browser = globalThis) {
  const form = root.querySelector('[data-gallery-controls]');
  const live = root.querySelector('[data-gallery-live]');
  const baseline = root.querySelector('[data-gallery-baseline]');
  const svgOwner = root.querySelector('[data-gallery-svg]');
  const tableOwner = root.querySelector('[data-gallery-table]');
  const status = root.querySelector('[data-gallery-status]');
  const explanation = root.querySelector('[data-gallery-explanation]');
  const full = root.querySelector('[data-gallery-full]');
  const svgDownload = root.querySelector('[data-gallery-svg-download]');
  const jsonDownload = root.querySelector('[data-gallery-json-download]');
  const selection = root.querySelector('#atlas-gallery-selection');
  let accepted = null;
  let ownedDocument = null;
  let notice = null;
  let destroyed = false;
  let cellControls = [];
  const release = urls => {
    for (const url of urls) {
      try { browser.URL.revokeObjectURL(url); }
      catch (cause) { browser.console?.warn(galleryFailure('cleanup', cause, accepted?.state)); }
    }
  };
  const readControls = () => ({
      population: form.elements.population.value,
      view: form.elements.view.value,
      cell: Number(form.elements.torque.value) * 10 + Number(form.elements.speed.value),
  });
  const restoreControls = state => {
    form.elements.population.value = state.population;
    form.elements.view.value = state.view;
    form.elements.speed.value = String(state.cell % 10);
    form.elements.torque.value = String(Math.floor(state.cell / 10));
  };
  const publish = prepared => {
    svgOwner.innerHTML = prepared.svg;
    tableOwner.innerHTML = prepared.table;
    status.textContent = prepared.summary;
    explanation.textContent = prepared.explanation;
    selection.textContent = prepared.serialized;
    full.href = svgDownload.href = prepared.urls[0];
    jsonDownload.href = prepared.urls[1];
    for (const label of cellControls) {
      label.hidden = prepared.state.view !== 'conditions';
    }
    restoreControls(prepared.state);
  };
  const commit = () => {
    if (destroyed) return false;
    let stage = 'prepare';
    let candidateUrls = [];
    try {
      const prepared = presentGallery(ownedDocument, readControls());
      const serialized = JSON.stringify(prepared.record, null, 2);
      stage = 'export';
      candidateUrls.push(browser.URL.createObjectURL(new browser.Blob([prepared.svg], { type: 'image/svg+xml' })));
      candidateUrls.push(browser.URL.createObjectURL(new browser.Blob([serialized], { type: 'application/json' })));
      const candidate = { ...prepared, serialized, urls: candidateUrls };
      stage = 'commit';
      publish(candidate);
      const previousUrls = accepted?.urls ?? [];
      accepted = candidate;
      candidateUrls = [];
      release(previousUrls);
      if (notice) notice.hidden = true;
      return true;
    } catch (cause) {
      const error = galleryFailure(stage, cause, accepted?.state);
      let retained = false;
      if (accepted) {
        try {
          if (stage === 'commit') publish(accepted);
          else restoreControls(accepted.state);
          retained = true;
        } catch (recoveryCause) { error.recoveryCause = recoveryCause; }
      }
      if (!retained) destroy();
      notice = reportGalleryFailure(root, browser, error, retained);
      return false;
    } finally {
      release(candidateUrls);
    }
  };

  const onSubmit = event => event.preventDefault();
  const onChange = () => { commit(); };
  const onPageHide = event => { if (!event.persisted) destroy(); };
  function destroy() {
    notice?.remove();
    notice = null;
    if (destroyed) return;
    destroyed = true;
    form?.removeEventListener('submit', onSubmit);
    form?.removeEventListener('change', onChange);
    browser.removeEventListener('pagehide', onPageHide);
    release(accepted?.urls ?? []);
    accepted = null;
    ownedDocument = null;
    staticGallery(root);
  }

  try {
    if ([form, live, baseline, svgOwner, tableOwner, status, explanation, full,
      svgDownload, jsonDownload, selection].some(node => !node) ||
      ['population', 'view', 'speed', 'torque'].some(name => !form.elements[name])) {
      throw new TypeError('The gallery requires its native controls and presentation owners.');
    }
    validateGalleryDocument(document);
    ownedDocument = snapshotGallery(document);
    cellControls = [...form.querySelectorAll('[data-gallery-cell-control]')];
    if (commit()) {
      form.hidden = false;
      live.hidden = false;
      baseline.open = false;
      form.addEventListener('submit', onSubmit);
      form.addEventListener('change', onChange);
      browser.addEventListener('pagehide', onPageHide);
    }
  } catch (cause) {
    const error = galleryFailure('initialization', cause, accepted?.state);
    destroy();
    notice = reportGalleryFailure(root, browser, error);
  }
  return { destroy };
}

if (typeof window !== 'undefined') {
  const root = window.document.querySelector('[data-atlas-gallery]');
  if (root) {
    try { enhanceGallery(root, JSON.parse(root.querySelector('#atlas-gallery-data').textContent), window); }
    catch (cause) {
      staticGallery(root);
      reportGalleryFailure(root, window, galleryFailure('initialization', cause));
    }
  }
}
