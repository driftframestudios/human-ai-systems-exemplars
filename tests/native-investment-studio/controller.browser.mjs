import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name), `Unknown NATIVE_STUDIO_BROWSER: ${name}`);
const browsers = new Map();
const route = '/context-canvas-project-surface/context-canvas/index.html';
const selector = '[data-native-coordination]';
const controllerPath = '/collaboration/native-investment-studio/controller.mjs';
const statePath = '/collaboration/native-investment-studio/state.mjs';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-coordination');
let server;

before(async () => {
  await mkdir(captures, { recursive: true });
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function open(t, engine, options = {}) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  const telemetry = monitor(page);
  const activeRequests = new Set();
  page.on('request', request => activeRequests.add(request));
  page.on('requestfinished', request => activeRequests.delete(request));
  page.on('requestfailed', request => activeRequests.delete(request));
  const settleRequests = () => expect.poll(() => activeRequests.size).toBe(0);
  t.after(async () => {
    try { await settleRequests(); assertTelemetry(telemetry); }
    finally { await context.close(); }
  });
  // This case observes native About content. Hosted iframe and remote-media
  // contracts retain their owners; a stable local placeholder bounds this task.
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' }));
  await page.goto(server.origin + route, { waitUntil: 'load' });
  if (options.javaScriptEnabled !== false) {
    // Settle the actual About media before interactions scroll this receiver.
    // The shared telemetry monitor continues to reject every request failure.
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => {
      image.loading = 'eager';
      return image.decode();
    })));
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(`${selector} [data-action="edit"]`)).toBeVisible();
  }
  await settleRequests();
  return page;
}

const panel = page => page.locator(selector);
const action = (page, name) => panel(page).locator(`[data-action="${name}"]`);
const input = (page, name = 'minutesPerSession') => panel(page).locator(`input[name="${name}"]`);
const total = page => panel(page).locator('[data-native-total]');
const preview = page => panel(page).locator('[data-native-preview-total]');

async function setDuration(page, hours, minutes) {
  await input(page, 'hoursPerSession').fill(hours);
  await input(page).fill(minutes);
}

async function assertCompactControls(page) {
  const observations = await panel(page).locator('input').evaluateAll(inputs => inputs.map(input => {
    const style = getComputedStyle(input);
    const box = input.getBoundingClientRect();
    const context = document.createElement('canvas').getContext('2d');
    context.font = style.font;
    const available = box.width - Number.parseFloat(style.borderLeftWidth) - Number.parseFloat(style.borderRightWidth)
      - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
    return { name: input.name, value: input.value, width: box.width, fontSize: Number.parseFloat(style.fontSize),
      controlWidth: input.closest('.native-coordination__control').getBoundingClientRect().width,
      textWidth: context.measureText(input.value).width, available, scrollWidth: input.scrollWidth, clientWidth: input.clientWidth };
  }));
  assert.equal(observations.length, 3);
  for (const observation of observations) {
    if (observation.fontSize < 24) assert.ok(observation.width <= observation.controlWidth * .75,
      `the ${observation.name} field stays compact at ordinary text size: ${JSON.stringify(observation)}`);
    assert.ok(observation.textWidth <= observation.available + 1 && observation.scrollWidth <= observation.clientWidth + 1,
      `the complete ${observation.value} quantity fits without input scrolling: ${JSON.stringify(observation)}`);
  }
  for (const button of await panel(page).locator('button[data-step]').all()) {
    const box = await button.boundingBox();
    assert.ok(box.width >= 43.95 && box.height >= 43.95,
      `each visible step control retains a 44px target within subpixel geometry precision: ${JSON.stringify(box)}`);
  }
}

async function assertMaximumDigitsFit(page) {
  // Exercise the widest admitted component shapes, including a combined-duration
  // error, while the accepted plan and the caller's unfinished draft stay owned.
  await setDuration(page, '24', '59');
  await input(page, 'occurrences').fill('10000');
  await assertCompactControls(page);
  await assertContained(page);
  await setDuration(page, '0', '45');
  await input(page, 'occurrences').fill('6');
  await input(page).focus();
}

async function begin(page) {
  await action(page, 'edit').click();
  await expect(input(page)).toBeVisible();
}

