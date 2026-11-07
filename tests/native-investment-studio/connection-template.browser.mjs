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
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-connection-templates');
let server, fixture;
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  fixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>', nativeBoot: false });
  assert.equal((fixture.match(/\bdata-connection-templates(?:\s|>)/gu) ?? []).length, 1, 'About supplies one authored team-arrangement carrier.');
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => { try { await Promise.all([...browsers.values()].map(browser => browser.close())); } finally { await server?.close(); } });
const panel = page => page.locator('[data-connection-templates]');
const field = (page, path) => panel(page).locator(`[data-template-field="${path}"]`);
const action = (page, name) => panel(page).locator(`[data-template-action="${name}"]`);
const status = page => panel(page).locator('[data-connection-template-status]');
const bytes = page => page.evaluate(() => window.templateFixture.studio.exportText());
async function card(page, id) {
  const rack = panel(page).locator('.studio-arrangement-settings');
  if (!(await rack.evaluate(node => node.open))) await rack.locator(':scope > summary').click();
  const target = panel(page).locator(`[data-template-card="${id}"]`);
  if (!(await target.evaluate(node => node.open))) await target.locator('summary').click();
}
async function open(t, engine) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), telemetry = monitor(page), pending = new Set();
  page.on('request', request => pending.add(request));
  page.on('requestfinished', request => pending.delete(request)); page.on('requestfailed', request => pending.delete(request));
  t.after(async () => { try { await expect.poll(() => pending.size).toBe(0); assertTelemetry(telemetry); } finally { await context.close(); } });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route) return request.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    return url.origin === server.origin ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' });
  });
  await page.goto(server.origin + route, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createExamplePlan } = await import('/collaboration/native-investment-studio/contract.mjs');
    const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
    const { mountConnectionTemplatePanel } = await import('/collaboration/native-investment-studio/connection-template-controller.mjs');
    const plan = createExamplePlan(); plan.people = [plan.people[0]]; plan.people[0].fundedMinutes = 9600;
    plan.teams[0].personIds = ['product-one']; plan.teams.push({ id: 'receiving', label: 'Receiving', personIds: ['product-one'], lifecycle: 'active' });
    plan.work[0] = { ...plan.work[0], personIds: ['product-one'], minutesPerOccurrence: 240, occurrences: 1, funding: 'allocated' };
    const studio = createStudio(plan), editing = createDraftCoordinator(studio), element = document.querySelector('[data-connection-templates]');
    // The bounded receiver fixture activates its containing native chapter.
    for (let parent = element.parentElement; parent; parent = parent.parentElement) { parent.hidden = false; parent.removeAttribute('inert'); }
    const receiver = { studio, editing, accepted: 0, controller: null, mount: mountConnectionTemplatePanel, element };
    receiver.controller = mountConnectionTemplatePanel(element, { studio, editing, onAccepted() { receiver.accepted += 1; } });
    window.templateFixture = receiver;
  });
  await expect(page.locator('section[data-native-workspace="connection"]')).toBeVisible();
  await expect(panel(page)).toBeVisible();
  return page;
}
const choose = (page, id) => panel(page).locator(`[data-reel-choice="${id}"]`).click();
const history = page => page.evaluate(() => window.templateFixture.studio.readHistory());
const arrangement = page => page.evaluate(() => window.templateFixture.studio.read().state.arrangements[0]);

