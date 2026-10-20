import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, expect, firefox, webkit } from '@playwright/test';

import {
  assertCustomSelectPresentation,
  assertForcedColorsSelectPresentation,
  assertLabelsLeadControls,
  assertTelemetry,
  inspectLabelControlLayout,
  inspectSelectPresentation,
  monitor,
  startStaticServer,
} from '../../tools/core-architecture-browser-helper.mjs';

const ROUTE = '/visual-fidelity-contracts/labs/component-lab/';
const browsers = new Map();
let server;

before(async () => {
  server = await startStaticServer();
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    browsers.set(name, await engine.launch({ headless: true }));
  }
});

after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function openLab(t, engine, { width = 1280, javaScriptEnabled = true } = {}) {
  const context = await browsers.get(engine).newContext({ viewport: { width, height: 900 }, javaScriptEnabled, reducedMotion: 'reduce' });
  t.after(() => context.close());
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(server.origin + ROUTE, { waitUntil: 'load' });
  if (javaScriptEnabled) await expect(page.locator('[data-component-revision]')).toHaveText('catalog-r1');
  return { page, telemetry };
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: selection, disclosure, dialog focus, and candidate recovery retain continuity`, async t => {
    const { page, telemetry } = await openLab(t, engine, { width: 390 });

    await expect(page.locator('[data-component-lab]')).toHaveAttribute('data-component-js-state', 'enhanced');
    const firstChoice = page.locator('input[value="field-notebook"]');
    const choice = page.locator('input[value="review-cards"]');
    await expect(firstChoice).toBeEnabled();
    await expect(page.locator('[data-component-action="reload"]')).toBeEnabled();
    await expect(page.locator('#component-email')).toBeEnabled();
    await expect(page.locator('#component-authorization')).toBeEnabled();
    await expect(page.locator('[data-component-submit]')).toBeEnabled();
    await expect(page.locator('[data-component-action="open-dialog"]')).toBeEnabled();
    await firstChoice.focus();
    await page.keyboard.press('ArrowDown');
    await expect(choice).toBeChecked();
    await expect(choice).toBeFocused();

    const disclosure = page.locator('[data-component-disclosure]');
    await disclosure.locator('summary').click();
    await expect(disclosure).toHaveJSProperty('open', true);
    await page.locator('#component-email').fill('reader@example.org');
    await expect(disclosure).toHaveJSProperty('open', true);

    const opener = page.locator('[data-component-action="open-dialog"]');
    await opener.click();
    await expect(page.locator('[data-component-dialog]')).toBeVisible();
    await page.locator('[data-component-action="close-dialog"]').click();
    await expect(opener).toBeFocused();

    await page.locator('[data-component-action="load-invalid"]').click();
    await expect(page.locator('[data-component-live]')).toContainText('Candidate revision rejected');
    await expect(page.locator('[data-component-data]')).toHaveText('Current data');
    await expect(page.locator('[data-component-revision]')).toHaveText('catalog-r1');

    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(width.scroll <= width.client + 1, `${engine} keeps page-level overflow bounded: ${JSON.stringify(width)}`);
    assertTelemetry(telemetry);
  });
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: same-root handoff keeps visible draft values and the owned intent envelope aligned`, async t => {
    const { page, telemetry } = await openLab(t, engine);
    await page.locator('input[value="review-cards"]').check();
    await page.locator('#component-email').fill('handoff@example.org');
    await page.locator('#component-quantity').fill('2');
    await page.locator('#component-authorization').selectOption('allowed');

    const handoff = await page.evaluate(async () => {
      const fixture = await fetch('./fixtures/valid/catalog.json').then(response => response.json());
      const root = document.querySelector('[data-component-lab]');
      const incumbent = window.__componentLab;
      const { enhanceComponentLab } = await import('./src/controller.js');
      const successor = enhanceComponentLab(root, fixture);
      window.__componentLab = successor;
      return {
        incumbent: incumbent.snapshot().ownership,
        successor: successor.snapshot(),
      };
    });

    assert.equal(handoff.incumbent.standing, 'released');
    assert.equal(handoff.successor.ownership.standing, 'active');
    assert.deepEqual(handoff.successor.selection, { sku: 'review-cards' });
    assert.deepEqual(handoff.successor.draft, { email: 'handoff@example.org', quantity: '2' });
    assert.deepEqual(handoff.successor.authorization, { standing: 'allowed' });
    await expect(page.locator('input[value="review-cards"]')).toBeChecked();
    await expect(page.locator('#component-email')).toHaveValue('handoff@example.org');
    await expect(page.locator('#component-quantity')).toHaveValue('2');
    await expect(page.locator('#component-authorization')).toHaveValue('allowed');

    await page.locator('[data-component-submit]').click();
    await expect(page.locator('[data-component-receipt-standing]')).toHaveText('provisional');
    const intent = await page.evaluate(() => window.__componentLab.snapshot().commerce.intent);
    assert.deepEqual(intent, {
      intentId: 'intent-catalog-r1-1',
      ownerGeneration: 1,
      fixtureId: 'visual-fidelity-component-lab',
      fixtureRevision: 'catalog-r1',
      authorizationStanding: 'allowed',
      sku: 'review-cards',
      email: 'handoff@example.org',
      quantity: 2,
      unitPriceCents: 2400,
      totalCents: 4800,
    });
    assertTelemetry(telemetry);
  });
}

