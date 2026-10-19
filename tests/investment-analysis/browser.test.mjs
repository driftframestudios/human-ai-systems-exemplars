import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createCanvasPackagePlan } from "../../tools/package-canvas-iframe-routes.mjs";
const root=fileURLToPath(new URL("../../",import.meta.url));
const routes=["collaboration/initiative-costing-calculator/index.html","collaboration/cross-functional-investment-model-studio/index.html"];
async function investmentServer(plan = null) {
  const packageIds = ["cross-functional-investment-studio", "cross-functional-investment-model-studio"];
  const server=http.createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
      if (plan && pathname.startsWith("/sandbox/")) {
        const id = pathname.slice("/sandbox/".length);
        const route = plan.contract.routes.find(route => route.id === id);
        if (!route || !packageIds.includes(id)) { res.writeHead(404); res.end(); return; }
        res.setHeader("Content-Type", "text/html");
        res.end('<!doctype html><title>Local receiver</title><iframe title="Investment instrument" sandbox="' + route.carrier_policy.sandbox_tokens.join(" ") + '" src="/packaged/' + id + '/index.html"></iframe>');
        return;
      }
      if (plan && pathname.startsWith("/packaged/")) {
        const bytes = plan.outputFiles.get(pathname.slice("/packaged/".length));
        if (!bytes) { res.writeHead(404); res.end(); return; }
        res.setHeader("Content-Type", "text/html"); res.end(bytes); return;
      }
      const file=path.resolve(root,"."+pathname);
      if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
      const body=await readFile(file);
      const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".json":"application/json",".png":"image/png",".jpg":"image/jpeg"};
      res.setHeader("Content-Type",types[path.extname(file)]||"application/octet-stream");res.end(body);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  return server;
}
test("both instruments retain state, labels, focus, recovery and semantic parity", {timeout:120000}, async()=>{
  const plan = await createCanvasPackagePlan();
  const packageIds = ["cross-functional-investment-studio", "cross-functional-investment-model-studio"];
  const server = await investmentServer(plan);
  const origin="http://127.0.0.1:"+server.address().port;
  const browser=await chromium.launch({headless:true});
  await mkdir(path.join(root,".visual-runs/investment-analysis"),{recursive:true});
  let exchanged;
  try{
    for(const [index,route] of routes.entries()){
      const context=await browser.newContext({viewport:{width:1440,height:1000}});
      const page=await context.newPage(),errors=[];
      page.setDefaultTimeout(5000);
      page.on("pageerror",error=>errors.push(error.message));
      await page.goto(origin+"/"+route);
      await page.locator("[data-investment-analysis]:not([hidden])").waitFor();
      const capsuleText = () => index === 0 ? page.locator('#analysis-capsule').inputValue() : page.locator('#promptCapsuleMarkdown').textContent();
      const baseline=await page.evaluate(()=>window.investmentAnalysis.getState());
      assert.equal(baseline.schemaVersion,"0.2.0");
      assert.equal(await page.evaluate(() => {
        const api = window.investmentAnalysis, first = api.readProjection(), detached = api.getProjection();
        detached.state.inputs.label = "caller-owned edit";
        return first === api.readProjection() && Object.isFrozen(first.state.inputs)
          && Object.isFrozen(first.result.alternatives[0].flows) && api.getState().inputs.label !== detached.state.inputs.label;
      }), true);
      if (index === 0) {
        const snapshot = await page.evaluate(() => window.investmentStaffing.getState());
        assert.equal(Object.hasOwn(snapshot.activities[0], "c"), false);
        await page.getByRole("group", { name: "Rotate interpretive lens", exact: true })
          .getByRole("button", { name: "Affected people", exact: true }).click();
        assert.deepEqual(await page.evaluate(() => window.investmentStaffing.getState()), snapshot);
      }
      await page.locator("[data-investment-analysis] details").evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      await page.locator("#analysis-newCustomers").fill("");
      assert.equal(await page.evaluate(()=>window.investmentAnalysis.getResult().metrics.cac.status),"unavailable");
      assert.equal(await page.locator("#analysis-newCustomers").evaluate(e=>e===document.activeElement),true);
      await page.locator("#analysis-newCustomers").fill("40");
      assert.equal(await page.evaluate(()=>window.investmentAnalysis.getResult().metrics.cac.value),250);
      assert.match(await capsuleText(),/250 USD\/customer/);
      const beforeDraft = await page.evaluate(() => window.investmentAnalysis.serialize());
      await page.locator("#analysis-label").fill("x".repeat(2001));
      assert.equal(await page.evaluate(() => window.investmentAnalysis.serialize()), beforeDraft);
      assert.equal(await page.locator("#analysis-label").getAttribute("aria-invalid"), "true");
      assert.equal(await page.locator("#analysis-label").evaluate(el => el === document.activeElement), true);
      assert.match(await page.locator("#analysis-status").textContent(), /draft control/);
      await page.locator("#analysis-label").fill(baseline.inputs.label);
      assert.equal(await page.locator("#analysis-label").getAttribute("aria-invalid"), null);

      const editedEvents = await page.evaluate(() => window.investmentAnalysis.getState().events);
      editedEvents[0].kind = "Revised acquisition";
      await page.locator("#analysis-events").fill(JSON.stringify(editedEvents));
      await page.locator('[data-action="apply"]').click();
      assert.equal(await page.locator('[data-action="apply"]').evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator("[data-investment-analysis] details[open]").count(), 4);
      assert.equal(await page.evaluate(() => window.investmentAnalysis.getState().events[0].kind), "Revised acquisition");

      await page.locator("#analysis-currency").fill("");
      assert.equal(await page.evaluate(() => window.investmentAnalysis.getResult().sensitivity.every(a => a.values.every(v => v.result.status === "unavailable" && v.result.unit === "currency"))), true);
      await page.locator("#analysis-currency").fill("USD");
      const accepted=await page.evaluate(()=>window.investmentAnalysis.serialize());
      assert.equal(await page.evaluate(() => {
        const api = window.investmentAnalysis, saved = api.serialize();
        for (const kind of ["inherited-key", "long-number"]) {
          const candidate = api.getState();
          if (kind === "inherited-key") candidate.inputs.toString = "extra";
          else candidate.inputs.newCustomers = "9".repeat(10000) + "x";
          try { api.importState(JSON.stringify(candidate)); return false; } catch {}
          if (api.serialize() !== saved) return false;
        }
        return true;
      }), true);
      await page.locator("#analysis-exchange").fill('{"schemaVersion":"99"}');
      await page.locator('[data-action="import-text"]').click();
      assert.match(await page.locator("#analysis-status").textContent(),/Accepted state remains/);
      assert.equal(await page.evaluate(()=>window.investmentAnalysis.serialize()),accepted);
      assert.equal(await page.locator('[data-action="import-text"]').evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator("[data-investment-analysis] details[open]").count(), 4);
      await page.locator("#analysis-exchange").fill(accepted);
      await page.locator('[data-action="import-text"]').click();
      assert.equal(await page.locator('[data-action="import-text"]').evaluate(el => el === document.activeElement), true);
      assert.equal(await page.locator("[data-investment-analysis] details[open]").count(), 4);
      if(index===0)exchanged=accepted;
      else {
        await page.evaluate(text=>window.investmentAnalysis.importState(text),exchanged);
        assert.equal(await page.evaluate(()=>window.investmentAnalysis.serialize()),exchanged);
        const old=await page.evaluate(()=>window.crossFunctionalInvestmentModelStudio.promptCapsuleFingerprint());
        await page.locator("[data-investment-analysis] details").evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
        await page.locator("#analysis-listPrice").fill("1100");
        assert.notEqual(await page.evaluate(()=>window.crossFunctionalInvestmentModelStudio.promptCapsuleFingerprint()),old);
        assert.match(await page.evaluate(()=>window.crossFunctionalInvestmentModelStudio.promptCapsule()),/Investment comparison/);
        const methods = await page.locator('[role="tab"][data-model-id]').evaluateAll(nodes => nodes.map(n => n.dataset.modelId));
        const directMethod = methods.at(-1);
        await page.evaluate(method => window.crossFunctionalInvestmentModelStudio.selectMethod(method), directMethod);
        assert.equal(await page.evaluate(() => window.investmentAnalysis.getState().method), directMethod);
        assert.equal(await page.evaluate(() => window.crossFunctionalInvestmentModelStudio.getState().activeModelId), directMethod);
        const next = await page.evaluate(() => window.investmentAnalysis.getState());
        next.method = methods.find(method => method !== next.method);
        await page.evaluate(text => window.investmentAnalysis.importState(text), JSON.stringify(next));
        assert.equal(await page.evaluate(() => window.crossFunctionalInvestmentModelStudio.getState().activeModelId), next.method);
        assert.equal(await page.locator('[role="tab"][aria-selected="true"]').getAttribute("data-model-id"), next.method);
        const stable = await page.evaluate(() => window.investmentAnalysis.serialize());
        const rejection = await page.evaluate(() => {
          const next = window.investmentAnalysis.getState();
          next.method = "model/unsupported.v1";
          try { window.investmentAnalysis.importState(JSON.stringify(next)); }
          catch (error) { return error.message; }
        });
        assert.match(rejection, /eight methods/);
        assert.equal(await page.evaluate(() => window.investmentAnalysis.serialize()), stable);
        assert.equal(await page.evaluate(() => window.crossFunctionalInvestmentModelStudio.getState().activeModelId), next.method);
        await page.locator('[role="tab"][data-model-id="' + methods[0] + '"]').click();
        assert.equal(await page.evaluate(() => window.investmentAnalysis.getState().method), methods[0]);
      }
      await page.evaluate(() => {
        const original = File.prototype.text;
        File.prototype.text = function () {
          return new Promise(resolve => {
            window.finishInvestmentFileRead = () => {
              File.prototype.text = original;
              resolve(window.investmentAnalysis.serialize());
            };
          });
        };
      });
      await page.locator("#analysis-import").setInputFiles({ name: "state.json", mimeType: "application/json", buffer: Buffer.from(accepted) });
      await page.waitForFunction(() => typeof window.finishInvestmentFileRead === "function");
      await page.locator("#analysis-owner").fill("Later interaction");
      await page.evaluate(() => window.finishInvestmentFileRead());
      await page.waitForFunction(() => document.querySelector("#analysis-status").textContent.includes("newer interaction took priority"));
      assert.equal(await page.evaluate(() => window.investmentAnalysis.getState().inputs.owner), "Later interaction");
      for(const width of [390,1440,2560]){
        await page.setViewportSize({width,height:1000});
        const geometry=await page.locator('.investment-analysis[aria-labelledby="investment-analysis-title"]').evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,width:innerWidth}));
        assert.ok(geometry.left>=-1&&geometry.right<=geometry.width+1,"analysis stays within viewport");
        const unlabeled=await page.locator(".investment-analysis input,.investment-analysis select,.investment-analysis textarea").evaluateAll(nodes=>nodes.filter(n=>!n.labels?.length).map(n=>n.id));
        assert.deepEqual(unlabeled,[]);
      }
      await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});
      assert.equal(await page.locator("#analysis-newCustomers").isVisible(),true);
      await page.emulateMedia({media:"print",forcedColors:"none"});
      await page.evaluate(()=>dispatchEvent(new Event("beforeprint")));
      assert.equal(await page.locator("[data-investment-analysis] details:not([open])").count(),0);
      await page.evaluate(()=>dispatchEvent(new Event("afterprint")));
      await page.emulateMedia({media:"screen"});
      await page.setViewportSize({width:1440,height:1000});
      await page.locator('.investment-analysis[aria-labelledby="investment-analysis-title"]').screenshot({path:path.join(root,".visual-runs/investment-analysis/instrument-"+index+".png")});
      assert.deepEqual(errors,[]);
      await context.close();
      const nojs=await browser.newContext({javaScriptEnabled:false}),p=await nojs.newPage();
      await p.goto(origin+"/"+route);
      assert.equal(await p.locator("#investment-analysis-title").isVisible(),true);
      assert.ok(await p.locator(".investment-analysis table").count()>0);
      await nojs.close();
    }
    for (const id of packageIds) {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const errors = [], requests = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => requests.push(new URL(request.url()).pathname));
      await page.goto(origin + "/sandbox/" + id);
      const frame = page.frameLocator("iframe");
      await frame.locator("[data-investment-analysis]:not([hidden])").waitFor();
      await frame.locator("[data-investment-analysis] details").evaluateAll(nodes => nodes.forEach(node => node.open = true));
      await frame.locator("#analysis-label").fill("Packaged scenario");
      const packet = id === 'cross-functional-investment-studio' ? await frame.locator('#analysis-capsule').inputValue() : await frame.locator('#promptCapsuleMarkdown').textContent();
      assert.match(packet, /Packaged scenario/);
      await frame.locator('[data-action="export"]').click();
      assert.equal(JSON.parse(await frame.locator("#analysis-exchange").inputValue()).inputs.label, "Packaged scenario");
      assert.equal(await frame.locator("[data-investment-analysis] details[open]").count(), 4);
      assert.ok(requests.every(request => !/investment-(?:core|studio)\.(?:js|css)/.test(request)));
      assert.deepEqual(errors, []);
      await context.close();
    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test("investment file provenance recovery preserves accepted capsule and report identities", { timeout: 60000 }, async () => {
  const server = await investmentServer();
  const origin = "http://127.0.0.1:" + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const [index, route] of routes.entries()) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      try {
        const page = await context.newPage(), errors = [];
        page.setDefaultTimeout(5000);
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(origin + "/" + route);
        await page.locator("[data-investment-analysis]:not([hidden])").waitFor();
        const outputs = () => page.evaluate(() => {
          const api = window.investmentAnalysis;
          return { serialized: api.serialize(), fingerprint: api.fingerprint(),
            capsule: api.promptCapsule(), report: api.captureReport() };
        });
        const carrier = () => index === 0 ? page.locator("#analysis-capsule").inputValue()
          : page.locator("#promptCapsuleMarkdown").textContent();
        const baseline = await outputs(), baselineCarrier = await carrier();
        const rejected = JSON.parse(baseline.serialized);
        rejected.inputs.label = "Local Unicode \u03a9 recovery";
        rejected.inputs.evidenceSource = ("https://" + "notion.so/synthetic-rejected-record");
        const raw = JSON.stringify(rejected, null, 2).replace(/\n/g, "\r\n");
        const upload = () => page.locator("#analysis-import").setInputFiles({
          name: "synthetic-provenance.json", mimeType: "application/json", buffer: Buffer.from(raw, "utf8")
        });
        await upload();
        await page.waitForFunction(text => window.investmentAnalysis.getRejectedFileText() === text, raw);
        const exchange = page.getByLabel("Portable state / schema output", { exact: true });
        assert.equal(await exchange.inputValue(), raw.replace(/\r\n/g, "\n"));
        assert.equal(await exchange.getAttribute("aria-invalid"), "true");
        assert.equal(await exchange.evaluate(node => node.closest("details").open), true);
        assert.equal(await page.getByRole("button", { name: "Clear rejected file draft", exact: true }).isVisible(), true);
        const diagnostic = await page.locator("#analysis-status").textContent();
        assert.match(diagnostic, /inputs\.evidenceSource/);
        assert.ok(!diagnostic.includes(rejected.inputs.evidenceSource));
        assert.deepEqual(await outputs(), baseline);
        assert.equal(await carrier(), baselineCarrier);
        assert.ok(!JSON.stringify(baseline).includes(rejected.inputs.evidenceSource));

        if (index === 0) {
          await page.locator("summary").filter({ hasText: /^Inspect source rules and override standing$/ }).click();
          const rules = page.locator("#staffing-heuristics table");
          assert.equal(await rules.isVisible(), true);
          const rows = await rules.locator("tbody tr").allTextContents();
          assert.equal(rows.length, 6);
          const fixed = "Source coefficients fixed; scenario inputs editable; coefficient overrides unsupported.";
          assert.ok(rows.every(row => row.includes(fixed)));
          assert.equal(rows.filter(row => row.includes("authored-unit-convention")).length, 1);
          assert.equal(rows.filter(row => row.includes("authored-planning-heuristic")).length, 3);
          assert.equal(rows.filter(row => row.includes("illustrative-attention")).length, 1);
          assert.equal(rows.filter(row => row.includes("presentation-rule")).length, 1);
          const popup = context.waitForEvent("page");
          await page.getByRole("button", { name: "Open report in a new tab", exact: true }).click();
          const report = await popup;
          await report.waitForLoadState("domcontentloaded");
          const reportRows = await report.locator("table").filter({ hasText: fixed }).locator("tbody tr").allTextContents();
          assert.deepEqual(reportRows, rows);
          assert.equal(await report.locator(".investment-report").getAttribute("data-state-fingerprint"), baseline.fingerprint);
          assert.ok(!(await report.locator("body").textContent()).includes(rejected.inputs.evidenceSource));
          await report.close();
        }

        const corrected = { ...rejected, inputs: { ...rejected.inputs,
          evidenceSource: "urn:source-key:investment-method:activity-based" } };
        await exchange.fill(JSON.stringify(corrected, null, 2));
        assert.equal(await page.evaluate(() => window.investmentAnalysis.getRejectedFileText()), raw);
        await page.getByRole("button", { name: "Import pasted state", exact: true }).click();
        const accepted = await outputs();
        assert.deepEqual(JSON.parse(accepted.serialized), corrected);
        assert.notEqual(accepted.fingerprint, baseline.fingerprint);
        assert.equal(accepted.report.fingerprint, accepted.fingerprint);
        assert.ok(accepted.capsule.includes(corrected.inputs.label));
        assert.ok(accepted.report.html.includes(corrected.inputs.label));
        assert.ok(!JSON.stringify(accepted).includes(rejected.inputs.evidenceSource));
        assert.equal(await page.evaluate(() => window.investmentAnalysis.getRejectedFileText()), null);
        assert.equal(await exchange.getAttribute("aria-invalid"), null);
        assert.equal(await page.getByRole("button", { name: "Clear rejected file draft", exact: true }).count(), 0);
        assert.notEqual(await carrier(), baselineCarrier);

        await upload();
        await page.waitForFunction(text => window.investmentAnalysis.getRejectedFileText() === text, raw);
        await page.getByRole("button", { name: "Clear rejected file draft", exact: true }).click();
        assert.equal(await page.evaluate(() => window.investmentAnalysis.getRejectedFileText()), null);
        assert.equal(await exchange.inputValue(), "");
        assert.deepEqual(await outputs(), accepted);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
