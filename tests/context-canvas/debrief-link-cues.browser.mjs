import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';
import { materializePublicReferenceHtml } from '../../tools/materialize-public-references.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const directory = new URL('../../context-canvas-project-surface/context-canvas/', import.meta.url);
const canonicalSource = await readFile(new URL('../../context-canvas-project-surface/data/debrief-case-briefs.source.html', import.meta.url), 'utf8');
const routes = [...canonicalSource.matchAll(/data-case-brief-source="([^"]+)"/gu)].map(match => match[1]);
routes.push('initiative-costing.html', 'one-figure-several-readings.html', 'readable-tables-reusable-evidence.html',
  'narrative-execution-gap-research-atlas.html', 'prompt-side-conditions-practice.html', 'benchmark-orientation.html',
  'maps-evaluations.html', 'debriefs.html');
const expectedOutside = new Map([
  ['genomic-viewer-replatforming.html', 28],
  ['fmi-clinical-trial-coordination.html', 11],
  ['fmi-lims-eln-replatforming.html', 22],
  ['choose-your-player-humatics.html', 8],
  ['who-to-believe-reviews-platform.html', 17],
  ['ehr-discrete-genomic-result.html', 5],
  ['ehr-two-charts-one-result.html', 5],
  ['ehr-three-front-doors.html', 5],
  ['ehr-pgx-alert-failure.html', 3],
  ['ehr-interface-engine-replatform.html', 5],
  ['field-inspection-harness-replatform.html', 2],
  ['distributed-inspection-harness.html', 1],
  ['three-way-comparative-return.html', 16],
  ['spatial-capture-collaborative-memory.html', 8],
  ['multilingual-clinical-vocabulary-practice.html', 10],
  ['recoverable-enterprise-forms.html', 21],
  ['initiative-costing.html', 2],
  ['one-figure-several-readings.html', 15],
  ['readable-tables-reusable-evidence.html', 33],
  ['narrative-execution-gap-research-atlas.html', 3],
  ['prompt-side-conditions-practice.html', 22],
  ['benchmark-orientation.html', 17],
  ['maps-evaluations.html', 12],
  ['debriefs.html', 2],
]);
const iconPath = 'M14 3h7v7M21 3l-11 11M10 5H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6';
const output = new URL('../../.visual-runs/debrief-link-cues/', import.meta.url);
const browsers = new Map();
let server;
before(async () => {
  server = await startStaticServer();
  await mkdir(output, { recursive: true });
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) browsers.set(name, await engine.launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function open(t, engine, route, options = {}) {
  const { transformHtml, ...contextOptions } = options;
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...contextOptions });
  t.after(() => context.close());
  // These checks observe native parent links and paint. External services and
  // instrument interiors retain their separate delivery and behavior owners.
  await context.route('**/*', async request => {
    const url = new URL(request.request().url());
    if (url.origin !== server.origin) return request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Destination owner</title>' });
    if (transformHtml && url.pathname === root + route) {
      const response = await request.fetch();
      return request.fulfill({ response, body: transformHtml(await response.text()) });
    }
    return request.continue();
  });
  const page = await context.newPage();
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  if (options.javaScriptEnabled !== false) await page.evaluate(() => document.fonts.ready);
  return page;
}

