import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { monitor, assertTelemetry } from "../../tools/core-architecture-browser-helper.mjs";
import { atomicJson, digest, openCheckpoints, publishObservation } from "../../tools/observation-checkpoint.mjs";
import { inputSnapshot, publishScreenshot } from "../../tools/evidence-campaign.mjs";
import { withCampaignLock, fulfillCampaignRequest } from "../tables/core-followthrough/runtime.mjs";
import { coreFamilies } from "../tables/core-followthrough/cases.mjs";
import { observeTableReading } from "../../tools/table-reading-observer.mjs";
import { observeLocalReach } from "../tables/core-followthrough/closure.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, ".visual-runs/recovery-import-containment");
const family = coreFamilies.find(item => item.id === "recovery");
const manifest = "core-architectures-chimeric-prototype-manifest-v0.1.json";
const definitions = ["tests/core-architectures/recovery-import.browser.mjs", "tools/core-architecture-browser-helper.mjs", "tools/attribution-contract.mjs", "attribution.yml", "tools/observation-checkpoint.mjs", "tools/evidence-campaign.mjs", "tools/table-reading-observer.mjs", "tests/tables/core-followthrough/runtime.mjs", "tests/tables/core-followthrough/cases.mjs", "tests/tables/core-followthrough/closure.mjs", "package-lock.json"];
const cases = [family.source, family.projection].flatMap((source, index) =>
  [[304, false], [320, false], [390, true]].map(([width, enlarged]) =>
    ({ id: `${index ? "projection" : "source"}-${width}-${enlarged ? "text200" : "normal"}`, source, width, enlarged })));

async function contained(page) {
  const bounds = await page.locator("#fileInput").evaluate(input => {
    const rect = input.getBoundingClientRect(), parent = input.parentElement.getBoundingClientRect();
    return { left: rect.left, right: rect.right, parentLeft: parent.left, parentRight: parent.right,
      client: document.documentElement.clientWidth, page: document.documentElement.scrollWidth };
  });
  assert(bounds.left >= bounds.parentLeft - 1 && bounds.right <= bounds.parentRight + 1, "file control fits its owning row");
  assert(bounds.page <= bounds.client + 1, "document remains contained");
  return bounds;
}

