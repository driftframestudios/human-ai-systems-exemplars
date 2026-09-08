#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { chromium } from "@playwright/test";

import {
  PUBLIC_IFRAME_NAMESPACE,
  PUBLIC_REFERENCE_NAMESPACE,
  inspectPublicReferenceSource,
  materializePublicReferences,
} from "./materialize-public-references.mjs";
import {
  assertRegularFileWithin,
  createPackagePlan,
} from "./package-iframe-routes.mjs";
import { createCanvasPackagePlan } from "./package-canvas-iframe-routes.mjs";
import {
  assertTelemetry,
  monitor,
  repositoryRoot,
  startStaticServer,
} from "./core-architecture-browser-helper.mjs";

const contextCanvasDirectory = "context-canvas";
const expectedCarrierRouteCounts = [
  ["conditioning-field", 1],
  ["core-architecture-family-index", 1],
  ["cross-channel-blueprint", 1],
  ["heart-chart", 1],
  ["poda", 1],
  ["service-design-blueprint", 1],
  ["specification-by-example", 1],
  ["strategy-canvas", 2],
];
const viewports = [1280, 800, 480, 390, 320];
const strategySourceUrls = new Set([
  "https://www.blueoceanstrategy.com/tools/strategy-canvas/",
  "https://www.insead.edu/faculty-research/publications/books/blue-ocean-strategy-expanded-edition-how-create-uncontested",
  "../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json",
]);

function configuredDestination(key) {
  if (key.startsWith(PUBLIC_IFRAME_NAMESPACE)) {
    const [family, ...route] = key
      .slice(PUBLIC_IFRAME_NAMESPACE.length)
      .toLowerCase()
      .split("_");
    return `https://iframes.vik.guru/v1/${family}/${route.join("-")}/`;
  }
  return `https://registry.example/readings/${key
    .slice(PUBLIC_REFERENCE_NAMESPACE.length)
    .toLowerCase()
    .replaceAll("_", "-")}`;
}

function attributeValue(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(`\\s${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return match ? (match[1] ?? match[2]) : null;
}

function publicRouteUrl(routeManifest, routeProfile) {
  return `https://${routeManifest.host}${routeProfile.public_alias}`;
}

function routeProjectionPath(routeManifest, routeProfile) {
  if (routeProfile.public_alias === routeManifest.base_path) return "index.html";
  return `${routeProfile.public_alias
    .slice(routeManifest.base_path.length)
    .replace(/\/$/, "")}/index.html`;
}

function routeSourceRoot(routeProfile, coreRoot) {
  return routeProfile.source_root
    ? join(repositoryRoot, routeProfile.source_root)
    : coreRoot;
}

function packageContentType(relativePath) {
  if (relativePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (relativePath.endsWith(".svg")) return "image/svg+xml";
  if (relativePath.endsWith(".json")) return "application/json";
  if (relativePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (relativePath.endsWith(".js") || relativePath.endsWith(".mjs")) {
    return "text/javascript; charset=utf-8";
  }
  throw new Error(`Iframe carrier contract needs an explicit content type for ${relativePath}.`);
}

function publicPackageFiles(packagePlan) {
  const { contract, outputFiles } = packagePlan;
  const files = new Map();
  for (const [relativePath, bytes] of outputFiles) {
    files.set(`https://${contract.host}${contract.base_path}${relativePath}`, {
      bytes,
      contentType: packageContentType(relativePath),
    });
  }
  for (const routeProfile of contract.routes) {
    const projectionPath = routeProjectionPath(contract, routeProfile);
    const bytes = outputFiles.get(projectionPath);
    assert.ok(bytes, `${routeProfile.id} has packaged hosted bytes`);
    files.set(publicRouteUrl(contract, routeProfile), {
      bytes,
      contentType: "text/html; charset=utf-8",
    });
  }
  return files;
}

function sortedRouteCounts(carriers) {
  const counts = new Map();
  for (const { routeProfile } of carriers) {
    counts.set(routeProfile.id, (counts.get(routeProfile.id) ?? 0) + 1);
  }
  return [...counts].sort(([left], [right]) => left.localeCompare(right));
}

async function discoverPublicIframeCarriers(outputRoot, routeManifest) {
  const contextRoot = join(outputRoot, contextCanvasDirectory);
  const publicBase = `https://${routeManifest.host}${routeManifest.base_path}`;
  const routeByPublicUrl = new Map(
    routeManifest.routes.map((routeProfile) => [
      publicRouteUrl(routeManifest, routeProfile),
      routeProfile,
    ]),
  );
  const pages = (await readdir(contextRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .sort((left, right) => left.name.localeCompare(right.name));
  const carriers = [];

  for (const entry of pages) {
    const html = await readFile(join(contextRoot, entry.name), "utf8");
    for (const match of html.matchAll(/<iframe\b[^>]*>/gi)) {
      const tag = match[0];
      const src = attributeValue(tag, "src");
      if (!src?.startsWith(publicBase)) continue;
      const routeProfile = routeByPublicUrl.get(src);
      assert.ok(
        routeProfile,
        `${entry.name} uses a manifest-owned public Core iframe route (${src})`,
      );
      carriers.push({
        page: `/${contextCanvasDirectory}/${entry.name}`,
        routeProfile,
        src,
        tag,
      });
    }
  }

  assert.equal(
    carriers.length,
    9,
    "the materialized Context Canvas exposes nine actual iframe instances",
  );
  assert.deepEqual(
    sortedRouteCounts(carriers),
    expectedCarrierRouteCounts,
    "the nine actual carriers use the eight activated public routes",
  );
  assert.equal(
    carriers.some(({ routeProfile }) => routeProfile.id === "core-architectures-pack"),
    false,
    "the multi-route pack hub remains a direct full-view index rather than an iframe",
  );
  return carriers;
}

async function assertCarrierContainment(page, carrier, frame, label) {
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 1000 });
    await carrier.scrollIntoViewIfNeeded();
    const parentContainment = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.ok(
      parentContainment.scrollWidth <= parentContainment.clientWidth + 1,
      `${label} contains visitor-surface root overflow at ${width}px ` +
        `(${parentContainment.scrollWidth}/${parentContainment.clientWidth})`,
    );
    const frameContainment = await frame.locator("html").evaluate((root) => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    }));
    assert.ok(
      frameContainment.scrollWidth <= frameContainment.clientWidth + 1,
      `${label} contains framed-document root overflow at ${width}px ` +
        `(${frameContainment.scrollWidth}/${frameContainment.clientWidth})`,
    );
  }
}

