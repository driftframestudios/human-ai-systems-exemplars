import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import test from "node:test";

import { inspectImageDimensions } from "../../tools/build-prod-projection.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);
const debriefImageRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/img/debriefs",
);

const repeatedImageAlternatives = new Map([
  [
    "../img/plot/random_cut_forest.svg",
    "A changing event stream passes through Random Cut Forest partitions, opens a written “Look Here” anomaly state, and routes the source event to a named human reviewer.",
  ],
  [
    "../img/plot/random_cut_isolation_forest.svg",
    "Random Cut Forest and Isolation Forest compare streaming shape change with batch sparsity, then route both findings through context, human review, and an audit trail.",
  ],
  [
    "../img/plot/ai_legible_viewlet_svg_companion.svg",
    "Five stages carry an event from observation through context and review to an accountable human–AI handoff and a recoverable audit trail.",
  ],
  [
    "forms_upfront.png",
    "Step three of a payment form shows card number, security code, expiration date, and a Create your portfolio button.",
  ],
  [
    "langwhich_upfront.png",
    "Two LangWhich prototype screens showing learner-selected English and Spanish clinical vocabulary views.",
  ],
  [
    "../img/plot/structure_sensor_3_angled.webp",
    "A current black Structure Sensor 3 shown at an angle.",
  ],
]);

const socialImageAlternatives = new Map([
  ["index.html", "Portrait of Vikrant Kudesia, smiling."],
  ["debriefs.html", "Handwritten troubleshooting notes, system diagrams, a pen, and crumpled paper spread across a desk."],
  ["exemplar-gallery-list.html", "Handwritten troubleshooting notes, system diagrams, a pen, and crumpled paper spread across a desk."],
  ["spatial-capture-collaborative-memory.html", "A recurring coordination job moves through capture authority, an immutable source, task-fitted spatial representations, fitness evidence, role review, correction, and reuse."],
  ["multilingual-clinical-vocabulary-practice.html", "Katarina learner situation model showing established nursing knowledge, English terminology mapping, commute, classroom, home and supervised-preparation contexts, learner-chosen language support, and distinct educator, terminology and licensure authority routes."],
  ["recoverable-enterprise-forms.html", "A person’s purpose moves through semantic HTML, understandable state, typed validation and recovery, a replay-safe service command, a provider boundary, and a durable receipt and support route."],
  ["exemplar-index-landing.html", "A handwritten customer-support journey map sits beside a sketched person and a cup of tea."],
  ["exemplar-ideal-debrief.html", "An abstract pink contour visualization radiates from a small central point."],
  ["exemplar-maximal-debrief.html", "An abstract pink contour visualization radiates from a small central point."],
  ["exemplar-maximal-information-radiator.html", "An abstract pink contour visualization radiates from a small central point."],
]);

const debriefProxyContracts = [
  {
    route: "fmi-clinical-trial-coordination.html",
    directory: "boolean-building-blocks",
    publicSafePatterns: [/synthetic, de-identified specimen scenarios/iu],
  },
  {
    route: "choose-your-player-humatics.html",
    directory: "choose-your-player",
    publicSafePatterns: [/company-neutral, IP-free 2026 interface/iu, /synthetic/iu],
  },
  {
    route: "genomic-viewer-replatforming.html",
    directory: "queue-secretly-status-machine",
    publicSafePatterns: [/original code and synthetic\s+specimen/iu],
  },
  {
    route: "fmi-lims-eln-replatforming.html",
    directory: "sample-noone-could-find",
    publicSafePatterns: [/generalized workflows and\s+synthetic content/iu],
  },
  {
    route: "who-to-believe-reviews-platform.html",
    directory: "who-to-believe",
    publicSafePatterns: [/fictional\s+content/iu],
  },
];

function withoutComments(source) {
  return source.replace(/<!--[\s\S]*?-->/gu, "");
}

function attribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return tag.match(new RegExp(`\\b${escapedName}="([^"]*)"`, "u"))?.[1];
}

const rasterMediaTypes = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

