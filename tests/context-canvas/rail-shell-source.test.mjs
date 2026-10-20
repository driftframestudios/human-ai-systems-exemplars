import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const canvasRoot = resolve("context-canvas-project-surface/context-canvas");

function blockAt(source, marker, fromIndex = 0) {
  const markerIndex = source.indexOf(marker, fromIndex);
  assert.notEqual(markerIndex, -1, `Expected source block for ${marker}`);
  const openingIndex = source.indexOf("{", markerIndex + marker.length);
  assert.notEqual(openingIndex, -1, `Expected opening brace for ${marker}`);
  let depth = 0;
  for (let index = openingIndex; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingIndex + 1, index);
    }
  }
  assert.fail(`Expected closing brace for ${marker}`);
}

test("the shared rail keeps one external visual readout with complete link names", async () => {
  const source = await readFile(resolve(canvasRoot, "canvas-shell.js"), "utf8");
  const appendList = source.indexOf("nav.appendChild(list)");
  const appendReadout = source.indexOf("nav.appendChild(readout)");

  assert.ok(appendList > 0, "the rail should append its scroll list");
  assert.ok(appendReadout > appendList, "the readout should be a nav child after, rather than inside, the scroll list");
  assert.match(source, /readout\.setAttribute\("aria-hidden", "true"\)/u);
  assert.match(source, /link\.setAttribute\("aria-label", label\)/u);
  assert.doesNotMatch(source, /page-section-rail__label/u);
});

test("every Context Canvas footer receives the same plain-text contact address", async () => {
  const shell = await readFile(resolve(canvasRoot, "canvas-shell.js"), "utf8");
  const routes = (await readdir(canvasRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
    .map(entry => entry.name)
    .sort();

  assert.match(
    shell,
    /footer\.querySelector\(":scope > \[data-context-canvas-contact\], :scope > \* > \[data-context-canvas-contact\]"\)/u,
  );
  assert.match(shell, /if \(!contact\) contact = element\("p", "super-footer__contact", "contact@vik\.guru"\)/u);
  assert.match(shell, /contact\.remove\(\)/u);
  assert.match(shell, /closing\.appendChild\(contact\)/u);
  assert.doesNotMatch(shell, /mailto:/iu);

  for (const route of routes) {
    const source = await readFile(resolve(canvasRoot, route), "utf8");
    const footerStart = source.lastIndexOf("<footer");
    const footerEnd = source.lastIndexOf("</footer>");
    assert.ok(footerStart >= 0 && footerEnd > footerStart, `${route}: final footer`);
    const footer = source.slice(footerStart, footerEnd + "</footer>".length);
    const contacts = footer.match(/data-context-canvas-contact/gu) ?? [];

    assert.equal(contacts.length, 1, `${route}: one authored contact address`);
    assert.match(
      footer,
      /<p class="super-footer__contact" data-context-canvas-contact>contact@vik\.guru<\/p>/u,
      `${route}: exact plain-text contact address`,
    );
    assert.doesNotMatch(footer, /mailto:/iu, route);
    assert.ok(
      footer.indexOf("data-context-canvas-contact") < footer.indexOf("data-visitor-boundary"),
      `${route}: contact precedes the visitor boundary`,
    );
    assert.ok(
      footer.indexOf("data-visitor-boundary") < footer.indexOf("© 2003–2026"),
      `${route}: attribution closes the footer`,
    );

    if (route !== "404.html") {
      assert.match(
        source,
        /<script src="canvas-shell\.js" defer><\/script>/u,
        `${route}: shared footer runtime`,
      );
    }
  }
});

test("compact rail scrolling and transient readout paint retain separate owners", async () => {
  const source = await readFile(resolve(canvasRoot, "canvas-shell.css"), "utf8");
  const compact = blockAt(source, "@media screen and (max-width: 56rem)");
  const focusOwner = ".page-section-rail .page-section-rail__link:focus-visible";
  const compactList = blockAt(compact, ".page-section-rail ol");
  const compactReadout = blockAt(compact, ".page-section-rail__readout");
  const baseFocus = blockAt(source, focusOwner);
  const compactFocus = blockAt(compact, focusOwner);
  const reducedMotion = blockAt(source, "@media (prefers-reduced-motion: reduce)");
  const visibleReadout = blockAt(source, ".page-section-rail__readout.is-visible");
  const desktopBridge = blockAt(source, ".page-section-rail__readout::before");
  const compactBridge = blockAt(compact, ".page-section-rail__readout::before");

  assert.match(compactList, /overflow-y:\s*auto/u);
  assert.match(compactReadout, /display:\s*block/u);
  assert.match(compactReadout, /inset-inline:\s*calc\(100% \+ \.4rem\) auto/u);
  assert.match(compactReadout, /safe-area-inset-left/u);
  assert.match(compactReadout, /safe-area-inset-right/u);
  assert.match(baseFocus, /outline:\s*\.2rem solid/u);
  assert.match(compactFocus, /outline-offset:\s*-\.2rem/u);
  assert.match(reducedMotion, /\.page-section-rail__link,/u);
  assert.match(reducedMotion, /transition:\s*none !important/u);
  assert.match(visibleReadout, /pointer-events:\s*auto/u);
  assert.match(desktopBridge, /inset-inline-start:\s*100%/u);
  assert.match(compactBridge, /inset-inline:\s*auto 100%/u);
  assert.doesNotMatch(source, /page-section-rail__label/u);
});

test("the readout keeps hover persistence, Escape dismissal, and edge clamping in one state owner", async () => {
  const source = await readFile(resolve(canvasRoot, "canvas-shell.js"), "utf8");

  assert.match(source, /readout\.contains\(event\.relatedTarget\)/u);
  assert.match(source, /schedulePointerDeparture\(null\)/u);
  assert.match(source, /event\.key !== "Escape"/u);
  assert.match(source, /disclosureDismissed = true/u);
  assert.match(source, /dismissedPointerLink = pointerPreview/u);
  assert.doesNotMatch(source, /event\.(?:preventDefault|stopPropagation)\(\)/u);
  assert.match(source, /minimumCenter/u);
  assert.match(source, /maximumCenter/u);
  assert.match(source, /--page-section-rail-readout-paint-reserve/u);
  assert.match(source, /function cssLengthInPixels/u);
  assert.match(source, /\/rem\$\/i\.test\(value\)/u);
  assert.match(source, /function keepFocusPaintInsideList/u);
  assert.match(source, /outlineWidth \+ outlineOffset/u);
  assert.match(source, /Math\.ceil\(linkBox\.bottom - maximumBottom\)/u);
  assert.match(source, /keepFocusPaintInsideList\(link\)/u);
});
