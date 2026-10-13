# Repository branch topology

`main` is the broadest collaboration trunk. It remains coherent for AI
collaborators that can inspect only the default branch, while other branches
adapt research, integration, staging, release, and delivery to particular jobs.

## Long-lived branches

| Branch | Primary job | Service relation |
| --- | --- | --- |
| `main` | Canonical collaboration trunk and authored current source | Radiant Null collaboration family |
| `snapshot` | Exact selected `main` revision for stable-core comparison and recovery re-entry | Comparison input for a named preflight; feature work returns through a living branch |
| `research` | Future-state projection and AI research-integration environment | Preview artifacts or a later purpose-bound research route |
| `dev` | Sustained feature integration | Radiant Null collaboration family |
| `stg` | Deployment candidates and Cloudflare Worker pilots | Vik Guru delivery family |
| `release` | Accepted release integration and promotion source for production | Vik Guru delivery family |
| `docs` | Reviewed GitHub Pages projection rebuilt from an exact accepted `main` source | Radiant Null collaboration family |
| `prod` | Accepted schema and exact production carrier authorized for delivery | Vik Guru delivery family |

The service families are:

- `schemas.radiantnull.com` for the collaboration-facing `main`, `dev`, and
  generated `docs` projections;
- the Vik Guru delivery family for `stg`, `release`, and `prod`, with
  `schemas.vik.guru` as the schema receiver, `vik.guru` as the primary visitor
  receiver, and `iframes.vik.guru` as the embedded-artifact receiver.

A GitHub Pages custom domain is repository-level. These groups describe source,
promotion, and delivery intent rather than separate Pages sites for every
branch. `research` begins with preview artifacts and receives a stable route
only through a named service decision.

## Snapshot baseline

`snapshot` is a deliberately quiet copy of a selected `main` revision. Before
using it, compare the exact `main` and `snapshot` commit IDs and record the
result in the receiving Issue or pull request. A recovery, population, or
preflight branch consumes the selected baseline by branching from `snapshot`
or merging that exact snapshot revision into its living branch. Accepted
feature work returns through the living pull-request branch; `snapshot` remains
a comparison input.

After a stable-core wave settles on `main`, fast-forward `snapshot` to that
accepted revision. When its history has diverged, recreate the ref only after a
recorded human cue names the previous revision, replacement revision,
observation date, and receiving use. This preserves a legible recovery point
while source authority, publication standing, and delivery configuration stay
with their named branches and settings.

## Research flow

`research` is permission-rich by purpose. AI collaborators may generate,
review, revise, and merge bounded feature-level pull requests into it when the
scope, evidence question, publication boundary, and recovery path are explicit.

Use `res/<feature-slug>` for an isolated feature branch formed from current
`research` and received through a pull request back into `research`. Git's ref
hierarchy treats `research` as the complete long-lived ref, while the `res`
environment label gives short-lived work a feasible and legible prefix. A
feature-level change answers one bounded question or supplies one locally
reversible capability. Ordinary trunk collaboration may still target `main`
directly when the current collaboration is already the complete receiving form.

Use `epic/<semantic-name>` for a target future spanning several features or
materially changing repository architecture, schema posture, workflow, service,
or promotion. Feature pull requests may accumulate within an epic. A named
human review and explicit cue precede every merge from an epic branch into
`research` or any other branch.

`res` is the environment label used in receipts, workflow names, and future
deployment metadata. `research` remains the single canonical branch name.

## Promotion and publication flow

Research supplies candidate implementations and evidence. Authored source and
promotion branches select the durable result through two distinct routes.

The production route is:

1. `main` receives accepted contracts and concise research receipts so
   main-only collaborators can understand and continue the work.
2. `dev` optionally integrates a chosen sustained feature direction.
3. `stg` receives a selected deployment candidate or Worker pilot, directly
   from `main` when a sustained `dev` lane adds no useful integration step.
4. `release` binds the accepted source, evidence, and integration result.
5. A separately reviewed move advances accepted release material to `prod`.

