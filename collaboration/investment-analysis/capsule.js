/* Pure capsule projection shared by authored defaults and accepted runtime views. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.InvestmentCapsule = api;
})(globalThis, function () {
  "use strict";
  const CONTRACT = "prompt-capsule/0.1.0";
  const SOURCE_VERSION = "0.3.0";
  const LOOPS = Object.freeze([
    Object.freeze({id:"repository-reentry",name:"Re-enter, make one bounded change, and return it clearly",publicUrl:"https://schemas.radiantnull.com/collaboration/#repository-reentry",fitCondition:"Use when the receiving costing decision resumes across sources and accepted revisions."}),
    Object.freeze({id:"skill-from-receiving-use",name:"Let real use shape a skill",publicUrl:"https://schemas.radiantnull.com/collaboration/#skill-from-receiving-use",fitCondition:"Use when a receiving decision reveals a reusable collaboration move."})
  ]);
  const SKILL_REVISION = "0b8c0463cc5e5fe107b894e2f6f204e3b746a99b";
  const SKILLS = Object.freeze([
    Object.freeze({name:"Source Authority Mapping",path:".agents/skills/source-authority-mapping/SKILL.md",sha256:"706fdafe48f3b9d85533302a2cb6029aefea61364e818939ea152c0b79b386f5",purpose:"Trace inputs, evidence, and the receiving decision to their owners."}),
    Object.freeze({name:"Practitioner Probe",path:".agents/skills/practitioner-probe/SKILL.md",sha256:"348ea113a75af3487a420e2075aa199297673aca0ba0a69e5a19d6c5a463776c",purpose:"Turn a consequential evidence gap into a bounded observation."})
  ]);
  const DOMAINS = Object.freeze([
    ["internal-investment", "Internal investment"], ["customer-implementation", "Customer implementation"],
    ["commercial-cohort", "Commercial cohort"], ["service-operational", "Service and operational value"],
    ["capital-allocation", "Capital allocation"]
  ].map(Object.freeze));
  const GROUP_DOMAIN = Object.freeze({pricing:"customer-implementation",commercial:"commercial-cohort",serviceOutcomes:"service-operational",capital:"capital-allocation"});
  const number = new Intl.NumberFormat("en-US", {maximumFractionDigits:4});
  // Linear scans over source text; structural delimiters belong to the formatter.
  function inline(value) {
    return String(value ?? "Unspecified").replace(/\r\n?/g,"\n").replace(/\s+/g,space=>space.includes("\n")?" ":space)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/\\/g,"\\\\").replace(/([!#@`*_[\]|~])/g,"\\$1")
      .replace(/\b((?:https?|ftp):)(?=\/\/)/gi,p=>p.slice(0,-1)+"\\:")
      .replace(/\bwww\./gi,p=>p.slice(0,-1)+"\\.");
  }
  function fence(text, language = "json") {
    const source = String(text);
    let longest = 2;
    for (const run of source.matchAll(/`+/g)) longest = Math.max(longest, run[0].length);
    const delimiter = "`".repeat(longest + 1);
    return delimiter + language + "\n" + source + "\n" + delimiter;
  }
  const unit = (value, inputs) => String(value || "unit unspecified").replace(/currency/g,inputs.currency || "currency unspecified").replace(/period/g,inputs.period);
  const valueText = value => value === null || (typeof value === "string" && value.trim() === "") ? "unavailable" : typeof value === "object" ? JSON.stringify(value) : String(value);
  function metric(value, inputs) {
    const amount = value.status === "known" ? number.format(value.value) : value.status;
    return inline(amount) + " " + inline(unit(value.unit, inputs)) + (value.reason ? " | Reason: " + inline(value.reason) : "");
  }
  function inputDomain(key, field) {
    if (key === "internalInvestment") return "internal-investment";
    if (key === "capacity") return "service-operational";
    return Object.hasOwn(GROUP_DOMAIN, field.group) ? GROUP_DOMAIN[field.group] : null;
  }
  function inputLines(C, p, domain) {
    return Object.entries(C.FIELDS).filter(([key,field])=>inputDomain(key,field)===domain).map(([key,field])=>{
      const value=p.state.inputs[key];
      const standing=field.type===C.FIELD_TYPE.NUMBER ? C.numeric(value,field.label,field.min ?? null,field.max ?? null).status : value === "" ? "unavailable" : "known";
      return "- " + inline(field.label) + " (" + inline(key) + "): " + inline(valueText(value)) + " [" + inline(unit(field.unit,p.state.inputs)) + "] | " + standing;
    });
  }
  // O(records + output bytes); five domains are a fixed-size vocabulary.
  function workingState(C, p) {
    const {state:s,result:r}=p, i=s.inputs;
    const sections=[];
    for (const [domain,title] of DOMAINS) {
      sections.push("### " + title,"","#### Inputs and assumptions","",...inputLines(C,p,domain));
      if (domain === "internal-investment") {
        const captured=Object.hasOwn(s.extensions,"urn:investment:staffing-reference");
        sections.push("",captured
          ? "The accepted JSON includes a captured USD staffing reference under urn:investment:staffing-reference. Its snapshot and recorded calculation describe that capture; live calculator controls have their own state."
          : "The internal amount is an entered reference. Live staffing controls remain in the calculator; a staffing snapshot enters this account through Use current staffing reference.");
      }
      const calculations=r.records.filter(record=>record.domain===domain && record.type==="calculation" && Object.hasOwn(record,"status"));
      if (calculations.length) sections.push("","#### Calculated results","",...calculations.map(record=>"- "+inline(record.id)+": "+metric(record,i)+(record.evidenceStanding?" | Evidence: "+inline(record.evidenceStanding):"")));
      if (domain === "commercial-cohort" && s.events.length) sections.push("","#### Lifecycle occurrences","",...s.events.map(e=>"- "+inline(e.id)+": "+inline(e.kind)+" | Period: "+inline(valueText(e.period))+" | Predecessors: "+inline(e.predecessors.join(", ")||"Entry")+" | Evidence: "+inline(e.standing)));
      if (domain === "service-operational") {
        sections.push("","#### Consequence evidence","",...s.serviceOutcomes.map(c=>"- "+inline(c.name)+": baseline "+inline(valueText(c.baseline))+", candidate "+inline(valueText(c.candidate))+" ["+inline(c.unit||"unit unspecified")+"] | "+inline(c.standing)+" | Source: "+inline(c.source||"Unspecified")));
      }
      if (domain === "capital-allocation") {
        sections.push("","#### Alternatives and supplied outcomes","");
        for (const a of r.alternatives) sections.push("- "+inline(a.label)+" ("+inline(a.id)+") | "+inline(a.standing)+" | Flows from t=0: "+inline(JSON.stringify(a.flows)),"- NPV: "+metric(a.npv,i),"- IRR per "+inline(i.period)+": "+metric(a.irr,i),"- Payback: "+metric(a.payback,i));
        sections.push(...s.outcomes.map(o=>"- Outcome "+inline(o.id)+" | Probability: "+inline(valueText(o.probability))+" | Flows from t=0: "+inline(JSON.stringify(o.flows))));
        sections.push("","#### Discount sensitivity","");
        for (const a of r.sensitivity) for (const v of a.values) sections.push("- "+inline(a.id)+" | Rate: "+inline(valueText(v.rate))+" | NPV: "+metric(v.result,i));
        sections.push("","#### Receiving decision","",decision(p));
      }
      sections.push("");
    }
    sections.push("### Accepted analysis JSON","","This is the directly importable accepted state. Derived results above use formula version "+C.FORMULA_VERSION+". JSON retains exact values, IDs, absence states, and declared extensions.","",fence(JSON.stringify(s,null,2)));
    return sections.join("\n");
  }
  function decision(p) {
    const i=p.state.inputs;
    return ["Owner: "+inline(i.owner||"Name the accountable decision owner"),"Gate: "+inline(p.result.gate),"Next option: "+inline(i.option),"Trigger: "+inline(i.trigger),"Next evidence: "+inline(i.nextEvidence),"Revisit: "+inline(i.revisit||"Unspecified")].map(line=>"- "+line).join("\n");
  }
  const requestedReturn = "Return findings by domain, identify the evidence each material claim needs, compare supported alternatives using the supplied results, and propose the smallest next decision for the named owner. Preserve units, denominators, periods, explicit zeros, and held-open conditions.";
  // Flat Markdown-encoded receiving fields define capsule identity. View, skills,
  // and related-loop navigation remain outside this represented-state projection.
  function project(C,p) {
    const s=p.state,i=s.inputs;
    return Object.freeze({
      contract:CONTRACT,
      capsule:"initiative-costing-calculator/investment-comparison",
      source:"initiative-costing-calculator@"+SOURCE_VERSION,
      state:"investment-analysis/"+C.VERSION,
      revision:SOURCE_VERSION,
      analysisIdentity:inline(p.fingerprint),
      title:"Initiative Costing Calculator investment comparison",
      purpose:"Prepare the next investment decision from the accepted comparison. Receiving owner: "+inline(i.owner||"Name the accountable decision owner")+".",
      context:["- Scenario: "+inline(i.label)+" ("+inline(s.scenarioId)+")","- Method: "+inline(s.method),"- Evidence standing: "+inline(s.origin),"- Currency / period: "+inline(i.currency||"currency unspecified")+" / "+inline(i.period),"- Cash-flow convention: "+inline(i.cashConvention)].join("\n"),
      workingState:workingState(C,p),
      boundaries:"Cash flows, pricing, service budget impacts, and staffing references keep their separate ledger meanings until an explicit transformation joins them. Named people authorize assumptions and decisions; evidence of a workflow or product establishes that context, while causal benefit and local applicability require their own observations.",
      requestedReturn,
      recovery:"This packet carries the accepted analysis revision identified above. Pending editor drafts remain with their controls. Import the JSON through the existing analysis importer to restore this comparison. Retain the source when an import needs revision. The capsule fingerprint compares the shared Markdown-encoded fields; analysis identity compares the accepted JSON. Exact JSON and source review carry integrity-sensitive exchange."
    });
  }
  const encoder = new TextEncoder();
  function fingerprint(projection) {
    const canonical=Object.fromEntries(Object.keys(projection).sort().map(key=>[key,projection[key]]));
    let hash=0x811c9dc5;
    for (const byte of encoder.encode(JSON.stringify(canonical))) hash=Math.imul(hash^byte,0x01000193)>>>0;
    return "fnv1a32-utf8:"+hash.toString(16).padStart(8,"0");
  }
  function prepare(C,p) {
    const projection=project(C,p);
    return Object.freeze({projection,fingerprint:fingerprint(projection)});
  }
  function document(C,p,view="plain",prepared=prepare(C,p)) {
    const active=view==="skill-assisted"?view:"plain",q=prepared.projection;
    const lines=["# Prompt Capsule: "+q.title,"",
      "- Contract: "+inline(q.contract),"- Capsule: "+inline(q.capsule),"- Source: "+inline(q.source),
      "- State: "+inline(q.state)+" | revision "+inline(q.revision),"- Fingerprint: "+prepared.fingerprint,"- Analysis fingerprint: "+q.analysisIdentity,"- View: "+active,"",
      "## Purpose and target","",q.purpose,"",
      "## Relevant context and inputs","",q.context,"",
      "## Working state","",q.workingState,"",
      "## Boundaries and human-held decisions","",q.boundaries,"",
      "## Requested return","",q.requestedReturn,"",
      "## Related loops","",...LOOPS.map(loop=>"- ["+loop.name+"]("+loop.publicUrl+") | "+loop.fitCondition),"",
      "## Evidence and recovery","",q.recovery];
    if(active==="skill-assisted") lines.push("","## Skill assistance","","Use these pinned source contracts to shape the requested return:","",...SKILLS.map(skill=>"- ["+skill.name+"](https://github.com/driftframestudios/human-ai-systems-exemplars/blob/"+SKILL_REVISION+"/"+skill.path+") | "+skill.purpose+" | Source SHA-256: `"+skill.sha256+"`"));
    return lines.join("\n")+"\n";
  }
  return Object.freeze({CONTRACT,SOURCE_VERSION,LOOPS,SKILLS,SKILL_REVISION,DOMAINS,inline,fence,workingState,decision,requestedReturn,project,fingerprint,prepare,document});
});
