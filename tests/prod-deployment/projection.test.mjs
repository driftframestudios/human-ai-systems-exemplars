import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  checkProductionProjection,
  createProductionProjectionPlan,
  inspectImageDimensions,
  loadProductionProjectionInputs,
  persistProductionProjection,
  readRepositorySourceSha,
  validateAssetInventory,
  validatePrimaryManifest,
} from "../../tools/build-prod-projection.mjs";
import { sha256 } from "../../tools/iframe-route-package-engine.mjs";

const execFileAsync = promisify(execFile);
const configurationRelativePath =
  "deployment/cpanel/production-projection.config.json";
const primaryManifestRelativePath =
  "deployment/cpanel/primary-route-manifest.json";
const assetInventoryRelativePath =
  "deployment/cpanel/asset-inventory.json";

async function git(root, args) {
  const { stdout = "" } = await execFileAsync("git", args, {
    cwd: root,
    encoding: "utf8",
  });
  return stdout.trim();
}

async function commitFixture(root, message) {
  await git(root, ["add", "-A"]);
  await git(root, ["commit", "--quiet", "-m", message]);
  return await git(root, ["rev-parse", "HEAD"]);
}

function primaryManifest(files) {
  return {
    id: "prod-projection.primary-route-manifest.v1",
    version: "1",
    files,
  };
}

function fixtureAssetInventory(selector, options = {}) {
  return {
    id: "prod-projection.asset-inventory.v1",
    version: "1",
    scope: "primary_and_iframe_selected_images",
    families: [
      {
        id: "fixture.image",
        selector,
        semantic_owner: "Fixture visitor surface",
        roles: [
          {
            id: "fixture_image",
            visitor_job: "Make the image relationship observable in the fixture.",
            accessibility_text_owner: "The fixture HTML image alternative.",
          },
        ],
        build_consumers: ["production_projection"],
        public_path_standing: {
          standing: "source_root_relative_path_preserved",
          source_root: "visitor",
        },
        source_relationship: { standing: "canonical_authored_asset" },
        recovery_condition: "Restore the fixture source and rebuild the projection.",
        semantic_authority_path: null,
      },
    ],
    variant_groups: options.variantGroups ?? [],
    overrides: options.overrides ?? [],
  };
}

function fixturePng(width = 3, height = 2) {
  const bytes = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function fixtureGif(width = 7, height = 5) {
  const bytes = Buffer.alloc(10);
  bytes.write("GIF89a", 0, "ascii");
  bytes.writeUInt16LE(width, 6);
  bytes.writeUInt16LE(height, 8);
  return bytes;
}

function aggregateFixture(options = {}) {
  const coreReceipt = Buffer.from('{"family":"core"}\n', "utf8");
  const canvasReceipt = Buffer.from('{"family":"canvas"}\n', "utf8");
  const strategyHtml = Buffer.from(
    '<!doctype html><title>Strategy</title><script type="application/json">{"$id":"https://example.test/inside"}</script>',
    "utf8",
  );
  const strategySchema = Buffer.from(
    '{"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://schemas.example.test/strategy","$ref":"#/$defs/item","$defs":{"item":{"type":"string"}}}\n',
    "utf8",
  );
  const canvasHtml = Buffer.from(
    options.canvasHtml ?? "<!doctype html><title>Canvas</title>",
    "utf8",
  );
  const outputFiles = new Map([
    ["canvas/demo/index.html", canvasHtml],
    ["core/strategy-canvas/strategy-canvas-system-v0.2/strategy-canvas.schema.json", strategySchema],
    ["core/strategy-canvas/index.html", strategyHtml],
    ["canvas/route-manifest.json", canvasReceipt],
    ["core/route-manifest.json", coreReceipt],
  ]);
  if (options.image !== undefined) {
    outputFiles.set(options.image.projectedPath, options.image.bytes);
  }
  for (const [relativePath, bytes] of options.extraOutputs ?? []) {
    outputFiles.set(relativePath, bytes);
  }
  const familySummary = (family, routeReceipt) => {
    const files = [...outputFiles.entries()].filter(
      ([relativePath]) => relativePath.startsWith(`${family}/`),
    );
    return {
      id: family,
      base_path: `/v1/${family}/`,
      family_manifest_sha256: family === "core" ? "1".repeat(64) : "2".repeat(64),
      route_receipt_file: `${family}/route-manifest.json`,
      route_receipt_sha256: sha256(routeReceipt),
      routes: 1,
      files: files.length,
      bytes: files.reduce((total, [, bytes]) => total + bytes.byteLength, 0),
    };
  };
  const receipt = {
    id: "iframe-routes.aggregate-package-receipt.v1",
    version: "1",
    host: "iframes.vik.guru",
    base_path: "/v1/",
    package_contract: {
      family_directories: ["core", "canvas"],
      primary_routes: 2,
      generated_files: outputFiles.size + 1,
      generated_bytes: 0,
      live_cloudflare_mutation: false,
    },
    families: [
      familySummary("core", coreReceipt),
      familySummary("canvas", canvasReceipt),
    ],
  };
  const familyBytes = [...outputFiles.values()].reduce(
    (total, bytes) => total + bytes.byteLength,
    0,
  );
  let rootReceipt;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    rootReceipt = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    const generatedBytes = familyBytes + rootReceipt.byteLength;
    if (receipt.package_contract.generated_bytes === generatedBytes) break;
    receipt.package_contract.generated_bytes = generatedBytes;
  }
  outputFiles.set("route-manifest.json", rootReceipt);
  return {
    receipt,
    outputFiles,
    familyPlans: new Map([
      [
        "core",
        {
          receipt: {
            package_contract: { primary_routes: 1 },
            routes: [
              {
                projection_file: "strategy-canvas/index.html",
                static_resource_closure: {
                  package_files: [
                    {
                      target_file: "strategy-canvas-system-v0.2/strategy-canvas.schema.json",
                      content_type: "application/schema+json",
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
      [
        "canvas",
        {
          receipt: {
            package_contract: { primary_routes: 1 },
            routes: [
              {
                projection_file: "demo/index.html",
                source_file: options.image?.consumerPath ?? "visitor/index.html",
                static_resource_closure: options.image === undefined
                  ? {}
                  : {
                      package_files: [
                        {
                          ...(options.image.omitSourceFile
                            ? {}
                            : { source_file: options.image.sourcePath }),
                          target_file: options.image.targetFile,
                          content_type: options.image.mediaType,
                          bytes: options.image.bytes.byteLength,
                          sha256: sha256(options.image.bytes),
                        },
                      ],
                    },
              },
            ],
          },
        },
      ],
    ]),
  };
}

async function createFixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "prod-projection-fixture-"));
  await git(root, ["init", "--quiet"]);
  await git(root, ["config", "user.name", "Projection Test"]);
  await git(root, ["config", "user.email", "projection@example.test"]);
  await mkdir(path.join(root, "visitor"), { recursive: true });
  await mkdir(path.join(root, "deployment/cpanel"), { recursive: true });
  const index = [
    "<!doctype html>",
    '<link rel="canonical" href="https://vik.guru/">',
    '<iframe src="https://iframes.vik.guru/v1/core/strategy-canvas/"></iframe>',
  ].join("\n");
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://schemas.vik.guru/example/v1/schema.json",
    $ref: "#/$defs/value",
    $defs: { value: { type: "string" } },
  };
  await writeFile(path.join(root, "visitor/index.html"), index, "utf8");
  await writeFile(
    path.join(root, "visitor/schema.json"),
    `${JSON.stringify(schema)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, primaryManifestRelativePath),
    `${JSON.stringify(primaryManifest([
      {
        source_path: "visitor/schema.json",
        projected_path: "schemas/example.json",
        media_type: "application/schema+json",
      },
      {
        source_path: "visitor/index.html",
        projected_path: "index.html",
        media_type: "text/html",
      },
    ]))}\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, configurationRelativePath),
    `${JSON.stringify({
      id: "prod-projection.configuration.v1",
      version: "1",
      primary_manifest: primaryManifestRelativePath,
    })}\n`,
    "utf8",
  );
  const sourceSha = await commitFixture(root, "Accept fixture");
  return {
    root,
    index,
    schema,
    sourceSha,
    configurationPath: path.join(root, configurationRelativePath),
    primaryManifestPath: path.join(root, primaryManifestRelativePath),
  };
}

async function enableAssetInventoryFixture(fixture) {
  const sourcePath = "visitor/photo.png";
  const projectedPath = "photo.png";
  const bytes = fixturePng();
  await writeFile(path.join(fixture.root, sourcePath), bytes);
  const indexPath = path.join(fixture.root, "visitor/index.html");
  await writeFile(
    indexPath,
    `${await readFile(indexPath, "utf8")}\n<img src="photo.png" alt="Fixture relationship">\n`,
    "utf8",
  );
  const manifest = JSON.parse(await readFile(fixture.primaryManifestPath, "utf8"));
  manifest.files.push({
    source_path: sourcePath,
    projected_path: projectedPath,
    media_type: "image/png",
  });
  await writeFile(
    fixture.primaryManifestPath,
    `${JSON.stringify(manifest)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(fixture.root, assetInventoryRelativePath),
    `${JSON.stringify(fixtureAssetInventory({ paths: [sourcePath] }))}\n`,
    "utf8",
  );
  await writeFile(
    fixture.configurationPath,
    `${JSON.stringify({
      id: "prod-projection.configuration.v1",
      version: "1",
      primary_manifest: primaryManifestRelativePath,
      asset_inventory: assetInventoryRelativePath,
      publication: {
        base_url: "https://vik.guru/",
        source_root: "visitor",
        public_reference_config: ".env.public",
      },
    })}\n`,
    "utf8",
  );
  await writeFile(path.join(fixture.root, ".gitignore"), ".env.public\n", "utf8");
  await writeFile(path.join(fixture.root, ".env.public"), "", "utf8");
  fixture.sourceSha = await commitFixture(fixture.root, "Accept asset inventory fixture");
  return { sourcePath, projectedPath, bytes };
}

async function enablePublicationFixture(fixture) {
  const canvasRoot = "context-canvas-project-surface/context-canvas";
  const projectRoot = "context-canvas-project-surface";
  const profileKey = "PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE";
  const registryKey = "PUBLIC_URL_REGISTRY_PRACTITIONER_PROBES";
  const legacyOrigin = "https://schemas.radiantnull.com/";
  const legacyBase =
    `${legacyOrigin}context-canvas-project-surface/context-canvas/`;
  const files = {
    [`${canvasRoot}/index.html`]: [
      "<!doctype html>",
      `<link rel="canonical" href="${legacyBase}">`,
      `<meta property="og:url" content="${legacyBase}">`,
      `<meta property="og:image" content="${legacyOrigin}${projectRoot}/img/photo.jpg">`,
      `<meta name="twitter:image" content="${legacyOrigin}${projectRoot}/img/photo.jpg">`,
      '<a href="../img/photo.jpg">Portrait</a>',
      '<a href="../../collaboration/demo.html#start">Example</a>',
      '<button data-action="open-panel" data-src="lazy-panel" data-href="panel-route">Open panel</button>',
      "<script>const preview = URL.createObjectURL(blob);</script>",
      '<script>const card = `<a href="${escapeHtml(source.url)}" data-action="${source.action}">${source.label}</a>`;</script>',
      "<style>/* .archived { background-image: url(missing-comment.png); } */</style>",
      "<script>const route = { href: '../../collaboration/demo.html#script' };</script>",
      `<a href="{{${registryKey}}}">Registry</a>`,
      '<iframe src="https://iframes.vik.guru/v1/canvas/demo/"></iframe>',
      '<script type="application/ld+json">' + JSON.stringify({
        "@id": `${legacyBase}#page`,
        url: legacyBase,
        image: `${legacyOrigin}${projectRoot}/img/photo.jpg`,
        contentUrl: `${legacyOrigin}${projectRoot}/img/photo.jpg`,
        application: `${legacyOrigin}collaboration/app/`,
        schema: "https://schemas.vik.guru/example/v1/schema.json",
        skill: "https://schemas.radiantnull.com/skills/source-authority-mapping/",
        iframe: "https://iframes.vik.guru/v1/canvas/demo/",
        relatedLink: `{{${registryKey}}}`,
      }) + "</script>",
    ].join("\n"),
    [`${canvasRoot}/canvas-shell.js`]: [
      `var professionalProfileRoute = "{{${profileKey}}}";`,
      'if (professionalProfileRoute.indexOf("{{PUBLIC_URL_") === -1) {',
      '  var professionalProfileLink = element("a", "", "Professional profile");',
      "  professionalProfileLink.href = professionalProfileRoute;",
      '  professionalProfileLink.setAttribute("aria-label", "View the author profile");',
      "  network.appendChild(professionalProfileLink);",
      "} else {",
      '  network.appendChild(element("span", "super-footer__reserved", "Professional profile available in the public build"));',
      "}",
    ].join("\n"),
    [`${canvasRoot}/portrait.jpg`]: "portrait",
    [`${canvasRoot}/manifest.json`]: `${JSON.stringify({
      id: "./",
      start_url: "./index.html",
      scope: "./",
      icons: [{ src: "portrait.jpg" }],
    }, null, 2)}\n`,
    [`${canvasRoot}/sitemap.xml`]: [
      '<?xml version="1.0"?>',
      "<urlset>",
      `  <url><loc>${legacyBase}</loc></url>`,
      "  <url><loc>https://schemas.radiantnull.com/context-canvas/1.0.0/context-canvas.schema.json</loc></url>",
      "  <url><loc>https://example.test/external</loc></url>",
      "</urlset>",
    ].join("\n"),
    [`${projectRoot}/img/photo.jpg`]: "photo",
    "collaboration/demo.html": "<!doctype html><title>Demo</title>",
    "collaboration/app/index.html": "<!doctype html><title>App</title>",
    "deployment/cpanel/iframe-origin-robots.txt": "User-agent: *\nAllow: /\n",
  };
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(fixture.root, ...relativePath.split("/"));
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source, "utf8");
  }
  await writeFile(
    path.join(fixture.root, ".gitignore"),
    ".env.public\n",
    "utf8",
  );
  await writeFile(
    fixture.primaryManifestPath,
    `${JSON.stringify(primaryManifest([
      {
        source_path: `${canvasRoot}/index.html`,
        projected_path: "index.html",
        media_type: "text/html",
      },
      {
        source_path: `${canvasRoot}/canvas-shell.js`,
        projected_path: "canvas-shell.js",
        media_type: "text/javascript",
      },
      {
        source_path: `${canvasRoot}/portrait.jpg`,
        projected_path: "portrait.jpg",
        media_type: "image/jpeg",
      },
      {
        source_path: `${canvasRoot}/manifest.json`,
        projected_path: "manifest.json",
        media_type: "application/manifest+json",
      },
      {
        source_path: `${canvasRoot}/sitemap.xml`,
        projected_path: "sitemap.xml",
        media_type: "application/xml",
      },
      {
        source_path: `${projectRoot}/img/photo.jpg`,
        projected_path: "img/photo.jpg",
        media_type: "image/jpeg",
      },
      {
        source_path: "collaboration/demo.html",
        projected_path: "collaboration/demo.html",
        media_type: "text/html",
      },
      {
        source_path: "collaboration/app/index.html",
        projected_path: "collaboration/app/index.html",
        media_type: "text/html",
      },
    ]))}\n`,
    "utf8",
  );
  await writeFile(
    fixture.configurationPath,
    `${JSON.stringify({
      id: "prod-projection.configuration.v1",
      version: "1",
      primary_manifest: primaryManifestRelativePath,
      iframe_origin_robots: "deployment/cpanel/iframe-origin-robots.txt",
      publication: {
        base_url: "https://vik.guru/",
        source_root: canvasRoot,
        public_reference_config: ".env.public",
      },
    })}\n`,
    "utf8",
  );
  const destinations = {
    [profileKey]: "https://profiles.example.test/author",
    [registryKey]: "https://registry.example.test/probes",
  };
  const publicConfiguration = Object.entries(destinations)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n";
  await writeFile(
    path.join(fixture.root, ".env.public"),
    publicConfiguration,
    "utf8",
  );
  fixture.sourceSha = await commitFixture(fixture.root, "Accept publication fixture");
  return { canvasRoot, destinations, publicConfiguration };
}

