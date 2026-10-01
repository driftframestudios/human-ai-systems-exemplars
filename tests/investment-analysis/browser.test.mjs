import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
const root=fileURLToPath(new URL("../../",import.meta.url));
const routes=["collaboration/initiative-costing-calculator/index.html","collaboration/cross-functional-investment-model-studio/index.html"];
test("both instruments retain state, labels, focus, recovery and semantic parity", {timeout:120000}, async()=>{
  const server=http.createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
      const file=path.resolve(root,"."+pathname);
      if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
      const body=await readFile(file);
      const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".json":"application/json",".png":"image/png",".jpg":"image/jpeg"};
      res.setHeader("Content-Type",types[path.extname(file)]||"application/octet-stream");res.end(body);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin="http://127.0.0.1:"+server.address().port;
  const browser=await chromium.launch({headless:true});
  await mkdir(path.join(root,".visual-runs/investment-analysis"),{recursive:true});
  let exchanged;
  try{
    for(const [index,route] of routes.entries()){
      const context=await browser.newContext({viewport:{width:1440,height:1000}});
      const page=await context.newPage(),errors=[];
      page.on("pageerror",error=>errors.push(error.message));
      await page.goto(origin+"/"+route);
      await page.locator("[data-investment-analysis]:not([hidden])").waitFor();
      const baseline=await page.evaluate(()=>window.investmentAnalysis.getState());
      assert.equal(baseline.schemaVersion,"0.1.0");
      await page.locator(".investment-analysis details").evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      await page.locator("#analysis-newCustomers").fill("");
      assert.equal(await page.evaluate(()=>window.investmentAnalysis.getResult().metrics.cac.status),"unavailable");
      assert.equal(await page.locator("#analysis-newCustomers").evaluate(e=>e===document.activeElement),true);
      await page.locator("#analysis-newCustomers").fill("40");
      assert.equal(await page.evaluate(()=>window.investmentAnalysis.getResult().metrics.cac.value),250);
      assert.match(await page.locator("#analysis-capsule").inputValue(),/250 USD\/customer/);
      const accepted=await page.evaluate(()=>window.investmentAnalysis.serialize());
      await page.locator("#analysis-exchange").fill('{"schemaVersion":"99"}');
      await page.locator('[data-action="import-text"]').click();
      assert.match(await page.locator("#analysis-status").textContent(),/Accepted state remains/);
      assert.equal(await page.evaluate(()=>window.investmentAnalysis.serialize()),accepted);
      if(index===0)exchanged=accepted;
      else {
        await page.evaluate(text=>window.investmentAnalysis.importState(text),exchanged);
        assert.equal(await page.evaluate(()=>window.investmentAnalysis.serialize()),exchanged);
        const old=await page.evaluate(()=>window.crossFunctionalInvestmentModelStudio.promptCapsuleFingerprint());
        await page.locator(".investment-analysis details").evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
        await page.locator("#analysis-listPrice").fill("1100");
        assert.notEqual(await page.evaluate(()=>window.crossFunctionalInvestmentModelStudio.promptCapsuleFingerprint()),old);
        assert.match(await page.evaluate(()=>window.crossFunctionalInvestmentModelStudio.promptCapsule()),/Investment comparison/);
      }
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
      assert.equal(await page.locator(".investment-analysis details:not([open])").count(),0);
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
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
