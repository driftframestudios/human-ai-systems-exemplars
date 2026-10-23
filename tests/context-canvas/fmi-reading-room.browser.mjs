import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const fmi = 'fmi-lims-eln-replatforming.html';
const canonical = [
  'choose-your-player-humatics.html', 'ehr-discrete-genomic-result.html',
  'ehr-interface-engine-replatform.html', 'ehr-pgx-alert-failure.html',
  'ehr-three-front-doors.html', 'ehr-two-charts-one-result.html',
  'field-inspection-harness-replatform.html', 'fmi-clinical-trial-coordination.html',
  fmi, 'genomic-viewer-replatforming.html', 'multilingual-clinical-vocabulary-practice.html',
  'recoverable-enterprise-forms.html', 'spatial-capture-collaborative-memory.html',
  'who-to-believe-reviews-platform.html', 'distributed-inspection-harness.html',
  'three-way-comparative-return.html',
];
const companions = [
  'genomics-sequencing-process-transcript-title', 'lims-proxy-standing-title',
  'ebr-interruption-title', 'context-tree-title', 'program-constellation-title',
  'enterprise-reference-title',
];
const palettes = new Map([
  [fmi, 3], ['genomic-viewer-replatforming.html', 3],
  ['field-inspection-harness-replatform.html', 4],
]);
const browsers = new Map();
let server;
before(async () => {
  server = await startStaticServer();
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    browsers.set(name, await engine.launch());
  }
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function open(t, engine, route = fmi, options = {}) {
  const page = await browsers.get(engine).newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  t.after(() => page.close());
  // This observation belongs to the parent reading. Remote prototype interiors
  // and media delivery retain their existing independent receivers.
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue()
    : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function settle(page, width) {
  if (width) await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function observeBodies(page) {
  return page.evaluate(() => {
    const box = node => {
      const value = node.getBoundingClientRect();
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width };
    };
    return {
      viewport: document.documentElement.clientWidth,
      bodies: [...document.querySelectorAll('.fmi-companion-reading')].map(body => {
        const owner = body.closest('aside'), id = owner.getAttribute('aria-labelledby');
        const heading = document.getElementById(id), css = getComputedStyle(body), ownerCss = getComputedStyle(owner);
        const nodes = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        const fragments = [];
        let node;
        while ((node = nodes.nextNode())) {
          if (!node.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (rect.width > 0 && rect.height > 0) fragments.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
          }
        }
        return { id, box: box(body), owner: box(owner), heading: box(heading),
          brief: owner.classList.contains('fmi-companion--brief'),
          paragraphWidth: Math.max(0, ...[...body.querySelectorAll(':scope > p')].map(node => node.getBoundingClientRect().width)),
          ownerInsets: ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((sum, property) => sum + parseFloat(ownerCss[property]), 0),
          headingOutside: !body.contains(heading), fragments, gap: parseFloat(css.columnGap),
          requestedWidth: parseFloat(css.columnWidth), rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize) };
      }),
    };
  });
}

function assertBodies(observation, lanes, { screen = true } = {}) {
  assert.deepEqual(observation.bodies.map(body => body.id), companions, 'The six repaired companion bodies remain identifiable.');
  assert.deepEqual(observation.bodies.filter(body => body.brief).map(body => body.id), ['context-tree-title'], 'The short Context Tree note retains its intentional compact disposition.');
  for (const body of observation.bodies) {
    const label = body.id;
    assert.ok(body.headingOutside && body.heading.bottom <= body.box.top + 2, `${label}: the heading introduces the whole body`);
    assert.ok(body.fragments.length > 0, `${label}: the body supplies rendered text`);
    assert.ok(body.box.left >= body.owner.left - 2 && body.box.right <= body.owner.right + 2, `${label}: body fits its painted owner`);
    if (screen) assert.ok(body.owner.left >= -2 && body.owner.right <= observation.viewport + 2, `${label}: owner fits the visitor field`);
    assert.ok(body.fragments.every(rect => rect.left >= body.box.left - 2 && rect.right <= body.box.right + 2), `${label}: text fragments remain contained`);
    const midpoint = (body.box.left + body.box.right) / 2;
    const rightLane = body.fragments.filter(rect => rect.left >= midpoint + body.gap / 2 - 2);
    if (body.brief) {
      assert.ok(body.paragraphWidth > 0 && body.owner.width <= body.paragraphWidth + body.ownerInsets + 2, `${label}: the short note's panel fits its paragraph measure and framing`);
    }
    const usedLanes = body.brief ? 1 : lanes ?? (body.box.width >= 2 * body.requestedWidth + body.gap ? 2 : 1);
    if (usedLanes === 2) {
      assert.ok(rightLane.length > 0 && body.fragments.some(rect => rect.right <= midpoint - body.gap / 2 + 2), `${label}: rendered prose occupies both reading lanes`);
      assert.ok(body.fragments.every(rect => rect.right <= midpoint - body.gap / 2 + 2 || rect.left >= midpoint + body.gap / 2 - 2), `${label}: text preserves the inter-column reading gap`);
    } else {
      // A computed column-count of two can still produce one used column.
      // Source-ordered fragment positions establish the actual narrow reading.
      for (let index = 1; index < body.fragments.length; index += 1) {
        assert.ok(body.fragments[index].top >= body.fragments[index - 1].top - 3,
          `${label}: single-lane text retains its source sequence`);
      }
    }
  }
}

async function observeCells(page) {
  return page.locator('[data-content-form="case-brief"] .debrief-at-glance > div').evaluateAll(nodes => nodes.map(node => {
    const css = getComputedStyle(node), rect = node.getBoundingClientRect();
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map(side => ({ width: parseFloat(css[`border${side}Width`]), style: css[`border${side}Style`], color: css[`border${side}Color`] }));
    return { label: node.querySelector('dt')?.textContent.trim(), sides, top: css.borderTopColor,
      left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth };
  }));
}

function assertCells(cells, { colors, screen = true } = {}) {
  assert.equal(cells.length, 6, 'The canonical Case Brief keeps all six fields.');
  for (const cell of cells) {
    assert.ok(cell.label, 'Each bounded field retains its semantic label.');
    assert.ok(cell.sides.every(side => side.width >= 1 && side.style === 'solid' && side.color !== 'rgba(0, 0, 0, 0)'), `${cell.label}: every cell edge has an explicit visible border`);
    assert.ok(cell.sides[0].width >= 3, `${cell.label}: the top accent remains visibly distinct from its cell edge`);
    if (screen) assert.ok(cell.left >= -2 && cell.right <= cell.viewport + 2, `${cell.label}: the field fits the visitor width`);
  }
  if (colors) assert.equal(new Set(cells.map(cell => cell.top)).size, colors, 'The route retains its intended recurring accent palette.');
}

test('The bordered-field observation covers the complete canonical Case Brief population', async () => {
  const source = await readFile(new URL('../../context-canvas-project-surface/data/debrief-case-briefs.source.html', import.meta.url), 'utf8');
  const routes = [...source.matchAll(/data-case-brief-source="([^"]+)"/gu)].map(match => match[1]);
  assert.deepEqual(routes.sort(), [...canonical].sort(), 'Every canonical projection has a border observation.');
});

for (const route of canonical) {
  test(`Chromium: ${route} retains six explicitly bordered fields`, async t => {
    const page = await open(t, 'chromium', route);
    assertCells(await observeCells(page), { colors: palettes.get(route) ?? 3 });
  });
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: FMI companions use actual room and retain heading-first reading`, async t => {
    const page = await open(t, engine);
    for (const width of [390, 1024, 1199, 1200, 1201, 1440, 2560]) {
      await t.test(`${width}px`, async () => {
        await settle(page, width);
        assertBodies(await observeBodies(page), width === 390 ? 1 : undefined);
      });
    }
    // The available panel, including its rail reserve and padding, owns the
    // transition. Find and bracket that actual two-column seam in this engine.
    let below = 390, above = 1440;
    while (above - below > 1) {
      const width = Math.floor((below + above) / 2);
      await settle(page, width);
      const body = (await observeBodies(page)).bodies[0];
      if (body.box.width >= 2 * body.requestedWidth + body.gap) above = width;
      else below = width;
    }
    for (const [width, lanes] of [[below, 1], [above, 2]]) {
      await settle(page, width);
      const observation = await observeBodies(page);
      assertBodies(observation);
      const first = observation.bodies[0];
      const rightFragments = first.fragments.filter(rect => rect.left >= (first.box.left + first.box.right + first.gap) / 2 - 2);
      assert.equal(rightFragments.length > 0, lanes === 2, `The transcript changes its rendered lanes at its ${above}px container seam.`);
    }
    await settle(page, 1440);
    const enlarged = await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    try {
      await settle(page);
      const observation = await observeBodies(page);
      assert.ok(observation.bodies.every(body => body.rootFont === 32), 'The test observes doubled root text.');
      assertBodies(observation, 1);
    } finally { await enlarged.evaluate(node => node.remove()); }
    await settle(page);
    assertBodies(await observeBodies(page), 2);
    await page.emulateMedia({ media: 'print' });
    assertBodies(await observeBodies(page), 1, { screen: false });
    await page.emulateMedia({ media: 'screen', forcedColors: 'active' });
    assertBodies(await observeBodies(page), 2);
  });

  for (const [route, colors] of palettes) {
    test(`${engine}: ${route} keeps six-beat boundaries across width and alternate media`, async t => {
      const page = await open(t, engine, route);
      for (const width of [390, 1024, 1440, 2560]) {
        await settle(page, width);
        assertCells(await observeCells(page), { colors });
      }
      await settle(page, 1440);
      await page.emulateMedia({ media: 'print' });
      assertCells(await observeCells(page), { screen: false });
      await page.emulateMedia({ media: 'screen', forcedColors: 'active' });
      assertCells(await observeCells(page));
    });
  }

  test(`${engine}: room and cell oracles expose restored single-lane and missing-border faults`, async t => {
    const page = await open(t, engine);
    assertBodies(await observeBodies(page), 2);
    const columnFault = await page.addStyleTag({ content: '.fmi-companion-reading { column-count: 1 !important; }' });
    try {
      const changed = await observeBodies(page);
      assert.throws(() => assertBodies(changed, 2), /rendered prose occupies both reading lanes/u);
    }
    finally { await columnFault.evaluate(node => node.remove()); }
    assertBodies(await observeBodies(page), 2);
    assertCells(await observeCells(page), { colors: 3 });
    const borderFault = await page.addStyleTag({ content: '[data-content-form="case-brief"] .debrief-at-glance > div { border: 0 !important; }' });
    try {
      const changed = await observeCells(page);
      assert.throws(() => assertCells(changed), /explicit visible border/u);
    }
    finally { await borderFault.evaluate(node => node.remove()); }
    assertCells(await observeCells(page), { colors: 3 });
  });
}

test('FMI method links expose their destination behavior and retain local production closure', async t => {
  const page = await open(t, 'chromium');
  assert.equal(await page.locator('ol.fmi-track-key').count(), 0, 'The opening reading omits the redundant track key.');
  const links = await page.locator('.fmi-method-link').evaluateAll(nodes => nodes.map(node => ({
    href: node.getAttribute('href'), target: node.target, rel: node.rel,
    text: node.textContent.trim(), cue: node.querySelector('.fmi-link-cue')?.textContent.trim(),
    icon: Boolean(node.querySelector('svg[aria-hidden="true"][focusable="false"] path')),
    iconWidth: node.querySelector('svg')?.getBoundingClientRect().width,
    iconHeight: node.querySelector('svg')?.getBoundingClientRect().height,
    fontSize: parseFloat(getComputedStyle(node).fontSize),
  })));
  assert.ok(links.length >= 15, 'The engagement shape exposes its applicable working companions.');
  for (const link of links) {
    assert.equal(link.target, '_blank');
    assert.ok(link.rel.split(/\s+/u).includes('noopener') && link.rel.split(/\s+/u).includes('noreferrer'));
    assert.equal(link.cue, '(opens in a new tab)');
    assert.ok(link.icon && link.iconWidth > 0 && link.iconHeight > 0, `${link.text}: the separate-tab icon has rendered geometry`);
    assert.ok(link.iconWidth <= link.fontSize * 1.1 && link.iconHeight <= link.fontSize * 1.1, `${link.text}: the icon retains its text-sized role`);
  }
  for (const label of ['PODA', 'Impact Map', 'Jobs-to-be-Done Treemap']) {
    assert.equal(await page.getByRole('link', { name: `${label} (opens in a new tab)`, exact: true }).count(), 1, `${label}: the accessible link name states its tab behavior`);
  }
  const manifest = JSON.parse(await readFile(new URL('../../deployment/cpanel/primary-route-manifest.json', import.meta.url), 'utf8'));
  const sources = new Set(manifest.files.map(file => file.source_path));
  const local = links.filter(link => !/^https:/u.test(link.href));
  for (const href of new Set(local.map(link => link.href))) {
    const source = 'context-canvas-project-surface/context-canvas/' + href;
    assert.ok((await stat(new URL('../../' + source, import.meta.url))).isFile(), `${href}: the linked prototype exists`);
    assert.ok(sources.has(source), `${href}: the production manifest carries the linked prototype`);
  }
  const external = links.filter(link => /^https:/u.test(link.href));
  assert.equal(external.length, 1, 'The method source is the one external companion.');
  assert.equal(await page.locator('#source-goodwin a').getAttribute('href'), external[0].href, 'The scenario-method citation resolves to the same research source.');
  assert.match(await page.locator('#source-goodwin').textContent(), /Kim Goodwin/u);
});
