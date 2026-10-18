import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const panels = {
  'genomic-viewer-replatforming.html': ['genomic-proxy-standing-title'],
  'ehr-interface-engine-replatform.html': ['interface-amplified-reach-title'],
  'distributed-inspection-harness.html': ['sampling-decision-title'],
  'three-way-comparative-return.html': ['portfolio-reader-title'],
  'readable-tables-reusable-evidence.html': ['table-boundary-title', 'research-boundary-title'],
  'benchmark-orientation.html': ['accuracy-boundary-title', 'validity-boundary-title'],
  'maps-evaluations.html': ['source-boundary-title', 'canary-boundary-title'],
  'prompt-side-conditions-practice.html': ['capacity-title'],
  'field-inspection-harness-replatform.html': ['solution-boundary-title', 'media-receipt-title', 'labor-cost-title', 'route-sampling-title', 'validation-boundary-title', 'final-boundary-title'],
};
// Audit widths plus narrow reading and both sides of surrounding reading/rail
// seams. The compact variant itself introduces a continuous cap.
const widths = [390, 768, 769, 770, 771, 895, 896, 897, 1023, 1024, 1025, 1199, 1200, 1440, 1919, 1920, 1921, 2560];
const browsers = new Map();
let server;
before(async () => {
  server = await startStaticServer();
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) browsers.set(name, await engine.launch({ headless: true }));
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});
async function open(t, engine, route) {
  const page = await browsers.get(engine).newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin ? request.continue()
    : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // An explicitly selected destination exercises the widest narrow marker.
  const destination = page.locator('.page-section-rail__link').first();
  await destination.evaluate(link => { window.location.hash = link.hash; });
  await expect(destination).toHaveAttribute('aria-current', 'location');
  return page;
}
function panel(page, id) { return page.locator(`aside[aria-labelledby="${id}"]`); }
async function observe(page, id) {
  const note = panel(page, id);
  await note.evaluate(node => window.scrollTo({ top: node.getBoundingClientRect().top + scrollY - 120, behavior: 'instant' }));
  return note.evaluate(node => {
    const box = node.getBoundingClientRect(), style = getComputedStyle(node);
    const heading = document.getElementById(node.getAttribute('aria-labelledby'));
    const body = [...node.children].find(child => child.matches('p') && (heading.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING));
    const fragments = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode, parent = text.parentElement;
      if (!text.textContent.trim() || getComputedStyle(parent).visibility === 'hidden'
        || parent.closest('details:not([open])') && !parent.closest('summary')) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      for (const rect of range.getClientRects()) if (rect.width && rect.height) fragments.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
    }
    const shadow = style.boxShadow === 'none' ? [] : style.boxShadow.replace(/rgba?\([^)]*\)/g, '').match(/-?[\d.]+px/g)?.map(parseFloat) || [];
    const [dx = 0, , blur = 0, spread = 0] = shadow;
    const parent = node.parentElement.getBoundingClientRect(), parentStyle = getComputedStyle(node.parentElement);
    const rail = document.querySelector('.page-section-rail');
    const markers = [...(rail?.querySelectorAll('.page-section-rail__link') || [])].flatMap(link => {
      const box = link.getBoundingClientRect(), linkStyle = getComputedStyle(link), marker = getComputedStyle(link, '::before');
      if (!box.width || linkStyle.visibility === 'hidden' || marker.content === 'none') return [];
      let width = parseFloat(marker.width);
      if (marker.boxSizing !== 'border-box') width += parseFloat(marker.borderLeftWidth) + parseFloat(marker.borderRightWidth);
      const left = linkStyle.justifyContent === 'center' ? box.left + (box.width - width) / 2 : box.left;
      const shadow = marker.boxShadow === 'none' ? [] : marker.boxShadow.replace(/rgba?\([^)]*\)/g, '').match(/-?[\d.]+px/g)?.map(parseFloat) || [];
      const [dx = 0, , blur = 0, spread = 0] = shadow;
      return [{ left: left + Math.min(0, dx - blur - spread), right: left + width + Math.max(0, dx + blur + spread) }];
    });
    return {
      left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width,
      paintLeft: box.left + Math.min(0, dx - blur - spread), paintRight: box.right + Math.max(0, dx + blur + spread),
      parentCenter: (parent.left + parseFloat(parentStyle.paddingLeft) + parent.right - parseFloat(parentStyle.paddingRight)) / 2,
      viewport: document.documentElement.clientWidth, headingBottom: heading.getBoundingClientRect().bottom, bodyTop: body?.getBoundingClientRect().top, fragments,
      border: ['Top', 'Right', 'Bottom', 'Left'].some(side => parseFloat(style['border' + side + 'Width']) > 0 && style['border' + side + 'Style'] !== 'none'),
      rail: markers.length ? { left: Math.min(...markers.map(marker => marker.left)), right: Math.max(...markers.map(marker => marker.right)) } : null,
    };
  });
}
function assertGeometry(result, id, { compact = true, center = true } = {}) {
  assert.ok(result.width > 0, `${id}: the evidence frame is present`);
  assert.ok(result.paintLeft >= -1 && result.paintRight <= result.viewport + 1, `${id}: frame and shadow fit the viewport`);
  if (compact && result.viewport >= 1024) assert.ok(result.width <= 900, `${id}: a short source boundary keeps a bounded reading frame`);
  if (center) assert.ok(Math.abs((result.left + result.right) / 2 - result.parentCenter) <= 1, `${id}: the compact note is centered in its reading region`);
  assert.ok(result.headingBottom <= result.bodyTop + 1, `${id}: the heading precedes its complete explanation`);
  assert.ok(result.fragments.length > 0, `${id}: actual text contributes visible fragments`);
  for (const fragment of result.fragments) {
    assert.ok(fragment.left >= result.left - 1 && fragment.right <= result.right + 1, `${id}: text stays inside the panel`);
    assert.ok(fragment.top >= result.top - 1 && fragment.bottom <= result.bottom + 1, `${id}: panel paint contains the complete text`);
  }
  if (result.rail) assert.ok(result.paintRight <= result.rail.left - 1 || result.paintLeft >= result.rail.right + 1, `${id}: frame and shadow clear the reading rail`);
}
for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const [route, ids] of Object.entries(panels)) {
    test(`${engine}: ${route} keeps its short evidence panels deliberately bounded`, async t => {
      const page = await open(t, engine, route);
      for (const width of widths) {
        await page.setViewportSize({ width, height: 1000 });
        for (const id of ids) assertGeometry(await observe(page, id), id);
      }
      for (const id of ids) {
        const anchors = panel(page, id).locator('a');
        for (let index = 0; index < await anchors.count(); index++) {
          const anchor = anchors.nth(index);
          await anchor.focus(); await expect(anchor).toBeFocused();
          assert.ok((await anchor.getAttribute('href'))?.trim(), `${id}: the onward or citation destination remains present`);
        }
      }
    });
    test(`${engine}: ${route} preserves enlarged-text and alternate-media evidence`, async t => {
      const page = await open(t, engine, route);
      await page.setViewportSize({ width: 768, height: 1100 });
      const enlarged = await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1100 });
        for (const id of ids) assertGeometry(await observe(page, id), id, { compact: false });
      }
      await enlarged.evaluate(node => node.remove());
      await page.emulateMedia({ forcedColors: 'active' });
      for (const id of ids) {
        const result = await observe(page, id); assertGeometry(result, id);
        assert.equal(result.border, true, `${id}: a real border retains the information boundary in forced colors`);
      }
      await page.emulateMedia({ media: 'print', forcedColors: 'none' });
      for (const id of ids) {
        await expect(panel(page, id)).toBeVisible();
        assertGeometry(await observe(page, id), id, { compact: false, center: false });
      }
    });
  }
  test(`${engine}: Field Inspection preserves the prompt disclosure and four-card ledger`, async t => {
    const page = await open(t, engine, 'field-inspection-harness-replatform.html');
    const details = panel(page, 'route-sampling-title').locator('details'), prompt = details.locator('blockquote'), summary = details.locator('summary');
    const original = await prompt.textContent();
    for (const width of [390, 768, 1440, 2560]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(details).not.toHaveAttribute('open', '');
      await summary.focus(); await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', ''); await expect(prompt).toBeVisible();
      assertGeometry(await observe(page, 'route-sampling-title'), 'route-sampling-title');
      assert.equal(await prompt.textContent(), original, 'The open prompt retains its complete source text.');
      await summary.focus(); await page.keyboard.press('Enter'); await expect(prompt).toBeHidden();
      const cards = panel(page, 'prospective-ledger-title').locator('.field-inspection-prospective-ledger__grid > section');
      await expect(cards).toHaveCount(4);
      const lanes = await cards.evaluateAll(nodes => new Set(nodes.map(node => node.getBoundingClientRect().x)).size);
      if (width >= 1440) assert.equal(lanes, 4, 'The ledger keeps its four useful comparison lanes.');
      if (width === 390) assert.equal(lanes, 1, 'The narrow ledger retains one authored sequence.');
    }
    await page.setViewportSize({ width: 320, height: 1100 });
    const enlarged = await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(prompt).toBeVisible();
    assertGeometry(await observe(page, 'route-sampling-title'), 'route-sampling-title', { compact: false });
    const wrapping = await page.addStyleTag({ content: '.debrief-companion--compact { overflow-wrap: normal !important; }' });
    try {
      const fault = await observe(page, 'route-sampling-title');
      assert.throws(() => assertGeometry(fault, 'route-sampling-title', { compact: false }), /text stays inside/, 'The oracle detects long words leaving the narrow enlarged-text frame.');
    } finally { await wrapping.evaluate(node => node.remove()); }
    assertGeometry(await observe(page, 'route-sampling-title'), 'route-sampling-title', { compact: false });
    await summary.focus(); await page.keyboard.press('Enter');
    await enlarged.evaluate(node => node.remove());
    await page.setViewportSize({ width: 768, height: 1100 });
    await page.emulateMedia({ forcedColors: 'active' });
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(prompt).toBeVisible();
    assertGeometry(await observe(page, 'route-sampling-title'), 'route-sampling-title');
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    await expect(prompt).toBeVisible(); assert.equal(await prompt.textContent(), original);
  });
  test(`${engine}: the enlarged-text oracle detects a missing rail reserve`, async t => {
    const page = await open(t, engine, 'genomic-viewer-replatforming.html');
    const id = 'genomic-proxy-standing-title';
    await page.setViewportSize({ width: 768, height: 1100 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    assertGeometry(await observe(page, id), id, { compact: false });
    const fault = await page.addStyleTag({ content: '.debrief-companion--compact { max-inline-size: min(100%, calc(var(--canvas-reading-measure) + 4rem)); }' });
    try {
      const observation = await observe(page, id);
      assert.throws(() => assertGeometry(observation, id, { compact: false }), /clear the reading rail/, 'The oracle detects enlarged markers reaching the former fixed gutter.');
    } finally { await fault.evaluate(node => node.remove()); }
    assertGeometry(await observe(page, id), id, { compact: false });
  });
  test(`${engine}: restoring the broad panel exposes the lost compact evidence boundary`, async t => {
    const page = await open(t, engine, 'field-inspection-harness-replatform.html'), id = 'solution-boundary-title';
    assertGeometry(await observe(page, id), id);
    await panel(page, id).evaluate(node => node.classList.remove('debrief-companion--compact'));
    try {
      const fault = await observe(page, id);
      assert.throws(() => assertGeometry(fault, id), /bounded reading frame/, 'The oracle detects the former broad frame.');
    } finally { await panel(page, id).evaluate(node => node.classList.add('debrief-companion--compact')); }
    assertGeometry(await observe(page, id), id);
  });
}
