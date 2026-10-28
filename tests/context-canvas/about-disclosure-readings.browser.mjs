import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { assertTelemetry, monitor, startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const route = '/context-canvas-project-surface/context-canvas/index.html';
const captureRoot = resolve(import.meta.dirname, '../../.visual-runs/about-disclosure-readings');
const folios = [
  { key: 'career', closed: 'Show 4 more career records', opened: 'Hide 4 additional career records', records: [
    ['career-case-2', 'Modernization while work continued', 'LIMS, ELN, ITSM, genome visualization'],
    ['career-case-3', 'Multiple-account abuse login pathways', 'Multiple-account abuse crossed interface'],
    ['career-case-1', 'Silent bulk-export boundary', 'A build-versus-buy evaluation exposed records'],
    ['career-case-4', 'Token life versus key propagation', 'EHR JSON Web Tokens expired five minutes'],
    ['career-case-5', 'A shared language without flattened expertise', 'Business units, scientists, designers'],
    ['career-case-6', 'Applied systems work through a studio', 'Healthcare and research teams need practical ways'],
  ] },
  { key: 'quality', closed: 'Show 5 more quality records', opened: 'Hide 5 additional quality records', records: [
    ['quality-case-2', 'Validation-ready implementation path', 'SaMD, internal systems, clinical-trial software'],
    ['quality-case-3', 'Adverse-event signal attention', 'Post-market and pharmacovigilance teams'],
    ['quality-case-1', 'Inspectable behavior before implementation hardens', 'Teams needed to connect intended use'],
    ['quality-case-4', 'Deletion includes the forgotten stores', 'Deletion requests could leave discoverable traces'],
    ['quality-case-5', 'Seasonality and service anomalies', 'Batch data and service-level metrics'],
    ['quality-case-6', 'Evidence that travels into review', 'Clinical, product, engineering, quality'],
    ['quality-case-7', 'Lifecycle quality for public-benefit work', 'Research, education, and public-benefit technology'],
  ] },
];
const promptRows = ['Source diet', 'Desired state', 'Role boundary', 'Input sanitation', 'Working set'];
const promptDisclosure = {
  closed: 'Show the static five-condition overview and semantic table',
  opened: 'Hide the static five-condition overview and semantic table',
};
const disclosureSelector = '.about-folio-disclosure, .about-prompt-static';
const engines = { chromium, firefox, webkit };
const browsers = new Map();
let server;
before(async () => { await mkdir(captureRoot, { recursive: true }); server = await startStaticServer(); });
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function session(engine, options = {}) {
  if (!browsers.has(engine)) browsers.set(engine, await engines[engine].launch());
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  await context.route('**/*', request => {
    if (new URL(request.request().url()).origin === server.origin) return request.continue();
    // This parent-reading observation leaves separately owned hosted instruments
    // and media outside its source boundary while preserving their carrier DOM.
    return request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separately owned hosted surface</title>' });
  });
  const page = await context.newPage();
  const telemetry = monitor(page);
  try {
    await page.goto(server.origin + route, { waitUntil: 'load' });
    await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded');
    return { page, context, async close() { try { assertTelemetry(telemetry); } finally { await context.close(); } } };
  } catch (error) { await context.close(); throw error; }
}

function folio(page, definition) { return page.locator(`.about-folio--${definition.key}`); }
async function assertMembership(page) {
  for (const definition of folios) {
    const records = folio(page, definition).locator('.about-folio-case');
    assert.deepEqual(await records.evaluateAll(nodes => nodes.map(node => node.dataset.sourceId)), definition.records.map(record => record[0]));
    assert.deepEqual(await records.locator('h4').allTextContents(), definition.records.map(record => record[1]));
  }
  assert.deepEqual(await page.locator('.about-prompt-static tbody th[scope="row"]').allTextContents(), promptRows);
}

async function assertVisibleText(locator, label) {
  const observations = await locator.evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    const containingBox = (element.closest('.about-folio-case, td, th') ?? element).getBoundingClientRect();
    const fragments = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const word of node.textContent.matchAll(/\S+/gu)) {
        range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
        fragments.push(...[...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0)
          .map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })));
      }
    }
    // Native visibility observes CSS-expanded print content. Playwright's
    // WebKit fallback treats every closed-details descendant as hidden.
    return { visible: element.checkVisibility(), text: element.textContent.trim(),
      box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height },
      containingBox: { top: containingBox.top, bottom: containingBox.bottom },
      viewport: innerWidth, fragments };
  }));
  assert.ok(observations.length > 0, `${label}: expected text population is present`);
  for (const observed of observations) {
    assert.equal(observed.visible, true, `${label}: native content visibility exposes the reading`);
    assert.ok(observed.text.length > 0 && observed.fragments.length > 0, `${label}: substantive text has rendered fragments`);
    assert.ok(observed.box.width > 0 && observed.box.height > 0, `${label}: reading has positive geometry`);
    assert.ok(observed.box.left >= -1 && observed.box.right <= observed.viewport + 1, `${label}: reading fits the receiving width`);
    assert.ok(observed.fragments.every(fragment => fragment.left >= observed.box.left - 1 && fragment.right <= observed.box.right + 1), `${label}: text fits its field width`);
    assert.ok(observed.fragments.every(fragment => fragment.top >= observed.containingBox.top - 1 && fragment.bottom <= observed.containingBox.bottom + 1), `${label}: text retains vertical reach inside its record or cell`);
  }
}

