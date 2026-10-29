import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name), `Unknown NATIVE_STUDIO_BROWSER: ${name}`);
const browsers = new Map();
const route = '/context-canvas-project-surface/context-canvas/index.html';
const shellPath = '/collaboration/native-investment-studio/shell.mjs';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-chapters');
let server;
let fixture;
let fullAbout;

before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const objectSource = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  assert.equal(source.split(objectSource).length, 2);
  // That closed diagram has a separate loading owner; WebKit may cancel its
  // navigation. Keep every native byte and the diagram's authored fallback.
  fullAbout = source.replace(objectSource, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  const start = source.indexOf('<section class="about-field about-field--coordination"');
  const end = source.indexOf('<section class="about-field about-field--studio"', start);
  const prefixEnd = source.indexOf('<main id="main">') + '<main id="main">'.length;
  const legacyFrame = source.match(/<iframe\b[^>]*data-about-content-fit="studio-chapters"[\s\S]*?<\/iframe>/u)?.[0];
  const legacyLink = source.match(/<a href="\.\.\/\.\.\/collaboration\/initiative-costing-calculator\/index.html">[\s\S]*?<\/a>/u)?.[0];
  assert.ok(start > prefixEnd && end > start && legacyFrame && legacyLink);
  const prefix = source.slice(0, prefixEnd).replace(/<script\b[\s\S]*?<\/script>/gu,
    script => script.includes('collaboration/native-investment-studio/controller.mjs') ? script : '');
  fixture = `${prefix}${source.slice(start, end)}
    <section class="about-field about-field--studio">${legacyFrame}${legacyLink}</section>
    <div aria-hidden="true" style="height:1000px"></div></main></body></html>`;
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

const root = page => page.locator('[data-native-coordination]');
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const chapter = (page, name) => root(page).locator(`[data-native-chapter-panel="${name}"]`);
const work = (page, name) => chapter(page, 'coordination').locator(`input[name="${name}"]`);
const person = (page, name) => chapter(page, 'people').locator(`input[name="${name}"]`);
const total = page => root(page).locator('[data-native-total]');
const workAction = (page, name) => chapter(page, 'coordination').locator(`[data-action="${name}"]`);
const personAction = (page, name) => chapter(page, 'people').locator(`[data-person-action="${name}"]`);
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function open(t, engine, { fragment = '', complete = false, ...options } = {}) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  const telemetry = monitor(page);
  const requests = new Set();
  page.on('request', request => requests.add(request));
  page.on('requestfinished', request => requests.delete(request));
  page.on('requestfailed', request => requests.delete(request));
  const settle = () => expect.poll(() => requests.size).toBe(0);
  t.after(async () => {
    try { await settle(); assertTelemetry(telemetry); }
    finally { await context.close(); }
  });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route)
      return request.fulfill({ status: 200, contentType: 'text/html', body: complete ? fullAbout : fixture });
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' });
  });
  await page.goto(server.origin + route + fragment, { waitUntil: 'load' });
  if (options.javaScriptEnabled !== false) {
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
    await page.evaluate(() => document.fonts.ready);
    await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
    await expect(root(page)).toHaveAttribute('data-native-chapters-ready', 'true');
  }
  await settle();
  if (options.javaScriptEnabled !== false) await frame(page);
  return page;
}

async function selected(page, name) {
  const other = name === 'people' ? 'coordination' : 'people';
  await expect(tab(page, name)).toHaveAttribute('aria-selected', 'true');
  await expect(chapter(page, name)).toBeVisible();
  await expect(tab(page, other)).toHaveAttribute('aria-selected', 'false');
  await expect(chapter(page, other)).toBeHidden();
}

