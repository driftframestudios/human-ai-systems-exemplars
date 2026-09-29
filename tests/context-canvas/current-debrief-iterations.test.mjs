import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

const routes = {
  spatial: "spatial-capture-collaborative-memory.html",
  language: "multilingual-clinical-vocabulary-practice.html",
  forms: "recoverable-enterprise-forms.html",
};

async function routeSource(route) {
  return readFile(resolve(canvasRoot, route), "utf8");
}

async function textSources(root) {
  const sources = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      sources.push(...await textSources(path));
    } else if (/\.(?:csv|html|js|json|md|xml)$/u.test(entry.name)) {
      sources.push(await readFile(path, "utf8"));
    }
  }
  return sources;
}

function scanFields(source) {
  const scan = source.match(/<dl class="debrief-at-glance">([\s\S]*?)<\/dl>/u)?.[1];
  assert.ok(scan, "Debrief carries the shared scan");
  return [...scan.matchAll(/<div><dt>([^<]+)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/gu)]
    .map(([, label, value]) => ({ label, value }));
}

test("the three current Debriefs use one six-field orientation grammar", async () => {
  const expectedLabels = [
    "Era",
    "Program setting",
    "Cohort",
    "Evidence reach",
    "Material pivot",
    "Outcome synopsis",
  ];

  for (const route of Object.values(routes)) {
    const source = await routeSource(route);
    assert.match(source, /<h2 id="scan-title" class="txt-h2">Six-field scan<\/h2>/u, route);
    const fields = scanFields(source);
    assert.equal(fields.length, 6, route);
    assert.deepEqual(fields.map(({ label }) => label), expectedLabels, route);
  }
});

test("source-era scale and material pivots stay explicit without becoming outcome claims", async () => {
  const [spatial, language, forms] = await Promise.all(
    Object.values(routes).map(routeSource),
  );

  assert.match(spatial, /Q1 2016/u);
  assert.match(spatial, /Four apprentices/u);
  assert.match(spatial, /more than twenty people/u);
  assert.match(spatial, /Dozens of interviews/u);
  assert.match(spatial, /several on-site settings/u);

  assert.match(language, /Q1 2016/u);
  assert.match(language, /Five usability participants/u);
  assert.match(language, /three sessions in detail/u);
  assert.match(language, /ratio slider[\s\S]*navigation to nowhere/u);
  assert.match(language, /parts-of-speech ordering/u);
  assert.match(language, /Hand-drawn onboarding illustrations/u);
  assert.match(language, /commercial effects remain local measurement questions/u);

  assert.match(forms, /Q2 2016/u);
  assert.match(forms, /cohort’s only front-end architecture-focused participant/u);
  assert.match(forms, /senior engineering mentor active in web-standards work/u);
  assert.match(forms, /conversion, accessibility, support, and payment outcomes remain local observations/u);
});

test("source-era rasters use the shared thumbnail grid and WebP delivery", async () => {
  const [spatial, language, forms] = await Promise.all(
    Object.values(routes).map(routeSource),
  );

  assert.equal((spatial.match(/class="debrief-image-grid table-span-all"/gu) || []).length, 1);
  assert.equal((language.match(/class="debrief-image-grid table-span-all"/gu) || []).length, 2);
  assert.equal((forms.match(/class="debrief-image-grid table-span-all"/gu) || []).length, 1);
  for (const source of [spatial, language, forms]) {
    assert.doesNotMatch(source, /class="debrief-image-grid table-span-all"(?! role="group")/u);
  }

  for (const [name, source] of Object.entries({ spatial, language, forms })) {
    const bodyImageSources = [...source.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gu)]
      .map(([, path]) => path);
    assert.ok(bodyImageSources.length > 0, name);
    for (const path of bodyImageSources) {
      assert.match(path, /\.(?:svg|webp)$/u, `${name}: ${path}`);
    }
    assert.doesNotMatch(source, /<img\b[^>]*\bsrc="[^"]+\.(?:jpg|jpeg|png)"/iu, name);
  }

  assert.match(language, /design-sprint-plan-480\.webp/u);
  assert.match(language, /prototype-in-use-480\.webp/u);
  assert.match(language, /learner-experience-map-480\.webp/u);
  assert.match(language, /concept-sketches-480\.webp/u);
  assert.match(language, /onboarding-prototype-480\.webp/u);
  assert.match(forms, /complete-form-reference-480\.webp/u);
  assert.match(forms, /payment-step-reference-480\.webp/u);
  assert.match(spatial, /discovery-wall-480\.webp/u);
  assert.match(spatial, /production-storyboard-480\.webp/u);
});

test("the form Debrief separates identifier integrity from authorization", async () => {
  const forms = await routeSource(routes.forms);
  const svg = await readFile(
    resolve(
      repositoryRoot,
      "context-canvas-project-surface/img/debriefs/recoverable-enterprise-forms/pan-identifier-validation-flow.svg",
    ),
    "utf8",
  );

  assert.match(forms, /PAN, is an identifier/u);
  assert.match(forms, /Number\.MAX_SAFE_INTEGER|9,007,199,254,740,991/u);
  assert.match(forms, /inputmode=&quot;numeric&quot;|inputmode="numeric"/u);
  assert.match(forms, /Unknown and Ambiguous as useful states/u);
  assert.match(forms, /iframe alone does not establish PCI compliance/u);
  assert.match(forms, /Luhn detects some entry errors; neither establishes authorization/u);

  assert.match(svg, /<svg[^>]*role="img"[^>]*aria-labelledby="title desc"/u);
  assert.match(svg, /<title id="title">[^<]+<\/title>/u);
  assert.match(svg, /<desc id="desc">[^<]+<\/desc>/u);
  assert.match(svg, /IIN \/ BIN/u);
  assert.match(svg, /Σ digits mod 10 = 0/u);
  assert.doesNotMatch(svg, /\b(?:\d[ -]?){12,19}\b/u, "SVG carries no card-number-like sequence");
});

test("the retired placeholder route has no remaining repository reference", async () => {
  const sources = (await Promise.all([
    textSources(canvasRoot),
    textSources(resolve(repositoryRoot, "deployment/cpanel")),
    textSources(resolve(repositoryRoot, "planning/context-canvas")),
    textSources(resolve(repositoryRoot, "threadkeeping")),
    textSources(resolve(repositoryRoot, "tools")),
  ])).flat();
  assert.doesNotMatch(sources.join("\n"), /exemplar-brief-exploration\.html/u);
});
