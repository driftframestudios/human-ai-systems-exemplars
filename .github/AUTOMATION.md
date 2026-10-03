# Bounded hosted automation

The repository carries eight workflows: two bounded automatic `main` receipts,
one production-carrier contract, one standing documentation publication path,
one connected release-and-production schema path, one configurable prototype
receiver, and two explicitly dispatched proof paths. Every external action
reference uses a reviewed full-length commit SHA. Local commands remain the
immediate edit loop.

## Inventory coordinate and evidence boundary

This source inventory was reconciled on 2026-10-03 against
`3355430196a8732cf8b5a2e3d90cb6cc38dbe11c` for Issue #63. Workflow files own exact
triggers, path filters, arguments, job permissions, and action pins. The table
below names every workflow; the following sections explain each receiving job.

| Workflow in `.github/workflows/` | Trigger and activation | Job ceiling | Superseded-run behavior | Related receiver record |
| --- | --- | --- | --- | --- |
| `res-public-boundary-intake.yml` | Non-draft `main` PR; `ACTIONS_BUDGET_MAIN=true` | 2 minutes | Cancel superseded PR run | #63 inventory |
| `schema-receiver-routes.yml` | Matching non-draft `main` PR or manual dispatch; `ACTIONS_BUDGET_MAIN=true` | 6 minutes | Cancel same PR/ref run | #18 schema contracts; #63 inventory |
| `schema-pages.yml` | Manual exact source, projection, and release-tag selection; `activate_deployment=false` by default | 15 minutes | Serialize the Pages group; finish the current run | PRs #308 and #309 |
| `schema-delivery.yml` | Non-draft PR or push to budget-enabled `release`/`prod`; deployment also requires an active receiver | Contract 12; deployment 8 minutes | Cancel superseded contracts; serialize deployments by receiver | #18 schema delivery; #63 inventory |
| `prototype-unit-tests.yml` | Confirmed manual suite; matching non-draft `main` PR only with `PROTOTYPE_UNIT_TESTS_AUTOMATIC=true` | 10 minutes | Cancel same PR/ref run, including another manual suite on that ref | PRs #97 and #287 |
| `production-carrier-contracts.yml` | Matching `main` PR or manual dispatch | 10 minutes | Cancel same PR/ref run | #253 and PR #255 |
| `lims-eln-functional-nucleus.yml` | Manual selected proof; `ENABLE_GITHUB_ACTIONS=true` and `confirm_run` | 30 minutes | Cancel same workflow/ref run | #63 proof inventory |
| `lims-eln-enterprise-reference.yml` | Manual offline, database, or full proof; `ENABLE_GITHUB_ACTIONS=true` and `confirm_run` | Offline 15; database 30 minutes per matrix job | Separate dispatches remain independent | #63 proof inventory |

The policy and environment documents retain their dated settings observations
and standing allocations. Live account settings, current variable values,
remaining minutes, and current hosted durations are **unknown in this
reconciliation**: source inspection supplied this receipt. A job timeout is a
per-job ceiling, distinct from an approved cycle or month-level allocation.
The production-carrier allocation has a named human receiver below.

Preserve the 2026-08-28 run `33182993332` as a historical 4m24s observation of
PR #95's then-selected contract. PR #97 subsequently restored the earlier
hosted suite boundary. That duration describes the earlier run, rather than
the current suite. The same-date cancellation observation remains useful:
different manual suite selections on one ref can supersede one another.

## Main public-boundary receipt

`res-public-boundary-intake.yml` reads tracked text on non-draft pull requests
into `main` while `ACTIONS_BUDGET_MAIN=true`. One read-only Ubuntu job checks out
the candidate, runs the successor-owned Python boundary reader, and retains an
aggregate receipt for one day. It uses no secrets or cache, has a two-minute
ceiling, and cancels superseded runs for the same pull request.

The receipt is advisory. It highlights gated workspace routes, workstation
coordinates, and external GitHub receivers so a collaborator can choose an
accepted public destination, stable source key, or repository-local
explanation. Accepted public-possible Practitioner Registry routes remain
visible for human review. Merge authority stays with current reviewers.

