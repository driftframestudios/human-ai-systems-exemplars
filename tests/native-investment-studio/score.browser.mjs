import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';
const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-score');
let server, fixture, complete;
registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  fixture = createNativeAboutFixture(source);
  complete = source.replace('data="../img/plot/about_prompt_conditions_cartography.svg"', 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});
const root = page => page.locator('[data-native-coordination]');
const score = page => root(page).locator('[data-native-score]');
const input = (page, key) => score(page).locator(`input[data-cadence-field="${key}"],select[data-cadence-field="${key}"],textarea[data-cadence-field="${key}"]`);
async function open(t, engine, options = {}) {
  const { full = false, ...contextOptions } = options;
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...contextOptions });
  const page = await context.newPage(), telemetry = monitor(page);
  t.after(async () => { try { assertTelemetry(telemetry); } finally { await context.close(); } });
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
    const element = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(element).dispose();
    const studio = createStudio(createShowcasePlan()); window.scoreFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
  });
  return page;
}
const bytes = page => page.evaluate(() => window.scoreFixture.studio.exportText());

const cadence = page => score(page).locator('[data-score-projection]');
const period = (page, id) => cadence(page).locator(`[data-cadence-period="${id}"]`);
const flow = page => score(page).locator('[data-cadence-disclosure="flow"]');
const inspector = page => score(page).locator('.native-score__inspector');
async function showFlow(page) {
  if (!await flow(page).evaluate(element => element.open)) await flow(page).locator(':scope > summary').click();
}
async function undo(page) {
  await root(page).locator('[data-studio-undo]').click();
}

