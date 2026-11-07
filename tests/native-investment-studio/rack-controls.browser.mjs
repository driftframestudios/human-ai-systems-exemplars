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
  test(`${engine}: Team planning braids phases and accepted edit routes with local scrolling and Undo at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width), accepted = await bytes(page);
    const planning = root(page).locator('section[data-native-workspace="connection"]');
    const templates = planning.locator('[data-connection-templates]');
    const rack = templates.locator('[data-template-rack]');
    const header = rack.locator(':scope > header');
    await expect(planning.getByRole('heading', { name: 'Team planning', exact: true })).toBeVisible();
    await expect(planning.locator(':scope > summary')).toHaveCount(0);
    await expect(templates).toBeVisible();
    assert.equal(await planning.evaluate(element => {
      const heading = element.querySelector('h3'), deck = element.querySelector('.studio-arrangement-deck');
      const hint = element.querySelector('.native-connection-template__form > .native-coordination__hint');
      const rack = element.querySelector('[data-template-rack]');
      return [heading, deck, hint, rack].every(Boolean)
        && [heading, deck, hint].every((node, index) => Boolean(node.compareDocumentPosition([deck, hint, rack][index]) & Node.DOCUMENT_POSITION_FOLLOWING));
    }), true, 'heading, arrangement deck, hint and secondary rack form one reading order');
    await expect(header).toContainText('Included work');
    await expect(header.locator('[data-template-total]')).toHaveText(/\$[\d,]+\.\d{2}/u);
    const delivery = rack.locator('[data-delivery-template]');
    const board = delivery.locator('.studio-delivery__board');
    const phaseKeys = delivery.locator('[data-delivery-open]');
    await expect(phaseKeys).toHaveText(['Planning', 'Design', 'Implementation', 'Testing', 'Deployment', 'Maintenance']);
    await expect(board).toHaveAttribute('data-delivery-scope', 'overview');
    assert.deepEqual(await delivery.locator('[data-delivery-connection]').evaluateAll(controls => controls.map(control => control.dataset.deliveryConnection).sort()), ['feedback', 'handoff']);
    await expect(delivery.locator('[data-delivery-session]')).toHaveCount(4);
    await expect(rack.locator('.studio-team-rack__lifecycle')).toHaveCount(0);
    await expect(templates.locator('[data-template-structure] .studio-arrangement-connections')).toHaveCount(0);
    const originalTeams = await delivery.locator('[data-delivery-team]').evaluateAll(cards => [...new Set(cards.map(card => card.dataset.deliveryTeam))].sort());
    assert.deepEqual(originalTeams, ['partner', 'pod']);
    const tracks = shared(page).locator('.studio-session-tracks__scroll');
    await header.scrollIntoViewIfNeeded();
    const headerBounds = await header.boundingBox();
    const scrolling = await tracks.evaluate(element => {
      element.scrollLeft = element.scrollWidth;
      return { offset: element.scrollLeft, overflow: element.scrollWidth > element.clientWidth + 1 };
    });
    if (width === 390) assert.ok(scrolling.overflow && scrolling.offset > 0, 'participant tracks remain reachable inside the phone rack');
    assert.deepEqual(await header.boundingBox(), headerBounds, 'the header and investment reading stay outside the scrolling tracks');
    await tracks.evaluate(element => { element.scrollLeft = 0; });
    const scope = delivery.locator('.studio-delivery__scope');
    const scopeBounds = await scope.boundingBox();
    const boardScrolling = await board.evaluate(element => {
      element.scrollLeft = element.scrollWidth;
      return { offset: element.scrollLeft, overflow: element.scrollWidth > element.clientWidth + 1 };
    });
    if (width === 390) assert.ok(boardScrolling.overflow && boardScrolling.offset > 0, 'delivery phases remain reachable inside the phone rack');
    assert.deepEqual(await scope.boundingBox(), scopeBounds, 'the phase heading and return stay outside the scrolling board');
    await board.evaluate(element => { element.scrollLeft = 0; });
    await contained(page, width);
    await rack.screenshot({ path: resolve(captures, `${engine}-team-rack-${width}.png`) });
    if (width === 1440) await planning.screenshot({ path: resolve(captures, `${engine}-team-planning-${width}.png`) });

    await delivery.locator('[data-delivery-open="design"]').click();
    await expect(board).toHaveAttribute('data-delivery-scope', 'design');
    await expect(delivery.locator('[data-delivery-current]')).toHaveText('Design');
    await expect(delivery.locator('[data-delivery-overview]')).toBeFocused();
    await expect(delivery.locator('[data-delivery-phase]:visible')).toHaveCount(1);
    const designTeam = delivery.locator('[data-delivery-phase="design"] [data-delivery-team]').first();
    const teamSlot = await designTeam.getAttribute('data-delivery-team');
    await designTeam.locator('.studio-delivery__team-key').click();
    await expect(templates.locator(`[data-template-field="teams.${teamSlot}.selection"]`)).toBeFocused();
    await designTeam.locator('[data-delivery-person]').first().click();
    await expect(templates.locator(`[data-template-field="teams.${teamSlot}.selection"]`)).toBeFocused();
    await delivery.locator('[data-delivery-overview]').click();
    await expect(board).toHaveAttribute('data-delivery-scope', 'overview');
    await expect(delivery.locator('[data-delivery-open="design"]')).toBeFocused();

    const maintenanceKey = delivery.locator('[data-delivery-open="maintenance"]');
    await maintenanceKey.scrollIntoViewIfNeeded();
    await maintenanceKey.click();
    const maintenanceTeam = delivery.locator('[data-delivery-phase="maintenance"] [data-delivery-team]').first();
    const maintenanceSlot = await maintenanceTeam.getAttribute('data-delivery-team');
    await maintenanceTeam.locator('.studio-delivery__team-key').click();
    await templates.locator(`[data-template-field="teams.${maintenanceSlot}.label"]`).fill('Partner group for continuing support');
    await expect(board).toHaveAttribute('data-delivery-scope', 'maintenance');
    const returnKey = delivery.locator('[data-delivery-overview]');
    await returnKey.scrollIntoViewIfNeeded();
    const pagePosition = await page.evaluate(() => scrollY);
    await returnKey.click();
    await expect(maintenanceKey).toBeFocused();
    const returnGeometry = await maintenanceKey.evaluate(key => {
      const board = key.closest('.studio-delivery__board');
      return { key: key.getBoundingClientRect().toJSON(), board: board.getBoundingClientRect().toJSON(), scroll: scrollY };
    });
    assert.ok(returnGeometry.key.left >= returnGeometry.board.left - 1 && returnGeometry.key.right <= returnGeometry.board.right + 1,
      `return after an edit reveals the originating phase key inside the board: ${JSON.stringify(returnGeometry)}`);
    assert.ok(Math.abs(returnGeometry.scroll - pagePosition) < 2, 'phase return preserves the visitor page position');
    const handoff = delivery.locator('[data-delivery-connection]').first();
    const handoffSlot = await handoff.getAttribute('data-delivery-connection');
    await handoff.click();
    await expect(templates.locator(`[data-template-field="connections.${handoffSlot}.sharedObject"]`)).toBeFocused();
    await delivery.locator('[data-delivery-session="review"]').click();
    await expect(session(page).locator('[name="label"]')).toHaveValue('Pilot decision review');
    await root(page).locator('[data-native-return-action]').click();
    await expect(planning).toBeVisible();
    const customized = await bytes(page);
    assert.notEqual(customized, accepted, 'leaving a complete team name settles that customization');

    await delivery.locator('[data-delivery-open="testing"]').click();
    const undoBefore = await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount);
    await templates.locator('[data-reel-choice="tiger-team"]').click();
    await expect(templates.locator('[data-arrangement-reading="accepted"]')).toHaveAttribute('data-arrangement-template', 'tiger-team');
    await expect(delivery).toHaveAttribute('data-delivery-template', 'tiger-team');
    await expect(board).toHaveAttribute('data-delivery-scope', 'testing');
    await expect(delivery.locator('[data-delivery-current]')).toHaveText('Testing');
    await delivery.locator('[data-delivery-overview]').click();
    assert.deepEqual(await delivery.locator('[data-delivery-team]').evaluateAll(cards => [...new Set(cards.map(card => card.dataset.deliveryTeam))].sort()), ['owner', 'response', 'specialists']);
    assert.deepEqual(await delivery.locator('[data-delivery-connection]').evaluateAll(controls => controls.map(control => control.dataset.deliveryConnection).sort()), ['diagnose', 'resolve', 'return']);
    await expect(header).toContainText('Included work');
    const arranged = await bytes(page);
    assert.notEqual(arranged, customized, 'the explicit reel choice updates the accepted picture immediately');
    await rack.screenshot({ path: resolve(captures, `${engine}-team-rack-accepted-${width}.png`) });
    assert.equal(await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount), undoBefore + 1);
    await expect(templates.locator('[data-template-action="apply"]')).toBeHidden();
    const recoveryId = await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.label === 'Diagnose and agree a response').id);
    await delivery.locator(`[data-delivery-session="${recoveryId}"]`).click();
    await expect(session(page).locator('[name="label"]')).toHaveValue('Diagnose and agree a response');
    await root(page).locator('[data-native-return-action]').click();
    await expect(planning).toBeVisible();
    assert.equal(await bytes(page), arranged, 'the new session opens its accepted record for later editing');

    await sharedTrack(page, 'review').click();
    await expect(session(page).locator('[name="label"]')).toHaveValue('Pilot decision review');
    await root(page).locator('[data-native-return-action]').click();
    await expect(planning).toBeVisible();
    assert.equal(await bytes(page), arranged, 'accepted session inspection returns to the same Team planning section');
    await templates.locator('[data-reel-choice="tiger-team"]').click();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount), undoBefore + 1, 'the selected arrangement can be inspected again without another history entry');
    await templates.locator('[data-template-action="undo"]').click();
    assert.equal(await bytes(page), customized, 'Undo restores the preceding arrangement and its work together');
  });

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
