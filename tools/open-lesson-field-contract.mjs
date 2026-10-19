#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const DIRECT_TARGET = "collaboration/open-lesson-field/index.html";
const HOST_TARGET = "context-canvas-project-surface/context-canvas/prompt-side-conditions-practice.html";
const PUBLIC_IFRAME_URL = "https://iframes.vik.guru/v1/canvas/open-lesson-field/";
const IFRAME_SELECTOR = 'iframe[title="Open Lesson Field educator collaboration instrument"]';
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
  { name: "wide", width: 2560, height: 1440 }
];

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = resolve(".visual-runs", `${runId}-open-lesson-field-contract`);
const checks = [];
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function verify(label, callback) {
  try {
    await callback();
    checks.push({ label, status: "passed" });
  } catch (error) {
    const message = error?.message || String(error);
    checks.push({ label, status: "failed", message });
    failures.push(`${label}: ${message}`);
  }
}

function textIncludes(actual, expected, label) {
  assert(
    String(actual).toLowerCase().includes(String(expected).toLowerCase()),
    `${label} should include “${expected}”; received “${String(actual).slice(0, 240)}”.`
  );
}

function safeSegment(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "check";
}

async function startStaticServer(rootDirectory) {
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8"
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

function monitor(page) {
  const telemetry = { consoleErrors: [], pageErrors: [], requestFailures: [], responseErrors: [] };
  page.on("console", (message) => {
    if (message.type() === "error") telemetry.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => telemetry.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    telemetry.requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText || "request failed"}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) telemetry.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return telemetry;
}

function assertTelemetry(telemetry) {
  const entries = [
    ...telemetry.consoleErrors.map((message) => `console: ${message}`),
    ...telemetry.pageErrors.map((message) => `page: ${message}`),
    ...telemetry.requestFailures.map((message) => `request: ${message}`),
    ...telemetry.responseErrors.map((message) => `response: ${message}`)
  ];
  assert(entries.length === 0, `Browser telemetry should stay clear. ${entries.join(" | ")}`);
}

async function openPage(browser, url, viewport, contextOptions = {}, prepareContext) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, ...contextOptions });
  if (prepareContext) await prepareContext(context);
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  return { context, page, telemetry };
}

async function openHostedLessonPage(browser, hostUrl, viewport, contextOptions = {}, prepareContext) {
  return openPage(browser, hostUrl, viewport, contextOptions, async (context) => {
    await context.route(PUBLIC_IFRAME_URL, async (route) => {
      await route.fulfill({ path: resolve(DIRECT_TARGET), contentType: "text/html; charset=utf-8" });
    });
    if (prepareContext) await prepareContext(context);
  });
}

async function waitForEnhanced(surface) {
  await surface.locator("html.is-enhanced").waitFor({ state: "attached", timeout: 5000 });
  await surface.locator("#main").waitFor({ state: "visible", timeout: 5000 });
}

async function stateFrom(surface) {
  return JSON.parse(await surface.locator("#state-json").textContent());
}

async function schemaFrom(surface) {
  return JSON.parse(await surface.locator("#lesson-field-schema").textContent());
}

function schemaErrors(value, schema, path = "$") {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;

  if (Array.isArray(schema.anyOf)) {
    const validBranch = schema.anyOf.some((candidate) => schemaErrors(value, candidate, path).length === 0);
    if (!validBranch) errors.push(`${path} should match one anyOf branch`);
    return errors;
  }
  if (Object.prototype.hasOwnProperty.call(schema, "const") && !sameValue(value, schema.const)) {
    errors.push(`${path} should equal ${JSON.stringify(schema.const)}`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => sameValue(value, candidate))) {
    errors.push(`${path} should use an enumerated value`);
  }

  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${path} should be an object`);
      return errors;
    }
    for (const key of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${path}.${key} is required`);
    }
    const properties = schema.properties || {};
    for (const [key, child] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) errors.push(...schemaErrors(value[key], child, `${path}.${key}`));
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) errors.push(`${path}.${key} is outside the declared schema`);
      }
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${path} should be an array`);
      return errors;
    }
    if (Number.isFinite(schema.minItems) && value.length < schema.minItems) errors.push(`${path} should contain at least ${schema.minItems} items`);
    if (Number.isFinite(schema.maxItems) && value.length > schema.maxItems) errors.push(`${path} should contain at most ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${path} should contain unique items`);
    if (schema.items) value.forEach((item, index) => errors.push(...schemaErrors(item, schema.items, `${path}[${index}]`)));
  } else if (schema.type === "string") {
    if (typeof value !== "string") errors.push(`${path} should be a string`);
    if (typeof value === "string" && Number.isFinite(schema.minLength) && value.length < schema.minLength) errors.push(`${path} should contain at least ${schema.minLength} characters`);
    if (typeof value === "string" && schema.format === "date-time" && Number.isNaN(Date.parse(value))) errors.push(`${path} should be an ISO date-time`);
  } else if (schema.type === "integer") {
    if (!Number.isInteger(value)) errors.push(`${path} should be an integer`);
  } else if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) errors.push(`${path} should be a finite number`);
  } else if (schema.type === "null" && value !== null) {
    errors.push(`${path} should be null`);
  }

  if (typeof value === "number") {
    if (Number.isFinite(schema.minimum) && value < schema.minimum) errors.push(`${path} should be at least ${schema.minimum}`);
    if (Number.isFinite(schema.maximum) && value > schema.maximum) errors.push(`${path} should be at most ${schema.maximum}`);
  }
  return errors;
}

async function assertStateContract(surface) {
  const state = await stateFrom(surface);
  const schema = await schemaFrom(surface);
  const errors = schemaErrors(state, schema);
  assert(errors.length === 0, `State should match the included JSON Schema. ${errors.join("; ")}`);
  assert(state.version === "open-lesson-field.v2", "State should use the v2 contract.");
  assert(state.fixtureVersion === "watershed-teaching-fixture.v2", "State should name the v2 teaching fixture.");
  const timingTotal = state.situation.timing.reduce((sum, part) => sum + part.minutes, 0);
  assert(timingTotal === state.situation.minutes, `Timing ledger should total ${state.situation.minutes}; received ${timingTotal}.`);
  const grouping = state.situation.grouping;
  const groupedLearners = grouping.individuals + (grouping.pairs * 2) + (grouping.trios * 3) + (grouping.quartets * 4);
  assert(["Pair teams", "Trio teams", "Table teams of four"].includes(grouping.mode), "Grouping should use one of the three authored peer structures.");
  assert(groupedLearners === state.situation.learners, `Grouping should account for all ${state.situation.learners} learners; received ${groupedLearners}.`);
  assert(grouping.groups === grouping.individuals + grouping.pairs + grouping.trios + grouping.quartets, "Grouping group count should match its visible composition.");
  assert(grouping.materialSets === grouping.groups, "One shared material set should be prepared for each group.");
  assert(sameValue(state.sampling, {
    method: "bounded-verbalized-sampling",
    candidateCount: 5,
    probabilityReference: "full-response-distribution",
    residualMass: "required-disclosure",
    probabilityUnit: "percent",
    standing: "open-local-field",
    routeEventAssessment: "optional-separate"
  }), `Sampling state should preserve the bounded VS contract and separate optional route assessment; received ${JSON.stringify(state.sampling)}.`);
  assert([0, 1, 2].includes(state.investigation.alignmentDays), "Alignment should use one of the three authored choices.");
  assert([0, 10].includes(state.investigation.pairs), "Pair count should be ten when the quantitative field is ready and zero while it awaits a field.");
  assert(
    state.receiver.status === (state.receiver.label ? "named" : "requires-resolution"),
    "Receiver standing should follow the visible receiver label."
  );
  textIncludes(await surface.locator("#schema-status").textContent(), "current state matches", "Visible schema receipt");
  return state;
}

async function layoutMetrics(surface) {
  return surface.evaluate(() => {
    const root = document.documentElement;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const issues = [];
    for (const control of document.querySelectorAll("button, input, select, textarea")) {
      if (!visible(control)) continue;
      const type = control.getAttribute("type") || "";
      const target = /^(checkbox|radio)$/.test(type) ? control.closest("label") : control;
      const rect = target?.getBoundingClientRect();
      if (!target || !rect || rect.height < 43.5) {
        issues.push(`${control.tagName.toLowerCase()}${control.id ? `#${control.id}` : ""} has a ${rect?.height?.toFixed(1) || 0}px target`);
      }
      const label = control.tagName === "BUTTON"
        ? control.textContent.trim()
        : (control.labels?.[0]?.textContent.trim() || control.getAttribute("aria-label") || "");
      if (!label) issues.push(`${control.tagName.toLowerCase()}${control.id ? `#${control.id}` : ""} needs a readable name`);
      if (control instanceof HTMLTextAreaElement && control.scrollWidth > control.clientWidth + 2) {
        issues.push(`textarea#${control.id} clips horizontally`);
      }
    }
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      issues
    };
  });
}

