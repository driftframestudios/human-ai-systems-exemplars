import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { observeTableReading } from "../../../tools/table-reading-observer.mjs";
import { atomicJson, digest, openCheckpoints, publishObservation } from "../../../tools/observation-checkpoint.mjs";
import { inputSnapshot, publishCampaign, publishScreenshot } from "../../../tools/evidence-campaign.mjs";
import { createAggregatePackagePlan } from "../../../tools/package-v1-iframe-routes.mjs";
import { planCases } from "./cases.mjs";
import { bindScreenshot, commitCoreEdit, validateRecordArtifacts } from "./contracts.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  assert(args[index + 1] && !args[index + 1].startsWith("--"), `${name} needs a value`);
  return args[index + 1];
};
const cases = planCases({ family: option("--family", "all"), combined: args.includes("--combined"), caseId: option("--case", null) });
const plannedCases = new Map(cases.map(item => [item.id, item]));
if (args.includes("--plan")) {
  console.log(JSON.stringify({ cases: cases.map(({ id }) => id), browserLaunches: 0, visits: 0 }));
} else {
  await run();
}

async function keyboardReach(frame, tables) {
  const results = [];
  for (const table of tables.filter(item => item.visible && item.scroll?.overflow)) {
    const handle = await frame.locator("table").nth(table.tableIndex).evaluateHandle(element => {
      let owner = element.parentElement;
      while (owner && !["auto", "scroll"].includes(getComputedStyle(owner).overflowX)) owner = owner.parentElement;
      return owner;
    });
    const owner = handle.asElement();
    try {
      if (!table.scroll.focusable || !table.scroll.name) {
        results.push({ tableIndex: table.tableIndex, standing: "review", reason: "unnamed or unfocusable scroll owner" });
        continue;
      }
      await owner.evaluate(element => { element.scrollLeft = 0; element.focus(); });
      await owner.press("ArrowRight");
      await frame.waitForFunction(element => element.scrollLeft > 0, owner, { timeout: 2000 });
      // Exercise the final keyboard segment as well as the start of the scroll.
      await owner.evaluate(element => { element.scrollLeft = Math.max(0, element.scrollWidth - element.clientWidth - 24); });
      await owner.press("ArrowRight");
      await frame.waitForFunction(element => element.scrollWidth - element.clientWidth - element.scrollLeft < 2, owner, { timeout: 2000 });
      results.push(await owner.evaluate((element, tableIndex) => {
        const last = element.querySelector("table").rows[0].lastElementChild;
        const focused = document.activeElement === element;
        const finalColumnRight = last.getBoundingClientRect().right;
        const ownerRight = element.getBoundingClientRect().right;
        return { tableIndex, focused, finalColumnRight, ownerRight,
          standing: focused && finalColumnRight <= ownerRight + 2 ? "pass" : "review" };
      }, table.tableIndex));
    } finally { await handle.dispose(); }
  }
  return results;
}

async function nativeRecords(frame) {
  return frame.locator("table").evaluateAll(tables => tables.map(table => ({
    caption: table.caption?.textContent.trim(),
    headers: [...table.querySelectorAll('thead th[scope="col"]')].map(cell => ({ text: cell.textContent.trim(), label: cell.dataset.label })),
    rows: [...table.tBodies].flatMap(body => [...body.rows]).map(row => ({
      identity: row.querySelector('th[scope="row"]')?.textContent.trim(),
      identityColumn: [...row.cells].findIndex(cell => cell.matches('th[scope="row"]')),
      key: row.dataset.recordId, label: row.dataset.label,
      emptyState: row.cells.length === 1 && row.cells[0].colSpan > 1,
      fields: [...row.cells].map(cell => ({ tag: cell.tagName, label: cell.dataset.label, value: cell.textContent.trim() })),
    })),
  })));
}

