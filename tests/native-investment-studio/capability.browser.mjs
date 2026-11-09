import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit }, names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-capabilities');
let server, fixture;
registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  fixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>' });
  server = await own(startStaticServer()); for (const name of names) browsers.set(name, await own(engines[name].launch()));
});
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
  test(`${engine}: local people and team names update shared records while support remains a proposal`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true), initial = JSON.parse(await bytes(page));
    const rename = (key, id) => panel(page).locator(`[data-capability-action="rename"][data-capability-rename-field="${key}"][data-capability-rename-id="${id}"]`);
    const name = panel(page).locator('[data-capability-rename-name]');
    const raw = () => page.evaluate(() => window.capabilityFixture.editing.capability.read().draft.raw);
    await choice(page, 'trace-evidence').click();
    await field(page, 'context').fill('  Keep this unfinished evidence proposal  ');
    await section(page, 'responsibility').click();
    await choose(page, 'teamId', 'product'); await choose(page, 'decisionOwnerPersonId', 'leo');
    await ids(page, 'responsiblePersonIds').locator('input[value="leo"]').check();
    const retained = await raw();
    await rename('responsiblePersonIds', 'leo').click(); await expect(name).toBeFocused();
    await name.fill('  '); await name.press('Enter');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(panel(page).locator('.native-capability__rename')).toContainText('Enter a name.');
    assert.deepEqual(JSON.parse(await bytes(page)), initial, 'blank names accept neither a shared record nor support');
    await name.fill('Cancelled name'); await name.press('Escape');
    await expect(name).toHaveCount(0); await expect(rename('responsiblePersonIds', 'leo')).toBeFocused();
    assert.deepEqual(await raw(), retained);
    await rename('responsiblePersonIds', 'leo').click(); await name.fill('Evidence researcher');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await panel(page).locator('.native-capability__rename').evaluate(element => {
        const box = element.getBoundingClientRect(); return { left: box.left, right: box.right, page: document.documentElement.scrollWidth };
      });
      assert.ok(geometry.left >= 0 && geometry.right <= width && geometry.page <= width, JSON.stringify(geometry));
      await panel(page).locator('.native-capability-rack').screenshot({ path: resolve(captures, `${engine}-rename-${width}.png`) });
    }
    await name.press('Enter'); await expect(rename('responsiblePersonIds', 'leo')).toBeFocused();
    await expect(ids(page, 'decisionOwnerPersonId').getByRole('radio', { name: 'Evidence researcher', exact: true })).toBeChecked();
    let accepted = JSON.parse(await bytes(page));
    assert.deepEqual(accepted.people, initial.people.map(person => person.id === 'leo' ? { ...person, label: 'Evidence researcher' } : person));
    assert.deepEqual(accepted.teams, initial.teams); assert.deepEqual(accepted.work, initial.work); assert.deepEqual(accepted.abilities, initial.abilities);
    assert.deepEqual(await raw(), retained, 'renaming retains exact support text and assignment IDs');
    await root(page).locator('[data-studio-undo]').click();
    assert.deepEqual(await raw(), retained, 'global Undo parks and preserves the support proposal');
    await expect(ids(page, 'decisionOwnerPersonId').getByRole('radio', { name: 'Researcher', exact: true })).toBeChecked();
    await action(page, 'review').click();
    await rename('decisionOwnerPersonId', 'leo').click(); await name.fill('Evidence researcher'); await action(page, 'save-name').click();
    await rename('teamId', 'product').click(); await name.fill('Research and product'); await action(page, 'save-name').click();
    await expect(rename('teamId', 'product')).toBeFocused();
    accepted = JSON.parse(await bytes(page));
    assert.deepEqual(accepted.teams, initial.teams.map(team => team.id === 'product' ? { ...team, label: 'Research and product' } : team));
    assert.deepEqual(accepted.abilities, initial.abilities); assert.deepEqual(await raw(), retained);
    const history = await page.evaluate(() => window.capabilityFixture.studio.readHistory());
    await rename('teamId', 'product').click(); await action(page, 'save-name').click();
    assert.deepEqual(await page.evaluate(() => window.capabilityFixture.studio.readHistory()), history, 'an unchanged name creates no undo step');
    await tab(page, 'people').click();
    await expect(root(page).locator('[data-roster-person="leo"]')).toContainText('Evidence researcher');
    await expect(root(page).locator('[data-people-team="product"]')).toContainText('Research and product');
    await tab(page, 'work').click(); await choice(page, 'trace-evidence').click();
    assert.deepEqual(await raw(), retained, 'the proposal returns after visiting the canonical People view');
    await supportCell(page, 'expectation', 'responsibility').click();
    const acceptedSupport = await raw();
    await rename('decisionOwnerPersonId', 'maya').click(); await name.fill('Product coordinator'); await action(page, 'save-name').click();
    await expect(supportCell(page, 'expectation', 'responsibility')).toContainText('Product coordinator decides');
    assert.deepEqual(await raw(), acceptedSupport, 'an accepted practice retains its own support draft during a shared rename');
    assert.deepEqual(JSON.parse(await bytes(page)).practices, initial.practices, 'the support-table reading changes through shared IDs');
  });
  test(`${engine}: Trace evidence keeps readable choices in one compact support rack`, async t => {
    const page = await open(t, engine, true), accepted = await bytes(page);
    const trace = choice(page, 'trace-evidence'), rack = panel(page).locator('.native-capability-rack');
    const contrast = locator => locator.evaluate(element => {
      const rgb = value => value.match(/[\d.]+/gu).slice(0, 3).map(Number);
      const light = value => rgb(value).map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
        .reduce((sum, channel, i) => sum + channel * [.2126, .7152, .0722][i], 0);
      let backdrop = element;
      while (backdrop.parentElement && getComputedStyle(backdrop).backgroundColor === 'rgba(0, 0, 0, 0)') backdrop = backdrop.parentElement;
      const pair = [light(getComputedStyle(element).color), light(getComputedStyle(backdrop).backgroundColor)].sort((a, b) => b - a);
      return (pair[0] + .05) / (pair[1] + .05);
    });
    assert.ok(await contrast(trace) >= 4.5, 'the pale Trace evidence key has readable text');
    await trace.click(); await section(page, 'responsibility').click();
    const people = panel(page).locator('[data-capability-people]');
    await expect(people).toBeVisible();
    assert.ok(await contrast(action(page, 'close')) >= 4.5, 'Close remains readable on the rack header');
    for (const width of [1440, 768, 767, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await people.evaluate(element => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, page: document.documentElement.scrollWidth,
          halves: [...element.querySelectorAll('.native-capability__half-rack')].map(half => ({ x: half.offsetLeft, y: half.offsetTop })),
          choices: [...element.querySelectorAll('input')].map(input => { const box = input.getBoundingClientRect(); return { width: box.width, height: box.height }; }) };
      });
      assert.ok(geometry.left >= 0 && geometry.right <= width && geometry.page <= width, JSON.stringify(geometry));
      assert.ok(geometry.choices.length > 10 && geometry.choices.every(box => box.width <= 40 && box.height <= 24), 'native choices stay distinct from full-width text inputs');
      assert.equal(geometry.halves.length, 2);
      if (width >= 768) assert.equal(geometry.halves[0].y, geometry.halves[1].y, 'team and participation sit beside decision ownership');
      else assert.ok(geometry.halves[1].y > geometry.halves[0].y, 'the same groups stack on a phone');
      if ([1440, 390].includes(width)) await rack.screenshot({ path: resolve(captures, `${engine}-trace-people-${width}.png`) });
    }
    await choose(page, 'decisionOwnerPersonId', 'leo');
    await action(page, 'close').click(); await expect(trace).toBeFocused();
    await trace.click(); await section(page, 'responsibility').click();
    await expect(ids(page, 'decisionOwnerPersonId').getByRole('radio', { name: 'Researcher', exact: true })).toBeChecked();
    await section(page, 'context').click(); await expect(people).toBeHidden();
    await page.setViewportSize({ width: 1440, height: 1000 }); await expect(people).toBeHidden();
    assert.equal(await bytes(page), accepted, 'inspection and Close retain the support proposal without accepting it');
  });
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
    await expect(prepare.getByRole('checkbox', { name: 'New session 1' })).toBeChecked();
    await expect(prepare.getByRole('checkbox', { name: 'New session 1' })).toBeFocused();
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
    await panel(page).locator('.native-capability-rack').screenshot({ path: resolve(captures, `${engine}-paired-support.png`) });
    await expect(panel(page).locator('[data-capability-preview]')).toContainText('$16,150.00'); await expect(total(page)).toHaveText('$16,000.00');
    const topApply = panel(page).locator('[data-editor-apply]');
    await expect(topApply).toHaveCount(1); await expect(topApply).toBeEnabled();
    await topApply.click(); await expect(total(page)).toHaveText('$16,150.00'); await expect(topApply).toBeFocused();
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
    await expect(ids(page, 'new.review.personIds').getByRole('checkbox', { name: 'New person 1' })).toBeChecked();
    await expect(ids(page, 'new.review.personIds').getByRole('checkbox', { name: 'New person 1' })).toBeFocused();
    await action(page, 'close').click();
    await expect(panel(page).locator('[data-capability-configure]')).not.toHaveAttribute('open', '');
    await expect(choice(page, 'inspect-history')).toBeFocused();
    await supportCell(page, 'inspect-history', 'review').click();
    await expect(ids(page, 'new.review.personIds').getByRole('checkbox', { name: 'New person 1' })).toBeChecked();
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
    await expect(ids(page, 'new.review.personIds').getByRole('checkbox', { name: 'New person 1' })).toBeChecked();
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
