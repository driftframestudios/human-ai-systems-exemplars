import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

import {
  FoundationError,
  admitFoundation,
  assertPortableTargetPath,
  assertSourceReceivedProfileClosure,
  assertTechnologyProfileSemanticClosure,
  checkFoundation,
  createFoundationPlan,
  verifyFoundation,
} from "../../tools/repository-handoff-foundation.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BUNDLE_ROOT = path.join(ROOT, "repository-handoff-foundation-v0.1");
const TOOL_PATH = path.join(ROOT, "tools/repository-handoff-foundation.mjs");

function foundationError(code) {
  return (error) => error instanceof FoundationError && error.code === code;
}

async function temporaryDirectory(t, prefix) {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function copyBundle(t) {
  const root = await temporaryDirectory(t, "repository-handoff-bundle-");
  const bundleRoot = path.join(root, "repository-handoff-foundation-v0.1");
  await cp(BUNDLE_ROOT, bundleRoot, { recursive: true });
  return bundleRoot;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function mutateManifest(bundleRoot, mutate) {
  const manifestPath = path.join(bundleRoot, "foundation.manifest.json");
  const manifest = await readJson(manifestPath);
  mutate(manifest);
  await writeJson(manifestPath, manifest);
}

async function mutateIssueSeed(bundleRoot, mutate, { synchronizeProjection = true } = {}) {
  const sourcePath = path.join(bundleRoot, "issue-route/source-awaiting.seed.example.json");
  const document = await readJson(sourcePath);
  mutate(document);
  const bytes = jsonBytes(document);
  await writeFile(sourcePath, bytes);
  if (synchronizeProjection) {
    await writeFile(path.join(bundleRoot, document.projection.yamlTarget), bytes);
  }
  await mutateManifest(bundleRoot, (manifest) => {
    const descriptor = manifest.issueSeeds.find((candidate) => candidate.key === document.key);
    assert.ok(descriptor, `manifest declares Issue seed ${document.key}`);
    descriptor.sha256 = sha256Bytes(bytes);
  });
}

async function mutateProfile(bundleRoot, mutate, { synchronizeProjection = true } = {}) {
  const sourcePath = path.join(bundleRoot, "profiles/source-awaiting.profile.json");
  const document = await readJson(sourcePath);
  mutate(document);
  const bytes = jsonBytes(document);
  await writeFile(sourcePath, bytes);
  if (synchronizeProjection) {
    await writeFile(path.join(bundleRoot, document.projection.yamlTarget), bytes);
  }
  return bytes;
}

async function materializeSelectedEntries(foundation, targetRoot) {
  const selected = new Set(foundation.profile.selectedEntryKeys);
  for (const entry of foundation.manifest.entries) {
    if (!selected.has(entry.key)) continue;
    const targetPath = path.join(targetRoot, ...entry.targetPath.split("/"));
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, entry.sourceBytes);
  }
}

async function snapshotTree(root, relativePath = "") {
  const entries = await readdir(path.join(root, relativePath), { withFileTypes: true });
  const snapshot = [];
  for (const entry of entries.sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)))) {
    const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const childPath = path.join(root, childRelative);
    const status = await lstat(childPath);
    if (status.isDirectory()) {
      snapshot.push({ path: childRelative, kind: "directory" });
      snapshot.push(...await snapshotTree(root, childRelative));
    } else if (status.isFile()) {
      snapshot.push({ path: childRelative, kind: "file", bytes: (await readFile(childPath)).toString("base64") });
    } else if (status.isSymbolicLink()) {
      snapshot.push({ path: childRelative, kind: "symlink", target: await readlink(childPath) });
    } else {
      snapshot.push({ path: childRelative, kind: "special" });
    }
  }
  return snapshot;
}

function resultBytes(result) {
  return Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
}

function entryByKey(result, key) {
  const entry = result.entries.find((candidate) => candidate.key === key);
  assert.ok(entry, `expected result entry ${key}`);
  return entry;
}

test("the bundle check runs with only Node and the copied working-bundle files", async (t) => {
  const isolatedRoot = await temporaryDirectory(t, "repository-handoff-isolated-");
  const isolatedTool = path.join(isolatedRoot, "tools/repository-handoff-foundation.mjs");
  await mkdir(path.dirname(isolatedTool), { recursive: true });
  await cp(TOOL_PATH, isolatedTool);
  await cp(BUNDLE_ROOT, path.join(isolatedRoot, "repository-handoff-foundation-v0.1"), { recursive: true });

  const toolSource = await readFile(isolatedTool, "utf8");
  const importedSpecifiers = [...toolSource.matchAll(/\bfrom\s+["']([^"']+)["']/gu)].map((match) => match[1]);
  assert.ok(importedSpecifiers.length > 0);
  assert.ok(importedSpecifiers.every((specifier) => specifier.startsWith("node:")), importedSpecifiers);

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [await realpath(isolatedTool), "--check", "--json"],
    { cwd: isolatedRoot },
  );
  const result = JSON.parse(stdout);
  assert.equal(stderr, "");
  assert.equal(result.ok, true);
  assert.equal(result.mode, "check");
  assert.equal(result.execution, "read_only");
  assert.equal(result.schemaVersion, "0.2");
  assert.equal(result.profileKey, "source-awaiting");
});

