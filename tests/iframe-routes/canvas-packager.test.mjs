import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  artifactAttribution,
  artifactAuthor,
  artifactLicense,
} from "../../tools/attribution-contract.mjs";
import {
  sha256,
  verifyPackagePlan,
  writePackagePlan,
} from "../../tools/iframe-route-package-engine.mjs";
import {
  createCanvasPackagePlan,
  validateCanvasRouteContract,
} from "../../tools/package-canvas-iframe-routes.mjs";
import { createPackagePlan as createCorePackagePlan } from "../../tools/package-iframe-routes.mjs";
import {
  checkAggregatePackage,
  createAggregatePackagePlan,
} from "../../tools/package-v1-iframe-routes.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

test("the shared package writer rejects paths outside its output root", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "iframe-route-path-check-"));
  const plan = {
    outputFiles: new Map([["../escaped.txt", Buffer.from("outside", "utf8")]]),
  };
  try {
    await assert.rejects(
      writePackagePlan(plan, outputRoot),
      /must stay relative and normalized/,
    );
    await assert.rejects(
      verifyPackagePlan(plan, outputRoot),
      /must stay relative and normalized/,
    );
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});

test("the Canvas family plan follows the authored 15-route manifest", async () => {
  const first = await createCanvasPackagePlan();
  const second = await createCanvasPackagePlan();

  assert.equal(first.contract.base_path, "/v1/canvas/");
  assert.equal(first.contract.routes.length, 15);
  assert.equal(first.outputFiles.size, 40);
  assert.equal(
    first.receipt.route_contract.file,
    "iframe-route-families/canvas/public-iframe-route-manifest-v1.json",
  );
  assert.deepEqual(first.receipt.package_contract, {
    primary_routes: 15,
    decorated_routes: 14,
    byte_identical_routes: 1,
    generated_files: 40,
    live_cloudflare_mutation: false,
    closure_observation: "static_resource_graph",
    browser_request_observation_required: true,
    neighboring_path_posture: "unmatched",
  });
  assert.deepEqual([...first.outputFiles.keys()], [...second.outputFiles.keys()]);
  for (const [file, bytes] of first.outputFiles) {
    assert.ok(bytes.equals(second.outputFiles.get(file)), `${file} is deterministic`);
  }

  for (const route of first.contract.routes) {
    const projection = first.outputFiles.get(`${route.id}/index.html`);
    assert.ok(projection, `${route.id} has an index projection`);
    const html = projection.toString("utf8");
    const receipt = first.receipt.routes.find(({ id }) => id === route.id);
    assert.deepEqual(receipt.navigation.unresolved_local_links, []);
    if (route.projection_kind === "byte_identical") {
      const source = await readFile(path.join(repositoryRoot, route.source_file));
      assert.ok(projection.equals(source), `${route.id} remains byte-identical`);
      continue;
    }
    assert.equal(occurrenceCount(html, artifactAuthor), 2, `${route.id} author metadata and notice`);
    assert.equal(occurrenceCount(html, artifactLicense), 1, `${route.id} license relation`);
    assert.equal(occurrenceCount(html, artifactAttribution), 1, `${route.id} attribution notice`);
    assert.equal(occurrenceCount(html, "data-visitor-boundary aria-label="), 1);
    assert.equal(occurrenceCount(html, "<style data-iframe-route-projection>"), 1);
  }

  const ai = first.receipt.routes.find(({ id }) => id === "ai-method-gallery");
  assert.equal(ai.static_resource_closure.package_files.length, 20);
  assert.equal(ai.static_resource_closure.navigation_files.length, 2);
  assert.equal(ai.navigation.packaged_links, 2);
  const heatmap = first.receipt.routes.find(({ id }) => id === "heatmap-comparison");
  assert.equal(heatmap.static_resource_closure.package_files.length, 2);
});

