#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { promisify } from "node:util";

import {
  classifyExpectedIframeRefusals,
  formatVisualRequestFailure,
} from "./context-canvas-visual-observation-contract.mjs";

const execFileAsync = promisify(execFile);
const CANVAS_DIRECTORY = "context-canvas-project-surface/context-canvas";
const VIEWPORTS = [
  { id: "narrow", width: 390, height: 844 },
  { id: "desktop", width: 1440, height: 1000 },
  { id: "wide", width: 2560, height: 1440 }
];

const FAMILIES = [
  {
    id: "entry-and-catalog",
    title: "Entry and catalog",
    standing: "primary",
    routes: ["404.html", "index.html", "debriefs.html"]
  },
  {
    id: "ai-systems-and-instruments",
    title: "AI Systems and instruments",
    standing: "instrument",
    routes: [
      "ai-systems.html",
      "benchmark-orientation.html",
      "collaboration-skills.html",
      "concept-nursery.html",
      "core-architectures-orientation-index.html",
      "cross-platform-collaboration-cycle.html",
      "grammar-family.html",
      "hiring-surfaces-talent-agent-intake.html",
      "maps-evaluations.html",
      "metadata-blocks.html",
      "planning-surface.html",
      "poda.html",
      "readable-tables-reusable-evidence.html",
      "registry-goal-fidelity-routing.html",
      "resting-concepts.html",
      "shared-machinery.html",
      "visualization-fidelity-atlas.html"
    ]
  },
  {
    id: "prompt-conditions",
    title: "Prompt conditions",
    standing: "instrument",
    routes: ["conditioning-field.html", "prompt-side-conditions-practice.html"]
  },
  {
    id: "composed-debriefs",
    title: "Composed Debriefs",
    standing: "debrief",
    routes: [
      "choose-your-player-humatics.html",
      "ehr-discrete-genomic-result.html",
      "ehr-interface-engine-replatform.html",
      "ehr-pgx-alert-failure.html",
      "ehr-three-front-doors.html",
      "ehr-two-charts-one-result.html",
      "spatial-capture-collaborative-memory.html",
      "fmi-clinical-trial-coordination.html",
      "multilingual-clinical-vocabulary-practice.html",
      "recoverable-enterprise-forms.html"
    ]
  },
  {
    id: "enterprise-readings",
    title: "Enterprise readings",
    standing: "reading",
    routes: [
      "distributed-inspection-harness.html",
      "field-inspection-harness-replatform.html",
      "fmi-lims-eln-replatforming.html",
      "genomic-viewer-replatforming.html",
      "initiative-costing.html",
      "narrative-execution-gap-research-atlas.html",
      "one-figure-several-readings.html",
      "three-way-comparative-return.html",
      "who-to-believe-reviews-platform.html"
    ]
  },
  {
    id: "historical-exemplars",
    title: "Historical exemplars",
    standing: "exemplar",
    routes: [
      "exemplar-index-landing.html"
    ]
  }
];

const STANDING_OVERRIDES = new Map([
  ["404.html", "recovery"],
  ["debriefs.html", "catalog"],
  ["ai-systems.html", "primary"],
  ["collaboration-skills.html", "catalog"],
  ["grammar-family.html", "primary"],
  ["prompt-side-conditions-practice.html", "practice"]
]);

function usage() {
  return [
    "Usage:",
    "  npm run visual:context-canvas-reference -- --phase before",
    "  npm run visual:context-canvas-reference -- --phase after-about --family entry-and-catalog",
    "",
    "Options:",
    "  --phase <label>    Comparison phase recorded in filenames (default: reference)",
    "  --family <id>      Capture one family (default: all)",
    "  --list             List discovered routes with family and standing",
    "  --help             Show this message"
  ].join("\n");
}

function safeSegment(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "reference";
}

