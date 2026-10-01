/* Shared investment calculation and exchange owner. Uses browser and Node built-ins. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.InvestmentCore = api;
})(globalThis, function () {
  "use strict";
  const VERSION = "0.1.0";
  const FIELD_TYPE = Object.freeze({ NUMBER: "number", TEXT: "text", CURRENCY: "currency", SELECT: "select", BOOLEAN: "boolean" });
  const STAFFING_CURRENCY = "USD";
  const CURRENCY_CODE = /^[A-Z]{3}$/;
  const JSON_LIMITS = Object.freeze({ bytes: 1000000, depth: 64, nodes: 100000 });
  const NUMERIC_TEXT_LIMIT = 128;
  const DECIMAL_BODY = "[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?";
  const NUMBER_TEXT_PATTERN = "^(?:\\s*" + DECIMAL_BODY + "\\s*|\\s*)$";
  const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  const STAFFING_HOURS = Object.freeze({ hours: 1, sprints: 80, quarters: 520 });
  const COMPLEXITY_RATES = Object.freeze({ bounded: .08, connected: .16, frontier: .28 });
  const DOMAINS = Object.freeze(["internal-investment", "customer-implementation", "commercial-cohort", "clinical-operational", "capital-allocation"]);
  const TYPES = Object.freeze(["input", "assumption", "calculation", "evidence", "decision"]);
  const PERIODS = Object.freeze(["month", "quarter", "year"]);
  const FIELDS = {};
  function field(key, label, group, unit, initial, options = {}) {
    FIELDS[key] = { label, group, unit, initial, type: FIELD_TYPE.NUMBER, min: 0, ...options };
  }
  field("label", "Scenario name", "orientation", "text", "Illustrative pilot versus status quo", {type:FIELD_TYPE.TEXT});
  field("currency", "Currency (ISO 4217 code)", "orientation", "text", STAFFING_CURRENCY, {type:FIELD_TYPE.CURRENCY});
  field("period", "Cash-flow and commercial period", "orientation", "period", "year", {type:FIELD_TYPE.SELECT, options:PERIODS});
  field("segment", "Customer segment", "commercial", "text", "Synthetic implementation partners", {type:FIELD_TYPE.TEXT});
  field("cohort", "Opening cohort and measurement window", "commercial", "text", "100 synthetic customers; one year", {type:FIELD_TYPE.TEXT});
  field("tenure", "Cohort tenure (periods)", "commercial", "period", 1);
  field("implementationState", "Implementation standing", "commercial", "text", "Illustrative ramp; one-period lag", {type:FIELD_TYPE.TEXT});
  field("openingCustomers", "Opening customers", "commercial", "customer", 100);
  field("newCustomers", "New customers", "commercial", "customer", 20);
  field("churnCustomers", "Opening-cohort customers lost", "commercial", "customer", 10);
  field("reactivatedCustomers", "Reactivated customers outside opening cohort", "commercial", "customer", 5);
  field("openingRevenue", "Opening-cohort recurring revenue", "commercial", "currency/period", 100000);
  field("churnRevenue", "Revenue lost from opening cohort", "commercial", "currency/period", 10000);
  field("contraction", "Opening-cohort contraction", "commercial", "currency/period", 5000);
  field("expansion", "Opening-cohort expansion", "commercial", "currency/period", 20000);
  field("newRevenue", "New-customer recurring revenue", "commercial", "currency/period", 20000);
  field("reactivationRevenue", "Reactivation revenue outside opening cohort", "commercial", "currency/period", 5000);
  field("acquisitionSpend", "Acquisition spend for new customers", "commercial", "currency", 10000);
  field("contributionMargin", "New-customer contribution margin (0-1)", "commercial", "ratio", .7, {max:1});
  field("listPrice", "List price per orderable unit", "pricing", "currency/unit", 1000);
  field("discount", "Discount fraction (0-1)", "pricing", "ratio", .1, {max:1});
  field("rebate", "Rebate per unit", "pricing", "currency/unit", 25);
  field("variableCost", "Variable cost per unit", "pricing", "currency/unit", 200);
  field("serviceCost", "Service cost per unit", "pricing", "currency/unit", 100);
  field("pricingUnit", "Orderable unit and package boundary", "pricing", "text", "One synthetic service unit; implementation separate", {type:FIELD_TYPE.TEXT});
  field("buyer", "Buyer / user / payer", "pricing", "text", "Sponsor / operating team / customer organization", {type:FIELD_TYPE.TEXT});
  field("priceClass", "Price evidence class", "pricing", "text", "Illustrative scenario", {type:FIELD_TYPE.SELECT,options:["Illustrative scenario","Public cash-pay price","Contracted price","Observed realized revenue"]});
  field("implementationCost", "Customer implementation cost", "pricing", "currency", 10000);
  field("implementationLag", "Implementation lag (periods)", "pricing", "period", 1);
  field("internalInvestment", "Internal investment reference", "capital", "currency", 100000);
  field("discountRate", "Effective discount rate per period", "capital", "ratio", .1, {min:-.999999});
  field("cashConvention", "Cash-flow convention", "capital", "text", "Incremental to status quo; end-period; t=0 upfront", {type:FIELD_TYPE.TEXT});
  field("taxWorkingCapital", "Tax and working-capital treatment", "capital", "text", "Synthetic after-tax flows; working-capital changes included once", {type:FIELD_TYPE.TEXT});
  field("capacity", "Implementation capacity (adopted people per period)", "capital", "person/period", 40);
  field("exhaustive", "Outcome tree is mutually exclusive and exhaustive", "capital", "boolean", false, {type:FIELD_TYPE.BOOLEAN});
  field("eligiblePopulation", "Eligible population", "clinical", "person", 100);
  field("adoption", "Adoption fraction (0-1)", "clinical", "ratio", .3, {max:1});
  field("baselineCost", "Baseline resource cost per person per period", "clinical", "currency/person/period", 500);
  field("candidateCost", "Candidate resource cost per person per period", "clinical", "currency/person/period", 650);
  field("perspective", "Budget perspective", "clinical", "text", "Illustrative provider budget", {type:FIELD_TYPE.TEXT});
  field("population", "Population and context", "clinical", "text", "Synthetic population; local eligibility remains to be specified", {type:FIELD_TYPE.TEXT});
  field("intervention", "Intervention", "clinical", "text", "Bounded workflow pilot", {type:FIELD_TYPE.TEXT});
  field("comparator", "Comparator", "clinical", "text", "Current workflow", {type:FIELD_TYPE.TEXT});
  field("reviewer", "Accountable clinical / operating reviewer", "clinical", "text", "", {type:FIELD_TYPE.TEXT});
  field("evidenceSource", "Evidence semantic key or public source", "clinical", "text", "", {type:FIELD_TYPE.TEXT});
  field("asOf", "Evidence as-of date", "clinical", "date", "", {type:FIELD_TYPE.TEXT});
  field("economicReview", "Outcome transformation review", "clinical", "text", "pending", {type:FIELD_TYPE.SELECT,options:["pending","reviewed"]});
  field("incrementalOutcome", "Reviewed incremental outcome per adopted person", "clinical", "outcome/person", null, {min:null});
  field("outcomeUnit", "Outcome unit (explicit measure)", "clinical", "text", "", {type:FIELD_TYPE.TEXT});
  field("owner", "Decision owner", "decision", "text", "", {type:FIELD_TYPE.TEXT});
  field("trigger", "Gate trigger", "decision", "text", "Review pilot feasibility, evidence, and capacity", {type:FIELD_TYPE.TEXT});
  field("nextEvidence", "Next evidence needed", "decision", "text", "Observed workflow and reviewed resource requirements", {type:FIELD_TYPE.TEXT});
  field("revisit", "Revisit date", "decision", "date", "", {type:FIELD_TYPE.TEXT});
  field("option", "Reversible next choice", "decision", "text", "pilot", {type:FIELD_TYPE.SELECT,options:["status-quo","proceed","defer","pilot","scale","redirect","stop"]});
  field("gate", "Safety / governance gate", "decision", "text", "open", {type:FIELD_TYPE.SELECT,options:["open","satisfied","stop"]});
  const OUTCOMES = Object.freeze(["Safety","Quality","Timeliness","Patient experience","Equity","Efficiency","Burden","Governance","Budget capacity"]);
  for (const definition of Object.values(FIELDS)) {
    if (definition.options) Object.freeze(definition.options);
    Object.freeze(definition);
  }
  Object.freeze(FIELDS);

  // Admission precedes schema traversal and cloning, so serialization preserves every JSON value.
  function jsonText(value) {
    const ancestors = new Set();
    let nodes = 0;
    let textUnits = 0;
    function accountText(text) {
      textUnits += text.length;
      if (textUnits > JSON_LIMITS.bytes) throw new Error("Use a JSON state of at most 1 MB in UTF-8.");
    }
    function visit(item, path, depth) {
      if (++nodes > JSON_LIMITS.nodes || depth > JSON_LIMITS.depth) {
        throw new Error(path + ": use a JSON tree within the declared depth and node limits.");
      }
      if (typeof item === "string") { accountText(item); return; }
      if (item === null || typeof item === "boolean") return;
      if (typeof item === "number" && Number.isFinite(item)) return;
      if (typeof item !== "object") {
        throw new Error(path + ": use finite numbers and ordinary JSON values.");
      }
      const array = Array.isArray(item);
      const prototype = Object.getPrototypeOf(item);
      if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
        throw new Error(path + ": use plain JSON objects and arrays.");
      }
      if (ancestors.has(item)) throw new Error(path + ": represent each branch as an acyclic JSON value.");
      const keys = Reflect.ownKeys(item);
      if (array && (item.length > JSON_LIMITS.nodes || keys.length !== item.length + 1)) {
        throw new Error(path + ": use a dense JSON array with one value per position.");
      }
      ancestors.add(item);
      for (const key of keys) {
        if (array && key === "length") continue;
        if (typeof key !== "string" || RESERVED_KEYS.has(key)) {
          throw new Error(path + ": use ordinary JSON property names; reserved object keys belong outside this contract.");
        }
        if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= item.length)) {
          throw new Error(path + ": keep array values at consecutive numeric positions.");
        }
        accountText(key);
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
          throw new Error(path + ": use enumerable data properties for portable JSON.");
        }
        visit(descriptor.value, path + "." + key, depth + 1);
      }
      ancestors.delete(item);
    }
    visit(value, "state", 0);
    const text = stable(value);
    if (text.length > JSON_LIMITS.bytes || new TextEncoder().encode(text).byteLength > JSON_LIMITS.bytes) {
      throw new Error("Use a JSON state of at most 1 MB in UTF-8.");
    }
    return text;
  }
  function clone(value) { return JSON.parse(jsonText(value)); }
  function parseJson(text) {
    if (typeof text !== "string" || text.length > JSON_LIMITS.bytes || new TextEncoder().encode(text).byteLength > JSON_LIMITS.bytes) {
      throw new Error("Use JSON text of at most 1 MB in UTF-8.");
    }
    const value = JSON.parse(text);
    jsonText(value);
    return value;
  }
  const cleanText = value => typeof value === "string" && value.trim().length > 0;
  function validDate(value) { if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+"T00:00:00Z");return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value; }
  const decimal = new RegExp("^" + DECIMAL_BODY + "$");
  function known(value, unit, reason = "") {
    return Number.isFinite(value) ? {status:"known",value,unit,reason} : unavailable("The result exceeds the supported numeric range.",unit,"invalid");
  }
  function unavailable(reason, unit = "", status = "unavailable") { return {status,value:null,unit,reason}; }
  function numeric(value, label = "Input", min = null, max = null) {
    if (typeof value === "string" && value.length > NUMERIC_TEXT_LIMIT) return unavailable(label + " uses at most " + NUMERIC_TEXT_LIMIT + " characters; use scientific notation for scale.", "", "invalid");
    if (value === "" || value === null || value === undefined || (typeof value === "string" && !value.trim())) return unavailable(label + " is needed.");
    if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !decimal.test(value.trim()))) return unavailable(label + " needs a finite decimal number.", "", "invalid");
    const n = Number(value);
    if (!Number.isFinite(n) || (min !== null && n < min) || (max !== null && n > max)) return unavailable(label + " is outside its declared range.", "", "invalid");
    return known(n, "");
  }
  function defaults() {
    return {
      schemaVersion:VERSION, scenarioId:"scenario/investment-pilot.v0.1", method:"model/activity-based.v0.1",
      origin:"illustrative", inputs:Object.fromEntries(Object.entries(FIELDS).map(([k,v])=>[k,v.initial])),
      alternatives:[
        {id:"status-quo",label:"Status quo",flows:[0,0,0],standing:"illustrative"},
        {id:"proceed",label:"Proceed",flows:[-120000,70000,75000],standing:"illustrative"},
        {id:"pilot",label:"Pilot",flows:[-100000,60000,60000],standing:"illustrative"},
        {id:"defer",label:"Defer",flows:[0,-90000,80000],standing:"illustrative"},
        {id:"scale",label:"Scale",flows:[-180000,100000,120000],standing:"illustrative"},
        {id:"redirect",label:"Redirect",flows:[-40000,20000,30000],standing:"illustrative"},
        {id:"stop",label:"Stop",flows:[-5000,0,0],standing:"illustrative"}
      ],
      outcomes:[
        {id:"constrained",probability:.3,flows:[-100000,30000,30000]},
        {id:"planned",probability:.5,flows:[-100000,60000,60000]},
        {id:"expanded",probability:.2,flows:[-100000,90000,90000]}
      ],
      clinical:OUTCOMES.map(name=>({name,unit:"",baseline:null,candidate:null,standing:"unavailable",source:""})),
      events:[
        {id:"acquire",kind:"acquisition",period:0,predecessors:[],standing:"illustrative"},
        {id:"onboard",kind:"onboarding",period:1,predecessors:["acquire"],standing:"illustrative"},
        {id:"activate",kind:"activation",period:1,predecessors:["onboard"],standing:"illustrative"},
        {id:"renew",kind:"renewal",period:2,predecessors:["activate"],standing:"illustrative"},
        {id:"churn",kind:"churn",period:2,predecessors:["activate"],standing:"illustrative"},
        {id:"reactivate",kind:"reactivation",period:3,predecessors:["churn"],standing:"illustrative"}
      ],
      extensions:{}
    };
  }
  function buildSchema() {
    const numberInput={anyOf:[{type:FIELD_TYPE.NUMBER},{type:"null"},{type:"string",maxLength:NUMERIC_TEXT_LIMIT,pattern:NUMBER_TEXT_PATTERN}]};
    const text={type:"string",maxLength:2000};
    const object=(properties,required=Object.keys(properties))=>({type:"object",additionalProperties:false,properties,required});
    const flows={type:"array",minItems:2,maxItems:101,items:numberInput};
    return {
      $schema:"https://json-schema.org/draft/2020-12/schema",
      $id:"https://schemas.vik.guru/investment-analysis/0.1.0/state.schema.json",
      title:"Investment analysis state 0.1.0",
      description:"Validation-input projection generated by core.js; local source contract, public retrieval pending publication.",
      ...object({
        schemaVersion:{const:VERSION},scenarioId:{type:"string",minLength:1,maxLength:200},method:text,
        origin:{enum:["illustrative","user-supplied","observed"]},
        inputs:object(Object.fromEntries(Object.entries(FIELDS).map(([k,f])=>[k,f.type===FIELD_TYPE.NUMBER?numberInput:f.type===FIELD_TYPE.BOOLEAN?{type:FIELD_TYPE.BOOLEAN}:f.type===FIELD_TYPE.SELECT?{enum:f.options}:text]))),
        alternatives:{type:"array",minItems:1,maxItems:12,items:object({id:text,label:text,flows,standing:{enum:["illustrative","user-supplied","observed"]}})},
        outcomes:{type:"array",minItems:1,maxItems:12,items:object({id:text,probability:numberInput,flows})},
        clinical:{type:"array",minItems:9,maxItems:9,items:object({name:{enum:OUTCOMES},unit:text,baseline:numberInput,candidate:numberInput,standing:{enum:["unavailable","illustrative","source-observation","transfer-hypothesis","locally-verified"]},source:text})},
        events:{type:"array",maxItems:100,items:object({id:text,kind:text,period:numberInput,predecessors:{type:"array",maxItems:100,items:text},standing:text})},
        extensions:{type:"object",propertyNames:{pattern:"^urn:[a-zA-Z0-9][a-zA-Z0-9:._/-]*$"},additionalProperties:true}
      })
    };
  }
  // The immutable source schema owns this finite pattern set; imported state supplies values only.
  const STATE_SCHEMA = freezeTree(buildSchema());
  const SCHEMA_PATTERNS = compileSchemaPatterns(STATE_SCHEMA);
  function freezeTree(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freezeTree(child);
      Object.freeze(value);
    }
    return value;
  }
  function compileSchemaPatterns(shape) {
    const patterns = new Map();
    function visit(value) {
      if (!value || typeof value !== "object") return;
      if (Object.hasOwn(value, "pattern") && !patterns.has(value.pattern)) patterns.set(value.pattern, new RegExp(value.pattern));
      for (const child of Object.values(value)) visit(child);
    }
    visit(shape);
    return patterns;
  }
  function schema() { return JSON.parse(JSON.stringify(STATE_SCHEMA)); }

  function* validateSchemaValue(value, shape, path) {
    if (shape.anyOf) {
      if (!shape.anyOf.some(candidate => validateSchemaValue(value, candidate, path).next().done)) yield path + ": supply a finite number or leave it blank.";
      return;
    }
    if (Object.hasOwn(shape, "const") && value !== shape.const) yield path + ": unsupported contract version.";
    if (shape.enum && !shape.enum.includes(value)) yield path + ": choose a declared value.";
    switch (shape.type) {
      case "object": yield* validateObject(value, shape, path); return;
      case "array": yield* validateArray(value, shape, path); return;
      case "number": if (typeof value !== "number" || !Number.isFinite(value)) yield path + ": finite number needed."; return;
      case "null": if (value !== null) yield path + ": null needed."; return;
      case "boolean": if (typeof value !== "boolean") yield path + ": boolean needed."; return;
      case "string": {
        const error = validateString(value, shape, path);
        if (error) yield error;
      }
    }
  }

  function* validateObject(value, shape, path) {
    if (!value || typeof value !== "object" || Array.isArray(value)) { yield path + ": an object is needed."; return; }
    for (const key of shape.required || []) {
      if (!Object.hasOwn(value, key)) yield path + "." + key + ": required field.";
    }
    for (const key of Object.keys(value)) {
      if (shape.propertyNames && !SCHEMA_PATTERNS.get(shape.propertyNames.pattern).test(key)) yield path + ": use a namespaced extension.";
      if (shape.properties && Object.hasOwn(shape.properties, key)) {
        yield* validateSchemaValue(value[key], shape.properties[key], path + "." + key);
      } else if (shape.additionalProperties === false) {
        yield path + "." + key + ": field belongs to a different contract.";
      }
    }
  }

  function* validateArray(value, shape, path) {
    if (!Array.isArray(value)) { yield path + ": a list is needed."; return; }
    if (value.length < (shape.minItems ?? 0) || value.length > (shape.maxItems ?? Infinity)) yield path + ": list length is outside this contract.";
    for (const [index, item] of value.entries()) yield* validateSchemaValue(item, shape.items, path + "[" + index + "]");
  }

  function validateString(value, shape, path) {
    const valid = typeof value === "string"
      && value.length <= (shape.maxLength ?? Infinity)
      && value.length >= (shape.minLength ?? 0)
      && (!shape.pattern || SCHEMA_PATTERNS.get(shape.pattern).test(value));
    return valid ? null : path + ": text is outside this contract.";
  }

  function validateIdentifiers(name, list) {
    const ids = list.map(item => item.id);
    return ids.some(id => !cleanText(id)) || new Set(ids).size !== ids.length
      ? name + ": distinct nonempty identifiers are needed." : null;
  }

  function hasEventCycle(events, byId) {
    const visited = new Set();
    const active = new Set();

    function visit(id) {
      if (active.has(id)) return true;
      if (visited.has(id)) return false;

      active.add(id);
      for (const predecessor of byId.get(id)?.predecessors || []) {
        if (visit(predecessor)) return true;
      }
      active.delete(id);
      visited.add(id);
      return false;
    }

    return events.some(event => visit(event.id));
  }

  function* validateEvents(events) {
    const eventIds = new Set(events.map(event => event.id));
    for (const event of events) {
      if (event.predecessors.some(id => !eventIds.has(id) || id === event.id)) {
        yield "events: each predecessor must name another event.";
      }
    }

    const byId = new Map(events.map(event => [event.id, event]));
    for (const event of events) {
      const time = numeric(event.period, "Event period", 0);
      if (time.status === "invalid") {
        yield "events: periods use nonnegative finite numbers or an explicit blank.";
      }
      for (const id of event.predecessors) {
        const prior = numeric(byId.get(id)?.period, "Predecessor period", 0);
        if (time.status === "known" && prior.status === "known" && prior.value > time.value) {
          yield "events: predecessor occurrences belong at or before the receiving event.";
        }
      }
    }

    if (hasEventCycle(events, byId)) {
      yield "events: use distinct event occurrences to represent repeated lifecycle stages.";
    }
  }

  function validateContract(state) {
    const errors = [...validateSchemaValue(state, STATE_SCHEMA, "state")];
    if (errors.length) return { valid: false, errors };
    const identityErrors = ["alternatives", "outcomes", "events"].map(name => validateIdentifiers(name, state[name])).filter(Boolean);
    const clinicalErrors = new Set(state.clinical.map(item => item.name)).size === OUTCOMES.length
      ? [] : ["clinical: preserve all nine distinct consequence dimensions."];
    const diagnostics = [...identityErrors, ...clinicalErrors, ...validateEvents(state.events)];
    return { valid: diagnostics.length === 0, errors: diagnostics };
  }
  function validate(state) {
    try { jsonText(state); }
    catch (error) { return { valid: false, errors: [error.message] }; }
    return validateContract(state);
  }
  function stable(value) {
    if(Array.isArray(value))return "["+value.map(stable).join(",")+"]";
    if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stable(value[k])).join(",")+"}";
    return JSON.stringify(value);
  }
  function fingerprintText(text) {
    let hash=2166136261;for(const char of text){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
    return "fnv1a32:"+ (hash>>>0).toString(16).padStart(8,"0");
  }
  function fingerprint(state) { return fingerprintText(stable(state)); }
  function parseFlows(flows) {
    if(!Array.isArray(flows)||flows.length<2)return unavailable("Supply t=0 and at least one later cash flow.");
    const parsed=Array.from(flows,(v,i)=>numeric(v,"Cash flow at t="+i));
    const bad=parsed.find(x=>x.status!=="known");
    return bad||{status:"known",value:parsed.map(x=>x.value)};
  }
  function npv(flows, rate) {
    const f=parseFlows(flows),r=numeric(rate,"Discount rate",-.999999);
    if(f.status!=="known")return f;if(r.status!=="known")return r;
    return known(npvValues(f.value,r.value),"currency");
  }
  function npvValues(flows, rate) { return flows.reduce((sum, value, period) => sum + value / Math.pow(1 + rate, period), 0); }
  function irr(flows) {
    const f=parseFlows(flows);if(f.status!=="known")return f;
    const xs=f.value,signs=xs.filter(x=>x!==0).map(Math.sign);
    const changes=signs.slice(1).reduce((n,x,i)=>n+(x!==signs[i]?1:0),0);
    if(changes===0)return unavailable("IRR requires at least one cash-flow sign change.","ratio","inapplicable");
    if(changes>1)return unavailable("Multiple-solution or non-conventional cash flows: use NPV.","ratio","ambiguous");
    if(xs[0]>=0||xs.slice(1).some(x=>x<0))return unavailable("IRR is restricted to an initial investment followed by nonnegative flows.","ratio","inapplicable");
    let lo=-.9999,hi=100;
    const a=npvValues(xs,lo),b=npvValues(xs,hi);
    if(!Number.isFinite(a)||!Number.isFinite(b)||a*b>0)return unavailable("IRR lies outside the supported -99.99% to 10,000% bracket.","ratio","unreached");
    for(let i=0;i<160;i++){const mid=(lo+hi)/2,v=npvValues(xs,mid);if(v>0)lo=mid;else hi=mid;}
    return known((lo+hi)/2,"ratio");
  }
  function payback(flows) {
    const f=parseFlows(flows);if(f.status!=="known")return f;
    if(f.value[0]>=0)return unavailable("Payback requires an initial cash outlay.","period","inapplicable");
    let cumulative=f.value[0];
    for(let t=1;t<f.value.length;t++){const prior=cumulative;cumulative+=f.value[t];if(cumulative>=0)return known(t-1+(-prior/f.value[t]),"period","Undiscounted; linear recovery within the crossing period.");}
    return unavailable("Cumulative cash flow remains below zero throughout the supplied horizon.","period","unreached");
  }
  function expectedNpv(outcomes, rate, exhaustive) {
    if(!exhaustive)return unavailable("Confirm a mutually exclusive, collectively exhaustive outcome tree.","currency");
    const ps=outcomes.map(x=>numeric(x.probability,"Outcome probability",0,1));
    const bad=ps.find(x=>x.status!=="known");if(bad)return bad;
    if(Math.abs(ps.reduce((s,x)=>s+x.value,0)-1)>1e-9)return unavailable("Probabilities must sum to one; supplied values are retained.","currency","invalid");
    if(new Set(outcomes.map(x=>x.flows.length)).size!==1)return unavailable("Use the same time basis and horizon for all outcomes.","currency","invalid");
    const values=outcomes.map(x=>npv(x.flows,rate));const fail=values.find(x=>x.status!=="known");if(fail)return fail;
    return known(values.reduce((s,x,i)=>s+x.value*ps[i].value,0),"currency","Weighted scenarios; distinct from P50/P80 or empirical distributions.");
  }
  function staffing(s) {
    const problems=[],read=(v,label,min=0,max=null)=>{const r=numeric(v,label,min,max);if(r.status!=="known")problems.push(r.reason);return r.value;};
    const h=read(s.horizon,"Horizon"),units=STAFFING_HOURS;
    if(!Object.hasOwn(units,s.unit))problems.push("Choose hours, sprints, or quarters.");
    const horizonHours=h*units[s.unit],roles=s.roles.filter(r=>r.enabled),activities=s.activities.filter(r=>r.enabled),disruptions=s.disruptions.filter(r=>r.enabled);
    let people=0,weighted=0,allocatedHours=0,roleCost=0,taskCount=0,activityHours=0,disruptionHours=0;
    roles.forEach((r,i)=>{const a=read(r.a,"Role "+(i+1)+" people"),b=read(r.b,"Role "+(i+1)+" loaded rate"),c=read(r.c,"Role "+(i+1)+" allocation",0,100);const hours=a*horizonHours*c/100;people+=a;weighted+=a*b;allocatedHours+=hours;roleCost+=hours*b;});
    const blended=people>0?weighted/people:0;
    activities.forEach((r,i)=>{const n=read(r.a,"Activity "+(i+1)+" count"),h=read(r.b,"Activity "+(i+1)+" effort");taskCount+=n;activityHours+=n*h;});
    disruptions.forEach((r,i)=>{disruptionHours+=read(r.a,"Recovery "+(i+1)+" count")*read(r.b,"Recovery "+(i+1)+" hours");});
    if(people===0&&(activityHours>0||disruptionHours>0))problems.push("Add a staffed loaded rate to price activity and recovery effort.");
    const sigma=read(s.sigma,"Sigma attention",1,6),qualityMultiplier=.65+sigma*.15;
    const qualityHours=s.qualityEnabled?horizonHours*read(s.qualityAllocation,"Quality allocation",0,100)/100*qualityMultiplier:0;
    const qualityRate=s.qualityEnabled?read(s.qualityRate,"Quality loaded rate"):0;
    const overlap={activities:read(s.overlap?.activities,"Additional activity share",0,1),recovery:read(s.overlap?.recovery,"Additional recovery share",0,1),quality:read(s.overlap?.quality,"Additional quality share",0,1)};
    const activityCost=activityHours*blended*overlap.activities,disruptionCost=disruptionHours*blended*overlap.recovery,qualityCost=qualityHours*qualityRate*overlap.quality;
    const unknownCount=read(s.unknowns,"Named unknowns"),unknownRate=Math.min(.35,unknownCount*.025),complexityRate=Object.hasOwn(COMPLEXITY_RATES,s.complexity)?COMPLEXITY_RATES[s.complexity]:undefined;
    if(complexityRate===undefined)problems.push("Choose a named complexity heuristic.");
    if(problems.length)return {status:"unavailable",problems};
    const base=roleCost+activityCost+disruptionCost+qualityCost,unknownCost=base*unknownRate,complexityCost=base*complexityRate,central=base+unknownCost+complexityCost,spread=.07+Math.min(.16,unknownRate*.45+complexityRate*.2);
    if(!Number.isFinite(central))return {status:"invalid",problems:["The staffing result exceeds the supported numeric range."]};
    return {status:"known",currency:STAFFING_CURRENCY,horizonHours,people,taskCount,activityHours,allocatedHours,qualityHours,qualityMultiplier,disruptionHours,roleCost,activityCost,qualityCost,disruptionCost,unknownCost,complexityCost,central,spread,low:central*(1-spread),high:central*(1+spread),unknownCount,unknownRate,complexityRate,unpricedWork:false,overlap,problems:[]};
  }
  const FIELD_DOMAINS = Object.freeze({
    commercial: "commercial-cohort",
    pricing: "customer-implementation",
    clinical: "clinical-operational",
    capital: "capital-allocation"
  });
  const METRIC_DOMAINS = Object.freeze({
    budgetImpact: "clinical-operational",
    adoptedPopulation: "clinical-operational",
    capacityGap: "clinical-operational",
    costPerOutcome: "clinical-operational",
    expectedNpv: "capital-allocation",
    discountAmount: "customer-implementation",
    netPrice: "customer-implementation",
    unitContribution: "customer-implementation"
  });

  function mappedDomain(mapping, key, fallback) {
    return Object.hasOwn(mapping, key) ? mapping[key] : fallback;
  }

  function readInput(inputs, key) {
    const field = FIELDS[key];
    return numeric(inputs[key], field.label, field.min ?? null, field.max ?? null);
  }

  function calculateMetric(inputs, currencyAvailable, keys, unit, calculateValue) {
    const values = keys.map(key => readInput(inputs, key));
    const incomplete = values.find(value => value.status !== "known");
    if (incomplete) return { ...incomplete, unit };
    if (unit.includes("currency") && !currencyAvailable) {
      return unavailable("Supply an explicit three-letter currency code.", unit);
    }
    const result = calculateValue(...values.map(value => value.value));
    return typeof result === "number" ? known(result, unit) : result;
  }

  function divideByPositive(numerator, denominator, unit) {
    if (denominator > 0) return known(numerator / denominator, unit);
    return unavailable("Supply a positive denominator; explicit zero is retained.", unit);
  }

  function calculateCostPerOutcome(inputs, candidate, baseline, outcome) {
    const reviewed = inputs.economicReview === "reviewed"
      && [inputs.reviewer, inputs.evidenceSource, inputs.outcomeUnit, inputs.perspective].every(cleanText)
      && validDate(inputs.asOf);
    if (!reviewed) {
      return unavailable("Supply the reviewed measure, reviewer, perspective, source, and date.", "currency/outcome");
    }
    if (outcome <= 0) {
      return unavailable("A positive incremental outcome is needed for this ratio; inspect cost and outcome separately.", "currency/outcome", "inapplicable");
    }
    return known(
      (candidate - baseline) / outcome,
      "currency/outcome",
      "Cost per " + inputs.outcomeUnit + "; interpretation retains the stated evidence boundary."
    );
  }

  function calculateAlternativeNpv(alternative, inputs, commonHorizon, currencyAvailable) {
    if (!commonHorizon) {
      return unavailable("Use a common horizon before comparing alternatives.", "currency", "incompatible");
    }
    if (!currencyAvailable) return unavailable("Supply currency.", "currency");
    return { ...npv(alternative.flows, inputs.discountRate), unit: "currency" };
  }

  function calculateAlternatives(state, currencyAvailable) {
    const commonHorizon = new Set(state.alternatives.map(item => item.flows.length)).size === 1;
    return state.alternatives.map(alternative => ({
      ...alternative,
      flows: [...alternative.flows],
      npv: calculateAlternativeNpv(alternative, state.inputs, commonHorizon, currencyAvailable),
      irr: irr(alternative.flows),
      payback: payback(alternative.flows)
    }));
  }

  function calculateSensitivity(state, currencyAvailable) {
    const rate = readInput(state.inputs, "discountRate");
    const commonHorizon = new Set(state.alternatives.map(item => item.flows.length)).size === 1;
    return state.alternatives.map(alternative => ({
      id: alternative.id,
      values: [-.02, 0, .02].map(offset => {
        const shifted = rate.status === "known" ? rate.value + offset : null;
        return {
          rate: shifted,
          result: calculateAlternativeNpv(
            alternative,
            { discountRate: shifted === null ? state.inputs.discountRate : shifted },
            commonHorizon,
            currencyAvailable
          )
        };
      })
    }));
  }

  function calculateClinicalDelta(consequence, inputs) {
    const baseline = numeric(consequence.baseline, consequence.name + " baseline");
    const candidate = numeric(consequence.candidate, consequence.name + " candidate");
    const reviewedEvidence = consequence.standing !== "unavailable"
      && [consequence.source, inputs.reviewer].every(cleanText)
      && validDate(inputs.asOf);
    const evidenceAvailable = consequence.standing === "illustrative" || reviewedEvidence;

    if (!evidenceAvailable || !cleanText(consequence.unit)) {
      return unavailable(
        "Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario.",
        consequence.unit
      );
    }
    if (baseline.status !== "known") return baseline;
    if (candidate.status !== "known") return candidate;
    return known(candidate.value - baseline.value, consequence.unit, consequence.standing);
  }

  function resolveDecisionGate(inputs, capacityGap) {
    if (inputs.gate === "stop") return "stop";

    const reviewComplete = inputs.gate === "satisfied"
      && [inputs.owner, inputs.trigger, inputs.nextEvidence].every(cleanText)
      && validDate(inputs.revisit);
    const capacityAvailable = capacityGap.status === "known" && capacityGap.value === 0;
    if (reviewComplete && capacityAvailable) return "ready-for-human-review";
    return "held-open";
  }

  function inputStatus(inputs, key, field) {
    if (field.type === FIELD_TYPE.NUMBER) return readInput(inputs, key).status;
    return cleanText(inputs[key]) || typeof inputs[key] === "boolean" ? "known" : "unavailable";
  }

  function buildRecords(state, metrics, alternatives, clinical, gate) {
    const inputs = state.inputs;
    const records = Object.entries(FIELDS).map(([key, field]) => ({
      id: "input/" + key,
      domain: mappedDomain(FIELD_DOMAINS, field.group, "internal-investment"),
      type: "input",
      label: field.label,
      status: inputStatus(inputs, key, field),
      value: inputs[key],
      unit: field.unit,
      currency: field.unit.includes("currency") ? inputs.currency : null,
      timeBasis: inputs.period,
      evidenceStanding: state.origin
    }));
    records.push({
      id: "assumption/cash-basis",
      domain: "capital-allocation",
      type: "assumption",
      value: {
        convention: inputs.cashConvention,
        taxWorkingCapital: inputs.taxWorkingCapital,
        reserves: "Cash-flow inputs carry each intended cost once; staffing references and pricing outputs remain separate views."
      }
    });
    for (const [id, result] of Object.entries(metrics)) {
      records.push({
        id: "calculation/" + id,
        domain: mappedDomain(METRIC_DOMAINS, id, "commercial-cohort"),
        type: "calculation",
        ...result,
        currency: result.unit.includes("currency") ? inputs.currency : null,
        timeBasis: inputs.period,
        formulaVersion: VERSION,
        evidenceStanding: state.origin
      });
    }
    for (const alternative of alternatives) {
      records.push({
        id: "calculation/alternative/" + alternative.id,
        domain: "capital-allocation",
        type: "calculation",
        npv: alternative.npv,
        irr: alternative.irr,
        payback: alternative.payback,
        currency: inputs.currency,
        timeBasis: inputs.period,
        horizon: alternative.flows.length - 1,
        formulaVersion: VERSION,
        evidenceStanding: alternative.standing
      });
    }
    for (const consequence of clinical) {
      records.push({
        id: "calculation/consequence/" + consequence.name,
        domain: "clinical-operational",
        type: "calculation",
        ...consequence.delta,
        source: consequence.source,
        evidenceStanding: consequence.standing,
        formulaVersion: VERSION,
        timeBasis: inputs.period
      });
    }
    records.push({
      id: "evidence/context",
      domain: "clinical-operational",
      type: "evidence",
      value: { source: inputs.evidenceSource, reviewer: inputs.reviewer, asOf: inputs.asOf, standing: state.origin }
    });
    records.push({
      id: "decision/next",
      domain: "capital-allocation",
      type: "decision",
      value: {
        gate, choice: inputs.option, trigger: inputs.trigger, owner: inputs.owner,
        optionPreserved: inputs.option, nextEvidence: inputs.nextEvidence, revisit: inputs.revisit
      }
    });
    return records;
  }

  function calculate(state) {
    const validation = validate(state);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors, metrics: {}, alternatives: [], clinical: [], records: [] };
    }

    return calculateAccepted(state);
  }
  function calculateAccepted(state) {
    const inputs = state.inputs;
    const currencyAvailable = CURRENCY_CODE.test(inputs.currency);
    const metrics = {};
    function metric(key, keys, unit, formula) {
      metrics[key] = calculateMetric(inputs, currencyAvailable, keys, unit, formula);
    }

    metric("closingCustomers", ["openingCustomers", "newCustomers", "churnCustomers", "reactivatedCustomers"], "customer", (opening, added, churn, reactivated) => {
      if (churn > opening) return unavailable("Churn exceeds the opening cohort.", "customer", "invalid");
      return opening + added - churn + reactivated;
    });
    metric("logoRetention", ["openingCustomers", "churnCustomers"], "ratio", (opening, churn) => {
      if (churn > opening) return unavailable("Churn exceeds the opening cohort.", "ratio", "invalid");
      return divideByPositive(opening - churn, opening, "ratio");
    });
    metric("grr", ["openingRevenue", "churnRevenue", "contraction"], "ratio", (opening, churn, contraction) => {
      if (churn + contraction > opening) return unavailable("Losses exceed opening-cohort revenue.", "ratio", "invalid");
      return divideByPositive(opening - churn - contraction, opening, "ratio");
    });
    metric("nrr", ["openingRevenue", "churnRevenue", "contraction", "expansion"], "ratio", (opening, churn, contraction, expansion) => {
      if (churn + contraction > opening) return unavailable("Losses exceed opening-cohort revenue.", "ratio", "invalid");
      return divideByPositive(opening - churn - contraction + expansion, opening, "ratio");
    });
    metric("closingRevenue", ["openingRevenue", "churnRevenue", "contraction", "expansion", "newRevenue", "reactivationRevenue"], "currency/period", (opening, churn, contraction, expansion, added, reactivated) => {
      if (churn + contraction > opening) return unavailable("Losses exceed opening-cohort revenue.", "currency/period", "invalid");
      return opening - churn - contraction + expansion + added + reactivated;
    });
    metric("cac", ["acquisitionSpend", "newCustomers"], "currency/customer",
      (spend, customers) => divideByPositive(spend, customers, "currency/customer"));
    metric("acquisitionRevenueRatio", ["acquisitionSpend", "newRevenue"], "period",
      (spend, revenue) => divideByPositive(spend, revenue, "period"));
    metric("cacPayback", ["acquisitionSpend", "newRevenue", "contributionMargin"], "period",
      (spend, revenue, margin) => divideByPositive(spend, revenue * margin, "period"));
    metric("discountAmount", ["listPrice", "discount"], "currency/unit", (price, discount) => price * discount);
    metric("netPrice", ["listPrice", "discount", "rebate"], "currency/unit", (price, discount, rebate) => {
      if (rebate > price * (1 - discount)) return unavailable("Rebate exceeds discounted unit price.", "currency/unit", "invalid");
      return price * (1 - discount) - rebate;
    });
    metric("unitContribution", ["listPrice", "discount", "rebate", "variableCost", "serviceCost"], "currency/unit", (price, discount, rebate, cost, service) => {
      if (rebate > price * (1 - discount)) return unavailable("Rebate exceeds discounted unit price.", "currency/unit", "invalid");
      return price * (1 - discount) - rebate - cost - service;
    });
    metric("adoptedPopulation", ["eligiblePopulation", "adoption"], "person", (population, adoption) => population * adoption);
    metric("budgetImpact", ["eligiblePopulation", "adoption", "baselineCost", "candidateCost"], "currency/period",
      (population, adoption, baseline, candidate) => population * adoption * (candidate - baseline));
    metric("capacityGap", ["eligiblePopulation", "adoption", "capacity"], "person/period",
      (population, adoption, capacity) => Math.max(0, population * adoption - capacity));
    metric("costPerOutcome", ["candidateCost", "baselineCost", "incrementalOutcome"], "currency/outcome",
      (candidate, baseline, outcome) => calculateCostPerOutcome(inputs, candidate, baseline, outcome));
    metrics.expectedNpv = currencyAvailable
      ? { ...expectedNpv(state.outcomes, inputs.discountRate, inputs.exhaustive), unit: "currency" }
      : unavailable("Supply currency.", "currency");

    const alternatives = calculateAlternatives(state, currencyAvailable);
    const sensitivity = calculateSensitivity(state, currencyAvailable);
    const clinical = state.clinical.map(consequence => ({
      ...consequence,
      delta: calculateClinicalDelta(consequence, inputs)
    }));
    const gate = resolveDecisionGate(inputs, metrics.capacityGap);
    const records = buildRecords(state, metrics, alternatives, clinical, gate);
    return {
      valid: true, errors: [], metrics, alternatives, sensitivity, clinical, records,
      gate, events: state.events.map(event => ({ ...event, predecessors: [...event.predecessors] }))
    };
  }
  function migrate(raw) {
    jsonText(raw);
    if(raw?.schemaVersion===VERSION)return clone(raw);
    const next=defaults();
    if(raw?.schemaVersion==="1.0.0"&&raw.view==="model-explorer"&&typeof raw.activeModelId==="string") {
      next.method=raw.activeModelId;next.extensions["urn:investment:legacy-selection"]={snapshot:clone(raw),standing:"Selection preserved; analytical scenario remains explicitly illustrative."};return next;
    }
    if(raw&&Array.isArray(raw.roles)&&raw.horizon&&raw.plan) {
      next.inputs.label=String(raw.plan);next.inputs.internalInvestment=null;next.origin="user-supplied";
      next.extensions["urn:investment:legacy-leave-behind"]={snapshot:clone(raw),standing:"Historical display snapshot retained. Re-enter exact inputs before deriving investment amounts."};
      for(const [key,f] of Object.entries(FIELDS))if(f.type===FIELD_TYPE.NUMBER)next.inputs[key]=null;
      for(const a of next.alternatives)a.flows=a.flows.map(()=>null);
      for(const o of next.outcomes){o.probability=null;o.flows=o.flows.map(()=>null);}
      return next;
    }
    throw new Error("Choose investment state 0.1.0, a legacy model selection, or a calculator leave-behind. Current state remains available.");
  }
  function importState(text) {
    const state = migrate(parseJson(text));
    const result = validate(state);
    if (!result.valid) throw new Error(result.errors.slice(0,4).join(" "));
    return state;
  }
  function serialize(state) {
    const text = jsonText(state);
    const validation = validateContract(state);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    return text;
  }
  function prepare(candidate) {
    const serialized = serialize(candidate);
    const state = JSON.parse(serialized);
    const result = calculateAccepted(state);
    return freezeTree({ state, result, serialized, fingerprint: fingerprintText(serialized) });
  }
  return Object.freeze({VERSION,FIELD_TYPE,STAFFING_CURRENCY,JSON_LIMITS,NUMERIC_TEXT_LIMIT,DOMAINS,TYPES,FIELDS,OUTCOMES,defaults,schema,validate,clone,numeric,known,unavailable,stable,fingerprint,npv,irr,payback,expectedNpv,staffing,calculate,migrate,parseJson,importState,serialize,prepare});
});
