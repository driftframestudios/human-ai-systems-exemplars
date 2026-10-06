import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";

const root = process.env.PROTOTYPE_LABELS_ROOT || fileURLToPath(new URL("../../../", import.meta.url));
const paths = {
  a3: "a3-stacked-cube-atlas-expanded-bundle-v0.2/index.html",
  context: "collaboration/context-tree-visual-variants/index.html",
  cobalt: "context-canvas-project-surface/site-readings/exemplars/index-exemplar--cobalt-temporal-field.html",
};
const source = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, fs.readFileSync(path.join(root, value), "utf8")]));
const digest = value => createHash("sha256").update(value).digest("hex");
const literal = 'Ren\u00e9e "A&B" <script>literal</script> \u2192 N\u00b7m';
const clean = value => value.replace(/\s+/g, " ").trim();
function parse(markup) {
  const result = spawnSync(process.env.PYTHON || "python3", [fileURLToPath(new URL("./parse-tables.py", import.meta.url))], {
    input: JSON.stringify(markup), encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  return JSON.parse(result.stdout);
}
const [nativeA3, nativeContext] = parse([source.a3, source.context]);
const records = table => table.rows.filter(row => row.cells.some(cell => cell.tag === "td" || cell.attrs.scope === "row"));
function check(table) {
  assert(table.attrs["data-label"], "Table topic");
  const columns = table.rows.find(row => row.section === "thead").cells;
  const ids = new Set(columns.map(cell => cell.attrs.id).filter(Boolean));
  const body = new Set(records(table));
  for (const row of table.rows) {
    if (body.has(row)) {
      assert(row.attrs["data-label"], "Record context");
      assert.equal(row.cells.reduce((sum, cell) => sum + Number(cell.attrs.colspan || 1), 0), columns.length);
    }
    row.cells.forEach((cell, index) => {
      assert(cell.attrs["data-label"], "Field meaning");
      if (cell.tag === "th") assert(["col", "row"].includes(cell.attrs.scope));
      if (row.section !== "thead" && !cell.attrs.colspan) assert.equal(cell.attrs["data-label"], columns[index].attrs["data-label"]);
      for (const id of (cell.attrs.headers || "").split(/\s+/).filter(Boolean)) assert(ids.has(id), id);
    });
  }
  return table;
}
function table(markup) {
  const result = parse([markup])[0];
  assert.equal(result.scripts.length, 0, "Literal input must stay text");
  assert.equal(result.tables.length, 1);
  return check(result.tables[0]);
}
// Bound extraction to these owners' four-space-indented declarations, not a JS parser.
const declarations = new Map();
function declared(owner, name) {
  const key = owner + ":" + name;
  if (!declarations.has(key)) {
    const start = source[owner].indexOf("    function " + name + "(");
    const end = source[owner].indexOf("\n    }\n", start);
    assert(start >= 0 && end > start, key);
    declarations.set(key, source[owner].slice(start, end + 6));
  }
  return declarations.get(key);
}
const a3ModelText = source.a3.match(/<script[^>]+id="a3-model"[^>]*>([\s\S]*?)<\/script>/)[1];
const a3Model = JSON.parse(a3ModelText);
const a3Shells = [...source.a3.matchAll(/<table\b[\s\S]*?<\/table>/g)].map(match => match[0]);
const bodyIds = ["discrepancy-body", "capability-body", "source-body"];
function atlasFixture(model = structuredClone(a3Model)) {
  const bodies = Object.fromEntries(bodyIds.map(id => [id, { innerHTML: "" }]));
  const context = vm.createContext({ M: model, document: { getElementById: id => bodies[id] } });
  vm.runInContext(source.a3.split("\n").find(line => line.includes("const esc =")), context);
  const start = source.a3.indexOf("    const sourceReference =");
  vm.runInContext(source.a3.slice(start, source.a3.indexOf("\n    const frameIndex", start)), context);
  vm.runInContext(declared("a3", "renderTables"), context);
  return {
    model,
    render() {
      context.renderTables();
      return a3Shells.map((shell, index) => table(shell.replace(
        '<tbody id="' + bodyIds[index] + '"></tbody>',
        '<tbody id="' + bodyIds[index] + '">' + bodies[bodyIds[index]].innerHTML + "</tbody>",
      )));
    },
  };
}

test("both authored owners label every native and generator cell site", () => {
  assert.equal(nativeA3.tables.length, 3);
  assert.equal(nativeContext.tables.length, 1);
  [...nativeA3.tables, ...nativeContext.tables].forEach(check);
  for (const key of ["a3", "context"]) for (const match of source[key].matchAll(/<(td|th)\b/g)) {
    assert(source[key].slice(match.index + match[0].length).startsWith(' data-label="'), key);
  }
});
test("owner scripts parse without mounting a page", () => {
  for (const parsed of [nativeA3, nativeContext]) for (const script of parsed.scripts) {
    if (!script.attrs.src && !/json/i.test(script.attrs.type || "")) new vm.Script(script.text);
  }
});
test("A3 scroll focus extension preserves all other styles and the complete embedded model", () => {
  const styles = key => [...source[key].matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/g)].map(match => match[0]).join("\n");
  const originalFocus = "button:focus-visible, summary:focus-visible, a:focus-visible";
  const scrollFocus = originalFocus + ",\n    .table-wrap:focus-visible";
  const a3Styles = styles("a3");
  assert.equal(a3Styles.split(scrollFocus).length, 2, "One addition to the existing focus rule");
  assert.equal(digest(a3Styles.replace(scrollFocus, originalFocus)), "c100581b535030706d820fced3728c9897eb6c21653d4c82e4f66f12112e125d");
  assert.equal(digest(styles("context")), "71de3c3e25df97c2bebec4156ac7c8413e5759b392aecf443142e4d35dd7c7e6");
  assert.equal(digest(a3ModelText), "516621d828e707f0c69ef8043afe2ee9cdef56827fd337fd1737cff68629eb18");
});
test("A3 binds three named keyboard regions to the actual table wrappers", () => {
  // Finite authored shell contract; browser evidence owns visible focus and reach.
  const wrappers = [...source.a3.matchAll(/(<div class="table-wrap"[^>]*>)\s*(<table\b[\s\S]*?<\/table>)\s*<\/div>/g)];
  const names = ["Atlas discrepancy register", "Capability and service-dependency registry", "Primary-source coverage ledger"];
  assert.equal(wrappers.length, bodyIds.length);
  wrappers.forEach((match, index) => {
    assert.equal(clean(match[1]), `<div class="table-wrap" role="region" tabindex="0" aria-label="${names[index]}">`);
    assert.equal(match[2].match(/<tbody id="([^"]+)"/)[1], bodyIds[index]);
    assert.equal(match[2], a3Shells[index], "Keep each native table inside its named scroll owner");
  });
});
test("A3 preserves all 3 discrepancy, 17 capability and 36 source records", () => {
  const tables = atlasFixture().render();
  assert.deepEqual(tables.map(item => records(item).length), [3, 17, 36]);
  records(tables[0]).forEach((row, index) => {
    const expected = a3Model.discrepancies[index];
    assert(row.attrs["data-label"].includes(expected.question));
    assert.match(row.attrs["data-label"], /conditional research estimates, not outcome probabilities/);
    assert.deepEqual(row.cells.map(cell => clean(cell.text)), [expected.question, ...expected.values.map(value => value + "%"), expected.confidence + " " + expected.falsifier]);
  });
  records(tables[1]).forEach((row, index) => {
    const expected = a3Model.capabilities[index];
    assert(row.attrs["data-label"].includes(expected.label));
    assert.deepEqual(row.cells.map(cell => clean(cell.text)), [expected.label, expected.family, ...expected.states, expected.evidence]);
    assert.deepEqual(row.cells.slice(2, 6).map(cell => cell.attrs["data-label"]), ["F0: Current authority", "F1: Boundary identified", "F2: Shadow / dual-run", "F3: Validated authority"]);
  });
  records(tables[2]).forEach((row, index) => {
    const expected = a3Model.sources[index];
    assert.equal(row.attrs["data-label"], "Selected primary and first-party source coverage: " + expected.title);
    assert(row.cells[0].text.includes(expected.title));
    assert.deepEqual(row.cells.slice(1).map(cell => clean(cell.text)), [expected.role, expected.boundary]);
    assert(!row.attrs["data-label"].includes(expected.url), "Locators are not record labels");
  });
  for (const item of tables) records(item).forEach(row => row.cells.forEach((cell, index) => {
    assert.equal(cell.tag, "td", "Keep existing body-cell styling");
    assert.equal(cell.attrs.headers, item.rows[0].cells[index].attrs.id);
  }));
});
test("A3 reorders and renames records with escaping, zero percent and unknown states intact", () => {
  const fixture = atlasFixture();
  fixture.model.discrepancies.reverse();
  fixture.model.discrepancies[0].question = literal;
  fixture.model.discrepancies[0].values[0] = 0;
  fixture.model.capabilities[0].label = literal;
  fixture.model.capabilities[0].states[2] = "unknown";
  fixture.model.sources[0].title = literal;
  fixture.model.sources[0].role = literal;
  const tables = fixture.render();
  for (const item of tables) assert(records(item)[0].attrs["data-label"].includes(literal));
  assert.equal(records(tables[0])[0].cells[1].text, "0%");
  assert.equal(records(tables[1])[0].cells[4].text, "unknown");
  assert(records(tables[2])[0].cells[0].text.includes("SRC-A3"));
  assert.equal(records(tables[2])[0].cells[1].text, literal);
  fixture.model.sources[0].title = "Revised source title";
  assert.equal(records(fixture.render()[2])[0].attrs["data-label"], "Selected primary and first-party source coverage: Revised source title");
});
test("A3 empty collections clear stale rows and recover without inventing observations", () => {
  const fixture = atlasFixture();
  fixture.render();
  for (const key of ["discrepancies", "capabilities", "sources"]) fixture.model[key] = [];
  assert.deepEqual(fixture.render().map(item => records(item).length), [0, 0, 0]);
  Object.assign(fixture.model, structuredClone(a3Model));
  assert.deepEqual(fixture.render().map(item => records(item).length), [3, 17, 36]);
});
test("A3 publication bytes match while its dated browser receipt retains its scope", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "a3-stacked-cube-atlas-expanded-bundle-v0.2/a3-stacked-cube-atlas-expanded-manifest-v0.2.json"), "utf8"));
  const entry = manifest.inventory.find(item => item.path === "index.html");
  assert.equal(entry.bytes, Buffer.byteLength(source.a3));
  assert.equal(entry.sha256, digest(source.a3));
  assert.match(manifest.validation.scope, /^2026-09-30 /);
  assert.equal(manifest.validation.prior_receipt.executed_on, "2026-07-27");
});

