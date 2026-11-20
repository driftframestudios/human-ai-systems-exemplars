import '../../tools/node-runtime-admission.mjs';
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
const reviewedUndiciVersion = "7.30.1";

function isReviewedUndiciVersion(version) {
  return version === reviewedUndiciVersion;
}

function meetsStableFloor(version, floor) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version);
  if (!match) return false;
  const value = match.slice(1).map(Number);
  for (let index = 0; index < floor.length; index += 1) {
    if (value[index] !== floor[index]) return value[index] > floor[index];
  }
  return true;
}

test("the root policy, complete lock resolution and installed Ajv dependency meet the secure floor", async () => {
  const manifest = await readJson("package.json");
  const lock = await readJson("package-lock.json");
  assert.equal(manifest.overrides?.["fast-uri"], "4.2.3", "the root policy pins the reviewed release");
  for (const version of ["4.1.5", "4.2.2", "4.2.3-rc.1"]) assert.equal(meetsStableFloor(version, [4, 2, 3]), false);
  for (const version of ["4.2.3", "4.3.0", "5.0.0"]) assert.equal(meetsStableFloor(version, [4, 2, 3]), true);
  const entries = Object.entries(lock.packages).filter(([name]) => /(?:^|\/)node_modules\/fast-uri$/.test(name));
  assert.ok(entries.length > 0, "the dependency stays observable");
  for (const [name, locked] of entries) {
    assert.equal(locked.version, manifest.overrides["fast-uri"], name + " resolves the reviewed release");
    const installed = await readJson(name + "/package.json");
    assert.equal(installed.version, locked.version, name + " matches the lock");
  }
  assert.equal(ajvRequire.resolve("fast-uri"), require.resolve("fast-uri"), "Ajv uses the inspected root resolution");
});

test("both Wrangler locks and installed trees resolve one reviewed dependency closure", async () => {
  for (const version of ["7.29.1", "7.30.0", "7.30.1-rc.1", "8.0.0", "8.12.1"]) {
    assert.equal(isReviewedUndiciVersion(version), false, `${version} remains outside the reviewed Undici coordinate`);
  }
  assert.equal(isReviewedUndiciVersion(reviewedUndiciVersion), true);
  for (const version of ["0.35.4", "0.35.5-rc.1"]) assert.equal(meetsStableFloor(version, [0, 35, 5]), false);
  for (const version of ["0.35.5", "0.36.0", "1.0.0"]) assert.equal(meetsStableFloor(version, [0, 35, 5]), true);
  const observedChains = [];
  for (const [label, prefix] of [
    ["root", ""],
    ["schema Worker", "cloudflare/schemas-worker/"],
  ]) {
    const manifest = await readJson(`${prefix}package.json`);
    const lock = await readJson(`${prefix}package-lock.json`);
    const wrangler = lock.packages["node_modules/wrangler"];
    const miniflare = lock.packages["node_modules/miniflare"];
    const undici = lock.packages["node_modules/undici"];
    const sharp = lock.packages["node_modules/sharp"];
    const workerd = lock.packages["node_modules/workerd"];

    assert.equal(manifest.devDependencies?.wrangler, "4.155.0", `${label} pins the reviewed Wrangler release`);
    assert.equal(lock.packages[""]?.devDependencies?.wrangler, manifest.devDependencies.wrangler, `${label} manifest and lock agree`);
    assert.equal(wrangler?.version, manifest.devDependencies.wrangler, `${label} lock resolves the pinned Wrangler release`);
    assert.equal(wrangler?.dependencies?.miniflare, miniflare?.version, `${label} Wrangler resolves the inspected Miniflare package`);
    assert.equal(wrangler?.dependencies?.workerd, workerd?.version, `${label} Wrangler resolves the inspected Workerd package`);
    assert.equal(miniflare?.dependencies?.undici, undici?.version, `${label} Miniflare resolves the inspected Undici package`);
    assert.equal(miniflare?.dependencies?.sharp, sharp?.version, `${label} Miniflare resolves the inspected Sharp package`);
    assert.equal(isReviewedUndiciVersion(undici?.version), true, `${label} Undici resolves the exact reviewed release`);
    assert(meetsStableFloor(sharp?.version ?? "", [0, 35, 5]), `${label} Sharp is a stable release at or above the 0.35.5 reviewed floor`);
    for (const [packageName, locked] of Object.entries({ wrangler, miniflare, undici, sharp, workerd })) {
      const installed = await readJson(`${prefix}node_modules/${packageName}/package.json`);
      assert.equal(installed.version, locked?.version, `${label} installed ${packageName} matches the lock`);
    }

    observedChains.push([wrangler.version, miniflare.version, undici.version, sharp.version, workerd.version]);
  }
  assert.deepEqual(observedChains[1], observedChains[0], "root and schema Worker retain one reviewed dependency chain");
});

test("percent-encoded scheme syntax remains inert across parser operations", () => {
  const input = "%6Aavascript:alert(1)";
  const parsed = uri.parse(input);
  assert.equal(parsed.error, "URI scheme is malformed.");
  assert.equal(uri.normalize(input), input);
  assert.equal(uri.equal(input, "javascript:alert(1)"), false);
  assert.throws(() => uri.resolve("https://example.test/app/", input), /URI scheme is malformed\./u);
});

test("relative normalization preserves reference targets", () => {
  const base = "https://example.test/a/c";
  for (const [reference, normalized] of [["../x", "../x"], ["a/../b", "b"]]) {
    assert.equal(uri.normalize(reference), normalized);
    assert.equal(uri.resolve(base, normalized), uri.resolve(base, reference));
  }
  assert.equal(uri.equal("../x", "x"), false);
  assert.equal(uri.equal("a/../b", "/b"), false);
});

test("domain-host delimiters retain malformed-host standing", () => {
  const input = "http://a@b@evil.example/";
  const parsed = uri.parse(input);
  assert.equal(parsed.error, "URI host is malformed.");
  assert.notEqual(parsed.host, "evil.example");
  assert.equal(uri.normalize(input), input);
  assert.equal(uri.equal(input, "http://a@evil.example/"), false);
  assert.throws(() => uri.resolve("http://trusted.example/", "//a@b@evil.example/"), /URI host is malformed\./u);
});

test("suffix references escape a first-segment colon", () => {
  const options = { reference: "suffix", scheme: "x" };
  const normalized = uri.normalize("javascript:alert(1)", options);
  assert.equal(normalized, "javascript%3Aalert(1)");
  assert.equal(uri.parse(normalized).scheme, undefined);
  assert.equal(uri.normalize("a/b:c", options), "a/b:c");
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
