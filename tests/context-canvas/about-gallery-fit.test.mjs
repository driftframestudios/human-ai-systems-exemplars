import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '../..');
const parentSource = await readFile(resolve(root, 'context-canvas-project-surface/context-canvas/about-gallery-fit.js'), 'utf8');
const childSource = await readFile(resolve(root, 'collaboration/about-ai-method-gallery/index.html'), 'utf8');
const module = { exports: {} };
vm.runInNewContext(parentSource, { module });
const { acceptsHeight, attach } = module.exports;
const report = height => ({ type: 'context-canvas:gallery-height', version: 1, height });

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
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.messages[0][0])), { type: 'context-canvas:gallery-connect', version: 1 });
  assert.equal(fixture.messages[0][1], '*', 'opaque recipient accepts a layout-only transferred port');
  assert.equal(fixture.messages[0][2][0], fixture.channels[0].port2);
  const receive = fixture.channels[0].port1.onmessage;
  receive({ data: report(1700) });
  receive({ data: report(1900) });
  assert.equal(fixture.pending, 1);
  fixture.flush();
  assert.equal(fixture.properties.get('--about-gallery-block-size'), '1900px');
  assert.equal(fixture.frame.dataset.galleryFit, 'ready');
  receive({ data: report(1900) });
  assert.equal(fixture.pending, 0, 'unchanged height adds no layout write');
  receive({ data: report(1100) });
  fixture.flush();
  assert.equal(fixture.properties.get('--about-gallery-block-size'), '1100px');
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
  assert.equal(fixture.properties.get('--about-gallery-block-size'), '1500px');
});

test('an excessive report restores the ordinary frame and a fresh load can recover', () => {
  const fixture = carrierFixture();
  attach(fixture.frame, fixture.environment);
  const receiver = fixture.channels[0].port1.onmessage;
  receiver({ data: report(1800) });
  fixture.flush();
  receiver({ data: report(100001) });
  assert.equal(fixture.frame.dataset.galleryFit, undefined);
  assert.equal(fixture.properties.size, 0);
  assert.equal(fixture.channels[0].port1.closed, true);
  receiver({ data: report(1200) });
  fixture.flush();
  assert.equal(fixture.properties.size, 0);
  fixture.listeners.get('load')();
  fixture.channels[1].port1.onmessage({ data: report(1300) });
  fixture.flush();
  assert.equal(fixture.properties.get('--about-gallery-block-size'), '1300px');
});

test('unavailable channel support and failed transfer retain fallback geometry', () => {
  for (const failure of ['unavailable', 'transfer']) {
    const fixture = carrierFixture();
    if (failure === 'unavailable') fixture.environment.MessageChannel = undefined;
    else fixture.frame.contentWindow.postMessage = () => { throw new Error('detached frame'); };
    const controller = attach(fixture.frame, fixture.environment);
    assert.equal(fixture.properties.size, 0);
    assert.equal(fixture.frame.dataset.galleryFit, undefined);
    controller.destroy();
  }
});

test('Gallery retains complete native matrix disclosures and an inline package-compatible adapter', () => {
  assert.equal((childSource.match(/class="matrix-disclosure" data-gallery-matrix open/g) ?? []).length, 2);
  assert.match(childSource, /Table A · Compare the six methods/);
  assert.match(childSource, /Table B · Compare the six next-learning routes/);
  assert.equal((childSource.match(/<table data-label=/g) ?? []).length, 2);
  assert.equal((childSource.match(/<th data-label="Method" scope="row">/g) ?? []).length, 6);
  assert.match(childSource, /<script data-gallery-height-adapter>/);
  assert.match(childSource, /document\.body\.getBoundingClientRect\(\)\.height/);
});
