import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name));
const browsers = new Map(), route = '/context-canvas-project-surface/context-canvas/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-sessions');
let server, fixture, complete;
before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const object = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  assert.equal(source.split(object).length, 2);
  complete = source.replace(object, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  const start = source.indexOf('<section class="about-field about-field--coordination"');
  const end = source.indexOf('<section class="about-field about-field--studio"', start);
  const prefixEnd = source.indexOf('<main id="main">') + '<main id="main">'.length;
  assert.ok(start > prefixEnd && end > start);
  const prefix = source.slice(0, prefixEnd).replace(/<script\b[\s\S]*?<\/script>/gu,
    script => script.includes('collaboration/native-investment-studio/controller.mjs') ? script : '');
  fixture = `${prefix}${source.slice(start, end)}<div aria-hidden="true" style="height:1000px"></div></main></body></html>`;
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});
const root = page => page.locator('[data-native-coordination]');
const sessions = page => root(page).locator('[data-native-session-editor]');
const form = page => sessions(page).locator('[data-native-configure] form');
const field = (page, name) => form(page).locator(`[name="${name}"]`);
const action = (page, name) => sessions(page).locator(`[data-session-action="${name}"]`);
const legacy = (page, name) => sessions(page).locator(`[data-action="${name}"]`);
const select = page => sessions(page).locator('[data-native-session-select]');
const member = (page, id) => sessions(page).locator(`[data-session-person="${id}"]`);
const total = page => root(page).locator('[data-native-total]');
const tab = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const bytes = page => page.evaluate(() => window.sessionFixture.studio.exportText());
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function open(t, engine, full = false) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), telemetry = monitor(page), pending = new Set();
  page.on('request', request => pending.add(request));
  page.on('requestfinished', request => pending.delete(request));
  page.on('requestfailed', request => pending.delete(request));
  t.after(async () => {
    try { await expect.poll(() => pending.size).toBe(0); assertTelemetry(telemetry); }
    finally { await context.close(); }
  });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route)
      return request.fulfill({ status: 200, contentType: 'text/html', body: full ? complete : fixture });
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' });
  });
  await page.goto(server.origin + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  await page.evaluate(async () => {
    const { mountCoordinationPanel } = await import('/collaboration/native-investment-studio/controller.mjs');
    const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
    const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
    const element = document.querySelector('[data-native-coordination]');
    mountCoordinationPanel(element).dispose();
    const studio = createStudio();
    window.sessionFixture = { studio, controller: mountCoordinationPanel(element, { studio }), editing: createDraftCoordinator(studio) };
  });
  return page;
}

async function prepareSession(page) {
  await action(page, 'create').click();
  await field(page, 'label').fill('Planning together');
  await field(page, 'teamId').selectOption('delivery');
  await member(page, 'product-one').check();
  await member(page, 'product-two').check();
  await field(page, 'hoursPerSession').fill('1');
  await field(page, 'minutesPerSession').fill('0');
  await field(page, 'occurrences').fill('2');
}

