# Selective CI admission, check depth, and preparation reuse

Load this reference when a repository needs explicit run/skip controls, a
focused/full choice, shared preparation, or a browser route that fits its
receiving claim. The [skill contract](../SKILL.md) owns composition. This
reference supplies the conditional decisions; the
[delivery runbook](../../../runbooks/selective-check-delivery.v0.1.md) orders
implementation and verification. The repository's workflow, commands, policy,
and current task grant retain operational authority.

## Separate the three decisions

| Decision | Question | Concrete output | Evidence meaning |
| --- | --- | --- | --- |
| Admission | Should this job start for this event and choice? | Explicit automatic condition or manual Boolean; evaluated before expensive preparation | A run, a deliberate skip, or an unmet prerequisite |
| Depth | Which checks answer the current question? | Exact file/case/project population, including required services and expected skips | The claim that this population can establish |
| Preparation | What does the selected population need? | Source checkout, verified runtime and dependencies, build, browser, service, ports and cleanup | An environment capable of executing the selected checks |

An installation cache is a preparation route. A scene smoke is a population.
A run/skip switch controls admission. Naming each separately lets a reviewer
reduce cost without silently changing what a result means.

## Establish the local contract first

Read the active Issue, repository instructions, nearest test README, workflow
and local action sources, package scripts, runner configuration, lockfile, and
the cases selected by each alias. Confirm the actual source revision, including
whether a pull-request job tests its merge revision or its branch head.
Preserve a dirty checkout; use an authorized isolated worktree when changes
would overlap.

Before changing a trigger, resolve these local inputs:

- Which checks are required by repository policy or protected-branch settings?
- Which changed files own behavior, including generated inputs, documentation
  that builds a visitor page, fixtures, schemas, and workflow helpers?
- What does each selection discover, execute, and deliberately skip?
- Which commands require an earlier build, database initialization, browser
  install, or exclusive server port?
- Which actions are authorized: editing, local execution, hosted dispatch,
  artifact retention, merge, publication, or database activation?
- Which observation and cost ceiling will let the receiver accept this change?

When a dependency edge is unclear, run the conservative affected family and
ask its source owner to refine the mapping. When a runtime, permission, or
account observation is unavailable, return the exact missing prerequisite and
the smallest executable continuation. Existing authorization continues to
apply; the method introduces no additional approval gate.

## Admission that a collaborator can predict

Give an optional manual route an explicit Boolean such as `run_checks`, with
its documented default. A value of `false` should withhold the whole expensive
job, including its service containers. A first shell step that exits early
already consumed runner preparation. Inspect the actual job records when
claiming that the job allocated no runner or service.

On GitHub Actions, Boolean values remain Boolean in the `inputs` context.
Use `jobs.<job_id>.if` for job admission. The following is an **illustrative
admission excerpt**, to be joined to the receiver's reviewed steps:

```yaml
on:
  workflow_dispatch:
    inputs:
      run_checks:
        description: Run the selected checks
        type: boolean
        default: true
      depth:
        description: Check population
        type: choice
        options: [focused, all]
        default: focused
concurrency:
  group: checks-${{ github.ref }}-${{ inputs.run_checks }}-${{ inputs.depth }}
  cancel-in-progress: true
jobs:
  verify:
    if: inputs.run_checks
    runs-on: ubuntu-24.04
    # The receiving workflow supplies its reviewed preparation and checks.
```

The grouping separates a skip from a run and a focused request from a complete
request. The owner decides which newer runs may supersede earlier runs; a
narrow or skipped request preserves broader evidence that remains required.
Read the platform's [input and concurrency semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
when adapting this excerpt.

Automatic admission has a separate policy. Define which events, draft states,
paths, and repository variables admit it. Document whether an unset activation
variable enables or rests the route. Keep an explicit manual route for an
authorized observation when automatic execution rests. Treat an unknown file
as potentially behavior-bearing until its owner classifies it; a suffix alone
does not establish that a change is documentation-only.

Protected checks need special care: workflow-level path or branch filtering
can leave a required check pending, while a skipped job can report a successful
conclusion. Reconcile the required-check policy through its owner. Report
`skipped` as withheld execution even when the platform marks the check green.
[GitHub documents job skip behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions).

## Check depth follows a claim

The following population names are examples, not a mandatory tier system.

