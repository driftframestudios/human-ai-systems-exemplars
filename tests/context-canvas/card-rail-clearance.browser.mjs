import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const selector = '.architecture-pair, .repeatability-cards, .implementation-moves';
const inventory = {
  'ai-systems.html': [4, 15], 'benchmark-orientation.html': [2, 6], 'choose-your-player-humatics.html': [1, 6],
  'collaboration-skills.html': [5, 20], 'concept-nursery.html': [3, 13], 'core-architectures-orientation-index.html': [3, 13],
  'cross-platform-collaboration-cycle.html': [3, 13], 'ehr-discrete-genomic-result.html': [1, 3],
  'ehr-interface-engine-replatform.html': [1, 3], 'ehr-pgx-alert-failure.html': [1, 3],
  'ehr-three-front-doors.html': [1, 3], 'ehr-two-charts-one-result.html': [1, 3],
  'field-inspection-harness-replatform.html': [1, 2], 'genomic-viewer-replatforming.html': [4, 11],
  'grammar-family.html': [7, 29, 11], 'hiring-surfaces-talent-agent-intake.html': [3, 12],
  'maps-evaluations.html': [2, 7], 'metadata-blocks.html': [2, 10], 'multilingual-clinical-vocabulary-practice.html': [2, 6],
  'planning-surface.html': [4, 18], 'poda.html': [3, 13], 'prompt-side-conditions-practice.html': [3, 14],
  'readable-tables-reusable-evidence.html': [2, 6], 'recoverable-enterprise-forms.html': [1, 6],
  'resting-concepts.html': [3, 12], 'shared-machinery.html': [1, 3], 'spatial-capture-collaborative-memory.html': [1, 3],
  'three-way-comparative-return.html': [1, 3], 'visualization-fidelity-atlas.html': [2, 9],
  'who-to-believe-reviews-platform.html': [1, 6],
};
const representatives = ['spatial-capture-collaborative-memory.html', 'multilingual-clinical-vocabulary-practice.html',
  'genomic-viewer-replatforming.html', 'ai-systems.html', 'who-to-believe-reviews-platform.html'];
const widths = [390, 896, 897, 1103, 1104, 1359, 1360, 1361, 1440, 2560];
const fault = '@media screen and (min-width:56.0625rem) { .page-section-rail + main :is(.architecture-pair,.repeatability-cards,.implementation-moves) { max-inline-size:none; margin-inline:0; } }';
const output = new URL('../../.visual-runs/card-rail-clearance/', import.meta.url);
const browsers = new Map();
let server;
before(async () => {
  server = await startStaticServer(); await mkdir(output, { recursive: true });
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) browsers.set(name, await engine.launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function open(engine, route, options = {}) {
  const { font = 16, restoreWidth = false, ...contextOptions } = options;
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...contextOptions });
  await context.route('**/*', async request => {
    const url = new URL(request.request().url());
    if (url.origin !== server.origin || url.pathname.startsWith('/v1-cdn/')) return request.fulfill({ body: '' });
    if ((font !== 16 || restoreWidth) && url.pathname === root + route) {
      const response = await request.fetch();
      return request.fulfill({ response, body: (await response.text()).replace('</head>', `<style>html{font-size:${font}px}${restoreWidth ? fault : ''}</style></head>`) });
    }
    return request.continue();
  });
  const page = await context.newPage(); await page.goto(server.origin + root + route, { waitUntil: 'load' });
  return { page, close: () => context.close() };
}

