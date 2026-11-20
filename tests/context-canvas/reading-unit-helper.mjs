import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';

// Two painted-unit families share parent-page setup and fragment observation.
// Each receiving contract retains its inventory, states, faults and expectations.
export async function openReadingPage(browser, origin, route, {
  viewport = { width: 1440, height: 1000 }, fontSize = 16,
  javaScriptEnabled = true, faultCss = '',
} = {}) {
  const context = await browser.newContext({ viewport, javaScriptEnabled, reducedMotion: 'reduce' });
  try {
    await context.route('**/*', async request => {
      const url = new URL(request.request().url());
      if (url.origin !== origin || url.pathname.startsWith('/v1-cdn/')) {
        return request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' });
      }
      if (url.pathname === `/context-canvas-project-surface/context-canvas/${route}` && (faultCss || fontSize !== 16)) {
        const response = await request.fetch();
        const html = await response.text();
        assert.ok(html.includes('</head>'), 'The fixture enters the authored head before document parsing.');
        const style = `<style>html { font-size: ${fontSize}px; } ${faultCss}</style>`;
        return request.fulfill({ response, body: html.replace('</head>', `${style}</head>`) });
      }
      return request.continue();
    });
    const page = await context.newPage();
    await page.goto(`${origin}/context-canvas-project-surface/context-canvas/${route}`, { waitUntil: 'load' });
    // Driver-side polling also works when Firefox disables page Promise jobs.
    // The existing architecture-card contract uses this bounded font-state route.
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await page.evaluate(() => document.fonts.status === 'loaded')) {
        return { page, close: () => context.close() };
      }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail('The authored fonts reach their loaded state.');
  } catch (error) {
    await context.close();
    throw error;
  }
}

export async function scrollToReadingUnit(page, selector, index) {
  await page.locator(selector).nth(index).evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

export async function observeReadingUnits(page, selector) {
  return page.locator(selector).evaluateAll(elements => {
    const rect = r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
    const positive = r => r.width > 0 && r.height > 0;
    return elements.map(element => {
      const style = getComputedStyle(element);
      const owner = element.closest('.prose-flow');
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const text = [];
      let node;
      while ((node = walker.nextNode())) {
        const start = node.textContent.search(/\S/u);
        if (start < 0) continue;
        const parentStyle = getComputedStyle(node.parentElement);
        if (parentStyle.display === 'none' || parentStyle.visibility !== 'visible') continue;
        // The accessible new-tab cue has a deliberately clipped one-pixel box.
        const cue = node.parentElement.closest('.fmi-link-cue');
        const cueStyle = cue && getComputedStyle(cue);
        if (cueStyle?.position === 'absolute' && cueStyle.clipPath === 'inset(50%)'
          && cueStyle.overflowX === 'hidden' && cueStyle.overflowY === 'hidden'
          && parseFloat(cueStyle.width) === 1 && parseFloat(cueStyle.height) === 1) continue;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, node.textContent.search(/\s*$/u));
        text.push(...[...range.getClientRects()].filter(positive).map(rect));
      }
      return {
        tag: element.tagName, id: element.getAttribute('aria-labelledby') || element.id,
        heading: element.querySelector('h2,h3,h4')?.textContent.trim() || element.textContent.trim().slice(0, 80),
        fragments: [...element.getClientRects()].filter(positive).map(rect), text,
        owner: owner ? rect(owner.getBoundingClientRect()) : null,
        columns: owner ? parseInt(getComputedStyle(owner).columnCount, 10) || 1 : 1,
        viewport: document.documentElement.clientWidth, display: style.display, visibility: style.visibility,
        background: style.backgroundColor, border: style.borderTopWidth, shadow: style.boxShadow,
        interactive: element.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])').length,
      };
    });
  });
}

export function assertContainedReadingFragments(units, label) {
  assert.ok(units.length > 0, `${label}: the declared reading units are present`);
  for (const unit of units) {
    const name = `${label}: ${unit.id || unit.heading}`;
    assert.equal(unit.visibility, 'visible', `${name}: the unit remains visible`);
    assert.notEqual(unit.display, 'none', `${name}: the unit retains layout`);
    assert.ok(unit.fragments.length > 0, `${name}: the unit retains visible fragments`);
    for (const frame of unit.fragments) {
      assert.ok(frame.left >= -1.5 && frame.right <= unit.viewport + 1.5, `${name}: the frame fits the viewport`);
      assert.ok(unit.owner && frame.left >= unit.owner.left - 1.5 && frame.right <= unit.owner.right + 1.5,
        `${name}: the frame fits its prose owner`);
    }
    assert.ok(unit.text.length > 0, `${name}: visible text has layout fragments`);
    assert.ok(unit.text.every(r => unit.fragments.some(frame =>
      r.left >= frame.left - 1.5 && r.right <= frame.right + 1.5
      && r.top >= frame.top - 1.5 && r.bottom <= frame.bottom + 1.5)),
    `${name}: complete text remains inside its own reading fragments`);
  }
}

export function assertIntactUnits(units, label) {
  for (const unit of units) {
    assert.equal(unit.fragments.length, 1,
      `${label}: ${unit.id || unit.heading}: one contiguous painted-unit fragment`);
  }
  assertContainedReadingFragments(units, label);
}