async function parentRoutes() {
  return (await readdir(canvasRoot, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith(".html"))
    .map(entry => entry.name)
    .filter(route => route !== "conditioning-field.html")
    .sort();
}

test("parent visitor images carry a legible text relationship", async () => {
  const emptyAlternatives = [];
  let imageCount = 0;

  for (const route of await parentRoutes()) {
    const html = withoutComments(await readFile(join(canvasRoot, route), "utf8"));
    for (const match of html.matchAll(/<img\b[^>]*>/gu)) {
      const tag = match[0];
      const alt = attribute(tag, "alt");
      const src = attribute(tag, "src");
      imageCount += 1;

      assert.notEqual(alt, undefined, `${route}: ${src} needs an alt attribute`);
      if (alt === "") emptyAlternatives.push(`${route}:${src}`);

      const expected = repeatedImageAlternatives.get(src);
      if (expected) assert.equal(alt, expected, `${route}: ${src}`);
    }
  }

  assert.equal(imageCount, 203);
  assert.deepEqual(
    emptyAlternatives,
    ["debriefs.html:../img/plot/genomic_viewer_boundary_contract_map.svg"],
    "Only the scripted debrief preview begins with an empty alternative",
  );
});

test("Who To Believe figures preserve the intended narrative sequence", async () => {
  const html = withoutComments(await readFile(
    join(canvasRoot, "who-to-believe-reviews-platform.html"),
    "utf8",
  ));
  const orderedLandmarks = [
    'id="case-brief"',
    'id="wtb-figure-member-experience-redesigned"',
    'id="cpg-pharma-conversational-ai-walkthrough"',
    'id="solution-debrief-title"',
    'id="wtb-figure-member-experience-before"',
    'id="solution-bottleneck-title"',
    'id="wtb-figure-service-model-before"',
    'id="solution-intervention-title"',
    'id="wtb-figure-concept-matrix"',
    'id="wtb-figure-service-model-after"',
    'id="solution-outcomes-title"',
    'id="implementation-bottleneck-title"',
    'id="wtb-figure-dual-stack-system"',
    'id="implementation-intervention-title"',
  ];
  const positions = orderedLandmarks.map(landmark => {
    const position = html.indexOf(landmark);
    assert.notEqual(position, -1, `Missing narrative landmark ${landmark}`);
    return position;
  });

  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(
      positions[index] > positions[index - 1],
      `${orderedLandmarks[index]} follows ${orderedLandmarks[index - 1]}`,
    );
  }
});

