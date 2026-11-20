import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { templateFixture } from './fixtures.mjs';
export const BROWSER_TRACES = Object.freeze(['selection', 'connection', 'template']);
const ROUTE = '/context-canvas-project-surface/context-canvas/index.html';

// Serialized into the actual browser. These are explicit synchronous receiver
// commands and synthetic DOM events; device input delay and paint stay separate.
export async function installBrowserObserver({ fixture, trace, measure = true }) {
  const module = name => import(`/collaboration/native-investment-studio/${name}.mjs`);
  const [{ createStudio }, { mountCoordinationPanel }, { mountConnectionView }, { mountConnectionPanel }, { mountConnectionTemplatePanel }] =
    await Promise.all(['state', 'controller', 'connection-view', 'connection-controller', 'connection-template-controller'].map(module));
  const root = document.querySelector('[data-native-coordination]');
  mountCoordinationPanel(root).dispose();
  const now = measure ? () => performance.now() : () => 0;
  const calibration = measure ? (() => {
    let previous = now(), smallest = Infinity; const emptyPairsMs = [];
    for (let index = 0; index < 10000; index++) { const next = now(), delta = next - previous; if (delta > 0) smallest = Math.min(smallest, delta); previous = next; }
    for (let index = 0; index < 1000; index++) { const start = now(); emptyPairsMs.push(now() - start); }
    return { clock: 'performance.now', advancementPairs: 10000, smallestAdvancingDeltaMs: Number.isFinite(smallest) ? smallest : null, emptyPairsMs };
  })() : null;
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  const nativeAdd = EventTarget.prototype.addEventListener, nativeRemove = EventTarget.prototype.removeEventListener;
  const nativeFrame = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window);
  const listeners = [], pending = new Set();
  const watched = target => target === window || target === root || (target instanceof Node && root.contains(target));
  const capture = options => Boolean(typeof options === 'boolean' ? options : options?.capture);
  EventTarget.prototype.addEventListener = function(type, fn, options) {
    if (watched(this) && !listeners.some(row => row.target === this && row.type === type && row.fn === fn && row.capture === capture(options)))
      listeners.push({ target: this, type, fn, capture: capture(options) });
    return nativeAdd.call(this, type, fn, options);
  };
  EventTarget.prototype.removeEventListener = function(type, fn, options) {
    const index = listeners.findIndex(row => row.target === this && row.type === type && row.fn === fn && row.capture === capture(options));
    if (index >= 0) listeners.splice(index, 1);
    return nativeRemove.call(this, type, fn, options);
  };
  window.requestAnimationFrame = callback => {
    const id = nativeFrame(time => { pending.delete(id); callback(time); }); pending.add(id); return id;
  };
  window.cancelAnimationFrame = id => { pending.delete(id); nativeCancel(id); };
  const studio = createStudio(fixture.plan), base = studio.read();
  let current = null, receiver, observer;
  const facade = { ...studio };
  for (const method of ['previewCommand', 'applyCommand', 'replace', 'undo']) facade[method] = (...args) => {
    const before = studio.read(), start = now(), result = studio[method](...args);
    if (current) { current.modelMs += now() - start; current.calls[method] = (current.calls[method] ?? 0) + 1;
      if (studio.read() !== before) current.transitions++;
      if (result.ok && result.projection) current.produced.push(result.projection.serialized); }
    return result;
  };
  const restore = () => {
    EventTarget.prototype.addEventListener = nativeAdd; EventTarget.prototype.removeEventListener = nativeRemove;
    window.requestAnimationFrame = nativeFrame; window.cancelAnimationFrame = nativeCancel;
  };
  try {
    receiver = mountCoordinationPanel(root, { studio: facade, workId: fixture.plan.work[0].id });
    const view = mountConnectionView(root.querySelector('[data-native-connection-view]'), { projection: studio.read() });
    const panel = mountConnectionPanel(root.querySelector('[data-native-connection-editor]'), { studio: facade });
    const template = mountConnectionTemplatePanel(root.querySelector('[data-connection-templates]'), { studio: facade });
    const form = root.querySelector('[data-connection-configure] form');
    const field = name => form.elements.namedItem(name);
    const templateRoot = root.querySelector('[data-connection-templates]');
    const set = (node, value) => { require(Boolean(node), 'The accepted receiver supplies the declared control.');
      if (node.type === 'checkbox') node.checked = value;
      else if (node.multiple) for (const option of node.options) option.selected = value.includes(option.value);
      else node.value = value;
      node.dispatchEvent(new Event(node.tagName === 'SELECT' || node.type === 'checkbox' ? 'change' : 'input', { bubbles: true })); };
    if (trace === 'template') {
      template.open();
      const configure = (path, value) => set(templateRoot.querySelector(`[data-template-field="${path}"]`), value);
      for (const [slot, index] of [['pod', 0], ['partner', 1]]) {
        configure(`teams.${slot}.selection`, `team:${fixture.plan.teams[index].id}`); configure(`teams.${slot}.personIds`, []);
      }
      for (const slot of ['handoff', 'feedback']) {
        configure(`connections.${slot}.sharedObject`, 'Measured shared decision');
        configure(`connections.${slot}.responseExpectation`, 'Measured reply');
        configure(`connections.${slot}.receiverPersonId`, fixture.plan.people[0].id);
        configure(`connections.${slot}.workIds`, [fixture.plan.work[0].id]); configure(`connections.${slot}.status`, 'active');
        set(templateRoot.querySelector(`[data-template-recovery="${slot}"]`), slot === 'handoff');
      }
      for (const [name, value] of Object.entries({ label: 'Measured recovery review', team: `team:${fixture.plan.teams[0].id}`,
        personIds: [fixture.plan.people[0].id], hoursPerSession: '1', minutesPerSession: '30', occurrences: '1', funding: 'additional', status: 'planned' }))
        configure(`recovery.handoff.${name}`, value);
    }
    const afterMountListeners = listeners.length, afterMountNodes = root.querySelectorAll('*').length;
    observer = new MutationObserver(() => {}); observer.observe(root, { attributes: true, childList: true, characterData: true, subtree: true });
    async function phase(name, operation) {
      observer.takeRecords(); const before = studio.read();
      const sample = { phase: name, calls: {}, transitions: 0, modelMs: 0, produced: [] };
      current = sample; const start = now();
      try { operation(); } finally { sample.processingMs = now() - start; current = null; }
      const mutations = observer.takeRecords();
      sample.graphListRebuilds = mutations.filter(row => row.type === 'childList' && row.target.classList?.contains('native-connections__list')).length;
      sample.selectedElementWrites = mutations.filter(row => row.type === 'attributes' && row.target.hasAttribute?.('data-connection-select')).length;
      sample.changedSelectedIds = [...new Set(mutations.filter(row => row.type === 'attributes' && row.target.hasAttribute?.('data-connection-select')).map(row => row.target.dataset.connectionSelect))];
      sample.domMutationRecords = mutations.length;
      sample.acceptedChanged = studio.read() !== before;
      await new Promise(resolve => nativeFrame(() => { sample.renderOpportunityMs = now() - start; resolve(); }));
      sample.producedUtf8Bytes = sample.produced.reduce((total, text) => total + new TextEncoder().encode(text).byteLength, 0); delete sample.produced;
      require(pending.size === 0, 'The declared reduced-motion phase releases its deferred frame resources.');
      return sample;
    }
    const equivalent = (actual, expected) => JSON.stringify({ ...actual, revision: 0 }) === JSON.stringify({ ...expected, revision: 0 });
    const observation = {
      async pair() {
        const before = studio.read(), phases = [];
        if (trace === 'selection') {
          const model = view.read().model, nodes = [...root.querySelectorAll('.native-connections__list > li')];
          for (const row of fixture.plan.connections.slice(0, 2).reverse()) phases.push(await phase('selection', () => view.select(row.id)));
          require(view.read().model === model && studio.read() === before, 'Selection reuses one accepted model and state.');
          require(nodes.every((node, index) => node === root.querySelectorAll('.native-connections__list > li')[index]), 'Selection retains every list row.');
          require(phases.every(row => row.graphListRebuilds === 0 && row.changedSelectedIds.every(id => fixture.plan.connections.slice(0, 2).some(edge => edge.id === id))), 'Only previous/next selected controls change.');
        } else if (trace === 'connection') {
          phases.push(await phase('open', () => panel.select(fixture.targetId, false)));
          phases.push(await phase('preview-input', () => set(field('responseExpectation'), 'Measured next step')));
          require(studio.read() === before && panel.read().draft.raw.responseExpectation === 'Measured next step', 'Raw input remains separate from accepted state.');
          phases.push(await phase('apply-render', () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))));
          require(equivalent(studio.read().state, { ...before.state, connections: before.state.connections.map(row => row.id === fixture.targetId ? { ...row, responseExpectation: 'Measured next step' } : row) }), `Apply publishes exactly the intended response and retains all other fields: ${JSON.stringify({ accepted: studio.read().state.connections.find(row => row.id === fixture.targetId), raw: panel.read().draft?.raw, status: panel.read().status, error: root.querySelector('[data-connection-status]').textContent })}`);
        } else {
          phases.push(await phase('template-preview', () => templateRoot.querySelector('[data-template-action="preview"]').click()));
          require(studio.read() === before && !templateRoot.querySelector('[data-template-preview]').hidden, 'Template preview retains accepted state.');
          phases.push(await phase('template-apply-render', () => templateRoot.querySelector('[data-template-action="apply"]').click()));
          const prefix = 'arrangement-1', recoveryId = `${prefix}-recovery-handoff`;
          const recovery = { id: recoveryId, label: 'Measured recovery review', teamId: fixture.plan.teams[0].id, personIds: [fixture.plan.people[0].id],
            minutesPerOccurrence: 90, occurrences: 1, funding: 'additional', status: 'planned', timing: null, lifecycle: 'active' };
          const expected = { ...before.state, work: [...before.state.work, recovery], connections: [...before.state.connections,
            ...['handoff', 'feedback'].map((slot, index) => ({ id: `${prefix}-connection-${slot}`, senderTeamId: fixture.plan.teams[index].id,
              receiverTeamId: fixture.plan.teams[1 - index].id, receiverPersonId: fixture.plan.people[0].id, sharedObject: 'Measured shared decision', responseExpectation: 'Measured reply',
              workIds: [fixture.plan.work[0].id, ...(index === 0 ? [recoveryId] : [])], status: 'active' }))] };
          require(equivalent(studio.read().state, expected), 'Template adds exactly the declared two edges and explicit recovery row.');
        }
        if (trace !== 'selection') {
          require(studio.read().result.allocatedKnownCents === fixture.expected.allocatedCents, 'Allocated attribution remains inside funding.');
          require(studio.read().result.knownCommitmentCents === (trace === 'template' ? fixture.expected.recoveryCents : fixture.expected.commitmentCents), 'Accepted money follows independent arithmetic.');
          phases.push(await phase('undo-render', () => { const result = facade.undo(studio.read()); require(result.ok, 'Undo succeeds.'); receiver.refresh(); }));
          require(equivalent(studio.read().state, before.state), 'Undo restores every prior business field.');
          if (trace === 'connection') { require(panel.read().status === 'stale', 'Undo retires the reopened edit identity.'); root.querySelector('[data-connection-recovery] [data-connection-action="cancel"]').click(); require(panel.read().draft === null, 'The stale recovery action releases the draft before the next pair.'); }
        }
        require(studio.read().result.knownCommitmentCents === fixture.expected.commitmentCents, 'The pair returns to its literal baseline.');
        require(listeners.length === afterMountListeners, 'Repeated pairs retain the mounted listener population.');
        return { phases, listeners: listeners.length, nodes: root.querySelectorAll('*').length, pendingFrames: pending.size };
      },
      dispose() {
        observer.disconnect(); try { receiver.dispose(); } finally { restore(); } const result = { afterMountListeners, afterMountNodes,
          afterDisposeListeners: listeners.length, pendingFrames: pending.size };
        require(result.afterDisposeListeners === 0 && result.pendingFrames === 0, 'Disposal releases owned listeners and deferred frames.'); return result;
      },
    };
    window.relationshipObservation = observation;
    return { ready: true, afterMountListeners, afterMountNodes, calibration };
  } catch (error) { observer?.disconnect(); try { receiver?.dispose(); } finally { restore(); } throw error; }
}

