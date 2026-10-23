import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const output = new URL('../../.visual-runs/debrief-hero-wrapping/', import.meta.url);
const catalog = await readFile(new URL(`../..${root}debriefs.html`, import.meta.url), 'utf8');
const routes = [...catalog.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap(([, data]) => (JSON.parse(data)['@graph'] || []).filter(item => item['@type'] === 'ItemList')
    .flatMap(item => item.itemListElement).map(item => new URL(item.url).pathname.split('/').at(-1)));
const roles = 'h1, .tag-line, .debrief-lead, .debrief-kicker, .neg-hero__lead';
const ordinaryWrapping = '.debrief-hero :where(.h1-hero, .tag-line, .debrief-lead, .debrief-kicker) { overflow-wrap: normal; }';
const reportedWords = new Map([
  ['ehr-pgx-alert-failure.html', { selector: '.debrief-lead', word: 'pharmacogenomic' }],
  ['prompt-side-conditions-practice.html', { selector: 'h1', word: 'Collaboration' }],
]);
let server;
const browsers = new Map();
before(async () => {
  assert.equal(routes.length, 23, 'The complete catalog supplies the observed header population.');
  server = await startStaticServer();
  await mkdir(output, { recursive: true });
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) browsers.set(name, await engine.launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});
async function open(t, engine, route, options = {}) {
  const page = await browsers.get(engine).newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  t.after(() => page.close());
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  await fontsReady(page);
  return page;
}
async function fontsReady(page) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await page.evaluate(() => document.fonts.status === 'loaded')) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.fail('The authored fonts reach their loaded state in the bounded observation window.');
}
async function setReading(page, width, font) {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(font => { document.documentElement.style.fontSize = `${font}px`; }, font);
  await fontsReady(page);
  // Driver polling also works for a page opened with enhancement disabled.
  let previous;
  for (let frame = 0; frame < 20; frame += 1) {
    const current = JSON.stringify(await reading(page));
    if (current === previous) return;
    previous = current;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.fail('The header text reaches stable geometry in the bounded observation window.');
}
async function reading(page) {
  return page.locator('main > header').evaluate((hero, selector) => {
    function bounds(node) {
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        contentLeft: rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
        contentRight: rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight) };
    }
    const style = getComputedStyle(hero);
    return { viewport: document.documentElement.clientWidth, bounds: bounds(hero),
      background: style.backgroundColor, image: style.backgroundImage, border: style.borderBottomColor,
      text: [...hero.querySelectorAll(selector)].map(node => {
        const style = getComputedStyle(node), walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), fragments = [];
        let text;
        while ((text = walker.nextNode())) {
          if (!text.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(text);
          fragments.push(...[...range.getClientRects()].filter(rect => rect.width && rect.height)
            .map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })));
        }
        return { text: node.textContent.trim(), role: node.className || node.tagName, bounds: bounds(node), fragments,
          font: style.font, color: style.color, wordBreak: style.wordBreak, hyphens: style.hyphens,
          visibility: style.visibility, display: style.display };
      }) };
  }, roles);
}
function assertContained(observation, label) {
  const { bounds, viewport, text } = observation;
  assert.ok(text.length > 0, `${label}: authored hero text is present`);
  assert.ok(bounds.left >= -1 && bounds.right <= viewport + 1, `${label}: the hero fits the viewport`);
  for (const item of text) {
    assert.ok(item.fragments.length && item.visibility === 'visible' && item.display !== 'none', `${label} ${item.role}: readable text remains displayed`);
    const left = Math.max(0, bounds.contentLeft, item.bounds.contentLeft);
    const right = Math.min(viewport, bounds.contentRight, item.bounds.contentRight);
    assert.ok(item.fragments.every(rect => rect.left >= left - 1 && rect.right <= right + 1),
      `${label} ${item.role}: text fragments fit their role, hero content region, and viewport`);
    assert.ok(item.fragments.every(rect => rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1),
      `${label} ${item.role}: the hero includes its complete vertical reading`);
  }
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: all catalog hero words fit narrow ordinary and enlarged reading`, { timeout: 120_000 }, async t => {
    for (const route of routes) {
      const page = await open(t, engine, route);
      const words = (await reading(page)).text.map(item => item.text);
      for (const width of [320, 390]) for (const font of [16, 32]) {
        await setReading(page, width, font);
        const observed = await reading(page);
        assertContained(observed, `${route} ${width}px ${font}px text`);
        assert.deepEqual(observed.text.map(item => item.text), words, 'Responsive wrapping preserves authored wording and order.');
        if (width === 320 && font === 32 && reportedWords.has(route)) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: new URL(`${engine}-${route}-enlarged.png`, output).pathname });
        }
      }
      await page.close();
    }
  });

  test(`${engine}: ordinary desktop and wide headers retain their geometry and palette`, { timeout: 120_000 }, async t => {
    for (const route of routes) {
      const page = await open(t, engine, route);
      for (const width of [1440, 2560]) {
        await setReading(page, width, 16);
        const accepted = await reading(page);
        assertContained(accepted, `${route} ${width}px`);
        const baseline = await page.addStyleTag({ content: ordinaryWrapping });
        try {
          await setReading(page, width, 16);
          assert.deepEqual(await reading(page), accepted, `${route}: emergency breaks preserve ordinary composition`);
        } finally { await baseline.evaluate(node => node.remove()); }
        await setReading(page, width, 16);
        assert.deepEqual(await reading(page), accepted, `${route}: restoration retains ordinary composition`);
      }
      await page.close();
    }
  });

  for (const [route, { selector, word }] of reportedWords) {
    test(`${engine}: restored ordinary wrapping exposes ${word}, then the reading recovers`, { timeout: 120_000 }, async t => {
      const page = await open(t, engine, route);
      await setReading(page, 320, 32);
      const accepted = await reading(page);
      assertContained(accepted, route);
      assert.ok(await page.locator(`main > header ${selector}`).evaluate((node, word) => node.textContent.includes(word), word));
      const fault = await page.addStyleTag({ content: ordinaryWrapping });
      try {
        await setReading(page, 320, 32);
        const failed = await reading(page);
        const wordGeometry = await page.locator(`main > header ${selector}`).evaluate((node, word) => {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let text;
          while ((text = walker.nextNode())) {
            const start = text.textContent.indexOf(word);
            if (start < 0) continue;
            const range = document.createRange(); range.setStart(text, start); range.setEnd(text, start + word.length);
            return [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right }));
          }
          return [];
        }, word);
        assert.ok(wordGeometry.length && wordGeometry.some(rect => rect.right > failed.viewport + 1), `${word}: the known word exceeds the actual viewport under restored wrapping`);
        assert.throws(() => assertContained(failed, route), /text fragments fit/, 'The material containment assertion detects the restored fault.');
      } finally { await fault.evaluate(node => node.remove()); }
      await setReading(page, 320, 32);
      assertContained(await reading(page), route);
      assert.deepEqual(await reading(page), accepted, 'Recovery restores the same complete reading.');
    });
  }

  test(`${engine}: alternate media preserve complete catalog header text`, { timeout: 120_000 }, async t => {
    for (const route of routes) {
      const page = await open(t, engine, route);
      const words = (await reading(page)).text.map(item => item.text);
      await page.emulateMedia({ media: 'print' });
      await setReading(page, 1440, 16);
      assertContained(await reading(page), `${route} print`);
      await page.emulateMedia({ media: 'screen', forcedColors: 'active' });
      await setReading(page, 320, 32);
      assertContained(await reading(page), `${route} forced colors`);
      assert.deepEqual((await reading(page)).text.map(item => item.text), words);
      await page.close();
    }
  });

  test(`${engine}: the reported readings retain containment with enhancement unavailable`, { timeout: 120_000 }, async t => {
    for (const route of reportedWords.keys()) {
      const page = await open(t, engine, route, { javaScriptEnabled: false });
      await setReading(page, 320, 32);
      assertContained(await reading(page), `${route} authored reading`);
      await page.close();
    }
  });
}
