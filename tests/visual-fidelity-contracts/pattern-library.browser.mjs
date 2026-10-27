import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';

import { assertTelemetry, monitor, startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
let server;

test.before(async () => {
  server = await startStaticServer();
});

test.after(async () => {
  await server?.close();
});

for (const [engineName, engine] of Object.entries(engines)) {
  test(`${engineName} reads four pattern families and their semantic companions at 320 CSS pixels`, async t => {
    const browser = await engine.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({ viewport: { width: 320, height: 800 }, reducedMotion: 'reduce' });
    const telemetry = monitor(page);
    await page.goto(`${server.origin}/visual-fidelity-contracts/examples/index.html`);
    await page.addStyleTag({ content: ':root { font-size: 200% !important; }' });
    await page.locator('.pattern').first().scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.pattern').count(), 4);
    assert.equal(await page.locator('figure img').count(), 4);
    const summary = page.locator('.pattern__companion summary').first();
    await summary.focus();
    await summary.press('Enter');
    assert.equal(await page.locator('.pattern__companion').first().getAttribute('open'), '');
    const overflow = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(overflow.scroll <= overflow.client + 1, JSON.stringify(overflow));
    assertTelemetry(telemetry);
  });
}

test('the gallery retains its reading when image delivery is unavailable', async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const telemetry = monitor(page);
  await page.route('**/*.webp', route => route.abort('failed'));
  const failedImageRequest = page.waitForEvent('requestfailed', {
    predicate: request => request.url().endsWith('.webp'),
  });
  await page.goto(`${server.origin}/visual-fidelity-contracts/examples/index.html`);
  await page.locator('figure img').first().scrollIntoViewIfNeeded();
  await failedImageRequest;
  assert.equal(await page.locator('.pattern h2').allTextContents().then(values => values.length), 4);
  assert.equal(await page.locator('figcaption').count(), 4);
  assert.equal(await page.locator('.pattern__companion').count(), 4);
  assert.equal(telemetry.pageErrors.length, 0);
  assert.equal(telemetry.responseErrors.length, 0);
  assert.ok(telemetry.requestFailures.length >= 1);
  assert.ok(telemetry.requestFailures.every(failure => failure.includes('.webp')));
  assert.ok(telemetry.consoleErrors.every(message => /failed to load resource/iu.test(message)));
});

test('forced colors preserve patterns, links, figures, and local table boundaries', async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, forcedColors: 'active' });
  const telemetry = monitor(page);
  await page.goto(`${server.origin}/visual-fidelity-contracts/examples/index.html`);
  const reading = await page.locator('.pattern').first().evaluate(node => {
    const style = getComputedStyle(node);
    return { display: style.display, border: style.borderTopStyle, heading: node.querySelector('h2')?.textContent };
  });
  assert.notEqual(reading.display, 'none');
  assert.equal(reading.border, 'solid');
  assert.match(reading.heading, /Industrial Ink/u);
  assertTelemetry(telemetry);
});

for (const [engineName, engine] of Object.entries(engines)) {
  test(`${engineName} exercises component authority and data-view recovery`, async t => {
    const browser = await engine.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const telemetry = monitor(page);

    await page.goto(`${server.origin}/visual-fidelity-contracts/labs/component-lab/index.html`);
    await page.locator('[data-component-data]').getByText(/current data/iu).waitFor();
    await page.locator('#component-email').fill('browser@example.invalid');
    await page.locator('#component-authorization').selectOption('allowed');
    await page.locator('[data-component-form]').evaluate(form => form.requestSubmit());
    await page.locator('[data-component-receipt][data-standing="accepted"]').waitFor();
    const opener = page.locator('[data-component-action="open-dialog"]');
    await opener.click();
    await page.locator('[data-component-dialog]').waitFor({ state: 'visible' });
    await page.locator('[data-component-action="close-dialog"]').click();
    await assertFocused(page, '[data-component-action="open-dialog"]');

    await page.goto(`${server.origin}/visual-fidelity-contracts/labs/data-view-lab/index.html`);
    await page.locator('[data-data-revision]').getByText(/cohort-r1/iu).waitFor();
    await page.locator('[data-data-action="load"][data-fixture="partial"]').click();
    await page.locator('[data-data-standing]').getByText(/partial/iu).waitFor();
    const acceptedRevision = await page.locator('[data-data-revision]').textContent();
    await page.locator('[data-data-action="load"][data-fixture="invalid"]').click();
    await page.locator('[data-data-live]').getByText(/rejected/iu).waitFor();
    assert.equal(await page.locator('[data-data-revision]').textContent(), acceptedRevision);
    await page.locator('[data-data-action="load"][data-fixture="current"]').click();
    await page.locator('[data-data-live]').getByText(/rejected/iu).waitFor();
    assert.equal(await page.locator('[data-data-revision]').textContent(), acceptedRevision);
    await page.locator('[data-data-action="load"][data-fixture="absent"]').click();
    await page.locator('[data-data-standing]').getByText(/absent/iu).waitFor();
    const overflow = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(overflow.scroll <= overflow.client + 1, JSON.stringify(overflow));
    assertTelemetry(telemetry);
  });
}

test('JavaScript-disabled lab routes retain an explicit reading representation', async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const route of ['component-lab', 'data-view-lab']) {
    await page.goto(`${server.origin}/visual-fidelity-contracts/labs/${route}/index.html`);
    await page.locator('noscript .status-banner--reading').getByText(/Reading representation/iu).waitFor();
  }
  await page.goto(`${server.origin}/visual-fidelity-contracts/labs/service-boundary-lab/index.html`);
  await page.locator('.static-reading').getByText(/accepted record/iu).waitFor();
  assert.equal(await page.locator('[data-enhance-control]:enabled').count(), 0);
  await context.close();
});

async function assertFocused(page, selector) {
  assert.equal(await page.locator(selector).evaluate(node => node === document.activeElement), true);
}