async function assertParentLinksRemainOrdinary(carrier, label) {
  const links = carrier.locator("xpath=ancestor::figure[1]").locator("a[href]");
  for (const link of await links.all()) {
    assert.equal(
      await link.getAttribute("target"),
      null,
      `${label} keeps its parent-page link in the visitor's current context`,
    );
    assert.equal(
      await link.getAttribute("rel"),
      null,
      `${label} keeps ordinary parent-page link security semantics`,
    );
  }
}

async function assertProjectedExitLinks(frame, label) {
  const links = await frame.locator("a[href]").evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      download: anchor.hasAttribute("download"),
      href: anchor.getAttribute("href")?.trim() ?? "",
      rel: anchor.getAttribute("rel"),
      target: anchor.getAttribute("target"),
    })),
  );
  const exits = links.filter(({ download, href }) =>
    href.length > 0 &&
    !href.startsWith("#") &&
    !download &&
    !/^javascript:/iu.test(href),
  );
  assert.equal(
    exits.every(({ rel, target }) => {
      const relTokens = new Set((rel ?? "").toLowerCase().split(/\s+/u).filter(Boolean));
      return target === "_blank" && relTokens.has("noopener") && relTokens.has("noreferrer");
    }),
    true,
    `${label} projected exits open in secure top-level tabs`,
  );
  assert.equal(
    links.filter(({ href }) => href.startsWith("#")).every(({ target }) => target !== "_blank"),
    true,
    `${label} fragment navigation remains within the framed document`,
  );
  return exits.length;
}

