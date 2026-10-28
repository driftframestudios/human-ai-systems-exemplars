import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {
  createEmbeddedContentFitProjection, replaceEmbeddedContentFitProjection,
  embeddedContentFitSource, embeddedContentFitTargets,
} from '../../tools/materialize-embedded-content-fit.mjs';

const root = resolve(import.meta.dirname, '../..');
const parentSource = await readFile(resolve(root, 'context-canvas-project-surface/context-canvas/about-content-fit.js'), 'utf8');
const childSource = await readFile(resolve(root, 'collaboration/about-ai-method-gallery/index.html'), 'utf8');
const adapterSource = await readFile(resolve(root, embeddedContentFitSource), 'utf8');
const module = { exports: {} };
vm.runInNewContext(parentSource, { module });
const { acceptsHeight, attach } = module.exports;
const report = height => ({ type: 'context-canvas:content-fit-height', version: 1, height });

function carrierFixture() {
  const channels = [];
  const tasks = new Map();
  const listeners = new Map();
  const properties = new Map();
  const messages = [];
  let nextTask = 0;
  const environment = {
    MessageChannel: class {
      constructor() {
        this.port1 = { onmessage: null, closed: false, start() {}, close() { this.closed = true; } };
        this.port2 = { close() {} };
        channels.push(this);
      }
    },
    requestAnimationFrame(callback) { tasks.set(++nextTask, callback); return nextTask; },
    cancelAnimationFrame(id) { tasks.delete(id); },
  };
  const frame = {
    dataset: {},
    style: { setProperty(name, value) { properties.set(name, value); }, removeProperty(name) { properties.delete(name); } },
    contentWindow: { postMessage(...args) { messages.push(args); } },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
  };
  return { frame, environment, channels, listeners, properties, messages,
    flush() { const pending = [...tasks.values()]; tasks.clear(); pending.forEach(callback => callback()); },
    get pending() { return tasks.size; },
  };
}

test('height admission accepts bounded whole pixels and rejects malformed layout claims', () => {
  for (const height of [1, 768, 4097, 100000]) assert.equal(acceptsHeight(report(height)), true);
  for (const height of [0, -1, 0.5, 100001, NaN, Infinity, '768', null]) {
    assert.equal(acceptsHeight(report(height)), false, `height ${String(height)}`);
  }
  for (const message of [null, [], {}, { ...report(900), version: 2 }, { ...report(900), extra: 'unowned' }]) {
    assert.equal(acceptsHeight(message), false);
  }
});

test('the current document channel coalesces growth and shrinkage into one frame write', () => {
  const fixture = carrierFixture();
  const controller = attach(fixture.frame, fixture.environment);
  assert.equal(fixture.messages.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.messages[0][0])), { type: 'context-canvas:content-fit-connect', version: 1 });
  assert.equal(fixture.messages[0][1], '*', 'opaque recipient accepts a layout-only transferred port');
  assert.equal(fixture.messages[0][2][0], fixture.channels[0].port2);
  const receive = fixture.channels[0].port1.onmessage;
  receive({ data: report(1700) });
  receive({ data: report(1900) });
  assert.equal(fixture.pending, 1);
  fixture.flush();
  assert.equal(fixture.properties.get('--about-content-block-size'), '1900px');
  assert.equal(fixture.frame.dataset.contentFit, 'ready');
  receive({ data: report(1900) });
  assert.equal(fixture.pending, 0, 'unchanged height adds no layout write');
  receive({ data: report(1100) });
  fixture.flush();
  assert.equal(fixture.properties.get('--about-content-block-size'), '1100px');
  controller.destroy();
  assert.equal(fixture.channels[0].port1.closed, true);
  assert.equal(fixture.listeners.size, 0);
});

test('navigation revokes the old document and queued updates before accepting a new channel', () => {
  const fixture = carrierFixture();
  attach(fixture.frame, fixture.environment);
  const staleReceiver = fixture.channels[0].port1.onmessage;
  staleReceiver({ data: report(1200) });
  fixture.listeners.get('load')();
  assert.equal(fixture.channels[0].port1.closed, true);
  assert.equal(fixture.pending, 0);
  staleReceiver({ data: report(9000) });
  fixture.flush();
  assert.equal(fixture.properties.size, 0, 'previous document retains no sizing authority');
  fixture.channels[1].port1.onmessage({ data: report(1500) });
  fixture.flush();
  assert.equal(fixture.properties.get('--about-content-block-size'), '1500px');
});

