#!/usr/bin/env node
import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import {
  assertTelemetry,
  monitor,
  startStaticServer,
} from "./core-architecture-browser-helper.mjs";
import {
  assertAlternateMediaReadings,
  assertReducedMotionReading,
  assertRenderedSvgSemantics,
  assertZoomedFixedFocus,
} from "./iframe-visual-semantics-contract.mjs";
import { writePackagePlan } from "./iframe-route-package-engine.mjs";
import { createAggregatePackagePlan } from "./package-v1-iframe-routes.mjs";

const toolPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(toolPath), "..");

function routeReadings(aggregatePlan) {
  const readings = [];
  for (const family of ["core", "canvas"]) {
    const plan = aggregatePlan.familyPlans.get(family);
    assert.ok(plan, `${family} package plan is available`);
    for (const route of plan.receipt.routes) {
      readings.push({
        family,
        id: route.id,
        path: `/v1/${family}/${route.projection_file}`,
      });
    }
  }
  return readings;
}

export async function runIframeVisualMediaBrowserContract() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "iframe-visual-media-"));
  const v1Root = path.join(temporaryRoot, "v1");
  let browser;
  let server;
  try {
    await mkdir(v1Root);
    const aggregatePlan = await createAggregatePackagePlan();
    await writePackagePlan(aggregatePlan, v1Root);
    const routes = routeReadings(aggregatePlan);
    assert.equal(routes.length, 38, "the media contract covers the complete iframe population");

    browser = await chromium.launch({ headless: true });
    server = await startStaticServer(temporaryRoot);
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 320, height: 900 },
    });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === server.origin) {
        await route.continue();
        return;
      }
      await route.abort("blockedbyclient");
    });

    let fixedFocusControls = 0;
    let renderedSvgs = 0;
    const failures = [];
    try {
      for (const route of routes) {
        const page = await context.newPage();
        page.setDefaultTimeout(7000);
        const telemetry = monitor(page);
        const label = `${route.family}/${route.id}`;
        try {
          await page.goto(new URL(route.path, server.origin).href, {
            waitUntil: "domcontentloaded",
          });
          await page.locator("body").waitFor({ state: "visible" });
          await page.evaluate(() => new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          ));
          await assertReducedMotionReading(page, label);
          renderedSvgs += await assertRenderedSvgSemantics(page, label);
          fixedFocusControls += await assertZoomedFixedFocus(page, label);
          await assertAlternateMediaReadings(page, page, label);
          assertTelemetry(telemetry);
        } catch (error) {
          failures.push(new Error(
            `${label}: ${error instanceof Error ? error.message : error}`,
            { cause: error },
          ));
        } finally {
          await page.close();
        }
      }
    } finally {
      await context.close();
    }

    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        `Iframe visual-media contract failed for ${failures.length} route(s).`,
      );
    }
    assert.ok(renderedSvgs > 0, "the package includes rendered SVG semantics");
    return {
      fixedFocusControls,
      renderedSvgs,
      routes: routes.length,
    };
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 0) {
    throw new Error(`Usage: node ${path.relative(repositoryRoot, toolPath)}`);
  }
  const result = await runIframeVisualMediaBrowserContract();
  console.log(
    `Iframe visual-media browser contract passed: ${result.routes} routes, ` +
      `${result.renderedSvgs} rendered SVG instances, ` +
      `${result.fixedFocusControls} zoomed fixed or sticky controls.`,
  );
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    if (error instanceof AggregateError) {
      for (const routeError of error.errors) console.error(`- ${routeError.message}`);
    }
    process.exitCode = 1;
  });
}
