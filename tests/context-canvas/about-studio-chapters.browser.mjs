import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { expect } from '@playwright/test';
import { assertTelemetry, monitor } from '../../tools/core-architecture-browser-helper.mjs';
import { createAboutContentFitHarness, engines, fitted, wheelObservation, assertParentReading } from './about-content-fit-helper.mjs';

const chapters = ['coordination', 'plan', 'people', 'work', 'change-modeling', 'comparison'];
const chapterOwners = Object.freeze({
  coordination: ['horizon-title', 'lens-title'],
  plan: ['preset-title', 'shape-title', 'goal-title'],
  people: ['roles-title', 'staffing-title', 'collaboration-title'],
  work: ['activities-title', 'disruptions-title', 'sigma-title', 'quality-title'],
  'change-modeling': ['components-title', 'allocation-title', 'investment-changes-title', 'learning-title'],
  comparison: ['summary-title', 'method-title', 'investment-analysis-title'],
});
const fullStudio = '/collaboration/initiative-costing-calculator/index.html';
const captures = resolve(import.meta.dirname, '../../.visual-runs/about-studio-chapters');
// Independent arithmetic: 2 people × 10 h × 50% × $100 = $1,000;
// 3 tasks × 2 h × $100 = $600; 2 recoveries × 4 h × $100 = $800.
// Bounded complexity adds 8% ($192); the 8.6% planning spread brackets $2,592.
const expected = Object.freeze({ horizonHours: 10, people: 2, allocatedHours: 10,
  roleCost: 1000, activityHours: 6, activityCost: 600, disruptionHours: 8, disruptionCost: 800,
  qualityHours: 0, qualityCost: 0, unknownCost: 0, complexityCost: 192, central: 2592,
  spread: 0.086, low: 2369.088, high: 2814.912 });
let harness;
before(async () => { await mkdir(captures, { recursive: true }); harness = await createAboutContentFitHarness(); });
after(async () => { await harness?.close(); });
const session = (engine, options) => harness.session('studio-chapters', engine, options);
const field = (frame, kind, index, name) => frame.locator(`[data-kind="${kind}"][data-index="${index}"][data-field="${name}"]`);

