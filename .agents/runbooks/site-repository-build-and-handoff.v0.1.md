---
title: Site repository build and handoff
version: 0.1.0
status: working
audience: ai_collaborators
source_band: public_possible
task_type: operational_collaboration
---

# Site repository build and handoff

## Desired receiving state

A technical collaborator prepares an **owner-operable** repository: one that
another owner can receive and continue through plain-language GitHub Issues
with an authorized AI collaborator. The receiving repository preserves its actual site source,
visual direction, collaboration history, recovery coordinates, and human-held
decisions. One ordinary post-handoff Issue-to-change cycle demonstrates that
the route remains usable outside the preparing session.

Completion gives the receiver:

- a reproducible repository coordinate;
- a visible current Issue and its relation to the wider route;
- a source receipt and observed technology profile when source exists;
- the smallest fitting skills, runbooks, Prompt Capsules, reference routes,
  Concept Nursery, and checks;
- a repository-settings and recovery receipt appropriate to the delivery form;
- one `next_owner_action`; and
- the exact event that reopens optional private-release or publication work.

The runbook orders a known route. The
[`repository-handoff-readiness`](../skills/repository-handoff-readiness/SKILL.md)
skill decides whether the route fits, selects the capability profiles, and
identifies the current owner action. GitHub Issues retain outcomes and
acceptance. Runnable source retains behavior authority.

In this runbook, **current front** means the live Issue whose next decision can
materially advance the route. A **receipt** is a concise record of the
inspected coordinate, observed state, fitting check, coverage boundary, and
next owner action. A **capability profile** is an optional set of repository
abilities selected for the current source and receiving use.
A **Concept Nursery** is a resting area for ideas that need another
observation before they become an Issue or source change. A **Prompt Capsule**
is a versioned request-and-handback example. A **Visual Fidelity Contract** is
a source-grounded record of visible behavior, art direction, state meaning,
ownership, and intended extension points.

## Owner-facing entry prompt

This plain-language request should be sufficient once the foundation is in
place:

```text
Create a detailed Issue for the outcome, connect it to the current milestone
and related Issues, then travel the active Issue route. Explain what each move
makes possible and return any decision that needs my account authority or
judgment.
```

The AI collaborator still reads the repository's current instructions, source,
and live Issue state before acting. The prompt supplies intent. The current
task grant supplies external-action authority.

## Entry condition and safe non-entry route

Enter when the current task names:

- a repository being prepared for another owner;
- a current or intended Issue route;
- the receiving use, even if the receiver's identity remains private;
- the delivery form under consideration; and
- the actions currently granted.

Begin with current truth:

```sh
git status --short --branch
git rev-parse --show-toplevel
git rev-parse HEAD
git log -5 --oneline --decorate HEAD
rg --files -g 'AGENTS.md' -g 'README.md'
```

Read the root `AGENTS.md`, nearest README, current Issues and pull requests,
relevant planning, settled threadkeeping, and runnable source. Use live GitHub
reads when remote Issue, pull-request, branch, or settings state changes the
decision and the task permits network observation.

When the repository, intended receiver, delivery form, or action grant remains
unclear, keep the repository unchanged and return the observed state plus one
question or owner action that releases the route. A dirty or ownership-unclear
worktree remains intact; a separately authorized worktree can receive later
implementation.

## Authority map

| Surface | Authority in this route |
| --- | --- |
| Received source and generated artifact | Current site behavior at the inspected revision |
| Root and nearest README plus `AGENTS.md` | Standing repository and source-area orientation |
| Skills and runbooks | Portable method and ordered procedure |
| Foundation manifest and profiles | Included modules, observed technology, activation conditions, and source identity |
| GitHub Issue | Outcome, acceptance, relations, held decisions, and next receiver |
| Pull request | Exact proposed diff, checks, review, and merge decision |
| Current task grant | Repository edits and external actions available in this cycle |
| Preparing owner | Current repository account, source acceptance, and transfer offer |
| Receiving owner | Transfer acceptance, future identity, visibility, release, publication, domains, and destructive recovery |
| Receiving AI collaborator | Authorized implementation and evidence within the receiving owner's live Issue route |

The runbook organizes work already granted. Transfer, publication, credentials,
account settings, identity, rights, and destructive recovery begin through
their named human owners.

## Capability profiles

The readiness skill selects one or more additive profiles:

| Profile | Receiving condition |
| --- | --- |
| Foundation | A cold collaborator can orient, find the current Issue, place references and resting concepts, and run a small structural check |
| Received site | The actual source has a bounded receipt, technology profile, reproducible preview or build, and source-grounded visual contract |
| Stable private release | Fitting tests, trust and privacy review, inspectable artifact, release identity, and recovery coordinate support private use |
| GitHub Pages | A source-native artifact and held deployment path are ready for an owner publication decision |
| Service-backed extension | Observed server, data, authentication, secret, or cross-repository behavior has a fitting architecture and trust route |

Profile selection responds to source and receiving use. The route can transfer
at Foundation plus Received-site standing while the receiving owner carries
the Stable-private-release profile.

## Delivery-form selection

| Delivery form | Preserve | Additional work |
| --- | --- | --- |
| Repository transfer | Live files, history, Issues, pull requests, and repository identity as carried by the platform | Pre-transfer settings receipt, human transfer action, and post-transfer settings and permission reconciliation |
| Template creation | Selected repository files and template branches | New live Issue materialization, destination settings, identity, and source receipt |
| Fresh repository or clone | Explicitly installed foundation modules and received source | New live Issue materialization, origin and history decision, destination settings, and recovery coordinate |

The active Issue or human owner selects the delivery form. A transfer is the
first Context Canvas route because its live Issues are part of the handoff.

## Ordered phases

### Phase 1 — Reconstruct current truth and bind the route

**Action mode:** `observation_only` until the current task establishes a wider
grant.

1. Record branch, revision, worktree, upstream, and recent history.
2. Read current instructions and the source-owning README.
3. Read the current Issue, its milestone, related Issues, and accepted pull
   requests.
4. Inspect runnable source and existing collaboration foundation.
5. Name any difference among earlier records, live GitHub state, and source.
6. Invoke `repository-handoff-readiness` and record the delivery form, source
   standing, selected profiles, current front, held decisions, and
   `next_owner_action`.

**Checkpoint:** The resulting map establishes the source coordinate, live work
owner, current delivery form, first bounded move, and each unverified external
state.

**Recovery and stop:** A material ambiguity returns one compact choice to the
Issue or human owner. Source observation can continue while mutation waits.

### Phase 2 — Prepare the source-awaiting foundation

**Action mode:** `implementation_authorized` within the current Issue and task
grant.

Use the versioned foundation manifest to select the smallest fitting set:

- root orientation, collaboration ground, ignore and editor files;
- `planning/concept-nursery/`, `threadkeeping/`, public references, and an
  ignored local-reference lane;
- source receipt, technology profile, Visual Fidelity Contract, and foundation
  receipt templates;
- skills, runbooks, and Prompt Capsules selected by the receiving use;
- Issue and pull-request templates;
- held Actions and Pages templates where they preserve a useful future route;
  and
- a dependency-free structural validator.

Record each selected module, destination path, activation condition, and
collision behavior. Keep the source-awaiting profile independent of
application packages.

**Checkpoint:** The foundation validator establishes the declared files,
links, and structural relationships it inspects. It leaves application
behavior open for the received source and its fitting checks.

**Recovery and stop:** Preserve an existing destination file and report the
collision. An owner-authored file receives a reviewed merge plan; a
generator-owned file uses its named reconciliation route.

### Phase 3 — Receive and characterize the actual site

**Action mode:** `observation_only` for intake;
`implementation_authorized` for accepted reconciliation.

Stage or inspect the received material while keeping the known-good repository
coordinate intact. Record:

- origin, observation date or revision, and relationship to maintained source;
- editable source and generated output;
- routes, assets, styles, fonts, and manifests;
- runtime, package manager, lockfile, scripts, and clean preview or build;
- environment variables, external requests, forms, storage, authentication,
  analytics, and hosting metadata;
- collisions with foundation files;
- GitHub Pages compatibility or the behavior that needs another host; and
- representative narrow and desktop visitor states.

Let these observations select TypeScript, lint, test, browser, schema,
dependency, and deployment work. Preserve the site's existing structure and
art direction, then write the first Visual Fidelity Contract from the actual
surface.

**Checkpoint:** The source receipt establishes the inspected origin and file
relationship. A successful build establishes artifact generation under the
named command; a preview-start check establishes that the named server starts.
Focused tests and browser observations establish only the behaviors they
exercise. Representative screenshots establish the captured route, state,
engine, and viewport.

