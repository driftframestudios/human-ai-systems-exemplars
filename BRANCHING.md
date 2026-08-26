# Repository branch topology

`main` is the broadest collaboration trunk. It remains coherent for AI
collaborators that can inspect only the default branch, while other branches
adapt research, integration, staging, release, and delivery to particular jobs.

## Long-lived branches

| Branch | Primary job | Service relation |
| --- | --- | --- |
| `main` | Canonical collaboration trunk and authored current source | Radiant Null collaboration family |
| `snapshot` | Named stable-core baseline copied from an accepted `main` tip | Quiet comparison and re-entry receiver for the next preflight; no independent service role |
| `research` | Future-state projection and AI research-integration environment | Preview artifacts or a later purpose-bound research route |
| `dev` | Sustained feature integration | Radiant Null collaboration family |
| `stg` | Deployment candidates and Cloudflare Worker pilots | Vik Guru schema family |
| `release` | Accepted release integration and source for generated documentation | Vik Guru schema family |
| `docs` | Generated GitHub Pages projection | Radiant Null collaboration family |
| `prod` | Accepted schema and later Worker-backed production surface | Vik Guru schema family |

The service families are:

- `schemas.radiantnull.com` for the collaboration-facing `main`, `dev`, and
  generated `docs` projections;
- `schemas.vik.guru` for `stg`, `release`, and `prod`.

A GitHub Pages custom domain is repository-level. These groups describe source,
promotion, and delivery intent rather than separate Pages sites for every
branch. `research` begins with preview artifacts and receives a stable route
only through a named service decision.

## Snapshot baseline

`snapshot` is a deliberately quiet copy of a selected `main` revision. It is
created or advanced only after the source changes for a stable-core wave have
settled and the next preflight has a named receiver. Work begins from the
fitting living branch rather than from `snapshot`.

Each refresh records the source `main` revision, observation date, and receiving
preflight in the current Issue or pull-request receipt. The branch preserves a
clear comparison and re-entry point; it does not change semantic authority,
publication standing, delivery configuration, or the successor's authored
source relationship.

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

## Promotion flow

Research supplies candidate implementations and evidence. Authored source and
promotion branches select the durable result:

1. `main` receives accepted contracts and concise research receipts so
   main-only collaborators can understand and continue the work.
2. `dev` integrates a chosen sustained feature direction.
3. `stg` receives a selected deployment candidate or Worker pilot.
4. `release` binds the accepted source, evidence, and integration result.
5. An accepted `release` update produces the `docs` projection.
6. A separately reviewed move advances accepted release material to `prod`.

Publication, DNS, schema identity, credentials, and production authority remain
with their named branch, setting, or human-reviewed operation. Generated
`docs` and deployed `prod` material stay downstream of authored source.

Selected promotion pull requests are the standing bridge from research. A bulk
merge of accumulated research becomes fitting only when a human-reviewed epic
receipt selects that complete target future.

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

`main` is the sole budget-active receiver. Its public-boundary workflow reads
tracked text on non-draft pull requests targeting the trunk. It uses one Linux
job with a two-minute ceiling, read-only contents permission, superseded-run
cancellation, and a one-day aggregate receipt. Findings retain advisory
standing while merge authority stays with current reviewers.

`research`, `res/*`, `dev`, `docs`, `stg`, `release`, and `prod` rest with budget
values set to `false`. The shared profile envelope remains human-managed. A
later evidence receipt can propose another active receiver, wider triggers, or
a longer budget. `.github/ENVIRONMENTS.md` carries the operative receiver,
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

A feature receipt names the question, bounded change, fitting evidence, recovery
path, and next receiver. An epic receipt adds the included features,
architecture or service delta, Actions usage, unresolved boundaries, and the
human review and merge cue. Branch names help navigation; semantic receipts
carry the durable collaboration identity.
