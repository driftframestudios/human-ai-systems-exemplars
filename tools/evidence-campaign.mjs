import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { atomicJson, digest } from "./observation-checkpoint.mjs";

export const observationVersion = "table-reading.v3";

/** O(F + N) enumeration for F families and N candidate cases before exact-case filtering. */
export function executionPlan(families, { mode, familyId, caseId = null }) {
  assert(["fixtures", "focused", "closure", "discovery"].includes(mode), "Known observation mode");
  const selected = families.filter((family) => familyId === "all" || family.id === familyId);
  assert(selected.length, "Named family exists");
  const cases = [];
  const add = (family, width, options = {}) => {
    const settings = { variant: "source", media: "screen", script: true, enlarged: false, parent: false, ...options };
    const { variant, media, script, enlarged } = settings;
    cases.push(Object.freeze({ id: `${family.id}-${variant}-${width}-${media}-${script ? "script" : "static"}${enlarged ? "-text200" : ""}`, family, width, ...settings }));
  };
  if (mode !== "fixtures") for (const family of selected) {
    for (const width of family.widths) add(family, width);
    if (family.projection) add(family, 390, { variant: "projection" });
    for (const width of [320, 390, 1280]) add(family, width, { parent: true, variant: "parent" });
    if (mode === "closure") {
      add(family, 390, { script: false });
      add(family, 1280, { media: "print" });
      add(family, 390, { media: "forced" });
      add(family, 390, { enlarged: true });
    }
  }
  assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length, "Case identities are unique");
  if (caseId !== null) assert(cases.some(({ id }) => id === caseId) || caseId === "observer-fixtures", "--case names a declared case");
  const chosen = caseId === "observer-fixtures" ? [] : cases.filter(({ id }) => caseId === null || id === caseId);
  return Object.freeze({ cases: Object.freeze(chosen), expected: Object.freeze(["observer-fixtures", ...chosen.map(({ id }) => id)]) });
}

/** Immutable served bytes per invocation; fresh reads establish publication identity. */
export function inputSnapshot(root, packageFiles = new Map()) {
  const values = new Map();
  const metrics = { uniqueReads: 0, bytesHashed: 0, freshReads: 0, hashMilliseconds: 0 };
  const locate = (key) => {
    const absolute = path.resolve(root, key);
    assert(absolute.startsWith(path.resolve(root) + path.sep), "Input belongs to the repository root");
    return absolute;
  };
  const readFresh = async (key) => {
    if (key.startsWith("package:")) return packageFiles.get(key.slice(8)) ?? null;
    try {
      const absolute = locate(key);
      const physical = await fs.realpath(absolute);
      assert(physical.startsWith(path.resolve(root) + path.sep), "Input resolves within the repository root");
      metrics.freshReads += 1;
      return await fs.readFile(physical);
    } catch (error) {
      if (["ENOENT", "EISDIR", "ENOTDIR"].includes(error.code)) return null;
      throw error;
    }
  };
  const capture = (key) => {
    if (!values.has(key)) {
      // Publish the pending capture before another request can begin a second read.
      values.set(key, readFresh(key).then((bytes) => {
        const started = performance.now();
        const value = bytes === null ? { bytes: null, hash: null } : { bytes: Buffer.from(bytes), hash: digest(bytes) };
        metrics.hashMilliseconds += performance.now() - started;
        metrics.bytesHashed += bytes?.length ?? 0;
        metrics.uniqueReads += 1;
        return value;
      }));
    }
    return values.get(key);
  };
  const agrees = async (dependencies, fresh = false) => {
    for (const [key, expected] of Object.entries(dependencies)) {
      if (typeof expected !== "string") return false;
      const bytes = fresh ? await readFresh(key) : null;
      const actual = fresh ? bytes === null ? null : digest(bytes) : (await capture(key)).hash;
      if (actual !== expected) return false;
    }
    return true;
  };
  return {
    metrics,
    async bytes(key) { return (await capture(key)).bytes; },
    async hash(key) { return (await capture(key)).hash; },
    async fingerprints(keys) {
      const result = {};
      for (const key of keys) {
        const hash = await this.hash(key);
        assert(hash, `Required evidence input exists: ${key}`);
        result[key] = hash;
      }
      return Object.freeze(result);
    },
    agrees,
  };
}

/** O(A) hashing and publication for A screenshot bytes; existing captures retain their identity. */
export async function publishScreenshot(directory, bytes) {
  const sha256 = digest(bytes);
  const file = path.join(directory, "screenshots", `${sha256}.png`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    assert.equal(digest(await fs.readFile(file)), sha256, "Existing immutable screenshot agrees");
    return { file, sha256 };
  }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, bytes, { flag: "wx", flush: true });
    // The campaign's writer lock serializes publication; incomplete temporary
    // bytes never occupy a retained generation's content-addressed path.
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
  return { file, sha256 };
}

/** O(C log C + R) for C case identities and R serialized bytes, plus dependency validation. */
export async function publishCampaign(directory, expected, records, validate, metadata = {}) {
  assert.equal(new Set(expected).size, expected.length, "Requested case identities are unique");
  assert.equal(new Set(records.map(({ id }) => id)).size, records.length, "Completed case identities are unique");
  assert.deepEqual(records.map(({ id }) => id).sort(), [...expected].sort(), "Every requested case has one completion record");
  for (const record of records) {
    assert(["pass", "review"].includes(record.result?.standing), "Each requested case has a completed observation");
    assert(await validate(record), `Inputs and artifacts agree for ${record.id}`);
  }
  const generation = { version: 1, observationVersion, expected, records, metadata };
  const bytes = JSON.stringify(generation) + "\n";
  const hash = digest(bytes);
  await fs.mkdir(path.join(directory, "generations"), { recursive: true });
  const relative = `generations/${hash}.json`;
  try { await fs.writeFile(path.join(directory, relative), bytes, { flag: "wx", flush: true }); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    assert.equal(digest(await fs.readFile(path.join(directory, relative))), hash, "Existing immutable generation agrees");
  }
  await atomicJson(path.join(directory, "completion.json"), { version: 1, generation: relative, sha256: hash });
  return { generation: relative, sha256: hash, standing: records.some(({ result }) => result.standing === "review") ? "review" : "pass" };
}
