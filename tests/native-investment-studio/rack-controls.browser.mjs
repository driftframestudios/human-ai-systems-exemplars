import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
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
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../..' + route), 'utf8');
  fixture = createNativeAboutFixture(source);
  complete = source.replace('data="../img/plot/about_prompt_conditions_cartography.svg"', 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});
const root = page => page.locator('[data-native-coordination]');
const horizon = page => root(page).locator('[data-score-projection]');
const shared = page => root(page).locator('[data-connection-templates] .studio-session-tracks');
const adjacent = page => root(page).locator('.studio-rack-editor');
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
    await expect(templates.locator('[data-team-rack-editor] [data-assembly-configure] [name="label"]')).toBeFocused();
    await expect(adjacent(page)).toHaveAttribute('data-rack-placement', 'inset');
    assert.equal(await page.evaluate(() => window.rackFixture.studio.read().state.arrangements.length), 1,
      'opening a starter team accepts its arrangement before canonical editing');
    const acceptedTeamId = await designTeam.locator('.studio-delivery__team-key').getAttribute('data-studio-record-id');
    assert.ok(acceptedTeamId && !acceptedTeamId.startsWith('proposal-'), 'the rack opens the accepted team identity');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(designTeam.locator('.studio-delivery__team-key')).toBeFocused();
    const person = designTeam.locator('[data-delivery-person]').first();
    await person.click();
    await expect(adjacent(page).locator('[data-person-configure] [name="ratePerHour"]')).toBeFocused();
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
    await adjacent(page).locator('[data-assembly-configure] [name="label"]').fill('Partner group for continuing support');
    await adjacent(page).locator('[data-assembly-apply]').click();
    await expect(maintenanceTeam.locator('.studio-delivery__team-key')).toContainText('Partner group for continuing support');
    await adjacent(page).locator('[data-rack-editor-close]').click();
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
    assert.notEqual(customized, accepted, 'starter acceptance and explicit Apply retain team and handoff changes');

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
    const recoveryId = await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.label === 'Diagnose and agree a response').id);
    await delivery.locator(`[data-delivery-session="${recoveryId}"]`).click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Diagnose and agree a response');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(planning).toBeVisible();
    await expect(delivery.locator(`[data-delivery-session="${recoveryId}"]`)).toBeFocused();
    assert.equal(await bytes(page), arranged, 'the new session opens its accepted record for later editing');

    await sharedTrack(page, 'review').click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Pilot decision review');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(planning).toBeVisible();
    await expect(sharedTrack(page, 'review')).toBeFocused();
    assert.equal(await bytes(page), arranged, 'accepted session inspection returns to the same Team planning section');
    await templates.locator('[data-reel-choice="tiger-team"]').click();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount), undoBefore + 1, 'the selected arrangement can be inspected again without another history entry');
    await templates.locator('[data-template-action="undo"]').click();
    assert.equal(await bytes(page), customized, 'Undo restores the preceding arrangement and its work together');
  });

  test(`${engine}: attached companions share rack records, retain proposals and return to the selected sprint at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width), accepted = await bytes(page);
    const score = root(page).locator('[data-native-score]'), screen = horizon(page).locator('.native-cadence__screen');
    const companions = horizon(page).locator('.studio-rack-companions');
    const people = companions.locator('[data-cadence-disclosure="people"]');
    const flow = companions.locator('[data-cadence-disclosure="flow"]');
    const inspector = score.locator('.native-score__inspector');
    const field = name => inspector.locator(`[data-cadence-field="${name}"]`);
    for (const drawer of [people, flow]) assert.equal(await drawer.evaluate(node => node.open), false);
    assert.equal(await companions.evaluate(node => node.previousElementSibling.matches('.native-cadence__screen')), true);
    const attached = await companions.boundingBox(), face = await screen.boundingBox();
    assert.ok(Math.abs(attached.x - face.x) < 1 && Math.abs(attached.width - face.width) < 1
      && Math.abs(attached.y - (face.y + face.height)) <= 1, 'the editorial disclosures share the rack edge');

    await horizon(page).locator('[data-cadence-key="track-period:period-2"]').click();
    const sprint = horizon(page).getByRole('heading', { name:'Sprint 2', exact:true });
    await expect(companions.locator('.studio-rack-companion__scope')).toHaveText(['Sprint 2', 'Sprint 2']);
    if (engine === 'chromium') await companions.screenshot({ path:resolve(captures, `attached-companions-${width}.png`) });
    const personKey = screen.locator('[data-cadence-key^="rack-person:"]').first();
    const personId = (await personKey.getAttribute('data-cadence-key')).slice('rack-person:'.length);
    const person = JSON.parse(accepted).people.find(row => row.id === personId);
    await personKey.click();
    await expect(personKey).toHaveAttribute('aria-expanded', 'true');
    await expect(field('availability-period')).toHaveValue('period-2');
    await field('availability-minutes').fill('240');
    await flow.locator(':scope > summary').click();
    await expect(personKey).toHaveAttribute('aria-expanded', 'false');
    await personKey.click();
    await expect(field('availability-minutes')).toHaveValue('240');
    await people.locator(':scope > summary').click();
    const availability = people.locator(`[data-cadence-key="availability:${personId}"]`);
    await availability.click();
    await expect(field('availability-minutes')).toHaveValue('240');
    await expect(field('availability-period')).toHaveValue('period-2');
    await inspector.getByRole('button', { name:'Open person settings', exact:true }).click();
    await expect(root(page).locator('[data-native-chapter="people"]')).toHaveAttribute('aria-selected', 'true');
    await expect(root(page).locator(`[data-team-roster] [data-person-id="${personId}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(root(page).locator('[data-person-configure] [name="ratePerHour"]')).toHaveValue((person.rateCentsPerHour / 100).toFixed(2));
    await root(page).locator('[data-native-return-action]').click();
    await expect(field('availability-minutes')).toHaveValue('240');
    await expect(field('availability-period')).toHaveValue('period-2');
    await expect(sprint).toHaveAttribute('aria-current', 'page');
    await inspector.getByRole('button', { name:'Cancel changes', exact:true }).click();
    await expect(availability).toBeFocused();
    assert.equal(await bytes(page), accepted, 'drawer navigation and the People round trip retain the accepted plan');

    const stageKey = screen.locator('[data-cadence-key^="rack-stage:"]').first();
    const stageId = (await stageKey.getAttribute('data-cadence-key')).slice('rack-stage:'.length);
    await stageKey.click();
    await field(`stage.${stageId}.label`).fill('Build and rehearse with operators');
    await flow.locator(':scope > summary').click();
    await expect(stageKey).toHaveAttribute('aria-expanded', 'false');
    await stageKey.click();
    await expect(field(`stage.${stageId}.label`)).toHaveValue('Build and rehearse with operators');
    const stage = flow.locator(`[data-cadence-key="stage:${stageId}"]`);
    await stage.click();
    await expect(field(`stage.${stageId}.label`)).toHaveValue('Build and rehearse with operators');
    await expect(inspector.getByRole('button', { name:'Add decision here', exact:true })).toBeVisible();
    await expect(inspector.getByRole('button', { name:'Add delay here', exact:true })).toBeVisible();
    if (engine === 'chromium') await companions.screenshot({ path:resolve(captures, `attached-companions-open-${width}.png`) });
    await inspector.getByRole('button', { name:'Cancel changes', exact:true }).click();
    await expect(stage).toBeFocused(); await expect(sprint).toHaveAttribute('aria-current', 'page');

    await horizon(page).locator('[data-cadence-key="plan-overview"]').click();
    await horizon(page).getByRole('button', { name:'Try a later review', exact:true }).click();
    const sameRecord = async (rackKey, drawerKey, title) => {
      await screen.locator(rackKey).first().click();
      await expect(inspector.getByRole('heading', { name:title, exact:true })).toBeVisible();
      const readFields = () => inspector.locator('[data-cadence-field]').evaluateAll(nodes => nodes.map(node => [node.dataset.cadenceField, node.value]));
      const values = await readFields();
      await flow.locator(drawerKey).first().click();
      assert.deepEqual(await readFields(), values, 'rack and editorial entries inspect the same record');
    };
    await sameRecord('[data-cadence-key^="track-handoff:"]', '[data-cadence-key^="handoff:"]', 'Inspect handoff');
    await sameRecord('[data-cadence-key^="decision:"]', '[data-cadence-key^="decision:"]', 'Inspect decision');
    await sameRecord('[data-cadence-key^="delay:"]', '[data-cadence-key^="delay:"]', 'Inspect delay');
    await inspector.getByRole('button', { name:'Cancel changes', exact:true }).click();
    assert.equal(await bytes(page), accepted, 'relationship inspection preserves the accepted plan');
    await contained(page, width);
  });

  test(`${engine}: in-rack session editing retains draft, scope and return across both racks at ${width}px`, { timeout: 90000 }, async t => {
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
    await expect(adjacent(page).locator('.studio-rack-editor__origin')).toContainText('Coordination horizon');
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Prototype pairing');
    const placement = configure(page).locator(`[data-session-occurrence="${occurrence}"]`);
    await expect(placement).toBeFocused();
    await expect.poll(() => placement.evaluate(node => {
      const box = node.getBoundingClientRect(), nav = document.querySelector('.nav__top--sticky')?.getBoundingClientRect();
      return box.top >= (nav?.bottom ?? 0) && box.bottom <= innerHeight;
    })).toBe(true);
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
    const participant = shared(page).locator('[data-session-track="pairing"] .studio-session-tracks__pad').first();
    await participant.click();
    await expect(adjacent(page)).toBeVisible(); await expect(minutes).toHaveValue('045');
    await expect(adjacent(page).locator('.studio-rack-editor__origin')).toContainText('Team planning');
    assert.equal(await page.evaluate(() => window.rackFixture.editing.session.read().draft.token === window.rackFixture.sessionToken), true,
      'cross-rack inspection retains the same session lease');
    assert.equal(await adjacent(page).evaluate(node => node.parentElement.matches('[data-team-rack-editor]')), true,
      'participation inspection uses the Team planning receiver');
    await receiverReading(page, 'pairing', true);
    await adjacent(page).screenshot({ path:resolve(captures, `${engine}-adjacent-shared-session-${width}.png`) });
    await participantMovement(page, configure(page).locator('[data-native-session-members]'));
    await sharedTrack(page, 'research').click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue('Research synthesis');
    await receiverReading(page, 'research', true);
    await sharedTrack(page, 'pairing').click();
    await expect(minutes).toHaveValue('045');
    await configure(page).locator('[data-action="cancel"]').click();
    await expect(adjacent(page)).toBeHidden(); await expect(sharedTrack(page, 'pairing')).toBeFocused();
    await expect.poll(() => sharedTrack(page, 'pairing').evaluate(node => {
      const box = node.getBoundingClientRect(), nav = document.querySelector('.nav__top--sticky')?.getBoundingClientRect();
      return box.top >= (nav?.bottom ?? 0) && box.bottom <= innerHeight;
    })).toBe(true);
    assert.equal(await bytes(page), accepted, 'Cancel discards the session proposal');
    await participant.click();
    await expect(minutes).toHaveValue('0');
    const undoBefore = await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount);
    await minutes.fill('45');
    await configure(page).locator('[data-action="apply"]').click();
    await expect(adjacent(page)).toBeVisible();
    assert.equal(await page.evaluate(() => window.rackFixture.studio.read().state.work.find(row => row.id === 'pairing').minutesPerOccurrence), 105);
    assert.equal(await page.evaluate(() => window.rackFixture.studio.readHistory().undoCount), undoBefore + 1, 'Apply accepts through the existing owner once');
    await adjacent(page).locator('[data-rack-editor-close]').click(); await expect(participant).toBeFocused();
    await expect(currentPeriod).toHaveAttribute('aria-current', 'page');
    await receiverReading(page, 'pairing', false);
    assert.deepEqual(await skin(track(page, 'pairing')), await skin(sharedTrack(page, 'pairing')), 'both readings share the session key treatment');

    const connections = root(page).locator('[data-native-connection-view]');
    await connections.locator('.studio-accepted-connections > summary').click();
    await connections.locator('button[data-connection-select="scope"]').click();
    const support = connections.getByRole('button', { name:'Inspect Research synthesis', exact:true });
    const entryKey = await support.getAttribute('data-studio-entry-key');
    assert.ok(entryKey, 'supporting work keeps a stable connection-specific entry');
    await support.click();
    await configure(page).locator('[name="label"]').fill('Research synthesis with operating context');
    await configure(page).locator('[data-action="apply"]').click();
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(connections.locator(`[data-studio-entry-key="${entryKey}"]`)).toBeFocused();
    await expect(connections.locator('button[data-connection-select="scope"]')).toHaveAttribute('aria-current', 'true');
    await expect(connections.locator(`[data-studio-entry-key="${entryKey}"]`)).toHaveText('Inspect Research synthesis with operating context');
    await contained(page, width);
  });

  test(`${engine}: Team planning creates visible teams and handoffs with local Undo at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width), original = await bytes(page);
    const templates = root(page).locator('[data-connection-templates]');
    const rack = templates.locator('[data-template-rack]');
    const read = () => page.evaluate(() => ({ state:window.rackFixture.studio.read().state,
      undoCount:window.rackFixture.studio.readHistory().undoCount }));
    const before = await read();
    const addTeam = rack.locator('[data-template-action="create-team"]');
    const addHandoff = rack.locator('[data-template-action="create-connection"]');
    const close = adjacent(page).locator('[data-rack-editor-close]');
    const undo = root(page).locator('[data-rack-creation-undo]');

    await addTeam.click();
    const teamCreation = await read(), originalTeamIds = new Set(before.state.teams.map(row => row.id));
    const teams = teamCreation.state.teams.filter(row => !originalTeamIds.has(row.id));
    assert.equal(teams.length, 1); assert.equal(teamCreation.undoCount, before.undoCount + 1);
    const team = teams[0], teamKey = rack.locator(`.studio-delivery__team-key[data-studio-record-id="${team.id}"]`);
    await expect(teamKey).toHaveCount(1);
    await expect(teamKey).toContainText(team.label);
    await expect(adjacent(page)).toHaveAttribute('data-rack-placement', 'inset');
    const teamName = adjacent(page).locator('[data-assembly-configure] [name="label"]');
    await expect(teamName).toHaveValue(team.label);
    const acceptedTeam = await bytes(page);
    await teamName.fill('Review partners');
    await adjacent(page).locator('[data-assembly-cancel]').click();
    assert.equal(await bytes(page), acceptedTeam, 'Cancel keeps the newly accepted team while discarding the later edit');
    await expect(addTeam).toBeFocused();
    await teamKey.click();
    await expect(teamName).toHaveValue(team.label);
    await undo.click();
    assert.equal(await bytes(page), original, 'creation Undo restores the preceding plan');
    await expect(teamKey).toHaveCount(0); await expect(addTeam).toBeFocused();

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
    const sharedObject = adjacent(page).locator('[data-connection-configure] [name="sharedObject"]');
    await expect(sharedObject).toHaveValue(handoff.sharedObject);
    assert.equal(await adjacent(page).evaluate(node => node.parentElement.matches('[data-team-rack-editor]')), true);
    await contained(page, width);
    if (engine === 'chromium') await adjacent(page).screenshot({ path:resolve(captures, `new-handoff-in-rack-${width}.png`) });
    const acceptedHandoff = await bytes(page);
    await sharedObject.fill('Implementation plan for review');
    await adjacent(page).getByRole('button', { name:'Cancel changes', exact:true }).click();
    assert.equal(await bytes(page), acceptedHandoff, 'Cancel retains the newly created handoff');
    await expect(addHandoff).toBeFocused();
    await handoffKey.click(); await expect(sharedObject).toHaveValue(handoff.sharedObject);
    await undo.click();
    assert.equal(await bytes(page), original, 'Undo removes only the handoff addition');
    await expect(handoffKey).toHaveCount(0); await expect(addHandoff).toBeFocused();

    await addHandoff.click();
    const next = (await read()).state.connections.find(row => !originalHandoffIds.has(row.id));
    await sharedObject.fill('Reviewed work ready for the receiving team');
    await adjacent(page).locator('[data-connection-apply]').click();
    const edited = await read();
    assert.equal(edited.state.connections.find(row => row.id === next.id).sharedObject, 'Reviewed work ready for the receiving team');
    assert.equal(edited.undoCount, before.undoCount + 2, 'the later Apply accepts exactly one subsequent edit');
    await close.click(); await expect(addHandoff).toBeFocused();
    const nextKey = rack.locator(`.studio-delivery__handoff[data-studio-record-id="${next.id}"]`);
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

  test(`${engine}: rack session creation accepts once and separates creation Undo from later edits at ${width}px`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, width, false, width === 390), original = await bytes(page);
    const readPlan = () => page.evaluate(() => {
      const state = window.rackFixture.studio.read().state;
      return { work:state.work, placements:state.scoreSettings.cadence.placements,
        undoCount:window.rackFixture.studio.readHistory().undoCount };
    });
    const before = await readPlan(), originalIds = new Set(before.work.map(work => work.id));
    await page.evaluate(() => { window.rackFixture.sessionNode = document.querySelector('[data-native-configure]'); });
    await horizon(page).locator('[data-cadence-key="track-period:period-2"]').click();
    const currentPeriod = horizon(page).getByRole('heading', { name:'Sprint 2', exact:true });
    const add = horizon(page).locator('[data-cadence-key="add-session:period-2:1"]');
    await add.click();
    const first = await readPlan(), created = first.work.filter(work => !originalIds.has(work.id));
    assert.equal(created.length, 1, 'one Add activation publishes one session');
    const session = created[0];
    assert.ok(session.label.trim() && session.personIds.length > 0, 'authored defaults create visible, populated work');
    assert.deepEqual({ minutes:session.minutesPerOccurrence, occurrences:session.occurrences,
      funding:session.funding, status:session.status },
    { minutes:30, occurrences:1, funding:'additional', status:'planned' });
    assert.equal(first.undoCount, before.undoCount + 1, 'creation contributes one accepted history entry');
    assert.deepEqual(first.placements.filter(row => row.workId === session.id), [
      { workId:session.id, occurrenceIndex:0, periodId:'period-2', subdivision:1 },
    ]);
    await expect(currentPeriod).toHaveAttribute('aria-current', 'page');
    await expect(adjacent(page)).toHaveAttribute('data-rack-placement', 'inset');
    await expect(configure(page).locator('[name="label"]')).toHaveValue(session.label);
    assert.equal(await configure(page).evaluate(node => node === window.rackFixture.sessionNode), true);
    await contained(page, width);
    if (engine === 'chromium') await adjacent(page).locator('.studio-rack-editor__heading')
      .screenshot({ path:resolve(captures, `session-creation-heading-${width}.png`) });
    const acceptedCreation = await bytes(page);
    await configure(page).locator('[name="minutesPerSession"]').fill('45');
    await configure(page).locator('[data-action="cancel"]').click();
    assert.equal(await bytes(page), acceptedCreation, 'Cancel discards later edits and retains the created session');
    await expect(adjacent(page)).toBeHidden(); await expect(add).toBeFocused();

    await track(page, session.id).click();
    await expect(configure(page).locator('[name="minutesPerSession"]')).toHaveValue('30');
    await root(page).locator('[data-rack-creation-undo]').click();
    assert.equal(await bytes(page), original, 'local creation Undo restores the preceding accepted plan');
    await expect(adjacent(page)).toBeHidden();
    await expect(track(page, session.id)).toHaveCount(0);
    await expect(add).toBeFocused();
    await expect(currentPeriod).toHaveAttribute('aria-current', 'page');

    await add.click();
    const second = (await readPlan()).work.find(work => !originalIds.has(work.id));
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(add).toBeFocused();
    await add.click();
    const repeated = await readPlan(), added = repeated.work.filter(work => !originalIds.has(work.id));
    assert.equal(added.length, 2); assert.equal(new Set(added.map(work => work.id)).size, 2,
      'each deliberate Add creates a distinct accepted session');
    assert.equal(repeated.undoCount, before.undoCount + 2);
    const latest = added.find(work => work.id !== second.id);
    await configure(page).locator('[name="minutesPerSession"]').fill('45');
    await configure(page).locator('[data-action="apply"]').click();
    const edited = await readPlan();
    assert.equal(edited.work.find(work => work.id === latest.id).minutesPerOccurrence, 45);
    assert.equal(edited.undoCount, repeated.undoCount + 1, 'a later Apply accepts its edit once');
    await adjacent(page).locator('[data-rack-editor-close]').click();

    const addShared = shared(page).getByRole('button', { name:'Add session', exact:true });
    await addShared.click();
    const teamPlan = await readPlan(), previousIds = new Set(edited.work.map(work => work.id));
    const teamSessions = teamPlan.work.filter(work => !previousIds.has(work.id));
    assert.equal(teamSessions.length, 1);
    assert.equal(teamPlan.undoCount, edited.undoCount + 1);
    assert.deepEqual(teamPlan.placements.filter(row => row.workId === teamSessions[0].id), [],
      'unscoped Team planning creation leaves its occurrence awaiting placement');
    await expect(adjacent(page)).toHaveAttribute('data-rack-placement', 'inset');
    await expect(configure(page).locator('[name="label"]')).toHaveValue(teamSessions[0].label);
    assert.equal(await configure(page).evaluate(node => node === window.rackFixture.sessionNode), true);
    await expect(configure(page).locator('[data-placement-index="0"][data-placement-field="periodId"]')).toHaveValue('');
    await adjacent(page).locator('[data-rack-editor-close]').click();
    await expect(addShared).toBeFocused();

    const acceptedTeam = await bytes(page);
    const existingPad = shared(page).locator('[data-studio-session-person][data-studio-session-id]').first();
    const existingId = await existingPad.getAttribute('data-studio-session-id');
    await existingPad.click();
    await expect(configure(page).locator('[name="label"]')).toHaveValue(teamPlan.work.find(work => work.id === existingId).label);
    assert.equal(await bytes(page), acceptedTeam, 'an existing participation pad inspects its session and creates no work');
    await adjacent(page).locator('[data-rack-editor-close]').click();

    await horizon(page).locator('[data-cadence-key="plan-overview"]').click();
    await root(page).getByRole('button', { name:'Two-quarter rollout', exact:true }).click();
    const quarterPlan = await readPlan(), quarterBytes = await bytes(page);
    const quarterIds = new Set(quarterPlan.work.map(work => work.id));
    await horizon(page).locator('[data-cadence-key="track-period:period-2"]').click();
    const quarter = horizon(page).getByRole('heading', { name:'Quarter 2', exact:true });
    const newMonth = horizon(page).locator('[data-cadence-key="new-session:period-2:3"]');
    await expect(newMonth).toHaveAccessibleName('Add a session in Quarter 2, Month 3');
    if (width === 1440) {
      await newMonth.hover();
      assert.equal(await bytes(page), quarterBytes, 'revealing a ghost creation pad leaves accepted work unchanged');
    }
    await newMonth.focus();
    if (engine === 'chromium') {
      await newMonth.evaluate(node => node.scrollIntoView({ block:'center', inline:'center', behavior:'instant' }));
      await (width === 390 ? page : horizon(page).locator('.studio-rack-create-row'))
        .screenshot({ path:resolve(captures, `quarter-creation-row-${width}.png`) });
    }
    await page.keyboard.press('Enter');
    const monthPlan = await readPlan(), monthSessions = monthPlan.work.filter(work => !quarterIds.has(work.id));
    assert.equal(monthSessions.length, 1, 'one keyboard activation creates one session from the empty rack row');
    assert.equal(monthPlan.undoCount, quarterPlan.undoCount + 1);
    assert.deepEqual(monthPlan.placements.filter(row => row.workId === monthSessions[0].id), [
      { workId:monthSessions[0].id, occurrenceIndex:0, periodId:'period-2', subdivision:3 },
    ]);
    await expect(quarter).toHaveAttribute('aria-current', 'page');
    await expect(configure(page).locator('[name="label"]')).toHaveValue(monthSessions[0].label);
    await root(page).locator('[data-rack-creation-undo]').click();
    assert.equal(await bytes(page), quarterBytes);
    await expect(newMonth).toBeFocused();
    await expect(quarter).toHaveAttribute('aria-current', 'page');

    const researcher = await page.evaluate(() => window.rackFixture.studio.read().state.people.find(person => person.label === 'Researcher'));
    const newWithPerson = shared(page).locator(`[data-studio-entry-key="shared-session-add:${researcher.id}"]`);
    await expect(newWithPerson).toHaveAccessibleName('Add a session with Researcher');
    if (width === 1440) {
      await newWithPerson.hover();
      assert.equal(await bytes(page), quarterBytes, 'hovering a person-context creation pad leaves accepted work unchanged');
    } else await newWithPerson.scrollIntoViewIfNeeded();
    if (engine === 'chromium') {
      await newWithPerson.evaluate(node => node.scrollIntoView({ block:'center', inline:'center', behavior:'instant' }));
      await (width === 390 ? page : shared(page).locator('.studio-rack-create-row'))
        .screenshot({ path:resolve(captures, `people-creation-row-${width}.png`) });
    }
    if (width === 390) await newWithPerson.tap(); else await newWithPerson.click();
    const personalPlan = await readPlan(), personalSessions = personalPlan.work.filter(work => !quarterIds.has(work.id));
    assert.equal(personalSessions.length, 1);
    assert.deepEqual(personalSessions[0].personIds, [researcher.id], 'the creation pad uses its named accepted person');
    assert.equal(personalPlan.undoCount, quarterPlan.undoCount + 1);
    assert.deepEqual(personalPlan.placements.filter(row => row.workId === personalSessions[0].id), []);
    await expect(adjacent(page)).toHaveAttribute('data-rack-placement', 'inset');
    await expect(configure(page).locator(`[data-session-person="${researcher.id}"]`)).toBeChecked();
    await root(page).locator('[data-rack-creation-undo]').click();
    assert.equal(await bytes(page), quarterBytes);
    await expect(newWithPerson).toBeFocused();
    await contained(page, width);
  });
}
