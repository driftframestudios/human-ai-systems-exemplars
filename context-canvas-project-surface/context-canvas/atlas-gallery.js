import { getGalleryRows, renderGallerySvg, validateGalleryState } from './atlas-gallery-model.js';
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
    record: { version: 1, source: document.source, dataset: document.id, selection: state, values },
  };
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
  let urls = [];
  const release = values => values.forEach(url => browser.URL.revokeObjectURL(url));

  const commit = () => {
    const prepared = presentGallery(document, {
      population: form.elements.population.value,
      view: form.elements.view.value,
      cell: Number(form.elements.torque.value) * 10 + Number(form.elements.speed.value),
    });
    const serialized = JSON.stringify(prepared.record, null, 2);
    const nextUrls = [];
    try {
      nextUrls.push(browser.URL.createObjectURL(new browser.Blob([prepared.svg], { type: 'image/svg+xml' })));
      nextUrls.push(browser.URL.createObjectURL(new browser.Blob([serialized], { type: 'application/json' })));
    } catch (error) {
      release(nextUrls);
      throw error;
    }
    svgOwner.innerHTML = prepared.svg;
    tableOwner.innerHTML = prepared.table;
    status.textContent = prepared.summary;
    explanation.textContent = prepared.explanation;
    selection.textContent = serialized;
    full.href = svgDownload.href = nextUrls[0];
    jsonDownload.href = nextUrls[1];
    for (const label of form.querySelectorAll('[data-gallery-cell-control]')) {
      label.hidden = prepared.state.view !== 'conditions';
    }
    release(urls);
    urls = nextUrls;
  };

  commit();
  form.hidden = false;
  live.hidden = false;
  baseline.open = false;
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', commit);
  browser.addEventListener('pagehide', event => { if (!event.persisted) release(urls); });
}

if (typeof window !== 'undefined') {
  const root = window.document.querySelector('[data-atlas-gallery]');
  if (root) enhanceGallery(root, JSON.parse(root.querySelector('#atlas-gallery-data').textContent), window);
}
