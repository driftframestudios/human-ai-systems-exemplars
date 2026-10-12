import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createCanvasPackagePlan } from "../../tools/package-canvas-iframe-routes.mjs";
import {
  createPackagePlan as createCorePackagePlan,
  defaultPaths as coreDefaultPaths,
} from "../../tools/package-iframe-routes.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

function values(source, pattern) {
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

function inlineSvgSemanticSignatures(html) {
  return [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/giu)].map(([svg]) => ({
    ariaLabels: values(svg, /\baria-label=["']([^"']+)["']/giu),
    dataIdentifiers: values(svg, /\bdata-[a-z0-9_-]+=["']([^"']+)["']/giu),
    descriptions: values(svg, /<desc\b[^>]*>([\s\S]*?)<\/desc>/giu),
    groupIdentifiers: values(svg, /<g\b[^>]*\bid=["']([^"']+)["']/giu),
    identifiers: values(svg, /\bid=["']([^"']+)["']/giu),
    roles: values(svg, /\brole=["']([^"']+)["']/giu),
    titles: values(svg, /<title\b[^>]*>([\s\S]*?)<\/title>/giu),
    viewBoxes: values(svg, /\bviewBox=["']([^"']+)["']/giu),
  }));
}

function coreSourcePath(route) {
  const sourceRoot = route.source_root
    ? path.join(repositoryRoot, route.source_root)
    : coreDefaultPaths.sourceRoot;
  return path.join(sourceRoot, route.source_file);
}

test("Core and Canvas projections preserve authored inline SVG semantics", async () => {
  const [core, canvas] = await Promise.all([
    createCorePackagePlan(),
    createCanvasPackagePlan(),
  ]);
  const families = [
    {
      id: "Core",
      plan: core,
      sourcePath: (route) => coreSourcePath(route),
      projectionPath: (route) => route.public_alias === core.contract.base_path
        ? "index.html"
        : `${route.public_alias.slice(core.contract.base_path.length).replace(/\/$/u, "")}/index.html`,
    },
    {
      id: "Canvas",
      plan: canvas,
      sourcePath: (route) => path.join(repositoryRoot, route.source_file),
      projectionPath: (route) => `${route.id}/index.html`,
    },
  ];

  for (const family of families) {
    for (const route of family.plan.contract.routes) {
      const source = await readFile(family.sourcePath(route), "utf8");
      const projection = family.plan.outputFiles
        .get(family.projectionPath(route))
        .toString("utf8");
      assert.deepEqual(
        inlineSvgSemanticSignatures(projection),
        inlineSvgSemanticSignatures(source),
        `${family.id} ${route.id} retains inline SVG titles, descriptions, groups, identifiers, roles, labels, and viewBoxes`,
      );
    }
  }
});

test("packaged SVG files retain exact authored semantic bytes and usable roots", async () => {
  const canvas = await createCanvasPackagePlan();
  let svgFiles = 0;
  for (const route of canvas.contract.routes) {
    for (const field of ["package_files", "navigation_files"]) {
      for (const entry of route[field] ?? []) {
        if (entry.content_type !== "image/svg+xml") continue;
        svgFiles += 1;
        const source = await readFile(path.join(repositoryRoot, entry.source_file));
        const projected = canvas.outputFiles.get(`${route.id}/${entry.target_file}`);
        assert.ok(projected.equals(source), `${route.id} ${entry.target_file} retains exact SVG bytes`);
        const root = source.toString("utf8").match(/<svg\b[^>]*>/iu)?.[0] ?? "";
        assert.match(root, /\bviewBox=["'][^"']+["']/iu, `${route.id} ${entry.target_file} has a viewBox`);
      }
    }
  }
  assert.ok(svgFiles > 0, "the Canvas package exercises package-local SVG retention");
});
