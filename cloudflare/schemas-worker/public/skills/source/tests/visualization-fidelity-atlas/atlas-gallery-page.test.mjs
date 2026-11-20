import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { presentGallery, galleryState, enhanceGallery } from '../../context-canvas-project-surface/context-canvas/atlas-gallery.js';
import { readVerifiedGalleryDocument } from '../../tools/atlas-gallery-model.mjs';
import { buildGalleryPage, renderGallerySection, replaceGallery, GALLERY_START, GALLERY_END } from '../../tools/build-atlas-gallery-page.mjs';

const document = await readVerifiedGalleryDocument();

test('explicit teardown removes a notice created after initialization failure', () => {
  const fixture = galleryHarness();
  const invalid = structuredClone(document);
  invalid.populations = [];
  const controller = enhanceGallery(fixture.root, invalid, fixture.browser);
  const notice = fixture.root.querySelector('[data-gallery-error]');
  assert.ok(notice);
  assert.equal(notice.hidden, false);
  controller.destroy();
  assert.ok(!fixture.root.querySelector('[data-gallery-error]'));
  assert.doesNotThrow(() => controller.destroy());
  assert.ok(!fixture.root.querySelector('[data-gallery-error]'));
});

function eventOwner() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    emit(type, event = {}) { for (const listener of [...(listeners.get(type) ?? [])]) listener(event); },
  };
}

function galleryHarness() {
  const notices = [];
  const node = () => ({
    ...eventOwner(), innerHTML: '', textContent: '', href: '', hidden: true, open: false,
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { this[name] = ''; },
    before(value) { notices.push(value); },
    remove() { const index = notices.indexOf(this); if (index >= 0) notices.splice(index, 1); },
  });
  const selectors = ['controls', 'live', 'baseline', 'svg', 'table', 'status', 'explanation', 'full', 'svg-download', 'json-download'];
  const nodes = Object.fromEntries(selectors.map(name => [name, node()]));
  nodes.selection = node();
  nodes.selection.textContent = 'null';
  nodes.baseline.open = true;
  const labels = [node(), node()];
  const form = nodes.controls;
  form.elements = Object.fromEntries(Object.entries({ population: 'all', view: 'rate', speed: '0', torque: '0' })
    .map(([name, value]) => [name, { value }]));
  form.querySelectorAll = () => labels;
  const root = {
    ownerDocument: { createElement: node },
    prepend(value) { notices.push(value); },
    querySelector(selector) {
      if (selector === '[data-gallery-error]') return notices[0] ?? null;
      if (selector === '#atlas-gallery-selection') return nodes.selection;
      return nodes[selector.slice('[data-gallery-'.length, -1)] ?? null;
    },
  };
  const active = new Set();
  const created = [];
  const revoked = [];
  const errors = [];
  const calls = { blob: 0, url: 0 };
  const faults = { blob: null, url: null };
  const rejection = new Error('<script>controlled export failure</script>');
  const browser = {
    ...eventOwner(), console: { warn(error) { errors.push(error); } },
    Blob: class {
      constructor(parts, options) {
        if (++calls.blob === faults.blob) throw rejection;
        this.parts = parts;
        this.type = options.type;
      }
    },
    URL: {
      createObjectURL() {
        if (++calls.url === faults.url) throw rejection;
        const url = `blob:gallery-${calls.url}`;
        active.add(url);
        created.push(url);
        return url;
      },
      revokeObjectURL(url) { active.delete(url); revoked.push(url); },
    },
  };
  const choose = (population, view = 'rate', cell = 0) => {
    for (const [name, value] of Object.entries({ population, view, speed: String(cell % 10), torque: String(Math.floor(cell / 10)) })) {
      form.elements[name].value = value;
    }
    form.emit('change');
  };
  const snapshot = () => ({
    controls: Object.fromEntries(Object.entries(form.elements).map(([name, field]) => [name, field.value])),
    svg: nodes.svg.innerHTML, table: nodes.table.innerHTML,
    status: nodes.status.textContent, explanation: nodes.explanation.textContent,
    selection: nodes.selection.textContent,
    hrefs: [nodes.full.href, nodes['svg-download'].href, nodes['json-download'].href],
    hidden: [form.hidden, nodes.live.hidden, ...labels.map(label => label.hidden)],
  });
  return { root, browser, nodes, form, notices, active, created, revoked, errors, calls, faults, rejection, choose, snapshot };
}

test('prepared provenance retains only declared fields with detached ownership', () => {
  const supplied = structuredClone(document);
  const expectedSource = {
    title: document.source.title, doi: document.source.doi, sha256: document.source.sha256,
    license: document.source.license, sourceType: document.source.sourceType,
  };
  Object.defineProperty(supplied.source, 'note', {
    enumerable: true,
    get() { throw new Error('Surplus source metadata must not be read.'); },
  });
  const result = presentGallery(supplied, { population: 'all', view: 'rate', cell: 0 });
  assert.deepEqual(result.record.source, expectedSource);
  assert.notStrictEqual(result.record.source, supplied.source);
  result.record.source.title = 'Changed export';
  assert.equal(supplied.source.title, document.source.title);
  supplied.source.doi = 'Changed caller DOI';
  assert.equal(result.record.source.doi, document.source.doi);
  for (const inherited of [false, true]) {
    const fixture = structuredClone(document);
    delete fixture.source;
    if (inherited) Object.setPrototypeOf(fixture, { source: document.source });
    const prepared = presentGallery(fixture, { population: 'all', view: 'rate', cell: 0 });
    assert.equal(prepared.record.source, undefined);
    assert.ok(!Object.hasOwn(JSON.parse(JSON.stringify(prepared.record)), 'source'));
    assert.ok(prepared.svg.includes('No verified-file digest is attached.'));
  }
});