async function assertRecords(page, definition) {
  for (const [id, title, situation] of definition.records) {
    const record = page.locator(`[data-source-id="${id}"]`);
    assert.equal(await record.locator('h4').textContent(), title);
    assert.deepEqual(await record.locator('dt').allTextContents(), ['Situation', 'Mechanism', 'Changed work', 'Boundary']);
    assert.ok((await record.locator('dd').first().textContent()).startsWith(situation), `${id}: the named situation survives`);
    assert.equal(await record.locator('dd').count(), 4);
    assert.ok((await record.locator('dd').allTextContents()).every(text => text.trim().length > 35), `${id}: each named field carries substantive content`);
    await assertVisibleText(record.locator('h4, dt, dd'), id);
  }
}
async function assertCompletePrint(page) {
  assert.equal(await page.evaluate(() => matchMedia('print').matches), true);
  await assertMembership(page);
  for (const definition of folios) await assertRecords(page, definition);
  await assertVisibleText(page.locator('.about-prompt-static caption, .about-prompt-static th, .about-prompt-static td'), 'five-condition print reading');
  assert.equal(await page.locator('.about-prompt-static tbody tr').count(), 5);
}
async function states(page) { return page.locator(disclosureSelector).evaluateAll(nodes => nodes.map(node => node.open)); }
async function injectStyle(page, css) {
  // Synchronous insertion also operates in a scriptless page; it leaves CSS
  // load-event promises outside the controlled fault's observation boundary.
  return page.evaluateHandle(content => {
    const style = document.createElement('style'); style.textContent = content; document.head.append(style); return style;
  }, css);
}
async function toggleNative(page, detail) {
  const summary = detail.locator(':scope > summary');
  await summary.scrollIntoViewIfNeeded(); await summary.focus(); await summary.press('Enter');
  await expect(summary).toBeFocused();
  const focus = await summary.evaluate(node => ({ visible: node.checkVisibility(), outline: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
  assert.equal(focus.visible, true, 'the native disclosure summary remains visible');
  assert.ok(focus.outline !== 'none' && focus.width > 0, 'keyboard focus has a visible outline');
}
async function assertSummary(detail, definition, open) {
  assert.equal(await detail.evaluate(node => node.open), open);
  await expect(detail.locator(open ? '.about-disclosure__hide' : '.about-disclosure__show')).toBeVisible();
  await expect(detail.locator(open ? '.about-disclosure__show' : '.about-disclosure__hide')).toBeHidden();
  const expected = open ? definition.opened : definition.closed;
  assert.equal(await detail.locator(open ? '.about-disclosure__hide' : '.about-disclosure__show').textContent(), expected);
  await expect(detail.locator(':scope > summary')).toHaveAccessibleName(expected);
  await assertVisibleText(detail.locator(open ? '.about-disclosure__hide' : '.about-disclosure__show'), 'native disclosure action');
}
async function assertPromptReading(page, visible) {
  assert.deepEqual(await page.locator('.about-prompt-static tbody th[scope="row"]').allTextContents(), promptRows);
  const rows = await page.locator('.about-prompt-static tbody tr').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return node.checkVisibility() && box.width > 0 && box.height > 0;
  }));
  assert.deepEqual(rows, Array(5).fill(visible), 'the native action controls the complete five-row reading');
}
async function exercisePromptAction(page) {
  const detail = page.locator('.about-prompt-static');
  await assertSummary(detail, promptDisclosure, false); await assertPromptReading(page, false);
  await toggleNative(page, detail);
  await assertSummary(detail, promptDisclosure, true); await assertPromptReading(page, true);
  await toggleNative(page, detail);
  await assertSummary(detail, promptDisclosure, false); await assertPromptReading(page, false);
}

