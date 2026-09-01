import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  artifactAuthor,
  artifactAttribution,
  artifactLicense,
  attributionContract,
} from "../../tools/attribution-contract.mjs";

import {
  assertOwnedPackageDirectory,
  assertRegularFile,
  assertRegularFileWithin,
  createPackagePlan,
  defaultPaths,
  deriveConditioningFieldProjection,
  navigationObservation,
  observeIframeRuntimeCapabilities,
  rewriteHub,
  scanHtmlClosure,
  scanPackageClosure,
  sha256,
  validateRouteContract,
  verifyPackagePlan,
  writePackagePlan,
} from "../../tools/package-iframe-routes.mjs";

const [coreSourceRoot, contextProjectionPath] =
  attributionContract.public_html.core_projection_roots;
const contextProjectionRoot = path.join(defaultPaths.repositoryRoot, contextProjectionPath);
function occurrenceCount(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

async function loadManifests() {
  const [contractBytes, sourceManifestBytes] = await Promise.all([
    readFile(defaultPaths.routeManifestPath),
    readFile(defaultPaths.sourceManifestPath),
  ]);
  return {
    contract: JSON.parse(contractBytes.toString("utf8")),
    sourceManifest: JSON.parse(sourceManifestBytes.toString("utf8")),
  };
}

function routeIndexPath(contract, route) {
  const relative = route.public_alias === contract.base_path
    ? ""
    : route.public_alias.slice(contract.base_path.length).replace(/\/$/, "");
  return path.posix.join(relative, "index.html");
}

test("the route plan preserves the Core population and adds one supplemental instrument", async () => {
  assert.equal(
    path.relative(defaultPaths.repositoryRoot, defaultPaths.sourceRoot),
    coreSourceRoot,
  );
  assert.equal(
    path.relative(defaultPaths.repositoryRoot, defaultPaths.routeManifestPath),
    attributionContract.public_html.core_route_manifest,
  );
  const firstPlan = await createPackagePlan();
  const secondPlan = await createPackagePlan();
  const prototypeRoutes = firstPlan.contract.routes.filter(({ kind }) => kind === "prototype");
  const supplementalRoutes = firstPlan.contract.routes.filter(
    ({ kind }) => kind === "supplemental_instrument",
  );

  assert.equal(firstPlan.contract.routes.length, 23);
  assert.equal(prototypeRoutes.length, 21);
  assert.equal(supplementalRoutes.length, 1);
  assert.equal(firstPlan.outputFiles.size, 26);
  assert.equal(firstPlan.receipt.package_contract.primary_routes, 23);
  assert.equal(firstPlan.receipt.package_contract.prototype_routes, 21);
  assert.equal(firstPlan.receipt.package_contract.supplemental_instrument_routes, 1);
  assert.equal(firstPlan.receipt.package_contract.compatibility_aliases_generated, false);
  assert.equal(firstPlan.receipt.package_contract.live_cloudflare_mutation, false);
  assert.equal(firstPlan.receipt.package_contract.neighboring_path_posture, "unmatched");
  assert.deepEqual(
    [...firstPlan.outputFiles.keys()].sort(),
    [...secondPlan.outputFiles.keys()].sort(),
  );
  assert.ok(
    firstPlan.outputFiles.get("route-manifest.json")
      .equals(secondPlan.outputFiles.get("route-manifest.json")),
    "the receipt is deterministic",
  );

  for (const route of prototypeRoutes) {
    const source = await readFile(path.join(defaultPaths.sourceRoot, route.source_file));
    const projection = firstPlan.outputFiles.get(routeIndexPath(firstPlan.contract, route));
    assert.ok(projection.equals(source), `${route.id} remains byte-identical`);
  }

  const sourceManifest = await readFile(defaultPaths.sourceManifestPath);
  assert.ok(firstPlan.outputFiles.get("manifest.json").equals(sourceManifest));
  assert.equal(firstPlan.sourceManifest.prototypes.length, 21);
  assert.equal(firstPlan.sourceManifest.counts.current_prototypes, 21);
  assert.equal(
    [...firstPlan.outputFiles.keys()].some((file) => file.includes("v0.1.1/index.html")),
    false,
    "the resting Strategy compatibility alias is not generated",
  );
});

test("the Conditioning Field projection is deterministic, self-contained, and embedded-safe", async () => {
  const firstPlan = await createPackagePlan();
  const secondPlan = await createPackagePlan();
  const route = firstPlan.contract.routes.find(({ id }) => id === "conditioning-field");
  const sourcePath = path.join(
    defaultPaths.repositoryRoot,
    route.source_root,
    route.source_file,
  );
  const source = await readFile(sourcePath, "utf8");
  const firstProjection = firstPlan.outputFiles.get("conditioning-field/index.html");
  const secondProjection = secondPlan.outputFiles.get("conditioning-field/index.html");
  const projection = firstProjection.toString("utf8");
  const receipt = firstPlan.receipt.routes.find(({ id }) => id === "conditioning-field");

  assert.ok(firstProjection.equals(secondProjection));
  assert.equal(deriveConditioningFieldProjection(source), projection);
  assert.notEqual(projection, source);
  assert.match(projection, /<style data-iframe-route-projection>/u);
  assert.match(projection, /id=["']mainContent["']/u);
  assert.match(projection, /id=["']conditioningFieldSchema["']/u);
  assert.match(projection, /data-visitor-boundary-marker=["']maps["']/u);
  assert.match(projection, /data-visitor-boundary-marker=["']big-bench["']/u);
  assert.equal(projection.split(artifactAttribution).length - 1, 1);
  assert.doesNotMatch(
    projection,
    /canvas-shell\.css|canvas-shell\.js|visitor-boundary-contract\.js/u,
  );
  assert.doesNotMatch(projection, /\{\{PUBLIC_URL_[A-Z0-9_]+\}\}/u);
  assert.doesNotMatch(projection, /\btarget=["']_blank["']/iu);
  assert.deepEqual(scanHtmlClosure(projection, new Set(), "Conditioning Field projection"), {
    inline_references: 0,
    package_targets: [],
  });
  assert.deepEqual(receipt.carrier_policy, {
    sandbox_tokens: ["allow-scripts"],
    permissions_policy: [],
    held_capabilities: [],
  });
  assert.deepEqual(receipt.observed_runtime_capabilities, ["executable-scripts"]);
  assert.equal(receipt.projection_kind, "embedded_single_file");
  assert.equal(receipt.activation_eligible, true);
  assert.deepEqual(receipt.static_resource_closure.package_files, []);
  assert.deepEqual(receipt.navigation.unresolved_local_links, []);

  const messagingSource = source.replace(
    "</body>",
    '<script>window.parent.postMessage({type: "conditioning-state"}, "*");</script>\n</body>',
  );
  assert.throws(
    () => deriveConditioningFieldProjection(messagingSource),
    /must not initiate cross-document messaging/,
  );
});

test("adding the supplemental route does not change the existing Core hub projection", async () => {
  const { contract } = await loadManifests();
  const hubRoute = contract.routes.find(({ kind }) => kind === "hub");
  const source = await readFile(
    path.join(defaultPaths.sourceRoot, hubRoute.source_file),
    "utf8",
  );
  const coreOnlyContract = structuredClone(contract);
  coreOnlyContract.routes = coreOnlyContract.routes.filter(
    ({ kind }) => kind !== "supplemental_instrument",
  );

  assert.equal(rewriteHub(source, contract), rewriteHub(source, coreOnlyContract));
});

test("every current Core carrier owns one visible authorship and license declaration", async () => {
  const { contract } = await loadManifests();
  const projections = [defaultPaths.sourceRoot, contextProjectionRoot];

  for (const route of contract.routes.filter(
    ({ kind }) => kind !== "supplemental_instrument",
  )) {
    for (const projectionRoot of projections) {
      const label = `${path.relative(defaultPaths.repositoryRoot, projectionRoot)}/${route.source_file}`;
      const source = await readFile(path.join(projectionRoot, route.source_file), "utf8");

      assert.equal(occurrenceCount(source, /<meta\b[^>]*\bname=["']author["'][^>]*>/gi), 1, `${label} author count`);
      assert.match(
        source,
        new RegExp(`<meta\\b[^>]*\\bname=["']author["'][^>]*\\bcontent=["']${artifactAuthor.replaceAll(".", "\\.")}["'][^>]*>`, "i"),
        `${label} author value`,
      );
      assert.equal(occurrenceCount(source, /<link\b[^>]*\brel=["']license["'][^>]*>/gi), 1, `${label} license count`);
      assert.match(
        source,
        new RegExp(`<link\\b[^>]*\\brel=["']license["'][^>]*\\bhref=["']${artifactLicense.replaceAll(".", "\\.").replaceAll("/", "\\/")}["'][^>]*>`, "i"),
        `${label} license target`,
      );
      assert.equal(
        occurrenceCount(source, /<footer\b[^>]*\bclass=["'][^"']*\bartifact-attribution\b[^"']*["'][^>]*>/gi),
        1,
        `${label} attribution footer count`,
      );
      assert.equal(source.split(artifactAttribution).length - 1, 1, `${label} visible notice count`);
    }
  }
});

test("the hub adapts only its route and manifest href values", async () => {
  const plan = await createPackagePlan();
  const hub = plan.outputFiles.get("index.html").toString("utf8");

  for (const route of plan.contract.routes.filter(({ kind }) => kind === "prototype")) {
    const slug = route.public_alias.slice(plan.contract.base_path.length).replace(/\/$/, "");
    assert.match(hub, new RegExp(`href=["']\\./${slug}/["']`), `${route.id} exact sibling route`);
    assert.doesNotMatch(hub, new RegExp(`href=["']${route.source_file.replaceAll(".", "\\.")}["']`));
  }
  assert.match(hub, /href=["']\.\/manifest\.json["']/);
  assert.equal(plan.receipt.routes.find(({ id }) => id === "core-architectures-pack").projection_kind, "navigation_adapted");
  assert.equal(
    plan.receipt.routes.find(({ id }) => id === "core-architectures-pack").navigation.packaged_links,
    22,
  );
});

test("the route receipt exposes unresolved local navigation without rewriting it", async () => {
  const plan = await createPackagePlan();
  const byId = new Map(plan.receipt.routes.map((route) => [route.id, route]));

  assert.deepEqual(byId.get("poda").navigation.unresolved_local_links, [
    {
      href: "../context-canvas-project-surface/context-canvas/poda.html",
      projected_target: "context-canvas-project-surface/context-canvas/poda.html",
    },
  ]);
  assert.deepEqual(byId.get("strategy-canvas").navigation.unresolved_local_links, []);
  const strategySchema = await readFile(path.join(
    defaultPaths.sourceRoot,
    "strategy-canvas-system-v0.2/strategy-canvas.schema.json",
  ));
  assert.deepEqual(byId.get("strategy-canvas").static_resource_closure.package_files, [{
    source_file: "strategy-canvas-system-v0.2/strategy-canvas.schema.json",
    target_file: "strategy-canvas-system-v0.2/strategy-canvas.schema.json",
    content_type: "application/schema+json",
    bytes: strategySchema.byteLength,
    sha256: sha256(strategySchema),
  }]);
  assert.deepEqual(byId.get("core-architecture-family-index").navigation.unresolved_local_links, [
    {
      href: "../context-canvas-project-surface/context-canvas/core-architectures-orientation-index.html",
      projected_target: "context-canvas-project-surface/context-canvas/core-architectures-orientation-index.html",
    },
  ]);
  assert.equal(byId.get("heart-chart").activation_eligible, true);
  assert.deepEqual(byId.get("heart-chart").navigation.unresolved_local_links, []);
});

test("every route receipt carries its observed minimal carrier policy", async () => {
  const plan = await createPackagePlan();
  const byId = new Map(plan.receipt.routes.map((route) => [route.id, route]));

  assert.deepEqual(byId.get("core-architectures-pack").observed_runtime_capabilities, []);
  assert.deepEqual(byId.get("core-architectures-pack").carrier_policy, {
    sandbox_tokens: [],
    permissions_policy: [],
    held_capabilities: [],
  });
  assert.deepEqual(byId.get("heart-chart").observed_runtime_capabilities, [
    "executable-scripts",
    "clipboard-write",
  ]);
  assert.deepEqual(byId.get("heart-chart").carrier_policy, {
    sandbox_tokens: ["allow-scripts"],
    permissions_policy: ["clipboard-write"],
    held_capabilities: [],
  });
  assert.deepEqual(byId.get("strategy-canvas").carrier_policy.held_capabilities, []);
  assert.deepEqual(byId.get("ai-systems-service-blueprint").carrier_policy.permissions_policy, []);
  assert.equal(
    plan.receipt.routes.filter(({ carrier_policy }) =>
      carrier_policy.held_capabilities.includes("native-modals")).length,
    0,
  );
  assert.equal(
    plan.receipt.routes.filter(({ carrier_policy }) =>
      carrier_policy.permissions_policy.includes("clipboard-write")).length,
    20,
  );
  assert.equal(
    plan.receipt.routes.some(({ carrier_policy }) =>
      carrier_policy.sandbox_tokens.some((token) =>
        ["allow-same-origin", "allow-forms", "allow-popups", "allow-top-navigation"].includes(token))),
    false,
  );
});

test("runtime observation distinguishes executable behavior from embedded data", () => {
  assert.deepEqual(
    observeIframeRuntimeCapabilities('<script type="application/ld+json">{"name":"data"}</script>'),
    [],
  );
  assert.deepEqual(
    observeIframeRuntimeCapabilities('<script type="application/schema+json">{"type":"object"}</script>'),
    [],
  );
  assert.deepEqual(
    observeIframeRuntimeCapabilities('<script type="importmap">{"imports":{}}</script>'),
    [],
  );
  assert.deepEqual(
    observeIframeRuntimeCapabilities(
      '<script>navigator.clipboard.writeText("value"); confirm("Continue?");</script>',
    ),
    ["executable-scripts", "clipboard-write", "native-modals"],
  );
  assert.deepEqual(
    observeIframeRuntimeCapabilities(
      '<button type="button" onclick="confirm(\'Continue?\')">Continue</button>',
    ),
    ["executable-scripts", "native-modals"],
  );
  assert.deepEqual(
    observeIframeRuntimeCapabilities(
      '<a href="javascript:navigator.clipboard.writeText(\'value\')">Copy</a>',
    ),
    ["executable-scripts", "clipboard-write"],
  );
  assert.deepEqual(
    observeIframeRuntimeCapabilities(
      '<button onclick="navigator.clipboard.writeText&#40;\'value\'&#41;">Copy</button>',
    ),
    ["executable-scripts", "clipboard-write"],
  );
  assert.deepEqual(
    observeIframeRuntimeCapabilities(
      '<a href="javascript&#58;fetch&#40;\'state.json\'&#41;">Load</a>',
    ),
    ["executable-scripts"],
  );
  assert.throws(
    () => observeIframeRuntimeCapabilities('<script type="application/x-custom-data">value</script>'),
    /unsupported script type/,
  );
});

test("a materialized plan has the exact allowlist and expected bytes", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-test-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const plan = await createPackagePlan();

  await writePackagePlan(plan, temporaryRoot);
  const verification = await verifyPackagePlan(plan, temporaryRoot);

  assert.deepEqual(verification, { files: 26, bytes: 1749427 });
  await writeFile(path.join(temporaryRoot, "unexpected.txt"), "outside the plan\n");
  await assert.rejects(
    verifyPackagePlan(plan, temporaryRoot),
    /Extra: unexpected\.txt/,
  );
});

test("route validation rejects alias and source-identity drift", async () => {
  const { contract, sourceManifest } = await loadManifests();
  assert.equal(validateRouteContract(contract, sourceManifest), true);

  const duplicateAlias = structuredClone(contract);
  duplicateAlias.routes[2].public_alias = duplicateAlias.routes[1].public_alias;
  assert.throws(
    () => validateRouteContract(duplicateAlias, sourceManifest),
    /must retain its pinned v1 alias/,
  );

  const uniqueAliasDrift = structuredClone(contract);
  uniqueAliasDrift.routes.find(({ id }) => id === "heart-chart").public_alias =
    "/v1/core/renamed-heart/";
  assert.throws(
    () => validateRouteContract(uniqueAliasDrift, sourceManifest),
    /heart-chart must retain its pinned v1 alias \/v1\/core\/heart-chart\//,
  );

  const encodedAlias = structuredClone(contract);
  encodedAlias.routes[1].public_alias = "/v1/core/%70oda/";
  assert.throws(
    () => validateRouteContract(encodedAlias, sourceManifest),
    /must not use percent-encoding/,
  );

  const escapingSource = structuredClone(contract);
  escapingSource.routes[1].source_file = "../poda.html";
  assert.throws(
    () => validateRouteContract(escapingSource, sourceManifest),
    /normalized, bounded relative path/,
  );

  const wrongBase = structuredClone(contract);
  wrongBase.base_path = "/cdn/core/";
  assert.throws(
    () => validateRouteContract(wrongBase, sourceManifest),
    /Route base path must be/,
  );

  const sourceDrift = structuredClone(sourceManifest);
  sourceDrift.prototypes[0].version = "9.9";
  assert.throws(
    () => validateRouteContract(contract, sourceDrift),
    /does not match source identity/,
  );

  const duplicateStanding = structuredClone(contract);
  duplicateStanding.standing_values.receiver.push("reserve");
  assert.throws(
    () => validateRouteContract(duplicateStanding, sourceManifest),
    /supported standing values/,
  );

  const missingCarrierPolicy = structuredClone(contract);
  delete missingCarrierPolicy.routes[0].carrier_policy;
  assert.throws(
    () => validateRouteContract(missingCarrierPolicy, sourceManifest),
    /must carry a carrier_policy object/,
  );

  const dangerousSandboxToken = structuredClone(contract);
  dangerousSandboxToken.routes[1].carrier_policy.sandbox_tokens.push("allow-same-origin");
  assert.throws(
    () => validateRouteContract(dangerousSandboxToken, sourceManifest),
    /only unique supported values/,
  );

  const duplicatePermission = structuredClone(contract);
  duplicatePermission.routes[1].carrier_policy.permissions_policy.push("clipboard-write");
  assert.throws(
    () => validateRouteContract(duplicatePermission, sourceManifest),
    /only unique supported values/,
  );

  const eligibleWithHeldCapability = structuredClone(contract);
  const eligibleAlignment = eligibleWithHeldCapability.routes.find(
    ({ id }) => id === "alignment-worksheet",
  );
  eligibleAlignment.activation_standing = "eligible";
  eligibleAlignment.carrier_policy.held_capabilities.push("native-modals");
  assert.throws(
    () => validateRouteContract(eligibleWithHeldCapability, sourceManifest),
    /must resolve every held capability before activation/,
  );

  const supplementalSourceRootDrift = structuredClone(contract);
  supplementalSourceRootDrift.routes.find(({ id }) => id === "conditioning-field")
    .source_root = "core-architectures-chimeric-prototype-current-pack-v0.1";
  assert.throws(
    () => validateRouteContract(supplementalSourceRootDrift, sourceManifest),
    /Conditioning Field source root must be/,
  );

  const supplementalProjectionDrift = structuredClone(contract);
  supplementalProjectionDrift.routes.find(({ id }) => id === "conditioning-field")
    .projection = "source_identical";
  assert.throws(
    () => validateRouteContract(supplementalProjectionDrift, sourceManifest),
    /Conditioning Field projection kind must be/,
  );

  const supplementalPackageFile = structuredClone(contract);
  supplementalPackageFile.routes.find(({ id }) => id === "conditioning-field")
    .package_files = [{
      source_file: "canvas-shell.css",
      target_file: "canvas-shell.css",
      content_type: "text/css",
    }];
  assert.throws(
    () => validateRouteContract(supplementalPackageFile, sourceManifest),
    /must remain a single-file closure/,
  );

  const reservedTarget = structuredClone(contract);
  reservedTarget.routes[0].package_files = [{
    source_file: "README.md",
    target_file: "manifest.json",
    content_type: "text/markdown",
  }];
  assert.throws(
    () => validateRouteContract(reservedTarget, sourceManifest),
    /target is reserved by the route package/,
  );

  const excludedInput = structuredClone(contract);
  excludedInput.routes[1].package_files = [{
    source_file: contract.runtime_exclusions[0],
    target_file: "runtime.html",
    content_type: "text/html",
  }];
  assert.throws(
    () => validateRouteContract(excludedInput, sourceManifest),
    /package source is a runtime exclusion/,
  );

  const portableCollision = structuredClone(contract);
  portableCollision.routes[1].package_files = [
    {
      source_file: "README.md",
      target_file: "media/Plot.svg",
      content_type: "image/svg+xml",
    },
    {
      source_file: "poda-chimeric-prototype-v0.1.2.html",
      target_file: "media/plot.svg",
      content_type: "image/svg+xml",
    },
  ];
  assert.throws(
    () => validateRouteContract(portableCollision, sourceManifest),
    /case- or Unicode-colliding package target/,
  );

  const reservedCaseCollision = structuredClone(contract);
  reservedCaseCollision.routes[0].package_files = [{
    source_file: "README.md",
    target_file: "Manifest.json",
    content_type: "application/json",
  }];
  assert.throws(
    () => validateRouteContract(reservedCaseCollision, sourceManifest),
    /case- or Unicode-colliding package output Manifest\.json/,
  );

  const crossRouteCollision = structuredClone(contract);
  crossRouteCollision.routes[0].package_files = [{
    source_file: "README.md",
    target_file: "PODA/index.html",
    content_type: "text/html",
  }];
  assert.throws(
    () => validateRouteContract(crossRouteCollision, sourceManifest),
    /case- or Unicode-colliding package output poda\/index\.html/i,
  );

  const windowsReservedTarget = structuredClone(contract);
  windowsReservedTarget.routes[1].package_files = [{
    source_file: "README.md",
    target_file: "media/CON.svg",
    content_type: "image/svg+xml",
  }];
  assert.throws(
    () => validateRouteContract(windowsReservedTarget, sourceManifest),
    /non-portable path segment/,
  );

  const escapingCompatibilityAlias = structuredClone(contract);
  escapingCompatibilityAlias.compatibility_aliases[0].proposed_alias = "../../escape/";
  assert.throws(
    () => validateRouteContract(escapingCompatibilityAlias, sourceManifest),
    /Compatibility alias route must be/,
  );
});

test("package planning rejects source bytes that drift from the authored receipt", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-byte-drift-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const fixtureRoot = path.join(temporaryRoot, "core");
  await cp(defaultPaths.sourceRoot, fixtureRoot, { recursive: true });
  const fixtureSource = path.join(fixtureRoot, "poda-chimeric-prototype-v0.1.2.html");
  const source = await readFile(fixtureSource);
  await writeFile(fixtureSource, Buffer.concat([source, Buffer.from("\n<!-- drift -->\n")]));

  await assert.rejects(
    createPackagePlan({
      sourceRoot: fixtureRoot,
      routeManifestPath: path.join(fixtureRoot, "public-iframe-route-manifest-v1.json"),
      sourceManifestPath: path.join(
        fixtureRoot,
        "core-architectures-chimeric-prototype-manifest-v0.1.json",
      ),
    }),
    /the Core source manifest records/,
  );
});

test("package planning rejects carrier policy that understates observed behavior", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-policy-drift-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const fixtureRoot = path.join(temporaryRoot, "core");
  await cp(defaultPaths.sourceRoot, fixtureRoot, { recursive: true });
  const routeManifestPath = path.join(fixtureRoot, "public-iframe-route-manifest-v1.json");
  const routeManifest = JSON.parse(await readFile(routeManifestPath, "utf8"));
  routeManifest.routes.find(({ id }) => id === "heart-chart")
    .carrier_policy.permissions_policy = [];
  await writeFile(routeManifestPath, `${JSON.stringify(routeManifest, null, 2)}\n`);

  await assert.rejects(
    createPackagePlan({
      sourceRoot: fixtureRoot,
      routeManifestPath,
      sourceManifestPath: path.join(
        fixtureRoot,
        "core-architectures-chimeric-prototype-manifest-v0.1.json",
      ),
    }),
    /Permissions Policy for observed runtime must be \["clipboard-write"\]/,
  );
});

test("route navigation cannot escape the versioned base", () => {
  assert.throws(
    () => navigationObservation(
      `<a href="../../outside.html">Outside</a>`,
      "poda",
      new Set(["index.html"]),
      "/v1/core/",
    ),
    /Route navigation escapes \/v1\/core\//,
  );
});

test("closure scanning accepts declared package media and rejects ambient dependencies", () => {
  assert.deepEqual(
    scanHtmlClosure(
      `<!doctype html><style>.mark{mask:url(#mark)}</style><img src="data:image/svg+xml,%3Csvg/%3E"><img src="media/plot.svg"><svg><use href="#mark"></use></svg>`,
      new Set(["media/plot.svg"]),
      "fixture",
    ),
    { inline_references: 3, package_targets: ["media/plot.svg"] },
  );

  assert.throws(
    () => scanHtmlClosure(`<img src="media/plot.svg">`, new Set(), "fixture"),
    /undeclared package resource/,
  );
  assert.throws(
    () => scanHtmlClosure(`<script src="https://cdn.example/script.js"></script>`, new Set(), "fixture"),
    /outside its package closure/,
  );
  assert.throws(
    () => scanHtmlClosure(`<script>fetch("state.json")</script>`, new Set(), "fixture"),
    /runtime network primitive/,
  );
  assert.throws(
    () => scanHtmlClosure(
      `<button type="button" onclick="fetch('https://outside.example/state')">Load</button>`,
      new Set(),
      "fixture",
    ),
    /runtime network primitive/,
  );
  assert.throws(
    () => scanHtmlClosure(
      `<a href="javascript:fetch('https://outside.example/state')">Load</a>`,
      new Set(),
      "fixture",
    ),
    /runtime network primitive/,
  );
  assert.throws(
    () => scanHtmlClosure(
      `<button onclick="fetch&#40;'https://outside.example/state'&#41;">Load</button>`,
      new Set(),
      "fixture",
    ),
    /runtime network primitive/,
  );
  assert.throws(
    () => scanHtmlClosure(
      `<a href="javascript&#58;fetch&#40;'https://outside.example/state'&#41;">Load</a>`,
      new Set(),
      "fixture",
    ),
    /runtime network primitive/,
  );
  assert.throws(
    () => scanHtmlClosure(`<base href="/v1/core/"><p>Changed resolution</p>`, new Set(), "fixture"),
    /must not use a base element/,
  );
  assert.throws(
    () => scanHtmlClosure(`<p>No media</p>`, new Set(["media/unused.svg"]), "fixture"),
    /declares package resources that its document does not use/,
  );
  assert.deepEqual(
    scanHtmlClosure(`<img data-src="https://outside.example/lazy.png">`, new Set(), "fixture"),
    { inline_references: 0, package_targets: [] },
  );
  assert.throws(
    () => scanHtmlClosure(
      `<img srcset="data:image/svg+xml,%3Csvg/%3E 1x, https://outside.example/plot.png 2x">`,
      new Set(),
      "fixture",
    ),
    /outside its package closure/,
  );
  assert.throws(
    () => scanHtmlClosure(
      `<video><track src="https://outside.example/captions.vtt"></video>`,
      new Set(),
      "fixture",
    ),
    /outside its package closure/,
  );
  assert.throws(
    () => scanHtmlClosure(`<script>new Worker("worker.js")</script>`, new Set(), "fixture"),
    /runtime network primitive/,
  );
  assert.throws(
    () => scanHtmlClosure(
      `<script>const socket = new window.WebSocket("wss://outside.example");</script>`,
      new Set(),
      "fixture",
    ),
    /runtime network primitive/,
  );
  assert.throws(
    () => scanHtmlClosure(
      `<script>const image = new Image(); image.src = "https://outside.example/plot.png";</script>`,
      new Set(),
      "fixture",
    ),
    /runtime network primitive/,
  );
  assert.throws(
    () => scanHtmlClosure(
      `<script>const frame = document.createElement("iframe");</script>`,
      new Set(),
      "fixture",
    ),
    /runtime network primitive/,
  );
  assert.deepEqual(
    scanHtmlClosure(`<svg><use xlink:href="#mark"></use></svg>`, new Set(), "fixture"),
    { inline_references: 1, package_targets: [] },
  );
});

test("package-media closure follows declared CSS and SVG dependencies", () => {
  const readings = new Map([
    ["media/style.css", {
      bytes: Buffer.from(`.plot { background-image: url("./plot.svg"); }`),
      contentType: "text/css",
    }],
    ["media/plot.svg", {
      bytes: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg"><image href="../textures/grid.png" /></svg>`,
      ),
      contentType: "image/svg+xml",
    }],
    ["textures/grid.png", {
      bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      contentType: "image/png",
    }],
  ]);

  assert.deepEqual(
    scanPackageClosure(
      `<link rel="stylesheet" href="media/style.css"><main>Plot</main>`,
      readings,
      "fixture",
    ),
    {
      inline_references: 0,
      package_targets: ["media/plot.svg", "media/style.css", "textures/grid.png"],
    },
  );
});

test("declared package media travels through planning, output, and receipt", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-media-plan-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const fixtureRoot = path.join(temporaryRoot, "core");
  const outputRoot = path.join(temporaryRoot, "output");
  await cp(defaultPaths.sourceRoot, fixtureRoot, { recursive: true });

  const mediaRelativePath = "media/poda-mark.svg";
  const mediaBytes = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><circle cx="1" cy="1" r="1" /></svg>\n`,
  );
  await mkdir(path.join(fixtureRoot, "media"));
  await writeFile(path.join(fixtureRoot, mediaRelativePath), mediaBytes);

  const sourcePath = path.join(fixtureRoot, "poda-chimeric-prototype-v0.1.2.html");
  const revisedSource = (await readFile(sourcePath, "utf8")).replace(
    "</body>",
    `<img src="${mediaRelativePath}" alt="">\n</body>`,
  );
  await writeFile(sourcePath, revisedSource);

  const sourceManifestPath = path.join(
    fixtureRoot,
    "core-architectures-chimeric-prototype-manifest-v0.1.json",
  );
  const sourceManifest = JSON.parse(await readFile(sourceManifestPath, "utf8"));
  sourceManifest.prototypes.find(({ id }) => id === "poda").size_bytes =
    Buffer.byteLength(revisedSource);
  await writeFile(sourceManifestPath, `${JSON.stringify(sourceManifest, null, 2)}\n`);

  const routeManifestPath = path.join(fixtureRoot, "public-iframe-route-manifest-v1.json");
  const routeManifest = JSON.parse(await readFile(routeManifestPath, "utf8"));
  routeManifest.routes.find(({ id }) => id === "poda").package_files = [{
    source_file: mediaRelativePath,
    target_file: mediaRelativePath,
    content_type: "image/svg+xml",
  }];
  await writeFile(routeManifestPath, `${JSON.stringify(routeManifest, null, 2)}\n`);

  const plan = await createPackagePlan({
    sourceRoot: fixtureRoot,
    routeManifestPath,
    sourceManifestPath,
  });
  assert.equal(plan.outputFiles.size, 27);
  assert.ok(plan.outputFiles.get(`poda/${mediaRelativePath}`).equals(mediaBytes));
  const podaReceipt = plan.receipt.routes.find(({ id }) => id === "poda");
  assert.deepEqual(podaReceipt.static_resource_closure.package_files, [{
    source_file: mediaRelativePath,
    target_file: mediaRelativePath,
    content_type: "image/svg+xml",
    bytes: mediaBytes.byteLength,
    sha256: sha256(mediaBytes),
  }]);

  await writePackagePlan(plan, outputRoot);
  assert.equal((await verifyPackagePlan(plan, outputRoot)).files, 27);
  assert.ok((await readFile(path.join(outputRoot, `poda/${mediaRelativePath}`))).equals(mediaBytes));
});

test("regular-file boundaries reject symbolic-link sources", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-symlink-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const regularPath = path.join(temporaryRoot, "regular.html");
  const linkPath = path.join(temporaryRoot, "linked.html");
  await writeFile(regularPath, "<!doctype html>\n");
  await symlink(regularPath, linkPath);

  await assertRegularFile(regularPath, "Fixture source");
  await assert.rejects(
    assertRegularFile(linkPath, "Fixture source"),
    /must resolve to a regular file/,
  );
});

test("source boundaries reject an intermediate symbolic link", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-parent-symlink-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-outside-"));
  t.after(() => rm(outsideRoot, { recursive: true, force: true }));
  await writeFile(path.join(outsideRoot, "asset.svg"), "<svg/>\n");
  await symlink(outsideRoot, path.join(temporaryRoot, "media"));

  await assert.rejects(
    assertRegularFileWithin(
      temporaryRoot,
      path.join(temporaryRoot, "media/asset.svg"),
      "Fixture package source",
    ),
    /must not traverse a symbolic link/,
  );
});

test("output ownership requires this builder's route receipt", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-owner-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const receiptPath = path.join(temporaryRoot, "route-manifest.json");
  await writeFile(receiptPath, `${JSON.stringify({
    id: "another.builder",
    host: "iframes.vik.guru",
    base_path: "/v1/core/",
  })}\n`);

  await assert.rejects(
    assertOwnedPackageDirectory(temporaryRoot),
    /not owned by this builder/,
  );
  await rm(receiptPath);
  await writeFile(receiptPath, `${JSON.stringify({
    id: "core-architectures.iframe-route-package-receipt.v1",
    host: "iframes.vik.guru",
    base_path: "/v1/core/",
  })}\n`);
  const receipt = await assertOwnedPackageDirectory(temporaryRoot);
  assert.equal(receipt.id, "core-architectures.iframe-route-package-receipt.v1");
});
