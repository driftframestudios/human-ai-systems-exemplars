import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const route = '/context-canvas-project-surface/context-canvas/prompt-side-conditions-practice.html';
const svgRoute = '/context-canvas-project-surface/img/plot/prompt_side_practice_field.svg';
const tableName = 'Table 2 · Nine sanitation moves and the condition each one creates';
const output = new URL('../../.visual-runs/prompt-side-figure/', import.meta.url);
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
  for (const javaScriptEnabled of [false, true]) {
    test(`prompt-side figure at ${width}px, enhancement ${javaScriptEnabled ? 'enabled' : 'unavailable'}`, async t => {
      const context = await browser.newContext({
        viewport: { width, height: 1000 }, javaScriptEnabled, reducedMotion: 'reduce',
      });
      t.after(() => context.close());
      // The article owns this observation; the instrument retains its separate browser contract.
      await context.route('https://iframes.vik.guru/v1/canvas/open-lesson-field/', request =>
        request.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local instrument stand-in</title><p>Instrument behavior has a separate observation owner.</p>' }));
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const telemetry = monitor(page);
      const url = `${server.origin}${route}`;
      const destination = `${server.origin}${svgRoute}`;
      const figure = page.locator('figure.story-visual--system-map');
      const imageLink = figure.getByRole('link', { name: 'View the prompt collaboration service loop at full size', exact: true });
      const captionLink = figure.getByRole('link', { name: 'Open the field at full size', exact: true });
      const image = imageLink.locator('img');
      const table = page.getByRole('table', { name: tableName, exact: true });

      await page.goto(url, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await expect(imageLink).toHaveAttribute('href', '../img/plot/prompt_side_practice_field.svg');
      await expect(captionLink).toHaveAttribute('href', '../img/plot/prompt_side_practice_field.svg');
      await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
      await expect(table.locator('tbody tr')).toHaveCount(9);
      assert.deepEqual(await table.locator('thead th').allTextContents(), ['Move', 'Positive operating condition', 'Question for review']);
      assert.equal(await figure.evaluate(node => node.nextElementSibling?.querySelector('table caption')?.textContent), tableName,
        'The native text equivalent follows the figure.');
      await expect(figure.locator('figcaption')).toContainText('Table 2 details the nine prompt-side moves.');

      for (const media of ['screen', 'print']) {
        await page.emulateMedia({ media });
        await expect(image).toBeVisible();
        await expect(captionLink).toBeVisible();
        await expect(table).toBeVisible();
        await expect(table.locator('tbody tr').last()).toBeVisible();
        const geometry = await figure.evaluate(node => {
          const link = node.querySelector('a');
          const image = link.querySelector('img');
          const rect = item => {
            const box = item.getBoundingClientRect();
            return { left: box.left, right: box.right, width: box.width, height: box.height };
          };
          return { boxes: [rect(node), rect(link), rect(image)], viewport: document.documentElement.clientWidth,
            pageWidth: document.documentElement.scrollWidth };
        });
        if (media === 'screen') {
          assert.ok(geometry.pageWidth <= geometry.viewport + 1, 'The screen article remains inside its viewport.');
        }
        for (const box of geometry.boxes) {
          assert.ok(box.width > 0 && box.height > 0 && box.left >= -1 && box.right <= geometry.viewport + 1,
            'The figure, link and image present a complete overview within the reading surface.');
        }
        await figure.screenshot({ path: new URL(`${width}-${javaScriptEnabled ? 'enhanced' : 'static'}-${media}.png`, output).pathname });
      }

      await page.emulateMedia({ media: 'screen' });
      await captionLink.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(imageLink).toBeFocused();
      const focus = await imageLink.evaluate(node => {
        const style = getComputedStyle(node);
        return { visible: node.matches(':focus-visible'), style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      assert.equal(focus.visible, true, 'Keyboard focus identifies the image link.');
      assert.ok(focus.style !== 'none' && focus.width >= 1, 'The shared native link outline remains visible.');
      await imageLink.press('Enter');
      await expect(page).toHaveURL(destination);
      await expect(page.locator('svg[role="img"]')).toBeVisible();
      await expect(page.locator('svg > title')).toHaveText('Prompt collaboration service loop');
      assert.ok(await page.locator('svg text').count() > 20, 'Full-size reading retains the authored diagram labels.');

      await page.goto(url, { waitUntil: 'load' });
      await image.click();
      await expect(page).toHaveURL(destination);
      await expect(page.locator('svg[role="img"]')).toBeVisible();
      assertTelemetry(telemetry);
    });
  }
}
