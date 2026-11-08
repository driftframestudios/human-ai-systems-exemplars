import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
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
  fixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>' });
  server = await startStaticServer(); for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => { try { await Promise.all([...browsers.values()].map(browser => browser.close())); } finally { await server?.close(); } });
const root = page => page.locator('[data-native-coordination]');
const panel = page => root(page).locator('[data-native-capabilities]');
const action = (page, name) => panel(page).locator(`[data-capability-action="${name}"]`);
const field = (page, name) => panel(page).locator(`input[data-capability-field="${name}"], select[data-capability-field="${name}"], textarea[data-capability-field="${name}"]`);
const choose = (page, name, value) => panel(page).locator(`input[type="radio"][data-capability-field="${name}"][value="${value}"]`).check();
const ids = (page, name) => panel(page).locator(`ul[data-capability-field="${name}"]`);
const section = (page, name) => panel(page).locator(`[data-capability-section-key="${name}"]`);
const total = page => root(page).locator('[data-native-total]');
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const bytes = page => page.evaluate(() => window.capabilityFixture.studio.exportText());
const choice = (page, id) => panel(page).locator(`[data-capability-action="select"][data-capability-definition="${id}"]`).first();
const supportCell = (page, id, phase) => panel(page).locator(`.native-capability__cell[data-capability-definition="${id}"][data-capability-phase="${phase}"]`).first();
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function open(t, engine, showcase = false) {
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
  await page.evaluate(async showcase => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createExamplePlan } = await import('/collaboration/native-investment-studio/contract.mjs');
    const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
    const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
    const element = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(element).dispose();
    const plan = showcase ? createShowcasePlan() : createExamplePlan();
    if (!showcase) {
      plan.people = plan.people.slice(0, 2).map(person => ({ ...person, fundedMinutes: 4800 }));
      plan.teams[0].personIds = plan.people.map(person => person.id);
      plan.work = [{ ...plan.work[0], personIds: [...plan.teams[0].personIds], minutesPerOccurrence: 120, occurrences: 1, funding: 'allocated' }];
    }
    const studio = createStudio(plan); window.capabilityFixture = { studio, editing: createDraftCoordinator(studio), controller: mountCoordinationPanel(element, { studio }) };
  }, showcase);
  await tab(page, 'work').click(); return page;
}
async function support(page) {
  await field(page, 'context').fill('Recover an accepted change in the pilot');
  await section(page, 'responsibility').click();
  await choose(page, 'teamId', 'delivery');
  for (const id of ['product-one', 'product-two']) await ids(page, 'responsiblePersonIds').locator(`input[value="${id}"]`).check();
  await choose(page, 'decisionOwnerPersonId', 'product-one');
  for (const id of ['preparation', 'review']) {
    await section(page, id).click();
    await panel(page).locator(`input[data-capability-field="support.${id}"][value="review"]`).check();
  }
}

