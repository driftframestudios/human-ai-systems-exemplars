import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { participantMovement } from './participant-movement.browser-helper.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-sessions');
let server, fixture, complete;
registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const object = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  assert.equal(source.split(object).length, 2);
  complete = source.replace(object, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  fixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>' });
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});
const root = page => page.locator('[data-native-coordination]');
// The session owner lends its form to the active rack. Locate it from the
// Studio root so these behavior cases follow the same live form after a handoff.
const sessions = page => root(page);
const form = page => sessions(page).locator('[data-native-configure] form');
const field = (page, name) => form(page).locator(`[name="${name}"]`);
const action = (page, name) => name === 'create'
  ? root(page).locator('[data-studio-entry-key="shared-session-add"]')
  : name === 'remove' ? root(page).locator('[data-rack-remove-plan]')
    : sessions(page).locator(`[data-session-action="${name}"]`);
const legacy = (page, name) => sessions(page).locator(`[data-action="${name}"]`);
const currentSessionId = page => page.evaluate(async () => {
  const { describeSessionTarget } = await import('/collaboration/native-investment-studio/command-draft.mjs');
  return describeSessionTarget(window.sessionFixture.controller.read().draft?.sessionId)?.id;
});
async function closeSession(page) {
  const close = root(page).locator('[data-rack-editor-close]:visible');
  if (await close.count()) await close.click();
}
async function chooseSession(page, id) {
  await closeSession(page);
  const cassette = root(page).locator(`[data-studio-plan-id="${id}"]:visible`);
  if (await cassette.count()) await cassette.click();
  await sessionEntry(page, id).click();
}
const sessionEntry = (page, id) => root(page).locator(`.native-cadence__track-name[data-studio-session-id="${id}"]:visible, [data-delivery-session="${id}"]:visible`).first();
async function addSession(page) {
  const existing = new Set(JSON.parse(await bytes(page)).work.map(work => work.id));
  await action(page, 'create').click();
  // Creation accepts the seed with its editor closed; select it to refine it.
  // An empty people/team roster still opens the canonical prerequisite draft.
  const created = JSON.parse(await bytes(page)).work.find(work => !existing.has(work.id));
  if (created) await chooseSession(page, created.id);
  await expect(form(page)).toBeVisible();
}
const member = (page, id) => sessions(page).locator(`[data-session-person="${id}"]`);
const total = page => root(page).locator('[data-native-total]');
const knob = (page, unit = 'minutes') => form(page).locator(`[data-native-${unit}-knob]`);
const dial = (page, unit = 'minutes') => form(page).locator(`[data-native-${unit}-dial]`);
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const bytes = page => page.evaluate(() => window.sessionFixture.studio.exportText());
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function open(t, engine, full = false, contextOptions = {}) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...contextOptions });
  const page = await context.newPage(), telemetry = monitor(page), pending = new Set();
  page.setDefaultTimeout(5000);
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
      return request.fulfill({ status: 200, contentType: 'text/html', body: full ? complete : fixture });
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' });
  });
  await page.goto(server.origin + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  await page.evaluate(async () => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
    const element = document.querySelector('[data-native-coordination]');
    mountCoordinationPanel(element).dispose();
    const studio = createStudio();
    window.sessionFixture = { studio, controller: mountCoordinationPanel(element, { studio }), editing: createDraftCoordinator(studio) };
  });
  await chooseSession(page, 'review');
  return page;
}

async function prepareSession(page) {
  const close = root(page).locator('[data-rack-editor-close]:visible');
  if (await close.count()) await close.click();
  await addSession(page);
  await field(page, 'label').fill('Planning together');
  await field(page, 'teamId').selectOption('delivery');
  await member(page, 'product-one').check();
  await member(page, 'product-two').check();
  for (const id of ['engineering-one', 'engineering-two']) await member(page, id).uncheck();
  await field(page, 'hoursPerSession').fill('1');
  await field(page, 'minutesPerSession').fill('0');
  await field(page, 'occurrences').fill('2');
}

async function dialPoint(page, degrees, unit = 'minutes', turnBox = null) {
  const box = turnBox ?? await knob(page, unit).boundingBox();
  assert.ok(box, 'the mounted dial has a visible pointer target');
  const radians = degrees * Math.PI / 180, radius = Math.min(box.width, box.height) * .38;
  return { x: box.x + box.width / 2 + Math.sin(radians) * radius,
    y: box.y + box.height / 2 - Math.cos(radians) * radius };
}
async function beginTurn(page, degrees, unit = 'minutes') {
  await knob(page, unit).scrollIntoViewIfNeeded();
  await knob(page, unit).evaluate(node => node.addEventListener('pointerdown', event => {
    window.sessionFixture.knobPointerId = event.pointerId;
  }, { once: true }));
  const box = await knob(page, unit).boundingBox(), point = await dialPoint(page, degrees, unit, box);
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  return box;
}
const captured = (page, unit = 'minutes') => knob(page, unit).evaluate(node => node.hasPointerCapture(window.sessionFixture.knobPointerId));

