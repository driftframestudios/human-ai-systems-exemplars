import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, expect, firefox, webkit } from '@playwright/test';

import {
  assertBidirectionalSelectContract,
  assertCustomSelectPresentation,
  assertForcedColorsSelectPresentation,
  assertLabelsLeadControls,
  assertTelemetry,
  inspectLabelControlLayout,
  inspectSelectPresentation,
  monitor,
  startStaticServer,
} from '../../tools/core-architecture-browser-helper.mjs';

const ROUTE = '/visual-fidelity-contracts/labs/data-view-lab/';
const engines = { chromium, firefox, webkit };
const browsers = new Map();
let server;

before(async () => {
  server = await startStaticServer();
  for (const [name, engine] of Object.entries(engines)) browsers.set(name, await engine.launch({ headless: true }));
});

after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function openLab(t, engine, { width = 1280, javaScriptEnabled = true } = {}) {
  const context = await browsers.get(engine).newContext({
    viewport: { width, height: 960 },
    javaScriptEnabled,
    reducedMotion: 'reduce',
  });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const telemetry = monitor(page);
  await page.goto(server.origin + ROUTE, { waitUntil: 'load' });
  if (javaScriptEnabled) await expect(page.locator('[data-data-view-lab]')).toHaveAttribute('data-data-js-state', 'enhanced');
  return { page, telemetry };
}

for (const engine of Object.keys(engines)) {
  test(`${engine}: accepted parity, disclosure, rejection, and narrow containment remain stable`, async t => {
    const { page, telemetry } = await openLab(t, engine, { width: 320 });
    await assertBidirectionalSelectContract(
      page,
      ['#data-decision-need', '#data-authorization'],
      `${engine} data-view lab selects and labels`,
    );
    const machine = JSON.parse(await page.locator('[data-data-machine-twin]').textContent());
    const visible = await page.locator('[data-data-table] tbody tr').evaluateAll(rows => rows.map(row => ({
      id: row.dataset.recordId,
      value: row.querySelector('[data-exact-value]').dataset.exactValue,
      standing: row.querySelector('[data-label="Standing"]').textContent,
    })));
    assert.deepEqual(visible.map(record => record.id), machine.records.map(record => record.id));
    assert.deepEqual(visible.map(record => record.value), machine.records.map(record => record.value === null ? '' : String(record.value)));
    assert.deepEqual(visible.map(record => record.standing.toLowerCase()), machine.records.map(record => record.standing));

    const graphicIds = await page.locator('[data-data-svg] [data-record-id]').evaluateAll(nodes => nodes.map(node => node.dataset.recordId));
    assert.deepEqual(graphicIds, machine.records.map(record => record.id));

    const disclosure = page.locator('[data-data-disclosure]');
    await disclosure.locator('summary').click();
    await expect(disclosure).toHaveJSProperty('open', true);
    await page.locator('[data-data-view]').selectOption('exact-values');
    await expect(disclosure).toHaveJSProperty('open', true);

    await page.locator('[data-fixture="invalid"]').click();
    await expect(page.locator('[data-data-live]')).toContainText('Candidate revision rejected');
    await expect(page.locator('[data-data-standing]')).toHaveText('current');
    await expect(page.locator('[data-data-revision]')).toHaveText('cohort-r1');

    await page.locator('[data-fixture="partial"]').click();
    await expect(page.locator('[data-data-revision]')).toHaveText('cohort-r2-partial');
    await expect(page.locator('[data-data-standing]')).toHaveText('partial');
    await page.locator('[data-fixture="absent"]').click();
    await expect(page.locator('[data-data-revision]')).toHaveText('cohort-r3-absent');
    await expect(page.locator('[data-data-standing]')).toHaveText('absent');
    await expect(page.locator('[data-data-table] tbody tr')).toHaveCount(0);

    await page.locator('[data-data-authorization]').selectOption('held');
    await expect(page.locator('[data-data-authorization-state]')).toHaveText('held');
    const changedMachine = JSON.parse(await page.locator('[data-data-machine-twin]').textContent());
    assert.equal(changedMachine.state.authorization.standing, 'held');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
    assertTelemetry(telemetry);
  });
}

