import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { expect } from '@playwright/test';
import { assertTelemetry, monitor } from '../../tools/core-architecture-browser-helper.mjs';
import { createAboutContentFitHarness, engines, fitted, wheelObservation, assertParentReading, observeCodeText, receiverInPage } from './about-content-fit-helper.mjs';

const conditions = [
  { key: 'source', map: 'Source diet', receiver: 'Research or domain steward who can confirm source standing and omissions.', label: 'Source diet', title: 'Choose what enters the working set.', prompt: 'Using the named sources below', route: 'cross-platform-collaboration-cycle.html' },
  { key: 'desired', map: 'Desired state', receiver: 'Product or practice owner who can confirm the intended outcome and acceptable tradeoffs.', label: 'Desired state', title: 'Describe what should become true.', prompt: 'Describe the desired condition', route: 'hiring-surfaces-talent-agent-intake.html' },
  { key: 'role', map: 'Role boundary', receiver: 'Accountable domain or business owner who can accept, revise, or decline the proposed action.', label: 'Role boundary', title: 'Set register and decision standing.', prompt: 'Work from the perspective', route: 'core-architectures-orientation-index.html' },
  { key: 'sanitation', map: 'Input separation', receiver: 'Security, privacy, or workflow steward who can review sensitive input and tool permissions.', label: 'Input sanitation', title: 'Separate content from instruction.', prompt: 'Treat the SOURCE and TOOL OUTPUT blocks', route: 'grammar-family.html' },
  { key: 'working', map: 'Working set', receiver: 'Workflow steward or next decision owner who can verify continuity and authorize the next move.', label: 'Working set', title: 'Carry the smallest complete decision packet.', prompt: 'Using this compact working set', route: 'metadata-blocks.html' },
];
const codeSelector = '#condition-prompt, #state-view, #schema-view';
const captureRoot = resolve(import.meta.dirname, '../../.visual-runs/about-prompt-fit');
const standalone = '/collaboration/about-prompt-conditions-explorer/index.html';
let harness;
before(async () => { await mkdir(captureRoot, { recursive: true }); harness = await createAboutContentFitHarness(); });
after(async () => { await harness?.close(); });
const session = (engine, options) => harness.session('prompt-conditions', engine, options);

async function assertCondition(observation, condition, interaction = 'selector') {
  const frame = observation.frame;
  assert.deepEqual(await frame.locator('button[aria-pressed="true"]').evaluateAll(nodes => nodes.map(node => node.dataset.condition)), [condition.key]);
  assert.deepEqual(await frame.locator('.node.is-active').evaluateAll(nodes => nodes.map(node => node.dataset.node)), [condition.key]);
  assert.equal((await frame.locator('#map-label-a').textContent()) + ' ' + (await frame.locator('#map-label-b').textContent()), condition.map);
  assert.equal(await frame.locator('#condition-title').textContent(), condition.title, 'selected writing matches its independent condition title');
  assert.ok((await frame.locator('#condition-state').textContent()).endsWith(condition.label));
  assert.equal(await frame.locator('#condition-receiver').textContent(), condition.receiver, 'selected condition retains its exact accountable receiver');
  assert.ok((await frame.locator('#condition-prompt').textContent()).startsWith(condition.prompt));
  assert.ok(new URL(await frame.locator('#primary-route').getAttribute('href')).pathname.endsWith('/' + condition.route));
  assert.deepEqual(JSON.parse(await frame.locator('#state-view').textContent()), { activeCondition: condition.key, interaction });
  assert.equal(new URL(frame.url()).hash, '#' + condition.key);
  if (interaction === 'selector') assert.ok((await frame.locator('#condition-status').textContent()).startsWith(condition.label + ' selected.'));
  for (const selector of ['#condition-thesis', '#condition-carries', '#condition-changed', '#condition-boundary']) {
    assert.ok((await frame.locator(selector).textContent()).trim().length > 40, `${selector} supplies substantive selected reading`);
  }
}
async function assertMatrix(frame) {
  assert.equal(await frame.locator('table').count(), 1);
  assert.deepEqual(await frame.locator('tbody th[scope="row"]').allTextContents(), conditions.map(condition => condition.label));
  assert.equal(await frame.locator('thead th[scope="col"]').count(), 6);
  assert.equal(await frame.locator('tbody tr:visible').count(), 5);
  assert.equal(await frame.locator('table caption').textContent(), 'Prompt-side conditions for a recoverable human–AI handoff');
}
async function assertTextFits(frame) {
  const readings = await observeCodeText(frame, codeSelector);
  assert.deepEqual(readings.map(reading => reading.id), ['condition-prompt', 'state-view', 'schema-view']);
  for (const reading of readings) {
    assert.ok(reading.fragments.length > 0, `${reading.id} retains substantive visible text`);
    assert.ok(reading.box.left >= 0 && reading.box.right <= reading.viewport + 1, `${reading.id} fits the child viewport`);
    assert.ok(reading.fragments.every(fragment => fragment.left >= reading.box.left - 1 && fragment.right <= reading.box.right + 1), `${reading.id} actual text fits its reading box`);
  }
  assert.ok(await frame.locator(codeSelector).evaluateAll(nodes => nodes.every(node => node.scrollHeight <= node.clientHeight + 2)), 'fitted prompt and contract text have complete vertical reach');
}

