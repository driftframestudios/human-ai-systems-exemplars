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

import visitorBoundaryContract from "../../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js";
import {
  artifactAttribution,
  artifactAuthor,
  artifactLicense,
} from "../../tools/attribution-contract.mjs";
import {
  checkProductionProjection,
  createProductionCarrierPlan,
  createProductionProjectionPlan,
  inspectImageDimensions,
  loadProductionProjectionInputs,
  persistProductionProjection,
  projectAboutCssProfile,
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
const cssConsumerSourcePath =
  "context-canvas-project-surface/context-canvas/index.html";
const cssConsumerProjectedPath = "index.html";
const cssConsumerSourceRoot =
  "context-canvas-project-surface/context-canvas";
const cssSourceRelativePaths = [
  "styles/core/tokens.css",
  "styles/core/foundation.css",
  "styles/components/site-navigation.css",
  "styles/components/tables.css",
  "styles/components/route-card-grid.css",
  "styles/routes/about.css",
  "styles/routes/about-noscript.css",
  "canvas-shell.css",
];
const cssSourcePaths = cssSourceRelativePaths.map(
  (relativePath) =>
    `context-canvas-project-surface/context-canvas/${relativePath}`,
);

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

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

function cssProjectionConfiguration(overrides = {}) {
  return {
    id: "prod-projection.css-profile.v1",
    profile: "about-conservative-v1",
    consumer: "context-canvas-project-surface/context-canvas/index.html",
    output_directory: "assets/css",
    tool: {
      name: "csso",
      version: "5.0.5",
      options: {
        restructure: false,
        forceMediaMerge: false,
        comments: false,
        ...(overrides.options ?? {}),
      },
      ...(overrides.tool ?? {}),
    },
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => !["options", "tool"].includes(key)),
    ),
  };
}

function cssProjectionConsumerHtml(hrefs = cssSourceRelativePaths) {
  const base = hrefs
    .slice(0, 6)
    .map((href) => `<link rel="stylesheet" href="${href}" media="all">`)
    .join("\n");
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    "<title>About fixture</title>",
    base,
    `<noscript><link rel="stylesheet" href="${hrefs[6]}" media="all"></noscript>`,
    '<meta name="description" content="The loading contexts stay distinct.">',
    `<link rel="stylesheet" href="${hrefs[7]}">`,
    "</head>",
    "<body><main>About fixture</main></body>",
    "</html>",
    "",
  ].join("\n");
}

function cssProjectionFixture(options = {}) {
  const sourceBytes = options.sourceBytes ?? cssSourcePaths.map(
    (sourcePath, index) => Buffer.from(
      `.fixture-${index + 1} { color: rgb(${index + 1}, 2, 3); }\n`,
      "utf8",
    ),
  );
  const consumerBytes = Buffer.from(
    options.consumerHtml ?? cssProjectionConsumerHtml(),
    "utf8",
  );
  const renderedConsumerBytes = Buffer.from(
    options.renderedConsumerHtml ?? consumerBytes,
  );
  const cssSources = new Map(
    cssSourcePaths.map((sourcePath, index) => [
      sourcePath,
      {
        bytes: sourceBytes[index],
        git_blob_id: (index + 1).toString(16).padStart(40, "0"),
      },
    ]),
  );
  const projectedPaths = new Map([
    [cssConsumerSourcePath, cssConsumerProjectedPath],
    ...cssSourcePaths.map((sourcePath, index) => [
      sourcePath,
      cssSourceRelativePaths[index],
    ]),
    ...(options.projectedAssets ?? []),
  ]);
  const consumer = {
    source_path: cssConsumerSourcePath,
    projected_path: cssConsumerProjectedPath,
    bytes: consumerBytes,
    git_blob_id: "f".repeat(40),
  };
  return {
    consumer,
    consumerSourceRoot: cssConsumerSourceRoot,
    renderedConsumerBytes,
    cssSources,
    projectedPaths,
    profile: cssProjectionConfiguration(),
  };
}

