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
const input = (page, field) => team(page).locator(`input[name="${field}"]`);
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

  test(`${engine}: separate forms and imported accepted state preserve stale person drafts`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await choose(page);
    await input(page, 'ratePerHour').fill('101');
    await panel(page).locator('[data-native-chapter="coordination"]').click();
    await panel(page).locator('input[name="occurrences"]').fill('7');
    await expect(preview(page)).toHaveText('$1,203.00');
    await expect(panel(page).locator('[data-native-preview-total]')).toHaveText('$1,400.00');
    await panel(page).locator('[data-action="apply"]').click();
    await expect(accepted(page)).toHaveText('$1,400.00');
    await expect(team(page)).toHaveAttribute('data-team-state', 'stale');
    await expect(input(page, 'ratePerHour')).toHaveValue('101');
    await panel(page).locator('[data-native-chapter="people"]').click();
    await action(page, 'apply').click();
    await expect(accepted(page)).toHaveText('$1,400.00');
    await expect(team(page).locator('[data-person-status]')).toContainText('Cancel');
    await action(page, 'cancel').click();
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
    await expect(team(page).locator('[data-person-name]')).toHaveText('product-one');
    await expect(team(page).locator('[data-person-status]')).toContainText('Apply or cancel');
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
    await expect(input(page, 'ratePerHour')).toHaveValue('105');
    await expect(team(page)).toHaveAttribute('data-team-state', 'stale');
    await input(page, 'ratePerHour').fill('104');
    await expect(team(page).locator('[data-person-status]')).toContainText('Cancel');
    await team(page).locator('[data-person-field="ratePerHour"][data-step="1"]').click();
    await expect(input(page, 'ratePerHour')).toHaveValue('105.00');
    await expect(team(page).locator('[data-person-status]')).toContainText('current plan');
    await action(page, 'apply').click();
    assert.equal(await page.evaluate(() => window.teamFixture.studio.read() === window.teamFixture.accepted
      && window.teamFixture.studio.exportText() === window.teamFixture.serialized), true,
    'stale Apply retains the imported accepted identity and bytes');
    await action(page, 'cancel').click();
    await choose(page);
    await expect(input(page, 'ratePerHour')).toHaveValue('110.00');
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
      const labels = await team(page).locator('.native-coordination__control').evaluateAll(groups => groups.map(group => {
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
      const positions = () => team(page).evaluate(root => {
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
      const controls = await team(page).locator('.native-coordination__control').evaluateAll(groups => groups.map(group => {
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
}
