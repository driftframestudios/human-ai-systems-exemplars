import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { assertReelFit } from './reel-fit.browser-helper.mjs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-change');
let server, fixture;
registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  fixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>' });
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});
const root = page => page.locator('[data-native-coordination]');
const panel = page => root(page).locator('[data-native-change]');
const action = (page, name) => panel(page).locator(`[data-change-action="${name}"]`);
const field = (page, key) => panel(page).locator(`input[name="${key}"]:not([type="radio"]), input[name="${key}"]:checked, select[name="${key}"]`);
const choice = (page, key, value) => panel(page).locator(`input[type="radio"][name="${key}"][value="${value}"]`);
const check = (page, key, value) => panel(page).locator(`input[name="${key}"][value="${value}"]`);
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const component = (page, framework, id) => panel(page).locator(`section[data-change-framework="${framework}"][data-change-component="${id}"]`);
const componentKey = (page, framework, id) => panel(page).locator(`.native-change__key[data-change-framework="${framework}"][data-change-component="${id}"]`);
const inspector = page => panel(page).locator('.native-change__inspectors');
const inspectorView = (page, name) => inspector(page).locator(`[data-change-action="inspector-view"][data-change-view="${name}"]`);
const motionChoice = (page, mode) => root(page).locator(`[data-native-motion-choice="${mode}"]`);
const total = page => root(page).locator('[data-native-total]');
const bytes = page => page.evaluate(() => window.changeFixture.studio.exportText());
async function open(t, engine) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), telemetry = monitor(page), pending = new Set();
  page.on('request', request => pending.add(request)); page.on('requestfinished', request => pending.delete(request)); page.on('requestfailed', request => pending.delete(request));
  t.after(async () => { try { await expect.poll(() => pending.size).toBe(0); assertTelemetry(telemetry); } finally { await context.close(); } });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route) return request.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    return url.origin === server.origin ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' });
  });
  await page.goto(server.origin + route, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  await page.evaluate(async () => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createExamplePlan } = await import('/collaboration/native-investment-studio/contract.mjs');
    const element = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(element).dispose();
    const plan = createExamplePlan(); plan.people = plan.people.slice(0, 2).map(person => ({ ...person, fundedMinutes: 4800 }));
    plan.teams[0].personIds = plan.people.map(person => person.id);
    plan.work = [{ ...plan.work[0], personIds: [...plan.teams[0].personIds], minutesPerOccurrence: 120, occurrences: 1, funding: 'allocated' }];
    const studio = createStudio(plan); window.changeFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
  });
  await tab(page, 'change').click(); await expect(panel(page)).toHaveAttribute('data-change-state', 'editing');
  await panel(page).locator('.native-change__setup > summary').click();
  await panel(page).locator('.native-change__shared-attention > summary').click(); return page;
}