async function assertLayout(surface, label) {
  const metrics = await layoutMetrics(surface);
  assert(metrics.scrollWidth <= metrics.clientWidth + 2, `${label} should stay within the page width (${metrics.scrollWidth}px content / ${metrics.clientWidth}px viewport).`);
  assert(metrics.issues.length === 0, `${label} controls should retain readable labels and 44px targets. ${metrics.issues.join("; ")}`);
}

async function assertReceipt(surface, receiptSelector) {
  const receipt = await surface.locator(receiptSelector).textContent();
  textIncludes(receipt, "Current effect", `${receiptSelector} consequence receipt`);
  textIncludes(receipt, "Changed", `${receiptSelector} changed fields`);
  textIncludes(receipt, "Preserved", `${receiptSelector} preserved fields`);
  const dockChanged = await surface.locator("#changed-reading").textContent();
  const dockPreserved = await surface.locator("#preserved-reading").textContent();
  assert(dockChanged.trim().length > 6, "Capsule dock should name changed fields.");
  assert(dockPreserved.trim().length > 6, "Capsule dock should name preserved fields.");
}

async function iframeSurface(page) {
  const iframe = page.locator(IFRAME_SELECTOR).first();
  await iframe.scrollIntoViewIfNeeded();
  await iframe.waitFor({ state: "visible", timeout: 8000 });
  const handle = await iframe.elementHandle();
  const frame = await handle.contentFrame();
  assert(frame, "Embedded Open Lesson Field frame should be available.");
  await frame.locator("#main").waitFor({ state: "visible", timeout: 8000 });
  return { iframe, frame };
}

