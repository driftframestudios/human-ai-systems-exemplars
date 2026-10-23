import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const file = "service-design-blueprint-chimeric-prototype-v0.2.6.html";
const [source, receiver] = await Promise.all([
  readFile(new URL("../../core-architectures-chimeric-prototype-current-pack-v0.1/" + file, import.meta.url), "utf8"),
  readFile(new URL("../../context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/" + file, import.meta.url), "utf8"),
]);
const runtime = source.match(/<script>\s*([\s\S]*?)<\/script>/u)[1];
const definitions = runtime.slice(0, runtime.indexOf("// Event delegation"));
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const nodes = new Map();
  const events = [];
  const media = { reduced: false };
  const document = {
    activeElement: null,
    getElementById: id => nodes.get(id) || null,
    createElementNS: (_namespace, tag) => make(tag),
  };
  function make(tag, id = "") {
    const node = {
      tagName: tag, id, dataset: {}, attributes: {}, children: [], textContent: "",
      setAttribute(name, value) {
        this.attributes[name] = String(value);
        if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/gu, (_match, char) => char.toUpperCase())] = String(value);
      },
      getAttribute(name) { return this.attributes[name] ?? null; },
      appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
      contains(child) { return this === child || this.children.some(node => node.contains(child)); },
      querySelectorAll(selector) {
        assert.equal(selector, '[data-field="asset-link"]');
        return this.children.filter(child => child.dataset.field === "asset-link");
      },
      focus(options) { document.activeElement = this; events.push({ kind: "focus", id: this.id, options: plain(options) }); },
      scrollIntoView(options) { events.push({ kind: "scroll", id: this.id, options: plain(options) }); },
      setSelectionRange(start, end, direction) { Object.assign(this, { selectionStart: start, selectionEnd: end, selectionDirection: direction }); },
      set innerHTML(value) { this.html = value; this.children = []; },
      get innerHTML() { return this.html || ""; },
    };
    if (id) nodes.set(id, node);
    return node;
  }
  for (const id of ["blueprintSvg", "serviceTable", "cellInspector"]) make("div", id);
  document.activeElement = make("body");
  const context = vm.createContext({
    document, structuredClone, TextEncoder,
    window: { matchMedia: query => {
      assert.equal(query, "(prefers-reduced-motion: reduce)");
      return { matches: media.reduced };
    } },
  });
  vm.runInContext(definitions, context);
  const run = expression => vm.runInContext(expression, context);
  return { context, run, document, nodes, make, events, media };
}

test("Service source and declared receiver retain identical executable selection owners", () => {
  assert.equal(source, receiver);
  assert.doesNotThrow(() => new vm.Script(runtime));
  assert.match(source, /id="blueprintSvg" role="group"/u);
  assert.match(source, /document\.addEventListener\('keydown', activateTopologyKey\)/u);
  assert.match(source, /if \(action === 'select-cell'\) selectCell\(id\)/u);
  assert.match(source, /id="cellText" data-cell-id="\$\{escapeHtml\(cell\.id\)\}" aria-describedby="selectedCellContext"/u);
});

test("SVG background, preview, and status share one named keyboard selection target per cell", () => {
  const f = fixture();
  f.run("renderSvg()");
  const cells = plain(f.run("state.cells"));
  const groups = f.nodes.get("blueprintSvg").children.filter(node => node.getAttribute("role") === "button");
  assert.equal(groups.length, cells.length);
  for (const [index, group] of groups.entries()) {
    assert.equal(group.dataset.id, cells[index].id);
    assert.equal(group.dataset.action, "select-cell");
    assert.equal(group.getAttribute("tabindex"), "0");
    assert.equal(group.getAttribute("aria-controls"), "cellInspector");
    assert.ok(group.getAttribute("aria-label").includes(cells[index].id));
    assert.equal(group.children[0].tagName, "rect");
    assert.ok(group.children.some(node => node.tagName === "text"));
    assert.ok(group.children.some(node => node.getAttribute("data-cell-status") === ""));
    assert.ok(group.children.every(node => node.parentNode === group));
  }
  assert.equal(groups.filter(node => node.getAttribute("aria-pressed") === "true").length, 1);
});