async function interact(frame, family) {
  if (family.kind === "core") {
    const fingerprint = await frame.evaluate(api => window[api].promptCapsuleFingerprint(), family.api);
    const reveal = frame.locator('table button[aria-expanded="false"], table .reveal-btn').first();
    if (await reveal.count()) await reveal.click();
    let input = frame.locator(family.edit).first();
    if (!await input.count() && family.id === "recovery") {
      await frame.locator('#routingTable button[data-id]').first().click();
      input = frame.locator(family.edit).first();
    }
    const before = await input.inputValue();
    const literal = 'Ren\u00e9e " <probe> N\u00b7m Pa\u00b7s 0 \u00b5g/L';
    const editedInput = await commitCoreEdit(frame, family, literal);
    assert.equal(await editedInput.inputValue(), literal, "committed edit is read from the current input");
    if (family.id === "alignment") assert(await editedInput.evaluate(element => element === document.activeElement), "live name projection preserves input focus");
    assert(await frame.locator('table tr[data-label]').evaluateAll((rows, value) => rows.some(row => row.dataset.label.includes(value)), literal), "row context preserves escaped literal input");
    assert.equal(await frame.locator("table probe").count(), 0, "markup-shaped user text remains data");
    assert(await frame.evaluate(({ api, literal }) => {
      const contains = value => value === literal || (value && typeof value === "object" && Object.values(value).some(contains));
      return !!contains(window[api].getState());
    }, { api: family.api, literal }));
    const restoredInput = await commitCoreEdit(frame, family, before);
    assert.equal(await restoredInput.inputValue(), before, "restored edit is committed and reacquired");
    assert.equal(await frame.evaluate(api => window[api].promptCapsuleFingerprint(), family.api), fingerprint, "restored edit retains represented state");
    return { literalEscaping: "pass", restoredState: "pass", disclosure: await reveal.count() ? "exercised" : "not-present" };
  }
  if (family.id === "hiring") {
    const results = [];
    for (const id of ["scenario-filter", "route-filter", "group-filter", "standing-filter"]) {
      const select = frame.locator("#" + id);
      const original = await select.inputValue();
      const values = await select.locator("option").evaluateAll(options => options.filter(option => !option.disabled).map(option => option.value));
      for (const value of values.filter(value => value !== original).slice(0, 1)) {
        await select.selectOption(value);
        assert.equal(await frame.locator("#" + id).inputValue(), value);
        const tables = await nativeRecords(frame);
        assert.equal(tables[0].headers.length, 8);
        results.push({ filter: id, value, records: tables[0].rows.length, empty: tables[0].rows.some(row => row.emptyState) });
      }
      await frame.locator("#" + id).selectOption(original);
    }
    return { filters: results };
  }
  return null;
}

