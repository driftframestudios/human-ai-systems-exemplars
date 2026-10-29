import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
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
let aboutFixture;

before(async () => {
  await mkdir(captures, { recursive: true });
  const aboutSource = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const objectSource = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  const closedOverview = aboutSource.match(/<details class="about-prompt-static">([\s\S]*?)<\/details>/u)?.[1];
  assert.ok(closedOverview?.includes(objectSource), 'the unrelated diagram retains its separate closed-disclosure owner');
  assert.equal(aboutSource.split(objectSource).length, 2, 'the fixture isolates exactly one unrelated object');
  // WebKit can cancel this closed disclosure's object navigation while rendering
  // About. Keep its fallback link and every native receiver byte; this bounded
  // fixture leaves that diagram's loading behavior with the Prompt owner.
  aboutFixture = aboutSource.replace(objectSource, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
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
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route) return request.fulfill({ status: 200, contentType: 'text/html', body: aboutFixture });
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' });
  });
  await page.goto(server.origin + route, { waitUntil: 'load' });
  if (options.javaScriptEnabled !== false) {
    // Settle the actual About media before interactions scroll this receiver.
    // The shared telemetry monitor continues to reject every request failure.
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => {
      image.loading = 'eager';
      return image.decode();
    })));
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(selector)).toHaveAttribute('data-native-ready', 'true');
    await expect(page.locator(`${selector} [data-native-configure]`)).toHaveAttribute('open', '');
    await expect(page.locator(`${selector} input[name="hoursPerSession"]`)).toBeEditable();
  }
  await settleRequests();
  return page;
}

const panel = page => page.locator(selector);
const action = (page, name) => panel(page).locator(`[data-action="${name}"]`);
const settingsSummary = page => panel(page).locator('[data-native-configure] > summary');
const input = (page, name = 'minutesPerSession') => panel(page).locator(`input[name="${name}"]`);
const total = page => panel(page).locator('[data-native-total]');
const preview = page => panel(page).locator('[data-native-preview-total]');

async function assertDurationReadout(page, hours, minutes) {
  await expect(panel(page).locator('[data-native-duration-hours]')).toHaveText(hours);
  await expect(panel(page).locator('[data-native-duration-minutes]')).toHaveText(minutes);
}

async function setDuration(page, hours, minutes) {
  await input(page, 'hoursPerSession').fill(hours);
  await input(page).fill(minutes);
}

