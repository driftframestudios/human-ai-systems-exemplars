import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { INVESTMENT_HOSTS, INLINE_OWNERS, readInvestmentSources, projectInvestmentHtml, assertInvestmentProjection } from "../../tools/project-investment-analysis.mjs";

const root = new URL("../../", import.meta.url);
test("both authored hosts retain source-exact readable inline owners in initialization order", async () => {
  const sources = await readInvestmentSources();
  for (const route of INVESTMENT_HOSTS) {
    const html = await readFile(new URL(route, root), "utf8");
    assertInvestmentProjection(html, sources);
    assert.equal(projectInvestmentHtml(projectInvestmentHtml(html, sources), sources), html);
    for (const owner of INLINE_OWNERS) assert.ok(html.includes(sources[owner.path].trimEnd()));
    assert.doesNotMatch(html, /(?:src|href)="\.\.\/investment-analysis\//);
    assert.ok(html.indexOf("investment-analysis:ui:start") > html.lastIndexOf("window.investmentAnalysis?.setMethod"));
  }
  const model = await readFile(new URL(INVESTMENT_HOSTS[1], root), "utf8");
  assert.match(model, /default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'/);
  assert.ok(model.indexOf("investment-analysis:ui:start") > model.indexOf("window.crossFunctionalInvestmentModelStudio ="));
});

test("projection reports stale copies, malformed markers and HTML terminators before delivery", async () => {
  const sources = await readInvestmentSources();
  const html = await readFile(new URL(INVESTMENT_HOSTS[0], root), "utf8");
  const changed = { ...sources, [INLINE_OWNERS[1].path]: sources[INLINE_OWNERS[1].path] + "\n// changed owner\n" };
  assert.throws(() => assertInvestmentProjection(html, changed), /Refresh the investment inline projection/);
  assert.throws(() => projectInvestmentHtml(html.replace("investment-analysis:core:end", "missing"), sources), /marker pair/);
  assert.throws(() => projectInvestmentHtml(html + "<!-- investment-analysis:core:start -->", sources), /marker pair/);
  const unsafe = { ...sources, [INLINE_OWNERS[1].path]: 'const text = "</script>";' };
  assert.throws(() => projectInvestmentHtml(html, unsafe), /inline-safe source/);
});
