---
title: Cross-repository cold-session docket
version: 0.1.1
status: exercised
audience: ai_collaborators
source_band: public_possible
task_type: operational_collaboration
---

# Cross-repository cold-session docket

## Desired receiving state

A cold AI collaborator can enter work spanning
`human-ai-systems-exemplars`, `gist-registry`, and the LIMS/ELN constellation,
reconstruct current authority before acting, load only the context the task
needs, complete one granted route, and return a receiver-ready result with
proportionate evidence.

Completion is a current-truth map followed by one authorized change, finding,
or held route whose receiver can identify:

- the material outcome and its source owner;
- the participating source, projection, delivery, and publication surfaces;
- the exact observations and what they establish;
- every consequential decision that remains with a human or external owner;
- the current Issue or pull request; and
- the next receiver plus one exact re-entry action.

This is the cross-repository companion to the
[Repository collaboration cycle](repository-collaboration-cycle.v0.1.md).
That runbook retains the full execution spine. This docket supplies the
constellation authority map, Notion connector routes, and the materializer,
production, Gist Registry, and LIMS/ELN overlays that load when the task needs
them.

## Share this file with one task capsule

Give a cold session this file and the smallest current task capsule:

| Field | Current value |
| --- | --- |
| Goal | The material result this cycle should create |
| Repositories in scope | Named repositories and the expected working branch when known |
| Current owner | Issue, pull request, or human decision surface |
| Granted actions | Observation, repository edits, push, pull request, merge, publication, deployment, or another explicit subset |
| Held decisions | Consequential choices retained by a named human or external receiver |
| Evidence expectation | The behavior, artifact, or decision the cycle should establish |
| Support capacity | `available`, `resting`, `exhausted`, or `unknown` |
| Finish with | Scope, changes or decision, exact validation and result, evidence boundary, environment note, next receiver, and exact re-entry |

The task can omit facts that current source and live repository state can
answer. A choice with material outcome impact becomes a named held decision
with a concrete return question.

## Entry condition and safe observation route

Use this docket when two or more of the named repositories, the Enterprise
Human-AI Practitioner Registry, public-reference materialization, or a
production package participate in one result.

Begin in `observation_only` mode. Preserve existing work and label unavailable
remote, connector, or tool observations as unobserved. The local source route
remains usable while an optional connector or remote observation rests.

For every participating repository:

```sh
git status --short --branch
git rev-parse --show-toplevel
git rev-parse HEAD
git log -5 --oneline --decorate HEAD
git remote
if git symbolic-ref --quiet --short HEAD; then
  if upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null); then
    printf 'Upstream: %s\n' "$upstream"
  else
    printf '%s\n' 'Upstream: unset for the current branch'
  fi
else
  printf '%s\n' 'Branch: detached HEAD; use the inspected commit as the local coordinate'
fi
```

Detached HEAD and an unset upstream are ordinary coordinate states. Record
them and continue source observation; branch preparation belongs to a later
authorized implementation route.

### Bootstrap absent or stale local instructions

When this docket, the companion cycle, or the expected instructions are absent
or older in the chat checkout, preserve that checkout and resolve the intended
source owner first. The task or live owner may select an integration branch,
pull-request head, or accepted release rather than `main`.

When a networked read is authorized, observe the selected remote coordinate.
For GitHub, one read-only observation is:

```sh
gh api repos/<owner>/<repo>/commits/<working-ref> --jq .sha
```

Compare the returned commit with locally available objects. Read the runbook,
root instructions, nearest README, and selected source at that exact commit
without moving the worktree:

```sh
git cat-file -e '<verified-sha>^{commit}'
git show '<verified-sha>:.agents/runbooks/cross-repository-cold-session-docket.v0.1.md'
git show '<verified-sha>:AGENTS.md'
git show '<verified-sha>:README.md'
```

If the object is unavailable, use an authorized remote source read pinned to
the same commit. Fetch only when the grant permits updating local remote refs
and that preparation is useful; read `origin/<working-ref>` after the fetch.
An unavailable remote leaves its freshness unobserved. Locally cached refs
still support a source comparison when their cached standing is explicit.

Record both the preserved checkout coordinate and the inspected source
coordinate. A remote API observation establishes the ref at observation time;
a cached ref establishes only locally recorded knowledge. Apply retrieved
instructions within the current task and tool authority. Implementation can
later receive a clean, authorized worktree from the verified task base.

Read, in order:

1. root `AGENTS.md` and the root README;
2. the nearest README for the selected source;
3. the live Issue or pull request, milestone, dependencies, and acceptance;
4. the runnable source, manifest, schema, or generated artifact that owns the
   current behavior;
