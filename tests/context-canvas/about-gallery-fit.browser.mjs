import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { assertTelemetry, monitor, startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';
import { createCanvasPackagePlan } from '../../tools/package-canvas-iframe-routes.mjs';
import { writePackagePlan } from '../../tools/iframe-route-package-engine.mjs';

const root = resolve(import.meta.dirname, '../..');
const aboutPath = '/context-canvas-project-surface/context-canvas/index.html';
const galleryPath = '/v1/canvas/ai-method-gallery/';
const hostedGallery = `https://iframes.vik.guru${galleryPath}`;
const frameSelector = 'iframe[data-about-gallery-fit]';
const engines = { chromium, firefox, webkit };
const browsers = new Map();
const captureRoot = join(root, '.visual-runs/about-gallery-fit');
let parentServer;
let childServer;
let temporaryRoot;
let parentHtml;

before(async () => {
  await mkdir(captureRoot, { recursive: true });
  parentHtml = await readFile(join(root, aboutPath), 'utf8');
  assert.match(parentHtml, /data-about-gallery-fit/, 'the actual About carrier opts into the owned adapter');
  const plan = await createCanvasPackagePlan();
  temporaryRoot = await mkdtemp(join(tmpdir(), 'about-gallery-package-'));
  await writePackagePlan(plan, join(temporaryRoot, 'v1/canvas'));
  parentServer = await startStaticServer(root);
  childServer = await startStaticServer(temporaryRoot);
  assert.notEqual(parentServer.origin, childServer.origin, 'the packaged child has a distinct receiving origin');
});
after(async () => {
  await Promise.all([...browsers.values()].map(browser => browser.close()));
  await parentServer?.close();
  await childServer?.close();
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
});

async function session(engine, options = {}) {
  if (!browsers.has(engine)) browsers.set(engine, await engines[engine].launch());
  const { childObserverAvailable = true, ...contextOptions } = options;
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 900 }, ...contextOptions });
  if (!childObserverAvailable) await context.addInitScript(() => { window.ResizeObserver = undefined; });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === parentServer.origin && url.pathname === aboutPath) {
      // The stored carrier keeps its approved hosted alias. This response alone
      // receives the freshly packaged child while publication is held.
      await route.fulfill({ contentType: 'text/html', body: parentHtml.replace(`src="${hostedGallery}"`, `src="${childServer.origin}${galleryPath}"`) });
    } else if (url.origin === childServer.origin) {
      // Fulfill from the local package server: Chromium classifies an intercepted
      // parent as public address space and otherwise blocks loopback children.
      await route.fulfill({ response: await route.fetch() });
    } else if (url.origin === parentServer.origin) {
      await route.continue();
    } else {
      await route.fulfill({ contentType: route.request().resourceType() === 'image' ? 'image/svg+xml' : 'text/html',
        body: route.request().resourceType() === 'image' ? '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' : '<!doctype html><title>Unrelated hosted surface</title>' });
    }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const telemetry = monitor(page);
  try {
    await page.goto(`${parentServer.origin}${aboutPath}`, { waitUntil: 'domcontentloaded' });
    // Resolve parent-owned images before print/scroll observations so lazy-image
    // cancellation remains separate from this child-layout contract.
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
    const carrier = page.locator(frameSelector);
    await carrier.scrollIntoViewIfNeeded();
    const frame = await (await carrier.elementHandle()).contentFrame();
    await frame.locator('main').waitFor();
    return { context, page, carrier, frame, async close() {
      try { await page.evaluate(() => new Promise(requestAnimationFrame)); assertTelemetry(telemetry); }
      finally { await context.close(); }
    } };
  } catch (error) {
    await context.close();
    throw new Error(`Gallery local receiver setup: ${JSON.stringify(telemetry)}`, { cause: error });
  }
}

async function fitted(observation) {
  await observation.carrier.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expect(observation.carrier).toHaveAttribute('data-gallery-fit', 'ready');
  let measured;
  await expect.poll(async () => {
    measured = await observation.frame.evaluate(() => ({
      viewport: innerHeight, content: Math.ceil(document.body.getBoundingClientRect().height),
      scroll: document.scrollingElement.scrollHeight, width: innerWidth,
      footer: document.querySelector('[data-iframe-route-attribution]').getBoundingClientRect().bottom,
      y: scrollY,
    }));
    return Math.max(Math.abs(measured.viewport - measured.content), measured.scroll - measured.viewport,
      measured.footer - measured.viewport, Math.abs(measured.y));
  }).toBeLessThanOrEqual(2);
  assert.ok(measured.scroll <= measured.viewport + 2, 'the full generated document fits the child viewport');
  assert.ok(measured.footer <= measured.viewport + 2, 'the package-owned footer participates in natural sizing');
  assert.equal(measured.y, 0, 'the child retains its vertical reading origin');
  return measured;
}

