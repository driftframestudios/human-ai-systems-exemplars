---
title: Selective source promotion
version: 0.1.0
status: working
audience: ai_collaborators
source_band: public_possible
task_type: operational_collaboration
---

# Selective source promotion

## Desired receiving state

A receiving branch contains the accepted source from a named integration
branch, delivered through focused, independently reviewed pull requests. Each
intermediate candidate can run its owned checks, and the final receiving tree
matches the agreed target. An explicitly excluded behavior remains at its
accepted replacement state throughout the sequence.

The route completes when every source difference has a disposition, each
receiving change has fitting evidence and review, generated artifacts agree
with their owners, and a complete tree comparison establishes the intended
result. Source promotion and publication retain separate grants and receipts.

Use this runbook when the target behavior is settled and several accepted
changes share files, generators or delivery dependencies. The
[repository collaboration cycle](repository-collaboration-cycle.v0.1.md) owns
ordinary re-entry, preparation and delivery. A single coherent pull request
can use that shorter route directly. An unresolved design choice returns to
its Issue or a research spike before selective promotion begins.

## Entry and task capsule

The current task and owning Issue identify the accepted source, receiving
branch, included work, exclusions and authority. Record this compact capsule
in the Issue or first receiving pull request:

| Field | Required observation |
| --- | --- |
| Outcome | The behavior and source state the receiver will gain |
| Source target | Repository, branch and exact accepted commit |
| Receiving baseline | Branch and exact observed commit |
| Comparison base | Merge base or other explicitly accepted comparison coordinate |
| Excluded behavior | Its exact scope, accepted replacement and confirming observation |
| Included difference | Complete path inventory, with shared files divided by owned change |
| Tranches | Ordered visitor or system outcomes and their dependency relations |
| Granted actions | Source edits, local checks, PR creation, merge and reconciliation as granted |
| Held decisions | Publication, upload, deployment or other decisions retained by their named owner |
| Finish with | Accepted coordinates, review/check receipts, complete tree comparison and next receiver |

First preserve and inspect the checkout:

```sh
git status --short --branch
git rev-parse HEAD
git log -5 --oneline --decorate HEAD
```

Read `AGENTS.md`, the nearest source README, the active Issue and the original
PRs that explain the target changes. Refresh remote coordinates through an
authorized network observation. Cached refs remain labeled as cached until
that observation succeeds. If branch ownership or overlapping work remains
unclear, preserve the checkout and return a bounded `friction` handback or use
an authorized clean worktree. Source observation can continue while mutation
awaits that resolution.

## Ownership and authority

| Owner | Responsibility |
| --- | --- |
| Current task and active Issue | Included outcomes, exclusions, acceptance and granted actions |
| Primary collaborator | Complete source accounting, dependency order and integration of support returns |
| Canonical source and materializer | Behavior and generated output at the named coordinate |
| Original PR | Historical rationale and its original evidence boundary |
| Receiving PR | Exact composed diff, current checks, independent review and merge decision |
| Test catalog and command owner | Membership, prerequisites, side effects and assertion meaning |
| Named publication receiver | Package upload, release, live observation and activation when granted |

Historical review supplies useful lineage. Each receiving PR earns review of
its newly composed source and dependencies. An agent independent of the
implementation can supply the requested review when the task permits that
form; describe it accurately alongside any provider-native approval rules.

Use [source-authority mapping](../skills/source-authority-mapping/SKILL.md)
for canonical/generated relationships and
[issue-chain stewardship](../skills/issue-chain-stewardship/SKILL.md) for the
handoffs between tranches. A finite support request names its source revision,
owned files, action mode, expected return and stopping event through
[bounded support routing](../skills/bounded-support-routing/SKILL.md).

## Ordered phases

### Phase 1 — Freeze the intended source and receiving baseline

**Owner and mode:** The primary collaborator begins with `observation_only`.
An authorized restoration or target amendment follows its own source owner.

Record the exact source and receiving commits and their ancestry relationship.
Inspect the current two-tree difference as well as historical PRs. A commit
that appears only on one branch can already have equivalent source on the
other; the net tree establishes what the receiver still needs.

When the human excludes one behavior, establish its accepted replacement
before defining the promotion target. A focused source-branch repair can make
that intended tree directly available. Otherwise the Issue must name an
explicit target amendment, its owner and verification. Keep the original
coordinate recoverable when an amendment changes the target.

**Checkpoint:** The capsule identifies the intended source, the receiver and
the accepted state of every exclusion. A source digest establishes identity;
the fitting behavioral check establishes the excluded behavior's replacement.

**Recovery and stop:** A moving source branch keeps its new changes outside
the frozen population until the owner records their disposition. A materially
different replacement behavior returns to the human or Issue decision owner.

### Phase 2 — Assign every difference and close its dependencies

**Owner and mode:** The primary collaborator maps source in `observation_only`
mode; independent support may inspect a bounded family.