await withCampaignLock(output, async resources => {
  const snapshot = inputSnapshot(root), store = await openCheckpoints(path.join(output, "checkpoints"));
  const executable = await fs.stat(chromium.executablePath());
  const runtime = [process.version, process.platform, executable.size, executable.mtimeMs];
  const results = [];
  for (const item of cases) {
    const dependencies = { ...await snapshot.fingerprints([...definitions, family.source, family.projection,
      path.posix.join(path.posix.dirname(family.source), manifest), path.posix.join(path.posix.dirname(family.projection), manifest)]) };
    assert.equal(dependencies[family.source], dependencies[family.projection], "declared copies agree");
    for (const source of [family.source, family.projection]) {
      const bytes = await snapshot.bytes(source);
      const entries = JSON.parse((await snapshot.bytes(path.posix.join(path.posix.dirname(source), manifest))).toString()).prototypes;
      assert.equal(entries.find(entry => entry.file === path.posix.basename(source)).size_bytes, bytes.length);
    }
    const signature = digest(JSON.stringify([item, runtime, dependencies]));
    const cached = process.argv.includes("--resume") && await store.readRecord(item.id, signature, deps => snapshot.agrees(deps, true));
    if (cached?.result.standing === "pass") { results.push({ id: item.id, disposition: "reused" }); continue; }
    resources.browser ??= await chromium.launch();
    const context = await resources.browser.newContext({ viewport: { width: item.width, height: 900 } });
    const page = await context.newPage(), telemetry = monitor(page), errors = [], externalSubstitutions = [];
    page.setDefaultTimeout(5000);
    await context.route("**/*", route => fulfillCampaignRequest(route, { variant: "source", snapshot, dependencies,
      metrics: { navigationRequests: 0 }, errors, externalSubstitutions }));
    try {
      await page.goto("http://followthrough.test/" + item.source, { waitUntil: "load" });
      if (item.enlarged) await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      await page.locator("details").evaluateAll(elements => elements.forEach(element => { element.open = true; }));
      const bounds = await contained(page);
      // The preceding unconstrained control is a counterexample for this assertion.
      const previous = await page.addStyleTag({ content: "#fileInput { min-inline-size: auto; max-inline-size: none; inline-size: auto; }" });
      await assert.rejects(() => contained(page), /file control fits|document remains/);
      await previous.evaluate(element => element.remove());
      await contained(page);
      const accepted = await page.evaluate(() => window.recoveryRoutingAtlas.getState());
      const fixture = structuredClone(accepted);
      fixture.geometries[0].name = "Imported recovery boundary";
      const input = page.locator("#fileInput");
      await page.locator("#importBtn").focus();
      await page.keyboard.press("Tab");
      await expect(input).toBeFocused();
      const focus = await input.evaluate(element => ({ outline: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth }));
      assert(focus.outline !== "none" && parseFloat(focus.width) > 0, "keyboard focus has an outline");
      const chooser = page.waitForEvent("filechooser");
      await page.keyboard.press("Space");
      const filename = "recovery-review-with-a-meaningful-long-filename.json";
      await (await chooser).setFiles({ name: filename, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fixture)) });
      await expect(page.locator("#importNotice")).toContainText("Working atlas updated from validated JSON");
      await expect.poll(() => page.evaluate(() => window.recoveryRoutingAtlas.getState().geometries[0].name)).toBe(fixture.geometries[0].name);
      assert.equal(await input.evaluate(element => element.files[0].name), filename, "native filename retains its full value");
      await contained(page);
      const imported = await page.evaluate(() => window.recoveryRoutingAtlas.getState());
      for (const [name, body] of [["syntax.json", "{"], ["shape.json", '{"unexpected":true}']]) {
        await page.locator("#importNotice").evaluate(element => { element.textContent = ""; });
        await input.setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(body) });
        await expect(page.locator("#importNotice")).toContainText("Working Recovery Routing Atlas retained");
        assert.deepEqual(await page.evaluate(() => window.recoveryRoutingAtlas.getState()), imported, "rejected input preserves accepted state");
      }
      const tables = await page.evaluate(observeTableReading);
      assert.equal(tables.filter(table => table.visible).length, family.tables, "all expected tables are observed");
      assert.equal(tables.flatMap(table => table.fragments).filter(fragment => ["word", "numeric"].includes(fragment.kind)).length, 0);
      const reach = await observeLocalReach(page, page, tables);
      assert.equal(reach.length, family.tables, "each wide table has a local scroll journey");
      assert(reach.every(record => record.standing === "pass"), "keyboard and pointer journeys reach the last column");
      await input.scrollIntoViewIfNeeded();
      const screenshot = await publishScreenshot(output, await page.screenshot());
      dependencies[path.relative(root, screenshot.file)] = screenshot.sha256;
      const result = { standing: "pass", bounds, focus, reach, screenshot, browser: resources.browser.version(),
        checks: ["owned containment", "prior-style counterexample", "native keyboard chooser", "valid import", "syntax and shape recovery", "filename", "table reach"], externalSubstitutions };
      await publishObservation(store, { id: item.id, signature, dependencies, result }, async () => {
        assert(await snapshot.agrees(dependencies, true), "source and screenshot identities agree at publication");
        assert.deepEqual(errors, []); assertTelemetry(telemetry);
      });
      results.push({ id: item.id, disposition: "passed" });
      console.log(item.id + ": passed");
    } finally { await context.close(); }
  }
  await atomicJson(path.join(output, "summary.json"), { cases: results, liveDelivery: "unobserved", engine: "Chromium" });
});