async function enableMarkdownFixture(fixture) {
  const { canvasRoot } = await enablePublicationFixture(fixture);
  const guideSource = [
    "# Projection guide",
    "",
    "[Read the detail](notes/detail.md#decision)",
    "![Inspect the flow](images/flow.svg)",
    "[Open the handbook](handbook/)",
    "[Stay with this section](#projection-guide)",
    "[Read the contract][contract]",
    "[External source](https://example.test/reference)",
    "",
    "`[Code sample](missing-inline.md)`",
    "",
    "```markdown",
    "[Fenced example](missing-fenced.md)",
    "```",
    "",
    '[contract]: <contracts/agreement.md#scope> "Agreement scope"',
    "",
  ].join("\n");
  const files = {
    [`${canvasRoot}/guide.md`]: guideSource,
    [`${canvasRoot}/notes/detail.md`]: "# Detail\n",
    [`${canvasRoot}/images/flow.svg`]: '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n',
    [`${canvasRoot}/handbook/README.md`]: "# Handbook\n",
    [`${canvasRoot}/contracts/agreement.md`]: "# Agreement\n",
  };
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(fixture.root, ...relativePath.split("/"));
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source, "utf8");
  }
  const indexPath = path.join(fixture.root, ...`${canvasRoot}/index.html`.split("/"));
  await writeFile(
    indexPath,
    `${await readFile(indexPath, "utf8")}\n<a href="guide.md">Projection guide</a>\n`,
    "utf8",
  );
  const manifest = JSON.parse(await readFile(fixture.primaryManifestPath, "utf8"));
  manifest.files.push(
    {
      source_path: `${canvasRoot}/guide.md`,
      projected_path: "guides/guide.md",
      media_type: "text/markdown",
    },
    {
      source_path: `${canvasRoot}/notes/detail.md`,
      projected_path: "guides/detail.md",
      media_type: "text/markdown",
    },
    {
      source_path: `${canvasRoot}/images/flow.svg`,
      projected_path: "guides/flow.svg",
      media_type: "image/svg+xml",
    },
    {
      source_path: `${canvasRoot}/handbook/README.md`,
      projected_path: "guides/handbook/README.md",
      media_type: "text/markdown",
    },
    {
      source_path: `${canvasRoot}/contracts/agreement.md`,
      projected_path: "guides/contracts/agreement.md",
      media_type: "text/markdown",
    },
  );
  await writeFile(
    fixture.primaryManifestPath,
    `${JSON.stringify(manifest)}\n`,
    "utf8",
  );
  fixture.sourceSha = await commitFixture(fixture.root, "Accept Markdown closure fixture");
  return { canvasRoot, guideSource };
}

async function commitPrimaryManifest(fixture, files, message) {
  await writeFile(
    fixture.primaryManifestPath,
    `${JSON.stringify(primaryManifest(files))}\n`,
    "utf8",
  );
  fixture.sourceSha = await commitFixture(fixture.root, message);
  return fixture.sourceSha;
}

