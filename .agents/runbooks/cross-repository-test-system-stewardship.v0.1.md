---
title: Cross-repository test-system stewardship
version: 0.1.0
status: working
audience: ai_collaborators
source_band: public_possible
task_type: operational_collaboration
---

# Cross-repository test-system stewardship

## Desired receiving state

An AI or human collaborator can enter one repository in the Driftframe Studios
collection, identify the behavior and decision that need proof, select the
smallest sufficient test route, and return a result whose population, cost,
failure meaning, and expansion event remain legible to the next receiver.

Across `human-ai-systems-exemplars`, `gist-registry`, and the LIMS/ELN
constellation, completion means:

- focused checks retain their behavior owner and an independent oracle;
- one source-owned map explains which checks run for the current change;
- preparation, execution, artifact, publication, and cleanup time have
  separate owners;
- reuse accelerates preparation while the behavior population and strict
  result semantics remain intact;
- a full-suite or cross-repository run begins through a named expansion event;
- interruption preserves valid prior evidence with its original identity and
  scope; and
- the handback states exact commands, populations, outcomes, elapsed phases,
  evidence limits, and one re-entry action.

This runbook sequences two portable skills. Use
[`evidence-bearing-test-design`](../skills/evidence-bearing-test-design/SKILL.md)
to form or repair one discriminating observation. Use
[`test-suite-composition`](../skills/test-suite-composition/SKILL.md) to map,
select, time, reuse, and expand several owned observations. Repository overlays
below supply local commands, budgets, and receiving authority.

## Entry condition and task capsule

Use this runbook when a repository has several test families, a slow or costly
workflow, an unclear selective-test route, repeated setup, or a result that
must travel across repository boundaries. A single focused command that
already answers the receiving question remains the complete route.

Begin with this task capsule:

| Field | Required value |
| --- | --- |
| Outcome | The behavior, workflow, or release decision the evidence should support |
| Source | Repository, branch or exact revision, and clean or preserved worktree standing |
| Current owner | Issue, pull request, source contract, or named human decision surface |
| Change | Files, semantic IDs, package, workflow, dependency, or environment that changed |
| Granted actions | Observation, local execution, repository edit, hosted dispatch, push, pull request, merge, or another explicit subset |
| Held decisions | Merge, release, deployment, credentials, policy acceptance, or another choice retained by its named owner |
| Budget | Time, Actions use, external calls, browser engines, services, and artifact retention available to this cycle |
| Finish with | Exact selected population, commands, phase timings, outcomes, evidence boundary, recovery state, and next receiver |

First preserve current work and identify the local instruction owners:

```sh
git status --short --branch
git rev-parse --show-toplevel
git rev-parse HEAD
git log -5 --oneline --decorate HEAD
rg --files -g 'AGENTS.md' -g 'README.md' -g 'package.json' \
  -g 'pyproject.toml' -g 'uv.lock' -g 'package-lock.json' \
  -g '.github/workflows/*.yml' -g '.github/workflows/*.yaml'
```

Read the root instructions, nearest test README, active Issue or pull request,
workflow source, lock or dependency owner, and existing focused checks before
changing suite topology. A dirty or overlapping checkout remains intact. Use
an authorized clean worktree for implementation or return a `friction`
handback that names the overlap and a safe receiver.

## Authority map

| Surface | Authority in this route |
| --- | --- |
| Accepted domain contract, specification, or named decision owner | Defines intended meaning and acceptance criteria |
| Product implementation, schema processor, workflow, or publication source | Supplies the actual behavior and exact source coordinate under observation |
| Focused test and fixture | Owns the executable observation and its independent expectation |
| Suite catalog, manifest, or documented command map | Owns intended membership and routing metadata |
| Runner and workflow | Own execution, environment preparation, timeout, artifact, and job result behavior |
| Lockfile, browser bundle, image, service container, or hosted tool | Owns the dependency or environment identity used by a run |
| GitHub Issue | Owns the current outcome, scope, dependencies, and acceptance criteria |
| Pull request | Owns the proposed diff, review conversation, checks, and receiving decision |
| Current task grant | Authorizes repository mutations and external actions for this cycle |
| Named human or protected receiver | Retains merge, release, deployment, credentials, policy, and consequential acceptance decisions |

Planning, discovery, execution, and acceptance produce distinct evidence. A
plan establishes intended membership. Discovery establishes admitted cases.
Runner output establishes executed outcomes. The named receiver establishes
acceptance.