async function inventory(page) {
  return page.locator('a[href]').evaluateAll((links, { canvasRoot, canvasAssets }) => links.flatMap(link => {
    const href = link.getAttribute('href');
    let context;
    if (link.target === '_blank') context = 'new-tab';
    else if (href.startsWith('{{PUBLIC_URL_REGISTRY_')) context = 'outside';
    else {
      const url = new URL(href, location.href);
      if (!['http:', 'https:'].includes(url.protocol)) return [];
      if (url.hostname === 'vik.guru' && url.pathname.startsWith('/v1-cdn/video/')) context = 'owned-media';
      else if (url.origin !== location.origin) context = 'outside';
      else if (url.pathname.startsWith(canvasRoot) || url.pathname.startsWith(canvasAssets)) return [];
      else context = /\.(?:svg|webp|png|jpg|mp4)$/u.test(url.pathname) ? 'full-size-artifact' : 'outside';
    }
    if (!context) return [];
    // The generated footer names these external destinations in their own
    // paragraphs. Its specific nearby wording supplies the visible cue.
    if (link.closest('.super-footer__closing')) {
      return [{ context: 'footer', text: link.parentElement.textContent, target: link.target }];
    }
    return [{ context, href, target: link.target, rel: link.rel, text: link.textContent.replace(/\s+/gu, ' ').trim(),
      name: link.getAttribute('aria-label'), title: link.title,
      icons: [...link.querySelectorAll('svg.canvas-link-icon')].map(icon => {
        const rect = icon.getBoundingClientRect(), css = getComputedStyle(icon);
        return { hidden: icon.getAttribute('aria-hidden'), focusable: icon.getAttribute('focusable'),
          width: icon.getAttribute('width'), height: icon.getAttribute('height'), viewBox: icon.getAttribute('viewBox'), path: icon.querySelector('path')?.getAttribute('d'),
          paint: { width: rect.width, height: rect.height, stroke: css.stroke, color: getComputedStyle(link).color,
            font: parseFloat(getComputedStyle(link).fontSize), intentionallyHidden: Boolean(icon.closest('[hidden], details:not([open])')) } };
      }),
      cue: link.querySelector('.fmi-link-cue')?.textContent.trim(),
    }];
  }), { canvasRoot: root, canvasAssets: '/context-canvas-project-surface/img/' });
}

function assertLink(link) {
  if (link.context === 'footer') {
    assert.match(link.text, /(?:leaves the Context Canvas|outside the Context Canvas)/u);
    assert.equal(link.target, '');
  } else if (['owned-media', 'full-size-artifact'].includes(link.context)) {
    assert.match(link.name ?? link.text, /(?:file \(MP4\)|at full size)/u, 'Full-view media names its context directly.');
    assert.equal(link.target, '');
  } else {
    assert.equal(link.icons.length, 1, `${link.text}: one visible navigation-context icon`);
    const { paint: painted, ...semantics } = link.icons[0];
    assert.deepEqual(semantics, { hidden: 'true', focusable: 'false', width: '.85em', height: '.85em', viewBox: '0 0 24 24', path: iconPath });
    if (!painted.intentionallyHidden) {
      assert.ok(painted.width > 0 && painted.height > 0 && painted.width <= painted.font * 1.1 && painted.height <= painted.font * 1.1, `${link.text}: the icon paints at text size`);
      assert.equal(painted.stroke, painted.color, `${link.text}: the icon follows its link foreground`);
    }
    if (link.context === 'new-tab') {
      assert.equal(link.target, '_blank');
      assert.equal(link.cue, '(opens in a new tab)');
      assert.match(link.rel, /noopener/u);
      assert.match(link.rel, /noreferrer/u);
    } else {
      assert.equal(link.target, '', `${link.text}: the visitor retains the native browsing-context choice`);
      assert.equal(link.name, `${link.text} (outside Context Canvas)`, 'The accessible name retains the complete visible label and states the destination context.');
      assert.equal(link.title, 'Outside Context Canvas');
      assert.doesNotMatch(link.name, /new tab/u);
    }
  }
}

async function paint(page, selector = 'a[aria-label$="(outside Context Canvas)"]') {
  const link = page.locator(selector).first();
  await link.scrollIntoViewIfNeeded();
  return link.evaluate(link => {
    const icon = link.querySelector('.canvas-link-icon'), css = getComputedStyle(icon), linkCss = getComputedStyle(link);
    const rect = icon.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(link);
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right,
      viewport: document.documentElement.clientWidth, font: parseFloat(linkCss.fontSize),
      fill: css.fill, stroke: css.stroke, color: linkCss.color, strokeWidth: parseFloat(css.strokeWidth),
      display: css.display, visibility: css.visibility, outline: linkCss.outlineStyle,
      outlineWidth: parseFloat(linkCss.outlineWidth), fragments: [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0).map(rect => ({ left: rect.left, right: rect.right })),
    };
  });
}