### Protected destination promotion adapter

A downstream ruleset can require the pull-request head to contain the current
destination coordinate. Preserve the long-lived upstream branch by adapting
one accepted coordinate on a short-lived branch:

1. record the exact accepted upstream coordinate `U` and current destination
   coordinate `D`;
2. create a temporary promotion branch at exact `D`;
3. merge exact `U` into that branch, producing candidate `C` with parents
   `[D, U]`;
4. verify the expected tree and path relationships before pushing;
5. review `C → destination` after the destination checks pass;
6. merge with a merge commit, producing promotion result `P` with parents
   `[D, C]`; and
7. verify `P`, record the durable receipt, then retire the temporary branch.

For `stg → release`, `C` carries the accepted staging tree. For
`release → prod`, `C` carries accepted release source outside
`deployment/cpanel/carrier/**` while its complete carrier subtree—including
path set, modes, and bytes—equals the preceding production destination. The
accepted promotion result is production source `S = P`; `R` remains reserved
for the later carrier-only merge result. That carrier branch starts from exact
`S` and replaces the retained historical carrier.

This adapter keeps downstream history on the destination side while canonical
upstream history remains focused on its role. PR #468 remains accepted history
without rewrite. A conflict, unexpected path delta, moving destination, or
changed upstream acceptance forms a new source or candidate review boundary.

The reviewed result must retain the topology receipt: `P^1 = D` and `P^2 = C`.
Squash, rebase, and fast-forward results do not satisfy this promotion
contract, even when their file trees match. For `release → prod`, verify the
same outside-carrier and complete-carrier-subtree relationships on both `C`
and `S` before carrier formation begins.