for (const engine of names) {
  test(`${engine}: session placement stays with its draft and newly added occurrences remain unplaced`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      window.sessionFixture.controller.dispose();
      const studio = createStudio(createShowcasePlan());
      window.sessionFixture = { studio, controller: mountCoordinationPanel(document.querySelector('[data-native-coordination]'), { studio }) };
    });
    await chooseSession(page, 'review');
    const placements = sessions(page).locator('[data-session-occurrences]');
    const firstPeriod = placements.locator('[data-occurrence-field="periodId"][value="period-4"]');
    const before = await bytes(page);
    await expect(firstPeriod).toBeChecked();
    await page.setViewportSize({ width: 390, height: 1000 });
    await placements.scrollIntoViewIfNeeded();
    const bounds = await placements.evaluate(element => ({ left: element.getBoundingClientRect().left,
      right: element.getBoundingClientRect().right, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport + 1 && bounds.pageWidth <= bounds.viewport + 1, JSON.stringify(bounds));
    await placements.screenshot({ path: resolve(captures, `${engine}-placements-mobile.png`) });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const thirdPeriod = placements.locator('[data-occurrence-field="periodId"][value="period-3"]');
    await firstPeriod.press('ArrowLeft');
    await expect(thirdPeriod).toBeChecked();
    await expect(thirdPeriod).toBeFocused();
    assert.equal(await bytes(page), before, 'choosing a sprint stays in the draft');
    await legacy(page, 'cancel').click();
    await chooseSession(page, 'review');
    await expect(firstPeriod).toBeChecked();
    await placements.locator('[data-session-occurrence-add]').click();
    await expect(placements.locator('[data-session-occurrence="4"]')).toHaveAttribute('data-placed', 'false');
    await placements.locator('[data-session-occurrence="0"]').click();
    await thirdPeriod.check();
    await legacy(page, 'apply').click();
    const accepted = JSON.parse(await bytes(page)), work = accepted.work.find(row => row.id === 'review');
    assert.equal(work.minutesPerOccurrence, 30);
    assert.deepEqual(work.personIds, ['maya', 'ari', 'noor']);
    assert.equal(work.occurrences, 5);
    const placed = accepted.scoreSettings.cadence.placements.filter(row => row.workId === 'review');
    assert.equal(placed.find(row => row.occurrenceIndex === 0).periodId, 'period-3');
    assert.equal(placed.some(row => row.occurrenceIndex === 4), false);
    for (const index of [4, 3, 2]) {
      await placements.locator(`[data-session-occurrence="${index}"]`).click();
      await placements.locator('[data-session-occurrence-remove]').click();
    }
    await legacy(page, 'apply').click();
    assert.deepEqual(JSON.parse(await bytes(page)).scoreSettings.cadence.placements.filter(row => row.workId === 'review')
      .map(row => row.occurrenceIndex), [0, 1], 'reducing the sessions retires only their trailing placements');
    assert.deepEqual(JSON.parse(await bytes(page)).practices, accepted.practices, 'removing occurrences retains parent-plan support links');
  });

  test(`${engine}: session removal dissolves supporting links and amp Undo restores them`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const { studio, controller } = window.sessionFixture, plan = JSON.parse(studio.exportText());
      plan.practices = []; plan.abilities = []; plan.connections = []; plan.contributions = [];
      const mapping = plan.changeSettings.frameworkMaps.find(row => row.frameworkId === 'kotter');
      mapping.components.find(row => row.componentId === 'vision').workIds = ['review'];
      plan.assuranceSettings.quality.concepts.find(row => row.conceptId === 'acceptance-criteria').workIds = ['review'];
      plan.assuranceSettings.recoveryEvents = [{ id: 'acceptance-criteria', label: 'Replay the interrupted request', included: true, lifecycle: 'active',
        eventCount: 1, aggregateMinutesPerEvent: 30, receiverPersonId: null, reviewBoundary: null, workIds: ['review'] }];
      plan.assuranceSettings.learningActions = [{ id: 'learn', promptId: 'source-framing', context: null, decisionOwnerPersonId: null, reviewBoundary: null, workIds: ['review'] }];
      plan.assuranceSettings.rehearsals = [{ id: 'practice', definitionId: 'review-change', definitionVersion: '1.0.0', context: null, assumptions: null,
        response: null, reviewerPersonId: null, observedPlanRevision: 0, observation: null, workIds: ['review'], connectionIds: [], personIds: [] }];
      const result = studio.importText(JSON.stringify(plan), studio.read());
      if (!result.ok) throw Error(JSON.stringify(result.error)); controller.refresh();
    });
    const before = await bytes(page);
    await action(page, 'remove').click();
    await expect(sessions(page).locator('[data-native-session-dependencies]')).toBeHidden();
    await expect(sessions(page).locator('[data-native-session-confirm]')).toContainText('Undo restores them');
    await expect(legacy(page, 'apply')).toBeEnabled();
    assert.equal(await bytes(page), before, 'the concise confirmation keeps the accepted plan intact');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const confirmation = root(page).locator('[data-rack-editor-kind="session"]');
      await confirmation.screenshot({ path: resolve(captures, `${engine}-remove-session-${width}.png`) });
    }
    await legacy(page, 'apply').click();
    const accepted = JSON.parse(await bytes(page));
    assert.deepEqual(accepted.work, []);
    assert.equal(await root(page).evaluate(node => {
      const active = document.activeElement;
      return node.contains(active) && active.matches('button') && Boolean(active.getClientRects().length)
        && !active.closest('[data-rack-editor-kind="session"]');
    }), true, 'removing the selected record returns keyboard focus to a surviving rack control');
    const assurance = accepted.assuranceSettings;
    assert.deepEqual(assurance.quality.concepts.find(row => row.conceptId === 'acceptance-criteria').workIds, []);
    assert.deepEqual(assurance.recoveryEvents[0].workIds, []);
    assert.deepEqual(assurance.learningActions[0].workIds, []);
    assert.deepEqual(assurance.rehearsals[0].workIds, []);
    assert.deepEqual(accepted.changeSettings.frameworkMaps.find(row => row.frameworkId === 'kotter')
      .components.find(row => row.componentId === 'vision').workIds, []);
    await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), before);
    await expect(sessionEntry(page, 'review')).toBeVisible();
  });

  test(`${engine}: loaded session settings stay in the rack and preserve accepted work until Apply`, { timeout: 45000 }, async t => {
    const page = await open(t, engine), before = await bytes(page);
    const rack = root(page).locator('[data-rack-editor-kind="session"]');
    await expect(rack).toBeVisible();
    await expect(rack).toContainText('Weekly working session');
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const bounds = await rack.evaluate(element => { const b = element.getBoundingClientRect(); return {left:b.left,right:b.right,width:innerWidth}; });
      assert.ok(bounds.left >= 0 && bounds.right <= bounds.width + 1, JSON.stringify(bounds));
    }
    await field(page, 'minutesPerSession').fill('45');
    await expect(sessions(page).locator('[data-native-preview-total]')).toHaveText('$1,800.00');
    assert.equal(await bytes(page), before);
    await legacy(page, 'cancel').click();
    await closeSession(page);
    const track = sessionEntry(page, 'review');
    await expect(track).toContainText('30 min each');
    await expect(track).toHaveAttribute('aria-expanded', 'false');
    await track.click();
    await expect(field(page, 'minutesPerSession')).toHaveValue('30');
    await tab(page, 'investment').click();
    await expect(total(page)).toHaveText('$1,200.00');
    assert.equal(await bytes(page), before);
  });

  test(`${engine}: a duration turn retains its amount when the page scrolls before release`, { timeout: 45000 }, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    await beginTurn(page, 0, 'hours');
    await expect(field(page, 'hoursPerSession')).toHaveValue('12');
    assert.equal(await captured(page, 'hours'), true);
    const before = await page.evaluate(() => scrollY);
    await page.evaluate(() => window.scrollBy({ top:120, behavior:'instant' }));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
    await page.mouse.up();
    await expect(field(page, 'hoursPerSession')).toHaveValue('12');
    assert.equal(await captured(page, 'hours'), false);
    await beginTurn(page, -90, 'hours'); await page.mouse.up();
    await expect(field(page, 'hoursPerSession')).toHaveValue('4');
    await expect(field(page, 'minutesPerSession')).toHaveValue('30');
    assert.equal(await bytes(page), accepted, 'scrolling and later turns remain draft edits');
  });

  test(`${engine}: the Hours dial changes its own duration part and preserves Minutes through precision, cancellation and the combined cap`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), accepted = await bytes(page), hours = knob(page, 'hours');
    await expect(dial(page, 'hours')).toBeVisible(); await expect(hours).toHaveAttribute('max', '23');
    await hours.scrollIntoViewIfNeeded();
    const point = await dialPoint(page, -135 + 2 * 270 / 24, 'hours'); await page.mouse.click(point.x, point.y);
    await expect(field(page, 'hoursPerSession')).toHaveValue('2'); await expect(field(page, 'minutesPerSession')).toHaveValue('30');
    await expect(form(page).locator('[data-native-duration-hours]')).toHaveText('02');
    await expect(form(page).locator('[data-native-duration-minutes]')).toHaveText('30');
    await expect(sessions(page).locator('[data-native-preview-total]')).toHaveText('$6,000.00');
    await hours.focus(); await page.keyboard.press('ArrowUp'); await expect(field(page, 'hoursPerSession')).toHaveValue('3');
    await form(page).locator('[data-field="hoursPerSession"][data-step="-1"]').click(); await expect(hours).toHaveValue('2');
    await field(page, 'hoursPerSession').fill('002'); await expect(hours).toHaveValue('2');
    await beginTurn(page, 0, 'hours'); await expect(field(page, 'hoursPerSession')).toHaveValue('12');
    await page.keyboard.press('Escape'); await page.mouse.up(); await expect(field(page, 'hoursPerSession')).toHaveValue('002');
    await expect(field(page, 'minutesPerSession')).toHaveValue('30');
    await field(page, 'hoursPerSession').fill('later'); await expect(hours).toBeDisabled(); await expect(knob(page)).toBeDisabled();
    await expect(field(page, 'hoursPerSession')).toHaveValue('later');
    await field(page, 'hoursPerSession').fill('23'); await hours.focus(); await page.keyboard.press('End');
    await expect(field(page, 'hoursPerSession')).toHaveValue('23'); await expect(field(page, 'minutesPerSession')).toHaveValue('30');
    await expect(hours).toHaveAttribute('aria-valuetext', '23 hours per session');
    await expect(form(page).locator('[data-native-hours-knob-note]')).toBeHidden();
    await field(page, 'minutesPerSession').fill('0'); await expect(hours).toHaveAttribute('max', '24');
    await hours.focus(); await page.keyboard.press('End'); await expect(field(page, 'hoursPerSession')).toHaveValue('24');
    await expect(knob(page)).toHaveAttribute('max', '0'); await expect(field(page, 'minutesPerSession')).toHaveValue('0');
    assert.equal(await bytes(page), accepted);
    await field(page, 'hoursPerSession').fill('2'); await field(page, 'minutesPerSession').fill('30'); await legacy(page, 'apply').click();
    assert.equal(await page.evaluate(() => window.sessionFixture.studio.read().state.work[0].minutesPerOccurrence), 150);
    await expect(total(page)).toHaveText('$6,000.00');
  });

  test(`${engine}: the native minutes knob shares precision text, preview, Apply and recovery`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    await expect(dial(page)).toBeVisible();
    await expect(knob(page)).toHaveAttribute('type', 'range');
    await expect(knob(page)).toHaveAttribute('min', '0');
    await expect(knob(page)).toHaveAttribute('max', '59');
    await expect(sessions(page).locator('[data-native-remote-title]')).toHaveText('Session settings · Weekly working session');
    await knob(page).focus();
    for (const [key, value] of [['Home', '0'], ['ArrowUp', '1'], ['ArrowRight', '2'], ['ArrowDown', '1'], ['ArrowLeft', '0'], ['End', '59']]) {
      await page.keyboard.press(key);
      await expect(field(page, 'minutesPerSession')).toHaveValue(value);
      await expect(knob(page)).toHaveAttribute('aria-valuetext', `${value} minutes per session`);
    }
    await field(page, 'minutesPerSession').fill('45');
    await expect(knob(page)).toHaveValue('45');
    await expect(sessions(page).locator('[data-native-preview-total]')).toHaveText('$1,800.00');
    await expect(total(page)).toHaveText('$1,200.00');
    assert.equal(await bytes(page), accepted, 'a turn and typed value remain draft work');
    for (const text of ['', 'later', '60']) {
      await field(page, 'minutesPerSession').fill(text);
      await expect(knob(page)).toBeDisabled();
      await expect(dial(page)).toHaveAttribute('data-value-state', 'unavailable');
      await expect(form(page).locator('[data-native-knob-note]')).toBeVisible();
      await expect(field(page, 'minutesPerSession')).toHaveValue(text);
    }
    await field(page, 'minutesPerSession').fill('44');
    await form(page).locator('[data-field="minutesPerSession"][data-step="1"]').click();
    await expect(knob(page)).toHaveValue('45');
    await legacy(page, 'apply').click();
    await expect(total(page)).toHaveText('$1,800.00');
    assert.equal(await page.evaluate(() => window.sessionFixture.studio.read().state.work[0].minutesPerOccurrence), 45);
    await tab(page, 'investment').click();
    await root(page).locator('[data-studio-undo]').click();
    await expect(total(page)).toHaveText('$1,200.00');
    await tab(page, 'coordination').click();
    await chooseSession(page, 'review');
    if (await legacy(page, 'review').isVisible()) await legacy(page, 'review').click();
    await knob(page).focus(); await page.keyboard.press('End');
    await legacy(page, 'cancel').click();
    await expect(total(page)).toHaveText('$1,200.00');
    assert.equal(await page.evaluate(() => window.sessionFixture.studio.read().state.work[0].minutesPerOccurrence), 30);
  });

  test(`${engine}: rotary tap, drag, cancellation and native high-contrast input retain the same draft`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, false, { hasTouch: engine === 'chromium' }), accepted = await bytes(page);
    await knob(page).scrollIntoViewIfNeeded();
    const fortyFive = await dialPoint(page, -135 + 45 * 270 / 59);
    await page.mouse.click(fortyFive.x, fortyFive.y);
    await expect(field(page, 'minutesPerSession')).toHaveValue('45');
    await expect(sessions(page).locator('[data-native-preview-total]')).toHaveText('$1,800.00');
    if (engine === 'chromium') {
      const ten = await dialPoint(page, -90);
      await page.touchscreen.tap(ten.x, ten.y);
      await expect(field(page, 'minutesPerSession')).toHaveValue('10');
      await page.touchscreen.tap(fortyFive.x, fortyFive.y);
      await expect(field(page, 'minutesPerSession')).toHaveValue('45');
      assert.equal(await dial(page).getAttribute('data-dragging'), null, 'a touch tap ends its captured turn');
    }
    const turnBox = await beginTurn(page, 0);
    assert.equal(await captured(page), true, 'the owned turn captures its pointer');
    for (const angle of [90, 135, 175, -175]) {
      const point = await dialPoint(page, angle, 'minutes', turnBox); await page.mouse.move(point.x, point.y);
    }
    await expect(field(page, 'minutesPerSession')).toHaveValue('59');
    await page.keyboard.press('Escape');
    await expect(field(page, 'minutesPerSession')).toHaveValue('45');
    assert.equal(await captured(page), false, 'Escape releases the pointer and restores its starting value');
    await page.mouse.up();
    await field(page, 'minutesPerSession').fill('0030');
    await beginTurn(page, 90);
    await knob(page).evaluate(node => node.dispatchEvent(new PointerEvent('pointercancel', {
      pointerId: window.sessionFixture.knobPointerId, bubbles: true,
    })));
    await expect(field(page, 'minutesPerSession')).toHaveValue('0030');
    assert.equal(await captured(page), false, 'pointer cancellation releases capture and preserves the exact precision text');
    await page.mouse.up();

    await field(page, 'hoursPerSession').fill('24'); await field(page, 'minutesPerSession').fill('0');
    await expect(knob(page)).toHaveAttribute('max', '0'); await beginTurn(page, 0);
    await expect(field(page, 'minutesPerSession')).toHaveValue('0'); await expect(knob(page)).toBeEnabled();
    await page.keyboard.press('Escape'); assert.equal(await captured(page), false); await page.mouse.up();
    await expect(field(page, 'minutesPerSession')).toHaveValue('0'); await expect(field(page, 'minutesPerSession')).toHaveAttribute('aria-invalid', 'false');
    await field(page, 'hoursPerSession').fill('0'); await field(page, 'minutesPerSession').fill('0030'); await expect(knob(page)).toHaveAttribute('max', '59');

    await knob(page).scrollIntoViewIfNeeded(); await knob(page).focus();
    const center = await knob(page).boundingBox(), scrollBefore = await page.evaluate(() => scrollY);
    await page.mouse.move(center.x + center.width / 2, center.y + center.height / 2);
    await page.mouse.wheel(0, 360);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore + 100);
    await expect(field(page, 'minutesPerSession')).toHaveValue('0030');

    await page.emulateMedia({ forcedColors: 'active' });
    await knob(page).scrollIntoViewIfNeeded();
    assert.equal(await knob(page).evaluate(node => getComputedStyle(node).opacity), '1', 'forced colors exposes the native range');
    const range = await knob(page).boundingBox();
    await knob(page).click({ position: { x: range.width * .9, y: range.height / 2 } });
    assert.ok(Number(await knob(page).inputValue()) > 30, `native pointer selection remains available: ${await knob(page).inputValue()}`);
    await expect(field(page, 'minutesPerSession')).toHaveValue(await knob(page).inputValue());
    assert.equal(await dial(page).getAttribute('data-dragging'), null, 'forced colors uses the browser pointer interaction');
    assert.equal(await bytes(page), accepted);
  });

  test(`${engine}: parking and disposal release rotary capture before later pointer events`, { timeout: 60000 }, async t => {
    for (const unit of ['hours', 'minutes']) {
      const page = await open(t, engine), accepted = await bytes(page);
      const value = unit === 'hours' ? '20' : '49', fieldName = unit === 'hours' ? 'hoursPerSession' : 'minutesPerSession';
      await beginTurn(page, 90, unit);
      await expect(field(page, fieldName)).toHaveValue(value);
      await tab(page, 'people').focus(); await page.keyboard.press('Enter');
      assert.equal(await captured(page, unit), false, 'chapter departure releases the turn before parking');
      await knob(page, unit).evaluate(node => node.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: window.sessionFixture.knobPointerId, clientX: 0, clientY: 0, bubbles: true,
      })));
      await page.mouse.up();
      await tab(page, 'coordination').click();
      await expect(field(page, fieldName)).toHaveValue(value);
      await beginTurn(page, 0, unit);
      await page.evaluate(() => window.sessionFixture.controller.dispose());
      assert.equal(await captured(page, unit), false, 'receiver retirement releases its pointer');
      await expect(dial(page, unit)).toBeHidden();
      await knob(page, unit).evaluate(node => node.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: window.sessionFixture.knobPointerId, clientX: 0, clientY: 0, bubbles: true,
      })));
      await page.mouse.up();
      assert.equal(await bytes(page), accepted, 'retired events cannot accept or alter the plan');
    }
  });

  test(`${engine}: participant toggles keep cards in place and explicit moves own the order`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const list = sessions(page).locator('[data-native-session-members]');
    const geometry = () => list.evaluate(element => {
      const origin = element.getBoundingClientRect().top;
      return [...element.children].map(row => ({ id: row.querySelector('input').dataset.sessionPerson,
        y: Math.round((row.getBoundingClientRect().top - origin) * 1000) / 1000, height: Math.round(row.getBoundingClientRect().height * 1000) / 1000 }));
    });
    const accepted = await bytes(page);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await member(page, 'product-one').scrollIntoViewIfNeeded();
      await member(page, 'product-one').focus(); await frames(page);
      const before = await geometry();
      await page.keyboard.press('Space');
      await expect(member(page, 'product-one')).not.toBeChecked();
      await expect(member(page, 'product-one').locator('xpath=ancestor::li').locator('.native-coordination__member-status')).toHaveText('Available');
      await expect(member(page, 'product-one')).toBeFocused();
      assert.deepEqual(await geometry(), before, 'deselection retains every row position and height');
      await page.keyboard.press('Space');
      assert.deepEqual(await geometry(), before, 'reselection retains the spatial arrangement');
      assert.equal(await bytes(page), accepted, 'membership remains a draft until Apply');
    }
    await sessions(page).locator('[data-session-action="person-up"][data-person-id="product-one"]').click();
    assert.notDeepEqual((await geometry()).map(row => row.id), ['product-one', 'product-two', 'engineering-one', 'engineering-two']);
    await participantMovement(page, list);
    await legacy(page, 'cancel').click();
    assert.equal(await bytes(page), accepted);
  });

  test(`${engine}: an empty plan can create people and a team then return to its unfinished session`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const { studio, controller } = window.sessionFixture;
      const plan = JSON.parse(studio.exportText());
      for (const collection of ['people', 'teams', 'work', 'practices', 'contributions', 'connections']) plan[collection] = [];
      const result = studio.importText(JSON.stringify(plan), studio.read());
      if (!result.ok) throw Error(result.error.code);
      controller.refresh();
    });
    await addSession(page);
    await field(page, 'label').fill('First working session');
    await field(page, 'minutesPerSession').fill('45');
    await form(page).locator('[data-native-create="team"]').click();
    const assembly = root(page).locator('[data-native-assembly]');
    const assemblyForm = assembly.locator('[data-assembly-form]');
    await assemblyForm.locator('[name="label"]').fill('First team');
    await assembly.locator('[data-native-create="person"][data-native-return="assembly"]').click();
    await expect(assembly.getByRole('button', { name: 'Back to Settings · First team', exact: true })).toBeVisible();
    await assemblyForm.locator('[name="label"]').fill('Taylor');
    await assemblyForm.locator('[name="ratePerHour"]').fill('120');
    await assemblyForm.locator('[name="fundedHours"]').fill('1');
    await assembly.locator('[data-assembly-apply]').click();
    const returnButton = root(page).locator('[data-native-return-action]');
    await expect(returnButton).toHaveText('Return to team');
    await returnButton.click();
    await expect(assemblyForm.locator('[name="label"]')).toHaveValue('First team');
    await expect(assembly.locator('[data-assembly-action="review"]')).toBeFocused();
    await assembly.locator('[data-assembly-action="review"]').click();
    await assembly.locator('[data-assembly-member]').check();
    await assembly.locator('[data-assembly-apply]').click();
    await expect(returnButton).toHaveText('Return to session');
    await assembly.getByRole('button', { name: 'Back to Settings · First working session', exact: true }).click();
    await expect(field(page, 'label')).toHaveValue('First working session');
    await expect(field(page, 'minutesPerSession')).toHaveValue('45');
    await expect(legacy(page, 'review')).toBeFocused();
    await legacy(page, 'review').click();
    await expect(field(page, 'teamId')).toBeFocused();
    const teamId = await page.evaluate(() => window.sessionFixture.studio.read().state.teams[0].id);
    await field(page, 'teamId').selectOption(teamId);
    await sessions(page).locator('[data-session-person]').check();
    await legacy(page, 'apply').click();
    const plan = await page.evaluate(() => window.sessionFixture.studio.read().state);
    assert.equal(plan.work[0].label, 'First working session');
    assert.equal(plan.work[0].minutesPerOccurrence, 45);
    assert.equal(plan.work[0].teamId, teamId);
    assert.deepEqual(plan.work[0].personIds, [plan.people[0].id]);
    await expect(root(page).locator('[data-native-return-route]')).toBeHidden();
  });
  test(`${engine}: restarting a prerequisite retires its obsolete route and descendants while retaining their drafts`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await field(page, 'label').fill('Session to resume');
    await form(page).locator('[data-native-create="team"]').click();
    const assembly = root(page).locator('[data-native-assembly]');
    const creation = assembly.locator('[data-assembly-form]');
    await creation.locator('[name="label"]').fill('Earlier team draft');
    await assembly.locator('[data-native-create="person"][data-native-return="assembly"]').click();
    await creation.locator('[name="label"]').fill('Earlier person draft');
    const saved = root(page).locator('[data-native-saved]');
    await root(page).locator('[data-amp-panel="saved"]').click();
    await saved.locator('[data-saved-open^="session:"]').click();
    await expect(field(page, 'label')).toHaveValue('Session to resume');
    await expect(root(page).locator('[data-native-return-route]')).toBeHidden();
    await form(page).locator('[data-native-create="team"]').click();
    await creation.locator('[name="label"]').fill('Receiving team');
    await assembly.locator('[data-assembly-apply]').click();
    await root(page).locator('[data-native-return-action]').click();
    await expect(root(page).locator('[data-native-return-route]')).toBeHidden();
    await expect(field(page, 'label')).toHaveValue('Session to resume');
    await expect(saved).toContainText('Earlier team draft');
    await expect(saved).toContainText('Earlier person draft');
    await expect(legacy(page, 'review')).toBeFocused();
  });

  test(`${engine}: resuming a nested origin through Saved edits retains its earlier return destination`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await field(page, 'label').fill('Session waiting for a team');
    await form(page).locator('[data-native-create="team"]').click();
    const assembly = root(page).locator('[data-native-assembly]'), creation = assembly.locator('[data-assembly-form]');
    await creation.locator('[name="label"]').fill('Team waiting for a person');
    await assembly.locator('[data-native-create="person"][data-native-return="assembly"]').click();
    await creation.locator('[name="label"]').fill('Person still being drafted');
    const saved = root(page).locator('[data-native-saved]');
    await root(page).locator('[data-amp-panel="saved"]').click();
    await saved.locator('[data-native-saved-list] > li').filter({ hasText: 'Team waiting for a person' }).locator('[data-saved-open]').click();
    await expect(creation.locator('[name="label"]')).toHaveValue('Team waiting for a person');
    await expect(root(page).locator('[data-native-return-action]')).toHaveText('Return to session');
    await assembly.locator('[data-assembly-apply]').click();
    await root(page).locator('[data-native-return-action]').click();
    await expect(field(page, 'label')).toHaveValue('Session waiting for a team');
    await expect(root(page).locator('[data-native-return-route]')).toBeHidden();
    await expect(saved).toContainText('Person still being drafted');
  });

  test(`${engine}: discarding the saved origin releases its return route and keeps the current creation form`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await field(page, 'label').fill('Unfinished session');
    await form(page).locator('[data-native-create="team"]').click();
    const assembly = root(page).locator('[data-assembly-form]');
    await assembly.locator('[name="label"]').fill('Current team draft');
    const saved = root(page).locator('[data-native-saved]');
    await root(page).locator('[data-amp-panel="saved"]').click();
    await saved.locator('[data-saved-discard^="session:"]').click();
    await expect(root(page).locator('[data-native-return-route]')).toBeHidden();
    await expect(assembly.locator('[name="label"]')).toHaveValue('Current team draft');
    await expect(assembly.locator('fieldset')).toBeEnabled();
  });

  test(`${engine}: contribution session prerequisites return to their owning contribution`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await tab(page, 'people').click();
    await root(page).locator('[data-responsibility-action="create"]').click();
    const contributionId = await page.evaluate(() => window.sessionFixture.studio.read().state.contributions.at(-1).id);
    await root(page).locator(`[data-contribution-id="${contributionId}"]`).click();
    const contribution = root(page).locator('[data-responsibility-configure="contribution"]');
    await contribution.locator('[name="categoryId"]').selectOption('draft-artifacts');
    await contribution.locator('[name="receiverPersonId"]').selectOption('product-one');
    assert.equal(await page.evaluate(id => window.sessionFixture.studio.read().state.contributions.find(row => row.id === id).receiverPersonId, contributionId), 'product-one');
    await contribution.locator('[data-native-create="session"]').click();
    await field(page, 'label').fill('Notes review');
    await field(page, 'teamId').selectOption('delivery');
    await member(page, 'product-one').check();
    await legacy(page, 'apply').click();
    await root(page).locator('[data-native-return-action]').click();
    await expect(contribution.locator('[name="receiverPersonId"]')).toHaveValue('product-one');
    await expect(contribution.locator('[name="categoryId"]')).toBeFocused();
    await expect(contribution.locator('[data-responsibility-recovery]')).toBeHidden();
    const workId = await page.evaluate(() => window.sessionFixture.studio.read().state.work.find(row => row.label === 'Notes review').id);
    const unlinked = await bytes(page);
    await contribution.locator(`[data-responsibility-work="${workId}"]`).check();
    assert.deepEqual(await page.evaluate(id => window.sessionFixture.studio.read().state.contributions.find(row => row.id === id).workIds, contributionId), [workId]);
    await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), unlinked, 'the direct support link has its own Undo step');
  });

  test(`${engine}: a complete session publishes once and reconciles participant, pause and funding choices`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await prepareSession(page);
    // Two people × $100/hour × one hour × two sessions adds $400.
    await expect(sessions(page).locator('[data-native-preview-total]')).toHaveText('$1,600.00');
    await expect(total(page)).toHaveText('$1,400.00');
    const before = await page.evaluate(() => window.sessionFixture.studio.readAcceptance().sequence);
    await legacy(page, 'apply').click();
    await expect(total(page)).toHaveText('$1,600.00');
    const added = await page.evaluate(() => window.sessionFixture.studio.read().state.work.at(-1));
    assert.deepEqual({ ...added, id: 'new-id' }, { id: 'new-id', label: 'Planning together', teamId: 'delivery',
      personIds: ['product-one', 'product-two'], minutesPerOccurrence: 60, occurrences: 2, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active' });
    assert.equal(await page.evaluate(() => window.sessionFixture.studio.readAcceptance().sequence), before + 1);
    await expect(legacy(page, 'apply')).toBeFocused();
    const acceptedSession = await bytes(page);
    await form(page).getByRole('radio', { name: 'Planned', exact: true }).focus(); await page.keyboard.press('ArrowRight');
    await expect(form(page).getByRole('radio', { name: 'Paused', exact: true })).toBeChecked();
    await expect(sessions(page).locator('[data-native-session-pause-note]')).toBeVisible();
    assert.equal(await bytes(page), acceptedSession, 'choosing a status previews the session while accepted work stays exact');
    await legacy(page, 'cancel').click(); await chooseSession(page, added.id);
    await expect(form(page).getByRole('radio', { name: 'Planned', exact: true })).toBeChecked();
    await expect(form(page).getByRole('radio', { name: 'Extra investment', exact: true })).toBeChecked();
    await expect(form(page).getByRole('radio', { name: 'Extra investment', exact: true })).toBeEnabled();
    await page.evaluate(() => {
      const { editing, controller } = window.sessionFixture;
      editing.session.setText(editing.session.read().draft.token, 'funding', 'unknown');
      if (editing.session.read().draft.raw.funding !== 'unknown') throw Error('The saved-choice fixture must reach field validation.');
      controller.refresh();
    });
    await expect(form(page).getByRole('radio', { name: 'Extra investment', exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(form(page).getByRole('radio', { name: 'Included in funded time', exact: true })).toHaveAttribute('aria-invalid', 'true');
    await legacy(page, 'apply').click();
    await expect(form(page).getByRole('radio', { name: 'Extra investment', exact: true })).toBeFocused();
    assert.equal(await bytes(page), acceptedSession, 'an invalid saved choice is recoverable and cannot publish');
    await form(page).getByRole('radio', { name: 'Extra investment', exact: true }).check();
    await expect(form(page).getByRole('radio', { name: 'Included in funded time', exact: true })).toHaveAttribute('aria-invalid', 'false');
    await form(page).getByRole('radio', { name: 'Paused', exact: true }).check(); await legacy(page, 'apply').click();
    await expect(total(page)).toHaveText('$1,600.00');
    await expect(sessions(page).locator('[data-native-session-standing]')).toContainText('Paused');
    await page.evaluate(() => {
      const { studio, controller } = window.sessionFixture;
      for (const id of ['product-one', 'product-two']) {
        const person = studio.read().state.people.find(row => row.id === id);
        const result = studio.updatePerson(id, { ...person, fundedMinutes: 120 }, studio.read());
        if (!result.ok) throw Error(result.error.code);
      }
      controller.refresh();
    });
    await legacy(page, 'review').click();
    await form(page).getByRole('radio', { name: 'Included in funded time', exact: true }).check(); await legacy(page, 'apply').click();
    // $400 funded staffing + $1,200 original extra work; this session uses the funded pool.
    await expect(total(page)).toHaveText('$1,600.00');
    assert.equal(await page.evaluate(() => window.sessionFixture.studio.read().result.allocatedKnownCents), 40000);
    await page.evaluate(() => {
      const { studio, controller } = window.sessionFixture;
      const person = studio.read().state.people.find(row => row.id === 'product-one');
      const result = studio.updatePerson(person.id, { ...person, rateCentsPerHour: null }, studio.read());
      if (!result.ok) throw Error(result.error.code);
      controller.refresh();
    });
    // Three known original participants ($900) and one known funded person ($200).
    await expect(total(page)).toHaveText('$1,100.00');
    await expect(root(page).locator('[data-native-standing]')).toHaveText('Known total · USD');
  });

  test(`${engine}: cross-team sessions create and edit without changing team rosters`, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const { studio, controller } = window.sessionFixture;
      const result = studio.applyCommand({ type: 'team.create', team: { id: 'review-host', label: 'Review host', personIds: [] } }, studio.read());
      if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    const original = await bytes(page), originalTeams = JSON.parse(original).teams;
    await closeSession(page);
    await addSession(page);
    const seed = await bytes(page), addedId = JSON.parse(seed).work.at(-1).id;
    assert.equal(JSON.parse(seed).work.length, JSON.parse(original).work.length + 1, 'Add creates a session immediately');
    for (const keep of [false, true]) {
      await field(page, 'label').fill('Planning together');
      await field(page, 'teamId').selectOption('review-host');
      for (const personId of ['product-one', 'product-two']) await member(page, personId).check();
      for (const personId of ['engineering-one', 'engineering-two']) await member(page, personId).uncheck();
      await field(page, 'hoursPerSession').fill('1');
      await field(page, 'minutesPerSession').fill('0');
      await field(page, 'occurrences').fill('2');
      await expect(sessions(page).locator('[data-native-session-error]')).toBeEmpty();
      assert.equal(await bytes(page), seed, 'settings remain a draft after the initial addition');
      await legacy(page, keep ? 'apply' : 'cancel').click();
      if (!keep) {
        assert.equal(await bytes(page), seed);
        const close = root(page).locator('[data-rack-editor-close]:visible');
        if (await close.count()) await close.click();
        await chooseSession(page, addedId);
      }
    }
    const created = await bytes(page), createdState = JSON.parse(created);
    assert.equal(createdState.work.at(-1).teamId, 'review-host');
    assert.deepEqual(createdState.work.at(-1).personIds, ['product-one', 'product-two']);
    assert.deepEqual(createdState.teams, originalTeams);
    await member(page, 'engineering-one').check();
    await legacy(page, 'apply').click();
    const editedState = JSON.parse(await bytes(page));
    assert.deepEqual(editedState.work.at(-1).personIds, ['product-one', 'product-two', 'engineering-one']);
    assert.deepEqual(editedState.teams, originalTeams);
    for (const expected of [created, seed, original]) {
      await page.evaluate(() => {
        const { studio, controller } = window.sessionFixture;
        const result = studio.undo(studio.read()); if (!result.ok) throw Error(result.error.code); controller.refresh();
      });
      assert.equal(await bytes(page), expected);
    }
  });

  test(`${engine}: session selection retains separate drafts through chapters and stale-plan review`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await prepareSession(page); await legacy(page, 'apply').click();
    const newId = await currentSessionId(page);
    await chooseSession(page, 'review'); await field(page, 'minutesPerSession').fill('45');
    await chooseSession(page, newId); await field(page, 'label').fill('Revised planning name');
    await tab(page, 'people').click();
    await root(page).locator('[data-native-team-editor] [data-person-id="product-one"]').click();
    await root(page).locator('[data-person-configure] input[name="ratePerHour"]').fill('105');
    await root(page).locator('[data-person-action="apply"]').click();
    await expect(total(page)).toHaveText('$1,625.00');
    await tab(page, 'coordination').click();
    await chooseSession(page, newId);
    await expect(field(page, 'label')).toHaveValue('Revised planning name');
    await expect(root(page)).toHaveAttribute('data-native-state', 'stale');
    await legacy(page, 'review').click(); await legacy(page, 'apply').click();
    await chooseSession(page, 'review');
    await expect(field(page, 'minutesPerSession')).toHaveValue('45');
    await expect(field(page, 'minutesPerSession')).toBeDisabled();
    await legacy(page, 'review').click();
    // Original: 4.5h × ($105 + 3 × $100) = $1,822.50; added: 2h × ($105 + $100) = $410.
    await expect(sessions(page).locator('[data-native-preview-total]')).toHaveText('$2,232.50');
    await legacy(page, 'apply').click(); await expect(total(page)).toHaveText('$2,232.50');
    await chooseSession(page, newId);
    await expect(field(page, 'label')).toHaveValue('Revised planning name');
  });

  test(`${engine}: removal Cancel keeps the plan and confirmed removal leaves room for new work`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const original = await bytes(page);
    await action(page, 'remove').click();
    await expect(legacy(page, 'apply')).toBeEnabled(); assert.equal(await bytes(page), original);
    await legacy(page, 'cancel').click();
    assert.equal(await bytes(page), original);
    await chooseSession(page, 'review');
    await action(page, 'remove').click(); await legacy(page, 'apply').click();
    assert.deepEqual(JSON.parse(await bytes(page)).practices[0].supportBindings[0].workIds, []);
    await expect(total(page)).toHaveText('$0.00');
    await expect(root(page).locator('[data-delivery-session]:visible')).toHaveCount(0);
    await expect(action(page, 'create')).toBeEnabled();
    await prepareSession(page); await legacy(page, 'apply').click();
    await expect(total(page)).toHaveText('$400.00');
    await expect(field(page, 'label')).toBeEditable();
    assert.equal(await page.evaluate(() => window.sessionFixture.studio.read().state.work.length), 1);
  });

  test(`${engine}: complete session settings retain compact controls, stable feedback and About scrolling`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true);
    await prepareSession(page);
    await expect(action(page, 'create')).toHaveClass(/native-control--create/);
    await expect(legacy(page, 'apply')).not.toHaveClass(/native-control--create/);
    await page.setViewportSize({ width: 1259, height: 1289 });
    const members = sessions(page).locator('.native-session__members');
    const memberGeometry = await members.locator('label').evaluateAll(labels => labels.map(label => {
      const toggle = label.querySelector('input').getBoundingClientRect(), words = label.querySelector('span').getBoundingClientRect();
      return { toggle: toggle.width, words: words.width, label: label.getBoundingClientRect().width };
    }));
    assert.ok(memberGeometry.every(row => row.toggle < row.label * .25 && row.words > row.label * .6), 'Membership switches leave most of each card width for its role and rate.');
    await members.screenshot({ path: resolve(captures, `${engine}-participants-1259.png`) });
    await root(page).locator('[data-rack-editor-kind="session"]').screenshot({ path: resolve(captures, `${engine}-wide.png`) });
    const time = form(page).locator('.native-time-controls');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await time.evaluate(node => {
        const box = element => { const r = element.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width }; };
        const module = node.querySelector('.studio-duration'), output = module.querySelector('output');
        const parts = [...module.querySelectorAll('.native-time__part')].map(group => ({ ...box(group),
          dial:box(group.querySelector('.native-knob')), field:box(group.querySelector('.native-coordination__stepper')),
          background:getComputedStyle(group).backgroundColor }));
        return { module:box(module), output:box(output), parts, border:parseFloat(getComputedStyle(module).borderTopWidth),
          outputFont:parseFloat(getComputedStyle(output.querySelector('strong')).fontSize),
          fieldFont:parseFloat(getComputedStyle(module.querySelector('.native-coordination__stepper input')).fontSize),
          separateCount:!module.contains(node.querySelector('.native-coordination__control--count')),
          outputFor:output.htmlFor.value, fieldIds:[...module.querySelectorAll('.native-coordination__stepper input')].map(input => input.id) };
      });
      await time.screenshot({ path: resolve(captures, `${engine}-duration-module-${width}.png`) });
      assert.equal(geometry.parts.length, 2);
      assert.ok(geometry.border > 0 && geometry.outputFont > geometry.fieldFont, 'the shared housing gives the combined duration a larger reading');
      assert.ok(geometry.separateCount, 'repetition keeps its separate meaning beside the duration module');
      assert.deepEqual(geometry.outputFor.split(' '), geometry.fieldIds);
      assert.ok(geometry.parts.every(part => geometry.output.bottom <= part.top && part.left >= geometry.module.left
        && part.right <= geometry.module.right && part.bottom <= geometry.module.bottom), 'readout and both unit controls share one bounded enclosure');
      assert.ok(geometry.parts.every(part => part.field.top > part.dial.top && (width === 1440
        ? part.field.left >= part.dial.right - 1
        : Math.abs((part.field.left + part.field.right) - (part.dial.left + part.dial.right)) < 2)),
        `exact fields sit beside their dials on laptop and centered below them on mobile: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.parts[0].dial.width >= geometry.parts[1].dial.width, 'Hours retains equal or greater visual weight than Minutes');
      assert.notEqual(geometry.parts[0].background, geometry.parts[1].background);
      if (width === 1440) assert.ok(Math.abs(geometry.parts[0].top-geometry.parts[1].top) < 1, 'Hours and Minutes sit side by side');
      assert.ok(geometry.module.left >= 0 && geometry.module.right <= width, 'the duration housing stays inside the phone/laptop viewport');
    }
    for (const [width, enlarged] of [[1440, true], [768, false], [390, false]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(enlarged => { document.documentElement.style.fontSize = enlarged ? '200%' : ''; }, enlarged);
      await field(page, 'hoursPerSession').scrollIntoViewIfNeeded(); await frames(page);
      const geometry = await form(page).locator('input[inputmode]').evaluateAll(inputs => inputs.map(input => {
        const box = input.getBoundingClientRect(), css = getComputedStyle(input);
        const context = document.createElement('canvas').getContext('2d');
        context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        return { left: box.left, right: box.right, width: document.documentElement.clientWidth,
          content: box.width - parseFloat(css.borderLeftWidth) - parseFloat(css.borderRightWidth)
            - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight), digits: context.measureText(input.value.padStart(2, '0')).width };
      }));
      assert.equal(geometry.length, 3);
      assert.ok(geometry.every(box => box.left >= -.5 && box.right <= box.width + .5 && box.content >= box.digits),
        `Duration and the current session count stay in the ${width}px viewport: ${JSON.stringify(geometry)}`);
      const containment = await sessions(page).evaluate(element => {
        const chapter = element.querySelector('[data-native-chapter-panel="coordination"]').getBoundingClientRect();
        const remote = element.querySelector('[data-native-configure]');
        return [remote, remote.querySelector('form'), ...remote.querySelectorAll('input, select, button, textarea')]
          .filter(control => control.getClientRects().length > 0)
          .map(control => {
            const box = control.getBoundingClientRect();
            return { label: control.name || control.dataset.action || control.tagName,
              left: box.left, right: box.right, chapterLeft: chapter.left, chapterRight: chapter.right };
          });
      });
      assert.ok(containment.every(box => box.left >= box.chapterLeft - .5 && box.right <= box.chapterRight + .5),
        `Remote, form and controls stay in their chapter at ${width}px/${enlarged ? '200' : '100'}%: ${JSON.stringify(containment)}`);
      const before = await field(page, 'occurrences').evaluate(input => input.getBoundingClientRect().top + scrollY);
      await field(page, 'minutesPerSession').fill('-1'); await frames(page);
      await expect(field(page, 'minutesPerSession')).toHaveAttribute('aria-invalid', 'true');
      assert.ok(Math.abs(await field(page, 'occurrences').evaluate(input => input.getBoundingClientRect().top + scrollY) - before) < 1);
      await field(page, 'minutesPerSession').fill('0');
    }
    const increment = form(page).locator('[data-field="hoursPerSession"][data-step="1"]');
    await increment.focus(); await page.keyboard.press('Enter');
    await expect(field(page, 'hoursPerSession')).toHaveValue('2');
    const inputBox = await field(page, 'hoursPerSession').boundingBox(), buttonBox = await increment.boundingBox();
    assert.ok(buttonBox.y >= inputBox.y + inputBox.height - 1);
    await root(page).locator('[data-rack-editor-kind="session"]').screenshot({ path: resolve(captures, `${engine}-narrow.png`) });
    await field(page, 'label').scrollIntoViewIfNeeded();
    const box = await field(page, 'label').boundingBox(), before = await page.evaluate(() => scrollY);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
  });
}

for (const engine of names) {
  test(`${engine}: session receiver retirement preserves saved text and respects a successor editor's focus`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const observations = await page.evaluate(async () => {
      const { mountWorkPanel } = await import('/collaboration/native-investment-studio/work-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.sessionFixture.controller.dispose();
      const element = document.querySelector('[data-native-session-editor]');
      const studio = createStudio(), accepted = studio.read();
      let receiver, armed = false, callbacks = 0;
      const facade = { ...studio, previewWork(...args) {
        const result = studio.previewWork(...args);
        if (armed) { armed = false; receiver.dispose(); }
        return result;
      } };
      const editing = createDraftCoordinator(facade);
      receiver = mountWorkPanel(element, { studio: facade, editing, onEditing() { callbacks += 1; } });
      callbacks = 0; armed = true;
      const input = element.querySelector('[name="label"]');
      input.value = 'Retained during preview'; input.dispatchEvent(new Event('input', { bubbles: true }));
      // Retirement can release its exact lease after the synchronous coordinator
      // operation settles; the observer waits for that microtask boundary.
      await Promise.resolve();
      const retired = { callbacks, ready: element.hasAttribute('data-session-ready'),
        active: editing.read().active?.kind ?? null, disabled: element.querySelector('fieldset').disabled,
        preservedAccepted: studio.read() === accepted,
        retainedRaw: editing.read().parked.find(row => row.kind === 'session')?.raw.label ?? null };
      editing.dispose();

      const nextStudio = createStudio(), nextEditing = createDraftCoordinator(nextStudio);
      const successorControl = document.createElement('button'); successorControl.textContent = 'Successor editor';
      document.body.append(successorControl);
      let completed = false, switched = false;
      const next = mountWorkPanel(element, { studio: nextStudio, editing: nextEditing,
        onAccepted() { completed = true; }, onEditing() {
          if (!completed) return;
          completed = false;
          switched = nextEditing.person.begin('product-one', nextStudio.read()).ok;
          successorControl.focus();
        } });
      next.select('review');
      const minutes = element.querySelector('[name="minutesPerSession"]');
      minutes.value = '45'; minutes.dispatchEvent(new Event('input', { bubbles: true }));
      element.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      const successor = { switched, active: nextEditing.read().active?.kind ?? null,
        retainedSuccessorFocus: document.activeElement === successorControl,
        sessionStatus: nextEditing.session.read().status, total: nextStudio.read().result.knownCommitmentCents };
      next.dispose(); nextEditing.dispose(); successorControl.remove();
      return { retired, successor };
    });
    assert.deepEqual(observations.retired, { callbacks: 0, ready: false, active: null, disabled: true,
      preservedAccepted: true, retainedRaw: 'Retained during preview' });
    assert.deepEqual(observations.successor, { switched: true, active: 'person', retainedSuccessorFocus: true,
      sessionStatus: 'idle', total: 180000 });
  });
}