for (const engine of names) {
  test(`${engine}: a complete session publishes once and reconciles participant, pause and funding choices`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await prepareSession(page);
    // Two people × $100/hour × one hour × two sessions adds $400.
    await expect(sessions(page).locator('[data-native-preview-total]')).toHaveText('$1,600.00');
    await expect(total(page)).toHaveText('$1,200.00');
    const before = await page.evaluate(() => window.sessionFixture.studio.readAcceptance().sequence);
    await legacy(page, 'apply').click();
    await expect(total(page)).toHaveText('$1,600.00');
    const added = await page.evaluate(() => window.sessionFixture.studio.read().state.work.at(-1));
    assert.deepEqual({ ...added, id: 'new-id' }, { id: 'new-id', label: 'Planning together', teamId: 'delivery',
      personIds: ['product-one', 'product-two'], minutesPerOccurrence: 60, occurrences: 2, funding: 'additional', status: 'planned', timing: null });
    assert.equal(await page.evaluate(() => window.sessionFixture.studio.readAcceptance().sequence), before + 1);
    await expect(legacy(page, 'apply')).toBeFocused();
    await field(page, 'status').selectOption('paused'); await legacy(page, 'apply').click();
    await expect(total(page)).toHaveText('$1,600.00');
    await expect(sessions(page).locator('[data-native-session-standing]')).toContainText('Paused');
    await page.evaluate(() => {
      const { studio, controller } = window.sessionFixture;
      for (const id of ['product-one', 'product-two']) {
        const person = studio.read().state.people.find(row => row.id === id);
        const result = studio.updatePerson(id, { ...person, fundedMinutes: 120 }, studio.read());
        if (!result.ok) throw Error(result.error.code);
      }
      controller.refresh();
    });
    await legacy(page, 'review').click();
    await field(page, 'funding').selectOption('allocated'); await legacy(page, 'apply').click();
    // $400 funded staffing + $1,200 original extra work; this session uses the funded pool.
    await expect(total(page)).toHaveText('$1,600.00');
    assert.equal(await page.evaluate(() => window.sessionFixture.studio.read().result.allocatedKnownCents), 40000);
    await page.evaluate(() => {
      const { studio, controller } = window.sessionFixture;
      const person = studio.read().state.people.find(row => row.id === 'product-one');
      const result = studio.updatePerson(person.id, { ...person, rateCentsPerHour: null }, studio.read());
      if (!result.ok) throw Error(result.error.code);
      controller.refresh();
    });
    // Three known original participants ($900) and one known funded person ($200).
    await expect(total(page)).toHaveText('$1,100.00');
    await expect(root(page).locator('[data-native-standing]')).toHaveText('Known total · USD');
  });

  test(`${engine}: session selection retains separate drafts through chapters and stale-plan review`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    await prepareSession(page); await legacy(page, 'apply').click();
    const newId = await select(page).inputValue();
    await select(page).selectOption('review'); await field(page, 'minutesPerSession').fill('45');
    await select(page).selectOption(newId); await field(page, 'label').fill('Revised planning name');
    await tab(page, 'people').click();
    await root(page).locator('[data-native-team-editor] [data-person-id="product-one"]').click();
    await root(page).locator('[data-person-configure] input[name="ratePerHour"]').fill('105');
    await root(page).locator('[data-person-action="apply"]').click();
    await expect(total(page)).toHaveText('$1,625.00');
    await tab(page, 'coordination').click();
    await expect(field(page, 'label')).toHaveValue('Revised planning name');
    await expect(root(page)).toHaveAttribute('data-native-state', 'stale');
    await legacy(page, 'review').click(); await legacy(page, 'apply').click();
    await select(page).selectOption('review');
    await expect(field(page, 'minutesPerSession')).toHaveValue('45');
    await expect(field(page, 'minutesPerSession')).toBeDisabled();
    await legacy(page, 'review').click();
    // Original: 4.5h × ($105 + 3 × $100) = $1,822.50; added: 2h × ($105 + $100) = $410.
    await expect(sessions(page).locator('[data-native-preview-total]')).toHaveText('$2,232.50');
    await legacy(page, 'apply').click(); await expect(total(page)).toHaveText('$2,232.50');
    await select(page).selectOption(newId);
    await expect(field(page, 'label')).toHaveValue('Revised planning name');
  });

  test(`${engine}: removal preserves references and empty plans can receive a new session`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const original = await bytes(page);
    await action(page, 'remove').click();
    await expect(sessions(page).locator('[data-native-session-dependencies]')).toContainText('Actively negotiate expectations');
    await expect(legacy(page, 'apply')).toBeDisabled(); assert.equal(await bytes(page), original);
    await legacy(page, 'cancel').click();
    await prepareSession(page); await legacy(page, 'apply').click();
    await action(page, 'remove').click(); await legacy(page, 'apply').click();
    await expect(total(page)).toHaveText('$1,200.00');
    await expect(select(page)).toBeFocused();
    await page.evaluate(() => {
      const { studio, controller } = window.sessionFixture;
      const plan = JSON.parse(studio.exportText()); plan.work = []; plan.practices = [];
      const result = studio.importText(JSON.stringify(plan), studio.read());
      if (!result.ok) throw Error(result.error.code);
      controller.refresh();
    });
    await expect(select(page)).toBeDisabled();
    await expect(action(page, 'create')).toBeEnabled();
    await prepareSession(page); await legacy(page, 'apply').click();
    await expect(total(page)).toHaveText('$400.00');
    await expect(select(page)).toBeEnabled();
    assert.equal(await page.evaluate(() => window.sessionFixture.studio.read().state.work.length), 1);
  });

  test(`${engine}: complete session settings retain compact controls, stable feedback and About scrolling`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true);
    await prepareSession(page);
    await sessions(page).screenshot({ path: resolve(captures, `${engine}-wide.png`) });
    for (const [width, enlarged] of [[768, false], [320, true]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(enlarged => { document.documentElement.style.fontSize = enlarged ? '200%' : ''; }, enlarged);
      await field(page, 'hoursPerSession').scrollIntoViewIfNeeded(); await frames(page);
      const geometry = await form(page).locator('input[inputmode]').evaluateAll(inputs => inputs.map(input => {
        const box = input.getBoundingClientRect(), css = getComputedStyle(input);
        const context = document.createElement('canvas').getContext('2d');
        context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        return { left: box.left, right: box.right, width: document.documentElement.clientWidth,
          content: box.width - parseFloat(css.borderLeftWidth) - parseFloat(css.borderRightWidth)
            - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight), digits: context.measureText('00000').width };
      }));
      assert.equal(geometry.length, 3);
      assert.ok(geometry.every(box => box.left >= -.5 && box.right <= box.width + .5 && box.content >= box.digits),
        `Five-digit controls stay in the ${width}px viewport: ${JSON.stringify(geometry)}`);
      const before = await field(page, 'occurrences').evaluate(input => input.getBoundingClientRect().top + scrollY);
      await field(page, 'minutesPerSession').fill('-1'); await frames(page);
      await expect(field(page, 'minutesPerSession')).toHaveAttribute('aria-invalid', 'true');
      assert.ok(Math.abs(await field(page, 'occurrences').evaluate(input => input.getBoundingClientRect().top + scrollY) - before) < 1);
      await field(page, 'minutesPerSession').fill('0');
    }
    const increment = sessions(page).locator('[data-field="hoursPerSession"][data-step="1"]');
    await increment.focus(); await page.keyboard.press('Enter');
    await expect(field(page, 'hoursPerSession')).toHaveValue('2');
    const inputBox = await field(page, 'hoursPerSession').boundingBox(), buttonBox = await increment.boundingBox();
    assert.ok(buttonBox.y >= inputBox.y + inputBox.height - 1);
    await sessions(page).screenshot({ path: resolve(captures, `${engine}-narrow.png`) });
    await field(page, 'label').scrollIntoViewIfNeeded();
    const box = await field(page, 'label').boundingBox(), before = await page.evaluate(() => scrollY);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
  });
}

