/** Atlas manufacturing gallery projection. O(serialized data + rendered rows).
 * Source data and pure SVG/table owners precede this page composition.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getGalleryRows } from '../context-canvas-project-surface/context-canvas/atlas-gallery-model.js';
import { escapeGalleryText, galleryJsonText, renderGalleryTable } from '../context-canvas-project-surface/context-canvas/atlas-gallery-table.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PAGE = 'context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html';
const DATA = 'context-canvas-project-surface/data/visualization-fidelity/ai4i/gallery.v1.json';
export const GALLERY_START = '<!-- atlas-manufacturing-gallery:start -->';
export const GALLERY_END = '<!-- atlas-manufacturing-gallery:end -->';
const ANCHOR = '      <div class="content__container cobalt-operating-field"><div class="content content--wide">\n        <section aria-labelledby="prototype-title">';

export const GALLERY_VIEWS = Object.freeze([
  { id: 'rate', title: 'Compare frequency within product types', explanation: 'The rate view divides each product type\'s machine-failure count by its own record count. All three types share the same scale; the exact counts remain alongside the rates.' },
  { id: 'count', title: 'Compare the number of labeled failures', explanation: 'The count view makes event volume visible. Product types have unequal representation in the released file, so the rate view supplies a different, complementary comparison.' },
  { id: 'reconciliation', title: 'Reconcile two failure definitions', explanation: 'The Machine failure label and the presence of any failure-mode flag describe separate source fields. Four exclusive combinations account for every record. Individual mode flags overlap and retain their separate counts in the source summary.' },
  { id: 'conditions', title: 'Inspect speed and torque together', explanation: 'A fixed grid relates operating conditions to observed machine-failure frequency. Each cell retains its record count. Empty bins have an unavailable rate; an observed zero has records and zero labeled failures. Cell colors summarize the released records, while diagnosis and intervention need additional evidence.' },
]);

export function replaceGallery(page, fragment) {
  const start = page.indexOf(GALLERY_START);
  const end = page.indexOf(GALLERY_END);
  if (start >= 0) {
    assert.ok(end > start && page.indexOf(GALLERY_START, start + 1) === -1 &&
      page.indexOf(GALLERY_END, end + 1) === -1, 'One complete gallery projection boundary is required.');
    return page.slice(0, start) + fragment + page.slice(end + GALLERY_END.length);
  }
  assert.equal(end, -1, 'A gallery end marker requires its opening marker.');
  assert.equal(page.split(ANCHOR).length, 2, 'The existing selector supplies one insertion point.');
  return page.replace(ANCHOR, `${fragment}\n\n${ANCHOR}`);
}

export function renderGallerySection(document) {
  const staticViews = GALLERY_VIEWS.map(({ id, title, explanation }, index) => {
    const table = renderGalleryTable(getGalleryRows(document, { population: 'all', view: id, cell: 0 }));
    const file = `atlas_ai4i_${id}.svg`;
    return `<details class="conditioning-static-equivalent"${index === 0 ? ' open' : ''}>
      <summary>${escapeGalleryText(title)}</summary>
      <p>${escapeGalleryText(explanation)}</p>
      <figure class="story-visual blueprint-pop-visual table-span-all">
        <div class="table-scroll atlas-gallery-figure" role="region" tabindex="0" aria-label="${escapeGalleryText(title)} figure">
          <a class="story-visual__open" href="../img/plot/${file}" aria-label="View ${escapeGalleryText(title.toLowerCase())} at full size"><img src="../img/plot/${file}" width="1200" height="760" loading="lazy" alt="${escapeGalleryText(title)} for the released AI4I records. Exact values follow in the table."></a>
        </div>
        <figcaption class="table-note">All 10,000 released records. The full-size SVG carries its population, units, source and reading context.</figcaption>
      </figure>
      <div class="table-scroll${id === 'conditions' ? ' table-scroll--contained' : ''}" role="region" tabindex="0" aria-label="${escapeGalleryText(title)} exact values">${table}</div>
    </details>`;
  }).join('\n');
  const rangeOptions = (start, step, unit) => Array.from({ length: 10 }, (_, i) =>
    `<option value="${i}">${start + step * i} to ${start + step * (i + 1)} ${unit}</option>`).join('');
  return `${GALLERY_START}
      <div class="content__container ai-systems-implementation-field"><div class="content content--wide">
        <section class="atlas-reference atlas-gallery" aria-labelledby="gallery-title" data-atlas-gallery>
          <h2 id="gallery-title" class="txt-h2 architecture-track-title">One population, several useful readings</h2>
          <p class="debrief-lead">A manufacturing review often brings several reasonable questions to the same records. Counts show volume, rates show observed frequency, and reconciliation reveals when definitions lead to different totals.</p>
          <p>The public AI4I 2020 dataset supplies 10,000 generated operating records across three product-quality types. The released file contains 339 Machine failure labels and 348 records with at least one failure-mode flag. Their 27 disagreements are part of the example. Product type supplies the comparison groups; operating conditions supply the matrix. Chronological and site-level interpretations require their own fields.</p>
          <form class="atlas-gallery-controls" data-gallery-controls hidden aria-label="Manufacturing gallery views">
            <label>Product population<select name="population"><option value="all">All product types</option><option value="L">Product type L</option><option value="M">Product type M</option><option value="H">Product type H</option></select></label>
            <label>Question and view<select name="view">${GALLERY_VIEWS.map(view => `<option value="${view.id}">${escapeGalleryText(view.title)}</option>`).join('')}</select></label>
            <label data-gallery-cell-control hidden>Speed bin<select name="speed">${rangeOptions(1000, 200, 'rpm')}</select></label>
            <label data-gallery-cell-control hidden>Torque bin<select name="torque">${rangeOptions(0, 10, 'N m')}</select></label>
          </form>
          <div data-gallery-live hidden>
            <p class="table-note" data-gallery-status role="status" aria-live="polite"></p>
            <div class="table-scroll atlas-gallery-figure" role="region" tabindex="0" aria-label="Selected manufacturing figure" data-gallery-svg></div>
            <p><a data-gallery-full target="_blank" rel="noopener">View selected figure at full size</a> · <a data-gallery-svg-download download="atlas-selection.svg">Download selected SVG</a> · <a data-gallery-json-download download="atlas-selection.json">Download selected values and context</a></p>
            <p data-gallery-explanation></p>
            <div class="table-scroll table-scroll--contained" role="region" tabindex="0" aria-label="Selected manufacturing exact values" data-gallery-table></div>
          </div>
          <details class="conditioning-static-equivalent" data-gallery-baseline open>
            <summary>Four complete reference views and exact values</summary>
            ${staticViews}
          </details>
          <h3 class="txt-h4">A fixed grid keeps the comparison stable</h3>
          <p>The operating-condition matrix uses 200 rpm speed bins from 1,000 to 3,000 rpm and 10 N m torque bins from 0 to 100 N m. Bins include the lower edge and exclude the upper edge; the final bin includes both edges. Out-of-range records retain an explicit count. Product selection changes the records and denominators while the bin edges and rate scale stay fixed. The exact-value table preserves every cell, including empty cells.</p>
          <p>These descriptive rates characterize the released file. Sparse cells retain their support counts rather than acquiring a confidence interval from a presumed sampling process. A cell with one failure among one record and a cell with many observations deserve different follow-up questions. The same distinction applies when a visually quiet bin contains little evidence.</p>
          <p class="table-note"><strong>Source and method:</strong> <a href="https://doi.org/10.24432/C5HS5C">AI4I 2020 Predictive Maintenance Dataset, UCI Machine Learning Repository</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Rates use 100 times Machine failure labels divided by records in the selected group. <a href="../data/visualization-fidelity/ai4i/summary.v1.json">Definition and product-type summary</a> · <a href="../data/visualization-fidelity/ai4i/gallery.v1.json">Complete gallery values</a> · <a href="../data/visualization-fidelity/ai4i/README.md">Source and derivation</a>.</p>
          <h3 id="visualization-practice-title" class="txt-h4">Four practices keep a figure useful across destinations</h3>
          <p>A shared foundation connects the question, data meaning and chosen form. The receiving medium then brings a different practical responsibility.</p>
          <dl class="debrief-at-glance ai-systems-scan">
            <div><dt>Data visualization foundations</dt><dd>Establish the source, counting unit, denominator, uncertainty and reader operation before choosing marks. Preserve subgroup differences, empty populations and transformation choices.</dd></div>
            <div><dt>Conversation data visualization</dt><dd>Use a bounded visual to clarify the next question. Keep recoverable values and a provisional interpretation beside the sketch so a changed assumption can change the reading.</dd></div>
            <div><dt>Web data visualization</dt><dd>Keep controls, figure, exact-value table and export on the same population and view. Static references, full-size routes and native semantics give the comparison several usable entry points.</dd></div>
            <div><dt>PDF data visualization</dt><dd>Design for the figure's physical placement. Type, labels, source context and the evidence companion remain readable at the final size, with vector output where the marks benefit.</dd></div>
          </dl>
          <p>These practices connect the Atlas's form guidance with production choices. Sparse observations, logarithmic scales, overlapping categories and aggregated rates each earn a specific interpretation decision. A fitting figure makes that decision inspectable.</p>
          <script type="application/json" id="atlas-gallery-data">${galleryJsonText(document)}</script>
          <script type="application/json" id="atlas-gallery-selection">null</script>
        </section>
      </div></div>
${GALLERY_END}`;
}

export async function buildGalleryPage({ check = false } = {}) {
  const document = JSON.parse(await readFile(resolve(ROOT, DATA), 'utf8'));
  const page = await readFile(resolve(ROOT, PAGE), 'utf8');
  let output = replaceGallery(page, renderGallerySection(document));
  if (!output.includes('src="atlas-gallery.js"')) {
    output = output.replace('<script src="canvas-shell.js" defer></script>',
      '<script src="canvas-shell.js" defer></script>\n    <script type="module" src="atlas-gallery.js"></script>');
  }
  if (!output.includes('href="#gallery-title"')) {
    output = output.replace('<li><a href="#prototype-title">', '<li><a href="#gallery-title">Coordinated gallery<br>Compare product populations</a></li>\n          <li><a href="#prototype-title">');
  }
  if (check) assert.equal(page, output, 'The Atlas gallery projection matches its admitted data and renderer.');
  else await writeFile(resolve(ROOT, PAGE), output);
  return { page: PAGE, staticViews: GALLERY_VIEWS.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await buildGalleryPage({ check: process.argv.includes('--check') })));
}