Enumerate the complete source-to-receiver path difference, including additions,
deletions, renames, file modes and tracked generated artifacts. Assign each
path to its first receiving tranche. For shared files, also assign each
semantic change to its owning tranche. Examples include package aliases,
catalog members, README sections and distinct rules in a common stylesheet.

Use one small disposition table on the active Issue or receiving PR:

| Change | Target coordinate | Tranche or equivalent receiver | Dependencies and generator | Observation | Accepted receipt |
| --- | --- | --- | --- | --- | --- |
| Repository-relative path and owned change | Exact source commit | Named tranche, already-equivalent state, or explicit target amendment | Imports, consumer, materializer or declared route | Fitting existing command or source comparison | PR and accepted coordinate when available |

Check both dependency directions. A changed producer can require regenerated
consumers; a copied consumer can require an import, alias, asset, route binding
or test helper that has yet to arrive. Each dependency joins the same tranche
or an accepted predecessor. Use a coherent historical source coordinate when
the final source already includes a later dependent feature.

Group by a visitor or system outcome. Keep original PR references in each
receiving PR even when the source grouping splits or joins their historical
commits. A complete file copy fits only when all of that file's changes and
dependencies belong to the current candidate.

**Checkpoint:** Every original difference has an owner, every shared change has
a receiving tranche, and the order provides each consumer's prerequisites.
Already-equivalent source has a comparison receipt rather than an extra replay.

**Recovery and stop:** An unassigned difference or uncertain dependency returns
to its source owner. Resolve the edge, merge the dependent groups, or record a
human-approved target amendment before claiming completeness.

### Phase 3 — Compose one runnable receiving candidate

**Owner and mode:** The current task grants `implementation_authorized` work
on a focused branch from the freshly observed receiving commit.

Apply the tranche's owned source changes to that receiving state. Preserve
accepted receiver work and each recorded exclusion. Add shared catalog entries,
aliases, manifests and documentation only with the files and contracts they
describe. The intermediate branch should admit its own declared commands and
routes with complete prerequisites. Reconcile ownership summaries and counts
with the admitted membership as well as its individual path declarations.

Regenerate through canonical owners in dependency order. For an embedded
instrument, that order can be common adapter, inline receivers, generated
chapter document, route bindings and package expectations. Keep generated
outputs alongside their source changes. A new check that finds a missing
dependency refines the tranche; it supplies no authority to weaken the check.

Inspect the complete proposed diff against the actual receiving base. Include
file deletion, executable modes and renamed paths in that inspection. Confirm
that each difference belongs to the current disposition and that shared-file
edits preserve previously accepted entries.

**Checkpoint:** The candidate contains its source and generated dependency
closure, and its command, route and catalog declarations refer to material
present at that coordinate. Broader behavior receives the next phase's checks.

**Recovery and stop:** A conflict returns to the canonical owner and both
accepted source states. Resolve the intended combined behavior, regenerate and
reopen the affected observations. Preserve the last accepted receiving commit
as the recovery coordinate.

### Phase 4 — Establish fitting receiving evidence

**Owner and mode:** Existing tests and generators own their assertions;
`observation_only` execution follows the task's local or hosted grant.

Use [test-suite composition](../skills/test-suite-composition/SKILL.md) to
select the smallest existing source, generated-parity and unit checks first.
Once the candidate is coherent, run the browser or integration observations
that establish the changed behavior at this receiving coordinate.

For Context Canvas work, use
[visual verification](../skills/context-canvas-visual-verification/SKILL.md)
and [evidence-bearing test design](../skills/evidence-bearing-test-design/SKILL.md).
Inventory the affected family, bracket changed responsive seams and observe
the consequential interaction states. Select additional engines when the
mechanism or acceptance boundary calls for them. A controlled historical fault
or targeted perturbation can establish that the oracle distinguishes the
regression being repaired.

Record actual case, file, engine and artifact populations that matter to the
decision. A filtered command must execute its intended cases. A skip, empty
selection or interrupted run keeps its own standing. Preserve accepted prior
evidence when its source and dependencies still match; rerun the owned checks
when a later tranche changes their shared seam. The
[test-system stewardship runbook](cross-repository-test-system-stewardship.v0.1.md)
supplies preparation, reuse and expansion guidance.

**Checkpoint:** The exact candidate has a normalized result, a named observed
population and a clear coverage boundary. Native-browser, hosted and live
observations retain their actual environment and source coordinates.

**Recovery and stop:** A failure returns to its behavior or environment owner.
Repair within the task grant, then repeat the reopened observations. A required
capability that remains unavailable produces a concrete pending receiver and
keeps the affected acceptance condition open.

### Phase 5 — Review, integrate and verify the receiving commit

**Owner and mode:** An independent reviewer uses `observation_only`; PR
creation and merge follow their explicit task grant and current branch rules.

After fitting checks, inspect and stage the exact intended index, run the
repository's fitting secret-boundary observation, then commit and freeze the
candidate. This order binds the precommit observation to the actual proposed
snapshot; an index already equal to HEAD can cause that scanner route to rest.

