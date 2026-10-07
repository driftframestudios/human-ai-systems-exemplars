#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, posix, resolve } from "node:path";
import { promisify } from "node:util";

import { chromium } from "@playwright/test";

import {
  projectAboutCssProfile,
} from "../../tools/build-prod-projection.mjs";
import {
  classifyExpectedIframeRefusals,
  formatVisualRequestFailure,
} from "../../tools/context-canvas-visual-observation-contract.mjs";

const execute = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "../..");
const CONFIG_PATH = "deployment/cpanel/production-projection.config.json";
const MANIFEST_PATH = "deployment/cpanel/primary-route-manifest.json";
const CONSUMER_PATH = "context-canvas-project-surface/context-canvas/index.html";
const VIEWPORTS = [
  { id: "narrow", width: 390, height: 844 },
  { id: "desktop", width: 1440, height: 1000 },
  { id: "wide", width: 2560, height: 1440 },
];
const MODES = [
  {
    id: "enhanced-screen",
    javaScriptEnabled: true,
    media: "screen",
    forcedColors: "none",
    reducedMotion: "no-preference",
  },
  {
    id: "scriptless-screen",
    javaScriptEnabled: false,
    media: "screen",
    forcedColors: "none",
    reducedMotion: "no-preference",
  },
  {
    id: "enhanced-print",
    javaScriptEnabled: true,
    media: "print",
    forcedColors: "none",
    reducedMotion: "no-preference",
  },
  {
    id: "enhanced-forced-colors",
    javaScriptEnabled: true,
    media: "screen",
    forcedColors: "active",
    reducedMotion: "no-preference",
  },
  {
    id: "enhanced-reduced-motion",
    javaScriptEnabled: true,
    media: "screen",
    forcedColors: "none",
    reducedMotion: "reduce",
  },
];

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"],
]);

function normalizedRepositoryPath(value) {
  const normalized = posix.normalize(value.replace(/^\/+/, ""));
  if (
    normalized === "" ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("\\")
  ) {
    return null;
  }
  return normalized;
}

