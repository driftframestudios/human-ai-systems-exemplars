import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const routes = [
  'ehr-discrete-genomic-result.html',
  'ehr-interface-engine-replatform.html',
  'ehr-pgx-alert-failure.html',
  'ehr-three-front-doors.html',
  'ehr-two-charts-one-result.html',
  'spatial-capture-collaborative-memory.html',
  'multilingual-clinical-vocabulary-practice.html',
];
const selector = '.architecture-pair.cobalt-operating-field-cards';
// The 64rem grid and 80rem prose transitions share the 80px desktop gutters.
const widths = [390, 1103, 1104, 1359, 1360, 1361, 1440, 2560];
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

// Reconstruct the received multicolumn ownership before layout. Existing
// paragraphs retain their side of the grid, so the fault also exercises the
// WebKit balancing decision that originally split individual painted cards.
function restoreNestedCards(html, route) {
  let ordinal = 0;
  return html.replace(/<div class="architecture-pair cobalt-operating-field-cards table-span-all">([\s\S]*?)<\/div>/gu,
    (group, content) => {
      const index = ordinal++;
      const nested = `<div class="architecture-pair cobalt-operating-field-cards">${content}</div>`;
      if ((route.startsWith('spatial-') || route.startsWith('multilingual-')) && index === 0) {
        // Mark the preceding prose close for removal in the second pass.
        return `<template data-rejoin-previous></template>${nested}</div>`;
      }
      if (route.startsWith('multilingual-') && index === 1) {
        return `<div class="prose-flow">${nested}<template data-rejoin-next></template>`;
      }
      return `<div class="prose-flow">${nested}</div>`;
    })
    .replace(/<\/div>\s*<template data-rejoin-previous><\/template>/gu, '')
    .replace(/<template data-rejoin-next><\/template>\s*<div class="prose-flow">/gu, '');
}

async function open(engine, route, options = {}) {
  const { fault = false, font = 16, ...contextOptions } = options;
  const context = await browsers.get(engine).newContext({
    viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...contextOptions,
  });
  await context.route('**/*', async request => {
    const url = new URL(request.request().url());
    if (url.origin !== server.origin || url.pathname.startsWith('/v1-cdn/')) {
      return request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' });
    }
    if (url.pathname === root + route && (fault || font !== 16)) {
      const response = await request.fetch();
      let body = await response.text();
      if (fault) body = restoreNestedCards(body, route);
      if (font !== 16) body = body.replace('</head>', `<style>html { font-size: ${font}px; }</style></head>`);
      return request.fulfill({ response, body });
    }
    return request.continue();
  });
  const page = await context.newPage();
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  // Font polling works with scripting disabled as well as with enhancement.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await page.evaluate(() => document.fonts.status === 'loaded')) return { page, close: () => context.close() };
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  await context.close();
  assert.fail('The authored fonts reach their loaded state.');
}

async function observe(page) {
  return page.locator(selector).evaluateAll(groups => {
    const box = r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
    const positive = r => r.width > 0 && r.height > 0;
    return groups.map(group => {
      const reading = group.closest('.reading-flow');
      let heading = group.previousElementSibling;
      while (heading && !heading.matches('.beat-title')) heading = heading.previousElementSibling;
      const following = group.nextElementSibling;
      return {
        viewport: document.documentElement.clientWidth,
        direct: group.parentElement === reading,
        emptyRuns: [...reading.querySelectorAll('.prose-flow')].filter(run => !run.textContent.trim() && !run.children.length).length,
        grid: box(group.getBoundingClientRect()), owner: box(reading.getBoundingClientRect()),
        columns: getComputedStyle(group).gridTemplateColumns.split(' ').length,
        rootFont: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
        heading: heading ? box(heading.getBoundingClientRect()) : null,
        following: following ? box(following.getBoundingClientRect()) : null,
        cards: [...group.children].map(card => {
          const style = getComputedStyle(card);
          const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT), text = [];
          let node;
          while ((node = walker.nextNode())) {
            const start = node.textContent.search(/\S/u);
            if (start < 0) continue;
            const range = document.createRange();
            range.setStart(node, start); range.setEnd(node, node.textContent.search(/\s*$/u));
            text.push(...[...range.getClientRects()].filter(positive).map(box));
          }
          const shadow = (style.boxShadow.match(/-?\d+(?:\.\d+)?px/gu) || []).map(Number.parseFloat);
          return { tag: card.tagName, fragments: [...card.getClientRects()].filter(positive).map(box), text,
            shadow, display: style.display, visibility: style.visibility };
        }),
      };
    });
  });
}

