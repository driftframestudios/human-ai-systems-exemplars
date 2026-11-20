import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name), `Unknown NATIVE_STUDIO_BROWSER: ${name}`);
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
let server, fixture;
registerBrowserFixture(async own => {
  fixture = createNativeAboutFixture(await readFile(new URL('../..' + route, import.meta.url), 'utf8'), { nativeBoot: false });
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});

async function open(t, engine) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), telemetry = monitor(page);
  t.after(async () => { try { assertTelemetry(telemetry); } finally { await context.close(); } });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route)
      return request.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' });
  });
  await page.goto(server.origin + route);
  await page.evaluate(async () => {
    const { createCadenceView } = await import('/collaboration/native-investment-studio/cadence-view.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createShowcasePlan } = await import('/collaboration/native-investment-studio/presets.mjs');
    const root = document.querySelector('[data-native-coordination]');
    const target = document.createElement('section'); target.className = 'native-score'; root.replaceChildren(target);
    const state = { projection: createStudio(createShowcasePlan()).read(), options: {}, allowRename: false };
    state.view = createCadenceView(target, {
      onPeriod: id => { state.options.periodId = id; state.refresh(); },
      onRenamePeriod: ({ id, label }) => {
        if (!state.allowRename) return { ok: false, error: { message: 'Try this caption again.' } };
        const next = structuredClone(state.projection.state);
        next.scoreSettings.cadence.periods.find(period => period.id === id).caption = label;
        state.projection = createStudio(next).read(); state.refresh(); return { ok: true };
      },
    });
    state.refresh = () => state.view.refresh(state.projection, state.options);
    state.replace = plan => { state.projection = createStudio(plan).read(); state.refresh(); };
    window.cadenceFixture = state; state.refresh();
  });
  return page;
}

for (const engine of names) {
  test(`${engine}: unchanged cadence readings retain rack nodes, focus, scroll and borrowed controls`, async t => {
    const page = await open(t, engine);
    const retained = await page.evaluate(() => {
      const state = window.cadenceFixture, root = document.querySelector('.native-cadence');
      state.options.selected = { kind: 'work', id: 'review', occurrenceIndex: 0 }; state.refresh();
      const board = root.querySelector('.native-cadence__board'), tracks = root.querySelector('.native-cadence__tracks');
      const key = root.querySelector('[data-cadence-key="pad:review:0"]'); key.focus();
      board.scrollLeft = board.scrollWidth; tracks.scrollLeft = tracks.scrollWidth;
      const positions = [board.scrollLeft, tracks.scrollLeft];
      const people = root.querySelector('[data-cadence-disclosure="people"]'); people.open = true;
      const editor = document.createElement('input'); editor.value = 'Unfinished session name'; state.view.getSessionSlot().append(editor);
      const shelf = root.querySelector('.studio-tape-shelf'), table = tracks.firstElementChild, preview = root.querySelector('[data-cadence-preview-reading]').textContent;
      state.options = { ...state.options, selected: { ...state.options.selected } };
      state.refresh(); state.refresh();
      return { key: root.querySelector('[data-cadence-key="pad:review:0"]') === key,
        shelf: root.querySelector('.studio-tape-shelf') === shelf, table: tracks.firstElementChild === table,
        focus: document.activeElement === key, scroll: positions.every((value, index) => value === [board.scrollLeft, tracks.scrollLeft][index]),
        scrollable: positions.every(value => value > 0), disclosure: people.open,
        editor: state.view.getSessionSlot().firstElementChild === editor && editor.value === 'Unfinished session name',
        preview: root.querySelector('[data-cadence-preview-reading]').textContent === preview };
    });
    for (const [property, retainedValue] of Object.entries(retained)) assert.equal(retainedValue, true, property);
  });

  test(`${engine}: scope, selection, proposed state and independent same-revision projections refresh the rack`, async t => {
    const page = await open(t, engine);
    await page.evaluate(() => {
      const state = window.cadenceFixture;
      state.options.selected = { kind: 'work', id: 'review', occurrenceIndex: 0 }; state.refresh();
      state.options.selected.occurrenceIndex = 1; state.refresh();
    });
    await expect(page.locator('[data-cadence-key="pad:review:0"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-cadence-key="pad:review:1"]')).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => {
      const state = window.cadenceFixture;
      state.options.selected = { kind: 'gate', id: 'pilot-decision' }; state.refresh();
    });
    await expect(page.locator('.native-cadence__decision').first()).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => {
      const state = window.cadenceFixture;
      state.options = { loadedPlanId: 'research', periodId: 'period-1', preview: true }; state.refresh();
    });
    await expect(page.locator('.native-cadence__screen')).toHaveAttribute('data-loaded-plan', 'research');
    await expect(page.locator('.native-cadence__board')).toHaveAttribute('data-cadence-level', 'period');
    await expect(page.getByRole('button', { name: 'Plan overview', exact: true })).toBeVisible();
    await expect(page.locator('.native-cadence')).toHaveAttribute('data-cadence-reading', 'proposed');
    await expect(page.locator('.native-cadence__track-name')).toHaveCount(1);
    const sameRevision = await page.evaluate(() => {
      const state = window.cadenceFixture, previous = state.projection;
      const next = structuredClone(previous.state); next.work.find(item => item.id === 'research').label = 'Receiving research';
      state.replace(next);
      return state.projection !== previous && state.projection.state.revision === previous.state.revision;
    });
    assert.equal(sameRevision, true);
    await expect(page.locator('.native-cadence__track-name')).toHaveText('Receiving research');
    await page.getByRole('button', { name: 'Plan overview', exact: true }).click();
    await expect(page.locator('.native-cadence__board')).toHaveAttribute('data-cadence-level', 'plan');
  });

  test(`${engine}: local caption edit, recovery and cancellation remain independent of projection reuse`, async t => {
    const page = await open(t, engine);
    const lane = page.locator('[data-cadence-period="period-1"]');
    const edit = lane.getByRole('button', { name: 'Edit Sprint 1 caption' });
    await edit.click();
    const input = lane.getByRole('textbox', { name: 'Period caption' });
    await input.fill('Prepare the receiving team');
    const retained = await input.evaluate(element => {
      element.setSelectionRange(8, 12);
      window.cadenceFixture.refresh();
      return element.isConnected && document.activeElement === element && element.selectionStart === 8 && element.selectionEnd === 12;
    });
    assert.equal(retained, true, 'an unrelated refresh retains the live caption input and text selection');
    await lane.getByRole('button', { name: 'Save label' }).click();
    await expect(lane.getByRole('alert')).toHaveText('Try this caption again.');
    await expect(input).toHaveValue('Prepare the receiving team');
    await page.evaluate(() => { window.cadenceFixture.allowRename = true; });
    await lane.getByRole('button', { name: 'Save label' }).click();
    await expect(lane.locator('.native-cadence__stage-labels')).toHaveText('Prepare the receiving team');
    await expect(edit).toHaveAttribute('aria-expanded', 'false');
    await edit.click(); await input.fill('A further draft');
    await lane.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(edit).toHaveAttribute('aria-expanded', 'false');
    await expect(lane.locator('.native-cadence__stage-labels')).toHaveText('Prepare the receiving team');
  });
}
