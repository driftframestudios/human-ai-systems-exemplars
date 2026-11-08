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
  await people(page).locator(`[data-person-id="${id}"]`).click();
  await field(page, 'role', 'functionId').focus();
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
      await expect(settings(page, 'role').locator('.studio-role-pads')).toBeVisible();
      await expect(field(page, 'role', 'functionId')).toBeVisible();
      await expect(field(page, 'role', 'functionId')).toBeEnabled();
      await expect(people(page).locator('.studio-person-order .native-control--remove').first()).toHaveCSS('background-color', 'rgb(243, 216, 223)');
      await expect(people(page).locator('.studio-people-rates')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
      await people(page).screenshot({ path: resolve(captures, `${engine}-people-racks-${width}.png`) });
      await people(page).locator('[data-person-id="maya"]').click();
      const person = people(page).locator('[data-person-configure]');
      const personBox = await person.boundingBox();
      assert.ok(personBox.height < 700, `person controls fit a phone-height reading at ${width}: ${personBox.height}`);
      await person.screenshot({ path: resolve(captures, `${engine}-person-rack-${width}.png`) });
      await person.locator('[data-person-rack-close]').click();
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
    const retained = await page.evaluate(() => window.responsibilityFixture.editing.read().parked.find(row => row.kind === 'person'));
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
    await expect(field(page, 'role', 'functionId')).toBeVisible();
    await field(page, 'role', 'functionId').selectOption('design-research');
    assert.equal((await state(page)).people[0].role.functionId, 'design-research', 'the visible facet accepts its first change without opening a disclosure');
    await root(page).locator('[data-studio-undo]').click();
    await role(page);
    await expect(settings(page, 'role').locator('summary')).toHaveText('Role mix · product-one · Add role details');
    for (const [name, value] of Object.entries(expectedRole)) {
      await settings(page, 'role').locator(`[data-role-field="${name}"]`).click();
      await field(page, 'role', name).selectOption(name === 'change' ? 'npt:collective-action' : value);
    }
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
    await expect(settings(page, 'role').locator('fieldset')).toHaveAttribute('disabled', '');
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
        const returnTarget = action === 'cancel' ? element.querySelector('[data-role-field="functionId"]')
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
