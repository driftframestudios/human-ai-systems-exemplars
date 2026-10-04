import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { aggregateLabels, DATA_PATH, parseLabels, renderTable } from '../../tools/build-atlas-reference.mjs';

const root = new URL('../../', import.meta.url);
const route = 'one-figure-several-readings.html';
const canonical = `https://schemas.radiantnull.com/context-canvas-project-surface/context-canvas/${route}`;
const read = path => readFile(new URL(path, root), 'utf8');
const linkedData = text => [...text.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gu)].map(match => JSON.parse(match[1]));
const entities = data => data.flatMap(entity => entity['@graph'] ?? [entity]);

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