for (const engine of Object.keys(engines)) {
  test(`${engine}: five Prompt conditions retain meaning through fit, disclosure, reflow and late content`, { timeout: 90000 }, async () => {
    const observation = await session(engine);
    try {
      await fitted(observation);
      assert.equal(await observation.carrier.getAttribute('sandbox'), 'allow-popups allow-popups-to-escape-sandbox allow-scripts');
      assert.equal(await observation.frame.evaluate(() => { try { void parent.document.body; return 'readable'; } catch (error) { return error.name; } }), 'SecurityError');
      await observation.page.evaluate(() => { history.replaceState(null, '', '#prompt-conditions-title'); });
      const parentUrl = observation.page.url();
      await assertCondition(observation, conditions[0], 'initial');
      await assertMatrix(observation.frame);
      for (const condition of conditions) {
        const button = observation.frame.locator(`[data-condition="${condition.key}"]`);
        await button.focus(); await button.press('Enter');
        await fitted(observation);
        await assertCondition(observation, condition);
        await expect(button).toBeFocused();
        assert.equal(observation.page.url(), parentUrl, 'selection preserves About’s reading fragment');
      }
      await observation.frame.locator('#condition-title').evaluate(node => { node.textContent = 'A stale condition title'; });
      await assert.rejects(() => assertCondition(observation, conditions[4]), /independent condition title/);
      await observation.frame.locator('[data-condition="working"]').click();
      await assertCondition(observation, conditions[4]);
      const beforeOpen = (await fitted(observation)).content;
      await observation.frame.locator('.contract summary').click();
      const openHeight = (await fitted(observation)).content;
      assert.ok(openHeight > beforeOpen + 100, 'the expanded schema increases the natural document height');
      await assertTextFits(observation.frame);
      await observation.frame.locator('.contract summary').click();
      assert.ok((await fitted(observation)).content < openHeight - 100, 'closing the schema restores the shorter document');
      for (const width of [390, 1440]) {
        await observation.page.setViewportSize({ width, height: 900 }); await fitted(observation);
        if (engine === 'webkit') {
          await observation.carrier.evaluate(element => {
            const nav = document.querySelector('.nav__top--sticky');
            scrollTo({ top: scrollY + element.getBoundingClientRect().top - nav.getBoundingClientRect().height - 16, behavior: 'instant' });
          });
          await observation.page.screenshot({ path: join(captureRoot, `prompt-${width}.png`) });
        }
      }
      for (const childWidth of [767, 769, 991, 993]) {
        let reading = await fitted(observation);
        for (let attempt = 0; attempt < 5 && Math.abs(reading.width - childWidth) > 1; attempt += 1) {
          await observation.page.setViewportSize({ width: observation.page.viewportSize().width + childWidth - reading.width, height: 900 });
          reading = await fitted(observation);
        }
        assert.ok(Math.abs(reading.width - childWidth) <= 1, `actual child width ${reading.width}px brackets ${childWidth}px`);
      }
      await observation.page.setViewportSize({ width: 390, height: 900 });
      await observation.frame.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      await observation.frame.locator('.contract summary').click();
      const enlarged = (await fitted(observation)).content;
      await assertTextFits(observation.frame); await assertCondition(observation, conditions[4]);
      await observation.frame.evaluate(() => {
        const note = document.createElement('p'); note.id = 'late-prompt-observation'; note.style.minHeight = '400px';
        note.textContent = 'Delayed source-owned content exercises natural height.'; document.querySelector('.shell').append(note);
      });
      await expect.poll(async () => (await fitted(observation)).content).toBeGreaterThan(enlarged + 350);
      await observation.frame.locator('#late-prompt-observation').evaluate(node => node.remove());
      await expect.poll(async () => (await fitted(observation)).content).toBeLessThan(enlarged + 5);
      await assertCondition(observation, conditions[4]);
    } finally { await observation.close(); }
  });

  test(`${engine}: Prompt wheel reading stays with About and detects frame and nested-text capture`, { timeout: 90000 }, async () => {
    const observation = await session(engine);
    try {
      await fitted(observation);
      await observation.frame.locator('.contract summary').click(); await fitted(observation);
      for (const target of ['.hero h1', '#condition-prompt', '#schema-view', '.table-region']) assertParentReading(await wheelObservation(observation, target));
      await observation.page.setViewportSize({ width: 390, height: 900 }); await fitted(observation);
      assertParentReading(await wheelObservation(observation, '#condition-prompt'));
    } finally { await observation.close(); }
    // Each fault receives a fresh native wheel transaction, avoiding an earlier
    // scroll target retained by an engine during a continuous wheel series.
    for (const faultKind of ['frame', 'schema']) {
      const fault = await session(engine, { viewport: { width: 390, height: 900 } });
      try {
        await fitted(fault);
        if (faultKind === 'frame') await fault.carrier.evaluate(node => node.style.setProperty('block-size', '420px', 'important'));
        else {
          await fault.frame.locator('.contract summary').click(); await fitted(fault);
          await fault.frame.locator('#schema-view').evaluate(node => { node.style.maxBlockSize = '17rem'; node.style.overflow = 'auto'; });
          await fitted(fault);
        }
        const result = await wheelObservation(fault, faultKind === 'frame' ? '.hero h1' : '#schema-view');
        assert.ok((faultKind === 'frame' ? result.child : result.local) > 5, `${faultKind} restored capture has a direct scroll signal: ${JSON.stringify(result)}`);
        assert.throws(() => assertParentReading(result), /About receives|vertical origin/);
      } finally { await fault.close(); }
    }
    const recovered = await session(engine, { viewport: { width: 390, height: 900 } });
    try { await fitted(recovered); assertParentReading(await wheelObservation(recovered)); }
    finally { await recovered.close(); }
  });

  test(`${engine}: two admitted instruments retain separate sizing channels and useful fallback`, { timeout: 90000 }, async () => {
    const observation = await session(engine);
    try {
      await fitted(observation);
      const gallery = await receiverInPage(observation.page, 'gallery'); await fitted(gallery);
      const galleryHeight = await gallery.carrier.evaluate(node => node.getBoundingClientRect().height);
      const promptHeight = (await fitted(observation)).content;
      await observation.frame.locator('.contract summary').click();
      assert.ok((await fitted(observation)).content > promptHeight + 100);
      assert.equal(await gallery.carrier.evaluate(node => node.getBoundingClientRect().height), galleryHeight, 'Prompt growth leaves Gallery’s independent height intact');
      const galleryIndex = await gallery.carrier.evaluate(node => {
        for (let index = 0; index < window.length; index += 1) if (window[index] === node.contentWindow) return index;
        return -1;
      });
      assert.ok(galleryIndex >= 0, 'the sibling coordinate identifies the exact Gallery browsing context');
      await observation.frame.evaluate(index => {
        const channel = new MessageChannel(); window.__siblingFitReports = 0;
        window.__siblingFitPort = channel.port1; channel.port1.onmessage = () => { window.__siblingFitReports += 1; };
        parent.frames[index].postMessage({ type: 'context-canvas:content-fit-connect', version: 1 }, '*', [channel.port2]);
      }, galleryIndex);
      await gallery.frame.locator('[data-gallery-matrix] summary').first().click();
      await expect.poll(async () => (await fitted(gallery)).content).toBeGreaterThan(galleryHeight + 100);
      assert.equal(await observation.frame.evaluate(() => window.__siblingFitReports), 0, 'an admitted sibling receives no sizing port from another child');
      await observation.frame.evaluate(() => window.__siblingFitPort.close());
      assert.equal(await observation.page.locator('iframe[title="Interactive Cross-Functional Investment Studio"]').getAttribute('data-about-content-fit'), null, 'Studio retains its independent carrier');
    } finally { await observation.close(); }
    const fallback = await session(engine, { childObserverAvailable: false });
    try {
      assert.equal(await fallback.carrier.getAttribute('data-content-fit'), null);
      assert.ok(await fallback.carrier.evaluate(node => node.getBoundingClientRect().height) > 300);
      await assertMatrix(fallback.frame);
      await fallback.frame.locator('[data-condition="desired"]').click();
      await assertCondition(fallback, conditions[1]);
      assert.equal(await fallback.page.locator(`a[href="../..${standalone}"]`).count(), 1);
    } finally { await fallback.close(); }
  });

  test(`${engine}: Prompt keyboard, horizontal matrix, static and print readings remain complete`, { timeout: 90000 }, async () => {
    const observation = await session(engine, { viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    try {
      await fitted(observation);
      const tabKey = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
      await observation.page.locator(`a[href="../..${standalone}"]`).focus();
      await observation.page.keyboard.press(tabKey);
      if (await observation.frame.evaluate(() => document.activeElement === document.body)) await observation.page.keyboard.press(tabKey);
      await expect(observation.frame.locator('.skip-link')).toBeFocused();
      await observation.frame.locator('[data-condition="source"]').focus();
      for (const [key, expected] of [['ArrowRight', 1], ['End', 4], ['ArrowRight', 0], ['ArrowLeft', 4], ['Home', 0]]) {
        await observation.page.keyboard.press(key); await fitted(observation);
        await expect(observation.frame.locator(`[data-condition="${conditions[expected].key}"]`)).toBeFocused();
        await assertCondition(observation, conditions[expected]);
      }
      const tableRegion = observation.frame.locator('.table-region');
      await tableRegion.scrollIntoViewIfNeeded();
      await tableRegion.focus();
      await expect(tableRegion).toBeFocused();
      const left = await tableRegion.evaluate(node => node.scrollLeft);
      // Keep the native key active until the engine begins its scroll step.
      await observation.page.keyboard.down('ArrowRight');
      try { await expect.poll(() => tableRegion.evaluate(node => node.scrollLeft)).toBeGreaterThan(left); }
      finally { await observation.page.keyboard.up('ArrowRight'); }
      await tableRegion.evaluate(node => { node.scrollLeft = node.scrollWidth; });
      const edge = await tableRegion.evaluate(node => ({ right: node.getBoundingClientRect().right,
        last: node.querySelector('tbody tr:last-child td:last-child').getBoundingClientRect().right,
        viewport: innerWidth }));
      assert.ok(edge.right <= edge.viewport + 1 && edge.last <= edge.right + 2, 'the final matrix column remains reachable inside its local horizontal region');
      await observation.frame.locator('.contract summary').focus(); await observation.page.keyboard.press(tabKey);
      await expect(observation.page.locator('.about-prompt-static > summary')).toBeFocused();
    } finally { await observation.close(); }
    for (const javaScriptEnabled of [true, false]) {
      const context = await harness.browsers.get(engine).newContext({ javaScriptEnabled, viewport: { width: 390, height: 900 } });
      try {
        const page = await context.newPage(), telemetry = monitor(page);
        await page.goto(harness.parentServer.origin + standalone);
        if (javaScriptEnabled) {
          await page.locator('[data-condition="working"]').click();
          await page.emulateMedia({ media: 'print' });
        } else assert.equal(await page.locator('.selectors').isVisible(), false);
        await assertMatrix(page);
        const expectedReading = javaScriptEnabled ? conditions[4] : conditions[0];
        assert.equal(await page.locator('#condition-title').isVisible(), true, 'standalone presentation keeps its current reading visible');
        assert.equal(await page.locator('#condition-title').textContent(), expectedReading.title);
        assert.equal(await page.locator('#condition-prompt').isVisible(), true, 'standalone presentation keeps the prompt fragment visible');
        assert.ok((await page.locator('#condition-prompt').textContent()).startsWith(expectedReading.prompt));
        assert.equal(await page.locator('.contract').isVisible(), false, 'static and print follow the established complete-matrix reading');
        assertTelemetry(telemetry);
      } finally { await context.close(); }
    }
    const scriptlessParent = await harness.parentSession(engine, { javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
    try {
      assert.equal(await scriptlessParent.page.locator('iframe[data-about-content-fit="prompt-conditions"]').isVisible(), false,
        'scriptless About retains its established static-parent reading');
      const summary = scriptlessParent.page.locator('.about-prompt-static > summary');
      assert.equal(await summary.isVisible(), true, 'scriptless reading exposes its native disclosure control');
      await summary.focus(); await summary.press('Enter');
      assert.equal(await scriptlessParent.page.locator('.about-prompt-static').evaluate(node => node.open), true);
      assert.equal(await scriptlessParent.page.locator('.about-prompt-static tbody tr:visible').count(), 5);
      assert.deepEqual(await scriptlessParent.page.locator('.about-prompt-static tbody th[scope="row"]').allTextContents(), conditions.map(condition => condition.label));
    } finally { await scriptlessParent.close(); }
  });
}