test("the dependency-free copied-bundle check rejects tampered schema authorities", async (t) => {
  const manifest = await readJson(path.join(BUNDLE_ROOT, "foundation.manifest.json"));
  for (const schemaPath of manifest.schemas.map((schema) => schema.sourcePath)) {
    await t.test(schemaPath, async (t) => {
      const isolatedRoot = await temporaryDirectory(t, "repository-handoff-schema-integrity-");
      const isolatedTool = path.join(isolatedRoot, "tools/repository-handoff-foundation.mjs");
      const isolatedBundle = path.join(isolatedRoot, "repository-handoff-foundation-v0.1");
      await mkdir(path.dirname(isolatedTool), { recursive: true });
      await cp(TOOL_PATH, isolatedTool);
      await cp(BUNDLE_ROOT, isolatedBundle, { recursive: true });
      const copiedSchema = path.join(isolatedBundle, schemaPath);
      await writeFile(copiedSchema, Buffer.concat([await readFile(copiedSchema), Buffer.from(" ")]));

      await assert.rejects(
        execFileAsync(
          process.execPath,
          [await realpath(isolatedTool), "--check", "--json"],
          { cwd: isolatedRoot },
        ),
        (error) => {
          const result = JSON.parse(error.stderr);
          assert.equal(result.ok, false);
          assert.equal(result.error.code, "schema_digest");
          return true;
        },
      );
    });
  }
});

test("all artifact-local schemas compile under Ajv 2020 and accept their authorities", async () => {
  const documents = [
    {
      name: "foundation manifest v0.1",
      schema: "schema/foundation-manifest.schema.v0.1.json",
    },
    {
      name: "foundation manifest v0.2",
      schema: "schema/foundation-manifest.schema.v0.2.json",
      instance: "foundation.manifest.json",
    },
    {
      name: "foundation profile v0.1",
      schema: "schema/foundation-profile.schema.v0.1.json",
      instance: "profiles/source-awaiting.profile.json",
    },
    {
      name: "foundation profile v0.2",
      schema: "schema/foundation-profile.schema.v0.2.json",
      instance: "examples/illustrative-source-received.profile.example.json",
    },
    {
      name: "Issue route seed",
      schema: "schema/issue-route-seed.schema.v0.1.json",
      instance: "issue-route/source-awaiting.seed.example.json",
    },
    {
      name: "Issue route bindings",
      schema: "schema/issue-route-bindings.schema.v0.1.json",
    },
    {
      name: "Issue route materialization receipt",
      schema: "schema/issue-route-materialization-receipt.schema.v0.1.json",
    },
    {
      name: "technology profile",
      schema: "schema/technology-profile.schema.v0.1.json",
      instance: "examples/illustrative-source-received.technology-profile.example.json",
    },
    {
      name: "local materialization receipt",
      schema: "schema/local-materialization-receipt.schema.v0.1.json",
    },
  ];
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: false });

  for (const document of documents) {
    const validate = ajv.compile(await readJson(path.join(BUNDLE_ROOT, document.schema)));
    if (!document.instance) continue;
    const valid = validate(await readJson(path.join(BUNDLE_ROOT, document.instance)));
    assert.equal(valid, true, `${document.name}: ${JSON.stringify(validate.errors)}`);
  }
});