function runCssProjection(fixture, overrides = {}) {
  return projectAboutCssProfile({
    ...fixture,
    ...overrides,
  });
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
          contract: {
            routes: options.canvasRoutes ?? [],
          },
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

async function enableCssProjectionPlanFixture(fixture) {
  const canvasRoot = "context-canvas-project-surface/context-canvas";
  const files = new Map([
    [cssConsumerSourcePath, Buffer.from(cssProjectionConsumerHtml(), "utf8")],
    ...cssSourcePaths.map((sourcePath, index) => [
      sourcePath,
      Buffer.from(`.fixture-${index + 1} { color: rgb(${index + 1}, 2, 3); }\n`, "utf8"),
    ]),
  ]);
  for (const [relativePath, bytes] of files) {
    const filePath = path.join(fixture.root, ...relativePath.split("/"));
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
  }
  await writeFile(
    fixture.primaryManifestPath,
    `${JSON.stringify(primaryManifest([
      {
        source_path: cssConsumerSourcePath,
        projected_path: cssConsumerProjectedPath,
        media_type: "text/html",
      },
      ...cssSourcePaths.map((sourcePath, index) => ({
        source_path: sourcePath,
        projected_path: cssSourceRelativePaths[index],
        media_type: "text/css",
      })),
    ]))}\n`,
    "utf8",
  );
  await writeFile(
    fixture.configurationPath,
    `${JSON.stringify({
      id: "prod-projection.configuration.v1",
      version: "1",
      primary_manifest: primaryManifestRelativePath,
      css_projection: cssProjectionConfiguration(),
      publication: {
        base_url: "https://vik.guru/",
        source_root: canvasRoot,
        public_reference_config: ".env.public",
      },
    })}\n`,
    "utf8",
  );
  await writeFile(
    path.join(fixture.root, ".gitignore"),
    ".env.public\n.prod-projection-build/\n",
    "utf8",
  );
  await writeFile(path.join(fixture.root, ".env.public"), "", "utf8");
  fixture.sourceSha = await commitFixture(
    fixture.root,
    "Accept exact About CSS projection fixture",
  );
  return { files };
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

test("selected Canvas full views receive the shared public metadata at the primary boundary", async () => {
  const fixture = await createFixtureRoot();
  try {
    const source = [
      "<!doctype html>",
      "<html>",
      "<head><title>Canvas full view</title></head>",
      "<body><main>Standalone working view</main></body>",
      "</html>",
      "",
    ].join("\n");
    await writeFile(path.join(fixture.root, "visitor/index.html"), source, "utf8");
    fixture.sourceSha = await commitFixture(
      fixture.root,
      "Accept Canvas full-view fixture",
    );
    const aggregatePlan = aggregateFixture({
      canvasRoutes: [
        {
          id: "demo",
          source_file: "visitor/index.html",
          projection_kind: "decorated_copy",
        },
      ],
    });
    const plan = await createProductionProjectionPlan({
      repositoryRoot: fixture.root,
      sourceSha: fixture.sourceSha,
      configurationPath: fixture.configurationPath,
      aggregatePlan,
    });
    const html = plan.outputFiles
      .get("primary-public/index.html")
      .toString("utf8");

    assert.equal(occurrenceCount(html, `<meta name="author" content="${artifactAuthor}">`), 1);
    assert.equal(occurrenceCount(html, `<link rel="license" href="${artifactLicense}">`), 1);
    assert.equal(occurrenceCount(html, artifactAttribution), 1);
    assert.equal(occurrenceCount(html, visitorBoundaryContract.contextText), 1);
    assert.equal(occurrenceCount(html, "data-visitor-boundary aria-label="), 1);
    for (const marker of visitorBoundaryContract.markers) {
      for (const line of marker.lines) assert.equal(occurrenceCount(html, line), 1);
    }
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
  const extendedWebp = Buffer.alloc(30);
  extendedWebp.write("RIFF", 0, "ascii");
  extendedWebp.writeUInt32LE(22, 4);
  extendedWebp.write("WEBPVP8X", 8, "ascii");
  extendedWebp.writeUInt32LE(10, 16);
  extendedWebp.writeUIntLE(1599, 24, 3);
  extendedWebp.writeUIntLE(899, 27, 3);
  assert.deepEqual(inspectImageDimensions(extendedWebp, "image/webp"), {
    standing: "available",
    width: 1600,
    height: 900,
    unit: "pixel",
    source: "webp_vp8x_canvas",
  });
  const losslessWebp = Buffer.alloc(26);
  losslessWebp.write("RIFF", 0, "ascii");
  losslessWebp.writeUInt32LE(18, 4);
  losslessWebp.write("WEBPVP8L", 8, "ascii");
  losslessWebp.writeUInt32LE(5, 16);
  losslessWebp[20] = 0x2f;
  losslessWebp[21] = 6;
  losslessWebp[22] = 0;
  losslessWebp[23] = 1;
  assert.deepEqual(inspectImageDimensions(losslessWebp, "image/webp"), {
    standing: "available",
    width: 7,
    height: 5,
    unit: "pixel",
    source: "webp_vp8l_header",
  });
  const lossyWebp = Buffer.alloc(30);
  lossyWebp.write("RIFF", 0, "ascii");
  lossyWebp.writeUInt32LE(22, 4);
  lossyWebp.write("WEBPVP8 ", 8, "ascii");
  lossyWebp.writeUInt32LE(10, 16);
  Buffer.from([0x9d, 0x01, 0x2a]).copy(lossyWebp, 23);
  lossyWebp.writeUInt16LE(320, 26);
  lossyWebp.writeUInt16LE(240, 28);
  assert.deepEqual(inspectImageDimensions(lossyWebp, "image/webp"), {
    standing: "available",
    width: 320,
    height: 240,
    unit: "pixel",
    source: "webp_vp8_frame",
  });
  assert.throws(
    () => inspectImageDimensions(Buffer.from("not a webp"), "image/webp"),
    /WebP RIFF container/,
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

test("the production CSS profile admits one exact tracked About configuration", async () => {
  const fixture = await createFixtureRoot();
  const valid = {
    id: "prod-projection.configuration.v1",
    version: "1",
    primary_manifest: primaryManifestRelativePath,
    css_projection: cssProjectionConfiguration(),
    publication: {
      base_url: "https://vik.guru/",
      source_root: "context-canvas-project-surface/context-canvas",
      public_reference_config: ".env.public",
    },
  };
  const writeConfiguration = async (configuration, message) => {
    await writeFile(
      fixture.configurationPath,
      `${JSON.stringify(configuration)}\n`,
      "utf8",
    );
    fixture.sourceSha = await commitFixture(fixture.root, message);
  };
  try {
    await writeConfiguration(valid, "Select exact production CSS profile");
    const loaded = await loadProductionProjectionInputs(fixture.configurationPath, {
      repositoryRoot: fixture.root,
    });
    assert.deepEqual(loaded.configuration.css_projection, valid.css_projection);

    const invalidCases = [
      ["unknown profile key", (value) => { value.unowned = true; }, /must contain exactly/],
      ["profile identity", (value) => { value.id = "prod-projection.css-profile.v2"; }, /must use prod-projection\.css-profile\.v1/],
      ["profile name", (value) => { value.profile = "about-fast-v1"; }, /profile about-conservative-v1/],
      ["consumer kind", (value) => { value.consumer = "visitor/about.css"; }, /consumer must be an HTML file/],
      ["output kind", (value) => { value.output_directory = "assets/css/file.css"; }, /must identify a directory/],
      ["tool name", (value) => { value.tool.name = "other"; }, /tool must be csso 5\.0\.5/],
      ["tool version", (value) => { value.tool.version = "5.0.4"; }, /tool must be csso 5\.0\.5/],
      ["restructure option", (value) => { value.tool.options.restructure = true; }, /option restructure must be false/],
      ["media merge option", (value) => { value.tool.options.forceMediaMerge = true; }, /option forceMediaMerge must be false/],
      ["comment option", (value) => { value.tool.options.comments = true; }, /option comments must be false/],
      ["unknown option", (value) => { value.tool.options.extra = false; }, /options must contain exactly/],
    ];
    for (const [label, mutate, expected] of invalidCases) {
      const configuration = structuredClone(valid);
      mutate(configuration.css_projection);
      await writeConfiguration(configuration, `Reject CSS profile ${label}`);
      await assert.rejects(
        loadProductionProjectionInputs(fixture.configurationPath, {
          repositoryRoot: fixture.root,
        }),
        expected,
      );
    }

    const noPublication = structuredClone(valid);
    delete noPublication.publication;
    await writeConfiguration(noPublication, "Reject CSS profile without publication");
    await assert.rejects(
      loadProductionProjectionInputs(fixture.configurationPath, {
        repositoryRoot: fixture.root,
      }),
      /CSS projection requires publication geometry/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("the About CSS projection preserves loading contexts, ordered lineage, and deterministic full-digest outputs", () => {
  const fixture = cssProjectionFixture();
  const first = runCssProjection(fixture);
  const second = runCssProjection(fixture);

  assert.deepEqual(
    first.outputs.map(({ id }) => id),
    ["about-document-base", "about-noscript", "about-document-shell"],
  );
  assert.deepEqual(
    first.outputs.map(({ lineage }) => lineage.ordered_sources.map(
      ({ source_path: sourcePath }) => sourcePath,
    )),
    [cssSourcePaths.slice(0, 6), [cssSourcePaths[6]], [cssSourcePaths[7]]],
  );
  assert.deepEqual(
    first.outputs.map(({ lineage }) => lineage.execution_context),
    [
      { owner: "document", scripts: "any", media: "all", sequence: 1 },
      { owner: "noscript", scripts: "unavailable", media: "all", sequence: 2 },
      { owner: "document", scripts: "any", media: "all", sequence: 3 },
    ],
  );
  for (const output of first.outputs) {
    assert.match(output.projected_path, /^assets\/css\/[a-f0-9]{64}\.css$/);
    assert.equal(output.lineage.kind, "css_projection");
    assert.equal(output.lineage.profile, "about-conservative-v1");
    assert.deepEqual(output.lineage.tool, fixture.profile.tool);
    assert.equal(output.lineage.output.projected_path, output.projected_path);
    assert.equal(output.lineage.output.bytes, output.bytes.byteLength);
    assert.equal(output.lineage.output.sha256, sha256(output.bytes));
    assert.equal(output.lineage.output.media_type, "text/css");
    assert.match(output.lineage.recovery_condition, /Regenerate from the tracked consumer/);
    assert.doesNotMatch(output.bytes.toString("utf8"), /sourceMappingURL/);
  }
  assert.deepEqual(first.input, {
    id: "prod-projection.css-profile.v1",
    profile: "about-conservative-v1",
    consumer: {
      source_path: cssConsumerSourcePath,
      projected_path: cssConsumerProjectedPath,
      git_blob_id: "f".repeat(40),
      sha256: sha256(fixture.consumer.bytes),
    },
    output_directory: "assets/css",
    tool: fixture.profile.tool,
  });

  const generatedHtml = first.consumer_bytes.toString("utf8");
  assert.equal(generatedHtml.match(/rel="stylesheet"/g)?.length, 3);
  assert.match(
    generatedHtml,
    new RegExp(`<noscript><link rel="stylesheet" href="${first.outputs[1].projected_path}" media="all"></noscript>`),
  );
  assert.doesNotMatch(generatedHtml, /styles\/(?:core|components|routes)\//);
  for (const output of first.outputs) assert.ok(generatedHtml.includes(output.projected_path));
  assert.ok(first.consumer_bytes.equals(second.consumer_bytes));
  assert.deepEqual(
    first.outputs.map(({ projected_path: projectedPath, bytes }) => [projectedPath, bytes]),
    second.outputs.map(({ projected_path: projectedPath, bytes }) => [projectedPath, bytes]),
  );
});

test("the About CSS projection rebases selected local URLs while preserving their reference classes", () => {
  const sourceBytes = cssSourcePaths.map((sourcePath, index) => Buffer.from(
    `.fixture-${index + 1} { color: rgb(${index + 1}, 2, 3); }\n`,
    "utf8",
  ));
  sourceBytes[0] = Buffer.from([
    '.tokens { background-image: url("../../media/grid.svg?rev=1#crop");',
    'mask-image: url("#clip"); cursor: url("/root/cursor.svg"), auto;',
    'border-image-source: url("https://assets.example.test/frame.svg");',
    'list-style-image: url("//cdn.example.test/list.svg");',
    'content: url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E"); }',
  ].join("\n"), "utf8");
  sourceBytes[5] = Buffer.from(
    '.about { src: url("../../../shared/type.woff2?#iefix"); }\n',
    "utf8",
  );
  sourceBytes[7] = Buffer.from(
    ".shell { background-image: url(img/photo.png); }\n",
    "utf8",
  );
  const projectedAssets = [
    ["context-canvas-project-surface/context-canvas/media/grid.svg", "media/grid.svg"],
    ["context-canvas-project-surface/context-canvas/root/cursor.svg", "root/cursor.svg"],
    ["context-canvas-project-surface/shared/type.woff2", "shared/type.woff2"],
    ["context-canvas-project-surface/context-canvas/img/photo.png", "img/photo.png"],
  ];
  const fixture = cssProjectionFixture({ sourceBytes, projectedAssets });
  const resolved = [];
  const result = runCssProjection(fixture, {
    onResolvedReference: (reference) => resolved.push(reference),
  });
  const generatedCss = result.outputs.map(({ bytes }) => bytes.toString("utf8")).join("\n");

  assert.match(generatedCss, /\.\.\/\.\.\/media\/grid\.svg\?rev=1#crop/);
  assert.match(generatedCss, /\.\.\/\.\.\/shared\/type\.woff2\?#iefix/);
  assert.match(generatedCss, /\.\.\/\.\.\/img\/photo\.png/);
  for (const preserved of [
    "#clip",
    "/root/cursor.svg",
    "https://assets.example.test/frame.svg",
    "//cdn.example.test/list.svg",
    "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
  ]) {
    assert.ok(generatedCss.includes(preserved), `${preserved} remains unchanged`);
  }
  assert.deepEqual(resolved, [
    {
      consumer_path: cssSourcePaths[0],
      target_path: "context-canvas-project-surface/context-canvas/media/grid.svg",
    },
    {
      consumer_path: cssSourcePaths[0],
      target_path: "context-canvas-project-surface/context-canvas/root/cursor.svg",
    },
    {
      consumer_path: cssSourcePaths[5],
      target_path: "context-canvas-project-surface/shared/type.woff2",
    },
    {
      consumer_path: cssSourcePaths[7],
      target_path: "context-canvas-project-surface/context-canvas/img/photo.png",
    },
  ]);
});

test("the About CSS projection rejects graph drift and unsupported loading attributes", () => {
  const html = cssProjectionConsumerHtml();
  const firstLink = `<link rel="stylesheet" href="${cssSourceRelativePaths[0]}" media="all">`;
  const secondLink = `<link rel="stylesheet" href="${cssSourceRelativePaths[1]}" media="all">`;
  const cases = [
    [
      "a boundary inside the six-owner run",
      html.replace(`${firstLink}\n${secondLink}`, `${firstLink}\n<meta charset="utf-8">\n${secondLink}`),
      /one contiguous loading run/,
    ],
    [
      "a changed base media context",
      html.replace('href="styles/core/tokens.css" media="all"', 'href="styles/core/tokens.css" media="print"'),
      /must remain media=all/,
    ],
    [
      "a loading attribute outside the admitted contract",
      html.replace(firstLink, firstLink.replace(">", ' integrity="sha256-fixture">')),
      /unsupported loading attribute integrity/,
    ],
    [
      "an unquoted rel attribute",
      html.replace('rel="stylesheet"', "rel=stylesheet"),
      /stylesheet attribute rel must be quoted/,
    ],
    [
      "an unquoted href attribute",
      html.replace('href="styles\/core\/tokens.css"', "href=styles/core/tokens.css"),
      /stylesheet attribute href must be quoted/,
    ],
    [
      "an unquoted media attribute",
      html.replace('media="all"', "media=all"),
      /stylesheet attribute media must be quoted/,
    ],
    [
      "an extra stylesheet owner",
      html.replace("</head>", '<link rel="stylesheet" href="extra.css">\n</head>'),
      /exact eight-owner About stylesheet graph/,
    ],
    [
      "a reordered loading context",
      html.replace(
        `<link rel="stylesheet" href="${cssSourceRelativePaths[5]}" media="all">\n` +
          `<noscript><link rel="stylesheet" href="${cssSourceRelativePaths[6]}" media="all"></noscript>`,
        `<noscript><link rel="stylesheet" href="${cssSourceRelativePaths[6]}" media="all"></noscript>\n` +
          `<link rel="stylesheet" href="${cssSourceRelativePaths[5]}" media="all">`,
      ),
      /base stylesheet owner 6 must remain media=all in the document context/,
    ],
    [
      "a stylesheet link that exists only inside an HTML comment",
      html.replace(
        `<link rel="stylesheet" href="${cssSourceRelativePaths[7]}">`,
        `<!-- <link rel="stylesheet" href="${cssSourceRelativePaths[7]}"> -->`,
      ),
      /exact eight-owner About stylesheet graph/,
    ],
    [
      "a stylesheet link that exists only inside a raw-text element",
      html.replace(
        `<link rel="stylesheet" href="${cssSourceRelativePaths[7]}">`,
        `<script type="application/json">"<link rel='stylesheet' href='${cssSourceRelativePaths[7]}'>"</script>`,
      ),
      /exact eight-owner About stylesheet graph/,
    ],
    [
      "a stylesheet link that exists only inside inert template content",
      html.replace(
        `<link rel="stylesheet" href="${cssSourceRelativePaths[7]}">`,
        `<template><link rel="stylesheet" href="${cssSourceRelativePaths[7]}"></template>`,
      ),
      /exact eight-owner About stylesheet graph/,
    ],
    [
      "stylesheet-looking text inside another element attribute",
      html.replace(
        `<link rel="stylesheet" href="${cssSourceRelativePaths[7]}">`,
        `<meta content='<link rel="stylesheet" href="${cssSourceRelativePaths[7]}">' >`,
      ),
      /exact eight-owner About stylesheet graph/,
    ],
    [
      "raw-text marker strings inside ordinary attributes cannot hide an active owner",
      html.replace(
        "</head>",
        '<meta content="<script>"><link rel="stylesheet" href="styles/core/tokens.css" media="all"><meta content="</script>"></head>',
      ),
      /exact eight-owner About stylesheet graph/,
    ],
    [
      "a browser-recognized bang comment close cannot hide an active owner",
      html.replace(
        "</head>",
        '<!-- fake --!><link rel="stylesheet" href="styles/core/tokens.css" media="all"> --></head>',
      ),
      /noncanonical HTML comment close/,
    ],
    [
      "an abrupt empty comment close cannot hide an active owner",
      html.replace(
        "</head>",
        '<!--><link rel="stylesheet" href="styles/core/tokens.css" media="all"> --></head>',
      ),
      /noncanonical HTML comment close/,
    ],
    [
      "an invalid noscript end-tag boundary cannot change browser parsing",
      html.replace("</noscript>", "</noscript=>"),
      /unsupported HTML tag-name boundary/,
    ],
    [
      "an entity-encoded stylesheet relation",
      html.replace(
        firstLink,
        firstLink.replace("stylesheet", "style&#x73;heet"),
      ),
      /stylesheet rel must not contain HTML character references/,
    ],
    [
      "an entity-encoded stylesheet path",
      html.replace(
        firstLink,
        firstLink.replace("tokens.css", "tokens&#46;css"),
      ),
      /stylesheet href must not contain HTML character references/,
    ],
    [
      "an entity-encoded stylesheet media value",
      html.replace(
        firstLink,
        firstLink.replace('media="all"', 'media="a&#x6c;l"'),
      ),
      /stylesheet media must not contain HTML character references/,
    ],
    [
      "a percent-encoded stylesheet pathname",
      html.replace(
        firstLink,
        firstLink.replace("tokens.css", "%2e%2e/other.css"),
      ),
      /stylesheet href pathname .* must not contain percent encoding/,
    ],
    [
      "a backslash stylesheet pathname",
      html.replace(
        firstLink,
        firstLink.replace("tokens.css", String.raw`tokens\other.css`),
      ),
      /stylesheet href pathname .* must not contain backslashes/,
    ],
    [
      "an active stylesheet owner outside the head graph",
      html.replace(
        "<body>",
        '<body><link rel="stylesheet" href="styles/routes/body.css">',
      ),
      /active stylesheet owner outside its head graph/,
    ],
    [
      "an active base element that changes link resolution",
      html.replace("<title>", '<base href="/alternate/"><title>'),
      /must not contain an active base element/,
    ],
    [
      "an active head style owner outside the projected graph",
      html.replace("</title>", "</title><style>.fixture{color:red}</style>"),
      /must not contain an active head style owner/,
    ],
  ];
  for (const [label, consumerHtml, expected] of cases) {
    assert.throws(
      () => runCssProjection(cssProjectionFixture({ consumerHtml })),
      expected,
      label,
    );
  }

  const fixture = cssProjectionFixture();
  const renderedConsumerHtml = html.replace(
    `${firstLink}\n${secondLink}`,
    `${firstLink}\n<meta charset="utf-8">\n${secondLink}`,
  );
  assert.throws(
    () => runCssProjection(fixture, { renderedConsumerBytes: Buffer.from(renderedConsumerHtml) }),
    /Rendered About consumer base stylesheet owners must remain one contiguous loading run/,
  );

  const inertMarkup = [
    '<!-- <base href="/comment/"><style>.comment{}</style><link rel="stylesheet" href="comment.css"> -->',
    '<script type="application/json">{"markers":["<!--","<template>","<base href=\'/script/\'>","<style>.script{}</style>","<link rel=\'stylesheet\' href=\'script.css\'>","</template>"]}</script>',
    '<template><base href="/template/"><style>.template{}</style><link rel="stylesheet" href="template.css"></template>',
  ].join("\n");
  assert.doesNotThrow(() => runCssProjection(cssProjectionFixture({
    consumerHtml: html.replace("</head>", `${inertMarkup}\n</head>`),
  })));
});

test("the About CSS projection rejects unavailable dependencies, path escape, CSS import authority, and invalid CSS", () => {
  const invalidCases = [
    ["missing selected dependency", ".x{background:url(missing.png)}", /dependency is absent from its tracked selected closure/],
    ["missing root-relative dependency", ".x{background:url(\/missing-root.png)}", /dependency is absent from its tracked selected closure/],
    ["repository path escape", ".x{background:url(../../../../../outside.png)}", /URL escapes the repository/],
    ["root-relative source-root escape", ".x{background:url(\/..\/outside.png)}", /root-relative URL escapes its source root/],
    ["CSS import", '@import url("theme.css");', /rejects @import/],
    ["CSS charset", '@charset "UTF-8"; .x{}', /rejects @charset/],
    ["CSS namespace", '@namespace svg url("http://www.w3.org/2000/svg");', /rejects @namespace/],
    ["escaped CSS import", '@\\69mport url("theme.css");', /escaped at-rule name/],
    ["escaped CSS charset", '@\\63 harset "UTF-8"; .x{}', /escaped at-rule name/],
    ["escaped CSS namespace", '@\\6e amespace svg url("http://www.w3.org/2000/svg");', /escaped at-rule name/],
    ["escaped CSS URL function", '.x{background:u\\72l("missing.png")}', /escaped function name/],
    ["string-form image-set source", '.x{background-image:image-set("img/a.png" 1x)}', /string-form image-set sources/],
    ["string-form prefixed image-set source", '.x{background-image:-webkit-image-set("img/a.png" 1x)}', /string-form image-set sources/],
    ["percent-encoded local URL pathname", '.x{background:url("%2e%2e/out.png")}', /local URL pathname .* must not contain percent encoding/],
    ["backslash local URL pathname", String.raw`.x{background:url("img\\outside.png")}`, /local URL pathname .* must not contain backslashes/],
    ["malformed container prelude", "@container canvas-reading (min-width: 80) {.x{display:grid}}", /unsupported raw CSS/],
    ["invalid CSS", ".x{color:red", /could not parse|unbalanced syntax|unsupported raw CSS/],
  ];
  for (const [label, css, expected] of invalidCases) {
    const fixture = cssProjectionFixture();
    fixture.cssSources.set(cssSourcePaths[0], {
      bytes: Buffer.from(css, "utf8"),
      git_blob_id: "a".repeat(40),
    });
    assert.throws(() => runCssProjection(fixture), expected, label);
  }

  const ambiguousProjectedDependency = cssProjectionFixture();
  const localAsset =
    "context-canvas-project-surface/context-canvas/styles/core/img/a.png";
  ambiguousProjectedDependency.projectedPaths.set(
    localAsset,
    "assets/%2e%2e/out.png",
  );
  ambiguousProjectedDependency.cssSources.set(cssSourcePaths[0], {
    bytes: Buffer.from('.x{background:url("img/a.png")}\n', "utf8"),
    git_blob_id: "b".repeat(40),
  });
  assert.throws(
    () => runCssProjection(ambiguousProjectedDependency),
    /projected dependency pathname .* must not contain percent encoding/,
  );

  const ambiguousProjectedStylesheet = cssProjectionFixture();
  ambiguousProjectedStylesheet.projectedPaths.set(
    cssSourcePaths[0],
    "assets/%2e%2e/tokens.css",
  );
  assert.throws(
    () => runCssProjection(ambiguousProjectedStylesheet),
    /projected stylesheet pathname .* must not contain percent encoding/,
  );

  const missingSource = cssProjectionFixture();
  missingSource.cssSources.delete(cssSourcePaths[3]);
  assert.throws(
    () => runCssProjection(missingSource),
    /stylesheet is unavailable as tracked bytes/,
  );
  const unselectedSource = cssProjectionFixture();
  unselectedSource.projectedPaths.delete(cssSourcePaths[3]);
  assert.throws(
    () => runCssProjection(unselectedSource),
    /stylesheet is absent from its selected closure/,
  );
});

test("the About CSS projection admits the bounded container-query form used by current source", () => {
  const fixture = cssProjectionFixture();
  fixture.cssSources.set(cssSourcePaths[1], {
    bytes: Buffer.from(
      "@container canvas-reading (min-width: 80rem) {.fixture{display:grid}}\n",
      "utf8",
    ),
    git_blob_id: "c".repeat(40),
  });
  const result = runCssProjection(fixture);
  assert.match(
    result.outputs[0].bytes.toString("utf8"),
    /@container canvas-reading \(min-width:\s*80rem\)\{\.fixture\{display:grid\}\}/,
  );
});

test("a CSS source change changes only its owned projection path and lineage", () => {
  const fixture = cssProjectionFixture();
  const before = runCssProjection(fixture);
  const original = fixture.cssSources.get(cssSourcePaths[2]);
  fixture.cssSources.set(cssSourcePaths[2], {
    ...original,
    bytes: Buffer.from(".fixture-3 { color: rgb(90, 80, 70); }\n", "utf8"),
    git_blob_id: "b".repeat(40),
  });
  const after = runCssProjection(fixture);

  assert.notEqual(before.outputs[0].projected_path, after.outputs[0].projected_path);
  assert.equal(before.outputs[1].projected_path, after.outputs[1].projected_path);
  assert.equal(before.outputs[2].projected_path, after.outputs[2].projected_path);
  assert.equal(
    after.outputs[0].lineage.ordered_sources[2].sha256,
    sha256(fixture.cssSources.get(cssSourcePaths[2]).bytes),
  );
  assert.equal(
    after.outputs[0].lineage.ordered_sources[2].git_blob_id,
    "b".repeat(40),
  );
});

test("the production plan retains readable CSS authority while closing generated CSS outputs and preserving the installed build on profile failure", async () => {
  const fixture = await createFixtureRoot();
  try {
    const { files } = await enableCssProjectionPlanFixture(fixture);
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
    const primaryOutputs = first.manifest.outputs.filter(
      ({ surface }) => surface === "primary",
    );
    const generated = primaryOutputs.filter(
      ({ source_path: sourcePath }) => sourcePath.startsWith("css-projection:"),
    );

    assert.equal(generated.length, 3);
    assert.equal(first.manifest.surfaces.primary.files, files.size + generated.length);
    assert.equal(
      first.manifest.surfaces.primary.bytes,
      primaryOutputs.reduce((total, { bytes }) => total + bytes, 0),
    );
    assert.deepEqual(first.manifest.inputs.css_projection, {
      id: "prod-projection.css-profile.v1",
      profile: "about-conservative-v1",
      consumer: {
        source_path: cssConsumerSourcePath,
        projected_path: cssConsumerProjectedPath,
        git_blob_id: first.manifest.inputs.css_projection.consumer.git_blob_id,
        sha256: sha256(files.get(cssConsumerSourcePath)),
      },
      output_directory: "assets/css",
      tool: cssProjectionConfiguration().tool,
    });
    assert.match(
      first.manifest.inputs.css_projection.consumer.git_blob_id,
      /^[a-f0-9]{40}$/,
    );
    for (const [sourcePath, sourceBytes] of files) {
      const projectedPath = sourcePath === cssConsumerSourcePath
        ? cssConsumerProjectedPath
        : cssSourceRelativePaths[cssSourcePaths.indexOf(sourcePath)];
      const outputBytes = first.outputFiles.get(`primary-public/${projectedPath}`);
      assert.ok(outputBytes, `${projectedPath} remains in the primary projection`);
      if (sourcePath !== cssConsumerSourcePath) {
        assert.ok(outputBytes.equals(sourceBytes), `${sourcePath} remains readable authority`);
      }
    }
    const generatedHtml = first.outputFiles
      .get("primary-public/index.html")
      .toString("utf8");
    for (const output of generated) {
      assert.ok(first.outputFiles.has(output.projected_path));
      assert.ok(generatedHtml.includes(output.projected_path.replace("primary-public/", "")));
      assert.equal(output.sha256, output.generation.output.sha256);
      assert.equal(output.bytes, output.generation.output.bytes);
      assert.equal(output.projected_path, `primary-public/${output.generation.output.projected_path}`);
    }
    const carrierIndexPaths = createProductionCarrierPlan(first).outputFiles
      .get("deployment-files.tsv")
      .toString("utf8")
      .trimEnd()
      .split("\n")
      .slice(1)
      .map((line) => line.split("\t")[3]);
    for (const output of generated) {
      assert.equal(
        carrierIndexPaths.filter((projectedPath) =>
          projectedPath === output.projected_path,
        ).length,
        1,
        `${output.projected_path} appears exactly once in the carrier index`,
      );
    }
    assert.deepEqual([...first.outputFiles.keys()], [...second.outputFiles.keys()]);
    for (const [projectedPath, bytes] of first.outputFiles) {
      assert.ok(bytes.equals(second.outputFiles.get(projectedPath)), `${projectedPath} is deterministic`);
    }

    await persistProductionProjection(first);
    const installedManifest = await readFile(
      path.join(first.outputRoot, "deployment-manifest.json"),
      "utf8",
    );
    await writeFile(
      path.join(fixture.root, ...cssSourcePaths[0].split("/")),
      ".broken{color:red",
      "utf8",
    );
    fixture.sourceSha = await commitFixture(fixture.root, "Introduce invalid CSS fixture");
    await assert.rejects(
      createProductionProjectionPlan({
        repositoryRoot: fixture.root,
        sourceSha: fixture.sourceSha,
        configurationPath: fixture.configurationPath,
        aggregatePlan,
      }),
      /could not parse|unbalanced syntax|unsupported raw CSS/,
    );
    assert.equal(
      await readFile(path.join(first.outputRoot, "deployment-manifest.json"), "utf8"),
      installedManifest,
    );
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
