import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const routes = new Map([
  ['choose-your-player-humatics.html', [5, 1]],
  ['fmi-clinical-trial-coordination.html', [9, 2]],
  ['fmi-lims-eln-replatforming.html', [6, 0]],
  ['genomic-viewer-replatforming.html', [10, 0]],
  ['who-to-believe-reviews-platform.html', [5, 1]],
]);
const screenWidths = [390, 896, 897, 1023, 1024, 1025, 1199, 1200, 1440, 2560];
const boundedCaptions = new Map([
  ['fmi-clinical-trial-coordination.html', {
    selector: 'figure:has(img[src$="fmi_human_automation_diff.svg"])',
    paintedOwner: '.prose-flow',
    text: ['operational rather than performative', 'Partner-specific values remain undisclosed'],
  }],
  ['genomic-viewer-replatforming.html', {
    selector: '#genomics-situation-models',
    paintedOwner: '.genomic-context-tree-feature',
    text: ['Figure 3. Genomics situation-model player cards.', 'Each account stays revisable'],
  }],
]);
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

async function openReading(t, engine, route, options = {}) {
  const page = await browsers.get(engine).newPage({
    viewport: { width: 390, height: 1000 }, reducedMotion: 'reduce', ...options,
  });
  t.after(() => page.close());
  // Parent-page figures and local images own this observation. Embedded
  // instruments and remote media retain their separate delivery contracts.
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue()
    : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Parent reading</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  if (options.javaScriptEnabled !== false) await page.evaluate(() => document.fonts.ready);
  return page;
}

async function settle(page, width, scripting = true) {
  await page.setViewportSize({ width, height: 1000 });
  if (scripting) await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function observeFigures(page) {
  return page.evaluate(() => {
    const rect = node => {
      const value = node.getBoundingClientRect();
      return { left: value.left, right: value.right, width: value.width };
    };
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      figures: [...document.querySelectorAll('.debrief-proxy-figure')].map(figure => {
        const frame = figure.querySelector('.debrief-proxy-frame');
        const link = frame.querySelector('.story-visual__open');
        const parent = figure.parentElement;
        const parentStyle = getComputedStyle(parent);
        const frameStyle = getComputedStyle(frame);
        const figureStyle = getComputedStyle(figure);
        return {
          id: figure.id, portrait: frame.classList.contains('debrief-proxy-frame--portrait'),
          box: rect(figure), parentWidth: parent.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight),
          frame: { ...rect(frame), client: frame.clientWidth, scroll: frame.scrollWidth, overflow: frameStyle.overflowX,
            min: frameStyle.minInlineSize, tab: frame.tabIndex, role: frame.getAttribute('role'), name: frame.getAttribute('aria-label') },
          link: { ...rect(link), min: getComputedStyle(link).minInlineSize, href: link.getAttribute('href') },
          figureMin: figureStyle.minInlineSize,
          captionColors: [...figure.querySelectorAll('.table-note strong')].map(node => ({
            emphasis: getComputedStyle(node).color, parent: getComputedStyle(node.parentElement).color,
          })),
        };
      }),
    };
  });
}

async function observeBoundedCaption(page, { selector, paintedOwner }) {
  return page.locator(selector).evaluate((figure, ownerSelector) => {
    const bounds = value => {
      return {
        left: value.left, right: value.right, top: value.top, bottom: value.bottom,
        width: value.width, height: value.height, center: value.left + value.width / 2,
      };
    };
    const rect = node => bounds(node.getBoundingClientRect());
    const caption = figure.querySelector(':scope > figcaption.table-note');
    const media = figure.querySelector(':scope > .debrief-proxy-frame')
      || figure.querySelector(':scope > .story-visual__open');
    const owner = figure.closest(ownerSelector);
    const captionStyle = getComputedStyle(caption);
    const walker = document.createTreeWalker(caption, NodeFilter.SHOW_TEXT);
    const fragments = [];
    let node;
    while ((node = walker.nextNode())) {
      const start = node.textContent.search(/\S/u);
      if (start < 0) continue;
      const end = node.textContent.search(/\s*$/u);
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      fragments.push(...[...range.getClientRects()]
        .filter(value => value.width > 0 && value.height > 0)
        .map(bounds));
    }
    return {
      optedIn: figure.classList.contains('story-visual--bounded-caption'),
      text: caption.textContent.replace(/\s+/gu, ' ').trim(),
      figure: rect(figure), caption: rect(caption), media: rect(media), paintedOwner: rect(owner),
      margins: {
        start: Number.parseFloat(captionStyle.marginInlineStart),
        end: Number.parseFloat(captionStyle.marginInlineEnd),
      },
      fragments,
    };
  }, paintedOwner);
}

