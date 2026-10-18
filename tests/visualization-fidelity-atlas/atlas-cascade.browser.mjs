import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const route = '/context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html';
const browsers = new Map();
let server;
before(async () => {
  server = await startStaticServer();
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    browsers.set(name, await engine.launch({ headless: true }));
  }
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function openAtlas(t, engine, width, javaScriptEnabled = true) {
  const page = await browsers.get(engine).newPage({
    viewport: { width, height: 1000 }, reducedMotion: 'reduce', javaScriptEnabled,
  });
  t.after(() => page.close());
  await page.route('https://iframes.vik.guru/**', request => request.fulfill({
    status: 200, contentType: 'text/html', body: '<!doctype html><title>Separately owned instrument</title>',
  }));
  await page.goto(server.origin + route, { waitUntil: 'load' });
  if (javaScriptEnabled) {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('[data-gallery-controls]')).toBeVisible();
  }
  return page;
}

async function assertLocalReading(page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      pageWidth: root.scrollWidth, viewport: root.clientWidth,
      tables: [...document.querySelectorAll('.atlas-reference .table-scroll table')].map(node => getComputedStyle(node).minWidth),
      figures: [...document.querySelectorAll('.atlas-gallery-figure svg, .atlas-gallery-figure img')].map(node => getComputedStyle(node).minInlineSize),
      flat: [...document.querySelectorAll('.atlas-reference .story-visual, .atlas-reference .story-visual__open, .atlas-reference .story-visual img')].map(node => {
        const style = getComputedStyle(node);
        return [style.boxShadow, style.filter];
      }),
      regions: [...document.querySelectorAll('.atlas-reference .table-scroll')].filter(node => node.getBoundingClientRect().height > 0).map(node => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, width: node.clientWidth, content: node.scrollWidth };
      }),
    };
  });
  assert.ok(result.tables.length > 0 && result.figures.length > 0 && result.flat.length > 0);
  assert.ok(result.tables.every(value => value === '672px'), 'Reference tables retain their 42rem screen reading width.');
  assert.ok(result.figures.every(value => value === '960px'), 'Gallery figures retain their 60rem screen reading width.');
  assert.ok(result.flat.every(value => value[0] === 'none' && value[1] === 'none'), 'Reference figures retain their flat comparison treatment.');
  assert.ok(result.pageWidth <= result.viewport + 1, 'Wide figures and tables stay inside local reading windows.');
  for (const region of result.regions) {
    assert.ok(region.left >= -1 && region.right <= result.viewport + 1, 'Each visible scroll region stays in the viewport.');
  }
  if (result.viewport === 390) assert.ok(result.regions.some(region => region.content > region.width + 1), 'Narrow reading keeps wide evidence locally scrollable.');
}

async function assertPrintedReference(detail) {
  // Playwright's WebKit visibility fallback rejects every closed-details
  // descendant. Native visibility and geometry observe the CSS-expanded print
  // content; a controlled details-content fault below exercises this oracle.
  const observed = await detail.evaluate(node =>
    [node.querySelector('img'), node.querySelector('caption'), node.querySelector('tbody tr:last-child')].map(child => {
      const box = child.getBoundingClientRect();
      return child.checkVisibility() && box.width > 0 && box.height > 0;
    }));
  assert.deepEqual(observed, [true, true, true], 'Print reveals each reference figure, caption and final data row.');
}

async function assertCellVisibility(page, visible) {
  const labels = page.locator('[data-gallery-cell-control]');
  assert.equal(await labels.count(), 2);
  for (const label of await labels.all()) {
    if (visible) await expect(label).toBeVisible();
    else await expect(label).toBeHidden();
  }
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const width of [390, 1440, 2560]) {
    test(`${engine}: Atlas local reading and control visibility at ${width}px`, async t => {
      const page = await openAtlas(t, engine, width);
      await assertLocalReading(page);
      await assertCellVisibility(page, false);
      const view = page.locator('[data-gallery-controls] [name="view"]');
      await view.selectOption('conditions');
      await assertCellVisibility(page, true);
      await assertLocalReading(page);
      await view.selectOption('rate');
      await assertCellVisibility(page, false);
    });
  }

  test(`${engine}: Atlas print reveals reference details and retains forced-color controls`, async t => {
    const page = await openAtlas(t, engine, 1440);
    await page.emulateMedia({ forcedColors: 'active' });
    assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
    const form = page.locator('[data-gallery-controls]');
    await expect(form).toBeVisible();
    for (const control of await form.locator('select:visible').all()) {
      const border = await control.evaluate(node => {
        const style = getComputedStyle(node);
        return { width: Number.parseFloat(style.borderTopWidth), style: style.borderTopStyle };
      });
      assert.ok(border.width > 0 && border.style === 'solid');
    }
    const baseline = page.locator('[data-gallery-baseline]');
    assert.equal(await baseline.getAttribute('open'), null, 'Enhancement keeps the reference collection collapsed on screen.');
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    await expect(form).toBeHidden();
    await expect(page.locator('[data-gallery-live]')).toBeHidden();
    const references = baseline.locator(':scope > details');
    assert.equal(await references.count(), 4);
    for (const detail of await references.all()) {
      await assertPrintedReference(detail);
      await detail.locator('img').evaluate(node => node.scrollIntoView());
      await expect.poll(() => detail.locator('img').evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
      assert.ok(['0px', 'auto'].includes(await detail.locator('img').evaluate(node => getComputedStyle(node).minInlineSize)),
        'Printed figures release their screen-only minimum width.');
    }
    const perturbation = await page.addStyleTag({ content: '@media print { .atlas-gallery details::details-content { content-visibility: hidden !important; } }' });
    try { await assert.rejects(() => assertPrintedReference(references.nth(1)), /Print reveals/u); }
    finally { await perturbation.evaluate(node => node.remove()); }
    for (const detail of await references.all()) await assertPrintedReference(detail);
    await page.emulateMedia({ media: 'screen' });
    await expect(form).toBeVisible();
    await expect(page.locator('[data-gallery-live]')).toBeVisible();
    assert.equal(await baseline.getAttribute('open'), null, 'Print leaves the accepted screen expansion state intact.');
  });

  test(`${engine}: scriptless Atlas keeps native reference and local scroll access`, async t => {
    const page = await openAtlas(t, engine, 390, false);
    await expect(page.locator('[data-gallery-controls]')).toBeHidden();
    await expect(page.locator('[data-gallery-live]')).toBeHidden();
    await expect(page.locator('[data-gallery-baseline]')).toHaveAttribute('open', '');
    await assertLocalReading(page);
  });

  test(`${engine}: Atlas oracle distinguishes a lost local reading width and restored state`, async t => {
    const page = await openAtlas(t, engine, 390);
    await assertLocalReading(page);
    const perturbation = await page.addStyleTag({ content: '.atlas-gallery .atlas-gallery-figure svg, .atlas-gallery .atlas-gallery-figure img { min-inline-size: 0 !important; }' });
    try { await assert.rejects(() => assertLocalReading(page), /60rem screen reading width/u); }
    finally { await perturbation.evaluate(node => node.remove()); }
    await assertLocalReading(page);
  });
}
