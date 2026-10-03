# Current-wave prospective campaign observer

## Receiving contract

The parent can record a reviewable run/hold reason and a prospective, assumption-labelled
probability before each of two already-required application campaigns. This research-only
adapter calls the existing `model.mjs` Beta functions and appends to the existing epoch
ledger. Application execution, deterministic selection and human acceptance retain their
own authority. The adapter starts no browser and has no skip action. Paired replay 02,
its reviewed freezes, and the application pipeline remain unchanged.

Standing: implementation ready for independent protocol/code review. The input template
is an uncounted draft. It records neither a current prediction nor an execution.

## Target, unit and ascertainment

Target: **at least one new consequential application finding in the complete declared
campaign**. A consequential finding changes a required visitor task, accessibility,
state integrity, or acceptance behavior enough to require application repair or changed
acceptance. Known findings, minor wording, source changes requested as new scope, and
harness faults retain separate identities. The independent receiver classifies findings;
a failing selector alone supplies a harness observation rather than an application event.

The opportunity is one frozen declared campaign within a repair cluster. The declared
93 Core/visitor cases include the two current hidden Strategy owner states and are
correlated coverage, not separate Bernoulli trials. Rebind the actual count, ordered IDs
and content identities at prospective entry. The three Shared/Studio journeys
form their own campaign, not three trials. Their distinct scopes receive separate cohorts;
the common repair cluster stays visible and their probabilities are not multiplied or
pooled. Within each cohort only the first prospectively recorded campaign in a repair
cluster can supply a likelihood outcome. Repaired reruns remain supplemental observations.

Current operational holds include human approval of the A3 manifest receipt correction
and the final source/population freeze. The Godel oracle repair has independent 30/30
focused-unit clearance; its planned browser scope remains three cases, one launch, seven
document visits and six screenshots. The parent reports the iframe package built with
38 routes, 68 files and 4,815,848 bytes. Those setup counts remain parent-reported; the
prospective entry supplies its actual source/protocol identities. PR334 head fc874df alone
does not identify the explicitly owned uncommitted follow-through delta.

Freeze the full revision, aggregate source digest (including any accepted uncommitted
content and projections), harness/definition digest, runtime digest, and exact ordered
case IDs using existing application evidence interfaces. Hashes establish identity;
source review, material assertions and execution establish behavior. The parent remains
the authority for supplying these identities and the fitting gate inventory; the adapter
reads no application checkout and does not independently certify those attestations.

Record the prediction before the actual campaign start. Its horizon ends after complete
declared coverage and independent finding adjudication at the same identity, rather than
a number of elapsed minutes. Completed case IDs plus the source-bound manifest digest
establish the reported coverage boundary. A partial, cancelled, substituted, changed-input,
retrospectively recorded or unadjudicated return has outcome `null`, including a partial
run with a finding. Preserve such findings but keep the incomplete opportunity outside
the likelihood. A zero requires full coverage and explicit completed adjudication.

Supply actual UTC start/end times and preserve unknown launch/attempt/duration metrics
as `null`. These campaign timestamps do not create an eligible late-defect follow-up
window or event-time exposure. The adapter fits neither late-defect nor waiting-time models.

## Probability and operational decision

For a comparable completed campaign, `Y | theta ~ Bernoulli(theta)` and
`theta ~ Beta(1,1)`. With `s` qualifying outcomes among `n` eligible prior repair clusters,
use `betaPosterior(1,1,s,n)` and `betaAnyEvent(A,B,1)`. The posterior distribution and
one-campaign predictive point are reported together. Sensitivities use the existing
Beta(1,3) and Beta(3,1) priors. Cohort exchangeability is an explicit assumption, not a
conclusion from repeated cases or these two heterogeneous campaigns.

Current ledger records have no eligible outcomes for this new prospective target. Each
draft therefore shows Beta(1,1), point 0.5, sensitivity points 0.25 and 0.75, and an empirical
estimate abstention. These numbers express assumptions, not measured risk or confidence.
Later eligible observations update the assumption-conditional distribution; calibration
remains absent. Calibration, threshold optimization, causal savings and general productivity
claims require other evidence and are outside this sidecar.

The decision depends on named evidence gates, never a numerical cutoff:

1. `hold-coherent-batch`: protocol review, source freeze/identity, or source/review clearance
   remains open. Preserve all reasons, changed dependencies and existing evidence standing.
2. `run-focused`: the coherent source is available but a mandatory deterministic prerequisite
   needs completion, or a bounded named uncertainty needs its own observation.
