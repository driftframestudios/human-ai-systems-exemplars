import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const file = "shared-surface-priority-map-chimeric-prototype-v0.1.4.html";
const source = await readFile(new URL("../../core-architectures-chimeric-prototype-current-pack-v0.1/" + file, import.meta.url), "utf8");
const receiver = await readFile(new URL("../../context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/" + file, import.meta.url), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));

// These named source functions have top-level two-space closing braces.
function definition(name) {
  const start = source.indexOf("  function " + name + "(");
  assert(start >= 0, "Named executable owner exists: " + name);
  const end = source.indexOf("\n  }", start);
  assert(end > start);
  return source.slice(start, end + 4);
}
function fixture() {
  const calls = [], controls = [], body = {};
  const view = {
    id: "view-main", active_intensity_basis_ids: ["workflow", "reach"],
    surface_order: ["surface-a", "surface-b", "surface-c"],
    shared_asset_order: ["asset-a", "asset-b", "asset-c"],
    hidden_stage_ids: ["stage-b"], hidden_surface_ids: ["surface-c"], hidden_shared_asset_ids: ["asset-c"],
    selected_cell_id: "cell-a", selected_shared_asset_id: "",
  };
  const state = {
    artifact_identity: { id: "shared-map" }, view,
    cells: [{ id: "cell-a", intensity_by_basis: { workflow: "high", reach: "low" }, linked_shared_asset_ids: ["asset-a"], note: "Literal <em>note</em>" }],
    shared_assets: [{ id: "asset-a", description: "Shared context" }],
    capsule_source: { receiver: "Named owner", instruction: "Keep literal <text> and stable IDs" },
  };
  const document = {
    activeElement: body,
    querySelectorAll(selector) {
      assert.match(selector, /^\[(?:id|data-(?:basis-toggle|move-surface|move-asset|cell-basis|cell-asset|asset-stage))\]$/u);
      const attribute = selector.slice(1, -1);
      return controls.filter(control => control.hasAttribute(attribute));
    },
    getElementById(id) { assert.equal(id, "basisToggles"); return basisHost; },
  };
  function control(attributes, disabled = false) {
    const node = {
      disabled, checked: true, listeners: {},
      hasAttribute: name => Object.hasOwn(attributes, name),
      getAttribute: name => attributes[name] ?? null,
      addEventListener(name, listener) { this.listeners[name] = listener; },
      focus(options) {
        assert.equal(this.disabled, false);
        document.activeElement = this;
        calls.push({ control: this, options: plain(options) });
      },
    };
    return node;
  }
  const oldBasis = control({ "data-basis-toggle": "workflow" });
  const basisHost = { innerHTML: "", querySelectorAll: () => [oldBasis] };
  let renders = 0;
  const context = vm.createContext({
    document, state, selectedKind: "cell", selectedId: "cell-a", activeView: () => view,
    intensityDefs: [{ id: "workflow", label: "Workflow" }, { id: "reach", label: "Reach" }],
    escapeHtml: value => value,
    renderAll() { renders++; document.activeElement = body; },
  });
  vm.runInContext(["renderAllPreservingControlFocus", "renderBasisToggles", "moveItem"].map(definition).join("\n"), context);
  return {
    state, view, document, body, calls, controls, control, oldBasis,
    renders: () => renders,
    run: expression => vm.runInContext(expression, context),
    set: (name, value) => { context[name] = value; },
  };
}

test("canonical and Canvas focus owners stay source-identical, with actual listener routing", () => {
  assert.equal(source, receiver);
  assert.match(source, /renderAllPreservingControlFocus\(e\.currentTarget\)/u);
  for (const kind of ["surface", "asset"]) {
    assert(source.includes("moveItem('" + kind + "', e.currentTarget.dataset.move" +
      kind[0].toUpperCase() + kind.slice(1) + ", Number(e.currentTarget.dataset.dir), e.currentTarget)"));
  }
  for (const name of ["renderAllPreservingControlFocus", "renderBasisToggles", "moveItem"]) {
    assert.doesNotThrow(() => new vm.Script(definition(name)));
  }
});

