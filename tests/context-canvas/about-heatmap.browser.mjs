import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.HEATMAP_BROWSER ? [process.env.HEATMAP_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name), `Unknown HEATMAP_BROWSER: ${name}`);
const browsers = new Map();
const route = '/context-canvas-project-surface/context-canvas/index.html';
const selector = '[data-about-heatmap]';
const imageNames = {
  before: 'bgr_3b_before_safeway_purple.svg',
  after: 'bgr_3b_after_safeway_cool_tri.svg',
};
let server;
before(async () => {
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function open(t, engine, options = {}) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'native About reading executes without page errors'));
  // This receiver observes native About content; hosted instruments and remote media
  // retain their own contracts. Fixed placeholders keep their delivery out of this proof.
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' }));
  await page.goto(server.origin + route + '#deliver-title', { waitUntil: 'load' });
  if (options.javaScriptEnabled !== false) await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator(`${selector} img`).evaluateAll(images =>
    images.length === 2 && images.every(image => image.complete && image.naturalWidth > 0)), true,
  'both substantive evidence images load in this receiver');
  return page;
}

async function assertView(page, mode, { print = false } = {}) {
  const root = page.locator(selector);
  assert.equal(await root.locator('iframe').count(), 0, 'the comparison is native page content');
  assert.equal(await root.locator('figure').count(), 2, 'the source always contains both evidence figures');
  const expectedVisible = print || mode === 'side' ? ['before', 'after'] : [mode];
  const observed = [];
  for (const name of ['before', 'after']) {
    const figure = root.locator(`figure[data-view="${name}"]`);
    assert.equal(await figure.count(), 1, `one named ${name} figure`);
    assert.ok((await figure.locator('img').getAttribute('src')).endsWith(imageNames[name]), `${name} retains its independent image identity`);
    assert.ok((await figure.locator('img').getAttribute('alt')).length > 40, `${name} has a substantive description`);
    assert.ok((await figure.locator('figcaption').textContent()).trim().length > 60, `${name} has a substantive caption`);
    if (await figure.isVisible()) observed.push(name);
  }
  assert.deepEqual(observed, expectedVisible, `visible evidence population for ${mode}`);
  if (!print) {
    assert.equal(await root.getAttribute('data-mode'), mode);
    assert.deepEqual(await root.locator('button[aria-pressed="true"]').evaluateAll(buttons => buttons.map(button => button.dataset.mode)), [mode]);
  }
}

