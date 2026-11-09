import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { participantMovement } from './participant-movement.browser-helper.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map();
const route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-people-teams');
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
const adjacent = page => root(page).locator('[data-rack-editor-kind]');
const record = (page, kind, id) => root(page).locator(`[data-connection-templates] .studio-delivery [data-studio-record-kind="${kind}"][data-studio-record-id="${id}"]`).first();
const teamRecord = page => root(page).locator('[data-team-rack-record]');
const closeBorrowed = page => adjacent(page).locator('[data-rack-editor-close]').click();
async function removePerson(page, id) {
  const row = people(page).locator(`[data-roster-person="${id}"]`);
  const more = row.locator('.studio-person-more');
  if (await more.getAttribute('open') === null) await more.locator('summary').click();
  await row.locator('[data-assembly-action="person-remove"]').click();
}
async function openTeamPlanning(page) {
  await tab(page, 'coordination').click();
  await expect(root(page).locator('[data-connection-templates]')).toBeVisible();
  if (await adjacent(page).isVisible()) await closeBorrowed(page);
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
  return page;
}

async function prepareCreation(page, kind) {
  await page.evaluate(async kind => {
    const { mountAssemblyPanel } = await import('/collaboration/native-investment-studio/assembly-controller.mjs');
    mountAssemblyPanel(document.querySelector('[data-native-assembly]'), {}).create(`${kind}.create`);
  }, kind);
}
async function ada(page) {
  await prepareCreation(page, 'person');
  await field(page, 'label').fill('Ada');
  await field(page, 'ratePerHour').fill('120');
  await field(page, 'fundedHours').fill('2');
}

