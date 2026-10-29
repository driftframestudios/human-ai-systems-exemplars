import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-responsibilities');
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
const people = page => root(page).locator('[data-native-team-editor]');
const settings = (page, kind) => people(page).locator(`[data-responsibility-configure="${kind}"]`);
const field = (page, kind, name) => settings(page, kind).locator(`[name="${name}"]`);
const action = (page, kind, name) => settings(page, kind).locator(`[data-responsibility-action="${name}"]:visible`);
const apply = (page, kind) => settings(page, kind).locator('[data-responsibility-apply]');
const add = page => people(page).locator('[data-responsibility-action="create"]');
const member = (page, id) => people(page).locator(`[data-responsibility-work="${id}"]`);
const total = page => root(page).locator('[data-native-total]');
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const state = page => page.evaluate(() => JSON.parse(window.responsibilityFixture.studio.exportText()));

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
    const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
    const element = document.querySelector('[data-native-coordination]');
    mountCoordinationPanel(element).dispose();
    const studio = createStudio();
    window.responsibilityFixture = { studio, controller: mountCoordinationPanel(element, { studio }), editing: createDraftCoordinator(studio) };
  });
  await tab(page, 'people').click();
  return page;
}

const expectedRole = Object.freeze({ functionId: 'engineering', seniorityId: 'principal-plus', postureId: 'decision-owner',
  enablerId: 'protected-focus-time', qualityId: 'independent-review', aiId: 'escalation-owner', decisionId: 'approves',
  change: { frameworkId: 'npt', componentId: 'collective-action' } });
const categories = ['scenario-generation', 'source-retrieval', 'dependency-mapping', 'draft-artifacts', 'cross-source-synthesis', 'transparent-calculation'];
async function role(page, id = 'product-one') {
  await people(page).locator(`[data-person-id="${id}"]`).click();
  await settings(page, 'role').locator('summary').click();
}
async function contribution(page, category = 'source-retrieval') {
  await add(page).click();
  await field(page, 'contribution', 'categoryId').selectOption(category);
  await field(page, 'contribution', 'receiverPersonId').selectOption('product-one');
  await field(page, 'contribution', 'decisionOwnerPersonId').selectOption('engineering-one');
  await member(page, 'review').check();
  await field(page, 'contribution', 'reviewBoundary').fill('Check the original sources.');
  await field(page, 'contribution', 'decisionBoundary').fill('Choose which sources to use.');
}

