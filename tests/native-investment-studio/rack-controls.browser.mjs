import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-rack-controls');
let server, fixture;
before(async () => {
  await mkdir(captures, { recursive: true });
  fixture = createNativeAboutFixture(await readFile(resolve(import.meta.dirname, '../..' + route), 'utf8'));
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});
const root = page => page.locator('[data-native-coordination]');
const horizon = page => root(page).locator('[data-score-projection]');
const shared = page => root(page).locator('[data-connection-templates] .studio-session-tracks');
const session = page => root(page).locator('[data-native-session-editor]');
const workspace = page => root(page).locator('[data-native-workspace="session"]');
const configure = page => session(page).locator('[data-native-configure]');
const track = (page, id) => horizon(page).locator(`[data-cadence-key="track-work:${id}"]`);
const sharedTrack = (page, id) => shared(page).locator(`[data-session-track="${id}"] .studio-session-tracks__name`);
const bytes = page => page.evaluate(() => window.rackFixture.studio.exportText());
async function open(t, engine, width) {
  const context = await browsers.get(engine).newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), telemetry = monitor(page), pending = new Set();
  page.on('request', request => pending.add(request));
  page.on('requestfinished', request => pending.delete(request));
  page.on('requestfailed', request => pending.delete(request));
  t.after(async () => {
    try { await expect.poll(() => pending.size).toBe(0); assertTelemetry(telemetry); }
    finally { await context.close(); }
  });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route) return request.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    return url.origin === server.origin ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' });
  });
  await page.goto(server.origin + route); await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  await page.evaluate(async () => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
    const element = document.querySelector('[data-native-coordination]');
    mountCoordinationPanel(element).dispose();
    const studio = createStudio(createShowcasePlan());
    window.rackFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
  });
  return page;
}
async function receiverReading(page, selectedId, expanded) {
  const keys = root(page).locator('[data-studio-session-id]');
  assert.ok(await keys.count() >= 8, 'both racks expose accepted session controls');
  const controlsId = await configure(page).getAttribute('id');
  assert.ok(controlsId, 'session keys name their existing settings receiver');
  await expect.poll(() => keys.evaluateAll((controls, expected) => controls.every(control => {
    const selected = control.dataset.studioSessionId === expected.selectedId;
    return control.getAttribute('aria-pressed') === String(selected)
      && control.getAttribute('aria-expanded') === String(selected && expected.expanded)
      && control.getAttribute('aria-controls') === expected.controlsId;
  }), { selectedId, expanded, controlsId })).toBe(true);
}
const skin = locator => locator.evaluate(element => {
  const style = getComputedStyle(element);
  return Object.fromEntries(['backgroundColor', 'color', 'borderTopColor', 'borderTopWidth', 'borderRadius', 'boxShadow', 'fontWeight']
    .map(property => [property, style[property]]));
});
const caret = locator => locator.evaluate(element => getComputedStyle(element, '::after').transform);
async function contained(page, width) {
  const bounds = await root(page).evaluate(element => ({ page: document.documentElement.scrollWidth,
    left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }));
  assert.ok(bounds.page <= width + 1 && bounds.left >= 0 && bounds.right <= width + 1, JSON.stringify(bounds));
}

for (const engine of names) for (const width of [390, 1440]) {
  test(`${engine}: session rack keys follow the selected record and actual editor at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width), accepted = await bytes(page);
    await expect(track(page, 'review')).toHaveAttribute('aria-pressed', 'true');
    await expect(sharedTrack(page, 'review')).toHaveAttribute('aria-pressed', 'true');
    assert.equal(await workspace(page).evaluate(element => element.open), false);
    await receiverReading(page, 'review', false);
    const closedCaret = await caret(track(page, 'review'));
    await contained(page, width);
    await horizon(page).locator('.native-cadence__screen').screenshot({ path: resolve(captures, `${engine}-horizon-${width}.png`) });
    await shared(page).screenshot({ path: resolve(captures, `${engine}-shared-${width}.png`) });

    await horizon(page).locator('[data-cadence-key="track-period:period-2"]').click();
    await expect(horizon(page).getByRole('heading', { name: 'Sprint 2', exact: true })).toHaveAttribute('aria-current', 'page');
    await receiverReading(page, 'review', false);
    await track(page, 'pairing').click();
    await expect(session(page).locator('[name="label"]')).toHaveValue('Prototype pairing');
    await receiverReading(page, 'pairing', true);
    const openCaret = await caret(track(page, 'pairing'));
    await root(page).locator('[data-native-return-action]').click();
    await expect(horizon(page).getByRole('heading', { name: 'Sprint 2', exact: true })).toHaveAttribute('aria-current', 'page');

    await sharedTrack(page, 'research').click();
    await expect(session(page).locator('[name="label"]')).toHaveValue('Research synthesis');
    await receiverReading(page, 'research', true);
    await session(page).locator('[data-native-session-select]').selectOption('pairing');
    await expect(session(page).locator('[name="label"]')).toHaveValue('Prototype pairing');
    await receiverReading(page, 'pairing', true);

    await configure(page).locator(':scope > summary').click();
    await receiverReading(page, 'pairing', false);
    assert.equal(await caret(track(page, 'pairing')), closedCaret, 'closing retires the open caret while preserving selection');
    await track(page, 'pairing').click();
    await receiverReading(page, 'pairing', true);
    await workspace(page).locator(':scope > summary').click();
    await receiverReading(page, 'pairing', false);
    assert.equal(await caret(track(page, 'pairing')), closedCaret, 'closing the enclosing workspace also retires the open caret');
    await workspace(page).locator(':scope > summary').click();
    await receiverReading(page, 'pairing', true);
    await horizon(page).getByRole('button', { name: 'Plan overview', exact: true }).click();
    await receiverReading(page, 'pairing', true);
    await horizon(page).locator('[data-cadence-key="track-period:period-2"]').click();
    await receiverReading(page, 'pairing', true);
    await expect(horizon(page).getByRole('heading', { name: 'Sprint 2', exact: true })).toHaveAttribute('aria-current', 'page');
    assert.equal(await bytes(page), accepted, 'selection, settings inspection and return preserve the accepted plan');
    assert.notEqual(openCaret, closedCaret, 'the row caret points into its expanded receiver');
    assert.deepEqual(await skin(track(page, 'pairing')), await skin(sharedTrack(page, 'pairing')), 'expanded row keys share their skin');
    assert.deepEqual(await skin(horizon(page).locator('.studio-rack-add').first()), await skin(shared(page).locator('.studio-rack-add')), 'Add session uses one rack treatment');
    await contained(page, width);
  });
}