test('Chromium: same-root re-enhancement keeps one data-view owner and final release clears work', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const partialRequests = [];
  page.on('request', request => {
    if (request.url().endsWith('/fixtures/valid/partial.json')) partialRequests.push(request.url());
  });

  const ownership = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/current.json').then(response => response.json());
    const root = document.querySelector('[data-data-view-lab]');
    const { enhanceDataViewLab } = await import('./src/controller.js');
    const first = enhanceDataViewLab(root, fixture);
    const second = enhanceDataViewLab(root, fixture);
    window.__dataViewReentry = { first, second };
    return { first: first.snapshot().ownership, second: second.snapshot().ownership };
  });
  assert.equal(ownership.first.standing, 'released');
  assert.equal(ownership.second.standing, 'active');
  await expect(page.locator('[data-fixture="partial"]')).toBeEnabled();

  await page.locator('[data-fixture="partial"]').click();
  await expect(page.locator('[data-data-revision]')).toHaveText('cohort-r2-partial');
  assert.equal(partialRequests.length, 1, 'one action starts one request after same-root re-enhancement');

  const teardown = await page.evaluate(async () => {
    const pending = window.__dataViewReentry.second.load('current');
    const released = window.__dataViewReentry.second.destroy();
    const settlement = await pending;
    return {
      released,
      settlement: { applied: settlement.applied, reason: settlement.reason },
      final: window.__dataViewReentry.second.snapshot(),
    };
  });
  assert.equal(teardown.released.ownership.standing, 'released');
  assert.equal(teardown.released.request.standing, 'idle');
  assert.deepEqual(teardown.settlement, { applied: false, reason: 'request-aborted' });
  assert.equal(teardown.final.ownership.standing, 'released');
  assert.equal(teardown.final.request.standing, 'idle');

  await page.locator('[data-fixture="partial"]').dispatchEvent('click');
  await page.waitForTimeout(50);
  assert.equal(partialRequests.length, 1, 'released listener ownership leaves later events inert');
  telemetry.requestFailures = telemetry.requestFailures.filter(value => !value.includes('/fixtures/valid/current.json'));
  assertTelemetry(telemetry);
});

test('Chromium: a retired data-view request cannot repaint its same-root successor', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const observation = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/current.json').then(response => response.json());
    const root = document.querySelector('[data-data-view-lab]');
    const { enhanceDataViewLab } = await import('./src/controller.js');
    const retired = window.__dataViewLab;
    const originalFetch = window.fetch;
    let resolveBody;
    let markBodyStarted;
    const bodyStarted = new Promise(resolve => { markBodyStarted = resolve; });
    window.fetch = () => Promise.resolve({
      ok: true,
      status: 200,
      json: () => {
        markBodyStarted();
        return new Promise(resolve => { resolveBody = resolve; });
      },
    });
    try {
      const pending = retired.load('current');
      await bodyStarted;
      const successor = enhanceDataViewLab(root, fixture);
      window.__dataViewLab = successor;
      resolveBody(structuredClone(fixture));
      const settlement = await pending;
      return {
        settlement: { applied: settlement.applied, reason: settlement.reason },
        retired: retired.snapshot().ownership,
        successor: successor.snapshot().ownership,
        rendered: {
          jsState: root.dataset.dataJsState,
          owner: root.querySelector('[data-data-ownership]').textContent,
          request: root.querySelector('[data-data-request]').textContent,
          currentDisabled: root.querySelector('[data-fixture="current"]').disabled,
        },
      };
    } finally {
      window.fetch = originalFetch;
    }
  });
  assert.deepEqual(observation.settlement, { applied: false, reason: 'owner-released' });
  assert.equal(observation.retired.standing, 'released');
  assert.equal(observation.successor.standing, 'active');
  assert.deepEqual(observation.rendered, {
    jsState: 'enhanced',
    owner: 'active · data-view-lab-controller · generation 1',
    request: 'idle',
    currentDisabled: false,
  });
  assertTelemetry(telemetry);
});

