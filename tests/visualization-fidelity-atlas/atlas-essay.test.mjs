import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import visitorBoundary from '../../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js';
import { aggregateLabels, DATA_PATH, parseLabels, renderTable } from '../../tools/build-atlas-reference.mjs';

const root = new URL('../../', import.meta.url);
const route = 'one-figure-several-readings.html';
const canonical = `https://schemas.radiantnull.com/context-canvas-project-surface/context-canvas/${route}`;
const read = path => readFile(new URL(path, root), 'utf8');
const linkedData = text => [...text.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gu)].map(match => JSON.parse(match[1]));
const entities = data => data.flatMap(entity => entity['@graph'] ?? [entity]);

test('essay composes the established Debrief navigation, reading, and footer owners', async () => {
  const html = await read(`context-canvas-project-surface/context-canvas/${route}`);
  assert.match(html, /<header class="nav__top--sticky">\s*<nav aria-label="Primary">\s*<ul class="nav__container">/u);
  assert.match(html, /<header class="non-index-hero__container debrief-hero">/u);
  assert.match(html, /class="debrief-at-glance"/u);
  assert.match(html, /class="track-index"/u);
  assert.match(html, /class="prose-flow"/u);
  assert.deepEqual([...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/gu)].map(match => match[1]), [
    'expanded.css', 'styles/components/debrief-reading.css', 'canvas-shell.css', 'styles/contracts/debrief-composition.css',
  ]);
  const footer = html.slice(html.lastIndexOf('<footer'));
  assert.match(footer, /class="footer__container super-footer"/u);
  assert.ok(footer.indexOf('data-visitor-boundary') < footer.indexOf('class="site-attribution"'));
  assert.equal(html.split(visitorBoundary.contextText).length - 1, 1);
  let previous = footer.indexOf(visitorBoundary.contextText);
  for (const marker of visitorBoundary.markers) {
    assert.equal(html.split(`data-visitor-boundary-marker="${marker.id}"`).length - 1, 1);
    for (const line of marker.lines) {
      assert.equal(html.split(line).length - 1, 1);
      const position = footer.indexOf(line);
      assert.ok(position > previous, `${marker.id} retains the contract's exact order`);
      previous = position;
    }
  }
});

test('original figure remains an immutable reference with a selected production route', async () => {
  const originalPath = 'context-canvas-project-surface/img/plot/visualization_fidelity_original_exemplar.svg';
  const original = await readFile(new URL(originalPath, root));
  // Git blob identity from aa561c3^, before the source-backed reference replaced it.
  const blob = createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex');
  assert.equal(blob, 'b831568ff3ba7471defbffb6f287b5b46bdd18ff');
  const manifest = JSON.parse(await read('deployment/cpanel/primary-route-manifest.json'));
  const entry = manifest.files.find(item => item.source_path === originalPath);
  assert.ok(entry, 'The original reference travels with the production article.');
  assert.equal(entry.media_type, 'image/svg+xml');
  const html = await read(`context-canvas-project-surface/context-canvas/${route}`);
  for (const filename of ['visualization_fidelity_original_exemplar.svg', 'visualization_fidelity_clean_exemplar.svg']) {
    assert.ok(html.includes(`class="story-visual__open" href="../img/plot/${filename}"`));
    assert.ok(html.includes(`src="../img/plot/${filename}"`));
  }
  assert.match(html, /different populations and measures/u);
  assert.match(html, /measured comprehension gain would require a reader study/u);
});

test('essay uses the shared source table and source-owned SVG', async () => {
  const html = await read(`context-canvas-project-surface/context-canvas/${route}`);
  const groups = aggregateLabels(parseLabels(await read(DATA_PATH)));
  assert.ok(html.includes(renderTable(groups)));
  assert.match(html, /src="\.\.\/img\/plot\/visualization_fidelity_clean_exemplar\.svg"/u);
  assert.match(html, /July and October are partial observation windows/u);
  assert.match(html, /https:\/\/doi.org\/10.24432\/C54305/u);
  const article = entities(linkedData(html)).find(entity => entity['@type'].includes('Article'));
  assert.equal(article['@id'], `${canonical}#article`);
  assert.equal(article.url, canonical);
  assert.ok(article.citation.includes('https://www.w3.org/WAI/tutorials/images/complex/'));
});

test('catalog keeps the essay at the authored end and links the declared entity', async () => {
  const html = await read('context-canvas-project-surface/context-canvas/debriefs.html');
  const card = html.match(/<li\b[^>]*id="catalog-atlas-reference"[\s\S]*?<span class="txt-right">[\s\S]*?<\/span>\s*<\/li>/u)?.[0];
  assert.ok(card, 'The new card retains the established catalog structure.');
  assert.match(card, /data-formats="article"/u);
  assert.match(card, /data-topics="research practice data-visualization ai-systems"/u);
  assert.ok(html.indexOf('id="catalog-atlas-reference"') > html.indexOf('id="catalog-table-reading"'));
  const graph = entities(linkedData(html));
  const list = graph.find(entity => entity['@type'] === 'ItemList');
  assert.equal(list.numberOfItems, list.itemListElement.length);
  assert.equal(list.itemListElement.at(-1).url, canonical);
  const collection = graph.find(entity => entity['@id'] === canonical.replace(`${route}`, 'debriefs.html#webpage'));
  assert.ok(collection.hasPart.some(part => part['@id'] === `${canonical}#article`));
});