The source comparison tool remains locally available through
`npm run check:research-projection`. Its earlier hosted workflow stays with the
retained source because the successor intake already owns this receiving job.

## Schema receiver route receipt

`schema-receiver-routes.yml` receives matching non-draft pull requests into
`main` while `ACTIONS_BUDGET_MAIN=true`. Its advisory step runs exactly
`npm run check:schemas && npm run test:schema-pages` after installing the locked
Node 22 toolchain. Those commands exercise the schema surface and Pages
contracts through the repository's source-to-receiver map. This keeps a
schema's semantic identity distinct from its source revision and its current
retrieval or publication receiver. The publication workflow owns the selected
release build and deployment evidence.

The receipt is advisory: a finding appears in the run summary while the job
keeps the pull request available for collaboration. Manual dispatch uses the
same budget switch. The workflow has read-only contents permission, a six-minute
ceiling, and full-length action pins.

## Schema publication

`schema-pages.yml` is the manual source-to-receiver verification and publication
path. One dispatch names an exact accepted source commit, an exact reviewed
`docs` commit, and a `pages-vMAJOR.MINOR.PATCH` release tag. One connected
standard-runner `publish` job has a fifteen-minute ceiling and uses the
`github-pages` environment. Its job-level permissions are `contents: read`,
`pages: write`, and `id-token: write`, including verification-only dispatches.
The workflow:

1. runs from the accepted `main` workflow definition and requires both
   coordinates as full lowercase Git SHAs;
2. checks out complete source and projection histories side by side without
   retained Git credentials, then uses workflow-owned commands to prove each
   revision belongs to `main` or `docs` before any selected-source command can
   run;
3. installs the locked source toolchain;
4. checks the schema and Pages behavior;
5. requires the source CNAME to agree with the active Pages host and rebuilds
   from the Pages-reported HTTPS base URL;
6. confirms the projection worktree remains unchanged, then uses the
   workflow-owned release verifier to bind the selected tag, source, projection,
   complete file membership, and bytes;
   and
7. proves the checksum-verified secret scanner before inspecting that exact
   artifact, including its required hidden files.

The default `activate_deployment=false` dispatch ends after verification. Selecting
activation admits upload and deployment steps in that same connected job.
The `schema-pages` concurrency group serializes dispatches with
`cancel-in-progress: false`, allowing the current run to finish. PR #308 owns
the accepted release transition; PR #309 supplied its reviewed projection.

Each hosted verification pair begins with an accepted `main` commit and the
reviewed `docs` projection built from it. The `github-pages` environment keeps
its existing `docs` rule and also admits the workflow's `main` branch. GitHub
Pages now uses the Actions delivery route: each deployment names both immutable
commits, rebuilds from source, and requires complete file membership and byte
equality before upload.

Pages settings remain the custom-domain authority. The recorded Pages family
is `schemas.radiantnull.com`; Issue #18 owns the distinct schema receiver
standing. The 2026-10-01 #63 receipt records deployment of `pages-v0.1.0` through
the verified workflow. That dated release observation retains its own scope.
The recorded `docs:/` source setting remains the recovery coordinate: an
authorized recovery can restore legacy mode, verify the accepted `docs` bytes,
and return the environment allowlist to its prior state when needed. Current
live settings and delivery are separate observations from this inventory.

## Release and production schema delivery

`schema-delivery.yml` receives every non-draft pull request into and every push
to `release` or `prod` while that receiver's approved budget is active. One
read-only contract job installs the locked toolchain, checks the mapped schema
surface, verifies the explicit Static Assets closure, dry-runs the matching
Wrangler environment, proves the pinned secret-material reader with a fresh
canary, and observes the candidate tree and locally available history.

