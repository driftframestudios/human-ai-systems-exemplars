import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const routes = new Map([
  ['multilingual-clinical-vocabulary-practice.html', ['language-economics-title']],
  ['recoverable-enterprise-forms.html', ['form-economics-title', 'payment-boundary-title', 'semantic-form-example-title']],
  ['genomic-viewer-replatforming.html', ['competitive-frontier-title']],
  ['initiative-costing.html', ['costing-prompt-packet-title']],
  ['prompt-side-conditions-practice.html', ['lesson-field-boundary-title', 'benchmark-posture-title', 'boundary-title']],
  ['who-to-believe-reviews-platform.html', ['information-scent-title']],
  ['choose-your-player-humatics.html', ['player-selection-transition-title', 'document-evidence-workflow-title']],
]);
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
  // These observations belong to the parent companions. Embedded documents
  // retain their independent behavior and delivery receivers.
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function settle(page, width) {
  if (width) await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function observe(page, ids) {
  return page.evaluate(ids => {
    const box = node => {
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    const fragments = (node, inkOnly = false) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), rects = [];
      let text;
      while ((text = walker.nextNode())) {
        if (!text.textContent.trim()) continue;
        const ranges = inkOnly ? [...text.textContent.matchAll(/\S+/gu)].map(match => [match.index, match.index + match[0].length]) : [[0, text.length]];
        for (const [start, end] of ranges) {
          const range = document.createRange(); range.setStart(text, start); range.setEnd(text, end);
          for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
        }
      }
      return rects;
    };
    return ids.map(id => {
      const heading = document.getElementById(id), owner = heading.closest('aside');
      const body = owner.querySelector('.debrief-companion-reading, .debrief-companion-regions, .debrief-code-companion');
      const code = owner.querySelector('.debrief-code-window');
      const css = body && getComputedStyle(body), ownerCss = getComputedStyle(owner);
      return { id, viewport: document.documentElement.clientWidth, owner: box(owner), heading: box(heading),
        rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
        body: body && { box: box(body), fragments: fragments(body), headingOutside: !body.contains(heading),
          kind: body.classList.contains('debrief-companion-reading') ? 'prose' : body.classList.contains('debrief-companion-regions') ? 'regions' : 'code',
          gap: parseFloat(css.columnGap), columnWidth: parseFloat(css.columnWidth),
          children: [...body.children].map(node => ({ box: box(node), fragments: fragments(node), basis: parseFloat(getComputedStyle(node).flexBasis) })) },
        code: code && { box: box(code), scrollWidth: code.scrollWidth, clientWidth: code.clientWidth,
          tabindex: code.tabIndex, role: code.getAttribute('role'), label: code.getAttribute('aria-labelledby'),
          overflow: getComputedStyle(code).overflowX, whiteSpace: getComputedStyle(code).whiteSpace,
          text: code.textContent, fragments: fragments(code, true), focusOutline: getComputedStyle(code).outlineStyle },
        sequence: owner.classList.contains('debrief-code-panel--sequence'),
        directOrder: [...owner.children].map(node => node.tagName),
        border: parseFloat(ownerCss.borderLeftWidth),
      };
    });
  }, ids);
}

function isTwo(body) {
  if (body.kind === 'prose') return body.box.width + .1 >= 2 * body.columnWidth + body.gap;
  if (body.kind === 'regions') return body.box.width + .1 >= 2 * 26 * (body.rootFont ?? 16) + body.gap;
  return body.box.width + .1 >= body.children.reduce((sum, child) => sum + child.basis, 0) + body.gap;
}