for (const engine of names) {
  test(`${engine}: sprint overview drills into weeks without changing the accepted plan`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    await expect(cadence(page).locator('.native-cadence__board')).toHaveAttribute('data-cadence-level', 'plan');
    await expect(cadence(page).locator('.native-cadence__period')).toHaveCount(4);
    for (const key of ['flow', 'people'])
      assert.equal(await score(page).locator(`[data-cadence-disclosure="${key}"]`).evaluate(element => element.open), false);
    for (const width of [1273, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await score(page).scrollIntoViewIfNeeded();
      const bounds = await score(page).evaluate(element => ({ width: innerWidth, page: document.documentElement.scrollWidth,
        left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }));
      assert.ok(bounds.page <= width + 1 && bounds.left >= 0 && bounds.right <= width + 1, JSON.stringify(bounds));
      await score(page).screenshot({ path: resolve(captures, `${engine}-cadence-${width}.png`) });
    }
    await period(page, 'period-2').getByRole('button', { name: 'Sprint 2 Open sprint detail', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(cadence(page).locator('.native-cadence__board')).toHaveAttribute('data-cadence-level', 'period');
    await expect(cadence(page).getByRole('heading', { name: 'Week 1', exact: true })).toBeVisible();
    await expect(cadence(page).getByRole('heading', { name: 'Week 2', exact: true })).toBeVisible();
    await expect(cadence(page).locator('.native-cadence__clip')).toHaveCount(2);
    const clip = cadence(page).locator('.native-cadence__clip').first(); await clip.focus();
    await expect(cadence(page).locator('[data-cadence-preview-reading]')).toContainText('Needs Research synthesis');
    await expect(cadence(page).locator('[data-cadence-preview-reading]')).toContainText('per person');
    await cadence(page).getByRole('button', { name: 'Plan overview', exact: true }).click();
    assert.equal(await bytes(page), accepted, 'period navigation preserves accepted bytes');
    const tracks = cadence(page).locator('.native-cadence__track-table');
    await expect(tracks).toBeVisible();
    await expect(tracks.locator('.native-cadence__pad')).toHaveCount(12);
    await expect(cadence(page).locator('[data-cadence-disclosure="agenda"]')).toHaveCount(0);
    assert.equal(await bytes(page), accepted);
  });

  test(`${engine}: a quarter adds an accepted session whose settings open on selection`, async t => {
    const page = await open(t, engine);
    await score(page).locator('[data-cadence-basis][value="quarter"]').check();
    const accepted = await bytes(page), before = JSON.parse(accepted);
    await period(page, 'period-2').getByRole('button', { name: /^Add a session in /u }).click();
    const deck = root(page).locator('[data-rack-editor-kind]');
    await expect(deck).toBeHidden();
    const state = JSON.parse(await bytes(page));
    const work = state.work.find(row => !before.work.some(previous => previous.id === row.id));
    assert.ok(work); assert.equal(work.minutesPerOccurrence, 30);
    assert.deepEqual(state.scoreSettings.cadence.placements.find(row => row.workId === work.id),
      { workId: work.id, occurrenceIndex: 0, periodId: 'period-2', subdivision: 1 });
    assert.equal(work.label, 'New session 1');
    await period(page, 'period-2').locator(`[data-studio-session-id="${work.id}"]`).click();
    await expect(deck.locator('[name="label"]')).toHaveValue(work.label);
    await root(page).locator('[data-rack-creation-undo]').click();
    assert.equal(await bytes(page), accepted);
    await expect(deck).toBeHidden();
  });

  for (const basis of ['sprint', 'quarter']) test(`${engine}: session tracks append sessions across ${basis}s and Undo preserves earlier placements`, async t => {
    const page = await open(t, engine, { viewport: { width: 390, height: 1000 } });
    if (basis === 'quarter') await score(page).locator('[data-cadence-basis][value="quarter"]').check();
    const original = await bytes(page), before = JSON.parse(original);
    const work = before.work.find(row => row.label === 'Research synthesis');
    await cadence(page).locator(`[data-studio-plan-id="${work.id}"]`).click();
    const originalPlacements = before.scoreSettings.cadence.placements.filter(row => row.workId === work.id);
    await cadence(page).locator(`[data-cadence-key="add-occurrence:${work.id}:period-2:1"]`).click();
    const first = await bytes(page), firstState = JSON.parse(first);
    assert.equal(firstState.work.length, before.work.length, 'adding a session retains the cassette identities');
    assert.equal(firstState.work.find(row => row.id === work.id).occurrences, work.occurrences + 1);
    assert.deepEqual(firstState.scoreSettings.cadence.placements.filter(row => row.workId === work.id), [
      ...originalPlacements, { workId: work.id, occurrenceIndex: work.occurrences, periodId: 'period-2', subdivision: 1 },
    ]);
    await cadence(page).locator('[data-cadence-key="track-period:period-3"]').click();
    const add = cadence(page).locator(`[data-cadence-key="add-occurrence:${work.id}:period-3:2"]`);
    await expect(add).toBeVisible();
    await add.click();
    const second = JSON.parse(await bytes(page));
    assert.equal(second.work.find(row => row.id === work.id).occurrences, work.occurrences + 2);
    assert.deepEqual(second.scoreSettings.cadence.placements.filter(row => row.workId === work.id), [
      ...originalPlacements,
      { workId: work.id, occurrenceIndex: work.occurrences, periodId: 'period-2', subdivision: 1 },
      { workId: work.id, occurrenceIndex: work.occurrences + 1, periodId: 'period-3', subdivision: 2 },
    ]);
    assert.deepEqual(second.work.filter(row => row.id !== work.id), before.work.filter(row => row.id !== work.id));
    await expect(cadence(page).locator(`[data-cadence-key="pad:${work.id}:${work.occurrences + 1}"]`)).toBeVisible();
    await undo(page); assert.equal(await bytes(page), first);
    await undo(page); assert.equal(await bytes(page), original);
  });

  test(`${engine}: repeated period additions keep every new plan in its original sprint and in view`, async t => {
    const page = await open(t, engine), original = JSON.parse(await bytes(page));
    const added = [];
    for (const periodId of ['period-4', 'period-4', 'period-2']) {
      await period(page, periodId).getByRole('button', { name: /^Add a session in /u }).click();
      const state = JSON.parse(await bytes(page));
      const created = state.work.filter(row => !original.work.some(previous => previous.id === row.id));
      assert.equal(created.length, added.length + 1, 'each creation adds a distinct record');
      const newest = created.find(row => !added.some(previous => previous.id === row.id));
      added.push({ id: newest.id, periodId });
      for (const item of added) assert.deepEqual(state.scoreSettings.cadence.placements.filter(row => row.workId === item.id), [
        { workId: item.id, occurrenceIndex: 0, periodId: item.periodId, subdivision: 1 },
      ], 'later creation retains the earlier placement');
    }
    for (const { id, periodId } of added)
      await expect(period(page, periodId).locator(`[data-studio-session-id="${id}"]`)).toBeVisible();
    await undo(page);
    const restored = JSON.parse(await bytes(page));
    assert.equal(restored.work.length, original.work.length + 2);
    for (const { id } of added.slice(0, 2))
      await expect(period(page, 'period-4').locator(`[data-studio-session-id="${id}"]`)).toBeVisible();
  });

  for (const { width, basis, origin } of [
    { width: 1273, basis: 'sprint', origin: 'period' },
    { width: 390, basis: 'sprint', origin: 'track-period' },
    { width: 1273, basis: 'quarter', origin: 'track-period' },
    { width: 390, basis: 'quarter', origin: 'period' },
  ]) test(`${engine}: ${basis} scope stays in the rack and returns to its ${origin} at ${width}px`, async t => {
    const page = await open(t, engine, { viewport: { width, height: 1000 } });
    if (basis === 'quarter') await score(page).locator('[data-cadence-basis][value="quarter"]').check();
    while (await cadence(page).locator('.native-cadence__period').count() < 5)
      await cadence(page).getByRole('button', { name: basis === 'quarter' ? 'Add quarter' : 'Add sprint', exact:true }).click();
    const accepted = await bytes(page);
    const entry = cadence(page).locator(`[data-cadence-key="${origin}:period-4"]`);
    await entry.focus();
    const positions = () => cadence(page).evaluate(element => ['board', 'tracks'].map(name => element.querySelector(`.native-cadence__${name}`).scrollLeft));
    const before = await positions();
    await page.keyboard.press('Enter');
    const rack = cadence(page).locator('.native-cadence__screen');
    const nav = rack.getByRole('navigation', { name: 'Plan scope' });
    const back = nav.getByRole('button', { name: 'Plan overview', exact: true });
    const current = nav.getByRole('heading', { name: `${basis === 'sprint' ? 'Sprint' : 'Quarter'} 4`, exact: true });
    await expect(back).toBeFocused(); await expect(current).toHaveAttribute('aria-current', 'page');
    const bounds = await nav.boundingBox(); const rackBounds = await rack.boundingBox();
    assert.ok(bounds.x >= rackBounds.x && bounds.x + bounds.width <= rackBounds.x + rackBounds.width + 1);
    const primary = await page.locator('.nav__top--sticky').boundingBox();
    assert.ok(bounds.y >= primary.y + primary.height && bounds.y + bounds.height <= 1000, 'scope and return stay clear of the About navigation');
    for (const name of ['board', 'tracks']) await rack.locator(`.native-cadence__${name}`).evaluate(element => { element.scrollLeft = element.scrollWidth; });
    assert.deepEqual(await nav.boundingBox(), bounds, 'rack scope stays outside the scrolling lanes and tracks');
    await page.screenshot({ path: resolve(captures, `${engine}-scope-${basis}-${width}.png`) });
    await page.keyboard.press('Enter');
    await expect(entry).toBeFocused();
    const after = await positions();
    before.forEach((value, index) => assert.ok(Math.abs(after[index] - value) <= 1, `${origin} scroll ${index}: ${value} → ${after[index]}`));
    await expect(cadence(page).locator('.native-cadence__period')).toHaveCount(5);
    await expect(cadence(page)).toHaveAttribute('data-cadence-reading', 'accepted');
    assert.equal(await bytes(page), accepted, 'scope changes retain the accepted horizon');
  });

  test(`${engine}: period captions retain period identity, work and Undo`, async t => {
    const page = await open(t, engine), original = JSON.parse(await bytes(page));
    const lane = period(page, 'period-4'), editor = lane.locator('.native-cadence__period-label');
    await editor.getByRole('button', { name:'Edit Sprint 4 caption' }).click();
    await editor.getByRole('button', { name:'Save label' }).click();
    assert.deepEqual(JSON.parse(await bytes(page)), original, 'an unchanged stage summary stays derived');
    await editor.getByRole('button', { name:'Edit Sprint 4 caption' }).click();
    await editor.getByRole('textbox', { name:'Period caption' }).fill('Prepare the receiving teams');
    await editor.getByRole('button', { name:'Save label' }).click();
    const changed = JSON.parse(await bytes(page));
    assert.deepEqual(changed.scoreSettings.cadence.periods.at(-1),
      { id:'period-4', label:'Sprint 4', caption:'Prepare the receiving teams' });
    assert.deepEqual(changed.work, original.work);
    assert.deepEqual(changed.scoreSettings.cadence.placements, original.scoreSettings.cadence.placements);
    await expect(lane.locator('.native-cadence__stage-labels')).toHaveText('Prepare the receiving teams');
    await expect(lane.getByRole('button', { name:'Sprint 4 Open sprint detail', exact:true })).toBeVisible();
    await undo(page);
    await expect(lane.locator('.native-cadence__stage-labels')).toHaveText('Build and rehearse · Review the evidence');
  });

  for (const width of [390, 1440]) test(`${engine}: period caption edit stays compact beside its saved text on the full About page at ${width}px`, async t => {
    const page = await open(t, engine, { full:true, viewport:{ width, height:1000 } });
    const original = JSON.parse(await bytes(page));
    await cadence(page).locator('[data-studio-plan-id="review"]').click();
    await cadence(page).locator('[data-cadence-key="track-work:review"]').click();
    const session = root(page).locator('[data-native-configure]');
    await session.locator('[name="label"]').fill('Review title still being prepared');
    const lane = period(page, 'period-4'), editor = lane.locator('.native-cadence__period-label');
    const edit = editor.getByRole('button', { name:'Edit Sprint 4 caption' });
    await edit.click();
    const caption = editor.getByRole('textbox', { name:'Period caption' });
    await expect(caption).toHaveValue('Build and rehearse · Review the evidence');
    await caption.fill('Prepare the receiving teams');
    await caption.press('Enter');
    await expect(editor.locator('.native-cadence__stage-labels')).toHaveText('Prepare the receiving teams');
    await expect(edit).toBeFocused();
    await expect(edit).toHaveAttribute('aria-expanded', 'false');
    await expect(editor.locator('form')).toBeHidden();
    await expect(cadence(page).locator('[data-studio-plan-id="review"]')).toHaveAttribute('aria-pressed', 'true');
    const accepted = JSON.parse(await bytes(page));
    assert.deepEqual(accepted.work, original.work, 'saving a caption leaves the unfinished session edit parked');
    assert.equal(await page.evaluate(async () => {
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      return createDraftCoordinator(window.scoreFixture.studio).read().parked.find(record => record.kind === 'session')?.raw.label;
    }), 'Review title still being prepared');
    const shape = await editor.evaluate(node => {
      const button = node.querySelector('.native-cadence__caption-edit'), reading = node.querySelector('.native-cadence__caption');
      const box = button.getBoundingClientRect();
      return { width:box.width, height:box.height, decoration:getComputedStyle(button).textDecorationLine,
        sameRow:reading.contains(button) && reading.contains(node.querySelector('.native-cadence__stage-labels')),
        pageWidth:document.documentElement.scrollWidth };
    });
    assert.ok(shape.width < 70 && shape.height < 36, JSON.stringify(shape));
    assert.equal(shape.decoration, 'underline'); assert.equal(shape.sameRow, true);
    assert.ok(shape.pageWidth <= width + 1, JSON.stringify(shape));
    await lane.screenshot({ path:resolve(captures, `${engine}-period-caption-${width}.png`) });
    await undo(page);
    await expect(lane.locator('.native-cadence__stage-labels')).toHaveText('Build and rehearse · Review the evidence');
    assert.deepEqual(JSON.parse(await bytes(page)).scoreSettings.cadence.periods, original.scoreSettings.cadence.periods);
  });

  test(`${engine}: period caption keeps typed text after an interrupted save and retries with Undo`, async t => {
    const page = await open(t, engine, { full:true });
    await page.evaluate(async () => {
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      const accepted = window.scoreFixture.studio; window.scoreFixture.controller.dispose();
      let interrupt = true;
      const studio = { ...accepted, replace(...args) {
        if (interrupt) { interrupt = false; return { ok:false, error:{ code:'stale', message:'The plan changed. Try saving this caption again.' } }; }
        return accepted.replace(...args);
      } };
      window.scoreFixture = { studio, controller:mountCoordinationPanel(document.querySelector('[data-native-coordination]'), { studio }) };
    });
    const original = await bytes(page), editor = period(page, 'period-4').locator('.native-cadence__period-label');
    const edit = editor.getByRole('button', { name:'Edit Sprint 4 caption' });
    await edit.focus(); await edit.press('Enter');
    const caption = editor.getByRole('textbox', { name:'Period caption' });
    await caption.fill('Keep the receiving team ready');
    await editor.getByRole('button', { name:'Save label' }).click();
    assert.equal(await bytes(page), original);
    await expect(caption).toHaveValue('Keep the receiving team ready');
    await expect(caption).toBeFocused();
    await expect(edit).toHaveAttribute('aria-expanded', 'true');
    await expect(editor.getByRole('alert')).toHaveText('The plan changed. Try saving this caption again.');
    await caption.press('Enter');
    await expect(editor.locator('.native-cadence__stage-labels')).toHaveText('Keep the receiving team ready');
    await expect(edit).toBeFocused();
    await undo(page); assert.equal(await bytes(page), original);
  });

  test(`${engine}: an in-board period addition is accepted immediately and Undo restores it`, async t => {
    const page = await open(t, engine), accepted = await bytes(page), original = JSON.parse(accepted);
    const board = cadence(page).locator('.native-cadence__board');
    await board.getByRole('button', { name:'Add sprint', exact:true }).click();
    const changed = JSON.parse(await bytes(page));
    assert.equal(changed.scoreSettings.cadence.periods.length, 5);
    assert.deepEqual(changed.work, original.work);
    await expect(score(page).locator('.native-score__pending')).toBeHidden();
    await period(page, 'period-5').getByRole('button', { name:/^Add a session in /u }).click();
    const created = JSON.parse(await bytes(page));
    assert.equal(created.work.length, original.work.length + 1, 'the new sprint immediately accepts working sessions');
    await undo(page); await undo(page);
    assert.equal(await bytes(page), accepted);
  });

  test(`${engine}: horizon units switch immediately while preserving work and Undo`, async t => {
    const page = await open(t, engine), accepted = await bytes(page), original = JSON.parse(accepted);
    await score(page).locator('[data-cadence-basis][value="quarter"]').check();
    await expect(cadence(page)).toHaveAttribute('data-cadence-reading', 'accepted');
    const changed = JSON.parse(await bytes(page));
    assert.equal(changed.scoreSettings.cadence.basis, 'quarter');
    assert.deepEqual(changed.work, original.work);
    await expect(score(page).locator('.native-score__pending')).toBeHidden();
    await period(page, 'period-1').getByRole('button', { name: 'Quarter 1 Open quarter detail', exact: true }).click();
    await expect(cadence(page).getByRole('heading', { name: 'Month 3', exact: true })).toBeVisible();
    await undo(page); assert.equal(await bytes(page), accepted);
  });

  test(`${engine}: decisions and delays are created beside a stage or handoff`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    await showFlow(page);
    const stage = flow(page).locator('[data-cadence-key="stage:understand"]');
    await stage.click();
    await expect(cadence(page).locator('[data-studio-session-slot] > .native-score__inspector')).toBeVisible();
    const topApply = inspector(page).locator('[data-editor-apply]');
    await expect(topApply).toHaveCount(1); await expect(topApply).toBeDisabled();
    await input(page, 'stage.understand.label').fill('Understand the service request');
    await expect(topApply).toBeEnabled();
    await inspector(page).getByRole('button', { name: 'Close', exact: true }).click();
    await expect(inspector(page)).toBeHidden();
    await expect(stage).toBeFocused();
    await stage.click();
    await expect(input(page, 'stage.understand.label')).toHaveValue('Understand the service request');
    await expect(topApply).toHaveCount(1);
    await inspector(page).getByRole('button', { name: 'Cancel changes', exact: true }).click();
    await expect(stage).toBeFocused();
    await flow(page).getByRole('button', { name: 'Add a decision for Understand the request', exact: true }).click();
    await expect(inspector(page)).toBeHidden();
    const decisionState = JSON.parse(await bytes(page));
    assert.equal(decisionState.scoreSettings.gates.find(row => row.id === 'gate-1').label, 'New decision 1');
    assert.deepEqual(decisionState.scoreSettings.cadence.decisionAnchors.find(row => row.gateId === 'gate-1'),
      { gateId:'gate-1', kind:'stage', id:'understand' });
    await cadence(page).locator('[data-cadence-key^="decision:gate-1:"]').first().click();
    await expect(input(page, 'gate.gate-1.label')).toHaveValue('New decision 1');
    await input(page, 'gate.gate-1.label').fill('Agree the request');
    await input(page, 'gate.gate-1.reviewerPersonId').selectOption('maya');
    await topApply.click();
    const state = JSON.parse(await bytes(page));
    assert.equal(state.scoreSettings.gates.find(row => row.id === 'gate-1').label, 'Agree the request');
    const afterDecision = await bytes(page);
    await showFlow(page);
    await flow(page).getByRole('button', { name: 'Add a delay to the handoff from Research synthesis to Prototype pairing', exact:true }).click();
    await expect(inspector(page)).toBeHidden();
    const delayState = JSON.parse(await bytes(page));
    assert.equal(delayState.scoreSettings.cadence.delays.at(-1).label, 'New delay 1');
    await cadence(page).locator('[data-cadence-key="delay:delay-1"]').click();
    await expect(input(page, 'delays.delay-1.anchor')).toHaveValue('handoff:research-before-pairing');
    await input(page, 'delays.delay-1.reason').fill('The receiving team needs time to review the research.');
    await inspector(page).getByRole('button', { name:'Cancel changes', exact:true }).click();
    assert.deepEqual(JSON.parse(await bytes(page)), delayState, 'Cancel retains the accepted addition');
    await undo(page); assert.equal(await bytes(page), afterDecision);
    await period(page, 'period-1').getByRole('button', { name:'Sprint 1 Open sprint detail', exact:true }).click();
    await showFlow(page);
    await flow(page).getByRole('button', { name:'Add stage', exact:true }).click();
    await expect(inspector(page)).toBeHidden();
    const addedStage = JSON.parse(await bytes(page)).scoreSettings.stages.at(-1);
    assert.equal(addedStage.label, 'New stage 1');
    await showFlow(page);
    await flow(page).locator(`[data-cadence-key="stage:${addedStage.id}"]`).click();
    await expect(input(page, `stage.${addedStage.id}.label`)).toHaveValue('New stage 1');
    await inspector(page).getByRole('button', { name:'Close', exact:true }).click();
    await flow(page).getByRole('button', { name:'Connect work', exact:true }).click();
    await expect(inspector(page)).toBeHidden();
    const addedHandoff = JSON.parse(await bytes(page)).scoreSettings.cadence.handoffs.at(-1);
    await flow(page).locator(`[data-cadence-key="handoff:${addedHandoff.id}"]`).click();
    await expect(inspector(page)).toBeVisible();
  });

  test(`${engine}: a quarter example replaces the view in place and Undo restores the pilot`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    await score(page).getByRole('button', { name: 'Add sprint', exact: true }).click();
    await expect(cadence(page).locator('.native-cadence__period')).toHaveCount(5);
    const extended = await bytes(page);
    await score(page).getByRole('button', { name: 'Two-quarter rollout', exact: true }).click();
    await expect(root(page).locator('[data-native-chapter="coordination"]')).toHaveAttribute('aria-selected', 'true');
    await expect(cadence(page).locator('.native-cadence__period')).toHaveCount(2);
    const state = JSON.parse(await bytes(page));
    await expect(cadence(page).locator('.native-cadence__period')).toHaveCount(2);
    await expect(score(page).locator('[data-cadence-basis][value="quarter"]')).toBeChecked();
    assert.equal(state.planId, 'service-request-rollout'); assert.equal(state.scoreSettings.cadence.basis, 'quarter');
    await period(page, 'period-2').getByRole('button', { name: 'Quarter 2 Open quarter detail', exact: true }).click();
    for (const month of [1, 2, 3]) await expect(cadence(page).getByRole('heading', { name: `Month ${month}`, exact: true })).toBeVisible();
    await expect(cadence(page)).toContainText('Receiving-team walkthrough');
    await undo(page); assert.equal(await bytes(page), extended);
    await undo(page); assert.equal(await bytes(page), accepted);
  });

  test(`${engine}: an arrangement draft retains its entries when a session changes elsewhere`, async t => {
    const page = await open(t, engine);
    await showFlow(page);
    await flow(page).locator('[data-cadence-key="stage:understand"]').click();
    await input(page, 'stage.understand.label').fill('Understand the receiving team’s request');
    await page.evaluate(() => {
      const { studio, controller } = window.scoreFixture, before = studio.read();
      const work = before.state.work.find(row => row.id === 'review');
      const result = studio.updateWork(work.id, { ...work, minutesPerOccurrence: 45 }, before);
      if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    await expect(score(page)).toHaveAttribute('data-score-state', 'stale');
    await expect(input(page, 'stage.understand.label')).toBeDisabled();
    const topApply = inspector(page).locator('[data-editor-apply]'); await expect(topApply).toBeDisabled();
    await inspector(page).getByRole('button', { name: 'Review saved edits', exact: true }).click();
    await expect(input(page, 'stage.understand.label')).toHaveValue('Understand the receiving team’s request');
    await expect(topApply).toBeEnabled(); await topApply.click();
    const state = JSON.parse(await bytes(page));
    assert.equal(state.work.find(row => row.id === 'review').minutesPerOccurrence, 45);
    assert.equal(state.scoreSettings.stages.find(row => row.id === 'understand').label, 'Understand the receiving team’s request');
  });

  test(`${engine}: removing a handoff or its session clears the retained dependency and Undo restores it`, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createExamplePlan } = await import('/collaboration/native-investment-studio/contract.mjs');
      const { createCadence } = await import('/collaboration/native-investment-studio/cadence.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      const plan = createExamplePlan();
      plan.work.push({ ...structuredClone(plan.work[0]), id: 'followup', label: 'Receive the review' });
      plan.scoreSettings.dependencies = [{ id: 'review-handoff', fromWorkId: 'review', toWorkId: 'followup', lagMinutes: 0, connectionId: null }];
      plan.scoreSettings.cadence = createCadence();
      plan.scoreSettings.cadence.handoffs = [{ id: 'review-handoff', from: { kind: 'work', id: 'review' }, to: { kind: 'work', id: 'followup' }, connectionId: null }];
      const element = document.querySelector('[data-native-coordination]'); window.scoreFixture.controller.dispose();
      const studio = createStudio(plan); window.scoreFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
    });
    const accepted = await bytes(page);
    for (const keep of [false, true]) {
      await showFlow(page);
      await flow(page).locator('[data-cadence-key="handoff:review-handoff"]').click();
      await inspector(page).getByRole('button', { name: 'Remove this handoff', exact: true }).click();
      assert.equal(await bytes(page), accepted, 'removal stays proposed until Apply');
      await score(page).locator('.native-score__pending').getByRole('button', { name: keep ? 'Apply horizon' : 'Cancel changes', exact: true }).click();
      if (!keep) assert.equal(await bytes(page), accepted);
    }
    const removed = JSON.parse(await bytes(page));
    assert.deepEqual(removed.scoreSettings.cadence.handoffs, []);
    assert.deepEqual(removed.scoreSettings.dependencies, []);
    assert.equal(await page.evaluate(() => window.scoreFixture.studio.previewCommand({ type: 'work.remove', workId: 'followup' }, window.scoreFixture.studio.read()).ok), true);
    await undo(page); assert.equal(await bytes(page), accepted);
    for (const hasCadence of [true, false]) {
      await page.evaluate(withCadence => {
        const { studio, controller } = window.scoreFixture, candidate = structuredClone(studio.read().state);
        if (withCadence) candidate.scoreSettings.cadence.handoffs = [];
        else candidate.scoreSettings.cadence = null;
        const result = studio.replace(candidate, studio.read()); if (!result.ok) throw Error(result.error.code); controller.refresh();
      }, hasCadence);
      const retained = await bytes(page);
      await root(page).locator(hasCadence ? '[data-cadence-key="track-work:followup"]' : '[data-delivery-session="followup"]').click();
      await root(page).locator('[data-rack-remove-plan]').click();
      await expect(root(page).locator('[data-native-session-dependencies]')).toBeHidden();
      assert.equal(await bytes(page), retained, 'confirmation preserves the relationship with or without a cadence');
      await root(page).locator('[data-native-configure] [data-action="apply"]').click();
      const removedSession = JSON.parse(await bytes(page));
      assert.equal(removedSession.work.some(row => row.id === 'followup'), false);
      assert.deepEqual(removedSession.scoreSettings.dependencies, []);
      await undo(page); assert.equal(await bytes(page), retained);
    }
  });

  test(`${engine}: a newer Purpose editor retains its lease and focus through score callbacks`, async t => {
    const page = await open(t, engine);
    const observed = await page.evaluate(async () => {
      const { mountScorePanel } = await import('/collaboration/native-investment-studio/score-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.scoreFixture.controller.dispose();
      const element = document.querySelector('[data-native-score]'), result = [];
      const external = document.createElement('input'); external.name = 'newer-purpose-focus'; document.body.append(external);
      for (const callback of ['onBegin', 'onEditing']) {
        const studio = createStudio(createShowcasePlan()), accepted = studio.read(), editing = createDraftCoordinator(studio);
        let armed = true, successorToken;
        function transfer() {
          if (!armed) return; armed = false;
          editing.purpose.begin('purpose', studio.read()); successorToken = editing.purpose.read().draft.token;
          editing.purpose.setText(successorToken, 'changedAbility', 'The receiving team can recover an interrupted request.'); external.focus();
        }
        const receiver = mountScorePanel(element, { studio, editing, [callback]: transfer }); receiver.open();
        const reading = () => ({ active: editing.read().active?.kind, sameLease: editing.read().active?.token === successorToken,
          raw: editing.purpose.read().draft?.raw.changedAbility, focus: document.activeElement.name, acceptedUnchanged: studio.read() === accepted });
        const beforeDisposal = reading(); receiver.dispose(); result.push({ callback, beforeDisposal, afterDisposal: reading() }); editing.dispose();
      }
      external.remove(); return result;
    });
    const expected = { active: 'purpose', sameLease: true, raw: 'The receiving team can recover an interrupted request.', focus: 'newer-purpose-focus', acceptedUnchanged: true };
    assert.deepEqual(observed, ['onBegin', 'onEditing'].map(callback => ({ callback, beforeDisposal: expected, afterDisposal: expected })));
  });

  test(`${engine}: direct score creation preserves a successor editor's focus`, async t => {
    const page = await open(t, engine);
    const observed = await page.evaluate(async () => {
      const { mountScorePanel } = await import('/collaboration/native-investment-studio/score-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.scoreFixture.controller.dispose();
      const element = document.querySelector('[data-native-score]'), results = [];
      const external = document.createElement('input'); document.body.append(external);
      for (const callback of ['onAccepted', 'onEditing']) {
        const studio = createStudio(createShowcasePlan()), editing = createDraftCoordinator(studio);
        const initialCount = studio.read().state.scoreSettings.stages.length;
        let successor;
        const receiver = mountScorePanel(element, { studio, editing, [callback]() {
          if (successor) return;
          editing.purpose.begin('purpose', studio.read());
          successor = editing.read().active.token; external.focus();
        } });
        const add = element.querySelector('[data-cadence-key="rack-add-stage"]');
        add.focus(); add.click();
        results.push({ callback, added: studio.read().state.scoreSettings.stages.length - initialCount,
          active: editing.read().active.kind, retained: editing.read().active.token === successor,
          focusRetained: document.activeElement === external });
        receiver.dispose(); editing.dispose();
      }
      external.remove(); return results;
    });
    assert.deepEqual(observed, ['onAccepted', 'onEditing'].map(callback =>
      ({ callback, added: 1, active: 'purpose', retained: true, focusRetained: true })));
  });

  test(`${engine}: disposal during preview releases the score lease and owned controls`, async t => {
    const page = await open(t, engine);
    const observed = await page.evaluate(async () => {
      const { mountScorePanel } = await import('/collaboration/native-investment-studio/score-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.scoreFixture.controller.dispose();
      const element = document.querySelector('[data-native-score]'), studio = createStudio(createShowcasePlan()), accepted = studio.read();
      let receiver, armed = false, callbacks = 0;
      const facade = { ...studio, previewCommand(...args) {
        const result = studio.previewCommand(...args); if (armed) { armed = false; receiver.dispose(); } return result;
      } };
      const editing = createDraftCoordinator(facade);
      receiver = mountScorePanel(element, { studio: facade, editing, onEditing() { callbacks++; } });
      armed = true; receiver.open(); await Promise.resolve();
      const result = { active: editing.read().active?.kind ?? null, callbacks,
        controls: element.querySelectorAll('[data-score-form],.native-score__transport,[data-score-projection],.native-score__manual').length,
        acceptedUnchanged: studio.read() === accepted };
      receiver.dispose(); editing.dispose(); return result;
    });
    assert.deepEqual(observed, { active: null, callbacks: 0, controls: 0, acceptedUnchanged: true });
  });
}
