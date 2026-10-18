import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const route = root + 'fmi-lims-eln-replatforming.html';
const rail = '.fmi-reading-rail';
const first = 'genomics-sequencing-process-walkthrough';
const solution = 'solution-architecture-title';
const implementation = 'implementation-architecture-title';
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

async function open(t, engine, options = {}, fragment = '') {
  const page = await browsers.get(engine).newPage({
    viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options,
  });
  t.after(() => page.close());
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'The route keeps enhancement errors observable.'));
  // This contract observes the parent reading and its native navigation.
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue()
    : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' }));
  await page.goto(server.origin + route + fragment, { waitUntil: 'load' });
  if (options.javaScriptEnabled !== false) {
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(rail)).toHaveAttribute('data-reading-ready', 'true');
  }
  return page;
}

function link(page, id) {
  return page.locator(`${rail} a[href="#${id}"]`);
}

async function scrollToHeading(page, id) {
  await page.evaluate(target => document.getElementById(target).scrollIntoView({ block: 'start', behavior: 'instant' }), id);
}

async function assertState(page, current, selected) {
  await expect.poll(async () => page.locator(`${rail} a[aria-current="location"]`).evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('href')))).toEqual(current ? ['#' + current] : []);
  await expect.poll(async () => page.locator(`${rail} a.is-selected`).evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('href')))).toEqual(selected ? ['#' + selected] : []);
  const states = await page.locator(`${rail} a`).evaluateAll(nodes => nodes.map(node => ({
    href: node.getAttribute('href'), current: node.classList.contains('is-current'),
    status: node.querySelector('.fmi-reading-rail__state')?.textContent,
    describedBy: node.getAttribute('aria-describedby'),
    statusId: node.querySelector('.fmi-reading-rail__state')?.id,
  })));
  assert.equal(states.length, 9, 'The authored nine-destination reading stays complete.');
  for (const state of states) {
    assert.equal(state.current, state.href === '#' + current);
    const expected = [state.href === '#' + current ? 'Reading' : '', state.href === '#' + selected ? 'Selected' : ''].filter(Boolean).join(' · ');
    assert.equal(state.status, expected, `${state.href}: visible state names its actual meaning`);
    assert.ok(state.describedBy?.split(' ').includes(state.statusId), 'The state description is also available to assistive technology.');
  }
}

async function assertCompactLabelPaint(page, id) {
  const label = link(page, id).locator('.fmi-reading-rail__text');
  await expect(label).toBeVisible();
  await expect.poll(() => label.evaluate(node => {
    const box = node.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return Boolean(hit && (hit === node || node.contains(hit)));
  })).toBe(true);
  const box = await label.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box.x >= 0 && box.x + box.width <= viewport.width, 'The compact label fits horizontally in the visitor field.');
  assert.ok(box.y >= 0 && box.y + box.height <= viewport.height, 'The compact label fits vertically in the visitor field.');
}

