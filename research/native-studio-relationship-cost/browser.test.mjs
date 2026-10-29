import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { before, after, test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createFixture, templateFixture } from './fixtures.mjs';
import { BROWSER_TRACES, installBrowserObserver, fixtureMarkup, runBrowserStudy } from './browser.mjs';
const sourceRoot = resolve(process.env.NATIVE_STUDIO_SOURCE_ROOT ?? new URL('./.local/app', import.meta.url).pathname);
const require = createRequire(resolve(sourceRoot, 'package.json')), { chromium } = require('@playwright/test');
const { createExamplePlan } = await import(pathToFileURL(resolve(sourceRoot, 'collaboration/native-investment-studio/contract.mjs')));
const helper = await import(pathToFileURL(resolve(sourceRoot, 'tools/core-architecture-browser-helper.mjs')));
const route = '/context-canvas-project-surface/context-canvas/index.html';
let browser, server, markup;
before(async () => { server = await helper.startStaticServer(sourceRoot); markup = await fixtureMarkup(sourceRoot); browser = await chromium.launch(); });
after(async () => { try { await browser?.close(); } finally { await server?.close(); } });
for (const name of ['small', 'representative', 'caps']) for (const trace of BROWSER_TRACES) test(`${name}/${trace}: untimed receiver preserves exact semantics and releases resources`, { timeout: 30000 }, async () => {
  const fixture = createFixture(name, createExamplePlan), input = trace === 'template' ? templateFixture(fixture) : fixture;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), telemetry = helper.monitor(page);
  try {
    await page.route('**/*', request => { const url = new URL(request.request().url());
      return url.origin === server.origin ? url.pathname === route ? request.fulfill({ status: 200, contentType: 'text/html', body: markup }) : request.continue()
        : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' }); });
    await page.goto(server.origin + route, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
    const mounted = await page.evaluate(installBrowserObserver, { fixture: input, trace, measure: false });
    assert.equal(mounted.ready, true); assert.equal(mounted.calibration, null);
    for (let index = 0; index < 2; index++) {
      const sample = await page.evaluate(() => window.relationshipObservation.pair());
      assert.ok(sample.phases.length > 0); assert.equal(sample.pendingFrames, 0);
      assert.ok(sample.phases.every(row => row.processingMs === 0 && row.modelMs === 0 && row.renderOpportunityMs === 0));
      if (trace === 'selection') { assert.ok(sample.phases.every(row => row.graphListRebuilds === 0)); assert.ok(sample.phases.every(row => row.selectedElementWrites > 0)); }
    }
    const resources = await page.evaluate(() => window.relationshipObservation.dispose());
    assert.equal(resources.afterDisposeListeners, 0); assert.equal(resources.pendingFrames, 0); helper.assertTelemetry(telemetry);
  } finally { await context.close(); }
});

test('existing raw output is rejected before source loading or server acquisition', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'native-relationship-observer-'));
  try {
    await writeFile(resolve(directory, 'retained.json'), '{}');
    const protocol = JSON.parse(await readFile(new URL('./protocol.json', import.meta.url)));
    await assert.rejects(runBrowserStudy({ sourceRoot: resolve(directory, 'absent-source'), outputDirectory: directory, protocol,
      fixtures: ['small', 'representative', 'caps'].map(id => ({ id })) }), /Use an empty output directory/u);
  } finally { await rm(directory, { recursive: true }); }
});