for (const engine of names) {
  test(`${engine}: exact emphasis follows the framework and preserves shared attention through return and Undo`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    const exact = key => panel(page).locator(`input[data-change-emphasis="${key}"]`);
    const visibleNames = () => panel(page).locator('input[data-change-emphasis]:visible').evaluateAll(inputs => inputs.map(input => input.getAttribute('aria-label')));
    const shared = panel(page).locator('.native-change__shared-attention');
    await shared.locator('summary').click();
    assert.deepEqual(await visibleNames(), ['Urgency', 'Coalition', 'Vision', 'Broad participation', 'Remove barriers', 'Short-term wins', 'Sustain acceleration', 'Anchor in culture'].map(name => `${name} exact emphasis`));
    await exact('kotter/urgency').fill('007');
    await expect(panel(page).locator('[data-change-fader="kotter/urgency"]')).toHaveValue('7');
    await field(page, 'framework').selectOption('adkar@1.0.0');
    assert.deepEqual(await visibleNames(), ['Awareness', 'Desire', 'Knowledge', 'Ability', 'Reinforcement'].map(name => `${name} exact emphasis`));
    await field(page, 'framework').selectOption('kotter@1.0.0');
    await expect(exact('kotter/urgency')).toHaveValue('007');
    assert.equal(await bytes(page), initial, 'switching the framework retains the unfinished proposal and accepted state');
    await field(page, 'framework').selectOption('adkar@1.0.0');
    await exact('adkar/awareness').fill('11');
    await panel(page).getByRole('button', { name: 'Increase awareness emphasis', exact: true }).click();
    await expect(exact('adkar/awareness')).toHaveValue('12');
    await expect(panel(page).locator('[data-change-fader="adkar/awareness"]')).toHaveValue('12');
    await shared.locator('summary').click();
    await expect(field(page, 'attention.urgency')).toHaveValue('12');
    await expect(field(page, 'attention.vision')).toHaveValue('12');
    await field(page, 'attention.vision').fill('19');
    await expect(exact('adkar/awareness')).toHaveValue('19');
    await shared.locator('summary').click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      const layout = await panel(page).locator('.native-change__exact-body').evaluate(body => {
        const box = body.getBoundingClientRect(), style = getComputedStyle(body);
        return { left: box.left, right: box.right, padding: parseFloat(style.paddingInlineStart),
          controls: [...body.querySelectorAll('input,select')].filter(input => input.getClientRects().length).map(input => {
            const rect = input.getBoundingClientRect(); return { left:rect.left, right:rect.right };
          }) };
      });
      assert.ok(layout.padding >= 12 && layout.controls.length >= 8, JSON.stringify(layout));
      assert.ok(layout.left >= 0 && layout.right <= width + 1 && layout.controls.every(box => box.left >= layout.left + layout.padding - 1 && box.right <= layout.right - layout.padding + 1), JSON.stringify(layout));
      await panel(page).locator('.native-change__setup').screenshot({ path: resolve(captures, `${engine}-framework-exact-${width}.png`) });
    }
    await action(page, 'apply').click();
    const accepted = JSON.parse(await bytes(page));
    assert.equal(accepted.changeSettings.activeFramework.frameworkId, 'adkar');
    assert.equal(accepted.changeSettings.attention.channels.find(row => row.channelId === 'urgency').parts, 12);
    assert.equal(accepted.changeSettings.attention.channels.find(row => row.channelId === 'vision').parts, 19);
    await field(page, 'framework').selectOption('kotter@1.0.0');
    await expect(exact('kotter/urgency')).toHaveValue('12'); await expect(exact('kotter/vision')).toHaveValue('19');
    await field(page, 'framework').selectOption('adkar@1.0.0'); await expect(exact('adkar/awareness')).toHaveValue('19');
    await exact('adkar/awareness').fill(' later ');
    await field(page, 'framework').selectOption('kotter@1.0.0');
    await field(page, 'framework').selectOption('adkar@1.0.0');
    await expect(exact('adkar/awareness')).toHaveValue(' later ');
    await expect(exact('adkar/awareness')).toHaveAttribute('aria-invalid', 'true');
    await action(page, 'cancel').click();
    await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), initial, 'amp Undo restores the accepted framework and shared attention together');
  });

  test(`${engine}: Change reel labels retain separate targets and complete wording across viewports`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    const lens = panel(page).locator('[data-change-lens-wheel] .native-reel');
    const framework = panel(page).locator('[data-change-framework-wheel] .native-reel');
    for (const width of [360, 390, 768, 1512, 1920]) {
      await page.setViewportSize({ width, height: 1100 });
      const geometry = await assertReelFit(lens, width);
      await lens.getByRole('button', { name: 'Learning / evidence', exact: true }).click();
      assert.deepEqual(await assertReelFit(lens, width), geometry, 'selection keeps every key size stable');
      await lens.getByRole('button', { name: 'Learning / evidence', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(lens.getByRole('button', { name: 'Executive value', exact: true })).toBeFocused();
      await expect(lens.getByRole('button', { name: 'Executive value', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await assertReelFit(framework, width);
      await panel(page).locator('.native-change__reels').screenshot({ path: resolve(captures, `${engine}-label-fit-${width}.png`) });
    }
  });
  test(`${engine}: the compact Change receiver keeps local edits through views and closes to its initiating pad`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    const trigger = panel(page).locator('.native-change__track-label[data-change-component="urgency"]').first();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      const steps = await panel(page).locator('.native-change__steps > button:visible').evaluateAll(buttons => buttons.map(button => {
        const box = button.getBoundingClientRect(), input = button.parentElement.previousElementSibling.getBoundingClientRect();
        const endAligned = Math.abs(button.previousElementSibling ? box.right - input.right : box.left - input.left) < 1;
        return [box.width, box.height, getComputedStyle(button).borderRadius, box.top >= input.bottom, endAligned];
      }));
      assert.ok(steps.length > 0);
      for (const geometry of steps) assert.deepEqual(geometry, [44, 44, '50%', true, true], 'exact emphasis keeps circular steps beneath its field ends');
      await panel(page).locator('.native-change__precise-channels').first().screenshot({ path:resolve(captures, `${engine}-exact-emphasis-${width}.png`) });
      await trigger.click();
      await expect(inspectorView(page, 'support')).toHaveAttribute('aria-pressed', 'true');
      await choice(page, 'map.kotter.urgency.status', 'look').check();
      await inspectorView(page, 'methods').click();
      await expect(inspector(page).locator('.native-change__suggestion:visible')).toHaveCount(1);
      await inspectorView(page, 'support').click();
      await expect(choice(page, 'map.kotter.urgency.status', 'look')).toBeChecked();
      const geometry = await inspector(page).locator('.studio-rack-header').evaluate(header => {
        const box = header.getBoundingClientRect(), labels = [...header.querySelectorAll('button, h4')].map(element => {
          const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, height: rect.height };
        });
        return { left: box.left, right: box.right, labels };
      });
      assert.ok(geometry.left >= 0 && geometry.right <= width && geometry.labels.every(box => box.left >= geometry.left - 1 && box.right <= geometry.right + 1 && box.height > 0), JSON.stringify(geometry));
      await inspector(page).screenshot({ path: resolve(captures, `${engine}-support-receiver-${width}.png`) });
      await trigger.click();
      await expect(inspector(page)).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(componentKey(page, 'kotter', 'urgency')).toHaveAttribute('aria-pressed', 'false');
      await trigger.click();
      await inspector(page).getByRole('button', { name: 'Back to Change components', exact: true }).click();
      await expect(inspector(page)).toBeHidden(); await expect(trigger).toBeFocused();
    }
    await trigger.click(); await field(page, 'framework').selectOption('adkar@1.0.0');
    await inspector(page).locator('[data-rack-editor-close]').click();
    await expect(componentKey(page, 'adkar', 'awareness')).toBeFocused();
    assert.equal(await bytes(page), initial, 'local inspection and draft edits await canonical Apply');
  });

  test(`${engine}: four-action keys identify the open inspection without changing the plan`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    const rail = panel(page).locator('[data-change-four-actions]');
    const keys = rail.locator('button');
    const inspector = panel(page).locator('.native-change__inspectors');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await expect(keys).toHaveCount(4);
      await expect(rail.locator('[aria-expanded="true"]')).toHaveCount(0);
      for (const id of ['raise', 'reduce', 'eliminate', 'create']) {
        const key = rail.locator(`[data-change-discussion="${id}"]`);
        await key.focus(); await page.keyboard.press('Enter');
        await expect(key).toBeFocused();
        await expect(key).toHaveAttribute('aria-expanded', 'true');
        await expect(rail.locator('[aria-expanded="true"]')).toHaveCount(1);
        await expect(panel(page).locator(`[id="${await key.getAttribute('aria-controls')}"]`)).toBeVisible();
        const faces = await keys.evaluateAll(buttons => buttons.map(button => {
          const style = getComputedStyle(button);
          return { active: button.getAttribute('aria-expanded') === 'true', color: style.color, background: style.backgroundColor, shadow: style.boxShadow };
        }));
        const active = faces.find(face => face.active), resting = faces.find(face => !face.active);
        assert.notEqual(active.background, resting.background, 'the open action has its own visible face');
        assert.notEqual(active.shadow, resting.shadow, 'pressed depth differs from resting depth');
        assert.notEqual(active.color, active.background, 'the active label stays visible');
      }
      await rail.screenshot({ path: resolve(captures, `${engine}-four-actions-${width}.png`) });
      await inspector.locator('[data-rack-editor-close]').focus(); await page.keyboard.press('Space');
      await expect(rail.locator('[aria-expanded="true"]')).toHaveCount(0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    assert.equal(await bytes(page), initial, 'inspection selection remains outside accepted plan history');
    await field(page, 'framework').selectOption('dual@1.0.0');
    const raise = rail.locator('[data-change-discussion="raise"]');
    const create = rail.locator('[data-change-discussion="create"]');
    assert.equal(await raise.getAttribute('data-change-component'), await create.getAttribute('data-change-component'), 'small frameworks reuse a component across distinct actions');
    await create.click();
    await expect(create).toHaveAttribute('aria-expanded', 'true');
    await expect(raise).toHaveAttribute('aria-expanded', 'false');
    await expect(rail.locator('[aria-expanded="true"]')).toHaveCount(1);
    await panel(page).locator('.native-change__track-label').first().click();
    await expect(rail.locator('[aria-expanded="true"]')).toHaveCount(0);
    assert.equal(await bytes(page), initial, 'changing the inspection route also preserves accepted plan history');
  });

  test(`${engine}: Change track carets follow their local inspector through selection and collapse`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    const trackControls = id => panel(page).locator(`.native-change__track-label[data-change-component="${id}"]`);
    const inspector = panel(page).locator('.native-change__inspectors');
    async function expectDisclosure(id, expanded) {
      const controls = trackControls(id);
      await expect(controls).toHaveCount(2);
      for (const control of await controls.all()) {
        await expect(control).toHaveAttribute('aria-expanded', String(expanded));
        await expect.poll(() => control.evaluate(element => {
          const matrix = new DOMMatrix(getComputedStyle(element, '::after').transform);
          return Math.round(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI);
        })).toBe(expanded ? 135 : 45);
        const destination = await control.getAttribute('aria-controls');
        assert.equal(destination, await inspector.getAttribute('id'));
      }
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await expectDisclosure('urgency', false); await expectDisclosure('coalition', false);
      await trackControls('urgency').first().focus(); await page.keyboard.press('Enter');
      await expectDisclosure('urgency', true); await expectDisclosure('coalition', false);
      await expect(component(page, 'kotter', 'urgency')).toBeVisible();
      await trackControls('coalition').last().click();
      await expectDisclosure('urgency', false); await expectDisclosure('coalition', true);
      await expect(component(page, 'kotter', 'coalition')).toBeVisible();
      await inspector.locator('[data-rack-editor-close]').focus(); await page.keyboard.press('Space');
      await expectDisclosure('coalition', false);
      await panel(page).locator('[data-change-tracks]').screenshot({ path: resolve(captures, `${engine}-track-disclosures-${width}.png`) });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    assert.equal(await bytes(page), initial, 'opening and closing a component preserves the accepted plan');
  });

  test(`${engine}: reels choose an authored framework and faders vary its work view before Apply`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    const lens = value => panel(page).locator(`[data-change-lens-wheel] [data-reel-choice="${value}@1.0.0"]`);
    const framework = value => panel(page).locator(`[data-change-framework-wheel] [data-reel-choice="${value}@1.0.0"]`);
    await lens('people').click();
    await expect(lens('people')).toHaveAttribute('aria-pressed', 'true');
    await expect(framework('adkar')).toHaveAttribute('aria-pressed', 'true');
    await expect(field(page, 'framework')).toHaveValue('adkar@1.0.0');
    await expect(panel(page).locator('[data-change-fader]:visible')).toHaveCount(5);
    const knowledge = panel(page).getByRole('slider', { name: 'Knowledge emphasis', exact: true });
    const ability = panel(page).getByRole('slider', { name: 'Ability emphasis', exact: true });
    const abilityBefore = await ability.inputValue();
    await knowledge.focus(); await page.keyboard.press('End');
    await expect(knowledge).toHaveValue('25'); await expect(ability).toHaveValue(abilityBefore);
    await expect(panel(page).locator('[data-change-tracks]')).toContainText('Weekly working session');
    assert.equal(await bytes(page), initial, 'preset selection owns a draft until Apply');
    await lens('people').focus(); await page.keyboard.press('ArrowRight');
    await expect(lens('operating')).toHaveAttribute('aria-pressed', 'true');
    await expect(framework('npt')).toHaveAttribute('aria-pressed', 'true');
    await framework('kotter').click();
    await componentKey(page, 'kotter', 'urgency').click();
    await choice(page, 'map.kotter.urgency.status', 'look').check();
    await check(page, 'map.kotter.urgency.workIds', 'review').check();
    await framework('adkar').click(); await framework('kotter').click();
    await expect(choice(page, 'map.kotter.urgency.status', 'look')).toBeChecked();
    await expect(check(page, 'map.kotter.urgency.workIds', 'review')).toBeChecked();
    const beforeLanes = await panel(page).locator('[data-change-lane="focus"] [data-change-action="component"]:visible').evaluateAll(rows => rows.map(row => row.dataset.changeComponent));
    for (const id of ['urgency', 'coalition', 'vision', 'broad-participation', 'remove-barriers', 'short-term-wins', 'sustain-acceleration', 'anchor-in-culture']) {
      await field(page, `attention.${id}`).fill(id === 'urgency' ? '25' : '0');
    }
    const fader = panel(page).locator('[data-change-fader="kotter/urgency"]');
    await fader.focus(); await page.keyboard.press('ArrowDown'); await expect(field(page, 'attention.urgency')).toHaveValue('24');
    await expect(field(page, 'framework')).toHaveValue('kotter@1.0.0');
    await expect(panel(page).locator('.native-change__key[hidden][aria-pressed="true"]')).toHaveCount(0);
    const afterLanes = await panel(page).locator('[data-change-lane="focus"] [data-change-action="component"]:visible').evaluateAll(rows => rows.map(row => row.dataset.changeComponent));
    assert.notDeepEqual(afterLanes, beforeLanes); assert.deepEqual(afterLanes, ['urgency']);
    const pad = panel(page).locator('[data-change-action="support-pad"][data-change-map="map.kotter.urgency.workIds"][data-change-work="review"]');
    await expect(pad).toHaveAttribute('aria-pressed', 'true'); await pad.focus(); await page.keyboard.press('Space');
    await expect(pad).toHaveAttribute('aria-pressed', 'false'); await expect(pad).toBeFocused();
    await pad.click(); await expect(check(page, 'map.kotter.urgency.workIds', 'review')).toBeChecked();
    assert.equal(await bytes(page), initial);
    await panel(page).locator('[data-rack-editor-close]').click();
    await panel(page).locator('.native-change__setup > summary').click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      const reels = await panel(page).locator('.native-reel__wheel').evaluateAll(rows => rows.map(row => { const box = row.getBoundingClientRect(); return { width: box.width, height: box.height, right: box.right }; }));
      assert.equal(reels.length, 2); assert.ok(reels.every(box => box.width > 100 && box.height > 100 && box.right <= width + 1), JSON.stringify(reels));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (width === 390) {
        const orientation = await panel(page).locator('[data-change-fader]:visible').evaluateAll(inputs => inputs.map(input => getComputedStyle(input).writingMode));
        assert.ok(orientation.every(value => value === 'horizontal-tb'));
      }
      await panel(page).locator('.native-change__reels').screenshot({ path: resolve(captures, `${engine}-reels-${width}.png`) });
      await panel(page).locator('[data-change-mixer]').screenshot({ path: resolve(captures, `${engine}-faders-${width}.png`) });
      await panel(page).locator('[data-change-matrix]').screenshot({ path: resolve(captures, `${engine}-work-${width}.png`) });
    }
    await action(page, 'apply').click(); await expect(total(page)).toHaveText('$16,000.00');
    const accepted = JSON.parse(await bytes(page));
    assert.equal(accepted.changeSettings.attention.channels[0].parts, 24);
    assert.deepEqual(accepted.changeSettings.frameworkMaps[0].components[0].workIds, ['review']);
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-deck="compare"]').click(); await root(page).locator('[data-investment-action="undo"]').click();
    assert.equal(await bytes(page), initial);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { studio, controller } = window.changeFixture;
      const result = studio.importText(JSON.stringify(createShowcasePlan()), studio.read());
      if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    await tab(page, 'change').click();
    if (await action(page, 'current').isVisible()) await action(page, 'current').click();
    await expect(panel(page).locator('[data-change-map="map.kotter.urgency.workIds"][data-change-work="research"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(panel(page).locator('.native-change__manual')).toHaveCount(0);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await panel(page).screenshot({ path: resolve(captures, `${engine}-populated-${width}.png`) });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
  });

  test(`${engine}: a configured supporting session applies with the settings, while stale raw attention remains recoverable`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const urgency = component(page, 'kotter', 'urgency'); await componentKey(page, 'kotter', 'urgency').click();
    await field(page, 'sourceFilter').selectOption('core');
    await inspectorView(page, 'methods').click();
    await urgency.locator('[data-change-action="suggest"][data-change-source="core"]').first().click();
    await field(page, 'proposal.label').fill('Pilot discussion');
    await panel(page).locator('[data-native-create="person"][data-native-return-field="proposal.personIds"]').click();
    const assembly = root(page).locator('[data-native-assembly]');
    await assembly.locator('[data-assembly-form] [name="label"]').fill('Quality reviewer');
    await assembly.locator('[data-assembly-form] [name="ratePerHour"]').fill('100'); await assembly.locator('[data-assembly-apply]').click();
    await root(page).locator('[data-native-return-action]').click(); await action(page, 'review').click();
    await expect(field(page, 'proposal.label')).toHaveValue('Pilot discussion');
    await expect(check(page, 'proposal.personIds', 'product-one')).toBeFocused();
    const beforeProposal = await bytes(page);
    await field(page, 'proposal.teamId').selectOption('delivery');
    await check(page, 'proposal.personIds', 'product-one').check();
    const proposalDial = panel(page).locator('[data-native-minutes-knob]');
    await expect(panel(page).getByLabel('Working sessions', { exact: true })).toHaveValue('1');
    await proposalDial.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowUp');
    await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('1'); await page.keyboard.press('End');
    await panel(page).locator('[data-change-action="step"][data-change-field="proposal.minutesPerSession"][data-change-step="1"]').click();
    await expect(field(page, 'proposal.hoursPerSession')).toHaveValue('1'); await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('0');
    await expect(proposalDial).toHaveValue('0');
    await field(page, 'proposal.hoursPerSession').fill('1'); await field(page, 'proposal.minutesPerSession').fill('30');
    await expect(proposalDial).toHaveValue('30');
    const proposalHours = panel(page).locator('[data-native-hours-knob]');
    await proposalHours.focus(); await page.keyboard.press('ArrowUp');
    await expect(field(page, 'proposal.hoursPerSession')).toHaveValue('2'); await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('30');
    await page.keyboard.press('ArrowDown'); await expect(field(page, 'proposal.hoursPerSession')).toHaveValue('1');
    await choice(page, 'proposal.funding', 'additional').check();
    await expect(panel(page).locator('[data-change-preview]')).toContainText('Proposed investment: $16,150.00'); await expect(total(page)).toHaveText('$16,000.00');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      const boxes = await inspector(page).locator('input[type="checkbox"]:visible, input[type="radio"]:visible').evaluateAll(inputs => inputs.map(input => {
        const box = input.getBoundingClientRect(); return { width: box.width, height: box.height };
      }));
      assert.ok(boxes.every(box => box.width >= 12 && box.width <= 40 && box.height <= 28), JSON.stringify(boxes));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await inspector(page).screenshot({ path: resolve(captures, `${engine}-session-receiver-${width}.png`) });
    }
    await inspector(page).locator('[data-rack-editor-apply]').click(); await expect(total(page)).toHaveText('$16,150.00');
    await expect(inspector(page).locator('[data-rack-editor-apply]')).toBeFocused();
    await inspectorView(page, 'support').click();
    await expect(urgency.locator('.native-change__component-preview')).toContainText('Pilot discussion');
    await urgency.locator('[data-change-action="work"][data-change-work="change-work-1"]').click();
    await expect(root(page).locator('[data-native-chapter-panel="coordination"]')).toBeVisible();
    await root(page).locator('[data-native-return-action]').click(); await expect(panel(page)).toBeVisible();
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-deck="compare"]').click(); await root(page).locator('[data-investment-action="undo"]').click();
    assert.equal(await bytes(page), beforeProposal); await tab(page, 'change').click();
    if (await action(page, 'current').isVisible()) await action(page, 'current').click();
    await field(page, 'attention.urgency').fill(' later '); await tab(page, 'people').click();
    await page.evaluate(() => {
      const { studio, controller } = window.changeFixture, plan = JSON.parse(studio.exportText()); plan.purpose.changedAbility = 'Changed receiving task';
      const result = studio.importText(JSON.stringify(plan), studio.read()); if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    await tab(page, 'change').click(); await expect(panel(page)).toHaveAttribute('data-change-state', 'stale');
    const staleAccepted = await bytes(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(motionChoice(page, 'full')).toBeEnabled(); await motionChoice(page, 'full').check();
    await expect(root(page)).toHaveAttribute('data-native-motion', 'full');
    await motionChoice(page, 'lower').check(); assert.equal(await bytes(page), staleAccepted);
    await action(page, 'review').click(); await expect(field(page, 'attention.urgency')).toHaveValue(' later ');
    await expect(field(page, 'attention.urgency')).toHaveAttribute('aria-invalid', 'true');
    await field(page, 'attention.urgency').fill('25');
    await page.setViewportSize({ width: 390, height: 1000 });
    await motionChoice(page, 'lower').scrollIntoViewIfNeeded();
    const motionBoxes = await root(page).locator('.native-motion__choices label').evaluateAll(labels => labels.map(label => {
      const box = label.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height };
    }));
    assert.ok(motionBoxes.every(box => box.left >= -.5 && box.right <= 390.5 && box.height >= 44), JSON.stringify(motionBoxes));
    await root(page).locator('.native-motion').screenshot({ path: resolve(captures, `${engine}-motion-narrow.png`) });
    await field(page, 'attention.urgency').scrollIntoViewIfNeeded();
    const boxes = await panel(page).locator('[data-change-mixer] input:visible').evaluateAll(inputs => inputs.map(input => {
      const box = input.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, height: box.height };
    }));
    assert.ok(boxes.every(box => box.left >= -.5 && box.right <= 390.5 && box.width > 0 && box.height > 0), JSON.stringify(boxes));
    await page.emulateMedia({ forcedColors: 'active' });
    const fader = panel(page).locator('[data-change-fader="kotter/urgency"]'); await fader.focus(); await page.keyboard.press('ArrowDown');
    await expect(field(page, 'attention.urgency')).toHaveValue('24');
    await panel(page).locator('[data-change-mixer]').screenshot({ path: resolve(captures, `${engine}-narrow-forced.png`) });
    const accepted = await bytes(page); await page.evaluate(() => window.changeFixture.controller.dispose());
    await field(page, 'attention.urgency').evaluate(input => { input.value = '5'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await bytes(page), accepted); await expect(field(page, 'attention.urgency')).toBeDisabled();
  });
  test(`${engine}: method examples explain a supporting session before its proposal changes investment`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    const vision = component(page, 'kotter', 'vision'); await componentKey(page, 'kotter', 'vision').click();
    await inspectorView(page, 'methods').click();
    const method = id => vision.locator(`[data-change-method="${id}"]`);
    const chooseMethod = id => vision.locator(`[data-change-method-choice="${id}"]`).click();
    await chooseMethod('poda');
    await expect(method('poda')).toContainText('what the team needs to learn');
    await chooseMethod('impact-map');
    await expect(method('impact-map')).toContainText('people affected');
    await chooseMethod('strategy-canvas');
    await expect(method('strategy-canvas')).toContainText('current support');
    await chooseMethod('poda');
    const disclosure = method('poda').locator('details > summary');
    await disclosure.focus(); await page.keyboard.press('Space');
    await expect(method('poda').locator('details')).toHaveAttribute('open', '');
    await expect(method('poda')).toContainText('Discoverable');
    await expect(method('poda').getByRole('link')).toHaveAttribute('href', /poda\.html#poda-prototype-title$/);
    await expect(method('poda').getByRole('link')).toHaveAttribute('target', '_blank');
    assert.equal(await bytes(page), initial, 'reading a method preserves the accepted plan');
    await disclosure.click();
    for (const width of [1280, 1920]) {
      await page.setViewportSize({ width, height: 1100 });
      const boxes = await vision.locator('[data-change-method]:visible').evaluateAll(cards => cards.map(card => {
        const rect = card.getBoundingClientRect(); return { x: rect.x, y: rect.y, right: rect.right, width: rect.width };
      }));
      assert.equal(boxes.length, 1, 'method pads share one local inspector');
      assert.ok(boxes.every(box => box.x >= 0 && box.right <= width && box.width >= 280), JSON.stringify(boxes));
      await vision.screenshot({ path: resolve(captures, `${engine}-methods-${width}.png`) });
    }
    await method('poda').getByRole('button', { name: 'Plan supporting work for PODA', exact: true }).click();
    await expect(field(page, 'proposal.label')).toHaveValue('Clarify purpose and next learning');
    await expect(panel(page).locator('section[data-change-work]')).toContainText('PODA supports Vision');
    await field(page, 'proposal.teamId').selectOption('delivery');
    await check(page, 'proposal.personIds', 'product-one').check();
    await field(page, 'proposal.minutesPerSession').fill('45');
    await field(page, 'proposal.occurrences').fill('2');
    await choice(page, 'proposal.funding', 'additional').check();
    await expect(panel(page).locator('[data-change-preview]')).toContainText('$16,150.00');
    await inspectorView(page, 'methods').click();
    await chooseMethod('strategy-canvas'); await method('strategy-canvas').locator('details > summary').click();
    await expect(method('strategy-canvas')).toContainText('good-enough');
    await field(page, 'sourceFilter').selectOption('enterprise');
    await inspectorView(page, 'session').click();
    await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('45');
    await inspectorView(page, 'methods').click();
    assert.equal(await bytes(page), initial, 'explanations and filters leave the proposed work unaccepted');
    await field(page, 'sourceFilter').selectOption('core');
    await page.setViewportSize({ width: 390, height: 1000 });
    await chooseMethod('poda');

    await method('poda').scrollIntoViewIfNeeded();
    const narrow = await vision.locator('[data-change-method]:visible').evaluateAll(cards => cards.map(card => {
      const rect = card.getBoundingClientRect(); return { x: rect.x, right: rect.right, width: rect.width };
    }));
    assert.ok(narrow.every(box => box.x >= -.5 && box.right <= 390.5 && box.width > 0), JSON.stringify(narrow));
    await method('poda').screenshot({ path: resolve(captures, `${engine}-method-narrow.png`) });
    await action(page, 'apply').click(); await expect(total(page)).toHaveText('$16,150.00');
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-deck="compare"]').click(); await root(page).locator('[data-investment-action="undo"]').click();
    assert.equal(await bytes(page), initial, 'one Undo restores the exact preceding accepted plan');
  });

}
