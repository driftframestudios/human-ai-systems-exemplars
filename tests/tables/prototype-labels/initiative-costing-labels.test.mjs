import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const root = process.env.PROTOTYPE_LABELS_ROOT || fileURLToPath(new URL("../../../", import.meta.url));
const owner = "collaboration/initiative-costing-calculator/index.html";
const source = fs.readFileSync(path.join(root, owner), "utf8");
const literal = 'Ren\u00e9e "A&B" <script>literal</script> \u2192 N\u00b7m';
const frameworkColumns = ["Component", "Mapping state", "Mapped and suggested activities", "Mapped into plan"];
const attentionColumns = ["Attention area", "Allocated hours", "Planning consequence"];
const digest = value => createHash("sha256").update(value).digest("hex");
const plain = value => JSON.parse(JSON.stringify(value));
const shells = Object.fromEntries(["framework-table", "attention-table"].map(name => {
  const match = source.match(new RegExp('<table class="' + name + '">[\\s\\S]*?<\\/table>'));
  assert(match, name);
  return [name, match[0]];
}));

// Reuse the table family's existing parser; no browser or new parser dependency.
function parse(markup) {
  const result = spawnSync(process.env.PYTHON || "python3", [fileURLToPath(new URL("./parse-tables.py", import.meta.url))], {
    input: JSON.stringify(markup), encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
  });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  return JSON.parse(result.stdout).map(item => {
    assert.equal(item.scripts.length, 0, "Changed table output keeps literal strings out of script markup");
    assert.equal(item.tables.length, 1);
    return item.tables[0];
  });
}
const records = table => table.rows.filter(row => row.section === "tbody");
function check(table, columns) {
  const headings = table.rows.find(row => row.section === "thead").cells;
  assert.deepEqual(headings.map(cell => cell.text), columns);
  assert.deepEqual(headings.map(cell => cell.attrs["data-label"]), columns);
  assert(headings.every(cell => cell.tag === "th" && cell.attrs.scope === "col"));
  for (const row of records(table)) {
    assert(row.attrs["data-label"], "A detached row retains topic and identity");
    assert.equal(row.cells.length, columns.length);
    assert.deepEqual(row.cells.map(cell => cell.attrs["data-label"]), columns);
    assert.equal(row.cells[0].tag, "th");
    assert.equal(row.cells[0].attrs.scope, "row");
    assert(row.cells.slice(1).every(cell => cell.tag === "td"));
  }
}

const declarations = new Map();
function declared(name) {
  if (declarations.has(name)) return declarations.get(name);
  const start = new RegExp("\\bfunction\\s+" + name + "\\s*\\(").exec(source)?.index;
  assert.notEqual(start, undefined, name);
  for (let end = source.indexOf("}", start); end >= 0 && end - start < 30000; end = source.indexOf("}", end + 1)) {
    const candidate = source.slice(start, end + 1);
    try {
      new vm.Script("(" + candidate + ")");
      declarations.set(name, candidate);
      return candidate;
    } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
  }
  throw new Error("Could not isolate " + name);
}
function fixture() {
  const slots = new Map(), downstream = [];
  const slot = id => {
    if (!slots.has(id)) slots.set(id, {
      innerHTML: "", value: "", attrs: {},
      setAttribute(name, value) { this.attrs[name] = String(value); },
    });
    return slots.get(id);
  };
  // Plots and adjacent panels are stubs; assertions cover the two table owners only.
  const ctx = vm.createContext({
    $: slot, strategyRender: () => downstream.push("strategy"), staffingRender: () => downstream.push("staffing"),
    horizonRender: () => downstream.push("horizon"), curvePoint: () => ({ x: 1, y: 1 }), sigmaTail: () => 0,
  });
  const start = source.indexOf("  var frameworks={"), end = source.indexOf("\n  };", start);
  vm.runInContext(source.slice(start, end + 5), ctx);
  vm.runInContext(source.split("\n").find(line => line.startsWith("  var qualityAttention=")), ctx);
  ctx.state = { framework: "kotter", frameworkStates: Object.fromEntries(Object.entries(ctx.frameworks).map(([id, model]) => [
    id, model.components.map((_component, index) => ({ status: ["planned", "partial", "look", "outside"][index % 4], mapped: index % 2 === 0 })),
  ])) };
  for (const name of ["escapeHtml", "frameworkRender", "sigmaRender"]) vm.runInContext(declared(name), ctx);
  const shell = (name, id) => shells[name].replace('<tbody id="' + id + '"></tbody>', () =>
    '<tbody id="' + id + '">' + slot(id).innerHTML + "</tbody>");
  return {
    ctx, slot, downstream,
    framework(id, filter) {
      ctx.state.framework = id; slot("activity-filter").value = filter;
      const before = plain(ctx.state);
      ctx.frameworkRender();
      assert.deepEqual(plain(ctx.state), before, "Rendering metadata leaves retained maps and status unchanged");
      return shell("framework-table", "framework-rows");
    },
    attention(posture, hours) {
      slot("sigma-target-input").value = String(posture);
      const before = plain(ctx.state), result = ctx.sigmaRender(hours);
      assert.deepEqual(plain(ctx.state), before);
      return { html: shell("attention-table", "sigma-attention"), result, readout: slot("sigma-readout").value };
    },
  };
}

