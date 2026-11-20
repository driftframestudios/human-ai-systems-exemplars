import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createBrowserFixture } from './browser-fixture-lifecycle.mjs';

const run = promisify(execFile);
const childFixture = fileURLToPath(new URL('./fixtures/browser-lifecycle.fixture.mjs', import.meta.url));

test('teardown waits for pending server and browser acquisitions and releases each once', async () => {
  const serverReady = Promise.withResolvers(), browserReady = Promise.withResolvers();
  const acquiringBrowser = Promise.withResolvers();
  const events = [];
  const fixture = createBrowserFixture(async own => {
    events.push('setup');
    await own(serverReady.promise);
    acquiringBrowser.resolve();
    await own(browserReady.promise);
    events.push('ready');
  });
  const starting = fixture.start();
  const closing = fixture.close();
  assert.equal(fixture.start(), starting);
  assert.equal(fixture.close(), closing);
  serverReady.resolve({ close() { events.push('server:close'); } });
  await acquiringBrowser.promise;
  assert.deepEqual(events, ['setup'], 'the server remains owned while browser launch is pending');
  browserReady.resolve({ close() { events.push('browser:close'); } });
  await Promise.all([starting, closing]);
  await fixture.close();
  assert.deepEqual(events, ['setup', 'ready', 'browser:close', 'server:close']);
});

test('failed browser acquisition releases the server and retains the setup error', async () => {
  const failure = new Error('browser launch failed');
  const events = [];
  const fixture = createBrowserFixture(async own => {
    await own({ close() { events.push('server:close'); } });
    await own(Promise.reject(failure));
  });
  await assert.rejects(fixture.start(), error => error === failure);
  await assert.rejects(fixture.close(), error => error === failure);
  assert.deepEqual(events, ['server:close']);
});

for (const setupFails of [false, true]) {
  test(`${setupFails ? 'partial setup' : 'normal teardown'} attempts every close and preserves cleanup failures`, async () => {
    const setupFailure = new Error('second engine failed');
    const browserFailure = new Error('browser close failed');
    const serverFailure = new Error('server close failed');
    const events = [];
    const fixture = createBrowserFixture(async own => {
      await own({ close() { events.push('server:close'); throw serverFailure; } });
      await own({ close() { events.push('browser:close'); throw browserFailure; } });
      if (setupFails) throw setupFailure;
    });
    const expected = setupFails ? [setupFailure, browserFailure, serverFailure] : [browserFailure, serverFailure];
    const check = error => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.cause, expected[0]);
      assert.deepEqual(error.errors, expected);
      return true;
    };
    if (setupFails) await assert.rejects(fixture.start(), check);
    else await fixture.start();
    await assert.rejects(fixture.close(), check);
    await assert.rejects(fixture.close(), check);
    assert.deepEqual(events, ['browser:close', 'server:close']);
  });
}

test('closing an unused fixture leaves setup dormant', async () => {
  let starts = 0;
  const fixture = createBrowserFixture(() => { starts += 1; });
  await fixture.close();
  await assert.rejects(fixture.start(), /already closed/);
  assert.equal(starts, 0);
});

for (const [pattern, matches] of [['^fixture case$', true], ['^deliberately unmatched$', false]]) {
  test(`Node root hooks dispose a fixture with ${matches ? 'a matching case' : 'zero matching cases'}`, async () => {
    const env = { ...process.env };
    // The child owns a fresh test runner rather than inheriting this test worker.
    delete env.NODE_TEST_CONTEXT;
    const { stdout, stderr } = await run(process.execPath, [
      '--test', '--test-reporter=tap', `--test-name-pattern=${pattern}`, childFixture,
    ], { env, timeout: 10000 });
    assert.equal(stderr, '');
    assert.match(stdout, /# fixture:setup/);
    assert.match(stdout, /# fixture:server:close/);
    assert.match(stdout, /# fixture:browser:close/);
    assert.equal(stdout.includes('# fixture:case'), matches);
    if (matches) assert.match(stdout, /ok 1 - fixture case/);
    else assert.match(stdout, /^1\.\.0$/m);
    assert.match(stdout, /# fail 0\b/);
  });
}
