import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry, inspectSelectPresentation } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-connections');
let server, fixture, complete;
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const object = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  assert.equal(source.split(object).length, 2);
  complete = source.replace(object, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  const start = source.indexOf('<section class="about-field about-field--coordination"');
  const end = source.indexOf('<section class="about-field about-field--studio"', start);
  const prefixEnd = source.indexOf('<main id="main">') + '<main id="main">'.length;
  assert.ok(start > prefixEnd && end > start);
  const prefix = source.slice(0, prefixEnd).replace(/<script\b[\s\S]*?<\/script>/gu,
    script => script.includes('collaboration/native-investment-studio/controller.mjs') ? script : '');
  fixture = `${prefix}${source.slice(start, end)}<div aria-hidden="true" style="height:1000px"></div></main></body></html>`;
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});
const root = page => page.locator('[data-native-coordination]');
const editor = page => root(page).locator('[data-native-connection-editor]');
const settings = page => editor(page).locator('[data-connection-configure]');
const field = (page, name) => settings(page).locator(`[name="${name}"]`);
const action = (page, name) => editor(page).locator(`[data-connection-action="${name}"]:visible`);
const apply = page => editor(page).locator('[data-connection-apply]');
const member = (page, id) => editor(page).locator(`[data-connection-work="${id}"]`);
const total = page => root(page).locator('[data-native-total]');
const visual = page => root(page).locator('[data-native-connection-view]');
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const state = page => page.evaluate(() => JSON.parse(window.connectionFixture.studio.exportText()));

async function open(t, engine, full = false) {
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
    const { createExamplePlan } = await import('/collaboration/native-investment-studio/contract.mjs');
    const { mountConnectionPanel } = await import('/collaboration/native-investment-studio/connection-controller.mjs');
    const element = document.querySelector('[data-native-coordination]');
    mountCoordinationPanel(element).dispose();
    const plan = createExamplePlan();
    plan.teams.push({ id: 'receiving', label: 'Receiving team', personIds: ['product-one'], lifecycle: 'active' },
      { id: 'alternate', label: 'Alternate team', personIds: ['engineering-one'], lifecycle: 'active' });
    plan.work.push({ ...plan.work[0], id: 'follow-up', label: 'Follow-up session', minutesPerOccurrence: 0 });
    const studio = createStudio(plan), controller = mountCoordinationPanel(element, { studio });
    window.connectionFixture = { studio, controller,
      panel: mountConnectionPanel(element.querySelector('[data-native-connection-editor]'), { studio }) };
  });
  await expect(editor(page)).toHaveAttribute('data-connection-ready', 'true');
  return page;
}

async function fill(page) {
  await action(page, 'create').click();
  await field(page, 'senderTeamId').selectOption('delivery');
  await field(page, 'receiverTeamId').selectOption('receiving');
  await field(page, 'receiverPersonId').selectOption('product-one');
  await field(page, 'sharedObject').fill('Review the migration plan');
  await field(page, 'responseExpectation').fill('Return the agreed next step');
  await member(page, 'review').check();
}

