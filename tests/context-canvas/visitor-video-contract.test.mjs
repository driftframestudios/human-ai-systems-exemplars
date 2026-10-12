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
const whoToBelievePagePath = resolve(
  repositoryRoot,
  "context-canvas-project-surface/context-canvas/who-to-believe-reviews-platform.html",
);

const whoToBelieveVideoReceivers = [
  {
    family: "cpg-pharma-conversational-ai",
    width: "1154",
    height: "1080",
    accessibleName: "Guided review and safety-reporting demonstration",
    standingId: "cpg-pharma-conversational-ai-standing",
    captionId: "cpg-pharma-conversational-ai-caption",
    transcriptId: "cpg-pharma-conversational-ai-transcript",
    before: 'id="wtb-figure-member-experience-redesigned"',
    after: 'id="solution-architecture-title"',
  },
  {
    family: "cpg-pharma-menu-bottleneck",
    width: "1472",
    height: "1080",
    accessibleName: "Historical navigation bottleneck demonstration",
    standingId: "cpg-pharma-menu-bottleneck-standing",
    captionId: "cpg-pharma-menu-bottleneck-caption",
    transcriptId: "cpg-pharma-menu-bottleneck-transcript",
    before: 'id="return-title"',
    after: 'id="marketing-misread-title"',
  },
];
const coreArchitectureReceivers = [
  {
    page: "concept-nursery.html",
    family: "cross-channel-integration",
    label: "Shared Surface Priority Map prototype demonstration",
    describedBy: "shared-surface-walkthrough-standing shared-surface-walkthrough-caption",
    details: "shared-surface-walkthrough-sequence",
    anchor: "https://iframes.vik.guru/v1/core/cross-channel-blueprint/",
    next: '<section aria-labelledby="wiki-memory-title">',
    sequenceTitle: "A coordination heatmap opens into its shared records",
  },
  {
    page: "poda.html",
    family: "poda-cpg-pharma",
    label: "PODA review-safety prototype demonstration",
    describedBy: "poda-walkthrough-standing poda-walkthrough-caption",
    details: "poda-walkthrough-sequence",
    anchor: "https://iframes.vik.guru/v1/core/poda/",
    next: '<article class="prose-flow" aria-labelledby="investment-title">',
    sequenceTitle: "Four zones become one inspectable handoff",
  },
  {
    page: "grammar-family.html",
    family: "strategy-canvas-product-leadership",
    label: "Strategy Canvas product-leadership prototype demonstration",
    describedBy: "strategy-canvas-walkthrough-standing strategy-canvas-walkthrough-caption",
    details: "strategy-canvas-walkthrough-sequence",
    anchor: "https://iframes.vik.guru/v1/core/strategy-canvas/",
    next: '<article class="prose-flow" aria-labelledby="small-multiples-title">',
    sequenceTitle: "Separate readings become a revisable strategy scenario",
  },
  {
    page: "metadata-blocks.html",
    family: "threadkeeping-cpg-pharma",
    label: "Threadkeeping review-platform prototype demonstration",
    describedBy: "threadkeeping-walkthrough-standing threadkeeping-walkthrough-caption",
    details: "threadkeeping-walkthrough-sequence",
    anchor: "https://iframes.vik.guru/v1/canvas/threadkeeping-ledger/",
    next: '<article class="prose-flow" aria-labelledby="scan-contract-title">',
    sequenceTitle: "Two decisions move from Now–Next–Later into a continuity handoff",
  },
];

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
  assert.ok(video, "The Humatics Debrief needs its accepted demonstration video");

  const orientationStart = html.indexOf('class="debrief-quote debrief-quote--orientation"');
  const demonstrationStart = html.indexOf('<section id="working-proxy-walkthrough"');
  const architectureNav = html.indexOf('<nav aria-labelledby="track-index-title">');
  assert.ok(orientationStart >= 0 && demonstrationStart >= 0 && architectureNav >= 0);
  assert.ok(orientationStart < demonstrationStart, "The demonstration follows the opening architectural reading");
  assert.ok(demonstrationStart < architectureNav, "The demonstration precedes architecture navigation");

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
  assert.equal(attribute(openingTag, "aria-label"), "Choose Your Player role-based interface demonstration");
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
  assert.match(video, /Open movie video file \(MP4\)/u);
  assert.match(html, /id="choose-your-player-interface-caption"/u);
  assert.match(html, /id="choose-your-player-interface-transcript"/u);
  assert.match(html, /<strong>Choose Your Player role-based interface demonstration\.<\/strong>/u);
  for (const number of [1, 2, 3, 4, 5]) {
    assert.equal(
      (html.match(new RegExp(`<strong>Figure ${number}\\.<\\/strong>`, "gu")) ?? []).length,
      1,
      `The established Figure ${number} identity remains unique`,
    );
  }
  assert.match(html, /company-neutral, IP-free 2026 interface is a contemporary expression/u);
  assert.match(html, /Visual description/u);
  assert.match(html, /Four role cards lead into one shared site model/u);
  assert.match(html, /authenticated identity, active tenant membership, and entitlements govern access/u);
  assert.match(html, /Field Installation Engineer/u);
  assert.match(html, /Computer Vision Calibrator/u);
  assert.match(html, /global site-management table/u);
  assert.match(html, /Manufacturing Warehouse 009/u);
  assert.match(css, /\.story-visual\s+:is\(img, video\)\s*\{/u);
});