test('Chromium: rejected data-view successor preserves the responsive incumbent owner', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const observation = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/current.json').then(response => response.json());
    fixture.records[0].standing = 'absent';
    const incumbent = window.__dataViewLab;
    const before = incumbent.snapshot();
    let message = '';
    try {
      const { enhanceDataViewLab } = await import('./src/controller.js');
      enhanceDataViewLab(document.querySelector('[data-data-view-lab]'), fixture);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    return { message, before: before.ownership, after: incumbent.snapshot().ownership };
  });
  assert.match(observation.message, /value must agree with its standing/u);
  assert.deepEqual(observation.after, observation.before);
  assert.equal(observation.after.standing, 'active');
  await page.locator('[data-data-view]').selectOption('exact-values');
  await expect(page.locator('[data-data-renderer]')).toHaveText('table');
  await page.locator('[data-fixture="partial"]').click();
  await expect(page.locator('[data-data-revision]')).toHaveText('cohort-r2-partial');
  assertTelemetry(telemetry);
});

test('Chromium: data-view listener and live-render admission failures preserve one responsive owner', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const partialRequests = [];
  page.on('request', request => {
    if (request.url().endsWith('/fixtures/valid/partial.json')) partialRequests.push(request.url());
  });

  const observation = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/current.json').then(response => response.json());
    const root = document.querySelector('[data-data-view-lab]');
    const incumbent = window.__dataViewLab;
    const before = incumbent.snapshot();
    const { enhanceDataViewLab } = await import('./src/controller.js');

    const nativeAddEventListener = root.addEventListener;
    let listenerMessage = '';
    root.addEventListener = function addEventListenerWithInjectedFailure(type, listener, options) {
      // Fail after change admission so AbortController cleanup must remove a
      // partially admitted candidate listener set.
      if (type === 'click') throw new Error('injected data-view listener admission failure');
      return nativeAddEventListener.call(this, type, listener, options);
    };
    try {
      enhanceDataViewLab(root, fixture);
    } catch (error) {
      listenerMessage = error instanceof Error ? error.message : String(error);
    } finally {
      root.addEventListener = nativeAddEventListener;
    }

    const table = root.querySelector('[data-data-table]');
    const nativeReplaceChildren = table.replaceChildren;
    let renderMessage = '';
    table.replaceChildren = function replaceChildrenWithInjectedFailure(...children) {
      table.replaceChildren = nativeReplaceChildren;
      throw new Error('injected data-view live-render admission failure');
    };
    try {
      enhanceDataViewLab(root, fixture);
    } catch (error) {
      renderMessage = error instanceof Error ? error.message : String(error);
    } finally {
      table.replaceChildren = nativeReplaceChildren;
    }

    return {
      listenerMessage,
      renderMessage,
      before: before.ownership,
      after: incumbent.snapshot().ownership,
      jsState: root.dataset.dataJsState,
      owner: root.querySelector('[data-data-ownership]').textContent,
      controlsEnabled: [...root.querySelectorAll('[data-data-action="load"], [data-data-view], [data-data-authorization]')]
        .every(control => !control.disabled),
    };
  });

  assert.equal(observation.listenerMessage, 'injected data-view listener admission failure');
  assert.equal(observation.renderMessage, 'injected data-view live-render admission failure');
  assert.deepEqual(observation.after, observation.before);
  assert.equal(observation.after.standing, 'active');
  assert.equal(observation.jsState, 'enhanced');
  assert.match(observation.owner, /^active · data-view-lab-controller/u);
  assert.equal(observation.controlsEnabled, true);

  await page.locator('[data-data-view]').selectOption('exact-values');
  await expect(page.locator('[data-data-renderer]')).toHaveText('table');
  await page.locator('[data-fixture="partial"]').click();
  await expect(page.locator('[data-data-revision]')).toHaveText('cohort-r2-partial');
  assert.equal(partialRequests.length, 1, 'failed candidates release every listener before the incumbent handles the action');
  assert.equal(await page.evaluate(() => window.__dataViewLab.snapshot().ownership.standing), 'active');
  assertTelemetry(telemetry);
});