export async function runBrowserStudy({ sourceRoot, outputDirectory, protocol, fixtures, onProgress = () => {} }) {
  assert.equal(protocol.browser.runs, 5); assert.equal(protocol.browser.warmupPairs, 20); assert.equal(protocol.browser.measuredPairs, 50);
  assert.deepEqual(protocol.browser.engines, ['chromium', 'firefox', 'webkit']);
  assert.deepEqual(protocol.browser.traces, BROWSER_TRACES); assert.deepEqual(protocol.browser.viewport, { width: 1440, height: 1000 });
  assert.deepEqual(fixtures.map(row => row.id), ['small', 'representative', 'caps']);
  // Validate local output and source before acquiring a listening server.
  await mkdir(outputDirectory, { recursive: true }); assert.equal((await readdir(outputDirectory)).length, 0, 'Use an empty output directory.');
  const markup = await fixtureMarkup(sourceRoot);
  const require = createRequire(resolve(sourceRoot, 'package.json')), engines = require('@playwright/test');
  const helper = await import(pathToFileURL(resolve(sourceRoot, 'tools/core-architecture-browser-helper.mjs')));
  const runs = [], versions = {}; let sequence = 0;
  const server = await helper.startStaticServer(sourceRoot);
  try {
    for (const engine of protocol.browser.engines) {
      const browser = await engines[engine].launch();
      try {
        versions[engine] = browser.version();
        for (let round = 0; round < 5; round++) for (const fixture of fixtures) for (const trace of [...BROWSER_TRACES.slice(round % 3), ...BROWSER_TRACES.slice(0, round % 3)]) {
          const input = trace === 'template' ? templateFixture(fixture) : fixture;
          const record = { sequence: ++sequence, round: round + 1, engine, trace, fixture: input.id, facts: input.facts, status: 'running', declaredPairs: 50, samples: [] };
          let handle, context;
          try {
            handle = await open(resolve(outputDirectory, `${String(sequence).padStart(3, '0')}.jsonl`), 'wx');
            await handle.writeFile(JSON.stringify({ type: 'start', ...record }) + '\n');
            context = await browser.newContext({ viewport: protocol.browser.viewport, locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', deviceScaleFactor: 1 });
            const page = await context.newPage(), telemetry = helper.monitor(page);
            await page.route('**/*', request => { const url = new URL(request.request().url());
              return url.origin === server.origin ? url.pathname === ROUTE ? request.fulfill({ status: 200, contentType: 'text/html', body: markup }) : request.continue()
                : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate owner</title>' }); });
            await page.goto(server.origin + ROUTE, { waitUntil: 'load' }); await page.evaluate(() => document.fonts.ready);
            const installed = await page.evaluate(installBrowserObserver, { fixture: input, trace });
            record.calibration = installed.calibration;
            for (let index = 0; index < 20; index++) await page.evaluate(() => window.relationshipObservation.pair());
            for (let index = 0; index < 50; index++) { const sample = await page.evaluate(() => window.relationshipObservation.pair()); record.samples.push(sample); await handle.writeFile(JSON.stringify({ type: 'sample', index, ...sample }) + '\n'); }
            record.resources = await page.evaluate(() => window.relationshipObservation.dispose()); helper.assertTelemetry(telemetry); record.status = 'complete';
            await handle.writeFile(JSON.stringify({ type: 'complete', resources: record.resources, pairs: record.samples.length }) + '\n');
            await writeFile(resolve(outputDirectory, `${String(sequence).padStart(3, '0')}.json`), JSON.stringify(record) + '\n', { flag: 'wx' }); runs.push(record);
            onProgress({ sequence, round: round + 1, engine, fixture: input.id, trace, pairs: 50 });
          } catch (error) {
            if (handle) await handle.writeFile(JSON.stringify({ type: 'incomplete', retainedPairs: record.samples.length, error: error.message }) + '\n').catch(() => {});
            throw error;
          } finally { try { await handle?.close(); } finally { await context?.close(); } }
        }
      } finally { await browser.close(); }
    }
  } finally { await server.close(); }
  return { runs, versions };
}

export async function fixtureMarkup(sourceRoot) {
  const source = await readFile(resolve(sourceRoot, ROUTE.slice(1)), 'utf8');
  const start = source.indexOf('<section class="about-field about-field--coordination"'), end = source.indexOf('<section class="about-field about-field--studio"', start);
  const prefixEnd = source.indexOf('<main id="main">') + '<main id="main">'.length;
  assert.ok(start > prefixEnd && end > start);
  const studio = source.slice(start, end);
  assert.equal((studio.match(/\bdata-connection-templates(?:\s|>)/gu) ?? []).length, 1);
  return `${source.slice(0, prefixEnd).replace(/<script\b[\s\S]*?<\/script>/gu, '')}${studio}</main></body></html>`;
}