**Recovery and stop:** A missing lockfile, unresolved secret, inaccessible
service, or unsupported local runtime stays visible and routes to its source
or account owner. Continue the parts of intake that remain observable.

### Phase 4 — Materialize and reconcile the live Issue route

**Action mode:** `observation_only` for plan and comparison;
`implementation_authorized` for live Issue writes when explicitly granted.

1. Compare the semantic Issue seed with the destination repository.
2. Produce a dry-run plan naming labels, milestone, Issues, relations,
   acceptance, authority, and next receivers.
3. Apply the plan through stable semantic keys.
4. Resolve live Issue numbers and cross-links in a second pass.
5. Verify the resulting graph and write a receipt from semantic keys to live
   coordinates and seed digest.
6. Preserve owner-edited live Issues on later runs; report drift for reviewed
   reconciliation.

For repository transfer, the already-live Issue graph remains authority and
the seed becomes a comparison and recovery input. For template or fresh-
repository routes, the destination graph becomes authority after verified
materialization.

**Checkpoint:** A receiving collaborator can identify the current front,
related work, acceptance, held decisions, and next receiver from
repository-held context.

**Recovery and stop:** An ambiguous match or owner-edited conflict remains in
plan output. Resolve it through the live Issue owner before applying further
changes.

### Phase 5 — Complete the pre-handoff foundation

**Action mode:** `implementation_authorized` within the active Issue route.

Travel the pre-handoff Issues in their evidenced order. Typical receiving
conditions include:

- orientation and README routes agree with current source;
- reference intake and the Concept Nursery have plain ownership;
- the Visual Fidelity Contract describes the received site;
- skills, Prompt Capsules, and runbooks match real collaboration needs;
- the AI access route and protected account boundaries are explicit;
- checks exercise materially meaningful source behavior; and
- the transfer Issue has a current repository-settings inventory and recovery
  plan.

Use one pull request and public-safe return per coherent outcome. Close an
Issue when its acceptance is met. Give a separate outcome its own Issue and
relationship so the current contract keeps its accepted scope.

**Checkpoint:** The repository is useful and continuable: current source is
reproducible, the Issue graph has a visible front, and held decisions have
named owners and usable next actions.

**Recovery and stop:** A framework or product decision returns to the owning
Issue. A platform setting that requires account authority becomes one item in
the handoff receipt.

### Phase 6 — Prepare and carry the handoff

**Action mode:** `observation_only` for reconciliation;
`implementation_authorized` for repository receipts;
`human_action_required` for the transfer itself unless explicitly delegated.

Prepare one owner-readable receipt covering:

- source revision, branch, worktree, tags, releases, and recovery coordinate;
- current Issue, milestone, labels, relations, assignments, and next receiver;
- merged working branches eligible for confirmed cleanup;
- README, `AGENTS.md`, README routes, skills, runbooks, and Prompt Capsules;
- Actions, Pages, environments, rulesets, branch protections, collaborators,
  secrets, variables, webhooks, deploy keys, and plan-dependent features;
- secret-boundary observation at the proposed handoff scope;
- attribution, privacy, license-decision, and publication standing; and
- the exact receiving-owner action.

The human owners review the receipt and complete or explicitly authorize the
repository transfer. The receipt preserves recovery coordinates. After
acceptance, a return transfer is a new receiving-owner-authorized operation;
plan-, Pages-, assignment-, package-, and redirect-related effects receive
their own post-transfer reconciliation against GitHub's current conditions.

**Checkpoint:** The transfer acceptance and destination ownership are visible
in GitHub state. The receipt establishes what was inspected before transfer;
post-transfer reads establish receiving-side settings and permissions.

**Recovery and stop:** A failed, declined, or pending transfer leaves the
repository at its last verified owner and coordinate. Record the platform
condition and the human action or elapsed platform event that releases retry.

### Phase 7 — Reconcile the receiving repository

**Action mode:** `observation_only` for post-transfer inspection;
`implementation_authorized` through the receiving owner's new grant.

1. Confirm repository ownership, default branch, current revision, and access.
2. Verify Issues, milestones, labels, assignments, pull requests, releases,
   and current front.