async function divergentJourney(page) {
  await link(page, solution).click();
  await assertState(page, solution, solution);
  await scrollToHeading(page, implementation);
  await assertState(page, implementation, solution);
  assert.equal(new URL(page.url()).hash, '#' + solution, 'Passive reading preserves the selected URL destination.');
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: authored rail distinguishes current reading from the selected destination`, async t => {
    const page = await open(t, engine);
    await assertState(page, null, null);
    assert.equal(await page.locator('.page-section-rail').count(), 0, 'The shared shell leaves this authored rail with its own owner.');
    await divergentJourney(page);
    await expect(link(page, solution).locator('.fmi-reading-rail__state')).toHaveText('Selected');
    await expect(link(page, implementation).locator('.fmi-reading-rail__state')).toHaveText('Reading');
    const selected = await link(page, solution).evaluate(node => getComputedStyle(node).borderStyle);
    const current = await link(page, implementation).evaluate(node => getComputedStyle(node).backgroundColor);
    const resting = await link(page, first).evaluate(node => getComputedStyle(node).backgroundColor);
    assert.equal(selected, 'double', 'Full rail marks selection with a shape as well as text.');
    assert.notEqual(current, resting, 'Full rail paints current reading distinctly.');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await assertState(page, null, solution);
  });

  test(`${engine}: deep links, keyboard activation and history keep native fragment navigation`, async t => {
    const page = await open(t, engine, {}, '#' + solution);
    await assertState(page, solution, solution);
    await link(page, implementation).focus();
    const focus = await link(page, implementation).evaluate(node => ({
      active: document.activeElement === node, style: getComputedStyle(node).outlineStyle,
      width: parseFloat(getComputedStyle(node).outlineWidth),
    }));
    assert.equal(focus.active, true);
    assert.notEqual(focus.style, 'none');
    assert.ok(focus.width > 0, 'Keyboard focus retains visible paint.');
    await page.keyboard.press('Enter');
    await assertState(page, implementation, implementation);
    await page.goBack();
    await assertState(page, solution, solution);
    await page.goForward();
    await assertState(page, implementation, implementation);
    const clearance = await page.locator('#' + implementation).evaluate(node => ({
      top: node.getBoundingClientRect().top,
      headerBottom: document.querySelector('.nav__top--sticky').getBoundingClientRect().bottom,
    }));
    assert.ok(clearance.top >= clearance.headerBottom, 'The native fragment heading remains below the sticky navigation.');
  });

  test(`${engine}: unlisted and malformed fragments preserve actual reading state`, async t => {
    const page = await open(t, engine, {}, '#' + solution);
    await assertState(page, solution, solution);
    await page.evaluate(() => { window.location.hash = 'an-unlisted-reading-destination'; });
    await assertState(page, solution, null);
    await page.evaluate(() => { window.location.hash = '%E0%A4%A'; });
    await assertState(page, solution, null);
    await scrollToHeading(page, implementation);
    await assertState(page, implementation, null);
  });

  test(`${engine}: responsive rail preserves state, focus targets and alternate-media meaning`, async t => {
    const page = await open(t, engine);
    await divergentJourney(page);
    for (const width of [390, 768, 1199, 1200, 2560]) {
      await page.setViewportSize({ width, height: 1000 });
      await scrollToHeading(page, implementation);
      await assertState(page, implementation, solution);
      const observations = await page.locator(rail).evaluate(node => ({
        links: [...node.querySelectorAll('a')].map(anchor => ({ width: anchor.getBoundingClientRect().width, height: anchor.getBoundingClientRect().height })),
        viewport: document.documentElement.clientWidth, pageWidth: document.documentElement.scrollWidth,
        currentTick: getComputedStyle(node.querySelector('.is-current .fmi-reading-rail__tick')).backgroundColor,
        restingTick: getComputedStyle(node.querySelector('a:not(.is-current):not(.is-selected) .fmi-reading-rail__tick')).backgroundColor,
        selectedTick: getComputedStyle(node.querySelector('.is-selected .fmi-reading-rail__tick')).outlineStyle,
      }));
      assert.ok(observations.pageWidth <= observations.viewport + 1, 'Reading state retains page containment.');
      assert.ok(observations.links.every(box => box.width >= 24 && box.height >= 24), 'Each rail destination remains at least 24px square.');
      if (width < 1200) {
        assert.notEqual(observations.currentTick, observations.restingTick, 'Compact current reading has a filled marker.');
        assert.equal(observations.selectedTick, 'solid', 'Compact selection has an independent outline.');
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ forcedColors: 'active' });
    await scrollToHeading(page, implementation);
    await assertState(page, implementation, solution);
    await expect(link(page, implementation).locator('.fmi-reading-rail__state')).toBeVisible();
    await expect(link(page, solution).locator('.fmi-reading-rail__state')).toBeVisible();
    await page.emulateMedia({ media: 'print', forcedColors: 'none' });
    await expect(page.locator(rail)).toBeHidden();
  });

  test(`${engine}: compact labels expose state through keyboard and pointer access outside the scroll clip`, async t => {
    const page = await open(t, engine, { viewport: { width: 390, height: 700 } });
    await link(page, solution).focus();
    await assertCompactLabelPaint(page, solution);
    await page.keyboard.press('Escape');
    await expect(link(page, solution).locator('.fmi-reading-rail__text')).toBeHidden();
    await expect(link(page, solution)).toBeFocused();
    await link(page, implementation).focus();
    await assertCompactLabelPaint(page, implementation);
    await page.locator('h1').click();
    await link(page, solution).hover();
    await assertCompactLabelPaint(page, solution);
    const labelBox = await link(page, solution).locator('.fmi-reading-rail__text').boundingBox();
    await page.mouse.move(labelBox.x + labelBox.width / 2, labelBox.y + labelBox.height / 2);
    await assertCompactLabelPaint(page, solution);
    const fault = await page.addStyleTag({ content: '.fmi-reading-rail[data-reading-ready] a .fmi-reading-rail__text { position: absolute; }' });
    try {
      await assert.rejects(() => assertCompactLabelPaint(page, solution), 'The paint oracle detects the former scroll-container clipping.');
    } finally {
      await fault.evaluate(node => node.remove());
    }
    await link(page, implementation).focus();
    await assertCompactLabelPaint(page, implementation);
    await page.setViewportSize({ width: 768, height: 240 });
    await link(page, 'population-cartography-title').focus();
    await assertCompactLabelPaint(page, 'population-cartography-title');
  });

  test(`${engine}: content reflow refreshes current position while keeping selection`, async t => {
    const page = await open(t, engine, {}, '#' + first);
    await assertState(page, first, first);
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.id = 'rail-reflow-probe';
      spacer.style.height = '600px';
      // Keep the observation's viewport coordinate explicit while testing
      // reflow independently of the browser's scroll-anchoring preference.
      document.documentElement.style.overflowAnchor = 'none';
      document.querySelector('main').prepend(spacer);
    });
    await assertState(page, null, first);
    await page.locator('#rail-reflow-probe').evaluate(node => node.remove());
    await assertState(page, first, first);
  });

  test(`${engine}: native anchors remain usable with enhancement disabled`, async t => {
    const page = await open(t, engine, { javaScriptEnabled: false });
    assert.equal(await page.locator(`${rail} a`).count(), 9);
    assert.equal(await page.locator(`${rail} a[aria-current]`).count(), 0);
    await link(page, solution).click();
    assert.equal(new URL(page.url()).hash, '#' + solution);
    await expect(page.locator('#' + solution)).toBeInViewport();
  });

  test(`${engine}: missing targets stay ordinary anchors and repeated initialization stays bounded`, async t => {
    const page = await open(t, engine);
    const html = await readFile(new URL('../../context-canvas-project-surface/context-canvas/fmi-lims-eln-replatforming.html', import.meta.url), 'utf8');
    const addedLinks = '<li><a href="#missing-target"><span class="fmi-reading-rail__text">Missing destination</span></a></li><li><a href="#%E0%A4%A"><span class="fmi-reading-rail__text">Malformed fragment</span></a></li>';
    const finalDestination = '<li><a href="#population-cartography-title"';
    assert.ok(html.includes(finalDestination), 'The source fixture retains an explicit rail insertion boundary.');
    await page.route('**/fmi-lims-eln-replatforming.html', request => request.fulfill({
      status: 200, contentType: 'text/html', body: html.replace(finalDestination, addedLinks + finalDestination),
    }));
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator(rail)).toHaveAttribute('data-reading-ready', 'true');
    assert.equal(await page.locator(`${rail} .fmi-reading-rail__state`).count(), 9, 'Only admitted destinations gain state descriptions.');
    await page.addScriptTag({ url: server.origin + root + 'fmi-reading-rail.js' });
    assert.equal(await page.locator(`${rail} .fmi-reading-rail__state`).count(), 9, 'A repeated load preserves one enhancement per authored destination.');
    await link(page, solution).click();
    await expect(page.locator(`${rail} a[aria-current="location"]`)).toHaveAttribute('href', '#' + solution);
    await expect(page.locator(`${rail} a.is-selected`)).toHaveAttribute('href', '#' + solution);
  });

  test(`${engine}: a restored state-conflation fault proves the reading distinction`, async t => {
    const page = await open(t, engine);
    const source = await readFile(new URL('../../context-canvas-project-surface/context-canvas/fmi-reading-rail.js', import.meta.url), 'utf8');
    assert.ok(source.includes('const isCurrent = entry === current;'), 'The controlled fault has an exact source boundary.');
    await page.route('**/fmi-reading-rail.js', request => request.fulfill({
      status: 200, contentType: 'text/javascript',
      body: source.replace('const isCurrent = entry === current;', 'const isCurrent = entry === selected;'),
    }));
    try {
      await page.reload({ waitUntil: 'load' });
      await link(page, solution).click();
      await scrollToHeading(page, implementation);
      await assert.rejects(() => assertState(page, implementation, solution), 'The oracle detects selected/current conflation.');
    } finally {
      await page.unroute('**/fmi-reading-rail.js');
      await page.goto(server.origin + route, { waitUntil: 'load' });
    }
    await divergentJourney(page);
  });
}
