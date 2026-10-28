import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { expect } from '@playwright/test';
import { assertTelemetry, monitor } from '../../tools/core-architecture-browser-helper.mjs';
import { createAboutContentFitHarness, engines, fitted, wheelObservation, assertParentReading, observeCodeText } from './about-content-fit-helper.mjs';

const root = resolve(import.meta.dirname, '../..');
const galleryPath = '/v1/canvas/ai-method-gallery/';
const frameSelector = 'iframe[data-about-content-fit="gallery"]';
const captureRoot = join(root, '.visual-runs/about-gallery-fit');
let harness, browsers, parentServer, childServer;
before(async () => {
  await mkdir(captureRoot, { recursive: true });
  harness = await createAboutContentFitHarness();
  ({ browsers, parentServer, childServer } = harness);
});
after(async () => { await harness?.close(); });
const session = (engine, options) => harness.session('gallery', engine, options);
const galleryCode = '#prompt-text, #gallery-state, #gallery-schema';

for (const engine of Object.keys(engines)) {
  test(`${engine}: packaged Gallery grows and shrinks with selection, disclosures, reflow and late content`, { timeout: 90000 }, async () => {
    const observation = await session(engine);
    try {
      assert.equal(observation.frame.url(), `${childServer.origin}${galleryPath}`);
      assert.equal(await observation.carrier.getAttribute('sandbox'), 'allow-popups allow-popups-to-escape-sandbox allow-scripts');
      assert.equal(await observation.frame.evaluate(() => { try { void parent.document.body; return 'readable'; } catch (error) { return error.name; } }), 'SecurityError', 'the actual opaque sandbox retains its DOM boundary');
      const initial = await fitted(observation);
      assert.equal(await observation.frame.locator('[data-gallery-matrix][open]').count(), 0);
      await observation.frame.locator('#tab-catboost').click();
      await observation.frame.locator('[data-prompt="evaluation"]').click();
      await fitted(observation);
      const state = JSON.parse(await observation.frame.locator('#gallery-state').textContent());
      assert.deepEqual(state, { activeMethod: 'catboost', activePrompt: 'evaluation' });
      const beforeOpen = (await fitted(observation)).content;
      await observation.frame.locator('[data-gallery-matrix] summary').first().click();
      await expect.poll(async () => (await fitted(observation)).content).toBeGreaterThan(beforeOpen + 100);
      await observation.frame.locator('[data-gallery-matrix] summary').nth(1).click();
      await observation.frame.locator('.contract summary').click();
      const openHeight = (await fitted(observation)).content;
      assert.equal(await observation.frame.locator('table').count(), 2);
      assert.equal(await observation.frame.locator('tbody tr').count(), 12);
      await observation.frame.locator('[data-gallery-matrix] summary').first().click();
      await observation.frame.locator('[data-gallery-matrix] summary').nth(1).click();
      await observation.frame.locator('.contract summary').click();
      assert.ok((await fitted(observation)).content < openHeight - 100, 'closing complete comparisons restores the shorter reading');

      for (const width of [390, 960, 1440]) {
        await observation.page.setViewportSize({ width, height: 900 });
        await fitted(observation);
        if (engine === 'webkit' && [390, 1440].includes(width)) {
          await observation.carrier.evaluate(element => {
            const nav = document.querySelector('.nav__top--sticky');
            scrollTo({ top: scrollY + element.getBoundingClientRect().top - nav.getBoundingClientRect().height - 16, behavior: 'instant' });
          });
          await observation.page.screenshot({ path: join(captureRoot, `gallery-${engine}-${width}.png`) });
        }
      }
      // Bracket the child's 760px and 1100px composition seams using its actual
      // measured width; the parent owns independent gutters.
      for (const childWidth of [759, 761, 1099, 1101]) {
        let reading = await fitted(observation);
        for (let adjustment = 0; adjustment < 5 && Math.abs(reading.width - childWidth) > 1; adjustment += 1) {
          const currentWidth = observation.page.viewportSize().width;
          await observation.page.setViewportSize({ width: currentWidth + childWidth - reading.width, height: 900 });
          reading = await fitted(observation);
        }
        assert.ok(Math.abs(reading.width - childWidth) <= 1, `child ${reading.width}px brackets the ${childWidth}px source seam`);
      }
      await observation.page.setViewportSize({ width: 390, height: 900 });
      await observation.frame.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      const enlarged = await fitted(observation);
      assert.ok(enlarged.content > initial.content);
      await observation.frame.evaluate(() => {
        const delayed = document.createElement('p');
        delayed.id = 'late-gallery-observation';
        delayed.style.minHeight = '400px';
        delayed.textContent = 'A delayed source-owned note exercises content growth.';
        document.body.append(delayed);
      });
      await expect.poll(async () => (await fitted(observation)).content).toBeGreaterThan(enlarged.content + 350);
      await observation.frame.locator('#late-gallery-observation').evaluate(element => element.remove());
      await expect.poll(async () => (await fitted(observation)).content).toBeLessThan(enlarged.content + 5);
      const sizes = await observation.carrier.evaluate(async element => {
        const values = [];
        for (let sample = 0; sample < 8; sample += 1) { await new Promise(requestAnimationFrame); values.push(element.getBoundingClientRect().height); }
        return values;
      });
      assert.equal(new Set(sizes).size, 1, 'a settled natural-height reading remains stable over successive paint frames');
      assert.deepEqual(JSON.parse(await observation.frame.locator('#gallery-state').textContent()), state, 'layout changes retain both independent selections');
    } finally { await observation.close(); }
  });

  test(`${engine}: vertical wheel reading stays with About and exposes the former fixed-height fault`, { timeout: 60000 }, async () => {
    const observation = await session(engine);
    try {
      await fitted(observation);
      assertParentReading(await wheelObservation(observation));
      assertParentReading(await wheelObservation(observation, '#prompt-display'));
      await observation.frame.locator('.contract summary').click();
      await fitted(observation);
      assertParentReading(await wheelObservation(observation, '#gallery-schema'));
      await observation.page.setViewportSize({ width: 390, height: 900 });
      await fitted(observation);
      assertParentReading(await wheelObservation(observation));
    } finally { await observation.close(); }
    // A fresh receiving document gives the fault its own wheel transaction;
    // Firefox can retain a previous parent scroll target during a wheel series.
    const faultObservation = await session(engine, { viewport: { width: 390, height: 900 } });
    try {
      await fitted(faultObservation);
      await faultObservation.carrier.evaluate(element => { element.style.setProperty('block-size', '420px', 'important'); });
      const fault = await wheelObservation(faultObservation);
      assert.ok(fault.child > 5, `the restored bounded frame receives vertical input: ${JSON.stringify(fault)}`);
      assert.throws(() => assertParentReading(fault), /About receives vertical reading input|fitted instrument retains/, 'the reading oracle detects captured scrolling');
    } finally { await faultObservation.close(); }
    const recovered = await session(engine, { viewport: { width: 390, height: 900 } });
    try {
      await fitted(recovered);
      assertParentReading(await wheelObservation(recovered));
    } finally { await recovered.close(); }
  });

  test(`${engine}: foreign initialization, document navigation and failure preserve the receiving boundary`, { timeout: 60000 }, async () => {
    const observation = await session(engine);
    const settleSelectedImages = () => observation.frame.locator('.panel:not([hidden]) img').evaluateAll(images => Promise.all(images.map(image => {
      image.loading = 'eager';
      return image.decode();
    })));
    try {
      await fitted(observation);
      const baseline = await observation.carrier.evaluate(element => element.getBoundingClientRect().height);
      await observation.page.evaluate(() => window.postMessage({ type: 'context-canvas:content-fit-height', version: 1, height: 99999 }, '*'));
      await observation.context.route(`${parentServer.origin}/gallery-foreign-sender.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><script>
        const channel = new MessageChannel();
        parent.__foreignGalleryReports = 0;
        channel.port1.onmessage = () => { parent.__foreignGalleryReports += 1; };
        parent.document.querySelector('${frameSelector}').contentWindow.postMessage({type:'context-canvas:content-fit-connect',version:1}, '*', [channel.port2]);
      </script>` }));
      await observation.page.evaluate(async origin => {
        const sender = document.createElement('iframe');
        sender.id = 'foreign-gallery-sender';
        sender.hidden = true;
        sender.src = `${origin}/gallery-foreign-sender.html`;
        const loaded = new Promise(resolve => sender.addEventListener('load', resolve, { once: true }));
        document.body.append(sender);
        await loaded;
      }, parentServer.origin);
      assert.equal(await observation.carrier.evaluate(element => element.getBoundingClientRect().height), baseline);
      await observation.frame.locator('[data-gallery-matrix] summary').first().click();
      await expect.poll(async () => (await fitted(observation)).content).toBeGreaterThan(baseline + 100);
      assert.equal(await observation.page.evaluate(() => window.__foreignGalleryReports), 0, 'a different frame receives no Gallery sizing channel');
      await observation.context.route(`${childServer.origin}/old-gallery.html`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Prior child</title><p style="height:1600px">Readable prior Gallery document.</p>' }));
      // Finish the selected panel's lazy images before intentionally unloading
      // its document; genuine request failures remain in strict telemetry.
      await settleSelectedImages();
      await observation.frame.goto(`${childServer.origin}/old-gallery.html`);
      await expect(observation.carrier).not.toHaveAttribute('data-content-fit', 'ready');
      assert.ok(await observation.carrier.evaluate(element => element.getBoundingClientRect().height) > 300, 'a child without the protocol retains ordinary fallback space');
      assert.equal(await observation.page.locator('a[href="../../collaboration/about-ai-method-gallery/index.html"]').count(), 1);
      await observation.frame.goto(`${childServer.origin}${galleryPath}`);
      await fitted(observation);
      await settleSelectedImages();
    } finally { await observation.close(); }
    const fallback = await session(engine, { childObserverAvailable: false });
    try {
      assert.equal(await fallback.frame.locator('[data-gallery-matrix][open]').count(), 2);
      assert.equal(await fallback.carrier.getAttribute('data-content-fit'), null);
      assert.ok(await fallback.carrier.evaluate(element => element.getBoundingClientRect().height) > 300);
    } finally { await fallback.close(); }
  });

  test(`${engine}: opened Gallery contract text fits narrow and enlarged readings`, { timeout: 60000 }, async () => {
    const observation = await session(engine, { viewport: { width: 320, height: 900 } });
    try {
      await fitted(observation);
      await observation.frame.locator('.contract summary').click();
      for (const [width, fontSize] of [[320, 16], [390, 32]]) {
        await observation.page.setViewportSize({ width, height: 900 });
        await observation.frame.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, fontSize);
        await fitted(observation);
        const readings = await observeCodeText(observation.frame, galleryCode);
        assert.deepEqual(readings.map(reading => reading.id), ['prompt-text', 'gallery-state', 'gallery-schema']);
        for (const reading of readings) {
          assert.ok(reading.fragments.length > 0, `${reading.id} has visible text`);
          assert.ok(reading.box.left >= 0 && reading.box.right <= reading.viewport + 1, `${reading.id} box fits the child viewport`);
          assert.ok(reading.fragments.every(fragment => fragment.left >= reading.box.left - 1 && fragment.right <= reading.box.right + 1), `${reading.id} text fragments fit their readable box at ${width}px/${fontSize}px: ${JSON.stringify(reading)}`);
        }
      }
      await observation.frame.locator('#prompt-text, #gallery-state, #gallery-schema').evaluateAll(elements => elements.forEach(element => { element.style.overflowWrap = 'normal'; }));
      const fault = await observeCodeText(observation.frame, galleryCode);
      assert.ok(fault.some(reading => reading.fragments.some(fragment => fragment.right > reading.box.right + 1)), 'restoring ordinary word wrapping exposes the enlarged-text overflow');
      await observation.frame.locator('#prompt-text, #gallery-state, #gallery-schema').evaluateAll(elements => elements.forEach(element => element.style.removeProperty('overflow-wrap')));
      await fitted(observation);
      const recovered = await observeCodeText(observation.frame, galleryCode);
      assert.ok(recovered.every(reading => reading.fragments.every(fragment => fragment.right <= reading.box.right + 1)), 'the source-owned wrapping restores complete visible text');
    } finally { await observation.close(); }
  });

  test(`${engine}: Gallery keyboard, standalone and print readings retain complete comparison content`, { timeout: 60000 }, async () => {
    const observation = await session(engine, { reducedMotion: 'reduce' });
    try {
      await fitted(observation);
      const nextLinkKey = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
      await observation.page.locator('a[href="../../collaboration/about-heatmap-comparison/index.html"]').focus();
      await observation.page.keyboard.press(nextLinkKey);
      // Firefox may expose the child document as an intermediate tab stop.
      if (await observation.frame.evaluate(() => document.activeElement === document.body)) {
        await observation.page.keyboard.press(nextLinkKey);
      }
      await expect(observation.frame.locator('a[href="https://arxiv.org/abs/2307.03172"]')).toBeFocused();
      const tab = observation.frame.locator('#tab-rct');
      await tab.focus();
      await observation.page.keyboard.press('End');
      await expect(observation.frame.locator('#tab-viewlet')).toBeFocused();
      await expect(observation.frame.locator('#tab-viewlet')).toHaveAttribute('aria-selected', 'true');
      await fitted(observation);
      await observation.page.keyboard.press(nextLinkKey);
      assert.equal(await observation.frame.evaluate(() => document.activeElement.closest('[hidden]') === null), true, 'keyboard navigation stays in the visible reading');
      await observation.frame.locator('.contract summary').focus();
      await observation.page.keyboard.press(nextLinkKey);
      await expect(observation.page.locator('a[href="../../collaboration/about-ai-method-gallery/index.html"]')).toBeFocused();

    } finally { await observation.close(); }
    // About's established print policy hides embedded instruments. The Gallery's
    // independently visible full view owns the printable comparison contract.
    const printContext = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 900 } });
    try {
      const page = await printContext.newPage();
      const telemetry = monitor(page);
      await page.goto(`${parentServer.origin}/collaboration/about-ai-method-gallery/index.html`);
      await page.locator('[data-gallery-matrix] summary').first().click();
      const screenChoices = await page.locator('details').evaluateAll(items => items.map(item => item.open));
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('details:not([open])').count(), 0, 'the explicit print event opens all comparisons');
      assert.equal(await page.locator('.panel:visible').count(), 6);
      assert.equal(await page.locator('table tbody tr:visible').count(), 12, 'all twelve comparison rows are visibly laid out in the standalone print reading');
      assert.equal(await page.locator('.contract pre:visible').count(), 2);
      const printBoxes = await page.locator('table tbody tr, .contract pre').evaluateAll(items => items.map(item => ({ width: item.getBoundingClientRect().width, height: item.getBoundingClientRect().height, visibility: getComputedStyle(item).visibility })));
      assert.ok(printBoxes.every(box => box.width > 0 && box.height > 0 && box.visibility === 'visible'));
      await page.emulateMedia({ media: 'screen' });
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      assert.deepEqual(await page.locator('details').evaluateAll(items => items.map(item => item.open)), screenChoices, 'screen disclosure choices recover after explicit print-event handling');
      assertTelemetry(telemetry);
    } finally { await printContext.close(); }
    const standaloneContext = await browsers.get(engine).newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
    try {
      const page = await standaloneContext.newPage();
      const telemetry = monitor(page);
      await page.goto(`${parentServer.origin}/collaboration/about-ai-method-gallery/index.html`);
      assert.equal(await page.locator('[data-gallery-matrix][open]').count(), 2);
      assert.equal(await page.locator('.panel:visible').count(), 6);
      assert.equal(await page.locator('table tbody tr').count(), 12);
      assertTelemetry(telemetry);
    } finally { await standaloneContext.close(); }
  });
}