async function assertCompactControls(page) {
  const observations = await panel(page).locator('[data-native-configure] input').evaluateAll(inputs => inputs.map(input => {
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
  for (const button of await panel(page).locator('[data-native-configure] button[data-step]').all()) {
    const box = await button.boundingBox();
    assert.ok(box.width >= 43.95 && box.height >= 43.95,
      `each visible step control retains a 44px target within subpixel geometry precision: ${JSON.stringify(box)}`);
  }
  const paintedGroups = await panel(page).locator('[data-native-configure] .native-coordination__controls > .native-coordination__control').evaluateAll(groups => groups.map(group => {
    const paint = [...group.querySelectorAll('input,button')].map(node => {
      const box = node.getBoundingClientRect(), style = getComputedStyle(node);
      const [x = 0, y = 0, blur = 0, spread = 0] = (style.boxShadow.match(/-?[\d.]+px/gu) ?? []).map(Number.parseFloat);
      const outline = style.outlineStyle === 'none' ? 0 : Number.parseFloat(style.outlineWidth) + Math.max(0, Number.parseFloat(style.outlineOffset));
      return { left: Math.min(box.left - outline, box.left + x - blur - spread),
        right: Math.max(box.right + outline, box.right + x + blur + spread),
        top: Math.min(box.top - outline, box.top + y - blur - spread),
        bottom: Math.max(box.bottom + outline, box.bottom + y + blur + spread) };
    });
    return { field: group.querySelector('input').name, left: Math.min(...paint.map(box => box.left)),
      right: Math.max(...paint.map(box => box.right)), top: Math.min(...paint.map(box => box.top)), bottom: Math.max(...paint.map(box => box.bottom)) };
  }));
  for (let first = 0; first < paintedGroups.length; first += 1) for (let second = first + 1; second < paintedGroups.length; second += 1) {
    const a = paintedGroups[first], b = paintedGroups[second];
    assert.ok(a.right <= b.left + .05 || b.right <= a.left + .05 || a.bottom <= b.top + .05 || b.bottom <= a.top + .05,
      `neighboring stepper groups retain separate paint, including hard shadows and focus: ${JSON.stringify({ a, b })}`);
  }
}

async function assertMaximumDigitsFit(page) {
  // Keep five raw digits visible in every field, including accidental leading
  // zeros, while the accepted plan and the caller's draft stay owned.
  await setDuration(page, '00024', '00059');
  await input(page, 'occurrences').fill('10000');
  await assertCompactControls(page);
  await assertContained(page);
  await setDuration(page, '0', '45');
  await input(page, 'occurrences').fill('6');
  await input(page).focus();
}

async function assertFormContainerSeams(page) {
  const rem = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
  const samples = [20 * rem - 1, 20 * rem + 1, 31 * rem - 1, 31 * rem + 1];
  for (const target of samples) {
    let width = Math.ceil(target + 100);
    let observed;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      observed = await panel(page).locator('[data-native-configure] .native-coordination__controls').evaluate(node => node.getBoundingClientRect().width);
      if (Math.abs(observed - target) <= .75) break;
      width += Math.round(target - observed);
    }
    assert.ok(Math.abs(observed - target) <= .75,
      `the form-content fixture reaches ${target}px beside its responsive seam; observed ${observed}px at viewport ${width}px`);
    await assertMaximumDigitsFit(page);
    const settledWidth = await panel(page).locator('[data-native-configure] .native-coordination__controls').evaluate(node => node.getBoundingClientRect().width);
    assert.ok(Math.abs(settledWidth - target) <= .75,
      `the ${target}px form sample retains its measured width after editing: before ${observed}px, after ${settledWidth}px`);
    const controls = await panel(page).locator('[data-native-configure] .native-coordination__controls > .native-coordination__control').evaluateAll(nodes =>
      nodes.map(node => ({ top: node.getBoundingClientRect().top, width: node.getBoundingClientRect().width,
        inputTop: node.querySelector('input').getBoundingClientRect().top,
        buttonTop: node.querySelector('button').getBoundingClientRect().top })));
    assert.equal(controls.length, 3);
    if (target > 31 * rem) assert.ok(Math.max(...controls.map(item => item.inputTop)) - Math.min(...controls.map(item => item.inputTop)) < .1,
      `all three inputs share the row beyond the wide seam: ${JSON.stringify(controls)}`);
    else if (target > 20 * rem) assert.ok(Math.abs(controls[0].inputTop - controls[1].inputTop) < .1 && controls[2].top > controls[1].top,
      `two duration controls share a row before the session count: ${JSON.stringify(controls)}`);
    else assert.ok(controls[0].top < controls[1].top && controls[1].top < controls[2].top,
      `the smallest form preserves the ordered three-control flow: ${JSON.stringify(controls)}`);
    for (const control of controls) {
      assert.ok(control.buttonTop > control.inputTop,
        `each control consistently places its step buttons below the input: ${JSON.stringify(control)}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

async function assertInputPositionsThroughFeedback(page, capture = null) {
  const positions = () => panel(page).locator('[data-native-configure] input').evaluateAll(inputs => inputs.map(input => ({
    name: input.name, top: input.getBoundingClientRect().top + scrollY,
  })));
  const baseline = await positions();
  const unchanged = async state => {
    const actual = await positions();
    assert.deepEqual(actual.map(item => item.name), baseline.map(item => item.name));
    for (let index = 0; index < baseline.length; index += 1) {
      assert.ok(Math.abs(actual[index].top - baseline[index].top) < .1,
        `${state} preserves ${actual[index].name} document position: ${JSON.stringify({ before: baseline[index], after: actual[index] })}`);
    }
    const order = await panel(page).evaluate(root => {
      const lastInputBottom = Math.max(...[...root.querySelectorAll('[data-native-configure] input')].map(input => input.getBoundingClientRect().bottom));
      return { lastInputBottom, feedbackTop: root.querySelector('.native-coordination__feedback').getBoundingClientRect().top,
        previewTop: root.querySelector('.native-coordination__preview').getBoundingClientRect().top };
    });
    assert.ok(order.feedbackTop >= order.lastInputBottom && order.previewTop >= order.lastInputBottom,
      'variable field feedback and investment preview follow every quantity control');
  };
  for (const raw of ['', '-1']) {
    await input(page).fill(raw);
    await expect(preview(page)).toHaveText('—');
    await expect(panel(page).locator('[data-native-error="minutesPerSession"]')).toContainText('Minutes:');
    await unchanged(`the ${JSON.stringify(raw)} draft`);
  }
  await setDuration(page, '24', '1');
  await expect(preview(page)).toHaveText('—');
  await unchanged('the combined-duration error');
  if (capture) await panel(page).screenshot({ path: resolve(captures, `coordination-error-${capture}.png`) });
  await action(page, 'apply').click();
  await expect(input(page)).toBeFocused();
  await unchanged('the explicit invalid Apply diagnostic');
  await setDuration(page, '0', '45');
  await expect(preview(page)).toHaveText('$1,800.00');
  await expect(panel(page).locator('[data-native-error="minutesPerSession"]')).toHaveText('');
  await unchanged('recovery to a complete draft');
  await input(page).focus();
}

async function begin(page) {
  if (!(await panel(page).locator('[data-native-configure]').evaluate(node => node.open))) await settingsSummary(page).click();
  await expect(input(page)).toBeEditable();
}

async function assertAmount(page, value) {
  await expect(total(page)).toHaveText(value);
}

async function assertContained(page) {
  const observed = await panel(page).evaluate(root => {
    const rectangle = node => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width, element: node.localName, name: node.getAttribute('name') ?? node.getAttribute('data-action') }; };
    const rendered = node => {
      // The chapter suite owns the local horizontal strip, including labels
      // wider than its viewport. This oracle measures the visible form reading.
      if (node.closest('[data-native-chapter-list]')) return false;
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
    const summary = root.querySelector('[data-native-configure] > summary');
    const parent = summary.parentNode, next = summary.nextSibling;
    summary.remove();
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
    finally { for (const release of restore) release(); parent.insertBefore(summary, next); }
    window.nativeFixture.failedMount = {
      rejected, liveListeners: activeListeners.length, disabled: root.querySelector('fieldset').disabled,
      settingsClosed: !root.querySelector('[data-native-configure]').open,
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
    await expect(settingsSummary(page)).toHaveText('Session settings');
    await begin(page);
    await expect(input(page, 'hoursPerSession')).toHaveValue('0');
    await expect(input(page)).toHaveValue('30');
    await assertDurationReadout(page, '00', '30');
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
    await expect(trace.locator('summary')).toHaveText('Cost breakdown');
    await trace.locator('summary').click();
    const people = trace.locator('[data-native-trace-list] > li');
    assert.equal(await people.count(), 4, 'the trace retains all four independently priced participants');
    for (const person of await people.all()) await expect(person).toContainText('360 min · $600.00');
    await expect(trace.locator('[data-native-trace-summary]')).toContainText('$2,400.00');
    await expect(panel(page).locator('[data-native-effort]')).toHaveText('4 people × 1 h per session × 6 working sessions = 24 h of participant effort.');
    await trace.locator('summary').click();
    await input(page).fill('30');
    await assertDurationReadout(page, '01', '30');
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
      await assertDurationReadout(page, '01', '—');
      await expect(panel(page).locator('[data-native-preview-note]')).not.toHaveText('');
      await assertAmount(page, '$4,800.00');
      await action(page, 'cancel').click();
      await expect(settingsSummary(page)).toBeFocused();
      await expect(panel(page).locator('[data-native-configure]')).not.toHaveAttribute('open', '');
      await expect(panel(page).locator('[data-native-status]')).toBeVisible();
      await expect(panel(page).locator('[data-native-status]')).toHaveText('Changes cancelled.');
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
    await expect(status).toHaveText('Total updated to $3,200.00.');
    await assertAmount(page, '$3,200.00');
    await input(page).focus();
    await input(page).dispatchEvent('compositionstart');
    await input(page).evaluate(node => {
      node.value = '30';
      node.dispatchEvent(new InputEvent('input', { bubbles: true, data: '30', inputType: 'insertCompositionText', isComposing: true }));
    });
    await expect(preview(page)).toHaveText('—');
    await assertDurationReadout(page, '—', '—');
    await expect(panel(page).locator('[data-native-preview-note]')).toContainText('Finish entering');
    await input(page).press('Enter');
    await assertAmount(page, '$3,200.00');
    await input(page).dispatchEvent('compositionend');
    await expect(preview(page)).toHaveText('$4,800.00');
    await assertDurationReadout(page, '01', '30');
    await setDuration(page, '0', '0');
    await input(page).press('Enter');
    await assertAmount(page, '$0.00');
    await input(page).fill('59');
    const increment = panel(page).locator('[data-field="minutesPerSession"][data-step="1"]');
    await increment.focus(); await increment.press('Enter');
    await expect(input(page, 'hoursPerSession')).toHaveValue('1');
    await expect(input(page)).toHaveValue('0');
    await assertDurationReadout(page, '01', '00');
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
    const wide = await panel(page).evaluate(root => {
      const form = root.querySelector('form'), style = getComputedStyle(form);
      return { contentWidth: form.getBoundingClientRect().width - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight),
        threshold: 31 * Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
        tops: [...root.querySelectorAll('[data-native-configure] input')].map(input => input.getBoundingClientRect().top) };
    });
    assert.ok(wide.contentWidth >= wide.threshold, `the wide fixture reaches the three-control row: ${JSON.stringify(wide)}`);
    assert.ok(Math.max(...wide.tops) - Math.min(...wide.tops) < .1, 'all three wide inputs share one top alignment');
    await assertMaximumDigitsFit(page);
    if (engine === 'webkit') await panel(page).screenshot({ path: resolve(captures, 'coordination-desktop.png') });
    const configure = panel(page).locator('[data-native-configure]');
    const summary = configure.locator('summary');
    // Native summary activation owns focus; reopening receives the same editor.
    await summary.focus(); await summary.press('Enter'); await expect(summary).toBeFocused();
    await summary.press('Enter'); await expect(summary).toBeFocused();
    await expect(input(page)).toHaveValue('45');
    await panel(page).locator('[data-native-trace] > summary').click();
    await input(page).focus();
    await assertFormContainerSeams(page);
    for (const width of [833, 832, 831, 390, 320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(input(page)).toBeFocused();
      await expect(input(page)).toHaveValue('45');
      await assertContained(page);
      await assertCompactControls(page);
      await assertMaximumDigitsFit(page);
      if ([1440, 390, 320].includes(width)) await assertInputPositionsThroughFeedback(page, engine === 'webkit' ? String(width) : null);
      if ([833, 832, 831].includes(width)) {
        const agreement = await panel(page).locator('.native-coordination__agreement').boundingBox();
        const configuration = await configure.boundingBox();
        if (width >= 832) {
          assert.ok(configuration.x >= agreement.x + agreement.width, 'wide agreement and editor share a reading row');
          assert.ok(Math.abs(configuration.y - agreement.y) < 2, 'the paired groups begin together');
        } else assert.ok(configuration.y >= agreement.y + agreement.height, 'the narrow editor follows the agreement in document order');
      }
      if (width === 320) {
        if (engine === 'webkit') await panel(page).screenshot({ path: resolve(captures, 'coordination-320.png') });
      }
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(input(page)).toBeFocused();
      await assertContained(page);
      await assertMaximumDigitsFit(page);
      await assertInputPositionsThroughFeedback(page, engine === 'webkit' ? `${width}-enlarged` : null);
      if (engine === 'webkit') await panel(page).screenshot({ path: resolve(captures,
        width === 390 ? 'coordination-enlarged.png' : 'coordination-320-enlarged.png') });
    }
    await page.setViewportSize({ width: 390, height: 1000 });
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
      { rejected: true, liveListeners: 0, disabled: true, settingsClosed: true,
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
