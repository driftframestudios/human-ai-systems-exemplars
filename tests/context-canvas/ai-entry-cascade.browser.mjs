import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const route = '/context-canvas-project-surface/context-canvas/ai-systems.html';
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

async function openEntry(t, engine, width) {
  const page = await browsers.get(engine).newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  t.after(() => page.close());
  // Parent-page CSS owns these observations; instrument interiors retain their own checks.
  await page.route('https://iframes.vik.guru/**', request => request.fulfill({
    status: 200, contentType: 'text/html', body: '<!doctype html><title>Separately owned instrument</title>',
  }));
  await page.goto(server.origin + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page;
}

async function bridgeStyles(page) {
  return page.locator('.ai-systems-family-route').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node);
    return {
      background: style.backgroundColor, borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
      radius: style.borderTopLeftRadius, shadow: style.boxShadow,
      color: style.borderTopColor,
    };
  }));
}

function assertBridgePalette(styles, width) {
  assert.equal(styles.length, 5, 'The entry route exposes all five authored bridges, including the Conditioning lab.');
  for (const style of styles) {
    assert.equal(style.background, 'rgb(230, 245, 245)', 'The accepted cyan bridge wins the route cascade.');
    assert.deepEqual(style.borders, ['2px', '2px', '2px', '2px']);
    assert.equal(style.radius, '12px');
    assert.equal(style.shadow, width <= 480
      ? 'rgb(23, 52, 95) 4.8px 4.8px 0px 0px'
      : 'rgb(255, 122, 102) 8px 8px 0px 0px',
    'The bridge shadow follows the inclusive 30rem narrow-screen seam.');
  }
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  for (const width of [390, 479, 480, 481, 1440, 2560]) {
    test(`${engine}: entry bridge cascade at ${width}px`, async t => {
      const page = await openEntry(t, engine, width);
      assertBridgePalette(await bridgeStyles(page), width);
    });
  }

  test(`${engine}: print keeps bridge edges and releases the Goal Fidelity table width`, async t => {
    const page = await openEntry(t, engine, 1440);
    await page.emulateMedia({ media: 'print' });
    for (const style of await bridgeStyles(page)) {
      assert.equal(style.shadow, 'none');
      assert.deepEqual(style.borders, ['2px', '2px', '2px', '2px']);
    }
    const table = page.locator('.goal-fidelity-table');
    assert.equal(await table.evaluate(node => getComputedStyle(node).minInlineSize), '0px');
    assert.deepEqual(await table.locator('thead th').evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return [style.backgroundColor, style.color];
    })), Array.from({ length: await table.locator('thead th').count() }, () => ['rgb(255, 255, 255)', 'rgb(0, 0, 0)']));
  });

  test(`${engine}: forced-color emulation retains a native bridge edge`, async t => {
    const page = await openEntry(t, engine, 1440);
    await page.emulateMedia({ forcedColors: 'active' });
    assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), true);
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const result = getComputedStyle(probe).color;
      probe.remove();
      return result;
    });
    for (const style of await bridgeStyles(page)) {
      assert.equal(style.shadow, 'none');
      assert.deepEqual(style.borders, ['2px', '2px', '2px', '2px']);
      assert.equal(style.color, canvasText);
    }
  });

  test(`${engine}: bridge oracle rejects a displaced palette and narrow shadow, then restores`, async t => {
    const page = await openEntry(t, engine, 480);
    assertBridgePalette(await bridgeStyles(page), 480);
    for (const [rule, message] of [
      ['background: #eff8b8 !important', /accepted cyan bridge/u],
      ['box-shadow: .5rem .5rem 0 #ff7a66 !important', /inclusive 30rem/u],
    ]) {
      const perturbation = await page.addStyleTag({ content: `.ai-systems-page .ai-systems-family-route { ${rule}; }` });
      try {
        const styles = await bridgeStyles(page);
        assert.throws(() => assertBridgePalette(styles, 480), message);
      }
      finally { await perturbation.evaluate(node => node.remove()); }
      assertBridgePalette(await bridgeStyles(page), 480);
    }
  });
}