async function gitBytes(repositoryPath) {
  const result = await execute("git", ["show", `HEAD:${repositoryPath}`], {
    cwd: ROOT,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
  return Buffer.from(result.stdout);
}

async function gitBlobId(repositoryPath) {
  const result = await execute("git", ["rev-parse", `HEAD:${repositoryPath}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return result.stdout.trim();
}

function stylesheetReferences(html) {
  const references = [];
  for (const match of html.matchAll(/<link\b[^>]*>/giu)) {
    const tag = match[0];
    const relation = tag.match(/\brel\s*=\s*(["'])(.*?)\1/iu)?.[2] ?? "";
    if (!relation.split(/\s+/u).includes("stylesheet")) continue;
    const href = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/iu)?.[2];
    if (!href || /^[a-z][a-z0-9+.-]*:/iu.test(href) || href.startsWith("/")) continue;
    references.push(href);
  }
  return references;
}

async function prepareProjection() {
  const configuration = JSON.parse(await readFile(resolve(ROOT, CONFIG_PATH), "utf8"));
  const manifest = JSON.parse(await gitBytes(MANIFEST_PATH));
  assert.ok(Array.isArray(manifest.files), "the tracked primary route manifest exposes its file closure");
  const projectedPaths = new Map(
    manifest.files.map(entry => [entry.source_path, entry.projected_path]),
  );
  const projectedSources = new Map(
    manifest.files.map(entry => [entry.projected_path, {
      sourcePath: entry.source_path,
      mediaType: entry.media_type,
    }]),
  );
  const sourceSelected = new Map(
    manifest.files.map(entry => [entry.source_path, {
      sourcePath: entry.source_path,
      mediaType: entry.media_type,
    }]),
  );
  const consumerBytes = await gitBytes(CONSUMER_PATH);
  assert.deepEqual(
    await readFile(resolve(ROOT, CONSUMER_PATH)),
    consumerBytes,
    "the focused browser proof requires the tracked About consumer without local source edits",
  );
  const stylesheetPaths = stylesheetReferences(consumerBytes.toString("utf8")).map(reference => {
    const pathname = reference.split(/[?#]/u, 1)[0];
    return posix.normalize(posix.join(posix.dirname(CONSUMER_PATH), pathname));
  });
  assert.equal(stylesheetPaths.length, 8, "the tracked About source graph remains six base + noscript + shell");
  assert.equal(new Set(stylesheetPaths).size, 8, "the tracked About CSS graph has distinct sources");

  const cssSources = new Map();
  for (const sourcePath of stylesheetPaths) {
    const bytes = await gitBytes(sourcePath);
    assert.deepEqual(
      await readFile(resolve(ROOT, sourcePath)),
      bytes,
      `the focused browser proof requires tracked CSS bytes: ${sourcePath}`,
    );
    cssSources.set(sourcePath, {
      bytes,
      git_blob_id: await gitBlobId(sourcePath),
    });
  }

  const consumerProjectedPath = projectedPaths.get(CONSUMER_PATH);
  assert.equal(consumerProjectedPath, "index.html", "the production About consumer remains the root index");
  const projection = projectAboutCssProfile({
    consumer: {
      source_path: CONSUMER_PATH,
      projected_path: consumerProjectedPath,
      bytes: consumerBytes,
      git_blob_id: await gitBlobId(CONSUMER_PATH),
    },
    consumerSourceRoot: configuration.publication.source_root,
    renderedConsumerBytes: consumerBytes,
    cssSources,
    projectedPaths,
    profile: configuration.css_projection,
  });
  assert.deepEqual(
    projection.outputs.map(output => output.id),
    ["about-document-base", "about-noscript", "about-document-shell"],
    "the production profile retains its three execution contexts",
  );
  return {
    cssSources,
    projectedPaths,
    projectedSources,
    sourceSelected,
    sourceConsumer: consumerBytes,
    sourceStylesheets: stylesheetPaths,
    ...projection,
  };
}

async function startProjectionServer(projection) {
  const generatedCss = new Map(
    projection.outputs.map(output => [output.projected_path, output.bytes]),
  );
  const trackedBytes = async (selection) => {
    selection.bytes ??= await gitBytes(selection.sourcePath);
    return selection.bytes;
  };
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      let requestPath = decodeURIComponent(requestUrl.pathname);
      if (requestPath.endsWith("/")) requestPath += "index.html";
      let body;
      let contentType;

      if (requestPath.startsWith("/source/")) {
        const sourcePath = normalizedRepositoryPath(requestPath.slice("/source/".length));
        if (!sourcePath) throw Object.assign(new Error("Forbidden"), { status: 403 });
        if (sourcePath === CONSUMER_PATH) body = projection.sourceConsumer;
        else if (projection.cssSources.has(sourcePath)) body = projection.cssSources.get(sourcePath).bytes;
        else {
          const selected = projection.sourceSelected.get(sourcePath);
          if (!selected) throw Object.assign(new Error("Unavailable"), { status: 404 });
          body = await trackedBytes(selected);
          contentType = selected.mediaType;
        }
        contentType ??= MIME_TYPES.get(extname(sourcePath).toLowerCase());
      } else {
        const projectedPath = normalizedRepositoryPath(
          requestPath.startsWith("/projected/")
            ? requestPath.slice("/projected/".length)
            : requestPath,
        );
        if (!projectedPath) throw Object.assign(new Error("Forbidden"), { status: 403 });
        if (projectedPath === "index.html") {
          body = projection.consumer_bytes;
          contentType = "text/html; charset=utf-8";
        } else if (generatedCss.has(projectedPath)) {
          body = generatedCss.get(projectedPath);
          contentType = "text/css; charset=utf-8";
        } else {
          const selected = projection.projectedSources.get(projectedPath);
          if (!selected) throw Object.assign(new Error("Unavailable"), { status: 404 });
          body = await trackedBytes(selected);
          contentType = selected.mediaType;
        }
      }

      response.writeHead(200, {
        "Content-Type": contentType ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(body);
    } catch (error) {
      response.writeHead(error?.status ?? (error?.code === "ENOENT" ? 404 : 500), {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end("Unavailable");
    }
  });
  await new Promise((resolveListening, rejectListening) => {
    server.once("error", rejectListening);
    server.listen(0, "127.0.0.1", resolveListening);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close(error => error ? rejectClose(error) : resolveClose());
    }),
  };
}

function monitorPage(page, origin) {
  const telemetry = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    requestFailureDetails: [],
    responseErrors: [],
  };
  const stylesheets = [];
  page.on("console", message => {
    if (message.type() === "error") telemetry.consoleErrors.push(message.text());
  });
  page.on("pageerror", error => telemetry.pageErrors.push(error.message));
  page.on("requestfailed", request => {
    const detail = {
      method: request.method(),
      url: request.url(),
      errorText: request.failure()?.errorText ?? "",
      resourceType: request.resourceType(),
      navigationRequest: request.isNavigationRequest(),
    };
    telemetry.requestFailureDetails.push(detail);
    telemetry.requestFailures.push(formatVisualRequestFailure(detail));
  });
  page.on("response", response => {
    if (response.status() >= 400) {
      telemetry.responseErrors.push(`${response.status()} ${response.url()}`);
    }
    const url = new URL(response.url());
    if (url.origin === origin && url.pathname.endsWith(".css")) {
      stylesheets.push({
        path: url.pathname,
        status: response.status(),
        contentType: response.headers()["content-type"] ?? "",
      });
    }
  });
  return { telemetry, stylesheets };
}

async function settle(page) {
  await page.waitForLoadState("load");
  // `load` already closes the eager image and stylesheet boundary. A short
  // browser-owned turn lets progressive-enhancement observers publish their
  // initial state without waiting on lazy cross-origin iframe carriers.
  await page.waitForTimeout(300);
}

async function renderedSnapshot(page) {
  return page.evaluate(async () => {
    const round = value => Math.round(value * 64) / 64;
    const digest = async value => {
      const bytes = new TextEncoder().encode(value);
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
    };
    const canonicalValue = value => value.replace(
      /(^|[\s,(])-?(?:0+(?:\.0+)?|\.0+)(?:%|px|rem|em|ch|ex|vw|vh|vmin|vmax|cm|mm|in|pt|pc|deg|rad|grad|turn|s|ms)(?=$|[\s,)])/giu,
      (match, prefix) => `${prefix}0`,
    );
    const styleText = (element, pseudo = null) => {
      const style = getComputedStyle(element, pseudo);
      // CSS custom properties preserve author-token whitespace in computedStyle.
      // CSSO is expected to normalize that source spelling. Every resolved CSS
      // property remains in this comparison, so rendered use of each token is
      // observed without treating equivalent token whitespace as a visual delta.
      return [...style]
        .filter(name => !name.startsWith("--"))
        .sort()
        .map(name => `${name}:${canonicalValue(style.getPropertyValue(name))};`)
        .join("");
    };
    const elements = [document.documentElement, ...document.body.querySelectorAll("*")];
    const records = [];
    const styleBundles = [];
    for (const [index, element] of elements.entries()) {
      const rect = element.getBoundingClientRect();
      const normalStyle = styleText(element);
      const before = getComputedStyle(element, "::before");
      const after = getComputedStyle(element, "::after");
      const beforeStyle = !["none", "normal"].includes(before.content) ? styleText(element, "::before") : "";
      const afterStyle = !["none", "normal"].includes(after.content) ? styleText(element, "::after") : "";
      const styleBundle = `${normalStyle}\n::before{${beforeStyle}}\n::after{${afterStyle}}`;
      styleBundles.push(styleBundle);
      records.push({
        key: `${index}:${element.localName}#${element.id}.${[...element.classList].join(".")}`,
        rect: [rect.x, rect.y, rect.width, rect.height].map(round),
        box: [
          element.clientWidth,
          element.clientHeight,
          element.scrollWidth,
          element.scrollHeight,
          element.hidden ? 1 : 0,
          "open" in element && element.open ? 1 : 0,
        ],
        styleDigest: "",
      });
    }
    const elementStyleDigests = await Promise.all(styleBundles.map(digest));
    for (const [index, styleDigest] of elementStyleDigests.entries()) {
      records[index].styleDigest = styleDigest;
    }
    const root = document.documentElement;
    const bodyMarkup = document.body.outerHTML;
    const bodyText = document.body.textContent?.replace(/\s+/gu, " ").trim() ?? "";
    return {
      structureDigest: await digest(bodyMarkup),
      textDigest: await digest(bodyText),
      records,
      documentBox: {
        clientWidth: root.clientWidth,
        clientHeight: root.clientHeight,
        scrollWidth: root.scrollWidth,
        scrollHeight: root.scrollHeight,
        bodyScrollWidth: document.body.scrollWidth,
        bodyScrollHeight: document.body.scrollHeight,
      },
      presence: {
        mains: document.querySelectorAll("main").length,
        primaryNavLinks: document.querySelectorAll('nav[aria-label="Primary"] a').length,
        headings: document.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
        details: document.querySelectorAll("details").length,
        tables: document.querySelectorAll("table").length,
        iframes: document.querySelectorAll("iframe").length,
        routeCards: document.querySelectorAll(".about-route-grid > a").length,
      },
    };
  });
}

