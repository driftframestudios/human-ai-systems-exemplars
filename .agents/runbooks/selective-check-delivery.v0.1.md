---
title: Selective check delivery
version: 0.1.0
status: working
audience: ai_collaborators
source_band: public_possible
task_type: operational_collaboration
---

# Selective check delivery

## Desired receiving state

A collaborator can deliver a reviewed check route that starts only through
its declared policy, executes a clearly named population, shares compatible
preparation, and returns evidence whose source and limits another collaborator
can understand. A manual skip preserves existing required work and reports
withheld execution. A complete release route remains available through its
named receiver.

This runbook carries one bounded workflow change from current truth to review
and authorized delivery. It implements the
[`test-suite-composition` contract](../skills/test-suite-composition/SKILL.md)
and its [selective CI reference](../skills/test-suite-composition/references/selective-ci-admission-and-check-depth.md).
The [cross-repository test-system stewardship runbook](cross-repository-test-system-stewardship.v0.1.md)
remains the broader owner for designing individual oracles, diagnosing test
topology, and coordinating several repositories. Use a focused existing
command directly when it already completes the task.

## Entry and safe non-entry

| Entry condition | When it is unavailable |
| --- | --- |
| The Issue or current instruction names the desired check route and acceptance | Return a proposed route and the specific decision still needed; preserve current workflow behavior |
| Source, branch, exact revision and unrelated work are known | Reconstruct them through repository re-entry before editing; preserve the existing checkout |
| Existing commands and assertions can be inspected | Record the missing owner and stop the dependent selection change; direct verified commands remain usable |
| Local and hosted actions have an identified grant and budget | Complete authorized source preparation; hand back a dispatch-ready route for the held action |
| Required-check and release obligations are known | Preserve standing gates and ask their owner to reconcile the proposed admission change |
| Needed runtime/browser/service can be prepared safely | Keep the selected population visible and return `friction` with its exact prerequisite |

Begin with read-only source observations:

```sh
git status --short --branch
git rev-parse HEAD
git diff --stat
rg --files --hidden -g '!.git/**' -g '!node_modules/**' \
  -g 'AGENTS.md' -g 'README.md' -g 'package.json' \
  -g '*lock*' -g 'playwright.config.*' -g '.github/**'
```

Read the nearest instructions, README, test configuration and selected test
files. Resolve the active Issue/PR through the configured repository tools.
Inspect current workflow activation and required checks when account access
permits. A source declaration and a hosted account setting are separate
observations; label an unavailable setting unverified.

Use an existing PR description, Issue comment or task record for this compact
invocation capsule:

| Field | Capture |
| --- | --- |
| Outcome and owner | The check-route decision, Issue/PR and acceptance receiver |
| Source identity | Repository, exact revision, branch, preserved changes and candidate diff |
| Action mode | Observation-only, implementation, local proof, hosted dispatch or authorized delivery |
| Current population | Command/case/project IDs, required opt-ins and expected skips |
| Proposed selection | Admission rule, default depth, explicit expansion event and preparation needs |
| Resource boundary | Runner/service/port ownership, budget, teardown and artifact retention |
| Held receiver | Any merge, publication, hosted activation or policy decision retained elsewhere |

## Owners and granted actions

The active Issue owns scope and acceptance. The workflow owns event admission,
the test owner owns assertions, the package/lock owners define preparation,
and the runner owns execution and cleanup. The current user grant supplies
action authority. Apply that grant as it stands; this runbook adds no new
approval ceremony.

Local execution, hosted dispatch, pushing a branch, merging a reviewed PR,
retaining artifacts and deploying them are distinct actions. Before each
mutation, compare its scope with the existing grant and the phase's stop
condition. An already-authorized action proceeds when its prerequisites hold.
A formed stop condition suspends the dependent mutation while preserving the
reviewable work and handback.

## Phase 1 — Reconstruct the current route

**Owner and mode:** Repository workflow and test owners; observation-only.

1. Trace the event through job conditions, reusable actions, scripts, fixtures,
   build outputs, browser or database startup, test discovery and teardown.
2. Record the actual argument vectors and selected case/project identities.
   Inspect opt-in flags so a default skip cannot be mistaken for service proof.
3. Separate queue, runner preparation, dependency installation, build,
   discovery, test execution, upload and cleanup. Use existing timing records;
   label unmeasured phases explicitly.
4. Compare the requested route with standing automatic and release gates.
   Name the precise cost or selection friction the change addresses.

**Checkpoint:** One source-grounded map explains what currently runs and why.
A prior baseline retains its exact revision, population and environment.

