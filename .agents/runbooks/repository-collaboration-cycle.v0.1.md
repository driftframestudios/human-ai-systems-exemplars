---
title: Repository collaboration cycle
version: 0.1.1
status: working
audience: ai_collaborators
source_band: public_possible
task_type: operational_collaboration
---

# Repository collaboration cycle

## Desired receiving state

A cold or resumed AI collaborator enters the current repository coordinate,
finds the live owner of the requested outcome, selects one action route,
prepares only the environment needed by that route, completes the authorized
work, and returns one receiver-ready result with proportionate evidence.

Completion is one live branch, pull request, decision-ready finding, or
legibly held route whose receiver can identify:

- the one-sentence scope;
- the concrete changed surfaces or decision;
- the exact validation command and normalized result;
- what that observation establishes and the adjacent claim still open;
- any environment change that could affect behavior;
- the current Issue or pull request; and
- the next receiver plus one exact re-entry action.

The runbook supplies a general full-cycle spine. Domain skills and specialized
runbooks retain material behavior, and each active Issue retains its outcome
and acceptance boundary.

## Shareable cold-session docket

When one result spans `human-ai-systems-exemplars`, `gist-registry`, the
LIMS/ELN constellation, or their Notion and publication boundaries, begin with
the [Cross-repository cold-session docket](cross-repository-cold-session-docket.v0.1.md).
It adds the constellation authority map and conditional domain overlays while
this runbook retains the full execution spine.

A human can begin a fresh collaboration by sharing this compact packet and a
link to this runbook:

```text
Goal: the material repository result this cycle should create
Repository: owner/name and expected working branch when known
Current owner: Issue, pull request, or human decision surface
Granted actions: observation, repository edits, push, pull request, merge,
  publication, deployment, or another explicit subset
Held decisions: choices that remain with a named human or external receiver
Evidence expectation: the behavior or artifact the cycle should establish
Support capacity: available | resting | exhausted | unknown
Finish with: scope, changes, exact validation and result, environment note,
  next receiver, and exact re-entry action

Begin by reading AGENTS.md, the nearest README, current Git state, the live
Issue or pull request, and this runbook. Continue until the named result or a
held route with an observable release event is ready for its receiver.
```

The task can omit facts that current source and live repository state can
answer. A choice with material outcome impact becomes a
named held decision with a concrete return question.

## Entry condition and safe observation route

Begin when the current task names a repository and a material outcome, or asks
for a full-cycle assessment of candidate work. First preserve and inspect the
shared worktree:

```sh
git status --short --branch
git rev-parse --show-toplevel
git rev-parse HEAD
git log -5 --oneline --decorate HEAD
rg --files -g 'AGENTS.md' -g 'README.md'
```

Read the root `AGENTS.md`, then the nearest README for the selected source
surface. Read the active Issue or pull request, its milestone and dependent
Issues, the smallest relevant planning surface, the settled threadkeeping
record, and the runnable source that owns current behavior.

A candidate-assessment entry remains `observation_only`. Inspect open Issues,
current milestones, dependency relations, and available acceptance signals;
return a classified candidate set. Implementation begins when the current task
or human owner selects one Issue and its acceptance boundary.

