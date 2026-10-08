---
name: repository-handoff-readiness
description: Assesses and prepares an owner-operable repository handoff through source-responsive capability profiles, a live Issue route, explicit account boundaries, and one post-handoff collaboration observation. Applies when a technical collaborator is preparing a repository that another owner and authorized AI collaborator should be able to continue.
---

# Repository handoff readiness

## Contract

- **What:** A source-responsive readiness assessment and preparation route for
  handing a repository to another owner who expects to continue through plain-
  language GitHub Issues with an authorized AI collaborator.
- **When:** A repository is being prepared for transfer, template-based
  creation, or fresh installation; received site source needs a safe landing
  frame; or a handoff should become observable through one continuing
  collaboration cycle.
- **Boundaries:** Current user intent, repository evidence, live Issues, and
  granted tool authority govern every action. Identity, rights, credentials,
  visibility, transfer acceptance, publication, domains, and destructive
  recovery remain with their named human owners. Runnable source owns current
  behavior. Direct reasoning remains the fitting route when one small change
  creates the complete receiving state.
- **Result:** The repository has one owner-readable **current front**—the live
  Issue whose next decision can materially advance the route—the smallest
  fitting collaboration foundation, a source and settings receipt, explicit
  held decisions, and one `next_owner_action` that can release continuation.

## Standing

Status: `working`.

The first complete exercise is the Context Canvas ownership handoff plus one
ordinary post-transfer Issue-to-change cycle. That observation can support
`exercised` standing. A second materially different receiving repository can
support `stable` standing.

## Fit and attention

- **Useful when:** A technical collaborator is preparing a repository for a
  colleague, Issues will be the colleague's primary working interface while
  Git mechanics are delegated, and source, account settings, and ownership
  will cross a real handoff boundary.
- **Poor fit when:** One current Issue already names a bounded change and the
  present owner will continue operating the repository. Use the ordinary
  repository collaboration cycle or direct reasoning.
- **Smallest useful dose:** Current-truth reconstruction, one delivery-form
  decision, one capability-profile delta, one live current Issue, and one
  owner action.
- **Foregrounds:** Receiving continuity, source authority, ordinary-language
  entry, account-level decisions, and a useful post-handoff observation.
- **May under-attend:** Product strategy, domain-specific architecture, legal
  interpretation, and the receiving person's preferred working rhythms. Their
  existing owners retain those decisions.
- **Interactions:** `repository-reentry` establishes current truth;
  `issue-chain-stewardship` makes the work route legible;
  `source-authority-mapping` distinguishes received source from projections;
  `secret-boundary-inspection` supports a proposed handoff;
  `repository-attribution-stewardship` selects attribution carriers;
  `supportive-change-writing` shapes owner-facing instructions; and
  `site-repository-build-and-handoff` carries the ordered route.
- **Rest or release when:** The receiving owner and authorized AI collaborator
  have completed one ordinary Issue-to-change cycle, or one current Issue
  supplies a shorter complete continuation.

## Inputs, defaults, and output

### Minimum inputs

- repository coordinate and current Git state;
- intended receiving owner or owner role;
- delivery form under consideration: transfer, template, or fresh repository;
- live Issue and pull-request state when available;
- site-source standing: awaiting, received, or actively maintained; and
- current grant for repository and external actions.

### Safe defaults

- Treat an unobserved platform state as `unverified` and route the exact check
  to an authorized receiver.
- Treat absent site source as `source_awaiting`; prepare a neutral landing
  frame and let received source establish the stack.
- Treat publication as `held` until its named owner chooses it.
- Preserve current files, owner-edited live Issues, lockfiles, and account
  settings until source evidence and authority establish a change.

### Output

A **receipt** is a concise record of the inspected coordinate, observed state,
fitting check, coverage boundary, and next owner action. The output uses that
meaning throughout.

```yaml
repository_handoff_readiness:
  source_coordinate: <revision and branch or unverified remote>
  delivery_form: transfer | template | fresh_repository | held
  source_standing: source_awaiting | source_received | maintained
  selected_profiles: []
  current_front: <Issue or bounded next task>
  foundation_delta: []
  evidence:
    establishes: <affirmative observed state>
    coverage_boundary: <adjacent claim with its own receiver>
  held_decisions: []
  next_owner_action: <one plain-language action or decision>
  reentry_event: <observable event>
```