**Recovery and stop:** If a command's owner or side effects remain unclear,
keep the current command and inspect that boundary. Route an uncertain oracle
to evidence-bearing test design rather than changing admission to conceal it.

## Phase 2 — Set admission, depth and preparation

**Owner and mode:** The active Issue and suite contract; planning, then
implementation only within the grant.

Write a small decision table before changing YAML or a local runner. Include:

- ordinary automatic events, draft behavior and known documentation-only
  paths, with conservative treatment for unclassified files;
- the activation variable's unset/true/false meaning when one exists;
- explicit manual run and skip, independent of focused/complete selection;
- the exact narrow/default population and the complete accepted population;
- prerequisites for each selection, including real database proof;
- which runs may supersede other runs through concurrency; and
- the receiver that expands selection for shared changes or release.

For a GitHub receiver, place optional job admission at the job condition so
its runner and services remain unallocated when skipped. Use typed Boolean
inputs. Reconcile workflow-level path filters with protected required checks;
a platform-successful skipped job still carries `skipped` evidence standing.
Separate concurrency groups where a skipped or narrower request could cancel
required broader work.

Choose browser preparation from the actual population. An explicitly admitted
scene smoke may use the runner's available browser after capability/version
verification, with a documented framework-matched fallback. Complete browser
proof keeps its accepted engine/project population and lock-compatible
binaries. Preserve the original failure if a behavior check fails after a
browser launches successfully.

**Checkpoint:** A new reader can predict the job, population, environment and
result for every declared choice. The table identifies one expansion event.

**Recovery and stop:** Hold a policy change that would erase a required check.
Keep the existing route available while its owner reconciles protection,
budget or acceptance. Unknown browser equivalence defaults to the existing
framework-matched route.

## Phase 3 — Implement the smallest shared preparation

**Owner and mode:** Workflow/local runner owners; implementation.

Keep unrelated runtime and aesthetic behavior unchanged. Reuse existing
commands and source-owned expectations. Combine compatible selections within
one job when they can share a frozen install and exact-source build. Place
build-dependent tests after the build even if a script calls them unit tests.

Extract a local action or helper only when multiple actual callers share that
mechanic. Give it bounded inputs and explicit outputs; its caller retains
admission and required checks. A common action used by two jobs shares code,
while each job still prepares its own runner. Keep browser contexts, data
fixtures, server cleanup and test expectations independent.

Give destructive SQL proof an isolated disposable service and an owned runner
that validates its target, supplies required opt-ins, sequences destructive
tests and reseeds prerequisites. Preserve its engine version and complete
selected population during an admission-only change. Hosted database
activation remains with its separately authorized owner.

Give packaging its exact source coordinate, explicit archive/checksum/receipt
paths, size and layout checks, and finite retention. Keep raw diagnostic
artifacts with their private receiving owner. Packaging can follow selected
tests in the same job when the source/build identity and permissions match;
publication remains a separate receiving action.

**Checkpoint:** The diff preserves assertions, selected population, failure
semantics, resource ownership and fallback. Each shared helper has real
callers and an identifiable owner.

**Recovery and stop:** Restore separate lifetimes when sharing causes state or
port interference. Restore direct preparation when reuse identity is unclear.
Keep failure results visible while repairing the source that owns them.

## Phase 4 — Observe the changed boundaries

**Owner and mode:** Test/workflow owners; authorized local proof, then hosted
dispatch only within the existing grant.

Choose observations in proportion to the changed boundary:

| Observation | What it establishes | What stays open |
| --- | --- | --- |
| Workflow/action lint and source review | Syntax, supported contexts and declared invocation wiring | Hosted allocation and actual test execution |
| Safe discovery or plan output | Admitted case/project membership at the named source | Their runtime outcomes |
| Focused local run | Selected behavior in the local environment | Hosted runner/browser/service differences |
| Admitted hosted route | Selected preparation, checks and outputs on the named runner | Omitted populations and live deployment |
| Explicit skip dispatch | Withheld execution and, when observed, absent runner/service allocation | Every behavior claim that needs execution |
| Fallback/refusal exercise | The selected recovery or safety boundary under its fixture | Unexercised providers, tools or environments |
| Independent review | Another collaborator's assessment of the exact proposed diff | Any executable observation the reviewer did not perform |

For selective workflow changes, exercise the admitted route and an explicit
skip at the candidate revision when hosted dispatch is authorized. Inspect
job metadata as well as its green/red conclusion. Verify the skip preserved
any active required run. If no overlapping run was observed, state that
concurrency was reviewed rather than experimentally established.