function near(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) <= 1, `${message}: ${actual}px / ${expected}px`);
}

function assertInventory(observation, route) {
  const [figures, portraits] = routes.get(route);
  assert.equal(observation.figures.length, figures, `${route}: every authored reference figure is observed`);
  assert.equal(observation.figures.filter(figure => figure.portrait).length, portraits, `${route}: portrait inventory`);
  assert.equal(new Set(observation.figures.map(figure => figure.id)).size, figures, `${route}: stable figure identities`);
}

function assertScreen(observation, route) {
  assertInventory(observation, route);
  assert.ok(observation.documentWidth <= observation.viewport + 1, `${route}: local inspection preserves page containment`);
  for (const figure of observation.figures) {
    const label = `${route} ${figure.id}`;
    assert.ok(figure.box.left >= -1 && figure.box.right <= observation.viewport + 1, `${label}: outer figure stays in the reading field`);
    assert.ok(figure.frame.left >= figure.box.left - 1 && figure.frame.right <= figure.box.right + 1, `${label}: inspection window fits its figure`);
    assert.equal(figure.frame.overflow, 'auto', `${label}: the frame retains local scrolling`);
    assert.ok(figure.link.href?.endsWith('.webp'), `${label}: full-size inspection remains linked`);
    assert.ok(figure.captionColors.length > 0, `${label}: the figure retains visible caption emphasis`);
    for (const color of figure.captionColors) {
      assert.equal(color.emphasis, color.parent, `${label}: caption emphasis inherits its parent color`);
    }
    if (route === 'fmi-lims-eln-replatforming.html' && observation.viewport >= 1200) {
      // This route authors its own rail, so the later shell's generated-rail
      // selector stays outside its cascade. At 75rem the route reserves 15rem
      // within the 92vw field and retains the shared 96rem editorial cap.
      near(figure.box.width, Math.min(observation.viewport * .92 - 240, 1536),
        `${label}: the 75rem FMI rail allocation remains the winning width`);
    }
    if (figure.portrait) {
      assert.ok(figure.frame.width <= 672 + 1, `${label}: portrait retains its 42rem cap`);
      near(figure.link.width, figure.frame.client, `${label}: portrait image fits the local frame`);
      assert.equal(figure.frame.tab, -1, `${label}: fitted portrait keeps ordinary link focus`);
    } else {
      assert.ok(figure.link.width >= 896 - 1, `${label}: landscape retains its 56rem inspection canvas`);
      assert.ok(figure.link.width >= figure.frame.client - 1, `${label}: landscape fills larger frames`);
      assert.equal(figure.frame.tab, 0, `${label}: local scroll window accepts keyboard focus`);
      assert.equal(figure.frame.role, 'region');
      assert.ok(figure.frame.name?.length > 20);
      if (observation.viewport === 390) assert.ok(figure.frame.scroll > figure.frame.client + 1, `${label}: narrow inspection remains locally scrollable`);
    }
  }
}

function assertFallbackSeam(observation, route, width) {
  assertInventory(observation, route);
  for (const figure of observation.figures) {
    if (width <= 1024) near(figure.box.width, figure.parentWidth, `${figure.id}: the inclusive 64rem shared fallback fills its parent`);
    else near(figure.box.width, Math.min(width * .92, 1248), `${figure.id}: above 64rem the proxy retains its bounded inspection width`);
  }
}