test("the production plan deterministically combines an explicit primary closure with the aggregate iframe plan", async () => {
  const fixture = await createFixtureRoot();
  try {
    const aggregatePlan = aggregateFixture();
    const first = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    });
    const second = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    });

    assert.deepEqual([...first.outputFiles.keys()], [...second.outputFiles.keys()]);
    for (const [file, bytes] of first.outputFiles) {
      assert.ok(bytes.equals(second.outputFiles.get(file)), `${file} remains deterministic`);
    }
    assert.equal(
      first.outputFiles.get("primary-public/index.html").toString("utf8"),
      fixture.index,
    );
    assert.match(
      first.outputFiles.get("primary-public/index.html").toString("utf8"),
      /https:\/\/iframes\.vik\.guru\/v1\/core\/strategy-canvas\//,
    );
    assert.deepEqual(
      JSON.parse(first.outputFiles.get("primary-public/schemas/example.json")),
      fixture.schema,
    );
    assert.ok(
      first.outputFiles
        .get("iframe-public/v1/core/strategy-canvas/strategy-canvas-system-v0.2/strategy-canvas.schema.json")
        .equals(
          aggregatePlan.outputFiles.get(
            "core/strategy-canvas/strategy-canvas-system-v0.2/strategy-canvas.schema.json",
          ),
        ),
    );
    assert.equal(first.manifest.source_sha, fixture.sourceSha);
    assert.equal(
      first.manifest.inputs.iframe_package.receipt_sha256,
      sha256(aggregatePlan.outputFiles.get("route-manifest.json")),
    );
    assert.equal(
      first.manifest.inputs.iframe_package.source_relationship,
      "independent_plan_bound_input",
    );
    assert.match(
      first.manifest.inputs.iframe_package.closure_sha256,
      /^[a-f0-9]{64}$/,
    );
    assert.deepEqual(first.manifest.inputs.configuration, {
      source_path: configurationRelativePath,
      git_blob_id: await git(
        fixture.root,
        ["rev-parse", `HEAD:${configurationRelativePath}`],
      ),
      sha256: sha256(await readFile(fixture.configurationPath)),
    });
    assert.equal(
      first.manifest.inputs.primary_manifest.source_path,
      primaryManifestRelativePath,
    );
    assert.deepEqual(first.manifest.surfaces, {
      primary: {
        root: "primary-public/",
        files: 2,
        bytes: Buffer.byteLength(fixture.index) + Buffer.byteLength(`${JSON.stringify(fixture.schema)}\n`),
      },
      iframe: {
        root: "iframe-public/",
        files: aggregatePlan.outputFiles.size,
        bytes: [...aggregatePlan.outputFiles.values()].reduce(
          (total, bytes) => total + bytes.byteLength,
          0,
        ),
      },
    });
    assert.deepEqual(
      first.manifest.outputs.map(({ projected_path }) => projected_path),
      [...first.manifest.outputs.map(({ projected_path }) => projected_path)].sort(),
    );
    assert.equal(
      first.manifest.outputs.find(({ projected_path }) =>
        projected_path.endsWith("strategy-canvas.schema.json"),
      ).media_type,
      "application/schema+json",
    );
    assert.ok(
      [...first.outputFiles.keys()].every((file) =>
        !file.includes(".iframe-route-build") && !file.includes("context-canvas-project-surface/context-canvas"),
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("one semantic asset record follows its canonical source into both production closures", async () => {
  const fixture = await createFixtureRoot();
  try {
    const image = await enableAssetInventoryFixture(fixture);
    const aggregatePlan = aggregateFixture({
      image: {
        sourcePath: image.sourcePath,
        projectedPath: "canvas/demo/assets/photo.png",
        targetFile: "assets/photo.png",
        mediaType: "image/png",
        bytes: image.bytes,
        consumerPath: "visitor/index.html",
      },
    });
    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    });

    assert.equal(plan.manifest.inputs.asset_inventory.source_path, assetInventoryRelativePath);
    assert.match(plan.manifest.inputs.asset_inventory.sha256, /^[a-f0-9]{64}$/);
    const assets = plan.manifest.asset_inventory.assets;
    assert.equal(assets.length, 1);
    const sourceDigest = sha256(image.bytes);
    assert.deepEqual(assets[0], {
      semantic_key: "fixture.image.photo.png",
      family: "fixture.image",
      semantic_owner: "Fixture visitor surface",
      roles: [
        {
          id: "fixture_image",
          visitor_job: "Make the image relationship observable in the fixture.",
          accessibility_text_owner: "The fixture HTML image alternative.",
        },
      ],
      canonical_source_path: image.sourcePath,
      file_kind: "raster_image",
      media_type: "image/png",
      intrinsic_dimensions: {
        standing: "available",
        width: 3,
        height: 2,
        unit: "pixel",
        source: "png_ihdr",
      },
      bytes: image.bytes.byteLength,
      sha256: sourceDigest,
      direct_authored_consumers: ["visitor/index.html"],
      build_consumers: ["aggregate_iframe_package", "production_projection"],
      public_path_standing: {
        primary: {
          standing: "source_root_relative_path_preserved",
          source_root: "visitor",
          projected_path: "photo.png",
        },
        iframe: {
          standing: "aggregate_route_relative_projection",
          projected_paths: ["canvas/demo/assets/photo.png"],
        },
      },
      selected_production_closures: ["primary", "iframe"],
      source_relationship: { standing: "canonical_authored_asset" },
      semantic_authority_path: null,
      recovery_condition: "Restore the fixture source and rebuild the projection.",
      projections: [
        {
          surface: "iframe",
          projected_path: "iframe-public/v1/canvas/demo/assets/photo.png",
          media_type: "image/png",
          bytes: image.bytes.byteLength,
          sha256: sourceDigest,
          standing: "byte_preserved",
        },
        {
          surface: "primary",
          projected_path: "primary-public/photo.png",
          media_type: "image/png",
          bytes: image.bytes.byteLength,
          sha256: sourceDigest,
          standing: "byte_preserved",
        },
      ],
    });
    assert.deepEqual(
      JSON.parse(plan.outputFiles.get("deployment-manifest.json"))
        .asset_inventory.assets[0],
      assets[0],
    );
    for (const projectedPath of [
      "primary-public/photo.png",
      "iframe-public/v1/canvas/demo/assets/photo.png",
    ]) {
      assert.equal(
        plan.manifest.outputs.find((output) => output.projected_path === projectedPath)
          .semantic_asset_key,
        assets[0].semantic_key,
      );
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("visitor-controlled motion references participate in closure and consumer accounting", async () => {
  const fixture = await createFixtureRoot();
  try {
    await enableAssetInventoryFixture(fixture);
    const motionPath = "visitor/motion.gif";
    await writeFile(path.join(fixture.root, motionPath), fixtureGif());
    const indexPath = path.join(fixture.root, "visitor/index.html");
    await writeFile(
      indexPath,
      `${await readFile(indexPath, "utf8")}\n<div data-still-src="photo.png" data-motion-src="motion.gif"></div>\n`,
      "utf8",
    );
    const manifest = JSON.parse(await readFile(fixture.primaryManifestPath, "utf8"));
    manifest.files.push({
      source_path: motionPath,
      projected_path: "motion.gif",
      media_type: "image/gif",
    });
    await writeFile(
      fixture.primaryManifestPath,
      `${JSON.stringify(manifest)}\n`,
      "utf8",
    );
    const inventoryPath = path.join(fixture.root, assetInventoryRelativePath);
    const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
    inventory.families[0].selector.paths.push(motionPath);
    await writeFile(inventoryPath, `${JSON.stringify(inventory)}\n`, "utf8");
    fixture.sourceSha = await commitFixture(fixture.root, "Bind controlled motion asset");

    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    const motion = plan.manifest.asset_inventory.assets.find(
      ({ canonical_source_path: sourcePath }) => sourcePath === motionPath,
    );
    assert.deepEqual(motion.direct_authored_consumers, ["visitor/index.html"]);
    assert.equal(
      plan.outputFiles.get("primary-public/index.html").toString("utf8")
        .includes('data-motion-src="motion.gif"'),
      true,
    );

    manifest.files = manifest.files.filter(({ source_path: sourcePath }) =>
      sourcePath !== motionPath,
    );
    await writeFile(
      fixture.primaryManifestPath,
      `${JSON.stringify(manifest)}\n`,
      "utf8",
    );
    fixture.sourceSha = await commitFixture(fixture.root, "Remove motion from projection");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /Primary projection dependency is absent.*visitor\/motion\.gif/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("CSS and metadata carriers join selected assets to their direct consumers", async () => {
  const fixture = await createFixtureRoot();
  try {
    const image = await enableAssetInventoryFixture(fixture);
    const cssPath = "visitor/styles.css";
    const manifestPath = "visitor/manifest.json";
    await writeFile(
      path.join(fixture.root, cssPath),
      'body { background-image: url("photo.png"); }\n',
      "utf8",
    );
    await writeFile(
      path.join(fixture.root, manifestPath),
      `${JSON.stringify({ icons: [{ src: "photo.png" }] })}\n`,
      "utf8",
    );
    const manifest = JSON.parse(await readFile(fixture.primaryManifestPath, "utf8"));
    manifest.files.push(
      {
        source_path: cssPath,
        projected_path: "styles.css",
        media_type: "text/css",
      },
      {
        source_path: manifestPath,
        projected_path: "manifest.json",
        media_type: "application/json",
      },
    );
    await writeFile(
      fixture.primaryManifestPath,
      `${JSON.stringify(manifest)}\n`,
      "utf8",
    );
    fixture.sourceSha = await commitFixture(fixture.root, "Add image consumer carriers");

    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    const asset = plan.manifest.asset_inventory.assets.find(
      ({ canonical_source_path: sourcePath }) => sourcePath === image.sourcePath,
    );
    assert.deepEqual(asset.direct_authored_consumers, [
      "visitor/index.html",
      "visitor/manifest.json",
      "visitor/styles.css",
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("iframe image projections require a canonical source before semantic inventory resolution", async () => {
  const fixture = await createFixtureRoot();
  try {
    const image = await enableAssetInventoryFixture(fixture);
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture({
          image: {
            sourcePath: image.sourcePath,
            projectedPath: "canvas/demo/assets/photo.png",
            targetFile: "assets/photo.png",
            mediaType: "image/png",
            bytes: image.bytes,
            consumerPath: "visitor/index.html",
            omitSourceFile: true,
          },
        }),
      }),
      /Iframe package image requires one canonical source file/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("every iframe image resolves through the inventory and exact canonical source bytes", async () => {
  const orphanFixture = await createFixtureRoot();
  const driftFixture = await createFixtureRoot();
  try {
    await enableAssetInventoryFixture(orphanFixture);
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: orphanFixture.root,
        sourceSha: orphanFixture.sourceSha,
        configurationPath: orphanFixture.configurationPath,
        aggregatePlan: aggregateFixture({
          extraOutputs: [["canvas/demo/orphan.png", fixturePng(1, 1)]],
        }),
      }),
      /Iframe production image has no semantic asset record: canvas\/demo\/orphan\.png/,
    );

    const image = await enableAssetInventoryFixture(driftFixture);
    const driftedBytes = fixturePng(5, 4);
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: driftFixture.root,
        sourceSha: driftFixture.sourceSha,
        configurationPath: driftFixture.configurationPath,
        aggregatePlan: aggregateFixture({
          image: {
            sourcePath: image.sourcePath,
            projectedPath: "canvas/demo/assets/photo.png",
            targetFile: "assets/photo.png",
            mediaType: "image/png",
            bytes: driftedBytes,
            consumerPath: "visitor/index.html",
          },
        }),
      }),
      /Iframe production asset bytes differ from canonical source visitor\/photo\.png/,
    );
  } finally {
    await rm(orphanFixture.root, { recursive: true, force: true });
    await rm(driftFixture.root, { recursive: true, force: true });
  }
});

test("generated derivative lineage stays distinct and digest-bound in serialized output", async () => {
  const fixture = await createFixtureRoot();
  try {
    const image = await enableAssetInventoryFixture(fixture);
    const sourceFilmPath = "source/style-cycle.mp4";
    const generatorPath = "tools/generate-style-cycle.mjs";
    const sourceFilm = Buffer.from("accepted source film", "utf8");
    const generator = Buffer.from("export const profile = 'fixture';\n", "utf8");
    await mkdir(path.join(fixture.root, "source"), { recursive: true });
    await mkdir(path.join(fixture.root, "tools"), { recursive: true });
    await writeFile(path.join(fixture.root, sourceFilmPath), sourceFilm);
    await writeFile(path.join(fixture.root, generatorPath), generator);
    const inventoryPath = path.join(fixture.root, assetInventoryRelativePath);
    const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
    inventory.overrides.push({
      source_path: image.sourcePath,
      semantic_key: "fixture.generated-photo",
      roles: inventory.families[0].roles,
      source_relationship: {
        standing: "generated_derivative",
        canonical_source_path: sourceFilmPath,
        generator_path: generatorPath,
        profile: "fixture-profile-v1",
      },
      recovery_condition: "Run the fixture generator against its accepted source film.",
    });
    await writeFile(inventoryPath, `${JSON.stringify(inventory)}\n`, "utf8");
    fixture.sourceSha = await commitFixture(fixture.root, "Bind derivative lineage");

    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    const inventoryBytes = await readFile(inventoryPath);
    assert.equal(
      plan.manifest.inputs.asset_inventory.git_blob_id,
      await git(fixture.root, [
        "rev-parse",
        `${fixture.sourceSha}:${assetInventoryRelativePath}`,
      ]),
    );
    assert.equal(plan.manifest.inputs.asset_inventory.sha256, sha256(inventoryBytes));
    const asset = plan.manifest.asset_inventory.assets[0];
    assert.equal(asset.canonical_source_path, image.sourcePath);
    assert.deepEqual(asset.source_relationship, {
      standing: "generated_derivative",
      canonical_source_path: sourceFilmPath,
      generator_path: generatorPath,
      profile: "fixture-profile-v1",
      canonical_source_bytes: sourceFilm.byteLength,
      canonical_source_sha256: sha256(sourceFilm),
      generator_sha256: sha256(generator),
    });
    assert.deepEqual(
      JSON.parse(plan.outputFiles.get("deployment-manifest.json"))
        .asset_inventory.assets[0].source_relationship,
      asset.source_relationship,
    );

    inventory.overrides[0].source_relationship.canonical_source_path = image.sourcePath;
    await writeFile(inventoryPath, `${JSON.stringify(inventory)}\n`, "utf8");
    fixture.sourceSha = await commitFixture(fixture.root, "Introduce self lineage");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /relationship points .* to itself/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("declared and accepted generation relationships bind their exact provenance owners", async () => {
  const fixture = await createFixtureRoot();
  try {
    const image = await enableAssetInventoryFixture(fixture);
    const sourceRoot = path.join(fixture.root, "source");
    await mkdir(sourceRoot, { recursive: true });
    const canonicalPath = "source/model.json";
    const relationshipOwnerPath = "source/model-manifest.json";
    const provenanceOwnerPath = "source/generation-notes.md";
    const canonical = Buffer.from('{"state":"accepted"}\n', "utf8");
    const relationshipOwner = Buffer.from('{"derivatives":["../visitor/photo.png"]}\n', "utf8");
    const provenanceOwner = Buffer.from("# Accepted generation account\n", "utf8");
    await writeFile(path.join(fixture.root, canonicalPath), canonical);
    await writeFile(path.join(fixture.root, relationshipOwnerPath), relationshipOwner);
    await writeFile(path.join(fixture.root, provenanceOwnerPath), provenanceOwner);
    const inventoryPath = path.join(fixture.root, assetInventoryRelativePath);
    const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
    inventory.overrides = [
      {
        source_path: image.sourcePath,
        semantic_key: "fixture.manifest-declared-photo",
        roles: inventory.families[0].roles,
        source_relationship: {
          standing: "manifest_declared_derivative",
          canonical_source_path: canonicalPath,
          relationship_owner_path: relationshipOwnerPath,
          profile_standing: "The fixture manifest owns the declared relationship.",
        },
        recovery_condition: "Restore the fixture model and relationship owner.",
      },
    ];
    await writeFile(inventoryPath, `${JSON.stringify(inventory)}\n`, "utf8");
    fixture.sourceSha = await commitFixture(fixture.root, "Bind declared derivative");

    let plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    assert.deepEqual(plan.manifest.asset_inventory.assets[0].source_relationship, {
      ...inventory.overrides[0].source_relationship,
      canonical_source_bytes: canonical.byteLength,
      canonical_source_sha256: sha256(canonical),
      relationship_owner_sha256: sha256(relationshipOwner),
    });

    inventory.overrides[0] = {
      ...inventory.overrides[0],
      semantic_key: "fixture.accepted-generated-photo",
      source_relationship: {
        standing: "accepted_generated_asset",
        provenance_owner_path: provenanceOwnerPath,
        lineage_standing: "The fixture records accepted generated bytes and their account.",
      },
      recovery_condition: "Restore the accepted fixture and its generation account.",
    };
    await writeFile(inventoryPath, `${JSON.stringify(inventory)}\n`, "utf8");
    fixture.sourceSha = await commitFixture(fixture.root, "Bind accepted generation account");
    plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    assert.deepEqual(plan.manifest.asset_inventory.assets[0].source_relationship, {
      ...inventory.overrides[0].source_relationship,
      provenance_owner_sha256: sha256(provenanceOwner),
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("selected assets require one semantic family and inventory rules remain non-selecting", async () => {
  const unmatched = await createFixtureRoot();
  const ambiguous = await createFixtureRoot();
  const misrouted = await createFixtureRoot();
  try {
    await enableAssetInventoryFixture(unmatched);
    const unmatchedInventoryPath = path.join(unmatched.root, assetInventoryRelativePath);
    const unmatchedInventory = JSON.parse(await readFile(unmatchedInventoryPath, "utf8"));
    unmatchedInventory.families[0].selector.paths = ["visitor/elsewhere.png"];
    await writeFile(unmatchedInventoryPath, `${JSON.stringify(unmatchedInventory)}\n`, "utf8");
    unmatched.sourceSha = await commitFixture(unmatched.root, "Move the fixture annotation");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: unmatched.root,
        sourceSha: unmatched.sourceSha,
        configurationPath: unmatched.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /must match exactly one semantic family.*matched 0/,
    );

    await enableAssetInventoryFixture(ambiguous);
    const ambiguousInventoryPath = path.join(ambiguous.root, assetInventoryRelativePath);
    const ambiguousInventory = JSON.parse(await readFile(ambiguousInventoryPath, "utf8"));
    ambiguousInventory.families.push({
      ...structuredClone(ambiguousInventory.families[0]),
      id: "fixture.duplicate",
    });
    await writeFile(ambiguousInventoryPath, `${JSON.stringify(ambiguousInventory)}\n`, "utf8");
    ambiguous.sourceSha = await commitFixture(ambiguous.root, "Overlap fixture annotations");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: ambiguous.root,
        sourceSha: ambiguous.sourceSha,
        configurationPath: ambiguous.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /must match exactly one semantic family.*matched 2/,
    );

    const image = await enableAssetInventoryFixture(misrouted);
    const misroutedManifest = JSON.parse(
      await readFile(misrouted.primaryManifestPath, "utf8"),
    );
    misroutedManifest.files.find(({ source_path: sourcePath }) =>
      sourcePath === image.sourcePath
    ).projected_path = "media/photo.png";
    await writeFile(
      misrouted.primaryManifestPath,
      `${JSON.stringify(misroutedManifest)}\n`,
      "utf8",
    );
    misrouted.sourceSha = await commitFixture(
      misrouted.root,
      "Diverge from declared asset path standing",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: misrouted.root,
        sourceSha: misrouted.sourceSha,
        configurationPath: misrouted.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /differs from its declared public-path standing photo\.png/,
    );
  } finally {
    await rm(unmatched.root, { recursive: true, force: true });
    await rm(ambiguous.root, { recursive: true, force: true });
    await rm(misrouted.root, { recursive: true, force: true });
  }
});

test("asset inventory grammar and image headers keep semantic and physical facts bounded", () => {
  const accepted = fixtureAssetInventory({ paths: ["visitor/photo.png"] });
  assert.equal(validateAssetInventory(accepted).families[0].id, "fixture.image");
  assert.throws(
    () => validateAssetInventory({ ...accepted, selected_files: ["visitor/photo.png"] }),
    /must contain exactly/,
  );
  assert.throws(
    () => validateAssetInventory({
      ...accepted,
      overrides: [
        {
          source_path: "visitor/photo.png",
          semantic_key: "fixture.photo",
          roles: accepted.families[0].roles,
          source_relationship: {
            standing: "generated_derivative",
            canonical_source_path: "../outside.mp4",
            generator_path: "collaboration/generate.py",
            profile: "fixture",
          },
          recovery_condition: "Regenerate the fixture.",
        },
      ],
    }),
    /must stay relative and normalized/,
  );

  const gif = Buffer.alloc(10);
  gif.write("GIF89a", 0, "ascii");
  gif.writeUInt16LE(7, 6);
  gif.writeUInt16LE(5, 8);
  assert.equal(inspectImageDimensions(gif, "image/gif").width, 7);
  const zeroGif = Buffer.from(gif);
  zeroGif.writeUInt16LE(0, 6);
  assert.throws(
    () => inspectImageDimensions(zeroGif, "image/gif"),
    /positive GIF dimensions/,
  );
  assert.throws(
    () => inspectImageDimensions(fixturePng(0, 2), "image/png"),
    /positive PNG dimensions/,
  );
  const zeroWidthJpeg = Buffer.alloc(21);
  Buffer.from([0xff, 0xd8, 0xff, 0xc0]).copy(zeroWidthJpeg);
  zeroWidthJpeg.writeUInt16BE(17, 4);
  zeroWidthJpeg[6] = 8;
  zeroWidthJpeg.writeUInt16BE(2, 7);
  zeroWidthJpeg.writeUInt16BE(0, 9);
  assert.throws(
    () => inspectImageDimensions(zeroWidthJpeg, "image/jpeg"),
    /positive JPEG dimensions/,
  );
  assert.deepEqual(
    inspectImageDimensions(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1050"></svg>'),
      "image/svg+xml",
    ),
    {
      standing: "available",
      width: 1600,
      height: 1050,
      unit: "svg_user_unit",
      source: "svg_view_box",
    },
  );
  assert.deepEqual(
    inspectImageDimensions(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" data-viewBox="0 0 11 13" stroke-width="7" data-height="9"></svg>',
      ),
      "image/svg+xml",
    ),
    { standing: "not_declared", source: "svg_root" },
  );
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  ico[6] = 0;
  ico[7] = 0;
  assert.deepEqual(inspectImageDimensions(ico, "image/x-icon").variants, [
    { width: 256, height: 256 },
  ]);
});

test("publication projection materializes one digest-bound receiver and rewrites flattened route geometry", async () => {
  const fixture = await createFixtureRoot();
  try {
    const publication = await enablePublicationFixture(fixture);
    const aggregatePlan = aggregateFixture();
    const first = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    });
    const second = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    });
    const html = first.outputFiles.get("primary-public/index.html").toString("utf8");
    assert.match(html, /<link rel="canonical" href="https:\/\/vik\.guru\/">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/vik\.guru\/">/);
    assert.match(html, /<meta property="og:image" content="https:\/\/vik\.guru\/img\/photo\.jpg">/);
    assert.match(html, /<meta name="twitter:image" content="https:\/\/vik\.guru\/img\/photo\.jpg">/);
    assert.match(html, /href="img\/photo\.jpg"/);
    assert.match(html, /href="collaboration\/demo\.html#start"/);
    assert.match(html, /data-action="open-panel" data-src="lazy-panel" data-href="panel-route"/);
    assert.match(html, /URL\.createObjectURL\(blob\)/);
    assert.match(
      html,
      /`<a href="\$\{escapeHtml\(source\.url\)\}" data-action="\$\{source\.action\}">\$\{source\.label\}<\/a>`/,
    );
    assert.match(html, /url\(missing-comment\.png\)/);
    assert.match(html, /href: 'collaboration\/demo\.html#script'/);
    assert.match(html, new RegExp(publication.destinations.PUBLIC_URL_REGISTRY_PRACTITIONER_PROBES));
    assert.match(html, /https:\/\/iframes\.vik\.guru\/v1\/canvas\/demo\//);
    assert.match(html, /https:\/\/schemas\.vik\.guru\/example\/v1\/schema\.json/);
    const jsonLd = JSON.parse(
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1],
    );
    assert.equal(jsonLd["@id"], "https://vik.guru/#page");
    assert.equal(jsonLd.url, "https://vik.guru/");
    assert.equal(jsonLd.image, "https://vik.guru/img/photo.jpg");
    assert.equal(jsonLd.contentUrl, "https://vik.guru/img/photo.jpg");
    assert.equal(jsonLd.application, "https://vik.guru/collaboration/app/");
    assert.equal(
      jsonLd.skill,
      "https://schemas.radiantnull.com/skills/source-authority-mapping/",
    );
    assert.doesNotMatch(html, /schemas\.radiantnull\.com\/context-canvas-project-surface\/context-canvas/);
    assert.doesNotMatch(html, /schemas\.radiantnull\.com\/context-canvas-project-surface\/img/);
    assert.doesNotMatch(html, /schemas\.radiantnull\.com\/collaboration\/app/);
    const script = first.outputFiles
      .get("primary-public/canvas-shell.js")
      .toString("utf8");
    assert.match(script, new RegExp(publication.destinations.PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE));
    assert.doesNotMatch(script, /\{\{PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE\}\}/);
    assert.match(
      first.outputFiles.get("primary-public/sitemap.xml").toString("utf8"),
      /<loc>https:\/\/vik\.guru\/<\/loc>/,
    );
    assert.match(
      first.outputFiles.get("primary-public/sitemap.xml").toString("utf8"),
      /<loc>https:\/\/schemas\.radiantnull\.com\/context-canvas\/1\.0\.0\/context-canvas\.schema\.json<\/loc>/,
    );
    assert.match(
      first.outputFiles.get("primary-public/sitemap.xml").toString("utf8"),
      /<loc>https:\/\/example\.test\/external<\/loc>/,
    );
    assert.deepEqual(
      JSON.parse(first.outputFiles.get("primary-public/manifest.json")),
      {
        id: "./",
        start_url: "./index.html",
        scope: "./",
        icons: [{ src: "portrait.jpg" }],
      },
    );
    assert.equal(
      first.outputFiles.get("iframe-public/robots.txt").toString("utf8"),
      "User-agent: *\nAllow: /\n",
    );
    assert.deepEqual([...first.outputFiles.keys()], [...second.outputFiles.keys()]);
    for (const [file, bytes] of first.outputFiles) {
      assert.ok(bytes.equals(second.outputFiles.get(file)), `${file} remains deterministic`);
    }
    const publicReferenceInput = first.manifest.inputs.public_references;
    assert.deepEqual(publicReferenceInput.keys, [
      "PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE",
      "PUBLIC_URL_REGISTRY_PRACTITIONER_PROBES",
    ]);
    assert.equal(
      publicReferenceInput.configuration_sha256,
      sha256(Buffer.from(publication.publicConfiguration)),
    );
    assert.equal(publicReferenceInput.source_relationship, "external_digest_bound_input");
    assert.deepEqual(first.manifest.inputs.iframe_origin_robots, {
      source_path: "deployment/cpanel/iframe-origin-robots.txt",
      git_blob_id: await git(
        fixture.root,
        ["rev-parse", "HEAD:deployment/cpanel/iframe-origin-robots.txt"],
      ),
      sha256: sha256(Buffer.from("User-agent: *\nAllow: /\n")),
    });
    assert.doesNotMatch(
      JSON.stringify(first.manifest),
      /profiles\.example\.test|registry\.example\.test/,
    );
    const generated = first.manifest.outputs.filter(
      ({ surface, standing }) => surface === "primary" && standing === "generated",
    );
    assert.ok(generated.length >= 3);
    assert.ok(generated.every(({ source_sha256 }) => /^[a-f0-9]{64}$/.test(source_sha256)));

    await rm(path.join(fixture.root, ".env.public"));
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan,
      }),
      /requires the ignored \.env\.public receiver/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("publication projection rewrites visitor-reachable Markdown links across fragments and directory READMEs", async () => {
  const fixture = await createFixtureRoot();
  try {
    await enableMarkdownFixture(fixture);
    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    const html = plan.outputFiles.get("primary-public/index.html").toString("utf8");
    const markdown = plan.outputFiles
      .get("primary-public/guides/guide.md")
      .toString("utf8");

    assert.match(html, /href="guides\/guide\.md"/);
    assert.match(markdown, /\[Read the detail\]\(detail\.md#decision\)/);
    assert.match(markdown, /!\[Inspect the flow\]\(flow\.svg\)/);
    assert.match(markdown, /\[Open the handbook\]\(handbook\/README\.md\)/);
    assert.match(markdown, /\[Stay with this section\]\(#projection-guide\)/);
    assert.match(markdown, /\[External source\]\(https:\/\/example\.test\/reference\)/);
    assert.match(markdown, /\[contract\]: <contracts\/agreement\.md#scope>/);
    assert.match(markdown, /`\[Code sample\]\(missing-inline\.md\)`/);
    assert.match(markdown, /\[Fenced example\]\(missing-fenced\.md\)/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("publication projection fails closed for missing and escaping Markdown destinations", async () => {
  for (const [label, destination, expected] of [
    ["missing", "missing.md", /Markdown reference points to an unavailable tracked file/],
    ["escaping", "../../../../outside.md", /Markdown reference escapes the repository/],
  ]) {
    const fixture = await createFixtureRoot();
    try {
      const { canvasRoot } = await enableMarkdownFixture(fixture);
      const guidePath = path.join(fixture.root, ...`${canvasRoot}/guide.md`.split("/"));
      await writeFile(
        guidePath,
        `${await readFile(guidePath, "utf8")}\n[Unresolved destination](${destination})\n`,
        "utf8",
      );
      fixture.sourceSha = await commitFixture(fixture.root, `Add ${label} Markdown destination`);
      await assert.rejects(
        createProductionProjectionPlan({
          repositoryRoot: fixture.root,
          sourceSha: fixture.sourceSha,
          configurationPath: fixture.configurationPath,
          aggregatePlan: aggregateFixture(),
        }),
        expected,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("publication projection fails closed for missing and escaping runtime references", async () => {
  const cases = [
    {
      label: "missing HTML image",
      kind: "html",
      source: '<img src="missing.png" alt="">',
      expected: /runtime reference points to an unavailable tracked file.*index\.html -> missing\.png/,
    },
    {
      label: "escaping HTML image",
      kind: "html",
      source: '<img src="../../../outside.png" alt="">',
      expected: /runtime reference escapes the repository.*index\.html -> \.\.\/\.\.\/\.\.\/outside\.png/,
    },
    {
      label: "missing HTML form action",
      kind: "html",
      source: '<form action="missing-handler.html"></form>',
      expected: /runtime reference points to an unavailable tracked file.*index\.html -> missing-handler\.html/,
    },
    {
      label: "missing HTML style attribute image",
      kind: "html",
      source: '<div style="background-image: url(\'missing.png\')"></div>',
      expected: /runtime reference points to an unavailable tracked file.*index\.html -> missing\.png/,
    },
    {
      label: "missing HTML style block image",
      kind: "html",
      source: '<style>.card { background-image: url("missing.png"); }</style>',
      expected: /runtime reference points to an unavailable tracked file.*index\.html -> missing\.png/,
    },
    {
      label: "missing CSS image",
      kind: "css",
      source: '.card { background-image: url("missing.png"); }\n',
      expected: /runtime reference points to an unavailable tracked file.*surface\.css -> missing\.png/,
    },
    {
      label: "escaping CSS import",
      kind: "css",
      source: '@import "../../../outside.css";\n',
      expected: /runtime reference escapes the repository.*surface\.css -> \.\.\/\.\.\/\.\.\/outside\.css/,
    },
    {
      label: "missing JavaScript locator",
      kind: "js",
      source: 'const asset = { url: "missing.json" };\n',
      expected: /runtime reference points to an unavailable tracked file.*canvas-shell\.js -> missing\.json/,
    },
    {
      label: "escaping JavaScript locator",
      kind: "js",
      source: 'const asset = { url: "../../../outside.json" };\n',
      expected: /runtime reference escapes the repository.*canvas-shell\.js -> \.\.\/\.\.\/\.\.\/outside\.json/,
    },
  ];

  for (const runtimeCase of cases) {
    const fixture = await createFixtureRoot();
    try {
      const { canvasRoot } = await enablePublicationFixture(fixture);
      const manifest = JSON.parse(await readFile(fixture.primaryManifestPath, "utf8"));
      let relativePath;
      if (runtimeCase.kind === "html") {
        relativePath = `${canvasRoot}/index.html`;
        const filePath = path.join(fixture.root, ...relativePath.split("/"));
        await writeFile(
          filePath,
          `${await readFile(filePath, "utf8")}\n${runtimeCase.source}\n`,
          "utf8",
        );
      } else if (runtimeCase.kind === "css") {
        relativePath = `${canvasRoot}/surface.css`;
        await writeFile(
          path.join(fixture.root, ...relativePath.split("/")),
          runtimeCase.source,
          "utf8",
        );
        manifest.files.push({
          source_path: relativePath,
          projected_path: "surface.css",
          media_type: "text/css",
        });
        await writeFile(
          fixture.primaryManifestPath,
          `${JSON.stringify(manifest)}\n`,
          "utf8",
        );
      } else {
        relativePath = `${canvasRoot}/canvas-shell.js`;
        const filePath = path.join(fixture.root, ...relativePath.split("/"));
        await writeFile(
          filePath,
          `${await readFile(filePath, "utf8")}\n${runtimeCase.source}`,
          "utf8",
        );
      }
      fixture.sourceSha = await commitFixture(
        fixture.root,
        `Add ${runtimeCase.label} fixture`,
      );

      await assert.rejects(
        createProductionProjectionPlan({
          repositoryRoot: fixture.root,
          sourceSha: fixture.sourceSha,
          configurationPath: fixture.configurationPath,
          aggregatePlan: aggregateFixture(),
        }),
        runtimeCase.expected,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("selected JSON examples cannot carry machine references into repository-only roots", async () => {
  const fixture = await createFixtureRoot();
  try {
    const { canvasRoot } = await enablePublicationFixture(fixture);
    const privateSource = ".agents/skills/private/SKILL.md";
    const exampleSource = `${canvasRoot}/machine-example.json`;
    for (const [relativePath, source] of [
      [privateSource, "# Private source\n"],
      [exampleSource, `${JSON.stringify({ sourceRef: "../../.agents/skills/private/SKILL.md" })}\n`],
    ]) {
      const filePath = path.join(fixture.root, ...relativePath.split("/"));
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, source, "utf8");
    }
    const manifest = JSON.parse(await readFile(fixture.primaryManifestPath, "utf8"));
    manifest.files.push({
      source_path: exampleSource,
      projected_path: "examples/machine-example.json",
      media_type: "application/json",
    });
    await writeFile(
      fixture.primaryManifestPath,
      `${JSON.stringify(manifest)}\n`,
      "utf8",
    );
    fixture.sourceSha = await commitFixture(fixture.root, "Select machine-reference fixture");

    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /dependency is absent.*machine-example\.json -> \.agents\/skills\/private\/SKILL\.md/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("the Context Core manifest keeps omitted history as metadata while current coordinates remain closed", async () => {
  const fixture = await createFixtureRoot();
  try {
    const { canvasRoot } = await enablePublicationFixture(fixture);
    const familyRoot = `${canvasRoot}/prototypes/core-architectures/chimeric-pack-v0.1`;
    const currentSource = `${familyRoot}/current.html`;
    const historicalSource = `${familyRoot}/historical.html`;
    const manifestSource = `${familyRoot}/core-architectures-chimeric-prototype-manifest-v0.1.json`;
    const manifestDocument = {
      prototypes: [{
        id: "current",
        file: "current.html",
        previous: ["historical.html"],
      }],
    };
    for (const [relativePath, source] of [
      [currentSource, "<!doctype html><title>Current</title>"],
      [historicalSource, "<!doctype html><title>Historical</title>"],
      [manifestSource, `${JSON.stringify(manifestDocument, null, 2)}\n`],
    ]) {
      const filePath = path.join(fixture.root, ...relativePath.split("/"));
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, source, "utf8");
    }
    const manifest = JSON.parse(await readFile(fixture.primaryManifestPath, "utf8"));
    manifest.files.push(
      {
        source_path: currentSource,
        projected_path: "prototypes/core-architectures/chimeric-pack-v0.1/current.html",
        media_type: "text/html",
      },
      {
        source_path: manifestSource,
        projected_path: "prototypes/core-architectures/chimeric-pack-v0.1/core-architectures-chimeric-prototype-manifest-v0.1.json",
        media_type: "application/json",
      },
    );
    await writeFile(fixture.primaryManifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    fixture.sourceSha = await commitFixture(fixture.root, "Select current Core family coordinates");

    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    assert.deepEqual(
      JSON.parse(plan.outputFiles.get(
        "primary-public/prototypes/core-architectures/chimeric-pack-v0.1/core-architectures-chimeric-prototype-manifest-v0.1.json",
      )),
      manifestDocument,
    );
    assert.equal(
      plan.outputFiles.has(
        "primary-public/prototypes/core-architectures/chimeric-pack-v0.1/historical.html",
      ),
      false,
    );

    manifestDocument.prototypes[0].file = "omitted-current.html";
    await writeFile(
      path.join(fixture.root, ...`${familyRoot}/omitted-current.html`.split("/")),
      "<!doctype html><title>Omitted current</title>",
      "utf8",
    );
    await writeFile(
      path.join(fixture.root, ...manifestSource.split("/")),
      `${JSON.stringify(manifestDocument, null, 2)}\n`,
      "utf8",
    );
    fixture.sourceSha = await commitFixture(fixture.root, "Name an omitted current Core coordinate");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /dependency is absent.*manifest-v0\.1\.json -> .*omitted-current\.html/,
    );

    manifestDocument.prototypes[0].file = "current.html";
    manifestDocument.prototypes[0].compatibility_route = "historical.html";
    await writeFile(
      path.join(fixture.root, ...manifestSource.split("/")),
      `${JSON.stringify(manifestDocument, null, 2)}\n`,
      "utf8",
    );
    fixture.sourceSha = await commitFixture(fixture.root, "Add a navigable historical coordinate");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /omitted history metadata overlaps prototypes\.0\.compatibility_route coordinate historical\.html/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an unrelated JSON previous field retains ordinary closure behavior", async () => {
  const fixture = await createFixtureRoot();
  try {
    const { canvasRoot } = await enablePublicationFixture(fixture);
    const historicalSource = `${canvasRoot}/historical.html`;
    const recordSource = `${canvasRoot}/record.json`;
    await writeFile(
      path.join(fixture.root, ...historicalSource.split("/")),
      "<!doctype html><title>Historical</title>",
      "utf8",
    );
    await writeFile(
      path.join(fixture.root, ...recordSource.split("/")),
      `${JSON.stringify({ previous: ["historical.html"] })}\n`,
      "utf8",
    );
    const manifest = JSON.parse(await readFile(fixture.primaryManifestPath, "utf8"));
    manifest.files.push({
      source_path: recordSource,
      projected_path: "record.json",
      media_type: "application/json",
    });
    await writeFile(fixture.primaryManifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    fixture.sourceSha = await commitFixture(fixture.root, "Select unrelated previous metadata");

    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /dependency is absent.*record\.json -> .*historical\.html/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("publication projection fails closed when an authored dependency is absent from the explicit manifest", async () => {
  const fixture = await createFixtureRoot();
  try {
    await enablePublicationFixture(fixture);
    const manifest = JSON.parse(await readFile(fixture.primaryManifestPath, "utf8"));
    manifest.files = manifest.files.filter(
      ({ source_path }) => source_path !== "collaboration/demo.html",
    );
    await writeFile(fixture.primaryManifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    fixture.sourceSha = await commitFixture(fixture.root, "Remove required publication dependency");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /dependency is absent.*index\.html -> collaboration\/demo\.html/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("unsettled Core authority pauses both primary and iframe production selection at Issue #110", async () => {
  const primaryFixture = await createFixtureRoot();
  try {
    await writeFile(
      path.join(primaryFixture.root, "visitor/index.html"),
      '<!doctype html><script>const context = "https://example.org/core-architectures#";</script>\n',
      "utf8",
    );
    primaryFixture.sourceSha = await commitFixture(
      primaryFixture.root,
      "Add unsettled primary authority",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: primaryFixture.root,
        sourceSha: primaryFixture.sourceSha,
        configurationPath: primaryFixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /pauses at Issue #110:.*1 primary file\(s\) and 0 iframe package file\(s\)/,
    );
  } finally {
    await rm(primaryFixture.root, { recursive: true, force: true });
  }

  const materializedFixture = await createFixtureRoot();
  try {
    const publication = await enablePublicationFixture(materializedFixture);
    await writeFile(
      path.join(materializedFixture.root, ".env.public"),
      publication.publicConfiguration.replace(
        publication.destinations.PUBLIC_URL_REGISTRY_PRACTITIONER_PROBES,
        "https://example.org/core-architectures/",
      ),
      "utf8",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: materializedFixture.root,
        sourceSha: materializedFixture.sourceSha,
        configurationPath: materializedFixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /pauses at Issue #110:.*1 primary file\(s\) and 0 iframe package file\(s\)/,
    );
  } finally {
    await rm(materializedFixture.root, { recursive: true, force: true });
  }

  const iframeFixture = await createFixtureRoot();
  try {
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: iframeFixture.root,
        sourceSha: iframeFixture.sourceSha,
        configurationPath: iframeFixture.configurationPath,
        aggregatePlan: aggregateFixture({
          canvasHtml:
            '<!doctype html><script>const context = "https://example.org/core-architectures#";</script>',
        }),
      }),
      /pauses at Issue #110:.*0 primary file\(s\) and 1 iframe package file\(s\)/,
    );
  } finally {
    await rm(iframeFixture.root, { recursive: true, force: true });
  }
});

test("the independent iframe-plan binding changes for a same-length payload mutation", async () => {
  const fixture = await createFixtureRoot();
  try {
    const accepted = aggregateFixture();
    const changed = aggregateFixture({
      canvasHtml: "<!doctype html><title>Canoes</title>",
    });
    assert.equal(
      sha256(accepted.outputFiles.get("route-manifest.json")),
      sha256(changed.outputFiles.get("route-manifest.json")),
      "the fixture holds its receipt constant when only equal-length payload bytes change",
    );

    const first = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: accepted,
    });
    const second = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: changed,
    });
    assert.notEqual(
      first.manifest.inputs.iframe_package.closure_sha256,
      second.manifest.inputs.iframe_package.closure_sha256,
    );

    const inconsistent = aggregateFixture();
    inconsistent.outputFiles.set(
      "canvas/demo/index.html",
      Buffer.from("longer aggregate fixture bytes", "utf8"),
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: inconsistent,
      }),
      /receipt totals differ|canvas receipt differs/,
    );

    const routeDrift = aggregateFixture();
    routeDrift.familyPlans.get("core").receipt.package_contract.primary_routes = 2;
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: routeDrift,
      }),
      /core receipt differs from its output plan/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("fixture configuration and primary manifest load through the repository-owned seam", async () => {
  const fixture = await createFixtureRoot();
  try {
    const loaded = await loadProductionProjectionInputs(fixture.configurationPath, {
      repositoryRoot: fixture.root,
    });
    assert.equal(loaded.primaryManifest.files[0].projected_path, "index.html");
    assert.equal(loaded.configuration.primary_manifest, primaryManifestRelativePath);
    assert.deepEqual(
      Object.keys(loaded.binding.configuration).sort(),
      ["git_blob_id", "sha256", "source_path"],
    );
    assert.equal(
      loaded.binding.configuration.source_path,
      configurationRelativePath,
    );
    assert.equal(
      loaded.binding.primary_manifest.source_path,
      primaryManifestRelativePath,
    );
    assert.match(loaded.binding.configuration.git_blob_id, /^[a-f0-9]{40}$/);
    assert.match(loaded.binding.configuration.sha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("ignored configuration and primary-manifest files cannot select production membership", async () => {
  const ignoredConfiguration = await createFixtureRoot();
  const ignoredManifest = await createFixtureRoot();
  try {
    await writeFile(
      path.join(ignoredConfiguration.root, ".gitignore"),
      "private/\n",
      "utf8",
    );
    ignoredConfiguration.sourceSha = await commitFixture(
      ignoredConfiguration.root,
      "Ignore private selection files",
    );
    const ignoredConfigurationPath = path.join(
      ignoredConfiguration.root,
      "private/config.json",
    );
    await mkdir(path.dirname(ignoredConfigurationPath), { recursive: true });
    await writeFile(
      ignoredConfigurationPath,
      `${JSON.stringify({
        id: "prod-projection.configuration.v1",
        version: "1",
        primary_manifest: primaryManifestRelativePath,
      })}\n`,
      "utf8",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: ignoredConfiguration.root,
        sourceSha: ignoredConfiguration.sourceSha,
        configurationPath: ignoredConfigurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /configuration must be a regular tracked blob/,
    );

    await writeFile(
      path.join(ignoredManifest.root, ".gitignore"),
      "private/\n",
      "utf8",
    );
    await writeFile(
      ignoredManifest.configurationPath,
      `${JSON.stringify({
        id: "prod-projection.configuration.v1",
        version: "1",
        primary_manifest: "private/primary.json",
      })}\n`,
      "utf8",
    );
    ignoredManifest.sourceSha = await commitFixture(
      ignoredManifest.root,
      "Select ignored primary manifest",
    );
    await mkdir(path.join(ignoredManifest.root, "private"), { recursive: true });
    await writeFile(
      path.join(ignoredManifest.root, "private/primary.json"),
      `${JSON.stringify(primaryManifest([
        {
          source_path: "visitor/index.html",
          projected_path: "index.html",
          media_type: "text/html",
        },
      ]))}\n`,
      "utf8",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: ignoredManifest.root,
        sourceSha: ignoredManifest.sourceSha,
        configurationPath: ignoredManifest.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /manifest must be a regular tracked blob/,
    );
  } finally {
    await rm(ignoredConfiguration.root, { recursive: true, force: true });
    await rm(ignoredManifest.root, { recursive: true, force: true });
  }
});

test("clean CRLF worktree filters preserve immutable Git-blob output bytes", async () => {
  const fixture = await createFixtureRoot();
  try {
    await writeFile(
      path.join(fixture.root, ".gitattributes"),
      "*.html text eol=crlf\n",
      "utf8",
    );
    fixture.sourceSha = await commitFixture(fixture.root, "Use a CRLF checkout filter");
    await rm(path.join(fixture.root, "visitor/index.html"));
    await git(
      fixture.root,
      ["checkout", "--force", "HEAD", "--", "visitor/index.html"],
    );
    assert.equal(await git(fixture.root, ["status", "--porcelain=v1"]), "");
    const { stdout: trackedBytes } = await execFileAsync(
      "git",
      ["show", "HEAD:visitor/index.html"],
      { cwd: fixture.root, encoding: "buffer" },
    );
    const worktreeBytes = await readFile(
      path.join(fixture.root, "visitor/index.html"),
    );
    assert.ok(worktreeBytes.includes(Buffer.from("\r\n")));
    assert.ok(!trackedBytes.includes(Buffer.from("\r\n")));

    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    assert.ok(
      plan.outputFiles.get("primary-public/index.html").equals(trackedBytes),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("the automatic source coordinate is a clean full Git SHA", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "prod-projection-git-"));
  try {
    await execFileAsync("git", ["init", "--quiet"], { cwd: root });
    await execFileAsync("git", ["config", "user.name", "Projection Test"], { cwd: root });
    await execFileAsync("git", ["config", "user.email", "projection@example.test"], { cwd: root });
    await writeFile(path.join(root, "source.txt"), "accepted\n", "utf8");
    await execFileAsync("git", ["add", "source.txt"], { cwd: root });
    await execFileAsync("git", ["commit", "--quiet", "-m", "Accept fixture"], { cwd: root });

    assert.match(await readRepositorySourceSha(root), /^[a-f0-9]{40}$/);
    await writeFile(path.join(root, "source.txt"), "changed\n", "utf8");
    await assert.rejects(
      readRepositorySourceSha(root),
      (error) => {
        assert.match(error.message, /requires a clean Git worktree/);
        assert.doesNotMatch(error.message, /source\.txt/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an ignored primary file remains outside the captured tracked source", async () => {
  const fixture = await createFixtureRoot();
  try {
    await mkdir(path.join(fixture.root, "private"));
    await writeFile(path.join(fixture.root, ".gitignore"), "private/\n", "utf8");
    await writeFile(path.join(fixture.root, "private/index.html"), "private", "utf8");
    const ignoredSourceSha = await commitPrimaryManifest(
      fixture,
      [
        {
          source_path: "private/index.html",
          projected_path: "index.html",
          media_type: "text/html",
        },
      ],
      "Ignore private fixture",
    );

    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: ignoredSourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /must be a regular tracked blob/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an untracked primary file keeps the source coordinate open", async () => {
  const fixture = await createFixtureRoot();
  try {
    await commitPrimaryManifest(
      fixture,
      [
        {
          source_path: "visitor/untracked.html",
          projected_path: "index.html",
          media_type: "text/html",
        },
      ],
      "Select absent fixture",
    );
    await writeFile(
      path.join(fixture.root, "visitor/untracked.html"),
      "untracked",
      "utf8",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /requires a clean Git worktree/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an alternate repository root requires its aggregate plan to be injected", async () => {
  const fixture = await createFixtureRoot();
  try {
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
      }),
      /alternate repository root requires an injected aggregate iframe plan/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("source revalidation catches a tracked-file mutation during composition", async () => {
  const fixture = await createFixtureRoot();
  try {
    const aggregatePlan = aggregateFixture();
    const originalFiles = aggregatePlan.outputFiles;
    aggregatePlan.outputFiles = new class extends Map {
      *entries() {
        let mutated = false;
        for (const entry of super.entries()) {
          if (!mutated) {
            writeFileSync(
              path.join(fixture.root, "visitor/index.html"),
              "changed during composition",
              "utf8",
            );
            mutated = true;
          }
          yield entry;
        }
      }
    }(originalFiles);

    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan,
      }),
      /requires a clean Git worktree|changed during composition/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("conflicting iframe media declarations stay outside the production manifest", async () => {
  const fixture = await createFixtureRoot();
  try {
    const aggregatePlan = aggregateFixture();
    aggregatePlan.familyPlans.get("core").receipt.routes.push({
      projection_file: "strategy-canvas/index.html",
      static_resource_closure: {
        package_files: [
          {
            target_file: "strategy-canvas-system-v0.2/strategy-canvas.schema.json",
            content_type: "application/json",
          },
        ],
      },
    });
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan,
      }),
      /media type declarations conflict/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("primary selection rejects path escape, repository-only roots, nonportable paths, collisions, and missing root index", () => {
  const file = {
    source_path: "visitor/index.html",
    projected_path: "index.html",
    media_type: "text/html",
  };
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([{ ...file, source_path: "../index.html" }])),
    /must stay relative and normalized/,
  );
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([{ ...file, source_path: "tools/index.html" }])),
    /repository-only root tools/,
  );
  for (const sourcePath of [".ENV/private.html", ".GIT/config.html", ".AgEnTs/guide.html"]) {
    assert.throws(
      () => validatePrimaryManifest(primaryManifest([{ ...file, source_path: sourcePath }])),
      /environment files|repository-only root/,
      sourcePath,
    );
  }
  for (const projectedPath of [
    "line\nbreak.html",
    "caf\u0065\u0301.html",
    "CON.html",
    "trailing-dot.",
    "drive:C.html",
    "bad<name.html",
    "bad>name.html",
    "bad\"name.html",
    "bad|name.html",
    "bad?name.html",
    "bad*name.html",
  ]) {
    assert.throws(
      () => validatePrimaryManifest(primaryManifest([
        { ...file, projected_path: projectedPath },
      ])),
      /Unicode NFC|must remain portable/,
      projectedPath,
    );
  }
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([
      { ...file, projected_path: "bad\\name.html" },
    ])),
    /must stay relative and normalized/,
  );
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([
      file,
      { ...file, source_path: "visitor/second.html", projected_path: "INDEX.HTML" },
    ])),
    /output collides/,
  );
  assert.throws(
    () => validatePrimaryManifest(primaryManifest([
      { ...file, projected_path: "about.html" },
    ])),
    /project index.html at the primary root/,
  );
});

test("primary source traversal through a symbolic link stays outside the projection", async () => {
  const fixture = await createFixtureRoot();
  const outside = await mkdtemp(path.join(os.tmpdir(), "prod-projection-outside-"));
  try {
    await writeFile(path.join(outside, "index.html"), "outside", "utf8");
    await symlink(path.join(outside, "index.html"), path.join(fixture.root, "visitor/link.html"));
    const linkedSourceSha = await commitPrimaryManifest(
      fixture,
      [
        {
          source_path: "visitor/link.html",
          projected_path: "index.html",
          media_type: "text/html",
        },
      ],
      "Track symbolic fixture",
    );
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: linkedSourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /must be a regular tracked blob/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("check uses temporary storage while explicit build transactionally replaces its owned output", async () => {
  const fixture = await createFixtureRoot();
  try {
    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });

    const check = await checkProductionProjection(plan);
    assert.equal(check.files, plan.outputFiles.size);
    await assert.rejects(readFile(path.join(plan.outputRoot, "deployment-manifest.json")), {
      code: "ENOENT",
    });

    const built = await persistProductionProjection(plan);
    assert.equal(built.files, plan.outputFiles.size);
    assert.deepEqual(
      { installation: built.installation, cleanup: built.cleanup },
      { installation: "installed", cleanup: "complete" },
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(plan.outputRoot, "deployment-manifest.json"), "utf8")),
      plan.manifest,
    );
    await writeFile(path.join(plan.outputRoot, "stale.txt"), "stale", "utf8");
    await persistProductionProjection(plan);
    await assert.rejects(readFile(path.join(plan.outputRoot, "stale.txt")), {
      code: "ENOENT",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a post-install cleanup failure returns installed with cleanup incomplete", async () => {
  const fixture = await createFixtureRoot();
  try {
    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    const result = await persistProductionProjection(
      plan,
      plan.outputRoot,
      {
        remove: async () => {
          throw new Error("fixture cleanup interruption");
        },
      },
    );

    assert.equal(result.installation, "installed");
    assert.equal(result.cleanup, "incomplete");
    assert.deepEqual(
      JSON.parse(await readFile(path.join(plan.outputRoot, "deployment-manifest.json"), "utf8")),
      plan.manifest,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("explicit build preserves a pre-existing output outside the assembler's ownership", async () => {
  const fixture = await createFixtureRoot();
  try {
    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan: aggregateFixture(),
    });
    await mkdir(plan.outputRoot);
    await writeFile(path.join(plan.outputRoot, "owner.txt"), "external owner", "utf8");

    await assert.rejects(
      persistProductionProjection(plan),
      /no owned deployment manifest|outside this builder's ownership/,
    );
    assert.equal(
      await readFile(path.join(plan.outputRoot, "owner.txt"), "utf8"),
      "external owner",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an unresolved public-reference token keeps the primary closure at its configuration boundary", async () => {
  const fixture = await createFixtureRoot();
  try {
    await writeFile(
      path.join(fixture.root, "visitor/index.html"),
      '<a href="{{PUBLIC_URL_REGISTRY_WELCOME_MAT}}">Registry</a>',
      "utf8",
    );
    const tokenSourceSha = await commitFixture(fixture.root, "Add unresolved token fixture");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: tokenSourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /retains an unresolved public URL token/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an unresolved professional-profile token keeps the primary closure at its configuration boundary", async () => {
  const fixture = await createFixtureRoot();
  try {
    await writeFile(
      path.join(fixture.root, "visitor/index.html"),
      '<script>var professionalProfileRoute = "{{PUBLIC_URL_AUTHOR_PROFESSIONAL_PROFILE}}";</script>\n',
      "utf8",
    );
    const tokenSourceSha = await commitFixture(fixture.root, "Add unresolved profile token fixture");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: tokenSourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan: aggregateFixture(),
      }),
      /retains an unresolved public URL token/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