for (const engine of names) {
  test(`${engine}: support cells distinguish recorded observations, linked work and current gaps`, async t => {
    const page = await open(t, engine, true);
    await page.evaluate(() => {
      const { studio, controller } = window.capabilityFixture, candidate = JSON.parse(studio.exportText());
      candidate.work.find(row => row.id === 'review').status = 'paused';
      candidate.practices.find(row => row.id === 'readiness-evidence').responsiblePersonIds = [];
      candidate.capabilityEvidence.push({ id: 'recovery-observation', subject: { kind: 'practice', instanceId: 'readiness-evidence' },
        stage: 'rehearsed', context: 'Service-request pilot walkthrough', observation: 'The receiving operator recovered the saved request.',
        recorderPersonId: 'noor', reviewBoundary: 'Routine requests in the walkthrough', observedPlanRevision: candidate.revision });
      const result = studio.importText(JSON.stringify(candidate), studio.read()); if (!result.ok) throw Error(result.error.code);
      controller.refresh();
    });
    const accepted = await bytes(page);
    for (const [kind, caption, firstColumn] of [
      ['ability', 'Customer abilities', 'What people can do'],
      ['practice', 'Team practices', 'How the team works'],
    ]) {
      const table = panel(page).locator(`[data-capability-catalogue="${kind}"] table`);
      await expect(table).toHaveAccessibleName(`${caption} · support in the accepted plan`);
      assert.deepEqual(await table.getByRole('columnheader').allTextContents(), [firstColumn, 'Responsibility', 'Preparation', 'Review', 'Observation']);
      assert.ok(await table.getByRole('columnheader').evaluateAll(cells => cells.every(cell => cell.scope === 'col')));
      assert.ok(await table.getByRole('rowheader').evaluateAll(cells => cells.length > 0 && cells.every(cell => cell.scope === 'row')));
      assert.equal(await table.locator('button:not(.native-control--navigate)').count(), 0, 'each support or card receiver carries the onward cue');
    }
    await expect(supportCell(page, 'expectation', 'preparation')).toHaveAttribute('data-support-state', 'unspecified');
    await expect(supportCell(page, 'expectation', 'preparation')).toContainText('Not specified');
    await expect(supportCell(page, 'expectation', 'preparation')).not.toHaveClass(/native-control--navigate/u);
    assert.equal(await supportCell(page, 'expectation', 'preparation').evaluate(element => element.tagName), 'SPAN');
    await expect(supportCell(page, 'assurance', 'responsibility')).toHaveAttribute('data-support-state', 'gap');
    await expect(supportCell(page, 'assurance', 'responsibility')).toContainText('Choose the people responsible for the work.');
    await expect(supportCell(page, 'assurance', 'preparation')).toHaveAttribute('data-support-state', 'linked');
    await expect(supportCell(page, 'assurance', 'preparation')).toContainText('Operations rehearsal');
    await expect(supportCell(page, 'assurance', 'review')).toHaveAttribute('data-support-state', 'attention');
    await expect(supportCell(page, 'assurance', 'review')).toContainText('Review the time and availability of Pilot decision review.');
    await expect(supportCell(page, 'assurance', 'observation')).toHaveAttribute('data-support-state', 'recorded');
    await expect(supportCell(page, 'assurance', 'observation')).toContainText('Rehearsed recorded');
    await expect(supportCell(page, 'assurance', 'observation')).toContainText('The receiving operator recovered the saved request.');
    await expect(supportCell(page, 'assurance', 'observation')).toHaveClass(/native-control--navigate/u);
    await expect(supportCell(page, 'assurance', 'observation')).toHaveAccessibleName('Establish a fitting acceptance observation · Observation: Rehearsed recorded. The receiving operator recovered the saved request.');
    await supportCell(page, 'assurance', 'observation').focus(); await page.keyboard.press('Enter');
    await expect(panel(page).locator('[data-capability-example]').first()).toBeFocused();
    await expect(panel(page).locator('[data-capability-examples]')).toContainText('Illustrative walkthroughs');
    await panel(page).locator('[data-capability-example="recovery"]').click();
    await expect(panel(page).locator('.native-capability-example-reading')).toContainText('A receiving team finds a missing detail.');
    await expect(total(page)).toHaveText('$3,980.00');
    assert.equal(await bytes(page), accepted, 'inspection keeps historical observations and current support separate');
  });
  test(`${engine}: support cells resume the same accepted and new-card drafts at the requested section`, async t => {
    const page = await open(t, engine, true), accepted = await bytes(page);
    await supportCell(page, 'assurance', 'preparation').click();
    const prepare = panel(page).locator('[data-capability-requirement="preparation"]');
    await expect(prepare).toBeVisible();
    await expect(ids(page, 'support.preparation')).toBeFocused();
    await section(page, 'context').click(); await field(page, 'context').fill('  Keep the recovery rehearsal context  '); await section(page, 'preparation').click();
    await field(page, 'new.preparation.enabled').selectOption('yes');
    await field(page, 'new.preparation.minutesPerSession').fill('later');
    await supportCell(page, 'assurance', 'review').click();
    await expect(panel(page).locator('[data-capability-requirement="review"]')).toBeVisible();
    await expect(field(page, 'context')).toHaveValue('  Keep the recovery rehearsal context  ');
    await supportCell(page, 'expectation', 'responsibility').click();
    await expect(ids(page, 'teamId')).toBeFocused();
    await expect(action(page, 'configure')).not.toHaveClass(/native-control--create/u);
    await supportCell(page, 'assurance', 'preparation').click();
    await expect(field(page, 'context')).toHaveValue('  Keep the recovery rehearsal context  ');
    await expect(field(page, 'new.preparation.minutesPerSession')).toHaveValue('later');
    await supportCell(page, 'inspect-history', 'preparation').click();
    await expect(action(page, 'configure')).toHaveClass(/native-control--create/u);
    await section(page, 'context').click(); await field(page, 'context').fill('  Keep this history proposal  '); await section(page, 'preparation').click();
    await supportCell(page, 'inspect-history', 'review').click();
    await expect(field(page, 'context')).toHaveValue('  Keep this history proposal  ');
    await expect(action(page, 'configure')).toBeHidden();
    await expect(field(page, 'context')).toHaveValue('  Keep this history proposal  ');
    await supportCell(page, 'expectation', 'responsibility').click();
    await supportCell(page, 'inspect-history', 'observation').click();
    await expect(panel(page).locator('[data-capability-example]').first()).toBeFocused();
    await expect(field(page, 'context')).toHaveValue('  Keep this history proposal  ');
    await expect(supportCell(page, 'inspect-history', 'preparation')).toHaveAttribute('data-support-state', 'available');
    assert.equal(await bytes(page), accepted, 'moving between support cells retains unfinished raw text and accepts no records');
    assert.equal(await page.evaluate(() => window.capabilityFixture.studio.read().state.abilities.length), 0);
  });
  test(`${engine}: support tables keep words and controls available at laptop and enlarged narrow widths`, async t => {
    const page = await open(t, engine, true), accepted = await bytes(page);
    const region = panel(page).locator('[data-capability-catalogue="practice"]');
    for (const [width, textSize] of [[1440, '100%'], [390, '200%']]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(size => { document.documentElement.style.fontSize = size; }, textSize);
      await region.scrollIntoViewIfNeeded();
      const box = await region.evaluate(element => ({ left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right,
        viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, ownWidth: element.clientWidth, contentWidth: element.scrollWidth }));
      assert.ok(box.left >= -.5 && box.right <= width + .5 && box.pageWidth <= width + .5, JSON.stringify(box));
      if (width === 390) {
        assert.ok(box.contentWidth > box.ownWidth, 'the narrow table retains its comparable columns in local scrolling');
        await region.focus(); await expect(region).toBeFocused();
        await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
        assert.ok(await region.evaluate(element => element.scrollLeft) > 0);
      }
      await region.screenshot({ path: resolve(captures, `${engine}-support-sequencer-${width}.png`) });
    }
    const keyPaint = async id => choice(page, id).evaluate(element => {
      const css = getComputedStyle(element); return [css.backgroundColor, css.color, css.boxShadow];
    });
    assert.deepEqual(await keyPaint('compare-alternatives'), await keyPaint('focalization'), 'both catalogues share an available-key treatment');
    await choice(page, 'compare-alternatives').click(); const selectedPaint = await keyPaint('compare-alternatives');
    await choice(page, 'focalization').click(); assert.deepEqual(await keyPaint('focalization'), selectedPaint, 'both catalogues share the selected-key treatment');
    await page.emulateMedia({ forcedColors: 'active' });
    await supportCell(page, 'assurance', 'review').focus(); await page.keyboard.press('Enter');
    await expect(ids(page, 'support.review')).toBeFocused();
    assert.equal(await bytes(page), accepted);
  });
  test(`${engine}: the pilot proposal previews its people and keeps support choices stable across compact columns`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true), initial = await bytes(page);
    await choice(page, 'inspect-history').click();
    await expect(field(page, 'context')).toHaveValue('Help pilot reviewers find an earlier service-request decision and recover why it changed.');
    const people = panel(page).locator('[data-capability-people]');
    await expect(people).toBeHidden();
    await expect(people.locator('h5')).toHaveText('People and responsibility · Engineering · Product lead decides');
    const prepare = panel(page).locator('[data-capability-requirement="preparation"]');
    await expect(prepare.locator('h5')).toContainText('Prototype pairing');
    await section(page, 'preparation').click();
    const support = ids(page, 'support.preparation');
    const selected = support.locator('input[value="pairing"]'); await expect(selected).toBeChecked();
    const positions = await support.locator('li').evaluateAll(items => items.map(item => ({ x: item.offsetLeft, y: item.offsetTop })));
    assert.equal(positions[0].y, positions[1].y); assert.ok(positions[1].x > positions[0].x);
    await selected.uncheck(); await support.locator('input[value="research"]').check();
    assert.deepEqual(await support.locator('li').evaluateAll(items => items.map(item => ({ x: item.offsetLeft, y: item.offsetTop }))), positions,
      'changing membership leaves each choice in place');
    await page.setViewportSize({ width: 390, height: 1000 });
    const narrow = await support.locator('li').evaluateAll(items => items.map(item => ({ x: item.offsetLeft, y: item.offsetTop })));
    assert.equal(narrow[0].x, narrow[1].x); assert.ok(narrow[1].y > narrow[0].y);
    await expect(support.locator('input[value="research"]')).toBeChecked();
    assert.equal(await bytes(page), initial); await expect(total(page)).toHaveText('$3,980.00');
    await panel(page).screenshot({ path: resolve(captures, `${engine}-compact-proposal.png`) });
    await prepare.locator('[data-capability-record-kind="session"][data-capability-receiver-field="support.preparation"]').click();
    await expect(tab(page, 'work')).toHaveAttribute('aria-selected', 'true');
    await expect(panel(page)).toHaveAttribute('data-capability-state', 'editing');
    await expect(prepare).toBeVisible();
    await expect(support.locator('input[value="research"]')).toBeChecked();
    await expect(prepare.getByRole('checkbox', { name: 'Review the next step' })).toBeChecked();
    await expect(prepare.getByRole('checkbox', { name: 'Review the next step' })).toBeFocused();
    assert.equal((await page.evaluate(() => window.capabilityFixture.studio.read().state.abilities.length)), 0,
      'returning supplies the new session while keeping the capability proposal unaccepted');
  });
  test(`${engine}: one selected support module installs shared work and returns through Undo`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    await expect(panel(page).locator('[data-capability-title]')).toHaveText('Actively negotiate expectations');
    await expect(action(page, 'reverse')).toHaveCount(0); await expect(action(page, 'beside')).toHaveCount(0);
    await choice(page, 'inspect-history').click(); await support(page);
    const reviewGroup = panel(page).locator('[data-capability-requirement="review"]');
    await expect(reviewGroup).toBeVisible();
    await expect(panel(page).locator('[data-capability-people]')).toBeHidden();
    await expect(field(page, 'context')).toBeHidden();
    await expect(reviewGroup.locator('h5')).toHaveText('Review with the responsible people · Weekly working session');
    await field(page, 'new.review.enabled').selectOption('yes'); await field(page, 'new.review.teamId').selectOption('delivery');
    await field(page, 'new.review.label').fill('History review');
    await ids(page, 'new.review.personIds').locator('input[value="product-one"]').check(); await field(page, 'new.review.hoursPerSession').fill('1');
    await field(page, 'new.review.minutesPerSession').fill('30'); await field(page, 'new.review.funding').selectOption('additional');
    await expect(panel(page).locator('[data-capability-preview]')).toContainText('$16,150.00'); await expect(total(page)).toHaveText('$16,000.00');
    await action(page, 'apply').click(); await expect(total(page)).toHaveText('$16,150.00'); await expect(action(page, 'apply')).toBeFocused();
    await expect(field(page, 'context')).toHaveValue('Recover an accepted change in the pilot');
    await reviewGroup.locator('[data-capability-work="review"]').click();
    await expect(root(page).locator('[data-native-chapter-panel="coordination"]')).toBeVisible();
    await root(page).locator('[data-native-return-action]').click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).locator('[data-capability-title]')).toHaveText('Inspect history');
    await expect(field(page, 'context')).toHaveValue('Recover an accepted change in the pilot');
    await panel(page).screenshot({ path: resolve(captures, `${engine}-card.png`) });
    assert.deepEqual(await page.evaluate(() => { const p = window.capabilityFixture.studio.read(); return [p.state.abilities.length, p.state.work.length, p.state.abilities[0].supportBindings[1].workIds]; }), [1, 2, ['review', 'ability-1-support-2']]);
    await tab(page, 'investment').click(); await root(page).locator('[data-investment-deck="compare"]').click(); await root(page).locator('[data-investment-action="undo"]').click();
    await expect(total(page)).toHaveText('$16,000.00'); assert.equal(await bytes(page), initial);
  });

  test(`${engine}: adding a person stays in the support rack, which remains usable at enlarged narrow sizes and releases on disposal`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await choice(page, 'inspect-history').click(); await field(page, 'context').fill('  Return to this card  ');
    await expect(field(page, 'context')).toHaveValue('  Return to this card  ');
    const reviewGroup = panel(page).locator('[data-capability-requirement="review"]');
    await section(page, 'review').click();
    await field(page, 'new.review.enabled').selectOption('yes');
    await panel(page).locator('[data-capability-record-kind="person"][data-capability-receiver-field="new.review.personIds"]').click();
    await expect(tab(page, 'work')).toHaveAttribute('aria-selected', 'true');
    await expect(ids(page, 'new.review.personIds').getByRole('checkbox', { name: 'Person 3' })).toBeChecked();
    await expect(ids(page, 'new.review.personIds').getByRole('checkbox', { name: 'Person 3' })).toBeFocused();
    await action(page, 'close').click();
    await expect(panel(page).locator('[data-capability-configure]')).not.toHaveAttribute('open', '');
    await expect(choice(page, 'inspect-history')).toBeFocused();
    await supportCell(page, 'inspect-history', 'review').click();
    await expect(ids(page, 'new.review.personIds').getByRole('checkbox', { name: 'Person 3' })).toBeChecked();
    await page.evaluate(() => {
      const { studio, controller } = window.capabilityFixture;
      const source = JSON.parse(studio.exportText()); source.purpose.changedAbility = 'Changed plan';
      source.people[1].rateCentsPerHour = null;
      const result = studio.importText(JSON.stringify(source), studio.read()); if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    await expect(panel(page)).toHaveAttribute('data-capability-state', 'stale');
    await expect(field(page, 'context')).toHaveValue('  Return to this card  '); await action(page, 'review').click();
    await expect(field(page, 'context')).toHaveValue('  Return to this card  ');
    await expect(reviewGroup).toBeVisible();
    await expect(ids(page, 'new.review.personIds').getByRole('checkbox', { name: 'Person 3' })).toBeChecked();
    await field(page, 'new.review.enabled').selectOption('no');
    await expect(panel(page).locator('[data-capability-preview]')).toContainText('Known proposed investment: $8,400.00. Known accepted investment: $8,400.00.');
    await expect(panel(page).locator('[data-capability-preview]')).toContainText('Add missing hourly rates in People to complete the amounts.');
    await field(page, 'new.review.enabled').selectOption('yes');
    await field(page, 'new.review.minutesPerSession').fill('later');
    await expect(field(page, 'new.review.minutesPerSession')).toHaveAttribute('aria-invalid', 'true');
    for (const width of [1440, 390]) {
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
