/* Shared progressive analysis UI. Core owns meaning; each host owns its original instrument. */
(function () {
  "use strict";
  const C=window.InvestmentCore, host=document.querySelector("[data-investment-analysis]");
  if(!C||!host)return;
  const ACTION = Object.freeze({
    RESET: "reset", APPLY: "apply", EXPORT: "export", SCHEMA: "schema",
    IMPORT_TEXT: "import-text", COPY: "copy", STAFFING: "staffing", CLEAR_RECOVERY: "clear-recovery"
  });
  const EDITORS = Object.freeze(["events", "alternatives", "outcomes", "serviceOutcomes"]);
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
  let rejectedFileText = null;
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const titles={orientation:"Orientation",commercial:"Commercial cohort",pricing:"Pricing and implementation",capital:"Cash flow and capacity",serviceOutcomes:"Service and operational context",decision:"Decision and reversible gate"};
  const domainLabel = domain => domain === 'service-operational' ? 'Service and operational value' : domain;
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

  const sectionPrefix = host.dataset.sectionPrefix;
  const heading = (suffix, id, title) => '<span class="investment-kicker">'+esc(sectionPrefix+suffix)+' · '+esc(title)+'</span><h3 id="'+id+'" tabindex="-1">'+esc(title)+'</h3>';
  function mount() {
    host.innerHTML='<section class="investment-brief" aria-labelledby="analysis-brief-title">'+heading('A','analysis-brief-title','Read the accepted comparison')+'<div data-summary></div></section>'+
      '<div class="investment-actions"><button type="button" data-action="'+ACTION.RESET+'">Reset illustrative analysis</button><button type="button" data-action="'+ACTION.STAFFING+'">Use current staffing reference</button><button type="button" data-action="'+ACTION.EXPORT+'">Export analysis JSON</button><label for="analysis-import">Import analysis JSON<input id="analysis-import" type="file" accept=".json,application/json"></label></div>'+
      '<p id="analysis-status" role="status" aria-live="polite">Illustrative inputs loaded. Blank and explicit zero remain distinct. Outputs describe accepted state.</p>'+
      '<details><summary>'+heading('B','analysis-decision-title','Set the scenario and decision')+'</summary>'+group('orientation')+group('decision')+'</details>'+
      '<details><summary>'+heading('C','analysis-commercial-title','Trace commercial and implementation value')+'</summary>'+group('commercial')+group('pricing')+'<div data-commercial></div>'+editor('events','Lifecycle event graph','Each occurrence has an ID, period, evidence standing, and predecessor IDs. Branches and reactivation retain separate events.')+'</details>'+
      '<details><summary>'+heading('D','analysis-capital-title','Compare capital and service consequences')+'</summary>'+group('capital')+
      editor('alternatives','Alternatives and timed cash flows','Flows are incremental to the stated comparator: t=0 followed by equal end-of-period intervals. Include every intended cost once. Alternatives describe choices; the outcome tree carries probabilities.')+
      editor('outcomes','Mutually exclusive outcome tree','Each outcome has its own probability and cash flows. Supplied probabilities are retained. P50/P80 and empirical distributions require their separate models.')+
      '<div data-capital></div><h3 id="analysis-serviceOutcomes-title" tabindex="-1">Service and operational evidence</h3>'+group('serviceOutcomes')+
      editor('serviceOutcomes','Nine service / operational dimensions','Preserve each dimension. Supply its unit, baseline, candidate value, evidence standing, and source; reviewed observations also require the named reviewer and date.')+'<div data-serviceOutcomes></div></details>'+
      '<details><summary>'+heading('E','analysis-inspection-title','Inspect and carry the accepted account')+'</summary><p>The domain axis and record-type axis remain separate. Accountable people establish financial, service, and release decisions.</p><div data-records></div>'+
      '<p><a href="'+(methodHost?'#prompt-capsule-title':'#investment-capsule-title')+'">View the complete Prompt Capsule</a></p>'+
      '<label class="investment-editor" for="analysis-exchange"><strong>Portable state / schema output</strong><textarea id="analysis-exchange" rows="10" spellcheck="false"></textarea></label>'+
      '<div class="investment-actions"><button type="button" data-action="'+ACTION.IMPORT_TEXT+'">Import pasted state</button><button type="button" data-action="'+ACTION.COPY+'">Select portable state for copying</button><button type="button" data-action="'+ACTION.SCHEMA+'">Inspect JSON Schema</button><button type="button" data-action="'+ACTION.CLEAR_RECOVERY+'" hidden>Clear rejected file draft</button></div></details>'+
      '<div class="investment-actions"><button type="button" data-action="'+ACTION.APPLY+'">Apply lifecycle, alternative, outcome, and service-outcome edits</button></div>';
    render();
  }
  function unitText(unit, inputs) {
    return unit.replace(/currency/g, inputs.currency || 'currency unspecified').replace(/period/g, inputs.period);
  }
  function formatted(metric, inputs = state.inputs) {
    if (metric.status !== 'known') return metric.status + ': ' + metric.reason;
    return numberFormat.format(metric.value) + ' ' + unitText(metric.unit, inputs);
  }
  function metricCell(metric, inputs) {
    return metric.status === 'known'
      ? { amount: numberFormat.format(metric.value), qualifier: unitText(metric.unit, inputs) }
      : metric.status + ': ' + metric.reason + ' [' + unitText(metric.unit, inputs) + ']';
  }
  function literal(value) {
    // Long imported identifiers keep a local wrapping route; ordinary words stay intact.
    return String(value ?? '').split(/(\S{32,})/g).map((part, i) => i % 2
      ? '<span class="investment-identifier">' + esc(part) + '</span>' : esc(part)).join('');
  }
  function numericInput(value) {
    return value === null || (typeof value === 'string' && value.trim() === '') ? 'unavailable' : value;
  }
  function cellHtml(value) {
    if (value && typeof value === 'object' && 'amount' in value) {
      return '<span class="investment-number">'+esc(value.amount)+'</span> '+literal(value.qualifier);
    }
    if (Array.isArray(value)) return value.map(v => '<span class="investment-number">'+esc(numericInput(v))+'</span>').join(', ');
    return literal(value);
  }
  function table(caption, columns, rows, basis = '') {
    const headers = columns.map(column => typeof column === 'string' ? {label:column, role:'prose'} : column);
    return '<div class="investment-table-scroll" role="region" tabindex="0" aria-label="'+esc(caption)+'; scroll horizontally"><table><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(h=>'<th scope="col" data-label="'+esc(h.label)+'" data-column-role="'+h.role+'">'+esc(h.label)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>{
      const label = caption+': '+String(row.cells[0])+ (basis ? '; '+basis : '');
      return '<tr data-label="'+esc(label)+'"'+(row.key ? ' data-record-key="'+esc(row.key)+'"' : '')+'>'+row.cells.map((value,i)=>{
        const tag=i?'td':'th';
        return '<'+tag+(i?'':' scope="row"')+' data-label="'+esc(headers[i].label)+'" data-column-role="'+headers[i].role+'">'+cellHtml(value)+'</'+tag+'>';
      }).join('')+'</tr>';
    }).join('')+'</tbody></table></div>';
  }
  const col=(label,role='prose')=>({label,role});
  const row=(cells,key)=>({cells,key});
  function tablesFor(p) {
    const {state:s,result:r}=p, i=s.inputs;
    const measures=keys=>keys.map(([key,label])=>row([label,metricCell(r.metrics[key],i)],key));
    const basis=(i.currency||'currency unspecified')+' / '+i.period+'; '+s.origin;
    const definition=(caption,columns,rows)=>({caption,columns,rows,basis});
    return {
      summary:definition('Decision-changing measures',[col('Measure','identity'),col('Value and standing')],measures([['grr','Gross revenue retention'],['nrr','Net revenue retention'],['cac','Customer acquisition cost'],['expectedNpv','Expected NPV'],['budgetImpact','Incremental service budget impact']])),
      commercial:definition('Commercial cohort and price realization',[col('Measure','identity'),col('Result')],measures([['logoRetention','Customer retention, opening cohort'],['closingCustomers','Closing customers'],['closingRevenue','Closing recurring revenue'],['grr','GRR, opening cohort'],['nrr','NRR, opening cohort'],['cac','Acquisition spend / new customers'],['acquisitionRevenueRatio','Acquisition spend / new recurring revenue'],['cacPayback','Contribution-based acquisition payback'],['discountAmount','Per-unit discount'],['netPrice','Net price after discount and rebate'],['unitContribution','Net price less variable and service costs']])),
      events:definition('Lifecycle event graph',[col('Occurrence','identity'),col('Stage','identity'),col('Period','value'),col('Predecessors','identity'),col('Standing','status')],s.events.map(e=>row([e.id,e.kind,numericInput(e.period),e.predecessors.join(', ')||'Entry',e.standing],e.id))),
      alternatives:definition('Incremental alternatives',[col('Choice','identity'),col('Standing','status'),col('Cash flows from t=0','flows'),col('NPV','value'),col('IRR per period'),col('Payback')],r.alternatives.map(a=>row([a.label,a.standing,a.flows,metricCell(a.npv,i),metricCell(a.irr,i),metricCell(a.payback,i)],a.id))),
      sensitivity:definition('Discount sensitivity, same cash flows',[col('Alternative','identity'),col('Rate minus 0.02'),col('Entered rate'),col('Rate plus 0.02')],r.sensitivity.map(a=>row([a.id,...a.values.map(v=>(v.rate===null?'unavailable':v.rate.toFixed(4))+': '+formatted(v.result,i))],a.id))),
      serviceOutcomes:definition('Service budget and capacity',[col('Measure','identity'),col('Result')],measures([['adoptedPopulation','Adopted population'],['budgetImpact','Incremental budget per period'],['capacityGap','Capacity gap'],['costPerOutcome','Reviewed incremental cost per outcome']])),
      consequences:definition('Cost-consequence view',[col('Dimension','identity'),col('Unit','status'),col('Baseline','value'),col('Candidate','value'),col('Standing','status'),col('Change and evidence')],r.serviceOutcomes.map(c=>row([c.name,c.unit||'Unspecified',numericInput(c.baseline),numericInput(c.candidate),c.standing,formatted(c.delta,i)+(c.source?' / '+c.source:'')]))),
      records:definition('Shared domain and record contract',[col('Domain','identity'),col('Record types present')],C.DOMAINS.map(d=>row([domainLabel(d),[...new Set(r.records.filter(record=>record.domain===d).map(record=>record.type))].join(', ')||'Records remain open'],d)))
    };
  }
  const tableHtml = definition => table(definition.caption,definition.columns,definition.rows,definition.basis);
  function readings(p) {
    const {state:s,result:r}=p, i=s.inputs;
    const selected=r.alternatives.find(a=>a.id===i.option);
    return [
      {label:'Commercial cohort',value:'NRR '+formatted(r.metrics.nrr,i)+'; acquisition '+formatted(r.metrics.cac,i),target:'analysis-commercial-title',route:'Cohort, pricing, and implementation'},
      {label:'Capital comparison',value:selected?selected.label+': NPV '+formatted(selected.npv,i):'Selected option: '+i.option+'; compare the entered alternatives.',target:'analysis-capital-title',route:'Alternatives, cash flows, and sensitivity'},
      {label:'Service / operational evidence',value:'Budget impact '+formatted(r.metrics.budgetImpact,i)+'. '+r.serviceOutcomes.filter(c=>c.standing==='locally-verified').length+' of '+r.serviceOutcomes.length+' dimensions are recorded as locally verified.',target:'analysis-serviceOutcomes-title',route:'Costs, capacity, and consequence evidence'},
      {label:'Decision',value:r.gate+' / '+i.option+'. Owner: '+(i.owner||'Unspecified')+'. Next evidence: '+i.nextEvidence,target:'analysis-decision-title',route:'Decision owner, gate, and revisit'}
    ];
  }
  function summaryHtml(p) {
    const i=p.state.inputs;
    return '<p><strong>'+esc(i.label)+'</strong></p><p class="investment-basis">Accepted '+esc(p.state.origin)+' comparison · '+esc(i.currency||'currency unspecified')+' / '+esc(i.period)+' · contract '+esc(p.contract)+' · fingerprint '+esc(p.fingerprint)+'</p><p class="investment-decision"><strong>'+esc(p.result.gate)+'</strong> / '+esc(i.option)+' / '+esc(i.owner||'Decision owner remains open')+'</p><p>Next evidence: '+literal(i.nextEvidence)+'. Revisit: '+literal(i.revisit||'Unspecified')+'.</p><p class="investment-basis">Staffing remains a USD planning account. Entered cash flows, commercial measures, and service budget impact keep their separate ledger meanings.</p>';
  }
  function receiptsHtml(p, report = false) {
    return readings(p).map(reading=>'<div class="state-receipt"><dt>'+esc(reading.label)+'</dt><dd>'+literal(reading.value)+'</dd><dd class="state-receipt-route"><small><a href="#'+(report?'report-':'')+reading.target+'">'+esc(reading.route)+'</a></small></dd></div>').join('');
  }
  function reportHtml(p) {
    const t=tablesFor(p), i=p.state.inputs;
    const inputTable=groupName=>table(titles[groupName]+' inputs',[col('Input','identity'),col('Accepted value'),col('Unit / basis','identity')],Object.entries(C.FIELDS).filter(([,f])=>f.group===groupName).map(([key,f])=>row([f.label,f.type===C.FIELD_TYPE.NUMBER?numericInput(i[key]):i[key]===null||i[key]===''?'unavailable':String(i[key]),unitText(f.unit,i)],key)));
    const section=(id,title,body)=>'<section aria-labelledby="report-'+id+'"><h3 id="report-'+id+'">'+esc(title)+'</h3>'+body+'</section>';
    return '<section class="investment-analysis investment-report" aria-labelledby="report-investment-title" data-state-fingerprint="'+esc(p.fingerprint)+'"><h2 id="report-investment-title">Layered investment comparison</h2>'+summaryHtml(p)+'<p>Scenario: '+esc(p.state.scenarioId)+'. Method: '+esc(p.state.method)+'. Cash convention: '+esc(i.cashConvention)+'. Formula version: '+esc(C.FORMULA_VERSION)+'. The fingerprint identifies correspondence; authenticity follows its separate source review.</p><dl class="state-receipts">'+receiptsHtml(p,true)+'</dl>'+tableHtml(t.summary)+
      section('analysis-decision-title','Scenario, decision, and reversible gate',inputTable('orientation')+inputTable('decision'))+
      section('analysis-commercial-title','Commercial cohort, implementation, and lifecycle',inputTable('commercial')+inputTable('pricing')+tableHtml(t.commercial)+tableHtml(t.events))+
      section('analysis-capital-title','Capital, assumptions, and sensitivity',inputTable('capital')+tableHtml(t.alternatives)+table('Outcome tree: supplied probabilities and cash flows',[col('Outcome','identity'),col('Probability','value'),col('Cash flows from t=0','flows')],p.state.outcomes.map(o=>row([o.id,numericInput(o.probability),o.flows],o.id)),t.alternatives.basis)+tableHtml(t.sensitivity))+
      section('analysis-serviceOutcomes-title','Service and operational evidence',inputTable('serviceOutcomes')+tableHtml(t.serviceOutcomes)+tableHtml(t.consequences))+
      section('analysis-inspection-title','Domain records and exact accepted state',tableHtml(t.records)+'<p>The complete accepted state retains evidence sources, reviewer/date declarations, extensions, and exact inputs. The tables above format amounts for reading.</p><pre>'+esc(JSON.stringify(p.state,null,2))+'</pre>')+'</section>';
  }
  let capsuleView = "plain";
  let capsuleCache = { projection: null, markdown: new Map() };
  function capsule(view) {
    if (methodHost) return methodHost.promptCapsuleMarkdown(view);
    const requested = view ?? capsuleView;
    const active = requested === "skill-assisted" ? requested : "plain";
    if (capsuleCache.projection !== projection) capsuleCache = { projection, prepared: window.InvestmentCapsule.prepare(C, projection), markdown: new Map() };
    if (!capsuleCache.markdown.has(active)) capsuleCache.markdown.set(active, window.InvestmentCapsule.document(C, projection, active, capsuleCache.prepared));
    return capsuleCache.markdown.get(active);
  }
  function renderCapsule() {
    if (methodHost) return;
    document.getElementById("analysis-capsule").value = capsule();
    document.getElementById("analysis-capsule-status").textContent = (capsuleView === "plain" ? "Plain" : "Skill-assisted") + " Markdown carries accepted analysis " + identity + ". Pending drafts remain with their controls.";
  }
  function render() {
    const t=tablesFor(projection);
    host.querySelector('[data-summary]').innerHTML=summaryHtml(projection)+tableHtml(t.summary);
    host.querySelector('[data-commercial]').innerHTML=tableHtml(t.commercial)+tableHtml(t.events);
    host.querySelector('[data-capital]').innerHTML=tableHtml(t.alternatives)+tableHtml(t.sensitivity);
    host.querySelector('[data-serviceOutcomes]').innerHTML=tableHtml(t.serviceOutcomes)+tableHtml(t.consequences);
    host.querySelector('[data-records]').innerHTML=tableHtml(t.records);
    renderCapsule();
    host.dataset.stateFingerprint=identity;
    for (const input of host.querySelectorAll('[data-key]')) {
      input.closest('label').querySelector('small').textContent=unitText(C.FIELDS[input.dataset.key].unit,state.inputs);
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

  function setRejectedFileText(text) {
    rejectedFileText = text;
    host.querySelector('[data-action="' + ACTION.CLEAR_RECOVERY + '"]').hidden = text === null;
  }

  function clearRejectedFileDraft() {
    setRejectedFileText(null);
    const exchange = host.querySelector("#analysis-exchange");
    exchange.value = "";
    exchange.removeAttribute("aria-invalid");
    drafts.delete(exchange.id);
    status("Rejected file draft cleared. Accepted state remains available.");
  }

  function importText(text) {
    const accepted = accept(C.importState(text), "Imported state accepted. The contract, identities, and explicitly unavailable values are retained.", {
      inputKeys: Object.keys(C.FIELDS), editorKeys: EDITORS
    });
    const exchange = host.querySelector("#analysis-exchange");
    exchange.removeAttribute("aria-invalid");
    drafts.delete(exchange.id);
    status("Imported state accepted. The contract, identities, and explicitly unavailable values are retained.");
    setRejectedFileText(null);
    return accepted;
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
    accept({ ...state, ...edits }, "Lifecycle, alternative, outcome, and service-outcome edits accepted.", { editorKeys: EDITORS });
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
    let text;
    try {
      if (file.size > C.JSON_LIMITS.bytes) throw new Error("Choose a state file of at most 1 MB in UTF-8.");
      text = await file.text();
      if (request !== fileRequest || version !== interactionVersion) {
        if (request === fileRequest) status("A newer interaction took priority. Select the file again when ready to replace accepted state.");
        return;
      }
      importText(text);
    } catch (error) {
      if (request === fileRequest && version === interactionVersion) {
        const exchange = host.querySelector("#analysis-exchange");
        if (typeof text === "string") {
          setRejectedFileText(text);
          exchange.value = text;
          exchange.closest("details").open = true;
        }
        revisionNeeded(error, typeof text === "string" ? exchange : undefined);
      }
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
        case ACTION.CLEAR_RECOVERY:
          clearRejectedFileDraft();
          return;
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
      revisionNeeded(error, action === ACTION.IMPORT_TEXT ? host.querySelector("#analysis-exchange") : undefined);
    }
  });

  window.investmentAnalysis = Object.freeze({
    // Local recovery only: excluded from accepted state, capsules, reports, and diagnostics.
    getRejectedFileText: () => rejectedFileText,
    getState: () => C.clone(state),
    getResult: () => C.clone(result),
    getProjection: () => C.clone(projection),
    readProjection: () => projection,
    summaryHtml: () => summaryHtml(projection),
    receiptsHtml: () => receiptsHtml(projection),
    captureReport() {
      return Object.freeze({ contract: projection.contract, fingerprint: projection.fingerprint,
        html: reportHtml(projection),
        styles: document.querySelector('style[data-investment-analysis-source="collaboration/investment-analysis/studio.css"]').textContent });
    },
    setMethod(method, reason = "visitor-selected") {
      return accept({ ...state, method }, "Analysis and selected method agree.", { methodReason: reason });
    },
    importState: importText,
    serialize: () => serialized,
    promptCapsule: capsule,
    fingerprint: () => identity
  });
  const capsulePanel = document.querySelector('[data-analysis-capsule-panel]');
  if (capsulePanel) {
    capsulePanel.querySelector('[data-analysis-capsule-views]').hidden = false;
    capsulePanel.querySelector('[data-analysis-capsule-actions]').hidden = false;
    capsulePanel.addEventListener('change', event => {
      if (event.target.name !== 'analysis-capsule-view' || !event.target.checked) return;
      capsuleView = event.target.value;
      renderCapsule();
    });
    capsulePanel.addEventListener('click', async event => {
      const action = event.target.closest('[data-capsule-action]')?.dataset.capsuleAction;
      if (!action) return;
      const text = capsule();
      const receipt = document.getElementById('analysis-capsule-status');
      if (action === 'download') {
        const url = URL.createObjectURL(new Blob([text], {type:'text/markdown;charset=utf-8'}));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'initiative-investment-' + capsuleView + '.md';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        receipt.textContent = 'Markdown download carries the selected accepted capsule.';
        return;
      }
      if (action !== 'copy') return;
      try {
        await navigator.clipboard.writeText(text);
        receipt.textContent = 'Prompt Capsule copied. The captured Markdown is ready for its receiving decision.';
      } catch {
        const area = document.getElementById('analysis-capsule');
        area.focus(); area.select();
        receipt.textContent = 'Select the capsule text and use your browser Copy command.';
      }
    });
  }
  function revealFragment() {
    let id;
    try { id=decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target=document.getElementById(id);
    if (!target || !target.closest('.investment-analysis')) return;
    for (let parent=target.parentElement; parent; parent=parent.parentElement) {
      if (parent.tagName==='DETAILS') parent.open=true;
    }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'start',behavior:'instant'});
  }
  window.addEventListener('hashchange',revealFragment);
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');
    if (link && link.hash===location.hash && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) revealFragment();
  });
  let printClosed=[];
  const chapter=host.closest('.investment-analysis');
  window.addEventListener('beforeprint',()=>{
    if (printClosed.length) return;
    printClosed=Array.from(chapter.querySelectorAll('details')).filter(d=>!d.open);
    printClosed.forEach(d=>d.open=true);
  });
  window.addEventListener('afterprint',()=>{printClosed.forEach(d=>d.open=false);printClosed=[];});
  host.hidden=false;mount();revealFragment();
  window.dispatchEvent(new CustomEvent('investment-analysis-change'));
})();