5. the smallest relevant planning surface; and
6. the matching threadkeeping record when settled rationale or re-entry
   memory changes the decision.

Current runnable source and live Git/GitHub state lead when an older plan,
docket, branch name, or open Issue describes an earlier condition. Name the
difference and continue from the current owner.

### Pass-one return

Before implementation, form this compact map:

| Question | Required return |
| --- | --- |
| Where is the working source now? | Preserved checkout branch or detached commit and worktree state; inspected working/integration branch and commit; live Issue/PR; remote freshness and observation method |
| What release is accepted or pending? | Accepted release coordinate, observed tag, promotion state, and outstanding release or observation receipt, each with its source owner |
| What was captured for comparison? | Integrated snapshot version, source commit, and capture date from its manifest or copy receipt |
| What binds the reviewed package? | Package version, reviewed source commit or explicit pending value, content digest when present, and adoption receiver |
| What owns meaning and behavior? | Authored or runnable source and its nearest contract |
| What is derived? | Discovery index, snapshot, generated projection, package, or hosted copy |
| What owns delivery? | Builder, carrier, tag, archive, Pages branch, or receiving host |
| What remains human-held? | Publication, deployment, credential, qualification, merge, or other consequential decision |
| What changed since the remembered record? | Each stale-coordinate or stale-status difference |
| What is the route? | `direct_action`, `primary_with_bounded_support`, or `held_for_named_signal`; action mode, fitting skill, and smallest evidence lane |

This pass establishes the inspected coordinates and authority relationships.
Keep merged source, tag existence, accepted release, reviewed package binding,
receiver adoption, and runtime evidence distinct. Each establishes its named
state; a pending or omitted field leaves the adjacent acceptance claim open
for its owner. Include only participating coordinates, with inapplicable or
unobserved states named rather than reconstructed speculatively.

It leaves unobserved remotes, private workspace ancestry, live deployment,
vendor qualification, and other adjacent claims open for their named
receivers.

## Constellation authority map

| Surface | Source authority | Projection or delivery role | Protected decision |
| --- | --- | --- | --- |
| `human-ai-systems-exemplars` | Visitor source, Context Canvas integration, repository-selected public references, and cPanel package contract | Ignored public-reference and production builds; tracked post-acceptance carrier | Merge, publication, production acceptance, credentials, and cPanel cutover retain their named grants |
| `gist-registry` | Versioned synthetic, domain-neutral exemplar source and artifact-local contracts | Builder-owned `docs` Pages projection, discovery registry, optional public Gists | Source acceptance, tag formation, Pages promotion, and Gist publication remain distinct grants |
| LIMS/ELN standalone repositories | Each governance, specification, simulated-state, implementation, or evidence repository owns its history and releases | The Functional Nucleus is an exact-coordinate provenance encounter | Scientific meaning, Quality/Regulatory applicability, security/privacy acceptance, operations, and business acceptance stay with their accountable owners |
| Enterprise Human-AI Practitioner Registry | Owning pages, databases, rows, and evidence retain their stated authority | Dashboards, orientation rooms, and public-possible projections support discovery | Ancestry, audience fitness, publication approval, and signed-out availability receive separate human-confirmed receipts |

An integrated copy supports comparison and learning. A durable source change
returns to the standalone repository that owns the affected role.

## Notion orientation overlay

### Begin with the repository carriers

The local [`field-guide/`](../../field-guide/README.md) tree provides stable,
repository-readable entry points. Several entries are deliberate hydration or
compatibility stubs; they orient connector search while the owning Notion page
retains its fuller treatment.

The table pairs each repository role with the closest title-level Registry
search. A sparse stub supports the local role; the connector result must still
establish the fuller page relationship before a collaborator relies on it.