function assertPaint(value, { screen = true } = {}) {
  assert.ok(value.width > 0 && value.height > 0 && value.width <= value.font * 1.1 && value.height <= value.font * 1.1, 'The cue paints at the surrounding text size.');
  assert.equal(value.fill, 'none');
  assert.equal(value.stroke, value.color, 'The icon follows the link foreground.');
  assert.equal(value.strokeWidth, 1.8);
  assert.notEqual(value.display, 'none');
  assert.equal(value.visibility, 'visible');
  if (screen) {
    assert.ok(value.left >= -1 && value.right <= value.viewport + 1, 'The cue stays in the visitor field.');
    assert.ok(value.fragments.every(rect => rect.left >= -1 && rect.right <= value.viewport + 1), 'The complete link and icon wrap within the visitor field.');
  }
}

test('The link inventory covers all catalog readings and preserves materialized Registry cues', async () => {
  assert.equal(new Set(routes).size, 24);
  const catalog = await readFile(new URL('debriefs.html', directory), 'utf8');
  for (const route of routes.filter(route => route !== 'debriefs.html')) assert.ok(catalog.includes(`href="${route}"`), `${route}: the route belongs to the current catalog`);
  let resolved = 0;
  for (const route of routes) {
    const source = await readFile(new URL(route, directory), 'utf8');
    for (const anchor of source.matchAll(/<a\b[^>]*href="\{\{(PUBLIC_URL_REGISTRY_[A-Z0-9_]+)\}\}"[^>]*>[\s\S]*?<\/a>/gu)) {
      const destination = 'https://kindlight.systems/registry-cue-fixture/';
      const result = materializePublicReferenceHtml(anchor[0], new Map([[anchor[1], destination]]), route);
      assert.equal(result, anchor[0].replace(`{{${anchor[1]}}}`, destination), 'URL binding preserves the authored SVG, visible text, accessible qualifier, and native target.');
      resolved += 1;
    }
  }
  assert.ok(resolved > 30, 'The actual Registry link population supplies the materialization fixtures.');
});