for (const engine of names) {
  for (const receivingField of ['receiverPersonId', 'decisionOwnerPersonId']) test(`${engine}: contribution person creation stays local and returns to ${receivingField}`, async t => {
    const page = await open(t, engine, true);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { studio, controller } = window.assemblyFixture;
      const result = studio.replace(createShowcasePlan({ peopleExamples: true }), studio.read());
      if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    const contribution = root(page).locator('[data-responsibility-configure="contribution"]');
    await root(page).locator('button[data-contribution-id="prototype-draft"]').click();
    const before = JSON.parse(await bytes(page)), original = before.contributions.find(row => row.id === 'prototype-draft');
    const review = 'Check the prototype against the agreed service request.';
    await page.evaluate(review => {
      const { editing } = window.assemblyFixture, draft = editing.contribution.read().draft;
      const result = editing.contribution.setText(draft.token, 'reviewBoundary', review);
      if (!result.ok) throw Error(result.error.code);
    }, review);
    await contribution.locator(`[data-native-create="person"][data-native-return-field="${receivingField}"]`).click();
    const slot = contribution.locator('[data-contribution-creation]');
    const creation = slot.locator('[data-assembly-configure]');
    await expect(contribution).toHaveAttribute('open', '');
    await expect(creation).toBeVisible();
    await expect(creation).toHaveAttribute('data-form', 'person.create');
    assert.equal(await slot.evaluate(node => Boolean(node.closest('form'))), false, 'local creation retains its own form boundary');
    await expect(root(page).locator('[data-assembly-configure]')).toHaveCount(1);
    await expect(creation.getByRole('button', { name: 'Back to Draft artifacts', exact: true })).toBeVisible();
    const name = receivingField === 'receiverPersonId' ? 'Service designer' : 'Delivery sponsor';
    await creation.locator('[name="label"]').fill(name);
    await creation.locator('[name="ratePerHour"]').fill('125');
    await creation.locator('[name="fundedHours"]').fill('2');
    if (receivingField === 'receiverPersonId') for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await creation.scrollIntoViewIfNeeded(); await frames(page);
      const geometry = await creation.evaluate(node => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, width: innerWidth,
          nestedForms: Boolean(node.querySelector('form form')),
          fields: [...node.querySelectorAll('input,select,button')].filter(control => control.getClientRects().length)
            .map(control => { const rect = control.getBoundingClientRect(); return { left: rect.left, right: rect.right }; }) };
      });
      assert.equal(geometry.nestedForms, false);
      assert.ok(geometry.left >= 0 && geometry.right <= width + 1
        && geometry.fields.every(box => box.left >= geometry.left - 1 && box.right <= geometry.right + 1), JSON.stringify(geometry));
      await creation.screenshot({ path: resolve(captures, `${engine}-contribution-add-person-${width}.png`) });
    }
    await creation.locator('[data-assembly-apply]').click();
    await expect(slot).toBeHidden();
    await expect(contribution).toHaveAttribute('open', '');
    const afterPerson = JSON.parse(await bytes(page)), added = afterPerson.people.find(person => person.label === name);
    assert.ok(added, 'person creation adds the requested record');
    await expect(contribution.locator(`[name="${receivingField}"]`)).toHaveValue(added.id);
    assert.deepEqual(afterPerson.contributions.find(row => row.id === original.id), original,
      'creation preserves the accepted contribution until its retained proposal is applied');
    const raw = await page.evaluate(() => window.assemblyFixture.editing.contribution.read().draft.raw);
    assert.equal(raw.reviewBoundary, review);
    assert.deepEqual(raw.workIds, original.workIds);
    await contribution.locator('[data-responsibility-apply]').click();
    const accepted = JSON.parse(await bytes(page)).contributions.find(row => row.id === original.id);
    assert.deepEqual(accepted, { ...original, [receivingField]: added.id, reviewBoundary: review });
    await root(page).locator('[data-studio-undo]').click();
    const undone = JSON.parse(await bytes(page));
    assert.deepEqual(undone.contributions.find(row => row.id === original.id), original);
    assert.ok(undone.people.some(person => person.id === added.id), 'Undo treats person creation and contribution assignment as separate accepted edits');
  });

  test(`${engine}: closing local contribution creation returns to its retained working area`, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { studio, controller } = window.assemblyFixture;
      const result = studio.replace(createShowcasePlan({ peopleExamples: true }), studio.read());
      if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    const contribution = root(page).locator('[data-responsibility-configure="contribution"]');
    await root(page).locator('button[data-contribution-id="prototype-draft"]').click();
    const initial = await bytes(page);
    await contribution.locator('[data-native-return-field="receiverPersonId"]').click();
    const creation = contribution.locator('[data-contribution-creation] [data-assembly-configure]');
    await creation.locator('[name="label"]').fill('Saved contributor');
    await creation.locator('[data-team-rack-close]').click();
    await expect(contribution.locator('[data-contribution-creation]')).toBeHidden();
    await expect(contribution).toHaveAttribute('open', '');
    await expect(contribution.locator('[name="receiverPersonId"]')).toBeFocused();
    await expect(root(page).locator('.native-assembly__teams > [data-assembly-configure]')).toHaveCount(1);
    assert.equal(await bytes(page), initial, 'Close changes placement while preserving accepted state');
    const parked = await page.evaluate(() => window.assemblyFixture.editing.read().parked);
    assert.ok(parked.some(draft => draft.kind === 'assembly' && draft.raw.label === 'Saved contributor'));
    await contribution.locator('[data-native-return-field="decisionOwnerPersonId"]').click();
    await creation.locator('[name="label"]').fill('Discarded contributor');
    await creation.locator('[data-assembly-cancel]').click();
    await expect(contribution.locator('[data-contribution-creation]')).toBeHidden();
    await expect(contribution.locator('[name="decisionOwnerPersonId"]')).toBeFocused();
    assert.equal(await bytes(page), initial, 'Cancel returns locally and leaves the plan unchanged');
    assert.equal(await page.evaluate(() => window.assemblyFixture.editing.read().parked.some(
      draft => draft.kind === 'assembly' && draft.raw.label === 'Discarded contributor')), false);
    await contribution.locator('[data-native-return-field="receiverPersonId"]').click();
    await creation.locator('[name="label"]').fill('Contributor saved with parent');
    await contribution.locator(':scope > .studio-rack-header [data-rack-editor-close]').click();
    await expect(contribution).not.toHaveAttribute('open', '');
    await expect(contribution.locator('[data-contribution-creation]')).toBeHidden();
    const restored = root(page).locator('.native-assembly__teams > [data-assembly-configure]');
    await expect(restored).toHaveCount(1);
    await expect(restored).not.toHaveAttribute('open', '');
    assert.ok(await page.evaluate(() => window.assemblyFixture.editing.read().parked.some(
      draft => draft.kind === 'assembly' && draft.raw.label === 'Contributor saved with parent')));
    await root(page).locator('button[data-contribution-id="prototype-draft"]').click();
    await expect(contribution).toHaveAttribute('open', '');
    await expect(contribution.locator('[data-contribution-creation]')).toBeHidden();
    await expect(restored).not.toHaveAttribute('open', '');
    assert.equal(await bytes(page), initial, 'closing the parent also dismisses its child while retaining saved entries');
  });

  test(`${engine}: local person creation preserves contribution review after an intervening accepted edit`, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { studio, controller } = window.assemblyFixture;
      const result = studio.replace(createShowcasePlan({ peopleExamples: true }), studio.read());
      if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    const contribution = root(page).locator('[data-responsibility-configure="contribution"]');
    await root(page).locator('button[data-contribution-id="prototype-draft"]').click();
    const pendingReview = 'Keep this proposed review with the contribution.';
    await page.evaluate(value => {
      const { editing } = window.assemblyFixture, draft = editing.contribution.read().draft;
      const result = editing.contribution.setText(draft.token, 'reviewBoundary', value);
      if (!result.ok) throw Error(result.error.code);
    }, pendingReview);
    await contribution.locator('[data-native-return-field="receiverPersonId"]').click();
    const creation = contribution.locator('[data-contribution-creation] [data-assembly-configure]');
    await creation.locator('[name="label"]').fill('Recovery reviewer');
    const acceptedReview = 'The accepted review now includes the revised service conditions.';
    await page.evaluate(reviewBoundary => {
      const { studio, controller } = window.assemblyFixture;
      const row = studio.read().state.contributions.find(item => item.id === 'prototype-draft');
      const result = studio.applyCommand({ type: 'contribution.update', contributionId: row.id,
        contribution: { ...row, reviewBoundary } }, studio.read());
      if (!result.ok) throw Error(result.error.code); controller.refresh();
    }, acceptedReview);
    await expect(creation.locator('[data-assembly-recovery]')).toBeVisible();
    await creation.locator('[data-assembly-action="review"]').click();
    await expect(creation.locator('[name="label"]')).toBeEnabled();
    await creation.locator('[data-assembly-apply]').click();
    await expect(contribution.locator('[data-contribution-creation]')).toBeHidden();
    await expect(contribution.locator('[data-responsibility-recovery]')).toBeVisible();
    await expect(contribution.locator('[name="receiverPersonId"]')).toBeDisabled();
    const after = JSON.parse(await bytes(page));
    assert.ok(after.people.some(person => person.label === 'Recovery reviewer'));
    assert.equal(after.contributions.find(row => row.id === 'prototype-draft').reviewBoundary, acceptedReview);
    const retained = await page.evaluate(() => {
      const view = window.assemblyFixture.editing.contribution.read();
      return { status: view.status, review: view.draft.raw.reviewBoundary, receiver: view.draft.raw.receiverPersonId };
    });
    assert.deepEqual(retained, { status: 'stale', review: pendingReview, receiver: 'ari' },
      'an intervening accepted edit keeps the original contribution proposal behind its explicit review boundary');
    await contribution.locator('[data-responsibility-action="review"]').click();
    await expect(contribution.locator('[name="receiverPersonId"]')).toBeEnabled();
    assert.equal(await page.evaluate(() => window.assemblyFixture.editing.contribution.read().draft.raw.reviewBoundary), pendingReview);
    assert.equal(JSON.parse(await bytes(page)).contributions.find(row => row.id === 'prototype-draft').reviewBoundary, acceptedReview);
  });

  test(`${engine}: team settings show selected hourly rates with explicit unknowns`, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const { studio, controller } = window.assemblyFixture;
      const plan = JSON.parse(studio.exportText()); plan.people[0].rateCentsPerHour = null;
      const result = studio.importText(JSON.stringify(plan), studio.read());
      if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    await people(page).locator('[data-assembly-team="delivery"]').click();
    const preview = people(page).locator('[data-assembly-preview]');
    await expect(preview.locator('.native-coordination__plate')).toHaveText('Known team rate · USD / hour');
    await expect(preview.locator('[data-assembly-total]')).toHaveText('$300');
    await expect(preview.locator('[data-assembly-preview-note]')).toHaveText('1 rate unknown.');
    await expect(preview.locator('[data-assembly-preview-note]')).toBeVisible();
    await people(page).locator('[data-assembly-member="product-two"]').uncheck();
    await expect(preview.locator('[data-assembly-total]')).toHaveText('$200');
    for (const id of ['engineering-one', 'engineering-two'])
      await people(page).locator(`[data-assembly-member="${id}"]`).uncheck();
    await expect(preview.locator('[data-assembly-total]')).toHaveText('—');
    await people(page).locator('[data-assembly-member="product-one"]').uncheck();
    await expect(preview.locator('[data-assembly-total]')).toHaveText('$0');
    await expect(preview.locator('[data-assembly-preview-note]')).toHaveText('Choose people for this team.');
  });

  for (const changed of [false, true]) test(`${engine}: Add a person returns locally to the ${changed ? 'changed' : 'untouched'} team and retains unfinished entries`, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    const configure = people(page).locator('[data-assembly-configure]');
    await people(page).locator('[data-assembly-team="delivery"]').click();
    const teamName = changed ? 'Delivery team' : 'Product and Engineering';
    if (changed) await field(page, 'label').fill(teamName);
    await configure.locator('[data-native-create="person"]').click();
    await expect(configure).toHaveAttribute('data-form', 'person.create');
    const back = configure.getByRole('button', { name: `Back to Settings · ${teamName}`, exact: true });
    await expect(back).toBeVisible();
    await field(page, 'label').fill('Service designer');
    await field(page, 'ratePerHour').fill('125');
    if (changed) for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await configure.scrollIntoViewIfNeeded(); await frames(page);
      await page.screenshot({ path: resolve(captures, `${engine}-add-person-return-${width}.png`) });
    }
    await back.click();
    await expect(configure).toHaveAttribute('data-form', 'team.update');
    await expect(field(page, 'label')).toHaveValue(teamName);
    await expect(field(page, 'label')).toBeFocused();
    await expect(configure.getByRole('button', { name: 'Back to Teams', exact: true })).toBeVisible();
    assert.equal(await bytes(page), initial, 'a breadcrumb changes view while preserving accepted state');
    await root(page).locator('[data-amp-panel="saved"]').click();
    const saved = root(page).locator('[data-native-saved-list] > li').filter({ hasText: 'Service designer' });
    await saved.locator('[data-saved-open]').click();
    await expect(field(page, 'label')).toHaveValue('Service designer');
    await expect(field(page, 'ratePerHour')).toHaveValue('125');
    await apply(page).click();
    assert.ok(JSON.parse(await bytes(page)).people.some(person => person.label === 'Service designer'));
  });

  test(`${engine}: a person creation breadcrumb restores its originating Coordination handoff rack`, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { studio, controller } = window.assemblyFixture;
      const result = studio.replace(createShowcasePlan(), studio.read());
      if (!result.ok) throw Error(result.error.code); controller.refresh();
    });
    const initial = await bytes(page);
    await openTeamPlanning(page);
    const trigger = root(page).locator('.studio-delivery [data-studio-record-kind="connection"]').first();
    await trigger.click();
    const connection = root(page).locator('[data-connection-configure]');
    await expect(adjacent(page)).toHaveAttribute('data-rack-editor-kind', 'connection');
    await connection.locator('[name="sharedObject"]').fill('Prepared service handoff');
    await connection.locator('[data-native-create="person"]').click();
    const configure = people(page).locator('[data-assembly-configure]');
    await field(page, 'label').fill('Service coordinator');
    await configure.getByRole('button', { name: /^Back to Settings/ }).click();
    await expect(tab(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(adjacent(page)).toBeVisible();
    await expect(adjacent(page)).toHaveAttribute('data-rack-editor-kind', 'connection');
    await expect(connection.locator('[name="sharedObject"]')).toHaveValue('Prepared service handoff');
    await expect(connection.locator('[name="receiverPersonId"]')).toBeFocused();
    assert.equal(await bytes(page), initial, 'restoring the handoff rack retains both proposals and accepted state');
  });

  test(`${engine}: removal notices name valid team and person dependencies without changing the accepted plan`, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { getCapabilityDefinition } = await import('/collaboration/native-investment-studio/capabilities.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      const plan = createShowcasePlan(), definition = getCapabilityDefinition('ability', 'inspect-history', '1.0.0');
      plan.abilities.push({ id: 'audit-history', definitionId: definition.id, definitionVersion: definition.version,
        context: 'Inspect the pilot history.', teamId: 'engineering', responsiblePersonIds: ['maya'],
        decisionOwnerPersonId: 'maya', lifecycle: 'active', prerequisites: [],
        supportBindings: definition.supportRequirements.map(row => ({ requirementId: row.id, workIds: ['review'] })) });
      plan.capabilityEvidence.push({ id: 'history-observation', subject: { kind: 'ability', instanceId: 'audit-history' },
        stage: 'rehearsed', context: 'Pilot walkthrough', observation: 'The reviewer traced the saved request.',
        recorderPersonId: 'maya', reviewBoundary: 'Review with operations.', observedPlanRevision: 0 });
      window.assemblyFixture.controller.dispose(); window.assemblyFixture.editing.dispose();
      const studio = createStudio(plan);
      window.assemblyFixture = { studio, controller: mountCoordinationPanel(document.querySelector('[data-native-coordination]'), { studio }),
        editing: createDraftCoordinator(studio) };
    });
    await tab(page, 'people').click();
    const accepted = await bytes(page), dependencies = people(page).locator('[data-assembly-dependencies]');
    await people(page).getByRole('button', { name: 'Remove team: Engineering', exact: true }).click();
    await expect(dependencies.locator('li')).toHaveText([
      'Work: Pilot decision review', 'Work: Prototype pairing',
      'Connection: Prototype, acceptance evidence and exception log', 'Connection: Pilot scope and tested user journeys',
      'Ability: Inspect history', 'Practice: Actively negotiate expectations · Engineering',
    ]);
    await expect(apply(page)).toBeDisabled(); assert.equal(await bytes(page), accepted);
    await cancel(page).click();
    await removePerson(page, 'maya');
    await expect(dependencies).toContainText('Contribution: Cross-source synthesis');
    await expect(dependencies).toContainText('Evidence: Inspect history · Pilot walkthrough');
    await expect(dependencies).not.toContainText('undefined'); await expect(apply(page)).toBeDisabled();
    assert.equal(await bytes(page), accepted);
    assert.equal(await page.evaluate(() => window.assemblyFixture.studio.readHistory().undoCount), 0);
    await cancel(page).click();
    await action(page, 'team-create').click();
    const newTeam = await page.evaluate(() => window.assemblyFixture.studio.read().state.teams.at(-1).id);
    const withTeam = await bytes(page);
    await people(page).locator(`[data-assembly-action="team-remove"][data-assembly-id="${newTeam}"]`).click();
    await expect(dependencies).toBeHidden(); await expect(apply(page)).toBeEnabled(); await apply(page).click();
    await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), withTeam, 'a reference-free team removal still recovers through amp Undo');
  });

  test(`${engine}: direct team membership preserves a same-instance successor's focus`, async t => {
    const page = await open(t, engine);
    const results = await page.evaluate(async () => {
      const { mountAssemblyPanel } = await import('/collaboration/native-investment-studio/assembly-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.assemblyFixture.controller.dispose(); window.assemblyFixture.editing.dispose();
      const element = document.querySelector('[data-native-assembly]'); element.hidden = false;
      const results = [];
      for (const phase of ['accepted', 'editing']) {
        const studio = createStudio(createShowcasePlan()), editing = createDraftCoordinator(studio);
        let receiver, armed = false;
        const succeed = () => {
          if (!armed || !studio.readHistory().undoCount) return;
          armed = false; receiver.refresh(); receiver.open('team.update:engineering');
          element.querySelector('[data-assembly-form] [name="label"]').focus();
        };
        receiver = mountAssemblyPanel(element, { studio, editing,
          onAccepted: () => { if (phase === 'accepted') succeed(); },
          onEditing: () => { if (phase === 'editing') succeed(); } });
        receiver.open('team.update:product'); armed = true;
        const input = element.querySelector('[data-assembly-member="jules"]');
        input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true }));
        results.push({ phase, target: editing.assembly.read().draft?.targetId, focused: document.activeElement.name,
          added: studio.read().state.teams.find(row => row.id === 'product').personIds.includes('jules'),
          changes: studio.readHistory().undoCount });
        receiver.dispose(); editing.dispose();
      }
      return results;
    });
    assert.deepEqual(results, ['accepted', 'editing'].map(phase => ({ phase, target: 'engineering', focused: 'label', added: true, changes: 1 })));
  });

  test(`${engine}: People adds usable people and teams directly inside their racks with amp Undo`, { timeout: 60000 }, async t => {
    const page = await open(t, engine), initial = await bytes(page);
    await action(page, 'person-create').click();
    await expect(action(page, 'person-create')).toBeFocused();
    const personEditor = people(page).locator('[data-person-configure]');
    await expect(personEditor).not.toHaveAttribute('open', '');
    const addedPerson = await page.evaluate(() => window.assemblyFixture.studio.read().state.people.at(-1));
    assert.equal(addedPerson.label, 'New person 1');
    const addedId = addedPerson.id;
    await people(page).locator(`[data-person-id="${addedId}"]`).click();
    await expect(people(page).locator('.studio-people-rates [data-person-configure]')).toBeVisible();
    await expect(personEditor.locator('[name="label"]')).toHaveValue('New person 1');
    const personApply = people(page).locator('[data-person-desk-apply]');
    await expect(personApply).toHaveCount(1); await expect(personApply).toBeDisabled();
    await personEditor.locator('[name="label"]').fill('Service designer');
    await expect(personApply).toBeEnabled(); await personApply.click();
    await expect(personApply).toBeFocused(); await expect(personApply).toBeDisabled();
    await expect(personEditor.locator('[data-person-action="apply"]')).toHaveAttribute('aria-disabled', 'true');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await personEditor.scrollIntoViewIfNeeded(); await frames(page);
      assert.equal(await personEditor.evaluate(element => {
        const box = element.getBoundingClientRect();
        return box.left >= 0 && box.right <= document.documentElement.clientWidth + 1;
      }), true, 'the canonical editor stays in its People rack at phone and desktop widths');
      await page.screenshot({ path: resolve(captures, `${engine}-direct-person-${width}.png`) });
    }
    await people(page).locator('[data-person-desk-close]').click();
    await expect(people(page).locator(`[data-person-id="${addedId}"]`)).toBeFocused();
    await people(page).locator(`[data-person-id="${addedId}"]`).click();
    await expect(personApply).toHaveCount(1); await expect(personApply).toBeDisabled();
    await people(page).locator('[data-person-desk-close]').click();
    await action(page, 'team-create').click();
    await expect(action(page, 'team-create')).toBeFocused();
    await expect(people(page).locator('[data-assembly-configure]')).not.toHaveAttribute('open', '');
    const createdTeam = await page.evaluate(() => window.assemblyFixture.studio.read().state.teams.at(-1));
    assert.equal(createdTeam.label, 'New team 1');
    await people(page).locator(`[data-assembly-team="${createdTeam.id}"]`).click();
    await expect(people(page).locator('.native-assembly__teams [data-assembly-configure]')).toBeVisible();
    await expect(field(page, 'label')).toHaveValue('New team 1');
    await field(page, 'label').fill('Service team');
    const addedMember = people(page).locator(`[data-assembly-member="${addedId}"]`);
    await addedMember.check();
    const teamApply = people(page).locator('[data-assembly-configure] [data-editor-apply]');
    await expect(teamApply).toHaveCount(1); await expect(teamApply).toBeDisabled();
    await expect(addedMember).toBeFocused();
    await expect(apply(page)).toHaveAttribute('aria-disabled', 'true');
    const addedTeam = await page.evaluate(() => window.assemblyFixture.studio.read().state.teams.at(-1));
    assert.equal(addedTeam.label, 'Service team'); assert.deepEqual(addedTeam.personIds, [addedId]);
    await action(page, 'close').click();
    await expect(people(page).locator('[data-assembly-configure]')).not.toHaveAttribute('open', '');
    await expect(people(page).locator(`[data-assembly-team="${addedTeam.id}"]`)).toBeFocused();
    for (let count = 0; count < 4; count += 1) await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), initial);
  });
  test(`${engine}: People session tracks return to people and team lanes open the matching membership editor`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const accepted = await bytes(page);
    const track = people(page).locator('.studio-people-reading .studio-session-tracks__pad').first();
    await expect(track).toHaveClass(/native-control--navigate/);
    await track.click();
    await expect(tab(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(root(page).locator('[data-native-configure]')).toHaveAttribute('open', '');
    await root(page).getByRole('button', { name: 'Return to people and teams', exact: true }).click();
    await expect(tab(page, 'people')).toHaveAttribute('aria-selected', 'true');
    await expect(people(page).locator('.studio-people-reading button').first()).toBeFocused();
    await expect(action(page, 'person-create')).toBeVisible();
    await openTeamPlanning(page);
    const workspace = root(page).locator('[data-native-workspace="connection"]');
    await expect(workspace.getByRole('heading', { name: 'Team planning', exact: true })).toBeVisible();
    await record(page, 'team', 'delivery').click();
    await expect(tab(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(teamRecord(page).locator('[data-team-rack-name]')).toHaveValue('Product and Engineering');
    await expect(teamRecord(page).getByRole('group', { name:'People in this team' })).toBeVisible();
    assert.equal(await bytes(page), accepted);
  });
  test(`${engine}: in-rack person editing retains one owner through Close, switching, Cancel and Apply`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true), accepted = await bytes(page);
    await page.evaluate(() => { window.assemblyFixture.personNode = document.querySelector('[data-person-configure]'); });
    await openTeamPlanning(page);
    const first = record(page, 'person', 'product-one'), second = record(page, 'person', 'product-two');
    const editor = root(page).locator('[data-person-configure]');
    const rate = editor.locator('[name="ratePerHour"]');
    await first.click();
    await expect(tab(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(adjacent(page)).toBeVisible(); await expect(editor.locator('[name="label"]')).toBeFocused();
    assert.equal(await adjacent(page).evaluate(node => Boolean(node.closest('[data-team-rack-editor]'))), true, 'the person receiver occupies the Team planning rack');
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
    await closeBorrowed(page); await expect(adjacent(page)).toBeHidden();
    await first.click(); await expect(rate).toHaveValue('00101.50');
    assert.equal(await page.evaluate(() => window.assemblyFixture.editing.person.read().draft.token === window.assemblyFixture.personToken), true, 'same-record disclosure keeps its existing draft lease');
    await closeBorrowed(page); await second.click(); await rate.fill('123.45');
    await closeBorrowed(page); await first.click(); await expect(rate).toHaveValue('00101.50');
    assert.equal(await page.evaluate(() => window.assemblyFixture.editing.person.read().draft.personId), 'product-one');
    await closeBorrowed(page); await record(page, 'team', 'delivery').click();
    await expect(teamRecord(page)).toBeVisible();
    await expect(adjacent(page)).toBeHidden();
    await teamRecord(page).locator('[data-template-action="team-back"]').click();
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

  test(`${engine}: direct team editing accepts in-rack membership and restores it through shared Undo`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true), accepted = await bytes(page);
    await openTeamPlanning(page);
    const trigger = record(page, 'team', 'delivery'), editor = teamRecord(page);
    const name = editor.locator('[data-team-rack-name]'), member = editor.locator('[data-team-rack-member="engineering-two"]');
    const back = () => editor.locator('[data-template-action="team-back"]').click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height:1000 }); await frames(page);
      await trigger.click(); await expect(editor).toBeVisible();
      await expect(name).toHaveValue('Product and Engineering');
      await expect(root(page).locator('[data-team-rack-board] .studio-delivery')).toHaveCount(0);
      await expect(adjacent(page)).toBeHidden();
      const geometry = await editor.evaluate(node => {
        const outer=node.getBoundingClientRect(), chapter=node.closest('[data-native-chapter-panel]').getBoundingClientRect();
        const controls=[...node.querySelectorAll('input,button')].filter(target => target.getClientRects().length);
        return { left:outer.left, right:outer.right, chapterLeft:chapter.left, chapterRight:chapter.right,
          targets:controls.map(target => { const box=target.getBoundingClientRect(); return { left:box.left, right:box.right }; }),
          overflow:document.documentElement.scrollWidth > innerWidth + 1 };
      });
      assert.ok(geometry.left >= geometry.chapterLeft && geometry.right <= geometry.chapterRight && geometry.left >= 0 && geometry.right <= width, JSON.stringify(geometry));
      assert.ok(geometry.targets.every(box => box.left >= geometry.left - 1 && box.right <= geometry.right + 1), JSON.stringify(geometry));
      assert.equal(geometry.overflow, false);
      await editor.screenshot({ path:resolve(captures, `${engine}-direct-team-${width}.png`) });
      await back(); await expect(trigger).toBeFocused();
    }
    await trigger.click(); await name.fill('Delivery together'); await member.uncheck();
    await editor.locator('[data-team-member-row="product-two"] [data-team-member-move="up"]').click();
    assert.deepEqual(await page.evaluate(() => window.assemblyFixture.studio.read().state.teams[0]), {
      id:'delivery', label:'Delivery together', personIds:['product-two', 'product-one', 'engineering-one'], lifecycle:'active',
    });
    await expect(editor.locator('[data-assembly-apply]')).toHaveCount(0);
    await back(); await trigger.click();
    await expect(name).toHaveValue('Delivery together'); await expect(member).not.toBeChecked();
    for (let count=0; count<3; count+=1) await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), accepted, 'shared Undo restores name, membership and order');
    await expect(name).toHaveValue('Product and Engineering'); await expect(member).toBeChecked();
    assert.deepEqual(await editor.locator('[data-team-member-row][data-selected="true"]').evaluateAll(rows => rows.map(row => row.dataset.teamMemberRow)),
      ['product-one','product-two','engineering-one','engineering-two']);
    await back(); await tab(page, 'people').click();
    await people(page).locator('[data-assembly-team="delivery"]').click();
    await expect(people(page).locator('[data-assembly-configure]')).toBeVisible();
    await expect(people(page).locator('[data-assembly-member="engineering-two"]')).toBeChecked();
    await expect(root(page).locator('[data-assembly-configure]')).toHaveCount(1);
  });

  test(`${engine}: a refused in-rack record switch keeps its existing draft recoverable`, { timeout: 60000 }, async t => {
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
      await closeBorrowed(page);
    }
    await page.evaluate(() => { window.assemblyFixture.retainedToken = window.assemblyFixture.editing.person.read().draft.token; });
    const next = record(page, 'person', 'additional-person-8');
    await next.click();
    await expect(adjacent(page)).toBeHidden();
    await record(page, 'person', 'additional-person-7').click();
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

  test(`${engine}: direct People team membership retains row geometry, focus and shared recovery`, { timeout: 60000 }, async t => {
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
      assert.equal(await page.evaluate(() => window.assemblyFixture.studio.read().state.teams[0].personIds.includes('product-one')), false,
        'the checkbox changes accepted membership directly');
      await page.keyboard.press('Space'); assert.deepEqual(await geometry(), before);
      assert.equal(await page.evaluate(() => window.assemblyFixture.studio.read().state.teams[0].personIds.at(-1)), 'product-one',
        'a newly included person joins at the end of the accepted team order');
    }
    const { revision: membershipRevision, ...afterMembership } = JSON.parse(await bytes(page));
    const sequence = await page.evaluate(() => window.assemblyFixture.studio.readAcceptance().sequence);
    await participantMovement(page, list);
    const { revision: movementRevision, ...afterMovement } = JSON.parse(await bytes(page));
    assert.deepEqual(afterMovement, afterMembership, 'moving back and restoring the last member reproduces the plan content');
    assert.equal(movementRevision, membershipRevision + 4);
    assert.equal(await page.evaluate(() => window.assemblyFixture.studio.readAcceptance().sequence), sequence + 4,
      'each explicit movement or membership change enters shared accepted history');
    for (let count = 0; count < 8; count += 1) await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), accepted, 'shared Undo restores the complete original membership and order');
  });
  test(`${engine}: people and teams publish exact funded amounts, keep membership order and resolve removal dependencies`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const original = await bytes(page);
    await ada(page);
    const rate = people(page).locator('[data-assembly-person-fields] [data-rate-step="10"]');
    await field(page, 'ratePerHour').fill(''); await expect(rate).toBeEnabled();
    await expect(field(page, 'ratePerHour')).toHaveValue('');
    await rate.press('ArrowRight');
    await expect(field(page, 'ratePerHour')).toHaveValue('10.00');
    assert.equal(await bytes(page), original, 'a deliberate dial adjustment establishes a draft rate');
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
    await expect(people(page).locator('[data-person-configure]')).not.toHaveAttribute('open', '');
    const adaId = await page.evaluate(() => window.assemblyFixture.studio.read().state.people.find(row => row.label === 'Ada').id);
    assert.equal(await page.evaluate(id => window.assemblyFixture.studio.read().state.people.find(row => row.id === id).rateCentsPerHour, adaId), 12525);
    await prepareCreation(page, 'team');
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
    await people(page).locator(`[data-assembly-action="team-up"][data-assembly-id="${design.id}"]`).click();
    assert.equal(await page.evaluate(() => window.assemblyFixture.studio.read().state.teams[0].id), design.id);
    await expect(people(page).locator(`[data-assembly-team="${design.id}"]`)).toBeFocused();
    const retained = await bytes(page);
    await removePerson(page, 'product-one');
    await expect(people(page).locator('[data-assembly-dependencies]')).toContainText('Team: Design');
    await expect(people(page).locator('[data-assembly-dependencies]')).toContainText('Work:');
    await expect(apply(page)).toBeDisabled();
    assert.equal(await bytes(page), retained);
    await cancel(page).click();
    await expect(people(page).locator('[data-roster-person="product-one"] [data-assembly-action="person-remove"]')).toBeFocused();
    await people(page).locator(`[data-assembly-team="${design.id}"]`).click();
    await people(page).locator(`[data-assembly-member="${adaId}"]`).uncheck();
    await removePerson(page, adaId); await apply(page).click();
    await expect(total(page)).toHaveText('$1,200.00');
    await tab(page, 'investment').click();
    await root(page).locator('[data-investment-deck="compare"]').click(); await root(page).locator('[data-investment-action="undo"]').click();
    await expect(total(page)).toHaveText('$1,450.50');
    assert.equal(await page.evaluate(id => window.assemblyFixture.studio.read().state.people.some(row => row.id === id), adaId), true);
  });

  test(`${engine}: saved assembly selections retain their target through chapter changes, purpose disclosure and creation collisions`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await prepareCreation(page, 'team');
    await field(page, 'label').fill('Operations');
    await people(page).locator('[data-assembly-member="engineering-one"]').check();
    await people(page).locator('[data-person-id="product-one"]').click();
    await people(page).locator('[data-person-configure] input[name="ratePerHour"]').fill('125');
    await people(page).locator('[data-assembly-configure] > summary').click();
    await expect(form(page).locator('fieldset')).toBeEnabled();
    await expect(field(page, 'label')).toHaveValue('Operations');
    await people(page).locator('[data-person-id="product-one"]').click();
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
    await prepareCreation(page, 'person');
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
    const controlGeometry = () => field(page, 'fundedHours').evaluate(input => {
      const rect = input.getBoundingClientRect(), group = input.closest('[data-assembly-person-fields]').getBoundingClientRect();
      return { top: rect.top - group.top, height: rect.height, width: rect.width };
    });
    const before = await controlGeometry();
    await field(page, 'ratePerHour').fill('-1'); await frames(page);
    const after = await controlGeometry();
    assert.ok(after.height > 0 && after.width > 0, 'validation retains visible numeric controls');
    // The preview above may reflow; validation below preserves the control rows.
    for (const key of ['top', 'height', 'width'])
      assert.ok(Math.abs(after[key] - before[key]) < 1, `validation preserves control ${key}`);
    await expect(people(page).locator('[data-assembly-error="ratePerHour"]')).not.toHaveText('');
    const controlsBox = await people(page).locator('[data-assembly-person-fields]').boundingBox();
    const feedbackBox = await people(page).locator('[data-assembly-feedback]').boundingBox();
    assert.ok(feedbackBox.y >= controlsBox.y + controlsBox.height - 1, 'feedback follows the numeric controls');
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
      await prepareCreation(page, 'team');
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
