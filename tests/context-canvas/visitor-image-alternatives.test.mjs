import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
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

function withoutComments(source) {
  return source.replace(/<!--[\s\S]*?-->/gu, "");
}

function attribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return tag.match(new RegExp(`\\b${escapedName}="([^"]*)"`, "u"))?.[1];
}

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

  assert.equal(imageCount, 161);
  assert.deepEqual(
    emptyAlternatives,
    ["debriefs.html:../img/plot/genomic_viewer_boundary_contract_map.svg"],
    "Only the scripted debrief preview begins with an empty alternative",
  );
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
