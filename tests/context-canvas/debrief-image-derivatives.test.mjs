import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import test from "node:test";

import {
  compileDerivativeJobs,
  configuredDerivativeWidths,
  derivativePlan,
  derivativeProfiles,
  generateDerivative,
  processDerivativeFamilies,
  readWebpDimensions,
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
    processed: 82,
    skipped: 1,
    removed: 0,
  });
  assert.deepEqual(
    await readFile(derivativeFixture),
    beforeCheck,
    "Check mode leaves accepted derivative bytes unchanged",
  );
});

test("catalog media profiles declare their responsive candidates independently", async () => {
  assert.deepEqual(configuredDerivativeWidths(), [480, 960, 1_920]);
  const jobs = new Map(
    (await compileDerivativeJobs()).map(job => [
      job.sourcePath.replace(`${repositoryRoot}/context-canvas-project-surface/img/debriefs/`, ""),
      job,
    ]),
  );
  const expected = new Map([
    ["choose-your-player/robotics-upfront.webp", "catalog-card"],
    ["sample-noone-could-find/clinical-trial-coordination-upfront.webp", "catalog-preview"],
    ["spatial-capture/3d-modeling-scan.webp", "catalog-card"],
  ]);

  for (const [relativePath, profileId] of expected) {
    assert.equal(jobs.get(relativePath)?.profileId, profileId, relativePath);
    assert.deepEqual(jobs.get(relativePath)?.widths, [480, 960, 1_920], relativePath);
  }
  assert.equal(derivativeProfiles.sources.length, 2);
});

test("catalog sources and responsive derivatives preserve exact accepted geometry", async () => {
  const expected = new Map([
    ["choose-your-player/robotics-upfront.webp", [5_116, 2_710]],
    ["choose-your-player/robotics-upfront-480.webp", [480, 255]],
    ["choose-your-player/robotics-upfront-960.webp", [960, 509]],
    ["choose-your-player/robotics-upfront-1920.webp", [1_920, 1_018]],
    ["sample-noone-could-find/clinical-trial-coordination-upfront.webp", [2_654, 1_482]],
    ["sample-noone-could-find/clinical-trial-coordination-upfront-480.webp", [480, 269]],
    ["sample-noone-could-find/clinical-trial-coordination-upfront-960.webp", [960, 537]],
    ["sample-noone-could-find/clinical-trial-coordination-upfront-1920.webp", [1_920, 1_073]],
    ["spatial-capture/3d-modeling-scan.webp", [2_160, 1_802]],
    ["spatial-capture/3d-modeling-scan-480.webp", [480, 401]],
    ["spatial-capture/3d-modeling-scan-960.webp", [960, 801]],
    ["spatial-capture/3d-modeling-scan-1920.webp", [1_920, 1_602]],
  ]);

  for (const [relativePath, [width, height]] of expected) {
    assert.deepEqual(
      await readWebpDimensions(join(repositoryRoot, "context-canvas-project-surface/img/debriefs", relativePath)),
      { width, height },
      relativePath,
    );
  }
});

