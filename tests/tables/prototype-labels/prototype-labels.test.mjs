import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import test from "node:test";

const root = process.env.PROTOTYPE_LABELS_ROOT || fileURLToPath(new URL("../../../", import.meta.url));
const coreBase = "core-architectures-chimeric-prototype-current-pack-v0.1";
const canvasBase = "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1";
const narrativeBase = "context-canvas-project-surface/context-canvas/prototypes/narrative-architectures";
// Frozen current selection; excluded families remain with their named owners.
const currentCore = [
  ["poda", "0.1.5"], ["strategy-canvas", "0.2.5"],
  ["ai-systems-service-blueprint", "0.1.5"], ["software-architecture-views", "0.1.4"],
  ["participatory-design-kit", "0.1.4"], ["specification-by-example", "0.1.7"],
  ["heart-chart", "0.1.6"], ["plus-delta", "0.1.5"],
  ["practitioner-judgment-probes", "0.1.5"], ["pattern-problem-surface-matrix", "0.1.5"],
  ["unit-test-first-design", "0.1.5"], ["upstream-revision-loop", "0.1.5"],
  ["core-architecture-family-index", "0.1.6"],
];
const fileFor = (id, version) => id + "-chimeric-prototype-v" + version + ".html";
const corePaths = Object.fromEntries(currentCore.map(([id, version]) => [id, coreBase + "/" + fileFor(id, version)]));
const canvasPaths = Object.fromEntries(currentCore.map(([id, version]) => [id, canvasBase + "/" + fileFor(id, id === "strategy-canvas" ? "0.2.3" : version)]));
const narrativePaths = {
  composer: narrativeBase + "/narrative-capsule-composer/narrative-capsules-chimeric-prototype-v0.1.html",
  technology: narrativeBase + "/technology-fit-sampling-tableau/technology-fit-sampling-tableau-chimeric-prototype-v0.2.html",
  semantic: narrativeBase + "/semantic-sampling-tableau/terminology-exploration/narrative-sampling-tableau-chimeric-prototype-v0.1.html",
  ledger: narrativeBase + "/threadkeeping-ledger/threadkeeping-ledger-chimeric-prototype-bundle-v0.1/threadkeeping-ledger-chimeric-prototype-v0.1.html",
};
const familyCompanion = narrativeBase + "/narrative-capsule-composer/companions/" + fileFor("core-architecture-family-index", "0.1.6");
const templatePath = coreBase + "/strategy-canvas-system-v0.2/canonical.template.html";
const canonicalPath = coreBase + "/strategy-canvas-system-v0.2/strategy-canvas-canonical.js";
const workbenchPath = canvasBase + "/strategy-canvas-context-workbench-v0.2.js";
const hubs = [coreBase, canvasBase].map(base => base + "/core-architectures-chimeric-prototype-pack-index-v0.1.4.html");
const entryPaths = [...Object.values(corePaths), ...Object.values(canvasPaths), ...Object.values(narrativePaths), familyCompanion, ...hubs];
const paths = [...entryPaths, templatePath, canonicalPath, workbenchPath];
const sources = new Map(paths.map(owner => [owner, fs.readFileSync(path.join(root, owner), "utf8")]));
const protectedText = 'Ren\u00e9e "A&B" <sample> \u2192 N\u00b7m';
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const noop = () => {};