3. `run-required-closure`: the reviewed, frozen source has its deterministic prerequisites
   and the parent declares the final closure campaign required. Matching older evidence or
   any predicted probability cannot remove that requirement.

`plan` reports all three decisions without appending. `predict` appends only a cleared
`run-required-closure` opportunity. This prevents provisional hold/focused planning from
being counted as a frozen campaign forecast. If any gate changes after recording, hold
execution and terminally record cancellation/identity change; a revised campaign ID retains
the original repair cluster and supplemental standing. Human authorization still governs
whether an application command runs.

## Exact CLI and review fields

Run commands from the research worktree. There are no new dependencies.

```sh
node --test research/table-verification-threshold/shadow-campaign.test.mjs
node research/table-verification-threshold/shadow-campaign.mjs contract
node research/table-verification-threshold/shadow-campaign.mjs plan INPUT.json pr334-core-visitor-closure
node research/table-verification-threshold/shadow-campaign.mjs plan INPUT.json pr334-focused-acceptance-3
node research/table-verification-threshold/shadow-campaign.mjs predict INPUT.json pr334-core-visitor-closure
node research/table-verification-threshold/shadow-campaign.mjs predict INPUT.json pr334-focused-acceptance-3
node research/table-verification-threshold/shadow-campaign.mjs observe OUTCOME.json
```

Use `shadow-campaign-inputs.json` as the shape for a separate local input file. The parent
fills both campaigns' actual inventories/identities, known findings, source changes and
current gate standings. Independent review supplies `approval.reviewer`, UTC
`approval.reviewedAt`, and `approval.bundleSha256` from `contract`. The digest binds the
model, adapter, tests, protocol and draft template. Changing those reviewed files requires
renewed review. Review metadata is a trusted local attestation, not a signature system.

After each campaign, use this outcome shape, substituting the exact prediction event and
source identities from the recorded forecast. Each finding has a public semantic ID,
`kind` (`application-consequential`, `application-minor`, or `harness`), and explicit `new`.

```json
{
  "predictionEvent": "shadow-pr334-core-visitor-closure-prediction",
  "status": "complete",
  "startedAt": null,
  "endedAt": null,
  "identity": { "revision": null, "sourceSha256": null, "definitionSha256": null, "runtimeSha256": null },
  "completedCaseIds": [],
  "manifestSha256": null,
  "adjudication": { "status": "pending", "reviewer": null },
  "findings": [],
  "metrics": { "browserLaunches": null, "caseAttempts": null, "durationSeconds": null }
}
```

This incomplete example deliberately yields indeterminacy. Use `partial`, `cancelled` or
`not-started` when those describe the actual campaign. A completed campaign may include
failed assertions: ascertain application versus harness meaning before assigning the label.

## Ledger, input and cost boundaries

One parent serializes ledger writes. `predict` and `observe` append one durable record each,
retain the existing prefix, and reject duplicate event IDs. A failed or uncertain write
returns to the existing ledger for inspection, rather than a blind retry. The sidecar's
records have `countsAsBrowserExecution: false`: nested metrics link application evidence
without adding a second execution to epoch totals. Historical annotations retain their
original times and never become reconstructed predictions. Existing late-defect summaries
retain their separate target. An incorrect terminal record returns to human review; this
small adapter provides no silent replacement/correction route.

JSON inputs are trusted, sanitized local receipts, bounded to 256 KiB; the existing JSONL
ledger is bounded to 4 MiB. Campaign populations/findings are bounded to 512 IDs, gates to
64, and the input packet to these two campaigns. Use public semantic IDs and hashes; raw
logs, private paths, URLs and screenshots stay with their existing local owners. `--ledger`
selects a separate local JSONL file for isolated fixtures; ordinary use retains the epoch
ledger. The unit suite exercises real CLI paths only against temporary files.

Admission and coverage work scale with the declared cases, gates and findings. Each CLI
invocation reads the ledger once, scans historical events once, and classifies bounded
eligible outcomes; retained data and output scale with that ledger plus the frozen packet.
The probability calculations use three existing constant-work one-opportunity Beta calls.
Bundle hashing reads five bounded research files. Disk I/O, parsing and durable append
costs remain explicit; this implementation establishes no measured time savings.

The independent review return is the next gate. After approval, the parent records both
forecasts before their corresponding browser starts, runs the already-required application
commands, and appends independently adjudicated outcomes. Source/review holds remain
application-local; research browsers and paired replay remain held.
