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
const browsers = new Map();
const route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-people-teams');
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
const people = page => root(page).locator('[data-native-assembly]');
const form = page => people(page).locator('[data-assembly-form]');
const field = (page, name) => form(page).locator(`[name="${name}"]`);
const action = (page, name) => people(page).locator(`[data-assembly-action="${name}"]`);
const apply = page => form(page).locator('[data-assembly-apply]');
const cancel = page => form(page).locator('[data-assembly-cancel]');
const total = page => root(page).locator('[data-native-total]');
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const bytes = page => page.evaluate(() => window.assemblyFixture.studio.exportText());
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function open(t, engine, full = false) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const telemetry = monitor(page), pending = new Set();
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
    window.assemblyFixture = { studio, controller: mountCoordinationPanel(element, { studio }), editing: createDraftCoordinator(studio) };
  });
  await tab(page, 'people').click();
  await expect(people(page)).toHaveAttribute('data-assembly-ready', 'true');
  return page;
}

async function ada(page) {
  await action(page, 'person-create').click();
  await field(page, 'label').fill('Ada');
  await field(page, 'ratePerHour').fill('120');
  await field(page, 'fundedHours').fill('2');
}

for (const engine of names) {
  test(`${engine}: people and teams publish exact funded amounts, keep membership order and resolve removal dependencies`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const original = await bytes(page);
    await ada(page);
    await expect(people(page).locator('[data-assembly-total]')).toHaveText('$1,440.00');
    await expect(total(page)).toHaveText('$1,200.00');
    await cancel(page).click();
    assert.equal(await bytes(page), original);
    await ada(page); await apply(page).click();
    await expect(total(page)).toHaveText('$1,440.00');
    await expect(people(page).locator('[data-person-configure]')).toHaveAttribute('open', '');
    const adaId = await page.evaluate(() => window.assemblyFixture.studio.read().state.people.find(row => row.label === 'Ada').id);
    await action(page, 'team-create').click();
    await field(page, 'label').fill('Design');
    await people(page).locator(`[data-assembly-member="${adaId}"]`).check();
    await people(page).locator('[data-assembly-member="product-one"]').check();
    await people(page).locator('[data-assembly-action="member-up"][data-assembly-id="product-one"]').click();
    await apply(page).click();
    const design = await page.evaluate(() => window.assemblyFixture.studio.read().state.teams.find(row => row.label === 'Design'));
    await cancel(page).click();
    await expect(people(page).locator(`[data-assembly-team="${design.id}"]`)).toBeFocused();
    await people(page).locator(`[data-assembly-team="${design.id}"]`).click();
    assert.deepEqual(design.personIds, ['product-one', adaId]);
    await expect(total(page)).toHaveText('$1,440.00');
    await expect(people(page).locator('[data-assembly-configure]')).toHaveAttribute('open', '');
    await people(page).locator(`[data-assembly-action="team-up"][data-assembly-id="${design.id}"]`).click();
    assert.equal(await page.evaluate(() => window.assemblyFixture.studio.read().state.teams[0].id), design.id);
    await expect(people(page).locator(`[data-assembly-team="${design.id}"]`)).toBeFocused();
    await people(page).locator('[data-assembly-person]').selectOption('product-one');
    const retained = await bytes(page);
    await action(page, 'person-remove').click();
    await expect(people(page).locator('[data-assembly-dependencies]')).toContainText('Team: Design');
    await expect(people(page).locator('[data-assembly-dependencies]')).toContainText('Work:');
    await expect(apply(page)).toBeDisabled();
    assert.equal(await bytes(page), retained);
    await cancel(page).click();
    await people(page).locator(`[data-assembly-team="${design.id}"]`).click();
    await people(page).locator(`[data-assembly-member="${adaId}"]`).uncheck();
    await apply(page).click();
    await people(page).locator('[data-assembly-person]').selectOption(adaId);
    await action(page, 'person-remove').click(); await apply(page).click();
    await expect(total(page)).toHaveText('$1,200.00');
    await tab(page, 'investment').click();
    await root(page).locator('[data-investment-action="undo"]').click();
    await expect(total(page)).toHaveText('$1,440.00');
    assert.equal(await page.evaluate(id => window.assemblyFixture.studio.read().state.people.some(row => row.id === id), adaId), true);
  });

  test(`${engine}: saved assembly selections retain their target through chapter changes, purpose disclosure and creation collisions`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await action(page, 'team-create').click();
    await field(page, 'label').fill('Operations');
    await people(page).locator('[data-assembly-member="engineering-one"]').check();
    await people(page).locator('[data-person-id="product-one"]').click();
    await people(page).locator('[data-person-configure] input[name="ratePerHour"]').fill('125');
    await people(page).locator('[data-assembly-configure] > summary').click();
    await expect(form(page).locator('fieldset')).toBeEnabled();
    await expect(field(page, 'label')).toHaveValue('Operations');
    await people(page).locator('[data-person-configure] > summary').click();
    await expect(people(page).locator('[data-person-configure] input[name="ratePerHour"]')).toHaveValue('125');
    await expect(people(page).locator('[data-person-configure] fieldset')).toBeEnabled();
    await people(page).locator('[data-assembly-configure] > summary').click();
    await expect(form(page).locator('fieldset')).toBeEnabled();
    await root(page).locator('[data-native-purpose] > summary').click();
    await root(page).locator('[data-native-purpose] > summary').click();
    await expect(field(page, 'label')).toHaveValue('Operations');
    await tab(page, 'coordination').click();
    await root(page).locator('[data-native-configure] input[name="hoursPerSession"]').fill('2');
    await root(page).locator('[data-native-configure] [data-action="apply"]').click();
    await tab(page, 'people').click();
    await expect(people(page)).toHaveAttribute('data-assembly-state', 'stale');
    await expect(field(page, 'label')).toHaveValue('Operations');
    await action(page, 'review').click();
    await expect(people(page).locator('[data-assembly-member="engineering-one"]')).toBeChecked();
    await apply(page).click();
    // Four people × $100/hour × six sessions × (2 hours + 30 minutes).
    await expect(total(page)).toHaveText('$6,000.00');
    await action(page, 'person-create').click();
    await field(page, 'label').fill('Saved person');
    await field(page, 'ratePerHour').fill('95');
    const originalTarget = await page.evaluate(() => window.assemblyFixture.editing.assembly.read().draft.assemblyId);
    await page.evaluate(() => {
      const { studio, editing, controller } = window.assemblyFixture;
      const draft = editing.assembly.read().draft;
      const result = studio.applyCommand({ type: 'person.create', person: { id: draft.targetId, label: 'Imported person', rateCentsPerHour: 1, fundedMinutes: 0 } }, studio.read());
      if (!result.ok) throw Error(result.error.code);
      controller.refresh();
    });
    await expect(action(page, 'freshId')).toBeVisible();
    await action(page, 'freshId').click();
    await expect(field(page, 'label')).toHaveValue('Saved person');
    await expect(field(page, 'ratePerHour')).toHaveValue('95');
    assert.notEqual(await page.evaluate(() => window.assemblyFixture.editing.assembly.read().draft.assemblyId), originalTarget);
    await apply(page).click();
    assert.deepEqual(await page.evaluate(() => window.assemblyFixture.studio.read().state.people.slice(-2).map(row => row.label)), ['Imported person', 'Saved person']);
    await page.evaluate(() => window.assemblyFixture.controller.dispose());
    await expect(action(page, 'person-create')).toBeDisabled();
  });

  test(`${engine}: compact assembly inputs keep feedback below controls and preserve narrow About scrolling`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true);
    await ada(page);
    await people(page).screenshot({ path: resolve(captures, `${engine}-wide.png`) });
    for (const width of [320, 768, 900]) {
      await page.setViewportSize({ width, height: 900 });
      await field(page, 'fundedHours').scrollIntoViewIfNeeded(); await frames(page);
      const bounds = await field(page, 'fundedHours').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      const numeric = await form(page).locator('input[inputmode]').evaluateAll(inputs => inputs.map(input => {
        const css = getComputedStyle(input), canvas = document.createElement('canvas'), context = canvas.getContext('2d');
        context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        return { width: input.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight), digits: context.measureText('00000').width };
      }));
      assert.ok(numeric.every(row => row.width >= row.digits), 'five digits remain visible');
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await field(page, 'ratePerHour').scrollIntoViewIfNeeded(); await frames(page);
    const before = await field(page, 'fundedHours').evaluate(input => input.getBoundingClientRect().top + scrollY);
    await field(page, 'ratePerHour').fill('-1'); await frames(page);
    const after = await field(page, 'fundedHours').evaluate(input => input.getBoundingClientRect().top + scrollY);
    assert.ok(Math.abs(after - before) < 1, 'feedback leaves input rows in place');
    await expect(people(page).locator('[data-assembly-error="ratePerHour"]')).not.toHaveText('');
    await field(page, 'ratePerHour').fill('120');
    const increment = people(page).locator('[data-assembly-action="step"][data-assembly-field="fundedHours"][data-step="1"]');
    await increment.focus(); await page.keyboard.press('Enter');
    await expect(field(page, 'fundedHours')).toHaveValue('3');
    const fieldBox = await field(page, 'fundedHours').boundingBox(), stepBox = await increment.boundingBox();
    assert.ok(stepBox.y >= fieldBox.y + fieldBox.height - 1, 'the step button sits beneath its input');
    await people(page).screenshot({ path: resolve(captures, `${engine}-narrow.png`) });
    await field(page, 'label').scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY), box = await field(page, 'label').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 500);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll + 100);
  });

  test(`${engine}: an accepted assembly callback hands the editor to its successor without resuming retired work`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    try {
      await page.evaluate(async () => {
        const { mountAssemblyPanel } = await import('/collaboration/native-investment-studio/assembly-controller.mjs');
        const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
        const fixture = window.assemblyFixture;
        fixture.controller.dispose();
        const editing = createDraftCoordinator(fixture.studio);
        const element = document.querySelector('[data-native-assembly]');
        let receiver;
        fixture.lifecycle = {
          before: fixture.studio.readAcceptance().sequence,
          retiredPersonNotifications: 0,
          dispose() { receiver?.dispose(); editing.dispose(); },
          read: () => editing.assembly.read(),
        };
        receiver = mountAssemblyPanel(element, {
          studio: fixture.studio, editing,
          onPersonCreated() { fixture.lifecycle.retiredPersonNotifications += 1; },
          onAccepted() {
            receiver.dispose();
            receiver = mountAssemblyPanel(element, { studio: fixture.studio, editing });
            receiver.create('team.create');
            const draft = editing.assembly.read().draft;
            editing.assembly.setText(draft.token, 'label', 'Successor team draft');
            receiver.refresh();
            element.querySelector('[data-assembly-status]').textContent = 'Successor owns the editor.';
            element.querySelector('[data-assembly-form] [name="label"]').focus();
          },
        });
      });
      await ada(page);
      await apply(page).click();
      await expect(field(page, 'label')).toHaveValue('Successor team draft');
      await expect(field(page, 'label')).toBeFocused();
      await expect(people(page).locator('[data-assembly-configure]')).toHaveAttribute('open', '');
      await expect(people(page).locator('[data-assembly-status]')).toHaveText('Successor owns the editor.');
      assert.deepEqual(await page.evaluate(() => {
        const { studio, lifecycle } = window.assemblyFixture;
        const accepted = studio.read();
        return {
          amount: accepted.result.knownCommitmentCents,
          acceptanceCount: studio.readAcceptance().sequence - lifecycle.before,
          addedPerson: accepted.state.people.at(-1).label,
          teamCount: accepted.state.teams.length,
          activeForm: lifecycle.read().draft.form,
          retiredPersonNotifications: lifecycle.retiredPersonNotifications,
        };
      }), { amount: 144000, acceptanceCount: 1, addedPerson: 'Ada', teamCount: 1,
        activeForm: 'team.create', retiredPersonNotifications: 0 });

      await page.evaluate(async () => {
        const { mountAssemblyPanel } = await import('/collaboration/native-investment-studio/assembly-controller.mjs');
        const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
        const fixture = window.assemblyFixture;
        fixture.lifecycle.dispose();
        const element = document.querySelector('[data-native-assembly]');
        let receiver;
        const facade = { ...fixture.studio, applyCommand(...args) {
          const result = fixture.studio.applyCommand(...args);
          receiver.dispose();
          element.querySelector('[data-assembly-status]').textContent = 'Receiver retired during acceptance.';
          return result;
        } };
        const editing = createDraftCoordinator(facade);
        fixture.lifecycle = {
          before: fixture.studio.readAcceptance().sequence,
          acceptedNotifications: 0,
          dispose() { receiver?.dispose(); editing.dispose(); },
        };
        receiver = mountAssemblyPanel(element, {
          studio: facade, editing,
          onAccepted() { fixture.lifecycle.acceptedNotifications += 1; },
        });
      });
      await action(page, 'team-create').click();
      await field(page, 'label').fill('Accepted team');
      await apply(page).click();
      await expect(action(page, 'team-create')).toBeDisabled();
      await expect(people(page).locator('[data-assembly-status]')).toHaveText('Receiver retired during acceptance.');
      assert.deepEqual(await page.evaluate(() => {
        const { studio, lifecycle } = window.assemblyFixture;
        return {
          amount: studio.read().result.knownCommitmentCents,
          acceptanceCount: studio.readAcceptance().sequence - lifecycle.before,
          addedTeam: studio.read().state.teams.at(-1).label,
          acceptedNotifications: lifecycle.acceptedNotifications,
        };
      }), { amount: 144000, acceptanceCount: 1, addedTeam: 'Accepted team', acceptedNotifications: 0 });
    } finally {
      await page.evaluate(() => window.assemblyFixture.lifecycle?.dispose());
    }
  });
}
