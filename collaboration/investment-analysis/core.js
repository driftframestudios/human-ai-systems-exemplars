/* Shared investment calculation and exchange owner. Browser and Node; no runtime dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.InvestmentCore = api;
})(globalThis, function () {
  "use strict";
  const VERSION = "0.1.0";
  const DOMAINS = ["internal-investment", "customer-implementation", "commercial-cohort", "clinical-operational", "capital-allocation"];
  const TYPES = ["input", "assumption", "calculation", "evidence", "decision"];
  const PERIODS = ["month", "quarter", "year"];
  const FIELDS = {};
  function field(key, label, group, unit, initial, options = {}) {
    FIELDS[key] = { label, group, unit, initial, type: "number", min: 0, ...options };
  }
  field("label", "Scenario name", "orientation", "text", "Illustrative pilot versus status quo", {type:"text"});
  field("currency", "Currency (ISO 4217 code)", "orientation", "text", "USD", {type:"currency"});
  field("period", "Cash-flow and commercial period", "orientation", "period", "year", {type:"select", options:PERIODS});
  field("segment", "Customer segment", "commercial", "text", "Synthetic implementation partners", {type:"text"});
  field("cohort", "Opening cohort and measurement window", "commercial", "text", "100 synthetic customers; one year", {type:"text"});
  field("tenure", "Cohort tenure (periods)", "commercial", "period", 1);
  field("implementationState", "Implementation standing", "commercial", "text", "Illustrative ramp; one-period lag", {type:"text"});
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
  field("pricingUnit", "Orderable unit and package boundary", "pricing", "text", "One synthetic service unit; implementation separate", {type:"text"});
  field("buyer", "Buyer / user / payer", "pricing", "text", "Sponsor / operating team / customer organization", {type:"text"});
  field("priceClass", "Price evidence class", "pricing", "text", "Illustrative scenario", {type:"select",options:["Illustrative scenario","Public cash-pay price","Contracted price","Observed realized revenue"]});
  field("implementationCost", "Customer implementation cost", "pricing", "currency", 10000);
  field("implementationLag", "Implementation lag (periods)", "pricing", "period", 1);
  field("internalInvestment", "Internal investment reference", "capital", "currency", 100000);
  field("discountRate", "Effective discount rate per period", "capital", "ratio", .1, {min:-.999999});
  field("cashConvention", "Cash-flow convention", "capital", "text", "Incremental to status quo; end-period; t=0 upfront", {type:"text"});
  field("taxWorkingCapital", "Tax and working-capital treatment", "capital", "text", "Synthetic after-tax flows; working-capital changes included once", {type:"text"});
  field("capacity", "Implementation capacity (adopted people per period)", "capital", "person/period", 40);
  field("exhaustive", "Outcome tree is mutually exclusive and exhaustive", "capital", "boolean", false, {type:"boolean"});
  field("eligiblePopulation", "Eligible population", "clinical", "person", 100);
  field("adoption", "Adoption fraction (0-1)", "clinical", "ratio", .3, {max:1});
  field("baselineCost", "Baseline resource cost per person per period", "clinical", "currency/person/period", 500);
  field("candidateCost", "Candidate resource cost per person per period", "clinical", "currency/person/period", 650);
  field("perspective", "Budget perspective", "clinical", "text", "Illustrative provider budget", {type:"text"});
  field("population", "Population and context", "clinical", "text", "Synthetic population; local eligibility remains to be specified", {type:"text"});
  field("intervention", "Intervention", "clinical", "text", "Bounded workflow pilot", {type:"text"});
  field("comparator", "Comparator", "clinical", "text", "Current workflow", {type:"text"});
  field("reviewer", "Accountable clinical / operating reviewer", "clinical", "text", "", {type:"text"});
  field("evidenceSource", "Evidence semantic key or public source", "clinical", "text", "", {type:"text"});
  field("asOf", "Evidence as-of date", "clinical", "date", "", {type:"text"});
  field("economicReview", "Outcome transformation review", "clinical", "text", "pending", {type:"select",options:["pending","reviewed"]});
  field("incrementalOutcome", "Reviewed incremental outcome per adopted person", "clinical", "outcome/person", null, {min:null});
  field("outcomeUnit", "Outcome unit (explicit measure)", "clinical", "text", "", {type:"text"});
  field("owner", "Decision owner", "decision", "text", "", {type:"text"});
  field("trigger", "Gate trigger", "decision", "text", "Review pilot feasibility, evidence, and capacity", {type:"text"});
  field("nextEvidence", "Next evidence needed", "decision", "text", "Observed workflow and reviewed resource requirements", {type:"text"});
  field("revisit", "Revisit date", "decision", "date", "", {type:"text"});
  field("option", "Reversible next choice", "decision", "text", "pilot", {type:"select",options:["status-quo","proceed","defer","pilot","scale","redirect","stop"]});
  field("gate", "Safety / governance gate", "decision", "text", "open", {type:"select",options:["open","satisfied","stop"]});
  const OUTCOMES = ["Safety","Quality","Timeliness","Patient experience","Equity","Efficiency","Burden","Governance","Budget capacity"];
  const clone = value => JSON.parse(JSON.stringify(value));
  const cleanText = value => typeof value === "string" && value.trim().length > 0;
  function validDate(value) { if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+"T00:00:00Z");return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value; }
  const decimal = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;
  function known(value, unit, reason = "") {
    return Number.isFinite(value) ? {status:"known",value,unit,reason} : unavailable("The result exceeds the supported numeric range.",unit,"invalid");
  }
  function unavailable(reason, unit = "", status = "unavailable") { return {status,value:null,unit,reason}; }
  function numeric(value, label = "Input", min = null, max = null) {
    if (value === "" || value === null || value === undefined || (typeof value === "string" && !value.trim())) return unavailable(label + " is needed.");
    if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !decimal.test(value.trim()))) return unavailable(label + " needs a finite decimal number.","","invalid");
    const n = Number(value);
    if (!Number.isFinite(n) || (min !== null && n < min) || (max !== null && n > max)) return unavailable(label + " is outside its declared range.","","invalid");
    return known(n,"");
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
  function schema() {
    const numberInput={anyOf:[{type:"number"},{type:"null"},{type:"string",pattern:"^$|^[-+]?(?:[0-9]+\\.?[0-9]*|\\.[0-9]+)(?:[eE][-+]?[0-9]+)?$"}]};
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
        inputs:object(Object.fromEntries(Object.entries(FIELDS).map(([k,f])=>[k,f.type==="number"?numberInput:f.type==="boolean"?{type:"boolean"}:f.type==="select"?{enum:f.options}:text]))),
        alternatives:{type:"array",minItems:1,maxItems:12,items:object({id:text,label:text,flows,standing:{enum:["illustrative","user-supplied","observed"]}})},
        outcomes:{type:"array",minItems:1,maxItems:12,items:object({id:text,probability:numberInput,flows})},
        clinical:{type:"array",minItems:9,maxItems:9,items:object({name:{enum:OUTCOMES},unit:text,baseline:numberInput,candidate:numberInput,standing:{enum:["unavailable","illustrative","source-observation","transfer-hypothesis","locally-verified"]},source:text})},
        events:{type:"array",maxItems:100,items:object({id:text,kind:text,period:numberInput,predecessors:{type:"array",maxItems:100,items:text},standing:text})},
        extensions:{type:"object",propertyNames:{pattern:"^urn:[a-zA-Z0-9][a-zA-Z0-9:._/-]*$"},additionalProperties:true}
      })
    };
  }
  function validate(state) {
    const errors=[];
    function visit(value, shape, path) {
      if (shape.anyOf) {
        if (!shape.anyOf.some(candidate=>{const mark=errors.length;visit(value,candidate,path);const ok=errors.length===mark;errors.length=mark;return ok;})) errors.push(path+": supply a finite number or leave it blank.");
        return;
      }
      if ("const" in shape && value!==shape.const) errors.push(path+": unsupported contract version.");
      if (shape.enum && !shape.enum.includes(value)) errors.push(path+": choose a declared value.");
      if (shape.type==="object") {
        if (!value || typeof value!=="object" || Array.isArray(value)) {errors.push(path+": an object is needed.");return;}
        for (const key of shape.required||[]) if (!Object.hasOwn(value,key)) errors.push(path+"."+key+": required field.");
        for (const key of Object.keys(value)) {
          if (shape.propertyNames && !new RegExp(shape.propertyNames.pattern).test(key)) errors.push(path+": use a namespaced extension.");
          if (shape.properties?.[key]) visit(value[key],shape.properties[key],path+"."+key);
          else if (shape.additionalProperties===false) errors.push(path+"."+key+": field belongs to a different contract.");
        }
      }
      if (shape.type==="array") {
        if (!Array.isArray(value)) {errors.push(path+": a list is needed.");return;}
        if (value.length<(shape.minItems||0)||value.length>(shape.maxItems||Infinity)) errors.push(path+": list length is outside this contract.");
        value.forEach((item,i)=>visit(item,shape.items,path+"["+i+"]"));
      }
      if (shape.type==="number" && (typeof value!=="number"||!Number.isFinite(value))) errors.push(path+": finite number needed.");
      if (shape.type==="null" && value!==null) errors.push(path+": null needed.");
      if (shape.type==="boolean" && typeof value!=="boolean") errors.push(path+": boolean needed.");
      if (shape.type==="string") {
        if (typeof value!=="string" || value.length>(shape.maxLength||Infinity) || value.length<(shape.minLength||0) || (shape.pattern&&!new RegExp(shape.pattern).test(value))) errors.push(path+": text is outside this contract.");
      }
    }
    visit(state,schema(),"state");
    if (errors.length) return {valid:false,errors};
    for(const [name,list] of [["alternatives",state.alternatives],["outcomes",state.outcomes],["events",state.events]]) {
      const ids=list.map(x=>x.id);
      if(ids.some(x=>!cleanText(x))||new Set(ids).size!==ids.length) errors.push(name+": distinct nonempty identifiers are needed.");
    }
    if(new Set(state.clinical.map(x=>x.name)).size!==OUTCOMES.length) errors.push("clinical: preserve all nine distinct consequence dimensions.");
    const eventIds=new Set(state.events.map(e=>e.id));
    for(const e of state.events) if(e.predecessors.some(id=>!eventIds.has(id)||id===e.id)) errors.push("events: each predecessor must name another event.");
    const visited=new Set(),active=new Set(),byId=new Map(state.events.map(e=>[e.id,e]));
    for(const e of state.events) {
      const time=numeric(e.period,"Event period",0);
      if(time.status==="invalid")errors.push("events: periods use nonnegative finite numbers or an explicit blank.");
      for(const id of e.predecessors){const prior=numeric(byId.get(id)?.period,"Predecessor period",0);if(time.status==="known"&&prior.status==="known"&&prior.value>time.value)errors.push("events: predecessor occurrences belong at or before the receiving event.");}
    }
    function cycle(id){if(active.has(id))return true;if(visited.has(id))return false;active.add(id);for(const p of byId.get(id)?.predecessors||[])if(cycle(p))return true;active.delete(id);visited.add(id);return false;}
    if(state.events.some(e=>cycle(e.id))) errors.push("events: use distinct event occurrences to represent repeated lifecycle stages.");
    return {valid:errors.length===0,errors};
  }
  function stable(value) {
    if(Array.isArray(value))return "["+value.map(stable).join(",")+"]";
    if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stable(value[k])).join(",")+"}";
    return JSON.stringify(value);
  }
  function fingerprint(state) {
    let hash=2166136261;for(const char of stable(state)){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
    return "fnv1a32:"+ (hash>>>0).toString(16).padStart(8,"0");
  }
  function parseFlows(flows) {
    if(!Array.isArray(flows)||flows.length<2)return unavailable("Supply t=0 and at least one later cash flow.");
    const parsed=flows.map((v,i)=>numeric(v,"Cash flow at t="+i));
    const bad=parsed.find(x=>x.status!=="known");
    return bad||{status:"known",value:parsed.map(x=>x.value)};
  }
  function npv(flows, rate) {
    const f=parseFlows(flows),r=numeric(rate,"Discount rate",-.999999);
    if(f.status!=="known")return f;if(r.status!=="known")return r;
    return known(f.value.reduce((sum,x,t)=>sum+x/Math.pow(1+r.value,t),0),"currency");
  }
  function irr(flows) {
    const f=parseFlows(flows);if(f.status!=="known")return f;
    const xs=f.value,signs=xs.filter(x=>x!==0).map(Math.sign);
    const changes=signs.slice(1).reduce((n,x,i)=>n+(x!==signs[i]?1:0),0);
    if(changes===0)return unavailable("IRR has no sign-changing cash-flow solution.","ratio","inapplicable");
    if(changes>1)return unavailable("Multiple-solution or non-conventional cash flows: use NPV.","ratio","ambiguous");
    if(xs[0]>=0||xs.slice(1).some(x=>x<0))return unavailable("IRR is restricted to an initial investment followed by nonnegative flows.","ratio","inapplicable");
    let lo=-.9999,hi=100,a=npv(xs,lo).value,b=npv(xs,hi).value;
    if(a===null||b===null||a*b>0)return unavailable("IRR lies outside the supported -99.99% to 10,000% bracket.","ratio","unreached");
    for(let i=0;i<160;i++){const mid=(lo+hi)/2,v=npv(xs,mid).value;if(v>0)lo=mid;else hi=mid;}
    return known((lo+hi)/2,"ratio");
  }
  function payback(flows) {
    const f=parseFlows(flows);if(f.status!=="known")return f;
    if(f.value[0]>=0)return unavailable("Payback requires an initial cash outlay.","period","inapplicable");
    let cumulative=f.value[0];
    for(let t=1;t<f.value.length;t++){const prior=cumulative;cumulative+=f.value[t];if(cumulative>=0)return known(t-1+(-prior/f.value[t]),"period","Undiscounted; linear recovery within the crossing period.");}
    return unavailable("Not reached within horizon.","period","unreached");
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
    const h=read(s.horizon,"Horizon"),units={hours:1,sprints:80,quarters:520};
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
    const unknownCount=read(s.unknowns,"Named unknowns"),unknownRate=Math.min(.35,unknownCount*.025),complexityRate={bounded:.08,connected:.16,frontier:.28}[s.complexity];
    if(complexityRate===undefined)problems.push("Choose a named complexity heuristic.");
    if(problems.length)return {status:"unavailable",problems};
    const base=roleCost+activityCost+disruptionCost+qualityCost,unknownCost=base*unknownRate,complexityCost=base*complexityRate,central=base+unknownCost+complexityCost,spread=.07+Math.min(.16,unknownRate*.45+complexityRate*.2);
    if(!Number.isFinite(central))return {status:"invalid",problems:["The staffing result exceeds the supported numeric range."]};
    return {status:"known",horizonHours,people,taskCount,activityHours,allocatedHours,qualityHours,qualityMultiplier,disruptionHours,roleCost,activityCost,qualityCost,disruptionCost,unknownCost,complexityCost,central,spread,low:central*(1-spread),high:central*(1+spread),unknownCount,unknownRate,complexityRate,unpricedWork:false,overlap,problems:[]};
  }
  function calculate(state) {
    const validation=validate(state);if(!validation.valid)return {valid:false,errors:validation.errors,metrics:{},alternatives:[],clinical:[],records:[]};
    const i=state.inputs,metrics={},currency=/^[A-Z]{3}$/.test(i.currency);
    const read=key=>numeric(i[key],FIELDS[key].label,FIELDS[key].min??null,FIELDS[key].max??null);
    function metric(key,keys,unit,fn) {
      const values=keys.map(read),bad=values.find(x=>x.status!=="known");
      metrics[key]=bad?{...bad,unit}:unit.includes("currency")&&!currency?unavailable("Supply an explicit three-letter currency code.",unit):fn(...values.map(x=>x.value));
      if(typeof metrics[key]==="number")metrics[key]=known(metrics[key],unit);
      return metrics[key];
    }
    const denominator=(n,d,unit)=>d>0?known(n/d,unit):unavailable("Supply a positive denominator; explicit zero is retained.",unit);
    metric("closingCustomers",["openingCustomers","newCustomers","churnCustomers","reactivatedCustomers"],"customer",(o,n,c,r)=>c>o?unavailable("Churn exceeds the opening cohort.","customer","invalid"):o+n-c+r);
    metric("logoRetention",["openingCustomers","churnCustomers"],"ratio",(o,c)=>c>o?unavailable("Churn exceeds the opening cohort.","ratio","invalid"):denominator(o-c,o,"ratio"));
    metric("grr",["openingRevenue","churnRevenue","contraction"],"ratio",(o,c,d)=>c+d>o?unavailable("Losses exceed opening-cohort revenue.","ratio","invalid"):denominator(o-c-d,o,"ratio"));
    metric("nrr",["openingRevenue","churnRevenue","contraction","expansion"],"ratio",(o,c,d,e)=>c+d>o?unavailable("Losses exceed opening-cohort revenue.","ratio","invalid"):denominator(o-c-d+e,o,"ratio"));
    metric("closingRevenue",["openingRevenue","churnRevenue","contraction","expansion","newRevenue","reactivationRevenue"],"currency/period",(o,c,d,e,n,r)=>c+d>o?unavailable("Losses exceed opening-cohort revenue.","currency/period","invalid"):o-c-d+e+n+r);
    metric("cac",["acquisitionSpend","newCustomers"],"currency/customer",(s,n)=>denominator(s,n,"currency/customer"));
    metric("acquisitionRevenueRatio",["acquisitionSpend","newRevenue"],"period",(s,n)=>denominator(s,n,"period"));
    metric("cacPayback",["acquisitionSpend","newRevenue","contributionMargin"],"period",(s,n,m)=>denominator(s,n*m,"period"));
    metric("discountAmount",["listPrice","discount"],"currency/unit",(p,d)=>p*d);
    metric("netPrice",["listPrice","discount","rebate"],"currency/unit",(p,d,r)=>r>p*(1-d)?unavailable("Rebate exceeds discounted unit price.","currency/unit","invalid"):p*(1-d)-r);
    metric("unitContribution",["listPrice","discount","rebate","variableCost","serviceCost"],"currency/unit",(p,d,r,c,s)=>r>p*(1-d)?unavailable("Rebate exceeds discounted unit price.","currency/unit","invalid"):p*(1-d)-r-c-s);
    metric("adoptedPopulation",["eligiblePopulation","adoption"],"person",(p,a)=>p*a);
    metric("budgetImpact",["eligiblePopulation","adoption","baselineCost","candidateCost"],"currency/period",(p,a,b,c)=>p*a*(c-b));
    metric("capacityGap",["eligiblePopulation","adoption","capacity"],"person/period",(p,a,c)=>Math.max(0,p*a-c));
    metric("costPerOutcome",["candidateCost","baselineCost","incrementalOutcome"],"currency/outcome",(c,b,o)=>{
      if(i.economicReview!=="reviewed"||(![i.reviewer,i.evidenceSource,i.outcomeUnit,i.perspective].every(cleanText)||!validDate(i.asOf)))return unavailable("Supply the reviewed measure, reviewer, perspective, source, and date.","currency/outcome");
      return o>0?known((c-b)/o,"currency/outcome","Cost per "+i.outcomeUnit+"; interpretation retains the stated evidence boundary."):unavailable("A positive incremental outcome is needed for this ratio; inspect cost and outcome separately.","currency/outcome","inapplicable");
    });
    const commonHorizon=new Set(state.alternatives.map(a=>a.flows.length)).size===1;
    const alternatives=state.alternatives.map(a=>({...a,npv:!commonHorizon?unavailable("Use a common horizon before comparing alternatives.","currency","incompatible"):currency?npv(a.flows,i.discountRate):unavailable("Supply currency.","currency"),irr:irr(a.flows),payback:payback(a.flows)}));
    metrics.expectedNpv=currency?expectedNpv(state.outcomes,i.discountRate,i.exhaustive):unavailable("Supply currency.","currency");
    const rate=read("discountRate"),sensitivity=state.alternatives.map(a=>({id:a.id,values:[-.02,0,.02].map(offset=>({rate:rate.value===null?null:rate.value+offset,result:rate.status==="known"?npv(a.flows,rate.value+offset):unavailable(rate.reason)}))}));
    const clinical=state.clinical.map(c=>{
      const b=numeric(c.baseline,c.name+" baseline"),p=numeric(c.candidate,c.name+" candidate");
      const evidence=c.standing==="illustrative"||(c.standing!=="unavailable"&&[c.source,i.reviewer].every(cleanText)&&validDate(i.asOf));
      return {...c,delta:!evidence||!cleanText(c.unit)?unavailable("Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario.",c.unit):b.status!=="known"?b:p.status!=="known"?p:known(p.value-b.value,c.unit,c.standing)};
    });
    const gate=i.gate==="stop"?"stop":i.gate==="satisfied"&&[i.owner,i.trigger,i.nextEvidence].every(cleanText)&&validDate(i.revisit)&&metrics.capacityGap.status==="known"&&metrics.capacityGap.value===0?"ready-for-human-review":"held-open";
    const domain=f=>["commercial","pricing"].includes(f.group)?(f.group==="pricing"?"customer-implementation":"commercial-cohort"):f.group==="clinical"?"clinical-operational":f.group==="capital"?"capital-allocation":"internal-investment";
    const records=Object.entries(FIELDS).map(([key,f])=>({id:"input/"+key,domain:domain(f),type:"input",label:f.label,status:f.type==="number"?read(key).status:cleanText(i[key])||typeof i[key]==="boolean"?"known":"unavailable",value:i[key],unit:f.unit,currency:f.unit.includes("currency")?i.currency:null,timeBasis:i.period,evidenceStanding:state.origin}));
    records.push({id:"assumption/cash-basis",domain:"capital-allocation",type:"assumption",value:{convention:i.cashConvention,taxWorkingCapital:i.taxWorkingCapital,reserves:"Cash flows carry all intended costs once; staffing reference and pricing outputs are separate views, never automatically added."}});
    for(const [id,result] of Object.entries(metrics))records.push({id:"calculation/"+id,domain:["budgetImpact","adoptedPopulation","capacityGap","costPerOutcome"].includes(id)?"clinical-operational":id==="expectedNpv"?"capital-allocation":["discountAmount","netPrice","unitContribution"].includes(id)?"customer-implementation":"commercial-cohort",type:"calculation",...result,currency:result.unit.includes("currency")?i.currency:null,timeBasis:i.period,formulaVersion:VERSION,evidenceStanding:state.origin});
    for(const alternative of alternatives)records.push({id:"calculation/alternative/"+alternative.id,domain:"capital-allocation",type:"calculation",npv:alternative.npv,irr:alternative.irr,payback:alternative.payback,currency:i.currency,timeBasis:i.period,horizon:alternative.flows.length-1,formulaVersion:VERSION,evidenceStanding:alternative.standing});
    for(const consequence of clinical)records.push({id:"calculation/consequence/"+consequence.name,domain:"clinical-operational",type:"calculation",...consequence.delta,source:consequence.source,evidenceStanding:consequence.standing,formulaVersion:VERSION,timeBasis:i.period});
    records.push({id:"evidence/context",domain:"clinical-operational",type:"evidence",value:{source:i.evidenceSource,reviewer:i.reviewer,asOf:i.asOf,standing:state.origin}});
    records.push({id:"decision/next",domain:"capital-allocation",type:"decision",value:{gate,choice:i.option,trigger:i.trigger,owner:i.owner,optionPreserved:i.option,nextEvidence:i.nextEvidence,revisit:i.revisit}});
    return {valid:true,errors:[],metrics,alternatives,sensitivity,clinical,records,gate,events:clone(state.events)};
  }
  function migrate(raw) {
    if(raw?.schemaVersion===VERSION)return clone(raw);
    const next=defaults();
    if(raw?.schemaVersion==="1.0.0"&&raw.view==="model-explorer"&&typeof raw.activeModelId==="string") {
      next.method=raw.activeModelId;next.extensions["urn:investment:legacy-selection"]={snapshot:clone(raw),standing:"Selection preserved; analytical scenario remains explicitly illustrative."};return next;
    }
    if(raw&&Array.isArray(raw.roles)&&raw.horizon&&raw.plan) {
      next.inputs.label=String(raw.plan);next.inputs.internalInvestment=null;next.origin="user-supplied";
      next.extensions["urn:investment:legacy-leave-behind"]={snapshot:clone(raw),standing:"Historical display snapshot retained. Re-enter exact inputs before deriving investment amounts."};
      for(const [key,f] of Object.entries(FIELDS))if(f.type==="number")next.inputs[key]=null;
      for(const a of next.alternatives)a.flows=a.flows.map(()=>null);
      for(const o of next.outcomes){o.probability=null;o.flows=o.flows.map(()=>null);}
      return next;
    }
    throw new Error("Choose investment state 0.1.0, a legacy model selection, or a calculator leave-behind. Current state remains available.");
  }
  function importState(text) {
    if(typeof text!=="string"||text.length>1000000)throw new Error("Use a JSON state of at most 1 MB.");
    const parsed=JSON.parse(text,(key,value)=>{if(["__proto__","constructor","prototype"].includes(key))throw new Error("Reserved object key; current state remains available.");return value;});
    const state=migrate(parsed),result=validate(state);
    if(!result.valid)throw new Error(result.errors.slice(0,4).join(" "));
    return state;
  }
  function serialize(state) { const v=validate(state);if(!v.valid)throw new Error(v.errors.join(" "));return stable(state); }
  return Object.freeze({VERSION,DOMAINS,TYPES,FIELDS,OUTCOMES,defaults,schema,validate,clone,numeric,known,unavailable,stable,fingerprint,npv,irr,payback,expectedNpv,staffing,calculate,migrate,importState,serialize});
});