The contract has a twelve-minute ceiling and cancels superseded candidates.
The connected deployment has an eight-minute ceiling and serializes by
receiver. A release push targets an un-routed named Wrangler environment. A
production push targets the top-level Worker through the exact-branch `prod`
GitHub environment and its accepted human handoff. Both deployment jobs also
require their name in
`DEPLOYMENT_ACTIVE_RECEIVERS`. The documented resting value is `[]`; preserve
that activation posture and the recorded 300-minute allocation for each branch
per collaboration cycle. Current live variable values and remaining allocation
require their own account observation.

The workflow uses GitHub-owned checkout and Node setup actions at the reviewed
full commit SHAs, then calls the repository's locked Wrangler CLI directly.
Environment-scoped Cloudflare credentials enter only the deployment job.

## Production-carrier contract

`production-carrier-contracts.yml` is the source-owned CI lane accepted in
PR #255 for Issue #253. Its matching `main` pull-request paths cover the
workflow, root package and lock files, `deployment/cpanel/**`,
`tests/prod-deployment/**`, the projection builder, and the transfer packager.
Manual dispatch is also available. The declared trigger includes draft PRs;
this lane has no confirmation input or budget-variable condition. This
inventory preserves that accepted trigger behavior.

One read-only Ubuntu 24.04 job uses pinned checkout and Node setup actions,
Node 22, the locked toolchain, and a ten-minute ceiling. It runs
`npm run test:prod-deployment`, forms the `production-v0.2.0` transfer envelope,
verifies its receipt against that explicit tag, and exercises the ZIP with
`unzip -t`. The immutable tag is the payload input; the candidate checkout
supplies the packaging implementation. The workflow uploads no artifact and
uses no hosting credential. Its receipt establishes tests and archive
formation, while #118 and #251 retain host activation and live acceptance.

The human budget owner receives one remaining allocation question: identify
the accepted allowance covering this lane, or approve an explicit allowance if
the standing record leaves it open. The inventory records that allocation as
unknown; its ten-minute timeout supplies the observed source ceiling. This
documentation change adjusts no trigger, variable, or account setting. A later
rest, removal, or trigger change needs the lane's receiver decision and a
separate reviewed workflow change. A stopped contract can receive a corrected
candidate or an explicitly selected manual rerun.

## Secret-material inspection posture

`npm run security:secrets` is the standing local and manual repository-wide
route. It verifies a checksum-pinned Betterleaks 1.8.1 installation, proves the
detector and sanitizer with a generated canary, then observes the working tree,
exact staged index, and diff-visible history across locally available refs.
Named generated artifacts have a separate command. Provider validation is off,
and raw scanner JSON, diagnostics, and candidate values remain in process
memory rather than an artifact or cache.

Secret-material inspection currently uses the local and manual route. The
selected-actions policy admits GitHub-owned actions, while the third-party
Betterleaks Marketplace Action sits outside that set. A later named receiver
can use the repository-owned installer after GitHub-owned, full-SHA-pinned
checkout and toolchain steps. Its contract will acquire complete history and
the refs named by its evidence question, carry read-only contents permission,
leave checkout credentials and repository or environment secrets at rest,
retain only locator-safe aggregate evidence, and require the canary before
interpreting a clean result. Runner budget, activation events, timeout,
retention, and an off switch arrive with that receiver.

The full scope and successor handoff live in the
[repository secret-material boundary](../threadkeeping/repository-secret-material-boundary.md).

## Public-reference build posture

`npm run build:public-references` is the current dependency-free build-time
route for approved Context Canvas Registry destinations. Its ignored input and
output remain local: tracked HTML carries semantic keys, `.env.public` or
matching process values supply human-approved destinations, and the generated
subtree contains ordinary static links. The focused local observation is
`npm run test:public-reference-materializer`.

The main public-boundary receipt independently observes tracked candidate text
and established stable-key families. Route configuration and configured
publication remain with the materializer and its eventual delivery receiver.

A named documentation or Context Canvas delivery receiver can later call the
same materializer immediately before its connected upload step. That job will
own the complete public asset closure, reviewed environment configuration,
budget gate, and delivery receipt. The current local route keeps those inputs
ready for that connected receiver.

## Core, iframe, and Narrative prototype path

