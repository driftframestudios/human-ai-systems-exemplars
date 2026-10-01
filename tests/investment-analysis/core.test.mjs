import test from "node:test";
import { Worker } from "node:worker_threads";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import Ajv2020 from "ajv/dist/2020.js";
const require=createRequire(import.meta.url);
const C=require("../../collaboration/investment-analysis/core.js");
const fresh=()=>C.defaults();
test("service-outcome state converts prior exports and preserves calculation meaning", () => {
  const current = fresh();
  const { serviceOutcomes, ...retained } = current;
  const legacy = { ...retained, schemaVersion: "0.1.0", clinical: serviceOutcomes };
  const imported = C.importState(JSON.stringify(legacy));
  assert.deepEqual(imported, current);
  assert.deepEqual(C.calculate(imported), C.calculate(current));
  assert.equal(imported.schemaVersion, "0.2.0");
  assert.equal(Object.hasOwn(imported, "clinical"), false);
  assert.equal(Object.hasOwn(C.schema().properties, "clinical"), false);
  assert.ok(C.DOMAINS.includes("service-operational"));
  assert.ok(C.calculate(imported).records.filter(record => record.formulaVersion).every(record => record.formulaVersion === C.FORMULA_VERSION));
  assert.equal(legacy.schemaVersion, "0.1.0");
  assert.ok(Object.hasOwn(legacy, "clinical"));
  assert.throws(() => C.importState(JSON.stringify({ ...legacy, serviceOutcomes })), /one versioned outcome field/);
});
test("generated closed schema and independent runtime validator accept a material instance",()=>{
  const state=fresh(),ajv=new Ajv2020({strict:true,allErrors:true});
  const validate=ajv.compile(C.schema());
  assert.equal(C.schema().title, "Investment analysis state " + C.VERSION);
  assert.equal(validate(state),true);
  assert.equal(C.validate(state).valid,true);
  state.extra=true;
  assert.equal(C.validate(state).valid,false);
  assert.equal(validate(state),false);
});
test("empty, zero, invalid and finite decimal inputs remain distinct",()=>{
  assert.equal(C.numeric("").status,"unavailable");assert.equal(C.numeric(null).status,"unavailable");
  assert.equal(C.numeric(0).value,0);assert.equal(C.numeric("0").value,0);
  for(const value of ["0x10","Infinity",{},true,Infinity])assert.equal(C.numeric(value).status,"invalid");
  assert.equal(C.numeric(-1,"count",0).status,"invalid");
});
test("cohort and pricing fixtures preserve denominators and precision",()=>{
  const r=C.calculate(fresh()).metrics;
  assert.equal(r.grr.value,.85);assert.equal(r.nrr.value,1.05);assert.equal(r.cac.value,500);
  assert.equal(r.closingCustomers.value,115);assert.equal(r.closingRevenue.value,130000);
  assert.equal(r.netPrice.value,875);assert.equal(r.unitContribution.value,575);
  assert.equal(r.acquisitionRevenueRatio.value,.5);
  assert.equal(r.cacPayback.value,10000/14000);
});
test("bounded partial outputs survive blank denominators and conflicting losses",()=>{
  const s=fresh();s.inputs.newCustomers="";let r=C.calculate(s);
  assert.equal(r.metrics.cac.status,"unavailable");assert.equal(r.metrics.nrr.status,"known");
  s.inputs.newCustomers=0;assert.equal(C.calculate(s).metrics.cac.status,"unavailable");
  s.inputs.churnRevenue=110000;assert.equal(C.calculate(s).metrics.grr.status,"invalid");
  s.inputs.rebate=1001;assert.equal(C.calculate(s).metrics.netPrice.status,"invalid");
});
test("hand-checkable NPV, conventional IRR, payback and guard states",()=>{
  assert.ok(Math.abs(C.npv([-100,60,60],.1).value-4.13223140495867)<1e-10);
  assert.ok(Math.abs(C.irr([-100,110]).value-.1)<1e-10);
  assert.equal(C.irr([100,110]).status,"inapplicable");
  assert.equal(C.irr([-100,230,-132]).status,"ambiguous");
  assert.equal(C.irr([100,-110]).status,"inapplicable");
  assert.equal(C.payback([-100,20,20]).status,"unreached");
  assert.equal(C.payback([-100,60,60]).value,1+40/60);
  assert.equal(C.npv([-100,null,60],.1).status,"unavailable");
  assert.equal(C.npv([-100,60],-1).status,"invalid");
});
test("probabilities retain incomplete, contradictory, and genuine zero states",()=>{
  const s=fresh();assert.equal(C.expectedNpv(s.outcomes,.1,false).status,"unavailable");
  assert.equal(C.expectedNpv(s.outcomes,.1,true).status,"known");
  s.outcomes[0].probability=.1;assert.equal(C.expectedNpv(s.outcomes,.1,true).status,"invalid");assert.equal(s.outcomes[0].probability,.1);
  s.outcomes[0].probability="";assert.equal(C.expectedNpv(s.outcomes,.1,true).status,"unavailable");
  s.outcomes=[{id:"zero",probability:0,flows:[-100,0]},{id:"one",probability:1,flows:[-100,110]}];
  assert.ok(Math.abs(C.expectedNpv(s.outcomes,.1,true).value)<1e-10);
});
test("waiting can help or harm under explicit changed economics",()=>{
  const now=C.npv([-100,60,60],.1).value;
  assert.ok(C.npv([0,-80,120],.1).value>now);
  assert.ok(C.npv([0,-100,80],.1).value<now);
});
test("cost-consequence and review gates preserve serviceOutcomes absence semantics",()=>{
  const s=fresh();let r=C.calculate(s);
  assert.equal(r.metrics.budgetImpact.value,4500);assert.equal(r.metrics.adoptedPopulation.value,30);
  assert.equal(r.metrics.costPerOutcome.status,"unavailable");assert.equal(r.gate,"held-open");
  assert.equal(r.serviceOutcomes.length,9);assert.ok(r.serviceOutcomes.every(x=>x.delta.status==="unavailable"));
  Object.assign(s.inputs,{reviewer:"Synthetic reviewer",evidenceSource:"urn:example:study",asOf:"2026-09-30",economicReview:"reviewed",outcomeUnit:"specified outcome",incrementalOutcome:2});
  assert.equal(C.calculate(s).metrics.costPerOutcome.value,75);
  s.serviceOutcomes[0]={name:"Safety",unit:"events per 100 people",baseline:5,candidate:3,standing:"source-observation",source:"urn:example:study"};
  assert.equal(C.calculate(s).serviceOutcomes[0].delta.value,-2);
  Object.assign(s.inputs,{gate:"satisfied",owner:"Synthetic decision owner",revisit:"2026-10-15"});
  assert.equal(C.calculate(s).gate,"ready-for-human-review");
  s.inputs.capacity=1;assert.equal(C.calculate(s).gate,"held-open");
  s.inputs.gate="stop";assert.equal(C.calculate(s).gate,"stop");
});
test("self-roundtrip, namespaced extensions, deterministic results and detached state",()=>{
  const s=fresh();s.extensions["urn:example:note"]={preserved:true};
  const serialized=C.serialize(s),next=C.importState(serialized);
  assert.deepEqual(next,s);assert.equal(C.serialize(next),serialized);
  assert.deepEqual(C.calculate(next),C.calculate(s));assert.equal(C.fingerprint(next),C.fingerprint(s));
  next.inputs.listPrice=5;assert.equal(s.inputs.listPrice,1000);
  assert.throws(()=>C.importState('{"schemaVersion":"99"}'));
  assert.throws(()=>C.importState('{"__proto__":{}}'));
  assert.throws(()=>C.importState(" ".repeat(1000001)));
});
test("lifecycle graph rejects dangling, repeated and cyclic identity while retaining reactivation",()=>{
  const s=fresh();assert.equal(C.validate(s).valid,true);
  s.events[0].predecessors=["reactivate"];assert.equal(C.validate(s).valid,false);
  s.events[0].predecessors=["missing"];assert.equal(C.validate(s).valid,false);
  s.events[0].predecessors=[];s.events[1].id=s.events[0].id;assert.equal(C.validate(s).valid,false);
});
test("legacy model selection and display-only calculator receipts migrate explicitly",()=>{
  const legacy={schemaVersion:"1.0.0",view:"model-explorer",activeModelId:"model/activity-based.v0.1",scenarioId:"scenario/discovery-alignment.v0.1",selectionReason:"initial"};
  const s=C.importState(JSON.stringify(legacy));assert.equal(s.method,legacy.activeModelId);assert.deepEqual(s.extensions["urn:investment:legacy-selection"].snapshot,legacy);
  const receipt={plan:"Prior plan",roles:[],horizon:{value:"3",unit:"quarters"}};
  const migrated=C.importState(JSON.stringify(receipt));
  assert.equal(migrated.inputs.internalInvestment,null);assert.equal(C.calculate(migrated).metrics.expectedNpv.status,"unavailable");
});
const staffing=()=>({horizon:80,unit:"hours",roles:[{enabled:true,a:2,b:100,c:25}],activities:[{enabled:true,a:2,b:4}],disruptions:[{enabled:true,a:1,b:2}],qualityEnabled:false,qualityAllocation:18,qualityRate:195,sigma:3,unknowns:0,complexity:"bounded",overlap:{activities:1,recovery:1,quality:1}});
test("staffing core is hand-checkable and overlap shares count incremental effort once",()=>{
  const s=staffing(),r=C.staffing(s);assert.equal(r.roleCost,4000);assert.equal(r.activityCost,800);assert.equal(r.disruptionCost,200);assert.equal(r.central,5400);
  s.overlap.activities=0;s.overlap.recovery=0;assert.equal(C.staffing(s).central,4320);
  s.roles[0].b=0;assert.equal(C.staffing(s).roleCost,0);
  s.roles[0].b="";assert.equal(C.staffing(s).status,"unavailable");
});
test("staffing horizon, quality and uncertainty branches preserve source heuristics",()=>{
  const s=staffing();s.horizon=1;s.unit="sprints";assert.equal(C.staffing(s).horizonHours,80);
  s.unit="quarters";assert.equal(C.staffing(s).horizonHours,520);
  s.qualityEnabled=true;s.unknowns=20;s.complexity="frontier";const r=C.staffing(s);
  assert.equal(r.unknownRate,.35);assert.equal(r.complexityRate,.28);assert.equal(r.qualityMultiplier,1.1);
  s.roles=[];assert.equal(C.staffing(s).status,"unavailable");
  s.roles=staffing().roles;s.overlap.quality=2;assert.equal(C.staffing(s).status,"unavailable");
});
test("public model provenance uses semantic keys with no workspace locators",async()=>{
  const html=await readFile(new URL("../../collaboration/cross-functional-investment-model-studio/index.html",import.meta.url),"utf8");
  assert.doesNotMatch(html,/notion\.(?:so|site)|sourceId:\s*"[0-9a-f-]{36}"/i);
  assert.equal((html.match(/sourceId: "urn:source-key:investment-method:/g)||[]).length,8);
});

test("alternatives share a comparison horizon and lifecycle events preserve ordering",()=>{
  const s=fresh();
  assert.equal(C.calculate(s).metrics.logoRetention.value,.9);
  assert.ok(s.alternatives.some(a=>a.id==="proceed"));
  s.alternatives[0].flows.push(0);
  assert.equal(C.calculate(s).alternatives[1].npv.status,"incompatible");
  s.events[1].period=-1;assert.equal(C.validate(s).valid,false);
  s.events[1].period=4;assert.equal(C.validate(s).valid,false);
});

test("the generated schema and material example agree with their source owner", async () => {
  const root = new URL("../../collaboration/investment-analysis/", import.meta.url);
  const schema = JSON.parse(await readFile(new URL("state.schema.json", root), "utf8"));
  const example = JSON.parse(await readFile(new URL("example.json", root), "utf8"));
  assert.deepEqual(schema, C.schema());
  assert.equal(new Ajv2020({ strict: true, allErrors: true }).compile(schema)(example), true);
  assert.equal(C.validate(example).valid, true);
  assert.deepEqual(C.importState(C.serialize(example)), example);
});

test("schema alternatives isolate candidate diagnostics and retain declared field order", () => {
  const state = fresh();
  for (const value of [null, "", 0, "0", "-2.5e3"]) {
    state.inputs.openingRevenue = value;
    assert.equal(C.validate(state).valid, true);
  }
  state.inputs.openingRevenue = true;
  state.inputs.adoption = {};
  assert.deepEqual(C.validate(state).errors, [
    "state.inputs.openingRevenue: supply a finite number or leave it blank.",
    "state.inputs.adoption: supply a finite number or leave it blank."
  ]);
});

test("schema-type dispatch keeps invalid shapes outside dependent domain checks", () => {
  const cases = [
    ["inputs", null, "state.inputs: an object is needed."],
    ["alternatives", {}, "state.alternatives: a list is needed."],
    ["schemaVersion", "future", "state.schemaVersion: unsupported contract version."]
  ];
  for (const [key, value, error] of cases) {
    const state = fresh();
    state[key] = value;
    assert.deepEqual(C.validate(state).errors, [error]);
  }
  const state = fresh();
  state.inputs.exhaustive = "true";
  state.inputs.label = 42;
  state.inputs.period = "week";
  assert.deepEqual(C.validate(state).errors, [
    "state.inputs.label: text is outside this contract.",
    "state.inputs.period: choose a declared value.",
    "state.inputs.exhaustive: boolean needed."
  ]);
});

test("independent domain diagnostics accumulate in stable review order", () => {
  const state = fresh();
  state.alternatives[1].id = state.alternatives[0].id;
  state.outcomes[1].id = state.outcomes[0].id;
  state.serviceOutcomes[1].name = state.serviceOutcomes[0].name;
  state.events[0].predecessors = ["missing"];
  state.events[0].period = -1;
  assert.deepEqual(C.validate(state).errors, [
    "alternatives: distinct nonempty identifiers are needed.",
    "outcomes: distinct nonempty identifiers are needed.",
    "serviceOutcomes: preserve all nine distinct consequence dimensions.",
    "events: each predecessor must name another event.",
    "events: periods use nonnegative finite numbers or an explicit blank."
  ]);
});

test("metric guards preserve input, currency and denominator precedence", () => {
  const state = fresh();
  state.inputs.currency = "";
  state.inputs.acquisitionSpend = "";
  let result = C.calculate(state).metrics.cac;
  assert.equal(result.reason, "Acquisition spend for new customers is needed.");
  assert.equal(result.unit, "currency/customer");
  state.inputs.acquisitionSpend = 100;
  state.inputs.newCustomers = 0;
  result = C.calculate(state).metrics.cac;
  assert.equal(result.reason, "Supply an explicit three-letter currency code.");
  state.inputs.currency = "USD";
  result = C.calculate(state).metrics.cac;
  assert.equal(result.reason, "Supply a positive denominator; explicit zero is retained.");
});

test("serviceOutcomes delta preserves evidence, baseline, candidate and explicit-zero precedence", () => {
  const state = fresh();
  const consequence = state.serviceOutcomes[0];
  Object.assign(consequence, { unit: "events", baseline: "", candidate: "", standing: "source-observation" });
  let delta = C.calculate(state).serviceOutcomes[0].delta;
  assert.match(delta.reason, /appropriately reviewed evidence/);
  consequence.standing = "illustrative";
  delta = C.calculate(state).serviceOutcomes[0].delta;
  assert.equal(delta.reason, "Safety baseline is needed.");
  consequence.baseline = 0;
  delta = C.calculate(state).serviceOutcomes[0].delta;
  assert.equal(delta.reason, "Safety candidate is needed.");
  consequence.candidate = 0;
  assert.deepEqual(C.calculate(state).serviceOutcomes[0].delta, {
    status: "known", value: 0, unit: "events", reason: "illustrative"
  });
});

test("decision gate preserves stop priority and each required review condition", () => {
  const ready = fresh();
  Object.assign(ready.inputs, { gate: "satisfied", owner: "Example owner", revisit: "2026-10-15" });
  assert.equal(C.calculate(ready).gate, "ready-for-human-review");
  for (const [key, value] of [
    ["owner", ""], ["trigger", ""], ["nextEvidence", ""],
    ["revisit", "2026-02-30"], ["capacity", ""], ["capacity", 1], ["gate", "open"]
  ]) {
    const state = C.clone(ready);
    state.inputs[key] = value;
    assert.equal(C.calculate(state).gate, "held-open", key);
    state.inputs.gate = "stop";
    assert.equal(C.calculate(state).gate, "stop", "stop takes precedence over " + key);
  }
});

test("record-domain maps retain their named domains, order and detached calculation", () => {
  const state = fresh();
  const before = C.serialize(state);
  const result = C.calculate(state);
  const domainOf = id => result.records.find(record => record.id === id).domain;
  for (const [id, domain] of [
    ["input/label", "internal-investment"],
    ["input/listPrice", "customer-implementation"],
    ["input/openingCustomers", "commercial-cohort"],
    ["input/eligiblePopulation", "service-operational"],
    ["input/discountRate", "capital-allocation"],
    ["calculation/grr", "commercial-cohort"],
    ["calculation/netPrice", "customer-implementation"],
    ["calculation/budgetImpact", "service-operational"],
    ["calculation/expectedNpv", "capital-allocation"]
  ]) assert.equal(domainOf(id), domain, id);
  assert.deepEqual(result.records.slice(0, Object.keys(C.FIELDS).length).map(record => record.id),
    Object.keys(C.FIELDS).map(key => "input/" + key));
  assert.equal(C.serialize(state), before);
  result.events[0].kind = "changed result";
  assert.equal(state.events[0].kind, "acquisition");
});

test("stable vocabulary is frozen while scenario values remain editable", () => {
  for (const value of [C.FIELD_TYPE, C.JSON_LIMITS, C.DOMAINS, C.TYPES, C.FIELDS, C.OUTCOMES, C.FIELDS.period, C.FIELDS.period.options]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.throws(() => { C.FIELDS.currency.initial = "EUR"; }, TypeError);
  const state = fresh();
  state.inputs.currency = "EUR";
  assert.equal(C.calculate(state).metrics.netPrice.status, "known");
  assert.equal(C.STAFFING_CURRENCY, "USD");
  assert.equal(C.staffing(staffing()).currency, "USD");
});

test("whole-state admission retains only JSON values that survive export and import", () => {
  const invalid = [
    undefined, NaN, Infinity, -Infinity, 1n, Symbol("value"), () => 1,
    new Date("2026-09-30"), new Map(), new Set(), /value/,
    JSON.parse('{"constructor":"retained text"}'),
    JSON.parse('{"__proto__":{"value":1}}'), { prototype: "reserved" },
    Object.assign([1, 2], { extra: true }), [1, , 3]
  ];
  const cyclic = {}; cyclic.self = cyclic; invalid.push(cyclic);
  const hidden = {}; Object.defineProperty(hidden, "hidden", { value: 1 }); invalid.push(hidden);
  const symbolic = { [Symbol("key")]: 1 }; invalid.push(symbolic);
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "value", { enumerable: true, get() { getterCalls++; return 1; } });
  invalid.push(accessor);
  for (const value of invalid) {
    const state = fresh();
    state.extensions["urn:example:payload"] = value;
    assert.equal(C.validate(state).valid, false);
    assert.throws(() => C.serialize(state));
    assert.throws(() => C.clone(state));
  }
  assert.equal(getterCalls, 0, "admission inspects descriptors before reading values");
  const state = fresh();
  state.extensions["urn:example:payload"] = { values: [null, false, 0, "", { text: "\u00e9" }] };
  assert.deepEqual(C.importState(C.serialize(state)), state);
});

test("reserved keys and limits use one admission policy before migration or normalization", () => {
  for (const key of ["constructor", "prototype", "__proto__"]) {
    const state = fresh();
    state.extensions["urn:example:payload"] = JSON.parse('{"' + key + '":"retained text"}');
    assert.throws(() => C.importState(JSON.stringify(state)), /reserved object keys/);
  }
  const legacy = { schemaVersion: "1.0.0", view: "model-explorer", activeModelId: fresh().method, payload: Infinity };
  assert.throws(() => C.migrate(legacy), /finite numbers/);
  const state = fresh();
  state.extensions["urn:example:payload"] = "\u00e9".repeat(500000);
  assert.throws(() => C.serialize(state), /UTF-8/);
  assert.throws(() => C.importState(JSON.stringify(state)), /UTF-8/);
  let nested = null;
  for (let depth = 0; depth < 70; depth++) nested = [nested];
  state.extensions["urn:example:payload"] = nested;
  assert.throws(() => C.serialize(state), /depth and node limits/);
  state.extensions["urn:example:payload"] = Array(100001).fill(0);
  assert.throws(() => C.serialize(state), /dense JSON array|node limits/);
});

test("sparse state arrays are rejected while a missing standalone flow remains unavailable", () => {
  const state = fresh();
  delete state.alternatives[0].flows[1];
  assert.equal(C.validate(state).valid, false);
  assert.equal(C.calculate(state).valid, false);
  assert.equal(C.npv([-100, , 60], .1).status, "unavailable");
});

test("NPV, expected NPV and sensitivity share currency, horizon and unit policy", () => {
  for (const currency of ["", "usd", "US"]) {
    const state = fresh();
    state.inputs.currency = currency;
    const result = C.calculate(state);
    const monetary = [result.metrics.expectedNpv, ...result.alternatives.map(a => a.npv), ...result.sensitivity.flatMap(a => a.values.map(v => v.result))];
    for (const value of monetary) {
      assert.equal(value.status, "unavailable");
      assert.equal(value.unit, "currency");
    }
    assert.equal(result.metrics.nrr.status, "known");
    assert.equal(result.alternatives[2].irr.status, "known");
  }
  const state = fresh();
  state.inputs.discountRate = "";
  assert.ok(C.calculate(state).sensitivity.every(a => a.values.every(v => v.result.status === "unavailable" && v.result.unit === "currency")));
  state.inputs.discountRate = .1;
  state.alternatives[0].flows.push(0);
  assert.ok(C.calculate(state).sensitivity.every(a => a.values.every(v => v.result.status === "incompatible")));
});

test("valid extension variants retain deterministic serialization and exact ordinary JSON values", () => {
  const variants = [null, false, 0, "", [], {}, { nested: [1, "1", true, null] }];
  for (const payload of variants) {
    const state = fresh();
    state.extensions["urn:example:payload"] = payload;
    const serialized = C.serialize(state);
    const next = C.importState(serialized);
    assert.deepEqual(next, state);
    assert.equal(C.serialize(next), serialized);
    assert.deepEqual(C.calculate(next), C.calculate(state));
  }
});


test("decimal admission shares a bounded grammar with the generated schema", () => {
  const accepts = new Ajv2020({ strict: true, allErrors: true }).compile(C.schema());
  for (const value of ["", " ", "0", "-0", ".5", "1.", "+2.5e-3", " 42 "]) {
    const state = fresh(); state.inputs.newCustomers = value;
    assert.equal(C.validate(state).valid, true, JSON.stringify(value));
    assert.equal(accepts(state), true, JSON.stringify(value));
    assert.equal(C.numeric(value).status, value.trim() ? "known" : "unavailable");
  }
  for (const value of ["1x", "0x10", ".", "1e", "9".repeat(C.NUMERIC_TEXT_LIMIT + 1)]) {
    const state = fresh(); state.inputs.newCustomers = value;
    assert.equal(C.validate(state).valid, false);
    assert.equal(accepts(state), false);
    assert.equal(C.numeric(value).status, "invalid");
  }
});

test("closed objects reject inherited-name keys while open extension values retain them", () => {
  const accepts = new Ajv2020({ strict: true, allErrors: true }).compile(C.schema());
  for (const key of ["toString", "valueOf", "hasOwnProperty", "__defineGetter__"]) {
    for (const location of ["root", "inputs", "alternative"]) {
      const state = fresh();
      const target = location === "root" ? state : location === "inputs" ? state.inputs : state.alternatives[0];
      target[key] = "extra";
      assert.equal(C.validate(state).valid, false, location + "." + key);
      assert.equal(accepts(state), false, location + "." + key);
    }
  }
  const state = fresh(); state.extensions["urn:test:metadata"] = { toString: "ordinary data" };
  assert.equal(C.validate(state).valid, true);
  assert.deepEqual(C.importState(C.serialize(state)), state);
});

test("prepared revisions are immutable and ordinary calculation results own their nested arrays", () => {
  const state = fresh(), original = C.clone(state), result = C.calculate(state);
  result.alternatives[0].flows[0] = 777;
  result.events[0].predecessors.push("caller-owned-change");
  assert.deepEqual(state, original);
  const prepared = C.prepare(state);
  assert.deepEqual(prepared.result, C.calculate(state));
  assert.deepEqual(JSON.parse(prepared.serialized), state);
  assert.equal(prepared.fingerprint, C.fingerprint(state));
  assert.equal(Object.isFrozen(prepared.state.inputs), true);
  assert.equal(Object.isFrozen(prepared.result.alternatives[0].flows), true);
  assert.throws(() => { prepared.state.inputs.label = "changed"; }, TypeError);
  assert.deepEqual(state, original);
  const publicSchema = C.schema();
  publicSchema.properties.inputs.additionalProperties = true;
  state.inputs.toString = "extra";
  assert.equal(C.validate(state).valid, false);
});

test("numeric near misses stay within an isolated acceptance budget", { timeout: 10000 }, async () => {
  const worker = new Worker(`
    const { parentPort, workerData } = require("node:worker_threads");
    const C = require(workerData.core);
    const Ajv = require(workerData.ajv).default;
    const accepts = new Ajv({strict:true,allErrors:true}).compile(C.schema());
    const observations = [];
    for (const size of [1000, 10000, 100000, 900000]) {
      const text = "9".repeat(size) + "x", state = C.defaults();
      state.inputs.newCustomers = text;
      observations.push({ size, numeric: C.numeric(text).status, runtime: C.validate(state).valid, schema: accepts(state) });
    }
    parentPort.postMessage(observations);
  `, { eval: true, workerData: { core: require.resolve("../../collaboration/investment-analysis/core.js"), ajv: require.resolve("ajv/dist/2020.js") } });
  let timer;
  try {
    const observations = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Numeric admission exceeded its isolated 5-second budget.")), 5000);
      worker.once("message", resolve); worker.once("error", reject);
      worker.once("exit", code => { if (code !== 0) reject(new Error("Numeric worker exited: " + code)); });
    });
    assert.deepEqual(observations, [1000, 10000, 100000, 900000].map(size => ({ size, numeric: "invalid", runtime: false, schema: false })));
  } finally { clearTimeout(timer); await worker.terminate(); }
});