function promptFingerprintFrom(markdown) {
  const match = String(markdown).match(/^- Fingerprint: `([^`]+)`$/m);
  assert(match, "Prompt Capsule Markdown should carry one readable fingerprint field.");
  return match[1];
}

function assertPromptCapsuleSections(markdown, label) {
  const headings = [
    "# Prompt Capsule: Open Lesson Field",
    "## Purpose and target",
    "## Relevant context and inputs",
    "## Working state",
    "## Boundaries and human-held decisions",
    "## Requested return",
    "## Related loops",
    "## Evidence and recovery"
  ];
  let previous = -1;
  for (const heading of headings) {
    const position = markdown.indexOf(heading);
    assert(position > previous, `${label} should carry ${heading} in contract order.`);
    previous = position;
  }
}

async function promptCapsuleContract(browser, directUrl) {
  const directOrigin = new URL(directUrl).origin;
  const { context, page, telemetry } = await openPage(browser, directUrl, VIEWPORTS[1], {}, async (browserContext) => {
    await browserContext.grantPermissions(["clipboard-read", "clipboard-write"], { origin: directOrigin });
  });
  try {
    await waitForEnhanced(page);
    let initialFingerprint = "";
    await verify("Prompt Capsule · public API and plain Markdown share one complete initial state", async () => {
      const api = await page.evaluate(() => ({
        frozen: Object.isFrozen(window.openLessonField),
        viewsFrozen: Object.isFrozen(window.openLessonField.promptCapsuleViews),
        version: window.openLessonField.version,
        schema: window.openLessonField.stateSchemaVersion,
        contract: window.openLessonField.promptCapsuleContract,
        views: window.openLessonField.promptCapsuleViews.slice(),
        plain: window.openLessonField.promptCapsule(),
        explicitPlain: window.openLessonField.promptCapsuleMarkdown("plain"),
        state: window.openLessonField.getState(),
        fingerprint: window.openLessonField.promptCapsuleFingerprint(),
        activeView: window.openLessonField.getPromptCapsuleView()
      }));
      const visible = await page.locator("#packet").textContent();
      assert(api.frozen && api.viewsFrozen, "Open Lesson Field should expose a frozen public API and view vocabulary.");
      assert(api.version === "2.0" && api.schema === "open-lesson-field.v2", "Public API should retain the Open Lesson Field source and state versions.");
      assert(api.contract === "prompt-capsule/0.1.0", "Public API should name the accepted Prompt Capsule contract.");
      assert(sameValue(api.views, ["plain", "skill-assisted"]), `Public API should expose the two accepted views; received ${JSON.stringify(api.views)}.`);
      assert(api.activeView === "plain", "Plain should remain the initial Prompt Capsule view.");
      assert(api.plain === api.explicitPlain && api.plain === visible, "Initial visible, conventional, and explicit plain Markdown should be byte-identical.");
      assert(sameValue(api.state, await stateFrom(page)), "Public state API and visible JSON inspector should expose the same source-owned state.");
      assert(api.plain.endsWith("\n"), "Prompt Capsule Markdown should retain one terminal line feed for portable file output.");
      assertPromptCapsuleSections(api.plain, "Plain Prompt Capsule");
      initialFingerprint = promptFingerprintFrom(api.plain);
      assert(initialFingerprint === api.fingerprint, "Visible fingerprint should identify the complete represented state.");
      textIncludes(api.plain, "visitor-surface-change", "Plain related-loop identity");
      textIncludes(api.plain, "public-release", "Plain release-loop identity");
      const detached = await page.evaluate(() => {
        const returned = window.openLessonField.getState();
        const projection = window.openLessonField.promptCapsuleStateProjection();
        returned.situation.learners = 999;
        projection.situation.learners = 998;
        return {
          stateLearners: window.openLessonField.getState().situation.learners,
          projectionLearners: window.openLessonField.promptCapsuleStateProjection().situation.learners,
          fingerprint: window.openLessonField.promptCapsuleFingerprint(),
          plain: window.openLessonField.promptCapsule()
        };
      });
      assert(detached.stateLearners === 28 && detached.projectionLearners === 28, "Public state and represented-state reads should return detached values.");
      assert(detached.fingerprint === initialFingerprint && detached.plain === api.plain, "Mutating detached API values should preserve the live Prompt Capsule and fingerprint.");
    });
    await verify("Prompt Capsule · native Related loops remain keyboard-operable public destinations", async () => {
      const details = page.locator("[data-prompt-related-loops]");
      const summary = details.locator("summary");
      await summary.focus();
      await page.keyboard.press("Enter");
      assert(await details.evaluate((element) => element.open), "Enter on the native summary should open Related loops.");
      const loops = await details.locator("[data-related-loop-id]").evaluateAll((items) => items.map((item) => ({
        id: item.getAttribute("data-related-loop-id"),
        href: item.querySelector("a")?.href,
        fit: item.querySelector("[data-related-loop-fit]")?.textContent?.trim(),
        targetHeight: item.querySelector("a")?.getBoundingClientRect().height
      })));
      assert(sameValue(loops.map(({ id }) => id), ["visitor-surface-change", "public-release"]), `Related loops should retain the accepted order and identities; received ${JSON.stringify(loops)}.`);
      assert(loops[0].href === "https://schemas.radiantnull.com/collaboration/#visitor-surface-change", "Visitor-surface loop should resolve to its public schema coordinate.");
      assert(loops[1].href === "https://schemas.radiantnull.com/collaboration/#public-release", "Public-release loop should resolve to its public schema coordinate.");
      assert(loops.every(({ fit, targetHeight }) => fit && targetHeight >= 43.5), "Every related loop should carry a fit condition and a 44px link target.");
    });
    await verify("Prompt Capsule · native keyboard selection switches to the state-equivalent skill-assisted view", async () => {
      const plainControl = page.locator('input[name="open-lesson-prompt-view"][value="plain"]');
      await plainControl.focus();
      await page.keyboard.press("ArrowRight");
      const assistedControl = page.locator('input[name="open-lesson-prompt-view"][value="skill-assisted"]');
      assert(await assistedControl.isChecked(), "ArrowRight should select the skill-assisted native radio.");
      assert(await assistedControl.evaluate((element) => document.activeElement === element), "Keyboard view selection should retain focus on the selected native radio.");
      const assisted = await page.locator("#packet").textContent();
      const apiAssisted = await page.evaluate(() => window.openLessonField.promptCapsuleMarkdown("skill-assisted"));
      assert(assisted === apiAssisted, "Visible and public-API skill-assisted Markdown should be byte-identical.");
      assert(await page.locator("#packet").getAttribute("data-prompt-view-active") === "skill-assisted", "Visible packet should expose the active view.");
      assert(promptFingerprintFrom(assisted) === initialFingerprint, "Plain and skill-assisted views should identify the same represented state.");
      textIncludes(assisted, "## Skill assistance", "Skill-assisted extension");
      textIncludes(assisted, "https://schemas.radiantnull.com/skills/source-authority-mapping/", "Source Authority Mapping public coordinate");
      textIncludes(assisted, "https://schemas.radiantnull.com/skills/bounded-support-routing/", "Bounded Support Routing public coordinate");
      textIncludes(assisted, "cf00aceb07896bc01a50e0622b133f8837fa3eec", "Skill source revision");
      textIncludes(assisted, "706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5", "Source Authority Mapping digest");
      textIncludes(assisted, "80dff2f88bc919500d9557a0ff67210e68cbdf1c69bbe63ac29b93662f9bd402", "Bounded Support Routing digest");
      const plain = await page.evaluate(() => window.openLessonField.promptCapsuleMarkdown("plain"));
      const normalizedSharedAssisted = assisted
        .split("\n## Skill assistance")[0]
        .replace("- View: `skill-assisted`", "- View: `plain`");
      assert(normalizedSharedAssisted === plain, "Skill assistance should extend the complete plain view without changing its shared state-derived content.");
      textIncludes(await page.locator("#prompt-view-status").textContent(), "Skill-assisted Markdown view selected", "Local view status");
      await page.waitForFunction(() => document.getElementById("live-status")?.textContent.includes("Skill-assisted Markdown view selected"));
      assert(await page.locator("#prompt-view-status").getAttribute("aria-live") === null, "Local view status should share the existing live route rather than create a second announcement channel.");
      assert(await page.locator("[role=status][aria-live]").count() === 1, "Prompt view changes should retain exactly one live status route.");
    });
    await verify("Prompt Capsule · state changes update both views and one shared fingerprint", async () => {
      await page.locator("#learners").fill("31");
      const values = await page.evaluate(() => ({
        stateLearners: window.openLessonField.getState().situation.learners,
        projectionLearners: window.openLessonField.promptCapsuleStateProjection().situation.learners,
        fingerprint: window.openLessonField.promptCapsuleFingerprint(),
        plain: window.openLessonField.promptCapsuleMarkdown("plain"),
        assisted: window.openLessonField.promptCapsuleMarkdown("skill-assisted")
      }));
      assert(values.stateLearners === 31 && values.projectionLearners === 31, "State and represented-state projection should carry the changed learner count.");
      assert(values.fingerprint !== initialFingerprint, "A represented state change should produce a new fingerprint.");
      assert(promptFingerprintFrom(values.plain) === values.fingerprint && promptFingerprintFrom(values.assisted) === values.fingerprint, "Both views should carry the changed state fingerprint.");
      textIncludes(values.plain, "`31` learners", "Changed plain learner count");
      textIncludes(values.assisted, "`31` learners", "Changed skill-assisted learner count");
      assertPromptCapsuleSections(values.plain, "Changed plain Prompt Capsule");
      assertPromptCapsuleSections(values.assisted, "Changed skill-assisted Prompt Capsule");
    });
    await verify("Prompt Capsule · Copy Markdown carries the exact active byte stream", async () => {
      const expected = await page.locator("#packet").textContent();
      await page.locator("#copy-prompt").click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert(copied === expected, "Clipboard text should equal the active Prompt Capsule Markdown byte for byte.");
      textIncludes(await page.locator("#prompt-view-status").textContent(), "Skill-assisted Markdown copied", "Copy status");
    });
    await verify("Prompt Capsule · Download Markdown carries the exact active byte stream", async () => {
      const expected = await page.locator("#packet").textContent();
      await page.evaluate(() => {
        const createObjectURL = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (blob) => {
          globalThis.__promptCapsuleDownloadType = blob.type;
          return createObjectURL(blob);
        };
      });
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator("#download-prompt").click()
      ]);
      assert(download.suggestedFilename() === "open-lesson-field.prompt-capsule.r0.skill-assisted.md", `Download should carry the active view and revision; received ${download.suggestedFilename()}.`);
      assert(await download.failure() === null, "Prompt Capsule download should complete without a browser failure.");
      assert(await page.evaluate(() => globalThis.__promptCapsuleDownloadType) === "text/markdown;charset=utf-8", "Prompt Capsule download should declare UTF-8 Markdown.");
      const downloadPath = await download.path();
      assert(downloadPath, "Prompt Capsule download should produce a readable local artifact.");
      const downloaded = await readFile(downloadPath, "utf8");
      assert(downloaded === expected, "Downloaded Markdown should equal the active Prompt Capsule byte stream exactly.");
      textIncludes(await page.locator("#prompt-view-status").textContent(), "Skill-assisted Markdown download prepared", "Download status");
    });
    await verify("Prompt Capsule · focused browser telemetry", async () => assertTelemetry(telemetry));
  } finally {
    await context.close();
  }
}

async function directViewportChecks(browser, directUrl) {
  for (const viewport of VIEWPORTS) {
    await verify(`direct ${viewport.name} · layout, controls, state, and browser telemetry`, async () => {
      const { context, page, telemetry } = await openPage(browser, directUrl, viewport);
      try {
        await waitForEnhanced(page);
        await assertLayout(page, `Direct ${viewport.name}`);
        await assertStateContract(page);
        const stageIds = await page.locator("main > .stage").evaluateAll((stages) => stages.map((stage) => stage.id));
        assert(stageIds.length === 7 && new Set(stageIds).size === 7, `Standalone DOM should contain one copy of each seven-stage section; received ${JSON.stringify(stageIds)}.`);
        assert(await page.locator("#capsule-dock-title").isVisible(), "Working prompt capsule explanation should be visible near the top.");
        textIncludes(await page.locator(".hero-deck").textContent(), "builds a local working prompt capsule", "Hero capsule explanation");
        const liveRoutes = page.locator("[role=status][aria-live]");
        assert(await liveRoutes.count() === 1, "Enhanced surface should expose exactly one live status route.");
        assert(await liveRoutes.first().getAttribute("id") === "live-status", "The single live status route should be #live-status.");
        assert(await page.locator('input[type="range"]').count() === 0, "Alignment should use explicit choices rather than a range input.");
        assert(await page.locator('input[name="alignment"]').count() === 3, "Alignment should provide exactly three radio choices.");
        assert(await page.locator('input[name="grouping-mode"]').count() === 3, "Class-size depth should provide three unordered native grouping choices.");
        textIncludes(await page.locator("#coordination-title").textContent(), "class size becomes useful", "Class-size depth title");
        assert(await page.locator(".candidate-route-field").count() === 1, "Route comparison should expose one unordered candidate field.");
        textIncludes(await page.locator("#sampling-prompt").textContent(), "Generate exactly 5 distinct candidate answers", "Bounded Verbalized Sampling fan-out");
        textIncludes(await page.locator("#sampling-prompt").textContent(), "relative to the full distribution", "Verbalized Sampling probability reference");
        textIncludes(await page.locator("#sampling-prompt").textContent(), "residual or unlisted response mass", "Verbalized Sampling residual-mass disclosure");
        textIncludes(await page.locator("#route-event-prompt").textContent(), "Named binary event", "Separate optional route/event assessment");
        const relatedLoops = page.locator("[data-prompt-related-loops]");
        await relatedLoops.locator("summary").click();
        assert(await relatedLoops.evaluate((element) => element.open), "Related loops should remain visible for the Prompt Capsule visual comparison.");
        await page.screenshot({ path: resolve(runDir, `open-lesson-field-${viewport.name}.png`), fullPage: true });
        await page.locator('.capsule-dock a[href="#working-capsule"]').click();
        await page.waitForFunction(() => {
          const dock = document.querySelector(".capsule-dock");
          const target = document.getElementById("working-capsule");
          const dockRect = dock.getBoundingClientRect();
          const targetTop = target.getBoundingClientRect().top;
          return getComputedStyle(dock).position === "sticky"
            ? targetTop >= dockRect.bottom - 2 && targetTop <= dockRect.bottom + 32
            : targetTop >= -2 && targetTop <= 32;
        });
        const anchoredGeometry = await page.evaluate(() => {
          const dock = document.querySelector(".capsule-dock");
          const target = document.getElementById("working-capsule");
          const dockRect = dock.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          return {
            dockBottom: dockRect.bottom,
            dockPosition: getComputedStyle(dock).position,
            targetTop: targetRect.top
          };
        });
        if (anchoredGeometry.dockPosition === "sticky") {
          assert(anchoredGeometry.targetTop >= anchoredGeometry.dockBottom - 2 && anchoredGeometry.targetTop <= anchoredGeometry.dockBottom + 32, `Prompt Capsule anchor should clear the sticky dock and begin directly beneath it; received target top ${anchoredGeometry.targetTop}px and dock bottom ${anchoredGeometry.dockBottom}px.`);
        } else {
          assert(anchoredGeometry.targetTop >= -2 && anchoredGeometry.targetTop <= 32, `Prompt Capsule anchor should begin at the top of the mobile viewport; received ${anchoredGeometry.targetTop}px.`);
        }
        await page.screenshot({ path: resolve(runDir, `open-lesson-field-prompt-capsule-${viewport.name}.png`) });
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function embeddedViewportChecks(browser, hostUrl) {
  for (const viewport of VIEWPORTS) {
    await verify(`embedded ${viewport.name} · sandbox, interaction, containment, and browser telemetry`, async () => {
      const { context, page, telemetry } = await openHostedLessonPage(browser, hostUrl, viewport);
      try {
        await assertLayout(page, `Prompt-side host ${viewport.name}`);
        const { iframe, frame } = await iframeSurface(page);
        assert(await iframe.getAttribute("src") === PUBLIC_IFRAME_URL, "Iframe should resolve the manifest-owned public Open Lesson Field route.");
        assert(await iframe.getAttribute("sandbox") === "allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts", "Iframe sandbox should carry the implemented download, print-dialog, projected onward-navigation, and script capabilities.");
        assert(await iframe.getAttribute("allow") === "clipboard-write", "Iframe Permissions Policy should carry the implemented Markdown copy capability.");
        assert(await iframe.getAttribute("referrerpolicy") === "no-referrer", "Iframe should preserve the no-referrer boundary.");
        assert(await page.locator(IFRAME_SELECTOR).count() === 1, "Parent DOM should contain one Open Lesson Field iframe.");
        assert(await frame.locator("iframe").count() === 0, "Embedded instrument should remain a leaf surface without recursive frames.");
        await waitForEnhanced(frame);
        const stageIds = await frame.locator("main > .stage").evaluateAll((stages) => stages.map((stage) => stage.id));
        assert(stageIds.length === 7 && new Set(stageIds).size === 7, `Embedded DOM should contain one copy of each seven-stage section; received ${JSON.stringify(stageIds)}.`);
        await assertLayout(frame, `Embedded instrument ${viewport.name}`);
        await frame.locator('label.alignment-choice:has(input[value="2"]) strong').click();
        assert((await frame.locator("#metric-pairs").textContent()).trim() === "10 pairs", "Embedded alignment should preserve ten pairs.");
        assert((await frame.locator("#metric-correlation").textContent()).trim() === "r = -0.59", "Embedded two-day alignment should render r = -0.59.");
        await frame.locator("#assemble").click();
        assert((await stateFrom(frame)).assembly.revision === 1, "Embedded assembly should create revision 1.");
        await page.screenshot({ path: resolve(runDir, `prompt-side-open-lesson-field-${viewport.name}.png`), fullPage: true });
        assertTelemetry(telemetry);
      } finally {
        await context.close();
      }
    });
  }
}

async function embeddedPromptCapsuleExchangeContract(browser, hostUrl) {
  const hostOrigin = new URL(hostUrl).origin;
  const { context, page, telemetry } = await openHostedLessonPage(
    browser,
    hostUrl,
    VIEWPORTS[1],
    { acceptDownloads: true },
    async (browserContext) => {
      await browserContext.grantPermissions(["clipboard-read", "clipboard-write"], { origin: hostOrigin });
    }
  );
  try {
    const { frame } = await iframeSurface(page);
    await waitForEnhanced(frame);
    await verify("embedded Prompt Capsule · copy returns exact bytes and retains control focus", async () => {
      const copyControl = frame.locator("#copy-prompt");
      const expected = await frame.locator("#packet").textContent();
      await copyControl.focus();
      await copyControl.click();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert(copied === expected, "Embedded clipboard text should equal the active Prompt Capsule Markdown byte for byte.");
      assert(copied.endsWith("\n"), "Embedded clipboard text should retain the canonical terminal line feed.");
      assert(await copyControl.evaluate((element) => document.activeElement === element), "Fallback copy should restore focus to the activating control.");
      textIncludes(await frame.locator("#prompt-view-status").textContent(), "Plain Markdown copied", "Embedded copy status");
      assertTelemetry(telemetry);
    });
  } finally {
    await context.close();
  }
}

async function alignmentContract(browser, directUrl) {
  const { context, page, telemetry } = await openPage(browser, directUrl, VIEWPORTS[1]);
  try {
    await waitForEnhanced(page);
    await verify("alignment · explicit pointer choices preserve ten anchors and exact fixture results", async () => {
      const expected = new Map([[0, "r = -0.20"], [1, "r = +0.95"], [2, "r = -0.59"]]);
      const values = await page.locator('input[name="alignment"]').evaluateAll((inputs) => inputs.map((input) => input.value));
      assert(sameValue(values, ["0", "1", "2"]), `Alignment values should be 0, 1, and 2; received ${JSON.stringify(values)}.`);
      for (const [alignment, correlation] of expected) {
        await page.locator(`label.alignment-choice:has(input[value="${alignment}"]) strong`).click();
        const state = await assertStateContract(page);
        assert(state.investigation.alignmentDays === alignment, `Alignment state should be ${alignment}.`);
        assert(state.investigation.pairs === 10, `Alignment ${alignment} should retain ten fixed-anchor pairs.`);
        assert(await page.locator("#plot-points .plot-point").count() === 10, `Alignment ${alignment} should render ten plot points.`);
        assert(await page.locator("#pair-rows tr").count() === 10, `Alignment ${alignment} should render ten semantic table rows.`);
        assert((await page.locator("#metric-correlation").textContent()).trim() === correlation, `Alignment ${alignment} should render ${correlation}.`);
        textIncludes(await page.locator("#plot-desc").textContent(), "10 points", `Alignment ${alignment} SVG description`);
        textIncludes(await page.locator("#packet").textContent(), "10 fixed-anchor pairs", `Alignment ${alignment} working capsule`);
        await assertReceipt(page, "#investigate-receipt");
      }
    });
    await verify("alignment · native keyboard arrows change the selected radio and its consequences", async () => {
      const twoDay = page.locator('input[name="alignment"][value="2"]');
      await twoDay.focus();
      await page.keyboard.press("ArrowLeft");
      assert(await page.locator('input[name="alignment"][value="1"]').isChecked(), "ArrowLeft should move from two days later to one day later.");
      assert((await page.locator("#metric-correlation").textContent()).trim() === "r = +0.95", "Keyboard selection should update the correlation.");
      await page.keyboard.press("ArrowLeft");
      assert(await page.locator('input[name="alignment"][value="0"]').isChecked(), "A second ArrowLeft should select same-day alignment.");
      assert((await stateFrom(page)).investigation.alignmentDays === 0, "Keyboard selection should update serialized state.");
    });
    await verify("live status · one settled control change updates the single announcement route", async () => {
      const liveRoutes = page.locator("[role=status][aria-live]");
      assert(await liveRoutes.count() === 1, "Settled-change surface should retain exactly one live status route.");
      await page.locator('label.alignment-choice:has(input[value="1"]) strong').click();
      await page.locator('label.alignment-choice:has(input[value="2"]) strong').click();
      await page.waitForFunction(() => document.getElementById("live-status")?.textContent.includes("2 days later"));
      textIncludes(await page.locator("#live-status").textContent(), "Working prompt capsule updated", "Settled alignment announcement");
      assert(!(await page.locator("#live-status").textContent()).includes("one day later"), "Debounced announcement route should retain the latest settled alignment message.");
    });
    await verify("alignment · browser telemetry", async () => assertTelemetry(telemetry));
  } finally {
    await context.close();
  }
}

async function controlConsequenceContract(browser, directUrl) {
  const { context, page, telemetry } = await openPage(browser, directUrl, VIEWPORTS[1]);
  try {
    await waitForEnhanced(page);
    await verify("control consequence · grade band", async () => {
      await page.locator("#grade").selectOption("Grades 11–12");
      const state = await assertStateContract(page);
      assert(state.situation.grade === "Grades 11–12", "Grade state should follow the chosen band.");
      textIncludes(await page.locator("#situation-guidance").textContent(), "independent method justification", "Grade-specific visible guidance");
      textIncludes(await page.locator("#packet").textContent(), "Grades 11–12", "Grade capsule field");
      await assertReceipt(page, "#situation-receipt");
    });
    await verify("control consequence · class size and grouping", async () => {
      await page.locator("#learners").fill("31");
      const state = await assertStateContract(page);
      assert(sameValue(state.situation.grouping, { mode: "Pair teams", groups: 15, individuals: 0, pairs: 14, trios: 1, quartets: 0, materialSets: 15 }), `31 learners should form 14 pairs and one trio in Pair teams mode; received ${JSON.stringify(state.situation.grouping)}.`);
      textIncludes(await page.locator("#situation-readout").textContent(), "1 trio", "Visible grouping result");
      textIncludes(await page.locator("#packet").textContent(), "`15` material sets", "Grouping capsule field");
      textIncludes(await page.locator("#coordination-materials").textContent(), "15 shared material sets", "Dynamic material preparation");
      textIncludes(await page.locator("#coordination-evidence").textContent(), "31 individual evidence-boundary notes", "Dynamic evidence collection");
      await assertReceipt(page, "#situation-receipt");
    });
    await verify("control consequence · unordered grouping palette exposes coordination depth", async () => {
      await page.locator('input[name="grouping-mode"][value="Table teams of four"]').check();
      const state = await assertStateContract(page);
      assert(sameValue(state.situation.grouping, { mode: "Table teams of four", groups: 8, individuals: 0, pairs: 0, trios: 1, quartets: 7, materialSets: 8 }), `31 learners should form seven quartets and one trio in Table teams mode; received ${JSON.stringify(state.situation.grouping)}.`);
      textIncludes(await page.locator("#coordination-grouping").textContent(), "7 quartets", "Selected grouping composition");
      textIncludes(await page.locator("#coordination-roles").textContent(), "source keeper", "Dynamic rotating-role plan");
      textIncludes(await page.locator("#coordination-movement").textContent(), "teacher sweep", "Dynamic teacher movement plan");
      textIncludes(await page.locator("#coordination-room").textContent(), "8 stations", "Dynamic room configuration");
      textIncludes(await page.locator("#packet").textContent(), "### Classroom coordination", "Coordination capsule section");
      await assertReceipt(page, "#situation-receipt");
    });
    await verify("control consequence · single-learner edge remains complete and recoverable", async () => {
      await page.locator("#learners").fill("1");
      let state = await assertStateContract(page);
      assert(sameValue(state.situation.grouping, { mode: "Table teams of four", groups: 1, individuals: 1, pairs: 0, trios: 0, quartets: 0, materialSets: 1 }), `One learner should retain one complete individual investigation; received ${JSON.stringify(state.situation.grouping)}.`);
      textIncludes(await page.locator("#coordination-grouping").textContent(), "1 individual investigation", "Single-learner grouping");
      textIncludes(await page.locator("#sampling-prompt").textContent(), "help 1 learner", "Single-learner VS planning question");
      textIncludes(await page.locator("#route-event-prompt").textContent(), "enables the learner", "Single-learner optional named event");
      await page.locator("#learners").fill("31");
      state = await assertStateContract(page);
      assert(state.situation.learners === 31 && state.situation.grouping.groups === 8, "Restoring 31 learners should restore the selected Table teams composition.");
    });
    await verify("control consequence · available minutes and exact timing ledger", async () => {
      await page.locator("#minutes").fill("35");
      const state = await assertStateContract(page);
      assert(state.situation.timing.reduce((sum, part) => sum + part.minutes, 0) === 35, "Five-part timing ledger should total 35 minutes.");
      assert((await page.locator("#timing-total").textContent()).trim() === "35 minutes", "Visible timing total should be 35 minutes.");
      textIncludes(await page.locator("#packet").textContent(), "35-minute", "Timing capsule field");
      textIncludes(await page.locator("#sampling-prompt").textContent(), "within 35 minutes", "VS planning-question timing condition");
      textIncludes(await page.locator("#route-event-prompt").textContent(), "35-minute", "Optional event timing condition");
      await assertReceipt(page, "#situation-receipt");
    });
    await verify("control consequence · selected standards", async () => {
      const standard = page.locator('input[name="standard"][value="HSS-ID.C.9"]');
      await standard.uncheck();
      let state = await assertStateContract(page);
      assert(!state.standards.includes("HSS-ID.C.9"), "Causal-language standard should leave the selected state when unchecked.");
      assert(await page.locator("#standard-effects li").count() === 3, "Three visible learner-evidence checks should remain.");
      await assertReceipt(page, "#standard-receipt");
      await standard.check();
      state = await assertStateContract(page);
      assert(state.standards.length === 4, "Restoring the standard should restore four learner-evidence checks.");
    });
    await verify("control consequence · goal recommendation preserves route authority", async () => {
      await page.locator('input[name="goal"][value="Audit a causal claim"]').check();
      const state = await assertStateContract(page);
      assert(state.goal === "Audit a causal claim", "Goal should follow the selected inquiry.");
      assert(state.route.suggested === "Claim and challenge", "Causal-claim goal should suggest Claim and challenge.");
      assert(state.route.selected === "Lag and compare", "Goal selection should preserve the visitor-selected route.");
      assert(state.route.relation === "visitor-selected-alternative", "State should disclose a visitor-selected alternative.");
      textIncludes(await page.locator("#goal-route-reading").textContent(), "explicit alternative", "Visible goal-to-route relation");
      await assertReceipt(page, "#standard-receipt");
    });
    await verify("control consequence · quantitative source readiness and recovery", async () => {
      const precipitation = page.locator('input[name="source"][data-kind="quantitative"]').first();
      await precipitation.uncheck();
      let state = await assertStateContract(page);
      assert(state.investigation.pairs === 0 && state.investigation.correlation === null, "Open quantitative field should yield zero pairs and an open correlation.");
      assert(await page.locator("#plot-points .plot-point").count() === 0, "Plot should await the restored quantitative field.");
      textIncludes(await page.locator("#pair-rows").textContent(), "Choose both quantitative fixture fields", "Quantitative recovery route");
      assert(await page.locator("#assemble").isDisabled(), "Reviewed assembly should wait for both quantitative fields.");
      await assertReceipt(page, "#sources-receipt");
      await precipitation.check();
      state = await assertStateContract(page);
      assert(state.investigation.pairs === 10, "Restoring precipitation should restore ten fixed-anchor pairs.");
    });
    await verify("control consequence · context source visibility preserves calculation", async () => {
      const correlationBefore = await page.locator("#metric-correlation").textContent();
      await page.locator("#osm-toggle").uncheck();
      const state = await assertStateContract(page);
      assert(!state.sources.context.includes("OpenStreetMap-shaped context"), "OSM context should leave the selected context state.");
      assert(await page.locator("#osm-context").getAttribute("aria-hidden") === "true", "OSM SVG group should disclose its hidden state.");
      assert(await page.locator("#metric-correlation").textContent() === correlationBefore, "Context visibility should preserve the descriptive calculation.");
      await assertReceipt(page, "#sources-receipt");
      await page.locator("#osm-toggle").check();
    });
    await verify("control consequence · request example and task-position review", async () => {
      await page.locator('[data-example="personal"]').click();
      let state = await assertStateContract(page);
      assert(state.reference.referentStatus === "personal-reference-cue", "Personal example should create a personal-reference cue.");
      textIncludes(await page.locator("#referent-result").textContent(), "Personal-reference cue", "Visible task-position reading");
      textIncludes(await page.locator("#packet").textContent(), "Make me a lesson plan", "Request capsule field");
      await page.locator("#check-referent").click();
      textIncludes(await page.locator("#live-status").textContent(), "Personal-reference cue", "Explicit task-position review announcement");
      await assertReceipt(page, "#reference-receipt");
      await page.locator('[data-example="named"]').click();
      state = await assertStateContract(page);
      assert(state.reference.referentStatus === "named-role-cue", "Named example should restore a named-role cue.");
    });
    await verify("control consequence · working register", async () => {
      await page.locator('[data-register="Evidence steward"]').click();
      const state = await assertStateContract(page);
      assert(state.reference.register === "Evidence steward", "State should carry the Evidence steward register.");
      assert(await page.locator('[data-register="Evidence steward"]').getAttribute("aria-pressed") === "true", "Evidence steward button should expose its pressed state.");
      textIncludes(await page.locator("#register-modules").textContent(), "Pair-construction audit", "Register-specific visible modules");
      textIncludes(await page.locator("#packet").textContent(), "Pair-construction audit", "Register capsule modules");
      await assertReceipt(page, "#reference-receipt");
    });
    await verify("control consequence · disclosed question-forming perspective", async () => {
      await page.locator("#proxy").selectOption("Accessibility questioner");
      const state = await assertStateContract(page);
      assert(state.reference.socialProxy === "Accessibility questioner", "State should carry the selected accessibility questioner.");
      textIncludes(await page.locator("#proxy-questions").textContent(), "equivalent visual, tabular, and verbal forms", "Proxy-specific visible questions");
      textIncludes(await page.locator("#packet").textContent(), "Accessibility questioner", "Proxy capsule field");
      await assertReceipt(page, "#reference-receipt");
    });
    await verify("control consequence · complete lesson route and disclosed goal relation", async () => {
      await page.locator('[data-route="Claim and challenge"]').click();
      const state = await assertStateContract(page);
      assert(state.route.selected === "Claim and challenge", "State should carry the selected Claim and challenge route.");
      assert(await page.locator('[data-route-card="Claim and challenge"]').getAttribute("data-selected") === "true", "Route card should expose selected state.");
      assert(await page.locator('[data-route-card="Claim and challenge"] .route-folio li').count() === 7, "Selected route should retain its seven-part complete folio, including the class-size consequence.");
      textIncludes(await page.locator('[data-route-coordination="Claim and challenge"]').textContent(), "8 claim-audit boards", "Route-specific class-size consequence");
      textIncludes(await page.locator("#packet").textContent(), "Claim and challenge", "Route capsule field");
      await assertReceipt(page, "#routes-receipt");
    });
    await verify("control consequence · bounded Verbalized Sampling preserves full-distribution mass", async () => {
      assert(await page.locator(".method-frame").count() === 2, "Probability work should expose two visibly separate method frames.");
      assert(await page.locator(".candidate-route-field li").count() === 3, "Candidate field should retain three unordered peer routes.");
      const prompt = await page.locator("#sampling-prompt").textContent();
      textIncludes(prompt, "Within one response", "VS single-response frame");
      textIncludes(prompt, "Generate exactly 5 distinct candidate answers", "VS generated candidate count");
      textIncludes(prompt, "percentage from 0% to 100%", "VS probability unit and range");
      textIncludes(prompt, "to every generated candidate relative to the full distribution", "VS per-candidate full-distribution probability contract");
      textIncludes(prompt, "listed probabilities can therefore total less than 100%", "VS listed-mass boundary");
      textIncludes(prompt, "residual/unlisted mass", "VS residual-mass accounting");
      textIncludes(prompt, "31 learners", "VS planning-question population");
      assert(!/^candidate\s+[1-5].*\b\d+(?:\.\d+)?%/im.test(prompt), "Local VS prompt should carry the distribution contract without fabricated candidate probabilities.");
      textIncludes(await page.locator("#sampling-standing").textContent(), "keeps candidate and probability values open", "Open generated-set standing");
      textIncludes(await page.locator("#sampling-standing").textContent(), "local page makes no model call", "Local model-call boundary");
      const routePrompt = await page.locator("#route-event-prompt").textContent();
      textIncludes(routePrompt, "Named binary event", "Optional event frame");
      textIncludes(routePrompt, "P(named event | route, conditions)", "Optional conditional probability semantics");
      textIncludes(routePrompt, "full-response-distribution and residual-mass accounting", "Probability-frame separation");
      textIncludes(await page.locator("#route-event-standing").textContent(), "event-success estimates remain open", "Open optional event fields");
      textIncludes(await page.locator("#packet").textContent(), "### Sampling request", "Sampling section in working capsule");
      textIncludes(await page.locator("#packet").textContent(), "- Method: `bounded-verbalized-sampling`; `5` distinct candidates", "Bounded sampling method in working capsule");
      textIncludes(await page.locator("#packet").textContent(), "Separate optional frame", "Separate optional assessment in working capsule");
    });
    await verify("control consequence · all edited state paths remain unique and schema-valid", async () => {
      const state = await assertStateContract(page);
      const required = ["grade", "learners", "grouping", "minutes", "standards", "goal", "quantitative", "context", "request", "register", "proxy", "route"];
      for (const key of required) assert(state.assembly.changedControls.includes(key), `Changed-control receipt should include ${key}.`);
      assert(new Set(state.assembly.changedControls).size === state.assembly.changedControls.length, "Changed-control receipt should keep one entry per control family.");
      assertTelemetry(telemetry);
    });
  } finally {
    await context.close();
  }
}

async function lifecycleContract(browser, directUrl) {
  const { context, page, telemetry } = await openPage(browser, directUrl, VIEWPORTS[1]);
  try {
    await waitForEnhanced(page);
    await verify("lifecycle · initial working draft has no reviewed snapshot", async () => {
      const state = await assertStateContract(page);
      assert(state.assembly.status === "working-draft" && state.assembly.revision === 0, "Initial state should be working draft revision 0.");
      assert(await page.locator("#assembled-revision").getAttribute("data-ready") === "false", "Reviewed revision should begin open for first assembly.");
      assert(await page.locator("#restore-revision").isDisabled(), "Restore should await a reviewed revision.");
      assert(await page.locator("#select-packet").isDisabled(), "Reviewed selection should await a reviewed revision.");
      assert(await page.locator("#print").isDisabled(), "Reviewed print should await a reviewed revision.");
    });
    await verify("lifecycle · receiver markup remains literal throughout the review route", async () => {
      const markupLikeReceiver = '<img id="receiver-injection-probe" src="x" onerror="window.__receiverProbe=1"> reviewer';
      await page.evaluate(() => { window.__receiverProbe = 0; });
      await page.locator("#receiver").fill(markupLikeReceiver);
      const state = await assertStateContract(page);
      assert(state.receiver.label === markupLikeReceiver, "Receiver state should preserve markup-like text literally.");
      textIncludes(await page.locator("#receiver-reading").textContent(), markupLikeReceiver, "Literal receiver reading");
      assert(await page.locator("#receiver-injection-probe").count() === 0, "Receiver rendering should create no executable markup node.");
      assert(await page.evaluate(() => window.__receiverProbe) === 0, "Receiver rendering should execute no injected event handler.");
      const workingCapsule = await page.locator("#packet").textContent();
      textIncludes(workingCapsule, '&lt;img id="receiver-injection-probe" src="x" onerror="window.\\_\\_receiverProbe=1"&gt; reviewer', "Escaped receiver in working capsule");
      assert(!workingCapsule.includes("<img"), "Working Prompt Capsule should carry markup-shaped receiver text as escaped Markdown rather than an HTML element.");
      await assertReceipt(page, "#handoff-receipt");
    });
    await verify("lifecycle · unresolved receiver remains visible and pauses assembly", async () => {
      await page.locator("#receiver").fill("");
      const state = await assertStateContract(page);
      assert(state.receiver.status === "requires-resolution" && state.receiver.label === "", "Open receiver should remain open in working state.");
      assert(await page.locator("#assemble").isDisabled(), "Assembly should wait for a named receiver.");
      textIncludes(await page.locator("#receiver-reading").textContent(), "requires resolution", "Receiver recovery reading");
      textIncludes(await page.locator("#assembly-readiness").textContent(), "name the educator or reviewer", "Assembly recovery route");
      textIncludes(await page.locator("#packet").textContent(), "Open: name the human receiver", "Open receiver capsule field");
      await assertReceipt(page, "#handoff-receipt");
    });
    await verify("lifecycle · valid working state assembles immutable revision 1", async () => {
      await page.locator("#receiver").fill("named educator reviewer");
      assert(!(await page.locator("#assemble").isDisabled()), "Named receiver and complete field should enable assembly.");
      await page.locator("#assemble").click();
      const state = await assertStateContract(page);
      assert(state.assembly.status === "reviewed-revision-current" && state.assembly.revision === 1, "Assembly should create current reviewed revision 1.");
      assert(state.assembly.changedControls.length === 0, "Assembly should clear controls awaiting review.");
      assert(!Number.isNaN(Date.parse(state.assembly.reviewedAt)), "Assembly should record an ISO review time.");
      assert(await page.locator("#assembled-revision").getAttribute("data-ready") === "true", "Reviewed revision should become visible.");
      textIncludes(await page.locator("#assembled-packet").textContent(), "# Prompt Capsule: Open Lesson Field", "Reviewed revision heading");
      textIncludes(await page.locator("#assembled-packet").textContent(), "- State: `open-lesson-field.v2` · revision `1`", "Reviewed revision identity");
      textIncludes(await page.locator("#assembled-packet").textContent(), "- Handoff standing: `reviewed-revision-current`", "Reviewed revision standing");
      textIncludes(await page.locator("#assembled-packet").textContent(), "Grade 9", "Reviewed revision frozen grade");
      assert(!(await page.locator("#restore-revision").isDisabled()), "Restore should become available after assembly.");
      assert(!(await page.locator("#print").isDisabled()), "Reviewed print should become available after assembly.");
      assert(await page.locator("#assemble").isDisabled(), "Current reviewed revision should disable assembly.");
      assert((await page.locator("#assemble").textContent()).trim() === "Reviewed revision 1 is current", "Current reviewed revision should state its current standing on the assembly control.");
      await page.locator("#assemble").evaluate((button) => button.click());
      assert((await stateFrom(page)).assembly.revision === 1, "Disabled assembly should preserve revision 1 and prevent a no-op revision.");
    });
    let reviewedRevisionOne = "";
    let reviewedRevisionOneDiff = "";
    let reviewedRevisionOneFingerprint = "";
    await verify("lifecycle · later edits mark changes while preserving reviewed revision", async () => {
      reviewedRevisionOne = await page.locator("#assembled-packet").textContent();
      reviewedRevisionOneDiff = await page.locator("#revision-diff").textContent();
      reviewedRevisionOneFingerprint = promptFingerprintFrom(reviewedRevisionOne);
      await page.locator("#grade").selectOption("Grades 11–12");
      await page.locator("#minutes").fill("35");
      const state = await assertStateContract(page);
      assert(state.assembly.status === "changes-awaiting-review" && state.assembly.revision === 1, "Later edit should retain revision 1 and mark changes awaiting review.");
      assert(state.assembly.changedControls.includes("grade"), "Later edit should name Grade band in the changed-control receipt.");
      assert(state.assembly.changedControls.includes("minutes"), "Later edit should name Available minutes in the changed-control receipt.");
      assert(state.assembly.changedControls.length === 2, `Pending-changes state should retain both edits since revision 1; received ${JSON.stringify(state.assembly.changedControls)}.`);
      textIncludes(await page.locator("#packet").textContent(), "Grades 11–12", "Changed working capsule");
      textIncludes(await page.locator("#packet").textContent(), "35-minute", "Changed working-capsule timing");
      assert(await page.locator("#assembled-packet").textContent() === reviewedRevisionOne, "Reviewed revision 1 should remain immutable while controls change.");
      assert(promptFingerprintFrom(await page.locator("#assembled-packet").textContent()) === reviewedRevisionOneFingerprint, "Reviewed revision 1 should retain its assembled state fingerprint while working controls change.");
      assert(await page.evaluate(() => window.openLessonField.promptCapsuleFingerprint()) !== reviewedRevisionOneFingerprint, "Working Prompt Capsule fingerprint should identify the later working state.");
      assert(await page.locator("#revision-diff").textContent() === reviewedRevisionOneDiff, "Frozen revision diff should retain the changes included in revision 1 while later edits remain pending.");
      const pendingChanges = await page.locator("#changes-since-reviewed-revision li").allTextContents();
      assert(pendingChanges.length === 2, `Visible pending-change ledger should retain both edits since revision 1; received ${JSON.stringify(pendingChanges)}.`);
      textIncludes(pendingChanges.join(" "), "Grade band", "Visible pending grade change");
      textIncludes(pendingChanges.join(" "), "Available minutes", "Visible pending timing change");
      assert(!reviewedRevisionOneDiff.includes("Grade band"), "Frozen revision 1 included-change receipt should remain separate from the later grade change.");
      textIncludes(await page.locator("#capsule-status").textContent(), "2 awaiting review", "Pending-changes capsule status");
      textIncludes(await page.locator("#last-change").textContent(), "35 minutes", "Latest pending-change reading");
      assert(!(await page.locator("#assemble").isDisabled()), "Pending semantic differences should enable the next reviewed revision.");
      assert((await page.locator("#assemble").textContent()).trim() === "Assemble reviewed revision 2", "Pending semantic differences should name revision 2 as the next assembly.");
    });
    await verify("lifecycle · manually matching one reviewed value clears only that pending control family", async () => {
      await page.locator("#grade").selectOption("Grade 9");
      const state = await assertStateContract(page);
      assert(state.assembly.status === "changes-awaiting-review" && state.assembly.revision === 1, "One remaining value difference should keep revision 1 in changes-awaiting-review state.");
      assert(sameValue(state.assembly.changedControls, ["minutes"]), `Manual grade reconciliation should leave only minutes pending; received ${JSON.stringify(state.assembly.changedControls)}.`);
      const pendingChanges = await page.locator("#changes-since-reviewed-revision li").allTextContents();
      assert(pendingChanges.length === 1, `Visible pending-change ledger should contain one remaining family; received ${JSON.stringify(pendingChanges)}.`);
      textIncludes(pendingChanges[0], "Available minutes", "Remaining pending timing change");
      assert(!pendingChanges[0].includes("Grade band"), "Reconciled Grade band should leave the live pending-change ledger.");
      textIncludes(await page.locator("#capsule-status").textContent(), "1 awaiting review", "Partially reconciled capsule status");
      assert(await page.locator("#revision-diff").textContent() === reviewedRevisionOneDiff, "Frozen revision 1 included-change receipt should stay unchanged during partial reconciliation.");
      assert(!(await page.locator("#assemble").isDisabled()), "One remaining pending family should keep reviewed revision 2 available.");
      assert((await page.locator("#assemble").textContent()).trim() === "Assemble reviewed revision 2", "Partial reconciliation should preserve revision 2 as the next assembly.");
    });
    await verify("lifecycle · manually matching every reviewed value returns the revision to current", async () => {
      await page.locator("#minutes").fill("55");
      const state = await assertStateContract(page);
      assert(state.assembly.status === "reviewed-revision-current" && state.assembly.revision === 1, "Matching every reviewed value should return revision 1 to current state.");
      assert(state.assembly.changedControls.length === 0, `Fully reconciled state should have zero pending control families; received ${JSON.stringify(state.assembly.changedControls)}.`);
      textIncludes(await page.locator("#changes-since-reviewed-revision").textContent(), "Current working controls match reviewed revision 1", "Fully reconciled pending-change ledger");
      textIncludes(await page.locator("#capsule-status").textContent(), "Revision 1 · current", "Fully reconciled capsule status");
      assert(await page.locator("#revision-diff").textContent() === reviewedRevisionOneDiff, "Frozen revision 1 included-change receipt should stay unchanged after full reconciliation.");
      assert(await page.locator("#assemble").isDisabled(), "Fully reconciled reviewed state should disable assembly.");
      assert((await page.locator("#assemble").textContent()).trim() === "Reviewed revision 1 is current", "Fully reconciled assembly control should name revision 1 as current.");
      await page.locator("#assemble").evaluate((button) => button.click());
      assert((await stateFrom(page)).assembly.revision === 1, "Fully reconciled state should prevent a no-op revision.");
    });
    await verify("lifecycle · grouping mode participates in review and restore", async () => {
      await page.locator('input[name="grouping-mode"][value="Trio teams"]').check();
      let state = await assertStateContract(page);
      assert(sameValue(state.assembly.changedControls, ["grouping"]), `Grouping change should create one semantic pending family; received ${JSON.stringify(state.assembly.changedControls)}.`);
      textIncludes(await page.locator("#changes-since-reviewed-revision").textContent(), "Grouping structure", "Pending grouping change");
      await page.locator("#restore-revision").click();
      state = await assertStateContract(page);
      assert(state.situation.grouping.mode === "Pair teams", "Restore should rehydrate the reviewed grouping mode.");
      assert(await page.locator('input[name="grouping-mode"][value="Pair teams"]').isChecked(), "Restore should return the native grouping choice to Pair teams.");
      assert(state.assembly.changedControls.length === 0, "Restored grouping should reconcile its pending semantic family.");
    });
    await verify("lifecycle · restore rehydrates controls and returns to reviewed revision", async () => {
      await page.locator("#grade").selectOption("Grades 11–12");
      await page.locator("#minutes").fill("35");
      assert((await stateFrom(page)).assembly.changedControls.length === 2, "Restore rehearsal should begin with two pending control families.");
      await page.locator("#restore-revision").click();
      const state = await assertStateContract(page);
      assert(state.assembly.status === "reviewed-revision-current" && state.assembly.changedControls.length === 0, "Restore should return to a current reviewed revision.");
      assert(await page.locator("#grade").inputValue() === "Grade 9", "Restore should rehydrate the assembled grade control.");
      assert(await page.locator("#minutes").inputValue() === "55", "Restore should rehydrate the assembled timing control.");
      textIncludes(await page.locator("#packet").textContent(), "Grade 9", "Restored working capsule");
      assert(await page.locator("#assembled-packet").textContent() === reviewedRevisionOne, "Restore should preserve the reviewed snapshot.");
      assert(await page.evaluate(() => window.openLessonField.promptCapsuleFingerprint()) === reviewedRevisionOneFingerprint, "Restore should reconcile the working Prompt Capsule fingerprint to the reviewed snapshot.");
      textIncludes(await page.locator("#changes-since-reviewed-revision").textContent(), "Current working controls match reviewed revision 1", "Restored pending-change ledger");
      assert(await page.locator("#assemble").isDisabled(), "Restore should disable assembly when controls match revision 1.");
    });
    await verify("lifecycle · second assembly increments revision and carries its change receipt", async () => {
      await page.locator("#grade").selectOption("Grades 11–12");
      assert(!(await page.locator("#assemble").isDisabled()), "A new semantic difference should enable revision 2 assembly.");
      assert((await page.locator("#assemble").textContent()).trim() === "Assemble reviewed revision 2", "New semantic difference should name revision 2 as the next assembly.");
      await page.locator("#assemble").click();
      const state = await assertStateContract(page);
      assert(state.assembly.revision === 2 && state.assembly.status === "reviewed-revision-current", "Second assembly should create current reviewed revision 2.");
      textIncludes(await page.locator("#revision-diff").textContent(), "Grade band", "Revision 2 included-change receipt");
      textIncludes(await page.locator("#assembled-packet").textContent(), "- State: `open-lesson-field.v2` · revision `2`", "Revision 2 identity");
      assert(await page.locator("#assemble").isDisabled(), "Current revision 2 should disable another assembly.");
      assert((await page.locator("#assemble").textContent()).trim() === "Reviewed revision 2 is current", "Assembly control should name revision 2 as current.");
      await page.locator("#assemble").evaluate((button) => button.click());
      assert((await stateFrom(page)).assembly.revision === 2, "Current revision 2 should prevent a no-op revision 3.");
    });
    await verify("lifecycle · Select action carries the reviewed snapshot after assembly", async () => {
      textIncludes(await page.locator("#select-packet").textContent(), "reviewed", "Post-assembly Select action label");
      await page.locator("#select-packet").click();
      const selected = await page.evaluate(() => window.getSelection()?.toString() || "");
      const assembled = await page.locator("#assembled-packet").textContent();
      assert(assembled.endsWith("\n"), "Reviewed Prompt Capsule should retain its portable terminal line feed.");
      assert(selected === assembled.slice(0, -1), "Post-assembly Select action should select every visible character; the DOM selection API omits the terminal file line feed.");
    });
    await verify("lifecycle · Print action calls the reviewed-handoff print route", async () => {
      await page.evaluate(() => {
        window.__lessonFieldPrintCalls = 0;
        window.print = () => { window.__lessonFieldPrintCalls += 1; };
      });
      await page.locator("#print").click();
      assert(await page.evaluate(() => window.__lessonFieldPrintCalls) === 1, "Reviewed Print action should call window.print once.");
      assertTelemetry(telemetry);
    });
  } finally {
    await context.close();
  }
}

async function noJavaScriptContract(browser, directUrl, hostUrl) {
  await verify("no-JavaScript · standalone static route remains complete and contained", async () => {
    const enhanced = await openPage(browser, directUrl, VIEWPORTS[0]);
    let expectedPlain = "";
    try {
      await waitForEnhanced(enhanced.page);
      expectedPlain = await enhanced.page.evaluate(() => window.openLessonField.promptCapsule());
    } finally {
      await enhanced.context.close();
    }
    const { context, page, telemetry } = await openPage(browser, directUrl, VIEWPORTS[0], { javaScriptEnabled: false });
    try {
      assert(!(await page.locator("html").evaluate((html) => html.classList.contains("is-enhanced"))), "Static route should remain in its authored state.");
      assert(await page.locator("noscript .boundary").isVisible(), "Static posture should be visible.");
      assert(await page.locator(".js-only").evaluateAll((elements) => elements.every((element) => getComputedStyle(element).display === "none")), "Enhanced actions should yield to the static route.");
      assert(await page.locator("[data-enhanced-control]").evaluateAll((controls) => controls.every((control) => control.disabled)), "Enhanced controls should remain disabled in static mode.");
      assert(await page.locator("#plot-points .plot-point").count() === 10, "Static plot should retain ten authored points.");
      assert(await page.locator("#coordination-title").isVisible(), "Static route should retain the class-size depth explanation.");
      assert(await page.locator(".coordination-ledger > div").count() === 10, "Static class-size tableau should retain ten coordination consequences.");
      assert(await page.locator(".candidate-route-field li").count() === 3, "Static candidate field should retain three peer routes.");
      textIncludes(await page.locator("#sampling-prompt").textContent(), "Generate exactly 5 distinct candidate answers", "Static bounded Verbalized Sampling fan-out");
      textIncludes(await page.locator("#sampling-prompt").textContent(), "residual or unlisted response mass", "Static VS residual-mass disclosure");
      textIncludes(await page.locator("#route-event-prompt").textContent(), "Named binary event", "Static separate route/event assessment");
      const staticPlain = await page.locator("#packet").textContent();
      textIncludes(staticPlain, "# Prompt Capsule: Open Lesson Field", "Static capsule");
      assert(staticPlain === expectedPlain, `Authored no-JavaScript and enhanced initial plain Markdown should be byte-identical; received ${Buffer.byteLength(staticPlain, "utf8")} and ${Buffer.byteLength(expectedPlain, "utf8")} bytes.`);
      await assertLayout(page, "Static standalone mobile");
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
  await verify("no-JavaScript · embedded instrument and parent static equivalent remain readable", async () => {
    const { context, page, telemetry } = await openHostedLessonPage(browser, hostUrl, VIEWPORTS[0], { javaScriptEnabled: false });
    try {
      assert(await page.locator(".lesson-field-static-equivalent").isVisible(), "Parent page should retain the static semantic equivalent.");
      const { frame } = await iframeSurface(page);
      assert(await frame.locator("noscript .boundary").isVisible(), "Embedded instrument should expose its static posture.");
      assert(await frame.locator("#coordination-title").isVisible(), "Embedded static instrument should retain the class-size depth explanation.");
      textIncludes(await frame.locator("#packet").textContent(), "# Prompt Capsule: Open Lesson Field", "Embedded static capsule");
      await assertLayout(page, "Static parent mobile");
      await assertLayout(frame, "Static embedded mobile");
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function printContract(browser, directUrl, hostUrl) {
  await verify("print · reviewed standalone revision is the printable artifact", async () => {
    const { context, page, telemetry } = await openPage(browser, directUrl, VIEWPORTS[1]);
    try {
      await waitForEnhanced(page);
      await page.locator("#assemble").click();
      await page.emulateMedia({ media: "print" });
      assert(await page.locator("#assembled-revision").isVisible(), "Print should include the reviewed revision.");
      assert(!(await page.locator(".working-capsule-panel").isVisible()), "Print should foreground the reviewed revision over the working editor.");
      assert(!(await page.locator(".route-field").isVisible()), "Print should leave stage navigation outside the handoff.");
      assert(!(await page.locator(".inspection").isVisible()), "Print should leave the technical inspector outside the handoff.");
      const metrics = await layoutMetrics(page);
      assert(metrics.scrollWidth <= metrics.clientWidth + 2, "Print layout should remain horizontally contained.");
      const pdf = await page.pdf({ format: "Letter", printBackground: true });
      assert(pdf.length > 10000, `Reviewed handoff PDF should contain substantive content; received ${pdf.length} bytes.`);
      await writeFile(resolve(runDir, "open-lesson-field-reviewed-handoff.pdf"), pdf);
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
  await verify("print · parent page substitutes its static semantic equivalent for the iframe", async () => {
    const { context, page, telemetry } = await openHostedLessonPage(browser, hostUrl, VIEWPORTS[1]);
    try {
      await page.emulateMedia({ media: "print" });
      assert(!(await page.locator(IFRAME_SELECTOR).isVisible()), "Parent print should leave the interactive iframe outside the page artifact.");
      assert(await page.locator(".lesson-field-static-equivalent").isVisible(), "Parent print should retain the static semantic equivalent.");
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function mediaContract(browser, directUrl) {
  await verify("forced colors · native selection, capsule, and controls remain discernible", async () => {
    const { context, page, telemetry } = await openPage(browser, directUrl, VIEWPORTS[1]);
    try {
      await waitForEnhanced(page);
      await page.emulateMedia({ forcedColors: "active" });
      assert(await page.evaluate(() => matchMedia("(forced-colors: active)").matches), "Forced-colors media query should be active.");
      const selectedChoice = page.locator('label.alignment-choice:has(input[name="alignment"]:checked)');
      assert(await selectedChoice.isVisible(), "Selected native alignment choice should remain visible.");
      const outline = await selectedChoice.evaluate((element) => getComputedStyle(element).outlineStyle);
      assert(outline === "double", `Selected forced-colors choice should use a double outline; received ${outline}.`);
      const selectedGrouping = page.locator('label.grouping-choice:has(input[name="grouping-mode"]:checked)');
      assert(await selectedGrouping.isVisible(), "Selected native grouping choice should remain visible.");
      const groupingOutline = await selectedGrouping.evaluate((element) => getComputedStyle(element).outlineStyle);
      assert(groupingOutline === "double", `Selected forced-colors grouping choice should use a double outline; received ${groupingOutline}.`);
      assert(await page.locator("#capsule-dock-title").isVisible(), "Capsule dock should remain visible in forced colors.");
      await assertLayout(page, "Forced-colors standalone");
      await page.screenshot({ path: resolve(runDir, "open-lesson-field-forced-colors.png"), fullPage: true });
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
  await verify("reduced motion · interaction remains current with near-zero motion", async () => {
    const { context, page, telemetry } = await openPage(browser, directUrl, VIEWPORTS[1]);
    try {
      await waitForEnhanced(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), "Reduced-motion media query should be active.");
      assert(await page.locator("html").evaluate((html) => getComputedStyle(html).scrollBehavior) === "auto", "Reduced motion should use immediate scrolling.");
      const durations = await page.locator("button").first().evaluate((button) => {
        const style = getComputedStyle(button);
        return { animation: style.animationDuration, transition: style.transitionDuration };
      });
      assert(!durations.animation.includes("s") || parseFloat(durations.animation) <= 0.001, `Animation duration should be effectively zero; received ${durations.animation}.`);
      assert(!durations.transition.includes("s") || parseFloat(durations.transition) <= 0.001, `Transition duration should be effectively zero; received ${durations.transition}.`);
      await page.locator('label.alignment-choice:has(input[value="2"]) strong').click();
      assert((await page.locator("#metric-correlation").textContent()).trim() === "r = -0.59", "Reduced-motion alignment should still update its visible consequence.");
      await page.screenshot({ path: resolve(runDir, "open-lesson-field-reduced-motion.png"), fullPage: true });
      assertTelemetry(telemetry);
    } finally {
      await context.close();
    }
  });
}

async function main() {
  await mkdir(runDir, { recursive: true });
  const staticServer = await startStaticServer(process.cwd());
  const directUrl = new URL(DIRECT_TARGET, `${staticServer.origin}/`).href;
  const hostUrl = new URL(HOST_TARGET, `${staticServer.origin}/`).href;
  let browser = null;
  try {
    browser = await chromium.launch();
    await directViewportChecks(browser, directUrl);
    await embeddedViewportChecks(browser, hostUrl);
    await embeddedPromptCapsuleExchangeContract(browser, hostUrl);
    await promptCapsuleContract(browser, directUrl);
    await alignmentContract(browser, directUrl);
    await controlConsequenceContract(browser, directUrl);
    await lifecycleContract(browser, directUrl);
    await noJavaScriptContract(browser, directUrl, hostUrl);
    await printContract(browser, directUrl, hostUrl);
    await mediaContract(browser, directUrl);
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      await staticServer.close();
    }
  }

  const summary = {
    directTarget: DIRECT_TARGET,
    hostTarget: HOST_TARGET,
    directUrl,
    hostUrl,
    viewports: VIEWPORTS,
    runDir,
    checks,
    failures
  };
  await writeFile(resolve(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  if (failures.length) {
    console.error(`Open Lesson Field contract failed. Artifacts: ${runDir}`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log(`Open Lesson Field contract passed. Artifacts: ${runDir}`);
}

main().catch(async (error) => {
  failures.push(`Harness: ${error.stack || error.message}`);
  await mkdir(runDir, { recursive: true }).catch(() => {});
  await writeFile(resolve(runDir, "summary.json"), `${JSON.stringify({ runDir, checks, failures }, null, 2)}\n`).catch(() => {});
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
