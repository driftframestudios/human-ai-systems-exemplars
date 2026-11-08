import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';
const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-score');
let server, fixture;
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  fixture = createNativeAboutFixture(source);
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => { try { await Promise.all([...browsers.values()].map(browser => browser.close())); } finally { await server?.close(); } });
const root = page => page.locator('[data-native-coordination]');
const score = page => root(page).locator('[data-native-score]');
const input = (page, key) => score(page).locator(`input[data-cadence-field="${key}"],select[data-cadence-field="${key}"],textarea[data-cadence-field="${key}"]`);
async function open(t, engine, options = {}) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage(), telemetry = monitor(page);
  t.after(async () => { try { assertTelemetry(telemetry); } finally { await context.close(); } });
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
  await page.evaluate(() => {
    const { studio, controller } = window.scoreFixture;
    const result = studio.undo(studio.read());
    if (!result.ok) throw Error(result.error.code);
    controller.refresh();
  });
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

  test(`${engine}: a quarter adds an accepted session and opens its in-rack settings`, async t => {
    const page = await open(t, engine);
    await score(page).locator('[data-cadence-basis][value="quarter"]').check();
    const accepted = await bytes(page), before = JSON.parse(accepted);
    await period(page, 'period-2').getByRole('button', { name: 'Add session', exact: true }).click();
    const deck = root(page).locator('.studio-rack-editor');
    await expect(deck).toHaveAttribute('data-rack-placement', 'inset');
    const state = JSON.parse(await bytes(page));
    const work = state.work.find(row => !before.work.some(previous => previous.id === row.id));
    assert.ok(work); assert.equal(work.minutesPerOccurrence, 30);
    assert.deepEqual(state.scoreSettings.cadence.placements.find(row => row.workId === work.id),
      { workId: work.id, occurrenceIndex: 0, periodId: 'period-2', subdivision: 1 });
    await expect(deck.locator('[name="label"]')).toHaveValue(work.label);
    await root(page).locator('[data-rack-creation-undo]').click();
    assert.equal(await bytes(page), accepted);
    await expect(deck).toBeHidden();
  });

  for (const { width, basis, origin } of [
    { width: 1273, basis: 'sprint', origin: 'period' },
    { width: 390, basis: 'sprint', origin: 'track-period' },
    { width: 1273, basis: 'quarter', origin: 'track-period' },
    { width: 390, basis: 'quarter', origin: 'period' },
  ]) test(`${engine}: ${basis} scope stays in the rack and returns to its ${origin} at ${width}px`, async t => {
    const page = await open(t, engine, { viewport: { width, height: 1000 } });
    if (basis === 'quarter') await score(page).locator('[data-cadence-basis][value="quarter"]').check();
    const accepted = await bytes(page), count = score(page).locator('[data-cadence-count]');
    await count.fill('5'); await count.blur();
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
    await expect(count).toHaveValue('5');
    await expect(cadence(page)).toHaveAttribute('data-cadence-reading', 'proposed');
    assert.equal(await bytes(page), accepted, 'scope changes retain the accepted plan and pending horizon');
  });

  test(`${engine}: horizon changes preview before Apply and a shorter plan retains unplaced sessions`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    const count = score(page).locator('[data-cadence-count]');
    await count.fill('2'); await count.blur();
    await expect(cadence(page)).toHaveAttribute('data-cadence-reading', 'proposed');
    await expect(cadence(page).locator('.native-cadence__period')).toHaveCount(2);
    await expect(cadence(page).getByRole('heading', { name: 'Choose a period', exact: true })).toBeVisible();
    assert.equal(await bytes(page), accepted);
    await score(page).locator('.native-score__pending').getByRole('button', { name: 'Cancel changes', exact: true }).click();
    await expect(count).toHaveValue('4'); assert.equal(await bytes(page), accepted);
    await count.fill('3'); await count.blur();
    await score(page).getByRole('button', { name: 'Apply horizon', exact: true }).click();
    const changed = JSON.parse(await bytes(page)), original = JSON.parse(accepted);
    assert.equal(changed.scoreSettings.cadence.periods.length, 3);
    assert.deepEqual(changed.work, original.work, 'shortening the horizon retains work and effort');
    assert.ok(changed.scoreSettings.cadence.placements.some(row => row.periodId === null));
    await expect(root(page).locator('[data-native-total]')).toHaveText('$3,980.00');
    await undo(page); assert.equal(await bytes(page), accepted);
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
    await inspector(page).getByRole('button', { name: 'Cancel changes', exact: true }).click();
    await expect(stage).toBeFocused();
    await flow(page).getByRole('button', { name: 'Add a decision for Understand the request', exact: true }).click();
    await expect(inspector(page).getByRole('heading', { name: 'New decision for Understand the request', exact: true })).toBeVisible();
    await expect(input(page, 'gate.gate-1.label')).toBeFocused();
    await input(page, 'gate.gate-1.label').fill('Agree the request');
    await input(page, 'gate.gate-1.reviewerPersonId').selectOption('maya');
    const confirm = inspector(page).getByRole('button', { name: 'Add decision to plan', exact: true });
    await expect(confirm).not.toHaveClass(/native-control--create/u);
    assert.equal(await bytes(page), accepted);
    await confirm.click();
    const state = JSON.parse(await bytes(page));
    assert.equal(state.scoreSettings.gates.find(row => row.id === 'gate-1').label, 'Agree the request');
    assert.deepEqual(state.scoreSettings.cadence.decisionAnchors.find(row => row.gateId === 'gate-1'),
      { gateId: 'gate-1', kind: 'stage', id: 'understand' });
    const afterDecision = await bytes(page);
    await showFlow(page);
    await flow(page).getByRole('button', { name: 'Add a delay to the handoff from Research synthesis to Prototype pairing', exact: true }).click();
    await expect(inspector(page).getByRole('heading', { name: 'New delay', exact: true })).toBeVisible();
    await expect(input(page, 'delays.delay-1.anchor')).toHaveValue('handoff:research-before-pairing');
    await input(page, 'delays.delay-1.reason').fill('The receiving team needs time to review the research.');
    assert.equal(await bytes(page), afterDecision);
    await inspector(page).getByRole('button', { name: 'Cancel changes', exact: true }).click();
    assert.equal(await bytes(page), afterDecision);
  });

  test(`${engine}: a quarter example replaces the view in place and Undo restores the pilot`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    await score(page).getByRole('button', { name: 'Add sprint', exact: true }).click();
    await expect(score(page).locator('[data-cadence-count]')).toHaveValue('5');
    await score(page).getByRole('button', { name: 'Two-quarter rollout', exact: true }).click();
    await expect(root(page).locator('[data-native-chapter="coordination"]')).toHaveAttribute('aria-selected', 'true');
    await expect(cadence(page).locator('.native-cadence__period')).toHaveCount(2);
    const state = JSON.parse(await bytes(page));
    await expect(score(page).locator('[data-cadence-count]')).toHaveValue('2');
    await expect(score(page).locator('[data-cadence-basis][value="quarter"]')).toBeChecked();
    assert.equal(state.planId, 'service-request-rollout'); assert.equal(state.scoreSettings.cadence.basis, 'quarter');
    await period(page, 'period-2').getByRole('button', { name: 'Quarter 2 Open quarter detail', exact: true }).click();
    for (const month of [1, 2, 3]) await expect(cadence(page).getByRole('heading', { name: `Month ${month}`, exact: true })).toBeVisible();
    await expect(cadence(page)).toContainText('Receiving-team walkthrough');
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
    await inspector(page).getByRole('button', { name: 'Review saved edits', exact: true }).click();
    await expect(input(page, 'stage.understand.label')).toHaveValue('Understand the receiving team’s request');
    await inspector(page).getByRole('button', { name: 'Apply changes', exact: true }).click();
    const state = JSON.parse(await bytes(page));
    assert.equal(state.work.find(row => row.id === 'review').minutesPerOccurrence, 45);
    assert.equal(state.scoreSettings.stages.find(row => row.id === 'understand').label, 'Understand the receiving team’s request');
  });

  test(`${engine}: removing a handoff clears its retained dependency and legacy diagnostics offer recovery`, async t => {
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
      const retained = await bytes(page), workspace = root(page).locator('[data-native-workspace="session"]');
      if (!await workspace.evaluate(element => element.open)) await workspace.locator(':scope > summary').click();
      await root(page).locator('[data-native-session-select]').selectOption('followup');
      await root(page).locator('[data-session-action="remove"]').click();
      await root(page).locator('[data-native-session-dependencies] [data-native-open-score="dependency"]').click();
      await expect(inspector(page).getByRole('heading', { name: 'Inspect retained handoff' })).toBeVisible();
      await expect(inspector(page)).toContainText('Receive the review');
      assert.equal(await bytes(page), retained, 'inspection preserves the retained relationship with or without a cadence');
      await inspector(page).getByRole('button', { name: 'Remove this retained handoff', exact: true }).click();
      await score(page).locator('.native-score__pending').getByRole('button', { name: 'Apply horizon', exact: true }).click();
      assert.equal(await page.evaluate(() => window.scoreFixture.studio.previewCommand({ type: 'work.remove', workId: 'followup' }, window.scoreFixture.studio.read()).ok), true);
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
