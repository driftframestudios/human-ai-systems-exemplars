import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

const previewSources = new Map([
  ["catalog-genomic-viewer", "../img/debriefs/queue-secretly-status-machine/genomics-plate-viewer.webp"],
  ["catalog-clinical-trial", "../img/debriefs/sample-noone-could-find/lims-eln-lab-process-axonometric-visualization.webp"],
  ["catalog-ehr-integration", "../img/plot/ehr_discrete_result_contract_map.svg"],
  ["catalog-lims-eln", "../img/debriefs/sample-noone-could-find/lims-eln-process-mapping.webp"],
  ["catalog-humatics", "../img/debriefs/choose-your-player/robotics-map-setup.webp"],
  ["catalog-who-to-believe", "../img/plot/who_to_believe_influence_map.svg"],
  ["catalog-field-inspection", "../img/plot/inspection_platform_operating_map.svg"],
  ["catalog-distributed-inspection", "../img/plot/distributed_inspection_ten_beat_arc.svg"],
  ["catalog-three-way-return", "../img/plot/three_way_return_motion.svg"],
  ["catalog-structure-sensor", "../img/debriefs/spatial-capture/production-storyboard.webp"],
  ["catalog-langwhich", "../img/debriefs/multilingual-clinical-vocabulary/prototype-in-use.webp"],
  ["catalog-accessible-forms", "../img/debriefs/recoverable-enterprise-forms/complete-form-reference.webp"],
]);

const previewDimensions = new Map([
  ["catalog-genomic-viewer", ["5120", "2708"]],
  ["catalog-clinical-trial", ["5116", "2710"]],
  ["catalog-ehr-integration", ["1600", "1120"]],
  ["catalog-lims-eln", ["5114", "2710"]],
  ["catalog-humatics", ["5110", "2708"]],
  ["catalog-who-to-believe", ["1600", "1180"]],
  ["catalog-field-inspection", ["1600", "1200"]],
  ["catalog-distributed-inspection", ["1600", "1180"]],
  ["catalog-three-way-return", ["1600", "1120"]],
  ["catalog-structure-sensor", ["1440", "1080"]],
  ["catalog-langwhich", ["1440", "882"]],
  ["catalog-accessible-forms", ["700", "1250"]],
]);

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`, "u"));
  return match ? match[1] : "";
}

function cardBlock(html, cardId) {
  const start = html.indexOf(`<li id="${cardId}"`);
  assert.notEqual(start, -1, `${cardId} should exist`);
  const nextCard = html.indexOf('<li id="catalog-', start + 1);
  return html.slice(start, nextCard === -1 ? html.length : nextCard);
}

test("Full Debrief catalog cards declare reviewed responsive preview visuals", async () => {
  const html = await readFile(resolve(canvasRoot, "debriefs.html"), "utf8");

  for (const [cardId, expectedSrc] of previewSources) {
    const block = cardBlock(html, cardId);
    const openingTag = block.match(/^<li\b[^>]*>/u)?.[0] ?? "";
    const upfrontSrc = block.match(/<img class="project__upfront" src="([^"]+)"/u)?.[1] ?? "";
    const previewSrc = attribute(openingTag, "data-catalog-preview-src");
    const previewSrcset = attribute(openingTag, "data-catalog-preview-srcset");
    const [expectedWidth, expectedHeight] = previewDimensions.get(cardId);

    assert.equal(previewSrc, expectedSrc, `${cardId} should declare its chosen preview visual`);
    assert.notEqual(previewSrc, upfrontSrc, `${cardId} should preview a visual distinct from its catalog-card image`);
    assert.ok(attribute(openingTag, "data-catalog-preview-alt"), `${cardId} should describe its preview image`);
    assert.ok(attribute(openingTag, "data-catalog-preview-caption"), `${cardId} should explain the preview image`);
    assert.equal(attribute(openingTag, "data-catalog-preview-width"), expectedWidth, `${cardId} should declare its preview width`);
    assert.equal(attribute(openingTag, "data-catalog-preview-height"), expectedHeight, `${cardId} should declare its preview height`);
    await access(resolve(canvasRoot, previewSrc));

    for (const candidate of previewSrcset.split(/,\s*/u).filter(Boolean)) {
      const candidatePath = candidate.trim().split(/\s+/u)[0];
      await access(resolve(canvasRoot, candidatePath));
    }

    if (previewSrcset) {
      assert.ok(attribute(openingTag, "data-catalog-preview-sizes"), `${cardId} should give responsive candidates a sizes contract`);
    }
  }

  const articleTags = Array.from(html.matchAll(
    /<li id="catalog-[^"]+" class="project__media debrief-catalog__card"[^>]*data-formats="article"[^>]*>/gu,
  ), match => match[0]);
  assert.equal(articleTags.length, 7);
  for (const tag of articleTags) {
    assert.equal(attribute(tag, "data-catalog-preview-src"), "", "Article cards should keep their primary-image fallback");
  }

  assert.match(html, /<figcaption data-preview-caption>Preview visual from the selected reading\.<\/figcaption>/u);
  assert.match(html, /<img[^>]*width="1600"[^>]*height="1120"[^>]*data-preview-image>/u);
});

test("Catalog preview image selection falls back cleanly and clears stale responsive metadata", async () => {
  const script = await readFile(resolve(canvasRoot, "debriefs-catalog.js"), "utf8");

  assert.match(script, /var hasPreviewImage = card\.hasAttribute\("data-catalog-preview-src"\)/u);
  for (const attributeName of ["src", "srcset", "sizes", "width", "height"]) {
    assert.match(
      script,
      new RegExp(`hasPreviewImage \\? card\\.getAttribute\\("data-catalog-preview-${attributeName}"\\) : \\(image \\? image\\.getAttribute\\("${attributeName}"\\) : ""\\)`, "u"),
      `an explicit preview source should own ${attributeName} without inheriting primary-image metadata`,
    );
  }
  assert.match(script, /previewImage\.setAttribute\("alt", previewImageAlt\)/u);
  assert.match(script, /previewImage\.removeAttribute\("srcset"\)/u);
  assert.match(script, /previewImage\.removeAttribute\("sizes"\)/u);
  assert.match(script, /previewImage\.removeAttribute\("width"\)/u);
  assert.match(script, /previewImage\.removeAttribute\("height"\)/u);
  assert.match(script, /previewImage\.setAttribute\("width", previewImageWidth\)/u);
  assert.match(script, /previewImage\.setAttribute\("height", previewImageHeight\)/u);
  assert.match(script, /"Preview visual — " \+ previewImageCaption/u);
  assert.doesNotMatch(script, /"Primary visual — "/u);
});