## Rules

### Rule: The receiving state leads

Begin with what the receiving owner and AI collaborator should be able to do.
Files, tools, workflows, and account settings earn their place by supporting
that continuing action.

### Rule: Received source chooses the technology route

The source-awaiting foundation stays independent of application packages.
After source arrives, inspect its runtime, package manager, lockfile, routes,
assets, styles, fonts, external requests, storage, authentication, forms,
analytics, hosting metadata, and reproducible commands. Those observations
select later lint, test, browser, dependency, and delivery routes.

Preserve incoming structure, visual direction, legal notices, package manager,
and lockfile while resolving collisions through a source receipt and reviewed
Issue.

### Rule: Capability profiles are additive choices

In this route, a **Concept Nursery** is a resting area for ideas awaiting
another observation; a **Prompt Capsule** is a versioned request-and-handback
example; and a **Visual Fidelity Contract** is a source-grounded record of
visible behavior, art direction, state meaning, ownership, and extension
points.

Select only the profiles supported by the current source and owner decision:

1. **Foundation:** orientation, Issue route, Concept Nursery, reference intake,
   collaboration instructions, and a small validator.
2. **Received site:** source receipt, technology profile, reproducible preview
   or build, and a source-grounded Visual Fidelity Contract.
3. **Stable private release:** fitting tests, trust and privacy review,
   inspectable artifact, release identity, and recovery coordinate.
4. **GitHub Pages:** source-native artifact and a held deployment route the
   owner can activate.
5. **Service-backed extension:** server, data, authentication, secret, or
   cross-repository delivery selected by observed behavior.

Profiles describe independent capabilities. Current source and receiving use
determine their sequence and importance in each repository.

### Rule: Delivery form changes the preparation route

- **Repository transfer** carries the live repository and Issue history. Build
  a useful pre-transfer foundation, let the named human owners authorize or
  complete the transfer, reconcile platform state afterward, and let the
  receiving owner carry the first stable private release.
- **Template creation** produces a new repository from selected template files
  and branches. Materialize the Issue route separately from its semantic seed.
- **Fresh repository or clone** installs the selected foundation modules and
  materializes the Issue route after confirming the destination state.

Live GitHub Issues become current authority after materialization. The seed
stays a bootstrap, comparison, and recovery input.

### Rule: The Issue route prepares ownership

Give the repository one visible current front, typed relations, acceptance
signals, held decisions, and next receivers. Keep implementation detail with
the Issue that owns it. A receiving owner should be able to ask an authorized
AI collaborator to create a detailed Issue, connect it to the route, and
travel the active chain using repository-held context.

### Rule: Transfer happens when the repository is useful and continuable

For the first Context Canvas exercise, source intake and pre-transfer
foundation work occur before transfer. The transfer Issue receives a clean
repository, a live work route, recovery coordinates, and an owner-readable
settings receipt. The receiving colleague and AI collaborator then carry the
first substantial change and private release. Optional publication follows
their decision.

### Rule: Human-held decisions stay visible and actionable

Pair every held boundary with the affirmative route that remains available.
For example: credentials stay with the account owner; repository checks use
declared secret names and return the exact owner action. The skill organizes
granted work and prepares decisions. It supplies no additional authority for
external writes, transfer, publication, account configuration, or destructive
recovery.

### Rule: Maintenance cues follow observable events

Offer the smallest fitting next action when a request lacks an Issue, an Issue
is ready for closure, a pull request has merged, a working branch is ready for
confirmed cleanup, an orientation route drifts, a lockfile changes, rendered
behavior changes, a release candidate forms, publication or transfer
approaches, or resting material becomes timely. State what the proposed check
would establish. The owner can accept, revise, defer, or decline it.

### Rule: Drift reconciliation stays bounded