function protectedText(html) {
  const styles = [...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/g)].map(match => match[0]);
  const generated = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)]
    .filter(match => /data-investment-analysis-source=|type="application\/schema\+json"/.test(match[0].slice(0, match[0].indexOf(">"))))
    .map(match => match[0]);
  const start = html.indexOf("  var frameworks={");
  const end = html.indexOf("\n  };", start);
  assert(start >= 0 && end > start);
  const attention = html.split("\n").find(line => line.startsWith("  var qualityAttention="));
  assert(attention);
  return [...styles, ...generated, html.slice(start, end + 5), attention].join("\n");
}

test("both authored tables retain their native captions and matching column labels", () => {
  const tables = parse(Object.values(shells));
  assert(shells["framework-table"].includes("Active change framework components and mapped activities</caption>"));
  assert(shells["attention-table"].includes("Quality attention allocation derived from the selected sigma posture</caption>"));
  check(tables[0], frameworkColumns); check(tables[1], attentionColumns);
  assert(tables.every(table => records(table).length === 0), "These authored bodies await their existing runtime owners");
});

test("styles, shared analysis/schema carriers and fixed row descriptors remain byte-identical", () => {
  assert.equal(digest(protectedText(source)), "2e920d4a30f7f1e22081d3f9620d476dd3bdd7fc78db48503013e49afa43957e");
});

for (const id of ["kotter", "npt", "rogers", "weick", "adkar", "dual"]) {
  test(id + ": current framework and all/core/enterprise/empty-filter labels follow rendered rows", () => {
    const f = fixture(), filters = ["all", "core", "enterprise", ""];
    const outputs = filters.map(filter => f.framework(id, filter));
    const tables = parse(outputs), model = f.ctx.frameworks[id];
    tables.forEach((table, caseIndex) => {
      check(table, frameworkColumns);
      const filter = filters[caseIndex], filterLabel = filter === "core" ? "Core Architectures" : filter === "enterprise" ? "Enterprise" : "All";
      assert.equal(records(table).length, model.components.length);
      records(table).forEach((row, index) => {
        const component = model.components[index], state = f.ctx.state.frameworkStates[id][index];
        assert.equal(row.attrs["data-label"],
          "Active change framework components and mapped activities: " + model.name + " / " + component[0] + "; activity source filter: " + filterLabel);
        assert.equal(row.cells[0].text, component[0] + component[1]);
        const suggestions = [
          ...(filter !== "enterprise" ? Array.from(component[2], name => "Core \u00b7 " + name) : []),
          ...(filter !== "core" ? Array.from(component[3], name => "Enterprise \u00b7 " + name) : []),
        ].join(" ");
        assert.equal(row.cells[2].text, suggestions);
        assert.equal(row.cells[3].text, "Mapped");
        assert(outputs[caseIndex].includes('data-framework-status="' + index + '"'));
        assert(outputs[caseIndex].includes('data-framework-map="' + index + '" ' + (state.mapped ? "checked" : "") + '>'));
        assert(outputs[caseIndex].includes('<option value="' + state.status + '" selected>'));
      });
    });
    assert.deepEqual(f.downstream, filters.flatMap(() => ["strategy", "staffing", "horizon"]));
  });
}

