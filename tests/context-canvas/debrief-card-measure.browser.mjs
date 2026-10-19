import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const route = '/context-canvas-project-surface/context-canvas/debriefs.html';
const slugSelector = '.debrief-catalog__card .project--slug';
const browsers = new Map();
let server;
before(async () => {
  server = await startStaticServer();
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) browsers.set(name, await engine.launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function open(t, engine, options = {}) {
  const page = await browsers.get(engine).newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  t.after(() => page.close());
  await page.goto(server.origin + route, { waitUntil: 'load' });
  return page;
}

async function settle(page, width, scale = 100) {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(scale => { document.documentElement.style.fontSize = `${scale}%`; }, scale);
  // Readiness follows actual typography and geometry, including scriptless
  // WebKit's asynchronous propagation of a changed root text size.
  const deadline = Date.now() + 2500;
  let previous = '', stableSince = Date.now();
  while (Date.now() < deadline) {
    const state = await page.evaluate(selector => ({
      fonts: document.fonts.status,
      root: parseFloat(getComputedStyle(document.documentElement).fontSize),
      headings: [...document.querySelectorAll(selector)].map(node => {
        const box = node.getBoundingClientRect();
        return [box.width, box.height, getComputedStyle(node).fontSize];
      }),
    }), slugSelector);
    const current = JSON.stringify(state);
    if (current !== previous || state.fonts !== 'loaded' || Math.abs(state.root - 16 * scale / 100) > .1) stableSince = Date.now();
    else if (Date.now() - stableSince >= 50) return;
    previous = current;
    await delay(10);
  }
  assert.fail('Card typography and geometry settle within the bounded observation window.');
}

async function observe(page) {
  return page.locator(slugSelector).evaluateAll(headings => {
    const rect = node => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width };
    };
    return headings.filter(heading => heading.getBoundingClientRect().height > 0).map(heading => {
      const card = heading.closest('.debrief-catalog__card');
      const media = card.querySelector(':scope > .project__media--container');
      const style = getComputedStyle(heading);
      const lines = [], fragments = [];
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let node;
      while ((node = walker.nextNode())) {
        for (let index = 0; index < node.textContent.length; index++) {
          range.setStart(node, index); range.setEnd(node, index + 1);
          const box = range.getBoundingClientRect();
          let line = lines.find(line => Math.abs(line.top - box.top) < 1);
          if (!line) { line = { top: box.top, text: '' }; lines.push(line); }
          line.text += node.textContent[index];
          if (node.textContent[index].trim()) fragments.push({ left: box.left, right: box.right, top: box.top, bottom: box.bottom });
        }
      }
      const cardStyle = getComputedStyle(card), box = rect(card);
      return {
        id: card.id, title: heading.textContent.trim(), href: heading.closest('a').getAttribute('href'),
        heading: rect(heading), parent: rect(heading.closest('.project__media--text')),
        card: { left: box.left + parseFloat(cardStyle.borderLeftWidth), right: box.right - parseFloat(cardStyle.borderRightWidth) },
        media: media && media.getBoundingClientRect().height ? rect(media) : null,
        float: media && getComputedStyle(media).float,
        balanced: style.textWrapStyle, lines: lines.map(line => line.text.trim()).filter(Boolean), fragments,
      };
    });
  });
}

function assertCardRoom(cards, label) {
  assert.ok(cards.length > 0, `${label}: the selected mode contains card slugs`);
  for (const card of cards) {
    assert.ok(Math.abs(card.heading.width - card.parent.width) <= 1, `${label} ${card.id}: the slug uses its card's available width`);
    assert.equal(card.balanced, 'balance', `${label} ${card.id}: foundation balancing remains active`);
    assert.ok(card.fragments.length > 0 && card.fragments.every(fragment => fragment.left >= card.card.left - 1 && fragment.right <= card.card.right + 1),
      `${label} ${card.id}: complete title paint stays inside the card`);
    if (card.media && card.float === 'left') {
      assert.ok(card.fragments.every(fragment => fragment.bottom <= card.media.top + 1 || fragment.top >= card.media.bottom - 1 || fragment.left >= card.media.right - 1),
        `${label} ${card.id}: title paint clears the floated media`);
    }
  }
}

