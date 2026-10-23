import '../../tools/node-runtime-admission.mjs';
import { isDirectExecution } from '../../tools/check-node-runtime.mjs';
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { startStaticServer, repositoryRoot } from "../../tools/core-architecture-browser-helper.mjs";
import { digest, openCheckpoints } from "../../tools/observation-checkpoint.mjs";
import { inputSnapshot } from "../../tools/evidence-campaign.mjs";
import { conditioningInputs, conditioningSource as source } from "../../tools/evidence-inputs.mjs";

export function assertSelectedInspection({ prompt, authored, inspectorVisible, state }) {
  for (const heading of ["### Evidence basis", "### Scope and open questions", "### Review and receiving decision"]) assert(prompt.includes(heading));
  assert.equal(authored, prompt, "Rung 05 authored and runtime prompt agree exactly");
  assert.equal(inspectorVisible, true, "Selected-state inspector is visible");
  assert.equal(state.selectedRungId, "rung-5");
  assert.equal(state.activeView, "inspector");
  assert.deepEqual(state.lastAction, { kind: "open-inspector", recordId: "rung-5" });
}

export async function runConditioning({ resume = process.argv.includes("--resume") } = {}) {
const snapshot = inputSnapshot(repositoryRoot);
const hashes = await snapshot.fingerprints(conditioningInputs);
const runtime = await fs.stat(chromium.executablePath());
const signature = digest(JSON.stringify([hashes, process.version, process.platform, process.arch, runtime.size, runtime.mtimeMs]));
const checkpoints = await openCheckpoints(path.join(repositoryRoot, ".visual-runs/table-repairs/conditioning-prompt/checkpoints"));
const id = "conditioning-prompt-source-and-runtime";
const saved = resume && await checkpoints.read(id, signature, (deps) => snapshot.agrees(deps, true));
if (saved) console.log("PASS Conditioning Field prompt source/runtime agreement; reused, zero browser launches.");
else {
  const server = await startStaticServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== server.origin) return route.fulfill({ status: 204, body: "" });
      const key = decodeURIComponent(url.pathname).replace(/^\//u, "");
      assert(conditioningInputs.includes(key), `Loaded dependency has a declared owner: ${key}`);
      return route.fulfill({ status: 200, body: await snapshot.bytes(key), contentType: key.endsWith(".css") ? "text/css" : key.endsWith(".js") ? "text/javascript" : "text/html" });
    });
    await page.goto(`${server.origin}/${source}`);
    await page.locator('[data-rung-id="rung-5"]').click();
    const prompt = (await page.locator("#promptText").textContent()).trim();
    const authored = (await page.locator('.ladder-table tr[data-label="Table 1. Complete semantic equivalent of the interactive prompt ladder: Rung 05"] [data-label="Full prompt"] .semantic-prompt').textContent()).trim();
    await page.locator("#inspectRung").click();
    assertSelectedInspection({ prompt, authored, inspectorVisible: await page.locator("#stateInspector").isVisible(), state: JSON.parse(await page.locator("#stateContract").textContent()) });
    assert.equal((await page.locator("#promptText").textContent()).trim(), prompt, "inspecting the state retains the selected prompt");
    assert.deepEqual(errors, []);
    assert(await snapshot.agrees(hashes, true), "Observed source and shell remain at the admitted revision");
    await checkpoints.write(id, signature, hashes, { standing: "pass", id });
    console.log("PASS Conditioning Field prompt source/runtime agreement and selected-state inspection.");
  } finally { await browser.close(); await server.close(); }
}
}

if (isDirectExecution(import.meta.url)) await runConditioning();