async function assertChapter(frame, key) {
  assert.deepEqual(await frame.locator('button[data-studio-chapter]').evaluateAll(nodes => nodes.map(node => node.dataset.studioChapter)), chapters);
  assert.deepEqual(await frame.locator('button[data-studio-chapter][aria-pressed="true"]').evaluateAll(nodes => nodes.map(node => node.dataset.studioChapter)), [key], 'one selected chapter agrees with the requested reading');
  assert.deepEqual(await frame.locator('[data-studio-panel]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.studioPanel)), [key], 'one visible chapter agrees with the selected control');
  const button = frame.locator(`button[data-studio-chapter="${key}"]`);
  await expect(button).toHaveAttribute('aria-controls', `about-studio-panel-${key}`);
  assert.equal(await frame.locator('#band').count(), 1, 'the original live amount retains one DOM owner');
  await expect(frame.locator('.about-studio-overview #band')).toBeVisible();
}
async function assertChapterStructure(frame) {
  const observed = await frame.evaluate(ownerMap => Object.fromEntries(Object.entries(ownerMap)
    .map(([chapter, ids]) => [chapter, ids.map(id => {
      const node = document.getElementById(id);
      return { id, chapter: node?.closest('[data-studio-panel]')?.dataset.studioPanel ?? null };
    })])), chapterOwners);
  for (const [chapter, readings] of Object.entries(observed)) {
    assert.deepEqual(readings, chapterOwners[chapter].map(id => ({ id, chapter })), `${chapter} owns its complete card set`);
  }
  await expect(frame.locator('.lens-reading dt').first()).toHaveText('Important now');
  assert.equal(await frame.getByText('Load-bearing now', { exact: true }).count(), 0,
    'the interpretive lens uses its current visitor-facing label');
}
async function selectChapter(frame, key) {
  const button = frame.locator(`button[data-studio-chapter="${key}"]`);
  await button.focus(); await button.press('Enter');
  await assertChapter(frame, key); await expect(button).toBeFocused();
}
async function assertFocusReach(observation, target) {
  await expect(target).toBeFocused();
  await expect.poll(async () => {
    const box = await target.boundingBox();
    const navBottom = await observation.page.locator('.nav__top--sticky').evaluate(node => node.getBoundingClientRect().bottom);
    return !!box && box.y >= navBottom - 2 && box.y + box.height <= observation.page.viewportSize().height + 2;
  }, { message: 'the focused receiver remains visible within About below its navigation' }).toBe(true);
}
async function configureFixture(frame, chaptered) {
  const select = async key => { if (chaptered) await selectChapter(frame, key); };
  await select('plan');
  await frame.locator('[data-preset="1"]').click();
  await expect(frame.locator('[data-preset="1"]')).toHaveAttribute('aria-pressed', 'true');
  if (chaptered) {
    await expect(frame.locator('[data-studio-plan-name]')).toHaveText('Selected starting plan: Data / platform migration');
    await expect(frame.locator('.about-studio-overview .estimate-label')).toHaveText('Prospective planning band');
  }
  await frame.locator('#unit').selectOption('hours');
  await frame.locator('#horizon').fill('10');
  await frame.locator('#complexity').selectOption('bounded');
  await frame.locator('#unknowns').fill('0');
  await select('people');
  const roleCount = await frame.locator('[data-kind="role"][data-field="enabled"]').count();
  assert.ok(roleCount >= 2, 'the selected plan supplies a substantive staffing population');
  for (let index = 1; index < roleCount; index += 1) await field(frame, 'role', index, 'enabled').uncheck();
  await field(frame, 'role', 0, 'name').fill('Fixture delivery team');
  for (const [name, value] of [['a', '2'], ['b', '100'], ['c', '50']]) await field(frame, 'role', 0, name).fill(value);
  await select('work');
  for (const [kind, values] of [['activity', ['3', '2']], ['disruption', ['2', '4']]]) {
    const count = await frame.locator(`[data-kind="${kind}"][data-field="enabled"]`).count();
    assert.ok(count >= 1);
    for (let index = 1; index < count; index += 1) await field(frame, kind, index, 'enabled').uncheck();
    await field(frame, kind, 0, 'a').fill(values[0]); await field(frame, kind, 0, 'b').fill(values[1]);
  }
  await frame.locator('#quality-enabled').uncheck();
}
async function assertArithmetic(frame) {
  const result = await frame.evaluate(() => window.investmentStaffing.getResult());
  assert.equal(result.status, 'known');
  for (const [key, value] of Object.entries(expected)) assert.ok(Math.abs(result[key] - value) < 0.000001, `${key} matches independently calculated ${value}; observed ${result[key]}`);
  await expect(frame.locator('#band')).toHaveText('$2,369 – $2,815');
  await expect(frame.locator('#estimate-note')).toContainText('2 people · 3 tasks · 0 quality hours · 8 recovery hours · 10 horizon hours');
  return result;
}
async function assertWidth(frame) {
  const reading = await frame.evaluate(() => ({ chapter: document.documentElement.dataset.studioChapter, width: innerWidth, content: document.documentElement.scrollWidth,
    controls: [...document.querySelectorAll('button[data-studio-chapter], .about-studio-overview')].map(node => {
      const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, width: box.width };
    }) }));
  assert.ok(reading.content <= reading.width + 2, `${reading.chapter} has local horizontal ownership: ${reading.content}/${reading.width}`);
  assert.equal(reading.controls.length, 7);
  for (const box of reading.controls) assert.ok(box.width > 0 && box.left >= -1 && box.right <= reading.width + 1, 'summary and chapter controls fit the actual child viewport');
}

for (const engine of Object.keys(engines)) {
  test(`${engine}: Studio chapters retain edited planning state and independently calculated investment`, { timeout: 120000 }, async () => {
    const observation = await session(engine);
    try {
      await expect(observation.frame.locator('html')).toHaveAttribute('data-about-studio-chapters', 'ready');
      await fitted(observation); await assertChapter(observation.frame, 'coordination');
      await assertChapterStructure(observation.frame);
      await configureFixture(observation.frame, true); await assertArithmetic(observation.frame);
      const accepted = await observation.frame.evaluate(() => window.investmentStaffing.getState());
      for (const chapter of chapters) { await selectChapter(observation.frame, chapter); await fitted(observation); await assertArithmetic(observation.frame); }
      assert.deepEqual(await observation.frame.evaluate(() => window.investmentStaffing.getState()), accepted, 'chapter presentation preserves the accepted live staffing state');
      await selectChapter(observation.frame, 'people');
      await expect(field(observation.frame, 'role', 0, 'name')).toHaveValue('Fixture delivery team');
      await field(observation.frame, 'role', 0, 'c').fill('75');
      await expect(observation.frame.locator('#band')).toHaveText('$2,863 – $3,401');
      await selectChapter(observation.frame, 'work');
      await field(observation.frame, 'disruption', 0, 'b').fill('6');
      await expect(observation.frame.locator('#band')).toHaveText('$3,257 – $3,871');
      await selectChapter(observation.frame, 'people'); await expect(field(observation.frame, 'role', 0, 'c')).toHaveValue('75');
      await field(observation.frame, 'role', 0, 'c').fill('50');
      await selectChapter(observation.frame, 'work'); await expect(field(observation.frame, 'disruption', 0, 'b')).toHaveValue('6');
      await field(observation.frame, 'disruption', 0, 'b').fill('4');
      await selectChapter(observation.frame, 'plan'); await observation.frame.locator('#horizon').fill('');
      await expect(observation.frame.locator('#band')).toHaveText('Unavailable');
      await selectChapter(observation.frame, 'people'); await expect(field(observation.frame, 'role', 0, 'name')).toHaveValue('Fixture delivery team');
      await selectChapter(observation.frame, 'plan'); await observation.frame.locator('#horizon').fill('10');
      const variant = await assertArithmetic(observation.frame);
      const original = await observation.context.newPage(), telemetry = monitor(original);
      try {
        await original.goto(harness.parentServer.origin + fullStudio);
        await configureFixture(original, false); await assertArithmetic(original);
        assert.deepEqual(await original.evaluate(() => window.investmentStaffing.getState()), accepted, 'the original and chapter presentation receive the same edited state');
        assert.deepEqual(await original.evaluate(() => window.investmentStaffing.getResult()), variant, 'original and variant preserve full-model result parity');
        assertTelemetry(telemetry);
      } finally { await original.close(); }
    } finally { await observation.close(); }
  });

  test(`${engine}: Studio direct routes and added work activate the receiving chapter before focus`, { timeout: 90000 }, async () => {
    const observation = await session(engine);
    try {
      await fitted(observation);
      await expect(observation.frame.locator('.about-studio-full-view')).toHaveAttribute('href', 'https://iframes.vik.guru/v1/canvas/cross-functional-investment-studio/');
      await expect(observation.frame.locator('.about-studio-full-view')).toHaveAttribute('target', '_blank');
      await expect(observation.frame.locator('.about-studio-full-view')).toHaveAttribute('rel', 'noopener noreferrer');
      for (let repeat = 0; repeat < 2; repeat += 1) {
        await selectChapter(observation.frame, 'comparison');
        await observation.frame.locator('[data-summary-tab="receipts"]').click();
        await observation.frame.locator('#summary-panel-receipts a[href="#roles-title"]').click();
        await assertChapter(observation.frame, 'people'); await assertFocusReach(observation, observation.frame.locator('#roles-title'));
      }
      await selectChapter(observation.frame, 'comparison');
      await observation.frame.locator('#summary-panel-receipts a[href="#quality-title"]').click();
      await assertChapter(observation.frame, 'work'); await assertFocusReach(observation, observation.frame.locator('#quality-title'));
      await observation.frame.evaluate(() => history.back());
      await assertFocusReach(observation, observation.frame.locator('#roles-title')); await assertChapter(observation.frame, 'people');
      await observation.frame.evaluate(() => history.forward());
      await assertFocusReach(observation, observation.frame.locator('#quality-title')); await assertChapter(observation.frame, 'work');
      await selectChapter(observation.frame, 'coordination');
      await observation.frame.locator('.horizon-jump[href="#roles-title"]').first().click();
      await assertChapter(observation.frame, 'people'); await assertFocusReach(observation, observation.frame.locator('#roles-title'));
      const count = await observation.frame.locator('[data-kind="activity"][data-field="name"]').count();
      await selectChapter(observation.frame, 'change-modeling');
      await observation.frame.locator('[data-gap-add]').first().click();
      await assertFocusReach(observation, field(observation.frame, 'activity', count, 'name'));
      await assertChapter(observation.frame, 'work');
      await expect(field(observation.frame, 'activity', count, 'name')).toBeVisible();
      await field(observation.frame, 'activity', count, 'name').fill('Retained cross-chapter draft');
      await selectChapter(observation.frame, 'plan'); await selectChapter(observation.frame, 'work');
      await expect(field(observation.frame, 'activity', count, 'name')).toHaveValue('Retained cross-chapter draft');
      await observation.frame.locator('button[data-studio-chapter="people"]').evaluate(node => node.setAttribute('aria-pressed', 'true'));
      await assert.rejects(() => assertChapter(observation.frame, 'work'), /one selected chapter/u);
      await selectChapter(observation.frame, 'work');
      await selectChapter(observation.frame, 'comparison');
      await observation.frame.locator('details:has(#analysis-decision-title) > summary').click();
      await observation.frame.locator('#analysis-owner').fill('Fixture accountable receiver');
      await observation.frame.locator('#analysis-owner').press('Tab');
      await selectChapter(observation.frame, 'plan'); await selectChapter(observation.frame, 'comparison');
      await expect(observation.frame.locator('#analysis-owner')).toHaveValue('Fixture accountable receiver');
      await observation.frame.locator('[data-analysis-capsule-panel] > summary').click();
      await fitted(observation);
      await expect(observation.frame.locator('#analysis-capsule')).toHaveValue(/Fixture accountable receiver/u);
      assert.ok(await observation.frame.locator('#analysis-capsule').evaluate(node => node.scrollHeight <= node.clientHeight + 2), 'the accepted capsule value has complete vertical reach after revisiting its chapter');
      assertParentReading(await wheelObservation(observation, '#analysis-capsule'));
      if (engine === 'webkit') {
        const geometry = await observation.frame.locator('#analysis-capsule').evaluate(node => ({ chapter: document.documentElement.dataset.studioChapter,
          frameHeight: innerHeight, documentHeight: document.scrollingElement.scrollHeight,
          editorHeight: node.clientHeight, editorContent: node.scrollHeight, textLength: node.value.length }));
        await writeFile(join(captures, 'studio-comparison-capsule.json'), JSON.stringify(geometry, null, 2) + '\n');
        const box = await observation.frame.locator('[data-analysis-capsule-panel]').boundingBox();
        await observation.page.evaluate(top => scrollBy({ top: top - 100, behavior: 'instant' }), box.y);
        await observation.page.screenshot({ path: join(captures, 'studio-comparison-capsule.png') });
      }
    } finally { await observation.close(); }
  });

  test(`${engine}: Studio owns chapter fragments while preserving the visitor's latest selection`, { timeout: 90000 }, async () => {
    const observation = await session(engine);
    try {
      await fitted(observation);
      await selectChapter(observation.frame, 'coordination');
      const initialLength = await observation.frame.evaluate(() => {
        window.studioFragmentClicks = [];
        document.addEventListener('click', event => {
          const link = event.target.closest?.('a[href^="#"]');
          if (link) window.studioFragmentClicks.push({ href: link.getAttribute('href'), prevented: event.defaultPrevented });
        });
        return history.length;
      });
      const rolesLink = observation.frame.locator('.horizon-jump[href="#roles-title"]').first();
      await rolesLink.click();
      assert.deepEqual(await observation.frame.evaluate(() => window.studioFragmentClicks.at(-1)),
        { href: '#roles-title', prevented: true }, 'the chapter adapter owns the recognized click before native fragment navigation');
      assert.deepEqual(await observation.frame.evaluate(() => ({ hash: location.hash, length: history.length })),
        { hash: '#roles-title', length: initialLength + 1 }, 'one new destination creates one recoverable history entry');
      await assertFocusReach(observation, observation.frame.locator('#roles-title'));
      await selectChapter(observation.frame, 'coordination');
      await rolesLink.click();
      await assertFocusReach(observation, observation.frame.locator('#roles-title'));
      assert.equal(await observation.frame.evaluate(() => history.length), initialLength + 1,
        'revisiting the current fragment keeps its existing history entry');

      await selectChapter(observation.frame, 'comparison');
      await observation.frame.locator('[data-summary-tab="receipts"]').click();
      await observation.frame.locator('#summary-panel-receipts a[href="#quality-title"]').evaluate(link => {
        link.click();
        document.querySelector('button[data-studio-chapter="coordination"]').click();
      });
      await observation.frame.evaluate(() => new Promise(resolve => {
        requestAnimationFrame(() => setTimeout(() => requestAnimationFrame(resolve), 0));
      }));
      await assertChapter(observation.frame, 'coordination');
      assert.deepEqual(await observation.frame.evaluate(() => window.studioFragmentClicks.at(-1)),
        { href: '#quality-title', prevented: true }, 'a later chapter selection supersedes the owned fragment request');
      assert.equal(await observation.frame.evaluate(() => history.length), initialLength + 2);

      const delegated = await observation.frame.evaluate(() => {
        const cases = [
          { name: 'unknown fragment', href: '#fixture-unowned-fragment' },
          { name: 'another origin', href: 'https://example.invalid/#roles-title' },
          { name: 'another path', href: '../fixture-unowned-path/#roles-title' },
          { name: 'another query', href: '?fixture=delegated#roles-title' },
          ...['ctrlKey', 'metaKey', 'shiftKey', 'altKey'].map(key => ({ name: key, options: { [key]: true } })),
          { name: 'auxiliary button', options: { button: 1 } },
          { name: 'new browsing context', target: '_blank' },
          { name: 'download', download: '' },
        ];
        return cases.map(({ name, href = '#roles-title', options = {}, ...attributes }) => {
          const link = document.createElement('a');
          link.href = href;
          for (const [key, value] of Object.entries(attributes)) link.setAttribute(key, value);
          document.body.append(link);
          const before = { hash: location.hash, length: history.length, chapter: document.documentElement.dataset.studioChapter };
          let prevented;
          // Observe after the adapter's document-capture handler, then keep the
          // fixture's delegated default action inside this browser context.
          const observe = event => {
            if (event.target !== link) return;
            prevented = event.defaultPrevented;
            event.preventDefault();
            event.stopImmediatePropagation();
          };
          document.body.addEventListener('click', observe, true);
          try { link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...options })); }
          finally { document.body.removeEventListener('click', observe, true); link.remove(); }
          return { name, prevented, before, after: { hash: location.hash, length: history.length, chapter: document.documentElement.dataset.studioChapter } };
        });
      });
      assert.equal(delegated.length, 11, 'the delegated population includes each distinct activation boundary');
      for (const { name, prevented, before, after } of delegated) {
        assert.equal(prevented, false, `${name} keeps its browser-owned activation`);
        assert.deepEqual(after, before, `${name} preserves the current chapter and history`);
      }

      const count = await observation.frame.locator('[data-kind="activity"][data-field="name"]').count();
      await selectChapter(observation.frame, 'change-modeling');
      await observation.frame.locator('[data-gap-add]').first().click();
      await assertChapter(observation.frame, 'work');
      await assertFocusReach(observation, field(observation.frame, 'activity', count, 'name'));
      assert.equal(await observation.frame.evaluate(() => scrollY), 0, 'the added field is visible through parent scrolling with the child at its vertical origin');
    } finally { await observation.close(); }
  });

  test(`${engine}: Studio natural chapter heights preserve parent reading through narrow and enlarged layouts`, { timeout: 120000 }, async () => {
    const observation = await session(engine, { reducedMotion: 'reduce' });
    const readings = [];
    try {
      for (const width of [1440, 390]) {
        await observation.page.setViewportSize({ width, height: 900 });
        for (const chapter of chapters) {
          await selectChapter(observation.frame, chapter);
          readings.push({ parentWidth: width, chapter, ...await fitted(observation) });
          await assertWidth(observation.frame);
          const selector = { coordination: '.horizon-canvas', plan: '#shape-title', people: '#roles-title',
            work: '#activities-title', 'change-modeling': '#components-title', comparison: '#investment-analysis-title' }[chapter];
          assertParentReading(await wheelObservation(observation, selector));
          if (engine === 'webkit' && ['plan', 'work'].includes(chapter)) {
            const overview = await observation.frame.locator('.about-studio-overview').boundingBox();
            await observation.page.evaluate(top => scrollBy({ top: top - 100, behavior: 'instant' }), overview.y);
            await observation.page.screenshot({ path: join(captures, `studio-${chapter}-${width}.png`) });
          }
        }
      }
      await observation.frame.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      await selectChapter(observation.frame, 'people');
      const before = (await fitted(observation)).content;
      await observation.frame.locator('[data-add="role"]').click();
      const afterAdd = (await fitted(observation)).content;
      assert.ok(afterAdd > before + 100, 'a real added role grows the fitted chapter');
      await assertWidth(observation.frame);
      assertParentReading(await wheelObservation(observation, '#roles-title'));
      await selectChapter(observation.frame, 'plan');
      const short = (await fitted(observation)).content;
      assert.ok(short < afterAdd - 100, 'switching from the expanded People chapter releases its vertical space');
      await assertWidth(observation.frame);
      await expect(observation.frame.locator('button[data-studio-chapter="plan"]')).toBeFocused();
      assertParentReading(await wheelObservation(observation, '#shape-title'));
      await selectChapter(observation.frame, 'comparison'); await fitted(observation);
      const table = observation.frame.locator('.investment-table-scroll:visible').first();
      await expect(table).toBeVisible();
      await table.scrollIntoViewIfNeeded();
      const local = await table.evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth, overflow: getComputedStyle(node).overflowX }));
      assert.ok(local.content > local.width + 2 && ['auto', 'scroll'].includes(local.overflow), 'the enlarged narrow comparison needs and retains a local horizontal receiver');
      await table.focus(); await expect(table).toBeFocused();
      const left = await table.evaluate(node => node.scrollLeft);
      await observation.page.keyboard.down('ArrowRight');
      try { await expect.poll(() => table.evaluate(node => node.scrollLeft)).toBeGreaterThan(left); }
      finally { await observation.page.keyboard.up('ArrowRight'); }
      assertParentReading(await wheelObservation(observation, '.investment-table-scroll:visible'));
      if (engine === 'webkit') await writeFile(join(captures, 'studio-chapter-heights.json'), JSON.stringify(readings, null, 2) + '\n');
    } finally { await observation.close(); }
  });

  test(`${engine}: Studio fallback retains meaningful work and the scroll oracle distinguishes a capped frame`, { timeout: 90000 }, async () => {
    const fallback = await session(engine, { childObserverAvailable: false, viewport: { width: 390, height: 900 } });
    try {
      assert.equal(await fallback.carrier.getAttribute('data-content-fit'), null);
      await configureFixture(fallback.frame, true); await assertArithmetic(fallback.frame);
      assert.equal(await fallback.page.locator(`a[href="../..${fullStudio}"]`).count(), 1, 'the complete original instrument remains a supplementary onward route');
    } finally { await fallback.close(); }
    const scriptless = await session(engine, { javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
    try {
      await expect(scriptless.frame.locator('.fallback')).toBeVisible();
      await expect(scriptless.frame.locator('.fallback')).toContainText('Static planning method');
      assert.equal(await scriptless.frame.locator('button[data-studio-chapter]').count(), 0, 'native source fallback supplies reading before chapter enhancement');
    } finally { await scriptless.close(); }
    const fault = await session(engine, { viewport: { width: 390, height: 900 } });
    try {
      await fitted(fault);
      await fault.carrier.evaluate(node => node.style.setProperty('block-size', '420px', 'important'));
      const scroll = await wheelObservation(fault, '.about-studio-overview');
      assert.ok(scroll.child > 5, 'the restored fixed-height fault produces real child scrolling');
      assert.throws(() => assertParentReading(scroll), /About receives|vertical origin/u);
    } finally { await fault.close(); }
    const recovered = await session(engine, { viewport: { width: 390, height: 900 } });
    try { await fitted(recovered); assertParentReading(await wheelObservation(recovered, '.about-studio-overview')); }
    finally { await recovered.close(); }
  });
}