function compactSnapshot(snapshot) {
  return {
    structureDigest: snapshot.structureDigest,
    textDigest: snapshot.textDigest,
    records: snapshot.records,
    documentBox: snapshot.documentBox,
    presence: snapshot.presence,
  };
}

async function styleDifferences(sourcePage, projectedPage, sourceSnapshot, projectedSnapshot) {
  if (sourceSnapshot.records.length !== projectedSnapshot.records.length) {
    return [{
      element: "document",
      property: "element-count",
      source: sourceSnapshot.records.length,
      projected: projectedSnapshot.records.length,
    }];
  }
  const recordIndex = sourceSnapshot.records.findIndex(
    (record, index) => record.styleDigest !== projectedSnapshot.records[index]?.styleDigest,
  );
  if (recordIndex < 0) return [];
  const readStyle = (page, index) => page.evaluate(elementIndex => {
    const elements = [document.documentElement, ...document.body.querySelectorAll("*")];
    const element = elements[elementIndex];
    const canonicalValue = value => value.replace(
      /(^|[\s,(])-?(?:0+(?:\.0+)?|\.0+)(?:%|px|rem|em|ch|ex|vw|vh|vmin|vmax|cm|mm|in|pt|pc|deg|rad|grad|turn|s|ms)(?=$|[\s,)])/giu,
      (match, prefix) => `${prefix}0`,
    );
    const capture = pseudo => {
      const style = getComputedStyle(element, pseudo);
      return Object.fromEntries([...style]
        .filter(name => !name.startsWith("--"))
        .sort()
        .map(name => [name, canonicalValue(style.getPropertyValue(name))]));
    };
    return {
      normal: capture(null),
      before: capture("::before"),
      after: capture("::after"),
    };
  }, index);
  const [source, projected] = await Promise.all([
    readStyle(sourcePage, recordIndex),
    readStyle(projectedPage, recordIndex),
  ]);
  const differences = [];
  for (const pseudo of ["normal", "before", "after"]) {
    for (const name of new Set([...Object.keys(source[pseudo]), ...Object.keys(projected[pseudo])])) {
      if (source[pseudo][name] !== projected[pseudo][name]) {
        differences.push({
          element: sourceSnapshot.records[recordIndex].key,
          pseudo,
          property: name,
          source: source[pseudo][name],
          projected: projected[pseudo][name],
        });
      }
    }
  }
  return differences;
}

