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
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-responsibilities');
let server, fixture, complete;
registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const object = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  assert.equal(source.split(object).length, 2);
  complete = source.replace(object, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  fixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>' });
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});
const root = page => page.locator('[data-native-coordination]');
const people = page => root(page).locator('[data-native-team-editor]');
const settings = (page, kind) => people(page).locator(`[data-responsibility-configure="${kind}"]`);
const field = (page, kind, name) => settings(page, kind).locator(`[name="${name}"]`);
const action = (page, kind, name) => settings(page, kind).locator(`[data-responsibility-action="${name}"]:visible`);
const apply = (page, kind) => settings(page, kind).locator('[data-responsibility-apply]');
const add = page => people(page).locator('[data-responsibility-action="create"]');
const member = (page, id) => people(page).locator(`[data-responsibility-work="${id}"]`);
const total = page => root(page).locator('[data-native-total]');
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const state = page => page.evaluate(() => JSON.parse(window.responsibilityFixture.studio.exportText()));

async function open(t, engine, full = false) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), telemetry = monitor(page), pending = new Set();
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
    window.responsibilityFixture = { studio, controller: mountCoordinationPanel(element, { studio }), editing: createDraftCoordinator(studio) };
  });
  await tab(page, 'people').click();
  return page;
}

const expectedRole = Object.freeze({ functionId: 'engineering', seniorityId: 'principal-plus', postureId: 'decision-owner',
  enablerId: 'protected-focus-time', qualityId: 'independent-review', aiId: 'escalation-owner', decisionId: 'approves',
  change: { frameworkId: 'npt', componentId: 'collective-action' } });
