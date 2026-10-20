import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';

import {
  assertTelemetry,
  monitor,
  startStaticServer,
} from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const specimens = [
  {
    id: 'industrial-ink',
    route: '/visual-fidelity-contracts/contracts/industrial-ink/specimen.html',
    control: 'input[value="assembly-hold"]',
    detail: '[data-detail-title]',
    expectedDetail: /Assembly · Hold/u,
    expectedCells: 16,
    cellSelector: '[data-matrix-cell]',
  },
  {
    id: 'soft-color-blocking',
    route: '/visual-fidelity-contracts/contracts/soft-color-blocking/specimen.html',
    control: 'input[value="review"]',
    detail: '[data-detail-title]',
    expectedDetail: /Review/u,
    expectedCells: 4,
    cellSelector: '.step',
  },
];

let server;

test.before(async () => {
  server = await startStaticServer();
});

test.after(async () => {
  if (server) await server.close();
});

for (const [engineName, engine] of Object.entries(engines)) {
  test(`${engineName} preserves both art-direction contracts across narrow, ordinary, and wide readings`, async t => {
    const browser = await engine.launch();
    t.after(() => browser.close());

    for (const viewport of [
      { width: 320, height: 800, textScale: 2 },
      { width: 1024, height: 900, textScale: 1 },
      { width: 1600, height: 1000, textScale: 1 },
    ]) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'reduce',
      });
      const telemetry = monitor(page);

      for (const specimen of specimens) {
        await page.goto(`${server.origin}${specimen.route}`);
        if (viewport.textScale > 1) {
          await page.addStyleTag({ content: `:root { font-size: ${viewport.textScale * 100}% !important; }` });
        }

        assert.equal(await page.locator(specimen.cellSelector).count(), specimen.expectedCells, specimen.id);
        const control = page.locator(specimen.control);
        await control.focus();
        await control.press('Space');
        assert.equal(await control.isChecked(), true, `${specimen.id} retains native selection`);
        assert.match(await page.locator(specimen.detail).textContent(), specimen.expectedDetail);

        const overflow = await page.evaluate(() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(overflow.scroll <= overflow.client + 1, `${specimen.id} ${viewport.width}px ${JSON.stringify(overflow)}`);
      }

      assertTelemetry(telemetry);
      await page.close();
    }
  });
}

test('alternate media retain structure, written state, and a script-independent reading', async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());

  for (const specimen of specimens) {
    const forcedPage = await browser.newPage({
      viewport: { width: 1024, height: 900 },
      forcedColors: 'active',
      reducedMotion: 'reduce',
    });
    const forcedTelemetry = monitor(forcedPage);
    await forcedPage.goto(`${server.origin}${specimen.route}`);
    assert.equal(await forcedPage.locator(specimen.cellSelector).count(), specimen.expectedCells);
    assert.notEqual(await forcedPage.locator(specimen.cellSelector).first().evaluate(node => getComputedStyle(node).display), 'none');
    assertTelemetry(forcedTelemetry);
    await forcedPage.close();

    const printPage = await browser.newPage({ viewport: { width: 1024, height: 900 } });
    const printTelemetry = monitor(printPage);
    await printPage.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
    await printPage.goto(`${server.origin}${specimen.route}`);
    assert.equal(await printPage.locator(specimen.cellSelector).count(), specimen.expectedCells);
    assert.notEqual(await printPage.locator('main').evaluate(node => getComputedStyle(node).display), 'none');
    assertTelemetry(printTelemetry);
    await printPage.close();
  }

  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  for (const specimen of specimens) {
    await page.goto(`${server.origin}${specimen.route}`);
    await page.locator('noscript').getByText(/complete reading/iu).waitFor();
    assert.equal(await page.locator(specimen.cellSelector).count(), specimen.expectedCells);
  }
  await context.close();
});
