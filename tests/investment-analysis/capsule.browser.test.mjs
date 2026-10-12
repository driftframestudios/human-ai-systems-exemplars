import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {withInvestmentBrowser} from './browser-helper.mjs';
const routes=['initiative-costing-calculator','cross-functional-investment-model-studio'];
function acceptedJson(text){const match=text.match(/^(`{3,})json\n([\s\S]*?)\n\1$/m);assert.ok(match);return JSON.parse(match[2]);}
test('costing capsule defaults, accepted revisions, and active-view transfers agree',{timeout:120000},async()=>{
  await withInvestmentBrowser(chromium,async({origin,openPage})=>{
    for(const [index,route] of routes.entries()){
      const context=await openPage({viewport:{width:1239,height:800}}),page=context.page;
      const url=origin+'/collaboration/'+route+'/index.html';
      const visible=()=>index===0?page.locator('#analysis-capsule').inputValue():page.locator('#promptCapsuleMarkdown').textContent();
      const api=()=>page.evaluate(()=>window.investmentAnalysis.promptCapsule());
      await page.goto(url);await page.locator('[data-investment-analysis]:not([hidden])').waitFor();
      const initial=await api();assert.equal(await visible(),initial);
      const nojs=await openPage({javaScriptEnabled:false}),staticPage=nojs.page;await staticPage.goto(url);
      const sourceDefault=index===0?await staticPage.locator('#analysis-capsule').inputValue():await staticPage.locator('#promptCapsuleMarkdown').textContent();
      assert.equal(sourceDefault,initial,'authored default equals initialized plain capsule');
      if(index===0){
        await staticPage.locator('[data-analysis-capsule-panel] summary').click();
        await expect(staticPage.locator('[data-analysis-capsule-views]')).toBeHidden();
        await expect(staticPage.locator('[data-analysis-capsule-actions]')).toBeHidden();
        await expect(staticPage.locator('#analysis-capsule')).toBeVisible();
      }
      await nojs.close();
      if(index===0)await page.locator('[data-analysis-capsule-panel]').evaluate(el=>el.open=true);
      await page.locator('[data-investment-analysis] details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
      await page.locator('#analysis-owner').fill('Accountable operating owner');
      await page.locator('#analysis-label').fill('Accepted `special` <value>');
      const changed=await api();assert.notEqual(changed,initial);assert.equal(await visible(),changed);
      assert.equal((changed.match(/^# /gm)||[]).length,1);
      assert.deepEqual(acceptedJson(changed),await page.evaluate(()=>window.investmentAnalysis.getState()));
      assert.match(changed,/Accountable operating owner/);
      if(index===1)assert.doesNotMatch(changed,/Human receiver: Open/);
      await page.locator('#analysis-events').fill('[pending');assert.equal(await api(),changed);
      await page.locator('[data-action="apply"]').click();assert.equal(await api(),changed);assert.match(await page.locator('#analysis-status').textContent(),/Accepted state remains/);
      const radios=index===0?page.locator('[data-analysis-capsule-views]'):page.locator('[data-prompt-view-control]');
      await radios.getByRole('radio',{name:'Skill-assisted',exact:true}).check();
      const assisted=await api();
      assert.equal(await visible(),assisted);assert.ok(assisted.includes('## Skill assistance'));
      assert.equal(changed.match(/- Fingerprint: .*/)[0],assisted.match(/- Fingerprint: .*/)[0]);
      assert.deepEqual(acceptedJson(assisted),acceptedJson(changed));
      assert.equal(await radios.getByRole('radio',{name:'Skill-assisted',exact:true}).evaluate(el=>el===document.activeElement),true);
      await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedCapsule=text;}}}));
      const copy=index===0?page.locator('[data-capsule-action="copy"]'):page.locator('#copyPromptCapsule');
      const download=index===0?page.locator('[data-capsule-action="download"]'):page.locator('#downloadPromptCapsule');
      await copy.click();assert.equal(await page.evaluate(()=>window.copiedCapsule),assisted);
      const receiving=page.waitForEvent('download');await download.click();const file=await receiving;
      assert.equal(await readFile(await file.path(),'utf8'),assisted);
      await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Permission unavailable');}}}));
      await copy.click();
      assert.match(await page.locator(index===0?'#analysis-capsule-status':'#promptViewStatus').textContent(),/copy|select/i);
      for(const width of [390,1440]){await page.setViewportSize({width,height:900});const widthState=await page.locator(index===0?'#analysis-capsule':'#promptCapsuleMarkdown').evaluate(el=>({right:el.getBoundingClientRect().right,width:innerWidth}));assert.ok(widthState.right<=widthState.width+1);}
      await page.locator('[data-action="reset"]').click();
      const reset=await api();
      assert.equal(await visible(),reset);assert.equal(acceptedJson(reset).inputs.label,'Illustrative pilot versus status quo');
      if(index===0){await page.locator('[data-action="staffing"]').click();const captured=await api();assert.ok(acceptedJson(captured).extensions['urn:investment:staffing-reference']);assert.match(captured,/captured USD/);}
      await context.close();
    }
  });
});
