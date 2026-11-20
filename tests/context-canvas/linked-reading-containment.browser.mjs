import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';
import { open, reading, resize, settledReading, assertReading } from './reading-containment.helper.mjs';

const sourceRoot = new URL('../../context-canvas-project-surface/context-canvas/', import.meta.url);
const output = new URL('../../.visual-runs/linked-reading-containment/', import.meta.url);
const repaired = [
  'fmi-clinical-trial-coordination.html', 'fmi-lims-eln-replatforming.html',
  'genomic-viewer-replatforming.html', 'prompt-side-conditions-practice.html',
  'initiative-costing.html', 'recoverable-enterprise-forms.html',
  'one-figure-several-readings.html', 'who-to-believe-reviews-platform.html',
];
const control = 'conditioning-field.html';
const routes = [...repaired, control];
let server;
before(async () => {
  server = await startStaticServer();
  await mkdir(output, { recursive: true });
});
after(async () => server?.close());

async function evidenceGeometry(page) {
  return page.locator('main table, main pre, main svg[viewBox]').evaluateAll(nodes => nodes.map(node => ({
    tag: node.tagName, width: node.getBoundingClientRect().width,
    scroll: node.scrollWidth, whitespace: getComputedStyle(node).whiteSpace,
    overflow: getComputedStyle(node).overflowX, viewBox: node.getAttribute('viewBox'),
  })));
}

async function visibleFocus(locator) {
  return locator.evaluate(node => {
    const style = getComputedStyle(node);
    return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
  });
}

