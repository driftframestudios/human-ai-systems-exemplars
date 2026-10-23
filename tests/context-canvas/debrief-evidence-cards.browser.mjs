import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';
import { openReadingPage, observeReadingUnits, scrollToReadingUnit, assertIntactUnits, assertContainedReadingFragments } from './reading-unit-helper.mjs';

const inventory = new Map([
  ['choose-your-player-humatics.html', 3], ['fmi-clinical-trial-coordination.html', 2],
  ['ehr-discrete-genomic-result.html', 2], ['ehr-two-charts-one-result.html', 2],
  ['ehr-three-front-doors.html', 2], ['ehr-pgx-alert-failure.html', 2],
  ['ehr-interface-engine-replatform.html', 2], ['spatial-capture-collaborative-memory.html', 2],
  ['multilingual-clinical-vocabulary-practice.html', 2], ['recoverable-enterprise-forms.html', 2],
]);
const selector = '.prose-flow > .debrief-evidence-boundary';
// The reading container reaches 80rem after the page's 80px desktop gutters.
const widths = [390, 1359, 1360, 1440, 2560];
const browsers = new Map();
let server;
const engines = { chromium, firefox, webkit };
function browserFor(name) {
  if (!browsers.has(name)) browsers.set(name, engines[name].launch());
  return browsers.get(name);
}
before(async () => { server = await startStaticServer(); });
after(async () => {
  try { await Promise.all([...browsers.values()].map(async pending => (await pending).close())); }
  finally { await server?.close(); }
});

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const [route, count] of inventory) {
    test(`${engine}: ${route} keeps its evidence cards intact`, { timeout: 60_000 }, async t => {
      const session = await openReadingPage(await browserFor(engine), server.origin, route);
      t.after(session.close);
      const initial = await observeReadingUnits(session.page, selector);
      assert.equal(initial.length, count, 'All declared evidence units participate.');
      assertIntactUnits(initial, 'fresh accepted document');
      for (const width of widths) {
        await session.page.setViewportSize({ width, height: 1000 });
        await t.test(`${width}px`, async () => {
          const units = await observeReadingUnits(session.page, selector);
          assertIntactUnits(units, route);
          assert.ok(units.every(unit => unit.columns === (width < 1360 ? 1 : 2)), 'The actual prose seam participates.');
          for (let index = 0; index < units.length; index++) {
            await scrollToReadingUnit(session.page, selector, index);
            assertIntactUnits([ (await observeReadingUnits(session.page, selector))[index] ], 'visitor reading position');
          }
        });
      }
    });
  }
  for (const mode of ['enlarged', 'no-script', 'print', 'forced-colors']) {
    test(`${engine}: Humatics evidence cards retain ${mode} reading`, { timeout: 45_000 }, async t => {
      const session = await openReadingPage(await browserFor(engine), server.origin, 'choose-your-player-humatics.html', {
        fontSize: mode === 'enlarged' ? 32 : 16, javaScriptEnabled: mode !== 'no-script',
      });
      t.after(session.close);
      if (mode === 'print') await session.page.emulateMedia({ media: 'print' });
      if (mode === 'forced-colors') await session.page.emulateMedia({ forcedColors: 'active' });
      const units = await observeReadingUnits(session.page, selector);
      assert.equal(units.length, 3);
      if (mode === 'print') assertContainedReadingFragments(units, mode);
      else assertIntactUnits(units, mode);
      if (mode === 'print') assert.ok(units.every(unit => unit.display === 'block'), 'Print media retains ordinary block flow.');
      if (mode === 'enlarged') assert.ok(units.every(unit => unit.columns === 1), 'Enlarged text uses the available single reading lane.');
    });
  }
}

test('WebKit: the oracle detects a modeled card split and fresh source recovers', async t => {
  const target = 'aside[aria-labelledby="humatics-solution-evidence-title"]';
  // This deterministic canary models a split unit. Historical natural
  // fragmentation is separate diagnostic evidence, not an engine timing gate.
  const fault = await openReadingPage(await browserFor('webkit'), server.origin, 'choose-your-player-humatics.html', {
    faultCss: `${target} { display: block !important; break-inside: auto !important; }
      ${target} > p:last-child { break-before: column !important; }`,
  });
  t.after(fault.close);
  const split = await observeReadingUnits(fault.page, target);
  assert.ok(split[0].fragments.length > 1, 'The controlled fixture creates real column fragments.');
  assert.throws(() => assertIntactUnits(split, 'modeled split'), /one contiguous painted-unit fragment/u);
  const recovered = await openReadingPage(await browserFor('webkit'), server.origin, 'choose-your-player-humatics.html');
  t.after(recovered.close);
  assertIntactUnits(await observeReadingUnits(recovered.page, target), 'fresh-source recovery');
});

test('WebKit: evidence-card paint remains available at its reading position', async t => {
  const session = await openReadingPage(await browserFor('webkit'), server.origin, 'choose-your-player-humatics.html');
  t.after(session.close);
  const output = new URL('../../.visual-runs/debrief-evidence-cards/', import.meta.url);
  await mkdir(output, { recursive: true });
  for (const index of [1, 2]) {
    await scrollToReadingUnit(session.page, selector, index);
    assertIntactUnits([(await observeReadingUnits(session.page, selector))[index]], 'before paint capture');
    await session.page.screenshot({ path: new URL(`humatics-${index}.png`, output).pathname });
    assertIntactUnits([(await observeReadingUnits(session.page, selector))[index]], 'after paint capture');
  }
});
