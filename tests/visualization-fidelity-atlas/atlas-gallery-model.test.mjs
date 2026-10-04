import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAtlasGallery, galleryDocument, readVerifiedGalleryDocument,
  DEFAULT_GALLERY_STATE, GALLERY_POPULATIONS, GALLERY_VIEWS,
  getGalleryRows, renderGallerySvg, validateGalleryDocument, validateGalleryState,
} from '../../tools/atlas-gallery-model.mjs';
import { escapeGalleryText } from '../../context-canvas-project-surface/context-canvas/atlas-gallery-model.js';

function record(id, type, speed, torque, failure = 0, flags = {}) {
  return { id, type, rotationalSpeedRpm: speed, torqueNm: torque, machineFailure: failure,
    modeFlags: { TWF: 0, HDF: 0, PWF: 0, OSF: 0, RNF: 0, ...flags } };
}
const fixture = () => [
  record(1, 'L', 1000, 0),
  record(2, 'L', 1199, 9.9, 1),
  record(3, 'M', 1200, 10, 0, { TWF: 1 }),
  record(4, 'H', 3000, 100, 1, { TWF: 1, HDF: 1 }),
];
const state = (population = 'all', view = 'rate', cell = 0) => ({ population, view, cell });
function freezeTree(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeTree); Object.freeze(value); }
  return value;
}
let released;
const release = () => released ??= readVerifiedGalleryDocument();

test('released summaries retain independent 339 / 348 / 27 and cohort counts', async () => {
  const document = await release();
  assert.deepEqual(document.populations.map(p => [p.type, p.records, p.machineFailure, p.anyModeFlag, p.disagreements]), [
    ['all', 10000, 339, 348, 27], ['L', 6000, 235, 243, 16], ['M', 2997, 83, 81, 6], ['H', 1003, 21, 24, 5],
  ]);
  assert.deepEqual(document.populations[0].agreement, { neither: 9643, modeOnly: 18, labelOnly: 9, both: 330 });
  assert.equal(document.source.sha256, 'dc6630cd9b1f0f853922fad78a1b6436570d3f1ec863f1dd5c4340ac56bc8a8e');
  assert.equal(document.source.doi, 'https://doi.org/10.24432/C5HS5C');
  assert.equal(document.source.license, 'CC-BY-4.0');
  assert.equal(document.source.sourceType, 'published-generated-records');
});

test('released heatmaps contain exactly 100 cells each and account for all 10000 records', async () => {
  const document = await release();
  for (const [i, type] of GALLERY_POPULATIONS.entries()) {
    const heatmap = document.heatmaps[type];
    assert.equal(heatmap.cells.length, 100);
    assert.equal(heatmap.cells.reduce((sum, cell) => sum + cell.records, 0), [10000, 6000, 2997, 1003][i]);
    assert.equal(heatmap.cells.reduce((sum, cell) => sum + cell.failures, 0), [339, 235, 83, 21][i]);
    assert.equal(heatmap.outOfRange.records, 0);
  }
  assert.deepEqual(document.scales, { rateMax: 5, countMax: 250, conditionsRateMax: 100 });
  assert.equal(validateGalleryDocument(document), document);
});

