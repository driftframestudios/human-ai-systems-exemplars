import assert from 'node:assert/strict';

const visitorRoot = '/context-canvas-project-surface/context-canvas/';

export async function open(browser, server, route, options = {}) {
  const { transformHtml, ...contextOptions } = options;
  const context = await browser.newContext({
    viewport: { width: 320, height: 844 }, reducedMotion: 'reduce', ...contextOptions,
  });
  await context.route('**/*', async request => {
    const url = new URL(request.request().url());
    if (url.origin !== server.origin || url.pathname.startsWith('/v1-cdn/')) {
      return request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' });
    }
    if (transformHtml && url.pathname === `${visitorRoot}${route}`) {
      const response = await request.fetch();
      return request.fulfill({ response, body: transformHtml(await response.text()) });
    }
    return request.continue();
  });
  const page = await context.newPage();
  await page.goto(`${server.origin}${visitorRoot}${route}`, { waitUntil: 'load' });
  // Driver polling also settles pages with enhancement disabled.
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { polling: 100, timeout: 7000 });
  return { page, close: () => context.close() };
}

export async function reading(page) {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const text = [];
    const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const parent = node.parentElement;
      if (parent.closest('script, style, svg, math, pre, textarea, select, .sr-only, .visually-hidden, .wtb-system-graph__sr-only')) continue;
      // This accessible qualifier has a route-owned one-pixel clipping rule.
      // Its visible SVG and nearby sentence carry the corresponding paint.
      const cue = parent.closest('.fmi-link-cue');
      if (cue) {
        const style = getComputedStyle(cue);
        if (style.position === 'absolute' && style.width === '1px' && style.height === '1px'
          && style.overflow === 'hidden' && style.clipPath === 'inset(50%)') continue;
      }
      let localScroll = false;
      let hidden = false;
      for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') hidden = true;
        if (['auto', 'scroll'].includes(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 2) localScroll = true;
      }
      if (hidden || localScroll) continue;
      let owner = parent;
      while (owner.parentElement && getComputedStyle(owner).display === 'inline') owner = owner.parentElement;
      const box = owner.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const range = document.createRange();
      range.setStart(node, node.textContent.search(/\S/u));
      range.setEnd(node, node.textContent.search(/\s*$/u));
      const fragments = [...range.getClientRects()].filter(rect => rect.width && rect.height)
        .map(rect => ({ left: rect.left, right: rect.right }));
      if (fragments.length) text.push({
        value: node.textContent.trim().slice(0, 90),
        owner: owner.tagName, left: Math.max(0, box.left), right: Math.min(viewport, box.right),
        font: getComputedStyle(parent).fontSize, color: getComputedStyle(parent).color,
        fragments,
      });
    }
    return {
      viewport, width: document.documentElement.scrollWidth, text,
      cards: [...document.querySelectorAll('.instrument-atlas-card')].map(card => ({
        width: card.clientWidth, scroll: card.scrollWidth,
        left: card.getBoundingClientRect().left, right: card.getBoundingClientRect().right,
      })),
      scrollers: [...document.querySelectorAll('main .table-scroll, main pre')].map(node => ({
        width: node.clientWidth, scroll: node.scrollWidth, overflow: getComputedStyle(node).overflowX,
      })),
    };
  });
}

export function assertReading(value, label) {
  assert.ok(value.width <= value.viewport + 2, `${label}: the document fits its viewport (${value.width}/${value.viewport})`);
  assert.ok(value.text.length > 20, `${label}: the authored reading is observed`);
  for (const text of value.text) assert.ok(text.fragments.every(fragment => (
    fragment.left >= text.left - 2 && fragment.right <= text.right + 2
  )), `${label}: complete text stays inside its reading owner (${text.owner}: ${text.value})`);
  for (const card of value.cards) {
    assert.ok(card.left >= -2 && card.right <= value.viewport + 2, `${label}: the atlas card fits the visitor field`);
    assert.ok(card.scroll <= card.width + 2, `${label}: the atlas card contains its own text track`);
  }
  for (const scroll of value.scrollers.filter(scroll => scroll.scroll > scroll.width + 2)) {
    assert.ok(['auto', 'scroll'].includes(scroll.overflow), `${label}: wide evidence retains its local scroll owner`);
  }
}

export async function resize(page, width, enlarged) {
  await page.setViewportSize({ width, height: 844 });
  await page.evaluate(enlarged => {
    document.documentElement.style.fontSize = enlarged ? '200%' : '';
  }, enlarged);
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { polling: 100, timeout: 7000 });
  await settledReading(page);
}

export async function settledReading(page) {
  let previous;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = await reading(page);
    const serialized = JSON.stringify(value);
    if (serialized === previous) return value;
    previous = serialized;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.fail('The reading reaches stable geometry within the bounded observation window');
}
