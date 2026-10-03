import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { startStaticServer, repositoryRoot } from "./core-architecture-browser-helper.mjs";
import { createAggregatePackagePlan } from "./package-v1-iframe-routes.mjs";
import { observeTableReading, observeControlReading, tableCaseVerdict } from "./table-reading-observer.mjs";
import { atomicJson, digest, openCheckpoints, publishObservation } from "./observation-checkpoint.mjs";
import { executionPlan, inputSnapshot, observationVersion, publishCampaign, publishScreenshot } from "./evidence-campaign.mjs";

export const harnessSources = [
  "tools/table-reading-contract.mjs", "tools/table-reading-observer.mjs", "tools/observation-checkpoint.mjs",
  "tools/evidence-campaign.mjs",
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

export async function runCampaign({ mode = "focused", familyId = "all", output = ".visual-runs/table-repairs/epoch-01", resume = false, caseId = null, planOnly = false } = {}) {
  const campaign = executionPlan(families, { mode, familyId, caseId });
  if (planOnly) { console.log(JSON.stringify({ observationVersion, ...campaign })); return campaign; }
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
  let navigations = 0;
  let executionError = null;
  let completion = null;
  let browserLaunches = 0;
  let reused = 0;
  const started = Date.now();
  const lockPath = path.join(outputRoot, "campaign.lock");
  const lock = await fs.open(lockPath, "wx");
  await lock.writeFile(JSON.stringify({ pid: process.pid, started, definition }) + "\n");
  await lock.close();
  const persist = async (result) => {
    cases.push(result);
    await fs.appendFile(path.join(outputRoot, "cases.jsonl"), JSON.stringify(result) + "\n");
    console.log(JSON.stringify({ case: result.id, standing: result.standing, wordFragments: result.wordFragments,
      numericFragments: result.numericFragments, controlFragments: result.controlFragments }));
  };
  let browser;
  const getBrowser = async () => {
    if (!browser) { browser = await chromium.launch(); browserLaunches += 1; }
    return browser;
  };
  let server;
  try {
    await atomicJson(path.join(outputRoot, "plan.json"), { observationVersion, definition, requested: campaign.expected, started });
    const executionStart = performance.now();
    const savedFixture = resume && await checkpoints.readRecord("observer-fixtures", definition, (deps) => snapshot.agrees(deps));
    if (savedFixture) { cases.push(savedFixture.result); records.push(savedFixture); reused += 1; }
    else {
      const fixture = { id: "observer-fixtures", standing: "pass", result: await checkFixtures(await getBrowser()) };
      await persist(fixture);
      const record = { id: fixture.id, signature: definition, dependencies: definitionParts, result: fixture };
      await checkpoints.write(record.id, record.signature, record.dependencies, fixture);
      records.push(record);
    }
    if (campaign.cases.length) {
      server = await startStaticServer();
      const plan = await createAggregatePackagePlan();
      for (const [key, bytes] of plan.outputFiles) packageFiles.set(key, Buffer.from(bytes));
    }
    const perform = async (family, width, { variant = "source", media = "screen", script = true, enlarged = false, parent = false } = {}) => {
      const id = `${family.id}-${variant}-${width}-${media}-${script ? "script" : "static"}${enlarged ? "-text200" : ""}`;
      if (caseId && id !== caseId) return;
      const signature = digest(JSON.stringify([definition, family, width, variant, media, script, enlarged, parent]));
      const resourceHash = (key) => snapshot.hash(key);
      const saved = resume && await checkpoints.readRecord(id, signature, async (dependencies) => {
        if (!dependencies || !Object.keys(dependencies).length) return false;
        for (const [key, hash] of Object.entries(dependencies)) if (await resourceHash(key) !== hash) return false;
        return true;
      });
      if (saved) { cases.push(saved.result); records.push(saved); reused += 1; console.log(JSON.stringify({ case: id, standing: "reused", observation: saved.result.standing })); return; }
      const owners = [family.source, parent ? family.parent : variant === "projection" ? family.projection : null].filter(Boolean);
      const dependencies = { ...definitionParts, ...await snapshot.fingerprints(owners) };
      const context = await (await getBrowser()).newContext({ viewport: { width, height: 1000 }, javaScriptEnabled: script,
        reducedMotion: "reduce", forcedColors: media === "forced" ? "active" : "none" });
      const errors = [];
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === server.origin) {
          let key = decodeURIComponent(url.pathname).replace(/^\//u, "");
          if (key.endsWith("/")) key += "index.html";
          dependencies[key] = await resourceHash(key);
          if (route.request().isNavigationRequest()) navigations += 1;
          const body = await snapshot.bytes(key);
          const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
          return route.fulfill({ status: body === null ? 404 : 200, body: body ?? "Missing local source", contentType: types[path.extname(key)] ?? "application/octet-stream" });
        }
        if (url.hostname === "iframes.vik.guru") {
          let key = decodeURIComponent(url.pathname).replace(/^\/v1\//u, "");
          if (key.endsWith("/")) key += "index.html";
          const bytes = packageFiles.get(key);
          dependencies[`package:${key}`] = bytes ? digest(bytes) : null;
          if (route.request().isNavigationRequest()) navigations += 1;
          if (bytes) return route.fulfill({ status: 200, body: bytes, contentType: key.endsWith(".html") ? "text/html" : key.endsWith(".js") ? "text/javascript" : key.endsWith(".css") ? "text/css" : key.endsWith(".json") ? "application/json" : "application/octet-stream" });
          errors.push("Declared package resource missing");
          return route.fulfill({ status: 404, body: "Missing local package asset" });
        }
        return route.fulfill({ status: 204, body: "" });
      });
      try {
        if (media === "print") await page.emulateMedia({ media: "print" });
        const response = await page.goto(`${server.origin}/${parent ? family.parent : variant === "projection" ? family.projection : family.source}`, { waitUntil: "load", timeout: 15000 });
        assert.equal(response?.status(), 200, "The declared local document returns HTTP 200");
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
          geometry = await element.evaluate((iframe) => ({ frameWidth: iframe.getBoundingClientRect().width,
            frameClient: iframe.clientWidth, parentContent: iframe.parentElement.clientWidth, outerWidth: innerWidth }));
        }
        if (enlarged) await frame.addStyleTag({ content: "html{font-size:200% !important}" });
        const result = await inspect(frame, family, media !== "print", script);
        const observation = { id, ...tableCaseVerdict(result, errors), errors, geometry, ...result };
        const record = { id, signature, dependencies, result: observation };
        await publishObservation(checkpoints, record, async () => {
          if (width === 390 && media === "screen" && script && !enlarged) {
            const screenshot = await publishScreenshot(outputRoot, await page.screenshot({ fullPage: true }));
            dependencies[path.relative(repositoryRoot, screenshot.file)] = screenshot.sha256;
          }
          assert(await snapshot.agrees(dependencies, true), "Observed inputs and artifacts remain at their admitted identity");
        });
        records.push(record);
        await persist(observation);
      } catch (error) {
        await persist({ id, standing: "incomplete", error: error.message });
      } finally { await context.close(); }
    };
    for (const { family, width, ...options } of campaign.cases) await perform(family, width, options);
    stages.executionMilliseconds = performance.now() - executionStart;
    const publicationStart = performance.now();
    const currentPackage = records.some(({ dependencies }) => Object.keys(dependencies).some((key) => key.startsWith("package:")))
      ? (await createAggregatePackagePlan()).outputFiles : new Map();
    completion = await publishCampaign(outputRoot, campaign.expected, records, async ({ dependencies }) => {
      if (!await snapshot.agrees(dependencies, true)) return false;
      for (const [key, hash] of Object.entries(dependencies)) {
        if (key.startsWith("package:")) {
          const bytes = currentPackage.get(key.slice(8));
          if (!bytes || digest(bytes) !== hash) return false;
        }
      }
      return true;
    }, { definition, started, scope: { mode, familyId, caseId } });
    stages.publicationMilliseconds = performance.now() - publicationStart;
  } catch (error) {
    executionError = error.message;
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
    const summary = { observationVersion, definition, mode, familyId, caseId, expectedCases: campaign.expected.length, browserLaunches, documentNavigations: navigations,
      completion, executionError, stages, hashing: snapshot.metrics, cases: cases.length, reused, newCases: cases.length - reused, elapsedSeconds: (Date.now() - started) / 1000,
      pass: cases.filter((item) => item.standing === "pass").length,
      review: cases.filter((item) => item.standing === "review").length,
      incomplete: cases.filter((item) => item.standing === "incomplete").length };
    await fs.writeFile(path.join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    await fs.appendFile(path.join(outputRoot, "attempts.jsonl"), JSON.stringify(summary) + "\n");
    await fs.rm(lockPath);
    console.log(JSON.stringify(summary));
    if (summary.executionError || !completion || summary.incomplete || (mode !== "discovery" && summary.review)) process.exitCode = 1;
  }
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
  await runCampaign({ mode: option("--mode", "focused"), familyId: option("--family", "all"), output: option("--output", ".visual-runs/table-repairs/epoch-01"), resume: args.includes("--resume"), caseId: option("--case", null), planOnly: args.includes("--plan") });
}