test("the illustrative source-received profile binds exact observed-source authorities", async () => {
  const manifestBytes = await readFile(path.join(BUNDLE_ROOT, "foundation.manifest.json"));
  const baseProfilePath = path.join(BUNDLE_ROOT, "profiles/source-awaiting.profile.json");
  const profilePath = path.join(BUNDLE_ROOT, "examples/illustrative-source-received.profile.example.json");
  const technologyPath = path.join(
    BUNDLE_ROOT,
    "examples/illustrative-source-received.technology-profile.example.json",
  );
  const profile = await readJson(profilePath);
  const baseProfile = await readJson(baseProfilePath);
  const technologyProfile = await readJson(technologyPath);
  assert.equal(profile.sourceStanding, "source_received");
  assert.equal(profile.foundationManifest.sha256, sha256Bytes(manifestBytes));
  assert.equal(profile.baseProfile.key, baseProfile.key);
  assert.equal(profile.baseProfile.sha256, sha256Bytes(await readFile(baseProfilePath)));
  assert.deepEqual(profile.selectedModules, baseProfile.selectedModules);
  assert.deepEqual(profile.selectedEntryKeys, baseProfile.selectedEntryKeys);
  assert.deepEqual(profile.selectedIssueSeedKeys, baseProfile.selectedIssueSeedKeys);
  assert.equal(profile.technologyProfile.sha256, sha256Bytes(await readFile(technologyPath)));
  assert.equal(profile.technologyProfile.key, technologyProfile.key);
  assert.equal(profile.technologyProfile.version, technologyProfile.version);
  assert.deepEqual(
    assertSourceReceivedProfileClosure(profile, baseProfile),
    {
      baseProfileKey: "source-awaiting",
      selectedModules: 4,
      selectedEntries: 7,
      selectedIssueSeeds: 1,
    },
  );

  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: false });
  const validateProfile = ajv.compile(await readJson(
    path.join(BUNDLE_ROOT, "schema/foundation-profile.schema.v0.2.json"),
  ));
  const validateTechnology = ajv.compile(await readJson(
    path.join(BUNDLE_ROOT, "schema/technology-profile.schema.v0.1.json"),
  ));
  const missingTechnology = structuredClone(profile);
  delete missingTechnology.technologyProfile;
  assert.equal(validateProfile(missingTechnology), false);
  const awaitingWithTechnology = structuredClone(profile);
  awaitingWithTechnology.sourceStanding = "source_awaiting";
  assert.equal(validateProfile(awaitingWithTechnology), false);
  const invalidSemver = structuredClone(profile);
  invalidSemver.version = "1.0.0-01";
  assert.equal(validateProfile(invalidSemver), false);

  assert.equal(
    technologyProfile.source.digest.value,
    sha256Bytes(Buffer.from(technologyProfile.source.digest.procedureInput, "utf8")),
  );
  assert.deepEqual(
    assertTechnologyProfileSemanticClosure(technologyProfile),
    { evidence: 1, facts: 4, coverage: 5, unresolved: 1 },
  );

  const unknownEvidence = structuredClone(technologyProfile);
  unknownEvidence.observations.manifests[0].evidenceRefs[0] = "unknown-evidence";
  assert.throws(
    () => assertTechnologyProfileSemanticClosure(unknownEvidence),
    foundationError("unknown_evidence_reference"),
  );
  const unknownFact = structuredClone(technologyProfile);
  unknownFact.coverage[0].factKeys[0] = "unknown-fact";
  assert.throws(
    () => assertTechnologyProfileSemanticClosure(unknownFact),
    foundationError("unknown_fact_reference"),
  );
  const duplicateFact = structuredClone(technologyProfile);
  duplicateFact.observations.manifests[0].key = duplicateFact.observations.sourceLayout.editableSource[0].key;
  assert.throws(
    () => assertTechnologyProfileSemanticClosure(duplicateFact),
    foundationError("duplicate_key"),
  );
  const crossAreaFact = structuredClone(technologyProfile);
  crossAreaFact.coverage[1].factKeys[0] = "fixture-home-route";
  assert.throws(
    () => assertTechnologyProfileSemanticClosure(crossAreaFact),
    foundationError("fact_area_mismatch"),
  );
  const divergentSelection = structuredClone(profile);
  divergentSelection.selectedEntryKeys[0] = "unrelated.entry";
  assert.throws(
    () => assertSourceReceivedProfileClosure(divergentSelection, baseProfile),
    foundationError("derived_profile_selection"),
  );
  const mismatchedGitRevision = structuredClone(technologyProfile);
  mismatchedGitRevision.source.revision = { kind: "git_commit", value: "a".repeat(40) };
  mismatchedGitRevision.source.digest = {
    algorithm: "sha256",
    scope: "git_tree",
    procedure: "git_ls_tree_full_z_sha256_v1",
    procedureInput: "b".repeat(40),
    value: "c".repeat(64),
  };
  assert.throws(
    () => assertTechnologyProfileSemanticClosure(mismatchedGitRevision),
    foundationError("source_digest_revision"),
  );

  const credentialShapedObservation = structuredClone(technologyProfile);
  credentialShapedObservation.observations.environmentVariables = [{
    key: "example-api-token",
    name: "EXAMPLE_API_TOKEN",
    standing: "declared_required",
    evidenceRefs: ["fixture-declaration"],
    value: "credential-shaped-material",
  }];
  assert.equal(validateTechnology(credentialShapedObservation), false);
});