async function wheelObservation(observation, selector = 'header h1') {
  const target = observation.frame.locator(selector).first();
  // Native instant scrolling also works when a deliberate short-frame fault
  // places the child outside the viewport and pauses its animation frames.
  await target.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  const box = await target.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0);
  const before = { parent: await observation.page.evaluate(() => scrollY), child: await observation.frame.evaluate(() => scrollY) };
  await observation.page.mouse.move(box.x + Math.min(box.width / 2, 80), box.y + Math.min(box.height / 2, 20));
  await observation.page.mouse.wheel(0, 260);
  await expect.poll(async () => {
    const parent = await observation.page.evaluate(() => scrollY);
    const child = await observation.frame.evaluate(() => scrollY);
    return Math.abs(parent - before.parent) + Math.abs(child - before.child);
  }).toBeGreaterThan(5);
  return { parent: await observation.page.evaluate(() => scrollY) - before.parent,
    child: await observation.frame.evaluate(() => scrollY) - before.child };
}
function assertParentReading(result) {
  assert.ok(result.parent > 5, `About receives vertical reading input; observed parent delta ${result.parent}`);
  assert.equal(result.child, 0, 'Gallery retains its vertical origin during ordinary reading');
}

async function observeCodeText(frame) {
  return frame.locator('#prompt-text, #gallery-state, #gallery-schema').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect();
          const range = document.createRange();
          const fragments = [];
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            for (const word of node.textContent.matchAll(/\S+/gu)) {
              range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
              fragments.push(...[...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0).map(rect => ({ left: rect.left, right: rect.right })));
            }
          }
          return { id: element.id, box: { left: box.left, right: box.right }, viewport: innerWidth, fragments };
        }));
}

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
          await observation.carrier.screenshot({ path: join(captureRoot, `gallery-${engine}-${width}.png`) });
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
      assert.throws(() => assertParentReading(fault), /About receives vertical reading input|Gallery retains/, 'the reading oracle detects captured scrolling');
    } finally { await faultObservation.close(); }
    const recovered = await session(engine, { viewport: { width: 390, height: 900 } });
    try {
      await fitted(recovered);
      assertParentReading(await wheelObservation(recovered));
    } finally { await recovered.close(); }
  });

  test(`${engine}: foreign initialization, document navigation and failure preserve the receiving boundary`, { timeout: 60000 }, async () => {
    const observation = await session(engine);
    try {
      await fitted(observation);
      const baseline = await observation.carrier.evaluate(element => element.getBoundingClientRect().height);
      await observation.page.evaluate(() => window.postMessage({ type: 'context-canvas:gallery-height', version: 1, height: 99999 }, '*'));
      await observation.context.route(`${parentServer.origin}/gallery-foreign-sender.html`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><script>
        const channel = new MessageChannel();
        parent.__foreignGalleryReports = 0;
        channel.port1.onmessage = () => { parent.__foreignGalleryReports += 1; };
        parent.document.querySelector('${frameSelector}').contentWindow.postMessage({type:'context-canvas:gallery-connect',version:1}, '*', [channel.port2]);
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
      await observation.frame.goto(`${childServer.origin}/old-gallery.html`);
      await expect(observation.carrier).not.toHaveAttribute('data-gallery-fit', 'ready');
      assert.ok(await observation.carrier.evaluate(element => element.getBoundingClientRect().height) > 300, 'a child without the protocol retains ordinary fallback space');
      assert.equal(await observation.page.locator('a[href="../../collaboration/about-ai-method-gallery/index.html"]').count(), 1);
      await observation.frame.goto(`${childServer.origin}${galleryPath}`);
      await fitted(observation);
    } finally { await observation.close(); }
    const fallback = await session(engine, { childObserverAvailable: false });
    try {
      assert.equal(await fallback.frame.locator('[data-gallery-matrix][open]').count(), 2);
      assert.equal(await fallback.carrier.getAttribute('data-gallery-fit'), null);
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
        const readings = await observeCodeText(observation.frame);
        assert.deepEqual(readings.map(reading => reading.id), ['prompt-text', 'gallery-state', 'gallery-schema']);
        for (const reading of readings) {
          assert.ok(reading.fragments.length > 0, `${reading.id} has visible text`);
          assert.ok(reading.box.left >= 0 && reading.box.right <= reading.viewport + 1, `${reading.id} box fits the child viewport`);
          assert.ok(reading.fragments.every(fragment => fragment.left >= reading.box.left - 1 && fragment.right <= reading.box.right + 1), `${reading.id} text fragments fit their readable box at ${width}px/${fontSize}px: ${JSON.stringify(reading)}`);
        }
      }
      await observation.frame.locator('#prompt-text, #gallery-state, #gallery-schema').evaluateAll(elements => elements.forEach(element => { element.style.overflowWrap = 'normal'; }));
      const fault = await observeCodeText(observation.frame);
      assert.ok(fault.some(reading => reading.fragments.some(fragment => fragment.right > reading.box.right + 1)), 'restoring ordinary word wrapping exposes the enlarged-text overflow');
      await observation.frame.locator('#prompt-text, #gallery-state, #gallery-schema').evaluateAll(elements => elements.forEach(element => element.style.removeProperty('overflow-wrap')));
      await fitted(observation);
      const recovered = await observeCodeText(observation.frame);
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
