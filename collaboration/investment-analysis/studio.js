/* Shared progressive analysis UI. Core owns meaning; each host owns its original instrument. */
(function () {
  "use strict";
  const C=window.InvestmentCore, host=document.querySelector("[data-investment-analysis]");
  if(!C||!host)return;
  let state=C.defaults(),result=C.calculate(state);
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const titles={orientation:"Orientation",commercial:"Commercial cohort",pricing:"Pricing and implementation",capital:"Cash flow and capacity",clinical:"Clinical and operational context",decision:"Decision and reversible gate"};
  function control(key,f) {
    const id="analysis-"+key,value=state.inputs[key];
    let input;
    if(f.type==="boolean")input='<input id="'+id+'" data-key="'+key+'" type="checkbox" '+(value?"checked":"")+'>';
    else if(f.type==="select")input='<select id="'+id+'" data-key="'+key+'">'+f.options.map(x=>'<option '+(x===value?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select>';
    else input='<input id="'+id+'" data-key="'+key+'" type="'+(f.type==="number"?"number":f.unit==="date"?"date":"text")+'" '+(f.type==="number"?'step="any" '+(f.min!==null&&f.min!==undefined?'min="'+f.min+'" ':"")+(f.max!==undefined?'max="'+f.max+'" ':""):"")+'value="'+esc(value)+'">';
    return '<label class="investment-field" for="'+id+'"><span>'+esc(f.label)+'</span>'+input+'<small>'+esc(f.unit.replace(/currency/g,state.inputs.currency||"currency").replace(/period/g,state.inputs.period))+'</small></label>';
  }
  function group(name) {return '<fieldset><legend>'+titles[name]+'</legend><div class="investment-fields">'+Object.entries(C.FIELDS).filter(([,f])=>f.group===name).map(([k,f])=>control(k,f)).join("")+'</div></fieldset>';}
  function editor(key,label,note) {return '<label class="investment-editor" for="analysis-'+key+'"><strong>'+label+'</strong><span>'+note+'</span><textarea id="analysis-'+key+'" data-editor="'+key+'" rows="8" spellcheck="false">'+esc(JSON.stringify(state[key],null,2))+'</textarea></label>';}
  function mount() {
    host.innerHTML='<div class="investment-intro"><p class="investment-kicker">Local calculation / explicit evidence / revisable decisions</p><h3>Compare what changes the decision.</h3><p>Begin with the illustrative fixture, edit the assumptions, then carry the same state into either instrument. Every amount belongs to its stated currency and period. Clinical dimensions keep their own evidence and human review.</p></div>'+
      '<div class="investment-actions"><button type="button" data-action="reset">Reset illustrative analysis</button><button type="button" data-action="staffing">Use current staffing reference</button><button type="button" data-action="export">Export analysis JSON</button><label for="analysis-import">Import analysis JSON<input id="analysis-import" type="file" accept=".json,application/json"></label></div>'+
      '<p id="analysis-status" role="status" aria-live="polite">Illustrative inputs loaded. Blank and explicit zero remain distinct.</p>'+
      '<details open><summary>1. Orientation and decision</summary>'+group("orientation")+group("decision")+'<div data-summary></div></details>'+
      '<details><summary>2. Commercial and implementation analysis</summary>'+group("commercial")+group("pricing")+'<div data-commercial></div>'+editor("events","Lifecycle event graph","Each occurrence has an ID, period, evidence standing, and predecessor IDs. Branches and reactivation retain separate events.")+'</details>'+
      '<details><summary>3. Capital, uncertainty, and clinical consequences</summary>'+group("capital")+
      editor("alternatives","Alternatives and timed cash flows","Flows are incremental to the stated comparator: t=0 followed by equal end-of-period intervals. Include every intended cost once. Alternatives are choices, not probabilistic outcomes.")+
      editor("outcomes","Mutually exclusive outcome tree","Each outcome has its own probability and cash flows. Supplied probabilities are retained. P50/P80 and empirical distributions require their separate models.")+
      '<div data-capital></div>'+group("clinical")+
      editor("clinical","Nine clinical / operational dimensions","Preserve each dimension. Supply its unit, baseline, candidate value, evidence standing, and source; reviewed observations also require the named reviewer and date.")+
      '<div data-clinical></div></details>'+
      '<details><summary>4. Inspection, exchange, and AI collaboration</summary><p>The domain axis and record-type axis remain separate. This is a local planning instrument; accountable people establish financial, clinical, and release decisions.</p><div data-records></div>'+
      '<label class="investment-editor" for="analysis-capsule"><strong>Plain-language comparison and Prompt Capsule</strong><textarea id="analysis-capsule" rows="12" readonly></textarea></label>'+
      '<label class="investment-editor" for="analysis-exchange"><strong>Portable state / schema output</strong><textarea id="analysis-exchange" rows="10" spellcheck="false"></textarea></label>'+
      '<div class="investment-actions"><button type="button" data-action="import-text">Import pasted state</button><button type="button" data-action="copy">Select portable state for copying</button><button type="button" data-action="schema">Inspect JSON Schema</button></div></details>'+
      '<div class="investment-actions"><button type="button" data-action="apply">Apply lifecycle, alternative, outcome, and clinical edits</button></div>';
    render();
  }
  function formatted(r) {
    if(r.status!=="known")return r.status+": "+r.reason;
    const v=new Intl.NumberFormat("en-US",{maximumFractionDigits:4}).format(r.value);
    return v+" "+r.unit.replace(/currency/g,state.inputs.currency).replace(/period/g,state.inputs.period);
  }
  function table(caption,headers,rows) {
    return '<div class="investment-table-scroll" role="region" tabindex="0" aria-label="'+esc(caption)+'; scroll horizontally"><table><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,i)=>'<'+(i?"td":"th scope=\"row\"")+'>'+esc(v)+'</'+(i?"td":"th")+'>').join("")+'</tr>').join("")+'</tbody></table></div>';
  }
  function metricRows(keys){return keys.map(([key,label])=>[label,formatted(result.metrics[key])]);}
  function capsule() {
    return ["# Investment comparison",state.inputs.label,
      "Standing: "+state.origin+". Method: "+state.method+". Contract: "+C.VERSION+". State identity: "+C.fingerprint(state)+".",
      "Currency / period: "+state.inputs.currency+" / "+state.inputs.period+". "+state.inputs.cashConvention,
      "Decision owner: "+(state.inputs.owner||"Unspecified")+". Gate: "+result.gate+". Next option: "+state.inputs.option+".",
      "Next evidence: "+state.inputs.nextEvidence+". Revisit: "+(state.inputs.revisit||"Unspecified")+".",
      "Five domains: "+C.DOMAINS.join(", ")+". Five record types: "+C.TYPES.join(", ")+".",
      ...Object.entries(result.metrics).map(([k,v])=>k+": "+formatted(v)),
      ...result.alternatives.map(a=>a.label+": NPV "+formatted(a.npv)+"; IRR "+formatted(a.irr)+"; payback "+formatted(a.payback)),
      "Evidence and authority: the source identifies product or workflow context; causal benefit and local applicability require their own observations.",
      "Cash-flow amounts are complete scenario inputs. Pricing, staffing references, reserves, and clinical budget impacts remain separate views until a named transformation joins them.",
      "Clinical cost-consequence: "+result.clinical.map(c=>c.name+" "+formatted(c.delta)).join("; "),
      "Portable state:\n"+C.serialize(state)].join("\n\n");
  }
  function render() {
    result=C.calculate(state);
    if(!result.valid){status(result.errors.join(" "));return;}
    host.querySelector("[data-summary]").innerHTML='<p class="investment-decision"><strong>'+esc(result.gate)+'</strong> / '+esc(state.inputs.option)+' / '+esc(state.inputs.owner||"Decision owner remains open")+'</p>'+table("Decision-changing measures",["Measure","Value and standing"],metricRows([["grr","Gross revenue retention"],["nrr","Net revenue retention"],["cac","Customer acquisition cost"],["expectedNpv","Expected NPV"],["budgetImpact","Incremental clinical budget impact"]]))+
      '<p>Source standing: '+esc(state.origin)+'. '+esc(state.inputs.nextEvidence)+'.</p>';
    host.querySelector("[data-commercial]").innerHTML=table("Commercial cohort and price realization",["Measure","Result"],metricRows([["logoRetention","Customer retention, opening cohort"],["closingCustomers","Closing customers"],["closingRevenue","Closing recurring revenue"],["grr","GRR, opening cohort"],["nrr","NRR, opening cohort"],["cac","Acquisition spend / new customers"],["acquisitionRevenueRatio","Acquisition spend / new recurring revenue"],["cacPayback","Contribution-based acquisition payback"],["discountAmount","Per-unit discount"],["netPrice","Net price after discount and rebate"],["unitContribution","Net price less variable and service costs"]]))+
      table("Lifecycle event graph",["Occurrence","Stage","Period","Predecessors","Standing"],state.events.map(e=>[e.id,e.kind,e.period===null?"unavailable":e.period,e.predecessors.join(", ")||"Entry",e.standing]));
    host.querySelector("[data-capital]").innerHTML=table("Incremental alternatives",["Choice","Standing","Cash flows from t=0","NPV","IRR per period","Payback"],result.alternatives.map(a=>[a.label,a.standing,a.flows.map(x=>x===null||x===""?"unavailable":x).join(", "),formatted(a.npv),formatted(a.irr),formatted(a.payback)]))+
      table("Discount sensitivity, same cash flows",["Alternative","Rate minus 0.02","Entered rate","Rate plus 0.02"],result.sensitivity.map(a=>[a.id,...a.values.map(v=>(v.rate===null?"unavailable":v.rate.toFixed(4))+": "+formatted(v.result))]));
    host.querySelector("[data-clinical]").innerHTML=table("Clinical budget and capacity",["Measure","Result"],metricRows([["adoptedPopulation","Adopted population"],["budgetImpact","Incremental budget per period"],["capacityGap","Capacity gap"],["costPerOutcome","Reviewed incremental cost per outcome"]]))+
      table("Cost-consequence view",["Dimension","Unit","Baseline","Candidate","Standing","Change and evidence"],result.clinical.map(c=>[c.name,c.unit||"Unspecified",c.baseline??"unavailable",c.candidate??"unavailable",c.standing,formatted(c.delta)+(c.source?" / "+c.source:"")]));
    host.querySelector("[data-records]").innerHTML=table("Shared domain and record contract",["Domain","Record types present"],C.DOMAINS.map(d=>[d,[...new Set(result.records.filter(r=>r.domain===d).map(r=>r.type))].join(", ")||"No records supplied"]));
    host.querySelector("#analysis-capsule").value=capsule();
    host.dataset.stateFingerprint=C.fingerprint(state);
    window.dispatchEvent(new CustomEvent("investment-analysis-change"));
  }
  function status(text){host.querySelector("#analysis-status").textContent=text;}
  function accept(candidate,message) {
    const valid=C.validate(candidate);if(!valid.valid)throw new Error(valid.errors.slice(0,4).join(" "));
    state=C.clone(candidate);mount();status(message);
  }
  function importText(text){const candidate=C.importState(text);accept(candidate,"Imported state accepted. The contract, identities, and explicitly unavailable values are retained.");}
  function exportText(){const area=host.querySelector("#analysis-exchange");area.value=C.serialize(state);area.closest("details").open=true;area.focus();area.select();status("Portable JSON is selected. Copy it to carry this exact scenario into the other instrument.");}
  host.addEventListener("input",e=>{
    const key=e.target.dataset.key;if(!key||e.target.matches("select,[type=checkbox]"))return;
    state.inputs[key]=e.target.value;render();
  });
  host.addEventListener("change",async e=>{
    try{
      const key=e.target.dataset.key;
      if(key&&e.target.matches("select,[type=checkbox]")){state.inputs[key]=e.target.type==="checkbox"?e.target.checked:e.target.value;render();}
      if(e.target.id==="analysis-import"&&e.target.files?.[0]){const f=e.target.files[0];if(f.size>1000000)throw new Error("Choose a state file of at most 1 MB.");importText(await f.text());}
    }catch(error){status("Revision needed: "+error.message+" Accepted state remains available.");}
  });
  host.addEventListener("click",async e=>{
    const action=e.target.closest("[data-action]")?.dataset.action;if(!action)return;
    try {
      if(action==="reset"){const method=state.method;state=C.defaults();state.method=method;mount();status("Illustrative analysis restored.");}
      if(action==="apply"){const next=C.clone(state);for(const key of ["events","alternatives","outcomes","clinical"])next[key]=JSON.parse(host.querySelector('[data-editor="'+key+'"]').value);accept(next,"Matrix edits accepted.");}
      if(action==="export")exportText();
      if(action==="schema"){const area=host.querySelector("#analysis-exchange");area.value=JSON.stringify(C.schema(),null,2);area.closest("details").open=true;status("Showing the schema. Export analysis JSON to restore a portable state here.");}
      if(action==="import-text")importText(host.querySelector("#analysis-exchange").value);
      if(action==="copy"){exportText();status("Portable state is selected. Use your browser's Copy command.");}
      if(action==="staffing"){
        if(!window.investmentStaffing){status("Open the staffing instrument to supply its reference, or enter a supported internal-investment amount here.");return;}
        const snapshot=window.investmentStaffing.getState(),calculation=C.staffing(snapshot);
        if(calculation.status!=="known")throw new Error(calculation.problems.join(" "));
        if(state.inputs.currency!=="USD")throw new Error("The staffing reference is denominated in USD. Select USD or supply an explicit conversion separately.");
        state.inputs.internalInvestment=calculation.central;state.extensions["urn:investment:staffing-reference"]={snapshot,calculation};
        mount();status("Staffing reference retained in USD. Enter complete cash flows explicitly so the reference is included once.");
      }
    }catch(error){status("Revision needed: "+error.message+" Accepted state remains available.");}
  });
  window.investmentAnalysis=Object.freeze({
    getState:()=>C.clone(state), getResult:()=>C.clone(result), getProjection:()=>({contract:C.VERSION,fingerprint:C.fingerprint(state),state:C.clone(state),result:C.clone(result)}),
    setMethod(method){state.method=String(method);render();},
    importState:importText, serialize:()=>C.serialize(state), promptCapsule:capsule, fingerprint:()=>C.fingerprint(state)
  });
  const selection=window.crossFunctionalInvestmentModelStudio?.getState();
  if(selection)state.method=selection.activeModelId;
  let printClosed=[];
  window.addEventListener("beforeprint",()=>{printClosed=Array.from(host.querySelectorAll("details")).filter(d=>!d.open);printClosed.forEach(d=>d.open=true);});
  window.addEventListener("afterprint",()=>{printClosed.forEach(d=>d.open=false);printClosed=[];});
  host.hidden=false;mount();
})();
