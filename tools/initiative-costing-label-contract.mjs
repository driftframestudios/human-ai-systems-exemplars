#!/usr/bin/env node
import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import {
  assertTelemetry,
  monitor,
  repositoryRoot,
  startStaticServer,
} from "./core-architecture-browser-helper.mjs";
import {
  assertFormControlLabelRetention,
  assertInvestmentStudioRowLabels,
  observeFormControlLabels,
  observeInvestmentStudioRowLabels,
} from "./form-control-label-contract.mjs";

const toolPath = fileURLToPath(import.meta.url);
const viewports = [1280, 701, 700, 390, 320];
const sourceRoute = "collaboration/initiative-costing-calculator/index.html";

export async function runInitiativeCostingLabelContract() {
  const server = await startStaticServer(repositoryRoot);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    await server.close();
    throw new Error(
      "Initiative Costing label contract requires Playwright Chromium; " +
        "install it with `npm run playwright:install`. " +
        `${error instanceof Error ? error.message : error}`,
    );
  }

  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: viewports[0], height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const telemetry = monitor(page);
  const observations = [];
  try {
    await page.goto(`${server.origin}/${sourceRoute}`, { waitUntil: "domcontentloaded" });
    await page.locator(".activity-row").first().waitFor();

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
      observations.push(await observeFormControlLabels(page.locator("html"), width));
      assertInvestmentStudioRowLabels(
        await observeInvestmentStudioRowLabels(page),
        width,
        "source Cross-Functional Investment Studio",
      );
    }
    assertFormControlLabelRetention(observations, "source Cross-Functional Investment Studio");

    await page.setViewportSize({ width: 390, height: 1000 });
    await page.locator('[data-add="disruption"]').click();
    assertInvestmentStudioRowLabels(
      await observeInvestmentStudioRowLabels(page),
      390,
      "source Cross-Functional Investment Studio after adding a disruption",
    );
    await page.locator('[data-preset="2"]').click();
    assertInvestmentStudioRowLabels(
      await observeInvestmentStudioRowLabels(page),
      390,
      "source Cross-Functional Investment Studio after changing the plan",
    );

    const disruptionName = page.locator('.disruption-row input[data-field="name"]').first();
    await disruptionName.fill("Accessible recovery route");
    assert.match(
      await page.locator('.disruption-row input[data-field="b"]').first().getAttribute("aria-label"),
      /Accessible recovery route/u,
      "recovery inputs retain contextual programmatic labels after renaming",
    );
    assertTelemetry(telemetry);
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }

  return { route: sourceRoute, viewports };
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 0) {
    throw new Error(`Usage: node ${path.relative(repositoryRoot, toolPath)}`);
  }
  const result = await runInitiativeCostingLabelContract();
  console.log(
    `Initiative Costing label contract passed: ${result.route}, ` +
      `${result.viewports.length} viewport widths.`,
  );
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
