import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

test('standalone reference keeps a visible gap between column headings', async context => {
  const browser = await chromium.launch({ headless: true });
  context.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(new URL('../../context-canvas-project-surface/img/plot/visualization_fidelity_clean_exemplar.svg', import.meta.url).href);
  await page.evaluate(() => document.fonts.ready);
  const gap = () => page.evaluate(() => {
    const windowBox = document.getElementById('window-heading').getBoundingClientRect();
    const rateBox = document.getElementById('rate-heading').getBoundingClientRect();
    return rateBox.left - windowBox.right;
  });
  assert.ok(await gap() >= 16, 'Column headings retain at least 16 CSS pixels of separation at native size.');
  assert.equal(await page.locator('#comparison > g[data-period]').count(), 4);
  const run = new URL('../../.visual-runs/atlas-reference-svg/', import.meta.url);
  await mkdir(run, { recursive: true });
  await page.screenshot({ path: new URL('reference.png', run).pathname });
  await page.locator('#window-heading').evaluate(element => { element.textContent = 'OBSERVATION WINDOW'; });
  assert.ok(await gap() < 16, 'The original crowded wording exercises the same rendered-gap boundary.');
  assert.deepEqual(errors, [], 'The standalone figure renders with clean page telemetry.');
});