test("accepted source identities stay pinned to the reviewed bytes", async () => {
  const expected = new Map([
    ["boolean-building-blocks/clinical-trial-context-tree.webp", "56898a1a192e5e029d3f64c551bff8ca9b4ebd97e7f6b7228bdcfc4d70f0ef8d"],
    ["boolean-building-blocks/clinical-trial-situation-model-player-cards.webp", "4b60295084fdcda1ae0ee705811a6619dcf1fdee69dc2d0cdd5091d25875b7fa"],
    ["boolean-building-blocks/clinical-trial-specification-suite.webp", "8ae40ccc6d93e622c00f9be4515616bd91b348b0c7c50c0bcd0b931f51f98443"],
    ["boolean-building-blocks/clinical-trial-strategy-canvas.webp", "fe16e7d8b3b642929230ebee10f294107e102b4224f56db493b3d8cf138b1918"],
    ["choose-your-player/robotics-upfront.webp", "ab3f208e0ea8b92a0a594602741dfc5227e081a2198fa027938fbfc68a77a81a"],
    ["queue-secretly-status-machine/genomics-situation-model-player-cards.webp", "53d948f1bfc26ef002fb61db169fd2f9ec36ace6a9ae1b7faa17dc4c1035cfb1"],
    ["queue-secretly-status-machine/genomics-specification-suite-strategy-canvas.webp", "55d880f4b54d5a50ee579ed32244260be0dd86f36a7a33477958bcf5b9078dd6"],
    ["sample-noone-could-find/clinical-trial-coordination-upfront.webp", "92a108357c71a0697e9573380db57490549f07404f1f21ae31c1d2c138607833"],
    ["spatial-capture/3d-modeling-scan.webp", "415675935c936bf69ee822e4e6608dd5d05c780c0c2d4b033782f8a4d1484766"],
  ]);

  for (const [relativePath, digest] of expected) {
    const bytes = await readFile(join(
      repositoryRoot,
      "context-canvas-project-surface/img/debriefs",
      relativePath,
    ));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), digest, relativePath);
  }
});

test("profile checks distinguish missing, stale, and unexpected derivative state", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "debrief-derivative-profile-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const family = join(root, "family");
  await mkdir(family);
  const sourcePath = join(family, "accepted-source.webp");
  await copyFile(sourceFixture, sourcePath);
  const familyProfiles = {
    families: [{ id: "full", directories: ["family"], widths: [960] }],
    sources: [],
  };

  await assert.rejects(
    processDerivativeFamilies({ check: true, root, profiles: familyProfiles }),
    /is missing\. Run npm run build:debrief-image-derivatives/u,
  );

  await copyFile(derivativeFixture, join(family, "accepted-source-777.webp"));
  await assert.rejects(
    processDerivativeFamilies({ check: true, root, profiles: familyProfiles }),
    /unexpected derivative[\s\S]*configured widths are 960/u,
  );
  await assert.rejects(
    processDerivativeFamilies({ check: false, root, profiles: familyProfiles }),
    /unexpected derivative[\s\S]*configured widths are 960/u,
  );
  await assert.rejects(
    readWebpDimensions(join(family, "accepted-source-960.webp")),
    /ENOENT/u,
    "The naming preflight completes before a build writes derivatives",
  );

  await rm(join(family, "accepted-source-777.webp"));
  await copyFile(derivativeFixture, join(family, "accepted-source-960.webp"));
  await copyFile(derivativeFixture, join(family, "accepted-source-1920.webp"));
  const overrideProfiles = {
    families: [{ id: "full", directories: ["family"], widths: [960, 1_920] }],
    sources: [{ id: "card", paths: ["family/accepted-source.webp"], widths: [960] }],
  };
  await assert.rejects(
    processDerivativeFamilies({ check: true, root, profiles: overrideProfiles }),
    /stale derivative/u,
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

test("orphan derivatives are reported by checks and removed idempotently by builds", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "debrief-derivative-orphan-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const family = join(root, "family");
  await mkdir(family);
  const orphanPath = join(family, "retired-source-960.webp");
  await copyFile(derivativeFixture, orphanPath);
  const profiles = {
    families: [{ id: "full", directories: ["family"], widths: [960, 1_920] }],
    sources: [],
  };

  await assert.rejects(
    processDerivativeFamilies({ check: true, root, profiles }),
    /orphan derivative[\s\S]*accepted source[\s\S]*retired-source\.webp is missing/u,
  );
  assert.deepEqual(
    await processDerivativeFamilies({ check: false, root, profiles }),
    { processed: 0, skipped: 0, removed: 1 },
  );
  await assert.rejects(readWebpDimensions(orphanPath), /ENOENT/u);
  assert.deepEqual(
    await processDerivativeFamilies({ check: false, root, profiles }),
    { processed: 0, skipped: 0, removed: 0 },
    "A settled orphan remains absent on repeated builds",
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