## Result and timing vocabulary

Use these standings consistently:

| Standing | Meaning |
| --- | --- |
| `executed_pass` | The named population executed and met its owned assertions |
| `executed_failure` | At least one executed case produced its owned failure signal |
| `skipped` | A named condition withheld execution and the receipt includes the reason |
| `blocked` | A required capability or authority remains with a named receiver |
| `incomplete` | The selected population began and finished with missing result-bearing work |
| `cancelled` | A named actor or system stopped execution before completion |
| `reused` | Prior evidence with matching identity and scope supplied a declared result |
| `unobserved` | The observation remains with a later named receiver |

For every material run, capture these phases separately when the workflow
exposes them:

1. queue and runner acquisition;
2. runtime and dependency preparation;
3. service, browser, or fixture preparation;
4. test discovery;
5. test execution;
6. artifact compilation or comparison;
7. publication or upload;
8. cleanup; and
9. total elapsed time.

The phase receipt identifies where time changed. Cache lookup and restoration
establish their own transport signals. Dependency verification and admitted
use establish preparation reuse. The owned tests establish behavior.

## Ordered route

### Phase 1 — Reconstruct current test-system truth

**Owner and mode:** The primary collaborator works in `observation_only` mode
until the task and active owner establish a wider grant.

1. Record repository, source revision, branch, worktree standing, runtime, and
   local or hosted execution context.
2. Inventory focused commands, aliases, suite catalogs, workflow jobs, browser
   or service dependencies, generated artifacts, and live receivers.
3. Connect each check to its behavior owner and observation layer: source,
   schema, unit, integration, artifact, workflow, browser, visual/media,
   carrier, live receiver, or research.
4. Distinguish measured duration from remembered duration, and behavior work
   from environment preparation.
5. Record existing cache, image, checkpoint, retry, timeout, concurrency, and
   artifact policies with their current source owner.

**Checkpoint:** One current-truth map names the exact source coordinate,
behavior owners, runnable populations, environment identities, phase evidence,
and currently held decisions.

**Recovery and stop:** Preserve conflicting work and cached remote knowledge
at their observed standings. When source, scope, or mutation authority remains
ambiguous, return the map and the one choice that releases the next phase.

### Phase 2 — Repair the smallest behavior proof

**Owner and mode:** The behavior owner and
`evidence-bearing-test-design` supply the observation. Implementation begins
through the current grant.

For each changed behavior:

1. state the desired behavior and receiving consequence;
2. describe one plausible faulty alternative;
3. select the smallest observation layer that distinguishes the two;
4. derive the expectation from a literal fixture, independent calculation,
   named invariant, or independently governed contract;
5. require a substantive expected population before comparing projections;
6. include adjacent meanings such as absent and zero, pending and accepted,
   fresh and stale, or owned and inherited when they change the result; and
7. exercise failure, retained accepted state, resource cleanup, or recovery
   when the behavior crosses those boundaries.

Reuse helpers for server lifecycle, clocks, telemetry, artifacts, and cleanup.
Keep expected domain values visible in the case.

**Checkpoint:** Each focused test names the behavior it establishes, the fault
it distinguishes, the expected population, its command, and its evidence
boundary. A controlled perturbation changes the signal when practical.

**Recovery and stop:** A passing test that shares its expected calculation with
production logic or compares two empty populations returns to an independent
oracle. Product meaning that remains unsettled returns to its decision owner.

### Phase 3 — Compose the smallest adequate route

**Owner and mode:** `test-suite-composition` joins existing owners; each test
retains its assertions and failure meaning.

1. Select focused source or unit checks for a local behavior owner.
2. Add family integration when adapters, generated twins, persistence, or
   cross-component contracts change.
3. Add a real browser when material behavior depends on layout, paint, focus,
   interaction, downloads, media, or browser event semantics.
4. Add workflow proof when dependency preparation, permissions, cache,
   artifacts, services, or runner behavior form part of the claim.
5. Add full-suite, cross-repository, release, or live proof when a shared
   dependency, accepted candidate, exact-coordinate contract, or named
   receiver supplies that expansion event.
6. Enumerate intended IDs and commands before expensive work. Record the
   reason each selected owner reopened.