test("renamed framework/component and literal suggestions stay current escaped table text and labels", () => {
  const f = fixture(); f.framework("kotter", "all");
  const model = f.ctx.frameworks.kotter;
  model.name = literal; model.components[0][0] = literal; model.components[0][1] = literal;
  model.components[0][2] = [literal]; model.components[0][3] = [literal];
  const html = f.framework("kotter", "all"), table = parse([html])[0], row = records(table)[0];
  check(table, frameworkColumns);
  assert.equal(row.attrs["data-label"], "Active change framework components and mapped activities: " + literal + " / " + literal + "; activity source filter: All");
  assert.equal(row.cells[0].text, literal + literal);
  assert.equal(row.cells[2].text, "Core \u00b7 " + literal + " Enterprise \u00b7 " + literal);
  assert(html.includes('aria-label="Mapping state for ' + f.ctx.escapeHtml(literal) + '"'));
});

test("empty suggestions and description remain empty fields, not invented unavailable values", () => {
  const f = fixture(), component = f.ctx.frameworks.kotter.components[0];
  component[1] = ""; component[2] = []; component[3] = [];
  const table = parse([f.framework("kotter", "core")])[0], row = records(table)[0];
  check(table, frameworkColumns);
  assert.equal(row.cells[0].text, component[0]);
  assert.equal(row.cells[2].text, "");
  assert.equal(row.cells[2].attrs["data-label"], "Mapped and suggested activities");
  assert(row.attrs["data-label"].includes("activity source filter: Core Architectures"));
});

for (const [posture, qualityHours] of [[1, 0], [3, 80], [3.5, 0], [6, 120], ["", 0]]) {
  test("sigma posture " + JSON.stringify(posture) + " and " + qualityHours + " hours preserve allocation, rounding and unit", () => {
    const f = fixture(); f.attention(2, 24);
    const result = f.attention(posture, qualityHours), table = parse([result.html])[0], sigma = Number(posture) || 3;
    const weights = [18 + sigma, 10 + sigma * 2, 14 + sigma, 12, 14 + sigma * 2, 12, 15 + sigma];
    const sum = weights.reduce((total, weight) => total + weight, 0);
    check(table, attentionColumns);
    assert.equal(result.result, sigma);
    assert(result.readout.startsWith(sigma.toFixed(1) + "\u03c3"));
    assert.equal(records(table).length, 7);
    records(table).forEach((row, index) => {
      const descriptor = f.ctx.qualityAttention[index];
      assert.equal(row.attrs["data-label"], "Quality attention allocation: " + descriptor[0] + "; " + sigma.toFixed(1) + "\u03c3 planning posture");
      assert.deepEqual(row.cells.map(cell => cell.text), [descriptor[0], Math.round(qualityHours * weights[index] / sum) + " h", descriptor[1]]);
    });
  });
}

test("attention-area rename and literal consequence remain escaped while zero hours stay visible", () => {
  const f = fixture(); f.attention(3, 80);
  f.ctx.qualityAttention[0] = [literal, literal];
  const table = parse([f.attention(4.5, 0).html])[0], row = records(table)[0];
  check(table, attentionColumns);
  assert.equal(row.attrs["data-label"], "Quality attention allocation: " + literal + "; 4.5\u03c3 planning posture");
  assert.deepEqual(row.cells.map(cell => cell.text), [literal, "0 h", literal]);
});

test("an empty planning consequence stays empty alongside its meaningful area and zero-hour value", () => {
  const f = fixture(); f.ctx.qualityAttention[0][1] = "";
  const table = parse([f.attention(3, 0).html])[0], row = records(table)[0];
  check(table, attentionColumns);
  assert.equal(row.cells[1].text, "0 h");
  assert.equal(row.cells[2].text, "");
  assert.equal(row.cells[2].attrs["data-label"], "Planning consequence");
});
