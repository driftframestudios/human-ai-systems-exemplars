import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';
import { observeCompanionBoundary, assertCompanionBoundary } from './companion-reading-boundary.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const frameSelector = '.debrief-companion-frame, .debrief-companion--compact';
const routes = [
  'benchmark-orientation.html', 'choose-your-player-humatics.html', 'distributed-inspection-harness.html',
  'ehr-interface-engine-replatform.html', 'field-inspection-harness-replatform.html',
  'fmi-clinical-trial-coordination.html', 'genomic-viewer-replatforming.html', 'initiative-costing.html',
  'maps-evaluations.html', 'multilingual-clinical-vocabulary-practice.html', 'prompt-side-conditions-practice.html',
  'readable-tables-reusable-evidence.html', 'recoverable-enterprise-forms.html',
  'three-way-comparative-return.html', 'who-to-believe-reviews-platform.html',
];
const browsers = new Map();
let server;
before(async () => {
  server = await startStaticServer();
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) browsers.set(name, await engine.launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});
async function open(t, engine, route) {
  const page = await browsers.get(engine).newPage({ viewport: { width: 320, height: 1000 }, reducedMotion: 'reduce' });
  t.after(() => page.close());
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.page-section-rail__link').first().evaluate(link => { location.hash = link.hash; });
  await page.waitForSelector('.page-section-rail__link[aria-current="location"]');
  return page;
}
async function settle(page, width, font) {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(font => { document.documentElement.style.fontSize = `${font}px`; }, font);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function measure(page) {
  return page.locator(frameSelector).evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node), box = node.getBoundingClientRect();
    const body = node.querySelector(':scope > ol > li, .debrief-companion-reading > p, .debrief-companion-regions p, .debrief-code-companion > p')
      || [...node.children].find(child => child.matches('p:not([class])'));
    const reading = body.getBoundingClientRect();
    return { id: node.getAttribute('aria-labelledby'), width: box.width, left: box.left, right: box.right,
      inline: [style.paddingInlineStart, style.paddingInlineEnd].map(value => Number(parseFloat(value).toFixed(3))),
      block: [style.paddingBlockStart, style.paddingBlockEnd].map(value => Number(parseFloat(value).toFixed(3))),
      readingWidth: reading.width, readingHeight: reading.height,
      text: node.textContent, links: [...node.querySelectorAll('a')].map(link => [link.textContent, link.getAttribute('href')]),
      details: [...node.querySelectorAll('details')].map(details => [details.open, details.querySelector('summary')?.textContent]),
      font: getComputedStyle(body).fontSize };
  }));
}
async function previousSpacing(page, action) {
  const old = await page.addStyleTag({ content: `${frameSelector} { --debrief-companion-inline-floor: initial !important; }` });
  try { return await action(); }
  finally { await old.evaluate(node => node.remove()); }
}
function assertImprovement(current, previous) {
  assert.equal(current.length, previous.length);
  for (let index = 0; index < current.length; index++) {
    const next = current[index], old = previous[index];
    assert.ok(next.readingWidth >= old.readingWidth + 4, `${next.id}: narrow text gains useful inline room`);
    assert.deepEqual([next.width, next.left, next.right, next.block, next.font, next.text, next.links, next.details],
      [old.width, old.left, old.right, old.block, old.font, old.text, old.links, old.details],
      `${next.id}: outer room, vertical padding, visitor text size, prose, links, and disclosure state remain authored`);
    assert.ok(next.inline.every(value => parseFloat(value) >= 8), `${next.id}: inner padding retains space for link focus paint`);
  }
}
function assertUnchanged(current, previous, message) {
  assert.equal(current.length, previous.length);
  for (let index = 0; index < current.length; index++) {
    const { readingHeight: height, ...next } = current[index];
    const { readingHeight: priorHeight, ...old } = previous[index];
    assert.deepEqual(next, old, message);
    // Computed padding rounds to millipixels above; Firefox can quantize a
    // distant block's top and bottom to adjacent
    // layout units after reflow; the complete paragraph stays on its lines.
    assert.ok(Math.abs(height - priorHeight) < .1, message);
  }
}
for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const route of routes) {
    test(`${engine}: ${route} gives narrow companion text useful room`, async t => {
      const page = await open(t, engine, route);
      // At 200% text, the local 3/2.8/2.6/2.5/2.4vw owners leave
      // their .5rem minimum at these adjacent widths.
      const states = [[320, 16], [390, 16], ...[320, 390, 533, 534, 571, 572, 615, 616, 639, 640, 641, 666, 667].map(width => [width, 32])];
      for (const [width, font] of states) {
        await settle(page, width, font);
        const current = await measure(page), previous = await previousSpacing(page, () => measure(page));
        assertImprovement(current, previous);
        assertCompanionBoundary(await observeCompanionBoundary(page, current.map(panel => panel.id)));
      }
      // Local fluid-growth rates and upper bounds keep the existing larger
      // compositions. Print reads the route-owned fallback spacing directly.
      for (const [width, font] of [[1440, 16], [2560, 16], [1440, 32]]) {
        await settle(page, width, font);
        assertUnchanged(await measure(page), await previousSpacing(page, () => measure(page)), 'Desktop and wide padding retain their accepted geometry.');
      }
      await page.emulateMedia({ media: 'print' });
      await settle(page, 390, 16);
      assertUnchanged(await measure(page), await previousSpacing(page, () => measure(page)), 'Print retains its route-owned inline spacing.');
    });
  }

  test(`${engine}: the specimen description exposes restored narrow-spacing strain`, async t => {
    const page = await open(t, engine, 'genomic-viewer-replatforming.html');
    await settle(page, 320, 32);
    const current = await measure(page), previous = await previousSpacing(page, () => measure(page));
    assertImprovement(current, previous);
    const id = 'genomics-specimen-qa-biomarker-transcript-title';
    const next = current.find(panel => panel.id === id), old = previous.find(panel => panel.id === id);
    assert.ok(next.readingWidth >= old.readingWidth * 1.35, 'The specimen item gains a materially wider reading measure.');
    assert.ok(next.readingHeight <= old.readingHeight * .85, 'The complete specimen item needs materially less vertical travel.');
    await previousSpacing(page, async () => {
      const fault = await measure(page);
      assert.throws(() => assertImprovement(fault, previous), /narrow text gains useful inline room/, 'Restoring the accepted spacing reveals the measured reading strain.');
    });
    assertImprovement(await measure(page), previous);
    t.diagnostic(`Specimen item: ${old.readingWidth.toFixed(1)}→${next.readingWidth.toFixed(1)}px wide; ${old.readingHeight.toFixed(1)}→${next.readingHeight.toFixed(1)}px high.`);
  });

  test(`${engine}: native multi-digit markers and focused long links keep their space`, async t => {
    const page = await open(t, engine, 'genomic-viewer-replatforming.html');
    const id = 'genomics-specimen-qa-biomarker-transcript-title';
    const owner = page.locator(`aside[aria-labelledby="${id}"]`), list = owner.locator(':scope > ol');
    const original = await list.innerHTML();
    await list.evaluate(list => {
      list.start = 9;
      const link = document.createElement('a'); link.href = '#mainContent';
      link.textContent = 'LongUnbrokenReferenceForReadableCompanionFocusAndNativeNumbering';
      list.children[1].append(' ', link);
    });
    try {
      for (const [width, font] of [[320, 16], [390, 16], [320, 32], [390, 32]]) {
        await settle(page, width, font);
        await list.locator('a').last().focus();
        const result = await list.evaluate(list => {
          const owner = list.parentElement, box = owner.getBoundingClientRect(), style = getComputedStyle(owner);
          const contentLeft = box.left + parseFloat(style.borderLeftWidth), contentRight = box.right - parseFloat(style.borderRightWidth);
          const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
          return [...list.children].map((item, index) => {
            const rect = item.getBoundingClientRect(), marker = getComputedStyle(item, '::marker'), css = getComputedStyle(item);
            context.font = `${marker.fontStyle} ${marker.fontWeight} ${marker.fontSize} ${marker.fontFamily}`;
            const width = context.measureText(`${list.start + index}. `).width;
            const link = item.querySelector('a'), linkStyle = link && getComputedStyle(link);
            const ring = linkStyle ? Math.max(0, parseFloat(linkStyle.outlineWidth) + parseFloat(linkStyle.outlineOffset)) : 0;
            return { markerLeft: rect.left - width, contentLeft, contentRight,
              markerType: css.listStyleType, display: css.display, number: list.start + index,
              focus: link ? { focused: link === document.activeElement, style: linkStyle.outlineStyle,
                boxes: [...link.getClientRects()].map(rect => ({ left: rect.left - ring, right: rect.right + ring })) } : null };
          });
        });
        assert.deepEqual(result.map(item => item.number), [9, 10, 11, 12, 13]);
        for (const item of result) {
          assert.ok(item.markerType === 'decimal' && item.display === 'list-item' && item.markerLeft >= item.contentLeft,
            'Native single- and multi-digit numbering fits inside the frame border.');
          if (item.focus) assert.ok(item.focus.focused && item.focus.style !== 'none'
            && item.focus.boxes.every(box => box.left >= item.contentLeft && box.right <= item.contentRight),
            'The focused long link wraps with its outline inside the reading frame.');
        }
        assertCompanionBoundary(await observeCompanionBoundary(page, [id]));
      }
    } finally {
      await list.evaluate((list, html) => { list.removeAttribute('start'); list.innerHTML = html; }, original);
    }
    assert.equal(await list.getAttribute('start'), null);
    assert.equal(await list.innerHTML(), original);
  });
}