| Population | Useful claim | Expansion or separate receiver |
| --- | --- | --- |
| Focused source/unit | One owner preserves a named behavior or contract | Shared dependency or adjacent failure opens its affected family |
| Core | The repository's declared source, type, invariant and ordinary integration population passes | Browser-dependent behavior and external services keep their own checks |
| Scene smoke | Named views load and selected interactions work in the admitted browser | Full interaction population, other engines, visual fidelity and mobile coverage remain explicit |
| Complete browser population | All repository-declared browser cases execute or report their prerequisite-specific standing | Opt-in database cases and live hosting are counted separately |
| Disposable database proof | Real-engine schema, query, transaction and HTTP behavior works in an isolated fixture | Hosted attachment, credentials, migration and activation retain their operator observation |
| Source/package proof | The named source produces an admissible, identifiable package | Application behavior and live deployment retain their accepted evidence |

Inventory case identities, projects, fixture modes, opt-ins, and exclusions.
Equal case counts cannot demonstrate equivalent membership. A selector that
discovers zero cases returns a selection error or an owner-reviewed empty
population; the receiver chooses which behavior is intended. If a required
case skips for a missing service or opt-in, the selected claim remains
`incomplete` until that prerequisite is supplied.

Keep complete release coverage available. A reviewed narrow default improves
feedback for ordinary changes; shared contracts, accepted release candidates,
unknown blast radius, or a named receiver can expand it. An automatic rerun
after a source change provides new evidence at its own revision; prior results
retain their original identity.

## Browser choice belongs to the selected population

| Route | Use when | Identity and recovery |
| --- | --- | --- |
| Available runner browser | A reviewed narrow population admits that browser and its supported APIs | Verify executable availability and report version, runner image, OS and architecture; prepare the locked browser if availability or compatibility fails |
| Framework-matched browser bundle | A reproducible compatibility or complete population needs the framework's expected browser | Install with the locked test framework and required system libraries; preserve the selected engine/project set |
| Additional engines or devices | The receiving claim includes engine differences, real-device behavior or a specific rendering environment | Use the named receiver rather than interpreting one desktop engine as universal coverage |