test("a clean receiving tree produces a deterministic create-only plan without mutation", async (t) => {
  const targetRoot = await temporaryDirectory(t, "repository-handoff-clean-target-");
  await mkdir(path.join(targetRoot, "owner-notes"));
  await writeFile(path.join(targetRoot, "owner-notes/keep.txt"), "receiving state stays intact\n");
  const foundation = await admitFoundation();
  const selected = new Set(foundation.profile.selectedEntryKeys);
  const targetBefore = await snapshotTree(targetRoot);
  const bundleBefore = await snapshotTree(BUNDLE_ROOT);

  const first = await createFoundationPlan(foundation, { targetRoot });
  const second = await createFoundationPlan(foundation, { targetRoot });

  assert.deepEqual(resultBytes(first), resultBytes(second));
  assert.equal(first.ok, true);
  assert.equal(first.execution, "read_only");
  assert.equal(first.summary.create, selected.size);
  assert.equal(first.summary.held, foundation.manifest.entries.length - selected.size);
  for (const entry of first.entries) {
    assert.equal(entry.state, selected.has(entry.key) ? "create" : "held", entry.key);
  }
  assert.deepEqual(await snapshotTree(targetRoot), targetBefore);
  assert.deepEqual(await snapshotTree(BUNDLE_ROOT), bundleBefore);
});

test("exactly materialized source entries plan as same and verify", async (t) => {
  const targetRoot = await temporaryDirectory(t, "repository-handoff-same-target-");
  const foundation = await admitFoundation();
  await materializeSelectedEntries(foundation, targetRoot);
  const before = await snapshotTree(targetRoot);

  const plan = await createFoundationPlan(foundation, { targetRoot });
  const verification = await verifyFoundation(foundation, { targetRoot });

  const selected = new Set(foundation.profile.selectedEntryKeys);
  for (const entry of plan.entries.filter((candidate) => selected.has(candidate.key))) {
    assert.equal(entry.state, "same", entry.key);
  }
  assert.equal(verification.ok, true);
  assert.equal(verification.summary.verified, selected.size);
  assert.equal(verification.summary.preservedDifferences, 0);
  assert.deepEqual(await snapshotTree(targetRoot), before);
});

test("a receiving-owner collision remains byte-identical and verifies as a preserved difference", async (t) => {
  const targetRoot = await temporaryDirectory(t, "repository-handoff-owner-target-");
  const foundation = await admitFoundation();
  await materializeSelectedEntries(foundation, targetRoot);
  const ownerBytes = Buffer.from("# Receiving owner orientation\n\nThis repository keeps its accepted introduction.\n");
  await writeFile(path.join(targetRoot, "README.md"), ownerBytes);

  const plan = await createFoundationPlan(foundation, { targetRoot });
  const verification = await verifyFoundation(foundation, { targetRoot });

  assert.equal(entryByKey(plan, "orientation.readme").state, "preserve_collision");
  assert.equal(entryByKey(plan, "orientation.readme").reason, "receiving_owner_difference");
  assert.equal(entryByKey(verification, "orientation.readme").verification, "preserved_difference");
  assert.equal(verification.ok, true);
  assert.equal(verification.summary.preservedDifferences, 1);
  assert.deepEqual(await readFile(path.join(targetRoot, "README.md")), ownerBytes);
});

test("exact-byte verification remains exact for a receiving-owner carrier", async (t) => {
  const bundleRoot = await copyBundle(t);
  await mutateManifest(bundleRoot, (manifest) => {
    const entry = manifest.entries.find((candidate) => candidate.key === "orientation.readme");
    entry.verificationPolicy = "exact_bytes";
  });
  const foundation = await admitFoundation({ bundleRoot });
  const targetRoot = await temporaryDirectory(t, "repository-handoff-owner-exact-target-");
  await materializeSelectedEntries(foundation, targetRoot);
  const ownerBytes = Buffer.from("# Accepted receiving-owner revision\n");
  await writeFile(path.join(targetRoot, "README.md"), ownerBytes);

  const verification = await verifyFoundation(foundation, { targetRoot });

  assert.equal(entryByKey(verification, "orientation.readme").verification, "mismatch");
  assert.equal(verification.ok, false);
  assert.equal(verification.summary.mismatches, 1);
  assert.deepEqual(await readFile(path.join(targetRoot, "README.md")), ownerBytes);
});

test("verification reports every selected file missing in a clean target", async (t) => {
  const targetRoot = await temporaryDirectory(t, "repository-handoff-missing-target-");
  const foundation = await admitFoundation();
  const verification = await verifyFoundation(foundation, { targetRoot });

  assert.equal(verification.ok, false);
  assert.equal(verification.summary.missing, foundation.profile.selectedEntryKeys.length);
  assert.ok(verification.entries
    .filter((entry) => foundation.profile.selectedEntryKeys.includes(entry.key))
    .every((entry) => entry.verification === "missing"));
  assert.deepEqual(await readdir(targetRoot), []);
});

