import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const directory = new URL('../../context-canvas-project-surface/context-canvas/', import.meta.url);
const destinations = [
  { text: 'About', href: 'index.html' },
  { text: 'AI Systems', href: 'ai-systems.html' },
  { text: 'Debriefs', href: 'debriefs.html' },
];
const representatives = ['index.html', 'ai-systems.html', 'debriefs.html',
  'genomic-viewer-replatforming.html', 'fmi-lims-eln-replatforming.html', 'exemplar-index-landing.html'];
const consumers = [];
for (const route of (await readdir(directory)).filter(name => name.endsWith('.html')).sort()) {
  const source = await readFile(new URL(route, directory), 'utf8');
  if (source.includes('styles/components/site-navigation.css')) consumers.push(route);
}
const browsers = new Map();
let server;
before(async () => {
  server = await startStaticServer();
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) browsers.set(name, await engine.launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function open(t, engine, route, options = {}) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  t.after(() => context.close());
  const page = await context.newPage();
  // Navigation is source-owned; external media and iframe interiors keep their
  // separate delivery and interaction observations.
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Media owner</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  if (options.javaScriptEnabled !== false) await page.evaluate(() => document.fonts.ready);
  else {
    const deadline = Date.now() + 2000;
    while (await page.evaluate(() => document.fonts.status) !== 'loaded' && Date.now() < deadline) await delay(10);
    assert.equal(await page.evaluate(() => document.fonts.status), 'loaded', 'scriptless source fonts have loaded');
  }
  return page;
}

async function settle(page, width, scale = 100) {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(scale => { document.documentElement.style.fontSize = `${scale}%`; window.scrollTo(0, 0); }, scale);
  // WebKit can propagate an injected root size over several render passes.
  // Poll actual font and geometry from the driver so scriptless pages follow
  // the same bounded observation without depending on page animation timers.
  const deadline = Date.now() + 2000;
  let previous = '', stableSince = 0;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const header = document.querySelector('.nav__top--sticky');
      const rail = document.querySelector('.page-section-rail, .fmi-reading-rail');
      const box = node => node ? [node.getBoundingClientRect().x, node.getBoundingClientRect().y, node.getBoundingClientRect().width, node.getBoundingClientRect().height] : null;
      return { viewport: innerWidth, rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
        fonts: [...header.querySelectorAll('a')].map(link => getComputedStyle(link).fontSize), header: box(header), rail: box(rail) };
    });
    const signature = JSON.stringify(state);
    if (signature !== previous || state.viewport !== width || Math.abs(state.rootFont - 16 * scale / 100) > .1) stableSince = Date.now();
    else if (Date.now() - stableSince >= 50) return;
    previous = signature;
    await delay(10);
  }
  assert.fail('navigation font and frame geometry settle within the bounded observation window');
}

async function observe(page) {
  return page.evaluate(() => {
    const rect = node => { const value = node.getBoundingClientRect(); return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height }; };
    const header = document.querySelector('.nav__top--sticky');
    const links = [...header.querySelectorAll('.nav__container a')].map(link => {
      const range = document.createRange(); range.selectNodeContents(link);
      const fragments = [...range.getClientRects()].map(value => ({ left: value.left, right: value.right, top: value.top, bottom: value.bottom }));
      return { ...rect(link), fragments, text: link.textContent.trim(), href: link.getAttribute('href'), current: link.getAttribute('aria-current'),
        color: getComputedStyle(link).color, outline: getComputedStyle(link).outlineStyle };
    });
    const rail = document.querySelector('.page-section-rail, .fmi-reading-rail');
    const paintedRail = rail && getComputedStyle(rail).display !== 'none' ? rect(rail) : null;
    return { header: rect(header), links, main: rect(document.querySelector('main')), rail: paintedRail,
      viewport: document.documentElement.clientWidth, rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize) };
  });
}

