import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";

const require = createRequire(import.meta.url);
const ajvRequire = createRequire(require.resolve("ajv"));
const uri = ajvRequire("fast-uri");
const root = new URL("../../", import.meta.url);
const readJson = async relative => JSON.parse(await readFile(new URL(relative, root), "utf8"));

function meetsFloor(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major > 4 || (major === 4 && (minor > 1 || (minor === 1 && patch >= 5)));
}

test("the root policy, complete lock resolution and installed Ajv dependency meet the secure floor", async () => {
  const manifest = await readJson("package.json");
  const lock = await readJson("package-lock.json");
  // A retired override remains valid when every locked/installed consumer meets the floor.
  if (manifest.overrides?.["fast-uri"] !== undefined) {
    assert.ok(meetsFloor(manifest.overrides["fast-uri"]), "reviewed override pin meets 4.1.5");
  }
  for (const version of ["3.1.8", "4.1.4", "4.1.5-rc.1"]) assert.equal(meetsFloor(version), false);
  for (const version of ["4.1.5", "4.2.0", "5.0.0"]) assert.equal(meetsFloor(version), true);
  const entries = Object.entries(lock.packages).filter(([name]) => /(?:^|\/)node_modules\/fast-uri$/.test(name));
  assert.ok(entries.length > 0, "the dependency stays observable");
  for (const [name, locked] of entries) {
    assert.ok(meetsFloor(locked.version), name + " meets the floor");
    const installed = await readJson(name + "/package.json");
    assert.equal(installed.version, locked.version, name + " matches the lock");
  }
  assert.equal(ajvRequire.resolve("fast-uri"), require.resolve("fast-uri"), "Ajv uses the inspected root resolution");
});

test("CVE-2026-86472: encoded and literal host case retain one identity", () => {
  assert.equal(uri.parse("//%41.example").host, "a.example");
  assert.equal(uri.normalize("//%41.example"), uri.normalize("//a.example"));
  assert.equal(uri.equal("//%41.example", "//a.example"), true);
});

test("CVE-2026-86818: mailto fields retain meaning across parse and serialize", () => {
  const first = uri.parse("mailto:reader@example.test?%74o=reviewer@example.test&%73ubject=Review&%62ody=Evidence");
  const second = uri.parse(uri.serialize(first));
  assert.ok(first.to.includes("reviewer@example.test"), "the recipient is visible at the first decision");
  assert.equal(first.subject, "Review");
  assert.equal(first.body, "Evidence");
  assert.deepEqual(second.to, first.to);
  assert.equal(second.subject, first.subject);
  assert.equal(second.body, first.body);
});

for (const [name, Constructor] of [["draft-07", Ajv], ["2020-12", Ajv2020]]) {
  test("Ajv " + name + " resolves relative schema references through the overridden parser", () => {
    const ajv = new Constructor({ strict: true, allErrors: true });
    ajv.addSchema({ $id: "https://schema.example.test/count.json", type: "integer", minimum: 1 });
    const validate = ajv.compile({
      $id: "https://schema.example.test/forms/decision.json",
      type: "object",
      required: ["quantity"],
      properties: { quantity: { $ref: "../count.json" } },
      additionalProperties: false
    });
    assert.equal(validate({ quantity: 2 }), true);
    assert.equal(validate({ quantity: 0 }), false);
    assert.equal(validate({ quantity: "" }), false);
    assert.equal(validate({ quantity: 2, extra: true }), false);
  });
}