function assertContained(snapshot, label) {
  assert.ok(
    snapshot.documentBox.scrollWidth <= snapshot.documentBox.clientWidth + 1,
    `${label}: document width remains inside the viewport`,
  );
  assert.ok(
    snapshot.documentBox.bodyScrollWidth <= snapshot.documentBox.clientWidth + 1,
    `${label}: body width remains inside the viewport`,
  );
  assert.equal(snapshot.presence.mains, 1, `${label}: one main landmark`);
  assert.equal(snapshot.presence.primaryNavLinks, 3, `${label}: the primary navigation remains available`);
  assert.ok(snapshot.presence.details > 0, `${label}: disclosure controls remain available`);
  assert.ok(snapshot.presence.tables > 0, `${label}: About tables remain available`);
  assert.ok(snapshot.presence.iframes > 0, `${label}: the About prototype carriers remain represented`);
}

function assertStylesheetResponses(stylesheets, expectedPaths, label) {
  const actualPaths = stylesheets.map(entry => entry.path).sort();
  assert.deepEqual(actualPaths, [...expectedPaths].sort(), `${label}: exact stylesheet request closure`);
  for (const response of stylesheets) {
    assert.equal(response.status, 200, `${label}: ${response.path} returns 200`);
    assert.match(response.contentType, /^text\/css(?:;|$)/iu, `${label}: ${response.path} is text/css`);
  }
}