test('Chromium: unrelated valid component meaning cannot inherit incumbent local work', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  await page.locator('#component-email').fill('incumbent@example.org');
  await page.locator('#component-quantity').fill('2');
  await page.locator('#component-authorization').selectOption('allowed');

  const rejection = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/catalog.json').then(response => response.json());
    fixture.componentLabId = 'unrelated-component-lab';
    const root = document.querySelector('[data-component-lab]');
    const incumbent = window.__componentLab;
    const { enhanceComponentLab } = await import('./src/controller.js');
    let message = '';
    try {
      enhanceComponentLab(root, fixture);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    return {
      message,
      ownership: incumbent.snapshot().ownership,
      draft: incumbent.snapshot().draft,
      visibleDraft: {
        email: root.querySelector('#component-email').value,
        quantity: root.querySelector('#component-quantity').value,
      },
    };
  });

  assert.match(rejection.message, /retain the incumbent componentLabId/u);
  assert.equal(rejection.ownership.standing, 'active');
  assert.deepEqual(rejection.draft, { email: 'incumbent@example.org', quantity: '2' });
  assert.deepEqual(rejection.visibleDraft, rejection.draft);
  await page.locator('[data-component-submit]').click();
  await expect(page.locator('[data-component-receipt-standing]')).toHaveText('provisional');
  const intent = await page.evaluate(() => window.__componentLab.snapshot().commerce.intent);
  assert.equal(intent.fixtureId, 'visual-fidelity-component-lab');
  assert.equal(intent.email, 'incumbent@example.org');
  assert.equal(intent.quantity, 2);
  assertTelemetry(telemetry);
});

test('Chromium: same-root re-enhancement keeps one component owner and final release clears work', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const invalidRequests = [];
  page.on('request', request => {
    if (request.url().endsWith('/fixtures/invalid/missing-lineage.json')) invalidRequests.push(request.url());
  });

  const ownership = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/catalog.json').then(response => response.json());
    const root = document.querySelector('[data-component-lab]');
    const { enhanceComponentLab } = await import('./src/controller.js');
    const first = enhanceComponentLab(root, fixture);
    const second = enhanceComponentLab(root, fixture);
    window.__componentReentry = { first, second };
    return { first: first.snapshot().ownership, second: second.snapshot().ownership };
  });
  assert.equal(ownership.first.standing, 'released');
  assert.equal(ownership.second.standing, 'active');

  await page.locator('[data-component-action="load-invalid"]').click();
  await expect(page.locator('[data-component-live]')).toContainText('Candidate revision rejected');
  assert.equal(invalidRequests.length, 1, 'one action starts one request after same-root re-enhancement');

  await page.locator('#component-email').fill('reader@example.org');
  await page.locator('#component-authorization').selectOption('allowed');
  await page.locator('[data-component-submit]').click();
  await expect(page.locator('[data-component-receipt-standing]')).toHaveText('provisional');
  const released = await page.evaluate(() => window.__componentReentry.second.destroy());
  assert.equal(released.ownership.standing, 'released');
  assert.equal(released.request.standing, 'idle');
  assert.equal(released.receipt.standing, 'absent');
  await expect(page.locator('[data-component-lab]')).toHaveAttribute('data-component-js-state', 'released');
  await expect(page.locator('[data-component-action="load-invalid"]')).toBeDisabled();

  await page.waitForTimeout(550);
  const afterTimer = await page.evaluate(() => window.__componentReentry.second.snapshot());
  assert.equal(afterTimer.ownership.standing, 'released');
  assert.equal(afterTimer.receipt.standing, 'absent', 'release clears reconciliation work before its timer can settle');
  await page.locator('[data-component-action="load-invalid"]').dispatchEvent('click');
  await page.waitForTimeout(50);
  assert.equal(invalidRequests.length, 1, 'released listener ownership leaves later events inert');
  assertTelemetry(telemetry);
});

