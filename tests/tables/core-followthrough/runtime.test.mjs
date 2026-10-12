import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { validateRecordArtifacts } from "./contracts.mjs";
import { monitor, assertTelemetry } from "../../../tools/core-architecture-browser-helper.mjs";
import { publishObservation } from "../../../tools/observation-checkpoint.mjs";
import { withCampaignLock, fulfillCampaignRequest } from "./runtime.mjs";

const browserSource = await fs.readFile(new URL("./browser.mjs", import.meta.url), "utf8");

function lockFixture(fail = null) {
  const events = [];
  const filesystem = {
    async mkdir() { events.push("mkdir"); if (fail === "mkdir") throw new Error("mkdir failure"); },
    async open(file, flags) {
      events.push("open"); assert.equal(flags, "wx"); assert(file.endsWith("/campaign.lock"));
      if (fail === "open") throw Object.assign(new Error("lock already owned"), { code: "EEXIST" });
      return { async close() {
        events.push("lock-close");
        if (fail === "lock-close") throw new Error("lock close failure");
      } };
    },
    async rm(file, options) {
      events.push("remove"); assert(file.endsWith("/campaign.lock")); assert.deepEqual(options, { force: true });
    },
  };
  return { events, filesystem };
}
test("successful campaign closes its browser before releasing its owned lock", async () => {
  const fixture = lockFixture();
  const value = await withCampaignLock("/campaign", async resources => {
    fixture.events.push("work");
    resources.browser = { async close() { fixture.events.push("browser-close"); } };
    return "complete";
  }, fixture.filesystem);
  assert.equal(value, "complete");
  assert.deepEqual(fixture.events, ["mkdir", "open", "lock-close", "work", "browser-close", "remove"]);
});
for (const phase of ["checkpoint setup", "snapshot preparation", "fingerprints", "executable inspection"]) {
  test(phase + " failure releases the lock without launching a browser", async () => {
    const fixture = lockFixture();
    const failure = new Error(phase);
    await assert.rejects(withCampaignLock("/campaign", async resources => {
      assert.equal(resources.browser, null);
      throw failure;
    }, fixture.filesystem), error => error === failure);
    assert.deepEqual(fixture.events, ["mkdir", "open", "lock-close", "remove"]);
  });
}
test("failed acquisition never removes another campaign's lock", async () => {
  const fixture = lockFixture("open");
  await assert.rejects(withCampaignLock("/campaign", async () => assert.fail("work must not run"), fixture.filesystem),
    error => error.code === "EEXIST");
  assert.deepEqual(fixture.events, ["mkdir", "open"]);
});
test("directory preparation failure does not claim or remove a lock", async () => {
  const fixture = lockFixture("mkdir");
  await assert.rejects(withCampaignLock("/campaign", async () => assert.fail("work must not run"), fixture.filesystem),
    /mkdir failure/u);
  assert.deepEqual(fixture.events, ["mkdir"]);
});
test("lock-handle close failure still attempts handle cleanup and releases the owned path", async () => {
  const fixture = lockFixture("lock-close");
  await assert.rejects(withCampaignLock("/campaign", async () => assert.fail("work must not run"), fixture.filesystem),
    /lock close failure/u);
  assert.deepEqual(fixture.events, ["mkdir", "open", "lock-close", "lock-close", "remove"]);
});
test("case failure closes the registered browser and releases the lock", async () => {
  const fixture = lockFixture();
  const failure = new Error("case failed");
  await assert.rejects(withCampaignLock("/campaign", async resources => {
    resources.browser = { async close() { fixture.events.push("browser-close"); } };
    throw failure;
  }, fixture.filesystem), error => error === failure);
  assert.deepEqual(fixture.events.slice(-2), ["browser-close", "remove"]);
});
test("browser-close rejection cannot skip lock removal", async () => {
  const fixture = lockFixture();
  const failure = new Error("browser close failed");
  await assert.rejects(withCampaignLock("/campaign", async resources => {
    resources.browser = { async close() { fixture.events.push("browser-close"); throw failure; } };
  }, fixture.filesystem), error => error === failure);
  assert.deepEqual(fixture.events.slice(-2), ["browser-close", "remove"]);
});