async function observe(page) {
  return page.evaluate(selector => {
    const rect = r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
    const pixel = value => Number.parseFloat(value) || 0;
    const shadows = value => value === 'none' ? [] : value.replace(/(?:rgba?|hsla?|color)\([^)]*\)/gu, '').split(',')
      .map(part => ({ inset: part.includes('inset'), sizes: (part.match(/-?\d+(?:\.\d+)?px/gu) || []).map(Number.parseFloat) }));
    const paint = (box, shadowList, outline = 0) => shadowList.reduce((extent, shadow) => {
      const [x = 0, , blur = 0, spread = 0] = shadow.sizes;
      return { left: Math.min(extent.left, box.left + x - blur - spread), right: Math.max(extent.right, box.right + x + blur + spread) };
    }, { left: box.left - outline, right: box.right + outline });
    const isDesktop = matchMedia('screen and (min-width:56.0625rem)').matches;
    const rail = document.querySelector('.page-section-rail');
    const railStyle = rail && getComputedStyle(rail);
    const markers = rail && railStyle.display !== 'none' ? [...rail.querySelectorAll('a')].filter(link => link.getClientRects().length).map(link => {
      const box = link.getBoundingClientRect(), style = getComputedStyle(link), pseudo = getComputedStyle(link, '::before');
      const width = pixel(pseudo.width) + (pseudo.boxSizing === 'content-box' ? pixel(pseudo.borderLeftWidth) + pixel(pseudo.borderRightWidth) : 0);
      const left = style.justifyContent === 'center' ? box.left + (box.width - width) / 2 : box.left + pixel(style.paddingLeft);
      const shadow = shadows(pseudo.boxShadow), outline = style.outlineStyle === 'none' ? 0 : Math.max(0, pixel(style.outlineWidth) + pixel(style.outlineOffset));
      let extent = paint({ left, right: left + width }, shadow);
      if (outline > 0 || !['rgba(0, 0, 0, 0)', 'transparent'].includes(style.backgroundColor)) {
        const control = paint(box, [], outline);
        extent = { left: Math.min(extent.left, control.left), right: Math.max(extent.right, control.right) };
      }
      return { ...extent, width, targetWidth: box.width, targetHeight: box.height, focus: link.matches(':focus-visible'),
        selected: link.getAttribute('aria-current') === 'location', shadow };
    }) : [];
    const groups = [...document.querySelectorAll(selector)].map(group => {
      const box = group.getBoundingClientRect(), owner = group.parentElement, ownerBox = owner.getBoundingClientRect(), ownerStyle = getComputedStyle(owner);
      const parentWidth = owner.clientWidth - pixel(ownerStyle.paddingLeft) - pixel(ownerStyle.paddingRight);
      return { box: rect(box), parentWidth, owner: rect(ownerBox),
        cards: [...group.querySelectorAll(':scope > :is(article, details)')].map(card => {
          const style = getComputedStyle(card), box = card.getBoundingClientRect(), shadow = shadows(style.boxShadow);
          const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT), text = []; let node;
          while ((node = walker.nextNode())) {
            if (!node.textContent.trim()) continue;
            const range = document.createRange(); range.selectNodeContents(node);
            let scrollOwner = node.parentElement;
            while (scrollOwner && scrollOwner !== card) {
              const overflow = getComputedStyle(scrollOwner).overflowX;
              if (['auto', 'scroll'].includes(overflow) && scrollOwner.scrollWidth > scrollOwner.clientWidth
                && scrollOwner.matches('pre, .table-scroll')) break;
              scrollOwner = scrollOwner.parentElement;
            }
            const scrollFrame = scrollOwner && scrollOwner !== card ? rect(scrollOwner.getBoundingClientRect()) : null;
            text.push(...[...range.getClientRects()].filter(r => r.width && r.height)
              .map(r => ({ ...rect(r), scrollFrame })));
          }
          return { tag: card.tagName, box: rect(box), paint: paint(box, shadow), shadow, text };
        }) };
    });
    return { groups, markers, desktop: isDesktop, viewport: document.documentElement.clientWidth,
      rootFont: pixel(getComputedStyle(document.documentElement).fontSize), railDisplay: railStyle?.display,
      readout: rail?.querySelector('.page-section-rail__readout')?.classList.contains('is-visible') || false };
  }, selector);
}
async function stable(page) {
  let previous;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const loaded = await page.evaluate(() => document.fonts.status === 'loaded');
    const current = await observe(page), encoded = JSON.stringify(current);
    if (loaded && encoded === previous) return current;
    previous = encoded;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.fail('Card and rail paint reaches a bounded settled state.');
}
function assertClearance(result, count) {
  assert.equal(result.groups.length, count[0]);
  assert.equal(result.groups.reduce((sum, group) => sum + group.cards.filter(card => card.tag === 'ARTICLE').length, 0), count[1], 'Every authored article participates in the paint observation.');
  assert.equal(result.groups.reduce((sum, group) => sum + group.cards.filter(card => card.tag === 'DETAILS').length, 0), count[2] || 0, 'Native disclosures retain their distinct semantic and paint inventory.');
  if (result.desktop) assert.ok(result.markers.length > 0, 'The generated reading rail participates.');
  for (const group of result.groups) {
    assert.ok(group.cards.length > 0, 'Each comparison group supplies its authored article or disclosure cards.');
    const expected = result.desktop ? Math.min(group.parentWidth, result.viewport - 10 * result.rootFont) : group.parentWidth;
    // These block/grid owners use their available parent width. The minimum
    // keeps an inset companion from growing merely because its viewport grew.
    assert.ok(Math.abs(group.box.width - expected) <= 2, 'The grid uses its local owner within the reserved viewport frame.');
    for (const card of group.cards) {
      assert.ok(card.shadow.every(shadow => !shadow.inset && shadow.sizes.length === 4 && shadow.sizes[2] === 0), 'The existing hard-shadow paint has a bounded extent.');
      assert.ok(card.paint.left >= -1.5 && card.paint.right <= result.viewport + 1.5, 'Card paint remains reachable within the viewport.');
      for (const fragment of card.text) {
        // A named pre/table scroll surface retains wider text locally; ordinary
        // card text stays inside the card after its available width changes.
        const frame = fragment.scrollFrame || fragment;
        assert.ok(frame.left >= card.box.left - 1.5 && frame.right <= card.box.right + 1.5,
          'Card text or its local pre/table scroll frame remains inside the card.');
      }
      if (result.desktop) assert.ok(card.paint.right + 1 <= Math.min(...result.markers.map(marker => marker.left)),
        'The card border and shadow leave a visible interval before persistent rail or focus paint.');
    }
  }
}