async function exerciseStrategyCarrier(page, carrier, frame, label) {
  assert.equal(
    await frame.locator("[data-direct-source-route]").count(),
    0,
    `${label} replaces direct-only source links with an embedded handoff`,
  );
  assert.equal(
    await frame.locator("[data-framed-source-handoff]").isVisible(),
    true,
    `${label} explains where its embedded source routes continue`,
  );
  const figure = carrier.locator("xpath=ancestor::figure[1]");
  const sourceLinks = figure.locator("[data-strategy-canvas-host-source]");
  assert.equal(await sourceLinks.count(), strategySourceUrls.size, `${label} exposes every source and evidence route after the frame`);
  const hrefs = new Set();
  for (const sourceLink of await sourceLinks.all()) {
    assert.equal(await sourceLink.getAttribute("target"), null, `${label} leaves new-context choice with the visitor`);
    assert.equal(await sourceLink.getAttribute("rel"), null, `${label} uses ordinary parent-page link semantics`);
    hrefs.add(await sourceLink.getAttribute("href"));
  }
  assert.deepEqual(hrefs, strategySourceUrls, `${label} uses the exact source and evidence routes`);

  const prompt = frame.locator('[data-sc-role="prompt"]');
  const assistedView = frame.locator('[data-prompt-view][value="skill-assisted"]');
  await assistedView.check();
  const markdown = await prompt.textContent();
  assert.match(
    markdown,
    /^# Prompt Capsule: Strategy Canvas\n\n- Contract: `prompt-capsule\/0\.1\.0`$/m,
    `${label} exposes the versioned Markdown contract`,
  );
  assert.match(markdown, /^## Skill assistance$/m, `${label} exposes the assisted view inside the framed document`);

  const downloadEvent = page.waitForEvent("download");
  await frame.locator('[data-action="download-markdown"]').click();
  const download = await downloadEvent;
  assert.equal(
    download.suggestedFilename(),
    "strategy-canvas-collaboration-field.prompt-capsule.r1.skill-assisted.md",
    `${label} names the downloaded Markdown deterministically`,
  );
  const downloadPath = await download.path();
  assert.ok(downloadPath, `${label} makes the downloaded Markdown readable to the receiving browser`);
  assert.equal(
    await readFile(downloadPath, "utf8"),
    markdown,
    `${label} downloads the exact Markdown bytes visible in the active view`,
  );
}

async function exerciseHeartCarrier(page, carrier, frame, heartFrame) {
  const before = JSON.parse(await frame.locator("#jsonExport").inputValue());
  const addRow = frame.locator('[data-action="add-row"]');
  await addRow.focus();
  await page.keyboard.press("Enter");
  const after = JSON.parse(await frame.locator("#jsonExport").inputValue());
  assert.equal(after.heart_chart.rows.length, before.heart_chart.rows.length + 1);
  const addedId = after.heart_chart.rows.at(-1).id;

  const removeRow = frame.locator(
    `[data-action="remove-row"][data-row-id="${addedId}"]`,
  );
  await removeRow.focus();
  await page.keyboard.press("Enter");
  assert.equal(await removeRow.textContent(), "Confirm removal");
  assert.equal(
    JSON.parse(await frame.locator("#jsonExport").inputValue())
      .heart_chart.rows.some(({ id }) => id === addedId),
    true,
  );
  await page.keyboard.press("Enter");
  assert.equal(
    JSON.parse(await frame.locator("#jsonExport").inputValue())
      .heart_chart.rows.some(({ id }) => id === addedId),
    false,
  );
  assert.notEqual(
    await frame.locator("body").evaluate(() => document.activeElement?.tagName),
    "BODY",
    "confirmed removal restores useful focus inside the HEART carrier",
  );

  await frame.locator('[data-action="copy-json"]').click();
  await heartFrame.waitForFunction(() =>
    /JSON copied|manual copy/.test(
      document.querySelector("#jsonCopyMessage")?.textContent ?? "",
    ),
  );
  assert.match(
    await frame.locator("#jsonCopyMessage").textContent(),
    /JSON copied|manual copy/,
    "the sandboxed HEART carrier exposes either clipboard success or its visible fallback",
  );

  await carrier.scrollIntoViewIfNeeded();
  const matrixContainment = await frame.locator("html").evaluate(() => {
    const editTable = document.querySelector("#editTable");
    return {
      clientWidth: editTable?.clientWidth ?? 0,
      scrollWidth: editTable?.scrollWidth ?? 0,
    };
  });
  assert.ok(
    matrixContainment.scrollWidth > matrixContainment.clientWidth,
    "the HEART matrix retains local two-dimensional access at the narrow viewport",
  );
}

async function exerciseConditioningCarrier(page, frame) {
  const fifthRung = frame.locator('[data-rung-id="rung-5"]');
  await fifthRung.focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await fifthRung.getAttribute("aria-pressed"),
    "true",
    "the hosted Conditioning Field changes its selected formulation rung",
  );
  assert.equal(
    JSON.parse(await frame.locator("#stateContract").textContent()).selectedRungId,
    "rung-5",
    "the hosted Conditioning Field exposes the selected rung in its local state contract",
  );

  const repair = frame.locator('[data-failure-button-id="failure-authority"]');
  await repair.focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await repair.getAttribute("aria-pressed"),
    "true",
    "the hosted Conditioning Field changes its selected repair",
  );
  assert.equal(
    JSON.parse(await frame.locator("#stateContract").textContent()).selectedFailureId,
    "failure-authority",
    "the hosted Conditioning Field exposes the selected repair in its local state contract",
  );

  const inspectorControl = frame.locator("#inspectRung");
  await inspectorControl.focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await frame.locator("#stateInspector").evaluate((element) => element === document.activeElement),
    true,
    "the hosted Conditioning Field moves focus into its state inspector",
  );
  assert.equal(
    JSON.parse(await frame.locator("#stateContract").textContent()).lastAction.kind,
    "open-inspector",
    "the hosted Conditioning Field records its inspector transition",
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await inspectorControl.evaluate((element) => element === document.activeElement),
    true,
    "the hosted Conditioning Field restores focus to the inspector control",
  );
  assert.equal(
    JSON.parse(await frame.locator("#stateContract").textContent()).lastAction.kind,
    "restore-focus",
    "the hosted Conditioning Field records its focus restoration",
  );

  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const footerRows = await frame.locator("footer").evaluate((footer) => {
      const summaryRows = [...footer.querySelectorAll(":scope > span")]
        .map((node) => node.getBoundingClientRect());
      const boundary = footer.querySelector("[data-visitor-boundary]")?.getBoundingClientRect();
      const maps = footer.querySelector('[data-visitor-boundary-marker="maps"]')
        ?.getBoundingClientRect();
      const bigBench = footer.querySelector('[data-visitor-boundary-marker="big-bench"]')
        ?.getBoundingClientRect();
      const attribution = footer.querySelector(".site-attribution")?.getBoundingClientRect();
      const footerBox = footer.getBoundingClientRect();
      return {
        attributionTop: attribution?.top ?? -1,
        bigBenchBottom: bigBench?.bottom ?? -1,
        bigBenchTop: bigBench?.top ?? -1,
        boundaryTop: boundary?.top ?? -1,
        boundaryWidth: boundary?.width ?? -1,
        footerWidth: footerBox.width,
        mapsTop: maps?.top ?? -1,
        summaryBottom: Math.max(...summaryRows.map(({ bottom }) => bottom), -1),
      };
    });
    assert.ok(
      footerRows.boundaryTop >= footerRows.summaryBottom - 1,
      `the hosted Conditioning Field begins its visitor boundary on a full row after its summary at ${width}px`,
    );
    assert.ok(
      footerRows.boundaryWidth >= footerRows.footerWidth - 1,
      `the hosted Conditioning Field visitor boundary spans the footer width at ${width}px`,
    );
    assert.ok(
      footerRows.mapsTop < footerRows.bigBenchTop &&
        footerRows.bigBenchBottom <= footerRows.attributionTop + 1,
      `the hosted Conditioning Field stacks MAPS, BIG-bench, and attribution as readable rows at ${width}px`,
    );
  }
}

