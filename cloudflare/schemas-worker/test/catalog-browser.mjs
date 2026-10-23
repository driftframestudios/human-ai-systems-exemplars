import '../../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import catalog from "../public/schema-catalog.json" with { type: "json" };
import skillCatalog from "../public/skills/catalog.json" with { type: "json" };

const [origin, flag, ...extra] = process.argv.slice(2);
assert(origin && extra.length === 0 && (flag === undefined || flag === "--local-tls"), "Use: npm run test:browser -- https://host [--local-tls]");
const base = new URL(origin);
assert.equal(base.protocol, "https:");
assert.equal(base.href, `${base.origin}/`);
const localTLS = flag === "--local-tls";
if (localTLS) assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "The local certificate exception is confined to loopback");
const output = new URL("../../../.visual-runs/schema-worker/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false, ignoreHTTPSErrors: localTLS });
    try {
      const page = await context.newPage();
      await page.route("**/*", route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
      const response = await page.goto(base.href, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.getByRole("link", { name: "Download from schemas.vik.guru", exact: true }).count(), catalog.contracts.length);
      const skillLink = page.getByRole("link", { name: `Read the catalog of ${skillCatalog.skills.length} public-ready skills`, exact: true });
      assert.equal(await skillLink.count(), 1);
      assert.equal(await skillLink.getAttribute("href"), "/skills/catalog.json");
      await page.screenshot({ path: fileURLToPath(new URL(`catalog-${width}.png`, output)), fullPage: true });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `catalog stays within ${width}px`);
      assert(await page.locator("h2").evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth)), `path headings wrap at ${width}px`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`PASS: ${catalog.contracts.length} schema links, ${skillCatalog.skills.length}-skill discovery, and horizontal containment at 390px and 1280px with JavaScript unavailable.`);