for (const engine of names) {
  test(`${engine}: role choices and all six contribution categories retain literal investment and exchange meaning`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const before = await page.evaluate(() => window.responsibilityFixture.studio.read().result);
    await role(page);
    for (const [name, value] of Object.entries(expectedRole)) await field(page, 'role', name).selectOption(name === 'change' ? 'npt:collective-action' : value);
    await apply(page, 'role').click();
    await expect(settings(page, 'role')).toHaveAttribute('open', '');
    await expect(apply(page, 'role')).toBeFocused();
    assert.deepEqual((await state(page)).people[0].role, expectedRole);
    const sequence = await page.evaluate(() => window.responsibilityFixture.studio.readAcceptance().sequence);
    await apply(page, 'role').evaluate(button => button.click());
    assert.equal(await page.evaluate(() => window.responsibilityFixture.studio.readAcceptance().sequence), sequence, 'unchanged Apply preserves acceptance');
    for (const category of categories) {
      await contribution(page, category);
      await expect(total(page)).toHaveText('$1,200.00');
      await apply(page, 'contribution').click();
    }
    const accepted = await state(page);
    assert.deepEqual(accepted.contributions.map(({ id, ...row }) => row), categories.map(categoryId => ({
      categoryId, receiverPersonId: 'product-one', decisionOwnerPersonId: 'engineering-one', workIds: ['review'],
      reviewBoundary: 'Check the original sources.', decisionBoundary: 'Choose which sources to use.',
    })));
    assert.deepEqual(await page.evaluate(() => window.responsibilityFixture.studio.read().result), before);
    await expect(people(page).locator('[data-responsibility-list] > li')).toHaveCount(6);
    await expect(people(page).locator('[data-responsibility-list]')).toContainText('Who decides: engineering-one');
    await tab(page, 'investment').click();
    await root(page).locator('[data-investment-action="undo"]').click();
    assert.equal((await state(page)).contributions.length, 5);
    await root(page).locator('[data-investment-action="redo"]').click();
    assert.deepEqual((await state(page)).contributions, accepted.contributions);
    await expect(total(page)).toHaveText('$1,200.00');
  });

  test(`${engine}: saved role and contribution forms retain exact targets through renamed, retired and conflicting records`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await role(page);
    await field(page, 'role', 'functionId').selectOption('data-ml');
    await contribution(page);
    await people(page).locator('[data-person-id="product-two"]').click();
    await expect(root(page).locator('[data-native-saved-count]')).toHaveText('2');
    const contributionKey = await root(page).locator('[data-saved-open^="contribution:"]').getAttribute('data-saved-open');
    const id = contributionKey.slice('contribution:contribution.create:'.length);
    await page.evaluate(id => {
      const { studio, controller } = window.responsibilityFixture;
      const plan = structuredClone(studio.read().state);
      plan.people[0].label = 'Research lead'; plan.people[0].lifecycle = 'retired';
      plan.contributions.push({ id, categoryId: 'scenario-generation', receiverPersonId: null, decisionOwnerPersonId: null,
        workIds: [], reviewBoundary: null, decisionBoundary: null });
      const result = studio.replace(plan, studio.read());
      if (!result.ok) throw new Error(result.error.message);
      controller.refresh();
    }, id);
    await root(page).locator('[data-native-saved] > summary').click();
    await root(page).locator('[data-saved-open="role:role.update:product-one"]').click();
    await expect(settings(page, 'role').locator('fieldset')).toHaveAttribute('disabled', '');
    await expect(field(page, 'role', 'functionId')).toHaveValue('data-ml');
    await expect(settings(page, 'role').locator('summary')).toContainText('Research lead · retired');
    await action(page, 'role', 'review').click();
    await apply(page, 'role').click();
    assert.equal((await state(page)).people[0].role.functionId, 'data-ml');
    if (await root(page).locator('[data-native-saved]').getAttribute('open') === null) await root(page).locator('[data-native-saved] > summary').click();
    await root(page).locator(`[data-saved-open="${contributionKey}"]`).click();
    await expect(action(page, 'contribution', 'freshId')).toBeVisible();
    await expect(field(page, 'contribution', 'reviewBoundary')).toHaveValue('Check the original sources.');
    await action(page, 'contribution', 'freshId').click();
    await expect(field(page, 'contribution', 'receiverPersonId')).toHaveValue('product-one');
    await expect(field(page, 'contribution', 'receiverPersonId').locator('option:checked')).toHaveText('Research lead · retired');
    await apply(page, 'contribution').click();
    const accepted = await state(page), added = accepted.contributions.find(row => row.id !== id);
    assert.ok(added); assert.equal(added.receiverPersonId, 'product-one');
    assert.equal(added.reviewBoundary, 'Check the original sources.');
    await expect(total(page)).toHaveText('$1,200.00');
    await field(page, 'contribution', 'reviewBoundary').fill('Keep this draft.');
    await page.evaluate(() => {
      const { studio, controller } = window.responsibilityFixture;
      const plan = structuredClone(studio.read().state); plan.people[1].label = 'First new name';
      studio.replace(plan, studio.read()); controller.refresh();
    });
    await page.evaluate(() => {
      const { studio } = window.responsibilityFixture;
      const plan = structuredClone(studio.read().state); plan.people[1].label = 'Second new name';
      studio.replace(plan, studio.read());
    });
    await action(page, 'contribution', 'review').click();
    await expect(settings(page, 'contribution').locator('fieldset')).toHaveAttribute('disabled', '');
    await expect(field(page, 'contribution', 'reviewBoundary')).toHaveValue('Keep this draft.');
    await action(page, 'contribution', 'review').click();
    await expect(settings(page, 'contribution').locator('fieldset')).not.toHaveAttribute('disabled');
    await action(page, 'contribution', 'cancel').click();
    assert.equal((await state(page)).contributions.find(row => row.id === added.id).reviewBoundary, 'Check the original sources.');
  });

  test(`${engine}: supporting-session order, unresolved responsibility and explicit removal remain separate from pricing`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const { studio, controller } = window.responsibilityFixture;
      const plan = structuredClone(studio.read().state);
      plan.work.push({ ...plan.work[0], id: 'follow-up', label: 'Follow-up session', minutesPerOccurrence: 0, lifecycle: 'retired' });
      studio.replace(plan, studio.read()); controller.refresh();
    });
    await contribution(page);
    await member(page, 'follow-up').check();
    await people(page).locator('[data-responsibility-action="work-up"][data-responsibility-id="follow-up"]').click();
    await field(page, 'contribution', 'receiverPersonId').selectOption('');
    await field(page, 'contribution', 'decisionOwnerPersonId').selectOption('');
    await field(page, 'contribution', 'reviewBoundary').fill('');
    await apply(page, 'contribution').click();
    const row = (await state(page)).contributions[0];
    assert.deepEqual(row.workIds, ['follow-up', 'review']);
    assert.equal(row.receiverPersonId, null); assert.equal(row.decisionOwnerPersonId, null); assert.equal(row.reviewBoundary, null);
    await expect(people(page).locator('[data-responsibility-list]')).toContainText('Receiver: Unassigned. Who decides: Unassigned.');
    await expect(people(page).locator('[data-responsibility-list]')).toContainText('Follow-up session · retired');
    await page.evaluate(() => {
      const { studio } = window.responsibilityFixture;
      const result = studio.applyCommand({ type: 'work.remove', workId: 'follow-up' }, studio.read());
      if (result.ok || result.error.code !== 'dependencies' || !result.error.references.some(row => row.collection === 'contributions')) throw new Error('Supporting work removal must retain its contribution reference.');
    });
    await people(page).locator(`[data-responsibility-action="remove"][data-responsibility-id="${row.id}"]`).click();
    await expect(people(page).locator('[data-responsibility-confirm]')).toContainText('Remove Source retrieval?');
    await action(page, 'contribution', 'cancel').click();
    assert.equal((await state(page)).contributions.length, 1);
    await people(page).locator(`[data-responsibility-action="remove"][data-responsibility-id="${row.id}"]`).click();
    await apply(page, 'contribution').click();
    assert.equal((await state(page)).contributions.length, 0);
    await expect(add(page)).toBeFocused();
    await expect(total(page)).toHaveText('$1,200.00');
    await add(page).click();
    await field(page, 'contribution', 'categoryId').selectOption('source-retrieval');
    await member(page, 'follow-up').check();
    await page.evaluate(() => {
      const { studio, controller } = window.responsibilityFixture;
      const result = studio.applyCommand({ type: 'work.remove', workId: 'follow-up' }, studio.read());
      if (!result.ok) throw new Error(result.error.message);
      controller.refresh();
    });
    await action(page, 'contribution', 'review').click();
    await expect(people(page).locator('ul[data-responsibility-work]')).toHaveAttribute('aria-invalid', 'true');
    await expect(people(page).locator('[data-responsibility-error="workIds"]')).not.toHaveText('');
    await member(page, 'follow-up').click();
    await expect(member(page, 'follow-up')).toHaveCount(0);
    await expect(people(page).locator('ul[data-responsibility-work]')).toHaveAttribute('aria-invalid', 'false');
    await expect(people(page).locator('[data-responsibility-error="workIds"]')).toHaveText('');
    await action(page, 'contribution', 'cancel').click();
    await expect(total(page)).toHaveText('$1,200.00');
  });

  test(`${engine}: responsibility controls preserve narrow reading, visible focus and successor lifecycle ownership`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true);
    await role(page);
    await page.screenshot({ path: resolve(captures, `${engine}-1440.png`), fullPage: false });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await contribution(page);
    await frames(page);
    const overflow = await settings(page, 'contribution').evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth,
      overflowing: [...element.querySelectorAll('*')].filter(child => child.getClientRects().length && child.scrollWidth > child.clientWidth + 2)
        .map(child => ({ tag: child.tagName, className: child.className, text: child.textContent.slice(0, 70), width: child.clientWidth, scroll: child.scrollWidth })),
      controls: [...element.querySelectorAll('select,textarea,button')].filter(control => control.getClientRects().length).map(control => {
        const box = control.getBoundingClientRect(), outer = element.getBoundingClientRect();
        return { name: control.name || control.textContent, left: box.left - outer.left, right: box.right - outer.right };
      }) }));
    assert.ok(overflow.scroll <= overflow.width + 2, JSON.stringify(overflow));
    assert.ok(overflow.controls.every(control => control.left >= -2 && control.right <= 2), JSON.stringify(overflow));
    await field(page, 'contribution', 'reviewBoundary').focus();
    await expect(field(page, 'contribution', 'reviewBoundary')).toBeFocused();
    await field(page, 'contribution', 'categoryId').scrollIntoViewIfNeeded();
    const box = await field(page, 'contribution', 'categoryId').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const prior = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 260);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(prior);
    await page.screenshot({ path: resolve(captures, `${engine}-320-enlarged.png`), fullPage: false });

    const lifecycle = await page.evaluate(async () => {
      const { mountResponsibilityPanel } = await import('/collaboration/native-investment-studio/responsibility-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.responsibilityFixture.controller.dispose(); window.responsibilityFixture.editing.dispose();
      const element = document.querySelector('[data-native-team-editor]'); element.hidden = false;
      const studio = createStudio();
      let receiver, successor, armed = false, callbacks = 0;
      const facade = { ...studio, previewCommand(...args) {
        const result = studio.previewCommand(...args);
        if (armed) { armed = false; receiver.dispose(); }
        return result;
      } };
      const editing = createDraftCoordinator(facade);
      receiver = mountResponsibilityPanel(element, { studio: facade, editing, onEditing: () => callbacks++ });
      receiver.selectPerson('product-one'); callbacks = 0; armed = true;
      const select = element.querySelector('[name="functionId"]'); select.value = 'engineering'; select.dispatchEvent(new Event('input', { bubbles: true }));
      const retirement = { callbacks, active: editing.read().active, raw: editing.read().parked[0]?.raw.functionId, ready: element.hasAttribute('data-responsibility-ready') };
      editing.dispose();
      const nextEditing = createDraftCoordinator(studio);
      receiver = mountResponsibilityPanel(element, { studio, editing: nextEditing, onAccepted() {
        receiver.dispose();
        successor = mountResponsibilityPanel(element, { studio, editing: nextEditing }); successor.create();
        element.querySelector('[data-responsibility-status]').textContent = 'Successor controls this edit.';
        element.querySelector('[name="categoryId"]').focus();
      } });
      receiver.selectPerson('product-one');
      select.value = 'data-ml'; select.dispatchEvent(new Event('input', { bubbles: true }));
      element.querySelector('[data-responsibility-configure="role"] form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      const handoff = { status: element.querySelector('[data-responsibility-status]').textContent, focused: document.activeElement?.name,
        active: nextEditing.read().active?.kind, role: studio.read().state.people[0].role.functionId };
      successor?.dispose(); receiver.dispose(); nextEditing.dispose();
      const closedHandoffs = [];
      for (const action of ['cancel', 'remove']) {
        const currentStudio = createStudio(), currentEditing = createDraftCoordinator(currentStudio);
        if (action === 'remove') {
          const result = currentStudio.applyCommand({ type: 'contribution.create', contribution: {
            id: 'review-output', categoryId: 'source-retrieval', receiverPersonId: null, decisionOwnerPersonId: null,
            workIds: [], reviewBoundary: null, decisionBoundary: null,
          } }, currentStudio.read());
          if (!result.ok) throw new Error(result.error.message);
        }
        let transitioned = false, lateCallbacks = 0, nextReceiver;
        const currentReceiver = mountResponsibilityPanel(element, { studio: currentStudio, editing: currentEditing,
          onEditing: () => { if (transitioned) lateCallbacks++; } });
        if (action === 'cancel') currentReceiver.selectPerson('product-one');
        else currentReceiver.open('contribution.remove:review-output');
        const returnTarget = action === 'cancel' ? element.querySelector('[data-responsibility-configure="role"] summary')
          : element.querySelector('[data-responsibility-action="create"]');
        returnTarget.addEventListener('focus', () => {
          transitioned = true; currentReceiver.dispose();
          nextReceiver = mountResponsibilityPanel(element, { studio: currentStudio, editing: currentEditing });
          nextReceiver.create();
          element.querySelector('[data-responsibility-status]').textContent = 'Successor owns the returned focus.';
          element.querySelector('[name="categoryId"]').focus();
        }, { once: true });
        if (action === 'cancel') element.querySelector('[data-responsibility-configure="role"] fieldset [data-responsibility-action="cancel"]').click();
        else element.querySelector('[data-responsibility-configure="contribution"] form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        closedHandoffs.push({ action, transitioned, lateCallbacks, status: element.querySelector('[data-responsibility-status]').textContent,
          focused: document.activeElement?.name, active: currentEditing.read().active?.kind,
          contributions: currentStudio.read().state.contributions.length });
        nextReceiver?.dispose(); currentReceiver.dispose(); currentEditing.dispose();
      }
      return { retirement, handoff, closedHandoffs };
    });
    assert.deepEqual(lifecycle.retirement, { callbacks: 0, active: null, raw: 'engineering', ready: false });
    assert.deepEqual(lifecycle.handoff, { status: 'Successor controls this edit.', focused: 'categoryId', active: 'contribution', role: 'data-ml' });
    assert.deepEqual(lifecycle.closedHandoffs, ['cancel', 'remove'].map(action => ({ action, transitioned: true, lateCallbacks: 0,
      status: 'Successor owns the returned focus.', focused: 'categoryId', active: 'contribution', contributions: 0 })));
  });
}
