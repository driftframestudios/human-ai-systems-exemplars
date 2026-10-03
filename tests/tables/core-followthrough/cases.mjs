export const coreRoot = "core-architectures-chimeric-prototype-current-pack-v0.1/";
export const canvasRoot = "context-canvas-project-surface/context-canvas/";
export const projectionRoot = `${canvasRoot}prototypes/core-architectures/chimeric-pack-v0.1/`;

export const coreFamilies = [
  ["alignment", "alignment-worksheet", "0.1.4", 1, 0, "alignmentWorksheet", '#optionInspector input[type="text"]'],
  ["context", "context-tree", "0.1.7", 4, 4, "contextTree", '[data-kind="group-label"]'],
  ["frv", "first-responsible-version-matrix", "0.1.4", 2, 0, "firstResponsibleVersionMatrix", '[data-field="title"]'],
  ["impact", "impact-map", "0.1.5", 2, 2, "impactMap", '[data-kind="actor"]'],
  ["jobs", "jobs-to-be-done-treemap", "0.1.4", 2, 0, "jobsToBeDoneTreemap", '[data-field="label"]'],
  ["recovery", "recovery-routing-atlas", "0.1.5", 1, 1, "recoveryRoutingAtlas", "#nameField"],
].map(([id, stem, version, tables, staticTables, api, edit]) => {
  const file = `${stem}-chimeric-prototype-v${version}.html`;
  return { id, stem, version, tables, staticTables, api, edit, file,
    source: coreRoot + file, projection: projectionRoot + file, kind: "core" };
});

export const supplementalFamilies = [
  { id: "hiring", source: "collaboration/hiring-surfaces-talent-agent-intake/index.html", tables: 1,
    parent: `${canvasRoot}hiring-surfaces-talent-agent-intake.html`,
    alias: "https://iframes.vik.guru/v1/canvas/talent-agent-intake/", kind: "repair" },
  { id: "distributed", source: `${canvasRoot}distributed-inspection-harness.html`, tables: 11, kind: "repair" },
  { id: "narrative", source: `${canvasRoot}narrative-execution-gap-research-atlas.html`, tables: 4, kind: "repair" },
  { id: "grammar", source: `${canvasRoot}grammar-family.html`, tables: 5, kind: "control" },
  { id: "registry", source: `${canvasRoot}registry-goal-fidelity-routing.html`, tables: 5, kind: "control" },
  { id: "a3", source: "a3-stacked-cube-atlas-expanded-bundle-v0.2/index.html", tables: 3, kind: "control" },
];

export function planCases({ family = "all", combined = false, caseId = null } = {}) {
  const available = [...coreFamilies, ...(combined ? supplementalFamilies : [])];
  const selected = available.filter(item => family === "all" || item.id === family);
  if (!selected.length) throw new Error("Unknown or unavailable family");
  const cases = [];
  const add = (item, width, mode = "screen", variant = "source") => cases.push({
    id: `${item.id}-${variant}-${width}-${mode}`, family: item, width, mode, variant,
  });
  for (const item of selected) {
    for (const width of item.kind === "control" ? [304, 390, 1280] : [304, 320, 390, 1280]) add(item, width);
    if (["alignment", "frv"].includes(item.id)) for (const width of [519, 520, 521]) add(item, width);
    if (item.kind === "core") {
      add(item, 390, "screen", "projection");
      for (const mode of ["static", "forced", "text200", "print"]) add(item, mode === "print" ? 1280 : 390, mode);
    }
    if (item.id === "hiring") {
      add(item, 390, "static");
      for (const width of [304, 390, 1280]) {
        add(item, width, "screen", "package");
        add(item, width, "screen", "parent");
      }
    }
  }
  if (caseId && !cases.some(item => item.id === caseId)) throw new Error("Unknown case");
  return cases.filter(item => !caseId || item.id === caseId);
}