function parseArgs(argv) {
  const options = { phase: "reference", family: "all", list: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--phase") {
      options.phase = argv[++index];
    } else if (argument === "--family") {
      options.family = argv[++index];
    } else if (argument === "--list") {
      options.list = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  if (!options.phase) throw new Error("--phase requires a label");
  if (!options.family) throw new Error("--family requires an id");
  return options;
}

function metadataFor(route) {
  const matches = FAMILIES.filter((candidate) => candidate.routes.includes(route));
  if (matches.length !== 1) {
    throw new Error(
      `${route} must belong to exactly one visual-reference family; found ${matches.length}`,
    );
  }
  const family = matches[0];
  return {
    route,
    family: family.id,
    familyTitle: family.title,
    standing: STANDING_OVERRIDES.get(route) || family.standing
  };
}

async function discoverRoutes() {
  const entries = await readdir(CANVAS_DIRECTORY, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => metadataFor(entry.name))
    .sort((left, right) => left.route.localeCompare(right.route));
}

async function sourceIdentity() {
  const [{ stdout: revision }, { stdout: shortRevision }, { stdout: status }] = await Promise.all([
    execFileAsync("git", ["rev-parse", "HEAD"]),
    execFileAsync("git", ["rev-parse", "--short=12", "HEAD"]),
    execFileAsync("git", ["status", "--porcelain"])
  ]);
  const dirty = Boolean(status.trim());
  return {
    revision: revision.trim(),
    shortRevision: shortRevision.trim(),
    worktree: dirty ? "dirty" : "clean",
    label: `${shortRevision.trim()}${dirty ? "-dirty" : ""}`
  };
}

async function startStaticServer(rootDirectory) {
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".xml": "application/xml; charset=utf-8"
  };
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const absolutePath = resolve(rootDirectory, `.${pathname}`);
      const repositoryPath = relative(rootDirectory, absolutePath);
      if (repositoryPath.startsWith("..") || repositoryPath === "") {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(absolutePath);
      response.writeHead(200, {
        "Content-Type": contentTypes[extname(absolutePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      response.end(body);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500).end("Unavailable");
    }
  });
  await new Promise((resolveListening, rejectListening) => {
    server.once("error", rejectListening);
    server.listen(0, "127.0.0.1", resolveListening);
  });
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    })
  };
}

async function settleInitialState(page) {
  await page.addStyleTag({
    content: "html { scroll-behavior: auto !important; }"
  });
  await page.evaluate(() => {
    for (const element of document.querySelectorAll("img[loading], iframe[loading]")) {
      element.setAttribute("loading", "eager");
    }
  });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  const traversal = await page.evaluate(async () => {
    const pause = () => new Promise((resolvePause) => {
      requestAnimationFrame(() => setTimeout(resolvePause, 25));
    });
    const step = Math.max(window.innerHeight * 0.8, 480);
    const maximumSteps = 240;
    const maximumMilliseconds = 12000;
    const startedAt = performance.now();
    let steps = 0;
    while (window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 1) {
      if (steps >= maximumSteps || performance.now() - startedAt >= maximumMilliseconds) break;
      const nextPosition = Math.min(
        window.scrollY + step,
        document.documentElement.scrollHeight - window.innerHeight
      );
      window.scrollTo(0, nextPosition);
      await pause();
      steps += 1;
    }
    return {
      steps,
      scrollHeight: document.documentElement.scrollHeight,
      traversalTruncated: window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 1
    };
  });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  for (const frame of page.frames()) {
    await frame.evaluate(async () => {
      await document.fonts?.ready;
      const decodes = [...document.images].map((image) => image.decode?.().catch(() => {}));
      await Promise.race([
        Promise.allSettled(decodes),
        new Promise((resolveImages) => setTimeout(resolveImages, 2000))
      ]);
    }).catch(() => {});
  }
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
  });
  return traversal;
}