function assertBoundedCaption(observation, expected, label) {
  assert.equal(observation.optedIn, true, `${label}: the authored figure opts into the bounded caption treatment`);
  for (const fragment of expected.text) {
    assert.ok(observation.text.includes(fragment), `${label}: the authored caption retains “${fragment}”`);
  }
  near(observation.caption.center, observation.figure.center, `${label}: caption stays centered in its extended visual`);
  near(observation.margins.start, observation.margins.end, `${label}: logical auto margins share the available room`);
  near(observation.media.left, observation.figure.left, `${label}: media keeps its existing inline start`);
  near(observation.media.right, observation.figure.right, `${label}: media keeps its existing inline end`);
  assert.ok(observation.caption.left >= observation.paintedOwner.left - 1
    && observation.caption.right <= observation.paintedOwner.right + 1,
  `${label}: caption stays inside its local painted reading boundary`);
  assert.ok(observation.fragments.length > 0, `${label}: caption exposes visible text fragments`);
  for (const fragment of observation.fragments) {
    assert.ok(fragment.left >= observation.caption.left - 1 && fragment.right <= observation.caption.right + 1
      && fragment.top >= observation.caption.top - 1 && fragment.bottom <= observation.caption.bottom + 1,
    `${label}: each visible text fragment stays inside the caption box`);
    assert.ok(fragment.left >= observation.paintedOwner.left - 1 && fragment.right <= observation.paintedOwner.right + 1,
      `${label}: each visible text fragment stays inside the painted reading boundary`);
  }
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const route of routes.keys()) {
    test(`${engine}: ${route} reference figures preserve local inspection across responsive seams`, async t => {
      const page = await openReading(t, engine, route);
      for (const width of screenWidths) {
        await settle(page, width);
        assertScreen(await observeFigures(page), route);
      }
    });

    test(`${engine}: ${route} scriptless figures preserve the shared 64rem fallback`, async t => {
      const page = await openReading(t, engine, route, { javaScriptEnabled: false });
      assert.equal(await page.locator('.page-section-rail').count(), 0, 'The generated rail remains absent in the fallback observation.');
      for (const width of [1023, 1024, 1025]) {
        await settle(page, width, false);
        assertFallbackSeam(await observeFigures(page), route, width);
      }
    });

    test(`${engine}: ${route} keeps keyboard inspection, forced-color focus, and print release`, async t => {
      const page = await openReading(t, engine, route);
      const frame = page.locator('.debrief-proxy-frame:not(.debrief-proxy-frame--portrait)').first();
      await frame.scrollIntoViewIfNeeded();
      const image = frame.locator('img');
      await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
      await page.keyboard.press('Tab');
      await frame.focus();
      assert.equal(await frame.evaluate(node => node.matches(':focus-visible')), true, 'Keyboard inspection exposes the focused window.');
      assert.equal(await frame.evaluate(node => getComputedStyle(node).outlineStyle), 'solid');
      // The installed WebKit environment scrolls a focused overflow region
      // with its horizontal page shortcut; its bare ArrowRight leaves the
      // accepted baseline stationary. Other engines use the ordinary arrow.
      await frame.press(engine === 'webkit' ? 'Alt+ArrowRight' : 'ArrowRight');
      await expect.poll(() => frame.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
      await frame.evaluate(node => { node.scrollLeft = node.scrollWidth; });
      const end = await frame.evaluate(node => {
        const window = node.getBoundingClientRect(), link = node.querySelector('.story-visual__open').getBoundingClientRect();
        const accepted = node.scrollLeft;
        node.scrollLeft = accepted + 1;
        return { left: accepted, afterExtraPixel: node.scrollLeft, visible: window.right - link.right };
      });
      // Classic Linux Chromium scrollbars reserve a stable inline gutter;
      // overlay-scrollbar engines do not. Observe the browser-clamped end and
      // content edge instead of counting native scrollbar paint as travel.
      assert.ok(end.left > 0, 'The local reading retains a travelled horizontal position.');
      near(end.afterExtraPixel, end.left, 'The local reading reaches its browser-clamped horizontal end');
      assert.ok(end.visible >= -1, 'The final image edge is reachable inside the local window.');
      await page.emulateMedia({ forcedColors: 'active' });
      assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
      await frame.focus();
      const focus = await frame.evaluate(node => {
        const style = getComputedStyle(node);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      assert.equal(focus.style, 'solid');
      assert.ok(focus.width >= 3, 'Forced-color emulation retains the visible focus outline.');
      await settle(page, 1440);
      await page.emulateMedia({ media: 'print', forcedColors: 'none' });
      const printed = await observeFigures(page);
      assertInventory(printed, route);
      for (const figure of printed.figures) {
        assert.equal(figure.frame.overflow, 'visible', `${figure.id}: print releases local scrolling`);
        assert.equal(figure.figureMin, '0px');
        assert.equal(figure.frame.min, '0px');
        assert.equal(figure.link.min, '0px');
        near(figure.frame.width, figure.box.width, `${figure.id}: print uses its full figure width`);
        near(figure.link.width, figure.frame.client, `${figure.id}: print releases the landscape floor and portrait cap`);
      }
    });
  }

  test(`${engine}: selected extended visuals center their captions inside the local painted reading`, async t => {
    for (const [route, expected] of boundedCaptions) {
      const page = await openReading(t, engine, route);
      for (const width of screenWidths) {
        await settle(page, width);
        assertBoundedCaption(await observeBoundedCaption(page, expected), expected, `${route} at ${width}px`);
      }
    }
  });

  test(`${engine}: the bounded-caption oracle rejects a displaced margin while media geometry stays fixed`, async t => {
    const route = 'genomic-viewer-replatforming.html';
    const expected = boundedCaptions.get(route);
    const page = await openReading(t, engine, route);
    await settle(page, 2560);
    const accepted = await observeBoundedCaption(page, expected);
    assertBoundedCaption(accepted, expected, `${route} accepted geometry`);
    const marginFault = await page.addStyleTag({
      content: '.story-visual--bounded-caption > figcaption.table-note { margin-inline: 0 !important; }',
    });
    try {
      const changed = await observeBoundedCaption(page, expected);
      near(changed.media.left, accepted.media.left, 'The controlled caption fault leaves media inline start unchanged');
      near(changed.media.right, accepted.media.right, 'The controlled caption fault leaves media inline end unchanged');
      assert.throws(() => assertBoundedCaption(changed, expected, 'controlled margin fault'),
        /caption stays centered|caption stays inside its local painted reading boundary/u);
    } finally { await marginFault.evaluate(node => node.remove()); }
    assertBoundedCaption(await observeBoundedCaption(page, expected), expected, `${route} restored geometry`);
  });

  test(`${engine}: reference oracles reject lost canvas width, displaced caption color, and shared fallback faults, then restore`, async t => {
    const route = 'who-to-believe-reviews-platform.html';
    const page = await openReading(t, engine, route);
    assertScreen(await observeFigures(page), route);
    const floorFault = await page.addStyleTag({ content: '.debrief-proxy-frame:not(.debrief-proxy-frame--portrait) .story-visual__open { inline-size: 100% !important; }' });
    try {
      const changed = await observeFigures(page);
      assert.throws(() => assertScreen(changed, route), /56rem inspection canvas/u);
    }
    finally { await floorFault.evaluate(node => node.remove()); }
    assertScreen(await observeFigures(page), route);

    const colorFault = await page.addStyleTag({ content: '.debrief-proxy-figure .table-note strong { color: rgb(1, 2, 3) !important; }' });
    try {
      const changed = await observeFigures(page);
      assert.throws(() => assertScreen(changed, route), /caption emphasis inherits its parent color/u);
    }
    finally { await colorFault.evaluate(node => node.remove()); }
    assertScreen(await observeFigures(page), route);

    const fallback = await openReading(t, engine, route, { javaScriptEnabled: false, viewport: { width: 1024, height: 1000 } });
    assertFallbackSeam(await observeFigures(fallback), route, 1024);
    // The generated rail has higher specificity from 897px onward. Removing
    // the actual moved fallback in a scriptless page exposes this extraction
    // fault directly, while a rail-enhanced observation could conceal it.
    const removed = await fallback.evaluate(() => {
      const sheet = [...document.styleSheets].find(sheet => sheet.href?.endsWith('/styles/components/debrief-reading.css'));
      for (const [outerIndex, rule] of [...sheet.cssRules].entries()) {
        if (rule.conditionText !== 'screen and (max-width: 64rem)') continue;
        const innerIndex = [...rule.cssRules].findIndex(child => child.selectorText === '.debrief-proxy-figure');
        if (innerIndex < 0) continue;
        const cssText = rule.cssRules[innerIndex].cssText;
        rule.deleteRule(innerIndex);
        return { outerIndex, innerIndex, cssText };
      }
      throw new Error('The moved reference-figure fallback rule must be observable.');
    });
    try {
      const changed = await observeFigures(fallback);
      assert.throws(() => assertFallbackSeam(changed, route, 1024), /inclusive 64rem shared fallback/u);
    }
    finally {
      await fallback.evaluate(({ outerIndex, innerIndex, cssText }) => {
        const sheet = [...document.styleSheets].find(sheet => sheet.href?.endsWith('/styles/components/debrief-reading.css'));
        sheet.cssRules[outerIndex].insertRule(cssText, innerIndex);
      }, removed);
    }
    assertFallbackSeam(await observeFigures(fallback), route, 1024);
  });
}
