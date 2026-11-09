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
for (const name of names) assert.ok(Object.hasOwn(engines, name), `Unknown NATIVE_STUDIO_BROWSER: ${name}`);
const browsers = new Map();
const route = '/context-canvas-project-surface/context-canvas/index.html';
const controllerPath = '/collaboration/native-investment-studio/controller.mjs';
const statePath = '/collaboration/native-investment-studio/state.mjs';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-team');
let server;
let aboutFixture;
let fullAboutFixture;

registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const objectSource = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  assert.equal(source.split(objectSource).length, 2);
  fullAboutFixture = source.replace(objectSource, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  aboutFixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>' });
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});

const panel = page => page.locator('[data-native-coordination]');
const team = page => page.locator('[data-native-team-editor]');
const input = (page, field) => team(page).locator(`[data-person-configure] input[name="${field}"]`);
const action = (page, name) => team(page).locator(`[data-person-action="${name}"]`);
const accepted = page => panel(page).locator('[data-native-total]');
const preview = page => team(page).locator('[data-person-total]');
const settings = page => team(page).locator('[data-person-configure]');
const choose = async (page, id = 'product-one') => {
  if (!(await team(page).isVisible())) await panel(page).locator('[data-native-chapter="people"]').click();
  const key = team(page).locator(`[data-person-id="${id}"]`);
  if (await key.getAttribute('aria-expanded') !== 'true') await key.click();
};

async function open(t, engine, fullAbout = false) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const telemetry = monitor(page);
  const requests = new Set();
  page.on('request', request => requests.add(request));
  page.on('requestfinished', request => requests.delete(request));
  page.on('requestfailed', request => requests.delete(request));
  const settle = () => expect.poll(() => requests.size).toBe(0);
  t.after(async () => {
    try { await settle(); assertTelemetry(telemetry); }
    finally { await context.close(); }
  });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route) return request.fulfill({ status: 200, contentType: 'text/html', body: fullAbout ? fullAboutFixture : aboutFixture });
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' });
  });
  await page.goto(server.origin + route, { waitUntil: 'load' });
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => {
    image.loading = 'eager';
    return image.decode();
  })));
  await page.evaluate(() => document.fonts.ready);
  await expect(panel(page)).toHaveAttribute('data-native-ready', 'true');
  await expect(team(page)).toHaveAttribute('data-team-ready', 'true');
  await page.evaluate(async () => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const root = document.querySelector('[data-native-coordination]');
    mountCoordinationPanel(root).dispose();
    const studio = createStudio();
    window.teamFixture = { studio, controller: mountCoordinationPanel(root, { studio }) };
  });
  await settle();
  return page;
}

async function assertContained(page) {
  const observation = await team(page).evaluate(root => {
    const width = document.documentElement.clientWidth;
    const entries = [...root.querySelectorAll('input,button,summary,h3,p,output')]
      .filter(node => node.getClientRects().length && !node.closest('[hidden]') && !node.closest('.studio-session-tracks,.studio-team-lanes,.studio-people-reading,[data-responsibility-list]'))
      .map(node => {
        const box = node.getBoundingClientRect();
        return { tag: node.localName, name: node.name ?? '', label: node.getAttribute('aria-label'), className: node.className, parent: node.parentElement.className, left: box.left, right: box.right,
          scroll: node.scrollWidth, client: node.clientWidth };
      });
    for (const screen of root.querySelectorAll('.studio-session-tracks,.studio-team-lanes,.studio-people-reading,[data-responsibility-list]')) {
      const box = screen.getBoundingClientRect();
      entries.push({ tag: 'scroll region', left: box.left, right: box.right, scroll: screen.clientWidth, client: screen.clientWidth });
    }
    return { width, entries };
  });
  for (const entry of observation.entries) {
    assert.ok(entry.left >= -.5 && entry.right <= observation.width + .5,
      `Team Assembly fits its viewport: ${JSON.stringify({ width: observation.width, entry })}`);
    assert.ok(entry.scroll <= entry.client + 1,
      `Team Assembly retains complete local content: ${JSON.stringify({ width: observation.width, ...entry })}`);
  }
}

