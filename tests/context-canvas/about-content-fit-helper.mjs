import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { assertTelemetry, monitor, startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';
import { createCanvasPackagePlan } from '../../tools/package-canvas-iframe-routes.mjs';
import { writePackagePlan } from '../../tools/iframe-route-package-engine.mjs';

const root = resolve(import.meta.dirname, '../..');
export const aboutPath = '/context-canvas-project-surface/context-canvas/index.html';
export const engines = { chromium, firefox, webkit };
export const receivers = Object.freeze({
  gallery: { label: 'Gallery', path: '/v1/canvas/ai-method-gallery/' },
  'studio-chapters': { label: 'Studio chapters', path: '/v1/canvas/investment-studio-chapters/' },
  'prompt-conditions': { label: 'Prompt Conditions Explorer', path: '/v1/canvas/prompt-conditions-explorer/' },
});

// These About receivers share their packaged transport, opaque sandbox,
// telemetry, geometry and cleanup mechanics. Cases retain content expectations.
export async function createAboutContentFitHarness() {
  const browsers = new Map();
  let parentServer, childServer, temporaryRoot;
  async function close() {
    try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
    finally {
      try { await parentServer?.close(); }
      finally {
        try { await childServer?.close(); }
        finally { if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true }); }
      }
    }
  }
  try {
    let parentHtml = await readFile(join(root, aboutPath), 'utf8');
    const plan = await createCanvasPackagePlan();
    temporaryRoot = await mkdtemp(join(tmpdir(), 'about-content-fit-package-'));
    await writePackagePlan(plan, join(temporaryRoot, 'v1/canvas'));
    parentServer = await startStaticServer(root);
    childServer = await startStaticServer(temporaryRoot);
    assert.notEqual(parentServer.origin, childServer.origin, 'the packaged children have a distinct receiving origin');
    for (const [key, receiver] of Object.entries(receivers)) {
      assert.ok(parentHtml.includes(`data-about-content-fit="${key}"`), `${receiver.label} explicitly opts into About content fitting`);
      const source = `src="https://iframes.vik.guru${receiver.path}"`;
      assert.equal(parentHtml.split(source).length, 2, `${receiver.label} retains one exact hosted carrier`);
      parentHtml = parentHtml.replace(source, `src="${childServer.origin}${receiver.path}"`);
    }

    async function parentSession(engine, options = {}) {
      assert.ok(Object.hasOwn(engines, engine), 'the harness admits a named browser engine');
      if (!browsers.has(engine)) browsers.set(engine, await engines[engine].launch());
      const { childObserverAvailable = true, ...contextOptions } = options;
      const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 900 }, ...contextOptions });
      if (!childObserverAvailable) await context.addInitScript(() => { delete window.ResizeObserver; });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === parentServer.origin && url.pathname === aboutPath) {
          // Only this served response receives the local packaged children.
          // The checked-in source keeps its approved hosted aliases.
          await route.fulfill({ contentType: 'text/html', body: parentHtml });
        } else if (url.origin === childServer.origin) {
          // Chromium classifies an intercepted parent as public address space;
          // fulfillment admits its loopback package receiver explicitly.
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
        if (contextOptions.javaScriptEnabled !== false) {
          await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
        }
        return { context, page, async close() {
          try {
            if (contextOptions.javaScriptEnabled !== false) await page.evaluate(() => new Promise(requestAnimationFrame));
            assertTelemetry(telemetry);
          } finally { await context.close(); }
        } };
      } catch (error) {
        await context.close();
        throw new Error(`About local receiver setup: ${JSON.stringify(telemetry)}`, { cause: error });
      }
    }
    async function session(key, engine, options = {}) {
      assert.ok(Object.hasOwn(receivers, key), 'the harness admits a named About receiver');
      const parent = await parentSession(engine, options);
      try { return { ...parent, ...await receiverInPage(parent.page, key) }; }
      catch (error) { await parent.close(); throw new Error(`${receivers[key].label} child setup`, { cause: error }); }
    }
    return { browsers, parentServer, childServer, session, parentSession, close };
  } catch (error) { await close(); throw error; }
}

