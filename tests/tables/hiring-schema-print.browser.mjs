import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium, expect } from "@playwright/test";
import { monitor, assertTelemetry } from "../../tools/core-architecture-browser-helper.mjs";
import { atomicJson, digest, openCheckpoints, publishObservation } from "../../tools/observation-checkpoint.mjs";
import { inputSnapshot, publishScreenshot } from "../../tools/evidence-campaign.mjs";
import { withCampaignLock, fulfillCampaignRequest } from "./core-followthrough/runtime.mjs";
import { publishPrintPDF, inspectPrintPDF } from "./core-followthrough/closure.mjs";
import { printPDFOptions } from "./core-followthrough/contracts.mjs";
import { assertPrintedSchema } from "./hiring-schema-print-contract.mjs";

// The package and suite routes place managed Python 3.12 with pinned PyMuPDF on PATH.
const python = "python";
const execute = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, ".visual-runs/hiring-schema-print");
const source = "collaboration/hiring-surfaces-talent-agent-intake/index.html";
const definitions = [source, "tests/tables/hiring-schema-print.browser.mjs", "tests/tables/hiring-schema-print-contract.mjs", "tools/core-architecture-browser-helper.mjs", "tools/attribution-contract.mjs", "attribution.yml", "tools/observation-checkpoint.mjs", "tools/evidence-campaign.mjs", "tests/tables/core-followthrough/runtime.mjs", "tests/tables/core-followthrough/closure.mjs", "tests/tables/core-followthrough/contracts.mjs", "package-lock.json"];
const print = { paper: "Letter", orientation: "landscape", marginInches: 0.5, preferCSSPageSize: true };
const item = { id: "hiring-expanded-schema-letter-landscape", width: 1280, print };
const extraction = `import json, pymupdf, sys
with pymupdf.open(sys.argv[1]) as document:
    pages = [{"text": page.get_text(), "words": page.get_text("words")} for page in document]
print(json.dumps({"pages": pages}))`;

await withCampaignLock(output, async resources => {
  const snapshot = inputSnapshot(root), store = await openCheckpoints(path.join(output, "checkpoints"));
  const executable = await fs.stat(chromium.executablePath());
  const pythonIdentity = (await execute(python, ["-c", "import pymupdf, sys; print(sys.version); print(pymupdf.VersionBind)"], { timeout: 10000 })).stdout.trim();
  const dependencies = { ...await snapshot.fingerprints(definitions) };
  const signature = digest(JSON.stringify([item, process.version, process.platform, executable.size, executable.mtimeMs, pythonIdentity, dependencies]));
  const cached = process.argv.includes("--resume") && await store.readRecord(item.id, signature, deps => snapshot.agrees(deps, true));
  if (cached?.result?.standing === "pass") { console.log(item.id + ": reused"); return; }
  resources.browser = await chromium.launch();
  const context = await resources.browser.newContext({ viewport: { width: item.width, height: 900 } });
  const page = await context.newPage(), telemetry = monitor(page), errors = [], externalSubstitutions = [];
  page.setDefaultTimeout(5000);
  await context.route("**/*", route => fulfillCampaignRequest(route, { variant: "source", snapshot, dependencies,
    metrics: { navigationRequests: 0 }, errors, externalSubstitutions }));
  try {
    await page.goto("http://followthrough.test/" + source, { waitUntil: "load" });
    const schema = page.locator("#schema-output"), disclosure = page.locator("details:has(#schema-output)");
    assert.equal(await disclosure.evaluate(element => element.open), false, "schema starts in its native collapsed disclosure");
    await disclosure.locator("summary").click();
    const expected = await page.locator("#intakeInspectionSchema").evaluate(element => JSON.stringify(JSON.parse(element.textContent), null, 2));
    assert.equal(JSON.parse(expected).$id, "urn:context-canvas:schemas:talent-intake-inspection:v1");
    assert.equal(await schema.textContent(), expected, "visible schema matches its source-owned contract");
    const screen = await schema.evaluate(element => ({ height: element.clientHeight, scroll: element.scrollHeight,
      maxHeight: getComputedStyle(element).maxHeight, overflow: getComputedStyle(element).overflow }));
    assert.equal(screen.overflow, "auto"); assert(screen.scroll > screen.height, "screen keeps local scrolling");
    await page.emulateMedia({ media: "print" });
    const printed = await schema.evaluate(element => ({ height: element.clientHeight, scroll: element.scrollHeight,
      width: element.clientWidth, scrollWidth: element.scrollWidth, maxHeight: getComputedStyle(element).maxHeight,
      overflow: getComputedStyle(element).overflow, whiteSpace: getComputedStyle(element).whiteSpace }));
    assert.equal(printed.maxHeight, "none"); assert.equal(printed.overflow, "visible");
    assert.equal(printed.whiteSpace, "pre-wrap"); assert(printed.scroll <= printed.height + 1);
    assert(printed.scrollWidth <= printed.width + 1, "JSON tokens wrap within the printable container");
    const pdf = await publishPrintPDF(output, await page.pdf(printPDFOptions(print)));
    dependencies[path.relative(root, pdf.file)] = pdf.sha256;
    const geometry = await inspectPrintPDF(pdf.file);
    assert(geometry.pages.every(value => value.widthPoints === 792 && value.heightPoints === 612), "existing Letter landscape geometry remains exact");
    const parsed = JSON.parse((await execute(python, ["-c", extraction, pdf.file], { timeout: 15000, maxBuffer: 2_000_000 })).stdout);
    const { schemaPages } = assertPrintedSchema(parsed.pages.map(value => value.text), expected);
    for (const pageNumber of schemaPages) {
        assert(parsed.pages[pageNumber - 1].words.length > 0, "schema continuation page carries readable text");
        for (const [left, top, right, bottom] of parsed.pages[pageNumber - 1].words) {
          assert(left >= 35 && right <= 757 && top >= 35 && bottom <= 577, "schema-page text stays within half-inch paper margins");
        }
    }
    assert(schemaPages.length > 1, "complete schema continues across physical pages");
    await page.emulateMedia({ media: "screen" });
    assert.equal(await schema.textContent(), expected, "printing preserves exact schema text");
    assert.deepEqual(await schema.evaluate(element => ({ height: element.clientHeight, scroll: element.scrollHeight,
      maxHeight: getComputedStyle(element).maxHeight, overflow: getComputedStyle(element).overflow })), screen);
    await disclosure.locator("summary").focus(); await page.keyboard.press("Enter");
    await expect(schema).toBeHidden(); await page.keyboard.press("Enter"); await expect(schema).toBeVisible();
    await disclosure.scrollIntoViewIfNeeded();
    const screenshot = await publishScreenshot(output, await page.screenshot());
    dependencies[path.relative(root, screenshot.file)] = screenshot.sha256;
    const result = { standing: "pass", screen, printed, pdf, geometry, schemaPages, screenshot, pythonIdentity,
      browser: resources.browser.version(), externalSubstitutions, checks: ["complete ordered PDF schema", "paper margins", "multi-page continuation", "screen scrolling", "native disclosure", "exact JSON preservation"] };
    await publishObservation(store, { id: item.id, signature, dependencies, result }, async () => {
      assert(await snapshot.agrees(dependencies, true), "source and artifacts agree at publication");
      assert.deepEqual(errors, []); assertTelemetry(telemetry);
    });
    await atomicJson(path.join(output, "summary.json"), result);
    console.log(JSON.stringify({ case: item.id, standing: "pass", pages: geometry.pageCount, schemaPages }));
  } finally { await context.close(); }
});