Compare the selected and executed populations, including skips and external
opt-ins. Exercise changed recovery paths; preserve unchanged valid baseline
results with their identity instead of presenting them as new runs. Follow
the local suite's accepted timeout/retry policy. A slow observation receives
phase diagnosis before an assertion or population change.

**Checkpoint:** Every acceptance claim has an appropriate source or execution
observation. Separate newly executed, skipped and reused evidence.

**Recovery and stop:** A zero-match or missing-required-case result returns to
selection or preparation. A real failure returns to its owner. A partial run
keeps completed evidence and records unfinished cleanup before resumption.

## Phase 5 — Independent review and authorized delivery

**Owner and mode:** Independent reviewer, PR receiver and existing grant;
review, then authorized push/merge/publication as separately applicable.

Give the reviewer the exact diff, source identity, decision table and smallest
relevant observations. Ask the reviewer to trace both an admitted path and a
consequential skipped/refused path, including services, concurrency and
artifact permissions. Resolve material findings in a focused revision and
rerun only checks reopened by that revision.

Update the repository's one command map or README and its local runbook links.
State defaults, manual invocation, evidence limits and recovery in place of
superseded instructions. The workflow stays authoritative for executable
wiring. This portable runbook carries the method rather than a copy of every
repository's commands.

**Checkpoint:** The exact reviewed revision is the revision offered to the
authorized receiver. Any later merge or packaged source records its own
identity and the basis for receiving earlier evidence.

**Recovery and stop:** If review, source identity or an authorized receiving
condition remains unresolved, preserve the review-ready result and name the
next action. A successful check never supplies missing deployment authority.

## Recovery by remaining job

| Remaining job | Re-entry |
| --- | --- |
| Tests passed; packaging failed | Keep the test result's identity; repair packaging and rerun its affected checks |
| Optional job skipped; release proof required | Select the required population through the existing authorized receiver |
| Required check pending after trigger change | Reconcile the trigger/check policy through its owner; retain existing protection |
| Runner browser unavailable | Prepare the admitted framework-matched fallback and run the same cases |
| Shared environment contaminated a case | Restore isolated fixture/lifecycle ownership and rerun the affected population |
| Database or hosted permission unavailable | Keep local proof bounded; hand back the exact prerequisite to its owner |
| Interrupted execution or changed source | Compare evidence identities, inspect resource cleanup, then resume the first invalid or incomplete phase |

## One safe handback

Use the existing PR, Issue or task response. Include only fields that change
the receiving decision:

```text
Outcome and exact source/workflow revision:
Admission and selected depth:
Expected / executed / skipped / reused population:
Preparation, browser/service identity and observed fallback:
Normalized result and relevant phase timings:
What this establishes; remaining receiver-owned claim:
Artifact identity and retention, when relevant:
Independent review standing:
Recovery state and one next action:
```

Keep raw logs, traces, browser state, credentials, headers, protected routes
and user-specific paths with an existing local or access-controlled owner.
Report `pass` when the selected route completes, `friction` when a named
prerequisite has a concrete return path, and `blocker` when the requested
outcome needs an authority or capability outside the current route. Within
that return, preserve `skipped`, `incomplete`, `cancelled` and `reused` as
distinct execution standings.

## Exercise and maturity

This first version is `working`: existing repository practice informed the
method, while the authored procedure still needs its own receiving exercise.
The selective CI reference records its public evidence lineage. An independent
reader can use these two cases to check whether the instructions are usable:

1. **Ordinary route:** A repository has a passing complete baseline and wants
   an optional scene smoke that can share one build with core and package
   checks. Identify admission, exact smoke membership, browser identity,
   prerequisites, isolation, retained release proof and authorized delivery.
2. **Boundary route:** An operator chooses skip while a complete release run
   is active. A database-dependent case also skips in the ordinary browser
   population. Identify which work stays active, which job allocates nothing,
   which result is incomplete, and which owner can supply the missing proof.

These are authored scenarios, not passed tests. Record the reader's actual
path, consequential ambiguity and correction in the receiving PR. A real
invocation that reaches the named result or exposes a useful revision can
advance the runbook to `exercised`; the Issue retains that evidence rather than
creating a parallel ledger. Broader empirical claims need their own observations.

## Completion and reopening

Complete the route when the reader can select and execute the intended checks,
the changed boundaries have fitting evidence and independent review, and the
authorized receiver has one clear next action or accepted result. Reopen it
when a new population, shared dependency, runtime, browser, service, required
check, permission boundary or measured cost changes the decision. One shorter
owned command remains sufficient when it already fulfills that receiving job.
