import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const output = new URL('../../.visual-runs/debrief-hero-colors/', import.meta.url);
const catalog = await readFile(new URL(`../..${root}debriefs.html`, import.meta.url), 'utf8');
const routes = [...catalog.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap(([, data]) => (JSON.parse(data)['@graph'] || []).filter(item => item['@type'] === 'ItemList')
    .flatMap(item => item.itemListElement).map(item => new URL(item.url).pathname.split('/').at(-1)));
const palettes = new Map([
  ['genomic-viewer-replatforming.html', { background: 'rgb(0, 0, 0)', title: 'rgb(241, 233, 210)', tagline: 'rgb(77, 184, 179)', border: 'rgb(255, 211, 208)' }],
  ['field-inspection-harness-replatform.html', { background: 'rgb(0, 0, 0)', title: 'rgb(241, 233, 210)', tagline: 'rgb(77, 184, 179)', border: 'rgb(250, 112, 101)' }],
  ['who-to-believe-reviews-platform.html', { background: 'rgb(19, 32, 52)', title: 'rgb(255, 248, 232)', tagline: 'rgb(106, 223, 208)', border: 'rgb(255, 128, 111)' }],
]);
let server;
const browsers = new Map();
before(async () => {
  server = await startStaticServer();
  await mkdir(output, { recursive: true });
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) browsers.set(name, await engine.launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});
async function open(t, engine, route) {
  const page = await browsers.get(engine).newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  t.after(() => page.close());
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}
function luminance(color) {
  return color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
}
function contrast(foreground, background) {
  const light = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light[0] + .05) / (light[1] + .05);
}
async function heroReading(page) {
  return page.locator('main > header').evaluate(hero => {
    const style = getComputedStyle(hero), box = hero.getBoundingClientRect();
    return { background: style.backgroundColor, image: style.backgroundImage,
      border: style.borderBlockEndColor, borderWidth: parseFloat(style.borderBlockEndWidth),
      forcedAdjust: style.getPropertyValue('forced-color-adjust'),
      forcedAdjustSupported: CSS.supports('forced-color-adjust', 'auto'),
      forcedMedia: matchMedia('(forced-colors: active)').matches,
      width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
      box: { left: box.left, right: box.right },
      text: [...hero.querySelectorAll('h1,p')].map(node => {
        const s = getComputedStyle(node), range = document.createRange(); range.selectNodeContents(node);
        return { text: node.textContent.trim(), className: node.className, color: s.color,
          fragments: [...range.getClientRects()].filter(rect => rect.width && rect.height)
            .map(rect => ({ left: rect.left, right: rect.right })) };
      }),
      links: ['--canvas-link-color', '--canvas-link-visited-color'].map(name => style.getPropertyValue(name).trim()) };
  });
}
function assertSolid(reading) {
  assert.equal(reading.image, 'none', 'The header has one solid reading plane.');
  assert.ok(!reading.background.startsWith('rgba('), 'The header owns an opaque background.');
}
function assertPalette(reading, expected) {
  assertSolid(reading);
  assert.equal(reading.background, expected.background);
  assert.equal(reading.text.find(item => item.className.includes('h1-hero')).color, expected.title);
  assert.equal(reading.text.find(item => item.className.includes('tag-line')).color, expected.tagline);
  assert.equal(reading.border, expected.border);
  assert.ok(reading.borderWidth >= 2, 'The route keeps its solid accent boundary.');
  for (const item of reading.text) {
    assert.ok(contrast(item.color, reading.background) >= 4.5, `${item.className}: readable text against its actual solid plane`);
    assert.ok(item.fragments.every(rect => rect.left >= reading.box.left - 1 && rect.right <= reading.box.right + 1),
      `${item.className}: complete text fragments stay inside the header`);
  }
  assert.ok(reading.box.left >= -1 && reading.box.right <= reading.width + 1, `The header stays within the visitor field (${reading.box.right}/${reading.width}; document ${reading.scrollWidth}).`);
  for (const color of reading.links) {
    // Palette values are source-resolved hex strings; a canvas normalizes them
    // in the browser in the focused-link check below.
    assert.ok(color, 'The painted owner supplies both active link roles.');
  }
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: all catalog headers keep a solid reading plane`, async t => {
    assert.equal(routes.length, 23, 'The complete current catalog supplies the observed route population.');
    for (const route of routes) {
      const page = await open(t, engine, route);
      assertSolid(await heroReading(page));
      await page.close();
    }
  });

  for (const [route, expected] of palettes) {
    test(`${engine}: ${route} pairs its solid surface with complete foreground roles`, async t => {
      const page = await open(t, engine, route);
      for (const [width, font] of [[390, 16], [1440, 16], [2560, 16], [320, 32]]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(font => { document.documentElement.style.fontSize = `${font}px`; }, font);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assertPalette(await heroReading(page), expected);
        if (font === 16) await page.locator('main > header').screenshot({ path: new URL(`${engine}-${route}-${width}.png`, output).pathname });
      }
      if (route.startsWith('genomic')) {
        assert.match(await page.locator('main > header .debrief-lead').innerText(), /Within R&D,/);
      }

      // The opt-in role contract supports a future native header destination.
      // The probe exercises its inherited colors and visible focus using the
      // real route cascade without adding a new visitor action to the page.
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '16px';
        const link = document.createElement('a'); link.id = 'hero-role-probe';
        link.href = '#main-content'; link.textContent = 'Continue reading';
        document.querySelector('main > header').append(link);
      });
      const link = page.locator('#hero-role-probe');
      await link.focus();
      const state = await link.evaluate(link => {
        const style = getComputedStyle(link), hero = getComputedStyle(link.closest('header'));
        const probe = document.createElement('span');
        probe.style.color = hero.getPropertyValue('--canvas-link-visited-color');
        link.append(probe); const visited = getComputedStyle(probe).color; probe.remove();
        return { color: style.color, background: hero.backgroundColor, visited,
          outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), outlineColor: style.outlineColor,
          decoration: style.textDecorationLine, focused: document.activeElement === link };
      });
      assert.ok(state.focused && state.outline !== 'none' && state.outlineWidth > 0, 'A native header destination has a visible focus outline.');
      assert.ok(contrast(state.outlineColor, state.background) >= 3, 'The native focus paint contrasts with the solid field.');
      assert.ok(state.decoration.includes('underline'), 'The link retains a cue alongside color.');
      assert.ok(contrast(state.color, state.background) >= 4.5);
      assert.ok(contrast(state.visited, state.background) >= 4.5, 'The declared visited role contrasts; browser history painting remains privacy-bound.');
      await link.hover();
      const hover = await link.evaluate(link => ({ color: getComputedStyle(link).color,
        decoration: getComputedStyle(link).textDecorationLine }));
      assert.ok(contrast(hover.color, state.background) >= 4.5 && hover.decoration.includes('underline'),
        'Pointer inspection preserves readable link text and its underline.');
      await link.evaluate(link => link.remove());

      await page.emulateMedia({ media: 'print' });
      const printed = await heroReading(page);
      assertSolid(printed);
      assert.equal(printed.background, 'rgb(255, 255, 255)');
      assert.equal(printed.border, 'rgb(0, 0, 0)');
      assert.ok(printed.text.every(item => item.color === 'rgb(0, 0, 0)'), 'Print pairs the light plane with dark text.');
      await page.emulateMedia({ media: 'screen', forcedColors: 'active' });
      const forced = await heroReading(page);
      assertSolid(forced);
      assert.ok(forced.forcedMedia, 'The engine enters the forced-colors media branch.');
      if (forced.forcedAdjustSupported) assert.equal(forced.forcedAdjust, 'auto', 'System colors retain platform adjustment.');
      else assert.equal(forced.forcedAdjust, '', 'The engine leaves the unsupported adjustment property unspecified.');
      assert.ok(forced.text.every(item => contrast(item.color, forced.background) >= 4.5));
      await page.emulateMedia({ forcedColors: 'none' });
      assertPalette(await heroReading(page), expected);
    });
  }

  test(`${engine}: the held LIMS header and the solid Who To Believe field retain their own colors`, async t => {
    const page = await open(t, engine, 'fmi-lims-eln-replatforming.html');
    const held = await heroReading(page);
    assertSolid(held);
    assert.equal(held.background, 'rgb(22, 52, 94)');
    assert.equal(await page.locator('main > header').evaluate(node => node.classList.contains('debrief-hero--palette')), false);
    await page.goto(server.origin + root + 'who-to-believe-reviews-platform.html');
    const field = await page.locator('.wtb-solution-track').evaluate(node => ({ background: getComputedStyle(node).backgroundColor, image: getComputedStyle(node).backgroundImage }));
    assert.deepEqual(field, { background: 'rgb(255, 211, 208)', image: 'none' });
  });

  test(`${engine}: restored gradient and inherited dark-text faults break the material observations`, async t => {
    const page = await open(t, engine, 'field-inspection-harness-replatform.html');
    const expected = palettes.get('field-inspection-harness-replatform.html');
    assertPalette(await heroReading(page), expected);
    const gradient = await page.addStyleTag({ content: '.field-inspection-hero { background-image: linear-gradient(135deg, #17345f, #1f2421); }' });
    try { const reading = await heroReading(page); assert.throws(() => assertSolid(reading), /solid reading plane/); }
    finally { await gradient.evaluate(node => node.remove()); }
    assertPalette(await heroReading(page), expected);
    const dark = await page.addStyleTag({ content: '.debrief-hero--palette .debrief-lead { color: #1a1a2e; }' });
    try { const reading = await heroReading(page); assert.throws(() => assertPalette(reading, expected), /readable text/); }
    finally { await dark.evaluate(node => node.remove()); }
    assertPalette(await heroReading(page), expected);
  });
}