async function withFormerMeasure(page, action) {
  const { width } = page.viewportSize();
  const style = await page.addStyleTag({ content: `${slugSelector} { max-inline-size: min(100%, var(--canvas-heading-measure)) !important; }` });
  try { await settle(page, width); return await action(); }
  finally { await style.evaluate(node => node.remove()); await settle(page, width); }
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: nineteen catalog slugs use available room through responsive seams`, async t => {
    const page = await open(t, engine);
    const identity = (await observe(page)).map(({ id, title, href }) => ({ id, title, href }));
    assert.equal(identity.length, 19);
    // 46rem changes media placement, 770px changes type, and 64rem changes
    // the browse/preview arrangement. Other widths sample laptop and wide use.
    for (const width of [320, 390, 736, 737, 770, 771, 1024, 1025, 1280, 1366, 1440, 1536, 2560]) {
      await settle(page, width);
      const cards = await observe(page);
      assertCardRoom(cards, `${width}px`);
      assert.deepEqual(cards.map(({ id, title, href }) => ({ id, title, href })), identity, 'Titles, order, and destinations stay authored.');
    }
    for (const width of [320, 390, 736, 737, 1024, 1025, 1440, 2560]) {
      await settle(page, width, 200);
      assertCardRoom(await observe(page), `${width}px at 200% text`);
    }
  });

  test(`${engine}: laptop title fragments distinguish the restored measure fault`, async t => {
    const page = await open(t, engine);
    for (const width of [1280, 1440]) {
      await settle(page, width);
      const current = await observe(page);
      const previous = await withFormerMeasure(page, () => observe(page));
      assertCardRoom(current, `${width}px repaired`);
      assert.throws(() => assertCardRoom(previous, `${width}px former measure`), /slug uses its card's available width/);
      for (const id of ['catalog-genomic-viewer', 'catalog-clinical-trial']) {
        const next = current.find(card => card.id === id), old = previous.find(card => card.id === id);
        assert.ok(next.lines.length < old.lines.length, `${id}: the complete title needs fewer lines with its available card room`);
        assert.ok(next.lines.at(-1).split(/\s+/u).length >= 2, `${id}: this observed laptop title keeps a word group on its final line`);
        assert.equal(next.title, old.title, 'The comparison retains the complete authored wording.');
        t.diagnostic(`${width}px ${id}: ${old.lines.length}→${next.lines.length} lines.`);
      }
      assertCardRoom(await observe(page), `${width}px restored candidate`);
    }
    const token = await page.locator('.debrief-catalog__header h2').evaluate(node => ({
      token: getComputedStyle(node).getPropertyValue('--canvas-heading-measure').trim(),
      max: getComputedStyle(node).maxInlineSize,
    }));
    assert.equal(token.token, '32ch', 'Ordinary heading roles retain the shared token.');
    assert.notEqual(token.max, '100%', 'The catalog header retains its ordinary heading measure.');
  });

  test(`${engine}: filters, reading modes, and article focus retain card title room`, async t => {
    const page = await open(t, engine);
    await settle(page, 1366);
    await page.locator('#debrief-filter-ai-systems').check();
    const filtered = await observe(page);
    assert.ok(filtered.length > 0 && filtered.length < 19, 'The topic selection presents a bounded subset.');
    assertCardRoom(filtered, 'Topic-filtered catalog');
    await page.locator('[data-clear-filters]').click();
    assert.equal((await observe(page)).length, 19);
    await page.locator('#debrief-filter-full-debrief').check();
    assertCardRoom(await observe(page), 'Full Debrief index');
    await page.locator('#debrief-filter-case-brief').check();
    assert.equal((await observe(page)).length, 0, 'Case Brief mode uses its separate source-owned heading role.');
    await page.locator('#debrief-filter-article').check();
    const articles = await observe(page);
    assertCardRoom(articles, 'Articles mode');
    await page.locator('.debrief-catalog__card:not([hidden]) .project--slug').first().locator('..').focus();
    assert.ok(await page.locator('[data-preview-entry]').isVisible(), 'The existing keyboard preview remains available.');
    assertCardRoom(await observe(page), 'Focused article preview');
    await page.locator('#debrief-filter-catalog').check();
    assert.equal((await observe(page)).length, 19);
    assertCardRoom(await observe(page), 'Returned catalog overview');
  });

  test(`${engine}: scriptless, alternate-media, and long-title readings retain room`, async t => {
    const page = await open(t, engine, { javaScriptEnabled: false });
    await settle(page, 1440);
    assert.equal((await observe(page)).length, 19);
    assertCardRoom(await observe(page), 'Scriptless catalog');
    for (const media of [{ media: 'print' }, { media: 'screen', forcedColors: 'active' }]) {
      await page.emulateMedia(media);
      await settle(page, 1440);
      assertCardRoom(await observe(page), JSON.stringify(media));
    }
    await page.emulateMedia({ media: 'screen', forcedColors: 'none' });
    const heading = page.locator(slugSelector).first();
    const original = await heading.textContent();
    await heading.evaluate(node => { node.textContent += ' — SharedOperationalUnderstandingAcrossLaboratoryTeamsAndReviewingPractitioners'; });
    try {
      for (const width of [320, 390, 1025, 1440]) {
        await settle(page, width, 200);
        assertCardRoom(await observe(page), `Long title at ${width}px with 200% text`);
      }
    } finally { await heading.evaluate((node, text) => { node.textContent = text; }, original); }
  });
}