test("generator-owned exact bytes fail verification after tampering and remain untouched", async (t) => {
  const targetRoot = await temporaryDirectory(t, "repository-handoff-generator-target-");
  const foundation = await admitFoundation();
  await materializeSelectedEntries(foundation, targetRoot);
  const targetPath = path.join(targetRoot, "references/local/.gitignore");
  const tamperedBytes = Buffer.from("*\n!.gitignore\nowner-added-entry\n");
  await writeFile(targetPath, tamperedBytes);

  const plan = await createFoundationPlan(foundation, { targetRoot });
  const verification = await verifyFoundation(foundation, { targetRoot });

  assert.equal(entryByKey(plan, "references.local-ignore").state, "preserve_collision");
  assert.equal(entryByKey(plan, "references.local-ignore").reason, "exact_bytes_size_difference");
  assert.equal(entryByKey(verification, "references.local-ignore").verification, "mismatch");
  assert.equal(verification.ok, false);
  assert.equal(verification.summary.mismatches, 1);
  assert.deepEqual(await readFile(targetPath), tamperedBytes);
});

test("post-admission mutation cannot redirect or downgrade target planning", async (t) => {
  const targetRoot = await temporaryDirectory(t, "repository-handoff-frozen-policy-");
  const foundation = await admitFoundation();
  const entry = foundation.manifest.entries.find(
    (candidate) => candidate.key === "references.local-ignore",
  );
  assert.ok(entry);

  assert.throws(() => {
    entry.targetPath = "../outside-target";
  }, TypeError);
  assert.throws(() => {
    entry.collisionPolicy = "preserve_and_report";
  }, TypeError);
  assert.throws(() => {
    entry.verificationPolicy = "present_regular_file";
  }, TypeError);
  assert.equal(entry.targetPath, "references/local/.gitignore");
  assert.equal(entry.collisionPolicy, "create_if_absent");
  assert.equal(entry.verificationPolicy, "exact_bytes");

  const admittedByte = entry.sourceBytes[0];
  entry.sourceBytes[0] = admittedByte ^ 0xff;
  assert.throws(() => checkFoundation(foundation), foundationError("admitted_source_identity"));
  entry.sourceBytes[0] = admittedByte;
  assert.equal(checkFoundation(foundation).ok, true);

  await materializeSelectedEntries(foundation, targetRoot);
  const targetPath = path.join(targetRoot, entry.targetPath);
  const admittedBytes = await readFile(targetPath);
  const tamperedBytes = Buffer.alloc(admittedBytes.length, 0x78);
  await writeFile(targetPath, tamperedBytes);

  const plan = await createFoundationPlan(foundation, { targetRoot });
  const verification = await verifyFoundation(foundation, { targetRoot });
  assert.equal(entryByKey(plan, entry.key).targetPath, "references/local/.gitignore");
  assert.equal(entryByKey(plan, entry.key).reason, "exact_bytes_difference");
  assert.equal(entryByKey(verification, entry.key).verification, "mismatch");
  assert.equal(verification.ok, false);
  assert.deepEqual(await readFile(targetPath), tamperedBytes);
});

test("target inspection refuses symbolic-link components and special files", async (t) => {
  const foundation = await admitFoundation();

  const symlinkRoot = await temporaryDirectory(t, "repository-handoff-symlink-target-");
  const outsideRoot = await temporaryDirectory(t, "repository-handoff-symlink-outside-");
  await symlink(outsideRoot, path.join(symlinkRoot, "references"), "dir");
  const symlinkPlan = await createFoundationPlan(foundation, { targetRoot: symlinkRoot });
  assert.equal(entryByKey(symlinkPlan, "references.readme").state, "invalid_entry");
  assert.equal(entryByKey(symlinkPlan, "references.readme").reason, "symlink");
  assert.deepEqual(await readdir(outsideRoot), []);

  const specialRoot = await temporaryDirectory(t, "repository-handoff-special-target-");
  const specialPath = path.join(specialRoot, "README.md");
  if (process.platform === "win32") {
    await mkdir(specialPath);
  } else {
    await execFileAsync("mkfifo", [specialPath]);
  }
  const specialPlan = await createFoundationPlan(foundation, { targetRoot: specialRoot });
  assert.equal(entryByKey(specialPlan, "orientation.readme").state, "invalid_entry");
  assert.equal(entryByKey(specialPlan, "orientation.readme").reason, "not_regular_file");
});