function parse(sourcesToParse) {
  const result = spawnSync(process.env.PYTHON || "python3", [fileURLToPath(new URL("./parse-tables.py", import.meta.url))], {
    input: JSON.stringify(sourcesToParse), encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  return JSON.parse(result.stdout);
}
const htmlPaths = paths.filter(owner => owner.endsWith(".html"));
const native = new Map(htmlPaths.map((owner, index) => [owner, index]));
const parsedNative = parse(htmlPaths.map(owner => sources.get(owner)));

function checkTables(tables, owner) {
  let cells = 0;
  for (const table of tables) {
    const columnRows = table.rows.filter(row => row.cells.some(cell => cell.attrs.scope === "col"));
    const width = columnRows[0]?.cells.reduce((sum, cell) => sum + Number(cell.attrs.colspan || 1), 0);
    const ids = new Set(table.rows.flatMap(row => row.cells.map(cell => cell.attrs.id).filter(Boolean)));
    for (const row of table.rows) {
      const isRecord = row.cells.some(cell => cell.tag === "td");
      if (isRecord) {
        assert(row.attrs["data-label"], owner + ": record retains topic and identity");
        if (width) assert.equal(row.cells.reduce((sum, cell) => sum + Number(cell.attrs.colspan || 1), 0), width, owner + ": explicit record width");
      }
      for (const cell of row.cells) {
        cells += 1;
        assert(cell.attrs["data-label"], owner + ": every field has a supplemental label");
        if (cell.tag === "th") assert(["row", "col"].includes(cell.attrs.scope), owner + ": native header scope");
        for (const id of (cell.attrs.headers || "").split(/\s+/).filter(Boolean)) assert(ids.has(id), owner + ": native association resolves " + id);
      }
    }
  }
  return cells;
}

test("frozen selection covers 13 Core pairs, four Narrative owners, a selected companion, and two table-free hubs", () => {
  assert.equal(entryPaths.length, 33);
  assert.equal(paths.length, 36);
  for (const owner of hubs) assert.equal(parsedNative[native.get(owner)].tables.length, 0);
  for (const owner of htmlPaths) {
    const tables = parsedNative[native.get(owner)].tables;
    checkTables(tables, owner);
    for (const table of tables) assert(table.attrs["data-label"], owner + ": native table topic");
  }
});

test("every native or inline-generated cell site has an owner-authored label", () => {
  let sites = 0;
  for (const [owner, source] of sources) {
    for (const match of source.matchAll(/<(td|th)\b/g)) {
      sites += 1;
      assert(source.slice(match.index + match[0].length).startsWith(' data-label="'), owner + ": unlabeled cell source site");
    }
  }
  assert(sites > 400);
});

test("changed HTML script bodies and separate renderers parse without a browser", () => {
  for (const owner of htmlPaths) {
    for (const script of parsedNative[native.get(owner)].scripts) {
      if (script.attrs.src || /json/i.test(script.attrs.type || "")) continue;
      new vm.Script(script.text, { filename: owner });
    }
  }
  for (const owner of [canonicalPath, workbenchPath]) new vm.Script(sources.get(owner), { filename: owner });
});

test("declared Core copies preserve the same label-generating source", () => {
  const signature = source => source.split("\n").filter(line => line.includes("data-label")).join("\n");
  for (const [id] of currentCore) {
    if (id !== "strategy-canvas") assert.equal(signature(sources.get(corePaths[id])), signature(sources.get(canvasPaths[id])), id);
  }
  assert.equal(signature(sources.get(familyCompanion)), signature(sources.get(corePaths["core-architecture-family-index"])));
});

test("canonical Strategy distribution includes its exact current renderer and template table", () => {
  assert(sources.get(corePaths["strategy-canvas"]).includes(sources.get(canonicalPath).trim()));
  assert.deepEqual(parsedNative[native.get(corePaths["strategy-canvas"])].tables, parsedNative[native.get(templatePath)].tables);
});

// Extract only a named declared function. VM parsing finds its exact end, including
// nested template expressions; the surrounding page is never mounted.
function declaredFunction(source, name) {
  const pattern = new RegExp("\\bfunction\\s+" + name + "\\s*\\(");
  const start = pattern.exec(source)?.index;
  assert.notEqual(start, undefined, "Declared function " + name);
  for (let end = source.indexOf("}", start); end >= 0 && end - start < 100000; end = source.indexOf("}", end + 1)) {
    const candidate = source.slice(start, end + 1);
    try { new vm.Script("(" + candidate + ")"); return candidate; } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
  }
  throw new Error("Could not isolate " + name);
}

class Slot {
  constructor() { this.value = ""; this.children = new Map(); this.dataset = {}; this.attributes = {}; this.textContent = ""; }
  set innerHTML(value) { this.value = value; }
  get innerHTML() {
    if (!this.children.size) return this.value;
    return [...this.children].map(([tag, slot]) => "<" + tag + ">" + slot.innerHTML + "</" + tag + ">").join("");
  }
  querySelector(key) { if (!this.children.has(key)) this.children.set(key, new Slot()); return this.children.get(key); }
  replaceChildren(...children) { this.value = children.map(child => child.toString()).join(""); }
  setAttribute(name, value) { this.attributes[name] = value; }
}
class Element {
  constructor(tag, attrs = {}, children = []) { this.tag = tag; this.attrs = attrs; this.children = []; this.append(...(Array.isArray(children) ? children : [children])); }
  append(...children) { this.children.push(...children); }
  toString() {
    const attrs = Object.entries(this.attrs).filter(([name, value]) => name !== "text" && value !== undefined && value !== null && value !== false)
      .map(([name, value]) => " " + (name === "className" ? "class" : name) + '="' + escape(value) + '"').join("");
    return "<" + this.tag + attrs + ">" + escape(this.attrs.text ?? "") + this.children.map(child => child instanceof Element ? child.toString() : escape(child)).join("") + "</" + this.tag + ">";
  }
}

function render(owner, functions, calls, fixture) {
  const slots = new Map();
  const get = key => { key = key.replace(/^#/, ""); if (!slots.has(key)) slots.set(key, new Slot()); return slots.get(key); };
  const context = {
    $: get, el: get, qs: get, $$: () => [], qsa: () => [], find: get, pendingRemovalId: null,
    document: { getElementById: get, querySelectorAll: () => [] },
    root: { querySelector: get }, structuredClone,
    element: (tag, attrs, children) => new Element(tag, attrs, children),
    esc: escape, safe: escape, attr: escape, escapeHtml: escape,
    previewBlock: escape, cellPreview: escape, detailHTML: escape, clampBlock: escape,
    routeFamily: () => "Family", routeInfo: () => ({ label: "Route", family: "Family" }),
    routeMeta: () => ({ label: "Route" }), routeOptions: () => "", selectOptions: () => "",
    statusLabel: value => value, statusFor: value => ({ label: value }), statusMeta: value => ({ label: value }),
    num: value => String(value), pct: value => String(Math.round(value * 100)) + "%",
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    ...fixture,
  };
  vm.createContext(context);
  const source = sources.get(owner);
  // Use each string renderer's actual source escaper, including its quote policy.
  for (const name of ["esc", "safe", "escapeHtml"]) {
    if (new RegExp("\\bfunction\\s+" + name + "\\s*\\(").test(source)) {
      vm.runInContext(declaredFunction(source, name) + ";globalThis." + name + "=" + name, context);
    } else {
      const line = source.split("\n").find(text => new RegExp("^\\s*const " + name + "\\s*=.*=>").test(text));
      if (line) vm.runInContext(line + ";globalThis." + name + "=" + name, context);
    }
  }
  context.attr = context.safe;
  for (const name of functions) vm.runInContext(declaredFunction(source, name), context);
  for (const name of calls) vm.runInContext(name + "()", context);
  const fragments = [];
  for (const [key, slot] of slots) {
    if (key === "ledgerHead" || key === "ledgerBody") continue;
    const html = slot.innerHTML;
    if (/<t[dh]\b/.test(html)) fragments.push(/<table\b/.test(html) ? html : "<table>" + html + "</table>");
  }
  if (slots.has("ledgerBody")) fragments.push("<table><thead><tr>" + get("ledgerHead").innerHTML + "</tr></thead><tbody>" + get("ledgerBody").innerHTML + "</tbody></table>");
  assert(fragments.length, owner + ": renderer produced table fields");
  const tables = parse(fragments).flatMap(result => result.tables);
  assert(checkTables(tables, owner) > 0);
  return tables;
}

const item = {
  id: "record-1", label: protectedText, text: protectedText, status: "known", route: "", canonical_order: 1,
  objective_ids: [], discoverable_ids: [], given: protectedText, when: "Act", then: "Observe", handoff: "", notes: protectedText,
};
const view = {
  hidden_observation_ids: [], hidden_probe_ids: [], hidden_revision_ids: [], hidden_rule_ids: [],
  probe_order: [item.id], rule_order: [item.id], scenario_order: [item.id],
};
const cases = [];
function caseOf(name, owner, functions, fixture, inspect = noop, calls = functions) {
  cases.push({ name, owner, functions, fixture, inspect, calls });
}
function hasProtectedIdentity(tables) {
  assert(tables.some(table => table.rows.some(row => row.attrs["data-label"]?.includes(protectedText))));
}
caseOf("PODA spanning purpose and typed identities", corePaths.poda, ["renderTable", "renderRegistry"], {
  state: { purpose: item, objectives: [item], discoverables: [item] },
  visible: () => [item], ordered: () => [item], isVisible: () => true,
}, tables => {
  hasProtectedIdentity(tables);
  const purpose = tables[0].rows.find(row => row.attrs["data-label"] === "PODA: Purpose");
  assert.equal(purpose.cells[1].attrs["data-label"], "Purpose text");
  assert.equal(purpose.cells[1].attrs.headers, "poda-purpose-text");
});
caseOf("AI topology dynamic stage headings", corePaths["ai-systems-service-blueprint"], ["renderTable"], {
  visibleStages: () => [item, { ...item, id: "stage-2", label: "Concentration (\u00b5g/L)" }],
  visibleLayers: () => [{ ...item, kind: "runtime" }], cellFor: () => ({ ...item, veracity: "known" }),
  STATUS: ["known"], VERACITY: ["known"], ROUTES: [],
}, hasProtectedIdentity);
for (const empty of [false, true]) caseOf("Software attachments " + (empty ? "empty view" : "offset identity"), corePaths["software-architecture-views"], ["renderTable"], {
  visibleViews: () => [item], orderedAttachmentsForView: () => empty ? [] : [item],
  activeView: () => view, data: { attachments: [item] },
}, hasProtectedIdentity);
caseOf("Participatory kit three editable tables", corePaths["participatory-design-kit"], ["renderTables"], {
  data: { gantt_items: [item], support_cards: [item], example_fragments: [item], lanes: [], phases: [] },
  statuses: ["known"], cardSizes: ["small"], fragmentStatuses: ["known"], routeRegistry: [],
}, hasProtectedIdentity);
const scenario = { ...item, title: protectedText, actor: "Reviewer" };
caseOf("Specification scenarios and identity registry", corePaths["specification-by-example"], ["renderTable", "renderIdentityRegistry"], {
  state: { rules: [item], scenarios: [scenario] }, activeView: () => view, visibleScenarios: () => [scenario], findRule: () => item,
}, hasProtectedIdentity);
const heart = { ...item, category: protectedText, goal: protectedText, signal: "0", metric: "0", interpretation: "", tolerance: "10 ms", counter_signal: "", qualitative_companion: "" };
caseOf("HEART editable and readable field agreement", corePaths["heart-chart"], ["renderEditTable", "editRow", "renderReadableTable", "readCell"], {
  visibleRows: () => [heart], heartCategories: [protectedText], statusOptions: ["known"],
  routeRegistry: [], effectiveRoute: () => "", labelFor: value => value,
}, hasProtectedIdentity, ["renderEditTable", "renderReadableTable"]);
for (const owner of [corePaths["heart-chart"], canvasPaths["heart-chart"]]) test("HEART category edit sequence retains the active control: " + owner, () => {
  const model = { ...heart, id: 'heart "A&B"', category: "Happiness" };
  const fixture = {
    visibleRows: () => [model], heartCategories: ["Happiness", "Engagement", protectedText, "Task Success"],
    statusOptions: ["known"], routeRegistry: [], effectiveRoute: () => "", labelFor: value => value,
  };
  const initial = render(owner, ["renderEditTable", "editRow"], ["renderEditTable"], fixture);
  const control = { value: model.category };
  const row = {
    dataset: { rowId: model.id }, children: [control],
    attributes: { "data-label": initial[0].rows.find(item => item.attrs["data-label"]).attrs["data-label"] },
    setAttribute(name, value) { assert.equal(name, "data-label"); this.attributes[name] = value; },
    set innerHTML(value) { assert.fail("The active row must not be rebuilt"); },
    replaceChildren() { assert.fail("The active control must not be replaced"); },
  };
  const neighbor = { dataset: { rowId: "another-row" }, setAttribute() { assert.fail("Another row must remain unchanged"); } };
  const editTable = {
    querySelectorAll(selector) { assert.equal(selector, "tr[data-row-id]"); return [neighbor, row]; },
    set innerHTML(value) { assert.fail("The editable table must not be rebuilt"); },
    replaceChildren() { assert.fail("The editable table must not be replaced"); },
  };
  const document = {
    activeElement: control,
    getElementById(id) { assert.equal(id, "editTable"); return editTable; },
  };
  let readable = [];
  const refreshed = [];
  const context = vm.createContext({
    data: { rows: [model] }, document, routeRegistry: [],
    renderSvg: () => refreshed.push("svg"), renderInspector: () => refreshed.push("inspector"),
    renderReadableTable: () => {
      readable = render(owner, ["renderReadableTable", "readCell"], ["renderReadableTable"], fixture);
      refreshed.push("readable");
    },
    renderExports: () => refreshed.push("exports"),
    renderEditTable: () => assert.fail("Category edits must preserve the editable controls"),
  });
  vm.runInContext(declaredFunction(sources.get(owner), "updateRow"), context);
  for (const category of ["Engagement", protectedText, "Task Success"]) {
    control.value = category;
    refreshed.length = 0;
    context.updateRow(model.id, "category", category);
    assert.equal(model.category, category);
    assert.equal(row.attributes["data-label"], `Editable HEART chart rows: ${category} (${model.id})`);
    assert(readable.some(table => table.rows.some(item => item.attrs["data-label"]?.includes(category) && item.attrs["data-label"].includes(model.id))));
    assert.equal(document.activeElement, control);
    assert.equal(row.children[0], control);
    assert.equal(control.value, category);
    assert.deepEqual(refreshed, ["svg", "inspector", "readable", "exports"]);
  }
  context.updateRow(model.id, "goal", protectedText);
  assert.equal(model.goal, protectedText);
  assert.equal(row.attributes["data-label"], `Editable HEART chart rows: Task Success (${model.id})`);
  assert.equal(document.activeElement, control);
  refreshed.length = 0;
  context.updateRow("missing-row", "category", "Adoption");
  assert.deepEqual(refreshed, []);
});
const observation = { ...item, type: "plus", observation: protectedText, goal: "Goal", actor: "Actor", evidence: "Evidence", ai_instruction: "Instruction", review_trigger: "Trigger" };
for (const empty of [false, true]) caseOf("Plus / Delta " + (empty ? "empty state" : "offset observation identity"), corePaths["plus-delta"], ["renderTable", "renderRegistry"], {
  state: { observations: [observation] }, visibleObservations: () => empty ? [] : [observation], orderedObservations: () => [observation],
  activeView: () => view, types: { plus: "Plus" }, statuses: { known: { label: "Known" } },
}, empty ? noop : hasProtectedIdentity);
const probe = { ...item, question: protectedText, concern_family: "Judgment", probability_estimate: 0, probability_of_what: "Declared outcome", technical_veracity_status: "known", ai_instruction_yield: "Next instruction" };
caseOf("Practitioner probe percent and stable identity", corePaths["practitioner-judgment-probes"], ["renderTableEquivalent", "renderIdentityRegistry"], {
  visibleProbes: () => [probe], orderedProbes: () => [probe], activeView: () => view,
}, hasProtectedIdentity);
caseOf("Pattern matrix dynamic population fields", corePaths["pattern-problem-surface-matrix"], ["renderMatrix"], {
  visiblePopulations: () => [{ ...item, description: "Population" }],
  visiblePatterns: () => [{ ...item, category: "Pattern", pattern_status: "known", cell_statuses: {}, reads: { [item.id]: protectedText } }],
  cellId: () => "cell-1", cellStatusClass: () => "known", STATUS: { needs_to_surface: "Needs to surface" },
}, hasProtectedIdentity);
caseOf("Behavior target composite fields", corePaths["unit-test-first-design"], ["renderTableEquivalent"], {
  visibleTargets: () => [{ ...item, title: protectedText, source_artifacts: [], preconditions: [], expected_results: [], protection_status: "known" }],
}, hasProtectedIdentity);
const revision = { ...item, prior_artifact: protectedText, revision_target: "Target", evidence_source: "Evidence", evidence_observation: protectedText, previous_read: "", revised_read: "0", revision_reason: "Reason" };
caseOf("Revision loop target identity and registry", corePaths["upstream-revision-loop"], ["renderTable", "renderIdentityRegistry"], {
  visibleRevisions: () => [revision], orderedRevisions: () => [revision], activeView: () => view,
  statusClass: () => "known", STATUS_LABEL: { known: "Known" },
}, hasProtectedIdentity);
const card = { ...item, name: protectedText, family: "family", placement: "Place", move: "Move", shape: "Shape", prototype: "current" };
caseOf("Family Index situation, recovery, and registry", corePaths["core-architecture-family-index"], ["renderEntryRoutes", "renderRecoveryTable", "renderRegistryTable"], {
  state: { entry_routes: [{ situation: protectedText, start: item.id, reason: "Reason" }], recovery_routes: [{ geometry: protectedText, read: "Read", start: [item.id] }] },
  cardById: () => card, orderedCards: () => [card], familyById: () => ({ name: "Family" }), routeLabel: () => protectedText,
}, hasProtectedIdentity);
caseOf("Composer binding and module identities", narrativePaths.composer, ["renderBindings", "renderTables"], {
  getBindings: () => [{ targetSlotLabel: protectedText, targetSlotRef: "slot-1", required: true, acceptedModules: [], sourceKinds: [], bindingState: "bound", valueOrigin: "authored" }],
  getGaps: () => [], state: { modules: [{ displayName: protectedText, kind: "module-1", sourceCapsuleVersionRef: "v1", inclusionState: "included", role: "source", freshnessState: "current", valueOrigin: "authored", summary: protectedText }] },
  buildExport: () => ({}), buildJsonLd: () => ({}), renderValidation: noop,
}, hasProtectedIdentity);
const dimension = { id: "dimension-1", name: protectedText, displayName: protectedText, definition: "Definition", weight: 1, evidenceClass: "Observed", direction: "higher", sourceOfTruthBand: ["authored"] };
const candidate = {
  id: "candidate-1", name: protectedText, shortName: protectedText, displayName: protectedText, semanticCluster: "Cluster", description: protectedText,
  dimensionScores: { [dimension.id]: 0 }, layers: { framework: "Native", styling: "CSS", components: "HTML" },
  defaultLikelihood: { estimate: 0 }, sixMonthFit: { estimate: 0 }, decisionState: "held", estimate: 0, lowerBound: 0, upperBound: 0.5,
  confidence: "low", calibrationState: "uncalibrated", basis: protectedText,
};
const run = { id: "run-1", displayName: "Run", candidates: [candidate], candidateSetSemantics: "open_exclusive", otherOrTailMass: 1, missingModeClasses: ["Other"] };
caseOf("Technology dynamic dimensions, spike columns, and candidate fields", narrativePaths.technology, ["renderDimensionTable", "renderSpikes", "renderTextEquivalent"], {
  state: { dimensions: [dimension], decision: { selectedCandidateIds: [candidate.id] }, lowFidelitySpikes: [{ id: "spike-1", name: protectedText, decisionQuestion: "Question", architectureRefs: [], candidateStates: {} }] },
  selectedCandidate: () => candidate, activeRun: () => run, candidateById: () => candidate, weightedFit: () => 0,
  ensureSpikeColumns: noop, renderSpikeSummary: noop,
}, hasProtectedIdentity);
caseOf("Technology comparison preserves delta notation and percentage-point units", narrativePaths.technology, ["renderComparison"], {
  populateRunSelects: noop, state: { comparison: { baselineRunId: "run-a", comparisonRunId: "run-b" }, shiftHypotheses: [] },
  comparisonRows: () => [{ name: protectedText, correspondence: "matched", defaultDelta: 0, fitDelta: 0, baseDefault: 0, nextDefault: 0, baseFit: 0, nextFit: 0, baseDecision: "held", nextDecision: "held" }],
}, tables => {
  hasProtectedIdentity(tables);
  assert(tables[0].rows[0].cells.some(cell => cell.attrs["data-label"] === "\u0394 (percentage points)"));
  assert(tables[0].rows[0].cells.some(cell => cell.attrs["data-label"] === "Decision A to B"));
});
caseOf("Semantic matrix explicit footer associations and open-tail record", narrativePaths.semantic, ["renderDimensions", "renderTablesAndTwins"], {
  state: { dimensions: [dimension], gaps: [{ id: "gap-1", gapType: "Evidence", description: protectedText, resolutionState: "open", routeTargetId: "route-1" }],
    routeSelections: [{ routeTargetId: "route-1", routeReason: protectedText, routeState: "open", expectedReturn: "Evidence" }] },
  activeRun: () => run, weightTotal: () => 1, weightedFit: () => 0, renderFitPlot: noop, renderStatisticalFit: noop,
  validationChecks: () => [["Fixture", true]], buildExport: () => ({}), buildJsonLd: () => ({}), routeById: () => ({ displayName: protectedText }),
}, tables => {
  hasProtectedIdentity(tables);
  const footer = tables[0].rows.find(row => row.section === "tfoot");
  assert.equal(footer.cells[0].attrs.scope, "row");
  assert.equal(footer.cells[2].attrs["data-label"], "Weighted fit");
  assert.equal(footer.cells[2].text, "");
  assert.equal(footer.cells[1].attrs.headers, "sampling-dimension-definition sampling-dimension-dimension-1");
  assert(tables.some(table => table.rows.some(row => row.attrs["data-label"]?.includes("other-tail"))));
});
for (const titleVisible of [true, false]) caseOf("Ledger identity with title " + (titleVisible ? "reordered" : "hidden"), narrativePaths.ledger, ["renderLedger", "renderCell"], {
  view: { selectedEntryId: item.id, columns: [{ key: "summary", label: protectedText, visible: true, width: 120 }, { key: "title", label: "Title", visible: titleVisible, width: 120 }] },
  model: { threadkeeper: { entries: [item] } }, filteredEntries: () => [{ ...item, title: protectedText, summary: "Summary" }],
}, tables => {
  hasProtectedIdentity(tables);
  assert.equal(tables[0].rows[0].cells[0].attrs["data-label"], protectedText);
}, ["renderLedger"]);
const strategyDimension = { ...dimension, label: protectedText, anchors: { low: "Low", middle: "Middle", high: "High" }, scores: { current: 0, goodEnough: 5, desired: 10 }, consequenceWeight: 0, action: "keep", evidenceBasis: protectedText };
const strategyState = { dimensions: [strategyDimension], view: { selectedDimensionId: dimension.id }, meta: { title: protectedText, decisionObject: "Decision", horizon: "Horizon", revision: 1 } };
caseOf("Canonical DOM generators preserve literal identities", canonicalPath, ["renderScoreMatrix", "renderTextEquivalent"], {
  core: { selectors: { orderedDimensions: state => state.dimensions }, series: ["current", "goodEnough", "desired"] },
  SERIES_LABELS: { current: "Current", goodEnough: "Good enough", desired: "Desired" }, ACTION_LABELS: { keep: "Keep" },
  locked: () => false, scoreControl: () => new Element("input", { value: 0 }),
}, hasProtectedIdentity, []);
caseOf("Workbench semantic table and working print report", workbenchPath, ["renderSemanticTable", "renderPrintReport"], {
  currentState: () => strategyState, orderedDimensions: state => state.dimensions,
  activeRound: () => ({ status: "revealed" }), computeAggregates: () => ({}), currentScenario: () => null,
  aiCollab: () => ({ proposals: {} }), roundValue: value => value,
  reportSource: state => ({ state, standing: "working", source: "current" }),
  collab: () => ({ reviewedSnapshots: [], session: {}, notes: [] }),
  reportChart: () => ({ viewBox: "0 0 1 1", markup: "" }), submittedCount: () => 0, actionLabels: { keep: "Keep" },
}, hasProtectedIdentity);

// Canonical methods take state explicitly; keep that argument in the source-only
// caller rather than executing its page mount or substituting a table generator.
for (const spec of cases) {
  test(spec.name, () => {
    if (spec.owner === canonicalPath) {
      const fixture = { ...spec.fixture, fixtureState: strategyState };
      const source = sources.get(canonicalPath);
      const saved = sources.get(canonicalPath);
      sources.set(canonicalPath, source + "\nfunction renderFixture(){renderScoreMatrix(fixtureState);renderTextEquivalent(fixtureState);}\n");
      try { spec.inspect(render(spec.owner, [...spec.functions, "renderFixture"], ["renderFixture"], fixture)); }
      finally { sources.set(canonicalPath, saved); }
    } else spec.inspect(render(spec.owner, spec.functions, spec.calls, spec.fixture));
  });
}