function pageFixture() {
  const page = new EventEmitter();
  return { page, telemetry: monitor(page) };
}
const failures = [
  ["console", page => page.emit("console", { type: () => "error", text: () => "caught application error" }), "consoleErrors"],
  ["page", page => page.emit("pageerror", new Error("uncaught application error")), "pageErrors"],
  ["request", page => page.emit("requestfailed", { method: () => "GET", url: () => "http://followthrough.test/data.json",
    failure: () => ({ errorText: "net::ERR_FAILED" }) }), "requestFailures"],
  ["response", page => page.emit("response", { status: () => 503, url: () => "http://followthrough.test/data.json" }), "responseErrors"],
];
for (const [name, emit, field] of failures) test("shared monitor rejects " + name + " failures without a browser", () => {
  const { page, telemetry } = pageFixture();
  emit(page);
  assert.equal(telemetry[field].length, 1);
  assert.throws(() => assertTelemetry(telemetry));
});
test("non-error console messages and successful responses do not invent failures", () => {
  const { page, telemetry } = pageFixture();
  for (const type of ["log", "warning"]) page.emit("console", { type: () => type, text: () => "diagnostic" });
  for (const status of [200, 204]) page.emit("response", { status: () => status, url: () => "https://example.test/resource" });
  assertTelemetry(telemetry);
});

