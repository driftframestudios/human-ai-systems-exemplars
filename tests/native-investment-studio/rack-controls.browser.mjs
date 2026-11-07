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
let server, fixture, complete;
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../..' + route), 'utf8');
  fixture = createNativeAboutFixture(source);
  complete = source.replace('data="../img/plot/about_prompt_conditions_cartography.svg"', 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
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
const adjacent = page => root(page).locator('.studio-rack-editor');
const configure = page => root(page).locator('[data-native-configure]');
const track = (page, id) => horizon(page).locator(`[data-cadence-key="track-work:${id}"]`);
const sharedTrack = (page, id) => shared(page).locator(`[data-session-track="${id}"] .studio-session-tracks__name`);
const bytes = page => page.evaluate(() => window.rackFixture.studio.exportText());
async function open(t, engine, width, full = false) {
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
    if (url.origin === server.origin && url.pathname === route) return request.fulfill({ status: 200, contentType: 'text/html', body: full ? complete : fixture });
    return url.origin === server.origin ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' });
  });
  await page.goto(server.origin + route); await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  await page.evaluate(async () => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
    const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
    const element = document.querySelector('[data-native-coordination]');
    mountCoordinationPanel(element).dispose();
    const studio = createStudio(createShowcasePlan());
    window.rackFixture = { studio, controller: mountCoordinationPanel(element, { studio }), editing: createDraftCoordinator(studio) };
  });
  return page;
}
async function receiverReading(page, selectedId, expanded) {
  const keys = root(page).locator('[data-studio-session-id]');
  assert.ok(await keys.count() >= 8, 'both racks expose accepted session controls');
  const controlsId = await keys.first().getAttribute('aria-controls');
  assert.ok(controlsId, 'session keys name their mounted settings receiver');
  assert.equal(await root(page).locator(`[id="${controlsId}"]`).count(), 1);
  if (expanded) assert.equal(await root(page).locator(`[id="${controlsId}"]`).evaluate(node => node.matches('[data-native-configure]') || Boolean(node.querySelector('[data-native-configure]'))), true, 'expanded controls identify the visible canonical settings');
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
    const person = designTeam.locator('[data-delivery-person]').first();
    await person.click();
    await expect(adjacent(page).locator('[data-person-configure] [name="ratePerHour"]')).toBeFocused();
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(person).toBeFocused();
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
    await delivery.locator('[data-delivery-open="testing"]').click();
    await delivery.locator('[data-delivery-session="review"]').click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Pilot decision review');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(planning).toBeVisible();
    await expect(delivery.locator('[data-delivery-session="review"]')).toBeFocused();
    await expect(board).toHaveAttribute('data-delivery-scope', 'testing');
    await expect(delivery.locator('[data-delivery-current]')).toHaveText('Testing');
    await delivery.locator('[data-delivery-overview]').click();
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
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Diagnose and agree a response');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(planning).toBeVisible();
    await expect(delivery.locator(`[data-delivery-session="${recoveryId}"]`)).toBeFocused();
    assert.equal(await bytes(page), arranged, 'the new session opens its accepted record for later editing');

    await sharedTrack(page, 'review').click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Pilot decision review');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(planning).toBeVisible();
    await expect(sharedTrack(page, 'review')).toBeFocused();
    assert.equal(await bytes(page), arranged, 'accepted session inspection returns to the same Team planning section');
    await templates.locator('[data-reel-choice="tiger-team"]').click();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount), undoBefore + 1, 'the selected arrangement can be inspected again without another history entry');
    await templates.locator('[data-template-action="undo"]').click();
    assert.equal(await bytes(page), customized, 'Undo restores the preceding arrangement and its work together');
  });

  test(`${engine}: adjacent session editing retains draft, scope and return across both racks at ${width}px`, { timeout: 90000 }, async t => {
    const page = await open(t, engine, width, true), accepted = await bytes(page);
    await page.evaluate(() => { window.rackFixture.sessionNode = document.querySelector('[data-native-configure]'); });
    await receiverReading(page, 'review', false);
    const closedCaret = await caret(track(page, 'pairing'));
    await horizon(page).locator('[data-cadence-key="track-period:period-2"]').click();
    const currentPeriod = horizon(page).getByRole('heading', { name: 'Sprint 2', exact: true });
    await expect(currentPeriod).toHaveAttribute('aria-current', 'page');
    const pad = horizon(page).locator('.native-cadence__pad[data-studio-session-id="pairing"]').first();
    const occurrence = Number((await pad.getAttribute('data-cadence-key')).split(':').at(-1));
    const rackShape = () => horizon(page).locator('.native-cadence__screen').evaluate(node => {
      const box = node.getBoundingClientRect(); return { width:box.width, height:box.height };
    });
    await pad.focus();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before = await rackShape();
    const sourceScroll = await horizon(page).locator('.native-cadence__tracks').evaluate(node => node.scrollLeft);
    await page.keyboard.press('Enter');
    await expect(adjacent(page)).toBeVisible();
    await expect(adjacent(page).locator('.studio-rack-editor__origin')).toContainText('Coordination horizon');
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Prototype pairing');
    const placement = configure(page).locator(`[data-placement-index="${occurrence}"][data-placement-field="periodId"]`);
    await expect(placement).toBeFocused();
    await expect.poll(() => placement.evaluate(node => {
      const box = node.getBoundingClientRect(), nav = document.querySelector('.nav__top--sticky')?.getBoundingClientRect();
      return box.top >= (nav?.bottom ?? 0) && box.bottom <= innerHeight;
    })).toBe(true);
    await receiverReading(page, 'pairing', true);
    assert.deepEqual(await rackShape(), before, 'the adjacent reveal preserves its source rack geometry');
    assert.equal(await adjacent(page).evaluate(node => Boolean(node.previousElementSibling?.matches('[data-score-projection]'))), true,
      'the horizon receiver follows its stable rack owner outside the generated projection');
    assert.equal(await configure(page).evaluate(node => node === window.rackFixture.sessionNode), true, 'the adjacent panel borrows the canonical session owner');
    await expect(configure(page)).toHaveCount(1);
    const geometry = await adjacent(page).evaluate(node => {
      const box = node.getBoundingClientRect();
      const module = node.querySelector('.native-time-controls');
      return { left:box.left, right:box.right, nestedForm:Boolean(node.closest('form')),
        module:module.getBoundingClientRect().toJSON(),
        targets:[...module.querySelectorAll('input,button,.native-knob')].filter(target => target.getClientRects().length).map(target => {
          const rect=target.getBoundingClientRect(); return { left:rect.left,right:rect.right };
        }) };
    });
    assert.equal(geometry.nestedForm, false);
    assert.ok(geometry.left >= 0 && geometry.right <= width + 1 && geometry.targets.every(box => box.left >= geometry.left - 1 && box.right <= geometry.right + 1), JSON.stringify(geometry));
    await adjacent(page).evaluate(node => node.scrollIntoView({ block:'start', behavior:'instant' }));
    await page.screenshot({ path:resolve(captures, `${engine}-adjacent-session-${width}-viewport.png`) });
    await adjacent(page).screenshot({ path:resolve(captures, `${engine}-adjacent-session-${width}.png`) });
    const minutes = configure(page).locator('[name="minutesPerSession"]');
    await configure(page).locator('[data-native-minutes-knob]').press('ArrowUp');
    await expect(minutes).toHaveValue('1');
    await expect(configure(page).locator('[data-native-duration-minutes]')).toHaveText('01');
    await minutes.fill('045');
    await page.evaluate(() => { window.rackFixture.sessionToken = window.rackFixture.editing.session.read().draft.token; });
    await track(page, 'pairing').click();
    await expect(adjacent(page)).toBeHidden(); await expect(track(page, 'pairing')).toBeFocused();
    await pad.click(); await expect(minutes).toHaveValue('045');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(adjacent(page)).toBeHidden(); await expect(pad).toBeFocused();
    assert.equal(await horizon(page).locator('.native-cadence__tracks').evaluate(node => node.scrollLeft), sourceScroll, 'Close keeps the originating track position');
    await expect(currentPeriod).toHaveAttribute('aria-current', 'page');
    await receiverReading(page, 'pairing', false);
    assert.equal(await bytes(page), accepted);
    await track(page, 'pairing').click();
    await expect(minutes).toHaveValue('045');
    const openCaret = await caret(track(page, 'pairing'));
    assert.notEqual(openCaret, closedCaret, 'the selected row points into its open receiver');
    await track(page, 'pairing').click();
    await expect(adjacent(page)).toBeHidden(); await expect(track(page, 'pairing')).toBeFocused();
    await receiverReading(page, 'pairing', false);
    await track(page, 'pairing').click();
    await expect(minutes).toHaveValue('045');
    const participant = shared(page).locator('[data-session-track="pairing"] .studio-session-tracks__pad').first();
    await participant.click();
    await expect(adjacent(page)).toBeVisible(); await expect(minutes).toHaveValue('045');
    await expect(adjacent(page).locator('.studio-rack-editor__origin')).toContainText('Team planning');
    assert.equal(await page.evaluate(() => window.rackFixture.editing.session.read().draft.token === window.rackFixture.sessionToken), true,
      'cross-rack inspection retains the same session lease');
    assert.equal(await adjacent(page).evaluate(node => node.previousElementSibling?.matches('[data-connection-templates]')), true,
      'participation inspection uses the Team planning receiver');
    await receiverReading(page, 'pairing', true);
    await adjacent(page).screenshot({ path:resolve(captures, `${engine}-adjacent-shared-session-${width}.png`) });
    await sharedTrack(page, 'research').click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Research synthesis');
    await receiverReading(page, 'research', true);
    await sharedTrack(page, 'pairing').click();
    await expect(minutes).toHaveValue('045');
    await configure(page).locator('[data-action="cancel"]').click();
    await expect(adjacent(page)).toBeHidden(); await expect(sharedTrack(page, 'pairing')).toBeFocused();
    await expect.poll(() => sharedTrack(page, 'pairing').evaluate(node => {
      const box = node.getBoundingClientRect(), nav = document.querySelector('.nav__top--sticky')?.getBoundingClientRect();
      return box.top >= (nav?.bottom ?? 0) && box.bottom <= innerHeight;
    })).toBe(true);
    assert.equal(await bytes(page), accepted, 'Cancel discards the session proposal');
    await participant.click();
    await expect(minutes).toHaveValue('0');
    const undoBefore = await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount);
    await minutes.fill('45');
    await configure(page).locator('[data-action="apply"]').click();
    await expect(adjacent(page)).toBeVisible();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.id === 'pairing').minutesPerOccurrence), 105);
    assert.equal(await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount), undoBefore + 1, 'Apply accepts through the existing owner once');
    await adjacent(page).locator('[data-rack-editor-close]').click(); await expect(participant).toBeFocused();
    await expect(currentPeriod).toHaveAttribute('aria-current', 'page');
    await receiverReading(page, 'pairing', false);
    assert.deepEqual(await skin(track(page, 'pairing')), await skin(sharedTrack(page, 'pairing')), 'both readings share the session key treatment');

    const connections = root(page).locator('[data-native-connection-view]');
    await connections.locator('.studio-accepted-connections > summary').click();
    await connections.locator('button[data-connection-select="scope"]').click();
    const support = connections.getByRole('button', { name:'Inspect Research synthesis', exact:true });
    const entryKey = await support.getAttribute('data-studio-entry-key');
    assert.ok(entryKey, 'supporting work keeps a stable connection-specific entry');
    await support.click();
    await configure(page).locator('[name="label"]').fill('Research synthesis with operating context');
    await configure(page).locator('[data-action="apply"]').click();
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(connections.locator(`[data-studio-entry-key="${entryKey}"]`)).toBeFocused();
    await expect(connections.locator('button[data-connection-select="scope"]')).toHaveAttribute('aria-current', 'true');
    await expect(connections.locator(`[data-studio-entry-key="${entryKey}"]`)).toHaveText('Inspect Research synthesis with operating context');
    await contained(page, width);
  });
}