async function exerciseConditioningWithoutScripts(browser, routeUrl, projectionBytes) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 1000 },
  });
  const requests = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    requests.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    });
    if (request.url() === routeUrl && request.resourceType() === "document") {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: projectionBytes,
      });
      return;
    }
    await route.abort("blockedbyclient");
  });
  try {
    const page = await context.newPage();
    await page.goto(routeUrl, { waitUntil: "domcontentloaded" });
    assert.equal(
      await page.locator("#noscriptTitle").isVisible(),
      true,
      "the packaged Conditioning Field exposes its substantive non-script reading",
    );
    const ladderSummary = page.locator("details:has(.ladder-table) > summary");
    assert.equal(
      await ladderSummary.isVisible(),
      true,
      "the packaged Conditioning Field exposes its semantic-ladder disclosure without JavaScript",
    );
    await ladderSummary.focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator(".ladder-table").isVisible(),
      true,
      "the packaged Conditioning Field opens its semantic ladder by keyboard without JavaScript",
    );
    assert.equal(
      await page.locator(".failure-table").isVisible(),
      true,
      "the packaged Conditioning Field keeps the semantic repair table without JavaScript",
    );
    assert.equal(
      await page.locator("[data-js-only]:visible").count(),
      0,
      "the packaged Conditioning Field hides inactive controls without JavaScript",
    );
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const containment = await page.locator("html").evaluate((root) => ({
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
      }));
      assert.ok(
        containment.scrollWidth <= containment.clientWidth + 1,
        `the non-script Conditioning Field contains document overflow at ${width}px`,
      );
    }
    assert.deepEqual(requests, [{
      method: "GET",
      resourceType: "document",
      url: routeUrl,
    }], "the non-script Conditioning Field loads only its single packaged document");
  } finally {
    await context.close();
  }
}