test('independent fixture proves lower, interior, and final inclusive bin boundaries', () => {
  const document = galleryDocument(fixture());
  assert.deepEqual(document.bins.speedEdges, [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000]);
  assert.deepEqual(document.bins.torqueEdges, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  assert.deepEqual(document.heatmaps.all.cells[0], {
    speedIndex: 0, torqueIndex: 0, speedLower: 1000, speedUpper: 1200, torqueLower: 0, torqueUpper: 10,
    records: 2, failures: 1, ratePer100: 50, availability: 'available',
  });
  assert.equal(document.heatmaps.all.cells[11].records, 1);
  assert.equal(document.heatmaps.all.cells[11].failures, 0);
  assert.equal(document.heatmaps.all.cells[99].records, 1);
  assert.equal(document.heatmaps.all.cells[99].ratePer100, 100);
  assert.equal(document.heatmaps.all.cells.reduce((sum, cell) => sum + cell.records, 0), 4);
  assert.equal(document.heatmaps.L.cells[0].records, 2);
  assert.equal(document.heatmaps.M.cells[11].records, 1);
  assert.equal(document.heatmaps.H.cells[99].records, 1);
});

test('out-of-range records remain in summaries and are counted once with overlapping reasons', () => {
  const document = galleryDocument([
    record(1, 'L', 999, 20, 1), record(2, 'L', 3000.1, 20),
    record(3, 'L', 1500, -0.1, 1), record(4, 'L', 1500, 100.1), record(5, 'L', 3500, 110, 1),
  ]);
  assert.equal(document.populations[0].records, 5);
  assert.equal(document.populations[0].machineFailure, 3);
  assert.deepEqual(document.heatmaps.all.outOfRange, {
    records: 5, failures: 3, ratePer100: 60, availability: 'available',
    speedBelow: 1, speedAbove: 2, torqueBelow: 1, torqueAbove: 2,
  });
  assert.equal(document.heatmaps.all.cells.reduce((sum, cell) => sum + cell.records, 0), 0);
  const rows = getGalleryRows(document, state('all', 'conditions'));
  assert.equal(rows.rows.length, 100);
  assert.match(rows.caption, /5 out-of-range records, including 3 failure labels/u);
  assert.match(rows.caption, /reasons may overlap/u);
  assert.match(renderGallerySvg(document, state('all', 'conditions')), /Outside bins: 5 records; 3 labels/u);
});

test('empty populations, empty cells, and observed zero retain different meanings', () => {
  const document = galleryDocument([record(1, 'L', 1000, 0)]);
  assert.equal(document.heatmaps.L.cells[0].ratePer100, 0);
  assert.equal(document.heatmaps.L.cells[0].availability, 'available');
  assert.equal(document.heatmaps.L.cells[1].ratePer100, null);
  assert.equal(document.heatmaps.L.cells[1].availability, 'unavailable');
  assert.equal(document.populations[2].machineFailurePer100, null);
  assert.deepEqual(getGalleryRows(document, state('L', 'conditions')).rows[0].values, [1, 0, 0, 'Available']);
  assert.deepEqual(getGalleryRows(document, state('L', 'conditions')).rows[1].values, [0, 0, 'Unavailable', 'No records']);
  for (const view of GALLERY_VIEWS) {
    assert.doesNotThrow(() => renderGallerySvg(galleryDocument([]), state('M', view)));
  }
});

for (const key of ['rotationalSpeedRpm', 'torqueNm']) {
  test(`gallery admission requires its own finite ${key}`, () => {
    const original = fixture()[0];
    for (const value of [undefined, null, '1200', NaN, Infinity, -Infinity]) {
      assert.throws(() => galleryDocument([{ ...original, [key]: value }]), /own finite/u);
    }
    const inherited = Object.assign(Object.create({ [key]: original[key] }), original);
    delete inherited[key];
    assert.throws(() => galleryDocument([inherited]), /own finite/u);
  });
}

test('identity, target, flags, and record bounds remain with the existing maintenance owner', () => {
  const original = fixture()[0];
  for (const records of [[original, original], [{ ...original, type: '__proto__' }],
    [{ ...original, machineFailure: Infinity }], [{ ...original, modeFlags: Object.create(original.modeFlags) }],
    Array(10001).fill(original), null]) {
    assert.throws(() => galleryDocument(records), TypeError);
  }
});

test('pure construction and all view reads preserve frozen caller inputs and detached output', () => {
  const records = freezeTree(fixture());
  const before = JSON.stringify(records);
  const document = freezeTree(galleryDocument(records));
  const documentBefore = JSON.stringify(document);
  for (const population of GALLERY_POPULATIONS) for (const view of GALLERY_VIEWS) {
    const selection = freezeTree(state(population, view, 99));
    const rows = getGalleryRows(document, selection);
    assert.ok(rows.rows.length > 0);
    assert.ok(rows.rows.every(row => row.values.length + 1 === rows.columns.length));
    assert.equal(new Set(rows.rows.map(row => row.label)).size, rows.rows.length);
    assert.match(renderGallerySvg(document, selection), /<svg/u);
    rows.rows[0].values[0] = 'caller-owned change';
  }
  assert.equal(JSON.stringify(records), before);
  assert.equal(JSON.stringify(document), documentBefore);
  const second = galleryDocument(records);
  second.heatmaps.all.cells[0].records = 999;
  second.populations[0].agreement.both = 999;
  assert.equal(document.heatmaps.all.cells[0].records, 2);
  assert.equal(document.populations[0].agreement.both, 1);
});

test('fixture documents and JSON roundtrips do not claim verified release provenance', () => {
  const document = galleryDocument(fixture());
  assert.equal(Object.hasOwn(document, 'source'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(document)), document);
  const svg = renderGallerySvg(document, state());
  assert.match(svg, /Supplied fixture records/u);
  assert.doesNotMatch(svg, /verified-input SHA-256/u);
});

test('state admission is explicit and preserves valid selection through every view', () => {
  for (const population of GALLERY_POPULATIONS) for (const view of GALLERY_VIEWS) {
    const input = state(population, view, 99);
    const result = validateGalleryState(input);
    assert.deepEqual(result, input);
    assert.notEqual(result, input);
    assert.ok(Object.isFrozen(result));
  }
  for (const invalid of [null, {}, Object.create(DEFAULT_GALLERY_STATE), state('X'), state('all', 'timeline'),
    state('all', 'conditions', -1), state('all', 'conditions', 100), state('all', 'conditions', 0.5),
    state('all', 'conditions', '0'), state('all', 'conditions', NaN), { ...state(), extra: true }]) {
    assert.throws(() => validateGalleryState(invalid), TypeError);
  }
});

test('exact-value rows have independent human-readable field labels and complete reconciliation', () => {
  const document = galleryDocument(fixture());
  const comparison = getGalleryRows(document, state());
  assert.deepEqual(comparison.columns, ['Product type', 'Recorded rows', 'Machine-failure labels', 'Machine-failure labels per 100 records', 'Availability']);
  assert.deepEqual(comparison.rows, [
    { label: 'Product type L', values: [2, 1, 50, 'Available'] },
    { label: 'Product type M', values: [1, 0, 0, 'Available'] },
    { label: 'Product type H', values: [1, 1, 100, 'Available'] },
  ]);
  assert.equal(getGalleryRows(document, state('M', 'count')).rows.length, 1);
  const reconciliation = getGalleryRows(document, state('all', 'reconciliation'));
  assert.deepEqual(reconciliation.columns, ['Label / mode relationship', 'Machine-failure label', 'At least one mode flag', 'Records', 'Records per 100 selected records', 'Availability']);
  assert.deepEqual(reconciliation.rows.map(row => row.values), [
    [0, 'No', 1, 25, 'Available'], [0, 'Yes', 1, 25, 'Available'], [1, 'No', 1, 25, 'Available'], [1, 'Yes', 1, 25, 'Available'],
  ]);
  const cells = getGalleryRows(document, state('all', 'conditions'));
  assert.equal(cells.rows.length, 100);
  assert.equal(cells.rows[0].label, 'Speed [1000, 1200) rpm; torque [0, 10) Nm');
  assert.equal(cells.rows[99].label, 'Speed [2800, 3000] rpm; torque [90, 100] Nm');
});

test('rendered comparisons retain global domains across population selection', async () => {
  const document = await release();
  for (const population of GALLERY_POPULATIONS) {
    assert.match(renderGallerySvg(document, state(population, 'rate')), /data-scale-max="5"/u);
    assert.match(renderGallerySvg(document, state(population, 'count')), /data-scale-max="250"/u);
    assert.match(renderGallerySvg(document, state(population, 'conditions')), /data-rate-domain="0 100"/u);
  }
});

test('dense marks expose one selected detail and no per-mark Tab sequence', () => {
  const document = galleryDocument(fixture());
  const svg = renderGallerySvg(document, state('all', 'conditions', 99), 'selected');
  assert.equal((svg.match(/<g id="selected-speed-\d-torque-\d"/gu) ?? []).length, 100);
  assert.match(svg, /Speed \[2800, 3000\] rpm/u);
  assert.match(svg, /Torque \[90, 100\] Nm/u);
  assert.match(svg, /1 records in this cell/u);
  assert.match(svg, /Rate per 100: 100.0/u);
  assert.doesNotMatch(svg, /tabindex|<script|<foreignObject|filter:|box-shadow/iu);
  // The same independent fixture includes dark 100%, observed zero, and empty cells.
  const outlineDocument = document;
  for (const [cell, records, failures, rate] of [[99, 1, 1, 100], [11, 1, 0, 0], [1, 0, 0, null]]) {
    const value = outlineDocument.heatmaps.all.cells[cell];
    assert.deepEqual([value.records, value.failures, value.ratePer100], [records, failures, rate]);
    const outlinedSvg = renderGallerySvg(outlineDocument, { population: 'all', view: 'conditions', cell }, 'outline-check');
    const selectedId = 'outline-check-speed-' + (cell % 10) + '-torque-' + Math.floor(cell / 10);
    const selectedMarkup = outlinedSvg.match(new RegExp('<g\\b[^>]*\\bid="' + selectedId + '"[^>]*>[\\s\\S]*?</g>', 'u'))?.[0];
    assert.ok(selectedMarkup, 'The selected fixture cell retains its named group.');
    assert.match(selectedMarkup, /<rect(?=[^>]*data-selection-outline="outer")(?=[^>]*stroke="#1d3557")(?=[^>]*stroke-width="4")[^>]*\/>/u);
    assert.match(selectedMarkup, /<rect(?=[^>]*data-selection-outline="inner")(?=[^>]*stroke="#fffcf5")(?=[^>]*stroke-width="2")[^>]*\/>/u);
    assert.equal((outlinedSvg.match(/data-selection-outline=/gu) || []).length, 2);
  }

});

test('SVG text is escaped, source meaning remains visible, and ID namespaces do not collide', async () => {
  assert.equal(escapeGalleryText('<&"\'>'), '&lt;&amp;&quot;&#39;&gt;');
  assert.throws(() => escapeGalleryText('\u0000'), TypeError);
  const document = structuredClone(await release());
  document.source.title = 'AI4I & <script>alert("literal")</script>';
  const first = renderGallerySvg(document, state('all', 'conditions'), 'first-gallery');
  const second = renderGallerySvg(document, state('H', 'reconciliation'), 'second-gallery');
  assert.match(first, /AI4I &amp; &lt;script&gt;alert\(&quot;literal&quot;\)&lt;\/script&gt;/u);
  assert.doesNotMatch(first, /<script/u);
  assert.match(first, /https:\/\/doi.org\/10.24432\/C5HS5C/u);
  assert.match(first, /Published generated records/u);
  assert.match(first, /CC-BY-4.0/u);
  assert.match(first, /rather than observation timestamps/u);
  const ids = [...(first + second).matchAll(/\bid="([^"]+)"/gu)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const prefix of ['', '9bad', '<bad>', 'two words', 'x" onload="bad']) {
    assert.throws(() => renderGallerySvg(document, state(), prefix), TypeError);
  }
});

test('rendering rejects malformed consumed document values instead of coercing them', () => {
  const mutations = [
    document => { document.populations[0].machineFailurePer100 = NaN; },
    document => { document.heatmaps.all.cells[0].ratePer100 = Infinity; },
    document => { document.heatmaps.all.cells[0].speedLower = '1000'; },
    document => { document.heatmaps.all.cells.pop(); },
    document => { document.scales.countMax = NaN; },
    document => { document.populations[0].agreement.both = 100; },
  ];
  for (const mutate of mutations) {
    const document = galleryDocument(fixture()); mutate(document);
    assert.throws(() => renderGallerySvg(document, state()), TypeError);
  }
});

test('checked-in gallery JSON and four standalone SVGs match deterministic source-owned output', async () => {
  assert.deepEqual(await buildAtlasGallery({ check: true }), { records: 10000, populations: 4, cellsPerPopulation: 100, outputs: 5 });
});