**Checkpoint:** The plan exposes commands, source and dependency edges,
environment needs, side effects, expected population, result meanings,
estimated or measured phases, and the event that expands coverage.

**Recovery and stop:** A zero-match selector returns a named result rather than
an implicit pass. Unknown edges receive owner review and a conservative
affected-family route. One direct command remains the route while it is the
smallest complete owner.

### Phase 4 — Measure before optimizing

**Owner and mode:** Existing workflows and runners own the observations. The
active Issue owns the optimization question.

Run or inspect one comparable baseline with the source, population, runner,
runtime, lock or dependency identity, browser engines, services, and artifact
policy recorded. Separate queue, preparation, execution, artifact, and cleanup
time. When local and hosted runs differ, preserve both contexts instead of
merging their durations.

Choose the intervention through the measured owner:

| Observed owner | First route to consider |
| --- | --- |
| Dependency transfer or installation | Hosted capability, lock-bound cache, prebuilt image, or dependency closure reuse |
| Browser or service installation | Runner image or exact tool bundle with a verified fallback |
| Discovery or runner startup | Focused selectors, runner reuse, or family composition |
| Behavior execution | Partition by behavior owner, state, engine, or consequence while preserving aggregate release coverage |
| Artifact comparison or build | Delta-aware inputs, retained exact artifacts, or bounded concurrency |
| Queue or hosted capacity | Concurrency, trigger, runner class, or schedule policy through its hosted owner |

Use the suite skill's
[CI provisioning and runner efficiency reference](../skills/test-suite-composition/references/ci-provisioning-and-runner-efficiency.md)
when preparation owns the delay. Bind cache or image identity to the resolved
dependency plan, runtime, operating system and architecture, runner image
generation, tool or browser version, install semantics, and the files that
change closure. Restore can use reviewed compatibility; save authority belongs
to a trusted route after behavior proof passes.

**Checkpoint:** The selected intervention corresponds to an observed phase and
retains the behavior population, strict failure semantics, fallback, and
cleanup route.

**Recovery and stop:** A preparation optimization with unresolved identity or
fallback returns to direct preparation. A behavior phase that owns the delay
receives composition or segmentation as its fitting intervention.

### Phase 5 — Exercise success, fallback, and interruption

**Owner and mode:** The current grant authorizes local or hosted execution.
Protected hosted dispatch and workflow changes retain their named receiver.

Exercise the smallest consequential set:

- direct or cold preparation followed by the full selected behavior
  population;
- exact reuse and compatible fallback when the design supports both;
- an exact or compatible restoration that the dependency verifier rejects;
- cache miss or unavailable preparation followed by direct setup;
- one behavior failure with useful causal diagnosis;
- cancellation or partial initialization with cleanup; and
- checkpoint or artifact reuse only when source, dependencies, runtime,
  environment, observation contract, and required outputs still match.

Collect final telemetry before publishing accepted evidence. Keep earlier
completed results with their original identities when later work fails.

**Checkpoint:** Each route returns its preparation standing and behavior
standing separately. The receipt includes case, file, engine, launch, skip,
reuse, and artifact populations that matter to the receiver.

**Recovery and stop:** An exact or compatible restoration that fails validation
returns `rejected_restore`, follows the direct fallback, and routes key
invalidation or versioning to the cache owner. The runner's cancellation
handler invokes available teardown and returns every durable completed result
plus the first safe re-entry point. A hard stop records cleanup as `incomplete`
when the teardown handler cannot finish.

### Phase 6 — Expand through named events

**Owner and mode:** The active Issue and repository policy own expansion.

Expand beyond the focused route when one of these events occurs:

- a shared dependency, schema, build tool, runner helper, or generated
  contract changes;
- a focused test reveals an adjacent fault or uncertain edge;
- a browser-dependent behavior changes or an engine-specific observation
  becomes material;
- a package or cross-repository coordinate changes;
- a release candidate or publication projection needs acceptance;
- the current route misses its expected population; or
- the named receiver requests the complete accepted gate.

Predictive or probabilistic selection can run as a research lane bound to its
event, eligible population, model or rule version, review, and outcome metric.
Standing deterministic gates continue until a separately reviewed adoption
decision changes them.

**Checkpoint:** The expanded population and its trigger remain visible. The
result reports actual execution, skips, reuse, and incompleteness.