test("Native table labels preserve layer identity, stage meaning, and literal imported text", () => {
  const f = fixture();
  f.run('state.stages[0].label = \'Stage "<tag>&\'; state.layers[0].label = \'Layer "<tag>&\'; state.cells[0].id = \'cell "<tag>&\'; renderTable(); renderSvg();');
  const table = f.nodes.get("serviceTable").innerHTML;
  assert.ok(table.includes("<caption>Service blueprint: Topology. Visible stages and layers</caption>"));
  assert.equal((table.match(/scope="row"/gu) || []).length, f.run("state.layers.length"));
  assert.equal((table.match(/scope="col"/gu) || []).length, f.run("state.stages.length + 1"));
  assert.equal((table.match(/<td data-label=/gu) || []).length, f.run("state.cells.length"));
  assert.ok(table.includes('data-id="cell &quot;&lt;tag&gt;&amp;"'));
  assert.ok(table.includes("Layer &quot;&lt;tag&gt;&amp;"));
  assert.ok(table.includes('data-label="Service stage: Stage &quot;&lt;tag&gt;&amp;'));
  assert.ok(!table.includes("<tag>"));
  const cell = f.nodes.get("blueprintSvg").children.find(node => node.dataset.action === "select-cell");
  assert.equal(cell.dataset.id, 'cell "<tag>&');
  assert.ok(cell.getAttribute("aria-label").includes('Stage "<tag>&'));
});

test("Rename alone refreshes escaped table context without moving input focus or selection", () => {
  const f = fixture();
  for (const id of ["pageTitle", "pageSubtitle", "quickSummary"]) f.make("div", id);
  const input = f.make("input", "artifactName");
  let rename;
  input.addEventListener = (type, listener) => {
    assert.equal(type, "input");
    rename = listener;
  };
  const binding = runtime.split("\n").find(line => line.startsWith("document.getElementById('artifactName').addEventListener('input',"));
  assert.ok(binding, "Exercise the source-owned name-input handler");
  f.run(binding);
  f.run("renderTable()");
  const baseline = {
    state: plain(f.run("artifactJson()")),
    fingerprint: f.run("promptCapsuleFingerprint()"),
    markdown: f.run("promptCapsuleMarkdown('plain')"),
    table: f.nodes.get("serviceTable").innerHTML,
  };
  let exported;
  f.context.recordExports = () => {
    exported = {
      state: plain(f.run("artifactJson()")),
      fingerprint: f.run("promptCapsuleFingerprint()"),
      markdown: f.run("promptCapsuleMarkdown('plain')"),
    };
  };
  f.run("updateExportsOnly = recordExports");
  input.value = 'Renamed "<probe>& Service';
  input.focus({ preventScroll: true });
  input.setSelectionRange(2, 5, "backward");
  f.events.length = 0;
  rename({ target: input });

  const expected = structuredClone(baseline.state);
  expected.artifact_identity.display_name = input.value;
  assert.deepEqual(exported.state, expected, "Only the artifact name changes");
  assert.notEqual(exported.fingerprint, baseline.fingerprint);
  assert.notEqual(exported.markdown, baseline.markdown);
  const table = f.nodes.get("serviceTable").innerHTML;
  const caption = "Service blueprint: Renamed &quot;&lt;probe&gt;&amp; Service. Visible stages and layers";
  assert.ok(table.includes("<caption>" + caption + "</caption>"));
  const rows = [...table.matchAll(/<tr data-label="([^"]*)"/gu)];
  assert.equal(rows.length, f.run("visibleLayers().length"));
  assert.ok(rows.every(([, label]) => label.startsWith(caption + ": ")));
  assert.ok(!table.includes("<probe>"));
  const cellIds = html => [...html.matchAll(/data-action="select-cell" data-id="([^"]*)"/gu)].map(([, id]) => id);
  assert.deepEqual(cellIds(table), cellIds(baseline.table));
  assert.equal(f.nodes.get("pageTitle").textContent, input.value);
  assert.equal(f.document.activeElement, input);
  assert.deepEqual([input.selectionStart, input.selectionEnd, input.selectionDirection], [2, 5, "backward"]);
  assert.deepEqual(f.events, [], "Rename neither focuses nor scrolls an editor");

  input.value = baseline.state.artifact_identity.display_name;
  rename({ target: input });
  assert.deepEqual(exported, { state: baseline.state, fingerprint: baseline.fingerprint, markdown: baseline.markdown });
  assert.equal(f.nodes.get("serviceTable").innerHTML, baseline.table);
  assert.equal(f.document.activeElement, input);
  assert.deepEqual(f.events, []);
});