test('Chromium: data-view owner replacement admits listeners before releasing the incumbent', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const partialRequests = [];
  page.on('request', request => {
    if (request.url().endsWith('/fixtures/valid/partial.json')) partialRequests.push(request.url());
  });

  const rejected = await page.evaluate(() => {
    const root = document.querySelector('[data-data-view-lab]');
    const disclosure = root.querySelector('[data-data-disclosure]');
    const active = window.__dataViewLab;
    const before = active.snapshot();
    const nativeAddEventListener = disclosure.addEventListener;
    let message = '';
    disclosure.addEventListener = function addEventListenerWithInjectedFailure(type, listener, options) {
      if (type === 'toggle') throw new Error('injected data-view owner-bind failure');
      return nativeAddEventListener.call(this, type, listener, options);
    };
    try {
      active.replaceOwner('data-view-owner-b');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    } finally {
      disclosure.addEventListener = nativeAddEventListener;
    }
    return { message, before: before.ownership, after: active.snapshot().ownership };
  });

  assert.equal(rejected.message, 'injected data-view owner-bind failure');
  assert.deepEqual(rejected.after, rejected.before);
  assert.deepEqual(rejected.after, {
    standing: 'active', ownerId: 'data-view-lab-controller', generation: 1,
  });

  await page.locator('[data-fixture="partial"]').click();
  await expect(page.locator('[data-data-revision]')).toHaveText('cohort-r2-partial');
  assert.equal(partialRequests.length, 1, 'the rejected candidate releases every partially bound listener');

  const accepted = await page.evaluate(() => {
    const result = window.__dataViewLab.replaceOwner('data-view-owner-b');
    return { applied: result.applied, ownership: window.__dataViewLab.snapshot().ownership };
  });
  assert.equal(accepted.applied, true);
  assert.deepEqual(accepted.ownership, { standing: 'active', ownerId: 'data-view-owner-b', generation: 2 });

  await page.locator('[data-fixture="partial"]').click();
  await expect(page.locator('[data-data-revision]')).toHaveText('cohort-r2-partial');
  assert.equal(partialRequests.length, 2, 'the accepted replacement leaves exactly one click listener active');
  assertTelemetry(telemetry);
});

test('Chromium: BFCache restoration retains an in-flight data-view startup request', async t => {
  const context = await browsers.get('chromium').newContext({
    viewport: { width: 1280, height: 960 }, reducedMotion: 'reduce',
  });
  t.after(() => context.close());
  const page = await context.newPage();
  const telemetry = monitor(page);
  let releaseFixture;
  let markFixtureRequested;
  const fixtureGate = new Promise(resolve => { releaseFixture = resolve; });
  const fixtureRequested = new Promise(resolve => { markFixtureRequested = resolve; });
  await page.route('**/data-view-lab/fixtures/valid/current.json', async route => {
    markFixtureRequested();
    await fixtureGate;
    await route.continue();
  });

  await page.goto(server.origin + ROUTE, { waitUntil: 'domcontentloaded' });
  await fixtureRequested;
  const retained = await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    return {
      apiPresent: Boolean(window.__dataViewLab),
      jsState: document.querySelector('[data-data-view-lab]').dataset.dataJsState,
    };
  });
  assert.deepEqual(retained, { apiPresent: false, jsState: 'reading' });

  releaseFixture();
  await expect(page.locator('[data-data-view-lab]')).toHaveAttribute('data-data-js-state', 'enhanced');
  await expect(page.locator('[data-fixture="current"]')).toBeEnabled();
  assert.deepEqual(await page.evaluate(() => window.__dataViewLab.snapshot().ownership), {
    standing: 'active', ownerId: 'data-view-lab-controller', generation: 1,
  });
  assertTelemetry(telemetry);
});

test('Chromium: BFCache transition preserves the data-view owner until terminal page release', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const observation = await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    const retained = window.__dataViewLab.snapshot().ownership.standing;
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    return { retained, released: window.__dataViewLab.snapshot().ownership.standing };
  });
  assert.deepEqual(observation, { retained: 'active', released: 'released' });
  await expect(page.locator('[data-fixture="partial"]')).toBeDisabled();
  assertTelemetry(telemetry);
});

