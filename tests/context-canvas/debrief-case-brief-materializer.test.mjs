import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  formatMaterializationError,
  readAdmittedCaseBriefSource,
  replaceGeneratedAtAGlance,
  writeAtomically,
} from "../../tools/materialize-debrief-case-briefs.mjs";

const generatedBlock = [
  "          <!-- debrief-at-a-glance-projection:start -->",
  "          <section id=\"case-brief\" aria-labelledby=\"case-brief-at-a-glance-title\"><h2 id=\"case-brief-at-a-glance-title\">At-a-Glance</h2></section>",
  "          <!-- debrief-at-a-glance-projection:end -->",
].join("\n");

test("Case Brief source admission accepts regular direct children", async t => {
  const root = await mkdtemp(join(tmpdir(), "case-brief-source-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "accepted.html");
  await writeFile(source, "<main>accepted</main>", "utf8");

  assert.equal(
    await readAdmittedCaseBriefSource(source, { baseDirectory: root, fileLabel: "accepted.html" }),
    "<main>accepted</main>",
  );
});

test("Case Brief source admission rejects symlinks, directories, and resolved paths outside its owner", async t => {
  const root = await mkdtemp(join(tmpdir(), "case-brief-boundary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const admitted = join(root, "admitted");
  const outside = join(root, "outside.html");
  const linked = join(admitted, "linked.html");
  const directory = join(admitted, "directory.html");
  await mkdir(admitted);
  await writeFile(outside, "outside", "utf8");
  await symlink(outside, linked);
  await mkdir(directory);

  await assert.rejects(
    readAdmittedCaseBriefSource(linked, { baseDirectory: admitted, fileLabel: "linked.html" }),
    /regular source file rather than a symlink or special entry/u,
  );
  await assert.rejects(
    readAdmittedCaseBriefSource(directory, { baseDirectory: admitted, fileLabel: "directory.html" }),
    /regular source file rather than a symlink or special entry/u,
  );
  await assert.rejects(
    readAdmittedCaseBriefSource(outside, { baseDirectory: admitted, fileLabel: "outside.html" }),
    /resolves outside its admitted source directory/u,
  );
});

test("Full Debrief projection replaces the one legacy coordinate and preserves surrounding bytes", () => {
  const source = [
    "<main>",
    "          <p>Before</p>",
    "          <span id=\"case-brief\" aria-hidden=\"true\"></span>",
    "          <p>After</p>",
    "</main>",
  ].join("\n");

  assert.equal(
    replaceGeneratedAtAGlance(source, generatedBlock, { fileLabel: "example.html" }),
    source.replace("          <span id=\"case-brief\" aria-hidden=\"true\"></span>", generatedBlock),
  );
});

test("Full Debrief projection refreshes one stale bounded block idempotently", () => {
  const staleBlock = generatedBlock.replace("At-a-Glance", "Stale heading");
  const source = `<main>\n${staleBlock}\n<p>Route-owned narrative</p>\n</main>`;
  const expected = `<main>\n${generatedBlock}\n<p>Route-owned narrative</p>\n</main>`;

  assert.equal(
    replaceGeneratedAtAGlance(source, generatedBlock, { fileLabel: "example.html" }),
    expected,
  );
  assert.equal(
    replaceGeneratedAtAGlance(expected, generatedBlock, { fileLabel: "example.html", requireGeneratedBlock: true }),
    expected,
  );
});

test("Full Debrief projection reports missing, partial, and duplicate ownership boundaries", () => {
  assert.throws(
    () => replaceGeneratedAtAGlance("<main></main>", generatedBlock, {
      fileLabel: "missing.html",
      requireGeneratedBlock: true,
    }),
    /missing\.html is missing its generated At-a-Glance projection block/u,
  );
  assert.throws(
    () => replaceGeneratedAtAGlance(
      "          <!-- debrief-at-a-glance-projection:start -->",
      generatedBlock,
      { fileLabel: "partial.html" },
    ),
    /partial\.html must contain either zero or one complete generated At-a-Glance projection block/u,
  );
  assert.throws(
    () => replaceGeneratedAtAGlance(
      [
        "          <span id=\"case-brief\" aria-hidden=\"true\"></span>",
        "          <span id=\"case-brief\" aria-hidden=\"true\"></span>",
      ].join("\n"),
      generatedBlock,
      { fileLabel: "duplicate.html" },
    ),
    /duplicate\.html must contain exactly one legacy #case-brief insertion coordinate/u,
  );
});

test("Full Debrief projection keeps its published coordinate and heading identity inside the generated boundary", () => {
  const staleBlock = generatedBlock
    .replace('id="case-brief"', 'id="stale-case-brief"')
    .replace('id="case-brief-at-a-glance-title"', 'id="stale-at-a-glance-title"');

  assert.throws(
    () => replaceGeneratedAtAGlance(
      `<main>\n${staleBlock}\n<section id="case-brief"></section>\n</main>`,
      generatedBlock,
      { fileLabel: "displaced-coordinate.html" },
    ),
    /displaced-coordinate\.html generated At-a-Glance projection must own exactly one #case-brief and keep that identifier out of route-owned markup; found 1 inside and 1 outside/u,
  );
  assert.throws(
    () => replaceGeneratedAtAGlance(
      `<main>\n${generatedBlock}\n<h2 id="case-brief-at-a-glance-title">Route-owned heading</h2>\n</main>`,
      generatedBlock,
      { fileLabel: "duplicate-heading.html" },
    ),
    /duplicate-heading\.html generated At-a-Glance projection must own exactly one #case-brief-at-a-glance-title and keep that identifier out of route-owned markup; found 1 inside and 1 outside/u,
  );
});

test("Materializer errors retain operating-system context needed for recovery", () => {
  const error = Object.assign(new Error("no space left on device"), { code: "ENOSPC" });
  assert.equal(
    formatMaterializationError(error),
    "Case Brief projection materialization failed (ENOSPC): no space left on device",
  );
});

test("Atomic replacement preserves a receiver changed after materialization planning", async t => {
  const root = await mkdtemp(join(tmpdir(), "case-brief-write-conflict-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const destination = join(root, "receiver.html");
  await writeFile(destination, "newer route-owned edit", "utf8");

  await assert.rejects(
    writeAtomically(destination, "generated replacement", {
      expectedSource: "stale planned source",
      fileLabel: "receiver.html",
    }),
    /receiver\.html changed after materialization planning; preserve the newer edits and rerun the build/u,
  );
  assert.equal(await readFile(destination, "utf8"), "newer route-owned edit");
});
