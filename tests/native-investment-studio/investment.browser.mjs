import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createNativeAboutFixture } from './browser-fixture.mjs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { registerBrowserFixture } from './browser-fixture-lifecycle.mjs';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { startStaticServer, monitor, assertTelemetry } from '../../tools/core-architecture-browser-helper.mjs';

const engines = { chromium, firefox, webkit };
const names = process.env.NATIVE_STUDIO_BROWSER ? [process.env.NATIVE_STUDIO_BROWSER] : Object.keys(engines);
for (const name of names) assert.ok(Object.hasOwn(engines, name), `Unknown NATIVE_STUDIO_BROWSER: ${name}`);
const browsers = new Map();
const route = '/context-canvas-project-surface/context-canvas/index.html';
const controllerPath = '/collaboration/native-investment-studio/controller.mjs';
const statePath = '/collaboration/native-investment-studio/state.mjs';
const editingPath = '/collaboration/native-investment-studio/editing.mjs';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-investment');
let server, fixture, fullAbout;

registerBrowserFixture(async own => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const objectSource = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  assert.equal(source.split(objectSource).length, 2);
  fullAbout = source.replace(objectSource, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  fixture = createNativeAboutFixture(source, { tail: '<div aria-hidden="true" style="height:1000px"></div>' });
  server = await own(startStaticServer());
  for (const name of names) browsers.set(name, await own(engines[name].launch()));
});

const root = page => page.locator('[data-native-coordination]');
const purpose = page => root(page).locator('[data-native-purpose]');
const amp = (page, name) => root(page).locator(`[data-amp-panel="${name}"]`);
const editPurpose = page => purpose(page).locator('[data-purpose-action="edit"]').click();
const field = (page, name) => purpose(page).locator(`[name="${name}"]`);
const chapter = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const investment = page => root(page).locator('[data-native-chapter-panel="investment"]');
const action = (page, name) => investment(page).locator(`[data-investment-action="${name}"]`);
const loadDeck = (page, id) => investment(page).locator(`[data-investment-deck="${id}"]`).click();
async function performAction(page, name) {
  await loadDeck(page, ['undo', 'redo', 'baseline', 'restore'].includes(name) ? 'compare' : 'exchange');
  await action(page, name).click();
}
const total = page => root(page).locator('[data-native-total]');
const work = (page, name) => root(page).locator(`[data-native-configure] input[name="${name}"]`);
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const bytes = page => page.evaluate(() => window.investmentFixture.studio.exportText());

async function open(t, engine, complete = false, showcase = false) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const telemetry = monitor(page), requests = new Set();
  page.on('request', request => requests.add(request));
  page.on('requestfinished', request => requests.delete(request));
  page.on('requestfailed', request => requests.delete(request));
  const settle = () => expect.poll(() => requests.size).toBe(0);
  t.after(async () => {
    try { await settle(); assertTelemetry(telemetry); }
    finally { await context.close(); }
  });
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === route)
      return request.fulfill({ status: 200, contentType: 'text/html', body: complete ? fullAbout : fixture });
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' });
  });
  await page.goto(server.origin + route, { waitUntil: 'load' });
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
  await page.evaluate(() => document.fonts.ready);
  await expect(root(page)).toHaveAttribute('data-native-ready', 'true');
  if (!showcase) await page.evaluate(async ({ controllerPath, statePath, editingPath }) => {
    const { mountCoordinationPanel } = await import(controllerPath);
    const { createStudio } = await import(statePath);
    const { createDraftCoordinator } = await import(editingPath);
    const element = document.querySelector('[data-native-coordination]');
    mountCoordinationPanel(element).dispose();
    const studio = createStudio();
    window.investmentFixture = { studio, controller: mountCoordinationPanel(element, { studio }), editing: createDraftCoordinator(studio) };
  }, { controllerPath, statePath, editingPath });
  await settle();
  await frame(page);
  return page;
}

async function openSession(page) {
  const settings = root(page).locator('[data-native-configure]');
  if (!await settings.isVisible())
    await root(page).locator('.studio-session-tracks__name[data-studio-session-id="review"]:visible').click();
  await expect(settings).toBeVisible();
}

async function downloadText(page) {
  const pending = page.waitForEvent('download');
  await performAction(page, 'download');
  const download = await pending;
  assert.equal(download.suggestedFilename(), 'investment-plan.json');
  const stream = await download.createReadStream();
  assert.ok(stream);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.equal(await download.failure(), null);
  return Buffer.concat(chunks).toString('utf8');
}

async function containment(page) {
  const observation = await root(page).evaluate(element => ({
    viewport: document.documentElement.clientWidth,
    width: document.documentElement.scrollWidth,
    words: [...element.querySelectorAll('[data-amp-panel], .native-purpose button, .native-purpose summary, .native-investment button')]
      .filter(node => node.getClientRects().length && !node.closest('[hidden]'))
      .flatMap(node => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), observations = [];
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
          // The summary's accepted-purpose description has its own prose flow.
          if (text.parentElement.closest('svg, [data-purpose-summary]')) continue;
          for (const match of text.textContent.matchAll(/\S+/gu)) {
            const range = document.createRange();
            range.setStart(text, match.index); range.setEnd(text, match.index + match[0].length);
            observations.push({ word: match[0], lines: new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size });
          }
        }
        return observations;
      }),
    controls: [...element.querySelectorAll('[data-amp-panel], .native-purpose :is(textarea,button,label,summary,p,dt,dd), .native-investment :is(button,input,select,label,p,h3,h4,dt,dd,li)')]
      .filter(node => node.getClientRects().length && !node.closest('[hidden], .studio-tape-shelf'))
      .map(node => {
        const box = node.getBoundingClientRect();
        return { tag: node.localName, text: node.textContent.slice(0, 80), left: box.left, right: box.right };
      }),
  }));
  assert.ok(observation.width <= observation.viewport + 1, 'the page retains its viewport width');
  assert.ok(observation.controls.length > 10);
  assert.ok(observation.words.length > 5);
  for (const word of observation.words) assert.equal(word.lines, 1,
    `action labels retain whole words at ${observation.viewport}px: ${JSON.stringify(word)}`);
  for (const control of observation.controls) assert.ok(control.left >= -.5 && control.right <= observation.viewport + .5,
    `Purpose and Investment stay within the viewport: ${JSON.stringify({ width: observation.viewport, control })}`);
}