| Repository pointer | Connector search target | Use when |
| --- | --- | --- |
| [`field-guide/src/index.md`](../../field-guide/src/index.md) | **Enterprise Human-AI Practitioner Registry** and **Human-AI Collaboration Field Guide** | The collaboration needs a Registry entrance or shared practice language |
| [`semantic-attractors/`](../../field-guide/src/semantic-attractors/README.md) | **Semantic Attractor Design — Negation-Aware Instructions** | Instructions, evidence language, or a hard boundary needs desired-state and replacement-state phrasing |
| [`core-architectures-entry/`](../../field-guide/src/core-architectures-entry/README.md) | **Core Architectures Orientation Index** | A consequential problem needs a fitting architecture move |
| [`narrative-architecture-entry/`](../../field-guide/src/narrative-architecture-entry/README.md) | **Narrative Architecture Orientation Index** | Long-running work needs identity, continuity, focalization, or handoff |
| [`practitioner-probes-entry/`](../../field-guide/src/practitioner-probes-entry/README.md) | **Practitioner Probes** | A technical concern needs a decision-changing question and observation |
| [`research-atlases-entry/`](../../field-guide/src/research-atlases-entry/README.md) | **Research Atlas Observatory** | Generated research, evidence standing, or an atlas needs comparison |
| [`visual-data-communication/`](../../field-guide/src/visual-data-communication/README.md) | **Visual & Data Communication Stabilizers — Cognitive Moves for Visual Forms** | A visual form needs alignment with data shape, cognitive move, and uncertainty |
| [`recovery-and-failure-geometries/`](../../field-guide/src/recovery-and-failure-geometries/README.md) | **Recovery Routing** and **Failure Geometries** | Strain, interruption, or a failed route needs a workable return |
| [`collaboration-postures/`](../../field-guide/src/collaboration-postures/README.md) | **Threadkeeping & Collaboration Memory** and stable-identity guidance | A collaboration needs continuity across sessions or receivers |

The local Semantic Attractor carrier uses
`@driftframe/field-guide#semantic-attractor-design`; the Registry page uses
`@driftframe/field-guide/semantic-attractor-design`. Preserve the role of each
identifier rather than treating the two projections as one coordinate.

The same carrier supplies connector-ready semantic pointers for a more focused
orientation pass:

| Semantic pointer | Reader job |
| --- | --- |
| **Machine Index & Context Tree** — `@driftframe/field-guide` | Resolve Field Guide verification, version state, and the fitting child route |
| **Core Principles** — `@driftframe/field-guide#core-principles` | Establish the baseline collaboration posture |
| **Welcome Mat Patterns** — `@driftframe/field-guide#welcome-mat-patterns` | Shape first contact and a usable entry into unfamiliar terrain |
| **Research-to-Terrain Mapping** — `@driftframe/field-guide#research-to-terrain-map` | Translate research into a bounded practice or artifact decision |
| **Glossary terrain** — `@driftframe/field-guide#anthropomorphic-postural-language` | Resolve specialist language and its instruction-engineering implications |
| **Failure Geometries** | Interpret repeated strain and select a recovery route |

The source-extraction summaries also name `NSC-018` (`recovery-routing`),
`NSC-021` (`stable-identity-and-contract-bearing-node-v0.1`), and `NSC-022`
(`threadkeeping-collaboration-memory-reader-facing-v0.1`). The repository
records these as source evidence rows. A connector search can test whether
they resolve to fuller workspace context; that relationship remains an
observed connector result rather than a repository-declared page identity.

### Smallest useful connector route

When the Notion connector is authorized and deeper context changes the task,
search by exact title or semantic identity. Resolve the local carrier's fitting
semantic pointer first. Use **Registry Orientation & Information Radiator** —
`@driftframe/registry/orientation-information-radiator` — when the task needs
help selecting a Registry family, then load only the target that changes the
current decision:

| Task need | Connector target |
| --- | --- |
| Registry-wide navigation or source-family standing | **Enterprise Human-AI Practitioner Registry** — `@driftframe/registry/enterprise-human-ai-practitioner` |
| Collaboration posture, pacing, or recovery | **Human-AI Collaboration Field Guide** — `@driftframe/field-guide/landing` |
| Instruction polarity or a load-bearing boundary | **Semantic Attractor Design — Negation-Aware Instructions** — `@driftframe/field-guide/semantic-attractor-design` |
| Audience, disclosure, or publication placement | **Publication Boundaries and Proportionate Review** — `@driftframe/field-guide/publication-boundaries-proportionate-review` |
| Visitor-account or public narrative meaning | **Context Canvas Site Readings** — `@driftframe/site-readings` |
| LIMS/ELN participant account | **The Sample Nobody Could Find — Naming Shared Objects Before Choosing the LIMS/ELN (2021–2022)** — `@driftframe/site-readings/the-sample-nobody-could-find` |
| Early signal or reusable method | **Field Watch** — `@driftframe/field-watch` — or the **Skills Constellation Switchboard** |

Load a gated coordination page only when the session has authorized access
and the page changes the current decision:

- **Successor Snapshot ↔ Build-Time Public Reference Materialization —
  Persistent Collaboration Surface**;
- **Debrief Source Basis ↔ Registry Link Ledger — Materializer Planning
  Surface** — `@driftframe/context-canvas/debrief-source-basis-registry-ledger`;
- **Private Projection Handle Resolver — Context Canvas Site Readings**;
- **FMI & Genomic Re-Platforming Visitor Depth — Cross-Platform Collaboration
  Docket** — `@driftframe/context-canvas/fmi-genomic-visitor-depth-docket`;