test('Chromium: a retired component request cannot repaint its same-root successor', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const observation = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/catalog.json').then(response => response.json());
    const root = document.querySelector('[data-component-lab]');
    const { enhanceComponentLab } = await import('./src/controller.js');
    const retired = window.__componentLab;
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
      const successor = enhanceComponentLab(root, fixture);
      window.__componentLab = successor;
      resolveBody(structuredClone(fixture));
      const settlement = await pending;
      return {
        settlement: { applied: settlement.applied, reason: settlement.reason },
        retired: retired.snapshot().ownership,
        successor: successor.snapshot().ownership,
        rendered: {
          jsState: root.dataset.componentJsState,
          ownerStanding: root.dataset.ownerStanding,
          request: root.querySelector('[data-component-request]').textContent,
          reloadDisabled: root.querySelector('[data-component-action="reload"]').disabled,
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
    jsState: 'enhanced', ownerStanding: 'active', request: 'Ready', reloadDisabled: false,
  });
  assertTelemetry(telemetry);
});

test('Chromium: rejected component successor preserves the responsive incumbent owner', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const observation = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/catalog.json').then(response => response.json());
    fixture.lineage.source = '   ';
    const incumbent = window.__componentLab;
    const before = incumbent.snapshot();
    let message = '';
    try {
      const { enhanceComponentLab } = await import('./src/controller.js');
      enhanceComponentLab(document.querySelector('[data-component-lab]'), fixture);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    return { message, before: before.ownership, after: incumbent.snapshot().ownership };
  });
  assert.match(observation.message, /lineage\.source/u);
  assert.deepEqual(observation.after, observation.before);
  assert.equal(observation.after.standing, 'active');
  await page.locator('#component-email').fill('incumbent@example.org');
  await expect(page.locator('#component-email')).toHaveValue('incumbent@example.org');
  await page.locator('[data-component-action="load-invalid"]').click();
  await expect(page.locator('[data-component-live]')).toContainText('Candidate revision rejected');
  assertTelemetry(telemetry);
});