**Recovery and stop:** A full suite whose cost exceeds its budget returns a
phase receipt and the population completed so far. The owner can then approve a
larger budget, a measured partition, or a different receiver while keeping the
incomplete standing explicit.

### Phase 7 — Settle the source map and hand back

**Owner and mode:** The repository owning each command receives its durable
documentation. The current grant determines commit, push, pull-request, merge,
and hosted-action boundaries.

Update the single source-owned suite map, manifest, README, workflow comments,
and current Issue only where the route materially changed. Preserve exact
runtime, dependency, environment, and artifact identity where they determine
reuse or reproduction. Record measured denominators and observation dates with
performance claims.

**Checkpoint:** A cold collaborator can select and interpret the route with
every prerequisite visible. The receiving Issue or pull request contains the
outcome and evidence boundary; this runbook keeps the reusable sequence.

**Recovery and stop:** Stop at every human-held merge, release, deployment,
credential, or policy boundary. Return the review-ready or dispatch-ready state
with one exact re-entry action.

## Repository overlays

### `human-ai-systems-exemplars`

Use the repository test-suite catalog and planner as the source-owned route
map. Preserve focused source, schema, unit, integration, media, browser,
carrier, and live-receiver meanings as distinct populations. The planner
selects reviewed commands, and each source owner retains its assertions.

Apply these local rules:

- measure workflow phases before changing suite population;
- bind dependency-reuse identity to the resolved installation plan and runner
  context, including operating system, architecture, and hosted image version;
- report preparation states such as exact hit, compatible restore, rejected
  restore, miss, unavailable, cancelled, and skipped independently from test
  results;
- report cache key match and restoration separately; use dependency
  verification and admitted execution as preparation-reuse evidence, then
  retain the product, browser, or Worker checks as behavior evidence;
- preserve the narrow hosted-Chrome lane for its owned smoke contract while
  the complete Chromium, Firefox, and WebKit population retains its broader
  browser authority; and
- treat a browser workflow that runs longer than 30 minutes as a local
  decomposition trigger. Optimize preparation first when preparation owns the
  duration; segment by owned browser behavior or state when execution owns it.

