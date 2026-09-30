import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { checkReadmeRoutes } from "../../tools/check-readme-routes.mjs";

async function fixture() {
  return mkdtemp(join(tmpdir(), "readme-routes-"));
}

test("accepts local files, directory routes, and Markdown fragments", async () => {
  const root = await fixture();
  await mkdir(join(root, "guide"), { recursive: true });
  await writeFile(join(root, "README.md"), [
    "# Root",
    "",
    "[Guide](guide/)",
    "[Named section](guide/README.md#reader-job)",
  ].join("\n"));
  await writeFile(join(root, "guide", "README.md"), "# Guide\n\n## Reader job\n\nUseful route.\n");

  const result = await checkReadmeRoutes(root);
  assert.deepEqual(result.findings, []);
  assert.equal(result.readmeCount, 2);
  assert.equal(result.fragmentCount, 1);
});

test("reports missing targets and fragments as distinct route failures", async () => {
  const root = await fixture();
  await writeFile(join(root, "README.md"), [
    "# Root",
    "",
    "[Missing file](missing.md)",
    "[Missing section](README.md#missing-section)",
  ].join("\n"));

  const result = await checkReadmeRoutes(root);
  assert.deepEqual(result.findings.map(({ kind }) => kind), ["missing-target", "missing-fragment"]);
});

test("does not create Markdown anchors from fenced examples", async () => {
  const root = await fixture();
  await writeFile(join(root, "README.md"), [
    "# Root",
    "",
    "[Fenced ghost](target.md#fenced-ghost)",
    "[Inline ghost](target.md#inline-ghost)",
    "[Inline HTML ghost](target.md#html-ghost)",
    "[Code heading](target.md#details-behavior)",
  ].join("\n"));
  await writeFile(join(root, "target.md"), [
    "# Target",
    "",
    "```md",
    "# Fenced ghost",
    "```",
    "",
    "`## Inline ghost`",
    "",
    "`<a id=\"html-ghost\"></a>`",
    "",
    "## `<details>` behavior",
  ].join("\n"));

  const result = await checkReadmeRoutes(root);
  assert.deepEqual(result.findings.map(({ kind }) => kind), ["missing-fragment", "missing-fragment", "missing-fragment"]);
});

test("rejects absolute and parent routes without reading host paths", async () => {
  const root = await fixture();
  await writeFile(join(root, "README.md"), [
    "# Root",
    "",
    "[Host file](/etc/hosts)",
    "[Parent file](../outside.md)",
  ].join("\n"));

  const result = await checkReadmeRoutes(root);
  assert.deepEqual(result.findings.map(({ kind }) => kind), ["outside-repository", "outside-repository"]);
});

test("rejects a repository-local symlink whose target escapes the repository", async () => {
  const root = await fixture();
  const external = await fixture();
  const externalTarget = join(external, "target.md");
  await writeFile(externalTarget, "# External\n");
  await symlink(externalTarget, join(root, "linked.md"));
  await writeFile(join(root, "README.md"), "# Root\n\n[Linked](linked.md)\n");

  const result = await checkReadmeRoutes(root);
  assert.deepEqual(result.findings.map(({ kind }) => kind), ["outside-repository"]);
});

test("checks reference definitions and leaves fenced examples at rest", async () => {
  const root = await fixture();
  await writeFile(join(root, "README.md"), [
    "# Root",
    "",
    "[Missing][target]",
    "",
    "[target]: missing.md",
    "",
    "```md",
    "[Illustration](also-missing.md)",
    "```",
    "",
    "`[Inline example](also-inline.md)`",
    "",
    "> ```md",
    "> [Quoted example](also-quoted.md)",
    "> ```",
    "",
    "- ```md",
    "  [List example](also-listed.md)",
    "  ```",
    "",
    "> - ```md",
    ">   [Nested example](also-nested.md)",
    ">   ```",
  ].join("\n"));

  const result = await checkReadmeRoutes(root);
  assert.equal(result.localLinkCount, 1);
  assert.deepEqual(result.findings.map(({ kind, destination }) => ({ kind, destination })), [
    { kind: "missing-target", destination: "missing.md" },
  ]);
});

test("checks blockquoted references and closes ordered-list fences at their content indent", async () => {
  const root = await fixture();
  await writeFile(join(root, "README.md"), [
    "# Root",
    "",
    "> [Quoted][target]",
    "> [target]: missing-quoted.md",
    "",
    "[Multiline][multi]",
    "[multi]:",
    "  missing-multi.md",
    "",
    "10. ```md",
    "    [Ordered example](ignored.md)",
    "    ```",
    "",
    "[After fence](missing-after.md)",
  ].join("\n"));

  const result = await checkReadmeRoutes(root);
  assert.equal(result.localLinkCount, 3);
  assert.deepEqual(result.findings.map(({ kind, destination }) => ({ kind, destination })), [
    { kind: "missing-target", destination: "missing-after.md" },
    { kind: "missing-target", destination: "missing-quoted.md" },
    { kind: "missing-target", destination: "missing-multi.md" },
  ]);
});