test('enhancement projects bounded canonical fields into detached nested ownership', () => {
  const supplied = structuredClone(document);
  const heatmaps = Object.values(supplied.heatmaps);
  const owners = [
    supplied, supplied.source, supplied.populations, supplied.bins,
    supplied.bins.speedEdges, supplied.bins.torqueEdges, supplied.scales, supplied.heatmaps,
    ...supplied.populations, ...supplied.populations.map(p => p.agreement),
    ...heatmaps, ...heatmaps.flatMap(heatmap => [heatmap.cells, heatmap.outOfRange, ...heatmap.cells]),
  ];
  for (const owner of owners) Object.defineProperty(owner, 'surplus', {
    enumerable: true,
    get() { throw new Error('Surplus document metadata must not be read.'); },
  });
  const fixture = galleryHarness();
  const controller = enhanceGallery(fixture.root, supplied, fixture.browser);
  assert.equal(fixture.root.querySelector('[data-gallery-controls]').hidden, false);
  supplied.timeBasis = 'Changed caller time basis';
  supplied.source.title = 'Changed caller source';
  supplied.populations[2].records = 0;
  supplied.populations[2].agreement.both = 0;
  supplied.bins.speedEdges[0] = -1;
  supplied.bins.torqueEdges[0] = -1;
  supplied.scales.rateMax = 999;
  supplied.heatmaps.M.cells[37].records = -1;
  supplied.heatmaps.M.outOfRange.records = -1;
  supplied.heatmaps.L.cells[0].failures = -1;
  for (const view of ['rate', 'count', 'reconciliation', 'conditions']) {
    fixture.choose('M', view, 37);
    const expected = presentGallery(document, { population: 'M', view, cell: 37 });
    const record = JSON.parse(fixture.root.querySelector('#atlas-gallery-selection').textContent);
    assert.deepEqual(record, expected.record);
    assert.equal(fixture.root.querySelector('[data-gallery-svg]').innerHTML, expected.svg);
    assert.equal(fixture.root.querySelector('[data-gallery-table]').innerHTML, expected.table);
    assert.equal(fixture.root.querySelector('[data-gallery-status]').textContent, expected.summary);
    assert.ok(!fixture.root.querySelector('[data-gallery-error]'));
    if (view === 'rate' || view === 'count') assert.equal(record.values.rows[0].values[0], 2997);
  }
  controller.destroy();
});

for (const failure of ['prepare', 'blob', 'url']) {
  test(`${failure} rejection preserves the accepted view and owns every acquired URL`, () => {
    const h = galleryHarness();
    const controller = enhanceGallery(h.root, document, h.browser);
    const accepted = h.snapshot();
    const oldUrls = [...h.active];
    if (failure !== 'prepare') h.faults[failure] = h.calls[failure] + 2;
    assert.doesNotThrow(() => h.choose(failure === 'prepare' ? 'site-A' : 'M', 'conditions', 37));
    assert.deepEqual(h.snapshot(), accepted);
    assert.deepEqual([...h.active], oldUrls);
    assert.equal(h.revoked.length, failure === 'prepare' ? 0 : 1);
    const error = h.errors.at(-1);
    const stage = failure === 'prepare' ? 'prepare' : 'export';
    assert.ok(error instanceof Error);
    assert.equal(error.stage, stage);
    assert.equal(error.code, `ATLAS_GALLERY_${stage.toUpperCase()}_FAILED`);
    assert.deepEqual(error.acceptedState, { population: 'all', view: 'rate', cell: 0 });
    if (failure !== 'prepare') assert.equal(error.cause, h.rejection);
    assert.match(h.notices[0].textContent, /previous selection/u);
    assert.doesNotMatch(h.notices[0].textContent, /<script>/u);
    h.faults.blob = h.faults.url = null;
    h.choose('M', 'conditions', 37);
    assert.deepEqual(JSON.parse(h.nodes.selection.textContent).selection, { population: 'M', view: 'conditions', cell: 37 });
    assert.ok(oldUrls.every(url => h.revoked.includes(url)));
    assert.equal(h.active.size, 2);
    assert.equal(h.notices[0].hidden, true);
    h.browser.emit('pagehide', { persisted: true });
    assert.equal(h.active.size, 2);
    assert.equal(h.form.listeners.get('change').size, 1);
    controller.destroy();
    controller.destroy();
    assert.equal(h.active.size, 0);
    assert.deepEqual([...h.revoked].sort(), [...h.created].sort());
    assert.equal(h.form.listeners.get('change').size, 0);
    assert.equal(h.form.listeners.get('submit').size, 0);
    assert.equal(h.browser.listeners.get('pagehide').size, 0);
    assert.equal(h.nodes.baseline.open, true);
    assert.equal(h.nodes.live.hidden, true);
    assert.equal(h.nodes.selection.textContent, 'null');
    const acquired = h.created.length;
    h.choose('L');
    assert.equal(h.created.length, acquired);
  });
}