function routeFixture(url, { variant = "source", missing = false, navigation = false, iframe = false,
  resourceType = navigation ? "document" : "other" } = {}) {
  const { page, telemetry } = pageFixture();
  const reads = [], fulfilled = [];
  const options = { variant, dependencies: {}, metrics: { navigationRequests: 0 }, errors: [], externalSubstitutions: [],
    snapshot: {
      async bytes(key) { reads.push(key); return missing ? null : Buffer.from("local fixture"); },
      async hash() { return "source-digest"; },
    } };
  const request = { url: () => url, method: () => "GET", isNavigationRequest: () => navigation,
    resourceType: () => resourceType, frame: () => ({ parentFrame: () => iframe ? {} : null }) };
  const route = { request: () => request, async fulfill(response) {
    fulfilled.push(response);
    page.emit("response", { status: () => response.status, url: () => url });
    // Chromium aborts a document navigation fulfilled with a no-content response.
    if (navigation && resourceType === "document" && response.status === 204)
      page.emit("requestfailed", { ...request, failure: () => ({ errorText: "net::ERR_ABORTED" }) });
  } };
  return { page, telemetry, reads, fulfilled, options, route };
}
test("intentional external substitution is explicit and is not a live-network success claim", async () => {
  const fixture = routeFixture("https://fonts.example.test/font.woff2");
  await fulfillCampaignRequest(fixture.route, fixture.options);
  assert.deepEqual(fixture.reads, []);
  assert.deepEqual(fixture.fulfilled, [{ status: 204, body: "" }]);
  assert.deepEqual(fixture.options.dependencies, {});
  assert.equal(fixture.options.metrics.navigationRequests, 0);
  assert.deepEqual(fixture.options.externalSubstitutions, [{ method: "GET", url: "https://fonts.example.test/font.woff2",
    status: 204, disposition: "intentional external substitution; live delivery unobserved" }]);
  assertTelemetry(fixture.telemetry);
});
test("external substitution does not filter a subsequent console or request failure", async () => {
  const fixture = routeFixture("https://fonts.example.test/font.woff2");
  await fulfillCampaignRequest(fixture.route, fixture.options);
  fixture.page.emit("console", { type: () => "error", text: () => "substituted resource unusable" });
  fixture.page.emit("requestfailed", { method: () => "GET", url: () => "https://fonts.example.test/font.woff2",
    failure: () => ({ errorText: "net::ERR_FAILED" }) });
  assert.equal(fixture.telemetry.consoleErrors.length, 1);
  assert.equal(fixture.telemetry.requestFailures.length, 1);
  assert.throws(() => assertTelemetry(fixture.telemetry));
});
test("local navigation retains source binding and measured navigation count", async () => {
  const fixture = routeFixture("http://followthrough.test/family/", { navigation: true });
  await fulfillCampaignRequest(fixture.route, fixture.options);
  assert.deepEqual(fixture.reads, ["family/index.html"]);
  assert.deepEqual(fixture.options.dependencies, { "family/index.html": "source-digest" });
  assert.equal(fixture.options.metrics.navigationRequests, 1);
  assert.equal(fixture.fulfilled[0].contentType, "text/html");
  assert.deepEqual(fixture.options.externalSubstitutions, []);
  assertTelemetry(fixture.telemetry);
});
test("missing local resources remain failures rather than intentional substitutions", async () => {
  const fixture = routeFixture("http://followthrough.test/missing.js", { missing: true });
  await fulfillCampaignRequest(fixture.route, fixture.options);
  assert.deepEqual(fixture.options.errors, ["Missing local resource: missing.js"]);
  assert.deepEqual(fixture.options.externalSubstitutions, []);
  assert.deepEqual(fixture.telemetry.responseErrors, ["404 http://followthrough.test/missing.js"]);
  assert.throws(() => assertTelemetry(fixture.telemetry));
});
test("packaged iframe navigation is source-bound local delivery, not an external exception", async () => {
  const fixture = routeFixture("https://iframes.vik.guru/v1/canvas/talent-agent-intake/", { variant: "parent", navigation: true, iframe: true });
  await fulfillCampaignRequest(fixture.route, fixture.options);
  assert.deepEqual(fixture.reads, ["package:canvas/talent-agent-intake/index.html"]);
  assert.deepEqual(fixture.options.dependencies, { "package:canvas/talent-agent-intake/index.html": "source-digest" });
  assert.deepEqual(fixture.options.externalSubstitutions, []);
  assert.equal(fixture.options.metrics.navigationRequests, 1);
  assertTelemetry(fixture.telemetry);
});
test("errors emitted during artifact capture prevent checkpoint publication", async () => {
  const { page, telemetry } = pageFixture();
  let writes = 0;
  await assert.rejects(publishObservation({ async write() { writes++; } },
    { id: "fixture", signature: "definition", dependencies: {}, result: {} }, async () => {
      page.emit("console", { type: () => "error", text: () => "capture-time error" });
      assertTelemetry(telemetry);
    }));
  assert.equal(writes, 0);
});
test("runner protects preparation, binds the shared monitor owner and freezes telemetry before publication", () => {
  const start = browserSource.indexOf("await withCampaignLock(output, async resources => {");
  assert(start >= 0);
  for (const setup of ["await openCheckpoints(", "inputSnapshot(root, packageFiles)", "await snapshot.fingerprints(definitionFiles)",
    "await fs.stat(chromium.executablePath())"]) assert(browserSource.indexOf(setup) > start);
  for (const dependency of ["tests/tables/core-followthrough/runtime.mjs", "tools/core-architecture-browser-helper.mjs",
    "tools/attribution-contract.mjs", "attribution.yml"]) assert(browserSource.includes(JSON.stringify(dependency)));
  assert.match(browserSource, /resources\.browser = browser/u);
  assert.match(browserSource, /const telemetry = monitor\(page\)/u);
  assert.match(browserSource, /fulfillCampaignRequest\(route, \{/u);
  const capture = browserSource.indexOf("await publishObservation(store, record");
  const telemetryCheck = browserSource.indexOf("assertTelemetry(telemetry)", capture);
  const sourceCheck = browserSource.indexOf("assert(await validateRecordArtifacts(record", capture);
  const validationEnd = browserSource.indexOf("\n", sourceCheck);
  const finishEnd = browserSource.indexOf("\n        });", sourceCheck);
  assert(sourceCheck > browserSource.indexOf("await page.pdf(", capture));
  assert(telemetryCheck > validationEnd && telemetryCheck < finishEnd);
  const cutoff = browserSource.slice(validationEnd, finishEnd);
  assert.doesNotMatch(cutoff, /\bawait\b/u, "nothing suspends between artifact validation and final telemetry assertions/copies");
  assert.match(cutoff, /assert\.equal\(errors\.length, 0/u);
  assert.match(cutoff, /result\.telemetry = structuredClone\(telemetry\)/u);
});


test("actual runner finalization rejects a validation-time console error with zero checkpoint writes", async () => {
  const { page, telemetry } = pageFixture();
  const item = { id: "fixture-source-304-screen", family: { id: "fixture", kind: "control", source: "fixture.html" },
    mode: "screen", width: 304, variant: "source" };
  const record = { id: item.id, signature: "fixture-definition", dependencies: { "fixture.html": "a".repeat(64) },
    result: { id: item.id, family: "fixture", kind: "control", mode: "screen", width: 304, variant: "source",
      standing: "pass", screenshots: [], telemetry: null } };
  let validations = 0;
  let writes = 0;
  const snapshot = { async agrees(dependencies, fresh) {
    validations++;
    assert.equal(dependencies, record.dependencies);
    assert.equal(fresh, true);
    await Promise.resolve();
    page.emit("console", { type: () => "error", text: () => "validation-time error" });
    return true;
  } };
  const capture = browserSource.indexOf("await publishObservation(store, record");
  const sourceCheck = browserSource.indexOf("          assert(await validateRecordArtifacts(record", capture);
  const finishEnd = browserSource.indexOf("\n        });", sourceCheck);
  assert(sourceCheck > capture && finishEnd > sourceCheck);
  // Execute the runner's actual post-capture tail, not a separately ordered imitation.
  const finishArtifacts = vm.runInNewContext("(async () => {\n" + browserSource.slice(sourceCheck, finishEnd) + "\n})",
    { assert, validateRecordArtifacts, record, item, root: "/fixture", snapshot, errors: [],
      assertTelemetry, telemetry, result: record.result, structuredClone, externalSubstitutions: [] });
  await assert.rejects(publishObservation({ async write() { writes++; } }, record, finishArtifacts),
    /validation-time error/u);
  assert.equal(validations, 1, "the real artifact validator reached its awaited fresh-byte boundary");
  assert.equal(writes, 0);
  assert.equal(record.result.telemetry, null, "a failing final check never stamps a clean telemetry receipt");
});


test("foreign iframe document receives nonempty 200 HTML explicitly outside observed external content", async () => {
  const url = "https://iframes.vik.guru/v1/core/strategy-canvas/";
  const fixture = routeFixture(url, { navigation: true, iframe: true });
  await fulfillCampaignRequest(fixture.route, fixture.options);
  assert.equal(fixture.fulfilled.length, 1);
  const response = fixture.fulfilled[0];
  assert.equal(response.status, 200);
  assert.equal(response.contentType, "text/html; charset=utf-8");
  assert.equal(typeof response.body, "string");
  assert.match(response.body, /^<!doctype html><html lang="en">/u);
  assert.match(response.body, /<body><p>External iframe content is not observed in this local campaign\.<\/p><\/body><\/html>$/u);
  assert.deepEqual(fixture.options.externalSubstitutions, [{ method: "GET", url, status: 200,
    disposition: "intentional foreign iframe document placeholder; external content unobserved" }]);
  assert.deepEqual(fixture.reads, []);
  assert.deepEqual(fixture.options.dependencies, {});
  assert.equal(fixture.options.metrics.navigationRequests, 0, "placeholder is not a served source/package navigation");
  assertTelemetry(fixture.telemetry);
});
test("foreign iframe placeholder does not suppress unexpected aborts or console errors", async () => {
  const url = "https://iframes.vik.guru/v1/core/strategy-canvas/";
  const fixture = routeFixture(url, { navigation: true, iframe: true });
  await fulfillCampaignRequest(fixture.route, fixture.options);
  fixture.page.emit("requestfailed", { method: () => "GET", url: () => url,
    failure: () => ({ errorText: "net::ERR_ABORTED" }) });
  fixture.page.emit("console", { type: () => "error", text: () => "unexpected error after placeholder" });
  assert.deepEqual(fixture.telemetry.requestFailures, ["GET " + url + " \u00b7 net::ERR_ABORTED"]);
  assert.deepEqual(fixture.telemetry.consoleErrors, ["unexpected error after placeholder"]);
  assert.throws(() => assertTelemetry(fixture.telemetry), /net::ERR_ABORTED/u);
});
test("foreign top-level document navigation is not silently converted into an iframe placeholder", async () => {
  const fixture = routeFixture("https://example.test/unexpected-navigation", { navigation: true });
  await fulfillCampaignRequest(fixture.route, fixture.options);
  assert.deepEqual(fixture.fulfilled, [{ status: 204, body: "" }]);
  assert.equal(fixture.options.externalSubstitutions[0].status, 204);
  assert.equal(fixture.telemetry.requestFailures.length, 1);
  assert.throws(() => assertTelemetry(fixture.telemetry), /net::ERR_ABORTED/u);
});
