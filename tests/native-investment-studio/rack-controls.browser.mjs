import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { participantMovement } from './participant-movement.browser-helper.mjs';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-rack-controls');
let server, fixture, complete;
registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../..' + route), 'utf8');
  fixture = createNativeAboutFixture(source);
  complete = source.replace('data="../img/plot/about_prompt_conditions_cartography.svg"', 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});
const root = page => page.locator('[data-native-coordination]');
const horizon = page => root(page).locator('[data-score-projection]');
const shared = page => root(page).locator('[data-connection-templates] .studio-session-tracks');
const adjacent = page => root(page).locator('[data-rack-editor-kind]');
const configure = page => root(page).locator('[data-native-configure]');
const track = (page, id) => horizon(page).locator(`[data-cadence-key="track-work:${id}"]`);
const sharedTrack = (page, id) => shared(page).locator(`[data-session-track="${id}"] .studio-session-tracks__name`);
const bytes = page => page.evaluate(() => window.rackFixture.studio.exportText());
async function open(t, engine, width, full = false, touch = false) {
  const context = await browsers.get(engine).newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', hasTouch:touch });
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
    if (url.origin === server.origin && url.pathname === route) return request.fulfill({ status: 200, contentType: 'text/html', body: full ? complete : fixture });
    return url.origin === server.origin ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' });
  });
  await page.goto(server.origin + route); await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  await page.evaluate(async () => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
    const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
    const element = document.querySelector('[data-native-coordination]');
    mountCoordinationPanel(element).dispose();
    const studio = createStudio(createShowcasePlan());
    window.rackFixture = { studio, controller: mountCoordinationPanel(element, { studio }), editing: createDraftCoordinator(studio) };
  });
  return page;
}
async function receiverReading(page, selectedId, expanded) {
  const keys = root(page).locator('[data-studio-session-id]');
  assert.ok(await keys.count() >= 8, 'both racks expose accepted session controls');
  const controlsId = await keys.first().getAttribute('aria-controls');
  assert.ok(controlsId, 'session keys name their mounted settings receiver');
  assert.equal(await root(page).locator(`[id="${controlsId}"]`).count(), 1);
  if (expanded) assert.equal(await root(page).locator(`[id="${controlsId}"]`).evaluate(node => node.matches('[data-native-configure]') || Boolean(node.querySelector('[data-native-configure]'))), true, 'expanded controls identify the visible canonical settings');
  await expect.poll(() => keys.evaluateAll((controls, expected) => controls.every(control => {
    const selected = control.dataset.studioSessionId === expected.selectedId;
    return control.getAttribute('aria-pressed') === String(selected)
      && control.getAttribute('aria-expanded') === String(selected && expected.expanded)
      && control.getAttribute('aria-controls') === expected.controlsId;
  }), { selectedId, expanded, controlsId })).toBe(true);
}
const skin = locator => locator.evaluate(element => {
  const style = getComputedStyle(element);
  return Object.fromEntries(['backgroundColor', 'color', 'borderTopColor', 'borderTopWidth', 'borderRadius', 'boxShadow', 'fontWeight']
    .map(property => [property, style[property]]));
});
const caret = locator => locator.evaluate(element => getComputedStyle(element, '::after').transform);
async function contained(page, width) {
  const bounds = await root(page).evaluate(element => ({ page: document.documentElement.scrollWidth,
    left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }));
  assert.ok(bounds.page <= width + 1 && bounds.left >= 0 && bounds.right <= width + 1, JSON.stringify(bounds));
}

