import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';
import { open, reading, resize, settledReading, assertReading } from './reading-containment.helper.mjs';

const visitorRoot = '/context-canvas-project-surface/context-canvas/';
const sourceRoot = new URL(`../..${visitorRoot}`, import.meta.url);
const output = new URL('../../.visual-runs/ai-narrow-reading/', import.meta.url);
const family = [];
for (const file of (await readdir(sourceRoot)).filter(file => file.endsWith('.html'))) {
  const source = await readFile(new URL(file, sourceRoot), 'utf8');
  if (/<body\b[^>]*class="[^"]*\bai-systems-page\b/u.test(source)) {
    assert.match(source, /href="styles\/routes\/ai-systems\.css"/u, `${file}: the family owns the reading rule`);
    family.push(file);
  }
}
const controls = [
  'conditioning-field.html', 'fmi-clinical-trial-coordination.html',
  'fmi-lims-eln-replatforming.html', 'genomic-viewer-replatforming.html',
  'prompt-side-conditions-practice.html', 'initiative-costing.html',
  'recoverable-enterprise-forms.html', 'one-figure-several-readings.html',
  'who-to-believe-reviews-platform.html',
];
let server;
before(async () => {
  server = await startStaticServer();
  await mkdir(output, { recursive: true });
});
after(async () => server?.close());

test('AI narrow reading binds seventeen family owners and nine linked controls', async () => {
  assert.equal(family.length, 17);
  assert.equal(new Set([...family, ...controls]).size, 26);
  for (const route of controls) {
    const source = await readFile(new URL(route, sourceRoot), 'utf8');
    assert.doesNotMatch(source, /<body\b[^>]*class="[^"]*\bai-systems-page\b/u, `${route}: retains its independent reading owner`);
  }
});

