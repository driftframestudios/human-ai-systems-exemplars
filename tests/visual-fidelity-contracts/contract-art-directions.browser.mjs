import '../../tools/node-runtime-admission.mjs';
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

  test(`${engineName} keeps zine editing and recovery reachable with stable narrow controls`, async t => {
    const browser = await engine.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const telemetry = monitor(page);
    // Enlarged narrow reading exercises the longest control labels. The adjacent
    // widths check the family-owned 42rem composition change directly.
    for (const { width, textScale } of [
      { width: 320, textScale: 2 },
      { width: 671, textScale: 1 },
      { width: 672, textScale: 1 },
      { width: 1280, textScale: 1 },
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${server.origin}/visual-fidelity-contracts/ascii-zine-field.specimen.html`);
      if (textScale > 1) await page.addStyleTag({ content: ':root { font-size: 200% !important; }' });
      const title = page.getByLabel('Note title', { exact: true });
      await title.fill('A question we can use');
      await page.getByLabel('Draft artifact', { exact: true }).selectOption('Research question');
      const save = page.getByRole('button', { name: 'Save example', exact: true });
      await save.focus();
      await save.press('Enter');
      assert.equal(await page.locator('#note-status').textContent(), 'Saved in this example: “A question we can use.”');
      assert.equal(await save.evaluate(node => document.activeElement === node), true, 'saving retains keyboard focus');
      assert.notEqual(await save.evaluate(node => getComputedStyle(node).outlineStyle), 'none', 'keyboard focus has a visible outline');

      const control = page.locator('#toggle-annotation');
      const annotation = page.locator('#sample-annotation');
      const original = await annotation.textContent();
      await control.focus();
      const starting = await control.boundingBox();
      await control.press('Space');
      assert.equal(await annotation.getAttribute('data-included'), 'false');
      assert.equal(await annotation.textContent(), original, 'the removed prompt stays readable in its reserved place');
      assert.equal(await control.textContent(), 'Restore sample prompt');
      assert.match(await page.locator('#annotation-status').textContent(), /removed.*Restore/u);
      const removed = await control.boundingBox();
      assert.ok(Math.abs(starting.y - removed.y) < 1, `${width}px: the return control stays at the same page position`);
      assert.equal(await control.evaluate(node => document.activeElement === node), true, 'recovery stays under keyboard focus');
      await control.press('Space');
      assert.equal(await annotation.getAttribute('data-included'), 'true');
      assert.equal(await control.textContent(), 'Remove sample prompt');

      await page.getByRole('button', { name: 'Restore starting title', exact: true }).click();
      assert.equal(await title.inputValue(), 'A better first conversation');
      assert.equal(await page.getByLabel('Draft artifact', { exact: true }).inputValue(), 'Research question', 'title recovery preserves the independent selection');
      await title.fill('');
      await save.click();
      assert.equal(await title.getAttribute('aria-invalid'), 'true');
      assert.equal(await title.evaluate(node => document.activeElement === node), true, 'empty-title recovery points to the affected field');
      assert.match(await page.locator('#note-status').textContent(), /Give the note a title/u);

      const geometry = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('.azf-actions button')].map(node => {
          const box = node.getBoundingClientRect();
          return { width: box.width, height: box.height, left: box.left, right: box.right, scroll: node.scrollWidth, client: node.clientWidth };
        });
        return { client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, buttons };
      });
      assert.ok(geometry.scroll <= geometry.client + 1, `${width}px: the page contains its working content`);
      assert.ok(Math.abs(geometry.buttons[0].width - geometry.buttons[1].width) < 1, 'neighboring actions share a width');
      for (const button of geometry.buttons) {
        assert.ok(button.height >= 44, 'action targets retain comfortable height');
        assert.ok(button.left >= 0 && button.right <= geometry.client, 'action targets remain inside the viewport');
        assert.ok(button.scroll <= button.client + 1, 'button labels fit their own field');
      }
    }
    await page.emulateMedia({ media: 'print' });
    await page.locator('details').evaluate(node => { node.open = false; });
    // Current WebKit recognizes the pseudo-element selector while retaining
    // closed-content hiding. Its print lifecycle supplies the opening below.
    if (engineName !== 'webkit') {
      assert.equal(await page.locator('details p').isVisible(), true, 'Chromium and Firefox print CSS expose the detail reading directly');
    }
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    assert.equal(await page.locator('details p').isVisible(), true, 'the print lifecycle exposes the full detail reading across engines');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.locator('details').evaluate(node => node.open), false, 'the print lifecycle returns the original disclosure choice');
    assertTelemetry(telemetry);
    await page.close();
  });
}

test('zine forced colors, print, and scriptless reading preserve the working meaning', async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  const telemetry = monitor(page);
  await page.goto(`${server.origin}/visual-fidelity-contracts/ascii-zine-field.specimen.html`);
  await page.emulateMedia({ forcedColors: 'active' });
  assert.equal(await page.locator('.azf-ornament').first().isVisible(), false, 'decoration yields to the user-selected palette');
  const remove = page.getByRole('button', { name: 'Remove sample prompt', exact: true });
  assert.equal(await remove.evaluate(node => getComputedStyle(node).borderTopStyle), 'dashed', 'removal retains a visible shape cue');
  await remove.click();
  assert.equal(await page.getByRole('button', { name: 'Restore sample prompt', exact: true }).isVisible(), true);
  assert.match(await page.locator('#annotation-status').textContent(), /removed/u);

  await page.emulateMedia({ forcedColors: 'none', media: 'print' });
  await page.locator('summary').evaluate(node => { node.parentElement.open = false; });
  await page.evaluate(() => {
    window.addEventListener('beforeprint', () => {
      window.printDisclosureWasOpen = document.querySelector('details').open;
    });
  });
  await page.pdf({ format: 'A4' });
  assert.equal(await page.evaluate(() => window.printDisclosureWasOpen), true, 'actual print preparation includes the detail text');
  assert.equal(await page.locator('details').evaluate(node => node.open), false, 'printing returns the visitor to the original collapsed state');
  assert.equal(await page.locator('.azf-card').first().evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)', 'print uses a paper reading');
  assertTelemetry(telemetry);
  await page.close();

  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
  const scriptless = await context.newPage();
  await scriptless.goto(`${server.origin}/visual-fidelity-contracts/ascii-zine-field.specimen.html`);
  await scriptless.getByLabel('Draft artifact', { exact: true }).selectOption('Decision summary');
  assert.equal(await scriptless.getByLabel('Draft artifact', { exact: true }).inputValue(), 'Decision summary');
  assert.equal(await scriptless.locator('.azf-actions button:visible').count(), 0, 'scripted actions become available with their behavior');
  await scriptless.locator('summary').click();
  assert.equal(await scriptless.locator('details').evaluate(node => node.open), false, 'native disclosure works without scripting');
  await scriptless.emulateMedia({ media: 'print' });
  assert.equal(await scriptless.locator('details p').isVisible(), true, 'scriptless printing retains the closed detail text');
  await context.close();
});

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