Playwright releases expect particular browser binaries; its browser guide also
distinguishes bundled engines and branded channels. A repository can admit
available Chrome for a specific smoke contract without claiming equivalence
to its locked Chromium population. Check CDP, media, headless and browser
policy dependencies in the actual cases. [Playwright browser guidance](https://playwright.dev/docs/browsers).

Fallback changes preparation, not the selected assertions. Report the browser
actually used and why fallback occurred. A behavior failure remains a failure;
switching browsers until one passes would conceal the original observation.
Keep its diagnosis and any second-engine result distinct.

Playwright advises against browser-binary caching as a default because
restoration can cost about as much as downloading and Linux system libraries
still need preparation. Begin with ordinary dependency-store reuse and direct
browser installation; use measurements before introducing another cache.
[Playwright CI guidance](https://playwright.dev/docs/ci#caching-browsers).

## Reuse preparation while preserving isolation

Combine checks in one job when source identity, runtime, lockfile, build mode,
trust boundary, and cleanup contracts match. One frozen dependency install and
one production build can support selected core checks, a browser population,
and package validation. Execute prerequisites in their actual order; some
apparently unit-level suites import generated server files or inspect bundles.

Keep each test's browser context, accepted-state fixture, storage, permission
scenario and server lifetime independent where its oracle requires isolation.
Share a prepared environment rather than accidentally sharing a previous
test's edits. Bound parallelism by CPU/memory and exclusive resources, not by
the number of available commands. Concurrent browsers and database owners
need distinct ports or a deliberately shared owner with proven teardown.

Separate destructive database proof from ordinary application checks. Use an
explicitly provisioned disposable service, schema and role; admit its identity
before clearing tables. A loopback address alone does not establish disposal:
it can point to a tunnel. The proof runner owns opt-in flags, destructive order,
reinitialization and cleanup so a missing flag cannot turn selected proof into
an unnoticed skip. Preserve real hosted data for its separately authorized
workflow.

A local composite action can share preparation or packaging instructions
between workflows. It does not share a running machine or existing build
between independent jobs. Cross-job build reuse needs an exact artifact
identity and verified transfer; dependency-cache reuse still requires each
selected behavior check. Use the existing
[provisioning reference](ci-provisioning-and-runner-efficiency.md) when cache,
image, or system-package cost is the actual bottleneck.

## Identity, retention, and authority

Bind a result to source/workflow revisions, resolved lock identity, selected
population, execution mode, runtime, browser, service/schema fixtures, and
relevant feature settings. Bind a package to its source commit/tree and
checksum. A package built from a later merge revision needs its own source
identity even when the reviewed branch supplied useful behavior evidence.

Keep job permissions to the actions actually required. Treat contributions as
untrusted code at the execution boundary; privileged dispatch, cache
publication, and hosted environments retain their repository policy. Pin
external actions according to that policy and review a local action at the
same source coordinate as its caller. Input choices remain bounded data passed
through environment variables or structured arguments, rather than executable
shell text. [GitHub's secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use).

Retain only the artifacts the receiving job needs. Source packages, checksum
files and normalized revision receipts can have explicit upload paths and
finite retention. Browser profiles, raw traces, screenshots, logs and database
credentials stay local or with their authorized private receiver unless their
release has its own reviewed purpose. Artifact retention supplies neither
deployment permission nor proof that the host accepted the package.

## Exercise the decision boundaries

Use the smallest set that distinguishes the changed wiring:

1. Lint the authored workflow and inspect actual called commands and actions.
2. Discover the intended narrow and complete populations without starting
   expensive services when the runner supports safe discovery.
3. Observe an admitted run at the exact revision and record preparation,
   build, test and package stages separately.
4. Dispatch an explicit skip when authorized and verify the job/service stayed
   unallocated and a required active run survived its concurrency boundary.
5. Exercise each changed fallback or destructive prerequisite with a fitting
   isolated observation. Preserve unchanged accepted proofs with their source
   identities rather than claiming that they executed again.
6. Have an independent reader review the diff, compare the population and
   trace one consequential refusal or recovery path.

An authored decision table explains intended behavior. A workflow linter checks
syntax and supported contexts. A local execution observes its environment.
A hosted run observes platform wiring and that runner's behavior. An independent
review adds a separate source assessment. Each supports a different part of
acceptance; none automatically supplies the others.

## Recovery and completion

| Observation | Preserve and continue |
| --- | --- |
| A skip reports green | Record `skipped`; obtain execution for any claim still required |
| A required check remains pending | Keep the branch policy intact; route trigger/check-name reconciliation to its owner |
| Runner browser is absent or incompatible | Prepare the framework-matched browser and run the same population |
| Browser behavior fails | Preserve the case, source and environment identity; diagnose before choosing a repair |
| Shared preparation causes contamination | Restore independent fixture/lifecycle ownership, then rerun the affected family |
| A selected database case skips | Supply its disposable prerequisite through the owned runner and return `incomplete` until executed |
| Packaging fails after tests pass | Retain the earlier test result at its exact source; repair and rerun the package owner and any changed dependency |
| Cancellation interrupts cleanup | Preserve completed results; mark teardown incomplete and re-enter through resource inspection |
| Measured cost remains unclear | Keep current coverage and collect separate setup/execution timings before changing topology |

The selective route is ready when a cold reader can predict its admission,
population, preparation and evidence meaning; the changed boundaries have
fitting observations; and its accepted receiver can identify the next action.
Record measured savings only with comparable source, population, runner and
phase denominators. A proposed reduction remains a design expectation.

## Evidence lineage and transfer

The existing [HASE provisioning route](ci-provisioning-and-runner-efficiency.md)
and [cross-repository stewardship record](../../../runbooks/cross-repository-test-system-stewardship.v0.1.md)
already distinguish hosted-browser smoke from broader engine proof and bind
cache claims to actual cold/warm observations. A separate portfolio-showcase
receiver exercised an admitted combined core/browser/package route and an
explicit database skip with no assigned runner or executed steps. Independent
review preceded delivery. Its access-controlled repository retains exact
source, workflow and artifact coordinates. Concurrent same-workflow dispatch
was reviewed in source rather than exercised as an overlapping run. This
bounded observation informs the portable method; each new repository still
establishes its own fit and results.

Official platform/browser references above were consulted on 2026-11-17.
Recheck them when platform, framework or action versions change. The
illustrative excerpt and tables define intended choices; a future invocation
of the companion runbook supplies its own exercise evidence.