function assertTelemetry(telemetry, parentOrigin, label) {
  assert.deepEqual(telemetry.pageErrors, [], `${label}: no page errors`);
  assert.deepEqual(telemetry.responseErrors, [], `${label}: no HTTP error responses`);
  const encounteredIframeUrls = telemetry.requestFailureDetails
    .filter(failure => failure.url.startsWith("https://iframes.vik.guru/"))
    .map(failure => failure.url);
  const classified = classifyExpectedIframeRefusals({
    parentOrigin,
    iframeSources: encounteredIframeUrls,
    consoleErrors: telemetry.consoleErrors,
    requestFailures: telemetry.requestFailures,
    requestFailureDetails: telemetry.requestFailureDetails,
  });
  assert.deepEqual(classified.remainingConsoleErrors, [], `${label}: no unexpected console errors`);
  assert.deepEqual(classified.remainingRequestFailures, [], `${label}: no unexpected request failures`);
  assert.deepEqual(classified.policyObservations, [], `${label}: every encountered iframe refusal is complete`);
  return classified.expectedRefusals.map(observation => observation.url).sort();
}

async function interactionReceipt(page, { mediaToggle }) {
  const primaryLink = page.locator('nav[aria-label="Primary"] a').nth(1);
  await primaryLink.focus();
  const focused = await primaryLink.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      text: element.textContent.trim(),
      active: document.activeElement === element,
      color: style.color,
      backgroundColor: style.backgroundColor,
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      textDecoration: style.textDecoration,
    };
  });

  const disclosure = page.locator("details.about-folio-disclosure").first();
  const summary = disclosure.locator("summary");
  assert.equal(await disclosure.getAttribute("open"), null, "career disclosure begins closed");
  await summary.click();
  assert.equal(await disclosure.getAttribute("open"), "", "career disclosure opens through its native control");
  const disclosureReceipt = await disclosure.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      open: element.open,
      width: Math.round(rect.width * 64) / 64,
      height: Math.round(rect.height * 64) / 64,
      display: style.display,
      visibility: style.visibility,
    };
  });

  let media = null;
  if (mediaToggle) {
    const toggle = page.locator("[data-about-media-toggle]");
    await toggle.waitFor({ state: "visible" });
    await toggle.click();
    media = await page.evaluate(() => ({
      pressed: document.querySelector("[data-about-media-toggle]")?.getAttribute("aria-pressed") ?? "",
      source: document.querySelector("[data-about-media-image]")?.getAttribute("src")?.split("/").at(-1) ?? "",
      label: document.querySelector("[data-about-media-toggle-label]")?.textContent?.trim() ?? "",
    }));
    await toggle.click();
  }
  return { focused, disclosure: disclosureReceipt, media };
}

