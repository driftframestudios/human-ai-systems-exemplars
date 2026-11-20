import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-tape-library');
let server, fixture;
registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  fixture = createNativeAboutFixture(await readFile(resolve(import.meta.dirname, '../..' + route), 'utf8'));
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});
const root = page => page.locator('[data-native-coordination]');
const score = page => root(page).locator('[data-native-score]');
const shelf = page => score(page).locator('[data-score-projection]');
const action = (page, name) => score(page).locator(`[data-score-action="${name}"]`);
const bytes = page => page.evaluate(() => window.tapeFixture.studio.exportText());
const undo = page => root(page).locator('[data-studio-undo]').click();

async function open(t, engine, { groupedBasis = null, unplaced = false } = {}) {
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
      return request.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' });
  });
  await page.goto(server.origin + route); await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  await page.evaluate(async ({ groupedBasis, unplaced }) => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
    const element = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(element).dispose();
    const plan = createShowcasePlan();
    if (groupedBasis) {
      const { createCadence } = await import('/collaboration/native-investment-studio/cadence.mjs');
      const { copyWorkSession } = await import('/collaboration/native-investment-studio/work-sessions.mjs');
      const work = plan.work.find(row => row.id === 'research');
      work.occurrences = 6; work.funding = 'allocated'; work.status = 'planned';
      work.sessionOverrides = [
        { occurrenceIndex: 2, ...copyWorkSession(work), label: 'Extended synthesis', funding: 'additional' },
        { occurrenceIndex: 3, ...copyWorkSession(work), label: 'Deferred synthesis', funding: 'additional', status: 'paused' },
      ];
      const cadence = createCadence(groupedBasis, 4);
      cadence.placements = plan.scoreSettings.cadence.placements.filter(row => row.workId !== work.id);
      for (const [occurrenceIndex, period, subdivision] of [[0, 2, 1], [1, 3, 1], [2, 3, 1], [3, 3, 2], [4, 3, 2], [5, 4, 1]]) {
        cadence.placements.push({ workId: work.id, occurrenceIndex, periodId: `period-${period}`, subdivision });
      }
      plan.scoreSettings.cadence = cadence;
    }
    if (unplaced) {
      const work = plan.work.find(row => row.id === 'research');
      work.occurrences = 2;
      plan.scoreSettings.cadence.placements = plan.scoreSettings.cadence.placements.filter(row => row.workId !== work.id);
    }
    const studio = createStudio(plan);
    window.tapeFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
  }, { groupedBasis, unplaced });
  return page;
}

async function removeTape(page, id) {
  await shelf(page).locator(`[data-studio-plan-id="${id}"]`).click();
  await action(page, 'remove-plan').click();
  await action(page, 'confirm-plan-removal').click();
}

