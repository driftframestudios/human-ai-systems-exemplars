import assert from "node:assert/strict";
import {
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import test from "node:test";

import {
  derivativePlan,
  generateDerivative,
  processDerivativeFamilies,
  readWebpDimensions,
  settleIneligibleDerivative,
} from "../../tools/generate-debrief-image-derivatives.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const fixtureRoot = join(
  repositoryRoot,
  "context-canvas-project-surface/img/debriefs/boolean-building-blocks",
);
const sourceFixture = join(fixtureRoot, "clinical-trial-biomarkers-investigation.webp");
const derivativeFixture = join(
  fixtureRoot,
  "clinical-trial-biomarkers-investigation-960.webp",
);
const whoToBelieveFixtureRoot = join(
  repositoryRoot,
  "context-canvas-project-surface/img/debriefs/who-to-believe",
);

test("Debrief derivative plan retains source ratio and excludes upscaling", () => {
  assert.deepEqual(
    derivativePlan({ width: 2_400, height: 1_351 }),
    [
      { width: 960, height: 541 },
      { width: 1_920, height: 1_081 },
    ],
  );
  assert.deepEqual(
    derivativePlan({ width: 1_920, height: 1_080 }),
    [{ width: 960, height: 540 }],
    "A candidate equal to the accepted source width is not regenerated",
  );
  assert.deepEqual(
    derivativePlan({ width: 800, height: 450 }),
    [],
    "Candidates wider than the accepted source are not generated",
  );
});

test("tracked Debrief derivatives preserve exact dimensions and source ratio", async () => {
  assert.deepEqual(await readWebpDimensions(sourceFixture), {
    width: 5_114,
    height: 2_706,
  });
  assert.deepEqual(await readWebpDimensions(derivativeFixture), {
    width: 960,
    height: 508,
  });

  const beforeCheck = await readFile(derivativeFixture);
  assert.deepEqual(await processDerivativeFamilies({ check: true }), {
    processed: 61,
    skipped: 1,
    removed: 0,
  });
  assert.deepEqual(
    await readFile(derivativeFixture),
    beforeCheck,
    "Check mode leaves accepted derivative bytes unchanged",
  );
});

test("Who To Believe comparison images carry both responsive widths", async () => {
  const family = new Map([
    ["cpg-pharma-dual-stack-system-graph", [[3_330, 2_030], [960, 586], [1_920, 1_171]]],
    ["cpg-pharma-member-experience-before", [[3_972, 2_554], [960, 618], [1_920, 1_235]]],
    ["cpg-pharma-member-experience-redesigned", [[2_874, 3_931], [960, 1_314], [1_920, 2_627]]],
    ["cpg-pharma-redesign-concept-matrix", [[3_394, 2_474], [960, 700], [1_920, 1_400]]],
    ["cpg-pharma-review-service-model-after", [[4_980, 2_280], [960, 440], [1_920, 880]]],
    ["cpg-pharma-review-service-model-before", [[4_988, 1_814], [960, 350], [1_920, 699]]],
  ]);

  for (const [basename, expectedDimensions] of family) {
    const paths = [
      `${basename}.webp`,
      `${basename}-960.webp`,
      `${basename}-1920.webp`,
    ];
    for (const [index, filename] of paths.entries()) {
      const [width, height] = expectedDimensions[index];
      assert.deepEqual(
        await readWebpDimensions(join(whoToBelieveFixtureRoot, filename)),
        { width, height },
        filename,
      );
    }
  }
});

test("Who To Believe catalog orientation image carries its eligible responsive width", async () => {
  assert.deepEqual(
    await readWebpDimensions(join(whoToBelieveFixtureRoot, "who-to-believe-upfront.webp")),
    { width: 1_728, height: 2_356 },
  );
  assert.deepEqual(
    await readWebpDimensions(join(whoToBelieveFixtureRoot, "who-to-believe-upfront-960.webp")),
    { width: 960, height: 1_309 },
  );
  await assert.rejects(
    readWebpDimensions(join(whoToBelieveFixtureRoot, "who-to-believe-upfront-1920.webp")),
    /ENOENT/u,
    "The derivative family excludes upscaling above the accepted source width",
  );
});

test("ineligible candidates are reported by checks and removed by builds", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "debrief-derivative-ineligible-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const targetPath = join(directory, "accepted-source-1920.webp");
  await copyFile(derivativeFixture, targetPath);

  await assert.rejects(
    settleIneligibleDerivative({ targetPath, check: true }),
    /obsolete derivative at or above its accepted source width/u,
  );
  assert.equal(
    await settleIneligibleDerivative({ targetPath, check: false }),
    true,
  );
  assert.equal(
    await settleIneligibleDerivative({ targetPath, check: false }),
    false,
    "A settled target remains absent on repeated builds",
  );
});

test("generation verifies a same-directory temporary file before atomic replacement", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "debrief-derivative-atomic-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = join(directory, "accepted-source.webp");
  const targetPath = join(directory, "accepted-source-960.webp");
  await copyFile(sourceFixture, sourcePath);
  await writeFile(targetPath, "previous incomplete output");

  await generateDerivative({
    sourcePath,
    targetPath,
    expectedWidth: 960,
    encode: async (_source, temporaryPath) => copyFile(derivativeFixture, temporaryPath),
  });

  assert.deepEqual(await readWebpDimensions(targetPath), { width: 960, height: 508 });
  assert.equal((await readFile(targetPath)).toString("ascii", 0, 4), "RIFF");
  assert.deepEqual(
    (await readdir(directory)).sort(),
    [basename(sourcePath), basename(targetPath)].sort(),
    "The verified temporary output leaves no partial file behind",
  );
});

test("failed generation removes its temporary output and preserves the prior target", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "debrief-derivative-failure-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = join(directory, "accepted-source.webp");
  const targetPath = join(directory, "accepted-source-960.webp");
  const priorOutput = Buffer.from("prior accepted output");
  await copyFile(sourceFixture, sourcePath);
  await writeFile(targetPath, priorOutput);

  await assert.rejects(
    generateDerivative({
      sourcePath,
      targetPath,
      expectedWidth: 960,
      encode: async (_source, temporaryPath) => {
        await writeFile(temporaryPath, "partial output");
        throw new Error("simulated encoder failure");
      },
    }),
    /simulated encoder failure/u,
  );

  assert.deepEqual(await readFile(targetPath), priorOutput);
  assert.deepEqual(
    (await readdir(directory)).sort(),
    [basename(sourcePath), basename(targetPath)].sort(),
  );
});
