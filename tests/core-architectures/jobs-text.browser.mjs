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
const output = path.join(root, ".visual-runs/jobs-text-containment");
const family = coreFamilies.find(item => item.id === "jobs");
const manifest = "core-architectures-chimeric-prototype-manifest-v0.1.json";
const definitions = ["tests/core-architectures/jobs-text.browser.mjs", "tools/core-architecture-browser-helper.mjs", "tools/attribution-contract.mjs", "attribution.yml", "tools/observation-checkpoint.mjs", "tools/evidence-campaign.mjs", "tools/table-reading-observer.mjs", "tests/tables/core-followthrough/runtime.mjs", "tests/tables/core-followthrough/cases.mjs", "tests/tables/core-followthrough/closure.mjs", "package-lock.json"];
const cases = [family.source, family.projection].flatMap((source, index) =>
  [false, true].map(enlarged => ({ id: `${index ? "projection" : "source"}-390-${enlarged ? "text200" : "normal"}`, source, width: 390, enlarged })));
const label = "Pattern Fit and Behavior Protection";

async function contained(page) {
  const bounds = await page.locator(".meta-row > .pill").filter({ hasText: label }).evaluate(element => {
    const rect = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(element);
    return { left: rect.left, right: rect.right, parentLeft: parent.left, parentRight: parent.right,
      text: element.textContent, textLines: new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size,
      client: document.documentElement.clientWidth, page: document.documentElement.scrollWidth };
  });
  assert.equal(bounds.text, label, "complete metadata label remains readable");
  assert(bounds.left >= bounds.parentLeft - 1 && bounds.right <= bounds.parentRight + 1, "metadata pill fits its owning row");
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
      const bounds = await contained(page);
      assert.equal(bounds.textLines, item.enlarged ? 2 : 1, "metadata reflows at ordinary word boundaries");
      if (item.enlarged) {
        const previous = await page.addStyleTag({ content: ".meta-row > .pill { max-inline-size: none; white-space: nowrap; }" });
        await assert.rejects(() => contained(page), /metadata pill fits|document remains/);
        await previous.evaluate(element => element.remove());
        await contained(page);
      }
      const first = page.getByRole("button").first();
      await first.focus(); await page.keyboard.press("Tab");
      const focus = await page.locator(":focus").evaluate(element => {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
        return { tag: element.tagName, text: element.textContent.trim(), left: rect.left, right: rect.right,
          outline: style.outlineStyle, outlineWidth: style.outlineWidth };
      });
      assert(focus.text && ["BUTTON", "INPUT", "SELECT", "A"].includes(focus.tag), "keyboard reaches a named control");
      assert(focus.left >= 0 && focus.right <= item.width + 1, "focused control remains in view");
      assert(focus.outline !== "none" && parseFloat(focus.outlineWidth) > 0, "keyboard focus remains painted");
      const state = await page.evaluate(() => window.jobsToBeDoneTreemap.getState());
      await page.locator("details").evaluateAll(elements => elements.forEach(element => { element.open = true; }));
      await contained(page);
      const tables = await page.evaluate(observeTableReading);
      assert.equal(tables.filter(table => table.visible).length, 2, "both Jobs tables are observed");
      assert.equal(tables.flatMap(table => table.fragments).filter(fragment => ["word", "numeric"].includes(fragment.kind)).length, 0);
      const reach = await observeLocalReach(page, page, tables);
      assert.equal(reach.length, 2, "both wide tables retain local scroll owners");
      assert(reach.every(record => record.standing === "pass"), "keyboard and pointer journeys reach both last columns");
      assert.deepEqual(await page.evaluate(() => window.jobsToBeDoneTreemap.getState()), state, "reading and keyboard journeys retain state");
      await page.locator(".meta-row > .pill").filter({ hasText: label }).scrollIntoViewIfNeeded();
      const screenshot = await publishScreenshot(output, await page.screenshot());
      dependencies[path.relative(root, screenshot.file)] = screenshot.sha256;
      const result = { standing: "pass", bounds, focus, reach, screenshot, browser: resources.browser.version(),
        checks: ["owned label containment", "normal-text control", "prior-style counterexample at enlarged text", "keyboard focus", "two-table reach", "retained state"], externalSubstitutions };
      await publishObservation(store, { id: item.id, signature, dependencies, result }, async () => {
        assert(await snapshot.agrees(dependencies, true), "source and screenshot identities agree at publication");
        assert.deepEqual(errors, []); assertTelemetry(telemetry);
      });
      results.push({ id: item.id, disposition: "passed" }); console.log(item.id + ": passed");
    } finally { await context.close(); }
  }
  await atomicJson(path.join(output, "summary.json"), { cases: results, liveDelivery: "unobserved", engine: "Chromium" });
});
