import './node-runtime-admission.mjs';
import { Buffer } from "node:buffer";

export const schemaCompanionProjections = Object.freeze([
  Object.freeze({
    receiverPath: "collaboration-skills/0.1.0/README.md",
    pagesProjection: "schema-pages-collaboration-readme-v1",
    workerProjection: "schema-worker-collaboration-readme-v1",
  }),
]);

const projectors = new Map([
  ["schema-pages-collaboration-readme-v1", (bytes) => {
    let source = bytes.toString("utf8");
    const replacements = [
      [
        "## Start here",
        "## Start here\n\n[Browse the repository-local public skills catalog](../../skills/).",
      ],
      [
        "(../../../.agents/skills/source-authority-mapping/SKILL.md)",
        "(../../skills/source-authority-mapping/)",
      ],
      [
        "(../../../threadkeeping/collaboration-accounts/2026-08-24-source-authority-mapping.md)",
        "(../../skills/source/threadkeeping/collaboration-accounts/2026-08-24-source-authority-mapping.md)",
      ],
    ];
    for (const [authored, projected] of replacements) {
      const occurrences = source.split(authored).length - 1;
      if (occurrences !== 1) {
        throw new Error(
          `Projection schema-pages-collaboration-readme-v1 requires one authored marker: ${authored}`,
        );
      }
      source = source.replace(authored, projected);
    }
    return Buffer.from(source, "utf8");
  }],
  ["schema-worker-collaboration-readme-v1", (bytes) => {
    let source = bytes.toString("utf8");
    const replacements = [
      [
        "(../../skills/)",
        "(https://schemas.radiantnull.com/skills/)",
      ],
      [
        "(../../skills/source-authority-mapping/)",
        "(https://schemas.radiantnull.com/skills/source-authority-mapping/)",
      ],
      [
        "(../../skills/source/threadkeeping/collaboration-accounts/2026-08-24-source-authority-mapping.md)",
        "(https://schemas.radiantnull.com/skills/source/threadkeeping/collaboration-accounts/2026-08-24-source-authority-mapping.md)",
      ],
    ];
    for (const [pagesRoute, workerRoute] of replacements) {
      const occurrences = source.split(pagesRoute).length - 1;
      if (occurrences !== 1) {
        throw new Error(
          `Projection schema-worker-collaboration-readme-v1 requires one accepted Pages route: ${pagesRoute}`,
        );
      }
      source = source.replace(pagesRoute, workerRoute);
    }
    return Buffer.from(source, "utf8");
  }],
]);

export function projectSchemaCompanionBytes(projection, bytes) {
  const project = projectors.get(projection);
  if (typeof project !== "function") {
    throw new Error(`Select a recognized schema companion projection: ${projection}`);
  }
  return project(Buffer.from(bytes));
}

const projectionsByReceiverPath = new Map(
  schemaCompanionProjections.map((entry) => [entry.receiverPath, entry]),
);
if (projectionsByReceiverPath.size !== schemaCompanionProjections.length) {
  throw new Error("Schema companion projection receiver paths must be unique");
}

export function assertSchemaCompanionProjectionRoutes(routes) {
  const selectedPaths = new Set(routes.map(({ receiverPath }) => receiverPath));
  for (const { receiverPath } of schemaCompanionProjections) {
    if (!selectedPaths.has(receiverPath)) {
      throw new Error(`Select the projected schema companion route: ${receiverPath}`);
    }
  }
}

// Host adapters share one explicit projector registry. Direct-copy routes keep
// their source Buffer; named routes map reviewed source to one public shape.
export function projectSchemaCompanionRoute(route, bytes, target = "pages") {
  const projections = projectionsByReceiverPath.get(route.receiverPath);
  if (projections === undefined) return bytes;
  const projection = target === "pages"
    ? projections.pagesProjection
    : target === "worker"
      ? projections.workerProjection
      : undefined;
  if (projection === undefined) {
    throw new Error(`Select a recognized schema companion projection target: ${target}`);
  }
  return projectSchemaCompanionBytes(projection, bytes);
}