for (const engine of Object.keys(engines)) {
  test(`${engine}: scriptless About opens every Career and Quality record through native controls`, { timeout: 60000 }, async () => {
    for (const sample of [{ width: 1440, font: 16 }, { width: 390, font: 16 }, { width: 390, font: 32 }]) {
      const observation = await session(engine, { javaScriptEnabled: false, viewport: { width: sample.width, height: 1000 } });
      const { page } = observation;
      try {
        await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, sample.font);
        await assertMembership(page);
        assert.deepEqual(await states(page), [false, false, false], 'source reading starts with native collapsed disclosures');
        for (const definition of folios) {
          const detail = folio(page, definition).locator('.about-folio-disclosure');
          await assertSummary(detail, definition, false);
          const hiddenRecord = page.locator(`[data-source-id="${definition.records[2][0]}"] h4`);
          assert.equal(await hiddenRecord.evaluate(node => node.checkVisibility()), false, 'closed content retains its native screen boundary');
          await toggleNative(page, detail); await assertSummary(detail, definition, true);
          await assertRecords(page, definition);
          if (engine === 'webkit' && sample.font === 16) {
            await detail.locator('summary').scrollIntoViewIfNeeded();
            await page.screenshot({ path: join(captureRoot, `${definition.key}-scriptless-${sample.width}.png`) });
          }
          await toggleNative(page, detail); await assertSummary(detail, definition, false);
        }
        await exercisePromptAction(page);
        if (sample.width === 1440) {
          const summary = page.locator('.about-folio--career details > summary');
          const fault = await injectStyle(page, '.about-folio--career details > summary { display: none !important; }');
          try { await assert.rejects(() => assertVisibleText(summary, 'native summary'), /native content visibility/); }
          finally { await fault.evaluate(node => node.remove()); }
          await assertVisibleText(summary, 'native summary');
        }
      } finally { await observation.close(); }
    }
  });

  test(`${engine}: scripted About keeps disclosure choices and reading order through repeated print media`, { timeout: 60000 }, async () => {
    const observation = await session(engine);
    const { page } = observation;
    try {
      await assertMembership(page); assert.deepEqual(await states(page), [false, false, false]);
      for (const sample of [{ width: 1440, font: 16 }, { width: 390, font: 16 }, { width: 390, font: 32 }]) {
        await page.setViewportSize({ width: sample.width, height: 1000 });
        await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, sample.font);
        for (const definition of folios) {
          const detail = folio(page, definition).locator('.about-folio-disclosure');
          await toggleNative(page, detail); await assertSummary(detail, definition, true); await assertRecords(page, definition);
          await toggleNative(page, detail); await assertSummary(detail, definition, false);
        }
        await exercisePromptAction(page);
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      await page.setViewportSize({ width: 816, height: 1056 });
      await toggleNative(page, page.locator('.about-folio--career details'));
      await toggleNative(page, page.locator('.about-prompt-static'));
      await assertSummary(page.locator('.about-prompt-static'), promptDisclosure, true);
      const accepted = await states(page);
      assert.deepEqual(accepted, [true, false, true], 'the recovery fixture includes both screen choices');
      for (let cycle = 0; cycle < 2; cycle += 1) {
        await page.emulateMedia({ media: 'print' }); await assertCompletePrint(page);
        assert.deepEqual(await states(page), accepted, 'print presentation preserves native disclosure choices');
        await page.emulateMedia({ media: 'screen' });
        assert.deepEqual(await states(page), accepted, 'screen returns to its prior open and closed choices');
        for (const [index, definition] of folios.entries()) await assertSummary(folio(page, definition).locator('details'), definition, accepted[index]);
        await assertSummary(page.locator('.about-prompt-static'), promptDisclosure, true); await assertPromptReading(page, true);
      }
    } finally { await observation.close(); }
  });

  test(`${engine}: About print includes all thirteen records and five conditions with scripting enabled or unavailable`, { timeout: 60000 }, async () => {
    for (const javaScriptEnabled of [true, false]) {
      const observation = await session(engine, { javaScriptEnabled, viewport: { width: 816, height: 1056 } });
      const { page } = observation;
      try {
        const original = await states(page); assert.deepEqual(original, [false, false, false]);
        await page.emulateMedia({ media: 'print' }); await assertCompletePrint(page);
        assert.deepEqual(await states(page), original);
        if (engine === 'webkit' && !javaScriptEnabled) {
          await page.locator('[data-source-id="quality-case-7"]').scrollIntoViewIfNeeded();
          await page.screenshot({ path: join(captureRoot, 'scriptless-print-quality-continuation.png') });
        }
        const fault = await injectStyle(page, '@media print { .about-page :is(.about-folio-disclosure, .about-prompt-static)::details-content { content-visibility: hidden !important; } }');
        try { await assert.rejects(() => assertCompletePrint(page), /native content visibility/); }
        finally { await fault.evaluate(node => node.remove()); }
        await assertCompletePrint(page);
        await page.emulateMedia({ media: 'screen' });
        // A visitor can close every disclosure again before printing. This
        // state needs complete output even in the scriptless environment.
        for (const detail of await page.locator(disclosureSelector).all()) { await toggleNative(page, detail); await toggleNative(page, detail); }
        assert.deepEqual(await states(page), original);
        await page.emulateMedia({ media: 'print' }); await assertCompletePrint(page);
        await page.emulateMedia({ media: 'screen' }); assert.deepEqual(await states(page), original);
      } finally { await observation.close(); }
    }
  });
}
