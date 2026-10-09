import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const pagePath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/choose-your-player-humatics.html",
);
const cssPath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/expanded.css",
);
const videoUrl = "https://vik.guru/v1-cdn/video/choose-your-player/v0.1.0/movie.mp4";

function attribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return tag.match(new RegExp(`\\b${escapedName}(?:="([^"]*)")?`, "u"))?.[1] ?? null;
}

test("Choose Your Player presents one bounded progressive-video source receiver", async () => {
  const [html, css] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);
  const videos = Array.from(html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gu));
  assert.equal(videos.length, 1, "The Debrief carries one selected video receiver");
  const video = videos[0]?.[0];
  assert.ok(video, "The Humatics Debrief needs its accepted walkthrough video");

  const caseBriefEnd = html.indexOf("</section>", html.indexOf('id="case-brief"'));
  const walkthroughStart = html.indexOf('<section id="working-proxy-walkthrough"');
  const architectureNav = html.indexOf('<nav aria-labelledby="track-index-title">');
  assert.ok(caseBriefEnd >= 0 && walkthroughStart >= 0 && architectureNav >= 0);
  assert.ok(caseBriefEnd < walkthroughStart, "The walkthrough follows the complete Case Brief");
  assert.ok(walkthroughStart < architectureNav, "The walkthrough precedes architecture navigation");

  const openingTag = video.match(/<video\b[^>]*>/u)?.[0] ?? "";
  assert.match(openingTag, /\scontrols(?:\s|>)/u);
  assert.match(openingTag, /\splaysinline(?:\s|>)/u);
  assert.equal(attribute(openingTag, "preload"), "metadata");
  assert.equal(attribute(openingTag, "width"), "1920");
  assert.equal(attribute(openingTag, "height"), "1012");
  assert.equal(
    attribute(openingTag, "poster"),
    "https://vik.guru/v1-cdn/video/choose-your-player/v0.1.0/poster.webp",
  );
  assert.equal(attribute(openingTag, "aria-label"), "Choose Your Player working proxy walkthrough");
  assert.equal(
    attribute(openingTag, "aria-describedby"),
    "working-proxy-walkthrough-standing choose-your-player-interface-caption",
  );
  assert.equal(attribute(openingTag, "aria-details"), "choose-your-player-interface-transcript");
  assert.doesNotMatch(openingTag, /\b(?:autoplay|loop)\b/u);

  assert.match(
    video,
    new RegExp(`<source\\s+src="${videoUrl.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}"\\s+type="video/mp4">`, "u"),
  );
  assert.match(video, /Open the Choose Your Player interface walkthrough/u);
  assert.match(html, /id="choose-your-player-interface-caption"/u);
  assert.match(html, /id="choose-your-player-interface-transcript"/u);
  assert.match(html, /<strong>Working proxy walkthrough\.<\/strong>/u);
  for (const number of [1, 2, 3, 4, 5]) {
    assert.equal(
      (html.match(new RegExp(`<strong>Figure ${number}\\.<\\/strong>`, "gu")) ?? []).length,
      1,
      `The established Figure ${number} identity remains unique`,
    );
  }
  assert.match(html, /silent, company-neutral, IP-free 2026 working proxy/u);
  assert.match(html, /Visual description · silent walkthrough/u);
  assert.match(html, /Four proxy role cards lead into one shared site model/u);
  assert.match(html, /authenticated identity, active tenant membership, and entitlements govern access/u);
  assert.match(html, /Field Installation Engineer/u);
  assert.match(html, /Computer Vision Calibrator/u);
  assert.match(html, /global site-management table/u);
  assert.match(html, /Manufacturing Warehouse 009/u);
  assert.match(css, /\.story-visual\s+:is\(img, video\)\s*\{/u);
});
