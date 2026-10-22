import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { chromium } from "@playwright/test";

import {
  assertTelemetry,
  monitor,
  startStaticServer,
} from "../../tools/core-architecture-browser-helper.mjs";

const visitorRoot = "/context-canvas-project-surface/context-canvas/";
const receivers = [
  {
    route: "fmi-clinical-trial-coordination.html",
    families: ["clinical-trial-boolean-builder"],
  },
  {
    route: "fmi-lims-eln-replatforming.html",
    families: ["genomics-sequencing-process"],
  },
  {
    route: "genomic-viewer-replatforming.html",
    families: [
      "genomics-specimen-qa-biomarker",
      "genomics-responsive-interface",
      "genomics-permissions",
    ],
  },
  {
    route: "who-to-believe-reviews-platform.html",
    families: ["cpg-pharma-conversational-ai", "cpg-pharma-menu-bottleneck"],
  },
  {
    route: "concept-nursery.html",
    families: ["cross-channel-integration"],
  },
  {
    route: "poda.html",
    families: ["poda-cpg-pharma"],
  },
  {
    route: "grammar-family.html",
    families: ["strategy-canvas-product-leadership"],
  },
  {
    route: "metadata-blocks.html",
    families: ["threadkeeping-cpg-pharma"],
  },
];
const viewports = [
  { name: "narrow", width: 390, height: 844 },
  { name: "medium", width: 1024, height: 900 },
  { name: "wide", width: 1440, height: 1000 },
];
const passivePoster = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <rect width="1920" height="1080" fill="#f8f1e2"/>
    <path d="M120 540h1680" stroke="#173b6d" stroke-width="12"/>
  </svg>
`;

let browser;
let server;

before(async () => {
  server = await startStaticServer();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  try {
    await browser?.close();
  } finally {
    await server?.close();
  }
});

for (const viewport of viewports) {
  test(`native video receivers remain contained and described at ${viewport.name} width`, async t => {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
    });
    t.after(() => context.close());

    const requestedPosters = new Set();
    await context.route("https://vik.guru/v1-cdn/video/**", async route => {
      const url = route.request().url();
      if (url.endsWith("/poster.webp")) {
        requestedPosters.add(url);
        await route.fulfill({ status: 200, contentType: "image/svg+xml", body: passivePoster });
        return;
      }
      await route.fulfill({ status: 200, contentType: "video/mp4", body: "" });
    });
    await context.route("https://iframes.vik.guru/**", route => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Bounded iframe fixture</title>",
    }));

    for (const receiver of receivers) {
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const telemetry = monitor(page);
      await page.goto(`${server.origin}${visitorRoot}${receiver.route}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});

      const observation = await page.evaluate(expectedFamilies => {
        const videos = [...document.querySelectorAll("video")];
        return {
          pageClientWidth: document.documentElement.clientWidth,
          pageScrollWidth: document.documentElement.scrollWidth,
          overflowers: [...document.body.querySelectorAll("*")]
            .map(element => {
              const box = element.getBoundingClientRect();
              return {
                tag: element.tagName.toLowerCase(),
                id: element.id,
                className: typeof element.className === "string" ? element.className : "",
                left: Math.round(box.left),
                right: Math.round(box.right),
                width: Math.round(box.width),
                section: element.closest("section")?.id || "",
                parent: element.parentElement?.tagName.toLowerCase() || "",
                parentId: element.parentElement?.id || "",
              };
            })
            .filter(item => item.left < -1 || item.right > document.documentElement.clientWidth + 1)
            .slice(0, 12),
          videos: expectedFamilies.map(family => {
            const source = document.querySelector(
              `video source[src*="/video/${family}/"]`,
            );
            const video = source?.closest("video");
            const box = video?.getBoundingClientRect();
            const describedIds = (video?.getAttribute("aria-describedby") || "")
              .split(/\s+/u)
              .filter(Boolean);
            const detailsId = video?.getAttribute("aria-details") || "";
            return {
              family,
              found: Boolean(video),
              controls: video?.controls ?? false,
              playsInline: video?.playsInline ?? false,
              preload: video?.preload || "",
              autoplay: video?.autoplay ?? true,
              left: box?.left ?? -1,
              right: box?.right ?? Number.POSITIVE_INFINITY,
              width: box?.width ?? 0,
              height: box?.height ?? 0,
              describedIds,
              describedIdsExist: describedIds.every(id => Boolean(document.getElementById(id))),
              detailsId,
              detailsExists: Boolean(detailsId && document.getElementById(detailsId)),
              detailsVisible: Boolean(
                detailsId && document.getElementById(detailsId)?.getClientRects().length,
              ),
              poster: video?.poster || "",
              source: source?.src || "",
            };
          }),
          totalVideos: videos.length,
        };
      }, receiver.families);

      assert.equal(
        observation.totalVideos,
        receiver.families.length,
        `${receiver.route} keeps one native receiver per selected family`,
      );
      assert.ok(
        observation.pageScrollWidth <= observation.pageClientWidth + 1,
        `${receiver.route} has no page-level horizontal overflow at ${viewport.name} width: ${JSON.stringify(observation.overflowers)}`,
      );
      for (const video of observation.videos) {
        assert.equal(video.found, true, `${video.family} is present`);
        assert.equal(video.controls, true, `${video.family} exposes native controls`);
        assert.equal(video.playsInline, true, `${video.family} stays inline`);
        assert.equal(video.preload, "metadata", `${video.family} uses metadata preload`);
        assert.equal(video.autoplay, false, `${video.family} begins under visitor control`);
        assert.ok(video.width > 0 && video.height > 0, `${video.family} has rendered geometry`);
        assert.ok(video.left >= -1, `${video.family} stays inside the leading viewport edge`);
        assert.ok(
          video.right <= observation.pageClientWidth + 1,
          `${video.family} stays inside the trailing viewport edge`,
        );
        assert.ok(video.describedIds.length >= 2, `${video.family} names standing and caption`);
        assert.equal(video.describedIdsExist, true, `${video.family} descriptions resolve`);
        assert.equal(video.detailsExists, true, `${video.family} visual sequence resolves`);
        assert.equal(video.detailsVisible, true, `${video.family} visual sequence remains visible`);
        assert.match(video.poster, new RegExp(`/video/${video.family}/v0\\.1\\.0/poster\\.webp$`, "u"));
        assert.match(video.source, new RegExp(`/video/${video.family}/v0\\.1\\.0/movie\\.mp4$`, "u"));
        assert.ok(
          requestedPosters.has(video.poster),
          `${video.family} requests its reviewed poster before playback`,
        );
      }

      assertTelemetry(telemetry);
      await page.close();
    }
  });
}