for (const engine of names) {
  test(`${engine}: session receiver retirement preserves saved text and respects a successor editor's focus`, { timeout: 60000 }, async t => {
    const page = await open(t, engine);
    const observations = await page.evaluate(async () => {
      const { mountWorkPanel } = await import('/collaboration/native-investment-studio/work-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.sessionFixture.controller.dispose();
      const element = document.querySelector('[data-native-session-editor]');
      const studio = createStudio(), accepted = studio.read();
      let receiver, armed = false, callbacks = 0;
      const facade = { ...studio, previewWork(...args) {
        const result = studio.previewWork(...args);
        if (armed) { armed = false; receiver.dispose(); }
        return result;
      } };
      const editing = createDraftCoordinator(facade);
      receiver = mountWorkPanel(element, { studio: facade, editing, onEditing() { callbacks += 1; } });
      callbacks = 0; armed = true;
      const input = element.querySelector('[name="label"]');
      input.value = 'Retained during preview'; input.dispatchEvent(new Event('input', { bubbles: true }));
      // Retirement can release its exact lease after the synchronous coordinator
      // operation settles; the observer waits for that microtask boundary.
      await Promise.resolve();
      const retired = { callbacks, ready: element.hasAttribute('data-session-ready'),
        active: editing.read().active?.kind ?? null, disabled: element.querySelector('fieldset').disabled,
        preservedAccepted: studio.read() === accepted,
        retainedRaw: editing.read().parked.find(row => row.kind === 'session')?.raw.label ?? null };
      editing.dispose();

      const nextStudio = createStudio(), nextEditing = createDraftCoordinator(nextStudio);
      let completed = false, switched = false;
      const next = mountWorkPanel(element, { studio: nextStudio, editing: nextEditing,
        onAccepted() { completed = true; }, onEditing() {
          if (!completed) return;
          completed = false;
          switched = nextEditing.person.begin('product-one', nextStudio.read()).ok;
          element.querySelector('[data-session-action="create"]').focus();
        } });
      next.select('review');
      const minutes = element.querySelector('[name="minutesPerSession"]');
      minutes.value = '45'; minutes.dispatchEvent(new Event('input', { bubbles: true }));
      element.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      const successor = { switched, active: nextEditing.read().active?.kind ?? null,
        focusedAction: document.activeElement.dataset.sessionAction ?? document.activeElement.dataset.action ?? null,
        sessionStatus: nextEditing.session.read().status, total: nextStudio.read().result.knownCommitmentCents };
      next.dispose(); nextEditing.dispose();
      return { retired, successor };
    });
    assert.deepEqual(observations.retired, { callbacks: 0, ready: false, active: null, disabled: true,
      preservedAccepted: true, retainedRaw: 'Retained during preview' });
    assert.deepEqual(observations.successor, { switched: true, active: 'person', focusedAction: 'create',
      sessionStatus: 'idle', total: 180000 });
  });
}