for (const engine of names) {
  test(`${engine}: session spread choices update capacity once while the person draft stays open`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createExamplePlan } = await import('/collaboration/native-investment-studio/contract.mjs');
      const root = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(root).dispose();
      const plan = createExamplePlan(); plan.people[0].fundedMinutes = 240;
      plan.work.push({ ...plan.work[0], id: 'prepare', label: 'Prepare the review', minutesPerOccurrence: 60, occurrences: 1 },
        { ...plan.work[0], id: 'recover', label: 'Practice recovery', minutesPerOccurrence: 30, occurrences: 1, status: 'paused' });
      const studio = createStudio(plan);
      window.teamFixture = { studio, controller: mountCoordinationPanel(root, { studio }), original: studio.exportText() };
    });
    await choose(page);
    await input(page, 'ratePerHour').fill('00123');
    await team(page).locator('[data-role-reel="framework"] [data-reel-choice="npt"]').click();
    const beforeSpread = await page.evaluate(() => ({ text: window.teamFixture.studio.exportText(), undo: window.teamFixture.studio.readHistory().undoCount }));
    const spread = settings(page).locator('.studio-person-spread');
    await expect(spread.locator('[data-person-spread-preset="all"]')).toHaveAttribute('aria-pressed', 'true');
    await spread.locator('[data-person-spread-preset="one"]').click();
    await expect(spread.locator('[data-person-spread-preset="one"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(spread.locator('.studio-person-spread__current')).toHaveText('One plan');
    await expect(settings(page)).toHaveAttribute('open', '');
    await expect(input(page, 'ratePerHour')).toHaveValue('00123');
    await expect(input(page, 'ratePerHour')).toBeEditable();
    const localRow = spread.locator('.studio-person-spread__table');
    await expect(localRow.locator('thead th')).toHaveText(['Weekly working session', 'Prepare the review', 'Practice recovery']);
    const readPads = scope => scope.evaluate(node => [...node.querySelectorAll('[data-people-participant="product-one"]')].map(check => {
      const pad = check.closest('label');
      return { work: check.dataset.peopleWork, checked: check.checked, funding: pad.dataset.funding, status: pad.dataset.status,
        color: getComputedStyle(pad).backgroundColor, state: pad.querySelector('.studio-participation-pad__state').textContent,
        time: pad.querySelector('.studio-participation-pad__time').textContent, amount: pad.querySelector('.studio-participation-pad__amount').textContent };
    }));
    const assertMirror = async () => assert.deepEqual(await readPads(localRow), await readPads(team(page).locator('[data-team-roster]')), 'local participation mirrors the full person row');
    await assertMirror();
    assert.deepEqual((await readPads(localRow)).map(row => [row.work, row.checked]), [['review', true], ['prepare', false], ['recover', false]]);
    await expect(team(page).locator('[data-person-status]')).not.toContainText('supported assembly command');
    await expect(panel(page).locator('[data-assembly-status]')).toHaveText('');
    await expect(team(page).locator('.studio-capacity-rollup dd > span').first()).toHaveText('16 h 30 min');
    await expect(team(page).locator('.studio-capacity-legend')).toContainText('Paused · still planned');
    assert.equal(await page.evaluate(() => window.teamFixture.studio.readHistory().undoCount), beforeSpread.undo + 1);
    assert.deepEqual(await page.evaluate(() => window.teamFixture.studio.read().state.work.map(row => row.personIds.includes('product-one'))), [true, false, false]);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const bounds = await spread.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, 'spread remains inside the phone or laptop viewport');
      for (const button of await spread.locator('button').all()) {
        const box = await button.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, 'every spread choice retains a direct touch target');
      }
      await spread.screenshot({ path: resolve(captures, `${engine}-spread-${width}.png`) });
    }
    const localCheck = localRow.locator('[data-people-work="recover"]');
    await localCheck.check();
    await expect(localCheck).toBeFocused();
    await expect(localRow.locator('.studio-pause-marker')).toBeVisible();
    await expect(spread.locator('.studio-person-spread__current')).toHaveText('Custom spread');
    await expect(input(page, 'ratePerHour')).toHaveValue('00123');
    await expect(input(page, 'ratePerHour')).toBeEditable();
    assert.equal(await page.evaluate(() => window.teamFixture.studio.readHistory().undoCount), beforeSpread.undo + 2);
    await assertMirror();
    await panel(page).locator('[data-studio-undo]').click();
    await expect(localCheck).not.toBeChecked();
    await assertMirror();
    await panel(page).locator('[data-studio-undo]').click();
    assert.equal(await page.evaluate(() => window.teamFixture.studio.exportText()), beforeSpread.text);
    await expect(team(page).locator('.studio-capacity-rollup dd > span').first()).toHaveText('18 h');
    await expect(spread.locator('[data-person-spread-preset="all"]')).toHaveAttribute('aria-pressed', 'true');

  });

  test(`${engine}: session spread names the sole-participant constraint instead of offering a silent reduction`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createExamplePlan } = await import('/collaboration/native-investment-studio/contract.mjs');
      const root = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(root).dispose();
      const plan = createExamplePlan(); plan.work[0].personIds = ['product-one'];
      plan.work.push({ ...plan.work[0], id: 'prepare', label: 'Prepare the review' }, { ...plan.work[0], id: 'recover', label: 'Practice recovery' });
      const studio = createStudio(plan); window.teamFixture = { studio, controller: mountCoordinationPanel(root, { studio }) };
    });
    await choose(page);
    const spread = settings(page).locator('.studio-person-spread');
    await expect(spread.locator('[data-person-spread-preset="one"]')).toBeDisabled();
    await expect(spread.locator('[data-person-spread-preset="half"]')).toBeDisabled();
    await expect(spread.locator('[data-person-spread-preset="all"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(spread.locator('.studio-person-spread__hint')).toHaveText('3 plans need this person. Add another participant before reducing further.');
    await expect(spread.locator('.studio-person-spread__table input:checked')).toHaveCount(3);
    await spread.locator('[data-person-spread-preset="all"]').click();
    assert.equal(await page.evaluate(() => window.teamFixture.studio.readHistory().undoCount), 0);
    await expect(team(page).locator('[data-person-status]')).toHaveText('Session spread already matches.');
  });

  test(`${engine}: relative rate dials preserve cents and unknowns until Apply and Undo`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    const initial = await page.evaluate(() => window.teamFixture.studio.exportText());
    await choose(page);
    const coarse = settings(page).locator('[data-rate-step="10"]'), fine = settings(page).locator('[data-rate-step="5"]');
    await input(page, 'ratePerHour').fill('100.25');
    await coarse.focus(); await page.keyboard.press('ArrowRight');
    await expect(input(page, 'ratePerHour')).toHaveValue('110.25');
    await page.keyboard.press('ArrowRight'); await expect(input(page, 'ratePerHour')).toHaveValue('120.25');
    await fine.focus(); await page.keyboard.press('ArrowLeft'); await expect(input(page, 'ratePerHour')).toHaveValue('115.25');
    await team(page).locator('[data-person-field="ratePerHour"][data-step="1"]').click();
    await expect(input(page, 'ratePerHour')).toHaveValue('116.25');
    await expect(preview(page)).toHaveText('$1,248.75');
    assert.equal(await page.evaluate(() => window.teamFixture.studio.exportText()), initial);
    for (const dial of [coarse, fine]) { await expect(dial).toHaveValue('0'); await expect(dial).toHaveAttribute('min', '-1'); await expect(dial).toHaveAttribute('max', '1'); }
    await action(page, 'apply').click(); await expect(accepted(page)).toHaveText('$1,248.75');
    assert.equal(await page.evaluate(() => window.teamFixture.studio.read().state.people[0].rateCentsPerHour), 11625);
    await panel(page).locator('[data-native-chapter="investment"]').click();
    await panel(page).locator('[data-investment-deck="compare"]').click(); await panel(page).locator('[data-investment-action="undo"]').click();
    assert.equal(await page.evaluate(() => window.teamFixture.studio.exportText()), initial);
    await choose(page);
    for (const raw of ['1.']) { await input(page, 'ratePerHour').fill(raw); await expect(coarse).toBeDisabled(); await expect(fine).toBeDisabled(); await expect(input(page, 'ratePerHour')).toHaveValue(raw); }
    await input(page, 'ratePerHour').fill(''); await expect(coarse).toBeEnabled();
    await coarse.focus(); await page.keyboard.press('ArrowRight'); await expect(input(page, 'ratePerHour')).toHaveValue('10.00');
    await input(page, 'ratePerHour').fill('0'); await expect(coarse).toBeEnabled(); await expect(coarse).toHaveAttribute('min', '0');
    await coarse.focus(); await page.keyboard.press('ArrowRight'); await expect(input(page, 'ratePerHour')).toHaveValue('10.00');
    for (const [width, enlarged] of [[1440, false], [390, false], [320, true]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(value => { document.documentElement.style.fontSize = value ? '200%' : ''; }, enlarged);
      await coarse.scrollIntoViewIfNeeded(); await assertContained(page);
      const [large, small] = await Promise.all([coarse.boundingBox(), fine.boundingBox()]);
      assert.ok(large.width > small.width && small.width >= 44, `coarse/fine targets stay distinct at ${width}px`);
      if (!enlarged) {
        const module = settings(page).locator('.studio-quantity-module.studio-rate');
        const geometry = await module.evaluate(node => {
          const outer = node.getBoundingClientRect();
          return { left:outer.left, right:outer.right, top:outer.top, bottom:outer.bottom,
            names:[...node.querySelectorAll('input[type="text"]')].map(input => input.name),
            targets:[...node.querySelectorAll('input,button,.native-knob')].map(target => {
              const box=target.getBoundingClientRect(); return { left:box.left, right:box.right, top:box.top, bottom:box.bottom };
            }) };
        });
        assert.deepEqual(geometry.names, ['ratePerHour'], 'one rate enclosure owns its shared exact amount');
        assert.ok(geometry.targets.every(box => box.left >= geometry.left && box.right <= geometry.right
          && box.top >= geometry.top && box.bottom <= geometry.bottom), 'rate dials and precision controls stay inside the same housing');
        assert.ok(geometry.left >= 0 && geometry.right <= width, 'the rate module fits the phone/laptop viewport');
        await module.screenshot({ path: resolve(captures, `${engine}-rate-module-${width}.png`) });
      }
    }
    await settings(page).locator('.native-rate-controls').screenshot({ path: resolve(captures, `${engine}-rate-dials-enlarged.png`) });
  });

  test(`${engine}: rate rotary cancellation restores exact raw spelling and parking releases capture`, { timeout: 45000 }, async t => {
    const page = await open(t, engine); await choose(page);
    const coarse = settings(page).locator('[data-rate-step="10"]');
    const beginTurn = async () => {
      await coarse.scrollIntoViewIfNeeded();
      await coarse.evaluate(node => node.addEventListener('pointerdown', event => { window.teamFixture.pointerId = event.pointerId; }, { once: true }));
      const box = await coarse.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * .1); await page.mouse.down();
      await page.mouse.move(box.x + box.width * .8, box.y + box.height * .2);
      await expect(input(page, 'ratePerHour')).toHaveValue('110.25');
    };
    await input(page, 'ratePerHour').fill('100.25'); await coarse.scrollIntoViewIfNeeded();
    const tapBox = await coarse.boundingBox();
    await page.mouse.click(tapBox.x + tapBox.width * .9, tapBox.y + tapBox.height / 2);
    await expect(input(page, 'ratePerHour')).toHaveValue('110.25');
    await page.mouse.click(tapBox.x + tapBox.width * .1, tapBox.y + tapBox.height / 2);
    await expect(input(page, 'ratePerHour')).toHaveValue('100.25');
    await input(page, 'ratePerHour').fill('00100.25'); await beginTurn();
    await page.keyboard.press('Escape'); await expect(input(page, 'ratePerHour')).toHaveValue('00100.25');
    assert.equal(await coarse.evaluate(node => node.hasPointerCapture(window.teamFixture.pointerId)), false); await page.mouse.up();
    await beginTurn();
    await coarse.evaluate(node => node.dispatchEvent(new PointerEvent('pointercancel', { pointerId: window.teamFixture.pointerId, bubbles: true })));
    await expect(input(page, 'ratePerHour')).toHaveValue('00100.25'); await page.mouse.up();
    await beginTurn();
    await team(page).locator('[data-person-id="product-two"]').focus(); await page.keyboard.press('Enter');
    assert.equal(await coarse.evaluate(node => node.hasPointerCapture(window.teamFixture.pointerId)), false);
    await page.mouse.up(); await expect(input(page, 'ratePerHour')).toHaveValue('100.00');
    await choose(page); await expect(input(page, 'ratePerHour')).toHaveValue('110.25');
    await page.emulateMedia({ forcedColors: 'active' });
    await coarse.focus(); await page.keyboard.press('ArrowLeft'); await expect(input(page, 'ratePerHour')).toHaveValue('100.25');
    assert.notEqual(await coarse.evaluate(node => getComputedStyle(node).appearance), 'none');
    await page.emulateMedia({ forcedColors: 'none' });
    await input(page, 'ratePerHour').fill('00100.25'); await beginTurn();
    await page.evaluate(() => window.teamFixture.controller.dispose());
    assert.equal(await coarse.count(), 0); await page.mouse.up();
    assert.equal(await page.evaluate(() => window.teamFixture.studio.read().state.people[0].rateCentsPerHour), 10000);
  });

  test(`${engine}: brief rate turns retain their amount after release, focus transfer and capture loss`, { timeout: 45000 }, async t => {
    const page = await open(t, engine); await choose(page);
    const rate = input(page, 'ratePerHour');
    const initial = await page.evaluate(() => window.teamFixture.studio.exportText());
    for (const [dollars, seed, expected, outside] of [[10, '0.25', '10.25', false], [5, '40.25', '45.25', true]]) {
      const knob = settings(page).locator(`[data-rate-step="${dollars}"]`);
      for (const ending of ['release', 'focus', 'capture']) {
        await rate.fill(seed); await knob.scrollIntoViewIfNeeded();
        await knob.evaluate(node => {
          window.teamFixture.captureLossWasTrusted = false;
          node.addEventListener('pointerdown', event => { window.teamFixture.pointerId = event.pointerId; }, { once: true });
          node.addEventListener('lostpointercapture', event => { window.teamFixture.captureLossWasTrusted = event.isTrusted; }, { once: true });
        });
        const box = await knob.boundingBox(), radius = box.width * (outside ? .8 : .4);
        const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await page.mouse.move(center.x, center.y - box.height * .4); await page.mouse.down();
        await page.mouse.move(center.x + radius * .707, center.y - radius * .707, { steps: 3 });
        await expect(rate).toHaveValue(expected);
        if (ending === 'focus') {
          await rate.focus();
          assert.equal(await knob.evaluate(node => node.hasPointerCapture(window.teamFixture.pointerId)), false, 'focus transfer ends the turn');
        }
        if (ending === 'capture') {
          await knob.evaluate(node => node.releasePointerCapture(window.teamFixture.pointerId));
          await page.mouse.move(center.x + radius * .71, center.y - radius * .7);
          await expect.poll(() => page.evaluate(() => window.teamFixture.captureLossWasTrusted)).toBe(true);
        }
        await page.mouse.up(); await rate.focus();
        await expect(rate).toHaveValue(expected);
        await expect(knob).toHaveAttribute('aria-valuetext', `$${expected} per hour`);
        assert.equal(await page.evaluate(() => window.teamFixture.studio.exportText()), initial, 'dial adjustments remain a draft until Apply');
      }
    }
  });

  test(`${engine}: person funding edits price exact amounts while draft, cancel and unknown rates stay distinct`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await expect(accepted(page)).toHaveText('$1,200.00');
    await expect(team(page).locator('[data-person-id]')).toHaveCount(4);
    await expect(team(page).locator('[data-person-id="product-one"]')).toHaveClass(/native-control--navigate/u);
    await choose(page);
    await expect(team(page).locator('[data-person-id="product-one"]')).toHaveAccessibleName('product-one');
    await expect(input(page, 'ratePerHour')).toBeFocused();
    await expect(input(page, 'ratePerHour')).toBeInViewport();
    await expect(settings(page).locator('summary')).toContainText('$100.00/hour');
    await input(page, 'ratePerHour').fill('101');
    await expect(settings(page).locator('summary')).toContainText('$100.00/hour');
    await expect(settings(page).locator('summary')).toContainText('Unsaved edits');
    // One person's three additional hours gain $1/hour; the other three stay $300 each.
    await expect(preview(page)).toHaveText('$1,203.00');
    await expect(accepted(page)).toHaveText('$1,200.00');
    await expect(panel(page).locator('input[name="minutesPerSession"]')).toHaveValue('30');
    await action(page, 'apply').click();
    await expect(accepted(page)).toHaveText('$1,203.00');
    await expect(settings(page).locator('summary')).toContainText('$101.00/hour');
    await expect(settings(page).locator('summary')).not.toContainText('Unsaved edits');
    await expect(action(page, 'apply')).toBeFocused();
    await expect(settings(page)).toHaveAttribute('open', '');
    await input(page, 'fundedHours').fill('1');
    // The declared extra work remains $1,203; one funded hour contributes $101.
    await expect(preview(page)).toHaveText('$1,304.00');
    await expect(team(page).locator('[data-person-capacity]')).toHaveText('1 h of funded time available');
    await expect(accepted(page)).toHaveText('$1,203.00');
    await action(page, 'apply').click();
    await expect(accepted(page)).toHaveText('$1,304.00');
    await input(page, 'ratePerHour').fill('120');
    await expect(preview(page)).toHaveText('$1,380.00');
    await action(page, 'cancel').click();
    await expect(accepted(page)).toHaveText('$1,304.00');
    await expect(settings(page)).not.toHaveAttribute('open', '');
    await expect(team(page).locator('[data-person-id="product-one"]')).toBeFocused();
    await choose(page);
    await expect(input(page, 'ratePerHour')).toHaveValue('101.00');
    await input(page, 'ratePerHour').fill('');
    await expect(preview(page)).toHaveText('$900.00');
    await action(page, 'apply').click();
    await expect(accepted(page)).toHaveText('$900.00');
    await expect(panel(page).locator('[data-native-standing]')).toHaveText('Known total · USD');
    await expect(team(page).locator('[data-team-roster] [data-roster-person]').first()).toContainText('Hourly rate needed');
    await input(page, 'ratePerHour').fill('0');
    await action(page, 'apply').click();
    await expect(accepted(page)).toHaveText('$900.00');
    await expect(panel(page).locator('[data-native-standing]')).toHaveText('Total · USD');
    await expect(team(page).locator('[data-team-roster] [data-roster-person]').first()).toContainText('$0/hr');
    await expect(page.locator('iframe[data-about-content-fit="studio-chapters"]')).toHaveCount(0);
    await expect(page.locator('a[href="../../collaboration/initiative-costing-calculator/index.html"]')).toHaveCount(1);
  });

  test(`${engine}: parked person edits retain their target and stale recovery is explicit`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await choose(page);
    await input(page, 'ratePerHour').fill('101');
    await team(page).locator('.studio-people-reading .studio-session-tracks__pad').first().click();
    await panel(page).locator('input[name="occurrences"]').fill('7');
    await expect(input(page, 'ratePerHour')).toHaveValue('101');
    await expect(input(page, 'ratePerHour')).toBeDisabled();
    await expect(panel(page).locator('[data-native-preview-total]')).toHaveText('$1,400.00');
    await panel(page).locator('[data-action="apply"]').click();
    await expect(accepted(page)).toHaveText('$1,400.00');
    await panel(page).locator('[data-native-chapter="people"]').click();
    await expect(team(page)).toHaveAttribute('data-team-state', 'stale');
    await expect(input(page, 'ratePerHour')).toHaveValue('101');
    await expect(input(page, 'ratePerHour')).toBeDisabled();
    await expect(action(page, 'apply')).toBeDisabled();
    await expect(team(page).locator('[data-person-recovery]')).toBeVisible();
    await expect(team(page).locator('[data-person-current]')).toContainText('$100.00/hour');
    await action(page, 'use-current').click();
    await expect(input(page, 'ratePerHour')).toHaveValue('100.00');
    await expect(input(page, 'ratePerHour')).toBeEditable();
    await expect(accepted(page)).toHaveText('$1,400.00');
    await expect(panel(page).locator('input[name="occurrences"]')).toHaveValue('7');

    await page.evaluate(async ({ controllerPath, statePath }) => {
      const { mountCoordinationPanel } = await import(controllerPath);
      const { createStudio } = await import(statePath);
      const root = document.querySelector('[data-native-coordination]');
      mountCoordinationPanel(root).dispose();
      const studio = createStudio();
      window.teamFixture = { studio, controller: mountCoordinationPanel(root, { studio }) };
    }, { controllerPath, statePath });
    await choose(page);
    await input(page, 'ratePerHour').fill('105');
    await choose(page, 'product-two');
    await expect(team(page).locator('[data-person-name]')).toHaveText('product-two');
    await expect(input(page, 'ratePerHour')).toHaveValue('100.00');
    await expect(team(page).locator('[data-person-saved="product-one"]')).toBeVisible();
    await expect(panel(page).locator('[data-amp-panel="saved"]')).toBeEnabled();
    await expect(panel(page).locator('[data-native-saved-count]')).toHaveText('1');
    await input(page, 'fundedHours').fill('1');
    await choose(page, 'product-one');
    await expect(team(page).locator('[data-person-name]')).toHaveText('product-one');
    await expect(input(page, 'ratePerHour')).toHaveValue('105');
    await expect(input(page, 'fundedHours')).toHaveValue('0');
    await expect(team(page).locator('[data-person-saved="product-two"]')).toBeVisible();
    await expect(preview(page)).toHaveText('$1,215.00');
    await expect(accepted(page)).toHaveText('$1,200.00');
    await action(page, 'apply').click();
    await expect(accepted(page)).toHaveText('$1,215.00');
    assert.deepEqual(await page.evaluate(() => window.teamFixture.studio.read().state.people.slice(0, 2)
      .map(({ id, rateCentsPerHour, fundedMinutes }) => ({ id, rateCentsPerHour, fundedMinutes }))), [
      { id: 'product-one', rateCentsPerHour: 10500, fundedMinutes: 0 },
      { id: 'product-two', rateCentsPerHour: 10000, fundedMinutes: 0 },
    ], 'returning to a saved person edit applies only its original target');
    await choose(page, 'product-two');
    await expect(team(page)).toHaveAttribute('data-team-state', 'stale');
    await expect(input(page, 'fundedHours')).toHaveValue('1');
    await expect(input(page, 'fundedHours')).toBeDisabled();
    await action(page, 'discard').click();
    await expect(settings(page)).not.toHaveAttribute('open', '');
    await expect(team(page).locator('[data-person-id="product-two"]')).toBeFocused();
    await expect(team(page).locator('[data-person-saved="product-two"]')).toBeHidden();
    await expect(accepted(page)).toHaveText('$1,215.00');

    await choose(page, 'product-one');
    await input(page, 'ratePerHour').fill('104');
    await page.evaluate(() => {
      const fixture = window.teamFixture;
      const candidate = JSON.parse(fixture.studio.exportText());
      candidate.people[0].rateCentsPerHour = 11000;
      const result = fixture.studio.importText(JSON.stringify(candidate), fixture.studio.read());
      if (!result.ok) throw new Error('The independent import fixture must be admitted.');
      fixture.accepted = fixture.studio.read();
      fixture.serialized = fixture.studio.exportText();
      fixture.controller.refresh();
    });
    await expect(accepted(page)).toHaveText('$1,230.00');
    await expect(input(page, 'ratePerHour')).toHaveValue('104');
    await expect(team(page)).toHaveAttribute('data-team-state', 'stale');
    await expect(input(page, 'ratePerHour')).toBeDisabled();
    await expect(action(page, 'apply')).toBeDisabled();
    await expect(team(page).locator('[data-person-current]')).toContainText('$110.00/hour');
    await page.evaluate(() => {
      const fixture = window.teamFixture;
      const candidate = JSON.parse(fixture.studio.exportText());
      candidate.people[0].rateCentsPerHour = 12000;
      const result = fixture.studio.importText(JSON.stringify(candidate), fixture.studio.read());
      if (!result.ok) throw new Error('The second accepted replacement must be admitted.');
      fixture.accepted = fixture.studio.read();
      fixture.serialized = fixture.studio.exportText();
      // Simulate another accepted source arriving after the recovery copy was
      // rendered. The first Review still belongs to the values the visitor saw.
    });
    await expect(team(page).locator('[data-person-current]')).toContainText('$110.00/hour');
    await action(page, 'review').click();
    await expect(input(page, 'ratePerHour')).toBeDisabled();
    await expect(input(page, 'ratePerHour')).toHaveValue('104');
    await expect(team(page)).toHaveAttribute('data-team-state', 'stale');
    await expect(team(page).locator('[data-person-current]')).toContainText('$120.00/hour');
    await expect(accepted(page)).toHaveText('$1,260.00');
    await action(page, 'review').click();
    await expect(input(page, 'ratePerHour')).toBeEditable();
    await expect(input(page, 'ratePerHour')).toHaveValue('104');
    await expect(preview(page)).toHaveText('$1,212.00');
    await team(page).locator('[data-person-field="ratePerHour"][data-step="1"]').click();
    await expect(input(page, 'ratePerHour')).toHaveValue('105.00');
    await expect(preview(page)).toHaveText('$1,215.00');
    assert.equal(await page.evaluate(() => window.teamFixture.studio.read() === window.teamFixture.accepted
      && window.teamFixture.studio.exportText() === window.teamFixture.serialized), true,
    'reviewing and editing saved values retain the imported accepted identity and bytes until Apply');
    await action(page, 'cancel').click();
    await choose(page);
    await expect(input(page, 'ratePerHour')).toHaveValue('120.00');

    await input(page, 'ratePerHour').fill('115');
    await choose(page, 'product-two');
    await input(page, 'fundedHours').fill('2');
    await choose(page, 'engineering-one');
    await page.evaluate(() => {
      const { studio, controller } = window.teamFixture;
      const candidate = JSON.parse(studio.exportText());
      candidate.people = candidate.people.filter(person => person.id !== 'product-one');
      for (const row of [...candidate.teams, ...candidate.work]) row.personIds = row.personIds.filter(id => id !== 'product-one');
      const result = studio.importText(JSON.stringify(candidate), studio.read());
      if (!result.ok) throw new Error('The removed-target fixture keeps the remaining references valid.');
      controller.refresh();
    });
    await expect(accepted(page)).toHaveText('$900.00');
    const saved = panel(page).locator('[data-native-saved]');
    await expect(page.locator('[data-amp-panel="saved"]')).toBeEnabled();
    await page.locator('[data-amp-panel="saved"]').click();
    const removed = saved.locator('li').filter({ has: page.locator('[data-saved-discard="person:product-one"]') });
    await expect(removed).toContainText('115');
    await expect(removed).toContainText('Record removed');
    await expect(removed.locator('[data-saved-open]')).toHaveCount(0);
    await expect(saved.locator('[data-saved-open="person:product-two"]')).toBeVisible();
    await removed.locator('[data-saved-discard="person:product-one"]').click();
    await expect(saved.locator('[data-saved-discard="person:product-one"]')).toHaveCount(0);
    await expect(saved.locator('[data-saved-open="person:product-two"]')).toBeVisible();
    await expect(saved.locator('[data-native-saved-count]')).toHaveText('1');
    await saved.locator('[data-saved-open="person:product-two"]').click();
    await expect(team(page).locator('[data-person-name]')).toHaveText('product-two');
    await expect(input(page, 'fundedHours')).toHaveValue('2');
    await expect(input(page, 'fundedHours')).toBeDisabled();
    await expect(accepted(page)).toHaveText('$900.00');
  });

  test(`${engine}: keyboard steps, readable errors and responsive controls preserve About scrolling`, { timeout: 45000 }, async t => {
    // Full About reproduces WebKit's stale implicit label rows after resizing;
    // keep that actual integration alongside the bounded native state cases.
    const page = await open(t, engine, engine === 'webkit');
    await choose(page);
    await expect(input(page, 'ratePerHour')).toBeInViewport();
    const increase = team(page).locator('[data-person-field="ratePerHour"][data-step="1"]');
    await increase.focus();
    await increase.press('Enter');
    await expect(increase).toBeFocused();
    await expect(input(page, 'ratePerHour')).toHaveValue('101.00');
    await expect(preview(page)).toHaveText('$1,203.00');
    await expect(accepted(page)).toHaveText('$1,200.00');
    const fundHour = team(page).locator('[data-person-field="fundedHours"][data-step="1"]');
    await fundHour.focus();
    await fundHour.press('Space');
    await expect(fundHour).toBeFocused();
    await expect(input(page, 'fundedHours')).toHaveValue('1');
    await expect(preview(page)).toHaveText('$1,304.00');
    for (const [width, enlarged] of [[1440, false], [390, false], [320, true]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(enlarge => { document.documentElement.style.fontSize = enlarge ? '200%' : ''; }, enlarged);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await input(page, 'fundedHours').fill('00001');
      await input(page, 'fundedMinutes').fill('00000');
      await input(page, 'ratePerHour').fill('00101');
      // WebKit settles the resized form's offscreen implicit rows when the
      // next editing target enters view. Establish that visible state first.
      await input(page, 'fundedHours').scrollIntoViewIfNeeded();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await assertContained(page);
      const labels = await settings(page).locator('.native-coordination__control').evaluateAll(groups => groups.map(group => {
        const range = document.createRange();
        range.selectNodeContents(group.querySelector('label'));
        return { name: group.querySelector('input').name,
          textBottom: Math.max(...[...range.getClientRects()].map(rect => rect.bottom)),
          inputTop: group.querySelector('input').getBoundingClientRect().top };
      }));
      for (const label of labels) assert.ok(label.textBottom <= label.inputTop,
        `the complete ${label.name} label precedes its input at ${width}px: ${JSON.stringify(label)}`);
      if (width === 1440) {
        const rows = await team(page).locator('[data-team-roster] [data-roster-person]').evaluateAll(items =>
          items.map(item => [...item.children].map(cell => cell.getBoundingClientRect().bottom)));
        assert.equal(rows.length, 4);
        for (const bottoms of rows) assert.ok(Math.max(...bottoms) - Math.min(...bottoms) < .1,
          `person and session cells retain one lower edge within each arranger row: ${JSON.stringify(bottoms)}`);
      }
      // The preview above may reflow. Feedback below preserves the numeric
      // group's layout while document scrolling follows the edited control.
      const positions = () => settings(page).evaluate(root => {
        const group = root.querySelector('.native-coordination__controls'), top = group.getBoundingClientRect().top;
        return [...group.querySelectorAll('input[name], input[data-rate-step]')].map(node => {
          const rect = node.getBoundingClientRect();
          return { name: node.name, top: rect.top - top, width: rect.width, height: rect.height };
        });
      });
      const before = await positions();
      await input(page, 'fundedHours').fill('-1');
      await expect(input(page, 'fundedHours')).toHaveAttribute('aria-invalid', 'true');
      await expect(team(page).locator('[data-person-error="fundedHours"]')).not.toHaveText('');
      await expect(preview(page)).toHaveText('—');
      const after = await positions();
      for (let index = 0; index < before.length; index += 1) {
        assert.ok(after[index].height > 0 && after[index].width > 0, 'feedback retains visible numeric controls');
        for (const key of ['top', 'width', 'height']) assert.ok(Math.abs(after[index][key] - before[index][key]) < .1,
          `feedback preserves ${before[index].name} ${key} at ${width}px: ${JSON.stringify({ before: before[index], after: after[index] })}`);
      }
      const groupBox = await settings(page).locator('.native-coordination__controls').boundingBox();
      const feedbackBox = await settings(page).locator('.native-coordination__feedback').boundingBox();
      assert.ok(feedbackBox.y >= groupBox.y + groupBox.height - 1, 'feedback follows the numeric controls');
      await assertContained(page);
      const controls = await settings(page).locator('.native-coordination__control').evaluateAll(groups => groups.map(group => {
        const field = group.querySelector('input');
        return { name: field.name, bottom: field.getBoundingClientRect().bottom,
          buttons: [...group.querySelectorAll('button')].map(button => {
            const box = button.getBoundingClientRect();
            return { top: box.top, width: box.width, height: box.height };
          }) };
      }));
      for (const control of controls) for (const button of control.buttons) {
        assert.ok(button.top >= control.bottom && button.width >= 43.95 && button.height >= 43.95,
          `${control.name}'s keyboard step remains below its input with a 44px target: ${JSON.stringify({ width, enlarged, control })}`);
      }
      if (engine === 'webkit') await team(page).screenshot({ path: resolve(captures, `team-${width}${enlarged ? '-enlarged' : ''}.png`) });
      await input(page, 'fundedHours').fill('1');
      await expect(preview(page)).toHaveText('$1,304.00');
      await expect(accepted(page)).toHaveText('$1,200.00');
    }
    await input(page, 'fundedHours').scrollIntoViewIfNeeded();
    const box = await input(page, 'fundedHours').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 260);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 20);
    await expect(input(page, 'fundedHours')).toHaveValue('1');
    await expect(accepted(page)).toHaveText('$1,200.00');
  });
  test(`${engine}: person receiver yields focus and callbacks to the current operation`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    const observed = await page.evaluate(async () => {
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      const { mountTeamPanel } = await import('/collaboration/native-investment-studio/team-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      mountCoordinationPanel(document.querySelector('[data-native-coordination]')).dispose();
      const root = document.querySelector('[data-native-team-editor]'); root.hidden = false;
      const field = name => root.querySelector(`[data-person-configure] [name="${name}"]`);
      const status = () => root.querySelector('[data-person-status]');
      const form = () => root.querySelector('[data-person-configure] form');
      const observations = [];
      for (const action of ['select', 'apply', 'cancel']) {
        const studio = createStudio(), editing = createDraftCoordinator(studio);
        let receiver, successor, retired = false, lateCallbacks = 0;
        receiver = mountTeamPanel(root, { studio, editing, onEditing() { if (retired) lateCallbacks++; } });
        if (action !== 'select') {
          receiver.select('product-one');
          editing.person.setText(editing.person.read().draft.token, 'ratePerHour', '105'); receiver.refresh();
        }
        const target = action === 'select' ? field('ratePerHour') : action === 'apply'
          ? root.querySelector('[data-person-action="apply"]') : root.querySelector('[data-person-configure] summary');
        target.addEventListener('focus', () => {
          retired = true; receiver.dispose();
          successor = mountTeamPanel(root, { studio, editing }); successor.select('product-two', false);
          status().textContent = 'Successor owns this edit.'; field('fundedHours').focus();
        }, { once: true });
        if (action === 'select') receiver.select('product-one');
        else if (action === 'apply') form().dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        else root.querySelector('[data-person-configure] fieldset [data-person-action="cancel"]').click();
        observations.push({ action, retired, lateCallbacks, status: status().textContent, focus: document.activeElement.name,
          selected: editing.read().selected.person, cents: studio.read().result.knownCommitmentCents });
        successor?.dispose(); receiver.dispose(); editing.dispose();
      }
      for (const event of ['focus', 'onBegin', 'onAccepted']) {
        const studio = createStudio(), editing = createDraftCoordinator(studio);
        let receiver, armed = false;
        const replaceOperation = () => {
          if (!armed) return;
          armed = false; receiver.select('product-two', false);
          status().textContent = 'The newer selection stays.'; field('fundedHours').focus();
        };
        receiver = mountTeamPanel(root, { studio, editing,
          onBegin: event === 'onBegin' ? replaceOperation : () => {},
          onAccepted: event === 'onAccepted' ? replaceOperation : () => {} });
        if (event === 'onAccepted') {
          receiver.select('product-one'); editing.person.setText(editing.person.read().draft.token, 'ratePerHour', '105'); receiver.refresh();
        }
        if (event === 'focus') field('ratePerHour').addEventListener('focus', replaceOperation, { once: true });
        armed = true;
        if (event === 'onAccepted') form().dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        else receiver.select('product-one');
        observations.push({ event, selected: editing.read().selected.person, status: status().textContent,
          focus: document.activeElement.name, cents: studio.read().result.knownCommitmentCents });
        receiver.dispose(); editing.dispose();
      }
      for (const operation of ['preview', 'apply']) {
        const studio = createStudio();
        let receiver, armed = false, callbacks = 0;
        const facade = { ...studio,
          previewPerson(...args) { const result = studio.previewPerson(...args); if (armed && operation === 'preview') { armed = false; receiver.dispose(); } return result; },
          updatePerson(...args) { const result = studio.updatePerson(...args); if (armed && operation === 'apply') { armed = false; receiver.dispose(); } return result; },
        };
        const editing = createDraftCoordinator(facade);
        receiver = mountTeamPanel(root, { studio: facade, editing, onAccepted: () => callbacks++, onEditing: () => callbacks++ });
        receiver.select('product-one'); callbacks = 0; armed = true;
        if (operation === 'preview') { field('ratePerHour').value = '105'; field('ratePerHour').dispatchEvent(new Event('input', { bubbles: true })); }
        else {
          editing.person.setText(editing.person.read().draft.token, 'ratePerHour', '105');
          form().dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
        observations.push({ operation, callbacks, active: editing.read().active?.kind ?? null,
          saved: editing.read().parked[0]?.raw.ratePerHour ?? null, ready: root.hasAttribute('data-team-ready'),
          cents: studio.read().result.knownCommitmentCents });
        receiver.dispose(); editing.dispose();
      }
      {
        const studio = createStudio(), editing = createDraftCoordinator(studio);
        let receiver, armed = false;
        receiver = mountTeamPanel(root, { studio, editing, onBegin() {
          if (!armed) return;
          armed = false;
          editing.person.setText(editing.person.read().draft.token, 'ratePerHour', '105'); receiver.refresh();
          status().textContent = 'The current raw edit stays.'; field('fundedHours').focus();
        } });
        receiver.select('product-one'); const token = editing.person.read().draft.token;
        armed = true; receiver.select('product-two');
        observations.push({ operation: 'same-token-onBegin', selected: editing.read().selected.person,
          sameToken: editing.person.read().draft.token === token, raw: editing.person.read().draft.raw.ratePerHour,
          status: status().textContent, focus: document.activeElement.name, cents: studio.read().result.knownCommitmentCents });
        receiver.dispose(); editing.dispose();
      }
      return observations;
    });
    assert.deepEqual(observed.slice(0, 3), ['select', 'apply', 'cancel'].map(action => ({ action, retired: true, lateCallbacks: 0,
      status: 'Successor owns this edit.', focus: 'fundedHours', selected: 'product-two', cents: action === 'apply' ? 121500 : 120000 })));
    assert.deepEqual(observed.slice(3, 6), ['focus', 'onBegin', 'onAccepted'].map(event => ({ event, selected: 'product-two',
      status: 'The newer selection stays.', focus: 'fundedHours', cents: event === 'onAccepted' ? 121500 : 120000 })));
    assert.deepEqual(observed.slice(6, 8), [
      { operation: 'preview', callbacks: 0, active: null, saved: '105', ready: false, cents: 120000 },
      { operation: 'apply', callbacks: 0, active: null, saved: null, ready: false, cents: 121500 },
    ]);
    assert.deepEqual(observed[8], { operation: 'same-token-onBegin', selected: 'product-one', sameToken: true, raw: '105',
      status: 'The current raw edit stays.', focus: 'fundedHours', cents: 120000 });
  });

  test(`${engine}: People readings and membership pads retain compact hierarchy and stable selection geometry`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await choose(page);
    await team(page).locator('[data-person-desk-close]').click();
    const roster = team(page).locator('[data-team-roster]');
    await expect(roster.locator('.studio-capacity-readings dt')).toHaveText(['Assigned time', 'Known work value']);
    await expect(roster.locator('.studio-person-more summary').first()).toHaveText('Card actions');
    const check = roster.locator('[data-people-participant="product-two"][data-people-work="review"]');
    const pad = check.locator('..');
    const geometry = () => pad.evaluate(el => {
      const box = el.getBoundingClientRect(), row = el.closest('tr').getBoundingClientRect();
      const time = el.querySelector('.studio-participation-pad__time'), amount = el.querySelector('.studio-participation-pad__amount');
      const clock = time.getBoundingClientRect(), money = amount.getBoundingClientRect(), input = el.querySelector('input').getBoundingClientRect();
      return { width: box.width, height: box.height, rowHeight: row.height, timeBottom: clock.bottom, timeLeft: clock.left,
        moneyBottom: money.bottom, moneyRight: money.right, inputTop: input.top, inputLeft: input.left, padRight: box.right,
        timeSize: parseFloat(getComputedStyle(time).fontSize), moneySize: parseFloat(getComputedStyle(amount).fontSize) };
    });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await check.uncheck(); const available = await geometry();
      await check.check(); const assigned = await geometry();
      for (const key of ['width', 'height', 'rowHeight']) assert.equal(assigned[key], available[key], `${key} stays stable when participation changes`);
      assert.ok(assigned.rowHeight < 180, 'the collapsed row retains a compact reading');
      assert.ok(Math.abs(assigned.timeBottom - assigned.moneyBottom) < 2, 'time and value share a lower baseline');
      assert.ok(assigned.inputTop < assigned.timeBottom - 20 && Math.abs(assigned.inputLeft - assigned.timeLeft) < 2, 'checkbox stays above the lower-left time');
      assert.ok(assigned.padRight - assigned.moneyRight < 12, 'money aligns to the right');
      assert.ok(assigned.moneySize > assigned.timeSize, 'money has stronger typographic emphasis');
      await expect(pad.locator('.studio-participation-pad__amount')).toHaveText('$300');
      await assertContained(page);
      await roster.screenshot({ path: resolve(captures, `${engine}-participation-pads-${width}.png`) });
    }
    await page.evaluate(() => {
      const { studio, controller } = window.teamFixture;
      const projection = studio.read(), work = projection.state.work[0];
      studio.applyCommand({ type: 'work.update', work: { ...work, status: 'paused' } }, projection);
      controller.refresh();
    });
    const column = roster.locator('[data-work-id="review"]');
    assert.ok(await column.count() >= 3);
    for (const cell of await column.all()) await expect(cell).toHaveAttribute('data-work-status', 'paused');
    await expect(pad.locator('.studio-pause-marker')).toBeVisible();
    await expect(check).toBeEnabled();
  });

}
