import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  aboutPath, heatmapSourcePath, createAboutHeatmapProjection, replaceAboutHeatmapProjection,
  aboutHeatmapReceiverState,
} from '../../tools/materialize-about-heatmap.mjs';

const root = resolve(import.meta.dirname, '../..');
const [source, about, runtime] = await Promise.all([
  heatmapSourcePath, aboutPath, 'context-canvas-project-surface/context-canvas/about-heatmap.js',
].map(path => readFile(resolve(root, path), 'utf8')));
const projection = createAboutHeatmapProjection(source);

test('the retained heatmap adapter projects both figures into an explicit receiver', () => {
  const prefix = '<main><h1>Receiver context</h1>\n';
  const suffix = '\n<p>Continue reading</p></main>';
  const stale = '<!-- about-heatmap-projection:start -->\n<section>Previous comparison</section>\n<!-- about-heatmap-projection:end -->';
  assert.equal(replaceAboutHeatmapProjection(prefix + stale + suffix, projection), prefix + projection + suffix);
  const fixture = `<main>\n${projection}\n</main>`;
  assert.equal(replaceAboutHeatmapProjection(fixture, projection), fixture);
  assert.match(projection, /<section class="about-heatmap" data-about-heatmap/u);
  assert.match(projection, /<h3 id="about-heatmap-title">Where visitors looked for navigation<\/h3>/u);
  assert.equal((projection.match(/<figure\b/gu) || []).length, 2);
  for (const file of ['bgr_3b_before_safeway_purple.svg', 'bgr_3b_after_safeway_cool_tri.svg']) {
    assert.ok(projection.includes(`src="../img/bgr/${file}"`), `native reading includes ${file}`);
  }
  assert.match(projection, /Directional case-study evidence/u);
  assert.match(projection, /class="about-heatmap__controls" hidden/u);
  assert.match(projection, /class="about-heatmap__status" hidden/u);
  assert.doesNotMatch(projection, /<iframe\b|<script\b|<main\b|<h1\b/u);
  assert.match(source, /<main id="comparison" data-mode="side"/u);
});

test('the concise About reading deliberately leaves the comparison with its standalone owner', () => {
  assert.equal(aboutHeatmapReceiverState(about), 'absent');
  assert.match(source, /<figure class="view" data-view="before">/u);
  assert.match(source, /<figure class="view" data-view="after">/u);
});

test('a missing figure and an unowned source shape require an explicit projection revision', () => {
  assert.throws(() => createAboutHeatmapProjection(source.replace('<figure class="view" data-view="after">', '<figure class="view" data-view="other">')), /one after figure/u);
  assert.throws(() => createAboutHeatmapProjection(source.replace('class="foot"', 'class="unknown"')), /receiver for class unknown/u);
  for (const malformed of [
    projection.replace('<!-- about-heatmap-projection:end -->', ''),
    projection + projection,
    '<!-- about-heatmap-projection:end --><!-- about-heatmap-projection:start -->',
    '<section data-about-heatmap></section>',
  ]) {
    assert.throws(() => aboutHeatmapReceiverState(malformed), /ordered heatmap projection boundary/u);
  }
  assert.throws(() => replaceAboutHeatmapProjection(about, projection), /ordered heatmap projection boundary/u);
});

test('native enhancement has its own receiver and the production source manifest includes it', async () => {
  assert.match(runtime, /document.querySelectorAll\('\[data-about-heatmap\]'\)/u);
  assert.doesNotMatch(runtime, /(?:location|history)\./u);
  const manifest = JSON.parse(await readFile(resolve(root, 'deployment/cpanel/primary-route-manifest.json'), 'utf8'));
  assert.deepEqual(manifest.files.filter(file => file.projected_path === 'about-heatmap.js'), [{
    source_path: 'context-canvas-project-surface/context-canvas/about-heatmap.js',
    projected_path: 'about-heatmap.js', media_type: 'text/javascript',
  }]);
});