function assertLabels(value, label) {
  assert.equal(value.links.length, destinations.length, `${label}: three native destination links remain available`);
  assert.ok(value.header.left >= -1 && value.header.right <= value.viewport + 1, `${label}: the header fits the viewport`);
  for (const [index, link] of value.links.entries()) {
    assert.equal(link.text, destinations[index].text, `${label}: source destination order and visible names remain intact`);
    assert.equal(link.href, destinations[index].href, `${label}: destination URLs remain native`);
    assert.ok(link.width >= 44 && link.height >= 44, `${label}: each destination retains a 44px touch target`);
    assert.ok(link.left >= value.header.left - 1 && link.right <= value.header.right + 1
      && link.top >= value.header.top - 1 && link.bottom <= value.header.bottom + 1, `${label}: each actionable region fits the header`);
    assert.ok(link.fragments.length > 0 && link.fragments.every(fragment => fragment.left >= link.left - 1 && fragment.right <= link.right + 1
      && fragment.top >= link.top - 1 && fragment.bottom <= link.bottom + 1), `${label}: complete label paint fits its actionable region`);
    assert.equal(link.fragments.length, 1, `${label}: each current destination name stays whole on its row`);
    if (index) {
      const previous = value.links[index - 1];
      assert.ok(link.top >= previous.bottom - 1 || (Math.abs(link.top - previous.top) <= 1 && link.left >= previous.right - 1),
        `${label}: wrapping follows native left-to-right, then downward reading order`);
    }
  }
}

function assertClearance(value, label) {
  // A first paragraph can retain its authored -1px margin at the main boundary.
  assert.ok(value.main.top >= value.header.bottom - 1.1, `${label}: initial content begins after the actual in-flow header`);
  if (value.rail) assert.ok(value.rail.top >= value.header.bottom - 1, `${label}: reading-rail controls clear the actual header (${value.rail.top} >= ${value.header.bottom})`);
}

async function assertStickyAndFragments(page, label, { fragments = true, nextLinkKey = 'Tab' } = {}) {
  await page.evaluate(() => window.scrollTo(0, 2000));
  let value = await observe(page);
  assert.ok(Math.abs(value.header.top) < 1, `${label}: navigation remains available beyond the first viewport`);
  if (!fragments) {
    assert.equal(await page.locator('main [id]').count(), 0, `${label}: the historical shell retains its fragment-free source`);
    return;
  }
  const target = await page.locator('main [id]').evaluateAll(targets => targets.find(target => target.getBoundingClientRect().top + scrollY > 1500 && target.getBoundingClientRect().height > 0)?.id);
  assert.ok(target, `${label}: an authored deep reading target supplies the fragment check`);
  await page.evaluate(id => { window.location.hash = id; }, target);
  await page.waitForURL(`**#${target}`);
  await page.waitForTimeout(25);
  const clearance = await page.locator(`[id="${target}"]`).evaluate(node => ({ top: node.getBoundingClientRect().top, header: document.querySelector('.nav__top--sticky').getBoundingClientRect().bottom }));
  assert.ok(clearance.top >= clearance.header - 1, `${label}: native fragment destinations clear the actual header`);
  const skip = page.locator('.skip-link, .about-skip');
  if (await skip.count()) {
    await skip.focus(); await page.keyboard.press('Enter');
    const skipTarget = await skip.getAttribute('href');
    await page.waitForURL(`**${skipTarget}`);
    const result = await page.locator(skipTarget).evaluate(node => ({ top: node.getBoundingClientRect().top, header: document.querySelector('.nav__top--sticky').getBoundingClientRect().bottom,
      focused: document.activeElement === node, hasFocusTarget: node.hasAttribute('tabindex') }));
    assert.ok(result.top >= result.header - 1, `${label}: the main skip target clears the actual header`);
    if (result.hasFocusTarget) assert.ok(result.focused, `${label}: the native skip link transfers keyboard focus to the reading`);
    else {
      // About keeps a native main fragment without a tabindex attribute.
      // Its next keyboard destination establishes the actual reading handoff.
      await page.keyboard.press(nextLinkKey);
      assert.ok(await page.locator(skipTarget).evaluate(node => node.contains(document.activeElement)), `${label}: native skip navigation continues inside the reading`);
    }
  }
}