- **17 · FMI LIMS/ELN Collaboration Index & Corpus Ownership** —
  `@driftframe/solution-architecture-lab/fmi-lims-eln`; and
- **LIMS/ELN Enterprise Implementation — Coordinator, Evidence Contract, and
  Reader Routes**.

The connector return records the page title, semantic key, source role,
observed standing or date, and decision-changing contribution. GitHub-facing
work uses that semantic identity, a repository-local source, an accepted
public receiver, or a complete local explanation. Exact Notion URLs,
workspace or page IDs, private ancestry, temporary signed asset routes, and
resolver mappings stay with the authorized resolver.

Keep four observations distinct:

- Registry ancestry;
- public-possible content standing;
- human publication approval; and
- signed-out availability.

Connector availability enriches orientation. Current repository source,
executable checks, and live Git/GitHub state retain their named behavior and
work-state authority.

## Skill route

Read a selected `SKILL.md` completely before acting. A skill supplies a method
inside the current grant.

| Need | Begin with |
| --- | --- |
| Reconstruct current state | [`repository-reentry`](../skills/repository-reentry/SKILL.md) |
| Carry the full authorized cycle | [`repository-collaboration-cycle`](../skills/repository-collaboration-cycle/SKILL.md) and the companion runbook |
| Trace source, snapshot, projection, and delivery | [`source-authority-mapping`](../skills/source-authority-mapping/SKILL.md) |
| Carry semantic identity across a public boundary | [`locator-boundary-stewardship`](../skills/locator-boundary-stewardship/SKILL.md) |
| Shape human-facing guidance | [`supportive-change-writing`](../skills/supportive-change-writing/SKILL.md) |
| Inspect credential-shaped or private locator material | [`secret-boundary-inspection`](../skills/secret-boundary-inspection/SKILL.md) |
| Coordinate dependent Issues | [`issue-chain-stewardship`](../skills/issue-chain-stewardship/SKILL.md) |
| Form one finite support request | [`bounded-support-routing`](../skills/bounded-support-routing/SKILL.md) |
| Run LIMS/ELN Python checks | [`uv-backed-python-execution`](../skills/uv-backed-python-execution/SKILL.md) |
| Read or verify Context Canvas | [`context-canvas-surface-reading`](../skills/context-canvas-surface-reading/SKILL.md) and [`context-canvas-visual-verification`](../skills/context-canvas-visual-verification/SKILL.md) |

When `gist-registry` participates, also read its `.agents/skills/README.md`,
the selected skill's complete contract, and
`.agents/skills/publication-selection.json`. Its public skill catalog is an
exchange projection; the repository-local contract retains operational
authority.

## Conditional operational overlays

### Evidence-to-adoption expansion

