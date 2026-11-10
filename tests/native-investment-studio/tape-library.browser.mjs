import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
let server, fixture;
registerBrowserFixture(async own => {
  fixture = createNativeAboutFixture(await readFile(resolve(import.meta.dirname, '../..' + route), 'utf8'));
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});
const root = page => page.locator('[data-native-coordination]');
const score = page => root(page).locator('[data-native-score]');
const shelf = page => score(page).locator('[data-score-projection]');
const action = (page, name) => score(page).locator(`[data-score-action="${name}"]`);
const bytes = page => page.evaluate(() => window.tapeFixture.studio.exportText());
const undo = page => root(page).locator('[data-studio-undo]').click();

async function open(t, engine) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
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
    if (url.origin === server.origin && url.pathname === route)
      return request.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' });
  });
  await page.goto(server.origin + route); await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  await page.evaluate(async () => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
    const element = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(element).dispose();
    const studio = createStudio(createShowcasePlan());
    window.tapeFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
  });
  return page;
}

async function removeTape(page, id) {
  await shelf(page).locator(`[data-studio-plan-id="${id}"]`).click();
  await action(page, 'remove-plan').click();
  await action(page, 'confirm-plan-removal').click();
}

for (const engine of names) test(`${engine}: removing tapes preserves recovery and an empty library can load or create plans`, async t => {
  const page = await open(t, engine), originalBytes = await bytes(page), original = JSON.parse(originalBytes);
  await expect(shelf(page).locator('.native-cadence__screen')).toHaveAttribute('data-loaded-plan', original.work[0].id);
  await expect(shelf(page).locator(`[data-studio-plan-id="${original.work[0].id}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(action(page, 'remove-plan')).toBeEnabled();
  await shelf(page).locator('[data-studio-plan-id="research"]').click();
  await action(page, 'remove-plan').click();
  await expect(score(page).locator('.native-score__removal')).toContainText('Remove Research synthesis and its sessions?');
  await action(page, 'cancel-plan-removal').click();
  assert.equal(await bytes(page), originalBytes, 'Cancel preserves accepted work and its references');
  await expect(action(page, 'remove-plan')).toBeFocused();
  await action(page, 'remove-plan').click(); await action(page, 'confirm-plan-removal').click();
  const removed = JSON.parse(await bytes(page));
  assert.deepEqual(removed.work, original.work.filter(work => work.id !== 'research'));
  assert.deepEqual(removed.scoreSettings.cadence.placements,
    original.scoreSettings.cadence.placements.filter(row => row.workId !== 'research'));
  assert.deepEqual(removed.connections, original.connections.map(row => ({ ...row, workIds: row.workIds.filter(id => id !== 'research') })));
  assert.deepEqual(removed.scoreSettings.dependencies, original.scoreSettings.dependencies.filter(row => row.fromWorkId !== 'research' && row.toWorkId !== 'research'));
  assert.deepEqual(removed.people, original.people); assert.deepEqual(removed.teams, original.teams);
  await expect(shelf(page).locator('[data-studio-plan-id="research"]')).toHaveCount(0);
  await undo(page); assert.equal(await bytes(page), originalBytes, 'Undo restores the removed tape and every link exactly');

  for (const work of original.work) await removeTape(page, work.id);
  const emptyBytes = await bytes(page), empty = JSON.parse(emptyBytes);
  assert.deepEqual(empty.work, []); assert.deepEqual(empty.scoreSettings.cadence.placements, []);
  const starters = shelf(page).getByRole('region', { name: 'Choose a working pattern', exact: true });
  await expect(starters).toBeVisible();
  await expect(starters.locator('.native-reel')).toBeVisible();
  await expect(shelf(page).locator('[data-studio-plan-id]')).toHaveCount(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const bounds = await starters.evaluate(element => {
      const box = element.getBoundingClientRect();
      return { page: document.documentElement.scrollWidth, left: box.left, right: box.right };
    });
    assert.ok(bounds.page <= width + 1 && bounds.left >= 0 && bounds.right <= width + 1, JSON.stringify(bounds));
  }
  await starters.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(starters).toHaveAttribute('data-starter', 'design');
  assert.equal(await bytes(page), emptyBytes, 'reel selection previews the pattern without changing accepted work');
  await starters.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(starters).toHaveAttribute('data-starter', 'plan');
  await starters.getByRole('button', { name: 'Load these plans', exact: true }).click();
  const loaded = JSON.parse(await bytes(page));
  assert.deepEqual(loaded.work.map(work => work.label), ['Frame the outcome', 'Agree priorities', 'Review scope']);
  assert.equal(loaded.scoreSettings.cadence.placements.length, 4);
  assert.deepEqual(loaded.people, empty.people); assert.deepEqual(loaded.teams, empty.teams);
  await expect(starters).toBeHidden(); await expect(shelf(page).locator('[data-studio-plan-id]')).toHaveCount(3);
  await undo(page); assert.equal(await bytes(page), emptyBytes, 'one Undo returns the entire loaded pattern to the empty shelf');
  await expect(starters).toBeVisible();
  await starters.getByRole('button', { name: 'Create a plan', exact: true }).click();
  assert.equal(JSON.parse(await bytes(page)).work.length, 1, 'free creation remains available from the empty shelf');
  await expect(starters).toBeHidden(); await expect(shelf(page).locator('[data-studio-plan-id]')).toHaveCount(1);
  await undo(page); assert.equal(await bytes(page), emptyBytes);
});
