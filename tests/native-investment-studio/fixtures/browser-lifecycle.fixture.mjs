import '../../../tools/node-runtime-admission.mjs';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { registerBrowserFixture } from '../browser-fixture-lifecycle.mjs';

// Timer handles stand in for server/browser handles so this lifecycle probe
// needs neither network binding nor Playwright. A missed close keeps it alive.
function acquire(name) {
  const handle = setInterval(() => {}, 60000);
  return { close() { clearInterval(handle); console.log(`fixture:${name}:close`); } };
}

registerBrowserFixture(async own => {
  console.log('fixture:setup');
  await setImmediate();
  await own(acquire('server'));
  await setImmediate();
  await own(acquire('browser'));
});

test('fixture case', () => console.log('fixture:case'));
