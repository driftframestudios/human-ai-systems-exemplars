# Native Studio edit-cost study

Measure whether the accepted working-session panel can keep preparing the full
plan as the native Studio grows. [Issue #641](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/641)
receives the result; [#637](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/637)
receives the next implementation recommendation. This research directory leaves
the complete Studio, native application source, and publication state intact.

Read [DECISION.md](DECISION.md) for the result and next tranche, with [results.md](results.md) for all workload tables.

Start with [PROTOCOL.md](PROTOCOL.md) for the question, independent arithmetic,
measurement boundaries, and decision thresholds. `protocol.json` fixes the
accepted source, four synthetic workloads, and repeated-run counts. `fixtures.mjs`
constructs the workloads; `core.mjs` and `node.mjs` observe source commands;
`browser.mjs` observes the accepted About controller in three engines.

## Reproduce a reviewed epoch

Use the repository-declared Node 22.23.4 runtime and accepted source's locked
Playwright dependencies and browsers. Make those dependencies available to both
this research checkout and the extracted application. Install tooling before the
quiet measurement window. The archive supplies application bytes independently
of the research branch's older visitor surface.

```sh
node research/native-studio-edit-cost/study.mjs prepare
node --test research/native-studio-edit-cost/fixtures.test.mjs research/native-studio-edit-cost/core.test.mjs research/native-studio-edit-cost/report.test.mjs
node research/native-studio-edit-cost/study.mjs freeze epoch-01
```

`prepare` extracts the accepted Git revision into ignored `.local/app` and checks
the named source owners. Obtain independent review of the exact protocol,
collectors, oracles, and freeze digest before recording outcomes. Keep that
review in `.local/epochs/epoch-01/review.json` with `freezeDigest`,
`decision: "accepted"`, and an identified `reviewer`. Then run sequentially:

```sh
node research/native-studio-edit-cost/study.mjs verify epoch-01
node research/native-studio-edit-cost/study.mjs node epoch-01
node research/native-studio-edit-cost/study.mjs browser epoch-01
```

The orchestrator admits one timing job at a time and verifies the frozen source
before and after each experiment. Each collector records attempted starts,
completed samples, and a complete or incomplete result. Keep other test and
benchmark jobs at rest during collection. Ordinary desktop activity remains an
explicit source of variability. The browser fixture isolates separate media
owners while retaining the accepted native controller and its active styles.

Raw rows, source archive, machine details, local paths, and interrupted attempts
stay in ignored `.local/`. After collection, generate the reviewed aggregate with:

```sh
node --input-type=module <<'JS'
import { readFile } from 'node:fs/promises';
import { writeStudyReport } from './research/native-studio-edit-cost/report.mjs';
const study = 'research/native-studio-edit-cost';
const protocol = JSON.parse(await readFile(`${study}/protocol.json`, 'utf8'));
await writeStudyReport({
  inputDirectory: `${study}/.local/epochs/epoch-01`,
  outputDirectory: `${study}/.local/report-check`,
  protocol,
});
JS
```

Choose a fresh output directory for each analysis attempt; the writer preserves
existing summaries. Compare the regenerated files with the reviewed tracked
`results.json` and `results.md`. Analysis code has its own digest, separate from
the frozen collectors. The report writer emits an allowlisted summary with
all five run statistics, counts, source identity, and normalized environment.
Interpret the report against its stated observation layer: synchronous work,
rendering opportunities, and resource counts establish different facts.

## Recovery and review

A failed or interrupted attempt remains part of the local record. Inspect its
failure and stop condition, repair a collector only when the evidence warrants
it, then freeze a fresh epoch and rerun the declared population. A hard process
termination may retain `.local/running.json`; verify that its process has stopped
before removing that marker. Keep the earlier epoch files intact.

Independent review checks the normalized report against the raw population and
the exact frozen collectors. Raw output stays private; the focused research PR
carries the decision, reproducible commands, fitting limitations, and next
receiver. A later native module receives its own implementation and review.