test('Chromium: page-two summary, exact-value twin, and table share one selected record', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/current.json').then(response => response.json());
    fixture.revision = 'cohort-r-large';
    fixture.lineage.parentRevision = 'cohort-r1';
    fixture.records.push({
      id: 'archive', label: 'Archive', order: 12, value: 10, standing: 'known',
      group: 'release', observedAt: '2026-10-12', position: { x: 4, y: 88 },
    });
    fixture.relationships.push({
      id: 'follow-up-to-archive', sourceId: 'follow-up', targetId: 'archive',
      label: 'routes completed follow-up to archive',
    });
    const source = document.querySelector('[data-data-view-lab]');
    const root = source.cloneNode(true);
    root.id = 'page-two-summary-lab';
    document.body.append(root);
    const { enhanceDataViewLab } = await import('./src/controller.js');
    enhanceDataViewLab(root, fixture);
  });

  const lab = page.locator('#page-two-summary-lab');
  await lab.locator('[data-data-view]').selectOption('single-status');
  await lab.locator('[data-data-next]').click();
  await expect(lab.locator('[data-data-page]')).toHaveText('2 / 2');
  await expect(lab.locator('[data-data-table] tbody tr')).toHaveCount(1);
  await expect(lab.locator('[data-data-table] tbody tr')).toHaveAttribute('data-record-id', 'archive');
  await expect(lab.locator('[data-data-svg]')).toContainText('Archive');
  await expect(lab.locator('[data-data-svg]')).not.toContainText('Intake');
  const twin = JSON.parse(await lab.locator('[data-data-machine-twin]').textContent());
  assert.deepEqual(twin.records.map(record => record.id), ['archive']);
  assert.equal(twin.selectedRecordId, 'archive');
  assert.equal(twin.selectedRecord.id, 'archive');
  assert.ok(twin.records.some(record => record.id === twin.selectedRecordId));
  assertTelemetry(telemetry);
});

test('Chromium: multiple instances own unique resolved SVG references and connector paint order', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  await page.locator('[data-data-view]').selectOption('relationships');
  await expect(page.locator('[data-data-svg] [data-relationship-id]')).toHaveCount(11);
  await page.locator('[data-data-view]').selectOption('change-over-time');
  await expect(page.locator('[data-data-svg]')).toContainText('2026-10-01');
  await page.locator('[data-data-view]').selectOption('spatial');
  await expect(page.locator('[data-data-svg] svg')).toHaveAttribute('data-renderer', 'spatial');
  await expect(page.locator('[data-data-svg] [data-selected-record-id="intake"]')).toHaveCount(1);
  const observation = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/current.json').then(response => response.json());
    const source = document.querySelector('[data-data-view-lab]');
    const clone = source.cloneNode(true);
    clone.id = 'second-data-view-lab';
    document.body.append(clone);
    const { enhanceDataViewLab } = await import('./src/controller.js');
    const replacementApi = enhanceDataViewLab(clone, fixture);
    const replacement = replacementApi.replaceOwner('second-lab-owner');
    const unchangedReplacement = replacementApi.replaceOwner('second-lab-owner');
    const replacementSnapshot = replacementApi.snapshot();

    const signedFixture = structuredClone(fixture);
    signedFixture.dataViewLabId = 'signed-data-view-lab';
    signedFixture.revision = 'signed-r1';
    signedFixture.records[0].value = -7;
    const signed = source.cloneNode(true);
    signed.id = 'signed-data-view-lab';
    document.body.append(signed);
    enhanceDataViewLab(signed, signedFixture);

    const ids = [...document.querySelectorAll('[data-data-svg] [id]')].map(node => node.id);
    const references = [...document.querySelectorAll('[data-data-svg] [marker-end], [data-data-svg] [clip-path]')].map(node => {
      const value = node.getAttribute('marker-end') ?? node.getAttribute('clip-path');
      const id = value.slice(5, -1);
      return { id, resolved: Boolean(node.closest('svg').querySelector(`[id="${id}"]`)) };
    });
    const layerOrder = [...clone.querySelectorAll('[data-data-svg] [data-layer]')].map(node => node.dataset.layer);
    const baseline = Number(signed.querySelector('[data-zero-baseline]').getAttribute('y1'));
    const negativeMark = signed.querySelector('[data-record-id="intake"] [data-numeric-mark]');
    const negativeY = Number(negativeMark.getAttribute('y'));
    const negativeBottom = negativeY + Number(negativeMark.getAttribute('height'));
    const standingY = Number(signed.querySelector('[data-record-id="board"] [data-standing-mark]').getAttribute('cy'));
    replacementApi.destroy();
    const releasedLoad = await replacementApi.load('unknown-after-release');
    return {
      ids, references, layerOrder, baseline, negativeY, negativeBottom, standingY,
      replacementApplied: replacement.applied,
      unchangedReplacement: { applied: unchangedReplacement.applied, reason: unchangedReplacement.reason },
      replacementOwner: replacementSnapshot.ownership,
      releasedLoad: { applied: releasedLoad.applied, reason: releasedLoad.reason },
    };
  });
  assert.equal(new Set(observation.ids).size, observation.ids.length);
  assert.ok(observation.references.every(reference => reference.resolved));
  assert.ok(observation.layerOrder.indexOf('connectors') < observation.layerOrder.indexOf('marks'));
  assert.ok(observation.layerOrder.indexOf('marks') < observation.layerOrder.indexOf('selection'));
  assert.equal(observation.negativeY, observation.baseline);
  assert.ok(observation.negativeBottom > observation.baseline);
  assert.equal(observation.standingY, observation.baseline);
  assert.equal(observation.replacementApplied, true);
  assert.deepEqual(observation.unchangedReplacement, { applied: false, reason: 'owner-unchanged' });
  assert.deepEqual(observation.replacementOwner, { standing: 'active', ownerId: 'second-lab-owner', generation: 2 });
  assert.deepEqual(observation.releasedLoad, { applied: false, reason: 'owner-released' });
  assertTelemetry(telemetry);
});

