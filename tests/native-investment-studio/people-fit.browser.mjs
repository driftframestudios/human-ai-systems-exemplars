import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name), `Unknown NATIVE_STUDIO_BROWSER: ${name}`);
const browsers = new Map();
const route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/people-fit');
let server, fixture;
registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  fixture = createNativeAboutFixture(await readFile(resolve(import.meta.dirname, '../..' + route), 'utf8'));
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});

for (const engine of names) test(`${engine}: the populated People arranger fits a laptop and scrolls locally on a phone`, async t => {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1512, height: 982 }, reducedMotion: 'reduce' });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route) return request.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    return url.origin === server.origin ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' });
  });
  await page.goto(server.origin + route, { waitUntil: 'load' });
  await expect(page.locator('[data-native-team-editor]')).toHaveAttribute('data-team-ready', 'true');
  await page.locator('[data-native-chapter="people"]').click();
  await page.evaluate(() => document.fonts.ready);
  const table = page.locator('table.studio-people-arranger');
  const measure = () => table.evaluate(node => ({
    width: node.getBoundingClientRect().width,
    first: node.querySelector('thead th').getBoundingClientRect().width,
    columns: [...node.querySelectorAll('thead th')].map(cell => cell.getBoundingClientRect().width),
    client: node.parentElement.clientWidth, scroll: node.parentElement.scrollWidth,
    font: getComputedStyle(document.documentElement).fontSize,
    page: document.documentElement.scrollWidth, viewport: innerWidth,
  }));
  const laptop = await measure();
  t.diagnostic(`laptop: ${Math.round(laptop.width)}px table, ${laptop.client}px rack, ${laptop.first}px person column`);
  // Exclude the independent fixed page navigation from table-only comparisons.
  await table.screenshot({ path: resolve(captures, `${engine}-laptop.png`), style: 'header.nav__top--sticky { visibility:hidden; }' });
  assert.equal(laptop.columns.length, 6, 'the authored default shows a person column and all five session plans');
  assert.ok(laptop.scroll <= laptop.client + 1, 'all populated session columns fit inside the laptop rack');
  assert.ok(Math.abs(laptop.first - 15 * parseFloat(laptop.font)) <= 1, 'the person column retains its readable 15rem width');
  assert.ok(Math.max(...laptop.columns.slice(1)) - Math.min(...laptop.columns.slice(1)) < 1, 'session columns share the remaining width equally');
  await page.setViewportSize({ width: 390, height: 844 });
  const phone = await measure();
  assert.ok(phone.scroll > phone.client, 'phone comparison retains its local horizontal scroll');
  assert.ok(phone.page <= phone.viewport + 1, 'the phone page stays within its viewport');
  const reachable = await table.evaluate(node => {
    const scroll = node.parentElement; scroll.scrollLeft = scroll.scrollWidth;
    const frame = scroll.getBoundingClientRect(), last = node.querySelector('thead th:last-child').getBoundingClientRect();
    return scroll.scrollLeft > 0 && last.right <= frame.right + 1 && last.left >= frame.left;
  });
  assert.ok(reachable, 'the last session remains reachable through the phone rack scroll');
  await page.locator('[data-team-roster]').screenshot({ path: resolve(captures, `${engine}-phone.png`), style: 'header.nav__top--sticky { visibility:hidden; }' });
});
