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
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-connection-templates');
let server, fixture;
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const start = source.indexOf('<section class="about-field about-field--coordination"');
  const end = source.indexOf('<section class="about-field about-field--studio"', start);
  const prefixEnd = source.indexOf('<main id="main">') + '<main id="main">'.length;
  assert.ok(start > prefixEnd && end > start);
  // This fixture receives the real About head, navigation and Studio source.
  const prefix = source.slice(0, prefixEnd).replace(/<script\b[\s\S]*?<\/script>/gu, '');
  const studio = source.slice(start, end);
  assert.equal((studio.match(/\bdata-connection-templates(?:\s|>)/gu) ?? []).length, 1,
    'About supplies one authored team-arrangement carrier.');
  fixture = `${prefix}${studio}<div aria-hidden="true" style="height:1000px"></div></main></body></html>`;
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => { try { await Promise.all([...browsers.values()].map(browser => browser.close())); } finally { await server?.close(); } });
const panel = page => page.locator('[data-connection-templates]');
const field = (page, path) => panel(page).locator(`[data-template-field="${path}"]`);
const action = (page, name) => panel(page).locator(`[data-template-action="${name}"]`);
const status = page => panel(page).locator('[data-connection-template-status]');
const bytes = page => page.evaluate(() => window.templateFixture.studio.exportText());
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function card(page, id) {
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
  await panel(page).locator(':scope > summary').click(); await expect(panel(page)).toHaveAttribute('open', '');
  return page;
}
async function existingGroups(page) {
  await card(page, 'team:pod'); await field(page, 'teams.pod.selection').selectOption('team:delivery');
  await card(page, 'team:partner'); await field(page, 'teams.partner.selection').selectOption('team:receiving');
}

