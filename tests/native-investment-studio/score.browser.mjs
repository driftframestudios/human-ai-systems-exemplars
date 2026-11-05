import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';
const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-score');
let server, fixture;
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const start = source.indexOf('<section class="about-field about-field--coordination"');
  const end = source.indexOf('<section class="about-field about-field--studio"', start);
  const prefixEnd = source.indexOf('<main id="main">') + '<main id="main">'.length;
  const prefix = source.slice(0, prefixEnd).replace(/<script\b[\s\S]*?<\/script>/gu, script => script.includes('collaboration/native-investment-studio/controller.mjs') ? script : '');
  fixture = `${prefix}${source.slice(start, end)}</main></body></html>`;
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => { try { await Promise.all([...browsers.values()].map(browser => browser.close())); } finally { await server?.close(); } });
const root = page => page.locator('[data-native-coordination]');
const score = page => root(page).locator('[data-native-score]');
const field = (page, key) => score(page).locator(`[data-score-field="${key}"]`).filter({ hasNot: page.locator('button') });
const input = (page, key) => score(page).locator(`input[data-score-field="${key}"],select[data-score-field="${key}"],textarea[data-score-field="${key}"]`);
const action = (page, name) => score(page).locator(`[data-score-action="${name}"]`);
async function open(t, engine, options = {}) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage(), telemetry = monitor(page);
  t.after(async () => { try { assertTelemetry(telemetry); } finally { await context.close(); } });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route) return request.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    return url.origin === server.origin ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' });
  });
  await page.goto(server.origin + route); await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  await page.evaluate(async () => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
    const element = document.querySelector('[data-native-coordination]'); mountCoordinationPanel(element).dispose();
    const studio = createStudio(createShowcasePlan()); window.scoreFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
  });
  return page;
}
const bytes = page => page.evaluate(() => window.scoreFixture.studio.exportText());
async function inspect(page, kind, id) {
  await score(page).locator(`[data-score-action="kind"][data-score-kind="${kind}"]`).click();
  if (id) await score(page).locator('.native-score__picker select').selectOption(id);
}
for (const engine of names) {
  test(`${engine}: horizon changes timing and capacity while funding remains explicit`, async t => {
    const page = await open(t, engine);
    await expect(score(page).locator('[data-score-readout]')).toContainText('825 min');
    const accepted = await bytes(page);
    await score(page).getByRole('button', { name: '2×', exact: true }).click();
    assert.equal(await bytes(page), accepted, 'view zoom leaves accepted serialization exact');
    await inspect(page, 'work', 'review');
    await input(page, 'work.review.startMinute').fill('500');
    await expect(score(page).locator('[data-score-projection]')).toHaveAttribute('data-score-reading', 'proposed');
    await expect(score(page).locator('.native-score__person[data-attention="true"]')).toContainText('Quality reviewer');
    await expect(score(page).locator('.native-score__dependencies')).toContainText('Starts before');
    await expect(root(page).locator('[data-native-total]')).toHaveText('$3,980.00');
    assert.equal(await bytes(page), accepted, 'timing preview leaves accepted state exact');
    await action(page, 'apply').click();
    assert.equal(await page.evaluate(() => window.scoreFixture.studio.read().state.work.find(row => row.id === 'review').timing.startMinute), 500);
    await expect(root(page).locator('[data-native-total]')).toHaveText('$3,980.00');
    await page.evaluate(() => { window.scoreFixture.studio.undo(window.scoreFixture.studio.read()); window.scoreFixture.controller.refresh(); });
    assert.equal(await page.evaluate(() => window.scoreFixture.studio.read().score.span.elapsedMinutes), 825);
  });
  test(`${engine}: a modeled gate and explicit funding accept one next session with Undo`, async t => {
    const page = await open(t, engine), before = await bytes(page);
    await inspect(page, 'gate', 'pilot-decision');
    await score(page).getByRole('radio', { name: 'Proceed in this model', exact: true }).check();
    await expect(score(page).locator('[data-score-preview]')).toContainText('proposed investment $3,980.00');
    await inspect(page, 'proposal', 'confirm-recovery');
    await score(page).locator('[data-score-fund="confirm-recovery"]').check();
    await expect(score(page).locator('[data-score-preview]')).toContainText('proposed investment $4,080.00');
    assert.equal(await bytes(page), before);
    await action(page, 'apply').click();
    await expect(root(page).locator('[data-native-total]')).toHaveText('$4,080.00');
    const state = await page.evaluate(() => window.scoreFixture.studio.read().state);
    assert.equal(state.work.filter(row => row.id === 'confirm-recovery-session').length, 1);
    assert.ok(!state.scoreSettings.proposals.some(row => row.id === 'confirm-recovery'));
    await page.evaluate(() => { window.scoreFixture.studio.undo(window.scoreFixture.studio.read()); window.scoreFixture.controller.refresh(); });
    await expect(root(page).locator('[data-native-total]')).toHaveText('$3,980.00');
    assert.equal(await page.evaluate(() => window.scoreFixture.studio.read().state.scoreSettings.gates[0].modeledDecision), 'open');
  });
  test(`${engine}: score navigation retains raw entries and exposes stale review after a session edit`, async t => {
    const page = await open(t, engine);
    await inspect(page, 'work', 'review'); await input(page, 'work.review.startMinute').fill('00660');
    await expect(action(page, 'source')).toHaveClass(/native-control--navigate/u);
    await expect(action(page, 'source')).toHaveAccessibleName('Open session settings');
    await expect(score(page).getByRole('button', { name: 'Go to Change', exact: true })).toHaveClass(/native-control--navigate/u);
    await expect(score(page).getByRole('button', { name: '2×', exact: true })).not.toHaveClass(/native-control--navigate/u);
    await action(page, 'source').click();
    await expect(root(page).locator('[data-native-return-action]')).toHaveText('Return to coordination horizon');
    const settings = root(page).locator('[data-native-configure]'); if (!await settings.evaluate(el => el.open)) await settings.locator('summary').click();
    await settings.locator('[name="minutesPerSession"]').fill('45'); await settings.locator('[data-action="apply"]').click();
    await root(page).locator('[data-native-return-action]').click();
    await expect(score(page)).toHaveAttribute('data-score-state', 'stale');
    await action(page, 'review').click(); await expect(input(page, 'work.review.startMinute')).toHaveValue('00660');
    await expect(root(page).locator('[data-native-total]')).toHaveText('$4,350.00');
    await action(page, 'cancel').last().click();
  });
  test(`${engine}: score keeps exact agenda, keyboard routes and narrow layout usable`, async t => {
    const page = await open(t, engine);
    for (const width of [1000, 1322, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await score(page).locator('.native-score__heading').scrollIntoViewIfNeeded();
      const geometry = await page.evaluate(() => { const panel = document.querySelector('[data-native-score]'), box = panel.getBoundingClientRect(); return { left: box.left, right: box.right, width: innerWidth, scroll: document.documentElement.scrollWidth }; });
      assert.ok(geometry.left >= 0 && geometry.right <= geometry.width + 1 && geometry.scroll <= geometry.width + 1, JSON.stringify(geometry));
      await score(page).locator('.native-score__scroll').screenshot({ path: resolve(captures, `${engine}-horizon-${width}.png`) });
    }
    await score(page).locator('.native-score__agenda summary').click();
    const agenda = score(page).getByRole('region', { name: 'Chronological agenda', exact: true });
    const agendaTable = agenda.getByRole('table', { name: 'Working sessions, waits and decisions in time order' });
    assert.deepEqual(await agendaTable.getByRole('columnheader').allTextContents(), ['Elapsed time', 'Session or event', 'People and context']);
    assert.ok(await agendaTable.getByRole('columnheader').evaluateAll(cells => cells.every(cell => cell.scope === 'col')));
    assert.ok(await agendaTable.getByRole('rowheader').evaluateAll(cells => cells.length > 0 && cells.every(cell => cell.scope === 'row')));
    assert.deepEqual(await agendaTable.locator('tbody tr > td:first-child').allTextContents(), [
      '0 min–60 min', '90 min–150 min', '150 min–210 min', '240 min–300 min', '330 min–390 min', '420 min–480 min',
      '480 min–540 min', '570 min–630 min', '630 min–660 min', '660 min–690 min', '705 min–735 min', '750 min–780 min',
      '795 min–825 min', '825 min–825 min',
    ]);
    const firstAgendaRow = agendaTable.locator('tbody tr').first();
    await expect(firstAgendaRow.getByRole('rowheader')).toHaveText('Research synthesis');
    await expect(firstAgendaRow).toContainText('Product lead, Researcher');
    await expect(agendaTable.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Receiving response', exact: true }) })).toContainText('Waiting · no participant effort');
    await expect(agendaTable.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Pilot decision', exact: true }) })).toContainText('Modeled decision · open');
    for (const width of [1322, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await agenda.scrollIntoViewIfNeeded();
      const geometry = await agenda.evaluate(element => {
        const row = element.querySelector('tbody tr'), button = row.querySelector('button'), style = getComputedStyle(row);
        return { left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right,
          viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
          localWidth: element.clientWidth, localContent: element.scrollWidth,
          rowHeight: row.getBoundingClientRect().height, buttonHeight: button.getBoundingClientRect().height,
          lineHeight: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 };
      });
      assert.ok(geometry.left >= 0 && geometry.right <= width + 1 && geometry.pageWidth <= width + 1,
        `Agenda overflow stays in its own region at ${width}px: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.rowHeight <= geometry.buttonHeight + geometry.lineHeight + 2,
        `The first agenda row stays compact around its working-session control at ${width}px: ${JSON.stringify(geometry)}`);
      if (width === 320) {
        assert.ok(geometry.localContent > geometry.localWidth, 'narrow agenda keeps its readable columns in local horizontal scrolling');
        await agenda.evaluate(element => { element.scrollLeft = element.scrollWidth; });
        assert.ok(await agenda.evaluate(element => element.scrollLeft) > 0);
        await agenda.evaluate(element => { element.scrollLeft = 0; });
      }
      await agenda.screenshot({ path: resolve(captures, `${engine}-agenda-${width}.png`) });
    }
    await score(page).locator('.native-score__exact summary').click();
    await expect(score(page).locator('.native-score__exact table')).toContainText('4 × 30 min');
    const before = await bytes(page);
    await score(page).getByRole('button', { name: 'Whole plan', exact: true }).focus(); await page.keyboard.press('Enter'); assert.equal(await bytes(page), before);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.keyboard.press('Tab');
    await score(page).locator('.native-score__scroll').focus();
    assert.equal(await score(page).locator('.native-score__scroll').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
  });
  test(`${engine}: newer Purpose edits keep their lease and focus across score callbacks and selection`, async t => {
    const page = await open(t, engine);
    const observations = await page.evaluate(async () => {
      const { mountScorePanel } = await import('/collaboration/native-investment-studio/score-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.scoreFixture.controller.dispose();
      const element = document.querySelector('[data-native-score]'), observations = [];
      const external = document.createElement('input'); external.name = 'newer-purpose-focus'; document.body.append(external);
      for (const callback of ['onBegin', 'onEditing', 'select']) {
        const studio = createStudio(createShowcasePlan()), accepted = studio.read(), editing = createDraftCoordinator(studio);
        let armed = true, successorToken;
        function transfer() {
          if (!armed) return; armed = false;
          editing.purpose.begin('purpose', studio.read());
          successorToken = editing.purpose.read().draft.token;
          editing.purpose.setText(successorToken, 'changedAbility', 'The receiving team can recover an interrupted request.');
          external.focus();
        }
        const receiver = mountScorePanel(element, { studio, editing,
          onBegin: callback === 'onBegin' ? transfer : () => {},
          onEditing: callback === 'onBegin' ? () => {} : transfer });
        if (callback === 'select') receiver.select({ kind: 'work', id: 'review' }, true);
        else receiver.open();
        const retained = () => ({ active: editing.read().active?.kind ?? null,
          sameLease: editing.read().active?.token === successorToken,
          raw: editing.purpose.read().draft?.raw.changedAbility ?? null,
          focus: document.activeElement.name, acceptedUnchanged: studio.read() === accepted });
        const beforeDisposal = retained(); receiver.dispose();
        observations.push({ callback, beforeDisposal, afterDisposal: retained() });
        editing.dispose();
      }
      external.remove(); return observations;
    });
    const expected = { active: 'purpose', sameLease: true,
      raw: 'The receiving team can recover an interrupted request.', focus: 'newer-purpose-focus', acceptedUnchanged: true };
    assert.deepEqual(observations, ['onBegin', 'onEditing', 'select'].map(callback => ({ callback, beforeDisposal: expected, afterDisposal: expected })));
  });
  test(`${engine}: score disposal during preview releases its lease and removes its owned controls`, async t => {
    const page = await open(t, engine);
    const observed = await page.evaluate(async () => {
      const { mountScorePanel } = await import('/collaboration/native-investment-studio/score-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.scoreFixture.controller.dispose();
      const element = document.querySelector('[data-native-score]'), studio = createStudio(createShowcasePlan()), accepted = studio.read();
      let receiver, armed = false, callbacks = 0;
      const facade = { ...studio, previewCommand(...args) {
        const result = studio.previewCommand(...args);
        if (armed) { armed = false; receiver.dispose(); }
        return result;
      } };
      const editing = createDraftCoordinator(facade);
      receiver = mountScorePanel(element, { studio: facade, editing, onEditing() { callbacks += 1; } });
      armed = true; receiver.open();
      await Promise.resolve();
      const result = { active: editing.read().active?.kind ?? null, callbacks,
        ownedControls: element.querySelectorAll('[data-score-form],.native-score__transport,[data-score-projection],.native-score__manual').length,
        acceptedUnchanged: studio.read() === accepted };
      receiver.dispose(); editing.dispose(); return result;
    });
    assert.deepEqual(observed, { active: null, callbacks: 0, ownedControls: 0, acceptedUnchanged: true });
  });
  test(`${engine}: canceled and finished composition restore Apply while retaining exact score text`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    await inspect(page, 'work', 'review');
    const start = input(page, 'work.review.startMinute');
    await start.fill('00660');
    await start.dispatchEvent('compositionstart');
    await expect(action(page, 'apply')).toBeDisabled();
    // Canceled composition can end without an ordinary input event.
    await start.dispatchEvent('compositionend', { data: '' });
    await expect(action(page, 'apply')).toBeEnabled();
    await expect(start).toHaveValue('00660');
    await start.dispatchEvent('compositionstart');
    await expect(action(page, 'apply')).toBeDisabled();
    await start.evaluate(element => { element.value = '00720'; });
    await start.dispatchEvent('compositionend', { data: '720' });
    await expect(action(page, 'apply')).toBeEnabled();
    await expect(start).toHaveValue('00720');
    await inspect(page, 'work', 'research'); await inspect(page, 'work', 'review');
    await expect(input(page, 'work.review.startMinute')).toHaveValue('00720');
    assert.equal(await bytes(page), accepted, 'composition and selection retain accepted state until Apply');
    await action(page, 'apply').click();
    assert.equal(await page.evaluate(() => window.scoreFixture.studio.read().state.work.find(row => row.id === 'review').timing.startMinute), 720);
    await expect(root(page).locator('[data-native-total]')).toHaveText('$3,980.00');
  });
  test(`${engine}: timeline clips focus their settings and exact timing distinguishes inactive effort`, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      window.scoreFixture.controller.dispose();
      const plan = createShowcasePlan();
      plan.work.find(row => row.id === 'review').status = 'paused';
      plan.work.find(row => row.id === 'research').lifecycle = 'retired';
      const studio = createStudio(plan), element = document.querySelector('[data-native-coordination]');
      window.scoreFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
    });
    const accepted = await bytes(page);
    const clip = score(page).locator('.native-score__timeline [data-score-view-action="select"][data-score-kind="work"][data-score-id="review"]').first();
    await clip.focus(); await page.keyboard.press('Enter');
    await expect(input(page, 'work.review.timed')).toBeFocused();
    await expect(input(page, 'work.review.startMinute')).toHaveValue('660');
    await score(page).locator('.native-score__exact summary').click();
    const table = score(page).locator('.native-score__exact table');
    await expect(table.getByRole('columnheader', { name: 'Activity', exact: true })).toBeVisible();
    await expect(table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Pilot decision review', exact: true }) })).toContainText('Paused · outside active effort');
    await expect(table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Research synthesis', exact: true }) })).toContainText('Retired · outside active effort');
    await expect(score(page).locator('[data-score-readout]')).toContainText('720 min');
    await expect(root(page).locator('[data-native-total]')).toHaveText('$3,980.00');
    assert.equal(await bytes(page), accepted, 'keyboard inspection leaves the retained commitment and activity records exact');
  });
  test(`${engine}: adding work again after funding keeps both sessions and an existing proposal distinct`, async t => {
    const page = await open(t, engine);
    await page.evaluate(async () => {
      const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
      window.scoreFixture.controller.dispose();
      const plan = createShowcasePlan(); plan.scoreSettings.proposals.find(row => row.id === 'compare-routing').work.id = 'proposal-2';
      const studio = createStudio(plan), element = document.querySelector('[data-native-coordination]');
      window.scoreFixture = { studio, controller: mountCoordinationPanel(element, { studio }) };
    });
    await inspect(page, 'proposal', 'confirm-recovery');
    for (const [id, label, person, total] of [
      ['proposal-1', 'Check the recovery instructions', 'noor', '$4,035.00'],
      ['proposal-3', 'Rehearse the receiving response', 'sam', '$4,080.00'],
    ]) {
      const before = await bytes(page);
      await action(page, 'add').click();
      await expect(score(page).locator('.native-score__picker select')).toHaveValue(id);
      await expect(input(page, `proposal.${id}.workId`)).toHaveCount(0);
      await input(page, `proposal.${id}.label`).fill(label);
      await input(page, `proposal.${id}.teamId`).selectOption('operations');
      await score(page).locator(`input[data-score-field="proposal.${id}.personIds"][value="${person}"]`).check();
      await score(page).locator(`[data-score-fund="${id}"]`).check();
      await expect(score(page).locator('[data-score-preview]')).toContainText(`proposed investment ${total}`);
      assert.equal(await bytes(page), before, 'a newly configured session remains proposed until Apply');
      await action(page, 'apply').click();
      await expect(root(page).locator('[data-native-total]')).toHaveText(total);
    }
    const reading = await page.evaluate(() => {
      const { work, scoreSettings } = window.scoreFixture.studio.read().state;
      return { sessions: work.filter(row => row.id.startsWith('proposal-')).map(({ id, label }) => ({ id, label })),
        retainedOption: scoreSettings.proposals.find(row => row.id === 'compare-routing').work.id,
        pendingFundedIds: scoreSettings.proposals.filter(row => ['proposal-1', 'proposal-3'].includes(row.id)).map(row => row.id) };
    });
    assert.deepEqual(reading, { sessions: [
      { id: 'proposal-1', label: 'Check the recovery instructions' },
      { id: 'proposal-3', label: 'Rehearse the receiving response' },
    ], retainedOption: 'proposal-2', pendingFundedIds: [] });
  });
  test(`${engine}: clip previews explain the work and availability controls keep their button shape`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    const preview = score(page).locator('[data-score-clip-preview]');
    const review = score(page).locator('.native-score__clip[data-score-kind="work"][data-score-id="review"]').first();
    await review.hover();
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('Pilot decision review: 660 min–690 min, occurrence 1');
    await expect(preview).toContainText('Product lead, Engineering lead, Quality reviewer. 30 min per person, each session. Extra investment.');
    await expect(preview).toContainText('Needs Operations rehearsal: ready in this arrangement.');
    const pairing = score(page).locator('.native-score__clip[data-score-kind="work"][data-score-id="pairing"]').first();
    await pairing.focus();
    await expect(preview).toContainText('Engineering lead, Engineer. 60 min per person, each session. Within funded time.');
    await expect(preview).toContainText('Needs Research synthesis: ready in this arrangement. Supports Operations rehearsal.');
    await expect(pairing).toHaveAttribute('aria-description', /Engineering lead, Engineer.*Supports Operations rehearsal/u);
    assert.equal(await bytes(page), accepted, 'hover and keyboard focus explain the arrangement without changing it');
    await inspect(page, 'person', 'noor');
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const remove = action(page, 'remove-interval').first();
      await remove.scrollIntoViewIfNeeded();
      const dimensions = await remove.evaluate((element, cancelSelector) => {
        const style = getComputedStyle(element), cancel = document.querySelector(cancelSelector);
        return { remove: element.getBoundingClientRect().height, cancel: cancel.getBoundingClientRect().height,
          line: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3 };
      }, '[data-native-score] [data-score-form] > .native-coordination__actions [data-score-action="cancel"]');
      assert.ok(dimensions.remove <= dimensions.cancel + dimensions.line + 2,
        `Remove interval stays a compact action with room for one wrapped line at ${width}px: ${JSON.stringify(dimensions)}`);
      const lastTick = score(page).locator('.native-score__axis .native-score__track > span').last();
      await expect(lastTick).toHaveText('900');
      assert.equal(await lastTick.evaluate(element => { const range = document.createRange(); range.selectNodeContents(element); return range.getClientRects().length; }), 1,
        `The ending elapsed-minute label stays on one line at ${width}px`);
    }
    assert.equal(await bytes(page), accepted, 'availability inspection preserves accepted state');
  });
  test(`${engine}: direct horizon controls retain draft text and distinguish inspection from navigation`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    const scales = score(page).getByRole('group', { name: 'View scale', exact: true });
    assert.deepEqual(await scales.getByRole('button').allTextContents(), ['Whole plan', '2×', '4×']);
    await expect(scales.getByRole('button', { name: 'Whole plan', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(score(page).locator('.native-score__transport select')).toHaveCount(0);
    await expect(action(page, 'reset-focus')).toBeHidden();
    await inspect(page, 'work', 'review'); await input(page, 'work.review.startMinute').fill('00660');
    await action(page, 'focus').click();
    await expect(score(page).locator('.native-score__track-label[data-score-kind="work"]')).toHaveCount(1);
    const closer = scales.getByRole('button', { name: '4×', exact: true }); await closer.focus(); await page.keyboard.press('Enter');
    await expect(closer).toBeFocused(); await expect(closer).toHaveAttribute('aria-pressed', 'true');
    await expect(action(page, 'reset-focus')).toBeVisible(); await action(page, 'reset-focus').focus(); await page.keyboard.press('Enter');
    await expect(score(page).locator('.native-score__track-label[data-score-kind="work"]')).toHaveCount(4);
    await expect(closer).toHaveAttribute('aria-pressed', 'true'); await expect(closer).toBeFocused();
    await action(page, 'focus').click(); await scales.getByRole('button', { name: 'Whole plan', exact: true }).click();
    await expect(action(page, 'reset-focus')).toBeHidden();
    await expect(score(page).locator('.native-score__track-label[data-score-kind="work"]')).toHaveCount(4);
    await expect(input(page, 'work.review.startMinute')).toHaveValue('00660');

    const person = score(page).locator('[data-score-person="noor"]');
    await expect(person.getByRole('heading', { name: 'Quality reviewer', exact: true })).toBeVisible();
    await expect(person.locator('h5 button')).toHaveCount(0); await expect(person.getByRole('button')).toHaveCount(2);
    await person.getByRole('button', { name: 'Inspect availability for Quality reviewer', exact: true }).click();
    await expect(score(page).locator('.native-score__picker select')).toHaveValue('noor');
    await expect(score(page).locator('.native-score__inspector')).toHaveAttribute('data-native-arrival', 'inspection');
    await person.getByRole('button', { name: 'Go to person settings for Quality reviewer', exact: true }).click();
    await expect(root(page).locator('[data-native-chapter-panel="people"]')).toBeVisible();
    await root(page).locator('[data-native-return-action]').click();
    await expect(root(page).locator('[data-native-return-route]')).toBeHidden();
    const handoff = score(page).locator('.native-score__dependencies li').last();
    await expect(handoff.locator('h5 button')).toHaveCount(0);
    await handoff.getByRole('button', { name: /^Inspect handoff from /u }).click();
    await expect(score(page).locator('[data-score-kind="dependency"][data-score-action="kind"]')).toHaveAttribute('aria-pressed', 'true');
    const onward = score(page).getByRole('group', { name: 'Go to chapter', exact: true });
    await onward.getByRole('button', { name: 'Go to Change', exact: true }).click();
    await expect(root(page).locator('[data-native-chapter-panel="change"]')).toBeVisible();
    await expect(root(page).locator('[data-native-chapter-panel="change"]')).toHaveAttribute('data-native-arrival', 'context');
    await expect(root(page)).toHaveAttribute('data-native-motion', 'lower');
    await root(page).locator('[data-native-return-action]').click();
    await inspect(page, 'work', 'review'); await expect(input(page, 'work.review.startMinute')).toHaveValue('00660');
    assert.equal(await bytes(page), accepted, 'view controls and labelled onward routes retain both accepted state and draft text');
  });
  test(`${engine}: decision and waiting prose reads in full while native choices retain draft and Apply ownership`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    const question = '  Can the receiving team recover an interrupted request?\nDescribe the observed handoff, including the person who received it, the delay and the next useful decision.  ';
    const evidence = '  Reviewer observation: the receiving team completed the recovery rehearsal.\nRetain the unexpected steps and unanswered questions as evidence for the next review, including the final receiving acknowledgement.  ';
    const reason = '  Wait for the receiving team to examine the recovery evidence.\nThis interval holds elapsed time only; the working session accounts for the people’s effort.  ';
    await inspect(page, 'gate', 'pilot-decision');
    for (const [key, raw, name] of [['question', question, 'Edit question to resolve'], ['evidence', evidence, 'Edit evidence for review']]) {
      const field = input(page, `gate.pilot-decision.${key}`);
      await score(page).getByText(name, { exact: true }).click(); await expect(field).toHaveAttribute('rows', '4'); await field.fill(raw);
      await score(page).getByText(name, { exact: true }).click();
      assert.equal(await score(page).locator(`[data-score-prose="gate.pilot-decision.${key}"]`).textContent(), raw);
    }
    const openDecision = score(page).getByRole('radio', { name: 'Open for review', exact: true });
    await openDecision.focus(); await page.keyboard.press('ArrowRight');
    await expect(score(page).getByRole('radio', { name: 'Proceed in this model', exact: true })).toBeChecked();
    await inspect(page, 'wait', 'review-preparation');
    await score(page).getByText('Edit reason for the wait', { exact: true }).click(); await input(page, 'wait.review-preparation.reason').fill(reason);
    await score(page).getByText('Edit reason for the wait', { exact: true }).click();
    assert.equal(await score(page).locator('[data-score-prose="wait.review-preparation.reason"]').textContent(), reason);
    await inspect(page, 'gate', 'pilot-decision');
    for (const [key, raw] of [['question', question], ['evidence', evidence]]) {
      await expect(input(page, `gate.pilot-decision.${key}`)).toHaveValue(raw);
      assert.equal(await score(page).locator(`[data-score-prose="gate.pilot-decision.${key}"]`).textContent(), raw);
    }
    await page.setViewportSize({ width: 320, height: 1000 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    const fullReading = score(page).locator('[data-score-prose="gate.pilot-decision.evidence"]');
    const geometry = await fullReading.evaluate(element => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, viewport: innerWidth, content: element.scrollHeight, height: element.clientHeight, whitespace: getComputedStyle(element).whiteSpace }; });
    assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewport + 1 && geometry.content <= geometry.height + 1, JSON.stringify(geometry));
    assert.equal(geometry.whitespace, 'pre-wrap', 'the complete reading retains authored line breaks');
    assert.equal(await bytes(page), accepted, 'prose and modeled decision remain draft changes until Apply');
    await action(page, 'apply').click();
    const state = await page.evaluate(() => window.scoreFixture.studio.read().state);
    assert.equal(state.scoreSettings.gates[0].question, question.trim()); assert.equal(state.scoreSettings.gates[0].evidence, evidence.trim());
    assert.equal(state.scoreSettings.gates[0].modeledDecision, 'proceed'); assert.equal(state.scoreSettings.waits[0].reason, reason.trim());
    await page.evaluate(() => { window.scoreFixture.studio.undo(window.scoreFixture.studio.read()); window.scoreFixture.controller.refresh(); });
    assert.equal(await bytes(page), accepted);
  });
  test(`${engine}: a stage adds a decision to the retained arrangement and Apply accepts both edits together`, async t => {
    const page = await open(t, engine), accepted = await bytes(page);
    await inspect(page, 'work', 'review'); await input(page, 'work.review.startMinute').fill('00500');
    await score(page).getByRole('button', { name: 'Add a decision after Understand the request', exact: true }).click();
    await expect(input(page, 'gate.gate-1.label')).toBeFocused();
    await expect(input(page, 'gate.gate-1.label')).toHaveValue('Decision after Understand the request');
    await expect(input(page, 'gate.gate-1.afterStageId')).toHaveValue('understand');
    await input(page, 'gate.gate-1.label').fill('Research handoff decision');
    await inspect(page, 'work', 'review'); await expect(input(page, 'work.review.startMinute')).toHaveValue('00500');
    assert.equal(await bytes(page), accepted, 'the stage action adds to the current raw proposal, not the accepted plan');
    await action(page, 'apply').click();
    const state = await page.evaluate(() => window.scoreFixture.studio.read().state);
    assert.equal(state.scoreSettings.gates.length, 2);
    assert.equal(state.scoreSettings.gates.find(row => row.id === 'gate-1').afterStageId, 'understand');
    assert.equal(state.scoreSettings.gates.find(row => row.id === 'gate-1').label, 'Research handoff decision');
    assert.equal(state.work.find(row => row.id === 'review').timing.startMinute, 500);
    await expect(root(page).locator('[data-native-total]')).toHaveText('$3,980.00');
    await page.evaluate(() => { window.scoreFixture.studio.undo(window.scoreFixture.studio.read()); window.scoreFixture.controller.refresh(); });
    assert.equal(await bytes(page), accepted, 'Undo restores the exact plan before the combined arrangement');
    await score(page).getByRole('button', { name: 'Add a decision after Build and rehearse', exact: true }).click();
    await expect(score(page).locator('[data-score-status]')).toHaveText('Review the saved arrangement before adding a decision.');
    await expect(action(page, 'review')).toBeFocused();
    assert.equal(await bytes(page), accepted);
  });
}
