import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SOURCE_TRACES, createSourceTrace, stats } from './core.mjs';
import { FIXTURE_NAMES, createFixture } from './fixtures.mjs';
const root = resolve(process.env.NATIVE_STUDIO_SOURCE_ROOT ?? new URL('./.local/app', import.meta.url).pathname);
const source = Object.assign({}, ...await Promise.all(['contract', 'state', 'editing', 'command-draft', 'connection-templates'].map(name =>
  import(pathToFileURL(resolve(root, `collaboration/native-investment-studio/${name}.mjs`))))));
for (const name of FIXTURE_NAMES) for (const trace of SOURCE_TRACES) test(`${name}/${trace}: complete public spans retain independent money and ownership`, () => {
  let tick = 0;
  const task = createSourceTrace({ fixture: createFixture(name, source.createExamplePlan), trace, source, now: () => ++tick });
  try {
    task.execute(); const result = task.verify();
    assert.ok(result.phases.length > 0); assert.ok(result.phases.every(row => row.processingMs === 1));
    assert.ok(result.producedUtf8Bytes > 0);
    assert.throws(() => task.execute());
  } finally { task.dispose(); }
});
test('statistics retain zero quantized values and nearest-rank p95 with all observations', () => {
  assert.deepEqual(stats([0, 1, 2, 3]), { count: 4, min: 0, max: 3, median: 1.5, p95: 3 });
  assert.throws(() => stats([])); assert.throws(() => stats([1, NaN]));
});

test('a wrong accepted response fails even when money and Undo still match', () => {
  const faulty = { ...source, createStudio(plan) { const owner = source.createStudio(plan); return { ...owner,
    applyCommand(command, expected) { return owner.applyCommand(command.type === 'connection.update'
      ? { ...command, connection: { ...command.connection, responseExpectation: 'Wrong response' } } : command, expected); } }; } };
  const task = createSourceTrace({ fixture: createFixture('small', source.createExamplePlan), trace: 'connection', source: faulty, now: () => 0 });
  try { task.execute(); assert.throws(() => task.verify(), assert.AssertionError); } finally { task.dispose(); }
});