test("Canvas route identities remain one canonical URL segment", async () => {
  const { contract } = await createCanvasPackagePlan();
  for (const invalidId of ["nested/route", "encoded%2Froute", "spaced route", "Uppercase-route"]) {
    const candidate = structuredClone(contract);
    candidate.routes[0].id = invalidId;
    candidate.routes[0].public_alias = `/v1/canvas/${invalidId}/`;
    assert.throws(
      () => validateCanvasRouteContract(candidate),
      /one lowercase kebab-case URL segment/,
      invalidId,
    );
  }
});

test("Canvas package media and primary-site rewrites keep canonical receivers", async () => {
  const { contract } = await createCanvasPackagePlan();
  const mediaDrift = structuredClone(contract);
  mediaDrift.routes
    .find(({ id }) => id === "ai-method-gallery")
    .package_files[0].content_type = "image/png";
  assert.throws(
    () => validateCanvasRouteContract(mediaDrift),
    /must use image\/svg\+xml/,
  );

  const credentialedReference = new URL("https://vik.guru/initiative-costing.html");
  credentialedReference.username = "fixture-user";
  for (const publicReference of [
    "https://vik.guru:444/initiative-costing.html",
    credentialedReference.href,
  ]) {
    const navigationDrift = structuredClone(contract);
    navigationDrift.routes
      .find(({ id }) => id === "cross-functional-investment-studio")
      .navigation_rewrites[0].public_reference = publicReference;
    assert.throws(
      () => validateCanvasRouteContract(navigationDrift),
      /must use https:\/\/vik\.guru\//,
    );
  }
});

test("the aggregate v1 plan preserves exact family bytes and adds one root receipt", async () => {
  const [core, canvas, aggregate] = await Promise.all([
    createCorePackagePlan(),
    createCanvasPackagePlan(),
    createAggregatePackagePlan(),
  ]);

  assert.equal(aggregate.outputFiles.size, core.outputFiles.size + canvas.outputFiles.size + 1);
  for (const [file, bytes] of core.outputFiles) {
    assert.ok(bytes.equals(aggregate.outputFiles.get(`core/${file}`)), `Core ${file}`);
  }
  for (const [file, bytes] of canvas.outputFiles) {
    assert.ok(bytes.equals(aggregate.outputFiles.get(`canvas/${file}`)), `Canvas ${file}`);
  }
  assert.deepEqual(aggregate.receipt.package_contract.family_directories, ["core", "canvas"]);
  assert.equal(aggregate.receipt.package_contract.primary_routes, 38);
  assert.equal(aggregate.receipt.package_contract.generated_files, 67);
  assert.equal(
    aggregate.receipt.package_contract.generated_bytes,
    [...aggregate.outputFiles.values()].reduce((total, bytes) => total + bytes.byteLength, 0),
  );
  assert.deepEqual(
    aggregate.receipt.families.map(({ routes, files, bytes }) => ({ routes, files, bytes })),
    [
      {
        routes: 23,
        files: core.outputFiles.size,
        bytes: [...core.outputFiles.values()].reduce((total, bytes) => total + bytes.byteLength, 0),
      },
      {
        routes: 15,
        files: canvas.outputFiles.size,
        bytes: [...canvas.outputFiles.values()].reduce((total, bytes) => total + bytes.byteLength, 0),
      },
    ],
  );
  assert.deepEqual(
    aggregate.receipt.families.map(({ family_manifest_sha256 }) => family_manifest_sha256),
    [core.receipt.route_contract.sha256, canvas.receipt.route_contract.sha256],
  );
  assert.deepEqual(
    aggregate.receipt.families.map(({ id, route_receipt_sha256 }) => ({
      id,
      route_receipt_sha256,
    })),
    [
      {
        id: "core",
        route_receipt_sha256: sha256(core.outputFiles.get("route-manifest.json")),
      },
      {
        id: "canvas",
        route_receipt_sha256: sha256(canvas.outputFiles.get("route-manifest.json")),
      },
    ],
  );

  const verification = await checkAggregatePackage(aggregate);
  assert.equal(verification.files, 67);
  assert.ok(verification.bytes > 1_740_871);
});