for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  test(`${engine}: AI family preserves complete narrow readings and local evidence`, async t => {
    const browser = await type.launch();
    t.after(() => browser.close());
    for (const route of family) {
      await t.test(route, async () => {
        const session = await open(browser, server, route);
        try {
          for (const width of [320, 390]) for (const enlarged of [false, true]) {
            await resize(session.page, width, enlarged);
            assertReading(await reading(session.page), `${route} ${width}px ${enlarged ? 'enlarged' : 'ordinary'}`);
          }
          await resize(session.page, 1440, false);
          const accepted = await reading(session.page);
          assertReading(accepted, `${route}: ordinary desktop`);
          const baseline = await session.page.addStyleTag({ content: '.ai-systems-page { overflow-wrap: normal; }' });
          const ordinary = await settledReading(session.page);
          await baseline.evaluate(node => node.remove());
          assert.equal(JSON.stringify(accepted.text) === JSON.stringify(ordinary.text), true,
            `${route}: emergency wrapping preserves ordinary desktop text geometry, scale, and color`);
        } finally { await session.close(); }
      });
    }
    for (const route of controls) {
      await t.test(`${route}: independent normal-size control`, async () => {
        const session = await open(browser, server, route);
        try {
          for (const width of [320, 390]) {
            await resize(session.page, width, false);
            const result = await reading(session.page);
            assert.ok(result.width <= width + 2, `${route}: the unchanged route remains viewport-contained`);
          }
        } finally { await session.close(); }
      });
    }
    await t.test('ordinary wrapping restores the reported heading and card overflow', async () => {
      const session = await open(browser, server, 'ai-systems.html');
      try {
        await resize(session.page, 320, true);
        const accepted = await reading(session.page);
        assertReading(accepted, 'AI Systems accepted narrow reading');
        const fault = await session.page.addStyleTag({ content: '.ai-systems-page { overflow-wrap: normal; }' });
        const broken = await reading(session.page);
        assert.ok(broken.width > broken.viewport + 2, 'The restored baseline crosses the viewport');
        assert.ok(broken.cards.some(card => card.scroll > card.width + 2 || card.right > broken.viewport + 2),
          'The restored baseline expands a card or its text track');
        assert.throws(() => assertReading(broken, 'Restored fault'), /document fits/u);
        await fault.evaluate(node => node.remove());
        assertReading(await reading(session.page), 'AI Systems restored acceptance');
        await session.page.screenshot({ path: new URL(`${engine}-ai-systems-enlarged.png`, output).pathname });
      } finally { await session.close(); }
    });
    await t.test('Atlas native controls remain reachable in their bounded label tracks', async () => {
      const session = await open(browser, server, 'visualization-fidelity-atlas.html');
      try {
        await resize(session.page, 320, true);
        const selector = session.page.locator('.atlas-gallery-controls select[name="view"]');
        const options = await selector.locator('option').evaluateAll(nodes => nodes.map(node => node.value));
        assert.ok(options.length > 1, 'The native selector retains meaningful alternatives');
        assert.equal(await selector.inputValue(), 'rate', 'The gallery begins with the authored frequency view');
        const explanation = await session.page.locator('[data-gallery-explanation]').textContent();
        await selector.focus();
        assert.equal(await selector.evaluate(node => document.activeElement === node), true, 'Keyboard focus reaches the native control');
        const focus = await selector.evaluate(node => {
          const style = getComputedStyle(node);
          return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
        });
        assert.ok(focus.style !== 'none' && focus.width > 0, 'The native control retains visible keyboard focus paint');
        // Native type-ahead selects the next “Compare …” option on the
        // supported host engines; arrow keys can leave a closed menu unchanged.
        await selector.press('c');
        await selector.press('Enter');
        assert.equal(await selector.evaluate(node => document.activeElement === node), true, 'Keyboard selection retains the active native control');
        assert.equal(await selector.inputValue(), 'count', 'The keyboard selects the next authored question');
        assert.equal(await session.page.locator('#atlas-gallery-selection').evaluate(node => JSON.parse(node.textContent).selection.view),
          'count', 'The gallery record receives the keyboard selection');
        assert.notEqual(await session.page.locator('[data-gallery-explanation]').textContent(), explanation,
          'The complete adjacent explanation follows the selected question');
        const tracks = await session.page.locator('.atlas-gallery-controls label:visible').evaluateAll(labels => labels.map(label => {
          const control = label.querySelector('select'), box = label.getBoundingClientRect(), child = control.getBoundingClientRect();
          return { left: box.left, right: box.right, childLeft: child.left, childRight: child.right, width: label.clientWidth, scroll: label.scrollWidth };
        }));
        for (const track of tracks) {
          assert.ok(track.childLeft >= track.left - 2 && track.childRight <= track.right + 2, 'The native control fits its label');
          assert.ok(track.scroll <= track.width + 2, 'The label contains the native control track');
        }
        assertReading(await reading(session.page), 'Atlas selected narrow reading');
        assert.deepEqual(await selector.locator('option').evaluateAll(nodes => nodes.map(node => node.value)),
          options, 'The bounded native control preserves every authored alternative');
        if (engine === 'webkit') {
          const fault = await session.page.addStyleTag({ content: '.atlas-gallery .atlas-gallery-controls select { overflow: visible; }' });
          const broken = await settledReading(session.page);
          assert.ok(broken.width > broken.viewport + 2, 'The native WebKit selected-option fault propagates outside its control');
          assert.throws(() => assertReading(broken, 'Atlas restored fault'), /document fits/u);
          await fault.evaluate(node => node.remove());
          assertReading(await settledReading(session.page), 'Atlas restored acceptance');
        }
        await session.page.locator('.atlas-gallery-controls').screenshot({
          path: new URL(`${engine}-atlas-enlarged-controls.png`, output).pathname,
        });
      } finally { await session.close(); }
    });
    for (const mode of ['forced-colors', 'print', 'no-script']) {
      await t.test(`AI Systems: ${mode} keeps the reading available`, async () => {
        const session = await open(browser, server, 'ai-systems.html', {
          javaScriptEnabled: mode !== 'no-script', forcedColors: mode === 'forced-colors' ? 'active' : 'none',
        });
        try {
          if (mode === 'print') await session.page.emulateMedia({ media: 'print' });
          if (mode !== 'print') {
            await session.page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
            assertReading(await reading(session.page), `AI Systems ${mode}`);
          } else {
            const result = await reading(session.page);
            assert.ok(result.text.length > 20, 'Print retains authored reading content');
            assert.ok(result.cards.length > 0, 'Print retains the navigation cards');
          }
        } finally { await session.close(); }
      });
    }
  });
}
