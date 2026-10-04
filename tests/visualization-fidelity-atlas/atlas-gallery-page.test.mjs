import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { presentGallery, galleryState } from '../../context-canvas-project-surface/context-canvas/atlas-gallery.js';
import { readVerifiedGalleryDocument } from '../../tools/atlas-gallery-model.mjs';
import { buildGalleryPage, renderGallerySection, replaceGallery, GALLERY_START, GALLERY_END } from '../../tools/build-atlas-gallery-page.mjs';

const document = await readVerifiedGalleryDocument();

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
  for (const name of ['Data visualization foundations', 'Conversation data visualization', 'Web data visualization', 'PDF data visualization']) {
    assert.ok(html.includes(`<dt>${name}</dt>`));
  }
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
    ['expanded.css', 'styles/routes/ai-systems.css', 'canvas-shell.css']);
  assert.equal((html.match(/<iframe /gu) || []).length, 2);
});