async function captureViewport(browser, serverOrigin, runDirectory, routeMetadata, viewport, phase, source) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: "light",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const httpErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const requestFailureDetails = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    const failure = {
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      navigationRequest: request.isNavigationRequest(),
      errorText: request.failure()?.errorText || "failed",
    };
    requestFailureDetails.push(failure);
    requestFailures.push(formatVisualRequestFailure(failure));
  });

  const routeUrl = new URL(`${CANVAS_DIRECTORY}/${routeMetadata.route}`, `${serverOrigin}/`).href;
  const familyDirectory = resolve(runDirectory, routeMetadata.family);
  const filename = [
    safeSegment(routeMetadata.route.replace(/\.html$/, "")),
    viewport.id,
    safeSegment(phase),
    source.label
  ].join("--") + ".png";
  const screenshotPath = resolve(familyDirectory, filename);
  try {
    await mkdir(familyDirectory, { recursive: true });
    const response = await page.goto(routeUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    const settlement = await settleInitialState(page);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const pageMetrics = await page.evaluate(() => ({
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      iframeSources: [...document.querySelectorAll("iframe[src]")].map((iframe) => iframe.src),
    }));
    const screenshotStats = await stat(screenshotPath);
    return {
      route: routeMetadata.route,
      family: routeMetadata.family,
      familyTitle: routeMetadata.familyTitle,
      standing: routeMetadata.standing,
      viewport,
      status: "captured",
      responseStatus: response?.status() || null,
      screenshot: relative(runDirectory, screenshotPath).replaceAll("\\", "/"),
      bytes: screenshotStats.size,
      pageMetrics,
      consoleErrors,
      httpErrors,
      pageErrors,
      requestFailures,
      requestFailureDetails,
      parentOrigin: new URL(routeUrl).origin,
      settlement
    };
  } catch (error) {
    return {
      route: routeMetadata.route,
      family: routeMetadata.family,
      familyTitle: routeMetadata.familyTitle,
      standing: routeMetadata.standing,
      viewport,
      status: "error",
      error: error.stack || error.message,
      consoleErrors,
      httpErrors,
      pageErrors,
      requestFailures,
      requestFailureDetails,
      parentOrigin: new URL(routeUrl).origin,
    };
  } finally {
    await context.close();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function indexHtml(summary, runDirectory) {
  const groups = [...new Set(summary.routes.map((route) => route.family))];
  const navigation = groups.map((family) => {
    const title = summary.routes.find((route) => route.family === family)?.familyTitle || family;
    return `<a href="#${escapeHtml(family)}">${escapeHtml(title)}</a>`;
  }).join("\n");
  const sections = groups.map((family) => {
    const routes = summary.routes.filter((route) => route.family === family);
    const title = routes[0]?.familyTitle || family;
    const cards = routes.map((route) => {
      const captures = summary.results.filter((result) => result.route === route.route);
      const pageTitle = captures.find((capture) => capture.pageMetrics?.title)?.pageMetrics.title || route.route;
      const routeLink = relative(runDirectory, resolve(CANVAS_DIRECTORY, route.route)).replaceAll("\\", "/");
      const figures = captures.map((capture) => capture.status === "captured"
        ? `<figure><a href="${escapeHtml(capture.screenshot)}"><img src="${escapeHtml(capture.screenshot)}" alt="${escapeHtml(pageTitle)} at ${escapeHtml(capture.viewport.id)} viewport" loading="lazy"></a><figcaption>${escapeHtml(capture.viewport.id)} · ${capture.viewport.width} × ${capture.viewport.height} · ${(capture.bytes / 1024 / 1024).toFixed(2)} MiB</figcaption></figure>`
        : `<div class="error"><strong>${escapeHtml(capture.viewport.id)}</strong><pre>${escapeHtml(capture.error || "Capture unavailable")}</pre></div>`
      ).join("\n");
      return `<article><header><p>${escapeHtml(route.standing)}</p><h3><a href="${escapeHtml(routeLink)}">${escapeHtml(pageTitle)}</a></h3><code>${escapeHtml(route.route)}</code></header><div class="captures">${figures}</div></article>`;
    }).join("\n");
    return `<section id="${escapeHtml(family)}"><h2>${escapeHtml(title)}</h2>${cards}</section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Context Canvas visual reference · ${escapeHtml(summary.phase)}</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; background: #f5f3ee; color: #17243c; }
    body { margin: 0 auto; max-width: 112rem; padding: clamp(1rem, 3vw, 3rem); }
    h1, h2, h3, p { margin-block: 0; }
    header > p, figcaption { color: #536277; font-size: .85rem; }
    nav { display: flex; flex-wrap: wrap; gap: .65rem; margin-block: 1.5rem 2.5rem; }
    nav a { background: #fff; border: 1px solid #cbd4e1; border-radius: 999px; padding: .45rem .75rem; }
    section { margin-block: 3rem; }
    section > h2 { border-block-end: 2px solid #1f55d5; padding-block-end: .6rem; }
    article { background: #fff; border: 1px solid #dbe1ea; border-radius: .8rem; margin-block: 1rem; padding: 1rem; }
    article header { display: grid; gap: .35rem; }
    .captures { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); margin-block-start: 1rem; }
    figure { margin: 0; min-width: 0; }
    img { border: 1px solid #dbe1ea; display: block; height: 30rem; object-fit: contain; object-position: top; width: 100%; }
    a { color: #174cb7; }
    code, pre { white-space: pre-wrap; word-break: break-word; }
    .error { background: #fff2ef; border-inline-start: .35rem solid #c6472f; padding: .75rem; }
  </style>
</head>
<body>
  <header>
    <p>Local, cycle-scoped orientation</p>
    <h1>Context Canvas visual reference</h1>
    <p>Phase <strong>${escapeHtml(summary.phase)}</strong> · source <code>${escapeHtml(summary.source.revision)}</code> · ${escapeHtml(summary.source.worktree)} worktree · ${summary.routeCount} routes · ${summary.captureCount} captures · ${summary.expectedRefusalCount} expected iframe refusals · ${summary.observationCount} observations · ${(summary.totalBytes / 1024 / 1024).toFixed(2)} MiB</p>
  </header>
  <nav aria-label="Reference families">${navigation}</nav>
  <main>${sections}</main>
</body>
</html>`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const discoveredRoutes = await discoverRoutes();
  if (options.list) {
    for (const route of discoveredRoutes) {
      console.log(`${route.family}\t${route.standing}\t${route.route}`);
    }
    return;
  }

  const knownFamilies = new Set(FAMILIES.map((family) => family.id));
  if (options.family !== "all" && !knownFamilies.has(options.family)) {
    throw new Error(`Unknown family: ${options.family}. Available: ${[...knownFamilies].join(", ")}`);
  }
  const routes = options.family === "all"
    ? discoveredRoutes
    : discoveredRoutes.filter((route) => route.family === options.family);
  if (!routes.length) throw new Error(`No routes discovered for family: ${options.family}`);

  const source = await sourceIdentity();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDirectory = resolve(
    ".visual-runs",
    "context-canvas-reference",
    source.label,
    safeSegment(options.phase),
    timestamp
  );
  await mkdir(runDirectory, { recursive: true });

  const server = await startStaticServer(process.cwd());
  let browser = null;
  let browserVersion = "";
  const results = [];
  try {
    browser = await chromium.launch();
    browserVersion = browser.version();
    const total = routes.length * VIEWPORTS.length;
    let completed = 0;
    for (const route of routes) {
      for (const viewport of VIEWPORTS) {
        completed += 1;
        console.log(`[${completed}/${total}] ${route.route} · ${viewport.id}`);
        results.push(await captureViewport(
          browser,
          server.origin,
          runDirectory,
          route,
          viewport,
          options.phase,
          source
        ));
      }
    }
  } finally {
    if (browser) await browser.close();
    await server.close();
  }

  for (const result of results) {
    result.iframeRefusalClassification = classifyExpectedIframeRefusals({
      parentOrigin: result.parentOrigin,
      iframeSources: result.pageMetrics?.iframeSources,
      consoleErrors: result.consoleErrors,
      requestFailures: result.requestFailures,
      requestFailureDetails: result.requestFailureDetails,
    });
  }
  const totalBytes = results.reduce((total, result) => total + (result.bytes || 0), 0);
  const captured = results.filter((result) => result.status === "captured");
  const errors = results.filter((result) => result.status === "error");
  const expectedRefusalCount = results.reduce(
    (total, result) => total + result.iframeRefusalClassification.expectedRefusals.length,
    0,
  );
  const observations = results.flatMap((result) => [
    ...(result.settlement?.traversalTruncated
      ? [`${result.route} · ${result.viewport.id}: page traversal reached its safety bound`]
      : []),
    ...result.httpErrors.map((error) => `${result.route} · ${result.viewport.id}: ${error}`),
    ...result.iframeRefusalClassification.policyObservations.map(
      (observation) => `${result.route} · ${result.viewport.id}: policy: ${observation}`,
    ),
    ...result.iframeRefusalClassification.remainingConsoleErrors.map(
      (error) => `${result.route} · ${result.viewport.id}: console: ${error}`,
    ),
    ...result.pageErrors.map((error) => `${result.route} · ${result.viewport.id}: page: ${error}`),
    ...result.iframeRefusalClassification.remainingRequestFailures.map(
      (error) => `${result.route} · ${result.viewport.id}: request: ${error}`,
    ),
  ]);
  const summary = {
    phase: options.phase,
    family: options.family,
    capturedAt: new Date().toISOString(),
    source,
    browser: { name: "chromium", version: browserVersion },
    viewports: VIEWPORTS,
    runDirectory,
    routeCount: routes.length,
    captureCount: captured.length,
    errorCount: errors.length,
    expectedRefusalCount,
    observationCount: observations.length,
    totalBytes,
    routes,
    results
  };
  await writeFile(resolve(runDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(resolve(runDirectory, "index.html"), indexHtml(summary, runDirectory));

  console.log(
    `Context Canvas reference: ${captured.length}/${results.length} captures · ` +
      `${(totalBytes / 1024 / 1024).toFixed(2)} MiB · ` +
      `${expectedRefusalCount} expected iframe refusals · ${observations.length} observations`,
  );
  console.log(`Index: ${resolve(runDirectory, "index.html")}`);
  for (const observation of observations) console.warn(`- ${observation}`);
  if (errors.length) {
    for (const error of errors) console.error(`- ${error.route} · ${error.viewport.id}: ${error.error?.split("\n")[0]}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