test('Chromium: component listener and live-render admission failures preserve one responsive owner', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const invalidRequests = [];
  page.on('request', request => {
    if (request.url().endsWith('/fixtures/invalid/missing-lineage.json')) invalidRequests.push(request.url());
  });
  await page.locator('#component-email').fill('rollback@example.org');
  await page.locator('#component-quantity').fill('3');

  const observation = await page.evaluate(async () => {
    const fixture = await fetch('./fixtures/valid/catalog.json').then(response => response.json());
    const root = document.querySelector('[data-component-lab]');
    const incumbent = window.__componentLab;
    const before = incumbent.snapshot();
    const { enhanceComponentLab } = await import('./src/controller.js');

    const nativeAddEventListener = root.addEventListener;
    let listenerMessage = '';
    root.addEventListener = function addEventListenerWithInjectedFailure(type, listener, options) {
      // Fail after change/input/submit admission so AbortController cleanup
      // must remove a partially admitted candidate listener set.
      if (type === 'click') throw new Error('injected component listener admission failure');
      return nativeAddEventListener.call(this, type, listener, options);
    };
    try {
      enhanceComponentLab(root, fixture);
    } catch (error) {
      listenerMessage = error instanceof Error ? error.message : String(error);
    } finally {
      root.addEventListener = nativeAddEventListener;
    }

    const issueList = root.querySelector('[data-component-issues]');
    const nativeReplaceChildren = issueList.replaceChildren;
    let renderMessage = '';
    issueList.replaceChildren = function replaceChildrenWithInjectedFailure(...children) {
      issueList.replaceChildren = nativeReplaceChildren;
      throw new Error('injected component live-render admission failure');
    };
    try {
      enhanceComponentLab(root, fixture);
    } catch (error) {
      renderMessage = error instanceof Error ? error.message : String(error);
    } finally {
      issueList.replaceChildren = nativeReplaceChildren;
    }

    return {
      listenerMessage,
      renderMessage,
      before: before.ownership,
      after: incumbent.snapshot().ownership,
      jsState: root.dataset.componentJsState,
      ownerStanding: root.dataset.ownerStanding,
      draft: incumbent.snapshot().draft,
      visibleDraft: {
        email: root.querySelector('#component-email').value,
        quantity: root.querySelector('#component-quantity').value,
      },
      controlsEnabled: [...root.querySelectorAll('[data-component-action], input, select, [data-component-submit]')]
        .every(control => !control.disabled),
    };
  });

  assert.equal(observation.listenerMessage, 'injected component listener admission failure');
  assert.equal(observation.renderMessage, 'injected component live-render admission failure');
  assert.deepEqual(observation.after, observation.before);
  assert.equal(observation.after.standing, 'active');
  assert.equal(observation.jsState, 'enhanced');
  assert.equal(observation.ownerStanding, 'active');
  assert.deepEqual(observation.draft, { email: 'rollback@example.org', quantity: '3' });
  assert.deepEqual(observation.visibleDraft, observation.draft);
  assert.equal(observation.controlsEnabled, true);

  await page.locator('[data-component-action="load-invalid"]').click();
  await expect(page.locator('[data-component-live]')).toContainText('Candidate revision rejected');
  assert.equal(invalidRequests.length, 1, 'failed candidates release every listener before the incumbent handles the action');
  assert.equal(await page.evaluate(() => window.__componentLab.snapshot().ownership.standing), 'active');
  assertTelemetry(telemetry);
});

test('Chromium: BFCache restoration retains an in-flight component startup request', async t => {
  const context = await browsers.get('chromium').newContext({
    viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce',
  });
  t.after(() => context.close());
  const page = await context.newPage();
  const telemetry = monitor(page);
  let releaseFixture;
  let markFixtureRequested;
  const fixtureGate = new Promise(resolve => { releaseFixture = resolve; });
  const fixtureRequested = new Promise(resolve => { markFixtureRequested = resolve; });
  await page.route('**/component-lab/fixtures/valid/catalog.json', async route => {
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
      apiPresent: Boolean(window.__componentLab),
      jsState: document.querySelector('[data-component-lab]').dataset.componentJsState,
    };
  });
  assert.deepEqual(retained, { apiPresent: false, jsState: 'reading' });

  releaseFixture();
  await expect(page.locator('[data-component-lab]')).toHaveAttribute('data-component-js-state', 'enhanced');
  await expect(page.locator('[data-component-action="reload"]')).toBeEnabled();
  assert.deepEqual(await page.evaluate(() => window.__componentLab.snapshot().ownership), {
    standing: 'active', ownerId: 'component-lab-controller', generation: 1,
  });
  assertTelemetry(telemetry);
});

test('Chromium: BFCache transition preserves the component owner until terminal page release', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const observation = await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    const retained = window.__componentLab.snapshot().ownership.standing;
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    return { retained, released: window.__componentLab.snapshot().ownership.standing };
  });
  assert.deepEqual(observation, { retained: 'active', released: 'released' });
  await expect(page.locator('[data-component-action="reload"]')).toBeDisabled();
  assertTelemetry(telemetry);
});