test("manifest admission rejects unsafe and case-colliding target paths", async (t) => {
  await t.test("manifest patch versions use canonical SemVer integers", async (t) => {
    const bundleRoot = await copyBundle(t);
    await mutateManifest(bundleRoot, (manifest) => {
      manifest.version = "0.1.01";
    });
    await assert.rejects(admitFoundation({ bundleRoot }), foundationError("version"));
  });

  await t.test("parent traversal", async (t) => {
    const bundleRoot = await copyBundle(t);
    await mutateManifest(bundleRoot, (manifest) => {
      manifest.entries[0].targetPath = "../README.md";
    });
    await assert.rejects(admitFoundation({ bundleRoot }), foundationError("portable_path"));
  });

  await t.test("ASCII case collision", async (t) => {
    const bundleRoot = await copyBundle(t);
    await mutateManifest(bundleRoot, (manifest) => {
      manifest.entries[1].targetPath = "readme.md";
    });
    await assert.rejects(admitFoundation({ bundleRoot }), foundationError("portable_collision"));
  });

  await t.test("generator ownership cannot select presence-only verification", async (t) => {
    const bundleRoot = await copyBundle(t);
    await mutateManifest(bundleRoot, (manifest) => {
      const entry = manifest.entries.find((candidate) => candidate.key === "references.local-ignore");
      entry.verificationPolicy = "present_regular_file";
    });
    await assert.rejects(admitFoundation({ bundleRoot }), foundationError("ownership_verification"));
  });

  await t.test("schema paths remain unique after portable case folding", async (t) => {
    const bundleRoot = await copyBundle(t);
    await mutateManifest(bundleRoot, (manifest) => {
      const duplicate = structuredClone(manifest.schemas[0]);
      duplicate.key = "foundation-manifest-case-alias";
      duplicate.id = "urn:repository-handoff-foundation:schema:foundation-manifest-case-alias:v0.1";
      duplicate.sourcePath = duplicate.sourcePath.toUpperCase();
      manifest.schemas.push(duplicate);
    });
    await assert.rejects(admitFoundation({ bundleRoot }), foundationError("portable_collision"));
  });

  await t.test("schema identities use one unique repository URN", async (t) => {
    const nonUrnRoot = await copyBundle(t);
    await mutateManifest(nonUrnRoot, (manifest) => {
      manifest.schemas[0].id = "https://example.test/schema";
    });
    await assert.rejects(admitFoundation({ bundleRoot: nonUrnRoot }), foundationError("schema_identity"));

    const duplicateIdRoot = await copyBundle(t);
    await mutateManifest(duplicateIdRoot, (manifest) => {
      manifest.schemas[1].id = manifest.schemas[0].id;
    });
    await assert.rejects(admitFoundation({ bundleRoot: duplicateIdRoot }), foundationError("schema_identity"));
  });
});

test("profile admission bounds declared fan-out before allocating profile fixtures", async (t) => {
  const bundleRoot = await copyBundle(t);
  const additionalProfiles = Array.from(
    { length: 64 },
    (_, index) => `additional-profile-${String(index + 1).padStart(2, "0")}`,
  );
  await mutateManifest(bundleRoot, (manifest) => {
    manifest.entries[0].profiles.push(...additionalProfiles.slice(0, 31));
    manifest.entries[1].profiles.push(...additionalProfiles.slice(31, 62));
    manifest.entries[2].profiles.push(...additionalProfiles.slice(62));
  });

  await assert.rejects(admitFoundation({ bundleRoot }), foundationError("profile_limit"));
});

test("portable-path schema and runtime admission agree on boundary examples", async () => {
  const Ajv2020 = (await import("ajv/dist/2020.js")).default;
  const manifestSchema = await readJson(
    path.join(BUNDLE_ROOT, "schema/foundation-manifest.schema.v0.2.json"),
  );
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addSchema(manifestSchema);
  const validatePath = ajv.compile({
    $ref: `${manifestSchema.$id}#/$defs/portablePath`,
  });
  const accepted = [
    "README.md",
    "planning/concept-nursery/README.md",
    "a_b-c.1/file_2.md",
  ];
  const rejected = [
    "../README.md",
    "./README.md",
    "folder./README.md",
    "CON",
    "con.txt",
    "AUX/config.json",
    "folder\\README.md",
    "/README.md",
    "i\u0307/README.md",
    `${"a".repeat(256)}/README.md`,
  ];
  for (const candidate of accepted) {
    assert.equal(validatePath(candidate), true, `${candidate} passes schema admission`);
    assert.equal(assertPortableTargetPath(candidate), candidate);
  }
  for (const candidate of rejected) {
    assert.equal(validatePath(candidate), false, `${candidate} fails schema admission`);
    assert.throws(() => assertPortableTargetPath(candidate), foundationError("portable_path"));
  }
});

