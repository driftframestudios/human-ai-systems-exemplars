import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit }, names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-capabilities');
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
  server = await startStaticServer(); for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => { try { await Promise.all([...browsers.values()].map(browser => browser.close())); } finally { await server?.close(); } });
const root = page => page.locator('[data-native-coordination]');
const panel = page => root(page).locator('[data-native-capabilities]');
const action = (page, name) => panel(page).locator(`[data-capability-action="${name}"]`);
const field = (page, name) => panel(page).locator(`input[data-capability-field="${name}"], select[data-capability-field="${name}"], textarea[data-capability-field="${name}"]`);
const total = page => root(page).locator('[data-native-total]');
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const bytes = page => page.evaluate(() => window.capabilityFixture.studio.exportText());
const choice = (page, id) => panel(page).locator(`[data-capability-action="select"][data-capability-definition="${id}"]`).first();
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function open(t, engine) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
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
    const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
    const element = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(element).dispose();
    const plan = createExamplePlan(); plan.people = plan.people.slice(0, 2).map(person => ({ ...person, fundedMinutes: 4800 }));
    plan.teams[0].personIds = plan.people.map(person => person.id);
    plan.work = [{ ...plan.work[0], personIds: [...plan.teams[0].personIds], minutesPerOccurrence: 120, occurrences: 1, funding: 'allocated' }];
    const studio = createStudio(plan); window.capabilityFixture = { studio, editing: createDraftCoordinator(studio), controller: mountCoordinationPanel(element, { studio }) };
  });
  await tab(page, 'work').click(); return page;
}
async function support(page) {
  await field(page, 'context').fill('Recover an accepted change in the pilot');
  await field(page, 'teamId').selectOption('delivery');
  await field(page, 'responsiblePersonIds').selectOption(['product-one', 'product-two']);
  await field(page, 'decisionOwnerPersonId').selectOption('product-one');
  for (const id of ['preparation', 'review']) {
    await panel(page).locator(`[data-capability-requirement="${id}"] > summary`).click();
    await field(page, `support.${id}`).selectOption('review');
  }
}

