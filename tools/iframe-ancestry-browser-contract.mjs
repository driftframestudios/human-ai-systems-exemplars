#!/usr/bin/env node
import './node-runtime-admission.mjs';

import assert from "node:assert/strict";

import { chromium } from "@playwright/test";

import { hasExactFrameAncestors } from "./verify-live-iframe-routes.mjs";

const approvedParentOrigin = "https://vik.guru";
const fixtureChildUrl =
  "https://iframes.vik.guru/v1/core/__iframe-ancestry-contract__/";
const fixtureAllowedParentUrl =
  "https://vik.guru/__iframe-ancestry-contract__/allowed";
const fixtureRefusedParentUrl =
  "http://127.0.0.1/__iframe-ancestry-contract__/refused";
const fixtureMarker = "[data-iframe-ancestry-ready]";
const liveChildUrl = "https://iframes.vik.guru/v1/core/poda/";
const liveAllowedParentUrl = "https://vik.guru/poda.html";
const liveMarker = "#artifactTitle";
const timeoutMs = 30_000;

function parentDocument(childUrl) {
  return `<!doctype html>
<meta charset="utf-8">
<title>Iframe ancestry contract parent</title>
<iframe title="Iframe ancestry contract child" src="${childUrl}"></iframe>
`;
}

function fixtureChildDocument() {
  return `<!doctype html>
<meta charset="utf-8">
<title>Iframe ancestry contract child</title>
<main data-iframe-ancestry-ready>Approved parent loaded the child.</main>
`;
}

function isTargetDocumentRequest(request, childUrl) {
  return (
    request.url() === childUrl &&
    request.method() === "GET" &&
    request.resourceType() === "document" &&
    request.isNavigationRequest()
  );
}

function isSupportingCspRefusal(message, childUrl) {
  const childOrigin = `${new URL(childUrl).origin}/`;
  const text = message.text();
  return (
    message.type() === "error" &&
    text.includes(`Framing '${childOrigin}'`) &&
    text.includes("Content Security Policy") &&
    text.includes(`frame-ancestors ${approvedParentOrigin}`) &&
    text.includes("blocked")
  );
}

async function installSyntheticParent(context, parentUrl, childUrl) {
  await context.route(parentUrl, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: parentDocument(childUrl),
    });
  });
}

async function installFixtureChild(context) {
  await context.route(fixtureChildUrl, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy":
          "default-src 'none'; frame-ancestors https://vik.guru",
        "x-content-type-options": "nosniff",
      },
      body: fixtureChildDocument(),
    });
  });
}

async function refusedJourney(browser, {
  childUrl,
  installChild = async () => {},
  marker,
  parentUrl = fixtureRefusedParentUrl,
}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  const responses = [];
  const failures = [];
  const finished = [];
  const consoleErrors = [];
  try {
    await installSyntheticParent(context, parentUrl, childUrl);
    await installChild(context);
    page.on("request", (request) => {
      if (isTargetDocumentRequest(request, childUrl)) requests.push(request);
    });
    page.on("requestfailed", (request) => {
      if (isTargetDocumentRequest(request, childUrl)) failures.push(request);
    });
    page.on("response", (response) => {
      if (isTargetDocumentRequest(response.request(), childUrl)) responses.push(response);
    });
    page.on("requestfinished", (request) => {
      if (isTargetDocumentRequest(request, childUrl)) finished.push(request);
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message);
    });
    const [, response] = await Promise.all([
      page.waitForEvent("requestfailed", {
        predicate: (request) => isTargetDocumentRequest(request, childUrl),
        timeout: timeoutMs,
      }),
      page.goto(parentUrl, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      }),
    ]);
    assert.equal(response?.status(), 200, "the refused journey parent responds with HTTP 200");
    await new Promise((resolveImmediate) => setImmediate(resolveImmediate));

    assert.equal(requests.length, 1, "the refused journey issues one exact child navigation");
    assert.equal(responses.length, 1, "the refused journey receives one exact child response");
    assert.equal(
      responses[0].status(),
      200,
      "the policy-bearing child response is HTTP 200 before browser refusal",
    );
    assert.equal(failures.length, 1, "the refused journey reports one matching request failure");
    assert.equal(
      finished.length,
      0,
      "a refused child navigation does not also report requestfinished",
    );
    assert.equal(
      await page.frameLocator('iframe[title="Iframe ancestry contract child"]').locator(marker).count(),
      0,
      "the refused child marker never becomes available",
    );
    const supportingCspRefusals = consoleErrors.filter((message) =>
      isSupportingCspRefusal(message, childUrl),
    );
    assert.equal(
      supportingCspRefusals.length,
      1,
      "the matching request failure has one policy-specific CSP console refusal",
    );
    assert.equal(
      consoleErrors.filter((message) => !supportingCspRefusals.includes(message)).length,
      0,
      "the refused journey has no unrelated console errors",
    );
    return failures[0].failure()?.errorText ?? "request failed";
  } finally {
    await context.close();
  }
}