test("focus-only rendering preserves all matrix, view and capsule-source fields", () => {
  const f = fixture(), before = plain(f.state);
  const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const beforeHash = hash(f.state);
  const old = f.control({ "data-basis-toggle": 'basis:"literal"' });
  const next = f.control({ "data-basis-toggle": 'basis:"literal"' });
  f.controls.push(f.control({ "data-basis-toggle": "unrelated" }), next);
  f.document.activeElement = old; f.set("activated", old);
  f.run("renderAllPreservingControlFocus(activated)");
  assert.equal(f.document.activeElement, next);
  assert.deepEqual(f.calls[0].options, { preventScroll: true });
  assert.deepEqual(f.state, before);
  assert.equal(hash(f.state), beforeHash);
  assert.equal(f.renders(), 1);
});

test("real basis change listener filters only the requested basis and returns exact focus", () => {
  const f = fixture(), before = plain(f.state);
  const next = f.control({ "data-basis-toggle": "workflow" });
  f.controls.push(next); f.run("renderBasisToggles()");
  f.document.activeElement = f.oldBasis; f.oldBasis.checked = false;
  f.oldBasis.listeners.change({ target: f.oldBasis, currentTarget: f.oldBasis });
  before.view.active_intensity_basis_ids = ["reach"];
  assert.deepEqual(plain(f.state), before);
  assert.equal(f.document.activeElement, next);
  assert.deepEqual(f.calls[0].options, { preventScroll: true });
});

test("last active basis remains selected without losing its matching focus", () => {
  const f = fixture(); f.view.active_intensity_basis_ids = ["workflow"];
  const before = plain(f.state), next = f.control({ "data-basis-toggle": "workflow" });
  f.controls.push(next); f.run("renderBasisToggles()");
  f.document.activeElement = f.oldBasis; f.oldBasis.checked = false;
  f.oldBasis.listeners.change({ target: f.oldBasis, currentTarget: f.oldBasis });
  assert.deepEqual(plain(f.state), before);
  assert.equal(f.oldBasis.checked, true);
  assert.equal(f.document.activeElement, next);
});

for (const [kind, field] of [["surface", "surface_order"], ["asset", "shared_asset_order"]]) {
  test(kind + " reorder returns to the same stable ID and direction, preserving orthogonal state", () => {
    const f = fixture(), before = plain(f.state), id = kind + "-a", attribute = "data-move-" + kind;
    const old = f.control({ [attribute]: id, "data-dir": "1" });
    const next = f.control({ [attribute]: id, "data-dir": "1" });
    f.controls.push(
      f.control({ [attribute]: kind + "-b", "data-dir": "1" }),
      f.control({ [attribute]: id, "data-dir": "-1" }),
      next,
    );
    f.document.activeElement = old; f.set("activated", old);
    f.run("moveItem('" + kind + "', '" + id + "', 1, activated)");
    [before.view[field][0], before.view[field][1]] = [before.view[field][1], before.view[field][0]];
    assert.deepEqual(plain(f.state), before);
    assert.equal(f.document.activeElement, next);
    assert.deepEqual(f.calls[0].options, { preventScroll: true });
  });
}

test("inactive controls and unrelated editors never authorize a focus transfer", () => {
  const f = fixture(), old = f.control({ "data-basis-toggle": "workflow" });
  f.controls.push(f.control({ "data-basis-toggle": "workflow" }));
  f.set("activated", old);
  f.run("renderAllPreservingControlFocus(activated)");
  assert.equal(f.calls.length, 0);
  const editor = f.control({ "data-cell-note": "cell-a" });
  f.document.activeElement = editor; f.set("activated", editor);
  f.run("renderAllPreservingControlFocus(activated)");
  assert.equal(f.calls.length, 0);
});

test("missing, disabled and ambiguous matches do not redirect focus to another control", () => {
  for (const mode of ["missing", "disabled", "ambiguous", "wrong-direction"]) {
    const f = fixture(), attributes = { "data-move-surface": "surface-a", "data-dir": "1" };
    const old = f.control(attributes); f.document.activeElement = old; f.set("activated", old);
    if (mode === "disabled") f.controls.push(f.control(attributes, true));
    if (mode === "ambiguous") f.controls.push(f.control(attributes), f.control(attributes));
    if (mode === "wrong-direction") f.controls.push(f.control({ ...attributes, "data-dir": "-1" }));
    f.run("renderAllPreservingControlFocus(activated)");
    assert.equal(f.calls.length, 0, mode);
    assert.equal(f.document.activeElement, f.body, mode);
  }
});

test("invalid or endpoint reorder remains a no-op without a render or focus action", () => {
  const f = fixture(), before = plain(f.state);
  f.run("moveItem('surface', 'missing', 1)");
  f.run("moveItem('surface', 'surface-a', -1)");
  assert.deepEqual(plain(f.state), before);
  assert.equal(f.renders(), 0);
  assert.equal(f.calls.length, 0);
});