async function assertContained(page) {
  const observation = await page.locator(selector).evaluate(root => {
    const box = node => { const value = node.getBoundingClientRect(); return { left: value.left, right: value.right, width: value.width, height: value.height }; };
    const visible = [...root.querySelectorAll('button, figure, img, figcaption, .about-heatmap__status')]
      .filter(node => node.getClientRects().length > 0);
    const fragments = [];
    for (const node of root.querySelectorAll('button, figcaption, .about-heatmap__foot')) {
      if (!node.getClientRects().length) continue;
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let text;
      while ((text = walker.nextNode())) {
        if (!text.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(text);
        fragments.push(...[...range.getClientRects()].map(value => ({ left: value.left, right: value.right })));
      }
    }
    return { root: box(root), viewport: document.documentElement.clientWidth, children: visible.map(box), fragments };
  });
  assert.ok(observation.root.left >= -1 && observation.root.right <= observation.viewport + 1, `native exhibit stays within ${observation.viewport}px: ${JSON.stringify(observation.root)}`);
  for (const child of [...observation.children, ...observation.fragments]) {
    assert.ok(child.left >= observation.root.left - 1 && child.right <= observation.root.right + 1, 'controls, images, and actual text remain inside the exhibit');
  }
}

for (const engine of names) {
  test(`${engine}: native comparison preserves state, focus, fragment, and vertical reading`, { timeout: 30_000 }, async t => {
    const page = await open(t, engine), root = page.locator(selector);
    await assertView(page, 'side');
    for (const mode of ['before', 'after', 'side']) {
      const button = root.locator(`button[data-mode="${mode}"]`);
      await button.focus();
      await button.press('Enter');
      await assertView(page, mode);
      assert.equal(await button.evaluate(node => node === document.activeElement), true, 'selection retains the initiating focus');
      assert.equal(new URL(page.url()).hash, '#deliver-title', 'selection preserves the About reading fragment');
      assert.ok((await root.locator('[aria-live="polite"]').textContent()).includes(mode === 'side' ? 'both visible' : mode === 'before' ? 'original' : 'revised'));
    }
    const image = root.locator('img').first();
    await image.scrollIntoViewIfNeeded();
    const rect = await image.boundingBox();
    const size = page.viewportSize();
    await page.mouse.move((Math.max(0, rect.x) + Math.min(size.width, rect.x + rect.width)) / 2,
      (Math.max(0, rect.y) + Math.min(size.height, rect.y + rect.height)) / 2);
    const beforeScroll = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 250);
    await page.waitForFunction(before => scrollY > before + 20, beforeScroll);
    await assertContained(page);
    // This controlled fault challenges the independent figure-identity oracle.
    const afterImage = root.locator('[data-view="after"] img');
    const acceptedSource = await afterImage.getAttribute('src');
    await afterImage.evaluate(node => { node.src = '../img/bgr/bgr_3b_before_safeway_purple.svg'; });
    await assert.rejects(() => assertView(page, 'side'), /after retains its independent image identity/u);
    await afterImage.evaluate((node, source) => { node.src = source; }, acceptedSource);
    await assertView(page, 'side');
  });

  test(`${engine}: native comparison reflows at narrow and enlarged-text widths`, { timeout: 30_000 }, async t => {
    const page = await open(t, engine);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await assertContained(page);
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await assertContained(page);
    const restoredMinimum = await page.addStyleTag({ content: '.about-page { min-inline-size: 17.5rem !important; }' });
    await assert.rejects(() => assertContained(page), /native exhibit stays within/u,
      'the restored parent minimum exposes enlarged-text viewport overflow');
    await restoredMinimum.evaluate(node => node.remove());
    await assertContained(page);
    await page.locator(`${selector} button[data-mode="after"]`).click();
    await assertView(page, 'after');
    await assertContained(page);
    await page.emulateMedia({ forcedColors: 'active' });
    const button = page.locator(`${selector} button[data-mode="after"]`);
    await button.focus();
    await button.press('Space');
    assert.equal(await button.evaluate(node => node === document.activeElement), true, 'keyboard activation retains the selected control');
    assert.equal(await button.evaluate(node => getComputedStyle(node).outlineStyle), 'solid', 'forced colors keeps a visible focused control');
    await assertView(page, 'after');
    const unselected = page.locator(`${selector} button[data-mode="before"]`);
    await unselected.focus();
    assert.equal(await unselected.getAttribute('aria-pressed'), 'false', 'moving focus preserves the selected view');
    assert.equal(await unselected.evaluate(node => getComputedStyle(node).outlineStyle), 'solid', 'focused unselected control has a distinct focus indicator');
    assert.equal(await button.evaluate(node => getComputedStyle(node).outlineStyle), 'double', 'selected control retains its separate selection indicator');
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    await assertView(page, 'after', { print: true });
    assert.equal(await page.locator(`${selector} button`).first().isVisible(), false, 'print gives the complete static reading');
  });

  test(`${engine}: scriptless reading contains both complete figures and the onward route`, { timeout: 30_000 }, async t => {
    const page = await open(t, engine, { javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const root = page.locator(selector);
    for (const name of ['before', 'after']) assert.equal(await root.locator(`[data-view="${name}"]`).isVisible(), true);
    assert.equal(await root.locator('button').first().isVisible(), false, 'inactive controls stay outside the scriptless reading');
    assert.match(await root.locator('.about-heatmap__foot').textContent(), /Directional case-study evidence/u);
    assert.equal(await page.locator('a[href="../../collaboration/about-heatmap-comparison/index.html"]').isVisible(), true);
    await assertContained(page);
  });
}
