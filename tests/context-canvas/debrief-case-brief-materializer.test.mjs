import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import { minify } from "html-minifier";
import { test } from "node:test";

import {
  formatMaterializationError,
  readAdmittedCaseBriefSource,
  writeAtomically,
} from "../../tools/materialize-debrief-case-briefs.mjs";

test("genomic compact accounts retain abbreviation expansions in both receiving readings", async () => {
  const root = new URL("../../context-canvas-project-surface/", import.meta.url);
  for (const receiver of ["data/debrief-case-briefs.source.html", "context-canvas/debriefs.html", "context-canvas/genomic-viewer-replatforming.html"]) {
    const source = await readFile(new URL(receiver, root), "utf8");
    assert.match(source, /<abbr title="Google Web Toolkit">GWT<\/abbr>/u, `${receiver} explains GWT`);
  }
});

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

test("catalog, compact source and case study edits synchronize through the normal build and survive formatting", async t => {
  const root = resolve(import.meta.dirname, "../..");
  const fixture = await mkdtemp(join(tmpdir(), "case-brief-build-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const tools = join(fixture, "tools");
  const surface = "context-canvas-project-surface";
  const canvas = join(fixture, surface, "context-canvas");
  const data = join(fixture, surface, "data");
  await Promise.all([tools, canvas, data].map(dir => mkdir(dir, { recursive: true })));
  await Promise.all(["materialize-debrief-case-briefs.mjs", "check-node-runtime.mjs", "node-runtime-admission.mjs"]
    .map(file => copyFile(join(root, "tools", file), join(tools, file))));
  await symlink(join(root, "node_modules"), join(fixture, "node_modules"), "dir");

  const route = "genomic-viewer-replatforming.html";
  const routeSource = await readFile(join(root, surface, "context-canvas", route), "utf8");
  const study = routeSource.replace(/(<section\b[^>]*\bid="case-brief"[^>]*>[\s\S]*?<p>)/u, "$1A new sentence by the author. ");
  assert.notEqual(study, routeSource);
  const page = join(canvas, route);
  await writeFile(page, study);

  const sourceName = "debrief-case-briefs.source.html";
  const source = await readFile(join(root, surface, "data", sourceName), "utf8");
  const entry = source.match(/<article data-case-brief-source="genomic-viewer-replatforming\.html">[\s\S]*?(?=\s*<article data-case-brief-source=)/u)[0];
  await writeFile(join(data, sourceName), `<main data-debrief-case-brief-sources><h1>Summaries</h1>${entry}</main>`);
  const catalog = join(canvas, "debriefs.html");
  const emptyCatalog = await format(`<main><div data-case-brief-routes="${route}">Author’s catalog introduction.</div></main><!-- /content class on main -->`, { parser: "html" });
  assert.match(emptyCatalog, /<\/main>\s+<!-- \/content class on main -->/u);
  await writeFile(catalog, emptyCatalog);
  const run = (...args) => execFileSync(process.execPath, [join(tools, "materialize-debrief-case-briefs.mjs"), ...args], { encoding: "utf8", stdio: "pipe" });

  run();
  const generated = await readFile(catalog, "utf8");
  assert.ok(generated.includes(`data-case-brief-projection="${route}"`));
  assert.ok(generated.includes("Author’s catalog introduction."));
  assert.ok(generated.includes("A new sentence by the author."));
  const formatted = await format(generated, { parser: "html" });
  await writeFile(catalog, formatted);
  run("--check");
  run();
  assert.equal(await readFile(catalog, "utf8"), formatted);
  assert.equal(await readFile(page, "utf8"), study);

  const minifier = JSON.parse(await readFile(join(root, "html-minifier.config.json"), "utf8"));
  const minified = await minify(formatted, minifier);
  assert.ok(minified.includes(`data-case-brief-projection="${route}"`), "Compact HTML keeps quotes on attribute values");
  assert.equal(await format(minified, { parser: "html" }), formatted);
  await writeFile(catalog, minified);
  run("--check");
  run();
  assert.equal(await readFile(catalog, "utf8"), minified);

  for (const [invalid, message] of [
    [minified.replace('data-case-brief-projection="' + route, 'data-case-brief-projection="foreign.html'), /declared case-study routes and order/u],
    [minified.replace("<!-- debrief-case-brief-projections:end -->", "<p>New author copy.</p><!-- debrief-case-brief-projections:end -->"), /only direct case-study templates/u],
    [minified.replace("<!-- debrief-case-brief-projections:end -->", "").replace("</main>", "</main><!-- debrief-case-brief-projections:end -->"), /only direct case-study templates|unmatched closing main/u],
    [minified.replace("<!-- debrief-case-brief-projections:start -->", "").replace("<!-- debrief-case-brief-projections:end -->", "<!-- debrief-case-brief-projections:start --><!-- debrief-case-brief-projections:end -->"), /inside the catalog projection markers/u],
  ]) {
    await writeFile(catalog, invalid);
    assert.throws(() => run(), message);
    assert.equal(await readFile(catalog, "utf8"), invalid);
  }
  const extraEdit = minified.replace("Related figures and media", "Figures in this case study");
  assert.notEqual(extraEdit, minified);
  await writeFile(catalog, extraEdit);
  run();
  run("--check");
  assert.ok((await readFile(join(data, sourceName), "utf8")).includes("Figures in this case study"));
  assert.equal(await readFile(page, "utf8"), study);
  await writeFile(catalog, minified);
  run();

  const baseText = "A new sentence by the author.";
  const catalogText = "Revised in the catalog with <em>inline emphasis</em>, &lt;sample&gt;, and &amp;lt;.";
  const revisedCatalog = minified.replace(baseText, catalogText);
  await writeFile(catalog, revisedCatalog);
  assert.throws(() => run("--check"), /needs synchronized case summaries/u);
  const oldCompact = await readFile(join(data, sourceName), "utf8");
  run();
  assert.equal(await readFile(catalog, "utf8"), revisedCatalog);
  const revisedPage = await readFile(page, "utf8");
  assert.ok(revisedPage.includes(catalogText));
  assert.ok((await readFile(join(data, sourceName), "utf8")).includes(catalogText));

  // Resume the state after the visible receivers were written and before the checkpoint advanced.
  await writeFile(join(data, sourceName), oldCompact);
  run();
  run("--check");
  assert.equal(await readFile(page, "utf8"), revisedPage);
  assert.equal(await readFile(catalog, "utf8"), revisedCatalog);

  const compact = await readFile(join(data, sourceName), "utf8");
  const compactText = "Revised in the compact source.";
  await writeFile(join(data, sourceName), compact.replace(catalogText, compactText));
  run();
  run("--check");
  assert.ok((await readFile(page, "utf8")).includes(compactText));
  const currentCatalog = await readFile(catalog, "utf8");
  assert.ok(currentCatalog.includes(compactText));
  const editedCatalog = currentCatalog.replace(compactText, "Concurrent catalog edit.");
  const editedPage = revisedPage.replace(catalogText, "Concurrent page edit.");
  const checkpoint = await readFile(join(data, sourceName), "utf8");
  await writeFile(catalog, editedCatalog);
  await writeFile(page, editedPage);
  assert.throws(() => run(), /genomic-viewer-replatforming\.html At-a-Glance has different edits/u);
  assert.equal(await readFile(catalog, "utf8"), editedCatalog);
  assert.equal(await readFile(page, "utf8"), editedPage);
  assert.equal(await readFile(join(data, sourceName), "utf8"), checkpoint);

  await writeFile(page, editedPage.replace("</main>", '<span id="case-brief"></span></main>'));
  assert.throws(() => run(), /exactly one #case-brief; found 2/u);
  assert.equal(await readFile(catalog, "utf8"), editedCatalog);

  // A newly declared study may still carry its original empty #case-brief anchor.
  const legacy = routeSource.replace(/<!-- debrief-at-a-glance-projection:start -->[\s\S]*?<!-- debrief-at-a-glance-projection:end -->/u, '<span id="case-brief" aria-hidden="true"></span>');
  assert.notEqual(legacy, routeSource);
  await writeFile(page, legacy);
  await writeFile(catalog, emptyCatalog);
  await writeFile(join(data, sourceName), `<main data-debrief-case-brief-sources><h1>Summaries</h1>${entry.replace(/<!-- case-brief-sync [^>]+-->/u, "")}</main>`);
  run();
  run("--check");
  assert.match(await readFile(page, "utf8"), /<section id="case-brief"/u);

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