async function inspectConditioningFooter(scope, label) {
  const footer = scope.locator("footer");
  assert.equal(await footer.count(), 1, `${label} renders one footer`);
  await footer.waitFor({ state: "visible" });
  const order = await footer.evaluate((element) => {
    const selectors = [
      ".super-footer__local",
      ".super-footer__grid",
      '[data-visitor-boundary-marker="maps"]',
      '[data-visitor-boundary-marker="big-bench"]',
      ".site-attribution",
    ];
    const nodes = selectors.map(selector => element.querySelector(selector));
    return {
      complete: nodes.every(Boolean),
      ordered: nodes.every((node, index) =>
        index === nodes.length - 1 ||
        Boolean(node.compareDocumentPosition(nodes[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING)
      ),
    };
  });
  assert.deepEqual(
    order,
    { complete: true, ordered: true },
    `${label} keeps local content and routes before MAPS, BIG-bench, and final attribution`,
  );
  assert.equal(
    await footer.locator('[data-visitor-boundary-marker="maps"]').isVisible(),
    true,
    `${label} exposes the MAPS marker`,
  );
  assert.equal(
    await footer.locator('[data-visitor-boundary-marker="big-bench"]').isVisible(),
    true,
    `${label} exposes the BIG-bench marker`,
  );
  assert.equal(
    await footer.locator(".site-attribution").isVisible(),
    true,
    `${label} exposes final attribution`,
  );
}

async function exerciseConditioningFooter(context, serverOrigin) {
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const telemetry = monitor(page);
  try {
    await page.goto(`${serverOrigin}/context-canvas/conditioning-field.html`, {
      waitUntil: "domcontentloaded",
    });
    await inspectConditioningFooter(page, "Conditioning Field screen reading");

    await page.setViewportSize({ width: 320, height: 1000 });
    const containment = await page.locator("html").evaluate((root) => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    }));
    assert.ok(
      containment.scrollWidth <= containment.clientWidth + 1,
      `Conditioning Field footer contains narrow-screen overflow (${containment.scrollWidth}/${containment.clientWidth})`,
    );

    await page.emulateMedia({ media: "print" });
    await inspectConditioningFooter(page, "Conditioning Field print reading");
    await page.emulateMedia({ media: "screen", forcedColors: "active" });
    await inspectConditioningFooter(page, "Conditioning Field forced-color reading");
    assertTelemetry(telemetry);
  } finally {
    await page.close();
  }

  const carrierPage = await context.newPage();
  carrierPage.setDefaultTimeout(7000);
  const carrierTelemetry = monitor(carrierPage);
  try {
    await carrierPage.setViewportSize({ width: 320, height: 1000 });
    await carrierPage.setContent(
      `<iframe title="Conditioning Field embedded reading" src="${serverOrigin}/context-canvas/conditioning-field.html" style="display:block;width:100%;height:900px;border:0"></iframe>`,
      { waitUntil: "domcontentloaded" },
    );
    const frame = carrierPage.frameLocator("iframe");
    await frame.locator("html.is-embedded").waitFor();
    await inspectConditioningFooter(frame, "Conditioning Field embedded reading");
    const containment = await frame.locator("html").evaluate((root) => ({
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    }));
    assert.ok(
      containment.scrollWidth <= containment.clientWidth + 1,
      `Conditioning Field footer contains embedded overflow (${containment.scrollWidth}/${containment.clientWidth})`,
    );
    assertTelemetry(carrierTelemetry);
  } finally {
    await carrierPage.close();
  }
}