const categories = ['scenario-generation', 'source-retrieval', 'dependency-mapping', 'draft-artifacts', 'cross-source-synthesis', 'transparent-calculation'];
async function role(page, id = 'product-one') {
  const key = people(page).locator(`[data-person-id="${id}"]`);
  if (await key.getAttribute('aria-expanded') !== 'true') await key.click();
  await settings(page, 'role').locator('[data-role-facet="functionId"]').click();
  await field(page, 'role', 'functionId').focus();
}
async function chooseRole(page, name, value) {
  if (name === 'change') {
    const [framework] = value.split(':');
    await settings(page, 'role').locator(`[data-role-reel="framework"] [data-reel-choice="${framework}"]`).click();
    await settings(page, 'role').locator(`[data-role-field="change"][data-role-choice="${value}"]`).click();
  } else {
    await settings(page, 'role').locator(`[data-role-facet="${name}"]`).click();
    if (name === 'functionId') await field(page, 'role', name).selectOption(value);
    else await settings(page, 'role').locator(`.studio-role-mixer__facet-options [data-role-field="${name}"][data-role-choice="${value}"]`).click();
  }
}
async function readableReelControls(page, { choices = false } = {}) {
  const readings = [];
  const selector = choices ? '[data-role-reel] .native-reel__choice' : '[data-role-reel] > .native-control--cancel';
  for (const button of await settings(page, 'role').locator(selector).all()) {
    for (const hovered of [false, true]) {
      if (hovered) await button.hover(); else await page.mouse.move(0, 0);
      const reading = await button.evaluate(element => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const rgb = value => {
          context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
          const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
          return [red, green, blue, alpha / 255];
        };
        const luminance = channels => channels.slice(0, 3).map(channel => channel / 255)
          .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
          .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
        const foreground = getComputedStyle(element).color;
        let current = element, background;
        do { background = getComputedStyle(current).backgroundColor; current = current.parentElement; }
        while (current && (rgb(background)[3] ?? 1) < 1);
        const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a);
        return { label: element.textContent, foreground, background, contrast: (values[0] + .05) / (values[1] + .05),
          pressed: element.getAttribute('aria-pressed'), shadow: getComputedStyle(element).boxShadow };
      });
      assert.ok(reading.contrast >= 4.5, `Reel control remains legible ${hovered ? 'on hover' : 'at rest'}: ${JSON.stringify(reading)}`);
      readings.push({ ...reading, hovered });
    }
  }
  if (choices) {
    for (const pressed of ['false', 'true']) {
      const states = readings.filter(reading => reading.pressed === pressed);
      assert.equal(new Set(states.map(({ foreground, background }) => `${foreground}/${background}`)).size, 1,
        `All wheel variants retain the same ${pressed === 'true' ? 'pressed' : 'resting'} choice pair, including hover`);
      assert.ok(states.every(reading => reading.shadow.includes('inset') === (pressed === 'true')),
        'Raised and pressed depth identify choice state independently of wheel color');
    }
    assert.equal(new Set(readings.map(reading => reading.background)).size, 2, 'Resting and selected choices remain visibly distinct');
  }
}
async function draftField(page, kind, name, value) {
  await field(page, kind, name).evaluate((control, value) => {
    control.value = value; control.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
async function contribution(page, category = 'source-retrieval', { draft = false } = {}) {
  if (draft) await page.evaluate(async () => {
    const { mountResponsibilityPanel } = await import('/collaboration/native-investment-studio/responsibility-controller.mjs');
    mountResponsibilityPanel(document.querySelector('[data-native-team-editor]'), window.responsibilityFixture).create();
  });
  else {
    await add(page).click();
    await expect(add(page)).toBeFocused();
    await expect(settings(page, 'contribution')).not.toHaveAttribute('open', '');
    await people(page).locator('.native-responsibility__selector').last().click();
  }
  for (const [name, value] of [['categoryId', category], ['receiverPersonId', 'product-one'], ['decisionOwnerPersonId', 'engineering-one']]) {
    if (draft) await draftField(page, 'contribution', name, value);
    else await field(page, 'contribution', name).selectOption(value);
  }
  await member(page, 'review').check();
}

for (const engine of names) {
  test(`${engine}: one person mixing desk retains typed funding through connected reels, exact overrides and shared Close`, async t => {
    const page = await open(t, engine);
    const person = people(page).locator('[data-person-configure]');
    await role(page);
    await person.locator('[name="label"]').fill('Product lead draft');
    await person.locator('[name="ratePerHour"]').fill('123');
    const before = await page.evaluate(() => window.responsibilityFixture.studio.readHistory().undoCount);
    await settings(page, 'role').locator('[data-role-reel="framework"] [data-reel-choice="npt"]').click();
    assert.equal(await page.evaluate(() => window.responsibilityFixture.studio.readHistory().undoCount), before + 1, 'a connected recipe accepts one role change');
    const acceptedPreview = await person.locator('[data-person-total]').textContent();
    assert.match(acceptedPreview, /^\$/, 'a role choice retains a meaningful typed funding preview');
    assert.equal(await page.evaluate(() => window.responsibilityFixture.editing.read().active?.kind), 'person');
    await settings(page, 'role').locator('[data-role-reel="framework"] [data-reel-choice="npt"]').click();
    assert.equal(await page.evaluate(() => window.responsibilityFixture.editing.read().active?.kind), 'person', 'reselecting the current recipe leaves the person edit active');
    assert.equal(await page.evaluate(() => window.responsibilityFixture.studio.readHistory().undoCount), before + 1);
    await expect(person.locator('[data-person-total]')).toHaveText(acceptedPreview);
    await expect(person).toHaveAttribute('open', '');
    await expect(settings(page, 'role')).toHaveAttribute('open', '');
    await expect(person.locator('[name="label"]')).toHaveValue('Product lead draft');
    await chooseRole(page, 'seniorityId', 'principal-plus');
    await chooseRole(page, 'decisionId', 'advises');
    await expect(person.locator('[name="ratePerHour"]')).toBeEnabled();
    await expect(person.locator('[name="ratePerHour"]')).toHaveValue('123');
    assert.equal((await state(page)).people[0].label, 'product-one', 'role acceptance retains the separate typed-name proposal');
    assert.deepEqual((await state(page)).people[0].role.change, { frameworkId: 'npt', componentId: 'collective-action' }, 'an exact decision choice preserves the chosen model');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(settings(page, 'role').locator('[data-role-reel]')).toHaveCount(3);
      await expect(settings(page, 'role').locator('[data-role-facet]')).toHaveCount(7);
      await expect(people(page).locator('[data-person-desk-close]')).toBeVisible();
      await expect(settings(page, 'role').locator('summary')).toBeHidden();
      await expect(person.locator('summary')).toBeHidden();
      const geometry = await people(page).locator('.studio-person-receiver').evaluate(element => {
        const outer = element.getBoundingClientRect();
        return [...element.querySelectorAll('input,select,button')].filter(control => control.getClientRects().length)
          .map(control => { const box = control.getBoundingClientRect(); return { name: control.name || control.textContent,
            outside: box.left < outer.left - 1 || box.right > outer.right + 1 }; }).filter(control => control.outside);
      });
      assert.deepEqual(geometry, [], 'the shared desk contains every visible control');
      const overflowingChoices = await settings(page, 'role').locator('.native-reel__choice').evaluateAll(controls => controls
        .filter(control => control.scrollWidth > control.clientWidth + 1).map(control => control.textContent));
      assert.deepEqual(overflowingChoices, [], 'role reel labels remain inside their choice targets');
      const splitWords = await settings(page, 'role').locator('.native-reel__choice').evaluateAll(controls => {
        const context = document.createElement('canvas').getContext('2d');
        return controls.filter(control => {
          const style = getComputedStyle(control); context.font = style.font;
          const space = control.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          return control.textContent.split(/\s+/u).some(word => context.measureText(word).width > space + 1);
        }).map(control => control.textContent);
      });
      assert.deepEqual(splitWords, [], 'ordinary desktop and phone reel targets preserve whole label words');
      const shadows = await person.locator('.native-coordination__stepper button:enabled').evaluateAll(controls => controls.map(control => getComputedStyle(control).boxShadow));
      assert.ok(shadows.length > 0 && shadows.every(shadow => shadow !== 'none'), 'circular increments retain their tactile shadows');
      await people(page).locator('.studio-person-receiver').screenshot({ path: resolve(captures, `${engine}-person-role-local-${width}.png`) });
    }
    await person.locator('[data-person-action="apply"]').click();
    const changed = (await state(page)).people[0];
    assert.equal(changed.label, 'Product lead draft');
    assert.equal(changed.rateCentsPerHour, 12300);
    assert.equal(changed.role.seniorityId, 'principal-plus', 'Person Apply keeps the accepted role');
    await people(page).locator('[data-person-desk-close]').click();
    await expect(settings(page, 'role')).toBeHidden();
    await expect(person).not.toHaveAttribute('open', '');
    await expect(people(page).locator('[data-person-id="product-one"]')).toBeFocused();
    await role(page);
    await expect(settings(page, 'role').locator('[data-role-reel="framework"]')).toHaveAttribute('data-reel-value', 'npt');
    await person.locator('[name="ratePerHour"]').fill('125');
    await page.evaluate(() => {
      const { studio, controller } = window.responsibilityFixture;
      const current = studio.read(), row = current.state.people[0];
      studio.updatePerson(row.id, { ...row, rateCentsPerHour: 14000 }, current); controller.refresh();
    });
    await expect(person.locator('[data-person-recovery]')).toBeVisible();
    await expect(person.locator('[name="ratePerHour"]')).toHaveValue('125');
    assert.equal((await state(page)).people[0].rateCentsPerHour, 14000, 'an independent conflicting edit retains the review boundary');
  });
  test(`${engine}: visible role choices resume after Undo and Close and yield to a same-target successor`, async t => {
    const page = await open(t, engine);
    await role(page);
    await field(page, 'role', 'functionId').selectOption('engineering');
    await root(page).locator('[data-studio-undo]').click();
    await field(page, 'role', 'functionId').selectOption('data-ml');
    assert.equal((await state(page)).people[0].role.functionId, 'data-ml', 'Undo leaves the visible facet ready for another choice');
    await draftField(page, 'role', 'functionId', 'engineering');
    await people(page).locator('[data-person-desk-close]').click();
    await expect(settings(page, 'role')).not.toHaveAttribute('open', '');
    await role(page);
    await expect(field(page, 'role', 'functionId')).toBeEnabled();
    await field(page, 'role', 'functionId').focus();
    await expect(field(page, 'role', 'functionId')).toHaveValue('engineering');
    assert.equal((await state(page)).people[0].role.functionId, 'data-ml', 'resuming a saved choice preserves its proposal boundary');
    await field(page, 'role', 'functionId').selectOption('design-research');
    assert.equal((await state(page)).people[0].role.functionId, 'design-research');
    const interrupted = await page.evaluate(async () => {
      const { mountResponsibilityPanel } = await import('/collaboration/native-investment-studio/responsibility-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.responsibilityFixture.controller.dispose(); window.responsibilityFixture.editing.dispose();
      const element = document.querySelector('[data-native-team-editor]'); element.hidden = false;
      const results = [];
      for (const mode of ['receiver', 'coordinator', 'intent']) {
        const studio = createStudio(), editing = createDraftCoordinator(studio);
        let receiver, armed = true;
        const takeOver = () => {
          if (!armed) return; armed = false;
          if (mode === 'receiver') receiver.selectPerson('product-one', false);
          else if (mode === 'coordinator') {
            editing.park(); editing.role.begin('role.update:product-one', studio.read());
          }
          editing.role.setText(editing.role.read().draft.token, 'functionId', 'design-research'); receiver.refresh();
        };
        receiver = mountResponsibilityPanel(element, { studio, editing,
          onBegin() { if (mode === 'receiver') takeOver(); },
          onEditing() { if (mode !== 'receiver') takeOver(); } });
        const input = element.querySelector('[name="functionId"]'); input.value = 'engineering';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        results.push({ mode, raw: editing.role.read().draft.raw.functionId, accepted: studio.read().state.people[0].role.functionId,
          changes: studio.readHistory().undoCount });
        receiver.dispose(); editing.dispose();
      }
      return results;
    });
    assert.deepEqual(interrupted, ['receiver', 'coordinator', 'intent'].map(mode => ({ mode, raw: 'design-research', accepted: null, changes: 0 })),
      'interrupted input and change preserve the successor proposal and canonical lease');
  });
  test(`${engine}: populated role reels hydrate exact values through recipe and facet Undo`, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { studio, controller } = window.responsibilityFixture;
      studio.replace(createShowcasePlan({ peopleExamples: true }), studio.read()); controller.refresh();
    });
    const original = await state(page), person = original.people[0];
    await role(page, person.id);
    await readableReelControls(page);
    const history = await page.evaluate(() => window.responsibilityFixture.studio.readHistory().undoCount);
    await settings(page, 'role').locator('[data-role-reel="framework"] [data-reel-choice="npt"]').click();
    assert.equal(await page.evaluate(() => window.responsibilityFixture.studio.readHistory().undoCount), history + 1);
    await expect(settings(page, 'role').locator('[data-role-reel="framework"]')).toHaveAttribute('data-reel-value', 'npt');
    await expect(settings(page, 'role').locator('[data-role-reel="enablerId"]')).toHaveAttribute('data-reel-value', 'protected-focus-time');
    await expect(settings(page, 'role').locator('[data-role-reel="decisionId"]')).toHaveAttribute('data-reel-value', 'operates');
    await readableReelControls(page);
    await readableReelControls(page, { choices: true });
    await chooseRole(page, 'postureId', 'domain-reviewer');
    await root(page).locator('[data-studio-undo]').click();
    await expect(settings(page, 'role').locator('[data-role-choice="individual-contributor"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(settings(page, 'role').locator('[data-role-reel="framework"]')).toHaveAttribute('data-reel-value', 'npt');
    await root(page).locator('[data-studio-undo]').click();
    assert.deepEqual(await state(page), original);
    await expect(settings(page, 'role').locator('[data-role-reel="framework"]')).toHaveAttribute('data-reel-value', person.role.change?.frameworkId ?? '');
    await expect(settings(page, 'role').locator('[data-role-reel="enablerId"]')).toHaveAttribute('data-reel-value', person.role.enablerId ?? '');
    await expect(settings(page, 'role').locator('[data-role-reel="decisionId"]')).toHaveAttribute('data-reel-value', person.role.decisionId ?? '');
    await settings(page, 'role').locator('[data-role-reel="decisionId"] > .native-control--cancel').click();
    await readableReelControls(page);
    await root(page).locator('[data-studio-undo]').click();
    assert.deepEqual(await state(page), original);
  });
  test(`${engine}: contribution acceptance and Close preserve same-instance successor focus`, async t => {
    const page = await open(t, engine);
    const results = await page.evaluate(async () => {
      const { mountResponsibilityPanel } = await import('/collaboration/native-investment-studio/responsibility-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.responsibilityFixture.controller.dispose(); window.responsibilityFixture.editing.dispose();
      const element = document.querySelector('[data-native-team-editor]'); element.hidden = false;
      const results = [];
      for (const phase of ['accepted', 'editing', 'close']) {
        const studio = createStudio(createShowcasePlan({ peopleExamples: true })), editing = createDraftCoordinator(studio);
        let receiver, armed = false;
        const succeed = () => {
          if (!armed || (phase !== 'close' && !studio.readHistory().undoCount)) return;
          armed = false; receiver.refresh(); receiver.open('contribution.update:source-index');
          element.querySelector('[name="categoryId"]').focus();
        };
        receiver = mountResponsibilityPanel(element, { studio, editing,
          onAccepted: () => { if (phase === 'accepted') succeed(); },
          onEditing: () => { if (phase !== 'accepted') succeed(); } });
        receiver.open('contribution.update:evidence-draft'); armed = true;
        if (phase === 'close') element.querySelector('[data-responsibility-configure="contribution"] [data-rack-editor-close]').click();
        else {
          const input = element.querySelector('[data-responsibility-work="pairing"]');
          input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        results.push({ phase, target: editing.contribution.read().draft?.targetId, focused: document.activeElement.name,
          added: studio.read().state.contributions.find(row => row.id === 'evidence-draft').workIds.includes('pairing'),
          changes: studio.readHistory().undoCount });
        receiver.dispose(); editing.dispose();
      }
      return results;
    });
    assert.deepEqual(results, ['accepted', 'editing', 'close'].map(phase => ({ phase, target: 'source-index', focused: 'categoryId',
      added: phase !== 'close', changes: phase === 'close' ? 0 : 1 })));
  });

  test(`${engine}: People arranger accepts participation, retains raw edits and returns through local team keys`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { studio, controller } = window.responsibilityFixture;
      studio.replace(createShowcasePlan({ peopleExamples: true }), studio.read()); controller.refresh();
    });
    const original = await state(page), work = original.work.find(row => row.label === 'Prototype pairing');
    const person = original.people.find(row => row.label === 'Product lead');
    const key = people(page).locator(`[data-person-id="${person.id}"]`);
    await key.click();
    const receiver = people(page).locator('[data-person-configure]');
    await expect(key).toHaveAttribute('aria-expanded', 'true');
    await receiver.locator('[name="ratePerHour"]').fill('unfinished');
    await key.click();
    await expect(receiver).not.toHaveAttribute('open', '');
    await expect(key).toHaveAttribute('aria-expanded', 'false');
    await key.click();
    await expect(receiver.locator('[name="ratePerHour"]')).toHaveValue('unfinished');
    const membership = people(page).locator(`[data-people-work="${work.id}"][data-people-participant="${person.id}"]`);
    await membership.check();
    assert.deepEqual((await state(page)).work.find(row => row.id === work.id).personIds, [...work.personIds, person.id]);
    await expect(membership).toBeFocused();
    assert.equal(await page.evaluate(() => window.responsibilityFixture.editing.read().parked.find(row => row.kind === 'person').raw.ratePerHour), 'unfinished');
    await root(page).locator('[data-studio-undo]').click();
    assert.deepEqual(await state(page), original);
    await people(page).getByRole('button', { name: 'Add session', exact: true }).click();
    const added = (await state(page)).work.at(-1);
    assert.equal((await state(page)).work.length, original.work.length + 1);
    await expect(people(page).locator(`[data-native-work-open="${added.id}"]`)).toBeVisible();
    assert.equal(await page.evaluate(() => window.responsibilityFixture.editing.read().parked.find(row => row.kind === 'person').raw.ratePerHour), 'unfinished');
    await root(page).locator('[data-studio-undo]').click();
    assert.deepEqual(await state(page), original);
    const teamKey = people(page).locator('[data-assembly-team]').first();
    const teamEditor = people(page).locator('[data-assembly-configure]');
    await teamKey.click();
    await expect(teamKey).toHaveAttribute('aria-expanded', 'true');
    await expect(teamEditor).toHaveAttribute('open', '');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await teamEditor.evaluate(element => {
        const box = element.getBoundingClientRect(), name = element.querySelector('[data-assembly-name-group]').getBoundingClientRect();
        const total = element.querySelector('[data-assembly-preview]').getBoundingClientRect();
        return { width: box.width, height: box.height, name: { x: name.x, y: name.y }, total: { x: total.x, y: total.y } };
      });
      await teamEditor.screenshot({ path: resolve(captures, `${engine}-team-receiver-${width}.png`) });
      assert.ok(geometry.height < (width === 390 ? 1000 : 800), `team controls remain a compact local receiver: ${width}/${geometry.height}`);
      if (width === 1440) { assert.ok(geometry.width < 760); assert.ok(geometry.total.x > geometry.name.x); }
      else assert.ok(geometry.total.y > geometry.name.y);
      const overflow = await people(page).evaluate(element => element.scrollWidth > element.clientWidth + 1);
      assert.equal(overflow, false, 'wide tables remain inside their local scroll regions');
    }
    await teamKey.click();
    await expect(teamEditor).not.toHaveAttribute('open', '');
    await expect(teamKey).toHaveAttribute('aria-expanded', 'false');
    await expect(teamKey).toBeFocused();
    await page.evaluate(async () => {
      const { createExamplePlan } = await import('/collaboration/native-investment-studio/contract.mjs');
      const empty = createExamplePlan(); empty.work = []; empty.practices = [];
      const { studio, controller } = window.responsibilityFixture;
      const result = studio.replace(empty, studio.read()); if (!result.ok) throw new Error(result.error.message); controller.refresh();
    });
    await expect(people(page).getByText('Add a session to choose who works together.', { exact: true })).toBeVisible();
    await people(page).getByRole('button', { name: 'Add session', exact: true }).click();
    const first = (await state(page)).work[0];
    assert.ok(first && first.personIds.length > 0, 'the empty arranger creates its first working session through the shared factory');
    for (const id of first.personIds.slice(1)) await people(page).locator(`[data-people-work="${first.id}"][data-people-participant="${id}"]`).uncheck();
    const sole = people(page).locator(`[data-people-work="${first.id}"][data-people-participant="${first.personIds[0]}"]`);
    await expect(sole).toBeDisabled();
    await expect(sole.locator('..')).toHaveAttribute('title', 'Add another person to this session before removing this participant.');
  });

  test(`${engine}: People readings wrap fractional-hour funding within the person cell`, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const plan = createShowcasePlan({ peopleExamples: true }); plan.people[0].fundedMinutes = 270;
      const { studio, controller } = window.responsibilityFixture;
      const result = studio.replace(plan, studio.read()); if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    const reading = people(page).locator('.studio-people-arranger__funding').first();
    await expect(reading).toHaveText('2 h 30 min available / 4 h 30 min funded');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const geometry = await reading.evaluate(element => {
        const pill = element.getBoundingClientRect(), cell = element.closest('th').getBoundingClientRect();
        return { pill: { left: pill.left, right: pill.right }, cell: { left: cell.left, right: cell.right },
          portions: [...element.children].map(part => { const box = part.getBoundingClientRect(); return { left: box.left, right: box.right }; }) };
      });
      assert.ok(geometry.pill.left >= geometry.cell.left && geometry.pill.right <= geometry.cell.right, 'the funding pill stays inside its fixed-width person column');
      assert.ok(geometry.portions.every(part => part.left >= geometry.pill.left && part.right <= geometry.pill.right), 'each amount retains its unit and fits inside the wrapping pill');
      await reading.locator('..').screenshot({ path: resolve(captures, `${engine}-funded-readings-${width}.png`) });
    }
  });

  test(`${engine}: People racks retain parallel groups, direct responsibility choices and compact local receivers`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { studio, controller } = window.responsibilityFixture;
      studio.replace(createShowcasePlan({ peopleExamples: true }), studio.read()); controller.refresh();
    });
    assert.equal((await state(page)).contributions.length, 3);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const lanes = people(page).locator('.studio-team-lanes');
      const geometry = await lanes.evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth,
        rows: [...element.querySelectorAll('[data-people-team]')].map(lane => Math.round(lane.getBoundingClientRect().top)) }));
      assert.equal(new Set(geometry.rows).size, 1, 'teams remain one row of parallel groups');
      if (width === 390) assert.ok(geometry.scroll > geometry.width, 'phone team lanes remain locally reachable');
      const teamKey = people(page).locator('[data-assembly-team]').first();
      await expect(teamKey).toHaveCSS('background-color', 'rgb(40, 85, 243)');
      await expect(teamKey).toHaveCSS('color', 'rgb(255, 255, 255)');
      const caret = () => teamKey.evaluate(element => getComputedStyle(element, '::after').transform);
      const closedCaret = await caret();
      await teamKey.click();
      assert.notEqual(await caret(), closedCaret, 'the caret opens with the team receiver');
      await expect(teamKey).toHaveCSS('background-color', 'rgb(242, 255, 103)');
      await expect(people(page).locator('[data-assembly-preview]')).toHaveCSS('background-color', 'rgb(233, 240, 255)');
      await teamKey.click();
      assert.equal(await caret(), closedCaret, 'the caret returns with the closed team receiver');
      const arranger = people(page).locator('.studio-people-arranger');
      const cells = await arranger.locator('tbody tr').first().locator(':scope > :is(th,td)').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
      assert.ok(Math.max(...cells) - Math.min(...cells) < 1, 'person and working-session columns share one comfortable width');
      await expect(arranger.locator('.studio-people-arranger__value').first()).toHaveText('$120/hr');
      await expect(arranger.locator('.studio-people-arranger__value').nth(1)).toHaveText('2 h available / 4 h funded');

      await role(page, 'maya');
      await expect(settings(page, 'role').locator('.studio-role-mixer')).toBeVisible();
      await expect(field(page, 'role', 'functionId')).toBeVisible();
      await expect(field(page, 'role', 'functionId')).toBeEnabled();
      await expect(people(page).locator('.studio-person-order .native-control--remove').first()).toHaveCSS('background-color', 'rgb(243, 216, 223)');
      await expect(people(page).locator('.studio-people-rates')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
      await people(page).screenshot({ path: resolve(captures, `${engine}-people-racks-${width}.png`) });
      const person = people(page).locator('[data-person-configure]');
      const steps = await person.locator('.studio-rate .native-coordination__stepper button').evaluateAll(buttons => buttons.map(button => { const box = button.getBoundingClientRect(); return { width: box.width, height: box.height }; }));
      assert.ok(steps.every(step => step.width === 44 && step.height === 44), 'rate increment controls retain circular 44px geometry');
      const personBox = await person.boundingBox();
      assert.ok(personBox.height < 850, `funding and session-spread controls remain one compact phone reading at ${width}: ${personBox.height}`);
      await person.screenshot({ path: resolve(captures, `${engine}-person-rack-${width}.png`) });
      await people(page).locator('[data-person-desk-close]').click();
      await people(page).locator('.native-responsibility__selector').first().click();
      const work = await settings(page, 'contribution').locator('.studio-contribution-work').boundingBox();
      const humans = await settings(page, 'contribution').locator('.studio-contribution-people').boundingBox();
      if (width === 1440) assert.ok(humans.x > work.x + work.width, 'work and human responsibility share one row');
      else assert.ok(humans.y >= work.y + work.height, 'phone reading follows work into human responsibility');
      const outside = await settings(page, 'contribution').evaluate(element => {
        const outer = element.getBoundingClientRect();
        return [...element.querySelectorAll('button,select')].filter(control => control.getClientRects().length)
          .filter(control => { const box = control.getBoundingClientRect(); return box.top < outer.top - 1 || box.bottom > outer.bottom + 1; })
          .map(control => control.getAttribute('aria-label') ?? control.name ?? control.textContent);
      });
      assert.deepEqual(outside, [], 'the contribution receiver contains every visible control');
      await settings(page, 'contribution').screenshot({ path: resolve(captures, `${engine}-contribution-rack-${width}.png`) });
      await settings(page, 'contribution').locator('[data-rack-editor-close]').click();
    }
    await people(page).locator('[data-person-id="maya"]').click();
    await people(page).locator('[data-person-configure] [name="ratePerHour"]').fill('unfinished');
    await field(page, 'role', 'functionId').focus();
    await field(page, 'role', 'functionId').focus();
    await field(page, 'role', 'functionId').selectOption('engineering');
    await expect(field(page, 'role', 'functionId')).toBeFocused();
    assert.equal((await state(page)).people[0].role.functionId, 'engineering');
    const retained = await page.evaluate(() => window.responsibilityFixture.editing.person.read().draft);
    assert.equal(retained.raw.ratePerHour, 'unfinished');
    await people(page).locator('.native-responsibility__selector').first().click();
    const before = await state(page), investment = await page.evaluate(() => window.responsibilityFixture.studio.read().result);
    await field(page, 'contribution', 'receiverPersonId').focus();
    await field(page, 'contribution', 'receiverPersonId').selectOption('ari');
    await expect(field(page, 'contribution', 'receiverPersonId')).toBeFocused();
    const changed = (await state(page)).contributions[0];
    assert.equal(changed.receiverPersonId, 'ari');
    assert.equal(changed.decisionOwnerPersonId, before.contributions[0].decisionOwnerPersonId, 'receiver choice preserves independent decision authority');
    assert.equal(changed.reviewBoundary, before.contributions[0].reviewBoundary);
    assert.deepEqual(await page.evaluate(() => window.responsibilityFixture.studio.read().result), investment);
    await root(page).locator('[data-studio-undo]').click();
    assert.deepEqual((await state(page)).contributions, before.contributions);
  });

  test(`${engine}: role choices and all six contribution categories retain literal investment and exchange meaning`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const before = await page.evaluate(() => window.responsibilityFixture.studio.read().result);
    await role(page);
    await expect(field(page, 'role', 'functionId')).toBeVisible();
    await field(page, 'role', 'functionId').selectOption('design-research');
    assert.equal((await state(page)).people[0].role.functionId, 'design-research', 'the visible facet accepts its first change without opening a disclosure');
    await root(page).locator('[data-studio-undo]').click();
    await role(page);
    await expect(settings(page, 'role').locator('summary')).toHaveText('Role mix · product-one · Add role details');
    await chooseRole(page, 'change', 'npt:collective-action');
    for (const [name, value] of Object.entries(expectedRole)) if (name !== 'change') await chooseRole(page, name, value);
    await expect(settings(page, 'role')).toHaveAttribute('open', '');
    await expect(settings(page, 'role').locator('.studio-rack-header__saved')).toHaveText('Saved');
    assert.deepEqual((await state(page)).people[0].role, expectedRole);
    await expect(settings(page, 'role').locator('summary')).toContainText('Engineering');
    await expect(settings(page, 'role').locator('summary')).not.toContainText('Unsaved edits');
    const sequence = await page.evaluate(() => window.responsibilityFixture.studio.readAcceptance().sequence);
    await apply(page, 'role').evaluate(button => button.click());
    assert.equal(await page.evaluate(() => window.responsibilityFixture.studio.readAcceptance().sequence), sequence, 'unchanged Apply preserves acceptance');
    for (const category of categories) {
      await contribution(page, category);
      await expect(total(page)).toHaveText('$1,200.00');
    }
    const accepted = await state(page);
    assert.deepEqual(accepted.contributions.map(({ id, ...row }) => row), categories.map(categoryId => ({
      categoryId, receiverPersonId: 'product-one', decisionOwnerPersonId: 'engineering-one', workIds: ['review'],
      reviewBoundary: null, decisionBoundary: null,
    })));
    assert.deepEqual(await page.evaluate(() => window.responsibilityFixture.studio.read().result), before);
    await expect(people(page).locator('[data-responsibility-list] tbody tr:not(.studio-contribution-add)')).toHaveCount(6);
    await expect(people(page).locator('[data-responsibility-list]')).toContainText('For product-one');
    const opener = people(page).locator('.native-responsibility__selector[data-responsibility-action="open"]').last();
    await expect(opener).toHaveAttribute('aria-expanded', 'true');
    assert.equal(await opener.getAttribute('aria-controls'), await settings(page, 'contribution').getAttribute('id'));
    await draftField(page, 'contribution', 'receiverPersonId', 'engineering-one');
    await opener.click(); await expect(opener).toHaveAttribute('aria-expanded', 'false');
    await expect(settings(page, 'contribution')).not.toHaveAttribute('open', '');
    await opener.click(); await expect(opener).toHaveAttribute('aria-expanded', 'true');
    await expect(field(page, 'contribution', 'receiverPersonId')).toHaveValue('engineering-one');
    assert.deepEqual((await state(page)).contributions, accepted.contributions);
    await action(page, 'contribution', 'cancel').click();
    await tab(page, 'investment').click();
    await root(page).locator('[data-investment-deck="compare"]').click(); await root(page).locator('[data-investment-action="undo"]').click();
    assert.deepEqual((await state(page)).contributions.at(-1).workIds, [], 'Undo reverses the last accepted support change');
    await root(page).locator('[data-investment-deck="compare"]').click(); await root(page).locator('[data-investment-action="redo"]').click();
    assert.deepEqual((await state(page)).contributions, accepted.contributions);
    await expect(total(page)).toHaveText('$1,200.00');
  });

  test(`${engine}: session support pads reflect edits while stored contribution notes survive`, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const { studio, controller } = window.responsibilityFixture;
      const plan = structuredClone(studio.read().state);
      plan.contributions.push({ id: 'kept-source', categoryId: 'source-retrieval', receiverPersonId: 'product-one', decisionOwnerPersonId: 'engineering-one',
        workIds: [], reviewBoundary: 'Check source dates.', decisionBoundary: 'Product lead decides.' });
      studio.replace(plan, studio.read()); controller.refresh();
    });
    const support = people(page).locator('.studio-contribution-tracks__pad');
    await expect(support).toHaveAttribute('data-included', 'false');
    await support.click();
    await expect(settings(page, 'contribution').locator('textarea')).toHaveCount(0);
    await member(page, 'review').check();
    await expect(support).toHaveAttribute('data-included', 'true');
    const contribution = (await state(page)).contributions.find(row => row.id === 'kept-source');
    assert.deepEqual(contribution.workIds, ['review']);
    assert.equal(contribution.reviewBoundary, 'Check source dates.');
    assert.equal(contribution.decisionBoundary, 'Product lead decides.');
    await expect(people(page).locator('.studio-contribution-reading')).toHaveText('12 h of supporting work · $1,200');
    await expect(people(page).locator('.studio-contribution-tracks__totals')).toContainText('12 h');
    const beforePause = await state(page);
    await people(page).getByRole('button', { name: 'Pause Weekly working session throughout the plan', exact: true }).click();
    assert.equal((await state(page)).work[0].status, 'paused');
    await expect(support).toHaveText('Ⅱ');
    await expect(people(page).locator('.studio-contribution-reading')).toHaveText('12 h of supporting work · $1,200');
    await root(page).locator('[data-studio-undo]').click();
    assert.deepEqual(await state(page), beforePause);
    await expect(support).toHaveText('●');
  });

  test(`${engine}: saved role and contribution forms retain exact targets through renamed, retired and conflicting records`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await role(page);
    await draftField(page, 'role', 'functionId', 'data-ml');
    await contribution(page, 'source-retrieval', { draft: true });
    await people(page).locator('[data-person-id="product-two"]').click();
    await expect(root(page).locator('[data-native-saved-count]')).toHaveText('2');
    const contributionKey = await root(page).locator('[data-saved-open^="contribution:"]').getAttribute('data-saved-open');
    const id = contributionKey.slice('contribution:contribution.create:'.length);
    await page.evaluate(id => {
      const { studio, controller } = window.responsibilityFixture;
      const plan = structuredClone(studio.read().state);
      plan.people[0].label = 'Research lead'; plan.people[0].lifecycle = 'retired';
      plan.contributions.push({ id, categoryId: 'scenario-generation', receiverPersonId: null, decisionOwnerPersonId: null,
        workIds: [], reviewBoundary: null, decisionBoundary: null });
      const result = studio.replace(plan, studio.read());
      if (!result.ok) throw new Error(result.error.message);
      controller.refresh();
    }, id);
    await root(page).locator('[data-amp-panel="saved"]').click();
    await root(page).locator('[data-saved-open="role:role.update:product-one"]').click();
    await expect(settings(page, 'role').locator('form > fieldset')).toHaveAttribute('disabled', '');
    await expect(field(page, 'role', 'functionId')).toHaveValue('data-ml');
    await expect(settings(page, 'role').locator('summary')).toContainText('Research lead · retired');
    await action(page, 'role', 'review').click();
    await apply(page, 'role').click();
    assert.equal((await state(page)).people[0].role.functionId, 'data-ml');
    if (await root(page).locator('[data-native-saved]').getAttribute('open') === null) await root(page).locator('[data-native-saved] > summary').click();
    await root(page).locator(`[data-saved-open="${contributionKey}"]`).click();
    await expect(action(page, 'contribution', 'freshId')).toBeVisible();
    await expect(field(page, 'contribution', 'receiverPersonId')).toHaveValue('product-one');
    await action(page, 'contribution', 'freshId').click();
    await expect(field(page, 'contribution', 'receiverPersonId')).toHaveValue('product-one');
    await expect(field(page, 'contribution', 'receiverPersonId').locator('option:checked')).toHaveText('Research lead · retired');
    await apply(page, 'contribution').click();
    const accepted = await state(page), added = accepted.contributions.find(row => row.id !== id);
    assert.ok(added); assert.equal(added.receiverPersonId, 'product-one');
    assert.equal(added.reviewBoundary, null);
    await expect(total(page)).toHaveText('$1,200.00');
    await draftField(page, 'contribution', 'receiverPersonId', 'product-two');
    await page.evaluate(() => {
      const { studio, controller } = window.responsibilityFixture;
      const plan = structuredClone(studio.read().state); plan.people[1].label = 'First new name';
      studio.replace(plan, studio.read()); controller.refresh();
    });
    await page.evaluate(() => {
      const { studio } = window.responsibilityFixture;
      const plan = structuredClone(studio.read().state); plan.people[1].label = 'Second new name';
      studio.replace(plan, studio.read());
    });
    await action(page, 'contribution', 'review').click();
    await expect(settings(page, 'contribution').locator('fieldset')).toHaveAttribute('disabled', '');
    await expect(field(page, 'contribution', 'receiverPersonId')).toHaveValue('product-two');
    await action(page, 'contribution', 'review').click();
    await expect(settings(page, 'contribution').locator('fieldset')).not.toHaveAttribute('disabled');
    await action(page, 'contribution', 'cancel').click();
    assert.equal((await state(page)).contributions.find(row => row.id === added.id).receiverPersonId, 'product-one');
  });

  test(`${engine}: supporting-session order, unresolved responsibility and explicit removal remain separate from pricing`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const { studio, controller } = window.responsibilityFixture;
      const plan = structuredClone(studio.read().state);
      plan.work.push({ ...plan.work[0], id: 'follow-up', label: 'Follow-up session', minutesPerOccurrence: 0, lifecycle: 'retired' });
      studio.replace(plan, studio.read()); controller.refresh();
    });
    await contribution(page);
    await member(page, 'follow-up').check();
    await people(page).locator('[data-responsibility-action="work-up"][data-responsibility-id="follow-up"]').click();
    await field(page, 'contribution', 'receiverPersonId').selectOption('');
    await field(page, 'contribution', 'decisionOwnerPersonId').selectOption('');
    const row = (await state(page)).contributions[0];
    assert.deepEqual(row.workIds, ['follow-up', 'review']);
    assert.equal(row.receiverPersonId, null); assert.equal(row.decisionOwnerPersonId, null); assert.equal(row.reviewBoundary, null);
    await expect(people(page).locator('[data-responsibility-list]')).toContainText('For Unassigned');
    await expect(people(page).locator('[data-responsibility-list]')).toContainText('Follow-up session');
    await page.evaluate(() => {
      const { studio } = window.responsibilityFixture;
      const result = studio.previewCommand({ type: 'work.remove', workId: 'follow-up' }, studio.read());
      if (!result.ok || result.projection.state.contributions[0].workIds.join(',') !== 'review')
        throw new Error('Removing supporting work must keep its contribution with the remaining session.');
    });
    await people(page).locator(`[data-responsibility-action="remove"][data-responsibility-id="${row.id}"]`).click();
    await expect(people(page).locator('[data-responsibility-confirm]')).toContainText('Remove Source retrieval?');
    await action(page, 'contribution', 'cancel').click();
    assert.equal((await state(page)).contributions.length, 1);
    await people(page).locator(`[data-responsibility-action="remove"][data-responsibility-id="${row.id}"]`).click();
    await apply(page, 'contribution').click();
    assert.equal((await state(page)).contributions.length, 0);
    await expect(add(page)).toBeFocused();
    await expect(total(page)).toHaveText('$1,200.00');
    await contribution(page, 'source-retrieval', { draft: true });
    await member(page, 'follow-up').check();
    await page.evaluate(() => {
      const { studio, controller } = window.responsibilityFixture;
      const result = studio.applyCommand({ type: 'work.remove', workId: 'follow-up' }, studio.read());
      if (!result.ok) throw new Error(result.error.message);
      controller.refresh();
    });
    await action(page, 'contribution', 'review').click();
    await expect(people(page).locator('ul[data-responsibility-work]')).toHaveAttribute('aria-invalid', 'true');
    await expect(people(page).locator('[data-responsibility-error="workIds"]')).not.toHaveText('');
    await member(page, 'follow-up').click();
    await expect(member(page, 'follow-up')).toHaveCount(0);
    await expect(people(page).locator('ul[data-responsibility-work]')).toHaveAttribute('aria-invalid', 'false');
    await expect(people(page).locator('[data-responsibility-error="workIds"]')).toHaveText('');
    await action(page, 'contribution', 'cancel').click();
    await expect(total(page)).toHaveText('$1,200.00');
  });

  test(`${engine}: responsibility controls preserve narrow reading, visible focus and successor lifecycle ownership`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true);
    await role(page);
    await page.screenshot({ path: resolve(captures, `${engine}-1440.png`), fullPage: false });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await contribution(page);
    await frames(page);
    const overflow = await settings(page, 'contribution').evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth,
      overflowing: [...element.querySelectorAll('*')].filter(child => child.getClientRects().length && child.scrollWidth > child.clientWidth + 2)
        .map(child => ({ tag: child.tagName, className: child.className, text: child.textContent.slice(0, 70), width: child.clientWidth, scroll: child.scrollWidth })),
      controls: [...element.querySelectorAll('select,textarea,button')].filter(control => control.getClientRects().length).map(control => {
        const box = control.getBoundingClientRect(), outer = element.getBoundingClientRect();
        return { name: control.name || control.textContent, left: box.left - outer.left, right: box.right - outer.right };
      }) }));
    assert.ok(overflow.scroll <= overflow.width + 2, JSON.stringify(overflow));
    assert.ok(overflow.controls.every(control => control.left >= -2 && control.right <= 2), JSON.stringify(overflow));
    await field(page, 'contribution', 'receiverPersonId').focus();
    await expect(field(page, 'contribution', 'receiverPersonId')).toBeFocused();
    await field(page, 'contribution', 'categoryId').scrollIntoViewIfNeeded();
    const box = await field(page, 'contribution', 'categoryId').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const prior = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 260);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(prior);
    await page.screenshot({ path: resolve(captures, `${engine}-390-enlarged.png`), fullPage: false });

    const lifecycle = await page.evaluate(async () => {
      const { mountResponsibilityPanel } = await import('/collaboration/native-investment-studio/responsibility-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.responsibilityFixture.controller.dispose(); window.responsibilityFixture.editing.dispose();
      const element = document.querySelector('[data-native-team-editor]'); element.hidden = false;
      const studio = createStudio();
      let receiver, successor, armed = false, callbacks = 0;
      const facade = { ...studio, previewCommand(...args) {
        const result = studio.previewCommand(...args);
        if (armed) { armed = false; receiver.dispose(); }
        return result;
      } };
      const editing = createDraftCoordinator(facade);
      receiver = mountResponsibilityPanel(element, { studio: facade, editing, onEditing: () => callbacks++ });
      receiver.selectPerson('product-one'); callbacks = 0; armed = true;
      const select = element.querySelector('[name="functionId"]'); select.value = 'engineering'; select.dispatchEvent(new Event('input', { bubbles: true }));
      const retirement = { callbacks, active: editing.read().active, raw: editing.read().parked[0]?.raw.functionId, ready: element.hasAttribute('data-responsibility-ready') };
      editing.dispose();
      const nextEditing = createDraftCoordinator(studio);
      receiver = mountResponsibilityPanel(element, { studio, editing: nextEditing, onAccepted() {
        receiver.dispose();
        successor = mountResponsibilityPanel(element, { studio, editing: nextEditing }); successor.create();
        element.querySelector('[data-responsibility-status]').textContent = 'Successor controls this edit.';
        element.querySelector('[name="categoryId"]').focus();
      } });
      receiver.selectPerson('product-one');
      select.value = 'data-ml'; select.dispatchEvent(new Event('input', { bubbles: true }));
      element.querySelector('[data-responsibility-configure="role"] form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      const handoff = { status: element.querySelector('[data-responsibility-status]').textContent, focused: document.activeElement?.name,
        active: nextEditing.read().active?.kind, role: studio.read().state.people[0].role.functionId };
      successor?.dispose(); receiver.dispose(); nextEditing.dispose();
      const closedHandoffs = [];
      for (const action of ['cancel', 'remove']) {
        const currentStudio = createStudio(), currentEditing = createDraftCoordinator(currentStudio);
        if (action === 'remove') {
          const result = currentStudio.applyCommand({ type: 'contribution.create', contribution: {
            id: 'review-output', categoryId: 'source-retrieval', receiverPersonId: null, decisionOwnerPersonId: null,
            workIds: [], reviewBoundary: null, decisionBoundary: null,
          } }, currentStudio.read());
          if (!result.ok) throw new Error(result.error.message);
        }
        let transitioned = false, lateCallbacks = 0, nextReceiver;
        const currentReceiver = mountResponsibilityPanel(element, { studio: currentStudio, editing: currentEditing,
          onEditing: () => { if (transitioned) lateCallbacks++; } });
        if (action === 'cancel') currentReceiver.selectPerson('product-one');
        else currentReceiver.open('contribution.remove:review-output');
        const returnTarget = action === 'cancel' ? element.querySelector('[data-responsibility-configure="role"] > summary')
          : element.querySelector('[data-responsibility-action="create"]');
        returnTarget.addEventListener('focus', () => {
          transitioned = true; currentReceiver.dispose();
          nextReceiver = mountResponsibilityPanel(element, { studio: currentStudio, editing: currentEditing });
          nextReceiver.create();
          element.querySelector('[data-responsibility-status]').textContent = 'Successor owns the returned focus.';
          element.querySelector('[name="categoryId"]').focus();
        }, { once: true });
        if (action === 'cancel') element.querySelector('[data-responsibility-configure="role"] fieldset [data-responsibility-action="cancel"]').click();
        else element.querySelector('[data-responsibility-configure="contribution"] form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        closedHandoffs.push({ action, transitioned, lateCallbacks, status: element.querySelector('[data-responsibility-status]').textContent,
          focused: document.activeElement?.name, active: currentEditing.read().active?.kind,
          contributions: currentStudio.read().state.contributions.length });
        nextReceiver?.dispose(); currentReceiver.dispose(); currentEditing.dispose();
      }
      return { retirement, handoff, closedHandoffs };
    });
    assert.deepEqual(lifecycle.retirement, { callbacks: 0, active: null, raw: 'engineering', ready: false });
    assert.deepEqual(lifecycle.handoff, { status: 'Successor controls this edit.', focused: 'categoryId', active: 'contribution', role: 'data-ml' });
    assert.deepEqual(lifecycle.closedHandoffs, ['cancel', 'remove'].map(action => ({ action, transitioned: true, lateCallbacks: 0,
      status: 'Successor owns the returned focus.', focused: 'categoryId', active: 'contribution', contributions: 0 })));
  });
}
