import assert from 'node:assert/strict';
import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { SOURCE_TRACES, createSourceTrace, stats } from './core.mjs';
import { FIXTURE_NAMES, templateFixture } from './fixtures.mjs';

export function admitSourceProtocol(protocol, fixtures) {
  assert.match(protocol?.sourceCommit ?? '', /^[a-f0-9]{40}$/u);
  assert.deepEqual(protocol.fixtures, FIXTURE_NAMES);
  assert.deepEqual(protocol.node, { runs: 5, warmup: 50, samples: 200 });
  assert.deepEqual(fixtures.map(fixture => fixture.id), FIXTURE_NAMES);
  assert.equal(process.versions.node, '22.23.4', 'Use the selected measurement runtime.');
}

export function observeClock(now = () => performance.now()) {
  const clockPairs = 10000, noOpSamplesMs = [];
  let previous = now(), smallest = Infinity, advancingPairs = 0, zeroPairs = 0;
  for (let index = 0; index < clockPairs; index += 1) {
    const next = now(), delta = next - previous;
    assert.ok(Number.isFinite(delta) && delta >= 0, 'The measurement clock advances monotonically.');
    if (delta > 0) { smallest = Math.min(smallest, delta); advancingPairs += 1; }
    else zeroPairs += 1;
    previous = next;
  }
  for (let index = 0; index < 1000; index += 1) {
    const start = now(); noOpSamplesMs.push(now() - start);
  }
  return { clock: 'performance.now', clockPairs, advancingPairs, zeroPairs,
    smallestObservedAdvancingDeltaMs: Number.isFinite(smallest) ? smallest : null,
    noOpSamplesMs, noOpSummaryMs: stats(noOpSamplesMs) };
}

export async function runNodeStudy({ sourceRoot, outputDirectory, protocol, fixtures, onProgress = () => {} }) {
  admitSourceProtocol(protocol, fixtures);
  await mkdir(outputDirectory, { recursive: true });
  assert.equal((await readdir(outputDirectory)).length, 0, 'Use a fresh output directory for this attempted collection.');
  const source = Object.assign({}, ...await Promise.all(['contract', 'state', 'editing', 'command-draft', 'connection-templates']
    .map(name => import(pathToFileURL(join(sourceRoot, `collaboration/native-investment-studio/${name}.mjs`))))));
  const clock = observeClock(), runs = [];
  await writeFile(join(outputDirectory, 'calibration.json'), `${JSON.stringify(clock)}\n`, { flag: 'wx' });
  let sequence = 0;
  for (let round = 0; round < protocol.node.runs; round += 1) {
    const rotation = round % SOURCE_TRACES.length;
    const order = [...SOURCE_TRACES.slice(rotation), ...SOURCE_TRACES.slice(0, rotation)];
    for (const fixture of fixtures) for (const trace of order) {
      const input = trace === 'template' ? templateFixture(fixture) : fixture;
      const record = { sourceCommit: protocol.sourceCommit, sequence: ++sequence, round: round + 1,
        fixture: input.id, trace, facts: input.facts, status: 'running',
        warmupSamples: protocol.node.warmup, declaredSamples: protocol.node.samples, samples: [] };
      const id = `${String(sequence).padStart(3, '0')}-${input.id}-${trace}-round-${round + 1}`;
      const handle = await open(join(outputDirectory, `${id}.jsonl`), 'wx');
      const prepare = () => createSourceTrace({ fixture, trace, source, now: () => performance.now() });
      try {
        await handle.writeFile(`${JSON.stringify({ type: 'start', ...record })}\n`);
        for (let index = 0; index < protocol.node.warmup; index += 1) {
          const task = prepare();
          try { task.execute(); task.verify(); } finally { task.dispose(); }
        }
        for (let index = 0; index < protocol.node.samples; index += 1) {
          const task = prepare(); let sample;
          // Only core's named public-operation spans carry clocks. Preparation,
          // semantic assertions, byte encoding, disposal and persistence stay out.
          try { task.execute(); sample = { index, ...task.verify() }; }
          finally { task.dispose(); }
          record.samples.push(sample);
          await handle.writeFile(`${JSON.stringify({ type: 'sample', ...sample })}\n`);
        }
        record.status = 'complete';
        await writeFile(join(outputDirectory, `${id}.json`), `${JSON.stringify(record)}\n`, { flag: 'wx' });
        await handle.writeFile(`${JSON.stringify({ type: 'complete', samples: record.samples.length })}\n`);
        runs.push(record);
      } catch (error) {
        await handle.writeFile(`${JSON.stringify({ type: 'incomplete', retainedSamples: record.samples.length,
          error: error instanceof Error ? error.message : 'Collection failed.' })}\n`);
        throw error;
      } finally { await handle.close(); }
      onProgress({ sequence, round: round + 1, fixture: input.id, trace, samples: record.samples.length });
    }
  }
  return { runs, clock };
}