test('initialization failure keeps static references usable without acquired resources or listeners', () => {
  const h = galleryHarness();
  const invalid = structuredClone(document);
  invalid.populations = [];
  const controller = enhanceGallery(h.root, invalid, h.browser);
  assert.equal(h.nodes.baseline.open, true);
  assert.equal(h.form.hidden, true);
  assert.equal(h.nodes.live.hidden, true);
  assert.equal(h.active.size, 0);
  assert.equal(h.created.length, 0);
  assert.equal(h.form.listeners.get('change')?.size ?? 0, 0);
  assert.equal(h.errors[0].stage, 'initialization');
  assert.equal(h.errors[0].acceptedState, null);
  assert.match(h.notices[0].textContent, /reference views remain available/u);
  controller.destroy();
});

test('non-persisted departure tears down listeners and both accepted exports', () => {
  const h = galleryHarness();
  enhanceGallery(h.root, document, h.browser);
  h.browser.emit('pagehide', { persisted: false });
  assert.equal(h.active.size, 0);
  assert.equal(h.revoked.length, 2);
  assert.equal(h.form.listeners.get('change').size, 0);
  assert.equal(h.browser.listeners.get('pagehide').size, 0);
});

for (const [population, records, failures] of [['all', 10000, 339], ['L', 6000, 235], ['M', 2997, 83], ['H', 1003, 21]]) {
  test(`${population} keeps independent population counts across each view`, () => {
    for (const view of ['rate', 'count', 'reconciliation', 'conditions']) {
      const before = JSON.stringify(document);
      const result = presentGallery(document, { population, view, cell: 37 });
      assert.equal(JSON.stringify(document), before);
      assert.deepEqual(result.record.selection, { population, view, cell: 37 });
      assert.match(result.svg, new RegExp(`${records} records \\| ${failures} machine-failure labels`, 'u'));
      assert.equal(result.record.source.sha256, 'dc6630cd9b1f0f853922fad78a1b6436570d3f1ec863f1dd5c4340ac56bc8a8e');
      assert.ok(result.table.includes(result.record.values.caption));
      assert.ok(result.summary.startsWith(result.record.values.caption));
      assert.equal(result.record.values.rows.length, view === 'conditions' ? 100 : view === 'reconciliation' ? 4 : population === 'all' ? 3 : 1);
    }
  });
}

for (const state of [
  { population: 'site-A', view: 'rate', cell: 0 },
  { population: 'all', view: 'timeline', cell: 0 },
  { population: 'all', view: 'rate', cell: 100 },
  { population: 'all', view: 'rate', cell: 1.5 },
]) test(`selection rejects unsupported state ${JSON.stringify(state)}`, () => {
  assert.throws(() => galleryState(state), TypeError);
});

test('four authored companions remain complete before enhancement', () => {
  const html = renderGallerySection(document);
  assert.equal((html.match(/<table /gu) || []).length, 4);
  assert.equal((html.match(/scope="row"/gu) || []).length, 110);
  assert.equal((html.match(/class="story-visual__open"/gu) || []).length, 4);
  assert.ok(html.includes('data-gallery-controls hidden'));
  assert.ok(html.includes('data-gallery-baseline open'));
  assert.ok(html.includes('Sparse cells retain their support counts'));
  const practiceList = html.match(/<dl class="debrief-at-glance ai-systems-scan">([\s\S]*?)<\/dl>/u)?.[1];
  assert.ok(practiceList);
  assert.equal((practiceList.match(/<dt>/gu) || []).length, 4);
  assert.equal((practiceList.match(/<dd>/gu) || []).length, 4);
});

test('projection replacement preserves neighboring source and rejects ambiguous boundaries', () => {
  const first = `${GALLERY_START}old${GALLERY_END}`;
  assert.equal(replaceGallery(`before${first}after`, 'replacement'), 'beforereplacementafter');
  assert.throws(() => replaceGallery(first + first, 'replacement'));
  assert.throws(() => replaceGallery(GALLERY_START, 'replacement'));
});

test('authored page retains the exact generated gallery and existing style owners', async () => {
  await buildGalleryPage({ check: true });
  const html = await readFile(new URL('../../context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html', import.meta.url), 'utf8');
  assert.deepEqual([...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/gu)].map(match => match[1]),
    [
      'styles/core/tokens.css', 'styles/core/foundation.css', 'styles/components/site-navigation.css',
      'styles/components/tables.css', 'expanded.css', 'styles/routes/ai-systems.css',
      'styles/routes/visualization-fidelity-atlas.css', 'canvas-shell.css',
    ]);
  assert.equal((html.match(/<iframe /gu) || []).length, 2);
});
