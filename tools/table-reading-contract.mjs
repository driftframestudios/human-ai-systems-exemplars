import './node-runtime-admission.mjs';
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { startStaticServer, repositoryRoot } from "./core-architecture-browser-helper.mjs";
import { createAggregatePackagePlan } from "./package-v1-iframe-routes.mjs";
import { observeTableReading, observeControlReading, tableCaseVerdict } from "./table-reading-observer.mjs";
import { atomicJson, collectCleanupErrors, digest, openCheckpoints, publishObservation, withCheckpointLock } from "./observation-checkpoint.mjs";
import { executionPlan, inputSnapshot, observationVersion, publishCampaign, publishScreenshot } from "./evidence-campaign.mjs";
import { acceptancePlan, assertAcceptanceRecord, createDocumentAccounting, reportReceiver, runAcceptanceCases, runFocusedAcceptance } from "./table-focused-acceptance.mjs";

export const harnessSources = [
  "tools/table-reading-contract.mjs", "tools/table-reading-observer.mjs", "tools/observation-checkpoint.mjs",
  "tools/evidence-campaign.mjs",
  "tools/table-focused-acceptance.mjs",
  "tools/core-architecture-browser-helper.mjs", "tools/attribution-contract.mjs",
  "tools/package-v1-iframe-routes.mjs", "tools/iframe-route-package-engine.mjs",
  "tools/package-iframe-routes.mjs", "tools/package-canvas-iframe-routes.mjs",
  "tools/project-investment-analysis.mjs", "context-canvas-project-surface/context-canvas/visitor-boundary-contract.js",
];

const canvas = "context-canvas-project-surface/context-canvas/";
const shared = "shared-surface-priority-map-chimeric-prototype-v0.1.4.html";
const families = [
  { id: "conditioning", source: `${canvas}conditioning-field.html`, parent: `${canvas}ai-systems.html`,
    alias: "/v1/core/conditioning-field/", widths: [304, 320, 390, 1280], tables: { script: 4, static: 4 } },
  { id: "shared", source: `core-architectures-chimeric-prototype-current-pack-v0.1/${shared}`,
    projection: `${canvas}prototypes/core-architectures/chimeric-pack-v0.1/${shared}`,
    parent: `${canvas}concept-nursery.html`, alias: "/v1/core/cross-channel-blueprint/", widths: [304, 320, 390, 479, 480, 481, 1280], tables: { script: 2, static: 0 } },
  { id: "investment", source: "collaboration/cross-functional-investment-model-studio/index.html",
    parent: `${canvas}initiative-costing.html`, alias: "/v1/canvas/cross-functional-investment-model-studio/",
    widths: [304, 320, 390, 1239, 1280], tables: { script: 18, static: 3 } },
];

export async function checkFixtures(browser) {
  const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
  try {
    await page.setContent(`<style>
      body{margin:8px} .region{width:280px;overflow:auto} td,th{padding:8px;font:16px monospace}
      #good{min-width:700px} #bad{width:240px;table-layout:fixed;overflow-wrap:anywhere}
      #bad th:last-child{width:18px} #identifier{width:80px;table-layout:fixed;overflow-wrap:anywhere}
      </style><div class="region" tabindex="0" role="region" aria-label="Readable costs; scroll horizontally">
      <table id="good"><caption>Costs</caption><thead><tr><th scope="col" data-label="Choice">Choice</th><th scope="col" data-label="USD">USD</th></tr></thead>
      <tbody>${["", "0", "unavailable", "invalid", "inapplicable", "qualified: 12 USD"].map((value) => `<tr data-label="Costs: Pilot"><th scope="row" data-label="Choice">Pilot</th><td data-label="USD">${value}</td></tr>`).join("")}</tbody></table></div>
      <table id="bad"><caption>Collapsed</caption><tr><th scope="col">Choice</th><th scope="col">Consequence</th></tr><tr><th scope="row">Pilot</th><td>12345.67</td></tr></table>
      <table id="identifier"><caption>Identity</caption><tr><th scope="col">ID</th></tr><tr><td><code>urn:example:meaningful:stable:identifier</code></td></tr></table>
      <details><summary>Hidden state</summary><table><tr><td>Pending observation</td></tr></table></details>
      <table style="width:100px;table-layout:fixed"><tr><td>evidence-based source-aware U:<wbr>&mdash;</td></tr></table>`);
    const [good, bad, identifier, hidden, punctuation] = await page.evaluate(observeTableReading);
    assert.equal(good.fragments.length, 0);
    assert.equal(good.scroll.overflow, true);
    assert.equal(good.scroll.focusable, true);
    assert.deepEqual(good.records.map((record) => record.fields[1].value), ["", "0", "unavailable", "invalid", "inapplicable", "qualified: 12 USD"]);
    assert(good.records.every((record) => record.topic === "Costs" && record.identity === "Pilot" && record.fields[1].label === "USD"));
    assert(bad.fragments.some((fragment) => fragment.column === 1 && fragment.kind === "word"));
    assert(bad.fragments.some((fragment) => fragment.column === 1 && fragment.kind === "numeric"));
    assert(identifier.fragments.length > 0 && identifier.fragments.every((fragment) => fragment.kind === "identifier-review"));
    assert.equal(hidden.visible, false);
    assert.equal(punctuation.fragments.length, 0, "ordinary punctuation supplies legitimate word boundaries");
    return { positiveScroll: "pass", rightmostWord: "detected", rightmostNumeric: "detected", identifier: "separate-review", absenceValues: 6, hidden: "accounted" };
  } finally { await page.close(); }
}

