/* Shared progressive analysis UI. Core owns meaning; each host owns its original instrument. */
(function () {
  "use strict";
  const C=window.InvestmentCore, host=document.querySelector("[data-investment-analysis]");
  if(!C||!host)return;
  const ACTION = Object.freeze({
    RESET: "reset", APPLY: "apply", EXPORT: "export", SCHEMA: "schema",
    IMPORT_TEXT: "import-text", COPY: "copy", STAFFING: "staffing"
  });
  const EDITORS = Object.freeze(["events", "alternatives", "outcomes", "clinical"]);
  const methodHost = window.crossFunctionalInvestmentModelStudio;
  const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
  const drafts = new Set();
  const initial = C.defaults();
  if (methodHost) initial.method = methodHost.getState().activeModelId;
  const first = C.prepare(initial);
  let state = first.state, result = first.result, serialized = first.serialized, identity = first.fingerprint;
  let projection = Object.freeze({ contract: C.VERSION, fingerprint: identity, state, result });
  let interactionVersion = 0;
  let fileRequest = 0;
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const titles={orientation:"Orientation",commercial:"Commercial cohort",pricing:"Pricing and implementation",capital:"Cash flow and capacity",clinical:"Clinical and operational context",decision:"Decision and reversible gate"};
  function control(key,f) {
    const id="analysis-"+key,value=state.inputs[key];
    let input;
    if(f.type===C.FIELD_TYPE.BOOLEAN)input='<input id="'+id+'" data-key="'+key+'" type="checkbox" '+(value?"checked":"")+'>';
    else if(f.type===C.FIELD_TYPE.SELECT)input='<select id="'+id+'" data-key="'+key+'">'+f.options.map(x=>'<option '+(x===value?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select>';
    else input='<input id="'+id+'" data-key="'+key+'" type="'+(f.type===C.FIELD_TYPE.NUMBER?"number":f.unit==="date"?"date":"text")+'" '+(f.type===C.FIELD_TYPE.NUMBER?'step="any" '+(f.min!==null&&f.min!==undefined?'min="'+f.min+'" ':"")+(f.max!==undefined?'max="'+f.max+'" ':""):"")+'value="'+esc(value)+'">';
    return '<label class="investment-field" for="'+id+'"><span>'+esc(f.label)+'</span>'+input+'<small>'+esc(f.unit.replace(/currency/g,state.inputs.currency||"currency").replace(/period/g,state.inputs.period))+'</small></label>';
  }
  function group(name) {return '<fieldset><legend>'+titles[name]+'</legend><div class="investment-fields">'+Object.entries(C.FIELDS).filter(([,f])=>f.group===name).map(([k,f])=>control(k,f)).join("")+'</div></fieldset>';}
  function editor(key,label,note) {return '<label class="investment-editor" for="analysis-'+key+'"><strong>'+label+'</strong><span>'+note+'</span><textarea id="analysis-'+key+'" data-editor="'+key+'" rows="8" spellcheck="false">'+esc(JSON.stringify(state[key],null,2))+'</textarea></label>';}
  function mount() {
    host.innerHTML='<div class="investment-intro"><p class="investment-kicker">Local calculation / explicit evidence / revisable decisions</p><h3>Compare what changes the decision.</h3><p>Begin with the illustrative fixture, edit the assumptions, then carry the same state into either instrument. Every amount belongs to its stated currency and period. Clinical dimensions keep their own evidence and human review.</p></div>'+
      '<div class="investment-actions"><button type="button" data-action="'+ACTION.RESET+'">Reset illustrative analysis</button><button type="button" data-action="'+ACTION.STAFFING+'">Use current staffing reference</button><button type="button" data-action="'+ACTION.EXPORT+'">Export analysis JSON</button><label for="analysis-import">Import analysis JSON<input id="analysis-import" type="file" accept=".json,application/json"></label></div>'+
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
      '<div class="investment-actions"><button type="button" data-action="'+ACTION.IMPORT_TEXT+'">Import pasted state</button><button type="button" data-action="'+ACTION.COPY+'">Select portable state for copying</button><button type="button" data-action="'+ACTION.SCHEMA+'">Inspect JSON Schema</button></div></details>'+
      '<div class="investment-actions"><button type="button" data-action="'+ACTION.APPLY+'">Apply lifecycle, alternative, outcome, and clinical edits</button></div>';
    render();
  }
  function formatted(r) {
    if(r.status!=="known")return r.status+": "+r.reason;
    const v=numberFormat.format(r.value);
    return v+" "+r.unit.replace(/currency/g,state.inputs.currency).replace(/period/g,state.inputs.period);
  }
  function table(caption,headers,rows) {
    return '<div class="investment-table-scroll" role="region" tabindex="0" aria-label="'+esc(caption)+'; scroll horizontally"><table><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,i)=>'<'+(i?"td":"th scope=\"row\"")+'>'+esc(v)+'</'+(i?"td":"th")+'>').join("")+'</tr>').join("")+'</tbody></table></div>';
  }
  function metricRows(keys){return keys.map(([key,label])=>[label,formatted(result.metrics[key])]);}
  function capsule() {
    return ["# Investment comparison",state.inputs.label,
      "Standing: "+state.origin+". Method: "+state.method+". Contract: "+C.VERSION+". State identity: "+identity+".",
      "Currency / period: "+state.inputs.currency+" / "+state.inputs.period+". "+state.inputs.cashConvention,
      "Decision owner: "+(state.inputs.owner||"Unspecified")+". Gate: "+result.gate+". Next option: "+state.inputs.option+".",
      "Next evidence: "+state.inputs.nextEvidence+". Revisit: "+(state.inputs.revisit||"Unspecified")+".",
      "Five domains: "+C.DOMAINS.join(", ")+". Five record types: "+C.TYPES.join(", ")+".",
      ...Object.entries(result.metrics).map(([k,v])=>k+": "+formatted(v)),
      ...result.alternatives.map(a=>a.label+": NPV "+formatted(a.npv)+"; IRR "+formatted(a.irr)+"; payback "+formatted(a.payback)),
      "Evidence and authority: the source identifies product or workflow context; causal benefit and local applicability require their own observations.",
      "Cash-flow amounts are complete scenario inputs. Pricing, staffing references, reserves, and clinical budget impacts remain separate views until a named transformation joins them.",
      "Clinical cost-consequence: "+result.clinical.map(c=>c.name+" "+formatted(c.delta)).join("; "),
      "Portable state:\n"+serialized].join("\n\n");
  }
  function render() {
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
    host.dataset.stateFingerprint=identity;
    for (const input of host.querySelectorAll("[data-key]")) {
      const field = C.FIELDS[input.dataset.key];
      input.closest("label").querySelector("small").textContent = field.unit
        .replace(/currency/g, state.inputs.currency || "currency").replace(/period/g, state.inputs.period);
    }
  }
  function status(text) {
    const remaining = drafts.size
      ? " " + drafts.size + " draft control(s) remain available for revision; outputs and export describe accepted state."
      : "";
    host.querySelector("#analysis-status").textContent = text + remaining;
  }

  function syncControls(inputKeys, editorKeys) {
    for (const key of inputKeys) {
      const input = host.querySelector('[data-key="' + key + '"]');
      const value = state.inputs[key];
      if (input.type === "checkbox") input.checked = value;
      else if (input.value !== String(value ?? "")) input.value = value ?? "";
      input.removeAttribute("aria-invalid");
      drafts.delete(input.id);
    }
    for (const key of editorKeys) {
      const editor = host.querySelector('[data-editor="' + key + '"]');
      editor.value = JSON.stringify(state[key], null, 2);
      editor.removeAttribute("aria-invalid");
      drafts.delete(editor.id);
    }
  }

  function accept(candidate, message, { inputKeys = [], editorKeys = [], methodReason = "analysis-state-accepted" } = {}) {
    const prepared = C.prepare(candidate);
    if (methodHost && !methodHost.supportsMethod(prepared.state.method)) throw new Error("Choose one of this studio's eight methods before importing this analysis. The source JSON remains available for revision.");
    state = prepared.state;
    result = prepared.result;
    serialized = prepared.serialized;
    identity = prepared.fingerprint;
    projection = Object.freeze({ contract: C.VERSION, fingerprint: identity, state, result });
    interactionVersion++;
    syncControls(inputKeys, editorKeys);
    render();
    status(message);
    window.dispatchEvent(new CustomEvent("investment-analysis-change", { detail: { reason: methodReason } }));
    return true;
  }

  function importText(text) {
    return accept(C.importState(text), "Imported state accepted. The contract, identities, and explicitly unavailable values are retained.", {
      inputKeys: Object.keys(C.FIELDS), editorKeys: EDITORS
    });
  }

  function exportText() {
    const area = host.querySelector("#analysis-exchange");
    area.value = serialized;
    area.closest("details").open = true;
    area.focus();
    area.select();
    status("Accepted portable JSON is selected. Use your browser's Copy command to carry this exact scenario into the other instrument.");
  }

  function revisionNeeded(error, input) {
    if (input) {
      drafts.add(input.id);
      input.setAttribute("aria-invalid", "true");
    }
    status("Revision needed: " + error.message + " Accepted state remains available.");
  }

  function editInput(input) {
    const key = input.dataset.key;
    try {
      if (!Object.hasOwn(C.FIELDS, key)) throw new Error("Choose a declared analysis field.");
      if (input.validity.badInput) throw new Error("Supply a complete value, or clear the field to represent unavailable input.");
      const value = input.type === "checkbox" ? input.checked : input.value;
      const candidate = { ...state, inputs: { ...state.inputs, [key]: value } };
      accept(candidate, "Input accepted.", { inputKeys: [key] });
    } catch (error) { revisionNeeded(error, input); }
  }

  function applyEditors() {
    const edits = {};
    for (const key of EDITORS) {
      const editor = host.querySelector('[data-editor="' + key + '"]');
      try { edits[key] = C.parseJson(editor.value); }
      catch (error) { revisionNeeded(error, editor); return; }
    }
    accept({ ...state, ...edits }, "Lifecycle, alternative, outcome, and clinical edits accepted.", { editorKeys: EDITORS });
  }

  function useStaffing() {
    if (!window.investmentStaffing) {
      status("Open the staffing instrument to supply its reference, or enter a supported internal-investment amount here.");
      return;
    }
    const snapshot = window.investmentStaffing.getState();
    const calculation = C.staffing(snapshot);
    if (calculation.status !== "known") throw new Error(calculation.problems.join(" "));
    if (state.inputs.currency !== calculation.currency) {
      throw new Error("The staffing reference is denominated in " + C.STAFFING_CURRENCY + ". Select that currency or supply an explicit conversion separately.");
    }
    const candidate = {
      ...state,
      inputs: { ...state.inputs, internalInvestment: calculation.central },
      extensions: { ...state.extensions, "urn:investment:staffing-reference": { snapshot, calculation } }
    };
    accept(candidate, "Staffing reference retained in " + C.STAFFING_CURRENCY + ". Enter complete cash flows explicitly so the reference is included once.", {
      inputKeys: ["internalInvestment"]
    });
  }

  host.addEventListener("input", event => {
    interactionVersion++;
    const input = event.target;
    if (input.dataset.editor) {
      drafts.add(input.id);
      input.removeAttribute("aria-invalid");
      status("Matrix draft retained. Apply the four editor groups together when ready.");
      return;
    }
    if (input.dataset.key && !input.matches("select,[type=checkbox]")) editInput(input);
  });

  host.addEventListener("change", async event => {
    const input = event.target;
    interactionVersion++;
    if (input.dataset.key && input.matches("select,[type=checkbox]")) {
      editInput(input);
      return;
    }
    if (input.id !== "analysis-import" || !input.files?.[0]) return;
    const request = ++fileRequest;
    const version = interactionVersion;
    const file = input.files[0];
    try {
      if (file.size > C.JSON_LIMITS.bytes) throw new Error("Choose a state file of at most 1 MB in UTF-8.");
      const text = await file.text();
      if (request !== fileRequest || version !== interactionVersion) {
        if (request === fileRequest) status("A newer interaction took priority. Select the file again when ready to replace accepted state.");
        return;
      }
      importText(text);
    } catch (error) {
      if (request === fileRequest && version === interactionVersion) revisionNeeded(error);
    } finally {
      if (request === fileRequest) input.value = "";
    }
  });

  host.addEventListener("click", event => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    interactionVersion++;
    try {
      switch (action) {
        case ACTION.RESET: {
          const candidate = C.defaults();
          candidate.method = state.method;
          accept(candidate, "Illustrative analysis restored.", { inputKeys: Object.keys(C.FIELDS), editorKeys: EDITORS });
          return;
        }
        case ACTION.APPLY:
          applyEditors();
          return;
        case ACTION.EXPORT:
        case ACTION.COPY:
          exportText();
          return;
        case ACTION.SCHEMA: {
          const area = host.querySelector("#analysis-exchange");
          area.value = JSON.stringify(C.schema(), null, 2);
          area.closest("details").open = true;
          status("Showing the schema. Export analysis JSON to select the accepted portable state.");
          return;
        }
        case ACTION.IMPORT_TEXT:
          importText(host.querySelector("#analysis-exchange").value);
          return;
        case ACTION.STAFFING:
          useStaffing();
      }
    } catch (error) {
      revisionNeeded(error);
    }
  });

  window.investmentAnalysis = Object.freeze({
    getState: () => C.clone(state),
    getResult: () => C.clone(result),
    getProjection: () => C.clone(projection),
    readProjection: () => projection,
    setMethod(method, reason = "visitor-selected") {
      return accept({ ...state, method }, "Analysis and selected method agree.", { methodReason: reason });
    },
    importState: importText,
    serialize: () => serialized,
    promptCapsule: capsule,
    fingerprint: () => identity
  });
  let printClosed=[];
  window.addEventListener("beforeprint",()=>{printClosed=Array.from(host.querySelectorAll("details")).filter(d=>!d.open);printClosed.forEach(d=>d.open=true);});
  window.addEventListener("afterprint",()=>{printClosed.forEach(d=>d.open=false);printClosed=[];});
  host.hidden=false;mount();
  window.dispatchEvent(new CustomEvent("investment-analysis-change"));
})();
