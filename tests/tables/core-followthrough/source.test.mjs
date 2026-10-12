import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import { coreFamilies, coreRoot, projectionRoot, planCases } from "./cases.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const manifestName = "core-architectures-chimeric-prototype-manifest-v0.1.json";
const manifests = await Promise.all([coreRoot, projectionRoot].map(async directory =>
  JSON.parse(await fs.readFile(path.join(root, directory, manifestName), "utf8"))));
const inputs = new Map(coreFamilies.map(family => [family.id, Promise.all([family.source, family.projection]
  .map(file => fs.readFile(path.join(root, file))))]));

for (const family of coreFamilies) {
  test(`${family.id}: portable source, projection and native table contract`, async () => {
    const [source, projection] = await inputs.get(family.id);
    assert.deepEqual(projection, source, "declared unadapted copy stays byte-identical");
    for (const manifest of manifests) {
      const entry = manifest.prototypes.find(item => item.file === family.file);
      assert.equal(entry?.version, family.version);
    }
    const html = source.toString("utf8");
    assert.equal([...html.matchAll(/<table\b[^>]*><caption>/gu)].length, family.tables);
    for (const [tag] of html.matchAll(/<th(?:\s[^>]*)?>/gu)) {
      assert.match(tag, /scope="(?:row|col)"/u);
      assert.match(tag, /data-label="[^"]+"/u);
    }
    for (const [tag] of html.matchAll(/<div\b[^>]*class="table-wrap"[^>]*>/gu)) {
      assert.match(tag, /role="region"/u);
      assert.match(tag, /tabindex="0"/u);
      assert.match(tag, /aria-label="[^"]+"/u);
    }
    for (const [, attributes, script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gu)) {
      if (!/type="application\/(?:ld\+)?json"/u.test(attributes)) new vm.Script(script, { filename: family.file });
    }
  });
}

test("material manifest byte receipts agree with current sources", async () => {
  for (const family of coreFamilies) {
    const [source] = await inputs.get(family.id);
    for (const manifest of manifests) {
      const entry = manifest.prototypes.find(item => item.file === family.file);
      assert.equal(entry.size_bytes, source.length, family.id + ": material byte entry follows its source");
    }
  }
});

test("bounded campaign has stable unique cases and rejects unknown selectors", () => {
  const cases = planCases({ combined: true });
  assert.equal(cases.length, new Set(cases.map(item => item.id)).size);
  assert.equal(planCases({ family: "jobs" }).length, 9);
  assert.equal(planCases({ combined: true, caseId: "hiring-parent-390-screen" }).length, 1);
  assert.throws(() => planCases({ family: "unowned" }), /Unknown/u);
  assert.throws(() => planCases({ caseId: "unowned" }), /Unknown/u);
});
