import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { INVESTMENT_HOSTS, INLINE_OWNERS, readInvestmentSources, projectInvestmentHtml, assertInvestmentProjection } from "../../tools/project-investment-analysis.mjs";

const root = new URL("../../", import.meta.url);
test("both authored hosts retain source-exact readable inline owners in initialization order", async () => {
  const sources = await readInvestmentSources();
  for (const route of INVESTMENT_HOSTS) {
    const html = await readFile(new URL(route, root), "utf8");
    assertInvestmentProjection(html, sources);
    assert.equal(projectInvestmentHtml(projectInvestmentHtml(html, sources), sources), html);
    for (const owner of INLINE_OWNERS) assert.ok(html.includes(sources[owner.path].trimEnd()));
    assert.doesNotMatch(html, /(?:src|href)="\.\.\/investment-analysis\//);
    assert.ok(html.indexOf("investment-analysis:ui:start") > html.lastIndexOf("window.investmentAnalysis?.setMethod"));
  }
  const model = await readFile(new URL(INVESTMENT_HOSTS[1], root), "utf8");
  assert.match(model, /default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'/);
  assert.ok(model.indexOf("investment-analysis:ui:start") > model.indexOf("window.crossFunctionalInvestmentModelStudio ="));
});

test("projection reports stale copies, malformed markers and HTML terminators before delivery", async () => {
  const sources = await readInvestmentSources();
  const html = await readFile(new URL(INVESTMENT_HOSTS[0], root), "utf8");
  const changed = { ...sources, [INLINE_OWNERS[1].path]: sources[INLINE_OWNERS[1].path] + "\n// changed owner\n" };
  assert.throws(() => assertInvestmentProjection(html, changed), /Refresh the investment inline projection/);
  assert.throws(() => projectInvestmentHtml(html.replace("investment-analysis:core:end", "missing"), sources), /marker pair/);
  assert.throws(() => projectInvestmentHtml(html + "<!-- investment-analysis:core:start -->", sources), /marker pair/);
  const unsafe = { ...sources, [INLINE_OWNERS[1].path]: 'const text = "</script>";' };
  assert.throws(() => projectInvestmentHtml(html, unsafe), /inline-safe source/);
});


test("method migration vocabulary matches the eight authored source records", async () => {
  const {default:C}=await import("../../collaboration/investment-analysis/core.js");
  const html=await readFile(new URL(INVESTMENT_HOSTS[1],root),"utf8");
  const records=[...html.matchAll(/id: "(model\/[^"]+)"[\s\S]*?sourceId: "([^"]+)"/g)].map(match=>[match[1],match[2]]);
  assert.equal(records.length,8);
  assert.deepEqual(Object.fromEntries(records),C.METHOD_SOURCE_KEYS);
});
test("published 0.2.0 schema bytes remain at their accepted identity",async()=>{
  const {createHash}=await import("node:crypto");
  for(const file of ["collaboration/investment-analysis/state.schema.json","cloudflare/schemas-worker/public/schemas/investment-analysis/0.2.0/state.schema.json"]){
    assert.equal(createHash("sha256").update(await readFile(new URL(file,root))).digest("hex"),"5e755a73ac130b4da393602ad64d9471e7bddf332c8c3429e8a2c1411699f3a3");
  }
});
test("file recovery separates exact decoded text from normalized draft and accepted state", async () => {
  const { createRequire } = await import("node:module");
  const { runInNewContext } = await import("node:vm");
  const C = createRequire(import.meta.url)("../../collaboration/investment-analysis/core.js");
  const source = await readFile(new URL("collaboration/investment-analysis/studio.js", root), "utf8");
  const helpers = source.slice(source.indexOf("  function setRejectedFileText("), source.indexOf("  function exportText("));
  const listenerStart = source.indexOf('  host.addEventListener("change", async event => {');
  const listener = source.slice(listenerStart, source.indexOf('  host.addEventListener("click",', listenerStart));
  assert.ok(helpers.includes("setRejectedFileText(null)"));
  assert.ok(listener.includes("request !== fileRequest || version !== interactionVersion"));
  function fixture() {
    const details = { open: false }, clear = { hidden: true }, attributes = {};
    let value = "";
    const exchange = { id: "analysis-exchange", closest: () => details,
      setAttribute: (key, v) => { attributes[key] = v; },
      removeAttribute: key => { delete attributes[key]; },
      get value() { return value; },
      set value(text) { value = String(text).replace(/\r\n?/g, "\n"); } };
    const context = { C, Object, Set, exchange, clear };
    const api = runInNewContext('(function () {\n' +
      'let interactionVersion = 0, fileRequest = 0, rejectedFileText = null, handler, message;\n' +
      'let accepted = C.prepare(C.defaults()), serialized = accepted.serialized; const drafts = new Set(), EDITORS = [];\n' +
      'const ACTION = { CLEAR_RECOVERY: "clear-recovery" };\n' +
      'const host = { querySelector: selector => selector === "#analysis-exchange" ? exchange : clear,\n' +
      'addEventListener: (name, fn) => { handler = fn; } };\n' +
      'const status = text => { message = text; };\n' +
      'const revisionNeeded = (error, input) => { if (input) { drafts.add(input.id); input.setAttribute("aria-invalid", "true"); } status(error.message); };\n' +
      'const accept = candidate => { accepted = C.prepare(candidate); serialized = accepted.serialized; interactionVersion++; return true; };\n' +
      helpers + listener +
      '\nreturn { change: event => handler(event), importText, clear: clearRejectedFileDraft,\n' +
      'raw: () => rejectedFileText, accepted: () => accepted, message: () => message,\n' +
      'interact: () => { interactionVersion++; } }; })()', context);
    return { api, exchange, details, clear, attributes };
  }
  const gated = C.defaults();
  gated.inputs.label = "Unicode \u03a9 draft";
  gated.inputs.evidenceSource = "https://notion.so/synthetic-rejected-record";
  const technical = C.defaults();
  technical.extensions["urn:example:technical"] = { reference: gated.inputs.evidenceSource };
  for (const [text, rejected] of [
    ['{\r\n  "broken": "\u03a9"\r\n', true],
    [JSON.stringify(gated, null, 2).replace(/\n/g, "\r\n"), true],
    [JSON.stringify(technical, null, 2).replace(/\n/g, "\r\n"), false]
  ]) {
    const f = fixture(), baseline = f.api.accepted();
    const input = { id: "analysis-import", dataset: {}, value: "file",
      files: [{ size: Buffer.byteLength(text), text: async () => text }] };
    await f.api.change({ target: input });
    assert.equal(input.value, "");
    if (rejected) {
      assert.equal(f.api.raw(), text);
      assert.equal(f.exchange.value, text.replace(/\r\n?/g, "\n"));
      assert.equal(f.details.open, true);
      assert.equal(f.clear.hidden, false);
      assert.equal(f.attributes["aria-invalid"], "true");
      assert.equal(f.api.accepted(), baseline);
      assert.ok(!f.api.message().includes(text));
      f.api.importText(C.serialize(C.defaults()));
      assert.equal(f.exchange.value, f.api.accepted().serialized);
      assert.equal(f.api.raw(), null);
      assert.equal(f.clear.hidden, true);
      assert.equal(f.attributes["aria-invalid"], undefined);
      await f.api.change({ target: input });
      f.api.clear();
      assert.equal(f.api.raw(), null);
      assert.equal(f.exchange.value, "");
      assert.equal(f.clear.hidden, true);
    } else {
      assert.equal(f.api.raw(), null);
      assert.deepEqual(f.api.accepted().state.extensions, technical.extensions);
      assert.equal(f.exchange.value, f.api.accepted().serialized);
    }
  }
  const f = fixture(), baseline = f.api.accepted();
  let finish;
  const pending = f.api.change({ target: { id: "analysis-import", dataset: {}, value: "file",
    files: [{ size: 10, text: () => new Promise(resolve => { finish = resolve; }) }] } });
  f.api.interact();
  finish(JSON.stringify(gated));
  await pending;
  assert.equal(f.api.raw(), null);
  assert.equal(f.api.accepted(), baseline);
  assert.match(f.api.message(), /newer interaction/);
});


test("the real calculator receipt forwards its clock and carries heuristic standing",async()=>{
  const {runInNewContext}=await import("node:vm"), {default:C}=await import("../../collaboration/investment-analysis/core.js");
  const html=await readFile(new URL(INVESTMENT_HOSTS[0],root),"utf8");
  const source=html.match(/function leaveBehindSnapshot\(clock\)\{[\s\S]*?(?=\n  function reportTable)/)?.[0];
  assert.ok(source,"source-owned receipt function");
  const snapshot=runInNewContext("("+source+")",{
    InvestmentCore:C,state:{lastCalculation:{},framework:"example",preset:0,lens:"example",roles:[],activities:[],disruptions:[],frameworkStates:{example:[]},quality:[],aiReceivers:[]},
    frameworks:{example:{name:"Example",components:[]}},presets:[{name:"Example"}],lenses:{example:{name:"Example"}},
    window:{investmentAnalysis:{captureReport:()=>({fingerprint:"accepted-example"})}},staffingSnapshot:()=>({}),
    $:()=>({value:"0",textContent:"",checked:false}),money:String,changeComponents:[],qualityConcepts:[],aiContributions:[],document:{querySelectorAll:()=>[]}
  });
  const receipt=snapshot(()=>new Date("2026-10-03T01:02:03.004Z"));
  assert.equal(receipt.generated,"2026-10-03T01:02:03.004Z");assert.deepEqual(receipt.heuristics,C.staffingHeuristics());
  assert.equal(receipt.analysis.fingerprint,"accepted-example");
  assert.match(html,/id="staffing-heuristics"/);assert.match(html,/s\.heuristics\.map/);
});

