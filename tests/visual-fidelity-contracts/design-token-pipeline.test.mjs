import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repositoryRoot, relativePath), "utf8");

test("design-token guidance separates authority, exchange, compilation, and receiving adapters", async () => {
  const foundation = await read("visual-fidelity-contracts/foundations/design-token-pipeline.md");

  for (const phrase of [
    "immutable source snapshot and leakage inspection",
    "reviewed DTCG compatibility subset",
    "version-pinned Style Dictionary build",
    "candidate CSS / JavaScript / native artifacts",
    "receiving adapter for React Aria, React Stately, React Spectrum, or another UI",
    "accepted manifest and recoverable publication pointer"
  ]) {
    assert.match(foundation, new RegExp(phrase.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }

  assert.match(foundation, /Community Group Final\s+Report intended for implementation/u);
  assert.match(foundation, /outside the W3C Standards Track/u);
  assert.match(foundation, /current release is\s+`5\.7\.0`/u);
  assert.match(foundation, /releases\/tag\/v5\.7\.0/u);
  assert.match(foundation, /v5\.7\.0\/package\.json/u);
  assert.match(foundation, /custom transforms use `filter` and `transform`/u);
  assert.match(foundation, /JSON Pointer\s+`\$ref`/u);
  assert.match(foundation, /preservation is\s+an admission requirement/u);
  assert.match(foundation, /## Bound intake before graph expansion/u);
  assert.match(foundation, /`RESOURCE_ENVELOPE_EXCEEDED`/u);
  assert.match(foundation, /configured resource limits and observed maxima/u);
  assert.match(foundation, /## Completion and re-entry/u);
  assert.doesNotMatch(foundation, /matcher\s*:/u);
  assert.doesNotMatch(foundation, /transformer\s*:/u);
  assert.doesNotMatch(foundation, /generic token object.+Provider theme/iu);
});

test("probe family covers each named system and its recovery evidence", async () => {
  const probes = await read("visual-fidelity-contracts/probes/design-token-pipelines/README.md");

  const expectedProbes = [
    "VF-T1 · Figma source capture and publication",
    "VF-T2 · DTCG compatibility and semantic round trip",
    "VF-T3 · Style Dictionary build, collision, and recovery",
    "VF-T4 · React Stately ownership and collection identity",
    "VF-T5 · React Aria behavior with a contract-owned visual language",
    "VF-T6 · React Spectrum generation and supported styling boundary"
  ];

  for (const heading of expectedProbes) assert.match(probes, new RegExp(heading, "u"));
  assert.equal((probes.match(/\*\*Controlled fault:\*\*/gu) ?? []).length, expectedProbes.length);
  assert.equal((probes.match(/\*\*Expected observation:\*\*/gu) ?? []).length, expectedProbes.length);
  assert.equal((probes.match(/\*\*Receipt:\*\*/gu) ?? []).length, expectedProbes.length);
  assert.equal((probes.match(/\*\*Instruction yield:\*\*/gu) ?? []).length, expectedProbes.length);
  assert.match(probes, /JSON Pointer reference support/u);
  assert.match(probes, /Graph admission\s+should target `O\(N \+ E\)`/u);
  assert.match(probes, /configured resource\s+limits;\s*observed maxima/u);
});

test("pipeline guidance closes resolver, executable-code, synchronization, and target-grammar boundaries", async () => {
  const [foundation, probes, skill, reference, research] = await Promise.all([
    read("visual-fidelity-contracts/foundations/design-token-pipeline.md"),
    read("visual-fidelity-contracts/probes/design-token-pipelines/README.md"),
    read(".agents/skills/design-token-pipeline-stewardship/SKILL.md"),
    read(".agents/skills/design-token-pipeline-stewardship/references/tool-and-runtime-boundaries.md"),
    read("planning/visual-fidelity-contracts/figma-token-pipeline-research-spike.md")
  ]);
  const documents = [
    ["foundation", foundation],
    ["probes", probes],
    ["skill", skill],
    ["reference", reference],
    ["research", research]
  ];
  const corpus = documents.map(([, source]) => source).join("\n");

  for (const phrase of [
    "application/design-tokens+json",
    "application/json",
    "sets",
    "modifiers",
    "resolutionOrder",
    "later sources replace earlier",
    "Retry-After",
    "unknown outcome",
    "lockfile-verified",
    "staging root",
    "destination containment",
    "target grammar",
    "collisions after normalization",
    "Spectrum 2 Provider innermost",
    "@react-spectrum/s2/page.css",
    "{type: 'macro'}"
  ]) {
    assert.match(corpus, new RegExp(phrase.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }

  for (const [name, source] of documents) {
    assert.match(source, /one participating writer|one-writer|writer or lease/iu, `${name} names synchronization ownership`);
    assert.match(source, /rolling\s+expected\s+checkpoint/iu, `${name} advances a rolling checkpoint`);
    assert.match(source, /lost-update\s+standing/iu, `${name} separates concurrency standing from target-state equality`);
    assert.match(source, /string-valued (?:Resolver )?inputs|Resolver input values are strings/iu, `${name} admits Resolver strings`);
    assert.match(source, /case-(?:comparison )?policy|case-insensitive/iu, `${name} declares Resolver case comparison`);
    assert.match(source, /(?:OS- or runtime-)?sandboxed\s+process\s+or\s+container/iu, `${name} requires runtime isolation for executable configuration`);
    assert.match(source, /tempIdToRealId/u, `${name} carries request-scoped Figma identities forward`);
    assert.match(source, /topological(?:ly| order)/iu, `${name} orders dependent Figma batches`);
    assert.match(source, /canonically parse|canonical URL/iu, `${name} canonicalizes external Resolver locations`);
    assert.match(source, /resolved[- ]address/iu, `${name} validates network destination classes`);
    assert.match(source, /connect(?:ion)? only to one\s+validated\s+address/iu, `${name} binds the connection to its admitted DNS result`);
    assert.match(source, /TLS SNI/iu, `${name} preserves hostname-based TLS verification`);
    assert.match(source, /decompressed[- ]byte|decompressed bytes/iu, `${name} bounds expanded response bytes`);
    assert.doesNotMatch(source, /fixed initial (?:source )?(?:revision|digest|checkpoint)/iu, `${name} avoids a stale fixed precondition`);
  }

  assert.match(foundation, /volume alone is a portability adapter rather than an isolation boundary/iu);
  assert.match(probes, /volume stays a\s+file-routing adapter/iu);
  assert.match(skill, /volume may route tool-owned file operations inside the sandbox/iu);
  assert.match(reference, /volume may redirect tool-owned file operations inside the sandbox/iu);
  assert.match(research, /volume provides file routing and portability\s+inside that sandbox/iu);

  assert.match(foundation, /When shared-library distribution is in\s+scope/iu);
  assert.match(probes, /route that uses a\s+shared\s+Figma\s+library\s+publishes/iu);
  assert.match(skill, /Publish a shared library only when that distribution/iu);
  assert.match(reference, /route that distributes through a shared library publishes/iu);
  assert.match(research, /When shared-library\s+distribution belongs to the receiving contract/iu);

  for (const [name, source] of [
    ["foundation", foundation],
    ["probes", probes],
    ["reference", reference],
    ["research", research]
  ]) {
    assert.match(source, /Vᵣ|vᵣ/u, `${name} separates selected Resolver coordinates`);
    assert.match(source, /Vₒ|vₒ/u, `${name} separates other non-platform variants`);
    assert.match(source, /[Vv]ᵣ\s*(?:\([^\n]*[Dd]\s*\+\s*[Ee]|[Vv]ₒ)/u, `${name} states the resolved expansion cost`);
    assert.doesNotMatch(source, /(?<![ᵣ\w])V\s*≤\s*R/u, `${name} avoids conflating resolver and other variant axes`);
  }

  assert.match(corpus, /R = ∏Cᵢ/u);
  assert.match(corpus, /filesystem references resolve under|Resolve file references beneath/iu);
  assert.match(corpus, /redirect policy|redirect validation/u);
  assert.match(corpus, /parse or compile and lint|Parse, compile, or lint/u);
  assert.match(corpus, /platform coordinate (?:remains|stays) separate/iu);
  assert.match(reference, /defines atomicity at one request/u);
  assert.match(skill, /reviewed executable code/u);
  assert.match(research, /unknown\s+POST\s+outcomes/u);
});

test("skill publication selection closes every repository skill and its declared dependencies", async () => {
  const selection = JSON.parse(await read(".agents/skills/publication-selection.json"));
  const skillRoot = path.join(repositoryRoot, ".agents/skills");
  const directories = await readdir(skillRoot, { withFileTypes: true });
  const skillNames = [];

  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    try {
      await readFile(path.join(skillRoot, directory.name, "SKILL.md"));
      skillNames.push(directory.name);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const manifestNames = selection.skills.map(({ name }) => name);
  assert.deepEqual(manifestNames, [...new Set(manifestNames)].sort(), "skill entries stay unique and sorted");
  assert.deepEqual(skillNames.sort(), manifestNames, "every repository skill receives one publication decision");
  assert.ok(Array.isArray(selection.catalogDependencies));
  assert.equal(
    new Set(selection.catalogDependencies).size,
    selection.catalogDependencies.length,
    "catalog dependencies stay unique"
  );
  for (const dependency of selection.catalogDependencies) {
    await readFile(path.join(repositoryRoot, dependency));
  }

  for (const entry of selection.skills) {
    assert.equal(entry.sourcePath, `.agents/skills/${entry.name}/SKILL.md`);
    assert.ok(["public_possible", "public_ready"].includes(entry.publicationStanding));
    assert.ok(Array.isArray(entry.dependencies));
    assert.equal(new Set(entry.dependencies).size, entry.dependencies.length, `${entry.name} dependencies stay unique`);

    if (entry.publicationStanding === "public_ready") {
      assert.equal(entry.sourceAvailability, "included", `${entry.name} publishes its complete selected source`);
    } else {
      assert.equal(entry.sourceAvailability, "repository_only", `${entry.name} stays in repository review`);
      assert.deepEqual(entry.dependencies, [], `${entry.name} keeps supporting files outside the public closure`);
      assert.ok(entry.publicationNote?.trim(), `${entry.name} names its return condition`);
    }

    const skillSource = await read(entry.sourcePath);
    assert.match(skillSource, new RegExp(`^---\\nname: ${entry.name}\\n`, "u"));
    await readFile(path.join(skillRoot, entry.name, "README.md"));
    for (const dependency of entry.dependencies) {
      await readFile(path.join(repositoryRoot, dependency));
    }
  }

  const pipeline = selection.skills.find(({ name }) => name === "design-token-pipeline-stewardship");
  assert.deepEqual(
    {
      publicationStanding: pipeline?.publicationStanding,
      sourceAvailability: pipeline?.sourceAvailability
    },
    {
      publicationStanding: "public_possible",
      sourceAvailability: "repository_only"
    }
  );
});

test("form controls retain the researched scan path and caret inset", async () => {
  const [typography, componentCss, dataCss, lifecycleCss] = await Promise.all([
    read("visual-fidelity-contracts/foundations/typography-reading-measure.md"),
    read("visual-fidelity-contracts/labs/component-lab/src/styles/lab.css"),
    read("visual-fidelity-contracts/labs/data-view-lab/src/styles/lab.css"),
    read("visual-fidelity-contracts/labs/lifecycle-lab/styles.css")
  ]);

  assert.match(typography, /persistent visible label directly\s+above the field by default/u);
  assert.match(typography, /custom select indicator keeps a `12px` inset/u);

  for (const css of [componentCss, dataCss, lifecycleCss]) {
    assert.match(css, /background-position:\s*right 12px center/u);
    assert.match(css, /:dir\(rtl\)\s*\{\s*background-position:\s*left 12px center/u);
    assert.match(css, /@media \(forced-colors: active\)/u);
    assert.match(css, /appearance:\s*auto/u);
    assert.match(css, /background-image:\s*none/u);
  }
});