for (const route of routes) {
  test(`Chromium: ${route} identifies each outgoing context without changing tab choice`, async t => {
    const page = await open(t, 'chromium', route);
    const links = await inventory(page);
    for (const link of links) assertLink(link);
    assert.equal(links.filter(link => link.context === 'outside').length, expectedOutside.get(route), 'The audited outgoing-link population remains explicit.');
    assert.equal(links.filter(link => link.context === 'new-tab').length, route === 'fmi-lims-eln-replatforming.html' ? 17 : 0);
  });
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const route of ['genomic-viewer-replatforming.html', 'fmi-lims-eln-replatforming.html', 'who-to-believe-reviews-platform.html', 'maps-evaluations.html']) {
    test(`${engine}: ${route} keeps cue paint with wrapped and enlarged link labels`, async t => {
      const page = await open(t, engine, route);
      for (const [width, scale] of [[1440, 100], [390, 100], [320, 200]]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(scale => { document.documentElement.style.fontSize = `${scale}%`; }, scale);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assertPaint(await paint(page));
      }
      await page.locator('a[aria-label$="(outside Context Canvas)"]').first().focus();
      const focused = await paint(page);
      assertPaint(focused);
      assert.ok(focused.outline !== 'none' && focused.outlineWidth > 0, 'Keyboard focus remains visibly outlined.');
      await page.screenshot({ path: new URL(`${engine}-${route.replace('.html', '')}-narrow.png`, output).pathname });
    });
  }
  test(`${engine}: cue semantics and paint survive scriptless, print, and forced-color reading`, async t => {
    const page = await open(t, engine, 'fmi-lims-eln-replatforming.html', { javaScriptEnabled: false });
    for (const link of await inventory(page)) assertLink(link);
    assertPaint(await paint(page, '.fmi-method-link'));
    await page.emulateMedia({ media: 'print' });
    assertPaint(await paint(page), { screen: false });
    await page.emulateMedia({ media: 'screen', forcedColors: 'active' });
    assertPaint(await paint(page));
  });
  test(`${engine}: native same-tab and authored new-tab links retain separate destinations`, async t => {
    const page = await open(t, engine, 'fmi-lims-eln-replatforming.html');
    const sameTab = page.locator('a[href="https://cometspectrum.ai/"]').first();
    const destination = await sameTab.getAttribute('href');
    await sameTab.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(destination);
    assert.equal(page.context().pages().length, 1, 'An ordinary outgoing link uses the current tab.');
    await page.goto(server.origin + root + 'fmi-lims-eln-replatforming.html');
    const newTab = page.getByRole('link', { name: 'PODA (opens in a new tab)', exact: true });
    const popupPromise = page.waitForEvent('popup');
    await newTab.focus(); await page.keyboard.press('Enter');
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.match(popup.url(), /poda-chimeric-prototype-v0\.1\.5\.html$/u);
    assert.match(page.url(), /fmi-lims-eln-replatforming\.html$/u);
    await popup.close();
  });
  test(`${engine}: a missing visible cue breaks the observation and restoration passes`, async t => {
    const page = await open(t, engine, 'genomic-viewer-replatforming.html');
    const original = await page.locator('a[aria-label$="(outside Context Canvas)"]').first().innerHTML();
    const selector = 'a[aria-label$="(outside Context Canvas)"]';
    assertPaint(await paint(page));
    await page.locator(selector).first().locator('svg').evaluate(icon => { icon.style.display = 'none'; });
    const hiddenPaint = await paint(page);
    assert.throws(() => assertPaint(hiddenPaint), /cue paints/u);
    await page.locator(selector).first().locator('svg').evaluate(icon => { icon.style.removeProperty('display'); });
    assertPaint(await paint(page));
    await page.locator(selector).first().locator('svg').evaluate(icon => icon.remove());
    const broken = (await inventory(page)).find(link => link.context === 'outside');
    assert.throws(() => assertLink(broken), /one visible navigation-context icon/u, 'The observed missing cue fails the real inventory oracle.');
    await page.locator(selector).first().evaluate((link, html) => { link.innerHTML = html; }, original);
    assertLink((await inventory(page)).find(link => link.context === 'outside'));
    assertPaint(await paint(page));
  });
}

async function initialCompanion(page) {
  return page.locator('[aria-labelledby="enterprise-reference-title"] .fmi-companion-reading').evaluate(body => {
    const rect = body.getBoundingClientRect(), gap = parseFloat(getComputedStyle(body).columnGap);
    const midpoint = (rect.left + rect.right) / 2;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const fragments = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      fragments.push(...[...range.getClientRects()].filter(rect => rect.width > 0).map(rect => ({ left: rect.left, right: rect.right })));
    }
    return { left: fragments.some(rect => rect.right <= midpoint - gap / 2 + 2),
      right: fragments.some(rect => rect.left >= midpoint + gap / 2 - 2), height: rect.height };
  });
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: explicit SVG dimensions preserve both companion columns on first load`, async t => {
    const page = await open(t, engine, 'fmi-lims-eln-replatforming.html');
    const initial = await initialCompanion(page);
    assert.ok(initial.left && initial.right, 'The first observed reading already distributes prose across both columns.');
  });
}

test('WebKit: unsized SVG markup reproduces the initial column fault; fresh authored source recovers', async t => {
  const page = await open(t, 'webkit', 'fmi-lims-eln-replatforming.html', {
    transformHtml: html => html.replaceAll('<svg class="canvas-link-icon" width=".85em" height=".85em"', '<svg class="canvas-link-icon"'),
  });
  // This source fault enters before parsing and first layout. Resizing a stable
  // page would rebalance the columns and leave the initialization defect open.
  const fault = await initialCompanion(page);
  assert.ok(fault.left && !fault.right, 'The unsized SVG source reproduces the lost second column.');
  const recovered = await open(t, 'webkit', 'fmi-lims-eln-replatforming.html');
  const intended = await initialCompanion(recovered);
  assert.ok(intended.left && intended.right && intended.height < fault.height, 'A fresh page with authored dimensions restores both useful reading lanes.');
});