function inspectorFixture(kind) {
  const f = fixture(), projectionCalls = [], nodes = new Map();
  const id = kind === "cell" ? "cell-a" : "asset-a";
  f.set("selectedKind", kind); f.set("selectedId", id);
  const record = kind === "cell" ? f.state.cells[0] : f.state.shared_assets[0];
  Object.assign(record, { handoff: "Service-design Blueprint", reason: "Existing reason", evidence_status: "known" });
  if (kind === "asset") Object.assign(record, { owner_or_steward: "Existing owner", review_trigger: "Existing trigger", supported_stage_ids: [] });
  const node = name => {
    if (!nodes.has(name)) {
      const control = f.control({ id: name });
      Object.assign(control, { id: name, value: "", textContent: "", style: {}, dataset: {} });
      nodes.set(name, control);
    }
    return nodes.get(name);
  };
  f.document.getElementById = node;
  const basis = f.control({ "data-cell-basis": "workflow" }); basis.dataset = { cellBasis: "workflow" };
  const asset = f.control({ "data-cell-asset": "asset-a" }); asset.dataset = { cellAsset: "asset-a" };
  const stage = f.control({ "data-asset-stage": "stage-a" }); stage.dataset = { assetStage: "stage-a" };
  const inspector = { querySelectorAll: selector => ({
    "[data-cell-basis]": [basis], "[data-cell-asset]": [asset], "[data-asset-stage]": [stage],
  })[selector] || [] };
  f.set("inspector", inspector);
  for (const name of ["renderSvg", "renderTable", "renderIdentityRegistry", "renderAiPrompt", "updateJsonLdScript"]) {
    f.set(name, () => projectionCalls.push(name));
  }
  f.run(["updateInspectorRouteReadout", "renderInspectorProjections"].map(definition).join("\n"));
  const renderer = definition(kind === "cell" ? "renderCellInspector" : "renderAssetInspector");
  const marker = kind === "cell" ? "    el.querySelectorAll('[data-cell-basis]')" : "    document.getElementById('asset-desc')";
  const start = renderer.indexOf(marker);
  assert(start > 0, "Use the actual authored listener section");
  f.run("(function(){ const c = state.cells[0], a = state.shared_assets[0], el = inspector;\n" + renderer.slice(start, -4) + "\n})()");
  return { ...f, record, node, nodes, projectionCalls };
}

for (const [kind, fields] of [
  ["cell", [["note", "note"], ["reason", "reason"], ["custom-route", "handoff"]]],
  ["asset", [["desc", "description"], ["owner", "owner_or_steward"], ["reason", "reason"],
    ["trigger", "review_trigger"], ["custom-route", "handoff"]]],
]) {
  test(kind + " actual input/blur handlers commit literal edits while leaving native Tab destination and editor nodes intact", () => {
    for (const [suffix, field] of fields) {
      const f = inspectorFixture(kind), before = plain(f.state);
      const editor = f.node(kind + "-" + suffix), next = f.node(kind + "-route");
      const literal = 'Edited <em>literal</em> & "quoted"';
      editor.value = literal; f.document.activeElement = editor;
      editor.listeners.input({ target: editor, currentTarget: editor });
      // During blur, the browser has not yet focused its relatedTarget.
      f.document.activeElement = f.body;
      editor.listeners.blur({ target: editor, currentTarget: editor, relatedTarget: next });
      const targetRecord = kind === "cell" ? before.cells[0] : before.shared_assets[0];
      targetRecord[field] = literal;
      assert.deepEqual(plain(f.state), before);
      assert.equal(f.node(kind + "-" + suffix), editor);
      assert.equal(f.node(kind + "-route"), next);
      assert.equal(f.renders(), 0, "Blur does not reconstruct the inspector or control panels");
      assert.equal(f.calls.length, 0, "Blur does not impose a competing focus move");
      assert.deepEqual(f.projectionCalls, ["renderSvg", "renderTable", "renderIdentityRegistry", "renderAiPrompt", "updateJsonLdScript"]);
      f.document.activeElement = next;
      assert.equal(f.document.activeElement, next, "The native pending destination remains available");
      assert.equal(f.node(kind + "-route-label").textContent, "Current route: " + f.record.handoff);
    }
  });
}

