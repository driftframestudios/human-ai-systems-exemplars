import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

async function readCanvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function cssRule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = source.match(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`, "u"));
  assert.ok(match, `Expected ${selector} to have a CSS rule`);
  return match[1];
}

function declarationValue(rule, property) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = rule.match(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, "u"));
  assert.ok(match, `Expected ${property} declaration`);
  return match[1].trim();
}

function hexToRgb(hex) {
  const normalized = hex.slice(1);
  const expanded = normalized.length === 3
    ? normalized.split("").map(value => value.repeat(2)).join("")
    : normalized;
  assert.match(expanded, /^[0-9a-f]{6}$/iu);
  return [0, 2, 4].map(offset => Number.parseInt(expanded.slice(offset, offset + 2), 16));
}

function relativeLuminance(hex) {
  const channels = hexToRgb(hex).map(channel => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("shared inline code keeps a readable paper-and-ink treatment", async () => {
  const css = await readCanvasFile("expanded.css");
  const rootRule = cssRule(css, ":root");
  const codeRule = cssRule(css, "code");
  const blockCodeRule = cssRule(css, "pre > code");

  const ink = declarationValue(rootRule, "--canvas-ink");
  const paper = declarationValue(rootRule, "--canvas-paper-soft");

  assert.equal(declarationValue(codeRule, "color"), "var(--canvas-ink)");
  assert.equal(declarationValue(codeRule, "background-color"), "var(--canvas-paper-soft)");
  assert.equal(declarationValue(codeRule, "border"), "1px solid var(--canvas-rule)");
  assert.ok(
    contrastRatio(ink, paper) >= 4.5,
    `Expected ${ink} on ${paper} to meet 4.5:1 normal-text contrast`,
  );

  assert.equal(declarationValue(blockCodeRule, "background"), "transparent");
  assert.equal(declarationValue(blockCodeRule, "border"), "0");
  assert.equal(declarationValue(blockCodeRule, "color"), "inherit");
  assert.equal(declarationValue(blockCodeRule, "font-size"), "inherit");
  assert.equal(declarationValue(blockCodeRule, "padding"), "0");
});

test("route bundles leave bare inline-code appearance with the shared owner", async () => {
  const routeFiles = [
    "field-inspection.css",
    "styles/contracts/debrief-composition.css",
    "styles/routes/genomic-viewer.css",
    "styles/routes/hiring-surfaces.css",
  ];
  const routeCss = (await Promise.all(routeFiles.map(readCanvasFile))).join("\n");

  assert.doesNotMatch(routeCss, /implementation-field\s+code\s*\{/u);
  assert.doesNotMatch(routeCss, /debrief-track--implementation\s+code\s*\{/u);
  assert.doesNotMatch(routeCss, /function-word-table\s+code\s*\{/u);
  assert.doesNotMatch(routeCss, /:is\(a,\s*a:visited,\s*code\)/u);
});

test("the About hero keeps its initial composition with a local identity lockup", async () => {
  const [css, html] = await Promise.all([
    readCanvasFile("styles/routes/about.css"),
    readCanvasFile("index.html"),
  ]);
  const heroRule = cssRule(css, ".about-hero");
  const identityRule = cssRule(css, ".about-hero__identity");
  const headingRule = cssRule(css, ".about-hero h1");
  const portraitRule = cssRule(css, ".about-portrait");
  const portraitImageRule = cssRule(css, ".about-portrait img");

  assert.equal(
    declarationValue(heroRule, "grid-template-columns"),
    "minmax(0, 1.3fr) minmax(15rem, .7fr)",
  );
  assert.equal(declarationValue(heroRule, "gap"), "clamp(1.5rem, 5vw, 4rem)");
  assert.equal(
    declarationValue(identityRule, "grid-template-columns"),
    "max-content max-content",
  );
  assert.equal(
    declarationValue(identityRule, "column-gap"),
    "clamp(1.6875rem, calc(2vw + .1875rem), 2.6875rem)",
  );
  assert.equal(declarationValue(headingRule, "margin"), "0");
  assert.equal(
    declarationValue(portraitRule, "inline-size"),
    "clamp(7.75rem, 11vw, 10rem)",
  );
  assert.equal(declarationValue(portraitRule, "margin-inline"), "0");
  assert.equal(declarationValue(portraitImageRule, "block-size"), "auto");
  assert.match(
    html,
    /<div class="about-hero__identity"><h1 id="about-title"><span class="about-title__line">About<\/span> <span class="about-title__line about-title__line--name">Vikrant<\/span> <span class="about-title__line about-title__line--name">Kudesia<\/span><\/h1><figure class="about-portrait"><img src="portrait001\.jpg" width="2666" height="3556"/u,
  );
});

test("the About visual sequence begins as a still and loads motion after visitor action", async () => {
  const [css, html, script, gif, poster, source, generator] = await Promise.all([
    readCanvasFile("styles/routes/about.css"),
    readCanvasFile("index.html"),
    readCanvasFile("about-media.js"),
    readFile(resolve(
      repositoryRoot,
      "context-canvas-project-surface/img/media/impact-map-style-cycle-calm.gif",
    )),
    readFile(resolve(
      repositoryRoot,
      "context-canvas-project-surface/img/media/impact-map-style-cycle-poster.jpg",
    )),
    readFile(resolve(
      repositoryRoot,
      "collaboration/impact-map-visual-variants/movie/impact-map-style-cycle-movie.mp4",
    )),
    readFile(resolve(
      repositoryRoot,
      "collaboration/impact-map-visual-variants/movie/render_about_style_cycle_gif.py",
    ), "utf8"),
  ]);

  const section = html.match(
    /<section class="about-field about-field--ledger" aria-labelledby="background-title">.*?<\/section>/su,
  )?.[0];
  assert.ok(section, "Expected the first About ledger section");

  const headingEnd = section.indexOf("</h2>");
  const figureStart = section.indexOf('<figure class="about-media"');
  const firstProse = section.indexOf("<p>Twenty years");
  assert.ok(headingEnd < figureStart && figureStart < firstProse);
  assert.match(
    section,
    /src="\.\.\/img\/media\/impact-map-style-cycle-poster\.jpg"[^>]+data-motion-src="\.\.\/img\/media\/impact-map-style-cycle-calm\.gif"[^>]+data-motion-duration-ms="10000"[^>]+width="640" height="360"/u,
  );
  assert.match(
    section,
    /<button class="about-media__toggle" data-about-media-toggle type="button" aria-pressed="false" hidden>/u,
  );

  assert.equal(gif.subarray(0, 6).toString("ascii"), "GIF89a");
  assert.equal(gif.readUInt16LE(6), 640);
  assert.equal(gif.readUInt16LE(8), 360);
  assert.ok(gif.byteLength < 1_000_000, "Expected the landing GIF to remain below 1 MB");
  assert.equal(gif.includes(Buffer.from("NETSCAPE2.0", "ascii")), false);
  assert.equal(
    sha256(gif),
    "3cc27eda90c11583c30ca5a6a163be6a6799e97133a1785235657cf2ec79f514",
  );
  assert.equal(
    sha256(poster),
    "d616089f5e36b6616b6a989c0d3105340b25a23b0651270313146b5ec1b660fa",
  );
  assert.equal(
    sha256(source),
    "d839f2872c5bb88ddfb9483b1c58e484d4c4db374a918bfec217031453eba0dd",
  );
  assert.match(
    generator,
    /SOURCE_SHA256 = "d839f2872c5bb88ddfb9483b1c58e484d4c4db374a918bfec217031453eba0dd"/u,
  );

  assert.match(script, /button\.hidden = reducedMotion\.matches \|\| printMedia\.matches/u);
  assert.match(script, /button\.addEventListener\("click"/u);
  assert.match(script, /prefers-reduced-motion: reduce/u);
  assert.match(script, /window\.matchMedia\("print"\)/u);
  assert.match(script, /window\.setTimeout\(\(\) => setMotionState\(false\), motionDuration\)/u);
  assert.match(script, /window\.addEventListener\("beforeprint"/u);
  assert.match(script, /document\.addEventListener\("visibilitychange"/u);

  assert.match(css, /\.about-media\s*\{[^}]*inline-size:\s*min\(100%, 40rem\)/su);
  assert.match(css, /\.about-media__frame\s*\{[^}]*aspect-ratio:\s*16 \/ 9/su);
  assert.match(css, /\.about-media__toggle\[hidden\]\s*\{[^}]*display:\s*none/su);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.about-media/su);
  assert.match(css, /@media print[\s\S]*?\.about-media__toggle\s*\{[^}]*display:\s*none/su);
});