test('an excessive report restores the ordinary frame and a fresh load can recover', () => {
  const fixture = carrierFixture();
  attach(fixture.frame, fixture.environment);
  const receiver = fixture.channels[0].port1.onmessage;
  receiver({ data: report(1800) });
  fixture.flush();
  receiver({ data: report(100001) });
  assert.equal(fixture.frame.dataset.contentFit, undefined);
  assert.equal(fixture.properties.size, 0);
  assert.equal(fixture.channels[0].port1.closed, true);
  receiver({ data: report(1200) });
  fixture.flush();
  assert.equal(fixture.properties.size, 0);
  fixture.listeners.get('load')();
  fixture.channels[1].port1.onmessage({ data: report(1300) });
  fixture.flush();
  assert.equal(fixture.properties.get('--about-content-block-size'), '1300px');
});

test('unavailable channel support and failed transfer retain fallback geometry', () => {
  for (const failure of ['unavailable', 'transfer']) {
    const fixture = carrierFixture();
    if (failure === 'unavailable') fixture.environment.MessageChannel = undefined;
    else fixture.frame.contentWindow.postMessage = () => { throw new Error('detached frame'); };
    const controller = attach(fixture.frame, fixture.environment);
    assert.equal(fixture.properties.size, 0);
    assert.equal(fixture.frame.dataset.contentFit, undefined);
    controller.destroy();
  }
});

test('Gallery retains complete native matrix disclosures and an inline package-compatible adapter', () => {
  assert.equal((childSource.match(/class="matrix-disclosure" data-gallery-matrix open/g) ?? []).length, 2);
  assert.match(childSource, /Table A · Compare the six methods/);
  assert.match(childSource, /Table B · Compare the six next-learning routes/);
  assert.equal((childSource.match(/<table data-label=/g) ?? []).length, 2);
  assert.equal((childSource.match(/<th data-label="Method" scope="row">/g) ?? []).length, 6);
  assert.match(childSource, /<script data-embedded-content-fit>/);
  assert.match(childSource, /<script data-gallery-reading-lifecycle>/);
  assert.match(childSource, /document\.body\.getBoundingClientRect\(\)\.height/);
});

test('two receiving frames keep independent height channels and document lifecycles', () => {
  const first = carrierFixture();
  const second = carrierFixture();
  const gallery = attach(first.frame, first.environment);
  const prompt = attach(second.frame, first.environment);
  const galleryReceiver = first.channels[0].port1.onmessage;
  const promptReceiver = first.channels[1].port1.onmessage;
  galleryReceiver({ data: report(1400) });
  promptReceiver({ data: report(2700) });
  first.flush();
  assert.equal(first.properties.get('--about-content-block-size'), '1400px');
  assert.equal(second.properties.get('--about-content-block-size'), '2700px');
  first.listeners.get('load')();
  galleryReceiver({ data: report(9900) });
  promptReceiver({ data: report(3100) });
  first.channels[2].port1.onmessage({ data: report(1600) });
  first.flush();
  assert.equal(first.properties.get('--about-content-block-size'), '1600px');
  assert.equal(second.properties.get('--about-content-block-size'), '3100px');
  gallery.destroy();
  promptReceiver({ data: report(2500) });
  first.flush();
  assert.equal(second.properties.get('--about-content-block-size'), '2500px', 'one receiver can stop while its sibling remains usable');
  prompt.destroy();
});

test('both self-contained children receive exact shared code while retaining their reading owners', async () => {
  assert.deepEqual(embeddedContentFitTargets, [
    'collaboration/about-ai-method-gallery/index.html',
    'collaboration/about-prompt-conditions-explorer/index.html',
  ]);
  const projection = createEmbeddedContentFitProjection(adapterSource);
  for (const path of embeddedContentFitTargets) {
    const html = await readFile(resolve(root, path), 'utf8');
    assert.equal(replaceEmbeddedContentFitProjection(html, projection), html, `${path} matches the canonical child adapter`);
    assert.equal((html.match(/<script data-embedded-content-fit>/gu) ?? []).length, 1);
    assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/iu, `${path} retains its inline executable package boundary`);
  }
  assert.doesNotMatch(adapterSource, /beforeprint|afterprint|querySelectorAll/gu, 'shared layout code leaves instrument reading policies with their owners');
  const prompt = await readFile(resolve(root, embeddedContentFitTargets[1]), 'utf8');
  assert.equal((prompt.match(/<button class="selector"/gu) ?? []).length, 5);
  assert.equal((prompt.match(/<th scope="row" data-label="Condition">/gu) ?? []).length, 5);
  assert.match(prompt, /max-block-size: none;[\s\S]*?overflow-wrap: anywhere;/u);
});

