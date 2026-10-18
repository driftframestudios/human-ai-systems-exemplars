import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const panels = [
  { route: 'genomic-viewer-replatforming.html', id: 'genomics-specimen-qa-biomarker-transcript-title', count: 5, kind: 'sequence' },
  { route: 'genomic-viewer-replatforming.html', id: 'genomics-responsive-interface-transcript-title', count: 4, kind: 'sequence' },
  { route: 'genomic-viewer-replatforming.html', id: 'genomics-permissions-transcript-title', count: 5, kind: 'sequence' },
  { route: 'fmi-clinical-trial-coordination.html', id: 'clinical-trial-boolean-builder-transcript-title', count: 5, kind: 'sequence' },
  { route: 'choose-your-player-humatics.html', id: 'choose-your-player-interface-transcript-title', count: 5, kind: 'sequence' },
  { route: 'who-to-believe-reviews-platform.html', id: 'cpg-pharma-conversational-ai-transcript-title', count: 5, kind: 'sequence' },
  { route: 'who-to-believe-reviews-platform.html', id: 'cpg-pharma-menu-bottleneck-transcript-title', count: 4, kind: 'compact' },
  { route: 'who-to-believe-reviews-platform.html', id: 'method-activity-title', count: 4, kind: 'procedure' },
  { route: 'prompt-side-conditions-practice.html', id: 'lesson-capsule-intro-title', count: 3, kind: 'procedure' },
];
const routes = [...new Set(panels.map(panel => panel.route))];
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
  const page = await browsers.get(engine).newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  t.after(() => page.close());
  // Parent text, numbering and media relationships belong to this observation.
  // Video delivery and embedded instruments retain their established checks.
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Media owner</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function settle(page, width) {
  if (width) await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function observe(page, panel) {
  return page.locator(`aside[aria-labelledby="${panel.id}"]`).evaluate(owner => {
    const rect = value => ({ left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height });
    const box = node => rect(node.getBoundingClientRect());
    const list = owner.querySelector(':scope > ol');
    const heading = document.getElementById(owner.getAttribute('aria-labelledby'));
    const css = getComputedStyle(list), ownerCss = getComputedStyle(owner);
    const inset = style => ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((sum, key) => sum + parseFloat(style[key]), 0);
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    const items = [...list.children].map((item, index) => {
      const style = getComputedStyle(item), marker = getComputedStyle(item, '::marker');
      context.font = `${marker.fontStyle} ${marker.fontWeight} ${marker.fontSize} ${marker.fontFamily}`;
      const markerWidth = context.measureText(`${index + 1}. `).width;
      const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT), fragments = [];
      let node;
      while ((node = walker.nextNode())) {
        const start = node.textContent.search(/\S/u), end = node.textContent.search(/\s*$/u);
        if (start < 0) continue;
        const range = document.createRange(); range.setStart(node, start); range.setEnd(node, end);
        fragments.push(...[...range.getClientRects()].filter(value => value.width > 0 && value.height > 0).map(rect));
      }
      return { box: box(item), boxes: [...item.getClientRects()].map(rect), fragments, markerWidth,
        value: item.getAttribute('value'), text: item.textContent.replace(/\s+/gu, ' ').trim(),
        marker: { display: style.display, type: style.listStyleType, position: style.listStylePosition,
          content: marker.content, color: marker.color, size: parseFloat(marker.fontSize) } };
    });
    const related = [...document.querySelectorAll('video[aria-details]')].filter(video => video.getAttribute('aria-details').split(/\s+/u).includes(owner.id));
    return { owner: box(owner), list: box(list), heading: box(heading), headingOutside: !list.contains(heading),
      ownerContentWidth: box(owner).width - inset(ownerCss), listContentWidth: box(list).width - inset(css),
      items, start: list.start, reversed: list.reversed, tag: list.tagName, media: related.length,
      rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize), viewport: document.documentElement.clientWidth,
      ownerInsets: inset(ownerCss), listInsets: inset(css) };
  });
}

function expectedLanes(value, panel) {
  if (panel.kind === 'compact') return 1;
  return (panel.kind === 'procedure' ? value.ownerContentWidth >= 54 * value.rootFont
    : value.listContentWidth >= 56 * value.rootFont) ? 2 : 1;
}