for (const engine of names) {
  test(`${engine}: one connection form retains explicit membership, ordered sessions and unchanged investment`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await fill(page);
    await field(page, 'receiverTeamId').selectOption('alternate');
    await expect(field(page, 'receiverPersonId')).toHaveValue('product-one');
    await expect(field(page, 'receiverPersonId')).toHaveAttribute('aria-invalid', 'true');
    await expect(field(page, 'receiverPersonId').locator('option:checked')).toContainText('outside this team');
    await apply(page).click();
    assert.equal((await state(page)).connections.length, 0);
    await field(page, 'receiverPersonId').selectOption('engineering-one');
    await expect(field(page, 'receiverPersonId')).toHaveAttribute('aria-invalid', 'false');
    await member(page, 'follow-up').check();
    await editor(page).locator('[data-connection-action="work-up"][data-connection-id="follow-up"]').click();
    await apply(page).click();
    const accepted = (await state(page)).connections[0];
    assert.deepEqual({ ...accepted, id: 'selected' }, { id: 'selected', senderTeamId: 'delivery', receiverTeamId: 'alternate',
      receiverPersonId: 'engineering-one', sharedObject: 'Review the migration plan', responseExpectation: 'Return the agreed next step',
      workIds: ['follow-up', 'review'], status: 'active' });
    await expect(settings(page)).toHaveAttribute('open', ''); await expect(apply(page)).toBeFocused();
    await expect(total(page)).toHaveText('$1,200.00');
    const stable = await page.evaluate(() => {
      const { studio, panel } = window.connectionFixture;
      const before = studio.readAcceptance(), token = panel.read().draft.token;
      document.querySelector('[data-connection-apply]').click();
      return { sameAcceptance: studio.readAcceptance() === before, sameToken: panel.read().draft.token === token };
    });
    assert.deepEqual(stable, { sameAcceptance: true, sameToken: true });
    await field(page, 'status').selectOption('paused');
    await expect(editor(page).locator('[data-connection-cost]')).toContainText('Paused connections keep their session costs.');
    await apply(page).click(); await expect(total(page)).toHaveText('$1,200.00');
    assert.equal((await state(page)).connections[0].status, 'paused');
    await expect(visual(page).locator(`button[data-connection-select="${accepted.id}"]`)).toContainText('Paused');
    await action(page, 'remove').click(); await expect(editor(page).locator('[data-connection-confirm]')).toContainText('Remove the connection');
    await action(page, 'cancel').click(); assert.equal((await state(page)).connections.length, 1);
    await page.evaluate(id => window.connectionFixture.panel.select(id), accepted.id);
    await action(page, 'remove').click(); await apply(page).click();
    assert.equal((await state(page)).connections.length, 0); assert.equal((await state(page)).work.length, 2);
    await expect(action(page, 'create')).toBeFocused(); await expect(total(page)).toHaveText('$1,200.00');
  });

  test(`${engine}: saved connection edits recover current values, imported identities and removed references explicitly`, { timeout: 45000 }, async t => {
    const page = await open(t, engine); await fill(page);
    const original = await page.evaluate(() => {
      const { panel, controller } = window.connectionFixture, draft = panel.read().draft;
      panel.close(); controller.refresh();
      return { id: draft.targetId, target: draft.connectionId, status: panel.read().status };
    });
    assert.equal(original.status, 'parked');
    await expect(root(page).locator(`[data-saved-open="connection:${original.target}"]`)).toHaveCount(1);
    await page.evaluate(original => {
      const { panel, studio, controller } = window.connectionFixture, plan = structuredClone(studio.read().state);
      plan.connections.push({ id: original.id, senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: null,
        sharedObject: 'Imported decision', responseExpectation: null, workIds: [], status: 'active' });
      studio.replace(plan, studio.read()); controller.refresh(); panel.open(original.target);
    }, original);
    await expect(editor(page).locator('[data-connection-recovery]')).toBeVisible();
    await expect(field(page, 'sharedObject')).toHaveValue('Review the migration plan');
    await action(page, 'freshId').click(); await expect(field(page, 'sharedObject')).toHaveValue('Review the migration plan');
    await apply(page).click();
    let connections = (await state(page)).connections;
    assert.equal(connections.length, 2); assert.equal(connections.find(row => row.id === original.id).sharedObject, 'Imported decision');
    const created = connections.find(row => row.id !== original.id);
    await field(page, 'sharedObject').fill('Retained revised plan');
    const saved = await page.evaluate(() => {
      const { controller, panel } = window.connectionFixture;
      const target = panel.read().draft.connectionId; panel.close(); controller.refresh();
      return { target, status: panel.read().status };
    });
    assert.equal(saved.status, 'parked');
    await expect(root(page).locator(`[data-saved-open="connection:${saved.target}"]`)).toHaveCount(1);
    await page.evaluate(target => {
      const { studio, controller, panel } = window.connectionFixture;
      const row = studio.read().state.people[0]; studio.updatePerson(row.id, { ...row, rateCentsPerHour: 10500 }, studio.read());
      const connection = studio.read().state.connections.find(row => target.endsWith(`:${row.id}`));
      studio.applyCommand({ type: 'connection.update', connectionId: connection.id, connection: { ...connection,
        receiverPersonId: null, responseExpectation: 'Confirm the new owner', workIds: ['follow-up', 'review'] } }, studio.read());
      controller.refresh(); panel.open(target);
    }, saved.target);
    await expect(field(page, 'sharedObject')).toBeDisabled();
    await expect(editor(page).locator('[data-connection-current]')).toContainText('Receiving person: Unassigned.');
    await expect(editor(page).locator('[data-connection-current]')).toContainText('Expected response: Confirm the new owner.');
    await expect(editor(page).locator('[data-connection-current]')).toContainText('Supporting sessions: Follow-up session, Weekly working session.');
    await action(page, 'review').click(); await expect(field(page, 'sharedObject')).toHaveValue('Retained revised plan');
    assert.equal((await state(page)).connections.find(row => row.id === created.id).sharedObject, 'Review the migration plan');
    await apply(page).click(); await expect(total(page)).toHaveText('$1,215.00');
    await field(page, 'sharedObject').fill('Return to accepted');
    await page.evaluate(() => {
      const { studio, controller } = window.connectionFixture; studio.replace(studio.read().state, studio.read()); controller.refresh();
    });
    await action(page, 'useCurrent').click(); await expect(field(page, 'sharedObject')).toHaveValue('Retained revised plan');
    await member(page, 'follow-up').check();
    await page.evaluate(() => {
      const { studio, controller } = window.connectionFixture;
      const result = studio.applyCommand({ type: 'work.remove', workId: 'follow-up' }, studio.read());
      if (!result.ok) throw new Error(result.error.message); controller.refresh();
    });
    await action(page, 'review').click(); await expect(editor(page).locator('ul[data-connection-work]')).toHaveAttribute('aria-invalid', 'true');
    await member(page, 'follow-up').click(); await expect(member(page, 'follow-up')).toHaveCount(0);
    await expect(member(page, 'review')).toBeFocused();
    await expect(editor(page).locator('ul[data-connection-work]')).toHaveAttribute('aria-invalid', 'false');
    await expect(editor(page).locator('[data-connection-error="workIds"]')).toHaveText('');
    await action(page, 'cancel').click(); await expect(total(page)).toHaveText('$1,215.00');
  });

  test(`${engine}: connection operations preserve the successor editor and retire only their captured lease`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    const observed = await page.evaluate(async () => {
      const { mountConnectionPanel } = await import('/collaboration/native-investment-studio/connection-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createExamplePlan } = await import('/collaboration/native-investment-studio/contract.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.connectionFixture.controller.dispose();
      const root = document.querySelector('[data-native-connection-editor]'); root.closest('[data-native-chapter-panel]').hidden = false;
      const fresh = () => { const plan = createExamplePlan(); plan.teams.push({ id: 'receiving', label: 'Receiving team', personIds: ['product-one'], lifecycle: 'active' }); return createStudio(plan); };
      const put = editing => {
        const draft = editing.connection.read().draft;
        for (const [field, raw] of Object.entries({ senderTeamId: 'delivery', receiverTeamId: 'receiving', receiverPersonId: 'product-one', sharedObject: 'A reviewed plan' })) editing.connection.setText(draft.token, field, raw);
        editing.connection.setIds(draft.token, 'workIds', ['review']);
      };
      const observations = [];
      for (const operation of ['preview', 'apply']) {
        const studio = fresh(); let panel, armed = false, callbacks = 0;
        const facade = { ...studio,
          previewCommand(...args) { const result = studio.previewCommand(...args); if (armed && operation === 'preview') { armed = false; panel.dispose(); } return result; },
          applyCommand(...args) { const result = studio.applyCommand(...args); if (armed && operation === 'apply') { armed = false; panel.dispose(); } return result; },
        };
        const editing = createDraftCoordinator(facade);
        panel = mountConnectionPanel(root, { studio: facade, editing, onAccepted: () => callbacks++, onEditing: () => callbacks++ });
        panel.create(); put(editing); callbacks = 0; armed = true;
        if (operation === 'preview') panel.refresh();
        else root.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        observations.push({ operation, callbacks, active: editing.read().active, saved: editing.read().parked[0]?.raw.sharedObject ?? null,
          count: studio.read().state.connections.length, ready: root.hasAttribute('data-connection-ready') });
        panel.dispose(); editing.dispose();
      }
      for (const handoff of ['cancel-focus', 'accepted-callback', 'same-token-onBegin']) {
        const studio = fresh(), editing = createDraftCoordinator(studio); let panel, successor, armed = false;
        const replace = () => {
          panel.dispose(); successor = mountConnectionPanel(root, { studio, editing }); successor.create();
          root.querySelector('[data-connection-status]').textContent = 'Successor controls this connection.';
          root.querySelector('[name="sharedObject"]').focus();
        };
        panel = mountConnectionPanel(root, { studio, editing, onAccepted: handoff === 'accepted-callback' ? replace : () => {},
          onBegin() {
            if (!armed || handoff !== 'same-token-onBegin') return;
            armed = false; editing.connection.setText(editing.connection.read().draft.token, 'sharedObject', 'Newer same-token text');
            panel.refresh(); root.querySelector('[data-connection-status]').textContent = 'Newer text stays.';
            root.querySelector('[name="responseExpectation"]').focus();
          } });
        panel.create(); put(editing); panel.refresh();
        const token = panel.read().draft.token;
        if (handoff === 'cancel-focus') {
          root.querySelector('[data-connection-action="create"]').addEventListener('focus', replace, { once: true });
          root.querySelector('fieldset [data-connection-action="cancel"]').click();
        } else if (handoff === 'accepted-callback') root.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        else { armed = true; panel.create(); }
        observations.push({ handoff, status: root.querySelector('[data-connection-status]').textContent,
          focus: document.activeElement.name, count: studio.read().state.connections.length,
          raw: editing.connection.read().draft?.raw.sharedObject, sameToken: editing.connection.read().draft?.token === token });
        successor?.dispose(); panel.dispose(); editing.dispose();
      }
      return observations;
    });
    assert.deepEqual(observed.slice(0, 2), [
      { operation: 'preview', callbacks: 0, active: null, saved: 'A reviewed plan', count: 0, ready: false },
      { operation: 'apply', callbacks: 0, active: null, saved: null, count: 1, ready: false },
    ]);
    assert.deepEqual(observed.slice(2), [
      { handoff: 'cancel-focus', status: 'Successor controls this connection.', focus: 'sharedObject', count: 0, raw: '', sameToken: false },
      { handoff: 'accepted-callback', status: 'Successor controls this connection.', focus: 'sharedObject', count: 1, raw: '', sameToken: false },
      { handoff: 'same-token-onBegin', status: 'Newer text stays.', focus: 'responseExpectation', count: 0, raw: 'Newer same-token text', sameToken: true },
    ]);
  });

  test(`${engine}: the directed rack and semantic list share selection while narrow reading keeps page scroll`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true);
    await page.evaluate(() => {
      const { studio, controller } = window.connectionFixture, plan = structuredClone(studio.read().state);
      plan.connections = Array.from({ length: 9 }, (_, index) => ({ id: `handoff-${index}`, senderTeamId: 'delivery', receiverTeamId: 'receiving',
        receiverPersonId: 'product-one', sharedObject: `Decision ${index}`, responseExpectation: `Reply ${index}`, workIds: ['review'], status: index === 1 ? 'paused' : 'active' }));
      studio.replace(plan, studio.read()); controller.refresh();
    });
    await expect(visual(page).locator('.native-connections__list button[data-connection-select]')).toHaveCount(8);
    await expect(visual(page).locator('svg [data-connection-select]')).toHaveCount(8);
    await visual(page).locator('.native-connections__viewport').screenshot({ path: resolve(captures, `${engine}-rack-1440.png`) });
    await visual(page).locator('button[data-connection-select="handoff-1"]').click();
    await expect(field(page, 'sharedObject')).toHaveValue('Decision 1');
    await expect(visual(page).locator('svg [data-connection-select="handoff-1"]')).toHaveAttribute('aria-current', 'true');
    await visual(page).locator('[data-connection-action="next"]').click();
    await expect(visual(page).locator('.native-connections__list button[data-connection-select]')).toHaveCount(1);
    await expect(field(page, 'sharedObject')).toHaveValue('Decision 1');
    await visual(page).locator('[data-connection-action="return"]').click();
    await visual(page).locator('svg [data-connection-select="handoff-2"]').click();
    await expect(field(page, 'sharedObject')).toHaveValue('Decision 2');
    await expect(visual(page).locator('button[data-connection-select="handoff-2"]')).toHaveAttribute('aria-current', 'true');
    await action(page, 'remove').click(); await apply(page).click();
    await page.evaluate(() => {
      const { studio, controller, panel } = window.connectionFixture;
      studio.undo(studio.read()); controller.refresh(); panel.select('handoff-2');
    });
    await expect(field(page, 'sharedObject')).toHaveValue('Decision 2');
    await expect(visual(page).locator('svg [data-connection-select="handoff-2"]')).toHaveAttribute('aria-current', 'true');
    await expect(visual(page).locator('button[data-connection-select="handoff-2"]')).toHaveAttribute('aria-current', 'true');
    await page.screenshot({ path: resolve(captures, `${engine}-1440.png`), fullPage: false });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await frames(page);
    const selectPresentation = await inspectSelectPresentation(page, ['senderTeamId', 'receiverTeamId', 'receiverPersonId', 'status']
      .map(name => `[data-native-connection-editor] select[name="${name}"]`));
    for (const observation of selectPresentation) {
      assert.equal(observation.present, true); assert.equal(observation.appearance, 'none');
      assert.notEqual(observation.backgroundImage, 'none'); assert.equal(observation.inlineEndInset, 20);
    }
    const geometry = await visual(page).locator('.native-connections__viewport').evaluate(element => ({ width: element.clientWidth,
      scrollWidth: element.scrollWidth, height: element.clientHeight, scrollHeight: element.scrollHeight,
      documentWidth: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    assert.ok(geometry.scrollWidth > geometry.width + 100, JSON.stringify(geometry));
    assert.ok(geometry.scrollHeight <= geometry.height + 2, JSON.stringify(geometry));
    assert.ok(geometry.documentWidth <= geometry.viewport + 2, JSON.stringify(geometry));
    await visual(page).locator('.native-connections__viewport').evaluate(element => { element.scrollLeft = element.scrollWidth; });
    await expect.poll(() => visual(page).locator('.native-connections__viewport').evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
    await visual(page).locator('.native-connections__viewport').screenshot({ path: resolve(captures, `${engine}-rack-320-enlarged.png`) });
    await visual(page).locator('.native-connections__viewport').scrollIntoViewIfNeeded();
    const box = await visual(page).locator('.native-connections__viewport').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 200));
    const before = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 240);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
    await field(page, 'responseExpectation').focus(); await expect(field(page, 'responseExpectation')).toBeFocused();
    const formGeometry = await settings(page).evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    assert.ok(formGeometry.scroll <= formGeometry.width + 2, JSON.stringify(formGeometry));
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    await page.screenshot({ path: resolve(captures, `${engine}-320-enlarged.png`), fullPage: false });
    await expect(total(page)).toHaveText('$1,200.00');
  });
}