test("Selection preserves represented state and hands the exact editor a motion-aware scroll", () => {
  const f = fixture();
  const baseline = plain(f.run("artifactJson()"));
  const capsule = f.run("promptCapsuleMarkdown('plain')");
  const fingerprint = f.run("promptCapsuleFingerprint()");
  f.context.renderSelection = () => {
    f.events.push({ kind: "render" });
    const inspector = f.nodes.get("cellInspector");
    inspector.innerHTML = "";
    inspector.dataset.cellId = f.run("activeView().selected_cell_id");
    f.nodes.delete("cellText");
    if (inspector.dataset.cellId) {
      const editor = f.make("textarea", "cellText");
      editor.dataset.cellId = inspector.dataset.cellId;
      inspector.appendChild(editor);
    }
  };
  f.run("renderAll = () => renderSelection()");
  for (const reduced of [false, true]) {
    f.media.reduced = reduced;
    f.events.length = 0;
    f.run("selectCell(state.cells[0].id)");
    assert.deepEqual(f.events, [
      { kind: "render" },
      { kind: "focus", id: "cellText", options: { preventScroll: true } },
      { kind: "scroll", id: "cellText", options: { behavior: reduced ? "instant" : "smooth", block: "center", inline: "nearest" } },
    ]);
    assert.equal(f.document.activeElement.dataset.cellId, f.run("state.cells[0].id"));
    const expected = structuredClone(baseline);
    const view = expected.view_state.views.find(view => view.id === expected.view_state.active_view_id);
    view.selected_cell_id = f.run("state.cells[0].id");
    view.selected_asset_id = "";
    assert.deepEqual(plain(f.run("artifactJson()")), expected);
    assert.equal(f.run("promptCapsuleMarkdown('plain')"), capsule);
    assert.equal(f.run("promptCapsuleFingerprint()"), fingerprint);
  }
  f.events.length = 0;
  f.run("activeView().hidden_stage_ids.push(state.cells[0].stage_id); selectCell(state.cells[0].id)");
  assert.equal(f.run("activeView().selected_cell_id"), "");
  assert.deepEqual(f.events, [{ kind: "render" }]);
});

test("SVG Enter and Space activate once while native buttons keep native keyboard handling", () => {
  const f = fixture();
  const selected = [];
  f.context.recordSelection = id => selected.push(id);
  f.run("selectCell = id => recordSelection(id)");
  for (const key of ["Enter", " ", "Tab"]) {
    let prevented = false;
    f.context.activateTopologyKey({
      key, repeat: false,
      target: { closest: () => ({ dataset: { id: 'exact "<id>&' } }) },
      preventDefault: () => { prevented = true; },
    });
    assert.equal(prevented, key !== "Tab");
  }
  f.context.activateTopologyKey({ key: " ", repeat: true, target: { closest: () => ({ dataset: { id: "repeated" } }) }, preventDefault() {} });
  f.context.activateTopologyKey({ key: "Enter", target: { closest: () => null }, preventDefault() { assert.fail("Native activation remains native"); } });
  assert.deepEqual(selected, ['exact "<id>&', 'exact "<id>&']);
});

test("Inspector rerenders retain control identity and caret only for the same selected cell", () => {
  const f = fixture();
  const inspector = f.nodes.get("cellInspector");
  inspector.dataset.cellId = f.run("activeView().selected_cell_id");
  const editor = f.make("textarea", "cellText");
  inspector.appendChild(editor);
  editor.setSelectionRange(2, 5, "backward");
  editor.focus({ preventScroll: true });
  f.run("globalThis.savedFocus = captureCellEditorFocus()");
  inspector.innerHTML = "";
  const replacement = f.make("textarea", "cellText");
  inspector.appendChild(replacement);
  f.document.activeElement = f.make("body");
  f.run("restoreCellEditorFocus(savedFocus)");
  assert.equal(f.document.activeElement, replacement);
  assert.deepEqual([replacement.selectionStart, replacement.selectionEnd, replacement.selectionDirection], [2, 5, "backward"]);
  const checkbox = f.make("input");
  checkbox.dataset = { field: "asset-link", id: 'asset "<id>&' };
  inspector.appendChild(checkbox);
  checkbox.focus({ preventScroll: true });
  f.run("savedFocus = captureCellEditorFocus()");
  inspector.innerHTML = "";
  const nextCheckbox = f.make("input");
  nextCheckbox.dataset = { ...checkbox.dataset };
  inspector.appendChild(nextCheckbox);
  f.document.activeElement = f.make("body");
  f.run("restoreCellEditorFocus(savedFocus)");
  assert.equal(f.document.activeElement, nextCheckbox);
  f.run("activeView().selected_cell_id = state.cells[0].id");
  f.events.length = 0;
  f.run("restoreCellEditorFocus(savedFocus)");
  assert.deepEqual(f.events, []);
});
