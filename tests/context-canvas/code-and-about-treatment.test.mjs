import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("shared inline code keeps a readable paper-and-ink treatment", async () => {
  const [tokens, legacy] = await Promise.all([
    readCanvasFile("styles/core/tokens.css"),
    readCanvasFile("expanded.css"),
  ]);
  const rootRule = cssRule(tokens, ":root");
  const codeRule = cssRule(legacy, "code");
  const blockCodeRule = cssRule(legacy, "pre > code");

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

test("the About hero keeps its initial composition with a local identity lockup", async () => {
  const [css, html] = await Promise.all([
    readCanvasFile("styles/routes/about.css"),
    readCanvasFile("index.html"),
  ]);
  const heroRule = cssRule(css, ".about-hero");
  const identityRule = cssRule(css, ".about-hero__identity");
  const nameRule = cssRule(css, ".about-hero__name");
  const headingRule = cssRule(css, ".about-hero h1");
  const contactRule = cssRule(css, ".about-contact");
  const portraitRule = cssRule(css, ".about-portrait");
  const portraitImageRule = cssRule(css, ".about-portrait img");

  assert.equal(
    declarationValue(heroRule, "grid-template-columns"),
    "minmax(0, 1.3fr) minmax(15rem, .7fr)",
  );
  assert.equal(declarationValue(heroRule, "gap"), "clamp(1.5rem, 5vw, 4rem)");
  assert.equal(
    declarationValue(identityRule, "grid-template-columns"),
    "max-content max-content",
  );
  assert.equal(
    declarationValue(identityRule, "column-gap"),
    "clamp(1.6875rem, calc(2vw + .1875rem), 2.6875rem)",
  );
  assert.equal(declarationValue(nameRule, "min-inline-size"), "0");
  assert.equal(declarationValue(headingRule, "margin"), "0");
  assert.equal(declarationValue(contactRule, "font-size"), "clamp(1.5rem, 4vw, 3.5rem)");
  assert.equal(declarationValue(contactRule, "overflow-wrap"), "anywhere");
  assert.equal(
    declarationValue(portraitRule, "inline-size"),
    "clamp(7.75rem, 11vw, 10rem)",
  );
  assert.equal(declarationValue(portraitRule, "margin-inline"), "0");
  assert.equal(declarationValue(portraitImageRule, "block-size"), "auto");
  assert.match(
    html,
    /<div class="about-hero__identity"><div class="about-hero__name"><h1 id="about-title"><span class="about-title__line">About<\/span> <span class="about-title__line about-title__line--name">Vikrant<\/span> <span class="about-title__line about-title__line--name">Kudesia<\/span><\/h1><address class="about-contact">contact@vik\.guru<\/address><\/div><figure class="about-portrait"><img src="portrait-of-vvk-technology-leader\.jpg" width="300" height="300" alt="Vikrant Kudesia, smiling\."/u,
  );
  assert.doesNotMatch(html, /mailto:/u);
  assert.match(html, /<nav class="about-boundary" aria-label="Explore projects">[\s\S]*href="ai-systems\.html"[\s\S]*href="https:\/\/github\.com\/driftframestudios" rel="me"/u);
});

test("the About folios keep organization records inside progressive disclosure", async () => {
  const [css, html] = await Promise.all([
    readCanvasFile("styles/routes/about.css"),
    readCanvasFile("index.html"),
  ]);
  const careerStart = html.indexOf('<article class="about-folio about-folio--career"');
  const qualityStart = html.indexOf('<article class="about-folio about-folio--quality"');
  const foliosEnd = html.indexOf('<section class="about-field about-field--dark-iron-ore"');
  assert.ok(careerStart >= 0 && qualityStart > careerStart && foliosEnd > qualityStart);

  const careerFolio = html.slice(careerStart, qualityStart);
  const qualityFolio = html.slice(qualityStart, foliosEnd);
  const careerDetailsStart = careerFolio.indexOf('<details class="about-folio-disclosure"');
  const qualityDetailsStart = qualityFolio.indexOf('<details class="about-folio-disclosure"');
  const careerDisclosure = careerFolio.slice(
    careerDetailsStart,
    careerFolio.indexOf("</details>", careerDetailsStart) + "</details>".length,
  );
  const qualityDisclosure = qualityFolio.slice(
    qualityDetailsStart,
    qualityFolio.indexOf("</details>", qualityDetailsStart) + "</details>".length,
  );

  assert.match(careerFolio, /data-source-id="career-role-1"><strong>Founder &amp; <abbr title="Chief Product and Technology Officer">CPTO<\/abbr> <span class="about-folio-role__organization">at Driftframe Studios, LLC<\/span><\/strong>/u);
  assert.match(qualityFolio, /data-source-id="quality-role-1"><strong>Founder &amp; Director of Quality Engineering <span class="about-folio-role__organization">at Kindlight Charitable Trust Foundation<\/span><\/strong>/u);
  assert.match(careerDisclosure, /^<details class="about-folio-disclosure"><summary>/u);
  assert.match(qualityDisclosure, /^<details class="about-folio-disclosure"><summary>/u);
  assert.doesNotMatch(careerDisclosure, /^<details[^>]*\sopen(?:\s|=|>)/u);
  assert.doesNotMatch(qualityDisclosure, /^<details[^>]*\sopen(?:\s|=|>)/u);
  assert.match(careerDisclosure, /Show 4 more career records/u);
  assert.match(qualityDisclosure, /Show 5 more quality records/u);
  assert.equal((careerDisclosure.match(/data-source-id="career-case-/gu) ?? []).length, 4);
  assert.equal((qualityDisclosure.match(/data-source-id="quality-case-/gu) ?? []).length, 5);
  assert.match(careerDisclosure, /data-source-id="career-case-6"[\s\S]*Founder &amp; <abbr title="Chief Product and Technology Officer">CPTO<\/abbr> at Driftframe Studios, LLC/u);
  assert.match(qualityDisclosure, /data-source-id="quality-case-7"[\s\S]*Founder &amp; Director of Quality Engineering at Kindlight Charitable Trust Foundation/u);

  const sourceIds = [...html.matchAll(/data-source-id="([^"]+)"/gu)].map(match => match[1]);
  assert.equal(new Set(sourceIds).size, sourceIds.length, "Expected unique About source IDs");

  const organizationRule = cssRule(css, ".about-folio-roles .about-folio-role__organization");
  assert.equal(declarationValue(organizationRule, "display"), "block");
  assert.equal(declarationValue(organizationRule, "font-size"), ".9em");
});

test("the About visual sequence begins on a local poster and leaves native playback to the visitor", async () => {
  const [css, html, script, gif, poster, manifestSource, captureScript, generator] = await Promise.all([
    readCanvasFile("styles/routes/about.css"),
    readCanvasFile("index.html"),
    readCanvasFile("about-media.js"),
    readFile(resolve(
      repositoryRoot,
      "context-canvas-project-surface/img/media/impact-map-style-cycle-calm.gif",
    )),
    readFile(resolve(
      repositoryRoot,
      "context-canvas-project-surface/img/media/impact-map-style-cycle-poster.jpg",
    )),
    readFile(resolve(
      repositoryRoot,
      "collaboration/impact-map-visual-variants/movie/about-style-cycle-sequence.json",
    ), "utf8"),
    readFile(resolve(
      repositoryRoot,
      "collaboration/impact-map-visual-variants/movie/capture_about_style_cycle_sources.mjs",
    ), "utf8"),
    readFile(resolve(
      repositoryRoot,
      "collaboration/impact-map-visual-variants/movie/render_about_style_cycle_gif.py",
    ), "utf8"),
  ]);

  const section = html.match(
    /<section class="about-field about-field--ledger" aria-labelledby="background-title">.*?<\/section>/su,
  )?.[0];
  assert.ok(section, "Expected the first About ledger section");

  const headingEnd = section.indexOf("</h2>");
  const figureStart = section.indexOf('<figure class="about-media"');
  const firstProse = section.indexOf("<p>Twenty years");
  assert.ok(headingEnd < figureStart && figureStart < firstProse);
  const videoTag = section.match(/<video class="about-media__video"[^>]+>/u)?.[0];
  assert.ok(videoTag, "Expected one native About video receiver");
  assert.match(videoTag, /data-about-media-video/u);
  assert.match(
    videoTag,
    /data-video-poster="https:\/\/vik\.guru\/v1-cdn\/video\/about-problem-to-system-sequence\/v0\.1\.0\/poster\.webp"/u,
  );
  assert.match(videoTag, /\scontrols(?:\s|>)/u);
  assert.match(videoTag, /\splaysinline(?:\s|>)/u);
  assert.match(videoTag, /preload="none"/u);
  assert.match(videoTag, /width="1280" height="720"/u);
  assert.match(videoTag, /poster="\.\.\/img\/media\/impact-map-style-cycle-poster\.jpg"/u);
  assert.match(videoTag, /aria-describedby="about-media-caption"/u);
  assert.match(videoTag, /aria-details="about-media-sequence"/u);
  assert.doesNotMatch(videoTag, /\sautoplay(?:\s|=|>)/u);
  assert.match(
    section,
    /<source src="https:\/\/vik\.guru\/v1-cdn\/video\/about-problem-to-system-sequence\/v0\.1\.0\/movie\.mp4" type="video\/mp4">/u,
  );
  assert.match(
    section,
    /<a href="\.\.\/img\/media\/impact-map-style-cycle-calm\.gif">Open the local GIF fallback<\/a>/u,
  );
  assert.match(
    section,
    /A finished genomics plate view opens the sequence\./u,
  );
  assert.match(
    section,
    /<aside class="about-media-sequence" id="about-media-sequence" aria-labelledby="about-media-sequence-title">/u,
  );
  assert.equal((section.match(/<li>/gu) ?? []).length, 5);

  assert.equal(gif.subarray(0, 6).toString("ascii"), "GIF89a");
  assert.equal(gif.readUInt16LE(6), 960);
  assert.equal(gif.readUInt16LE(8), 540);
  assert.ok(
    gif.byteLength < 2_500_000,
    "Expected the higher-fidelity fallback GIF to remain below 2.5 MB",
  );
  assert.equal(gif.includes(Buffer.from("NETSCAPE2.0", "ascii")), false);
  assert.equal(
    sha256(gif),
    "04ac68986df269c6f3f19a34d1c40c3dbdd6c5151e84db459a5beea5feb90f59",
  );
  assert.equal(
    sha256(poster),
    "4520e4909b9490d1c9f580f90cdee979bdeb6bddf212a8cb2d475e7c609d4790",
  );

  const manifest = JSON.parse(manifestSource);
  assert.equal(manifest.version, "0.4.0");
  assert.deepEqual(
    manifest.output,
    {
      width: 960,
      height: 540,
      hold_ms: 1200,
      transition_frame_ms: 160,
      palette_colors: 56,
      palette_strategy: "per_frame",
      dither: "none",
    },
  );
  assert.deepEqual(
    manifest.progressive_video,
    {
      width: 1280,
      height: 720,
      frames_per_second: 25,
      codec: "libx264",
      preset: "slow",
      crf: 16,
      pixel_format: "yuv420p",
      audio: false,
      fast_start: true,
    },
  );
  assert.equal(manifest.transition.id, "assembly_relay");
  assert.deepEqual(manifest.transition.progress, [0.38, 0.72]);
  assert.deepEqual(manifest.transition.colors, ["#2456f5", "#ecff3f", "#fbf8f1"]);
  assert.equal(manifest.frames.length, 11);
  assert.deepEqual(
    manifest.frames.map(frame => frame.id),
    [
      "genomics-plate-viewer",
      "poda-investment-flow",
      "cpg-member-experience-redesigned",
      "context-board-pop-drafting",
      "who-to-believe-system-graph",
      "impact-branch-cobalt-drafting",
      "genomics-axonometric-process-viewer",
      "context-assembly-ledger-quintile",
      "clinical-trial-tumor-board-cohort",
      "context-shared-cobalt-drafting",
      "impact-narrative-pop-quintile",
    ],
  );
  assert.deepEqual(
    manifest.frames.map(frame => frame.stage),
    [
      "implementation",
      "problem",
      "solution",
      "problem",
      "implementation",
      "solution",
      "implementation",
      "problem",
      "solution",
      "problem",
      "solution",
    ],
  );
  assert.ok(
    manifest.frames.every(frame => /^[0-9a-f]{64}$/u.test(frame.sha256)),
    "Each accepted source frame carries a SHA-256 digest",
  );
  assert.ok(
    manifest.frames.every(frame => !frame.source_path.includes(".about-style-cycle-build")),
    "The build reads accepted, repository-owned source frames",
  );
  const authoredDuration = (
    (manifest.frames.length * manifest.output.hold_ms)
    + ((manifest.frames.length - 1)
      * manifest.transition.progress.length
      * manifest.output.transition_frame_ms)
  );
  assert.equal(authoredDuration, 16_400);
  assert.match(captureScript, /startStaticServer/u);
  assert.match(captureScript, /document\.fonts\?\.ready/u);
  assert.match(captureScript, /about-style-cycle-source-frames/u);
  assert.match(captureScript, /sha256/u);
  assert.match(captureScript, /#impact-map/u);
  assert.match(captureScript, /#visual-surface/u);
  assert.match(generator, /def assembly_relay\(/u);
  assert.match(generator, /expected_digest/u);
  assert.match(generator, /reverse=bool\(index % 2\)/u);
  assert.match(generator, /def encode_progressive_video\(/u);
  assert.match(generator, /subsampling=0/u);
  assert.match(generator, /Encode every requested carrier before promoting any destination/u);
  assert.match(generator, /frames_per_second/u);
  assert.match(generator, /whole progressive-video frames/u);

  assert.match(script, /root\.querySelector\("\[data-about-media-video\]"\)/u);
  assert.match(script, /video\?\.querySelector\("source"\)/u);
  assert.match(script, /root\.querySelector\("\[data-about-media-status\]"\)/u);
  assert.match(script, /prefers-reduced-motion: reduce/u);
  assert.match(script, /window\.matchMedia\("print"\)/u);
  assert.match(script, /root\.dataset\.motionPreference/u);
  assert.match(script, /video\.addEventListener\("error"/u);
  assert.match(script, /source\.addEventListener\("error"/u);
  assert.match(script, /video\.addEventListener\("loadedmetadata"/u);
  assert.match(script, /if \(!video\.paused\) video\.pause\(\)/u);
  assert.match(script, /window\.addEventListener\("beforeprint"/u);
  assert.match(script, /document\.addEventListener\("visibilitychange"/u);

  assert.match(css, /\.about-media\s*\{[^}]*inline-size:\s*min\(100%, 40rem\)/su);
  assert.match(css, /\.about-media__frame\s*\{[^}]*aspect-ratio:\s*16 \/ 9/su);
  assert.match(css, /\.about-media__video\s*\{[^}]*object-fit:\s*cover/su);
  assert.match(css, /\.about-media__status\[hidden\]\s*\{[^}]*display:\s*none/su);
  assert.match(css, /\.about-media-sequence\s*\{[^}]*border-inline-start:/su);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.about-media/su);
  assert.match(css, /@media print[\s\S]*?\.about-media-sequence/su);
});

test("the About prose and role table state action and consequence directly", async () => {
  const html = await readCanvasFile("index.html");
  assert.match(
    html,
    /Twenty years of shipping products into regulated, high-stakes, frequently changing environments have shaped how I work: find what is actually being measured, distinguish signal from noise, repair the control loop, and equip the team to do the same\./u,
  );
  assert.match(
    html,
    /<strong>The people who understand both the biology and the computation can explain what a system is doing - more than merely what it promises\.<\/strong>/u,
  );
  assert.match(
    html,
    /A boarding pass that fails to load at the gate and a bill-payment path buried in ambiguous links are all too common occurrences\./u,
  );

  const table = html.match(
    /<table class="about-role-table" data-label="I’ve worked as…">[\s\S]*?<\/table>/u,
  )?.[0];
  assert.ok(table, "Expected the About role table");
  const newestRow = table.match(
    /<tbody>(<tr data-label="I’ve worked as…: Designer and Engineer">[\s\S]*?<\/tr>)/u,
  )?.[1];
  assert.ok(newestRow, "Expected the 2022–2025 work to be the first body row");
  assert.match(newestRow, /<th scope="row" data-label="Role in the situation">Designer and Engineer<\/th>/u);
  assert.match(newestRow, /<td data-label="Changed work">Fully redesigned an <abbr[^>]+>FDA<\/abbr>-approved clinical-genomics medical device/u);
  assert.match(newestRow, /<td data-label="Reported consequence">Eliminated an entire category of assignment errors,[\s\S]*saved about 25 minutes per person/u);
  assert.match(newestRow, /<td data-label="Context">Genomics · 2022–2025<\/td>/u);
});