Select the working source coordinate through the task and live owner.
`main`, an integration branch, a pull-request head, and an accepted release
can serve different roles. Preserve the checkout when the selected source or
instructions live at a newer coordinate. The
[cold-session bootstrap](cross-repository-cold-session-docket.v0.1.md#bootstrap-absent-or-stale-local-instructions)
supplies guarded upstream inspection, a read-only remote observation, and
exact-commit source reading for either a single- or cross-repository entry.
Detached HEAD and an unset upstream remain usable source-observation states.
Fetch only when updating local remote refs is authorized and useful; a cached
ref retains its cached standing until a network observation establishes the
selected remote coordinate.

Use `gh issue view <number>` and `gh pr view <number>` when live GitHub state
changes classification, authority, review, or delivery. A local-only pass
labels remote refs as cached and leaves current remote standing for a
network-authorized receiver.

Existing worktree changes remain intact at their observed coordinate. A clean
issue-specific worktree or a `friction` handback supplies the continuation
when ownership of overlapping changes is unclear. Observation can still
produce a current-truth map while repository and external state remain as
found.

## Authority map

| Surface | Authority in this cycle |
| --- | --- |
| Runnable source and generated artifacts | Current behavior at the inspected revision |
| Root `AGENTS.md` and nearest README | Standing collaboration and source-area orientation |
| `planning/` | Prospective terrain, options, and acceptance direction |
| `threadkeeping/` | Settled rationale, prior decisions, evidence limits, and re-entry memory |
| GitHub Issue | Outcome, scope, dependencies, acceptance, and current owner |
| Pull request | Exact proposed diff, review conversation, checks, and receiving decision |
| Current task grant | Repository mutation and external-action authority |
| Named human or protected receiver | Merge, publication, deployment, credentials, destructive actions, and consequential selections when explicitly retained there |

This runbook orders work and carries orientation. Authority remains with the
current task grant, active Issue, and named protected receivers. A review-ready
pull request is a complete handback when the current grant ends at review.
Merge, publication, cPanel activation, and other protected actions begin
through the named grant that owns them.

## Ordered phases

### Select the phase path

The action mode selects phases rather than imposing one serial setup path:

| Current route | Phase path and completion |
| --- | --- |
| Source-only observation | Phases 1 and 2, then source evidence in Phase 7 and handback in Phase 9; the authority map and bounded finding or held decision complete the task |
| Observation requiring execution | Phases 1 and 2, Phase 3 only for the selected check's authorized environment needs, optional bounded support in Phase 5, then Phases 7 and 9 |
| Authorized implementation or repair | Phases 1 and 2, conditional Phase 3, task-owned branch context in Phase 4, optional Phase 5, then Phases 6 and 7; Phase 8 stops at the granted delivery boundary before Phase 9 |

Source-only observation preserves repository and external state, including
the checkout's branch or detached coordinate. It skips dependency probes and
installation, branch creation, implementation, and commit/push/PR delivery.
One task response can be its complete receiving surface. A changed question
or wider grant reopens only the phases that the new decision needs.

### Phase 1 — Reconstruct current truth

**Action mode:** `observation_only` until the current task and active owner
establish a wider grant.

1. Confirm branch, revision, worktree state, upstream relation, and recent
   history.
2. Read the root and nearest instructions.
3. Reconcile the active Issue or pull request with relevant planning and
   threadkeeping.
4. Inspect the runnable or readable source that owns current behavior.
5. Name every difference between historical status and current source.
6. State settled, current, open, and next terrain in one compact map.

Keep the preserved checkout and inspected working source coordinates visible.
When releases or integrated copies participate, add the accepted/tagged
release and its pending receipts, snapshot version/source commit/capture date,
and reviewed package/adoption binding as distinct observations. Merged source
establishes integration; each release, binding, or runtime claim retains its
own evidence and receiver.

Phase 1 produces the
[`repository-reentry`](../skills/repository-reentry/SKILL.md) result. The
compact steps above are this repository's invocation profile; the portable
skill supplies the full reconciliation method when several records or branches
participate.

**Checkpoint:** The map establishes the inspected source coordinate, live work
surface, current behavior owner, open decision, and first bounded move. A
cached remote ref establishes local knowledge of that ref; a network
observation establishes the selected remote coordinate at observation time.

**Recovery and stop:** Preserve a dirty or overlapping worktree. A separately
authorized clean worktree can receive implementation. When the active Issue,
acceptance signal, or mutation grant remains ambiguous, return the current map
and the one choice that releases the next phase.

### Phase 2 — Classify candidates and select one primary route

**Action mode:** `observation_only` for classification; the selected task
grant supplies the later implementation or repair mode.

| Route | Select it when | Receiving result |
| --- | --- | --- |
| `direct_action` | Scope, source owner, acceptance, authority, and fitting checks are clear | The primary collaborator completes the bounded change or finding |
| `primary_with_bounded_support` | Architecture, multi-file coordination, migration, or broad validation needs one synthesis owner and contains a finite secondary job | The primary collaborator continues while one or more bounded packets return patches, wording, focused checks, or evidence |
| `held_for_named_signal` | A human choice, acceptance criterion, environment capability, credential path, external dependency, or current source fact would materially change the result | The last verified state, release signal, responsible receiver, and observable release event remain legible |

Classify each candidate before assigning effort. Prefer the task with the
clearest reader or collaborator value, current authority, acceptance signal,
and smallest adequate evidence lane. Use
[`issue-chain-stewardship`](../skills/issue-chain-stewardship/SKILL.md) when
several Issues form a decision-bearing route.

**Checkpoint:** One route owns the current synthesis. Adjacent candidates have
a named receiver or rest condition.

When an observation-only question is answered, continue directly to Phase 7
to state its source evidence and Phase 9 to return the finding. An ambiguous
mutation grant can correctly end as a held decision; it leaves implementation
with the named receiver rather than creating a substitute change task.

**Recovery and stop:** A changed premise returns classification to current
truth. A wider architectural or product choice returns to its human or Issue
owner with the smallest decision surface that can release work.

### Phase 3 — Prepare the selected evidence lane

**Action mode:** `observation_only` for inspection;
`implementation_authorized` when the current task permits dependency or tool
installation.

Enter this phase when the selected evidence requires a runtime, dependency,
browser, scanner, or other environment capability. Direct source reading can
proceed to Phase 7 with the existing environment; Node/npm probes and
installation are conditional on the chosen check.

For a selected Node-based check, the repository currently requires Node 22 or
newer and carries a root lockfile. Inspect that local lane first:

```sh
node --version
npm --version
test -f package-lock.json
test -d node_modules
npm ls --depth=0
```

The `npm ls --depth=0` result describes local preparation state. An unmet
dependency tree selects the locked installation below; task validation begins
with the check selected by the receiving question.

Prepare locked dependencies in a clean task worktree when the selected checks
need them:

```sh
npm ci --ignore-scripts
```

The checked-in browser preparation installs the focused Chromium runtime:

```sh
npm run playwright:install
```

A named cross-engine question can add the locked Playwright Firefox and WebKit
runtimes after dependency installation:

```sh
npx playwright install firefox webkit
npx playwright --version
```

Record added browser names and versions. Browser downloads change the local
environment and disk use while leaving tracked source unchanged. When the
required browser or system capability lives in an authorized CI, browser, or
bounded-support receiver, route the exact observation there with the same
route, viewport, state, and evidence boundary.

Use the ignored `.visual-runs/` tree for cycle-scoped screenshots and browser
diagnostics. Prepare Betterleaks through `npm run security:secrets:install`
when the selected secret-boundary observation requires the verified helper and
the task authorizes local installation.

**Checkpoint:** The installed or existing environment can run the selected
checks, and the handback can name any behavior-relevant change. Tool presence
establishes readiness for the command; the command result establishes its own
behavior claim.

**Recovery and stop:** A restricted network, unsupported system library, or
browser launch condition leaves the corresponding claim open. Continue the
source work that remains observable, then route the exact pending check or
return `friction` with its release event.

### Phase 4 — Create or restore issue-specific branch context

**Action mode:** `implementation_authorized` when the current task grants the
named repository changes.

Start from the verified task-owned receiving base and use the repository
branch prefix. In an authorized task worktree:

```sh
git switch -c codex/<issue-or-task>-<short-purpose> <verified-base-sha>
```

The active owner selects that base; an integration branch or reviewed task
head can be fitting where default `main` has a different role. Keep the
original checkout intact when a separate worktree receives the task.

When the branch already exists, inspect its remote and local history, pull
request, and relationship to current `main` before continuing. A separately
authorized Git worktree can carry the branch when the shared worktree already
contains another owner's changes.

Keep one active Issue or explicitly named task as the branch owner. Preserve
unrelated work, generated local evidence, and protected external state at
their existing coordinates.

**Checkpoint:** The branch has one accepted base, one owning task, a clean or
ownership-legible worktree, and a recovery coordinate.

**Recovery and stop:** A divergent base returns to re-entry and source-owner
review. Integrate the accepted base through the repository's reviewed branch
practice, then rerun the checks selected by the combined change.

### Phase 5 — Route optional bounded support

**Action mode:** The support packet selects `observation_only`,
`repair_authorized`, `implementation_authorized`, or `recovery_authorized`.
The primary collaborator retains synthesis.

Use [`bounded-support-routing`](../skills/bounded-support-routing/SKILL.md) for
one finite implementation patch, wording pass, targeted test check, evidence
extraction, or recovery contribution. Each packet carries:

```text
Opportunity: useful condition this support can create
Focal surface: exact files, behavior, decision, or question
Requested result: observable return
Route and action mode: Solution | Implementation | Recovery plus grant
Granted actions: exact reads, edits, commands, or handoff actions
Held boundaries: adjacent state and its owner
Expected observation: evidence to return
Recovery and return: known-good point and handback surface
Stop condition: observable event that completes the packet
```

When support capacity is available, send the smallest independent packet and
continue primary work that is independent of its return. When capacity is
resting or exhausted, primary collaboration stays active. Preserve a deferred
packet only when its pinned surface, requested result, and stop condition are
likely to remain decision-useful later. Place it on the active Issue or named
access-controlled task as its single receiving surface. Mark it
`awaiting_capacity` and give activation this refresh gate:

1. verify the current source revision;
2. re-read the Issue acceptance boundary;
3. confirm the result is still needed; and
4. renew the action mode and stop condition.

Spark is one possible bounded receiver. Its current model-specific guidance
stays in the bounded-support skill's
[`openai-codex-spark` reference](../skills/bounded-support-routing/references/openai-codex-spark.md),
where changing platform facts can be refreshed while the full repository
cycle stays singular.

**Checkpoint:** Each support return names its exact premise, revision, result,
evidence, coverage boundary, and stopping event. The primary collaborator
reviews and integrates it against current source.

**Recovery and stop:** A formed packet stop condition suspends its remaining
actions and keeps the evidence handback active. A stale premise or superseded
need retires the packet or returns it to Solution before repository mutation.

### Phase 6 — Implement through the material owner

**Action mode:** `repair_authorized` or `implementation_authorized` within the
active Issue and current task grant.

Read and change the canonical source, generator, contract, or instruction
surface that owns the requested behavior. Direct reasoning remains available
when it is the smallest adequate route. Load a domain skill when its trigger
fits:

| Terrain | Primary owner examples |
| --- | --- |
| Context Canvas page or family | `context-canvas-surface-reading` |
| Cascade, selector, token, or route CSS | `context-canvas-css-ownership` |
| Rendered visitor evidence | `context-canvas-visual-verification` |
| Human-facing repository prose | `supportive-change-writing` |
| Schema family | `schema-contract-authoring` |
| Cross-repository ownership or delivery lineage | `source-authority-mapping` |
| Secret-material handoff | `secret-boundary-inspection` |
| Attribution carriers | `repository-attribution-stewardship` |

Generated artifacts remain builder-owned. Change canonical source or its
generator, rebuild through the named command, and compare the resulting
receipt. A materially adjacent finding returns to its existing owner or earns
a separately bounded Issue when it has a distinct outcome and acceptance
signal.

When production packaging, cPanel activation, or the Core iframe delivery
chain becomes the selected terrain, hand to the
[`Core iframe publication stabilization`](core-iframe-publication-stabilization.v0.1.md)
runbook and its current Issues. The generic cycle supplies orientation; the
specialized runbook supplies that route's source owners and phase gates.

**Checkpoint:** The diff changes the owning source, stays within the granted
scope, and preserves unrelated work. The primary collaborator has reviewed
each integrated support return against current source and confirmed its
premise, revision, and evidence.

**Recovery and stop:** A change that reaches a new source owner, publication
boundary, protected host, or consequential human choice returns with a compact
decision surface. Keep the last verified repository state and the smallest
reviewable diff available.

### Phase 7 — Select and run proportionate evidence

**Action mode:** `observation_only` for checks; repair continues only within
the existing grant and returns to the owning source.

Choose the smallest existing observation that answers the receiving question:

| Change family | Typical current check |
| --- | --- |
| Markdown, instructions, catalog, or attribution | direct source/link reading, `npm run test:attribution`, and `git diff --check` as fitting |
| Context Canvas visitor source | `npm run test:context-canvas` plus one affected-family or focused visual check when appearance changed |
| Broad Context Canvas shared CSS | `npm run visual:context-canvas-reference -- --phase <name>` plus targeted state checks selected by `context-canvas-visual-verification` |
| Production carrier or installer | `npm run test:prod-deployment` |
| Core or Narrative behavior | the nearest command in `tests/README.md` |
| Proposed repository handoff | `npm run security:secrets:staged` after the exact index is prepared |

An evidence statement uses this order:

```text
Command or named source observation at its revision, and normalized result
Establishes: the affirmative state observed at this revision
Coverage boundary: the adjacent claim that receives its own check
```

A passing static contract can establish declared values and owner relations.
Rendered interaction, real-system accessibility mode, hosted response, and
human acceptance each retain their fitting observation or decision holder.

**Checkpoint:** The selected observations answer the acceptance question at the
proposed revision, and every remaining claim has a visible evidence owner.

**Recovery and stop:** A failing check returns to its nearest behavior owner
and last known-good coordinate. Preserve the failure class and affected
surface; public handbacks carry normalized results while raw diagnostics stay
with their controlled local receiver.

### Phase 8 — Deliver one reviewable result

**Action mode:** `implementation_authorized` for commit, push, and pull request
when the current task grants them. Merge follows its explicit grant.

1. Inspect the complete diff and working-tree state.
2. Stage the exact intended index.
3. Run the fitting staged secret-boundary observation.
4. Commit with change-centered prose and agreed attribution.
5. Push the issue-specific branch.
6. Open one review-ready pull request with the smallest meaningful label set
   and one receiving milestone.
7. In the pull-request body, name the material result, Issue relation, change
   boundary, exact validation, what it establishes, coverage boundary,
   recovery path, environment note, and next receiver.
8. When merge is explicitly granted, re-check the live head, checks, and merge
   state; merge through the repository's current reviewed strategy; then
   verify the accepted `main` coordinate.

**Checkpoint:** One receiving surface carries the exact proposed or accepted
change and enough evidence for its next decision. A green check establishes
its named mechanism at the tested coordinate; review and human acceptance
retain their own standing.

**Recovery and stop:** An updated base, changed check, or review finding returns
to the owning phase. A review-only grant ends with the pull request ready and
the human merge action named. Protected publication and deployment remain at
their last accepted coordinates until their receiver grants the next action.

### Phase 9 — Confirm re-entry and release

**Action mode:** `observation_only` unless the task grants a final GitHub or
repository status update.

Report the final branch or inspected source coordinate, worktree state, Issue
or pull-request standing, and one exact continuation. A source-only cycle
names the preserved checkout, the observed source, and the finding's next
receiver; optional runtime or external claims retain their unobserved
standing. A merged cycle can verify
its head commits are ancestors of current `main`; a review-ready cycle names
the review event; a held cycle names the signal that releases it.

**Checkpoint:** Another collaborator can continue directly from the named
coordinate and action.

**Recovery and stop:** A changed Issue contract, source owner, base revision,
platform capability, or validation result reopens the matching phase while
accepted phases remain settled.

## Public-safe handback

Use one Issue, pull request, workflow summary, or task response:

```text
Disposition: pass | friction | blocker
Scope: one-sentence receiving result
Source coordinate: public revision and branch or pull request
Changed surfaces: concise repository-relative paths or decision
Validation: exact command or named source observation at its revision -> normalized result
Establishes: affirmative evidence state
Coverage boundary: adjacent claim still open and its evidence owner
Environment note: retained toolchain, or named local change and behavior risk
Next receiver: Issue, pull request, human decision, or exact re-entry event
Exact re-entry action: one command, review action, or source path
```

Raw output, logs, traces, browser state, credentials, headers, signed or
query-bearing URLs, protected destinations, private network coordinates, and
user-specific filesystem paths stay with their existing access-controlled
receiver. The public return names the bounded condition, evidence class, and
responsible continuation.

## Recovery table

| Observed condition | Desired continuation |
| --- | --- |
| Shared worktree carries unrelated or ownership-unclear changes | Preserve the exact state; use a separately authorized clean worktree or return `friction` with the overlap named |
| Local runbook or instructions are absent or stale | Resolve the task's source owner, read at a verified available commit or authorized remote source, and retain the original checkout coordinate |
| HEAD is detached or the current branch has no upstream | Record the commit and upstream state; continue source observation and prepare branch context only for authorized implementation |
| Remote refresh belongs to a network-authorized receiver | Use local source evidence, label remote refs as cached, and route live standing to that receiver |
| Integration source, release, captured snapshot, or package binding differ | Name each coordinate and pending acceptance separately; return reconciliation to the source or adoption owner |
| Issue scope or acceptance can support materially different implementations | Return a compact decision surface to the Issue or human owner and hold implementation at the last verified coordinate |
| Required dependency, browser, scanner, or system capability needs preparation | Prepare it when authorized, or route the exact check while leaving its claim open |
| Bounded-support capacity is resting | Continue the primary route; retain only a decision-useful packet with `awaiting_capacity` standing and a refresh gate |
| Support return or branch premise has become stale | Refresh revision, acceptance, and continuing need; integrate a current return or retire the packet |
| Base branch advances during implementation | Reconstruct the relationship, integrate the accepted base through current branch practice, and rerun combined checks |
| A focused check fails | Return to the nearest behavior owner, preserve the failure class, and recover from the last known-good coordinate |
| Exact evidence contains protected material | Keep the material with its authorized receiver and publish a sanitized condition plus next owner |
| Merge, publication, deployment, or destructive authority remains human-held | Deliver the review-ready or decision-ready state and name the exact human action that releases continuation |

## Release and re-entry

The runbook releases when the named receiver has one usable result, its
evidence and environment standing, and one exact continuation. It reopens at
the phase whose source owner, Issue contract, branch coordinate, platform
capability, authority, or check result changed.

Status remains `working` until a fresh-context collaborator traverses this
document and returns a current-truth map, one classified route, its environment
needs, and an exact next action. An observation-only cycle can establish this
with source evidence, a decision-ready finding or correctly held route, and
an explicit unchanged-environment note. A complete material cycle can then move the
runbook to `exercised`; repeated materially different cycles can support
`stable`. A shorter Issue or better owner can receive useful rules later while
this route retires with its lineage intact.
