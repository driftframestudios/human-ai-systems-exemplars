import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, firefox, webkit } from '@playwright/test';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const root = '/context-canvas-project-surface/context-canvas/';
const output = new URL('../../.visual-runs/debrief-caption-colors/', import.meta.url);
const catalog = await readFile(new URL(`../..${root}debriefs.html`, import.meta.url), 'utf8');
const routes = [...catalog.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap(([, data]) => (JSON.parse(data)['@graph'] || []).filter(item => item['@type'] === 'ItemList')
    .flatMap(item => item.itemListElement).map(item => new URL(item.url).pathname.split('/').at(-1)));
const repaired = '#genomics-responsive-interface-caption, #genomics-permissions-caption';
const captionRoots = 'figcaption, .table-note, .prototype-description, .media-description, figure details';
const descendants = 'strong, b, em, code, a, summary, p, li, h3, h4, .table-source, .table-caveat';
let server;
const browsers = new Map();
before(async () => {
  server = await startStaticServer();
  await mkdir(output, { recursive: true });
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) browsers.set(name, await engine.launch());
});
after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});
async function open(t, engine, route = 'genomic-viewer-replatforming.html') {
  const page = await browsers.get(engine).newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  t.after(() => page.close());
  await page.route('**/*', request => new URL(request.request().url()).origin === server.origin
    ? request.continue() : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Embedded owner</title>' }));
  await page.goto(server.origin + root + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

// Parent-document paint only. Images and embedded documents retain their own
// owners. Alpha backgrounds compose through ancestors; current linear textures receive
// a conservative stop-intersection bound. Other image paint retains its owner.
async function readings(page, selector = captionRoots, includeDescriptions = false) {
  return page.evaluate(({ selector, includeDescriptions, descendants }) => {
    const rgba = value => {
      const values = value.match(/[\d.]+/g).map(Number);
      return value.startsWith('color(srgb')
        ? [...values.slice(0, 3).map(channel => channel * 255), values[3] ?? 1]
        : [...values.slice(0, 3), values[3] ?? 1];
    };
    const composite = (front, back) => [...front.slice(0, 3).map((channel, i) => channel * front[3] + back[i] * (1 - front[3])), 1];
    const variantLimit = 64;
    const background = node => {
      const chain = []; for (let owner = node; owner; owner = owner.parentElement) chain.push(owner);
      let paint = [255, 255, 255, 1], variants = [paint]; const images = [];
      for (const owner of chain.reverse()) {
        const style = getComputedStyle(owner);
        const fill = rgba(style.backgroundColor);
        paint = composite(fill, paint);
        if (fill[3] === 1) { variants = [paint]; images.length = 0; }
        else variants = variants.map(value => composite(fill, value));
        if (style.backgroundImage !== 'none') {
          const image = style.backgroundImage;
          images.push(image);
          // Current catalog textures use translucent linear-gradient stops.
          // Enumerating their on/off intersections conservatively bounds every
          // painted point; an unfamiliar image remains an explicit failure.
          if (/url\(|radial-gradient|conic-gradient/.test(image)) throw new Error('Caption background needs a separate image-paint observation.');
          const stops = [...image.matchAll(/rgba?\([^)]*\)/g)].map(([value]) => rgba(value)).filter(value => value[3] > 0).reverse();
          if (!stops.length) throw new Error('Caption gradient needs an explicit color-stop interpretation.');
          for (const stop of stops) {
            if (variants.length > variantLimit / 2) throw new Error(`Caption texture exceeds the ${variantLimit}-variant observation budget; use a separate paint observation.`);
            variants = [...variants, ...variants.map(value => composite(stop, value))];
          }
        }
      }
      return { paint, variants, images };
    };
    const roots = new Set(document.querySelectorAll(selector));
    if (includeDescriptions) for (const media of document.querySelectorAll('[aria-details]')) {
      for (const id of media.getAttribute('aria-details').split(/\s+/)) {
        const description = document.getElementById(id); if (description) roots.add(description);
      }
    }
    // Opening a description makes its summary and revealed content observable.
    for (const root of roots) {
      if (root.matches('details')) root.open = true;
      for (const details of root.querySelectorAll('details')) details.open = true;
    }
    return [...roots].map(root => ({ id: root.id, tag: root.tagName, classes: root.className,
      parts: [root, ...root.querySelectorAll(descendants)].map(node => {
        const style = getComputedStyle(node), field = background(node);
        const range = document.createRange(); range.selectNodeContents(node);
        const figure = node.closest('figure') || root, box = figure.getBoundingClientRect();
        const resolveRole = name => {
          const probe = document.createElement('span'); probe.style.color = style.getPropertyValue(name);
          node.append(probe); const color = rgba(getComputedStyle(probe).color); probe.remove(); return color;
        };
        return { tag: node.tagName, id: node.id, classes: node.className, text: node.textContent.trim(),
          foreground: composite(rgba(style.color), field.paint), foregrounds: field.variants.map(background => composite(rgba(style.color), background)), background: field.paint, backgrounds: field.variants, images: field.images,
          weight: Number(style.fontWeight), size: parseFloat(style.fontSize), display: style.display,
          visible: node.getClientRects().length > 0 && style.visibility === 'visible',
          decoration: style.textDecorationLine, outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth),
          outlineColor: composite(rgba(style.outlineColor), field.paint),
          forcedAdjust: style.getPropertyValue('forced-color-adjust'),
          bounds: { left: box.left, right: box.right },
          fragments: [...range.getClientRects()].filter(rect => rect.width && rect.height)
            .map(rect => ({ left: rect.left, right: rect.right })),
          links: node.matches('a') ? [resolveRole('--canvas-link-color'), resolveRole('--canvas-link-visited-color')] : [] };
      }) }));
  }, { selector, includeDescriptions, descendants });
}
function luminance(color) {
  return color.slice(0, 3).map(channel => {
    channel /= 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
function assertReadable(records, label, { geometry = false, linkStates = false } = {}) {
  for (const record of records) for (const part of record.parts.filter(part => part.visible && part.text)) {
    const threshold = part.size >= 24 || (part.size >= 18.667 && part.weight >= 700) ? 3 : 4.5;
    assert.ok(part.backgrounds.every((background, index) => contrast(part.foregrounds[index], background) >= threshold),
      `${label} ${record.id || record.classes} ${part.tag}: readable caption paint (${contrast(part.foreground, part.background).toFixed(2)})`);
    if (part.tag === 'A' && linkStates) {
      assert.ok(part.decoration.includes('underline'), `${label}: the caption link retains an underline`);
      for (const color of part.links) assert.ok(part.backgrounds.every(background => contrast(color, background) >= 4.5),
        `${label}: declared caption link roles contrast with their painted owner`);
    }
    if (geometry) assert.ok(part.fragments.every(rect => rect.left >= part.bounds.left - 1 && rect.right <= part.bounds.right + 1),
      `${label} ${part.tag}: caption text stays inside its figure`);
  }
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: catalog captions and associated descriptions retain readable ordinary and descendant paint`, async t => {
    assert.equal(routes.length, 23);
    const inventory = [];
    for (const route of routes) {
      const page = await open(t, engine, route);
      const records = await readings(page, captionRoots, true);
      assertReadable(records, route);
      inventory.push({ route, records }); await page.close();
    }
    const roots = inventory.reduce((sum, entry) => sum + entry.records.length, 0);
    assert.equal(roots, 161, 'Catalog captions plus media-linked descriptions define the current receiving population.');
    await writeFile(new URL(`${engine}-inventory.json`, output), JSON.stringify(inventory, null, 2));
  });

  test(`${engine}: dark caption emphasis remains complete at narrow, laptop, wide and enlarged-text widths`, async t => {
    const page = await open(t, engine);
    for (const [width, font] of [[390, 16], [1440, 16], [2560, 16], [320, 32]]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(font => { document.documentElement.style.fontSize = `${font}px`; }, font);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const records = await readings(page, repaired);
      assert.equal(records.length, 2);
      assertReadable(records, `${width}/${font}`, { geometry: true });
      for (const record of records) {
        const emphasis = record.parts.find(part => part.tag === 'STRONG');
        assert.deepEqual(emphasis.foreground, record.parts[0].foreground, 'Weight expresses emphasis against the same caption field.');
        assert.equal(emphasis.weight, 650);
        if (font === 16) await page.locator(`#${record.id}`).screenshot({ path: new URL(`${engine}-${record.id}-${width}.png`, output).pathname });
      }
    }
  });

  test(`${engine}: light insets keep their own caption and link roles inside dark readings`, async t => {
    const page = await open(t, engine);
    // The authored inset descriptions and table captions are current controls.
    const controls = '#genomics-responsive-interface-transcript, #genomics-permissions-transcript, .genomic-implementation-field .cobalt-operating-field__table caption';
    const before = await readings(page, controls);
    assert.ok(before.length >= 3); assertReadable(before, 'authored light insets');
    // Exercise the supported caption extension inside each existing painted
    // light-owner class, including source/caveat, code, emphasis and disclosure.
    const count = await page.evaluate(() => {
      const selectors = ['.architecture-pair article', '.repeatability-cards article', '.implementation-companion', '.cobalt-operating-field__aside', '.cobalt-operating-field__table'];
      let count = 0;
      for (const selector of selectors) {
        const owner = document.querySelector(`.genomic-implementation-field ${selector}`); if (!owner) continue;
        const figure = document.createElement('figure'); figure.className = 'story-visual'; figure.dataset.captionProbe = '';
        figure.innerHTML = '<figcaption class="table-note">Ordinary caption. <strong>Emphasis.</strong> <em>Qualification.</em> <code>record_id</code><span class="table-source">Source.</span><span class="table-caveat">Evidence boundary.</span><a href="#source-implementation-debrief">Read the source</a><details><summary>More context</summary><p>Readable detail.</p></details></figcaption>';
        owner.append(figure); count++;
      }
      return count;
    });
    assert.equal(count, 5, 'Each current light-owner family receives the extension observation.');
    assertReadable(await readings(page, '[data-caption-probe] figcaption'), 'nested light caption extension', { linkStates: true });
    const stablePaint = records => records.map((record, index) => record.parts.slice(0, before[index].parts.length).map(({ foreground, background, weight, size }) => ({ foreground, background, weight, size })));
    assert.deepEqual(stablePaint(await readings(page, controls)), stablePaint(before), 'Existing inset typography retains its resolved values.');
    const fault = await page.addStyleTag({ content: '.genomic-implementation-field :is(.architecture-pair article,.repeatability-cards article,.implementation-companion,.cobalt-operating-field__aside,.cobalt-operating-field__table) { --genomic-caption-ink: #dbe7f6; }' });
    try { const records = await readings(page, '[data-caption-probe] figcaption'); assert.throws(() => assertReadable(records, 'restored dark role'), /readable caption paint/); }
    finally { await fault.evaluate(node => node.remove()); }
    assertReadable(await readings(page, '[data-caption-probe] figcaption'), 'restored light caption extension', { linkStates: true });
    await page.emulateMedia({ media: 'print' });
    assertReadable(await readings(page, '[data-caption-probe] figcaption'), 'printed light caption extension');
  });

  test(`${engine}: caption links retain focus, hover, active and declared visited contrast`, async t => {
    const page = await open(t, engine);
    const selector = '#genomics-responsive-interface-caption a';
    const link = page.locator(selector);
    await link.evaluate(node => node.addEventListener('click', event => event.preventDefault()));
    await link.focus();
    await page.keyboard.press(engine === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
    await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
    let record = (await readings(page, selector))[0].parts[0];
    assert.ok(await link.evaluate(node => node === document.activeElement));
    assert.ok(record.outline !== 'none' && record.outlineWidth > 0);
    assert.ok(contrast(record.outlineColor, record.background) >= 3);
    assertReadable(await readings(page, selector), 'focused caption destination', { linkStates: true });
    await link.hover(); assertReadable(await readings(page, selector), 'hovered caption destination', { linkStates: true });
    await page.mouse.down();
    try { assertReadable(await readings(page, selector), 'active caption destination', { linkStates: true }); }
    finally { await page.mouse.up(); }
    // CSSOM exposes the declared visited rule; the browser protects actual
    // history state. The resolved role above establishes its palette contrast.
    const visitedRule = await page.evaluate(() => [...document.styleSheets].some(sheet => {
      try { return [...sheet.cssRules].some(rule => rule.selectorText?.includes('a:visited') && rule.style?.color.includes('--canvas-link-visited-color')); }
      catch { return false; }
    }));
    assert.ok(visitedRule, 'Native visited paint uses the declared active role.');
  });

  test(`${engine}: print and forced colors preserve caption emphasis and light inset reading`, async t => {
    const page = await open(t, engine);
    await page.emulateMedia({ media: 'print' });
    const printed = await readings(page, repaired);
    assertReadable(printed, 'print');
    for (const record of printed) for (const part of record.parts) assert.deepEqual(part.foreground.slice(0, 3), [0, 0, 0], 'Print carries black ordinary and emphasized text.');
    assertReadable(await readings(page, '#genomics-responsive-interface-transcript, .genomic-implementation-field .cobalt-operating-field__table caption'), 'printed inset');
    await page.emulateMedia({ media: 'screen', forcedColors: 'active' });
    assert.ok(await page.evaluate(() => matchMedia('(forced-colors: active)').matches));
    assertReadable(await readings(page, repaired), 'forced colors');
    const nativeAdjustment = await page.evaluate(() => CSS.supports('forced-color-adjust', 'auto'));
    if (nativeAdjustment) for (const record of await readings(page, repaired)) for (const part of record.parts) assert.equal(part.forcedAdjust, 'auto');
    await page.locator('#genomics-responsive-interface-caption a').focus();
    const focused = (await readings(page, '#genomics-responsive-interface-caption a'))[0].parts[0];
    assert.ok(focused.outline !== 'none' && focused.outlineWidth > 0 && contrast(focused.outlineColor, focused.background) >= 3, 'Forced colors retain a visible native caption-link focus.');
    await page.emulateMedia({ forcedColors: 'none' });
    assertReadable(await readings(page, repaired), 'restored screen');
  });

  test(`${engine}: texture observation bounds expansion and recovers after an over-budget field`, async t => {
    const page = await open(t, engine);
    const selector = '#genomics-responsive-interface-caption';
    const texture = layers => `${selector} { background-image: ${Array(layers).fill('linear-gradient(rgba(255, 255, 255, .01), rgba(0, 0, 0, 0))').join(', ')}; }`;
    const field = await page.addStyleTag({ content: texture(6) });
    try {
      const bounded = await readings(page, selector);
      assert.equal(bounded[0].parts[0].backgrounds.length, 64, 'The observation admits its complete finite budget.');
      assertReadable(bounded, 'bounded texture');
      await field.evaluate((node, css) => { node.textContent = css; }, texture(7));
      await assert.rejects(() => readings(page, selector), /exceeds the 64-variant observation budget; use a separate paint observation/);
    } finally { await field.evaluate(node => node.remove()); }
    assertReadable(await readings(page, selector), 'restored ordinary field');
  });

  test(`${engine}: restoring explicit dark descendant ink fails the contrast oracle`, async t => {
    const page = await open(t, engine);
    assertReadable(await readings(page, repaired), 'accepted captions');
    const fault = await page.addStyleTag({ content: '.genomic-implementation-field .story-visual .table-note strong { color: var(--canvas-ink-strong); }' });
    try {
      const records = await readings(page, repaired);
      for (const record of records) {
        const emphasis = record.parts.find(part => part.tag === 'STRONG');
        assert.ok(contrast(emphasis.foreground, emphasis.background) < 1.1, 'The restored source fault reproduces the observed low-contrast paint.');
      }
      assert.throws(() => assertReadable(records, 'restored descendant ink'), /readable caption paint/);
    } finally { await fault.evaluate(node => node.remove()); }
    assertReadable(await readings(page, repaired), 'restored accepted captions');
  });
}