3. Reconcile Actions, environments, Pages, protections, rulesets,
   collaborators, variables, secrets, webhooks, deploy keys, and any
   plan-dependent feature whose behavior may change across transfer.
4. Re-establish integrations and credentials through their named owners.
5. Give the receiving owner the current Issue and ordinary-language entry
   prompt.

**Checkpoint:** The receiving owner and authorized AI collaborator can find
the current front, read the repository ground, and begin from repository-held
context.

**Recovery and stop:** A missing permission, setting, credential, or external
integration routes to its account owner with the exact observed state and
requested action. Repository source work that remains independent can
continue through the live Issues.

### Phase 8 — Exercise one receiving collaboration cycle

**Action mode:** Granted by the receiving owner and active Issue.

The receiving colleague and AI collaborator complete one ordinary route:

1. create or select a detailed Issue;
2. connect it to the current milestone and related Issues;
3. reconstruct current truth;
4. create or restore an Issue-specific branch;
5. implement through the source owner;
6. run fitting checks;
7. open, review, and merge or otherwise settle a pull request within the
   receiving owner's grant; and
8. prepare closure and the next re-entry action.

For the Context Canvas first exercise, this phase includes the substantial
Issues and first stable private release. It follows transfer. The receiving
owner thereby shapes the release and supplies authentic evidence about the
handoff foundation.

**Checkpoint:** One complete cycle or precise named blocker shows whether a
cold receiving collaborator can use the Issue route, source map, checks, and
account boundaries.

**Recovery and stop:** Return only friction that changed a decision or blocked
the outcome. Cosmetic preferences and one-off session details can remain with
the receiving task unless they expose a reusable source or routing problem.

### Phase 9 — Prepare optional publication

**Action mode:** `observation_only` for readiness;
`human_action_required` for visibility, domain, and publication choices unless
the receiving owner explicitly grants them.

When the receiving owner chooses publication, reconcile:

- artifact source and build command;
- workflow permissions, pinned actions, and environment rules;
- branch protections or the chosen artifact-deployment route;
- canonical URLs, custom domain, DNS, HTTPS, 404, and signed-out behavior;
- privacy, analytics, external requests, secrets, and attribution; and
- release tag, artifact identity, rollback, and recovery.

GitHub Pages is one optional profile. A service-backed site follows the
behavior and trust owners established by its received source.

**Checkpoint:** Source-native and hosted observations establish their distinct
states. Publication acceptance remains with the receiving owner.

**Recovery and stop:** Keep the last accepted private release available. A
host, domain, certificate, or platform-setting condition returns to its named
owner with the exact next observation.

### Phase 10 — Return the reusable observation

**Action mode:** `observation_only` unless the current task grants a source or
Issue update.

Compare the exercise with the portable skill, runbook, and foundation. Route
each material observation to one disposition:

- revise an existing contract;
- add or revise a foundation module;
- continue observing;
- settle the rule as written;
- fold it into a better existing owner; or
- retire a route whose receiving job dissolved.

File presence, self-authored scenarios, and internal consistency establish
structural coherence. Receiving behavior supplies the evidence for exercised
or stable standing.

**Checkpoint:** One public-safe return names the artifact versions, receiving
revision, decision-changing friction, change or grounded no-change result,
coverage boundary, and next receiver.

**Recovery and stop:** A future possibility awaiting a current receiving use
rests in planning or its own future Issue. The active foundation keeps its
accepted scope.

## First task-bound exercise

The authorized resolver binds the first exercise to
`urn:source-key:repository-handoff-exercise-001`. This public-safe runbook
carries the semantic phases and exit condition while the authorized planning
and Issue surfaces retain exact repository coordinates:

```text
Source intake: receiving source-intake Issue
Pre-transfer foundation: connected foundation Issues
Ownership transfer: human-held transfer Issue
Receiving collaboration: stable private-release Issues
Optional continuation: publication and launch Issues
Exercise receiver: portable-artifact exercise Issue
Exit: one post-transfer Issue-to-change cycle completes or returns a precise
  blocker with a named receiver and release event
```

The task-bound projection exits active routing when its exercise receiver
accepts the return. The portable skill and runbook remain available for later
receivers.

## Event-shaped maintenance cues

