import '../../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import test from "node:test";

const root = process.env.PROTOTYPE_LABELS_ROOT || fileURLToPath(new URL("../../../", import.meta.url));
// Issue #333: the seven remaining table owners in the closed 15-route inventory.
const owners = {
  registry: "collaboration/registry-goal-fidelity-routing/index.html",
  lims: "collaboration/lims-eln-program-constellation/index.html",
  genomic: "collaboration/context-tree-visual-variants/genomic-viewer-presentation.html",
  gallery: "collaboration/about-ai-method-gallery/index.html",
  lesson: "collaboration/open-lesson-field/index.html",
  atlas: "visualization-fidelity-atlas-bundle-v0.1/visualization-fidelity-atlas-chimeric-prototype-v0.1.html",
  belief: "collaboration/context-tree-visual-variants/who-to-believe-presentation.html",
};
const sources = Object.fromEntries(Object.entries(owners).map(([key, owner]) => [key, fs.readFileSync(path.join(root, owner), "utf8")]));
const literal = 'Ren\u00e9e "A&B" <sample> \u2192 N\u00b7m';
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function parse(html) {
  const result = spawnSync(process.env.PYTHON || "python3", [fileURLToPath(new URL("./parse-tables.py", import.meta.url))], {
    input: JSON.stringify(html), encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  return JSON.parse(result.stdout);
}
const keys = Object.keys(owners);
const native = Object.fromEntries(parse(keys.map(key => sources[key])).map((value, index) => [keys[index], value]));
const records = table => table.rows.filter(row => row.cells.some(cell => cell.tag === "td" || cell.attrs.scope === "row"));
function check(table) {
  assert(table.attrs["data-label"], "Table topic");
  const columns = table.rows.find(row => row.cells.some(cell => cell.attrs.scope === "col"))?.cells || [];
  const headers = new Map(table.rows.flatMap(row => row.cells.filter(cell => cell.tag === "th" && cell.attrs.id).map(cell => [cell.attrs.id, cell])));
  for (const row of table.rows) {
    const record = row.cells.some(cell => cell.tag === "td" || cell.attrs.scope === "row");
    if (record) {
      assert(row.attrs["data-label"], "Record identity and context");
      assert.equal(row.cells.reduce((width, cell) => width + Number(cell.attrs.colspan || 1), 0), columns.length);
    }
    row.cells.forEach((cell, index) => {
      assert(cell.attrs["data-label"], "Field label");
      if (cell.tag === "th") assert(["col", "row"].includes(cell.attrs.scope));
      for (const id of (cell.attrs.headers || "").split(/\s+/).filter(Boolean)) assert(headers.has(id), "Native header reference: " + id);
      if (record && !cell.attrs.colspan) assert.equal(cell.attrs["data-label"], columns[index].attrs["data-label"]);
    });
  }
  return table;
}
function table(html) {
  const result = parse([html])[0];
  assert.equal(result.scripts.length, 0, "Literal data cannot inject a script");
  assert.equal(result.tables.length, 1);
  return check(result.tables[0]);
}
const nativeCounts = { registry: 1, lims: 1, genomic: 0, gallery: 2, lesson: 2, atlas: 0, belief: 1 };
for (const key of keys) test(key + ": native/scriptless disposition and all literal cell sites", () => {
  assert.equal(native[key].tables.length, nativeCounts[key]);
  native[key].tables.forEach(check);
  for (const match of sources[key].matchAll(/<(td|th)\b/g)) {
    assert(sources[key].slice(match.index + match[0].length).startsWith(' data-label="'), key + ": unlabeled cell site");
  }
});
test("all seven classic-script owners parse without mounting a page", () => {
  for (const key of keys) for (const script of native[key].scripts) {
    if (!script.attrs.src && !/json/i.test(script.attrs.type || "")) new vm.Script(script.text, { filename: owners[key] });
  }
});

const functions = new Map();
function declared(key, name) {
  const id = key + ":" + name;
  if (functions.has(id)) return functions.get(id);
  const source = sources[key];
  const start = new RegExp("\\bfunction\\s+" + name + "\\s*\\(").exec(source)?.index;
  assert.notEqual(start, undefined, id);
  for (let end = source.indexOf("}", start); end >= 0 && end - start < 100000; end = source.indexOf("}", end + 1)) {
    const candidate = source.slice(start, end + 1);
    try {
      new vm.Script("(" + candidate + ")");
      functions.set(id, candidate);
      return candidate;
    } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
  }
  throw new Error("Could not isolate " + id);
}
function context(key, names, fixture = {}, constants = []) {
  const ctx = vm.createContext(fixture);
  for (const name of constants) {
    const line = sources[key].split("\n").find(line => new RegExp("^\\s*const " + name + "\\s*=").test(line));
    assert(line, key + ": " + name);
    vm.runInContext(line, ctx);
  }
  for (const name of names) vm.runInContext(declared(key, name), ctx);
  return ctx;
}
class Element {
  constructor(tag = "div") { this.tag = tag; this.attrs = Object.create(null); this.children = []; this.text = ""; this.raw = null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  set scope(value) { this.setAttribute("scope", value); }
  set colSpan(value) { this.setAttribute("colspan", value); }
  set className(value) { this.setAttribute("class", value); }
  set textContent(value) { this.text = String(value); this.raw = null; this.children = []; }
  get textContent() { return this.text; }
  set innerHTML(value) { this.raw = value; this.text = ""; this.children = []; }
  get innerHTML() { return this.raw ?? escape(this.text) + this.children.map(child => child.toString()).join(""); }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.raw = null; this.text = ""; this.children = [...children]; }
  toString() { return "<" + this.tag + Object.entries(this.attrs).map(([key, value]) => " " + key + '="' + escape(value) + '"').join("") + ">" + this.innerHTML + "</" + this.tag + ">"; }
}
const documentFor = slots => ({
  createElement: tag => new Element(tag), createElementNS: (namespace, tag) => new Element(tag),
  getElementById(id) { if (!slots.has(id)) slots.set(id, new Element()); return slots.get(id); },
});
function shell(key, index, bodyId, body) {
  const markup = [...sources[key].matchAll(/<table\b[\s\S]*?<\/table>/g)][index][0];
  return markup.replace(new RegExp('<tbody id="' + bodyId + '">[\\s\\S]*?</tbody>'), () => '<tbody id="' + bodyId + '">' + body.innerHTML + "</tbody>");
}

test("LIMS retains all 18 responsive labels and six complete scenario identities", () => {
  const rows = records(native.lims.tables[0]);
  assert.equal(rows.length, 6);
  for (const row of rows) {
    assert.equal(row.cells[0].attrs.scope, "row");
    assert.equal(row.cells[0].attrs["data-label"], "Scenario");
    assert.match(row.attrs["data-label"], /SCN-[A-Z]+-001 /);
    assert.deepEqual(row.cells.slice(1).map(cell => cell.attrs["data-label"]), ["Shared-object connection", "Failure and recovery", "Accountable roles"]);
  }
});
test("gallery preserves both complete native fallback matrices and literal route notation", () => {
  assert.deepEqual(native.gallery.tables.map(item => records(item).length), [6, 6]);
  assert.equal(records(native.gallery.tables[0])[0].cells[3].text, "Anomaly alert \u2192 attention route \u2192 steward queue.");
  assert.equal(records(native.gallery.tables[1])[0].cells[0].text, "Stream adequacy");
  assert.match(sources.gallery, /both semantic tables/);
});

test("Registry filters retain second-cell row identity and DOM-safe literal data", () => {
  const body = new Element("tbody");
  let routes = [{ title: literal, destination: literal, repair: literal, receivedState: literal, groupIds: ["group"] }];
  let scenarios = [{ title: literal, path: literal, receipt: literal, groupIds: ["group"] }];
  let groups = [{ title: literal, investment: literal, changedAbility: literal }];
  const ctx = context("registry", ["createElement", "appendTableRow", "renderSemanticTable"], {
    document: documentFor(new Map()), elements: { contractRows: body },
    recoveryModel: { stages: [{ order: 3, title: literal, statement: literal, receivedState: literal, exitCondition: literal }] },
    filteredRoutes: () => routes, filteredScenarios: () => scenarios, filteredGroups: () => groups,
    groupNames: () => [literal],
  });
  for (const expected of [4, 2, 1]) {
    if (expected === 2) { scenarios = []; groups = []; }
    if (expected === 1) routes = [];
    ctx.renderSemanticTable();
    const rows = records(table(shell("registry", 0, "contractRows", body)));
    assert.equal(rows.length, expected);
    for (const row of rows) {
      assert.equal(row.cells[0].tag, "td");
      assert.equal(row.cells[1].tag, "th");
      assert.equal(row.cells[1].attrs.scope, "row");
      assert(row.attrs["data-label"].includes(row.cells[1].text));
      assert(row.cells[1].text.includes(literal));
      assert.equal(row.cells[2].text, literal);
    }
  }
});

function genomicFixture() {
  const questions = [{ id: "decision", label: literal }, { id: "route", label: "Receiving route" }];
  const groups = [
    { id: "one", label: literal, items: { decision: literal, route: "First route" } },
    { id: "two", label: "Second population", items: { decision: "Second decision", route: literal } },
  ];
  let visible = groups;
  const slots = new Map();
  const model = { questions, groups, blueprint: { stages: [literal, "Review"], layers: [{ label: literal, cells: [literal, "Second value"] }] } };
  const ctx = context("genomic", ["escapeHtml", "renderMatrix", "renderBlueprint", "renderSemanticTable"], {
    model, visibleGroups: () => visible, document: documentFor(slots),
  });
  return { ctx, model, slots, show: groups => { visible = groups; } };
}
test("Genomic matrix keeps question/population axes through filter, reorder and empty states", () => {
  const f = genomicFixture();
  for (const groups of [f.model.groups, [...f.model.groups].reverse(), [f.model.groups[1]], []]) {
    f.show(groups);
    const result = table(f.ctx.renderMatrix());
    assert.deepEqual(result.rows[0].cells.slice(1).map(cell => cell.attrs["data-label"]), groups.map(group => group.label));
    records(result).forEach((row, index) => {
      assert.equal(row.cells[0].text, f.model.questions[index].label);
      assert(row.attrs["data-label"].includes(f.model.questions[index].label));
      row.cells.slice(1).forEach((cell, column) => assert.equal(cell.text, groups[column].items[f.model.questions[index].id]));
    });
  }
});
test("Genomic blueprint maps each layer to the corresponding stage after reordering", () => {
  const f = genomicFixture();
  for (let iteration = 0; iteration < 2; iteration++) {
    const result = table(f.ctx.renderBlueprint());
    const row = records(result)[0];
    assert(row.attrs["data-label"].includes(literal));
    assert.deepEqual(row.cells.slice(1).map(cell => cell.attrs["data-label"]), f.model.blueprint.stages);
    assert.deepEqual(row.cells.slice(1).map(cell => cell.text), f.model.blueprint.layers[0].cells);
    f.model.blueprint.stages.reverse();
    f.model.blueprint.layers[0].cells.reverse();
  }
});
test("Genomic complete semantic table retains population/question axes regardless of filter", () => {
  const f = genomicFixture();
  f.show([]);
  f.ctx.renderSemanticTable();
  const result = table(f.slots.get("semantic-table").innerHTML);
  assert.equal(records(result).length, 2);
  records(result).forEach((row, index) => {
    assert(row.attrs["data-label"].includes(f.model.groups[index].label));
    assert.deepEqual(row.cells.slice(1).map(cell => cell.attrs["data-label"]), f.model.questions.map(question => question.label));
    row.cells.slice(1).forEach((cell, column) => assert.equal(cell.text, f.model.groups[index].items[f.model.questions[column].id]));
  });
});
test("Who To Believe preserves native role identities and the fixed runtime layer/stage blueprint", () => {
  const fallback = records(native.belief.tables[0]);
  assert.equal(fallback.length, 7);
  assert(fallback[0].attrs["data-label"].includes("Participants & influencers"));
  const ctx = context("belief", ["blueprint"], { state: { actor: "all" } });
  const original = ctx.blueprint();
  for (const actor of ["all", literal]) {
    ctx.state.actor = actor;
    assert.equal(ctx.blueprint(), original);
    const result = table(ctx.blueprint());
    assert.deepEqual(records(result).map(row => row.cells[0].text), ["People", "Interface", "Service", "Evidence", "Handoff"]);
    assert.deepEqual(result.rows[0].cells.map(cell => cell.attrs["data-label"]), ["Layer", "Qualify & contribute", "Focus attention", "Review & appeal", "Learn & revise"]);
  }
});

function lessonFixture() {
  const elements = new Proxy({}, { get(object, key) { return object[key] ||= new Element(key === "pairRows" ? "tbody" : "div"); } });
  const ctx = context("lesson", ["correlation", "pairedData", "alignmentPhrase", "signed", "renderPairs"], {
    state: { investigation: { alignmentDays: 1 }, sources: { quantitative: ["NOAA-shaped precipitation", "USGS-shaped streamflow"] } },
    elements, document: documentFor(new Map()),
  });
  const fixture = /    var fixture = \{[\s\S]*?\n    \};/.exec(sources.lesson);
  assert(fixture);
  vm.runInContext(fixture[0], ctx);
  return { ctx, elements, result: () => table(shell("lesson", 1, "pair-rows", elements.pairRows)) };
}
test("Open Lesson retains missing-observation meaning, units, native fallback and three alignment states", () => {
  const observations = records(native.lesson.tables[0]);
  assert.equal(observations.length, 12);
  for (const row of observations.slice(-2)) {
    assert.match(row.cells[1].text, /Precipitation anchor cohort ends Apr 16/);
    assert.equal(row.cells[1].attrs["data-label"], "Daily precipitation (mm)");
  }
  const f = lessonFixture();
  for (const days of [1, 0, 2]) {
    f.ctx.state.investigation.alignmentDays = days;
    f.ctx.renderPairs();
    const rows = records(f.result());
    assert.equal(rows.length, 10);
    assert.equal(f.ctx.state.investigation.pairs, 10);
    rows.forEach((row, index) => {
      assert.equal(row.cells[0].text, f.ctx.fixture.anchorDates[index]);
      assert.equal(row.cells[2].text, f.ctx.fixture.streamflowDates[index + days]);
      assert(row.attrs["data-label"].includes("precipitation " + row.cells[0].text + "; streamflow " + row.cells[2].text));
      assert.deepEqual(row.cells.map(cell => cell.attrs["data-label"]), ["Precipitation date", "Daily precipitation (mm)", "Streamflow date", "Daily-mean streamflow (ft\u00b3/s)"]);
    });
    if (days === 1) assert.deepEqual(rows, records(native.lesson.tables[1]), "Authored fallback matches default runtime records");
  }
});
test("Open Lesson readiness span, recovery and literal dates remain explicit", () => {
  const f = lessonFixture();
  f.ctx.state.sources.quantitative = [];
  f.ctx.renderPairs();
  const empty = records(f.result());
  assert.equal(empty.length, 1);
  assert.equal(empty[0].cells.length, 1);
  assert.equal(empty[0].cells[0].attrs.colspan, "4");
  assert.equal(empty[0].cells[0].attrs["data-label"], "Pairing readiness");
  assert.match(empty[0].cells[0].text, /Choose both quantitative fixture fields/);
  assert.equal(f.ctx.state.investigation.correlation, null);
  f.ctx.state.sources.quantitative = ["NOAA-shaped precipitation", "USGS-shaped streamflow"];
  f.ctx.fixture.anchorDates[0] = literal;
  f.ctx.fixture.streamflowDates[1] = literal;
  f.ctx.renderPairs();
  const rows = records(f.result());
  assert.equal(rows.length, 10);
  assert.equal(rows[0].cells[0].text, literal);
  assert.equal(rows[0].cells[2].text, literal);
  assert(rows[0].attrs["data-label"].includes(literal));
});

const atlasLine = sources.atlas.split("\n").find(line => line.startsWith("const ATLAS = "));
assert(atlasLine);
const atlas = JSON.parse(atlasLine.slice("const ATLAS = ".length).replace(/;\s*$/, ""));
const atlasIdentities = ["stage", "driver", "workflow", "week", "team", "role", "queue", "driver", "label"];
assert.equal(atlas.exemplars.length, 9);
const atlasContext = () => context("atlas", ["tableForDataset"], {}, ["esc", "fmt"]);
atlas.exemplars.forEach((ex, index) => test("Atlas dataset: " + ex.id, () => {
  const ctx = atlasContext();
  const result = table(ctx.tableForDataset(ex));
  assert(result.attrs["data-label"].includes(ex.title));
  assert(result.attrs["data-label"].includes(ex.unit));
  const identity = atlasIdentities[index];
  const identityIndex = ex.dataset.columns.indexOf(identity);
  assert(identityIndex >= 0);
  records(result).forEach((row, rowIndex) => {
    assert(row.attrs["data-label"].includes(identity + ": " + ex.dataset.rows[rowIndex][identityIndex]));
    row.cells.forEach((cell, column) => {
      assert.equal(cell.attrs.headers, result.rows[0].cells[column].attrs.id);
      assert.equal(cell.attrs["data-label"], column === identityIndex ? identity : ex.dataset.columns[column] + " (" + ex.unit + ")");
    });
  });
  assert.equal(records(result).length, ex.dataset.rows.length);
}));
test("Atlas reordered identities, empty data and unknown imported columns use explicit semantic fallbacks", () => {
  const ctx = atlasContext();
  const ex = structuredClone(atlas.exemplars[8]);
  ex.title = literal;
  ex.unit = literal;
  ex.dataset.columns = ["actual", "label", "threshold", "target"];
  ex.dataset.rows = [[0, literal, 50, 100]];
  let result = table(ctx.tableForDataset(ex));
  assert(records(result)[0].attrs["data-label"].endsWith("label: " + literal));
  assert.equal(records(result)[0].cells[0].text, "0");
  assert.equal(records(result)[0].cells[1].attrs["data-label"], "label");
  ex.dataset.rows = [];
  assert.equal(records(table(ctx.tableForDataset(ex))).length, 0);
  ex.id = "__proto__";
  ex.dataset = { columns: [literal, "value"], rows: [[literal, 0]] };
  result = table(ctx.tableForDataset(ex));
  assert(records(result)[0].attrs["data-label"].endsWith(literal + ": " + literal + "; value: 0"));
  assert.equal(records(result)[0].cells[0].attrs["data-label"], literal);
  assert.equal(records(result)[0].cells[0].text, literal);
  assert.equal(records(result)[0].cells[1].attrs["data-label"], "value", "Unknown columns do not inherit invented measure semantics");
});
test("Atlas actual detail renderer carries exemplar context to its source table", () => {
  const slots = new Map();
  const ctx = context("atlas", ["tableForDataset", "renderExemplarDetail"], {
    atlas, view: { selectedExemplarId: atlas.exemplars[0].id }, document: documentFor(slots),
    byId: (items, id) => items.find(item => item.id === id), renderChart: () => "<svg></svg>",
  }, ["esc", "fmt"]);
  slots.set("exemplarDetail", Object.assign(new Element(), { dataset: {} }));
  ctx.renderExemplarDetail();
  const result = table(slots.get("exemplarDetail").innerHTML);
  assert(result.attrs["data-label"].includes(atlas.exemplars[0].title));
});