function contextFixture() {
  const model = {
    groups: [{ id: "g1", label: literal, organization: "Lab A" }, { id: "g2", label: "Second collaborator", organization: "Lab B" }],
    questions: [{ id: "q1", label: literal, kind: "knowledge_need" }, { id: "q2", label: "Receiving question", kind: "handoff_route" }],
    stages: [{ id: "s1", label: literal }, { id: "s2", label: "Review" }],
    layers: [{ id: "l1", label: literal, code: "L1" }, { id: "l2", label: "System layer", code: "L2" }],
    items: [
      { id: "i1", text: literal, groupId: "g1", questionId: "q1", stage: "s1", layer: "l1", status: "known", posture: "evidence", routes: ["Route A"], decisionUse: literal },
      { id: "i2", text: "Second context", groupId: "g2", questionId: "q2", stage: "s2", layer: "l2", status: "known", posture: "evidence", routes: [], decisionUse: "" },
    ],
  };
  const state = { model, view: "matrix", visibleGroupIds: ["g1", "g2"], visibleQuestionIds: ["q1", "q2"], visibleStageIds: ["s1", "s2"], visibleLayerIds: ["l1", "l2"], readings: { statuses: false, routes: false } };
  const semanticTable = { innerHTML: "" };
  const ctx = vm.createContext({
    state, semanticTable, structuredClone,
    ROUTES: [{ label: "Route A", color: "blue", family: "Architecture" }],
    STATUS_OPTIONS: [{ id: "known", label: "Known" }, {}, { label: "Unresolved" }],
    POSTURE_OPTIONS: [{ id: "evidence", label: "Evidence" }, { label: "Open" }],
    selected: () => false, titleCase: value => value, surfaceHeading: () => "",
    routeLabelsFor: item => item.routes, routeStyle: () => "", routeChipsFor: () => "",
  });
  const start = source.context.indexOf("    const escapeHtml =");
  vm.runInContext(source.context.slice(start, source.context.indexOf("\n    function sourceLabel", start)), ctx);
  vm.runInContext('const contextCard = item => "<span>" + escapeHtml(item.text) + "</span>"; const emptyInvitation = text => escapeHtml(text || "Add context"); const routeChip = label => escapeHtml(label); const statusChip = id => escapeHtml(statusById(id).label);', ctx);
  for (const name of ["renderMatrix", "renderHandoff", "renderBlueprint", "renderSemanticTable"]) vm.runInContext(declared("context", name), ctx);
  return { ctx, model, state, semanticTable };
}
test("Context matrix labels follow question/collaborator identities through reorder, filter and rename", () => {
  const fixture = contextFixture();
  for (let pass = 0; pass < 3; pass++) {
    if (pass === 1) fixture.model.groups.reverse();
    if (pass === 2) { fixture.state.visibleGroupIds = ["g1"]; fixture.model.groups.find(group => group.id === "g1").label = "Renamed collaborator"; }
    const result = table(fixture.ctx.renderMatrix());
    const groups = fixture.model.groups.filter(group => fixture.state.visibleGroupIds.includes(group.id));
    assert.deepEqual(result.rows[0].cells.slice(1).map(cell => cell.attrs["data-label"]), groups.map(group => group.label));
    records(result).forEach((row, index) => {
      assert(row.attrs["data-label"].includes(fixture.model.questions[index].label));
      row.cells.slice(1).forEach((cell, column) => assert.equal(cell.attrs["data-label"], groups[column].label));
    });
  }
  fixture.state.visibleGroupIds = [];
  assert.equal(parse([fixture.ctx.renderMatrix()])[0].tables.length, 0);
  fixture.state.visibleGroupIds = ["g1"];
  assert.equal(records(table(fixture.ctx.renderMatrix())).length, 2);
});
test("Context blueprint keeps stage columns and layer rows through reorder and empty axes", () => {
  const fixture = contextFixture();
  for (let pass = 0; pass < 2; pass++) {
    if (pass) { fixture.model.stages.reverse(); fixture.model.layers.reverse(); }
    const result = table(fixture.ctx.renderBlueprint());
    assert.deepEqual(result.rows[0].cells.slice(1).map(cell => cell.attrs["data-label"]), fixture.model.stages.map(stage => stage.label));
    records(result).forEach((row, index) => {
      assert(row.attrs["data-label"].includes(fixture.model.layers[index].label));
      row.cells.slice(1).forEach((cell, column) => assert.equal(cell.attrs["data-label"], fixture.model.stages[column].label));
    });
  }
  fixture.state.visibleStageIds = [];
  assert.equal(parse([fixture.ctx.renderBlueprint()])[0].tables.length, 0);
});
test("Context handoff retains literal item identity and missing-reference meanings", () => {
  const fixture = contextFixture();
  let row = records(table(fixture.ctx.renderHandoff()))[0];
  assert(row.attrs["data-label"].includes(literal));
  assert.equal(row.cells[0].text, literal);
  Object.assign(fixture.model.items[0], { text: "Renamed context", groupId: "absent", questionId: "absent", stage: "absent", layer: "absent", decisionUse: "" });
  fixture.state.visibleGroupIds.push("absent");
  fixture.state.visibleQuestionIds.push("absent");
  row = records(table(fixture.ctx.renderHandoff()))[0];
  assert.equal(row.attrs["data-label"], "Context entering each receiving architecture: Renamed context; Context group; Context question");
  assert.equal(row.cells[5].text, "Name the decision this context changes.");
  assert.equal(row.cells[6].text, "Stage still to locate \u00b7 Layer still to locate");
  fixture.model.items = [];
  assert.equal(parse([fixture.ctx.renderHandoff()])[0].tables.length, 0);
});
test("Complete Context Tree retains filtered-out records and refreshes edited identity", () => {
  const fixture = contextFixture();
  fixture.state.visibleGroupIds = [];
  fixture.ctx.renderSemanticTable();
  let rows = records(table(fixture.semanticTable.innerHTML));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].cells[8].text, "Available in the complete Context Tree");
  assert.equal(rows[1].cells[5].text, "Route still to locate.");
  fixture.model.items[0].text = "Revised context";
  fixture.model.groups[0].label = "Revised collaborator";
  fixture.state.view = "blueprint";
  fixture.ctx.renderSemanticTable();
  rows = records(table(fixture.semanticTable.innerHTML));
  assert(rows[0].attrs["data-label"].includes("Revised context; Revised collaborator;"));
  assert.equal(rows[0].cells[8].text, "Visible in the current reading");
});
test("Complete Context Tree empty state spans all nine fields and recovers", () => {
  const fixture = contextFixture();
  const original = fixture.model.items;
  fixture.model.items = [];
  fixture.ctx.renderSemanticTable();
  const row = records(table(fixture.semanticTable.innerHTML))[0];
  assert.equal(row.attrs["data-label"], "Complete Context Tree: no context items");
  assert.equal(row.cells[0].attrs.colspan, "9");
  assert.equal(row.cells[0].attrs["data-label"], "Complete Context Tree availability");
  fixture.model.items = original;
  fixture.ctx.renderSemanticTable();
  assert.equal(records(table(fixture.semanticTable.innerHTML)).length, 2);
});
test("Context scriptless fallback retains five named populations and four fields", () => {
  const fallback = check(nativeContext.tables[0]);
  assert.equal(fallback.attrs["aria-labelledby"], "static-context-title");
  assert.deepEqual(records(fallback).map(row => row.cells[0].text), ["Molecular pathologist", "Bioinformatics analyst", "Research coordinator", "Data steward", "AI assistance surface"]);
  for (const row of records(fallback)) assert.equal(row.attrs["data-label"], "Genomic review context: " + row.cells[0].text);
});
test("Cobalt remains the older worked About comparison, not a migrated owner", () => {
  assert.equal(digest(source.cobalt), "a1432897ed389c32b42eb2654263b9318c72c26b6e9f8892c7684ee2dc6ca2c2");
  assert.match(source.cobalt, /Worked technology leadership portfolio/);
  assert.match(source.cobalt, /source-era portfolio claims are preserved/);
});