function assertPanel(value, panel, { lanes = expectedLanes(value, panel), screen = true } = {}) {
  const label = `${panel.id} at ${value.viewport}px`, items = value.items;
  assert.equal(value.tag, 'OL', `${label}: the reader receives a native ordered list`);
  assert.equal(items.length, panel.count, `${label}: every authored step remains in the reading`);
  assert.equal(value.start, 1, `${label}: numbering begins at one`);
  assert.equal(value.reversed, false, `${label}: numbering follows the source sequence`);
  assert.ok(items.every(item => item.value === null), `${label}: native consecutive numbering owns the sequence`);
  if (panel.kind !== 'procedure') assert.equal(value.media, 1, `${label}: the video names this exact visual description`);
  assert.ok(value.headingOutside && value.heading.bottom <= Math.min(...items.map(item => item.box.top)) + 2,
    `${label}: the heading introduces every column`);
  if (screen) assert.ok(value.owner.left >= -2 && value.owner.right <= value.viewport + 2, `${label}: the frame fits the viewport`);
  const left = items[0].box.left;
  const right = Math.max(...items.map(item => item.box.left));
  assert.equal(right - left > 10, lanes === 2, `${label}: actual items use ${lanes} reading lanes`);
  for (const item of items) {
    assert.equal(item.boxes.length, 1, `${label}: each numbered item stays whole`);
    assert.ok(item.text && item.fragments.length, `${label}: each step supplies rendered text`);
    assert.ok(item.marker.display === 'list-item' && item.marker.type === 'decimal' && item.marker.position === 'outside'
      && item.marker.content === 'normal' && item.marker.size > 0 && item.marker.color !== 'rgba(0, 0, 0, 0)', `${label}: native numeric markers remain visible`);
    assert.ok(item.box.left - item.markerWidth >= value.owner.left - 2, `${label}: the measured marker has room inside the frame`);
    assert.ok(item.box.right <= value.owner.right + 2, `${label}: the item fits the frame`);
    assert.ok(item.fragments.every(fragment => fragment.left >= item.box.left - 2 && fragment.right <= item.box.right + 2
      && fragment.top >= item.box.top - 2 && fragment.bottom <= item.box.bottom + 2), `${label}: actual item text remains contained`);
    if (lanes === 2) assert.ok(item.box.width >= (panel.kind === 'procedure' ? 24 : 25) * value.rootFont, `${label}: each item uses a readable share of the available lane`);
  }
  if (lanes === 1) {
    for (let index = 1; index < items.length; index += 1) assert.ok(items[index].box.top >= items[index - 1].box.bottom - 2, `${label}: narrow reading follows source order`);
  } else if (panel.kind === 'procedure') {
    for (let index = 0; index < items.length; index += 2) {
      assert.ok(Math.abs(items[index].box.left - left) < 2, `${label}: each numbered row starts at the left`);
      if (items[index + 1]) assert.ok(items[index + 1].box.left > items[index].box.right
        && Math.abs(items[index + 1].box.top - items[index].box.top) < 2, `${label}: paired steps read left to right`);
      if (index > 0) assert.ok(items[index].box.top >= Math.max(...items.slice(index - 2, index).map(item => item.box.bottom)) - 2,
        `${label}: the following numbered pair begins below its predecessors`);
    }
  } else {
    const split = items.findIndex(item => item.box.left > left + 10);
    assert.ok(split > 0, `${label}: the sequence uses a continuation column`);
    assert.ok(Math.abs(items[split].box.top - items[0].box.top) < 2, `${label}: both sequence columns start together`);
    for (const lane of [items.slice(0, split), items.slice(split)]) {
      for (let index = 1; index < lane.length; index += 1) assert.ok(Math.abs(lane[index].box.left - lane[0].box.left) < 2
        && lane[index].box.top >= lane[index - 1].box.bottom - 2, `${label}: chronology reads down one column before continuing`);
    }
    assert.ok(items[split].box.left - items[split].markerWidth > Math.max(...items.slice(0, split).map(item => item.box.right)) + 4,
      `${label}: continuation markers remain separate from the first reading lane`);
  }
  if (panel.kind === 'compact') assert.ok(value.owner.width <= items[0].box.width + value.ownerInsets + value.listInsets + 2 * value.rootFont,
    `${label}: the short transcript frame follows its actual reading measure`);
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const route of routes) {
    test(`${engine}: ${route} ordered companions use available room and preserve sequence`, async t => {
      const page = await open(t, engine, route), selected = panels.filter(panel => panel.route === route);
      const names = new Map();
      for (const panel of selected) names.set(panel.id, await page.locator(`aside[aria-labelledby="${panel.id}"] > ol`).ariaSnapshot());
      // Five audit widths, a narrow receiver, and both shared shell seams.
      for (const width of [390, 768, 896, 897, 1024, 1025, 1199, 1200, 1201, 1440, 1920, 2560]) {
        await settle(page, width);
        for (const panel of selected) assertPanel(await observe(page, panel), panel);
      }
      for (const panel of selected.filter(value => value.kind !== 'compact')) {
        // Bracket each panel's actual column threshold, including its padding.
        let below = 768, above = 1440;
        while (above - below > 1) {
          const width = Math.floor((below + above) / 2); await settle(page, width);
          if (expectedLanes(await observe(page, panel), panel) === 2) above = width; else below = width;
        }
        for (const [width, lanes] of [[below, 1], [above, 2]]) {
          await settle(page, width); assertPanel(await observe(page, panel), panel, { lanes });
        }
      }
      await settle(page, 1440);
      const enlarged = await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
      try {
        for (const width of [390, 768, 1440]) {
          await settle(page, width);
          for (const panel of selected) {
            const value = await observe(page, panel); assert.equal(value.rootFont, 32);
            assertPanel(value, panel, { lanes: 1 });
          }
        }
      } finally { await enlarged.evaluate(node => node.remove()); }
      await page.emulateMedia({ media: 'print' }); await settle(page);
      for (const panel of selected) assertPanel(await observe(page, panel), panel, { lanes: 1, screen: false });
      await page.emulateMedia({ media: 'screen', forcedColors: 'active' }); await settle(page);
      for (const panel of selected) {
        assertPanel(await observe(page, panel), panel);
        assert.equal(await page.locator(`aside[aria-labelledby="${panel.id}"] > ol`).ariaSnapshot(), names.get(panel.id), 'Responsive and alternate-media layout preserve the accessible sequence.');
      }
    });
  }

  test(`${engine}: ordered-room observations expose restored layout and numbering faults`, async t => {
    const page = await open(t, engine, 'who-to-believe-reviews-platform.html');
    const sequence = panels.find(panel => panel.id === 'cpg-pharma-conversational-ai-transcript-title');
    const procedure = panels.find(panel => panel.id === 'method-activity-title');
    const compact = panels.find(panel => panel.kind === 'compact');
    for (const [css, panel, failure] of [
      ['.debrief-ordered-reading { column-count: 1 !important; }', sequence, /actual items use 2 reading lanes/u],
      ['.debrief-ordered-reading > li { max-inline-size: 12rem !important; }', sequence, /readable share/u],
      ['.debrief-ordered-reading { display: grid !important; grid-template-columns: 1fr 1fr !important; columns: auto !important; }', sequence, /chronology reads down/u],
      ['.debrief-ordered-reading > li { max-height: 1rem !important; overflow: hidden !important; }', sequence, /actual item text remains contained/u],
      ['.debrief-ordered-steps { grid-template-columns: 1fr !important; }', procedure, /actual items use 2 reading lanes/u],
      ['.debrief-ordered-steps > li { list-style-type: none !important; }', procedure, /native numeric markers/u],
      ['.debrief-companion--compact { max-inline-size: none !important; }', compact, /frame follows its actual reading measure/u],
    ]) {
      assertPanel(await observe(page, panel), panel);
      const fault = await page.addStyleTag({ content: css });
      try { await settle(page); const changed = await observe(page, panel); assert.throws(() => assertPanel(changed, panel), failure); }
      finally { await fault.evaluate(node => node.remove()); }
      await settle(page); assertPanel(await observe(page, panel), panel);
    }
  });

  test(`${engine}: existing lesson comparisons retain their own column grammar`, async t => {
    const page = await open(t, engine, 'prompt-side-conditions-practice.html');
    for (const [width, expected] of [[390, [1, 1]], [768, [2, 3]], [1440, [2, 3]]]) {
      await settle(page, width);
      const counts = await page.evaluate(() => ['.lesson-class-size-list', '.persona-distinction dl'].map(selector => {
        const nodes = [...document.querySelector(selector).children];
        return new Set(nodes.map(node => Math.round(node.getBoundingClientRect().left))).size;
      }));
      assert.deepEqual(counts, expected, 'The pre-existing class-size and persona comparisons retain their distinct arrangements.');
    }
  });
}