test("Who To Believe presents two bounded video receivers at their reading coordinates", async () => {
  const html = await readFile(whoToBelievePagePath, "utf8");
  const videos = Array.from(html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gu)).map(
    match => match[0],
  );
  assert.equal(videos.length, 2, "The Debrief carries its two selected demonstrations");

  for (const receiver of whoToBelieveVideoReceivers) {
    const movieUrl = `https://vik.guru/v1-cdn/video/${receiver.family}/v0.1.0/movie.mp4`;
    const posterUrl = `https://vik.guru/v1-cdn/video/${receiver.family}/v0.1.0/poster.webp`;
    const matchingVideos = videos.filter(video => video.includes(movieUrl));
    assert.equal(matchingVideos.length, 1, `${receiver.family} has one native receiver`);

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
        `<source\\s+src="${movieUrl.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}"\\s+type="video/mp4">`,
        "u",
      ),
    );
    assert.match(video, /<p><a href="https:\/\/vik\.guru\/v1-cdn\/video\//u);

    const standingIndex = html.indexOf(`id="${receiver.standingId}"`);
    const videoIndex = html.indexOf(movieUrl, standingIndex);
    const captionIndex = html.indexOf(`id="${receiver.captionId}"`, videoIndex);
    const transcriptIndex = html.indexOf(`id="${receiver.transcriptId}"`, captionIndex);
    assert.ok(standingIndex >= 0, `${receiver.family} names its standing`);
    assert.ok(videoIndex > standingIndex, `${receiver.family} follows its standing`);
    assert.ok(captionIndex > videoIndex, `${receiver.family} carries a visible caption`);
    assert.ok(transcriptIndex > captionIndex, `${receiver.family} carries a visual sequence`);

    const transcript = html.match(
      new RegExp(`<aside\\s+id="${receiver.transcriptId}"[\\s\\S]*?<\\/aside>`, "u"),
    )?.[0];
    assert.ok(transcript, `${receiver.family} keeps its visual sequence in an aside`);
    assert.match(transcript, /Visual description/u);
    assert.ok(
      (transcript.match(/<li>/gu) ?? []).length >= 4,
      `${receiver.family} describes at least four ordered moments`,
    );

    const beforeIndex = html.indexOf(receiver.before);
    const afterIndex = html.indexOf(receiver.after, beforeIndex + receiver.before.length);
    assert.ok(beforeIndex >= 0 && afterIndex >= 0, `${receiver.family} placement anchors exist`);
    assert.ok(
      beforeIndex < videoIndex && videoIndex < afterIndex,
      `${receiver.family} occupies its intended reading coordinate`,
    );
  }

  assert.match(html, /2026 demonstration uses fictional company, product, and account details/u);
  assert.match(html, /guided product review/u);
  assert.match(html, /Receipt upload, capture, and matching/u);
  assert.match(html, /Product qualification checks profile and address information/u);
  assert.match(html, /Side-effect reporting asks the participant/u);
  assert.match(html, /Persistent next-step cards/u);

  const historicalSection = html.match(
    /<section id="cpg-pharma-menu-bottleneck-walkthrough"[\s\S]*?<\/section>/u,
  )?.[0] ?? "";
  assert.match(historicalSection, /public website recording shows a desktop page loading a compact hamburger menu/u);
  assert.match(historicalSection, /recording ends at the sign-in screen before any account information is entered/u);
  assert.match(historicalSection, /campaign homepage/u);
  assert.match(historicalSection, /dense, compressed navigation menu/u);
  assert.match(historicalSection, /Member Sign In page appears, completing the route/u);
  assert.doesNotMatch(
    historicalSection,
    /\bno (?:member account|credentials)\b/iu,
    "The public-page scope carries the boundary through its accepted path",
  );
  assert.doesNotMatch(historicalSection, /\b(?:IP-free|working proxy|2026 proxy)\b/iu);

  for (const number of [1, 2, 3, 4, 5, 6]) {
    assert.equal(
      (html.match(new RegExp(`<strong>Figure ${number}\\.`, "gu")) ?? []).length,
      1,
      `Figure ${number} remains unique`,
    );
  }
  assert.equal(
    (html.match(/<strong>(?:Guided review and safety-reporting|Historical navigation bottleneck) demonstration\.<\/strong>/gu) ?? []).length,
    2,
    "Both video captions remain unnumbered demonstrations",
  );
});