test("Issue route admission keeps the current front, next receiver, and inverse relations closed", async (t) => {
  await t.test("unknown current front", async (t) => {
    const bundleRoot = await copyBundle(t);
    await mutateIssueSeed(bundleRoot, (seed) => {
      seed.currentFrontKey = "missing-current-front";
    });
    await assert.rejects(admitFoundation({ bundleRoot }), foundationError("current_front"));
  });

  await t.test("unknown Issue-shaped next receiver", async (t) => {
    const bundleRoot = await copyBundle(t);
    await mutateIssueSeed(bundleRoot, (seed) => {
      seed.issues[0].nextReceiver.key = "missing-receiver";
    });
    await assert.rejects(admitFoundation({ bundleRoot }), foundationError("unknown_issue"));
  });

  await t.test("broken inverse relation", async (t) => {
    const bundleRoot = await copyBundle(t);
    await mutateIssueSeed(bundleRoot, (seed) => {
      seed.relations[0].inverseRelationKey = seed.relations[0].key;
    });
    await assert.rejects(admitFoundation({ bundleRoot }), foundationError("relation_closure"));
  });

  await t.test("reciprocal declarations cannot redefine relation semantics", async (t) => {
    const bundleRoot = await copyBundle(t);
    await mutateIssueSeed(bundleRoot, (seed) => {
      const prepares = seed.relationTypes.find((candidate) => candidate.key === "prepares");
      const receives = seed.relationTypes.find((candidate) => candidate.key === "receives");
      prepares.inverseType = "prepares";
      receives.inverseType = "receives";
    });
    await assert.rejects(admitFoundation({ bundleRoot }), foundationError("relation_type_semantics"));
  });
});

test("Issue bodies require nonempty UTF-8 Markdown", async (t) => {
  for (const [name, bodyBytes, errorCode] of [
    ["empty body", Buffer.alloc(0), "issue_body_text"],
    ["invalid UTF-8 body", Buffer.from([0xc3, 0x28]), "utf8"],
  ]) {
    await t.test(name, async (t) => {
      const bundleRoot = await copyBundle(t);
      const bodyPath = path.join(bundleRoot, "issue-route/bodies/source-intake.md");
      await writeFile(bodyPath, bodyBytes);
      await mutateIssueSeed(bundleRoot, (seed) => {
        seed.issues[0].bodySha256 = sha256Bytes(bodyBytes);
      });
      await assert.rejects(admitFoundation({ bundleRoot }), foundationError(errorCode));
    });
  }
});

test("Issue body bytes are bounded across the complete multi-seed admission", async (t) => {
  const bundleRoot = await copyBundle(t);
  const bodyRelativePath = "issue-route/bodies/aggregate-budget.md";
  const bodyPath = path.join(bundleRoot, bodyRelativePath);
  const bodyBytes = Buffer.alloc(13 * 1024 * 1024, 0x20);
  bodyBytes.write("# Aggregate budget\n");
  await writeFile(bodyPath, bodyBytes);
  const bodySha256 = sha256Bytes(bodyBytes);

  const firstSourcePath = "issue-route/source-awaiting.seed.example.json";
  const firstSeed = await readJson(path.join(bundleRoot, firstSourcePath));
  for (const issue of firstSeed.issues) {
    issue.bodySource = bodyRelativePath;
    issue.bodySha256 = bodySha256;
  }
  const firstBytes = jsonBytes(firstSeed);
  await writeFile(path.join(bundleRoot, firstSourcePath), firstBytes);
  await writeFile(path.join(bundleRoot, firstSeed.projection.yamlTarget), firstBytes);

  const secondSourcePath = "issue-route/aggregate-budget.seed.example.json";
  const secondSeed = structuredClone(firstSeed);
  secondSeed.key = "aggregate-budget-route";
  secondSeed.title = "Aggregate body budget route";
  secondSeed.projection.jsonSource = secondSourcePath;
  secondSeed.projection.yamlTarget = "issue-route/aggregate-budget.seed.example.yaml";
  const extraIssue = structuredClone(secondSeed.issues[1]);
  extraIssue.key = "aggregate-budget-extra";
  extraIssue.title = "Exercise the shared aggregate body budget";
  extraIssue.nextReceiver = {
    type: "owner",
    key: "receiving-owner",
    condition: "The complete route remains inside its aggregate body budget.",
  };
  secondSeed.issues.push(extraIssue);
  const secondBytes = jsonBytes(secondSeed);
  await writeFile(path.join(bundleRoot, secondSourcePath), secondBytes);
  await writeFile(path.join(bundleRoot, secondSeed.projection.yamlTarget), secondBytes);

  await mutateProfile(bundleRoot, (profile) => {
    profile.selectedIssueSeedKeys.push(secondSeed.key);
  });
  await mutateManifest(bundleRoot, (manifest) => {
    manifest.issueSeeds[0].sha256 = sha256Bytes(firstBytes);
    manifest.issueSeeds.push({
      key: secondSeed.key,
      sourcePath: secondSourcePath,
      profiles: ["source-awaiting"],
      sha256: sha256Bytes(secondBytes),
    });
  });

  await assert.rejects(admitFoundation({ bundleRoot }), foundationError("aggregate_body_limit"));
});