async function keyboardReach(frame, observation) {
  const results = [];
  for (const table of observation.filter((item) => item.visible && item.scroll?.overflow)) {
    const handle = await frame.locator("table").nth(table.tableIndex).evaluateHandle((element) => {
      let owner = element.parentElement;
      while (owner && !["auto", "scroll"].includes(getComputedStyle(owner).overflowX)) owner = owner.parentElement;
      return owner;
    });
    const owner = handle.asElement();
    try {
      if (!table.scroll.focusable || !table.scroll.name) {
        results.push({ tableIndex: table.tableIndex, standing: "owner-review", reason: "Named keyboard scroll owner" });
        continue;
      }
      await owner.evaluate((element) => { element.scrollLeft = 0; element.focus(); });
      await owner.press("ArrowRight");
      let moved = false;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (await owner.evaluate((element) => element.scrollLeft > 0)) { moved = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (!moved) {
        results.push({ tableIndex: table.tableIndex, standing: "review", reason: "ArrowRight movement remains unobserved" });
        continue;
      }
      const reach = await owner.evaluate((element) => {
        const focused = document.activeElement === element;
        element.scrollLeft = element.scrollWidth;
        const table = element.querySelector("table");
        const last = table.rows[table.rows.length - 1]?.lastElementChild;
        return { focused, finalCellRight: last?.getBoundingClientRect().right,
          ownerRight: element.getBoundingClientRect().right, scrollLeft: element.scrollLeft };
      });
      results.push({ tableIndex: table.tableIndex, standing: reach.focused && reach.finalCellRight <= reach.ownerRight + 2 ? "pass" : "review", ...reach });
    } finally { await handle.dispose(); }
  }
  return results;
}

export function assertExpectedTables(observed, expected, label) {
  assert.equal(observed.length, expected, `${label}: declared table population`);
}

async function inspect(frame, family, keyboard = true, script = true) {
  const initial = await frame.evaluate(observeTableReading);
  await frame.locator("details").evaluateAll((details) => details.forEach((element) => { element.open = true; }));
  const tables = await frame.evaluate(observeTableReading);
  assertExpectedTables(tables, family.tables[script ? "script" : "static"], family.id);
  assert.equal(await frame.locator("h1").count(), 1, `${family.id}: authored document orientation`);
  if (!script && family.id === "shared") {
    assert.match(await frame.locator("#aiPrompt").textContent(), /## Working state/u,
      "scriptless Shared Surface retains its authored handoff; runtime tables require scripts");
  }
  const controls = family.id === "shared" ? await frame.evaluate(observeControlReading) : [];
  return { tableCoverage: script ? "runtime-tables" : "authored-static-tables-and-handoff",
    runtimeTablesOutsideStaticView: script ? 0 : family.tables.script - family.tables.static,
    initialHidden: initial.filter((table) => !table.visible).map((table) => table.tableIndex), tables, controls,
    keyboard: keyboard ? await keyboardReach(frame, tables) : [],
    viewport: await frame.evaluate(() => ({ width: innerWidth, clientWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth })) };
}

const errorText = error => error instanceof Error ? error.message : String(error);

/** Finish owned artifacts and source validation before the final telemetry/cancellation gate. */
export async function publishTableObservation(store, record, finishArtifacts, { signal } = {}) {
  signal?.throwIfAborted();
  await publishObservation(store, record, async () => {
    await finishArtifacts();
    signal?.throwIfAborted();
    assert.equal(record.result.errors?.length ?? 0, 0, "Final case telemetry must be clear before publication");
  });
}

/** Include dispatcher-reported attempts, excluding prior flags on reused observations. */
export function invocationCounts(cases, attemptedCaseIds, reusedCaseIds, expectedCaseIds) {
  const attempted = new Set(attemptedCaseIds);
  for (const item of cases) {
    if (item.attempted === true && !reusedCaseIds.has(item.id)) attempted.add(item.id);
  }
  const unrunCaseIds = expectedCaseIds.filter(id => !attempted.has(id) && !reusedCaseIds.has(id));
  return { attemptedCases: attempted.size, newCases: attempted.size,
    reused: reusedCaseIds.size, unrunCaseIds };
}

export async function runCampaign({ mode = "focused", familyId = "all", output = ".visual-runs/table-repairs/epoch-01", resume = false, caseId = null, planOnly = false, signal } = {}) {
  assert(mode !== "acceptance" || !resume, "Supplemental acceptance uses a fresh run; cached cases are not admitted");
  const campaign = mode === "acceptance" ? acceptancePlan(families, { familyId, caseId }) : executionPlan(families, { mode, familyId, caseId });
  const plannedCases = new Map(campaign.cases.map(item => [item.id, item]));
  if (planOnly) { console.log(JSON.stringify({ observationVersion, ...campaign })); return campaign; }
  signal?.throwIfAborted();
  const outputRoot = path.resolve(repositoryRoot, output);
  assert(outputRoot.startsWith(path.join(repositoryRoot, ".visual-runs") + path.sep), "Local artifacts remain in .visual-runs");
  await fs.mkdir(outputRoot, { recursive: true });
  const checkpoints = await openCheckpoints(path.join(outputRoot, "checkpoints"));
  const packageFiles = new Map();
  const snapshot = inputSnapshot(repositoryRoot, packageFiles);
  const definitionFiles = [...harnessSources, "attribution.yml", "package-lock.json"];
  const definitionParts = await snapshot.fingerprints(definitionFiles);
  const executable = await fs.stat(chromium.executablePath());
  const definition = digest(JSON.stringify([observationVersion, definitionParts, process.version, process.platform, process.arch, executable.size, executable.mtimeMs]));
  const cases = [];
  const records = [];
  const stages = { executionMilliseconds: 0, publicationMilliseconds: 0 };
  const documentAccounting = createDocumentAccounting();
  const observeDocument = async frame => documentAccounting.visit(frame,
    await frame.evaluate(() => ({ protocol: location.protocol, timeOrigin: performance.timeOrigin })));
  let stoppedAfterCase = null;
  let executionError = null;
  let completion = null;
  let browserLaunches = 0;
  const attemptedCaseIds = new Set();
  const reusedCaseIds = new Set();
  const started = Date.now();
  const lockPath = path.join(outputRoot, "campaign.lock");
  signal?.throwIfAborted();
  return withCheckpointLock(lockPath, { pid: process.pid, started, definition }, async () => {
  const persist = async (result) => {
    cases.push(result);
    await fs.appendFile(path.join(outputRoot, "cases.jsonl"), JSON.stringify(result) + "\n");
    console.log(JSON.stringify({ case: result.id, standing: result.standing, wordFragments: result.wordFragments,
      numericFragments: result.numericFragments, controlFragments: result.controlFragments }));
  };
  let browser;
  const getBrowser = async () => {
    signal?.throwIfAborted();
    if (!browser) { browser = await chromium.launch(); browserLaunches += 1; }
    signal?.throwIfAborted();
    return browser;
  };
  let server;
  let cleanupPromise;
  const cleanup = () => cleanupPromise ??= collectCleanupErrors([
    async () => { if (browser) await browser.close(); },
    async () => { if (server) await server.close(); },
  ]);
  let summary;
  try {
    signal?.throwIfAborted();
    await atomicJson(path.join(outputRoot, "plan.json"), { observationVersion, definition, requested: campaign.expected, started });
    const executionStart = performance.now();
    if (mode !== "acceptance") {
    const savedFixture = resume && await checkpoints.readRecord("observer-fixtures", definition, (deps) => snapshot.agrees(deps));
    if (savedFixture) { cases.push(savedFixture.result); records.push(savedFixture); reusedCaseIds.add("observer-fixtures"); }
    else {
      signal?.throwIfAborted();
      attemptedCaseIds.add("observer-fixtures");
      const fixture = { id: "observer-fixtures", standing: "pass", result: await checkFixtures(await getBrowser()) };
      await persist(fixture);
      const record = { id: fixture.id, signature: definition, dependencies: definitionParts, result: fixture };
      await publishTableObservation(checkpoints, record, async () => {
        assert(await snapshot.agrees(record.dependencies, true), "Fixture inputs remain at their admitted identity");
      }, { signal });
      records.push(record);
    }
    }
    if (campaign.cases.length) {
      signal?.throwIfAborted();
      server = await startStaticServer();
      signal?.throwIfAborted();
      const plan = await createAggregatePackagePlan();
      for (const [key, bytes] of plan.outputFiles) packageFiles.set(key, Buffer.from(bytes));
    }
    const perform = async (family, width, { id: plannedId, journey = null, variant = "source", media = "screen", script = true, enlarged = false, parent = false } = {}) => {
      const id = plannedId ?? `${family.id}-${variant}-${width}-${media}-${script ? "script" : "static"}${enlarged ? "-text200" : ""}`;
      if (caseId && id !== caseId) return;
      signal?.throwIfAborted();
      const signature = digest(JSON.stringify([definition, family, width, variant, media, script, enlarged, parent, journey]));
      const resourceHash = (key) => snapshot.hash(key);
      const saved = resume && await checkpoints.readRecord(id, signature, async (dependencies) => {
        if (!dependencies || !Object.keys(dependencies).length) return false;
        for (const [key, hash] of Object.entries(dependencies)) if (await resourceHash(key) !== hash) return false;
        return true;
      });
      if (saved) { cases.push(saved.result); records.push(saved); reusedCaseIds.add(id); console.log(JSON.stringify({ case: id, standing: "reused", observation: saved.result.standing })); return; }
      attemptedCaseIds.add(id);
      const errors = [];
      const screenshots = [];
      let context, contextCloseAttempted = false;
      const closeContext = async () => {
        if (!context || contextCloseAttempted) return;
        contextCloseAttempted = true;
        await context.close();
      };
      try {
      const owners = [family.source, parent ? family.parent : variant === "projection" ? family.projection : null, journey === "studio-report" ? reportReceiver : null].filter(Boolean);
      const dependencies = { ...definitionParts, ...await snapshot.fingerprints(owners) };
      context = await (await getBrowser()).newContext({ viewport: { width, height: 1000 }, javaScriptEnabled: script,
        reducedMotion: "reduce", forcedColors: media === "forced" ? "active" : "none" });
      signal?.throwIfAborted();
      if (mode === "acceptance") {
        context.setDefaultTimeout(5000);
        context.on("page", candidate => {
          candidate.on("pageerror", error => errors.push(error.message));
        });
      }
      const page = await context.newPage();
      if (mode !== "acceptance") page.on("pageerror", (error) => errors.push(error.message));
      const capture = async (label, target = page) => {
        const screenshot = await publishScreenshot(outputRoot, await target.screenshot({ fullPage: false }));
        const key = path.relative(repositoryRoot, screenshot.file);
        dependencies[key] = screenshot.sha256;
        screenshots.push({ label, path: key, sha256: screenshot.sha256 });
      };
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === server.origin) {
          let key = decodeURIComponent(url.pathname).replace(/^\//u, "");
          if (key.endsWith("/")) key += "index.html";
          dependencies[key] = await resourceHash(key);
          const body = await snapshot.bytes(key);
          if (body !== null && key.endsWith(".html") && route.request().isNavigationRequest()) documentAccounting.servedHtml();
          const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
          return route.fulfill({ status: body === null ? 404 : 200, body: body ?? "Missing local source", contentType: types[path.extname(key)] ?? "application/octet-stream" });
        }
        if (url.hostname === "iframes.vik.guru") {
          let key = decodeURIComponent(url.pathname).replace(/^\/v1\//u, "");
          if (key.endsWith("/")) key += "index.html";
          const bytes = packageFiles.get(key);
          dependencies[`package:${key}`] = bytes ? digest(bytes) : null;
          if (bytes && key.endsWith(".html") && route.request().isNavigationRequest()) documentAccounting.servedHtml();
          if (bytes) return route.fulfill({ status: 200, body: bytes, contentType: key.endsWith(".html") ? "text/html" : key.endsWith(".js") ? "text/javascript" : key.endsWith(".css") ? "text/css" : key.endsWith(".json") ? "application/json" : "application/octet-stream" });
          errors.push("Declared package resource missing");
          return route.fulfill({ status: 404, body: "Missing local package asset" });
        }
        return route.fulfill({ status: 204, body: "" });
      });
        if (media === "print") await page.emulateMedia({ media: "print" });
        const response = await page.goto(`${server.origin}/${parent ? family.parent : variant === "projection" ? family.projection : family.source}`, { waitUntil: "load", timeout: 15000 });
        assert.equal(response?.status(), 200, "The declared local document returns HTTP 200");
        await observeDocument(page.mainFrame());
        let frame = page.mainFrame();
        let geometry = null;
        if (parent) {
          const element = await page.locator(`iframe[src*="${family.alias}"]`).elementHandle({ timeout: 5000 });
          assert(element, "Declared iframe exists");
          await element.scrollIntoViewIfNeeded();
          frame = await element.contentFrame();
          assert(frame, "Declared iframe has a browsing context");
          await frame.waitForLoadState("load");
          await frame.waitForSelector("body", { state: "attached" });
          await observeDocument(frame);
          geometry = await element.evaluate((iframe) => ({ frameWidth: iframe.getBoundingClientRect().width,
            frameClient: iframe.clientWidth, parentContent: iframe.parentElement.clientWidth, outerWidth: innerWidth }));
        }
        if (enlarged) await frame.addStyleTag({ content: "html{font-size:200% !important}" });
        if (geometry && mode === "acceptance") geometry.childViewport = await frame.evaluate(() => ({
          width: innerWidth, clientWidth: document.documentElement.clientWidth, pageWidth: document.documentElement.scrollWidth,
        }));
        const result = journey ? await runFocusedAcceptance({ journey, frame, page, context, origin: server.origin, capture, observeDocument })
          : await inspect(frame, family, media !== "print", script);
        const observation = journey
          ? { id, ...result, attempted: true, standing: errors.length ? "review" : result.standing, errors, geometry, width, variant, media, script, parent, screenshots }
          : { id, ...tableCaseVerdict(result, errors), errors, geometry, ...result };
        const record = { id, signature, dependencies, result: observation };
        await publishTableObservation(checkpoints, record, async () => {
          if (!journey && width === 390 && media === "screen" && script && !enlarged) {
            const screenshot = await publishScreenshot(outputRoot, await page.screenshot({ fullPage: true }));
            dependencies[path.relative(repositoryRoot, screenshot.file)] = screenshot.sha256;
          }
          await closeContext();
          if (journey) assertAcceptanceRecord(record, plannedCases.get(id));
          assert(await snapshot.agrees(dependencies, true), "Observed inputs and artifacts remain at their admitted identity");
        }, { signal });
        records.push(record);
        await persist(observation);
        return observation;
      } catch (error) {
        const cleanupErrors = await collectCleanupErrors([closeContext]);
        const result = { id, standing: "incomplete", attempted: true, error: errorText(error),
          cleanupErrors: cleanupErrors.map(errorText), screenshots };
        await persist(result);
        return result;
      }
    };
    signal?.throwIfAborted();
    if (mode === "acceptance") {
      stoppedAfterCase = await runAcceptanceCases(campaign.cases,
        ({ family, width, ...options }) => perform(family, width, options), persist);
    } else {
      for (const { family, width, ...options } of campaign.cases) {
        signal?.throwIfAborted();
        await perform(family, width, options);
      }
    }
    stages.executionMilliseconds = performance.now() - executionStart;
    const cleanupErrors = await cleanup();
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Campaign resource cleanup failed.");
    signal?.throwIfAborted();
    const publicationStart = performance.now();
    const currentPackage = records.some(({ dependencies }) => Object.keys(dependencies).some((key) => key.startsWith("package:")))
      ? (await createAggregatePackagePlan()).outputFiles : new Map();
    const validateRecord = async (record) => {
      const { dependencies } = record;
      if (mode === "acceptance") assertAcceptanceRecord(record, plannedCases.get(record.id));
      if (!await snapshot.agrees(dependencies, true)) return false;
      for (const [key, hash] of Object.entries(dependencies)) {
        if (key.startsWith("package:")) {
          const bytes = currentPackage.get(key.slice(8));
          if (!bytes || digest(bytes) !== hash) return false;
        }
      }
      signal?.throwIfAborted();
      assert.equal(record.result.errors?.length ?? 0, 0, "Final campaign telemetry must be clear before publication");
      return true;
    };
    signal?.throwIfAborted();
    if (records.length === campaign.expected.length) {
      assert(!cases.some(item => item.standing === "incomplete"), "An incomplete attempt cannot publish a full completion");
      completion = await publishCampaign(outputRoot, campaign.expected, records, validateRecord,
        { definition, started, scope: { mode, familyId, caseId } });
    } else {
      // Incomplete populations keep their checkpoints but never publish a full completion.
      for (const record of records) assert(await validateRecord(record), "Completed case inputs and artifacts remain current");
    }
    stages.publicationMilliseconds = performance.now() - publicationStart;
  } catch (error) {
    executionError = errorText(error);
    process.exitCode = 1;
  } finally {
    const cleanupErrors = await cleanup();
    const ended = Date.now();
    const counts = invocationCounts(cases, attemptedCaseIds, reusedCaseIds, campaign.expected);
    summary = { observationVersion, definition, mode, familyId, caseId, expectedCases: campaign.expected.length,
      browserLaunches, ...documentAccounting.snapshot(), startedAt: new Date(started).toISOString(), endedAt: new Date(ended).toISOString(),
      stoppedAfterCase, populationComplete: records.length === campaign.expected.length,
      ...counts, completedCases: records.length,
      completion, executionError, cleanupErrors: cleanupErrors.map(errorText), cancelled: signal?.aborted ?? false,
      stages, hashing: snapshot.metrics, cases: cases.length, elapsedSeconds: (ended - started) / 1000,
      pass: cases.filter((item) => item.standing === "pass").length,
      review: cases.filter((item) => item.standing === "review").length,
      incomplete: cases.filter((item) => item.standing === "incomplete").length };
    const reportErrors = await collectCleanupErrors([
      () => fs.writeFile(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2) + "\n"),
      () => fs.appendFile(path.join(outputRoot, "attempts.jsonl"), JSON.stringify(summary) + "\n"),
    ]);
    if (reportErrors.length) {
      summary.reportErrors = reportErrors.map(errorText);
      for (const error of reportErrors) console.error(error);
    }
    console.log(JSON.stringify(summary));
    if (summary.executionError || cleanupErrors.length || reportErrors.length || summary.cancelled
        || !completion || summary.incomplete || (mode !== "discovery" && summary.review)) process.exitCode = 1;
  }
  return summary;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(name);
    if (index < 0) return fallback;
    const value = args[index + 1];
    assert(value && !value.startsWith("--"), `${name} requires a value`);
    return value;
  };
  const controller = new AbortController();
  const interrupt = () => controller.abort(new Error("Campaign cancelled by SIGINT."));
  const terminate = () => controller.abort(new Error("Campaign cancelled by SIGTERM."));
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  try {
    await runCampaign({ mode: option("--mode", "focused"), familyId: option("--family", "all"), output: option("--output", ".visual-runs/table-repairs/epoch-01"), resume: args.includes("--resume"), caseId: option("--case", null), planOnly: args.includes("--plan"), signal: controller.signal });
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", terminate);
  }
}