for (const engine of names) test(`${engine}: removing tapes preserves recovery and an empty library can load or create plans`, async t => {
  const page = await open(t, engine), originalBytes = await bytes(page), original = JSON.parse(originalBytes);
  await expect(shelf(page).locator('.native-cadence__screen')).toHaveAttribute('data-loaded-plan', '');
  await expect(shelf(page).getByRole('button', { name: 'All plans', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(action(page, 'remove-plan')).toBeDisabled();
  await shelf(page).locator('[data-studio-plan-id="research"]').click();
  await action(page, 'remove-plan').click();
  await expect(score(page).locator('.native-score__removal')).toContainText('Remove Research synthesis and its sessions?');
  await action(page, 'cancel-plan-removal').click();
  assert.equal(await bytes(page), originalBytes, 'Cancel preserves accepted work and its references');
  await expect(action(page, 'remove-plan')).toBeFocused();
  await action(page, 'remove-plan').click(); await action(page, 'confirm-plan-removal').click();
  const removed = JSON.parse(await bytes(page));
  assert.deepEqual(removed.work, original.work.filter(work => work.id !== 'research'));
  assert.deepEqual(removed.scoreSettings.cadence.placements,
    original.scoreSettings.cadence.placements.filter(row => row.workId !== 'research'));
  assert.deepEqual(removed.connections, original.connections.map(row => ({ ...row, workIds: row.workIds.filter(id => id !== 'research') })));
  assert.deepEqual(removed.scoreSettings.dependencies, original.scoreSettings.dependencies.filter(row => row.fromWorkId !== 'research' && row.toWorkId !== 'research'));
  assert.deepEqual(removed.people, original.people); assert.deepEqual(removed.teams, original.teams);
  await expect(shelf(page).locator('[data-studio-plan-id="research"]')).toHaveCount(0);
  await undo(page); assert.equal(await bytes(page), originalBytes, 'Undo restores the removed tape and every link exactly');

  for (const work of original.work) await removeTape(page, work.id);
  const emptyBytes = await bytes(page), empty = JSON.parse(emptyBytes);
  assert.deepEqual(empty.work, []); assert.deepEqual(empty.scoreSettings.cadence.placements, []);
  const starters = shelf(page).getByRole('region', { name: 'Choose a working pattern', exact: true });
  await expect(starters).toBeVisible();
  await expect(starters.locator('.native-reel')).toBeVisible();
  await expect(shelf(page).locator('[data-studio-plan-id]')).toHaveCount(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const bounds = await starters.evaluate(element => {
      const box = element.getBoundingClientRect();
      return { page: document.documentElement.scrollWidth, left: box.left, right: box.right };
    });
    assert.ok(bounds.page <= width + 1 && bounds.left >= 0 && bounds.right <= width + 1, JSON.stringify(bounds));
    await starters.screenshot({ path: resolve(captures, `${engine}-empty-library-${width}.png`) });
  }
  await starters.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(starters).toHaveAttribute('data-starter', 'design');
  assert.equal(await bytes(page), emptyBytes, 'reel selection previews the pattern without changing accepted work');
  await starters.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(starters).toHaveAttribute('data-starter', 'plan');
  await starters.getByRole('button', { name: 'Load these plans', exact: true }).click();
  const loaded = JSON.parse(await bytes(page));
  assert.deepEqual(loaded.work.map(work => work.label), ['Frame the outcome', 'Agree on priorities', 'Review scope']);
  assert.equal(loaded.scoreSettings.cadence.placements.length, 4);
  assert.deepEqual(loaded.people, empty.people); assert.deepEqual(loaded.teams, empty.teams);
  await expect(starters).toBeHidden(); await expect(shelf(page).locator('[data-studio-plan-id]')).toHaveCount(3);
  await undo(page); assert.equal(await bytes(page), emptyBytes, 'one Undo returns the entire loaded pattern to the empty shelf');
  await expect(starters).toBeVisible();
  await starters.getByRole('button', { name: 'Create a plan', exact: true }).click();
  assert.equal(JSON.parse(await bytes(page)).work.length, 1, 'free creation remains available from the empty shelf');
  await expect(starters).toBeHidden(); await expect(shelf(page).locator('[data-studio-plan-id]')).toHaveCount(1);
  await undo(page); assert.equal(await bytes(page), emptyBytes);
});

for (const engine of names) test(`${engine}: All plans and sequential browsing preserve period scope and accepted work`, async t => {
  const page = await open(t, engine), originalBytes = await bytes(page), original = JSON.parse(originalBytes);
  const rack = shelf(page), all = rack.getByRole('button', { name: 'All plans', exact: true });
  const previous = rack.getByRole('button', { name: 'Previous plan', exact: true });
  const next = rack.getByRole('button', { name: 'Next plan', exact: true });
  const screen = rack.locator('.native-cadence__screen');
  const aggregate = rack.locator('[data-studio-all-plans]');
  await expect(aggregate).toHaveAttribute('aria-pressed', 'true');
  await expect(aggregate).toContainText('600 min');
  await expect(aggregate).toContainText('12 sessions');
  assert.equal(await rack.locator('.studio-tape-key').first().getAttribute('data-studio-all-plans'), '');
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(previous).toHaveAttribute('aria-disabled', 'true');
  await rack.locator('[data-cadence-key="period:period-1"]').click();
  for (const work of original.work) {
    await next.click();
    await expect(screen).toHaveAttribute('data-loaded-plan', work.id);
    await expect(rack.locator(`[data-studio-plan-id="${work.id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(rack.getByRole('button', { name: 'Plan overview', exact: true })).toBeVisible();
    await expect(next).toBeFocused();
  }
  await expect(next).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(screen).toHaveAttribute('data-loaded-plan', original.work.at(-1).id);
  await previous.click();
  await expect(screen).toHaveAttribute('data-loaded-plan', original.work.at(-2).id);
  await rack.locator(`[data-studio-plan-id="${original.work[0].id}"]`).click();
  await expect(previous).toHaveAttribute('aria-disabled', 'true');
  await aggregate.click();
  await expect(screen).toHaveAttribute('data-loaded-plan', '');
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(rack.getByRole('button', { name: 'Plan overview', exact: true })).toBeVisible();
  await all.click();
  assert.equal(await bytes(page), originalBytes, 'scope changes leave accepted work and placement untouched');
  await expect(root(page).locator('[data-studio-undo]')).toBeDisabled();
  await mkdir('.visual-runs/939', { recursive: true });
  await rack.locator('.studio-tape-library').screenshot({ path: `.visual-runs/939/${engine}-all-shelf.png` });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const control of [all, previous, next]) {
      const box = await control.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1 && box.height >= 32);
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await next.scrollIntoViewIfNeeded();
  for (const work of original.work) {
    const pageY = await page.evaluate(() => scrollY);
    await next.click();
    const selected = rack.locator(`[data-studio-plan-id="${work.id}"]`);
    await expect.poll(() => selected.evaluate(item => {
      const shelf = item.closest('.studio-tape-shelf'), a = item.getBoundingClientRect(), b = shelf.getBoundingClientRect();
      return a.left >= b.left - 2 && a.right <= b.right + 2;
    })).toBe(true);
    await expect(next).toBeFocused();
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - pageY) < 2, 'pagination moves the shelf without moving the page');
  }
  await mkdir('.visual-runs/939', { recursive: true });
  await rack.locator('.studio-tape-library').screenshot({ path: `.visual-runs/939/${engine}-phone-shelf.png` });
  await rack.locator('.studio-plan-navigation').screenshot({ path: `.visual-runs/939/${engine}-phone-rail.png` });
  assert.equal(await bytes(page), originalBytes);
});

for (const engine of names) test(`${engine}: individual tape sessions keep their own settings through placement, removal and view changes`, async t => {
  const page = await open(t, engine);
  const original = JSON.parse(await bytes(page));
  const research = original.work.find(row => row.id === 'research');
  const periodIds = original.scoreSettings.cadence.periods.map(period => period.id);
  const rack = root(page).locator('[data-native-configure]');
  const chooseTape = id => shelf(page).locator(`[data-studio-plan-id="${id}"]`).click();
  const pad = index => shelf(page).locator(`[data-cadence-key="pad:research:${index}"]`);
  const append = (period, week) => shelf(page).locator(`[data-cadence-key="add-occurrence:research:${period}:${week}"]`).click();
  await chooseTape('research');
  await append(periodIds[3], 1);
  const first = research.occurrences;
  await pad(first).click();
  await expect(rack).toContainText(`Settings for session ${first + 1}.`);
  await rack.locator('[name="label"]').fill('Sprint evidence review');
  await rack.locator('[name="hoursPerSession"]').fill('0');
  await rack.locator('[name="minutesPerSession"]').fill('45');
  await rack.locator('[name="status"][value="paused"]').check();
  await rack.locator('[name="funding"][value="additional"]').check();
  await rack.locator(`[data-session-person="${research.personIds[0]}"]`).uncheck();
  await rack.locator('[data-action="apply"]').click();
  const edited = JSON.parse(await bytes(page)), editedWork = edited.work.find(row => row.id === research.id);
  assert.equal(editedWork.occurrences, first + 1);
  assert.deepEqual(editedWork.sessionOverrides, [{ occurrenceIndex: first, label: 'Sprint evidence review',
    teamId: research.teamId, personIds: research.personIds.slice(1), minutesPerOccurrence: 45, funding: 'additional', status: 'paused' }]);
  for (const field of ['label', 'teamId', 'personIds', 'minutesPerOccurrence', 'funding', 'status'])
    assert.deepEqual(editedWork[field], research[field], `${field} remains the tape default`);
  assert.deepEqual(edited.work.filter(row => row.id !== 'research'), original.work.filter(row => row.id !== 'research'));
  await expect(pad(first)).toHaveAttribute('data-active', 'false');
  await expect(pad(0)).toHaveAttribute('data-active', 'true');
  await rack.locator('[data-session-occurrence="0"]').click();
  await expect(rack).toContainText('Settings for session 1.');
  await expect(pad(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(pad(first)).toHaveAttribute('aria-pressed', 'false');
  await expect(rack.locator('[name="label"]')).toHaveValue(research.label);
  await expect(rack.locator('[name="status"][value="planned"]')).toBeChecked();
  await chooseTape('rehearsal');
  await chooseTape('research');
  await append(periodIds[2], 2);
  const second = first + 1;
  await pad(second).click();
  await expect(rack.locator('[name="status"][value="planned"]')).toBeChecked();
  await expect(rack.locator('[name="minutesPerSession"]')).toHaveValue('0');
  const choices = rack.locator('[data-session-occurrences]');
  await choices.getByRole('radio', { name: original.scoreSettings.cadence.periods[1].label, exact: true }).check();
  await choices.getByRole('radio', { name: 'Week 1', exact: true }).check();
  await rack.locator('[data-action="apply"]').click();
  const beforeRemoval = await bytes(page), placed = JSON.parse(beforeRemoval);
  assert.deepEqual(placed.scoreSettings.cadence.placements.find(row => row.workId === 'research' && row.occurrenceIndex === second),
    { workId: 'research', occurrenceIndex: second, periodId: periodIds[1], subdivision: 1 });
  assert.deepEqual(placed.scoreSettings.cadence.placements.find(row => row.workId === 'research' && row.occurrenceIndex === first),
    { workId: 'research', occurrenceIndex: first, periodId: periodIds[3], subdivision: 1 });
  await pad(first).click();
  await choices.getByRole('button', { name: `Remove session ${first + 1}`, exact: true }).click();
  const removed = JSON.parse(await bytes(page)), remaining = removed.work.find(row => row.id === 'research');
  assert.equal(remaining.occurrences, second);
  assert.equal(remaining.sessionOverrides, undefined);
  assert.deepEqual(removed.scoreSettings.cadence.placements.find(row => row.workId === 'research' && row.occurrenceIndex === first),
    { workId: 'research', occurrenceIndex: first, periodId: periodIds[1], subdivision: 1 });
  await undo(page);
  assert.equal(await bytes(page), beforeRemoval, 'Undo restores settings and both placements exactly');
  await shelf(page).getByRole('button', { name: 'All plans', exact: true }).click();
  await expect(pad(first)).toHaveAttribute('data-active', 'false');
  await expect(pad(second)).toHaveAttribute('data-active', 'true');
  assert.equal(await bytes(page), beforeRemoval, 'changing scope preserves every session');
  await pad(0).click();
  await choices.locator('[data-session-occurrence-add]').click();
  const extended = JSON.parse(await bytes(page)).work.find(row => row.id === 'research');
  assert.equal(extended.occurrences, second + 2);
  assert.deepEqual(extended.sessionOverrides, editedWork.sessionOverrides);
  await expect(choices.locator(`[data-session-occurrence="${second + 1}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(rack.locator('[name="status"][value="planned"]')).toBeChecked();
  await undo(page);
  assert.equal(await bytes(page), beforeRemoval, 'in-rack addition has its own exact Undo');
});

for (const engine of names) for (const basis of ['sprint', 'quarter']) {
  test(`${engine}: grouped ${basis} cards preserve distinct session types and drill into local settings`, async t => {
    const page = await open(t, engine, { groupedBasis: basis });
    const before = await bytes(page), original = JSON.parse(before);
    const tape = original.work.find(row => row.id === 'research');
    const periodNames = original.scoreSettings.cadence.periods.map(row => row.label);
    const board = shelf(page).locator('.native-cadence__board');
    const rack = root(page).locator('[data-native-configure]');
    const pad = index => shelf(page).locator(`[data-cadence-key="pad:research:${index}"]`);
    const cards = () => board.locator('[data-cadence-period="period-3"] .native-cadence__clip[data-cadence-work-id="research"]');
    await shelf(page).locator('[data-studio-plan-id="research"]').click();
    await expect(cards()).toHaveCount(3);
    const fundedGroup = board.locator('[data-cadence-period="period-3"] .native-cadence__clip[data-cadence-work-id="research"][data-funding="allocated"][data-active="true"]');
    await expect(fundedGroup).toContainText('2 sessions');
    await expect(board.locator('[data-cadence-period="period-3"] .native-cadence__clip[data-cadence-work-id="research"][data-funding="mixed"]')).toHaveCount(0);
    await expect(board.locator('[data-cadence-period="period-3"] .native-cadence__clip[data-funding="additional"][data-active="false"]')).toContainText('Paused');
    for (const attribute of ['aria-controls', 'aria-expanded', 'aria-pressed']) await expect(fundedGroup).not.toHaveAttribute(attribute);
    await pad(0).click();
    await expect(rack).toBeVisible();
    for (const attribute of ['aria-controls', 'aria-expanded', 'aria-pressed']) await expect(fundedGroup).not.toHaveAttribute(attribute);
    await pad(0).click();
    await expect(rack).toBeHidden();
    await fundedGroup.click();
    await expect(board).toHaveAttribute('data-cadence-level', 'period');
    await expect(shelf(page).locator('.native-cadence__context')).toContainText(periodNames[2]);
    await expect(rack).toBeHidden();
    assert.equal(await bytes(page), before, 'group inspection changes scope only');
    const localCard = board.locator('.native-cadence__clip[data-studio-session-id="research"][data-studio-session-occurrence="1"]');
    await localCard.click();
    await expect(rack).toContainText('Settings for session 2.');
    await rack.locator('[name="label"]').fill('Check the proposed response');
    await rack.locator('[name="hoursPerSession"]').fill('0');
    await rack.locator('[name="minutesPerSession"]').fill('25');
    await rack.locator('[name="funding"][value="additional"]').check();
    await rack.locator('[data-action="apply"]').click();
    const editedBytes = await bytes(page), edited = JSON.parse(editedBytes);
    const changed = edited.work.find(row => row.id === tape.id);
    assert.deepEqual(changed.sessionOverrides.filter(row => row.occurrenceIndex !== 1), tape.sessionOverrides,
      'other authored sessions keep their settings');
    assert.equal(changed.sessionOverrides.find(row => row.occurrenceIndex === 1).label, 'Check the proposed response');
    assert.equal(changed.sessionOverrides.find(row => row.occurrenceIndex === 1).funding, 'additional');
    for (const key of ['label', 'minutesPerOccurrence', 'personIds', 'teamId', 'funding', 'status', 'occurrences'])
      assert.deepEqual(changed[key], tape[key], `${key} still supplies the unedited sessions in periods 2 and 4`);
    assert.deepEqual(edited.scoreSettings.cadence.placements, original.scoreSettings.cadence.placements);
    await expect(pad(1)).toHaveAttribute('data-funding', 'additional');
    await expect(pad(2)).toHaveAttribute('data-funding', 'additional');
    await expect(pad(3)).toHaveAttribute('data-active', 'false');
    await expect(pad(4)).toHaveAttribute('data-funding', 'allocated');
    const choices = rack.locator('[data-session-occurrences]');
    await choices.getByRole('radio', { name: periodNames[1], exact: true }).check();
    await rack.locator('[data-action="apply"]').click();
    const movedBytes = await bytes(page), moved = JSON.parse(movedBytes);
    assert.deepEqual(moved.scoreSettings.cadence.placements.filter(row => row.workId !== 'research' || row.occurrenceIndex !== 1),
      original.scoreSettings.cadence.placements.filter(row => row.workId !== 'research' || row.occurrenceIndex !== 1));
    assert.equal(moved.scoreSettings.cadence.placements.find(row => row.workId === 'research' && row.occurrenceIndex === 1).periodId, 'period-2');
    await choices.getByRole('button', { name: 'Remove session 2', exact: true }).click();
    assert.equal(JSON.parse(await bytes(page)).work.find(row => row.id === 'research').occurrences, 5);
    await undo(page); assert.equal(await bytes(page), movedBytes, 'Undo restores the removed session and every placement');
    await undo(page); assert.equal(await bytes(page), editedBytes, 'Undo restores only the moved session');
    await shelf(page).getByRole('button', { name: 'All plans', exact: true }).click();
    await expect(shelf(page).locator('.native-cadence__context')).toContainText(periodNames[2]);
    await shelf(page).getByRole('button', { name: 'Plan overview', exact: true }).click();
    await expect(cards()).toHaveCount(3);
    await expect(pad(0)).toHaveAttribute('data-funding', 'allocated');
    await expect(pad(5)).toHaveAttribute('data-funding', 'allocated');
    assert.equal(await bytes(page), editedBytes, 'All plans and overview retain each accepted session');
  });
}

for (const engine of names) test(`${engine}: unplaced cards edit one session while its sibling stays unplaced and unchanged`, async t => {
  const page = await open(t, engine, { unplaced: true });
  const before = JSON.parse(await bytes(page)), work = before.work.find(row => row.id === 'research');
  await shelf(page).locator('[data-studio-plan-id="research"]').click();
  const tray = shelf(page).locator('.native-cadence__unplaced');
  const cards = tray.locator('.native-cadence__clip[data-cadence-work-id="research"]');
  await expect(cards).toHaveCount(2);
  const second = tray.locator('[data-studio-session-occurrence="1"]');
  await second.click();
  const rack = root(page).locator('[data-native-configure]');
  await expect(rack).toContainText('Settings for session 2.');
  await rack.locator('[name="hoursPerSession"]').fill('0');
  await rack.locator('[name="minutesPerSession"]').fill('45');
  await rack.locator('[name="status"][value="paused"]').check();
  await rack.locator('[data-action="apply"]').click();
  const after = JSON.parse(await bytes(page)), edited = after.work.find(row => row.id === work.id);
  const { sessionOverrides, ...defaults } = edited;
  assert.deepEqual(defaults, work, 'the sibling continues to use the unchanged plan defaults');
  assert.deepEqual(sessionOverrides, [{ occurrenceIndex: 1, label: work.label, teamId: work.teamId,
    personIds: work.personIds, minutesPerOccurrence: 45, funding: work.funding, status: 'paused' }]);
  assert.deepEqual(after.scoreSettings.cadence.placements, before.scoreSettings.cadence.placements);
  await expect(cards).toHaveCount(2);
  await expect(tray.locator('[data-studio-session-occurrence="0"]')).toHaveAttribute('data-active', 'true');
  await expect(second).toHaveAttribute('data-active', 'false');
});

for (const engine of names) test(`${engine}: track defaults and numbered sessions keep distinct editing scopes`, async t => {
  const page = await open(t, engine, { groupedBasis: 'sprint' });
  const originalBytes = await bytes(page), original = JSON.parse(originalBytes);
  const work = original.work.find(row => row.id === 'research');
  const track = shelf(page).locator('[data-cadence-key="track-work:research"]');
  const pad = shelf(page).locator('[data-cadence-key="pad:research:1"]');
  const rack = root(page).locator('[data-native-configure]');
  const close = root(page).locator('[data-rack-editor-kind="session"] [data-rack-editor-close]');
  await track.click();
  await expect(rack).toContainText('Plan defaults');
  await rack.locator('[name="hoursPerSession"]').fill('0');
  await rack.locator('[name="minutesPerSession"]').fill('45');
  await rack.locator('[data-action="apply"]').click();
  const changedDefaults = JSON.parse(await bytes(page)).work.find(row => row.id === work.id);
  assert.equal(changedDefaults.minutesPerOccurrence, 45);
  assert.deepEqual(changedDefaults.sessionOverrides, work.sessionOverrides, 'authored sessions retain their own settings');
  await close.click(); await expect(track).toBeFocused();
  await undo(page); assert.equal(await bytes(page), originalBytes);
  await pad.click();
  await expect(rack).toContainText('Settings for session 2.');
  await rack.locator('[name="hoursPerSession"]').fill('0');
  await rack.locator('[name="minutesPerSession"]').fill('25');
  await rack.locator('[data-action="apply"]').click();
  const changedSession = JSON.parse(await bytes(page)).work.find(row => row.id === work.id);
  assert.equal(changedSession.minutesPerOccurrence, work.minutesPerOccurrence, 'a pad preserves the defaults');
  assert.equal(changedSession.sessionOverrides.find(row => row.occurrenceIndex === 1).minutesPerOccurrence, 25);
  assert.deepEqual(changedSession.sessionOverrides.filter(row => row.occurrenceIndex !== 1), work.sessionOverrides);
  await close.click(); await expect(pad).toBeFocused();
  await undo(page); assert.equal(await bytes(page), originalBytes);
  await pad.click(); await expect(rack.locator('[name="minutesPerSession"]')).toHaveValue('0');
});

for (const engine of names) test(`${engine}: proposed arrangement and source-less navigation preserve exact session intent`, async t => {
  const page = await open(t, engine);
  const before = await bytes(page);
  await shelf(page).locator('[data-cadence-key="rack-stage:understand"]').click();
  await score(page).locator('input[data-cadence-field="stage.understand.label"]').fill('Explore the receiving work');
  await expect(shelf(page)).toHaveAttribute('data-cadence-reading', 'proposed');
  await shelf(page).locator('[data-cadence-key="pad:research:1"]').click();
  const rack = root(page).locator('[data-native-configure]');
  await expect(rack).toContainText('Settings for session 2.');
  await rack.locator('[name="label"]').fill('Retain this session draft');
  const result = await page.evaluate(async () => {
    const { mountScorePanel } = await import('/collaboration/native-investment-studio/score-controller.mjs');
    const { workSessionTarget } = await import('/collaboration/native-investment-studio/navigation-policy.mjs');
    const { studio, controller } = window.tapeFixture;
    const score = mountScorePanel(document.querySelector('[data-native-score]'), {});
    const before = controller.read(), focus = document.activeElement, parent = focus.closest('[data-rack-editor-kind]');
    const route = document.querySelector('[data-native-return-route]')?.outerHTML;
    const history = studio.readHistory();
    score.select({ kind: 'work', id: 'research', scope: 'session' });
    const after = controller.read();
    const retained = { token: before.draft.token === after.draft.token,
      entries: JSON.stringify(before.draft.raw) === JSON.stringify(after.draft.raw),
      focus: document.activeElement === focus, parent: focus.closest('[data-rack-editor-kind]') === parent,
      return: document.querySelector('[data-native-return-route]')?.outerHTML === route,
      history: JSON.stringify(studio.readHistory()) === JSON.stringify(history) };
    score.select(workSessionTarget(studio.read().state.work.find(row => row.id === 'research'), 0));
    return { retained, target: controller.read().draft?.sessionId };
  });
  assert.ok(Object.values(result.retained).every(Boolean), JSON.stringify(result.retained));
  assert.equal(result.target, 'work.session.update:research:0', 'a source-less route keeps its exact session scope');
  assert.equal(await bytes(page), before, 'inspection and proposed stage edits leave accepted work unchanged');
});

for (const engine of names) test(`${engine}: prerequisite return retains the numbered session selected inside its rack`, async t => {
  const page = await open(t, engine), before = await bytes(page);
  const rack = root(page).locator('[data-native-configure]');
  await shelf(page).locator('[data-cadence-key="pad:research:0"]').click();
  await rack.locator('[data-session-occurrence="1"]').click();
  await rack.locator('[name="label"]').fill('Second session draft');
  await rack.locator('[data-native-create="team"]').click();
  const team = root(page).locator('[data-assembly-configure]');
  await team.getByRole('button', { name: /^Back to Settings/ }).click();
  await expect(rack).toContainText('Settings for session 2.');
  await expect(rack.locator('[name="label"]')).toHaveValue('Second session draft');
  await expect(rack.locator('[data-session-occurrence="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(root(page).locator('[data-rack-editor-kind="session"] > .studio-rack-header h4')).toContainText('Session 2');
  assert.equal(await page.evaluate(() => window.tapeFixture.controller.read().draft.sessionId), 'work.session.update:research:1');
  assert.equal(await bytes(page), before);
});