test('The authored card family names every generated-rail consumer and the authored-rail control', async () => {
  const directory = new URL(`../..${root}`, import.meta.url), sources = [];
  for (const name of await readdir(directory)) if (name.endsWith('.html')) {
    const source = await readFile(new URL(name, directory), 'utf8');
    const classes = [...source.matchAll(/class="([^"]+)"/gu)].map(match => match[1].split(/\s/u));
    if (classes.some(values => values.some(value => ['architecture-pair', 'repeatability-cards', 'implementation-moves'].includes(value)))) sources.push(name);
  }
  assert.deepEqual(sources.sort(), [...Object.keys(inventory), 'fmi-lims-eln-replatforming.html'].sort());
  assert.equal(Object.values(inventory).reduce((sum, count) => sum + count[0], 0), 69);
  assert.equal(Object.values(inventory).reduce((sum, count) => sum + count[1], 0), 271);
  assert.equal(Object.values(inventory).reduce((sum, count) => sum + (count[2] || 0), 0), 11);
});

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const [route, count] of Object.entries(inventory)) {
    test(`${engine}: ${route} keeps card paint clear across rail and reading seams`, { timeout: 60_000 }, async t => {
      const session = await open(engine, route); t.after(session.close);
      for (const width of widths) {
        await session.page.setViewportSize({ width, height: 1000 });
        await t.test(`${width}px`, async () => assertClearance(await stable(session.page), count));
      }
    });
  }
  for (const route of representatives) {
    test(`${engine}: ${route} preserves selected, hover, and keyboard rail paint at 200%`, { timeout: 30_000 }, async t => {
      const session = await open(engine, route, { font: 32 }); t.after(session.close);
      const links = session.page.locator('.page-section-rail a');
      // macOS WebKit includes native links through Option-Tab.
      await links.first().focus(); await session.page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
      let result = await stable(session.page);
      assert.ok(result.markers.some(marker => marker.focus), 'Keyboard navigation shows its focus outline.');
      assertClearance(result, inventory[route]);
      await session.page.keyboard.press('Enter'); result = await stable(session.page);
      assert.ok(result.markers.some(marker => marker.selected), 'Keyboard activation retains the selected destination.');
      assertClearance(result, inventory[route]);
      await links.nth(2).hover(); result = await stable(session.page);
      assert.equal(result.readout, true, 'Deliberate inspection opens the transient readout.');
      assertClearance(result, inventory[route]);
      await session.page.keyboard.press('Escape'); result = await stable(session.page);
      assert.equal(result.readout, false, 'Dismissal returns the full reading field.');
      // Readout overlays intentionally enter the reading field during deliberate
      // inspection. The lasting marker/focus boundary owns this clearance test.
    });
  }
  test(`${engine}: narrow rail retains its marker, touch target, and dismissible inspection`, { timeout: 30_000 }, async t => {
    const route = representatives[0], session = await open(engine, route, { font: 32, viewport: { width: 390, height: 844 }, hasTouch: true });
    t.after(session.close); const links = session.page.locator('.page-section-rail a');
    const before = await stable(session.page);
    await links.nth(1).tap(); let selected = await stable(session.page);
    assert.ok(selected.markers.some(marker => marker.selected));
    const selectedMarker = selected.markers.find(marker => marker.selected);
    assert.ok(selectedMarker.width > before.markers[1].width, 'The narrow marker expands to identify the selected section.');
    assert.ok(selectedMarker.targetWidth >= 24 && selectedMarker.targetHeight >= 24, 'The existing narrow touch target remains available.');
    await session.page.keyboard.press('Escape'); selected = await stable(session.page);
    assert.equal(selected.readout, false);
    const restored = await session.page.addStyleTag({ content: fault });
    const unchanged = await stable(session.page);
    assert.deepEqual(unchanged.groups.map(group => group.box), selected.groups.map(group => group.box), 'The desktop clearance rule leaves narrow card geometry with its existing owner.');
    await restored.evaluate(node => node.remove());
  });
  for (const mode of ['print', 'forced-colors']) {
    test(`${engine}: alternate ${mode} preserves card and rail ownership`, { timeout: 30_000 }, async t => {
      const route = representatives[0], session = await open(engine, route); t.after(session.close);
      await session.page.emulateMedia(mode === 'print' ? { media: 'print' } : { forcedColors: 'active' });
      const result = await stable(session.page); assertClearance(result, inventory[route]);
      if (mode === 'print') assert.equal(result.railDisplay, 'none');
    });
  }
  test(`${engine}: the restored card width exposes the disputed paint intersection`, { timeout: 30_000 }, async t => {
    const route = representatives[0], session = await open(engine, route); t.after(session.close);
    assertClearance(await stable(session.page), inventory[route]);
    const style = await session.page.addStyleTag({ content: fault });
    const broken = await stable(session.page);
    assert.ok(broken.groups.some(group => group.cards.some(card => card.paint.right > Math.min(...broken.markers.map(marker => marker.left)))), 'The old card width intersects persistent rail paint.');
    assert.throws(() => assertClearance(broken, inventory[route]));
    await style.evaluate(node => node.remove()); assertClearance(await stable(session.page), inventory[route]);
  });
  test(`${engine}: authored FMI rail and scriptless reading retain local card width`, { timeout: 30_000 }, async t => {
    for (const [route, options] of [['fmi-lims-eln-replatforming.html', {}], [representatives[0], { javaScriptEnabled: false }]]) {
      const session = await open(engine, route, options); t.after(session.close);
      assert.equal(await session.page.locator('.page-section-rail').count(), 0);
      const result = await stable(session.page);
      const comparison = await open(engine, route, { ...options, restoreWidth: true }); t.after(comparison.close);
      const inlineFrame = group => ({ left: group.box.left, right: group.box.right, width: group.box.width });
      assert.deepEqual((await stable(comparison.page)).groups.map(inlineFrame), result.groups.map(inlineFrame),
        'Authored-rail and scriptless cards preserve their local inline frame across fresh documents.');
    }
  });
}
