import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const ROUTE = '/context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html';
const output = new URL('../../.visual-runs/atlas-gallery/', import.meta.url);
let server;
let browser;
before(async () => {
  await mkdir(output, { recursive: true });
  server = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});
after(async () => { try { await browser?.close(); } finally { await server?.close(); } });

async function openGallery(t, width, javaScriptEnabled) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, javaScriptEnabled, reducedMotion: 'reduce' });
  t.after(() => context.close());
  // The two unchanged instruments retain their own acceptance. Local responses
  // isolate the page-owned gallery from the production iframe delivery policy.
  await context.route('https://iframes.vik.guru/**', route => route.fulfill({
    status: 200, contentType: 'text/html', body: '<!doctype html><title>Local instrument boundary</title><p>The instrument has a separate receiver.</p>',
  }));
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const telemetry = monitor(page);
  await page.goto(server.origin + ROUTE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { page, telemetry, gallery: page.locator('[data-atlas-gallery]') };
}

async function reachBothEdges(region) {
  await region.scrollIntoViewIfNeeded();
  await region.focus();
  await expect(region).toBeFocused();
  const maximum = await region.evaluate(node => node.scrollWidth - node.clientWidth);
  if (maximum > 1) {
    await expect.poll(async () => { await region.press('ArrowRight'); return region.evaluate(node => node.scrollLeft); },
      { timeout: 20000, intervals: [80] }).toBeGreaterThanOrEqual(maximum - 1);
    await expect.poll(async () => { await region.press('ArrowLeft'); return region.evaluate(node => node.scrollLeft); },
      { timeout: 20000, intervals: [80] }).toBeLessThanOrEqual(1);
  }
}

for (const width of [390, 768]) {
  test(`static gallery preserves four figures and native table access at ${width}px`, async t => {
    const { page, telemetry, gallery } = await openGallery(t, width, false);
    await expect(gallery.locator('[data-gallery-controls]')).toBeHidden();
    const details = gallery.locator('[data-gallery-baseline] > details');
    await expect(details).toHaveCount(4);
    const expectedRows = [3, 3, 4, 100];
    for (let index = 0; index < 4; index += 1) {
      const detail = details.nth(index);
      if (!(await detail.getAttribute('open') !== null)) await detail.locator('summary').click();
      await expect(detail.locator('tbody tr')).toHaveCount(expectedRows[index]);
      const region = detail.locator('.table-scroll').last();
      await reachBothEdges(region);
      const image = detail.locator('img');
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth)).toBeGreaterThan(0);
      assert.equal(await image.evaluate(node => getComputedStyle(node).boxShadow), 'none');
      const destination = new URL(await detail.locator('.story-visual__open').getAttribute('href'), page.url());
      const response = await page.request.get(destination.href);
      assert.equal(response.status(), 200);
      assert.match(await response.text(), /<svg/u);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    await gallery.locator('[data-gallery-baseline]').screenshot({ path: new URL(`static-${width}.png`, output).pathname });
    assertTelemetry(telemetry);
  });
}

test('selected population, cell, native values and actual downloads agree', async t => {
  const { page, telemetry, gallery } = await openGallery(t, 1440, true);
  const form = gallery.locator('[data-gallery-controls]');
  await expect(form).toBeVisible();
  const population = form.locator('[name="population"]');
  const view = form.locator('[name="view"]');
  await population.selectOption('M');
  await view.focus();
  await view.selectOption('reconciliation');
  await expect(view).toBeFocused();
  let selected = JSON.parse(await gallery.locator('#atlas-gallery-selection').textContent());
  assert.equal(selected.selection.population, 'M');
  const countColumn = selected.values.columns.indexOf('Records') - 1;
  assert.ok(countColumn >= 0, 'The reconciliation retains its independently named Records column.');
  assert.deepEqual(selected.values.rows.map(row => Number(row.values[countColumn])).sort((a, b) => a - b), [2, 4, 79, 2912]);
  for (const mode of ['rate', 'count', 'conditions']) {
    await view.selectOption(mode);
    await expect(population).toHaveValue('M');
  }
  await form.locator('[name="speed"]').selectOption('7');
  await form.locator('[name="torque"]').selectOption('3');
  await view.selectOption('rate');
  await view.selectOption('conditions');
  selected = JSON.parse(await gallery.locator('#atlas-gallery-selection').textContent());
  assert.deepEqual(selected.selection, { population: 'M', view: 'conditions', cell: 37 });
  await expect(gallery.locator('[data-gallery-table] tbody tr')).toHaveCount(100);
  const row = selected.values.rows[37];
  await expect(gallery.locator('[data-gallery-status]')).toContainText(row.label);
  for (const value of row.values) await expect(gallery.locator('[data-gallery-table] tbody tr').nth(37)).toContainText(String(value));
  const jsonDownload = page.waitForEvent('download');
  await gallery.locator('[data-gallery-json-download]').click();
  const jsonArtifact = await jsonDownload;
  assert.deepEqual(JSON.parse(await readFile(await jsonArtifact.path(), 'utf8')), selected);
  const svgDownload = page.waitForEvent('download');
  await gallery.locator('[data-gallery-svg-download]').click();
  const svgArtifact = await svgDownload;
  const svg = await readFile(await svgArtifact.path(), 'utf8');
  assert.match(svg, /Product type M/u);
  assert.match(svg, /C5HS5C/u);
  assert.match(svg, /Failure-label rates across operating conditions/u);
  assert.match(svg, />Speed \[2400, 2600\) rpm<\/text>/u);
  assert.match(svg, />Torque \[30, 40\) Nm<\/text>/u);
  assert.ok(svg.includes(`${row.values[0]} records in this cell`));
  assert.ok(svg.includes(`Machine-failure labels: ${row.values[1]}`));
  assert.match(svg, /id="atlas-selected-speed-7-torque-3"/u);
  const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
  assert.equal(ids.length, new Set(ids).size);
  await gallery.locator('[data-gallery-live]').screenshot({ path: new URL('selected-conditions.png', output).pathname });
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(form).toBeVisible();
  await expect(gallery.locator('[data-gallery-table]')).toContainText(row.label);
  await page.emulateMedia({ media: 'print', forcedColors: 'none' });
  await expect(gallery.locator('[data-gallery-live]')).toBeHidden();
  const references = gallery.locator('[data-gallery-baseline] > details');
  await expect(references).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    const reference = references.nth(index);
    await expect(reference.locator('img')).toBeVisible();
    await expect(reference.locator('caption')).toBeVisible();
    await expect(reference.locator('tbody tr').first()).toBeVisible();
    await expect(reference.locator('tbody tr').last()).toBeVisible();
  }
  assertTelemetry(telemetry);
});
