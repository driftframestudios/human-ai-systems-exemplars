import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

const pair = {
  dark: ["var(--canvas-link-on-dark)", "var(--canvas-link-visited-on-dark)"],
  light: ["var(--canvas-link-on-light)", "var(--canvas-link-visited-on-light)"],
};

async function readCanvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function cssSource(source) {
  const styleBlocks = [...source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/giu)];
  const css = styleBlocks.length
    ? styleBlocks.map(match => match[1]).join("\n")
    : source;
  return css
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*@charset\s+[^;]+;\s*/iu, "");
}

function matchingBrace(source, openingIndex) {
  let depth = 0;
  let quote = null;

  for (let index = openingIndex; index < source.length; index += 1) {
    const character = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (character === quote && previous !== "\\") quote = null;
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error(`Unclosed CSS block beginning at character ${openingIndex}`);
}

function parseRules(rawSource) {
  const rules = [];

  function visit(source, atRules = []) {
    let cursor = 0;
    while (cursor < source.length) {
      const openingIndex = source.indexOf("{", cursor);
      if (openingIndex === -1) break;
      const prelude = source.slice(cursor, openingIndex).trim();
      const closingIndex = matchingBrace(source, openingIndex);
      const body = source.slice(openingIndex + 1, closingIndex);

      if (prelude.startsWith("@")) {
        visit(body, [...atRules, normalizeSelector(prelude)]);
      } else if (prelude) {
        rules.push({ selector: prelude, body, atRules });
      }
      cursor = closingIndex + 1;
    }
  }

  visit(cssSource(rawSource));
  return rules;
}

function normalizeSelector(selector) {
  return selector.replace(/\s+/gu, " ").trim();
}

function selectorList(selector) {
  const selectors = [];
  let current = "";
  let depth = 0;
  let quote = null;

  for (const character of selector) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      current += character;
    } else if (character === "(" || character === "[") {
      depth += 1;
      current += character;
    } else if (character === ")" || character === "]") {
      depth -= 1;
      current += character;
    } else if (character === "," && depth === 0) {
      selectors.push(normalizeSelector(current));
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) selectors.push(normalizeSelector(current));
  return selectors;
}

function rulesFor(source, selector) {
  const normalized = normalizeSelector(selector);
  return parseRules(source).filter(rule => selectorList(rule.selector).includes(normalized));
}

