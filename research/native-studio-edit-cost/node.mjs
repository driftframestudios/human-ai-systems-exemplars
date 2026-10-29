import { mkdir, open, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { BOUNDARY_TASKS, POLICIES, createPolicyTask, createBoundaryTask, stats } from './core.mjs';

function admitProtocol(protocol) {
  if (!protocol || !/^[a-f0-9]{40}$/u.test(protocol.sourceCommit ?? '')
      || protocol.node?.runs !== 5 || protocol.node?.warmup !== 50 || protocol.node?.samples !== 200) {
    throw new TypeError('Use the frozen source coordinate and five-run, 50-warm-up, 200-sample Node protocol.');
  }
}

function calibrate() {
  const noOp = [];
  let smallestAdvancingDelta = Infinity;
  let previous = performance.now();
  for (let index = 0; index < 10000; index += 1) {
    const next = performance.now();
    const delta = next - previous;
    if (delta > 0) smallestAdvancingDelta = Math.min(smallestAdvancingDelta, delta);
    previous = next;
  }
  for (let index = 0; index < 1000; index += 1) {
    const start = performance.now();
    noOp.push(performance.now() - start);
  }
  return { clock: 'performance.now', clockPairs: 10000,
    smallestObservedAdvancingDeltaMs: Number.isFinite(smallestAdvancingDelta) ? smallestAdvancingDelta : null,
    noOpSamplesMs: noOp, noOpSummaryMs: stats(noOp),
    interpretation: 'Observed clock advancement and empty timer-pair cost; values remain unadjusted.' };
}

export async function runNodeStudy({ sourceRoot, outputDirectory, protocol, fixtures, onProgress = () => {} }) {
  admitProtocol(protocol);
  if (process.versions.node !== '22.23.4') throw new Error('Use the declared Node 22.23.4 runtime.');
  if (!Array.isArray(fixtures) || fixtures.length !== 4
      || fixtures.map(fixture => fixture.id).join(',') !== 'example,medium,caps,near-byte') {
    throw new TypeError('Supply the four frozen fixtures in their declared order.');
  }
  await mkdir(outputDirectory, { recursive: true });
  if ((await readdir(outputDirectory)).length) throw new Error('Use an empty output directory to retain each measurement run separately.');
  const { createStudio } = await import(pathToFileURL(join(sourceRoot, 'collaboration/native-investment-studio/state.mjs')));
  const { createWorkDraftAdapter } = await import(pathToFileURL(join(sourceRoot, 'collaboration/native-investment-studio/draft.mjs')));
  const calibration = calibrate();
  await writeFile(join(outputDirectory, 'calibration.json'), JSON.stringify(calibration, null, 2) + '\n', { flag: 'wx' });
  const runs = [];
  const tasks = [...POLICIES, ...BOUNDARY_TASKS];
  let sequence = 0;
  for (let round = 0; round < protocol.node.runs; round += 1) {
    const order = [...tasks.slice(round % tasks.length), ...tasks.slice(0, round % tasks.length)];
    for (const fixture of fixtures) for (const task of order) {
      const prepare = () => POLICIES.includes(task)
        ? createPolicyTask({ fixture, policy: task, createStudio, createWorkDraftAdapter, now: () => performance.now() })
        : createBoundaryTask({ fixture, task, createStudio, now: () => performance.now() });
      const observation = { sourceCommit: protocol.sourceCommit, sequence: ++sequence,
        round: round + 1, fixture: fixture.id, task, facts: fixture.facts,
        warmupSamples: protocol.node.warmup, declaredSamples: protocol.node.samples,
        status: 'running', samples: [] };
      const id = `${String(sequence).padStart(3, '0')}-${fixture.id}-${task}-round-${round + 1}`;
      await writeFile(join(outputDirectory, `${id}.start.json`), JSON.stringify(observation, null, 2) + '\n', { flag: 'wx' });
      const handle = await open(join(outputDirectory, `${id}.jsonl`), 'wx');
      try {
        await handle.writeFile(JSON.stringify({ type: 'start', ...observation }) + '\n');
        for (let index = 0; index < protocol.node.warmup; index += 1) {
          const prepared = prepare();
          try { prepared.execute(); prepared.verify(); }
          finally { prepared.dispose(); }
        }
        for (let index = 0; index < protocol.node.samples; index += 1) {
          const prepared = prepare();
          let sample;
          try {
            const start = performance.now();
            prepared.execute();
            const traceMs = performance.now() - start;
            prepared.verify();
            const measured = prepared.snapshot();
            sample = { sample: index + 1, traceMs, ...measured };
            observation.samples.push(sample);
          } finally { prepared.dispose(); }
          // Source setup, semantic assertions, UTF-8 counting, teardown and raw
          // persistence are outside the trace timer. Every sample stays local.
          await handle.writeFile(JSON.stringify({ type: 'sample', ...sample }) + '\n');
        }
        observation.status = 'complete';
        observation.summary = {
          traceMs: stats(observation.samples.map(sample => sample.traceMs)),
          modelMs: stats(observation.samples.map(sample => sample.modelMs)),
        };
        await handle.writeFile(JSON.stringify({ type: 'complete', status: observation.status, summary: observation.summary }) + '\n');
        await writeFile(join(outputDirectory, `${id}.json`), JSON.stringify(observation, null, 2) + '\n', { flag: 'wx' });
        runs.push(observation);
      } catch (error) {
        observation.status = 'incomplete';
        observation.error = error instanceof Error ? error.message : 'Measurement failed.';
        await handle.writeFile(JSON.stringify({ type: 'incomplete', samplesRetained: observation.samples.length, error: observation.error }) + '\n');
        await writeFile(join(outputDirectory, `${id}.json`), JSON.stringify(observation, null, 2) + '\n', { flag: 'wx' });
        throw error;
      } finally { await handle.close(); }
      onProgress({ sequence, round: round + 1, fixture: fixture.id, task, samples: observation.samples.length });
    }
  }
  return { runs, calibration };
}