The independent reviewer examines the committed receiving diff, dependency
closure, exclusions, generated ownership, test expectations and evidence
boundaries. A material finding returns to the owning phase. Inspect and scan
the changed index again, commit the repair, and bind the renewed review to
that exact head before acceptance.

Create the PR with the active Issue, historical PR lineage, meaningful labels
and receiving milestone. Its body carries the changed behavior, checks,
independent review, recovery and next receiver.

Immediately before an authorized merge, confirm the live head, receiving base,
required checks and review standing. A changed base receives dependency and
combined-diff review; reopen checks affected by that change. After integration,
verify that the accepted receiving tree equals the reviewed candidate or
review the provider-created integration difference before advancing.

**Checkpoint:** One accepted receiving coordinate and PR receipt establish the
tranche's source, review and fitting behavior evidence. Update its disposition
rows and identify the next released tranche.

**Recovery and stop:** Source acceptance can end at a review-ready PR when
merge remains human-held. A consequential provider or base difference returns
to composition and verification. Recovery of an already accepted tranche uses
a focused revert or forward repair through its current receiving branch.

### Phase 6 — Reconcile the complete intended tree

**Owner and mode:** The primary collaborator performs `observation_only`
comparison; reconciliation changes follow the task's source-integration grant.

After the final tranche, compare the complete receiving tree with the frozen
target and every accepted target amendment. Account for all paths, including
shared catalog ordering, source documentation, modes and generated outputs.
Every remaining difference needs a concrete owner and accepted disposition.

When this collaboration adds accepted material such as a runbook, record it as
a target amendment and reconcile it into the integration source through the
authorized reviewed route. Retain the original freeze and the amended target
coordinates. Once both branches express the intended state, a direct two-tree
comparison should report equality:

```sh
git diff --exit-code "$promotion_target_sha" "$promotion_receiver_sha"
```

Use task-specific variables bound to the recorded full commits. Tree equality
establishes exact source content and modes. Git ancestry establishes integration
history and receives its own check. A source-only ancestry reconciliation
preserves the equal tree; compare its proposed result before integrating it.

Run the final combined observation required by the active Issue after shared
owners converge. Rebuild a shared aggregate package once from that accepted
coordinate when its receiver calls for it; record the input identity, declared
route/file population and manifest result. A changed input reopens its owning
generation and fitting evidence.

**Checkpoint:** All included work reaches the receiver, exclusions retain
their accepted state, every amendment is reconciled, and the final tree and
combined evidence match the intended result.

**Recovery and stop:** A remaining unexplained diff keeps completeness open.
Trace it to the disposition table and repair its owner. An ancestry conflict
receives normal source review while the verified equal tree remains the
reference; branch-history changes retain their existing authority boundary.

### Phase 7 — Hand back source and preserve publication standing

**Owner and mode:** The active Issue owns acceptance. The current task grants
its state updates; the named publication receiver retains external activation.

Return one compact receipt on the active Issue or final PR:

```text
Outcome and disposition: pass | friction | blocker
Original target, accepted amendments and final intended target:
Receiving baseline and final accepted commit:
Excluded behavior and retained replacement:
Receiving PRs and historical lineage:
Independent reviews and normalized check results:
Complete tree comparison and ancestry standing:
Generated package identity and population when requested:
Coverage boundary and any separately held observation:
Publication standing:
Next receiver and exact re-entry action:
```

Public records contain repository-relative source names, public commit/PR
coordinates and the smallest decision-changing result. Raw logs, traces,
browser state, credentials, headers, protected URLs and machine-specific paths
stay with their existing local or access-controlled owner.

**Checkpoint:** A collaborator can resume from the accepted source and fitting
receipt. A package build establishes the local artifact; upload, live response
and publication each retain their own grant and observation.

**Recovery and stop:** Finish at the current source handoff when publication
remains held. The named human's release decision can open the
[iframe and production publication route](core-iframe-publication-stabilization.v0.1.md)
with the accepted source and package coordinates.

## Exercise and maintenance

[Issue #630](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/630)
owns the first receiving exercise: restored card spacing, four Context Canvas
promotion groups, their complete source-disposition map and final comparison.
Its historical PR references retain the accepted implementation lineage.
Initial composition exposed two useful accounting details: shared catalog
entries arrive with their owned source, and browser-ownership summaries must
be reconciled with the actual admitted population. Phase 3 incorporates both.
Independent review also established the Phase 5 order: inspect and scan the
proposed index before committing, then review the exact resulting head.

Keep this runbook `working` while its first receiving sequence is in progress.
Move it to `exercised` when an actual traversal establishes the entry, tranche
handoffs, review and final reconciliation, or exposes a documented refinement
that is then exercised. Record decision-changing friction in the existing
Issue and revise the affected rule. Repeated distinct uses may support
`stable`; one successful sequence establishes only its stated context.

The runbook rests after the source handoff. A changed exclusion, generator,
dependency, receiving branch or publication grant reopens its matching phase.
A shorter current owner can replace this route when it provides the same
entry, evidence, recovery and handback with less coordination work.