test('eight linked readings opt into one shared owner; fifteen other component consumers keep their current owners', async () => {
  const consumers = [];
  const optedIn = [];
  for (const file of (await readdir(sourceRoot)).filter(file => file.endsWith('.html'))) {
    const source = await readFile(new URL(file, sourceRoot), 'utf8');
    if (source.includes('href="styles/components/debrief-reading.css"')) consumers.push(file);
    if (/<main\b[^>]*class="[^"]*\bdebrief-reading\b/u.test(source)) {
      optedIn.push(file);
      assert.ok(consumers.includes(file), `${file}: the explicit reading loads its component`);
    }
  }
  assert.deepEqual(optedIn.sort(), [...repaired].sort());
  assert.equal(consumers.length, 23);
  assert.equal(consumers.filter(file => !repaired.includes(file)).length, 15);
  assert.equal(consumers.includes(control), false);
});

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  test(`${engine}: linked readings preserve complete enlarged text and local evidence`, async t => {
    const browser = await type.launch();
    t.after(() => browser.close());
    for (const route of routes) {
      await t.test(route, async () => {
        const session = await open(browser, server, route);
        try {
          for (const width of [320, 390]) for (const enlarged of [false, true]) {
            await resize(session.page, width, enlarged);
            const result = await reading(session.page);
            assertReading(result, `${route} ${width}px ${enlarged ? 'enlarged' : 'ordinary'}`);
            if (width === 320 && enlarged) {
              const heading = session.page.locator(route === control ? 'main h2' : route === 'one-figure-several-readings.html' ? '#reference-title' : '.architecture-track-title').first();
              await heading.scrollIntoViewIfNeeded();
              await session.page.screenshot({ path: new URL(`${engine}-${route.replace('.html', '')}-enlarged.png`, output).pathname });
            }
          }
          if (repaired.includes(route)) for (const width of [1440, 2560]) {
            // WebKit multicolumn layout responds differently to a runtime
            // inherited-style toggle. Both comparison inputs begin as fresh
            // documents at their intended viewport, before their first layout.
            const current = await open(browser, server, route, { viewport: { width, height: 1000 } });
            const original = await open(browser, server, route, {
              viewport: { width, height: 1000 },
              transformHtml: source => source.replace('class="debrief-reading"', ''),
            });
            try {
              const accepted = await settledReading(current.page);
              const baseline = await settledReading(original.page);
              const normalize = text => {
                // This one six-card heading already exceeds its 162px measure
                // at the wide baseline. The repair contains its long word while
                // preserving its text, type, color, and owning card geometry.
                if (route === 'prompt-side-conditions-practice.html' && width === 2560
                  && text.owner === 'H3' && text.value === '2 · Rewrite the destination') {
                  const { fragments, ...roles } = text;
                  return roles;
                }
                return text;
              };
              assert.deepEqual(accepted.text.map(normalize), baseline.text.map(normalize),
                `${route} ${width}px: ordinary text geometry, scale, and palette retain their source values`);
              if (route === 'prompt-side-conditions-practice.html' && width === 2560) {
                const title = value => value.text.find(text => text.owner === 'H3' && text.value === '2 · Rewrite the destination');
                assert.ok(title(baseline).fragments.some(fragment => fragment.right > title(baseline).right));
                assert.ok(title(accepted).fragments.every(fragment => fragment.right <= title(accepted).right));
              }
              assert.deepEqual(await evidenceGeometry(current.page), await evidenceGeometry(original.page),
                `${route} ${width}px: tables, code, and diagrams retain their original measures`);
            } finally { await current.close(); await original.close(); }
          }
          if (repaired.includes(route)) {
            await resize(session.page, 320, true);
            await session.page.locator('main').evaluate(node => node.classList.remove('debrief-reading'));
            try {
              const original = await settledReading(session.page);
              assert.throws(() => assertReading(original, `${route}: restored original wrapping`),
                /document fits|complete text stays/u, `${route}: the original owner fault exposes the reported text strain`);
            } finally {
              await session.page.locator('main').evaluate(node => node.classList.add('debrief-reading'));
            }
            assertReading(await settledReading(session.page), `${route}: source recovery`);
          }
        } finally { await session.close(); }
      });
    }
    await t.test('Who To Believe: keyboard state changes preserve readable controls, detail, and graph scrolling', async () => {
      const session = await open(browser, server, 'who-to-believe-reviews-platform.html');
      try {
        await resize(session.page, 320, true);
        const mode = session.page.locator('[data-graph-mode-control][value="symfony"]');
        await mode.focus();
        await session.page.keyboard.press(engine === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
        await session.page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
        assert.equal(await visibleFocus(session.page.locator('[data-graph-mode-control][value="symfony"] + span')), true);
        await mode.press('ArrowRight');
        const nextMode = session.page.locator('[data-graph-mode-control][value="spring"]');
        assert.equal(await nextMode.isChecked(), true);
        assert.equal(await nextMode.evaluate(node => node === document.activeElement), true);
        // Native radio arrow selection retains focus; tab re-entry establishes
        // visible keyboard focus in the installed WebKit environment.
        await session.page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
        await session.page.keyboard.press(engine === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
        assert.equal(await visibleFocus(session.page.locator('[data-graph-mode-control][value="spring"] + span')), true);
        assert.match(await session.page.locator('[data-detail-stack]').innerText(), /MySQL-to-PostgreSQL/u);
        const neighbor = session.page.locator('[data-detail-neighbors] button').first();
        const nodeId = await neighbor.getAttribute('data-node-id');
        const title = await session.page.locator('[data-detail-title]').innerText();
        await neighbor.focus();
        assert.equal(await visibleFocus(neighbor), true);
        await neighbor.press('Enter');
        assert.equal(await session.page.locator(`[data-graph-svg] [data-node-id="${nodeId}"]`).getAttribute('aria-pressed'), 'true');
        assert.notEqual(await session.page.locator('[data-detail-title]').innerText(), title);
        assertReading(await settledReading(session.page), 'Who To Believe: selected detail');
        const graph = session.page.locator('.wtb-system-graph__canvas-scroll');
        await graph.focus();
        assert.equal(await visibleFocus(graph), true);
        // The installed WebKit uses its horizontal page shortcut for a
        // focused overflow region, matching the reference-figure contract.
        await graph.press(engine === 'webkit' ? 'Alt+ArrowRight' : 'ArrowRight');
        await session.page.waitForFunction(() => document.querySelector('.wtb-system-graph__canvas-scroll').scrollLeft > 0, null, { polling: 50, timeout: 3000 });
        assert.equal(await session.page.locator('[data-graph-svg]').getAttribute('viewBox'), '0 0 1130 600');
        const summary = session.page.locator('.wtb-system-graph__reading summary');
        await summary.focus();
        await summary.press('Enter');
        assert.equal(await session.page.locator('.wtb-system-graph__reading').getAttribute('open'), '');
        assertReading(await settledReading(session.page), 'Who To Believe: full semantic equivalent');
      } finally { await session.close(); }
    });
    await t.test('FMI LIMS/ELN: tables remain keyboard scrollable and accessible link qualifiers keep their clipping owner', async () => {
      const session = await open(browser, server, 'fmi-lims-eln-replatforming.html');
      try {
        await resize(session.page, 320, true);
        const table = session.page.locator('.table-scroll').first();
        const geometry = await table.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth, overflow: getComputedStyle(node).overflowX }));
        assert.ok(geometry.scroll > geometry.width);
        assert.ok(['auto', 'scroll'].includes(geometry.overflow));
        await table.focus();
        assert.equal(await table.evaluate(node => node === document.activeElement), true);
        await table.press(engine === 'webkit' ? 'Alt+ArrowRight' : 'ArrowRight');
        await session.page.waitForFunction(() => document.querySelector('.table-scroll').scrollLeft > 0, null, { polling: 50, timeout: 3000 });
        const cues = await session.page.locator('.fmi-link-cue').evaluateAll(nodes => nodes.map(node => {
          const style = getComputedStyle(node);
          return { width: style.width, height: style.height, clip: style.clipPath, overflow: style.overflow, position: style.position, text: node.textContent.trim() };
        }));
        assert.equal(cues.length, 17);
        for (const cue of cues) assert.deepEqual(cue, {
          width: '1px', height: '1px', clip: 'inset(50%)', overflow: 'hidden', position: 'absolute', text: '(opens in a new tab)',
        });
      } finally { await session.close(); }
    });
    for (const [name, options, media] of [
      ['forced-colors', { forcedColors: 'active' }],
      ['print', {}, 'print'], ['no-script', { javaScriptEnabled: false }],
    ]) {
      await t.test(`linked readings: ${name} preserves its reading contract`, async () => {
        for (const route of ['genomic-viewer-replatforming.html', 'who-to-believe-reviews-platform.html']) {
          const session = await open(browser, server, route,
            media === 'print' ? { ...options, viewport: { width: 1440, height: 844 } } : options);
          try {
            if (media) {
              await session.page.emulateMedia({ media });
              await session.page.reload({ waitUntil: 'load' });
              await session.page.waitForFunction(() => document.fonts.status === 'loaded', null, { polling: 100, timeout: 7000 });
            }
            // Print releases two-dimensional evidence for its page owner;
            // narrow enlarged states are the separate screen observations.
            await resize(session.page, media === 'print' ? 1440 : 390, media !== 'print');
            const accepted = await settledReading(session.page);
            if (media === 'print') {
              const original = await open(browser, server, route, {
                viewport: { width: 1440, height: 844 },
                transformHtml: source => source.replace('class="debrief-reading"', ''),
              });
              try {
                await original.page.emulateMedia({ media: 'print' });
                await original.page.reload({ waitUntil: 'load' });
                await original.page.waitForFunction(() => document.fonts.status === 'loaded', null, { polling: 100, timeout: 7000 });
                await resize(original.page, 1440, false);
                const baseline = await settledReading(original.page);
                // Print releases local two-dimensional evidence and retains
                // the original painted page extent; screen bounds stay with
                // the separate ordinary/enlarged screen observations.
                assert.equal(accepted.width, baseline.width, `${route}: print retains its original page extent`);
                assert.deepEqual(accepted.text, baseline.text, `${route}: print retains text, fragments, type, and color`);
                assert.deepEqual(await evidenceGeometry(session.page), await evidenceGeometry(original.page), `${route}: print retains table, code, and diagram measures`);
              } finally { await original.close(); }
            } else assertReading(accepted, `${route}: ${name}`);
          } finally { await session.close(); }
        }
      });
    }
  });
}