function assertObservation(items, { print = false } = {}) {
  for (const item of items) {
    const label = item.id;
    if (!print) assert.ok(item.owner.left >= -2 && item.owner.right <= item.viewport + 2, `${label}: painted owner fits the visitor field`);
    const body = item.body;
    if (body) {
      assert.ok(body.headingOutside && item.heading.bottom <= body.box.top + 2, `${label}: heading introduces both regions`);
      assert.ok(body.box.left >= item.owner.left - 2 && body.box.right <= item.owner.right + 2, `${label}: body stays inside its frame`);
      const two = !print && isTwo({ ...body, rootFont: item.rootFont });
      if (body.kind === 'prose') {
        assert.ok(body.fragments.length > 0, `${label}: rendered prose supplies the observation`);
        assert.ok(body.fragments.every(r => r.left >= body.box.left - 2 && r.right <= body.box.right + 2 && r.top >= item.owner.top - 2 && r.bottom <= item.owner.bottom + 2), `${label}: actual prose and raised citations remain inside the painted owner`);
        const midpoint = (body.box.left + body.box.right) / 2;
        if (two) {
          assert.ok(body.fragments.some(r => r.right <= midpoint - body.gap / 2 + 2) && body.fragments.some(r => r.left >= midpoint + body.gap / 2 - 2), `${label}: sustained prose reaches both lanes`);
          assert.ok(body.fragments.every(r => r.right <= midpoint - body.gap / 2 + 2 || r.left >= midpoint + body.gap / 2 - 2), `${label}: prose preserves its inter-column gap`);
        } else {
          for (let index = 1; index < body.fragments.length; index += 1) assert.ok(body.fragments[index].bottom >= body.fragments[index - 1].top - 2, `${label}: one-lane prose preserves source sequence`);
        }
      } else {
        assert.equal(body.children.length, 2, `${label}: two semantic regions retain their source order`);
        const [first, second] = body.children;
        if (two) {
          assert.ok(first.box.right + body.gap <= second.box.left + 2 && Math.abs(first.box.top - second.box.top) <= 2, `${label}: distinct regions share a readable row`);
          assert.ok(first.fragments.length && second.fragments.length, `${label}: both regions contain real content`);
        } else assert.ok(second.box.top >= first.box.bottom - 2, `${label}: narrow regions retain source sequence`);
      }
    }
    if (item.code) {
      const code = item.code;
      assert.equal(code.tabindex, 0, `${label}: keyboard users can enter the code region`);
      assert.equal(code.role, 'region'); assert.equal(code.label, label);
      assert.ok(code.box.left >= item.owner.left - 2 && code.box.right <= item.owner.right + 2, `${label}: code has a local width owner`);
      assert.equal(code.overflow, print ? 'visible' : 'auto', `${label}: code has the intended line-end recovery`);
      if (print) assert.ok(code.fragments.every(r => r.left >= code.box.left - 2 && r.right <= code.box.right + 2), `${label}: print wraps complete code lines inside the sheet`);
      if (item.sequence) {
        assert.ok(item.owner.width <= 68 * item.rootFont + 2, `${label}: the long code panel fits its declared useful line measure`);
        assert.deepEqual(item.directOrder, ['P', 'H4', 'P', 'PRE', 'P'], `${label}: introduction, code, and return preserve source order`);
      }
    }
  }
}