async function run() {
  const output = path.resolve(root, option("--output", ".visual-runs/core-followthrough-20261003/closure"));
  assert(output.startsWith(path.join(root, ".visual-runs") + path.sep));
  await fs.mkdir(output, { recursive: true });
  const lock = await fs.open(path.join(output, "campaign.lock"), "wx");
  await lock.close();
  const store = await openCheckpoints(path.join(output, "checkpoints"));
  const packageFiles = new Map();
  const snapshot = inputSnapshot(root, packageFiles);
  const definitionFiles = ["tests/tables/core-followthrough/browser.mjs", "tests/tables/core-followthrough/cases.mjs", "tests/tables/core-followthrough/contracts.mjs", "tools/table-reading-observer.mjs", "tools/observation-checkpoint.mjs", "tools/evidence-campaign.mjs", "package-lock.json"];
  const definitionParts = await snapshot.fingerprints(definitionFiles);
  const executable = await fs.stat(chromium.executablePath());
  const definition = digest(JSON.stringify([definitionParts, process.version, process.platform, executable.size, executable.mtimeMs]));
  const records = [];
  const metrics = { browserLaunches: 0, visits: 0, navigationRequests: 0, reused: 0, completed: 0 };
  let browser;
  try {
    if (cases.some(item => ["package", "parent"].includes(item.variant))) {
      for (const [key, value] of (await createAggregatePackagePlan()).outputFiles) packageFiles.set(key, Buffer.from(value));
    }
    await atomicJson(path.join(output, "plan.json"), { definition, cases: cases.map(({ id }) => id) });
    for (const item of cases) {
      const signature = digest(JSON.stringify([definition, item]));
      const cached = args.includes("--resume") && await store.readRecord(item.id, signature, deps => snapshot.agrees(deps));
      if (cached && await validateRecordArtifacts(cached, item, root, snapshot)) { records.push(cached); metrics.reused++; continue; }
      if (!browser) { browser = await chromium.launch(); metrics.browserLaunches++; }
      const { family, width, mode, variant } = item;
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: mode !== "static" });
      const page = await context.newPage();
      const errors = [];
      const dependencies = { ...definitionParts, ...await snapshot.fingerprints([family.source, ...(variant === "projection" ? [family.projection] : []), ...(variant === "parent" ? [family.parent] : [])]) };
      page.on("pageerror", error => errors.push(error.message));
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        let key;
        if (url.hostname === "followthrough.test") key = decodeURIComponent(url.pathname).slice(1);
        else if (url.hostname === "iframes.vik.guru" && ["package", "parent"].includes(variant)) key = "package:" + decodeURIComponent(url.pathname).replace(/^\/v1\//u, "");
        else return route.fulfill({ status: 204, body: "" });
        if (key.endsWith("/")) key += "index.html";
        const bytes = await snapshot.bytes(key);
        if (bytes === null) { errors.push("Missing local resource: " + key); return route.fulfill({ status: 404, body: "" }); }
        dependencies[key] = await snapshot.hash(key);
        if (route.request().isNavigationRequest()) metrics.navigationRequests++;
        const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
        return route.fulfill({ status: 200, body: bytes, contentType: types[path.extname(key)] || "application/octet-stream" });
      });
      try {
        if (mode === "print") await page.emulateMedia({ media: "print" });
        if (mode === "forced") await page.emulateMedia({ forcedColors: "active" });
        const url = variant === "package" ? family.alias : "http://followthrough.test/" + (variant === "parent" ? family.parent : variant === "projection" ? family.projection : family.source);
        await page.goto(url, { waitUntil: "load" });
        metrics.visits++;
        let frame = page;
        if (variant === "parent") {
          const iframe = page.locator('iframe[src="' + family.alias + '"]');
          await iframe.scrollIntoViewIfNeeded();
          frame = await (await iframe.elementHandle()).contentFrame();
          await frame.waitForLoadState("load");
        }
        if (mode === "text200") await frame.addStyleTag({ content: "html { font-size: 200% !important; }" });
        const initial = await frame.evaluate(observeTableReading);
        await frame.locator("details").evaluateAll(elements => elements.forEach(element => { element.open = true; }));
        const tables = await frame.evaluate(observeTableReading);
        assert.equal(tables.length, mode === "static" && family.kind === "core" ? family.staticTables : family.tables, "declared table population");
        const native = await nativeRecords(frame);
        if (family.kind === "core" && mode !== "static") {
          for (const table of native) {
            assert(table.caption && table.headers.length, "native caption and column headers");
            for (const row of table.rows.filter(row => !row.emptyState)) {
              assert(row.identity && row.label, "native row identity and supplemental context");
              assert.equal(row.fields.length, table.headers.length, "record shape remains complete");
            }
          }
        }
        if (family.id === "hiring") for (const table of native) {
          assert.equal(table.headers.length, 8);
          for (const row of table.rows.filter(row => !row.emptyState)) {
            assert.equal(row.fields.length, 8);
            assert.deepEqual(row.fields.map(field => field.label), table.headers.map(header => header.label), "native/header/cell label parity");
          }
        }
        let targeted = null;
        if (family.id === "distributed") {
          targeted = await frame.locator("table.table--ledger tbody tr").evaluateAll(rows => rows.map(row => ({
            identityColumn: [...row.cells].findIndex(cell => cell.matches('th[scope="row"]')),
            dateTag: row.cells[0].tagName, date: row.cells[0].textContent.trim(),
            dateLines: [...row.cells[0].querySelectorAll("time")].map(time => { const range = document.createRange(); range.selectNodeContents(time); return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size; }),
          })));
          assert(targeted.some(row => row.date === "2026-07-23"));
          assert(targeted.every(row => row.identityColumn === 1 && row.dateTag === "TD" && row.dateLines.every(lines => lines === 1)), "decision is the offset row header; dates stay intact data");
        }
        if (family.id === "narrative") {
          const text = await frame.locator("body").textContent();
          for (const word of ["Novartis", "biopharma", "interoperability"]) assert(text.includes(word));
        }
        const keyboard = mode === "screen" && width === 390 ? await keyboardReach(frame, tables) : [];
        const interactions = mode === "screen" && width === 390 ? await interact(frame, family) : null;
        const viewport = await frame.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, pageWidth: document.documentElement.scrollWidth }));
        const fragments = tables.flatMap(table => table.fragments);
        const wordFragments = fragments.filter(fragment => fragment.kind === "word").length;
        const numericFragments = fragments.filter(fragment => fragment.kind === "numeric").length;
        const reasons = [];
        if (wordFragments || numericFragments) reasons.push("fragmentation-review");
        if (keyboard.some(value => value.standing !== "pass")) reasons.push("keyboard-review");
        if (viewport.pageWidth > viewport.clientWidth + 1) reasons.push("page-overflow-review");
        if (errors.length) reasons.push("runtime-resource-review");
        const result = { id: item.id, family: family.id, kind: family.kind, standing: reasons.length ? "review" : "pass", reasons,
          browser: browser.version(), width, mode, variant, viewport, initialHidden: initial.filter(table => !table.visible).length,
          wordFragments, numericFragments, identifierFragments: fragments.filter(fragment => fragment.kind === "identifier-review").length,
          tables, native, targeted, keyboard, interactions, errors, screenshots: [] };
        const record = { id: item.id, signature, dependencies, result };
        await publishObservation(store, record, async () => {
          if (width === 390 && mode === "screen") {
            result.accessibility = await frame.locator("table").first().ariaSnapshot();
            bindScreenshot(record, await publishScreenshot(output, await page.screenshot()), root);
          }
          assert(await validateRecordArtifacts(record, item, root, snapshot), "checkpoint case, sources and required image bytes agree");
        });
        records.push(record); metrics.completed++;
        await atomicJson(path.join(output, "attempt.json"), { ...metrics, lastCase: item.id });
        console.log(JSON.stringify({ case: item.id, standing: result.standing, wordFragments, numericFragments, pageOverflow: viewport.pageWidth - viewport.clientWidth }));
      } finally { await context.close(); }
    }
    const completion = await publishCampaign(output, cases.map(({ id }) => id), records, record => validateRecordArtifacts(record, plannedCases.get(record.id), root, snapshot), { ...metrics, sourceBinding: "served input bytes and per-case dependency hashes including required screenshots", liveDelivery: "unobserved", printPagination: "unobserved" });
    await atomicJson(path.join(output, "summary.json"), { ...metrics, completion, cases: records.map(record => ({ id: record.id, standing: record.result.standing, reasons: record.result.reasons, wordFragments: record.result.wordFragments, numericFragments: record.result.numericFragments })) });
    console.log(JSON.stringify({ ...metrics, completion }));
  } finally {
    await browser?.close();
    await fs.rm(path.join(output, "campaign.lock"), { force: true });
  }
}