for (const engine of names) {
  test(`${engine}: a card reverses, installs shared support and explicit review, then returns through Undo`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    await expect(panel(page).locator('[data-capability-title]')).toHaveText('Actively negotiate expectations');
    await expect(panel(page).locator('[data-capability-configure]')).toBeHidden();
    await action(page, 'reverse').focus(); await page.keyboard.press('Enter');
    await expect(action(page, 'reverse')).toBeFocused(); await expect(panel(page).locator('[data-capability-front]')).toBeHidden();
    await expect(panel(page).locator('[data-capability-reverse]')).toBeVisible();
    await action(page, 'beside').click(); await expect(panel(page).locator('[data-capability-front]')).toBeVisible();
    await expect(panel(page).locator('[data-capability-reverse]')).toBeVisible(); assert.equal(await bytes(page), initial);
    await choice(page, 'inspect-history').click(); await support(page);
    const reviewGroup = panel(page).locator('[data-capability-requirement="review"]');
    await reviewGroup.locator('summary').click();
    await expect(reviewGroup).not.toHaveAttribute('open', '');
    await expect(reviewGroup.locator('summary')).toHaveText('Review with the responsible people · Weekly working session');
    await expect(panel(page).locator('[data-capability-preview]')).toContainText('Proposed investment: $16,000.00. Accepted investment: $16,000.00.');
    await reviewGroup.locator('summary').click();
    await field(page, 'new.review.enabled').selectOption('yes'); await field(page, 'new.review.teamId').selectOption('delivery');
    await field(page, 'new.review.label').fill('History review');
    await reviewGroup.locator('summary').click();
    await expect(reviewGroup).not.toHaveAttribute('open', '');
    await expect(reviewGroup.locator('summary')).toHaveText('Review with the responsible people · Weekly working session, Add History review');
    await reviewGroup.locator('summary').click();
    await field(page, 'new.review.personIds').selectOption('product-one'); await field(page, 'new.review.hoursPerSession').fill('1');
    await expect(field(page, 'new.review.hoursPerSession')).toHaveValue('1');
    await field(page, 'new.review.minutesPerSession').fill('30'); await field(page, 'new.review.funding').selectOption('additional');
    await expect(panel(page).locator('[data-capability-preview]')).toContainText('$16,150.00'); await expect(total(page)).toHaveText('$16,000.00');
    await action(page, 'apply').click(); await expect(total(page)).toHaveText('$16,150.00'); await expect(action(page, 'apply')).toBeFocused();
    await expect(field(page, 'context')).toHaveValue('Recover an accepted change in the pilot');
    if (await panel(page).locator('[data-capability-reverse]').isHidden()) await action(page, 'reverse').click();
    await expect(panel(page).locator('[data-capability-reverse]')).toContainText('$400.00 attributed within funded time');
    await expect(panel(page).locator('[data-capability-reverse]')).toContainText('$150.00 attributed to extra investment');
    await panel(page).locator('[data-capability-work="review"]').first().click();
    await expect(root(page).locator('[data-native-chapter-panel="coordination"]')).toBeVisible();
    await root(page).locator('[data-native-return-action]').click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).locator('[data-capability-title]')).toHaveText('Inspect history');
    await expect(field(page, 'context')).toHaveValue('Recover an accepted change in the pilot');
    await panel(page).screenshot({ path: resolve(captures, `${engine}-card.png`) });
    assert.deepEqual(await page.evaluate(() => { const p = window.capabilityFixture.studio.read(); return [p.state.abilities.length, p.state.work.length, p.state.abilities[0].supportBindings[1].workIds]; }), [1, 2, ['review', 'ability-1-support-2']]);
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-action="undo"]').click();
    await expect(total(page)).toHaveText('$16,000.00'); assert.equal(await bytes(page), initial);
  });

  test(`${engine}: adding a person returns to the saved card chooser, which stays usable at enlarged narrow sizes and releases on disposal`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await choice(page, 'inspect-history').click(); await field(page, 'context').fill('  Return to this card  ');
    await expect(field(page, 'context')).toHaveValue('  Return to this card  ');
    const reviewGroup = panel(page).locator('[data-capability-requirement="review"]');
    await reviewGroup.locator('summary').click();
    await field(page, 'new.review.enabled').selectOption('yes');
    await panel(page).locator('[data-native-create="person"][data-native-return-field="new.review.personIds"]').click();
    const assembly = root(page).locator('[data-native-assembly]');
    await assembly.locator('[data-assembly-form] [name="label"]').fill('Quality reviewer');
    await assembly.locator('[data-assembly-form] [name="ratePerHour"]').fill('100');
    await assembly.locator('[data-assembly-apply]').click();
    await page.evaluate(() => {
      const { studio, controller } = window.capabilityFixture;
      const source = JSON.parse(studio.exportText()); source.purpose.changedAbility = 'Changed plan';
      source.people[1].rateCentsPerHour = null;
      const result = studio.importText(JSON.stringify(source), studio.read()); if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    const returnButton = root(page).locator('[data-native-return-action]');
    await expect(returnButton).toHaveText('Return to card');
    await returnButton.click(); await expect(panel(page)).toHaveAttribute('data-capability-state', 'stale');
    await expect(field(page, 'context')).toHaveValue('  Return to this card  '); await action(page, 'review').click();
    await expect(field(page, 'context')).toHaveValue('  Return to this card  ');
    await expect(reviewGroup).toHaveAttribute('open', '');
    await expect(field(page, 'new.review.personIds')).toBeFocused();
    await field(page, 'new.review.personIds').selectOption({ label: 'Quality reviewer' });
    await field(page, 'new.review.enabled').selectOption('no');
    await expect(panel(page).locator('[data-capability-preview]')).toContainText('Known proposed investment: $8,000.00. Known accepted investment: $8,000.00.');
    await expect(panel(page).locator('[data-capability-preview]')).toContainText('Add missing hourly rates in People to complete the amounts.');
    await field(page, 'new.review.enabled').selectOption('yes');
    await field(page, 'new.review.minutesPerSession').fill('later');
    await expect(field(page, 'new.review.minutesPerSession')).toHaveAttribute('aria-invalid', 'true');
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await field(page, 'new.review.minutesPerSession').scrollIntoViewIfNeeded(); await frames(page);
      const boxes = await panel(page).locator('input[inputmode]').evaluateAll(inputs => inputs.filter(input => input.getClientRects().length).map(input => {
        const box = input.getBoundingClientRect(), css = getComputedStyle(input), context = document.createElement('canvas').getContext('2d');
        context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        return { left: box.left, right: box.right, content: box.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) - parseFloat(css.borderLeftWidth) - parseFloat(css.borderRightWidth), digits: context.measureText('00000').width };
      }));
      assert.equal(boxes.length, 3); assert.ok(boxes.every(box => box.left >= -.5 && box.right <= width + .5 && box.content >= box.digits), JSON.stringify(boxes));
    }
    await page.emulateMedia({ forcedColors: 'active' }); await field(page, 'new.review.minutesPerSession').fill('30');
    await expect(field(page, 'new.review.minutesPerSession')).toHaveValue('30');
    const accepted = await bytes(page); await page.evaluate(() => window.capabilityFixture.controller.dispose());
    await field(page, 'context').evaluate(input => { input.value = 'late event'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await bytes(page), accepted); await expect(panel(page).locator('[data-capability-fields]')).toHaveAttribute('disabled', '');
    await expect(field(page, 'context')).toBeDisabled();
  });
}