test('materialization preserves surrounding source and admits one ordered receiver boundary', () => {
  const start = '<!-- embedded-content-fit:start -->';
  const end = '<!-- embedded-content-fit:end -->';
  const projection = createEmbeddedContentFitProjection('window.layoutReady = true;\n');
  assert.equal(replaceEmbeddedContentFitProjection(`before\n${start}\nold\n${end}\nafter`, projection), `before\n${projection}\nafter`);
  for (const html of ['', `${start}`, `${end}${start}`, `${start}${start}${end}`, `${start}${end}${end}`]) {
    assert.throws(() => replaceEmbeddedContentFitProjection(html, projection), /one ordered content-fit projection boundary/);
  }
  for (const source of ['', '  ', 'console.log("</script>");', '// </SCRIPT >']) {
    assert.throws(() => createEmbeddedContentFitProjection(source), /inline-safe JavaScript/);
  }
});

test('HTML script-state delimiters are rejected before receiver files change', async () => {
  const source = 'const sample = "<!-- <script>";';
  assert.doesNotThrow(() => new vm.Script(source), 'the fault is valid JavaScript whose HTML embedding changes parser state');
  const readReceivers = () => Promise.all(embeddedContentFitTargets.map(path => readFile(resolve(root, path), 'utf8')));
  const before = await readReceivers();
  assert.throws(() => createEmbeddedContentFitProjection(source), /inline-safe JavaScript/);
  assert.deepEqual(await readReceivers(), before, 'projection admission leaves both receiving documents intact');
});

function childFixture() {
  const windowListeners = new Map();
  const documentListeners = new Map();
  const jobs = [];
  const observers = [];
  const parent = {};
  const events = [];
  let bodyHeight = 1800;
  const document = {
    documentElement: { dataset: {} },
    body: { getBoundingClientRect: () => ({ height: bodyHeight }) },
    addEventListener(name, callback) { documentListeners.set(name, callback); },
    dispatchEvent(event) { events.push(event.type); bodyHeight = 1200; },
  };
  const window = { parent, addEventListener(name, callback) { windowListeners.set(name, callback); } };
  const ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(element) { assert.equal(element, document.body); }
    disconnect() { this.disconnected = true; }
  };
  vm.runInNewContext(adapterSource, { document, window, ResizeObserver, Event: class { constructor(type) { this.type = type; } }, queueMicrotask(callback) { jobs.push(callback); } });
  return { document, window, windowListeners, documentListeners, observers, events,
    flush() { while (jobs.length) jobs.shift()(); },
    setHeight(height) { bodyHeight = height; },
    get pending() { return jobs.length; },
  };
}
function childPort() {
  return { messages: [], closed: false, postMessage(value) { this.messages.push(JSON.parse(JSON.stringify(value))); }, close() { this.closed = true; } };
}
const connectMessage = { type: 'context-canvas:content-fit-connect', version: 1 };

test('the first accepted child fit lets its reading owner respond before measurement', () => {
  const fixture = childFixture();
  const port = childPort();
  fixture.windowListeners.get('message')({ source: fixture.window.parent, data: connectMessage, ports: [port] });
  assert.equal(fixture.document.documentElement.dataset.contentFit, 'active');
  assert.deepEqual(fixture.events, ['context-canvas:content-fit']);
  fixture.flush();
  assert.deepEqual(port.messages, [report(1200)], 'the first report includes the synchronous reading-owner change');
  fixture.setHeight(2100.25);
  fixture.observers[0].callback();
  fixture.documentListeners.get('toggle')();
  assert.equal(fixture.pending, 1);
  fixture.flush();
  assert.deepEqual(port.messages.at(-1), report(2101));
  fixture.observers[0].callback();
  fixture.flush();
  assert.equal(port.messages.length, 2, 'an unchanged natural height keeps the channel quiet');
});

test('child admission and reconnect retain one layout receiver and one initial reading transition', () => {
  const fixture = childFixture();
  const receive = fixture.windowListeners.get('message');
  const port = childPort();
  for (const event of [
    { source: {}, data: connectMessage, ports: [port] },
    { source: fixture.window.parent, data: { ...connectMessage, version: 2 }, ports: [port] },
    { source: fixture.window.parent, data: { ...connectMessage, extra: true }, ports: [port] },
    { source: fixture.window.parent, data: connectMessage, ports: [] },
  ]) receive(event);
  assert.equal(fixture.pending, 0);
  assert.deepEqual(fixture.events, []);
  receive({ source: fixture.window.parent, data: connectMessage, ports: [port] });
  const replacement = childPort();
  fixture.setHeight(1550);
  receive({ source: fixture.window.parent, data: connectMessage, ports: [replacement] });
  fixture.flush();
  assert.equal(port.closed, true);
  assert.deepEqual(port.messages, [], 'the superseded queued report retains no delivery authority');
  assert.deepEqual(replacement.messages, [report(1550)]);
  assert.equal(fixture.observers[0].disconnected, true);
  assert.deepEqual(fixture.events, ['context-canvas:content-fit'], 'a renewed transport preserves existing reading choices');
  fixture.windowListeners.get('pagehide')();
  assert.equal(replacement.closed, true);
  assert.equal(fixture.observers[1].disconnected, true);
});
