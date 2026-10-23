import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';
import { observeTableReading } from '../../tools/table-reading-observer.mjs';
import boundary from '../../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js';

const route = '/context-canvas-project-surface/context-canvas/one-figure-several-readings.html';
const output = new URL('../../.visual-runs/atlas-essay-shell/', import.meta.url);
const figures = ['visualization_fidelity_original_exemplar.svg', 'visualization_fidelity_clean_exemplar.svg'];
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

function luminance(color) {
  const channels = color.match(/[\d.]+/gu)?.map(Number);
  assert.ok(channels && channels.length >= 3, `Computed RGB color: ${color}`);
  assert.equal(channels[3] ?? 1, 1, 'The footer supplies an opaque reading surface.');
  return channels.slice(0, 3).map(value => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
}

for (const width of [390, 1440]) {
  for (const javaScriptEnabled of [false, true]) {
    test(`article shell and references at ${width}px, enhancement ${javaScriptEnabled ? 'enabled' : 'unavailable'}`, async t => {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, javaScriptEnabled, reducedMotion: 'reduce' });
      t.after(() => context.close());
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const telemetry = monitor(page);
      const url = `${server.origin}${route}`;
      await page.goto(url, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const name = `${width}-${javaScriptEnabled ? 'enhanced' : 'static'}`;
      const primary = page.getByRole('navigation', { name: 'Primary', exact: true });
      assert.deepEqual(await primary.getByRole('link').allTextContents(), ['About', 'AI Systems', 'Debriefs']);
      await expect(primary).toBeVisible();
      const header = await primary.boundingBox();
      const hero = await page.locator('main > header').boundingBox();
      assert.ok(header && hero && header.y + header.height <= hero.y + 1, 'The navigation and hero occupy separate vertical space.');
      const headerLinks = await primary.getByRole('link').evaluateAll(links => links.map(link => {
        const box = link.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }));
      assert.ok(headerLinks.every(box => box.left >= 0 && box.right <= width && box.bottom > box.top));
      for (let i = 1; i < headerLinks.length; i += 1) {
        const a = headerLinks[i - 1];
        const b = headerLinks[i];
        assert.ok(a.right <= b.left + 1 || a.bottom <= b.top + 1, 'Navigation labels remain separate.');
      }
      await page.screenshot({ path: new URL(`${name}-header.png`, output).pathname });

      const footer = page.locator('body > footer');
      await expect(footer).toHaveClass(/\bsuper-footer\b/u);
      assert.equal(await footer.locator(boundary.rootSelector).count(), 1);
      assert.equal((await footer.locator(boundary.contextSelector).innerText()).trim(), boundary.contextText);
      const markers = footer.locator(boundary.markerSelector);
      assert.equal(await markers.count(), boundary.markers.length);
      for (const [i, marker] of boundary.markers.entries()) {
        await expect(markers.nth(i)).toBeVisible();
        assert.equal((await markers.nth(i).innerText()).trim(), marker.lines.join('\n'));
      }
      if (javaScriptEnabled) await expect(footer.locator(boundary.rootSelector)).toHaveAttribute('data-visitor-boundary-state', 'verified');
      assert.equal(await footer.locator(':scope > :last-child').getAttribute('class'), 'site-attribution');
      const colors = await footer.evaluate(node => ({
        background: getComputedStyle(node).backgroundColor,
        links: [...node.querySelectorAll('a')].map(link => getComputedStyle(link).color),
      }));
      const background = luminance(colors.background);
      for (const color of colors.links) {
        const foreground = luminance(color);
        assert.ok((Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05) >= 4.5, 'Footer links retain readable contrast on their shared surface.');
      }
      await footer.screenshot({ path: new URL(`${name}-footer.png`, output).pathname });

      const tables = await page.evaluate(observeTableReading);
      assert.deepEqual(tables.map(table => [table.rows, table.columns, table.headers.rows, table.headers.columns]), [[5, 4, 4, 4], [4, 3, 3, 3]]);
      for (const table of tables) {
        assert.equal(table.visible, true);
        assert.ok(table.inspectedTokens > 0);
        assert.deepEqual(table.fragments.filter(item => item.kind !== 'identifier-review'), [], `${table.caption}: ordinary words and numbers remain intact`);
        assert.equal(table.scroll?.focusable, true);
        assert.equal(table.scroll.name, table.caption);
      }
      for (const region of await page.locator('.table-scroll').all()) {
        await region.scrollIntoViewIfNeeded();
        await region.focus();
        await expect(region).toBeFocused();
        const regionBox = await region.boundingBox();
        assert.ok(regionBox && regionBox.x >= -1 && regionBox.x + regionBox.width <= width + 1,
          'The named table scroll region stays inside the viewport.');
        const maximum = await region.evaluate(node => node.scrollWidth - node.clientWidth);
        if (width === 390) assert.ok(maximum > 1, 'Narrow tables retain readable columns through local scrolling.');
        if (maximum > 1) {
          await expect.poll(async () => {
            await region.press('ArrowRight');
            return region.evaluate(node => node.scrollLeft);
          }, { timeout: 15000, intervals: [100] }).toBeGreaterThanOrEqual(maximum - 1);
          const end = await region.evaluate(node => {
            const last = node.querySelector('tr').lastElementChild.getBoundingClientRect();
            const owner = node.getBoundingClientRect();
            return { right: last.right, boundary: owner.left + node.clientLeft + node.clientWidth };
          });
          assert.ok(end.right <= end.boundary + 2, 'The last column is reachable at the right edge.');
          assert.ok(end.right <= width + 1, 'The reached last-column edge is visible within the viewport.');
          await expect.poll(async () => {
            await region.press('ArrowLeft');
            return region.evaluate(node => node.scrollLeft);
          }, { timeout: 15000, intervals: [100] }).toBeLessThanOrEqual(1);
        }
        const start = await region.evaluate(node => ({
          cell: node.querySelector('th').getBoundingClientRect().left,
          boundary: node.getBoundingClientRect().left + node.clientLeft,
        }));
        assert.ok(start.cell >= start.boundary - 2, 'The first column remains reachable.');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'The page contains its reading surface.');

      for (const [i, filename] of figures.entries()) {
        const link = page.locator(`a.story-visual__open[href$="/${filename}"]`);
        await expect(link).toHaveCount(1);
        const image = link.locator('img');
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
        const paint = await image.evaluate(node => [node.closest('figure'), node.parentElement, node].map(owner => ({
          shadow: getComputedStyle(owner).boxShadow,
          filter: getComputedStyle(owner).filter,
        })));
        assert.deepEqual(paint, Array.from({ length: 3 }, () => ({ shadow: 'none', filter: 'none' })),
          'The figure, linked wrapper, and image remain flat; the preserved original retains its authored interior.');
        await link.screenshot({ path: new URL(`${name}-figure-${i + 1}.png`, output).pathname });
        await link.focus();
        await expect(link).toBeFocused();
        const destination = new URL(await link.getAttribute('href'), url).href;
        if (i === 0) await link.press('Enter');
        else await link.click();
        await expect(page).toHaveURL(destination);
        await expect(page.locator('svg[role="img"]')).toBeVisible();
        assert.ok(await page.locator('svg text').count() > 10, 'The standalone destination contains the chart labels.');
        await page.goto(url, { waitUntil: 'load' });
      }
      assertTelemetry(telemetry);
    });
  }
}