test('Chromium: script-independent, enlarged-text, forced-color, and print routes retain useful reading', async t => {
  const staticView = await openLab(t, 'chromium', { width: 320, javaScriptEnabled: false });
  await expect(staticView.page.locator('.status-banner--reading')).toContainText('single-file reading artifact');
  await expect(staticView.page.locator('.controls')).toBeHidden();
  await expect(staticView.page.locator('a[href="./standalone/"]').first()).toBeVisible();
  assert.equal(await staticView.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
  assertTelemetry(staticView.telemetry);

  await staticView.page.goto(server.origin + ROUTE + 'standalone/', { waitUntil: 'load' });
  await expect(staticView.page.locator('[data-record-id]')).toHaveCount(12);
  await expect(staticView.page.locator('[data-relationship-id]')).toHaveCount(11);
  await expect(staticView.page.locator('.boundary')).toContainText('static reading document');
  assertTelemetry(staticView.telemetry);

  const enhanced = await openLab(t, 'chromium', { width: 390 });
  assertCustomSelectPresentation(
    await inspectSelectPresentation(enhanced.page, ['#data-decision-need', '#data-authorization']),
    'data-view lab ordinary colors',
  );
  await enhanced.page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assertLabelsLeadControls(
    await inspectLabelControlLayout(enhanced.page, ['#data-decision-need', '#data-authorization']),
    'data-view lab at 390px and 200% text',
  );
  assert.equal(await enhanced.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
  await enhanced.page.emulateMedia({ forcedColors: 'active' });
  await expect(enhanced.page.locator('[data-data-live]')).toBeVisible();
  assertForcedColorsSelectPresentation(
    await inspectSelectPresentation(enhanced.page, ['#data-decision-need', '#data-authorization']),
    'data-view lab forced colors',
  );
  await enhanced.page.emulateMedia({ media: 'print', forcedColors: 'none' });
  await expect(enhanced.page.locator('.controls')).toBeHidden();
  await expect(enhanced.page.locator('.evidence-boundary')).toBeVisible();
  assertTelemetry(enhanced.telemetry);
});