`prototype-unit-tests.yml` gives the Core, iframe, and Narrative contracts one
approved standard-runner receiver. A manual dispatch selects `core`, `iframe`,
`narrative`, or `all` and requires `confirm_run`. `include_browser=true` adds
the fitting Chromium contract to that selected family. The workflow installs
the locked root toolchain with lifecycle scripts at rest, then calls the same
family commands documented for local use.

Matching non-draft pull requests into `main` can run the complete unit baseline
when `PROTOTYPE_UNIT_TESTS_AUTOMATIC=true`. The unset or `false` value keeps
automatic execution at rest while manual selection remains available. An
active pull-request receiver includes the selected rendered contracts so its
result covers direct and browser-owned behavior. Path filters cover the source
families, iframe and carrier owners, collaboration and Context Canvas sources,
attribution, focused tests and tools, root package and lock files, and workflow.
The workflow file owns the exact filter list. One read-only job, one standard
Linux runner, superseded-run cancellation, and a ten-minute ceiling keep the
receiver proportional to the protected behavior.

| Selection | Source contract | Additional browser work when selected |
| --- | --- | --- |
| `core` | Attribution, iframe package, and Core units | Core browser contract |
| `iframe` | Attribution and iframe package contracts | Prototype control labels and iframe browser contract |
| `narrative` | Narrative units | Narrative browser contract |
| `all` | Attribution, iframe package, and combined prototype units | Control labels, Core, Canvas, Narrative, and prototype exchange contracts |

The shared iframe-carrier source contract precedes the selection. PR #287 added
the focused label-retention contract to the existing browser lanes. The
standalone Strategy Canvas command remains independently available following
PR #97; the historical #95 run retains its earlier coverage. For independent
manual receipts on one ref, let the selected suite finish before dispatching
another; a future concurrent-suite requirement receives its own decision.

Local commands keep the focused route close to the source:

```sh
npm run test:core-architectures
npm run test:core-browser
npm run test:iframe-routes
npm run check:iframe-routes
npm run test:prototype-control-labels
npm run test:iframe-browser
npm run test:narrative-architectures
npm run test:narrative-browser
npm run test:prototype-units
npm run test:prototype-exchanges
```

## LIMS/ELN proof paths

Two manual workflows preserve reviewed remote proofs for an allocated dispatch:

- **LIMS and ELN enterprise reference proof** covers the reference pack and its
  PostgreSQL rehearsal. Its offline Python 3.12/3.13 jobs each have a
  fifteen-minute ceiling; its pinned PostgreSQL 16/18 database jobs each have a
  thirty-minute ceiling. Separate dispatches remain independent because this
  workflow declares no concurrency group.
- **LIMS and ELN functional nucleus proof** covers one selected nucleus member
  or the five-member integrated proof on Python 3.12, through one thirty-minute
  job with same-ref cancellation.

Each uses read-only repository authority, pinned GitHub-owned actions, and
requires `ENABLE_GITHUB_ACTIONS=true` plus explicit `confirm_run`. Reference
database credentials belong to the local proof fixture. Selected database
artifacts expire after one day. The authorized receiver can return the variable
to `false` after the allocated proof settles; current live values and remaining
proof allocation are outside this source-only receipt.

## Resting routes

The dependency-update template remains discoverable as
`dependabot.manual.yml`. A future dependency-update receiver may rename it only
after the downstream pull-request cadence has an accepted job and budget.

Hosted visual checks, resolver inspection, broader history operations, and
general recurring CI retain their local, manual, or dormant routes. The named
schema delivery is the current Cloudflare exception, bounded by its two branch
receivers, budgets, credentials, and deployment switch. The effective action
allow list, immutable revisions, and billing posture live in
[ACTIONS-POLICY.md](ACTIONS-POLICY.md).

Issue #63 receives inventory reconciliation. Each later workflow or matrix
addition starts with a material receiving job and an explicit budget decision.
Record month-level allocation when activation changes; retain dated durations
and scope instead of inferring them from job ceilings or older suite receipts.