Issue [#469](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/469)
owns the exercised procedure, focused local checker, and material failure-path
tests. [PR #470](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/470)
is the first worked `release → prod` receipt; the publication stabilization
runbook records its exact coordinates and subtree evidence.

The schema Pages route is:

1. An exact accepted `main` revision supplies the source.
2. A generated `docs` projection receives its own review.
3. The Pages workflow receives both revisions, rebuilds from the accepted
   source, and requires complete byte equality before a deliberately selected
   deployment.

Publication, DNS, schema identity, credentials, and production authority remain
with their named branch, setting, or human-reviewed operation. Generated
`docs` and deployed `prod` material stay downstream of authored source.

Selected promotion pull requests are the standing bridge from research. A bulk
merge of accumulated research becomes fitting only when a human-reviewed epic
receipt selects that complete target future.

### cPanel production carrier

The cPanel visitor deployment follows `main → stg → release → prod`; `dev`
remains available when sustained integration earns it. The reviewed source
promotion into `prod` establishes source commit `S`. A following pull request,
started from exact `S`, changes only the generated
`deployment/cpanel/carrier/**` closure. Its merged release commit `R` must keep
`S` as first parent (`R^1 = S`) and pass the carrier verifier before cPanel
receives it.

Carrier bytes remain downstream, generated `prod` release material. They do
not promote backward into source branches and the assembler excludes them from
production inputs. The selected host receiver deploys `R`, while the carried
manifest identifies `S`. `prod` names accepted production material rather than
an attached checkout or transfer event. The immutable tag and carrier digests
identify the payload; a transfer receipt identifies one delivery attempt; live
observation identifies visitor standing. A human-approved deployment packet
authorizes the first pilot; manual workflow dispatch can authorize a later
artifact transfer without introducing another moving deployment branch. If
`prod` moves before the carrier merge, regenerate from
the new source coordinate. The complete sequence and host boundary live in
[`deployment/cpanel/README.md`](deployment/cpanel/README.md).

## Synchronization and re-entry

Sync current `main` into `research` at the start of an epic, before a
consequential comparison, and before a promotion receipt. Additive, reviewable
history is the standing form. History replacement retains its separate recovery
and authorization boundary.

A durable result returns to `main` as concise documentation, source, schema,
or an Issue or pull-request receipt. A research commit can remain as
reproducibility evidence while the accepted branch becomes the current source.
An unselected but useful experiment can rest in `research` with a compact
receipt until a future question rehydrates it.

## Actions receivers and evidence budgets

Actions begin as bounded, observable evidence work. A workflow proposal names:

- the research question and expected evidence;
- trigger and path scope;
- expected minutes and matrix width;
- permissions, secrets boundary, cache, artifact, and retention behavior;
- concurrency and cancellation behavior;
- the event that returns the workflow to rest; and
- the human-reviewed condition for wider triggers or promotion.

Manual dispatch and narrowly scoped pull-request triggers are the leanest
starting points. Superseded equivalent runs can be cancelled, artifacts can use
the shortest useful retention window, and scheduled or expanded matrix work can
follow an observed-value receipt.

Package verification and implementation or integration checks are welcome in
`research` when they answer the named question and its budget is active.
Production credentials and publication secrets remain with dedicated
environments. Workflow installation, budget expansion, branch rules,
environment bindings, and deployments receive their own reviewable changes.

### Current evidence window

`main` remains a budget-active evidence receiver. Its public-boundary workflow
reads tracked text on non-draft pull requests targeting the trunk. A companion
schema-route receipt reads matching schema changes through the existing schema
surface contract and Pages projection. Both use read-only contents permission,
superseded-run cancellation, and advisory findings while merge authority stays
with current reviewers. Their ceilings are two and six minutes respectively;
the boundary reader retains its aggregate receipt for one day. `release` and
`prod` are the two additional budget-active receivers for the bounded schema
delivery contract described below.

The complete source-owned Actions family also travels with the trunk: the
Pages workflow can publish a reviewed `docs` projection, Core and Narrative
units remain manually selectable with their pull-request receiver resting behind
`PROTOTYPE_UNIT_TESTS_AUTOMATIC`, and two LIMS/ELN proof paths retain explicit
dispatch and confirmation. Every external action is pinned to a full reviewed
commit SHA. These routes have distinct activation controls and leave the main
public-boundary intake and schema-route receipt as the bounded automatic
readers.

`release` and `prod` each carry an approved 300-minute Actions allocation and
the shared automatic schema-delivery contract. Deployment remains a separate
receiver choice: `release` uploads to its un-routed integration Worker and
`prod` passes through its exact-branch environment and accepted human handoff
when their names enter
`DEPLOYMENT_ACTIVE_RECEIVERS`. `research`, `res/*`, `dev`, `docs`, and `stg`
retain their resting budget values. The shared profile envelope remains
human-managed. `.github/ENVIRONMENTS.md` carries the operative receiver,
serving, deployment, and credential-routing contract.

## Working answers

- `research` complements `dev`: one explores possible futures; the other
  integrates a chosen delivery direction.
- Feature-level AI autonomy applies within the named research scope. Epic
  boundary merges always receive human review and a cue.
- A feature can target `main` directly when it is ordinary trunk collaboration
  rather than future-state integration.
- Research findings become durable through a semantic receipt and selected
  changes, keeping main-only collaborators included.
- Research previews begin as artifacts or ephemeral routes. A stable domain
  follows a distinct service decision.
- A result earns promotion when it reduces experimentation cost, captures a
  recurring opportunity, clarifies expectations, or supplies evidence required
  by a named receiver.
- Actions begin with manual or pull-request scope. Observed value can justify a
  schedule, larger matrix, longer retention, another active receiver, or
  recurring spend.

## Pull-request receipts

Every review-ready pull request carries one receiving milestone and the
smallest meaningful label set. Metadata supports navigation; the body remains
the durable receipt for the material result, related issues, change boundary,
fitting evidence and its coverage boundary, recovery path, and next receiver.

A feature receipt names the question, bounded change, fitting evidence, recovery
path, and next receiver. An epic receipt adds the included features,
architecture or service delta, Actions usage, unresolved boundaries, and the
human review and merge cue. Branch names help navigation; semantic receipts
carry the durable collaboration identity.
