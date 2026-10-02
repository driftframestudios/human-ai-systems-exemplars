import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { startStaticServer, repositoryRoot } from "../../tools/core-architecture-browser-helper.mjs";
import { digest, openCheckpoints } from "../../tools/observation-checkpoint.mjs";

const source = "context-canvas-project-surface/context-canvas/conditioning-field.html";
const inputs = [source, "tests/tables/conditioning.browser.mjs", "tools/core-architecture-browser-helper.mjs",
  "tools/observation-checkpoint.mjs", "tools/attribution-contract.mjs",
  "context-canvas-project-surface/context-canvas/visitor-boundary-contract.js", "package-lock.json"];
const hashes = [];
for (const file of inputs) hashes.push(digest(await fs.readFile(path.join(repositoryRoot, file))));
const runtime = await fs.stat(chromium.executablePath());
const signature = digest(JSON.stringify([hashes, process.version, runtime.size, runtime.mtimeMs]));
const checkpoints = await openCheckpoints(path.join(repositoryRoot, ".visual-runs/table-repairs/conditioning-prompt/checkpoints"));
const id = "conditioning-prompt-source-and-runtime";
const saved = process.argv.includes("--resume") && await checkpoints.read(id, signature, () => true);
if (saved) console.log("PASS Conditioning Field prompt source/runtime agreement; reused, zero browser launches.");
else {
  const server = await startStaticServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) => new URL(route.request().url()).origin === server.origin
      ? route.continue() : route.fulfill({ status: 204, body: "" }));
    await page.goto(`${server.origin}/${source}`);
    await page.locator('[data-rung-id="rung-5"]').click();
    const prompt = (await page.locator("#promptText").textContent()).trim();
    for (const heading of ["### Evidence basis", "### Scope and open questions", "### Review and receiving decision"]) assert(prompt.includes(heading));
    assert(!prompt.includes("What are you drawing on?"));
    const authored = await page.locator(".ladder-table .semantic-prompt").allTextContents();
    assert(authored.some((value) => value.trim() === prompt), "authored ladder and selected runtime prompt agree exactly");
    await page.locator("#inspectRung").click();
    assert.equal((await page.locator("#promptText").textContent()).trim(), prompt, "inspecting the state retains the selected prompt");
    assert.deepEqual(errors, []);
    await checkpoints.write(id, signature, {}, { standing: "pass", id });
    console.log("PASS Conditioning Field prompt source/runtime agreement and selected-state inspection.");
  } finally { await browser.close(); await server.close(); }
}