Deterministic generator-owned artifacts can reconcile through their named
builder. Structurally checkable differences with several valid outcomes
receive a plan and proposed patch. Owner-authored source, prose, lockfiles,
package versions, and live Issues receive review. Identity-, account-, and
secret-bearing state stays with its authorized owner and receives an exact
action request.

### Rule: Evidence matches the claim

A structural validator establishes the files and relationships it checks. A
source-native test establishes the behavior it exercises. A secret scan
establishes its configured scope at the inspected revision. A settings read
establishes platform state at observation time. Receiving usefulness is
established by a real post-handoff collaboration cycle.

### Rule: The skill and runbook keep separate jobs

This skill decides whether the route fits, which capability profiles apply,
and what owner action releases continuation. The runbook orders the known
source-awaiting, source-received, handoff, receiving-collaboration, and optional
publication phases. A new tool, validator, or package forms only after repeated
mechanics demonstrate material savings or protect a consequential boundary.

## Operating sequence

1. **Reconstruct current truth:** Read Git state, current Issues and pull
   requests, root and nearest guidance, runnable source, relevant planning,
   and settled re-entry records.
2. **Name the receiving use:** State what the next owner and authorized AI
   collaborator should be able to do, the intended delivery form, and the
   human-held decisions.
3. **Select the smallest profile set:** Compare the current repository with
   the five additive profiles and record only decision-changing gaps.
4. **Make the Issue route legible:** Identify the current front, typed
   relations, acceptance evidence, next receiver, and release event.
5. **Receive source when available:** Let observed technology and behavior
   choose application dependencies, checks, and build paths.
6. **Prepare the foundation:** Add or reconcile the selected files, templates,
   profiles, checks, and receipts through their source owners.
7. **Prepare the handoff:** Inspect source and account boundaries, attribution,
   privacy, secrets, recovery, platform settings, and the exact next owner
   action.
8. **Carry the authorized delivery form:** Stop at every human-held boundary;
   resume when its named owner supplies the decision or action.
9. **Observe continuing ownership:** Verify the receiving owner can find the
   current front and complete one ordinary Issue-to-change cycle.
10. **Return decision-changing evidence:** Revise the portable skill, runbook,
    or foundation only where receiving use changed a decision. Let other
    observations rest with their current owners.

## Representative scenarios

### Scenario: Site source is awaiting receipt

- Given a repository should become a safe landing frame for a site produced
  with generative AI
- And its framework, package manager, and build shape remain unobserved
- When the technical collaborator prepares the foundation
- Then source-neutral orientation, reference intake, the Issue route, and a
  dependency-free validator can proceed
- And application packages and framework-specific checks wait for source
  evidence
- And the source-intake Issue remains the current front

### Scenario: Direct transfer precedes the first private release

- Given source intake and the pre-transfer foundation are complete
- And the repository carries a live continuing Issue route
- When the human owners accept the transfer receipt and complete or authorize
  repository transfer
- Then the receiving owner and AI collaborator enter at the named current
  Issue
- And they carry the first substantial change and private release
- And their completed cycle or precise blocker returns evidence to the
  reusable handoff artifacts

## Recovery and re-entry

Preserve the last verified repository coordinate, owner-edited Issue state,
and account-held values. A source collision returns to the source-intake Issue.
A changed transfer plan returns to delivery-form selection. An inaccessible
platform setting stays `unverified` and routes to a named account owner. A
failed receiving cycle returns the exact friction, responsible receiver, and
observable release event. The foundation keeps its current size until that
evidence identifies a reusable gap.

The full prospective architecture and first-exercise route live in
[`planning/repositories-with-friends-owner-operable-foundations.md`](../../../planning/repositories-with-friends-owner-operable-foundations.md).

## Completion

The pass completes when the delivery form and source standing are explicit;
the smallest fitting capability profiles are selected; one live Issue is the
current front; source, foundation, platform, and human authority remain
distinguishable; each held boundary has a usable continuation; evidence states
what it establishes; and one `next_owner_action` plus re-entry event can move
the repository toward continuing ownership. The skill rests after the
receiving collaboration accepts the route and reopens when source, ownership,
delivery form, or observed receiving behavior materially changes.