test("ends an unclosed fence when its blockquote or list container ends", async () => {
  const root = await fixture();
  await writeFile(join(root, "README.md"), [
    "# Root",
    "",
    "> ```md",
    "> [Quoted example](ignored-quoted.md)",
    "[After quote](missing-after-quote.md)",
    "",
    "10. ```md",
    "    [Ordered example](ignored-ordered.md)",
    "[After list](missing-after-list.md)",
    "",
    "- Item with a continuation fence",
    "",
    "  ```md",
    "  [Continuation example](ignored-continuation.md)",
    "[After continuation list](missing-after-continuation.md)",
  ].join("\n"));

  const result = await checkReadmeRoutes(root);
  assert.deepEqual(result.findings.map(({ kind, destination }) => ({ kind, destination })), [
    { kind: "missing-target", destination: "missing-after-quote.md" },
    { kind: "missing-target", destination: "missing-after-list.md" },
    { kind: "missing-target", destination: "missing-after-continuation.md" },
  ]);
});

test("requires every active skill to appear exactly once in the skill catalog", async () => {
  const root = await fixture();
  await mkdir(join(root, ".agents", "skills", "example"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Root\n");
  await writeFile(join(root, ".agents", "skills", "README.md"), [
    "# Skills",
    "",
    "```md",
    "[Example](example/SKILL.md)",
    "```",
  ].join("\n"));
  await writeFile(join(root, ".agents", "skills", "example", "SKILL.md"), "---\nname: example\n---\n");

  const result = await checkReadmeRoutes(root);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].kind, "skill-catalog-membership");
  assert.equal(result.findings[0].occurrences, 0);
});

test("requires a skill catalog when active skills exist", async () => {
  const root = await fixture();
  await mkdir(join(root, ".agents", "skills", "example"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Root\n");
  await writeFile(join(root, ".agents", "skills", "example", "SKILL.md"), "---\nname: example\n---\n");

  const result = await checkReadmeRoutes(root);
  assert.deepEqual(result.findings.map(({ kind }) => kind), ["missing-skill-catalog"]);
});

test("rejects skill root, catalog, and contract symlinks that escape the repository", async (t) => {
  await t.test("skill root", async () => {
    const root = await fixture();
    const external = await fixture();
    await mkdir(join(root, ".agents"), { recursive: true });
    await mkdir(join(external, "example"), { recursive: true });
    await writeFile(join(root, "README.md"), "# Root\n");
    await writeFile(join(external, "README.md"), "# External skills\n");
    await writeFile(join(external, "example", "SKILL.md"), "---\nname: example\n---\n");
    await symlink(external, join(root, ".agents", "skills"));

    const result = await checkReadmeRoutes(root);
    assert.deepEqual(result.findings.map(({ kind }) => kind), ["outside-repository"]);
  });

  await t.test("skill catalog", async () => {
    const root = await fixture();
    const external = await fixture();
    await mkdir(join(root, ".agents", "skills", "example"), { recursive: true });
    await writeFile(join(root, "README.md"), "# Root\n");
    await writeFile(join(root, ".agents", "skills", "example", "SKILL.md"), "---\nname: example\n---\n");
    await writeFile(join(external, "README.md"), "# Skills\n\n[Example](example/SKILL.md)\n");
    await symlink(join(external, "README.md"), join(root, ".agents", "skills", "README.md"));

    const result = await checkReadmeRoutes(root);
    assert.deepEqual(result.findings.map(({ kind }) => kind), ["outside-repository"]);
  });

  await t.test("skill contract", async () => {
    const root = await fixture();
    const external = await fixture();
    await mkdir(join(root, ".agents", "skills", "example"), { recursive: true });
    await writeFile(join(root, "README.md"), "# Root\n");
    await writeFile(join(root, ".agents", "skills", "README.md"), "# Skills\n");
    await writeFile(join(external, "SKILL.md"), "---\nname: example\n---\n");
    await symlink(join(external, "SKILL.md"), join(root, ".agents", "skills", "example", "SKILL.md"));

    const result = await checkReadmeRoutes(root);
    assert.deepEqual(result.findings.map(({ kind }) => kind), ["outside-repository"]);
  });
});
