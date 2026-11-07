import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
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
  fixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>' });
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
const adjacent = page => root(page).locator('.studio-rack-editor');
const record = (page, kind, id) => root(page).locator(`.studio-accepted-connections [data-studio-record-kind="${kind}"][data-studio-record-id="${id}"]`).first();
async function openTeamPlanning(page) {
  await tab(page, 'coordination').click();
  const reading = root(page).locator('.studio-accepted-connections');
  if (!(await reading.evaluate(node => node.open))) await reading.locator(':scope > summary').click();
}

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
  await people(page).locator('.studio-people-rates > summary').click();
  return page;
}

async function ada(page) {
  await action(page, 'person-create').click();
  await field(page, 'label').fill('Ada');
  await field(page, 'ratePerHour').fill('120');
  await field(page, 'fundedHours').fill('2');
}

for (const engine of names) {
  test(`${engine}: People session tracks return to people and team lanes open the matching membership editor`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const accepted = await bytes(page);
    const track = people(page).locator('.studio-people-reading .studio-session-tracks__pad').first();
    await expect(track).toHaveClass(/native-control--navigate/);
    await track.click();
    await expect(tab(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(root(page).locator('[data-native-session-editor] [data-native-configure]')).toHaveAttribute('open', '');
    await root(page).getByRole('button', { name: 'Return to people and teams', exact: true }).click();
    await expect(tab(page, 'people')).toHaveAttribute('aria-selected', 'true');
    await expect(people(page).locator('.studio-people-reading button').first()).toBeFocused();
    await expect(action(page, 'person-create')).toBeVisible();
    await tab(page, 'coordination').click();
    const workspace = root(page).locator('[data-native-workspace="connection"]');
    await expect(workspace.getByRole('heading', { name: 'Team planning', exact: true })).toBeVisible();
    await workspace.locator('.studio-accepted-connections > summary').click();
    const lane = root(page).locator('[data-team-lane="delivery"]');
    await lane.getByRole('button', { name: 'Choose people', exact: true }).click();
    await expect(tab(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(adjacent(page).locator('[data-assembly-summary]')).toHaveText('Settings · Product and Engineering');
    await expect(adjacent(page).locator('[data-assembly-members]')).toBeVisible();
    assert.equal(await bytes(page), accepted);
  });
  test(`${engine}: adjacent person editing retains one owner through Close, switching, Cancel and Apply`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true), accepted = await bytes(page);
    await page.evaluate(() => { window.assemblyFixture.personNode = document.querySelector('[data-person-configure]'); });
    await openTeamPlanning(page);
    const first = record(page, 'person', 'product-one'), second = record(page, 'person', 'product-two');
    const editor = root(page).locator('[data-person-configure]');
    const rate = editor.locator('[name="ratePerHour"]');
    await first.click();
    await expect(tab(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(adjacent(page)).toBeVisible(); await expect(rate).toBeFocused();
    assert.equal(await adjacent(page).evaluate(node => node.previousElementSibling.matches('[data-native-connection-view]')), true, 'the receiver follows the rack that supplied the pointer target');
    await expect(editor).toHaveCount(1); await expect(adjacent(page).locator('[data-person-configure]')).toHaveCount(1);
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    assert.equal(await first.evaluate(node => document.getElementById(node.getAttribute('aria-controls'))?.contains(document.querySelector('[data-person-configure]'))), true);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height:1000 }); await frames(page);
      const geometry = await adjacent(page).evaluate(node => {
        const outer=node.getBoundingClientRect();
        return { left:outer.left, right:outer.right, nestedForm:Boolean(node.closest('form')),
          targets:[...node.querySelectorAll('input,button,.native-knob')].filter(target => target.getClientRects().length).map(target => {
            const box=target.getBoundingClientRect(); return { left:box.left, right:box.right };
          }) };
      });
      const amount = await rate.evaluate(input => {
        const css = getComputedStyle(input), context = document.createElement('canvas').getContext('2d');
        context.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        return { available:input.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight), text:context.measureText(input.value).width };
      });
      assert.ok(amount.available >= amount.text, `the current hourly rate remains readable at ${width}px: ${JSON.stringify(amount)}`);
      assert.equal(geometry.nestedForm, false, 'the existing person form has its own submission boundary');
      assert.ok(geometry.left >= 0 && geometry.right <= width && geometry.targets.every(box => box.left >= geometry.left - 1 && box.right <= geometry.right + 1), JSON.stringify(geometry));
      await adjacent(page).evaluate(node => node.scrollIntoView({ block:'start', behavior:'instant' })); await frames(page);
      await page.screenshot({ path:resolve(captures, `${engine}-adjacent-person-${width}-viewport.png`) });
      await adjacent(page).screenshot({ path:resolve(captures, `${engine}-adjacent-person-${width}.png`) });
    }
    await page.setViewportSize({ width:1440, height:1000 });
    await rate.fill('00101.50');
    await page.evaluate(() => { window.assemblyFixture.personToken = window.assemblyFixture.editing.person.read().draft.token; });
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(adjacent(page)).toBeHidden(); await expect(first).toBeFocused();
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    assert.equal(await bytes(page), accepted);
    await first.click(); await expect(rate).toHaveValue('00101.50');
    assert.equal(await page.evaluate(() => window.assemblyFixture.editing.person.read().draft.token === window.assemblyFixture.personToken), true);
    await first.click(); await expect(adjacent(page)).toBeHidden();
    await first.click(); await expect(rate).toHaveValue('00101.50');
    assert.equal(await page.evaluate(() => window.assemblyFixture.editing.person.read().draft.token === window.assemblyFixture.personToken), true, 'same-record disclosure keeps its existing draft lease');
    await second.click(); await rate.fill('123.45');
    await first.click(); await expect(rate).toHaveValue('00101.50');
    assert.equal(await page.evaluate(() => window.assemblyFixture.editing.person.read().draft.personId), 'product-one');
    await record(page, 'team', 'delivery').click();
    await expect(adjacent(page).locator('[data-assembly-configure]')).toBeVisible();
    await expect(adjacent(page).locator('[data-person-configure]')).toHaveCount(0);
    await first.click(); await expect(rate).toHaveValue('00101.50');
    assert.equal(await page.evaluate(() => window.assemblyFixture.editing.read().active.kind), 'person');
    assert.equal(await bytes(page), accepted);
    await editor.locator('[data-person-action="cancel"]').click();
    await expect(adjacent(page)).toBeHidden(); await expect(first).toBeFocused();
    await first.click(); await expect(rate).toHaveValue('100.00');
    await rate.fill('110.00'); await editor.locator('[data-person-action="apply"]').click();
    await expect(adjacent(page)).toBeVisible();
    assert.deepEqual(await page.evaluate(() => window.assemblyFixture.studio.read().state.people.slice(0, 2).map(row => row.rateCentsPerHour)), [11000, 10000]);
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(first).toBeFocused();
    await tab(page, 'people').click();
    await people(page).locator('[data-person-id="product-one"]').click();
    await expect(people(page).locator('[data-person-configure]')).toBeVisible(); await expect(rate).toHaveValue('110.00');
    assert.equal(await editor.evaluate(node => node === window.assemblyFixture.personNode), true, 'both chapters use the original person editor');
    await expect(root(page).locator('[data-person-configure]')).toHaveCount(1);
  });

  test(`${engine}: adjacent team editing preserves membership controls and phone/laptop rack geometry`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true), accepted = await bytes(page);
    await page.evaluate(() => { window.assemblyFixture.teamNode = document.querySelector('[data-assembly-configure]'); });
    await openTeamPlanning(page);
    const trigger = record(page, 'team', 'delivery'), editor = root(page).locator('[data-assembly-configure]');
    const name = editor.locator('[name="label"]'), member = editor.locator('[data-assembly-member="engineering-two"]');
    const laneGeometry = () => root(page).locator('.studio-accepted-connections [data-team-lane], .studio-accepted-connections [data-team-lane] [data-studio-record-kind]').evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect(), rack = node.closest('.studio-team-lanes').getBoundingClientRect();
      const rounded = value => Math.round(value * 1000) / 1000;
      return { id:node.dataset.teamLane ?? `${node.dataset.studioRecordKind}/${node.dataset.studioRecordId}`,
        top:rounded(box.top-rack.top), left:rounded(box.left-rack.left), width:rounded(box.width), height:rounded(box.height) };
    }));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height:1000 }); await frames(page);
      const before = await laneGeometry();
      await trigger.click(); await expect(adjacent(page)).toBeVisible();
      await expect(name).toHaveValue('Product and Engineering');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      assert.deepEqual(await laneGeometry(), before, 'opening the adjacent editor preserves the initiating lanes');
      const geometry = await adjacent(page).evaluate(node => {
        const outer=node.getBoundingClientRect(), chapter=node.closest('[data-native-chapter-panel]').getBoundingClientRect();
        const controls=[...node.querySelectorAll('input,button,select,textarea')].filter(target => target.getClientRects().length);
        return { left:outer.left, right:outer.right, chapterLeft:chapter.left, chapterRight:chapter.right,
          targets:controls.map(target => { const box=target.getBoundingClientRect(); return { left:box.left, right:box.right }; }),
          overflow:document.documentElement.scrollWidth > innerWidth + 1 };
      });
      assert.ok(geometry.left >= geometry.chapterLeft && geometry.right <= geometry.chapterRight && geometry.left >= 0 && geometry.right <= width, JSON.stringify(geometry));
      assert.ok(geometry.targets.every(box => box.left >= geometry.left - 1 && box.right <= geometry.right + 1), JSON.stringify(geometry));
      assert.equal(geometry.overflow, false);
      await adjacent(page).evaluate(node => node.scrollIntoView({ block:'start', behavior:'instant' })); await frames(page);
      await page.screenshot({ path:resolve(captures, `${engine}-adjacent-team-${width}-viewport.png`) });
      await adjacent(page).screenshot({ path:resolve(captures, `${engine}-adjacent-team-${width}.png`) });
      await adjacent(page).locator('[data-rack-editor-close]').click();
      await expect(trigger).toBeFocused(); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
    await trigger.click(); await name.fill('Delivery together'); await member.uncheck();
    await editor.getByRole('button', { name:'Move up: product-two in the team', exact:true }).click();
    await page.evaluate(() => { window.assemblyFixture.teamToken = window.assemblyFixture.editing.assembly.read().draft.token; });
    await adjacent(page).locator('[data-rack-editor-close]').click(); await trigger.click();
    await expect(name).toHaveValue('Delivery together'); await expect(member).not.toBeChecked();
    assert.equal(await page.evaluate(() => window.assemblyFixture.editing.assembly.read().draft.token === window.assemblyFixture.teamToken), true);
    assert.equal(await bytes(page), accepted);
    await editor.locator('[data-assembly-cancel]').click();
    await expect(adjacent(page)).toBeHidden(); await expect(trigger).toBeFocused();
    await trigger.click(); await expect(name).toHaveValue('Product and Engineering'); await expect(member).toBeChecked();
    await name.fill('Delivery together'); await member.uncheck();
    await editor.getByRole('button', { name:'Move up: product-two in the team', exact:true }).click();
    await editor.locator('[data-assembly-apply]').click(); await expect(adjacent(page)).toBeVisible();
    await expect(adjacent(page).getByRole('heading', {name:'Team settings · Delivery together', exact:true})).toBeVisible();
    assert.deepEqual(await page.evaluate(() => window.assemblyFixture.studio.read().state.teams[0]), {
      id:'delivery', label:'Delivery together', personIds:['product-two', 'product-one', 'engineering-one'], lifecycle:'active',
    });
    await adjacent(page).locator('[data-rack-editor-close]').click(); await expect(trigger).toBeFocused();
    await tab(page, 'people').click(); await people(page).locator('[data-assembly-team="delivery"]').click();
    await expect(people(page).locator('[data-assembly-configure]')).toBeVisible();
    assert.equal(await editor.evaluate(node => node === window.assemblyFixture.teamNode), true, 'the People chapter receives its original membership editor');
    await expect(root(page).locator('[data-assembly-configure]')).toHaveCount(1);
  });

  test(`${engine}: a refused adjacent record switch keeps the visible identity with its existing draft`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const { studio, controller } = window.assemblyFixture;
      const plan = JSON.parse(studio.exportText()), example = plan.people[0];
      for (let index = 0; index < 9; index += 1) {
        const person = { ...example, id:`additional-person-${index}`, label:`Additional person ${index + 1}` };
        plan.people.push(person); plan.teams[0].personIds.push(person.id);
      }
      const result = studio.importText(JSON.stringify(plan), studio.read());
      if (!result.ok) throw new Error('The additional people fixture must be admitted.');
      controller.refresh();
    });
    const accepted = await bytes(page);
    await openTeamPlanning(page);
    const rate = adjacent(page).locator('[data-person-configure] [name="ratePerHour"]');
    for (let index = 0; index < 8; index += 1) {
      await record(page, 'person', `additional-person-${index}`).click();
      await rate.fill(String(101 + index));
    }
    await page.evaluate(() => { window.assemblyFixture.retainedToken = window.assemblyFixture.editing.person.read().draft.token; });
    const next = record(page, 'person', 'additional-person-8');
    await next.click();
    await expect(adjacent(page).getByRole('heading', { name:'Person settings · Additional person 8', exact:true })).toBeVisible();
    await expect(rate).toHaveValue('108');
    await expect(next).toHaveAttribute('aria-expanded', 'false');
    await expect(next).toHaveAttribute('aria-pressed', 'false');
    await expect(record(page, 'person', 'additional-person-7')).toHaveAttribute('aria-expanded', 'true');
    assert.deepEqual(await page.evaluate(() => {
      const { editing, retainedToken } = window.assemblyFixture, draft = editing.person.read().draft;
      return { personId:draft.personId, sameToken:draft.token === retainedToken };
    }), { personId:'additional-person-7', sameToken:true });
    assert.equal(await bytes(page), accepted);
  });

  test(`${engine}: team membership toggles retain row geometry and checkbox focus`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await people(page).locator('[data-assembly-team="delivery"]').click();
    await expect(people(page).locator('[data-assembly-summary]')).toHaveText('Settings · Product and Engineering');
    const list = people(page).locator('[data-assembly-members]');
    const geometry = () => list.evaluate(element => {
      const origin = element.getBoundingClientRect().top;
      return [...element.children].map(row => ({ id: row.querySelector('input').dataset.assemblyMember,
        y: Math.round((row.getBoundingClientRect().top - origin) * 1000) / 1000, height: Math.round(row.getBoundingClientRect().height * 1000) / 1000 }));
    });
    const checkbox = people(page).locator('[data-assembly-member="product-one"]');
    const accepted = await bytes(page);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 }); await checkbox.focus(); await frames(page);
      const before = await geometry();
      await page.keyboard.press('Space');
      await expect(checkbox).not.toBeChecked(); await expect(checkbox).toBeFocused();
      assert.deepEqual(await geometry(), before);
      await page.keyboard.press('Space'); assert.deepEqual(await geometry(), before);
      assert.equal(await bytes(page), accepted);
    }
  });
  test(`${engine}: people and teams publish exact funded amounts, keep membership order and resolve removal dependencies`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const original = await bytes(page);
    await ada(page);
    const rate = people(page).locator('[data-assembly-person-fields] [data-rate-step="10"]');
    await field(page, 'ratePerHour').fill(''); await expect(rate).toBeDisabled();
    await field(page, 'ratePerHour').fill('120.25'); await rate.focus(); await page.keyboard.press('ArrowRight');
    await expect(field(page, 'ratePerHour')).toHaveValue('130.25');
    await expect(people(page).locator('[data-assembly-total]')).toHaveText('$1,460.50');
    await expect(total(page)).toHaveText('$1,200.00');
    await cancel(page).click();
    assert.equal(await bytes(page), original);
    await ada(page); await field(page, 'ratePerHour').fill('115.25');
    await rate.focus(); await page.keyboard.press('ArrowRight');
    await expect(field(page, 'ratePerHour')).toHaveValue('125.25');
    await apply(page).click();
    await expect(total(page)).toHaveText('$1,450.50');
    await expect(people(page).locator('[data-person-configure]')).toHaveAttribute('open', '');
    const adaId = await page.evaluate(() => window.assemblyFixture.studio.read().state.people.find(row => row.label === 'Ada').id);
    assert.equal(await page.evaluate(id => window.assemblyFixture.studio.read().state.people.find(row => row.id === id).rateCentsPerHour, adaId), 12525);
    await action(page, 'team-create').click();
    await expect(rate).toBeDisabled(); await expect(rate).toBeHidden();
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
    await expect(total(page)).toHaveText('$1,450.50');
    await expect(people(page).locator('[data-assembly-configure]')).toHaveAttribute('open', '');
    await people(page).locator(`[data-assembly-team="${design.id}"]`).locator('..').locator('details > summary').click();
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
    await expect(total(page)).toHaveText('$1,450.50');
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
    await root(page).locator('[data-amp-panel="purpose"]').click();
    await expect(root(page).locator('[data-native-purpose] [data-purpose-reading]')).toBeVisible();
    await expect(root(page).locator('[data-native-purpose] form')).toBeHidden();
    await root(page).locator('[data-amp-panel="purpose"]').click();
    await expect(field(page, 'label')).toHaveValue('Operations');
    await people(page).locator('.studio-people-reading .studio-session-tracks__pad').first().click();
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
