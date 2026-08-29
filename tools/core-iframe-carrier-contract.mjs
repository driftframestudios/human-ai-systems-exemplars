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
import { assertRegularFileWithin } from "./package-iframe-routes.mjs";
import {
  assertTelemetry,
  monitor,
  repositoryRoot,
  startStaticServer,
} from "./core-architecture-browser-helper.mjs";

const routeManifestPath = join(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1",
  "public-iframe-route-manifest-v1.json",
);
const contextCanvasDirectory = "context-canvas";
const expectedCarrierRouteCounts = [
  ["core-architecture-family-index", 1],
  ["cross-channel-blueprint", 1],
  ["heart-chart", 1],
  ["poda", 1],
  ["service-design-blueprint", 1],
  ["specification-by-example", 1],
  ["strategy-canvas", 2],
];
const viewports = [1280, 800, 480, 390, 320];

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

function sortedRouteCounts(carriers) {
  const counts = new Map();
  for (const { routeProfile } of carriers) {
    counts.set(routeProfile.id, (counts.get(routeProfile.id) ?? 0) + 1);
  }
  return [...counts].sort(([left], [right]) => left.localeCompare(right));
}

function sortedRequests(requests) {
  return [...requests].sort((left, right) =>
    `${left.url}\u0000${left.method}\u0000${left.resourceType}`.localeCompare(
      `${right.url}\u0000${right.method}\u0000${right.resourceType}`,
    ),
  );
}

async function discoverPublicCoreCarriers(outputRoot, routeManifest) {
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
    8,
    "the materialized Context Canvas exposes eight actual Core iframe instances",
  );
  assert.deepEqual(
    sortedRouteCounts(carriers),
    expectedCarrierRouteCounts,
    "the eight actual carriers use the seven activated public routes",
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

async function run() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "core-iframe-carrier-"));
  const outputRoot = join(temporaryRoot, "context-canvas-project-surface");
  let server;
  let sourceServer;
  let browser;
  let context;

  try {
    const routeManifest = JSON.parse(await readFile(routeManifestPath, "utf8"));
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
    const carriers = await discoverPublicCoreCarriers(outputRoot, routeManifest);
    const routeByPublicUrl = new Map(
      routeManifest.routes.map((routeProfile) => [
        publicRouteUrl(routeManifest, routeProfile),
        routeProfile,
      ]),
    );
    const canonicalBytesByPublicUrl = new Map();
    for (const routeProfile of routeManifest.routes) {
      const source = join(coreRoot, routeProfile.source_file);
      await assertRegularFileWithin(coreRoot, source, `${routeProfile.id} route source`);
      canonicalBytesByPublicUrl.set(
        publicRouteUrl(routeManifest, routeProfile),
        await readFile(source),
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
        for (const [projectionLabel, projectionDirectory] of [
          ["Core source", coreRoot],
          ["Context projection", projectionRoot],
        ]) {
          const page = await populationContext.newPage();
          page.setDefaultTimeout(7000);
          const telemetry = monitor(page);
          const sourceUrl = new URL(
            `${relative(repositoryRoot, projectionDirectory)}/${routeProfile.source_file}`,
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
      const routeProfile = routeByPublicUrl.get(request.url());
      if (
        routeProfile &&
        request.method() === "GET" &&
        request.resourceType() === "document"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          headers: {
            "access-control-allow-origin": "*",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
          body: canonicalBytesByPublicUrl.get(request.url()),
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

    for (const [pagePath, pageCarriers] of carriersByPage) {
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      const telemetry = monitor(page);
      const outsideRequests = [];
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
        }

        await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
        const expectedRequests = pageCarriers.map(({ src }) => ({
          method: "GET",
          referer: null,
          resourceType: "document",
          url: src,
        }));
        assert.deepEqual(
          sortedRequests(outsideRequests),
          sortedRequests(expectedRequests),
          `${pagePath} requests only its declared public iframe documents`,
        );
        assertTelemetry(telemetry);
      } finally {
        await page.close();
      }
    }

    assert.equal(heartInteractions, 1, "the representative HEART interaction runs once");
    return routeManifest.routes.length * 2 + carriers.length;
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