Current exercise evidence is source-bound to
[Issue #597](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/597)
and [PR #598](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/598).
At the exercised PR coordinate, the cold path completed in 1 minute 9 seconds
with 79 of 79 tests, 3 of 3 browser checks, and the Worker dry run passing.
That receipt establishes the direct-install fallback and selected behavior
population. A trusted warm-path run remains pending; speedup, exact-hit
behavior, and trusted save authority retain that next observation.

### `gist-registry`

Begin with the package that owns the changed snippet, schema, contract, or
projection. Run package-local checks first, then expand to registry-wide and
Pages-projection checks when shared registry relations, builder behavior,
public selection, or release acceptance changes. `npm test` and the complete
registry route remain explicit accepted gates where repository policy assigns
them that role.

Use the registry's existing measurement, comparison, resource-boundary,
recovery, and typed-diagnostic skills to shape phase evidence and actionable
failure returns. Preserve package assertions with the package; composition
supplies routing and aggregation rather than a second semantic authority.

Distinguish an actual receiver from a synthetic browser fixture before
reporting visual coverage. A digest-bound interaction smoke can establish that
the built receiver loads and responds. Geometry, directionality, focus, paint,
and responsive claims require the actual receiver or a fixture whose declared
equivalence covers that exact behavior. Record which target each engine
observed and which claim the observation supports.

For the current builder topology, treat `.artifacts/pages/` as an ephemeral
candidate owned by `tools/build-pages.mjs`. A local candidate supports
comparison. The source revision, selected skill or snippet versions, and
projection contract supply durable identity. Concurrent candidate writes,
first-error exits, aggregate diagnostics, delta planning, and protected `docs`
publication retain their active Issue owners and acceptance criteria.

### LIMS/ELN constellation

The constellation includes `site-reading-governance`,
`lims-eln-program-specification`, `lims-eln-simulated-final-state`,
`lims-eln-enterprise-implementation`, and `lims-eln-comparative-evidence`.
`lims-eln-program-specification` coordinates the collection through its
constellation lock and exact repository coordinates. Each repository retains
its own source, tests, history, and release authority.

Apply these local rules:

- use each repository's source-controlled Python and `unittest` route for
  focused behavior proof;
- preserve exact-coordinate and lock validation before cross-repository claims;
- retain deterministic two-run, matrix, full-history, and configured-database
  evidence as distinct populations with their own prerequisites;
- let the Program coordinator select constellation-wide proof while each
  repository reports its local result and release standing;
- expand to cross-repository proof when a locked coordinate, shared contract,
  generated encounter, or release candidate changes; and
- require each selected cross-repository case to execute. A required case that
  skips because its exact sibling package or fixture is absent returns
  `incomplete` and re-enters through dependency preparation;
- retain the Program release workflow's all-sibling population until its own
  reviewed routing decision changes that accepted gate; and
- measure dependency setup and test execution separately before introducing a
  Python cache or prebuilt runner. Existing fast focused runs retain their
  direct route until timing evidence demonstrates an optimization target.

For a concrete settlement sequence, let `P` be the accepted Program contract
coordinate, `I` the Enterprise candidate that consumes and proves `P`, and `L`
the Program successor that records the accepted implementation coordinate and
tree digest for `I`. Program identity proof at `P` and `L`, Enterprise behavior
proof at `I`, and the joined lock claim remain separately attributable.

Hosted PostgreSQL service-container checks establish their synthetic database
contract at the recorded image digest, migration head, roles, fixtures, and
observation contract. Configured-vendor qualification retains its actual
vendor environment, validation protocol, accountable operator, and acceptance
receiver. Reuse a prior matrix or database receipt only when its repository
commit, Program coordinate, Python version, service and migration identities,
fixture population, roles, and observation contract all match.

Full-history evidence keeps its real Git-history prerequisite. A local unit
pass establishes its bounded behavior and leaves those environment-specific
claims with their own receivers. The Functional Nucleus inside
`human-ai-systems-exemplars` is an integrated snapshot; the five standalone
repositories retain current source and release authority.

### Held collection member

Dispatch only the repositories named in the current task capsule.
`artifact-literacy-cartography` currently carries a human-held replacement
decision, so record it as `held_for_named_signal` and leave its source,
workflows, Issues, and branches in their observed state. A later direct human
cue can reopen its own current-truth pass and test-system route.

## Cross-repository recovery table

| Observed condition | Preserve | Continue through |
| --- | --- | --- |
| Dirty or overlapping worktree | Current files, branch, and exact revision | Authorized clean worktree or a `friction` handback |
| Missing runtime, browser, service, or credential | Source observations and planned population | Named environment or credential owner |
| Zero discovered cases | Selector, expected IDs, and discovery output | Owner review of path, tags, import, or plan |
| Cache or image identity mismatch | Prior accepted evidence and direct setup route | Treat as miss; prepare directly and validate behavior |
| Partial or cancelled campaign | Completed results with their original identities and cleanup standing | First incomplete case, family, engine, or artifact |
| Focused failure with uncertain blast radius | Failing fixture, source owner, and causal diagnostics | Conservative affected-family route and owner review |
| Full-suite budget pressure | Phase receipt and completed population | Approved budget, measured partition, or schedule owner |
| Cross-repository coordinate drift | Each observed revision and lock state | Program or collection coordinator before joined claims |
| Hosted observation unavailable | Local evidence and unobserved hosted standing | Authorized hosted receiver or later dispatch |

## Handback contract

Return one compact receipt:

```text
Outcome:
Repositories and exact source coordinates:
Issue or pull request owner:
Granted route completed:
Selected test IDs and exact commands:
Expected and executed population:
Preparation standing:
Behavior standing:
Phase timings and denominators:
Artifacts, services, browsers, and side effects:
What this establishes:
Adjacent claim retained by another receiver:
Accepted evidence and recovery state:
Held decisions:
Next receiver and exact re-entry action:
```

Use `pass` when the named route and evidence complete. Use `friction` when a
known environment, authority, or coordination condition has a concrete return
path. Use `blocker` when the requested outcome requires an authority or
capability beyond the current owners and the handback names the event that can
release it.

## Maintenance and completion

Revise this runbook when an exercised route changes selection, authority,
result meaning, or recovery. Keep repository-specific commands and budgets in
their local README, catalog, workflow, or active Issue, and keep this document
focused on the cross-repository sequence.

The route completes when a cold collaborator can enter the named repository,
form one independent behavior proof, compose a proportionate suite, measure
the phase that owns cost, exercise fallback and interruption, expand through a
named event, and return a receiver-ready result while every repository and
human owner retains its acceptance authority.