for (const engine of names) {
  test(`${engine}: manual chapter activation retains both drafts and rejects a stale cross-chapter Apply`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await selected(page, 'coordination');
    await expect(root(page).getByRole('tablist', { name: 'Studio chapters' })).toHaveCount(1);
    await expect(root(page).getByRole('tab', { name: 'People', exact: true })).toHaveCount(1);
    await expect(tab(page, 'people').locator('svg[aria-hidden="true"][focusable="false"]')).toHaveCount(1);
    assert.equal(new URL(page.url()).hash, '');
    await tab(page, 'people').click();
    await page.goBack();
    assert.equal(new URL(page.url()).hash, '');
    await selected(page, 'coordination');
    await page.goForward();
    await selected(page, 'people');
    await tab(page, 'coordination').click();
    await work(page, 'minutesPerSession').fill('45');
    await expect(root(page).locator('[data-native-preview-total]')).toHaveText('$1,800.00');
    await tab(page, 'coordination').focus();
    await tab(page, 'coordination').press('ArrowRight');
    await expect(tab(page, 'people')).toBeFocused();
    await selected(page, 'coordination');
    await expect(tab(page, 'people')).toHaveAttribute('tabindex', '0');
    await tab(page, 'people').press('Enter');
    await selected(page, 'people');
    await chapter(page, 'people').locator('[data-person-id="product-one"]').click();
    await person(page, 'ratePerHour').fill('101');
    await expect(root(page).locator('[data-person-total]')).toHaveText('$1,203.00');
    await expect(total(page)).toHaveText('$1,200.00');
    await tab(page, 'people').focus();
    await tab(page, 'people').press('Home');
    await expect(tab(page, 'coordination')).toBeFocused();
    await selected(page, 'people');
    await tab(page, 'coordination').press('Space');
    await selected(page, 'coordination');
    await expect(work(page, 'minutesPerSession')).toHaveValue('45');
    await workAction(page, 'apply').click();
    // Four participants x 45 minutes x six working sessions x $100/hour.
    await expect(total(page)).toHaveText('$1,800.00');
    await tab(page, 'people').click();
    await expect(person(page, 'ratePerHour')).toHaveValue('101');
    await expect(chapter(page, 'people')).toHaveAttribute('data-team-state', 'stale');
    await personAction(page, 'apply').click();
    await expect(total(page)).toHaveText('$1,800.00');
    await expect(root(page).locator('[data-person-status]')).toContainText('Cancel');
    await personAction(page, 'cancel').click();
    await chapter(page, 'people').locator('[data-person-id="product-one"]').click();
    await expect(person(page, 'ratePerHour')).toHaveValue('100.00');
    await tab(page, 'coordination').click();
    await expect(work(page, 'minutesPerSession')).toHaveValue('45');
  });

  test(`${engine}: original fragments, history, motion preference and shell remount preserve editor ownership`, { timeout: 45000 }, async t => {
    const page = await open(t, engine, { fragment: '#native-team-title', reducedMotion: 'no-preference' });
    await selected(page, 'people');
    assert.equal(new URL(page.url()).hash, '#native-team-title');
    await expect(page.locator('#native-team-title')).toBeInViewport();
    await chapter(page, 'people').locator('[data-person-id="product-one"]').click();
    await person(page, 'ratePerHour').fill('103');
    await page.evaluate(() => {
      const nativeAnimate = Element.prototype.animate;
      window.chapterAnimations = [];
      Element.prototype.animate = function (...args) {
        if (this.matches('[data-native-chapter-panel]')) window.chapterAnimations.push(this.id);
        return nativeAnimate.apply(this, args);
      };
      history.replaceState({ chapterFixture: 'retained' }, '', location.href);
    });
    await tab(page, 'coordination').click();
    await work(page, 'minutesPerSession').fill('40');
    await tab(page, 'people').click();
    await person(page, 'ratePerHour').focus();
    await page.goBack();
    await selected(page, 'coordination');
    const recoveredFocus = await page.evaluate(() => ({ id: document.activeElement.id, tag: document.activeElement.localName,
      hidden: Boolean(document.activeElement.closest('[hidden]')) }));
    assert.ok(['native-studio-tab-coordination', 'native-studio-coordination'].includes(recoveredFocus.id)
      && !recoveredFocus.hidden, `history returns focus to the visible chapter or its control: ${JSON.stringify(recoveredFocus)}`);
    await expect(work(page, 'minutesPerSession')).toHaveValue('40');
    await page.goBack();
    await selected(page, 'people');
    assert.equal(new URL(page.url()).hash, '#native-team-title');
    await expect(person(page, 'ratePerHour')).toHaveValue('103');
    assert.equal(await page.evaluate(() => history.state.chapterFixture), 'retained',
      'the chapter history owner preserves the surrounding caller field');
    await page.goForward();
    await selected(page, 'coordination');
    assert.deepEqual(await page.evaluate(() => window.chapterAnimations), ['native-studio-coordination', 'native-studio-people']);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await tab(page, 'people').click();
    await selected(page, 'people');
    assert.equal(await page.evaluate(() => window.chapterAnimations.length), 2);
    assert.equal(await root(page).evaluate(node => node.getAnimations({ subtree: true }).length), 0);
    await page.evaluate(async path => {
      const { mountChapterShell } = await import(path);
      const node = document.querySelector('[data-native-coordination]');
      const rate = node.querySelector('input[name="ratePerHour"]');
      const shell = mountChapterShell(node);
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      if (shell.read().disposed) throw new Error('A cached page retains its shell.');
      history.replaceState(history.state, '', '#native-studio-coordination');
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      if (shell.read().activeChapter !== 'coordination') throw new Error('Restoration recovers the current fragment.');
      shell.dispose();
      if (!node.querySelector('[data-native-chapter-list]').hidden) throw new Error('Disposal restores authored controls.');
      if ([...node.querySelectorAll('[data-native-chapter-panel]')].some(panel => panel.hidden)) throw new Error('Disposal restores both authored readings.');
      const next = mountChapterShell(node);
      if (next === shell || node.querySelector('input[name="ratePerHour"]') !== rate || rate.value !== '103')
        throw new Error('Shell replacement retains the same editor and its raw draft.');
    }, shellPath);
    await selected(page, 'coordination');
    await tab(page, 'people').click();
    await expect(person(page, 'ratePerHour')).toHaveValue('103');
    await expect(total(page)).toHaveText('$1,200.00');
    await tab(page, 'coordination').click();
    await page.evaluate(() => { scrollTo(0, 0); location.hash = '#native-studio-people'; });
    await selected(page, 'people');
    await expect.poll(() => chapter(page, 'people').evaluate(node => {
      const box = node.getBoundingClientRect();
      return scrollY > 0 && box.top >= -1 && box.top <= 200;
    })).toBe(true);
    assert.equal(new URL(page.url()).hash, '#native-studio-people');
  });

  test(`${engine}: chapter controls preserve reading position, narrow scrolling and the scriptless Studio`, { timeout: 45000 }, async t => {
    // One exact About integration observes the other page owners alongside this
    // shell; the state cases use the native section and authored style closure.
    const page = await open(t, engine, { complete: engine === 'webkit' });
    for (const [width, enlarged] of [[1440, false], [320, true]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(enlarge => { document.documentElement.style.fontSize = enlarge ? '200%' : ''; }, enlarged);
      await tab(page, 'coordination').scrollIntoViewIfNeeded();
      await frame(page);
      const position = () => root(page).evaluate(node => ({ top: node.getBoundingClientRect().top, scroll: scrollY }));
      const before = await position();
      await tab(page, 'coordination').focus();
      await tab(page, 'coordination').press('End');
      await expect(tab(page, 'people')).toBeFocused();
      await selected(page, 'coordination');
      const focused = await position();
      assert.ok(Math.abs(focused.top - before.top) < 1 && Math.abs(focused.scroll - before.scroll) < 1,
        `manual tab focus preserves About's vertical reading position: ${JSON.stringify({ before, focused })}`);
      await tab(page, 'people').press('Enter');
      await selected(page, 'people');
      await frame(page);
      const after = await position();
      assert.ok(Math.abs(after.top - before.top) < 1 && Math.abs(after.scroll - before.scroll) < 1,
        `explicit chapter selection preserves the amp head position: ${JSON.stringify({ before, after })}`);
      const geometry = await tab(page, 'people').evaluate(button => {
        const strip = button.parentElement, box = button.getBoundingClientRect(), frame = strip.getBoundingClientRect();
        const style = getComputedStyle(button);
        const label = button.querySelector('span'), textStyle = getComputedStyle(label);
        const range = document.createRange();
        range.selectNodeContents(label);
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom,
          frameLeft: frame.left, frameRight: frame.right,
          bodyWidth: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
          outline: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth),
          height: box.height, labelHeight: range.getBoundingClientRect().height, lineHeight: Number.parseFloat(textStyle.lineHeight),
          stripHeight: strip.clientHeight, stripScrollHeight: strip.scrollHeight };
      });
      await page.screenshot({ path: resolve(captures, `${engine}-${width}${enlarged ? '-enlarged' : ''}.png`) });
      assert.ok(geometry.left >= geometry.frameLeft - 1 && geometry.left < geometry.frameRight,
        `keyboard focus reveals the selected tab's leading edge: ${JSON.stringify(geometry)}`);
      if (geometry.right - geometry.left <= geometry.frameRight - geometry.frameLeft)
        assert.ok(geometry.right <= geometry.frameRight + 1, `a fitting tab remains completely visible: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.bodyWidth <= geometry.viewport + 1 && geometry.height >= 44,
        `chapter controls retain a contained, usable target: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.labelHeight <= geometry.lineHeight + 1 && geometry.stripScrollHeight <= geometry.stripHeight + 1,
        `readable chapter names keep one line and leave vertical scrolling to About: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.outline !== 'none' && geometry.outlineWidth >= 2, 'keyboard selection retains a visible focus indicator');
      await tab(page, 'people').hover();
      const scrollBefore = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 240);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore + 100);
      await tab(page, 'coordination').click();
    }
    await expect(page.locator('iframe[data-about-content-fit="studio-chapters"]')).toHaveCount(1);
    await expect(page.locator('a[href="../../collaboration/initiative-costing-calculator/index.html"]')).toHaveCount(1);
    const fallback = await open(t, engine, { javaScriptEnabled: false });
    await expect(root(fallback).locator('[data-native-chapter-list]')).toBeHidden();
    await expect(chapter(fallback, 'coordination')).toBeVisible();
    await expect(chapter(fallback, 'people')).toBeVisible();
    await expect(total(fallback)).toHaveText('$1,200.00');
    await expect(fallback.locator('a[href="../../collaboration/initiative-costing-calculator/index.html"]')).toBeVisible();
  });
}