function inside(inner, outer, tolerance = 1.5) {
  return inner.left >= outer.left - tolerance && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance && inner.bottom <= outer.bottom + tolerance;
}
function assertCards(groups, route) {
  assert.equal(groups.length, route.startsWith('multilingual-') ? 2 : 1, 'Every authored group participates.');
  for (const group of groups) {
    assert.equal(group.direct, true, 'The comparison group occupies an ordinary reading block.');
    assert.equal(group.emptyRuns, 0, 'Prose runs retain reading content.');
    assert.equal(group.cards.length, 3, 'The three authored comparison cards remain available.');
    assert.equal(group.columns, group.owner.width >= 64 * group.rootFont ? 2 : 1,
      'The available reading width selects the complete one- or two-column comparison.');
    assert.ok(Math.abs(group.grid.width - group.owner.width) <= 1.5, 'The comparison uses the complete reading width.');
    assert.ok(group.heading && group.heading.bottom <= group.grid.top + 1.5, 'The opening heading precedes all cards.');
    assert.ok(!group.following || group.following.top >= group.grid.bottom - 1.5, 'Following content begins below the complete comparison.');
    const paints = [];
    for (const card of group.cards) {
      assert.equal(card.tag, 'ARTICLE');
      assert.equal(card.visibility, 'visible');
      assert.notEqual(card.display, 'none');
      assert.equal(card.fragments.length, 1, 'Each painted card remains one contiguous fragment.');
      const frame = card.fragments[0];
      assert.ok(inside(frame, group.grid), 'The card fits its comparison group.');
      assert.ok(card.text.length > 0 && card.text.every(fragment => inside(fragment, frame)), 'Every visible text fragment stays inside its own card.');
      // These owners use one hard shadow. An additional shadow or blur earns
      // its own paint observation instead of silently widening this bound.
      assert.ok(card.shadow.length === 0 || (card.shadow.length === 4 && card.shadow[2] === 0), 'The declared hard-shadow paint remains measurable.');
      const [x = 0, y = 0, , spread = 0] = card.shadow;
      const paint = { left: frame.left + Math.min(0, x - spread), right: frame.right + Math.max(0, x + spread),
        top: frame.top + Math.min(0, y - spread), bottom: frame.bottom + Math.max(0, y + spread) };
      assert.ok(paint.left >= -1.5 && paint.right <= group.viewport + 1.5, 'Card and shadow remain within the visitor viewport.');
      paints.push(paint);
    }
    for (let i = 0; i < paints.length; i += 1) for (let j = i + 1; j < paints.length; j += 1) {
      const a = paints[i], b = paints[j];
      assert.ok(a.right <= b.left + 1.5 || b.right <= a.left + 1.5 || a.bottom <= b.top + 1.5 || b.bottom <= a.top + 1.5,
        'Separate cards retain a visible interval between their painted boundaries.');
    }
    const frames = group.cards.map(card => card.fragments[0]);
    if (group.columns === 1) {
      assert.ok(frames.every(frame => Math.abs(frame.left - frames[0].left) <= 1.5), 'Narrow cards share one reading lane.');
      assert.ok(frames[1].top >= frames[0].bottom && frames[2].top >= frames[1].bottom, 'Narrow cards follow authored order.');
    } else {
      assert.equal(group.columns, 2);
      assert.ok(Math.abs(frames[0].top - frames[1].top) <= 1.5 && frames[1].left > frames[0].right,
        'The first two comparison cards share the opening row.');
      assert.ok(frames[2].top >= Math.max(frames[0].bottom, frames[1].bottom), 'The third card continues below the opening pair.');
    }
  }
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const route of routes) {
    test(`${engine}: ${route} keeps comparison cards complete across both layout seams`, { timeout: 60_000 }, async t => {
      const session = await open(engine, route); t.after(session.close);
      for (const width of widths) {
        await session.page.setViewportSize({ width, height: 1000 });
        await t.test(`${width}px`, async () => assertCards(await observe(session.page), route));
      }
    });
  }
  for (const mode of ['enlarged', 'no-script', 'print', 'forced-colors']) {
    for (const route of routes.slice(-2)) {
      test(`${engine}: ${route} preserves cards with ${mode}`, { timeout: 30_000 }, async t => {
        const session = await open(engine, route, { font: mode === 'enlarged' ? 32 : 16,
          javaScriptEnabled: mode !== 'no-script' }); t.after(session.close);
        if (mode === 'print') await session.page.emulateMedia({ media: 'print' });
        if (mode === 'forced-colors') await session.page.emulateMedia({ forcedColors: 'active' });
        assertCards(await observe(session.page), route);
      });
    }
  }
}

for (const route of routes.slice(-2)) {
  test(`webkit: the received nested-grid fault fragments ${route}`, { timeout: 30_000 }, async t => {
    const fault = await open('webkit', route, { fault: true }); t.after(fault.close);
    const broken = await observe(fault.page);
    assert.ok(broken.some(group => group.cards.some(card => card.fragments.length > 1)),
      'The before-parse nesting fault reproduces a split painted card.');
    assert.throws(() => assertCards(broken, route));
    const restored = await open('webkit', route); t.after(restored.close);
    assertCards(await observe(restored.page), route);
  });
}