function declaration(rule, property) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = rule.body.match(
    new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;}]+)`, "iu"),
  );
  return match?.[1].trim() ?? null;
}

function assertRolePair(
  source,
  selector,
  expectedPair,
  label = selector,
  ruleFilter = () => true,
) {
  const candidates = rulesFor(source, selector).filter(ruleFilter);
  assert.ok(candidates.length > 0, `${label}: expected a matching CSS rule`);
  assert.ok(
    candidates.some(rule => (
      declaration(rule, "--canvas-link-color") === expectedPair[0]
      && declaration(rule, "--canvas-link-visited-color") === expectedPair[1]
    )),
    `${label}: expected the unvisited and visited roles in the same rule`,
  );
}

function isPrintRule(rule) {
  return rule.atRules.some(atRule => /^@media\s+print(?:\s|$)/u.test(atRule));
}

function hexDeclaration(rule, name) {
  const value = declaration(rule, name);
  assert.match(value ?? "", /^#[0-9a-f]{6}$/iu, `${name} must be a six-digit hex color`);
  return value;
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const linear = channels.map(channel => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function assertPairsMeet(colors, backgrounds, minimum, label) {
  for (const color of colors) {
    for (const background of backgrounds) {
      const ratio = contrastRatio(color, background);
      assert.ok(
        ratio >= minimum,
        `${label}: expected ${color} on ${background} to meet ${minimum}:1; observed ${ratio.toFixed(3)}:1`,
      );
    }
  }
}

test("shared visitor-link roles meet their known light and dark fields", async () => {
  const css = await readCanvasFile("expanded.css");
  const rootRule = rulesFor(css, ":root")[0];
  assert.ok(rootRule, "Expected an actual :root rule");

  const lightLinks = [
    hexDeclaration(rootRule, "--canvas-link-on-light"),
    hexDeclaration(rootRule, "--canvas-link-visited-on-light"),
  ];
  const darkLinks = [
    hexDeclaration(rootRule, "--canvas-link-on-dark"),
    hexDeclaration(rootRule, "--canvas-link-visited-on-dark"),
  ];

  assert.equal(declaration(rootRule, "--canvas-link-color"), pair.light[0]);
  assert.equal(declaration(rootRule, "--canvas-link-visited-color"), pair.light[1]);

  assertPairsMeet(lightLinks, [
    "#ffffff", "#fffdf8", "#fafafa", "#fff8e8", "#e6f5f5", "#4db8b3",
    "#92d1c0", "#79c9c6", "#ffd3d0", "#ff99ac", "#d9efea", "#cfe7f7",
    "#fff5de", "#fff7f4",
  ], 4.5, "light-field link palette");

  assertPairsMeet(darkLinks, [
    "#2855f3", "#153fbe", "#17345f", "#10254a", "#0f2147", "#071a35",
    "#111c2d", "#11151d", "#1f2421",
  ], 4.5, "dark-field link palette");

  assert.ok(
    rulesFor(css, "a").some(rule => declaration(rule, "color") === "var(--canvas-link-color)"),
    "base anchors consume the active unvisited role",
  );
  assert.ok(
    rulesFor(css, "a:visited").some(rule => declaration(rule, "color") === "var(--canvas-link-visited-color)"),
    "visited anchors consume the active visited role",
  );
  assert.ok(
    rulesFor(css, "a:is(:active, :hover)").some(
      rule => declaration(rule, "text-decoration-thickness") === ".14em",
    ),
    "hover and active states retain a non-color cue",
  );
  assert.doesNotMatch(css, /--canvas-link(?:-inverse|-visited)?\s*:/u);
  assert.doesNotMatch(css, /:is\(a,\s*a:visited\)/u);
  assert.doesNotMatch(css, /filter:\s*(?:none|brightness\()/u);
  assert.doesNotMatch(
    css,
    /\.content__container\.bg__adjust--lightsalmon\s+a:hover\s*\{[^}]*color\s*:/u,
    "the salmon surface keeps the shared hover cue instead of reverting to white text",
  );
});

test("painted surface owners carry complete active link-role pairs", async () => {
  const sources = Object.fromEntries(await Promise.all([
    "expanded.css",
    "styles/routes/debriefs.css",
    "styles/contracts/debrief-composition.css",
    "field-inspection.css",
    "fmi-lims-eln-replatforming.css",
    "styles/routes/genomic-viewer.css",
    "distributed-inspection-harness.html",
    "who-to-believe-reviews-platform.html",
    "narrative-execution-gap-research-atlas.html",
  ].map(async path => [path, await readCanvasFile(path)])));

  const darkOwners = [
    ["expanded.css", ".hero__container"],
    ["styles/routes/debriefs.css", ".debrief-system-summary"],
    ["styles/contracts/debrief-composition.css", ".debrief-composition-page .debrief-track--implementation"],
    ["field-inspection.css", ".field-inspection-implementation-field"],
    ["field-inspection.css", ".field-inspection-assurance-field"],
    ["fmi-lims-eln-replatforming.css", ".fmi-implementation-field"],
    ["styles/routes/genomic-viewer.css", ".genomic-implementation-field"],
    ["distributed-inspection-harness.html", ".inspection-implementation-field"],
    ["distributed-inspection-harness.html", ".inspection-implementation-field .inspection-beat"],
    ["narrative-execution-gap-research-atlas.html", ".neg-hero"],
    ["narrative-execution-gap-research-atlas.html", ".neg-band--ink"],
  ];
  for (const [path, selector] of darkOwners) {
    assertRolePair(sources[path], selector, pair.dark, `${path} ${selector}`);
  }

  const lightOwners = [
    ["expanded.css", "table"],
    ["expanded.css", ".cornerstone-definition"],
    ["expanded.css", ".interpretive-aside"],
    ["expanded.css", ".architecture-pair article"],
    ["expanded.css", ".cobalt-operating-field-cards article"],
    ["expanded.css", ".cobalt-operating-field"],
    ["expanded.css", ".repeatability-cards article"],
    ["expanded.css", ".implementation-moves article"],
    ["expanded.css", ".implementation-companion"],
    ["expanded.css", ".cobalt-operating-field__table"],
    ["expanded.css", ".cobalt-operating-field__aside"],
    ["styles/contracts/debrief-composition.css", ".debrief-composition-page .debrief-track--implementation .table-scroll"],
    ["field-inspection.css", ".field-inspection-implementation-field .implementation-companion"],
    ["field-inspection.css", ".field-inspection-implementation-field .table-scroll"],
    ["field-inspection.css", ".field-inspection-assurance-field .table-scroll"],
    ["field-inspection.css", ".field-inspection-evidence-boundary"],
    ["field-inspection.css", ".field-inspection-final-boundary"],
    ["fmi-lims-eln-replatforming.css", ".fmi-implementation-field .table-figure:not(.cobalt-operating-field__table)"],
    ["fmi-lims-eln-replatforming.css", ".fmi-evidence-planes"],
    ["distributed-inspection-harness.html", ".inspection-beat"],
    ["distributed-inspection-harness.html", ".inspection-card-grid article"],
    ["distributed-inspection-harness.html", ".inspection-cost-grid article"],
    ["distributed-inspection-harness.html", ".inspection-evidence-boundary"],
    ["distributed-inspection-harness.html", ".inspection-source-docket"],
    ["distributed-inspection-harness.html", ".inspection-interpretive-aside"],
    ["who-to-believe-reviews-platform.html", ".wtb-implementation-track .table-scroll"],
    ["narrative-execution-gap-research-atlas.html", ".neg-run-card"],
  ];
  for (const [path, selector] of lightOwners) {
    assertRolePair(sources[path], selector, pair.light, `${path} ${selector}`);
  }

  assertRolePair(
    sources["who-to-believe-reviews-platform.html"],
    ".wtb-implementation-track",
    ["#7ce5d8", pair.dark[1]],
    "WTB route-specific dark role",
  );
  assertRolePair(
    sources["who-to-believe-reviews-platform.html"],
    ".wtb-orientation-field",
    ["#fff8e8", pair.dark[1]],
    "WTB orientation role",
  );

  const missingReset = ".pale-chip { background: #fff; }";
  assert.throws(
    () => assertRolePair(missingReset, ".pale-chip", pair.light),
    /expected the unvisited and visited roles in the same rule/u,
    "the contract rejects a pale inset that inherits its dark parent's roles",
  );
  assertRolePair(
    `.pale-chip {
      --canvas-link-color: var(--canvas-link-on-light);
      --canvas-link-visited-color: var(--canvas-link-visited-on-light);
      background: #fff;
    }`,
    ".pale-chip",
    pair.light,
    "synthetic pale inset",
  );
});

test("print owners reset screen-dark roles when their backgrounds become white", async () => {
  const cases = [
    ["expanded.css", ".hero__container", pair.dark],
    ["styles/routes/debriefs.css", ".debrief-system-summary", pair.dark],
    ["styles/contracts/debrief-composition.css", ".debrief-composition-page .debrief-track--implementation", pair.dark],
    [
      "field-inspection.css",
      ".field-inspection-implementation-field",
      pair.dark,
      ".field-inspection-page :is(.field-inspection-implementation-field, .field-inspection-assurance-field)",
    ],
    [
      "field-inspection.css",
      ".field-inspection-assurance-field",
      pair.dark,
      ".field-inspection-page :is(.field-inspection-implementation-field, .field-inspection-assurance-field)",
    ],
    ["fmi-lims-eln-replatforming.css", ".fmi-implementation-field", pair.dark],
    [
      "styles/routes/genomic-viewer.css",
      ".genomic-implementation-field",
      pair.dark,
      ".genomic-viewer-page :is( .genomic-viewer-hero, .genomic-context-tree-feature, .genomic-solution-field, .genomic-implementation-field )",
    ],
    [
      "distributed-inspection-harness.html",
      ".inspection-implementation-field",
      pair.dark,
      ".distributed-inspection-page :is(.inspection-teaching-hero, .inspection-solution-field, .inspection-implementation-field)",
    ],
    ["who-to-believe-reviews-platform.html", ".wtb-orientation-field", ["#fff8e8", pair.dark[1]]],
    ["who-to-believe-reviews-platform.html", ".wtb-implementation-track", ["#7ce5d8", pair.dark[1]]],
    ["narrative-execution-gap-research-atlas.html", ".neg-hero", pair.dark],
    ["narrative-execution-gap-research-atlas.html", ".neg-band--ink", pair.dark],
  ];

  for (const [path, selector, screenPair, printSelector = selector] of cases) {
    const source = await readCanvasFile(path);
    assertRolePair(
      source,
      selector,
      screenPair,
      `${path} ${selector} screen`,
      rule => !isPrintRule(rule),
    );
    assertRolePair(
      source,
      printSelector,
      pair.light,
      `${path} ${selector} print`,
      isPrintRule,
    );
  }

  const misplacedReset = `@media screen {
    .dark-owner {
      --canvas-link-color: var(--canvas-link-on-light);
      --canvas-link-visited-color: var(--canvas-link-visited-on-light);
    }
  }`;
  assert.throws(
    () => assertRolePair(
      misplacedReset,
      ".dark-owner",
      pair.light,
      "misplaced print reset",
      isPrintRule,
    ),
    /expected a matching CSS rule/u,
    "a light reset outside @media print cannot satisfy the print contract",
  );
});

test("career cards retain translucent accents with readable foregrounds", async () => {
  const css = await readCanvasFile("styles/components/career-regulatory-slide.css");
  const careerRule = rulesFor(css, ".career-slide")[0];
  const cardInk = hexDeclaration(careerRule, "--career-card-ink");
  const copperInk = hexDeclaration(careerRule, "--career-copper-ink");

  // These are the no-blur composites of 15% white over the two accent fields.
  assertPairsMeet([cardInk], ["#68c3be", "#e1986a"], 4.5, "secondary career card");
  assertPairsMeet([copperInk], ["#f6fbfb"], 4.5, "primary-card number");
  assert.ok(
    rulesFor(css, ".accent-card--secondary").some(
      rule => declaration(rule, "color") === "var(--career-card-ink)",
    ),
  );
  assert.ok(
    rulesFor(css, ".accent-card__number--small").some(
      rule => declaration(rule, "color") === "inherit",
    ),
  );
});

test("route-specific gradients, table roles, and compact rails retain their evidence", async () => {
  const [distributed, whoToBelieve, shell, fmi] = await Promise.all([
    readCanvasFile("distributed-inspection-harness.html"),
    readCanvasFile("who-to-believe-reviews-platform.html"),
    readCanvasFile("canvas-shell.css"),
    readCanvasFile("fmi-lims-eln-replatforming.css"),
  ]);

  assertPairsMeet(
    ["#333333", "#1a1a2e", "#304a71"],
    ["#fdebe9", "#ffd3d0", "#f6e4df", "#f2ff67"],
    4.5,
    "WTB gradient field",
  );
  assertPairsMeet(["#7ce5d8"], ["#111c2d"], 4.5, "WTB implementation link");

  assert.ok(
    rulesFor(whoToBelieve, ".wtb-solution-track").some(
      rule => declaration(rule, "--canvas-ink-muted") === "#304a71",
    ),
    "the WTB gradient owner carries its muted foreground role",
  );
  assert.ok(
    rulesFor(distributed, ".inspection-implementation-field .table-scroll :is(th, td)")
      .some(rule => declaration(rule, "color") === "var(--inspection-ink)"),
    "distributed table cells keep their light-table ink",
  );
  assert.equal(
    rulesFor(distributed, ".inspection-implementation-field .table-scroll :is(caption, th, td)").length,
    0,
    "the caption remains on the dark field rather than inheriting table-cell ink",
  );

  for (const [source, selector, label] of [
    [shell, ".page-section-rail__link", "shared compact rail"],
    [fmi, ".fmi-reading-rail a", "FMI compact rail"],
  ]) {
    assert.ok(
      rulesFor(source, selector).some(rule => (
        declaration(rule, "block-size") === "1.5rem"
        && declaration(rule, "inline-size") === "1.5rem"
      )),
      `${label} provides a 24px by 24px target`,
    );
  }

  assert.ok(
    rulesFor(await readCanvasFile("expanded.css"), ".table-scroll > table > caption").some(
      rule => declaration(rule, "max-inline-size")
        === "calc(100vw - (2 * var(--canvas-page-gutter)))",
    ),
    "narrow table captions fit the initial scrollport while their data grids remain scrollable",
  );

  const genomic = await readCanvasFile("styles/routes/genomic-viewer.css");
  assert.doesNotMatch(
    genomic,
    /\.genomic-implementation-field\.cobalt-operating-field[\s\S]*?a\s*\{\s*color:\s*inherit/gu,
  );
  assert.doesNotMatch(
    whoToBelieve,
    /\.wtb-context-actions a\s*\{[^}]*color:/gu,
    "WTB context actions inherit screen and print roles from their painted owner",
  );
});