When research, comparative evidence, or external adoption would materially
change the selected task, use the tiered route owned by
[Issue #276](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/276)
and the
[`evidence-grounded-research-spike`](../skills/evidence-grounded-research-spike/SKILL.md)
contract. Select the smallest sufficient tier: source observation, bounded
research spike, comparative packet, adoption dossier, or cross-repository
program. The active owner supplies that tier's bounded return and stopping
event. A source-only finding can finish at the first tier; a new tier begins
when its concrete receiving decision, evidence need, and grant are named.
This docket links the existing route rather than duplicating its ladder.

### Public-reference materialization

Use this overlay when authored Context Canvas source carries
`PUBLIC_URL_REGISTRY_*` identities.

- Tracked source carries semantic identities and useful local explanation.
- Human-confirmed, ignored `.env.public` configuration supplies approved
  ordinary HTTPS destinations.
- [`tools/materialize-public-references.mjs`](../../tools/materialize-public-references.mjs)
  owns the transformation.
- Ignored `.public-reference-build/` is inspectable generated input for later
  work. Authored source and human publication approval retain their separate
  roles.
- Production assembly calls the same transformation logic in memory; it does
  not consume `.public-reference-build/` as its production input.

Use the source-owned checks:

```sh
npm run build:public-references
npm run test:public-reference-materializer
npm run security:secrets:public-references
```

These checks establish configured substitution, carrier agreement,
recoverable generation, and the named artifact's secret-material boundary.
Registry ancestry, audience fitness, signed-out access, and publication
approval receive their own observations.

### `human-ai-systems-exemplars` production packaging

Use [`deployment/cpanel/README.md`](../../deployment/cpanel/README.md) and the
[iframe and production stabilization runbook](core-iframe-publication-stabilization.v0.1.md)
as the current contracts.

The established source path is `main → stg → release → prod`:

- `main` carries collaboration truth;
- `release` binds reviewed source, evidence, and builder contract;
- `prod` identifies the accepted production projection;
- an accepted source commit `S` receives a carrier-only commit `R` with
  `R^1 = S`; and
- the annotated tag, deterministic archive and receipt, private staging, and
  human cutover remain separate receiving steps.

The primary visitor root and iframe root remain disjoint closures. External
Gist Registry source stays with its own repository; the production payload
carries only files selected by `human-ai-systems-exemplars`.

Use the current README to select the exact command sequence. The standing
checks begin with:

```sh
npm run test:prod-deployment
npm run check:prod-projection
npm run build:prod-projection
```

Carrier staging begins after exact `prod` source acceptance. The human-held
deployment grant selects the receiving cPanel roots and establishes live
behavior.

### Gist Registry source and publication

In `gist-registry`, read `AGENTS.md`, `README.md`, `BRANCHING.md`,
`SCHEMA-NURSERY.md`, the relevant `snippet.json`, and the source/publication
runbooks.

- `main` owns accepted authored source.
- `docs` is a builder-owned GitHub Pages projection.
- immutable tags identify accepted releases.
- `registry.json` supports discovery.
- `snippets/<semantic-id>/<version>/snippet.json` owns the artifact-local
  contract; exact-version runnable source and tests own behavior.
- optional Gists, Pages delivery, tags, and source acceptance retain separate
  grants.

`human-ai-systems-exemplars` can receive an exact-version public link, digest,
or compact visitor excerpt. Gist Registry retains its runnable source,
fixtures, tests, registry projection, and release authority.

### LIMS/ELN constellation

Begin with
[`lims-eln-functional-nucleus/README.md`](../../lims-eln-functional-nucleus/README.md),
then read `constellation-manifest.json`, `copy-receipt.json`, the participating
component README, and the active owner Issue or pull request.

The Functional Nucleus records an exact-coordinate integrated encounter. The
standalone repositories retain source and release authority for:

- governance;
- program specification;
- simulated final state;
- enterprise implementation; and
- comparative evidence.

Read version differences as lineage facts. Observe the standalone working or
integration source and its release state separately before proposing
reconciliation. Record the integrated capture's version, source commit, and
date alongside any reviewed package binding and its pending fields. A merged
implementation can coexist with an open broader Issue or pending release
binding; each owner retains its remaining acceptance. Return durable changes
to the repository that owns the affected role. Local synthetic tests establish their
declared fixture and runtime scope. Vendor tenant or sandbox behavior,
migration and restore rehearsal, production security and observability, and
Quality/Regulatory applicability receive independent receipts.

## Complete the selected route

After the authority map is legible, continue through the
[Repository collaboration cycle](repository-collaboration-cycle.v0.1.md). It
owns route selection, conditional environment preparation, source-owned
execution, evidence, recovery, stop conditions, and the standard handback.

An `observation_only` task completes with the authority map, a bounded finding
or correctly held decision, its source observations and coverage, and one
exact next receiver. Follow the companion's observation route through current
truth, route selection, proportionate evidence, and re-entry. Direct source
reading can complete it with the existing toolchain and preserved checkout;
dependency installation, branch creation, implementation, commit, push, pull
request, publication, and deployment phases stay outside that route. Prepare
an environment only when the selected observation needs it and the current
grant permits it.

Add three cross-repository facts to that handback:

1. each participating source, projection, delivery, and publication owner;
2. every version, status, or remembered-coordinate difference found during
   re-entry; and
3. the exact standalone repository, human receiver, or external owner that
   receives the next move.

An unavailable connector leaves extended workspace context unobserved while
the repository-local route continues. A missing grant returns a held route
with the exact decision and observable release event. Consequential merge,
publication, deployment, credential, destructive-history, vendor
qualification, and regulated-acceptance actions begin through their named
authority surfaces.

## Exercise and maturity

This runbook is `exercised` through a resumed-session, source-only traversal
of `human-ai-systems-exemplars` and the LIMS/ELN Program source relationship.
The exercise produced an authority map and receiver-ready finding while
preserving repository and external state. It exposed an older detached chat
checkout without the docket, an unavailable upstream relation, and distinct
integration, captured-snapshot, and pending package/release coordinates.
Those observations supply the bootstrap, guarded upstream, coordinate, and
observation-completion refinements above.

This standing covers that observation route. Independent blank-context use,
private connector ancestry, Gist publication, runtime proofs, and production
delivery remain separate exercises. Repeated materially different use can
support `stable`; a shorter current owner can receive useful rules if this
route later becomes redundant. Record only decision-changing friction.
