import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';
import {
  openReadingPage, observeReadingUnits, assertIntactUnits, scrollToReadingUnit,
} from './reading-unit-helper.mjs';

const routes = new Map([
  ['genomic-viewer-replatforming.html', 3],
  ['fmi-clinical-trial-coordination.html', 3],
  ['fmi-lims-eln-replatforming.html', 6],
  ['choose-your-player-humatics.html', 1],
  ['who-to-believe-reviews-platform.html', 2],
  ['initiative-costing.html', 1],
  ['field-inspection-harness-replatform.html', 2],
]);
const selector = '.prose-flow > :is(.interpretive-aside, .discovery-callout, .debrief-quote):not(.debrief-quote--orientation)';
const orientationSelector = '.prose-flow > .debrief-quote--orientation';
const definitionSelector = '.prose-flow > .cornerstone-definition';
const clinical = 'fmi-clinical-trial-coordination.html';
// The 80rem canvas-reading threshold follows the 80px desktop page gutters.
const widths = [390, 1359, 1360, 1440, 2560];
const engines = { chromium, firefox, webkit };
const browsers = new Map();
const captureRoot = resolve('.visual-runs/debrief-callout-integrity');
let server;

before(async () => { server = await startStaticServer(); });
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function withReading(engine, route, options, run) {
  if (!browsers.has(engine)) browsers.set(engine, await engines[engine].launch());
  const session = await openReadingPage(browsers.get(engine), server.origin, route, options);
  try { return await run(session.page); }
  finally { await session.close(); }
}

async function assertCallouts(page, route) {
  const units = await observeReadingUnits(page, selector);
  assert.equal(units.length, routes.get(route), `${route}: every authored callout and quote participates`);
  assertIntactUnits(units, `${route}: callout and quotation`);
  const orientations = await observeReadingUnits(page, orientationSelector);
  if (orientations.length) assertIntactUnits(orientations, `${route}: retained orientation`);
  return units;
}

for (const engine of Object.keys(engines)) {
  for (const route of routes.keys()) {
    test(`${engine}: ${route} keeps prose-local callouts intact across the column seam`, { timeout: 120_000 }, async t => {
      for (const width of widths) {
        await t.test(`${width}px`, () => withReading(engine, route, {
          viewport: { width, height: 1000 },
        }, async page => {
          await assertCallouts(page, route);
          // A real reading position follows fresh-document observation. The
          // earlier WebKit defect could change after scrolling or reflow.
          await scrollToReadingUnit(page, selector, 0);
          await assertCallouts(page, route);
        }));
      }
    });
  }

  for (const mode of ['enlarged', 'no-script', 'forced-colors', 'print']) {
    test(`${engine}: Clinical callouts retain complete reading with ${mode}`, { timeout: 45_000 }, async () => {
      await withReading(engine, clinical, {
        viewport: { width: mode === 'enlarged' ? 390 : 1440, height: 1000 },
        fontSize: mode === 'enlarged' ? 32 : 16,
        javaScriptEnabled: mode !== 'no-script',
      }, async page => {
        if (mode === 'forced-colors') await page.emulateMedia({ forcedColors: 'active' });
        if (mode === 'print') await page.emulateMedia({ media: 'print' });
        await assertCallouts(page, clinical);
        if (mode === 'print') {
          const display = await page.locator(selector).evaluateAll(elements => elements.map(element => getComputedStyle(element).display));
          assert.ok(display.every(value => value === 'block'), 'Printed callouts retain ordinary block pagination.');
        }
      });
    });
  }

  test(`${engine}: Clinical reconstructed quotations retain their statements and attribution`, { timeout: 45_000 }, async () => {
    await withReading(engine, clinical, {}, async page => {
      const bareQuotes = '.prose-flow > blockquote:not([class])';
      const quotes = await observeReadingUnits(page, bareQuotes);
      assert.equal(quotes.length, 2, 'Both reconstructed quotations receive their own disposition.');
      assertIntactUnits(quotes, 'Clinical reconstructed quotations');
      await scrollToReadingUnit(page, bareQuotes, 0);
      assertIntactUnits(await observeReadingUnits(page, bareQuotes), 'Clinical quotations at the reading position');
      const footers = await page.locator(bareQuotes).evaluateAll(elements => elements.map(element => ({
        statement: element.querySelector(':scope > p')?.textContent.trim(),
        attribution: element.querySelector(':scope > footer')?.textContent.trim(),
      })));
      assert.ok(footers.every(quote => quote.statement && quote.attribution), 'Each statement retains its authored attribution.');
    });
  });

  test(`${engine}: a Clinical callout keeps its reference reachable by keyboard`, { timeout: 45_000 }, async () => {
    await withReading(engine, clinical, {}, async page => {
      const link = page.locator('.interpretive-aside a[href="#source-fda-master-protocol"]');
      await link.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await link.evaluate(element => document.activeElement === element), true, 'Keyboard traversal returns to the authored reference.');
      await assertCallouts(page, clinical);
    });
  });
}

// This deliberate paragraph-to-footer break is a deterministic mechanism
// canary. The retrospective source captures retain the natural WebKit fault;
// this model makes its lost statement/attribution boundary reproducible.
const splitDefinition = `
  ${definitionSelector} { display: block !important; inline-size: auto !important; }
  ${definitionSelector} > p { break-after: column !important; }
`;
for (const route of ['who-to-believe-reviews-platform.html', 'field-inspection-harness-replatform.html']) {
  test(`webkit: ${route} distinguishes a split definition and fresh recovery`, { timeout: 60_000 }, async () => {
    await mkdir(captureRoot, { recursive: true });
    await withReading('webkit', route, { faultCss: splitDefinition }, async page => {
      const broken = await observeReadingUnits(page, definitionSelector);
      assert.equal(broken.length, 1, 'The named definition remains available in the modeled fault.');
      assert.ok(broken[0].fragments.length > 1, 'The forced paragraph break splits the definition frame.');
      assert.throws(() => assertIntactUnits(broken, route), 'The intact-unit oracle rejects the split definition.');
      await scrollToReadingUnit(page, definitionSelector, 0);
      await page.screenshot({ path: resolve(captureRoot, `${route.replace('.html', '')}-modeled-fault.png`) });
    });
    await withReading('webkit', route, {}, async page => {
      await assertCallouts(page, route);
      await scrollToReadingUnit(page, definitionSelector, 0);
      await assertCallouts(page, route);
      await page.screenshot({ path: resolve(captureRoot, `${route.replace('.html', '')}-accepted.png`) });
    });
  });
}