test('the shared navigation has exactly forty source consumers', () => {
  assert.equal(consumers.length, 40);
  assert.ok(!consumers.includes('404.html') && !consumers.includes('conditioning-field.html'));
  assert.ok(representatives.every(route => consumers.includes(route)));
});

for (const engine of ['chromium', 'firefox', 'webkit']) {
  // The macOS WebKit preference includes native links through Option-Tab.
  const nextLinkKey = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
  // Chromium visits the full consumer population; the three engines exercise
  // entry, catalog, AI, ordinary rail, authored rail, and historical shells.
  for (const route of engine === 'chromium' ? consumers : representatives) {
    test(`${engine}: ${route} complete destinations and header clearance`, async t => {
      const page = await open(t, engine, route);
      const current = (await observe(page)).links.map(link => link.current);
      for (const scale of [100, 200]) for (const width of [320, 390, 768, 1440, 2560]) {
        await settle(page, width, scale);
        const value = await observe(page), label = `${route} at ${width}px / ${scale}%`;
        assertLabels(value, label); assertClearance(value, label);
        assert.deepEqual(value.links.map(link => link.current), current, `${label}: current-page and current-location semantics remain authored`);
      }
      if (representatives.includes(route)) {
        await settle(page, 320, 200);
        await assertStickyAndFragments(page, route, { fragments: route !== 'exemplar-index-landing.html', nextLinkKey });
      }
    });
  }

  test(`${engine}: intrinsic row changes and foundation seams retain label paint`, async t => {
    const page = await open(t, engine, 'ai-systems.html');
    for (const scale of [100, 125, 150, 200]) {
      // Binary search observes the actual font-dependent row transition rather
      // than treating a device width as a proxy for intrinsic content fit.
      let lower = 280, upper = 768;
      await settle(page, lower, scale);
      const hasWrapped = (await observe(page)).links.some(link => link.top > 1);
      if (hasWrapped) {
        while (upper - lower > 1) {
          const middle = Math.floor((lower + upper) / 2); await settle(page, middle, scale);
          if ((await observe(page)).links.some(link => link.top > 1)) lower = middle;
          else upper = middle;
        }
        for (const width of [lower, upper, upper + 1]) {
          await settle(page, width, scale); const value = await observe(page);
          assertLabels(value, `${scale}% intrinsic seam ${width}px`); assertClearance(value, `${scale}% intrinsic seam ${width}px`);
        }
      }
      for (const width of [320, 390, 769, 770, 771, 895, 896, 897, 1199, 1200]) {
        await settle(page, width, scale); const value = await observe(page);
        assertLabels(value, `${scale}% source seam ${width}px`); assertClearance(value, `${scale}% source seam ${width}px`);
      }
    }
  });

  test(`${engine}: native keyboard and touch destinations remain operable with scripting unavailable`, async t => {
    for (const touch of [false, true]) {
      const page = await open(t, engine, 'ai-systems.html', { javaScriptEnabled: false, hasTouch: touch });
      await settle(page, 320, 200);
      assertLabels(await observe(page), 'scriptless enlarged navigation');
      if (touch) {
        await Promise.all([page.waitForURL(`${server.origin}${root}debriefs.html`), page.locator('.nav__container a').nth(2).tap()]);
        assert.equal(new URL(page.url()).pathname, `${root}debriefs.html`);
      } else {
        const links = page.locator('.nav__container a');
        await links.first().focus();
        for (let index = 0; index < 3; index += 1) {
          if (index) await page.keyboard.press(nextLinkKey);
          const focused = await links.nth(index).evaluate(link => ({ active: document.activeElement === link, outline: getComputedStyle(link).outlineStyle }));
          assert.ok(focused.active && focused.outline === 'solid', `keyboard order and visible inset focus stay on native links (${index}: ${JSON.stringify(focused)})`);
        }
        await Promise.all([page.waitForURL(`${server.origin}${root}debriefs.html`), page.keyboard.press('Enter')]);
        assert.equal(new URL(page.url()).pathname, `${root}debriefs.html`);
      }
      assertLabels(await observe(page), 'native destination arrival');
      await assertStickyAndFragments(page, 'scriptless native destination');
    }
  });

  test(`${engine}: About boundary links keep their full focus paint inside the viewport`, async t => {
    const page = await open(t, engine, 'index.html');
    for (const scale of [100, 200]) {
      await settle(page, 320, scale);
      for (const index of [0, 2]) {
        const link = page.locator('.nav__container a').nth(index); await link.focus();
        const readPaint = () => link.evaluate(node => {
          const box = node.getBoundingClientRect(), style = getComputedStyle(node);
          const outset = Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset));
          return { left: box.left - outset, right: box.right + outset, top: box.top - outset, bottom: box.bottom + outset,
            viewport: document.documentElement.clientWidth, headerBottom: document.querySelector('.nav__top--sticky').getBoundingClientRect().bottom,
            focused: document.activeElement === node, outline: style.outlineStyle, offset: style.outlineOffset, width: style.outlineWidth };
        });
        // About's reduced-motion rule retains a short transition duration.
        // Wait for the actual outline state before measuring its paint extent.
        const deadline = Date.now() + 2000;
        let paint, previous = '', stableSince = Date.now();
        while (Date.now() < deadline) {
          paint = await readPaint(); const signature = JSON.stringify(paint);
          if (signature !== previous) stableSince = Date.now();
          else if (Date.now() - stableSince >= 50) break;
          previous = signature; await delay(10);
        }
        assert.ok(paint.focused && paint.outline === 'solid', 'the boundary destination has visible keyboard focus');
        assert.ok(paint.left >= -1 && paint.right <= paint.viewport + 1 && paint.top >= -1 && paint.bottom <= paint.headerBottom + 1,
          `the full focus outline stays inside the header and viewport (${scale} / ${index}: ${JSON.stringify(paint)})`);
      }
    }
  });

  test(`${engine}: forced colors, print, hover, and semantic current treatment remain legible`, async t => {
    const page = await open(t, engine, 'ai-systems.html');
    await settle(page, 320, 200);
    const links = page.locator('.nav__container a');
    const current = await links.nth(1).evaluate(link => getComputedStyle(link).color);
    await links.first().hover();
    assert.equal(await links.first().evaluate(link => getComputedStyle(link).color), current, 'hover and authored current page share the active foreground');
    await page.emulateMedia({ forcedColors: 'active' });
    await links.nth(2).focus(); assertLabels(await observe(page), 'forced colors');
    assert.equal(await links.nth(2).evaluate(link => getComputedStyle(link).outlineStyle), 'solid');
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    assertLabels(await observe(page), 'print');
    assert.equal(await page.locator('.nav__top--sticky').evaluate(node => getComputedStyle(node).position), 'static', 'print navigation participates in page flow');
    assert.ok((await observe(page)).links.every(link => link.color === 'rgb(0, 0, 0)'), 'printed destinations retain a dark foreground');
  });

  test(`${engine}: restoring equal thirds exposes the complete-label fault`, async t => {
    const page = await open(t, engine, 'genomic-viewer-replatforming.html');
    await settle(page, 320, 200); assertLabels(await observe(page), 'accepted intrinsic layout');
    const fault = await page.addStyleTag({ content: '.nav__container { display:block !important; } .nav__container > li { float:left !important; width:33% !important; } .nav__container a { display:block !important; padding:14px !important; overflow-wrap:normal !important; } .nav__container::after { display:table; content:""; clear:both; }' });
    const valueAfterFault = await observe(page);
    try { assert.throws(() => assertLabels(valueAfterFault, 'restored equal thirds'), /label paint/, 'the observer distinguishes actual label overflow'); }
    finally { await fault.evaluate(node => node.remove()); }
    assertLabels(await observe(page), 'restored intrinsic layout');
  });
}
