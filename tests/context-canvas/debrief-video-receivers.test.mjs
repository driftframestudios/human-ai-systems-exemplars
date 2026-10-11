import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canvasRoot = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas",
);

const receivers = [
  {
    page: "fmi-clinical-trial-coordination.html",
    family: "clinical-trial-boolean-builder",
    width: "1920",
    height: "976",
    accessibleName: "Clinical-trial Boolean cohort builder walkthrough",
    standingId: "clinical-trial-boolean-builder-standing",
    captionId: "clinical-trial-boolean-builder-caption",
    transcriptId: "clinical-trial-boolean-builder-transcript",
    before: 'id="case-brief"',
    after: '<nav class="debrief-reading-path"',
  },
  {
    page: "fmi-lims-eln-replatforming.html",
    family: "genomics-sequencing-process",
    width: "1920",
    height: "1010",
    accessibleName: "Genomics sequencing-process walkthrough",
    standingId: "genomics-sequencing-process-standing",
    captionId: "genomics-sequencing-process-caption",
    transcriptId: "genomics-sequencing-process-transcript",
    before: 'id="case-brief"',
    after: 'id="solution-architecture-title"',
  },
  {
    page: "genomic-viewer-replatforming.html",
    family: "genomics-specimen-qa-biomarker",
    width: "1920",
    height: "1010",
    accessibleName: "Genomics specimen, quality, and biomarker walkthrough",
    standingId: "genomics-specimen-qa-biomarker-standing",
    captionId: "genomics-specimen-qa-biomarker-caption",
    transcriptId: "genomics-specimen-qa-biomarker-transcript",
    before: 'id="case-brief"',
    after: '<nav aria-labelledby="track-index-title">',
  },
  {
    page: "genomic-viewer-replatforming.html",
    family: "genomics-responsive-interface",
    width: "1920",
    height: "980",
    accessibleName: "Genomics responsive-interface walkthrough",
    standingId: "genomics-responsive-interface-standing",
    captionId: "genomics-responsive-interface-caption",
    transcriptId: "genomics-responsive-interface-transcript",
    before: 'id="implementation-architecture-title"',
    after: 'id="genomic-validation-lanes"',
  },
  {
    page: "genomic-viewer-replatforming.html",
    family: "genomics-permissions",
    width: "1920",
    height: "1010",
    accessibleName: "Genomics permissions and failure-state walkthrough",
    standingId: "genomics-permissions-standing",
    captionId: "genomics-permissions-caption",
    transcriptId: "genomics-permissions-transcript",
    before: "Server-side permission checks preserved the authorization boundary",
    after: 'id="genomic-connection-health"',
  },
];

function attribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return tag.match(new RegExp(`\\b${escapedName}(?:="([^"]*)")?`, "u"))?.[1] ?? null;
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

test("five Debrief receivers present accepted silent walkthroughs at their reading coordinates", async () => {
  const pages = new Map();
  for (const receiver of receivers) {
    if (!pages.has(receiver.page)) {
      pages.set(receiver.page, await readFile(resolve(canvasRoot, receiver.page), "utf8"));
    }
  }

  for (const receiver of receivers) {
    const html = pages.get(receiver.page);
    const movieUrl = `https://vik.guru/v1-cdn/video/${receiver.family}/v0.1.0/movie.mp4`;
    const posterUrl = `https://vik.guru/v1-cdn/video/${receiver.family}/v0.1.0/poster.webp`;
    const videos = Array.from(html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gu)).map(
      match => match[0],
    );
    const matchingVideos = videos.filter(video => video.includes(movieUrl));
    assert.equal(
      matchingVideos.length,
      1,
      `${receiver.page} carries one ${receiver.family} receiver`,
    );

    const video = matchingVideos[0];
    const openingTag = video.match(/<video\b[^>]*>/u)?.[0] ?? "";
    assert.match(openingTag, /\scontrols(?:\s|>)/u);
    assert.match(openingTag, /\splaysinline(?:\s|>)/u);
    assert.equal(attribute(openingTag, "preload"), "metadata");
    assert.equal(attribute(openingTag, "width"), receiver.width);
    assert.equal(attribute(openingTag, "height"), receiver.height);
    assert.equal(attribute(openingTag, "poster"), posterUrl);
    assert.equal(attribute(openingTag, "aria-label"), receiver.accessibleName);
    assert.equal(
      attribute(openingTag, "aria-describedby"),
      `${receiver.standingId} ${receiver.captionId}`,
    );
    assert.equal(attribute(openingTag, "aria-details"), receiver.transcriptId);
    assert.doesNotMatch(openingTag, /\b(?:autoplay|loop)\b/u);
    assert.match(
      video,
      new RegExp(
        `<source\\s+src="${escapeRegularExpression(movieUrl)}"\\s+type="video/mp4">`,
        "u",
      ),
    );
    assert.match(
      video,
      new RegExp(`<p><a href="${escapeRegularExpression(movieUrl)}">Open the `, "u"),
    );

    const standingIndex = html.indexOf(`id="${receiver.standingId}"`);
    const videoIndex = html.indexOf(movieUrl, standingIndex);
    const captionIndex = html.indexOf(`id="${receiver.captionId}"`, videoIndex);
    const transcriptIndex = html.indexOf(`id="${receiver.transcriptId}"`, captionIndex);
    assert.ok(standingIndex >= 0, `${receiver.family} names its visible standing`);
    assert.ok(videoIndex > standingIndex, `${receiver.family} follows its visible standing`);
    assert.ok(captionIndex > videoIndex, `${receiver.family} carries a visible caption`);
    assert.ok(transcriptIndex > captionIndex, `${receiver.family} carries a visual sequence`);

    const transcript = html.match(
      new RegExp(
        `<aside\\s+id="${escapeRegularExpression(receiver.transcriptId)}"[\\s\\S]*?<\\/aside>`,
        "u",
      ),
    )?.[0];
    assert.ok(transcript, `${receiver.family} keeps the visual description in an aside`);
    assert.match(transcript, /Visual description · silent walkthrough/u);
    assert.ok(
      (transcript.match(/<li>/gu) ?? []).length >= 4,
      `${receiver.family} describes the ordered silent sequence`,
    );

    const beforeIndex = html.indexOf(receiver.before);
    const afterIndex = html.indexOf(receiver.after, beforeIndex + receiver.before.length);
    assert.ok(beforeIndex >= 0 && afterIndex >= 0, `${receiver.family} placement anchors exist`);
    assert.ok(
      beforeIndex < videoIndex && videoIndex < afterIndex,
      `${receiver.family} occupies its intended reading coordinate`,
    );
  }

  assert.equal(
    Array.from(pages.get("fmi-clinical-trial-coordination.html").matchAll(/<video\b/gu)).length,
    1,
    "the clinical-trial Debrief carries one video receiver",
  );
  assert.equal(
    Array.from(pages.get("fmi-lims-eln-replatforming.html").matchAll(/<video\b/gu)).length,
    1,
    "the LIMS/ELN Debrief carries one video receiver",
  );
  assert.equal(
    Array.from(pages.get("genomic-viewer-replatforming.html").matchAll(/<video\b/gu)).length,
    3,
    "the genomic-viewer Debrief carries three selected video receivers",
  );
});