for (const engine of names) for (const width of [390, 1440]) {
  test(`${engine}: top Apply shares canonical validation, acceptance and focus at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width);
    await track(page, 'review').click();
    const topApply = adjacent(page).locator('[data-rack-editor-apply]');
    const bottomApply = configure(page).locator('[data-action="apply"]');
    const label = configure(page).locator('[name="label"]');
    await expect(topApply).toHaveCount(1); await expect(topApply).toBeDisabled();
    await label.fill(''); await expect(topApply).toBeEnabled(); await topApply.click();
    await expect(label).toBeFocused();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.id === 'review').label), 'Pilot decision review');
    await label.fill('Review the pilot together'); await topApply.click();
    await expect(topApply).toBeFocused(); await expect(topApply).toBeDisabled();
    await expect(bottomApply).toHaveAttribute('aria-disabled', 'true');
    assert.equal(await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.id === 'review').label), 'Review the pilot together');
    await adjacent(page).locator('[data-rack-editor-close]').click(); await track(page, 'review').click();
    await expect(topApply).toHaveCount(1); await expect(topApply).toBeDisabled();
    await label.fill('Retained review title');
    await page.evaluate(() => {
      const { studio, controller } = window.rackFixture, base = studio.read(), person = base.state.people[0];
      const result = studio.updatePerson(person.id, { ...person, label: 'Pilot product lead' }, base);
      if (!result.ok) throw Error(result.error.code);
      controller.refresh();
    });
    await expect(bottomApply).toBeDisabled(); await expect(topApply).toBeDisabled();
    await configure(page).locator('[data-action="review"]').click();
    await expect(topApply).toBeEnabled(); await topApply.click();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.id === 'review').label), 'Retained review title');
    await adjacent(page).locator('.studio-rack-editor__heading').screenshot({ path: resolve(captures, `${engine}-top-apply-${width}.png`) });
    await adjacent(page).locator('[data-rack-editor-close]').click();

    const handoff = root(page).locator('[data-connection-templates] [data-delivery-connection]').first();
    await handoff.click();
    await expect(adjacent(page)).toHaveAttribute('data-rack-editor-kind', 'connection');
    await expect(topApply).toBeDisabled();
    await adjacent(page).locator('[name="sharedObject"]').fill('Agreed next step'); await topApply.click();
    await expect(topApply).toBeFocused(); await expect(topApply).toBeDisabled();
    await expect(adjacent(page).locator('[data-connection-apply]')).toHaveAttribute('aria-disabled', 'true');
    assert.ok(await page.evaluate(() => window.rackFixture.studio.read().state.connections.some(row => row.sharedObject === 'Agreed next step')));
    await contained(page, width);
  });

  test(`${engine}: cassettes load a quiet scope and keep in-rack edits recoverable at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width), original = await bytes(page);
    const library = horizon(page).locator('.studio-plan-library');
    await expect(root(page).locator('[data-studio-undo]')).toBeDisabled();
    const shelf = library.locator('.studio-tape-shelf');
    const cassette = id => library.locator(`[data-studio-plan-id="${id}"]`);
    await expect(library.locator('[data-studio-plan-id]')).toHaveCount(4);
    await expect(library.locator('[data-plan-shelf-undo]')).toHaveCount(0);
    await shelf.scrollIntoViewIfNeeded();
    if (width === 390) assert.equal(await shelf.evaluate(node => node.scrollWidth > node.clientWidth), true);
    await cassette('pairing').click();
    await expect(adjacent(page)).toBeHidden();
    await expect(cassette('pairing')).toHaveAttribute('aria-pressed', 'true');
    await expect(horizon(page).locator('.native-cadence__track-name')).toHaveCount(1);
    await expect(horizon(page).locator('.native-cadence__track-name')).toContainText('Prototype pairing');
    assert.equal(await bytes(page), original, 'loading a cassette only changes the view');
    await track(page, 'pairing').click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Prototype pairing');
    await configure(page).locator('[name="minutesPerSession"]').fill('15');
    await configure(page).locator('[data-action="apply"]').click();
    await expect(cassette('pairing')).toContainText('1 h 15 min · 4 sessions');
    const edited = await bytes(page);
    await expect(configure(page).locator('.studio-repetition')).toBeHidden();
    await configure(page).locator('[data-session-occurrence="1"]').click();
    await configure(page).locator('[data-session-occurrence-remove]').click();
    await expect(configure(page).locator('[name="occurrences"]')).toHaveValue('3');
    await configure(page).locator('[data-action="apply"]').click();
    assert.deepEqual(await page.evaluate(() => window.rackFixture.studio.read().state.scoreSettings.cadence.placements
      .filter(row => row.workId === 'pairing').map(({ occurrenceIndex, periodId, subdivision }) => ({ occurrenceIndex, periodId, subdivision }))),
    [{ occurrenceIndex:0, periodId:'period-2', subdivision:1 },
      { occurrenceIndex:1, periodId:'period-3', subdivision:1 },
      { occurrenceIndex:2, periodId:'period-3', subdivision:2 }]);
    await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), edited, 'amp Undo restores the removed session and its placement');
    await cassette('research').click();
    await expect(adjacent(page)).toBeHidden();
    await expect(horizon(page).locator('.native-cadence__track-name')).toContainText('Research synthesis');
    await horizon(page).getByRole('button', { name:'All plans', exact:true }).click();
    await expect(horizon(page).locator('.native-cadence__track-name')).toHaveCount(4);
    await horizon(page).locator('[data-cadence-key="period:period-2"]').click();
    const scope = horizon(page).getByRole('heading', { name:'Sprint 2', exact:true });
    await cassette('pairing').click();
    await expect(scope).toHaveAttribute('aria-current', 'page');
    await expect(adjacent(page)).toBeHidden();
    await expect(library.locator('[data-studio-plan-id]')).toHaveCount(4);
    const create = library.getByRole('button', { name:'New plan', exact:true });
    await create.click();
    const addition = await page.evaluate(() => {
      const state = window.rackFixture.studio.read().state;
      const work = state.work.find(item => !['review','research','pairing','rehearsal'].includes(item.id));
      return { work, placements:state.scoreSettings.cadence.placements.filter(row => row.workId === work.id) };
    });
    assert.deepEqual(addition.placements, [{ workId:addition.work.id, occurrenceIndex:0, periodId:'period-2', subdivision:1 }]);
    await expect(adjacent(page)).toBeHidden();
    await expect(cassette(addition.work.id)).toHaveAttribute('aria-pressed', 'true');
    await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), edited);
    await expect(root(page).locator('[data-studio-undo]')).toBeFocused();
    await horizon(page).locator('[data-cadence-key="plan-overview"]').click();
    await expect(horizon(page).locator('.native-cadence__track-name')).toHaveCount(4);
    await contained(page, width);
    for (let index = 0; index < 4; index++) await create.click();
    const shelfShape = await shelf.evaluate(node => ({ height:node.clientHeight, horizontal:node.scrollWidth > node.clientWidth,
      count:node.querySelectorAll('.studio-tape-key').length }));
    assert.equal(shelfShape.count, 8);
    if (width === 1440) assert.ok(shelfShape.height > 640, 'the full-height shelf shows more than the former four-cassette area');
    else assert.ok(shelfShape.horizontal && shelfShape.height < 300, 'mobile keeps a compact horizontal shelf');
    if (engine === 'chromium') {
      await horizon(page).locator('.studio-plan-workspace').screenshot({ path:resolve(captures, `plan-cassettes-${width}.png`) });
      await page.emulateMedia({ forcedColors:'active', reducedMotion:'reduce' });
      await cassette('pairing').click();
      const forced = await cassette('pairing').evaluate(key => {
        const title = getComputedStyle(key.querySelector('.studio-tape-face__title'));
        return { title:title.color, background:title.backgroundColor,
          detail:getComputedStyle(key.querySelector('.studio-tape-face__detail')).color };
      });
      assert.equal(forced.title, forced.detail);
      assert.notEqual(forced.title, forced.background);
    }
  });

  test(`${engine}: Team planning braids phases and accepted edit routes with local scrolling and Undo at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width), accepted = await bytes(page);
    const planning = root(page).locator('section[data-native-workspace="connection"]');
    const templates = planning.locator('[data-connection-templates]');
    const rack = templates.locator('[data-template-rack]');
    const header = rack.locator(':scope > header');
    await expect(planning.getByRole('heading', { name: 'Team planning', exact: true })).toBeVisible();
    await expect(planning.locator(':scope > summary')).toHaveCount(0);
    await expect(templates).toBeVisible();
    assert.equal(await planning.evaluate(element => {
      const heading = element.querySelector('h3'), deck = element.querySelector('.studio-arrangement-deck');
      const hint = element.querySelector('.native-connection-template__form > .native-coordination__hint');
      const rack = element.querySelector('[data-template-rack]');
      return [heading, deck, hint, rack].every(Boolean)
        && [heading, deck, hint].every((node, index) => Boolean(node.compareDocumentPosition([deck, hint, rack][index]) & Node.DOCUMENT_POSITION_FOLLOWING));
    }), true, 'heading, arrangement deck, hint and secondary rack form one reading order');
    await expect(header).toContainText('Included work');
    await expect(header.locator('[data-template-total]')).toHaveText(/\$[\d,]+\.\d{2}/u);
    const delivery = rack.locator('[data-delivery-template]');
    const board = delivery.locator('.studio-delivery__board');
    const phaseKeys = delivery.locator('[data-delivery-open]');
    await expect(phaseKeys).toHaveText(['Planning', 'Design', 'Implementation', 'Testing', 'Deployment', 'Maintenance']);
    await expect(board).toHaveAttribute('data-delivery-scope', 'overview');
    assert.deepEqual(await delivery.locator('[data-delivery-connection]').evaluateAll(controls => controls.map(control => control.dataset.deliveryConnection).filter(id => !id.startsWith('custom-connection:')).sort()), ['feedback', 'handoff']);
    await expect(delivery.locator('[data-delivery-session]')).toHaveCount(4);
    await expect(rack.locator('.studio-team-rack__lifecycle')).toHaveCount(0);
    await expect(templates.locator('[data-template-structure] .studio-arrangement-connections')).toHaveCount(0);
    const originalTeams = await delivery.locator('[data-delivery-team]').evaluateAll(cards => [...new Set(cards.map(card => card.dataset.deliveryTeam))].filter(id => !id.startsWith('custom-team:')).sort());
    assert.deepEqual(originalTeams, ['partner', 'pod']);
    const tracks = shared(page).locator('.studio-session-tracks__scroll');
    await header.scrollIntoViewIfNeeded();
    const headerBounds = await header.boundingBox();
    const scrolling = await tracks.evaluate(element => {
      element.scrollLeft = element.scrollWidth;
      return { offset: element.scrollLeft, overflow: element.scrollWidth > element.clientWidth + 1 };
    });
    if (width === 390) assert.ok(scrolling.overflow && scrolling.offset > 0, 'participant tracks remain reachable inside the phone rack');
    assert.deepEqual(await header.boundingBox(), headerBounds, 'the header and investment reading stay outside the scrolling tracks');
    await tracks.evaluate(element => { element.scrollLeft = 0; });
    const scope = delivery.locator('.studio-delivery__scope');
    const scopeBounds = await scope.boundingBox();
    const boardScrolling = await board.evaluate(element => {
      element.scrollLeft = element.scrollWidth;
      return { offset: element.scrollLeft, overflow: element.scrollWidth > element.clientWidth + 1 };
    });
    if (width === 390) assert.ok(boardScrolling.overflow && boardScrolling.offset > 0, 'delivery phases remain reachable inside the phone rack');
    assert.deepEqual(await scope.boundingBox(), scopeBounds, 'the phase heading and return stay outside the scrolling board');
    await board.evaluate(element => { element.scrollLeft = 0; });
    await contained(page, width);
    await rack.screenshot({ path: resolve(captures, `${engine}-team-rack-${width}.png`) });
    if (width === 1440) await planning.screenshot({ path: resolve(captures, `${engine}-team-planning-${width}.png`) });

    await delivery.locator('[data-delivery-open="design"]').click();
    await expect(board).toHaveAttribute('data-delivery-scope', 'design');
    await expect(delivery.locator('[data-delivery-current]')).toHaveText('Design');
    await expect(delivery.locator('[data-delivery-overview]')).toBeFocused();
    await expect(delivery.locator('[data-delivery-phase]:visible')).toHaveCount(1);
    const designTeam = delivery.locator('[data-delivery-phase="design"] [data-delivery-team]').first();
    await designTeam.locator('.studio-delivery__team-key').click();
    await expect(templates.locator('.studio-arrangement-settings')).toHaveCount(0);
    const teamRecord = templates.locator('[data-team-rack-record]');
    await expect(teamRecord).toBeVisible();
    await expect(teamRecord.locator('[data-template-action="team-back"]')).toBeFocused();
    await expect(adjacent(page)).toBeHidden();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.read().state.arrangements.length), 1,
      'opening a starter team accepts its arrangement before canonical editing');
    await teamRecord.locator('[data-template-action="team-back"]').click();
    const acceptedTeamId = await designTeam.locator('.studio-delivery__team-key').getAttribute('data-studio-record-id');
    assert.ok(acceptedTeamId && !acceptedTeamId.startsWith('proposal-'), 'the rack opens the accepted team identity');
    await expect(designTeam.locator('.studio-delivery__team-key')).toBeFocused();
    const person = designTeam.locator('[data-delivery-person]').first();
    await person.click();
    await expect(adjacent(page).locator('[data-person-configure] [name="ratePerHour"]')).toBeVisible();
    await expect(shared(page)).toBeVisible();
    await expect(board).toBeHidden();
    await expect(adjacent(page).locator('[data-rack-editor-close]')).toHaveText('Close');
    if (engine === 'chromium') await rack.screenshot({ path:resolve(captures, `person-in-team-rack-${width}.png`) });
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(person).toBeFocused();
    await delivery.locator('[data-delivery-overview]').click();
    await expect(board).toHaveAttribute('data-delivery-scope', 'overview');
    await expect(delivery.locator('[data-delivery-open="design"]')).toBeFocused();

    const maintenanceKey = delivery.locator('[data-delivery-open="maintenance"]');
    await maintenanceKey.scrollIntoViewIfNeeded();
    await maintenanceKey.click();
    const maintenanceTeam = delivery.locator('[data-delivery-phase="maintenance"] [data-delivery-team]').first();
    await maintenanceTeam.locator('.studio-delivery__team-key').click();
    await teamRecord.locator('[data-team-rack-name]').fill('Partner group for continuing support');
    await teamRecord.locator('[data-team-rack-name]').press('Tab');
    await teamRecord.locator('[data-template-action="team-back"]').click();
    await expect(maintenanceTeam.locator('.studio-delivery__team-key')).toContainText('Partner group for continuing support');
    await expect(board).toHaveAttribute('data-delivery-scope', 'maintenance');
    const returnKey = delivery.locator('[data-delivery-overview]');
    await returnKey.scrollIntoViewIfNeeded();
    const pagePosition = await page.evaluate(() => scrollY);
    await returnKey.click();
    await expect(maintenanceKey).toBeFocused();
    const returnGeometry = await maintenanceKey.evaluate(key => {
      const board = key.closest('.studio-delivery__board');
      return { key: key.getBoundingClientRect().toJSON(), board: board.getBoundingClientRect().toJSON(), scroll: scrollY };
    });
    assert.ok(returnGeometry.key.left >= returnGeometry.board.left - 1 && returnGeometry.key.right <= returnGeometry.board.right + 1,
      `return after an edit reveals the originating phase key inside the board: ${JSON.stringify(returnGeometry)}`);
    assert.ok(Math.abs(returnGeometry.scroll - pagePosition) < 2, 'phase return preserves the visitor page position');
    const handoff = delivery.locator('[data-delivery-connection]:not([data-delivery-connection^="custom-connection:"])').first();
    await handoff.click();
    await expect(templates.locator('[data-team-rack-editor] [data-connection-configure] [name="senderTeamId"]')).toBeFocused();
    const handoffId = await handoff.getAttribute('data-studio-record-id');
    await adjacent(page).locator('[data-connection-configure] [name="sharedObject"]').fill('Reviewed work and receiving instructions');
    await adjacent(page).locator('[data-connection-apply]').click();
    assert.equal(await page.evaluate(id => window.rackFixture.studio.read().state.connections.find(row => row.id === id).sharedObject, handoffId),
      'Reviewed work and receiving instructions', 'the in-rack handoff editor accepts through the canonical connection owner');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(handoff).toBeFocused();
    await delivery.locator('[data-delivery-open="testing"]').click();
    await delivery.locator('[data-delivery-session="review"]').click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Pilot decision review');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(planning).toBeVisible();
    await expect(delivery.locator('[data-delivery-session="review"]')).toBeFocused();
    await expect(board).toHaveAttribute('data-delivery-scope', 'testing');
    await expect(delivery.locator('[data-delivery-current]')).toHaveText('Testing');
    await delivery.locator('[data-delivery-overview]').click();
    const customized = await bytes(page);
    assert.notEqual(customized, accepted, 'direct team changes and handoff Apply retain their accepted records');

    await delivery.locator('[data-delivery-open="testing"]').click();
    const undoBefore = await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount);
    await templates.locator('[data-reel-choice="tiger-team"]').click();
    await expect(templates.locator('[data-arrangement-reading="accepted"]')).toHaveAttribute('data-arrangement-template', 'tiger-team');
    await expect(delivery).toHaveAttribute('data-delivery-template', 'tiger-team');
    await expect(board).toHaveAttribute('data-delivery-scope', 'testing');
    await expect(delivery.locator('[data-delivery-current]')).toHaveText('Testing');
    await delivery.locator('[data-delivery-overview]').click();
    assert.deepEqual(await delivery.locator('[data-delivery-team]').evaluateAll(cards => [...new Set(cards.map(card => card.dataset.deliveryTeam))].filter(id => !id.startsWith('custom-team:')).sort()), ['owner', 'response', 'specialists']);
    assert.deepEqual(await delivery.locator('[data-delivery-connection]').evaluateAll(controls => controls.map(control => control.dataset.deliveryConnection).filter(id => !id.startsWith('custom-connection:')).sort()), ['diagnose', 'resolve', 'return']);
    await expect(header).toContainText('Included work');
    const arranged = await bytes(page);
    assert.notEqual(arranged, customized, 'the explicit reel choice updates the accepted picture immediately');
    await rack.screenshot({ path: resolve(captures, `${engine}-team-rack-accepted-${width}.png`) });
    assert.equal(await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount), undoBefore + 1);
    await expect(templates.locator('[data-template-action="apply"]')).toBeHidden();
    const recoveryId = await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.label === 'Diagnose and agree on a response').id);
    await delivery.locator(`[data-delivery-session="${recoveryId}"]`).click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Diagnose and agree on a response');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(planning).toBeVisible();
    await expect(delivery.locator(`[data-delivery-session="${recoveryId}"]`)).toBeFocused();
    assert.equal(await bytes(page), arranged, 'the new session opens its accepted record for later editing');

    await sharedTrack(page, 'review').click();
    await expect(shared(page).locator('.studio-shared__selection')).toContainText('Pilot decision review');
    await shared(page).locator('.studio-shared__selection [data-rack-editor-close]').click();
    await expect(planning).toBeVisible();
    await expect(sharedTrack(page, 'review')).toBeFocused();
    assert.equal(await bytes(page), arranged, 'accepted session inspection returns to the same Team planning section');
    await templates.locator('[data-reel-choice="tiger-team"]').click();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount), undoBefore + 1, 'the selected arrangement can be inspected again without another history entry');
    await templates.locator('[data-template-action="undo"]').click();
    assert.equal(await bytes(page), customized, 'Undo restores the preceding arrangement and its work together');
  });

  test(`${engine}: attached readings and in-rack relationship edits share records at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width), accepted = await bytes(page);
    const screen = horizon(page).locator('.native-cadence__screen');
    const companions = horizon(page).locator('.studio-rack-companions');
    const people = companions.locator('[data-cadence-disclosure="people"]');
    const flow = companions.locator('[data-cadence-disclosure="flow"]');
    const inspector = screen.locator('.native-score__inspector');
    const field = name => inspector.locator(`[data-cadence-field="${name}"]`);
    for (const drawer of [people, flow]) assert.equal(await drawer.evaluate(node => node.open), false);
    assert.equal(await companions.evaluate(node => node.previousElementSibling.matches('.studio-plan-workspace')), true);
    await horizon(page).locator('[data-cadence-key="track-period:period-2"]').click();
    const sprint = horizon(page).getByRole('heading', { name:'Sprint 2', exact:true });
    await expect(companions.locator('.studio-rack-companion__scope')).toHaveText(['Sprint 2', 'Sprint 2']);

    const personKey = screen.locator('[data-cadence-key^="rack-person:"]').first();
    await personKey.click();
    await expect(adjacent(page)).toHaveAttribute('data-rack-editor-kind', 'person');
    await expect(adjacent(page).locator('[data-person-configure]')).toBeVisible();
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(personKey).toBeFocused();
    await expect(sprint).toHaveAttribute('aria-current', 'page');

    const stageKey = screen.locator('[data-cadence-key^="rack-stage:"]').first();
    const stageId = (await stageKey.getAttribute('data-cadence-key')).slice('rack-stage:'.length);
    await stageKey.click();
    await expect(inspector).toBeVisible();
    assert.equal(await inspector.evaluate(node => node.parentElement.matches('[data-studio-session-slot]')), true);
    await field(`stage.${stageId}.label`).fill('Build and rehearse with operators');
    await inspector.getByRole('button', { name:'Close', exact:true }).click();
    await expect(stageKey).toBeFocused();
    await stageKey.click();
    await expect(field(`stage.${stageId}.label`)).toHaveValue('Build and rehearse with operators');
    await flow.locator(':scope > summary').click();
    const stage = flow.locator(`[data-cadence-key="stage:${stageId}"]`);
    await stage.click();
    await expect(field(`stage.${stageId}.label`)).toHaveValue('Build and rehearse with operators');
    await expect(inspector.getByRole('button', { name:'Add decision here', exact:true })).toBeVisible();
    await expect(inspector.getByRole('button', { name:'Add delay here', exact:true })).toBeVisible();
    if (engine === 'chromium') await inspector.screenshot({ path:resolve(captures, `in-rack-relationship-${width}.png`) });
    await inspector.getByRole('button', { name:'Cancel changes', exact:true }).click();
    await expect(stage).toBeFocused(); await expect(sprint).toHaveAttribute('aria-current', 'page');
    assert.equal(await bytes(page), accepted, 'closing and reopening inspections retains the accepted plan');
    await contained(page, width);
  });

  test(`${engine}: in-rack session editing retains draft, scope and return in the horizon at ${width}px`, { timeout: 90000 }, async t => {
    const page = await open(t, engine, width, true), accepted = await bytes(page);
    await page.evaluate(() => { window.rackFixture.sessionNode = document.querySelector('[data-native-configure]'); });
    await receiverReading(page, 'review', false);
    const closedCaret = await caret(track(page, 'pairing'));
    await horizon(page).locator('[data-cadence-key="track-period:period-2"]').click();
    const currentPeriod = horizon(page).getByRole('heading', { name: 'Sprint 2', exact: true });
    await expect(currentPeriod).toHaveAttribute('aria-current', 'page');
    const pad = horizon(page).locator('.native-cadence__pad[data-studio-session-id="pairing"]').first();
    const occurrence = Number((await pad.getAttribute('data-cadence-key')).split(':').at(-1));
    const rackShape = () => horizon(page).locator('.native-cadence__screen').evaluate(node => {
      const box = node.getBoundingClientRect(); return { width:box.width, height:box.height };
    });
    await pad.focus();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before = await rackShape();
    const sourceScroll = await horizon(page).locator('.native-cadence__tracks').evaluate(node => node.scrollLeft);
    await page.keyboard.press('Enter');
    await expect(adjacent(page)).toBeVisible();
    await expect(adjacent(page).locator('.studio-rack-header__owner')).toContainText('Plan overview');
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Prototype pairing');
    const placement = configure(page).locator(`[data-session-occurrence="${occurrence}"]`);
    await expect(placement).toBeFocused();
    await receiverReading(page, 'pairing', true);
    assert.equal((await rackShape()).width, before.width, 'the in-rack deck preserves its source rack width');
    assert.equal(await adjacent(page).evaluate(node => {
      const slot = node.parentElement, tracks = slot.nextElementSibling;
      return slot.matches('[data-studio-session-slot]') && slot.closest('.native-cadence__screen')
        && Boolean(slot.previousElementSibling.closest('.native-cadence__screen'))
        && tracks.matches('.native-cadence__tracks');
    }), true, 'the deck sits inside the persistent screen before Session tracks');
    assert.equal(await configure(page).evaluate(node => node === window.rackFixture.sessionNode), true, 'the adjacent panel borrows the canonical session owner');
    await expect(configure(page)).toHaveCount(1);
    const geometry = await adjacent(page).evaluate(node => {
      const box = node.getBoundingClientRect();
      const module = node.querySelector('.native-time-controls');
      return { left:box.left, right:box.right, nestedForm:Boolean(node.closest('form')),
        module:module.getBoundingClientRect().toJSON(),
        targets:[...module.querySelectorAll('input,button,.native-knob')].filter(target => target.getClientRects().length).map(target => {
          const rect=target.getBoundingClientRect(); return { left:rect.left,right:rect.right };
        }) };
    });
    assert.equal(geometry.nestedForm, false);
    assert.ok(geometry.left >= 0 && geometry.right <= width + 1 && geometry.targets.every(box => box.left >= geometry.left - 1 && box.right <= geometry.right + 1), JSON.stringify(geometry));
    const modules = await configure(page).evaluate(node => {
      const rect = selector => node.querySelector(selector).getBoundingClientRect().toJSON();
      return { duration:rect('.studio-duration'), sessions:rect('.studio-occurrences'),
        add:rect('[data-session-occurrence-add]'), remove:rect('[data-session-occurrence-remove]'),
        pads:rect('.studio-occurrences__pads'), funding:rect('#native-session-funding label') };
    });
    assert.ok(modules.add.right > modules.sessions.right - 24 && modules.add.bottom <= modules.pads.top,
      'Add is at the working-session module top right');
    assert.ok(modules.remove.right > modules.sessions.right - 24 && modules.remove.top > modules.pads.bottom,
      'Remove follows the session controls at the bottom right');
    if (width === 1440) assert.ok(Math.abs(modules.duration.height - modules.sessions.height) < 2,
      'duration fills the height of its neighboring rack module');
    assert.ok(modules.funding.height >= 64, 'Funding choices use touchable pads');
    await expect(configure(page).getByRole('heading', { name:'Funding and status', exact:true })).toBeVisible();
    await adjacent(page).evaluate(node => node.scrollIntoView({ block:'start', behavior:'instant' }));
    await page.screenshot({ path:resolve(captures, `${engine}-adjacent-session-${width}-viewport.png`) });
    await adjacent(page).screenshot({ path:resolve(captures, `${engine}-adjacent-session-${width}.png`) });
    await participantMovement(page, configure(page).locator('[data-native-session-members]'));
    assert.equal(await bytes(page), accepted, 'participant movement leaves accepted work intact');
    const minutes = configure(page).locator('[name="minutesPerSession"]');
    await configure(page).locator('[data-native-minutes-knob]').press('ArrowUp');
    await expect(minutes).toHaveValue('1');
    await expect(configure(page).locator('[data-native-duration-minutes]')).toHaveText('01');
    const knob = configure(page).locator('[data-native-minutes-knob]');
    await knob.scrollIntoViewIfNeeded();
    await knob.evaluate(node => node.addEventListener('pointerdown', event => { window.rackPointerId = event.pointerId; }, { once: true }));
    const dialBox = await knob.boundingBox();
    await page.mouse.move(dialBox.x + dialBox.width / 2, dialBox.y + 8);
    await page.mouse.down();
    await page.mouse.move(dialBox.x + dialBox.width - 8, dialBox.y + dialBox.height / 2, { steps: 3 });
    assert.equal(await knob.evaluate(node => node.hasPointerCapture(window.rackPointerId)), true, 'refresh preserves the active dial capture');
    await expect(knob).toBeFocused();
    await page.mouse.up();
    const turned = await minutes.inputValue();
    await configure(page).locator('[name="label"]').focus();
    await expect(minutes).toHaveValue(turned);
    await minutes.fill('045');
    await expect(minutes).toBeFocused();
    assert.equal(await configure(page).evaluate(node => node === window.rackFixture.sessionNode), true, 'refresh retains the live canonical form');
    const occurrenceRack = configure(page).locator('[data-session-occurrences]');
    await occurrenceRack.locator('[data-occurrence-field="periodId"][value="period-3"]').check();
    const placed = await page.evaluate(() => JSON.parse(window.rackFixture.editing.session.read().draft.raw.cadencePlacements));
    assert.equal(placed.find(row => row.occurrenceIndex === occurrence).periodId, 'period-3');
    await occurrenceRack.locator('[data-session-occurrence-add]').click();
    await expect(configure(page).locator('[name="occurrences"]')).toHaveValue('5');
    await expect(occurrenceRack.locator('[data-session-occurrence="4"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(occurrenceRack.locator('[data-occurrence-field="periodId"][value=""]')).toBeChecked();
    assert.equal(await bytes(page), accepted, 'placement and occurrence pads change the proposal until Apply');
    await page.evaluate(() => { window.rackFixture.sessionToken = window.rackFixture.editing.session.read().draft.token; });
    await pad.click();
    await expect(adjacent(page)).toBeHidden(); await expect(pad).toBeFocused();
    await pad.click(); await expect(minutes).toHaveValue('045');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(adjacent(page)).toBeHidden(); await expect(pad).toBeFocused();
    assert.equal(await horizon(page).locator('.native-cadence__tracks').evaluate(node => node.scrollLeft), sourceScroll, 'Close keeps the originating track position');
    await expect(currentPeriod).toHaveAttribute('aria-current', 'page');
    await receiverReading(page, 'pairing', false);
    assert.equal(await bytes(page), accepted);
    await track(page, 'pairing').click();
    await expect(minutes).toHaveValue('045');
    const openCaret = await caret(track(page, 'pairing'));
    assert.notEqual(openCaret, closedCaret, 'the selected row points into its open receiver');
    await track(page, 'pairing').click();
    await expect(adjacent(page)).toBeHidden(); await expect(track(page, 'pairing')).toBeFocused();
    await receiverReading(page, 'pairing', false);
    await track(page, 'pairing').click();
    await expect(minutes).toHaveValue('045');
    await configure(page).locator('[data-action="cancel"]').click();
    await expect(adjacent(page)).toBeHidden(); await expect(track(page, 'pairing')).toBeFocused();
    assert.equal(await bytes(page), accepted, 'Cancel discards the session proposal');
    await track(page, 'pairing').click();
    await expect(minutes).toHaveValue('0');
    const undoBefore = await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount);
    await minutes.fill('45');
    await configure(page).locator('[data-action="apply"]').click();
    await expect(adjacent(page)).toBeVisible();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.id === 'pairing').minutesPerOccurrence), 105);
    assert.equal(await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount), undoBefore + 1);
    await adjacent(page).locator('[data-rack-editor-close]').click(); await expect(track(page, 'pairing')).toBeFocused();
    await expect(currentPeriod).toHaveAttribute('aria-current', 'page');
    await receiverReading(page, 'pairing', false);

    await contained(page, width);
  });

  test(`${engine}: Shared sessions edits people and handoffs locally with Undo at ${width}px`, { timeout:60000 }, async t => {
    const page = await open(t, engine, width), original = await bytes(page);
    const rack = shared(page), delivery = root(page).locator('.studio-delivery');
    const participant = rack.locator('[data-shared-work="pairing"][data-shared-participant="leo"]');
    await participant.check(); await expect(participant).toBeFocused();
    assert.deepEqual(await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.id === 'pairing').personIds),
      ['ari','jules','leo']);
    await expect(rack.getByRole('status').first()).toHaveText('People saved');
    await expect(delivery).toBeVisible(); await expect(adjacent(page)).toBeHidden();
    await root(page).locator('[data-studio-undo]').click(); assert.equal(await bytes(page), original);
    await sharedTrack(page, 'pairing').click();
    const selected = rack.locator('.studio-shared__selection'); await expect(selected).toBeVisible();
    await expect(selected.locator('.studio-rack-header__owner')).toHaveText('Shared sessions · People');
    await expect(selected.getByRole('combobox')).toHaveValue('engineering');
    await selected.getByRole('button', {name:'Back to Shared sessions · People', exact:true}).click();
    await expect(selected).toBeHidden(); await expect(sharedTrack(page, 'pairing')).toBeFocused();
    await sharedTrack(page, 'pairing').click();
    await selected.locator('[data-rack-editor-close]').click(); await expect(sharedTrack(page, 'pairing')).toBeFocused();
    await rack.locator('[data-shared-work="research"][data-shared-participant="maya"]').uncheck();
    const last = rack.locator('[data-shared-work="research"][data-shared-participant="leo"]');
    await expect(last).toBeChecked(); await expect(last).toBeDisabled();
    await expect(last.locator('..')).toContainText('Add another person first');
    await root(page).locator('[data-studio-undo]').click(); assert.equal(await bytes(page), original);
    await rack.getByRole('tab', { name:'Handoffs', exact:true }).click();
    const link = rack.locator('[data-shared-work="research"][data-shared-handoff]').first();
    const connectionId = await link.getAttribute('data-shared-handoff'), wasChecked = await link.isChecked();
    await link.setChecked(!wasChecked); await expect(link).toBeFocused();
    assert.equal(await page.evaluate(id => window.rackFixture.studio.read().state.connections.find(row => row.id === id).workIds.includes('research'), connectionId), !wasChecked);
    await root(page).locator('[data-studio-undo]').click(); assert.equal(await bytes(page), original);
    const handoff = rack.locator(`[data-studio-record-id="${connectionId}"]`);
    await handoff.click();
    await expect(rack.locator('[data-shared-rack-editor] [data-connection-configure]')).toBeVisible();
    await expect(delivery).toBeVisible(); await expect(adjacent(page).locator('.studio-rack-header__owner')).toHaveText('Shared sessions · Handoffs');
    await adjacent(page).locator('[name="sharedObject"]').fill('Shared review evidence');
    await adjacent(page).locator('[data-rack-editor-apply]').click();
    assert.equal(await page.evaluate(id => window.rackFixture.studio.read().state.connections.find(row => row.id === id).sharedObject, connectionId), 'Shared review evidence');
    await adjacent(page).locator('[data-rack-editor-close]').click(); await expect(handoff).toBeFocused();
    await expect(rack.getByRole('tab', { name:'Handoffs', exact:true })).toHaveAttribute('aria-selected','true');
    await contained(page,width);
    if (engine === 'chromium') await rack.screenshot({path:resolve(captures, `shared-local-${width}.png`)});
  });

  test(`${engine}: Shared sessions keeps enabled focus and truthful local selection at ${width}px`, { timeout:60000 }, async t => {
    const page = await open(t, engine, width), rack = shared(page);
    await rack.locator('[data-shared-work="pairing"][data-shared-participant="leo"]').check();
    await sharedTrack(page, 'pairing').click();
    const selected = rack.locator('.studio-shared__selection');
    const person = selected.locator('[data-shared-person-row="leo"]');
    const up = person.getByRole('button', {name:'Move up: Researcher', exact:true});
    const down = person.getByRole('button', {name:'Move down: Researcher', exact:true});
    await up.click(); await expect(up).toBeFocused();
    await up.click(); await expect(up).toBeDisabled(); await expect(down).toBeFocused();
    assert.deepEqual(await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.id === 'pairing').personIds),
      ['leo','ari','jules']);
    await down.click(); await expect(down).toBeFocused();
    await down.click(); await expect(down).toBeDisabled(); await expect(up).toBeFocused();
    const people = rack.getByRole('tab', {name:'People', exact:true});
    const handoffs = rack.getByRole('tab', {name:'Handoffs', exact:true});
    await handoffs.click(); await expect(handoffs).toBeFocused();
    await sharedTrack(page, 'pairing').click();
    await expect(sharedTrack(page, 'pairing')).toHaveAttribute('aria-expanded','true');
    const handoff = rack.locator('[data-studio-record-kind="connection"]').first();
    await handoff.click();
    await expect(selected).toBeHidden();
    await expect(sharedTrack(page, 'pairing')).toHaveAttribute('aria-expanded','false');
    await expect(sharedTrack(page, 'pairing')).toHaveAttribute('aria-pressed','false');
    await expect(adjacent(page)).toBeVisible();
    await people.click(); await expect(people).toBeFocused(); await expect(adjacent(page)).toBeHidden();
    for (const key of ['Enter','Space']) {
      await handoffs.click(); await handoff.click(); await expect(adjacent(page)).toBeVisible();
      await people.focus(); await people.press(key);
      await expect(people).toBeFocused(); await expect(people).toHaveAttribute('aria-selected','true');
      await expect(adjacent(page)).toBeHidden();
    }
    await people.press('ArrowRight'); await expect(handoffs).toBeFocused();
    await expect(handoffs).toHaveAttribute('aria-selected','true');
    await contained(page,width);
  });

  test(`${engine}: Team planning creates visible teams and handoffs with shared Undo at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width), original = await bytes(page);
    const templates = root(page).locator('[data-connection-templates]');
    const rack = templates.locator('[data-template-rack]');
    const read = () => page.evaluate(() => ({ state:window.rackFixture.studio.read().state,
      undoCount:window.rackFixture.studio.readHistory().undoCount }));
    const before = await read();
    const addTeam = rack.locator('[data-studio-entry-key="delivery-add:design:team"]');
    const addHandoff = rack.locator('[data-studio-entry-key="delivery-add:maintenance:connection"]');
    const close = adjacent(page).locator('[data-rack-editor-close]');
    const undo = root(page).locator('[data-studio-undo]');

    await addTeam.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const controls = await addTeam.locator('xpath=..').evaluate(group => [...group.children].map(button => {
      const rect = button.getBoundingClientRect(), box = group.getBoundingClientRect(), style = getComputedStyle(button);
      return { width:rect.width, groupWidth:box.width, height:rect.height, color:style.color, shadow:style.boxShadow,
        plus:button.querySelector('[aria-hidden="true"]')?.textContent, name:button.getAttribute('aria-label') };
    }));
    assert.equal(controls.length, 2);
    for (const control of controls) {
      assert.ok(Math.abs(control.width-control.groupWidth) < 2 && control.height >= 44, 'each lane action spans the lane with a reachable target');
      assert.notEqual(control.color, 'rgba(0, 0, 0, 0)', 'both different creation jobs stay visible');
      assert.equal(control.shadow, 'none'); assert.equal(control.plus, '+'); assert.ok(control.name);
    }
    await addTeam.click();
    const teamCreation = await read(), originalTeamIds = new Set(before.state.teams.map(row => row.id));
    const teams = teamCreation.state.teams.filter(row => !originalTeamIds.has(row.id));
    assert.equal(teams.length, 1); assert.equal(teamCreation.undoCount, before.undoCount + 1);
    const team = teams[0], teamKey = rack.locator(`.studio-delivery__team-key[data-studio-record-id="${team.id}"]`);
    const teamRecord = rack.locator('[data-team-rack-record]');
    const teamName = teamRecord.locator('[data-team-rack-name]');
    await expect(teamRecord).toBeHidden();
    await expect(teamKey.locator('xpath=ancestor::section[@data-delivery-phase][1]')).toHaveAttribute('data-delivery-phase', 'design');
    await teamKey.click(); await expect(teamName).toHaveValue(team.label);
    await expect(shared(page)).toBeVisible();
    const membership = teamRecord.locator('[data-team-rack-member]').first();
    const memberPad = membership.locator('..').locator('..');
    const inactive = await skin(memberPad);
    await membership.check();
    await expect(teamRecord.locator('.studio-rack-header__saved')).toHaveText('Saved');
    assert.notEqual((await skin(memberPad)).backgroundColor, inactive.backgroundColor,
      'membership uses a distinct pressed sequencer face');
    await root(page).locator('[data-studio-undo]').click();
    await expect(membership).not.toBeChecked();
    await expect(adjacent(page)).toBeHidden();
    await teamRecord.locator('[data-template-action="team-back"]').click();
    await expect(teamKey).toHaveCount(1);
    await expect(teamKey).toContainText(team.label);
    const acceptedTeam = await bytes(page);
    await teamKey.click();
    await expect(teamName).toHaveValue(team.label);
    await teamRecord.locator('[data-template-action="team-back"]').click();
    assert.equal(await bytes(page), acceptedTeam, 'browsing the team retains the accepted record without another history entry');
    await undo.click();
    assert.equal(await bytes(page), original, 'creation Undo restores the preceding plan');
    await expect(teamKey).toHaveCount(0);

    await addHandoff.click();
    const handoffCreation = await read(), originalHandoffIds = new Set(before.state.connections.map(row => row.id));
    const handoffs = handoffCreation.state.connections.filter(row => !originalHandoffIds.has(row.id));
    assert.equal(handoffs.length, 1); assert.equal(handoffCreation.undoCount, before.undoCount + 1);
    const handoff = handoffs[0];
    assert.ok(before.state.teams.some(team => team.id === handoff.senderTeamId)
      && before.state.teams.some(team => team.id === handoff.receiverTeamId), 'the new handoff connects accepted teams');
    assert.notEqual(handoff.senderTeamId, handoff.receiverTeamId);
    const handoffKey = rack.locator(`.studio-delivery__handoff[data-studio-record-id="${handoff.id}"]`);
    await expect(handoffKey).toHaveCount(1); await expect(handoffKey).toContainText(handoff.sharedObject);
    await expect(adjacent(page)).toBeHidden();
    await expect(handoffKey.locator('xpath=ancestor::section[@data-delivery-phase][1]')).toHaveAttribute('data-delivery-phase', 'maintenance');
    await handoffKey.click();
    const sharedObject = adjacent(page).locator('[data-connection-configure] [name="sharedObject"]');
    await expect(sharedObject).toHaveValue(handoff.sharedObject);
    assert.equal(await adjacent(page).evaluate(node => node.parentElement.matches('[data-team-rack-editor]')), true);
    await contained(page, width);
    if (engine === 'chromium') await adjacent(page).screenshot({ path:resolve(captures, `new-handoff-in-rack-${width}.png`) });
    const acceptedHandoff = await bytes(page);
    await sharedObject.fill('Implementation plan for review');
    await adjacent(page).getByRole('button', { name:'Cancel changes', exact:true }).click();
    assert.equal(await bytes(page), acceptedHandoff, 'Cancel retains the newly created handoff');
    await expect(handoffKey).toBeFocused();
    await handoffKey.click(); await expect(sharedObject).toHaveValue(handoff.sharedObject);
    await undo.click();
    assert.equal(await bytes(page), original, 'Undo removes only the handoff addition');
    await expect(handoffKey).toHaveCount(0);

    await addHandoff.click();
    const next = (await read()).state.connections.find(row => !originalHandoffIds.has(row.id));
    const nextKey = rack.locator(`.studio-delivery__handoff[data-studio-record-id="${next.id}"]`);
    await nextKey.click();
    await sharedObject.fill('Reviewed work ready for the receiving team');
    await adjacent(page).locator('[data-connection-apply]').click();
    const edited = await read();
    assert.equal(edited.state.connections.find(row => row.id === next.id).sharedObject, 'Reviewed work ready for the receiving team');
    assert.equal(edited.undoCount, before.undoCount + 2, 'the later Apply accepts exactly one subsequent edit');
    await close.click(); await expect(nextKey).toBeFocused();
    await expect(nextKey).toContainText('Reviewed work ready for the receiving team');
    await nextKey.click(); await expect(sharedObject).toHaveValue('Reviewed work ready for the receiving team');
    await close.click(); await expect(nextKey).toBeFocused();
    assert.equal((await read()).state.connections.length, before.state.connections.length + 1, 'record inspection creates no extra handoff');
    const connection = adjacent(page).locator('[data-connection-configure]');
    await nextKey.click();
    await connection.locator('[data-connection-action="remove"]').click();
    await expect(adjacent(page)).toBeVisible();
    await expect(connection.locator('[data-connection-confirm]')).toBeVisible();
    await connection.getByRole('button', { name:'Cancel changes', exact:true }).click();
    await expect(adjacent(page)).toBeHidden(); await expect(nextKey).toBeFocused();
    assert.ok((await read()).state.connections.some(row => row.id === next.id), 'cancelling in-rack removal keeps the accepted handoff');
    await nextKey.click();
    await connection.locator('[data-connection-action="remove"]').click();
    await expect(adjacent(page)).toBeVisible();
    await connection.locator('[data-connection-apply]').click();
    await expect(adjacent(page)).toBeHidden();
    assert.equal((await read()).state.connections.some(row => row.id === next.id), false, 'confirmed in-rack removal removes the chosen handoff');

  });

  test(`${engine}: rack additions remain closed, fill their selected slot and retain Undo at ${width}px`, { timeout:60000 }, async t => {
    const page = await open(t, engine, width, false, width === 390);
    const read = () => page.evaluate(() => ({ state:window.rackFixture.studio.read().state,
      history:window.rackFixture.studio.readHistory().undoCount }));
    const before = await read(), original = await bytes(page);
    const lane = horizon(page).locator('[data-cadence-period="period-2"]');
    const add = lane.getByRole('button', { name:'Add a session in Sprint 2', exact:true });
    await add.click();
    const first = await read(), session = first.state.work.find(row => !before.state.work.some(old => old.id === row.id));
    assert.equal(session.label, 'New session 1'); assert.equal(first.history, before.history + 1);
    assert.deepEqual(first.state.scoreSettings.cadence.placements.filter(row => row.workId === session.id),
      [{ workId:session.id, occurrenceIndex:0, periodId:'period-2', subdivision:1 }]);
    await expect(adjacent(page)).toBeHidden();
    const clip = lane.locator(`[data-studio-session-id="${session.id}"]`);
    await expect(clip).toBeVisible();
    await clip.click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('New session 1');
    await configure(page).locator('[name="minutesPerSession"]').fill('45');
    await configure(page).locator('[data-action="cancel"]').click();
    assert.equal((await read()).state.work.find(row => row.id === session.id).minutesPerOccurrence, 30);
    await expect(adjacent(page)).toBeHidden();
    await add.click();
    assert.equal((await read()).state.work.at(-1).label, 'New session 2');
    await expect(adjacent(page)).toBeHidden();
    await root(page).locator('[data-studio-undo]').click();
    await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page), original);

    // Each temporal subdivision owns an empty target, including the far-right
    // week/month; insertion preserves every earlier occurrence and its identity.
    for (const basis of ['sprint', 'quarter']) {
      if (basis === 'quarter') await root(page).locator('[data-cadence-basis][value="quarter"]').check();
      const current = await read(), work = current.state.work.find(row => row.id === 'research');
      const subdivision = basis === 'quarter' ? 3 : 2;
      const target = horizon(page).locator(`[data-cadence-key="add-occurrence:${work.id}:period-4:${subdivision}"]`);
      await target.scrollIntoViewIfNeeded();
      const cell = target.locator('xpath=ancestor::td');
      const box = await target.boundingBox(), boundary = await cell.boundingBox();
      assert.ok(box.x + box.width > boundary.x + boundary.width * .8, 'the final subdivision reaches the right side of its cell');
      if (width === 1440) {
        await page.mouse.move(0, 0);
        assert.equal(await target.evaluate(node => getComputedStyle(node).color), 'rgba(0, 0, 0, 0)');
        await target.hover();
      } else {
        assert.notEqual(await target.evaluate(node => getComputedStyle(node).color), 'rgba(0, 0, 0, 0)', 'touch invitations remain visible');
      }
      if (engine === 'chromium') await cell.screenshot({ path:resolve(captures, `quiet-${basis}-addition-${width}.png`) });
      if (width === 390) await target.tap(); else await target.click();
      const added = await read();
      assert.equal(added.state.work.length, current.state.work.length);
      assert.equal(added.state.work.find(row => row.id === work.id).occurrences, work.occurrences + 1);
      assert.deepEqual(added.state.scoreSettings.cadence.placements.filter(row => row.workId === work.id), [
        ...current.state.scoreSettings.cadence.placements.filter(row => row.workId === work.id),
        { workId:work.id, occurrenceIndex:work.occurrences, periodId:'period-4', subdivision },
      ]);
      await expect(adjacent(page)).toBeHidden();
      await root(page).locator('[data-studio-undo]').click();
    }

    const accepted = await read(), researcher = accepted.state.people.find(row => row.label === 'Researcher');
    const withPerson = shared(page).locator(`[data-studio-entry-key="shared-session-add:${researcher.id}"]`);
    await withPerson.click();
    const personal = await read(), created = personal.state.work.find(row => !accepted.state.work.some(old => old.id === row.id));
    assert.equal(created.label, 'New session 1'); assert.deepEqual(created.personIds, [researcher.id]);
    await expect(adjacent(page)).toBeHidden();
    await sharedTrack(page, created.id).click();
    const selected = shared(page).locator('.studio-shared__selection');
    await expect(selected.locator('h4')).toHaveText(created.label);
    await expect(selected.locator('.studio-rack-header__owner')).toHaveText('Shared sessions · People');
    await selected.locator('[data-rack-editor-close]').click();
    await root(page).locator('[data-studio-undo]').click();
    assert.deepEqual((await read()).state, accepted.state);
    await contained(page, width);
  });

  test(`${engine}: handoff team creation retains its local draft and selects the new team at ${width}px`, { timeout:60000 }, async t => {
    const page = await open(t, engine, width), templates = root(page).locator('[data-connection-templates]');
    await shared(page).getByRole('tab', { name:'Handoffs', exact:true }).click();
    await shared(page).locator('[data-studio-record-kind="connection"]').first().click();
    const connection = adjacent(page).locator('[data-connection-configure]');
    await connection.locator('[name="sharedObject"]').fill('Prototype ready for review');
    const before = await bytes(page), ids = await page.evaluate(() => window.rackFixture.studio.read().state.teams.map(team => team.id));
    await connection.locator('[data-native-create="team"][data-native-return-field="senderTeamId"]').click();
    const created = await page.evaluate(ids => window.rackFixture.studio.read().state.teams.filter(team => !ids.includes(team.id)), ids);
    assert.equal(created.length,1);
    await expect(templates.locator('[data-team-rack-record]')).toHaveCount(0);
    await expect(shared(page)).toBeVisible(); await expect(connection).toBeVisible();
    await expect(connection.locator('[name="sharedObject"]')).toHaveValue('Prototype ready for review');
    await expect(connection.locator('[name="senderTeamId"]')).toHaveValue(created[0].id);
    await expect(connection.locator('[name="senderTeamId"]')).toBeFocused();
    await expect(connection.locator('[data-connection-action="review"]')).toBeHidden();
    await expect(adjacent(page).locator('.studio-rack-header__owner')).toHaveText('Shared sessions · Handoffs');
    await root(page).locator('[data-studio-undo]').click();
    assert.equal(await bytes(page),before,'Undo restores the accepted plan while the handoff proposal stays available');
    await expect(connection.locator('[name="sharedObject"]')).toHaveValue('Prototype ready for review');
    await contained(page,width);
  });
}
