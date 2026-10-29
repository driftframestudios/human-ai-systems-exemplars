import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
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

before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const objectSource = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  assert.equal(source.split(objectSource).length, 2);
  fullAboutFixture = source.replace(objectSource, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  const nativeStart = source.indexOf('<section class="about-field about-field--coordination"');
  const nativeEnd = source.indexOf('<section class="about-field about-field--studio"', nativeStart);
  const prefixEnd = source.indexOf('<main id="main">') + '<main id="main">'.length;
  assert.ok(nativeStart > prefixEnd && nativeEnd > nativeStart);
  const legacyFrame = source.match(/<iframe\b[^>]*data-about-content-fit="studio-chapters"[\s\S]*?<\/iframe>/u)?.[0];
  const legacyLink = source.match(/<a href="\.\.\/\.\.\/collaboration\/initiative-costing-calculator\/index.html">[\s\S]*?<\/a>/u)?.[0];
  assert.ok(legacyFrame && legacyLink);
  // Keep About's authored styles, body/navigation, native section and onward
  // carriers. Other instrument controllers retain their separate browser owners.
  const prefix = source.slice(0, prefixEnd).replace(/<script\b[\s\S]*?<\/script>/gu,
    script => script.includes('collaboration/native-investment-studio/controller.mjs') ? script : '');
  aboutFixture = `${prefix}${source.slice(nativeStart, nativeEnd)}
    <section class="about-field about-field--studio">${legacyFrame}${legacyLink}</section>
    <div aria-hidden="true" style="height:1000px"></div></main></body></html>`;
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
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
  await team(page).locator(`[data-person-id="${id}"]`).click();
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
  await settle();
  return page;
}

async function assertContained(page) {
  const observation = await team(page).evaluate(root => {
    const width = document.documentElement.clientWidth;
    const entries = [...root.querySelectorAll('input,button,summary,h3,p,output')]
      .filter(node => node.getClientRects().length && !node.closest('[hidden]'))
      .map(node => {
        const box = node.getBoundingClientRect();
        return { tag: node.localName, name: node.name ?? '', left: box.left, right: box.right,
          scroll: node.scrollWidth, client: node.clientWidth };
      });
    return { width, entries };
  });
  for (const entry of observation.entries) {
    assert.ok(entry.left >= -.5 && entry.right <= observation.width + .5,
      `Team Assembly fits its viewport: ${JSON.stringify({ width: observation.width, entry })}`);
    assert.ok(entry.scroll <= entry.client + 1,
      `Team Assembly retains complete local content: ${JSON.stringify(entry)}`);
  }
}

for (const engine of names) {
  test(`${engine}: person funding edits price exact amounts while draft, cancel and unknown rates stay distinct`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await expect(accepted(page)).toHaveText('$1,200.00');
    await expect(team(page).locator('[data-person-id]')).toHaveCount(4);
    await choose(page);
    await expect(input(page, 'ratePerHour')).toBeFocused();
    await expect(input(page, 'ratePerHour')).toBeInViewport();
    await input(page, 'ratePerHour').fill('101');
    // One person's three additional hours gain $1/hour; the other three stay $300 each.
    await expect(preview(page)).toHaveText('$1,203.00');
    await expect(accepted(page)).toHaveText('$1,200.00');
    await expect(panel(page).locator('input[name="minutesPerSession"]')).toHaveValue('30');
    await action(page, 'apply').click();
    await expect(accepted(page)).toHaveText('$1,203.00');
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
    await expect(settings(page).locator('summary')).toBeFocused();
    await choose(page);
    await expect(input(page, 'ratePerHour')).toHaveValue('101.00');
    await input(page, 'ratePerHour').fill('');
    await expect(preview(page)).toHaveText('$900.00');
    await action(page, 'apply').click();
    await expect(accepted(page)).toHaveText('$900.00');
    await expect(panel(page).locator('[data-native-standing]')).toHaveText('Known total · USD');
    await expect(team(page).locator('[data-team-roster] > li').first()).toContainText('Hourly rate needed');
    await input(page, 'ratePerHour').fill('0');
    await action(page, 'apply').click();
    await expect(accepted(page)).toHaveText('$900.00');
    await expect(panel(page).locator('[data-native-standing]')).toHaveText('Total · USD');
    await expect(team(page).locator('[data-team-roster] > li').first()).toContainText('$0.00/hour');
    await expect(page.locator('iframe[data-about-content-fit="studio-chapters"]')).toHaveCount(1);
    await expect(page.locator('a[href="../../collaboration/initiative-costing-calculator/index.html"]')).toHaveCount(1);
  });

  test(`${engine}: parked person edits retain their target and stale recovery is explicit`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await choose(page);
    await input(page, 'ratePerHour').fill('101');
    await panel(page).locator('[data-native-chapter="coordination"]').click();
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
    await expect(panel(page).locator('[data-native-saved]')).toBeVisible();
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
    await expect(settings(page).locator('summary')).toBeFocused();
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
    await expect(saved).toBeVisible();
    await saved.locator('summary').click();
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
        const bottoms = await team(page).locator('[data-team-roster] > li').evaluateAll(items =>
          items.map(item => item.getBoundingClientRect().bottom));
        assert.equal(bottoms.length, 4);
        assert.ok(Math.max(...bottoms) - Math.min(...bottoms) < .1,
          `wide roster cards retain one lower edge: ${JSON.stringify(bottoms)}`);
      }
      // The panel owns this feedback geometry; document scrolling can continue
      // independently while a browser moves focus to the edited control.
      const positions = () => settings(page).evaluate(root => {
        const top = root.getBoundingClientRect().top;
        return [...root.querySelectorAll('input')].map(node => ({
          name: node.name, top: node.getBoundingClientRect().top - top,
        }));
      });
      const before = await positions();
      await input(page, 'fundedHours').fill('-1');
      await expect(input(page, 'fundedHours')).toHaveAttribute('aria-invalid', 'true');
      await expect(team(page).locator('[data-person-error="fundedHours"]')).not.toHaveText('');
      await expect(preview(page)).toHaveText('—');
      const after = await positions();
      for (let index = 0; index < before.length; index += 1) {
        assert.ok(Math.abs(after[index].top - before[index].top) < .1,
          `feedback keeps ${before[index].name} in place at ${width}px: ${JSON.stringify({ before: before[index], after: after[index] })}`);
      }
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

}