async function run() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "core-iframe-carrier-"));
  const outputRoot = join(temporaryRoot, "context-canvas-project-surface");
  let server;
  let sourceServer;
  let browser;
  let context;

  try {
    const iframePackage = await createPackagePlan();
    const canvasIframePackage = await createCanvasPackagePlan();
    const routeManifest = iframePackage.contract;
    assert.equal(
      routeManifest.carrier_contract.title,
      "context_specific_non_empty",
      "the browser contract recognizes the manifest title posture",
    );
    const coreRoot = join(
      repositoryRoot,
      "core-architectures-chimeric-prototype-current-pack-v0.1",
    );
    const projectionRoot = join(
      repositoryRoot,
      "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1",
    );
    const contextManifest = JSON.parse(await readFile(
      join(projectionRoot, "core-architectures-chimeric-prototype-manifest-v0.1.json"),
      "utf8",
    ));
    const contextFileById = new Map(
      contextManifest.prototypes.map((entry) => [entry.id, entry.file]),
    );
    const inventory = await inspectPublicReferenceSource();
    const environment = Object.fromEntries(
      [...inventory.keys].map((key) => [key, configuredDestination(key)]),
    );
    await materializePublicReferences({
      outputRoot,
      outputBoundaryRoot: temporaryRoot,
      configPath: join(temporaryRoot, "no-config-file"),
      environment,
    });

    const generatedPages = await readdir(join(outputRoot, contextCanvasDirectory));
    const materializedTopLevelEntries = new Set(await readdir(outputRoot));
    for (const name of generatedPages.filter((entry) => entry.endsWith(".html"))) {
      assert.equal(
        (await readFile(join(outputRoot, contextCanvasDirectory, name), "utf8"))
          .includes("{{PUBLIC_URL"),
        false,
        `${name} is a resolved materialized page`,
      );
    }
    const carriers = await discoverPublicIframeCarriers(outputRoot, routeManifest);
    const routeByPublicUrl = new Map(
      routeManifest.routes.map((routeProfile) => [
        publicRouteUrl(routeManifest, routeProfile),
        routeProfile,
      ]),
    );
    const hostedFilesByPublicUrl = new Map([
      ...publicPackageFiles(iframePackage),
      ...publicPackageFiles(canvasIframePackage),
    ]);
    const canonicalBytesByPublicUrl = new Map();
    for (const routeProfile of routeManifest.routes) {
      const sourceRoot = routeSourceRoot(routeProfile, coreRoot);
      const source = join(sourceRoot, routeProfile.source_file);
      await assertRegularFileWithin(sourceRoot, source, `${routeProfile.id} route source`);
      const projectionPath = routeProjectionPath(routeManifest, routeProfile);
      const projectionBytes = iframePackage.outputFiles.get(projectionPath);
      assert.ok(projectionBytes, `${routeProfile.id} has packaged hosted bytes`);
      canonicalBytesByPublicUrl.set(
        publicRouteUrl(routeManifest, routeProfile),
        projectionBytes,
      );
    }

    server = await startStaticServer(outputRoot);
    sourceServer = await startStaticServer(repositoryRoot);
    browser = await chromium.launch({ headless: true });

    const populationContext = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
    });
    await populationContext.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin === sourceServer.origin) {
        await route.continue();
        return;
      }
      await route.abort("blockedbyclient");
    });
    try {
      for (const routeProfile of routeManifest.routes) {
        assert.deepEqual(
          routeProfile.carrier_policy.held_capabilities,
          [],
          `${routeProfile.id} resolves held browser capabilities before iframe readiness`,
        );
        const sourceRoot = routeSourceRoot(routeProfile, coreRoot);
        const sourceProjections = routeProfile.source_root
          ? [["Context Canvas source", sourceRoot, routeProfile.source_file]]
          : [
              ["Core source", coreRoot, routeProfile.source_file],
              [
                "Context projection",
                projectionRoot,
                contextFileById.get(routeProfile.id) ?? routeProfile.source_file,
              ],
            ];
        for (const [projectionLabel, projectionDirectory, projectionFile] of sourceProjections) {
          const page = await populationContext.newPage();
          page.setDefaultTimeout(7000);
          const telemetry = monitor(page);
          const sourceUrl = new URL(
            `${relative(repositoryRoot, projectionDirectory)}/${projectionFile}`,
            `${sourceServer.origin}/`,
          ).href;
          const sandbox = routeProfile.carrier_policy.sandbox_tokens.join(" ");
          const permissions = routeProfile.carrier_policy.permissions_policy.join("; ");
          await page.setContent(
            `<iframe title="${routeProfile.display_name}" sandbox="${sandbox}"${
              permissions ? ` allow="${permissions}"` : ""
            } referrerpolicy="no-referrer" src="${sourceUrl}" style="display:block;width:100%;height:900px;border:0"></iframe>`,
            { waitUntil: "domcontentloaded" },
          );
          const frame = page.frameLocator("iframe");
          await frame.locator("body").waitFor();
          assert.equal(
            await frame.locator("html").evaluate(() => globalThis.origin),
            "null",
            `${projectionLabel} ${routeProfile.id} keeps an opaque sandbox origin`,
          );
          assert.equal(
            await frame.locator("iframe").count(),
            0,
            `${projectionLabel} ${routeProfile.id} does not introduce a nested frame`,
          );
          for (const width of viewports) {
            await page.setViewportSize({ width, height: 1000 });
            const containment = await frame.locator("html").evaluate((root) => ({
              clientWidth: root.clientWidth,
              scrollWidth: root.scrollWidth,
            }));
            assert.ok(
              containment.scrollWidth <= containment.clientWidth + 1,
              `${projectionLabel} ${routeProfile.id} contains document overflow at ${width}px ` +
                `(${containment.scrollWidth}/${containment.clientWidth})`,
            );
          }
          await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
          assertTelemetry(telemetry);
          await page.close();
        }
      }
    } finally {
      await populationContext.close();
    }

    context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const requestUrl = new URL(request.url());
      if (requestUrl.origin === server.origin) {
        const [topLevelEntry] = requestUrl.pathname.slice(1).split("/");
        if (materializedTopLevelEntries.has(topLevelEntry)) {
          await route.continue();
          return;
        }
        const sourceResponse = await route.fetch({
          url: `${sourceServer.origin}${requestUrl.pathname}${requestUrl.search}`,
        });
        await route.fulfill({ response: sourceResponse });
        return;
      }
      const hostedFile = hostedFilesByPublicUrl.get(request.url());
      if (
        hostedFile &&
        request.method() === "GET" &&
        ["document", "image", "stylesheet", "script", "fetch", "xhr", "other"]
          .includes(request.resourceType())
      ) {
        await route.fulfill({
          status: 200,
          contentType: hostedFile.contentType,
          headers: {
            "access-control-allow-origin": "*",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
          body: hostedFile.bytes,
        });
        return;
      }
      await route.abort("blockedbyclient");
    });

    const carriersByPage = new Map();
    for (const carrier of carriers) {
      const pageCarriers = carriersByPage.get(carrier.page) ?? [];
      pageCarriers.push(carrier);
      carriersByPage.set(carrier.page, pageCarriers);
    }
    let heartInteractions = 0;
    let conditioningInteractions = 0;
    let strategyInteractions = 0;

    for (const [pagePath, pageCarriers] of carriersByPage) {
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      const telemetry = monitor(page);
      const outsideRequests = [];
      const parentUrl = `${server.origin}${pagePath}`;
      page.on("request", (request) => {
        if (
          request.url().startsWith("http") &&
          new URL(request.url()).origin !== server.origin
        ) {
          outsideRequests.push({
            method: request.method(),
            referer: request.headers().referer ?? null,
            resourceType: request.resourceType(),
            url: request.url(),
          });
        }
      });

      try {
        await page.goto(`${server.origin}${pagePath}`, {
          waitUntil: "domcontentloaded",
        });
        for (const carrierProfile of pageCarriers) {
          const { routeProfile, src, tag } = carrierProfile;
          const label = `${pagePath} → ${routeProfile.id}`;
          const carrierSelector = `iframe[src="${src}"]`;
          const carrier = page.locator(carrierSelector);
          assert.equal(await carrier.count(), 1, `${label} has one unambiguous carrier`);
          await carrier.evaluate((element) => {
            for (
              let ancestor = element.parentElement;
              ancestor;
              ancestor = ancestor.parentElement
            ) {
              if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
            }
          });
          await carrier.scrollIntoViewIfNeeded();
          const frame = page.frameLocator(carrierSelector);
          await frame.locator("body").waitFor();
          await assertParentLinksRemainOrdinary(carrier, label);

          const expectedTitle = attributeValue(tag, "title");
          assert.ok(expectedTitle?.trim(), `${label} carries a context-specific title`);
          assert.equal(
            await carrier.getAttribute("title"),
            expectedTitle,
            `${label} retains its exact title`,
          );
          assert.equal(
            await carrier.getAttribute("loading"),
            routeManifest.carrier_contract.loading,
            `${label} uses the manifest loading posture`,
          );
          assert.equal(
            await carrier.getAttribute("sandbox"),
            routeProfile.carrier_policy.sandbox_tokens.join(" "),
            `${label} uses the exact route sandbox profile`,
          );
          assert.equal(
            await carrier.getAttribute("allow") ?? "",
            routeProfile.carrier_policy.permissions_policy.join("; "),
            `${label} uses the exact route Permissions Policy profile`,
          );
          assert.equal(
            await carrier.getAttribute("referrerpolicy"),
            routeManifest.carrier_contract.referrer_policy,
            `${label} uses the manifest referrer posture`,
          );
          assert.equal(
            await carrier.getAttribute("src"),
            src,
            `${label} uses its stable public route`,
          );

          const carrierHandle = await carrier.elementHandle();
          assert.ok(carrierHandle, `${label} exposes an iframe element`);
          const childFrame = await carrierHandle.contentFrame();
          assert.ok(childFrame, `${label} exposes its framed document`);
          assert.equal(childFrame.url(), src, `${label} resolves the intended public document`);
          assert.equal(
            await frame.locator("html").evaluate(() => globalThis.origin),
            "null",
            `${label} keeps an opaque sandbox origin`,
          );
          assert.equal(
            await frame.locator("iframe").count(),
            0,
            `${label} does not introduce a nested frame`,
          );
          await assertCarrierContainment(page, carrier, frame, label);

          if (routeProfile.id === "heart-chart") {
            await exerciseHeartCarrier(page, carrier, frame, childFrame);
            heartInteractions += 1;
          }
          if (routeProfile.id === "conditioning-field") {
            await exerciseConditioningCarrier(page, frame);
            conditioningInteractions += 1;
          }
          if (routeProfile.id === "strategy-canvas") {
            await exerciseStrategyCarrier(page, carrier, frame, label);
            strategyInteractions += 1;
          }
          await assertProjectedExitLinks(frame, label);
          assert.equal(
            page.url(),
            parentUrl,
            `${label} preserves the parent visitor-surface state while the frame changes`,
          );
        }

        await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
        const declaredHostedUrls = new Set(await page
          .locator('iframe[src^="https://iframes.vik.guru/v1/"]')
          .evaluateAll((elements) => elements.map((element) => element.src)));
        for (const request of outsideRequests) {
          assert.equal(request.method, "GET", `${pagePath} uses read-only hosted requests`);
          assert.equal(
            hostedFilesByPublicUrl.has(request.url),
            true,
            `${pagePath} requests only generated iframe package files (${request.url})`,
          );
          assert.equal(
            [...declaredHostedUrls].some(
              (routeUrl) => request.url === routeUrl || request.url.startsWith(routeUrl),
            ),
            true,
            `${pagePath} requests files only within its declared iframe routes (${request.url})`,
          );
          if (declaredHostedUrls.has(request.url)) {
            assert.equal(request.resourceType, "document");
            assert.equal(request.referer, null, `${request.url} suppresses its parent referrer`);
          }
        }
        for (const { src } of pageCarriers) {
          assert.equal(
            outsideRequests.filter(({ url }) => url === src).length,
            1,
            `${pagePath} requests each exercised Core iframe document once (${src})`,
          );
        }
        assertTelemetry(telemetry);
      } finally {
        await page.close();
      }
    }

    assert.equal(heartInteractions, 1, "the representative HEART interaction runs once");
    assert.equal(
      conditioningInteractions,
      1,
      "the Conditioning Field carrier interaction runs once",
    );
    assert.equal(
      strategyInteractions,
      2,
      "both Strategy Canvas carriers expose working host-owned source navigation",
    );
    await exerciseConditioningFooter(context, server.origin);
    const conditioningRoute = routeManifest.routes.find(
      ({ id }) => id === "conditioning-field",
    );
    const conditioningRouteUrl = publicRouteUrl(routeManifest, conditioningRoute);
    await exerciseConditioningWithoutScripts(
      browser,
      conditioningRouteUrl,
      canonicalBytesByPublicUrl.get(conditioningRouteUrl),
    );
    return routeManifest.routes.length * 2 + carriers.length + 5;
  } finally {
    await context?.close();
    await browser?.close();
    await server?.close();
    await sourceServer?.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

try {
  const passedPaths = await run();
  console.log(
    `Core iframe carrier browser contract: ${passedPaths}/${passedPaths} carrier paths passed.`,
  );
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
}