async function assertAmount(page, value) {
  await expect(total(page)).toHaveText(value);
}

async function assertContained(page) {
  const observed = await panel(page).evaluate(root => {
    const rectangle = node => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, element: node.localName, name: node.getAttribute('name') ?? node.getAttribute('data-action') }; };
    const rendered = node => {
      if (node.getClientRects().length === 0) return false;
      for (let parent = node; parent && parent !== root; parent = parent.parentElement) {
        if (parent.hidden) return false;
        if (parent.localName === 'details' && !parent.open && !parent.querySelector(':scope > summary')?.contains(node)) return false;
      }
      return true;
    };
    const visible = [...root.querySelectorAll('button,input,summary,output,table,[data-native-total]')]
      .filter(rendered);
    const text = [];
    for (const node of root.querySelectorAll('label,button,summary,output,p,th,td,h3,h4,dt,dd')) {
      if (!rendered(node)) continue;
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let current;
      while ((current = walker.nextNode())) {
        if (!current.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(current);
        text.push(...[...range.getClientRects()].map(box => ({ left: box.left, right: box.right, element: node.localName, text: current.textContent.trim() })));
      }
    }
    return { width: document.documentElement.clientWidth, root: rectangle(root), visible: visible.map(rectangle), text };
  });
  assert.ok(observed.root.width > 0 && observed.root.left >= -1 && observed.root.right <= observed.width + 1,
    `native panel fits the ${observed.width}px reading width`);
  for (const box of [...observed.visible, ...observed.text]) {
    assert.ok(box.left >= observed.root.left - 1 && box.right <= observed.root.right + 1,
      `controls and actual text fit the ${observed.width}px panel ${JSON.stringify(observed.root)}: ${JSON.stringify(box)}`);
  }
}

async function injectOwner(page) {
  await page.evaluate(async ({ selector, controllerPath, statePath }) => {
    const { mountCoordinationPanel } = await import(controllerPath);
    const { createStudio } = await import(statePath);
    const root = document.querySelector(selector);
    mountCoordinationPanel(root).dispose();
    const studio = createStudio();
    window.nativeFixture = { studio, initial: studio.read(), mountCoordinationPanel, root };
    const range = root.querySelector('[data-native-range="occurrences"]');
    const parent = range.parentNode, next = range.nextSibling;
    range.remove();
    const activeListeners = [];
    const restore = [];
    for (const target of [root, root.querySelector('form'), root.querySelector('[data-native-configure]'), window]) {
      for (const name of ['addEventListener', 'removeEventListener']) {
        const descriptor = Object.getOwnPropertyDescriptor(target, name);
        const original = target[name];
        target[name] = function (type, listener, ...options) {
          if (name === 'addEventListener') activeListeners.push({ target, type, listener });
          else {
            const index = activeListeners.findIndex(item => item.target === target && item.type === type && item.listener === listener);
            if (index !== -1) activeListeners.splice(index, 1);
          }
          return Reflect.apply(original, this, [type, listener, ...options]);
        };
        restore.push(() => descriptor ? Object.defineProperty(target, name, descriptor) : delete target[name]);
      }
    }
    let rejected = false;
    try { mountCoordinationPanel(root, { studio }); }
    catch { rejected = true; }
    finally { for (const release of restore) release(); parent.insertBefore(range, next); }
    window.nativeFixture.failedMount = {
      rejected, liveListeners: activeListeners.length, disabled: root.querySelector('fieldset').disabled,
      editHidden: root.querySelector('[data-action="edit"]').hidden,
      fallbackVisible: !root.querySelector('[data-native-fallback]').hidden,
      readyAbsent: !root.hasAttribute('data-native-ready'),
      acceptedCents: studio.read().result.knownCommitmentCents,
    };
    window.nativeFixture.controller = mountCoordinationPanel(root, { studio });
  }, { selector, controllerPath, statePath });
}