for (const engine of names) {
  test(`${engine}: reel selections replace one accepted arrangement and Undo restores its complete preceding state`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    assert.equal((await history(page)).undoCount, 0, 'mounting the starter illustration leaves accepted history untouched');
    await expect(action(page, 'apply')).toBeHidden();
    await choose(page, 'pod');
    const first = await arrangement(page), pod = await bytes(page);
    assert.equal(first.templateId, 'pod');
    assert.notEqual(pod, initial);
    assert.equal((await history(page)).undoCount, 1);
    await expect(panel(page).locator('[data-arrangement-reading="accepted"]')).toHaveAttribute('data-arrangement-id', first.id);
    await expect(panel(page).locator('[data-template-rack] > header')).toContainText('Included work');
    await choose(page, 'tiger-team');
    const tiger = await bytes(page);
    assert.equal((await arrangement(page)).id, first.id);
    assert.equal((await arrangement(page)).templateId, 'tiger-team');
    await expect(panel(page).locator('.studio-session-tracks')).toContainText('Diagnose and agree a response');
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.arrangements.length), 1);
    const acceptedIds = await page.evaluate(() => window.templateFixture.studio.read().state.work.map(row => row.id));
    const rackIds = await panel(page).locator('[data-studio-session-id]').evaluateAll(keys => keys.map(key => key.dataset.studioSessionId));
    assert.ok(rackIds.length && rackIds.every(id => acceptedIds.includes(id)), 'the rack routes through accepted session identities');
    await choose(page, 'pod');
    assert.equal((await arrangement(page)).id, first.id);
    assert.equal((await arrangement(page)).templateId, 'pod');
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.arrangements.length), 1);
    const returned = await bytes(page), undoCount = (await history(page)).undoCount;
    await choose(page, 'pod');
    assert.equal(await bytes(page), returned);
    assert.equal((await history(page)).undoCount, undoCount, 'reselecting the current arrangement creates no history entry');
    await action(page, 'undo').click();
    assert.equal(await bytes(page), tiger, 'one Undo restores the entire preceding arrangement and work');
    await expect(panel(page).locator('[data-reel-choice="tiger-team"]')).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => { const f = window.templateFixture; f.studio.redo(f.studio.read()); f.controller.render(); });
    assert.equal(await bytes(page), returned);
    await expect(panel(page).locator('[data-reel-choice="pod"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(action(page, 'apply')).toBeHidden();
  });

  test(`${engine}: complete text edits settle once and preserve unfinished person edits for review`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const f = window.templateFixture, opened = f.editing.person.begin('product-one', f.studio.read());
      f.editing.person.setText(opened.view.draft.token, 'ratePerHour', '105.50');
    });
    await choose(page, 'pod');
    const saved = await page.evaluate(() => window.templateFixture.editing.read().parked);
    assert.equal(saved.length, 1); assert.equal(saved[0].raw.ratePerHour, '105.50');
    assert.equal(saved[0].status, 'stale', 'the saved person edit stays available for review against the new arrangement');
    await card(page, 'connection:handoff');
    const input = field(page, 'connections.handoff.sharedObject');
    const before = await bytes(page), beforeCount = (await history(page)).undoCount;
    await input.fill('A reviewed implementation plan');
    assert.equal(await bytes(page), before, 'typing retains a complete local entry before settlement');
    await input.press('Tab');
    assert.equal((await history(page)).undoCount, beforeCount + 1);
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.connections[0].sharedObject), 'A reviewed implementation plan');
    await input.fill('A reviewed implementation plan and acceptance examples');
    await input.press('Enter');
    assert.equal((await history(page)).undoCount, beforeCount + 2, 'Enter accepts one complete entry');
    await input.press('Tab');
    assert.equal((await history(page)).undoCount, beforeCount + 2, 'the subsequent blur leaves the same entry unchanged');
    await action(page, 'undo').click();
    await expect(input).toHaveValue('A reviewed implementation plan');
    assert.equal(await page.evaluate(() => window.templateFixture.editing.read().parked[0].raw.ratePerHour), '105.50');
    // An intervening accepted edit retires the arrangement-specific shortcut.
    await page.evaluate(() => {
      const f = window.templateFixture, plan = f.studio.read();
      f.studio.updatePerson('product-one', { ...plan.state.people[0], rateCentsPerHour: 11000 }, plan); f.controller.render();
    });
    await expect(action(page, 'undo')).toBeHidden();
  });

  test(`${engine}: shared records receive a local keep-or-copy choice before an arrangement edit`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await choose(page, 'pod');
    const sharedTeam = await page.evaluate(() => {
      const f = window.templateFixture, before = f.studio.read();
      const connection = { ...before.state.connections[0], id: 'external-handoff' };
      const result = f.studio.applyCommand({ type: 'connection.create', connection }, before);
      if (!result.ok) throw Error(result.error.code);
      f.controller.render(); return before.state.arrangements[0].teamBindings[0].teamId;
    });
    const before = await bytes(page), count = (await history(page)).undoCount;
    await card(page, 'team:pod');
    const name = field(page, 'teams.pod.label'), originalName = await name.inputValue();
    await name.fill('Delivery for this arrangement'); await name.press('Tab');
    await expect(action(page, 'preserve')).toBeVisible();
    assert.equal(await bytes(page), before, 'shared records stay intact until the visitor chooses how to proceed');
    assert.equal((await history(page)).undoCount, count);
    await action(page, 'cancel').click();
    await expect(name).toHaveValue(originalName);
    assert.equal(await bytes(page), before);
    await name.fill('Delivery for this arrangement'); await name.press('Enter');
    await action(page, 'preserve').click();
    const result = await page.evaluate(() => window.templateFixture.studio.read().state);
    assert.equal(result.arrangements.length, 1);
    const selectedTeam = result.arrangements[0].teamBindings[0].teamId;
    assert.notEqual(selectedTeam, sharedTeam);
    assert.equal(result.teams.find(row => row.id === selectedTeam).label, 'Delivery for this arrangement');
    assert.equal(result.teams.find(row => row.id === sharedTeam).label, originalName);
    assert.equal(result.connections.find(row => row.id === 'external-handoff').senderTeamId, sharedTeam);
    await expect(action(page, 'preserve')).toBeHidden();
    assert.equal((await history(page)).undoCount, count + 1);
    await action(page, 'undo').click();
    assert.equal(await bytes(page), before, 'Undo restores the shared-record choice and its arrangement together');
  });

  test(`${engine}: team customization retains a session's recorded timing and lifecycle`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await choose(page, 'matrix');
    const recorded = await page.evaluate(() => {
      const f = window.templateFixture, before = f.studio.read();
      const work = before.state.work.find(row => row.label === 'Agree shared assignments');
      const timing = { startMinute: 120, repeatEveryMinutes: null };
      const result = f.studio.updateWork(work.id, { ...work, timing, lifecycle: 'retired' }, before);
      if (!result.ok) throw Error(result.error.code);
      f.controller.render(); return { id: work.id, timing, lifecycle: 'retired' };
    });
    await card(page, 'team:delivery');
    const label = field(page, 'teams.delivery.label');
    const before = await bytes(page);
    await label.fill('Delivery team for the next release'); await label.press('Tab');
    await expect(action(page, 'preserve')).toBeVisible();
    assert.equal(await bytes(page), before, 'the timed session keeps its existing team until the visitor accepts a separate arrangement team');
    await action(page, 'preserve').click();
    const after = await page.evaluate(id => window.templateFixture.studio.read().state.work.find(row => row.id === id), recorded.id);
    assert.deepEqual(after.timing, recorded.timing);
    assert.equal(after.lifecycle, recorded.lifecycle);
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.teams.find(row => row.label === 'Delivery team for the next release') !== undefined), true);
  });

  test(`${engine}: accepted arrangement controls retain topology, editor routes and recoverable detach`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const f = window.templateFixture; f.controller.dispose();
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      mountCoordinationPanel(document.querySelector('[data-native-coordination]')).dispose();
      f.nativeController = mountCoordinationPanel(document.querySelector('[data-native-coordination]'), { studio: f.studio });
    });
    const root = page.locator('[data-native-coordination]'), accepted = page.locator('[data-native-connection-view]');
    await choose(page, 'pod');
    const id = (await arrangement(page)).id;
    await card(page, 'team:pod');
    const teamName = field(page, 'teams.pod.label');
    const acceptedTeamName = () => page.evaluate(() => {
      const state = window.templateFixture.studio.read().state;
      const teamId = state.arrangements[0].teamBindings.find(row => row.slotId === 'pod').teamId;
      return state.teams.find(row => row.id === teamId).label;
    });
    await teamName.fill('Delivery with named ownership');
    await root.locator('[data-native-chapter="people"]').click();
    await expect(root.locator('[data-native-chapter-panel="people"]')).toBeVisible();
    await expect.poll(acceptedTeamName).toBe('Delivery with named ownership');
    await root.locator('[data-native-chapter="coordination"]').click();
    await expect(teamName).toHaveValue('Delivery with named ownership');
    await teamName.fill('Delivery ready for review');
    await panel(page).locator('[data-session-track="review"] .studio-session-tracks__name').click();
    await expect(root.locator('[data-native-session-editor] [name="label"]')).toHaveValue('Weekly working session');
    await expect.poll(acceptedTeamName).toBe('Delivery ready for review');
    await root.locator('[data-native-return-action]').click();
    await expect(teamName).toHaveValue('Delivery ready for review');
    await panel(page).locator('[data-delivery-team="pod"] .studio-delivery__team-key').first().click();
    await expect(field(page, 'teams.pod.selection')).toBeFocused();
    await panel(page).locator('[data-delivery-connection="handoff"]').click();
    await expect(field(page, 'connections.handoff.sharedObject')).toBeFocused();
    await panel(page).locator('[data-delivery-session="review"]').click();
    await expect(root.locator('[data-native-session-editor] [name="label"]')).toHaveValue('Weekly working session');
    await root.locator('[data-native-return-action]').click();
    await accepted.locator('.studio-accepted-connections > summary').click();
    const reading = accepted.locator('[data-arrangement-reading="accepted"]');
    await expect(reading).toHaveAttribute('data-arrangement-id', id);
    await reading.locator('.studio-team-lane__title').first().click();
    await expect(root.locator('[data-native-chapter-panel="people"]')).toBeVisible();
    await expect(root.locator('[data-native-assembly] [data-assembly-form] [name="label"]')).toBeFocused();
    await root.locator('[data-native-return-action]').click();
    const beforeDetach = await bytes(page);
    await accepted.locator('[data-connection-action="detach-arrangement"]').click();
    await expect(panel(page).locator('[data-template-preview]')).toContainText('teams, current connections and working sessions remain available');
    assert.equal(await bytes(page), beforeDetach);
    await action(page, 'apply').click();
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.arrangements.length), 0);
    await expect(accepted).toContainText('Custom connections');
    await page.evaluate(() => { const f = window.templateFixture; f.studio.undo(f.studio.read()); f.nativeController.refresh(); });
    assert.equal(await bytes(page), beforeDetach);
    await expect(reading).toHaveAttribute('data-arrangement-id', id);
    await page.setViewportSize({ width: 390, height: 1000 });
    await expect(reading).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await accepted.screenshot({ path: resolve(captures, `${engine}-accepted-narrow.png`) });
  });

  test(`${engine}: invalid recovery entries retain accepted work and callback remount owns focus and status`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await choose(page, 'tiger-team'); await card(page, 'connection:diagnose');
    const before = await bytes(page), hours = field(page, 'recovery.diagnose.hoursPerSession');
    await hours.fill('-1'); await hours.press('Tab');
    await expect(hours).toHaveAttribute('aria-invalid', 'true');
    assert.equal(await bytes(page), before, 'invalid entries leave the accepted arrangement available');
    await hours.fill('1'); await hours.press('Tab');
    await expect(hours).toHaveAttribute('aria-invalid', 'false');
    assert.notEqual(await bytes(page), before);
    await page.evaluate(() => {
      const f = window.templateFixture; f.controller.dispose();
      f.controller = f.mount(f.element, { studio: f.studio, editing: f.editing, onAccepted() {
        f.controller.dispose(); f.controller = f.mount(f.element, { studio: f.studio, editing: f.editing }); f.controller.open();
        f.element.querySelector('[data-connection-template-status]').textContent = 'Successor keeps this status.';
        f.element.querySelector('[data-reel-choice="guild"]').focus();
      } }); f.controller.open();
    });
    await choose(page, 'guild');
    await expect(status(page)).toHaveText('Successor keeps this status.');
    await expect(panel(page).locator('[data-reel-choice="guild"]')).toBeFocused();
    assert.equal((await arrangement(page)).templateId, 'guild');
    await page.evaluate(() => {
      const f = window.templateFixture; f.controller.dispose(); f.hooks = 0;
      const facade = { ...f.studio, replace(candidate, expected) { const result = f.studio.replace(candidate, expected); f.controller.dispose(); return result; } };
      f.controller = f.mount(f.element, { studio: facade, editing: f.editing, onAccepted() { f.hooks += 1; } }); f.controller.open();
    });
    await choose(page, 'pod');
    assert.equal(await page.evaluate(() => window.templateFixture.hooks), 0, 'a disposed receiver leaves the successor callback alone');
    assert.equal((await arrangement(page)).templateId, 'pod');
    await expect(panel(page)).toBeHidden();
  });
}
