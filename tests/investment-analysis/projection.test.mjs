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
for(const kind of ["malformed","gated","technical-extension"]){
  test("source-owned file admission retains the correct local recovery for "+kind,async()=>{
    const {runInNewContext}=await import("node:vm"),{default:C}=await import("../../collaboration/investment-analysis/core.js");
    const ui=await readFile(new URL("collaboration/investment-analysis/studio.js",root),"utf8");
    const start=ui.indexOf('  host.addEventListener("change", async event => {');
    const end=ui.indexOf('  host.addEventListener("click", event => {',start);
    assert.ok(start>=0&&end>start);
    const next=C.defaults(),coordinate="https://"+"notion.so/"+"a".repeat(32);
    if(kind==="gated")next.inputs.evidenceSource=coordinate;
    if(kind==="technical-extension")next.extensions["urn:example:technical"]={source:coordinate};
    const text=kind==="malformed"?' { "original":\r\n':JSON.stringify(next,null,2);
    const details={open:false},exchange={id:"analysis-exchange",value:"previous local draft",closest:()=>details};
    let handler,accepted=C.prepare(C.defaults()),errorInput;const before=accepted;
    const host={addEventListener:(name,callback)=>{assert.equal(name,"change");handler=callback;},querySelector:()=>exchange};
    runInNewContext(ui.slice(start,end),{host,C,fileRequest:0,interactionVersion:0,editInput:()=>{},status:()=>{},
      importText:value=>{accepted=C.prepare(C.importState(value));},revisionNeeded:(error,input)=>{errorInput=input;}});
    const input={dataset:{},id:"analysis-import",files:[{size:Buffer.byteLength(text),text:async()=>text}],value:"selected-file"};
    await handler({target:input});assert.equal(input.value,"");
    if(kind==="technical-extension"){
      assert.deepEqual(accepted.state,next);assert.equal(exchange.value,"previous local draft");assert.equal(errorInput,undefined);
    }else{
      assert.equal(accepted,before);assert.equal(exchange.value,text);assert.equal(details.open,true);assert.equal(errorInput,exchange);
    }
  });
}