for (const engine of names) {
  test(`${engine}: one coordination transaction preserves unfinished input and independently priced accepted amounts`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await assertAmount(page, '$1,200.00');
    await begin(page);
    await expect(input(page, 'hoursPerSession')).toHaveValue('0');
    await expect(input(page)).toHaveValue('30');
    await expect(action(page, 'apply')).toHaveAttribute('aria-disabled', 'true');
    await setDuration(page, '1', '0');
    await expect(preview(page)).toHaveText('$2,400.00');
    await assertAmount(page, '$1,200.00');
    await action(page, 'apply').click();
    await assertAmount(page, '$2,400.00');
    await expect(action(page, 'apply')).toBeFocused();
    await expect(panel(page).locator('[data-native-configure]')).toHaveAttribute('open', '');
    await expect(action(page, 'apply')).toHaveAttribute('aria-disabled', 'true');

    const trace = panel(page).locator('[data-native-trace]');
    await trace.locator('summary').click();
    const people = trace.locator('[data-native-trace-list] > li');
    assert.equal(await people.count(), 4, 'the trace retains all four independently priced participants');
    for (const person of await people.all()) await expect(person).toContainText('360 min · $600.00');
    await expect(trace.locator('[data-native-trace-summary]')).toContainText('$2,400.00');
    await expect(panel(page).locator('[data-native-effort]')).toHaveText('4 people × 1 h per session × 6 working sessions = 24 h of participant effort.');
    await trace.locator('summary').click();
    await input(page).fill('30');
    await expect(preview(page)).toHaveText('$3,600.00');
    await input(page, 'occurrences').fill('8');
    await expect(preview(page)).toHaveText('$4,800.00');
    await assertAmount(page, '$2,400.00');
    await action(page, 'apply').click();
    await assertAmount(page, '$4,800.00');
    for (const raw of ['', '-', '1e', '-1', '60']) {
      await begin(page);
      await input(page).fill(raw);
      await action(page, 'apply').click();
      await expect(input(page)).toHaveValue(raw);
      await expect(input(page)).toHaveAttribute('aria-invalid', 'true');
      await expect(preview(page)).toHaveText('—');
      await expect(panel(page).locator('[data-native-preview-note]')).not.toHaveText('');
      await assertAmount(page, '$4,800.00');
      await action(page, 'cancel').click();
      await expect(action(page, 'edit')).toBeFocused();
      await assertAmount(page, '$4,800.00');
    }
    await begin(page);
    await input(page).fill('-');
    await action(page, 'apply').click();
    const status = panel(page).locator('[data-native-status]');
    await expect(status).not.toHaveText('');
    await input(page).fill('0');
    await expect(status).toHaveText('');
    await expect(preview(page)).toHaveText('$3,200.00');
    await action(page, 'apply').click();
    await expect(status).toHaveText('Changes applied. Accepted investment $3,200.00.');
    await assertAmount(page, '$3,200.00');
    await input(page).focus();
    await input(page).dispatchEvent('compositionstart');
    await input(page).evaluate(node => {
      node.value = '30';
      node.dispatchEvent(new InputEvent('input', { bubbles: true, data: '30', inputType: 'insertCompositionText', isComposing: true }));
    });
    await expect(preview(page)).toHaveText('—');
    await expect(panel(page).locator('[data-native-preview-note]')).toContainText('Finish entering');
    await input(page).press('Enter');
    await assertAmount(page, '$3,200.00');
    await input(page).dispatchEvent('compositionend');
    await expect(preview(page)).toHaveText('$4,800.00');
    await setDuration(page, '0', '0');
    await input(page).press('Enter');
    await assertAmount(page, '$0.00');
    await input(page).fill('59');
    const increment = panel(page).locator('[data-field="minutesPerSession"][data-step="1"]');
    await increment.focus(); await increment.press('Enter');
    await expect(input(page, 'hoursPerSession')).toHaveValue('1');
    await expect(input(page)).toHaveValue('0');
    await expect(preview(page)).toHaveText('$3,200.00');
    const decrement = panel(page).locator('[data-field="minutesPerSession"][data-step="-1"]');
    await decrement.focus(); await decrement.press('Space');
    await expect(input(page, 'hoursPerSession')).toHaveValue('0');
    await expect(input(page)).toHaveValue('59');
    await increment.click();
    await action(page, 'apply').click();
    // Four people × one hour × eight sessions × $100/hour = $3,200.
    await assertAmount(page, '$3,200.00');
    await setDuration(page, '24', '1');
    await expect(preview(page)).toHaveText('—');
    await action(page, 'apply').click();
    await expect(input(page)).toHaveAttribute('aria-invalid', 'true');
    await assertAmount(page, '$3,200.00');
    await input(page).fill('0');
    await expect(preview(page)).toHaveText('$76,800.00');
    await action(page, 'cancel').click();
    await assertAmount(page, '$3,200.00');
    assert.equal(await page.locator('iframe[data-about-content-fit="studio-chapters"]').count(), 1);
    assert.equal(await page.locator('a[href="../../collaboration/initiative-costing-calculator/index.html"]').count(), 1);
  });

  test(`${engine}: disclosure and responsive changes preserve drafts while About owns vertical scrolling`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await begin(page); await input(page).fill('45');
    if (engine === 'webkit') await panel(page).screenshot({ path: resolve(captures, 'coordination-desktop.png') });
    const configure = panel(page).locator('[data-native-configure]');
    const summary = configure.locator('summary');
    // Native summary activation owns focus; reopening receives the same editor.
    await summary.focus(); await summary.press('Enter'); await expect(summary).toBeFocused();
    await summary.press('Enter'); await expect(summary).toBeFocused();
    await expect(input(page)).toHaveValue('45');
    await panel(page).locator('[data-native-trace] > summary').click();
    await input(page).focus();
    for (const width of [833, 832, 831, 390, 320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(input(page)).toBeFocused();
      await expect(input(page)).toHaveValue('45');
      await assertContained(page);
      await assertCompactControls(page);
      if ([833, 832, 831].includes(width)) {
        const agreement = await panel(page).locator('.native-coordination__agreement').boundingBox();
        const configuration = await configure.boundingBox();
        if (width >= 832) {
          assert.ok(configuration.x >= agreement.x + agreement.width, 'wide agreement and editor share a reading row');
          assert.ok(Math.abs(configuration.y - agreement.y) < 2, 'the paired groups begin together');
        } else assert.ok(configuration.y >= agreement.y + agreement.height, 'the narrow editor follows the agreement in document order');
      }
      if (width === 320) {
        await assertMaximumDigitsFit(page);
        if (engine === 'webkit') await panel(page).screenshot({ path: resolve(captures, 'coordination-320.png') });
      }
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    if (engine === 'webkit') await panel(page).screenshot({ path: resolve(captures, 'coordination-enlarged.png') });
    await assertContained(page);
    await assertMaximumDigitsFit(page);
    await expect(input(page)).toHaveValue('45');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await input(page, 'occurrences').focus();
    const nextControl = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
    await input(page, 'occurrences').press(nextControl);
    await page.keyboard.press(nextControl);
    await expect(action(page, 'apply')).toBeFocused();
    assert.notEqual(await action(page, 'apply').evaluate(node => getComputedStyle(node).outlineStyle), 'none', 'keyboard focus retains a visible outline in forced colors');
    await action(page, 'apply').press('Enter');
    await assertAmount(page, '$1,800.00');
    await expect(action(page, 'apply')).toBeFocused();
    await expect(configure).toHaveAttribute('open', '');
    await assertContained(page);

    await page.emulateMedia({ forcedColors: 'none' });
    await begin(page);
    const receiver = input(page);
    await receiver.scrollIntoViewIfNeeded();
    const box = await receiver.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 260);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 20);
    await expect(input(page)).toHaveValue('45');
    await assertAmount(page, '$1,800.00');
  });

  test(`${engine}: accepted replacements, stale recovery, and teardown preserve instance ownership`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await injectOwner(page);
    assert.deepEqual(await page.evaluate(() => window.nativeFixture.failedMount),
      { rejected: true, liveListeners: 0, disabled: true, editHidden: true,
        fallbackVisible: true, readyAbsent: true, acceptedCents: 120000 },
      'failed mount releases its listeners and leaves the accepted example available before repaired remount');
    await begin(page);
    await page.evaluate(() => {
      const fixture = window.nativeFixture;
      fixture.beforeNoop = fixture.studio.read();
      fixture.firstToken = fixture.controller.read().draft.token;
    });
    await expect(action(page, 'apply')).toHaveAttribute('aria-disabled', 'true');
    await input(page).press('Enter');
    assert.deepEqual(await page.evaluate(() => {
      const fixture = window.nativeFixture;
      return { acceptedRetained: fixture.studio.read() === fixture.beforeNoop,
        tokenRetained: fixture.controller.read().draft.token === fixture.firstToken,
        revision: fixture.studio.read().state.revision };
    }), { acceptedRetained: true, tokenRetained: true, revision: 0 }, 'unchanged submit preserves accepted identity, revision, and the open draft');
    await input(page).fill('45');
    await page.evaluate(() => {
      const { studio, controller } = window.nativeFixture;
      const replacement = JSON.parse(studio.exportText());
      replacement.work[0].occurrences = 12;
      const outcome = studio.importText(JSON.stringify(replacement), studio.read());
      if (!outcome.ok) throw new Error('Fixture replacement must be admitted');
      window.nativeFixture.replacement = studio.read();
      controller.refresh();
    });
    await assertAmount(page, '$2,400.00');
    await expect(input(page)).toHaveValue('45');
    await expect(preview(page)).toHaveText('—');
    await expect(panel(page).locator('[data-native-preview-note]')).toContainText('current accepted plan');
    await action(page, 'apply').click();
    await expect(input(page)).toHaveValue('45');
    assert.deepEqual(await page.evaluate(() => {
      const { studio, initial, replacement, controller } = window.nativeFixture;
      return { currentRetained: studio.read() === replacement, initialCents: initial.result.knownCommitmentCents,
        stale: controller.read().status, raw: controller.read().draft.raw.minutesPerSession };
    }), { currentRetained: true, initialCents: 120000, stale: 'stale', raw: '45' });
    await action(page, 'cancel').click(); await begin(page);
    await expect(input(page, 'occurrences')).toHaveValue('12');
    await setDuration(page, '1', '0');
    await page.evaluate(() => { window.nativeFixture.committingToken = window.nativeFixture.controller.read().draft.token; });
    await action(page, 'apply').click();
    await assertAmount(page, '$4,800.00');
    assert.deepEqual(await page.evaluate(() => {
      const fixture = window.nativeFixture;
      const view = fixture.controller.read();
      return { freshToken: view.draft.token !== fixture.committingToken,
        baseIsAccepted: view.draft.baseProjection === fixture.studio.read(), changed: view.draft.changed,
        revision: fixture.studio.read().state.revision };
    }), { freshToken: true, baseIsAccepted: true, changed: false, revision: 1 }, 'Apply opens a fresh draft owned by exactly one new accepted revision');
    await expect(action(page, 'apply')).toBeFocused();
    await expect(panel(page).locator('[data-native-configure]')).toHaveAttribute('open', '');

    await setDuration(page, '1', '30');
    await page.evaluate(() => {
      const fixture = window.nativeFixture;
      fixture.beforeDispose = fixture.studio.read();
      fixture.controller.dispose();
      fixture.root.querySelector('[data-action="apply"]').click();
      fixture.controller.dispose();
    });
    assert.deepEqual(await page.evaluate(() => {
      const f = window.nativeFixture;
      return { retained: f.studio.read() === f.beforeDispose, status: f.controller.read().status };
    }), { retained: true, status: 'disposed' });
    await page.evaluate(() => {
      const f = window.nativeFixture;
      f.controller = f.mountCoordinationPanel(f.root, { studio: f.studio });
    });
    await begin(page); await setDuration(page, '0', '30'); await action(page, 'apply').click();
    await assertAmount(page, '$2,400.00');
    assert.equal(await page.evaluate(() => window.nativeFixture.studio.read().state.revision), 2,
      'one remounted controller produces exactly one accepted revision after the fixture import');
  });

  test(`${engine}: scriptless About preserves the coordination example and complete Studio route`, { timeout: 30000 }, async t => {
    const page = await open(t, engine, { javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await expect(panel(page)).toBeVisible();
    await assertAmount(page, '$1,200.00');
    for (const node of await panel(page).locator('button,input').all()) assert.equal(await node.isVisible(), false, 'inactive editing controls stay outside the static reading');
    await expect(page.locator('a[href="../../collaboration/initiative-costing-calculator/index.html"]')).toBeVisible();
    assert.equal(await page.locator('iframe[data-about-content-fit="studio-chapters"]').count(), 1);
    await assertContained(page);
  });
}
