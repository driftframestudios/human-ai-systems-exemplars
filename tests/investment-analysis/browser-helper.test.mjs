import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {withInvestmentBrowser} from './browser-helper.mjs';

function fixture(faults = {}) {
  const events = [], options = [], launches = [], timeouts = [];
  let nextContext = 0;
  function step(name) {
    events.push(name);
    if (Object.hasOwn(faults, name)) throw faults[name];
  }
  const browser = {
    async newContext(contextOptions) {
      const id = ++nextContext;
      step('context:' + id + ':create');
      options.push(contextOptions);
      return {
        async newPage() {
          step('page:' + id + ':create');
          const page = new EventEmitter();
          page.setDefaultTimeout = value => {
            step('page:' + id + ':timeout');
            timeouts.push(value);
          };
          return page;
        },
        async close() { step('context:' + id + ':close'); },
      };
    },
    async close() { step('browser:close'); },
  };
  const chromium = {
    async launch(launchOptions) {
      step('browser:launch');
      launches.push(launchOptions);
      return browser;
    },
  };
  const serve = async () => {
    step('server:start');
    return {
      origin: 'http://127.0.0.1:4242',
      async close() { step('server:close'); },
    };
  };
  return {events, options, launches, timeouts, chromium, serve};
}

test('family adapter preserves context options, returns after cleanup, and closes once', async () => {
  const f = fixture();
  const result = await withInvestmentBrowser(f.chromium, async ({origin, openPage}) => {
    assert.equal(origin, 'http://127.0.0.1:4242');
    await openPage({viewport: {width: 1239, height: 800}});
    const scriptless = await openPage({javaScriptEnabled: false});
    const first = scriptless.close();
    assert.equal(scriptless.close(), first, 'repeated close shares the same attempt');
    await first;
    f.events.push('body:complete');
    return 'accepted-result';
  }, {serve: f.serve});
  assert.equal(result, 'accepted-result');
  assert.deepEqual(f.launches, [{headless: true}]);
  assert.deepEqual(f.options, [{viewport: {width: 1239, height: 800}}, {javaScriptEnabled: false}]);
  assert.deepEqual(f.timeouts, [5000, 5000]);
  assert.deepEqual(f.events, [
    'server:start', 'browser:launch',
    'context:1:create', 'page:1:create', 'page:1:timeout',
    'context:2:create', 'page:2:create', 'page:2:timeout',
    'context:2:close', 'body:complete', 'context:1:close', 'browser:close', 'server:close',
  ]);
});

for (const {phase, expected} of [
  {phase: 'server:start', expected: ['server:start']},
  {phase: 'browser:launch', expected: ['server:start', 'browser:launch', 'server:close']},
  {phase: 'context:1:create', expected: ['server:start', 'browser:launch', 'context:1:create', 'browser:close', 'server:close']},
  {phase: 'page:1:create', expected: ['server:start', 'browser:launch', 'context:1:create', 'page:1:create', 'context:1:close', 'browser:close', 'server:close']},
]) {
  test('acquisition failure at ' + phase + ' releases only acquired resources', async () => {
    const fault = new Error('injected ' + phase);
    const f = fixture({[phase]: fault});
    await assert.rejects(withInvestmentBrowser(f.chromium, async ({openPage}) => {
      await openPage();
    }, {serve: f.serve}), error => error === fault);
    assert.deepEqual(f.events, expected);
  });
}

test('body failure retains its identity and closes outstanding contexts in reverse order', async () => {
  const fault = new Error('independent body failure');
  const f = fixture();
  await assert.rejects(withInvestmentBrowser(f.chromium, async ({openPage}) => {
    await openPage();
    await openPage();
    throw fault;
  }, {serve: f.serve}), error => error === fault);
  assert.deepEqual(f.events, [
    'server:start', 'browser:launch',
    'context:1:create', 'page:1:create', 'page:1:timeout',
    'context:2:create', 'page:2:create', 'page:2:timeout',
    'context:2:close', 'context:1:close', 'browser:close', 'server:close',
  ]);
});

test('cleanup failures retain the primary failure and do not skip later owners', async () => {
  const primary = new Error('body failure');
  const contextFault = new Error('context close failure');
  const browserFault = new Error('browser close failure');
  const serverFault = new Error('server close failure');
  const f = fixture({'context:2:close': contextFault, 'browser:close': browserFault, 'server:close': serverFault});
  await assert.rejects(withInvestmentBrowser(f.chromium, async ({openPage}) => {
    await openPage();
    await openPage();
    throw primary;
  }, {serve: f.serve}), error => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.cause, primary);
    assert.deepEqual(error.errors, [primary, contextFault, browserFault, serverFault]);
    return true;
  });
  assert.deepEqual(f.events, [
    'server:start', 'browser:launch',
    'context:1:create', 'page:1:create', 'page:1:timeout',
    'context:2:create', 'page:2:create', 'page:2:timeout',
    'context:2:close', 'context:1:close', 'browser:close', 'server:close',
  ]);
});

for (const {name, event, payload, message} of [
  {name: 'console', event: 'console', payload: {type: () => 'error', text: () => 'late console failure'}, message: /console: late console failure/},
  {name: 'page', event: 'pageerror', payload: new Error('late page failure'), message: /page: late page failure/},
  {name: 'request', event: 'requestfailed', payload: {method: () => 'GET', url: () => 'http://127.0.0.1:4242/missing', failure: () => ({errorText: 'late request failure'})}, message: /request: GET.*late request failure/},
  {name: 'response', event: 'response', payload: {status: () => 503, url: () => 'http://127.0.0.1:4242/unavailable'}, message: /response: 503/},
]) {
  test('final telemetry catches a late ' + name + ' failure and still releases resources', async () => {
    const f = fixture();
    await assert.rejects(withInvestmentBrowser(f.chromium, async ({openPage}) => {
      const {page} = await openPage();
      f.events.push('body:complete');
      page.emit(event, payload);
    }, {serve: f.serve}), error => {
      assert.equal(error.code, 'ERR_ASSERTION');
      assert.match(error.message, message);
      return true;
    });
    assert.deepEqual(f.events, [
      'server:start', 'browser:launch', 'context:1:create', 'page:1:create', 'page:1:timeout',
      'body:complete', 'context:1:close', 'browser:close', 'server:close',
    ]);
  });
}

test('a later invocation owns fresh telemetry after a failed invocation', async () => {
  const f = fixture();
  await assert.rejects(withInvestmentBrowser(f.chromium, async ({openPage}) => {
    const {page} = await openPage();
    page.emit('pageerror', new Error('first invocation only'));
  }, {serve: f.serve}), /first invocation only/);
  assert.equal(await withInvestmentBrowser(f.chromium, async ({openPage}) => {
    await openPage();
    return 'recovered';
  }, {serve: f.serve}), 'recovered');
  assert.deepEqual(f.events, [
    'server:start', 'browser:launch', 'context:1:create', 'page:1:create', 'page:1:timeout',
    'context:1:close', 'browser:close', 'server:close',
    'server:start', 'browser:launch', 'context:2:create', 'page:2:create', 'page:2:timeout',
    'context:2:close', 'browser:close', 'server:close',
  ]);
});

test('a retained opener cannot acquire resources after its session has settled', async () => {
  const f = fixture();
  let retainedOpen;
  await withInvestmentBrowser(f.chromium, async ({openPage}) => { retainedOpen = openPage; }, {serve: f.serve});
  await assert.rejects(retainedOpen(), /no longer accepting pages/);
  assert.deepEqual(f.events, ['server:start', 'browser:launch', 'browser:close', 'server:close']);
});