| Event | Offer | What it establishes | Owner response |
| --- | --- | --- | --- |
| A request arrives before a receiving Issue exists or changes the current chain | Draft one outcome-bearing Issue and relation map | The current front, acceptance, and next receiver | Accept, revise, defer, or decline |
| Acceptance evidence satisfies an Issue | Prepare closure and inspect distinct follow-on outcomes | Whether the owned outcome is complete at the observed revision | Accept closure or retain the named gap |
| A pull request merges | Inspect branch ancestry and offer exact cleanup targets | Which remote working branches are fully merged and recoverable | Authorize cleanup or keep them |
| Repository structure, commands, or routes change | Compare README and `AGENTS.md` routes | Which orientation surface became stale | Accept the smallest reconciliation |
| Manifest or lockfile changes | Select focused install, lint, build, advisory, license, or consumer checks | The declared dependency state and exercised behavior | Choose the fitting checks and updates |
| Rendered behavior changes | Select affected route, viewport, interaction, and accessibility observations | The captured visitor behavior and its coverage boundary | Accept, revise, or request another state |
| A release candidate forms | Assemble secret, attribution, privacy, artifact, tag, and recovery checks | The inspected release boundary and remaining held decisions | Authorize the release action or keep it private |
| Publication or transfer approaches | Reconcile account-level platform state | The observed settings and exact owner actions | Complete, authorize, defer, or decline |
| Resting material becomes timely | Route it to an Issue, reference ledger, continued rest, or retirement | Its current receiving use | Select the smallest fitting destination |
| Stale Issues, milestones, artifacts, dependencies, or branches obscure the route | Prepare a bounded inventory and proposed dispositions | Which items remain active, recoverable, or ready to settle | Confirm only the exact state-changing actions |

## Evidence return

Use one Issue, pull request, workflow summary, or task response:

```text
Disposition: pass | friction | blocker
Scope: one-sentence receiving result
Source coordinate: revision and branch or pull request
Delivery form and profiles: selected route
Changed surfaces: concise repository-relative paths or decision
Validation: exact command or named observation -> normalized result
Establishes: affirmative evidence state
Coverage boundary: adjacent claim and its receiver
Held decisions: human-owned choices still active
Next owner action: one plain-language action
Re-entry event: observable continuation
```

Credentials, raw logs, browser state, signed or query-bearing URLs, private
routes, and user-specific paths stay with their access-controlled owners. The
public return carries the bounded condition and continuation.

## Recovery table

| Observed condition | Desired continuation |
| --- | --- |
| Shared worktree carries unrelated or ownership-unclear changes | Preserve it; use a separately authorized worktree or return the overlap and release event |
| Site source remains unavailable | Complete only the source-awaiting profile and keep source intake current |
| Incoming source conflicts with foundation files | Preserve both inputs, write a collision plan, and let the source-intake Issue choose the relationship |
| Destination technology differs from an assumed stack | Replace the assumption with the observed technology profile and select source-native checks |
| Issue seed differs from owner-edited live Issues | Keep live Issues current, show the semantic-key comparison, and review the specific drift |
| Required GitHub state is inaccessible | Mark it `unverified` and route the exact read or action to an authorized account owner |
| Secret-shaped material appears | Keep details with the private finding owner, repair the source boundary, and return a sanitized condition |
| Transfer remains pending or fails | Retain the preparing owner and last verified coordinate; name the platform condition and retry event |
| An accepted transfer needs a return or another owner | Treat it as a new receiving-owner-authorized transfer; inspect current prerequisites and reconcile plan-, Pages-, assignment-, package-, and redirect-related effects |
| Post-transfer settings differ | Reconcile each setting through its receiving account owner and keep source work on independent Issues moving |
| Receiving collaboration stalls | Return the exact Issue, missing context or authority, named receiver, and release event |
| Optional publication remains held | Keep the stable private release and held deployment route available |

## Release and re-entry

The runbook releases when the receiving owner and authorized AI collaborator
can enter one current Issue and complete an ordinary change cycle, or when a
precise blocker has a named receiver and observable release event. It reopens
at the phase whose source, Issue contract, delivery form, owner, platform
state, authority, or behavior observation changed.

Status remains `working` through the pre-transfer preparation. The first
resolved exercise plus one post-transfer Issue-to-change cycle can move it to
`exercised`. A materially different receiving repository can support `stable`.
The authorized resolver entry for
`urn:source-key:repository-handoff-exercise-001` retains the exact first
exercise coordinates, future delivery forms, and activation conditions.