async function runScenario(browser, server, projection, viewport, mode) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    javaScriptEnabled: mode.javaScriptEnabled,
    reducedMotion: mode.reducedMotion,
    forcedColors: mode.forcedColors,
  });
  await context.route("https://iframes.vik.guru/**", route => route.fulfill({
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "frame-ancestors https://vik.guru",
      "cache-control": "no-store",
    },
    body: "<!doctype html><title>Hosted iframe policy fixture</title>",
  }));

  const sourcePage = await context.newPage();
  const projectedPage = await context.newPage();
  sourcePage.setDefaultTimeout(8000);
  projectedPage.setDefaultTimeout(8000);
  await Promise.all([
    sourcePage.emulateMedia({
      media: mode.media,
      forcedColors: mode.forcedColors,
      reducedMotion: mode.reducedMotion,
    }),
    projectedPage.emulateMedia({
      media: mode.media,
      forcedColors: mode.forcedColors,
      reducedMotion: mode.reducedMotion,
    }),
  ]);
  const sourceObservation = monitorPage(sourcePage, server.origin);
  const projectedObservation = monitorPage(projectedPage, server.origin);
  const sourceUrl = `${server.origin}/source/${CONSUMER_PATH}`;
  const projectedUrl = `${server.origin}/projected/index.html`;
  const label = `${viewport.id}/${mode.id}`;

  try {
    await Promise.all([
      sourcePage.goto(sourceUrl, { waitUntil: "domcontentloaded" }),
      projectedPage.goto(projectedUrl, { waitUntil: "domcontentloaded" }),
    ]);
    await Promise.all([settle(sourcePage), settle(projectedPage)]);

    const [sourceSnapshot, projectedSnapshot] = await Promise.all([
      renderedSnapshot(sourcePage),
      renderedSnapshot(projectedPage),
    ]);
    assertContained(sourceSnapshot, `${label}/source`);
    assertContained(projectedSnapshot, `${label}/projected`);
    assert.ok(
      sourceSnapshot.presence.routeCards > 0,
      `${label}: the source About route-card landmark is present`,
    );
    if (
      sourceSnapshot.records.length !== projectedSnapshot.records.length ||
      sourceSnapshot.records.some(
        (record, index) => record.styleDigest !== projectedSnapshot.records[index]?.styleDigest,
      )
    ) {
      const firstRecordedDifference = sourceSnapshot.records.findIndex(
        (record, index) => record.styleDigest !== projectedSnapshot.records[index]?.styleDigest,
      );
      assert.fail(
        `${label}: computed-style divergence ` + JSON.stringify({
          differences: await styleDifferences(
            sourcePage,
            projectedPage,
            sourceSnapshot,
            projectedSnapshot,
          ),
          sourceStructure: sourceSnapshot.structureDigest,
          projectedStructure: projectedSnapshot.structureDigest,
          sourceElements: sourceSnapshot.records.length,
          projectedElements: projectedSnapshot.records.length,
          firstRecordedDifference,
          sourceRecord: sourceSnapshot.records[firstRecordedDifference],
          projectedRecord: projectedSnapshot.records[firstRecordedDifference],
        }),
      );
    }
    assert.deepEqual(
      compactSnapshot(projectedSnapshot),
      compactSnapshot(sourceSnapshot),
      `${label}: production CSS projection preserves computed styles, pseudo styles, geometry, content, and landmarks`,
    );

    if (
      viewport.id === "desktop" &&
      mode.javaScriptEnabled &&
      mode.media === "screen" &&
      mode.forcedColors === "none" &&
      mode.reducedMotion === "no-preference"
    ) {
      const [sourceInteractions, projectedInteractions] = await Promise.all([
        interactionReceipt(sourcePage, { mediaToggle: true }),
        interactionReceipt(projectedPage, { mediaToggle: true }),
      ]);
      assert.equal(
        sourceInteractions.focused.active,
        true,
        `${label}: the source primary navigation accepts keyboard focus`,
      );
      assert.deepEqual(
        sourceInteractions.media,
        {
          pressed: "true",
          source: "impact-map-style-cycle-calm.gif",
          label: "Show still image",
        },
        `${label}: the source progressive-media control enters its active state`,
      );
      assert.deepEqual(
        projectedInteractions,
        sourceInteractions,
        `${label}: navigation focus, disclosure, and progressive media controls remain equivalent`,
      );
    }

    const sourceExpected = projection.sourceStylesheets
      .filter(sourcePath => !mode.javaScriptEnabled || !sourcePath.endsWith("about-noscript.css"))
      .map(sourcePath => `/source/${sourcePath}`);
    const projectedExpected = projection.outputs
      .filter(output => !mode.javaScriptEnabled || output.id !== "about-noscript")
      .map(output => `/projected/${output.projected_path}`);
    assert.equal(sourceExpected.length, mode.javaScriptEnabled ? 7 : 8, `${label}: source request count`);
    assert.equal(projectedExpected.length, mode.javaScriptEnabled ? 2 : 3, `${label}: projected request count`);
    assertStylesheetResponses(sourceObservation.stylesheets, sourceExpected, `${label}/source`);
    assertStylesheetResponses(projectedObservation.stylesheets, projectedExpected, `${label}/projected`);

    const sourceRefusals = assertTelemetry(sourceObservation.telemetry, server.origin, `${label}/source`);
    const projectedRefusals = assertTelemetry(projectedObservation.telemetry, server.origin, `${label}/projected`);
    assert.ok(
      sourceRefusals.length > 0,
      `${label}: the deterministic iframe boundary fixture exercises at least one refusal`,
    );
    assert.deepEqual(
      projectedRefusals,
      sourceRefusals,
      `${label}: expected loopback iframe policy refusals remain equal`,
    );
    return {
      label,
      sourceCssRequests: sourceObservation.stylesheets.length,
      projectedCssRequests: projectedObservation.stylesheets.length,
      expectedIframeRefusals: sourceRefusals.length,
    };
  } finally {
    await context.close();
  }
}

const projection = await prepareProjection();
const server = await startProjectionServer(projection);
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of VIEWPORTS) {
    for (const mode of MODES) {
      results.push(await runScenario(browser, server, projection, viewport, mode));
    }
  }
  process.stdout.write(`${JSON.stringify({
    contract: "prod-about-css-projection.browser.v1",
    scenarios: results,
    generatedCss: projection.outputs.map(output => ({
      id: output.id,
      path: output.projected_path,
      bytes: output.bytes.byteLength,
    })),
    verdict: "source and deterministic production CSS renderings are equivalent",
  }, null, 2)}\n`);
} finally {
  await browser.close();
  await server.close();
}
