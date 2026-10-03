import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const [mode, app, receipt, policy] = process.argv.slice(2);
assert(path.isAbsolute(app), "Isolated application root is absolute");
const require = createRequire(path.join(app, "package.json"));
if (mode === "runtime") {
  const { chromium } = require("@playwright/test");
  console.log(JSON.stringify({
    node: process.version, platform: process.platform, arch: process.arch,
    playwright: require("@playwright/test/package.json").version,
    executable: chromium.executablePath(),
  }));
} else {
  const { runCampaign } = await import(pathToFileURL(path.join(app, "tools/table-reading-contract.mjs")).href);
  if (mode === "plan") {
    await runCampaign({ mode: "closure", familyId: "all", planOnly: true });
  } else {
    assert.equal(mode, "run");
    assert(["full", "selected"].includes(policy));
    const output = ".visual-runs/paired-replay-02";
    const outputRoot = path.join(app, output);
    const operations = {};
    const originals = {};
    for (const name of ["readFile", "writeFile", "appendFile", "open", "rename", "mkdir", "rm", "stat", "realpath"]) {
      originals[name] = fs[name];
      fs[name] = async (...args) => {
        const file = typeof args[0] === "string" ? path.resolve(args[0]) : "";
        const category = file.startsWith(path.join(outputRoot, "checkpoints") + path.sep) ? "checkpoint"
          : file.startsWith(outputRoot + path.sep) ? "artifact-and-campaign" : "other";
        const key = category + "." + name;
        operations[key] = (operations[key] ?? 0) + 1;
        return originals[name](...args);
      };
    }
    const begin = performance.now();
    try {
      await runCampaign({ mode: "closure", familyId: "all", output, resume: policy === "selected" });
    } finally {
      const campaignCallMilliseconds = performance.now() - begin;
      for (const [name, fn] of Object.entries(originals)) fs[name] = fn;
      await fs.writeFile(receipt, JSON.stringify({
        campaignCallMilliseconds,
        fsApiCalls: operations,
        nodePeakResidentKiB: process.resourceUsage().maxRSS,
        browserProcessTreePeakMemory: { value: null, standing: "unmeasured" },
      }) + "\n");
    }
  }
}