test("Core Architecture readings place bounded demonstrations beside their instruments", async (t) => {
  for (const receiver of coreArchitectureReceivers) {
    await t.test(receiver.page, async () => {
      const html = await readFile(resolve(repositoryRoot, "context-canvas-project-surface/context-canvas", receiver.page), "utf8");
      const route = `https://vik.guru/v1-cdn/video/${receiver.family}/v0.1.0`;
      const matchingVideo = Array.from(html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gu))
        .map((match) => match[0])
        .find((video) => video.includes(`${route}/movie.mp4`));

      assert.ok(matchingVideo, `${receiver.page} needs its accepted ${receiver.family} receiver`);
      const openingTag = matchingVideo.match(/<video\b[^>]*>/u)?.[0] ?? "";
      assert.match(openingTag, /\scontrols(?:\s|>)/u);
      assert.match(openingTag, /\splaysinline(?:\s|>)/u);
      assert.equal(attribute(openingTag, "preload"), "metadata");
      assert.equal(attribute(openingTag, "width"), "1796");
      assert.equal(attribute(openingTag, "height"), "1080");
      assert.equal(attribute(openingTag, "poster"), `${route}/poster.webp`);
      assert.equal(attribute(openingTag, "aria-label"), receiver.label);
      assert.equal(attribute(openingTag, "aria-describedby"), receiver.describedBy);
      assert.equal(attribute(openingTag, "aria-details"), receiver.details);
      assert.doesNotMatch(openingTag, /\b(?:autoplay|loop)\b/u);
      assert.match(matchingVideo, new RegExp(`<source\\s+src="${route.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}/movie\\.mp4"\\s+type="video/mp4">`, "u"));

      const anchorIndex = html.indexOf(receiver.anchor);
      const videoIndex = html.indexOf(matchingVideo);
      const nextIndex = html.indexOf(receiver.next, videoIndex);
      assert.ok(anchorIndex >= 0 && videoIndex > anchorIndex, `${receiver.page} places the demonstration after the paired prototype`);
      assert.ok(nextIndex > videoIndex, `${receiver.page} keeps the demonstration before the next instrument`);
      assert.match(html, new RegExp(`id="${receiver.details}"[\\s\\S]*?<ol>[\\s\\S]*?<\\/ol>`, "u"));
      assert.match(html, new RegExp(receiver.sequenceTitle.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
      assert.match(html, /Visual description/u);
      assert.match(html, /Open movie video file \(MP4\)/u);
    });
  }
});