async function syntheticAllowedJourney(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  const failures = [];
  try {
    await installSyntheticParent(context, fixtureAllowedParentUrl, fixtureChildUrl);
    await installFixtureChild(context);
    page.on("request", (request) => {
      if (isTargetDocumentRequest(request, fixtureChildUrl)) requests.push(request);
    });
    page.on("requestfailed", (request) => {
      if (isTargetDocumentRequest(request, fixtureChildUrl)) failures.push(request);
    });
    const response = await page.goto(fixtureAllowedParentUrl, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    assert.equal(response?.status(), 200, "the approved fixture parent responds with HTTP 200");
    await page
      .frameLocator('iframe[title="Iframe ancestry contract child"]')
      .locator(fixtureMarker)
      .waitFor({ state: "visible", timeout: timeoutMs });
    assert.equal(requests.length, 1, "the approved fixture parent issues one child navigation");
    assert.equal(failures.length, 0, "the approved fixture parent has no matching request failure");
  } finally {
    await context.close();
  }
}

async function preflightLivePolicy() {
  const response = await fetch(liveChildUrl, {
    headers: {
      "accept-encoding": "identity",
      "user-agent": "human-ai-systems-exemplars-iframe-ancestry-verifier/1",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  try {
    assert.equal(response.status, 200, "the representative live iframe route responds with HTTP 200");
    assert.equal(
      hasExactFrameAncestors(
        response.headers.get("content-security-policy"),
        [approvedParentOrigin],
      ),
      true,
      "the representative live iframe route allows only the approved parent origin",
    );
    assert.equal(
      response.headers.get("x-frame-options"),
      null,
      "the representative live iframe route has no conflicting X-Frame-Options header",
    );
  } finally {
    await response.body?.cancel().catch(() => {});
  }
}

async function liveAllowedJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const requests = [];
  const failures = [];
  try {
    page.on("request", (request) => {
      if (isTargetDocumentRequest(request, liveChildUrl)) requests.push(request);
    });
    page.on("requestfailed", (request) => {
      if (isTargetDocumentRequest(request, liveChildUrl)) failures.push(request);
    });
    const response = await page.goto(liveAllowedParentUrl, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    assert.equal(response?.status(), 200, "the approved live parent responds with HTTP 200");
    const carrier = page.locator(`iframe[src="${liveChildUrl}"]`);
    assert.equal(await carrier.count(), 1, "the approved live parent exposes one exact carrier");
    await carrier.evaluate((iframe) => iframe.setAttribute("loading", "eager"));
    await carrier.scrollIntoViewIfNeeded();
    await page.frameLocator(`iframe[src="${liveChildUrl}"]`).locator(liveMarker).waitFor({
      state: "visible",
      timeout: timeoutMs,
    });
    assert.equal(requests.length, 1, "the approved live parent issues one exact child navigation");
    assert.equal(failures.length, 0, "the approved live parent has no matching request failure");
  } finally {
    await context.close();
  }
}

function parseArguments(argv) {
  const options = { live: false };
  for (const argument of argv) {
    if (argument === "--live") options.live = true;
    else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown iframe ancestry contract argument: ${argument}.`);
  }
  return options;
}

function usage() {
  return [
    "Usage: node tools/iframe-ancestry-browser-contract.mjs [--live]",
    "",
    "Without --live, exercises a deterministic local CSP fixture in Chromium.",
    "With --live, checks one fixed production child and its approved production parent.",
    "Run the complete live iframe policy verifier separately for all-route header coverage.",
    "",
  ].join("\n");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    if (options.live) {
      await preflightLivePolicy();
      const refusal = await refusedJourney(browser, {
        childUrl: liveChildUrl,
        marker: liveMarker,
      });
      await liveAllowedJourney(browser);
      process.stdout.write(
        "Live iframe ancestry contract: 3/3 passed\n" +
          "- representative child: HTTP 200 and exact frame-ancestors policy\n" +
          `- loopback parent: refused with matching CSP console and document request failures (${refusal})\n` +
          "- approved production parent: child marker loaded without a matching failure\n",
      );
      return;
    }

    const refusal = await refusedJourney(browser, {
      childUrl: fixtureChildUrl,
      installChild: installFixtureChild,
      marker: fixtureMarker,
    });
    await syntheticAllowedJourney(browser);
    process.stdout.write(
      "Deterministic iframe ancestry contract: 2/2 passed\n" +
        `- loopback parent: refused with matching CSP console and document request failures (${refusal})\n` +
        "- approved-origin parent: child marker loaded without a matching failure\n",
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`Iframe ancestry browser contract failed: ${error.message}\n`);
  process.exitCode = 1;
});