export async function receiverInPage(page, key) {
  const carrier = page.locator(`iframe[data-about-content-fit="${key}"]`);
  await carrier.scrollIntoViewIfNeeded();
  const frame = await (await carrier.elementHandle()).contentFrame();
  await frame.locator('main').waitFor();
  return { page, carrier, frame, label: receivers[key].label };
}

export async function fitted(observation) {
  await observation.carrier.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expect(observation.carrier).toHaveAttribute('data-content-fit', 'ready');
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

export async function wheelObservation(observation, selector = 'header h1') {
  const target = observation.frame.locator(selector).first();
  // A fault fixture can resize the carrier before the child has laid out that
  // viewport. Admit the new child geometry before positioning its wheel target.
  await observation.carrier.scrollIntoViewIfNeeded();
  await expect.poll(async () => Math.abs(await observation.frame.evaluate(() => innerHeight)
    - await observation.carrier.evaluate(node => node.clientHeight))).toBeLessThanOrEqual(2);
  await observation.frame.evaluate(() => new Promise(requestAnimationFrame));
  await target.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  let box = await target.boundingBox();
  let carrierBox = await observation.carrier.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0);
  assert.ok(carrierBox && carrierBox.width > 0 && carrierBox.height > 0);
  const positions = async () => ({ parent: await observation.page.evaluate(() => scrollY),
    child: await observation.frame.evaluate(() => scrollY), local: await target.evaluate(element => element.scrollTop) });
  const viewport = observation.page.viewportSize();
  const navigationBottom = await observation.page.locator('.nav__top--sticky').evaluate(node => node.getBoundingClientRect().bottom);
  // Native centering may align a tall frame while leaving an oversized control
  // beyond the parent viewport. Place that control before measuring wheel input.
  if (Math.min(box.y + box.height, carrierBox.y + carrierBox.height, viewport.height) - Math.max(box.y, carrierBox.y, navigationBottom) <= 2) {
    await observation.page.evaluate(top => scrollBy({ top, behavior: 'instant' }), Math.max(box.y, carrierBox.y) - navigationBottom - 16);
    box = await target.boundingBox();
    carrierBox = await observation.carrier.boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0);
    assert.ok(carrierBox && carrierBox.width > 0 && carrierBox.height > 0);
  }
  const visible = { left: Math.max(box.x, carrierBox.x, 0), right: Math.min(box.x + box.width, carrierBox.x + carrierBox.width, viewport.width),
    top: Math.max(box.y, carrierBox.y, navigationBottom), bottom: Math.min(box.y + box.height, carrierBox.y + carrierBox.height, viewport.height) };
  assert.ok(visible.right - visible.left > 2 && visible.bottom - visible.top > 2, 'the wheel target has a visible intersection below About navigation');
  // A naturally tall editor can begin above the parent viewport after centering.
  // Keep ordinary target coordinates while placing oversized targets in view.
  const x = Math.min(visible.right - 1, Math.max(visible.left + 1, box.x + Math.min(box.width / 2, 80)));
  const y = Math.min(visible.bottom - 1, Math.max(visible.top + 1, box.y + Math.min(box.height / 2, 20)));
  await observation.page.mouse.move(x, y);
  await expect.poll(() => target.evaluate(node => node.matches(':hover'))).toBe(true);
  const before = await positions();
  await observation.page.mouse.wheel(0, 260);
  await expect.poll(async () => {
    const current = await positions();
    return Math.abs(current.parent - before.parent) + Math.abs(current.child - before.child) + Math.abs(current.local - before.local);
  }).toBeGreaterThan(5);
  const current = await positions();
  return { parent: current.parent - before.parent, child: current.child - before.child, local: current.local - before.local };
}
export function assertParentReading(result) {
  assert.ok(result.parent > 5, `About receives vertical reading input; observed parent delta ${result.parent}`);
  assert.equal(result.child, 0, 'the fitted instrument retains its vertical origin during ordinary reading');
  assert.equal(result.local, 0, 'the targeted text retains its vertical origin during ordinary reading');
}

export async function observeCodeText(frame, selector) {
  return frame.locator(selector).evaluateAll(elements => elements.map(element => {
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
