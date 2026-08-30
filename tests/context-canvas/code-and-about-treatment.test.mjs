import assert from "node:assert/strict";
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

test("the About portrait is a bounded supporting mark with intrinsic dimensions", async () => {
  const [css, html] = await Promise.all([
    readCanvasFile("styles/routes/about.css"),
    readCanvasFile("index.html"),
  ]);
  const heroRule = cssRule(css, ".about-hero");
  const portraitRule = cssRule(css, ".about-portrait");
  const portraitImageRule = cssRule(css, ".about-portrait img");

  assert.equal(
    declarationValue(heroRule, "grid-template-columns"),
    "minmax(0, 1fr) max-content",
  );
  assert.equal(
    declarationValue(portraitRule, "inline-size"),
    "clamp(7.75rem, 11vw, 10rem)",
  );
  assert.equal(
    declarationValue(portraitRule, "margin-inline"),
    "clamp(-3.25rem, -4vw, -2rem) 0",
  );
  assert.equal(declarationValue(portraitImageRule, "block-size"), "auto");
  assert.match(
    html,
    /<figure class="about-portrait"><img src="portrait001\.jpg" width="2666" height="3556"/u,
  );
});