for (const engine of names) {
  test(`${engine}: templates preview literal staffing and allocation, add explicit review work, and publish one Undo step`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), original = await bytes(page);
    await existingGroups(page); await action(page, 'preview').click();
    await expect(panel(page).locator('[data-template-total]')).toHaveText('$16,000.00');
    assert.equal(await bytes(page), original); await action(page, 'cancel').click(); assert.equal(await bytes(page), original);
    await action(page, 'preview').click(); await action(page, 'apply').click();
    await expect(panel(page)).toHaveAttribute('open', ''); await expect(action(page, 'apply')).toBeFocused();
    const first = await page.evaluate(() => { const { studio, accepted } = window.templateFixture; return { state: studio.read().state, result: studio.read().result, history: studio.readHistory(), accepted }; });
    assert.equal(first.state.connections.length, 2); assert.equal(first.history.undoCount, 1); assert.equal(first.accepted, 1);
    assert.equal(first.result.plannedCommitmentCents, 1600000); assert.equal(first.result.allocatedKnownCents, 40000);
    await page.evaluate(() => { const f = window.templateFixture; f.studio.undo(f.studio.read()); f.controller.render(); });
    await card(page, 'connection:handoff'); await panel(page).locator('[data-template-recovery="handoff"]').check();
    await field(page, 'recovery.handoff.team').selectOption('team:delivery');
    await field(page, 'recovery.handoff.personIds').selectOption(['product-one']);
    await field(page, 'recovery.handoff.hoursPerSession').fill('1'); await field(page, 'recovery.handoff.minutesPerSession').fill('30');
    await field(page, 'recovery.handoff.occurrences').fill('1'); await action(page, 'preview').click();
    await expect(panel(page).locator('[data-template-total]')).toHaveText('$16,150.00');
    await expect(panel(page).locator('[data-template-preview]')).toContainText('New review session: Review the handoff');
    await action(page, 'apply').click();
    const final = await page.evaluate(() => { const f = window.templateFixture; return { result: f.studio.read().result, work: f.studio.read().state.work, history: f.studio.readHistory() }; });
    assert.equal(final.result.plannedCommitmentCents, 1615000); assert.equal(final.result.additionalKnownCents, 15000); assert.equal(final.result.allocatedKnownCents, 40000);
    assert.equal(final.work.length, 2); assert.equal(final.history.undoCount, 1);
    await page.evaluate(() => { const f = window.templateFixture; f.studio.undo(f.studio.read()); f.controller.render(); });
    assert.equal(await bytes(page), original);
  });

  test(`${engine}: configuration edits, shared draft intent and equal imports retire previews while retaining correctable inputs`, { timeout: 60000 }, async t => {
    const page = await open(t, engine); await existingGroups(page); await card(page, 'connection:handoff');
    await page.evaluate(() => { const f = window.templateFixture; f.studio.applyCommand({ type: 'team.create', team: { id: 'new', label: 'Existing New group', personIds: [] } }, f.studio.read()); f.controller.render(); });
    await field(page, 'teams.pod.selection').selectOption('team:new'); await action(page, 'preview').click();
    await expect(panel(page).locator('[data-template-preview]')).toContainText('Add to Existing New group: product-one');
    await field(page, 'teams.pod.selection').selectOption('team:delivery');
    await page.evaluate(() => { const f = window.templateFixture, d = f.editing.person.begin('product-one', f.studio.read()).view.draft; f.editing.person.setText(d.token, 'ratePerHour', '105'); });
    await action(page, 'preview').click();
    assert.equal(await page.evaluate(() => window.templateFixture.editing.read().parked.length), 1);
    await field(page, 'connections.handoff.sharedObject').fill('A changed plan');
    await expect(panel(page).locator('[data-template-preview]')).toBeHidden(); await action(page, 'apply').evaluate(button => button.click());
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.connections.length), 0);
    await action(page, 'preview').click();
    await page.evaluate(() => { const f = window.templateFixture, d = f.editing.purpose.begin('purpose', f.studio.read()).view.draft; f.editing.purpose.setText(d.token, 'changedAbility', 'Recover samples'); });
    await action(page, 'apply').click(); await expect(status(page)).toContainText('Preview this arrangement');
    assert.equal(await page.evaluate(() => window.templateFixture.editing.read().active.kind), 'purpose');
    await action(page, 'preview').click(); assert.equal(await page.evaluate(() => window.templateFixture.editing.read().parked.length), 2);
    await page.evaluate(() => { const f = window.templateFixture; f.studio.replace(f.studio.read().state, f.studio.read()); f.controller.render(); });
    await expect(status(page)).toContainText('plan or edits changed'); await action(page, 'apply').evaluate(button => button.click());
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.connections.length), 0);
    await page.evaluate(() => { const f = window.templateFixture; f.controller.close(); f.controller.resume(); });
    await expect(field(page, 'connections.handoff.sharedObject')).toHaveValue('A changed plan');
    await action(page, 'preview').click(); await action(page, 'apply').click();
    assert.equal(await page.evaluate(() => window.templateFixture.editing.read().parked.length), 2);
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.connections[0].sharedObject), 'A changed plan');
    await field(page, 'connections.handoff.sharedObject').fill('Another arrangement'); await action(page, 'preview').click();
    await expect(status(page)).toContainText('Start another arrangement');
    await action(page, 'another').click(); await action(page, 'preview').click(); await action(page, 'apply').click();
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.connections.length), 4);
  });

  test(`${engine}: recovery controls remain reachable, invalid duration holds publication and callback remount owns focus and status`, { timeout: 60000 }, async t => {
    const page = await open(t, engine); await existingGroups(page); await card(page, 'connection:handoff');
    await panel(page).locator('[data-template-recovery="handoff"]').check();
    await field(page, 'recovery.handoff.team').selectOption('team:delivery'); await field(page, 'recovery.handoff.personIds').selectOption(['product-one']);
    const hours = field(page, 'recovery.handoff.hoursPerSession'); await hours.fill('-1'); await action(page, 'preview').click();
    await expect(hours).toHaveAttribute('aria-invalid', 'true'); assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.connections.length), 0);
    await panel(page).locator('[data-template-recovery="handoff"]').uncheck(); await action(page, 'preview').click();
    await expect(panel(page).locator('[data-template-total]')).toHaveText('$16,000.00');
    await panel(page).locator('[data-template-recovery="handoff"]').check(); await action(page, 'preview').click();
    await expect(hours).toHaveValue('-1'); await expect(panel(page).locator('[data-template-preview]')).toBeHidden();
    await hours.fill('00001'); await field(page, 'recovery.handoff.minutesPerSession').fill('30');
    const step = panel(page).locator('[data-template-action="step"][data-template-path="recovery.handoff.minutesPerSession"][data-template-step="1"]');
    await step.click(); await expect(field(page, 'recovery.handoff.minutesPerSession')).toHaveValue('31');
    await expect(step).toBeFocused();
    for (const [name, value] of [['hoursPerSession', '00001'], ['minutesPerSession', '00031'], ['occurrences', '00001']]) await field(page, `recovery.handoff.${name}`).fill(value);
    for (const [width, fontSize] of [[768, '100%'], [320, '100%'], [320, '200%']]) {
      await page.setViewportSize({ width, height: 900 }); await page.evaluate(size => { document.documentElement.style.fontSize = size; }, fontSize); await frames(page);
      await hours.scrollIntoViewIfNeeded(); await frames(page);
      const quantities = await panel(page).locator('[data-template-card="connection:handoff"] input[inputmode="numeric"]').evaluateAll(inputs => inputs.map(input => {
        const style = getComputedStyle(input), context = document.createElement('canvas').getContext('2d'); context.font = style.font;
        const box = input.getBoundingClientRect(), available = box.width - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight)
          - Number.parseFloat(style.borderLeftWidth) - Number.parseFloat(style.borderRightWidth);
        return { field: input.dataset.templateField, value: input.value, available, textWidth: context.measureText(input.value).width,
          scrollWidth: input.scrollWidth, clientWidth: input.clientWidth };
      }));
      assert.equal(quantities.length, 3);
      for (const quantity of quantities) assert.ok(quantity.value.length === 5 && quantity.textWidth <= quantity.available + 1
        && quantity.scrollWidth <= quantity.clientWidth + 1, `${width}px/${fontSize} keeps five raw digits visible: ${JSON.stringify(quantity)}`);
    }
    await hours.scrollIntoViewIfNeeded(); await frames(page);
    const geometry = await panel(page).evaluate(element => ({ box: element.getBoundingClientRect().toJSON(), width: innerWidth,
      controls: [...element.querySelectorAll('input,select,button')].filter(node => node.getClientRects().length).map(node => ({ tag: node.tagName, field: node.dataset.templateField ?? node.dataset.templateAction, box: node.getBoundingClientRect().toJSON(), parent: { className: node.parentElement.className, box: node.parentElement.getBoundingClientRect().toJSON(), font: getComputedStyle(node).font, width: getComputedStyle(node).inlineSize } })) }));
    for (const control of geometry.controls) assert.ok(control.box.left >= geometry.box.left - 1 && control.box.right <= geometry.box.right + 1, `${control.tag} remains in the template panel: ${JSON.stringify({ control, panel: geometry.box })}`);
    assert.ok(geometry.box.right <= geometry.width + 1);
    await page.screenshot({ path: resolve(captures, `template-${engine}-320-enlarged.png`), fullPage: false });
    await page.evaluate(() => {
      const f = window.templateFixture; f.controller.dispose();
      f.controller = f.mount(f.element, { studio: f.studio, editing: f.editing, onAccepted() {
        f.controller.dispose(); f.controller = f.mount(f.element, { studio: f.studio, editing: f.editing }); f.controller.open();
        f.element.querySelector('[data-connection-template-status]').textContent = 'Successor keeps this status.';
        f.element.querySelector('[data-template-action="preview"]').focus();
      } }); f.controller.open();
    });
    await action(page, 'preview').click(); await action(page, 'apply').click();
    await expect(status(page)).toHaveText('Successor keeps this status.'); await expect(action(page, 'preview')).toBeFocused();
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.connections.length), 2);
    await page.evaluate(() => {
      const f = window.templateFixture; f.controller.dispose(); f.hooks = 0;
      const facade = { ...f.studio, replace(candidate, expected) { const result = f.studio.replace(candidate, expected); f.controller.dispose(); return result; } };
      f.controller = f.mount(f.element, { studio: facade, editing: f.editing, onAccepted() { f.hooks += 1; } }); f.controller.open();
    });
    await action(page, 'preview').click(); await action(page, 'apply').click();
    assert.equal(await page.evaluate(() => window.templateFixture.hooks), 0);
    assert.equal(await page.evaluate(() => window.templateFixture.studio.read().state.connections.length), 4);
    await expect(panel(page)).toBeHidden();
  });
}
