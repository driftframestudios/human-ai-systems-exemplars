# Paired table replay 02

This package makes Issue #330's next local comparison reviewable before browser
measurement. The parent owns application tables, the Vale decision, GitHub
coordination and independent review. This directory owns the proposed experiment.
The current standing is **defer pending revised protocol and fault-corpus review,
then completion of the parent's application browser closure**.

The application input is pinned to
`1b615bb6150c7aa6629d6ad0233895ba09fd1896`.
The research branch starts at cached research
`eb195762d206f65299cbcc91ed13c2fa1dbcb786`.
PR #327 is merged according to the supplied task. The existing worktree was clean
at entry. These are local/task-supplied coordinates; the parent owns live GitHub
reconciliation.

Read [the prospective protocol](PROTOCOL.md) alongside its executable
[parameters](protocol.json), [fault oracle](faults.json) and
[focused tests](replay.test.mjs). The earlier [research orientation](../README.md)
and [epoch observation](../epochs/table-repair-01-observation.md) retain their
historical jobs.

## Prepare for independent review

Revision review-02 carries the approved cancellation, deadline and fresh-control
repairs. The prior source and freeze remain inspectable at
.local/bundles/review-01; the original .local/frozen.json also remains intact.
The distinct revised source, isolated fixture and freeze live at
.local/bundles/review-02. Its approval uses the new bundle and frozen hashes.
These local snapshots preserve the review boundary without creating another
public receipt.


Run from the research worktree. The revised fixture is already prepared and frozen;
the following setup commands document the route for a fresh bundle. Set APP_REPO to the separate primary checkout
that contains the pinned Git object and its existing locked Node dependencies.
Every generated file stays under this package's ignored .local directory.
The fixture is an archive of the named commit, with independent copies of the
installed Node dependencies and Chromium runtime. Setup installs no packages.

```sh
REPLAY=research/table-verification-threshold/paired-replay-02/.local/bundles/review-02
APP_REPO=/absolute/path/to/primary/human-ai-systems-exemplars
node "$REPLAY/replay.mjs" prepare --application-repo "$APP_REPO"
node "$REPLAY/replay.mjs" freeze
node --test "$REPLAY/replay.test.mjs" "$REPLAY/runner-path.test.mjs"
node "$REPLAY/replay.mjs" decision
```

The preparation copies existing dependencies only when their installed package
records agree with the pinned lock. The freeze records their exact bytes, browser
installation bytes, browser executable size/mtime, Node executable/version,
platform, architecture, OS release, processor model/count, environment settings,
source manifests, ordered cases and counterbalanced schedule. A missing runtime
or package stops setup with its concrete condition. The owner can prepare the
repository's existing locked dependency/runtime lane and repeat setup in a new
local directory after retaining the failed setup record. Runtime provisioning
cost stays in setup.

The focused tests can run before setup: they read two thin production modules
directly from the pinned Git object into a disposable ignored fixture. They use
Node built-ins and launch zero browsers. The runner-path fixtures execute the
actual driver with small synthetic workers and send SIGINT/SIGTERM at its final
publication boundaries. Their disposable results remain outside the measured
study. No Python or additional dependency is needed.

The parent reviews the frozen bundle and independently adjudicates the hand-authored
fault expectations. The parent then fills .local/approval.example.json into a
separate .local/approval.json with its two exact hashes, reviewer role, approval
time, quiet-machine declaration and two affirmative approval fields. The runner
accepts only an approval matching the frozen source, protocol and runtime.
The example starts unapproved. Browser authorization follows both revised review
clearance and completion of the parent's application browser closure.

## Proposed execution after review

```sh
node "$REPLAY/replay.mjs" measure --approval "$REPLAY/.local/approval.json"
node "$REPLAY/replay.mjs" decision > "$REPLAY/result.normalized.json"
```

This is the decision-ready command, held for the parent's review. The proposal is
15 pairs / 30 policy invocations, **25 measured browser launches**, **840 measured
case attempts** (820 prototype cases and 20 observer fixtures), and a **900-second
measured-phase ceiling**. One seed and one warm-up add two launches / 78 attempts
under a separate 180-second ceiling: **27 planned launches / 918 attempts overall**.
Setup and focused Node fixtures add zero launches. The source-derived expected
document-navigation counts are 1,015 measured and 1,109 overall; the instrumented
counts become observations only when execution happens. Fixture setContent calls
remain separate from document navigations.

Use --pairs 1 for a deliberate stop after a complete pair. The next invocation
resumes the frozen order with the remaining cumulative budget. Multiple sessions
retain descriptive rows and produce indeterminate because host cache continuity
has changed. Interrupted pairs retain their attempts and stop the epoch; completed
pairs remain recoverable. Another reviewed epoch owns a retry. An abandoned
runner.lock or campaign.lock needs confirmation that its recorded process has
ended before local removal; automatic recovery preserves possible active writers.

Raw logs, checkpoint copies, generations, screenshots, approval and runtime/source
manifests remain ignored/local. The decision command emits an allowlisted normalized
return with ordered paired measurements, ranges, categorized costs and a next
receiver. A parent publication review owns result.normalized.json and any receiving
table/figure. The package makes no GitHub writes or commits.

## Separate effort records

Record supplied development, repair, review, definition or ancillary-check costs
with a shared causal event key. Omitted duration remains explicitly unmeasured.

```sh
node "$REPLAY/replay.mjs" record-cost --category review --event protocol-review --milliseconds unmeasured
node "$REPLAY/replay.mjs" record-cost --category harness-repair --event fault-omitted-owner --standing failed --milliseconds unmeasured
```

Accepted categories are harness-development, harness-repair, definition-change,
review, ancillary-material-check and observer-work. Execution, seed, warm-up,
checkpoint preparation and runner observations have their own automatic local
events. Event IDs join related work; their rows retain different units and costs.

The parent receives the protocol, proposed command and focused test result first.
After reviewed execution, the parent returns the bounded finding to #320 and
#278. Application changes use a separate main-targeting PR. Issue #331 predictive
scheduling, an eager-versus-batched timing study, public Context Canvas presentation
and broader browser/family research keep their separate review gates.
