#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

const carrierPage = "/context-canvas/core-architectures-orientation-index.html";
const routeManifestPath = join(
  repositoryRoot,
  "core-architectures-chimeric-prototype-current-pack-v0.1",
  "public-iframe-route-manifest-v1.json",
);

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

async function run() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "core-iframe-carrier-"));
  const outputRoot = join(temporaryRoot, "context-canvas-project-surface");
  let server;
  let sourceServer;
  let browser;
  let context;

  try {
    const routeManifest = JSON.parse(await readFile(routeManifestPath, "utf8"));
    const heartProfile = routeManifest.routes.find(({ id }) => id === "heart-chart");
    assert.ok(heartProfile, "the route manifest carries the HEART route");
    const heartRoute = `https://${routeManifest.host}${heartProfile.public_alias}`;
    const carrierSelector = `iframe[data-public-src="${heartRoute}"]`;
    const coreRoot = join(
      repositoryRoot,
      "core-architectures-chimeric-prototype-current-pack-v0.1",
    );
    const projectionRoot = join(
      repositoryRoot,
      "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1",
    );
    const heartSource = join(
      coreRoot,
      heartProfile.source_file,
    );
    const heartProjection = join(
      projectionRoot,
      heartProfile.source_file,
    );
    await assertRegularFileWithin(coreRoot, heartSource, "HEART route source");
    await assertRegularFileWithin(
      projectionRoot,
      heartProjection,
      "HEART Context projection",
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

    const heartBytes = await readFile(heartSource);
    assert.deepEqual(
      await readFile(heartProjection),
      heartBytes,
      "the carrier fallback remains byte-identical to the routed HEART source",
    );
    const generatedCarrierPage = await readFile(
      join(outputRoot, carrierPage.slice(1)),
      "utf8",
    );
    assert.equal(
      generatedCarrierPage.includes("{{PUBLIC_URL"),
      false,
      "the tested carrier is the resolved materialized page",
    );
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
          for (const width of [1280, 800, 480, 390, 320]) {
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
      if (new URL(request.url()).origin === server.origin) {
        await route.continue();
        return;
      }
      if (
        request.url() === heartRoute &&
        request.method() === "GET" &&
        request.resourceType() === "document"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: heartBytes,
        });
        return;
      }
      await route.abort("blockedbyclient");
    });

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

    await page.goto(`${server.origin}${carrierPage}`, {
      waitUntil: "domcontentloaded",
    });
    const carrier = page.locator(carrierSelector);
    await carrier.scrollIntoViewIfNeeded();
    await page.frameLocator(carrierSelector).locator("#jsonExport").waitFor();

    assert.equal(await carrier.getAttribute("title"), "Interactive HEART Chart companion");
    assert.equal(
      await carrier.getAttribute("loading"),
      routeManifest.carrier_contract.loading,
    );
    assert.equal(
      await carrier.getAttribute("sandbox"),
      heartProfile.carrier_policy.sandbox_tokens.join(" "),
    );
    assert.equal(
      await carrier.getAttribute("allow") ?? "",
      heartProfile.carrier_policy.permissions_policy.join("; "),
    );
    assert.equal(
      await carrier.getAttribute("referrerpolicy"),
      routeManifest.carrier_contract.referrer_policy,
    );
    assert.equal(await carrier.getAttribute("src"), heartRoute);
    const localFullView =
      `prototypes/core-architectures/chimeric-pack-v0.1/${heartProfile.source_file}`;
    assert.equal(
      await page.locator(`a[data-public-href="${heartRoute}"]`).getAttribute("href"),
      localFullView,
      "the materialized carrier keeps its full-view navigation on the Context Canvas base artifact",
    );

    const frame = page.frameLocator(carrierSelector);
    const heartFrame = await (await carrier.elementHandle()).contentFrame();
    assert.equal(heartFrame.url(), heartRoute);
    assert.equal(await frame.locator("h1").textContent(), "HEART Chart");
    assert.equal(await frame.locator("iframe").count(), 0);
    assert.equal(
      await frame.locator("html").evaluate(() => globalThis.origin),
      "null",
      "the carrier keeps the framed document on an opaque sandbox origin",
    );

    for (const width of [1280, 800, 480, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await carrier.scrollIntoViewIfNeeded();
      const parentContainment = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert.ok(
        parentContainment.scrollWidth <= parentContainment.clientWidth,
        `the materialized visitor surface contains root overflow at ${width}px`,
      );
      const containment = await frame.locator("html").evaluate((root) => {
        const editTable = document.querySelector("#editTable");
        return {
          rootClientWidth: root.clientWidth,
          rootScrollWidth: root.scrollWidth,
          tableClientWidth: editTable?.clientWidth ?? 0,
          tableScrollWidth: editTable?.scrollWidth ?? 0,
        };
      });
      assert.ok(
        containment.rootScrollWidth <= containment.rootClientWidth,
        `the framed HEART page contains root overflow at ${width}px`,
      );
      assert.ok(
        containment.tableScrollWidth > containment.tableClientWidth,
        `the HEART matrix retains local two-dimensional access at ${width}px`,
      );
    }

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
      "confirmed removal restores useful focus inside the carrier",
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
      "the sandboxed carrier exposes either clipboard success or its visible fallback",
    );

    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
    assert.deepEqual(outsideRequests, [{
      method: "GET",
      referer: null,
      resourceType: "document",
      url: heartRoute,
    }]);
    assertTelemetry(telemetry);
  } finally {
    await context?.close();
    await browser?.close();
    await server?.close();
    await sourceServer?.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

try {
  await run();
  console.log("Core iframe carrier browser contract: 45/45 carrier paths passed.");
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
}
