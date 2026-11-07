import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-assurance');
let server, fixture;
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  fixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>' });
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => { try { await Promise.all([...browsers.values()].map(browser => browser.close())); } finally { await server?.close(); } });
const root = page => page.locator('[data-native-coordination]');
const panel = page => root(page).locator('[data-native-assurance]');
const action = (page, name) => panel(page).locator(`[data-assurance-action="${name}"]`);
const field = (page, key) => panel(page).locator(`input[name="${key}"], select[name="${key}"], textarea[name="${key}"]`);
const check = (page, key, value) => panel(page).locator(`input[name="${key}"][value="${value}"]`);
const selectConcept = (page, id) => panel(page).locator(`input[data-assurance-selection="concept"][value="${id}"]`).click();
const selectScenario = (page, id) => panel(page).locator(`input[data-assurance-selection="scenario"][value="${id}"]`).click();
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);

const total = page => root(page).locator('[data-native-total]');
const bytes = page => page.evaluate(() => window.assuranceFixture.studio.exportText());
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
    const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
    const element = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(element).dispose();
    const plan = createShowcasePlan();
    const studio = createStudio(plan); window.assuranceFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
  });
  await tab(page, 'assurance').click(); await expect(panel(page)).toHaveAttribute('data-assurance-state', 'editing'); return page;
}