test("JSON authorities and YAML readability projections retain exact bytes", async (t) => {
  for (const [jsonPath, yamlPath] of [
    ["profiles/source-awaiting.profile.json", "profiles/source-awaiting.profile.yaml"],
    ["issue-route/source-awaiting.seed.example.json", "issue-route/source-awaiting.seed.example.yaml"],
    ["examples/illustrative-source-received.profile.example.json", "examples/illustrative-source-received.profile.example.yaml"],
    ["examples/illustrative-source-received.technology-profile.example.json", "examples/illustrative-source-received.technology-profile.example.yaml"],
  ]) {
    assert.deepEqual(
      await readFile(path.join(BUNDLE_ROOT, jsonPath)),
      await readFile(path.join(BUNDLE_ROOT, yamlPath)),
      `${yamlPath} matches ${jsonPath}`,
    );
  }

  const bundleRoot = await copyBundle(t);
  const staleProjection = path.join(bundleRoot, "issue-route/source-awaiting.seed.example.yaml");
  await writeFile(staleProjection, Buffer.concat([await readFile(staleProjection), Buffer.from("\n")]));
  await assert.rejects(admitFoundation({ bundleRoot }), foundationError("projection_difference"));

  const selfProjectionRoot = await copyBundle(t);
  await mutateIssueSeed(selfProjectionRoot, (seed) => {
    seed.projection.yamlTarget = seed.projection.jsonSource;
  });
  await assert.rejects(
    admitFoundation({ bundleRoot: selfProjectionRoot }),
    foundationError("projection_target"),
  );

  const caseAliasProjectionRoot = await copyBundle(t);
  await mutateIssueSeed(
    caseAliasProjectionRoot,
    (seed) => {
      seed.projection.yamlTarget = seed.projection.jsonSource.toUpperCase();
    },
    { synchronizeProjection: false },
  );
  await assert.rejects(
    admitFoundation({ bundleRoot: caseAliasProjectionRoot }),
    foundationError("projection_target"),
  );
});

test("projection validation compares YAML with the one admitted JSON authority snapshot", async (t) => {
  const bundleRoot = await copyBundle(t);
  const childSource = `
    import fs from "node:fs";
    import { createHash } from "node:crypto";
    import { readFile, writeFile } from "node:fs/promises";
    import { syncBuiltinESMExports } from "node:module";
    import path from "node:path";
    import { pathToFileURL } from "node:url";

    const bundleRoot = path.resolve(process.argv[1]);
    const toolPath = path.resolve(process.argv[2]);
    const authorityPath = path.join(bundleRoot, "profiles/source-awaiting.profile.json");
    const originalBytes = await readFile(authorityPath);
    const changedBytes = Buffer.concat([originalBytes, Buffer.from(" ")]);
    const originalOpen = fs.promises.open;
    let authorityOpenCount = 0;

    fs.promises.open = async (...arguments_) => {
      const handle = await originalOpen(...arguments_);
      if (path.resolve(String(arguments_[0])) !== authorityPath) return handle;
      authorityOpenCount += 1;
      if (authorityOpenCount !== 1) return handle;
      return new Proxy(handle, {
        get(target, property) {
          if (property === "close") {
            return async () => {
              const result = await target.close();
              await writeFile(authorityPath, changedBytes);
              return result;
            };
          }
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    };
    syncBuiltinESMExports();

    try {
      const toolUrl = pathToFileURL(toolPath).href + "?authority-snapshot=" + Date.now();
      const { admitFoundation } = await import(toolUrl);
      const foundation = await admitFoundation({ bundleRoot });
      const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
      process.stdout.write(JSON.stringify({
        authorityOpenCount,
        admittedDigest: foundation.profile.projection.sha256,
        originalDigest: digest(originalBytes),
        changedDigest: digest(await readFile(authorityPath)),
      }));
    } finally {
      fs.promises.open = originalOpen;
      syncBuiltinESMExports();
    }
  `;

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "--eval", childSource, bundleRoot, TOOL_PATH],
    { cwd: ROOT },
  );
  const observation = JSON.parse(stdout);
  assert.equal(stderr, "");
  assert.equal(observation.authorityOpenCount, 1);
  assert.equal(observation.admittedDigest, observation.originalDigest);
  assert.notEqual(observation.changedDigest, observation.originalDigest);
});
