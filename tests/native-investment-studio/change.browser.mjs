import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-change');
let server, fixture;
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
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
after(async () => { try { await Promise.all([...browsers.values()].map(browser => browser.close())); } finally { await server?.close(); } });
const root = page => page.locator('[data-native-coordination]');
const panel = page => root(page).locator('[data-native-change]');
const action = (page, name) => panel(page).locator(`[data-change-action="${name}"]`);
const field = (page, key) => panel(page).locator(`input[name="${key}"], select[name="${key}"]`);
const check = (page, key, value) => panel(page).locator(`input[name="${key}"][value="${value}"]`);
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const component = (page, framework, id) => panel(page).locator(`details[data-change-framework="${framework}"][data-change-component="${id}"]`);
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
  await tab(page, 'change').click(); await expect(panel(page)).toHaveAttribute('data-change-state', 'editing'); return page;
}

for (const engine of names) {
  test(`${engine}: framework drafts retain mappings and reset keeps support, viewpoint and accepted investment`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-action="baseline"]').click(); await tab(page, 'change').click();
    const urgency = component(page, 'kotter', 'urgency'); await urgency.locator(':scope > summary').click();
    await field(page, 'map.kotter.urgency.status').selectOption('look'); await check(page, 'map.kotter.urgency.workIds', 'review').check();
    await field(page, 'framework').selectOption('adkar@1.0.0');
    await component(page, 'adkar', 'awareness').locator(':scope > summary').click(); await field(page, 'map.adkar.awareness.status').selectOption('partial');
    await field(page, 'lens').selectOption('people@1.0.0'); await field(page, 'sourceFilter').selectOption('enterprise');
    await expect(panel(page).locator('[data-change-interpretation]')).toContainText('Who gains ability');
    const fader = panel(page).locator('input[type="range"][data-change-field="attention.urgency"]');
    await fader.focus(); await page.keyboard.press('Home'); await expect(field(page, 'attention.urgency')).toHaveValue('0');
    await page.keyboard.press('ArrowUp'); await expect(field(page, 'attention.urgency')).toHaveValue('1');
    await page.keyboard.press('ArrowDown'); await expect(field(page, 'attention.urgency')).toHaveValue('0');
    await expect(total(page)).toHaveText('$16,000.00');
    await page.keyboard.press('End'); await expect(field(page, 'attention.urgency')).toHaveValue('25');
    await panel(page).locator('[data-change-action="step"][data-change-field="attention.urgency"][data-change-step="-1"]').click();
    await expect(field(page, 'attention.urgency')).toHaveValue('24');
    await field(page, 'framework').selectOption('dual@1.0.0');
    for (const id of ['urgency', 'coalition', 'vision', 'broad-participation', 'remove-barriers', 'short-term-wins', 'sustain-acceleration', 'anchor-in-culture']) {
      await field(page, `attention.${id}`).fill(id === 'urgency' ? '25' : '0');
    }
    await expect(panel(page).locator('[data-change-attention-note]')).toContainText('Give the most attention to Urgency (25 parts). Consider whether the planned work reflects that choice.');
    await expect(panel(page).locator('.native-change__emphasis-tag')).toHaveText('Urgency');
    await expect(panel(page).locator('[data-change-channel="urgency"]')).toHaveAttribute('data-emphasis', 'highest');
    const geometry = await panel(page).locator('.native-change__channel').evaluateAll(channels => channels.map(channel => {
      const box = channel.getBoundingClientRect(), heading = channel.querySelector('h5'), range = channel.querySelector('input[type="range"]'), note = channel.querySelector('.native-change__channel-description');
      const fader = range.getBoundingClientRect();
      return { height: box.height, faderStart: fader.top - box.top, faderHeight: fader.height, headingColor: getComputedStyle(heading).color, descriptionAfter: note.getBoundingClientRect().top > fader.bottom };
    }));
    assert.ok(geometry.every(row => Math.abs(row.height - geometry[0].height) < 1 && Math.abs(row.faderStart - geometry[0].faderStart) < 1 && Math.abs(row.faderHeight - geometry[0].faderHeight) < 1 && row.descriptionAfter), JSON.stringify(geometry));
    assert.ok(geometry.every(row => row.headingColor === 'rgb(248, 241, 217)'), 'light headings remain readable on the dark housing');
    for (const key of ['framework', 'lens', 'sourceFilter']) {
      const size = await field(page, key).boundingBox(); assert.ok(size.height >= 44, `${key} has a complete field target`);
      if (await field(page, key).evaluate(el => getComputedStyle(el).appearance === 'base-select')) {
        assert.equal(await field(page, key).evaluate(el => getComputedStyle(el).backgroundImage), 'none', 'the native picker retains one arrow');
        await field(page, key).click(); await expect.poll(() => field(page, key).evaluate(el => el.matches(':open'))).toBe(true);
        await field(page, key).click(); await expect.poll(() => field(page, key).evaluate(el => el.matches(':open'))).toBe(false);
      }
      await field(page, key).click(); await page.keyboard.press('Escape');
      await expect(field(page, key)).toBeFocused();
    }
    const lensChoice = panel(page).locator('[data-change-lens="operating@1.0.0"]');
    await lensChoice.click(); await expect(lensChoice).toHaveAttribute('aria-pressed', 'true');
    await expect(field(page, 'lens')).toHaveValue('operating@1.0.0');
    await field(page, 'lens').selectOption('people@1.0.0');
    await expect(panel(page).locator('[data-change-lens="people@1.0.0"]')).toHaveAttribute('aria-pressed', 'true');

    await field(page, 'framework').selectOption('kotter@1.0.0');
    await expect(field(page, 'map.kotter.urgency.status')).toHaveValue('look'); await expect(check(page, 'map.kotter.urgency.workIds', 'review')).toBeChecked();
    await expect(panel(page).locator('[data-change-preview]')).toContainText('Proposed investment: $16,000.00. Accepted investment: $16,000.00.');
    assert.equal(await bytes(page), initial);
    await action(page, 'reset').click();
    await expect(field(page, 'attention.urgency')).toHaveValue('12'); await expect(field(page, 'lens')).toHaveValue('people@1.0.0');
    await expect(field(page, 'sourceFilter')).toHaveValue('enterprise'); await expect(check(page, 'map.kotter.urgency.workIds', 'review')).toBeChecked();
    await panel(page).locator('.native-change__attention').screenshot({ path: resolve(captures, `${engine}-mixer.png`) });
    await action(page, 'apply').click(); await expect(total(page)).toHaveText('$16,000.00');
    await tab(page, 'investment').click(); await expect(root(page).locator('[data-investment-comparison]')).toContainText('Change$0.00');
    await root(page).locator('[data-investment-action="undo"]').click(); assert.equal(await bytes(page), initial);
  });

  test(`${engine}: a configured supporting session applies with the settings, while stale raw attention remains recoverable`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const urgency = component(page, 'kotter', 'urgency'); await urgency.locator(':scope > summary').click();
    await field(page, 'sourceFilter').selectOption('core');
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
    await field(page, 'proposal.funding').selectOption('additional');
    await expect(panel(page).locator('[data-change-preview]')).toContainText('Proposed investment: $16,150.00'); await expect(total(page)).toHaveText('$16,000.00');
    await action(page, 'apply').click(); await expect(total(page)).toHaveText('$16,150.00');
    await expect(urgency.locator(':scope > summary')).toContainText('Pilot discussion');
    await urgency.locator('[data-change-action="work"][data-change-work="change-work-1"]').click();
    await expect(root(page).locator('[data-native-chapter-panel="coordination"]')).toBeVisible();
    await root(page).locator('[data-native-return-action]').click(); await expect(panel(page)).toBeVisible();
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-action="undo"]').click();
    assert.equal(await bytes(page), beforeProposal); await tab(page, 'change').click();
    if (await action(page, 'current').isVisible()) await action(page, 'current').click();
    await field(page, 'attention.urgency').fill(' later '); await tab(page, 'people').click();
    await page.evaluate(() => {
      const { studio, controller } = window.changeFixture, plan = JSON.parse(studio.exportText()); plan.purpose.changedAbility = 'Changed receiving task';
      const result = studio.importText(JSON.stringify(plan), studio.read()); if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    await tab(page, 'change').click(); await expect(panel(page)).toHaveAttribute('data-change-state', 'stale');
    await action(page, 'review').click(); await expect(field(page, 'attention.urgency')).toHaveValue(' later ');
    await expect(field(page, 'attention.urgency')).toHaveAttribute('aria-invalid', 'true');
    await field(page, 'attention.urgency').fill('25');
    await page.setViewportSize({ width: 320, height: 1000 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await field(page, 'attention.urgency').scrollIntoViewIfNeeded();
    const boxes = await panel(page).locator('[data-change-mixer] input').evaluateAll(inputs => inputs.map(input => {
      const box = input.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, height: box.height };
    }));
    assert.ok(boxes.every(box => box.left >= -.5 && box.right <= 320.5 && box.width > 0 && box.height > 0), JSON.stringify(boxes));
    await page.emulateMedia({ forcedColors: 'active' });
    const fader = panel(page).locator('input[type="range"][data-change-field="attention.urgency"]'); await fader.focus(); await page.keyboard.press('ArrowDown');
    await expect(field(page, 'attention.urgency')).toHaveValue('24');
    await panel(page).locator('[data-change-mixer]').screenshot({ path: resolve(captures, `${engine}-narrow-forced.png`) });
    const accepted = await bytes(page); await page.evaluate(() => window.changeFixture.controller.dispose());
    await field(page, 'attention.urgency').evaluate(input => { input.value = '5'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await bytes(page), accepted); await expect(field(page, 'attention.urgency')).toBeDisabled();
  });
  test(`${engine}: method examples explain a supporting session before its proposal changes investment`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    const vision = component(page, 'kotter', 'vision'); await vision.locator(':scope > summary').click();
    const method = id => vision.locator(`[data-change-method="${id}"]`);
    await expect(method('poda')).toContainText('what the team needs to learn');
    await expect(method('impact-map')).toContainText('people affected');
    await expect(method('strategy-canvas')).toContainText('current support');
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
      assert.ok(boxes[1].x > boxes[0].x && Math.abs(boxes[1].y - boxes[0].y) < 1, 'methods share the available row');
      assert.ok(boxes.every(box => box.x >= 0 && box.right <= width && box.width >= 280), JSON.stringify(boxes));
      await vision.screenshot({ path: resolve(captures, `${engine}-methods-${width}.png`) });
    }
    await method('poda').getByRole('button', { name: 'Plan supporting work for PODA', exact: true }).click();
    await expect(field(page, 'proposal.label')).toHaveValue('Clarify purpose and next learning');
    await expect(panel(page).locator('[data-change-work]')).toContainText('PODA supports Vision');
    await field(page, 'proposal.teamId').selectOption('delivery');
    await check(page, 'proposal.personIds', 'product-one').check();
    await field(page, 'proposal.minutesPerSession').fill('45');
    await field(page, 'proposal.occurrences').fill('2');
    await field(page, 'proposal.funding').selectOption('additional');
    await expect(panel(page).locator('[data-change-preview]')).toContainText('$16,150.00');
    await method('strategy-canvas').locator('details > summary').click();
    await expect(method('strategy-canvas')).toContainText('good-enough');
    await field(page, 'sourceFilter').selectOption('enterprise');
    await expect(field(page, 'proposal.minutesPerSession')).toHaveValue('45');
    assert.equal(await bytes(page), initial, 'explanations and filters leave the proposed work unaccepted');
    await field(page, 'sourceFilter').selectOption('core');
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await method('poda').scrollIntoViewIfNeeded();
    const narrow = await vision.locator('[data-change-method]:visible').evaluateAll(cards => cards.map(card => {
      const rect = card.getBoundingClientRect(); return { x: rect.x, right: rect.right, width: rect.width };
    }));
    assert.ok(narrow.every(box => box.x >= -.5 && box.right <= 320.5 && box.width > 0), JSON.stringify(narrow));
    await method('poda').screenshot({ path: resolve(captures, `${engine}-method-narrow.png`) });
    await action(page, 'apply').click(); await expect(total(page)).toHaveText('$16,150.00');
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-action="undo"]').click();
    assert.equal(await bytes(page), initial, 'one Undo restores the exact preceding accepted plan');
  });

}