for (const engine of names) {
  test(`${engine}: quality reels and faders populate a distinct recoverable arrangement and keep both reels visible on mobile`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    await expect(panel(page).locator('.native-quality-rack')).toHaveAttribute('data-quality-pressure', 'calm');
    await expect(panel(page).locator('input[type="range"][data-assurance-field="sigmaHalfSteps"]')).toHaveValue('4');
    const before = panel(page).getByRole('group', { name: 'Before release', exact: true });
    const after = panel(page).getByRole('group', { name: 'After release', exact: true });
    await before.getByRole('button', { name: 'Security', exact: true }).click();
    await after.getByRole('button', { name: 'Learn', exact: true }).click();
    await panel(page).locator('[data-quality-fader="urgency"]').fill('4');
    await expect(before).toHaveAttribute('data-reel-value', 'risk-based-testing');
    await expect(after).toHaveAttribute('data-reel-value', 'post-release-learning');
    await expect(panel(page).locator('[data-assurance-pad="specialist-unavailable"] input')).toBeChecked();
    assert.equal(await bytes(page), initial);
    await panel(page).getByRole('button', { name: 'Rehearsal settings', exact: true }).click();
    const rehearsal = panel(page).locator('[data-assurance-rehearsal="explore-specialist-unavailable"]');
    await rehearsal.locator('summary').first().click();
    await rehearsal.getByText('Edit this example', { exact: true }).click();
    await expect(field(page, 'rehearsal.explore-specialist-unavailable.context')).toHaveValue(/specialist.*unavailable/i);
    await expect(field(page, 'rehearsal.explore-specialist-unavailable.response')).toHaveValue(/alternate reviewer/);
    await expect(field(page, 'rehearsal.explore-specialist-unavailable.observation')).toHaveCount(0);
    await action(page, 'cancel').click(); assert.equal(await bytes(page), initial);
    await before.getByRole('button', { name: 'Data quality', exact: true }).click();
    await panel(page).locator('[data-quality-fader="compliance"]').fill('4');
    await selectConcept(page, 'security-privacy');
    await check(page, 'concept.security-privacy.workIds', 'review').check();
    await action(page, 'apply').click();
    const settings = await page.evaluate(() => window.assuranceFixture.studio.read().state.assuranceSettings);
    assert.ok(settings.quality.concepts.find(row => row.conceptId === 'security-privacy').included);
    assert.ok(settings.rehearsals.some(row => row.context && row.response && row.observation === null));
    assert.notEqual(await bytes(page), initial);
    const accepted = await bytes(page);
    await page.evaluate(async () => {
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      const current = window.assuranceFixture;
      current.controller.dispose();
      current.controller = mountCoordinationPanel(document.querySelector('[data-native-coordination]'), { studio: current.studio });
    });
    await tab(page, 'assurance').click();
    await expect(panel(page).locator('.native-quality-tracks [data-assurance-concept-id="security-privacy"][data-assurance-work="review"]')).toHaveAttribute('aria-pressed', 'true');
    await selectConcept(page, 'security-privacy');
    await panel(page).locator('[data-assurance-concept="security-privacy"] [data-assurance-target="concept/security-privacy"]').click();
    await expect(panel(page).locator('[data-assurance-work=""]')).toBeVisible();
    await field(page, 'proposal.label').fill('Check the release access rules');
    assert.equal(await bytes(page), accepted);
    await action(page, 'cancel').click(); assert.equal(await bytes(page), accepted);
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-action="undo"]').click(); assert.equal(await bytes(page), initial);
    await tab(page, 'assurance').click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      const geometry = await panel(page).locator('.native-reel__wheel').evaluateAll(nodes => nodes.map(node => {
        const box = node.getBoundingClientRect(); return { width: box.width, left: box.left, right: box.right };
      }));
      const faders = await panel(page).locator('.native-quality-rack__faders input').evaluateAll(nodes => nodes.map(node => { const box=node.getBoundingClientRect(); return { left:box.left, right:box.right, height:box.height }; }));
      assert.ok(faders.every(box => box.height > 50 && box.left >= 0 && box.right <= width), JSON.stringify(faders));
      assert.equal(geometry.length, 2); assert.ok(geometry.every(box => box.width > 80 && box.left >= 0 && box.right <= width), JSON.stringify(geometry));
      await panel(page).locator('.native-quality-rack').screenshot({ path: resolve(captures, `${engine}-quality-rack-${width}.png`) });
      await panel(page).locator('.native-quality-board').screenshot({ path: resolve(captures, `${engine}-quality-board-${width}.png`) });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    }
  });
  test(`${engine}: recovery work previews its people and $100 before Apply, baseline comparison and Undo`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    await expect(total(page)).toHaveText('$3,980.00');
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-action="baseline"]').click(); await tab(page, 'assurance').click();
    await panel(page).getByRole('button', { name: 'Recovery events and learning work', exact: true }).click(); await action(page, 'add-event').click();
    const event = panel(page).locator('[data-assurance-event="event-1"]');
    await field(page, 'event.event-1.label').fill('Recover the interrupted request');
    await field(page, 'event.event-1.receiverPersonId').selectOption('sam');
    await field(page, 'event.event-1.reviewBoundary').fill('Quality checks that the saved request can resume.');
    await event.locator('[data-assurance-action="propose"]').click();
    await field(page, 'proposal.label').fill('Repeat the interrupted request');
    await field(page, 'proposal.teamId').selectOption('operations');
    await check(page, 'proposal.personIds', 'noor').check();
    await check(page, 'proposal.personIds', 'sam').check();
    const minutesDial = panel(page).locator('[data-native-minutes-knob]');
    await expect(panel(page).getByLabel('Working sessions', { exact: true })).toHaveValue('1');
    await minutesDial.focus(); await page.keyboard.press('End'); await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('59');
    await panel(page).locator('[data-assurance-action="step"][data-assurance-field="proposal.minutesPerSession"][data-assurance-step="1"]').click();
    await expect(field(page, 'proposal.hoursPerSession')).toHaveValue('1'); await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('0'); await expect(minutesDial).toHaveValue('0');
    await field(page, 'proposal.minutesPerSession').fill(' later '); await expect(minutesDial).toBeDisabled();
    await field(page, 'proposal.hoursPerSession').fill('0'); await field(page, 'proposal.minutesPerSession').fill('30');
    const hoursDial = panel(page).locator('[data-native-hours-knob]');
    await hoursDial.focus(); await page.keyboard.press('ArrowUp');
    await expect(field(page, 'proposal.hoursPerSession')).toHaveValue('1'); await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('30');
    await page.keyboard.press('Home'); await expect(field(page, 'proposal.hoursPerSession')).toHaveValue('0');
    await minutesDial.scrollIntoViewIfNeeded(); await minutesDial.evaluate(node => node.addEventListener('pointerdown', event => { window.assuranceFixture.pointerId = event.pointerId; }, { once: true }));
    const dialBox = await minutesDial.boundingBox(); await page.mouse.move(dialBox.x + dialBox.width * .9, dialBox.y + dialBox.height / 2); await page.mouse.down();
    await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('49');
    await minutesDial.evaluate(node => node.releasePointerCapture(window.assuranceFixture.pointerId));
    await page.mouse.move(dialBox.x + dialBox.width * .91, dialBox.y + dialBox.height / 2);
    await page.mouse.up(); await field(page, 'proposal.minutesPerSession').focus();
    await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('49');
    await page.mouse.move(dialBox.x + dialBox.width * .9, dialBox.y + dialBox.height / 2); await page.mouse.down();
    await tab(page, 'people').focus(); await page.keyboard.press('Enter');
    assert.equal(await minutesDial.evaluate(node => node.hasPointerCapture(window.assuranceFixture.pointerId)), false);
    await minutesDial.evaluate(node => node.dispatchEvent(new PointerEvent('pointermove', { pointerId: window.assuranceFixture.pointerId, clientX: 0, clientY: 0, bubbles: true })));
    await page.mouse.up(); await tab(page, 'assurance').click(); await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('49');
    await field(page, 'proposal.minutesPerSession').fill('30'); await check(page, 'proposal.funding', 'additional').check();
    const time = panel(page).locator('.native-time-controls');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      const boxes = await time.evaluate(node => {
        const box = element => { const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height }; };
        const module = node.querySelector('.studio-duration');
        const part = unit => { const group = module.querySelector(`.native-coordination__control--${unit}`); return { ...box(group),
          dial:box(group.querySelector('.native-knob')), stepper:box(group.querySelector('.native-coordination__stepper')),
          input:box(group.querySelector('.native-coordination__stepper input')),
          buttons:[...group.querySelectorAll('.native-coordination__stepper button')].map(box), background:getComputedStyle(group).backgroundColor }; };
        const count = node.querySelector('.native-coordination__control--count');
        return { all:box(node), module:box(module), output:box(module.querySelector('output')), hours:part('hours'), minutes:part('minutes'),
          separateCount:!module.contains(count), border:parseFloat(getComputedStyle(module).borderTopWidth),
          outputFont:parseFloat(getComputedStyle(module.querySelector('output strong')).fontSize),
          fieldFont:parseFloat(getComputedStyle(module.querySelector('.native-coordination__stepper input')).fontSize),
          outputFor:module.querySelector('output').htmlFor.value,
          fieldIds:[...module.querySelectorAll('.native-coordination__stepper input')].map(input => input.id) };
      });
      assert.ok(boxes.separateCount, 'Working sessions stays outside the duration enclosure');
      assert.ok(boxes.border > 0 && boxes.outputFont > boxes.fieldFont, 'a visible housing and larger combined reading establish the duration hierarchy');
      assert.deepEqual(boxes.outputFor.split(' '), boxes.fieldIds, 'the combined readout keeps both exact-field associations');
      assert.ok(boxes.output.bottom <= Math.min(boxes.hours.y, boxes.minutes.y), 'the combined duration readout stays above both controls');
      assert.ok(boxes.hours.dial.width > boxes.minutes.dial.width, 'Hours carries the larger dial');
      assert.notEqual(boxes.hours.background, boxes.minutes.background, 'Minutes has a distinct secondary face');
      if (width === 1440) assert.ok(Math.abs(boxes.hours.y-boxes.minutes.y) < 1 && boxes.hours.right <= boxes.minutes.x + 1,
        `Hours and Minutes share a row on laptop: ${JSON.stringify(boxes)}`);
      for (const unit of ['hours', 'minutes']) {
        const part = boxes[unit], [minus, plus] = part.buttons;
        assert.ok(part.stepper.x >= (width === 1440 ? part.dial.right - 1 : part.dial.x + 1) && part.stepper.y > part.dial.y,
          `${unit} exact field sits toward its dial's lower right: ${JSON.stringify(part)}`);
        assert.ok(minus.y >= part.input.bottom && plus.y >= part.input.bottom && plus.x > minus.right + 2,
          `${unit} keeps a spaced pair beneath its exact field`);
        assert.ok(Math.abs(minus.width-minus.height) < 1 && Math.abs(plus.width-plus.height) < 1, 'steppers retain circular geometry');
        assert.ok(Math.abs((minus.x+plus.right)-(part.input.x+part.input.right)) < 2, 'step pair stays centered under the field');
        assert.ok(part.x >= boxes.module.x && part.right <= boxes.module.right && part.bottom <= boxes.module.bottom,
          `${unit} remains inside its enclosure`);
      }
      assert.ok(boxes.all.x >= 0 && boxes.all.right <= width && boxes.module.right <= boxes.all.right,
        `the supporting duration module stays within the viewport: ${JSON.stringify(boxes)}`);
      await time.screenshot({ path: resolve(captures, `${engine}-supporting-time-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1100 }); await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await expect(panel(page).locator('[data-assurance-work-preview]')).toContainText('30 minutes per person × 2 people × 1 occurrences = 60 aggregate person-minutes');
    await expect(panel(page).locator('[data-assurance-preview]')).toContainText('Proposed investment: $4,080.00. Accepted investment: $3,980.00. Change: $100.00');
    await expect(total(page)).toHaveText('$3,980.00'); assert.equal(await bytes(page), initial);
    await action(page, 'apply').click(); await expect(total(page)).toHaveText('$4,080.00');
    await expect(event.locator('summary')).toContainText('Repeat the interrupted request');
    await event.locator('[data-assurance-action="work"]').click(); await expect(root(page).locator('[data-native-chapter-panel="coordination"]')).toBeVisible();
    await root(page).locator('[data-session-action="remove"]').click();
    const dependencies = root(page).locator('[data-native-session-dependencies]');
    await expect(dependencies).toContainText('Recovery event: Recover the interrupted request.');
    await expect(root(page).locator('[data-native-session-editor] [data-action="apply"]')).toBeDisabled();
    await dependencies.locator('[data-native-open-assurance]').click(); await expect(panel(page)).toBeVisible();
    await tab(page, 'investment').click(); await expect(root(page).locator('[data-investment-comparison]')).toContainText('Change$100.00');
    await root(page).locator('[data-investment-action="undo"]').click(); assert.equal(await bytes(page), initial);
    await tab(page, 'assurance').click(); if (await action(page, 'current').isVisible()) await action(page, 'current').click();
    await panel(page).getByRole('button', { name: 'Quality illustration', exact: true }).click();
    await panel(page).locator('[data-assurance-assumptions] > summary').click();
    await field(page, 'allocationPercent').fill('32'); await action(page, 'cancel').click(); await expect(field(page, 'allocationPercent')).toHaveValue('18'); assert.equal(await bytes(page), initial);
  });

  test(`${engine}: authored pressure, movable check pads and work tracks remain reversible and respect motion settings`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    const rack = panel(page).locator('.native-quality-rack'), sigma = panel(page).locator('input[type="range"][data-assurance-field="sigmaHalfSteps"]');
    await sigma.fill('1'); await panel(page).locator('[data-quality-fader="quality"]').fill('0');
    await expect(rack).toHaveAttribute('data-quality-pressure', 'high'); await expect(rack).toHaveAttribute('data-quality-extreme', 'true');
    const risk = panel(page).locator('[data-assurance-pad="risk-based-testing"]');
    await expect(panel(page).locator('[data-quality-phase="rehearse"] [data-assurance-pad="risk-based-testing"]')).toBeVisible();
    await expect(risk).toContainText('Raise Sigma');
    const include = panel(page).locator('.native-quality-tracks [data-assurance-action="toggle-concept"][data-assurance-concept-id="risk-based-testing"]');
    await expect(include).toBeDisabled(); assert.equal(await bytes(page), initial);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await rack.screenshot({ path: resolve(captures, `${engine}-high-pressure-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    const rotor = rack.locator('.native-reel__rotor').first();
    await expect(rotor).toHaveCSS('animation-name', 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(rotor).toHaveCSS('animation-name', 'quality-reel-stutter');
    await root(page).locator('[data-native-motion-choice="off"]').check();
    await expect(rotor).toHaveCSS('animation-name', 'none');
    assert.equal(await bytes(page), initial, 'decorative pressure effects preserve the accepted plan');
    await sigma.fill('5'); await panel(page).locator('[data-quality-fader="quality"]').fill('2');
    await expect(rack).toHaveAttribute('data-quality-pressure', 'calm'); await expect(include).toBeEnabled();
    await expect(panel(page).locator('[data-quality-phase="prepare"] [data-assurance-pad="risk-based-testing"]')).toBeVisible();
    await include.click(); await expect(include).toHaveAttribute('aria-pressed', 'false');
    const link = panel(page).locator('.native-quality-tracks [data-assurance-action="link-work"][data-assurance-concept-id="risk-based-testing"][data-assurance-work="research"]');
    await link.click(); await expect(link).toHaveAttribute('aria-pressed', 'true');
    await action(page, 'cancel').click(); assert.equal(await bytes(page), initial);
    await expect(link).toHaveAttribute('aria-pressed', 'false');
    await selectScenario(page, 'recovery-failure');
    const complication = panel(page).locator('[data-assurance-complication="recovery-failure"]');
    await complication.locator('[data-assurance-action="rehearse"]').click();
    const response = complication.locator('[data-assurance-rehearsal="rehearsal-1"]');
    await expect(response.locator('.native-quality-story')).toContainText('Restore the saved request');
    await expect(response.locator('[name$=".observation"]')).toHaveCount(0);
    await action(page, 'apply').click();
    const state = await page.evaluate(() => window.assuranceFixture.studio.read().state);
    assert.equal(state.assuranceSettings.rehearsals[0].observation, null);
    await page.evaluate(() => {
      const { studio, controller } = window.assuranceFixture, plan = JSON.parse(studio.exportText());
      plan.assuranceSettings.quality.sigmaHalfSteps = 2;
      plan.assuranceSettings.rehearsals[0].observation = 'The saved request resumed during the reviewed walkthrough.';
      const result = studio.importText(JSON.stringify(plan), studio.read()); if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    if (await action(page, 'current').isVisible()) await action(page, 'current').click();
    await expect(sigma).toHaveValue('1'); await expect(rack).toHaveAttribute('data-quality-pressure', 'high');
    await expect(response.locator('[data-assurance-observation]')).toHaveText('The saved request resumed during the reviewed walkthrough.');
    await panel(page).getByRole('button', { name: 'Quality illustration', exact: true }).click();
    await panel(page).locator('[data-assurance-assumptions] > summary').click();
    await field(page, 'independentRate').fill('100.25');
    await panel(page).locator('[data-rate-step="10"]').focus(); await page.keyboard.press('ArrowRight');
    await expect(field(page, 'independentRate')).toHaveValue('110.25');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await rack.screenshot({ path: resolve(captures, `${engine}-pressure-rack-${width}.png`) });
      await panel(page).locator('.native-quality-workbench').screenshot({ path: resolve(captures, `${engine}-compact-quality-${width}.png`) });
    }
  });

  test(`${engine}: Cancel and Undo move a reused rehearsal ID to its current scenario, and a missing reviewer returns to the saved response`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await panel(page).getByRole('button', { name: 'Rehearsal settings', exact: true }).click();
    const scenario = id => panel(page).locator(`[data-assurance-complication="${id}"]`);
    await scenario('review-change').locator('[data-assurance-action="rehearse"]').click();
    await scenario('review-change').getByText('Edit this example', { exact: true }).click();
    await field(page, 'rehearsal.rehearsal-1.context').fill('First scenario context');
    await action(page, 'cancel').click();
    await selectScenario(page, 'recovery-failure');
    await scenario('recovery-failure').locator('[data-assurance-action="rehearse"]').click();
    const recoveryResponse = scenario('recovery-failure').locator('[data-assurance-rehearsal="rehearsal-1"]');
    await expect(recoveryResponse).toBeVisible();
    await expect(scenario('review-change').locator('[data-assurance-rehearsal]')).toHaveCount(0);
    if (!await field(page, 'rehearsal.rehearsal-1.context').isVisible()) await recoveryResponse.getByText('Edit this example', { exact: true }).click();
    await field(page, 'rehearsal.rehearsal-1.context').fill('Observe a failed restart');
    await action(page, 'apply').click();
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-action="undo"]').click(); await tab(page, 'assurance').click();
    if (await action(page, 'current').isVisible()) await action(page, 'current').click();
    await selectScenario(page, 'specialist-unavailable'); await scenario('specialist-unavailable').locator('[data-assurance-action="rehearse"]').click();
    const specialistResponse = scenario('specialist-unavailable').locator('[data-assurance-rehearsal="rehearsal-1"]');
    await expect(specialistResponse).toBeVisible(); await expect(scenario('recovery-failure').locator('[data-assurance-rehearsal]')).toHaveCount(0);
    if (!await field(page, 'rehearsal.rehearsal-1.context').isVisible()) await specialistResponse.getByText('Edit this example', { exact: true }).click();
    await field(page, 'rehearsal.rehearsal-1.context').fill('Find a reviewer for the planned pilot');
    await specialistResponse.locator('[data-native-create="person"][data-native-return-field="rehearsal.rehearsal-1.reviewerPersonId"]').click();
    const assembly = root(page).locator('[data-native-assembly]');
    await assembly.locator('[data-assembly-form] [name="label"]').fill('Additional reviewer'); await assembly.locator('[data-assembly-form] [name="ratePerHour"]').fill('100');
    await assembly.locator('[data-assembly-apply]').click(); await root(page).locator('[data-native-return-action]').click(); await action(page, 'review').click();
    await expect(field(page, 'rehearsal.rehearsal-1.context')).toHaveValue('Find a reviewer for the planned pilot');
    await expect(field(page, 'rehearsal.rehearsal-1.reviewerPersonId')).toBeFocused();
    await field(page, 'rehearsal.rehearsal-1.reviewerPersonId').selectOption({ label: 'Additional reviewer' });
    await specialistResponse.locator('[data-assurance-action="propose"]').click(); await check(page, 'proposal.mode', 'update').check();
    await field(page, 'proposal.existingWorkId').selectOption('rehearsal'); await field(page, 'proposal.minutesPerSession').fill('30'); await field(page, 'proposal.hoursPerSession').fill('0'); await field(page, 'proposal.occurrences').fill('1');
    await expect(panel(page).locator('[data-assurance-preview]')).toContainText('Proposed investment: $3,680.00');
    await expect(total(page)).toHaveText('$3,980.00'); await action(page, 'apply').click(); await expect(total(page)).toHaveText('$3,680.00');
    const state = await page.evaluate(() => window.assuranceFixture.studio.read().state);
    assert.equal(state.work.length, 4); assert.equal(state.work.find(row => row.id === 'rehearsal').minutesPerOccurrence, 30);
    assert.equal(state.assuranceSettings.rehearsals[0].definitionId, 'specialist-unavailable');
    await tab(page, 'people').click(); const people = root(page).locator('[data-native-assembly]');
    await root(page).getByText('Rates and available time', { exact: true }).click();
    await people.locator('[data-assembly-person]').selectOption(state.people.find(row => row.label === 'Additional reviewer').id);
    await people.locator('[data-assembly-action="person-remove"]').click();
    await expect(people.locator('[data-assembly-dependencies]')).toContainText('Rehearsal: A specialist is unavailable for the planned review');
    await expect(people.locator('[data-assembly-dependencies]')).toContainText('reviewer'); await expect(people.locator('[data-assembly-apply]')).toBeDisabled();
    await people.locator('[data-assembly-dependencies] [data-native-open-assurance]').click(); await expect(panel(page)).toBeVisible();
    const ownership = await page.evaluate(async () => {
      const fixture = window.assuranceFixture; fixture.controller.dispose();
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      const { mountAssurancePanel } = await import('/collaboration/native-investment-studio/assurance-controller.mjs');
      const editing = createDraftCoordinator(fixture.studio), element = document.querySelector('[data-native-assurance]');
      const successor = document.createElement('button'); successor.textContent = 'Successor editor'; element.before(successor);
      let reenter = false;
      const controller = mountAssurancePanel(element, { studio: fixture.studio, editing, onEditing() {
        if (reenter) { editing.purpose.begin('purpose', fixture.studio.read()); successor.focus(); }
      } });
      controller.open(); const selected = controller.selectSupport({ kind: 'concept', id: 'independent-review' });
      const focused = document.activeElement.name === 'concept.independent-review.included';
      editing.assurance.setText(editing.assurance.read().draft.token, 'allocationPercent', '23');
      reenter = true; const displaced = controller.selectSupport({ kind: 'rehearsal', id: 'rehearsal-1' });
      const answer = { selected, focused, displaced, active: editing.read().active.kind, successorFocused: document.activeElement === successor,
        retained: editing.read().parked.find(row => row.kind === 'assurance').raw.allocationPercent };
      controller.dispose(); editing.dispose(); successor.remove(); return answer;
    });
    assert.deepEqual(ownership, { selected: true, focused: true, displaced: false, active: 'purpose', successorFocused: true, retained: '23' });
  });
}
