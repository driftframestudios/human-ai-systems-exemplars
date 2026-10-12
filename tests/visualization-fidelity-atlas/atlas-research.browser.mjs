import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';
import { observeTableReading } from '../../tools/table-reading-observer.mjs';

const route = '/context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html';
const output = new URL('../../.visual-runs/atlas-research/', import.meta.url);
const caption = 'Selected public works by topic and evidence kind';
const expectedRows = [
  ['Comparison', '1', '1', '3', '5'],
  ['Interpretation', '1', '2', '4', '7'],
  ['Distribution and uncertainty', '1', '1', '0', '2'],
  ['Accessibility', '0', '1', '1', '2'],
  ['Web delivery and state', '0', '2', '0', '2'],
  ['Production and validation', '0', '2', '1', '3'],
];
let server;
let browser;

before(async () => {
  await mkdir(output, { recursive: true });
  server = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  try { await browser?.close(); }
  finally { await server?.close(); }
});

for (const width of [390, 1440]) {
  const javaScriptEnabled = width === 1440;
  test(`public research figure, records and reading routes at ${width}px, enhancement ${javaScriptEnabled ? 'enabled' : 'unavailable'}`, async t => {
    const context = await browser.newContext({
      viewport: { width, height: 1000 }, javaScriptEnabled, reducedMotion: 'reduce',
    });
    t.after(() => context.close());
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.route('https://iframes.vik.guru/**', request => request.fulfill({
      status: 200, contentType: 'text/html', body: '<!doctype html><title>Separately owned instrument</title>',
    }));
    const telemetry = monitor(page);
    const url = `${server.origin}${route}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator('section[aria-labelledby="research-gallery-title"]');
    if (javaScriptEnabled) {
      const railLink = page.locator('.page-section-rail a[href="#research-gallery-title"]');
      await expect(railLink).toHaveCount(1);
      await expect(railLink).toBeVisible();
      await railLink.click();
      await expect(page).toHaveURL(`${url}#research-gallery-title`);
      await expect(section.locator('#research-gallery-title')).toBeInViewport();
    }
    const table = section.locator('table');
    await expect(table.locator('caption')).toHaveText(caption);
    assert.deepEqual(await table.locator('thead th').allTextContents(), [
      'Editorial topic', 'Empirical study', 'Technical guidance', 'Practitioner source', 'Works in topic',
    ]);
    const rows = await table.locator('tbody tr').evaluateAll(nodes => nodes.map(row =>
      [...row.children].map(cell => cell.textContent.trim())));
    assert.deepEqual(rows, expectedRows);
    assert.equal(await table.locator('tbody th[scope="row"]').count(), 6);
    assert.equal(await table.locator('thead th[scope="col"]').count(), 5);
    const observed = (await page.evaluate(observeTableReading)).find(item => item.caption === caption);
    assert.ok(observed, 'The native research table enters the shared reading observer.');
    assert.equal(observed.visible, true);
    assert.ok(observed.inspectedTokens > 0);
    assert.deepEqual(observed.fragments.filter(item => item.kind !== 'identifier-review'), []);

    const region = section.locator('.table-scroll[aria-label="Public research topic counts"]');
    await region.scrollIntoViewIfNeeded();
    await region.focus();
    await expect(region).toBeFocused();
    const maximum = await region.evaluate(node => node.scrollWidth - node.clientWidth);
    if (width === 390) assert.ok(maximum > 1, 'Narrow reading retains local table scrolling.');
    if (maximum > 1) {
      await expect.poll(async () => {
        await region.press('ArrowRight');
        return region.evaluate(node => node.scrollLeft);
      }, { timeout: 15000, intervals: [100] }).toBeGreaterThanOrEqual(maximum - 1);
      await expect.poll(async () => {
        await region.press('ArrowLeft');
        return region.evaluate(node => node.scrollLeft);
      }, { timeout: 15000, intervals: [100] }).toBeLessThanOrEqual(1);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));

    const link = section.locator('a.story-visual__open');
    const image = link.locator('img');
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
    const figure = await section.locator('figure').boundingBox();
    assert.ok(figure && figure.x >= -1 && figure.x + figure.width <= width + 1,
      'The research figure frame remains inside the viewport.');
    if (javaScriptEnabled) {
      const rail = await page.locator('.page-section-rail').boundingBox();
      assert.ok(rail && figure.x + figure.width < rail.x,
        'The figure frame leaves clear space before the enhanced desktop rail.');
      const tableRegion = await region.boundingBox();
      assert.ok(tableRegion && tableRegion.x >= -1 && tableRegion.x + tableRegion.width < rail.x,
        'The table scroll frame also retains the desktop rail gutter.');
    }
    assert.deepEqual(await image.evaluate(node => [node.closest('figure'), node.parentElement, node].map(owner => ({
      shadow: getComputedStyle(owner).boxShadow, filter: getComputedStyle(owner).filter,
    }))), Array.from({ length: 3 }, () => ({ shadow: 'none', filter: 'none' })));
    const sources = section.locator('details.conditioning-static-equivalent');
    assert.equal(await sources.locator('ol > li[id^="research-"]').count(), 13);
    await sources.locator('summary').click();
    await expect(sources.locator('ol > li').last()).toBeVisible();
    await sources.locator('summary').click();
    await section.screenshot({ path: new URL(`public-${width}.png`, output).pathname });

    await page.emulateMedia({ media: 'print' });
    await expect(image).toBeVisible();
    await expect(table.locator('tbody tr').last()).toBeVisible();
    await expect(sources.locator('ol > li').last()).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
    const destination = new URL(await link.getAttribute('href'), url).href;
    await link.focus();
    await link.press('Enter');
    await expect(page).toHaveURL(destination);
    const svg = page.locator('svg');
    await expect(svg).toBeVisible();
    assert.equal(await svg.getAttribute('viewBox'), '0 0 1200 760');
    await expect(svg).toContainText('13 works / 21 topic memberships / 7 works in several topics');
    assert.equal(await svg.locator('[id^="research-topic-"]').count(), 6);
    const escaped = await svg.locator('text').evaluateAll(nodes => nodes.flatMap(node => {
      const box = node.getBBox();
      return box.x < 0 || box.y < 0 || box.x + box.width > 1200 || box.y + box.height > 760
        ? [node.textContent] : [];
    }));
    assert.deepEqual(escaped, [], 'Visible source, count and category labels fit the standalone SVG.');
    assertTelemetry(telemetry);
  });
}