for (const engine of names) {
  test(`${engine}: Investment decks preserve accepted pricing and a pending plan while changing the loaded view`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    const initial = await bytes(page);
    await chapter(page, 'investment').click();
    const shelf = investment(page).locator('[data-investment-deck-shelf]');
    const panel = id => investment(page).locator(`[data-investment-deck-panel="${id}"]`);
    await expect(shelf.locator('[data-investment-deck]')).toHaveCount(3);
    await expect(shelf.locator('[data-investment-deck="plan"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(panel('plan')).toBeVisible();
    await expect(panel('plan').locator('[data-investment-plan-readings]')).toContainText('Accepted investment$1,200.00');
    await expect(panel('compare')).toBeHidden();
    const planKey = shelf.locator('[data-investment-deck="plan"]');
    await planKey.hover();
    const restingBox = await planKey.boundingBox();
    await page.mouse.down();
    try {
      assert.equal(await planKey.locator('.studio-tape-face__title').evaluate(node => getComputedStyle(node).color),
        'rgb(248, 241, 217)', 'the pressed VHS-C title keeps its light ink against the dark body');
      assert.deepEqual(await planKey.boundingBox(), restingBox, 'the illustrated face moves within a stationary hit target');
    } finally { await page.mouse.up(); }
    await shelf.locator('[data-investment-deck="compare"]').focus();
    await page.keyboard.press('Enter');
    await expect(panel('compare')).toBeVisible();
    await expect(panel('plan')).toBeHidden();
    await performAction(page, 'baseline');
    assert.equal(await bytes(page), initial, 'loading a deck and saving a baseline preserve accepted work and pricing');
    await loadDeck(page, 'exchange');
    await investment(page).locator('[data-investment-preset]').selectOption('discovery-alignment');
    await performAction(page, 'preset');
    await expect(investment(page).locator('[data-investment-preview-total]')).toHaveText('Total: $2,030.00');
    await loadDeck(page, 'plan');
    await expect(investment(page).locator('[data-investment-preview]')).toBeHidden();
    await loadDeck(page, 'exchange');
    await expect(investment(page).locator('[data-investment-preview-total]')).toHaveText('Total: $2,030.00');
    assert.equal(await bytes(page), initial, 'deck navigation retains the proposed replacement without accepting it');
    await performAction(page, 'apply');
    await expect(panel('compare')).toBeVisible();
    await expect(action(page, 'undo')).toBeFocused();
    await expect(shelf.locator('[data-investment-deck="plan"]')).toContainText('$2,030.00');
    await expect(investment(page).locator('[data-investment-comparison]')).toContainText('Change$830.00');
    await performAction(page, 'undo');
    assert.equal(await bytes(page), initial);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await loadDeck(page, 'plan');
      await investment(page).scrollIntoViewIfNeeded();
      const geometry = await investment(page).evaluate(element => {
        const library = element.querySelector('.studio-tape-shelf');
        return { page: document.documentElement.scrollWidth, viewport: innerWidth,
          shelf: library.clientWidth, content: library.scrollWidth,
          direction: getComputedStyle(library).display };
      });
      assert.ok(geometry.page <= geometry.viewport + 1, 'the local shelf preserves the page width');
      if (width === 390) assert.ok(geometry.content > geometry.shelf, 'ordinary phones retain a horizontal deck shelf');
      await page.screenshot({ path: resolve(captures, `${engine}-${width}-investment-decks.png`) });
      for (const id of ['compare', 'exchange']) {
        await loadDeck(page, id);
        await panel(id).scrollIntoViewIfNeeded();
        await expect(panel(id)).toBeVisible();
        await page.screenshot({ path: resolve(captures, `${engine}-${width}-investment-${id}.png`) });
      }
    }
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(shelf.locator('.studio-tape-face__reels').first()).toHaveCSS('display', 'none');
  });
  test(`${engine}: scenario report and collaboration brief carry accepted values while a purpose draft stays saved`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await page.setViewportSize({ width: 390, height: 844 });
    await chapter(page, 'investment').click();
    await loadDeck(page, 'exchange');
    await investment(page).locator('[data-investment-preset]').selectOption('discovery-alignment');
    await performAction(page, 'preset');
    await expect(total(page)).toHaveText('$1,200.00');
    await performAction(page, 'apply');
    await expect(total(page)).toHaveText('$2,030.00');
    const accepted = await bytes(page);
    await amp(page, 'purpose').click(); await editPurpose(page);
    await field(page, 'changedAbility').fill('Unfinished visitor purpose');
    await chapter(page, 'investment').click();
    await loadDeck(page, 'exchange');
    const reports = investment(page).locator('[data-studio-reports]');
    const reportButton = reports.getByRole('button', { name: 'Download report', exact: true });
    await page.evaluate(() => {
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      window.reportDownloads = { created: [], revoked: [] };
      URL.createObjectURL = blob => {
        const url = create(blob); window.reportDownloads.created.push({ url, type: blob.type }); return url;
      };
      URL.revokeObjectURL = url => { window.reportDownloads.revoked.push(url); revoke(url); };
    });
    for (const unsupported of ['constructor', 'json', 'not-a-format']) {
      await reportButton.evaluate((button, value) => { button.dataset.studioReport = value; }, unsupported);
      await reportButton.click();
    }
    assert.deepEqual(await page.evaluate(() => window.reportDownloads.created), [],
      'unsupported, inherited and unoffered fields create no download');
    await reportButton.evaluate(button => { button.dataset.studioReport = 'html'; });
    const captured = {};
    for (const [kind, filename] of [['html', 'discovery-alignment-report.html'], ['capsule', 'discovery-alignment-brief.txt']]) {
      const pending = page.waitForEvent('download');
      await investment(page).locator(`[data-studio-report="${kind}"]`).click();
      const download = await pending, chunks = [];
      assert.equal(await download.failure(), null);
      for await (const chunk of await download.createReadStream()) chunks.push(chunk);
      captured[kind] = Buffer.concat(chunks).toString('utf8');
      assert.equal(download.suggestedFilename(), filename);
      assert.ok(!captured[kind].includes('Unfinished visitor purpose'));
    }
    const successful = await page.evaluate(() => window.reportDownloads);
    assert.deepEqual(successful.created.map(row => row.type), ['text/html;charset=utf-8', 'text/plain;charset=utf-8']);
    assert.deepEqual(successful.revoked, [successful.created[0].url]);
    await expect(reports.getByRole('status')).toHaveText(`Prepared the accepted plan at revision ${JSON.parse(accepted).revision} for download.`);
    await page.evaluate(() => {
      window.originalReportClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.download && this.href.startsWith('blob:')) throw new Error('Controlled report dispatch failure');
        return window.originalReportClick.call(this);
      };
    });
    try {
      await reportButton.click();
      await expect(reports.getByRole('status')).toHaveText('The download could not be prepared. Try again from the accepted plan.');
    } finally {
      await page.evaluate(() => { HTMLAnchorElement.prototype.click = window.originalReportClick; });
    }
    const afterFailure = await page.evaluate(() => window.reportDownloads);
    assert.deepEqual(afterFailure.revoked, [successful.created[0].url, afterFailure.created[2].url],
      'the failed request releases its own URL and retains the preceding successful download');
    await expect(reports.locator('a[download]')).toHaveCount(0);
    assert.ok(captured.capsule.endsWith(`${accepted}\n`));
    const report = await page.context().newPage();
    await report.setViewportSize({ width: 390, height: 844 });
    await report.setContent(captured.html);
    await expect(report.locator('header')).toContainText('$2,030.00');
    await expect(report.locator('pre')).toHaveText(accepted);
    assert.equal(await report.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const ledger = report.getByRole('region', { name: 'Work line attribution · USD', exact: true });
    await ledger.focus(); await expect(ledger).toBeFocused(); await ledger.press('End');
    await report.screenshot({ path: resolve(captures, `${engine}-report-390.png`) });
    await report.close();
    await amp(page, 'purpose').click();
    await expect(field(page, 'changedAbility')).toHaveValue('Unfinished visitor purpose');
    assert.equal(await bytes(page), accepted);
    const released = await page.evaluate(() => {
      const button = document.querySelector('[data-studio-report="html"]');
      window.investmentFixture.controller.dispose(); window.investmentFixture.controller.dispose(); button.click();
      return window.reportDownloads;
    });
    assert.deepEqual([...released.revoked].sort(), released.created.map(row => row.url).sort(),
      'idempotent root disposal releases each owned report URL and removes its action listener');
  });
  test(`${engine}: authored showcase changes examples in place, previews four longer reviews, compares and recovers`, { timeout: 45000 }, async t => {
    const page = await open(t, engine, false, true);
    const score = root(page).locator('[data-native-score]');
    const reviewSession = async () => {
      await score.locator('[data-cadence-key="track-work:review"]').click();
      await expect(root(page).locator('[data-rack-editor-kind]')).toBeVisible();
      await expect(work(page, 'minutesPerSession')).toBeEditable();
    };
    const readiness = async () => {
      await root(page).locator('[data-template-rack] [data-studio-record-kind="connection"][data-studio-record-id="readiness"]').click();
    };
    await expect(chapter(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(score.locator('.native-cadence__period')).toHaveCount(4);
    await expect(root(page).locator('[data-native-workspace="session"]')).not.toHaveAttribute('open', '');
    await expect(root(page).locator('section[data-native-workspace="connection"]')).toBeVisible();
    await expect(total(page)).toHaveText('$3,980.00');
    await expect(root(page).locator('[data-native-funded]')).toHaveText('$2,840.00');
    await expect(root(page).locator('[data-native-additional]')).toHaveText('$1,140.00');
    await expect(root(page).locator('[data-native-allocated]')).toHaveText('$1,480.00');
    await score.getByRole('button', { name: 'Two-quarter rollout', exact: true }).click();
    await expect(chapter(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(score.locator('.native-cadence__period')).toHaveCount(2);
    await expect(score.locator('[data-cadence-basis][value="quarter"]')).toBeChecked();
    await score.getByRole('button', { name: 'Four-sprint pilot', exact: true }).click();
    await expect(chapter(page, 'coordination')).toHaveAttribute('aria-selected', 'true');
    await expect(score.locator('.native-cadence__period')).toHaveCount(4);
    await expect(score.locator('[data-cadence-basis][value="sprint"]')).toBeChecked();
    await expect(total(page)).toHaveText('$3,980.00');
    await expect(work(page, 'occurrences')).toHaveValue('4');
    await chapter(page, 'investment').click(); await performAction(page, 'baseline');
    await chapter(page, 'coordination').click(); await reviewSession();
    await work(page, 'minutesPerSession').fill('45');
    await expect(root(page).locator('[data-native-preview-total]')).toHaveText('$4,350.00');
    await expect(total(page)).toHaveText('$3,980.00');
    await readiness();
    await expect(root(page).locator('[data-native-saved-count]')).toHaveText('1');
    await expect(total(page)).toHaveText('$3,980.00');
    await reviewSession();
    await expect(work(page, 'minutesPerSession')).toHaveValue('45');
    await expect(root(page).locator('[data-native-preview-total]')).toHaveText('$4,350.00');
    await root(page).locator('[data-action="apply"]').click();
    await expect(total(page)).toHaveText('$4,350.00');
    await chapter(page, 'investment').click();
    await expect(investment(page).locator('[data-investment-comparison]')).toContainText('Baseline total$3,980.00');
    await expect(investment(page).locator('[data-investment-comparison]')).toContainText('Change$370.00');
    const accepted = JSON.parse(await downloadText(page));
    assert.equal(accepted.planId, 'service-request-pilot');
    assert.deepEqual(accepted.work.find(row => row.id === 'review').personIds, ['maya', 'ari', 'noor']);
    assert.equal(accepted.work.find(row => row.id === 'review').minutesPerOccurrence, 45);
    await performAction(page, 'undo');
    await expect(total(page)).toHaveText('$3,980.00');
    await performAction(page, 'redo');
    await expect(total(page)).toHaveText('$4,350.00');
    await chapter(page, 'coordination').click();
    await readiness();
    const connection = root(page).locator('[data-connection-configure]');
    await expect(connection.locator('[name="sharedObject"]')).toHaveValue('Prototype, acceptance evidence and exception log');
    await expect(connection.locator('[name="receiverPersonId"]')).toHaveValue('noor');
    await connection.locator('[name="status"]').selectOption('paused');
    await connection.locator('[data-connection-apply]').click();
    await expect(total(page)).toHaveText('$4,350.00');
    await chapter(page, 'investment').click();
    const reviewed = JSON.parse(await downloadText(page));
    assert.equal(reviewed.connections.find(row => row.id === 'readiness').status, 'paused');
    assert.deepEqual(reviewed.connections.find(row => row.id === 'readiness').workIds, ['review', 'rehearsal']);
  });

  test(`${engine}: concise replacement confirmation preserves accepted records until Apply or Cancel`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    const before = await bytes(page);
    await chapter(page, 'investment').click();
    await loadDeck(page, 'exchange');
    await investment(page).locator('[data-investment-preset]').selectOption('service-request-pilot');
    await performAction(page, 'preset');
    const changes = investment(page).locator('[data-investment-changes]');
    await expect(changes).toContainText('Service request pilot');
    await expect(changes).toContainText('4 sprints.');
    await expect(changes).toContainText('This replaces the current plan. Undo restores it.');
    await expect(changes.locator('li')).toHaveCount(0);
    assert.equal(await bytes(page), before);
    await performAction(page, 'apply');
    await expect(total(page)).toHaveText('$3,980.00');
    const pilot = await bytes(page), revised = JSON.parse(pilot);
    revised.contributions[0].receiverPersonId = 'noor';
    revised.connections.find(row => row.id === 'readiness').status = 'paused';
    await loadDeck(page, 'exchange');
    await investment(page).locator('[data-investment-file]').setInputFiles({ name: 'review-plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(revised)) });
    await expect(changes).toContainText('This replaces the current plan. Undo restores it.');
    await expect(action(page, 'apply')).toBeEnabled();
    assert.equal(await bytes(page), pilot);
    await performAction(page, 'clear');
    await loadDeck(page, 'exchange');
    await investment(page).locator('[data-investment-preset]').selectOption('shared-working-sessions');
    await performAction(page, 'preset');
    await expect(changes).toContainText('This replaces the current plan. Undo restores it.');
    assert.equal(await bytes(page), pilot);
    await expect(total(page)).toHaveText('$3,980.00');
    await performAction(page, 'clear');
    await performAction(page, 'undo');
    assert.equal(await bytes(page), before);
  });

  test(`${engine}: arrangement import and detachment retain structure and recover through baseline and Undo`, { timeout: 45000 }, async t => {
    const page = await open(t, engine), before = await bytes(page);
    await chapter(page, 'investment').click(); await performAction(page, 'baseline');
    const proposed = await page.evaluate(async () => {
      const { prepareCoordinationTemplate } = await import('/collaboration/native-investment-studio/connection-templates.mjs');
      return prepareCoordinationTemplate(window.investmentFixture.studio.read(), { templateId: 'pod', version: '1.0.0', proposalId: 'review-pod',
        teams: [{ slotId: 'pod', kind: 'existing', teamId: 'delivery', addPersonIds: [] },
          { slotId: 'partner', kind: 'new', label: 'Reviewing team', personIds: ['product-one'] }],
        connections: ['handoff', 'feedback'].map(slotId => ({ slotId, receiverPersonId: 'product-one', sharedObject: 'Pilot plan',
          responseExpectation: 'Review before proceeding.', workIds: ['review'], status: 'active', recoveryWork: null })) }).projection.serialized;
    });
    const upload = async text => { await loadDeck(page, 'exchange'); await investment(page).locator('[data-investment-file]').setInputFiles({ name: 'arranged-plan.json', mimeType: 'application/json', buffer: Buffer.from(text) }); };
    const changes = investment(page).locator('[data-investment-changes]'), comparison = investment(page).locator('[data-investment-comparison]');
    await upload(proposed);
    await expect(changes).toContainText('This replaces the current plan. Undo restores it.');
    assert.equal(await bytes(page), before); await expect(total(page)).toHaveText('$1,200.00');
    await performAction(page, 'apply');
    const accepted = await bytes(page);
    assert.deepEqual(JSON.parse(accepted).arrangements, JSON.parse(proposed).arrangements);
    await expect(comparison).toContainText('Change$0.00');
    const detached = JSON.parse(accepted); detached.arrangements = [];
    await upload(JSON.stringify(detached));
    await expect(changes).toContainText('This replaces the current plan. Undo restores it.');
    assert.equal(await bytes(page), accepted);
    await performAction(page, 'apply');
    const after = JSON.parse(await bytes(page)), prior = JSON.parse(accepted);
    assert.deepEqual(after.arrangements, []);
    for (const key of ['people', 'teams', 'work', 'connections']) assert.deepEqual(after[key], prior[key]);
    await expect(total(page)).toHaveText('$1,200.00');
    await performAction(page, 'undo'); assert.equal(await bytes(page), accepted);
  });

  test(`${engine}: Purpose edits apply, cancel and recover saved text through the shared owner`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    const initial = await bytes(page);
    const railPosition = () => root(page).locator('[data-amp-panel]').evaluateAll(buttons => buttons.map(button => { const box = button.getBoundingClientRect(); return { x: box.x, y: box.y + window.scrollY, width: box.width, height: box.height }; }));
    const closedRail = await railPosition();
    await amp(page, 'purpose').click();
    await expect(amp(page, 'purpose')).toHaveAttribute('aria-expanded', 'true');
    await expect(purpose(page).locator('[data-purpose-reading]')).toBeVisible();
    await expect(purpose(page).locator('form')).toBeHidden();
    assert.equal(await bytes(page), initial);
    assert.deepEqual(await railPosition(), closedRail);
    await amp(page, 'manual').click();
    await expect(amp(page, 'purpose')).toHaveAttribute('aria-expanded', 'false');
    await expect(amp(page, 'manual')).toHaveAttribute('aria-expanded', 'true');
    await expect(root(page).locator('#native-amp-manual .native-manual__reading')).toBeVisible();
    assert.deepEqual(await railPosition(), closedRail);
    await amp(page, 'purpose').click(); await expect(amp(page, 'manual')).toHaveAttribute('aria-expanded', 'false');
    await editPurpose(page);
    await expect(field(page, 'changedAbility')).toBeEditable();
    await field(page, 'changedAbility').fill('  Share the decision  ');
    await field(page, 'accountableOwner').fill('Delivery lead');
    await expect(total(page)).toHaveText('$1,200.00');
    assert.equal(JSON.parse(await bytes(page)).purpose.changedAbility, null);
    await purpose(page).getByRole('button', { name: 'Apply purpose', exact: true }).click();
    await expect(purpose(page)).toHaveAttribute('open', '');
    await expect(purpose(page).locator('[data-purpose-summary]')).toHaveText('Share the decision');
    assert.equal(JSON.parse(await bytes(page)).purpose.accountableOwner, 'Delivery lead');
    await field(page, 'changedAbility').fill('Cancelled wording');
    await purpose(page).getByRole('button', { name: 'Cancel changes', exact: true }).click();
    await expect(purpose(page)).not.toHaveAttribute('open', '');
    await expect(amp(page, 'purpose')).toBeFocused();
    await expect(amp(page, 'purpose')).toHaveAttribute('aria-expanded', 'false');
    assert.equal(JSON.parse(await bytes(page)).purpose.changedAbility, 'Share the decision');

    await amp(page, 'purpose').click(); await editPurpose(page);
    await field(page, 'openConditions').fill('Choose a review date');
    await chapter(page, 'people').click();
    await expect(purpose(page)).not.toHaveAttribute('open', '');
    await expect(root(page).locator('[data-native-saved-count]')).toHaveText('1');
    await root(page).locator('[data-team-roster] [data-person-id="product-one"]').click();
    await root(page).locator('[data-person-configure] input[name="ratePerHour"]').fill('105');
    await root(page).locator('[data-person-action="apply"]').click();
    await expect(total(page)).toHaveText('$1,215.00');
    await amp(page, 'saved').click(); await expect(amp(page, 'saved')).toHaveAttribute('aria-expanded', 'true');
    await root(page).locator('[data-native-saved-list] [data-saved-open]').click();
    await expect(amp(page, 'purpose')).toHaveAttribute('aria-expanded', 'true');
    await expect(field(page, 'openConditions')).toHaveValue('Choose a review date');
    await expect(field(page, 'openConditions')).toBeDisabled();
    await expect(purpose(page).locator('[data-purpose-recovery]')).toBeVisible();
    await purpose(page).locator('[data-purpose-action="review"]').click();
    await expect(field(page, 'changedAbility')).toBeFocused();
    await expect(field(page, 'openConditions')).toBeEditable();
    assert.equal(JSON.parse(await bytes(page)).purpose.openConditions, null);
    await purpose(page).getByRole('button', { name: 'Apply purpose', exact: true }).click();
    assert.equal(JSON.parse(await bytes(page)).purpose.openConditions, 'Choose a review date');
    await expect(total(page)).toHaveText('$1,215.00');
  });

  test(`${engine}: baseline, Undo/Redo and starting-plan preview retain distinct accepted amounts`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await chapter(page, 'investment').click();
    await expect(action(page, 'undo')).toBeDisabled();
    await expect(investment(page).locator('[data-investment-trace]')).toHaveCount(0);
    await performAction(page, 'baseline');
    await expect(investment(page).locator('[data-investment-comparison]')).toContainText('Baseline total$1,200.00');
    await chapter(page, 'coordination').click(); await openSession(page);
    await work(page, 'minutesPerSession').fill('45');
    await root(page).locator('[data-action="apply"]').click();
    await expect(total(page)).toHaveText('$1,800.00');
    await chapter(page, 'investment').click();
    await expect(investment(page).locator('[data-investment-comparison]')).toContainText('Change$600.00');
    await performAction(page, 'undo');
    await expect(total(page)).toHaveText('$1,200.00');
    await expect(action(page, 'undo')).toBeDisabled();
    await performAction(page, 'redo');
    await expect(total(page)).toHaveText('$1,800.00');
    await performAction(page, 'restore');
    await expect(total(page)).toHaveText('$1,200.00');
    await expect(investment(page).locator('[data-investment-comparison]')).toContainText('Change$0.00');
    const retained = await bytes(page);
    await loadDeck(page, 'exchange');
    await investment(page).locator('[data-investment-preset]').selectOption('funded-working-sessions');
    await performAction(page, 'preset');
    await expect(investment(page).locator('#native-plan-preview-title')).toBeFocused();
    await expect(investment(page).locator('[data-investment-preview-total]')).toHaveText('Total: $1,200.00');
    await expect(investment(page).locator('[data-investment-changes]')).toContainText('funded hours per person.');
    assert.equal(await bytes(page), retained);
    await performAction(page, 'clear');
    await expect(investment(page).locator('[data-investment-preview]')).toBeHidden();
    await expect(action(page, 'preset')).toBeFocused();
    assert.equal(await bytes(page), retained);
    await performAction(page, 'preset');
    await performAction(page, 'apply');
    await expect(action(page, 'undo')).toBeFocused();
    await expect(root(page).locator('[data-native-funded]')).toHaveText('$1,200.00');
    await expect(root(page).locator('[data-native-additional]')).toHaveText('$0.00');
    await expect(root(page).locator('[data-native-allocated]')).toHaveText('$1,200.00');
    await performAction(page, 'undo');
    assert.equal(await bytes(page), retained);
  });

  test(`${engine}: saved files migrate explicitly, rejected files retain the plan, and downloads release their URLs`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await chapter(page, 'investment').click();
    const initial = await bytes(page);
    const legacy = JSON.parse(initial);
    delete legacy.purpose; delete legacy.contributions; delete legacy.connections;
    delete legacy.abilities; delete legacy.capabilityEvidence; delete legacy.changeSettings; delete legacy.assuranceSettings; delete legacy.scoreSettings; delete legacy.arrangements;
    legacy.practices = legacy.practices.map(row => ({ id: row.id, practiceId: row.definitionId,
      teamId: row.teamId, workIds: [...new Set(row.supportBindings.flatMap(binding => binding.workIds))] }));
    for (const person of legacy.people) { delete person.role; delete person.lifecycle; delete person.availability; }
    for (const row of [...legacy.teams, ...legacy.work]) delete row.lifecycle;
    for (const row of legacy.work) row.timing = null;
    legacy.schemaVersion = '0.1.0'; legacy.people[0].rateCentsPerHour = 12500;
    await loadDeck(page, 'exchange');
    await investment(page).locator('[data-investment-file]').setInputFiles({ name: 'legacy-plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
    await expect(investment(page).locator('[data-investment-preview-total]')).toHaveText('Total: $1,275.00');
    await expect(investment(page).locator('[data-investment-changes]')).toContainText('Updated this file from format 0.1.0 to 0.9.0.');
    assert.equal(await bytes(page), initial);
    await performAction(page, 'apply');
    await expect(total(page)).toHaveText('$1,275.00');
    const accepted = await bytes(page);
    const admitted = JSON.parse(accepted);
    assert.equal(admitted.schemaVersion, '0.9.0');
    assert.deepEqual(Object.values(admitted.purpose), [null, null, null, null, null, null]);
    await loadDeck(page, 'exchange');
    await investment(page).locator('[data-investment-file]').setInputFiles({ name: 'incomplete.json', mimeType: 'application/json', buffer: Buffer.from('{"unfinished":') });
    await expect(investment(page).locator('[data-investment-status]')).toContainText('complete JSON plan');
    await expect(investment(page).locator('[data-investment-preview]')).toBeHidden();
    assert.equal(await bytes(page), accepted);
    await page.evaluate(() => {
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      window.downloadUrls = { created: [], revoked: [] };
      URL.createObjectURL = blob => { const url = create(blob); window.downloadUrls.created.push(url); return url; };
      URL.revokeObjectURL = url => { window.downloadUrls.revoked.push(url); revoke(url); };
    });
    assert.equal(await downloadText(page), accepted);
    assert.equal(await downloadText(page), accepted);
    assert.deepEqual(await page.evaluate(() => ({ created: window.downloadUrls.created.length, revoked: window.downloadUrls.revoked.length })), { created: 2, revoked: 1 });
    await page.evaluate(async ({ controllerPath, editingPath }) => {
      const fixture = window.investmentFixture, element = document.querySelector('[data-native-coordination]');
      fixture.controller.dispose();
      fixture.retained = fixture.studio.read();
      if (window.downloadUrls.created.some(url => !window.downloadUrls.revoked.includes(url))) throw new Error('Disposal releases every owned download URL.');
      const { mountCoordinationPanel } = await import(controllerPath);
      const { createDraftCoordinator } = await import(editingPath);
      fixture.controller = mountCoordinationPanel(element, { studio: fixture.studio });
      fixture.editing = createDraftCoordinator(fixture.studio);
    }, { controllerPath, editingPath });
    await chapter(page, 'investment').click();
    assert.deepEqual(await investment(page).locator('[data-investment-preset] option').evaluateAll(options => options.map(option => option.value)),
      ['service-request-pilot', 'service-request-rollout', 'discovery-alignment', 'data-platform-migration', 'regulated-workflow', 'ai-assisted-product', 'enterprise-integration', 'operational-modernization', 'shared-working-sessions', 'funded-working-sessions']);
    await expect(total(page)).toHaveText('$1,275.00');
    assert.equal(await bytes(page), accepted);
    assert.equal(await page.evaluate(() => window.investmentFixture.studio.read() === window.investmentFixture.retained), true);
    assert.deepEqual(await page.evaluate(() => window.downloadUrls.created.every(url => window.downloadUrls.revoked.includes(url))), true);

    // A receiver callback can hand the same DOM to a successor synchronously.
    // The completed history/apply action belongs to the old owner; the new
    // receiver keeps its own status and focus after that handoff returns.
    try {
      await page.evaluate(async editingPath => {
        const { mountInvestmentPanel } = await import('/collaboration/native-investment-studio/investment-controller.mjs');
        const { createDraftCoordinator } = await import(editingPath);
        const fixture = window.investmentFixture;
        fixture.controller.dispose();
        const editing = createDraftCoordinator(fixture.studio);
        const element = document.querySelector('[data-native-chapter-panel="investment"]');
        let receiver = null, handoffs = 0;
        function mount(replaceDuringChange) {
          return mountInvestmentPanel(element, { studio: fixture.studio, editing, onChange() {
            if (!replaceDuringChange) return;
            receiver.dispose();
            receiver = mount(false);
            handoffs++;
            element.querySelector('[data-investment-status]').textContent = `Successor owns update ${handoffs}.`;
            receiver.selectDeck('exchange');
            element.querySelector('[data-investment-action="download"]').focus();
          } });
        }
        fixture.receiverLifecycle = {
          arm() { receiver?.dispose(); receiver = mount(true); },
          dispose() { receiver?.dispose(); editing.dispose(); },
        };
        fixture.receiverLifecycle.arm();
      }, editingPath);
      await performAction(page, 'baseline');
      await expect(investment(page).locator('[data-investment-status]')).toHaveText('Successor owns update 1.');
      await expect(action(page, 'download')).toBeFocused();
      assert.equal(await page.evaluate(() => window.investmentFixture.studio.readBaseline().projection.result.plannedCommitmentCents), 127500);
      await page.evaluate(() => {
        const fixture = window.investmentFixture;
        fixture.receiverLifecycle.arm();
        fixture.beforeSuccessorApply = fixture.studio.readAcceptance().sequence;
      });
      await loadDeck(page, 'exchange');
    await investment(page).locator('[data-investment-preset]').selectOption('funded-working-sessions');
      await performAction(page, 'preset');
      await performAction(page, 'apply');
      await expect(investment(page).locator('[data-investment-status]')).toHaveText('Successor owns update 2.');
      await expect(action(page, 'download')).toBeFocused();
      assert.deepEqual(await page.evaluate(() => ({
        amount: window.investmentFixture.studio.read().result.plannedCommitmentCents,
        accepted: window.investmentFixture.studio.readAcceptance().sequence - window.investmentFixture.beforeSuccessorApply,
      })), { amount: 120000, accepted: 1 });
    } finally {
      await page.evaluate(() => window.investmentFixture.receiverLifecycle?.dispose());
    }
  });

  test(`${engine}: delayed file choices respect newer edits and the native controls preserve narrow About reading`, { timeout: 60000 }, async t => {
    const page = await open(t, engine, true);
    await chapter(page, 'investment').click();
    const original = await bytes(page);
    const makeFile = minutes => {
      const plan = JSON.parse(original); plan.work[0].minutesPerOccurrence = minutes;
      return { name: `session-${minutes}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) };
    };
    await page.evaluate(() => {
      window.pendingPlanReads = [];
      window.FileReader = class extends EventTarget {
        readAsArrayBuffer(file) { this.file = file; this.aborted = false; window.pendingPlanReads.push(this); }
        abort() { this.aborted = true; this.dispatchEvent(new Event('abort')); }
        async finish() { this.result = await this.file.arrayBuffer(); this.dispatchEvent(new Event('load')); }
      };
    });
    await loadDeck(page, 'exchange');
    const upload = investment(page).locator('[data-investment-file]');
    await upload.setInputFiles(makeFile(45));
    await expect(investment(page).locator('[data-investment-status]')).toHaveText('Reading the plan…');
    await upload.setInputFiles(makeFile(60));
    assert.equal(await page.evaluate(() => window.pendingPlanReads[0].aborted), true);
    await page.evaluate(() => window.pendingPlanReads[1].finish());
    await expect(investment(page).locator('[data-investment-preview-total]')).toHaveText('Total: $2,400.00');
    await page.evaluate(() => window.pendingPlanReads[0].finish());
    await expect(investment(page).locator('[data-investment-preview-total]')).toHaveText('Total: $2,400.00');
    assert.equal(await bytes(page), original);
    await upload.setInputFiles(makeFile(45));
    await chapter(page, 'coordination').click(); await openSession(page);
    await work(page, 'minutesPerSession').fill('40');
    await page.evaluate(() => window.pendingPlanReads[2].finish());
    await chapter(page, 'investment').click();
    await expect(investment(page).locator('[data-investment-preview]')).toBeHidden();
    await expect(investment(page).locator('[data-investment-status]')).toContainText('plan or edits changed');
    assert.equal(await bytes(page), original);

    for (const [width, size] of [[1440, '200%'], [390, '']]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(value => { document.documentElement.style.fontSize = value; }, size);
      await frame(page);
      await investment(page).scrollIntoViewIfNeeded();
      await containment(page);
      await action(page, 'preset').focus();
      await expect(action(page, 'preset')).toBeFocused();
      await expect(action(page, 'preset')).toBeInViewport();
      await page.screenshot({ path: resolve(captures, `${engine}-${width}-investment.png`) });
      await amp(page, 'purpose').click();
      await expect(purpose(page).locator('[data-purpose-reading]')).toBeVisible();
      await expect(purpose(page).locator('form')).toBeHidden();
      await containment(page); await editPurpose(page);
      await field(page, 'changedAbility').fill('Plan the next working session.');
      await field(page, 'changedAbility').scrollIntoViewIfNeeded();
      await containment(page);
      await expect(field(page, 'changedAbility')).toHaveAttribute('maxlength', '600');
      await page.screenshot({ path: resolve(captures, `${engine}-${width}-purpose.png`) });
      await amp(page, 'purpose').click();
      await investment(page).locator('h3').scrollIntoViewIfNeeded();
      const box = await investment(page).boundingBox();
      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.move(box.x + Math.min(box.width / 2, 100), Math.max(250, Math.min(700, box.y + 20)));
      await page.mouse.wheel(0, 250);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100);
    }
    await expect(page.locator('iframe[data-about-content-fit="studio-chapters"]')).toHaveCount(0);
    await expect(page.locator('a[href="../../collaboration/initiative-costing-calculator/index.html"]')).toHaveCount(1);
    await expect(page.locator('table[data-label="Cross-Functional Investment Studio: static counterpart to the editable analysis"]')).toHaveCount(1);
  });
  test(`${engine}: reading Purpose yields native-toggle callbacks to a newer receiver`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    const observed = await page.evaluate(async () => {
      const { mountPurposePanel } = await import('/collaboration/native-investment-studio/purpose-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.investmentFixture.controller.dispose(); window.investmentFixture.editing.dispose();
      const root = document.querySelector('[data-native-purpose]'), observations = [];
      for (const handoff of ['retire', 'successor']) {
        const studio = createStudio(), editing = createDraftCoordinator(studio);
        let receiver, successor, callbacks = 0, enter;
        const entered = new Promise(resolve => { enter = resolve; });
        receiver = mountPurposePanel(root, { studio, editing, onClose() {}, onChange() { callbacks += 1; }, onOpen() {
          receiver.dispose();
          if (handoff === 'successor') {
            successor = mountPurposePanel(root, { studio, editing, onOpen() {}, onClose() {}, onChange() {} });
            successor.open();
            editing.purpose.setText(editing.purpose.read().draft.token, 'changedAbility', 'The receiving editor owns this text.');
            successor.refresh(); root.querySelector('[name="accountableOwner"]').focus();
          }
          enter();
        } });
        root.open = true;
        await entered;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        observations.push({ handoff, callbacks, open: root.open, disabled: root.querySelector('fieldset').disabled,
          raw: editing.purpose.read().draft?.raw.changedAbility ?? null,
          focused: document.activeElement.name ?? null });
        successor?.dispose(); editing.dispose();
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      return observations;
    });
    assert.equal(observed[0].callbacks, 0); assert.equal(observed[0].open, false); assert.equal(observed[0].disabled, true);
    assert.deepEqual(observed[1], { handoff: 'successor', callbacks: 0, open: true, disabled: false,
      raw: 'The receiving editor owns this text.', focused: 'accountableOwner' });
  });

  test(`${engine}: Purpose receiver preserves successor focus, text and accepted publication`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    const observed = await page.evaluate(async () => {
      const { mountPurposePanel } = await import('/collaboration/native-investment-studio/purpose-controller.mjs');
      const { createStudio } = await import('/collaboration/native-investment-studio/state.mjs');
      const { createDraftCoordinator } = await import('/collaboration/native-investment-studio/editing.mjs');
      window.investmentFixture.controller.dispose(); window.investmentFixture.editing.dispose();
      const root = document.querySelector('[data-native-purpose]');
      const status = () => root.querySelector('[data-purpose-status]');
      const field = name => root.querySelector(`[name="${name}"]`);
      const form = () => root.querySelector('form');
      const observations = [];
      for (const handoff of ['successor', 'same-receiver']) {
        const studio = createStudio(), editing = createDraftCoordinator(studio);
        const options = { studio, editing, onOpen: () => editing.park(), onClose() {}, onChange() {} };
        let receiver = mountPurposePanel(root, options), successor;
        receiver.open();
        editing.purpose.setText(editing.purpose.read().draft.token, 'changedAbility', 'Discarded text'); receiver.refresh();
        root.querySelector('summary').addEventListener('focus', () => {
          if (handoff === 'successor') { receiver.dispose(); successor = mountPurposePanel(root, options); }
          (successor ?? receiver).open();
          editing.purpose.setText(editing.purpose.read().draft.token, 'changedAbility', 'Newer purpose text');
          (successor ?? receiver).refresh();
          status().textContent = 'The newer purpose stays.'; field('accountableOwner').focus();
        }, { once: true });
        root.querySelector('fieldset [data-purpose-action="cancel"]').click();
        observations.push({ handoff, status: status().textContent, focus: document.activeElement.name,
          raw: editing.purpose.read().draft?.raw.changedAbility, accepted: studio.read().state.purpose.changedAbility });
        successor?.dispose(); receiver.dispose(); editing.dispose();
      }
      for (const event of ['onOpen', 'onChange', 'onClose']) {
        const studio = createStudio(), editing = createDraftCoordinator(studio);
        let receiver, armed = false;
        const beginNewer = () => {
          if (!armed) return;
          armed = false; receiver.open();
          editing.purpose.setText(editing.purpose.read().draft.token, 'changedAbility', 'Newer callback text'); receiver.refresh();
          status().textContent = 'The callback owns this edit.'; field('accountableOwner').focus();
        };
        receiver = mountPurposePanel(root, { studio, editing,
          onOpen() { editing.park(); if (event === 'onOpen') beginNewer(); },
          onChange: event === 'onChange' ? beginNewer : () => {}, onClose: event === 'onClose' ? beginNewer : () => {} });
        if (event !== 'onOpen') {
          receiver.open(); editing.purpose.setText(editing.purpose.read().draft.token, 'changedAbility', 'Accepted purpose'); receiver.refresh();
        }
        armed = true;
        if (event === 'onOpen') receiver.open();
        else if (event === 'onChange') form().dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        else root.querySelector('fieldset [data-purpose-action="cancel"]').click();
        observations.push({ event, status: status().textContent, focus: document.activeElement.name,
          raw: editing.purpose.read().draft?.raw.changedAbility, accepted: studio.read().state.purpose.changedAbility, open: root.open });
        receiver.dispose(); editing.dispose();
      }
      const studio = createStudio();
      let receiver, armed = false, callbacks = 0;
      const facade = { ...studio, updatePurpose(...args) {
        const result = studio.updatePurpose(...args); if (armed) { armed = false; receiver.dispose(); } return result;
      } };
      const editing = createDraftCoordinator(facade);
      receiver = mountPurposePanel(root, { studio: facade, editing, onOpen() {}, onClose() {}, onChange: () => callbacks++ });
      receiver.open(); editing.purpose.setText(editing.purpose.read().draft.token, 'changedAbility', 'Accepted once'); receiver.refresh();
      callbacks = 0; armed = true; form().dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      observations.push({ operation: 'apply', callbacks, active: editing.read().active, accepted: studio.read().state.purpose.changedAbility,
        open: root.open, disabled: root.querySelector('fieldset').disabled });
      receiver.dispose(); editing.dispose();
      {
        const studio = createStudio(), editing = createDraftCoordinator(studio);
        let receiver, armed = false;
        receiver = mountPurposePanel(root, { studio, editing, onClose() {}, onChange() {}, onOpen() {
          if (!armed) return;
          armed = false;
          editing.purpose.setText(editing.purpose.read().draft.token, 'changedAbility', 'Newer raw text'); receiver.refresh();
          status().textContent = 'The current purpose edit stays.'; field('accountableOwner').focus();
        } });
        receiver.open(); const token = editing.purpose.read().draft.token;
        armed = true; receiver.open();
        observations.push({ operation: 'same-token-onOpen', sameToken: editing.purpose.read().draft.token === token,
          raw: editing.purpose.read().draft.raw.changedAbility, status: status().textContent, focus: document.activeElement.name,
          accepted: studio.read().state.purpose.changedAbility });
        receiver.dispose(); editing.dispose();
      }
      return observations;
    });
    assert.deepEqual(observed.slice(0, 2), ['successor', 'same-receiver'].map(handoff => ({ handoff,
      status: 'The newer purpose stays.', focus: 'accountableOwner', raw: 'Newer purpose text', accepted: null })));
    assert.deepEqual(observed.slice(2, 5), ['onOpen', 'onChange', 'onClose'].map(event => ({ event,
      status: 'The callback owns this edit.', focus: 'accountableOwner', raw: 'Newer callback text',
      accepted: event === 'onChange' ? 'Accepted purpose' : null, open: true })));
    assert.deepEqual(observed[5], { operation: 'apply', callbacks: 0, active: null, accepted: 'Accepted once', open: false, disabled: true });
    assert.deepEqual(observed[6], { operation: 'same-token-onOpen', sameToken: true, raw: 'Newer raw text',
      status: 'The current purpose edit stays.', focus: 'accountableOwner', accepted: null });
  });

}