for (const kind of ["cell", "asset"]) {
  for (const field of ["route", "status"]) {
    test(kind + " " + field + " real change handler retains exact selected control focus without scrolling", () => {
      const f = inspectorFixture(kind);
      const old = f.node(kind + "-" + field), next = f.control({ id: kind + "-" + field });
      f.controls.push(next);
      f.document.activeElement = old; old.value = field === "route" ? "Context Tree" : "assumed";
      old.listeners.change({ target: old, currentTarget: old });
      assert.equal(f.record[field === "route" ? "handoff" : "evidence_status"], old.value);
      assert.equal(f.document.activeElement, next);
      assert.deepEqual(f.calls[0].options, { preventScroll: true });
    });
  }
}

test("inspector focus keys cannot cross a selected record or select an unrelated control", () => {
  for (const attribute of ["id", "data-cell-basis", "data-cell-asset", "data-asset-stage"]) {
    const f = fixture(), kind = attribute === "data-asset-stage" ? "asset" : "cell";
    f.set("selectedKind", kind); f.set("selectedId", kind + "-a");
    const value = attribute === "id" ? "cell-route" : 'literal:"identity"';
    const old = f.control({ [attribute]: value }), next = f.control({ [attribute]: value });
    f.controls.push(next); f.document.activeElement = old; f.set("activated", old);
    f.run("renderAllPreservingControlFocus(activated)");
    assert.equal(f.document.activeElement, next);
    f.calls.length = 0; f.document.activeElement = old;
    f.set("renderAll", () => { f.set("selectedId", kind + "-other"); f.document.activeElement = f.body; });
    f.run("renderAllPreservingControlFocus(activated)");
    assert.equal(f.calls.length, 0, "A new selection does not inherit old control focus");
  }
});

test("native route selects keep full canonical options and associated literal wrapping readouts", () => {
  const escape = source.match(/^  function escapeHtml\(str\)\{[^\n]+\}/m)?.[0];
  assert(escape);
  const context = vm.createContext({});
  vm.runInContext(escape + "\n" + definition("inspectorRouteLabel"), context);
  for (const kind of ["cell", "asset"]) {
    for (const value of ["Service-design Blueprint", 'Custom <em>literal</em> & "route"', "", "unbroken".repeat(40)]) {
      context.kind = kind; context.value = value;
      const html = vm.runInContext("inspectorRouteLabel(kind,value)", context);
      assert(html.includes('id="' + kind + '-route-label"'));
      assert(html.includes(value ? value.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])) : "No route selected"));
      assert(!html.includes("<em>"));
    }
    assert(source.includes('<select id="' + kind + '-route" aria-describedby="' + kind + '-route-label">'));
  }
  assert.match(source, /\.route-selection-label\s*\{[^}]*white-space:\s*normal[^}]*overflow-wrap:\s*anywhere[^}]*max-inline-size:\s*100%/);
  assert(!/\.route-selection-label\s*\{[^}]*(?:font-size|line-clamp)/.test(source));
});


for (const kind of ["cell", "asset"]) {
  test(kind + " standard-to-custom route immediately synchronizes its described readout without replacing nodes or moving focus", () => {
    for (const customValue of ["", "   ", '  <em>literal</em> & "custom"  ']) {
      const f = inspectorFixture(kind);
      const route = f.node(kind + "-route"), custom = f.node(kind + "-custom-route");
      const wrapper = f.node(kind + "-custom-route-wrap"), readout = f.node(kind + "-route-label");
      const before = plain(f.state), retainedNodes = new Map(f.nodes);
      f.run("updateInspectorRouteReadout()");
      assert.equal(readout.textContent, "Current route: Service-design Blueprint");
      wrapper.style.display = "none";
      custom.value = customValue;
      f.document.activeElement = route;
      route.value = "__custom__";
      route.listeners.change({ target: route, currentTarget: route });
      const expected = customValue.trim();
      (kind === "cell" ? before.cells[0] : before.shared_assets[0]).handoff = expected;
      assert.deepEqual(plain(f.state), before);
      assert.equal(readout.textContent, "Current route: " + (expected || "No route selected"),
        "Synchronize immediately, without a later input or blur event");
      assert.equal(wrapper.style.display, "block");
      assert.equal(custom.value, customValue, "Preserve the existing custom editor value");
      assert.equal(f.document.activeElement, route, "The native selection keeps its existing focus");
      assert.equal(f.calls.length, 0);
      assert.equal(f.renders(), 0);
      assert.deepEqual(f.projectionCalls, []);
      for (const [id, node] of retainedNodes) assert.equal(f.node(id), node, "Retain native node: " + id);
    }
  });
}