test("static top-level raster carriers declare byte-matched intrinsic geometry", async () => {
  let rasterCount = 0;

  for (const route of await parentRoutes()) {
    const routePath = join(canvasRoot, route);
    const html = withoutComments(await readFile(routePath, "utf8"));
    for (const match of html.matchAll(/<img\b[^>]*>/gu)) {
      const tag = match[0];
      const src = attribute(tag, "src");
      if (!src || /^(?:data:|https?:|\/\/)/iu.test(src)) continue;

      const sourcePath = src.split(/[?#]/u)[0];
      const mediaType = rasterMediaTypes.get(extname(sourcePath).toLowerCase());
      if (!mediaType) continue;

      const label = `${route}: ${src}`;
      const width = Number(attribute(tag, "width"));
      const height = Number(attribute(tag, "height"));
      assert.ok(Number.isInteger(width) && width > 0, `${label} intrinsic width`);
      assert.ok(Number.isInteger(height) && height > 0, `${label} intrinsic height`);

      const bytes = await readFile(resolve(dirname(routePath), sourcePath));
      const intrinsic = inspectImageDimensions(bytes, mediaType, label);
      assert.equal(width, intrinsic.width, `${label} width matches source bytes`);
      assert.equal(height, intrinsic.height, `${label} height matches source bytes`);
      rasterCount += 1;
    }
  }

  assert.ok(rasterCount > 0, "Expected top-level raster image carriers");
});

test("curated social previews describe the pictured subject", async () => {
  for (const [route, expected] of socialImageAlternatives) {
    const html = await readFile(join(canvasRoot, route), "utf8");
    assert.ok(
      html.includes(`<meta property="og:image:alt" content="${expected}">`),
      `${route}: Open Graph alternative`,
    );
    assert.ok(
      html.includes(`<meta name="twitter:image:alt" content="${expected}">`),
      `${route}: Twitter alternative`,
    );
    if (route !== "index.html") {
      assert.ok(
        html.includes(`"caption": "${expected}"`),
        `${route}: structured image caption`,
      );
    }
  }
});

test("former placeholder alternatives stay out of parent visitor surfaces", async () => {
  const source = (await Promise.all(
    (await parentRoutes()).map(route => readFile(join(canvasRoot, route), "utf8")),
  )).join("\n");

  assert.doesNotMatch(source, /alt="Forms upfront"/u);
  assert.doesNotMatch(source, /alt="Persona types"/u);
  assert.doesNotMatch(source, /role="img" aria-label="Decorative falling leaves"/u);
});

test("working Debrief systems preserve standing, figure identity, responsive sources, and full-size inspection", async () => {
  for (const { route, directory, publicSafePatterns } of debriefProxyContracts) {
    const html = withoutComments(await readFile(join(canvasRoot, route), "utf8"));
    assert.match(html, /working/iu, `${route}: working-system standing`);
    assert.match(html, /2026/iu, `${route}: contemporary standing`);
    for (const pattern of publicSafePatterns) {
      assert.match(html, pattern, `${route}: route-specific public-safe content standing`);
    }
    const figures = Array.from(html.matchAll(
      /<figure\b[^>]*class="[^"]*\bdebrief-proxy-figure\b[^"]*"[^>]*>([\s\S]*?)<\/figure>/gu,
    ), match => match[0]);
    const originals = (await readdir(join(debriefImageRoot, directory)))
      .filter(name => name.endsWith(".webp") && !/-(?:960|1920)\.webp$/u.test(name))
      .sort();
    assert.equal(figures.length, originals.length, `${route}: every accepted source has one proxy figure`);

    const figureIds = new Set();
    for (const [index, figure] of figures.entries()) {
      const figureTag = figure.match(/<figure\b[^>]*>/u)?.[0] ?? "";
      const figureId = attribute(figureTag, "id");
      assert.ok(figureId, `${route}: Figure ${index + 1} needs a stable semantic id`);
      assert.ok(!figureIds.has(figureId), `${route}: ${figureId} must be unique`);
      figureIds.add(figureId);
      assert.match(
        figure,
        new RegExp(`<figcaption\\b[\\s\\S]*?<strong>\\s*Figure ${index + 1}\\.`, "u"),
        `${route}: proxy figures need page-local sequential labels`,
      );
    }

    for (const filename of originals) {
      const basename = filename.replace(/\.webp$/u, "");
      const original = `../img/debriefs/${directory}/${basename}.webp`;
      const figure = figures.find(candidate => candidate.includes(`href="${original}"`));
      assert.ok(figure, `${route}: ${basename} needs a full-size source link`);
      const frameTag = figure.match(/<div\b[^>]*class="[^"]*\bdebrief-proxy-frame\b[^"]*"[^>]*>/u)?.[0] ?? "";

      const imageTag = figure.match(/<img\b[^>]*>/u)?.[0] ?? "";
      const width = Number(attribute(imageTag, "width"));
      const height = Number(attribute(imageTag, "height"));
      assert.equal(attribute(imageTag, "src"), original, `${route}: ${basename} source`);
      assert.ok(Number.isInteger(width) && width > 1920, `${route}: ${basename} intrinsic width`);
      assert.ok(Number.isInteger(height) && height > 0, `${route}: ${basename} intrinsic height`);
      assert.equal(
        attribute(frameTag, "class")?.includes("debrief-proxy-frame--portrait"),
        height > width,
        `${route}: ${basename} portrait treatment`,
      );
      if (height > width) {
        assert.equal(attribute(frameTag, "role"), undefined, `${route}: ${basename} fitted portrait role`);
        assert.equal(attribute(frameTag, "tabindex"), undefined, `${route}: ${basename} fitted portrait focus`);
      } else {
        assert.equal(attribute(frameTag, "role"), "region", `${route}: ${basename} scroll-boundary role`);
        assert.equal(attribute(frameTag, "tabindex"), "0", `${route}: ${basename} keyboard-scroll boundary`);
        assert.ok(attribute(frameTag, "aria-label")?.length > 20, `${route}: ${basename} scroll-boundary name`);
      }
      assert.equal(attribute(imageTag, "loading"), "lazy", `${route}: ${basename} loading`);
      assert.equal(attribute(imageTag, "decoding"), "async", `${route}: ${basename} decoding`);
      assert.ok(attribute(imageTag, "alt")?.length > 40, `${route}: ${basename} needs a meaningful alternative`);
      assert.ok(attribute(imageTag, "sizes"), `${route}: ${basename} sizes`);
      assert.equal(
        attribute(imageTag, "srcset"),
        `${original.replace(/\.webp$/u, "-960.webp")} 960w, ${original.replace(/\.webp$/u, "-1920.webp")} 1920w, ${original} ${width}w`,
        `${route}: ${basename} responsive source set`,
      );
      await access(join(debriefImageRoot, directory, `${basename}-960.webp`));
      await access(join(debriefImageRoot, directory, `${basename}-1920.webp`));
      assert.match(figure, /<figcaption\b[\s\S]{80,}?<\/figcaption>/iu, `${route}: ${basename} narrative caption`);
    }
  }
});