test('Chromium: commerce envelope, enlarged text, forced colors, and print remain inspectable', async t => {
  const { page, telemetry } = await openLab(t, 'chromium', { width: 320 });
  assertCustomSelectPresentation(
    await inspectSelectPresentation(page, ['#component-authorization']),
    'component lab ordinary colors',
  );
  await page.locator('#component-email').fill('reader@example.org');
  await page.locator('[data-component-submit]').click();
  await expect(page.locator('[data-component-live]')).toContainText('Choose an authorization outcome');
  await expect(page.locator('#component-authorization')).toBeFocused();
  await page.locator('#component-authorization').selectOption('held');
  await page.locator('[data-component-submit]').click();
  await expect(page.locator('[data-component-live]')).toContainText('Authorization is held for review');
  await expect(page.locator('#component-authorization')).toBeFocused();
  await page.locator('#component-authorization').selectOption('denied');
  await page.locator('[data-component-submit]').click();
  await expect(page.locator('[data-component-live]')).toContainText('Authorization is denied for this role');
  await expect(page.locator('#component-authorization')).toBeFocused();
  await page.locator('#component-authorization').selectOption('allowed');
  await page.locator('[data-component-submit]').click();
  await expect(page.locator('[data-component-receipt]')).toBeVisible();
  await expect(page.locator('[data-component-receipt-context]')).toContainText('field-notebook');
  await expect(page.locator('[data-component-receipt-standing]')).toHaveText('accepted', { timeout: 3000 });
  await expect(page.locator('[data-component-payment]')).toHaveText('accepted');
  await expect(page.locator('[data-component-order]')).toHaveText('accepted');

  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assertLabelsLeadControls(
    await inspectLabelControlLayout(page, ['#component-email', '#component-quantity', '#component-authorization']),
    'component lab at 320px and 200% text',
  );
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(width.scroll <= width.client + 1, `enlarged component lab keeps page-level overflow bounded: ${JSON.stringify(width)}`);

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(page.locator('[data-component-submit]')).toBeVisible();
  assertForcedColorsSelectPresentation(
    await inspectSelectPresentation(page, ['#component-authorization']),
    'component lab forced colors',
  );
  await page.emulateMedia({ media: 'print', forcedColors: 'none', reducedMotion: 'reduce' });
  await expect(page.locator('.lab-header')).toBeVisible();
  await expect(page.locator('.operating-state')).toBeVisible();
  assertTelemetry(telemetry);
});

test('Chromium: script-independent route and standalone artifact retain the accepted reading', async t => {
  const { page, telemetry } = await openLab(t, 'chromium', { width: 320, javaScriptEnabled: false });
  await expect(page.locator('[data-component-lab]')).toHaveAttribute('data-component-js-state', 'reading');
  await expect(page.locator('.status-banner--reading')).toContainText('accepted catalog contains Field notebook');
  await expect(page.locator('.status-banner--reading a')).toHaveAttribute('href', './standalone/');
  await expect(page.locator('[data-component-live]')).toContainText('Reading view');
  await expect(page.locator('[data-component-catalog]')).toContainText('Field notebook');
  await expect(page.locator('[data-component-catalog]')).toContainText('$18.00 · 12 available');
  const baseline = await page.locator('[data-component-lab]').evaluate(root => {
    const controls = [...root.querySelectorAll('button, input, select')];
    const form = root.querySelector('[data-component-form]');
    return {
      controlCount: controls.length,
      enabledCount: controls.filter(control => !control.disabled).length,
      formDestination: new URL(form.action).pathname,
      formMethod: form.method,
    };
  });
  assert.ok(baseline.controlCount > 0);
  assert.equal(baseline.enabledCount, 0, 'the reading baseline leaves transactional controls unavailable');
  assert.equal(baseline.formDestination, `${ROUTE}standalone/`);
  assert.equal(baseline.formMethod, 'get');
  await expect(page.locator('[data-component-dialog]')).toBeHidden();
  await page.locator('.status-banner--reading a').click();
  await expect(page.locator('[data-fixture-revision="catalog-r1"]')).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(3);
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(width.scroll <= width.client + 1, `script-independent artifact keeps page-level overflow bounded: ${JSON.stringify(width)}`);
  assertTelemetry(telemetry);
});
