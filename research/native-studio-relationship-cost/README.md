# Native Studio relationship-cost study

This successor to [the edit-cost epoch](../native-studio-edit-cost/README.md)
asks whether the complete preparation owner and accepted graph projection remain
suitable after relationship editing. [Issue #673](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/673)
receives the result for #668 and #637. Application source stays on its accepted
branch, and publication remains held.

Read [PROTOCOL.md](PROTOCOL.md) before collecting. `protocol.json` pins the source,
populations and run counts. `fixtures.mjs` owns synthetic inputs and independent
accounting; `core.mjs` brackets source operations; `node.mjs` and `browser.mjs`
collect the named observations. The preceding epoch owns the reused statistics
function. Raw observations, source archives and machine details remain in ignored
`.local/` directories.

## Baseline decision — epoch 01

The independently reviewed [complete results](results/epoch-01.md) and
[aggregate JSON](results/epoch-01.json) bind candidate `cf16539` to 60 source runs
and 135 browser runs. Every planned run completed; private journals and completed
records agree sample-for-sample.

Retain complete preparation, accounting and bounded graph selection. Every
source phase meets its prospective target: the largest per-run median is
6.814 ms and the largest p95 is 12.610 ms. Direct selection retains accepted
state and list nodes. Every observed disposal releases listeners and pending
frames.

Capped accepted-state rendering earns a focused repair. WebKit connection Apply
has per-run medians of 70–71 ms and p95 values of 72–74 ms, while intercepted
state APIs have a 3 ms median. Its Undo median reaches 45 ms. Template Apply and
Undo medians reach 46 and 43 ms. Chromium and Firefox also exceed the 16 ms
median target for capped connection Apply. All rendering-opportunity p95 values
remain within the 100 ms target.

[Issue #679](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/679)
receives the source inspection, bounded DOM-reuse candidate, discriminating
correctness checks and a newly frozen comparison. Preserve this baseline and
its thresholds while that work proceeds. PR #675 remains pending this receiving
result; publication remains held.

## Prepare and review an epoch

Use Node 22.23.4 and the pinned source's installed dependencies and browser
executables. Set `NATIVE_STUDIO_SOURCE_ROOT` to the root of a **clean Git checkout**
of the full commit in `protocol.json`. The runner checks its exact HEAD, tracked
changes and untracked files before and after collection. Prepare dependencies
before starting the quiet measurement window. Run these commands from the
research checkout's repository root:

```sh
node research/native-studio-relationship-cost/study.mjs prepare
node --test research/native-studio-relationship-cost/fixtures.test.mjs research/native-studio-relationship-cost/core.test.mjs research/native-studio-relationship-cost/browser.test.mjs
node research/native-studio-relationship-cost/study.mjs freeze epoch-01
```

`prepare` verifies the source and retains its archive privately. The correctness
checks exercise deterministic collector clocks; their test-run durations are
ordinary runner output. `freeze` records the exact source closure, About styles,
fixtures, collectors, collector tests, protocol and runtime identities. It also
binds the inherited statistics implementation and both runtime-admission owners.

Obtain independent review of that exact freeze, then save the following record
as `research/native-studio-relationship-cost/.local/epochs/epoch-01/review.json`,
using the printed digest and the independent reviewer's identity:

```json
{
  "freezeDigest": "<digest printed by freeze>",
  "decision": "accepted",
  "reviewer": "<independent reviewer>"
}
```

The runtime record binds the Node executable, package versions and package
metadata, Playwright browser-revision metadata, and selected browser executable
hashes. Completed browser runs also record engine versions. These are selected
executable and package-metadata observations; a complete installation audit has
its own scope.

## Collect and summarize

After independent acceptance, run the two collections sequentially:

```sh
node research/native-studio-relationship-cost/study.mjs verify epoch-01
node research/native-studio-relationship-cost/study.mjs node epoch-01
node research/native-studio-relationship-cost/study.mjs browser epoch-01
node research/native-studio-relationship-cost/study.mjs summarize epoch-01 analysis-01
```

The runner shares the preceding study's exclusive timing marker. Keep other
checks and benchmark jobs at rest during collection; ordinary desktop activity
remains a recorded source of variability. Each attempted run writes its start,
verified samples, and completion or interruption to an append-only local record.
A complete collection binds those raw files by digest. Summarization verifies
both the frozen inputs and those completed raw identities.

`analysis-01` receives `results.json`, `results.md` and an analysis receipt inside
the epoch directory. `report.mjs` and `report.test.mjs` have their own analysis
digests, separate from the collection freeze. A report repair therefore receives
a fresh analysis directory while preserving the original raw epoch. Review the
allowlisted aggregate independently before using it for the keep-or-change
decision or copying it to a repository surface.

## Recover an interrupted attempt

Retain the attempted epoch and its completed samples. After resolving the cause,
freeze and independently review a fresh epoch, then run its complete declared
population. Exclusive writes preserve earlier records. A hard process termination
may leave the shared marker at
`research/native-studio-edit-cost/.local/running.json`; verify that its recorded
process has ended before removing that marker. Collector or source changes receive
a new epoch. Analysis-only changes receive a new `analysis-NN` directory.

The original edit-cost epoch, complete Studio, and publication standing remain
intact.