async function assertCodeReachability(page, id) {
  const code = page.locator(`aside[aria-labelledby="${id}"] .debrief-code-window`);
  await code.focus();
  assert.equal(await code.evaluate(node => node === document.activeElement), true);
  const sizes = await code.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
  if (sizes.scroll > sizes.width + 1) {
    await code.scrollIntoViewIfNeeded();
    await code.press('ArrowRight', { delay: 200 });
    await page.waitForFunction(id => document.querySelector(`aside[aria-labelledby="${id}"] .debrief-code-window`).scrollLeft > 0, id, { timeout: 2000 });
    const end = await code.evaluate(node => {
      node.scrollLeft = node.scrollWidth;
      const range = document.createRange(); range.selectNodeContents(node.querySelector('code'));
      return { right: Math.max(...[...range.getClientRects()].map(r => r.right)), frame: node.getBoundingClientRect().right, offset: node.scrollLeft };
    });
    assert.ok(end.offset > 0 && end.right <= end.frame + 2, `${id}: scrolling exposes the longest line ending`);
    await code.evaluate(node => { node.scrollLeft = 0; });
  }
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const [route, ids] of routes) {
    test(`${engine}: ${route} companion reading at useful widths and media`, async t => {
      const page = await open(t, engine, route);
      for (const width of [390, 768, 1024, 1440, 1920, 2560]) {
        await t.test(`${width}px`, async () => {
          await settle(page, width);
          const items = await observe(page, ids); assertObservation(items);
          if (width === 390) for (const item of items.filter(item => item.code)) await assertCodeReachability(page, item.id);
        });
      }
      // Each actual container owns its seam. Bracket every distinct body,
      // including the longer transition sample that pairs only at wide widths.
      for (const id of ids) {
        await settle(page, 2560);
        if (!(await observe(page, [id]))[0].body) continue;
        let low = 390, high = 2560;
        while (high - low > 1) {
          const width = Math.floor((low + high) / 2); await settle(page, width);
          const item = (await observe(page, [id]))[0];
          if (isTwo({ ...item.body, rootFont: item.rootFont })) high = width; else low = width;
        }
        t.diagnostic(`${id}: responsive transition at ${high}px`);
        for (const [width, expected] of [[low, false], [high, true], [high + 1, true]]) {
          await settle(page, width); const item = (await observe(page, [id]))[0];
          assert.equal(isTwo({ ...item.body, rootFont: item.rootFont }), expected, `${id}: material seam at ${high}px`);
          assertObservation([item]);
        }
      }
      await settle(page, 1440);
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      const enlarged = await observe(page, ids);
      assertObservation(enlarged);
      for (const item of enlarged.filter(item => item.body)) assert.equal(isTwo({ ...item.body, rootFont: item.rootFont }), false, `${item.id}: enlarged text uses the source-ordered single lane`);
      // Reload restores the source-owned styles before alternate-media checks.
      await page.reload({ waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
      await settle(page, 768);
      await page.emulateMedia({ forcedColors: 'active' });
      assertObservation(await observe(page, ids));
      await page.emulateMedia({ forcedColors: 'none', media: 'print' });
      assertObservation(await observe(page, ids), { print: true });
      await page.emulateMedia({ media: 'screen' });
      if (route === 'who-to-believe-reviews-platform.html') {
        const details = page.locator('aside[aria-labelledby="information-scent-title"] details');
        const summary = details.locator('summary');
        for (const width of [390, 1440]) {
          await settle(page, width);
          assert.equal(await details.evaluate(node => node.open), false);
          await summary.focus(); await summary.press('Enter');
          assert.equal(await details.evaluate(node => node.open), true, 'The source-owned prompt remains keyboard-disclosable.');
          for (const media of ['screen', 'print']) {
            await page.emulateMedia({ media });
            const quote = await details.locator('blockquote').boundingBox(), frame = await details.boundingBox();
            assert.ok(quote.height > 0 && quote.x >= frame.x - 2 && quote.x + quote.width <= frame.x + frame.width + 2, 'The complete prompt stays in its own disclosed region on screen and in print.');
            assertObservation(await observe(page, ids), { print: media === 'print' });
          }
          await page.emulateMedia({ media: 'screen' });
          await summary.press('Enter'); assert.equal(await details.evaluate(node => node.open), false);
        }
      }
    });
  }
}

test('Restored one-column, stacked-pair, and clipped-code faults change the material observations', async t => {
  const page = await open(t, 'chromium', 'recoverable-enterprise-forms.html');
  await settle(page, 1440);
  const ids = routes.get('recoverable-enterprise-forms.html');
  assertObservation(await observe(page, ids));
  const prose = await page.addStyleTag({ content: '.debrief-companion-reading { column-count: 1 !important; }' });
  const lostLane = await observe(page, ['form-economics-title']);
  assert.throws(() => assertObservation(lostLane), /sustained prose reaches both lanes/u);
  await prose.evaluate(node => node.remove());
  const pair = await page.addStyleTag({ content: '.debrief-code-companion { display: block !important; }' });
  const stacked = await observe(page, ['semantic-form-example-title']);
  assert.throws(() => assertObservation(stacked), /distinct regions/u);
  await pair.evaluate(node => node.remove());
  await settle(page, 390);
  const clipping = await page.addStyleTag({ content: '.debrief-code-window { overflow-x: hidden !important; }' });
  const clipped = await observe(page, ['semantic-form-example-title']);
  assert.throws(() => assertObservation(clipped), /intended line-end recovery/u);
  await assert.rejects(() => assertCodeReachability(page, 'semantic-form-example-title'), /Timeout/u, 'The restored clipping fault also blocks keyboard access to painted code at the line end.');
  await clipping.evaluate(node => node.remove());
  assertObservation(await observe(page, ids));
  await assertCodeReachability(page, 'semantic-form-example-title');
});
