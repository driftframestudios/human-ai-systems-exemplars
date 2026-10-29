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
const controllerPath = '/collaboration/native-investment-studio/controller.mjs';
const statePath = '/collaboration/native-investment-studio/state.mjs';
const editingPath = '/collaboration/native-investment-studio/editing.mjs';
const captures = resolve(import.meta.dirname, '../../.visual-runs/native-investment');
let server, fixture, fullAbout;

before(async () => {
  await mkdir(captures, { recursive: true });
  const source = await readFile(resolve(import.meta.dirname, '../../context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  const objectSource = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  assert.equal(source.split(objectSource).length, 2);
  fullAbout = source.replace(objectSource, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
  const start = source.indexOf('<section class="about-field about-field--coordination"');
  const end = source.indexOf('<section class="about-field about-field--studio"', start);
  const prefixEnd = source.indexOf('<main id="main">') + '<main id="main">'.length;
  const frame = source.match(/<iframe\b[^>]*data-about-content-fit="studio-chapters"[\s\S]*?<\/iframe>/u)?.[0];
  const link = source.match(/<a href="\.\.\/\.\.\/collaboration\/initiative-costing-calculator\/index.html">[\s\S]*?<\/a>/u)?.[0];
  assert.ok(start > prefixEnd && end > start && frame && link);
  const prefix = source.slice(0, prefixEnd).replace(/<script\b[\s\S]*?<\/script>/gu,
    script => script.includes('collaboration/native-investment-studio/controller.mjs') ? script : '');
  // Keep the native integration and source-owned page styles. Other instruments
  // retain their own interaction suites; the final journey uses complete About.
  fixture = `${prefix}${source.slice(start, end)}<section>${frame}${link}</section>
    <div aria-hidden="true" style="height:1000px"></div></main></body></html>`;
  server = await startStaticServer();
  for (const name of names) browsers.set(name, await engines[name].launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

const root = page => page.locator('[data-native-coordination]');
const purpose = page => root(page).locator('[data-native-purpose]');
const field = (page, name) => purpose(page).locator(`[name="${name}"]`);
const chapter = (page, name) => root(page).locator(`[data-native-chapter="${name}"]`);
const investment = page => root(page).locator('[data-native-chapter-panel="investment"]');
const action = (page, name) => investment(page).locator(`[data-investment-action="${name}"]`);
const total = page => root(page).locator('[data-native-total]');
const work = (page, name) => root(page).locator(`[data-native-configure] input[name="${name}"]`);
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const bytes = page => page.evaluate(() => window.investmentFixture.studio.exportText());

async function open(t, engine, complete = false) {
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
  await page.evaluate(async ({ controllerPath, statePath, editingPath }) => {
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

async function downloadText(page) {
  const pending = page.waitForEvent('download');
  await action(page, 'download').click();
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
    words: [...element.querySelectorAll('.native-purpose button, .native-purpose summary, .native-investment button')]
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
    controls: [...element.querySelectorAll('.native-purpose :is(textarea,button,label,summary,p), .native-investment :is(button,input,select,label,p,h3,h4,dt,dd,li)')]
      .filter(node => node.getClientRects().length && !node.closest('[hidden]'))
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
  test(`${engine}: Purpose edits apply, cancel and recover saved text through the shared owner`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await purpose(page).locator('summary').click();
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
    await expect(purpose(page).locator('summary')).toBeFocused();
    assert.equal(JSON.parse(await bytes(page)).purpose.changedAbility, 'Share the decision');

    await purpose(page).locator('summary').click();
    await field(page, 'openConditions').fill('Choose a review date');
    await chapter(page, 'people').click();
    await expect(purpose(page)).not.toHaveAttribute('open', '');
    await expect(root(page).locator('[data-native-saved-count]')).toHaveText('1');
    await root(page).locator('[data-person-id="product-one"]').click();
    await root(page).locator('input[name="ratePerHour"]').fill('105');
    await root(page).locator('[data-person-action="apply"]').click();
    await expect(total(page)).toHaveText('$1,215.00');
    await purpose(page).locator('summary').click();
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
    await action(page, 'baseline').click();
    await expect(investment(page).locator('[data-investment-comparison]')).toContainText('Baseline total$1,200.00');
    await chapter(page, 'coordination').click();
    await work(page, 'minutesPerSession').fill('45');
    await root(page).locator('[data-action="apply"]').click();
    await expect(total(page)).toHaveText('$1,800.00');
    await chapter(page, 'investment').click();
    await expect(investment(page).locator('[data-investment-comparison]')).toContainText('Change$600.00');
    await action(page, 'undo').click();
    await expect(total(page)).toHaveText('$1,200.00');
    await expect(action(page, 'undo')).toBeDisabled();
    await action(page, 'redo').click();
    await expect(total(page)).toHaveText('$1,800.00');
    await action(page, 'restore').click();
    await expect(total(page)).toHaveText('$1,200.00');
    await expect(investment(page).locator('[data-investment-comparison]')).toContainText('Change$0.00');
    const retained = await bytes(page);
    await investment(page).locator('[data-investment-preset]').selectOption('funded-working-sessions');
    await action(page, 'preset').click();
    await expect(investment(page).locator('#native-plan-preview-title')).toBeFocused();
    await expect(investment(page).locator('[data-investment-preview-total]')).toHaveText('Total: $1,200.00');
    await expect(investment(page).locator('[data-investment-changes]')).toContainText('funded time');
    assert.equal(await bytes(page), retained);
    await action(page, 'clear').click();
    await expect(investment(page).locator('[data-investment-preview]')).toBeHidden();
    await expect(action(page, 'preset')).toBeFocused();
    assert.equal(await bytes(page), retained);
    await action(page, 'preset').click();
    await action(page, 'apply').click();
    await expect(action(page, 'undo')).toBeFocused();
    await expect(root(page).locator('[data-native-funded]')).toHaveText('$1,200.00');
    await expect(root(page).locator('[data-native-additional]')).toHaveText('$0.00');
    await expect(root(page).locator('[data-native-allocated]')).toHaveText('$1,200.00');
    await action(page, 'undo').click();
    assert.equal(await bytes(page), retained);
  });

  test(`${engine}: saved files migrate explicitly, rejected files retain the plan, and downloads release their URLs`, { timeout: 45000 }, async t => {
    const page = await open(t, engine);
    await chapter(page, 'investment').click();
    const initial = await bytes(page);
    const legacy = JSON.parse(initial);
    delete legacy.purpose; legacy.schemaVersion = '0.1.0'; legacy.people[0].rateCentsPerHour = 12500;
    await investment(page).locator('[data-investment-file]').setInputFiles({ name: 'legacy-plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
    await expect(investment(page).locator('[data-investment-preview-total]')).toHaveText('Total: $1,275.00');
    await expect(investment(page).locator('[data-investment-changes]')).toContainText('Updated this file from format 0.1.0 to 0.2.0.');
    assert.equal(await bytes(page), initial);
    await action(page, 'apply').click();
    await expect(total(page)).toHaveText('$1,275.00');
    const accepted = await bytes(page);
    const admitted = JSON.parse(accepted);
    assert.equal(admitted.schemaVersion, '0.2.0');
    assert.deepEqual(Object.values(admitted.purpose), [null, null, null, null, null, null]);
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
    await expect(investment(page).locator('[data-investment-preset] option')).toHaveCount(2);
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
            element.querySelector('[data-investment-action="download"]').focus();
          } });
        }
        fixture.receiverLifecycle = {
          arm() { receiver?.dispose(); receiver = mount(true); },
          dispose() { receiver?.dispose(); editing.dispose(); },
        };
        fixture.receiverLifecycle.arm();
      }, editingPath);
      await action(page, 'baseline').click();
      await expect(investment(page).locator('[data-investment-status]')).toHaveText('Successor owns update 1.');
      await expect(action(page, 'download')).toBeFocused();
      assert.equal(await page.evaluate(() => window.investmentFixture.studio.readBaseline().projection.result.plannedCommitmentCents), 127500);
      await page.evaluate(() => {
        const fixture = window.investmentFixture;
        fixture.receiverLifecycle.arm();
        fixture.beforeSuccessorApply = fixture.studio.readAcceptance().sequence;
      });
      await investment(page).locator('[data-investment-preset]').selectOption('funded-working-sessions');
      await action(page, 'preset').click();
      await action(page, 'apply').click();
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
    await chapter(page, 'coordination').click();
    await work(page, 'minutesPerSession').fill('40');
    await page.evaluate(() => window.pendingPlanReads[2].finish());
    await chapter(page, 'investment').click();
    await expect(investment(page).locator('[data-investment-preview]')).toBeHidden();
    await expect(investment(page).locator('[data-investment-status]')).toContainText('plan or edits changed');
    assert.equal(await bytes(page), original);

    for (const [width, size] of [[1440, ''], [320, '200%']]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(value => { document.documentElement.style.fontSize = value; }, size);
      await frame(page);
      await investment(page).scrollIntoViewIfNeeded();
      await containment(page);
      await action(page, 'preset').focus();
      await expect(action(page, 'preset')).toBeFocused();
      await expect(action(page, 'preset')).toBeInViewport();
      await page.screenshot({ path: resolve(captures, `${engine}-${width}-investment.png`) });
      await purpose(page).locator('summary').click();
      await field(page, 'changedAbility').fill('Plan the next working session.');
      await field(page, 'changedAbility').scrollIntoViewIfNeeded();
      await containment(page);
      await expect(field(page, 'changedAbility')).toHaveAttribute('maxlength', '600');
      await page.screenshot({ path: resolve(captures, `${engine}-${width}-purpose.png`) });
      await purpose(page).locator('summary').click();
      await investment(page).locator('h3').scrollIntoViewIfNeeded();
      const box = await investment(page).boundingBox();
      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.move(box.x + Math.min(box.width / 2, 100), Math.max(250, Math.min(700, box.y + 20)));
      await page.mouse.wheel(0, 250);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100);
    }
    await expect(page.locator('iframe[data-about-content-fit="studio-chapters"]')).toHaveCount(1);
    await expect(page.locator('a[href="../../collaboration/initiative-costing-calculator/index.html"]')).toHaveCount(1);
    await expect(page.locator('table[data-label="Cross-Functional Investment Studio: static counterpart to the editable analysis"]')).toHaveCount(1);
  });
}
